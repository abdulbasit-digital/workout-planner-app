'use strict';
/* ===== Workout Planner & Fitness Tracker — core runtime ===== */
const APP_ID='workout-planner-fitness-tracker', APP_VERSION='1.1.0';

/* ---------- tiny utils ---------- */
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>Math.random().toString(36).slice(2,8)+Date.now().toString(36).slice(-4);
const pad=n=>String(n).padStart(2,'0');
const dkey=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const parseD=k=>{const [y,m,d]=k.split('-').map(Number);return new Date(y,m-1,d)};
const today=()=>dkey(new Date());
const addDays=(k,n)=>{const d=parseD(k);d.setDate(d.getDate()+n);return dkey(d)};
const wd=k=>(parseD(k).getDay()+6)%7;                 // Monday = 0
const startOfWeek=k=>addDays(k,-wd(k));
const diffDays=(a,b)=>Math.round((parseD(b)-parseD(a))/864e5);
const monthStart=k=>k.slice(0,8)+'01';
const monthEnd=k=>{const d=parseD(k);return dkey(new Date(d.getFullYear(),d.getMonth()+1,0))};
const fmtDate=(k,o)=>parseD(k).toLocaleDateString(undefined,o||{day:'numeric',month:'short',year:'numeric'});
const fmtDateS=k=>parseD(k).toLocaleDateString(undefined,{day:'numeric',month:'short'});
const fmtDateL=k=>parseD(k).toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'long',year:'numeric'});
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const sum=a=>a.reduce((x,y)=>x+y,0);
const num=v=>{if(v==null)return null;const s=String(v).trim().replace(',','.');if(s==='')return null;const n=Number(s);return isFinite(n)?n:null};
const clone=o=>JSON.parse(JSON.stringify(o));
const plural=(n,a,b)=>n+' '+(n===1?a:(b||a+'s'));

/* ---------- state ---------- */
let S=null;
function blankState(){
  return {v:1,
    meta:{demo:false,onboarded:false,created:Date.now(),saved:0,lastBackup:null},
    profile:{name:'',age:'',level:'beginner',goal:'general',location:'home',days:[0,2,4],duration:45,equip:['none'],start:today()},
    settings:{theme:'sage',units:{w:'kg',l:'cm',d:'km'},weeklyTarget:3,sound:true,autoRest:true,defaultRest:60,trackBody:false,
      tracked:{weight:true,chest:true,waist:true,hips:true,arms:true,thighs:true,pushups:true,plank:true,squat:true,bench:true,deadlift:true,runDist:true,runTime:true}},
    customEx:[],fav:[],plan:[],restDays:[false,false,false,false,false,false,false],templates:[],sessions:[],progress:[],goals:[],challenges:[],
    active:null,timer:{status:'idle',total:60,endsAt:0,remain:60}
  };
}
function normalize(st){
  const b=blankState(), o=Object.assign({},b,st), s=st.settings||{};
  o.meta=Object.assign({},b.meta,st.meta||{});o.profile=Object.assign({},b.profile,st.profile||{});
  o.settings=Object.assign({},b.settings,s);o.settings.units=Object.assign({},b.settings.units,s.units||{});o.settings.tracked=Object.assign({},b.settings.tracked,s.tracked||{});
  o.timer=Object.assign({},b.timer,st.timer||{});
  ['customEx','fav','plan','templates','sessions','progress','goals','challenges'].forEach(k=>{if(!Array.isArray(o[k]))o[k]=[]});
  if(!Array.isArray(o.restDays)||o.restDays.length!==7)o.restDays=b.restDays.slice();
  if(!Array.isArray(o.profile.days))o.profile.days=b.profile.days.slice();
  if(!Array.isArray(o.profile.equip))o.profile.equip=['none'];
  return o;
}

/* ---------- local storage layer (IndexedDB + localStorage mirror) ---------- */
let NS='',MODE='auth';const SK=()=>'state:'+NS,LK=()=>'wpft-state:'+NS;
const DB={db:null,mode:'memory',
  open(){return new Promise((res,rej)=>{
    if(!window.indexedDB)return rej(new Error('IndexedDB unavailable'));
    let r;try{r=indexedDB.open('wpft-db',1)}catch(e){return rej(e)}
    r.onupgradeneeded=()=>{try{r.result.createObjectStore('kv')}catch(e){}};
    r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error||new Error('IDB error'));r.onblocked=()=>rej(new Error('IDB blocked'));
    setTimeout(()=>rej(new Error('IDB timeout')),4000);
  })},
  get(k){return new Promise((res,rej)=>{const t=this.db.transaction('kv','readonly').objectStore('kv').get(k);t.onsuccess=()=>res(t.result);t.onerror=()=>rej(t.error)})},
  put(k,v){return new Promise((res,rej)=>{const tx=this.db.transaction('kv','readwrite');tx.objectStore('kv').put(v,k);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);tx.onabort=()=>rej(tx.error)})},
  del(k){return new Promise((res,rej)=>{const tx=this.db.transaction('kv','readwrite');tx.objectStore('kv').delete(k);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error)})},
  lsGet(){try{const t=localStorage.getItem(LK());return t?JSON.parse(t):null}catch(e){return null}},
  async init(){try{this.db=await this.open();this.mode='idb'}catch(e){this.db=null;try{localStorage.setItem('wpft-test','1');localStorage.removeItem('wpft-test');this.mode='ls'}catch(e2){this.mode='memory'}}},
  async load(){
    let a=null;if(this.db){try{a=await this.get(SK())}catch(e){a=null}}
    const b=this.lsGet();
    const pick=(a&&b)?((b.meta&&b.meta.saved||0)>(a.meta&&a.meta.saved||0)?b:a):(a||b);
    return pick&&typeof pick==='object'?pick:null;
  }
};
let saveT=null;
function save(){
  if(!S||MODE==='auth')return;S.meta.saved=Date.now();if(MODE==='demo'){setSaved('saved');return}setSaved('saving');
  clearTimeout(saveT);saveT=setTimeout(flush,200);
}
async function flush(){
  if(!S||MODE!=='user')return;clearTimeout(saveT);saveT=null;let ok=false;
  try{if(DB.db){await DB.put(SK(),S);ok=true}}catch(e){console.warn('IDB save failed',e)}
  try{localStorage.setItem(LK(),JSON.stringify(S));ok=true}catch(e){/* quota or blocked */}
  setSaved(ok?'saved':'error');
}
function flushSync(){ // last-chance synchronous mirror (page closing)
  if(!S||!saveT||MODE!=='user')return;try{localStorage.setItem(LK(),JSON.stringify(S))}catch(e){}flush();
}
function setSaved(st){
  const el=$('#saved');if(!el)return;
  if(MODE==='demo'){el.innerHTML='<i style="background:#E7AD62"></i>Demo · not saved';return}
  el.innerHTML=st==='saving'?'<i style="background:#E7AD62"></i>Saving…':st==='error'?'<i style="background:#D97777"></i>Not saved – export a backup':'<i></i>Saved on this device';
}
window.addEventListener('pagehide',flushSync);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')flushSync();else syncFromStorage()});
async function syncFromStorage(){ // pick up changes made in another tab
  try{if(!S||saveT||MODE!=='user')return;const st=await DB.load();if(st&&st.meta&&st.meta.saved>S.meta.saved){S=normalize(st);render(true)}}catch(e){}
}

/* ---------- units ---------- */
const KG2LB=2.20462262185,CM2IN=0.3937007874,KM2MI=0.6213711922;
function uName(k){const u=S.settings.units;return k==='w'?u.w:k==='l'?u.l:k==='d'?u.d:({reps:'reps',sec:'sec',min:'min'}[k]||'')}
function toDisp(k,v){if(v==null||v==='')return null;v=+v;const u=S.settings.units;
  if(k==='w'&&u.w==='lb')return v*KG2LB;if(k==='l'&&u.l==='in')return v*CM2IN;if(k==='d'&&u.d==='mi')return v*KM2MI;return v}
function fromDisp(k,v){if(v==null||v==='')return null;v=+v;const u=S.settings.units;let r=v;
  if(k==='w'&&u.w==='lb')r=v/KG2LB;else if(k==='l'&&u.l==='in')r=v/CM2IN;else if(k==='d'&&u.d==='mi')r=v/KM2MI;
  return Math.round(r*10000)/10000}
const fmtNum=(v,dp=1)=>v==null||isNaN(v)?'–':String(+(+v).toFixed(dp));
function inVal(k,v){const d=toDisp(k,v);return d==null?'':String(+d.toFixed(2))}           // value for an <input>
function fmtU(k,v,dp=1){const d=toDisp(k,v);return d==null?'–':fmtNum(d,dp)+' '+uName(k)}   // "12.5 kg"
function fmtSecs(s){s=Math.round(+s||0);return s<60?s+'s':Math.floor(s/60)+'m'+(s%60?' '+pad(s%60)+'s':'')}
function fmtMin(m){m=Math.round(+m||0);return m<60?m+' min':Math.floor(m/60)+'h'+(m%60?' '+pad(m%60)+'m':'')}
function fmtClock(s){s=Math.max(0,Math.round(s));return Math.floor(s/60)+':'+pad(s%60)}
function fmtMetric(key,v){const m=METRICS[key];if(v==null)return '–';
  if(m.u==='sec')return fmtSecs(v);if(m.u==='min')return fmtNum(v,1)+' min';if(m.u==='reps')return fmtNum(v,0)+' reps';return fmtU(m.u,v,m.u==='d'?2:1)}
function metricUnitLabel(key){const m=METRICS[key];return m.u==='sec'?'seconds':m.u==='min'?'minutes':m.u==='reps'?'reps':uName(m.u)}
function metricToDisp(key,v){const m=METRICS[key];return (m.u==='w'||m.u==='l'||m.u==='d')?toDisp(m.u,v):v}
function metricFromDisp(key,v){const m=METRICS[key];return (m.u==='w'||m.u==='l'||m.u==='d')?fromDisp(m.u,v):v}

/* ---------- icons ---------- */
const ICONS={
 home:'<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
 week:'<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 10h18M9 10v11M15 10v11"/>',
 cal:'<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 2v4M16 2v4M3 10h18"/>',
 dumb:'<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/>',
 book:'<path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2z"/><path d="M4 21V5"/>',
 layout:'<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
 play:'<path d="M7 4l13 8-13 8z"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 trend:'<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
 target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
 chart:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
 gear:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
 timer:'<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 edit:'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/>',
 trash:'<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>',
 copy:'<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 012-2h10"/>',
 star:'<path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>',
 check:'<path d="M5 12l5 5 9-10"/>',
 x:'<path d="M6 6l12 12M18 6L6 18"/>',
 chevL:'<path d="M15 18l-6-6 6-6"/>',chevR:'<path d="M9 18l6-6-6-6"/>',
 down:'<path d="M12 5v14M5 12l7 7 7-7"/>',up:'<path d="M12 19V5M5 12l7-7 7 7"/>',
 download:'<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>',upload:'<path d="M12 21V9M7 14l5-5 5 5M4 3h16"/>',
 shield:'<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
 dots:'<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>',
 flame:'<path d="M12 3c1 4 5 5 5 10a5 5 0 01-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z"/>',
 moon:'<path d="M20 14A8 8 0 1110 4a7 7 0 0010 10z"/>',
 print:'<path d="M6 9V3h12v6M6 18H4v-7h16v7h-2M6 14h12v7H6z"/>',
 skip:'<path d="M5 4l10 8-10 8zM19 5v14"/>',
 search:'<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
 pause:'<path d="M8 5v14M16 5v14"/>',
 reset:'<path d="M3 12a9 9 0 109-9 9 9 0 00-6.4 2.6L3 8"/><path d="M3 3v5h5"/>',
 note:'<path d="M5 3h10l4 4v14H5z"/><path d="M9 12h6M9 16h6"/>',
 move:'<path d="M5 12h14M13 6l6 6-6 6"/>',
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
 bolt:'<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>'
};
const ic=(n,cls)=>'<svg class="ic'+(cls?' '+cls:'')+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'+(ICONS[n]||'')+'</svg>';

/* ---------- event delegation ---------- */
const ACT={},SUB={},CHG={},INP={};
document.addEventListener('click',e=>{
  const t=e.target.closest('[data-act]');if(!t||t.disabled)return;
  const f=ACT[t.dataset.act];if(!f)return;
  if(t.tagName==='A'&&!t.getAttribute('href'))e.preventDefault();
  try{f(t,e)}catch(err){console.error(err);toast('Something went wrong: '+err.message,'err')}
});
document.addEventListener('submit',e=>{
  const f=e.target.closest('[data-submit]');if(!f)return;e.preventDefault();
  const h=SUB[f.dataset.submit];if(h){try{h(f,new FormData(f),e)}catch(err){console.error(err);toast('Something went wrong: '+err.message,'err')}}
});
document.addEventListener('change',e=>{const t=e.target.closest('[data-chg]');if(t&&CHG[t.dataset.chg]){try{CHG[t.dataset.chg](t,e)}catch(err){console.error(err)}}});
document.addEventListener('input',e=>{const t=e.target.closest('[data-inp]');if(t&&INP[t.dataset.inp]){try{INP[t.dataset.inp](t,e)}catch(err){console.error(err)}}});

/* ---------- modal / confirm / toast ---------- */
const MODALS=[];
function modal(o){
  const ov=document.createElement('div');ov.className='overlay';
  const id='mt'+uid();
  ov.innerHTML='<div class="modal '+(o.size||'')+'" role="dialog" aria-modal="true" aria-labelledby="'+id+'"><div class="mh"><h2 id="'+id+'">'+esc(o.title||'')+'</h2><button type="button" class="icon-btn" data-act="closeModal" aria-label="Close dialog">'+ic('x')+'</button></div><div class="mb-wrap">'+o.html+'</div></div>';
  const prev=document.activeElement;
  ov._prev=prev;ov._opts=o;
  ov.addEventListener('mousedown',e=>{if(e.target===ov&&o.dismiss!==false)closeModal()});
  $('#modal-root').appendChild(ov);MODALS.push(ov);document.body.style.overflow='hidden';
  const f=ov.querySelector('[autofocus],input:not([type=hidden]),select,textarea')||ov.querySelector('.modal button');
  setTimeout(()=>{try{(ov.querySelector('[autofocus]')||f||ov).focus({preventScroll:true})}catch(e){}},20);
  return ov;
}
function closeModal(res){
  const ov=MODALS.pop();if(!ov)return;
  const cb=ov._opts&&ov._opts.onClose;ov.remove();
  if(!MODALS.length)document.body.style.overflow='';
  try{if(ov._prev&&document.contains(ov._prev))ov._prev.focus({preventScroll:true})}catch(e){}
  if(cb)cb(res);
}
function closeAllModals(){while(MODALS.length)closeModal()}
ACT.closeModal=()=>closeModal();
document.addEventListener('keydown',e=>{
  const ov=MODALS[MODALS.length-1];if(!ov)return;
  if(e.key==='Escape'&&ov._opts.dismiss!==false){e.preventDefault();closeModal();return}
  if(e.key==='Tab'){
    const f=$$('a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',ov).filter(x=>x.offsetParent!==null);
    if(!f.length)return;const a=f[0],b=f[f.length-1];
    if(e.shiftKey&&document.activeElement===a){e.preventDefault();b.focus()}
    else if(!e.shiftKey&&document.activeElement===b){e.preventDefault();a.focus()}
    else if(!ov.contains(document.activeElement)){e.preventDefault();a.focus()}
  }
});
function confirmDlg(o){
  return new Promise(res=>{
    let done=false;const fin=v=>{if(done)return;done=true;res(v)};
    const ov=modal({title:o.title||'Are you sure?',dismiss:true,onClose:()=>fin(false),
      html:'<div class="mb"><p>'+(o.html||esc(o.msg||''))+'</p></div><div class="mf"><button type="button" class="btn" data-act="closeModal">'+esc(o.cancel||'Cancel')+'</button><button type="button" class="btn '+(o.danger?'dsolid':'pri')+'" data-confirm-ok autofocus>'+esc(o.ok||'Confirm')+'</button></div>'});
    ov.querySelector('[data-confirm-ok]').addEventListener('click',()=>{fin(true);closeModal()});
  });
}
function toast(msg,type){
  const t=document.createElement('div');t.className='toast '+(type||'');t.textContent=msg;$('#toasts').appendChild(t);
  setTimeout(()=>t.remove(),type==='err'?5200:3200);
}
function downloadFile(name,text,mime){
  const b=new Blob([text],{type:mime||'text/plain'}),a=document.createElement('a');
  a.href=URL.createObjectURL(b);a.download=name;document.body.appendChild(a);a.click();
  setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1500);
}
const csvCell=v=>{v=v==null?'':String(v);return /[",\n\r]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v};
const toCSV=rows=>'﻿'+rows.map(r=>r.map(csvCell).join(',')).join('\r\n');

/* ---------- charts (self-contained SVG, no libraries) ---------- */
let CH=[];
function chartHost(fn,h,label){CH.push(fn);return '<div class="chart" data-cid="'+(CH.length-1)+'" style="min-height:'+(h||190)+'px" role="img" aria-label="'+esc(label||'Chart')+'"></div>'}
let lastCW=0;
function drawCharts(force){
  $$('.chart[data-cid]').forEach(el=>{const w=Math.floor(el.clientWidth);if(w<60)return;
    try{el.innerHTML=CH[+el.dataset.cid](w)}catch(e){console.error('chart',e)}});
}
let rzT=null;window.addEventListener('resize',()=>{clearTimeout(rzT);rzT=setTimeout(()=>{const v=$('#view');if(v&&Math.abs(v.clientWidth-lastCW)>8){lastCW=v.clientWidth;drawCharts()}},150)});
function niceMax(v){if(v<=0)return 1;const p=Math.pow(10,Math.floor(Math.log10(v))),n=v/p;return (n<=1?1:n<=2?2:n<=2.5?2.5:n<=5?5:10)*p}
function axisFmt(v,dp){return Math.abs(v)>=1000?(v/1000).toFixed(v%1000?1:0)+'k':String(+v.toFixed(dp==null?1:dp))}
function barChart(w,o){
  const h=o.h||190,pl=36,pr=8,pt=16,pb=26,iw=w-pl-pr,ih=h-pt-pb,d=o.data,n=d.length||1;
  const raw=Math.max(o.target||0,...d.map(x=>x.v),1),isInt=d.every(x=>Number.isInteger(x.v))&&Number.isInteger(o.target||0);
  let max,steps=4;
  if(isInt&&raw<=12){const m=Math.ceil(raw);if(m<=5){max=m;steps=m}else{max=Math.ceil(m/4)*4;steps=4}}else max=niceMax(raw);
  let s='<svg width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h+'">';
  for(let i=0;i<=steps;i++){const y=pt+ih-ih*i/steps;s+='<line x1="'+pl+'" x2="'+(w-pr)+'" y1="'+y+'" y2="'+y+'" stroke="#E7EBEF"/><text x="'+(pl-6)+'" y="'+(y+4)+'" text-anchor="end" font-size="10.5" fill="#64748B">'+axisFmt(max*i/steps)+'</text>'}
  const slot=iw/n,bw=Math.min(40,slot*.62),step=Math.max(1,Math.ceil(n*(o.lw||44)/iw));
  d.forEach((x,i)=>{
    const bh=x.v/max*ih,bx=pl+slot*i+(slot-bw)/2,by=pt+ih-bh;
    s+='<rect x="'+bx+'" y="'+by+'" width="'+bw+'" height="'+Math.max(bh,x.v>0?2:0)+'" rx="5" fill="'+(x.c||o.color||'#7C9A83')+'"><title>'+esc(x.tip||(x.l+': '+x.v))+'</title></rect>';
    if(x.v>0&&bw>=14&&n<=16)s+='<text x="'+(bx+bw/2)+'" y="'+(by-4)+'" text-anchor="middle" font-size="10.5" font-weight="600" fill="#202B35">'+(o.fmt?o.fmt(x.v):x.v)+'</text>';
    if(i%step===0)s+='<text x="'+(bx+bw/2)+'" y="'+(h-8)+'" text-anchor="middle" font-size="10.5" fill="#64748B">'+esc(x.l)+'</text>';
  });
  if(o.target){const y=pt+ih-o.target/max*ih;s+='<line x1="'+pl+'" x2="'+(w-pr)+'" y1="'+y+'" y2="'+y+'" stroke="#E7AD62" stroke-width="1.5" stroke-dasharray="5 4"/><text x="'+(w-pr)+'" y="'+(y-4)+'" text-anchor="end" font-size="10.5" fill="#8A5A14" font-weight="600">'+esc(o.targetLabel||'Target')+'</text>'}
  return s+'</svg>';
}
function lineChart(w,o){
  const h=o.h||200,pl=40,pr=14,pt=16,pb=26,iw=w-pl-pr,ih=h-pt-pb,p=o.pts;
  if(!p.length)return '';
  const ys=p.map(x=>x.y);let mn=Math.min(...ys),mx=Math.max(...ys);
  if(o.zero){mn=0}else{const pd=(mx-mn)*.2||Math.max(1,Math.abs(mx)*.05);mn=mn-pd;mx=mx+pd}
  if(mx===mn){mx=mn+1}
  const dp=(mx-mn)<1?2:(mx-mn)<10?1:0;
  if(o.zero)mx=niceMax(mx);
  const xs=p.map(x=>x.x),x0=Math.min(...xs),x1=Math.max(...xs);
  const px=v=>p.length===1||x1===x0?pl+iw/2:pl+(v-x0)/(x1-x0)*iw,py=v=>pt+ih-(v-mn)/(mx-mn)*ih;
  let s='<svg width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h+'">';
  for(let i=0;i<=4;i++){const v=mn+(mx-mn)*i/4,y=py(v);s+='<line x1="'+pl+'" x2="'+(w-pr)+'" y1="'+y+'" y2="'+y+'" stroke="#E7EBEF"/><text x="'+(pl-6)+'" y="'+(y+4)+'" text-anchor="end" font-size="10.5" fill="#64748B">'+axisFmt(v,dp)+'</text>'}
  const path=p.map((q,i)=>(i?'L':'M')+px(q.x).toFixed(1)+' '+py(q.y).toFixed(1)).join(' ');
  if(p.length>1)s+='<path d="'+path+' L'+px(p[p.length-1].x)+' '+(pt+ih)+' L'+px(p[0].x)+' '+(pt+ih)+' Z" fill="'+(o.color||'#7C9A83')+'" opacity=".12"/>';
  s+='<path d="'+path+'" fill="none" stroke="'+(o.color||'#7C9A83')+'" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>';
  p.forEach(q=>{s+='<circle cx="'+px(q.x)+'" cy="'+py(q.y)+'" r="4" fill="#fff" stroke="'+(o.color||'#7C9A83')+'" stroke-width="2.5"><title>'+esc(q.tip||q.y)+'</title></circle>'});
  const L=o.labels||[];const idxs=p.length<=4?p.map((_,i)=>i):[0,Math.floor((p.length-1)/2),p.length-1];
  idxs.forEach((i,k)=>{const t=L[i];if(t==null)return;s+='<text x="'+clamp(px(p[i].x),pl+14,w-pr-14)+'" y="'+(h-8)+'" text-anchor="'+(idxs.length>1&&k===0?'start':k===idxs.length-1&&idxs.length>1?'end':'middle')+'" font-size="10.5" fill="#64748B">'+esc(t)+'</text>'});
  return s+'</svg>';
}
const PALETTE=['#7C9A83','#202B35','#E7AD62','#64748B','#A8C0AE','#D97777','#5B8DB8','#B9A5D6','#C9B18A'];
function donut(data,size){
  size=size||150;const tot=sum(data.map(d=>d.v));if(!tot)return '';
  const r=size/2-12,c=2*Math.PI*r;let off=0,s='<svg width="'+size+'" height="'+size+'" viewBox="0 0 '+size+' '+size+'" role="img" aria-label="Distribution chart"><g transform="rotate(-90 '+size/2+' '+size/2+')">';
  data.forEach((d,i)=>{const len=d.v/tot*c;s+='<circle cx="'+size/2+'" cy="'+size/2+'" r="'+r+'" fill="none" stroke="'+(d.c||PALETTE[i%PALETTE.length])+'" stroke-width="22" stroke-dasharray="'+len+' '+(c-len)+'" stroke-dashoffset="'+(-off)+'"><title>'+esc(d.l+': '+d.v)+'</title></circle>';off+=len});
  return s+'</g></svg>';
}
function ring(pct,size,label){
  size=size||120;const r=size/2-9,c=2*Math.PI*r,p=clamp(pct,0,100);
  return '<span class="ring" style="width:'+size+'px;height:'+size+'px" role="img" aria-label="'+esc(label||p+' percent')+'"><svg width="'+size+'" height="'+size+'" viewBox="0 0 '+size+' '+size+'"><circle cx="'+size/2+'" cy="'+size/2+'" r="'+r+'" fill="none" stroke="#EEF1F4" stroke-width="10"/><circle cx="'+size/2+'" cy="'+size/2+'" r="'+r+'" fill="none" stroke="#7C9A83" stroke-width="10" stroke-linecap="round" stroke-dasharray="'+(c*p/100)+' '+c+'" transform="rotate(-90 '+size/2+' '+size/2+')"/></svg><b>'+Math.round(p)+'%</b></span>';
}
const bar=(pct,cls)=>'<div class="bar '+(cls||'')+'" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+Math.round(clamp(pct,0,100))+'"><i style="width:'+clamp(pct,0,100)+'%"></i></div>';
