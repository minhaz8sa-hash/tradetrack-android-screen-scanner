/* Namaz Orbit v1.8.1 — Floating Dhikr + Mosque next phase */
var dhikrFloatDrag181=null,nearbyMosques181=[];

function dhikrStage181(){
  if(typeof currentDhikrStage180==='function')return currentDhikrStage180();
  var seq=[
    {key:'subhan',max:33,label:'সুবহানাল্লাহ'},
    {key:'hamd',max:33,label:'আলহামদুলিল্লাহ'},
    {key:'akbar',max:34,label:'আল্লাহু আকবার'}
  ];
  for(var i=0;i<seq.length;i++)if((dhikrState170[seq[i].key]||0)<seq[i].max)return seq[i];
  return null;
}
function installDhikrFloat181(){
  if(document.getElementById('dhikrFloat181'))return;
  var f=document.createElement('div');f.id='dhikrFloat181';
  f.innerHTML='<div class="dhikr-float-drag181"></div><button type="button" class="dhikr-float-circle181" id="dhikrFloatBtn181" aria-label="Dhikr counter">'+
    '<span class="dhikr-float-count181" id="dhikrFloatCount181">0</span>'+
    '<span class="dhikr-float-stage181" id="dhikrFloatStage181">সুবহানাল্লাহ</span>'+
    '<span class="dhikr-float-target181" id="dhikrFloatTarget181">of 33</span></button>';
  document.body.appendChild(f);

  var saved={};
  try{saved=JSON.parse(localStorage.getItem('no_dhikr_float_pos_181')||'{}')||{}}catch(e){}
  if(Number.isFinite(saved.x)&&Number.isFinite(saved.y)){
    f.style.left=saved.x+'px';f.style.top=saved.y+'px';
  }
  bindDhikrDrag181(f);
  renderDhikrFloat181();
}
function clampDhikrFloat181(x,y){
  var f=document.getElementById('dhikrFloat181'),w=f?f.offsetWidth:86,h=f?f.offsetHeight:86;
  var nav=document.querySelector('.nav'),bottom=nav?Math.max(18,innerHeight-nav.getBoundingClientRect().top+10):72;
  return {
    x:Math.max(8,Math.min(innerWidth-w-8,x)),
    y:Math.max(48,Math.min(innerHeight-h-bottom,y))
  };
}
function bindDhikrDrag181(f){
  f.addEventListener('pointerdown',function(ev){
    var r=f.getBoundingClientRect();
    dhikrFloatDrag181={id:ev.pointerId,sx:ev.clientX,sy:ev.clientY,left:r.left,top:r.top,moved:false};
    try{f.setPointerCapture(ev.pointerId)}catch(e){}
  });
  f.addEventListener('pointermove',function(ev){
    var d=dhikrFloatDrag181;if(!d||d.id!==ev.pointerId)return;
    var dx=ev.clientX-d.sx,dy=ev.clientY-d.sy;
    if(Math.abs(dx)+Math.abs(dy)>8)d.moved=true;
    if(!d.moved)return;
    ev.preventDefault();
    var p=clampDhikrFloat181(d.left+dx,d.top+dy);
    f.style.left=p.x+'px';f.style.top=p.y+'px';
  });
  f.addEventListener('pointerup',function(ev){
    var d=dhikrFloatDrag181;if(!d||d.id!==ev.pointerId)return;
    if(d.moved){
      var r=f.getBoundingClientRect();
      localStorage.setItem('no_dhikr_float_pos_181',JSON.stringify({x:Math.round(r.left),y:Math.round(r.top)}));
    }else tapDhikrFloat181();
    dhikrFloatDrag181=null;
    try{f.releasePointerCapture(ev.pointerId)}catch(e){}
  });
  f.addEventListener('pointercancel',function(){dhikrFloatDrag181=null});
}
function showDhikrFloat181(reset){
  installDhikrFloat181();
  if(reset!==false){
    dhikrState170={subhan:0,hamd:0,akbar:0};
    try{renderDhikr170()}catch(e){}
  }
  document.getElementById('dhikrFloat181').classList.add('show');
  renderDhikrFloat181();
}
function hideDhikrFloat181(){
  var f=document.getElementById('dhikrFloat181');if(f)f.classList.remove('show');
}
function tapDhikrFloat181(){
  var st=dhikrStage181(),btn=document.getElementById('dhikrFloatBtn181');if(!st)return;
  dhikrState170[st.key]=Math.min(st.max,(dhikrState170[st.key]||0)+1);
  try{if(navigator.vibrate)navigator.vibrate(22)}catch(e){}
  if(btn){btn.classList.add('tap');setTimeout(function(){btn.classList.remove('tap')},90)}
  try{renderDhikr170()}catch(e){}
  renderDhikrFloat181();
  if(!dhikrStage181()){
    if(btn)btn.classList.add('done');
    setTimeout(hideDhikrFloat181,1400);
  }
}
function renderDhikrFloat181(){
  var f=document.getElementById('dhikrFloat181');if(!f)return;
  var st=dhikrStage181(),btn=document.getElementById('dhikrFloatBtn181'),count=document.getElementById('dhikrFloatCount181'),lab=document.getElementById('dhikrFloatStage181'),target=document.getElementById('dhikrFloatTarget181');
  if(!st){
    if(count)count.textContent='✓';if(lab)lab.textContent='Complete';if(target)target.textContent='100 / 100';if(btn)btn.classList.add('done');return;
  }
  if(btn)btn.classList.remove('done');
  if(count)count.textContent=dhikrState170[st.key]||0;
  if(lab)lab.textContent=st.label;
  if(target)target.textContent='of '+st.max;
}

/* Override previous sheet launcher: only the floating circle appears. */
(function replaceDhikrSheet181(){
  installDhikrFloat181();
  window.openDhikr170=function(reset){showDhikrFloat181(reset)};
  window.closeDhikr170=function(){hideDhikrFloat181()};
  window.resetDhikr170=(function(old){
    return function(){
      dhikrState170={subhan:0,hamd:0,akbar:0};
      if(typeof old==='function'){try{old()}catch(e){}}
      renderDhikrFloat181();
    };
  })(window.resetDhikr170);
})();

function mosqueFavorites181(){
  try{return JSON.parse(localStorage.getItem('no_mosque_favorites_181')||'[]')||[]}catch(e){return[]}
}
function saveMosqueFavorites181(x){localStorage.setItem('no_mosque_favorites_181',JSON.stringify(x.slice(0,20)))}
function haversine181(a,b,c,d){
  var R=6371,toR=Math.PI/180,dp=(c-a)*toR,dl=(d-b)*toR;
  var x=Math.sin(dp/2)**2+Math.cos(a*toR)*Math.cos(c*toR)*Math.sin(dl/2)**2;
  return 2*R*Math.asin(Math.sqrt(x));
}
function installMosqueNext181(){
  var host=document.getElementById('mosque180');if(!host||document.getElementById('mosqueDiscovery181'))return;
  var x=document.createElement('div');x.id='mosqueDiscovery181';x.className='mosque-discovery181';
  x.innerHTML='<h4>Nearby Mosque & Favorite</h4><div class="meta">Live location দিয়ে কাছের mosque খুঁজুন। Favorite করলে Mosque Mode-এ name/location save হবে; Jamaat times manualভাবেই verify/set করুন।</div>'+
    '<div class="nearby-actions181"><button class="btn" onclick="findNearbyMosques181()">Find nearby mosques</button><button class="btn" onclick="renderFavorites181()">Show favorites</button></div>'+
    '<div class="nearby-list181" id="nearbyMosqueList181"></div>'+
    '<div class="mosque-extra181">'+
      '<div class="mosque-time180"><label>Eid prayer 1 <input type="time" id="eid1_181"></label></div>'+
      '<div class="mosque-time180"><label>Eid prayer 2 <input type="time" id="eid2_181"></label></div>'+
    '</div>'+
    '<label class="control-label mosque-ann181">Mosque announcement<textarea id="mosqueAnnouncement181" maxlength="280" placeholder="Jummah, Eid, Ramadan or local mosque announcement..."></textarea></label>';
  var actions=host.querySelector('.mosque-actions180');
  if(actions)host.insertBefore(x,actions);else host.appendChild(x);
  loadMosqueExtra181();
}
function loadMosqueExtra181(){
  var x=mosqueData180(),e1=document.getElementById('eid1_181'),e2=document.getElementById('eid2_181'),an=document.getElementById('mosqueAnnouncement181');
  if(e1)e1.value=x.eid1||'';if(e2)e2.value=x.eid2||'';if(an)an.value=x.announcement||'';
}
function saveMosqueExtra181(x){
  var e1=document.getElementById('eid1_181'),e2=document.getElementById('eid2_181'),an=document.getElementById('mosqueAnnouncement181');
  x.eid1=e1?e1.value||'':'';
  x.eid2=e2?e2.value||'':'';
  x.announcement=an?(an.value||'').trim().slice(0,280):'';
  return x;
}
(function extendMosqueSave181(){
  var oldSave=window.saveMosque180;
  window.saveMosque180=function(){
    var enabled=!!document.getElementById('mosqueEnabled180').checked,name=(document.getElementById('mosqueName180').value||'').trim().slice(0,70),old=mosqueData180();
    var x={enabled:enabled,name:name,times:{},lat:old.lat,lon:old.lon,favoriteId:old.favoriteId};
    PRAYERS.forEach(function(p){x.times[p.key]=document.getElementById('mosque_'+p.key+'_180').value||''});
    x.jummah1=document.getElementById('jummah1_180').value||'';x.jummah2=document.getElementById('jummah2_180').value||'';
    saveMosqueData180(saveMosqueExtra181(x));renderMosqueSummary180();decorateMosqueHome180();decorateMosqueAnnouncement181();toast('Mosque schedule saved ✓');
  };
})();

async function findNearbyMosques181(){
  var list=document.getElementById('nearbyMosqueList181');if(!list)return;
  var c=window.coords;
  if(!c||!Number.isFinite(Number(c.lat))||!Number.isFinite(Number(c.lon))){
    list.innerHTML='<div class="meta">Location পাওয়া যায়নি। আগে precise location enable করুন।</div>';
    try{detectLocation()}catch(e){};return;
  }
  list.innerHTML='<div class="meta">Nearby mosques খোঁজা হচ্ছে…</div>';
  var lat=Number(c.lat),lon=Number(c.lon);
  var q='[out:json][timeout:18];(nwr(around:5000,'+lat+','+lon+')[amenity=place_of_worship][religion=muslim];nwr(around:5000,'+lat+','+lon+')[building=mosque];);out center tags;';
  try{
    var r=await fetch('https://overpass-api.de/api/interpreter?data='+encodeURIComponent(q),{cache:'no-store'});
    if(!r.ok)throw new Error('HTTP '+r.status);
    var j=await r.json(),seen={};
    nearbyMosques181=(j.elements||[]).map(function(e){
      var la=e.lat||(e.center&&e.center.lat),lo=e.lon||(e.center&&e.center.lon),name=(e.tags&&(e.tags['name:bn']||e.tags.name||e.tags['name:en']))||'Unnamed mosque';
      if(!Number.isFinite(la)||!Number.isFinite(lo))return null;
      return {id:e.type+'_'+e.id,name:name,lat:la,lon:lo,dist:haversine181(lat,lon,la,lo)};
    }).filter(function(e){if(!e||seen[e.id])return false;seen[e.id]=1;return true}).sort(function(a,b){return a.dist-b.dist}).slice(0,10);
    renderNearbyMosques181();
  }catch(e){
    list.innerHTML='<div class="meta">Nearby mosque service এখন respond করছে না। পরে আবার চেষ্টা করুন; manual Mosque Mode কাজ করবে।</div>';
  }
}
function isFavoriteMosque181(id){return mosqueFavorites181().some(function(x){return x.id===id})}
function renderNearbyMosques181(){
  var list=document.getElementById('nearbyMosqueList181');if(!list)return;
  if(!nearbyMosques181.length){list.innerHTML='<div class="meta">5 km-এর মধ্যে mapped mosque পাওয়া যায়নি।</div>';return}
  list.innerHTML='';
  nearbyMosques181.forEach(function(m){
    var row=document.createElement('div');row.className='nearby-item181';
    var fav=isFavoriteMosque181(m.id);
    row.innerHTML='<div class="nearby-main181"><b>'+escapeHtml181(m.name)+'</b><small>'+m.dist.toFixed(1)+' km away • map data</small></div>'+
      '<button class="nearby-fav181 '+(fav?'active':'')+'" onclick="toggleMosqueFavorite181(\''+m.id+'\')">'+(fav?'★ Favorite':'☆ Favorite')+'</button>';
    list.appendChild(row);
  });
}
function escapeHtml181(s){return String(s||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function toggleMosqueFavorite181(id){
  var m=nearbyMosques181.find(function(x){return x.id===id});if(!m)return;
  var f=mosqueFavorites181(),i=f.findIndex(function(x){return x.id===id});
  if(i>=0){f.splice(i,1);saveMosqueFavorites181(f);renderNearbyMosques181();return}
  f.unshift(m);saveMosqueFavorites181(f);
  var x=mosqueData180();x.enabled=true;x.name=m.name;x.lat=m.lat;x.lon=m.lon;x.favoriteId=m.id;x.times=x.times||{};saveMosqueData180(x);
  loadMosque180();loadMosqueExtra181();renderNearbyMosques181();toast('Favorite mosque selected ✓');
}
function renderFavorites181(){
  var f=mosqueFavorites181(),list=document.getElementById('nearbyMosqueList181');if(!list)return;
  if(!f.length){list.innerHTML='<div class="meta">কোনো favorite mosque নেই।</div>';return}
  nearbyMosques181=f.slice();
  renderNearbyMosques181();
}
function decorateMosqueAnnouncement181(){
  document.querySelectorAll('.mosque-home-ann181').forEach(function(e){e.remove()});
  var x=mosqueData180();if(!x.enabled||!x.announcement)return;
  var card=document.getElementById('homeNextV14');if(!card)return;
  var a=document.createElement('div');a.className='mosque-home-ann181';a.textContent=x.announcement;card.appendChild(a);
}

(function initNextP3_181(){
  installMosqueNext181();decorateMosqueAnnouncement181();
  var oldLoad=window.loadMosque180;
  window.loadMosque180=function(){var r=oldLoad.apply(this,arguments);installMosqueNext181();loadMosqueExtra181();decorateMosqueAnnouncement181();return r};
  var oldDecorate=window.decorateMosqueHome180;
  window.decorateMosqueHome180=function(){var r=oldDecorate.apply(this,arguments);decorateMosqueAnnouncement181();return r};
  var oldShow=window.showPage;
  window.showPage=function(name){oldShow(name);if(name==='more'){installMosqueNext181();loadMosqueExtra181()}};
})();