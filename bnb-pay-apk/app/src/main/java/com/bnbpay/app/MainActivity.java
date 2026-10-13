package com.bnbpay.app;

import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity {
  private WebView webView;

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    webView = new WebView(this);
    setContentView(webView);

    WebSettings s = webView.getSettings();
    s.setJavaScriptEnabled(true);
    s.setDomStorageEnabled(true);
    s.setSupportZoom(false);
    s.setBuiltInZoomControls(false);
    s.setDisplayZoomControls(false);
    s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);

    webView.setWebViewClient(new WebViewClient());
    webView.setWebChromeClient(new WebChromeClient());

    String html = """
<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<style>
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}body{margin:0;background:#08090b;color:#f7f8fa;font-family:Arial,sans-serif}.app{min-height:100vh;padding:18px 16px 96px;background:radial-gradient(circle at 50% -10%,#2a2312 0,transparent 28%)}.top{display:flex;align-items:center;justify-content:space-between;height:54px}.brand{display:flex;align-items:center;gap:9px;font-weight:900;letter-spacing:.8px}.mark{width:24px;height:24px;position:relative;transform:rotate(45deg)}.mark i{position:absolute;width:9px;height:9px;background:#f6c847;border-radius:2px}.mark i:nth-child(1){left:0;top:0}.mark i:nth-child(2){right:0;top:0}.mark i:nth-child(3){right:0;bottom:0}.round{width:38px;height:38px;border:1px solid #282c33;border-radius:13px;display:grid;place-items:center;color:#f6c847;background:#121419}.card{background:linear-gradient(145deg,#1b1d22,#101216);border:1px solid #2b2e33;border-radius:26px;padding:21px;margin-top:10px}.muted{color:#8f96a3;font-size:12px}.balance{font-size:34px;font-weight:900;letter-spacing:-1px;margin:7px 0}.green{color:#35d18b}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin:14px 0}.action{border:1px solid #252931;background:#111318;color:white;border-radius:17px;padding:12px 4px;text-align:center}.action span{display:grid;place-items:center;margin:0 auto 7px;width:34px;height:34px;border-radius:12px;background:#211e13;color:#f6c847;font-size:18px}.action b{font-size:11px}.panel{background:#111318;border:1px solid #252931;border-radius:20px;padding:16px;margin-top:12px}.head{display:flex;align-items:end;justify-content:space-between}.k{color:#f6c847;font-size:9px;letter-spacing:1.4px;font-weight:900}.head h2{font-size:18px;margin:3px 0 7px}.asset{display:grid;grid-template-columns:auto 1fr auto;gap:11px;align-items:center;padding:12px 0;border-bottom:1px solid #20242a}.asset:last-child{border-bottom:0}.coin{width:39px;height:39px;border-radius:13px;background:#1f2228;display:grid;place-items:center;color:#f6c847;font-weight:900;font-size:11px}.asset b{font-size:13px}.asset small{display:block;color:#8f96a3;font-size:10px;margin-top:3px}.right{text-align:right}.nav{position:fixed;left:0;right:0;bottom:0;height:76px;background:#0c0d10f2;border-top:1px solid #24272d;display:grid;grid-template-columns:repeat(5,1fr);padding:8px 5px}.nav button{border:0;background:none;color:#707782;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px}.nav button.on{color:#f6c847}.nav b{font-size:9px}.pay{width:44px;height:44px;border-radius:15px;background:#f6c847;color:#13110a;display:grid;place-items:center;margin-top:-21px;font-size:18px}.screen{display:none}.screen.on{display:block}.title{padding:14px 3px}.title h1{font-size:29px;margin:4px 0}.title p{color:#8f96a3;font-size:12px;margin:0}.hero{text-align:center;padding:27px 18px}.orb{width:80px;height:80px;border-radius:28px;margin:0 auto 15px;display:grid;place-items:center;background:#201d13;color:#f6c847;font-size:30px}.btn{width:100%;height:48px;border:0;border-radius:14px;background:#f6c847;color:#15120b;font-weight:900;margin-top:9px}.notice{font-size:10px;color:#726c55;line-height:1.5;border:1px solid #332f20;background:#14130f;border-radius:15px;padding:12px;margin-top:13px}.modal{display:none;position:fixed;inset:0;background:#000a;z-index:20;align-items:flex-end}.modal.on{display:flex}.sheet{width:100%;background:#111318;border-radius:26px 26px 0 0;padding:20px}.sheet h2{margin:0 0 12px}.input{width:100%;height:48px;border:1px solid #2b3038;border-radius:14px;background:#171a20;color:white;padding:0 13px;margin:6px 0}.close{float:right;border:0;background:#202329;color:white;width:35px;height:35px;border-radius:11px}.demo{color:#8f96a3;font-size:10px;line-height:1.5}
</style></head><body>
<div class="app">
  <div class="top"><div class="round">BP</div><div class="brand"><div class="mark"><i></i><i></i><i></i></div>BNB PAY</div><div class="round">●</div></div>
  <section id="home" class="screen on">
    <div class="card"><div class="muted">Estimated balance · Demo</div><div class="balance">$12,846.20</div><div class="green" style="font-size:12px">+$283.74 · +2.26% today</div></div>
    <div class="grid">
      <button class="action" onclick="openAction('Send')"><span>↗</span><b>Send</b></button>
      <button class="action" onclick="openAction('Receive')"><span>↙</span><b>Receive</b></button>
      <button class="action" onclick="openAction('Pay')"><span>▣</span><b>Pay</b></button>
      <button class="action" onclick="openAction('Swap')"><span>⇄</span><b>Swap</b></button>
    </div>
    <div class="panel"><div class="head"><div><div class="k">PORTFOLIO</div><h2>My assets</h2></div></div>
      <div class="asset"><div class="coin">USDT</div><div><b>Tether</b><small>6,240.00 USDT</small></div><div class="right"><b>$6,240.00</b><small class="green">+0.01%</small></div></div>
      <div class="asset"><div class="coin">BTC</div><div><b>Bitcoin</b><small>0.0528 BTC</small></div><div class="right"><b>$3,894.12</b><small class="green">+2.81%</small></div></div>
      <div class="asset"><div class="coin">BNB</div><div><b>BNB</b><small>3.84 BNB</small></div><div class="right"><b>$2,214.76</b><small class="green">+1.92%</small></div></div>
      <div class="asset"><div class="coin">ETH</div><div><b>Ethereum</b><small>0.168 ETH</small></div><div class="right"><b>$497.32</b><small style="color:#ff6b6b">-0.76%</small></div></div>
    </div>
    <div class="notice">BNB PAY is an independent demo product. It is not Binance, not a Binance product, and no real funds are handled in this build.</div>
  </section>
  <section id="markets" class="screen"><div class="title"><div class="k">DISCOVER</div><h1>Markets</h1><p>Demo market view.</p></div><div class="panel">
    <div class="asset"><div class="coin">BTC</div><div><b>Bitcoin</b><small>BTC</small></div><div class="right"><b>$73,752.11</b><small class="green">+2.81%</small></div></div>
    <div class="asset"><div class="coin">ETH</div><div><b>Ethereum</b><small>ETH</small></div><div class="right"><b>$2,960.26</b><small style="color:#ff6b6b">-0.76%</small></div></div>
    <div class="asset"><div class="coin">SOL</div><div><b>Solana</b><small>SOL</small></div><div class="right"><b>$188.43</b><small class="green">+4.36%</small></div></div>
  </div></section>
  <section id="pay" class="screen"><div class="title"><div class="k">FAST PAYMENT</div><h1>BNB Pay</h1><p>Demo checkout and QR flow.</p></div><div class="panel hero"><div class="orb">▣</div><h2>Pay in seconds</h2><p class="muted">Confirm every demo payment before completion.</p><button class="btn" onclick="openAction('Pay')">Scan & Pay</button><button class="btn" style="background:#202329;color:white" onclick="openAction('Receive')">Show my QR</button></div></section>
  <section id="wallet" class="screen"><div class="title"><div class="k">YOUR FUNDS</div><h1>Wallet</h1><p>Demo balances only.</p></div><div class="card"><div class="muted">Total portfolio</div><div class="balance">$12,846.20</div><div class="muted">Available $12,510.60 · Locked $335.60</div></div><div class="panel"><div class="asset"><div class="coin">↙</div><div><b>Received USDT</b><small>Today · Demo transfer</small></div><div class="right green"><b>+$420.00</b></div></div><div class="asset"><div class="coin">↗</div><div><b>Sent BNB</b><small>Yesterday · Demo payment</small></div><div class="right"><b>-$82.40</b></div></div></div></section>
  <section id="profile" class="screen"><div class="title"><div class="k">ACCOUNT</div><h1>Profile</h1><p>Security-first demo settings.</p></div><div class="panel"><h2 style="margin:0">BNB PAY User</h2><p class="muted">Demo account · ID BP-2046</p></div><div class="notice"><b>Independent product notice</b><br>Not affiliated with Binance. This build does not request exchange passwords, private keys or seed phrases.</div></section>
</div>
<nav class="nav">
<button class="on" onclick="go('home',this)">⌂<b>Home</b></button>
<button onclick="go('markets',this)">⌁<b>Markets</b></button>
<button onclick="go('pay',this)"><span class="pay">▣</span><b>Pay</b></button>
<button onclick="go('wallet',this)">◫<b>Wallet</b></button>
<button onclick="go('profile',this)">◎<b>Profile</b></button>
</nav>
<div id="modal" class="modal" onclick="if(event.target===this)closeModal()"><div class="sheet"><button class="close" onclick="closeModal()">×</button><h2 id="mt">Action</h2><p class="demo">Demo mode: no blockchain transaction will be broadcast and no real funds will move.</p><input class="input" placeholder="Demo wallet / merchant"><input class="input" placeholder="Amount" inputmode="decimal"><button class="btn" onclick="done()">Confirm demo action</button></div></div>
<script>
function go(id,b){document.querySelectorAll('.screen').forEach(x=>x.classList.remove('on'));document.getElementById(id).classList.add('on');document.querySelectorAll('.nav button').forEach(x=>x.classList.remove('on'));b.classList.add('on')}
function openAction(t){document.getElementById('mt').textContent=t;document.getElementById('modal').classList.add('on')}
function closeModal(){document.getElementById('modal').classList.remove('on')}
function done(){document.getElementById('mt').textContent='Demo complete ✓';setTimeout(closeModal,800)}
</script></body></html>
""";
    webView.loadDataWithBaseURL("https://bnbpay.local/", html, "text/html", "UTF-8", null);
  }

  @Override
  public void onBackPressed() {
    if (webView != null && webView.canGoBack()) webView.goBack();
    else super.onBackPressed();
  }
}
