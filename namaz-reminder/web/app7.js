/* Namaz Orbit v1.3.0 — prayer cycle, Qibla, settings, location, navbar fixes */
const V13_CSS = '\
.topbar{padding-top:max(18px,env(safe-area-inset-top))}.brand .logo{overflow:hidden;padding:0}.brand .logo svg{width:100%;height:100%;display:block}.location-trigger{display:flex;align-items:center;gap:7px}.location-trigger svg{width:18px;height:18px}\
#page-home .orbits{order:-1;margin-top:4px;height:390px}.app main{display:flex;flex-direction:column}#page-home{display:none}#page-home.active{display:flex;flex-direction:column}.orbit.one{width:340px;height:340px}.orbit.two{width:270px;height:270px}.orbit-core{width:178px!important;height:178px!important}.qibla-v13{display:grid;place-items:center;text-align:center;gap:3px}.qibla-v13 .dial{width:92px;height:92px;border-radius:50%;border:1px solid rgba(142,240,207,.32);position:relative;display:grid;place-items:center;background:radial-gradient(circle,rgba(142,240,207,.09),rgba(1,10,8,.4));box-shadow:inset 0 0 22px rgba(142,240,207,.08),0 0 28px rgba(142,240,207,.08)}.qibla-v13 .dial:before{content:"N";position:absolute;top:3px;font-size:8px;color:var(--muted)}.qibla-v13 .needle{font-size:35px;line-height:1;color:var(--accent);filter:drop-shadow(0 0 8px rgba(142,240,207,.85));transition:transform .18s linear;transform:rotate(-90deg)}.qibla-v13 .kaaba-dot{position:absolute;width:15px;height:15px;border:2px solid #f5d88c;border-radius:3px;box-shadow:0 0 10px rgba(245,216,140,.45)}.qibla-v13 strong{font-size:14px}.qibla-v13 small{font-size:8px;color:var(--muted);max-width:140px}.orbit .picon{background:#0b1e19;border:1px solid rgba(142,240,207,.18);display:grid;place-items:center}.orbit .picon svg{width:31px;height:31px}.orbit .picon.active-prayer{box-shadow:0 0 0 2px rgba(142,240,207,.22),0 0 22px rgba(142,240,207,.7);border-color:var(--accent)}\
.prayer-card{grid-template-columns:48px 1fr auto}.prayer-card .phase{font-size:10px;margin-top:5px;color:var(--muted)}.prayer-card .phase.live{color:var(--accent);font-weight:700}.prayer-card .phase.soon{color:var(--warn)}.prayer-card .countdown-chip{display:inline-flex;margin-top:5px;padding:4px 7px;border-radius:9px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);font-size:10px;font-variant-numeric:tabular-nums}.prayer-card.current-prayer{border-color:rgba(142,240,207,.48);box-shadow:0 0 28px rgba(142,240,207,.1)}\
.nav{grid-template-columns:repeat(6,1fr)!important;padding:7px!important}.nav button{padding:7px 1px!important;font-size:9px!important}.nav button i{height:22px;display:grid!important;place-items:center}.nav button svg{width:21px;height:21px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.nav button[data-page="prayer"] svg{width:23px;height:23px}.nav button[data-page="events"] svg{width:22px;height:22px}.nav button.active{color:var(--accent)}\
.location-modal{position:fixed;z-index:90;inset:0;background:rgba(0,0,0,.72);display:none;align-items:flex-end;justify-content:center}.location-modal.open{display:flex}.location-sheet{width:min(100%,720px);border-radius:28px 28px 0 0;padding:20px 18px calc(25px + env(safe-area-inset-bottom));background:#091713;border:1px solid var(--line);box-shadow:0 -30px 80px rgba(0,0,0,.55)}.location-art{width:58px;height:58px;border-radius:20px;display:grid;place-items:center;margin-bottom:12px;background:rgba(142,240,207,.08);border:1px solid rgba(142,240,207,.2)}.location-art svg{width:31px;height:31px;stroke:var(--accent);fill:none;stroke-width:1.8}.location-sheet h2{margin:0 0 7px}.location-sheet p{color:var(--muted);line-height:1.6;font-size:13px}.location-actions{display:grid;gap:9px;margin-top:14px}.location-note{font-size:10px;color:var(--muted);line-height:1.5;margin-top:10px}\
.test-panel .test-row{display:flex;gap:10px;align-items:center;justify-content:space-between}.test-panel .test-icon{width:44px;height:44px;border-radius:15px;display:grid;place-items:center;border:1px solid rgba(142,240,207,.2);background:rgba(142,240,207,.07)}.test-panel .test-icon svg{width:24px;height:24px;stroke:var(--accent);fill:none;stroke-width:1.8}.tz-chip{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-radius:14px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.08);font-size:12px}.tz-chip b{color:var(--accent)}\
@media(max-width:400px){#page-home .orbits{height:350px}.orbit.one{width:310px;height:310px}.orbit.two{width:246px;height:246px}.orbit-core{width:164px!important;height:164px!important}.qibla-v13 .dial{width:82px;height:82px}.nav button{font-size:8px!important}}';

function v13Svg(name){
  if(name==='location')return '<svg viewBox="0 0 24 24"><path d="M12 21s6-5.1 6-11a6 6 0 1 0-12 0c0 5.9 6 11 6 11Z"/><circle cx="12" cy="10" r="2.2"/></svg>';
  if(name==='home')return '<svg viewBox="0 0 24 24"><path d="m4 11 8-7 8 7v9h-6v-6h-4v6H4Z"/></svg>';
  if(name==='prayer')return '<svg viewBox="0 0 24 24"><circle cx="16.8" cy="7.2" r="2.2"/><path d="M14.8 9.2c-2.7 1.1-4.4 2.9-5.3 5.3M9.5 14.5 5 16.6M9.5 14.5l4 2.1M13.5 16.6h5.7M5 16.6h-2M7.3 18.8h11.9"/></svg>';
  if(name==='quran')return '<svg viewBox="0 0 24 24"><path d="M3.5 5.5c3.2-1 5.9-.4 8.5 1.5v12c-2.6-1.9-5.3-2.5-8.5-1.5Z"/><path d="M20.5 5.5c-3.2-1-5.9-.4-8.5 1.5v12c2.6-1.9 5.3-2.5 8.5-1.5Z"/></svg>';
  if(name==='qaza')return '<svg viewBox="0 0 24 24"><path d="M5.5 7.5H2.8V4.8"/><path d="M3.2 7.2A9 9 0 1 1 4.7 18"/><path d="M12 7v5l3 2"/></svg>';
  if(name==='events')return '<svg viewBox="0 0 24 24"><path d="M7 3v3M17 3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z"/><path d="m12 11 .7 1.6 1.8.2-1.3 1.2.4 1.8-1.6-.9-1.6.9.4-1.8-1.3-1.2 1.8-.2Z"/></svg>';
  if(name==='more')return '<svg viewBox="0 0 24 24"><path d="M5 7h14M5 12h14M5 17h14"/></svg>';
  if(name==='bell')return '<svg viewBox="0 0 24 24"><path d="M6 17h12l-1.4-2V10a4.6 4.6 0 0 0-9.2 0v5Z"/><path d="M10 20h4"/></svg>';
  return '';
}
function v13LogoSvg(){return '<svg viewBox="0 0 48 48" aria-label="Namaz Orbit logo"><defs><linearGradient id="noG" x1="0" x2="1"><stop stop-color="#8ef0cf"/><stop offset="1" stop-color="#f2d58a"/></linearGradient></defs><rect x="2" y="2" width="44" height="44" rx="14" fill="#09241d" stroke="url(#noG)" stroke-width="1.4"/><path d="M31 10a13 13 0 1 0 6 22 11 11 0 1 1-6-22Z" fill="url(#noG)"/><ellipse cx="24" cy="24" rx="18" ry="7" fill="none" stroke="#8ef0cf" stroke-width="1.3" transform="rotate(-20 24 24)"/><circle cx="40" cy="18" r="2.2" fill="#f2d58a"/><path d="M24 18v13m0-13-4 7 4-2 4 2Z" fill="#8ef0cf" stroke="#062119" stroke-width=".6"/></svg>'}

function installV13Style(){if(document.getElementById('v13-style'))return;var s=document.createElement('style');s.id='v13-style';s.textContent=V13_CSS;document.head.appendChild(s)}

function isBangladeshCoords(c){return !!c && c.lat>=20.4&&c.lat<=26.7&&c.lon>=88.0&&c.lon<=92.8}
function locationNow(){
  if(isBangladeshCoords(coords)){try{return new Date(new Date().toLocaleString('en-US',{timeZone:'Asia/Dhaka'}))}catch(e){}}
  return new Date();
}
function locationUtcOffsetHours(date){return isBangladeshCoords(coords)?6:-date.getTimezoneOffset()/60}
function actualEpochForWallDate(d){
  if(!isBangladeshCoords(coords))return d.getTime();
  return Date.UTC(d.getFullYear(),d.getMonth(),d.getDate(),d.getHours(),d.getMinutes(),d.getSeconds(),d.getMilliseconds())-6*3600000;
}
formatTime=function(d){if(!d)return '—';return d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',hour12:true})};

computeHours=function(date,lat,lon){
  var y=date.getFullYear(),m=date.getMonth()+1,d=date.getDate(),jd=julian(y,m,d)-lon/(15*24);
  var t={fajr:5,sunrise:6,dhuhr:12,asr:13,maghrib:18,isha:18},method=METHODS[settings.calcMethod]||METHODS.karachi;
  for(var iter=0;iter<2;iter++){var x={};for(var k in t)x[k]=t[k]/24;t.fajr=sunAngleTime(jd,method.fajr,x.fajr,'ccw',lat);t.sunrise=sunAngleTime(jd,.833,x.sunrise,'ccw',lat);t.dhuhr=midDay(jd,x.dhuhr);t.asr=asrTime(jd,settings.asrMethod==='hanafi'?2:1,x.asr,lat);t.maghrib=sunAngleTime(jd,.833,x.maghrib,'cw',lat);t.isha=sunAngleTime(jd,method.isha,x.isha,'cw',lat)}
  var tz=locationUtcOffsetHours(date);for(var q in t)t[q]+=tz-lon/15+(Number(settings.adjust)||0)/60;return t;
};

var v13PrayerCache=Object.create(null);
function v13PrayerCacheKey(date){
  var c=coords||{lat:23.8103,lon:90.4125};
  return dateKey(date)+'|'+c.lat.toFixed(4)+'|'+c.lon.toFixed(4)+'|'+(settings.calcMethod||'karachi')+'|'+(settings.asrMethod||'hanafi')+'|'+(Number(settings.adjust)||0);
}
function v13CachedPrayerTimes(date){
  var key=v13PrayerCacheKey(date);
  if(v13PrayerCache[key])return v13PrayerCache[key];
  var value=computePrayerTimes(date);
  v13PrayerCache[key]=value;
  var keys=Object.keys(v13PrayerCache);
  if(keys.length>12)delete v13PrayerCache[keys[0]];
  return value;
}
function prayerCycleContext(now){
  now=now||locationNow();
  var civil=new Date(now.getFullYear(),now.getMonth(),now.getDate(),12,0,0),today=v13CachedPrayerTimes(civil),base=new Date(civil);
  if(now<today.fajr)base.setDate(base.getDate()-1);
  var times=v13CachedPrayerTimes(base),nextDate=new Date(base);nextDate.setDate(nextDate.getDate()+1);var nextTimes=v13CachedPrayerTimes(nextDate);
  return {now:now,baseDate:base,key:dateKey(base),times:times,nextTimes:nextTimes};
}
function v13PrayerEnd(ctx,key){return endForPrayer(ctx.times,key,ctx.nextTimes)}
function v13CurrentPrayer(ctx){
  for(var i=0;i<PRAYERS.length;i++){var p=PRAYERS[i],start=ctx.times[p.key],end=v13PrayerEnd(ctx,p.key);if(ctx.now>=start&&ctx.now<end)return p.key}
  return null;
}
function v13NextPrayer(ctx){
  for(var i=0;i<PRAYERS.length;i++){var p=PRAYERS[i];if(ctx.times[p.key]>ctx.now)return {p:p,date:ctx.times[p.key]}}
  return {p:PRAYERS[0],date:ctx.nextTimes.fajr};
}
function v13Duration(ms){ms=Math.max(0,ms);var h=Math.floor(ms/3600000),m=Math.floor(ms%3600000/60000),s=Math.floor(ms%60000/1000);return pad(h)+':'+pad(m)+':'+pad(s)}
function v13Icon(key){
  if(typeof prayerIconMarkup==='function')return prayerIconMarkup(key);
  var label={fajr:'F',dhuhr:'D',asr:'A',maghrib:'M',isha:'I'}[key]||'•';
  return '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="17" fill="none" stroke="#8ef0cf" stroke-width="2"/><text x="24" y="29" text-anchor="middle" fill="#8ef0cf" font-size="15" font-family="sans-serif">'+label+'</text></svg>';
}

var v13LastQazaSweep=0;
function autoUpdateQazaV13(force){
  var ts=Date.now();
  if(!force&&ts-v13LastQazaSweep<60000)return false;
  v13LastQazaSweep=ts;
  var now=locationNow(),ctx=prayerCycleContext(now),keys=[],changedAny=false;
  for(var i=0;i<localStorage.length;i++){var kk=localStorage.key(i);if(kk&&kk.indexOf('no_schedule_')===0)keys.push(kk.replace('no_schedule_',''))}
  if(keys.indexOf(ctx.key)<0)keys.push(ctx.key);
  keys.forEach(function(k){
    var schedule=getSchedule(k),base=localDateFromKey(k);if(!schedule){if(k!==ctx.key)return;var tt=v13CachedPrayerTimes(base);saveSchedule(k,tt);schedule=getSchedule(k)}
    var state=getDayState(k),nextBase=new Date(base);nextBase.setDate(nextBase.getDate()+1);var next=v13CachedPrayerTimes(nextBase),temp={},changed=false;
    PRAYERS.forEach(function(p){temp[p.key]=new Date(schedule[p.key])});temp.sunrise=new Date(schedule.sunrise);
    PRAYERS.forEach(function(p){if(state[p.key]==='complete'||state[p.key]==='qaza-complete'||state[p.key]==='qaza')return;var end=endForPrayer(temp,p.key,next);if(now>=end){state[p.key]='qaza';changed=true;changedAny=true}});
    if(changed)setDayState(k,state);
  });
  return changedAny;
}
autoUpdateQaza=autoUpdateQazaV13;

function renderTodayV13(){
  window._lastHomeFullRenderV13=Date.now();
  var ctx=prayerCycleContext(),k=ctx.key;todayTimes=ctx.times;saveSchedule(k,ctx.times);autoUpdateQazaV13();
  var state=getDayState(k),current=v13CurrentPrayer(ctx),next=v13NextPrayer(ctx);
  var complete=PRAYERS.filter(function(p){return state[p.key]==='complete'||state[p.key]==='qaza-complete'}).length;
  var allQ=typeof qazaQueue==='function'?qazaQueue():[];
  document.getElementById('nextPrayer').textContent=next.p.bn;
  var cc=document.getElementById('completeCount');if(cc)cc.textContent=complete;
  var tp=document.getElementById('todayPercent');if(tp)tp.textContent=Math.round(complete/5*100)+'% complete';
  var qb=document.getElementById('qazaBadge');if(qb)qb.textContent='Qaza '+(allQ.length||0);
  var sc=document.getElementById('statComplete');if(sc)sc.textContent=complete;
  var sq=document.getElementById('statQaza');if(sq)sq.textContent=allQ.length||0;
  var loc=document.getElementById('locationText');if(loc)loc.textContent=locationLabel;
  var sl=document.getElementById('statLoc');if(sl)sl.textContent=isBangladeshCoords(coords)?'Dhaka':'Auto';
  var chip=document.getElementById('methodChip');if(chip)chip.textContent=(METHODS[settings.calcMethod]||METHODS.karachi).label+' • '+(settings.asrMethod==='hanafi'?'Hanafi':'Standard');
  var title=document.querySelector('#page-home .section-title h3');if(title)title.textContent='আজকের নামাজ • ফজর → পরের ফজর';
  var list=document.getElementById('todayPrayerList');if(!list)return;list.innerHTML='';
  PRAYERS.forEach(function(p){
    var st=state[p.key]||'pending',start=ctx.times[p.key],end=v13PrayerEnd(ctx,p.key),isCurrent=current===p.key,phase='',count='',action='';
    if(st==='complete'||st==='qaza-complete'){phase=st==='complete'?'✓ Complete':'✓ Qaza complete'}
    else if(st==='qaza'){phase='Qaza due'}
    else if(ctx.now<start){phase='Starts in';count=v13Duration(start-ctx.now)}
    else if(ctx.now<end){var rem=end-ctx.now;phase=rem<=15*60000?'Ending soon':'Prayer time active';count='Ends in '+v13Duration(rem)}
    else{phase='Window ended'}
    if(st==='pending'&&isCurrent)action='<button class="action" onclick="markComplete(\''+k+'\',\''+p.key+'\')">Prayer Complete</button>';
    if(st==='complete')action='<button class="action" onclick="markUndo(\''+k+'\',\''+p.key+'\')">Undo</button>';
    if(st==='qaza')action='<button class="action warn" onclick="markComplete(\''+k+'\',\''+p.key+'\',true)">Complete Qaza</button>';
    var card=document.createElement('div');card.className='prayer-card glass'+(isCurrent?' current-prayer':'');
    card.innerHTML='<div class="prayer-icon">'+v13Icon(p.key)+'</div><div><h4>'+p.bn+' <small>• '+p.name+'</small></h4><small>Start '+formatTime(start)+' • End '+formatTime(end)+'</small><div class="phase '+(isCurrent?'live':'')+'">'+phase+'</div>'+(count?'<div class="countdown-chip" id="v13cd_'+p.key+'">'+count+'</div>':'')+action+'</div><div class="time">'+formatTime(start)+'</div>';
    list.appendChild(card);
  });
  v13UpdateOrbit(current);updateCountdownV13();scheduleAlarmsV13();updateQiblaV13();
}
renderToday=renderTodayV13;

function updateCountdownV13(){
  var ctx=prayerCycleContext(),next=v13NextPrayer(ctx),ms=Math.max(0,next.date-ctx.now),h=Math.floor(ms/3600000),m=Math.floor(ms%3600000/60000),s=Math.floor(ms%60000/1000);
  var c=document.getElementById('countdown');if(c)c.textContent=pad(h)+':'+pad(m)+':'+pad(s);
  var st=document.getElementById('statNext');if(st)st.textContent=h?h+'h '+m+'m':m+'m';
  var current=v13CurrentPrayer(ctx);
  PRAYERS.forEach(function(p){var el=document.getElementById('v13cd_'+p.key);if(!el)return;var start=ctx.times[p.key],end=v13PrayerEnd(ctx,p.key);if(current===p.key)el.textContent='Ends in '+v13Duration(end-ctx.now);else if(ctx.now<start)el.textContent=v13Duration(start-ctx.now)});
  v13UpdateOrbit(current);
}
updateCountdown=updateCountdownV13;

var v13AlarmScheduleSignature='';
function scheduleAlarmsV13(force){
  if(!window.AndroidBridge)return;
  var baseCtx=prayerCycleContext(),c=coords||{lat:23.8103,lon:90.4125};
  var sig=baseCtx.key+'|'+c.lat.toFixed(4)+'|'+c.lon.toFixed(4)+'|'+JSON.stringify(settings);
  if(!force&&sig===v13AlarmScheduleSignature)return;
  v13AlarmScheduleSignature=sig;
  var sound=settings.alarmSound||'alarm',pre=Number(settings.preReminder)||0,vibrate=settings.vibration!==false;
  try{if(window.AndroidBridge.requestExactAlarmPermission)window.AndroidBridge.requestExactAlarmPermission()}catch(e){}
  var base=baseCtx.baseDate;
  for(var offset=0;offset<3;offset++){
    var d=new Date(base);d.setDate(d.getDate()+offset);var times=computePrayerTimes(d),nd=new Date(d);nd.setDate(nd.getDate()+1);var nextTimes=computePrayerTimes(nd),k=dateKey(d);
    PRAYERS.forEach(function(p){
      var start=times[p.key],at=actualEpochForWallDate(start),end=endForPrayer(times,p.key,nextTimes),endAt=actualEpochForWallDate(end);
      if(at>Date.now()+1000){try{if(window.AndroidBridge.scheduleAlarmV2)window.AndroidBridge.scheduleAlarmV2('NO_'+k+'_'+p.key+'_start',p.bn+' • '+p.name,'নামাজের সময় শুরু হয়েছে।',at,sound,vibrate)}catch(e){}
        if(pre>0&&at-pre*60000>Date.now()+1000){try{window.AndroidBridge.scheduleAlarmV2('NO_'+k+'_'+p.key+'_pre',p.bn+' '+pre+' মিনিট পরে','আর '+pre+' মিনিট পরে '+p.bn+' শুরু হবে।',at-pre*60000,sound,vibrate)}catch(e){}}
      }
      if(settings.endReminder!==false){[20,10].forEach(function(mins){var when=endAt-mins*60000;if(when>Date.now()+1000){try{window.AndroidBridge.scheduleAlarmV2('NO_'+k+'_'+p.key+'_end_'+mins,p.bn+' সময় শেষ হতে '+mins+' মিনিট','সময় শেষ হওয়ার আগে নামাজ সম্পন্ন করুন।',when,sound,vibrate)}catch(e){}}})}
    });
  }
}
scheduleAlarms=scheduleAlarmsV13;

function saveSettingsV13(){
  settings.calcMethod=document.getElementById('calcMethod').value;
  settings.asrMethod=document.getElementById('asrMethod').value;
  settings.adjust=Number(document.getElementById('timeAdjustment').value)||0;
  settings.alarmSound=document.getElementById('alarmSound').value;
  settings.preReminder=Number(document.getElementById('preReminder').value)||0;
  var v=document.getElementById('vibrationEnabled'),e=document.getElementById('endReminderEnabled');settings.vibration=v?v.checked:true;settings.endReminder=e?e.checked:true;
  localStorage.setItem('no_settings',JSON.stringify(settings));
  v13PrayerCache=Object.create(null);v13AlarmScheduleSignature='';
  renderTodayV13();scheduleAlarmsV13(true);requestAnimationFrame(function(){renderCalendar()});toast('Settings saved ✓');
}
saveSettings=saveSettingsV13;
function loadSettingsV13(){
  if(document.getElementById('calcMethod'))document.getElementById('calcMethod').value=settings.calcMethod||'karachi';
  if(document.getElementById('asrMethod'))document.getElementById('asrMethod').value=settings.asrMethod||'hanafi';
  if(document.getElementById('timeAdjustment'))document.getElementById('timeAdjustment').value=settings.adjust||0;
  if(document.getElementById('alarmSound'))document.getElementById('alarmSound').value=settings.alarmSound||'alarm';
  if(document.getElementById('preReminder'))document.getElementById('preReminder').value=settings.preReminder||0;
  var v=document.getElementById('vibrationEnabled'),e=document.getElementById('endReminderEnabled');if(v)v.checked=settings.vibration!==false;if(e)e.checked=settings.endReminder!==false;
}
loadSettings=loadSettingsV13;

function installQiblaV13(){
  var orbits=document.querySelector('#page-home .orbits');if(!orbits)return;
  orbits.innerHTML='<div class="orbit one"><div class="orb-label">5 DAILY PRAYERS</div><span class="picon p1"></span><span class="picon p2"></span><span class="picon p3"></span><span class="picon p4"></span><span class="picon p5"></span></div><div class="orbit two"><div class="qbadge" id="qazaBadge">Qaza 0</div></div><div class="orbit-core glass" id="qiblaCompassV13"><div class="qibla-v13"><small>QIBLA DIRECTION</small><div class="dial"><div class="needle" id="qiblaNeedleV13">➤</div><div class="kaaba-dot"></div></div><strong id="qiblaBearingV13">—°</strong><small id="qiblaTextV13">Compass loading…</small><small><span id="completeCount">0</span>/5 • <span id="todayPercent">0%</span></small></div></div>';
  var home=document.getElementById('page-home'),hero=home&&home.querySelector('.hero');if(home&&hero)home.insertBefore(orbits,hero);
}
function qiblaBearingV13(){
  var c=coords||{lat:23.8103,lon:90.4125},lat=dtr(c.lat),lon=dtr(c.lon),klat=dtr(21.4225),klon=dtr(39.8262),dlon=klon-lon;
  return fixAngle(rtd(Math.atan2(Math.sin(dlon),Math.cos(lat)*Math.tan(klat)-Math.sin(lat)*Math.cos(dlon))));
}
var v13Heading=null,v13CompassRaf=0,v13LastCompassPaint=0,v13CompassLocKey='';
window.onNativeHeading=function(deg){
  if(!Number.isFinite(Number(deg)))return;
  var home=document.getElementById('page-home');if(!home||!home.classList.contains('active'))return;
  v13Heading=Number(deg);
  var now=performance.now();if(now-v13LastCompassPaint<120)return;
  v13LastCompassPaint=now;
  if(v13CompassRaf)return;
  v13CompassRaf=requestAnimationFrame(function(){v13CompassRaf=0;updateQiblaV13()});
};
function updateQiblaV13(){
  var n=document.getElementById('qiblaNeedleV13');if(!n)return;var bearing=qiblaBearingV13();
  if(window.AndroidBridge&&window.AndroidBridge.setCompassLocation&&coords){
    var key=coords.lat.toFixed(4)+','+coords.lon.toFixed(4);
    if(key!==v13CompassLocKey){v13CompassLocKey=key;try{window.AndroidBridge.setCompassLocation(coords.lat,coords.lon)}catch(e){}}
  }
  var rotation=bearing-(v13Heading===null?0:v13Heading)-90;
  var transform='rotate('+rotation.toFixed(1)+'deg)';if(n.style.transform!==transform)n.style.transform=transform;
  var b=document.getElementById('qiblaBearingV13'),bt=Math.round(bearing)+'°';if(b&&b.textContent!==bt)b.textContent=bt;
  var t=document.getElementById('qiblaTextV13'),tt=v13Heading===null?'Qibla bearing • move phone':'Live compass • arrow up = Qibla';if(t&&t.textContent!==tt)t.textContent=tt;
}
function v13UpdateOrbit(current){
  document.querySelectorAll('.orbit.one .picon').forEach(function(el,i){var p=PRAYERS[i];if(!p)return;el.innerHTML=v13Icon(p.key);el.classList.toggle('active-prayer',p.key===current);el.title=p.bn+' • '+p.name});
}

function installNavbarV13(){
  var nav=document.getElementById('nav');if(!nav)return;
  nav.innerHTML='<button class="active" data-page="home" onclick="showPage(\'home\')"><i>'+v13Svg('home')+'</i>Home</button>'+
    '<button data-page="prayer" onclick="showPage(\'prayer\')"><i>'+v13Svg('prayer')+'</i>Prayer</button>'+
    '<button data-page="quran" onclick="showPage(\'quran\')"><i>'+v13Svg('quran')+'</i>Quran</button>'+
    '<button data-page="qaza" onclick="showPage(\'qaza\')"><i>'+v13Svg('qaza')+'</i>Qaza</button>'+
    '<button data-page="events" onclick="openIslamicEvents()"><i>'+v13Svg('events')+'</i>Events</button>'+
    '<button data-page="more" onclick="showPage(\'more\')"><i>'+v13Svg('more')+'</i>More</button>';
}
var oldShowPageV13=showPage;
showPage=function(name){
  oldShowPageV13(name);
  document.querySelectorAll('#nav button').forEach(function(x){x.classList.toggle('active',x.dataset.page===name)});
  if(name==='more')loadSettingsV13();
  if(name==='home'){if(Date.now()-(window._lastHomeFullRenderV13||0)>60000)renderTodayV13();else updateCountdownV13();updateQiblaV13()}
};

function installBrandAndLocationV13(){
  var logo=document.querySelector('.brand .logo');if(logo)logo.innerHTML=v13LogoSvg();
  var small=document.querySelector('.brand small');if(small)small.textContent='Prayer • Quran • Qaza • Events';
  var btn=document.querySelector('.topbar > .pill');if(btn){btn.classList.add('location-trigger');btn.innerHTML=v13Svg('location')+'<span>Location</span>';btn.setAttribute('onclick','showLocationOnboarding()')}
  if(document.getElementById('locationOnboarding'))return;
  var modal=document.createElement('div');modal.id='locationOnboarding';modal.className='location-modal';modal.innerHTML='<div class="location-sheet"><div class="location-art">'+v13Svg('location')+'</div><h2>Location access দিন</h2><p>আপনার সঠিক নামাজের সময়, Qibla direction ও location-based schedule আপডেট করার জন্য Location permission দরকার। Bangladesh-এ থাকলে app Dhaka time (UTC+6) ব্যবহার করবে।</p><div class="location-actions"><button class="btn primary full" onclick="grantLocationV13()">Use precise location</button><button class="btn full" onclick="openAlwaysLocationV13()">Always location settings</button><button class="btn full" onclick="hideLocationOnboarding()">Later</button></div><div class="location-note">“Allow all the time” background auto-location update-এর জন্য recommended. Exact prayer alarms saved location দিয়েও চলতে পারে.</div></div>';
  document.body.appendChild(modal);
}
function hasLocationV13(){try{return window.AndroidBridge&&window.AndroidBridge.hasFineLocationPermission?window.AndroidBridge.hasFineLocationPermission():!!coords}catch(e){return !!coords}}
function showLocationOnboarding(){document.getElementById('locationOnboarding')?.classList.add('open')}
function hideLocationOnboarding(){document.getElementById('locationOnboarding')?.classList.remove('open')}
function grantLocationV13(){detectLocation();setTimeout(function(){if(hasLocationV13())hideLocationOnboarding()},1600)}
function openAlwaysLocationV13(){try{if(window.AndroidBridge&&window.AndroidBridge.openAppLocationSettings)window.AndroidBridge.openAppLocationSettings();else detectLocation()}catch(e){detectLocation()}}
var oldDetectLocationV13=detectLocation;
detectLocation=function(){
  oldDetectLocationV13();
  setTimeout(function(){if(coords){hideLocationOnboarding();renderTodayV13();updateQiblaV13()}},1800);
};

function installSettingsExtrasV13(){
  var more=document.getElementById('page-more');if(!more)return;
  var eventPanel=document.getElementById('eventsMorePanel');if(eventPanel)eventPanel.remove();
  var qplan=document.getElementById('qazaSuggestion');if(qplan)qplan.remove();
  if(typeof renderQazaSuggestion==='function')renderQazaSuggestion=function(){var x=document.getElementById('qazaSuggestion');if(x)x.remove()};
  var alarm=document.getElementById('alarmSound');
  if(alarm&&!document.getElementById('vibrationEnabled'))alarm.closest('label').insertAdjacentHTML('afterend','<label class="switch-row"><span><b>Vibration</b><small>Prayer and end-time reminders</small></span><input id="vibrationEnabled" type="checkbox" checked></label><label class="switch-row"><span><b>End-time reminders</b><small>20 and 10 minutes before end</small></span><input id="endReminderEnabled" type="checkbox" checked></label>');
  var controls=document.querySelector('#page-more .controls');if(controls&&!document.getElementById('tzStatusV13')){var tz=document.createElement('div');tz.id='tzStatusV13';tz.className='tz-chip';tz.innerHTML='<span>Auto time zone</span><b>'+(isBangladeshCoords(coords)?'Asia/Dhaka • UTC+6':'Device / location')+'</b>';controls.insertBefore(tz,controls.firstChild)}
  if(!document.getElementById('testAlarmPanelV13')){
    var panel=document.createElement('div');panel.id='testAlarmPanelV13';panel.className='panel glass test-panel';panel.innerHTML='<h3>Alarm Test</h3><div class="test-row"><div class="test-icon">'+v13Svg('bell')+'</div><div style="flex:1"><b>Test alarm + vibration</b><div class="meta">৩ সেকেন্ড পরে test alert আসবে</div></div><button class="btn" onclick="testAlarmV13()">Test</button></div>';
    var privacy=[].slice.call(more.querySelectorAll('.panel')).find(function(p){return p.textContent.indexOf('Privacy & data')>=0});if(privacy)more.insertBefore(panel,privacy);else more.appendChild(panel);
  }
  loadSettingsV13();
}
function testAlarmV13(){
  var sound=document.getElementById('alarmSound')?.value||'alarm',v=document.getElementById('vibrationEnabled')?.checked!==false;
  try{if(window.AndroidBridge&&window.AndroidBridge.testAlarm){window.AndroidBridge.testAlarm(sound,v);toast('Test alarm 3 seconds পরে বাজবে');return}}catch(e){}
  if(v&&navigator.vibrate)navigator.vibrate([300,150,300]);toast('Web vibration test triggered');
}
testAlarm=testAlarmV13;

function removeHomeEventV13(){var e=document.getElementById('liveIslamicEvent');if(e)e.remove()}
function renderDatesV13(){var n=locationNow();var g=document.getElementById('gregorianDate');if(g)g.textContent=n.toLocaleDateString('bn-BD',{weekday:'long',day:'numeric',month:'long',year:'numeric'});try{var h=document.getElementById('hijriDate');if(h)h.textContent=new Intl.DateTimeFormat('bn-BD-u-ca-islamic',{day:'numeric',month:'long',year:'numeric'}).format(n)}catch(e){}}
renderDates=renderDatesV13;
function refreshAllV13(){renderDatesV13();renderTodayV13();requestAnimationFrame(function(){var home=document.getElementById('page-home');if(home&&home.classList.contains('active'))renderCalendar();var q=document.getElementById('page-qaza');if(q&&q.classList.contains('active'))renderQaza()});removeHomeEventV13()}
refreshAll=refreshAllV13;

(function initV13Core(){
  installV13Style();installBrandAndLocationV13();installNavbarV13();installQiblaV13();installSettingsExtrasV13();removeHomeEventV13();
  renderDatesV13();renderTodayV13();updateQiblaV13();
  var v13Tick=0;setInterval(function(){if(document.hidden)return;updateCountdownV13();removeHomeEventV13();if(++v13Tick%60===0&&autoUpdateQazaV13(true))renderTodayV13()},1000);
  setTimeout(function(){if(!hasLocationV13())showLocationOnboarding()},500);
})();