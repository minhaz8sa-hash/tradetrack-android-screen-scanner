/* Namaz Orbit v1.5.1 — lightweight Guide + rotating Qaza orbit + nav fixes */
var GUIDE_151={
  fajr:{t:'ফজর',s:'২ রাকাত ফরজ • আগে ২ রাকাত সুন্নত',x:['কিবলামুখী দাঁড়িয়ে নিয়ত করুন।','প্রতি রাকাতে সূরা ফাতিহা ও একটি সূরা পড়ুন।','রুকু, কাওমা ও দুই সিজদা সম্পন্ন করুন।','দ্বিতীয় রাকাতে তাশাহহুদ, দরুদ ও দোয়ার পর সালাম দিন।']},
  dhuhr:{t:'যোহর',s:'৪ রাকাত ফরজ',x:['প্রথম দুই রাকাতে ফাতিহার সাথে একটি সূরা পড়ুন।','দ্বিতীয় রাকাত শেষে তাশাহহুদ পড়ে দাঁড়ান।','তৃতীয় ও চতুর্থ রাকাত সম্পন্ন করুন।','শেষ বৈঠকের পর সালাম দিন।']},
  asr:{t:'আসর',s:'৪ রাকাত ফরজ',x:['চার রাকাত ফরজ আদায় করুন।','প্রথম দুই রাকাতে ফাতিহা ও সূরা পড়ুন।','শেষ দুই রাকাত সম্পন্ন করে শেষ বৈঠকের পর সালাম দিন।']},
  maghrib:{t:'মাগরিব',s:'৩ রাকাত ফরজ',x:['প্রথম দুই রাকাতে ফাতিহা ও একটি সূরা পড়ুন।','দ্বিতীয় রাকাত শেষে তাশাহহুদ পড়ে দাঁড়ান।','তৃতীয় রাকাত সম্পন্ন করে শেষ বৈঠকের পর সালাম দিন।']},
  isha:{t:'এশা',s:'৪ রাকাত ফরজ',x:['চার রাকাত ফরজ আদায় করুন।','ফরজের পর সুন্নত ও বিতর আলাদা করে আদায় করা যায়।']},
  witr:{t:'বিতর',s:'হানাফি পদ্ধতিতে ৩ রাকাত',x:['প্রথম দুই রাকাত সাধারণভাবে পড়ুন।','তৃতীয় রাকাতে ফাতিহা ও সূরার পর অতিরিক্ত তাকবির দিন।','দোয়া কুনুত পড়ে রুকু ও সিজদা সম্পন্ন করুন।','শেষ বৈঠকের পর সালাম দিন।']},
  tahajjud:{t:'তাহাজ্জুদ',s:'২ রাকাত করে নফল',x:['এশার পর রাতের অংশে ২ রাকাত করে নফল পড়ুন।','প্রতি রাকাতে ফাতিহা ও যেকোনো সূরা পড়তে পারেন।','শেষে দোয়া ও ইস্তিগফার করুন।']},
  qadr:{t:'লাইলাতুল কদর',s:'আলাদা বাধ্যতামূলক রাকাত নির্ধারিত নয়',x:['রমজানের শেষ দশকের বিজোড় রাতগুলোতে বেশি ইবাদত করুন।','নফল/কিয়াম, কুরআন তিলাওয়াত, যিকির ও দোয়া করুন।','নির্দিষ্ট বিশেষ রাকাতকে বাধ্যতামূলক মনে করবেন না।']}
};

function installGuide151(){
  if(document.getElementById('page-guide'))return;
  var page=document.createElement('section');page.className='page';page.id='page-guide';
  page.innerHTML='<div class="panel glass"><div class="section-title" style="margin-top:0"><h3>Namaz Guide</h3><small class="muted">Lightweight • no animation</small></div><div class="guide-list-151" id="guideList151"></div><div class="guide-detail-151 glass" id="guideDetail151" style="display:none"></div><div class="guide-note-151">সংক্ষিপ্ত guideটি Bangladesh-এ প্রচলিত Hanafi practice-এর সাথে মিল রেখে সাজানো। ফিকহভেদে কিছু ছোট পার্থক্য থাকতে পারে; শুদ্ধভাবে শেখার জন্য বিশ্বস্ত শিক্ষক/আলেমের সহায়তা নিন।</div></div>';
  var more=document.getElementById('page-more');if(more)more.insertAdjacentElement('beforebegin',page);else document.querySelector('main').appendChild(page);
  var list=document.getElementById('guideList151');
  Object.keys(GUIDE_151).forEach(function(k){var g=GUIDE_151[k],b=document.createElement('button');b.className='guide-card-151';b.innerHTML='<b>'+g.t+'</b><small>'+g.s+'</small>';b.onclick=function(){openGuide151(k)};list.appendChild(b)});
}
function openGuide151(key){
  var g=GUIDE_151[key],box=document.getElementById('guideDetail151');if(!g||!box)return;
  box.innerHTML='<h3>'+g.t+'</h3><div class="muted" style="font-size:11px">'+g.s+'</div>'+g.x.map(function(x,i){return '<div class="step"><b>ধাপ '+(i+1)+'</b><br>'+x+'</div>'}).join('');
  box.style.display='block';box.scrollIntoView({behavior:'smooth',block:'nearest'});
}

function installNav151(){
  var nav=document.getElementById('nav');if(!nav)return;
  nav.innerHTML='<button class="active" data-page="home" onclick="showPage(\'home\')"><i>'+v13Svg('home')+'</i>Home</button>'+
    '<button data-page="guide" onclick="showPage(\'guide\')"><i>'+v13Svg('prayer')+'</i>Guide</button>'+
    '<button data-page="quran" onclick="showPage(\'quran\')"><i>'+v13Svg('quran')+'</i>Quran</button>'+
    '<button data-page="qaza" onclick="showPage(\'qaza\')"><i>'+v13Svg('qaza')+'</i>Qaza</button>'+
    '<button data-page="more" onclick="showPage(\'more\')"><i>'+v13Svg('more')+'</i>More</button>';
}
var qazaOrbitSig151='';
function renderQazaOrbit151(){
  var ring=document.querySelector('.orbit.two');if(!ring)return;
  var queue=typeof qazaQueue==='function'?qazaQueue():[];
  var sig=queue.slice(0,5).map(function(q){return q.dateKey+'|'+q.prayer.key}).join(',');
  if(sig===qazaOrbitSig151&&ring.dataset.qazaReady==='1')return;
  qazaOrbitSig151=sig;ring.dataset.qazaReady='1';
  ring.innerHTML='';
  if(!queue.length){
    var empty=document.createElement('div');empty.className='qaza-empty-orbit';empty.textContent='QAZA CLEAR';ring.appendChild(empty);return;
  }
  queue.slice(0,5).forEach(function(q,i){
    var el=document.createElement('button');el.className='qaza-orbit-icon qz'+(i+1);
    el.innerHTML=v13Icon(q.prayer.key);el.title=q.prayer.bn+' • Qaza • '+q.dateKey;
    el.onclick=function(ev){ev.stopPropagation();markComplete(q.dateKey,q.prayer.key,true);setTimeout(renderQazaOrbit151,40)};
    ring.appendChild(el);
  });
}
var oldUpdateOrbit151=updateOrbitV14;
updateOrbitV14=function(current){oldUpdateOrbit151(current);renderQazaOrbit151()};
v13UpdateOrbit=updateOrbitV14;

var oldShowPage151=showPage;
showPage=function(name){
  oldShowPage151(name);
  document.body.classList.toggle('home-orbit-active',name==='home');
  document.querySelectorAll('#nav button').forEach(function(b){b.classList.toggle('active',b.dataset.page===name)});
  if(name==='guide')document.getElementById('guideDetail151')?.scrollIntoView({block:'start'});
};

(function init151(){
  installGuide151();installNav151();
  var dup=document.querySelector('.test-alarm');if(dup)dup.remove();
  var small=document.querySelector('.brand small');if(small)small.textContent='Prayer • Guide • Quran • Qaza';
  document.body.classList.add('home-orbit-active');
  renderQazaOrbit151();
})();