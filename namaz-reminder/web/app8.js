/* Namaz Orbit v1.3.0 — animated Namaz Guide and Bangla pronunciation */
var GUIDE_DATA_V13={
  fajr:{title:'ফজর',sub:'২ রাকাত ফরজ • আগে ২ রাকাত সুন্নত',steps:['নিয়ত করে কিবলামুখী দাঁড়ান।','প্রতি রাকাতে সূরা ফাতিহা এবং একটি সূরা পড়ুন।','রুকু, সোজা দাঁড়ানো, তারপর দুই সিজদা করুন।','২য় রাকাতে তাশাহহুদ, দরুদ ও দোয়ার পর সালাম দিন।']},
  dhuhr:{title:'যোহর',sub:'৪ রাকাত ফরজ',steps:['প্রথম ২ রাকাতে ফাতিহার সাথে একটি সূরা পড়ুন।','২য় রাকাত শেষে তাশাহহুদ পড়ে দাঁড়ান।','৩য় ও ৪র্থ রাকাতে ফাতিহা পড়ুন।','শেষ বৈঠকে তাশাহহুদ, দরুদ, দোয়া ও সালাম।']},
  asr:{title:'আসর',sub:'৪ রাকাত ফরজ',steps:['৪ রাকাত ফরজ যোহরের ফরজের মতো।','প্রথম ২ রাকাতে ফাতিহা ও সূরা, পরের ২ রাকাতে ফাতিহা।','শেষ বৈঠকের পর সালাম দিন।']},
  maghrib:{title:'মাগরিব',sub:'৩ রাকাত ফরজ',steps:['প্রথম ২ রাকাতে ফাতিহা ও একটি সূরা পড়ুন।','২য় রাকাত শেষে তাশাহহুদ পড়ে দাঁড়ান।','৩য় রাকাতে ফাতিহা পড়ে রুকু ও সিজদা করুন।','শেষ বৈঠক শেষে সালাম দিন।']},
  isha:{title:'এশা',sub:'৪ রাকাত ফরজ',steps:['৪ রাকাত ফরজ যোহর বা আসরের মতো পড়ুন।','এশার পর সুন্নত এবং বিতর আলাদা করে আদায় করা যায়।']},
  witr:{title:'বিতর নামাজ',sub:'হানাফি পদ্ধতিতে ৩ রাকাত',steps:['প্রথম ২ রাকাত সাধারণভাবে পড়ুন।','৩য় রাকাতে ফাতিহা ও সূরা পড়ে অতিরিক্ত তাকবির দিয়ে হাত বাঁধুন।','দোয়া কুনুত পড়ুন, তারপর রুকু ও সিজদা করুন।','শেষ বৈঠক শেষে সালাম দিন।'],special:'qunut'},
  tahajjud:{title:'তাহাজ্জুদ',sub:'২ রাকাত করে নফল',steps:['এশার পর ঘুমিয়ে রাতের শেষভাগে উঠলে উত্তম।','২ রাকাত করে যতটুকু সম্ভব পড়ুন।','প্রতি রাকাতে ফাতিহা এবং যেকোনো সূরা পড়ুন।','নামাজের পর দোয়া ও ইস্তিগফার করুন।']},
  qadr:{title:'লাইলাতুল কদর',sub:'নির্দিষ্ট আলাদা নামাজ নেই',steps:['রমজানের শেষ দশকের বিজোড় রাতগুলোতে বেশি ইবাদত করুন।','২ রাকাত করে নফল বা কিয়াম পড়তে পারেন।','কুরআন তিলাওয়াত, যিকির ও দোয়া করুন।','নির্দিষ্ট বিশেষ রাকাতকে বাধ্যতামূলক মনে করবেন না।'],special:'qadr'}
};

function guideIconV13(){
  return '<svg viewBox="0 0 32 32"><circle cx="21" cy="7" r="3"/><path d="M18 10c-4 2-6 5-7 9M11 19l-6 3M11 19l6 3M17 22h9M5 22H2M8 26h18"/></svg>';
}
function installGuideV13(){
  var old=document.getElementById('guideGrid');if(old&&old.parentElement)old.parentElement.style.display='none';
  var more=document.getElementById('page-more');
  if(more&&!document.getElementById('guideLaunchV13')){
    var p=document.createElement('div');p.id='guideLaunchV13';p.className='panel glass';
    p.innerHTML='<button class="guide-launch" onclick="openGuidePageV13()"><div class="gicon">'+guideIconV13()+'</div><div style="flex:1"><b>Namaz Guide</b><div class="meta">Animation demo • ফরজ • বিতর • তাহাজ্জুদ • লাইলাতুল কদর</div></div><span>›</span></button>';
    more.insertBefore(p,more.firstChild);
  }
  if(!document.getElementById('page-guide-v13')){
    var page=document.createElement('section');page.className='page';page.id='page-guide-v13';
    page.innerHTML='<div class="panel glass"><div class="section-title" style="margin:0"><h3>Namaz Guide</h3><button onclick="showPage(\'more\')">← More</button></div><div class="demo-stage"><div class="demo-mat"></div><div class="salah-person" id="salahPersonV13"><div class="head"></div><div class="body"></div><div class="arm a1"></div><div class="arm a2"></div><div class="leg l1"></div><div class="leg l2"></div></div></div><div class="demo-caption" id="demoCaptionV13">কিয়াম • দাঁড়ানো</div><div class="guide-warning">Animationটি posture বোঝানোর visual aid। শুদ্ধ পদ্ধতি শেখার জন্য বিশ্বস্ত শিক্ষক বা আলেমের কাছ থেকে শেখা উত্তম।</div></div><div class="section-title"><h3>কোন নামাজ শিখবেন?</h3></div><div class="guide-list-v13" id="guideListV13"></div><div class="panel glass" id="guideDetailV13" style="display:none"></div>';
    document.querySelector('main').appendChild(page);
  }
  renderGuideCardsV13();
}
function renderGuideCardsV13(){
  var box=document.getElementById('guideListV13');if(!box)return;box.innerHTML='';
  Object.keys(GUIDE_DATA_V13).forEach(function(k){
    var g=GUIDE_DATA_V13[k],b=document.createElement('button');b.className='guide-card-v13';
    b.innerHTML='<b>'+g.title+'</b><small>'+g.sub+'</small>';b.onclick=function(){showGuideDetailV13(k)};box.appendChild(b);
  });
}
function commonRecitationV13(){
  return '<div class="recite-box"><div class="ar">اللّٰهُ أَكْبَرُ</div><div class="pron">আল্লাহু আকবার</div><div class="meaning">অর্থ: আল্লাহ সর্বশ্রেষ্ঠ।</div></div>'+
  '<div class="recite-box"><div class="ar">الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ ۝ الرَّحْمَٰنِ الرَّحِيمِ ۝ مَالِكِ يَوْمِ الدِّينِ ۝ إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ ۝ اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ ۝ صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ</div><div class="pron">আলহামদু লিল্লাহি রব্বিল আলামীন। আর-রহমানির রহীম। মালিকি ইয়াওমিদ্দীন। ইয়্যাকা নাবুদু ওয়া ইয়্যাকা নাস্তাঈন। ইহদিনাস সিরাতাল মুস্তাকীম। সিরাতাল্লাযীনা আনআমতা আলাইহিম, গাইরিল মাগদূবি আলাইহিম ওয়ালাদ্দল্লীন।</div><div class="meaning">সূরা ফাতিহা — বাংলা উচ্চারণটি reading aid।</div></div>'+
  '<div class="recite-box"><div class="ar">قُلْ هُوَ اللَّهُ أَحَدٌ ۝ اللَّهُ الصَّمَدُ ۝ لَمْ يَلِدْ وَلَمْ يُولَدْ ۝ وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ</div><div class="pron">কুল হুয়াল্লাহু আহাদ। আল্লাহুস সামাদ। লাম ইয়ালিদ ওয়া লাম ইউলাদ। ওয়া লাম ইয়াকুন লাহু কুফুওয়ান আহাদ।</div><div class="meaning">সূরা ইখলাস — উদাহরণ। নামাজে অন্য সূরাও পড়া যায়।</div></div>';
}
function specialRecitationV13(type){
  if(type==='qunut')return '<div class="guide-section"><h4>দোয়া কুনুত</h4><div class="recite-box"><div class="ar">اللَّهُمَّ إِنَّا نَسْتَعِينُكَ وَنَسْتَغْفِرُكَ وَنُؤْمِنُ بِكَ وَنَتَوَكَّلُ عَلَيْكَ</div><div class="pron">আল্লাহুম্মা ইন্না নাস্তাঈনুকা ওয়া নাস্তাগফিরুকা, ওয়া নুমিনু বিকা ওয়া নাতাওয়াক্কালু আলাইকা।</div><div class="meaning">দোয়া কুনুতের শুরু। পূর্ণ দোয়া মুখস্থ করতে guide/শিক্ষকের সহায়তা নিন।</div></div></div>';
  if(type==='qadr')return '<div class="guide-section"><h4>লাইলাতুল কদরের দোয়া</h4><div class="recite-box"><div class="ar">اللَّهُمَّ إِنَّكَ عَفُوٌّ تُحِبُّ الْعَفْوَ فَاعْفُ عَنِّي</div><div class="pron">আল্লাহুম্মা ইন্নাকা আফুউন তুহিব্বুল আফওয়া ফাফু আন্নী।</div><div class="meaning">হে আল্লাহ, আপনি ক্ষমাশীল, ক্ষমা করতে ভালোবাসেন; তাই আমাকে ক্ষমা করুন।</div></div></div>';
  return '';
}
function showGuideDetailV13(key){
  var g=GUIDE_DATA_V13[key],box=document.getElementById('guideDetailV13');if(!g||!box)return;
  var html='<div class="section-title" style="margin:0"><h3>'+g.title+'</h3><button onclick="document.getElementById(\'guideDetailV13\').style.display=\'none\'">✕</button></div><div class="notice">'+g.sub+'</div>';
  g.steps.forEach(function(step,i){html+='<div class="guide-section"><h4>ধাপ '+(i+1)+'</h4><p>'+step+'</p></div>'});
  html+='<div class="guide-section"><h4>পড়ার উদাহরণ</h4>'+commonRecitationV13()+'</div>'+specialRecitationV13(g.special)+'<div class="guide-warning">ফিকহ বা মাযহাবভেদে কিছু ছোট পার্থক্য থাকতে পারে। এখানে Bangladesh-এ প্রচলিত Hanafi practice অনুযায়ী সংক্ষিপ্ত guide দেওয়া হয়েছে।</div>';
  box.innerHTML=html;box.style.display='block';box.scrollIntoView({behavior:'smooth',block:'start'});
}
function openGuidePageV13(){showPage('guide-v13');document.querySelectorAll('#nav button').forEach(function(x){x.classList.remove('active')})}

var demoStepsV13=[['','কিয়াম • দাঁড়ানো'],['ruku','রুকু'],['','কাওমা • সোজা দাঁড়ানো'],['sujood','সিজদা'],['sitting','জলসা • বসা'],['sujood','দ্বিতীয় সিজদা']];
var demoIndexV13=0;
function tickGuideDemoV13(){
  var page=document.getElementById('page-guide-v13');if(!page||!page.classList.contains('active')||document.hidden)return;
  var p=document.getElementById('salahPersonV13'),c=document.getElementById('demoCaptionV13');if(!p||!c)return;
  var x=demoStepsV13[demoIndexV13%demoStepsV13.length];p.className='salah-person '+x[0];c.textContent=x[1];demoIndexV13++;
}

function banglaAidV13(latin){
  if(!latin)return '';
  if(typeof latinToBanglaQuran==='function')return latinToBanglaQuran(latin);
  return latin;
}
fetchSurah=async function(n){
  var cached=await dbGet(n);if(cached&&cached.v13Pron)return cached;
  try{
    var r=await fetch('https://cdn.jsdelivr.net/npm/quran-json@3.1.2/dist/chapters/bn/'+n+'.json');if(!r.ok)throw new Error('cdn');
    var j=await r.json(),verses=j.verses||j.ayahs||[];
    var v={number:n,name:j.transliteration||j.name||('Surah '+n),arabicName:j.name||'',v13Pron:true,ayahs:verses.map(function(a,i){
      var tr=a.transliteration||'';return {number:a.id||a.number||a.numberInSurah||i+1,ar:a.text||a.arabic||'',bn:a.translation||a.bn||'',tr:tr,pronBn:banglaAidV13(tr)};
    })};await dbPut(v);return v;
  }catch(err){
    var u='https://api.alquran.cloud/v1/surah/'+n+'/editions/quran-uthmani,bn.bengali',rr=await fetch(u),jj=await rr.json(),ar=jj.data&&jj.data[0],bn=jj.data&&jj.data[1];
    return {number:n,name:ar.englishName,arabicName:ar.name,v13Pron:true,ayahs:ar.ayahs.map(function(a,i){return {number:a.numberInSurah,ar:a.text,bn:bn.ayahs[i]?bn.ayahs[i].text:'',tr:'',pronBn:''}})};
  }
};
openSurah=async function(n){
  document.getElementById('surahBrowser').style.display='none';document.getElementById('surahReader').style.display='block';
  document.getElementById('surahTitle').textContent='Loading…';document.getElementById('ayahList').innerHTML='<div class="notice">Arabic + বাংলা উচ্চারণ + অর্থ loading…</div>';
  try{
    var s=await fetchSurah(n);document.getElementById('surahTitle').textContent=s.number+'. '+s.name+' • '+s.arabicName;
    document.getElementById('ayahList').innerHTML=s.ayahs.map(function(a){
      return '<article class="ayah"><div class="ayah-no">AYAH '+a.number+'</div><div class="arabic">'+escapeHtml(a.ar)+'</div>'+(a.pronBn?'<div class="pronunciation">'+escapeHtml(a.pronBn)+'</div>':'<div class="pronunciation">বাংলা উচ্চারণ data পাওয়া যায়নি — Arabic audio বা শিক্ষকের সহায়তা নিন।</div>')+'<div class="bangla">'+escapeHtml(a.bn)+'</div></article>';
    }).join('')+'<div class="notice">বাংলা উচ্চারণ একটি reading aid; এটি আরবি মাখরাজ বা তাজবীদের বিকল্প নয়।</div>';
  }catch(e){document.getElementById('ayahList').innerHTML='<div class="notice">Quran data load করা যায়নি। Internet check করে আবার চেষ্টা করুন।</div>'}
};

(function initGuideV13(){installGuideV13();tickGuideDemoV13();setInterval(tickGuideDemoV13,2400)})();