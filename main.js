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
  about: `<div class="about-grid">
    <div>
      <dl class="facts"><dt>Now</dt><dd>${P.now}</dd><dt>Focus</dt><dd>${P.tagline.split(" · ").join("<br>")}</dd>
        <dt>Studied</dt><dd>${CONTENT.education.map((e) => `${e.degree}, ${e.school}`).join("<br>")}</dd></dl>
      <p class="links">${P.links.map(link).join("")}</p>
    </div>
    <figure class="portrait">
      <svg class="id-avatar" viewBox="0 0 17 32" shape-rendering="crispEdges" aria-hidden="true">${imageTag(avatarImage("jen", "stand"), 0, 0)}</svg>
      <figcaption>Jen, in pixels</figcaption>
    </figure>
  </div>`,
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

// Deep links (e.g. #project-mri): the sections are rendered by script, so jump once they exist, and again once the web
// fonts have loaded (they change the height of the text above).
const jump = () => document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView({ behavior: "instant" });
if (location.hash.length > 1) { jump(); document.fonts.ready.then(jump); }
