// ASCII version: fills the page from CONTENT (../js/content.js) and runs the live text-art figures.
(() => {
"use strict";
const C = CONTENT, $ = (s) => document.querySelector(s);
// dates by year only here, not month by month like a CV: "Mar 2026 – Present" becomes "2026 – present", "Sep 2020 – May 2022"
// becomes "2020 – 2022", a span inside one year becomes that year; single terms ("Fall 2024", "Jul 2022") stay as they are
const when = (d) => {
  const m = /^(?:\w+ )?(\d{4})\s*[–-]\s*(?:(\w+ )?(\d{4})|Present)$/i.exec(d);
  if (!m) return d;
  if (!m[3]) return `${m[1]} – present`;
  return m[1] === m[3] ? m[1] : `${m[1]} – ${m[3]}`;
};

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ======================================================================= page content */
const P = C.person;
// each field on its own unbreakable span
{ // two fields per line
  const f = C.hero.eyebrow.split(" · ").map((x) => `<span class="nb">${esc(x)}</span>`), half = Math.ceil(f.length / 2);
  $("#eyebrow").innerHTML = f.slice(0, half).join(" · ") + "<br>" + f.slice(half).join(" · ");
}
$("#h-name").textContent = P.name;
$("#lede").textContent = P.intro;
// the email link opens a small window with the address and a copy button, instead of a mail app
const linkItems = P.links.map((l) => l.url.startsWith("mailto:")
  ? `<li class="email-li"><button class="email-btn" type="button" aria-expanded="false">${esc(l.label)}</button></li>`
  : `<li><a href="${esc(l.url)}">${esc(l.label)}</a></li>`).join("");
$("#links").innerHTML = linkItems + `<li class="cta-li"><button class="msg-btn cta" type="button"><span class="cta-t" data-text="Get in touch">Get in touch</span><span class="cta-k" aria-hidden="true">↵</span></button></li>`;
$("#year").textContent = new Date().getFullYear();
$("#nav").innerHTML = C.sections.filter((s) => s.id !== "about").map((s) => `<a href="#${s.id}">${esc(s.label)}</a>`).join("") + `<a href="#contact" class="msg-btn">Contact</a>`; // opens the inquiry form

// projects, grouped; each card gets a figure drawn by the art named after its slug (finer grid where a figure needs it)
const ROWS_FOR = { pitching: 34 };
let figNo = 0;
const ORDER = ["Research", "Work", "Course Projects"].filter((g) => C.projectGroups.includes(g)).concat(C.projectGroups.filter((g) => !["Research", "Work", "Course Projects"].includes(g)));
$("#project-list").innerHTML = ORDER.map((g) => {
  const ps = C.projects.filter((p) => p.cat === g);
  if (!ps.length) return "";
  return `<h3 class="group">${esc(g)}</h3><div class="projects">` + ps.map((p) => {
    const n = ++figNo;
    const more = p.bullets.slice(1);
    return `<article class="card" id="p-${p.slug}">
      <div class="ascii" data-art="${p.slug}" data-rows="${ROWS_FOR[p.slug] || 16}" role="img" aria-label="Figure ${n}: animated text art for ${esc(p.short)}"></div>
      <div class="card-body">
        <p class="meta"><span class="fig">${String(n).padStart(2, "0")}</span>${esc(p.org)} · ${esc(when(p.date))}</p>
        <h3>${esc(p.title)}</h3>
        <p class="sum">${esc(p.bullets[0])}</p>
        <ul class="tags">${p.tags.map((t) => `<li class="tag">${esc(t)}</li>`).join("")}</ul>
        ${more.length || p.links.length ? `<button class="more" type="button" data-slug="${p.slug}" data-fig="${n}">Details <span aria-hidden="true">↗</span></button>` : ""}
      </div>
    </article>`;
  }).join("") + `</div>`;
}).join("");

$("#mini-list").innerHTML = (C.miniProjects || []).map((m) => `<article class="mini-card" data-mini="${esc(m.slug)}">
  ${m.frames
    ? `<div class="mini-art mini-pic" data-pose="closed" aria-hidden="true">${["dark", "light"].map((th) => ["closed", "opening", "open"].map((f) => `<img class="${th} ${f}" src="${esc(m.frames)}-${th}-${f}.webp" alt="" loading="lazy" decoding="async">`).join("")).join("")}</div>`
    : `<div class="ascii mini-art" data-art="${esc(m.slug)}" data-fs="3.4" data-ramp="Blocks" aria-hidden="true"></div>`}
  <div class="mini-body">
    <p class="meta">${esc(m.kind)}${m.date ? ` · ${esc(m.date)}` : ""}</p>
    <h3>${esc(m.title)}</h3>
    <p class="sum">${esc(m.summary)}</p>
    ${m.points ? `<ul class="mini-points">${m.points.map(([k, v]) => `<li><b>${esc(k)}:</b> ${esc(v)}</li>`).join("")}</ul>` : ""}
    <ul class="tags">${m.tags.map((t) => `<li class="tag">${esc(t)}</li>`).join("")}</ul>
    ${m.link ? `<p class="card-links"><a href="${esc(m.link.url)}">${esc(m.link.label)} ↗</a></p>` : ""}
  </div>
</article>`).join("");

$("#exp-list").innerHTML = C.experience.map((e) => `<li>
  <span class="when">${esc(when(e.date))}</span>
  <div class="what"><h3>${esc(e.role)} <span class="at">· ${esc(e.org)}</span></h3>
  ${e.bullets.length ? `<p class="topic">${e.bullets.map(esc).join(" ")}${e.project ? ` <a href="#p-${e.project}">Project</a>` : ""}</p>` : ""}</div></li>`).join("");

$("#edu-list").innerHTML = C.education.map((e) => `<li>
  <span class="when">${esc(when(e.date))}</span>
  <div class="what"><h3>${esc(e.degree)} <span class="at">· ${esc(e.school)}</span></h3>
  ${e.notes.length ? `<p class="topic">${e.notes.map(esc).join(" ")}</p>` : ""}</div></li>`).join("");

$("#paper-list").innerHTML = C.papers.map((p) => `<li><span class="kind">${esc(p.kind)}</span>${p.cite}
  ${p.link ? `<br><a href="${esc(p.link.url)}">${esc(p.link.label)}</a>` : ""}
  ${p.badge ? `<br><span class="badge">${esc(p.badge)}</span>` : ""}</li>`).join("");

$("#credits").innerHTML = C.skills.map((s) => `<span class="credit"><small>${esc(s.items)}</small><b>${esc(s.name)}</b></span>`).join("");
$("#stack").textContent = C.stack.join("  ·  ");

/* ======================================================================= "Get in touch": the pixel version's inquiry form, in a small window, sent by FormSubmit (see content.js) */
const TOPICS = ["Research collaboration", "Position or opportunity", "Question about a project or paper", "Other"];
const msgWin = document.createElement("dialog");
msgWin.className = "msgwin";
msgWin.setAttribute("aria-labelledby", "msg-h");
msgWin.innerHTML = `<div class="term-bar"><span class="term-dots" aria-hidden="true"><i></i><i></i><i></i></span>
  <span class="term-title">~/jen-li-kao/contact</span><button class="msg-x" type="button" aria-label="Close">×</button></div>
<form class="msg-form" novalidate>
  <h2 id="msg-h">Get in touch</h2>
  <p class="msg-note">Please feel free to reach out about research collaborations, opportunities, or any questions about my work. I will do my best to reply within a few days.</p>
  <div class="msg-row">
    <label><span>› name</span><input name="name" required autocomplete="name" maxlength="100"></label>
    <label><span>› email</span><input name="email" type="email" required autocomplete="email" maxlength="200"></label>
  </div>
  <label><span>› affiliation</span><input name="affiliation" required autocomplete="organization" maxlength="200" placeholder="university, lab or company"></label>
  <fieldset class="msg-topics"><legend>› about</legend>
    ${TOPICS.map((t, i) => `<label class="chip"><input type="radio" name="topic" value="${t}"${i ? "" : " checked"}><span>${t}</span></label>`).join("")}
  </fieldset>
  <label><span>› message <small class="msg-count">0 / 5000</small></span><textarea name="message" rows="5" required maxlength="5000"></textarea></label>
  <input class="msg-honey" name="_honey" tabindex="-1" autocomplete="off" aria-hidden="true">
  <div class="msg-foot"><p class="msg-status" role="status"></p><button class="msg-send cta" type="submit"><span class="cta-t" data-text="Send">Send</span><span class="cta-k" aria-hidden="true">↵</span></button></div>
</form>
<div class="msg-done" hidden>
  <pre class="msg-check" aria-hidden="true">      ██
     ██
██  ██
 ████</pre>
  <h2 tabindex="-1">Message received<span class="msg-who"></span></h2>
  <p>Thank you. I will reply to <b class="msg-to"></b> as soon as I can, usually within a few days.</p>
  <button class="msg-send cta msg-close" type="button"><span class="cta-t" data-text="Close">Close</span></button>
</div>`;
document.body.append(msgWin);
// the counter keeps track of the message length
msgWin.addEventListener("input", (e) => {
  if (e.target.name === "message") msgWin.querySelector(".msg-count").textContent = `${e.target.value.length} / 5000`;
});
const msgForm = msgWin.querySelector("form"), msgStatus = msgWin.querySelector(".msg-status"), msgSend = msgWin.querySelector(".msg-send");
const msgSay = (text, kind = "") => { msgStatus.textContent = text; msgStatus.className = "msg-status " + kind; };
const msgDone = msgWin.querySelector(".msg-done");
const msgShow = (done) => { msgForm.hidden = done; msgDone.hidden = !done; };
document.addEventListener("click", (e) => {
  if (e.target.closest(".msg-btn")) { e.preventDefault(); msgSay(""); msgShow(false); msgWin.showModal(); msgForm.elements.name.focus(); }
  if (e.target.closest(".msg-x, .msg-close") || e.target === msgWin) msgWin.close();
});
msgForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = msgForm.elements, v = (k) => f[k].value.trim();
  const missing = [["name", "your name"], ["email", "your email address"], ["affiliation", "your affiliation"], ["message", "a message"]].find(([k]) => !v(k));
  if (missing) { msgSay(`Please add ${missing[1]}.`, "bad"); f[missing[0]].focus(); return; }
  if (!f.email.checkValidity()) { msgSay("Please check the email address.", "bad"); f.email.focus(); return; }
  if (f._honey.value) return; // a bot filled the hidden field
  msgSend.disabled = true;
  let tick = 0; const bar = setInterval(() => { tick++; const n = tick % 13; msgSay("transmitting " + "▓".repeat(n) + "░".repeat(12 - n)); }, 90);
  msgWin.addEventListener("close", () => clearInterval(bar), { once: true });
  setTimeout(() => clearInterval(bar), 20000);
  try {
    const r = await fetch(P.messageForm, {
      method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ name: v("name"), email: v("email"), affiliation: v("affiliation") || "—", subject: f.topic.value, message: v("message"),
        _subject: `Website inquiry: ${f.topic.value} (${v("name")})`, _replyto: v("email"), _template: "table", _captcha: "false" }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || String(j.success) !== "true") throw new Error(j.message || r.status);
    // a thank-you in place of the form (the form is cleared for next time)
    msgWin.querySelector(".msg-who").textContent = ", " + v("name");
    msgWin.querySelector(".msg-to").textContent = v("email");
    msgForm.reset(); msgSay(""); msgShow(true); msgDone.querySelector("h2").focus();
  } catch (err) {
    console.warn("Inquiry form:", err.message); // e.g. FormSubmit's "This form needs Activation" before the address is confirmed
    msgStatus.innerHTML = `The message could not be sent. Please write to <a href="mailto:${P.email}">${P.email}</a> instead.`; msgStatus.className = "msg-status bad";
  }
  clearInterval(bar);
  msgSend.disabled = false;
});

// buttons: on hover the label scrambles through glyphs and resolves, left to right
document.addEventListener("pointerover", (e) => {
  const b = e.target.closest(".cta"); if (!b || b.dataset.busy || reduced) return;
  const t = b.querySelector(".cta-t"), word = t.dataset.text, glyphs = "░▒▓█<>/\\|=+*#%@";
  b.dataset.busy = 1; let k = 0;
  const id = setInterval(() => {
    k++; t.textContent = [...word].map((c, i) => (c === " " || i < k / 2 ? c : glyphs[(Math.random() * glyphs.length) | 0])).join("");
    if (k / 2 >= word.length) { clearInterval(id); t.textContent = word; delete b.dataset.busy; }
  }, 28);
});

/* ======================================================================= email: the link turns into the address in place */
// clicking "Email" decodes it into the address (no box, so nothing competes with the Get in touch button), with a
// small square copy button beside it; clicking it again, elsewhere, or Esc turns it back
const COPY_ICON = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5.75 1h7.5C14.22 1 15 1.78 15 2.75v7.5c0 .97-.78 1.75-1.75 1.75h-7.5C4.78 12 4 11.22 4 10.25v-7.5C4 1.78 4.78 1 5.75 1Zm0 1.5a.25.25 0 0 0-.25.25v7.5c0 .14.11.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25h-7.5ZM2.5 5.75v7.5c0 .14.11.25.25.25h7.5a.25.25 0 0 0 .25-.25V13.5h1.5v.75c0 .97-.78 1.75-1.75 1.75h-7.5C1.78 16 1 15.22 1 14.25v-7.5C1 5.78 1.78 5 2.75 5H3.5v1.5h-.75a.25.25 0 0 0-.25.25Z"/></svg>';
const DONE_ICON = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"/></svg>';
document.querySelectorAll(".email-li").forEach((li) => {
  li.insertAdjacentHTML("beforeend", `<button class="email-copy" type="button" aria-label="Copy email address" hidden>${COPY_ICON}</button>`);
});
function decode(el, word, done) { // scramble into `word`, left to right
  const glyphs = "░▒▓█<>/=+*#%@"; let k = 0;
  clearInterval(el._t);
  if (reduced) { el.textContent = word; return done && done(); }
  el._t = setInterval(() => {
    k++; el.textContent = [...word].map((c, i) => (i < k ? c : glyphs[(Math.random() * glyphs.length) | 0])).join("");
    if (k >= word.length) { clearInterval(el._t); el.textContent = word; done && done(); }
  }, 22);
}
// it also turns back on its own: right after the address is copied, or after 10 s left alone (the clock waits while
// the pointer is on it or part of the address is selected, so someone copying it by hand is not cut off)
const EMAIL_IDLE = 10;
function setEmail(li, open) {
  const btn = li.querySelector(".email-btn"), copy = li.querySelector(".email-copy");
  if (btn.getAttribute("aria-expanded") === String(open)) return;
  btn.setAttribute("aria-expanded", open); li.classList.toggle("open", open);
  copy.hidden = !open;
  decode(btn, open ? P.email : "Email");
  clearInterval(li._idle);
  if (open) {
    let left = EMAIL_IDLE;
    li._idle = setInterval(() => {
      const sel = getSelection(), busy = li.matches(":hover") || (sel && !sel.isCollapsed && li.contains(sel.anchorNode));
      left = busy ? EMAIL_IDLE : left - 1;
      if (left <= 0) setEmail(li, false);
    }, 1000);
  }
}
document.addEventListener("click", async (e) => {
  const copy = e.target.closest(".email-copy");
  if (copy) {
    try { await navigator.clipboard.writeText(P.email); }
    catch (err) { const r = document.createRange(); r.selectNodeContents(copy.previousElementSibling); getSelection().removeAllRanges(); getSelection().addRange(r); }
    copy.innerHTML = DONE_ICON; copy.classList.add("done"); copy.setAttribute("aria-label", "Copied");
    setTimeout(() => { copy.innerHTML = COPY_ICON; copy.classList.remove("done"); copy.setAttribute("aria-label", "Copy email address"); setEmail(copy.closest(".email-li"), false); }, 1600); // copied: done, so it folds back
    return;
  }
  const btn = e.target.closest(".email-btn");
  document.querySelectorAll(".email-li").forEach((li) => setEmail(li, btn && li.contains(btn) ? btn.getAttribute("aria-expanded") !== "true" : false));
});
document.addEventListener("keydown", (e) => { if (e.key === "Escape") document.querySelectorAll(".email-li").forEach((li) => setEmail(li, false)); });

/* ======================================================================= theme */
const root = document.documentElement, themeBtn = $("#theme");
const syncTheme = () => { const d = root.dataset.theme === "dark"; themeBtn.setAttribute("aria-pressed", d); themeBtn.setAttribute("aria-label", d ? "Light mode" : "Dark mode"); };
syncTheme();
themeBtn.addEventListener("click", () => {
  root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
  try { localStorage.setItem("theme", root.dataset.theme); } catch (e) {}
  syncTheme();
});

/* ======================================================================= the text-art engine */
const RAMPS = {
  Mix: " .:░▒▓█", // ASCII dots for the faintest texture, shaded blocks for everything with weight
  ASCII: " .:-=+*#%@",
  Dense: " .'`^\",:;Il!i><~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$",
  Blocks: " ░▒▓█",
  Dots: " ·∙•●",
  Binary: " 01",
  Film: " .'`,:;-~=+!i|/\\(){}[]?*xocuvnzsXYUJCLQ0OZmwqpdbkhao#MW&8%B@$", // the hero film: a long run of ASCII shades, light carried by how much ink each character puts down
};
let look = "Mix";
try { if (RAMPS[localStorage.getItem("look2")]) look = localStorage.getItem("look2"); } catch (e) {}
// a small easter egg in the footer: every figure on the page re-renders in the chosen style
/* ---------- the fortune cookie in the footer: three drawings (whole, cracked, open), a slip with a line, and a typewriter */
const FORTUNES = [
  // for researchers of any kind
  "The bug you are looking for is in the line you are sure about.",
  "Your next idea will arrive while you are away from the keyboard.",
  "Someone will cite you for a footnote.",
  "You will find the missing minus sign. Eventually.",
  "A well-named variable brings quiet luck.",
  "Today the baseline wins. Tomorrow, you.",
  "Your plots will be clearer than your slides. Fix the slides.",
  "An old notebook holds the answer. Read the margins.",
  "The experiment that fails on Friday works on Monday.",
  "Somewhere, a GPU is free. Go now.",
  "You will be interrupted by a very good question.",
  "Keep the raw data. Future you is counting on it.",
  "Reviewer 2 is having a good day. Submit today.",
  "The related-work section will be longer than you hoped.",
  "It works on your machine. That is still something.",
  "A deadline is approaching. It always is.",
  "Your advisor will reply. Just not to the question you asked.",
  "The typo is in the title.",
  "You will rerun it once more, to be sure. It will be the same.",
  "Figure 3 will carry the whole paper. Treat it well.",
  "Great ideas start as footnotes in someone else's talk.",
  "Read one paper today. Skim three. Feel good about all four.",
  // the ordinary days
  "Your coffee will be exactly the right temperature.",
  "Good things are coming. Some of them are snacks.",
  "You will find the thing you were looking for, in the first place you looked.",
  "Buy the slightly nicer one.",
  "The queue you pick will be the fast one, for once.",
  "A short walk fixes more than you expect.",
  "Someone will laugh at your joke today. Out loud.",
  "The sun will come out right when you step outside.",
  "Your package arrives early.",
  "Tonight: an early night. You deserve it.",
  "There is a free table at the cafe. Take it.",
  "Water the plant. It has been patient.",
  "Text the friend you just thought of.",
  "Your umbrella stays in the bag today.",
];
const LUCKY = [3, 7, 11, 16, 20, 28, 32, 62, 69, 74, 150, 400, 512, 784]; // numbers borrowed from the projects
{
  const box = $(".fortune"), btn = box.querySelector(".cookie"), slip = box.querySelector(".slip");
  let busy = false, timer = 0, used = [];
  const show = (phase) => { COOKIE_STATE.phase = phase; COOKIE_STATE.t0 = performance.now() / 1000; const p = panels.find((q) => q.name === "cookie"); if (p) p.dirty = true; };
  const pick = () => { if (used.length >= FORTUNES.length) used = []; let i; do i = Math.floor(Math.random() * FORTUNES.length); while (used.includes(i)); used.push(i); return FORTUNES[i]; };
  const lucky = () => [...LUCKY].sort(() => Math.random() - .5).slice(0, 5).sort((a, b) => a - b).join("  ");
  btn.addEventListener("click", () => {
    if (busy) return; busy = true; clearTimeout(timer);
    slip.hidden = true; slip.classList.remove("in");
    btn.classList.remove("shaking"); void btn.offsetWidth; btn.classList.add("shaking"); show("cracked");
    setTimeout(() => {
      show("open"); btn.classList.remove("shaking"); box.classList.add("done");
      const line = pick(), nums = lucky(); slip.hidden = false; slip.classList.add("in"); slip.innerHTML = ""; const t = document.createTextNode(""), sm = document.createElement("small"); slip.append(t, sm);
      let k = 0; const type = () => { t.data = line.slice(0, ++k); if (k < line.length) timer = setTimeout(type, reduced ? 0 : 22); else { sm.textContent = "lucky numbers  " + nums; busy = false; } };
      if (reduced) { t.data = line; sm.textContent = "lucky numbers  " + nums; busy = false; } else type();
      btn.setAttribute("aria-label", "Another fortune cookie. Crack it open.");
    }, reduced ? 0 : 500);
  });
}

$("#look").innerHTML = Object.keys(RAMPS).map((k) => `<button type="button" data-look="${k}" aria-pressed="${k === look}">${k.toLowerCase()}</button>`).join(`<span aria-hidden="true">·</span>`);
$("#look").addEventListener("click", (ev) => {
  const b = ev.target.closest("button"); if (!b) return;
  look = b.dataset.look;
  try { localStorage.setItem("look2", look); } catch (e) {}
  for (const x of $("#look").querySelectorAll("button")) x.setAttribute("aria-pressed", x === b);
  for (const p of panels) p.dirty = true;
});

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
function glyph(v, fixed) { // `fixed`: a ramp a figure always uses, whatever the chosen style
  if (fixed) { const r = RAMPS[fixed]; return r[Math.min(r.length - 1, Math.round(clamp01(v) * (r.length - 1)))]; }
  const r = RAMPS[look];
  if (look === "Binary") return v < 0.1 ? " " : v > 0.5 ? "1" : "0";
  return r[Math.min(r.length - 1, Math.round(clamp01(v) * (r.length - 1)))];
}

class Grid {
  constructor(c, r) { this.c = c; this.r = r; const n = c * r; this.v = new Float32Array(n); this.acc = new Uint8Array(n); this.ch = new Array(n); this.z = new Float32Array(n); this.tone = new Uint8Array(n); this.mat = new Uint8Array(n); }
  clear() { this.v.fill(0); this.acc.fill(0); this.ch.fill(undefined); this.z.fill(1e9); this.tone.fill(0); }
  // text in a chosen tone: 1 faint, 2 bright (plain put() text is mid-tone)
  text(x, y, s, tone = 2, acc = 0) { this.put(x, y, s, acc); x |= 0; y |= 0; if (y < 0 || y >= this.r) return; for (let k = 0; k < s.length; k++) { const xx = x + k; if (xx >= 0 && xx < this.c) this.tone[y * this.c + xx] = tone; } }
  set(x, y, v, acc = 0) { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= this.c || y >= this.r) return; const i = y * this.c + x; this.v[i] = v; this.acc[i] = acc; this.ch[i] = undefined; }
  max(x, y, v) { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= this.c || y >= this.r) return; const i = y * this.c + x; if (v > this.v[i]) this.v[i] = v; }
  put(x, y, s, acc = 0) { x |= 0; y |= 0; if (y < 0 || y >= this.r) return; for (let k = 0; k < s.length; k++) { const xx = x + k; if (xx < 0 || xx >= this.c) continue; const i = y * this.c + xx; this.ch[i] = s[k]; this.acc[i] = acc; } }
  // four layers: faint, mid and strong tones of the glyph colour, plus the highlight colour, so depth reads in any style
  strings() {
    const L = ["", "", "", "", "", "", "", ""]; // faint, mid, bright, accent (amber), maroon, tan, deep red, side grey
    for (let y = 0; y < this.r; y++) {
      for (let x = 0; x < this.c; x++) {
        const i = y * this.c + x, over = this.ch[i] !== undefined, g = over ? this.ch[i] : glyph(this.v[i], this.ramp);
        const v = this.v[i], k = this.acc[i] >= 3 ? this.acc[i] + 2 : this.acc[i] === 2 ? 4 : this.acc[i] ? 3 : over ? (this.tone[i] === 2 ? 2 : this.tone[i] === 1 ? 0 : 1) : v < .32 ? 0 : v < .68 ? 1 : 2;
        for (let m = 0; m < 8; m++) L[m] += m === k ? g : " ";
      }
      if (y < this.r - 1) for (let m = 0; m < 8; m++) L[m] += "\n";
    }
    return L;
  }
}

const ARTS = {}; // name -> (grid, t, state, panel) draws one frame
// the cookie, as pixel art seen from the front: L lit, B body, S shade, D the dark rim, with the fold opening at the centre; each pixel is two cells wide, since a cell is about twice as tall as wide
const COOKIE_PX = [
  "..........DDDDDD..........",
  "........DDLLLBBBDD........",
  "......DDLLLBBBBBBBDD......",
  ".....DLLLBBBBBDBBBBBD.....",
  "....DLLBBBBBBBDDBBBBBD....",
  "...DLBBBBBBBBBD.DBBBBSD...",
  "..DLBBBBBBBBBD...DBBBSSD..",
  "..DBBBBBBBBBD.....DBBSSD..",
  "..DBBBBBBBBD.......DBSSD..",
  "..DBBBBBBDD.........DSSD..",
  "..DBBBBDD............DSD..",
  "...DDDD...............DD..",
];
const COOKIE_TONE = { L: 1, B: .72, S: .5, D: .26 };
const COOKIE_STATE = { phase: "whole", t0: 0 };
ARTS.cookie = (g, t, st) => {
  const H = COOKIE_PX.length, W = COOKIE_PX[0].length, mid = W / 2, ox = Math.floor((g.c - 2 * W) / 2), oy = Math.floor((g.r - H) / 2) - 1;
  const ph = COOKIE_STATE.phase, k = Math.min(1, (t - COOKIE_STATE.t0) / .4), gap = ph === "open" ? Math.round(3 * k) : 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = COOKIE_PX[y][x]; if (c === ".") continue;
    let v = COOKIE_TONE[c];
    if (c === "L" && ph === "whole" && Math.sin(t * 1.6 + x * .9 + y) > .85) v = .72; // a glint wanders over the lit side
    const left = x < mid, shift = ph === "open" ? (left ? -gap : gap) : 0, tilt = ph === "open" ? Math.round(k * (left ? 1 : -1) * .6) : 0;
    const X = ox + 2 * x + shift, Y = oy + y + tilt;
    g.set(X, Y, v); g.set(X + 1, Y, v);
  }
  if (ph === "cracked") { // sparks along the fold while it gives way
    const f = Math.floor(t * 14);
    for (let y = 2; y < H - 1; y++) { const e = 2 * (13 + Math.floor((y - 2) / 1.2)) + ((f + y) % 3) - 1; g.set(ox + e, oy + y, (f + y) % 2 ? 1 : .5); g.set(ox + e - 2 * (y - 1) - ((f + y) % 2), oy + y, (f + y) % 2 ? .5 : 1); }
  }
  if (ph === "open") { // the paper slip rises out of the fold
    const rise = Math.round(6 * k), px = ox + 2 * 13 - 2, top = oy + H - 1 - rise;
    for (let y = top; y < oy + H + 1; y++) for (let x = px; x < px + 5; x++) g.set(x, y, 1, 1);
    for (let y = top + 1; y < oy + H; y += 2) for (let x = px + 1; x < px + 4; x++) g.set(x, y, 1, 2); // lines of red writing
  }
};
const panels = [];
function mount(el) {
  const art = ARTS[el.dataset.art]; if (!art) return;
  el.innerHTML = `<pre class="t0"></pre><pre class="t1"></pre><pre class="t2"></pre><pre class="acc"></pre><pre class="mar"></pre><pre class="tan"></pre><pre class="deep"></pre><pre class="side"></pre>`;
  const p = { el, art, name: el.dataset.art, layers: [...el.children], state: {}, visible: false, dirty: true, grid: null, fixed: !!el.dataset.rows };
  panels.push(p);
  // project figures rest on their most telling frame and play only while the card is hovered or focused (tap on touch)
  const card = el.closest(".card");
  if (card) {
    p.rests = true;
    const play = () => { if (!p.play) { p.play = true; p.started = performance.now() / 1000; } };
    const stop = () => { if (p.play) { p.play = false; p.state = {}; p.dirty = true; } };
    card.addEventListener("pointerenter", (e) => { if (e.pointerType !== "touch") play(); });
    card.addEventListener("pointerleave", (e) => { if (e.pointerType !== "touch") stop(); });
    card.addEventListener("focusin", play); card.addEventListener("focusout", (e) => { if (!card.contains(e.relatedTarget)) stop(); });
    el.addEventListener("click", () => (p.play ? stop() : play()));
  }
  fit(p);
  new ResizeObserver(() => fit(p)).observe(el);
  new IntersectionObserver(([e]) => { p.visible = e.isIntersecting; }, { rootMargin: "80px" }).observe(el);
  return p;
}
const CHAR_W = 0.6, LINE_H = 1.15; // JetBrains Mono advance and the line height in style.css
function fit(p) {
  const w = p.el.clientWidth, h = p.el.clientHeight; if (!w || !h) return;
  let c, r, fs;
  if (p.fixed) { r = +p.el.dataset.rows; fs = h / (r * LINE_H); c = Math.floor(w / (fs * CHAR_W)); }
  else { fs = +(w < 520 && p.el.dataset.fsSm || p.el.dataset.fs) || (w < 520 ? 6 : 11); c = Math.floor(w / (fs * CHAR_W)); r = Math.floor(h / (fs * LINE_H)); }
  p.el.style.fontSize = fs + "px";
  if (!p.grid || p.grid.c !== c || p.grid.r !== r) { p.grid = new Grid(c, r); p.grid.ramp = p.el.dataset.ramp; p.state = {}; }
  p.dirty = true;
}
function draw(p, t) {
  if (p.rests) {
    const rest = REST[p.name] ? REST[p.name](p.grid) : 3;
    if (!p.state.warm) { // figures that build up over time (heat trails) are simulated up to their resting frame
      p.state.warm = true;
      if (WARM.has(p.name)) for (let k = 0; k < rest * 24; k++) { p.grid.clear(); p.art(p.grid, k / 24, p.state, p); }
    }
    t = p.play && !reduced ? (PLAY_FROM_START.has(p.name) ? 0 : rest) + (t - p.started) : rest;
  }
  p.grid.clear(); p.art(p.grid, t, p.state, p);
  p.grid.strings().forEach((txt, m) => { p.layers[m].textContent = txt; }); p.dirty = false;
}
let last = 0, frameNo = 0;
function loop(now) {
  requestAnimationFrame(loop);
  if (now - last < 1000 / 24) return; // 24 frames a second is plenty for text
  last = now; frameNo++;
  const t = now / 1000;
  for (const p of panels) {
    if (!p.grid || !p.visible) continue;
    const moving = p.rests ? p.play && !reduced : !reduced;
    if (moving || p.dirty) draw(p, reduced && !p.rests ? 2.05 : t);
  }
}

/* ---------- small helpers */
const hash = (n) => { n = Math.sin(n * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); };
const hash2 = (x, y) => hash(x * 57.3 + y * 13.7);
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const fbm = (x, y) => 0.55 * vnoise(x, y) + 0.3 * vnoise(x * 2.1, y * 2.1) + 0.15 * vnoise(x * 4.3, y * 4.3);
const lerp = (a, b, k) => a + (b - a) * k;
// a twinkling star always drawn in plain ASCII, whatever the style: . · + * as it brightens (tw: 0..1)
const STAR = [".", "·", "+", "*"];
function star(g, x, y, tw) { g.put(x, y, STAR[Math.min(3, Math.floor(tw * 4))], 0); g.v[y * g.c + x] = .4 + .6 * tw; }
const ease = (k) => k * k * (3 - 2 * k);

/* ======================================================================= hero: reconstruction from incomplete observations */
// The panel starts as raw noise. A sensor (the visitor's pointer, or an automatic sweep when idle) "observes" the cells
// it passes over, and there the hidden picture is reconstructed; unobserved cells slowly fall back to noise.
const HIDDEN = { mark: P.name.toUpperCase(), line: "" };
function hiddenTarget(c, r) {
  const cv = document.createElement("canvas"); cv.width = c; cv.height = r;
  const x = cv.getContext("2d"); x.fillStyle = "#000"; x.fillRect(0, 0, c, r);
  x.save(); x.scale(1, CHAR_W / LINE_H); // draw in square units, squash to cell rows
  const H = r * LINE_H / CHAR_W, font = (px) => `700 ${px}px "Barlow Condensed", "Arial Narrow", sans-serif`;
  // one line, left-aligned like a heading, as tall as the panel allows (and never wider than it)
  x.font = font(100);
  const size = Math.min(H * .95, 100 * c * .96 / x.measureText(HIDDEN.mark).width);
  x.fillStyle = "#fff"; x.textAlign = "left"; x.textBaseline = "alphabetic";
  x.font = font(size);
  const m = x.measureText(HIDDEN.mark); // the first letter's ink exactly on the left edge, and the capitals centred top to bottom
  x.fillText(HIDDEN.mark, m.actualBoundingBoxLeft || 0, H / 2 + ((m.actualBoundingBoxAscent || size * .7) - (m.actualBoundingBoxDescent || 0)) / 2);
  x.restore();
  const d = x.getImageData(0, 0, c, r).data, out = new Float32Array(c * r);
  for (let i = 0; i < out.length; i++) out[i] = d[i * 4] / 255;
  return out;
}
let fontsReady = false;
if (document.fonts) document.fonts.ready.then(() => { fontsReady = true; });
ARTS.sense = (g, t, st, p) => {
  const n = g.c * g.r;
  if (!st.seen || (fontsReady && !st.fontDone)) {
    st.target = hiddenTarget(g.c, g.r); st.fontDone = fontsReady;
    // noise only within the name's own width (no tail to its right), thinning out above and below the letters
    let x0 = g.c, x1 = -1;
    for (let i = 0; i < n; i++) if (st.target[i] > .5) { const x = i % g.c; if (x < x0) x0 = x; if (x > x1) x1 = x; }
    st.x0 = x0; st.x1 = x1;
    st.mask = new Float32Array(n);
    for (let y = 0; y < g.r; y++) for (let x = 0; x < g.c; x++) {
      const ey = Math.abs(y / (g.r - 1) - .5) * 2;
      st.mask[y * g.c + x] = x >= x0 && x <= x1 ? clamp01(1 - ey ** 4) : 0;
    }
    if (!st.seen) { st.seen = new Float32Array(n); st.last = -1e9; st.t0 = t; bindSensor(p, st); }
  }
  // where the sensor is: the visitor's pointer, or, while nobody touches it, an unseen sensor that passes over
  // the name on a loop, to show that something is hidden here
  // idle loop (16 s), different every time: an unseen sensor takes a random path over part of the name, the rest of
  // the letters resolve in random order, the full name holds for a moment, then it dissolves back into noise
  const idle = t - st.last > 3, LOOP = 16, run = t - st.t0, cyc = Math.floor(run / LOOP), e = run % LOOP; // e: seconds into the loop
  const rnd = (k) => hash(cyc * 7.31 + k * 1.93);
  let sx = -999, sy = -999, phase = "free";
  if (idle && !reduced) {
    // 0.5–3.7 s sensor pass, 3.7–4.7 s the rest resolves, 4.7–8.7 s the full name holds, 8.7–10.2 s dissolve, then quiet
    if (e > .5 && e < 3.7) {
      // a random path through five waypoints that alternate high and low, so it moves up and down as well as across
      const q = (e - .5) / 3.2, K = 5, seg = Math.min(K - 2, Math.floor(q * (K - 1))), f = ease(q * (K - 1) - seg);
      const ltr = rnd(1) < .5;
      const wp = (j) => {
        const xf = (j / (K - 1)) * .8 + .1 + (rnd(10 + j) - .5) * .18;
        return [st.x0 + (st.x1 - st.x0) * (ltr ? xf : 1 - xf), g.r * (j % 2 === (rnd(2) < .5 ? 0 : 1) ? .08 + .22 * rnd(20 + j) : .7 + .24 * rnd(20 + j))];
      };
      const [ax, ay] = wp(seg), [bx, by] = wp(seg + 1);
      sx = ax + (bx - ax) * f; sy = ay + (by - ay) * f;
    } else if (e >= 3.7 && e < 4.7) phase = "fill";
    else if (e >= 4.7 && e < 8.7) phase = "hold";
    else if (e >= 8.7 && e < 10.2) phase = "out";
  } else if (!idle) { sx = st.px * g.c; sy = st.py * g.r; }
  const R = Math.max(5, g.r * .8); // radius in cell widths: small enough that up and down movement shows
  const S = st.seen, T = st.target, frame = Math.floor(t * 10);
  const lineY = HIDDEN.line ? Math.round(g.r * .86) : -1, lineX = Math.round((g.c - HIDDEN.line.length) / 2);
  for (let y = 0; y < g.r; y++) for (let x = 0; x < g.c; x++) {
    const i = y * g.c + x, d = Math.hypot(x - sx, (y - sy) * LINE_H / CHAR_W) / R;
    if (reduced || phase === "hold") S[i] = 1;
    else if (d < 1) S[i] = Math.min(1, S[i] + (1 - d) * .3);
    else if (phase === "fill") S[i] = hash2(i, cyc) < (e - 3.7) / 1 ? Math.min(1, S[i] + .25) : S[i];
    else if (phase === "out") S[i] = hash2(i, cyc + .5) < (e - 8.7) / 1.5 ? S[i] * .7 : S[i];
    else S[i] *= .975;
    // raw "signal": flickering, unevenly dense noise
    const h = hash2(i, frame + Math.floor(hash(i) * 10));
    const noise = h > 1 - .32 * st.mask[i] ? (.25 + .5 * h) * st.mask[i] : 0;
    const k = S[i] * S[i], v = noise * (1 - k) + T[i] * k;
    g.v[i] = v;
    if (k > .6 && T[i] > .5) g.acc[i] = 1;
    if (y === lineY && x >= lineX && x < lineX + HIDDEN.line.length && k > .5) { g.ch[i] = HIDDEN.line[x - lineX]; g.acc[i] = 0; g.v[i] = 1; }
  }
};
function bindSensor(p, st) {
  const move = (e) => {
    const r = p.el.getBoundingClientRect();
    st.px = (e.clientX - r.left) / r.width; st.py = (e.clientY - r.top) / r.height;
    st.last = performance.now() / 1000;
    if (reduced) draw(p, 2.05);
  };
  p.el.addEventListener("pointermove", move);
  p.el.addEventListener("pointerdown", move);
}


/* ======================================================================= hero, right: a small isometric city at night */
// Blocks of buildings between streets; people walk the streets, and a sensor tower in the middle watches the city.
// The tower takes turns with four ways of sensing: a radar sweep, pulses that ripple out and echo off people, four
// cameras at the corners that only count a person when two of them agree, and a learning pass that misses people at
// first and misses fewer as it goes. The visitor is a sensor too: the pointer carries its own light over the streets.
const CITY_MODES = ["radar sweep", "pulse radar", "4 cameras, 2 agree", "learning"], CITY_MODE_T = 14;
ARTS.city = (g, t, st, p) => {
  const DX = 4, DY = 1; // a tile is 8 columns wide and 2 rows deep; one storey is one row
  const N = Math.max(5, Math.min(Math.floor((g.c - 2) / (2 * DX)), Math.floor((g.r - 10) / (2 * DY))));
  const ox = Math.floor(g.c / 2) - DX, oy = Math.max(8, g.r - 2 * N * DY - 1);
  const road = (i, j) => i % 4 === 0 || j % 4 === 0;
  const mid = Math.floor(N / 2) + (Math.floor(N / 2) % 4 === 0 ? 1 : 0), tower = [mid, mid];
  const H = (i, j) => {
    if (road(i, j)) return 0;
    if (i === tower[0] && j === tower[1]) return 9;
    const h = hash2(i * 3.1 + N, j * 7.7);
    return h < .18 ? -1 : 1 + Math.floor(h * h * 5); // -1: a small park
  };
  if (!st.walkers) {
    st.walkers = []; st.last = -1e9; bindSensor(p, st);
    const lanes = []; for (let k = 0; k < N; k += 4) lanes.push(k);
    for (let k = 0; k < 10; k++) st.walkers.push({ k, alongI: k % 2 === 0, lane: lanes[k % lanes.length], speed: (.3 + hash(k) * .45) * (k % 3 ? 1 : -1), off: hash(k * 9) * N, seen: -9, missed: -9, views: 0 });
  }
  const mode = reduced ? 0 : Math.floor(t / CITY_MODE_T) % 4, mt = t % CITY_MODE_T, you = st.px !== undefined && t - st.last < 2.2 && !reduced;
  const proj = (i, j, h) => [ox + (i - j) * DX + DX, oy + (i + j) * DY - h]; // the tile's top corner
  // the visitor's light: the pointer, mapped back onto the ground
  let yi = -99, yj = -99; if (you) { const a = (st.px * g.c - ox - DX) / DX, b = (st.py * g.r - oy) / DY; yi = (a + b) / 2; yj = (b - a) / 2; }
  const yours = (i, j) => you ? Math.max(0, 1 - Math.hypot(i - yi, j - yj) / 3) : 0;
  // the tower's four ways of sensing: each gives how lit a point on the ground is (0..1) and whether a walker there is detected
  const sweep = (t * .8) % (2 * Math.PI), pass = Math.floor(t * .8 / (2 * Math.PI));
  const ang = (i, j) => Math.abs(((Math.atan2(j - tower[1], i - tower[0]) - sweep) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI);
  const RMAX = N * .78, rings = [0, 1].map((k) => (t * 2.4 + k * RMAX / 2) % RMAX);
  const cams = [[0, 0], [N - 1, 0], [0, N - 1], [N - 1, N - 1]].map(([ci, cj], k) => { const base = Math.atan2(tower[1] - cj, tower[0] - ci); return { ci, cj, dir: base + .4 * Math.sin(t * .45 + k * 1.7), k }; });
  const views = (i, j) => cams.reduce((n, c) => { const d = Math.hypot(i - c.ci, j - c.cj); if (d > N * .85) return n; let a = Math.atan2(j - c.cj, i - c.ci) - c.dir; a = Math.abs(((a % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI); return n + (a < .42 ? 1 : 0); }, 0);
  const groundLit = (i, j) => {
    let v = 0;
    if (mode === 0 || mode === 3) v = Math.max(0, 1 - ang(i, j) / .2);
    else if (mode === 1) { const d = Math.hypot(i - tower[0], j - tower[1]); for (const R of rings) v = Math.max(v, Math.max(0, 1 - Math.abs(d - R) / .7) * .8); }
    else v = views(i, j) * .22;
    return Math.min(1, v + yours(i, j) * .9);
  };
  const learnP = .25 + .75 * ease(clamp01(mt / (CITY_MODE_T - 2))); // the learning pass: how often a sweep actually catches someone
  const at = {};
  for (const w of st.walkers) {
    const pos = ((w.off + t * w.speed) % N + N) % N, i = w.alongI ? pos : w.lane + .5, j = w.alongI ? w.lane + .5 : pos;
    let hit = false; w.views = 0;
    if (mode === 0) hit = ang(i, j) < .16;
    else if (mode === 1) { const d = Math.hypot(i - tower[0], j - tower[1]); hit = rings.some((R) => Math.abs(d - R) < .35); }
    else if (mode === 2) { w.views = views(i, j); hit = w.views >= 2; }
    else if (ang(i, j) < .16) { if (hash(w.k * 7.3 + pass * 1.9) < learnP) hit = true; else if (t - w.missed > 2) w.missed = t; }
    if (yours(i, j) > .35) hit = true; // the visitor's light counts too
    if (hit) w.seen = t;
    const key = Math.floor(i) + "," + Math.floor(j); (at[key] = at[key] || []).push({ i, j, w });
  }
  // sky
  for (let y = 0; y < oy; y++) for (let x = 0; x < g.c; x++) { const h = hash2(x * 1.3, y * 2.1); if (h > .982) star(g, x, y, .5 + .5 * Math.sin(t * (1 + h * 4) + x)); }
  g.put(g.c - 6, 2, "◐", 1);
  for (let s = 0; s <= 2 * (N - 1); s++) for (let i = 0; i < N; i++) {
    const j = s - i; if (j < 0 || j >= N) continue;
    const h = H(i, j), hh = Math.max(0, h), [cx, ty] = proj(i, j, hh);
    const lit = h === 0 ? groundLit(i + .5, j + .5) : 0;
    // walls under the diamond's lower edges
    for (let u = -DX; u < DX; u++) {
      const edge = ty + DY + Math.round(DY * (1 - Math.abs(u + .5) / DX));
      for (let k = 0; k < hh; k++) {
        const y = edge + k, x = cx + u;
        const win = k % 2 === 1 && Math.abs(u + .5) > 1 && Math.abs(u + .5) < DX - 1 && (u & 1);
        if (win && hash2(i * 13 + u, j * 7 + k + Math.floor(t * .15 + hash(i + j * 5) * 9)) > .66) g.put(x, y, "▪", hash(i * 31 + j * 17 + k * 5 + u) > .6 ? 2 : 1); // most windows amber, some maroon
        else g.set(x, y, u < 0 ? .46 : .24);
      }
    }
    // the top diamond
    for (let r = 0; r < 2 * DY; r++) {
      const w = Math.round(DX * (1 - Math.abs(r + .5 - DY) / DY));
      for (let u = -w; u < w; u++) {
        const x = cx + u, y = ty + r + 1;
        if (h === 0) { const k = y * g.c + x; if (x >= 0 && y >= 0 && x < g.c && y < g.r) { g.v[k] = lit ? .35 + .65 * lit : 0; g.ch[k] = undefined; g.acc[k] = 0; } }
        else g.set(x, y, h === -1 ? .18 : .78);
      }
    }
    if (h === -1) { g.put(cx - 2, ty + 2, "♣", 0); g.put(cx + 1, ty + 3, "♣", 0); }
    if (i === tower[0] && j === tower[1]) { for (let k = 0; k < 3; k++) g.put(cx, ty - k, "|", 0); g.put(cx, ty - 3, Math.floor(t * (mode === 1 ? 4 : 2)) % 2 ? "*" : "·", 1); }
    if (mode === 2) for (const c of cams) if (c.ci === i && c.cj === j) { g.put(cx, ty + 1, "▣", 2); const dx = Math.round(Math.cos(c.dir) * 2), dy = Math.round(Math.sin(c.dir)); g.put(cx + dx, ty + 1 + dy, "·", 2); } // the cameras, each with a tick for where it looks
    for (const q of at[i + "," + j] || []) {
      const [px, py] = proj(q.i, q.j, 0), recent = t - q.w.seen < 1.2, miss = mode === 3 && t - q.w.missed < 1.2 && !recent;
      g.put(px, py + DY, recent ? "●" : miss ? "○" : mode === 2 && q.w.views === 1 ? "◦" : "•", recent ? 1 : 0);
    }
  }
  if (you) { const [px, py] = proj(yi, yj, 0); g.put(px - 1, py, "(", 1); g.put(px + 1, py, ")", 1); }
  const seen = st.walkers.filter((w) => t - w.seen < 1.2).length;
  const label = mode === 3 ? `learning ${String(Math.round(learnP * 100)).padStart(3, " ")}%` : CITY_MODES[mode];
  g.put(1, 0, `${you ? "sensor: you + tower" : "sensor: tower"}   ${label}   in view ${seen}/${st.walkers.length}`, 0);
};

/* ======================================================================= project figures */
// pitching analysis: a generic mannequin (no player data) throws, seen from the side as a skeleton of keypoints;
// the wrist leaves a fading path, the throwing arm's joints are tracked, and the elbow angle is read out
const PJ = { lSh: 4, lEl: 5, lWr: 6, rSh: 7, rEl: 8, rWr: 9 };
const PKEY = [ // y up, x toward the plate, metres; joints: pelvis chest neck head lSh lEl lWr rSh rEl rWr lHip lKn lAn rHip rKn rAn
  [[0,1.0,0],[0,1.35,0],[0,1.55,0],[0,1.7,0],[.18,1.47,0],[.17,1.24,.13],[.03,1.3,.2],[-.18,1.47,0],[-.16,1.24,.13],[0,1.3,.2],[.1,1.0,0],[.12,.55,.02],[.14,.08,0],[-.1,1.0,0],[-.12,.55,.02],[-.14,.08,0]],
  [[-.03,1.0,0],[-.06,1.36,0],[-.07,1.56,0],[-.07,1.71,0],[.12,1.48,0],[.14,1.25,.13],[.02,1.3,.2],[-.24,1.47,0],[-.2,1.24,.12],[-.02,1.3,.2],[.06,1.0,.02],[.1,1.08,.28],[.02,.68,.2],[-.12,1.0,0],[-.1,.55,.05],[-.14,.08,0]],
  [[.35,.86,0],[.27,1.2,0],[.22,1.4,0],[.2,1.55,0],[.42,1.33,.02],[.66,1.31,.06],[.82,1.25,.1],[.06,1.31,-.02],[-.2,1.33,0],[-.24,1.6,.06],[.45,.86,.04],[.8,.52,.04],[.97,.08,.02],[.25,.86,-.04],[-.04,.46,-.02],[-.3,.12,0]],
  [[.55,.85,0],[.62,1.2,.03],[.72,1.38,.04],[.8,1.5,.04],[.66,1.3,.19],[.56,1.1,.31],[.4,1.04,.2],[.6,1.33,-.18],[.86,1.46,-.25],[1.07,1.56,-.2],[.6,.85,.1],[.95,.5,.1],[.96,.08,.05],[.5,.85,-.1],[.3,.5,-.1],[0,.2,-.1]],
  [[.7,.8,0],[.9,1.05,.05],[1.0,1.2,.05],[1.1,1.31,.05],[.9,1.15,.19],[.74,1.0,.3],[.6,.9,.2],[.95,1.2,-.15],[1.15,.9,-.05],[1.0,.66,.15],[.75,.82,.1],[1.0,.48,.1],[.96,.08,.05],[.65,.82,-.1],[.75,.55,-.25],[.55,.35,-.35]],
];
const PNAME = ["set", "leg lift", "stride", "release", "follow-through"];
const PTL = [[0, 0], [0, .7], [1, 1.5], [2, 2.25], [3, 2.5], [4, 2.85], [4, 3.6], [0, 4.6]]; // [key, time s]
const PBONES = [[0,1],[1,2],[2,3],[2,4],[2,7],[4,5],[5,6],[7,8],[8,9],[0,10],[0,13],[10,11],[11,12],[13,14],[14,15]];
const RELEASE = 2.5;
function pitchPose(t) {
  const T = PTL[PTL.length - 1][1], tt = ((t % T) + T) % T;
  let k = 0; while (k < PTL.length - 2 && tt > PTL[k + 1][1]) k++;
  const [a, ta] = PTL[k], [b, tb] = PTL[k + 1], f = ease(clamp01((tt - ta) / (tb - ta || 1)));
  return { j: PKEY[a].map((p, i) => [lerp(p[0], PKEY[b][i][0], f), lerp(p[1], PKEY[b][i][1], f)]), phase: PNAME[f < .5 ? a : b], tt };
}
// the same throw as a multi-view 3D reconstruction: the mannequin as a shaded point cloud, seen by four cameras
const PBONES3 = [[0,1,.13],[1,2,.1],[2,3,.05],[2,4,.06],[2,7,.06],[4,5,.05],[5,6,.04],[7,8,.05],[8,9,.04],[0,10,.09],[0,13,.09],[10,11,.075],[11,12,.055],[13,14,.075],[14,15,.055]];
function pitchPose3(t) {
  const T = PTL[PTL.length - 1][1], tt = ((t % T) + T) % T;
  let k = 0; while (k < PTL.length - 2 && tt > PTL[k + 1][1]) k++;
  const [a, ta] = PTL[k], [b, tb] = PTL[k + 1], f = ease(clamp01((tt - ta) / (tb - ta || 1)));
  return { j: PKEY[a].map((p, i) => [0, 1, 2].map((d) => lerp(p[d], PKEY[b][i][d], f))), phase: PNAME[f < .5 ? a : b], tt };
}
function pointCloud(j) { // surface points with normals on capsules and the head sphere
  const pts = [], STEP = .028;
  for (const [ia, ib, r] of PBONES3) {
    const A = j[ia], B = j[ib], d = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], L = Math.hypot(...d) || 1e-6, u = d.map((x) => x / L);
    const h = Math.abs(u[1]) < .9 ? [0, 1, 0] : [1, 0, 0];
    let p1 = [u[1] * h[2] - u[2] * h[1], u[2] * h[0] - u[0] * h[2], u[0] * h[1] - u[1] * h[0]]; const n1 = Math.hypot(...p1); p1 = p1.map((x) => x / n1);
    const p2 = [u[1] * p1[2] - u[2] * p1[1], u[2] * p1[0] - u[0] * p1[2], u[0] * p1[1] - u[1] * p1[0]];
    const rings = Math.max(2, Math.ceil(L / STEP)), around = Math.max(6, Math.ceil(2 * Math.PI * r / STEP));
    for (let i = 0; i <= rings; i++) {
      const sv = i / rings, c = [A[0] + d[0] * sv, A[1] + d[1] * sv, A[2] + d[2] * sv];
      for (let k = 0; k < around; k++) {
        const th = (k / around) * 2 * Math.PI + i * .4, cs = Math.cos(th), sn = Math.sin(th);
        const n = [p1[0] * cs + p2[0] * sn, p1[1] * cs + p2[1] * sn, p1[2] * cs + p2[2] * sn];
        pts.push(c[0] + n[0] * r, c[1] + n[1] * r, c[2] + n[2] * r, n[0], n[1], n[2]);
      }
    }
  }
  const hd = j[3], R = .115, N = 260;
  for (let i = 0; i < N; i++) {
    const y = 1 - (2 * i + 1) / N, rr = Math.sqrt(1 - y * y), th = i * 2.39996, n = [Math.cos(th) * rr, y, Math.sin(th) * rr];
    pts.push(hd[0] + n[0] * R, hd[1] + n[1] * R, hd[2] + n[2] * R, n[0], n[1], n[2]);
  }
  return pts;
}
const PCAMS = [30, 120, 210, 300].map((deg, i) => { const a = deg * Math.PI / 180; return { p: [.45 + 2.1 * Math.cos(a), 1.55 + (i % 2) * .25, 2.1 * Math.sin(a)], id: "C" + (i + 1) }; });
const PGROUND = []; for (let x = -1.5; x <= 1.5; x += .2) for (let z = -1.5; z <= 1.5; z += .2) if (x * x + z * z < 2.2) PGROUND.push([.45 + x, 0, z]);
ARTS.pitching = (g, t, st, p) => {
  const yaw = -.6 + (p && p.play ? (t - REST.pitching()) * .25 : 0), pitch = .22; // turns slowly while playing
  const { j, phase, tt } = pitchPose3(t);
  const cx = .45, cy = .85, D = 5, cw = CHAR_W, ch = LINE_H, W = g.c * cw, H = g.r * ch, f = Math.min(H * .44, W * .38);
  const cyw = Math.cos(yaw), syw = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  const view = (x, y, z) => { x -= cx; y -= cy; const x1 = x * cyw - z * syw, z1 = x * syw + z * cyw; return [x1, y * cp - z1 * sp, y * sp + z1 * cp]; };
  const proj = (v) => { const s = f * D / (v[2] + D); return [(W / 2 + v[0] * s) / cw, (H * .55 - v[1] * s) / ch, v[2]]; };
  const L = [.45, .62, -.64];
  for (const q of PGROUND) { const [x, y] = proj(view(...q)); g.max(x, y, .14); }
  const pts = pointCloud(j);
  for (let i = 0; i < pts.length; i += 6) {
    const v = view(pts[i], pts[i + 1], pts[i + 2]), nx = pts[i + 3], ny = pts[i + 4], nz = pts[i + 5];
    const n1x = nx * cyw - nz * syw, n1z = nx * syw + nz * cyw, n2y = ny * cp - n1z * sp, n2z = ny * sp + n1z * cp;
    if (n2z > .45) continue;
    const [x, y, z] = proj(v), xi = x | 0, yi = y | 0;
    if (xi < 0 || yi < 0 || xi >= g.c || yi >= g.r) continue;
    const k = yi * g.c + xi; if (z >= g.z[k]) continue;
    g.z[k] = z; g.v[k] = .22 + .78 * Math.max(0, n1x * L[0] + n2y * L[1] + n2z * L[2]); g.acc[k] = 0; g.ch[k] = undefined;
  }
  // the ball, from release toward the plate
  const since = tt - RELEASE;
  if (since > 0 && since < .8) {
    const r0 = PKEY[3][PJ.rWr], bp = [r0[0] + since * 9, r0[1] - since * since * 2, r0[2]], [bx, by, bz] = proj(view(...bp));
    const k = Math.round(by) * g.c + Math.round(bx); if (bx >= 0 && bx < g.c && by >= 0 && by < g.r && bz < g.z[k]) g.put(Math.round(bx), Math.round(by), "●", 1);
  }
  // cameras and their rays to the chest
  for (const cam of PCAMS) {
    const pc = proj(view(...cam.p));
    for (let s2 = .08; s2 < .92; s2 += .035) {
      const q = [lerp(cam.p[0], j[1][0], s2), lerp(cam.p[1], j[1][1], s2), lerp(cam.p[2], j[1][2], s2)];
      const [x, y, z] = proj(view(...q)), xi = x | 0, yi = y | 0;
      if (xi < 0 || yi < 0 || xi >= g.c || yi >= g.r) continue;
      const k = yi * g.c + xi; if (z < g.z[k] && g.ch[k] === undefined) { g.ch[k] = "·"; g.acc[k] = 1; }
    }
    g.put(pc[0] - 1, pc[1], "[■]", 2); g.put(pc[0] - 1, pc[1] - 1, cam.id, 2);
  }
  g.put(1, 0, `MV-RECON  cams 4  joints 16  pts ${pts.length / 6}`, 0);
  const lbl = `phase: ${phase}`; g.put(g.c - lbl.length - 1, g.r - 1, lbl, 1);
  g.put(1, g.r - 1, "multi-view 3D pose (synthetic)", 0);
};

// multi-camera tracking: bird's-eye view, tracks with steady IDs leave a heat trail
ARTS.tracking = (g, t, st) => {
  if (!st.heat) st.heat = new Float32Array(g.c * g.r);
  const H = st.heat;
  for (let i = 0; i < H.length; i++) H[i] *= .992;
  const zx = Math.floor(g.c * .58), zy = 3, zw = Math.floor(g.c * .34), zh = 8;
  for (let i = 0; i < 6; i++) {
    const w = .23 + i * .037, ph = i * 1.9;
    const x = g.c / 2 + g.c * .42 * Math.sin(t * w + ph) * Math.cos(t * w * .31 + i);
    const y = g.r / 2 + (g.r * .36) * Math.sin(t * w * 1.37 + ph * .7);
    const xi = Math.round(x), yi = Math.round(y);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -2; dx <= 2; dx++) { const xx = xi + dx, yy = yi + dy; if (xx >= 0 && yy >= 0 && xx < g.c && yy < g.r) H[yy * g.c + xx] += .03 / (1 + dx * dx + dy * dy); }
    st["p" + i] = [xi, yi];
  }
  for (let i = 0; i < H.length; i++) g.v[i] = Math.min(.7, H[i] * 2.2);
  // a counting zone
  for (let x = zx; x <= zx + zw; x++) { g.put(x, zy, "-"); g.put(x, zy + zh, "-"); }
  for (let y = zy; y <= zy + zh; y++) { g.put(zx, y, "|"); g.put(zx + zw, y, "|"); }
  g.put(zx, zy, "+"); g.put(zx + zw, zy, "+"); g.put(zx, zy + zh, "+"); g.put(zx + zw, zy + zh, "+");
  let inZone = 0;
  for (let i = 0; i < 6; i++) {
    const [x, y] = st["p" + i];
    if (x > zx && x < zx + zw && y > zy && y < zy + zh) inZone++;
    g.put(x, y, "@", 1); g.put(x + 1, y, String(i + 1), 0);
  }
  g.put(zx + 2, zy, ` zone A: ${inZone} `, 2);
  g.put(1, 0, "BEV  6 tracks  global IDs kept across cams", 0);
};

// Sigma rule generation: a rule types itself out, and its AST grows beside it
const RULE = [
  "title: Suspicious Encoded PowerShell",
  "status: experimental",
  "logsource:",
  "  product: windows",
  "  category: process_creation",
  "detection:",
  "  selection:",
  "    Image|endswith: '\\powershell.exe'",
  "    CommandLine|contains: ' -enc '",
  "  condition: selection",
  "level: high",
];
const AST = ["rule", "├─ meta", "├─ logsource", "│  └─ product", "└─ detection", "   ├─ selection", "   │  ├─ Image", "   │  └─ CmdLine", "   └─ condition"];
ARTS.sigma = (g, t) => {
  const total = RULE.join("").length, prog = (t * 28) % (total + 90);
  let left = prog, row = 1, done = 0;
  for (const line of RULE) {
    if (left <= 0) break;
    const shown = line.slice(0, Math.ceil(left)); left -= line.length;
    const colon = line.indexOf(":");
    for (let k = 0; k < shown.length; k++) g.put(1 + k, row, shown[k], k < colon && shown[k] !== " " ? 1 : 0);
    if (left < 0 && Math.floor(t * 3) % 2) g.put(1 + shown.length, row, "█", 1);
    row++; done++;
  }
  const n = Math.min(AST.length, Math.floor(done / RULE.length * AST.length + .5));
  for (let i = 0; i < n; i++) g.put(g.c - 18, 1 + i, AST[i], i === 0 ? 1 : 0);
  if (prog > total) {
    g.put(1, g.r - 2, "AST parse ✓   halstead 41.2   cyclomatic 2", 2);
  }
  g.put(1, g.r - 1, "LLM draft → AST check → benchmark", 0);
};

// mmWave: delay-and-sum focusing from an 8-element array onto a moving spot; a phantom tumor glows when hit
ARTS.mmwave = (g, t) => {
  const N = 8, ay = g.r - 2, k = 2 * Math.PI / 2.6, ew = [];
  for (let n = 0; n < N; n++) ew.push((g.c / 2 + (n - 3.5) * 3.2) * CHAR_W);
  const fx = (g.c / 2 + g.c * .28 * Math.sin(t * 1.1)) * CHAR_W, fy = (g.r * .38 + 2.5 * Math.sin(t * 1.6)) * LINE_H;
  const tx = g.c * .64 * CHAR_W, ty = g.r * .36 * LINE_H;
  const phase = ew.map((x) => -k * Math.hypot(fx - x, fy - ay * LINE_H));
  for (let y = 1; y < ay; y++) for (let x = 0; x < g.c; x++) {
    const px = x * CHAR_W, py = y * LINE_H;
    let re = 0, im = 0;
    for (let n = 0; n < N; n++) { const a = k * Math.hypot(px - ew[n], py - ay * LINE_H) + phase[n]; re += Math.cos(a); im += Math.sin(a); }
    const I = (re * re + im * im) / (N * N);
    const r0 = Math.hypot(px - g.c / 2 * CHAR_W, py - ay * LINE_H);
    let v = I * (.55 + .45 * Math.cos(k * r0 - t * 5)) * .95;
    const dt = Math.hypot(px - tx, (py - ty) * 1.4);
    if (dt < 1.6) { const hit = Math.exp(-Math.hypot(fx - tx, fy - ty) / 2.5); if (hit > .25) { g.set(x, y, .5 + hit * .5, 1); continue; } v = Math.max(v, .35); }
    g.v[y * g.c + x] = v;
  }
  for (let n = 0; n < N; n++) g.put(Math.round(ew[n] / CHAR_W), ay, "▲", 2);
  g.put(1, 0, "62–69 GHz  8 ch  delay-and-sum focus", 0);
  g.put(1, g.r - 1, "antenna array", 0);
  g.put(g.c - 17, g.r - 1, "phantom tumor ●", 1);
};

// mini MRI: projection reconstruction; spokes fill k-space while the image sharpens
function phantom(u, v) {
  const e = (cx, cy, a, b) => ((u - cx) / a) ** 2 + ((v - cy) / b) ** 2 < 1;
  if (!e(0, 0, .72, .92)) return 0;
  let val = e(0, -.02, .64, .84) ? .55 : 1;
  if (e(.22, 0, .11, .3) || e(-.22, 0, .15, .38)) val = .15;
  if (e(0, .35, .2, .2)) val = .8;
  if (e(0, -.55, .05, .05) || e(-.08, -.6, .04, .04)) val = 1;
  return val;
}
// mini MRI: projection reconstruction. Spokes fill k-space (left), each drawn out from the centre, while the image
// (right) sharpens; one pass takes about five seconds.
const MRI = { SPOKES: 16, RATE: 3.3, HOLD: 2.5 };
MRI.RUN = MRI.SPOKES / MRI.RATE;
ARTS.mri = (g, t) => {
  const { SPOKES: TOTAL, RATE, HOLD, RUN } = MRI;
  const nf = Math.min((t % (RUN + HOLD)) * RATE, TOTAL), done = Math.floor(nf), part = nf - done;
  const frac = 1 - (1 - nf / TOTAL) ** 2;
  const half = Math.floor(g.c / 2), h = g.r - 3, cxk = half / 2, cy = 1 + h / 2;
  const R = Math.min(half / 2 - 1, (h / 2) * LINE_H / CHAR_W);
  for (let s = 0; s <= Math.min(done, TOTAL - 1); s++) {
    const live = s === done && nf < TOTAL, len = live ? R * ease(part) : R;
    const th = s / TOTAL * Math.PI, cs = Math.cos(th), sn = Math.sin(th);
    for (let r = -len; r <= len; r += .5) {
      const x = cxk + r * cs, y = cy + r * sn * CHAR_W / LINE_H, v = .25 + .75 * Math.exp(-Math.abs(r) / R * 3);
      if (live) g.set(Math.round(x), Math.round(y), Math.max(v, .6), 1);
      else g.max(Math.round(x), Math.round(y), v);
    }
  }
  const ox = half + 1, w = g.c - ox - 1, k = Math.max(1, nf);
  for (let y = 1; y <= h; y++) for (let x = 0; x < w; x++) {
    const u = (x / w - .5) * 2.1, v = ((y - 1) / h - .5) * 2.1 * (h * LINE_H) / (w * CHAR_W);
    const ph = phantom(u, v), ang = Math.atan2(v, u);
    const streak = (1 - frac) * .35 * Math.abs(Math.cos(ang * k)) * (Math.hypot(u, v) < 1.1 ? 1 : .4);
    const noise = (1 - frac) * .45 * vnoise(x * .8 + t * .6, y * 1.1 - t * .4);
    g.set(ox + x, y, ph * (.25 + .75 * frac) + streak + noise);
  }
  g.put(1, 0, `k-space (PR)  spokes ${String(Math.min(TOTAL, done)).padStart(2, "0")}/${TOTAL}`, 0);
  g.put(ox, 0, "image (FFT)", 0);
  g.put(1, g.r - 1, "spin echo → gradient encode → k-space → FFT", 0);
  if (nf >= TOTAL) g.put(ox + w - 4, 0, "✓", 2);
};

// mammogram study: texture, a GLCM window sweeping it, features and a classifier score
ARTS.mammo = (g, t) => {
  const mx = g.c * .66, my = g.r * .45;
  const tex = (x, y) => clamp01(fbm(x * .16, y * .3) * .85 + .7 * Math.exp(-(((x - mx) / 6) ** 2 + ((y - my) / 3) ** 2)) - .05);
  for (let y = 0; y < g.r - 2; y++) for (let x = 0; x < g.c; x++) g.v[y * g.c + x] = tex(x, y) * .8;
  const ww = 10, wh = 5, span = g.c - ww - 1, rows = Math.floor((g.r - 3 - wh) / 4) + 1;
  const step = Math.floor(t * 9) % (span * rows), row = Math.floor(step / span), col = step % span;
  const wx = (row % 2 ? span - col : col), wy = 1 + row * 4;
  let s = 0, s2 = 0, d = 0;
  for (let y = 0; y < wh; y++) for (let x = 0; x < ww; x++) { const v = tex(wx + x, wy + y); s += v; s2 += v * v; d += Math.abs(v - tex(wx + x + 1, wy + y)); }
  const m = s / (ww * wh), varr = s2 / (ww * wh) - m * m, contrast = d / (ww * wh) * 4, homog = 1 / (1 + contrast);
  for (let x = wx; x <= wx + ww; x++) { g.put(x, wy, "-", 2); g.put(x, wy + wh, "-", 2); }
  for (let y = wy; y <= wy + wh; y++) { g.put(wx, y, "|", 2); g.put(wx + ww, y, "|", 2); }
  for (const [x, y] of [[wx, wy], [wx + ww, wy], [wx, wy + wh], [wx + ww, wy + wh]]) g.put(x, y, "+", 2);
  const score = clamp01(m * 1.1 + varr * 3);
  g.put(1, g.r - 2, `GLCM  contrast ${contrast.toFixed(2)}  homog ${homog.toFixed(2)}  var ${varr.toFixed(3)}`, 0);
  g.put(1, g.r - 1, "SVM-RBF  p(mass) ", 0);
  const bar = Math.round(score * 20);
  g.put(18, g.r - 1, "█".repeat(bar) + "░".repeat(20 - bar), score > .6 ? 1 : 0);
  g.put(40, g.r - 1, score.toFixed(2), score > .6 ? 1 : 0);
};

// metagenomics: a turning double helix; an attention window slides along the sequence
const PAIR = { A: "T", T: "A", C: "G", G: "C" };
ARTS.metagenomic = (g, t) => {
  const mid = (g.r - 2) / 2 + .5, A = (g.r - 5) / 2, seq = "ATGCGTACCGATTGCAAGCTTGACCGTAGGCTATCGAT";
  const win = Math.floor((t * 6) % (g.c + 16)) - 8;
  for (let x = 0; x < g.c; x++) {
    const ph = x * .32 + t * 1.6, s = Math.sin(ph), z = Math.cos(ph);
    const y1 = Math.round(mid + A * s), y2 = Math.round(mid - A * s);
    const inWin = x >= win && x < win + 8;
    if (x % 3 === 0) {
      const base = seq[(x / 3 + Math.floor(t * .5)) % seq.length], lo = Math.min(y1, y2), hi = Math.max(y1, y2), m = (lo + hi) / 2;
      for (let y = lo + 1; y < hi; y++) g.put(x, y, y < m ? base : PAIR[base], inWin ? 2 : 0); // the base pairs in the window: maroon; the backbone: amber
    }
    g.set(x, y1, .45 + .55 * (z + 1) / 2, inWin ? 1 : 0);
    g.set(x, y2, .45 + .55 * (1 - z) / 2, inWin ? 1 : 0);
  }
  g.put(1, 0, "reads → transformer (CUDA) → enzyme function", 0);
  g.put(1, g.r - 1, `attention window  pos ${String(Math.max(0, win)).padStart(2, "0")}   vs. alignment baseline`, 0);
};

// Fashion-MNIST, CNN vs. LightGBM: a 28×28 garment on the left (drawn in text, two image rows per cell), a 3×3
// convolution window sweeping it while the CNN's class scores fill in, then LightGBM's top-gain pixels marked on the
// same image (maroon) while its scores fill in; the two models' totals at the bottom
const FM_CLASSES = ["T-shirt", "Trouser", "Pullover", "Coat", "Sandal", "Shirt", "Sneaker", "Bag"];
const FM_ITEMS = [ // silhouettes in image space (u, v in 0..1): [name index, inside(u, v)]
  [6, (u, v) => v > .55 && v < .85 && u > .08 && u < .92 && (v > .68 || u > .3 + (.85 - v) * 1.2) && !(v > .8 && u < .2)], // sneaker
  [5, (u, v) => (v > .12 && v < .92 && Math.abs(u - .5) < .27) || (v > .12 && v < .36 && Math.abs(u - .5) < .46)],          // shirt
  [1, (u, v) => v > .05 && v < .95 && Math.abs(u - .5) < .3 && (v < .4 || Math.abs(u - .5) > .05)],                            // trousers
  [7, (u, v) => (v > .3 && v < .9 && Math.abs(u - .5) < .4) || (v > .1 && v <= .3 && Math.abs(Math.abs(u - .5) - .2) < .035)], // bag
];
// which classes each model confuses with which: [true class][scored class] weights
const FM_CONF = (c, k, cnn) => c === k ? 1 : ((c === 5 || c === 2 || c === 3 || c === 0) && (k === 5 || k === 2 || k === 3 || k === 0)) ? (cnn ? .18 : .32) : (c === 6 && k === 4) || (c === 4 && k === 6) ? (cnn ? .1 : .2) : .03;
ARTS.fashion = (g, t) => {
  const CYC = 6, cyc = Math.floor(t / CYC), lt = t % CYC, [cls, inside] = FM_ITEMS[cyc % FM_ITEMS.length];
  const IW = 28, IH = 14, ix = 1, iy = 1; // the image: 28 columns, 14 rows (two image rows per cell)
  const px = (u, v) => inside(u, v) ? .45 + .55 * fbm(u * 9 + cyc * 3, v * 9) : 0;
  const phase = lt < 3 ? 0 : 1, pt = lt % 3; // 0: the CNN looks; 1: LightGBM looks
  for (let r = 0; r < IH; r++) for (let c = 0; c < IW; c++) g.set(ix + c, iy + r, px((c + .5) / IW, (r + .5) / IH) * .9);
  if (phase === 0 && pt < 1.6) { // the 3×3 window, row by row
    const n = Math.floor(pt / 1.6 * IW * IH), wr = Math.floor(n / IW), wc = n % IW;
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { const c = wc + dc, r = wr + dr; if (c >= 0 && c < IW && r >= 0 && r < IH) g.put(ix + c, iy + r, dr === 0 && dc === 0 ? "▣" : "·", 1); }
  }
  if (phase === 1) { // LightGBM's top-gain pixels: where garments and footwear differ in outline
    const top = [[.2, .62], [.5, .58], [.75, .6], [.3, .3], [.6, .25], [.5, .88], [.15, .85], [.85, .4], [.5, .1], [.4, .72]];
    const n = Math.min(top.length, Math.floor(pt / 1.2 * top.length) + 1);
    for (let k = 0; k < n; k++) g.put(ix + Math.floor(top[k][0] * IW), iy + Math.floor(top[k][1] * IH), "+", 2);
  }
  g.put(ix, iy + IH, "28×28", 0); g.put(ix + IW - 5, iy + IH, phase === 0 ? "conv" : "gain", phase === 0 ? 1 : 2);
  // the two score columns
  const x0 = ix + IW + 3, bw = Math.max(6, Math.floor((g.c - x0 - 12) / 2) - 3), xC = x0 + 9, xL = xC + bw + 3;
  g.put(x0, 0, "class", 0); g.put(xC, 0, "CNN", 1); g.put(xL, 0, "LGBM", 2);
  const fill = (model) => { const done = phase > model ? 1 : phase < model ? 0 : clamp01((pt - (model === 0 ? 1.6 : 1.2)) / .8); return done; };
  for (let k = 0; k < FM_CLASSES.length; k++) {
    const y = 1 + k; g.put(x0, y, FM_CLASSES[k], k === cls ? 2 : 0);
    for (const [m, xx] of [[0, xC], [1, xL]]) {
      const w = FM_CONF(cls, k, m === 0), f = fill(m), n = Math.round(w * f * bw);
      if (f > 0) g.put(xx, y, "█".repeat(n) + "░".repeat(bw - n), k === cls && f >= 1 ? (m === 0 ? 1 : 2) : 0);
      else g.put(xx, y, "░".repeat(bw), 0);
    }
  }
  g.put(x0, g.r - 2, "accuracy  CNN 92.3%   LightGBM 89.3%", 0);
  g.put(x0, g.r - 1, "training  CNN 1176 s  LightGBM  446 s", 0);
};
// footer: a walk at night. The view moves right at walking pace through six places: a campfire in the pines, an alpine
// lake in Colorado with golden aspens and an aurora, a Texas ranch (where a saucer takes the cow as she comes into view),
// Aggieland with Kyle Field behind it, a lighthouse on the coast, and a night market in Taipei under 101, then the pines
// again. Far layers move slower than near ones. The walk starts at the campfire the first time the footer comes into
// view, and only goes on while it is on screen.
const COW_PX = [ // a holstein facing left, one cell per entry (cells are tall, so she is drawn twice as wide): W white hide, B black patch, H head, m muzzle, e eye, L leg, u udder, T tail, n horn
  "..nn.n..............",
  ".HHHHH.WWBBBWWWWBBW.",
  "mmHeHHBBWWWBBBWWBBWT",
  "..HHH.BBBWWWWBBWWWWT",
  ".....LL.BB.uu..LL...",
  ".....LL........LL...",
];
const COW_TONE = { W: .95, B: .3, H: .82, m: .62, n: .62, L: .8, T: .55 };
const WALK = { lens: [260, 260, 260, 300, 860, 260, 300], blend: 70 }; // how many columns of the near layer each scene takes; each fades into the next over its last `blend`
WALK.start = WALK.lens.map((_, i) => WALK.lens.slice(0, i).reduce((a, b) => a + b, 0)); WALK.period = WALK.lens.reduce((a, b) => a + b, 0);
// per scene: forest, Colorado, Texas ranch, Big Bend, Aggieland, coast, Taipei
const SC = {
  farH: [4, 6, 2, 9, 2, 2, 4], farAmp: [6, 12, 2, 15, 2, 3, 7], sharp: [.25, 1, 0, 0, 0, 0, .3], snow: [0, 1, 0, 0, 0, 0, 0],
  water: [0, 1, 0, 0, 0, 1, 0], pine: [.6, .5, 0, 0, 0, .15, 0], pineH: [1, .6, .6, 0, .6, .7, 0], oak: [0, 0, .12, 0, .3, 0, 0],
  city: [0, 0, 0, 0, 0, 0, 1], aurora: [.15, .9, 0, 0, 0, 0, 0], milky: [1, .8, 1, 1.25, .6, .8, .3], glow: [0, 0, .1, 0, .4, .15, 1], sand: [0, 0, 1, 1, 0, 0, 0], kyle: [0, 0, 0, 0, 1, 0, 0], road: [0, 0, 0, 0, 1, 0, 1], mesa: [0, 0, 0, 1, 0, 0, 0], rough: [0, 0, 0, 0, 0, 1, 0],
};
const N_SC = SC.farH.length;
const sceneAt = (wx) => { // the two scenes that meet at near-layer column wx, and how far the fade between them has gone
  const P = WALK.period, u = ((wx % P) + P) % P;
  let i = N_SC - 1; while (WALK.start[i] > u) i--;
  const f = u - WALK.start[i], L = WALK.lens[i];
  return [i, (i + 1) % N_SC, f > L - WALK.blend ? ease((f - L + WALK.blend) / WALK.blend) : 0];
};
ARTS.skyline = (g, t, st) => {
  const C = g.c, R = g.r, gy = R - 6, wT = gy - 9; // gy: the row the path is on; wT: the water line of the lake and the sea
  // the walk: time only counts while this is drawn, so it starts at the campfire and resumes where it was left
  if (st.last != null) st.walk += Math.min(.2, Math.max(0, t - st.last)); else st.walk = 0;
  st.last = t;
  const speed = C < 200 ? 4.5 : 7, wX = Math.round(C * .3) /* where the saucer times its visit from */, cam = 170 - C * .62 + st.walk * speed;
  if (!st.s0 || st.s0.length !== C) { st.s0 = new Uint8Array(C); st.s1 = new Uint8Array(C); st.k = new Float32Array(C); st.top = new Float32Array(C); st.h = new Float32Array(C + 2); }
  const S0 = st.s0, S1 = st.s1, K = st.k, TOP = st.top;
  for (let x = 0; x < C; x++) { const s = sceneAt(cam + x); S0[x] = s[0]; S1[x] = s[1]; K[x] = s[2]; }
  const M = (key, x) => { x = x < 0 ? 0 : x >= C ? C - 1 : x | 0; const a = SC[key]; return a[S0[x]] + (a[S1[x]] - a[S0[x]]) * K[x]; };
  // each slower layer decides its scene from its own position, so its mountains and towers slide past whole instead
  // of rising out of the ground as a scene change sweeps across them: column x of a layer moving at f shows the
  // scene that is at the centre of the screen when that column gets there
  const LM = {}, layerMix = (f) => LM[f] || (LM[f] = (() => {
    const s0 = new Uint8Array(C), s1 = new Uint8Array(C), k = new Float32Array(C);
    for (let x = 0; x < C; x++) { const sc = sceneAt(cam + (x - C / 2) / f + C / 2); s0[x] = sc[0]; s1[x] = sc[1]; k[x] = sc[2]; }
    return (key, x) => { x = x < 0 ? 0 : x >= C ? C - 1 : x | 0; const a = SC[key]; return a[s0[x]] + (a[s1[x]] - a[s0[x]]) * k[x]; };
  })());
  const MF = layerMix(.45); // the far hills, the water in front of them, and the sky over them
  const glowAt = (x, y, v) => { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= C || y >= R) return; const i = y * C + x; if (g.ch[i] !== undefined && g.ch[i] !== " " || g.v[i] > .3 && y < gy) return; if (v > g.v[i]) g.v[i] = v; g.acc[i] = 1; };

  /* the sky: a faint haze that thickens toward the horizon, the milky way, stars, an aurora over the mountains */
  const skyX = cam * .03, mwY = (X) => gy * .45 + gy * .35 * Math.sin(X * .011 + 1.3);
  for (let x = 0; x < C; x++) {
    const X = x + skyX, mw = MF("milky", x), au = MF("aurora", x), gl = MF("glow", x), yc = mwY(X), bw = 3 + 3 * vnoise(X * .04, 2.2);
    for (let y = 0; y < gy; y++) {
      const hz = y / gy;
      let v = .02 + .06 * hz * hz * hz + .05 * hz * vnoise(X * .2, y * .7) + gl * .3 * Math.pow(hz, 5);
      const d = (y - yc) / bw;
      if (mw > 0 && d * d < 6) { // the band, with a darker lane of dust through it
        let b = Math.exp(-d * d) * (.3 + .6 * fbm(X * .09, y * .3)) * mw;
        if (vnoise(X * .12, y * .45) > .68) b *= .3;
        v += b * .55;
      }
      if (au > .02 && y < gy * .6) { // curtains that hang from a wavering top edge and fold as they move
        const yt = 1 + 5 * vnoise(X * .025, t * .08), fold = .55 + .45 * Math.sin(X * .45 + 4 * vnoise(X * .02, t * .15));
        if (y >= yt) v += au * Math.exp(-(y - yt) / 6) * fold * (.35 + .65 * vnoise(X * .05 + t * .1, 1.7)) * 1.05;
      }
      g.set(x, y, v);
      const h = hash2(Math.floor(X), y);
      if (h > .982 && v < .35) star(g, x, y, .5 + .5 * Math.sin(t * (1 + h * 3) + X));
    }
  }
  { // the moon, with a few darker seas and a halo
    const mx = Math.round(C * .58), my = Math.max(4, Math.round(gy * .2));
    for (let y = my - 7; y <= my + 7; y++) for (let x = mx - 14; x <= mx + 14; x++) {
      if (y < 0 || x < 0 || x >= C) continue;
      const d = Math.hypot((x - mx) * CHAR_W / LINE_H, y - my);
      if (d < 3.3) g.set(x, y, .97 - .3 * vnoise((x - mx) * .7 + 3, (y - my) * 1.1 + 3), 0);
      else if (d < 6) g.max(x, y, .14 + .16 * (1 - (d - 3.3) / 2.7));
    }
    st.moonX = mx;
  }
  { // a shooting star now and then
    const P = 9, n = Math.floor(t / P), ph = t - n * P;
    if (ph < .8) {
      const sx = hash(n * 3.3) * C * .8, sy = 1 + hash(n * 7.1) * gy * .3, k = ph / .8;
      for (let j = 0; j < 9; j++) { const q = k - j * .02; if (q < 0) break; g.put(Math.round(sx + q * 34), Math.round(sy + q * 8), j ? (j < 4 ? "-" : "·") : "*", j ? 0 : 1); }
    }
  }

  /* far hills and mountains, with snow on the high peaks; they stand on the water line where there is water */
  const farX = cam * .45, H = st.h;
  for (let x = -1; x <= C; x++) {
    const X = x + farX, n = fbm(X * .035, 3.1), r = 1 - Math.abs(2 * fbm(X * .028, 7.7) - 1);
    let hh = MF("farH", x) + MF("farAmp", x) * lerp(n, r * r * 1.15, MF("sharp", x));
    const ms = MF("mesa", x); if (ms > 0) { // mesas: flat caprock tops on sheer cliffs, with talus slopes spreading below them
      const plat = (Xq) => MF("farH", x) + MF("farAmp", x) * (Math.floor((.1 + vnoise(Xq * .022, 5.5) * 1.05) * 5) / 5 + .05 * vnoise(Xq * .2, 1));
      let mh = plat(X); for (let d = -9; d <= 9; d += 3) mh = Math.max(mh, plat(X + d) - 3 - Math.abs(d) * .55);
      hh = lerp(hh, mh, ms); st.cap = st.cap || new Float32Array(C + 2); st.cap[x + 1] = plat(X); }
    H[x + 1] = Math.min(gy - 6, hh);
  }
  for (let x = 0; x < C; x++) {
    const h = H[x + 1], base = lerp(gy - 1, wT, MF("water", x)), top = base - h, slope = H[x + 2] - H[x], snow = MF("snow", x) > .5 && h > MF("farH", x) + MF("farAmp", x) * .5;
    TOP[x] = top;
    for (let y = Math.max(0, Math.ceil(top)); y <= base; y++) {
      const tex = vnoise((x + farX) * .25, y * .35);
      if (MF("mesa", x) > .5) { // caprock, then a cliff face banded with strata, then the talus slope
        const onCap = h <= st.cap[x + 1] + .3, d = y - top;
        if (onCap && d < 1) g.set(x, y, .7, 3);
        else if (onCap && d < 5) g.set(x, y, (d % 2 ? .42 : .55) + .08 * tex - (slope > 0 ? 0 : .06), d % 2 ? 0 : 3);
        else g.set(x, y, .26 + .12 * tex + (hash2(x + Math.floor(farX), y) > .9 ? .12 : 0) + (d < 2 ? .1 : 0), d < 2 ? 3 : 0);
      }
      else if (snow && y - top < 1.5 + 2 * tex) g.set(x, y, slope > 0 ? .88 : .66, 5);
      else g.set(x, y, .4 + .08 * tex + (slope > .15 ? .08 : 0) + (y - top < 1 ? .12 : 0));
    }
  }

  /* the middle distance: two rows of pines, a few round trees, and the city with its needle */
  const tree = (cx, base, hgt, v0, tight) => { // a pine in tiers, widest at each tier's foot
    for (let d = 0; d <= hgt; d++) {
      const y = base - hgt + d, half = d === 0 ? 0 : Math.round(d * .55 * (.6 + .2 * (d % 3)) * tight);
      for (let dx = -half; dx <= half; dx++) g.set(cx + dx, y, v0 + .06 * hash2(cx + dx, y) + (dx < 0 ? .08 : 0) - (Math.abs(dx) === half && half ? .1 : 0));
    }
    g.set(cx, base + 1, v0 * .8);
  };
  for (const [f, gap, scale, v0] of [[.55, 3, .75, .24], [.7, 6, 1, .5]]) { // back row, front row
    const mX = cam * f, ML = layerMix(f);
    for (let k = Math.floor((mX - 10) / gap); k <= (mX + C + 10) / gap; k++) {
      const cx = Math.round(k * gap + hash(k * 1.3) * gap - mX), dens = ML("pine", cx);
      if (hash(k * 1.7 + f) > dens) continue;
      const hgt = Math.round((5 + hash(k * 2.9 + f) * 9) * scale * ML("pineH", cx)); if (hgt < 2) continue;
      tree(cx, Math.round(lerp(gy - 1, wT, ML("water", cx))) - (f < .6 ? 1 : 0), hgt, v0, 1);
    }
    if (f === .7) for (let k = Math.floor((mX - 10) / 9); k <= (mX + C + 10) / 9; k++) { // round trees on the farm
      const cx = Math.round(k * 9 + hash(k * 4.1) * 5 - mX); if (hash(k * 5.3) > ML("oak", cx)) continue;
      const rr = 2 + hash(k * 6.7) * 2, cy = gy - 2 - rr;
      for (let y = Math.floor(cy - rr); y <= cy + rr; y++) for (let dx = -Math.ceil(rr * 2); dx <= rr * 2; dx++) if (Math.hypot(dx / 2, y - cy) < rr) g.set(cx + dx, y, .45 + .25 * hash2(cx + dx, y) + (dx < 0 && y < cy ? .1 : 0));
      for (let y = Math.ceil(cy + rr * .6); y < gy; y++) g.set(cx, y, .6);
    }
  }
  const LIFT = 12; // in Taipei the city stands on a higher line, so the night market in front of it leaves 101 in full view
  { // the city: a far row of towers, a near row with lit windows, the needle, and an elevated highway with traffic
    const win = (x, y, k, lit) => { const on = hash2(x * 1.3 + k, y + Math.floor(t / 7 + hash(k) * 9)) < lit; if (on) g.put(x, y, "▪", hash2(x, y * 3.1) > .82 ? 2 : 1); };
    for (const [f, v0, maxH, lit] of [[.5, .2, .6, .12], [.6, .32, .46, .3]]) {
      const bX = cam * f, ML = layerMix(f);
      let k = Math.floor((bX - 20) / 8);
      for (; k * 8 - bX < C + 20; k++) {
        const x0 = Math.round(k * 8 - bX), w = 5 + Math.floor(hash(k * 3.7 + f) * 7), mid = x0 + (w >> 1);
        const c = ML("city", mid); if (c < .05) continue;
        const base = gy - 1 - Math.round(LIFT * c), hgt = Math.min(base - 4, Math.round((4 + hash(k * 1.9 + f) * (gy * maxH - 4)) * c)), top = base - hgt, crown = hash(k * 8.3 + f);
        for (let x = x0; x < x0 + w; x++) for (let y = top; y <= base; y++) {
          if (x < 0 || x >= C) continue;
          const edge = x === x0 || x === x0 + w - 1;
          g.set(x, y, v0 + (edge ? .08 : 0) + (y === top ? .14 : 0));
          if (!edge && (x - x0) % 2 === 1 && (y - top) % 2 === 1 && y < base) win(x, y, k, lit);
        }
        if (crown > .7) for (let d = 1; d <= 3; d++) for (let x = x0 + d; x < x0 + w - d; x++) g.set(x, top - d, v0 + .1); // a pointed crown
        else if (crown > .55) { g.put(mid, top - 1, "|", 0); g.put(mid, top - 2, "|", 0); if (Math.floor(t * 1.5 + k) % 3 === 0) g.put(mid, top - 3, "•", 2); } // a mast with a red light
      }
    }
    // Taipei 101: a podium that narrows as it rises, eight stacked sections that each flare outward, a crown and a spire
    { // centred on screen when Taipei is, and moving at the speed of its layer
      const P = WALK.period, mid = WALK.start[6] + 120, rep = Math.round((cam + C / 2 - mid) / P);
      const cx = Math.round(C / 2 + (mid + rep * P - cam - C / 2) * .6);
      if (cx > -8 && cx < C + 8 && layerMix(.6)("city", cx) > .4) {
        const base = gy - 1 - LIFT, H = base - 3, spire = 5, crown = 3, podium = Math.max(3, Math.round(H * .18)), seg = Math.max(2, Math.floor((H - spire - crown - podium) / 8));
        const row = (y, half, edge) => { for (let dx = -half; dx <= half; dx++) g.set(cx + dx, y, (dx < 0 ? .62 : .42) + (Math.abs(dx) === half ? (edge ? .3 : .08) : 0)); };
        let y = base;
        for (let k = 0; k < podium; k++, y--) { row(y, 5 - Math.round(k * 2 / podium), 0); if (k % 2) win(cx + 2, y, 200 + k, .6); }
        for (let sct = 0; sct < 8; sct++) for (let k = 0; k < seg; k++, y--) {
          const top = k === seg - 1; row(y, 3 + (top ? 1 : 0), top);
          for (let dx = -2; dx <= 2; dx += 2) if (!top) win(cx + dx, y, 300 + sct * 7 + dx, .55);
        }
        for (let k = 0; k < crown; k++, y--) row(y, 2 - (k === crown - 1 ? 1 : 0), 0);
        for (let k = 0; k < spire; k++, y--) g.put(cx, y, "|", 0);
        g.put(cx, y, Math.floor(t * 2) % 2 ? "•" : "·", 2);
      }
    }
    // the highway: a deck on pillars across the city, amber lamps, and cars both ways (headlights one way, tail lights the other)
    const hy = gy - LIFT - 2;
    const MH = layerMix(.65);
    for (let x = 0; x < C; x++) {
      const c = MH("city", x); if (c < .5) continue;
      const X = Math.round(x + cam * .65);
      g.set(x, hy, .62); g.set(x, hy + 1, .3);
      if (X % 16 === 0) for (let y = hy + 2; y <= gy - LIFT; y++) g.set(x, y, .4);
      if (X % 22 === 0) { g.put(x, hy - 1, "|", 0); g.put(x, hy - 2, "°", 1); glowAt(x - 1, hy - 1, .2); glowAt(x + 1, hy - 1, .2); }
    }
    for (let k = 0; k < 14; k++) { // cars: some drive right with white headlights, others left with red tail lights
      const dir = k % 2 ? 1 : -1, sp = 9 + hash(k * 2.1) * 6, span = C + 80, pos = ((hash(k * 5.9) * span + dir * t * sp - cam * .65) % span + span) % span - 40;
      const x = Math.round(pos), y = hy - 1; if (x < 0 || x >= C - 2 || MH("city", x) < .5) continue;
      if (dir > 0) { g.put(x, y, "▬", 0); g.text(x + 1, y, "•", 2); } // white headlights going right
      else { g.put(x, y, "•", 2); g.put(x + 1, y, "▬", 0); } // red tail lights going left
    }
  }

  const litWinK = (x, y, k, lit) => { if (hash2(x * 1.3 + k, y + Math.floor(t / 7 + hash(k) * 9)) < lit) g.put(x, y, "▪", 1); };
  { // Kyle Field, behind Aggieland: tall stands with maroon deck bands, light banks on top, a glow over the field
    const P = WALK.period, mid = WALK.start[4] + 120, rep = Math.round((cam + C / 2 - mid) / P);
    const cx = Math.round(C / 2 + (mid + rep * P - cam - C / 2) * .6), half = 34, Hs = Math.round(gy * .5);
    if (cx > -half - 8 && cx < C + half + 8 && layerMix(.6)("kyle", cx) > .4) {
      for (let dx = -half; dx <= half; dx++) {
        const x = cx + dx, h = Math.min(Hs, Math.round((half - Math.abs(dx)) * 1.1) + 3), y0 = gy - 1 - h;
        for (let y = y0; y < gy; y++) {
          const r = y - y0;
          if (r === 1 || r === 5 || r === 9) g.set(x, y, .5, 2);
          else g.set(x, y, .3 + (dx < 0 ? .06 : 0) + (r === 0 ? .2 : 0));
          if (r > 1 && r % 4 === 3 && Math.abs(dx) % 3 === 0) litWinK(x, y, 400 + dx, .3);
        }
        if (Math.abs(dx) < half - 6) for (let y = y0 - 6; y < y0; y++) g.max(x, y, .1 + .1 * (y - y0 + 6) / 6);
      }
      for (const lx of [-26, -10, 10, 26]) { const top = gy - 1 - Hs; g.put(cx + lx, top - 1, "│", 0); g.put(cx + lx, top - 2, "│", 0); g.text(cx + lx - 2, top - 3, "▪▪▪▪▪", 2); g.text(cx + lx - 2, top - 4, "▪▪▪▪▪", 2); }
    }
  }

  /* water: the lake and the sea, with the far shore mirrored in it and a path of moonlight */
  const sea = cam * .8;
  for (let x = 0; x < C; x++) {
    const w = MF("water", x); if (w < .02) continue;
    const top = Math.round(lerp(gy, wT, ease(Math.min(1, w * 1.4)))), X = x + sea, rough = MF("rough", x) > .5;
    for (let y = top + 1; y < gy; y++) {
      const ripple = Math.sin(y * 2.1 + X * .35 + t * (rough ? 2.2 : 1.1)), ym = 2 * wT - y + 1, xs = Math.round(x + ripple * (rough ? 1.2 : .6));
      let v = .13 + .05 * ripple;
      if (xs >= 0 && xs < C && ym >= TOP[xs] && ym <= wT) v = .38 + .06 * ripple; // the far shore, upside down
      g.set(x, y, v);
      if (Math.abs(x - st.moonX) < 2 + (y - wT) * .9 && hash2(x, y + Math.floor(t * 3)) > .45) g.put(x, y, ripple > 0 ? "~" : "-", 0), g.tone[y * C + x] = 2; // moonlight
      else if (rough && hash2(Math.floor(X + t * (1 + .5 * (y - wT))), y) > .8) g.put(x, y, hash2(x, y) > .5 ? "~" : "-", 0);
    }
  }

  /* the ground: a path, and earth (or sand, on the ranch) below it, denser toward the front */
  for (let x = 0; x < C; x++) {
    const X = x + cam, sand = M("sand", x), c = M("city", x);
    if (M("road", x) > .5) { // a sidewalk, two lanes of asphalt with a dashed line between them
      for (let y = gy; y < R; y++) g.set(x, y, y === gy ? .5 + .05 * vnoise(X * .5, 0) : y === gy + 1 ? .3 : .1 + .04 * hash2(Math.floor(X), y));
      if (gy + 3 < R && ((Math.floor(X) % 8) + 8) % 8 < 4) g.put(x, gy + 3, "─", 1);
      continue;
    }
    for (let y = gy; y < R; y++) {
      const dpt = (y - gy) / (R - gy), n = vnoise(X * .5, y * .9);
      if (sand > .5) { const dune = Math.sin(X * .05 + y * .8 + 1.5 * vnoise(X * .03, 1)) * .5 + .5; g.set(x, y, y === gy ? .46 : .28 + .25 * dpt + .2 * dune, dune > .62 ? 3 : 0); }
      else g.set(x, y, y === gy ? .46 + .06 * n : .24 + .3 * dpt + .14 * vnoise(X * .15, y * .5) + (hash2(Math.floor(X), y) > .93 ? .15 : 0));
    }
    if (sand < .5 && c < .5 && M("water", x) < .9 && hash(Math.floor(X) * 1.7) > .78) g.put(x, gy - 1, hash(Math.floor(X) * 3.3) > .5 ? "," : "'", 0); // tufts of grass
  }

  /* things along the way, placed in near-layer columns inside each scene */
  const litWin = (x, y, k, lit) => { if (hash2(x * 1.3 + k, y + Math.floor(t / 7 + hash(k) * 9)) < lit) g.put(x, y, "▪", hash2(x, y * 3.1) > .82 ? 2 : 1); };
  const lamp = (lx) => { for (let y = gy - 8; y < gy; y++) g.put(lx, y, "│", 0); g.put(lx, gy - 9, "┌", 0); g.put(lx + 1, gy - 9, "▀", 1); for (let y = gy - 8; y < gy; y++) for (let dx = 0; dx <= 1 + (y - gy + 8) * .5; dx++) glowAt(lx + 1 + dx, y, .12 + .1 * (y - gy + 8) / 8); };
  const cactus = (cx) => { for (let y = gy - 6; y < gy; y++) g.set(cx, y, .7); for (const [dx, dy] of [[-1, 3], [-2, 3], [-2, 4], [1, 4], [2, 4], [2, 5]]) g.set(cx + dx, gy - dy, .6); };
  for (let rp = Math.floor((cam - 500) / WALK.period); rp <= Math.floor((cam + C + 40) / WALK.period); rp++) for (let s = 0; s < N_SC; s++) {
    const X0 = rp * WALK.period + WALK.start[s] - cam; // screen column where this scene starts
    if (X0 > C + 40 || X0 + WALK.lens[s] < -40) continue;
    const at = (f) => Math.round(X0 + f);
    if (s === 0) { // the camp: a tent with a lamp inside, a fire in a ring of stones, sparks, a log to sit on
      const tx = at(140), th = 9;
      for (let d = 0; d < th; d++) {
        const y = gy - th + d, half = Math.round(d * 1.15) + 1;
        for (let dx = -half; dx <= half; dx++) {
          const door = d > 3 && Math.abs(dx) <= d - 4;
          if (Math.abs(dx) === half) g.put(tx + dx, y, dx < 0 ? "/" : "\\", 3);
          else if (door) g.set(tx + dx, y, .3 + .2 * (.5 + .5 * Math.sin(t * 7 + d)), 1);
          else g.set(tx + dx, y, .62 + .06 * hash2(dx, y) - (dx > 0 ? .14 : 0), 3);
        }
      }
      g.put(tx, gy - th - 1, "^", 3);
      const fx = at(170);
      for (let dx = -4; dx <= 4; dx++) g.put(fx + dx, gy - 1, Math.abs(dx) === 4 ? "●" : Math.abs(dx) > 1 ? "▄" : "▀", Math.abs(dx) === 4 ? 5 : 3);
      for (let d = 1; d <= 9; d++) { // the flames: a flickering column, amber at the heart and red at the edges
        const y = gy - 1 - d;
        for (let dx = -5; dx <= 5; dx++) {
          const f = fbm((fx + dx) * .6 + 9, y * .7 + t * 4.5) + .12 - d * .07 - Math.abs(dx) * .1;
          if (f > .2) g.set(fx + dx, y, Math.min(1, .5 + f), f > .38 && Math.abs(dx) < 3 ? 1 : 2);
        }
      }
      for (let k = 0; k < 7; k++) { const q = (t * .55 + hash(k) ) % 1, y = Math.round(gy - 7 - q * 10), x = Math.round(fx + Math.sin(t * 2 + k * 2.3) * 2 * q + (hash(k * 3) - .5) * 4); g.put(x, y, q < .5 ? "*" : "·", q < .5 ? 1 : 2); }
      for (let y = gy - 8; y <= gy + 1; y++) for (let dx = -18; dx <= 18; dx++) { // firelight on everything near
        const d = Math.hypot(dx / 2.2, (y - gy + 2) * 1.1); if (d < 8 && hash2(fx + dx, y + Math.floor(t * 8)) < 1 - d / 8) { const i = y * C + fx + dx; if (fx + dx >= 0 && fx + dx < C && y >= 0 && y < R && !g.acc[i] && (y >= gy || g.v[i] < .3)) g.acc[i] = 1; }
      }
      const lx = at(190); for (let dx = 0; dx < 9; dx++) g.put(lx + dx, gy - 1, dx === 0 || dx === 8 ? "◖◗"[dx ? 1 : 0] : "▬", 3);
    }
    if (s === 1) { // Colorado: an alpine lake under the peaks, golden aspens, a jetty on posts, a rowboat, reeds by the path
      for (const f of [26, 40, 55, 186, 200, 218]) { // aspens: white trunks with dark marks, leaves turned gold
        const ax = at(f), ah = 6 + Math.round(hash(f) * 3), cy = gy - ah - 2, rr = 2 + hash(f * 3) * 1.2;
        for (let y = gy - ah; y < gy; y++) { g.put(ax, y, hash2(f, y) > .75 ? "╪" : "│", 0); g.tone[y * C + ax] = 2; }
        for (let y = Math.floor(cy - rr); y <= cy + rr; y++) for (let dx = -Math.ceil(rr * 2); dx <= rr * 2; dx++) if (Math.hypot(dx / 2, y - cy) < rr && hash2(ax + dx, y) > .12) g.set(ax + dx, y, .5 + .35 * hash2(ax + dx, y + f) * (.75 + .25 * Math.sin(t * 1.5 + dx + f)), 1);
      }
      const jx = at(100); for (let dx = 0; dx < 34; dx++) { g.put(jx + dx, gy - 3, "▬", 3); if (dx % 6 === 0) for (let y = gy - 2; y < gy; y++) g.put(jx + dx, y, "|", 3); }
      const bx = at(165), by = wT + 3 + Math.round(Math.sin(t * 1.3) * .5);
      g.put(bx, by, "\\▄▄▄▄▄▄/", 3); g.put(bx + 3, by - 1, "/", 0);
      for (let dx = -2; dx <= 9; dx++) g.put(bx + dx, by + 1, Math.floor(t * 2 + dx) % 3 ? "-" : "~", 0);
      for (let k = 0; k < 14; k++) { const x = at(20 + hash(k * 9.1) * 200); const hgt = 1 + Math.floor(hash(k * 2.7) * 3); for (let y = gy - hgt; y < gy; y++) g.put(x, y, y === gy - hgt ? (Math.sin(t + k) > 0 ? ")" : "(") : "|", 0); }
    }
    if (s === 2) { // a Texas ranch: a barn with a star, a windmill, the Lone Star flag, a pumpjack, cactus, a fence, and the cow
      const bx = at(26), bw = 22, wallTop = gy - 7;
      for (let x = bx; x < bx + bw; x++) for (let y = wallTop; y < gy; y++) g.set(x, y, (x - bx) % 3 === 0 ? .42 : .55, 2);
      [0, 1, 3, 6, 9].forEach((in1, d) => { for (let x = bx + in1 - 1; x <= bx + bw - in1; x++) g.set(x, wallTop - 1 - d, d === 4 ? .7 : .45 + (x - bx < bw / 2 ? .1 : 0), 2); }); // a gambrel roof
      const dx0 = bx + 7; // the doors, with their cross braces
      for (let y = gy - 5; y < gy; y++) for (let x = dx0; x < dx0 + 8; x++) g.set(x, y, .25, 2);
      for (let i = 0; i < 5; i++) { g.put(dx0 + Math.round(i * 1.75), gy - 5 + i, "\\", 0); g.put(dx0 + 7 - Math.round(i * 1.75), gy - 5 + i, "/", 0); }
      for (let x = dx0; x < dx0 + 8; x++) g.put(x, gy - 6, "▬", 0);
      g.put(bx + 10, wallTop - 3, "▪▪", 1); g.text(bx + 18, wallTop + 1, "★", 2);
      const mx = at(86), mh = 15, hub = gy - 1 - mh; // the windmill: a lattice tower and four turning blades
      for (let d = 0; d < mh; d++) { const y = gy - 1 - d, half = Math.round((mh - d) * .22) + 1; g.put(mx - half, y, "/", 0); g.put(mx + half, y, "\\", 0); if (d % 4 === 2) for (let x = mx - half + 1; x < mx + half; x++) g.put(x, y, "-", 0); }
      g.put(mx + 1, hub, "▶", 0);
      for (let b = 0; b < 4; b++) { const a = t * 1.3 + b * Math.PI / 2; for (let r = 1; r <= 6; r++) g.set(mx + Math.round(Math.cos(a) * r * 2), hub + Math.round(Math.sin(a) * r), r > 2 ? .85 : .6); }
      g.set(mx, hub, 1);
      { // the Lone Star flag: a blue bar with a white star at the hoist, white over red, waving
        const fx = at(114), ft = gy - 13;
        for (let y = ft; y < gy; y++) g.put(fx, y, "│", 0);
        for (let c = 1; c <= 10; c++) { const w = Math.round(Math.sin(t * 3 - c * .6) * .6 * (c / 10)); for (let r = 0; r < 4; r++) { const y = ft + r + w; if (c <= 3) g.set(fx + c, y, .55); else if (r < 2) g.set(fx + c, y, .95); else g.set(fx + c, y, .6, 2); } }
        g.text(fx + 2, ft + 1 + Math.round(Math.sin(t * 3 - 1.2) * .1), "★", 2);
      }
      { // a pumpjack nodding: an A-frame, a walking beam with the horse head, a crank with its counterweight
        const px = at(200), base = gy - 1, ph = t * 1.6, a = .3 * Math.sin(ph), py = base - 7, yAt = (i) => py - Math.round(i * Math.tan(a) * CHAR_W / LINE_H * 1.9);
        for (let x = px - 11; x <= px + 13; x++) g.set(x, base, .5);
        for (let d = 1; d <= 6; d++) { g.put(px - 3 + (d >> 1), base - d, "/", 0); g.put(px + 3 - (d >> 1), base - d, "\\", 0); }
        for (let i = -9; i <= 10; i++) g.set(px + i, yAt(i), .8);
        const hy = yAt(11); for (let r = -1; r <= 2; r++) { g.set(px + 11, hy + r, .85); if (r < 2) g.set(px + 12, hy + r, .7); }
        for (let y = hy + 3; y < base; y++) g.put(px + 11, y, "|", 0);
        const kx = px - 8 + Math.round(Math.cos(ph) * 3), ky = base - 2 + Math.round(Math.sin(ph) * 1.2);
        g.set(kx, ky, .75); g.set(kx + 1, ky, .75); g.set(px - 8, base - 2, .5);
        const ey = yAt(-9); for (let k = 1; k < 6; k++) g.put(Math.round(lerp(kx, px - 9, k / 6)), Math.round(lerp(ky, ey, k / 6)), "·", 0);
      }
      cactus(at(70)); cactus(at(236)); cactus(at(250));
      // the cow, and the saucer that comes for her, timed by where she is on screen
      const cx = at(150), q = (cx - wX) / Math.max(40, C - wX);
      let ux = null, uy = 2, beam = 0, cowY = gy - 1, cowOn = q > .38, flip = false;
      if (q < .92 && q >= .7) { const u = ease((.92 - q) / .22); ux = cx + 50 * (1 - u); uy = -2 + 4 * u; }
      else if (q < .7 && q >= .64) { ux = cx; beam = (.7 - q) / .06; }
      else if (q < .64 && q >= .42) { ux = cx; beam = 1; const u = ease((.64 - q) / .22); cowY = gy - 1 - (gy - 1 - 4) * u; flip = u > .5 && u < .8; }
      else if (q < .42 && q >= .38) { ux = cx; beam = (q - .38) / .04; }
      else if (q < .38 && q > .15) { const u = (.38 - q) / .23; ux = cx + (C + 20 - cx) * u * u; uy = 2 - 3 * u; }
      if (ux !== null) uy += Math.sin(t * 2) * .4;
      if (beam > 0 && ux !== null) { const top = Math.round(uy) + 2, span = Math.round((gy - 1 - top) * beam); for (let y = top; y <= top + span; y++) { const half = 1 + (y - top) * .6; for (let dx = -Math.floor(half); dx <= half; dx++) glowAt(Math.round(ux) + dx, y, (.3 + .2 * hash2(dx, y + Math.floor(t * 10))) * (1 - .5 * Math.abs(dx) / (half + 1))); } }
      if (cowOn) {
        const rows = flip ? [...COW_PX].reverse() : COW_PX, top = Math.round(cowY) - 5, left = cx - 10, chew = Math.floor(t * 1.5) % 2 && ux === null;
        for (let r = 0; r < rows.length; r++) for (let k = 0; k < rows[r].length; k++) {
          const c = rows[r][k]; if (c === ".") continue;
          const X = left + k, Y = top + r + (chew && k < 6 && r > 0 ? 1 : 0);
          if (c === "e") { g.set(X, Y, .82); g.put(X, Y, "o", 0); continue; }
          if (c === "u") { g.set(X, Y, .6, 2); continue; }
          g.set(X, Y, COW_TONE[c]);
        }
      }
      if (ux !== null) { const X = Math.round(ux), Y = Math.round(uy); for (let dx = -1; dx <= 1; dx++) g.set(X + dx, Y - 1, .7); for (let dx = -5; dx <= 5; dx++) g.set(X + dx, Y, Math.abs(dx) === 5 ? .5 : .95); for (let dx = -3; dx <= 3; dx += 2) g.put(X + dx, Y + 1, "▪", (Math.floor(t * 6) + dx) % 4 === 0 ? 2 : 1); }
      for (let f = 6; f < 214; f++) { const x = at(f); if (x < 0 || x >= C) continue; if (f % 6 === 0) { g.put(x, gy - 3, "┬", 3); g.put(x, gy - 2, "│", 3); g.put(x, gy - 1, "│", 3); } else { g.put(x, gy - 3, "─", 3); g.put(x, gy - 2, "─", 3); } }
    }
    if (s === 3) { // Big Bend: the Rio Grande winding past, prickly pear and ocotillo, Balanced Rock under the darkest sky
      for (let ff = 0; ff < 230; ff++) { // the river, sliding in and out along the near bank
        const x = at(ff); if (x < 0 || x >= C) continue;
        const wv = Math.sin(ff * .035) * 1.5, y0 = Math.round(gy - 4 + wv), wdt = 2 + (Math.sin(ff * .07) > 0 ? 1 : 0);
        for (let y = y0; y < y0 + wdt && y < gy; y++) { g.set(x, y, .3 + .06 * Math.sin(ff * .5 + t * 1.5 + y)); if (hash2(Math.floor(ff + t * 1.2), y) > .72) { g.put(x, y, "~", 0); g.tone[y * C + x] = 2; } }
        if (hash(ff * 1.3) > .7) g.put(x, y0 - 1, hash(ff) > .5 ? "," : "ⁱ", 0);
      }
      { // Balanced Rock: two standing boulders, a cap stone, and the big one resting across them
        const bx = at(150), stone = (cx, cy, rx, ry, k) => { for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) { const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2; if (d <= 1) g.set(x, y, (x < cx ? .8 : .56) + .1 * vnoise(x * .4 + k, y * .6) - (y > cy + ry * .5 ? .14 : 0) - (d > .75 ? .14 : 0), 3); } };
        stone(bx - 7, gy - 5.5, 3, 5, 1); stone(bx - 8, gy - 11.6, 2.2, 1.3, 2); stone(bx + 8, gy - 4.2, 3.2, 3.6, 3);
        stone(bx + 2, gy - 11.2, 9, 2.6, 4); stone(bx + 17, gy - 2, 6, 2.5, 5); stone(bx - 16, gy - 2, 5, 2, 6); stone(bx + 1, gy - 1, 2.5, 1, 7);
      }
      const pear = (px, k) => { // a prickly pear: oval pads stacked on each other, spines, a few red fruit
        const pads = [[0, -2], [-4, -4], [4, -4], [-1, -6], [6, -7], [-6, -7]].slice(0, 3 + Math.floor(hash(k) * 4));
        for (const [dx, dy] of pads) { const cx = px + dx, cy = gy - 1 + dy; for (let y = cy - 1; y <= cy + 1; y++) for (let x = cx - 2; x <= cx + 2; x++) if (((x - cx) / 2.4) ** 2 + ((y - cy) / 1.4) ** 2 <= 1) { if (hash2(x, y + k) > .78) g.put(x, y, "·", 3); else g.set(x, y, .55 + .2 * hash2(x, y) - (x > cx ? .1 : 0)); } if (hash2(dx, k) > .6) g.put(cx + 1, cy - 2, "●", 2); }
      };
      const ocotillo = (ox, k) => { // thin whip-like stems fanning out, red flowers at the tips
        for (let st = -3; st <= 3; st++) { const lean = st * .45, hgt = 7 + Math.round(hash(k + st) * 4); for (let d = 0; d < hgt; d++) { const x = Math.round(ox + lean * d * .6 + Math.sin(t * .8 + st + d * .3) * .3 * d / hgt); g.put(x, gy - 1 - d, Math.abs(lean) < .2 ? "|" : lean > 0 ? "/" : "\\", 0); } g.put(Math.round(ox + lean * hgt * .6), gy - 1 - hgt, "•", 2); }
      };
      pear(at(42), 1); pear(at(96), 2); pear(at(205), 3); pear(at(238), 4);
      ocotillo(at(70), 5); ocotillo(at(122), 6); ocotillo(at(186), 7);
      for (let ff = 0; ff < 250; ff += 7) if (hash(ff * 3.3) > .5) { const x = at(ff + hash(ff) * 5); g.set(x, gy - 1, .35); g.set(x + 1, gy - 1, .3); g.put(x + 2, gy - 1, "ⁱ", 0); } // creosote and scrub
    }
    if (s === 4) { // Aggieland: the water tower that says so, Rudder Tower, the administration building and its columns, lamps
      const tx = at(52), tw = 6, th = Math.min(gy - 5, 14), tb = gy - 1;
      for (let d = 0; d < th; d++) for (let dx = -tw; dx <= tw; dx++) g.set(tx + dx, tb - d, (dx < -2 ? .93 : dx < 3 ? .82 : .62) - (Math.abs(dx) === tw ? .14 : 0));
      for (let d = 0; d < 3; d++) { const half = tw - 1 - d * 2; for (let dx = -half; dx <= half; dx++) g.set(tx + dx, tb - th - d, .86 - d * .06); }
      const ty = tb - th + 3; g.put(tx - 5, ty, "WELCOME TO", 2); g.put(tx - 4, ty + 2, "AGGIELAND", 2);
      const rx = at(112), rw = 4, rh = Math.min(gy - 7, 22); // Rudder Tower: windows in bands, a wider cap, masts and a dish
      for (let d = 0; d < rh; d++) { const y = gy - 1 - d; for (let dx = -rw; dx <= rw; dx++) g.set(rx + dx, y, .42 + (dx < 0 ? .14 : 0) + (Math.abs(dx) === rw ? .08 : 0)); if (d > 1 && d < rh - 2 && d % 2 === 0) for (let dx = -rw + 1; dx < rw; dx++) litWin(rx + dx, y, 70 + dx, .35); }
      for (let d = 0; d < 2; d++) for (let dx = -rw - 1; dx <= rw + 1; dx++) g.set(rx + dx, gy - 1 - rh - d, .66 - d * .1);
      g.put(rx - 3, gy - 2 - rh - 2, "|", 0); g.put(rx - 3, gy - 2 - rh - 3, "|", 0); g.put(rx + 2, gy - 2 - rh - 2, "|", 0); g.put(rx + 2, gy - 2 - rh - 3, "|", 0); g.put(rx + 2, gy - 2 - rh - 4, Math.floor(t * 1.5) % 2 ? "•" : "·", 2); g.put(rx - 1, gy - 2 - rh - 2, "◖", 0);
      const ax = at(150), aw = 36, ah = 8; // the administration building: a cornice, a colonnade, steps, a small dome behind
      for (let y = gy - ah; y < gy; y++) for (let x = ax; x < ax + aw; x++) g.set(x, y, .5 + (x < ax + aw / 2 ? .06 : 0));
      for (let x = ax - 1; x <= ax + aw; x++) { g.set(x, gy - ah - 1, .72); g.set(x, gy - ah - 2, .4); }
      for (let x = ax + 7; x < ax + aw - 7; x++) for (let y = gy - 6; y < gy - 1; y++) { if ((x - ax - 7) % 3 === 0) { g.put(x, y, "║", 0); g.tone[y * C + x] = 2; } else g.set(x, y, .22); }
      for (let x = ax + 5; x < ax + aw - 5; x++) g.set(x, gy - 1, .68);
      for (const wx0 of [ax + 2, ax + aw - 6]) for (let y = gy - 6; y < gy - 1; y += 2) for (let x = wx0; x < wx0 + 4; x += 2) litWin(x, y, 90 + x - wx0, .5);
      for (let d = 0; d < 3; d++) { const half = 5 - d * 2; for (let dx = -half; dx <= half; dx++) g.set(ax + aw / 2 + dx, gy - ah - 3 - d, .55 - d * .05); }
      for (const f of [20, 82, 136]) lamp(at(f));
      const car = (x, y, dir, lit, k) => { // two rows: the cabin, then the body with its lights at the ends
        const tone = .5 + .3 * hash(k * 3.3), acc = [0, 0, 2, 5, 3][Math.floor(hash(k * 7.1) * 5)];
        for (let dx = 2; dx <= 4; dx++) g.set(x + dx, y - 1, dx === (dir > 0 ? 4 : 2) ? .25 : tone - .1, acc);
        for (let dx = 0; dx <= 6; dx++) g.set(x + dx, y, tone, acc);
        if (lit) { g.text(x + (dir > 0 ? 6 : 0), y, "•", 2); g.put(x + (dir > 0 ? 0 : 6), y, "•", 2); if (dir > 0) glowAt(x + 7, y, .2), glowAt(x + 8, y, .14); else glowAt(x - 1, y, .2), glowAt(x - 2, y, .14); }
      };
      // along the road: places to eat, each drawn after its building (names as plain text, no logos)
      const rect = (x0, y0, x1, y1, v, acc = 0) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) g.set(x, y, typeof v === "function" ? v(x, y) : v, acc); };
      const glass = (x0, y0, x1, y1, step = 4) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { if ((x - x0) % step === step - 1) g.put(x, y, "│", 0); else { g.set(x, y, 0); glowAt(x, y, .24 + .1 * hash2(x, y)); } } };
      const person = (x, sway) => { g.set(x + sway, gy - 4, .9); for (let y = gy - 3; y < gy; y++) g.set(x, y, .5 + (y === gy - 3 ? .1 : 0)); };
      const mid = (x, l) => x - (l.length >> 1);
      // utility poles along the street, wires sagging between them
      const poles = []; for (let f = 6; f < 840; f += 40 + Math.floor(hash(f * .37) * 14)) poles.push(f);
      poles.forEach((f, i) => {
        const x = at(f); for (let y = gy - 17; y < gy; y++) g.put(x, y, "│", 0); g.put(x - 2, gy - 17, "─┼─", 0); g.put(x - 1, gy - 16, "▫", 0);
        const nx = poles[i + 1]; if (nx === undefined) return;
        for (let ff = f + 1; ff < nx; ff++) { const u = (ff - f) / (nx - f), sag = Math.round(Math.sin(u * Math.PI) * 2), xx = at(ff); for (const off of [-2, 2]) { const yy = gy - 17 + sag; if (xx + off * 0 >= 0 && xx < C && g.ch[yy * C + xx] === undefined && g.v[yy * C + xx] < .3) g.put(xx, yy + (off > 0 ? 1 : 0), "‾", 0); } }
      });
      { // McDonald's: a stone front, a metal parapet with the name, a yellow awning over the windows, a pole sign by the road
        const x0 = at(214), w = 30;
        for (let y = gy - 22; y < gy; y++) g.put(x0, y, "│", 0);
        rect(x0 - 6, gy - 25, x0 + 6, gy - 23, (x, y) => (y === gy - 24 && Math.abs(x - x0) < 6 ? .08 : .6), 2);
        g.text(x0 - 5, gy - 24, "McDonald's", 2);
        const b0 = x0 + 6;
        rect(b0, gy - 8, b0 + w, gy - 1, (x, y) => .42 + .22 * hash2(Math.floor(x / 2), y) - (x > b0 + w * .6 ? .08 : 0), 3);
        rect(b0 + 2, gy - 11, b0 + w - 4, gy - 9, (x, y) => (y === gy - 11 ? .62 : .48), 5);
        g.text(mid(b0 + w / 2 - 1, "McDonald's"), gy - 10, "McDonald's", 2);
        rect(b0 + 2, gy - 6, b0 + 19, gy - 6, .82, 1); rect(b0 + 23, gy - 6, b0 + w - 1, gy - 6, .82, 1);
        glass(b0 + 3, gy - 5, b0 + 18, gy - 2, 4); glass(b0 + 24, gy - 5, b0 + w - 2, gy - 2, 3);
        rect(b0 + 20, gy - 5, b0 + 22, gy - 1, .22);
        rect(b0, gy - 1, b0 + w, gy - 1, .38, 2);
      }
      { // Raising Cane's: a cream tower with the name, a red fin by the door, a brick dining room, a patio with umbrellas
        const x0 = at(272);
        rect(x0, gy - 13, x0 + 13, gy - 1, (x) => (x < x0 + 7 ? .84 : .74)); rect(x0 - 1, gy - 14, x0 + 14, gy - 14, .4);
        g.put(x0 + 3, gy - 11, "Raising", 1); g.put(x0 + 3, gy - 10, "Cane's", 2); g.put(x0 + 3, gy - 9, "CHICKEN", 4);
        rect(x0, gy - 7, x0 + 9, gy - 7, .3); g.put(x0 + 2, gy - 8, "\\", 0); g.put(x0 + 8, gy - 8, "/", 0);
        glass(x0 + 3, gy - 6, x0 + 7, gy - 1, 3);
        rect(x0 + 11, gy - 9, x0 + 13, gy - 1, .7, 2);
        rect(x0 + 14, gy - 10, x0 + 32, gy - 1, (x, y) => .36 + ((x + (y % 2) * 2) % 4 === 0 ? -.1 : .08), 4); rect(x0 + 14, gy - 11, x0 + 32, gy - 11, .3);
        glass(x0 + 16, gy - 7, x0 + 30, gy - 3, 5);
        rect(x0 + 30, gy - 9, x0 + 46, gy - 9, .32);
        for (const [ux, red] of [[x0 + 35, 1], [x0 + 42, 0]]) { rect(ux - 3, gy - 6, ux + 3, gy - 6, red ? .7 : .4, red ? 2 : 0); rect(ux - 2, gy - 7, ux + 2, gy - 7, red ? .62 : .36, red ? 2 : 0); for (let y = gy - 5; y < gy; y++) g.put(ux, y, "│", 0); g.put(ux - 2, gy - 2, "┬", 0); g.put(ux + 2, gy - 2, "┬", 0); }
        person(x0 + 39, Math.round(Math.sin(t) * .4));
      }
      { // Andy's Frozen Custard: a wide white butterfly canopy with red trim on white posts, a line under it, the kiosk behind
        const x0 = at(332), w = 40, cm = x0 + w / 2;
        rect(x0, gy - 10, x0 + 23, gy - 1, .05); // the shade under the canopy
        rect(x0 + 24, gy - 8, x0 + w - 3, gy - 1, .74); glass(x0 + 26, gy - 6, x0 + w - 5, gy - 2, 4);
        for (let dx = 0; dx <= w; dx++) {
          const x = x0 + dx, y = gy - 11 - Math.round(Math.abs(dx - w / 2) / (w / 2) * 3);
          g.set(x, y, .92); g.set(x, y + 1, .6);
          if (Math.abs(dx - w / 2) > 7) g.set(x, y - 1, .66, 2);
          if (dx % 5 === 2) g.put(x, y + 2, "·", 1);
        }
        for (const dx of [3, 20, 37]) for (let y = gy - 10; y < gy; y++) g.put(x0 + dx, y, "│", 0), g.tone[y * C + x0 + dx] = 2;
        g.put(mid(cm, "Andy's"), gy - 8, "Andy's", 1); g.text(mid(cm, "Frozen Custard"), gy - 7, "Frozen Custard", 2);
        for (let k = 0; k < 5; k++) person(x0 + 7 + k * 3, Math.round(Math.sin(t * 1.3 + k) * .4));
        for (let dx = 0; dx <= w; dx++) g.put(x0 + dx, gy - 2, dx % 6 ? "─" : "┬", 2);
      }
      { // Aroma: a strip-mall front, a standing-seam metal roof, the sign, glass with food posters along the bottom, an OPEN sign
        const x0 = at(404), w = 34;
        for (let d = 0; d < 3; d++) for (let x = x0 + d; x <= x0 + w - d; x++) { g.put(x, gy - 11 - d, (x - x0) % 2 ? "║" : "▌", 5); }
        rect(x0 - 1, gy - 10, x0 + w + 1, gy - 8, .14);
        g.text(mid(x0 + w / 2, "AROMA"), gy - 10, "AROMA", 2);
        g.text(mid(x0 + w / 2, "INDIAN & NEPALESE CUISINE"), gy - 9, "INDIAN & NEPALESE CUISINE", 2);
        rect(x0, gy - 7, x0 + w, gy - 7, .55);
        for (let y = gy - 6; y < gy; y++) for (let x = x0 + 1; x < x0 + w; x++) {
          if ((x - x0) % 6 === 0) { g.put(x, y, "│", 0); continue; }
          if (y >= gy - 2) g.set(x, y, .5 + .3 * hash2(x, y), [1, 2, 3][Math.floor(hash2(Math.floor(x / 3), 7) * 3)]); // food posters
          else g.set(x, y, .12 + .06 * hash2(x, y));
        }
        rect(x0 + w - 8, gy - 6, x0 + w - 4, gy - 1, .2);
        g.put(x0 + w - 8, gy - 4, "OPEN", Math.floor(t * 1.2) % 4 ? 2 : 1);
      }
      { // Whataburger: an A-frame in orange and white stripes, a glass entry at the foot, a tall sign by the road, a flag
        const ax = at(500), H = 16;
        for (let d = 0; d < H; d++) {
          const y = gy - 1 - d, half = Math.round((H - d) * 1.05);
          for (let dx = -half; dx <= half; dx++) {
            const edge = half - Math.abs(dx);
            if (edge < 1) g.set(ax + dx, y, .75, 1);
            else g.set(ax + dx, y, Math.floor((edge + d) / 2) % 2 ? .9 : .7, Math.floor((edge + d) / 2) % 2 ? 0 : 1);
          }
        }
        rect(ax - 4, gy - 5, ax + 4, gy - 1, .1); glass(ax - 3, gy - 4, ax + 3, gy - 1, 3);
        rect(ax - 16, gy - 2, ax - 6, gy - 1, .5, 3); rect(ax + 6, gy - 2, ax + 16, gy - 1, .5, 3);
        const px = at(528); for (let y = gy - 18; y < gy; y++) g.put(px, y, "║", 0);
        rect(px - 7, gy - 22, px + 7, gy - 19, (x, y) => (y === gy - 22 || y === gy - 19 || Math.abs(x - px) === 7 ? .7 : .9), 1);
        g.text(px - 5, gy - 20, "WHATABURGER", 0); for (let k = 0; k < 11; k++) g.acc[(gy - 20) * C + px - 5 + k] = 2;
        const fx = at(478); for (let y = gy - 16; y < gy; y++) g.put(fx, y, "│", 0);
        for (let c = 1; c <= 7; c++) { const wv = Math.round(Math.sin(t * 3 - c * .7) * .5 * c / 7); for (let r = 0; r < 4; r++) { const y = gy - 16 + r + wv; if (c <= 3 && r < 2) g.set(fx + c, y, .55); else g.set(fx + c, y, r % 2 ? .92 : .6, r % 2 ? 0 : 2); } }
      }
      { // the rest of the street: the strip mall's neighbours, parked cars, balloons at Andy's, a tree, a traffic light, poles and wires, traffic
        for (const [u0, u1, name] of [[390, 403, "NAILS"], [439, 455, "LAUNDRY"]]) { // the strip mall's other units, under the same roof line
          const x0 = at(u0), x1 = at(u1);
          for (let d = 0; d < 3; d++) for (let x = x0; x <= x1; x++) g.put(x, gy - 11 - d, (x - x0) % 2 ? "║" : "▌", 5);
          rect(x0, gy - 10, x1, gy - 8, .14); g.put(Math.round((x0 + x1) / 2) - (name.length >> 1), gy - 9, name, name === "NAILS" ? 2 : 0);
          rect(x0, gy - 7, x1, gy - 7, .55);
          for (let y = gy - 6; y < gy; y++) for (let x = x0; x <= x1; x++) { if ((x - x0) % 5 === 0) g.put(x, y, "│", 0); else if (name === "NAILS") { g.set(x, y, 0); glowAt(x, y, .2); } else g.set(x, y, .1 + .05 * hash2(x, y)); }
          if (name === "LAUNDRY") for (let x = x0 + 2; x < x1 - 1; x += 3) g.put(x, gy - 3, "◙", 0); // washers in a row
        }
        [[252, 1], [261, 4], [459, 2], [468, 6]].forEach(([f, k]) => car(at(f), gy - 1, 1, false, k)); // parked
        for (let k = 0; k < 6; k++) { const bx = at(334) + (k % 3) * 2, by = gy - 9 - (k >> 1) - Math.round(Math.sin(t * 1.5 + k) * .4); g.put(bx, by, "●", [1, 2, 0][k % 3]); g.put(at(336), gy - 6 + (k % 2), "│", 0); }
        { const ox = at(381), cy = gy - 7; for (let y = cy - 3; y <= cy + 2; y++) for (let dx = -7; dx <= 7; dx++) if (Math.hypot(dx / 2.2, y - cy) < 3.2 + .6 * hash2(ox + dx, y)) g.set(ox + dx, y, .4 + .2 * hash2(ox + dx, y) + (dx < 0 ? .08 : 0)); for (let y = cy + 2; y < gy; y++) g.set(ox, y, .55); } // a live oak
        { // a traffic light on a mast arm over the road, cycling
          const tx = at(324), ph = (t % 12) / 12, lamp3 = ph < .45 ? 2 : ph < .55 ? 1 : 0;
          for (let y = gy - 14; y < gy; y++) g.put(tx, y, "│", 0);
          for (let dx = 1; dx <= 9; dx++) g.put(tx + dx, gy - 14, "─", 0);
          rect(tx + 8, gy - 13, tx + 10, gy - 11, .2);
          [[2, gy - 13], [1, gy - 12], [0, gy - 11]].forEach(([c, y]) => { if (c === lamp3) { g.put(tx + 9, y, "●", c === 0 ? 0 : c); if (c === 0) g.tone[y * C + tx + 9] = 2; } else g.put(tx + 9, y, "·", 0); });
        }
        { // H-E-B: a dark brick block under a big angled red roof, clerestory glass, an entry canopy, wood-clad wings, flowers and pumpkins out front
          const x0 = at(560), b0 = x0 + 14, b1 = x0 + 43;
          rect(x0, gy - 9, b0 - 1, gy - 1, (x, y) => (y < gy - 7 ? .8 : y < gy - 5 ? .55 : .3), 0); // the left wing: a pale band, wood, a shaded walk
          for (let x = x0; x < b0; x++) { g.set(x, gy - 6, .55, 3); if ((x - x0) % 4 === 1) g.put(x, gy - 8, "▄", 0); }
          rect(b1 + 1, gy - 12, b1 + 12, gy - 10, .85); rect(b1 + 1, gy - 9, b1 + 21, gy - 1, (x, y) => .5 + .12 * ((x + y) % 3 === 0), 3); // the right wing: a pale block over wood
          rect(b1 + 1, gy - 7, b1 + 21, gy - 7, .25); glass(b1 + 3, gy - 6, b1 + 20, gy - 2, 4);
          rect(b0, gy - 17, b1, gy - 1, (x, y) => (x === b0 || x === b1 || y === gy - 17 ? .5 : .34 + ((x + (y % 2) * 2) % 4 === 0 ? -.1 : .04))); // dark brick, its edges catching the light
          glass(b0 - 6, gy - 20, b1 + 8, gy - 18, 5); // the clerestory band
          for (let x = b0 - 12; x <= b1 + 14; x++) { const lift = Math.max(0, Math.round((x - b1) * .35)); g.set(x, gy - 21 - lift, .5, 4); g.set(x, gy - 22 - lift, .75, 2); g.set(x, gy - 23 - lift, .62, 2); g.set(x, gy - 24 - lift, .82, 2); if (x > b1) for (let y = gy - 20 - lift; y < gy - 20; y++) g.set(x, y, .45, 4); } // the red roof slab, its far end kicked up
          const FONT = { H: ["X.X", "X.X", "XXX", "X.X", "X.X"], E: ["XXX", "X..", "XXX", "X..", "XXX"], B: ["XX.", "X.X", "XX.", "X.X", "XX."], "-": [".", ".", "X", ".", "."] };
          let lx = b0 + 2; const ly = gy - 15;
          for (const ch of "H-E-B") { const gl = FONT[ch]; for (let r = 0; r < 5; r++) for (let c = 0; c < gl[r].length; c++) if (gl[r][c] === "X") { g.set(lx + c * 2, ly + r, .85, 2); g.set(lx + c * 2 + 1, ly + r, .85, 2); } lx += gl[0].length * 2 + 1; }
          rect(b0 + 3, gy - 7, b1 - 3, gy - 7, .3); glass(b0 + 5, gy - 6, b1 - 5, gy - 1, 3); for (let x = b0 + 5; x <= b1 - 5; x++) if ((x - b0) % 3) g.set(x, gy - 3, .6, 2); // entry canopy, doors with a red band
          for (let x = b0 + 2; x <= b1 - 2; x += 4) g.put(x, gy - 1, "▮", 0); // bollards
          for (let x = x0 + 1; x < b0 - 1; x++) { g.put(x, gy - 2, "*", [1, 2, 0][x % 3]); g.put(x, gy - 1, "▄", 3); } // flowers on racks
          for (let x = b1 + 3; x < b1 + 20; x += 2) g.put(x, gy - 1, "●", hash2(x, 3) > .4 ? 1 : 0); // pumpkins
        }
        [[630, 3], [640, 5]].forEach(([f, k]) => car(at(f), gy - 1, 1, false, k));
        { // Buc-ee's: a fuel canopy that goes on and on, then the store: cream stucco, a stepped cornice, stone piers, a glass front
          const c0 = at(656), cw = 66;
          for (let dx = 0; dx <= cw; dx++) { const x = c0 + dx, mid = Math.abs(dx - cw / 2) < 9; g.set(x, gy - 11, .34); g.set(x, gy - 10, .3); if (mid) { g.set(x, gy - 12, .34); g.set(x, gy - 13, .5); } g.set(x, gy - 9, .8); if (dx % 3 === 1) g.text(x, gy - 9, "▪", 2); }
          rect(c0, gy - 8, c0 + cw, gy - 1, .03);
          for (let dx = 0; dx <= cw; dx++) for (let y = gy - 8; y < gy; y++) glowAt(c0 + dx, y, .14 + .06 * hash2(c0 + dx, y));
          for (let dx = 3; dx < cw; dx += 9) { rect(c0 + dx, gy - 8, c0 + dx + 1, gy - 1, (x, y) => .5 + .14 * hash2(x, y), 3); if (dx + 5 < cw) { rect(c0 + dx + 4, gy - 3, c0 + dx + 5, gy - 1, .7); g.put(c0 + dx + 4, gy - 3, "▫", 0); } }
          [[663, 7], [681, 8], [699, 9]].forEach(([f, k]) => car(at(f), gy - 1, 1, false, k));
          const s0 = at(730), sw = 46, BIG = { B: ["XX.", "X.X", "XX.", "X.X", "XX."], U: ["X.X", "X.X", "X.X", "X.X", "XXX"], C: ["XXX", "X..", "X..", "X..", "XXX"], E: ["XXX", "X..", "XXX", "X..", "XXX"], S: ["XXX", "X..", "XXX", "..X", "XXX"], "-": ["..", "..", "XX", "..", ".."], "'": ["X", "X", ".", ".", "."] };
          rect(s0, gy - 13, s0 + sw, gy - 1, (x) => (x < s0 + sw * .55 ? .84 : .74)); // stucco
          for (const [a0, a1, y] of [[s0 - 1, s0 + sw + 1, gy - 14], [s0 + 8, s0 + sw - 8, gy - 15], [s0 + 15, s0 + sw - 15, gy - 16]]) for (let x = a0; x <= a1; x++) { g.set(x, y, .6, 3); if (y < gy - 14) g.set(x, y + 1, .8); } // the cornice, stepping up in the middle
          let lx = s0 + 6; for (const ch of "BUC-EE'S") { const gl = BIG[ch]; for (let r = 0; r < 5; r++) for (let c = 0; c < gl[r].length; c++) if (gl[r][c] === "X") g.set(lx + c, gy - 12 + r, .8, 2); lx += gl[0].length + 1; }
          rect(s0, gy - 6, s0 + sw, gy - 6, .5); // the band over the storefront
          for (const px of [s0, s0 + 14, s0 + 30, s0 + sw - 3]) rect(px, gy - 5, px + 3, gy - 1, (x, y) => .5 + .2 * hash2(x, y), 3); // stone piers
          glass(s0 + 4, gy - 5, s0 + 13, gy - 1, 3); glass(s0 + 18, gy - 5, s0 + 29, gy - 1, 3); glass(s0 + 34, gy - 5, s0 + sw - 4, gy - 1, 4);
          rect(s0 + sw + 1, gy - 11, s0 + sw + 14, gy - 1, (x, y) => .44 + .2 * hash2(Math.floor(x / 2), y), 3); // the stone wing
          const px = at(800); for (let y = gy - 20; y < gy; y++) g.put(px, y, "║", 0); // a tall sign for the highway, the name in red
          rect(px - 6, gy - 24, px + 6, gy - 21, (x, y) => (y === gy - 24 || y === gy - 21 || Math.abs(x - px) === 6 ? .7 : .9), 1);
          g.put(px - 4, gy - 23, "BUC-EE'S", 2); g.put(px - 3, gy - 22, "FUEL", 0);
        }
        for (let k = 0; k < 10; k++) { // traffic: the near lane drives right with headlights, the far lane left with tail lights
          const dir = k % 2 ? 1 : -1, sp = 10 + hash(k * 4.4) * 6, span = 880, f = ((hash(k * 9.7) * span + dir * t * sp) % span + span) % span - 20;
          car(at(f), dir > 0 ? gy + 5 : gy + 2, dir, true, k + 20);
        }
      }
    }
    if (s === 5) { // the coast: a lighthouse on the rocks, its beam sweeping, a sailboat out at sea
      const lx = at(120), lh = Math.min(gy - 6, 20), lamp = gy - 3 - lh, a = Math.cos(t * 1.1), flash = Math.abs(a) < .18;
      const reach = Math.round(Math.abs(a) * 90), dir = a > 0 ? 1 : -1;
      for (let r = 3; r < reach; r++) { const spread = r * .12; for (let dy = -Math.floor(spread); dy <= spread; dy++) glowAt(lx + dir * r, lamp + dy, .5 * (1 - r / (reach + 1)) * (1 - Math.abs(dy) / (spread + 1))); }
      for (let x = lx - 9; x <= lx + 9; x++) for (let y = gy - 3; y < gy; y++) if (Math.abs(x - lx) < 9 - (gy - 1 - y) * 2 || y === gy - 1) g.set(x, y, .45 + .3 * hash2(x, y), 5);
      for (let d = 0; d < lh; d++) { const y = gy - 3 - d, half = 2 + (d < lh * .5 ? 1 : 0), band = Math.floor(d / 3) % 2; for (let dx = -half; dx <= half; dx++) g.set(lx + dx, y, band ? .9 - (dx > 0 ? .15 : 0) : .55, band ? 0 : 2); if (d % 3 === 1) g.put(lx, y, "▫", 0); }
      g.put(lx - 3, lamp + 1, "═══════", 0);
      for (let dx = -2; dx <= 2; dx++) g.set(lx + dx, lamp, flash ? 1 : .8, 1);
      g.put(lx - 1, lamp - 1, "▄█▄", 0);
      if (flash) for (const [ddx, ddy, ch] of [[-4, 0, "-"], [4, 0, "-"], [-3, -1, "\\"], [3, -1, "/"], [0, -2, "|"]]) g.put(lx + ddx, lamp + ddy, ch, 1);
      const sx = Math.round((X0 + 150) * .7 + C * .1 + 12 * Math.sin(t * .05)), sy = wT + 4; // the sailboat, out on the sea's layer
      if (sx >= 0 && sx < C && MF("rough", sx) > .5) { g.put(sx, sy, "\\▄▄▄/", 0); g.put(sx + 2, sy - 1, "|", 0); g.put(sx + 2, sy - 2, "|\\", 0); g.put(sx + 2, sy - 3, "|", 0); }
      for (const f of [40, 58, 170, 205]) { const rx = at(f); for (let dx = -3; dx <= 3; dx++) g.set(rx + dx, gy - 1, .55 + .2 * hash2(rx + dx, f), 5); for (let dx = -1; dx <= 2; dx++) g.set(rx + dx, gy - 2, .65, 5); }
    }
    if (s === 6) { // Taipei: a night market below the city, so 101 stays in full view
      const signGlyph = ["▪", "▫", "■", "□", "▬", "▮"];
      let f = 6, k = 0;
      while (f < 226) { // stalls of different widths, heights and trades
        const w = 10 + Math.floor(hash(k * 3.1) * 8), h = 6 + (hash(k * 7.9) > .5 ? 1 : 0), kind = Math.floor(hash(k * 5.3) * 6), style = Math.floor(hash(k * 2.6) * 3);
        const sx = at(f), ay = gy - h - 1;
        if (sx > -w - 2 && sx < C + 2) {
          for (let dx = 0; dx < w; dx++) { // the awning: red and white stripes, a tan canvas, or a blue tarp, with a scalloped edge
            const stripe = (dx >> 1) % 2;
            if (style === 0) g.set(sx + dx, ay, stripe ? .88 : .62, stripe ? 0 : 2); else if (style === 1) g.set(sx + dx, ay, .62, 3); else g.set(sx + dx, ay, .5);
            if (dx % 2 === 0) g.put(sx + dx, ay + 1, "▀", style === 1 ? 3 : style === 0 ? 2 : 0);
          }
          const sw = w - 2, acc = k % 2 ? 1 : 2; // a lit signboard; its blocks stand in for the hanzi on a real one
          for (let dx = 0; dx < sw; dx++) { g.set(sx + 1 + dx, ay - 2, .12); g.put(sx + 1 + dx, ay - 1, signGlyph[Math.floor(hash2(k, dx) * 6)], (Math.floor(t * 4) + dx) % sw === 0 ? 0 : acc); }
          for (let y = ay + 1; y < gy; y++) { g.put(sx, y, "│", 0); g.put(sx + w - 1, y, "│", 0); }
          for (let y = ay + 2; y < gy - 2; y++) for (let dx = 1; dx < w - 1; dx++) glowAt(sx + dx, y, .16 + .1 * hash2(sx + dx, y));
          for (let dx = 1; dx < w - 1; dx += 3) g.put(sx + dx, ay + 1, "•", 1); // bulbs under the awning
          for (let dx = 0; dx < w; dx++) { g.set(sx + dx, gy - 2, .62, 3); g.set(sx + dx, gy - 1, .4, 3); } // the counter
          g.set(sx + 3, gy - 5, .9); g.set(sx + 3, gy - 4, .55); g.set(sx + 3, gy - 3, .5); g.put(sx + 2, gy - 5, "▄", 0); // the vendor, in a cap
          const c0 = sx + 5, c1 = sx + w - 2;
          if (kind === 0) { for (let x = c0; x < c1; x++) g.put(x, gy - 3, "¦", 3); for (let q = 0; q < 5; q++) { const ph = (t * .35 + q / 5 + hash(k)) % 1; g.put(c0 + 2 + Math.round(Math.sin(t + q * 1.7) * 2 + ph * 3), Math.round(ay - 2 - ph * 6), ph < .5 ? "▒" : "░", 5); } } // a grill and its smoke
          else if (kind === 1) for (let x = c0; x < c1; x += 2) { g.put(x, gy - 3, "▯", 0); g.tone[(gy - 3) * C + x] = 2; if (hash2(x, k) > .5) g.put(x, gy - 4, "·", 3); } // bubble tea, with the pearls
          else if (kind === 2) for (let x = c0; x < c1; x++) { g.put(x, gy - 3, "●", [1, 2, 3, 1][(x + k) % 4]); if ((x - c0) % 2 && x < c1 - 1) g.put(x, gy - 4, "●", [2, 1, 3][(x + k) % 3]); } // fruit, piled up
          else if (kind === 3) for (let y = ay + 2; y < gy - 3; y++) for (let x = c0 - 1; x < c1; x += 2) g.put(x, y, hash2(x, y + Math.floor(t * .5)) > .12 ? "●" : "*", [1, 2, 0][(x + y) % 3]); // a wall of balloons to throw darts at
          else if (kind === 4) { for (let x = c0; x < c1; x++) g.set(x, gy - 3, .7 + .2 * hash2(x, k), 1); for (let q = 0; q < 3; q++) { const ph = (t * .5 + q / 3) % 1; g.put(c0 + q * 2, Math.round(gy - 4 - ph * 4), "~", 0); } } // fried chicken, steaming
          else for (let x = c0; x < c1; x += 3) { g.put(x, gy - 3, "▲", 1); g.put(x + 1, gy - 3, "▲", 3); } // mango shaved ice
        }
        f += w + 1 + Math.floor(hash(k * 2.2) * 5); k++;
      }
      for (let ff = 4; ff < 232; ff++) { // strings of lanterns across the street
        const x = at(ff); if (x < 0 || x >= C) continue;
        const y = gy - 12 + Math.round(Math.sin((ff - 4) / 16 * Math.PI) ** 2);
        if (ff % 5 === 0) g.put(x, y + 1, "●", (ff / 5) % 3 ? 2 : 1); else if (g.ch[y * C + x] === undefined && g.v[y * C + x] < .3) g.put(x, y, "‾", 0);
      }
      for (const ff of [60, 118, 171, 214]) { const x = at(ff); g.set(x, gy - 2, .55); g.set(x + 1, gy - 2, .6); g.set(x + 2, gy - 2, .6); g.put(x + 3, gy - 2, "▄", 0); g.put(x, gy - 1, "●", 0); g.put(x + 3, gy - 1, "●", 0); } // scooters parked at the front
      for (let q = 0; q < 26; q++) { // the crowd: people walking both ways, some with a drink
        const dir = q % 2 ? 1 : -1, sp = .6 + hash(q * 3.9) * .8, ff = ((hash(q * 6.1) * 236 + dir * t * sp) % 236 + 236) % 236, x = at(ff), step = Math.floor(t * 3 + q) % 2;
        if (x < 0 || x >= C) continue;
        g.set(x, gy - 3, .92); g.set(x, gy - 2, .55 + .2 * hash(q)); g.set(x, gy - 1, .45); if (step) g.put(x + dir, gy - 1, dir > 0 ? "/" : "\\", 0);
        if (hash(q * 2.3) > .7) g.put(x + dir, gy - 2, "▯", 1);
      }
      for (let q = 0; q < 6; q++) { // scooters passing on the road in front
        const dir = q % 2 ? 1 : -1, sp = 8 + hash(q * 5.5) * 5, ff = ((hash(q * 8.8) * 320 + dir * t * sp) % 320 + 320) % 320 - 10, x = at(ff), y = dir > 0 ? gy + 5 : gy + 2;
        g.set(x, y - 1, .85); g.set(x - dir, y - 1, .5); g.set(x, y, .6); g.set(x - dir, y, .6); g.put(x + dir, y, "•", dir > 0 ? 1 : 2); if (dir > 0) glowAt(x + 2, y, .2);
      }
    }
  }
};

function blit(dst, src, dx, dy) { // copy src into dst shifted by (dx, dy) cells
  dx = Math.round(dx); dy = Math.round(dy);
  for (let y = 0; y < dst.r; y++) {
    const sy = y - dy; if (sy < 0 || sy >= src.r) continue;
    for (let x = 0; x < dst.c; x++) {
      const sx = x - dx; if (sx < 0 || sx >= src.c) continue;
      const i = y * dst.c + x, j = sy * src.c + sx;
      dst.v[i] = src.v[j]; dst.acc[i] = src.acc[j]; dst.ch[i] = src.ch[j]; dst.tone[i] = src.tone[j]; dst.z[i] = src.z[j]; dst.mat[i] = src.mat[j];
    }
  }
}

/* ======================================================================= project tours (../js/tours.js), drawn in text */
// The pixel version's narrated tours play here too. The player draws each scene on its small canvas as before; this
// skin turns every frame into text art in the page's own style (the picture's contrast against its background becomes
// the glyph ramp, warm colours become the accent), and the labels inside the picture are set as real characters.
window.TOUR_BASE = ""; // the page lives at the root, beside audio/
window.TOUR_SKIN = (() => {
  let grid, layers, cols, rows;
  const warm = (r, g, b) => r > g + 40 && r > b + 70; // the tours' orange, red and amber: things being pointed at
  const red = (r, g, b) => warm(r, g, b) && g < 120; // the deeper reds (tumour, errors): maroon
  return {
    mount(parent) {
      const el = document.createElement("div"); el.className = "ascii tour-art"; el.setAttribute("aria-hidden", "true");
      el.innerHTML = `<pre class="t0"></pre><pre class="t1"></pre><pre class="t2"></pre><pre class="acc"></pre><pre class="mar"></pre><pre class="tan"></pre><pre class="deep"></pre><pre class="side"></pre>`;
      el.insertAdjacentHTML("beforeend", `<div class="tour-labels"></div>`); parent.append(el); layers = [...el.children].slice(0, 5); return el;
    },
    fit(el, W, H) {
      cols = W; rows = Math.round(H * CHAR_W / LINE_H); // one column per picture pixel; rows follow the character's shape
      const fs = el.clientWidth / (cols * CHAR_W);
      el.style.fontSize = fs + "px"; el.style.height = rows * fs * LINE_H + "px";
      if (!grid || grid.c !== cols || grid.r !== rows) { grid = new Grid(cols, rows); grid.ramp = "Blocks"; } // shaded blocks: thin lines and boxes stay solid
    },
    render(el, cv, labels, o) {
      if (!grid) return;
      const W = cv.width, H = cv.height, d = cv.getContext("2d").getImageData(0, 0, W, H).data;
      const lum = (i) => (.299 * d[i] + .587 * d[i + 1] + .114 * d[i + 2]) / 255;
      const bgL = lum(0), span = Math.max(bgL, 1 - bgL), sx = Math.round(o.sx || 0);
      grid.clear();
      for (let y = 0; y < rows; y++) {
        const y0 = Math.floor(y * H / rows), y1 = Math.max(y0 + 1, Math.floor((y + 1) * H / rows));
        for (let x = 0; x < cols; x++) {
          const px = x - sx; if (px < 0 || px >= W) continue;
          let v = 0, n = 0, acc = 0, mar = 0;
          for (let yy = y0; yy < y1; yy++) { const i = (yy * W + px) * 4; v = Math.max(v, Math.abs(lum(i) - bgL)); n++; if (warm(d[i], d[i + 1], d[i + 2])) { acc++; if (red(d[i], d[i + 1], d[i + 2])) mar++; } } // the brightest pixel in the cell, so one-pixel lines survive
          const k = y * cols + x, q = clamp01(v / span); grid.v[k] = q < .06 ? 0 : Math.max(.36, Math.pow(q, .6) * .82); // anything drawn at all reads at least mid-tone: faint panel edges and boxes stay visible grid.acc[k] = acc * 2 > n ? (mar * 2 > acc ? 2 : 1) : 0; // capped below the solid block, so flat areas keep a texture
        }
      }
      grid.strings().forEach((txt, m) => { layers[m].textContent = txt; });
      // the labels: real text laid over the picture, where the pixel version drew them, scaled with the window
      const box = el.querySelector(".tour-labels"), sc = el.clientWidth / W, key = labels.map((L) => L.str + L.x + L.y + L.k + L.plate).join("|");
      if (box.dataset.key !== key || box.dataset.sc !== String(sc)) {
        box.dataset.key = key; box.dataset.sc = sc;
        box.innerHTML = labels.map((L) => { const m = /^#?([0-9a-f]{6})$/i.exec(L.c || ""), c = m ? parseInt(m[1], 16) : 0xffffff, hot = L.plate || (m && warm(c >> 16, (c >> 8) & 255, c & 255)), deep = !L.plate && m && red(c >> 16, (c >> 8) & 255, c & 255);
          return `<span class="${L.plate ? "plate" : deep ? "mar" : hot ? "hot" : ""} a-${L.align || "l"}" style="left:${(L.x + sx) * sc}px;top:${L.y * sc}px;font-size:${4.2 * L.k * sc}px">${esc(L.str)}</span>`; }).join("");
      }
    },
  };
})();
document.addEventListener("click", (e) => { const b = e.target.closest(".tour-btn"); if (b && typeof TourPlayer !== "undefined" && TOURS[b.dataset.tour]) { if (detWin.open) detWin.close(); TourPlayer.open(b.dataset.tour); } });

/* ======================================================================= resting frames of the project figures */
// the time (in each figure's own clock) of its most complete or most telling frame
const WARM = new Set(["tracking"]);
const PLAY_FROM_START = new Set(["sigma", "mri"]);
const REST = {
  sigma: () => (RULE.join("").length + 45) / 28,          // rule written out, AST built, check passed
  mmwave: () => Math.PI / 6 / 1.1,                         // the beam focused on the phantom tumor
  pitching: () => 2.56,                                    // just after release, ball in flight, wrist path drawn
  tracking: () => 30,                                      // 30 s of trails built up
  mri: () => MRI.RUN + .5,                                          // every spoke acquired, image sharp
  metagenomic: (g) => (g.c / 2 + 8) / 6,                   // attention window in the middle
  fashion: () => 5.9,                                      // both models scored, LightGBM's pixels marked
  mammo: (g) => {                                          // the GLCM window sitting on the mass
    const ww = 10, wh = 5, span = g.c - ww - 1, rows = Math.floor((g.r - 3 - wh) / 4) + 1;
    const row = Math.max(0, Math.min(rows - 1, Math.round((g.r * .45 - wh / 2 - 1) / 4)));
    const wx = Math.round(g.c * .66 - ww / 2), col = row % 2 ? span - wx : wx;
    return (row * span + col + .5) / 9;
  },
};

/* ======================================================================= go */
document.querySelectorAll(".ascii[data-art]").forEach(mount);
{ // picture figures in mini cards: hover, focus or tap steps the lid open (closed, opening, open) and back
  document.querySelectorAll(".mini-card").forEach((card) => {
    const pic = card.querySelector(".mini-pic"); if (!pic) return;
    let open = false, timer = 0;
    const set = (want) => {
      if (open === want) return; open = want; clearTimeout(timer);
      const seq = want ? ["opening", "open"] : ["opening", "closed"];
      if (reduced) { pic.dataset.pose = seq[1]; return; }
      pic.dataset.pose = seq[0]; timer = setTimeout(() => { pic.dataset.pose = seq[1]; }, 140);
    };
    card.addEventListener("pointerenter", (e) => { if (e.pointerType !== "touch") set(true); });
    card.addEventListener("pointerleave", (e) => { if (e.pointerType !== "touch") set(false); });
    card.addEventListener("focusin", () => set(true)); card.addEventListener("focusout", (e) => { if (!card.contains(e.relatedTarget)) set(false); });
    pic.addEventListener("click", () => set(!open));
  });
}

/* ======================================================================= project details: a window over the page */
// opens from a card's "Details" button, so the cards around it never move; the figure plays inside
const detWin = document.createElement("dialog");
detWin.className = "msgwin detwin";
detWin.setAttribute("aria-labelledby", "det-h");
detWin.innerHTML = `<div class="term-bar"><span class="term-dots" aria-hidden="true"><i></i><i></i><i></i></span>
  <span class="term-title"></span><button class="msg-x det-play tour-btn" type="button" aria-label="Play the narrated overview of this project" title="Narrated overview"><svg viewBox="0 0 20 14" width="18" height="13" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><rect x="1" y="1.5" width="12.5" height="11" rx="1"/><path d="M13.5 5.5 19 2.5v9l-5.5-3"/></svg></button><button class="msg-x det-x" type="button" aria-label="Close">×</button></div>
  <div class="ascii det-art" data-art="sigma" data-rows="16" aria-hidden="true"></div>
  <div class="det-body"><p class="meta"></p><h2 id="det-h"></h2><ul class="det-list"></ul><ul class="tags"></ul><p class="card-links"></p></div>`;
document.body.append(detWin);
const detPanel = mount(detWin.querySelector(".det-art"));
document.addEventListener("click", (e) => {
  const b = e.target.closest(".more:not(.tour-btn)");
  if (b) {
    const pr = C.projects.find((x) => x.slug === b.dataset.slug);
    detWin.querySelector(".term-title").textContent = `~/projects/${pr.slug}`;
    detWin.querySelector(".meta").innerHTML = `<span class="fig">${String(b.dataset.fig).padStart(2, "0")}</span>${esc(pr.org)} · ${esc(when(pr.date))}`;
    detWin.querySelector("h2").textContent = pr.title;
    detWin.querySelector(".det-list").innerHTML = pr.bullets.map((x) => `<li>${esc(x)}</li>`).join("");
    detWin.querySelector(".tags").innerHTML = pr.tags.map((x) => `<li class="tag">${esc(x)}</li>`).join("");
    detWin.querySelector(".card-links").innerHTML = pr.links.map((l) => `<a href="${esc(l.url)}">${esc(l.label)} ↗</a>`).join("");
    const play = detWin.querySelector(".det-play"); play.hidden = !(typeof TOURS !== "undefined" && TOURS[pr.slug]); play.dataset.tour = pr.slug;
    Object.assign(detPanel, { art: ARTS[pr.slug], name: pr.slug, state: {}, play: true, dirty: true });
    detPanel.el.dataset.rows = ROWS_FOR[pr.slug] || 16;
    detWin.showModal(); fit(detPanel);
    return;
  }
  if (e.target.closest(".det-x") || e.target === detWin) detWin.close();
});
requestAnimationFrame(loop);
})();
