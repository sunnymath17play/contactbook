/* ============================================================
   🏆 影片教室「看完小挑戰」（樹洞 whisper.html 載入）
   看完影片 → 浩克出 2 題同型題 → 全對拿獎狀；一個單元的影片全過 → 大獎狀
   答錯：第一次給提示＋「回去看這一段」（影片跳到講這個觀念的那幾句，播完自動回來）
         第二次就公布答案和說明，這支影片這次不算過關，可以再挑戰
   題目在 window.CHALLENGES（challenge/data.js，由 程式碼\影片小挑戰\build.cjs 產生）
   過關紀錄存在這支手機（localStorage wh_ch_pass），也用「班級＋名字」同步到樹洞後台（whisper.html 的 WH_SYNC），換平板也接得上
   ============================================================ */
(function(){
const lsGet0 = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
if (/[?&]chtest=1/.test(location.search)) try { localStorage.setItem("wh_chtest", "1"); } catch (e) {}
if (/[?&]chtest=0/.test(location.search)) try { localStorage.setItem("wh_chtest", ""); } catch (e) {}
const TESTER = lsGet0("wh_chtest") === "1";
// 題目檔寫 "draft": true ＝ SUNNY 還沒審：只有測試連結（&chtest=1）看得到，孩子看不到
const D = Object.fromEntries(Object.entries(window.CHALLENGES || {}).filter(([, c]) => !c.draft || TESTER));
const $ = id => document.getElementById(id);
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
const IMG = "challenge/img/";
const passed = () => { try { return JSON.parse(lsGet("wh_ch_pass") || "{}"); } catch (e) { return {}; } };
const savePass = id => { const p = passed(); p[id] = p[id] || new Date().toISOString().slice(0, 10); lsSet("wh_ch_pass", JSON.stringify(p)); sync(); };
const sync = () => { if (window.WH_SYNC) window.WH_SYNC(); };   // 過關紀錄送到樹洞後台（換平板也接得上）
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const allVids = () => { try { return VIDS; } catch (e) { return []; } };   // 樹洞的影片清單（這個班現在年級）

// ---------- YouTube 播放器（要能知道「播完了」、能跳到某一秒） ----------
let api = null, yt = null, cur = null, seg = null, segTimer = null;
function loadAPI(){
  if (api) return api;
  api = new Promise(res => {
    if (window.YT && YT.Player) return res();
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev && prev(); res(); };
    const s = document.createElement("script"); s.src = "https://www.youtube.com/iframe_api"; document.head.appendChild(s);
  });
  return api;
}

// 樹洞 play() 呼叫：有小挑戰的影片改用這個播放器
async function mount(id, v){
  stopSeg(); hide();
  cur = { id, c: D[id], v };
  // 2026-10-31 改版：題目＋出處兩行（whisper.html 的 nowTitle），右邊一顆大大的「看完小挑戰」
  $("vplayer").innerHTML = `<div id="chYT"></div>
    <div class="now chnow">${window.nowTitle ? nowTitle(v) : `<span class="nt"><b>${esc(v.title)}</b></span>`}
      <button type="button" class="chgo" id="chGo"><img src="th/trophy.png" alt="">${passed()[id] ? "再挑戰一次" : "看完小挑戰"}</button></div>`;
  $("chGo").onclick = () => intro();
  if (window.LOCAL_VIDS && LOCAL_VIDS.includes(id)) return mountFile(id);
  await loadAPI();
  if (!cur || cur.id !== id) return;
  yt = new YT.Player("chYT", {
    host: "https://www.youtube-nocookie.com", videoId: id,
    playerVars: { autoplay: 1, rel: 0, playsinline: 1, modestbranding: 1 },
    events: { onStateChange: e => { if (e.data === 0 && !seg && cur && cur.id === id && !$("vroom").classList.contains("chal-on")) intro(); } }
  });
  // 沒有高畫質檔、用 YouTube 播的：平板可能很糊 → 給「用 YouTube 看」按鈕
  const now = document.querySelector("#vplayer .chnow span");
  if (now && !now.querySelector(".ytout")) now.insertAdjacentHTML("beforeend", `<a class="ytout" href="https://youtu.be/${encodeURIComponent(id)}" target="_blank" rel="noopener">📺 畫面不清楚？用 YouTube 看</a>`);
}
// 有高畫質影片檔（v/<編號>.mp4）：直接用 <video> 播（平板才不會糊），包成跟 YouTube 播放器一樣的用法；檔案壞了就退回 YouTube
function mountFile(id){
  const box = $("chYT");
  box.outerHTML = `<video id="chYT" src="v/${encodeURIComponent(id)}.mp4" controls autoplay playsinline preload="auto"></video>`;
  const v = $("chYT");
  yt = { seekTo: t => { v.currentTime = t; }, playVideo: () => { const p = v.play(); p && p.catch(() => {}); }, pauseVideo: () => v.pause(),
    getCurrentTime: () => v.currentTime, getPlayerState: () => v.ended ? 0 : v.paused ? 2 : 1, destroy: () => { v.pause(); v.removeAttribute("src"); v.load(); } };
  if (window.trackPos) trackPos(v, id);   // 記住看到哪一秒（影片教室最上面「上次看到一半」）
  v.addEventListener("ended", () => { if (!seg && cur && cur.id === id && !$("vroom").classList.contains("chal-on")) intro(); });
  v.addEventListener("error", async () => {
    if (!cur || cur.id !== id || !$("vplayer").contains(v)) return;
    v.outerHTML = `<div id="chYT"></div>`; yt = null;
    window.LOCAL_VIDS = LOCAL_VIDS.filter(x => x !== id); mount(id, cur.v);
  });
}

// ---------- 小挑戰面板（蓋住下面的影片清單，影片留在上面） ----------
function panel(html, full){
  let p = $("chal");
  if (!p) { p = document.createElement("div"); p.id = "chal"; p.className = "chal"; $("vroom").appendChild(p); }
  p.innerHTML = `<div class="chwrap">${html}<img class="chbrand" src="${IMG}logo.png" alt="SUNNY 魔法數學"></div>`;   // 品牌：小小放在最下面，不搶戲
  $("vroom").classList.add("chal-on"); $("vroom").classList.toggle("chal-full", !!full); p.scrollTop = 0;
  return p;
}
function hide(){ $("vroom").classList.remove("chal-on", "chal-full"); const p = $("chal"); if (p) p.innerHTML = ""; }
const face = (n, cls = "") => `<img class="chface ${cls}" src="${IMG}face_${n}.png" alt="浩克">`;
const say = (n, t) => `<div class="chsay">${face(n)}<div class="chbub">${t}</div></div>`;

function intro(){
  if (!cur) return;
  const c = cur.c, again = !!passed()[cur.id];
  try { yt && yt.pauseVideo && yt.pauseVideo(); } catch (e) {}
  cur.i = 0; cur.res = []; cur.tries = 0;
  panel(`<div class="chtop"><img class="chic" src="th/trophy.png" alt="">看完小挑戰</div>
    ${say("wink", `看完了嗎？<br>浩克要考你 <b>${c.qs.length} 題</b>，${again ? "你已經過關了，再來一次也可以喔！" : "全部答對就拿<b>獎狀</b>！"}`)}
    <button type="button" class="chbtn big" id="chStart">開始挑戰</button>
    <button type="button" class="chlink" id="chLater">先不要，回影片清單</button>`);
  $("chStart").onclick = ask;
  $("chLater").onclick = hide;
}

function ask(){
  const c = cur.c, q = c.qs[cur.i];
  if (!cur.tries) cur.order = q.choices ? shuffle(q.choices) : null;
  cur.wrong = cur.wrong && cur.tries ? cur.wrong : [];
  const dots = c.qs.map((_, k) => `<i class="${k < cur.i ? (cur.res[k] ? "ok" : "no") : k === cur.i ? "now" : ""}"></i>`).join("");
  panel(`<div class="chtop"><img class="chic" src="th/trophy.png" alt="">小挑戰　第 ${cur.i + 1} 題／共 ${c.qs.length} 題<span class="chdots">${dots}</span></div>
    ${q.svg ? `<div class="chfig">${q.svg}</div>` : ""}
    <div class="chq">${esc(q.q).replace(/\n/g, "<br>")}</div>
    ${cur.tries ? `<div class="chagain">看完了，再答一次！</div>` : ""}
    ${q.choices
      ? `<div class="chch">${cur.order.map(t => `<button type="button" class="chopt" data-a="${esc(t)}" ${cur.wrong.includes(t) ? "disabled" : ""}>${esc(t)}</button>`).join("")}</div>`
      : `<form class="chnum" id="chNum"><input id="chIn" type="text" inputmode="decimal" autocomplete="off" placeholder="答案"><span>${esc(q.unit || "")}</span><button type="submit" class="chbtn">送出</button></form>`}
    <button type="button" class="chlink" id="chMean">我看不懂題目意思</button>
    <div class="chmean" id="chMeanBox" hidden>${face("hi", "sm")}<div>${esc(q.meaning)}</div></div>`);
  $("chMean").onclick = () => { $("chMeanBox").hidden = !$("chMeanBox").hidden; };
  if (q.choices) document.querySelectorAll(".chopt").forEach(b => b.onclick = () => check(b.dataset.a, b));
  else $("chNum").onsubmit = e => { e.preventDefault(); const a = $("chIn").value.trim(); if (a) check(a); };
}
// 打數字的題目：全形數字轉半形、去掉逗號，孩子多打了單位（120元）也算對，比數值（60.0＝60）
const toNum = s => { const m = String(s).replace(/[０-９．]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0)).replace(/[,，\s]/g, "").match(/^-?\d+(\.\d+)?/); return m ? +m[0] : NaN; };
const same = (a, b) => String(a).replace(/\s/g, "") === String(b).replace(/\s/g, "") || (/^-?\d+(\.\d+)?$/.test(String(b)) && toNum(a) === +b);

function check(a, btn){
  const q = cur.c.qs[cur.i];
  if (same(a, q.answer)) { cur.res[cur.i] = true; return right(q); }
  cur.tries++; cur.wrong.push(a);
  if (btn) btn.classList.add("bad");
  setTimeout(() => cur.tries === 1 ? hint(q) : reveal(q), btn ? 450 : 0);
}
function right(q){
  const last = cur.i === cur.c.qs.length - 1;
  panel(`<div class="chtop"><img class="chic" src="th/trophy.png" alt="">小挑戰　第 ${cur.i + 1} 題</div>
    ${say("yay", `<b class="chbig">答對了！</b><br>${esc(q.explain)}`)}
    <button type="button" class="chbtn big" id="chNext">${last ? "看結果 ›" : "下一題 ›"}</button>`);
  $("chNext").onclick = next;
}
function hint(q){
  const secs = Math.round(q.back.to - q.back.from);
  panel(`<div class="chtop"><img class="chic" src="th/trophy.png" alt="">小挑戰　第 ${cur.i + 1} 題</div>
    ${say("think", `<b class="chbig">差一點點！</b><br>${esc(q.hint)}`)}
    <button type="button" class="chbtn big" id="chBack">回去看這一段（約 ${secs} 秒）</button>
    <button type="button" class="chlink" id="chRetry">我再想一次</button>`);
  $("chBack").onclick = () => replay(q);
  $("chRetry").onclick = ask;
}
function reveal(q){
  cur.res[cur.i] = false;
  const last = cur.i === cur.c.qs.length - 1;
  panel(`<div class="chtop"><img class="chic" src="th/trophy.png" alt="">小挑戰　第 ${cur.i + 1} 題</div>
    ${say("oh", `答案是「<b>${esc(q.answer)}</b>」<br>${esc(q.explain)}`)}
    <button type="button" class="chbtn big" id="chNext">${last ? "看結果 ›" : "下一題 ›"}</button>`);
  $("chNext").onclick = next;
}
function next(){
  cur.tries = 0; cur.wrong = [];
  if (++cur.i < cur.c.qs.length) return ask();
  finish();
}

// ---------- 答錯 → 回去看那一段，播完自動回到題目 ----------
function replay(q){
  seg = q;
  panel(`<div class="chtop">重看這一段</div>
    ${say("hi", "專心看上面的影片！<br>看完會自動回到題目。")}
    <button type="button" class="chlink" id="chSegDone">看完了，回去答題</button>`);
  $("chSegDone").onclick = endSeg;
  try { yt.seekTo(q.back.from, true); yt.playVideo(); } catch (e) {}
  segTimer = setInterval(() => {
    try { if (yt.getCurrentTime() >= q.back.to || yt.getPlayerState() === 0) endSeg(); } catch (e) {}
  }, 250);
}
function stopSeg(){ clearInterval(segTimer); segTimer = null; seg = null; }
function endSeg(){ stopSeg(); try { yt.pauseVideo(); } catch (e) {} ask(); }

// ---------- 結果：全對 → 獎狀 ----------
function finish(){
  const ok = cur.res.every(Boolean);
  if (!ok) {
    panel(`<div class="chtop"><img class="chic" src="th/trophy.png" alt="">小挑戰結果</div>
      ${say("hi", `答對 <b>${cur.res.filter(Boolean).length}</b> 題／共 ${cur.res.length} 題<br>再看一次影片，再挑戰一次，全對就能拿<b>獎狀</b>！`)}
      <button type="button" class="chbtn big" id="chAgain">再挑戰一次</button>
      <button type="button" class="chlink" id="chWatch">重看整支影片</button>`);
    $("chAgain").onclick = intro;
    $("chWatch").onclick = () => { hide(); try { yt.seekTo(0, true); yt.playVideo(); } catch (e) {} };
    return;
  }
  savePass(cur.id);
  const btn = $("chGo"); if (btn) btn.innerHTML = '<img src="th/trophy.png" alt="">再挑戰一次';
  const name = (lsGet("wh_name") || "").trim();
  if (!name) return askName();
  showCert(name);
}
function askName(){
  panel(`<div class="chtop"><img class="chic" src="th/medal.png" alt="">全部答對！</div>
    ${say("yay", "太厲害了！獎狀上要寫什麼名字？")}
    <form class="chnum" id="chName"><input id="chNm" type="text" maxlength="12" placeholder="你的名字"><button type="submit" class="chbtn">拿獎狀</button></form>`);
  $("chName").onsubmit = e => { e.preventDefault(); const n = $("chNm").value.trim(); if (!n) return; lsSet("wh_name", n); const f = document.getElementById("name"); if (f) f.value = n; sync(); showCert(n); };
}

// 獎狀用阿居畫的底圖，名字和影片名稱用程式寫上去 → 變成一張圖，孩子可以長按存起來
function loadImg(src){ return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; }); }
// 每張獎狀底圖的字要排在哪（比例＝佔整張寬高的幾成）
// 小獎狀：阿居 2026-10-26 畫的影片小挑戰專屬獎狀（浩克在右下；字置中一欄；LOGO 左上角；署名只寫 SUNNY）
const LAYOUT = {
  small: { img: "cert_video.jpg", title: "獎　狀", tc: "#E0731B", y: [0.28, 0.385, 0.42, 0.48, 0.535, 0.595], logo: [0.14, 0.165, 0.22], date: ["c", 0.665, 0.70], sign: "SUNNY" },
  grand: { sign: "SUNNY", img: "cert_grand.jpg", title: "大 獎 狀", tc: "#B8460B", y: [0.27, 0.40, 0.435, 0.50, 0.56, 0.63], logo: [0.135, 0.665, 0.26], date: [0.15, 0.77, 0.81] },
  // 單元專用大獎狀（阿居畫；沒有專用的單元就用上面通用的 grand）
  grand_三角形: { img: "cert_grand_三角形.jpg", title: "大 獎 狀", tc: "#B8460B", y: [0.30, 0.385, 0.415, 0.465, 0.505, 0.55], logo: [0.19, 0.19, 0.2], date: ["c", 0.595, 0.625], sign: "SUNNY" },
  grand_角度: { img: "cert_grand_角度.jpg", title: "大 獎 狀", tc: "#B8460B", y: [0.29, 0.375, 0.405, 0.45, 0.49, 0.53], logo: [0.19, 0.19, 0.2], date: ["c", 0.57, null], sign: "SUNNY" },
  grand_除法: { img: "cert_grand_除法.jpg", title: "大 獎 狀", tc: "#B8460B", y: [0.30, 0.385, 0.415, 0.465, 0.505, 0.55], logo: [0.19, 0.19, 0.2], date: ["c", 0.595, 0.625], sign: "SUNNY" },
  grand_角: { img: "cert_grand_角.jpg", title: "大 獎 狀", tc: "#B8460B", y: [0.29, 0.375, 0.405, 0.45, 0.49, 0.53], logo: [0.19, 0.19, 0.2], date: ["c", 0.57, null], sign: "SUNNY" },
  grand_加與減: { img: "cert_grand_加與減.jpg", title: "大 獎 狀", tc: "#B8460B", y: [0.30, 0.385, 0.415, 0.465, 0.505, 0.55], logo: [0.235, 0.2, 0.19], date: ["c", 0.595, 0.625], sign: "SUNNY" },
};
async function drawCert({ grand, unit, name, line1, line2 }){
  const L = grand ? (LAYOUT["grand_" + unit] || LAYOUT.grand) : LAYOUT.small, bg = await loadImg(IMG + L.img);
  const W = bg.naturalWidth, H = bg.naturalHeight, cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const x = cv.getContext("2d"); x.drawImage(bg, 0, 0);
  const F = '"Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif', cx = W / 2, Y = L.y.map(v => v * H);
  x.textAlign = "center"; x.textBaseline = "middle";
  const fit = (t, size, maxW, weight = 900) => { let s = size; do { x.font = `${weight} ${s}px ${F}`; s -= 2; } while (x.measureText(t).width > maxW && s > 20); };
  x.fillStyle = L.tc; fit(L.title, W * 0.11, W * 0.7); x.fillText(L.title, cx, Y[0]);
  x.fillStyle = "#3B2A1A"; fit(name, W * 0.085, W * 0.66); x.fillText(name, cx, Y[1]);
  x.strokeStyle = "#F2B33D"; x.lineWidth = 4; x.beginPath(); x.moveTo(cx - W * 0.28, Y[2]); x.lineTo(cx + W * 0.28, Y[2]); x.stroke();
  x.fillStyle = "#4A3B2C";
  fit(line1, W * 0.05, W * 0.66, 800); x.fillText(line1, cx, Y[3]);
  fit(line2, W * 0.05, W * 0.66, 800); x.fillText(line2, cx, Y[4]);
  fit("特頒此狀，以資鼓勵！", W * 0.045, W * 0.66, 800); x.fillText("特頒此狀，以資鼓勵！", cx, Y[5]);
  // 品牌 LOGO（正式水滴版）：小獎狀放左上角，大獎狀放署名上方
  try { const lg = await loadImg(IMG + "logo.png"), lw = W * L.logo[2]; x.drawImage(lg, L.logo[0] === "c" ? cx - lw / 2 : W * L.logo[0], H * L.logo[1], lw, lw * lg.naturalHeight / lg.naturalWidth); } catch (e) {}
  const d = new Date();
  const dx = L.date[0] === "c" ? cx : W * L.date[0];
  x.fillStyle = "#7A6550"; fit("x", W * 0.034, W, 700); x.textAlign = L.date[0] === "c" ? "center" : "left";
  const ds = `${d.getFullYear() - 1911} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`;
  // 日期第二格是 null ＝ 日期和署名寫在同一行（浩克手上道具比較高的獎狀）
  if (L.date[2] == null) x.fillText(`${ds}　${L.sign}`, dx, H * L.date[1]);
  else { x.fillText(ds, dx, H * L.date[1]); x.fillText(L.sign, dx, H * L.date[2]); }
  return cv.toDataURL("image/jpeg", 0.9);
}
function unitDone(unit){
  // 這個單元在影片教室的每一支影片都有小挑戰、而且都過關了 → 大獎狀
  const vs = allVids().filter(v => (v.unit || "") === unit);
  const p = passed();
  return vs.length > 1 && vs.every(v => D[v.id] && p[v.id]);
}
async function showCert(name){
  try { yt && yt.pauseVideo && yt.pauseVideo(); } catch (e) {}
  const c = cur.c;
  panel(`<div class="chtop"><img class="chic" src="th/medal.png" alt="">全部答對！拿到獎狀了</div><div class="chcert"><div class="chload">獎狀製作中…</div></div>`, true);
  const url = await drawCert({ name, line1: `看完「${c.title}」`, line2: "小挑戰全部答對" });
  const grand = unitDone(c.unit) && !passed()["__grand_" + c.unit];
  panel(`<div class="chtop"><img class="chic" src="th/medal.png" alt="">全部答對！拿到獎狀了</div>
    <div class="chcert"><img src="${url}" alt="獎狀"></div>
    <div class="chtip">長按獎狀可以存到手機，拿給爸爸媽媽看！</div>
    ${grand ? `<button type="button" class="chbtn big gold" id="chGrand"><img class="chic" src="th/medal.png" alt="">「${esc(c.unit)}」全部過關！領大獎狀</button>` : ""}
    <button type="button" class="chlink" id="chDone">回影片清單</button>`, true);
  if (grand) $("chGrand").onclick = () => showGrand(name, c.unit);
  $("chDone").onclick = done;
}
async function showGrand(name, unit){
  const p = passed(); p["__grand_" + unit] = p["__grand_" + unit] || new Date().toISOString().slice(0, 10); lsSet("wh_ch_pass", JSON.stringify(p)); sync();
  panel(`<div class="chtop"><img class="chic" src="th/medal.png" alt="">單元全部過關！</div><div class="chcert"><div class="chload">大獎狀製作中…</div></div>`, true);
  const n = allVids().filter(v => (v.unit || "") === unit).length;
  const url = await drawCert({ grand: true, unit, name, line1: `「${unit}」${n} 支影片`, line2: "小挑戰全部過關" });
  panel(`<div class="chtop"><img class="chic" src="th/medal.png" alt="">單元全部過關！</div>
    <div class="chcert"><img src="${url}" alt="大獎狀"></div>
    <div class="chtip">長按大獎狀可以存到手機，拿給 SUNNY 看！</div>
    <button type="button" class="chlink" id="chDone">回影片清單</button>`, true);
  $("chDone").onclick = done;
}
function done(){ hide(); if (typeof drawRoom === "function") drawRoom(); }

// 清單上的小標籤：有小挑戰／已過關
function badge(id){
  if (!D[id]) return "";
  return passed()[id] ? '<span class="chtag ok">🏅 過關</span>' : '<span class="chtag">🏆 小挑戰</span>';
}
// 首頁單元方塊上的小字：這個單元有幾部有小挑戰／過關幾部
function tileNote(vs){
  const has = vs.filter(v => D[v.id]); if (!has.length) return "";
  const ok = has.filter(v => passed()[v.id]).length;
  return ok === has.length ? `<span class="chtile ok">🏅 小挑戰全過關</span>`
    : `<span class="chtile">🏆 ${has.length} 部有小挑戰${ok ? `・過關 ${ok}` : ""}</span>`;
}
function close(){ stopSeg(); hide(); cur = null; try { yt && yt.destroy && yt.destroy(); } catch (e) {} yt = null; }

// TRIAL＝整個功能試用（目前已正式開放＝false）；單支影片還沒審用題目檔的 draft
const TRIAL = false;
// stat：這支影片的小挑戰狀態（pass 過關／todo 還沒過／"" 沒有小挑戰）；unitStat：一個單元有幾支有小挑戰、過關幾支；certs：拿到幾張獎狀（含大獎狀）
const stat = id => !D[id] ? "" : passed()[id] ? "pass" : "todo";
const unitStat = vs => { const has = vs.filter(v => D[v.id]); return { has: has.length, ok: has.filter(v => passed()[v.id]).length }; };
const certs = () => Object.keys(passed()).length;
if (!TRIAL || TESTER) window.CHAL = { has: id => !!D[id], mount, badge, tileNote, close, stat, unitStat, certs };
})();
