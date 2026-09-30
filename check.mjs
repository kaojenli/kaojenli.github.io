// Offline checks:  node check.mjs          Also hit every external link:  node check.mjs --links
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import vm from "node:vm";

const load = (file, expr) => vm.runInNewContext(readFileSync(file, "utf8") + `;${expr}`, {});
const errors = [];
const fail = (msg) => errors.push(msg);

// --- cache busting: index.html asks for the stylesheet and scripts with ?v=<hash of their contents>, so a browser never
// pairs a new page with an old cached stylesheet (Pages lets each file be cached for 10 minutes on its own).
// `node check.mjs --stamp` writes the current hash in; run it before every commit that touches these files.
const ASSETS = ["style.css", "content.js", "avatar.js", "props.js", "furni.js", "cabin.js", "main.js"];
const ver = createHash("sha1").update(ASSETS.map((f) => readFileSync(f, "utf8")).join("")).digest("hex").slice(0, 8);
let html = readFileSync("index.html", "utf8");
if (process.argv.includes("--stamp")) {
  html = html.replace(/(href|src)="([\w-]+\.(?:css|js))(?:\?v=\w+)?"/g, (m, attr, f) => (ASSETS.includes(f) ? `${attr}="${f}?v=${ver}"` : m));
  writeFileSync("index.html", html);
}
for (const f of ASSETS) if (!html.includes(`"${f}?v=${ver}"`)) fail(`index.html loads ${f} without ?v=${ver} (run: node check.mjs --stamp)`);

// --- content wiring
const C = load("content.js", "CONTENT");
const slugs = new Set(C.projects.map((p) => p.slug));
const ids = C.sections.map((x) => x.id);
if (new Set(ids).size !== ids.length) fail(`duplicate section ids: ${ids}`);
for (const e of C.experience) if (e.project && !slugs.has(e.project)) fail(`experience "${e.org}" links unknown project "${e.project}"`);
for (const p of C.projects) {
  if (!p.title || !p.bullets?.length) fail(`project "${p.slug}" needs a title and bullets`);
  if (!C.projectGroups.includes(p.cat)) fail(`project "${p.slug}" has unknown group "${p.cat}"`);
  if (p.image && !existsSync(p.image.src)) fail(`project "${p.slug}" image missing: ${p.image.src}`);
}
const urls = [...JSON.stringify(C).matchAll(/"url":"([^"]+)"/g)].map((m) => m[1]);
for (const u of urls) if (!/^(https:\/\/|mailto:)/.test(u)) fail(`link is not https/mailto: ${u}`);

// --- pictures: every prop and every avatar pose draws, with no unset (undefined) colours, and every NPC has a picture
{
  const src = readFileSync("avatar.js", "utf8") + readFileSync("props.js", "utf8");
  const { PROPS, makeCanvas, drawAvatar, AVATAR_LOOKS, POSES } = vm.runInNewContext(src + ";({ PROPS, makeCanvas, drawAvatar, AVATAR_LOOKS, POSES })", {});
  const inspect = (what, px) => {
    if (px.some((c) => c === undefined)) fail(`${what} has pixels with no colour (a shade returned undefined)`);
    if (px.filter(Boolean).length < 10) fail(`${what} is (almost) empty`);
  };
  for (const [name, p] of Object.entries(PROPS)) {
    try { const c = makeCanvas(p.w, p.h, 1); p.draw(c); inspect(`prop "${name}"`, c.px); } catch (e) { fail(`prop "${name}" throws: ${e.message}`); }
  }
  for (const look of Object.keys(AVATAR_LOOKS)) for (const pose of Object.keys(POSES)) {
    for (const back of [false, true]) try { inspect(`avatar ${look}/${pose}${back ? " (back)" : ""}`, drawAvatar(AVATAR_LOOKS[look], pose, { back })); } catch (e) { fail(`avatar ${look}/${pose} throws: ${e.message}`); }
  }
  const SPRITE = { sam: "turtle", snowgirl: "snowGirl" }; // (critters whose sprite has another name, see cabin.js)
  for (const k of Object.keys(C.npcs)) if (!AVATAR_LOOKS[k] && !PROPS[SPRITE[k] || k]) fail(`npc "${k}" has no avatar look (avatar.js) or prop (props.js)`);
}

// --- privacy: nothing private gets published
const published = execSync("git ls-files --cached --others --exclude-standard", { encoding: "utf8" }).split("\n").filter(Boolean);
for (const f of ["CV_JLK.pdf", "me.jpeg", "template.rtf"]) if (published.includes(f)) fail(`private file would be published: ${f}`);
const phone = /\(?\d{3}\)?[\s.-]\d{3}-\d{4}/;
for (const f of published) {
  if (/\.(png|jpe?g|gif|webp|ico|pdf)$/i.test(f) || !existsSync(f)) continue;
  if (phone.test(readFileSync(f, "utf8"))) fail(`phone-number-like string in ${f}`);
}

if (errors.length) {
  console.error(errors.map((e) => "✗ " + e).join("\n"));
  process.exit(1);
}
console.log(`✓ content, pictures and privacy OK (${published.length} publishable files, ${urls.length} links)`);

if (process.argv.includes("--links")) {
  for (const u of urls.filter((u) => u.startsWith("https://"))) {
    const r = await fetch(u, { redirect: "follow", headers: { "user-agent": "Mozilla/5.0" } }).catch((e) => ({ status: e.cause?.code ?? e.message }));
    console.log(String(r.status).padEnd(4), u);
  }
}
