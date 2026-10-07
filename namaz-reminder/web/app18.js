/* Namaz Orbit v1.8.0 — Phase 3 Mosque/Jamaat Mode + Dhikr tap circle */
var dhikrSeq180=[
  {key:'subhan',max:33,label:'সুবহানাল্লাহ'},
  {key:'hamd',max:33,label:'আলহামদুলিল্লাহ'},
  {key:'akbar',max:34,label:'আল্লাহু আকবার'}
];

function currentDhikrStage180(){
  for(var i=0;i<dhikrSeq180.length;i++){
    var x=dhikrSeq180[i];
    if((dhikrState170[x.key]||0)<x.max)return x;
  }
  return null;
}
function installDhikrCircle180(){
  var panel=document.querySelector('#dhikrSheet170 .dhikr-panel170');
  if(!panel||document.getElementById('dhikrCircle180'))return;
  var head=panel.querySelector('.dhikr-head170');
  var wrap=document.createElement('div');wrap.className='dhikr-circle-wrap180';
  wrap.innerHTML='<button type="button" class="dhikr-circle180" id="dhikrCircle180" onclick="tapDhikrCircle180()">'+
    '<span class="dc-label180" id="dhikrCircleLabel180">সুবহানাল্লাহ</span>'+
    '<span class="dc-count180" id="dhikrCircleCount180">0</span>'+
    '<span class="dc-target180" id="dhikrCircleTarget180">of 33</span>'+
    '</button><div class="dhikr-tap-help180">Circle-এ tap করে count করুন</div>';
  if(head)head.insertAdjacentElement('afterend',wrap);else panel.insertBefore(wrap,panel.firstChild);
  renderDhikrCircle180();
}
function renderDhikrCircle180(){
  var btn=document.getElementById('dhikrCircle180');if(!btn)return;
  var stage=currentDhikrStage180(),label=document.getElementById('dhikrCircleLabel180'),count=document.getElementById('dhikrCircleCount180'),target=document.getElementById('dhikrCircleTarget180');
  document.querySelectorAll('#dhikrSheet170 .dhikr-row170').forEach(function(r){r.classList.remove('active180')});
  if(!stage){
    label.textContent='Dhikr complete';count.textContent='✓';target.textContent='100 / 100';btn.classList.add('complete');return;
  }
  btn.classList.remove('complete');label.textContent=stage.label;count.textContent=dhikrState170[stage.key]||0;target.textContent='of '+stage.max;
  var idx=dhikrSeq180.indexOf(stage),row=document.querySelectorAll('#dhikrSheet170 .dhikr-row170')[idx];if(row)row.classList.add('active180');
}
function tapDhikrCircle180(){
  var stage=currentDhikrStage180();if(!stage)return;
  tapDhikr170(stage.key,stage.max);
  try{if(navigator.vibrate)navigator.vibrate(24)}catch(e){}
  renderDhikrCircle180();
}
(function upgradeDhikr180(){
  installDhikrCircle180();
  var oldRender=window.renderDhikr170;
  window.renderDhikr170=function(){if(typeof oldRender==='function')oldRender();renderDhikrCircle180()};
  var oldOpen=window.openDhikr170;
  window.openDhikr170=function(reset){
    var out=oldOpen(reset);installDhikrCircle180();renderDhikrCircle180();
    var p=document.querySelector('#dhikrSheet170 .dhikr-panel170');if(p)p.scrollTop=0;
    return out;
  };
  var oldReset=window.resetDhikr170;
  window.resetDhikr170=function(){var out=oldReset();renderDhikrCircle180();return out};
})();

function mosqueData180(){
  try{
    var x=JSON.parse(localStorage.getItem('no_mosque_180')||'{}')||{};
    x.times=x.times||{};return x;
  }catch(e){return {times:{}}}
}
function saveMosqueData180(x){localStorage.setItem('no_mosque_180',JSON.stringify(x||{}))}
function mosqueIcon180(){return '<svg viewBox="0 0 24 24" style="width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:1.7"><path d="M4 20v-8h16v8M7 12V8l5-4 5 4v4M9 20v-5h6v5"/><path d="M2 20h20"/></svg>'}
function time12_180(v){
  if(!v)return'';
  var a=v.split(':'),h=Number(a[0]),m=a[1]||'00',ap=h>=12?'PM':'AM';h=h%12||12;return h+':'+m+' '+ap;
}
function installMosque180(){
  var more=document.getElementById('page-more');if(!more||document.getElementById('mosque180'))return;
  var p=document.createElement('div');p.id='mosque180';p.className='panel glass mosque180';
  p.innerHTML='<div class="mosque-head180"><div><h3>Mosque / Jamaat Mode</h3><small>নিজের mosque-এর Iqama/Jamaat ও Jummah time localভাবে save করুন।</small></div><input id="mosqueEnabled180" class="mosque-switch180" type="checkbox"></div>'+
    '<label class="control-label mosque-name180">Mosque name<input class="control" id="mosqueName180" maxlength="70" placeholder="e.g. Local Jame Masjid"></label>'+
    '<div class="mosque-times180" id="mosqueTimes180"></div>'+
    '<div class="mosque-jummah180"><div class="mosque-time180"><label>Jummah 1 <input type="time" id="jummah1_180"></label></div><div class="mosque-time180"><label>Jummah 2 <input type="time" id="jummah2_180"></label></div></div>'+
    '<div class="mosque-summary180" id="mosqueSummary180">Mosque Mode off.</div>'+
    '<div class="mosque-actions180"><button class="btn" onclick="clearMosque180()">Clear</button><button class="btn primary" onclick="saveMosque180()">Save Mosque</button></div>';
  var smart=document.getElementById('smart171'),acc=document.getElementById('accuracyCenter170');
  if(smart)smart.insertAdjacentElement('afterend',p);else if(acc)acc.insertAdjacentElement('beforebegin',p);else more.appendChild(p);
  var list=document.getElementById('mosqueTimes180');
  PRAYERS.forEach(function(pr){
    var row=document.createElement('div');row.className='mosque-time180';
    row.innerHTML='<label>'+pr.bn+' <input type="time" id="mosque_'+pr.key+'_180"></label>';list.appendChild(row);
  });
  loadMosque180();
}
function loadMosque180(){
  var x=mosqueData180(),en=document.getElementById('mosqueEnabled180'),name=document.getElementById('mosqueName180');
  if(en)en.checked=!!x.enabled;if(name)name.value=x.name||'';
  PRAYERS.forEach(function(p){var el=document.getElementById('mosque_'+p.key+'_180');if(el)el.value=x.times[p.key]||''});
  var j1=document.getElementById('jummah1_180'),j2=document.getElementById('jummah2_180');if(j1)j1.value=x.jummah1||'';if(j2)j2.value=x.jummah2||'';
  renderMosqueSummary180();decorateMosqueHome180();
}
function saveMosque180(){
  var x={enabled:!!document.getElementById('mosqueEnabled180').checked,name:(document.getElementById('mosqueName180').value||'').trim().slice(0,70),times:{}};
  PRAYERS.forEach(function(p){x.times[p.key]=document.getElementById('mosque_'+p.key+'_180').value||''});
  x.jummah1=document.getElementById('jummah1_180').value||'';x.jummah2=document.getElementById('jummah2_180').value||'';
  saveMosqueData180(x);renderMosqueSummary180();decorateMosqueHome180();toast('Mosque/Jamaat times saved ✓');
}
function clearMosque180(){localStorage.removeItem('no_mosque_180');loadMosque180();toast('Mosque Mode cleared')}
function renderMosqueSummary180(){
  var x=mosqueData180(),el=document.getElementById('mosqueSummary180');if(!el)return;
  if(!x.enabled){el.textContent='Mosque Mode off.';return}
  var parts=[];PRAYERS.forEach(function(p){if(x.times[p.key])parts.push(p.bn+' '+time12_180(x.times[p.key]))});
  el.textContent=(x.name?x.name+' • ':'')+(parts.length?parts.join(' • '):'Jamaat times এখনো set করা হয়নি')+(x.jummah1?' • Jummah '+time12_180(x.jummah1):'');
}
function decorateMosqueHome180(){
  var x=mosqueData180();
  document.querySelectorAll('.mosque-home-chip180,.mosque-next180').forEach(function(e){e.remove()});
  if(!x.enabled)return;
  var list=document.getElementById('todayPrayerList');
  if(list){
    var cards=list.querySelectorAll('.prayer-card');
    PRAYERS.forEach(function(p,i){
      if(!x.times[p.key]||!cards[i])return;
      var content=cards[i].children[1]||cards[i],chip=document.createElement('div');chip.className='mosque-home-chip180';chip.innerHTML=mosqueIcon180()+' Jamaat '+time12_180(x.times[p.key]);content.appendChild(chip);
    });
  }
  try{
    var ctx=prayerCycleContext(),next=v13NextPrayer(ctx),t=x.times[next.p.key],card=document.getElementById('homeNextV14');
    if(card&&t){
      var n=document.createElement('div');n.className='mosque-next180';n.innerHTML=mosqueIcon180()+(x.name?x.name+' • ':'')+'Jamaat '+time12_180(t);card.appendChild(n);
    }
  }catch(e){}
}

(function initPhase3_180(){
  installMosque180();decorateMosqueHome180();
  var oldRender=window.renderTodayV13;
  if(typeof oldRender==='function'){
    window.renderTodayV13=function(){var out=oldRender.apply(this,arguments);requestAnimationFrame(decorateMosqueHome180);return out};
    window.renderToday=window.renderTodayV13;
  }
  var oldShow=window.showPage;
  window.showPage=function(name){oldShow(name);if(name==='more')loadMosque180();if(name==='home')setTimeout(decorateMosqueHome180,50)};
})();