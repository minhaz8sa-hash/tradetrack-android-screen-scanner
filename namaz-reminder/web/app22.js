/* Namaz Orbit v2.0.1 — feedback, live widget, strong alarm */
(function(){
  function profileName184(){
    try{
      if(typeof loadProfile160==='function'){
        var p=loadProfile160();return (p&&p.name)||'';
      }
    }catch(e){}
    return '';
  }

  window.sendAbout184=async function(){
    var input=document.getElementById('adminWord183'),btn=input&&input.parentElement?input.parentElement.querySelector('button'):null,st=document.getElementById('adminStatus183');
    var message=(input&&input.value||'').trim();
    if(!message){if(st){st.textContent='Feedback বা message লিখুন';st.className='admin-status183 error'}return}
    if(btn)btn.disabled=true;
    try{
      var r=await fetch(MOSQUE_API_183,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({action:'about_submit',message:message,name:profileName184()})
      });
      var j=await r.json();
      if(!r.ok||!j.ok)throw new Error(j.error||'Send failed');

      if(j.admin){
        adminSecret183=message;
        sessionStorage.setItem('no_admin_183',message);
        if(st){st.textContent='Administration opened ✓';st.className='admin-status183 ok'}
        if(input)input.value='';
        var panel=document.getElementById('adminPanel183');if(panel)panel.classList.add('open');
        await loadAdminMosques183();
        installAdminFeedback184();
        await loadAdminFeedback184();
        if(panel)panel.scrollIntoView({behavior:'smooth',block:'start'});
      }else{
        if(st){st.textContent='Feedback sent ✓';st.className='admin-status183 ok'}
        if(input)input.value='';
        setTimeout(function(){if(st){st.textContent='';st.className='admin-status183'}},2200);
      }
    }catch(e){
      if(st){st.textContent='Send failed • internet check করুন';st.className='admin-status183 error'}
    }finally{
      if(btn)btn.disabled=false;
    }
  };

  window.unlockAdmin183=window.sendAbout184;

  function upgradeAbout184(){
    var about=document.getElementById('about183'),input=document.getElementById('adminWord183'),st=document.getElementById('adminStatus183');
    if(!about||!input)return;
    input.type='text';
    input.placeholder='আপনি কী জানতে চান / Feedback';
    input.setAttribute('aria-label','Feedback or administration keyword');
    var btn=input.parentElement&&input.parentElement.querySelector('button');
    if(btn){btn.textContent='Send';btn.setAttribute('onclick','sendAbout184()')}
    if(st&&st.textContent.includes('Administration access hidden'))st.textContent='';
    if(!about.querySelector('.about-feedback184')){
      var n=document.createElement('div');n.className='about-feedback184';
      n.textContent='আপনি কী জানতে চান বা app-এর feedback লিখে Send করুন।';
      input.parentElement.insertAdjacentElement('beforebegin',n);
    }
  }

  window.installAdminFeedback184=function(){
    var panel=document.getElementById('adminPanel183');if(!panel||document.getElementById('adminFeedback184'))return;
    var box=document.createElement('div');box.id='adminFeedback184';box.className='feedback-admin184';
    box.innerHTML='<div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><div><h4>User Feedback</h4><div class="meta">About box থেকে পাঠানো feedback</div></div><button class="btn" onclick="loadAdminFeedback184()">Refresh</button></div><div class="feedback-list184" id="adminFeedbackList184"></div>';
    panel.appendChild(box);
  };

  window.loadAdminFeedback184=async function(){
    installAdminFeedback184();
    var box=document.getElementById('adminFeedbackList184');if(!box)return;
    if(!adminSecret183)adminSecret183=sessionStorage.getItem('no_admin_183')||'';
    box.innerHTML='<div class="meta">Loading feedback…</div>';
    try{
      var r=await fetch(MOSQUE_API_183,{method:'POST',headers:{'Content-Type':'application/json','X-Admin-Secret':adminSecret183},body:JSON.stringify({action:'feedbacks'})});
      var j=await r.json();if(!r.ok||!j.ok)throw new Error();
      var items=Array.isArray(j.items)?j.items:[];
      if(!items.length){box.innerHTML='<div class="meta">এখনও কোনো feedback নেই।</div>';return}
      box.innerHTML='';
      items.forEach(function(x){
        var d=document.createElement('div');d.className='feedback-item184';
        var when=x.createdAt?new Date(x.createdAt).toLocaleString('en-BD'):'';
        d.innerHTML='<div class="feedback-top184"><b>'+escapeHtml181(x.name||'User')+'</b><small>'+escapeHtml181(when)+'</small></div><div class="feedback-msg184">'+escapeHtml181(x.message||'')+'</div><button class="feedback-del184" onclick="deleteAdminFeedback184(\''+x.id+'\')">Delete</button>';
        box.appendChild(d);
      });
    }catch(e){box.innerHTML='<div class="meta">Feedback load failed.</div>'}
  };

  window.deleteAdminFeedback184=async function(id){
    if(!adminSecret183)adminSecret183=sessionStorage.getItem('no_admin_183')||'';
    try{
      var r=await fetch(MOSQUE_API_183,{method:'POST',headers:{'Content-Type':'application/json','X-Admin-Secret':adminSecret183},body:JSON.stringify({action:'delete_feedback',id:id})});
      if(!r.ok)throw new Error();await loadAdminFeedback184();
    }catch(e){toast('Delete failed')}
  };

  function syncWidget184(force){
    if(!window.AndroidBridge||!window.AndroidBridge.updatePrayerWidgetV3)return;
    try{
      var ctx=prayerCycleContext(),next=v13NextPrayer(ctx),bearing=qiblaBearingV13(),current=v13CurrentPrayer(ctx);
      var cp=PRAYERS.find(function(p){return p.key===current});
      var q=typeof qazaQueue==='function'?qazaQueue().length:0;
      var epoch=typeof actualEpochForWallDate==='function'?actualEpochForWallDate(next.date):next.date.getTime();
      var sig=ctx.key+'|'+next.p.key+'|'+epoch+'|'+q+'|'+Math.round(bearing);
      if(!force&&window.__widgetSig184===sig)return;
      window.__widgetSig184=sig;
      window.AndroidBridge.updatePrayerWidgetV3(
        next.p.bn+' • '+next.p.name,
        formatTime(next.date),
        Math.round(epoch),
        bearing,
        q,
        cp?(cp.bn+' active'):'Between prayers'
      );
      var n=document.getElementById('widgetPreviewName170'),tm=document.getElementById('widgetPreviewTime170'),qb=document.getElementById('widgetPreviewQibla170');
      if(n)n.textContent=next.p.bn+' • '+next.p.name;
      if(tm)tm.textContent='Starts '+formatTime(next.date);
      if(qb)qb.textContent='Qibla '+Math.round(bearing)+'°';
    }catch(e){}
  }
  window.syncWidget170=syncWidget184;
  window.syncWidget171=syncWidget184;

  function dndReady184(){
    try{return !window.AndroidBridge||!window.AndroidBridge.hasDndAlarmAccess||window.AndroidBridge.hasDndAlarmAccess()}catch(e){return false}
  }

  window.renderStrongAlarm184=function(){
    var enabled=document.getElementById('strongAlarmEnabled184'),range=document.getElementById('strongAlarmVolume184'),val=document.getElementById('strongAlarmVolumeValue184'),status=document.getElementById('strongAlarmStatus184');
    try{
      if(enabled&&window.AndroidBridge&&window.AndroidBridge.isStrongAlarmEnabled)enabled.checked=window.AndroidBridge.isStrongAlarmEnabled();
      if(range&&window.AndroidBridge&&window.AndroidBridge.getStrongAlarmVolumePercent)range.value=window.AndroidBridge.getStrongAlarmVolumePercent();
    }catch(e){}
    if(val&&range)val.textContent=range.value+'%';
    if(status){
      var ok=dndReady184();status.classList.toggle('ready',ok);
      status.textContent=ok?'Strong Alarm ready • Silent/Vibrate mode-এ ALARM stream ব্যবহার করবে।':'Silent/Vibrate mode-এ alarm বাজবে। DND Total Silence-এর জন্য DND access দিন।';
    }
  };

  window.saveStrongAlarm184=function(){
    var enabled=document.getElementById('strongAlarmEnabled184')?.checked!==false;
    var pct=Math.max(10,Math.min(100,Number(document.getElementById('strongAlarmVolume184')?.value)||80));
    try{window.AndroidBridge&&window.AndroidBridge.configureStrongAlarm&&window.AndroidBridge.configureStrongAlarm(enabled,pct)}catch(e){}
    renderStrongAlarm184();toast('Strong Alarm saved ✓');
  };

  window.openDnd184=function(){
    try{window.AndroidBridge&&window.AndroidBridge.openDndAlarmAccess&&window.AndroidBridge.openDndAlarmAccess()}catch(e){}
  };

  function installStrongAlarm184(){
    var more=document.getElementById('page-more');if(!more||document.getElementById('strongAlarm184'))return;
    var p=document.createElement('div');p.id='strongAlarm184';p.className='panel glass strong-alarm184';
    p.innerHTML='<h3>Strong Alarm</h3><div class="meta">Prayer Start/Test/Mosque Azan-Jamaat-এর জন্য looping ALARM stream sound.</div>'+
      '<div class="strong-main184"><div><b>Strong prayer sound</b><small>Phone Silent/Vibrate mode হলেও Android alarm stream ব্যবহার করবে।</small></div><input id="strongAlarmEnabled184" type="checkbox" checked></div>'+
      '<div class="strong-volume184"><label><span>Minimum alarm volume</span><b id="strongAlarmVolumeValue184">80%</b></label><input id="strongAlarmVolume184" type="range" min="40" max="100" step="5" value="80" oninput="document.getElementById(\'strongAlarmVolumeValue184\').textContent=this.value+\'%\'"></div>'+
      '<div class="strong-actions184"><button class="btn primary" onclick="saveStrongAlarm184()">Save Strong Alarm</button><button class="btn" onclick="openDnd184()">DND alarm access</button></div>'+
      '<div class="strong-status184" id="strongAlarmStatus184"></div>';
    var test=document.getElementById('testAlarmPanelV13');
    if(test)test.insertAdjacentElement('beforebegin',p);else more.appendChild(p);
    renderStrongAlarm184();
  }

  function boot184(){
    upgradeAbout184();installAdminFeedback184();installStrongAlarm184();syncWidget184(true);
    var saved=sessionStorage.getItem('no_admin_183');
    if(saved&&document.getElementById('adminPanel183')?.classList.contains('open'))loadAdminFeedback184();
  }
  boot184();

  var oldShow184=window.showPage;
  window.showPage=function(name){
    oldShow184(name);
    if(name==='more'){upgradeAbout184();installStrongAlarm184();renderStrongAlarm184()}
    if(name==='home')syncWidget184(true);
  };

  setInterval(function(){
    if(document.hidden)return;
    syncWidget184(false);
    if(document.getElementById('page-more')?.classList.contains('active'))renderStrongAlarm184();
  },60000);
})();