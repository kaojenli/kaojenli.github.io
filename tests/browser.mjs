// Browser checks for the page:  node tests/browser.mjs   (needs Google Chrome; exits 1 on any failure)
import { open, SITE } from "./cdp.mjs";
let failed = 0;
const ok = (cond, msg) => { console.log((cond ? "✓ " : "✗ ") + msg); if (!cond) failed++; };
const center = (sel) => `(() => { const r = document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; })()`;
// wait until a (smooth) scroll has come to rest: scrollY unchanged for 300 ms, at most 5 s
const settle = `new Promise((done) => { let last = -1, still = 0; const t0 = Date.now(); (function poll() { if (scrollY === last) still += 50; else { still = 0; last = scrollY; } if (still >= 300 || Date.now() - t0 > 5000) done(); else setTimeout(poll, 50); })(); })`;
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
  await p.ev(settle);
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
await p.ev(reveal("#scene")); await p.sleep(300); // (off screen the scene stands still)
const frames = [], undecoded = [];
for (let i = 0; i < 25; i++) {
  frames.push(await p.ev(`["dancer", "hacker"].map((l) => document.querySelector('.who[data-look="' + l + '"] .bv').getAttribute('viewBox')).join('|')`));
  undecoded.push(...JSON.parse(await p.ev(`JSON.stringify([...document.querySelectorAll('#scene use')].map((u) => u.getAttribute('href').slice(1)).filter((id) => !DECODED.has(id)))`)));
  await p.sleep(160);
}
ok(await p.ev(`[...document.querySelectorAll('#scene .who')].every((el) => el.getAnimations({ subtree: true }).every((a) => !(a instanceof CSSAnimation) || !a.effect.getKeyframes().some((k) => 'transform' in k || 'translate' in k)))`), "nobody drifts: no CSS animation moves any person or animal (walking between tiles is a transition; frames are set by script)");
ok(new Set(frames.map((f) => f.split("|")[0])).size >= 3 && new Set(frames.map((f) => f.split("|")[1])).size >= 2, "the dancer dances and the hacker types (frames change)");
// off screen the scene stands still (it costs no CPU while you read the sections)
await p.ev(reveal("#contact")); await p.sleep(400);
// (by name: walkers still take their steps in the background, which only reorders them in the page)
const still = `[...document.querySelectorAll('#scene .who')].map((el) => el.dataset.look + el.querySelector('.bv').getAttribute('viewBox') + el.style.transform).sort().join('|') + document.querySelector('#scene .fire')?.getAnimations()[0]?.currentTime`;
const s0 = await p.ev(still); await p.sleep(1500);
ok(await p.ev(still) === s0, "off screen, nothing in the scene moves");
await p.ev(reveal("#scene")); await p.sleep(300);
ok(undecoded.length === 0, "every picture shown in the scene has decoded first (no blank frames)" + (undecoded.length ? ": " + undecoded.slice(0, 3) : ""));
// the framed portrait comes alive too: within a few seconds it shows another frame (a blink at least)
await p.ev("scrollTo(0, 0)");
const faces = new Set();
for (let i = 0; i < 45; i++) { faces.add(await p.ev(`document.querySelector("#hero-portrait .pv").getAttribute("viewBox")`)); await p.sleep(200); }
ok(faces.size >= 2, `the framed portrait moves (${faces.size} frames seen in 9 s)`);
ok(await p.ev(`!lookList.some((l) => l.pose === "armsUp" || /^back/.test(l.face))`) === true, "the framed Jen never raises her arm (the oval would cut it off) or turns her back");
ok(await p.ev(`getComputedStyle(document.querySelector("#hero-portrait .pv")).overflow`) === "hidden", "the portrait shows one frame at a time (its window clips the strip)");
// Jen's routine (blinks, winks, turning round, coffee, a cookie...): every frame it shows has been drawn
ok(await p.ev(`(() => { const st = [...STATES.values()].find((s) => s.look === "jen");
  return Object.values(ROUTINES.jen).every(([, make]) => make().every((s) => { const v = s.face && faceBack(s.face) ? "back" : "front";
    return st.body.keys.has((s.pose || "stand") + "|" + v) && (v === "back" || st.head.keys.has("front|" + (s.eyes || "open") + "|" + (s.mouth || "closed"))); })); })()`), "Jen's routine: every pose, turn and wink it uses is drawn");
// when someone talks, the people near them turn their heads to look
await p.ev(`say(document.querySelector('.who[data-look="customerA"]'), "hello there everyone")`);
await p.sleep(50); // check at once, before a random chat nearby can turn heads elsewhere
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
// record every step as it is taken (stepTo is the one place walkers move)
await p.ev(`(() => { window.STEPS = []; const orig = stepTo; stepTo = (wk, to, done) => { STEPS.push({ look: wk.look, from: wk.tile.slice(), to: to.slice(), ok: walkable(wk, wk.tile, to) && onFloorOK(wk, to), taken: takenBy(wk, to) }); return orig(wk, to, done); }; })()`);
const bad = [];
for (let i = 0; i < 35; i++) {
  const snap = JSON.parse(await p.ev(`JSON.stringify(WALKERS.map((w) => ({ look: w.look, level: w.level, tile: w.tile, outdoor: !!roomAt(w.level, ...w.tile).outdoor })))`));
  for (const w of snap) {
    if (w.look === "cat" && w.outdoor) bad.push(`cat outdoors at ${w.tile}`);
    if (w.look === "dog" && !w.outdoor) bad.push(`dog indoors at ${w.tile}`);
  }
  if (new Set(snap.map((w) => w.level + ":" + w.tile.join(","))).size < snap.length) bad.push("two walkers share a tile");
  await p.sleep(800);
}
const steps = JSON.parse(await p.ev(`JSON.stringify(STEPS)`));
for (const look of Object.keys(kinds)) { const n = steps.filter((s) => s.look === look).length; ok(n > 2, `${look} ${kinds[look] === "route" ? "walks between stations" : "wanders"} (${n} steps)`); }
ok(bad.length === 0 && steps.every((s) => !s.taken), "walkers stay off furniture and each other; cat indoors, dog outdoors" + (bad.length ? ": " + bad.slice(0, 3).join("; ") : ""));
const through = steps.filter((s) => Math.abs(s.from[0] - s.to[0]) + Math.abs(s.from[1] - s.to[1]) !== 1 || !s.ok).length;
ok(through === 0, "every step goes to a neighbouring tile through a door, never through a wall");
ok(p.logs.length === 0, "no console errors" + (p.logs.length ? ": " + p.logs.join(" | ") : ""));
p.close();

// ---- wide screens: the side cards fill the margins, fit on screen and link to the rooms
p = await open(SITE, { width: 1440, height: 900 });
await p.sleep(800);
ok(await p.ev(`[...document.querySelectorAll('.rail')].every((r) => getComputedStyle(r).display !== 'none' && r.scrollHeight <= r.clientHeight + 1 && r.scrollHeight <= innerHeight - 80)`), "wide screen: both side columns show and fit on screen");
ok(await p.ev(`document.querySelectorAll('#rail-right .rooms a').length === CONTENT.projects.length && [...document.querySelectorAll('#rail-right .rooms a')].every((a) => document.querySelector(a.getAttribute('href')))`), "wide screen: every room in the guide links to its project");
ok(await p.ev(`[...document.querySelectorAll('.card')].every((c) => c.scrollWidth <= c.clientWidth + 1)`), "wide screen: nothing spills out of a card");
// the light/dark button flips the page's colours, is remembered on the next visit, and lights the portrait in the dark
await p.ev(`localStorage.removeItem("theme"); document.documentElement.dataset.theme = "light"`);
const bg = () => p.ev(`getComputedStyle(document.documentElement).getPropertyValue("--bg").trim()`), bgLight = await bg(); // (the page crossfades)
await p.click(...(await p.ev(center("#theme-toggle")))); await p.sleep(500);
ok(await p.ev(`document.documentElement.dataset.theme === "dark" && localStorage.getItem("theme") === "dark" && document.getElementById("theme-toggle").getAttribute("aria-pressed") === "true"`) && await bg() !== bgLight, "the dark-mode button switches to dark and remembers it");
ok(await p.ev(`getComputedStyle(document.querySelector("#hero-portrait .lit")).opacity === "1"`), "dark mode: the picture light shines on the portrait");
await p.ev(`location.reload()`); await p.sleep(1500);
ok(await p.ev(`document.documentElement.dataset.theme === "dark"`), "dark mode is still on after a reload");
await p.click(...(await p.ev(center("#theme-toggle")))); await p.sleep(500);
ok(await p.ev(`document.documentElement.dataset.theme === "light"`) && await bg() === bgLight, "the button switches back to light");
p.close();

// ---- a wide but short window: at the bottom of the page every side card shows in full, nothing cut off
p = await open(SITE, { width: 1440, height: 640 });
await p.ev(`scrollTo(0, document.documentElement.scrollHeight)`); await p.sleep(600);
ok(await p.ev(`[...document.querySelectorAll('.rail .card')].every((c) => { const r = c.getBoundingClientRect(), rail = c.closest('.rail').getBoundingClientRect(); return r.bottom <= rail.bottom + 0.5 && r.bottom <= innerHeight; }) && [...document.querySelectorAll('.rail')].every((r) => r.scrollHeight <= r.clientHeight + 1)`), "short window: at the bottom of the page the side cards show in full");
p.close();

// ---- deep link
p = await open(SITE + "#project-mri");
await p.sleep(500);
ok(await p.ev(inView("project-mri")), "deep link #project-mri lands on that project");
p.close();

// ---- phone
p = await open(SITE, { width: 390, height: 844, mobile: true });
ok(await p.ev(`document.documentElement.scrollWidth <= 390`), "phone: no horizontal scroll");
ok(await p.ev(`(() => { const r = document.getElementById("theme-toggle").getBoundingClientRect(); return r.width > 0 && r.right <= 390; })()`), "phone: the dark-mode button is on screen");
ok(await p.ev(`(() => { const n = document.getElementById('nav').getBoundingClientRect().top, h = document.getElementById('top').getBoundingClientRect().top, a = document.getElementById('about').getBoundingClientRect().top; return n < h && h < a; })()`), "phone: navigation → intro and cabin → sections");
ok(p.logs.length === 0, "phone: no console errors" + (p.logs.length ? ": " + p.logs.join(" | ") : ""));
p.close();

// ---- reduced motion
p = await open(SITE, { reducedMotion: true });
const r0 = await p.ev(`WALKERS.map((w) => w.el.style.transform).join('|') + document.querySelector('.who[data-look="dancer"] .bv').getAttribute('viewBox') + document.querySelector('#hero-portrait .pv').getAttribute('viewBox')`);
await p.sleep(5000);
ok(await p.ev(`WALKERS.map((w) => w.el.style.transform).join('|') + document.querySelector('.who[data-look="dancer"] .bv').getAttribute('viewBox') + document.querySelector('#hero-portrait .pv').getAttribute('viewBox')`) === r0, "reduced motion: nobody walks or animates");
p.close();

console.log(failed ? `\n${failed} FAILED` : "\nALL PASSED");
process.exit(failed ? 1 : 0);
