/* Namaz Orbit v1.2.0 — Islamic Live Events */
const ISLAMIC_EVENTS = [
  {id:'new-year',month:1,day:1,icon:'☾',bn:'ইসলামিক নববর্ষ',en:'Islamic New Year',hijri:'১ মুহাররম',note:'নতুন হিজরি বছরের শুরু।'},
  {id:'ashura',month:1,day:10,icon:'◐',bn:'আশুরা',en:'Ashura',hijri:'১০ মুহাররম',note:'মুহাররমের ১০ তারিখ।'},
  {id:'miraj',month:7,day:27,icon:'✦',bn:'শবে মেরাজ',en:"Isra & Mi'raj",hijri:'২৭ রজব',note:'এই observance-এর তারিখ/পদ্ধতি নিয়ে আলেমদের মধ্যে ভিন্নতা আছে।',varies:true},
  {id:'barat',month:8,day:15,icon:'✧',bn:'শবে বরাত',en:"Mid-Sha'ban",hijri:'১৫ শাবান',note:'বাংলাদেশে বহুল পরিচিত observance; আমল ও গুরুত্ব বিষয়ে আলেমদের মধ্যে ভিন্নতা আছে।',varies:true},
  {id:'ramadan',month:9,day:1,icon:'🌙',bn:'রমজান শুরু',en:'Ramadan Begins',hijri:'১ রমজান',note:'রমজানের প্রথম দিন। চাঁদ দেখার উপর তারিখ নির্ভর করে।'},
  {id:'last-ten',month:9,day:21,icon:'✨',bn:'রমজানের শেষ ১০ রাত',en:'Last 10 Nights Begin',hijri:'২১ রমজান',note:'শেষ দশ রাত শুরু—বিজোড় রাতগুলোতে Laylat al-Qadr অনুসন্ধান করা হয়।'},
  {id:'qadr',month:9,day:27,icon:'✦',bn:'লাইলাতুল কদর',en:'Laylat al-Qadr',hijri:'২৭ রমজান',note:'২৭তম রাত বহুলভাবে পালিত; নির্দিষ্ট রাত নিশ্চিত নয়, শেষ দশকের বিজোড় রাতগুলো গুরুত্বপূর্ণ।',varies:true},
  {id:'eid-fitr',month:10,day:1,icon:'🎉',bn:'ঈদুল ফিতর',en:'Eid al-Fitr',hijri:'১ শাওয়াল',note:'রমজান শেষে ঈদুল ফিতর। স্থানীয় চাঁদ দেখার সিদ্ধান্ত অনুসরণ করুন।'},
  {id:'hajj-start',month:12,day:8,icon:'🕋',bn:'হজের দিনসমূহ শুরু',en:'Hajj Days Begin',hijri:'৮ জিলহজ',note:'ইয়াওমুত তারবিয়াহ ও হজের মূল দিনগুলোর শুরু।'},
  {id:'arafah',month:12,day:9,icon:'⛰️',bn:'আরাফার দিন',en:'Day of Arafah',hijri:'৯ জিলহজ',note:'হজের গুরুত্বপূর্ণ দিন।'},
  {id:'eid-adha',month:12,day:10,icon:'🕌',bn:'ঈদুল আজহা',en:'Eid al-Adha',hijri:'১০ জিলহজ',note:'কুরবানির ঈদ। স্থানীয় চাঁদ দেখার সিদ্ধান্ত অনুসরণ করুন।'},
  {id:'tashreeq',month:12,day:11,icon:'☀️',bn:'আইয়ামে তাশরীক',en:'Days of Tashreeq',hijri:'১১–১৩ জিলহজ',note:'১১, ১২ ও ১৩ জিলহজ—আইয়ামে তাশরীক।'}
];
const HIJRI_MONTHS_BN=['মুহাররম','সফর','রবিউল আউয়াল','রবিউস সানি','জুমাদাল উলা','জুমাদাস সানিয়া','রজব','শাবান','রমজান','শাওয়াল','জিলকদ','জিলহজ'];
let liveEventState={next:null,nextDate:null,today:null,ramadanDay:null,dayKey:''};

const EVENT_CSS=`
.live-event-home{margin:14px 0 2px;padding:15px 16px;border-radius:23px;position:relative;overflow:hidden;cursor:pointer}
.live-event-home:after{content:"";position:absolute;width:150px;height:150px;border-radius:50%;background:rgba(142,240,207,.08);filter:blur(8px);right:-65px;top:-75px}
.event-top{display:flex;align-items:center;justify-content:space-between;gap:10px;position:relative;z-index:2}.event-live{font-size:9px;letter-spacing:1.4px;color:var(--accent);font-weight:800}.event-est{font-size:9px;color:var(--muted);padding:5px 8px;border-radius:99px;border:1px solid rgba(255,255,255,.09)}
.event-main{display:grid;grid-template-columns:48px 1fr;gap:12px;align-items:center;margin-top:10px;position:relative;z-index:2}.event-icon{width:48px;height:48px;border-radius:16px;display:grid;place-items:center;font-size:25px;background:rgba(142,240,207,.08);border:1px solid rgba(142,240,207,.16);box-shadow:inset 0 0 18px rgba(142,240,207,.05)}
.event-main h3{margin:0 0 3px;font-size:18px}.event-main small{color:var(--muted)}.event-count{font-variant-numeric:tabular-nums;font-size:22px;font-weight:800;color:var(--accent);margin-top:10px;position:relative;z-index:2}.event-count-label{font-size:10px;color:var(--muted);margin-top:2px;position:relative;z-index:2}
.events-hero{padding:18px;border-radius:26px;margin-bottom:12px}.events-hero h2{margin:5px 0}.events-hijri{color:var(--accent);font-size:12px}.event-list{display:grid;gap:10px}.event-card{padding:14px;border-radius:21px;display:grid;grid-template-columns:46px 1fr auto;gap:11px;align-items:center;border:1px solid var(--line);background:var(--glass)}
.event-card.today{border-color:rgba(142,240,207,.4);box-shadow:0 0 25px rgba(142,240,207,.08)}.event-card .event-icon{width:46px;height:46px}.event-card h4{margin:0 0 3px;font-size:14px}.event-card small{display:block;color:var(--muted);font-size:10px;line-height:1.45}.event-date{text-align:right;font-size:11px}.event-date b{display:block;color:var(--accent);font-size:12px}.event-badge{display:inline-flex;margin-top:5px;padding:3px 6px;border-radius:8px;background:rgba(255,189,122,.08);border:1px solid rgba(255,189,122,.14);color:var(--warn);font-size:8px}
.event-section-btn{width:100%;display:flex;align-items:center;justify-content:space-between;gap:12px;text-align:left}.event-section-btn .event-icon{flex:0 0 auto}.moon-note{margin-top:12px;font-size:11px;color:var(--muted);line-height:1.55}
@media(max-width:390px){.event-count{font-size:19px}.event-card{grid-template-columns:42px 1fr auto;padding:12px}.event-card .event-icon{width:42px;height:42px}}
`;

function bnNum(n){return Number(n).toLocaleString('bn-BD')}
function eventStartOfDay(d){const x=new Date(d);x.setHours(0,0,0,0);return x}
function eventDayKey(d){const x=eventStartOfDay(d);return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0')}
function hijriPartsFor(d){
  for(const cal of ['islamic-umalqura','islamic']){
    try{
      const parts=new Intl.DateTimeFormat('en-u-ca-'+cal,{day:'numeric',month:'numeric',year:'numeric'}).formatToParts(d);
      const obj={};for(const p of parts)if(p.type==='day'||p.type==='month'||p.type==='year')obj[p.type]=Number(p.value);
      if(obj.day&&obj.month&&obj.year)return obj;
    }catch(e){}
  }
  return {day:1,month:1,year:1448};
}
function hijriDisplay(d){
  const h=hijriPartsFor(d);return `${bnNum(h.day)} ${HIJRI_MONTHS_BN[h.month-1]||''} ${bnNum(h.year)} হিজরি`;
}
function sameHijriEvent(d,e){const h=hijriPartsFor(d);return h.month===e.month&&h.day===e.day}
function eventOccurrence(e,from=new Date()){
  const start=eventStartOfDay(from);
  for(let i=0;i<430;i++){const d=new Date(start);d.setDate(d.getDate()+i);if(sameHijriEvent(d,e))return d}
  return null;
}
function buildLiveEventState(){
  const now=new Date(),today=eventStartOfDay(now),h=hijriPartsFor(now);
  const exact=ISLAMIC_EVENTS.find(e=>sameHijriEvent(today,e))||null;
  const all=ISLAMIC_EVENTS.map(e=>({event:e,date:eventOccurrence(e,now)})).filter(x=>x.date).sort((a,b)=>a.date-b.date);
  liveEventState={next:all[0]?.event||null,nextDate:all[0]?.date||null,today:exact,ramadanDay:h.month===9?h.day:null,dayKey:eventDayKey(now),all};
  return liveEventState;
}
function eventCountdownText(target,now=new Date()){
  if(!target)return '—';let ms=Math.max(0,target-now);const d=Math.floor(ms/86400000);ms%=86400000;const h=Math.floor(ms/3600000);ms%=3600000;const m=Math.floor(ms/60000);const s=Math.floor(ms%60000/1000);
  return `${bnNum(d)}d ${String(h).padStart(2,'0')}h ${String(m).padStart(2,'0')}m ${String(s).padStart(2,'0')}s`;
}
function eventGregorian(d){return d?d.toLocaleDateString('bn-BD',{weekday:'short',day:'numeric',month:'long',year:'numeric'}):'—'}
function eventHomeModel(){
  const st=liveEventState.dayKey===eventDayKey(new Date())?liveEventState:buildLiveEventState(),now=new Date();
  if(st.today)return {mode:'today',event:st.today,title:st.today.bn,subtitle:st.today.en,count:'LIVE TODAY',label:st.today.hijri};
  if(st.ramadanDay){
    const eid=ISLAMIC_EVENTS.find(e=>e.id==='eid-fitr'),eidDate=eventOccurrence(eid,now);
    return {mode:'ramadan',event:{icon:'🌙'},title:`রমজান • দিন ${bnNum(st.ramadanDay)}`,subtitle:'Ramadan Live',count:eventCountdownText(eidDate,now),label:'ঈদুল ফিতর পর্যন্ত আনুমানিক countdown'};
  }
  return {mode:'next',event:st.next,title:st.next?st.next.bn:'Islamic Event',subtitle:st.next?st.next.en:'',count:eventCountdownText(st.nextDate,now),label:st.nextDate?`${st.next.hijri} • ${eventGregorian(st.nextDate)}`:'—'};
}
function installIslamicEventsUI(){
  if(!document.getElementById('namazOrbitEventStyle')){const s=document.createElement('style');s.id='namazOrbitEventStyle';s.textContent=EVENT_CSS;document.head.appendChild(s)}
  if(!document.getElementById('liveIslamicEvent')){
    const card=document.createElement('div');card.id='liveIslamicEvent';card.className='live-event-home glass';card.setAttribute('onclick','openIslamicEvents()');
    const hero=document.querySelector('#page-home .hero');if(hero)hero.insertAdjacentElement('afterend',card);
  }
  if(!document.getElementById('page-events')){
    const page=document.createElement('section');page.className='page';page.id='page-events';page.innerHTML=`
      <div class="events-hero glass">
        <div class="section-title" style="margin:0"><h3>Islamic Live Events</h3><button onclick="showPage('home')">← Home</button></div>
        <div class="events-hijri" id="eventsHijri">—</div>
        <h2 id="eventsNextTitle">—</h2>
        <div class="event-count" id="eventsNextCountdown">—</div>
        <div class="event-count-label" id="eventsNextDate">—</div>
        <div class="moon-note">⚠️ হিজরি মাস ও Eid/Ramadan-এর চূড়ান্ত তারিখ স্থানীয় চাঁদ দেখার সিদ্ধান্ত অনুযায়ী ১ দিন এগিয়ে/পিছিয়ে যেতে পারে। App-এর date একটি calculated estimate.</div>
      </div>
      <div class="section-title"><h3>Upcoming Events</h3><button onclick="renderIslamicEvents()">Refresh</button></div>
      <div class="event-list" id="islamicEventList"></div>`;
    document.querySelector('main')?.appendChild(page);
  }
  if(!document.getElementById('eventsMorePanel')){
    const p=document.createElement('div');p.id='eventsMorePanel';p.className='panel glass';p.innerHTML=`
      <button class="event-section-btn" onclick="openIslamicEvents()">
        <div class="event-icon">🌙</div><div style="flex:1"><b>Islamic Live Events</b><div class="meta">Ramadan, Eid, Arafah, Ashura & more</div></div><span>›</span>
      </button>`;
    const more=document.getElementById('page-more');if(more)more.insertAdjacentElement('afterbegin',p);
  }
}
function renderLiveEventHome(){
  const el=document.getElementById('liveIslamicEvent');if(!el)return;const m=eventHomeModel();
  el.innerHTML=`<div class="event-top"><span class="event-live">${m.mode==='today'||m.mode==='ramadan'?'● LIVE ISLAMIC EVENT':'NEXT ISLAMIC EVENT'}</span><span class="event-est">Calculated • Bangladesh</span></div>
  <div class="event-main"><div class="event-icon">${m.event?.icon||'☾'}</div><div><h3>${m.title}</h3><small>${m.subtitle}</small></div></div>
  <div class="event-count" id="homeEventCountdown">${m.count}</div><div class="event-count-label" id="homeEventLabel">${m.label}</div>`;
}
function renderIslamicEvents(){
  const st=buildLiveEventState(),now=new Date();document.getElementById('eventsHijri').textContent=hijriDisplay(now);
  const m=eventHomeModel();document.getElementById('eventsNextTitle').textContent=m.title;document.getElementById('eventsNextCountdown').textContent=m.count;document.getElementById('eventsNextDate').textContent=m.label;
  const list=document.getElementById('islamicEventList');if(!list)return;
  const rows=[];
  if(st.ramadanDay&&!st.today)rows.push({event:{icon:'🌙',bn:`রমজান • দিন ${bnNum(st.ramadanDay)}`,en:'Ramadan is ongoing',hijri:hijriDisplay(now),note:'রমজান বর্তমানে চলছে।'},date:eventStartOfDay(now),today:true,live:true});
  for(const x of st.all)rows.push({event:x.event,date:x.date,today:eventDayKey(x.date)===eventDayKey(now),live:false});
  list.innerHTML=rows.map(x=>`<div class="event-card glass ${x.today?'today':''}">
    <div class="event-icon">${x.event.icon}</div>
    <div><h4>${x.event.bn}</h4><small>${x.event.en}</small><small>${x.event.hijri}</small><small>${x.event.note||''}</small>${x.event.varies?'<span class="event-badge">Observance varies</span>':''}</div>
    <div class="event-date">${x.today?'<b>● TODAY</b>':`<b>${Math.max(0,Math.ceil((x.date-eventStartOfDay(now))/86400000))} দিন</b>`}<span>${eventGregorian(x.date)}</span></div>
  </div>`).join('');
  renderLiveEventHome();
}
function tickIslamicEvents(){
  const now=new Date();if(liveEventState.dayKey!==eventDayKey(now)){renderIslamicEvents();return}
  const m=eventHomeModel(),home=document.getElementById('homeEventCountdown'),label=document.getElementById('homeEventLabel');
  if(home)home.textContent=m.mode==='next'||m.mode==='ramadan'?m.count:'LIVE TODAY';if(label)label.textContent=m.label;
  if(document.getElementById('page-events')?.classList.contains('active')){
    const c=document.getElementById('eventsNextCountdown');if(c)c.textContent=m.mode==='next'||m.mode==='ramadan'?m.count:'LIVE TODAY';
  }
}
function openIslamicEvents(){renderIslamicEvents();showPage('events')}

(function initIslamicLiveEvents(){
  installIslamicEventsUI();buildLiveEventState();renderLiveEventHome();renderIslamicEvents();
  setInterval(tickIslamicEvents,1000);
})();
