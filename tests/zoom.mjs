// Screenshot a region of the hero scene given in scene units:  node tests/zoom.mjs out.png x y w h [scale]
import { open, SITE } from "./cdp.mjs";
const [, , out, x, y, w, h, scale = 1.5] = process.argv;
const p = await open(SITE, { width: 1440, height: 900 });
await p.sleep(2500);
const clip = JSON.parse(await p.ev(`(() => { const b = document.getElementById('scene').getBoundingClientRect(), k = b.width / VW; return JSON.stringify({ x: b.x + scrollX + ${x} * k, y: b.y + scrollY + ${y} * k, width: ${w} * k, height: ${h} * k }); })()`));
await p.shot(out, { ...clip, scale: +scale });
p.close();
