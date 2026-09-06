const asset=document.getElementById("asset");
const payout=document.getElementById("payout");
const state=document.getElementById("state");
const meta=document.getElementById("meta");
const signal=document.getElementById("signal");

function supported(url=""){
  try{
    const h=new URL(url).hostname.toLowerCase();
    return /(^|\.)(qxbroker\.com|quotex\.com|quotex\.io|market-qx\.trade|market-qx\.pro|qxbroker\.dev)$/.test(h);
  }catch{return false}
}

async function activeTab(){
  const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
  return tab||null;
}

async function render(s={}){
  state.textContent=s.finalState|| (s.armed?"ARMED":"READY");
  const tab=await activeTab();
  meta.textContent=tab&&supported(tab.url||"")
    ? "Quotex tab ready. Floating TT SCAN is active on the chart."
    : "Open a supported Quotex trading tab.";

  if(s.finalState==="SIGNAL"){
    signal.textContent="NEXT "+(s.signalDirection||s.heldDirection||"")+"\n↑"+(s.heldUp??"—")+"%  ↓"+(s.heldDown??"—")+"%";
  }else if(s.lastScan){
    signal.textContent="Scanning NEXT candle\n↑"+Math.round(s.lastScan.upConfirmation||50)+"%  ↓"+Math.round(s.lastScan.downConfirmation||50)+"%";
  }else{
    signal.textContent=s.reason||s.lastError||"No scan running.";
  }
}

document.getElementById("save").addEventListener("click",async()=>{
  await chrome.storage.local.set({
    assetOverride:asset.value.trim(),
    payoutOverride:payout.value.trim()
  });
  state.textContent="SETTINGS SAVED";
});

document.getElementById("arm").addEventListener("click",async()=>{
  const tab=await activeTab();
  if(!tab?.id||!supported(tab.url||"")){
    meta.textContent="Open Quotex trading terminal first.";
    return;
  }
  chrome.tabs.sendMessage(tab.id,{type:"TTL_PC_ARM"},response=>{
    if(chrome.runtime.lastError){
      meta.textContent="Reload the Quotex tab once, then try again.";
      return;
    }
    state.textContent=response?.ok?"ARMED":"ERROR";
  });
});

(async()=>{
  const loc=await chrome.storage.local.get(["assetOverride","payoutOverride","ttlPcScannerStatus"]);
  asset.value=loc.assetOverride||"";
  payout.value=loc.payoutOverride||"";
  render(loc.ttlPcScannerStatus||{});
})();

chrome.storage.onChanged.addListener((changes,area)=>{
  if(area==="local"&&changes.ttlPcScannerStatus) render(changes.ttlPcScannerStatus.newValue||{});
});