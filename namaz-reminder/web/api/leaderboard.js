import { list, put } from '@vercel/blob';

const DATA_PATH = 'namaz-orbit/leaderboard.json';
const MAX_USERS = 500;

function cors(res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  res.setHeader('Cache-Control','no-store, max-age=0');
}

function cleanName(v){
  return String(v||'').replace(/[<>]/g,'').replace(/\s+/g,' ').trim().slice(0,40);
}
function cleanId(v){
  const s=String(v||'').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,80);
  return s.length>=6?s:'';
}
function num(v,max=1000000){
  const n=Math.max(0,Math.floor(Number(v)||0));
  return Math.min(n,max);
}
function sanitizeStats(s={}){
  return {
    onTimeCompleted:num(s.onTimeCompleted),
    qazaCompleted:num(s.qazaCompleted),
    qazaDue:num(s.qazaDue),
    perfectDays:num(s.perfectDays,100000),
    totalLogged:num(s.totalLogged)
  };
}
async function loadData(){
  try{
    const out=await list({prefix:DATA_PATH,limit:1});
    const hit=(out.blobs||[]).find(b=>b.pathname===DATA_PATH)||(out.blobs||[])[0];
    if(!hit)return {users:[],updatedAt:0};
    const r=await fetch(hit.url,{cache:'no-store'});
    if(!r.ok)return {users:[],updatedAt:0};
    const j=await r.json();
    return {users:Array.isArray(j.users)?j.users:[],updatedAt:Number(j.updatedAt)||0};
  }catch(e){
    return {users:[],updatedAt:0};
  }
}
async function saveData(data){
  const body=JSON.stringify({users:data.users.slice(0,MAX_USERS),updatedAt:Date.now()});
  await put(DATA_PATH,body,{
    access:'public',
    addRandomSuffix:false,
    allowOverwrite:true,
    contentType:'application/json'
  });
}
async function saveImage(uid,dataUrl){
  if(!dataUrl||typeof dataUrl!=='string')return '';
  const m=dataUrl.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
  if(!m)return '';
  const buf=Buffer.from(m[2],'base64');
  if(buf.length>350000)return '';
  const ext=m[1]==='image/png'?'png':m[1]==='image/webp'?'webp':'jpg';
  const out=await put('namaz-orbit/profiles/'+uid+'.'+ext,buf,{
    access:'public',
    addRandomSuffix:false,
    allowOverwrite:true,
    contentType:m[1]
  });
  return out.url;
}
function publicUser(u){
  return {
    id:u.id,
    name:u.name,
    imageUrl:u.imageUrl||'',
    stats:sanitizeStats(u.stats),
    updatedAt:Number(u.updatedAt)||0
  };
}

export default async function handler(req,res){
  cors(res);
  if(req.method==='OPTIONS')return res.status(204).end();

  if(req.method==='GET'){
    const data=await loadData();
    const users=data.users.filter(u=>u&&u.public!==false&&u.name).map(publicUser);
    const perfect=[...users].sort((a,b)=>
      b.stats.perfectDays-a.stats.perfectDays ||
      b.stats.onTimeCompleted-a.stats.onTimeCompleted ||
      a.stats.qazaDue-b.stats.qazaDue ||
      b.updatedAt-a.updatedAt
    );
    const qaza=[...users].sort((a,b)=>
      b.stats.qazaCompleted-a.stats.qazaCompleted ||
      a.stats.qazaDue-b.stats.qazaDue ||
      b.stats.onTimeCompleted-a.stats.onTimeCompleted ||
      b.updatedAt-a.updatedAt
    );
    return res.status(200).json({ok:true,perfect:perfect.slice(0,100),qaza:qaza.slice(0,100),updatedAt:data.updatedAt});
  }

  if(req.method==='POST'){
    let body=req.body;
    if(typeof body==='string'){try{body=JSON.parse(body)}catch(e){body={}}}
    body=body||{};
    if(body.action!=='upsert')return res.status(400).json({ok:false,error:'Unsupported action'});

    const uid=cleanId(body.id),name=cleanName(body.name);
    if(!uid||!name)return res.status(400).json({ok:false,error:'Profile id and name required'});

    const data=await loadData();
    let imageUrl='';
    const old=data.users.find(u=>u&&u.id===uid);
    if(old&&old.imageUrl)imageUrl=old.imageUrl;
    if(body.imageDataUrl){
      try{imageUrl=await saveImage(uid,body.imageDataUrl)||imageUrl}catch(e){}
    }

    const row={
      id:uid,
      name,
      imageUrl,
      public:body.public!==false,
      stats:sanitizeStats(body.stats),
      updatedAt:Date.now()
    };
    const idx=data.users.findIndex(u=>u&&u.id===uid);
    if(idx>=0)data.users[idx]=row;else data.users.push(row);
    data.users=data.users.sort((a,b)=>(Number(b.updatedAt)||0)-(Number(a.updatedAt)||0)).slice(0,MAX_USERS);
    await saveData(data);
    return res.status(200).json({ok:true,user:publicUser(row)});
  }

  return res.status(405).json({ok:false,error:'Method not allowed'});
}
