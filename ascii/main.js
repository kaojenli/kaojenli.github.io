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
$("#now").innerHTML = `Now: <b>${esc(P.now)}</b>`;
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
    const L = ["", "", "", "", ""]; // faint, mid, bright, accent (amber), maroon
    for (let y = 0; y < this.r; y++) {
      for (let x = 0; x < this.c; x++) {
        const i = y * this.c + x, over = this.ch[i] !== undefined, g = over ? this.ch[i] : glyph(this.v[i], this.ramp);
        const v = this.v[i], k = this.acc[i] === 2 ? 4 : this.acc[i] ? 3 : over ? (this.tone[i] === 2 ? 2 : this.tone[i] === 1 ? 0 : 1) : v < .32 ? 0 : v < .68 ? 1 : 2;
        for (let m = 0; m < 5; m++) L[m] += m === k ? g : " ";
      }
      if (y < this.r - 1) for (let m = 0; m < 5; m++) L[m] += "\n";
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
  el.innerHTML = `<pre class="t0"></pre><pre class="t1"></pre><pre class="t2"></pre><pre class="acc"></pre><pre class="mar"></pre>`;
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
  else { fs = +p.el.dataset.fs || (w < 520 ? 6 : 11); c = Math.floor(w / (fs * CHAR_W)); r = Math.floor(h / (fs * LINE_H)); }
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

// footer: a night skyline, stars twinkling, a few windows lit
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
// Every so often a saucer comes for the cow in the one empty lot in town. Nobody in the buildings seems to mind.
const UFO_PERIOD = 34; // seconds per visit
const COW_PX = [ // W white hide, B black patch (a hole), H head, n horn, e eye, L leg, T tail
  "...........n.n",
  "...........HHH",
  "T.WWWWWWWWWHeH",
  "TWWBBWWWBBWWHH",
  ".WWWWBWWWWBW..",
  ".L...L...L.L..",
];
const COW_TONE = { W: .9, B: 0, H: .9, n: .55, L: .8, T: .5 };
ARTS.skyline = (g, t) => {
  const ground = g.r - 1;
  for (let y = 0; y < g.r - 3; y++) for (let x = 0; x < g.c; x++) {
    const h = hash2(x, y);
    if (h > .985) star(g, x, y, .5 + .5 * Math.sin(t * (1 + h * 3) + x));
  }
  const mx = g.c * .6, my = 3; // the moon sits left of the cookie sign
  for (let y = 0; y < 7; y++) for (let x = -6; x <= 6; x++) {
    const d = Math.hypot(x * CHAR_W / LINE_H, y - my); if (d < 2.2) g.set(mx + x, y, d < 1.6 ? .95 : .5);
  }
  const lotX = Math.floor(g.c * .28), lotW = 38; // the empty lot
  let x = 0;
  while (x < g.c) {
    const w = 4 + Math.floor(hash(x * .7) * 7), hgt = 2 + Math.floor(hash(x * 1.3 + 4) * (g.r * .55));
    if (x + w > lotX && x < lotX + lotW) { x = x < lotX ? lotX + lotW : x + w; continue; } // leave the lot open
    for (let xx = x; xx < Math.min(g.c, x + w); xx++) for (let y = ground - hgt; y <= ground; y++) {
      const edge = xx === x || xx === x + w - 1 || y === ground - hgt;
      const win = !edge && (xx - x) % 2 === 1 && (y - ground) % 2 === 0;
      if (win && hash2(xx, y + Math.floor(t * .3 + hash(xx) * 9)) > .62) g.put(xx, y, "▪", hash(xx * 3 + y) > .6 ? 2 : 1);
      else g.set(xx, y, y === ground - hgt ? .6 : edge ? .42 : .1);
    }
    x += w + (hash(x * 3.1) > .7 ? 1 : 0);
  }
  for (let xx = lotX; xx < lotX + lotW; xx++) { // the lot: grass, a fence along the back, a tree in the corner
    g.set(xx, ground, hash(xx * 7.7) > .5 ? .3 : .18);
    if (hash(xx * 2.3) > .8) g.put(xx, ground - 1, "ⁱ", 0);
    g.set(xx, ground - 2, (xx - lotX) % 5 === 0 ? .55 : .22); // posts and rail
  }
  const tx = lotX + 3;
  g.set(tx, ground - 1, .65); g.set(tx + 1, ground - 1, .65); g.set(tx, ground - 2, .65); g.set(tx + 1, ground - 2, .65); // trunk
  for (let y = ground - 6; y <= ground - 3; y++) { const hw = y === ground - 6 ? 2 : y === ground - 3 ? 3 : 4; for (let dx = -hw; dx <= hw + 1; dx++) g.set(tx + dx, y, .4 + .25 * hash2(tx + dx, y)); } // canopy
  const cx = lotX + 23; // where the cow likes to stand

  // the visit, on a loop: arrive, hover, beam, lift, leave
  const ph = ((t % UFO_PERIOD) + UFO_PERIOD) % UFO_PERIOD, sky = 2;
  let ux = null, uy = sky, beam = 0, cowY = ground - 1, cowOn = true, cowFlip = false, cowX = cx;
  if (ph < 4) { const u = ease(Math.min(1, ph / 3.4)); cowX = Math.round(lotX + lotW - 15 + (cx - lotX - lotW + 15) * u); } // the cow wanders in from the right
  else if (ph < 9) { ux = -8 + (cx + 8) * ease((ph - 4) / 5); uy = sky + Math.sin(ph * 2) * .6; } // the saucer arrives
  else if (ph < 10.5) { ux = cx; uy = sky + Math.sin(ph * 2) * .4; beam = Math.min(1, (ph - 9) / 1); } // the beam opens
  else if (ph < 15) { ux = cx; uy = sky + Math.sin(ph * 2) * .3; beam = 1; const u = ease((ph - 10.5) / 4.5); cowY = ground - 1 - (ground - 1 - (sky + 2)) * u; cowFlip = u > .5 && u < .8; } // up she goes
  else if (ph < 16) { ux = cx; beam = 1 - (ph - 15); cowOn = false; } // the beam closes
  else if (ph < 19) { const u = (ph - 16) / 3; ux = cx + (g.c + 12 - cx) * u * u; uy = sky - 1.5 * u; cowOn = false; } // and away
  else cowOn = false; // the lot stays empty for a while. the cow is fine.

  if (beam > 0 && ux !== null) { // a cone of light, widening toward the ground
    const top = Math.round(uy) + 2, span = Math.round((ground - top) * beam);
    for (let y = top; y <= top + span; y++) {
      const half = 1 + (y - top) * .95;
      for (let dx = -Math.floor(half); dx <= Math.floor(half); dx++) {
        const i = y * g.c + Math.round(ux) + dx; if (i < 0 || i >= g.v.length) continue;
        const fl = (.3 + .25 * hash2(Math.round(ux) + dx, y + Math.floor(t * 10))) * (1 - .5 * Math.abs(dx) / (half + 1)); // brighter down the middle
        g.set(Math.round(ux) + dx, y, Math.max(g.v[i] || 0, fl), 1);
      }
    }
  }
  if (cowOn) { // the cow, facing right: a holstein in two tones, horns, an eye, four legs; she turns over once on the way up
    const rows = cowFlip ? [...COW_PX].reverse() : COW_PX, top = Math.round(cowY) - 4, left = cowX - 14; // cowX is her middle
    for (let r = 0; r < rows.length; r++) for (let k = 0; k < rows[r].length; k++) {
      const c = rows[r][k]; if (c === ".") continue;
      const X = left + 2 * k, Y = top + r;
      if (c === "e") { g.set(X, Y, .9); g.put(X, Y, "o", 0); g.set(X + 1, Y, .9); continue; }
      if (c === "B") { g.set(X, Y, 0); g.set(X + 1, Y, 0); continue; }
      const v = COW_TONE[c]; g.set(X, Y, v); g.set(X + 1, Y, v);
    }
  }
  if (ux !== null) { // the saucer: a dome, a wide disc, running lights underneath
    const X = Math.round(ux), Y = Math.round(uy);
    for (let dx = -1; dx <= 1; dx++) g.set(X + dx, Y - 1, .7);
    for (let dx = -5; dx <= 5; dx++) g.set(X + dx, Y, Math.abs(dx) === 5 ? .5 : .95);
    for (let dx = -3; dx <= 3; dx += 2) g.put(X + dx, Y + 1, "▪", (Math.floor(t * 6) + dx) % 4 === 0 ? 2 : 1);
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
      el.innerHTML = `<pre class="t0"></pre><pre class="t1"></pre><pre class="t2"></pre><pre class="acc"></pre><pre class="mar"></pre>`;
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
