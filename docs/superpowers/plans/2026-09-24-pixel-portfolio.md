# Pixel Portfolio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> 執行方式：inline（同一個 session）。像素美術需要「寫 → 截圖 → 看 → 改」的迴圈，程式碼在執行時撰寫並以截圖驗證，不預先寫進本計畫。

> **2026-09-24 改版：** 使用者看過 Task 2–3 後，決定畫風保留、操作改成一般網站（仿 2001 Habbo 官網）。Task 3 的視窗系統整個由「左欄面板 + 右側欄」取代，Task 4 的 NPC 在新版面的首頁插圖裡完成；驗證改用新的瀏覽器測試（見 spec「驗證」）。

**Goal:** Habbo 風格的等角像素房間作品集，靜態部署到 GitHub Pages。

**Architecture:** 三支 classic script（`content.js` 資料 → `sprites.js` 像素圖 → `main.js` 行為），無 build。房間是一張 SVG（固定 viewBox，等比縮放），物件是 SVG `<a href="#id">`；視窗是 HTML `role="dialog"`，由 hash 驅動。

**Tech Stack:** HTML / CSS / vanilla JS、Google Fonts（Silkscreen、IBM Plex Sans）、Node 24（只跑 `check.mjs`）、headless Chrome（截圖）。

**Spec:** `docs/superpowers/specs/2026-09-24-pixel-portfolio-design.md`

## Global Constraints

- 無 npm dependency、無 build；雙擊 `index.html`（file://）也要能跑 → 不用 ES modules。
- 所有路徑相對（`kaojenli.github.io` 與 `<user>.github.io/<repo>` 都要能跑）。
- 不發佈：`CV_JLK.pdf`、`me.jpeg`、`template.rtf`；任何檔案不得出現電話號碼。
- 網站文字只用 CV 事實，不編造成果、數字、年資。
- 顯示名稱：Jen Li Kao；語言：English。
- `prefers-reduced-motion`：無自動動畫、無 NPC 走動、無自動泡泡。
- ≤720px：視窗全螢幕、不可拖曳。

## 介面（跨檔案共用的名字）

```js
// content.js
const CONTENT = {
  person: { name, tagline, now, based, email, links: [{ label, url }], intro },
  windows: [{ id, title, label }],            // Navigator 順序；id ∈ about|projects|experience|education|papers|skills|contact
  roomObjects: [{ key, opens, label }],        // key = sprite/家具名；opens = 視窗 id 或 'projects/<slug>'
  projects: [{ slug, title, org, date, cat, file, icon, bullets[], tags[], links[{label,url}], image? }],
  experience: [{ role, org, place, date, bullets[], project? }],
  education, papers, skills, ticker[], nowPlaying[],
  npcs: { <name>: { lines[], click[] } }, greeting
};
// sprites.js
const SPRITES = { <name>: { w, h, rows: string[] } };   // 每列等長；字元 → PALETTE
function spriteSVG(name, palette, x, y) -> string        // 合併同色水平 run 成 <rect>
// main.js
openWin(id), closeWin(id)                                // hash routing 的唯一入口
```

---

### Task 1: 內容與檢查

**Files:** Create `content.js`, `check.mjs`

- [ ] 把 CV 內容寫進 `content.js`（7 專案、6 經歷、3 學歷、論文 + 演講、技能、連結、NPC 台詞）。
- [ ] `check.mjs`：vm 載入 `content.js` / `sprites.js`；驗證 roomObjects.opens 都指向存在的視窗、每個專案有 title/bullets/cat、連結皆 `https://` 或 `mailto:`、sprite 每列等長且字元都在 palette、所有要發佈的檔案無電話格式字串、`git ls-files` 不含私人檔。`--links` 旗標額外 fetch 每個外部連結並印出狀態。
- [ ] 負面測試：暫時在 `content.js` 加一個電話格式字串 → `node check.mjs` 必須失敗；移除後通過。
- [ ] Commit。

### Task 2: 房間、avatar、一個 NPC（美術檢查點）

**Files:** Create `index.html`, `style.css`, `sprites.js`, `main.js`

- [ ] 等角工具：`iso(x, y)`、`box(...)`（上/左/右三面）、牆面平行四邊形。
- [ ] 天空背景 + 像素雲、8×8 地板（含厚度）、左右牆、窗戶、證書、門。
- [ ] 家具：電腦桌 + 雙螢幕、書架、檔案櫃、沙發、地毯、雷達、盆栽、棒球。
- [ ] 人物 16×32 基底姿勢（stand / walkA / walkB / armsUp / sit）+ 髮型/配件 overlay；Jen avatar + 跳舞 NPC。
- [ ] 深度排序（格子 x+y）。
- [ ] 驗證：`node check.mjs` 通過；headless Chrome 截圖 1440×900，自己看過再修。

### Task 3: 視窗系統、Navigator、工具列

**Files:** Modify `main.js`, `style.css`, `index.html`

- [ ] 每個視窗 id 的 render 函式；專案列表 → `#projects/<slug>` 詳細視窗；Experience 用 `<details>` 展開。
- [ ] `openWin`/`closeWin`：置頂、錯位、焦點移入/歸還、`Esc`、拖曳（pointer capture、夾在 viewport 內）、hash 同步。
- [ ] Navigator（桌機預設開啟；無 hash 時）、底部工具列、hover 標籤。
- [ ] 驗證：`#projects/sigma` 等 hash 直接截圖；CDP 腳本（scratchpad，不進 repo）點每個房間物件 → 對應視窗出現、Esc 關閉、拖曳改變位置。
- [ ] **檢查點**：截圖給使用者確認美術方向，通過後才做 Task 4–5。

### Task 4: 其餘 NPC 與泡泡

- [ ] 投手（投球 + 骨架閃爍）、雷達人（波紋）、研究生（沙發 + 論文）、咖啡人（隨機走動、避開家具格、重新排序深度）。
- [ ] 隨機泡泡、點 NPC 冒彩蛋台詞；reduced motion 關閉自動行為。
- [ ] 驗證：連續截圖兩張，咖啡人位置不同；reduced-motion 模擬下位置不變。

### Task 5: 狀態列、跑馬燈、逐字 hover、手機版

- [ ] 狀態列（now playing 輪播 + 台北時間）、跑馬燈（無縫循環）、逐字翻動 hover。
- [ ] ≤720px 版面：房間滿寬、房間下方 Navigator 清單、視窗全螢幕。
- [ ] 驗證：390×844 截圖、1440×900 截圖。

### Task 6: 最終驗證與部署

- [ ] `node check.mjs --links`；每個連結狀態合理（LinkedIn/IEEE 擋 bot 屬預期）。
- [ ] 全流程截圖；確認 `git ls-files` 無私人檔。
- [ ] **先問使用者**，再 `git push` 到 `https://github.com/kaojenli/kaojenli.github.io.git`；提供 Pages 設定步驟。
