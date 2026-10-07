/* Namaz Orbit v2.0.0 — backup, Quran pronunciation, mosque registry/admin, alert sync, Dhikr progress */
const MOSQUE_API_183='https://namaz-orbit.vercel.app/api/mosques';
let adminSecret183='';
let adminImage183='';
let adminEditing183='';
let registeredMosques183=[];

/* ---------- Backup / restore ---------- */
function backupPayload183(){
  const storage={};
  for(let i=0;i<localStorage.length;i++){
    const k=localStorage.key(i);
    if(!k||!k.startsWith('no_'))continue;
    if(k==='no_coords'||k==='no_location_label'||k==='no_overlay_pending_182')continue;
    const v=localStorage.getItem(k);
    if(v!=null)storage[k]=v;
  }
  return {format:'NamazOrbitBackup',version:2,createdAt:new Date().toISOString(),storage};
}
function installBackup183(){
  const more=document.getElementById('page-more');if(!more||document.getElementById('backup183'))return;
  const p=document.createElement('div');p.id='backup183';p.className='panel glass backup183';
  p.innerHTML='<h3 style="margin:0">Backup & Restore</h3>'+
    '<div class="meta">Prayer/Qaza history, settings, Dhikr, Quran progress ও selected mosque backup করুন। GPS location backup করা হয় না।</div>'+
    '<div class="backup-actions183"><button class="btn primary" onclick="exportBackup183()">Export Backup</button><button class="btn" onclick="importBackup183()">Import Restore</button></div>'+
    '<div class="notice">App uninstall করলে Android local app data মুছে যায়। Android Auto Backup কখনও restore করতে পারে, কিন্তু guaranteed নয়—এই JSON backup সবচেয়ে reliable।</div>';
  const privacy=[...more.querySelectorAll('.panel')].find(x=>x.textContent.includes('Privacy & data'));
  if(privacy)privacy.insertAdjacentElement('afterend',p);else more.appendChild(p);
}
function exportBackup183(){
  const json=JSON.stringify(backupPayload183());
  if(window.AndroidBridge&&window.AndroidBridge.exportBackupJson){window.AndroidBridge.exportBackupJson(json);return}
  const blob=new Blob([json],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='Namaz-Orbit-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
function importBackup183(){
  if(window.AndroidBridge&&window.AndroidBridge.importBackupJson){window.AndroidBridge.importBackupJson();return}
  toast('APK-তে Import Restore ব্যবহার করুন');
}
window.onNativeBackupExported=function(ok){toast(ok?'Backup saved ✓':'Backup save failed')};
window.onNativeBackupImported=function(b64){
  if(!b64){toast('Backup import failed');return}
  try{
    const raw=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));
    const json=new TextDecoder().decode(raw),data=JSON.parse(json);
    if(data.format!=='NamazOrbitBackup'||!data.storage)throw new Error('Invalid backup');
    const keepCoords=localStorage.getItem('no_coords'),keepLabel=localStorage.getItem('no_location_label');
    const keys=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith('no_'))keys.push(k)}
    keys.forEach(k=>{if(k!=='no_coords'&&k!=='no_location_label')localStorage.removeItem(k)});
    Object.keys(data.storage).forEach(k=>{if(k.startsWith('no_')&&k!=='no_coords'&&k!=='no_location_label')localStorage.setItem(k,String(data.storage[k]))});
    if(keepCoords)localStorage.setItem('no_coords',keepCoords);if(keepLabel)localStorage.setItem('no_location_label',keepLabel);
    toast('Backup restored ✓');setTimeout(()=>location.reload(),650);
  }catch(e){toast('Invalid backup file')}
};

/* ---------- assistive Bangla pronunciation ---------- */
function banglaPron183(ar){
  const clean=String(ar||'').replace(/[\u06D6-\u06EDـ]/g,'').trim();
  const C={'ب':'ব','ت':'ত','ث':'স','ج':'জ','ح':'হ','خ':'খ','د':'দ','ذ':'য','ر':'র','ز':'য','س':'স','ش':'শ','ص':'স','ض':'দ','ط':'ত','ظ':'য','غ':'গ','ف':'ফ','ق':'ক্ব','ك':'ক','ل':'ল','م':'ম','ن':'ন','ه':'হ','ة':'হ'};
  const f='َ',k='ِ',u='ُ',sh='ّ',sk='ْ',ft='ً',kt='ٍ',ut='ٌ';
  let out='',lastCons='';
  for(let i=0;i<clean.length;i++){
    const ch=clean[i],next=clean[i+1]||'';
    if(/\s/.test(ch)){if(!out.endsWith(' '))out+=' ';lastCons='';continue}
    if(ch==='آ'){out+='আ';lastCons='';continue}
    if(ch==='ا'||ch==='ٱ'){if(i===0||/\s/.test(clean[i-1]))out+='আ';else if(!/[াীূ]$/.test(out))out+='া';lastCons='';continue}
    if(ch==='و'){out+=(next===u?'উ':'ও');lastCons='';continue}
    if(ch==='ي'||ch==='ى'){out+='ই';lastCons='';continue}
    if(ch==='ع'){out+='আ';lastCons='';continue}
    if(ch==='ء'||ch==='أ'||ch==='إ'||ch==='ؤ'||ch==='ئ'){out+=(next===k?'ই':next===u?'উ':'আ');lastCons='';continue}
    if(ch===f){out+='া';continue}
    if(ch===k){out+='ি';continue}
    if(ch===u){out+='ু';continue}
    if(ch===ft){out+='ান';continue}
    if(ch===kt){out+='িন';continue}
    if(ch===ut){out+='ুন';continue}
    if(ch===sh){if(lastCons)out+=lastCons;continue}
    if(ch===sk){continue}
    if(C[ch]){out+=C[ch];lastCons=C[ch];continue}
  }
  return out.replace(/\s+/g,' ').replace(/াা/g,'া').trim();
}
async function openSurah(n){
  document.getElementById('surahBrowser').style.display='none';document.getElementById('surahReader').style.display='block';
  document.getElementById('surahTitle').textContent='Loading…';document.getElementById('ayahList').innerHTML='<div class="notice">Quran text loading…</div>';
  try{
    const s=await fetchSurah(n),x=quranState182();document.getElementById('surahTitle').textContent=s.number+'. '+s.name+' • '+s.arabicName;
    document.getElementById('ayahList').innerHTML=s.ayahs.map(a=>{
      const kk=s.number+':'+a.number,read=x.read.indexOf(kk)>=0,book=x.bookmarks.some(z=>z.key===kk),title=String(s.name).replace(/'/g,"\\'");
      return '<article class="ayah" id="ayah182_'+a.number+'"><div class="ayah-no">AYAH '+a.number+'</div>'+
        '<div class="arabic">'+escapeHtml(a.ar)+'</div>'+
        '<div class="quran-pron183"><span class="quran-pron-label183">সহায়ক বাংলা উচ্চারণ</span>'+escapeHtml(banglaPron183(a.ar))+'</div>'+
        '<div class="bangla">'+escapeHtml(a.bn)+'</div>'+
        '<div class="ayah-tools182"><button class="ayah-tool182 '+(read?'active':'')+'" data-read182="'+kk+'" onclick="markQuranRead182('+s.number+','+a.number+',\''+title+'\')">'+(read?'Read ✓':'Mark Read')+'</button>'+
        '<button class="ayah-tool182 '+(book?'active':'')+'" data-book182="'+kk+'" onclick="toggleQuranBookmark182('+s.number+','+a.number+',\''+title+'\')">'+(book?'★ Bookmarked':'☆ Bookmark')+'</button></div></article>';
    }).join('')+'<div class="quran-pron-note183">বাংলা উচ্চারণটি স্বয়ংক্রিয় সহায়ক transliteration; শুদ্ধ তিলাওয়াত শেখার জন্য আরবি দেখে বিশ্বস্ত শিক্ষক/কারীর কাছ থেকে শেখা উত্তম।</div>';
  }catch(e){document.getElementById('ayahList').innerHTML='<div class="notice">Quran data could not load. Check internet and try again. Previously downloaded Surahs remain available offline.</div>'}
}

/* ---------- Dhikr auto float + progress ---------- */
function renderDhikrFloat183(){
  if(typeof renderDhikrFloat181!=='function')return;
  const f=document.getElementById('dhikrFloat181'),st=dhikrStage181();
  if(!f)return;
  let pct=0;
  if(st){pct=Math.max(0,Math.min(1,(dhikrCounts182[st.id]||0)/Math.max(1,Number(st.target)||1)))}else pct=1;
  f.style.setProperty('--dhikrP',(pct*360).toFixed(1)+'deg');
}
const oldDhikrRender183=window.renderDhikrFloat181;
window.renderDhikrFloat181=function(){if(typeof oldDhikrRender183==='function')oldDhikrRender183();renderDhikrFloat183()};
function autoDhikr183(){
  try{showDhikrFloat181(false)}catch(e){}
  setTimeout(()=>{
    if(overlayReady182()){
      try{window.AndroidBridge.startDhikrOverlay(JSON.stringify(overlaySequence182()))}catch(e){}
    }
  },500);
}

/* ---------- Google Maps + shared mosque registry ---------- */
function openGoogleMaps183(){
  const c=(typeof coords!=='undefined'?coords:null);
  if(!c){toast('Location enable করুন');try{detectLocation()}catch(e){};return}
  if(window.AndroidBridge&&window.AndroidBridge.openGoogleMapsMosques){window.AndroidBridge.openGoogleMapsMosques(Number(c.lat),Number(c.lon));return}
  window.open('https://www.google.com/maps/search/mosque/@'+c.lat+','+c.lon+',14z','_blank');
}
function distKm183(a,b,c,d){return haversine181(a,b,c,d)}
async function fetchRegisteredMosques183(){
  try{
    const r=await fetch(MOSQUE_API_183+'?t='+Date.now(),{cache:'no-store'});if(!r.ok)throw new Error('HTTP '+r.status);
    const j=await r.json();registeredMosques183=Array.isArray(j.mosques)?j.mosques:[];
    return registeredMosques183;
  }catch(e){registeredMosques183=[];return []}
}
function installRegistry183(){
  const host=document.getElementById('mosque180');if(!host||document.getElementById('registry183'))return;
  const x=document.createElement('div');x.id='registry183';x.className='registry183';
  x.innerHTML='<h4 style="margin:0">Registered Mosques</h4><div class="meta">Namaz Orbit Administration থেকে verified schedule publish করা mosque এখানে দেখাবে।</div>'+
    '<div class="registry-actions183"><button class="btn primary" onclick="loadRegistry183()">Refresh registered mosques</button><button class="btn" onclick="openGoogleMaps183()">Open Google Maps</button></div>'+
    '<div class="registry-list183" id="registryList183"></div>';
  const discovery=document.getElementById('mosqueDiscovery181');if(discovery)discovery.insertAdjacentElement('beforebegin',x);else host.appendChild(x);
}
async function loadRegistry183(){
  installRegistry183();const list=document.getElementById('registryList183');if(list)list.innerHTML='<div class="meta">Loading…</div>';
  const arr=await fetchRegisteredMosques183();renderRegistry183(arr);
}
function renderRegistry183(arr){
  const list=document.getElementById('registryList183');if(!list)return;
  const c=(typeof coords!=='undefined'?coords:null),selected=mosqueData180().favoriteId||'';
  const sorted=(arr||[]).map(m=>Object.assign({},m,{distance:c&&Number.isFinite(m.lat)&&Number.isFinite(m.lon)?distKm183(c.lat,c.lon,m.lat,m.lon):null}))
    .sort((a,b)=>(a.distance??99999)-(b.distance??99999));
  if(!sorted.length){list.innerHTML='<div class="meta">এখনও registered mosque নেই। Google Maps search ব্যবহার করতে পারেন।</div>';return}
  list.innerHTML='';
  sorted.forEach(m=>{
    const row=document.createElement('div');row.className='registry-row183';
    row.innerHTML=(m.imageUrl?'<img src="'+escapeHtml181(m.imageUrl)+'" alt="">':'<div></div>')+
      '<div><b>'+escapeHtml181(m.name)+'</b><small>'+(m.distance!=null?m.distance.toFixed(1)+' km • ':'')+escapeHtml181(m.address||'Registered mosque')+'</small></div>'+
      '<button class="registry-select183 '+(selected===m.id?'selected':'')+'" onclick="selectRegisteredMosque183(\''+m.id+'\')">'+(selected===m.id?'✓ Selected':'Select')+'</button>';
    list.appendChild(row);
  });
}
function selectRegisteredMosque183(id){
  const m=registeredMosques183.find(x=>x.id===id);if(!m)return;
  const x=mosqueData180();x.enabled=true;x.name=m.name;x.imageUrl=m.imageUrl||'';x.address=m.address||'';x.lat=m.lat;x.lon=m.lon;x.favoriteId=m.id;
  x.times=x.times||{};x.registryTimes=m.times||{};
  PRAYERS.forEach(p=>{x.times[p.key]=(m.times&&m.times[p.key]&&m.times[p.key].jamaat)||''});
  x.jummah1=m.jummah1||'';x.jummah2=m.jummah2||'';x.eid1=m.eid1||'';x.eid2=m.eid2||'';x.announcement=m.announcement||'';
  saveMosqueData180(x);loadMosque180();decorateMosqueHome180();renderRegistry183(registeredMosques183);scheduleSelectedMosqueAlerts183(true);
  toast('Mosque schedule selected ✓');
}
function wallEpoch183(date,hhmm){
  if(!hhmm)return 0;const [h,m]=hhmm.split(':').map(Number),d=new Date(date.getFullYear(),date.getMonth(),date.getDate(),h,m,0,0);
  return typeof actualEpochForWallDate==='function'?actualEpochForWallDate(d):d.getTime();
}
function scheduleSelectedMosqueAlerts183(force){
  const x=mosqueData180();if(!x.enabled||!x.favoriteId||!x.registryTimes||!window.AndroidBridge)return;
  try{window.AndroidBridge.cancelByPrefix('MOSQUE_')}catch(e){}
  const base=locationNow();
  for(let off=0;off<3;off++){
    const d=new Date(base.getFullYear(),base.getMonth(),base.getDate()+off,12,0,0),k=dateKey(d);
    PRAYERS.forEach(p=>{
      const t=x.registryTimes[p.key]||{};
      [['adhan',t.adhan],['jamaat',t.jamaat]].forEach(pair=>{
        const at=wallEpoch183(d,pair[1]);if(!at||at<Date.now()+1000)return;
        const kind=pair[0]==='adhan'?'Azan':'Jamaat';
        try{window.AndroidBridge.scheduleAlarmV2('MOSQUE_'+k+'_'+p.key+'_'+pair[0],x.name+' • '+p.bn+' '+kind,kind+' time '+time12_180(pair[1]),at,settings.alarmSound||'alarm',settings.vibration!==false)}catch(e){}
      });
    });
    if(d.getDay()===5){
      [x.jummah1,x.jummah2].filter(Boolean).forEach((t,i)=>{
        const at=wallEpoch183(d,t);if(at>Date.now()+1000)try{window.AndroidBridge.scheduleAlarmV2('MOSQUE_'+k+'_jummah_'+i,x.name+' • Jummah '+(i+1),'Jummah time '+time12_180(t),at,settings.alarmSound||'alarm',settings.vibration!==false)}catch(e){}
      });
    }
  }
}
async function refreshSelectedMosque183(){
  const x=mosqueData180();if(!x.favoriteId)return;
  const arr=await fetchRegisteredMosques183(),m=arr.find(z=>z.id===x.favoriteId);if(!m)return;
  registeredMosques183=arr;selectRegisteredMosque183(m.id);
}

/* Override failing nearby service: shared registry first, Maps always available. */
async function findNearbyMosques181(){
  installRegistry183();await loadRegistry183();
  const list=document.getElementById('nearbyMosqueList181');if(list)list.innerHTML='<div class="meta">Registered mosques উপরে দেখানো হয়েছে। আরও mosque খুঁজতে Open Google Maps চাপুন।</div>';
}

/* ---------- Hidden About -> Mosque Administration ---------- */
function installAboutAdmin183(){
  const more=document.getElementById('page-more');if(!more||document.getElementById('about183'))return;
  const about=document.createElement('div');about.id='about183';about.className='panel glass about183';
  about.innerHTML='<h3 style="margin:0">About Namaz Orbit</h3><div class="meta">Prayer • Qibla • Quran • Qaza • Mosque</div>'+
    '<div class="admin-unlock183"><input class="control" id="adminWord183" type="password" autocomplete="off" placeholder="Info"><button class="btn" onclick="unlockAdmin183()">Open</button></div>'+
    '<div class="admin-status183" id="adminStatus183">Administration access hidden.</div>';
  more.appendChild(about);

  const panel=document.createElement('div');panel.id='adminPanel183';panel.className='panel glass admin-panel183';
  panel.innerHTML='<div class="admin-head183"><div><h3>Mosque Administration</h3><div class="meta">Shared mosque schedule registry</div></div><button class="btn" onclick="lockAdmin183()">Lock</button></div>'+
    '<div class="admin-form183">'+
      '<div class="admin-image183"><button class="admin-image-preview183" id="adminImagePreview183" onclick="document.getElementById(\'adminImageInput183\').click()">Image</button><div><button class="btn" onclick="document.getElementById(\'adminImageInput183\').click()">Select Mosque Image</button><input hidden id="adminImageInput183" type="file" accept="image/*"></div></div>'+
      '<label class="control-label">Mosque name<input class="control" id="adminMosqueName183" maxlength="90"></label>'+
      '<label class="control-label">Address<input class="control" id="adminMosqueAddress183" maxlength="180"></label>'+
      '<div class="backup-actions183"><label class="control-label">Latitude<input class="control" id="adminLat183" inputmode="decimal"></label><label class="control-label">Longitude<input class="control" id="adminLon183" inputmode="decimal"></label></div>'+
      '<button class="btn" onclick="adminUseLocation183()">Use current location</button>'+
      '<div class="admin-times183" id="adminTimes183"></div>'+
      '<div class="backup-actions183"><label class="control-label">Jummah 1<input class="control" type="time" id="adminJummah1_183"></label><label class="control-label">Jummah 2<input class="control" type="time" id="adminJummah2_183"></label><label class="control-label">Eid 1<input class="control" type="time" id="adminEid1_183"></label><label class="control-label">Eid 2<input class="control" type="time" id="adminEid2_183"></label></div>'+
      '<label class="control-label">Announcement<textarea class="control" id="adminAnn183" maxlength="280" style="min-height:74px"></textarea></label>'+
      '<div class="backup-actions183"><button class="btn" onclick="clearAdminForm183()">New Mosque</button><button class="btn primary" onclick="saveAdminMosque183()">Publish Mosque</button></div>'+
    '</div><div class="admin-list183" id="adminList183"></div>';
  more.appendChild(panel);

  const times=document.getElementById('adminTimes183');
  PRAYERS.forEach(p=>{
    const row=document.createElement('div');row.className='admin-time-row183';
    row.innerHTML='<b>'+p.bn+'</b><label>Azan<input type="time" id="adm_'+p.key+'_adhan"></label><label>Jamaat<input type="time" id="adm_'+p.key+'_jamaat"></label>';times.appendChild(row);
  });
  document.getElementById('adminImageInput183').addEventListener('change',adminImageChosen183);
}
async function unlockAdmin183(){
  const word=(document.getElementById('adminWord183').value||'').trim(),st=document.getElementById('adminStatus183');
  if(!word){st.textContent='Admin word দিন';st.className='admin-status183 error';return}
  try{
    const r=await fetch(MOSQUE_API_183,{method:'POST',headers:{'Content-Type':'application/json','X-Admin-Secret':word},body:JSON.stringify({action:'verify'})});
    if(!r.ok)throw new Error();
    adminSecret183=word;sessionStorage.setItem('no_admin_183',word);st.textContent='Administration unlocked ✓';st.className='admin-status183 ok';
    document.getElementById('adminPanel183').classList.add('open');await loadAdminMosques183();document.getElementById('adminPanel183').scrollIntoView({behavior:'smooth',block:'start'});
  }catch(e){st.textContent='Incorrect administration word';st.className='admin-status183 error'}
}
function lockAdmin183(){adminSecret183='';sessionStorage.removeItem('no_admin_183');document.getElementById('adminPanel183')?.classList.remove('open');document.getElementById('adminWord183').value=''}
function adminUseLocation183(){const c=(typeof coords!=='undefined'?coords:null);if(!c){toast('Location নেই');return}document.getElementById('adminLat183').value=Number(c.lat).toFixed(6);document.getElementById('adminLon183').value=Number(c.lon).toFixed(6)}
function adminImageChosen183(ev){
  const f=ev.target.files&&ev.target.files[0];if(!f)return;const rd=new FileReader();
  rd.onload=()=>{const img=new Image();img.onload=()=>{const cv=document.createElement('canvas'),size=512;cv.width=size;cv.height=size;const sc=Math.max(size/img.width,size/img.height),w=img.width*sc,h=img.height*sc;cv.getContext('2d').drawImage(img,(size-w)/2,(size-h)/2,w,h);adminImage183=cv.toDataURL('image/jpeg',.78);document.getElementById('adminImagePreview183').innerHTML='<img src="'+adminImage183+'" alt="">'};img.src=rd.result};rd.readAsDataURL(f);
}
function adminFormMosque183(){
  const times={};PRAYERS.forEach(p=>{times[p.key]={adhan:document.getElementById('adm_'+p.key+'_adhan').value||'',jamaat:document.getElementById('adm_'+p.key+'_jamaat').value||''}});
  return {id:adminEditing183||('mosque_'+Date.now().toString(36)),name:(document.getElementById('adminMosqueName183').value||'').trim(),address:(document.getElementById('adminMosqueAddress183').value||'').trim(),lat:Number(document.getElementById('adminLat183').value),lon:Number(document.getElementById('adminLon183').value),times,jummah1:document.getElementById('adminJummah1_183').value||'',jummah2:document.getElementById('adminJummah2_183').value||'',eid1:document.getElementById('adminEid1_183').value||'',eid2:document.getElementById('adminEid2_183').value||'',announcement:(document.getElementById('adminAnn183').value||'').trim(),active:true};
}
async function saveAdminMosque183(){
  if(!adminSecret183)adminSecret183=sessionStorage.getItem('no_admin_183')||'';const m=adminFormMosque183();if(!m.name){toast('Mosque name দিন');return}
  try{
    const r=await fetch(MOSQUE_API_183,{method:'POST',headers:{'Content-Type':'application/json','X-Admin-Secret':adminSecret183},body:JSON.stringify({action:'upsert',mosque:m,imageDataUrl:adminImage183})});
    if(!r.ok)throw new Error();toast('Mosque published ✓');clearAdminForm183();await loadAdminMosques183();await loadRegistry183();
  }catch(e){toast('Mosque publish failed')}
}
function clearAdminForm183(){
  adminEditing183='';adminImage183='';['adminMosqueName183','adminMosqueAddress183','adminLat183','adminLon183','adminJummah1_183','adminJummah2_183','adminEid1_183','adminEid2_183','adminAnn183'].forEach(id=>{const e=document.getElementById(id);if(e)e.value=''});
  PRAYERS.forEach(p=>['adhan','jamaat'].forEach(t=>{document.getElementById('adm_'+p.key+'_'+t).value=''}));document.getElementById('adminImagePreview183').textContent='Image';
}
async function loadAdminMosques183(){
  const arr=await fetchRegisteredMosques183(),box=document.getElementById('adminList183');if(!box)return;box.innerHTML='';
  arr.forEach(m=>{const row=document.createElement('div');row.className='admin-mosque183';row.innerHTML=(m.imageUrl?'<img src="'+escapeHtml181(m.imageUrl)+'">':'<div></div>')+'<div><b>'+escapeHtml181(m.name)+'</b><small>'+escapeHtml181(m.address||'')+'</small></div><div><button class="btn" onclick="editAdminMosque183(\''+m.id+'\')">Edit</button><button class="btn danger" onclick="deleteAdminMosque183(\''+m.id+'\')">Delete</button></div>';box.appendChild(row)});
}
function editAdminMosque183(id){
  const m=registeredMosques183.find(x=>x.id===id);if(!m)return;adminEditing183=m.id;adminImage183='';
  document.getElementById('adminMosqueName183').value=m.name||'';document.getElementById('adminMosqueAddress183').value=m.address||'';document.getElementById('adminLat183').value=m.lat??'';document.getElementById('adminLon183').value=m.lon??'';
  PRAYERS.forEach(p=>{document.getElementById('adm_'+p.key+'_adhan').value=m.times?.[p.key]?.adhan||'';document.getElementById('adm_'+p.key+'_jamaat').value=m.times?.[p.key]?.jamaat||''});
  document.getElementById('adminJummah1_183').value=m.jummah1||'';document.getElementById('adminJummah2_183').value=m.jummah2||'';document.getElementById('adminEid1_183').value=m.eid1||'';document.getElementById('adminEid2_183').value=m.eid2||'';document.getElementById('adminAnn183').value=m.announcement||'';
  document.getElementById('adminImagePreview183').innerHTML=m.imageUrl?'<img src="'+m.imageUrl+'">':'Image';
}
async function deleteAdminMosque183(id){
  if(!confirm('Delete this mosque?'))return;
  try{const r=await fetch(MOSQUE_API_183,{method:'POST',headers:{'Content-Type':'application/json','X-Admin-Secret':adminSecret183},body:JSON.stringify({action:'delete',id})});if(!r.ok)throw new Error();await loadAdminMosques183();await loadRegistry183();toast('Mosque deleted')}catch(e){toast('Delete failed')}
}

(function init183(){
  installBackup183();installAboutAdmin183();installRegistry183();
  setTimeout(autoDhikr183,350);
  setTimeout(()=>{loadRegistry183();refreshSelectedMosque183();},900);
  const saved=sessionStorage.getItem('no_admin_183');if(saved){adminSecret183=saved;document.getElementById('adminPanel183')?.classList.add('open');loadAdminMosques183()}
  const oldShow=window.showPage;window.showPage=function(name){oldShow(name);if(name==='more'){installBackup183();installAboutAdmin183();installRegistry183()}};
})();