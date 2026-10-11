import { list, put } from '@vercel/blob';

const DATA_PATH='namaz-orbit/mosques.json';
const FEEDBACK_PATH='namaz-orbit/feedback.json';
const MAX_MOSQUES=300;
const MAX_FEEDBACK=1000;

function cors(res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type,X-Admin-Secret');
  res.setHeader('Cache-Control','no-store, max-age=0');
}
function str(v,n=100){return String(v||'').replace(/[<>]/g,'').replace(/\s+/g,' ').trim().slice(0,n)}
function id(v){return String(v||'').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,80)}
function num(v,min,max){const n=Number(v);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):null}
function time(v){const s=String(v||'');return /^([01]\d|2[0-3]):[0-5]\d$/.test(s)?s:''}
function sanitizeTimes(x={}){
  const out={};for(const k of ['fajr','dhuhr','asr','maghrib','isha'])out[k]={adhan:time(x[k]?.adhan),jamaat:time(x[k]?.jamaat)};
  return out;
}
function sanitizeMosque(m={}){
  return {
    id:id(m.id)||('mosque_'+Date.now().toString(36)),
    name:str(m.name,90),
    imageUrl:str(m.imageUrl,500),
    lat:num(m.lat,-90,90),
    lon:num(m.lon,-180,180),
    address:str(m.address,180),
    times:sanitizeTimes(m.times),
    jummah1:time(m.jummah1),
    jummah2:time(m.jummah2),
    eid1:time(m.eid1),
    eid2:time(m.eid2),
    announcement:str(m.announcement,280),
    active:m.active!==false,
    updatedAt:Date.now()
  };
}
async function readBlobJson(path,fallback){
  try{
    const out=await list({prefix:path,limit:1});
    const hit=(out.blobs||[]).find(b=>b.pathname===path)||(out.blobs||[])[0];
    if(!hit)return fallback;
    const r=await fetch(hit.url,{cache:'no-store'});if(!r.ok)return fallback;
    return await r.json();
  }catch(e){return fallback}
}
async function writeBlobJson(path,data){
  await put(path,JSON.stringify(data),{access:'public',addRandomSuffix:false,allowOverwrite:true,contentType:'application/json'});
}
async function loadData(){
  const j=await readBlobJson(DATA_PATH,{mosques:[],updatedAt:0});
  return {mosques:Array.isArray(j.mosques)?j.mosques:[],updatedAt:Number(j.updatedAt)||0};
}
async function saveData(data){
  await writeBlobJson(DATA_PATH,{mosques:data.mosques.slice(0,MAX_MOSQUES),updatedAt:Date.now()});
}
async function loadFeedback(){
  const j=await readBlobJson(FEEDBACK_PATH,{items:[],updatedAt:0});
  return {items:Array.isArray(j.items)?j.items:[],updatedAt:Number(j.updatedAt)||0};
}
async function saveFeedback(data){
  await writeBlobJson(FEEDBACK_PATH,{items:data.items.slice(0,MAX_FEEDBACK),updatedAt:Date.now()});
}
async function saveImage(mid,dataUrl){
  if(!dataUrl||typeof dataUrl!=='string')return '';
  const m=dataUrl.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);if(!m)return '';
  const buf=Buffer.from(m[2],'base64');if(buf.length>700000)return '';
  const ext=m[1]==='image/png'?'png':m[1]==='image/webp'?'webp':'jpg';
  const out=await put('namaz-orbit/mosques/'+mid+'.'+ext,buf,{access:'public',addRandomSuffix:false,allowOverwrite:true,contentType:m[1]});
  return out.url;
}
function adminOk(req,body){
  const expected=String(process.env.MOSQUE_ADMIN_SECRET||'');
  const got=String(req.headers['x-admin-secret']||body?.secret||'');
  return !!expected&&got===expected;
}

export default async function handler(req,res){
  cors(res);
  if(req.method==='OPTIONS')return res.status(204).end();

  if(req.method==='GET'){
    const data=await loadData();
    const mosques=data.mosques.filter(m=>m&&m.active!==false&&m.name).sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));
    return res.status(200).json({ok:true,mosques,updatedAt:data.updatedAt});
  }

  if(req.method!=='POST')return res.status(405).json({ok:false,error:'Method not allowed'});
  let body=req.body;if(typeof body==='string'){try{body=JSON.parse(body)}catch(e){body={}}}body=body||{};

  if(body.action==='about_submit'){
    const message=str(body.message,500);
    if(!message)return res.status(400).json({ok:false,error:'Message required'});
    if(adminOk(req,{secret:message}))return res.status(200).json({ok:true,admin:true});

    const data=await loadFeedback();
    data.items.unshift({
      id:'fb_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8),
      message,
      name:str(body.name,60),
      createdAt:Date.now()
    });
    await saveFeedback(data);
    return res.status(200).json({ok:true,feedback:true});
  }

  if(body.action==='verify'){
    return adminOk(req,body)?res.status(200).json({ok:true}):res.status(401).json({ok:false,error:'Invalid admin word'});
  }

  if(!adminOk(req,body))return res.status(401).json({ok:false,error:'Unauthorized'});

  if(body.action==='feedbacks'){
    const data=await loadFeedback();
    return res.status(200).json({ok:true,items:data.items.slice(0,300)});
  }
  if(body.action==='delete_feedback'){
    const fid=id(body.id),data=await loadFeedback();
    data.items=data.items.filter(x=>x&&x.id!==fid);
    await saveFeedback(data);
    return res.status(200).json({ok:true});
  }

  const data=await loadData();

  if(body.action==='upsert'){
    let row=sanitizeMosque(body.mosque||{});
    if(!row.name)return res.status(400).json({ok:false,error:'Mosque name required'});
    const old=data.mosques.find(m=>m&&m.id===row.id);
    if(old&&old.imageUrl)row.imageUrl=old.imageUrl;
    if(body.imageDataUrl){try{row.imageUrl=await saveImage(row.id,body.imageDataUrl)||row.imageUrl}catch(e){}}
    const idx=data.mosques.findIndex(m=>m&&m.id===row.id);
    if(idx>=0)data.mosques[idx]=row;else data.mosques.unshift(row);
    await saveData(data);
    return res.status(200).json({ok:true,mosque:row});
  }

  if(body.action==='delete'){
    const mid=id(body.id);data.mosques=data.mosques.filter(m=>m&&m.id!==mid);await saveData(data);
    return res.status(200).json({ok:true});
  }

  return res.status(400).json({ok:false,error:'Unsupported action'});
}