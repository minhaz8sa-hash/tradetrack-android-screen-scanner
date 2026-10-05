/* Namaz Orbit v1.5.6 — independent orbit portal + location permission auto-close */
(function(){
  var portal=null, outerButtons=[], qazaButtons=[], metrics=null;
  var lastFrame=0, raf=0, qazaSig='', currentSig='';
  var TWO=Math.PI*2;

  function ensurePortal156(){
    var home=document.getElementById('page-home'), orbits=home&&home.querySelector('.orbits');
    if(!home||!orbits)return null;
    if(!portal){
      portal=document.createElement('div');
      portal.id='orbitIconPortal156';
      portal.setAttribute('aria-label','Prayer orbit icons');
      home.appendChild(portal);
      buildOuter156();
      if(window.ResizeObserver){
        new ResizeObserver(function(){measure156()}).observe(orbits);
      }
      window.addEventListener('resize',measure156,{passive:true});
    }
    measure156();
    return portal;
  }

  function measure156(){
    if(!portal)return;
    var home=document.getElementById('page-home'), orbits=home&&home.querySelector('.orbits');
    if(!home||!orbits)return;
    portal.style.left=orbits.offsetLeft+'px';
    portal.style.top=orbits.offsetTop+'px';
    portal.style.width=orbits.offsetWidth+'px';
    portal.style.height=orbits.offsetHeight+'px';

    var pr=portal.getBoundingClientRect();
    var o1=orbits.querySelector('.orbit.one'), o2=orbits.querySelector('.orbit.two');
    if(!o1||!o2)return;
    var r1=o1.getBoundingClientRect(), r2=o2.getBoundingClientRect();

    var c1x=r1.left-pr.left+r1.width/2, c1y=r1.top-pr.top+r1.height/2;
    var c2x=r2.left-pr.left+r2.width/2, c2y=r2.top-pr.top+r2.height/2;

    // Keep icons fully inside the visible page width while still visually riding the rings.
    var sideSafe=Math.max(24,Math.min(c1x,pr.width-c1x)-28);
    var outerR=Math.min(r1.width/2-5,sideSafe);
    var innerR=Math.max(76,Math.min(r2.width/2-10,Math.min(c2x,pr.width-c2x)-24));

    metrics={c1x:c1x,c1y:c1y,c2x:c2x,c2y:c2y,outerR:outerR,innerR:innerR};
  }

  function buildOuter156(){
    if(!portal)return;
    outerButtons=[];
    PRAYERS.forEach(function(p,i){
      var b=document.createElement('button');
      b.className='orbit-portal-icon156 daily';
      b.innerHTML=v13Icon(p.key);
      b.dataset.prayer=p.key;
      b.setAttribute('aria-label',p.bn+' '+p.name);
      b.onclick=function(ev){ev.stopPropagation();v14PrayerIconTap(p.key)};
      portal.appendChild(b);
      outerButtons.push(b);
    });
  }

  function syncOuterState156(){
    var ctx=prayerCycleContext(), state=getDayState(ctx.key), current=v13CurrentPrayer(ctx);
    var sig=ctx.key+'|'+current+'|'+PRAYERS.map(function(p){return state[p.key]||'pending'}).join(',');
    if(sig===currentSig)return;
    currentSig=sig;
    outerButtons.forEach(function(b,i){
      var p=PRAYERS[i], st=state[p.key]||'pending';
      b.classList.toggle('active-prayer',p.key===current);
      b.classList.toggle('qaza-main',st==='qaza');
      b.style.display=st==='qaza'?'none':'grid';
      b.title=p.bn+' • '+p.name+(st==='qaza'?' • Qaza':'');
    });
  }

  function syncQaza156(force){
    var queue=typeof qazaQueue==='function'?qazaQueue():[];
    var sig=queue.map(function(q){return q.dateKey+'|'+q.prayer.key}).join(',');
    if(!force&&sig===qazaSig)return;
    qazaSig=sig;
    qazaButtons.forEach(function(b){b.remove()});
    qazaButtons=[];
    if(!portal)return;
    portal.classList.toggle('dense',queue.length>8);
    queue.forEach(function(q){
      var b=document.createElement('button');
      b.className='orbit-portal-icon156 qaza-history';
      b.innerHTML=v13Icon(q.prayer.key);
      b.title=q.prayer.bn+' • Qaza • '+q.dateKey;
      b.setAttribute('aria-label',q.prayer.bn+' Qaza '+q.dateKey);
      b.onclick=function(ev){
        ev.stopPropagation();
        markComplete(q.dateKey,q.prayer.key,true);
        setTimeout(function(){syncQaza156(true);syncOuterState156()},60);
      };
      portal.appendChild(b);
      qazaButtons.push(b);
    });
  }

  function animate156(ts){
    raf=requestAnimationFrame(animate156);
    if(document.hidden||!document.body.classList.contains('home-orbit-active'))return;
    if(ts-lastFrame<30)return; // ~33fps, smooth without wasting battery.
    lastFrame=ts;
    if(!portal||!metrics)ensurePortal156();
    if(!portal||!metrics)return;

    syncOuterState156();
    syncQaza156(false);

    var outerPhase=((ts%32000)/32000)*TWO;
    var n=outerButtons.length||1;
    outerButtons.forEach(function(b,i){
      var a=outerPhase + i*TWO/n - Math.PI/2;
      var x=metrics.c1x+Math.cos(a)*metrics.outerR;
      var y=metrics.c1y+Math.sin(a)*metrics.outerR;
      b.style.transform='translate3d('+x.toFixed(1)+'px,'+y.toFixed(1)+'px,0)';
    });

    var qn=qazaButtons.length;
    if(qn){
      var qPhase=-((ts%24000)/24000)*TWO;
      qazaButtons.forEach(function(b,i){
        var a=qPhase + i*TWO/qn - Math.PI/2;
        var x=metrics.c2x+Math.cos(a)*metrics.innerR;
        var y=metrics.c2y+Math.sin(a)*metrics.innerR;
        b.style.transform='translate3d('+x.toFixed(1)+'px,'+y.toFixed(1)+'px,0)';
      });
    }
  }

  function locationGranted156(){
    try{
      if(window.AndroidBridge&&window.AndroidBridge.hasFineLocationPermission){
        return !!window.AndroidBridge.hasFineLocationPermission();
      }
    }catch(e){}
    return false;
  }

  window.onNativeLocationPermissionChanged=function(granted){
    if(!granted)return;
    try{hideLocationOnboarding()}catch(e){}
    try{if(typeof startLiveLocationV15==='function')startLiveLocationV15()}catch(e){}
    try{detectLocation()}catch(e){}
    setTimeout(function(){
      try{updateCoreLocationUIV15()}catch(e){}
      try{renderTodayV13()}catch(e){}
      try{updateQiblaV13()}catch(e){}
    },250);
  };

  // Also catches permission granted from Android Settings after returning to the app.
  var permissionPoll156=setInterval(function(){
    var modal=document.getElementById('locationOnboarding');
    if(!modal||!modal.classList.contains('open'))return;
    if(locationGranted156())window.onNativeLocationPermissionChanged(true);
  },700);

  var oldShowPage156=window.showPage;
  window.showPage=function(name){
    oldShowPage156(name);
    if(name==='home'){
      document.body.classList.add('home-orbit-active');
      requestAnimationFrame(function(){ensurePortal156();measure156();syncQaza156(true)});
    }
  };

  var oldUpdateOrbit156=window.updateOrbitV14;
  window.updateOrbitV14=function(current){
    if(typeof oldUpdateOrbit156==='function')oldUpdateOrbit156(current);
    ensurePortal156();
    syncOuterState156();
    syncQaza156(false);
  };
  window.v13UpdateOrbit=window.updateOrbitV14;

  // All historic pending Qaza remain in the Qaza orbit until completion.
  var oldMarkComplete156=window.markComplete;
  if(typeof oldMarkComplete156==='function'){
    window.markComplete=function(){
      var out=oldMarkComplete156.apply(this,arguments);
      setTimeout(function(){syncQaza156(true);syncOuterState156()},60);
      return out;
    };
  }

  ensurePortal156();
  syncQaza156(true);
  if(!raf)raf=requestAnimationFrame(animate156);
})();