/* ===== Rest timer, session tracker, history, calendar ===== */
const fmtVol=v=>Math.round(toDisp('w',v)||0).toLocaleString()+' '+uName('w');

/* ---------- REST TIMER ---------- */
const T={ac:null,wl:null,iv:null,
  unlock(){try{if(!this.ac){const C=window.AudioContext||window.webkitAudioContext;if(C)this.ac=new C()}if(this.ac&&this.ac.state==='suspended')this.ac.resume()}catch(e){}},
  beep(){
    if(!S.settings.sound)return;this.unlock();const ac=this.ac;if(!ac)return;
    try{[0,.28,.56].forEach((d,i)=>{const o=ac.createOscillator(),g=ac.createGain(),t0=ac.currentTime+d;o.type='sine';o.frequency.value=i===2?1175:880;
      g.gain.setValueAtTime(.0001,t0);g.gain.exponentialRampToValueAtTime(.3,t0+.03);g.gain.exponentialRampToValueAtTime(.0001,t0+.22);o.connect(g);g.connect(ac.destination);o.start(t0);o.stop(t0+.25)})}catch(e){}
    try{navigator.vibrate&&navigator.vibrate([200,100,200])}catch(e){}
  },
  left(){const t=S.timer;return t.status==='running'?Math.max(0,Math.ceil((t.endsAt-Date.now())/1000)):t.remain},
  start(sec){this.unlock();const t=S.timer;sec=Math.max(1,Math.round(sec));t.total=sec;t.remain=sec;t.endsAt=Date.now()+sec*1000;t.status='running';save();this.run();this.lock();this.sync()},
  pause(){const t=S.timer;if(t.status!=='running')return;t.remain=this.left();t.status='paused';save();this.unlockWL();this.sync()},
  resume(){const t=S.timer;if(t.status!=='paused')return;this.unlock();t.endsAt=Date.now()+t.remain*1000;t.status='running';save();this.run();this.lock();this.sync()},
  reset(){const t=S.timer;t.status='idle';t.remain=t.total;t.endsAt=0;save();this.unlockWL();this.sync()},
  setTotal(sec){const t=S.timer;t.total=sec;t.remain=sec;t.status='idle';t.endsAt=0;save();this.sync()},
  add(sec){const t=S.timer;if(t.status==='running'){t.endsAt+=sec*1000;t.total+=sec}else{t.remain+=sec;t.total+=sec;if(t.status==='done'){t.status='paused'}}save();this.sync()},
  run(){clearInterval(this.iv);this.iv=setInterval(()=>this.step(),250)},
  step(){const t=S.timer;if(t.status!=='running'){clearInterval(this.iv);return}
    if(this.left()<=0){this.finish(true)}else this.ui()},
  finish(alert){const t=S.timer;clearInterval(this.iv);t.status='done';t.remain=0;save();this.unlockWL();
    if(alert){this.beep();toast('Rest finished — ready for the next set','ok');if(document.hidden){const o=document.title;document.title='⏰ Rest over!';const f=()=>{if(!document.hidden){document.title=o;document.removeEventListener('visibilitychange',f)}};document.addEventListener('visibilitychange',f)}}
    this.sync()},
  async lock(){try{if('wakeLock' in navigator&&!this.wl){this.wl=await navigator.wakeLock.request('screen');this.wl.addEventListener('release',()=>{this.wl=null})}}catch(e){}},
  unlockWL(){try{if(this.wl){this.wl.release();this.wl=null}}catch(e){}},
  ui(){
    const l=this.left(),t=S.timer,frac=t.total?clamp(l/t.total,0,1):0;
    $$('[data-tleft]').forEach(e=>{e.textContent=fmtClock(l)});
    $$('[data-tring]').forEach(e=>{const c=+e.getAttribute('data-c');e.setAttribute('stroke-dasharray',(c*frac)+' '+c)});
    const b=$('#timer-btn-t');if(b)b.textContent=t.status==='idle'?'Rest timer':fmtClock(l);
  },
  sync(){renderDock();updatePanel();this.ui()},
  resumeOnLoad(){const t=S.timer;if(t.status==='running'){if(t.endsAt<=Date.now()){t.status='done';t.remain=0}else{this.run();this.lock()}}}
};
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){if(S&&S.timer.status==='running'){if(T.left()<=0)T.finish(true);else{T.run();T.lock();T.ui()}}}});
function renderDock(){
  const d=$('#dock');if(!d||!S)return;const t=S.timer,tb=$('#timer-btn-t');
  if(tb)tb.textContent=t.status==='idle'?'Rest timer':fmtClock(T.left());
  if(t.status==='idle'){d.innerHTML='';return}
  const done=t.status==='done',paused=t.status==='paused';
  d.innerHTML='<div class="dock" role="timer" aria-label="Rest timer">'+ic('timer')+'<div><div class="tt" data-tleft>'+fmtClock(T.left())+'</div><small>'+(done?'Rest finished':paused?'Paused':'Resting')+'</small></div>'
    +(done?'<button type="button" class="btn" data-act="tReset">Dismiss</button>':'<button type="button" class="btn" data-act="'+(paused?'tResume':'tPause')+'">'+ic(paused?'play':'pause')+(paused?'Resume':'Pause')+'</button><button type="button" class="btn" data-act="tAdd" data-s="15" aria-label="Add 15 seconds">+15s</button><button type="button" class="btn" data-act="tReset" aria-label="Skip rest">'+ic('skip')+'Skip</button>')
    +'<button type="button" class="icon-btn" style="color:#fff" data-act="openTimer" aria-label="Open timer panel">'+ic('timer')+'</button></div>';
}
function timerPanelHTML(){
  const t=S.timer,l=T.left(),r=84,c=2*Math.PI*r,frac=t.total?clamp(l/t.total,0,1):0,st=t.status;
  const presets=[30,45,60,90,120];
  return '<div class="center"><div class="ring" style="width:200px;height:200px" role="img" aria-label="Timer progress"><svg width="200" height="200" viewBox="0 0 200 200"><circle cx="100" cy="100" r="'+r+'" fill="none" stroke="#EEF1F4" stroke-width="12"/><circle data-tring data-c="'+c+'" cx="100" cy="100" r="'+r+'" fill="none" stroke="'+(st==='done'?'#E7AD62':'#7C9A83')+'" stroke-width="12" stroke-linecap="round" stroke-dasharray="'+(c*frac)+' '+c+'" transform="rotate(-90 100 100)"/></svg><div style="position:absolute;text-align:center"><div class="tbig" data-tleft aria-live="off">'+fmtClock(l)+'</div><div class="small muted" aria-live="polite">'+({idle:'Ready',running:'Resting',paused:'Paused',done:'Time is up!'}[st])+'</div></div></div>'
   +'<div class="row wrap mt" style="justify-content:center">'+presets.map(s=>'<button type="button" class="chip" data-act="tPreset" data-s="'+s+'" aria-pressed="'+(t.total===s&&st==='idle')+'">'+(s>=120?s/60+' min':s+' sec')+'</button>').join('')+'</div>'
   +'<form data-submit="tCustom" class="row mt" style="justify-content:center"><label class="sr" for="tc">Custom rest time in seconds</label><input id="tc" name="s" type="number" min="5" max="3600" step="1" inputmode="numeric" placeholder="Custom (sec)" style="width:140px"><button class="btn">Set custom</button></form>'
   +'<div class="row mt wrap" style="justify-content:center">'
   +(st==='running'?'<button type="button" class="btn pri lg" data-act="tPause">'+ic('pause')+'Pause</button>':st==='paused'?'<button type="button" class="btn pri lg" data-act="tResume">'+ic('play')+'Resume</button>':'<button type="button" class="btn pri lg" data-act="tStart">'+ic('play')+'Start</button>')
   +'<button type="button" class="btn lg" data-act="tReset"'+(st==='idle'?' disabled':'')+'>'+ic('reset')+'Reset</button></div>'
   +'<label class="row small mt" style="justify-content:center"><input type="checkbox" data-chg="soundToggle"'+(S.settings.sound?' checked':'')+'> Sound alert when time is up</label>'
   +'<p class="hint">The timer follows your device clock, so it stays accurate when you switch tabs. Keep this page open so the alert can sound.</p></div>';
}
function updatePanel(){const p=$('#tpanel');if(p)p.innerHTML=timerPanelHTML()}
ACT.openTimer=()=>{if($('#tpanel'))return;modal({title:'Rest timer',html:'<div class="mb" id="tpanel">'+timerPanelHTML()+'</div><div class="mf"><button type="button" class="btn pri" data-act="closeModal">Close</button></div>'})};
ACT.tStart=()=>T.start(S.timer.total||60);ACT.tPause=()=>T.pause();ACT.tResume=()=>T.resume();ACT.tReset=()=>T.reset();ACT.tAdd=el=>T.add(+el.dataset.s);
ACT.tPreset=el=>T.setTotal(+el.dataset.s);
SUB.tCustom=(f,fd)=>{const v=num(fd.get('s'));if(!v||v<5||v>3600){toast('Enter a time between 5 and 3600 seconds.','err');return}T.setTotal(Math.round(v))};
CHG.soundToggle=el=>{S.settings.sound=el.checked;save();if(el.checked){T.unlock();T.beep()}};

/* ---------- SESSION ---------- */
ROUTES.session=()=>S.active?sessionView():sessionChooser();
function sessionChooser(){
  const t=today(),d=wd(t),todays=S.plan.filter(w=>w.day===d),others=S.plan.filter(w=>w.day!==d);
  const row=w=>'<div class="li" style="cursor:default"><span class="grow"><b>'+esc(w.name)+'</b><br><span class="small muted">'+(w.day!=null?DAYS[w.day]+' · ':'')+plural(w.exercises.length,'exercise')+' · ~'+w.duration+' min</span></span><button type="button" class="btn pri sm" data-act="startWorkout" data-kind="plan" data-id="'+w.id+'">'+ic('play')+'Start</button></div>';
  let h=pageHead('Start a workout','Pick a planned workout, a template, or start with an empty session and add exercises as you go.','<button type="button" class="btn pri" data-act="startWorkout" data-kind="quick">'+ic('plus')+'Quick workout</button>');
  h+='<div class="grid g2">';
  h+='<div class="card"><h2>Today · '+DAYS[d]+'</h2>'+(todays.length?'<div class="list">'+todays.map(row).join('')+'</div>':emptyState(S.restDays[d]?'Rest day':'Nothing planned today','Pick any workout from the lists, or start a quick session.'))+'</div>';
  h+='<div class="card"><h2>Other planned workouts</h2>'+(others.length?'<div class="list">'+others.map(row).join('')+'</div>':emptyState('No other workouts planned','Create workouts in the Planner.','<a class="btn" href="#/planner">Open planner</a>'))+'</div></div>';
  h+='<div class="card mt"><div class="row between"><h2>From a template</h2><a class="small" href="#/templates">All templates</a></div><div class="list">'+S.templates.slice(0,6).map(w=>'<div class="li" style="cursor:default"><span class="grow"><b>'+esc(w.name)+'</b><br><span class="small muted">'+plural(w.exercises.length,'exercise')+' · ~'+w.duration+' min</span></span><button type="button" class="btn sm" data-act="startWorkout" data-kind="tpl" data-id="'+w.id+'">'+ic('play')+'Start</button></div>').join('')+'</div></div>';
  h+='<p class="small muted mt">'+ic('shield','" style="width:14px;height:14px;vertical-align:-2px')+' Stop if you feel pain, dizziness or unusual symptoms. <button type="button" class="lnk" style="color:var(--accent-d);text-decoration:underline;font-weight:500" data-act="safety">Safety information</button></p>';
  return h;
}
function prevText(last,t){
  if(!last)return '';
  return last.slice(0,4).map(s=>t==='strength'?(s.w>0?fmtNum(toDisp('w',s.w))+' '+uName('w')+' × ':'')+(s.reps||0):t==='bodyweight'?(s.reps||0)+' reps':t==='timed'?fmtSecs(s.dur||0):fmtMin((s.dur||0)/60)+(s.dist?' · '+fmtU('d',s.dist,2):'')).join(', ')+(last.length>4?'…':'');
}
function sessSummary(){
  const A=S.active,st=activeStats(A),pct=st.setsAll?st.sets/st.setsAll*100:0;
  return '<div class="row wrap gap-s mt-s"><span class="chip g">'+st.sets+' / '+st.setsAll+' sets done</span><span class="chip">'+plural(st.total,'exercise')+'</span><span class="chip">'+st.reps+' reps</span>'+(st.vol?'<span class="chip">'+fmtVol(st.vol)+' volume</span>':'')+'</div><div class="mt-s">'+bar(pct)+'</div>';
}
function setRow(e,i,s,j){
  const t=e.type,ud=(f,val,unit,lab,step)=>'<div class="ud"><input type="number" inputmode="decimal" min="0" step="'+(step||'any')+'" data-inp="setf" data-e="'+i+'" data-s="'+j+'" data-f="'+f+'" value="'+esc(val)+'" aria-label="'+lab+' for set '+(j+1)+'"><span>'+unit+'</span></div>';
  let cells='',cls='set';
  if(t==='strength'){cells=ud('w',inVal('w',s.w),uName('w'),'Weight')+ud('reps',s.reps==null?'':s.reps,'reps','Reps','1')}
  else if(t==='bodyweight'){cls='set one';cells=ud('reps',s.reps==null?'':s.reps,'reps','Reps','1')}
  else if(t==='timed'){cls='set one';cells=ud('dur',s.dur==null?'':s.dur,'sec','Seconds','1')}
  else{cells=ud('dur',s.dur==null?'':+(s.dur/60).toFixed(1),'min','Minutes')+ud('dist',inVal('d',s.dist),uName('d'),'Distance')}
  return '<div class="'+cls+'"><span class="sl">Set '+(j+1)+'</span>'+cells+'<button type="button" class="setchk" data-act="toggleSet" data-e="'+i+'" data-s="'+j+'" aria-pressed="'+!!s.done+'" aria-label="Mark set '+(j+1)+' of '+esc(e.name)+' as '+(s.done?'not completed':'completed')+'">'+ic('check')+'</button><button type="button" class="icon-btn dng" data-act="rmSet" data-e="'+i+'" data-s="'+j+'" aria-label="Remove set '+(j+1)+' of '+esc(e.name)+'"'+(e.sets.length<=1?' disabled':'')+'>'+ic('x')+'</button></div>';
}
function sessEx(e,i){
  const t=e.type,hd=t==='strength'?['Weight','Reps']:t==='bodyweight'?['Reps']:t==='timed'?['Seconds']:['Minutes','Distance'];
  const pv=prevText(lastPerf(e.exId),t),dn=e.sets.filter(s=>s.done).length;
  let h='<div class="exc'+(e.skipped?' skipped':'')+(!e.skipped&&dn===e.sets.length&&dn>0?' allsets':'')+'"><div class="row between" style="align-items:flex-start"><div class="grow"><h3><button type="button" class="lnk" data-act="exDetail" data-id="'+e.exId+'">'+(i+1)+'. '+esc(e.name)+'</button></h3>'+(pv?'<div class="small muted">Last time: '+esc(pv)+'</div>':'')+'</div><div class="row gap-s"><button type="button" class="btn sm" data-act="skipEx" data-e="'+i+'" aria-pressed="'+e.skipped+'">'+ic('skip')+(e.skipped?'Unskip':'Skip')+'</button><button type="button" class="icon-btn dng" data-act="rmEx" data-e="'+i+'" aria-label="Remove '+esc(e.name)+' from this workout">'+ic('trash')+'</button></div></div>';
  if(e.skipped)return h+'<p class="small muted">Skipped — this exercise will not be saved.</p></div>';
  h+='<div class="sethead'+(hd.length===1?' one':'')+'"><span>Set</span>'+hd.map(x=>'<span>'+x+'</span>').join('')+'<span>Done</span><span></span></div>'+e.sets.map((s,j)=>setRow(e,i,s,j)).join('');
  h+='<div class="row between wrap mt-s"><button type="button" class="btn sm" data-act="addSet" data-e="'+i+'">'+ic('plus')+'Add set</button><label class="row small muted">Rest <input type="number" min="0" max="900" step="5" inputmode="numeric" data-inp="exrest" data-e="'+i+'" value="'+(e.rest==null?'':e.rest)+'" style="width:74px;min-height:34px;padding:4px 8px" aria-label="Rest seconds for '+esc(e.name)+'"> sec</label></div>';
  h+='<details'+(e.notes?' open':'')+'><summary class="small muted" style="cursor:pointer;margin-top:8px">Exercise notes</summary><textarea data-inp="exnote" data-e="'+i+'" aria-label="Notes for '+esc(e.name)+'" placeholder="How did it feel?" style="min-height:60px">'+esc(e.notes)+'</textarea></details></div>';
  return h;
}
function sessionView(){
  const A=S.active,back=A.date!==today();
  let h='<div class="sess-head"><div class="row between wrap"><div><h1 style="font-size:21px">'+esc(A.name)+'</h1><div class="small muted"><span data-elapsed>'+fmtClock((Date.now()-A.startedAt)/1000)+'</span> elapsed'+(back?' · logging for <b>'+fmtDate(A.date)+'</b>':'')+'</div></div><div class="row wrap gap-s"><button type="button" class="btn" data-act="addSessEx">'+ic('plus')+'Add exercise</button><button type="button" class="btn danger" data-act="cancelWorkout">Cancel</button><button type="button" class="btn pri" data-act="finishWorkout">'+ic('check')+'Finish workout</button></div></div><div id="sess-sum">'+sessSummary()+'</div></div>';
  h+='<div class="stack mt">'+(A.exercises.length?A.exercises.map(sessEx).join(''):'<div class="card">'+emptyState('No exercises yet','Add the first exercise to start logging sets.','<button type="button" class="btn pri" data-act="addSessEx">'+ic('plus')+'Add exercise</button>')+'</div>')+'</div>';
  h+='<div class="disc mt">Planning and tracking tool only — not medical advice. Stop if you feel pain, dizziness or unusual symptoms. <button type="button" class="lnk" style="text-decoration:underline" data-act="safety">Safety information</button></div>';
  return h;
}
const updateSessSummary=()=>{const e=$('#sess-sum');if(e&&S.active)e.innerHTML=sessSummary()};
INP.setf=el=>{
  const A=S.active,e=A.exercises[+el.dataset.e],s=e.sets[+el.dataset.s],f=el.dataset.f,v=num(el.value);
  if(f==='w')s.w=v==null||v===0?null:fromDisp('w',v);else if(f==='reps')s.reps=v==null?null:Math.round(v);
  else if(f==='dur')s.dur=v==null?null:(e.type==='cardio'?Math.round(v*60):Math.round(v));else if(f==='dist')s.dist=v==null||v===0?null:fromDisp('d',v);
  el.classList.remove('bad');save();updateSessSummary();
};
INP.exrest=el=>{S.active.exercises[+el.dataset.e].rest=Math.max(0,Math.round(num(el.value)||0));save()};
INP.exnote=el=>{S.active.exercises[+el.dataset.e].notes=el.value;save()};
ACT.toggleSet=el=>{
  const A=S.active,i=+el.dataset.e,j=+el.dataset.s,e=A.exercises[i],s=e.sets[j];
  if(!s.done){
    const ok=isRepsType(e.type)?(s.reps>0):e.type==='timed'?(s.dur>0):(s.dur>0||s.dist>0);
    if(!ok){toast(isRepsType(e.type)?'Enter the number of reps first.':e.type==='timed'?'Enter the duration in seconds first.':'Enter the minutes or distance first.','err');
      const inp=$('[data-inp="setf"][data-e="'+i+'"][data-s="'+j+'"][data-f="'+(isRepsType(e.type)?'reps':'dur')+'"]');if(inp){inp.classList.add('bad');inp.focus()}return}
  }
  s.done=!s.done;save();
  if(s.done&&S.settings.autoRest&&e.rest>0){const rest=A.exercises.some(x=>!x.skipped&&x.sets.some(y=>!y.done));if(rest)T.start(e.rest)}
  refresh();const b=$('[data-act="toggleSet"][data-e="'+i+'"][data-s="'+j+'"]');if(b)b.focus({preventScroll:true});
};
ACT.addSet=el=>{const e=S.active.exercises[+el.dataset.e],l=e.sets[e.sets.length-1],n=Object.assign({},l||{w:null,reps:null,dur:null,dist:null});n.done=false;e.sets.push(n);save();refresh()};
ACT.rmSet=el=>{const e=S.active.exercises[+el.dataset.e];if(e.sets.length<=1)return;e.sets.splice(+el.dataset.s,1);save();refresh()};
ACT.skipEx=el=>{const e=S.active.exercises[+el.dataset.e];e.skipped=!e.skipped;save();refresh()};
ACT.rmEx=async el=>{const e=S.active.exercises[+el.dataset.e];
  if(e.sets.some(s=>s.done)&&!await confirmDlg({title:'Remove exercise?',msg:'“'+e.name+'” has completed sets that will be lost.',ok:'Remove',danger:true}))return;
  S.active.exercises.splice(+el.dataset.e,1);save();refresh()};
ACT.addSessEx=()=>openPicker(id=>{S.active.exercises.push(buildSession({exercises:[planEx(id)]}).exercises[0]);save();refresh()},()=>S.active.exercises.map(e=>e.exId));
ACT.cancelWorkout=async()=>{
  if(await confirmDlg({title:'Cancel this workout?',msg:'Nothing from this session will be saved. This cannot be undone.',ok:'Cancel workout',cancel:'Keep training',danger:true})){S.active=null;T.reset();save();go('dashboard');toast('Workout cancelled')}
};
ACT.finishWorkout=()=>{
  const A=S.active,st=activeStats(A),el=Math.max(1,Math.round((Date.now()-A.startedAt)/60000));
  if(!st.sets){modal({title:'No sets completed yet',html:'<div class="mb"><p>You have not marked any sets as completed, so there is nothing to save. Mark sets as done as you finish them, or discard this workout.</p></div><div class="mf"><button type="button" class="btn danger" data-act="discardFromFinish">Discard workout</button><button type="button" class="btn pri" data-act="closeModal" autofocus>Keep training</button></div>'});return}
  modal({title:'Finish workout',html:'<form data-submit="finishSession"><div class="mb"><div class="grid g2" style="gap:10px"><div class="card flat stat" style="padding:10px 14px"><div class="l">Exercises</div><div class="v">'+st.exs+'</div></div><div class="card flat stat" style="padding:10px 14px"><div class="l">Sets completed</div><div class="v">'+st.sets+'<small> / '+st.setsAll+'</small></div></div><div class="card flat stat" style="padding:10px 14px"><div class="l">Total reps</div><div class="v">'+st.reps+'</div></div><div class="card flat stat" style="padding:10px 14px"><div class="l">Training volume</div><div class="v" style="font-size:20px">'+(st.vol?fmtVol(st.vol):'–')+'</div></div></div>'
   +'<div class="field mt"><label class="f" for="fd">Workout duration (minutes)</label><input id="fd" name="duration" type="number" min="1" max="600" step="1" inputmode="numeric" required value="'+(A.date===today()?el:Math.max(1,S.profile.duration||30))+'"><div class="hint">'+(A.date===today()?'Calculated from when you started. Adjust it if you took a long break.':'Estimate how long this workout took.')+'</div></div>'
   +'<div class="field"><label class="f" for="fn">Workout notes</label><textarea id="fn" name="notes" maxlength="600" placeholder="Optional: how did it go?">'+esc(A.notes||'')+'</textarea></div><p class="small muted">Sets you did not mark as completed are not saved.</p></div><div class="mf"><button type="button" class="btn" data-act="closeModal">Keep training</button><button class="btn pri" autofocus>Save workout</button></div></form>'});
};
ACT.discardFromFinish=()=>{closeModal();S.active=null;T.reset();save();go('dashboard')};
SUB.finishSession=(f,fd)=>{
  const A=S.active,dur=Math.round(num(fd.get('duration'))||0);if(dur<1||dur>600){toast('Enter a duration between 1 and 600 minutes.','err');return}
  const before=new Set(computePRs().events.map(x=>x.exId+'|'+x.date+'|'+x.sessionId));
  const rec={id:A.id,workoutId:A.workoutId,name:A.name,muscles:A.muscles,startedAt:A.startedAt,date:A.date,duration:dur,notes:String(fd.get('notes')||'').trim(),
    exercises:A.exercises.filter(e=>!e.skipped&&e.sets.some(s=>s.done)).map(e=>({exId:e.exId,name:e.name,type:e.type,skipped:false,notes:e.notes,rest:e.rest,sets:e.sets.filter(s=>s.done).map(s=>Object.assign({},s))}))};
  S.sessions.push(rec);sortSessions();S.active=null;T.reset();syncAuto();save();
  const st=sessStats(rec),newPR=computePRs().events.filter(e=>e.sessionId===rec.id);
  closeAllModals();
  modal({title:'Workout complete',onClose:()=>go('dashboard'),html:'<div class="mb center"><div style="font-size:15px" class="muted">'+esc(rec.name)+'</div><div class="grid g2 mt" style="gap:10px"><div class="card flat stat"><div class="l">Duration</div><div class="v">'+fmtMin(dur)+'</div></div><div class="card flat stat"><div class="l">Sets</div><div class="v">'+st.sets+'</div></div><div class="card flat stat"><div class="l">Reps</div><div class="v">'+st.reps+'</div></div><div class="card flat stat"><div class="l">Volume</div><div class="v" style="font-size:20px">'+(st.vol?fmtVol(st.vol):'–')+'</div></div></div>'
   +(newPR.length?'<div class="banner info mt" style="justify-content:center">'+ic('star')+'<div><b>'+plural(newPR.length,'new personal record')+'</b><br>'+newPR.map(p=>esc(p.name)+': '+esc(p.text)).join('<br>')+'</div></div>':'')+'<p class="muted mt">Nice work. Rest and recover well.</p></div><div class="mf"><button type="button" class="btn pri" data-act="closeModal" autofocus>Done</button></div>'});
};

/* ---------- HISTORY ---------- */
const HF={q:'',m:'',from:'',to:'',shown:25};
function histFiltered(){
  const q=HF.q.trim().toLowerCase();
  return S.sessions.filter(s=>(!q||(s.name+' '+(s.notes||'')+' '+s.exercises.map(e=>e.name).join(' ')).toLowerCase().includes(q))&&(!HF.m||(s.muscles||[]).includes(HF.m)||s.exercises.some(e=>getEx(e.exId).muscle===HF.m))&&(!HF.from||s.date>=HF.from)&&(!HF.to||s.date<=HF.to)).slice().reverse();
}
function histList(){
  const l=histFiltered(),shown=l.slice(0,HF.shown);
  if(!S.sessions.length)return emptyState('No workouts in your history yet','Completed workouts appear here automatically.','<a class="btn pri" href="#/session">Start a workout</a>');
  if(!l.length)return emptyState('No workouts match','Try changing the search or date range.','<button type="button" class="btn" data-act="histClear">Clear filters</button>');
  return '<p class="small muted" aria-live="polite">'+plural(l.length,'workout')+'</p><div class="tbl-wrap"><table><thead><tr><th>Date</th><th>Workout</th><th>Duration</th><th>Exercises</th><th>Sets</th><th>Volume</th><th><span class="sr">Actions</span></th></tr></thead><tbody>'
   +shown.map(s=>{const st=sessStats(s);return '<tr><td style="white-space:nowrap">'+fmtDate(s.date,{weekday:'short',day:'numeric',month:'short',year:'numeric'})+'</td><td><b>'+esc(s.name)+'</b>'+(s.notes?'<div class="xs muted">'+esc(s.notes.slice(0,70))+(s.notes.length>70?'…':'')+'</div>':'')+'</td><td>'+fmtMin(s.duration)+'</td><td>'+st.exs+'</td><td>'+st.sets+'</td><td>'+(st.vol?fmtVol(st.vol):'–')+'</td><td style="text-align:right;white-space:nowrap"><button type="button" class="btn sm" data-act="viewSession" data-id="'+s.id+'">Details</button> <button type="button" class="icon-btn dng" data-act="delSession" data-id="'+s.id+'" aria-label="Delete '+esc(s.name)+' on '+fmtDate(s.date)+'">'+ic('trash')+'</button></td></tr>'}).join('')+'</tbody></table></div>'
   +(l.length>shown.length?'<div class="center mt"><button type="button" class="btn" data-act="histMore">Show more ('+(l.length-shown.length)+' remaining)</button></div>':'');
}
ROUTES.history=()=>pageHead('Workout History','Every completed workout, saved on this device.','<button type="button" class="btn" data-act="exportCSV" data-k="history">'+ic('download')+'Export CSV</button>')
  +'<div class="card"><div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr));align-items:end"><div class="field" style="margin:0"><label class="f" for="h-q">Search</label><input id="h-q" type="search" data-inp="histq" placeholder="Name, exercise or notes" value="'+esc(HF.q)+'"></div>'
  +'<div class="field" style="margin:0"><label class="f" for="h-m">Muscle group</label><select id="h-m" data-chg="histf" data-f="m"><option value="">All</option>'+MUSCLES.map(m=>'<option'+(HF.m===m?' selected':'')+'>'+m+'</option>').join('')+'</select></div>'
  +'<div class="field" style="margin:0"><label class="f" for="h-f">From date</label><input id="h-f" type="date" data-chg="histf" data-f="from" value="'+HF.from+'"></div><div class="field" style="margin:0"><label class="f" for="h-t">To date</label><input id="h-t" type="date" data-chg="histf" data-f="to" value="'+HF.to+'"></div>'
  +'<button type="button" class="btn" data-act="histClear">Clear filters</button></div></div><div class="card mt" id="hist-list">'+histList()+'</div>';
const redrawHist=()=>{const l=$('#hist-list');if(l)l.innerHTML=histList()};
INP.histq=el=>{HF.q=el.value;HF.shown=25;redrawHist()};
CHG.histf=el=>{HF[el.dataset.f]=el.value;HF.shown=25;redrawHist()};
ACT.histClear=()=>{Object.assign(HF,{q:'',m:'',from:'',to:'',shown:25});refresh()};
ACT.histMore=()=>{HF.shown+=25;redrawHist()};
function sessionDetail(id){
  const s=S.sessions.find(x=>x.id===id);if(!s)return;const st=sessStats(s);
  const setTxt=(e,x)=>e.type==='strength'?(x.w>0?fmtU('w',x.w)+' × ':'')+(x.reps||0)+' reps':e.type==='bodyweight'?(x.reps||0)+' reps':e.type==='timed'?fmtSecs(x.dur||0):fmtMin((x.dur||0)/60)+(x.dist?' · '+fmtU('d',x.dist,2):'');
  modal({title:s.name,size:'wide',html:'<div class="mb"><p class="muted">'+fmtDateL(s.date)+' · '+fmtMin(s.duration)+'</p><div class="row wrap gap-s">'+chips(s.muscles)+'<span class="chip g">'+plural(st.exs,'exercise')+'</span><span class="chip g">'+plural(st.sets,'set')+'</span><span class="chip">'+st.reps+' reps</span>'+(st.vol?'<span class="chip">'+fmtVol(st.vol)+' volume</span>':'')+'</div>'
   +s.exercises.map(e=>'<h4 class="mt">'+esc(e.name)+'</h4><div class="small">'+e.sets.filter(x=>x.done).map((x,i)=>'<div>Set '+(i+1)+': '+esc(setTxt(e,x))+'</div>').join('')+(e.notes?'<div class="muted">Note: '+esc(e.notes)+'</div>':'')+'</div>').join('')
   +'<form data-submit="saveNotes" data-id="'+s.id+'" class="mt"><label class="f" for="sn">Workout notes</label><textarea id="sn" name="notes" maxlength="600">'+esc(s.notes||'')+'</textarea><div class="mt-s"><button class="btn sm">Save notes</button></div></form></div>'
   +'<div class="mf"><button type="button" class="btn danger" data-act="delSession" data-id="'+s.id+'">'+ic('trash')+'Delete workout</button><button type="button" class="btn pri" data-act="closeModal">Close</button></div>'});
}
SUB.saveNotes=(f,fd)=>{const s=S.sessions.find(x=>x.id===f.dataset.id);if(!s)return;s.notes=String(fd.get('notes')).trim();save();toast('Notes saved','ok');redrawHist()};
ACT.delSession=async el=>{const s=S.sessions.find(x=>x.id===el.dataset.id);if(!s)return;
  if(await confirmDlg({title:'Delete this workout record?',msg:'“'+s.name+'” on '+fmtDate(s.date)+' will be permanently removed from your history, statistics and records.',ok:'Delete',danger:true})){S.sessions=S.sessions.filter(x=>x!==s);save();closeAllModals();refresh();toast('Workout deleted')}};

/* ---------- CALENDAR ---------- */
const CAL={view:'month',anchor:today(),sel:today()};
function dayTags(di){
  let t='';
  if(di.done.length)t+='<span class="tag done">✓ '+esc(di.done.length>1?di.done.length+' workouts':di.done[0].name)+'</span>';
  else if(di.missed)t+='<span class="tag miss">Missed</span>';
  else if(di.sched.length)t+='<span class="tag sch">'+esc(di.sched.length>1?di.sched.length+' planned':di.sched[0].name)+'</span>';
  else if(di.rest)t+='<span class="tag rest">Rest</span>';
  if(di.ms.length)t+='<span class="tag ms">★ '+(di.ms.length>1?di.ms.length:'Milestone')+'</span>';
  return '<span class="tags">'+t+'</span>';
}
function dayLabel(di){
  const p=[];if(di.done.length)p.push(plural(di.done.length,'workout')+' completed');if(di.missed)p.push('missed workout');if(!di.done.length&&di.sched.length&&!di.missed)p.push('scheduled: '+di.sched.map(w=>w.name).join(', '));if(di.rest&&!di.sched.length&&!di.done.length)p.push('rest day');if(di.ms.length)p.push(plural(di.ms.length,'milestone'));
  return fmtDateL(di.k)+(p.length?': '+p.join('; '):'');
}
function calDayPanel(k){
  const di=dayInfo(k),t=today();
  let h='<div class="card" id="cal-day" aria-live="polite"><h2>'+fmtDateL(k)+'</h2>';
  if(!di.done.length&&!di.sched.length&&!di.ms.length)h+=emptyState(di.rest?'Rest day':'Nothing here','No workouts scheduled or completed on this day.');
  if(di.done.length)h+='<h4 class="mt-s">Completed</h4><div class="list">'+di.done.map(s=>sessionRow(s)).join('')+'</div>';
  if(di.sched.length)h+='<h4 class="mt">'+(k<t?'Scheduled':'Scheduled workouts')+'</h4><div class="list">'+di.sched.map(w=>{const done=di.done.some(s=>s.workoutId===w.id);
    return '<div class="li" style="cursor:default"><span class="grow"><b>'+esc(w.name)+'</b><br><span class="small muted">'+plural(w.exercises.length,'exercise')+' · ~'+w.duration+' min'+(done?' · completed':di.missed?' · missed':'')+'</span></span>'+(k<=t&&!done?'<button type="button" class="btn sm '+(k===t?'pri':'')+'" data-act="startWorkout" data-kind="plan" data-id="'+w.id+'" data-date="'+k+'">'+ic('play')+(k===t?'Start':'Log this workout')+'</button>':'')+'</div>'}).join('')+'</div>';
  if(di.ms.length)h+='<h4 class="mt">Milestones</h4><ul style="margin:6px 0 0;padding-left:18px">'+di.ms.map(m=>'<li>'+esc(m.text)+'</li>').join('')+'</ul>';
  if(k<=t&&!di.sched.length)h+='<div class="mt"><button type="button" class="btn sm" data-act="startWorkout" data-kind="quick" data-date="'+k+'">'+ic('plus')+(k===t?'Start a quick workout':'Log a workout for this day')+'</button></div>';
  return h+'</div>';
}
ROUTES.calendar=()=>{
  const t=today(),a=CAL.anchor,ms=milestones();let h,title,body='';
  if(CAL.view==='month'){
    const first=monthStart(a),last=monthEnd(a),off=wd(first),total=Math.ceil((off+parseD(last).getDate())/7)*7;
    title=parseD(a).toLocaleDateString(undefined,{month:'long',year:'numeric'});
    body='<div class="cal" role="grid" aria-label="'+title+'">'+DAYS3.map(d=>'<div class="dow" role="columnheader">'+d+'</div>').join('');
    for(let i=0;i<total;i++){const k=addDays(first,i-off),di=dayInfo(k,ms),out=k<first||k>last;
      body+='<button type="button" class="cd'+(out?' out':'')+(k===t?' today':'')+(k===CAL.sel?' sel':'')+'" data-act="calSel" data-k="'+k+'" aria-label="'+esc(dayLabel(di))+'"'+(k===CAL.sel?' aria-current="date"':'')+'><span class="n">'+parseD(k).getDate()+'</span>'+(out?'':dayTags(di))+'</button>'}
    body+='</div>';
  }else{
    const ws=startOfWeek(a);title=fmtDate(ws,{day:'numeric',month:'short'})+' – '+fmtDate(addDays(ws,6),{day:'numeric',month:'short',year:'numeric'});
    body='<div class="stack">'+[0,1,2,3,4,5,6].map(i=>{const k=addDays(ws,i),di=dayInfo(k,ms);
      return '<button type="button" class="li card flat" style="padding:12px 14px'+(k===CAL.sel?';background:#E7F0E8':'')+'" data-act="calSel" data-k="'+k+'" aria-label="'+esc(dayLabel(di))+'"><span style="width:70px"><b>'+DAYS3[i]+'</b><br><span class="small muted">'+fmtDateS(k)+(k===t?' · today':'')+'</span></span><span class="grow">'+(di.done.length?di.done.map(s=>'<div><b>✓ '+esc(s.name)+'</b> <span class="muted small">'+fmtMin(s.duration)+'</span></div>').join(''):di.sched.length?di.sched.map(w=>'<div>'+esc(w.name)+(di.missed?' <span class="chip w">Missed</span>':'')+'</div>').join(''):di.rest?'<span class="muted">Rest day</span>':'<span class="muted">—</span>')+(di.ms.length?'<div class="small" style="color:#7A5A00">★ '+esc(di.ms.map(m=>m.text).join(' · '))+'</div>':'')+'</span></button>'}).join('')+'</div>';
  }
  // monthly stats
  const m0=monthStart(a),m1=monthEnd(a),ml=sessionsBetween(m0,m1);let sched=0,hit=0,missed=0;
  for(let k=m0;k<=m1&&k<=t;k=addDays(k,1)){if(k<S.profile.start)continue;const sc=scheduledOn(k);if(sc.length){sched++;if(sessionsOn(k).length)hit++;else if(k<t)missed++}}
  const stats='<div class="card"><h3>'+parseD(a).toLocaleDateString(undefined,{month:'long'})+' at a glance</h3><div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px">'
    +[['Workouts done',ml.length],['Active days',new Set(ml.map(s=>s.date)).size],['Training time',fmtMin(minutesOf(ml))],['Planned days',sched],['Missed',missed],['Completion',sched?Math.round(hit/sched*100)+'%':'–']].map(x=>'<div class="card flat stat" style="padding:10px 14px"><div class="l">'+x[0]+'</div><div class="v" style="font-size:21px">'+x[1]+'</div></div>').join('')+'</div></div>';
  h=pageHead('Fitness Calendar','Click a day to see its details.','<div class="tabs" role="group" aria-label="Calendar view"><button type="button" data-act="calView" data-v="month" aria-pressed="'+(CAL.view==='month')+'">Month</button><button type="button" data-act="calView" data-v="week" aria-pressed="'+(CAL.view==='week')+'">Week</button></div>');
  h+='<div class="row between wrap mb"><div class="row"><button type="button" class="icon-btn" data-act="calNav" data-d="-1" aria-label="Previous '+CAL.view+'">'+ic('chevL')+'</button><h2 style="min-width:190px;text-align:center" aria-live="polite">'+title+'</h2><button type="button" class="icon-btn" data-act="calNav" data-d="1" aria-label="Next '+CAL.view+'">'+ic('chevR')+'</button></div><button type="button" class="btn sm" data-act="calToday">Today</button></div>';
  h+='<div class="grid g-dash"><div class="card">'+body+'<div class="key mt"><span><span class="tag done">✓</span> Completed</span><span><span class="tag sch">Plan</span> Scheduled</span><span><span class="tag rest">Rest</span> Rest day</span><span><span class="tag miss">Missed</span></span><span><span class="tag ms">★</span> Milestone</span></div></div><div class="stack">'+calDayPanel(CAL.sel)+stats+'</div></div>';
  return h;
};
ACT.calSel=el=>{CAL.sel=el.dataset.k;if(CAL.view==='month'&&CAL.sel.slice(0,7)!==CAL.anchor.slice(0,7))CAL.anchor=CAL.sel;refresh();const b=$('[data-act="calSel"][data-k="'+CAL.sel+'"]');if(b)b.focus({preventScroll:true})};
ACT.calView=el=>{CAL.view=el.dataset.v;CAL.anchor=CAL.sel;refresh()};
ACT.calNav=el=>{const d=+el.dataset.d;if(CAL.view==='month'){const x=parseD(CAL.anchor);x.setDate(1);x.setMonth(x.getMonth()+d);CAL.anchor=dkey(x)}else CAL.anchor=addDays(CAL.anchor,7*d);CAL.sel=CAL.anchor;refresh()};
ACT.calToday=()=>{CAL.anchor=CAL.sel=today();refresh()};
