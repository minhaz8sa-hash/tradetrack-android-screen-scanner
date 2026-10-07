/* Namaz Orbit v1.6.2 — selected calendar end times, Qibla marker, alarm migration */
(function(){
  function timesForCalendar162(k,d){
    var saved=getSchedule(k),times=null;
    if(saved){
      times={};
      PRAYERS.forEach(function(p){times[p.key]=new Date(saved[p.key])});
      if(saved.sunrise)times.sunrise=new Date(saved.sunrise);
      else times.sunrise=computePrayerTimes(d).sunrise;
    }else{
      times=computePrayerTimes(d);
    }

    var nd=new Date(d);nd.setDate(nd.getDate()+1);
    var nk=dateKey(nd),nextSaved=getSchedule(nk),nextTimes=null;
    if(nextSaved){
      nextTimes={};
      PRAYERS.forEach(function(p){nextTimes[p.key]=new Date(nextSaved[p.key])});
      if(nextSaved.sunrise)nextTimes.sunrise=new Date(nextSaved.sunrise);
      else nextTimes.sunrise=computePrayerTimes(nd).sunrise;
    }else{
      nextTimes=computePrayerTimes(nd);
    }
    return {times:times,nextTimes:nextTimes};
  }

  window.selectCalendarDay=function(k,rerender){
    selectedDateKey=k;
    var d=localDateFromKey(k);
    var title=document.getElementById('selectedDateTitle');
    if(title)title.textContent=d.toLocaleDateString('bn-BD',{weekday:'long',day:'numeric',month:'long',year:'numeric'});

    var bundle=timesForCalendar162(k,d),times=bundle.times,nextTimes=bundle.nextTimes;
    var state=getDayState(k),box=document.getElementById('selectedDayDetails');
    if(!box)return;
    box.innerHTML='';

    PRAYERS.forEach(function(p){
      var start=times[p.key],end=endForPrayer(times,p.key,nextTimes),st=state[p.key]||'not logged';
      var statusText=st==='qaza'?'Qaza due':st==='complete'?'Complete':st==='qaza-complete'?'Qaza complete':'Not logged';
      var statusClass=st==='qaza'?'qaza':((st==='complete'||st==='qaza-complete')?'complete':'');
      var card=document.createElement('div');
      card.className='prayer-card';
      card.innerHTML=
        '<div class="prayer-icon">'+(typeof v13Icon==='function'?v13Icon(p.key):(typeof prayerIconMarkup==='function'?prayerIconMarkup(p.key):''))+'</div>'+
        '<div><h4>'+p.bn+'</h4>'+
          '<small class="calendar-time-range162">Start '+formatTime(start)+' • End '+formatTime(end)+'</small>'+
          '<small class="calendar-status162 '+statusClass+'">'+statusText+'</small>'+
        '</div>'+
        '<div class="time">'+formatTime(start)+'</div>';
      box.appendChild(card);
    });
  };

  function installQiblaMarker162(){
    var dial=document.querySelector('.qibla-v13 .dial');if(!dial||document.getElementById('qiblaMarker162'))return;
    var m=document.createElement('div');m.id='qiblaMarker162';m.className='qibla-marker162';
    m.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true">'+
      '<rect class="qk-body" x="5" y="6" width="14" height="13" rx="1.5"></rect>'+
      '<path class="qk-band" d="M5.8 10.5h12.4"></path>'+
      '<path class="qk-band" d="M9 6.1l3-2 3 2"></path>'+
      '</svg>';
    dial.appendChild(m);
  }

  function migrateAlarmSchedule162(){
    var key='no_alarm_schema_v162';
    if(localStorage.getItem(key)==='1')return;
    settings=settings||{};
    settings.preReminder=10;
    settings.endReminder=true;
    localStorage.setItem('no_settings',JSON.stringify(settings));
    try{if(window.AndroidBridge&&window.AndroidBridge.clearAllScheduledAlarms)window.AndroidBridge.clearAllScheduledAlarms()}catch(e){}
    try{v13AlarmScheduleSignature=''}catch(e){}
    localStorage.setItem(key,'1');
    setTimeout(function(){
      try{scheduleAlarmsV13(true)}catch(e){}
    },500);
  }

  installQiblaMarker162();
  migrateAlarmSchedule162();

  var oldShow162=window.showPage;
  window.showPage=function(name){
    oldShow162(name);
    if(name==='home')requestAnimationFrame(installQiblaMarker162);
  };

  setTimeout(function(){
    try{renderCalendar()}catch(e){}
    installQiblaMarker162();
  },250);
})();