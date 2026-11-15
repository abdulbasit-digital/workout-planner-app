/* ===== Shell, router, dashboard, planner, editor, library, templates ===== */
const ROUTES={};
const NAV=[['dashboard','Dashboard','home'],['planner','Planner','week'],['session','Workout','play'],['library','Exercises','book'],['templates','Templates','layout'],['history','History','clock'],['progress','Progress','trend'],['calendar','Calendar','cal'],['goals','Goals','target'],['reports','Reports','chart'],['settings','Settings','gear'],['guide','Guide & About','info']];
const TITLES={dashboard:'Dashboard',planner:'Weekly Planner',session:'Workout Session',library:'Exercise Library',templates:'Workout Templates',history:'Workout History',progress:'Progress Tracker',calendar:'Fitness Calendar',goals:'Goals & Challenges',reports:'Reports & Statistics',settings:'Settings',edit:'Edit Workout'};
let lastRouteKey=null;

function currentRoute(){const h=location.hash.replace(/^#\/?/,'');const p=h.split('/').map(x=>{try{return decodeURIComponent(x)}catch(e){return x}});return {name:p[0]||'dashboard',args:p.slice(1)}}
function go(r){const t='#/'+r;if(location.hash===t)render();else location.hash=t}
window.addEventListener('hashchange',()=>{closeAllModals();render()});

function buildNav(){
  $('#sidenav').innerHTML=NAV.map(n=>'<a href="#/'+n[0]+'" data-nav="'+n[0]+'">'+ic(n[2])+'<span>'+n[1]+'</span>'+(n[0]==='session'?'<i class="dot hide" id="sess-dot" title="Workout in progress"></i>':'')+'</a>').join('');
  const b=[['dashboard','Home','home'],['planner','Plan','week'],['session','Workout','play'],['progress','Progress','trend']];
  $('#bottomnav').innerHTML=b.map(n=>'<a href="#/'+n[0]+'" data-nav="'+n[0]+'">'+ic(n[2])+'<span>'+n[1]+'</span></a>').join('')+'<button type="button" data-act="moreMenu" aria-label="More pages">'+ic('dots')+'<span>More</span></button>';
}
ACT.moreMenu=()=>{
  const rest=NAV.filter(n=>!['dashboard','planner','session','progress'].includes(n[0]));
  modal({title:'More',html:'<div class="mb"><div class="list">'+rest.map(n=>'<a class="li" href="#/'+n[0]+'" style="text-decoration:none;color:inherit">'+ic(n[2])+'<b>'+n[1]+'</b></a>').join('')+'<button type="button" class="li" data-act="safety">'+ic('shield')+'<b>Safety information</b></button></div></div>'});
};
function renderShellBits(){
  const r=currentRoute();
  $$('[data-nav]').forEach(a=>{if(a.dataset.nav===r.name||(r.name==='edit'&&a.dataset.nav===(r.args[0]==='template'?'templates':'planner')))a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')});
  const d=$('#sess-dot');if(d)d.classList.toggle('hide',!S.active);renderUserBits();
  $('#ttl').textContent=TITLES[r.name]||'';
  document.title=(TITLES[r.name]||'Dashboard')+' · Workout Planner & Fitness Tracker';
  renderDock();
}
function render(keep){
  if(!S)return;
  const gate=$('#gate'),shell=$('#shell');
  if(MODE==='auth'){shell.hidden=true;gate.hidden=false;renderAuth();return}
  if(!S.meta.onboarded){shell.hidden=true;gate.hidden=false;if(typeof renderGate==='function')renderGate();return}
  gate.hidden=true;shell.hidden=false;
  renderShellBits();renderView(keep);
}
function renderView(keep){
  const r=currentRoute(),R=ROUTES[r.name]||ROUTES.dashboard,key=r.name+'/'+r.args.join('/'),y=window.scrollY,view=$('#view');
  CH=[];
  let html;try{html=R(r.args)}catch(e){console.error(e);html='<div class="card"><div class="empty"><b>This page could not be displayed</b>'+esc(e.message)+'</div></div>'}
  if(html===null)return;
  view.innerHTML=html;drawCharts();lastCW=view.clientWidth;
  if(!keep||lastRouteKey!==key){window.scrollTo(0,0);if(lastRouteKey!==key&&lastRouteKey!==undefined&&lastRouteKey!==null&&lastRouteKey!=='')try{$('#main').focus({preventScroll:true})}catch(e){}}else window.scrollTo(0,y);
  lastRouteKey=key;
}
const refresh=()=>{renderShellBits();renderView(true)};

/* ---------- shared helpers ---------- */
const chips=a=>(a||[]).map(m=>'<span class="chip">'+esc(m)+'</span>').join(' ');
function pageHead(title,sub,right){return '<div class="page-h"><div><h1>'+esc(title)+'</h1>'+(sub?'<p>'+sub+'</p>':'')+'</div><div class="row wrap">'+(right||'')+'</div></div>'}
function emptyState(t,msg,btn){return '<div class="empty"><b>'+esc(t)+'</b>'+(msg?'<div>'+msg+'</div>':'')+(btn?'<div class="mt">'+btn+'</div>':'')+'</div>'}
function sessionRow(s,act){
  const st=sessStats(s);
  return '<button type="button" class="li" data-act="viewSession" data-id="'+s.id+'"><span class="num">'+ic('check')+'</span><span class="grow"><b>'+esc(s.name)+'</b><br><span class="small muted">'+fmtDate(s.date,{weekday:'short',day:'numeric',month:'short'})+' · '+fmtMin(s.duration)+' · '+plural(st.sets,'set')+'</span></span>'+ic('chevR')+'</button>';
}
const exLine=e=>{const ex=getEx(e.exId);const t=ex.type;
  return esc(ex.name)+' <span class="muted">· '+(t==='cardio'?fmtMin((e.dur||0)/60):t==='timed'?e.sets+'×'+fmtSecs(e.dur||0):e.sets+'×'+(e.reps||'–')+(e.weight?' @ '+fmtU('w',e.weight):''))+'</span>'};

/* ---------- DASHBOARD ---------- */
const greeting=()=>{const h=new Date().getHours();return h<12?'Good morning':h<18?'Good afternoon':'Good evening'};
function backupAgeDays(){return S.meta.lastBackup?Math.floor((Date.now()-S.meta.lastBackup)/864e5):null}
ROUTES.dashboard=()=>{
  const p=S.profile,t=today(),wk=weekRange(t),weekS=sessionsBetween(wk.start,wk.end),target=Math.max(1,S.settings.weeklyTarget||1);
  const total=S.sessions.length,mins=minutesOf(S.sessions),streak=currentStreak(),pct=Math.round(Math.min(100,weekS.length/target*100));
  const wLatest=S.settings.trackBody&&S.settings.tracked.weight?latestMetric('weight'):null;
  const msg=MOTIVATION[(Math.floor(parseD(t)/864e5))%MOTIVATION.length];
  let h='';
  if(DB.mode==='memory')h+='<div class="banner err" role="alert">'+ic('info')+'<div class="grow"><b>Saving is unavailable in this browser window.</b> Your data will be lost when you close it. Try a normal (non-private) window, and export a backup from Settings.</div></div>';
  if(MODE==='demo')h+='<div class="banner info">'+ic('info')+'<div class="grow"><b>Free demo.</b> “Alex” and all activity here are fictional sample data. Nothing is saved, and backup, restore, CSV and print are switched off.</div><button type="button" class="btn sm pri" data-act="exitDemo">Create my account</button></div>';
  else{const age=backupAgeDays();if(total>=3&&(age==null?(diffDays(S.sessions[0].date,t)>=7):age>=30))h+='<div class="banner warn">'+ic('download')+'<div class="grow"><b>Time for a backup.</b> '+(age==null?'You have not exported a backup yet.':'Your last backup was '+age+' days ago.')+' Backups protect your data if you clear your browser.</div><button type="button" class="btn sm" data-act="exportBackup">Export backup</button></div>'}
  h+='<div class="hero"><div><div class="row wrap gap-s"><span class="chip">'+esc(GOALS[p.goal]||'General fitness')+'</span><span class="chip">'+esc(DIFFS[p.level]||'Beginner')+'</span></div><h1 class="mt-s">'+greeting()+(p.name?', '+esc(p.name):'')+'</h1><p>'+esc(msg)+'</p></div><div class="date">'+fmtDateL(t)+'</div></div>';
  h+='<div class="stats" style="--n:'+(wLatest?6:5)+'">'
    +stat('This week',weekS.length+'<small> / '+target+'</small>','workouts completed','check')
    +stat('Total workouts',total,'all time','dumb')
    +stat('Current streak',streak+'<small> '+(streak===1?'day':'days')+'</small>','planned rest days do not break it','flame')
    +stat('Training time',fmtMin(mins),'all time','clock')
    +stat('Weekly target',target+'<small> workouts</small>','change in Settings','target')
    +(wLatest?stat('Current weight',fmtNum(toDisp('w',wLatest.value))+'<small> '+uName('w')+'</small>','as of '+fmtDate(wLatest.date,{day:'numeric',month:'short'}),'trend'):'')+'</div>';
  // today's workout
  h+='<div class="grid g-dash mt">'+todayCard(t)+weekCard(t,wk,weekS,target,pct)+'</div>';
  // charts
  const weeks=[];for(let i=7;i>=0;i--){const s=addDays(wk.start,-7*i),l=sessionsBetween(s,addDays(s,6));weeks.push({l:fmtDateS(s),v:l.length,m:minutesOf(l),tip:'Week of '+fmtDate(s)+': '+l.length+' workouts, '+minutesOf(l)+' min'})}
  h+='<div class="grid g2 mt"><div class="card"><h3>Workout frequency</h3><p class="small muted">Workouts per week, last 8 weeks</p>'+chartHost(w=>barChart(w,{data:weeks.map(x=>({l:x.l,v:x.v,tip:x.tip})),h:200,target:target,targetLabel:'Weekly target'}),200,'Bar chart of workouts per week for the last 8 weeks')+'</div>'
    +'<div class="card"><h3>Training time</h3><p class="small muted">Minutes per week, last 8 weeks</p>'+(mins?chartHost(w=>lineChart(w,{pts:weeks.map((x,i)=>({x:i,y:x.m,tip:x.tip})),labels:weeks.map(x=>x.l),zero:true,h:200}),200,'Line chart of training minutes per week'):emptyState('No training time yet','Finish a workout and your minutes will appear here.'))+'</div></div>';
  // PRs + recent
  const prs=bestList().slice(0,5),recent=S.sessions.slice(-5).reverse();
  h+='<div class="grid g2 mt"><div class="card"><div class="row between"><h3>Personal records</h3><a class="small" href="#/reports">See all</a></div>'
    +(prs.length?'<div class="list">'+prs.map(r=>'<div class="li" style="cursor:default"><span class="num">'+ic('star')+'</span><span class="grow"><b>'+esc(r.name)+'</b><br><span class="small muted">'+fmtDate(r.date,{day:'numeric',month:'short'})+'</span></span><b>'+esc(r.text)+'</b></div>').join('')+'</div>':emptyState('No records yet','Your best sets will show up here once you log workouts.'))+'</div>'
    +'<div class="card"><div class="row between"><h3>Recent workouts</h3><a class="small" href="#/history">View history</a></div>'
    +(recent.length?'<div class="list">'+recent.map(s=>sessionRow(s)).join('')+'</div>':emptyState('No workouts logged yet','Start your first workout to build your history.','<a class="btn pri" href="#/session">Start a workout</a>'))+'</div></div>';
  return h;
};
function stat(l,v,s,icon){return '<div class="card stat"><div class="l">'+(icon?ic(icon,'" style="width:15px;height:15px'):'')+l+'</div><div class="v">'+v+'</div><div class="s">'+s+'</div></div>'}
function todayCard(t){
  const d=wd(t),rest=S.restDays[d],list=S.plan.filter(w=>w.day===d),doneToday=sessionsOn(t);
  let h='<div class="card"><div class="row between wrap"><h2>Today’s workout</h2><span class="chip">'+DAYS[d]+'</span></div>';
  if(S.active)h+='<div class="today mt"><div><b style="font-size:17px">'+esc(S.active.name)+'</b><div class="muted small">Workout in progress · started '+new Date(S.active.startedAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})+'</div></div><a class="btn pri lg" href="#/session">'+ic('play')+'Resume workout</a></div>';
  else if(rest&&!list.length)h+='<div class="empty" style="padding:20px 8px">'+ic('moon','" style="width:30px;height:30px;color:#64748B')+'<b class="mt-s">Rest day</b>Recovery is part of the plan. Enjoy some light movement if you like.<div class="mt"><a class="btn" href="#/session">Start a workout anyway</a></div></div>';
  else if(!list.length)h+=emptyState('Nothing planned for today','Add a workout to your weekly plan, or start a quick session.','<a class="btn" href="#/planner">Open planner</a> <a class="btn pri" href="#/session">Start a workout</a>');
  else h+=list.map(w=>{const done=doneToday.some(s=>s.workoutId===w.id);
    return '<div class="today mt"><div class="grow"><b style="font-size:18px">'+esc(w.name)+'</b>'+(done?' <span class="chip g">'+ic('check','" style="width:13px;height:13px')+' Done today</span>':'')
      +'<div class="mt-s">'+chips(w.muscles)+'</div><div class="small muted mt-s">'+plural(w.exercises.length,'exercise')+' · about '+w.duration+' min</div>'
      +'<ul class="exlist">'+w.exercises.slice(0,4).map(e=>'<li>'+exLine(e)+'</li>').join('')+(w.exercises.length>4?'<li>+ '+(w.exercises.length-4)+' more</li>':'')+'</ul></div>'
      +'<button type="button" class="btn pri lg" data-act="startWorkout" data-kind="plan" data-id="'+w.id+'">'+ic('play')+(done?'Do it again':'Start workout')+'</button></div>'}).join('<hr>');
  return h+'</div>';
}
function weekCard(t,wk,weekS,target,pct){
  let days='<div class="row between mt" style="gap:4px">';
  for(let i=0;i<7;i++){const k=addDays(wk.start,i),di=dayInfo(k,[]);
    const st=di.done.length?'done':di.rest?'rest':di.sched.length?(k<t?'miss':'sch'):'';
    const sym=st==='done'?ic('check','" style="width:16px;height:16px'):st==='rest'?ic('moon','" style="width:14px;height:14px'):st==='miss'?'!':st==='sch'?'•':'';
    const col=st==='done'?'background:var(--accent-d);color:var(--onp)':st==='miss'?'background:var(--warn-l);color:var(--warn-d)':st==='sch'?'border:2px solid var(--accent);color:var(--accent-d)':'background:var(--gray);color:var(--secondary)';
    days+='<div class="center" style="flex:1"><div class="xs muted">'+DAYS3[i]+'</div><div style="margin:4px auto 0;width:32px;height:32px;border-radius:50%;display:grid;place-items:center;font-weight:700;'+col+(k===t?';outline:2px solid var(--primary);outline-offset:2px':'')+'" role="img" aria-label="'+DAYS[i]+': '+(st==='done'?'workout completed':st==='rest'?'rest day':st==='miss'?'missed':st==='sch'?'scheduled':'no plan')+'">'+sym+'</div></div>'}
  days+='</div>';
  return '<div class="card"><h2>Weekly progress</h2><div class="row gap-l mt-s" style="flex-wrap:wrap">'+ring(pct,112,pct+' percent of weekly target')+'<div><div style="font-size:22px;font-weight:700">'+weekS.length+' of '+target+'</div><div class="muted small">workouts this week</div><div class="small mt-s">'+(weekS.length>=target?'Weekly target reached. Nice work!':plural(target-weekS.length,'workout')+' to go')+'</div></div></div>'+days+'</div>';
}
ACT.viewSession=el=>sessionDetail(el.dataset.id);

/* ---------- START WORKOUT (shared) ---------- */
function startWorkout(src,date){
  const begin=()=>{S.active=buildSession(src,date);save();go('session')};
  if(S.active){
    modal({title:'A workout is already in progress',html:'<div class="mb"><p><b>'+esc(S.active.name)+'</b> is still open. You can resume it, or discard it and start the new one.</p></div><div class="mf"><button type="button" class="btn" data-act="closeModal">Cancel</button><button type="button" class="btn danger" id="disc-new">Discard &amp; start new</button><button type="button" class="btn pri" id="res-old" autofocus>Resume current</button></div>'});
    $('#res-old').onclick=()=>{closeModal();go('session')};
    $('#disc-new').onclick=()=>{closeModal();begin()};
    return;
  }
  begin();
}
ACT.startWorkout=el=>{
  const k=el.dataset.kind,id=el.dataset.id,date=el.dataset.date||today();
  if(k==='plan'){const w=S.plan.find(x=>x.id===id);if(w)startWorkout(w,date)}
  else if(k==='tpl'){const w=S.templates.find(x=>x.id===id);if(w)startWorkout(w,date)}
  else startWorkout({name:'Quick workout',exercises:[],muscles:[]},date);
};

/* ---------- PLANNER ---------- */
function wkCard(w){
  const opts='<option value="" selected disabled>Move to…</option>'+DAYS.map((d,i)=>i===w.day?'':'<option value="'+i+'">'+d+'</option>').join('')+(w.day==null?'':'<option value="none">Unscheduled</option>');
  return '<div class="wk"><b>'+esc(w.name)+'</b><div class="small muted">'+plural(w.exercises.length,'exercise')+' · ~'+w.duration+' min</div><div class="mt-s">'+chips(w.muscles)+'</div>'
   +'<div class="acts"><button type="button" class="icon-btn" data-act="startWorkout" data-kind="plan" data-id="'+w.id+'" title="Start workout" aria-label="Start '+esc(w.name)+'">'+ic('play')+'</button>'
   +'<a class="icon-btn" href="#/edit/workout/'+w.id+'" title="Edit workout" aria-label="Edit '+esc(w.name)+'">'+ic('edit')+'</a>'
   +'<button type="button" class="icon-btn" data-act="dupWorkout" data-id="'+w.id+'" title="Duplicate" aria-label="Duplicate '+esc(w.name)+'">'+ic('copy')+'</button>'
   +'<button type="button" class="icon-btn" data-act="saveAsTpl" data-id="'+w.id+'" title="Save as template" aria-label="Save '+esc(w.name)+' as a template">'+ic('layout')+'</button>'
   +'<button type="button" class="icon-btn dng" data-act="delWorkout" data-id="'+w.id+'" title="Delete" aria-label="Delete '+esc(w.name)+'">'+ic('trash')+'</button></div>'
   +'<label class="sr" for="mv-'+w.id+'">Move '+esc(w.name)+' to another day</label><select id="mv-'+w.id+'" data-chg="moveWorkout" data-id="'+w.id+'">'+opts+'</select></div>';
}
ROUTES.planner=()=>{
  const t=today(),td=wd(t),planned=S.plan.filter(w=>w.day!=null).length,restN=S.restDays.filter(Boolean).length,un=S.plan.filter(w=>w.day==null);
  let h=pageHead('Weekly Planner','Plan your week. '+plural(planned,'workout')+' scheduled · '+plural(restN,'rest day')+' · weekly target '+S.settings.weeklyTarget+'.',
    '<button type="button" class="btn" data-act="addFromTpl">'+ic('layout')+'From template</button><a class="btn pri" href="#/edit/workout/new">'+ic('plus')+'New workout</a>');
  h+='<div class="week">';
  for(let i=0;i<7;i++){
    const ws=S.plan.filter(w=>w.day===i),rest=S.restDays[i];
    h+='<section class="day'+(i===td?' today':'')+(rest?' rest':'')+'" aria-label="'+DAYS[i]+'"><h3><span>'+DAYS[i]+(i===td?' <span class="chip g">Today</span>':'')+'</span>'
      +'<button type="button" class="icon-btn" data-act="toggleRest" data-d="'+i+'" aria-pressed="'+rest+'" title="'+(rest?'Remove rest day':'Mark as rest day')+'" aria-label="'+(rest?'Unmark '+DAYS[i]+' as a rest day':'Mark '+DAYS[i]+' as a rest day')+'">'+ic('moon')+'</button></h3>'
      +(rest?'<div class="small muted">Rest day</div>':'')+ws.map(wkCard).join('')
      +(rest?'':'<a class="btn sm ghost" href="#/edit/workout/new/'+i+'">'+ic('plus')+'Add workout</a>')+'</section>';
  }
  h+='</div>';
  h+='<div class="card mt"><h3>Unscheduled workouts</h3>'+(un.length?'<div class="grid g-auto">'+un.map(wkCard).join('')+'</div>':'<p class="muted small">Workouts that are not assigned to a day appear here. Use “Move to…” to schedule them.</p>')+'</div>';
  return h;
};
ACT.toggleRest=el=>{
  const d=+el.dataset.d;
  if(!S.restDays[d]&&S.plan.some(w=>w.day===d)){toast('Move or delete the workouts on '+DAYS[d]+' before marking it as a rest day.','err');return}
  S.restDays[d]=!S.restDays[d];save();refresh();
};
CHG.moveWorkout=async el=>{
  const w=S.plan.find(x=>x.id===el.dataset.id);if(!w)return;const v=el.value==='none'?null:+el.value;
  if(v!=null&&S.restDays[v]){if(!await confirmDlg({title:'Move to a rest day?',msg:DAYS[v]+' is marked as a rest day. Moving this workout will turn it into a training day.',ok:'Move workout'})){refresh();return}S.restDays[v]=false}
  w.day=v;save();refresh();toast('Moved to '+(v==null?'unscheduled':DAYS[v]),'ok');
};
ACT.dupWorkout=el=>{const w=S.plan.find(x=>x.id===el.dataset.id);if(!w)return;const c=workoutFrom(w,w.day);c.name=w.name+' (copy)';S.plan.push(c);save();refresh();toast('Workout duplicated','ok')};
ACT.delWorkout=async el=>{const w=S.plan.find(x=>x.id===el.dataset.id);if(!w)return;
  if(await confirmDlg({title:'Delete workout?',msg:'“'+w.name+'” will be removed from your plan. Your workout history is not affected.',ok:'Delete',danger:true})){S.plan=S.plan.filter(x=>x!==w);save();refresh();toast('Workout deleted')}};
ACT.saveAsTpl=el=>{
  const w=S.plan.find(x=>x.id===el.dataset.id);if(!w)return;
  modal({title:'Save as template',html:'<form data-submit="saveTpl" data-id="'+w.id+'"><div class="mb"><div class="field"><label class="f" for="tpn">Template name</label><input id="tpn" name="name" type="text" required maxlength="80" value="'+esc(w.name)+'" autofocus></div><p class="small muted">A copy of this workout is saved in your templates. Your planned workout is not changed.</p></div><div class="mf"><button type="button" class="btn" data-act="closeModal">Cancel</button><button class="btn pri">Save template</button></div></form>'});
};
SUB.saveTpl=(f,fd)=>{const w=S.plan.find(x=>x.id===f.dataset.id);if(!w)return;const name=String(fd.get('name')).trim();if(!name)return;
  const t=workoutFrom(w,null);t.name=name;t.level='Any';t.sample=false;S.templates.push(t);save();closeModal();toast('Saved to Templates','ok')};
ACT.addFromTpl=()=>{
  modal({title:'Add a workout from a template',html:'<form data-submit="addTplToPlan"><div class="mb"><div class="field"><label class="f" for="atp">Template</label><select id="atp" name="tpl" required>'+S.templates.map(t=>'<option value="'+t.id+'">'+esc(t.name)+(t.level&&t.level!=='Any'?' ('+t.level+')':'')+'</option>').join('')+'</select></div><div class="field"><label class="f" for="atd">Day</label><select id="atd" name="day"><option value="none">Unscheduled</option>'+DAYS.map((d,i)=>'<option value="'+i+'">'+d+'</option>').join('')+'</select></div><p class="small muted">A copy is added to your plan so you can change it freely.</p></div><div class="mf"><button type="button" class="btn" data-act="closeModal">Cancel</button><button class="btn pri">Add to plan</button></div></form>'});
};
SUB.addTplToPlan=async(f,fd)=>{
  const t=S.templates.find(x=>x.id===fd.get('tpl'));if(!t)return;const d=fd.get('day')==='none'?null:+fd.get('day');
  if(d!=null&&S.restDays[d]){if(!await confirmDlg({title:'Schedule on a rest day?',msg:DAYS[d]+' is marked as a rest day. Adding a workout will make it a training day.',ok:'Add workout'}))return;S.restDays[d]=false}
  S.plan.push(workoutFrom(t,d));save();closeAllModals();refresh();toast('Added “'+t.name+'” to your plan','ok');
};

/* ---------- EDITOR (workouts & templates) ---------- */
let DRAFT=null;
function initDraft(kind,id,day){
  const key=kind+':'+id+':'+(day==null?'':day);
  if(DRAFT&&DRAFT.key===key)return true;
  let data;
  if(id==='new'){data=newWorkoutObj({day:day!=null&&day!==''?+day:null});if(kind==='template'){data.level='Beginner'}}
  else{const src=(kind==='workout'?S.plan:S.templates).find(x=>x.id===id);if(!src)return false;data=clone(src)}
  DRAFT={kind,id,key,data,isNew:id==='new'};return true;
}
ROUTES.edit=args=>{
  const kind=args[0]==='template'?'template':'workout';
  if(!initDraft(kind,args[1]||'new',args[2])){toast('That workout could not be found.','err');setTimeout(()=>go(kind==='template'?'templates':'planner'),0);return null}
  const d=DRAFT.data,isT=kind==='template',est=estimateMin(d.exercises);
  let h=pageHead((DRAFT.isNew?'New ':'Edit ')+(isT?'template':'workout'),'Changes are saved when you press Save.','<button type="button" class="btn" data-act="cancelDraft">Cancel</button><button type="button" class="btn pri" data-act="saveDraft">'+ic('check')+'Save '+(isT?'template':'workout')+'</button>');
  h+='<div class="card"><div class="fgrid">'
   +'<div class="field"><label class="f" for="d-name">Name</label><input id="d-name" type="text" data-inp="dfield" data-f="name" maxlength="80" value="'+esc(d.name)+'" placeholder="e.g. Upper Body Workout" required></div>'
   +(isT?'<div class="field"><label class="f" for="d-level">Level</label><select id="d-level" data-chg="dfieldc" data-f="level">'+['Beginner','Intermediate','Advanced','Any'].map(l=>'<option'+(d.level===l?' selected':'')+'>'+l+'</option>').join('')+'</select></div>'
     :'<div class="field"><label class="f" for="d-day">Workout day</label><select id="d-day" data-chg="dfieldc" data-f="day"><option value="">Unscheduled</option>'+DAYS.map((x,i)=>'<option value="'+i+'"'+(d.day===i?' selected':'')+'>'+x+'</option>').join('')+'</select></div>')
   +'<div class="field"><label class="f" for="d-dur">Duration (minutes)</label><input id="d-dur" type="number" min="5" max="300" step="5" inputmode="numeric" data-inp="dfield" data-f="duration" value="'+esc(d.duration||'')+'"><div class="hint">Estimated from your exercises: ~'+est+' min · <button type="button" class="lnk" style="color:var(--accent-d);text-decoration:underline" data-act="useEst">use estimate</button></div></div>'
   +'<div class="field"><label class="f" id="mg-l">Muscle groups</label><div class="row wrap gap-s" role="group" aria-labelledby="mg-l">'+WORKOUT_MUSCLES.map(m=>'<button type="button" class="chip" data-act="dMuscle" data-m="'+m+'" aria-pressed="'+d.muscles.includes(m)+'">'+m+'</button>').join('')+'</div></div></div>'
   +'<div class="field"><label class="f" for="d-notes">Notes</label><textarea id="d-notes" data-inp="dfield" data-f="notes" maxlength="500" placeholder="Optional: cues, equipment, reminders">'+esc(d.notes)+'</textarea></div>'
   +(DRAFT.isNew&&!d.exercises.length&&S.templates.length?'<div class="field"><label class="f" for="d-tpl">Start from a template</label><select id="d-tpl" data-chg="loadTpl"><option value="">Choose a template (optional)…</option>'+S.templates.map(t=>'<option value="'+t.id+'">'+esc(t.name)+'</option>').join('')+'</select></div>':'')
   +'</div>';
  h+='<div class="card mt"><div class="row between wrap"><h2>Exercises <span class="muted small">('+d.exercises.length+')</span></h2><button type="button" class="btn" data-act="addEx">'+ic('plus')+'Add exercises</button></div>';
  if(!d.exercises.length)h+=emptyState('No exercises yet','Add exercises from the library to build this '+(isT?'template':'workout')+'.','<button type="button" class="btn pri" data-act="addEx">'+ic('plus')+'Add exercises</button>');
  else h+=d.exercises.map((e,i)=>exRowEdit(e,i,d.exercises.length)).join('');
  h+='</div><div class="row mt wrap" style="justify-content:flex-end"><button type="button" class="btn" data-act="cancelDraft">Cancel</button><button type="button" class="btn pri" data-act="saveDraft">'+ic('check')+'Save '+(isT?'template':'workout')+'</button></div>';
  h+='<p class="small muted mt">'+(isT?'Templates are general fitness examples, not individualized medical or professional training prescriptions.':'Choose exercises that suit your ability. Stop if you feel pain or dizziness.')+'</p>';
  return h;
};
function exRowEdit(e,i,n){
  const ex=getEx(e.exId),t=ex.type,inp=(f,lab,val,extra)=>'<div><label for="x'+i+f+'">'+lab+'</label><input id="x'+i+f+'" type="number" inputmode="decimal" step="any" min="0" data-inp="dx" data-i="'+i+'" data-f="'+f+'" value="'+esc(val)+'" '+(extra||'')+'></div>';
  let f='';
  if(t==='strength')f=inp('sets','Sets',e.sets,'step="1" min="1"')+inp('reps','Reps',e.reps==null?'':e.reps,'step="1"')+inp('weight','Weight ('+uName('w')+')',inVal('w',e.weight))+inp('rest','Rest (s)',e.rest==null?'':e.rest,'step="5"');
  else if(t==='bodyweight')f=inp('sets','Sets',e.sets,'step="1" min="1"')+inp('reps','Reps',e.reps==null?'':e.reps,'step="1"')+inp('rest','Rest (s)',e.rest==null?'':e.rest,'step="5"');
  else if(t==='timed')f=inp('sets','Sets',e.sets,'step="1" min="1"')+inp('dur','Seconds',e.dur==null?'':e.dur,'step="5"')+inp('rest','Rest (s)',e.rest==null?'':e.rest,'step="5"');
  else f=inp('dur','Minutes',e.dur==null?'':+(e.dur/60).toFixed(1))+inp('dist','Distance ('+uName('d')+')',inVal('d',e.dist));
  return '<div class="exrow"><span class="num">'+(i+1)+'</span><div><b>'+esc(ex.name)+'</b> <span class="chip">'+esc(ex.muscle)+'</span><div class="mini">'+f+'</div></div>'
    +'<div class="row" style="gap:0"><button type="button" class="icon-btn" data-act="dxMove" data-i="'+i+'" data-dir="-1" aria-label="Move '+esc(ex.name)+' up"'+(i===0?' disabled':'')+'>'+ic('up')+'</button><button type="button" class="icon-btn" data-act="dxMove" data-i="'+i+'" data-dir="1" aria-label="Move '+esc(ex.name)+' down"'+(i===n-1?' disabled':'')+'>'+ic('down')+'</button><button type="button" class="icon-btn dng" data-act="dxDel" data-i="'+i+'" aria-label="Remove '+esc(ex.name)+'">'+ic('trash')+'</button></div></div>';
}
INP.dfield=el=>{const f=el.dataset.f;DRAFT.data[f]=f==='duration'?(num(el.value)||0):el.value};
CHG.dfieldc=el=>{const f=el.dataset.f;DRAFT.data[f]=f==='day'?(el.value===''?null:+el.value):el.value};
CHG.loadTpl=el=>{const t=S.templates.find(x=>x.id===el.value);if(!t)return;
  const d=DRAFT.data;d.exercises=clone(t.exercises).map(e=>Object.assign(e,{id:uid()}));if(!d.name)d.name=t.name;d.muscles=t.muscles.slice();d.duration=t.duration;if(!d.notes)d.notes=t.notes||'';refresh()};
INP.dx=el=>{
  const e=DRAFT.data.exercises[+el.dataset.i];if(!e)return;const f=el.dataset.f,v=num(el.value),t=getEx(e.exId).type;
  if(f==='sets')e.sets=Math.max(1,Math.round(v||1));else if(f==='reps')e.reps=v==null?null:Math.round(v);
  else if(f==='weight')e.weight=v==null||v===0?null:fromDisp('w',v);else if(f==='dur')e.dur=v==null?null:(t==='cardio'?Math.round(v*60):Math.round(v));
  else if(f==='dist')e.dist=v==null||v===0?null:fromDisp('d',v);else if(f==='rest')e.rest=v==null?0:Math.round(v);
};
ACT.useEst=()=>{DRAFT.data.duration=estimateMin(DRAFT.data.exercises);refresh()};
ACT.dMuscle=el=>{const m=el.dataset.m,a=DRAFT.data.muscles,i=a.indexOf(m);if(i<0)a.push(m);else a.splice(i,1);el.setAttribute('aria-pressed',String(i<0))};
ACT.dxMove=el=>{const i=+el.dataset.i,j=i+ +el.dataset.dir,a=DRAFT.data.exercises;if(j<0||j>=a.length)return;[a[i],a[j]]=[a[j],a[i]];refresh()};
ACT.dxDel=el=>{DRAFT.data.exercises.splice(+el.dataset.i,1);refresh()};
ACT.addEx=()=>openPicker(id=>{DRAFT.data.exercises.push(planEx(id));refresh()},()=>DRAFT.data.exercises.map(e=>e.exId));
ACT.cancelDraft=()=>{const k=DRAFT&&DRAFT.kind;DRAFT=null;go(k==='template'?'templates':'planner')};
ACT.saveDraft=async()=>{
  const d=DRAFT.data;d.name=(d.name||'').trim();
  if(!d.name){toast('Please give the workout a name.','err');$('#d-name').classList.add('bad');$('#d-name').focus();return}
  if(!d.exercises.length){toast('Add at least one exercise first.','err');return}
  if(!d.duration||d.duration<1)d.duration=estimateMin(d.exercises);
  if(DRAFT.kind==='workout'&&d.day!=null&&S.restDays[d.day]){
    if(!await confirmDlg({title:'Schedule on a rest day?',msg:DAYS[d.day]+' is marked as a rest day. Saving will make it a training day.',ok:'Save workout'}))return;S.restDays[d.day]=false}
  const list=DRAFT.kind==='workout'?S.plan:S.templates,i=list.findIndex(x=>x.id===DRAFT.id);
  const out=clone(d);if(i>=0){out.id=DRAFT.id;out.sample=list[i].sample;out.key=list[i].key;list[i]=out}else{out.id=uid();out.sample=false;list.push(out)}
  const k=DRAFT.kind;DRAFT=null;save();toast('Saved','ok');go(k==='template'?'templates':'planner');
};

/* ---------- EXERCISE PICKER (modal) ---------- */
function openPicker(onAdd,usedFn){
  const st={q:'',m:'',e:'',mine:false};let added=0;
  const ov=modal({title:'Add exercises',size:'wide',html:'<div class="mb"><div class="fgrid c3"><div class="field"><label class="f" for="pk-q">Search</label><input id="pk-q" type="search" placeholder="Search exercises" autofocus></div><div class="field"><label class="f" for="pk-m">Muscle group</label><select id="pk-m"><option value="">All</option>'+MUSCLES.map(m=>'<option>'+m+'</option>').join('')+'</select></div><div class="field"><label class="f" for="pk-e">Equipment</label><select id="pk-e"><option value="">All</option>'+Object.keys(EQUIP).map(k=>'<option value="'+k+'">'+EQUIP[k]+'</option>').join('')+'</select></div></div><label class="row small" style="margin-bottom:8px"><input type="checkbox" id="pk-mine"> Only exercises that match my equipment</label><div id="pk-list" class="list" style="max-height:46vh;overflow:auto" tabindex="0" aria-label="Exercise results"></div></div><div class="mf"><span class="muted small grow" id="pk-count" aria-live="polite"></span><button type="button" class="btn pri" data-act="closeModal">Done</button></div>'});
  const draw=()=>{
    const q=st.q.toLowerCase(),used=usedFn?usedFn():[];
    const l=allEx().filter(e=>(!q||(e.name+' '+e.muscle+' '+e.sec.join(' ')).toLowerCase().includes(q))&&(!st.m||e.muscle===st.m)&&(!st.e||e.equip.includes(st.e))&&(!st.mine||matchEquip(e)));
    $('#pk-list',ov).innerHTML=l.length?l.map(e=>'<div class="li" style="cursor:default"><span class="grow"><b>'+esc(e.name)+(e.custom?' <span class="chip g">Custom</span>':'')+'</b><br><span class="small muted">'+esc(e.muscle)+' · '+e.equip.map(k=>EQUIP[k]).join(', ')+' · '+DIFFS[e.diff]+'</span></span>'+(used.includes(e.id)?'<span class="chip g">Added</span> ':'')+'<button type="button" class="btn sm" data-pk="'+e.id+'" aria-label="Add '+esc(e.name)+'">'+ic('plus')+'Add</button></div>').join(''):emptyState('No exercises match','Try clearing a filter, or add a custom exercise on the Exercises page.');
  };
  $('#pk-q',ov).oninput=e=>{st.q=e.target.value;draw()};$('#pk-m',ov).onchange=e=>{st.m=e.target.value;draw()};$('#pk-e',ov).onchange=e=>{st.e=e.target.value;draw()};$('#pk-mine',ov).onchange=e=>{st.mine=e.target.checked;draw()};
  $('#pk-list',ov).onclick=e=>{const b=e.target.closest('[data-pk]');if(!b)return;onAdd(b.dataset.pk);added++;$('#pk-count',ov).textContent=plural(added,'exercise')+' added';draw();const nb=$('[data-pk="'+b.dataset.pk+'"]',ov);if(nb)nb.focus()};
  draw();
}

/* ---------- EXERCISE LIBRARY ---------- */
const LIBF={q:'',m:'',e:'',d:'',t:'',fav:false,mine:false};
function libFiltered(){
  const q=LIBF.q.trim().toLowerCase();
  return allEx().filter(e=>(!q||(e.name+' '+e.muscle+' '+e.sec.join(' ')).toLowerCase().includes(q))&&(!LIBF.m||e.muscle===LIBF.m)&&(!LIBF.e||e.equip.includes(LIBF.e))&&(!LIBF.d||e.diff===LIBF.d)&&(!LIBF.t||e.type===LIBF.t)&&(!LIBF.fav||S.fav.includes(e.id))&&(!LIBF.mine||matchEquip(e)))
   .sort((a,b)=>MUSCLES.indexOf(a.muscle)-MUSCLES.indexOf(b.muscle)||a.name.localeCompare(b.name));
}
function libList(){
  const l=libFiltered();
  return '<p class="small muted" id="lib-count" aria-live="polite">'+plural(l.length,'exercise')+(l.length!==allEx().length?' match your filters':'')+'</p>'+(l.length?'<div class="grid g-auto">'+l.map(e=>{const f=S.fav.includes(e.id);
    return '<div class="exc"><div class="row between" style="align-items:flex-start"><h3><button type="button" class="lnk" data-act="exDetail" data-id="'+e.id+'">'+esc(e.name)+'</button></h3><button type="button" class="icon-btn fav" data-act="favEx" data-id="'+e.id+'" aria-pressed="'+f+'" aria-label="'+(f?'Remove '+esc(e.name)+' from favourites':'Add '+esc(e.name)+' to favourites')+'">'+ic('star')+'</button></div>'
     +'<div class="meta"><span class="chip g">'+esc(e.muscle)+'</span><span class="chip">'+DIFFS[e.diff]+'</span>'+(e.custom?'<span class="chip w">Custom</span>':'')+'</div><div class="small muted">'+e.equip.map(k=>EQUIP[k]).join(' · ')+'</div></div>'}).join('')+'</div>'
   :emptyState('No exercises found','Try a different search or clear the filters.','<button type="button" class="btn" data-act="libClear">Clear filters</button>'));
}
ROUTES.library=()=>{
  const sel=(id,f,label,opts)=>'<div class="field" style="margin:0"><label class="f" for="'+id+'">'+label+'</label><select id="'+id+'" data-chg="libf" data-f="'+f+'"><option value="">All</option>'+opts.map(o=>'<option value="'+o[0]+'"'+(LIBF[f]===o[0]?' selected':'')+'>'+o[1]+'</option>').join('')+'</select></div>';
  return pageHead('Exercise Library','Search '+allEx().length+' exercises, mark favourites and add your own.','<button type="button" class="btn pri" data-act="customEx">'+ic('plus')+'Add custom exercise</button>')
   +'<div class="card"><div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr));align-items:end"><div class="field" style="margin:0"><label class="f" for="lib-q">Search</label><input id="lib-q" type="search" data-inp="libq" placeholder="Search by name or muscle" value="'+esc(LIBF.q)+'"></div>'
   +sel('lib-m','m','Muscle group',MUSCLES.map(m=>[m,m]))+sel('lib-e','e','Equipment',Object.keys(EQUIP).map(k=>[k,EQUIP[k]]))+sel('lib-d','d','Difficulty',Object.keys(DIFFS).map(k=>[k,DIFFS[k]]))+sel('lib-t','t','Type',[['strength','Strength'],['bodyweight','Bodyweight'],['timed','Timed'],['cardio','Cardio']])+'</div>'
   +'<div class="row wrap mt"><label class="row small"><input type="checkbox" data-chg="libf" data-f="fav"'+(LIBF.fav?' checked':'')+'> Favourites only</label><label class="row small"><input type="checkbox" data-chg="libf" data-f="mine"'+(LIBF.mine?' checked':'')+'> Match my equipment</label><button type="button" class="btn sm ghost" data-act="libClear">Clear filters</button></div></div>'
   +'<div class="mt" id="lib-list">'+libList()+'</div><p class="small muted mt">Exercise information is general guidance for planning your own workouts. It is not professional or medical instruction.</p>';
};
const redrawLib=()=>{const l=$('#lib-list');if(l)l.innerHTML=libList()};
INP.libq=el=>{LIBF.q=el.value;redrawLib()};
CHG.libf=el=>{const f=el.dataset.f;LIBF[f]=el.type==='checkbox'?el.checked:el.value;redrawLib()};
ACT.libClear=()=>{Object.assign(LIBF,{q:'',m:'',e:'',d:'',t:'',fav:false,mine:false});refresh()};
ACT.favEx=el=>{const id=el.dataset.id,i=S.fav.indexOf(id);if(i<0)S.fav.push(id);else S.fav.splice(i,1);save();
  if($('#lib-list'))redrawLib();else{el.setAttribute('aria-pressed',String(i<0))}
  const dm=$('#fav-detail');if(dm)dm.setAttribute('aria-pressed',String(i<0))};
ACT.exDetail=el=>{
  const e=getEx(el.dataset.id),f=S.fav.includes(e.id);
  modal({title:e.name,size:'wide',html:'<div class="mb"><div class="row wrap gap-s"><span class="chip g">'+esc(e.muscle)+'</span><span class="chip">'+DIFFS[e.diff]+'</span><span class="chip">'+({strength:'Strength',bodyweight:'Bodyweight',timed:'Timed',cardio:'Cardio'}[e.type])+'</span>'+(e.custom?'<span class="chip w">Custom</span>':'')+'</div>'
   +'<dl class="detail"><dt>Secondary muscles</dt><dd>'+(e.sec.length?esc(e.sec.join(', ')):'None listed')+'</dd><dt>Equipment required</dt><dd>'+e.equip.map(k=>EQUIP[k]).join(', ')+'</dd><dt>How to do it</dt><dd>'+esc(e.how||'—')+'</dd><dt>Safety tips</dt><dd>'+esc(e.safe||'—')+'</dd><dt>Common mistakes</dt><dd>'+esc(e.mist||'—')+'</dd></dl>'
   +'<p class="small muted mt">General guidance only, not professional or medical instruction. Stop if you feel pain, dizziness or unusual symptoms.</p></div><div class="mf">'
   +(e.custom?'<button type="button" class="btn danger" data-act="delCustomEx" data-id="'+e.id+'">'+ic('trash')+'Delete</button><button type="button" class="btn" data-act="customEx" data-id="'+e.id+'">'+ic('edit')+'Edit</button>':'')
   +'<button type="button" class="btn" id="fav-detail" data-act="favEx" data-id="'+e.id+'" aria-pressed="'+f+'">'+ic('star')+'Favourite</button><button type="button" class="btn pri" data-act="closeModal">Close</button></div>'});
};
ACT.customEx=el=>{
  const id=el.dataset&&el.dataset.id,e=id?S.customEx.find(x=>x.id===id):null;
  if(MODALS.length&&id)closeModal();
  modal({title:e?'Edit custom exercise':'Add custom exercise',size:'wide',html:'<form data-submit="customEx" data-id="'+(e?e.id:'')+'"><div class="mb"><div class="fgrid"><div class="field"><label class="f" for="ce-n">Exercise name</label><input id="ce-n" name="name" type="text" required maxlength="80" value="'+esc(e?e.name:'')+'" autofocus></div>'
   +'<div class="field"><label class="f" for="ce-m">Target muscle group</label><select id="ce-m" name="muscle">'+MUSCLES.map(m=>'<option'+(e&&e.muscle===m?' selected':'')+'>'+m+'</option>').join('')+'</select></div>'
   +'<div class="field"><label class="f" for="ce-s">Secondary muscles</label><input id="ce-s" name="sec" type="text" placeholder="e.g. Triceps, Core" value="'+esc(e?e.sec.join(', '):'')+'"><div class="hint">Separate with commas (optional)</div></div>'
   +'<div class="field"><label class="f" for="ce-t">Exercise type</label><select id="ce-t" name="type">'+Object.keys(TYPES).map(k=>'<option value="'+k+'"'+(e&&e.type===k?' selected':'')+'>'+TYPES[k]+'</option>').join('')+'</select></div>'
   +'<div class="field"><label class="f" for="ce-d">Difficulty</label><select id="ce-d" name="diff">'+Object.keys(DIFFS).map(k=>'<option value="'+k+'"'+(e&&e.diff===k?' selected':'')+'>'+DIFFS[k]+'</option>').join('')+'</select></div></div>'
   +'<fieldset style="border:0;padding:0;margin:0 0 14px"><legend class="f" style="font-size:13px;font-weight:600;margin-bottom:6px">Equipment required</legend><div class="row wrap">'+Object.keys(EQUIP).map(k=>'<label class="row small"><input type="checkbox" name="equip" value="'+k+'"'+(e?(e.equip.includes(k)?' checked':''):(k==='none'?' checked':''))+'> '+EQUIP[k]+'</label>').join('')+'</div></fieldset>'
   +'<div class="field"><label class="f" for="ce-h">Short instructions</label><textarea id="ce-h" name="how" maxlength="600">'+esc(e?e.how:'')+'</textarea></div><div class="fgrid"><div class="field"><label class="f" for="ce-sa">Safety tips</label><textarea id="ce-sa" name="safe" maxlength="400">'+esc(e?e.safe:'')+'</textarea></div><div class="field"><label class="f" for="ce-mi">Common mistakes</label><textarea id="ce-mi" name="mist" maxlength="400">'+esc(e?e.mist:'')+'</textarea></div></div></div>'
   +'<div class="mf"><button type="button" class="btn" data-act="closeModal">Cancel</button><button class="btn pri">Save exercise</button></div></form>'});
};
SUB.customEx=(f,fd)=>{
  const name=String(fd.get('name')).trim();if(!name){toast('Please enter a name.','err');return}
  const id=f.dataset.id,dupe=allEx().find(x=>x.name.toLowerCase()===name.toLowerCase()&&x.id!==id);if(dupe){toast('An exercise with that name already exists.','err');return}
  const equip=fd.getAll('equip');const obj={id:id||'c_'+uid(),custom:true,name,muscle:fd.get('muscle'),sec:String(fd.get('sec')).split(',').map(s=>s.trim()).filter(Boolean),equip:equip.length?equip:['none'],diff:fd.get('diff'),type:fd.get('type'),how:String(fd.get('how')).trim(),safe:String(fd.get('safe')).trim(),mist:String(fd.get('mist')).trim()};
  const i=S.customEx.findIndex(x=>x.id===id);if(i>=0)S.customEx[i]=obj;else S.customEx.push(obj);
  save();closeAllModals();refresh();toast('Exercise saved','ok');
};
ACT.delCustomEx=async el=>{
  const e=S.customEx.find(x=>x.id===el.dataset.id);if(!e)return;
  if(!await confirmDlg({title:'Delete custom exercise?',msg:'“'+e.name+'” will also be removed from your planned workouts and templates. Past workout history keeps its record.',ok:'Delete',danger:true}))return;
  S.customEx=S.customEx.filter(x=>x!==e);S.fav=S.fav.filter(x=>x!==e.id);S.plan.concat(S.templates).forEach(w=>{w.exercises=w.exercises.filter(x=>x.exId!==e.id)});
  save();closeAllModals();refresh();toast('Exercise deleted');
};

/* ---------- TEMPLATES ---------- */
let TPLF='all';
ROUTES.templates=()=>{
  const missing=SAMPLE_TEMPLATES.filter(s=>!S.templates.some(t=>t.key===s.name)).length;
  const list=S.templates.filter(t=>TPLF==='all'||(TPLF==='mine'?!t.sample:(t.level||'').toLowerCase()===TPLF));
  let h=pageHead('Workout Templates','Reusable routines. Sample routines are general fitness examples, not individualized medical or professional training prescriptions.','<a class="btn pri" href="#/edit/template/new">'+ic('plus')+'New template</a>');
  h+='<div class="row between wrap mb"><div class="tabs" role="group" aria-label="Filter templates">'+[['all','All'],['beginner','Beginner'],['intermediate','Intermediate'],['advanced','Advanced'],['mine','My templates']].map(x=>'<button type="button" data-act="tplFilter" data-f="'+x[0]+'" aria-pressed="'+(TPLF===x[0])+'">'+x[1]+'</button>').join('')+'</div>'+(missing?'<button type="button" class="btn sm" data-act="restoreTpl">Restore '+plural(missing,'starter template')+'</button>':'')+'</div>';
  h+=list.length?'<div class="grid g-auto">'+list.map(t=>'<div class="card"><div class="row between wrap"><h3>'+esc(t.name)+'</h3>'+(t.level&&t.level!=='Any'?'<span class="chip '+(t.level==='Beginner'?'g':t.level==='Intermediate'?'w':'d')+'">'+t.level+'</span>':'')+'</div><div class="mt-s">'+chips(t.muscles)+(t.sample?' <span class="chip">Sample</span>':'')+'</div><div class="small muted mt-s">'+plural(t.exercises.length,'exercise')+' · ~'+t.duration+' min</div>'
    +'<ul class="exlist">'+t.exercises.slice(0,4).map(e=>'<li>'+exLine(e)+'</li>').join('')+(t.exercises.length>4?'<li>+ '+(t.exercises.length-4)+' more</li>':'')+'</ul>'
    +'<div class="row wrap gap-s mt"><button type="button" class="btn pri sm" data-act="startWorkout" data-kind="tpl" data-id="'+t.id+'">'+ic('play')+'Start</button><button type="button" class="btn sm" data-act="tplToPlan" data-id="'+t.id+'">Add to plan</button><a class="icon-btn" href="#/edit/template/'+t.id+'" title="Edit" aria-label="Edit '+esc(t.name)+'">'+ic('edit')+'</a><button type="button" class="icon-btn" data-act="dupTpl" data-id="'+t.id+'" title="Duplicate" aria-label="Duplicate '+esc(t.name)+'">'+ic('copy')+'</button><button type="button" class="icon-btn dng" data-act="delTpl" data-id="'+t.id+'" title="Delete" aria-label="Delete '+esc(t.name)+'">'+ic('trash')+'</button></div></div>').join('')+'</div>'
    :'<div class="card">'+emptyState('No templates here','Save a workout as a template from the Planner, or create one from scratch.','<a class="btn pri" href="#/edit/template/new">New template</a>')+'</div>';
  return h;
};
ACT.tplFilter=el=>{TPLF=el.dataset.f;refresh()};
ACT.restoreTpl=()=>{let n=0;SAMPLE_TEMPLATES.forEach(s=>{if(!S.templates.some(t=>t.key===s.name)){S.templates.push(tplFromSample(s));n++}});save();refresh();toast('Restored '+plural(n,'template'),'ok')};
ACT.dupTpl=el=>{const t=S.templates.find(x=>x.id===el.dataset.id);if(!t)return;const c=clone(t);c.id=uid();c.name=t.name+' (copy)';c.sample=false;c.key=undefined;c.exercises.forEach(e=>e.id=uid());S.templates.push(c);save();refresh();toast('Template duplicated','ok')};
ACT.delTpl=async el=>{const t=S.templates.find(x=>x.id===el.dataset.id);if(!t)return;
  if(await confirmDlg({title:'Delete template?',msg:'“'+t.name+'” will be deleted. Workouts already in your plan are not affected.'+(t.sample?' You can restore starter templates later.':''),ok:'Delete',danger:true})){S.templates=S.templates.filter(x=>x!==t);save();refresh();toast('Template deleted')}};
ACT.tplToPlan=el=>{
  const t=S.templates.find(x=>x.id===el.dataset.id);if(!t)return;
  modal({title:'Add “'+t.name+'” to your plan',html:'<form data-submit="addTplToPlan"><input type="hidden" name="tpl" value="'+t.id+'"><div class="mb"><div class="field"><label class="f" for="tp-d">Day</label><select id="tp-d" name="day" autofocus><option value="none">Unscheduled</option>'+DAYS.map((d,i)=>'<option value="'+i+'">'+d+'</option>').join('')+'</select></div><p class="small muted">A copy is added to your plan so you can change it freely.</p></div><div class="mf"><button type="button" class="btn" data-act="closeModal">Cancel</button><button class="btn pri">Add to plan</button></div></form>'});
};
