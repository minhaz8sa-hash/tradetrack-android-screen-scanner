/* Namaz Orbit v1.7.0 — Prayer Accuracy, Qibla Calibration, Dhikr, Widget */
var compassAccuracy170=-1;
var widgetSig170='';
var dhikrState170={subhan:0,hamd:0,akbar:0};

function accLabel170(v){
  if(v===3)return 'High';
  if(v===2)return 'Medium';
  if(v===1)return 'Low';
  return 'Unreliable';
}
function gpsLabel170(){
  var a=Number(window.coreLastGpsAccuracyV17);
  if(!Number.isFinite(a))return 'Waiting';
  if(a<=15)return 'Good ±'+Math.round(a)+'m';
  if(a<=40)return 'Fair ±'+Math.round(a)+'m';
  return 'Weak ±'+Math.round(a)+'m';
}
function alarmReady170(){
  try{return !window.AndroidBridge||!window.AndroidBridge.hasExactAlarmAccess||window.AndroidBridge.hasExactAlarmAccess()}catch(e){return false}
}
function currentCompassAccuracy170(){
  try{
    if(window.AndroidBridge&&window.AndroidBridge.getCompassAccuracy)return Number(window.AndroidBridge.getCompassAccuracy());
  }catch(e){}
  return compassAccuracy170;
}
window.onNativeCompassAccuracy=function(a){
  compassAccuracy170=Number(a);
  renderAccuracy170();
  renderQiblaCal170();
};

function installAccuracyCenter170(){
  var more=document.getElementById('page-more');if(!more||document.getElementById('accuracyCenter170'))return;
  var panel=document.createElement('div');panel.id='accuracyCenter170';panel.className='panel glass accuracy170';
  panel.innerHTML=
    '<div class="acc-head170"><div><h3>Prayer Accuracy Center</h3><small>Location, calculation, timezone ও alarm readiness একসাথে check করুন।</small></div><span class="acc-badge170" id="accuracyOverall170">Checking</span></div>'+
    '<div class="acc-grid170">'+
      '<div class="acc-item170"><b id="accGps170">Waiting</b><span>GPS accuracy</span></div>'+
      '<div class="acc-item170"><b id="accMethod170">—</b><span>Calculation method</span></div>'+
      '<div class="acc-item170"><b id="accTimezone170">—</b><span>Timezone</span></div>'+
      '<div class="acc-item170"><b id="accAlarm170">—</b><span>Exact alarm access</span></div>'+
    '</div>'+
    '<div class="acc-actions170"><button class="btn" onclick="detectLocation()">Refresh location</button><button class="btn primary" onclick="recalculatePrayer170()">Recalculate</button></div>';

  var settingsPanel=[].slice.call(more.querySelectorAll('.panel')).find(function(x){return x.querySelector('h3')&&x.querySelector('h3').textContent.trim()==='Settings'});
  if(settingsPanel)more.insertBefore(panel,settingsPanel);else more.appendChild(panel);
}

function renderAccuracy170(){
  var gps=document.getElementById('accGps170'),method=document.getElementById('accMethod170'),tz=document.getElementById('accTimezone170'),alarm=document.getElementById('accAlarm170'),overall=document.getElementById('accuracyOverall170');
  if(gps)gps.textContent=gpsLabel170();
  if(method)method.textContent=((METHODS[settings.calcMethod]||METHODS.karachi).label||'Method')+' • '+(settings.asrMethod==='hanafi'?'Hanafi':'Standard');
  if(tz)tz.textContent=isBangladeshCoords(coords)?'Asia/Dhaka • UTC+6':'Device / location';
  if(alarm)alarm.textContent=alarmReady170()?'Ready':'Needs access';
  var a=Number(window.coreLastGpsAccuracyV17),okGps=Number.isFinite(a)&&a<=40,okAlarm=alarmReady170(),sensor=currentCompassAccuracy170();
  if(overall)overall.textContent=(okGps&&okAlarm&&sensor>=2)?'Ready':'Review';
}

function recalculatePrayer170(){
  try{v13PrayerCache=Object.create(null);v13AlarmScheduleSignature=''}catch(e){}
  try{renderTodayV13();renderCalendar();scheduleAlarmsV13(true);updateQiblaV13()}catch(e){}
  renderAccuracy170();toast('Prayer times recalculated ✓');syncWidget170(true);
}

function installQiblaCalibration170(){
  var more=document.getElementById('page-more');if(!more||document.getElementById('qiblaCal170'))return;
  var panel=document.createElement('div');panel.id='qiblaCal170';panel.className='panel glass qcal170';
  panel.innerHTML=
    '<div class="acc-head170"><div><h3>Qibla Calibration</h3><small>Sensor quality ও Qibla turn direction live check করুন।</small></div><span class="acc-badge170" id="qcalStatus170">Checking</span></div>'+
    '<div class="qcal-live170"><div class="qcal-dial170"><div class="qcal-kaaba170"></div><div class="qcal-arrow170" id="qcalArrow170">➤</div></div>'+
    '<div class="qcal-copy170"><b id="qcalBearing170">Qibla —</b><div class="turn" id="qcalTurn170">Move phone slowly</div><small id="qcalHeading170">Heading —</small></div></div>'+
    '<div class="qcal-note170">Compass Low/Unreliable হলে phone-টি figure‑8 আকারে কয়েকবার নাড়ান এবং magnet, metal case, speaker বা electronics থেকে দূরে রাখুন। তারপর আবার check করুন।</div>'+
    '<div class="acc-actions170"><button class="btn" onclick="renderQiblaCal170()">Recheck</button><button class="btn primary" onclick="openHomeQibla170()">Open Qibla</button></div>';

  var acc=document.getElementById('accuracyCenter170');
  if(acc)acc.insertAdjacentElement('afterend',panel);else more.appendChild(panel);
}
function renderQiblaCal170(){
  var bearing=typeof qiblaBearingV13==='function'?qiblaBearingV13():0;
  var heading=Number(window.v13Heading),hasHeading=Number.isFinite(heading);
  var delta=hasHeading?((bearing-heading+540)%360)-180:null;
  var b=document.getElementById('qcalBearing170'),h=document.getElementById('qcalHeading170'),t=document.getElementById('qcalTurn170'),a=document.getElementById('qcalArrow170'),s=document.getElementById('qcalStatus170');
  if(b)b.textContent='Qibla '+Math.round(bearing)+'°';
  if(h)h.textContent=hasHeading?'Heading '+Math.round(heading)+'°':'Heading —';
  if(a)a.style.transform='rotate('+((hasHeading?bearing-heading:bearing)-90).toFixed(1)+'deg)';
  if(t){
    if(delta===null)t.textContent='Move phone slowly';
    else if(Math.abs(delta)<=5)t.textContent='Aligned with Qibla ✓';
    else t.textContent='Turn '+Math.abs(Math.round(delta))+'° '+(delta>0?'right':'left');
  }
  var q=currentCompassAccuracy170();if(s)s.textContent=accLabel170(q);
}

function openHomeQibla170(){
  showPage('home');
  setTimeout(function(){var x=document.querySelector('#page-home .orbits');if(x)x.scrollIntoView({behavior:'smooth',block:'center'})},80);
}

function installWidgetCard170(){
  var more=document.getElementById('page-more');if(!more||document.getElementById('widgetCard170'))return;
  var p=document.createElement('div');p.id='widgetCard170';p.className='panel glass widget-card170';
  p.innerHTML='<h3 style="margin:0">Home Widget</h3><div class="meta">Android Home screen-এ Next Prayer, start time ও Qibla bearing দেখাবে।</div>'+
    '<div class="widget-preview170"><div class="wp-eyebrow">NAMAZ ORBIT</div><div class="wp-name" id="widgetPreviewName170">Next Prayer</div><div class="wp-time" id="widgetPreviewCount170">—</div><div class="wp-foot"><span id="widgetPreviewTime170">—</span><span id="widgetPreviewQibla170">Qibla —</span></div></div>'+
    '<div class="qcal-note170">Widget add করতে Home screen long‑press → Widgets → Namaz Orbit নির্বাচন করুন। Android widget battery-safe interval-এ refresh হবে; app open হলে সঙ্গে সঙ্গে latest data push হবে।</div>';
  var q=document.getElementById('qiblaCal170');if(q)q.insertAdjacentElement('afterend',p);else more.appendChild(p);
}

function syncWidget170(force){
  if(!window.AndroidBridge||!window.AndroidBridge.updatePrayerWidget)return;
  try{
    var ctx=prayerCycleContext(),next=v13NextPrayer(ctx),count=v13Duration(next.date-ctx.now),bearing=qiblaBearingV13();
    var minute=Math.floor(Math.max(0,next.date-ctx.now)/60000);
    var sig=ctx.key+'|'+next.p.key+'|'+next.date.getTime()+'|'+minute+'|'+Math.round(bearing);
    if(!force&&sig===widgetSig170)return;widgetSig170=sig;
    window.AndroidBridge.updatePrayerWidget(next.p.bn+' • '+next.p.name,formatTime(next.date),count,bearing);
    var n=document.getElementById('widgetPreviewName170'),c=document.getElementById('widgetPreviewCount170'),tm=document.getElementById('widgetPreviewTime170'),q=document.getElementById('widgetPreviewQibla170');
    if(n)n.textContent=next.p.bn+' • '+next.p.name;if(c)c.textContent=count;if(tm)tm.textContent='Starts '+formatTime(next.date);if(q)q.textContent='Qibla '+Math.round(bearing)+'°';
  }catch(e){}
}

function installDhikr170(){
  if(document.getElementById('dhikrSheet170'))return;
  var sh=document.createElement('div');sh.id='dhikrSheet170';sh.className='dhikr-sheet170';sh.innerHTML=
    '<div class="dhikr-panel170" role="dialog" aria-modal="true"><div class="dhikr-head170"><div><h3>After‑Prayer Dhikr</h3><small>Optional Sunnah dhikr tracker • count tap করুন</small></div><button class="dhikr-close170" onclick="closeDhikr170()">×</button></div>'+
    '<div class="dhikr-list170">'+
      '<div class="dhikr-row170"><div><b>سُبْحَانَ اللّٰهِ</b><small>সুবহানাল্লাহ • 33</small></div><button class="dhikr-count170" id="dhSub170" onclick="tapDhikr170(\'subhan\',33)">0 / 33</button></div>'+
      '<div class="dhikr-row170"><div><b>الْحَمْدُ لِلّٰهِ</b><small>আলহামদুলিল্লাহ • 33</small></div><button class="dhikr-count170" id="dhHamd170" onclick="tapDhikr170(\'hamd\',33)">0 / 33</button></div>'+
      '<div class="dhikr-row170"><div><b>اللّٰهُ أَكْبَرُ</b><small>আল্লাহু আকবার • 34</small></div><button class="dhikr-count170" id="dhAkbar170" onclick="tapDhikr170(\'akbar\',34)">0 / 34</button></div>'+
    '</div><div class="dhikr-progress170"><span id="dhProgress170"></span></div>'+
    '<div class="dhikr-foot170"><button class="btn" onclick="resetDhikr170()">Reset</button><button class="btn primary" onclick="closeDhikr170()">Done</button></div></div>';
  document.body.appendChild(sh);

  var more=document.getElementById('page-more');
  if(more&&!document.getElementById('dhikrLauncher170')){
    var p=document.createElement('div');p.id='dhikrLauncher170';p.className='panel glass';
    p.innerHTML='<h3 style="margin:0">After‑Prayer Dhikr</h3><div class="meta">33 SubhanAllah • 33 Alhamdulillah • 34 Allahu Akbar</div><button class="btn primary full dhikr-launch170" onclick="openDhikr170(false)">Open Dhikr</button>';
    var widget=document.getElementById('widgetCard170');if(widget)widget.insertAdjacentElement('afterend',p);else more.appendChild(p);
  }
}
function renderDhikr170(){
  var map=[['subhan',33,'dhSub170'],['hamd',33,'dhHamd170'],['akbar',34,'dhAkbar170']],sum=0;
  map.forEach(function(x){var v=dhikrState170[x[0]],el=document.getElementById(x[2]);sum+=v;if(el){el.textContent=v+' / '+x[1];el.classList.toggle('done',v>=x[1])}});
  var p=document.getElementById('dhProgress170');if(p)p.style.width=Math.min(100,sum/100*100)+'%';
}
function tapDhikr170(k,max){dhikrState170[k]=Math.min(max,(dhikrState170[k]||0)+1);renderDhikr170()}
function resetDhikr170(){dhikrState170={subhan:0,hamd:0,akbar:0};renderDhikr170()}
function openDhikr170(reset){
  if(reset!==false)resetDhikr170();
  var s=document.getElementById('dhikrSheet170');if(s)s.classList.add('open');renderDhikr170();
}
function closeDhikr170(){var s=document.getElementById('dhikrSheet170');if(s)s.classList.remove('open')}

(function init170(){
  installAccuracyCenter170();installQiblaCalibration170();installWidgetCard170();installDhikr170();
  try{compassAccuracy170=currentCompassAccuracy170()}catch(e){}
  renderAccuracy170();renderQiblaCal170();syncWidget170(true);

  var oldHeading170=window.onNativeHeading;
  window.onNativeHeading=function(deg){
    if(typeof oldHeading170==='function')oldHeading170(deg);
    renderQiblaCal170();
  };

  var oldMark170=window.markComplete;
  if(typeof oldMark170==='function'){
    window.markComplete=function(k,key,isQaza){
      var before=getDayState(k)[key]||'pending';
      var out=oldMark170.apply(this,arguments);
      if(!isQaza&&before!=='complete'&&before!=='qaza-complete'){
        setTimeout(function(){openDhikr170(true)},180);
      }
      syncWidget170(true);renderAccuracy170();return out;
    };
  }

  var oldShow170=window.showPage;
  window.showPage=function(name){
    oldShow170(name);
    if(name==='more'){renderAccuracy170();renderQiblaCal170();syncWidget170(true)}
    if(name==='home')syncWidget170(true);
  };

  setInterval(function(){
    if(document.hidden)return;
    renderAccuracy170();
    if(document.getElementById('page-more')?.classList.contains('active'))renderQiblaCal170();
    syncWidget170(false);
  },15000);
})();