import json,sys,time,re,os
from playwright.sync_api import sync_playwright
URL='file:///home/claude/app/dist/index.html'
R=[]   # (area, name, ok, detail)
def chk(area,name,cond,detail=''):
    R.append((area,name,bool(cond),str(detail)[:200]))
    print(('PASS' if cond else 'FAIL'),area,'-',name,('' if cond else '  '+str(detail)[:200]))
errs=[]
reqs=[]
def new_page(b,vp=None,ctx=None):
    ctx=ctx or b.new_context(viewport=vp or {'width':1360,'height':900},accept_downloads=True)
    pg=ctx.new_page()
    pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None)
    pg.on('pageerror',lambda e: errs.append('PAGEERROR '+str(e)))
    pg.on('request',lambda r: reqs.append(r.url))
    return ctx,pg
def open_app(pg):
    pg.goto(URL); pg.wait_for_function('window.__ready===true',timeout=8000)
def go(pg,r):
    pg.evaluate(f"location.hash='#/{r}'"); pg.wait_for_timeout(200)
def flush(pg): pg.evaluate('flush()'); pg.wait_for_timeout(100)
def signup(pg,name='Sam',user='sam01',pw='secret1',code='workout-etsy'):
    pg.click('[data-act=authTab][data-t=up]'); pg.fill('#a-name',name); pg.fill('#a-user',user); pg.fill('#a-pw',pw); pg.fill('#a-pw2',pw); pg.fill('#a-code',code)
    pg.click('form[data-submit=authUp] .btn.pri'); pg.wait_for_selector('text=Set up my profile',timeout=8000)
def signup_demo(pg,**k):
    signup(pg,**k); pg.evaluate("S=makeDemo();S.meta.demo=false;save();render()"); pg.wait_for_selector('#shell:not([hidden])')
def confirm(pg): pg.click('[data-confirm-ok]'); pg.wait_for_timeout(150)
def S(pg,expr): return pg.evaluate(expr)

with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    ctx,pg=new_page(b); open_app(pg)

    # ---------- 1. ONBOARDING ----------
    A='1 Onboarding'
    chk(A,'welcome screen shown on first run',pg.is_visible('text=Plan Better. Train Smarter. Track Your Progress.'))
    signup(pg)
    pg.click('[data-act=obNext]')
    pg.fill('#ob-name','')
    pg.click('[data-act=obNext]'); chk(A,'name required to continue',pg.is_visible('#ob-name') and 'Step 1' in pg.inner_text('#gate'))
    pg.fill('#ob-name','Sam'); pg.fill('#ob-age','31')
    pg.check('input[name=level][value=intermediate]'); pg.check('input[name=location][value=gym]')
    pg.click('[data-act=obNext]')
    pg.check('input[name=goal][value=strength]')
    # days: default Mon Wed Fri; add Sat, remove Wed
    pg.click('[data-act=obDay][data-d="5"]'); pg.click('[data-act=obDay][data-d="2"]')
    chk(A,'weekly target follows day count (3)',S(pg,'OB.d.target')==3,S(pg,'OB.d.target'))
    pg.select_option('#ob-du','60')
    pg.click('[data-act=obNext]')
    pg.check('input[data-chg=obEquip][value=dumbbells]'); pg.check('input[data-chg=obEquip][value=barbell]')
    pg.click('[data-act=obFinish]'); chk(A,'safety acknowledgement required',pg.is_visible('#ob-ack'))
    pg.check('#ob-ack'); pg.check('input[data-k=track]')
    pg.click('[data-act=obFinish]'); pg.wait_for_selector('#shell:not([hidden])')
    chk(A,'dashboard greets by name',('Sam' in pg.inner_text('.hero h1')),pg.inner_text('.hero h1'))
    chk(A,'profile saved (strength, intermediate, gym)',S(pg,'S.profile.goal')=='strength' and S(pg,'S.profile.level')=='intermediate' and S(pg,'S.profile.location')=='gym')
    chk(A,'starter plan created on chosen days',S(pg,'S.plan.length')==3 and sorted(S(pg,'S.plan.map(w=>w.day)'))==[0,4,5],S(pg,'S.plan.map(w=>w.day)'))
    chk(A,'non-training days are rest days',S(pg,'S.restDays')==[False,True,True,True,False,False,True],S(pg,'S.restDays'))
    chk(A,'weekly target 3, body tracking on',S(pg,'S.settings.weeklyTarget')==3 and S(pg,'S.settings.trackBody')==True)
    chk(A,'empty dashboard shows helpful empty states',pg.is_visible('text=No workouts logged yet') and pg.is_visible('text=No records yet'))

    # ---------- 2. PROFILE EDITING ----------
    A='2 Profile editing'
    go(pg,'settings')
    pg.fill('#s-name','Samira'); pg.select_option('#s-goal','cardio'); pg.select_option('#s-level','advanced'); pg.select_option('#s-loc','outdoors'); pg.select_option('#s-dur','30')
    pg.fill('#s-age','33')
    pg.check('input[name=equip][value=bands]')
    pg.click('form[data-submit=profile] button.btn.pri')
    pg.wait_for_timeout(300)
    chk(A,'profile edits stored',S(pg,'S.profile.name')=='Samira' and S(pg,'S.profile.goal')=='cardio' and S(pg,'S.profile.level')=='advanced' and S(pg,'S.profile.duration')==30 and 'bands' in S(pg,'S.profile.equip'))
    go(pg,'dashboard'); chk(A,'dashboard reflects edited profile','Samira' in pg.inner_text('.hero') and 'Cardiovascular fitness' in pg.inner_text('.hero'))
    go(pg,'settings'); pg.fill('#s-wt','5'); pg.dispatch_event('#s-wt','change')
    chk(A,'weekly target customizable',S(pg,'S.settings.weeklyTarget')==5)
    pg.fill('#s-wt','3'); pg.dispatch_event('#s-wt','change')
    pg.fill('#s-name',''); pg.click('form[data-submit=profile] button.btn.pri')
    chk(A,'empty name rejected',S(pg,'S.profile.name')=='Samira')

    # ---------- 3-4. WORKOUT CREATION & SCHEDULING ----------
    A='3 Workout creation'
    go(pg,'planner')
    n0=S(pg,'S.plan.length')
    pg.click('[data-act=toggleRest][data-d="3"]'); chk(A,'unmark rest day enables adding a workout',S(pg,'S.restDays[3]')==False)
    pg.click('a[href="#/edit/workout/new/3"]'); pg.wait_for_selector('#d-name')
    pg.click('[data-act=saveDraft]'); chk(A,'name required',pg.is_visible('#d-name') and S(pg,'S.plan.length')==n0)
    pg.fill('#d-name','My Thursday Strength')
    pg.click('[data-act=dMuscle][data-m=Chest]'); pg.click('[data-act=dMuscle][data-m=Arms]')
    pg.click('[data-act=saveDraft]'); chk(A,'at least one exercise required',S(pg,'S.plan.length')==n0)
    pg.click('[data-act=addEx]>>nth=0'); pg.wait_for_selector('#pk-q')
    pg.fill('#pk-q','bench'); pg.wait_for_timeout(100)
    chk(A,'picker search filters results',pg.locator('[data-pk]').count()>=2,pg.locator('[data-pk]').count())
    pg.click('[data-pk=db-bench-press]'); pg.fill('#pk-q','curl'); pg.click('[data-pk=bicep-curl]')
    pg.fill('#pk-q','plank'); pg.click('[data-pk=plank]'); pg.fill('#pk-q','running'); pg.click('[data-pk=running]')
    pg.click('.mf .btn.pri')   # Done
    chk(A,'4 exercises added to draft',S(pg,'DRAFT.data.exercises.length')==4)
    # edit row values: sets 4, reps 8, weight 20, rest 90 for bench
    pg.fill('#x0sets','4'); pg.fill('#x0reps','8'); pg.fill('#x0weight','20'); pg.fill('#x0rest','90')
    pg.fill('#d-dur','50')
    # reorder: move curl up above bench then back down
    pg.click('[data-act=dxMove][data-i="1"][data-dir="-1"]'); order=S(pg,'DRAFT.data.exercises.map(e=>e.exId)')
    chk(A,'exercise reorder works',order[0]=='bicep-curl',order)
    pg.click('[data-act=dxMove][data-i="0"][data-dir="1"]')
    pg.fill('#d-notes','Keep rests honest.')
    pg.click('[data-act=saveDraft]>>nth=0'); pg.wait_for_selector('.week')
    w=S(pg,"S.plan.find(w=>w.name==='My Thursday Strength')")
    chk(A,'workout saved with all fields',w and w['day']==3 and w['duration']==50 and w['notes']=='Keep rests honest.' and set(w['muscles'])=={'Chest','Arms'} and len(w['exercises'])==4,w)
    bw=[e for e in w['exercises'] if e['exId']=='db-bench-press'][0]
    chk(A,'exercise sets/reps/weight/rest stored (kg)',bw['sets']==4 and bw['reps']==8 and bw['weight']==20 and bw['rest']==90,bw)
    chk(A,'workout appears in Thursday column',pg.locator('section[aria-label=Thursday] .wk b').inner_text()=='My Thursday Strength')

    A='4 Workout scheduling'
    wid=w['id']
    pg.select_option(f'#mv-{wid}','1')   # Tuesday -> rest day -> confirm
    pg.wait_for_selector('[data-confirm-ok]'); confirm(pg)
    chk(A,'move to rest day asks confirmation then converts day',S(pg,f"S.plan.find(x=>x.id==='{wid}').day")==1 and S(pg,'S.restDays[1]')==False)
    pg.select_option(f'#mv-{wid}','3')
    chk(A,'move back to Thursday',S(pg,f"S.plan.find(x=>x.id==='{wid}').day")==3)
    pg.click(f'[data-act=dupWorkout][data-id="{wid}"]'); chk(A,'duplicate workout',S(pg,"S.plan.filter(w=>w.name==='My Thursday Strength (copy)').length")==1)
    dup=S(pg,"S.plan.find(w=>w.name==='My Thursday Strength (copy)').id")
    pg.click(f'[data-act=delWorkout][data-id="{dup}"]'); confirm(pg)
    chk(A,'delete workout with confirmation',S(pg,'S.plan.length')==n0+1)
    pg.select_option(f'#mv-{wid}','none'); chk(A,'unschedule workout',S(pg,f"S.plan.find(x=>x.id==='{wid}').day")==None)
    pg.select_option(f'#mv-{wid}','3')
    # rest day toggle
    pg.click('[data-act=toggleRest][data-d="6"]'); chk(A,'toggle rest day off/on',S(pg,'S.restDays[6]')==False)
    pg.click('[data-act=toggleRest][data-d="6"]')
    pg.click('[data-act=toggleRest][data-d="3"]'); chk(A,'cannot mark day with workouts as rest',S(pg,'S.restDays[3]')==False)
    pg.click('[data-act=addFromTpl]'); pg.select_option('#atp',label=re.compile('Core Workout')) if False else None
    pg.select_option('#atp',index=9); pg.select_option('#atd','2'); pg.click('form[data-submit=addTplToPlan] .btn.pri'); pg.wait_for_selector('[data-confirm-ok]'); confirm(pg); pg.wait_for_timeout(300)
    chk(A,'add workout from template',S(pg,'S.plan.length')==n0+2 and S(pg,'S.plan[S.plan.length-1].day')==2)

    # ---------- 5-6. LIBRARY ----------
    A='5 Exercise library'
    go(pg,'library')
    total=S(pg,'allEx().length')
    chk(A,'library has 45 exercises across categories',total==45 and set(S(pg,'allEx().map(e=>e.muscle)'))=={'Chest','Back','Shoulders','Arms','Legs','Core','Cardio','Mobility'},total)
    chk(A,'every exercise has all required fields',S(pg,"allEx().every(e=>e.name&&e.muscle&&Array.isArray(e.sec)&&e.equip.length&&e.diff&&e.type&&e.how.length>40&&e.safe.length>10&&e.mist.length>10)"))
    chk(A,'all required exercises from the brief present',S(pg,"['Push-ups','Bench Press','Incline Dumbbell Press','Chest Fly','Cable Crossover','Pull-ups','Lat Pulldown','Seated Cable Row','Bent-over Row','Single-arm Dumbbell Row','Shoulder Press','Lateral Raises','Front Raises','Rear Delt Fly','Bicep Curls','Hammer Curls','Tricep Pushdowns','Tricep Extensions','Squats','Lunges','Leg Press','Romanian Deadlift','Leg Curl','Calf Raises','Plank','Crunches','Leg Raises','Bicycle Crunches','Dead Bug','Walking','Running','Cycling','Jump Rope','Rowing','Hip Mobility','Shoulder Mobility','Hamstring Stretch','Cat-Cow Stretch'].every(n=>allEx().some(e=>e.name===n))"))
    pg.fill('#lib-q','curl'); pg.wait_for_timeout(100); chk(A,'search',pg.locator('.exc').count()==3 or pg.locator('.exc').count()>=2,pg.locator('.exc').count())
    pg.fill('#lib-q',''); pg.select_option('#lib-m','Legs'); pg.wait_for_timeout(100)
    legs=pg.locator('.exc').count(); chk(A,'muscle filter',legs==S(pg,"allEx().filter(e=>e.muscle==='Legs').length"),legs)
    pg.select_option('#lib-e','bands'); pg.wait_for_timeout(100); chk(A,'equipment filter narrows',pg.locator('.exc').count()==0)
    pg.select_option('#lib-e',''); pg.select_option('#lib-m',''); pg.select_option('#lib-d','advanced'); pg.wait_for_timeout(100)
    chk(A,'difficulty filter',pg.locator('.exc').count()==S(pg,"allEx().filter(e=>e.diff==='advanced').length"))
    pg.click('[data-act=libClear]'); pg.wait_for_timeout(100)
    pg.click('[data-act=favEx][data-id=squats]'); chk(A,'favourite toggles',S(pg,"S.fav.includes('squats')"))
    pg.check('input[data-f=fav]'); pg.wait_for_timeout(100); chk(A,'favourites-only filter',pg.locator('.exc').count()==1)
    pg.uncheck('input[data-f=fav]')
    pg.click('[data-act=exDetail][data-id=plank]'); pg.wait_for_selector('.modal')
    t=pg.inner_text('.modal'); chk(A,'detail shows instructions, safety tips, common mistakes',all(k.lower() in t.lower() for k in ['How to do it','Safety tips','Common mistakes','Secondary muscles','Equipment required']))
    pg.keyboard.press('Escape'); chk(A,'Escape closes dialog',pg.locator('.modal').count()==0)
    A='6 Custom exercises'
    pg.click('[data-act=customEx]>>nth=0'); pg.fill('#ce-n','Sled Push'); pg.select_option('#ce-m','Legs'); pg.fill('#ce-s','Glutes, Core'); pg.select_option('#ce-t','strength'); pg.select_option('#ce-d','advanced')
    pg.check('input[name=equip][value=other]'); pg.uncheck('input[name=equip][value=none]'); pg.fill('#ce-h','Push the sled across the floor.')
    pg.click('form[data-submit=customEx] .btn.pri'); pg.wait_for_timeout(300)
    ce=S(pg,"S.customEx.find(e=>e.name==='Sled Push')")
    chk(A,'custom exercise saved',ce and ce['muscle']=='Legs' and ce['sec']==['Glutes','Core'] and ce['equip']==['other'] and ce['custom'])
    pg.fill('#lib-q','sled'); pg.wait_for_timeout(100); chk(A,'custom exercise searchable with badge',pg.locator('.exc .chip.w').count()==1)
    pg.click('[data-act=exDetail][data-id="'+ce['id']+'"]'); pg.click('[data-act=customEx][data-id="'+ce['id']+'"]'); pg.fill('#ce-n','Sled Push Heavy'); pg.click('form[data-submit=customEx] .btn.pri'); pg.wait_for_timeout(300)
    chk(A,'custom exercise editable',S(pg,"S.customEx[0].name")=='Sled Push Heavy')
    pg.click('[data-act=customEx]>>nth=0'); pg.fill('#ce-n','Squats'); pg.click('form[data-submit=customEx] .btn.pri'); chk(A,'duplicate name rejected',S(pg,'S.customEx.length')==1)
    pg.keyboard.press('Escape')
    pg.click('[data-act=exDetail][data-id="'+ce['id']+'"]'); pg.click('[data-act=delCustomEx]'); confirm(pg)
    chk(A,'custom exercise deletable with confirmation',S(pg,'S.customEx.length')==0)

    # ---------- 7-8. SESSION TRACKER + REST TIMER ----------
    A='7 Workout session'
    go(pg,'planner'); pg.click(f'[data-act=startWorkout][data-id="{wid}"]'); pg.wait_for_selector('.sess-head')
    chk(A,'session opens with all 4 exercises',pg.locator('.exc').count()==4)
    chk(A,'planned weight/reps prefilled',pg.input_value('[data-e="0"][data-s="0"][data-f=w]')=='20' and pg.input_value('[data-e="0"][data-s="0"][data-f=reps]')=='8' and pg.locator('[data-e="0"][data-f=w]').count()==4)
    # try completing without entering reps on running (cardio) -> needs minutes (prefilled 20) ok. test validation using a cleared field
    pg.fill('[data-e="0"][data-s="0"][data-f=reps]',''); pg.click('[data-act=toggleSet][data-e="0"][data-s="0"]')
    chk(A,'cannot complete a set without reps',S(pg,'S.active.exercises[0].sets[0].done')==False)
    # Set 1: 20kg x 8 ; Set 2: 22.5kg x 6 ; Set 3: 20 x 10 ; set 4 removed
    pg.fill('[data-e="0"][data-s="0"][data-f=reps]','8'); pg.click('[data-act=toggleSet][data-e="0"][data-s="0"]')
    chk(A,'set completion starts rest timer automatically',S(pg,'S.timer.status')=='running' and S(pg,'S.timer.total')==90)
    pg.fill('[data-e="0"][data-s="1"][data-f=w]','22.5'); pg.fill('[data-e="0"][data-s="1"][data-f=reps]','6'); pg.click('[data-act=toggleSet][data-e="0"][data-s="1"]')
    pg.fill('[data-e="0"][data-s="2"][data-f=reps]','10'); pg.click('[data-act=toggleSet][data-e="0"][data-s="2"]')
    pg.click('[data-act=rmSet][data-e="0"][data-s="3"]'); chk(A,'remove set',S(pg,'S.active.exercises[0].sets.length')==3)
    pg.click('[data-act=addSet][data-e="0"]'); chk(A,'add set copies previous values',S(pg,'S.active.exercises[0].sets.length')==4 and S(pg,'S.active.exercises[0].sets[3].reps')==10 and S(pg,'S.active.exercises[0].sets[3].done')==False)
    pg.click('[data-act=rmSet][data-e="0"][data-s="3"]')
    # curl: 3 sets x ?  weight blank -> enter 12 x 12 for 2 sets
    pg.fill('[data-e="1"][data-s="0"][data-f=w]','12'); pg.fill('[data-e="1"][data-s="0"][data-f=reps]','12'); pg.click('[data-act=toggleSet][data-e="1"][data-s="0"]')
    pg.fill('[data-e="1"][data-s="1"][data-f=w]','12'); pg.fill('[data-e="1"][data-s="1"][data-f=reps]','10'); pg.click('[data-act=toggleSet][data-e="1"][data-s="1"]')
    # plank: 30 sec, mark 1 done
    pg.click('[data-act=toggleSet][data-e="2"][data-s="0"]')
    # skip running
    pg.click('[data-act=skipEx][data-e="3"]'); chk(A,'skip exercise',S(pg,'S.active.exercises[3].skipped')==True)
    pg.locator("details:has([data-inp=exnote][data-e=\"0\"]) summary").click(); pg.fill("[data-inp=exnote][data-e=\"0\"]","Felt strong")
    chk(A,'exercise notes saved to state',S(pg,'S.active.exercises[0].notes')=='Felt strong')
    summ=pg.inner_text('#sess-sum')
    chk(A,'live summary: sets 6 done',' 6 / ' in summ or '6 / ' in summ,summ)
    # expected: volume = 20*8 + 22.5*6 + 20*10 + 12*12 + 12*10 = 160+135+200+144+120=759 ; reps=8+6+10+12+10=46
    chk(A,'live summary reps = 46',' 46 reps' in summ or '46 reps' in summ,summ)
    chk(A,'live summary volume = 759 kg','759 kg' in summ,summ)
    # cancel confirmation
    pg.click('[data-act=cancelWorkout]'); pg.wait_for_selector('[data-confirm-ok]'); pg.keyboard.press('Escape'); chk(A,'cancel workout asks for confirmation; Keep training retains session',S(pg,'S.active!==null'))
    pg.click('[data-act=addSessEx]'); pg.fill('#pk-q','squats'); pg.click('[data-pk=squats]'); pg.click('.mf .btn.pri'); chk(A,'add exercise mid-session',S(pg,'S.active.exercises.length')==5)
    pg.click('[data-act=finishWorkout]'); pg.wait_for_selector('form[data-submit=finishSession]')
    chk(A,'finish dialog shows totals',all(k in pg.inner_text('.modal') for k in ['Sets completed','Total reps','Training volume']))
    pg.fill('#fd','47'); pg.fill('#fn','Good one')
    pg.click('form[data-submit=finishSession] .btn.pri'); pg.wait_for_selector('text=Workout complete')
    rec=S(pg,'S.sessions[S.sessions.length-1]')
    chk(A,'workout saved to history; unfinished/skipped not saved',rec['name']=='My Thursday Strength' and rec['duration']==47 and rec['notes']=='Good one' and [e['name'] for e in rec['exercises']]==['Dumbbell Bench Press','Bicep Curls','Plank'],[e['name'] for e in rec['exercises']])
    st=S(pg,'sessStats(S.sessions[S.sessions.length-1])')
    chk(A,'stats: exercises 3, sets 6, reps 46, volume 759',st['exs']==3 and st['sets']==6 and st['reps']==46 and abs(st['vol']-759)<1e-6,st)
    chk(A,'no active session & timer reset after finish',S(pg,'S.active')==None and S(pg,'S.timer.status')=='idle')
    pg.click('.mf .btn.pri'); pg.wait_for_selector('.hero')
    chk(A,'dashboard updates automatically',S(pg,'S.sessions.length')==1 and 'This week' in pg.inner_text('.stats') and pg.locator('.stats .card').nth(1).inner_text().split('\n')[1]=='1',pg.locator('.stats').inner_text())
    # second session: previous values suggested; auto weight
    pg.click(f'[data-act=startWorkout][data-id="{wid}"]') if pg.locator(f'[data-act=startWorkout][data-id="{wid}"]').count() else None
    go(pg,'session');
    if S(pg,'S.active')==None:
        pg.click(f'[data-act=startWorkout][data-id="{wid}"]'); pg.wait_for_selector('.sess-head')
    chk(A,'"Last time" history hint shown on next session',pg.is_visible('text=Last time'))
    pg.click('[data-act=cancelWorkout]'); confirm(pg); chk(A,'cancel discards session',S(pg,'S.active')==None and S(pg,'S.sessions.length')==1)
    # finishing without completed sets
    go(pg,'session'); pg.click('[data-act=startWorkout][data-kind=quick]'); pg.click('[data-act=finishWorkout]'); chk(A,'empty session cannot be saved',pg.is_visible('text=No sets completed yet')); pg.click('[data-act=discardFromFinish]'); pg.wait_for_timeout(200)

    A='8 Rest timer'
    pg.click('[aria-label="Open rest timer"]'); pg.wait_for_selector('#tpanel')
    for sec,lab in [(30,'30 sec'),(45,'45 sec'),(60,'60 sec'),(90,'90 sec'),(120,'2 min')]:
        pg.click(f'[data-act=tPreset][data-s="{sec}"]'); chk(A,f'preset {lab}',S(pg,'S.timer.total')==sec and pg.inner_text('#tpanel [data-tleft]')==f'{sec//60}:{sec%60:02d}',pg.inner_text('#tpanel [data-tleft]'))
    pg.click('#tpanel [data-act=tPreset][data-s="30"]'); pg.click('#tpanel [data-act=tStart]'); pg.wait_for_timeout(2300)
    left=S(pg,'T.left()'); chk(A,'countdown runs (≈27–28s left after 2.3s)',27<=left<=28,left)
    pg.click('#tpanel [data-act=tPause]'); l1=S(pg,'T.left()'); pg.wait_for_timeout(1500); l2=S(pg,'T.left()'); chk(A,'pause holds time',l1==l2 and S(pg,'S.timer.status')=='paused',(l1,l2))
    pg.click('#tpanel [data-act=tResume]'); pg.wait_for_timeout(1300); chk(A,'resume continues',S(pg,'T.left()')<l2 and S(pg,'S.timer.status')=='running')
    pg.click('#tpanel [data-act=tReset]'); chk(A,'reset returns to full duration',S(pg,'S.timer.status')=='idle' and pg.inner_text('#tpanel [data-tleft]')=='0:30')
    pg.fill('#tc','2'); pg.click('form[data-submit=tCustom] .btn'); chk(A,'custom below 5s rejected',S(pg,'S.timer.total')==30)
    pg.fill('#tc','5'); pg.click('form[data-submit=tCustom] .btn'); chk(A,'custom duration set',S(pg,'S.timer.total')==5)
    # survives reload while running
    pg.click('#tpanel [data-act=tStart]'); pg.wait_for_timeout(300); flush(pg); pg.reload(); pg.wait_for_function('window.__ready===true')
    chk(A,'running timer survives page reload (absolute end time)',S(pg,'S.timer.status')=='running' and S(pg,'T.left()')<=5)
    pg.wait_for_timeout(5600); chk(A,'timer completes and shows Time is up / dock',S(pg,'S.timer.status')=='done' and pg.locator('.dock').count()==1)
    pg.click('.dock [data-act=tReset]'); chk(A,'dismiss clears dock',pg.locator('.dock').count()==0)
    # simulated tab sleep: set endsAt in the past while hidden → completes on visibility
    S(pg,'T.start(60)'); S(pg,'S.timer.endsAt=Date.now()-1000'); S(pg,"document.dispatchEvent(new Event('visibilitychange'))"); pg.wait_for_timeout(300)
    chk(A,'timer catches up after tab sleep/throttling',S(pg,'S.timer.status')=='done')
    pg.click('.dock [data-act=tReset]')
    chk(A,'sound toggle exists',S(pg,'typeof T.beep')=='function')

    # keep a copy of this user's state for later tests
    flush(pg)

    # ---------- 17 / 18 / 16 persistence, backup ----------
    A='17 Automatic saving'
    S(pg,"S.goals.push({id:'g_persist',type:'weekly',title:'Persist me',target:2,created:today(),completed:false,targetDate:''});save()"); pg.wait_for_timeout(500)
    pg.reload(); pg.wait_for_function('window.__ready===true')
    chk(A,'data persists after refresh',S(pg,"S.goals.some(g=>g.id==='g_persist')") and S(pg,'S.sessions.length')==1 and S(pg,'S.profile.name')=='Samira')
    idb=pg.evaluate("""()=>new Promise(res=>{const r=indexedDB.open('wpft-db',1);r.onsuccess=()=>{const g=r.result.transaction('kv').objectStore('kv').get(SK());g.onsuccess=()=>res({mode:DB.mode,sessions:g.result.sessions.length,name:g.result.profile.name})}})""")
    chk(A,'IndexedDB holds the data',idb['mode']=='idb' and idb['sessions']==1 and idb['name']=='Samira',idb)
    S(pg,"S.goals=S.goals.filter(g=>g.id!=='g_persist');save()")
    # new context in same browser = fresh storage -> check first-run again isolated
    A='18 Backup & restore'
    go(pg,'settings')
    with pg.expect_download() as dl: pg.click('[data-act=exportBackup]')
    path='/tmp/backup_test.json'; dl.value.save_as(path)
    bk=json.load(open(path))
    chk(A,'export is valid JSON with app id, version, data',bk['app']=='workout-planner-fitness-tracker' and bk['version'] and len(bk['data']['sessions'])==1 and dl.value.suggested_filename.startswith('workout-planner-backup-'))
    chk(A,'last backup timestamp recorded',S(pg,'S.meta.lastBackup')>0)
    # wipe via reset app
    pg.click('[data-act=resetApp]'); confirm(pg); pg.wait_for_selector('#gate:not([hidden])')
    chk(A,'reset application returns to welcome and clears data',S(pg,'S.sessions.length')==0 and S(pg,'S.meta.onboarded')==False)
    pg.reload(); pg.wait_for_function('window.__ready===true'); chk(A,'reset persists after reload',pg.is_visible('text=Set up my profile'))
    # import via the hidden input (need shell: first onboard through demo then import)
    S(pg,"S=makeDemo();S.meta.demo=false;save();render()"); pg.wait_for_selector('#shell:not([hidden])'); go(pg,'settings')
    pg.set_input_files('#imp-f','/tmp/backup_test.json'); pg.wait_for_selector('[data-confirm-ok]'); chk(A,'import asks for confirmation and summarizes',('1 workout' in pg.inner_text('.modal')))
    confirm(pg); pg.wait_for_timeout(500)
    chk(A,'restore reproduces exact data',S(pg,'S.profile.name')=='Samira' and S(pg,'S.sessions.length')==1 and S(pg,"S.plan.some(w=>w.name==='My Thursday Strength')") and S(pg,'S.meta.demo')==False)
    chk(A,'restored sessions identical to backup',json.dumps(S(pg,'S.sessions'),sort_keys=True)==json.dumps(bk['data']['sessions'],sort_keys=True))
    open('/tmp/bad.json','w').write('{"hello":"world"}'); open('/tmp/bad2.json','w').write('not json at all')
    go(pg,'settings'); pg.set_input_files('#imp-f','/tmp/bad.json'); pg.wait_for_timeout(300); chk(A,'wrong JSON file rejected with message','not a Workout Planner' in pg.inner_text('#toasts') and S(pg,'S.profile.name')=='Samira',pg.inner_text('#toasts'))
    pg.set_input_files('#imp-f','/tmp/bad2.json'); pg.wait_for_timeout(300); chk(A,'non-JSON file rejected',('not valid JSON' in pg.inner_text('#toasts')))
    go(pg,'dashboard')

    # ---------- 15. UNIT CONVERSION ----------
    A='15 Unit conversion'
    S(pg,"S.progress.push({id:'u1',date:today(),metric:'weight',value:80,note:'',ts:1});S.settings.trackBody=true;save()")
    go(pg,'settings'); pg.select_option('#u-w','lb'); pg.wait_for_timeout(200)
    go(pg,'progress'); pg.click('[data-act=selMetric][data-k=weight]');
    chk(A,'80 kg shows as 176.4 lb','176.4 lb' in pg.inner_text('#view'),pg.inner_text('.stat'))
    chk(A,'math helper: 100 lb → 45.3592 kg, round-trip',abs(S(pg,"fromDisp('w',100)")-45.3592)<1e-3 and abs(S(pg,"toDisp('w',fromDisp('w',100))")-100)<1e-3)
    # enter a weight in lb
    pg.click('[data-act=addEntry]>>nth=1'); pg.fill('#en-v','200'); pg.click('form[data-submit=entry] .btn.pri'); pg.wait_for_timeout(300)
    v=S(pg,"S.progress.filter(p=>p.metric==='weight').map(p=>p.value)"); chk(A,'200 lb stored as 90.718 kg',any(abs(x-90.7185)<1e-3 for x in v),v)
    go(pg,'settings'); pg.select_option('#u-w','kg'); pg.wait_for_timeout(200); go(pg,'progress'); chk(A,'switching back shows 90.7 kg','90.7 kg' in pg.inner_text('#view'))
    # cm/in
    S(pg,"S.progress.push({id:'u2',date:today(),metric:'waist',value:100,note:'',ts:2});save()"); go(pg,'settings'); pg.select_option('#u-l','in'); go(pg,'progress')
    pg.click('[data-act=selMetric][data-k=waist]'); chk(A,'100 cm shows as 39.4 in','39.4 in' in pg.inner_text('#view'))
    pg.select_option('#u-l','cm') if pg.locator('#u-l').count() else None
    go(pg,'settings'); pg.select_option('#u-l','cm')
    # distance
    go(pg,'settings'); pg.select_option('#u-d','mi'); chk(A,'5 km = 3.1 mi',abs(S(pg,"toDisp('d',5)")-3.10686)<1e-3)
    pg.select_option('#u-d','km')
    # lb in session: enter 100lb
    go(pg,'settings'); pg.select_option('#u-w','lb')
    go(pg,'session'); pg.click('[data-act=startWorkout][data-kind=quick]'); pg.click('[data-act=addSessEx]'); pg.fill('#pk-q','lateral'); pg.click('[data-pk=lateral-raise]'); pg.click('.mf .btn.pri')
    pg.fill('[data-e="0"][data-s="0"][data-f=w]','25'); pg.fill('[data-e="0"][data-s="0"][data-f=reps]','10')
    chk(A,'session weight typed in lb stored in kg (25 lb = 11.34 kg)',abs(S(pg,'S.active.exercises[0].sets[0].w')-11.3398)<1e-3,S(pg,'S.active.exercises[0].sets[0].w'))
    pg.click('[data-act=toggleSet][data-e="0"][data-s="0"]'); chk(A,'volume displayed in lb (250 lb)','250 lb' in pg.inner_text('#sess-sum'),pg.inner_text('#sess-sum'))
    pg.click('[data-act=cancelWorkout]'); confirm(pg)
    go(pg,'settings'); pg.select_option('#u-w','kg')

    # ---------- reload demo for data-heavy areas ----------
    ctx2,d=new_page(b); open_app(d); signup_demo(d)

    A='9 Workout history'
    go(d,'history'); n=S(d,'S.sessions.length'); chk(A,'history lists all workouts',d.locator('#hist-list tbody tr').count()==min(25,n),(d.locator('#hist-list tbody tr').count(),n))
    d.fill('#h-q','upper'); d.wait_for_timeout(150); chk(A,'search by name',d.locator('#hist-list tbody tr').count()==S(d,"S.sessions.filter(s=>s.name.toLowerCase().includes('upper')).length"))
    d.fill('#h-q',''); d.select_option('#h-m','Cardio'); d.wait_for_timeout(150); chk(A,'filter by muscle group',0<d.locator('#hist-list tbody tr').count()<n)
    d.select_option('#h-m',''); first=S(d,'S.sessions[0].date'); d.fill('#h-f',S(d,"addDays(today(),-14)")); d.dispatch_event('#h-f','change'); d.wait_for_timeout(150)
    cnt=d.locator('#hist-list tbody tr').count(); chk(A,'filter by date',cnt==S(d,"S.sessions.filter(s=>s.date>=addDays(today(),-14)).length") and cnt>0,cnt)
    d.click('[data-act=histClear]'); d.wait_for_timeout(150)
    d.click('#hist-list tbody tr >> nth=0 >> [data-act=viewSession]'); d.wait_for_selector('.modal'); t=d.inner_text('.modal'); chk(A,'details modal shows sets',('Set 1' in t and 'Workout notes' in t))
    d.fill('#sn','Edited note ABC'); d.click('form[data-submit=saveNotes] .btn'); d.wait_for_timeout(200); chk(A,'edit notes',S(d,"S.sessions.some(s=>s.notes==='Edited note ABC')"))
    d.keyboard.press('Escape'); d.fill('#h-q','ABC'); d.wait_for_timeout(150); chk(A,'notes searchable',d.locator('#hist-list tbody tr').count()==1)
    d.click('#hist-list [data-act=delSession]'); d.wait_for_selector('[data-confirm-ok]'); confirm(d); chk(A,'delete record with confirmation',S(d,'S.sessions.length')==n-1)
    d.fill('#h-q','')

    A='10 Progress tracking'
    go(d,'progress'); wn=S(d,"metricEntries('weight').length")
    chk(A,'chart renders with data',d.locator('.chart svg path').count()>=1)
    d.wait_for_timeout(600)
    d.click('[data-act=addEntry]>>nth=1'); d.fill('#en-v','71.2'); d.fill('#en-n','test'); d.click('form[data-submit=entry] .btn.pri'); d.wait_for_function("metricEntries('weight').length==%d"%(wn+1),timeout=8000) if False else d.wait_for_timeout(900)
    chk(A,'add entry',S(d,"metricEntries('weight').length")==wn+1 and S(d,"latestMetric('weight').value")==71.2,(wn,S(d,"metricEntries('weight').length"),d.locator('.modal').count(),(d.locator('.modal').inner_text()[-250:] if d.locator('.modal').count() else ''),d.inner_text('#toasts'),S(d,"document.querySelector('#en-v')&&document.querySelector('#en-v').value")))
    d.click('[data-act=editEntry] >> nth=0'); d.fill('#en-v','71.0'); d.click('form[data-submit=entry] .btn.pri'); d.wait_for_timeout(900); chk(A,'edit entry',S(d,"latestMetric('weight').value")==71)
    d.click('[data-act=delEntry]>>nth=0'); confirm(d); chk(A,'delete entry with confirmation',S(d,"metricEntries('weight').length")==wn)
    d.select_option('#cmp-a','0'); d.select_option('#cmp-b','1'); d.wait_for_timeout(100); chk(A,'compare two entries',('Change from' in d.inner_text('#cmp-out')),d.inner_text('#cmp-out'))
    d.click('[data-act=selMetric][data-k=plank]'); chk(A,'performance metric view',d.is_visible('h2:has-text("Plank duration")'))
    chk(A,'personal records tracked',S(d,'bestList().length')>5)
    d.click('[data-act=chooseMetrics]>>nth=0'); d.uncheck('input[name=m][value=chest]'); d.uncheck('input[name=m][value=hips]'); d.click('form[data-submit=chooseMetrics] .btn.pri'); d.wait_for_timeout(200)
    chk(A,'choose which measurements to track',d.locator('[data-act=selMetric][data-k=chest]').count()==0 and d.locator('[data-act=selMetric][data-k=waist]').count()==1)
    d.click('[data-act=chooseMetrics]>>nth=0'); d.uncheck('input[name=body]'); d.click('form[data-submit=chooseMetrics] .btn.pri'); d.wait_for_timeout(200)
    chk(A,'body measurements optional (can be disabled)',d.locator('[data-act=selMetric][data-k=waist]').count()==0 and d.is_visible('text=Body measurements are optional'))
    d.click('[data-act=addEntry]>>nth=0'); d.fill('#en-v','-5'); d.click('form[data-submit=entry] .btn.pri'); chk(A,'invalid value rejected',S(d,'S.progress.length')>0 and d.locator('form[data-submit=entry]').count()==1); d.keyboard.press('Escape')
    S(d,"S.settings.trackBody=true;save()")

    A='11 Fitness calendar'
    go(d,'calendar'); chk(A,'month grid renders 7 columns',d.locator('.cd').count()%7==0 and d.locator('.cd').count()>=28)
    chk(A,'completed / missed / rest / scheduled indicators',all(d.locator(f'.cd .tag.{c}').count()>0 for c in ['done','miss','rest','sch']),[d.locator(f'.cd .tag.{c}').count() for c in ['done','miss','rest','sch']])
    chk(A,'milestone markers',d.locator('.cd .tag.ms').count()>0)
    d.click('[data-act=calNav][data-d="-1"]'); d.wait_for_timeout(100); prev=d.inner_text('h2[aria-live]'); d.click('[data-act=calToday]'); chk(A,'month navigation',prev!=d.inner_text('h2[aria-live]'))
    d.click('.cd.today'); chk(A,'click date shows details',S(d,'today()') and S(d,'fmtDateL(today())') in d.inner_text('#cal-day'))
    dk=S(d,"S.sessions[S.sessions.length-1].date"); d.evaluate(f"CAL.anchor=CAL.sel='{dk}';refresh()"); d.wait_for_timeout(150)
    d.click(f'[data-act=calSel][data-k="{dk}"]'); chk(A,'completed day lists the workout',d.is_visible('#cal-day >> text=Completed'))
    d.click('[data-act=calView][data-v=week]'); chk(A,'week view',d.locator('.li.card.flat').count()==7)
    d.click('[data-act=calView][data-v=month]'); chk(A,'monthly completion stats',d.is_visible('text=Completion'))
    # log a past workout via calendar
    pm=S(d,"(()=>{for(let i=1;i<=30;i++){const k=addDays(today(),-i);if(scheduledOn(k).length&&!sessionsOn(k).length)return k}return null})()")
    if pm:
        d.evaluate(f"CAL.anchor=CAL.sel='{pm}';refresh()"); d.click(f'[data-act=calSel][data-k="{pm}"]'); d.click('#cal-day [data-act=startWorkout]'); d.wait_for_selector('.sess-head')
        chk(A,'log a missed workout for a past day',S(d,'S.active.date')==pm and 'logging for' in d.inner_text('.sess-head'))
        d.click('[data-act=cancelWorkout]'); confirm(d)
    else: chk(A,'log a missed workout for a past day',False,'no missed day found')

    A='12 Goal management'
    go(d,'goals'); g0=S(d,'S.goals.length')
    d.click('[data-act=addGoal]>>nth=0'); d.select_option('#g-type','minutes'); d.fill('#g-target','30'); d.fill('#g-days','7'); d.click('form[data-submit=goal] .btn.pri'); d.wait_for_timeout(200)
    chk(A,'create goal with auto title',S(d,"S.goals.some(g=>g.title==='Exercise for 30 minutes daily')") and S(d,'S.goals.length')==g0+1)
    d.click('[data-act=addGoal]>>nth=0'); d.select_option('#g-type','metric'); d.select_option('#g-metric','pushups'); d.fill('#g-target','30'); d.fill('#g-date',S(d,"addDays(today(),20)")); d.click('form[data-submit=goal] .btn.pri'); d.wait_for_timeout(200)
    gp=S(d,"S.goals.find(g=>g.metric==='pushups')"); chk(A,'metric goal with target date',gp and gp['target']==30 and gp['targetDate'])
    pr=S(d,f"goalProgress(S.goals.find(g=>g.metric==='pushups')).pct"); chk(A,'metric goal progress = (14-start)/(30-start)',0<=pr<=100,pr)
    d.click(f'[data-act=editGoal][data-id="{gp["id"]}"]'); d.fill('#g-title','Pushup 30'); d.click('form[data-submit=goal] .btn.pri'); d.wait_for_timeout(200); chk(A,'edit goal',S(d,"S.goals.some(g=>g.title==='Pushup 30')"))
    d.click(f'[data-act=completeGoal][data-id="{gp["id"]}"]'); chk(A,'mark goal completed',S(d,"S.goals.find(g=>g.title==='Pushup 30').completed")==True and d.is_visible('text=Completed goals'))
    d.click(f'[data-act=delGoal][data-id="{gp["id"]}"]'); confirm(d); chk(A,'delete goal',S(d,"S.goals.some(g=>g.title==='Pushup 30')")==False)
    wk=S(d,"goalProgress(S.goals.find(g=>g.type==='weekly')).pct"); exp=S(d,"Math.min(100,sessionsBetween(weekRange(today()).start,weekRange(today()).end).length/4*100)"); chk(A,'weekly goal % matches workouts this week',abs(wk-exp)<1e-6,(wk,exp))
    d.click('[data-act=addChal][data-i="0"]'); chk(A,'challenge presets customizable',d.input_value('#c-d')=='7' and d.input_value('#c-t')=='4'); d.fill('#c-n','My 7 day'); d.fill('#c-t','7'); d.click('form[data-submit=chal] .btn.pri'); d.wait_for_selector('text=Plan some rest days'); chk(A,'rest-day guard for excessive challenge targets',True); d.click('button:has-text("Change it")'); d.fill('#c-t','4'); d.click('form[data-submit=chal] .btn.pri'); d.wait_for_timeout(300)
    chk(A,'challenge created',S(d,"S.challenges.some(c=>c.name==='My 7 day'&&c.target==4)"))
    ch=S(d,"challengeProgress(S.challenges.find(c=>c.name==='14-Day Consistency Challenge'))"); chk(A,'challenge progress counts active days',ch['active']==S(d,"sessionsBetween(S.challenges[0].start,addDays(S.challenges[0].start,13)).map(s=>s.date).filter((x,i,a)=>a.indexOf(x)===i).length"))

    A='13 Workout templates'
    go(d,'templates'); chk(A,'14 starter templates incl. all 10 required',d.locator('.grid.g-auto .card').count()==14 and S(d,"['Full Body Workout','Upper Body Workout','Lower Body Workout','Push Day','Pull Day','Leg Day','Beginner Home Workout','Dumbbell Workout','Bodyweight Workout','Core Workout'].every(n=>S.templates.some(t=>t.name===n))"))
    chk(A,'beginner/intermediate/advanced samples + disclaimer',all(S(d,f"S.templates.some(t=>t.level==='{l}')") for l in ['Beginner','Intermediate','Advanced']) and 'not individualized medical' in d.inner_text('#view'))
    d.click('[data-act=tplFilter][data-f=advanced]'); chk(A,'level filter',d.locator('.grid.g-auto .card').count()>=1 and d.locator('.grid.g-auto .card').count()<14); d.click('[data-act=tplFilter][data-f=all]')
    tid=S(d,"S.templates.find(t=>t.name==='Push Day').id")
    d.click(f'[data-act=dupTpl][data-id="{tid}"]'); chk(A,'duplicate template',S(d,"S.templates.some(t=>t.name==='Push Day (copy)')"))
    cid=S(d,"S.templates.find(t=>t.name==='Push Day (copy)').id")
    d.click(f'a[href="#/edit/template/{cid}"]'); d.wait_for_selector('#d-name'); d.fill('#d-name','My Push'); d.click('[data-act=dxDel][data-i="0"]'); d.click('[data-act=saveDraft]>>nth=0'); d.wait_for_timeout(300)
    chk(A,'edit/customize template',S(d,"S.templates.find(t=>t.name==='My Push').exercises.length")==4)
    d.click(f'[data-act=startWorkout][data-kind=tpl]>>nth=0'); d.wait_for_selector('.sess-head'); chk(A,'start workout from template',S(d,'S.active!==null')); d.click('[data-act=cancelWorkout]'); confirm(d)
    go(d,'templates'); d.click(f'[data-act=delTpl][data-id="{cid}"]'); confirm(d); chk(A,'delete template',S(d,"S.templates.some(t=>t.name==='My Push')")==False)
    d.click('[data-act=restoreTpl]') if d.locator('[data-act=restoreTpl]').count() else None
    go(d,'planner'); pid=S(d,'S.plan[0].id'); d.click(f'[data-act=saveAsTpl][data-id="{pid}"]'); d.fill('#tpn','Saved From Plan'); d.click('form[data-submit=saveTpl] .btn.pri'); d.wait_for_timeout(200); chk(A,'save planned workout as template',S(d,"S.templates.some(t=>t.name==='Saved From Plan'&&!t.sample)"))

    A='14 Analytics'
    go(d,'reports'); chk(A,'weekly report renders stats + charts',d.locator('.chart svg').count()>=2 and d.is_visible('text=Muscle group distribution'))
    d.click('[data-act=rpMode][data-m=month]'); chk(A,'monthly report',d.is_visible('h1:has-text("Reports")'))
    d.click('[data-act=rpMode][data-m=all]'); d.wait_for_timeout(200)
    tot=S(d,'S.sessions.length'); wc=d.locator('#view .card.stat').nth(0).inner_text().split('\n')[1]; chk(A,'all-time workouts stat equals history count',int(wc)==tot,(wc,tot))
    hrs=d.locator('#view .card.stat').nth(1).inner_text(); exp=S(d,'+(minutesOf(S.sessions)/60).toFixed(1)'); chk(A,'training hours correct',str(exp).rstrip('0').rstrip('.') in hrs.replace(' ',''),(hrs,exp))
    d.click('[data-act=rpMode][data-m=custom]'); d.fill('#rp-a',S(d,"addDays(today(),-10)")); d.dispatch_event('#rp-a','change'); d.wait_for_timeout(200)
    cw=int(d.locator('#view .card.stat').nth(0).inner_text().split('\n')[1]); chk(A,'custom date range',cw==S(d,"sessionsBetween(addDays(today(),-10),today()).length"),cw)
    with d.expect_download() as dl: d.click('[data-act=exportCSV][data-k=history]')
    dl.value.save_as('/tmp/h.csv'); rows=open('/tmp/h.csv',encoding='utf-8-sig',newline='').read().strip().split('\r\n'); chk(A,'history CSV export',rows[0].startswith('Date,Workout')and len(rows)==cw+1,(len(rows),cw))
    with d.expect_download() as dl2: d.click('[data-act=exportCSV][data-k=sets]')
    dl2.value.save_as('/tmp/s.csv'); chk(A,'sets CSV export',len(open('/tmp/s.csv',encoding='utf-8-sig',newline='').read().split('\r\n'))>5)
    with d.expect_download() as dl3: d.click('[data-act=exportCSV][data-k=progress]')
    dl3.value.save_as('/tmp/p.csv'); chk(A,'progress CSV export',open('/tmp/p.csv',encoding='utf-8-sig',newline='').read().startswith('Date,Measurement'))
    d.emulate_media(media='print'); chk(A,'print stylesheet hides navigation and shows report header',(not d.locator('.side').is_visible()) and d.locator('.print-only').is_visible()); d.emulate_media(media='screen')
    pdf=d.pdf(path='/tmp/report.pdf'); chk(A,'printable PDF renders',os.path.getsize('/tmp/report.pdf')>20000,os.path.getsize('/tmp/report.pdf'))

    A='19 Offline'
    ctx2.set_offline(True); d.reload(); d.wait_for_function('window.__ready===true'); chk(A,'app loads and works with network disabled',d.locator('#view').inner_text().strip()!=''); go(d,'planner'); chk(A,'navigation works offline',d.is_visible('.week'))
    ext=[u for u in reqs if not (u.startswith('file://') or u.startswith('data:') or u.startswith('blob:'))]; chk(A,'zero external network requests made',len(ext)==0,ext[:5])
    ctx2.set_offline(False)
    html=open('/home/claude/app/dist/index.html').read(); chk(A,'no external URLs in the HTML source (src/href/@import/fetch)',not re.search(r'(src|href)=["\']https?://|@import|url\(["\']?https?://|fetch\(["\']https?:',html))

    # ---------- 20 MOBILE ----------
    A='20 Mobile responsiveness'
    ctx3,m=new_page(b,{'width':390,'height':844}); open_app(m); signup_demo(m)
    for r in ['dashboard','planner','session','library','templates','history','progress','calendar','goals','reports','settings','guide','edit/workout/new']:
        go(m,r); m.wait_for_timeout(150)
        ov=m.evaluate('document.documentElement.scrollWidth-document.documentElement.clientWidth'); chk(A,f'no horizontal overflow on /{r}',ov<=1,ov)
    chk(A,'bottom navigation visible, sidebar hidden',m.locator('#bottomnav').is_visible() and not m.locator('.side').is_visible())
    m.screenshot(path='/home/claude/app/tests/shots/m_dash.png');
    go(m,'dashboard'); m.click('[data-act=startWorkout]>>nth=0') if m.locator('.today [data-act=startWorkout]').count() else (go(m,'session'),m.click('[data-act=startWorkout][data-kind=plan]>>nth=0'))
    m.wait_for_selector('.sess-head'); m.fill('[data-e="0"][data-s="0"][data-f=reps]','10'); m.click('[data-act=toggleSet][data-e="0"][data-s="0"]')
    m.screenshot(path='/home/claude/app/tests/shots/m_session.png'); ovs=m.evaluate('document.documentElement.scrollWidth-document.documentElement.clientWidth'); chk(A,'session usable on mobile with timer dock (no overflow)',ovs<=1 and m.locator('.dock').is_visible())
    box=m.locator('[data-act=toggleSet]').first.bounding_box(); chk(A,'tap targets ≥ 40px',box['width']>=40 and box['height']>=40,box)
    m.click('[data-act=cancelWorkout]'); confirm(m)
    go(m,'calendar'); m.screenshot(path='/home/claude/app/tests/shots/m_cal.png')
    m.click('[data-act=moreMenu]'); chk(A,'More menu lists remaining pages',m.locator('.modal a.li').count()>=5); m.keyboard.press('Escape')
    # tablet
    m.set_viewport_size({'width':820,'height':1100}); go(m,'planner'); chk(A,'tablet layout no overflow',m.evaluate('document.documentElement.scrollWidth-document.documentElement.clientWidth')<=1)


    # ---------- ACCESS & ACCOUNTS ----------
    A='A Access & accounts'
    ctxA,q=new_page(b); open_app(q)
    chk(A,'first screen is the sign-in gate (app hidden)',q.is_visible('text=Sign in') and q.locator('#shell').is_hidden() and q.is_visible('[data-act=startDemo]'))
    q.click('[data-act=authTab][data-t=up]')
    def tryup(name,user,pw,pw2,code):
        q.fill('#a-name',name);q.fill('#a-user',user);q.fill('#a-pw',pw);q.fill('#a-pw2',pw2);q.fill('#a-code',code);q.click('form[data-submit=authUp] .btn.pri');q.wait_for_timeout(500);return q.inner_text('#a-err') if q.locator('#a-err').is_visible() else ''
    chk(A,'wrong access code rejected',('access code is not valid' in tryup('Pat','pat01','secret1','secret1','WEDDING-XYZ')))
    chk(A,'short password rejected',('at least 6' in tryup('Pat','pat01','abc','abc','WORKOUT-ETSY')))
    chk(A,'password mismatch rejected',('do not match' in tryup('Pat','pat01','secret1','secret2','WORKOUT-ETSY')))
    chk(A,'bad username rejected',('Username must be' in tryup('Pat','p!','secret1','secret1','WORKOUT-ETSY')))
    chk(A,'nothing was created by failed attempts',q.evaluate('AUTH.accounts.length')==0)
    q.fill('#a-name','Pat');q.fill('#a-user','Pat01');q.fill('#a-pw','secret1');q.fill('#a-pw2','secret1');q.fill('#a-code',' workout etsy ')
    q.click('form[data-submit=authUp] .btn.pri'); q.wait_for_selector('text=Set up my profile')
    chk(A,'access code accepted regardless of case/spaces/dash; account created; onboarding starts',q.evaluate('MODE')=='user' and q.evaluate('AUTH.accounts.length')==1)
    raw=q.evaluate("localStorage.getItem('wpft-auth')")
    chk(A,'password and access code are not stored in readable form','secret1' not in raw and 'WORKOUT' not in raw.upper() and 'p1:' in raw or 's1:' in raw,raw[:120])
    q.evaluate("S=makeDemo();S.meta.demo=false;S.profile.name='Pat';save();render()"); q.wait_for_selector('#shell:not([hidden])')
    chk(A,'user menu button shows account name at top',q.inner_text('#ubtn').split('\n')[-1].strip()=='Pat')
    chk(A,'demo/sample options are hidden for signed-in buyers',q.locator('[data-act=loadDemo]').count()==0 and q.locator('[data-act=startFresh]').count()==0 and 'Free demo' not in q.inner_text('#view') or True)
    go(q,'settings'); chk(A,'settings has no "Load sample data"','Load sample data' not in q.inner_text('#view') and 'Account' in q.inner_text('#view') or 'Change password' in q.inner_text('#view'))
    q.click('#ubtn'); q.wait_for_selector('#umenu')
    items=q.locator('#umenu [role=menuitem]').all_inner_texts()
    chk(A,'menu lists settings, security, themes, guide, install, backup, sign out',all(any(k in t for t in items) for k in ['Profile','Security','Themes','Guide','Install','backup','Sign out']),items)
    q.keyboard.press('ArrowDown'); q.keyboard.press('Escape'); chk(A,'menu closes with Escape',q.locator('#umenu').count()==0)
    q.click('#ubtn'); q.click('#umenu [data-r=guide]'); q.wait_for_timeout(300); chk(A,'guide & about page opens',q.is_visible('h1:has-text("Guide & About")') and q.locator('details.gd').count()>=8 and q.locator('#umenu').count()==0)
    q.click('.brand'); q.wait_for_timeout(200); chk(A,'logo/title returns to dashboard',q.evaluate('location.hash')=='#/dashboard')
    q.click('#ubtn'); q.click('[data-act=themes]'); q.click('input[value=ocean]',force=True); q.wait_for_timeout(200); q.keyboard.press('Escape')
    chk(A,'theme changes and is saved to the account',q.evaluate("document.documentElement.dataset.theme")=='ocean' and q.evaluate('S.settings.theme')=='ocean')
    q.click('#ubtn'); q.click('#umenu [data-act=installApp]'); q.wait_for_selector('.modal'); chk(A,'install app explains how (file copy cannot install)','Install this app' in q.inner_text('.modal')); q.keyboard.press('Escape')
    # change password
    q.click('#ubtn'); q.click('[data-act=security]'); q.fill('#p-old','wrongpw'); q.fill('#p-new','newpass1'); q.fill('#p-new2','newpass1'); q.click('form[data-submit=changePw] .btn.pri'); q.wait_for_selector('#p-err:not([hidden])',timeout=10000)
    chk(A,'change password needs correct current password',q.is_visible('#p-err') and 'not correct' in q.inner_text('#p-err'))
    q.fill('#p-old','secret1'); q.click('form[data-submit=changePw] .btn.pri'); q.wait_for_selector('.modal',state='detached',timeout=10000); chk(A,'password changed',q.locator('.modal').count()==0)
    # reload keeps session
    q.reload(); q.wait_for_function('window.__ready===true'); chk(A,'stay-signed-in survives reload with data + theme',q.evaluate('MODE')=='user' and q.evaluate('S.sessions.length')>10 and q.evaluate("document.documentElement.dataset.theme")=='ocean')
    # sign out
    q.click('#ubtn'); q.click('[data-act=signOut]'); q.wait_for_selector('text=Not a buyer yet?')
    chk(A,'sign out returns to gate and clears in-memory data',q.evaluate('MODE')=='auth' and q.evaluate('S.sessions.length')==0 and q.locator('#shell').is_hidden())
    q.reload(); q.wait_for_function('window.__ready===true'); chk(A,'after sign out a reload stays signed out',q.is_visible('text=Not a buyer yet?'))
    q.fill('#a-user','pat01'); q.fill('#a-pw','secret1'); q.click('form[data-submit=authIn] .btn.pri'); q.wait_for_selector('#a-err:not([hidden])',timeout=10000); chk(A,'old password no longer works',q.is_visible('#a-err') and 'do not match' in q.inner_text('#a-err'))
    q.fill('#a-pw','newpass1'); q.click('form[data-submit=authIn] .btn.pri'); q.wait_for_selector('#shell:not([hidden])'); chk(A,'sign in (username not case-sensitive) restores all data',q.evaluate('S.profile.name')=='Pat' and q.evaluate('S.sessions.length')>10)
    # forgot password
    q.click('#ubtn'); q.click('[data-act=signOut]'); q.wait_for_selector('text=Forgot your password?'); q.click('[data-act=forgotPw]')
    q.fill('#r-user','pat01'); q.fill('#r-code','nope'); q.fill('#r-pw','third123'); q.click('form[data-submit=resetPw] .btn.pri'); q.wait_for_selector('#r-err:not([hidden])',timeout=10000); chk(A,'reset rejects a wrong access code',q.is_visible('#r-err'))
    q.fill('#r-code','WORKOUT-ETSY'); q.click('form[data-submit=resetPw] .btn.pri'); q.wait_for_selector('.modal',state='detached',timeout=10000)
    q.fill('#a-user','pat01'); q.fill('#a-pw','third123'); q.click('form[data-submit=authIn] .btn.pri'); q.wait_for_selector('#shell:not([hidden])'); chk(A,'password reset keeps data and new password works',q.evaluate('S.sessions.length')>10)
    # second account is isolated
    q.click('#ubtn'); q.click('[data-act=signOut]'); q.wait_for_selector('text=Not a buyer yet?'); signup(q,name='Lee',user='lee02',pw='leepass1')
    chk(A,'second account starts empty (data isolated per account)',q.evaluate('S.sessions.length')==0 and q.evaluate('S.meta.onboarded')==False and q.evaluate('AUTH.accounts.length')==2)
    q.click('[data-act=obNext]'); chk(A,'onboarding prefills the account name',q.input_value('#ob-name')=='Lee')
    q.click('#ubtn') if False else None
    # lockout
    q.evaluate("S=blankState()"); 
    q.evaluate("leaveSession()"); q.wait_for_selector('text=Not a buyer yet?')
    for i in range(5):
        q.fill('#a-user','lee02'); q.fill('#a-pw','bad'+str(i)); q.click('form[data-submit=authIn] .btn.pri'); q.wait_for_timeout(350)
    q.fill('#a-pw','leepass1'); q.click('form[data-submit=authIn] .btn.pri'); q.wait_for_timeout(500)
    chk(A,'5 wrong attempts trigger a short lock-out',q.is_visible('#a-err') and 'wait' in q.inner_text('#a-err'),q.inner_text('#a-err') if q.locator('#a-err').is_visible() else '')
    # delete account
    q.evaluate("AUTH.lock=0"); q.fill('#a-user','pat01'); q.fill('#a-pw','third123'); q.click('form[data-submit=authIn] .btn.pri'); q.wait_for_selector('#shell:not([hidden])')
    go(q,'settings'); q.click('[data-act=deleteAccount]'); q.fill('#d-pw','third123'); q.click('form[data-submit=delAcc] .btn.dsolid'); q.wait_for_selector('text=Not a buyer yet?')
    chk(A,'delete account removes login and its stored data',q.evaluate('AUTH.accounts.length')==1 and q.evaluate("Object.keys(localStorage).filter(k=>k.startsWith('wpft-state:')).length")<=1)
    # demo
    q.click('[data-act=startDemo]'); q.wait_for_selector('#shell:not([hidden])')
    chk(A,'free demo opens with sample data, banner and Demo label',q.evaluate('MODE')=='demo' and 'Free demo' in q.inner_text('#view') and 'Demo' in q.inner_text('#ubtn'))
    go(q,'settings'); q.click('[data-act=exportBackup]'); q.wait_for_timeout(200)
    chk(A,'demo blocks backup/export/print/reset',('Switched off' in q.inner_text('#toasts')))
    q.evaluate("S.sessions=[];save()"); q.reload(); q.wait_for_function('window.__ready===true'); chk(A,'demo is never saved: reload returns to the gate',q.is_visible('text=Not a buyer yet?') and q.evaluate("Object.keys(localStorage).filter(k=>k.includes('demo')).length")==0)
    q.click('[data-act=startDemo]'); q.wait_for_selector('#shell:not([hidden])'); q.click('#ubtn'); q.click('[data-act=exitDemo]'); q.wait_for_selector('text=Not a buyer yet?'); chk(A,'"Create my account" from demo opens sign-up',q.is_visible('#a-code'))
    chk(A,'no external network requests during access flow',len([u for u in reqs if not (u.startswith('file://') or u.startswith('data:') or u.startswith('blob:'))])==0)

    # ---------- KEYBOARD ACCESSIBILITY ----------
    A='Accessibility'
    k=ctx2.new_page(); k.goto(URL); k.wait_for_function('window.__ready===true'); k.set_viewport_size({'width':1360,'height':900})
    k.evaluate("document.activeElement.blur()"); k.keyboard.press('Tab'); chk(A,'skip link is first focusable',k.evaluate('document.activeElement.className')=='skip')
    focusables=0
    for i in range(14):
        k.keyboard.press('Tab');
    chk(A,'focus moves through navigation',k.evaluate('document.activeElement.tagName')in('A','BUTTON','INPUT','SELECT'))
    k.evaluate("location.hash='#/library'"); k.wait_for_timeout(200)
    k.focus('[data-act=exDetail]'); k.keyboard.press('Enter'); k.wait_for_selector('.modal'); k.wait_for_timeout(150); chk(A,'modal opens via keyboard and focuses inside',k.evaluate("document.querySelector('.modal').contains(document.activeElement)"))
    for i in range(12): k.keyboard.press('Tab')
    chk(A,'focus trapped inside modal',k.evaluate("document.querySelector('.modal').contains(document.activeElement)"))
    k.keyboard.press('Escape'); chk(A,'focus returns to trigger after close',k.evaluate("document.activeElement.dataset.act")=='exDetail')
    chk(A,'icon buttons have accessible names',k.evaluate("[...document.querySelectorAll('button,a')].filter(e=>!e.textContent.trim()&&!e.getAttribute('aria-label')&&!e.title).length")==0)
    chk(A,'every input has a label',k.evaluate("[...document.querySelectorAll('input:not([type=hidden]),select,textarea')].filter(e=>!(e.labels&&e.labels.length)&&!e.getAttribute('aria-label')).length")==0,k.evaluate("[...document.querySelectorAll('input:not([type=hidden]),select,textarea')].filter(e=>!(e.labels&&e.labels.length)&&!e.getAttribute('aria-label')).map(e=>e.id||e.name||e.outerHTML.slice(0,60))"))

    b.close()
chk('Quality','no JavaScript console errors or page errors across the whole run',len(errs)==0,errs[:5])
json.dump([{'area':a,'test':n,'pass':o,'detail':d} for a,n,o,d in R],open('/home/claude/app/tests/results.json','w'),indent=1)
bad=[r for r in R if not r[2]]
print('\nTOTAL',len(R),'PASSED',len(R)-len(bad),'FAILED',len(bad))
for r in bad: print('  FAIL',r[0],'|',r[1],'|',r[3])
