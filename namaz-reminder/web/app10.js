/* Namaz Orbit Core APK runtime — isolated Location / Qibla / Prayer / Alarm */
var coreLocationWatchIdV15=null;
var coreLastAppliedLocationV15=0;
var coreLastReverseGeocodeV15=0;
var coreLastPositionV15=null;

function coreDistanceMetersV15(a,b){
  if(!a||!b)return Infinity;
  var R=6371000,toRad=Math.PI/180;
  var p1=a.lat*toRad,p2=b.lat*toRad,dp=(b.lat-a.lat)*toRad,dl=(b.lon-a.lon)*toRad;
  var h=Math.sin(dp/2)*Math.sin(dp/2)+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)*Math.sin(dl/2);
  return 2*R*Math.asin(Math.min(1,Math.sqrt(h)));
}

function enforceCoreAlarmSettingsV15(){
  settings=settings||{};
  settings.preReminder=10;
  settings.endReminder=true;
  if(typeof settings.vibration==='undefined')settings.vibration=true;
  localStorage.setItem('no_settings',JSON.stringify(settings));
  var pre=document.getElementById('preReminder');
  if(pre){
    pre.value='10';
    pre.disabled=true;
    var label=pre.closest('label');
    if(label){
      var text=label.childNodes[0];
      if(text&&text.nodeType===3)text.textContent='Pre-prayer reminder • fixed 10 minutes';
    }
  }
  var end=document.getElementById('endReminderEnabled');
  if(end){
    end.checked=true;
    var row=end.closest('label');if(row)row.style.display='none';
  }
}

function installCoreCardsV15(){
  var home=document.getElementById('page-home');if(!home)return;
  var orbits=home.querySelector('.orbits');

  var oldCompact=document.getElementById('compactLocationV14');
  if(oldCompact)oldCompact.remove();

  if(!document.getElementById('coreLocationPanelV15')){
    var locationPanel=document.createElement('section');
    locationPanel.id='coreLocationPanelV15';
    locationPanel.className='core-card-v15';
    locationPanel.innerHTML=
      '<div class="core-head-v15"><h3>Live Location</h3><span class="core-status-v15"><span class="dot"></span><span id="coreLocationStateV15">Tracking</span></span></div>'+
      '<div class="core-location-grid-v15">'+
        '<div class="core-location-icon-v15">'+v13Svg('location')+'</div>'+
        '<div class="core-location-copy-v15"><b id="coreLocationLabelV15">Detecting location…</b><span id="coreLocationCoordsV15">Precise GPS is used for prayer time and Qibla</span></div>'+
        '<div class="core-location-meta-v15"><b id="coreTimezoneV15">Auto</b><span id="coreLocationAgeV15">—</span></div>'+
      '</div>';
    var hint=document.getElementById('orbitTapHintV14');
    if(hint)hint.insertAdjacentElement('afterend',locationPanel);
    else if(orbits)orbits.insertAdjacentElement('afterend',locationPanel);
    else home.insertBefore(locationPanel,home.firstChild);
  }

  var list=document.getElementById('todayPrayerList');
  if(list&&!document.getElementById('corePrayerPanelV15')){
    var title=list.previousElementSibling;
    var prayerPanel=document.createElement('section');
    prayerPanel.id='corePrayerPanelV15';
    prayerPanel.className='core-card-v15';
    prayerPanel.innerHTML='<div class="core-head-v15"><h3>Prayer Times</h3><span class="core-status-v15"><span class="dot"></span><span>Live</span></span></div>';
    list.parentNode.insertBefore(prayerPanel,title||list);
    if(title&&title.classList&&title.classList.contains('section-title'))prayerPanel.appendChild(title);
    prayerPanel.appendChild(list);
  }

  var staleAlarmPanel=document.getElementById('coreAlarmPanelV15');
  if(staleAlarmPanel)staleAlarmPanel.remove();

  var cal=document.getElementById('homeCalendarV14');
  if(cal)cal.classList.add('core-calendar-v15');
}

function updateCoreLocationUIV15(){
  var label=document.getElementById('coreLocationLabelV15');
  var coord=document.getElementById('coreLocationCoordsV15');
  var tz=document.getElementById('coreTimezoneV15');
  var age=document.getElementById('coreLocationAgeV15');
  var state=document.getElementById('coreLocationStateV15');
  if(label)label.textContent=locationLabel||'Location permission needed';
  if(coord)coord.textContent=coords?(coords.lat.toFixed(5)+', '+coords.lon.toFixed(5)):'Enable precise location';
  if(tz)tz.textContent=isBangladeshCoords(coords)?'Dhaka • UTC+6':'Auto timezone';
  if(age){
    if(coreLastAppliedLocationV15){
      var sec=Math.max(0,Math.floor((Date.now()-coreLastAppliedLocationV15)/1000));
      age.textContent=sec<60?(sec+'s ago'):(Math.floor(sec/60)+'m ago');
    }else age.textContent='Saved location';
  }
  if(state)state.textContent=coreLocationWatchIdV15!==null?'Tracking':'Saved';
}

async function reverseGeocodeCoreV15(next,force){
  var now=Date.now();
  if(!force&&now-coreLastReverseGeocodeV15<30*60*1000)return;
  coreLastReverseGeocodeV15=now;
  try{
    var r=await fetch('https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat='+next.lat+'&lon='+next.lon,{headers:{'Accept':'application/json'}});
    if(r.ok){
      var j=await r.json();
      if(j.display_name){
        locationLabel=j.display_name;
        localStorage.setItem('no_location_label',locationLabel);
        updateCoreLocationUIV15();
      }
    }
  }catch(e){}
}

function applyCoreLocationV15(next,accuracy){
  var now=Date.now();
  var before=coords?{lat:coords.lat,lon:coords.lon}:null;
  var moved=coreDistanceMetersV15(before,next);
  coords=next;
  coreLastPositionV15=next;
  coreLastAppliedLocationV15=now;
  localStorage.setItem('no_coords',JSON.stringify(coords));
  if(!locationLabel||!before)locationLabel=next.lat.toFixed(5)+', '+next.lon.toFixed(5);
  updateCoreLocationUIV15();
  updateQiblaV13();

  var major=!before||moved>=350;
  if(major){
    v13PrayerCache=Object.create(null);
    v13AlarmScheduleSignature='';
    renderTodayV13();
    scheduleAlarmsV13(true);
    reverseGeocodeCoreV15(next,!before||moved>1500);
  }
}

function startLiveLocationV15(){
  if(!navigator.geolocation||coreLocationWatchIdV15!==null)return;
  try{
    coreLocationWatchIdV15=navigator.geolocation.watchPosition(function(pos){
      var next={lat:pos.coords.latitude,lon:pos.coords.longitude};
      var moved=coreDistanceMetersV15(coreLastPositionV15||coords,next);
      var elapsed=Date.now()-coreLastAppliedLocationV15;
      if(moved<25&&elapsed<30000){
        coreLastPositionV15=next;
        return;
      }
      applyCoreLocationV15(next,pos.coords.accuracy);
    },function(){
      updateCoreLocationUIV15();
    },{enableHighAccuracy:true,maximumAge:15000,timeout:20000});
    updateCoreLocationUIV15();
  }catch(e){}
}

function stopLiveLocationV15(){
  if(coreLocationWatchIdV15!==null&&navigator.geolocation){
    try{navigator.geolocation.clearWatch(coreLocationWatchIdV15)}catch(e){}
    coreLocationWatchIdV15=null;
  }
}

function updateCoreAlarmUIV15(){
  var state=document.getElementById('coreAlarmStateV15');
  var sub=document.getElementById('coreAlarmSubV15');
  var android=!!window.AndroidBridge;
  var exact=true;
  try{
    if(android&&window.AndroidBridge.hasExactAlarmAccess)exact=window.AndroidBridge.hasExactAlarmAccess();
  }catch(e){}
  if(state)state.textContent=android?(exact?'Ready':'Needs access'):'Web preview';
  if(sub)sub.textContent=android
    ?(exact?'Next prayer and 10-minute-before reminders are scheduled with Android AlarmManager.':'Allow exact alarm access for the most reliable reminder timing.')
    :'APK uses Android AlarmManager; web preview does not provide the same reliability.';
}

function coreRefreshV15(){
  updateCoreLocationUIV15();
  updateCoreAlarmUIV15();
  if(document.getElementById('page-home')&&document.getElementById('page-home').classList.contains('active')){
    syncHomeV14();
  }
}

(function initCoreApkV15(){
  enforceCoreAlarmSettingsV15();
  installCoreCardsV15();
  updateCoreLocationUIV15();
  updateCoreAlarmUIV15();
  if(window.AndroidBridge)startLiveLocationV15();
  setInterval(function(){if(!document.hidden)coreRefreshV15()},5000);
  document.addEventListener('visibilitychange',function(){
    if(document.hidden)return;
    if(window.AndroidBridge)startLiveLocationV15();
    coreRefreshV15();
  });
})();