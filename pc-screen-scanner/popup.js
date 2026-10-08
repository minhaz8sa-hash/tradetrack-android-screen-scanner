const state=document.getElementById("state");
const meta=document.getElementById("meta");
const signal=document.getElementById("signal");

function supported(url=""){
  try{
    const h=new URL(url).hostname.toLowerCase();
    return /(^|\.)(qxbroker\.com|quotex\.com|quotex\.io|market-qx\.trade|market-qx\.pro|market-qx\.info|qxbroker\.dev)$/.test(h);
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
    const entry=Date.parse(s.entryAt);
    signal.textContent=Date.now()>=entry ? "ENTRY WINDOW CLOSED — wait for a new scan" :
      "NEXT CANDLE "+(s.signalDirection||"")+"\n"+(s.asset||"")+"\nEntry "+new Date(entry).toLocaleTimeString()+"\nEnd "+new Date(s.expiresAt).toLocaleTimeString();
  }else if(s.lastScan){
    signal.textContent="Verifying next candle — wait for final signal";
  }else{
    signal.textContent=s.reason||s.lastError||"No scan running.";
  }
}

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
  const loc=await chrome.storage.local.get(["ttlPcScannerStatus"]);
  render(loc.ttlPcScannerStatus||{});
})();

chrome.storage.onChanged.addListener((changes,area)=>{
  if(area==="local"&&changes.ttlPcScannerStatus) render(changes.ttlPcScannerStatus.newValue||{});
});
const url=document.createElement('input'), token=document.createElement('input'),save=document.createElement('button');
url.placeholder='https://your-backend/analyze';token.placeholder='Scanner access token';token.type='password';save.textContent='Save backend settings';
for(const el of [url,token,save])document.body.appendChild(el);
chrome.storage.local.get(['backendUrl','scannerToken']).then(s=>{url.value=s.backendUrl||'';token.value=s.scannerToken||'';});
save.onclick=async()=>{try{const u=new URL(url.value);if(u.protocol!=='https:')throw Error();await chrome.permissions.request({origins:[u.origin+'/*']}).then(async granted=>{if(granted){await chrome.storage.local.set({backendUrl:url.value.trim(),scannerToken:token.value.trim()});meta.textContent='Backend settings saved';}});}catch{meta.textContent='Enter a valid HTTPS backend URL';}};
