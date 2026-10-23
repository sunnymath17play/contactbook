// node cut3.cjs <原圖> <輸出前綴>  → <前綴>_2/3/4.png（512 透明）＋ _preview.png
// 去白底（四邊 flood，WT 預設 247）→ 依欄位空隙切三隻；空隙不夠就用 SEEDS="x:y;x:y;x:y"（原圖座標）做區域成長
const { createCanvas, loadImage } = require('C:/Users/sunny/Dropbox/浩克工作室/程式碼/小考產生器/node_modules/@napi-rs/canvas');
const fs = require('fs');
const WT = +(process.env.WT || 247), SEEDS = process.env.SEEDS || '';
(async () => {
  const [src, pre] = process.argv.slice(2);
  const img = await loadImage(fs.readFileSync(src)); const W = img.width, H = img.height;
  const c = createCanvas(W, H), g = c.getContext('2d'); g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, W, H), p = d.data;
  const wh = k => { const i = k * 4, mx = Math.max(p[i], p[i+1], p[i+2]), mn = Math.min(p[i], p[i+1], p[i+2]); return mn >= WT && mx - mn < 10; };
  const bg = new Uint8Array(W * H), st = [];
  for (let x = 0; x < W; x++) st.push(x, (H-1)*W + x); for (let y = 0; y < H; y++) st.push(y*W, y*W + W-1);
  while (st.length) { const k = st.pop(); if (bg[k] || !wh(k)) continue; bg[k] = 1; const x = k % W;
    if (x > 0) st.push(k-1); if (x < W-1) st.push(k+1); if (k >= W) st.push(k-W); if (k < W*(H-1)) st.push(k+W); }
  // 被身體/道具圍住的白底：純白大塊（>1500 像素、九成八 ≥250）也挖掉
  { const seen=new Uint8Array(W*H); const pure=k=>{const i=k*4;return Math.min(p[i],p[i+1],p[i+2])>=WT&&Math.max(p[i],p[i+1],p[i+2])-Math.min(p[i],p[i+1],p[i+2])<10;};
    let holes=0;
    for (let s0=0;s0<W*H;s0++){ if(bg[s0]||seen[s0]||!pure(s0)) continue; const q=[s0]; seen[s0]=1; let hi=0;
      for(let h=0;h<q.length;h++){const k=q[h],x=k%W; const i=k*4; if(Math.min(p[i],p[i+1],p[i+2])>=250) hi++;
        for(const m of [x>0?k-1:-1,x<W-1?k+1:-1,k-W,k+W]) if(m>=0&&m<W*H&&!seen[m]&&!bg[m]&&pure(m)){seen[m]=1;q.push(m);} }
      if(q.length>(+process.env.HOLE||1500)&&hi/q.length>0.85){ for(const k of q) bg[k]=1; holes++; } }
    if(holes) console.log('挖掉被圍住的白底', holes, '塊'); }
  // alpha：背景 0；與背景相鄰的前景半透明（柔邊）
  const A = new Uint8Array(W * H);
  for (let k = 0; k < W*H; k++) { if (bg[k]) continue; const x = k % W; let nb = 0;
    if (x > 0 && bg[k-1]) nb++; if (x < W-1 && bg[k+1]) nb++; if (k >= W && bg[k-W]) nb++; if (k < W*(H-1) && bg[k+W]) nb++;
    A[k] = nb ? 140 : 255; }
  const fg = k => A[k] > 40;
  const lab = new Int32Array(W * H);
  if (process.env.ONE) { for (let k=0;k<W*H;k++) if (fg(k)) lab[k]=1; }
  // 連通塊：最大三塊＝三隻角色；其他小塊（道具、花盆）歸給最近的那隻
  const comp=new Int32Array(W*H), info=[]; let nc=0;
  for (let s0=0;s0<W*H;s0++){ if(!fg(s0)||comp[s0]) continue; nc++; const q=[s0]; comp[s0]=nc; let n=0,X0=W,X1=0,Y0=H,Y1=0,sx=0,sy=0;
    for(let h=0;h<q.length;h++){const k=q[h],x=k%W,y=(k/W)|0;n++;sx+=x;sy+=y;if(x<X0)X0=x;if(x>X1)X1=x;if(y<Y0)Y0=y;if(y>Y1)Y1=y;
      for(const m of [x>0?k-1:-1,x<W-1?k+1:-1,k-W,k+W]) if(m>=0&&m<W*H&&!comp[m]&&fg(m)){comp[m]=nc;q.push(m);} }
    info[nc]={n,X0,X1,Y0,Y1,cx:sx/n,cy:sy/n}; }
  const ids=info.map((v,i)=>v?i:0).filter(Boolean).sort((p,q)=>info[q].n-info[p].n);
  const big=ids.slice(0,3), tot=ids.reduce((s,i)=>s+info[i].n,0);
  if (process.env.ONE) {} else if (!SEEDS && big.length===3 && info[big[2]].n > tot*0.08) {
    big.sort((p,q)=>info[p].cx-info[q].cx);
    const owner={}; big.forEach((id,i)=>owner[id]=i+1);
    for(const id of ids){ if(owner[id]) continue; const c=info[id]; let best=0,bd=1e9;
      big.forEach((bid,i)=>{const B=info[bid];const dx=Math.max(B.X0-c.cx,0,c.cx-B.X1),dy=Math.max(B.Y0-c.cy,0,c.cy-B.Y1);const d=dx*dx+dy*dy;if(d<bd){bd=d;best=i+1;}});
      owner[id]=best; }
    for(let k=0;k<W*H;k++) if(comp[k]) lab[k]=owner[comp[k]];
    console.log('連通塊切：三隻', big.map(i=>info[i].n).join('/'), '＋小塊', ids.length-3);
  } else {
    if (!SEEDS) { console.log('⚠ 三隻黏在一起，請給 SEEDS'); process.exit(2); }
    const q = []; const pts=[]; SEEDS.split(';').forEach((grp, i) => grp.split('|').forEach(s => { const [sx, sy] = s.split(':').map(Number); pts.push([sx,sy,i+1]);
      for (let y = sy-30; y <= sy+30; y++) for (let x = sx-30; x <= sx+30; x++) { const k = y*W + x; if ((x-sx)**2+(y-sy)**2 < 900 && fg(k)) { lab[k] = i+1; q.push(k); } } }));
    for (let h = 0; h < q.length; h++) { const k = q[h], x = k % W;
      for (const n of [x > 0 ? k-1 : -1, x < W-1 ? k+1 : -1, k-W, k+W]) if (n >= 0 && n < W*H && !lab[n] && fg(n)) { lab[n] = lab[k]; q.push(n); } }
    // 沒連到的碎塊：給最近的種子點
    for (let k = 0; k < W*H; k++) if (fg(k) && !lab[k]) { const x = k % W, y = (k / W) | 0; let b = 0, bd = 1e18; for (const [px,py,l] of pts) { const d=(x-px)**2+(y-py)**2; if (d<bd) { bd=d; b=l; } } lab[k] = b; }
    console.log('SEEDS 區域成長');
  }
  // CLAMP="2:0:900" → 第2隻超出 x 範圍的像素改給隔壁
  if (process.env.CLAMP) for (const c of process.env.CLAMP.split(';')) { const [i,a,b]=c.split(':').map(Number);
    for (let k=0;k<W*H;k++) if (lab[k]===i) { const x=k%W; if (x<a) lab[k]=i-1; else if (x>b) lab[k]=i+1; } }
  // WOOD="340:395"：木頭色（畫架）歸第2隻；第2隻在 x<395 的非木頭像素歸第1隻
  if (process.env.WOOD) { const [a,b]=process.env.WOOD.split(':').map(Number); const wood=k=>{const i=k*4,r=p[i],g=p[i+1],bl=p[i+2];return r>120&&r-bl>50&&r>=g&&g>70&&bl<150&&r-g<90;};
    for (let k=0;k<W*H;k++){ const x=k%W; if(lab[k]===1&&x>a&&wood(k)) lab[k]=2; else if(lab[k]===2&&x<b&&!wood(k)) lab[k]=1; } }
  const outs = [];
  for (let i = 1; i <= (process.env.ONE?1:3); i++) {
    let bx0 = W, by0 = H, bx1 = 0, by1 = 0, n = 0;
    const m = createCanvas(W, H), mg = m.getContext('2d'), md = mg.createImageData(W, H);
    for (let k = 0; k < W*H; k++) if (lab[k] === i) { const x = k % W, y = (k / W) | 0; n++;
      md.data.set([p[k*4], p[k*4+1], p[k*4+2], A[k]], k*4); if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y; }
    mg.putImageData(md, 0, 0);
    const w = bx1-bx0+1, h = by1-by0+1, side = Math.round(Math.max(w, h) * 1.06);
    const o = createCanvas(512, 512), og = o.getContext('2d'), s = 512 / side;
    og.imageSmoothingQuality = 'high';
    og.drawImage(m, bx0, by0, w, h, (side-w)/2*s, (side-h-side*0.02)*s, w*s, h*s);
    fs.writeFileSync(process.env.ONE?`${pre}.png`:`${pre}_${i+1}.png`, o.toBuffer('image/png')); outs.push(o);
    console.log(`  ${i+1}: ${w}x${h} 像素 ${n}`);
  }
  const pv = createCanvas(1536, 512), pg = pv.getContext('2d'); pg.fillStyle = '#ffecd2'; pg.fillRect(0, 0, 1536, 512);
  outs.forEach((o, i) => pg.drawImage(o, i*512, 0)); fs.writeFileSync(`${pre}_preview.png`, pv.toBuffer('image/png'));
})();
