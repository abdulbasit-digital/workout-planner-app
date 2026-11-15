/* ===== Access gate, accounts, user menu, themes, install, guide ===== */
/* Access code(s) are stored only as SHA-256 hashes. To change the code, replace the hash below:
   sha256("wpft:" + CODE_UPPERCASE_LETTERS_AND_DIGITS_ONLY)  e.g. "WORKOUT-ETSY" -> "wpft:WORKOUTETSY" */
const ACCESS_HASHES=['210a54c127545d614e7ae059633860f1bf44323846bfdd6ebc830d358738686c'];
const AUTHK='wpft-auth',THEMEK='wpft-theme';
const AUTH={accounts:[],session:null,fails:0,lock:0};
let ME=null,AU={tab:'in'};
const THEMES=[['sage','Sage','Calm light theme (default)','#7C9A83','#F7F8FA'],['dark','Midnight','Easy on the eyes at night','#8FB398','#12181E'],['ocean','Ocean','Cool blue accents','#5B8DB8','#F4F8FB'],['sand','Sand','Warm neutral tones','#B58A5A','#FAF6F0']];
const enc=s=>new TextEncoder().encode(s),hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
const HAS_SUBTLE=!!(window.crypto&&crypto.subtle);
function sha256js(str){ // pure-JS fallback (used only when WebCrypto is unavailable)
  const K=[],H=[];let n=2,c=0;while(c<64){let p=true;for(let i=2;i*i<=n;i++)if(n%i===0){p=false;break}if(p){K.push(Math.floor((Math.cbrt(n)%1)*4294967296));if(c<8)H.push(Math.floor((Math.sqrt(n)%1)*4294967296));c++}n++}
  const u=unescape(encodeURIComponent(str)),l=u.length,W=new Array((((l+8)>>6)+1)*16).fill(0);
  for(let i=0;i<l;i++)W[i>>2]|=u.charCodeAt(i)<<(24-(i%4)*8);W[l>>2]|=0x80<<(24-(l%4)*8);W[W.length-1]=l*8;
  const rot=(x,k)=>(x>>>k)|(x<<(32-k)),h=H.slice(),w=new Array(64);
  for(let o=0;o<W.length;o+=16){
    for(let t=0;t<64;t++){if(t<16)w[t]=W[o+t];else{const a=w[t-15],b=w[t-2];w[t]=(w[t-16]+(rot(a,7)^rot(a,18)^(a>>>3))+w[t-7]+(rot(b,17)^rot(b,19)^(b>>>10)))|0}}
    let [a,b,cc,d,e,f,g,hh]=h;
    for(let t=0;t<64;t++){const t1=(hh+(rot(e,6)^rot(e,11)^rot(e,25))+((e&f)^(~e&g))+K[t]+w[t])|0,t2=((rot(a,2)^rot(a,13)^rot(a,22))+((a&b)^(a&cc)^(b&cc)))|0;hh=g;g=f;f=e;e=(d+t1)|0;d=cc;cc=b;b=a;a=(t1+t2)|0}
    h[0]=(h[0]+a)|0;h[1]=(h[1]+b)|0;h[2]=(h[2]+cc)|0;h[3]=(h[3]+d)|0;h[4]=(h[4]+e)|0;h[5]=(h[5]+f)|0;h[6]=(h[6]+g)|0;h[7]=(h[7]+hh)|0;
  }
  return h.map(x=>(x>>>0).toString(16).padStart(8,'0')).join('');
}
async function sha256(s){return HAS_SUBTLE?hex(await crypto.subtle.digest('SHA-256',enc(s))):sha256js(s)}
async function pwHash(pw,salt,scheme){
  scheme=scheme||(HAS_SUBTLE?'p1':'s1');
  if(scheme==='p1'){if(!HAS_SUBTLE)throw new Error('unsupported');const k=await crypto.subtle.importKey('raw',enc(pw),'PBKDF2',false,['deriveBits']);return 'p1:'+hex(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:enc(salt),iterations:120000},k,256))}
  let h=sha256js(salt+':'+pw);for(let i=0;i<3000;i++)h=sha256js(h+salt);return 's1:'+h;
}
const normCode=x=>String(x||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
async function codeOK(x){const n=normCode(x);return !!n&&ACCESS_HASHES.includes(await sha256('wpft:'+n))}
const randSalt=()=>{const a=new Uint8Array(16);try{crypto.getRandomValues(a)}catch(e){for(let i=0;i<16;i++)a[i]=Math.random()*256}return hex(a)};
const userKey=u=>String(u||'').trim().toLowerCase();

async function authLoad(){
  let o=null;try{const t=localStorage.getItem(AUTHK);if(t)o=JSON.parse(t)}catch(e){}
  if(!o&&DB.db){try{o=await DB.get('auth')}catch(e){}}
  if(o&&Array.isArray(o.accounts)){AUTH.accounts=o.accounts;AUTH.session=o.session||null}
}
async function authSave(){
  const o={accounts:AUTH.accounts,session:AUTH.session};
  try{localStorage.setItem(AUTHK,JSON.stringify(o))}catch(e){}
  try{if(DB.db)await DB.put('auth',o)}catch(e){}
}
function applyTheme(t){
  if(!THEMES.some(x=>x[0]===t))t='sage';
  document.documentElement.dataset.theme=t;
  const m=document.querySelector('meta[name=theme-color]');if(m)m.content=(THEMES.find(x=>x[0]===t)||[])[4]==='#12181E'?'#12181E':'#202B35';
  try{localStorage.setItem(THEMEK,t)}catch(e){}
}
function globalTheme(){try{return localStorage.getItem(THEMEK)||'sage'}catch(e){return 'sage'}}

/* ---------- session start / end ---------- */
async function startUser(acc,stay){
  MODE='user';NS=acc.id;ME=acc;
  AUTH.session=stay?{id:acc.id}:null;try{sessionStorage.setItem('wpft-sess',acc.id)}catch(e){}
  await authSave();
  let st=null;try{st=await DB.load()}catch(e){}
  if(st&&typeof st==='object'){try{S=normalize(st)}catch(e){try{localStorage.setItem('wpft-corrupt-backup',JSON.stringify(st))}catch(e2){}S=blankState();S.templates=seedTemplates()}}
  else{S=blankState();S.templates=seedTemplates();S.settings.theme=globalTheme()}
  if(!S.templates.length&&!S.meta.onboarded)S.templates=seedTemplates();
  OB=newOB();OB.d.name=acc.name;
  applyTheme(S.settings.theme);buildNav();T.resumeOnLoad();syncAuto();
  history.replaceState(null,'',location.pathname+location.search+'#/dashboard');
  render();setSaved(DB.mode==='memory'?'error':'saved');window.scrollTo(0,0);
}
function enterDemo(){
  MODE='demo';NS='demo';ME=null;S=makeDemo();S.settings.theme=globalTheme();applyTheme(S.settings.theme);
  buildNav();T.reset();history.replaceState(null,'',location.pathname+location.search+'#/dashboard');render();setSaved('saved');window.scrollTo(0,0);
}
async function leaveSession(){
  if(MODE==='user'){try{await flush()}catch(e){}}
  closeAllModals();closeUserMenu();
  AUTH.session=null;try{sessionStorage.removeItem('wpft-sess')}catch(e){}await authSave();
  MODE='auth';NS='';ME=null;S=blankState();T.reset();AU={tab:'in'};applyTheme(globalTheme());
  history.replaceState(null,'',location.pathname+location.search+'#/dashboard');render();
}

/* ---------- auth screen ---------- */
const LOGO='<span class="logo" style="width:56px;height:56px;border-radius:17px;margin:0 auto">'+ic('dumb','" style="width:28px;height:28px')+'</span>';
function pwField(id,label,name,auto,extra){return '<div class="field"><label class="f" for="'+id+'">'+label+'</label><div class="pw"><input id="'+id+'" name="'+name+'" type="password" autocomplete="'+auto+'" required '+(extra||'')+'><button type="button" class="icon-btn" data-act="togglePw" data-t="'+id+'" aria-label="Show or hide password"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg></button></div></div>'}
function renderAuth(){
  const g=$('#gate'),up=AU.tab==='up';
  const form=up?
   '<form data-submit="authUp" autocomplete="on" novalidate><div class="fgrid"><div class="field"><label class="f" for="a-name">Your name</label><input id="a-name" name="name" type="text" maxlength="40" autocomplete="name" required></div><div class="field"><label class="f" for="a-user">Choose a username</label><input id="a-user" name="user" type="text" maxlength="30" autocomplete="username" autocapitalize="none" required><div class="hint">Letters, numbers, dot, dash or underscore.</div></div></div>'
   +'<div class="fgrid">'+pwField('a-pw','Create a password (min. 6 characters)','pw','new-password','minlength="6"')+pwField('a-pw2','Confirm password','pw2','new-password')+'</div>'
   +'<div class="field"><label class="f" for="a-code">Etsy access code</label><input id="a-code" name="code" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="e.g. WORKOUT-ETSY" required><div class="hint">You will find it in your Etsy purchase message and in the README.</div></div>'
   +'<div id="a-err" class="banner err" role="alert" hidden></div><button class="btn pri lg" style="width:100%">Create my account</button></form>'
  :'<form data-submit="authIn" autocomplete="on" novalidate><div class="field"><label class="f" for="a-user">Username</label><input id="a-user" name="user" type="text" autocomplete="username" autocapitalize="none" required></div>'
   +pwField('a-pw','Password','pw','current-password')
   +'<label class="row small" style="margin:2px 0 12px"><input type="checkbox" name="stay" checked> Keep me signed in on this device</label>'
   +'<div id="a-err" class="banner err" role="alert" hidden></div><button class="btn pri lg" style="width:100%">Sign in</button><p class="center small mt"><button type="button" class="lnk" data-act="forgotPw" style="text-decoration:underline">Forgot your password?</button></p></form>';
  g.innerHTML='<div class="gate"><div class="box" style="max-width:480px"><div class="center" style="margin-bottom:20px">'+LOGO+'<h1 style="font-size:28px;margin-top:10px">Workout Planner &amp; Fitness Tracker</h1><p class="muted">Plan Better. Train Smarter. Track Your Progress.</p></div>'
   +'<div class="card"><div class="seg" role="tablist" aria-label="Sign in or create account"><button type="button" role="tab" aria-selected="'+!up+'" data-act="authTab" data-t="in">Sign in</button><button type="button" role="tab" aria-selected="'+up+'" data-act="authTab" data-t="up">Create account</button></div><div class="mt">'+form+'</div></div>'
   +'<div class="card mt center"><b>Not a buyer yet?</b><p class="small muted" style="margin:4px 0 10px">Look around with fictional sample data — nothing is saved and exports are switched off.</p><button type="button" class="btn" data-act="startDemo">'+ic('play')+'Try the free demo</button></div>'
   +'<div class="row wrap center mt" style="justify-content:center;gap:8px"><button type="button" class="btn sm" data-act="installApp" id="inst-auth" hidden>'+ic('download')+'Install app</button><button type="button" class="btn sm ghost" data-act="themes">Theme</button><button type="button" class="btn sm ghost" data-act="safety">Safety information</button></div>'
   +'<p class="small muted center mt">Private &amp; offline — your data stays on this device. Accounts are local to this browser.</p></div></div>';
  syncInstallUI();
  const f=g.querySelector('input');if(f&&!('ontouchstart' in window))f.focus();
}
const authErr=m=>{const e=$('#a-err');if(!e)return;e.textContent=m;e.hidden=false;const i=e.closest('form').querySelector('.bad,input');if(i)i.focus()};
ACT.authTab=el=>{AU.tab=el.dataset.t;renderAuth()};
ACT.startDemo=()=>enterDemo();
ACT.togglePw=el=>{const i=document.getElementById(el.dataset.t);if(i)i.type=i.type==='password'?'text':'password'};
const lockMsg=()=>{const s=Math.ceil((AUTH.lock-Date.now())/1000);return s>0?'Too many attempts. Please wait '+s+' seconds and try again.':''};
SUB.authIn=async(f,fd)=>{
  const m=lockMsg();if(m)return authErr(m);
  const u=userKey(fd.get('user')),pw=String(fd.get('pw')||'');
  if(!u||!pw)return authErr('Enter your username and password.');
  const acc=AUTH.accounts.find(a=>a.key===u);let ok=false;
  if(acc){try{ok=(await pwHash(pw,acc.salt,acc.hash.split(':')[0]))===acc.hash}catch(e){ok=false}}
  if(!ok){AUTH.fails++;if(AUTH.fails>=5){AUTH.lock=Date.now()+30000;AUTH.fails=0}return authErr(acc||!AUTH.accounts.length?'That username and password do not match.':'No account with that username on this device. Use “Create account” with your Etsy access code.')}
  AUTH.fails=0;await startUser(acc,!!fd.get('stay'));
};
SUB.authUp=async(f,fd)=>{
  const name=String(fd.get('name')||'').trim(),user=String(fd.get('user')||'').trim(),pw=String(fd.get('pw')||''),pw2=String(fd.get('pw2')||''),code=fd.get('code');
  const m=lockMsg();if(m)return authErr(m);
  if(!name)return authErr('Please enter your name.');
  if(!/^[A-Za-z0-9._-]{3,30}$/.test(user))return authErr('Username must be 3–30 characters: letters, numbers, dot, dash or underscore.');
  if(AUTH.accounts.some(a=>a.key===userKey(user)))return authErr('That username is already taken on this device. Sign in instead, or choose another.');
  if(pw.length<6)return authErr('Password must be at least 6 characters.');
  if(pw!==pw2)return authErr('The two passwords do not match.');
  if(!await codeOK(code)){AUTH.fails++;if(AUTH.fails>=5){AUTH.lock=Date.now()+30000;AUTH.fails=0}return authErr('That access code is not valid. Check your Etsy purchase message (it looks like WORD-ETSY).')}
  const salt=randSalt(),acc={id:'u'+Date.now().toString(36)+randSalt().slice(0,4),key:userKey(user),user:user,name:name,salt:salt,created:Date.now()};
  try{acc.hash=await pwHash(pw,salt)}catch(e){return authErr('Could not secure your password in this browser.')}
  AUTH.accounts.push(acc);AUTH.fails=0;await startUser(acc,true);toast('Account created. Welcome, '+name+'!','ok');
};
ACT.forgotPw=()=>modal({title:'Reset your password',html:'<form data-submit="resetPw"><div class="mb"><p class="small muted">Accounts live on this device only, so there is no e-mail reset. Confirm your username and Etsy access code to choose a new password. Your saved workouts are kept.</p><div class="field"><label class="f" for="r-user">Username</label><input id="r-user" name="user" type="text" autocapitalize="none" required></div><div class="field"><label class="f" for="r-code">Etsy access code</label><input id="r-code" name="code" type="text" autocomplete="off" autocapitalize="characters" required></div>'+pwField('r-pw','New password (min. 6 characters)','pw','new-password')+'<div id="r-err" class="banner err" role="alert" hidden></div></div><div class="mf"><button type="button" class="btn" data-act="closeModal">Cancel</button><button class="btn pri">Set new password</button></div></form>'});
SUB.resetPw=async(f,fd)=>{
  const e=$('#r-err'),bad=m=>{e.textContent=m;e.hidden=false};
  const m=lockMsg();if(m)return bad(m);
  const acc=AUTH.accounts.find(a=>a.key===userKey(fd.get('user'))),pw=String(fd.get('pw')||'');
  if(!acc||!await codeOK(fd.get('code'))){AUTH.fails++;if(AUTH.fails>=5){AUTH.lock=Date.now()+30000;AUTH.fails=0}return bad('Username or access code not recognised.')}
  if(pw.length<6)return bad('Password must be at least 6 characters.');
  acc.salt=randSalt();acc.hash=await pwHash(pw,acc.salt);await authSave();closeAllModals();toast('Password updated. You can sign in now.','ok');
};

/* ---------- top-bar user menu ---------- */
function closeUserMenu(){const m=$('#umenu');if(m)m.remove();const b=$('#ubtn');if(b)b.setAttribute('aria-expanded','false')}
ACT.userMenu=el=>{
  if($('#umenu')){closeUserMenu();return}
  const demo=MODE==='demo',nm=demo?'Demo visitor':(ME?ME.name:'');
  const item=(a,i,t,extra)=>'<button type="button" role="menuitem" data-act="'+a+'"'+(extra||'')+'>'+ic(i)+'<span>'+t+'</span></button>';
  const h='<div class="who"><span class="av lg">'+esc((nm||'?').charAt(0).toUpperCase())+'</span><div><b>'+esc(nm)+'</b><small>'+(demo?'Free demo — sample data':'@'+esc(ME?ME.user:''))+'</small></div></div>'
   +(demo?item('exitDemo','plus','Create my account'):item('menuGo','gear','Profile &amp; settings',' data-r="settings"')+item('security','shield','Security &amp; password'))
   +item('themes','star','Themes')+item('menuGo','info','Guide &amp; About',' data-r="guide"')
   +'<span id="inst-menu" hidden>'+item('installApp','download','Install app')+'</span>'
   +(demo?'':item('exportBackup','download','Download backup'))
   +'<hr>'+item(demo?'exitDemo':'signOut','x',demo?'Exit demo':'Sign out');
  const d=document.createElement('div');d.id='umenu';d.className='umenu';d.setAttribute('role','menu');d.innerHTML=h;
  $('.top').appendChild(d);$('#ubtn').setAttribute('aria-expanded','true');syncInstallUI();
  const f=d.querySelector('button');if(f)f.focus();
  d.addEventListener('keydown',e=>{const b=[...d.querySelectorAll('button:not([hidden])')],i=b.indexOf(document.activeElement);if(e.key==='ArrowDown'){e.preventDefault();b[(i+1)%b.length].focus()}else if(e.key==='ArrowUp'){e.preventDefault();b[(i-1+b.length)%b.length].focus()}});
};
document.addEventListener('click',e=>{if($('#umenu')&&!e.target.closest('#umenu,#ubtn'))closeUserMenu();else if(e.target.closest('#umenu button')&&!e.target.closest('[data-act=userMenu]'))setTimeout(closeUserMenu,0)});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('#umenu')){closeUserMenu();const b=$('#ubtn');if(b)b.focus()}});
ACT.menuGo=el=>{go(el.dataset.r)};
ACT.exitDemo=async()=>{await leaveSession();AU={tab:'up'};render()};
ACT.signOut=()=>leaveSession();
function renderUserBits(){
  const demo=MODE==='demo',nm=demo?'Demo':(ME?ME.name:''),a=$('#uav'),n=$('#uname');
  if(a)a.textContent=(nm||'?').charAt(0).toUpperCase();if(n)n.textContent=nm;
  const dm=$('#demo-pill');if(dm)dm.hidden=!demo;
}

/* ---------- themes ---------- */
ACT.themes=()=>{
  const cur=(S&&S.settings&&S.settings.theme)||globalTheme();
  modal({title:'Choose a theme',html:'<div class="mb"><div class="choice" role="radiogroup">'+THEMES.map(t=>'<label><input type="radio" name="theme" value="'+t[0]+'" data-chg="theme"'+(cur===t[0]?' checked':'')+'><span style="display:flex;gap:10px;align-items:center"><i class="sw" style="background:'+t[4]+';border-color:'+t[3]+'"><b style="background:'+t[3]+'"></b></i><span><b>'+t[1]+'</b><small>'+t[2]+'</small></span></span></label>').join('')+'</div></div><div class="mf"><button type="button" class="btn pri" data-act="closeModal">Done</button></div>'});
};
CHG.theme=el=>{if(S&&S.settings)S.settings.theme=el.value;applyTheme(el.value);save();if(MODE!=='auth')refresh()};

/* ---------- security ---------- */
ACT.security=()=>{
  if(MODE!=='user')return;
  modal({title:'Security & password',html:'<form data-submit="changePw"><div class="mb"><p class="small muted">Signed in as <b>@'+esc(ME.user)+'</b>. Your password is stored on this device only, in scrambled (hashed) form.</p>'+pwField('p-old','Current password','old','current-password')+pwField('p-new','New password (min. 6 characters)','pw','new-password')+pwField('p-new2','Confirm new password','pw2','new-password')+'<div id="p-err" class="banner err" role="alert" hidden></div></div><div class="mf"><button type="button" class="btn" data-act="closeModal">Cancel</button><button class="btn pri">Change password</button></div></form>'});
};
SUB.changePw=async(f,fd)=>{
  const e=$('#p-err'),bad=m=>{e.textContent=m;e.hidden=false},pw=String(fd.get('pw')||'');
  let ok=false;try{ok=(await pwHash(String(fd.get('old')||''),ME.salt,ME.hash.split(':')[0]))===ME.hash}catch(x){}
  if(!ok)return bad('Your current password is not correct.');
  if(pw.length<6)return bad('New password must be at least 6 characters.');
  if(pw!==fd.get('pw2'))return bad('The new passwords do not match.');
  ME.salt=randSalt();ME.hash=await pwHash(pw,ME.salt);await authSave();closeAllModals();toast('Password changed','ok');
};
ACT.deleteAccount=()=>{
  if(MODE!=='user')return;
  modal({title:'Delete account and data?',html:'<form data-submit="delAcc"><div class="mb"><p>This permanently erases <b>@'+esc(ME.user)+'</b> and all workouts, history and progress stored for it on this device. Download a backup first if you may need it.</p>'+pwField('d-pw','Enter your password to confirm','pw','current-password')+'<div id="d-err" class="banner err" role="alert" hidden></div></div><div class="mf"><button type="button" class="btn" data-act="closeModal">Cancel</button><button class="btn dsolid">Delete everything</button></div></form>'});
};
SUB.delAcc=async(f,fd)=>{
  let ok=false;try{ok=(await pwHash(String(fd.get('pw')||''),ME.salt,ME.hash.split(':')[0]))===ME.hash}catch(x){}
  if(!ok){const e=$('#d-err');e.textContent='Password is not correct.';e.hidden=false;return}
  const id=ME.id;AUTH.accounts=AUTH.accounts.filter(a=>a.id!==id);
  try{localStorage.removeItem('wpft-state:'+id)}catch(e){}try{if(DB.db)await DB.del('state:'+id)}catch(e){}
  MODE='auth';S=blankState();await leaveSession();toast('Account deleted');
};

/* ---------- install app ---------- */
let BIP=null;const standalone=()=>window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();BIP=e;syncInstallUI()});
window.addEventListener('appinstalled',()=>{BIP=null;syncInstallUI();toast('App installed','ok')});
function syncInstallUI(){
  const show=!standalone();
  ['inst-top','inst-auth','inst-menu'].forEach(id=>{const e=document.getElementById(id);if(e)e.hidden=!show||(id==='inst-top'&&!BIP)})
}
ACT.installApp=async()=>{
  if(BIP){BIP.prompt();try{await BIP.userChoice}catch(e){}BIP=null;syncInstallUI();return}
  const ios=/iphone|ipad|ipod/i.test(navigator.userAgent),web=/^https?:$/.test(location.protocol);
  modal({title:'Install this app',html:'<div class="mb">'+(!web?'<p><b>This copy is running from a file</b>, which browsers cannot install. It already works offline: just keep opening this file. To install it as an app, open the hosted web address that came with your purchase (see the README) and use the steps below.</p>':'')
   +(ios?'<ol><li>Open this page in <b>Safari</b>.</li><li>Tap the <b>Share</b> button.</li><li>Choose <b>Add to Home Screen</b>, then <b>Add</b>.</li></ol>':'<ul><li><b>Chrome / Edge (computer):</b> click the install icon at the right end of the address bar, or ⋮ menu → <i>Install app</i>.</li><li><b>Android Chrome:</b> ⋮ menu → <i>Install app</i> / <i>Add to Home screen</i>.</li><li><b>iPhone / iPad:</b> Safari → Share → <i>Add to Home Screen</i>.</li></ul>')
   +'<p class="small muted">After installing, the app opens in its own window and works offline.</p></div><div class="mf"><button type="button" class="btn pri" data-act="closeModal">Got it</button></div>'});
};

/* ---------- in-app guide ---------- */
TITLES.guide='Guide & About';
ROUTES.guide=()=>{
  const d=(t,b,o)=>'<details class="gd"'+(o?' open':'')+'><summary>'+t+'</summary><div>'+b+'</div></details>';
  return pageHead('Guide & About','Everything you need to get the most from your planner.')
  +'<div class="card">'
  +d('Getting started','<ol><li>Open <b>Planner</b> and check your weekly plan. Use <b>Add workout</b> under a day or <b>From template</b>.</li><li>On a training day open <b>Workout</b>, press <b>Start</b>, enter weight and reps and tick each set. The rest timer starts automatically.</li><li>Press <b>Finish workout</b>. Your dashboard, progress, calendar and reports update instantly.</li><li>Use the <b>menu at the top right</b> for settings, themes, security, install and sign out.</li></ol>',true)
  +d('Planner &amp; templates','<p>Create, edit, duplicate, move or delete workouts; mark rest days with the moon button. 14 starter templates are included, and you can save any planned workout as your own template.</p>')
  +d('Exercise library','<p>45 exercises with instructions, safety tips and common mistakes. Search, filter by muscle, equipment or difficulty, star favourites and add your own custom exercises.</p>')
  +d('Workout tracker &amp; rest timer','<p>Log sets, reps, weight, time or distance. Skip exercises, add notes and add exercises mid-workout. Rest presets are 30/45/60/90/120 seconds or a custom time; the timer keeps correct time if you switch tabs or lock your phone.</p>')
  +d('Progress, calendar, goals &amp; reports','<p>Track bodyweight, optional measurements and fitness records, with charts and date comparison. The calendar shows completed, missed, rest and scheduled days. Set goals and 7/14/30-day challenges, then export CSV or print reports.</p>')
  +d('Your data &amp; backups','<p><b>Everything is stored on this device, in this browser.</b> Nothing is uploaded. Clearing browser data, switching browser, or using a private window can remove it, so open <b>Menu → Download backup</b> regularly. To restore, go to <b>Settings → Restore from backup</b>.</p><p>Accounts are local to this browser, so they do not sync between devices. To move to another device, download a backup there and restore it after creating an account.</p>')
  +d('Account &amp; security','<p>Your password is stored on this device only, in scrambled form. Forgot it? Choose <i>Forgot your password</i> on the sign-in screen and confirm your Etsy access code. This sign-in is a convenience lock for your buyers — it is not bank-level security, so do not store anything highly sensitive.</p>')
  +d('Install as an app','<p>Use <b>Menu → Install app</b>. Installing needs the hosted web address from your purchase; a file opened directly from your computer works offline but cannot install itself.</p>')
  +d('Safety','<p>This is a planning and tracking tool, not medical advice. Choose exercises appropriate to your abilities, stop if you feel pain, dizziness or unwell, and check with a qualified professional before starting or changing a programme, especially if you have a health condition. <button type="button" class="lnk" data-act="safety" style="text-decoration:underline">Read the full safety information</button>.</p>')
  +'</div><div class="card mt"><h2>About</h2><p class="small">Workout Planner &amp; Fitness Tracker · version '+APP_VERSION+'<br>Plan Better. Train Smarter. Track Your Progress.<br>Works offline · no tracking · no ads. Need help? Message the seller on Etsy with your browser name and what happened.</p></div>';
};
