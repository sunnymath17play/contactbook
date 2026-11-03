/* ============================================================
   🧮 樹洞「計算挑戰」（三、四年級，2026-11-03 SUNNY 的點子）
   每天 5 題，一格一格填方格直式；第一次按「完成」就對才算「連續答對」，錯了歸零
   第一次錯：紅格子＋一句提示（進位照 SUNNY「記在手上」，不畫小小進位數字）；第二次錯：一步一步動畫教
   當天 5 題全對：獎勵動畫＋蓋一個浩克章；連續答對 200 題：計算王獎狀（請找 SUNNY 領取獎品，一人最多 2 張）
   題目、批改：calc_core.js（和紙本小卡、樹洞後台同一份）；連續題數、獎狀都由後台算（mode=calc／calc_state）
   原始碼在 程式碼\計算挑戰\，node build.cjs 複製到 contactbook\calc\
   ============================================================ */
(function(){
const CALC_OPEN = false;   // SUNNY 試玩 OK 才改 true；之前只有測試連結（&chtest=1）看得到
const CALC_GRADES = [3, 4];
const IMG = "calc/img/";
const lsG = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsS = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
const el = id => document.getElementById(id);
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const TESTER = lsG("wh_chtest") === "1";
if (typeof CH === "undefined" || !CH || typeof CalcCore === "undefined") return;
const GRADE = 3 + (schoolYear() - CH.y);
if (CALC_GRADES.indexOf(GRADE) < 0 || (!CALC_OPEN && !TESTER) || qs("preview") === "1") return;
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
const tiles = el("tiles"); if (tiles) tiles.insertAdjacentElement("afterend", tile);
tile.onclick = () => openRoom();

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
  sub.textContent = S.first.length >= S.perDay ? `今天做完了！連續答對 ${S.streak} 題` : `連續答對 ${S.streak}／${S.goal} 題・今天還有 ${S.perDay - S.first.length} 題`;
}
function openRoom() { room.classList.add("show"); history.pushState({ c: 1 }, ""); Q = null; drawHome(true); }
function closeRoom() { room.classList.remove("show"); Q = null; updateTile(); }

// ---------- 首頁：連續題數、今天進度、集章卡、獎狀 ----------
async function drawHome(reload) {
  const w = el("cwrap");
  if (reload || !S) { w.innerHTML = `<div class="cload">浩克拿題目中…</div>`; await loadState(); }
  if (!S || !S.ok) {
    const msg = { no_name: "先回樹洞首頁，在「我是＿＿」打上你的本名，再來挑戰喔！", not_roster: "浩克找不到你的名字，請打本名（例如：王小明），或問 SUNNY。", net: "網路好像不穩，等一下再點一次。" }[S && S.err] || "現在打不開，等一下再試試。";
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
  if (!S.streak && !S.best) return "從第 1 題開始累積吧！一格一個數字，慢慢算。";
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
  drawQ();
}
const DISP = ch => ch === "-" ? "−" : ch === "+" ? "+" : ch;
function drawQ(note) {
  const { L, p, idx } = Q, w = el("cwrap");
  const fitW = Math.floor((Math.min(window.innerWidth, 480) - 40) / L.cols), fitH = Math.floor((window.innerHeight - 470) / L.rows.length);
  const cs = Math.max(34, Math.min(58, fitW, fitH));
  const dots = Array.from({ length: S.perDay }, (_, i) => `<i class="${i < S.first.length ? (S.first[i] ? "ok" : "no") : i === idx - 1 ? "now" : ""}"></i>`).join("");
  let g = `<div class="cgrid ${L.kind === "d" ? "div" : ""}" style="grid-template-columns:repeat(${L.cols},${cs}px);--cs:${cs}px">`;
  L.rows.forEach((row, r) => row.forEach((_, c) => {
    const given = C.isGiven(L, r), ch = Q.kid[r][c], k = r + "," + c;
    const cls = ["cc", given ? "g" : "e", L.kind === "v" && L.bars.includes(r) ? "bar" : "", L.kind === "d" && r === 1 && c >= L.dd ? "dvd" : "", L.kind === "d" && r === 1 && c === L.dd ? "brk" : "",
      L.kind === "d" && r === 0 && c >= L.dd ? "quo" : "", !given && Q.act[0] === r && Q.act[1] === c && !Q.done ? "act" : "", Q.wrong.has(k) ? "bad" : "", Q.teach && Q.teach.has(k) ? "teach" : ""].filter(Boolean).join(" ");
    g += `<div class="${cls}" data-r="${r}" data-c="${c}">${ch === " " ? "" : DISP(ch)}</div>`;
  }));
  g += `</div>`;
  const keys = ["7","8","9","4","5","6","1","2","3","←","0","→"].map(k => `<button type="button" class="ck" data-k="${k}">${k}</button>`).join("");
  w.innerHTML = `
    <div class="cqtop"><span>第 ${idx}／${S.perDay} 題</span><span class="cdots">${dots}</span><span class="cs">連續 <b>${S.streak}</b></span></div>
    <div class="cq">${esc(p.text.replace(/－/g, "−").replace(/＋/g, "+"))} ＝ ？</div>
    <div class="ctip">${L.kind === "d" ? "商從左邊開始寫，每一步都寫在對的格子裡。" : L.op === "×2" ? "先乘個位、再乘十位，最後加起來；每個數字寫進一格。" : "從個位開始，一格寫一個數字；進位記在手上。"}</div>
    <div class="cgridbox">${g}</div>
    <div class="cnote ${note && note.cls || ""}" id="cnote">${note ? note.html : ""}</div>
    ${Q.done ? `<button class="cbtn big" id="cnext">${idx < S.perDay ? "下一題 →" : "看今天的成績"}</button>` : `<div class="ckeys">${keys}</div>
    <div class="crow"><button type="button" class="cbtn gray" id="cdel">⌫ 擦掉</button><button type="button" class="cbtn" id="cok">完成</button></div>`}`;
  w.querySelectorAll(".cc.e").forEach(d => d.onclick = () => { if (Q.done) return; Q.act = [+d.dataset.r, +d.dataset.c]; drawQ(note); });
  w.querySelectorAll(".ck").forEach(b => b.onclick = () => key(b.dataset.k));
  if (el("cdel")) el("cdel").onclick = () => key("del");
  if (el("cok")) el("cok").onclick = submit;
  if (el("cnext")) el("cnext").onclick = () => { if (idx < S.perDay && S.first.length >= idx) startQ(idx + 1); else drawHome(false); };
}
function key(k) {
  if (!Q || Q.done || Q.busy) return;
  const [r, c] = Q.act, L = Q.L, step = L.kind === "d" ? 1 : -1;
  const move = d => { let nc = Q.act[1] + d; if (nc >= 0 && nc < L.cols) Q.act = [r, nc]; };
  if (k === "←") move(-1); else if (k === "→") move(1);
  else if (k === "del") { Q.kid[r][c] = " "; Q.wrong.delete(r + "," + c); }
  else { Q.kid[r][c] = k; Q.wrong.delete(r + "," + c); move(step); }
  const n = el("cnote"); drawQ(n && n.innerHTML ? { html: n.innerHTML, cls: n.className.replace("cnote", "").trim() } : null);
}
async function submit() {
  if (Q.busy) return;
  const local = C.grade(Q.L, Q.kid);
  if (local.unfinished) { drawQ({ html: "✏️ " + esc(local.hint), cls: "warn" }); return; }
  Q.attempt += 1;
  const cells = Q.kid.map(r => r.join(""));
  if (Q.attempt === 1) {
    Q.busy = true; drawQ({ html: "浩克改改看…", cls: "" });
    let r;
    try { r = await api(null, { mode: "calc", classId: CH.id, name: myName(), idx: Q.idx, cells, attempt: 1 }); }
    catch (e) { Q.busy = false; Q.attempt = 0; drawQ({ html: "網路不穩，再按一次「完成」。", cls: "warn" }); return; }
    Q.busy = false;
    if (!r || !r.ok && !r.graded) { Q.attempt = 0; drawQ({ html: r && r.err === "unfinished" ? "✏️ " + esc(r.hint) : "現在送不出去，再按一次「完成」。", cls: "warn" }); return; }
    S = Object.assign(S, r);
    const gr = r.graded || (r.dup ? local : null) || local;
    if (gr.ok) return right(r);
    Q.wrong = new Set((gr.wrong || []).map(([a, b]) => a + "," + b));
    drawQ({ html: `<b>連續題數歸零了</b>，${esc(pick(CHEER.reset))}<br>💡 ${esc(gr.hint)}`, cls: "bad" });
    return;
  }
  // 第二次：自己改對了就過；還是錯就動畫教
  if (local.ok) { log({ attempt: 2 }); Q.done = true; Q.wrong.clear(); drawQ({ html: "改對了！👍 這一題你學會了。", cls: "ok" }); return; }
  log({ attempt: 2, taught: true });
  teach();
}
function log(extra) { api(null, Object.assign({ mode: "calc", classId: CH.id, name: myName(), idx: Q.idx, cells: Q.kid.map(r => r.join("")) }, extra)).catch(() => {}); }
function right(r) {
  Q.done = true; Q.wrong.clear();
  const milestone = S.streak && S.streak % 10 === 0;
  drawQ({ html: `⭕ 答對了！已經連續答對 <b>${S.streak}</b> 題　${esc(milestone ? `連續 ${S.streak} 題，好厲害！` : pick(CHEER.ok))}`, cls: "ok" });
  updateTile();
  if (r.cert) setTimeout(() => showCert(r.cert.n, true, r.stamp ? reward : null), 600);
  else if (r.stamp) setTimeout(reward, 500);
}

// ---------- 第二次錯：一步一步教 ----------
function teach() {
  const steps = C.teachSteps(Q.L);
  Q.kid = Q.L.rows.map((row, r) => C.isGiven(Q.L, r) ? row.slice() : row.map(() => " "));
  Q.wrong.clear(); Q.done = true; Q.teach = new Set();
  let i = 0, tm = null;
  const say = [];
  const tick = () => {
    if (i >= steps.length) { finish(); return; }
    const s = steps[i++]; Q.teach = new Set();
    s.cells.forEach(([r, c, ch]) => { Q.kid[r][c] = ch; Q.teach.add(r + "," + c); });
    say.push(s.say);
    drawTeach(say, false);
    tm = setTimeout(tick, Math.max(1700, s.say.length * 160));
  };
  const finish = () => { clearTimeout(tm); steps.slice(i).forEach(s => { s.cells.forEach(([r, c, ch]) => { Q.kid[r][c] = ch; }); say.push(s.say); }); i = steps.length; Q.teach = new Set(); drawTeach(say, true); };
  function drawTeach(lines, end) {
    drawQ({ html: `<b>浩克帶你算一次：</b><div class="csteps">${lines.map((t, k) => `<div class="${k === lines.length - 1 && !end ? "now" : ""}">${esc(t)}</div>`).join("")}</div>${end ? "" : `<button type="button" class="cskip" id="cskip">全部看完 ⏩</button>`}`, cls: "teachbox" });
    if (el("cskip")) el("cskip").onclick = finish;
    const box = el("cnote"); if (box) box.scrollIntoView({ block: "nearest" });
  }
  tick();
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
