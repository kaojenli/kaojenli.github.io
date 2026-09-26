// Page panels and sidebar. Reads CONTENT (content.js), avatars (avatar.js) and room close-ups (cabin.js).
const $ = (sel, el = document) => el.querySelector(sel);

$("#sign").innerHTML = `<b>${CONTENT.hero.sign}</b>${CONTENT.hero.signSub}`;
$("#go").href = CONTENT.hero.go;

// ---------- panels
const P = CONTENT.person;
const SECTION = Object.fromEntries(CONTENT.sections.map((s) => [s.id, s]));
const link = (l) => `<a class="more" href="${l.url}"${l.url.startsWith("http") ? ' target="_blank" rel="noopener"' : ""}>${l.label}</a>`;
const list = (items) => items.length ? `<ul class="bullets">${items.map((b) => `<li>${b}</li>`).join("")}</ul>` : "";
const tags = (items) => `<p class="tags">${items.map((t) => `<span class="tag">${t}</span>`).join("")}</p>`;
const panel = (id, body) => `<section class="panel" id="${id}" aria-labelledby="h-${id}">` +
  `<h2 class="side" id="h-${id}"><span>${SECTION[id].side}</span></h2><div class="panel-body">${body}</div></section>`;

const project = (p) => `<article class="proj" id="project-${p.slug}">
  <div class="scene-box">${closeupSVG(p.slug)}</div>
  <h4>${p.title}</h4>
  <p class="meta">${p.org} · ${p.date}</p>
  <p>${p.bullets[0]}</p>
  ${p.bullets.length > 1 || p.image ? `<details><summary>More</summary>${p.image ? `<figure><img src="${p.image.src}" alt="${p.image.alt}" loading="lazy"></figure>` : ""}${list(p.bullets.slice(1))}</details>` : ""}
  ${tags(p.tags)}
  ${p.links.length ? `<p class="links">${p.links.map(link).join("")}</p>` : ""}
</article>`;

const BODY = {
  about: `<div class="about-grid">
    <div>
      <p class="lead">${P.intro}</p>
      <dl class="facts"><dt>Now</dt><dd>${P.now}</dd><dt>Focus</dt><dd>${P.tagline}</dd></dl>
      <p class="links">${P.links.map(link).join("")}</p>
    </div>
    <div class="id-card">
      <div class="name-tag"><span>HELLO</span><small>my name is</small><strong>${P.name}</strong></div>
      <svg class="id-avatar" viewBox="0 0 17 32" shape-rendering="crispEdges" aria-hidden="true">${imageTag(avatarImage("jen", "stand"), 0, 0)}</svg>
      <p class="kao">^ ω ^</p>
    </div>
  </div>`,
  projects: CONTENT.projectGroups.map((g) => `<h3 class="group">${g}</h3>` + CONTENT.projects.filter((p) => p.cat === g).map(project).join("")).join(""),
  experience: `<ol class="rows">${CONTENT.experience.map((e, i) => `<li><details>
      <summary><span class="num">${String(i + 1).padStart(3, "0")}</span><span><b>${e.role}</b> · ${e.org}</span><span class="when">${e.date}</span></summary>
      <div class="more-box"><p class="note">${e.place}</p>${list(e.bullets)}${e.project ? `<a class="more" href="#project-${e.project}">See the project</a>` : ""}</div>
    </details></li>`).join("")}</ol><p class="total">${CONTENT.experienceTotal}</p>`,
  education: CONTENT.education.map((e) => `<div class="entry">
      <div class="entry-head"><h3>${e.school}</h3><span class="when">${e.date}</span></div>
      <p>${e.degree} · ${e.place}</p>${e.notes.map((n) => `<p class="note">${n}</p>`).join("")}
    </div>`).join(""),
  papers: CONTENT.papers.map((p) => `<div class="entry">
      <p class="kind">${p.kind}${p.badge ? `<span class="badge">★ ${p.badge}</span>` : ""}</p><p>${p.cite}</p>${p.link ? `<p>${link(p.link)}</p>` : ""}
    </div>`).join(""),
  skills: `<dl class="skills">${CONTENT.skills.map((s) => `<div><dt>${s.name}</dt><dd>${s.items}</dd></div>`).join("")}</dl><h3>Stack</h3>${tags(CONTENT.stack)}`,
  contact: `<p class="lead">(^_^)/ Knock knock! The fastest way to reach me is email.</p><p class="links">${P.links.map(link).join("")}</p>`,
};
$("#panels").innerHTML = CONTENT.sections.filter((s) => BODY[s.id]).map((s) => panel(s.id, BODY[s.id])).join("");
// Close-ups (pictures, drawn at 2x so pixels stay even); long rooms (the backyard) get their own row.
document.querySelectorAll(".scene-box").forEach((b) => {
  const w = +b.querySelector("img").getAttribute("width");
  b.style.width = `${w}px`;
  if (w > 320) b.classList.add("wide");
});

// ---------- sidebar
const news = CONTENT.news;
$("#news").innerHTML = `<h3>Latest news:</h3><p><b>${news.headline}</b><br>${news.text}</p><a class="more" href="${news.link.href}">${news.link.label}</a>`;
$("#nav").innerHTML = `<ul>${CONTENT.sections.filter((s) => s.label).map((s) => `<li><a href="#${s.id}"><span class="roll">${s.label}</span></a></li>`).join("")}</ul>`;
$("#guests").classList.add("guests");
function renderGuests() {
  const rooms = guestCounts(), total = rooms.reduce((n, r) => n + r.n, 0);
  $("#guests").innerHTML = `<h3>Guests in Jen's building: ${total}</h3>` +
    `<ul class="guest-grid">${rooms.map((r) => `<li>${r.href ? `<a href="${r.href}">${r.label}</a>` : r.label}<span>${r.n}</span></li>`).join("")}</ul>` +
    `<p class="guests-foot"><a href="#about">Who?</a><button class="linkish" id="refresh" type="button">Refresh</button></p>`;
}
renderGuests();
document.addEventListener("guests", () => { const f = document.activeElement?.id === "refresh"; renderGuests(); if (f) $("#refresh").focus(); });
$("#guests").addEventListener("click", (e) => { if (e.target.id === "refresh") randomChat(); });
$("#side-contact").innerHTML = `<h3>Say hi:</h3><p><a href="mailto:${P.email}">${P.email}</a></p><p class="links">${P.links.filter((l) => l.url.startsWith("http")).map(link).join("")}</p>`;
document.querySelectorAll(".roll").forEach((el) => { el.innerHTML = [...el.textContent].map((ch, i) => `<span style="--i:${i}">${ch}</span>`).join(""); });
$("#year").textContent = new Date().getFullYear();

// Deep links (e.g. #project-mri): the panels are rendered by script, so jump once they exist.
if (location.hash.length > 1) document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView({ behavior: "instant" });
