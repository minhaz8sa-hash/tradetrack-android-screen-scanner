(()=>{
  if(window.__TT_PC_SCANNER__) return;
  window.__TT_PC_SCANNER__=true;

  const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
  let armed=false;
  let analyzing=false;
  let attempt=0;
  let scanSessionId="";
  let estimatedCloseEpochMs=0;
  let heldCandidateReady=false;
  let heldDirection="";
  let heldUp=50;
  let heldDown=50;
  let heldInstability=100;
  let heldSourceSeconds=-1;
  let heldAsset="—";
  let heldPayout=0;
  let scheduled=null;
  let watcher=null;

  const bubble=document.createElement("button");
  bubble.type="button";
  bubble.id="tt-pc-scan-bubble";
  bubble.textContent="TT\nSCAN";
  Object.assign(bubble.style,{
    position:"fixed",right:"22px",top:"190px",width:"180px",height:"116px",
    zIndex:"2147483647",borderRadius:"20px",border:"1px solid #34d399",
    background:"#0d3227",color:"#fff",font:"700 15px/1.25 Arial,sans-serif",
    whiteSpace:"pre-line",boxShadow:"0 10px 30px rgba(0,0,0,.35)",cursor:"pointer",
    padding:"8px",letterSpacing:".2px"
  });
  document.documentElement.appendChild(bubble);

  function setBubble(text,kind="normal"){
    bubble.style.visibility="visible";
    bubble.textContent=text;
    bubble.style.background=
      kind==="signal"?"#064e3b":
      kind==="warn"?"#5b3a09":
      kind==="error"?"#5f1820":
      "#0d3227";
  }

  async function updateStatus(extra={}){
    const state={
      armed,analyzing,attempt,
      estimatedCloseAt:estimatedCloseEpochMs?new Date(estimatedCloseEpochMs).toISOString():null,
      heldCandidateReady,heldDirection,heldUp,heldDown,heldInstability,heldSourceSeconds,
      asset:heldAsset,payout:heldPayout,
      updatedAt:new Date().toISOString(),
      ...extra
    };
    await chrome.storage.local.set({ttlPcScannerStatus:state});
  }

  function resetAfter(ms=9000){
    clearTimeout(scheduled);
    clearInterval(watcher);
    scheduled=null;watcher=null;
    setTimeout(()=>{
      if(!armed&&!analyzing) setBubble("TT\nSCAN");
    },ms);
  }

  function stopState(){
    armed=false;analyzing=false;attempt=0;scanSessionId="";
    estimatedCloseEpochMs=0;heldCandidateReady=false;heldDirection="";
    heldUp=50;heldDown=50;heldInstability=100;heldSourceSeconds=-1;
    clearTimeout(scheduled);clearInterval(watcher);
    scheduled=null;watcher=null;
  }

  function releaseHeldSignal(){
    if(!armed||!heldCandidateReady||analyzing) return;
    const left=estimatedCloseEpochMs-Date.now();
    if(left<2000||left>5000) return;
    const arrow=heldDirection==="UP"?"↑":"↓";
    const entryAt=new Date(estimatedCloseEpochMs).toISOString();
    const expiresAt=new Date(estimatedCloseEpochMs+60000).toISOString();
    const fmt=t=>new Date(t).toLocaleTimeString();
    setBubble("NEXT CANDLE "+arrow+" "+heldDirection+"\n"+heldAsset+"\nEntry "+fmt(entryAt)+"\nEnd "+fmt(expiresAt),"signal");
    updateStatus({finalState:"SIGNAL",signalDirection:heldDirection,entryAt,expiresAt});
    stopState();
    resetAfter(Math.max(0,left));
  }

  function finishNoTrade(reason){
    setBubble("NO TRADE\nNEXT","warn");
    updateStatus({finalState:"NO_TRADE",reason});
    stopState();
    resetAfter(7000);
  }

  function startWatcher(){
    clearInterval(watcher);
    watcher=setInterval(()=>{
      if(!armed||!estimatedCloseEpochMs) return;
      const remaining=estimatedCloseEpochMs-Date.now();
      if(remaining<=5000 && remaining>=2000 && heldCandidateReady && heldSourceSeconds>=10 && heldSourceSeconds<=20 && !analyzing){
        releaseHeldSignal();
      }else if(remaining<2000){
        finishNoTrade("No fresh stable next-candle confirmation before close.");
      }
    },200);
  }

  async function getHints(){
    return {assetHint:"",payoutHint:""};
  }

  function scheduleNext(delay){
    clearTimeout(scheduled);
    scheduled=setTimeout(()=>{
      if(armed&&!analyzing) analyzeOnce();
    },delay);
  }

  async function analyzeOnce(){
    if(!armed||analyzing) return;
    analyzing=true;
    attempt++;
    const thisSession=scanSessionId;
    const mode=attempt===1?"full":"verify";
    setBubble("CAPTURING\n"+attempt);

    const hints=await getHints();

    bubble.style.visibility="hidden";
    const response=await new Promise(resolve=>{
      chrome.runtime.sendMessage({
        type:"TTL_PC_CAPTURE_ANALYZE",
        mode,
        scanSessionId:thisSession,
        assetHint:hints.assetHint,
        payoutHint:hints.payoutHint
      },r=>{
        if(chrome.runtime.lastError) resolve({ok:false,error:chrome.runtime.lastError.message});
        else resolve(r||{ok:false,error:"No response"});
      });
    });

    if(!armed||thisSession!==scanSessionId){
      return;
    }

    bubble.style.visibility="visible";

    if(!response?.ok){
      analyzing=false;
      heldCandidateReady=false;
      if(attempt>=3) { finishNoTrade(response?.error||"Scan failed"); return; }
      setBubble("RETRYING\nSCAN","warn");
      await updateStatus({lastError:response?.error||"Analysis failed"});
      scheduleNext(1200);
      return;
    }

    const scan=response.result?.scan;
    if(!scan){
      analyzing=false;
      setBubble("RETRYING\nSCAN","warn");
      scheduleNext(1200);
      return;
    }

    if(scan.scanSessionId!==thisSession||scan.targetCandle!=="NEXT_CANDLE"||scan.fatal){ analyzing=false;finishNoTrade(scan.reason||"Candle mismatch");return; }
    const sourceSeconds=Number(scan.secondsToCandleClose);
    const effectiveSeconds=Number(scan.effectiveSecondsToCandleClose);
    const up=Math.round(Number(scan.upConfirmation||50));
    const down=Math.round(Number(scan.downConfirmation||50));
    const instability=Math.round(Number(scan.endInstabilityScore||100));
    const candidateReady=!!scan.candidateReady;
    const candidateDirection=String(scan.candidateDirection||"SKIP").toUpperCase();
    const shouldSignalNow=!!scan.shouldSignalNow;
    const closeAt=String(scan.estimatedCandleCloseAt||"");
    const biasState=String(scan.biasState||"SCANNING").toUpperCase();

    if(closeAt){
      const parsed=Date.parse(closeAt);
      if(Number.isFinite(parsed)&&parsed>Date.now()){
        if(estimatedCloseEpochMs && Math.abs(parsed-estimatedCloseEpochMs)>1800){analyzing=false;finishNoTrade("Candle changed");return;}
        estimatedCloseEpochMs=parsed;
        startWatcher();
      }
    }

    if(candidateReady && (candidateDirection==="UP"||candidateDirection==="DOWN") && instability<=45 && sourceSeconds>=10 && sourceSeconds<=20){
      heldCandidateReady=true;
      heldDirection=candidateDirection;
      heldUp=up;heldDown=down;heldInstability=instability;
      heldSourceSeconds=sourceSeconds;
      heldAsset=String(scan.asset||"—");
      heldPayout=Math.round(Number(scan.payout||0));
    }else{
      heldCandidateReady=false;
      heldDirection="";
    }

    if(
      shouldSignalNow &&
      heldCandidateReady &&
      Number.isFinite(effectiveSeconds) &&
      effectiveSeconds<=5 &&
      effectiveSeconds>=2
    ){
      analyzing=false;
      releaseHeldSignal();

      return;
    }

    const remaining=estimatedCloseEpochMs?estimatedCloseEpochMs-Date.now():-1;
    const secs=remaining>0?Math.max(0,Math.round(remaining/1000)):"";

    if(biasState==="UNSTABLE"){
      setBubble("UNSTABLE\nKEEP SCAN","warn");
    }else if(biasState==="NO_TRADE"){
      setBubble("CHECKING\nKEEP SCAN","warn");
      heldCandidateReady=false;
    }else if(heldCandidateReady){
      const arrow=heldDirection==="UP"?"↑":"↓";
      setBubble("VERIFYING\n"+(secs!==""?secs+"s":""));
    }else{
      setBubble("SCANNING "+(secs!==""?secs+"s":"")+"\nNEXT");
    }

    analyzing=false;
    await updateStatus({
      lastScan:scan,
      lastError:null,
      finalState:"SCANNING"
    });

    if(!armed) return;

    if(remaining>10000||remaining<0){
      let delay=500;
      if(remaining>30000) delay=4500;
      else if(remaining>22000) delay=3000;
      else if(remaining>14000) delay=1400;
      scheduleNext(delay);
    }
  }

  async function arm(){
    if(armed||analyzing) return;
    armed=true;analyzing=false;attempt=0;
    scanSessionId=(crypto.randomUUID?crypto.randomUUID():Date.now()+"-"+Math.random());
    estimatedCloseEpochMs=0;heldCandidateReady=false;heldDirection="";
    heldSourceSeconds=-1;heldInstability=100;
    setBubble("ARMED\nSCANNING");
    await updateStatus({finalState:"ARMED",lastError:null});
    const armedSession=scanSessionId;
    setTimeout(()=>{if(armed&&scanSessionId===armedSession)finishNoTrade("Scan timed out");},65000);
    analyzeOnce();
  }

  function cancel(){
    stopState();
    setBubble("TT\nSCAN");
    updateStatus({finalState:"CANCELLED"});
  }

  bubble.addEventListener("click",()=>{
    if(armed) cancel();
    else arm();
  });

  chrome.runtime.onMessage.addListener((msg,_sender,sendResponse)=>{
    if(msg?.type==="TTL_PC_CAPTURE_DONE"){
      if(armed){
        bubble.style.visibility="visible";
        if(heldCandidateReady){
          const arrow=heldDirection==="UP"?"↑":"↓";
          setBubble("VERIFYING\nNEXT CANDLE");
        }else{
          setBubble("ANALYZING\nNEXT");
        }
      }
      return;
    }
    if(msg?.type==="TTL_PC_ARM"){
      arm().then(()=>sendResponse({ok:true}));
      return true;
    }
    if(msg?.type==="TTL_PC_STATUS"){
      sendResponse({ok:true,armed,analyzing,attempt});
      return;
    }
  });

  updateStatus({finalState:"READY"});
})();