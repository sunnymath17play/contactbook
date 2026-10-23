# 寵物人生路線圖：阿居畫圖 → 切圖

## 進度（2026-10-23）
- 已畫好、已去背、放在 img/（**還沒加進 index.html 的 ART，孩子看不到**，等 SUNNY 驗收）：
  dragon_math / actuary / chef / astro，cat_boxing / detective / piano / fashion，
  dog_rescue / vet / soccer / engineer，bunny_jump（共 13 條）
- 要重畫：dog_soccer 傳說（獎盃太像真實的世界盃獎盃，改成一般金色大獎盃）
- 還沒畫（18 條）：bunny_farm / ballet / baker，penguin_swim / polar / weather / robot，
  bear_boss / lift / forest / doctor，owl_writer / star / teacher / chess，
  unicorn_paint / magic / sing / prism
- 驗收頁（claude.ai artifact「寵物路線新圖驗收」）目前只放前 7 條

## 做法
1. 用 Claude in Chrome 開 chatgpt.com（SUNNY 的 Plus 帳號），每條路線開一個新對話（可同時開 3 個分頁一起畫）。
2. 上傳參考圖 `img/<寵物>_1.png`，貼上 `python3 prompts.py <路線代號>` 印出的指令。
   注意：輸入框會殘留上一則草稿，貼之前先全選清掉；指令不要有換行（換行會直接送出）。
3. 畫好後在頁面上用一層白底 overlay 把圖放成 1536×1024 原尺寸，分上下兩段截圖（zoom + save_to_disk）。
4. `SEEDS="x:y;x:y;x:y" bash run.sh <路線代號> <上半截圖> <下半截圖>` → `out/<路線>_2/3/4.png`（512×512 透明背景）。
   SEEDS＝拼好後 1536×1024 座標裡三隻身體的位置；不給就用腳的位置自動分（有頒獎台、鋼琴這類大道具時會分錯）。
   去背門檻 WT 預設 247（白袍不會被吃掉）。
5. 圖放進 `img/`；SUNNY 看過 OK 才把檔名加進 `index.html` 的 `ART`。
