/* Namaz Orbit v1.4.0 — merged Home prayer/calendar + interactive Qaza orbit */

function installHomeTopV14(){
  var home=document.getElementById('page-home');if(!home)return;
  var hero=home.querySelector('.hero'),orbits=home.querySelector('.orbits');
  if(!document.getElementById('homeNextV14')){
    var top=document.createElement('div');top.id='homeNextV14';top.className='home-next-v14';
    top.innerHTML='<div class="eyebrow">NEXT PRAYER</div><div class="prayer-name" id="v14NextPrayer">—</div><div class="next-count" id="v14NextCount">--:--:--</div><div class="next-sub" id="v14NextSub">Prayer time countdown</div>';
    home.insertBefore(top,home.firstChild);
  }
  if(orbits){
    var topNode=document.getElementById('homeNextV14');
    if(topNode.nextSibling!==orbits)home.insertBefore(orbits,topNode.nextSibling);
  }
  if(!document.getElementById('compactLocationV14')){
    var loc=document.createElement('button');loc.id='compactLocationV14';loc.className='compact-location-v14 glass';loc.setAttribute('onclick','showLocationOnboarding()');
    loc.innerHTML='<div class="loc-ico">'+v13Svg('location')+'</div><div class="loc-main"><b>Live location</b><span id="v14LocationText">Location permission needed</span></div><div class="method-mini" id="v14MethodMini">Auto</div>';
    if(orbits)orbits.insertAdjacentElement('afterend',loc);else home.insertBefore(loc,home.firstChild);
    var hint=document.createElement('div');hint.className='orbit-tap-hint';hint.id='orbitTapHintV14';hint.textContent='Red dot = Qaza • icon tap করে complete করুন';
    loc.insertAdjacentElement('beforebegin',hint);
  }
  if(hero)hero.style.display='none';
  var oldGrid=home.querySelector('.grid');if(oldGrid)oldGrid.style.display='none';
  var title=home.querySelector('.section-title');
  if(title){
    title.classList.add('home-prayer-head-v14');
    var btn=title.querySelector('button');
    if(btn){btn.textContent='Calendar ↓';btn.className='calendar-jump-v14';btn.setAttribute('onclick','scrollToCalendarV14()')}
  }
}

function mergePrayerCalendarIntoHomeV14(){
  var home=document.getElementById('page-home'),prayer=document.getElementById('page-prayer');if(!home||!prayer)return;
  if(document.getElementById('homeCalendarV14'))return;
  var wrap=document.createElement('div');wrap.id='homeCalendarV14';wrap.className='home-calendar-v14';
  wrap.innerHTML='<div class="section-title"><h3>Prayer Calendar</h3><button class="calendar-jump-v14" onclick="scrollHomeTopV14()">↑ Top</button></div>';
  var panels=[].slice.call(prayer.querySelectorAll('.panel'));
  if(panels[0])wrap.appendChild(panels[0]);
  if(panels[1])wrap.appendChild(panels[1]);
  var list=document.getElementById('todayPrayerList');
  if(list)list.insertAdjacentElement('afterend',wrap);else home.appendChild(wrap);
  prayer.style.display='none';
}
function scrollToCalendarV14(){
  var x=document.getElementById('homeCalendarV14');if(x)x.scrollIntoView({behavior:'smooth',block:'start'});
}
function scrollHomeTopV14(){
  var x=document.getElementById('homeNextV14');if(x)x.scrollIntoView({behavior:'smooth',block:'start'});
}

function installNavV14(){
  var nav=document.getElementById('nav');if(!nav)return;
  nav.innerHTML='<button class="active" data-page="home" onclick="showPage(\'home\')"><i>'+v13Svg('home')+'</i>Home</button>'+
    '<button data-page="quran" onclick="showPage(\'quran\')"><i>'+v13Svg('quran')+'</i>Quran</button>'+
    '<button data-page="qaza" onclick="showPage(\'qaza\')"><i>'+v13Svg('qaza')+'</i>Qaza</button>'+
    '<button data-page="more" onclick="showPage(\'more\')"><i>'+v13Svg('more')+'</i>More</button>';
}

function v14PrayerIconTap(key){
  var ctx=prayerCycleContext(),state=getDayState(ctx.key),st=state[key]||'pending',current=v13CurrentPrayer(ctx);
  if(st==='qaza'){
    markComplete(ctx.key,key,true);
    toast('Qaza prayer complete ✓');
    return;
  }
  if(st==='pending'&&current===key){
    markComplete(ctx.key,key,false);
    toast('Prayer complete ✓');
    return;
  }
  if(st==='complete'||st==='qaza-complete'){
    toast('এই নামাজ already complete');
    return;
  }
  if(st==='pending'&&ctx.now>v13PrayerEnd(ctx,key)){
    autoUpdateQazaV13();
    var nextState=getDayState(ctx.key);
    if(nextState[key]==='qaza'){
      markComplete(ctx.key,key,true);
      toast('Qaza prayer complete ✓');
      return;
    }
  }
  toast('এই icon এখন complete করা যাবে না');
}

function updateOrbitV14(current){
  var ctx=prayerCycleContext(),state=getDayState(ctx.key);
  document.querySelectorAll('.orbit.one .picon').forEach(function(el,i){
    var p=PRAYERS[i];if(!p)return;
    var st=state[p.key]||'pending',sig=p.key+'|'+st+'|'+(p.key===current?'1':'0');
    if(!el.dataset.v14Ready){
      el.innerHTML=v13Icon(p.key);
      el.setAttribute('role','button');el.setAttribute('tabindex','0');
      el.onclick=function(ev){ev.stopPropagation();v14PrayerIconTap(p.key)};
      el.onkeydown=function(ev){if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();v14PrayerIconTap(p.key)}};
      el.dataset.v14Ready='1';
    }
    if(el.dataset.v14Sig===sig)return;
    el.dataset.v14Sig=sig;
    el.classList.toggle('active-prayer',p.key===current);
    el.classList.toggle('qaza-prayer',st==='qaza');
    el.classList.toggle('complete-prayer',st==='complete'||st==='qaza-complete');
    el.title=p.bn+' • '+p.name+(st==='qaza'?' • Qaza':'');
  });
}
v13UpdateOrbit=updateOrbitV14;

function v14SetText(el,text){if(el&&el.textContent!==text)el.textContent=text}
function syncHomeV14(){
  var home=document.getElementById('page-home');if(!home||!home.classList.contains('active'))return;
  var ctx=prayerCycleContext(),next=v13NextPrayer(ctx),ms=Math.max(0,next.date-ctx.now);
  v14SetText(document.getElementById('v14NextPrayer'),next.p.bn+' • '+next.p.name);
  v14SetText(document.getElementById('v14NextCount'),v13Duration(ms));
  v14SetText(document.getElementById('v14NextSub'),'Starts '+formatTime(next.date)+' • '+(isBangladeshCoords(coords)?'Dhaka time':'local time'));
  v14SetText(document.getElementById('v14LocationText'),locationLabel||'Location permission needed');
  v14SetText(document.getElementById('v14MethodMini'),(METHODS[settings.calcMethod]||METHODS.karachi).label+' • '+(settings.asrMethod==='hanafi'?'Hanafi':'Std'));
  updateOrbitV14(v13CurrentPrayer(ctx));
}

var oldUpdateCountdownV14=updateCountdownV13;
updateCountdownV13=function(){
  oldUpdateCountdownV14();
  syncHomeV14();
};

var oldRenderTodayV14=renderTodayV13;
renderTodayV13=function(){
  oldRenderTodayV14();
  syncHomeV14();
};
renderToday=renderTodayV13;

var oldShowPageV14=showPage;
showPage=function(name){
  if(name==='prayer')name='home';
  oldShowPageV14(name);
  document.querySelectorAll('#nav button').forEach(function(x){x.classList.toggle('active',x.dataset.page===name)});
  if(name==='home')requestAnimationFrame(syncHomeV14);
};

window.openGuidePageV13=function(){showPage('guide-v13')};

(function initV14(){
  if(window.AndroidBridge)document.documentElement.classList.add('native-perf');
  installHomeTopV14();
  mergePrayerCalendarIntoHomeV14();
  installNavV14();
  syncHomeV14();
  var idle=window.requestIdleCallback||function(fn){return setTimeout(fn,700)};
  idle(function(){try{renderCalendar()}catch(e){}},{timeout:1500});
})();