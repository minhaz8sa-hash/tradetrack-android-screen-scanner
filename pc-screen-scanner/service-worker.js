const ENDPOINT="https://base44.app/api/apps/6a1d6d69aab915d09b7b082d/functions/analyzeMobileScreenCapture";
const APP_ID="6a1d6d69aab915d09b7b082d";
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));

async function captureActiveQuotex(senderTab, quality=75){
  if(!senderTab?.id || !senderTab?.windowId) throw new Error("Quotex tab not available.");
  const [active]=await chrome.tabs.query({active:true,windowId:senderTab.windowId});
  if(!active || active.id!==senderTab.id) throw new Error("Keep the Quotex tab active while scanning.");
  return chrome.tabs.captureVisibleTab(senderTab.windowId,{format:"jpeg",quality});
}

async function dataUrlToBlob(dataUrl){
  const res=await fetch(dataUrl);
  return res.blob();
}

async function postFrames({frames,mode,scanSessionId,assetHint,payoutHint}){
  const form=new FormData();
  form.append("capturedAt",new Date().toISOString());
  form.append("analysisMode",mode||"full");
  form.append("scanSessionId",scanSessionId||"");
  if(assetHint) form.append("assetHint",assetHint);
  if(payoutHint) form.append("payoutHint",String(payoutHint));

  const names=["frame","frame2","frame3"];
  for(let i=0;i<frames.length && i<3;i++){
    const blob=await dataUrlToBlob(frames[i]);
    form.append(names[i],blob,"quotex-"+(i+1)+".jpg");
  }

  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),28000);
  try{
    const res=await fetch(ENDPOINT,{
      method:"POST",
      headers:{"X-App-Id":APP_ID},
      body:form,
      signal:controller.signal
    });
    const json=await res.json().catch(()=>({success:false,error:"Invalid server response"}));
    if(!res.ok || !json?.success) throw new Error(json?.error || ("HTTP "+res.status));
    return json;
  } finally {
    clearTimeout(timer);
  }
}

chrome.runtime.onMessage.addListener((msg,sender,sendResponse)=>{
  if(msg?.type!=="TTL_PC_CAPTURE_ANALYZE") return;

  (async()=>{
    try{
      const mode=msg.mode==="verify"?"verify":"full";
      const targetFrames=mode==="full"?3:1;
      const quality=mode==="full"?78:70;
      const frames=[];

      await sleep(90);
      for(let i=0;i<targetFrames;i++){
        if(i>0) await sleep(750);
        frames.push(await captureActiveQuotex(sender.tab,quality));
      }

      if(sender.tab?.id){
        chrome.tabs.sendMessage(sender.tab.id,{type:"TTL_PC_CAPTURE_DONE"}).catch(()=>{});
      }

      const result=await postFrames({
        frames,
        mode,
        scanSessionId:msg.scanSessionId,
        assetHint:msg.assetHint,
        payoutHint:msg.payoutHint
      });
      sendResponse({ok:true,result});
    }catch(error){
      sendResponse({ok:false,error:String(error?.message||error)});
    }
  })();

  return true;
});