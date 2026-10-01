// Screenshot the page or one element:  [THEME=light|dark] node tools/shot.mjs out.png [selector] [scale] [width] [height]
import { open, SITE } from "./cdp.mjs";
const [, , out, sel = "", scale = 1, w = 1440, h = 900] = process.argv;
const p = await open(SITE, { width: +w, height: +h, mobile: +w < 700 });
await p.sleep(1500);
if (process.env.THEME) { await p.ev(`document.documentElement.dataset.theme = "${process.env.THEME}"`); await p.sleep(500); } // THEME=light|dark
const clip = sel && JSON.parse(await p.ev(`(() => { const b = document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect(); return JSON.stringify({ x: b.x + scrollX, y: b.y + scrollY, width: b.width, height: b.height }); })()`));
await p.shot(out, clip && { ...clip, scale: +scale });
console.log(p.logs.join("\n") || "no console errors");
p.close();
