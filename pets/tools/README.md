# 寵物人生路線圖：阿居畫圖 → 切圖

## 進度（2026-10-23 晚）
- **31 條全部畫完、去背切好，放在 img/**（`<寵物>_<路線>_2/3/4.png`），**還沒加進 index.html 的 ART，孩子看不到**，等 SUNNY 驗收。
- dog_soccer 傳說已重畫（一般金色雙耳獎盃，不像世界盃）。
- 驗收頁：浩克工作室 `程式碼\三年級寵物蛋\測試畫面\寵物路線驗收.html`（`node review.cjs` 產生，可切深色底看去背邊）。
- 阿居原圖存浩克工作室 `程式碼\三年級寵物蛋\img\阿居原圖\raw_<路線>.png`。

## 做法（Windows 電腦浩克，沒有 Python → 用 node 版）
1. Claude in Chrome 開 chatgpt.com，**每條路線開一個全新分頁**（Chrome 會擋同一分頁的第二次自動下載）。
2. `file_upload` 上傳參考圖 `程式碼\三年級寵物蛋\img\<寵物>_1.png`（只能傳浩克工作室內的檔）。
3. 指令用 `node prompt.cjs <路線>` 產生；用 JS 塞進 `.ProseMirror` 輸入框（`execCommand('insertText')`，不要用鍵盤打，會被輸入法改字），再點 `button[aria-label=傳送]`。
4. 畫好後在同一分頁用 JS 抓 `img[alt^=產生的圖片]` 的 blob → `<a download>` 存到「下載」（1536×1024 原圖）。
5. `node cut3.cjs <原圖> out/<路線>` → `_2/_3/_4.png`（512 透明）＋ `_preview.png`。
   - 預設用連通塊分三隻（三隻沒互碰就全自動），道具小塊歸最近那隻；手臂圍住的白底會自動挖掉。
   - 三隻黏在一起：`SEEDS="x:y|x:y;x:y;x:y"`（原圖座標，每隻可給多點）。真的切不乾淨就請阿居「三隻拉開距離重畫」比較快。
   - 單隻重畫：`ONE=1 node cut3.cjs <原圖> out/<路線>_4`。
6. 圖放進 `img/`；SUNNY 看過 OK 才把檔名加進 `index.html` 的 `ART`。
（舊的 Python 版 prompts.py / cut.py / run.sh 保留，雲端 Linux 環境用。）
