// The page around the cabin: navigation, intro and the sections. Reads CONTENT (content.js), avatars (avatar.js) and
// room close-ups (cabin.js).
const $ = (sel, el = document) => el.querySelector(sel);
const P = CONTENT.person;
const link = (l) => `<a href="${l.url}"${l.url.startsWith("http") ? ' target="_blank" rel="noopener"' : ""}>${l.label}</a>`;
const list = (items) => (items.length ? `<ul class="bullets">${items.map((b) => `<li>${b}</li>`).join("")}</ul>` : "");
const tags = (items) => `<p class="tags">${items.map((t) => `<span class="tag">${t}</span>`).join("")}</p>`;

// ---------- navigation and intro
$("#nav").innerHTML = CONTENT.sections.map((s) => `<a href="#${s.id}">${s.label}</a>`).join("");
$("#hero-eyebrow").textContent = CONTENT.hero.eyebrow;
$("#hero-lede").textContent = P.intro;

// ---------- Jen's portrait beside the intro: her head and shoulders (avatar.js) in an oval opening on velvet, in a
// walnut frame with mitred corners and a thin antique-gilt slip, under a brass picture light; all one pixel picture.
// In dark mode the lamp lights it like a painting in a dark gallery (style.css).
function framedPortrait() {
  const W = 62, fy = 12, FH = 74, H = fy + FH, B = 9, px = new Array(W * H).fill(null), set = (x, y, c) => { if (x >= 0 && x < W && y >= 0 && y < H) px[y * W + x] = c; };
  const C = { o: "#1e130b", wd: "#3b2616", wm: "#5a3b22", wl: "#7a5332", wh: "#93683f", gd: "#6e5a34", gm: "#9c8452", gl: "#c2ab74", gh: "#dccb98" };
  const darker = { wh: "wl", wl: "wm", wm: "wd", wd: "wd", gh: "gl", gl: "gm", gm: "gd", gd: "gd", o: "o" }, lighter = { wl: "wh", gl: "gh" };
  // frame bands, outside in (walnut, then the gilt bead and lip); the bottom and right sides are in shadow
  const BAND = ["o", "wl", "wm", "wm", "wd", "wm", "bead", "gl", "o"];
  for (let y = fy; y < fy + FH; y++) for (let x = 0; x < W; x++) {
    const dl = x, dr = W - 1 - x, dt = y - fy, db = fy + FH - 1 - y, k = Math.min(dl, dr, dt, db);
    if (k >= B) continue;
    let t = BAND[k] === "bead" ? ((dt === k || db === k ? x : y) % 3 === 0 ? "gd" : "gl") : BAND[k];
    t = k === dr || k === db ? darker[t] : lighter[t] || t;
    set(x, y, C[t]);
  }
  // the walnut mat around the oval opening, the opening's gilt rim, and velvet inside
  const cx = W / 2, cy = fy + FH / 2, rx = W / 2 - B - 3, ry = FH / 2 - B - 3;
  const e = (x, y) => Math.hypot((x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry);
  for (let y = fy + B; y < fy + FH - B; y++) for (let x = B; x < W - B; x++) {
    const r = e(x, y), lit = x - cx + (y - cy) * 0.8 < 0;
    set(x, y, r <= 1 ? (r < 0.5 ? "#6d8f87" : r < 0.72 && (x + y) % 2 ? "#6d8f87" : "#53736c")
      : r < 1 + 1.2 / rx ? C.o : r < 1 + 2.4 / rx ? C[lit ? "gh" : "gd"] : r < 1 + 3.4 / rx ? C[lit ? "wd" : "o"] : C[(x * 3 + y) % 7 ? "wm" : "wd"]);
  }
  // small gilt rosettes on the corners
  for (const [rcx, rcy] of [[4.5, fy + 4.5], [W - 4.5, fy + 4.5], [4.5, fy + FH - 4.5], [W - 4.5, fy + FH - 4.5]])
    for (let y = Math.floor(rcy - 4); y <= rcy + 4; y++) for (let x = Math.floor(rcx - 4); x <= rcx + 4; x++) {
      const dx = x + 0.5 - rcx, dy = y + 0.5 - rcy, r = Math.hypot(dx, dy);
      if (r <= 3.6) set(x, y, C[r > 2.8 ? "o" : r < 1 ? "gh" : dx + dy < -0.8 ? "gl" : dx + dy > 0.8 ? "gd" : "gm"]);
    }
  // the picture light: a brass hood over the frame on an arm from its top, a warm slit of light along its underside
  const hx0 = Math.round(cx - 14), hx1 = Math.round(cx + 14);
  for (let x = hx0; x < hx1; x++) ["o", "gh", "gl", "gm", "gd", "o"].forEach((t, i) => set(x, 1 + i, C[x === hx0 || x === hx1 - 1 ? "o" : x < hx0 + 2 ? darker[t] : t]));
  for (let x = hx0 + 2; x < hx1 - 2; x++) set(x, 7, "#ffe6a8");
  for (let y = 7; y < fy + 1; y++) { set(cx - 1, y, C.o); set(cx, y, C.gm); set(cx + 1, y, C.o); }
  for (let x = cx - 3; x <= cx + 2; x++) { set(x, fy, C.o); set(x, fy + 1, C.gd); }
  // Jen in the opening, head centred, cut off by its rim: one frame of the painting per way she can look (see below).
  // Facing "front" she turns toward the text (the scene's down-right, mirrored).
  const ay = fy + B + 5, frame = ({ pose = "stand", face = "front", eyes = "open", mouth = "closed" }) => {
    const out = px.slice(), mirror = !faceMirror(face), ax = mirror ? Math.round(cx - 16.5) : Math.round(cx - 15.5);
    drawAvatar(AVATAR_LOOKS.jen, pose, { eyes, mouth, back: faceBack(face) }).forEach((col, k) => {
      const x = ax + (mirror ? AW - 1 - (k % AW) : k % AW), y = ay + Math.floor(k / AW);
      if (col && e(x, y) <= 1) out[y * W + x] = col;
    });
    return out;
  };
  return { W, H, frame, slit: [(hx0 + 2) / 2, (hx1 - 2) / 2, 4], hood: [hx0 / 2, 0.5, (hx1 - hx0) / 2, 3], top: fy / 2 }; // in units (2 px)
}
// The light (dark mode only, style.css): a bright slit and its bloom under the hood, the hood itself unlit, a soft beam
// fanning down over the painting and spilling onto the wall, and the painting falling into shadow away from the lamp.
// The painting comes alive like Jen downstairs: the same little routine (ROUTINES.jen in cabin.js: blinks, winks,
// glances, a coffee, a cookie; not the yawn, whose raised arm the oval cuts off, and she never turns her back on the
// viewer), each way she looks one frame of a strip, shown through a window.
const acts = Object.values(ROUTINES.jen).filter(([, make]) => !make().some((st) => st.pose === "armsUp" || /^back/.test(st.face)));
const portrait = framedPortrait(), looks = new Map(), lookKey = (o) => ["pose", "face", "eyes", "mouth"].map((k) => (o[k] === "front" || o[k] === "stand" ? "" : o[k] || "")).join("|");
const want = (o) => { if (!looks.has(lookKey(o))) looks.set(lookKey(o), o); };
want({});
want({ eyes: "closed" });
want({ mouth: "open" });
for (const [, make] of acts) for (const st of make()) {
  const o = { pose: st.pose, face: st.look ? "frontL" : st.face, eyes: st.eyes, mouth: st.mouth };
  want(o);
  if (st.chew) want({ ...o, mouth: "open" });
}
const lookList = [...looks.values()], strip = joinFrames(lookList.map(portrait.frame), portrait.W, portrait.H), pw = portrait.W / 2, ph = portrait.H / 2;
const [sx0, sx1, sy] = portrait.slit, mid = (sx0 + sx1) / 2;
$("#hero-portrait").innerHTML = `<svg viewBox="0 0 ${pw} ${ph}" shape-rendering="crispEdges">
  <defs>
    <filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1"/></filter>
    <linearGradient id="beam" gradientUnits="userSpaceOnUse" x1="0" y1="${sy}" x2="0" y2="${sy + 30}"><stop offset="0" stop-color="#ffe2a8" stop-opacity=".6"/><stop offset=".45" stop-color="#ffd89a" stop-opacity=".2"/><stop offset="1" stop-color="#ffd89a" stop-opacity="0"/></linearGradient>
    <radialGradient id="shade" gradientUnits="userSpaceOnUse" cx="${mid}" cy="${sy}" r="${ph}"><stop offset=".3" stop-opacity="0"/><stop offset="1" stop-opacity=".7"/></radialGradient>
    <radialGradient id="bloom"><stop offset="0" stop-color="#fff4d6" stop-opacity=".95"/><stop offset=".4" stop-color="#ffd98f" stop-opacity=".5"/><stop offset="1" stop-color="#ffd98f" stop-opacity="0"/></radialGradient>
  </defs>
  <svg class="pv" x="0" y="0" width="${pw}" height="${ph}" viewBox="0 0 ${pw} ${ph}"><use href="#${strip.id}"/></svg>
  <g class="lit" shape-rendering="auto">
    <rect x="0" y="${portrait.top}" width="${pw}" height="${ph - portrait.top}" fill="url(#shade)"/>
    <rect x="${portrait.hood[0]}" y="${portrait.hood[1]}" width="${portrait.hood[2]}" height="${portrait.hood[3]}" fill="#000" opacity=".45"/>
    <polygon points="${sx0},${sy} ${sx1},${sy} ${sx1 + 16},${sy + 30} ${sx0 - 16},${sy + 30}" fill="url(#beam)" filter="url(#soft)" style="mix-blend-mode:screen"/>
    <ellipse cx="${mid}" cy="${sy}" rx="${(sx1 - sx0) / 2 + 2}" ry="1.6" fill="url(#bloom)" style="mix-blend-mode:screen"/>
  </g></svg>`;
const pv = $("#hero-portrait .pv"), show = (o) => pv.setAttribute("viewBox", `${lookList.findIndex((l) => lookKey(l) === lookKey(o)) * pw} 0 ${pw} ${ph}`);
async function portraitLife() {
  const total = acts.reduce((n, [w]) => n + w, 0);
  for (;;) {
    let r = Math.random() * total, i = 0;
    while ((r -= acts[i][0]) > 0) i++;
    for (const st of acts[i][1]()) {
      const o = { pose: st.pose, face: st.look ? "frontL" : st.face, eyes: st.eyes, mouth: st.mouth };
      if (st.chew) for (let t = 0; t < st.ms; t += 180) { show({ ...o, mouth: (t / 180) % 2 ? "closed" : "open" }); await wait(180); }
      else if (!st.pose && !st.face && !st.eyes && !st.mouth && !st.look && st.ms > 2500) { // standing still: now and then a blink
        show(o); await wait(st.ms / 2); show({ eyes: "closed" }); await wait(140); show(o); await wait(st.ms / 2 - 140);
      } else { show(o); await wait(st.ms); }
    }
    show({});
  }
}
if (!matchMedia("(prefers-reduced-motion: reduce)").matches) setTimeout(portraitLife, 1500);
$("#hero-caption").textContent = CONTENT.hero.caption;

// ---------- light / dark: the button flips the theme and remembers it; until then the page follows the system
const root = document.documentElement, darkMQ = matchMedia("(prefers-color-scheme: dark)"), toggle = $("#theme-toggle");
const showTheme = () => toggle.setAttribute("aria-pressed", root.dataset.theme === "dark");
const flip = () => {
  root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
  try { localStorage.setItem("theme", root.dataset.theme); } catch {}
  showTheme();
};
// the whole page crossfades from one theme to the other (where the browser can; otherwise it just switches)
toggle.addEventListener("click", () => (document.startViewTransition && !matchMedia("(prefers-reduced-motion: reduce)").matches ? document.startViewTransition(flip) : flip()));
darkMQ.addEventListener("change", (e) => {
  let chosen = null;
  try { chosen = localStorage.getItem("theme"); } catch {}
  if (!chosen) { root.dataset.theme = e.matches ? "dark" : "light"; showTheme(); }
});
showTheme();

// ---------- sections
const project = (p) => `<article class="proj" id="project-${p.slug}">
  <div class="scene-box">${closeupSVG(p.slug)}</div>
  <div class="proj-text">
    <h4>${p.title}</h4>
    <p class="meta">${p.org} · ${p.date}</p>
    <p>${p.bullets[0]}</p>
    ${p.bullets.length > 1 || p.image ? `<details><summary>Details</summary>${p.image ? `<figure><img src="${p.image.src}" alt="${p.image.alt}" loading="lazy"></figure>` : ""}${list(p.bullets.slice(1))}</details>` : ""}
    ${tags(p.tags)}
    ${p.links.length ? `<p class="links">${p.links.map(link).join("")}</p>` : ""}
  </div>
</article>`;

const BODY = {
  about: `<dl class="facts"><dt>Now</dt><dd>${P.now}</dd><dt>Focus</dt><dd>${P.tagline.split(" · ").join("<br>")}</dd>
      <dt>Studied</dt><dd>${CONTENT.education.map((e) => `${e.degree}, ${e.school}`).join("<br>")}</dd></dl>`,
  projects: CONTENT.projectGroups.map((g) => `<h3 class="group">${g}</h3>` + CONTENT.projects.filter((p) => p.cat === g).map(project).join("")).join(""),
  experience: `<ol class="rows">${CONTENT.experience.map((e) => `<li><details>
      <summary><span><b>${e.role}</b> · ${e.org}</span><span class="when">${e.date}</span></summary>
      <div class="more-box"><p class="note">${e.place}</p>${list(e.bullets)}${e.project ? `<a href="#project-${e.project}">See the project</a>` : ""}</div>
    </details></li>`).join("")}</ol>`,
  education: CONTENT.education.map((e) => `<div class="entry">
      <div class="entry-head"><h3>${e.school}</h3><span class="when">${e.date}</span></div>
      <p>${e.degree} · ${e.place}</p>${e.notes.map((n) => `<p class="note">${n}</p>`).join("")}
    </div>`).join(""),
  papers: CONTENT.papers.map((p) => `<div class="entry">
      <p class="kind">${p.kind}${p.badge ? `<span class="badge">${p.badge}</span>` : ""}</p><p>${p.cite}</p>${p.link ? `<p>${link(p.link)}</p>` : ""}
    </div>`).join(""),
  skills: `<dl class="skills">${CONTENT.skills.map((s) => `<div><dt>${s.name}</dt><dd>${s.items}</dd></div>`).join("")}</dl><h3 class="group">Stack</h3>${tags(CONTENT.stack)}`,
};
$("#panels").innerHTML = CONTENT.sections.filter((s) => BODY[s.id]).map((s, i) => `<section class="section" id="${s.id}" aria-labelledby="h-${s.id}">
  <header class="section-head"><p class="eyebrow">${String(i + 1).padStart(2, "0")}</p><h2 id="h-${s.id}">${s.title}</h2></header>
  <div class="section-body">${BODY[s.id]}</div>
</section>`).join("");
// Close-ups at exactly 2x so pixels stay even; long rooms (the practice field, the café) take the full width.
document.querySelectorAll(".scene-box").forEach((b) => {
  const w = +b.querySelector("img").getAttribute("width");
  b.style.width = `${w}px`;
  if (w > 320) b.classList.add("wide");
});
$("#year").textContent = new Date().getFullYear();
// The whole cabin fits in the first screen: as tall as the window leaves below the intro (never under 360px).
const fitRoom = () => { const r = $("#room"); r.style.setProperty("--fit", `${Math.max(360, innerHeight - (r.getBoundingClientRect().top + scrollY) - 16)}px`); };
fitRoom(); addEventListener("resize", fitRoom); document.fonts.ready.then(fitRoom);

// ---------- the side cards (wide screens): a summary on the left; a guide to the cabin's rooms and highlights on the right.
// The contact card is the only place the email and profiles appear; on narrower screens it closes the page instead.
const card = (title, body, cls = "") => `<section class="card ${cls}"><h2 class="card-title">${title}</h2>${body}</section>`;
const years = (d) => d.match(/\d{4}/g)?.join("–").replace(/(\d{4})–\1/, "$1") + (/present/i.test(d) ? "–now" : "");
$("#rail-left").innerHTML =
  card("Focus", `<ul class="plain">${P.tagline.split(" · ").map((f) => `<li>${f}</li>`).join("")}</ul>`) +
  card("Timeline", `<ol class="timeline">${CONTENT.experience.map((e) => `<li><span class="when">${years(e.date)}</span><b>${e.role}</b><span class="where">${e.org.split(",")[0]}</span></li>`).join("")}</ol>`) +
  card("Contact", `<p><a href="mailto:${P.email}">${P.email}</a></p><p class="links">${P.links.filter((l) => l.url.startsWith("http")).map(link).join("")}</p>`, "contact");
const mainPaper = CONTENT.papers.find((p) => p.link), talk = CONTENT.papers.find((p) => p.badge);
$("#rail-right").innerHTML =
  card("Rooms in the cabin", `<ul class="rooms">${CONTENT.projects.map((p) => `<li><a href="#project-${p.slug}"><img src="${$(`#project-${p.slug} .scene-box img`).src}" alt=""><span><b>${p.room}</b>${p.title.split(" Using")[0].split(":")[0]}</span></a></li>`).join("")}</ul>`) +
  card("Publication", `<p>${mainPaper.cite.split("“")[1]?.split("”")[0].replace(/,$/, "") || mainPaper.cite}</p><p class="where">IEEE ECBIOS 2022${talk ? ` · talk: ${talk.badge}` : ""}</p><p>${link({ label: "Read on IEEE Xplore", url: mainPaper.link.url })}</p>`) +
  card("Stack", `<p class="tags">${CONTENT.stack.slice(0, 10).map((t) => `<span class="tag">${t}</span>`).join("")}</p>`);

// Deep links (e.g. #project-mri): the sections are rendered by script, so jump once they exist, and again once the web
// fonts have loaded (they change the height of the text above).
const jump = () => document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView({ behavior: "instant" });
if (location.hash.length > 1) { jump(); document.fonts.ready.then(jump); }
