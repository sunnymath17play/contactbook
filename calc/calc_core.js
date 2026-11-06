// 計算出題核心（2026-11-03）：紙本「每日計算小卡」（gen_計算小卡.cjs）和樹洞「計算挑戰」共用，不要再寫第二份。
// node：const CalcCore = require('./calc_core.js')；瀏覽器：<script src="calc_core.js"> → window.CalcCore
// 進位照 SUNNY「記在手上」：版面只有數字，不放小小進位數字。
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CalcCore = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {

// ---------- 亂數（固定種子：同一個種子每次出的題目一樣） ----------
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function hashStr(str) { let h = 2166136261; for (const ch of String(str)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619) >>> 0; } return h; }
const digits = n => String(n).split('').reverse().map(Number);   // 個位在前

// ---------- 逐位計算（skip＝那一位「忘了加進位／忘了還借位」，用來做小陽的錯） ----------
function addCols(a, b, skip = -1) {
  const A = digits(a), B = digits(b), n = Math.max(A.length, B.length); let c = 0, out = [], carries = [];
  for (let i = 0; i < n; i++) { const s = (A[i] || 0) + (B[i] || 0) + (i === skip ? 0 : c); carries.push(c); out.push(s % 10); c = Math.floor(s / 10); }
  if (c) out.push(c);
  return { v: Number(out.reverse().join('')), carries };   // carries[i]＝進到第 i 位的進位
}
function subCols(a, b, skip = -1) {
  const A = digits(a), B = digits(b); let br = 0, out = [], borrows = [];
  for (let i = 0; i < A.length; i++) { let d = A[i] - (B[i] || 0) - (i === skip ? 0 : br); borrows.push(br); if (d < 0) { d += 10; br = 1; } else br = 0; out.push(d); }
  return { v: Number(out.reverse().join('')), borrows };
}
function mul1Cols(a, m, skip = -1) {
  const A = digits(a); let c = 0, out = [], carries = [];
  for (let i = 0; i < A.length; i++) { const p = A[i] * m + (i === skip ? 0 : c); carries.push(c); out.push(p % 10); c = Math.floor(p / 10); }
  if (c) out.push(...digits(c));
  return { v: Number(out.reverse().join('')), carries };
}
const nCarry = arr => arr.filter(x => x > 0).length;
const consecutive = arr => arr.some((x, i) => x > 0 && arr[i + 1] > 0);

// ---------- 直式版面：rows＝每列字元陣列（右對齊），bars＝在第幾列「下面」畫線 ----------
function pad(b, a) { const L = Math.max(String(a).length, String(b).length); return ' '.repeat(L - String(b).length) + b; }
function vLayout(rowsStr, bars, cols, op) {
  cols = cols || Math.max(...rowsStr.map(s => s.length));
  return { kind: 'v', op, cols, rows: rowsStr.map(s => (' '.repeat(cols - s.length) + s).split('')), bars };
}
function addLayout(a, b, res) { return vLayout([String(a), '+' + pad(b, a), String(res)], [1], Math.max(String(a).length, String(b).length, String(res).length) + 1, '+'); }
function subLayout(a, b, res) { return vLayout([String(a), '-' + pad(b, a), String(res)], [1], Math.max(String(a).length, String(b).length) + 1, '-'); }
function mul1Layout(a, m, res) { const w = Math.max(String(a).length, String(res).length) + 1; return vLayout([String(a), '×' + ' '.repeat(String(a).length - 1) + m, String(res)], [1], w, '×'); }
function mul2Layout(a, b, p1, p2, sum) {   // 乘十位那一列不寫 0，第一個數字寫在十位數的底下（SUNNY 2026-11-04）
  const w = Math.max(String(sum).length, String(p2).length + 1, String(a).length) + 1;
  return vLayout([String(a), '×' + ' '.repeat(String(a).length - 2) + b, String(p1), String(p2) + ' ', String(sum)], [1, 3], w, '×2');
}
// 四位×三位（紙本小卡 2026-11-05）：乘十位那一列往左一格、乘百位那一列往左兩格，都不寫 0
function mul3Layout(a, b, ps, sum) {
  const w = Math.max(String(sum).length, String(ps[1]).length + 1, String(ps[2]).length + 2, String(a).length) + 1;
  return vLayout([String(a), '×' + ' '.repeat(Math.max(0, String(a).length - 3)) + b, String(ps[0]), String(ps[1]) + ' ', String(ps[2]) + '  ', String(sum)], [1, 4], w, '×3');
}
// 長除法：除數在左、被除數在右，商寫在上面一列；中間商 0 不寫乘的那一列，直接往下拿
function divSteps(N, d) {
  const s = String(N), dd = String(d).length, cols = dd + s.length; let q = Array(s.length).fill(null), rows = [], work = null, val = 0, started = false;
  for (let i = 0; i < s.length; i++) {
    val = val * 10 + Number(s[i]);
    if (work) { work.val = val; work.end = i; }
    if (!started && val < d) continue;
    started = true;
    const qd = Math.floor(val / d); q[i] = qd;
    if (qd === 0) continue;
    rows.push({ val: qd * d, end: i, bar: true, q: qd });
    val = val - qd * d; work = { val, end: i }; rows.push(work);
  }
  return { q, rows, cols, dd, s, quot: Math.floor(N / d), rem: N % d };
}
function divLayout(N, d, { dropZero = false } = {}) {
  const st = divSteps(N, d), cols = st.cols, R = 2 + st.rows.length, grid = Array.from({ length: R }, () => Array(cols).fill(' '));
  const put = (r, str, endCol) => str.split('').forEach((ch, k) => { grid[r][endCol - str.length + 1 + k] = ch; });
  st.q.forEach((qd, i) => { if (qd !== null && !(dropZero && qd === 0)) grid[0][st.dd + i] = String(qd); });
  put(1, String(d), st.dd - 1); put(1, st.s, cols - 1);
  const bars = [];
  st.rows.forEach((r, k) => { put(2 + k, String(r.val), st.dd + r.end); if (r.bar) bars.push(2 + k); });
  return { kind: 'd', op: '÷', cols, rows: grid, bars, dd: st.dd, st, N, d };
}
const blankOf = L => ({ ...L, rows: L.rows.map(r => r.map(() => ' ')) });
function diffCells(A, B) { const out = []; A.rows.forEach((r, i) => r.forEach((c, j) => { if (c !== B.rows[i][j]) out.push([i, j]); })); return out; }

// 驗算正確版直式本身（每一列都對）
function checkLayout(L) {
  const num = r => Number(L.rows[r].join('').replace(/[^0-9]/g, '') || 0);
  if (L.kind === 'd') { const st = L.st; return st.quot * Number(L.rows[1].slice(0, st.dd).join('').trim()) + st.rem === Number(st.s) && st.rem < L.d; }
  if (L.op === '×3') { const a = num(0), b = num(1), D = digits(b); return num(2) === a * D[0] && num(3) === a * D[1] && num(4) === a * D[2] && num(5) === a * b; }
  const sign = L.rows[1].join('').trim()[0];
  if (L.rows.length === 3) { const a = num(0), b = num(1), c = num(2); return sign === '+' ? a + b === c : sign === '-' ? a - b === c : a * b === c; }
  const a = num(0), b = num(1); return num(2) === a * (b % 10) && num(3) === a * Math.floor(b / 10) && num(4) === a * b;
}

// ---------- 出題（綁一個亂數；同樣的呼叫順序＝同樣的題目） ----------
function create(rand) {
  const ri = (a, b) => a + Math.floor(rand() * (b - a + 1));
  const G = {};
  G.g3Add = () => {
    for (;;) { const a = ri(1000, 8999), b = ri(100, 9999 - a); const r = addCols(a, b); if (r.v <= 9999 && nCarry(r.carries) >= 2 && consecutive(r.carries)) return { a, b, v: a + b }; }
  };
  G.g3Sub = day => {
    for (;;) {
      let a = ri(2000, 9999); if (day % 2 === 0) { const A = digits(a); A[1] = 0; if (rand() < 0.5) A[2] = 0; a = Number(A.reverse().join('')); }
      const b = ri(100, a - 1), r = subCols(a, b); if (nCarry(r.borrows) >= 2 && consecutive(r.borrows) && a - b >= 100) return { a, b, v: a - b };
    }
  };
  G.g3Mul = day => {
    for (;;) {
      let a = day % 2 ? ri(102, 999) : ri(1002, 2499); if (rand() < 0.35) { const A = digits(a); A[1] = 0; a = Number(A.reverse().join('')); }
      const m = ri(3, 9), r = mul1Cols(a, m); if (a * m <= 9999 && nCarry(r.carries) >= 2) return { a, m, v: a * m };
    }
  };
  G.g4Mul1 = () => {
    for (;;) { const a = ri(1234, 9876), m = ri(4, 9), r = mul1Cols(a, m); if (nCarry(r.carries) >= 3 && !String(a).includes('0')) return { a, m, v: a * m }; }
  };
  G.g4Mul2 = () => {
    for (;;) {
      let a = ri(203, 987); if (rand() < 0.3) { const A = digits(a); A[1] = 0; a = Number(A.reverse().join('')); }
      const b = ri(23, 98), b0 = b % 10, b1 = Math.floor(b / 10); if (b0 < 2) continue;
      const p1 = mul1Cols(a, b0), p2 = mul1Cols(a, b1), s = addCols(p1.v, p2.v * 10);
      if (nCarry(p1.carries) >= 2 && nCarry(p2.carries) >= 1 && nCarry(s.carries) >= 2) return { a, b, p1: p1.v, p2: p2.v, v: a * b };
    }
  };
  G.g4Div = day => {
    for (;;) {
      if (day % 2) {   // 四位 ÷ 一位，商三位且中間（或個位）有 0
        const d = ri(3, 9), q = ri(1, 9) * 100 + (rand() < 0.65 ? ri(1, 9) : ri(1, 9) * 10), r = ri(0, d - 1), N = q * d + r;
        if (N >= 1000 && N <= 9999 && Number(String(N)[0]) < d && divSteps(N, d).rows.length <= 4) return { N, d, q, r };
      } else {        // 三、四位 ÷ 兩位，商兩位或中間有 0 的三位；除數個位 6~9（試商要調整）
        const d = ri(1, 9) * 10 + ri(6, 9), q = rand() < 0.7 ? ri(12, 98) : ri(1, 4) * 100 + ri(1, 9), r = ri(0, d - 1), N = q * d + r;
        if (q % 10 === 0 || N > 9999) continue;
        if (divSteps(N, d).rows.length <= 4) return { N, d, q, r };
      }
    }
  };
  // 紙本小卡四年級（2026-11-05 SUNNY）：四位×三位；除法＝三、四位÷兩位，或三位÷三位
  G.g4Mul3 = () => {
    for (;;) {
      let a = ri(1023, 9876); if (rand() < 0.3) { const A = digits(a); A[1 + ri(0, 1)] = 0; a = Number(A.reverse().join('')); }
      const b = ri(123, 987), D = digits(b); if (D.some(x => x < 2)) continue;
      const ps = D.map(x => mul1Cols(a, x)), s1 = addCols(ps[0].v, ps[1].v * 10);
      if (ps.every(p => nCarry(p.carries) >= 2) && nCarry(s1.carries) >= 2) return { a, b, ps: ps.map(p => p.v), v: a * b };
    }
  };
  G.g4Div2 = kind => {   // kind 0＝四位÷兩位、1＝三位÷兩位、2＝三位÷三位
    for (;;) {
      let d, q, r, N;
      if (kind === 2) { d = ri(102, 489); q = ri(2, 9); r = ri(0, d - 1); N = q * d + r; if (N > 999 || d % 10 === 0) continue; }
      else {
        d = ri(1, 9) * 10 + (rand() < 0.6 ? ri(6, 9) : ri(2, 5));
        q = kind === 0 ? (rand() < 0.75 ? ri(12, 98) : ri(1, 4) * 100 + ri(1, 9)) : (rand() < 0.5 ? ri(3, 9) : ri(12, 49));
        r = ri(0, d - 1); N = q * d + r;
        if (q % 10 === 0 || (kind === 0 ? N < 1000 || N > 9999 : N < 100 || N > 999)) continue;
      }
      if (divSteps(N, d).rows.length <= 4) return { N, d, q, r };
    }
  };
  G.g4DivZero2 = () => {   // 四位÷兩位，商三位、中間是 0（小陽忘了寫 0 用）
    for (;;) { const d = ri(12, 49), q = ri(1, 4) * 100 + ri(1, 9), r = ri(0, d - 1), N = q * d + r; if (N >= 1000 && N <= 9999) return { N, d, q, r }; }
  };
  // 四年級加減法：五位數，連續進位／連續退位（中間有 0 的退位）
  G.g4Add = () => {
    for (;;) { const a = ri(10000, 89999), b = ri(1000, 99999 - a), r = addCols(a, b); if (r.v <= 99999 && nCarry(r.carries) >= 3 && consecutive(r.carries)) return { a, b, v: a + b }; }
  };
  G.g4Sub = zero => {
    for (;;) {
      let a = ri(20000, 99999); if (zero) { const A = digits(a); A[1] = 0; A[2] = 0; a = Number(A.reverse().join('')); }
      const b = ri(1000, a - 1000), r = subCols(a, b); if (nCarry(r.borrows) >= 3 && consecutive(r.borrows)) return { a, b, v: a - b };
    }
  };
  // 題目 → 統一格式 { text, ans, L }
  G.P = {
    add: p => ({ type: 'add', text: `${p.a}＋${p.b}`, ans: p.v, L: addLayout(p.a, p.b, p.v), chk: p.a + p.b === p.v }),
    sub: p => ({ type: 'sub', text: `${p.a}－${p.b}`, ans: p.v, L: subLayout(p.a, p.b, p.v), chk: p.a - p.b === p.v && p.v + p.b === p.a }),
    mul1: p => ({ type: 'mul1', text: `${p.a}×${p.m}`, ans: p.v, L: mul1Layout(p.a, p.m, p.v), chk: p.a * p.m === p.v }),
    mul2: p => ({ type: 'mul2', text: `${p.a}×${p.b}`, ans: p.v, L: mul2Layout(p.a, p.b, p.p1, p.p2, p.v), chk: p.a * p.b === p.v && p.p1 + p.p2 * 10 === p.v }),
    mul3: p => ({ type: 'mul3', text: `${p.a}×${p.b}`, ans: p.v, L: mul3Layout(p.a, p.b, p.ps, p.v), chk: p.a * p.b === p.v && p.ps[0] + p.ps[1] * 10 + p.ps[2] * 100 === p.v }),
    div: p => ({ type: 'div', text: `${p.N}÷${p.d}`, ans: p.r ? `${p.q}…${p.r}` : p.q, L: divLayout(p.N, p.d), chk: p.q * p.d + p.r === p.N && p.r < p.d }),
  };
  G.ri = ri;
  return G;
}

// 樹洞計算挑戰：每天 5 題（種子＝日期＋年級＋名字：同一天重整不變、同學之間不一樣）
function dailySet(grade, date, name) {
  const rand = rng(hashStr(`${grade}|${date}|${name}`)), G = create(rand), P = G.P;
  const dayNo = Math.floor(Date.parse(date + 'T00:00:00Z') / 86400000);   // 用日期當「第幾天」決定單雙日的變化
  let list;
  if (date <= '2026-11-04') {   // 11/4 以前的舊排法（當天已經有孩子在做，不換題目）
    if (grade === 3) list = [P.add(G.g3Add()), P.sub(G.g3Sub(dayNo)), P.mul1(G.g3Mul(dayNo)), rand() < 0.5 ? P.add(G.g3Add()) : P.sub(G.g3Sub(dayNo + 1)), P.mul1(G.g3Mul(dayNo + 1))];
    else list = [P.mul1(G.g4Mul1()), P.mul2(G.g4Mul2()), P.mul2(G.g4Mul2()), P.div(G.g4Div(1)), P.div(G.g4Div(0))];
    return list.map((p, i) => Object.assign(p, { id: `${date}-${i + 1}` }));
  }
  // 2026-11-05 起（SUNNY：加減乘除比例相當，不要都是加減法）：每種至少 1 題，多的輪流；順序每天打亂
  const mk = {
    3: { add: () => P.add(G.g3Add()), sub: k => P.sub(G.g3Sub(dayNo + k)), mul: k => P.mul1(G.g3Mul(dayNo + k)) },
    4: { add: () => P.add(G.g4Add()), sub: k => P.sub(G.g4Sub((dayNo + k) % 2 === 0)), mul: k => (k ? P.mul1(G.g4Mul1()) : P.mul2(G.g4Mul2())), div: k => P.div(G.g4Div((dayNo + k) % 2)) },
  }[grade === 3 ? 3 : 4];
  const kinds = Object.keys(mk), extra = grade === 3 ? [kinds[dayNo % 3], kinds[(dayNo + 1) % 3]] : [kinds[dayNo % 4]];   // 三年級：3 種＋2 題輪流（三天一輪剛好平均）；四年級：4 種＋1 題輪流
  list = kinds.map(k => mk[k](0)).concat(extra.map(k => mk[k](1)));
  for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
  return list.map((p, i) => Object.assign(p, { id: `${date}-${i + 1}` }));
}

// ================= 樹洞計算挑戰：批改、找錯在哪、一步一步教 =================
// 題目給的格子（孩子不用填）：直式＝上面兩列；除法＝除數和被除數那一列
function isGiven(L, r) { return L.kind === 'd' ? r === 1 : r <= 1; }
// 三位×兩位：乘十位那一列最後的 0 有寫、沒寫都算對
function optionalZero(L, r, c) { return L.op === '×2' && r === 3 && c === L.cols - 1; }
const POS = ['個位', '十位', '百位', '千位', '萬位', '十萬位'];

// 每一格「進到這一格的進位／借位」（直式才有）：{r,c} → 數字
function carryMap(L) {
  const m = {}, n = s => Number(L.rows[s].join('').replace(/[^0-9]/g, '') || 0), put = (r, arr, shift = 0) => arr.forEach((c, i) => { if (c) m[r + ',' + (L.cols - 1 - i - shift)] = c; });
  if (L.kind !== 'v') return m;
  const a = n(0), b = n(1);
  if (L.op === '+') put(2, addCols(a, b).carries);
  else if (L.op === '-') put(2, subCols(a, b).borrows);
  else if (L.op === '×') put(2, mul1Cols(a, b).carries);
  else { put(2, mul1Cols(a, b % 10).carries); put(3, mul1Cols(a, Math.floor(b / 10)).carries, 1); put(4, addCols(n(2), n(3) * 10).carries); }
  return m;
}

// 批改：kid＝孩子填的格子（同 L.rows 大小，空格用 ' '）
// 回傳 { ok, unfinished, wrong:[[r,c]], type, hint }
function grade(L, kid) {
  const need = [], wrong = [];
  L.rows.forEach((row, r) => { if (isGiven(L, r)) return; row.forEach((ch, c) => {
    const k = (kid[r] && kid[r][c]) || ' ';
    if (optionalZero(L, r, c)) { if (k !== ' ' && k !== '0') wrong.push([r, c]); return; }
    if (k !== ch) wrong.push([r, c]);
  }); });
  // 還沒填完：哪一列該有數字卻整列空白 → 不算作答，請他填完
  L.rows.forEach((row, r) => { if (!isGiven(L, r) && row.some(ch => ch !== ' ') && !(kid[r] || []).some(ch => ch && ch !== ' ')) need.push(r); });
  if (need.length) return { ok: false, unfinished: true, rows: need, hint: '還有一列沒有填，全部算完再按「完成」喔！' };
  if (!wrong.length) return { ok: true, wrong: [] };
  const t = classify(L, kid, wrong);
  return { ok: false, wrong, type: t.type, hint: t.hint, focus: t.focus };
}
const rowStr = (row, from = 0) => row.join('').slice(from).trim();
function classify(L, kid, wrong) {
  const k = (r, c) => (kid[r] && kid[r][c]) || ' ';
  // ① 對位：這一列的數字整串往左或往右歪了一格
  for (const r of [...new Set(wrong.map(w => w[0]))]) {
    const want = rowStr(L.rows[r]), got = rowStr(kid[r] || []);
    if (want && got && (want === got || (L.op === '×2' && r === 3 && want.replace(/0$/, '') === got.replace(/0$/, '')))) {
      const hint = L.op === '×2' && r === 3 ? '乘十位的這一列，要從十位開始寫，個位先寫一個 0（或空著）。數字有沒有往左對齊一格？' : '這一列的數字有沒有對齊？從最右邊的個位開始往左寫。';
      return { type: 'align', hint, focus: r };
    }
  }
  if (L.kind === 'd') {
    const st = L.st;
    // ② 商中間的 0 沒寫
    const qCells = st.q.map((qd, i) => [qd, L.dd + i]).filter(([qd]) => qd === 0);
    if (qCells.some(([, c]) => k(0, c) === ' ' && wrong.some(w => w[0] === 0 && w[1] === c)))
      return { type: 'zero', hint: '商有一位不夠除，那一位要先寫 0 佔位子喔！', focus: 0 };
    // ③ 減完的數比除數還大 → 商太小
    for (let r = 2; r < L.rows.length; r++) {
      if (L.bars.includes(r)) continue;
      const v = Number(rowStr(kid[r] || []).replace(/\s/g, '') || NaN);
      if (v >= L.d && r === L.rows.length - 1) return { type: 'remainder', hint: `最後剩下的數比除數 ${L.d} 還大，商可以再大一點喔！`, focus: r };
    }
    // ④ 乘的那一列算錯（商×除數）
    if (wrong.some(w => L.bars.includes(w[0]))) return { type: 'divmul', hint: `紅色這一列是「商 × ${L.d}」，再乘一次看看，手上記的有加上去嗎？`, focus: wrong.find(w => L.bars.includes(w[0]))[0] };
    if (wrong.some(w => w[0] >= 2)) return { type: 'divsub', hint: '紅色這一列是上面兩個數相減，再減一次看看，要借位的地方有借嗎？', focus: wrong.find(w => w[0] >= 2)[0] };
    return { type: 'quot', hint: '商算錯了：想一想，這裡面有幾個除數？', focus: 0 };
  }
  // ⑤ 忘了加進位（加、乘）／忘了少 1（減）
  const cm = carryMap(L);
  for (const [r, c] of wrong) {
    const cr = cm[r + ',' + c], want = Number(L.rows[r][c]), got = Number(k(r, c));
    if (!cr || isNaN(got) || k(r, c) === ' ') continue;
    if (L.op === '-' && got === (want + cr) % 10) return { type: 'borrow', hint: `紅色這一格：右邊借走了 1，${POS[L.cols - 1 - c]}要先少 1 再減喔！`, focus: r };
    if (L.op !== '-' && got === (want - cr + 10) % 10) {
      const verb = L.op === '+' || (L.op === '×2' && r === 4) ? '加完' : '乘完';
      return { type: 'carry', hint: `紅色這一格：${verb}之後，手上記的有加上去嗎？`, focus: r };
    }
  }
  const verb = L.op === '+' || (L.op === '×2' && wrong[0][0] === 4) ? '加' : L.op === '-' ? '減' : '乘';
  return { type: 'other', hint: `紅色的格子再${verb}一次看看，一位一位慢慢來！`, focus: wrong[0][0] };
}

// 第二次還錯：一步一步教（每一步填哪幾格＋一句說明）。進位只用說的「記在手上」，不畫小小的進位數字
function teachSteps(L) {
  const S = [], cols = L.cols, n = s => Number(L.rows[s].join('').replace(/[^0-9]/g, '') || 0);
  const cell = (r, c) => [r, c, L.rows[r][c]];
  const colAdd = (r, A, B, op, bShift = 0) => {   // 加、減：從個位一位一位來（bShift：B 的右邊幾位是空的）
    const res = op === '+' ? addCols(A, B) : subCols(A, B), dA = digits(A), dB = digits(B), len = String(res.v).length;
    for (let i = 0; i < (op === '-' ? dA.length : len); i++) {
      const c = cols - 1 - i, a = dA[i] || 0, b = dB[i] || 0;
      if (op === '-' && i >= len) { const br = res.borrows[i]; S.push({ cells: [], say: `${POS[i]}：${br ? `${a} 被借走 1，剩 ${a - br}；` : ''}${a - br}－${b}＝0，最前面的 0 不用寫` }); continue; }
      if (op === '+') {
        const cr = res.carries[i], sum = a + b + cr;
        if (i >= dA.length && i >= dB.length) { S.push({ cells: [cell(r, c)], say: `最後手上還記著 ${cr}，寫在${POS[i]}` }); continue; }
        const only = i >= dA.length ? b : (i >= dB.length || i < bShift) ? a : null;
        S.push({ cells: [cell(r, c)], say: only !== null ? `${POS[i]}：只有 ${only}${cr ? `，再加手上記的 ${cr} ＝ ${sum}` : ''}${sum >= 10 ? `，寫 ${sum % 10}，手上記 1` : `，寫 ${sum}`}` : `${POS[i]}：${a}＋${b}${cr ? `，再加手上記的 ${cr}` : ''} ＝ ${sum}${sum >= 10 ? `，寫 ${sum % 10}，手上記 1` : ''}` });
      } else {
        const br = res.borrows[i], top = a - br;
        // 0 被右邊借：0 不夠借，先向左邊借 1 變成 10，借給右邊 1 剩 9（不會出現「剩 -1」）
        const say = br && a === 0 ? `${POS[i]}：0 不夠借，先向左邊借 1 變成 10，借給右邊 1 剩 9；9－${b}＝${9 - b}`
          : `${POS[i]}：${br ? `${a} 被借走 1，剩 ${top}；` : ''}${top < b ? `${top} 不夠減 ${b}，向左邊借 1 → ${top + 10}－${b}＝${top + 10 - b}` : `${top}－${b}＝${top - b}`}`;
        S.push({ cells: [cell(r, c)], say });
      }
    }
  };
  const colMul = (r, A, m, shift) => {   // 乘一位數：從個位一位一位來，最後一位整個寫下去
    const res = mul1Cols(A, m), dA = digits(A);
    for (let i = 0; i < dA.length; i++) {
      const c = cols - 1 - i - shift, cr = res.carries[i] || 0, p = dA[i] * m + cr, last = i === dA.length - 1;
      const head = `${shift ? '' : POS[i] + '：'}${dA[i]}×${m}＝${dA[i] * m}${cr ? `，再加手上記的 ${cr} ＝ ${p}` : ''}`;
      // 乘十位的第一個數字：寫在十位數的底下（不寫 0）
      const where = shift && i === 0 ? `，${p % 10} 要寫在十位數 ${m} 的底下` : '';
      if (last) { const w = String(p), cs = w.split('').map((_, k) => cell(r, c - (w.length - 1 - k))); S.push({ cells: cs, say: head + (p >= 10 ? `，最後一位，${p} 整個寫下去` : `，寫 ${p}`) }); }
      else S.push({ cells: [cell(r, c)], say: head + (where || (p >= 10 ? `，寫 ${p % 10}` : `，寫 ${p}`)) + (p >= 10 ? `，手上記 ${Math.floor(p / 10)}` : '') });
    }
  };
  if (L.kind === 'v') {
    const a = n(0), b = n(1);
    if (L.op === '+' || L.op === '-') colAdd(2, a, b, L.op);
    else if (L.op === '×') colMul(2, a, b, 0);
    else {
      const b0 = b % 10, b1 = Math.floor(b / 10);
      S.push({ cells: [], say: `先用個位數的 ${b0} 打山豬` }); colMul(2, a, b0, 0);
      S.push({ cells: [], say: `再來換十位數的 ${b1} 打山豬` }); colMul(3, a, b1, 1);
      S.push({ cells: [], say: '最後兩列加起來' }); colAdd(4, n(2), n(3) * 10, '+', 1);
    }
  } else {
    const st = L.st, d = L.d, s = st.s;
    const f = st.q.findIndex(x => x !== null);
    let top = Number(s.slice(0, f + 1)), k = 0, wr = -1;
    const bring = (i, row) => { if (i >= s.length - 1) return; const dg = s[i + 1]; top = top * 10 + Number(dg); S.push({ cells: [cell(row, L.dd + i + 1)], say: `把下一位 ${dg} 拿下來，變成 ${top}` }); };
    for (let i = f; i < s.length; i++) {
      const qd = st.q[i], c = L.dd + i;
      if (qd === 0) { S.push({ cells: [cell(0, c)], say: `${top} 不夠除 ${d}，商這一位寫 0` }); bring(i, wr); continue; }
      const prod = qd * d, rem = top - prod, pr = 2 + k, rr = 3 + k;
      S.push({ cells: [cell(0, c)], say: `${top} 裡面有幾個 ${d}？${qd} 個，商寫 ${qd}` });
      S.push({ cells: L.rows[pr].map((ch, j) => [pr, j, ch]).filter(x => x[2] !== ' '), say: `${d}×${qd}＝${prod}，寫在下面` });
      S.push({ cells: L.rows[rr].map((ch, j) => [rr, j, ch]).filter(x => x[2] !== ' ' && x[1] <= c), say: `${top}－${prod}＝${rem}` });
      top = rem; wr = rr; k += 2; bring(i, rr);
    }
    S.push({ cells: [], say: st.rem ? `最後剩 ${st.rem}，比 ${d} 小，就是餘數` : '最後剩 0，剛好除完' });
  }
  return S;
}

return { isGiven, optionalZero, carryMap, grade, classify, teachSteps, rng, hashStr, digits, addCols, subCols, mul1Cols, nCarry, consecutive, vLayout, addLayout, subLayout, mul1Layout, mul2Layout, mul3Layout, divSteps, divLayout, blankOf, diffCells, checkLayout, create, dailySet };
});
