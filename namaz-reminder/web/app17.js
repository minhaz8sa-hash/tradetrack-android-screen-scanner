/* Namaz Orbit v1.7.1 — Phase 2 */
var insightsDays171=7,widgetSig171='';

function insightData171(days){
  var out={on:0,qd:0,qc:0,perfect:0,per:{}};
  PRAYERS.forEach(function(p){out.per[p.key]={on:0,miss:0}});
  var now=locationNow();
  for(var i=0;i<days;i++){
    var d=new Date(now.getFullYear(),now.getMonth(),now.getDate()-i,12,0,0),st=getDayState(dateKey(d)),perfect=true;
    PRAYERS.forEach(function(p){
      var v=st[p.key]||'pending';
      if(v==='complete'){out.on++;out.per[p.key].on++}
      else if(v==='qaza-complete'){out.qc++;out.per[p.key].miss++;perfect=false}
      else if(v==='qaza'){out.qd++;out.per[p.key].miss++;perfect=false}
      else perfect=false;
    });
    if(perfect)out.perfect++;
  }
  return out;
}
function streak171(){
  var now=locationNow(),n=0;
  for(var i=0;i<365;i++){
    var d=new Date(now.getFullYear(),now.getMonth(),now.getDate()-i,12,0,0),st=getDayState(dateKey(d));
    if(!PRAYERS.every(function(p){return st[p.key]==='complete'}))break;n++;
  }
  return n;
}
function installInsights171(){
  var more=document.getElementById('page-more');if(!more||document.getElementById('insights171'))return;
  var x=document.createElement('div');x.id='insights171';x.className='panel glass insights171';
  x.innerHTML='<div class="ins-head171"><div><h3>Prayer Insights</h3><small>Local-only habit overview</small></div><span class="acc-badge170" id="insStreak171">0 day streak</span></div><div class="ins-tabs171"><button class="ins-tab171 active" id="ins7Tab171" onclick="setInsightsDays171(7)">7 days</button><button class="ins-tab171" id="ins30Tab171" onclick="setInsightsDays171(30)">30 days</button></div><div class="ins-grid171" id="insStats171"></div><div class="ins-bars171" id="insBars171"></div><div class="ins-note171" id="insNote171"></div>';
  var a=document.getElementById('accuracyCenter170');if(a)a.insertAdjacentElement('beforebegin',x);else more.insertBefore(x,more.firstChild);
  renderInsights171();
}
function setInsightsDays171(n){insightsDays171=n===30?30:7;document.getElementById('ins7Tab171')?.classList.toggle('active',insightsDays171===7);document.getElementById('ins30Tab171')?.classList.toggle('active',insightsDays171===30);renderInsights171()}
function renderInsights171(){
  var s=insightData171(insightsDays171),box=document.getElementById('insStats171');if(!box)return;
  var total=insightsDays171*5,done=s.on+s.qc,rate=Math.round(done/total*100),rec=(s.qc+s.qd)?Math.round(s.qc/(s.qc+s.qd)*100):100;
  box.innerHTML='<div class="ins-stat171"><b>'+rate+'%</b><span>Completion</span></div><div class="ins-stat171"><b>'+s.on+'</b><span>On-time</span></div><div class="ins-stat171"><b>'+s.qc+'</b><span>Qaza recovered</span></div><div class="ins-stat171"><b>'+s.perfect+'</b><span>Perfect days</span></div>';
  document.getElementById('insStreak171').textContent=streak171()+' day streak';
  var bars=document.getElementById('insBars171');bars.innerHTML='';
  PRAYERS.forEach(function(p){var z=s.per[p.key],n=z.on+z.miss,pct=n?Math.round(z.on/n*100):0,row=document.createElement('div');row.className='ins-row171';row.innerHTML='<span>'+p.bn+'</span><div class="ins-bar171"><i style="width:'+pct+'%"></i></div><small>'+pct+'%</small>';bars.appendChild(row)});
  document.getElementById('insNote171').textContent='Qaza recovery '+rec+'% • Qaza due '+s.qd+'.';
}

function ruleSet171(){
  var x={};PRAYERS.forEach(function(p){var r=(settings.smartRules||{})[p.key]||{};x[p.key]={start:r.start!==false,pre:r.pre!==false,end:r.end!==false}});return x;
}
function installSmart171(){
  var more=document.getElementById('page-more');if(!more||document.getElementById('smart171'))return;
  var x=document.createElement('div');x.id='smart171';x.className='panel glass smart171';
  x.innerHTML='<h3>Smart Reminder Center</h3><div class="meta">প্রতি নামাজে Start, 10m before ও End-20 আলাদা control করুন।</div><div class="smart-list171" id="smartList171"></div><button class="btn primary full smart-save171" onclick="saveSmart171()">Save & reschedule</button>';
  var ins=document.getElementById('insights171');if(ins)ins.insertAdjacentElement('afterend',x);else more.appendChild(x);renderSmart171();
}
function renderSmart171(){
  var list=document.getElementById('smartList171');if(!list)return;var rules=ruleSet171();list.innerHTML='';
  PRAYERS.forEach(function(p){var r=rules[p.key],row=document.createElement('div');row.className='smart-row171';row.innerHTML='<div class="smart-top171"><div class="ico">'+v13Icon(p.key)+'</div><b>'+p.bn+' • '+p.name+'</b></div><div class="smart-options171"><label class="smart-opt171"><input type="checkbox" data-r="'+p.key+'" data-t="start" '+(r.start?'checked':'')+'>Start</label><label class="smart-opt171"><input type="checkbox" data-r="'+p.key+'" data-t="pre" '+(r.pre?'checked':'')+'>10m before</label><label class="smart-opt171"><input type="checkbox" data-r="'+p.key+'" data-t="end" '+(r.end?'checked':'')+'>End-20</label></div>';list.appendChild(row)});
}
function saveSmart171(){
  var rules=ruleSet171();document.querySelectorAll('[data-r]').forEach(function(e){rules[e.dataset.r][e.dataset.t]=!!e.checked});
  settings.smartRules=rules;settings.preReminder=10;settings.endReminder=true;localStorage.setItem('no_settings',JSON.stringify(settings));
  try{window.AndroidBridge&&window.AndroidBridge.clearAllScheduledAlarms()}catch(e){}
  try{v13AlarmScheduleSignature='';scheduleAlarmsV13(true)}catch(e){};toast('Smart reminders saved ✓');
}

function installComplete171(){
  if(document.getElementById('completeSheet171'))return;
  var x=document.createElement('div');x.id='completeSheet171';x.className='complete-sheet171';
  x.innerHTML='<div class="complete-panel171"><div class="complete-check171">✓</div><h3 id="completeTitle171">Alhamdulillah</h3><p>চাইলে এখন optional after-prayer Dhikr tracker শুরু করতে পারেন।</p><div class="complete-actions171"><button class="btn" onclick="closeComplete171()">Not now</button><button class="btn primary" onclick="startDhikr171()">Start Dhikr</button></div></div>';document.body.appendChild(x);
}
window.showPrayerCompleteFlow171=function(key){installComplete171();var p=PRAYERS.find(function(x){return x.key===key})||{bn:'নামাজ'};document.getElementById('completeTitle171').textContent='Alhamdulillah • '+p.bn+' complete';document.getElementById('completeSheet171').classList.add('open');renderInsights171()};
function closeComplete171(){document.getElementById('completeSheet171')?.classList.remove('open')}
function startDhikr171(){closeComplete171();openDhikr170(true)}

function syncWidget171(force){
  try{
    var c=prayerCycleContext(),n=v13NextPrayer(c),b=qiblaBearingV13(),cur=v13CurrentPrayer(c),cp=PRAYERS.find(function(p){return p.key===cur}),q=typeof qazaQueue==='function'?qazaQueue().length:0;
    var sig=c.key+'|'+n.p.key+'|'+Math.floor((n.date-c.now)/60000)+'|'+q;if(!force&&sig===widgetSig171)return;widgetSig171=sig;
    if(window.AndroidBridge&&window.AndroidBridge.updatePrayerWidgetV2)window.AndroidBridge.updatePrayerWidgetV2(n.p.bn+' • '+n.p.name,formatTime(n.date),v13Duration(n.date-c.now),b,q,cp?(cp.bn+' active'):'Between prayers');
  }catch(e){}
}

(function(){
  installInsights171();installSmart171();installComplete171();syncWidget171(true);
  var old=window.showPage;window.showPage=function(name){old(name);if(name==='more'){renderInsights171();renderSmart171();syncWidget171(true)}};
  var m=window.markComplete;if(typeof m==='function')window.markComplete=function(){var r=m.apply(this,arguments);setTimeout(renderInsights171,80);setTimeout(function(){syncWidget171(true)},100);return r};
  setInterval(function(){if(!document.hidden)syncWidget171(false)},60000);
})();