/* Namaz Orbit v1.9.0 — Dhikr Library, Android overlay, Mosque Set, Quran Progress */
var DHIKR_DEFAULT_182=[
  {id:'subhan',bn:'সুবহানাল্লাহ',en:'SubhanAllah',target:33,on:true},
  {id:'hamd',bn:'আলহামদুলিল্লাহ',en:'Alhamdulillah',target:33,on:true},
  {id:'akbar',bn:'আল্লাহু আকবার',en:'Allahu Akbar',target:34,on:true},
  {id:'istighfar',bn:'আস্তাগফিরুল্লাহ',en:'Astaghfirullah',target:100,on:false},
  {id:'tahlil',bn:'লা ইলাহা ইল্লাল্লাহ',en:'La ilaha illallah',target:100,on:false},
  {id:'hawqala',bn:'লা হাওলা ওয়া লা কুওয়াতা ইল্লা বিল্লাহ',en:'La hawla wa la quwwata illa billah',target:100,on:false},
  {id:'tasbih_bihamdihi',bn:'সুবহানাল্লাহি ওয়া বিহামদিহি',en:'SubhanAllahi wa bihamdihi',target:100,on:false},
  {id:'salawat',bn:'আল্লাহুম্মা সাল্লি আলা মুহাম্মাদ',en:'Salawat',target:100,on:false}
];
var dhikrCounts182={};

function dhikrConfig182(){
  try{
    var x=JSON.parse(localStorage.getItem('no_dhikr_library_182')||'null');
    if(Array.isArray(x)&&x.length)return x;
  }catch(e){}
  return DHIKR_DEFAULT_182.map(function(x){return Object.assign({},x)});
}
function saveDhikrConfig182(x){localStorage.setItem('no_dhikr_library_182',JSON.stringify(x))}
function activeDhikr182(){return dhikrConfig182().filter(function(x){return x.on!==false&&Number(x.target)>0})}
function installDhikrSettings182(){
  var more=document.getElementById('page-more');if(!more)return;
  var old=document.getElementById('dhikrLauncher170');if(old)old.remove();
  if(document.getElementById('dhikrSettings182')){renderDhikrSettings182();return}
  var p=document.createElement('div');p.id='dhikrSettings182';p.className='panel glass dhikr-settings182';
  p.innerHTML='<h3>Dhikr</h3><div class="meta">Reset, select/add Dhikr, target count, in-app floating circle ও Android Home-screen circle.</div>'+
    '<div class="dhikr-library182" id="dhikrLibrary182"></div>'+
    '<div class="dhikr-custom182"><input id="dhikrCustomName182" maxlength="50" placeholder="Custom Dhikr"><input id="dhikrCustomTarget182" type="number" min="1" max="9999" value="33"><button class="btn" onclick="addCustomDhikr182()">Add</button></div>'+
    '<div class="dhikr-actions182"><button class="btn" onclick="resetDhikrSettings182()">Reset default</button><button class="btn primary" onclick="saveDhikrSettings182()">Save</button><button class="btn" onclick="openSelectedDhikr182()">Open floating circle</button><button class="btn primary" onclick="startHomeDhikr182()">Home-screen circle</button><button class="btn" onclick="stopHomeDhikr182()">Stop Home circle</button></div>'+
    '<div class="dhikr-overlay-status182" id="dhikrOverlayStatus182"></div>';
  var widget=document.getElementById('widgetCard170'),mosque=document.getElementById('mosque180');
  if(widget)widget.insertAdjacentElement('afterend',p);else if(mosque)mosque.insertAdjacentElement('beforebegin',p);else more.appendChild(p);
  renderDhikrSettings182();updateOverlayStatus182();
}
function renderDhikrSettings182(){
  var box=document.getElementById('dhikrLibrary182');if(!box)return;
  box.innerHTML='';dhikrConfig182().forEach(function(x,i){
    var row=document.createElement('div');row.className='dhikr-lib-row182';
    row.innerHTML='<input type="checkbox" data-dhikr-on="'+i+'" '+(x.on!==false?'checked':'')+'>'+
      '<div class="dhikr-lib-main182"><b>'+escapeHtml181(x.bn||x.en||'Dhikr')+'</b><small>'+escapeHtml181(x.en||'')+'</small></div>'+
      '<input class="dhikr-target182" data-dhikr-target="'+i+'" type="number" min="1" max="9999" value="'+(Number(x.target)||33)+'">';
    box.appendChild(row);
  });
}
function collectDhikr182(){
  var x=dhikrConfig182();
  document.querySelectorAll('[data-dhikr-on]').forEach(function(el){var i=Number(el.dataset.dhikrOn);if(x[i])x[i].on=!!el.checked});
  document.querySelectorAll('[data-dhikr-target]').forEach(function(el){var i=Number(el.dataset.dhikrTarget);if(x[i])x[i].target=Math.max(1,Math.min(9999,Number(el.value)||33))});
  return x;
}
function saveDhikrSettings182(){var x=collectDhikr182();saveDhikrConfig182(x);toast('Dhikr settings saved ✓');renderDhikrSettings182()}
function resetDhikrSettings182(){
  saveDhikrConfig182(DHIKR_DEFAULT_182.map(function(x){return Object.assign({},x)}));dhikrCounts182={};renderDhikrSettings182();renderDhikrFloat181();toast('Dhikr reset ✓');
}
function addCustomDhikr182(){
  var n=(document.getElementById('dhikrCustomName182').value||'').trim(),t=Math.max(1,Math.min(9999,Number(document.getElementById('dhikrCustomTarget182').value)||33));
  if(!n){toast('Dhikr name দিন');return}
  var x=collectDhikr182();x.push({id:'custom_'+Date.now(),bn:n,en:'Custom',target:t,on:true});saveDhikrConfig182(x);
  document.getElementById('dhikrCustomName182').value='';renderDhikrSettings182();toast('Dhikr added ✓');
}

function dhikrStage181(){
  var seq=activeDhikr182();
  for(var i=0;i<seq.length;i++)if((dhikrCounts182[seq[i].id]||0)<seq[i].target)return seq[i];
  return null;
}
function showDhikrFloat181(reset){
  installDhikrFloat181();if(reset!==false)dhikrCounts182={};
  var f=document.getElementById('dhikrFloat181');if(f)f.classList.add('show');renderDhikrFloat181();
}
function tapDhikrFloat181(){
  var st=dhikrStage181(),btn=document.getElementById('dhikrFloatBtn181');if(!st)return;
  dhikrCounts182[st.id]=Math.min(st.target,(dhikrCounts182[st.id]||0)+1);
  try{if(navigator.vibrate)navigator.vibrate(22)}catch(e){}
  if(btn){btn.classList.add('tap');setTimeout(function(){btn.classList.remove('tap')},90)}
  renderDhikrFloat181();
}
function renderDhikrFloat181(){
  var f=document.getElementById('dhikrFloat181');if(!f)return;
  var st=dhikrStage181(),btn=document.getElementById('dhikrFloatBtn181'),count=document.getElementById('dhikrFloatCount181'),lab=document.getElementById('dhikrFloatStage181'),target=document.getElementById('dhikrFloatTarget181');
  if(!st){if(count)count.textContent='✓';if(lab)lab.textContent='Complete';if(target)target.textContent='Tap to restart';if(btn)btn.classList.add('done');return}
  if(btn)btn.classList.remove('done');if(count)count.textContent=dhikrCounts182[st.id]||0;if(lab)lab.textContent=st.bn||st.en;if(target)target.textContent='of '+st.target;
}
function openSelectedDhikr182(){saveDhikrSettings182();showDhikrFloat181(true)}
function overlayReady182(){try{return !!(window.AndroidBridge&&window.AndroidBridge.canDrawDhikrOverlay&&window.AndroidBridge.canDrawDhikrOverlay())}catch(e){return false}}
function updateOverlayStatus182(){
  var el=document.getElementById('dhikrOverlayStatus182');if(!el)return;
  var ok=overlayReady182();el.classList.toggle('ready',ok);el.textContent=ok?'Home-screen floating permission ready.':'Home-screen circle-এর জন্য “Display over other apps” permission লাগবে.';
}
function overlaySequence182(){return activeDhikr182().map(function(x){return {label:x.bn||x.en,target:Number(x.target)||33}})}
function startHomeDhikr182(){
  saveDhikrSettings182();
  if(!window.AndroidBridge||!window.AndroidBridge.startDhikrOverlay){toast('Android APK feature');return}
  if(!overlayReady182()){
    localStorage.setItem('no_overlay_pending_182','1');
    try{window.AndroidBridge.requestDhikrOverlayPermission()}catch(e){}
    updateOverlayStatus182();return;
  }
  try{window.AndroidBridge.startDhikrOverlay(JSON.stringify(overlaySequence182()));localStorage.removeItem('no_overlay_pending_182');toast('Home-screen Dhikr circle started ✓')}catch(e){}
}
function stopHomeDhikr182(){try{window.AndroidBridge&&window.AndroidBridge.stopDhikrOverlay&&window.AndroidBridge.stopDhikrOverlay();toast('Home-screen Dhikr stopped')}catch(e){}}

/* Nearby Mosque explicit Set fix */
async function findNearbyMosques181(){
  var list=document.getElementById('nearbyMosqueList181');if(!list)return;
  var c=(typeof coords!=='undefined'?coords:null);
  if(!c||!Number.isFinite(Number(c.lat))||!Number.isFinite(Number(c.lon))){
    list.innerHTML='<div class="meta">Location পাওয়া যায়নি। আগে precise location enable করুন।</div>';try{detectLocation()}catch(e){};return;
  }
  list.innerHTML='<div class="meta">Nearby mosques খোঁজা হচ্ছে…</div>';
  var lat=Number(c.lat),lon=Number(c.lon);
  var q='[out:json][timeout:18];(nwr(around:7000,'+lat+','+lon+')[amenity=place_of_worship][religion=muslim];nwr(around:7000,'+lat+','+lon+')[building=mosque];);out center tags;';
  var endpoints=['https://overpass-api.de/api/interpreter?data=','https://overpass.kumi.systems/api/interpreter?data='];
  for(var ei=0;ei<endpoints.length;ei++){
    try{
      var r=await fetch(endpoints[ei]+encodeURIComponent(q),{cache:'no-store'});if(!r.ok)throw new Error('HTTP');
      var j=await r.json(),seen={};
      nearbyMosques181=(j.elements||[]).map(function(e){
        var la=e.lat||(e.center&&e.center.lat),lo=e.lon||(e.center&&e.center.lon),name=(e.tags&&(e.tags['name:bn']||e.tags.name||e.tags['name:en']))||'Unnamed mosque';
        if(!Number.isFinite(la)||!Number.isFinite(lo))return null;
        return {id:e.type+'_'+e.id,name:name,lat:la,lon:lo,dist:haversine181(lat,lon,la,lo)};
      }).filter(function(e){if(!e||seen[e.id])return false;seen[e.id]=1;return true}).sort(function(a,b){return a.dist-b.dist}).slice(0,12);
      renderNearbyMosques181();return;
    }catch(e){}
  }
  list.innerHTML='<div class="meta">Nearby mosque service respond করছে না। Manual Mosque Mode ব্যবহার করুন।</div>';
}
function renderNearbyMosques181(){
  var list=document.getElementById('nearbyMosqueList181');if(!list)return;
  if(!nearbyMosques181.length){list.innerHTML='<div class="meta">Nearby mapped mosque পাওয়া যায়নি।</div>';return}
  var selected=(mosqueData180().favoriteId||'');list.innerHTML='';
  nearbyMosques181.forEach(function(m){
    var row=document.createElement('div');row.className='nearby-item181';var fav=isFavoriteMosque181(m.id),sel=selected===m.id;
    row.innerHTML='<div class="nearby-main181"><b>'+escapeHtml181(m.name)+'</b><small>'+m.dist.toFixed(1)+' km away</small></div>'+
      '<div class="nearby-buttons182"><button class="nearby-set182 '+(sel?'selected':'')+'" onclick="setNearbyMosque182(\''+m.id+'\')">'+(sel?'✓ Set':'Set Mosque')+'</button>'+
      '<button class="nearby-fav181 '+(fav?'active':'')+'" onclick="toggleMosqueFavorite181(\''+m.id+'\')">'+(fav?'★':'☆')+'</button></div>';
    list.appendChild(row);
  });
}
function setNearbyMosque182(id){
  var m=nearbyMosques181.find(function(x){return x.id===id});if(!m)return;
  var x=mosqueData180();x.enabled=true;x.name=m.name;x.lat=m.lat;x.lon=m.lon;x.favoriteId=m.id;x.times={};x.jummah1='';x.jummah2='';x.eid1='';x.eid2='';x.announcement='';
  saveMosqueData180(x);loadMosque180();loadMosqueExtra181();renderNearbyMosques181();decorateMosqueHome180();toast('Mosque selected ✓ — এখন Jamaat time set করুন');
}
function toggleMosqueFavorite181(id){
  var m=nearbyMosques181.find(function(x){return x.id===id});if(!m)return;
  var f=mosqueFavorites181(),i=f.findIndex(function(x){return x.id===id});
  if(i>=0)f.splice(i,1);else f.unshift(m);saveMosqueFavorites181(f);renderNearbyMosques181();
}

/* Quran Progress foundation */
function quranState182(){
  var today=dateKey(locationNow()),x={};
  try{x=JSON.parse(localStorage.getItem('no_quran_progress_182')||'{}')||{}}catch(e){}
  x.goal=Math.max(1,Number(x.goal)||10);x.bookmarks=Array.isArray(x.bookmarks)?x.bookmarks:[];x.last=x.last||null;
  if(x.day!==today){x.day=today;x.read=[]}x.read=Array.isArray(x.read)?x.read:[];return x;
}
function saveQuranState182(x){localStorage.setItem('no_quran_progress_182',JSON.stringify(x))}
function installQuranProgress182(){
  var page=document.getElementById('page-quran'),browser=document.getElementById('surahBrowser');if(!page||!browser||document.getElementById('quranProgress182'))return;
  var p=document.createElement('div');p.id='quranProgress182';p.className='panel glass quran-progress182';
  p.innerHTML='<div class="quran-progress-head182"><div><h3>Quran Progress</h3><small>Daily goal • Last Read • Bookmarks</small></div></div>'+
    '<div class="quran-goal182"><span class="meta">Daily ayah goal</span><input id="quranGoal182" type="number" min="1" max="300" onchange="saveQuranGoal182()"></div>'+
    '<div class="quran-progressbar182"><span id="quranBar182"></span></div>'+
    '<div class="quran-stats182"><div class="quran-stat182"><b id="quranRead182">0</b><span>Read today</span></div><div class="quran-stat182"><b id="quranGoalStat182">10</b><span>Goal</span></div><div class="quran-stat182"><b id="quranBookmarks182">0</b><span>Bookmarks</span></div></div>'+
    '<div class="quran-actions182"><button class="btn" id="quranContinue182" onclick="continueQuran182()">Continue</button><button class="btn" onclick="showQuranBookmarks182()">Bookmarks</button></div>'+
    '<div class="meta" id="quranLast182" style="margin-top:8px">No Last Read yet.</div>';
  browser.parentNode.insertBefore(p,browser);renderQuranProgress182();
}
function renderQuranProgress182(){
  var x=quranState182();saveQuranState182(x);
  var g=document.getElementById('quranGoal182'),r=document.getElementById('quranRead182'),gs=document.getElementById('quranGoalStat182'),b=document.getElementById('quranBookmarks182'),bar=document.getElementById('quranBar182'),last=document.getElementById('quranLast182'),cont=document.getElementById('quranContinue182');
  if(g)g.value=x.goal;if(r)r.textContent=x.read.length;if(gs)gs.textContent=x.goal;if(b)b.textContent=x.bookmarks.length;if(bar)bar.style.width=Math.min(100,x.read.length/x.goal*100)+'%';
  if(last)last.textContent=x.last?('Last Read: '+x.last.title+' • Ayah '+x.last.ayah):'No Last Read yet.';if(cont)cont.disabled=!x.last;
}
function saveQuranGoal182(){var x=quranState182();x.goal=Math.max(1,Math.min(300,Number(document.getElementById('quranGoal182').value)||10));saveQuranState182(x);renderQuranProgress182()}
function markQuranRead182(n,a,title){
  var x=quranState182(),k=n+':'+a;if(x.read.indexOf(k)<0)x.read.push(k);x.last={surah:n,ayah:a,title:title};saveQuranState182(x);renderQuranProgress182();
  var btn=document.querySelector('[data-read182="'+k+'"]');if(btn){btn.classList.add('active');btn.textContent='Read ✓'}
}
function toggleQuranBookmark182(n,a,title){
  var x=quranState182(),k=n+':'+a,i=x.bookmarks.findIndex(function(z){return z.key===k});
  if(i>=0)x.bookmarks.splice(i,1);else x.bookmarks.push({key:k,surah:n,ayah:a,title:title});saveQuranState182(x);renderQuranProgress182();
  var btn=document.querySelector('[data-book182="'+k+'"]');if(btn){btn.classList.toggle('active',i<0);btn.textContent=i<0?'★ Bookmarked':'☆ Bookmark'}
}
async function openSurah(n){
  document.getElementById('surahBrowser').style.display='none';document.getElementById('surahReader').style.display='block';document.getElementById('surahTitle').textContent='Loading…';document.getElementById('ayahList').innerHTML='<div class="notice">Quran text loading…</div>';
  try{
    var s=await fetchSurah(n),x=quranState182();document.getElementById('surahTitle').textContent=s.number+'. '+s.name+' • '+s.arabicName;
    document.getElementById('ayahList').innerHTML=s.ayahs.map(function(a){
      var k=s.number+':'+a.number,read=x.read.indexOf(k)>=0,book=x.bookmarks.some(function(z){return z.key===k});
      return '<article class="ayah" id="ayah182_'+a.number+'"><div class="ayah-no">AYAH '+a.number+'</div><div class="arabic">'+escapeHtml(a.ar)+'</div><div class="bangla">'+escapeHtml(a.bn)+'</div>'+
        '<div class="ayah-tools182"><button class="ayah-tool182 '+(read?'active':'')+'" data-read182="'+k+'" onclick="markQuranRead182('+s.number+','+a.number+',\''+String(s.name).replace(/'/g,"\\'")+'\')">'+(read?'Read ✓':'Mark Read')+'</button>'+
        '<button class="ayah-tool182 '+(book?'active':'')+'" data-book182="'+k+'" onclick="toggleQuranBookmark182('+s.number+','+a.number+',\''+String(s.name).replace(/'/g,"\\'")+'\')">'+(book?'★ Bookmarked':'☆ Bookmark')+'</button></div></article>';
    }).join('');
  }catch(e){document.getElementById('ayahList').innerHTML='<div class="notice">Quran data could not load. Check internet and try again. Previously downloaded Surahs remain available offline.</div>'}
}
async function continueQuran182(){var x=quranState182();if(!x.last)return;await openSurah(x.last.surah);setTimeout(function(){document.getElementById('ayah182_'+x.last.ayah)?.scrollIntoView({behavior:'smooth',block:'center'})},80)}
function showQuranBookmarks182(){
  var x=quranState182();if(!x.bookmarks.length){toast('No bookmarks yet');return}
  document.getElementById('surahBrowser').style.display='none';document.getElementById('surahReader').style.display='block';document.getElementById('surahTitle').textContent='Bookmarks';
  document.getElementById('ayahList').innerHTML=x.bookmarks.map(function(z){return '<button class="surah" onclick="openSurah('+z.surah+').then(function(){setTimeout(function(){document.getElementById(\'ayah182_'+z.ayah+'\')?.scrollIntoView({behavior:\'smooth\',block:\'center\'})},80)})"><b>'+escapeHtml(z.title)+' • Ayah '+z.ayah+'</b><small>Open bookmark</small></button>'}).join('');
}

(function init182(){
  installDhikrSettings182();installQuranProgress182();
  var oldShow=window.showPage;window.showPage=function(name){oldShow(name);if(name==='more'){installDhikrSettings182();updateOverlayStatus182()}if(name==='quran'){installQuranProgress182();renderQuranProgress182()}};
  setInterval(function(){
    if(localStorage.getItem('no_overlay_pending_182')==='1'&&overlayReady182())startHomeDhikr182();
    updateOverlayStatus182();
  },1200);
})();