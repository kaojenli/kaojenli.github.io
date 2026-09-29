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
const news = CONTENT.news;
$("#hero-now").innerHTML = `<span class="now-label">Now</span> ${news.headline.replace(/^Now:\s*/, "")}, ${news.text} <a href="${news.link.href}">${news.link.label}</a>`;
$("#hero-links").innerHTML = P.links.map(link).join("");

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
  // Jen, turned toward the text, head centred in the opening, cut off by its rim
  const jen = drawAvatar(AVATAR_LOOKS.jen, "stand"), ax = Math.round(cx - 16.5), ay = fy + B + 5;
  jen.forEach((col, k) => { const x = ax + AW - 1 - (k % AW), y = ay + Math.floor(k / AW); if (col && e(x, y) <= 1) set(x, y, col); });
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
  return { img: toImage(px, W, H), lampY: 7.5 / H, frameY: fy / H };
}
const portrait = framedPortrait(), { w: pw, h: ph } = portrait.img;
$("#hero-portrait").style.setProperty("--lamp", `${portrait.lampY * 100}%`);
$("#hero-portrait").innerHTML = `<svg viewBox="0 0 ${pw} ${ph}" shape-rendering="crispEdges">
  <defs><radialGradient id="spot" cx="50%" cy="0%" r="100%" fx="50%" fy="0%"><stop offset=".25" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".62"/></radialGradient></defs>
  ${imageTag(portrait.img, 0, 0)}<rect class="spot" x="0" y="${ph * portrait.frameY}" width="${pw}" height="${ph * (1 - portrait.frameY)}" fill="url(#spot)"/></svg>`;
$("#hero-caption").textContent = CONTENT.hero.caption;

// ---------- light / dark: the button flips the theme and remembers it; until then the page follows the system
const root = document.documentElement, darkMQ = matchMedia("(prefers-color-scheme: dark)"), toggle = $("#theme-toggle");
const showTheme = () => toggle.setAttribute("aria-pressed", root.dataset.theme === "dark");
toggle.addEventListener("click", () => {
  root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
  try { localStorage.setItem("theme", root.dataset.theme); } catch {}
  showTheme();
});
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
      <dt>Studied</dt><dd>${CONTENT.education.map((e) => `${e.degree}, ${e.school}`).join("<br>")}</dd></dl>
    <p class="links">${P.links.map(link).join("")}</p>`,
  projects: CONTENT.projectGroups.map((g) => `<h3 class="group">${g}</h3>` + CONTENT.projects.filter((p) => p.cat === g).map(project).join("")).join(""),
  experience: `<ol class="rows">${CONTENT.experience.map((e) => `<li><details>
      <summary><span><b>${e.role}</b> · ${e.org}</span><span class="when">${e.date}</span></summary>
      <div class="more-box"><p class="note">${e.place}</p>${list(e.bullets)}${e.project ? `<a href="#project-${e.project}">See the project</a>` : ""}</div>
    </details></li>`).join("")}</ol><p class="total">${CONTENT.experienceTotal}</p>`,
  education: CONTENT.education.map((e) => `<div class="entry">
      <div class="entry-head"><h3>${e.school}</h3><span class="when">${e.date}</span></div>
      <p>${e.degree} · ${e.place}</p>${e.notes.map((n) => `<p class="note">${n}</p>`).join("")}
    </div>`).join(""),
  papers: CONTENT.papers.map((p) => `<div class="entry">
      <p class="kind">${p.kind}${p.badge ? `<span class="badge">${p.badge}</span>` : ""}</p><p>${p.cite}</p>${p.link ? `<p>${link(p.link)}</p>` : ""}
    </div>`).join(""),
  skills: `<dl class="skills">${CONTENT.skills.map((s) => `<div><dt>${s.name}</dt><dd>${s.items}</dd></div>`).join("")}</dl><h3 class="group">Stack</h3>${tags(CONTENT.stack)}`,
  contact: `<p class="lead">The fastest way to reach me is email: <a href="mailto:${P.email}">${P.email}</a></p><p class="links">${P.links.filter((l) => l.url.startsWith("http")).map(link).join("")}</p>`,
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

// ---------- the side cards (wide screens): a summary on the left; a guide to the cabin's rooms and highlights on the right
const card = (title, body, cls = "") => `<section class="card ${cls}"><h2 class="card-title">${title}</h2>${body}</section>`;
const years = (d) => d.match(/\d{4}/g)?.join("–").replace(/(\d{4})–\1/, "$1") + (/present/i.test(d) ? "–now" : "");
$("#rail-left").innerHTML =
  card("Focus", `<ul class="plain">${P.tagline.split(" · ").map((f) => `<li>${f}</li>`).join("")}</ul>`) +
  card("Timeline", `<ol class="timeline">${CONTENT.experience.map((e) => `<li><span class="when">${years(e.date)}</span><b>${e.role}</b><span class="where">${e.org.split(",")[0]}</span></li>`).join("")}</ol>`) +
  card("Contact", `<p><a href="mailto:${P.email}">${P.email}</a></p><p class="links">${P.links.filter((l) => l.url.startsWith("http")).map(link).join("")}</p>`);
const mainPaper = CONTENT.papers.find((p) => p.link), talk = CONTENT.papers.find((p) => p.badge);
$("#rail-right").innerHTML =
  card("Rooms in the cabin", `<ul class="rooms">${CONTENT.projects.map((p) => `<li><a href="#project-${p.slug}"><img src="${$(`#project-${p.slug} .scene-box img`).src}" alt=""><span><b>${p.room}</b>${p.title.split(" Using")[0].split(":")[0]}</span></a></li>`).join("")}</ul>`) +
  card("Publication", `<p>${mainPaper.cite.split("“")[1]?.split("”")[0].replace(/,$/, "") || mainPaper.cite}</p><p class="where">IEEE ECBIOS 2022${talk ? ` · talk: ${talk.badge}` : ""}</p><p>${link({ label: "Read on IEEE Xplore", url: mainPaper.link.url })}</p>`) +
  card("Stack", `<p class="tags">${CONTENT.stack.slice(0, 10).map((t) => `<span class="tag">${t}</span>`).join("")}</p>`);

// Deep links (e.g. #project-mri): the sections are rendered by script, so jump once they exist, and again once the web
// fonts have loaded (they change the height of the text above).
const jump = () => document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView({ behavior: "instant" });
if (location.hash.length > 1) { jump(); document.fonts.ready.then(jump); }
