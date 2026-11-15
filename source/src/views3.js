/* ===== Progress, goals, reports, settings, onboarding, startup ===== */

/* ---------- PROGRESS ---------- */
const PRG={metric:null};
function metricCard(k){
  const m=METRICS[k],ent=metricEntries(k),last=ent[ent.length-1],prev=ent[ent.length-2];
  let sub='No entries yet';
  if(last){
    sub=fmtDate(last.date,{day:'numeric',month:'short'});
    if(prev){const d=metricToDisp(k,last.value)-metricToDisp(k,prev.value);sub+=' · '+(d>0?'+':d<0?'−':'±')+fmtNum(Math.abs(d),m.u==='d'?2:1)+' since previous'}
  }
  const b=m.best&&ent.length?bestMetric(k):null;
  return '<button type="button" class="card stat" style="text-align:left;cursor:pointer'+(PRG.metric===k?';border-color:#7C9A83;box-shadow:0 0 0 2px rgba(124,154,131,.35)':'')+'" data-act="selMetric" data-k="'+k+'" aria-pressed="'+(PRG.metric===k)+'"><div class="l">'+m.label+'</div><div class="v" style="font-size:22px">'+(last?fmtMetric(k,last.value):'–')+'</div><div class="s">'+sub+'</div>'+(b?'<div class="s">Best: '+fmtMetric(k,b.value)+'</div>':'')+'</button>';
}
ROUTES.progress=()=>{
  const body=trackedMetrics('body'),perf=trackedMetrics('perf'),all=body.concat(perf);
  if(!PRG.metric||!all.includes(PRG.metric))PRG.metric=all[0]||null;
  let h=pageHead('Progress Tracker','Log measurements and performance over time. These numbers are for your own reference only.','<button type="button" class="btn" data-act="chooseMetrics">'+ic('gear')+'Choose what to track</button><button type="button" class="btn pri" data-act="addEntry">'+ic('plus')+'Add entry</button>');
  if(!S.settings.trackBody)h+='<div class="banner info">'+ic('info')+'<div class="grow"><b>Body measurements are optional and currently off.</b> Turn them on if you would like to record weight, chest, waist, hips, arms or thighs.</div><button type="button" class="btn sm" data-act="enableBody">Turn on</button></div>';
  if(!all.length)return h+'<div class="card">'+emptyState('Nothing selected to track','Choose which measurements and records you would like to follow.','<button type="button" class="btn pri" data-act="chooseMetrics">Choose what to track</button>')+'</div>';
  if(body.length)h+='<h3 class="mb">Body measurements</h3><div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(180px,1fr))">'+body.map(metricCard).join('')+'</div>';
  if(perf.length)h+='<h3 class="mb mt-l">Fitness performance</h3><div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(180px,1fr))">'+perf.map(metricCard).join('')+'</div>';
  const k=PRG.metric,m=METRICS[k],ent=metricEntries(k);
  h+='<div class="card mt-l"><div class="row between wrap"><div><h2>'+m.label+'</h2><p class="small muted">'+(m.hint||'Measured in '+metricUnitLabel(k))+' · unit: '+metricUnitLabel(k)+'</p></div><button type="button" class="btn sm" data-act="addEntry" data-k="'+k+'">'+ic('plus')+'Add '+m.label.toLowerCase()+' entry</button></div>';
  if(!ent.length)h+=emptyState('No entries yet','Add your first '+m.label.toLowerCase()+' entry to start a chart.','<button type="button" class="btn pri" data-act="addEntry" data-k="'+k+'">Add entry</button>');
  else{
    h+=ent.length>=2?chartHost(w=>lineChart(w,{pts:ent.map(e=>({x:parseD(e.date).getTime(),y:metricToDisp(k,e.value),tip:fmtDate(e.date)+': '+fmtMetric(k,e.value)})),labels:ent.map(e=>fmtDateS(e.date)),h:210}),210,m.label+' over time'):'<p class="muted small">Add one more entry to see a chart.</p>';
    if(ent.length>=2)h+='<div class="card flat mt" style="background:#FAFBFC"><h4>Compare two entries</h4><div class="row wrap mt-s"><label class="small" for="cmp-a">From</label><select id="cmp-a" data-chg="cmp" style="width:auto">'+ent.map((e,i)=>'<option value="'+i+'"'+(i===0?' selected':'')+'>'+fmtDate(e.date)+' · '+fmtMetric(k,e.value)+'</option>').join('')+'</select><label class="small" for="cmp-b">To</label><select id="cmp-b" data-chg="cmp" style="width:auto">'+ent.map((e,i)=>'<option value="'+i+'"'+(i===ent.length-1?' selected':'')+'>'+fmtDate(e.date)+' · '+fmtMetric(k,e.value)+'</option>').join('')+'</select></div><p class="mt-s" id="cmp-out" aria-live="polite">'+cmpText(k,0,ent.length-1)+'</p></div>';
    h+='<div class="tbl-wrap mt"><table><thead><tr><th>Date</th><th>Value</th><th>Note</th><th><span class="sr">Actions</span></th></tr></thead><tbody>'+ent.slice().reverse().map(e=>'<tr><td>'+fmtDate(e.date)+'</td><td><b>'+fmtMetric(k,e.value)+'</b></td><td class="muted">'+esc(e.note||'')+'</td><td style="text-align:right;white-space:nowrap"><button type="button" class="icon-btn" data-act="editEntry" data-id="'+e.id+'" aria-label="Edit entry from '+fmtDate(e.date)+'">'+ic('edit')+'</button><button type="button" class="icon-btn dng" data-act="delEntry" data-id="'+e.id+'" aria-label="Delete entry from '+fmtDate(e.date)+'">'+ic('trash')+'</button></td></tr>').join('')+'</tbody></table></div>';
  }
  h+='</div>';
  // PRs
  const pr=bestList();
  h+='<div class="card mt-l"><h2>Personal records</h2><p class="small muted">Best results from your logged workouts and your performance entries.</p>'
   +(pr.length||perf.some(p=>metricEntries(p).length)?'<div class="tbl-wrap"><table><thead><tr><th>Record</th><th>Best</th><th>Date</th></tr></thead><tbody>'+perf.filter(p=>metricEntries(p).length).map(p=>{const b=bestMetric(p);return '<tr><td><b>'+METRICS[p].label+'</b> <span class="chip">Entry</span></td><td>'+fmtMetric(p,b.value)+'</td><td>'+fmtDate(b.date)+'</td></tr>'}).join('')+pr.map(r=>'<tr><td><b>'+esc(r.name)+'</b> <span class="chip g">Workout</span></td><td>'+esc(r.text)+'</td><td>'+fmtDate(r.date)+'</td></tr>').join('')+'</tbody></table></div>':emptyState('No records yet','Records appear after you log workouts or performance entries.'))+'</div>';
  return h;
};
function cmpText(k,i,j){const ent=metricEntries(k),a=ent[i],b=ent[j];if(!a||!b)return '';if(i===j)return 'Choose two different entries to compare.';
  const m=METRICS[k],d=metricToDisp(k,b.value)-metricToDisp(k,a.value),pct=a.value?(b.value-a.value)/a.value*100:0;
  return 'Change from '+fmtDate(a.date,{day:'numeric',month:'short'})+' to '+fmtDate(b.date,{day:'numeric',month:'short'})+': <b>'+(d>0?'+':d<0?'−':'±')+fmtNum(Math.abs(d),m.u==='d'?2:1)+' '+(m.u==='reps'?'reps':m.u==='sec'?'sec':m.u==='min'?'min':uName(m.u))+'</b> ('+(pct>0?'+':pct<0?'−':'')+fmtNum(Math.abs(pct),1)+'%)'}
CHG.cmp=()=>{const k=PRG.metric,a=+$('#cmp-a').value,b=+$('#cmp-b').value;$('#cmp-out').innerHTML=cmpText(k,a,b)};
ACT.selMetric=el=>{PRG.metric=el.dataset.k;refresh()};
ACT.enableBody=()=>{S.settings.trackBody=true;save();refresh()};
ACT.chooseMetrics=()=>{
  const grp=g=>Object.keys(METRICS).filter(k=>METRICS[k].group===g).map(k=>'<label class="row small" style="padding:4px 0"><input type="checkbox" name="m" value="'+k+'"'+(S.settings.tracked[k]?' checked':'')+'> '+METRICS[k].label+'</label>').join('');
  modal({title:'Choose what to track',html:'<form data-submit="chooseMetrics"><div class="mb"><label class="switch"><span><b>Track body measurements</b><br><span class="small muted">Optional. Off by default. Measurements are never judged or scored.</span></span><input type="checkbox" name="body"'+(S.settings.trackBody?' checked':'')+'></label><h4 class="mt">Body measurements</h4>'+grp('body')+'<h4 class="mt">Fitness performance</h4>'+grp('perf')+'</div><div class="mf"><button type="button" class="btn" data-act="closeModal">Cancel</button><button class="btn pri">Save</button></div></form>'});
};
SUB.chooseMetrics=(f,fd)=>{const sel=fd.getAll('m');Object.keys(METRICS).forEach(k=>S.settings.tracked[k]=sel.includes(k));S.settings.trackBody=!!fd.get('body');save();closeModal();refresh()};
function entryModal(e,preK){
  const keys=trackedMetrics('body').concat(trackedMetrics('perf'));if(e&&!keys.includes(e.metric))keys.push(e.metric);
  if(!keys.length){toast('Choose at least one measurement to track first.','err');return ACT.chooseMetrics()}
  const k0=e?e.metric:(preK&&keys.includes(preK)?preK:(PRG.metric&&keys.includes(PRG.metric)?PRG.metric:keys[0]));
  modal({title:e?'Edit entry':'Add progress entry',html:'<form data-submit="entry" data-id="'+(e?e.id:'')+'"><div class="mb"><div class="field"><label class="f" for="en-m">Measurement</label><select id="en-m" name="metric" data-chg="entryMetric">'+keys.map(k=>'<option value="'+k+'"'+(k===k0?' selected':'')+'>'+METRICS[k].label+'</option>').join('')+'</select></div><div class="fgrid"><div class="field"><label class="f" for="en-d">Date</label><input id="en-d" name="date" type="date" required max="'+today()+'" value="'+(e?e.date:today())+'"></div><div class="field"><label class="f" for="en-v">Value <span id="en-u" class="muted">('+metricUnitLabel(k0)+')</span></label><input id="en-v" name="value" type="number" inputmode="decimal" step="any" min="0" required value="'+(e?fmtNum(metricToDisp(e.metric,e.value),2):'')+'" autofocus></div></div><div class="field"><label class="f" for="en-n">Note (optional)</label><input id="en-n" name="note" type="text" maxlength="120" value="'+esc(e?e.note:'')+'"></div><p class="hint" id="en-h">'+esc(METRICS[k0].hint||'')+'</p></div><div class="mf"><button type="button" class="btn" data-act="closeModal">Cancel</button><button class="btn pri">Save entry</button></div></form>'});
}
CHG.entryMetric=el=>{const k=el.value;$('#en-u').textContent='('+metricUnitLabel(k)+')';$('#en-h').textContent=METRICS[k].hint||''};
ACT.addEntry=el=>entryModal(null,el&&el.dataset&&el.dataset.k);
ACT.editEntry=el=>entryModal(S.progress.find(x=>x.id===el.dataset.id));
SUB.entry=(f,fd)=>{
  const k=fd.get('metric'),v=num(fd.get('value')),date=fd.get('date');
  if(v==null||v<=0){toast('Enter a value greater than zero.','err');return}
  if(!date||date>today()){toast('Choose a date that is not in the future.','err');return}
  const obj={id:f.dataset.id||uid(),date,metric:k,value:metricFromDisp(k,v),note:String(fd.get('note')||'').trim(),ts:Date.now()};
  const i=S.progress.findIndex(x=>x.id===obj.id);if(i>=0)S.progress[i]=obj;else S.progress.push(obj);
  PRG.metric=k;save();closeModal();refresh();toast('Entry saved','ok');
};
ACT.delEntry=async el=>{const e=S.progress.find(x=>x.id===el.dataset.id);if(!e)return;
  if(await confirmDlg({title:'Delete this entry?',msg:METRICS[e.metric].label+' · '+fmtDate(e.date)+' · '+fmtMetric(e.metric,e.value),ok:'Delete',danger:true})){S.progress=S.progress.filter(x=>x!==e);save();refresh();toast('Entry deleted')}};

/* ---------- GOALS & CHALLENGES ---------- */
const GTYPES={weekly:'Workouts every week',monthly:'Workouts this month',minutes:'Exercise minutes per day',total:'Total number of workouts',streak:'Workout streak',metric:'Improve a performance record',manual:'Custom goal (manual progress)'};
const CHAL=[{name:'7-Day Workout Challenge',days:7,target:4},{name:'14-Day Consistency Challenge',days:14,target:8},{name:'30-Day Fitness Habit Challenge',days:30,target:16}];
function dueChip(g){if(!g.targetDate||g.completed)return '';const d=diffDays(today(),g.targetDate);return d<0?'<span class="chip r">Past target date</span>':'<span class="chip">'+(d===0?'Due today':d+' days left')+'</span>'}
function goalCard(g){
  const p=goalProgress(g);
  return '<div class="card"><div class="row between wrap" style="align-items:flex-start"><div class="grow"><h3>'+esc(g.title)+'</h3><div class="row wrap gap-s mt-s"><span class="chip">'+GTYPES[g.type]+'</span>'+(g.targetDate?'<span class="chip">Target: '+fmtDate(g.targetDate,{day:'numeric',month:'short',year:'numeric'})+'</span>':'')+dueChip(g)+(g.completed?'<span class="chip g">Completed'+(g.completedOn?' '+fmtDateS(g.completedOn):'')+'</span>':'')+'</div></div><div class="row" style="gap:0"><button type="button" class="icon-btn" data-act="editGoal" data-id="'+g.id+'" aria-label="Edit goal '+esc(g.title)+'">'+ic('edit')+'</button><button type="button" class="icon-btn dng" data-act="delGoal" data-id="'+g.id+'" aria-label="Delete goal '+esc(g.title)+'">'+ic('trash')+'</button></div></div>'
   +'<div class="row between mt"><span class="small muted">'+esc(p.label)+'</span><b>'+Math.round(p.pct)+'%</b></div><div class="mt-s">'+bar(p.pct)+'</div>'
   +'<div class="row wrap mt">'+(g.type==='manual'&&!g.completed?'<form data-submit="goalProg" data-id="'+g.id+'" class="row gap-s"><label class="sr" for="gp'+g.id+'">Current progress</label><input id="gp'+g.id+'" name="cur" type="number" min="0" step="any" value="'+(g.current||0)+'" style="width:90px;min-height:34px"><button class="btn sm">Update progress</button></form>':'')
   +(g.completed?'<button type="button" class="btn sm" data-act="reopenGoal" data-id="'+g.id+'">Reopen</button>':'<button type="button" class="btn sm '+(p.reached?'acc':'')+'" data-act="completeGoal" data-id="'+g.id+'">'+ic('check')+(p.reached?'Target reached — mark completed':'Mark completed')+'</button>')+'</div></div>';
}
function chalCard(c){
  const p=challengeProgress(c),lab={completed:'Completed',ended:'Ended',upcoming:'Starts '+fmtDateS(c.start),active:p.daysLeft+' days left'}[p.state];
  return '<div class="card"><div class="row between wrap" style="align-items:flex-start"><div class="grow"><h3>'+esc(c.name)+'</h3><div class="row wrap gap-s mt-s"><span class="chip '+(p.state==='completed'?'g':p.state==='ended'?'w':'')+'">'+lab+'</span><span class="chip">'+c.days+' days · aim for '+c.target+' active days</span></div></div><div class="row" style="gap:0"><button type="button" class="icon-btn" data-act="editChal" data-id="'+c.id+'" aria-label="Edit challenge '+esc(c.name)+'">'+ic('edit')+'</button><button type="button" class="icon-btn dng" data-act="delChal" data-id="'+c.id+'" aria-label="Delete challenge '+esc(c.name)+'">'+ic('trash')+'</button></div></div>'
   +'<div class="row between mt"><span class="small muted">'+p.active+' of '+c.target+' active days</span><b>'+Math.round(p.pct)+'%</b></div><div class="mt-s">'+bar(p.pct)+'</div>'
   +'<div class="row wrap mt" style="gap:5px" role="list" aria-label="Challenge days">'+p.cells.map((x,i)=>'<span role="listitem" title="'+fmtDate(x.k)+'" aria-label="Day '+(i+1)+': '+(x.done?'workout done':x.today?'today':x.future?'upcoming':'rest or missed')+'" style="width:28px;height:28px;border-radius:8px;display:grid;place-items:center;font-size:11px;font-weight:700;'+(x.done?'background:#4F6F58;color:#fff':x.today?'border:2px solid #202B35':x.future?'background:#EEF1F4;color:#94A3B8':'background:#F3F5F7;color:#64748B')+'">'+(x.done?'✓':i+1)+'</span>').join('')+'</div></div>';
}
ROUTES.goals=()=>{
  const act=S.goals.filter(g=>!g.completed),done=S.goals.filter(g=>g.completed);
  let h=pageHead('Goals & Challenges','Set personal targets that fit your routine. Rest days are part of a healthy plan.','<button type="button" class="btn pri" data-act="addGoal">'+ic('plus')+'New goal</button>');
  h+='<h2 class="mb">Goals</h2>'+(act.length?'<div class="grid g2">'+act.map(goalCard).join('')+'</div>':'<div class="card">'+emptyState('No active goals','Create a goal to track, for example, 4 workouts a week or a longer plank hold.','<button type="button" class="btn pri" data-act="addGoal">Create a goal</button>')+'</div>');
  if(done.length)h+='<h3 class="mt-l mb">Completed goals</h3><div class="grid g2">'+done.map(goalCard).join('')+'</div>';
  h+='<h2 class="mt-l mb">Challenges <span class="small muted" style="font-weight:400">(optional)</span></h2>';
  h+=S.challenges.length?'<div class="grid g2">'+S.challenges.map(chalCard).join('')+'</div>':'<div class="card">'+emptyState('No challenges running','Start a short challenge to build a habit. You choose the length and how many active days to aim for.')+'</div>';
  h+='<div class="card mt"><h3>Start a challenge</h3><p class="small muted">Presets are just a starting point — you can customize every detail. Plan rest days: more is not always better.</p><div class="row wrap">'+CHAL.map((c,i)=>'<button type="button" class="btn" data-act="addChal" data-i="'+i+'">'+ic('plus')+c.name+'</button>').join('')+'<button type="button" class="btn" data-act="addChal" data-i="-1">Custom challenge</button></div></div>';
  return h;
};
function goalFields(type,g){
  g=g||{};const num_=(n,l,v,extra)=>'<div class="field"><label class="f" for="g-'+n+'">'+l+'</label><input id="g-'+n+'" name="'+n+'" type="number" step="any" min="0" '+(extra||'')+' value="'+(v==null?'':v)+'" required></div>';
  if(type==='weekly')return num_('target','Workouts per week',g.target||4,'step="1" min="1" max="14"');
  if(type==='monthly')return num_('target','Workouts this month',g.target||16,'step="1" min="1" max="62"');
  if(type==='minutes')return '<div class="fgrid">'+num_('target','Minutes per day',g.target||30,'step="5" min="5" max="300"')+num_('days','On how many days each week?',g.days||7,'step="1" min="1" max="7"')+'</div>';
  if(type==='total')return num_('target','Total workouts to complete',g.target||20,'step="1" min="1"');
  if(type==='streak')return num_('target','Streak length (workout days)',g.target||7,'step="1" min="2" max="60"')+'<p class="hint">A streak keeps going over planned rest days; it only breaks when you miss a scheduled workout.</p>';
  if(type==='metric'){const k=g.metric||'plank',m=METRICS[k],last=latestMetric(k);
    return '<div class="field"><label class="f" for="g-metric">Performance record</label><select id="g-metric" name="metric" data-chg="goalMetric">'+Object.keys(METRICS).filter(x=>METRICS[x].group==='perf').map(x=>'<option value="'+x+'"'+(x===k?' selected':'')+'>'+METRICS[x].label+'</option>').join('')+'</select></div><div class="fgrid"><div class="field"><label class="f" for="g-start">Starting value <span class="muted" id="g-u1">('+metricUnitLabel(k)+')</span></label><input id="g-start" name="start" type="number" step="any" min="0" value="'+(g.start!=null?fmtNum(metricToDisp(k,g.start),2):(last?fmtNum(metricToDisp(k,last.value),2):''))+'"><div class="hint">Leave blank to use your first entry.</div></div><div class="field"><label class="f" for="g-target">Target value <span class="muted" id="g-u2">('+metricUnitLabel(k)+')</span></label><input id="g-target" name="target" type="number" step="any" min="0" required value="'+(g.target!=null?fmtNum(metricToDisp(k,g.target),2):'')+'"></div></div>'}
  return '<div class="fgrid">'+num_('target','Target amount',g.target||10,'step="any"')+num_('current','Current progress',g.current||0,'step="any"')+'</div><div class="field"><label class="f" for="g-unit">Unit (optional)</label><input id="g-unit" name="unit" type="text" maxlength="20" placeholder="e.g. km, sessions" value="'+esc(g.unit||'')+'"></div>';
}
CHG.goalType=el=>{$('#gf-fields').innerHTML=goalFields(el.value)};
CHG.goalMetric=el=>{const k=el.value;$('#g-u1').textContent='('+metricUnitLabel(k)+')';$('#g-u2').textContent='('+metricUnitLabel(k)+')';const l=latestMetric(k);$('#g-start').value=l?fmtNum(metricToDisp(k,l.value),2):''};
function goalModal(g){
  modal({title:g?'Edit goal':'New goal',html:'<form data-submit="goal" data-id="'+(g?g.id:'')+'"><div class="mb"><div class="field"><label class="f" for="g-type">Goal type</label><select id="g-type" name="type" data-chg="goalType"'+(g?' disabled':'')+'>'+Object.keys(GTYPES).map(k=>'<option value="'+k+'"'+(g&&g.type===k?' selected':'')+'>'+GTYPES[k]+'</option>').join('')+'</select></div><div id="gf-fields">'+goalFields(g?g.type:'weekly',g)+'</div><div class="field"><label class="f" for="g-title">Goal name <span class="muted">(optional — one is created for you)</span></label><input id="g-title" name="title" type="text" maxlength="90" value="'+esc(g?g.title:'')+'"></div><div class="field"><label class="f" for="g-date">Target date (optional)</label><input id="g-date" name="targetDate" type="date" value="'+(g?g.targetDate||'':'')+'"></div></div><div class="mf"><button type="button" class="btn" data-act="closeModal">Cancel</button><button class="btn pri">Save goal</button></div></form>'});
}
ACT.addGoal=()=>goalModal();ACT.editGoal=el=>goalModal(S.goals.find(x=>x.id===el.dataset.id));
SUB.goal=(f,fd)=>{
  const id=f.dataset.id,old=id?S.goals.find(x=>x.id===id):null,type=old?old.type:fd.get('type'),t=num(fd.get('target'));
  if(t==null||t<=0){toast('Enter a target greater than zero.','err');return}
  const g=Object.assign({},old||{id:uid(),created:today(),completed:false},{type,targetDate:fd.get('targetDate')||''});
  if(type==='metric'){const k=fd.get('metric');g.metric=k;g.target=metricFromDisp(k,t);const s=num(fd.get('start'));g.start=s==null?null:metricFromDisp(k,s)}
  else{g.target=t;if(type==='minutes')g.days=clamp(Math.round(num(fd.get('days'))||7),1,7);if(type==='manual'){g.current=num(fd.get('current'))||0;g.unit=String(fd.get('unit')||'').trim()}}
  let title=String(fd.get('title')||'').trim();
  if(!title)title=type==='weekly'?'Complete '+t+' workouts every week':type==='monthly'?'Complete '+t+' workouts this month':type==='minutes'?'Exercise for '+t+' minutes '+(g.days===7?'daily':'on '+g.days+' days a week'):type==='total'?'Complete '+t+' workouts':type==='streak'?'Keep a '+t+'-day workout streak':type==='metric'?'Improve '+METRICS[g.metric].label.toLowerCase()+' to '+fmtMetric(g.metric,g.target):'My goal';
  g.title=title;
  const i=S.goals.findIndex(x=>x.id===g.id);if(i>=0)S.goals[i]=g;else S.goals.push(g);save();closeModal();refresh();toast('Goal saved','ok');
};
SUB.goalProg=(f,fd)=>{const g=S.goals.find(x=>x.id===f.dataset.id);if(!g)return;g.current=num(fd.get('cur'))||0;save();refresh();toast('Progress updated','ok')};
ACT.completeGoal=el=>{const g=S.goals.find(x=>x.id===el.dataset.id);if(!g)return;g.completed=true;g.completedOn=today();save();refresh();toast('Goal marked as completed','ok')};
ACT.reopenGoal=el=>{const g=S.goals.find(x=>x.id===el.dataset.id);if(!g)return;g.completed=false;g.completedOn='';save();refresh()};
ACT.delGoal=async el=>{const g=S.goals.find(x=>x.id===el.dataset.id);if(!g)return;if(await confirmDlg({title:'Delete goal?',msg:'“'+g.title+'” will be removed.',ok:'Delete',danger:true})){S.goals=S.goals.filter(x=>x!==g);save();refresh()}};
function chalModal(c,preset){
  const p=c||(preset>=0?CHAL[preset]:{name:'My Challenge',days:10,target:5});
  modal({title:c?'Edit challenge':'Start a challenge',html:'<form data-submit="chal" data-id="'+(c?c.id:'')+'"><div class="mb"><div class="field"><label class="f" for="c-n">Challenge name</label><input id="c-n" name="name" type="text" required maxlength="80" value="'+esc(p.name)+'"></div><div class="fgrid c3"><div class="field"><label class="f" for="c-d">Length (days)</label><input id="c-d" name="days" type="number" min="3" max="90" step="1" required value="'+p.days+'"></div><div class="field"><label class="f" for="c-t">Active days to aim for</label><input id="c-t" name="target" type="number" min="1" max="90" step="1" required value="'+p.target+'"></div><div class="field"><label class="f" for="c-s">Start date</label><input id="c-s" name="start" type="date" required value="'+(c?c.start:today())+'"></div></div><p class="hint">An “active day” is a day with a completed workout. Leave room for rest days — recovery matters.</p></div><div class="mf"><button type="button" class="btn" data-act="closeModal">Cancel</button><button class="btn pri">'+(c?'Save challenge':'Start challenge')+'</button></div></form>'});
}
ACT.addChal=el=>chalModal(null,+el.dataset.i);ACT.editChal=el=>chalModal(S.challenges.find(x=>x.id===el.dataset.id));
SUB.chal=async(f,fd)=>{
  const days=Math.round(num(fd.get('days'))||0),target=Math.round(num(fd.get('target'))||0),name=String(fd.get('name')).trim();
  if(days<3||days>90){toast('Challenge length must be between 3 and 90 days.','err');return}
  if(target<1||target>days){toast('Active days must be between 1 and the challenge length.','err');return}
  if(target>Math.ceil(days*6/7)&&!await confirmDlg({title:'Plan some rest days?',msg:'Aiming for '+target+' active days in '+days+' leaves little or no time for recovery. Rest days help you train consistently. Continue anyway?',ok:'Keep my plan',cancel:'Change it'}))return;
  const id=f.dataset.id,old=id?S.challenges.find(x=>x.id===id):null,c=Object.assign({},old||{id:uid(),completedOn:''},{name,days,target,start:fd.get('start')});
  if(old&&c.completedOn&&challengeProgress(Object.assign({},c,{completedOn:''})).active<target)c.completedOn='';
  const i=S.challenges.findIndex(x=>x.id===c.id);if(i>=0)S.challenges[i]=c;else S.challenges.push(c);syncAuto();save();closeAllModals();refresh();toast('Challenge saved','ok');
};
ACT.delChal=async el=>{const c=S.challenges.find(x=>x.id===el.dataset.id);if(!c)return;if(await confirmDlg({title:'Delete challenge?',msg:'“'+c.name+'” will be removed.',ok:'Delete',danger:true})){S.challenges=S.challenges.filter(x=>x!==c);save();refresh()}};

/* ---------- REPORTS ---------- */
const RP={mode:'week',anchor:today(),from:'',to:''};
function rpRange(){
  const t=today();
  if(RP.mode==='week'){const s=startOfWeek(RP.anchor);return {a:s,b:addDays(s,6),label:fmtDate(s,{day:'numeric',month:'short'})+' – '+fmtDate(addDays(s,6),{day:'numeric',month:'short',year:'numeric'})}}
  if(RP.mode==='month'){const a=monthStart(RP.anchor),b=monthEnd(RP.anchor);return {a,b,label:parseD(a).toLocaleDateString(undefined,{month:'long',year:'numeric'})}}
  if(RP.mode==='all'){const a=S.sessions.length?S.sessions[0].date:S.profile.start;return {a,b:t,label:'All time ('+fmtDate(a)+' – '+fmtDate(t)+')'}}
  let a=RP.from||addDays(t,-29),b=RP.to||t;if(a>b){const x=a;a=b;b=x}return {a,b,label:fmtDate(a)+' – '+fmtDate(b)};
}
function buckets(a,b){
  const days=diffDays(a,b)+1,out=[];
  if(days<=42){for(let i=0;i<days;i++){const k=addDays(a,i);out.push({from:k,to:k,l:days<=8?DAYS3[wd(k)]:String(parseD(k).getDate()),tip:fmtDate(k)})}}
  else if(days<=200){let s=startOfWeek(a);while(s<=b){out.push({from:s<a?a:s,to:addDays(s,6)>b?b:addDays(s,6),l:fmtDateS(s),tip:'Week of '+fmtDate(s)});s=addDays(s,7)}}
  else{let s=monthStart(a);while(s<=b){const e=monthEnd(s);out.push({from:s<a?a:s,to:e>b?b:e,l:parseD(s).toLocaleDateString(undefined,{month:'short',year:'2-digit'}),tip:parseD(s).toLocaleDateString(undefined,{month:'long',year:'numeric'})});s=addDays(e,1)}}
  return out;
}
ROUTES.reports=()=>{
  const R=rpRange(),list=sessionsBetween(R.a,R.b),t=today(),days=diffDays(R.a,R.b)+1;
  const stats=list.map(sessStats),mins=minutesOf(list),sets=sum(stats.map(s=>s.sets)),reps=sum(stats.map(s=>s.reps)),vol=sum(stats.map(s=>s.vol));
  let sch=0,hit=0;for(let k=R.a;k<=R.b&&k<=t;k=addDays(k,1)){if(k<S.profile.start)continue;if(scheduledOn(k).length){sch++;if(sessionsOn(k).length)hit++}}
  const bk=buckets(R.a,R.b).map(x=>{const l=sessionsBetween(x.from,x.to);return {l:x.l,n:l.length,m:minutesOf(l),v:sum(l.map(s=>sessStats(s).vol)),tip:x.tip}});
  // distributions
  const muscle={},exs={};list.forEach(s=>s.exercises.forEach(e=>{const n=e.sets.filter(x=>x.done).length;if(!n)return;const m=getEx(e.exId).muscle;muscle[m]=(muscle[m]||0)+n;exs[e.name]=(exs[e.name]||0)+n}));
  const mdata=Object.keys(muscle).sort((a,b)=>muscle[b]-muscle[a]).map((m,i)=>({l:m,v:muscle[m],c:PALETTE[i%PALETTE.length]})),mtot=sum(mdata.map(x=>x.v));
  const edata=Object.keys(exs).sort((a,b)=>exs[b]-exs[a]).slice(0,8),emax=edata.length?exs[edata[0]]:1;
  const wEntries=S.settings.trackBody&&S.settings.tracked.weight?metricEntries('weight').filter(e=>e.date<=R.b):[],wIn=wEntries.filter(e=>e.date>=R.a),wUse=wIn.length>=2?wIn:wEntries.slice(-12);
  const hdr='<div class="print-only" style="margin-bottom:14px"><h1>Workout Report</h1><div>'+(S.profile.name?esc(S.profile.name)+' · ':'')+esc(R.label)+' · generated '+fmtDate(t)+'</div></div>';
  let h=hdr+pageHead('Reports & Statistics',esc(R.label),'<button type="button" class="btn no-print" data-act="printReport">'+ic('print')+'Print report</button><button type="button" class="btn no-print" data-act="exportCSV" data-k="history">'+ic('download')+'Workouts CSV</button><button type="button" class="btn no-print" data-act="exportCSV" data-k="sets">'+ic('download')+'Sets CSV</button><button type="button" class="btn no-print" data-act="exportCSV" data-k="progress">'+ic('download')+'Progress CSV</button>');
  h+='<div class="card no-print"><div class="row between wrap"><div class="tabs" role="group" aria-label="Report period">'+[['week','Week'],['month','Month'],['custom','Custom range'],['all','All time']].map(x=>'<button type="button" data-act="rpMode" data-m="'+x[0]+'" aria-pressed="'+(RP.mode===x[0])+'">'+x[1]+'</button>').join('')+'</div>'
   +(RP.mode==='week'||RP.mode==='month'?'<div class="row"><button type="button" class="icon-btn" data-act="rpNav" data-d="-1" aria-label="Previous '+RP.mode+'">'+ic('chevL')+'</button><button type="button" class="btn sm" data-act="rpNav" data-d="0">Current</button><button type="button" class="icon-btn" data-act="rpNav" data-d="1" aria-label="Next '+RP.mode+'">'+ic('chevR')+'</button></div>':'')
   +(RP.mode==='custom'?'<div class="row wrap"><label class="small" for="rp-a">From</label><input id="rp-a" type="date" data-chg="rpDate" data-f="from" value="'+R.a+'" style="width:auto"><label class="small" for="rp-b">To</label><input id="rp-b" type="date" data-chg="rpDate" data-f="to" value="'+R.b+'" style="width:auto"></div>':'')+'</div></div>';
  h+='<div class="grid mt" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">'
   +stat('Workouts',list.length,fmtNum(list.length/Math.max(1,days/7),1)+' per week')+stat('Training hours',fmtNum(mins/60,1)+'<small> h</small>',fmtMin(mins))
   +stat('Sets / reps',sets+'<small> / '+reps+'</small>','completed')+stat('Training volume',vol?Math.round(toDisp('w',vol)).toLocaleString()+'<small> '+uName('w')+'</small>':'–','weight × reps')
   +stat('Consistency',sch?Math.round(hit/sch*100)+'%':'–',sch?hit+' of '+sch+' planned days':'no planned days in range')+stat('Active days',new Set(list.map(s=>s.date)).size,'of '+days+' days')+'</div>';
  if(!list.length)h+='<div class="card mt">'+emptyState('No workouts in this period','Pick another date range, or complete a workout to see your report fill up.')+'</div>';
  const noData='<p class="muted small">No data in this period.</p>';
  h+='<div class="grid g2 mt"><div class="card"><h3>Workout activity</h3><p class="small muted">Workouts per '+(days<=42?'day':days<=200?'week':'month')+'</p>'+(list.length?chartHost(w=>barChart(w,{data:bk.map(x=>({l:x.l,v:x.n,tip:x.tip+': '+x.n+' workouts'})),h:200}),200,'Bar chart of workouts in the selected period'):noData)+'</div>'
   +'<div class="card"><h3>Training duration</h3><p class="small muted">Minutes per '+(days<=42?'day':days<=200?'week':'month')+'</p>'+(list.length?chartHost(w=>barChart(w,{data:bk.map(x=>({l:x.l,v:x.m,tip:x.tip+': '+x.m+' min'})),h:200,color:'#64748B'}),200,'Bar chart of training minutes in the selected period'):noData)+'</div></div>';
  h+='<div class="grid g2 mt"><div class="card"><h3>Muscle group distribution</h3><p class="small muted">Share of completed sets</p>'+(mdata.length?'<div class="row gap-l wrap">'+donut(mdata,160)+'<div class="legend" style="flex-direction:column;gap:6px">'+mdata.map(x=>'<span><i style="background:'+x.c+'"></i>'+esc(x.l)+' · '+Math.round(x.v/mtot*100)+'% ('+x.v+' sets)</span>').join('')+'</div></div>':noData)+'</div>'
   +'<div class="card"><h3>Exercise distribution</h3><p class="small muted">Most-used exercises by completed sets</p>'+(edata.length?edata.map(n=>'<div class="mt-s"><div class="row between small"><span>'+esc(n)+'</span><b>'+exs[n]+'</b></div>'+bar(exs[n]/emax*100)+'</div>').join(''):noData)+'</div></div>';
  h+='<div class="grid g2 mt"><div class="card"><h3>Progress over time</h3><p class="small muted">Training volume ('+uName('w')+')</p>'+(vol?chartHost(w=>lineChart(w,{pts:bk.map((x,i)=>({x:i,y:Math.round(toDisp('w',x.v)),tip:x.tip+': '+Math.round(toDisp('w',x.v)).toLocaleString()+' '+uName('w')})),labels:bk.map(x=>x.l),zero:true,h:200}),200,'Line chart of training volume'):noData)+'</div>'
   +'<div class="card"><h3>Weight trend</h3><p class="small muted">'+(S.settings.trackBody&&S.settings.tracked.weight?'For your reference only':'Weight tracking is turned off')+'</p>'+(wUse.length?chartHost(w=>lineChart(w,{pts:wUse.map(e=>({x:parseD(e.date).getTime(),y:+toDisp('w',e.value).toFixed(1),tip:fmtDate(e.date)+': '+fmtU('w',e.value)})),labels:wUse.map(e=>fmtDateS(e.date)),h:200,color:'#64748B'}),200,'Line chart of weight entries'):'<p class="muted small">'+(S.settings.trackBody?'Add weight entries in Progress to see a trend.':'You can turn on optional body tracking in Progress.')+'</p>')+'</div></div>';
  const gl=S.goals.filter(g=>!g.completed);
  h+='<div class="grid g2 mt"><div class="card"><h3>Goal completion</h3>'+(S.goals.length?S.goals.map(g=>{const p=goalProgress(g);return '<div class="mt-s"><div class="row between small"><span>'+esc(g.title)+(g.completed?' <span class="chip g">Done</span>':'')+'</span><b>'+(g.completed?100:Math.round(p.pct))+'%</b></div>'+bar(g.completed?100:p.pct)+'</div>'}).join(''):'<p class="muted small">No goals yet. Create one on the Goals page.</p>')+'</div>'
   +'<div class="card"><h3>Personal records</h3>'+(bestList().length?'<div class="tbl-wrap"><table><tbody>'+bestList().slice(0,10).map(r=>'<tr><td><b>'+esc(r.name)+'</b><div class="xs muted">'+fmtDate(r.date)+'</div></td><td style="text-align:right">'+esc(r.text)+'</td></tr>').join('')+'</tbody></table></div>':'<p class="muted small">Records appear after you log workouts.</p>')+'</div></div>';
  h+='<p class="small muted mt">Statistics are for personal tracking only and are not medical or professional advice.</p>';
  return h;
};
ACT.rpMode=el=>{RP.mode=el.dataset.m;if(RP.mode==='custom'&&!RP.from){RP.from=addDays(today(),-29);RP.to=today()}refresh()};
ACT.rpNav=el=>{const d=+el.dataset.d;if(d===0)RP.anchor=today();else if(RP.mode==='week')RP.anchor=addDays(RP.anchor,7*d);else{const x=parseD(RP.anchor);x.setDate(1);x.setMonth(x.getMonth()+d);RP.anchor=dkey(x)}refresh()};
CHG.rpDate=el=>{RP[el.dataset.f]=el.value;refresh()};
ACT.printReport=()=>{drawCharts();setTimeout(()=>window.print(),50)};
ACT.exportCSV=el=>{
  const k=el.dataset.k,R=(currentRoute().name==='reports')?rpRange():{a:'0000-01-01',b:'9999-12-31'},list=k==='progress'?[]:sessionsBetween(R.a,R.b).slice().reverse();let rows;
  if(k==='history'){rows=[['Date','Workout','Duration (min)','Exercises','Sets','Reps','Volume ('+uName('w')+')','Notes']];list.forEach(s=>{const st=sessStats(s);rows.push([s.date,s.name,s.duration,st.exs,st.sets,st.reps,st.vol?Math.round(toDisp('w',st.vol)):0,s.notes||''])})}
  else if(k==='sets'){rows=[['Date','Workout','Exercise','Set','Weight ('+uName('w')+')','Reps','Duration (sec)','Distance ('+uName('d')+')','Exercise notes']];list.forEach(s=>s.exercises.forEach(e=>e.sets.filter(x=>x.done).forEach((x,i)=>rows.push([s.date,s.name,e.name,i+1,x.w>0?+toDisp('w',x.w).toFixed(2):'',x.reps||'',x.dur||'',x.dist?+toDisp('d',x.dist).toFixed(3):'',i===0?e.notes||'':'']))))}
  else{rows=[['Date','Measurement','Value','Unit','Note']];S.progress.slice().sort((a,b)=>a.date<b.date?-1:1).forEach(p=>{const m=METRICS[p.metric];rows.push([p.date,m.label,+(metricToDisp(p.metric,p.value)).toFixed(2),metricUnitLabel(p.metric),p.note||''])})}
  if(rows.length<2){toast('There is no data to export yet.','err');return}
  downloadFile('workout-planner-'+k+'-'+today()+'.csv',toCSV(rows),'text/csv;charset=utf-8');toast('CSV exported','ok');
};

/* ---------- SETTINGS ---------- */
function profileForm(p,idp){
  return '<div class="fgrid"><div class="field"><label class="f" for="'+idp+'name">Name</label><input id="'+idp+'name" name="name" type="text" maxlength="40" value="'+esc(p.name)+'" required></div><div class="field"><label class="f" for="'+idp+'age">Age (optional)</label><input id="'+idp+'age" name="age" type="number" min="10" max="110" step="1" value="'+esc(p.age)+'"></div>'
   +'<div class="field"><label class="f" for="'+idp+'level">Fitness level</label><select id="'+idp+'level" name="level">'+Object.keys(DIFFS).map(k=>'<option value="'+k+'"'+(p.level===k?' selected':'')+'>'+DIFFS[k]+'</option>').join('')+'</select></div><div class="field"><label class="f" for="'+idp+'loc">Preferred workout location</label><select id="'+idp+'loc" name="location">'+Object.keys(LOCS).map(k=>'<option value="'+k+'"'+(p.location===k?' selected':'')+'>'+LOCS[k]+'</option>').join('')+'</select></div>'
   +'<div class="field"><label class="f" for="'+idp+'goal">Main fitness goal</label><select id="'+idp+'goal" name="goal">'+Object.keys(GOALS).map(k=>'<option value="'+k+'"'+(p.goal===k?' selected':'')+'>'+GOALS[k]+'</option>').join('')+'</select></div><div class="field"><label class="f" for="'+idp+'dur">Preferred workout duration</label><select id="'+idp+'dur" name="duration">'+[20,30,45,60,75,90].map(x=>'<option value="'+x+'"'+(+p.duration===x?' selected':'')+'>'+x+' minutes</option>').join('')+'</select></div></div>'
   +'<fieldset style="border:0;padding:0;margin:0 0 14px"><legend class="f" style="font-size:13px;font-weight:600;margin-bottom:6px">Available training days</legend><div class="row wrap">'+DAYS.map((d,i)=>'<label class="row small"><input type="checkbox" name="days" value="'+i+'"'+(p.days.includes(i)?' checked':'')+'> '+d.slice(0,3)+'</label>').join('')+'</div></fieldset>'
   +'<fieldset style="border:0;padding:0;margin:0"><legend class="f" style="font-size:13px;font-weight:600;margin-bottom:6px">Available equipment</legend><div class="row wrap">'+Object.keys(PROFILE_EQUIP).map(k=>'<label class="row small"><input type="checkbox" name="equip" value="'+k+'"'+(p.equip.includes(k)?' checked':'')+'> '+PROFILE_EQUIP[k]+'</label>').join('')+'</div></fieldset>';
}
ROUTES.settings=()=>{
  const p=S.profile,u=S.settings.units,s=S.settings,age=backupAgeDays();
  const cnt='<p class="small muted">'+plural(S.sessions.length,'workout')+' logged · '+plural(S.plan.length,'planned workout')+' · '+plural(S.progress.length,'progress entry','progress entries')+' · '+plural(S.goals.length,'goal')+'. Stored in '+({idb:'this browser (IndexedDB)',ls:'this browser (local storage)',memory:'memory only — NOT saved'}[DB.mode])+'.</p>';
  return pageHead('Settings','Everything is stored privately on this device. Nothing is sent anywhere.')
  +(ME?'<div class="card mb"><div class="row between wrap"><div class="row"><span class="av lg">'+esc(ME.name.charAt(0).toUpperCase())+'</span><div><b>'+esc(ME.name)+'</b><div class="small muted">@'+esc(ME.user)+' · account stored on this device</div></div></div><div class="row wrap"><button type="button" class="btn" data-act="security">'+ic('shield')+'Change password</button><button type="button" class="btn" data-act="themes">Theme</button><button type="button" class="btn" data-act="signOut">Sign out</button></div></div></div>':'')
  +'<div class="card"><h2>Profile & fitness preferences</h2><form data-submit="profile">'+profileForm(p,'s-')+'<button class="btn pri mt">Save profile</button></form></div>'
  +'<div class="grid g2 mt"><div class="card"><h2>Preferences</h2>'
  +'<div class="fgrid"><div class="field"><label class="f" for="u-w">Weight unit</label><select id="u-w" data-chg="unit" data-k="w"><option value="kg"'+(u.w==='kg'?' selected':'')+'>Kilograms (kg)</option><option value="lb"'+(u.w==='lb'?' selected':'')+'>Pounds (lb)</option></select></div><div class="field"><label class="f" for="u-l">Body measurement unit</label><select id="u-l" data-chg="unit" data-k="l"><option value="cm"'+(u.l==='cm'?' selected':'')+'>Centimeters (cm)</option><option value="in"'+(u.l==='in'?' selected':'')+'>Inches (in)</option></select></div><div class="field"><label class="f" for="u-d">Distance unit</label><select id="u-d" data-chg="unit" data-k="d"><option value="km"'+(u.d==='km'?' selected':'')+'>Kilometers (km)</option><option value="mi"'+(u.d==='mi'?' selected':'')+'>Miles (mi)</option></select></div>'
  +'<div class="field"><label class="f" for="s-wt">Weekly workout target</label><input id="s-wt" type="number" min="1" max="14" step="1" data-chg="pref" data-k="weeklyTarget" value="'+s.weeklyTarget+'"></div><div class="field"><label class="f" for="s-dr">Default rest between sets (seconds)</label><input id="s-dr" type="number" min="0" max="600" step="5" data-chg="pref" data-k="defaultRest" value="'+s.defaultRest+'"></div></div>'
  +'<label class="switch"><span><b>Sound alerts</b><br><span class="small muted">Beep when the rest timer finishes</span></span><input type="checkbox" data-chg="pref" data-k="sound"'+(s.sound?' checked':'')+'></label>'
  +'<label class="switch"><span><b>Start rest timer automatically</b><br><span class="small muted">When you complete a set</span></span><input type="checkbox" data-chg="pref" data-k="autoRest"'+(s.autoRest?' checked':'')+'></label>'
  +'<label class="switch"><span><b>Track body measurements</b><br><span class="small muted">Optional. Choose which on the Progress page</span></span><input type="checkbox" data-chg="pref" data-k="trackBody"'+(s.trackBody?' checked':'')+'></label></div>'
  +'<div class="card"><h2>Backup & restore</h2>'+cnt+'<p class="small">'+(S.meta.lastBackup?'Last backup: '+new Date(S.meta.lastBackup).toLocaleString()+(age>=30?' <span class="chip w">'+age+' days ago</span>':''):'You have not exported a backup yet.')+'</p><div class="row wrap"><button type="button" class="btn pri" data-act="exportBackup">'+ic('download')+'Export backup (.json)</button><label class="btn" tabindex="0" role="button" id="imp-l" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();document.getElementById(\'imp-f\').click()}">'+ic('upload')+'Import backup<input id="imp-f" type="file" accept=".json,application/json" class="sr" data-chg="importFile"></label></div><p class="hint mt-s">Importing replaces everything currently in the app. Export a backup first if you want to keep your current data.</p></div></div>'
  +'<div class="card mt"><h2>Manage application data</h2><div class="grid g2" style="align-items:stretch">'
  +'<div class="card flat"><h4>Reset application</h4><p class="small muted">Erases your workouts, history, progress and custom items for this account and restarts setup. Your login is kept.</p><button type="button" class="btn danger" data-act="resetApp">Reset my data</button></div><div class="card flat"><h4>Delete account</h4><p class="small muted">Removes this login and all of its data from this device.</p><button type="button" class="btn danger" data-act="deleteAccount">Delete account</button></div></div></div>'
  +'<div class="card mt"><h2>Safety & about</h2><p class="small">Workout Planner &amp; Fitness Tracker v'+APP_VERSION+' · works fully offline · no tracking.</p><div class="row wrap"><button type="button" class="btn" data-act="safety">'+ic('shield')+'Read safety information</button><a class="btn" href="#/guide">'+ic('info')+'Guide &amp; About</a></div></div>';
};
function readProfile(fd){
  const days=fd.getAll('days').map(Number),eq=fd.getAll('equip');
  return {name:String(fd.get('name')||'').trim(),age:fd.get('age')?Math.round(+fd.get('age')):'',level:fd.get('level'),location:fd.get('location'),goal:fd.get('goal'),duration:+fd.get('duration'),days:days,equip:eq.length?eq:['none']};
}
SUB.profile=(f,fd)=>{const p=readProfile(fd);if(!p.name){toast('Please enter your name.','err');return}Object.assign(S.profile,p);save();toast('Profile saved','ok');refresh()};
CHG.unit=el=>{S.settings.units[el.dataset.k]=el.value;save();refresh();toast('Units updated','ok')};
CHG.pref=el=>{const k=el.dataset.k;let v=el.type==='checkbox'?el.checked:num(el.value);
  if(k==='weeklyTarget'){v=clamp(Math.round(v||1),1,14);el.value=v}if(k==='defaultRest'){v=clamp(Math.round(v==null?60:v),0,600);el.value=v}
  S.settings[k]=v;save();if(k==='sound'&&v){T.unlock();T.beep()}toast('Saved','ok')};
ACT.exportBackup=()=>{
  try{S.meta.lastBackup=Date.now();save();downloadFile('workout-planner-backup-'+today()+'.json',JSON.stringify(backupObj(),null,1),'application/json');toast('Backup downloaded. Keep the file somewhere safe.','ok');if(currentRoute().name==='settings'||currentRoute().name==='dashboard')setTimeout(refresh,300)}
  catch(e){toast('Could not create the backup: '+e.message,'err')}
};
CHG.importFile=el=>{
  const file=el.files&&el.files[0];if(!file)return;
  const rd=new FileReader();rd.onerror=()=>{toast('That file could not be read.','err')};
  rd.onload=async()=>{
    let obj;try{obj=JSON.parse(rd.result)}catch(e){toast('That file is not valid JSON. Choose a backup file you exported from this app.','err');el.value='';return}
    const v=validateBackup(obj);if(!v.ok){toast(v.error,'err');el.value='';return}
    const d=v.state;
    if(await confirmDlg({title:'Replace your data with this backup?',html:'This backup contains <b>'+plural(d.sessions.length,'workout')+'</b>, '+plural(d.plan.length,'planned workout')+' and '+plural(d.progress.length,'progress entry','progress entries')+(obj.exportedAt?' (exported '+esc(new Date(obj.exportedAt).toLocaleDateString())+')':'')+'. <b>Your current data will be replaced.</b>',ok:'Replace my data',danger:true})){
      S=d;if(!S.templates.length)S.templates=seedTemplates();T.resumeOnLoad();syncAuto();save();await flush();toast('Backup restored','ok');go('dashboard');render()}
    el.value='';
  };
  rd.readAsText(file);
};
ACT.loadDemo=async()=>{
  if(await confirmDlg({title:'Load sample data?',msg:'This replaces ALL your current data with the fictional demo user “Alex”. Export a backup first if you want to keep your data.',ok:'Load sample data',danger:!S.meta.demo&&S.meta.onboarded})){S=makeDemo();T.reset();save();toast('Sample data loaded','ok');go('dashboard');render()}
};
ACT.startFresh=async()=>{
  if(await confirmDlg({title:'Clear sample data and start fresh?',msg:'All sample workouts, history, progress and goals will be removed and you will set up your own profile.',ok:'Clear sample data',danger:true})){
    const keep={units:S.settings.units,sound:S.settings.sound},ce=S.customEx.filter(x=>x.id!=='c_demo1'),tp=S.templates,fv=S.fav.filter(x=>!x.startsWith('c_demo'));
    S=blankState();S.settings.units=keep.units;S.settings.sound=keep.sound;S.customEx=ce;S.templates=tp.length?tp:seedTemplates();S.fav=fv;OB=newOB();T.reset();save();go('dashboard');render();toast('Sample data cleared')}
};
ACT.resetApp=async()=>{
  if(await confirmDlg({title:'Reset the entire application?',msg:'This permanently erases all workouts, history, progress, goals, custom exercises and templates on this device. This cannot be undone. Export a backup first if you might need it.',ok:'Erase everything',danger:true})){
    T.reset();S=blankState();S.templates=seedTemplates();S.settings.theme=document.documentElement.dataset.theme||'sage';OB=newOB();OB.d.name=ME?ME.name:'';try{localStorage.removeItem(LK())}catch(e){}
    try{if(DB.db)await DB.del(SK())}catch(e){}
    save();go('dashboard');render();toast('Application reset')}
};
ACT.safety=()=>modal({title:'Safety information',html:'<div class="mb"><p>Workout Planner &amp; Fitness Tracker is a <b>planning and tracking tool</b>. It does not provide medical advice, diagnose conditions, or prescribe rehabilitation or treatment, and it cannot guarantee any fitness, weight or health result.</p><ul><li>Choose exercises and weights that are appropriate for your current abilities.</li><li><b>Stop exercising</b> if you feel pain, dizziness, shortness of breath or any unusual symptoms.</li><li>If you have a medical condition, an injury, are pregnant, or have any health concern, speak with a qualified healthcare professional before starting a new exercise program.</li><li>Rest days are part of a healthy routine. Avoid extreme dieting or excessive exercise.</li><li>Sample workouts are general fitness examples, not individualized professional training prescriptions.</li></ul></div><div class="mf"><button type="button" class="btn pri" data-act="closeModal" autofocus>I understand</button></div>'});

/* ---------- WELCOME / ONBOARDING ---------- */
const newOB=()=>({step:0,tt:false,d:{name:'',age:'',level:'beginner',location:'home',goal:'general',days:[0,2,4],target:3,duration:45,equip:['none'],track:false,starter:true,ack:false}});
let OB=newOB();
function renderGate(){
  const g=$('#gate'),d=OB.d,st=OB.step;
  if(st===0){g.innerHTML='<div class="gate"><div class="box"><div class="center" style="margin-bottom:26px"><div class="brand" style="justify-content:center"><span class="logo" style="width:54px;height:54px;border-radius:16px">'+ic('dumb','" style="width:28px;height:28px')+'</span></div><h1 style="font-size:32px;margin-top:6px">Workout Planner &amp; Fitness Tracker</h1><p class="muted" style="font-size:17px">Plan Better. Train Smarter. Track Your Progress.</p></div>'
   +'<div class="card"><h2>Set up my profile</h2><p class="muted">Welcome, '+esc(ME?ME.name:'')+'! Answer a few quick questions and build your own plan. Takes about a minute.</p><button type="button" class="btn pri lg" data-act="obNext" autofocus>Get started</button><p class="small muted mt">Not '+esc(ME?ME.name:'you')+'? <button type="button" class="lnk" data-act="signOut" style="text-decoration:underline">Sign out</button></p></div>'
   +'<div class="disc mt"><b>Private &amp; offline.</b> Your data stays in this browser on this device. Back up your data from Settings. <button type="button" class="lnk" style="text-decoration:underline;font-weight:500" data-act="safety">Safety information</button></div></div></div>';return}
  let body='';
  const radio=(name,opts,cur)=>'<div class="choice" role="radiogroup">'+opts.map(o=>'<label><input type="radio" name="'+name+'" value="'+o[0]+'" data-chg="ob"'+(cur===o[0]?' checked':'')+'><span><b>'+o[1]+'</b>'+(o[2]?'<small>'+o[2]+'</small>':'')+'</span></label>').join('')+'</div>';
  if(st===1)body='<h2>About you</h2><p class="muted">This stays on your device and is used to personalize your dashboard.</p><div class="fgrid mt"><div class="field"><label class="f" for="ob-name">Your name</label><input id="ob-name" type="text" maxlength="40" data-inp="ob" data-k="name" value="'+esc(d.name)+'" autofocus required></div><div class="field"><label class="f" for="ob-age">Age (optional)</label><input id="ob-age" type="number" min="10" max="110" data-inp="ob" data-k="age" value="'+esc(d.age)+'"></div></div>'
   +'<label class="f" id="ob-lv">Fitness experience</label>'+radio('level',[['beginner','Beginner','New or returning to exercise'],['intermediate','Intermediate','Training regularly for a while'],['advanced','Advanced','Years of consistent training']],d.level)
   +'<label class="f mt" id="ob-lc">Preferred workout location</label>'+radio('location',[['home','Home'],['gym','Gym'],['outdoors','Outdoors']],d.location);
  if(st===2)body='<h2>Your goal & schedule</h2><label class="f mt" id="ob-g">Main fitness goal</label>'+radio('goal',Object.keys(GOALS).map(k=>[k,GOALS[k]]),d.goal)
   +'<label class="f mt" id="ob-d">Available training days</label><div class="daypick" role="group" aria-labelledby="ob-d">'+DAYS3.map((x,i)=>'<button type="button" data-act="obDay" data-d="'+i+'" aria-pressed="'+d.days.includes(i)+'" aria-label="'+DAYS[i]+'">'+x+'</button>').join('')+'</div>'
   +'<div class="fgrid mt"><div class="field"><label class="f" for="ob-t">Weekly workout target</label><input id="ob-t" type="number" min="1" max="14" data-inp="ob" data-k="target" value="'+d.target+'"><div class="hint">You can change this later in Settings.</div></div><div class="field"><label class="f" for="ob-du">Preferred workout duration</label><select id="ob-du" data-chg="ob" data-k="duration">'+[20,30,45,60,75,90].map(x=>'<option value="'+x+'"'+(d.duration===x?' selected':'')+'>'+x+' minutes</option>').join('')+'</select></div></div>';
  if(st===3)body='<h2>Equipment & finishing up</h2><label class="f mt" id="ob-e">Available equipment</label><div class="choice" role="group" aria-labelledby="ob-e">'+Object.keys(PROFILE_EQUIP).map(k=>'<label><input type="checkbox" value="'+k+'" data-chg="obEquip"'+(d.equip.includes(k)?' checked':'')+'><span><b>'+PROFILE_EQUIP[k]+'</b></span></label>').join('')+'</div>'
   +'<label class="switch mt"><span><b>Track body measurements</b><br><span class="small muted">Optional — weight, chest, waist, hips, arms, thighs. You can change this any time.</span></span><input type="checkbox" data-chg="ob" data-k="track"'+(d.track?' checked':'')+'></label>'
   +'<label class="switch"><span><b>Add a starter week</b><br><span class="small muted">Schedules general example workouts on your training days. Fully editable.</span></span><input type="checkbox" data-chg="ob" data-k="starter"'+(d.starter?' checked':'')+'></label>'
   +'<div class="disc mt"><label class="row" style="align-items:flex-start"><input type="checkbox" id="ob-ack" data-chg="ob" data-k="ack"'+(d.ack?' checked':'')+' style="margin-top:3px"><span>I understand this app is a planning and tracking tool, not medical advice. I will choose exercises appropriate to my abilities, stop if I feel pain, dizziness or unusual symptoms, and speak with a qualified healthcare professional first if I have a medical condition, injury or health concern.</span></label></div>';
  g.innerHTML='<div class="gate"><div class="box"><div class="card"><div class="steps" aria-label="Step '+st+' of 3">'+[1,2,3].map(i=>'<i class="'+(i<=st?'on':'')+'"></i>').join('')+'</div><p class="small muted">Step '+st+' of 3</p>'+body+'<div class="row between mt-l"><button type="button" class="btn" data-act="obBack">Back</button>'+(st<3?'<button type="button" class="btn pri" data-act="obNext">Continue</button>':'<button type="button" class="btn pri" data-act="obFinish">Finish setup</button>')+'</div></div></div></div>';
  const f=g.querySelector('[autofocus]');if(f)f.focus();
}
INP.ob=el=>{const k=el.dataset.k;if(k==='target'){OB.tt=true;OB.d.target=num(el.value)||1}else OB.d[k]=el.value};
CHG.ob=el=>{const k=el.dataset.k||el.name;if(el.type==='checkbox')OB.d[k]=el.checked;else if(k==='duration')OB.d.duration=+el.value;else OB.d[k]=el.value};
CHG.obEquip=el=>{let e=OB.d.equip.slice(),v=el.value;if(el.checked){if(v==='full')e=['full'];else{e=e.filter(x=>x!=='full');e.push(v)}}else e=e.filter(x=>x!==v);OB.d.equip=e;renderGate()};
ACT.obDay=el=>{const i=+el.dataset.d,a=OB.d.days,x=a.indexOf(i);if(x<0)a.push(i);else a.splice(x,1);if(!OB.tt)OB.d.target=Math.max(1,a.length);renderGate()};
ACT.obBack=()=>{OB.step=Math.max(0,OB.step-1);renderGate()};
ACT.obNext=()=>{
  if(OB.step===1&&!OB.d.name.trim()){toast('Please enter your name to continue.','err');const i=$('#ob-name');if(i){i.classList.add('bad');i.focus()}return}
  if(OB.step===1&&OB.d.age!==''&&(+OB.d.age<10||+OB.d.age>110)){toast('Please enter a valid age or leave it blank.','err');return}
  if(OB.step===2&&!OB.d.days.length){toast('Choose at least one training day.','err');return}
  OB.step++;renderGate();window.scrollTo(0,0);
};
ACT.obDemo=()=>{S=makeDemo();save();go('dashboard');render()};
ACT.obFinish=()=>{
  const d=OB.d;if(!d.ack){toast('Please confirm the safety statement to continue.','err');$('#ob-ack').focus();return}
  S.profile={name:d.name.trim(),age:d.age===''?'':Math.round(+d.age),level:d.level,goal:d.goal,location:d.location,days:d.days.slice().sort(),duration:d.duration,equip:d.equip.length?d.equip:['none'],start:today()};
  S.settings.weeklyTarget=clamp(Math.round(d.target)||d.days.length,1,14);S.settings.trackBody=d.track;S.meta.onboarded=true;S.meta.demo=false;S.meta.created=Date.now();
  if(!S.templates.length)S.templates=seedTemplates();
  S.plan=[];S.restDays=[false,false,false,false,false,false,false];
  if(d.starter)starterPlan();
  OB=newOB();save();go('dashboard');render();toast('Welcome, '+S.profile.name+'! Your dashboard is ready.','ok');
};

/* ---------- demo restrictions ---------- */
const DEMO_MSG='Switched off in the free demo. Create your account with your Etsy access code to use this.';
['exportBackup','exportCSV','printReport','resetApp'].forEach(k=>{const f=ACT[k];ACT[k]=function(el){if(MODE==='demo'){toast(DEMO_MSG,'err');return}return f.call(this,el)}});
{const f=CHG.importFile;CHG.importFile=el=>{if(MODE==='demo'){el.value='';toast(DEMO_MSG,'err');return}f(el)}}

/* ---------- STARTUP ---------- */
(async function boot(){
  try{
    await DB.init();await authLoad();
    applyTheme(globalTheme());S=blankState();buildNav();
    let sid=null;try{sid=sessionStorage.getItem('wpft-sess')}catch(e){}
    const rid=(AUTH.session&&AUTH.session.id)||sid,acc=rid&&AUTH.accounts.find(a=>a.id===rid);
    if(!location.hash)history.replaceState(null,'',location.pathname+location.search+'#/dashboard');
    if(acc)await startUser(acc,!!(AUTH.session&&AUTH.session.id===acc.id));else{MODE='auth';render()}
    $('#boot').remove();
    try{if(navigator.storage&&navigator.storage.persist)navigator.storage.persist()}catch(e){}
    setInterval(()=>{if(S&&S.active){$$('[data-elapsed]').forEach(e=>{e.textContent=fmtClock((Date.now()-S.active.startedAt)/1000)})}},1000);
    window.addEventListener('focus',syncFromStorage);
    if('serviceWorker' in navigator&&/^https?:$/.test(location.protocol)){try{if(!document.querySelector('link[rel=manifest]')){const l=document.createElement('link');l.rel='manifest';l.href='manifest.webmanifest';document.head.appendChild(l)}}catch(e){}navigator.serviceWorker.register('sw.js').catch(()=>{})}
    window.__ready=true;
  }catch(e){
    console.error(e);
    const b=document.getElementById('boot');if(b)b.innerHTML='<div class="card" style="max-width:520px;margin:60px auto"><h2>Something went wrong while starting the app</h2><p>'+esc(e.message)+'</p><p class="small muted">Try reloading the page. If this keeps happening, use a current version of Chrome, Edge, Firefox or Safari.</p></div>';
  }
})();
