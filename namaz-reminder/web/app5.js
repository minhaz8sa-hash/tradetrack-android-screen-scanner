function saveSettingsLegacyV10(){settings={calcMethod:document.getElementById('calcMethod').value,asrMethod:document.getElementById('asrMethod').value,adjust:Number(document.getElementById('timeAdjustment').value)||0,alarmSound:document.getElementById('alarmSound').value,preReminder:Number(document.getElementById('preReminder').value)||0};localStorage.setItem('no_settings',JSON.stringify(settings));renderToday();renderCalendar();toast('Settings saved & alarms rescheduled')}
function loadSettingsLegacyV10(){document.getElementById('calcMethod').value=settings.calcMethod;document.getElementById('asrMethod').value=settings.asrMethod;document.getElementById('timeAdjustment').value=settings.adjust;document.getElementById('alarmSound').value=settings.alarmSound;document.getElementById('preReminder').value=settings.preReminder}
function exportData(){const data={settings,coords,locationLabel,history:{}};for(const k of allStoredDays())data.history[k]=getDayState(k);const text=JSON.stringify(data,null,2);if(navigator.clipboard)navigator.clipboard.writeText(text).then(()=>toast('Tracker data copied as JSON'));else toast('Clipboard unavailable')}
function resetTracker(){if(!confirm('Prayer and Qaza history delete করবেন? Settings থাকবে।'))return;const del=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&(k.startsWith('no_day_')||k.startsWith('no_schedule_')))del.push(k)}del.forEach(k=>localStorage.removeItem(k));refreshAll();toast('Tracker history reset')}

function showPage(name){document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));document.getElementById('page-'+name).classList.add('active');document.querySelectorAll('.nav button').forEach(x=>x.classList.toggle('active',x.dataset.page===name));if(name==='prayer')renderCalendar();if(name==='qaza')renderQaza();if(name==='quran')renderSurahList();if(name==='more')loadSettings();window.scrollTo({top:0,behavior:'smooth'})}
function renderDates(){const n=new Date();document.getElementById('gregorianDate').textContent=n.toLocaleDateString('bn-BD',{weekday:'long',day:'numeric',month:'long',year:'numeric'});try{document.getElementById('hijriDate').textContent=new Intl.DateTimeFormat('bn-BD-u-ca-islamic',{day:'numeric',month:'long',year:'numeric'}).format(n)}catch(e){document.getElementById('hijriDate').textContent='Hijri calendar'} }
function refreshAll(){renderDates();renderToday();renderCalendar();renderQaza()}

renderSurahList();loadSettings();

/* Namaz Orbit v1.1.0 upgrades: alarm test/vibration, end countdown, serial Qaza plan, icons, Qibla, Quran Bangla pronunciation */

const UPGRADE_CSS='/* v1.1 prayer UX */\n.switch-row{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:12px 13px;border:1px solid var(--line);border-radius:16px;background:rgba(255,255,255,.035);color:var(--text)}\n.switch-row span{display:grid;gap:3px}.switch-row small{color:var(--muted);font-size:11px;line-height:1.35}.switch-row input{width:22px;height:22px;accent-color:var(--accent)}\n.test-alarm{border-color:rgba(142,240,207,.3);background:rgba(142,240,207,.07)}\n.orbit-core{width:154px!important;height:154px!important;z-index:5}.qibla-card{display:grid;place-items:center;text-align:center;gap:2px}.qibla-label{font-size:9px;letter-spacing:2px;color:var(--accent)}\n.qibla-dial{width:68px;height:68px;border-radius:50%;position:relative;display:grid;place-items:center;border:1px solid rgba(142,240,207,.24);background:radial-gradient(circle,rgba(142,240,207,.08),rgba(0,0,0,.05));box-shadow:inset 0 0 20px rgba(142,240,207,.06)}\n.qibla-dial:before,.qibla-dial:after{content:"";position:absolute;background:rgba(255,255,255,.1)}.qibla-dial:before{width:1px;height:100%}.qibla-dial:after{height:1px;width:100%}\n.qibla-arrow{position:absolute;font-size:28px;color:var(--accent);transform:rotate(-90deg);transform-origin:center;transition:transform .22s linear;filter:drop-shadow(0 0 7px rgba(142,240,207,.7));z-index:3}.kaaba{font-size:14px;color:#ffe7a4;z-index:2;text-shadow:0 0 10px rgba(255,231,164,.45)}\n#qiblaBearing{font-size:15px}.qibla-card>#qiblaStatus{font-size:8px;max-width:120px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--muted)}.mini-complete{font-size:9px;color:var(--muted);margin-top:1px}\n.prayer-symbol{width:42px;height:42px;display:block;filter:drop-shadow(0 5px 10px rgba(0,0,0,.2));transition:.25s ease}.picon .prayer-symbol{width:38px;height:38px}\n.prayer-card.current-prayer{border-color:rgba(142,240,207,.46);box-shadow:0 0 0 1px rgba(142,240,207,.12),0 0 28px rgba(142,240,207,.11),var(--shadow)}\n.prayer-card.current-prayer .prayer-icon,.picon.active-prayer{filter:drop-shadow(0 0 9px rgba(142,240,207,.95));animation:prayerGlow 1.8s ease-in-out infinite}\n@keyframes prayerGlow{0%,100%{transform:scale(1);opacity:.9}50%{transform:scale(1.08);opacity:1}}\n.end-box{margin-top:6px;display:flex;gap:6px;flex-wrap:wrap;align-items:center}.end-time,.end-countdown{font-size:10px;padding:4px 7px;border-radius:9px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.035);color:var(--muted)}.end-countdown.live{color:var(--warn);border-color:rgba(255,189,122,.22);background:rgba(255,189,122,.055);font-variant-numeric:tabular-nums}\n.qaza-suggestion{margin:12px 0;padding:13px 14px;border-radius:18px;display:flex;gap:11px;align-items:center;border-color:rgba(255,189,122,.2)}.qaza-suggestion .q-icon{width:38px;height:38px;border-radius:13px;display:grid;place-items:center;background:rgba(255,189,122,.1);font-size:18px}.qaza-suggestion b{font-size:13px;display:block}.qaza-suggestion small{font-size:11px;color:var(--muted);line-height:1.45;display:block;margin-top:3px}\n.pronunciation{margin-top:9px;padding:9px 10px;border-left:2px solid rgba(142,240,207,.35);background:rgba(142,240,207,.035);border-radius:0 10px 10px 0;color:#d7fff1;line-height:1.8;font-size:15px}.pronunciation:before{content:"বাংলা উচ্চারণ";display:block;font-size:9px;letter-spacing:.6px;color:var(--accent);margin-bottom:3px;text-transform:uppercase}\n.quran-reading-note{font-size:11px;color:var(--muted);line-height:1.55;margin-top:8px}\n@media (max-width:390px){.orbit-core{width:146px!important;height:146px!important}.qibla-dial{width:62px;height:62px}.qibla-arrow{font-size:25px}.qibla-card>#qiblaStatus{max-width:108px}.end-box{gap:4px}}\n';

function installUpgradeUI(){
  if(!document.getElementById('namazOrbitV110Style')){const st=document.createElement('style');st.id='namazOrbitV110Style';st.textContent=UPGRADE_CSS;document.head.appendChild(st)}
  const core=document.querySelector('.orbit-core');if(core&&!document.getElementById('qiblaCompass')){core.id='qiblaCompass';core.innerHTML=`<div class="qibla-card"><small class="qibla-label">QIBLA</small><div class="qibla-dial"><div class="qibla-arrow" id="qiblaArrow">➤</div><div class="kaaba">▣</div></div><strong id="qiblaBearing">—°</strong><small id="qiblaStatus">Direction loading…</small><div class="mini-complete"><span id="completeCount">0</span>/5 • <span id="todayPercent">0% complete</span></div></div>`}
  const alarm=document.getElementById('alarmSound');if(alarm&&!document.getElementById('vibrationEnabled')){alarm.closest('label').insertAdjacentHTML('afterend',`<label class="switch-row"><span><b>Vibration</b><small>Prayer, Qaza and end-time reminders</small></span><input id="vibrationEnabled" type="checkbox" checked></label><label class="switch-row"><span><b>End-time reminders</b><small>20 minutes before a prayer window ends</small></span><input id="endReminderEnabled" type="checkbox" checked></label>`)}
}

settings=Object.assign({vibration:true,endReminder:true},settings||{});
let nativeHeading=null;
let alarmRefreshGuard=0;

function prayerIconMarkup(key){
  const common='viewBox="0 0 48 48" aria-hidden="true" class="prayer-symbol"';
  if(key==='fajr')return `<svg ${common}><defs><linearGradient id="fg" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#b7fff0"/><stop offset="1" stop-color="#69cbb1"/></linearGradient></defs><path d="M7 32h34" stroke="#77d8bd" stroke-width="2" stroke-linecap="round"/><path d="M16 32a8 8 0 0 1 16 0" fill="url(#fg)" opacity=".95"/><path d="M24 11v7M11 23l5 3M37 23l-5 3" stroke="#b7fff0" stroke-width="2" stroke-linecap="round"/><path d="M10 38h28" stroke="#547f74" stroke-width="2" stroke-linecap="round"/></svg>`;
  if(key==='dhuhr')return `<svg ${common}><circle cx="24" cy="23" r="8" fill="#f7d982"/><g stroke="#ffe9a8" stroke-width="2" stroke-linecap="round"><path d="M24 6v6M24 34v6M7 23h6M35 23h6M12 11l4 4M32 31l4 4M36 11l-4 4M16 31l-4 4"/></g><path d="M10 42h28" stroke="#6a817b" stroke-width="2" stroke-linecap="round"/></svg>`;
  if(key==='asr')return `<svg ${common}><circle cx="31" cy="18" r="7" fill="#ffd38a"/><g stroke="#ffe1a8" stroke-width="2" stroke-linecap="round"><path d="M31 6v4M19 18h4M39 18h4M23 10l3 3M39 10l-3 3"/></g><path d="M7 34c7-7 12-5 17 0 5-6 10-6 17 0" fill="none" stroke="#8ce8cf" stroke-width="2" stroke-linecap="round"/><path d="M8 40h32" stroke="#587a70" stroke-width="2" stroke-linecap="round"/></svg>`;
  if(key==='maghrib')return `<svg ${common}><path d="M7 29h34" stroke="#efae74" stroke-width="2" stroke-linecap="round"/><path d="M16 29a8 8 0 0 0 16 0" fill="#e98f69" opacity=".95"/><g stroke="#ffc293" stroke-width="2" stroke-linecap="round"><path d="M24 11v7M11 21l5 3M37 21l-5 3"/></g><path d="M10 37h28M14 42h20" stroke="#6b706a" stroke-width="2" stroke-linecap="round"/></svg>`;
  return `<svg ${common}><path d="M31 10a13 13 0 1 0 8 22A11 11 0 1 1 31 10Z" fill="#d7e8ff"/><path d="m12 14 1.5 3.2L17 18.5l-3.5 1.3L12 23l-1.5-3.2L7 18.5l3.5-1.3L12 14Z" fill="#8ef0cf"/><circle cx="39" cy="10" r="2" fill="#f5e5aa"/></svg>`;
}

function formatDuration(ms){
  ms=Math.max(0,ms);const h=Math.floor(ms/3600000),m=Math.floor(ms%3600000/60000),s=Math.floor(ms%60000/1000);
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}
function prayerEndForDate(baseDate,times,key){
  const n=new Date(baseDate);n.setDate(n.getDate()+1);return endForPrayer(times,key,computePrayerTimes(n));
}
function activePrayerKey(now,times){
  for(const p of PRAYERS){const start=times[p.key],end=prayerEndForDate(now,times,p.key);if(now>=start&&now<end)return p.key}
  return null;
}
function qazaQueue(){
  const out=[];for(const k of allStoredDays().sort()){
    const s=getDayState(k),sch=getSchedule(k);for(let i=0;i<PRAYERS.length;i++){const p=PRAYERS[i];if(s[p.key]==='qaza')out.push({dateKey:k,prayer:p,index:i,start:sch&&sch[p.key]?new Date(sch[p.key]):null})}
  }
  return out.sort((a,b)=>a.dateKey.localeCompare(b.dateKey)||a.index-b.index);
}
function qazaItemLabel(q){return `${q.prayer.bn} • ${localDateFromKey(q.dateKey).toLocaleDateString('bn-BD',{day:'numeric',month:'short'})}`}

function renderQazaSuggestion(){
  let el=document.getElementById('qazaSuggestion');const queue=qazaQueue();
  if(!el){el=document.createElement('div');el.id='qazaSuggestion';const orbits=document.querySelector('.orbits');if(orbits)orbits.insertAdjacentElement('afterend',el)}
  if(!queue.length){el.className='';el.innerHTML='';return}
  const q=queue[0],next=findNextPrayer(new Date(),todayTimes||computePrayerTimes(new Date()));
  el.className='qaza-suggestion glass';
  el.innerHTML=`<div class="q-icon">↺</div><div><b>Next Qaza plan: ${qazaItemLabel(q)}</b><small>${next.p.bn} শুরু হলে সবচেয়ে পুরনো এই Qaza-টি পড়ার reminder আসবে। Queue সবসময় পুরনো → নতুন serial রাখে।</small></div>`;
}

function renderToday(){
  const now=new Date(),k=dateKey(now);todayTimes=computePrayerTimes(now);saveSchedule(k,todayTimes);autoUpdateQaza();
  const s=getDayState(k),next=findNextPrayer(now,todayTimes),current=activePrayerKey(now,todayTimes),allQaza=qazaQueue();
  document.getElementById('nextPrayer').textContent=next.p.bn;
  const complete=PRAYERS.filter(p=>s[p.key]==='complete'||s[p.key]==='qaza-complete').length;
  document.getElementById('completeCount').textContent=complete;document.getElementById('todayPercent').textContent=Math.round(complete/5*100)+'% complete';
  document.getElementById('qazaBadge').textContent='Qaza '+allQaza.length;document.getElementById('statComplete').textContent=complete;document.getElementById('statQaza').textContent=allQaza.length;
  document.getElementById('locationText').textContent=locationLabel;document.getElementById('statLoc').textContent=coords?'GPS':'Dhaka';document.getElementById('methodChip').textContent=(METHODS[settings.calcMethod]||METHODS.karachi).label+' • '+(settings.asrMethod==='hanafi'?'Hanafi':'Standard');
  const list=document.getElementById('todayPrayerList');list.innerHTML='';
  for(const p of PRAYERS){
    const status=s[p.key]||'pending',end=prayerEndForDate(now,todayTimes,p.key),isCurrent=current===p.key;
    const div=document.createElement('div');div.className='prayer-card glass'+(isCurrent?' current-prayer':'');div.dataset.prayer=p.key;
    let statusText=status==='complete'?'✓ Complete':status==='qaza'?'Qaza due':status==='qaza-complete'?'✓ Qaza complete':(todayTimes[p.key]>now?'Upcoming':isCurrent?'In prayer window':'Window ended');
    let action='';if(status==='pending'&&todayTimes[p.key]<=now&&now<end)action=`<button class="action" onclick="markComplete('${k}','${p.key}')">Prayer Complete</button>`;
    if(status==='complete')action=`<button class="action" onclick="markUndo('${k}','${p.key}')">Undo</button>`;
    if(status==='qaza')action=`<button class="action warn" onclick="markComplete('${k}','${p.key}',true)">Complete Qaza</button>`;
    div.innerHTML=`<div class="prayer-icon">${prayerIconMarkup(p.key)}</div><div><h4>${p.bn} <small>• ${p.name}</small></h4><small>Start ${formatTime(todayTimes[p.key])}</small><div class="end-box"><span class="end-time">End ${formatTime(end)}</span><span class="end-countdown ${isCurrent?'live':''}" id="endcd_${p.key}">${isCurrent?'Ends in '+formatDuration(end-now):todayTimes[p.key]>now?'Upcoming':'Ended'}</span></div>${action}</div><div class="time">${formatTime(todayTimes[p.key])}<div class="status ${status==='qaza'?'qaza':status.includes('complete')?'complete':''}">${statusText}</div></div>`;
    list.appendChild(div)
  }
  updateOrbitIcons(current);updateCountdown();updatePrayerEndCountdowns();renderQazaSuggestion();updateQibla();scheduleAlarms();
}
function updatePrayerEndCountdowns(){
  if(!todayTimes)return;const now=new Date(),current=activePrayerKey(now,todayTimes);
  for(const p of PRAYERS){const el=document.getElementById('endcd_'+p.key);if(!el)continue;const end=prayerEndForDate(now,todayTimes,p.key);if(current===p.key){el.textContent='Ends in '+formatDuration(end-now);el.classList.add('live')}else{el.classList.remove('live');el.textContent=todayTimes[p.key]>now?'Upcoming':now>=end?'Ended':'Waiting'}}
  updateOrbitIcons(current);
}
function updateOrbitIcons(current){
  document.querySelectorAll('.orbit.one .picon').forEach((el,i)=>{const p=PRAYERS[i];el.innerHTML=prayerIconMarkup(p.key);el.classList.toggle('active-prayer',p.key===current);el.title=`${p.bn} • ${p.name}`});
}
function updateCountdown(){
  if(!todayTimes)return;const now=new Date(),n=findNextPrayer(now,todayTimes),ms=Math.max(0,n.date-now),h=Math.floor(ms/3600000),m=Math.floor(ms%3600000/60000),s=Math.floor(ms%60000/1000);
  document.getElementById('countdown').textContent=`${pad(h)}:${pad(m)}:${pad(s)}`;document.getElementById('statNext').textContent=h?`${h}h ${m}m`:`${m}m`;updatePrayerEndCountdowns();
}

function scheduleNative(id,title,body,at,sound,vibrate){
  if(!window.AndroidBridge||at<=Date.now()+800)return;
  try{if(window.AndroidBridge.scheduleAlarmV2)window.AndroidBridge.scheduleAlarmV2(id,title,body,at,sound,!!vibrate);else window.AndroidBridge.scheduleAlarm(id,title,at,sound)}catch(e){}
}
function scheduleAlarms(){
  if(!window.AndroidBridge||!todayTimes)return;if(Date.now()-alarmRefreshGuard<1500)return;alarmRefreshGuard=Date.now();
  const sound=settings.alarmSound||'alarm',pre=Number(settings.preReminder)||0,vibrate=settings.vibration!==false,queue=qazaQueue();
  try{window.AndroidBridge.requestExactAlarmPermission();if(window.AndroidBridge.clearAllScheduledAlarms)window.AndroidBridge.clearAllScheduledAlarms()}catch(e){}
  const events=[];
  for(let dayOffset=0;dayOffset<=1;dayOffset++){
    const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()+dayOffset);const times=computePrayerTimes(d),k=dateKey(d);saveSchedule(k,times);
    const nd=new Date(d);nd.setDate(nd.getDate()+1);const nextTimes=computePrayerTimes(nd);
    for(const p of PRAYERS){const at=times[p.key].getTime();events.push({k,p,at,times,nextTimes});}
  }
  events.sort((a,b)=>a.at-b.at);let qIndex=0;
  for(const e of events){
    const {k,p,at,times,nextTimes}=e;if(at>Date.now()){
      scheduleNative(`NO_${k}_${p.key}_start`,`${p.bn} • ${p.name}`,'নামাজের সময় শুরু হয়েছে। Namaz Orbit-এ status update করুন।',at,sound,vibrate);
      if(pre>0) scheduleNative(`NO_${k}_${p.key}_pre`,`${p.bn} ${pre} মিনিট পরে`,`আর ${pre} মিনিট পরে ${p.bn} শুরু হবে।`,at-pre*60000,sound,vibrate);
      if(qIndex<queue.length){const q=queue[qIndex++];scheduleNative(`NO_QAZA_${k}_${p.key}`,`Qaza reminder • ${p.bn} time`,`Serial #${qIndex}: সবচেয়ে পুরনো Qaza — ${qazaItemLabel(q)}। এই নামাজের সাথে ১টি Qaza আদায়ের reminder।`,at+15000,sound,vibrate)}
    }
    if(settings.endReminder!==false){const end=endForPrayer(times,p.key,nextTimes).getTime();for(const mins of [20])scheduleNative(`NO_${k}_${p.key}_end_${mins}`,`${p.bn} সময় শেষ হতে ${mins} মিনিট`,`এই নামাজের সময় শেষ হতে প্রায় ${mins} মিনিট বাকি। Complete হয়ে থাকলে app-এ mark করুন।`,end-mins*60000,sound,vibrate)}
  }
}
function cancelPrayerReminderIds(k,p){
  if(!window.AndroidBridge)return;try{for(const suffix of ['start','pre','end_20','end_10'])window.AndroidBridge.cancelAlarm&&window.AndroidBridge.cancelAlarm(`NO_${k}_${p}_${suffix}`);window.AndroidBridge.cancelByPrefix&&window.AndroidBridge.cancelByPrefix('NO_QAZA_')}catch(e){}
}
function markComplete(k,p,fromQaza=false){const s=getDayState(k);s[p]=fromQaza?'qaza-complete':'complete';s[p+'_at']=Date.now();setDayState(k,s);cancelPrayerReminderIds(k,p);alarmRefreshGuard=0;refreshAll();toast(fromQaza?'Qaza marked complete • next serial item planned':'Prayer marked complete')}

function saveSettings(){
  settings={calcMethod:document.getElementById('calcMethod').value,asrMethod:document.getElementById('asrMethod').value,adjust:Number(document.getElementById('timeAdjustment').value)||0,alarmSound:document.getElementById('alarmSound').value,preReminder:Number(document.getElementById('preReminder').value)||0,vibration:document.getElementById('vibrationEnabled').checked,endReminder:document.getElementById('endReminderEnabled').checked};
  localStorage.setItem('no_settings',JSON.stringify(settings));alarmRefreshGuard=0;renderToday();renderCalendar();toast('Settings saved & smart alarms rescheduled')
}
function loadSettings(){
  document.getElementById('calcMethod').value=settings.calcMethod||'karachi';document.getElementById('asrMethod').value=settings.asrMethod||'hanafi';document.getElementById('timeAdjustment').value=settings.adjust||0;document.getElementById('alarmSound').value=settings.alarmSound||'alarm';document.getElementById('preReminder').value=settings.preReminder||0;
  const v=document.getElementById('vibrationEnabled'),e=document.getElementById('endReminderEnabled');if(v)v.checked=settings.vibration!==false;if(e)e.checked=settings.endReminder!==false;
}
async function testAlarm(){
  const sound=document.getElementById('alarmSound').value||'alarm',v=document.getElementById('vibrationEnabled').checked;
  if(window.AndroidBridge){if(window.AndroidBridge.testAlarm){window.AndroidBridge.testAlarm(sound,v);toast('Test alarm will ring in 3 seconds');return}if(window.AndroidBridge.scheduleAlarm){window.AndroidBridge.scheduleAlarm('NO_TEST_'+Date.now(),'Namaz Orbit • Test Alarm',Date.now()+3000,sound);toast('Test alarm will ring in 3 seconds');return}}
  if('Notification'in window){try{const perm=await Notification.requestPermission();if(perm==='granted')setTimeout(()=>new Notification('Namaz Orbit • Test Alarm',{body:'Alarm + vibration test'}),1500)}catch(e){}}
  if(v&&navigator.vibrate)navigator.vibrate([250,120,250]);toast('Web test triggered. Android APK provides full alarm test.')
}

function qiblaBearingDegrees(){
  const c=coords||{lat:23.8103,lon:90.4125},lat=dtr(c.lat),lon=dtr(c.lon),klat=dtr(21.4225),klon=dtr(39.8262),dlon=klon-lon;
  return fixAngle(rtd(Math.atan2(Math.sin(dlon),Math.cos(lat)*Math.tan(klat)-Math.sin(lat)*Math.cos(dlon))));
}
function cardinal(deg){const x=['N','NE','E','SE','S','SW','W','NW'];return x[Math.round(deg/45)%8]}
function updateQibla(){
  if(window.AndroidBridge&&window.AndroidBridge.setCompassLocation&&coords){try{window.AndroidBridge.setCompassLocation(coords.lat,coords.lon)}catch(e){}}
  const bearing=qiblaBearingDegrees(),arrow=document.getElementById('qiblaArrow'),label=document.getElementById('qiblaBearing'),status=document.getElementById('qiblaStatus');if(!arrow)return;
  const heading=nativeHeading==null?0:nativeHeading,rotation=bearing-heading-90;arrow.style.transform=`rotate(${rotation}deg)`;label.textContent=`${Math.round(bearing)}° ${cardinal(bearing)}`;status.textContent=nativeHeading==null?'Tap compass • point phone north':'Live compass • align arrow up';
}
window.onNativeHeading=function(deg){if(Number.isFinite(Number(deg))){nativeHeading=Number(deg);updateQibla()}};
function orientationHandler(e){let h=null;if(typeof e.webkitCompassHeading==='number')h=e.webkitCompassHeading;else if(e.absolute&&typeof e.alpha==='number')h=360-e.alpha;else if(typeof e.alpha==='number')h=360-e.alpha;if(h!=null){nativeHeading=fixAngle(h);updateQibla()}}
async function enableCompass(){
  try{if(typeof DeviceOrientationEvent!=='undefined'&&typeof DeviceOrientationEvent.requestPermission==='function'){const p=await DeviceOrientationEvent.requestPermission();if(p!=='granted')throw new Error('denied')}window.addEventListener('deviceorientationabsolute',orientationHandler,true);window.addEventListener('deviceorientation',orientationHandler,true);toast('Qibla compass enabled')}catch(e){toast('Compass permission unavailable; showing Qibla bearing')}
}

function latinToBanglaQuran(input){
  if(!input)return '';
  let s=String(input).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[ʿ‘’`]/g,"'").toLowerCase();
  const phrase=[['allahu','আল্লাহু'],['allahi','আল্লাহি'],['allah','আল্লাহ'],['ar-rahmani','আর-রাহমানি'],['ar-rahimi','আর-রাহীমি'],['bismi','বিসমি']];for(const [a,b] of phrase)s=s.split(a).join(b);
  const words=s.split(/(\s+|[-,.!?;:()])/);return words.map(w=>{if(!w||/^\s+$/.test(w)||/^[-,.!?;:()]$/.test(w)||/[\u0980-\u09ff]/.test(w))return w;return phoneticWord(w)}).join('');
}
function phoneticWord(w){
  w=w.replace(/kh/g,'K').replace(/gh/g,'G').replace(/sh/g,'S').replace(/th/g,'T').replace(/dh/g,'D').replace(/ch/g,'C').replace(/aa/g,'A').replace(/ee/g,'I').replace(/ii/g,'I').replace(/oo/g,'U').replace(/uu/g,'U').replace(/ph/g,'F').replace(/q/g,'Q').replace(/'/g,'');
  const C={K:'খ',G:'গ',S:'শ',T:'থ',D:'ধ',C:'চ',Q:'ক্ব',b:'ব',c:'ক',d:'দ',f:'ফ',g:'গ',h:'হ',j:'জ',k:'ক',l:'ল',m:'ম',n:'ন',p:'প',r:'র',s:'স',t:'ত',v:'ভ',w:'ও',x:'ক্স',y:'ইয়',z:'য'};
  const V={a:['আ','া'],i:['ই','ি'],u:['উ','ু'],e:['এ','ে'],o:['ও','ো'],A:['আ','া'],I:['ঈ','ী'],U:['ঊ','ূ']};let out='',has=false;
  for(let i=0;i<w.length;i++){const ch=w[i];if(V[ch]){out+=has?V[ch][1]:V[ch][0];has=false}else if(C[ch]){out+=C[ch];has=true;const nx=w[i+1];if(!V[nx]&&nx!==undefined&&C[nx])out+='্'}else{out+=ch;has=false}}
  if(has)out+='্';return out.replace(/্্/g,'্');
}

// Quran source: quran-json chapter files carry Uthmani text + Tanzil transliteration + Bengali translation.
dbOpen=function(){return new Promise((res,rej)=>{const r=indexedDB.open('namaz_orbit_quran',2);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('surahs'))r.result.createObjectStore('surahs',{keyPath:'number'})};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})};
fetchSurah=async function(n){
  const cached=await dbGet(n);if(cached&&cached.pronVersion===1)return cached;
  try{
    const r=await fetch(`https://cdn.jsdelivr.net/npm/quran-json@3.1.2/dist/chapters/bn/${n}.json`);if(!r.ok)throw new Error('CDN');const j=await r.json(),verses=j.verses||j.ayahs||[];
    if(!verses.length)throw new Error('No verses');const v={number:n,name:j.transliteration||j.name||('Surah '+n),arabicName:j.name||'',pronVersion:1,ayahs:verses.map((a,i)=>({number:a.id||a.number||a.numberInSurah||i+1,ar:a.text||a.arabic||'',bn:a.translation||a.bn||'',tr:a.transliteration||'',pronBn:latinToBanglaQuran(a.transliteration||'')}))};await dbPut(v);return v;
  }catch(err){
    const url=`https://api.alquran.cloud/v1/surah/${n}/editions/quran-uthmani,bn.bengali`;const r=await fetch(url);if(!r.ok)throw new Error('Quran API error');const j=await r.json(),arabic=j.data&&j.data[0],bangla=j.data&&j.data[1];if(!arabic||!bangla)throw new Error('Quran data unavailable');const v={number:n,name:arabic.englishName,arabicName:arabic.name,pronVersion:1,ayahs:arabic.ayahs.map((a,i)=>({number:a.numberInSurah,ar:a.text,bn:bangla.ayahs[i]?bangla.ayahs[i].text:'',tr:'',pronBn:''}))};await dbPut(v);return v;
  }
};
openSurah=async function(n){
  document.getElementById('surahBrowser').style.display='none';document.getElementById('surahReader').style.display='block';document.getElementById('surahTitle').textContent='Loading…';document.getElementById('ayahList').innerHTML='<div class="notice">Quran text + বাংলা উচ্চারণ loading…</div>';
  try{const s=await fetchSurah(n);document.getElementById('surahTitle').textContent=`${s.number}. ${s.name} • ${s.arabicName}`;document.getElementById('ayahList').innerHTML=s.ayahs.map(a=>`<article class="ayah"><div class="ayah-no">AYAH ${a.number}</div><div class="arabic">${escapeHtml(a.ar)}</div>${a.pronBn?`<div class="pronunciation">${escapeHtml(a.pronBn)}</div>`:''}<div class="bangla">${escapeHtml(a.bn)}</div></article>`).join('')+`<div class="notice quran-reading-note">বাংলা উচ্চারণটি reading aid। সঠিক মাখরাজ/তাজবীদ শেখার জন্য বিশ্বস্ত শিক্ষক বা কারীর তিলাওয়াত অনুসরণ করুন।</div>`}catch(e){document.getElementById('ayahList').innerHTML='<div class="notice">Quran data could not load. Check internet and try again. Previously downloaded Surahs remain available offline.</div>'}
};

(function initV110(){
  installUpgradeUI();
  localStorage.setItem('no_settings',JSON.stringify(settings));
  loadSettings();
})();
