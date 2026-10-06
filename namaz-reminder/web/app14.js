/* Namaz Orbit v1.6.1 — rigid ring tracks + classic Guide */
(function(){
  var portal=null,outer=null,inner=null,outerNodes=[],qazaNodes=[],qazaSig='',stateSig='';
  function makeEl(tag,cls){var e=document.createElement(tag);if(cls)e.className=cls;return e}

  function ensureTracks161(){
    var orbits=document.querySelector('#page-home .orbits');if(!orbits)return;
    if(!portal){
      portal=makeEl('div');portal.id='orbitTrackPortal161';
      outer=makeEl('div','orbit-track161 outer');
      inner=makeEl('div','orbit-track161 inner');
      portal.appendChild(outer);portal.appendChild(inner);orbits.appendChild(portal);
      buildOuter161();
      if(window.ResizeObserver){
        var ro=new ResizeObserver(function(){measureTracks161()});
        ro.observe(orbits);
        var o1=orbits.querySelector('.orbit.one'),o2=orbits.querySelector('.orbit.two');
        if(o1)ro.observe(o1);if(o2)ro.observe(o2);
      }
      window.addEventListener('resize',measureTracks161,{passive:true});
    }
    measureTracks161();syncOuter161();syncQazaTrack161(true);
  }

  function setTrackBox161(track,ring,hostRect){
    var r=ring.getBoundingClientRect();
    track.style.left=(r.left-hostRect.left)+'px';
    track.style.top=(r.top-hostRect.top)+'px';
    track.style.width=r.width+'px';
    track.style.height=r.height+'px';
  }

  function positionNodes161(track,nodes){
    var w=track.clientWidth,h=track.clientHeight;if(!w||!h||!nodes.length)return;
    var cx=w/2,cy=h/2,rad=Math.max(0,Math.min(w,h)/2-1),n=nodes.length;
    nodes.forEach(function(node,i){
      var a=-Math.PI/2+(Math.PI*2*i/n);
      node.style.left=(cx+Math.cos(a)*rad)+'px';
      node.style.top=(cy+Math.sin(a)*rad)+'px';
    });
  }

  function measureTracks161(){
    if(!portal)return;
    var host=portal.parentNode,o1=host.querySelector('.orbit.one'),o2=host.querySelector('.orbit.two');
    if(!o1||!o2)return;
    var hr=host.getBoundingClientRect();
    setTrackBox161(outer,o1,hr);setTrackBox161(inner,o2,hr);
    positionNodes161(outer,outerNodes);positionNodes161(inner,qazaNodes);
  }

  function buildOuter161(){
    outer.innerHTML='';outerNodes=[];
    PRAYERS.forEach(function(p){
      var node=makeEl('div','orbit-node161');
      var b=makeEl('button','orbit-btn161');
      b.type='button';b.innerHTML=v13Icon(p.key);b.dataset.prayer=p.key;
      b.setAttribute('aria-label',p.bn+' '+p.name);
      b.onclick=function(ev){ev.stopPropagation();v14PrayerIconTap(p.key)};
      node.appendChild(b);outer.appendChild(node);outerNodes.push(node);
    });
    positionNodes161(outer,outerNodes);
  }

  function syncOuter161(){
    var ctx=prayerCycleContext(),st=getDayState(ctx.key),current=v13CurrentPrayer(ctx);
    var sig=ctx.key+'|'+current+'|'+PRAYERS.map(function(p){return st[p.key]||'pending'}).join(',');
    if(sig===stateSig)return;stateSig=sig;
    outerNodes.forEach(function(node,i){
      var p=PRAYERS[i],v=st[p.key]||'pending',b=node.firstChild;
      node.style.display=v==='qaza'?'none':'block';
      b.classList.toggle('active-prayer',p.key===current);
      b.title=p.bn+' • '+p.name;
    });
  }

  function syncQazaTrack161(force){
    if(!inner)return;
    var q=typeof qazaQueue==='function'?qazaQueue():[];
    var sig=q.map(function(x){return x.dateKey+'|'+x.prayer.key}).join(',');
    if(!force&&sig===qazaSig)return;qazaSig=sig;
    inner.innerHTML='';qazaNodes=[];
    inner.classList.toggle('dense',q.length>10);
    inner.classList.toggle('very-dense',q.length>18);
    inner.classList.toggle('ultra-dense',q.length>28);
    q.forEach(function(item){
      var node=makeEl('div','orbit-node161');
      var b=makeEl('button','orbit-btn161 qaza');
      b.type='button';b.innerHTML=v13Icon(item.prayer.key);
      b.title=item.prayer.bn+' • Qaza • '+item.dateKey;
      b.setAttribute('aria-label',item.prayer.bn+' Qaza '+item.dateKey);
      b.onclick=function(ev){ev.stopPropagation();markComplete(item.dateKey,item.prayer.key,true);setTimeout(function(){syncQazaTrack161(true);syncOuter161()},80)};
      node.appendChild(b);inner.appendChild(node);qazaNodes.push(node);
    });
    positionNodes161(inner,qazaNodes);
  }

  var READ161={
    takbir:{t:'তাকবির',tag:'নামাজ শুরু ও অবস্থান পরিবর্তন',a:'اللّٰهُ أَكْبَرُ',b:'আল্লাহু আকবার'},
    sana:{t:'সানা',tag:'প্রথম রাকাতের শুরুতে',a:'سُبْحَانَكَ اللّٰهُمَّ وَبِحَمْدِكَ وَتَبَارَكَ اسْمُكَ وَتَعَالَىٰ جَدُّكَ وَلَا إِلٰهَ غَيْرُكَ',b:'সুবহানাকাল্লাহুম্মা ওয়া বিহামদিকা, ওয়া তাবারাকাসমুকা, ওয়া তা’আলা জাদ্দুকা, ওয়া লা ইলাহা গাইরুক।'},
    fatiha:{t:'সূরা আল-ফাতিহা',tag:'প্রতি রাকাতে',a:'الْحَمْدُ لِلّٰهِ رَبِّ الْعَالَمِينَ ۝ الرَّحْمٰنِ الرَّحِيمِ ۝ مَالِكِ يَوْمِ الدِّينِ ۝ إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ ۝ اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ ۝ صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ',b:'আলহামদু লিল্লাহি রব্বিল ‘আলামীন। আর-রহমানির রাহীম। মালিকি ইয়াওমিদ্দীন। ইয়্যাকা না’বুদু ওয়া ইয়্যাকা নাসতা’ঈন। ইহদিনাস সিরাতাল মুস্তাকীম। সিরাতাল্লাযীনা আন‘আমতা ‘আলাইহিম, গাইরিল মাগদূবি ‘আলাইহিম ওয়ালাদ্দল্লীন।'},
    ikhlas:{t:'সূরা আল-ইখলাস',tag:'অতিরিক্ত সূরার উদাহরণ',a:'قُلْ هُوَ اللّٰهُ أَحَدٌ ۝ اللّٰهُ الصَّمَدُ ۝ لَمْ يَلِدْ وَلَمْ يُولَدْ ۝ وَلَمْ يَكُنْ لَهُ كُفُوًا أَحَدٌ',b:'কুল হুওয়াল্লাহু আহাদ। আল্লাহুস সামাদ। লাম ইয়ালিদ ওয়া লাম ইউলাদ। ওয়া লাম ইয়াকুল্লাহু কুফুওয়ান আহাদ।'},
    kafirun:{t:'সূরা আল-কাফিরুন',tag:'ফজর সুন্নত/বিতরে প্রস্তাবিত',a:'قُلْ يَا أَيُّهَا الْكَافِرُونَ ۝ لَا أَعْبُدُ مَا تَعْبُدُونَ ۝ وَلَا أَنْتُمْ عَابِدُونَ مَا أَعْبُدُ ۝ وَلَا أَنَا عَابِدٌ مَا عَبَدْتُمْ ۝ وَلَا أَنْتُمْ عَابِدُونَ مَا أَعْبُدُ ۝ لَكُمْ دِينُكُمْ وَلِيَ دِينِ',b:'কুল ইয়া আইয়ুহাল কাফিরুন। লা আ’বুদু মা তা’বুদুন। ওয়া লা আনতুম ‘আবিদুনা মা আ’বুদ। ওয়া লা আনা ‘আবিদুম মা ‘আবাদতুম। ওয়া লা আনতুম ‘আবিদুনা মা আ’বুদ। লাকুম দ্বীনুকুম ওয়া লিয়া দ্বীন।'},
    ala:{t:'সূরা আল-আ’লা',tag:'বিতরের ১ম রাকাতে প্রস্তাবিত',a:'سَبِّحِ اسْمَ رَبِّكَ الْأَعْلَى ۝ الَّذِي خَلَقَ فَسَوَّى ۝ وَالَّذِي قَدَّرَ فَهَدَى ۝ وَالَّذِي أَخْرَجَ الْمَرْعَى ۝ فَجَعَلَهُ غُثَاءً أَحْوَى ۝ سَنُقْرِئُكَ فَلَا تَنْسَى ۝ إِلَّا مَا شَاءَ اللّٰهُ إِنَّهُ يَعْلَمُ الْجَهْرَ وَمَا يَخْفَى ۝ وَنُيَسِّرُكَ لِلْيُسْرَى ۝ فَذَكِّرْ إِنْ نَفَعَتِ الذِّكْرَى ۝ سَيَذَّكَّرُ مَنْ يَخْشَى ۝ وَيَتَجَنَّبُهَا الْأَشْقَى ۝ الَّذِي يَصْلَى النَّارَ الْكُبْرَى ۝ ثُمَّ لَا يَمُوتُ فِيهَا وَلَا يَحْيَى ۝ قَدْ أَفْلَحَ مَنْ تَزَكَّى ۝ وَذَكَرَ اسْمَ رَبِّهِ فَصَلَّى ۝ بَلْ تُؤْثِرُونَ الْحَيَاةَ الدُّنْيَا ۝ وَالْآخِرَةُ خَيْرٌ وَأَبْقَى ۝ إِنَّ هَذَا لَفِي الصُّحُفِ الْأُولَى ۝ صُحُفِ إِبْرَاهِيمَ وَمُوسَى',b:'সাব্বিহিসমা রব্বিকাল আ’লা। আল্লাযী খালাকা ফাসাওওয়া। ওয়াল্লাযী কাদ্দারা ফাহাদা। ওয়াল্লাযী আখরাজাল মার‘আ। ফাজা‘আলাহু গুসাআন আহওয়া। সানুকরিউকা ফালা তানসা। ইল্লা মা শা-আল্লাহ; ইন্নাহু ইয়া’লামুল জাহরা ওয়া মা ইয়াখফা। ওয়া নুয়াসসিরুকা লিলইউসরা। ফাযাক্কির ইন নাফা‘আতিয যিকরা। সাইয়াযযাক্কারু মাইঁ ইয়াখশা। ওয়া ইয়াতাজান্নাবুহাল আশকা। আল্লাযী ইয়াসলান নারাল কুবরা। সুম্মা লা ইয়ামুতু ফীহা ওয়া লা ইয়াহইয়া। কাদ আফলাহা মান তাযাক্কা। ওয়া যাকারাসমা রব্বিহি ফাসাল্লা। বাল তু’সিরুনাল হায়াতাদ দুনইয়া। ওয়াল আখিরাতু খাইরুওঁ ওয়া আবকা। ইন্না হাযা লাফিস সুহুফিল উলা। সুহুফি ইবরাহীমা ওয়া মুসা।'},
    ruku:{t:'রুকুর তাসবিহ',tag:'রুকুতে',a:'سُبْحَانَ رَبِّيَ الْعَظِيمِ',b:'সুবহানা রব্বিয়াল আযীম।'},
    qawma:{t:'রুকু থেকে ওঠার দোয়া',tag:'কাওমায়',a:'سَمِعَ اللّٰهُ لِمَنْ حَمِدَهُ ۝ رَبَّنَا لَكَ الْحَمْدُ',b:'সামি‘আল্লাহু লিমান হামিদাহ। রব্বানা লাকাল হামদ।'},
    sajdah:{t:'সিজদার তাসবিহ',tag:'সিজদায়',a:'سُبْحَانَ رَبِّيَ الْأَعْلَى',b:'সুবহানা রব্বিয়াল আ’লা।'},
    tashahhud:{t:'আত্তাহিয়্যাতু',tag:'বৈঠকে',a:'التَّحِيَّاتُ لِلّٰهِ وَالصَّلَوَاتُ وَالطَّيِّبَاتُ، السَّلَامُ عَلَيْكَ أَيُّهَا النَّبِيُّ وَرَحْمَةُ اللّٰهِ وَبَرَكَاتُهُ، السَّلَامُ عَلَيْنَا وَعَلَىٰ عِبَادِ اللّٰهِ الصَّالِحِينَ، أَشْهَدُ أَنْ لَا إِلٰهَ إِلَّا اللّٰهُ وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ',b:'আত্তাহিয়্যাতু লিল্লাহি ওয়াস সালাওয়াতু ওয়াত তায়্যিবাত। আসসালামু ‘আলাইকা আইয়ুহান নবিয়্যু ওয়া রহমাতুল্লাহি ওয়া বারাকাতুহ। আসসালামু ‘আলাইনা ওয়া ‘আলা ‘ইবাদিল্লাহিস সালিহীন। আশহাদু আল্লা ইলাহা ইল্লাল্লাহ, ওয়া আশহাদু আন্না মুহাম্মাদান ‘আবদুহু ওয়া রাসুলুহ।'},
    durood:{t:'দরুদে ইবরাহিম',tag:'শেষ বৈঠকে',a:'اللّٰهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ وَعَلَىٰ آلِ مُحَمَّدٍ كَمَا صَلَّيْتَ عَلَىٰ إِبْرَاهِيمَ وَعَلَىٰ آلِ إِبْرَاهِيمَ إِنَّكَ حَمِيدٌ مَجِيدٌ ۝ اللّٰهُمَّ بَارِكْ عَلَىٰ مُحَمَّدٍ وَعَلَىٰ آلِ مُحَمَّدٍ كَمَا بَارَكْتَ عَلَىٰ إِبْرَاهِيمَ وَعَلَىٰ آلِ إِبْرَاهِيمَ إِنَّكَ حَمِيدٌ مَجِيدٌ',b:'আল্লাহুম্মা সাল্লি ‘আলা মুহাম্মাদিওঁ ওয়া ‘আলা আ-লি মুহাম্মাদ, কামা সাল্লাইতা ‘আলা ইবরাহীমা ওয়া ‘আলা আ-লি ইবরাহীম, ইন্নাকা হামিদুম মাজীদ। আল্লাহুম্মা বারিক ‘আলা মুহাম্মাদিওঁ ওয়া ‘আলা আ-লি মুহাম্মাদ, কামা বারাকতা ‘আলা ইবরাহীমা ওয়া ‘আলা আ-লি ইবরাহীম, ইন্নাকা হামিদুম মাজীদ।'},
    rabbana:{t:'দোয়া',tag:'সালামের আগে পড়া যায়',a:'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ',b:'রব্বানা আতিনা ফিদ্দুনইয়া হাসানাতাওঁ ওয়া ফিল আখিরাতি হাসানাতাওঁ ওয়া কিনা ‘আযাবান নার।'},
    qunoot:{t:'দোয়া কুনুত',tag:'বিতরের ৩য় রাকাতে',a:'اللّٰهُمَّ إِنَّا نَسْتَعِينُكَ وَنَسْتَغْفِرُكَ وَنُؤْمِنُ بِكَ وَنَتَوَكَّلُ عَلَيْكَ وَنُثْنِي عَلَيْكَ الْخَيْرَ وَنَشْكُرُكَ وَلَا نَكْفُرُكَ وَنَخْلَعُ وَنَتْرُكُ مَنْ يَفْجُرُكَ ۝ اللّٰهُمَّ إِيَّاكَ نَعْبُدُ وَلَكَ نُصَلِّي وَنَسْجُدُ وَإِلَيْكَ نَسْعَىٰ وَنَحْفِدُ وَنَرْجُو رَحْمَتَكَ وَنَخْشَىٰ عَذَابَكَ إِنَّ عَذَابَكَ بِالْكُفَّارِ مُلْحِقٌ',b:'আল্লাহুম্মা ইন্না নাসতা‘ঈনুকা ওয়া নাস্তাগফিরুকা, ওয়া নু’মিনু বিকা ওয়া নাতাওয়াক্কালু ‘আলাইকা, ওয়া নুসনী ‘আলাইকাল খাইরা, ওয়া নাশকুরুকা ওয়া লা নাকফুরুকা, ওয়া নাখলা‘উ ওয়া নাতরুকু মাইঁ ইয়াফজুরুক। আল্লাহুম্মা ইয়্যাকা না‘বুদু, ওয়া লাকা নুসাল্লি ওয়া নাসজুদু, ওয়া ইলাইকা নাস‘আ ওয়া নাহফিদু, ওয়া নারজু রহমাতাকা ওয়া নাখশা ‘আযাবাকা; ইন্না ‘আযাবাকা বিল কুফফারি মুলহিক।'},
    qadrdua:{t:'লাইলাতুল কদরের দোয়া',tag:'বেশি পড়া উত্তম',a:'اللّٰهُمَّ إِنَّكَ عَفُوٌّ تُحِبُّ الْعَفْوَ فَاعْفُ عَنِّي',b:'আল্লাহুম্মা ইন্নাকা ‘আফুউন, তুহিব্বুল ‘আফওয়া, ফা‘ফু ‘আন্নি।'}
  };

  function readingCard161(k){
    var r=READ161[k];if(!r)return'';
    return '<div class="reading-card161"><div class="reading-title161"><b>'+r.t+'</b><span>'+r.tag+'</span></div>'+
      '<div class="arabic161">'+r.a+'</div><div class="reading-label161">বাংলা উচ্চারণ</div>'+
      '<div class="bn-reading161">'+r.b+'</div></div>';
  }
  function plan161(key){
    if(key==='fajr')return {rak:['ফজরের ২ রাকাত সুন্নত: প্রতি রাকাতে ফাতিহা। ১ম রাকাতে আল-কাফিরুন ও ২য় রাকাতে আল-ইখলাস পড়া প্রস্তাবিত।','ফজরের ২ রাকাত ফরজ: দুই রাকাতেই ফাতিহা + যেকোনো অতিরিক্ত সূরা।'],read:['fatiha','kafirun','ikhlas']};
    if(key==='dhuhr'||key==='asr'||key==='isha')return {rak:['১ম ও ২য় রাকাত: সূরা ফাতিহা + যেকোনো অতিরিক্ত সূরা।','৩য় ও ৪র্থ রাকাত: সূরা ফাতিহা।'],read:['fatiha','ikhlas']};
    if(key==='maghrib')return {rak:['১ম ও ২য় রাকাত: সূরা ফাতিহা + যেকোনো অতিরিক্ত সূরা।','৩য় রাকাত: সূরা ফাতিহা।'],read:['fatiha','ikhlas']};
    if(key==='witr')return {rak:['১ম রাকাত: ফাতিহা + আল-আ’লা (প্রস্তাবিত)।','২য় রাকাত: ফাতিহা + আল-কাফিরুন (প্রস্তাবিত)।','৩য় রাকাত: ফাতিহা + আল-ইখলাস (প্রস্তাবিত), তারপর তাকবির দিয়ে দোয়া কুনুত।'],read:['fatiha','ala','kafirun','ikhlas','qunoot']};
    if(key==='tahajjud')return {rak:['২ রাকাত করে পড়ুন। প্রতি রাকাতে ফাতিহা + যেকোনো অতিরিক্ত সূরা।'],read:['fatiha','ikhlas']};
    if(key==='qadr')return {rak:['লাইলাতুল কদরের জন্য আলাদা বাধ্যতামূলক সূরা নেই। নফল নামাজে ফাতিহা + যেকোনো অতিরিক্ত সূরা পড়ুন।'],read:['fatiha','ikhlas','qadrdua']};
    return {rak:[],read:['fatiha','ikhlas']};
  }

  window.openGuide151=function(key){
    var g=GUIDE_151[key],box=document.getElementById('guideDetail151');if(!g||!box)return;
    var p=plan161(key);
    var steps=g.x.map(function(x,i){return '<div class="step"><b>ধাপ '+(i+1)+'</b><br>'+x+'</div>'}).join('');
    var rak=p.rak.map(function(x,i){return '<div class="guide-rakah161"><b>পাঠ '+(i+1)+'</b><span>'+x+'</span></div>'}).join('');
    var reads=p.read.map(readingCard161).join('');
    var common=['takbir','sana','ruku','qawma','sajdah','tashahhud','durood','rabbana'].map(readingCard161).join('');
    box.innerHTML='<h3>'+g.t+'</h3><div class="muted" style="font-size:11px">'+g.s+'</div>'+steps+
      '<div class="guide-classic161"><h4>কি সূরা / পাঠ পড়বেন</h4>'+rak+reads+
      '<h4 style="margin-top:16px">নামাজের প্রয়োজনীয় দোয়া</h4>'+common+
      '<div class="guide-help161">বাংলা উচ্চারণ শেখার সহায়ক হিসেবে দেওয়া হয়েছে। শুদ্ধ উচ্চারণের জন্য আরবি দেখে এবং বিশ্বস্ত শিক্ষক/আলেমের কাছ থেকে শেখা উত্তম। প্রস্তাবিত সূরা বাধ্যতামূলক নয়।</div></div>';
    box.style.display='block';box.scrollIntoView({behavior:'smooth',block:'start'});
  };

  var oldShow161=window.showPage;
  window.showPage=function(name){
    oldShow161(name);
    document.body.classList.toggle('home-orbit-active',name==='home');
    if(name==='home')requestAnimationFrame(function(){ensureTracks161();measureTracks161()});
  };
  var oldMark161=window.markComplete;
  if(typeof oldMark161==='function')window.markComplete=function(){var x=oldMark161.apply(this,arguments);setTimeout(function(){syncOuter161();syncQazaTrack161(true)},70);return x};

  ensureTracks161();
  setInterval(function(){
    if(document.hidden)return;
    syncOuter161();syncQazaTrack161(false);
  },1400);
})();
