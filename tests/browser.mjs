// Browser checks for the page:  node tests/browser.mjs   (needs Google Chrome; exits 1 on any failure)
import { open, SITE } from "./cdp.mjs";
let failed = 0;
const ok = (cond, msg) => { console.log((cond ? "✓ " : "✗ ") + msg); if (!cond) failed++; };
const center = (sel) => `(() => { const r = document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; })()`;
const reveal = (sel) => `document.querySelector(${JSON.stringify(sel)}).scrollIntoView({ block: "center", behavior: "instant" })`;
// At the top of the screen, or (for the last panels) the page is at its bottom and the panel is on screen.
const inView = (id) => `(() => { const r = document.getElementById(${JSON.stringify(id)}).getBoundingClientRect();
  const atBottom = scrollY + innerHeight >= document.documentElement.scrollHeight - 2;
  return (r.top >= -2 && r.top < 120) || (atBottom && r.top >= 0 && r.top < innerHeight - 100); })()`;

// ---- desktop
let p = await open(SITE);
// wait until the greeting has finished its pop-in (it slides up into place), then check where it sits
await p.ev(`new Promise((done) => { const t0 = Date.now(); (function poll() { const b = document.querySelector('.bubble[data-for="jen"]'); const a = b && b.getAnimations()[0]; if ((a && a.currentTime > 450) || Date.now() - t0 > 4000) done(); else setTimeout(poll, 50); })(); })`);
ok(await p.ev(`(() => { const a = document.querySelector('.who[data-look="jen"] .hit').getBoundingClientRect(); const b = document.querySelector('.bubble[data-for="jen"]'); if (!b) return 'no bubble'; const r = b.getBoundingClientRect(); return Math.abs((r.left + r.right) / 2 - (a.left + a.right) / 2) < 3 && r.bottom <= a.top + 2; })()`) === true, "greeting bubble sits above Jen");
ok(await p.ev(`document.querySelectorAll('#scene .who').length === Object.keys(CONTENT.npcs).length`), "every NPC in content.js is in the building");
ok(await p.ev(`[...document.querySelectorAll('.scene-box img')].filter((i) => i.naturalWidth > 0).length`) === 7 && await p.ev(`document.querySelectorAll('.scene-box [tabindex], .scene-box .who').length`) === 0, "7 room close-ups (pictures that load), none focusable or clickable");
console.log("  DOM elements:", await p.ev(`document.getElementsByTagName('*').length`));
ok(await p.ev(`document.querySelectorAll('.room-tag').length`) === 0, "no room names drawn on the picture");
ok(await p.ev(`document.querySelectorAll('#panels .section').length`) === 7 && await p.ev(`document.querySelectorAll('.proj').length`) === 7, "7 sections and 7 projects rendered");
ok(await p.ev(`(() => { const h = document.querySelector('.hero h1').getBoundingClientRect(), l = document.getElementById('hero-lede'); return h.bottom < innerHeight && l.textContent.length > 50; })()`), "the name and the intro are the first thing on the page");
for (const id of ["about", "projects", "experience", "education", "papers", "skills", "contact"]) {
  await p.ev("scrollTo(0, 0)"); await p.sleep(300);
  await p.click(...(await p.ev(center(`#nav a[href="#${id}"]`))));
  await p.sleep(1200);
  ok(await p.ev(inView(id)), `navigation link → #${id} scrolls into view`);
  ok(await p.ev(`(() => { const r = document.getElementById('nav').getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; })()`), `  the navigation stays on screen (sticky) at #${id}`);
}
await p.ev(reveal("#project-mammo summary")); await p.sleep(200);
await p.click(...(await p.ev(center("#project-mammo summary"))));
await p.sleep(600);
ok(await p.ev(`document.querySelector('#project-mammo details').open && document.querySelector('#project-mammo figure img').naturalWidth > 0`), "Details opens and the workflow image loads");
await p.ev(reveal("#experience summary")); await p.sleep(200);
await p.click(...(await p.ev(center("#experience summary"))));
ok(await p.ev(`document.querySelector('#experience details').open`), "an experience row opens");
// people move like Habbo avatars: frames change, and nothing shown is ever a picture that hasn't decoded (no flicker)
const frames = [], undecoded = [];
for (let i = 0; i < 25; i++) {
  frames.push(await p.ev(`["dancer", "hacker"].map((l) => document.querySelector('.who[data-look="' + l + '"] .bv').getAttribute('viewBox')).join('|')`));
  undecoded.push(...JSON.parse(await p.ev(`JSON.stringify([...document.querySelectorAll('#scene use')].map((u) => u.getAttribute('href').slice(1)).filter((id) => !DECODED.has(id)))`)));
  await p.sleep(160);
}
ok(new Set(frames.map((f) => f.split("|")[0])).size >= 3 && new Set(frames.map((f) => f.split("|")[1])).size >= 2, "the dancer dances and the hacker types (frames change)");
ok(undecoded.length === 0, "every picture shown in the scene has decoded first (no blank frames)" + (undecoded.length ? ": " + undecoded.slice(0, 3) : ""));
// when someone talks, the people near them turn their heads to look
await p.ev(`say(document.querySelector('.who[data-look="customerA"]'), "hello there everyone")`);
await p.sleep(300);
ok(await p.ev(`(() => { const b = stateOf(document.querySelector('.who[data-look="customerB"]')); return performance.now() < b.lookUntil && b.lookRight === false; })()`), "people near a speaker turn their heads toward them");
// NPCs talk
await p.ev("scrollTo(0, 0)"); await p.sleep(400);
await p.ev(reveal('.who[data-look="pitcher"] .hit')); await p.sleep(300);
await p.click(...(await p.ev(center('.who[data-look="pitcher"] .hit'))));
ok(await p.ev(`(() => { const b = document.querySelector('.bubble[data-for="pitcher"]'); return !!b && CONTENT.npcs.pitcher.click.some((l) => b.textContent.includes(l)); })()`), "clicking the pitcher makes it talk");
// every person and animal (but the wanderers, who pass behind furniture) can be clicked somewhere on them
const unclickable = await p.ev(`[...document.querySelectorAll('#scene .who:not(.walker)')].filter((el) => {
  el.scrollIntoView({ block: "center", behavior: "instant" });
  const r = el.querySelector(".hit").getBoundingClientRect();
  return ![[0.5, 0.3], [0.5, 0.45], [0.5, 0.6], [0.35, 0.5], [0.65, 0.5]].some(([fx, fy]) => { const hit = document.elementFromPoint(r.x + r.width * fx, r.y + r.height * fy); return hit && hit.closest('.who') === el; });
}).map((el) => el.dataset.look).join(",")`);
ok(unclickable === "", "every person and animal takes clicks" + (unclickable ? ": not " + unclickable : ""));
await p.ev(reveal('.who[data-look="q2"] .hit')); await p.sleep(300);
await p.click(...(await p.ev(center('.who[data-look="q2"] .hit'))));
ok(await p.ev(`document.querySelector('.who[data-look="q2"]').classList.contains('acting') && stateOf(document.querySelector('.who[data-look="q2"]')).gesture.kind === "wave"`), "a clicked person waves");
await p.ev(`document.querySelector('.who[data-look="dancer"]').focus()`);
await p.key("Enter");
ok(await p.ev(`!!document.querySelector('.bubble[data-for="dancer"]')`), "Enter on a focused NPC makes it talk");
// walkers: wanderers roam, people with a route walk between their stations; never onto furniture or each other,
// only through doors; the cat stays indoors, the dog outdoors
const kinds = JSON.parse(await p.ev(`JSON.stringify(Object.fromEntries(WALKERS.map((w) => [w.look, w.route ? "route" : "wander"])))`));
const paths = Object.fromEntries(Object.keys(kinds).map((k) => [k, []])); const bad = [];
for (let i = 0; i < 70; i++) {
  const snap = JSON.parse(await p.ev(`JSON.stringify(WALKERS.map((w) => ({ look: w.look, level: w.level, tile: w.tile, off: !onFloorOK(w, w.tile), outdoor: !!roomAt(w.level, ...w.tile).outdoor })))`));
  for (const w of snap) {
    const t = w.tile.join(","), path = paths[w.look];
    if (path.at(-1) !== t) path.push(t);
    if (w.off) bad.push(`${w.look} on a tile it may not use ${t}`);
    if (w.look === "cat" && w.outdoor) bad.push(`cat outdoors at ${t}`);
    if (w.look === "dog" && !w.outdoor) bad.push(`dog indoors at ${t}`);
  }
  if (new Set(snap.map((w) => w.level + ":" + w.tile.join(","))).size < snap.length) bad.push("two walkers share a tile");
  await p.sleep(400);
}
for (const [look, path] of Object.entries(paths)) ok(path.length > (kinds[look] === "route" ? 2 : 3), `${look} ${kinds[look] === "route" ? "walks between stations" : "wanders"} (${path.length} tiles: ${path.slice(0, 8).join(" → ")} …)`);
ok(bad.length === 0, "walkers stay off furniture and each other; cat indoors, dog outdoors" + (bad.length ? ": " + bad.slice(0, 3).join("; ") : ""));
const through = await p.ev(`Object.entries(${JSON.stringify(paths)}).flatMap(([look, path]) => { const wk = WALKERS.find((w) => w.look === look); return path.slice(1).filter((t, i) => { const a = path[i].split(',').map(Number), b = t.split(',').map(Number); return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) !== 1 || !walkable(wk, a, b); }); }).length`);
ok(through === 0, "every step goes to a neighbouring tile through a door, never through a wall");
ok(p.logs.length === 0, "no console errors" + (p.logs.length ? ": " + p.logs.join(" | ") : ""));
p.close();

// ---- deep link
p = await open(SITE + "#project-mri");
await p.sleep(500);
ok(await p.ev(inView("project-mri")), "deep link #project-mri lands on that project");
p.close();

// ---- phone
p = await open(SITE, { width: 390, height: 844, mobile: true });
ok(await p.ev(`document.documentElement.scrollWidth <= 390`), "phone: no horizontal scroll");
ok(await p.ev(`(() => { const n = document.getElementById('nav').getBoundingClientRect().top, h = document.getElementById('top').getBoundingClientRect().top, a = document.getElementById('about').getBoundingClientRect().top; return n < h && h < a; })()`), "phone: navigation → intro and cabin → sections");
ok(p.logs.length === 0, "phone: no console errors" + (p.logs.length ? ": " + p.logs.join(" | ") : ""));
p.close();

// ---- reduced motion
p = await open(SITE, { reducedMotion: true });
const r0 = await p.ev(`WALKERS.map((w) => w.el.style.transform).join('|') + document.querySelector('.who[data-look="dancer"] .bv').getAttribute('viewBox')`);
await p.sleep(5000);
ok(await p.ev(`WALKERS.map((w) => w.el.style.transform).join('|') + document.querySelector('.who[data-look="dancer"] .bv').getAttribute('viewBox')`) === r0, "reduced motion: nobody walks or animates");
p.close();

console.log(failed ? `\n${failed} FAILED` : "\nALL PASSED");
process.exit(failed ? 1 : 0);
