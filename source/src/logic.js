/* ===== Domain logic ===== */
function allEx(){return LIB.concat(S.customEx)}
function getEx(id){return allEx().find(e=>e.id===id)||{id,name:'Removed exercise',muscle:'Core',sec:[],equip:['none'],diff:'beginner',type:'strength',how:'This exercise is no longer in your library.',safe:'',mist:''}}
const isRepsType=t=>t==='strength'||t==='bodyweight';
function sortSessions(){S.sessions.sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:(a.startedAt||0)-(b.startedAt||0))}
function sessionsBetween(a,b){return S.sessions.filter(s=>s.date>=a&&s.date<=b)}
function sessionsOn(k){return S.sessions.filter(s=>s.date===k)}
function weekRange(k){const s=startOfWeek(k);return {start:s,end:addDays(s,6)}}
function minutesOf(list){return sum(list.map(s=>+s.duration||0))}

function sessStats(ss){
  let sets=0,reps=0,vol=0,exs=0;
  for(const e of ss.exercises){
    if(e.skipped)continue;const d=e.sets.filter(x=>x.done);if(!d.length)continue;exs++;sets+=d.length;
    for(const s of d){
      if(isRepsType(e.type))reps+=+s.reps||0;
      if(e.type==='strength'&&s.w>0)vol+=s.w*(+s.reps||0);
    }
  }
  return {exs,sets,reps,vol,min:+ss.duration||0};
}
function planTotals(){return {n:S.plan.length}}

/* ----- personal records ----- */
function computePRs(){
  const list=S.sessions.slice().sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:(a.startedAt||0)-(b.startedAt||0));
  const best={},events=[];
  for(const s of list)for(const e of s.exercises){
    if(e.skipped)continue;const ds=e.sets.filter(x=>x.done);if(!ds.length)continue;let rec=null;
    if(e.type==='strength'){
      const hv=ds.filter(x=>x.w>0);
      if(hv.length){const b=hv.reduce((m,x)=>(x.w>m.w||(x.w===m.w&&(x.reps||0)>(m.reps||0)))?x:m,hv[0]);rec={score:b.w,text:fmtU('w',b.w)+' × '+(b.reps||0),kind:'weight'}}
      else{const b=Math.max(...ds.map(x=>+x.reps||0));rec={score:b,text:b+' reps',kind:'reps'}}
    }else if(e.type==='bodyweight'){const b=Math.max(...ds.map(x=>+x.reps||0));rec={score:b,text:b+' reps',kind:'reps'}}
    else if(e.type==='timed'){const b=Math.max(...ds.map(x=>+x.dur||0));rec={score:b,text:fmtSecs(b),kind:'time'}}
    else{const dd=Math.max(...ds.map(x=>+x.dist||0));if(dd>0)rec={score:dd,text:fmtU('d',dd,2),kind:'dist'};else{const b=Math.max(...ds.map(x=>+x.dur||0));rec={score:b,text:fmtMin(b/60),kind:'time'}}}
    if(!rec||!(rec.score>0))continue;
    const prev=best[e.exId];
    const better=!prev||(rec.kind===prev.kind&&rec.score>prev.score)||(prev.kind==='reps'&&rec.kind==='weight');
    if(better){
      best[e.exId]=Object.assign({exId:e.exId,name:e.name,date:s.date,sessionId:s.id},rec);
      if(prev)events.push(Object.assign({},best[e.exId]));
    }
  }
  return {best,events};
}
function bestList(){const {best}=computePRs();return Object.values(best).sort((a,b)=>a.date<b.date?1:a.date>b.date?-1:0)}

/* ----- schedule helpers ----- */
function scheduledOn(k){const d=wd(k);return S.restDays[d]?[]:S.plan.filter(w=>w.day===d)}
function currentStreak(){
  const t=today(),firstS=S.sessions.length?S.sessions[0].date:t,minD=firstS<S.profile.start?firstS:S.profile.start;
  let streak=0,k=t;
  for(let i=0;i<400&&k>=minD;i++){
    if(S.sessions.some(s=>s.date===k))streak++;
    else if(k<t&&scheduledOn(k).length)break;
    k=addDays(k,-1);
  }
  return streak;
}
function milestones(){
  const m=[],{events}=computePRs();
  if(S.sessions.length)m.push({date:S.sessions[0].date,text:'First workout logged'});
  const seen={};events.forEach(e=>{const key=e.date;seen[key]=(seen[key]||0)+1});
  Object.keys(seen).forEach(d=>m.push({date:d,text:seen[d]===1?'New personal record':seen[d]+' new personal records'}));
  S.goals.forEach(g=>{if(g.completed&&g.completedOn)m.push({date:g.completedOn,text:'Goal reached: '+g.title})});
  S.challenges.forEach(c=>{if(c.completedOn)m.push({date:c.completedOn,text:'Challenge completed: '+c.name})});
  return m;
}
function dayInfo(k,ms){
  const t=today(),done=sessionsOn(k),sched=scheduledOn(k),rest=S.restDays[wd(k)];
  return {k,done,sched,rest,missed:k<t&&!done.length&&sched.length>0&&k>=S.profile.start,future:k>t,isToday:k===t,ms:(ms||milestones()).filter(x=>x.date===k)};
}

/* ----- progress entries ----- */
function metricEntries(key){return S.progress.filter(p=>p.metric===key).sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:(a.ts||0)-(b.ts||0))}
function latestMetric(key){const e=metricEntries(key);return e.length?e[e.length-1]:null}
function bestMetric(key){const e=metricEntries(key);if(!e.length)return null;const m=METRICS[key];return e.reduce((a,b)=>(m.best==='min'?b.value<a.value:b.value>a.value)?b:a,e[0])}
function trackedMetrics(group){return Object.keys(METRICS).filter(k=>METRICS[k].group===group&&S.settings.tracked[k]&&(group!=='body'||S.settings.trackBody))}

/* ----- goals / challenges ----- */
function goalProgress(g){
  const t=today();let pct=0,label='',reached=false;
  if(g.type==='weekly'){const w=weekRange(t),c=sessionsBetween(w.start,w.end).length;pct=c/g.target*100;label=c+' of '+g.target+' workouts this week';
    // weeks met since creation
    let met=0,tot=0,ws=startOfWeek(g.created||S.profile.start);while(ws<startOfWeek(t)){tot++;if(sessionsBetween(ws,addDays(ws,6)).length>=g.target)met++;ws=addDays(ws,7)}
    if(tot)label+=' · met in '+met+' of '+tot+' earlier weeks'}
  else if(g.type==='monthly'){const c=sessionsBetween(monthStart(t),monthEnd(t)).length;pct=c/g.target*100;label=c+' of '+g.target+' workouts this month'}
  else if(g.type==='minutes'){const w=weekRange(t);let c=0;for(let i=0;i<7;i++){const k=addDays(w.start,i);if(minutesOf(sessionsOn(k))>=g.target)c++}
    const need=g.days||7;pct=c/need*100;label=c+' of '+need+' days this week with '+g.target+'+ minutes'}
  else if(g.type==='total'){const c=S.sessions.filter(s=>s.date>=(g.created||'0000')).length;pct=c/g.target*100;label=c+' of '+g.target+' workouts since you set this goal'}
  else if(g.type==='streak'){const c=currentStreak();pct=c/g.target*100;label='Current streak: '+c+' of '+g.target+' workout days'}
  else if(g.type==='metric'){
    const m=METRICS[g.metric],ent=metricEntries(g.metric),cur=ent.length?ent[ent.length-1].value:null,s=g.start!=null?g.start:(ent.length?ent[0].value:0);
    if(cur==null){pct=0;label='No entries yet for '+m.label.toLowerCase()}
    else{pct=g.target===s?(cur>=g.target?100:0):(cur-s)/(g.target-s)*100;label='Now '+fmtMetric(g.metric,cur)+' · target '+fmtMetric(g.metric,g.target)}
  }else{pct=(g.current||0)/g.target*100;label=(g.current||0)+' of '+g.target+(g.unit?' '+g.unit:'')}
  pct=clamp(pct,0,100);reached=pct>=100;
  return {pct,label,reached};
}
function challengeProgress(c){
  const t=today(),end=addDays(c.start,c.days-1);let active=0;const cells=[];
  for(let i=0;i<c.days;i++){const k=addDays(c.start,i),done=sessionsOn(k).length>0;if(done)active++;
    cells.push({k,done,today:k===t,future:k>t,missed:k<t&&!done})}
  const pct=clamp(active/c.target*100,0,100);
  const state=c.completedOn||active>=c.target?'completed':t>end?'ended':t<c.start?'upcoming':'active';
  return {active,pct,cells,state,end,daysLeft:Math.max(0,diffDays(t,end)+1)};
}
function syncAuto(){
  let ch=false;
  S.challenges.forEach(c=>{if(!c.completedOn&&challengeProgress(c).active>=c.target){c.completedOn=today();ch=true}});
  if(ch)save();
}

/* ----- sessions ----- */
function lastPerf(exId){
  for(let i=S.sessions.length-1;i>=0;i--){const e=S.sessions[i].exercises.find(x=>x.exId===exId&&!x.skipped&&x.sets.some(s=>s.done));if(e)return e.sets.filter(s=>s.done)}
  return null;
}
function newWorkoutObj(o){return Object.assign({id:uid(),name:'',day:null,muscles:[],duration:45,notes:'',exercises:[]},o||{})}
function planEx(exId,o){const ex=getEx(exId);
  return Object.assign({id:uid(),exId,sets:ex.type==='cardio'?1:3,reps:isRepsType(ex.type)?10:null,weight:null,dur:ex.type==='timed'?30:ex.type==='cardio'?1200:null,dist:null,rest:S.settings.defaultRest},o||{})}
function tplFromSample(t){
  return {id:uid(),sample:true,key:t.name,name:t.name,level:t.level,muscles:t.muscles.slice(),duration:t.duration,notes:t.notes,day:null,
    exercises:t.ex.map(r=>({id:uid(),exId:r[0],sets:r[1],reps:r[2]||null,weight:null,dur:r[4]||null,dist:null,rest:r[3]}))};
}
function seedTemplates(){return SAMPLE_TEMPLATES.map(tplFromSample)}
function workoutFrom(src,day){return {id:uid(),name:src.name,day:day==null?null:day,muscles:src.muscles.slice(),duration:src.duration,notes:src.notes||'',exercises:src.exercises.map(e=>Object.assign({},e,{id:uid()}))}}
function estimateMin(exs){
  let s=0;for(const e of exs){const ex=getEx(e.exId),n=+e.sets||1;
    if(ex.type==='cardio')s+=(+e.dur||600)*n;else if(ex.type==='timed')s+=((+e.dur||30)+(+e.rest||30))*n;else s+=(45+(+e.rest||60))*n}
  return Math.max(5,Math.round(s/60/5)*5);
}
function buildSession(src,date){
  const exs=src.exercises.map(pe=>{
    const ex=getEx(pe.exId),last=lastPerf(pe.exId),sets=[];
    for(let i=0;i<(pe.sets||1);i++){
      const ls=last&&(last[i]||last[last.length-1]);
      let w=null;if(ex.type==='strength')w=pe.weight!=null?pe.weight:(ls&&ls.w>0?ls.w:null);
      sets.push({w,reps:isRepsType(ex.type)?(pe.reps||null):null,dur:(ex.type==='timed'||ex.type==='cardio')?(pe.dur||null):null,dist:ex.type==='cardio'?(pe.dist||null):null,done:false});
    }
    return {uid:uid(),exId:ex.id,name:ex.name,type:ex.type,skipped:false,notes:'',rest:pe.rest!=null?pe.rest:S.settings.defaultRest,sets};
  });
  return {id:uid(),workoutId:src.id||null,name:src.name||'Quick workout',muscles:(src.muscles||[]).slice(),startedAt:Date.now(),date:date||today(),exercises:exs,notes:''};
}
function activeStats(a){
  const tmp={exercises:a.exercises,duration:Math.max(0,Math.round((Date.now()-a.startedAt)/60000))};
  const st=sessStats(tmp);st.total=a.exercises.filter(e=>!e.skipped).length;
  st.setsAll=sum(a.exercises.filter(e=>!e.skipped).map(e=>e.sets.length));return st;
}
function matchEquip(ex){
  const eq=new Set(S.profile.equip);if(eq.has('full'))return true;
  if(ex.equip.includes('none'))return true;
  const need=ex.equip.filter(x=>x!=='other');
  if(need.length)return need.some(x=>x==='machines'?eq.has('machines'):eq.has(x));
  return eq.has('machines');
}

/* ----- starter plan (general examples only) ----- */
function starterPlan(){
  const p=S.profile,days=p.days.slice().sort(),eq=new Set(p.equip);
  const gym=eq.has('full')||eq.has('machines'),db=eq.has('dumbbells')||eq.has('kettlebells')||eq.has('barbell');
  let pool=gym?['Full Body Workout','Upper Body Workout','Lower Body Workout','Core Workout','Full Body Workout','Cardio and Core']
    :db?['Dumbbell Workout','Upper Body Workout','Lower Body Workout','Core Workout']:['Beginner Home Workout','Bodyweight Workout','Core Workout'];
  if(p.goal==='cardio')pool=['Cardio and Core'].concat(pool);
  S.plan=[];S.restDays=[0,1,2,3,4,5,6].map(d=>!days.includes(d));
  days.forEach((d,i)=>{const t=S.templates.find(x=>x.name===pool[i%pool.length]);if(t)S.plan.push(workoutFrom(t,d))});
}

/* ===== Demo data (entirely fictional) ===== */
function makeDemo(){
  const keep=S&&{units:S.settings.units,sound:S.settings.sound};
  const st=blankState(),t=today();
  st.meta.demo=true;st.meta.onboarded=true;
  st.profile={name:'Alex',age:29,level:'beginner',goal:'general',location:'home',days:[0,2,4,5],duration:45,equip:['none','dumbbells','bands'],start:addDays(t,-42)};
  st.settings.weeklyTarget=4;st.settings.trackBody=true;
  if(keep){st.settings.units=keep.units;st.settings.sound=keep.sound}
  const sset=S;S=st;
  st.templates=seedTemplates();
  st.restDays=[false,true,false,true,false,false,true];
  st.customEx=[{id:'c_demo1',custom:true,name:'Band Face Pull',muscle:'Shoulders',sec:['Back'],equip:['bands'],diff:'beginner',type:'bodyweight',how:'Anchor a resistance band at head height and pull the ends toward your face with elbows high, squeezing your shoulder blades together.',safe:'Use a light band and keep your neck relaxed.',mist:'Pulling with the arms only and letting the elbows drop.'}];
  st.fav=['goblet-squat','plank','pushups'];
  const W=(name,day,muscles,duration,notes,ex)=>({id:uid(),name,day,muscles,duration,notes,exercises:ex.map(r=>({id:uid(),exId:r[0],sets:r[1],reps:r[2]||null,weight:r[4]||null,dur:r[5]||null,dist:r[6]||null,rest:r[3]}))});
  st.plan=[
    W('Full Body Workout',0,['Full Body'],40,'Focus on slow, controlled reps.',[['goblet-squat',3,12,60,10],['pushups',3,8,60],['sa-db-row',3,10,60,10],['glute-bridge',3,12,45],['plank',3,0,45,null,30]]),
    W('Upper Body Workout',2,['Chest','Back','Shoulders','Arms'],45,'',[['pushups',3,10,60],['shoulder-press',3,10,60,6],['sa-db-row',3,10,60,10],['bicep-curl',3,12,45,6],['tricep-extension',3,12,45,6]]),
    W('Lower Body Workout',4,['Legs'],45,'',[['squats',3,15,60],['lunges',3,10,60,6],['rdl',3,10,60,10],['calf-raise',3,15,45],['glute-bridge',3,12,45]]),
    W('Cardio and Core',5,['Cardio','Core'],40,'Easy pace for the run — you should be able to talk.',[['running',1,0,0,null,1200,2.5],['dead-bug',3,10,45],['bicycle-crunches',3,16,45],['plank',3,0,45,null,40]])
  ];
  // seeded random so the demo is stable
  let seed=20240611;const rng=()=>{seed|=0;seed=seed+0x6D2B79F5|0;let x=Math.imul(seed^seed>>>15,1|seed);x=x+Math.imul(x^x>>>7,61|x)^x;return((x^x>>>14)>>>0)/4294967296};
  const notes=['Felt strong today.','A bit tired, kept the weights light.','Great session — added a rep on the last set.','','','','Focused on form.',''];
  for(let i=42;i>=1;i--){
    const k=addDays(t,-i),wk=st.plan.find(p=>p.day===wd(k));if(!wk)continue;
    if(i>6&&rng()<0.16)continue;                                   // missed some days on purpose
    const wi=Math.floor((42-i)/7),exs=wk.exercises.map(pe=>{
      const ex=getEx(pe.exId),sets=[];
      for(let j=0;j<pe.sets;j++){
        let s={w:null,reps:null,dur:null,dist:null,done:true};
        if(ex.type==='strength'){const base=pe.weight||0;s.w=base?base+Math.floor(wi/2):null;s.reps=Math.max(5,(pe.reps||10)-(j===pe.sets-1&&rng()<.6?1:0)+(!base?Math.floor(wi/2):0))}
        else if(ex.type==='bodyweight'){s.reps=Math.max(4,(pe.reps||10)+Math.floor(wi/2)-(j>0&&rng()<.4?1:0))}
        else if(ex.type==='timed'){s.dur=(pe.dur||30)+wi*3}
        else{s.dur=(pe.dur||1200)+Math.round(rng()*120);s.dist=Math.round(((pe.dist||2.5)*0.92+wi*0.06+rng()*0.1)*100)/100}
        sets.push(s);
      }
      return {uid:uid(),exId:ex.id,name:ex.name,type:ex.type,skipped:false,notes:'',rest:pe.rest,sets};
    });
    const base=parseD(k);base.setHours(18,0,0,0);
    st.sessions.push({id:uid(),workoutId:wk.id,name:wk.name,muscles:wk.muscles.slice(),startedAt:base.getTime(),date:k,duration:Math.round(wk.duration*(0.85+rng()*0.3)),exercises:exs,notes:notes[Math.floor(rng()*notes.length)]});
  }
  const P=(off,metric,value,note)=>st.progress.push({id:uid(),date:addDays(t,off),metric,value,note:note||'',ts:Date.now()+st.progress.length});
  [[-41,72.8],[-34,72.5],[-27,72.6],[-20,72.1],[-13,71.9],[-6,71.7],[-1,71.6]].forEach(x=>P(x[0],'weight',x[1]));
  [[-40,84.5],[-20,83.8],[-2,83.0]].forEach(x=>P(x[0],'waist',x[1]));
  [[-40,98.0],[-2,98.5]].forEach(x=>P(x[0],'chest',x[1]));[[-40,98.5],[-2,98.0]].forEach(x=>P(x[0],'hips',x[1]));
  [[-40,31.5],[-2,32.2]].forEach(x=>P(x[0],'arms',x[1]));[[-40,57.0],[-2,57.4]].forEach(x=>P(x[0],'thighs',x[1]));
  [[-40,8],[-26,10],[-12,12],[-3,14]].forEach(x=>P(x[0],'pushups',x[1]));
  [[-40,30],[-30,40],[-20,45],[-10,55],[-3,60]].forEach(x=>P(x[0],'plank',x[1]));
  [[-35,10],[-14,12],[-4,14]].forEach(x=>P(x[0],'squat',x[1],'Goblet squat'));
  [[-35,2.0],[-21,2.5],[-7,3.0]].forEach(x=>P(x[0],'runDist',x[1]));[[-35,17],[-21,20],[-7,24]].forEach(x=>P(x[0],'runTime',x[1]));
  st.goals=[
    {id:uid(),type:'weekly',title:'Complete 4 workouts every week',target:4,created:addDays(t,-42),targetDate:'',completed:false},
    {id:uid(),type:'metric',metric:'plank',title:'Improve plank duration to 90 seconds',target:90,start:30,created:addDays(t,-40),targetDate:addDays(t,30),completed:false},
    {id:uid(),type:'monthly',title:'Complete 16 workouts this month',target:16,created:addDays(t,-20),targetDate:monthEnd(t),completed:false},
    {id:uid(),type:'total',title:'Complete my first 10 workouts',target:10,created:addDays(t,-42),targetDate:'',completed:true,completedOn:addDays(t,-17)}
  ];
  st.challenges=[{id:uid(),name:'14-Day Consistency Challenge',days:14,target:8,start:addDays(t,-8),completedOn:''}];
  sortSessions.call(null);
  st.sessions.sort((a,b)=>a.date<b.date?-1:1);
  S=sset;
  return st;
}

/* ===== Backup / restore ===== */
function backupObj(){return {app:APP_ID,version:APP_VERSION,exportedAt:new Date().toISOString(),data:S}}
function validateBackup(o){
  if(!o||typeof o!=='object'||o.app!==APP_ID||!o.data||typeof o.data!=='object')return {ok:false,error:'This file is not a Workout Planner & Fitness Tracker backup (.json).'};
  const d=o.data;
  for(const k of ['sessions','plan','progress','goals','templates','customEx','challenges','fav']){if(d[k]!==undefined&&!Array.isArray(d[k]))return {ok:false,error:'The backup file looks damaged (invalid "'+k+'" section).'}}
  const dateOk=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s);
  const st=normalize(d);
  st.sessions=st.sessions.filter(s=>s&&dateOk(s.date)&&Array.isArray(s.exercises));
  st.progress=st.progress.filter(p=>p&&dateOk(p.date)&&METRICS[p.metric]&&isFinite(+p.value));
  st.plan=st.plan.filter(w=>w&&Array.isArray(w.exercises));
  st.templates=st.templates.filter(w=>w&&Array.isArray(w.exercises));
  st.meta.onboarded=!!st.meta.onboarded;
  if(!st.meta.onboarded&&(st.sessions.length||st.plan.length))st.meta.onboarded=true;
  return {ok:true,state:st};
}
