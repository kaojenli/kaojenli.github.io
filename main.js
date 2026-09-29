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
// gilded frame with mitred corners, a bead moulding, rosettes on the corners and a shell on top, all one pixel picture.
function framedPortrait() {
  const W = 62, H = 82, fy = 6, FH = 74, B = 9, px = new Array(W * H).fill(null), set = (x, y, c) => { if (x >= 0 && x < W && y >= 0 && y < H) px[y * W + x] = c; };
  const G = { o: "#3a2410", d: "#7a5218", m: "#b8862a", l: "#e0b64e", h: "#fbe9a0" }, darker = { h: "l", l: "m", m: "d", d: "d", o: "o" };
  // frame bands, outside in; the bottom and right sides are in shadow
  const BAND = ["o", "d", "l", "m", "bead", "m", "d", "l", "o"];
  for (let y = fy; y < fy + FH; y++) for (let x = 0; x < W; x++) {
    const dl = x, dr = W - 1 - x, dt = y - fy, db = fy + FH - 1 - y, k = Math.min(dl, dr, dt, db);
    if (k >= B) continue;
    let t = BAND[k] === "bead" ? ((dt === k || db === k ? x : y) % 3 === 0 ? "d" : "h") : BAND[k];
    if (k === dr || k === db) t = darker[t];
    else if (t === "l") t = "h";
    set(x, y, G[t]);
  }
  // the spandrel around the oval opening, the opening's bevelled rim, and velvet inside
  const cx = W / 2, cy = fy + FH / 2, rx = W / 2 - B - 3, ry = FH / 2 - B - 3;
  const e = (x, y) => Math.hypot((x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry);
  for (let y = fy + B; y < fy + FH - B; y++) for (let x = B; x < W - B; x++) {
    const r = e(x, y), lit = x - cx + (y - cy) * 0.8 < 0;
    set(x, y, r <= 1 ? (r < 0.5 ? "#6d8f87" : r < 0.72 && (x + y) % 2 ? "#6d8f87" : "#53736c")
      : r < 1 + 1.2 / rx ? G.o : r < 1 + 2.4 / rx ? (lit ? G.h : G.d) : r < 1 + 3.4 / rx ? (lit ? G.l : G.m) : G.m);
  }
  // Jen, turned toward the text, head centred in the opening, cut off by its rim
  const jen = drawAvatar(AVATAR_LOOKS.jen, "stand"), ax = Math.round(cx - 16.5), ay = fy + B + 6;
  jen.forEach((col, k) => { const x = ax + AW - 1 - (k % AW), y = ay + Math.floor(k / AW); if (col && e(x, y) <= 1) set(x, y, col); });
  // rosettes on the corners, shaded from the top left, petals marked out
  for (const [rcx, rcy] of [[4.5, fy + 4.5], [W - 4.5, fy + 4.5], [4.5, fy + FH - 4.5], [W - 4.5, fy + FH - 4.5]])
    for (let y = Math.floor(rcy - 5); y <= rcy + 5; y++) for (let x = Math.floor(rcx - 5); x <= rcx + 5; x++) {
      const dx = x + 0.5 - rcx, dy = y + 0.5 - rcy, r = Math.hypot(dx, dy);
      if (r > 5) continue;
      set(x, y, G[r > 4.2 ? "o" : r < 1.2 ? "h" : r < 2 ? "d" : Math.abs(Math.abs(dx) - Math.abs(dy)) < 0.8 ? "d" : dx + dy < -1.5 ? "l" : dx + dy > 1.5 ? "d" : "m"]);
    }
  // a scallop shell at the top, and a small one at the bottom
  const shell = (scx, base, R, dir) => {
    for (let y = base - dir * (R + 1); dir > 0 ? y <= base : y >= base; y += dir) for (let x = Math.floor(scx - R - 1); x <= scx + R + 1; x++) {
      const dx = x + 0.5 - scx, dy = (base - y) * dir + 0.5, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx), edge = R + 0.7 * Math.cos(a * 18);
      if (r > edge) continue;
      set(x, y, G[r > edge - 1 ? "o" : r < 2.2 ? "d" : Math.floor(a / (Math.PI / 9)) % 2 ? (a < Math.PI / 2 ? "m" : "l") : a < Math.PI / 2 ? "d" : "h"]);
    }
  };
  shell(cx, fy + 3, 9, 1);
  shell(cx, fy + FH - 3, 5, -1);
  return toImage(px, W, H);
}
const portrait = framedPortrait();
$("#hero-portrait").innerHTML = `<svg viewBox="0 0 ${portrait.w} ${portrait.h}" shape-rendering="crispEdges">${imageTag(portrait, 0, 0)}</svg>`;
$("#hero-caption").textContent = CONTENT.hero.caption;

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
