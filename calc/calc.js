/* ============================================================
   🧮 樹洞「計算挑戰」（三、四年級，2026-11-03 SUNNY 的點子）
   每天 5 題，一格一格填方格直式；第一次按「完成」就對才算「連續答對」，錯了歸零
   第一次錯：紅格子＋一句提示（進位照 SUNNY「記在手上」，不畫小小進位數字）；第二次錯：一步一步動畫教
   當天 5 題全對：獎勵動畫＋蓋一個浩克章；連續答對 200 題：計算王獎狀（請找 SUNNY 領取獎品，一人最多 2 張）
   題目、批改：calc_core.js（和紙本小卡、樹洞後台同一份）；連續題數、獎狀都由後台算（mode=calc／calc_state）
   原始碼在 程式碼\計算挑戰\，node build.cjs 複製到 contactbook\calc\
   ============================================================ */
(function(){
const CALC_OPEN = true;    // 2026-11-04 SUNNY：可以上架了（三、四年級孩子都看得到）
const CALC_GRADES = [3, 4];
const IMG = "calc/img/";
const lsG = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsS = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
const el = id => document.getElementById(id);
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
// 測試連結 &chtest=1：計算挑戰自己記住（不靠影片小挑戰）
if (/[?&]chtest=1/.test(location.search)) lsS("wh_chtest", "1");
const TESTER = lsG("wh_chtest") === "1";
// 測試連結打開卻沒出現 → 畫面上方顯示原因（給 SUNNY 截圖給浩克看）
const why = m => { if (!/[?&]chtest=1/.test(location.search)) return; const d = document.createElement("div"); d.style.cssText = "position:fixed;left:8px;right:8px;top:8px;z-index:99;background:#C0392B;color:#fff;padding:10px 12px;border-radius:12px;font:700 15px sans-serif"; d.textContent = "計算挑戰沒有打開：" + m + "（版本 2026-11-04b）"; document.body.appendChild(d); };
if (typeof CH === "undefined" || !CH) { why("連結裡的班級代號不對"); return; }
if (typeof CalcCore === "undefined") { why("出題程式沒有載入，請重新整理"); return; }
const GRADE = 3 + (schoolYear() - CH.y);
if (CALC_GRADES.indexOf(GRADE) < 0) { why("這個班不是三、四年級"); return; }
if (!CALC_OPEN && !TESTER) { why("測試記號沒有存起來（瀏覽器可能是無痕模式）"); return; }
if (qs("preview") === "1") return;
const C = window.CalcCore, CHEER = window.CALC_CHEER || { ok: ["答對了！"], streak: [], reset: ["沒關係，再來一次！"], stamp: ["今天 5 題全對！"] };
const RULES = [
  "每天 5 題；做完就要等明天才有新題目。",
  "每一題<b>第一次按「完成」就對</b>，才算「連續答對」。第一次錯，連續題數就從 0 重新算（看提示改對也一樣）。",
  "連續答對 <b>200 題</b> → 得到「計算王獎狀」，請找 SUNNY 領取獎品。",
  "拿到獎狀後，連續題數從 0 重新開始；<b>每個人最多領 2 次獎品</b>。",
  "哪一天沒做不會歸零，只有算錯才會歸零。",
  "要打自己的本名；換手機、換平板，紀錄都接得上。",
];
const STAMPS = 12;   // 浩克章 stamp_1.png ~ stamp_12.png（阿居畫），照順序輪流蓋

// ---------- 首頁方塊（放在影片教室、寵物蛋下面） ----------
const tile = document.createElement("button");
tile.type = "button"; tile.className = "ctile hop"; tile.id = "ctile";
tile.innerHTML = `<img class="ic" src="${IMG}tile.png" alt="" onerror="this.style.visibility='hidden'"><span class="tx"><b>計算挑戰</b><small id="ctileSub">每天 5 題，挑戰連續答對！</small></span><span class="go">›</span>`;
// 排版（SUNNY 2026-11-04：計算挑戰和影片教室都是正事，放在一起）：
// 第一排「影片教室｜計算挑戰」並排；寵物蛋（好玩的）移到下面變成一條
const tiles = el("tiles");
if (tiles) {
  const vids = el("videos"); if (vids) vids.insertAdjacentElement("afterend", tile); else tiles.appendChild(tile);
  tiles.classList.add("two");
  const pt = el("ptile"); if (pt) { tiles.insertAdjacentElement("afterend", pt); pt.classList.add("solo"); }
}
tile.onclick = () => openRoom();
// 影片教室裡也放入口（平板 QR code &v=1 會直接進影片教室，看不到樹洞首頁）
const vbar = document.createElement("button");
vbar.type = "button"; vbar.className = "cvbar";
vbar.innerHTML = `<img src="${IMG}tile.png" alt=""><span><b>計算挑戰</b><small id="cvbarSub">每天 5 題，挑戰連續答對！</small></span><i>›</i>`;
vbar.onclick = () => openRoom();
const vbody = el("vbody"); if (vbody) { const pc = el("petcard3"); if (pc) vbody.insertBefore(vbar, pc); else vbody.prepend(vbar); }

const room = document.createElement("div");
room.className = "vroom croom"; room.id = "croom";
room.innerHTML = `<div class="vbar"><button class="vback" id="cback">← 回樹洞</button><h2>計算挑戰</h2></div><div class="cbody" id="cbody"><div class="cwrap" id="cwrap"></div></div>`;
document.body.appendChild(room);
el("cback").onclick = () => history.back();
window.addEventListener("popstate", () => { if (room.classList.contains("show")) closeRoom(); });

let S = null;          // 後台回來的狀態
let Q = null;          // 正在做的這一題 { idx, p, kid, act:[r,c], attempt, wrong:Set, done }
let SET = null;        // 今天的 5 題
const myName = () => (lsG("wh_name") || "").trim();

async function api(params, body) {
  const url = ENDPOINT + "?" + new URLSearchParams(params).toString();
  const r = body ? await fetch(ENDPOINT, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(body) }) : await fetch(url);
  return r.json();
}
async function loadState() {
  const nm = myName(); if (!nm) { S = { err: "no_name" }; return; }
  try { S = await api({ mode: "calc_state", class: CH.id, name: nm }); } catch (e) { S = { err: "net" }; }
  if (S && S.ok) { SET = C.dailySet(S.grade, S.date, S.key); updateTile(); }
}
function updateTile() {
  const sub = el("ctileSub"); if (!sub || !S || !S.ok) return;
  sub.textContent = S.first.length >= S.perDay ? `今天做完了！連續答對 ${S.streak} 題` : `連續 ${S.streak}／${S.goal} 題・今天還有 ${S.perDay - S.first.length} 題`;
  const vs = el("cvbarSub"); if (vs) vs.textContent = sub.textContent;
}
function openRoom() { room.classList.add("show"); history.pushState({ c: 1 }, ""); Q = null; drawHome(true); }
function closeRoom() { room.classList.remove("show"); Q = null; updateTile(); }

// ---------- 首頁：連續題數、今天進度、集章卡、獎狀 ----------
async function drawHome(reload) {
  room.classList.remove("qmode"); if (Q) { Q.teachUI = null; }
  const w = el("cwrap");
  if (reload || !S) { w.innerHTML = `<div class="cload">浩克拿題目中…</div>`; await loadState(); }
  if (!S || !S.ok) {
    const msg = { no_name: "先回樹洞首頁，在「我是＿＿」打上你的本名，再來挑戰喔！", not_roster: "浩克找不到你的名字，請打本名（例如：王小明），或問 SUNNY。", net: "網路好像斷了，等一下再點一次。" }[S && S.err] || "現在打不開，等一下再試試。";
    if (S && (S.err === "no_name" || S.err === "not_roster")) {
      w.innerHTML = `<div class="cmsg">${S.err === "no_name" ? "你好！先打上你的<b>本名</b>，浩克才知道是誰在挑戰喔！" : "浩克找不到這個名字，請打<b>本名</b>（例如：王小明）。"}</div>
        <div class="cname"><input id="cnameIn" maxlength="10" placeholder="打你的本名" autocomplete="off" value="${esc(S.err === "not_roster" ? myName() : "")}"><button class="cbtn" id="cnameOk">好！</button></div>
        <div class="csmall">換平板、換手機，打一樣的名字，紀錄都會接上。</div>`;
      const go = () => { const v = el("cnameIn").value.trim(); if (!v) return; if (typeof setMyName === "function") setMyName(v); else lsS("wh_name", v); drawHome(true); };
      el("cnameOk").onclick = go; el("cnameIn").onkeydown = e => { if (e.key === "Enter") go(); };
      return;
    }
    w.innerHTML = `<div class="cmsg">${msg}</div><button class="cbtn" id="cretry">再試一次</button>`;
    el("cretry").onclick = () => drawHome(true); return;
  }
  const doneN = S.first.length, left = S.perDay - doneN, pct = Math.min(100, Math.round(S.streak / S.goal * 100));
  const dots = Array.from({ length: S.perDay }, (_, i) => `<i class="${i < doneN ? (S.first[i] ? "ok" : "no") : i === doneN ? "now" : ""}"></i>`).join("");
  w.innerHTML = `
    <div class="cstreak"><div class="cnum"><small>已經連續答對</small><b>${S.streak}</b><small>題</small></div>
      <div class="cbar"><i style="width:${pct}%"></i></div><div class="cgoal">連續答對 ${S.goal} 題 → 計算王獎狀（還差 ${Math.max(0, S.goal - S.streak)} 題）</div>
      <div class="ccheer">${esc(homeCheer())}</div></div>
    <div class="ctoday"><div class="ct">今天的 5 題 <span class="cdots">${dots}</span></div>
      ${left > 0 ? `<button class="cbtn big" id="cgo">${doneN ? `繼續第 ${doneN + 1} 題` : "開始今天的 5 題"}</button>` : `<div class="cdone">今天做完了！明天再來挑戰 💪</div>`}</div>
    <div class="ccard"><div class="ct">我的集章卡 <small>（5 題全對蓋一個章）</small></div><div class="cstamps">${stampsHTML()}</div></div>
    <div class="ccard"><div class="ct">計算王獎狀 <small>已拿到 ${S.certs.length}／${S.maxCert} 張</small></div>
      ${S.certs.length ? S.certs.map(c => `<button class="ccert" data-n="${c.n}">🏆 第 ${c.n} 張（${c.date.slice(5).replace("-", "/")}）</button>`).join("") : `<div class="csmall">連續答對 ${S.goal} 題就能拿到，再找 SUNNY 領獎品！</div>`}</div>
    <div class="cfoot"><button class="crule" id="crule">📜 挑戰規則</button><button class="crule" id="cpad">📲 用平板做</button></div>`;
  if (el("cgo")) el("cgo").onclick = () => startQ(doneN + 1);
  el("crule").onclick = showRules;
  el("cpad").onclick = showPad;
  w.querySelectorAll(".ccert").forEach(b => b.onclick = () => showCert(+b.dataset.n));
  if (!lsG("wh_calc_rules")) { lsS("wh_calc_rules", "1"); showRules(); }
}
function homeCheer() {
  if (!S.streak && !S.best) return "從第 1 題開始累積吧！在紙上慢慢算。";
  if (!S.streak && S.certs.length && S.first.length && S.first[S.first.length - 1] === 1) return S.certs.length < S.maxCert ? "拿到計算王獎狀了！從 0 開始，挑戰第 2 張！" : "兩張計算王獎狀都拿到了，你是真正的計算王！";
  if (!S.streak) return pick(CHEER.reset);
  return pick(CHEER.streak.length ? CHEER.streak : CHEER.ok);
}
const pick = a => a[Math.floor(Math.random() * a.length)] || "";
function stampsHTML() {
  const n = S.stamps.length, slots = Math.max(10, Math.ceil((n + 1) / 10) * 10);
  return Array.from({ length: slots }, (_, i) => i < n
    ? `<span class="cst on" title="${S.stamps[i]}"><img src="${IMG}stamp_${(i % STAMPS) + 1}.png" alt="" onerror="this.replaceWith(Object.assign(document.createElement('b'),{textContent:'${"＋－×÷＝"[i % 5]}'}))"><em>${S.stamps[i].slice(5).replace("-", "/")}</em></span>`
    : `<span class="cst"></span>`).join("");
}
// 平板連結：?c=班級&calc=1 打開就直接進計算挑戰（還沒開放前多帶 &chtest=1）
const padLink = () => location.origin + location.pathname + "?c=" + encodeURIComponent(CH.id) + "&calc=1" + (CALC_OPEN ? "" : "&chtest=1");
function showPad() {
  let qr = "";
  try { const q = qrcode(0, "M"); q.addData(padLink()); q.make(); qr = q.createSvgTag({ cellSize: 6, margin: 2, scalable: true }); } catch (e) { qr = esc(padLink()); }
  modal(`<h3>📲 用平板做計算挑戰</h3><div class="cqr">${qr}</div>
    <ol class="crules"><li>用平板的相機掃上面的 QR code</li><li>打開後按「分享」→「加入主畫面」</li><li>之後點平板上的圖示，就直接進計算挑戰</li><li>第一次要打上你的本名，紀錄都會接上</li></ol>`, "關閉");
}
function showRules() {
  modal(`<h3>📜 計算挑戰規則</h3><ol class="crules">${RULES.map(r => `<li>${r}</li>`).join("")}</ol>`, "我知道了");
}
function modal(html, btn, onClose) {
  const m = document.createElement("div"); m.className = "cmodal";
  m.innerHTML = `<div class="box">${html}<button class="cbtn" type="button">${btn}</button></div>`;
  m.querySelector("button.cbtn").onclick = () => { m.remove(); if (onClose) onClose(); };
  room.appendChild(m); return m;
}

// ---------- 做題 ----------
function startQ(idx) {
  const p = SET[idx - 1], L = p.L;
  const kid = L.rows.map((row, r) => C.isGiven(L, r) ? row.slice() : row.map(() => " "));
  const r0 = L.kind === "d" ? 0 : 2, c0 = L.kind === "d" ? L.dd : L.cols - 1;
  Q = { idx, p, L, kid, act: [r0, c0], attempt: 0, wrong: new Set(), done: false };
  // 三年級加減法：紙上用直式算（借位要劃掉、寫清楚），網頁只打答案（SUNNY 2026-11-04）
  // 全部題目：紙上用直式算，網頁只打答案（SUNNY 2026-11-04）；除法分「商」「餘數」兩格
  Q.ans = ""; Q.ansMax = L.kind === "d" ? L.st.s.length : L.cols - 1;
  if (L.kind === "d") { Q.rem = ""; Q.remMax = String(L.d).length; Q.field = "q"; }
  drawQ();
}
const DISP = ch => ch === "-" ? "−" : ch === "+" ? "+" : ch;
// 作答畫面（2026-11-04 改版）：題目在上、格子在中間、提示一行在格子下面、數字鍵固定在最下面（平板橫放／電腦：數字鍵放右邊）
// 提示和「浩克帶你算」都放在同一個小框，不會把數字鍵擠下去；電腦可以直接用鍵盤打數字
function drawQ(note) {
  if (note !== undefined) Q.note = note;
  note = Q.note;
  room.classList.add("qmode");
  const { L, p, idx } = Q, w = el("cwrap");
  const dots = Array.from({ length: S.perDay }, (_, i) => `<i class="${i < S.first.length ? (S.first[i] ? "ok" : "no") : i === idx - 1 ? "now" : ""}"></i>`).join("");
  let g = `<div class="cgrid ${L.kind === "d" ? "div" : ""}" id="cgrid" style="grid-template-columns:repeat(${L.cols},var(--cs))">`;
  L.rows.forEach((row, r) => row.forEach((_, c) => {
    const given = C.isGiven(L, r), ch = Q.kid[r][c], k = r + "," + c;
    const cls = ["cc", given ? "g" : "e", L.kind === "v" && L.bars.includes(r) ? "bar" : "", L.kind === "d" && r === 1 && c === L.dd ? "brk" : "",
      L.kind === "d" && r === 0 && c >= L.dd ? "quo" : "", !given && Q.act[0] === r && Q.act[1] === c && !Q.done ? "act" : "", Q.wrong.has(k) ? "bad" : "", Q.teach && Q.teach.has(k) ? "teach" : ""].filter(Boolean).join(" ");
    g += `<div class="${cls}" data-r="${r}" data-c="${c}">${ch === " " ? "" : DISP(ch)}</div>`;
  }));
  g += `</div>`;
  const ansMode = Q.ans !== undefined && !Q.teachUI;
  const tip = ansMode ? (L.kind === "d" ? "✏️ 拿紙筆用直式算，算完把商和餘數打在下面（沒有餘數就空著）。" : "✏️ 拿紙筆用直式算，算完把答案打在下面。") : L.kind === "d" ? "商從左邊開始寫，每一步都寫在對的格子裡。" : L.op === "×2" ? "先乘個位、再乘十位，最後加起來。" : "從個位開始，一格一個數字；進位記在手上。";
  let pad;
  if (Q.teachUI) pad = `<div class="cpad2"><button type="button" class="cbtn gray" id="tprev" ${Q.teachUI.i <= 1 ? "disabled" : ""}>◀ 上一步</button><button type="button" class="cbtn" id="tnext">${Q.teachUI.i >= Q.teachUI.n ? (idx < S.perDay ? "下一題 →" : "看今天的成績") : "下一步 ▶"}</button></div>`;
  else if (Q.done) pad = `<div class="cpad2 one"><button class="cbtn" id="cnext">${idx < S.perDay ? "下一題 →" : "看今天的成績"}</button></div>`;
  else pad = `<div class="ckeys">${["7", "8", "9", "del", "4", "5", "6", "←", "1", "2", "3", "→", "0", "ok"].map(k =>
      k === "del" ? `<button type="button" class="ck fn era" data-k="del">橡皮擦</button>` : k === "ok" ? `<button type="button" class="ck okk" data-k="ok">完成</button>`
      : `<button type="button" class="ck${k === "0" ? " zero" : ""}${k === "←" || k === "→" ? (ansMode && L.kind !== "d" ? " fn hid" : " fn") : ""}" data-k="${k}">${ansMode && L.kind === "d" && k === "←" ? "← 商" : ansMode && L.kind === "d" && k === "→" ? "餘數 →" : k}</button>`).join("")}</div>`;
  w.innerHTML = `<div class="cqs${Q.done ? " qdone" : ""}">
    <div class="cqhead"><div class="cqtop"><span>第 ${idx}／${S.perDay} 題</span><span class="cdots">${dots}</span><span class="cs">連續 <b>${S.streak}</b></span></div>
      <div class="cq">${esc(p.text.replace(/－/g, "−").replace(/＋/g, "+"))} ＝ ？</div></div>
    <div class="cmain"><div class="cgarea" id="cgarea">${Q.askSunny ? askHTML() : ansMode ? ansHTML() : `<div class="cgridbox">${g}</div>`}</div>
      <div class="cnote ${note && note.cls || "tip"}" id="cnote">${note ? note.html : esc(tip)}</div></div>
    <div class="cpad">${pad}</div></div>`;
  fitGrid();
  w.querySelectorAll(".cc.e").forEach(d => d.onclick = () => { if (Q.done) return; Q.act = [+d.dataset.r, +d.dataset.c]; drawQ(); });
  w.querySelectorAll(".ck").forEach(b => b.onclick = () => b.dataset.k === "ok" ? submit() : key(b.dataset.k));
  w.querySelectorAll(".cscreen[data-f]").forEach(s => s.onclick = () => { if (Q.done || Q.L.kind !== "d") return; Q.field = s.dataset.f; drawQ(); });   // 除法：點「商」或「餘數」的框切換
  if (el("cnext")) el("cnext").onclick = nextQ;
  if (el("tnext")) el("tnext").onclick = () => Q.teachUI.go(1);
  if (el("tprev")) el("tprev").onclick = () => Q.teachUI.go(-1);
}
// 格子大小照「中間剩下的空間」算（手機、平板、電腦都塞得剛好），最大 64px
// 只填答案：一格一個數字、從左往右打；錯的位數變紅（答案靠右對到直式答案列）
// 答案框：一個長方形（像計算機螢幕），不畫一格一格的框，看不出答案有幾位（SUNNY 2026-11-04：三位數出現四格會誤會）
function screenHTML(val, field, ph) {
  const act = !Q.done && (Q.L.kind !== "d" || Q.field === field), bad = Q.ansBad || (Q.badField === field && Q.badPos === undefined);
  const digits = val.split("").map((ch, i) => `<b class="${Q.badField === field && Q.badPos === i ? "bad" : ""}">${ch}</b>`).join("");   // 只錯一位：那個字變紅
  return `<span class="cscreen${bad ? " bad" : ""}${act ? " on" : ""}" data-f="${field}">${val ? digits : `<i class="ph">${ph}</i>`}${act ? '<i class="cursor"></i>' : ""}</span>`;
}
function askHTML() {
  return `<div class="cask"><img src="${IMG}reward_3.png" alt=""><div class="cask-t">${esc(Q.askSunny.t)}</div><div class="cask-s">${esc(Q.askSunny.s)}</div>
    <div class="cask-b">📒 帶著計算本找 SUNNY</div></div>`;
}
function ansHTML() {
  const L = Q.L, sub = L.kind === "d" ? "直式寫好、每一步對齊" : L.op === "-" ? "直式寫好、借位劃清楚" : L.op === "+" ? "注意是否需要進位喔" : "直式寫好、乘完加上手上記的";
  const rows = L.kind === "d"
    ? `<div class="cans"><span class="cans-l">商</span>${screenHTML(Q.ans, "q", "打商")}</div><div class="cans"><span class="cans-l">餘數</span>${screenHTML(Q.rem, "r", "沒有就空著")}</div>`
    : `<div class="cans"><span class="cans-l">答案</span>${screenHTML(Q.ans, "q", "打答案")}</div>`;
  return `<div class="cpaper"><div class="cpaper-t">✏️ 先在紙上算</div><div class="cpaper-s">${sub}</div>${rows}</div>`;
}
// 孩子打的答案 → 跟題目的答案同一種寫法（除法「商…餘數」，餘數 0 不寫）
const kidAnswer = () => Q.L.kind === "d" ? Q.ans + (Q.rem && Number(Q.rem) ? "…" + Number(Q.rem) : "") : Q.ans;
const normAns = s => { const pr = String(s).split("…"); return pr[0] === "" ? "" : Number(pr[0]) + "|" + Number(pr[1] || 0); };
// 看答案錯在哪：只錯一位（位數一樣、只有一個字不同）才指出來
function ansCheck() {
  const L = Q.L, want = String(Q.p.ans), ok = normAns(kidAnswer()) === normAns(want);
  if (ok) return { ok };
  const wq = want.split("…")[0], wr = Number(want.split("…")[1] || 0), kq = Q.ans, kr = Number(Q.rem || 0);
  if (L.kind === "d") {
    if (Number(kq) === Number(wq)) return { ok, field: "r", hint: kr >= L.d ? `餘數比除數 ${L.d} 還大，商可以再大一點喔！` : `商對了！餘數再算一次看看，餘數一定要比 ${L.d} 小。` };
    const diff = kq.length === wq.length ? kq.split("").map((ch, i) => ch !== wq[i] ? i : -1).filter(i => i >= 0) : [];
    if (diff.length === 1 && kr === wr) return { ok, field: "q", pos: diff[0], hint: `商的紅色數字再想一次：那一步裡面有幾個 ${L.d}？` };
    return { ok };
  }
  const diff = kq.length === wq.length ? kq.split("").map((ch, i) => ch !== wq[i] ? i : -1).filter(i => i >= 0) : [];
  if (diff.length !== 1) return { ok };
  let hint = L.op === "×2" ? "紅色的數字再算一次看看：乘完有沒有加上手上記的？兩列加起來有沒有進位？" : "";
  if (!hint) { ansToKid(); const gr = C.grade(L, Q.kid); hint = (gr.hint || "紅色的數字再算一次看看！").replace("紅色這一格", "紅色這個數字").replace("紅色的格子", "紅色的數字"); }
  return { ok, field: "q", pos: diff[0], hint };
}
// 只填答案 → 放進直式的答案列（靠右），批改、提示、教學都跟原本一樣
function ansToKid() { const L = Q.L, a = Q.ans, R = L.rows.length - 1; Q.kid = L.rows.map((row, r) => C.isGiven(L, r) ? row.slice() : row.map(() => " ")); if (L.kind === "v") a.split("").forEach((ch, i) => { Q.kid[R][L.cols - a.length + i] = ch; }); }
function fitGrid(force) {
  const a = el("cgarea"), g = el("cgrid"); if (!a || !g || !Q) return;
  // 一題只算一次格子大小（提示框字變多、按鍵重畫都不會讓格子忽大忽小）；轉螢幕／視窗變寬窄才重算
  if (!Q.cs || force) { const L = Q.L; Q.cs = Math.max(24, Math.min(window.innerWidth >= 760 ? 76 : 64, Math.floor((a.clientWidth - 24) / L.cols), Math.floor((a.clientHeight - 24) / L.rows.length))); }
  g.style.setProperty("--cs", Q.cs + "px");
}
let lastW = window.innerWidth;
window.addEventListener("resize", () => { if (window.innerWidth === lastW) return; lastW = window.innerWidth; if (Q && room.classList.contains("qmode")) fitGrid(true); });   // 只看寬度（手機網址列跑出來收起來不算）
function nextQ() { if (Q.idx < S.perDay && S.first.length >= Q.idx) startQ(Q.idx + 1); else drawHome(false); }
function key(k) {
  if (!Q || Q.done || Q.busy) return;
  if (Q.ans !== undefined && !Q.teachUI) {
    const isR = Q.L.kind === "d" && Q.field === "r", cur = isR ? Q.rem : Q.ans, max = isR ? Q.remMax : Q.ansMax;
    let v = cur;
    if (k === "←" && Q.L.kind === "d") Q.field = "q";
    else if (k === "→" && Q.L.kind === "d") Q.field = "r";
    else if (k === "del") { if (!cur && isR) Q.field = "q"; else v = cur.slice(0, -1); }
    else if (/^[0-9]$/.test(k) && cur.length < max) v = cur + k;
    else return;
    if (isR) Q.rem = v; else Q.ans = v;
    Q.ansBad = false; Q.badField = Q.badPos = undefined; drawQ(); return;
  }
  const [r, c] = Q.act, L = Q.L, step = L.kind === "d" ? 1 : -1;
  const move = d => { const nc = Q.act[1] + d; if (nc >= 0 && nc < L.cols) Q.act = [Q.act[0], nc]; };
  const vmove = d => { let nr = r + d; while (nr >= 0 && nr < L.rows.length && C.isGiven(L, nr)) nr += d; if (nr >= 0 && nr < L.rows.length) Q.act = [nr, c]; };
  if (k === "←") move(-1); else if (k === "→") move(1); else if (k === "↑") vmove(-1); else if (k === "↓") vmove(1);
  else if (k === "del") { if (Q.kid[r][c] === " ") move(-step); const [r2, c2] = Q.act; Q.kid[r2][c2] = " "; Q.wrong.delete(r2 + "," + c2); }
  else { Q.kid[r][c] = k; Q.wrong.delete(r + "," + c); move(step); }
  drawQ();
}
// 電腦：直接用鍵盤打數字、方向鍵移動、Backspace 擦掉、Enter 完成／下一步
document.addEventListener("keydown", e => {
  if (!Q || !room.classList.contains("show") || !room.classList.contains("qmode") || document.querySelector(".cmodal,.creward")) return;
  const k = e.key;
  if (Q.teachUI) { if (k === "Enter" || k === "ArrowRight" || k === " ") { e.preventDefault(); Q.teachUI.go(1); } else if (k === "ArrowLeft") Q.teachUI.go(-1); return; }
  if (Q.done) { if (k === "Enter") { e.preventDefault(); nextQ(); } return; }
  if (/^[0-9]$/.test(k)) key(k);
  else if (k === "Backspace" || k === "Delete") { e.preventDefault(); key("del"); }
  else if (k === "ArrowLeft") key("←"); else if (k === "ArrowRight") key("→");
  else if (k === "ArrowUp") { e.preventDefault(); key("↑"); } else if (k === "ArrowDown") { e.preventDefault(); key("↓"); }
  else if (k === "Enter") { e.preventDefault(); submit(); }
});
async function submit() {
  if (Q.busy || Q.done) return;
  if (Q.ans !== undefined) return submitAns();
  const local = C.grade(Q.L, Q.kid);
  if (local.unfinished) { drawQ({ html: "✏️ " + esc(local.hint), cls: "warn" }); return; }
  Q.attempt += 1;
  const cells = Q.kid.map(r => r.join(""));
  if (Q.attempt === 1) {
    Q.busy = true; drawQ({ html: "浩克改改看…", cls: "tip" });
    let r;
    try { r = await api(null, { mode: "calc", classId: CH.id, name: myName(), idx: Q.idx, cells, attempt: 1 }); }
    catch (e) { Q.busy = false; Q.attempt = 0; drawQ({ html: "網路好像斷了，再按一次「完成」。", cls: "warn" }); return; }
    Q.busy = false;
    if (!r || !r.ok && !r.graded) { Q.attempt = 0; drawQ({ html: r && r.err === "unfinished" ? "✏️ " + esc(r.hint) : "現在送不出去，再按一次「完成」。", cls: "warn" }); return; }
    S = Object.assign(S, r);
    const gr = r.graded || local;
    if (gr.ok) return right(r);
    // 只填答案（三年級加減法）：看不到紙上的算法，不猜錯在哪一位，直接說答案不對（SUNNY 2026-11-04）
    // 只錯一位數（位數一樣、只有一格不同）→ 才指出那一位、給提示
    if (Q.ans !== undefined && (gr.wrong || []).length === 1 && gr.type !== "align") {
      Q.ansBad = false; Q.wrong = new Set(gr.wrong.map(([a, b]) => a + "," + b));
      const h = gr.hint.replace("紅色這一格", "紅色這個數字").replace("紅色的格子", "紅色的數字");   // 答案框沒有格子，說「數字」
      drawQ({ html: `💡 ${esc(h)}<small>連續歸零了，改好紅色那個數字再按「完成」。</small>`, cls: "bad" }); return;
    }
    if (Q.ans !== undefined) { Q.ansBad = true; drawQ({ html: `❌ 答案不對。回去看紙上的直式，一位一位再檢查一次。<small>連續歸零了，改好答案再按「完成」。</small>`, cls: "bad" }); return; }
    Q.wrong = new Set((gr.wrong || []).map(([a, b]) => a + "," + b));
    drawQ({ html: `💡 ${esc(gr.hint)}<small>連續歸零了，改好紅色格子再按「完成」。</small>`, cls: "bad" });
    return;
  }
  // 第二次：自己改對了就過；還是錯就一步一步教
  if (local.ok) { log({ attempt: 2 }); Q.done = true; Q.wrong.clear(); drawQ({ html: "改對了！👍 這一題你學會了。", cls: "ok" }); return; }
  log({ attempt: 2, taught: true });
  askSunny();
}
async function submitAns() {
  if (!Q.ans) { drawQ({ html: Q.L.kind === "d" ? "✏️ 先在紙上算好，再把商打進來喔！" : "✏️ 先在紙上算好，再把答案打進來喔！", cls: "warn" }); return; }
  Q.attempt += 1;
  const chk = ansCheck(), answer = kidAnswer();
  if (Q.attempt === 1) {
    Q.busy = true; drawQ({ html: "浩克改改看…", cls: "tip" });
    let r;
    try { r = await api(null, { mode: "calc", classId: CH.id, name: myName(), idx: Q.idx, answer, attempt: 1 }); }
    catch (e) { Q.busy = false; Q.attempt = 0; drawQ({ html: "網路好像斷了，再按一次「完成」。", cls: "warn" }); return; }
    Q.busy = false;
    if (!r || !r.ok && !r.graded) { Q.attempt = 0; drawQ({ html: "現在送不出去，再按一次「完成」。", cls: "warn" }); return; }
    S = Object.assign(S, r);
    const ok = r.graded ? r.graded.ok : chk.ok;
    if (ok) return right(r);
    if (chk.field) {   // 只錯一位數（或除法只錯餘數）→ 指出來
      Q.badField = chk.field; Q.badPos = chk.pos; Q.ansBad = false;
      drawQ({ html: `💡 ${esc(chk.hint)}<small>連續歸零了，改好紅色的地方再按「完成」。</small>`, cls: "bad" }); return;
    }
    Q.ansBad = true;
    drawQ({ html: "❌ 答案不對。回去看紙上的直式，一位一位再檢查一次。<small>連續歸零了，改好答案再按「完成」。</small>", cls: "bad" }); return;
  }
  // 第二次：自己改對了就過；還是錯就一步一步教（看完整直式）
  api(null, { mode: "calc", classId: CH.id, name: myName(), idx: Q.idx, answer, attempt: 2, taught: !chk.ok }).catch(() => {});
  if (chk.ok) { Q.done = true; Q.ansBad = false; Q.badField = undefined; drawQ({ html: "改對了！👍 這一題你學會了。", cls: "ok" }); return; }
  askSunny();
}
function log(extra) { api(null, Object.assign({ mode: "calc", classId: CH.id, name: myName(), idx: Q.idx, cells: Q.kid.map(r => r.join("")) }, extra)).catch(() => {}); }
function right(r) {
  Q.done = true; Q.wrong.clear();
  const milestone = S.streak && S.streak % 10 === 0;
  drawQ({ html: `⭕ 答對了！連續 <b>${S.streak}</b> 題　${esc(milestone ? `${S.streak} 題了，好厲害！` : pick(CHEER.ok.filter(t => !/手上記/.test(t) || Q.p.type === "add" || /^mul/.test(Q.p.type))))}`, cls: "ok" });
  updateTile();
  if (r.cert) setTimeout(() => showCert(r.cert.n, true, r.stamp ? reward : null), 600);
  else if (r.stamp) setTimeout(reward, 500);
}

// ---------- 第二次錯：浩克帶你算一次（自己按「下一步」，一次看一句；數字鍵的位置換成上一步／下一步，版面不會跳） ----------
// ---------- 第二次還錯：浩克努力說服孩子帶計算本去找 SUNNY（SUNNY 2026-11-04：這樣才有機會連續對） ----------
const ASK_SUNNY = [
  ["這題卡住沒關係！", "把計算本帶去給 SUNNY 看，SUNNY 一下就能找到是哪一步算錯。找出來以後，同樣的錯就不會再犯，連續答對的題數才會越來越多喔！"],
  ["浩克偷偷告訴你一個祕密…", "厲害的人不是從來不錯，而是錯了會去問！拿著計算本找 SUNNY，很快就能弄懂，下次遇到這種題目就不怕了。"],
  ["你已經很接近了！", "答案只差一點點，問題一定藏在計算本的某一步裡。帶去給 SUNNY 看，把它找出來，計算王獎狀就離你更近一步！"],
  ["浩克跟你約好喔！", "下次上課記得帶計算本去找 SUNNY，花一分鐘問清楚，比自己猜十次還有用！問完你就會發現：原來這麼簡單！"],
];
function askSunny() {
  Q.done = true; Q.ansBad = false; Q.badField = undefined; Q.wrong.clear();
  const [t, s] = ASK_SUNNY[(Q.idx + (S.streak || 0)) % ASK_SUNNY.length];
  Q.askSunny = { t, s };
  drawQ({ html: "這一題先不算，下一題重新開始累積連續題數，加油！", cls: "tip" });
}
function teach() {
  Q.ans = undefined;   // 教的時候改看完整直式
  const steps = C.teachSteps(Q.L), L = Q.L;
  Q.wrong.clear(); Q.done = true;
  const show = i => {   // 顯示到第 i 步
    Q.kid = L.rows.map((row, r) => C.isGiven(L, r) ? row.slice() : row.map(() => " "));
    steps.slice(0, i).forEach(s => s.cells.forEach(([r, c, ch]) => { Q.kid[r][c] = ch; }));
    Q.teach = new Set(steps[i - 1].cells.map(([r, c]) => r + "," + c));
    Q.teachUI.i = i;
    drawQ({ html: `<span class="cstep">浩克帶你算　${i}／${steps.length}</span>${esc(steps[i - 1].say)}`, cls: "teachbox" });
  };
  Q.teachUI = { i: 0, n: steps.length, go: d => { const n = Q.teachUI.i + d; if (n > steps.length) { Q.teachUI = null; Q.teach = null; nextQ(); return; } if (n >= 1) show(n); } };
  show(1);
}

// ---------- 5 題全對：獎勵動畫（阿居畫的分鏡，約 2 秒）＋蓋章 ----------
function reward() {
  const m = document.createElement("div"); m.className = "creward";
  const n = S.stamps.length, st = ((n - 1) % STAMPS) + 1;
  m.innerHTML = `<div class="rw"><img class="rf" src="${IMG}reward_1.png" alt="" onerror="this.style.display='none'"><div class="rt">今天 5 題全對！</div>
    <div class="rstamp"><img src="${IMG}stamp_${st}.png" alt="" onerror="this.style.display='none'"></div><div class="rs">${esc(pick(CHEER.stamp))}</div><small>點一下關掉</small></div>`;
  room.appendChild(m);
  // 4 格只播一次（約 1.8 秒）停在蓋章那一格；3.5 秒後自己關，也可以點一下關掉
  let f = 1, done = false; const tm = setInterval(() => { f += 1; const im = m.querySelector(".rf"); if (im) im.src = `${IMG}reward_${f}.png`; if (f >= 4) { clearInterval(tm); m.classList.add("stamped"); } }, 450);
  const close = () => { if (done) return; done = true; clearInterval(tm); m.remove(); drawHome(false); };
  m.onclick = close; setTimeout(close, 3500);
}

// ---------- 計算王獎狀（阿居設計；字的位置在 CERT） ----------
const CERT = { img: "cert_calc.jpg", logo: "logo.png" };
function loadImg(src) { return new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = no; im.src = src; }); }
// 獎狀上的字（阿居畫的底圖 1024×1536：中間米白空白、右下角是浩克，字避開浩克）
const rocDate = d => { const [y, m, dd] = d.split("-").map(Number); return `${y - 1911} 年 ${m} 月 ${dd} 日`; };
function drawCert(x, W, H, logo, name, n, date, goal) {
  const F = '"Baloo 2","PingFang TC","Microsoft JhengHei",sans-serif';
  const t = (s, px, py, size, color, align, weight) => { x.font = `${weight || 900} ${Math.round(W * size)}px ${F}`; x.fillStyle = color; x.textAlign = align || "center"; x.fillText(s, W * px, H * py); };
  if (logo) { const lh = H * 0.045, lw = lh * logo.width / logo.height; x.drawImage(logo, W * 0.12, H * 0.205, lw, lh); }
  t("計算王獎狀", 0.5, 0.31, 0.10, "#1E3A5F");
  t(name, 0.5, 0.385, 0.088, "#0F2A4A");
  x.fillStyle = "#D4A017"; x.fillRect(W * 0.25, H * 0.402, W * 0.5, H * 0.003);
  t(`連續答對 ${goal} 題計算`, 0.5, 0.455, 0.05, "#1E3A5F", "center", 800);
  t("又快又準，特頒此狀！", 0.5, 0.498, 0.05, "#1E3A5F", "center", 800);
  t("請找SUNNY領取獎品", 0.5, 0.552, 0.056, "#C0392B");
  t(`第 ${n} 張`, 0.30, 0.625, 0.04, "#B7791F");
  t(rocDate(date), 0.30, 0.668, 0.032, "#4A6280", "center", 800);
  t("SUNNY", 0.30, 0.705, 0.036, "#1E3A5F");
}
if (typeof window !== "undefined") window.CALC_DRAW_CERT = drawCert;
// 獎狀牆（challenge.js）拿計算王獎狀：{ certs:[{n,date}], goal, bg, logo }
window.CALC_CERTS = async () => { if (!S || !S.ok) await loadState(); return S && S.ok ? { certs: S.certs || [], goal: S.goal, bg: IMG + CERT.img, logo: IMG + CERT.logo } : null; };
async function showCert(n, fresh, after) {
  const c = S.certs.find(x => x.n === n); if (!c) return;
  let url = "";
  try {
    const bg = await loadImg(IMG + CERT.img), logo = await loadImg(IMG + CERT.logo).catch(() => null), W = bg.naturalWidth, H = bg.naturalHeight, cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    const x = cv.getContext("2d"); x.drawImage(bg, 0, 0);
    drawCert(x, W, H, logo, myName(), c.n, c.date, S.goal);
  url = cv.toDataURL("image/jpeg", 0.92);
  } catch (e) {}
  const html = url ? `<img class="ccertimg" src="${url}" alt="計算王獎狀">`
    : `<div class="ccertbox"><div class="t">🏆 計算王獎狀</div><div class="n">${esc(myName())}</div><div>連續答對 ${S.goal} 題，計算又快又準！</div><div class="k">第 ${c.n} 張</div><div class="p">請找SUNNY領取獎品</div><div class="d">${c.date}　SUNNY</div></div>`;
  modal((fresh ? `<h3>🎉 你拿到計算王獎狀了！</h3>` : "") + html + `<div class="csmall">截圖給 SUNNY 看，就能領獎品喔！（每個人最多 ${S.maxCert} 次）</div>`, "好！", () => { if (after) after(); else drawHome(false); });
}

// 樹洞首頁打開就先抓一次狀態（方塊上顯示連續題數）
if (qs("calc") === "1") openRoom(); else if (myName()) loadState();
window.CALC_REFRESH = () => { S = null; if (myName()) loadState(); };
})();
