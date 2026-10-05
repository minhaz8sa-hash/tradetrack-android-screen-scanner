/* Namaz Orbit v1.6.0 — More location + profile + shared leaderboard */
var NO_API_160='https://namaz-orbit.vercel.app/api/leaderboard';
var profileImageData160='';
var leaderboardData160={perfect:[],qaza:[]};
var leaderboardMode160='perfect';
var profileSyncTimer160=0;

function noUserId160(){
  var id=localStorage.getItem('no_profile_id');
  if(id)return id;
  if(window.crypto&&crypto.randomUUID)id='no_'+crypto.randomUUID().replace(/-/g,'');
  else id='no_'+Date.now().toString(36)+Math.random().toString(36).slice(2,12);
  localStorage.setItem('no_profile_id',id);return id;
}
function loadProfile160(){
  try{return JSON.parse(localStorage.getItem('no_profile_160')||'{}')||{}}catch(e){return{}}
}
function saveProfileLocal160(p){localStorage.setItem('no_profile_160',JSON.stringify(p||{}))}
function stats160(){
  var s={onTimeCompleted:0,qazaCompleted:0,qazaDue:0,perfectDays:0,totalLogged:0};
  var days=typeof allStoredDays==='function'?allStoredDays():[];
  days.forEach(function(k){
    var st=getDayState(k),perfect=true;
    PRAYERS.forEach(function(p){
      var v=st[p.key]||'pending';
      if(v==='complete'){s.onTimeCompleted++;s.totalLogged++}
      else if(v==='qaza-complete'){s.qazaCompleted++;s.totalLogged++;perfect=false}
      else if(v==='qaza'){s.qazaDue++;perfect=false}
      else perfect=false;
    });
    if(perfect)s.perfectDays++;
  });
  return s;
}
function initials160(name){
  var x=String(name||'User').trim().split(/\s+/).slice(0,2).map(function(a){return a.charAt(0)}).join('');
  return (x||'U').toUpperCase();
}
function avatarHtml160(url,name,cls){
  if(url)return '<div class="'+cls+'"><img src="'+String(url).replace(/"/g,'')+'" alt=""></div>';
  return '<div class="'+cls+'"><span>'+initials160(name)+'</span></div>';
}

function moveLocationMore160(){
  var more=document.getElementById('page-more'),panel=document.getElementById('coreLocationPanelV15');
  if(!more||!panel)return;
  if(panel.parentNode!==more)more.insertBefore(panel,more.firstChild);
  panel.classList.add('more-location160');
  var compact=document.getElementById('compactLocationV14');if(compact)compact.remove();
}

function installProfile160(){
  var more=document.getElementById('page-more');if(!more||document.getElementById('profilePanel160'))return;
  var panel=document.createElement('div');panel.id='profilePanel160';panel.className='panel glass profile160';
  panel.innerHTML=
    '<div class="profile-head160"><button class="profile-avatar160" id="profileAvatar160" onclick="document.getElementById(\'profileImageInput160\').click()"></button>'+
    '<div class="profile-copy160"><h3>Profile</h3><small>Name ও profile image এই device-এ save থাকবে। Public leaderboard আলাদা করে enable করতে হবে।</small></div></div>'+
    '<input id="profileImageInput160" type="file" accept="image/*" hidden>'+
    '<label class="control-label">Name<input class="control" id="profileName160" maxlength="40" placeholder="আপনার নাম"></label>'+
    '<div class="profile-grid160" id="profileStats160"></div>'+
    '<label class="profile-public160"><div><b>Public leaderboard</b><small>Name, photo ও aggregate prayer stats অন্য users দেখতে পারবে। Location publish হবে না।</small></div><input type="checkbox" id="profilePublic160"></label>'+
    '<div class="profile-actions160"><button class="btn primary" onclick="saveProfile160()">Save profile</button><button class="btn" onclick="openLeaderboard160()">Leaderboard</button></div>'+
    '<div class="meta" id="profileSync160" style="margin-top:8px">Not synced</div>';
  var loc=document.getElementById('coreLocationPanelV15');
  if(loc&&loc.parentNode===more)loc.insertAdjacentElement('afterend',panel);else more.insertBefore(panel,more.firstChild);
  document.getElementById('profileImageInput160').addEventListener('change',profileImageChosen160);
  renderProfile160();
}

function renderProfile160(){
  var p=loadProfile160(),st=stats160(),name=document.getElementById('profileName160'),pub=document.getElementById('profilePublic160'),av=document.getElementById('profileAvatar160'),box=document.getElementById('profileStats160');
  if(name)name.value=p.name||'';if(pub)pub.checked=!!p.public;
  if(av)av.innerHTML=p.imageDataUrl?'<img src="'+p.imageDataUrl+'" alt="">':v13Svg('prayer');
  if(box)box.innerHTML=
    '<div class="profile-stat160"><b>'+st.perfectDays+'</b><span>Perfect days</span></div>'+
    '<div class="profile-stat160"><b>'+st.onTimeCompleted+'</b><span>On-time</span></div>'+
    '<div class="profile-stat160"><b>'+st.qazaCompleted+'</b><span>Qaza done</span></div>'+
    '<div class="profile-stat160"><b>'+st.qazaDue+'</b><span>Qaza due</span></div>';
}
function profileImageChosen160(ev){
  var f=ev.target.files&&ev.target.files[0];if(!f)return;
  var rd=new FileReader();
  rd.onload=function(){
    var img=new Image();
    img.onload=function(){
      var cv=document.createElement('canvas'),size=256;cv.width=size;cv.height=size;
      var scale=Math.max(size/img.width,size/img.height),w=img.width*scale,h=img.height*scale;
      var ctx=cv.getContext('2d');ctx.drawImage(img,(size-w)/2,(size-h)/2,w,h);
      profileImageData160=cv.toDataURL('image/jpeg',.78);
      var p=loadProfile160();p.imageDataUrl=profileImageData160;saveProfileLocal160(p);renderProfile160();
    };
    img.src=rd.result;
  };
  rd.readAsDataURL(f);
}
async function saveProfile160(){
  var name=(document.getElementById('profileName160').value||'').trim().replace(/[<>]/g,'').slice(0,40);
  if(!name){toast('Name দিন');return}
  var p=loadProfile160();p.name=name;p.public=!!document.getElementById('profilePublic160').checked;
  if(profileImageData160)p.imageDataUrl=profileImageData160;
  saveProfileLocal160(p);renderProfile160();
  if(p.public)await syncProfile160(true);else await syncProfile160(true);
  toast('Profile saved ✓');
}
async function syncProfile160(force){
  var p=loadProfile160();if(!p.name)return;
  var status=document.getElementById('profileSync160');if(status)status.textContent='Syncing…';
  try{
    var payload={action:'upsert',id:noUserId160(),name:p.name,public:!!p.public,stats:stats160()};
    if(force&&p.imageDataUrl)payload.imageDataUrl=p.imageDataUrl;
    var r=await fetch(NO_API_160,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    if(!r.ok)throw new Error('HTTP '+r.status);
    var j=await r.json();if(!j.ok)throw new Error(j.error||'Sync failed');
    if(status)status.textContent=p.public?'Leaderboard synced':'Profile private • not shown publicly';
  }catch(e){if(status)status.textContent='Sync unavailable • local profile is safe'}
}
function scheduleProfileSync160(){
  var p=loadProfile160();if(!p.public||!p.name)return;
  clearTimeout(profileSyncTimer160);profileSyncTimer160=setTimeout(function(){syncProfile160(false)},1800);
}

function installLeaderboard160(){
  if(document.getElementById('page-leaderboard'))return;
  var page=document.createElement('section');page.className='page';page.id='page-leaderboard';
  page.innerHTML='<div class="panel glass">'+
    '<div class="lb-top160"><div><h3 style="margin:0">Leaderboard</h3><small class="muted">Public profiles only</small></div><button class="btn" onclick="showPage(\'more\')">← More</button></div>'+
    '<div class="lb-tabs160"><button class="lb-tab160 active" id="lbPerfectTab160" onclick="setLeaderboardMode160(\'perfect\')">Perfect</button><button class="lb-tab160" id="lbQazaTab160" onclick="setLeaderboardMode160(\'qaza\')">Qaza</button></div>'+
    '<div class="lb-list160" id="leaderboardList160"><div class="lb-empty160">Loading…</div></div>'+
    '<div class="panel glass lb-detail160" id="leaderboardDetail160"></div>'+
    '<div class="lb-privacy160">Perfect ranking: বেশি perfect day → বেশি on-time prayer → কম Qaza due। Qaza ranking: সবচেয়ে বেশি Qaza prayer complete। এটি উৎসাহের tracker; কারও ইবাদতের মূল্য নির্ধারণ করে না।</div>'+
    '</div>';
  var more=document.getElementById('page-more');if(more)more.insertAdjacentElement('beforebegin',page);else document.querySelector('main').appendChild(page);
}
async function openLeaderboard160(){showPage('leaderboard');await loadLeaderboard160()}
function setLeaderboardMode160(mode){
  leaderboardMode160=mode==='qaza'?'qaza':'perfect';
  document.getElementById('lbPerfectTab160')?.classList.toggle('active',leaderboardMode160==='perfect');
  document.getElementById('lbQazaTab160')?.classList.toggle('active',leaderboardMode160==='qaza');
  renderLeaderboard160();
}
async function loadLeaderboard160(){
  var list=document.getElementById('leaderboardList160');if(list)list.innerHTML='<div class="lb-empty160">Loading leaderboard…</div>';
  try{
    var r=await fetch(NO_API_160+'?t='+Date.now(),{cache:'no-store'});if(!r.ok)throw new Error('HTTP '+r.status);
    var j=await r.json();leaderboardData160={perfect:j.perfect||[],qaza:j.qaza||[]};renderLeaderboard160();
  }catch(e){if(list)list.innerHTML='<div class="lb-empty160">Leaderboard server unavailable. আবার চেষ্টা করুন।</div>'}
}
function renderLeaderboard160(){
  var list=document.getElementById('leaderboardList160');if(!list)return;
  var arr=leaderboardData160[leaderboardMode160]||[];
  if(!arr.length){list.innerHTML='<div class="lb-empty160">এখনও public leaderboard data নেই।</div>';return}
  list.innerHTML='';
  arr.forEach(function(u,i){
    var st=u.stats||{},b=document.createElement('button');b.className='lb-row160';
    var score=leaderboardMode160==='perfect'?(st.perfectDays||0):(st.qazaCompleted||0);
    var label=leaderboardMode160==='perfect'?'Perfect days':'Qaza done';
    b.innerHTML='<div class="lb-rank160">#'+(i+1)+'</div>'+avatarHtml160(u.imageUrl,u.name,'lb-avatar160')+
      '<div class="lb-main160"><b>'+String(u.name||'User').replace(/[<>]/g,'')+'</b><small>On-time '+(st.onTimeCompleted||0)+' • Qaza done '+(st.qazaCompleted||0)+' • Due '+(st.qazaDue||0)+'</small></div>'+
      '<div class="lb-score160"><b>'+score+'</b><small>'+label+'</small></div>';
    b.onclick=function(){showLeaderboardUser160(u)};list.appendChild(b);
  });
}
function showLeaderboardUser160(u){
  var d=document.getElementById('leaderboardDetail160'),st=u.stats||{};if(!d)return;
  d.innerHTML='<div class="lb-detail-head160">'+avatarHtml160(u.imageUrl,u.name,'lb-avatar160')+'<div><h3 style="margin:0">'+String(u.name||'User').replace(/[<>]/g,'')+'</h3><small class="muted">Public prayer summary</small></div></div>'+
    '<div class="lb-detail-stats160">'+
    '<div class="profile-stat160"><b>'+(st.perfectDays||0)+'</b><span>Perfect days</span></div>'+
    '<div class="profile-stat160"><b>'+(st.onTimeCompleted||0)+'</b><span>On-time</span></div>'+
    '<div class="profile-stat160"><b>'+(st.qazaCompleted||0)+'</b><span>Qaza done</span></div>'+
    '<div class="profile-stat160"><b>'+(st.qazaDue||0)+'</b><span>Qaza due</span></div></div>';
  d.classList.add('open');d.scrollIntoView({behavior:'smooth',block:'nearest'});
}

(function init160(){
  moveLocationMore160();installProfile160();installLeaderboard160();
  var oldShow160=window.showPage;window.showPage=function(name){
    oldShow160(name);
    if(name==='leaderboard')document.querySelectorAll('#nav button').forEach(function(b){b.classList.toggle('active',b.dataset.page==='more')});
    if(name==='more'){moveLocationMore160();renderProfile160()}
  };
  var oldMark160=window.markComplete;if(typeof oldMark160==='function')window.markComplete=function(){var r=oldMark160.apply(this,arguments);renderProfile160();scheduleProfileSync160();return r};
  var oldUndo160=window.markUndo;if(typeof oldUndo160==='function')window.markUndo=function(){var r=oldUndo160.apply(this,arguments);renderProfile160();scheduleProfileSync160();return r};
  setTimeout(moveLocationMore160,150);
})();
