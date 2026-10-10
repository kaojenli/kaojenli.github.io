// Short pixel tours of the projects: a small window opens over the page and plays a short animated story
// (why → how → what came out), drawn pixel by pixel on a 256×144 canvas and scaled up crisp; the
// caption under the picture says what's going on. Space plays/pauses, ← → step between scenes, Esc closes.
// Each tour is a list of scenes { ch: chapter, dur: seconds, cap: caption, draw(g, t, s) } (g: drawing helpers, t:
// seconds into the scene, s: the scene's own state, e.g. where the reader clicked).

// Everything is kept inside one function so its helper names never clash with the cabin's; only TOURS and TourPlayer
// are shared with the page.
const { TOURS, TourPlayer } = (() => {
// ---------- a 3×5 pixel font for labels inside the picture
const PXFONT = (() => {
  const G = {
    A: "010101111101101", B: "110101110101110", C: "011100100100011", D: "110101101101110", E: "111100110100111", F: "111100110100100",
    G: "011100101101011", H: "101101111101101", I: "111010010010111", J: "001001001101010", K: "101101110101101", L: "100100100100111",
    M: "101111111101101", N: "110101101101101", O: "010101101101010", P: "110101110100100", Q: "010101101110011", R: "110101110101101",
    S: "011100010001110", T: "111010010010010", U: "101101101101111", V: "101101101101010", W: "101101111111101", X: "101101010101101",
    Y: "101101010010010", Z: "111001010100111", 0: "111101101101111", 1: "010110010010111", 2: "110001010100111", 3: "110001010001110",
    4: "101101111001001", 5: "111100110001110", 6: "011100111101111", 7: "111001010010010", 8: "111101111101111", 9: "111101111001110",
    "-": "000000111000000", ".": "000000000000010", ":": "000010000010000", "/": "001001010100100", ">": "100010001010100", "<": "001010100010001",
    "+": "000010111010000", "$": "011110010011110", "%": "101001010100101", "?": "110001010000010", "!": "010010010000010", "'": "010010000000000",
    "(": "010100100100010", ")": "010001001001010", "=": "000111000111000", "*": "000101010101000", ",": "000000000010100", "~": "000011110000000",
    "✓": "000001001101010", "×": "000101010101000", " ": "000000000000000",
  };
  return G;
})();

// ---------- drawing helpers on a 2D context, in picture pixels
function pxKit(ctx) {
  const g = {
    ctx,
    rect: (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); },
    px: (x, y, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), 1, 1); },
    // a box with a 1px dark outline and a lighter top edge
    box: (x, y, w, h, c, o = "#111", lite = null) => { g.rect(x, y, w, h, o); g.rect(x + 1, y + 1, w - 2, h - 2, c); if (lite) g.rect(x + 1, y + 1, w - 2, 1, lite); },
    disc: (cx, cy, rx, ry, c) => { for (let y = -ry; y <= ry; y++) { const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y / (ry + 0.5)) ** 2))); g.rect(cx - w, cy + y, 2 * w + 1, 1, c); } },
    ring: (cx, cy, r, c, a0 = 0, a1 = Math.PI * 2, ry = r) => { const n = Math.max(12, Math.ceil(r * 6)); for (let i = 0; i <= n; i++) { const a = a0 + ((a1 - a0) * i) / n; g.px(cx + Math.cos(a) * r, cy + Math.sin(a) * ry, c); } },
    line: (x0, y0, x1, y1, c) => { x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1); const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy; for (;;) { g.px(x0, y0, c); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } } },
    // type: drawn as real (vector) text at the canvas' full resolution, so it stays crisp while the art stays pixel.
    // all type is Pixelify Sans (a pixel face, like the titles). k = 1: a small label; k > 1: display type. align "l" | "c" | "r"
    font: (k) => (k > 1 ? `600 ${5.6 * k}px "Pixelify Sans", Inter, system-ui, sans-serif` : `500 5.6px "Pixelify Sans", Inter, system-ui, sans-serif`),
    text: (str, x, y, c, k = 1, align = "l") => {
      ctx.save(); ctx.font = g.font(k); ctx.fillStyle = c; ctx.textBaseline = "top"; ctx.textAlign = align === "c" ? "center" : align === "r" ? "right" : "left";
      if ("letterSpacing" in ctx) ctx.letterSpacing = k > 1 ? "-0.1px" : "0.1px";
      ctx.fillText(String(str), x, y - (k > 1 ? 0.6 * k : 0.2)); ctx.restore();
    },
    textW: (str, k = 1) => { ctx.save(); ctx.font = g.font(k); if ("letterSpacing" in ctx) ctx.letterSpacing = k > 1 ? "-0.1px" : "0.1px"; const w = ctx.measureText(String(str)).width; ctx.restore(); return Math.ceil(w); },
    // a label on a little plate
    tag: (str, x, y, bg, fg = "#fff", align = "l") => { if (bg === SKY.ink) fg = SKY.bg; const w = g.textW(str) + 6, X = Math.round(align === "c" ? x - w / 2 : align === "r" ? x - w : x); g.rect(X, y, w, 9, bg); g.text(str, X + 3, y + 2, fg); },
    img: (im, x, y, flip = false) => { if (!im || !im.complete) return; if (flip) { ctx.save(); ctx.scale(-1, 1); ctx.drawImage(im, -Math.round(x) - im.width, Math.round(y)); ctx.restore(); } else ctx.drawImage(im, Math.round(x), Math.round(y)); },
    alpha: (a, fn) => { const o = ctx.globalAlpha; ctx.globalAlpha = o * Math.max(0, Math.min(1, a)); fn(); ctx.globalAlpha = o; },
    jet: (v) => { const f = (k) => Math.round(255 * Math.min(1, Math.max(0, 1.5 - Math.abs(4 * v - k)))); return `rgb(${f(3)},${f(2)},${f(1)})`; },
  };
  return g;
}
// steps of time, so motion moves in a few frames a second like the cabin's (Habbo) animations
const tick = (t, fps = 10) => Math.floor(t * fps) / fps;
const ease = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : 1 - (1 - t) ** 3);
const blinkOn = (t, per = 0.8) => t % per < per * 0.6;

// ---------- shared scenery
const SKY = { bg: "#101114", stage: "#1d1f24", ink: "#f2f2f0", muted: "#8e9198", trim: "#2c2f36",
  accent: "#e8915f", ok: "#6cc49a", bad: "#e06a5f", fat: "#ead7a4", fatLite: "#f2e4bd", tumor: "#d9544d", wave: "#7fb0f0", hot: "#ee7d72" };
let PXK = 1; // canvas pixels per picture pixel (set by the player)
const CARD = "#17191d", EDGE = "#2a2d34", LITE = "#1f2126"; // panels: a dark card with a faint edge
function room(g) { // one solid colour, like a keynote slide, and a faint line for things to stand on
  g.ctx.save(); g.ctx.setTransform(PXK, 0, 0, PXK, 0, 0);
  g.rect(0, 0, 256, 144, SKY.bg);
  g.ctx.restore();
}
// a radar board seen from the front: green, a row of transmit (green) and receive (orange) antennas, a status light
function radarBoard(g, x, y, w, t) { // the IMAGEVK-74: a square board in a clear acrylic case, seen from a little above
  const d = 12, e = 4; // depth of the top face, height of the front edge
  // acrylic case: top face, then the front edge
  g.rect(x, y, w, d + e + 1, OUT);
  g.rect(x + 1, y + 1, w - 2, d - 1, "#eef5f7"); g.rect(x + 1, y + d, w - 2, e, "#cfdde3"); g.rect(x + 1, y + d, w - 2, 1, "#a9bcc4");
  // the green board inside, with a few chips, and its edge showing through the front
  g.rect(x + 4, y + 3, w - 8, d - 5, "#2e7d4a"); g.rect(x + 4, y + 3, w - 8, 1, "#4fa36a");
  [[7, 4], [10, 7], [w - 12, 4], [w - 9, 6], [w - 14, 7]].forEach(([u, v]) => g.rect(x + u, y + v, 2, 1, "#1d4a2c"));
  g.rect(x + 2, y + d + 1, w - 4, 1, "#2e7d4a");
  // the heatsink in the middle: silver fins
  const hx = x + Math.round(w / 2) - 8; g.rect(hx, y + 2, 16, 8, OUT); g.rect(hx + 1, y + 3, 14, 6, "#d6dadf");
  for (let i = 0; i < 7; i++) g.rect(hx + 2 + i * 2, y + 3, 1, 6, "#9aa1a8");
  // screws in the corners, the power socket on the front edge, a status light
  [[2, 2], [w - 4, 2], [2, d - 3], [w - 4, d - 3]].forEach(([u, v]) => { g.rect(x + u, y + v, 2, 2, "#8a8f96"); g.px(x + u, y + v, "#e8ecef"); });
  g.rect(x + w - 11, y + d, 6, e, "#2b2e35"); g.rect(x + w - 9, y + d + 1, 2, 2, "#555b63");
  g.px(x + 6, y + d + 2, blinkOn(t, 0.5) ? "#39ff88" : "#1d5a33");
}
// expanding wave fronts from (cx, cy): downward half-rings at radius r
function waves(g, cx, cy, r, c, up = false, n = 3, gap = 9, max = 999) {
  for (let i = 0; i < n; i++) { const R = r - i * gap; if (R > 2 && R < max) g.ring(cx, cy, R, c, up ? Math.PI * 1.15 : Math.PI * 0.15, up ? Math.PI * 1.85 : Math.PI * 0.85, R * 0.6); }
}

// an echo on a time axis: a flat line with one wave packet centred at c, height amp
function trace(g, x0, x1, y, c, amp, col) {
  let py = y;
  for (let x = x0; x <= x1; x++) { const d = x - c, v = y - Math.round(amp * Math.exp(-(d * d) / 14) * Math.cos(d * 1.1)); if (x > x0) g.line(x - 1, py, x, v, col); py = v; }
}
// solid shapes with a little depth: a cylinder seen slightly from above (side shaded left to right, a lit top),
// a shadow on the surface it stands on, and a small cube
const OUT = "#111";
function ellRows(cx, cy, rx, ry, fn) { for (let y = -ry; y <= ry; y++) { const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y / (ry + 0.5)) ** 2))); for (let x = -w; x <= w; x++) fn(cx + x, cy + y, x, y, w); } }
function cylinder(g, cx, top, rx, ry, h, side, topCol, { outline = OUT, rim = null } = {}) {
  for (let x = -rx; x <= rx; x++) {
    const e = Math.round(ry * Math.sqrt(Math.max(0, 1 - (x / (rx + 0.5)) ** 2))), u = (x + rx) / (2 * rx);
    const c = u < 0.18 ? side[0] : u < 0.62 ? side[1] : u < 0.86 ? side[2] : side[3];
    g.rect(cx + x, top, 1, h + e, c);
    if (outline) { g.px(cx + x, top + h + e, outline); if (Math.abs(x) === rx) g.rect(cx + x, top, 1, h + e, outline); }
  }
  ellRows(cx, top, rx, ry, (x, y, dx, dy, w) => g.px(x, y, Math.abs(dx) === w || Math.abs(dy) === ry ? outline || topCol : topCol));
  if (rim) ellRows(cx, top, rx - 2, ry - 1, (x, y, dx, dy, w) => { if (Math.abs(dx) === w && dy < 0) g.px(x, y, rim); });
}
function shadow(g, cx, cy, rx, ry) { ellRows(cx, cy, rx, ry, (x, y) => g.px(x, y, "rgba(40,24,8,.28)")); }
function cube(g, x, y, s, top, front, side) { // a small cube, s px, front face facing the viewer
  g.rect(x, y + 2, s, s, front); g.rect(x + s, y + 1, 2, s, side); g.rect(x + 1, y, s, 2, top);
  g.rect(x - 1, y + 2, 1, s, OUT); g.rect(x, y + s + 2, s + 1, 1, OUT); g.rect(x + s + 2, y, 1, s + 1, OUT); g.rect(x + 1, y - 1, s + 1, 1, OUT); g.px(x, y + 1, OUT); g.px(x + s + 1, y + s + 1, OUT);
}
// the breast phantom: a thick disc of milky, see-through gel, the tumor (a red ball) floating inside it
function phantom(g, cx, top, k = 1) {
  const rx = Math.round(26 * k), ry = Math.round(8 * k), h = Math.round(16 * k);
  shadow(g, cx + 3, top + h + 2, rx + 2, ry);
  // the tumor first, so the gel is seen over it
  if (k > 0.8) { const tx = cx + 3, ty = top + Math.round(h * 0.55) + 2; g.disc(tx, ty, 6, 5, "#5e1010"); g.disc(tx, ty, 5, 4, "#e0302f"); g.disc(tx - 2, ty - 2, 2, 1, "#ff9d8f"); }
  cylinder(g, cx, top, rx, ry, h, ["rgba(255,254,250,.86)", "rgba(250,247,238,.8)", "rgba(232,225,207,.84)", "rgba(208,198,172,.9)"], "rgba(255,253,247,.88)", { outline: "#3a3326" });
  // the tumor again, faintly, as it shows through the milky gel
  if (k > 0.8) { const tx = cx + 3, ty = top + Math.round(h * 0.55) + 2; g.disc(tx, ty, 5, 4, "rgba(214,60,60,.42)"); g.disc(tx - 1, ty - 1, 3, 2, "rgba(230,90,90,.3)"); }
  for (let y = top + 2; y < top + h + ry - 2; y++) g.px(cx - rx + 3, y, "rgba(255,255,255,.75)"); // light down the near edge
  ellRows(cx - Math.round(8 * k), top - Math.round(3 * k), Math.round(7 * k), Math.max(1, Math.round(1.5 * k)), (x, y) => g.px(x, y, "rgba(255,255,255,.7)")); // a glossy patch
}
// a glass beaker with liquid in it, a scale on the side and a glass rod stirring
function beaker(g, cx, top, t, liquid, level) {
  const rx = 16, ry = 5, h = 34;
  shadow(g, cx + 3, top + h + 3, rx + 2, ry);
  // the back of the glass, then the liquid, then the front of the glass over it
  cylinder(g, cx, top, rx, ry, h, ["#e8f2f7", "#d8e7ef", "#c7dae5", "#b2c8d4"], "#eef6fa");
  const lt = top + h - level;
  cylinder(g, cx, lt, rx - 2, ry - 1, level - 1, liquid.side, liquid.top, { outline: null });
  for (let y = top + 3; y < top + h; y++) { g.px(cx - rx + 3, y, "rgba(255,255,255,.85)"); if (y % 2) g.px(cx - rx + 4, y, "rgba(255,255,255,.6)"); }
  for (let k = 0; k < 4; k++) g.rect(cx + rx - 5, top + 10 + k * 6, 3, 1, "#7d93a1");
  ellRows(cx, top, rx, ry, (x, y, dx, dy, w) => { if (Math.abs(dx) === w || Math.abs(dy) === ry) g.px(x, y, OUT); }); // the rim
  g.rect(cx - rx - 2, top - 2, 3, 2, "#eef6fa"); g.px(cx - rx - 3, top - 2, OUT); g.rect(cx - rx - 2, top - 3, 3, 1, OUT); // spout
  const a = tick(t, 6) * 3, rx0 = cx + Math.cos(a) * 7, ry0 = lt + 2 + Math.sin(a) * 2;
  g.line(rx0, ry0, cx + 12 + Math.cos(a) * 4, top - 16, "#9fb6c4"); g.line(rx0 + 1, ry0, cx + 13 + Math.cos(a) * 4, top - 16, "#dbe8ef");
}
// a small image as a grid of jet-coloured cells; fn(i, j) gives 0..1
function heat(g, x, y, nx, ny, c, fn) { g.rect(x - 1, y - 1, nx * c + 2, ny * c + 2, OUT); for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) g.rect(x + i * c, y + j * c, c, c, g.jet(Math.max(0, Math.min(1, fn(i, j))))); }
// an arrow pointing right, with an optional label over it
function arrow(g, x0, x1, y, col = SKY.ink, label = "") { g.rect(x0, y, x1 - x0 - 3, 1, col); for (let k = 0; k < 3; k++) g.rect(x1 - 3 + k, y - 2 + k, 1, 5 - 2 * k, col); if (label) g.text(label, (x0 + x1) / 2, y - 7, col, 1, "c"); }
// the processing chain, drawn along the top of the signal-processing scenes with the current step lit
const CHAIN = ["I/Q DATA", "IFFT", "CLUTTER", "DAS", "BACKGROUND", "CENTROID"];
const SIGMA_CHAIN = ["CRAWL", "VALIDATE", "AST", "PROMPT", "GENERATE", "EVALUATE"];
function chain(g, on, list = CHAIN) {
  let x = 34;
  list.forEach((lab, i) => {
    const w = g.textW(lab) + 6, lit = on.includes(i);
    g.rect(x, 3, w, 9, lit ? SKY.accent : CARD); g.text(lab, x + 3, 5, lit ? SKY.bg : SKY.muted);
    x += w; if (i < list.length - 1) { g.text(">", x + 2, 5, SKY.trim); x += 8; }
  });
}
// ---------- pieces for the Sigma tour: YAML text, tree nodes, chips, documents
const STRUCT = new Set(["detection", "selection", "filter", "condition", "logsource", "title", "level", "category"]);
// one line of YAML: [indent, key, value]; keys blue, |modifiers orange, quoted values green. Returns the pieces drawn,
// each { x, w, kind: "op" (an operator) | "opnd" (an operand) | "" }, so a scene can mark them.
function yamlLine(g, x, y, [ind, key, val], fade = 1) {
  const segs = []; let X = x + ind * 5;
  const put = (str, col, kind) => { g.alpha(fade, () => g.text(str, X, y, col)); const w = g.textW(str); segs.push({ x: X, w, kind, txt: str }); X += w; };
  const [base, ...mods] = key.split("|");
  put(base, SKY.wave, STRUCT.has(base) ? "" : "opnd");
  mods.forEach((m) => { const x0 = X; g.alpha(fade, () => g.rect(X + 1, y - 0.5, 1, 6.5, SKY.accent)); X += 3; put(m, SKY.accent, "op"); segs[segs.length - 1].x = x0; segs[segs.length - 1].w += 3; });
  put(":", SKY.muted, ""); X += 3;
  if (val !== undefined && val !== "") {
    if (/^'/.test(val)) put(val, SKY.ok, "opnd");
    else val.split(" ").forEach((w, i) => { if (i) X += g.textW(" "); put(w, /^(and|or|not)$/.test(w) ? SKY.accent : SKY.ink, /^(and|or|not)$/.test(w) ? "op" : ""); });
  }
  return segs;
}
function yamlBlock(g, x, y, lines, { lh = 7, hi = -1, hiW = 104, upto = 99 } = {}) {
  const all = [];
  lines.forEach((l, i) => {
    if (i >= upto) return;
    if (i === hi) g.rect(x - 2, y + i * lh - 1, hiW, lh, "rgba(232,145,95,.22)");
    all.push(...yamlLine(g, x, y + i * lh, l).map((s) => ({ ...s, y: y + i * lh })));
  });
  return all;
}
// the example rule used through the tour (a real public Sigma rule, slightly shortened)
const RULE = [[0, "title", "Malleable OneDrive Profile"], [0, "logsource", ""], [1, "category", "proxy"], [0, "detection", ""], [1, "selection", ""],
  [2, "cs-method", "'GET'"], [2, "c-uri|endswith", "'?manifest=wac'"], [2, "cs-host", "'onedrive.live.com'"], [1, "filter", ""],
  [2, "c-uri|startswith", "'http'"], [1, "condition", "selection and not filter"], [0, "level", "high"]];
const DETECT = RULE.slice(3, 11).map(([i, k, v]) => [i - 0, k, v]);
// a node of a tree: a small plate with a coloured edge (filled when lit); returns its box
// text where "|" (a Sigma field modifier) is drawn as a thin bar
const ptextW = (g, str) => str.split("|").reduce((w, p, i) => w + g.textW(p) + (i ? 3 : 0), 0);
function ptext(g, str, x, y, col) { let X = x; str.split("|").forEach((p, i) => { if (i) { g.rect(X + 1, y - 0.5, 1, 6.5, col); X += 3; } g.text(p, X, y, col); X += g.textW(p); }); }
function tnode(g, cx, y, label, col, lit = false) {
  const w = ptextW(g, label) + 6, x = Math.round(cx - w / 2);
  g.rect(x, y, w, 9, col); g.rect(x + 1, y + 1, w - 2, 7, lit ? col : CARD); ptext(g, label, x + 3, y + 2, lit ? SKY.bg : SKY.ink);
  return { x, y, w, h: 9 };
}
function elbow(g, x0, y0, x1, y1, col = "#3a3f4a") { const ym = Math.round((y0 + y1) / 2); g.rect(x0, y0, 1, ym - y0 + 1, col); g.rect(Math.min(x0, x1), ym, Math.abs(x1 - x0) + 1, 1, col); g.rect(x1, ym, 1, y1 - ym, col); }
// a model as a chip with pins
function chip(g, cx, cy, label, col = SKY.accent, w = 34, h = 18) {
  const x = Math.round(cx - w / 2), y = Math.round(cy - h / 2);
  for (let i = 0; i < Math.floor((w - 6) / 6); i++) { g.rect(x + 5 + i * 6, y - 2, 2, 2, "#6b717c"); g.rect(x + 5 + i * 6, y + h, 2, 2, "#6b717c"); }
  g.box(x, y, w, h, "#1b1e24", col); g.text(label, cx, cy - 3, col, 1, "c");
}
// a small document (a rule file), with a few lines on it
function doc(g, x, y, col = "#e9ecef", line = "#9aa3ad") { g.rect(x, y, 9, 11, OUT); g.rect(x + 1, y + 1, 7, 9, col); g.rect(x + 6, y + 1, 2, 2, "#b9c0c8"); for (let k = 0; k < 3; k++) g.rect(x + 2, y + 4 + k * 2, k === 1 ? 3 : 5, 1, line); }
// a code repository: a small book with a tab
function repo(g, x, y) { g.rect(x, y, 14, 11, "#3a3f4a"); g.rect(x + 1, y + 1, 12, 9, "#22262e"); g.rect(x + 3, y + 3, 7, 1, "#8e9198"); g.rect(x + 3, y + 5, 5, 1, "#5d626b"); g.rect(x + 1, y + 1, 1, 9, "#7fb0f0"); }
// a person at a desk, seen from the side, typing
function analyst(g, x, y, t) {
  g.rect(x - 4, y + 10, 12, 3, "#2b2e35"); g.rect(x - 4, y + 2, 3, 9, "#2b2e35"); g.rect(x, y + 13, 2, 10, "#2b2e35"); // chair
  g.rect(x - 1, y + 1, 8, 11, "#4a6fa5"); g.rect(x - 1, y + 1, 8, 1, "#6b8fc4"); // body
  g.disc(x + 3, y - 4, 4, 4, "#f1c7a3"); g.rect(x - 1, y - 9, 8, 4, "#3b2a20"); g.rect(x - 1, y - 6, 2, 4, "#3b2a20"); // head, hair
  const k = tick(t, 6) % 0.4 < 0.2 ? 0 : 1; g.rect(x + 6, y + 5 + k, 8, 2, "#4a6fa5"); g.rect(x + 13, y + 5 + k, 2, 2, "#f1c7a3"); // arm, typing
  g.rect(x + 2, y + 12, 12, 3, "#3a4250"); g.rect(x + 12, y + 14, 2, 9, "#3a4250"); // legs
  g.rect(x + 10, y + 7, 30, 2, "#8a5a36"); g.rect(x + 36, y + 9, 2, 14, "#6e4631"); // desk
  g.box(x + 22, y - 12, 18, 13, "#0b0c0f", "#3a3f4a"); g.rect(x + 30, y + 1, 2, 6, "#3a3f4a"); // screen
  for (let i = 0; i < 4; i++) g.rect(x + 25, y - 9 + i * 2, 4 + ((i * 5 + Math.floor(t * 3)) % 9), 1, i === 3 ? SKY.accent : "#5d8f6a");
}
// ---------- pieces for the course-project tours
const rnd = (i) => { const v = Math.sin(i * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
// horizontal bars: rows [label, value (or null), colour]; labels right-aligned before the bar, the value after it
function hbars(g, x, y, rows, { lw = 80, bw = 120, rh = 11, max = 1, t = 99, t0 = 0, fmt = (v) => v.toFixed(2) } = {}) {
  rows.forEach(([lab, v, col], i) => {
    const Y = y + i * rh, p = ease((t - t0 - i * 0.2) / 0.6);
    g.text(lab, x + lw - 4, Y + 1, SKY.ink, 1, "r"); g.rect(x + lw, Y, bw, 7, "#1c1f25");
    if (v == null) { g.text("NOT RUN", x + lw + 3, Y + 1, SKY.muted); return; }
    const w = Math.round(bw * Math.min(1, v / max) * p); g.rect(x + lw, Y, w, 7, col);
    if (p > 0.95) g.text(fmt(v), x + lw + w + 3, Y + 1, col);
  });
}
// a small instrument board (the Analog Discovery 2)
function ad2(g, x, y, label) { g.box(x, y, 32, 18, "#1a1d23", "#4a78b0"); for (let i = 0; i < 5; i++) g.rect(x + 4 + i * 5, y + 15, 2, 2, "#c9a64a"); g.text(label, x + 16, y + 5, SKY.wave, 1, "c"); }
// a C-shaped permanent magnet, a coil in its gap with a sample tube inside
function magnet(g, x, y) {
  g.rect(x, y, 8, 40, "#3f4550"); g.rect(x, y, 50, 9, "#5d636e"); g.rect(x, y + 31, 50, 9, "#5d636e"); g.rect(x + 1, y + 1, 48, 1, "#7d8590"); g.rect(x + 1, y + 32, 48, 1, "#7d8590");
  g.rect(x + 14, y + 9, 30, 3, "#c94a3f"); g.rect(x + 14, y + 28, 30, 3, "#3f6ac9");
  for (let i = 0; i < 8; i++) g.rect(x + 18 + i * 3, y + 15, 2, 10, i % 2 ? "#b8742f" : "#d99a52");
  g.rect(x + 16, y + 19, 26, 2, "#9fd0f0");
}
// a mammogram (side view): the breast against a black background, denser tissue near the chest wall, a few calcifications
function mammo(g, x, y, w, h, seed = 1, calc = true) {
  g.rect(x, y, w, h, "#050506");
  for (let j = 0; j < h; j++) {
    const v = (j - h * 0.5) / (h * 0.5), ww = Math.round(w * 0.92 * Math.sqrt(Math.max(0, 1 - v * v)));
    for (let i = 0; i < ww; i += 1) { const e = i / Math.max(1, ww), d = 0.3 + 0.5 * (1 - e) * (1 - Math.abs(v) * 0.7) + 0.18 * rnd(seed * 997 + Math.floor(i / 2) * 31 + Math.floor(j / 2) * 7); const c = Math.round(235 * Math.min(1, d)); g.rect(x + i, y + j, 1, 1, `rgb(${c},${c},${c - 4})`); }
  }
  if (calc) [[0.55, 0.42], [0.6, 0.47], [0.52, 0.5], [0.58, 0.53], [0.63, 0.44]].forEach(([u, v]) => g.rect(x + Math.round(u * w), y + Math.round(v * h), 1, 1, "#ffffff"));
}
// a microbe: a rod or a round cell
function microbe(g, x, y, kind, col) { if (kind) { g.rect(x - 5, y - 2, 11, 5, OUT); g.rect(x - 4, y - 1, 9, 3, col); g.rect(x - 3, y - 1, 3, 1, "rgba(255,255,255,.5)"); } else { g.disc(x, y, 3, 3, OUT); g.disc(x, y, 2, 2, col); g.px(x - 1, y - 1, "rgba(255,255,255,.6)"); } }
// 2D discrete Fourier transform of a real image (rows × cols), done separably; returns { re, im }
function dft2(img, R, C, inv = false) {
  const s = inv ? 1 : -1, re = new Float64Array(R * C), im = new Float64Array(R * C), tr = new Float64Array(R * C), ti = new Float64Array(R * C);
  const src = img.re ? img : { re: img, im: new Float64Array(R * C) };
  for (let r = 0; r < R; r++) for (let k = 0; k < C; k++) { let a = 0, b = 0; for (let c = 0; c < C; c++) { const ang = (s * 2 * Math.PI * k * c) / C, xr = src.re[r * C + c], xi = src.im[r * C + c]; a += xr * Math.cos(ang) - xi * Math.sin(ang); b += xr * Math.sin(ang) + xi * Math.cos(ang); } tr[r * C + k] = a; ti[r * C + k] = b; }
  for (let k = 0; k < C; k++) for (let q = 0; q < R; q++) { let a = 0, b = 0; for (let r = 0; r < R; r++) { const ang = (s * 2 * Math.PI * q * r) / R, xr = tr[r * C + k], xi = ti[r * C + k]; a += xr * Math.cos(ang) - xi * Math.sin(ang); b += xr * Math.sin(ang) + xi * Math.cos(ang); } re[q * C + k] = a; im[q * C + k] = b; }
  return { re, im };
}
// the MRI phantom: two water tubes; images and projections computed once
const MRI = (() => {
  const discs = [[-6, -3, 5], [6, 4, 4]], N = 32, R = 32, C = 64, cache = {};
  const chord = (d, r) => (Math.abs(d) < r ? 2 * Math.sqrt(r * r - d * d) : 0);
  const proj = (th, s) => discs.reduce((a, [cx, cy, r]) => a + chord(s - (cx * Math.cos(th) + cy * Math.sin(th)), r), 0);
  // filtered backprojection with n angles over 180°: sinogram and image on an N × N grid
  function fbp(n) {
    if (cache[n]) return cache[n];
    const sino = [], cum = [], img = new Float64Array(N * N), h = (k) => (k === 0 ? 0.25 : k % 2 ? -1 / (Math.PI * Math.PI * k * k) : 0);
    for (let a = 0; a < n; a++) {
      const th = (Math.PI * a) / n, p = []; for (let s = 0; s < N; s++) p.push(proj(th, s - N / 2 + 0.5));
      const f = p.map((_, s) => p.reduce((acc, v, u) => acc + v * h(s - u), 0)); sino.push(p);
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const X = x - N / 2 + 0.5, Y = y - N / 2 + 0.5, s = X * Math.cos(th) + Y * Math.sin(th) + N / 2 - 0.5, i = Math.floor(s), u = s - i; if (i >= 0 && i < N - 1) img[y * N + x] += f[i] * (1 - u) + f[i + 1] * u; }
      cum.push(Float64Array.from(img));
    }
    const mx = Math.max(...img), norm = (a) => Array.from(a, (v) => Math.max(0, v / mx));
    return (cache[n] = { sino, img: norm(img), cum: cum.map(norm), pmax: Math.max(...sino.flat()) });
  }
  // phase-encoded acquisition: the object on a 32 × 64 grid, its k-space and the reconstruction (Hamming window, 2D FFT, 20 % threshold)
  function fourier() {
    if (cache.k) return cache.k;
    const obj = new Float64Array(R * C);
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) { const x = (c - C / 2 + 0.5) / 2, y = r - R / 2 + 0.5; obj[r * C + c] = discs.some(([cx, cy, rr]) => (x - cx) ** 2 + (y - cy) ** 2 < rr * rr) ? 1 : 0; }
    const K = dft2(obj, R, C), mag = [];
    for (let q = 0; q < R; q++) for (let k = 0; k < C; k++) { const qq = (q + R / 2) % R, kk = (k + C / 2) % C; mag.push(Math.log(1 + Math.hypot(K.re[qq * C + kk], K.im[qq * C + kk]))); }
    const mm = Math.max(...mag), w = new Float64Array(R * C);
    for (let q = 0; q < R; q++) for (let k = 0; k < C; k++) { const hq = 0.54 - 0.46 * Math.cos((2 * Math.PI * ((q + R / 2) % R)) / (R - 1)), hk = 0.54 - 0.46 * Math.cos((2 * Math.PI * ((k + C / 2) % C)) / (C - 1)); w[q * C + k] = hq * hk; }
    const Kw = { re: K.re.map((v, i) => v * w[i]), im: K.im.map((v, i) => v * w[i]) }, I = dft2(Kw, R, C, true), im = [];
    for (let i = 0; i < R * C; i++) im.push(Math.hypot(I.re[i], I.im[i]));
    const imx = Math.max(...im);
    return (cache.k = { k: mag.map((v) => v / mm), img: im.map((v) => v / imx), R, C });
  }
  const inside = (i, j) => discs.some(([cx, cy, r]) => (i - N / 2 + 0.5 - cx) ** 2 + (j - N / 2 + 0.5 - cy) ** 2 < r * r);
  return { fbp, fourier, proj, inside, N };
})();
// a grey-level image drawn cell by cell; fn(i) gives 0..1
function gray(g, x, y, nx, ny, cw, ch, fn, tint = null) { for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const v = Math.max(0, Math.min(1, fn(i, j))), c = Math.round(v * 255); g.rect(x + i * cw, y + j * ch, cw, ch, tint ? tint(v) : `rgb(${c},${c},${c})`); } }
// ---------- the tours
const TOURS = {
  mmwave: {
    title: "Millimeter-wave breast tumor imaging · overview",
    link: { label: "Read the paper", url: "https://ieeexplore.ieee.org/document/9945009" },
    chapters: ["Motivation", "Method", "Results"],
    scenes: [
      { ch: 0, title: "Introduction", dur: 6.5, cap: "M.S. thesis: a preliminary study of breast tumor detection with a multi-channel 62–69 GHz millimeter-wave imaging radar.",
        subs: [[0.3, "My master's thesis began with an open question:"], [3.0, "could millimeter-wave radar help detect breast tumors?"]],
        draw(g, t, s, I) {
          room(g);
          const up = (t0) => [ease((t - t0) / 0.6), Math.round(6 * (1 - ease((t - t0) / 0.6)))];
          let [a, d] = up(0.1); g.alpha(a, () => g.text("Millimeter-wave", 153, 22 + d, SKY.ink, 2, "c"));
          [a, d] = up(0.4); g.alpha(a, () => g.text("breast imaging", 153, 37 + d, SKY.accent, 2, "c"));
          [a, d] = up(1.0); g.alpha(a, () => g.text("MULTI-CHANNEL 3D RECONSTRUCTION", 153, 60 + d, SKY.ink, 1, "c"));
          [a, d] = up(1.3); g.alpha(a, () => g.text("62-69 GHz  .  20 TX X 20 RX MIMO", 153, 70 + d, SKY.muted, 1, "c"));
          [a, d] = up(1.6); g.alpha(a, () => g.text("M.S. THESIS, CHANG GUNG UNIV., 2022", 153, 80 + d, SKY.muted, 1, "c"));
          radarBoard(g, 129, 106, 48, t); waves(g, 153, 106, tick(t, 8) * 24 % 30 + 4, SKY.wave, true, 2, 10, 14);
        } },
      { ch: 0, title: "Why another imaging modality?", dur: 13.6, cap: "Each breast imaging method has its own limitations: X-ray exposure and compression (mammography), limited resolution (ultrasound), cost and frequent use of contrast agents (MRI). This work explores what millimeter-wave sensing could add alongside them.",
        subs: [[0.3, "Every breast imaging method comes with its own limitations."], [3.7, "Mammography involves X-ray exposure and compression,"], [6.6, "ultrasound has limited resolution, and MRI can be costly."], [9.9, "I wanted to explore what another kind of sensor might add."]],
        draw(g, t, s, I) {
          room(g); g.ctx.translate(0, -6); // (drawn a little higher, so the labels clear the bottom edge)
          const show = (k) => t > 0.4 + k * 1.6, tagAt = (k) => t > 1.2 + k * 1.6;
          // X-ray mammography: a tall unit with an arm and two plates pressing together
          if (show(0)) { g.box(52, 40, 20, 88, "#dfe4e8", "#111", "#fff"); g.box(70, 58, 26, 6, "#c9d0d6"); const sq = tick(t, 4) % 1 < 0.5 ? 0 : 2; g.box(70, 76 - sq, 26, 5, "#c9d0d6"); g.box(70, 86, 26, 5, "#aab3bb"); g.text("MAMMOGRAPHY", 66, 132, SKY.ink, 1, "c"); }
          if (tagAt(0)) { g.tag("X-RAY EXPOSURE", 74, 28, "#3a3f4a", SKY.ink, "c"); }
          // ultrasound: a cart with a screen of grey speckle and a probe on a cable
          if (show(1)) { g.box(118, 92, 34, 36, "#e7ebee", "#111", "#fff"); g.box(120, 58, 30, 26, "#2b2e35"); for (let i = 0; i < 70; i++) g.px(123 + ((i * 37 + tick(t, 6) * 60) % 24), 61 + ((i * 53) % 20), i % 3 ? "#7a7f86" : "#c9cdd3"); g.rect(134, 84, 2, 8, "#555"); g.box(154, 96, 5, 12, "#cfd6dc"); g.line(156, 96, 150, 90, "#555"); g.text("ULTRASOUND", 135, 132, SKY.ink, 1, "c"); }
          if (tagAt(1)) g.tag("LIMITED RESOLUTION", 135, 46, "#3a3f4a", SKY.ink, "c");
          // MRI: a big ring with a table through it
          if (show(2)) { g.disc(212, 84, 30, 30, "#111"); g.disc(212, 84, 29, 29, "#eef1f4"); g.disc(212, 84, 13, 13, "#111"); g.disc(212, 84, 12, 12, "#4a5568"); g.box(176, 94, 72, 6, "#cfd6dc"); g.rect(196, 100, 4, 28, "#9aa6b0"); g.rect(226, 100, 4, 28, "#9aa6b0"); g.text("MRI", 212, 132, SKY.ink, 1, "c"); }
          if (tagAt(2)) g.tag("COST, CONTRAST AGENT", 212, 28, "#3a3f4a", SKY.ink, "c");
        } },
      { ch: 0, title: "Principle: dielectric contrast", dur: 11, cap: "Principle: malignant tissue has a higher water content than adipose tissue, so its dielectric properties differ sharply and it reflects millimeter waves more strongly.",
        subs: [[0.3, "The idea rests on a difference in water content."], [3.1, "Tumors typically hold more water than the surrounding fat,"], [6.4, "which changes their dielectric properties and strengthens their reflection."]],
        draw(g, t, s, I) {
          room(g);
          // a slice of fatty tissue with a tumor in it
          g.box(60, 52, 186, 76, SKY.fat, "#111");
          for (let y = 54; y < 126; y += 3) for (let x = 62 + ((y / 3) % 2) * 3; x < 244; x += 7) g.px(x, y, SKY.fatLite);
          g.disc(176, 98, 10, 8, "#7a1f1f"); g.disc(176, 98, 9, 7, SKY.tumor); g.disc(173, 95, 3, 2, "#f07c7c");
          g.text("ADIPOSE TISSUE", 66, 118, "#8a6a2a"); g.tag("TUMOR: HIGH WATER CONTENT", 176, 112, SKY.tumor, "#fff", "c");
          radarBoard(g, 152, 20, 48, t);
          // waves go down; at the tumor a strong echo comes back up
          const r = (tick(t, 10) * 34) % 64;
          waves(g, 176, 33, r + 6, SKY.wave, false, 3, 12, 70);
          const e = (tick(t, 10) * 34) % 64 - 22;
          if (e > 0) waves(g, 176, 90, e, SKY.hot, true, 3, 9, 60);
          g.text("WEAK REFLECTION", 66, 58, "#8a6a2a"); if (e > 10) g.text("STRONG REFLECTION", 160, 92, "#b03030", 1, "r");
        } },
      { ch: 0, title: "Research gap: above 50 GHz", dur: 10.6, cap: "Prior radar-based breast imaging systems operated at or below 50 GHz. This work evaluates 62–69 GHz, where resolution improves at the cost of penetration depth.",
        subs: [[0.3, "Earlier radar-based breast imaging mostly worked at or below 50 GHz."], [4.1, "This study examined a higher band, 62 to 69 GHz,"], [6.9, "which offers finer resolution but less penetration depth."]],
        draw(g, t, s, I) {
          room(g);
          g.box(54, 12, 196, 108, CARD, EDGE, LITE);
          const X = (f) => 102 + (f / 72) * 140;
          [[1997, 15, 15], [1998, 6, 6], [2000, 3.6, 3.6], [2010, 6, 6], [2017, 26.5, 40], [2019, 2, 4], [2021, 18, 50], [2021, 20, 40]].forEach(([yr, lo, hi], i) => {
            if (t < 0.3 + i * 0.35) return;
            const y = 23 + i * 9; g.text(String(yr), 96, y, SKY.muted, 1, "r"); g.rect(X(lo) - (hi === lo ? 1 : 0), y, Math.max(3, X(hi) - X(lo)), 5, "#9aa6b0");
          });
          for (let y = 21; y < 104; y += 4) g.rect(X(50), y, 1, 2, SKY.accent);
          g.text("50", X(50), 108, SKY.accent, 1, "c");
          if (t > 3.6) { const y = 23 + 8 * 9, w = (X(69) - X(62)) * ease((t - 3.6) / 0.6); g.text("THIS WORK", 96, y, SKY.accent, 1, "r"); g.rect(X(62), y - 1, w, 7, blinkOn(t) || t < 5 ? SKY.accent : "#e98a5f"); }
          [0, 20, 40, 60].forEach((f) => g.text(String(f), X(f), 108, SKY.muted, 1, "c"));
          g.text("GHz", 246, 108, SKY.muted, 1, "r"); g.text("OPERATING FREQUENCY (GHz)", 60, 14, SKY.muted);
        } },
      { ch: 1, title: "Tissue-mimicking phantoms", dur: 13.9, cap: "Tissue-mimicking phantoms. Water sets the high permittivity of water-rich tissue, sunflower oil mimics fat, gelatin forms the solid matrix, and a surfactant emulsifies oil and water. The tumor uses far less oil and twice the gelatin, so its water fraction and permittivity are higher.",
        subs: [[0.2, "To test the system, I first prepared tissue-mimicking phantoms,"], [3.8, "made from water, oil, gelatin and a surfactant."], [6.5, "The tumor phantom contains less oil and more gelatin,"], [9.5, "giving a measured permittivity of 40.7, versus 14.8 for breast tissue."]],
        draw(g, t, s) {
          room(g);
          // a bench with a deep top, so things can stand on it
          g.rect(58, 108, 4, 20, "#8a5a36"); g.rect(240, 108, 4, 20, "#8a5a36"); g.rect(70, 108, 3, 14, "#6e4631"); g.rect(229, 108, 3, 14, "#6e4631");
          g.rect(56, 92, 190, 17, OUT); g.rect(57, 93, 188, 10, "#ddb07a"); for (let x = 60; x < 244; x += 23) g.rect(x, 96 + (x % 3), 9, 1, "#d1a26c");
          g.rect(57, 103, 188, 5, "#b07a45"); g.rect(57, 103, 188, 1, OUT);
          // the beaker: water first, the rest poured in and stirred until it turns milky
          const mixed = Math.min(1, Math.max(0, (t - 2.6) / 0.8));
          const liq = mixed < 0.5 ? { side: ["#cfe8f7", "#a9d4ef", "#8cc0e2", "#6fa9d1"], top: "#dff0fa" } : { side: ["#fbf3df", "#f1e3bd", "#e3cf9c", "#cdb57d"], top: "#fff8e8" };
          beaker(g, 84, 62, t, liq, 12 + Math.round(Math.min(1, t / 3) * 10));
          // breast-tissue recipe: amount, and what each ingredient stands in for
          const items = [["DEIONIZED WATER", "68 mL", "WATER CONTENT: PERMITTIVITY", "#6fb7e8"], ["SUNFLOWER OIL", "136 mL", "ADIPOSE (FAT) TISSUE", "#f2c94c"],
            ["GELATIN", "6.8 g", "SOLID MATRIX, HOLDS SHAPE", "#f4f1ea"], ["SURFACTANT", "3.8 mL", "EMULSIFIES OIL AND WATER", "#7fc9a0"]];
          const listOn = t < 4.3;
          items.forEach(([lab, amt, role, col], i) => {
            const t0 = 0.2 + i * 0.6; if (t < t0) return;
            const y = Math.min(66, 14 + (t - t0) * 110);
            if (y < 66) { g.disc(84, y, 2, 3, OUT); g.disc(84, y, 1, 2, col); g.px(83, y - 1, "#fff"); }
            if (listOn) g.alpha(ease((t - t0) / 0.4), () => { const Y = 14 + i * 16; g.rect(110, Y + 1, 4, 3, col); g.text(lab, 118, Y, SKY.ink); g.text(amt, 250, Y, SKY.accent, 1, "r"); g.text(role, 118, Y + 7, SKY.muted); });
          });
          if (listOn && t > 2.6) g.alpha(ease((t - 2.6) / 0.4), () => g.text("BREAST TISSUE RECIPE", 118, 80, SKY.muted));
          // then: how the tumor recipe differs, and the phantom it makes
          if (t > 4.4) {
            const k = 0.3 + 0.7 * ease((t - 4.4) / 0.6); phantom(g, 196, 88 - Math.round(9 * k), k);
            g.alpha(ease((t - 4.5) / 0.5), () => {
              g.text("TUMOR INCLUSION", 118, 14, SKY.tumor);
              g.text("OIL 136 > 17 mL", 118, 24, SKY.ink); g.text("GELATIN 6.8 > 13.6 g", 118, 32, SKY.ink);
              g.text("MORE WATER > HIGHER PERMITTIVITY", 118, 42, SKY.muted);
            });
            if (t > 5.8) g.alpha(ease((t - 5.8) / 0.5), () => { g.text("MEASURED AT 4 GHz: 14.8 / 40.7", 118, 52, SKY.accent); g.text("(BREAST / TUMOR)", 118, 59, SKY.muted); });
          }
        } },
      { ch: 1, title: "Data acquisition", dur: 10.7, cap: "Data acquisition: a Vayyar IMAGEVK-74 MIMO radar (20 Tx × 20 Rx) in an absorber-lined enclosure records 400 channels × 150 frequency points from 62 to 69 GHz.",
        subs: [[0.3, "Data were acquired with a palm-sized 20 × 20 MIMO radar,"], [3.5, "placed in an absorber-lined enclosure to reduce stray reflections,"], [7.2, "recording 400 channels with 150 frequency points each."]],
        draw(g, t, s, I) {
          room(g);
          // the box lined with absorbing foam (zigzags)
          g.box(92, 14, 150, 114, "#22262e", "#3a404c");
          for (let y = 18; y < 124; y += 6) { for (let k = 0; k < 6; k++) { g.rect(95 + k, y + k, 6 - k, 1, "#4a4f59"); g.rect(234 + k, y + k, 6 - k, 1, "#4a4f59"); } }
          g.rect(150, 15, 2, 12, "#8a919a"); g.rect(182, 15, 2, 12, "#8a919a"); radarBoard(g, 143, 24, 48, t); // hung from the top of the box
          phantom(g, 167, 99, 1);
          const r = (tick(t, 10) * 40) % 96;
          waves(g, 167, 37, r + 4, "#7fd1ff", false, 3, 14, 84);
          if (r > 66) waves(g, 167, 110, r - 66, SKY.hot, true, 2, 10, 80);
          const ch = Math.min(400, Math.floor(t * 70) + 1);
          g.tag(`CHANNEL ${String(ch).padStart(3, "0")}/400`, 70, 6, CARD, "#39ff88");
          if (t > 5) g.tag("400 CH X 150 FREQ. POINTS", 167, 64, SKY.accent, "#fff", "c");
        } },
      { ch: 1, title: "Wave propagation in tissue", dur: 11.1, cap: "Propagation: at the phantom surface part of the wave reflects (the strong early response); the rest is attenuated as it travels through the tissue. At the tumor the dielectric contrast reflects part of it back, attenuated again on the way out. Higher frequencies attenuate faster.",
        subs: [[0.3, "At the phantom surface, part of the wave is reflected."], [3.4, "The remainder is attenuated as it travels through the tissue,"], [6.9, "and the tumor returns a weak echo because of its dielectric contrast."]],
        draw(g, t, s) {
          room(g);
          // a cross-section: radar in air, then the phantom, the tumor inside
          radarBoard(g, 76, 14, 48, t);
          g.rect(56, 40, 92, 1, SKY.trim); g.text("AIR GAP", 58, 32, SKY.muted);
          g.rect(56, 44, 92, 72, OUT); g.rect(57, 45, 90, 70, "#f6efdc");
          for (let y = 47; y < 114; y += 3) for (let x = 59 + ((y / 3) % 2) * 3; x < 146; x += 7) g.px(x, y, "#fffaf0");
          g.disc(100, 96, 7, 6, "#5e1010"); g.disc(100, 96, 6, 5, "#e0302f");
          // the wave going down, fading as it goes; the surface echo; the tumor echo coming back up
          const r = (tick(t, 10) * 30) % 80, depth = 24 + r;
          if (depth < 92) { const a = depth < 44 ? 1 : Math.exp(-(depth - 44) / 30); g.ring(100, 24, r, `rgba(59,130,196,${a.toFixed(2)})`, Math.PI * 0.2, Math.PI * 0.8, r * 0.45); }
          if (depth > 44 && depth < 64) waves(g, 100, 44, depth - 44 + 2, SKY.muted, true, 1, 8, 18);
          if (depth > 90) waves(g, 100, 92, depth - 90 + 2, `rgba(255,90,90,${Math.max(0.25, 1 - (depth - 90) / 30).toFixed(2)})`, true, 2, 8, 40);
          g.text("SURFACE: PARTIAL REFLECTION", 152, 42, SKY.muted);
          g.text("TISSUE: ATTENUATION", 152, 66, SKY.muted);
          g.text("TUMOR: DIELECTRIC CONTRAST", 152, 92, SKY.tumor); g.line(150, 95, 108, 96, SKY.tumor);
          // signal strength against depth: steady in air, a drop at the surface, decaying in tissue
          if (t > 2.5) {
            g.box(186, 102, 66, 26, CARD, EDGE); g.text("AMPLITUDE VS. DEPTH", 189, 104, SKY.muted);
            let py = 112; for (let x = 0; x < 58; x++) { const v = x < 14 ? 112 : Math.round(116 + (1 - Math.exp(-(x - 14) / 16)) * 8); if (x) g.line(189 + x - 1, py, 189 + x, v, SKY.wave); py = v; }
          }
        } },
      { ch: 1, title: "Signal model: 20 × 20 MIMO", dur: 14.4, cap: "Signal model: each of the 20 transmitters fires in turn while all 20 receivers listen, giving 20 × 20 = 400 channels. Each channel is a 150-point frequency sweep (I/Q) from 62 to 69 GHz; an inverse FFT turns it into a 512-sample echo in time, where each peak is a reflector at a given distance.",
        subs: [[0.2, "Each of the 20 transmitters fires in turn while all 20 receivers listen."], [4.2, "This yields 400 channels, each a sweep over 150 frequencies."], [7.6, "An inverse FFT converts each sweep into a time-domain echo,"], [11.0, "where later arrivals correspond to deeper reflectors."]],
        draw(g, t, s) {
          room(g); chain(g, t < 7 ? [0] : [0, 1]);
          // beat 1: the board from above, one transmitter at a time, its row of the channel matrix filling
          const tx = Math.min(19, Math.floor(t / 0.17)), firing = t < 3.4;
          g.box(40, 24, 50, 50, "#2e7d4a", OUT, "#4fa36a"); g.rect(56, 40, 18, 16, "#d6dadf"); for (let i = 0; i < 8; i++) g.rect(57 + i * 2, 41, 1, 14, "#9aa1a8");
          for (let i = 0; i < 20; i++) { g.rect(42, 27 + i * 2, 2, 1, firing && i === tx ? "#ffffff" : "#7dffa1"); g.rect(44 + i * 2, 70, 1, 2, firing && blinkOn(t, 0.2) ? "#ffd27a" : "#f2994a"); }
          if (firing) g.ring(43, 27 + tx * 2, 4 + (tick(t, 12) * 30) % 10, "rgba(125,255,161,.7)", -Math.PI / 2, Math.PI / 2);
          g.text("TX 1-20", 65, 16, "#7dffa1", 1, "c"); g.text("RX 21-40", 65, 78, "#f2994a", 1, "c");
          arrow(g, 96, 108, 49, SKY.muted);
          const X0 = 112, Y0 = 19, C = 3, full = !firing;
          g.rect(X0 - 1, Y0 - 1, 20 * C + 2, 20 * C + 2, EDGE);
          for (let j = 0; j < 20; j++) for (let i = 0; i < 20; i++) g.rect(X0 + i * C, Y0 + j * C, C, C, full || j < tx ? ((i + j) % 2 ? "#3b82c4" : "#4f93d4") : j === tx ? "#9cc8f0" : CARD);
          g.text("400 CHANNELS", X0 + 30, Y0 + 64, SKY.ink, 1, "c"); g.text("ROWS: TX  COLS: RX", X0 + 30, Y0 + 72, SKY.muted, 1, "c");
          // beat 2: one channel picked out: its frequency sweep
          if (t > 3.6) {
            const ci = 13, cj = 6; g.ring(X0 + ci * C + 1, Y0 + cj * C + 1, 4, "#fff");
            g.line(X0 + ci * C + 5, Y0 + cj * C + 1, 184, 24, "rgba(255,255,255,.6)");
            g.alpha(ease((t - 3.6) / 0.5), () => {
              g.box(184, 16, 74, 36, CARD, EDGE); g.text("1 CHANNEL", 188, 19, SKY.ink); g.text("150 PTS", 254, 19, SKY.muted, 1, "r");
              for (let x = 0; x < 66; x++) { const v = Math.round(6 * Math.cos(x * 0.9) * (0.6 + 0.4 * Math.sin(x * 0.13))); g.px(188 + x, 36 - v, SKY.wave); }
              g.text("62 GHz", 188, 45, SKY.muted); g.text("69 GHz", 254, 45, SKY.muted, 1, "r");
            });
          }
          // beat 3: the inverse FFT: an echo in time, with the surface and the tumor as peaks
          if (t > 7.2) {
            g.alpha(ease((t - 7.2) / 0.5), () => {
              g.rect(220, 53, 1, 7, SKY.accent); g.rect(219, 58, 3, 1, SKY.accent); g.px(220, 59, SKY.accent); g.text("IFFT", 225, 54, SKY.accent);
              g.box(184, 62, 74, 46, CARD, EDGE); g.text("1 ECHO", 188, 65, SKY.ink); g.text("512 PTS", 254, 65, SKY.muted, 1, "r");
              trace(g, 188, 254, 94, 204, 9, SKY.ink); trace(g, 220, 254, 94, 238, 4, SKY.tumor);
            });
            if (t > 9.6) g.alpha(ease((t - 9.6) / 0.5), () => { g.text("SURFACE", 204, 74, SKY.ink, 1, "c"); g.text("TUMOR", 238, 81, SKY.tumor, 1, "c"); g.text("LATER = DEEPER", 221, 101, SKY.accent, 1, "c"); });
          }
        } },
      { ch: 1, title: "Clutter removal: average subtraction", dur: 13.9, cap: "Clutter removal by average subtraction: antenna coupling and the surface reflection arrive early and look nearly the same in every channel. Their mean over all 400 channels is subtracted from each channel, which removes the shared early response while the tumor response, different in every channel, remains.",
        subs: [[0.2, "Every channel begins with a strong early response."], [3.1, "Because it is nearly identical across channels, I estimate it by averaging,"], [7.3, "and subtract that mean from each channel."], [9.7, "This suppresses the early response while preserving the tumor echo."]],
        draw(g, t, s) {
          room(g); chain(g, [2]);
          g.box(34, 16, 222, 104, CARD, EDGE, LITE);
          const late = [184, 196, 178, 202], sub = ease((t - 5.2) / 1.6);
          const wave = (y, early, tumorAt, col, x0 = 70, x1 = 250) => { let py = y; for (let x = x0; x <= x1; x++) { const d1 = x - 98, d2 = x - tumorAt, v = y - Math.round(early * Math.exp(-(d1 * d1) / 30) * Math.cos(d1 * 0.7) + (tumorAt ? 3 * Math.exp(-(d2 * d2) / 12) * Math.cos(d2 * 1.1) : 0)); if (x > x0) g.line(x - 1, py, x, v, col); py = v; } };
          // the channels: raw, then with the mean taken away
          for (let m = 0; m < 4; m++) { const y = 32 + m * 14; g.text(sub > 0.5 ? "S" + (m + 1) : "X" + (m + 1), 64, y - 2, SKY.muted, 1, "r"); wave(y, 9 * (1 - sub), late[m], SKY.wave); }
          g.text(sub > 0.5 ? "COUPLING + SURFACE REMOVED" : "EARLY: COUPLING + SURFACE", 98, 21, sub > 0.5 ? SKY.ok : SKY.muted, 1, "c");
          g.text("TUMOR (VARIES)", 192, 21, SKY.tumor, 1, "c");
          // the mean over all channels
          if (t > 2.6) g.alpha(ease((t - 2.6) / 0.5) * (1 - 0.6 * sub), () => { g.rect(40, 86, 210, 1, EDGE); g.text("MEAN", 64, 94, SKY.accent, 1, "r"); wave(96, 9, 0, SKY.accent); g.text("SHARED BY ALL 400 CHANNELS", 250, 89, SKY.accent, 1, "r"); });
          if (t > 5.2) g.alpha(ease((t - 5.2) / 0.5), () => g.text("SM(N) = XM(N) - MEAN(N)", 160, 110, SKY.ink, 1, "c"));
        } },
      { ch: 1, title: "Delay-and-sum beamforming", dur: 14, cap: "Delay-and-sum beamforming: for every point in the image, the round-trip distance from each transmitter to that point and back to each receiver gives a delay. Each channel is read at its own delay and all 400 are summed. Repeating this for every point builds the image; only at the tumor do the channels add up in phase.",
        subs: [[0.2, "To form an image, each point is considered in turn."], [3.1, "Its round-trip path determines the expected delay for every channel."], [7.0, "The channels are read at those delays and summed,"], [9.8, "so energy accumulates where the echoes align, ideally at the tumor."]],
        draw(g, t, s) {
          room(g); chain(g, [3]);
          // cross-section: the radar's antennas along the top, the phantom, the tumor
          const T = [44, 58, 72], Rr = [51, 65, 79], top = 26, tumor = [62, 92];
          g.rect(38, 18, 48, 6, "#2e7d4a"); T.forEach((x) => g.rect(x - 1, 24, 3, 2, "#7dffa1")); Rr.forEach((x) => g.rect(x - 1, 24, 3, 2, "#f2994a"));
          g.rect(34, 40, 60, 74, "#f6efdc"); g.disc(tumor[0], tumor[1], 4, 3, "#e0403f");
          // the image point being evaluated: first held still, then scanning the grid
          const NX = 12, NY = 14, gx0 = 36, gy0 = 42, gc = 4.6, scan = Math.max(0, (t - 6.8) / 3);
          const k = Math.min(NX * NY - 1, Math.floor(scan * NX * NY)), pi = t < 6.8 ? 3 : k % NX, pj = t < 6.8 ? 4 : Math.floor(k / NX);
          const px = gx0 + pi * gc + 2, py = gy0 + pj * gc + 2;
          const pairs = t < 5 ? [[0, 1]] : [[0, 0], [0, 1], [1, 2], [2, 0], [2, 2]];
          pairs.forEach(([a, b], n) => { const c = n === 0 ? "#ffffff" : "rgba(255,255,255,.35)"; g.line(T[a], top, px, py, c); g.line(px, py, Rr[b], top, c); });
          g.rect(px - 1, py - 1, 3, 3, SKY.accent);
          if (t > 2.8 && t < 6.8) g.alpha(ease((t - 2.8) / 0.5), () => { g.text("T = (D1 + D2) / V", 100, 30, SKY.ink); g.text("D1: TX TO POINT", 100, 40, SKY.muted); g.text("D2: POINT TO RX", 100, 48, SKY.muted); });
          // right: each channel read at its delay, summed into this point's value
          if (t > 5 && t < 6.8) g.alpha(ease((t - 5) / 0.5), () => { g.text("SUM OVER 400 CH", 100, 62, SKY.accent); g.text("> ONE PIXEL VALUE", 100, 70, SKY.accent); });
          // the image building up point by point
          const IX = 170, IY = 22, IC = 6;
          g.rect(IX - 1, IY - 1, NX * IC + 2, NY * IC + 2, EDGE);
          for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
            const done = t >= 6.8 && j * NX + i <= k, v = Math.exp(-((gx0 + i * gc + 2 - tumor[0]) ** 2) / 30 - ((gy0 + j * gc + 2 - tumor[1]) ** 2) / 70);
            g.rect(IX + i * IC, IY + j * IC, IC, IC, done ? g.jet(0.08 + 0.9 * v) : CARD);
          }
          if (t >= 6.8 && k < NX * NY - 1) g.rect(IX + pi * IC, IY + pj * IC, IC, IC, "#ffffff");
          g.text("IMAGE", IX + (NX * IC) / 2, IY + NY * IC + 4, SKY.muted, 1, "c");
        } },
      { ch: 1, title: "Delay-and-sum: try it", dur: 10.1, interactive: true, hint: "Click the image to move the target", cap: "Delay-and-sum beamforming: each channel is shifted by its round-trip delay to every image point and the channels are summed; they add coherently only at the target. Click the image to relocate the target.",
        subs: [[0.2, "At the tumor location, the delayed echoes add coherently,"], [3.5, "while elsewhere they largely cancel."], [6.2, "You can click the image to move the target and see the effect."]],
        draw(g, t, s, I, clock) {
          room(g); chain(g, [3]);
          s.tx ??= 9; s.ty ??= 6; s.t0 ??= 0;
          // five channels' echoes, each arriving at a different time, sliding into line
          g.box(52, 16, 84, 100, CARD, EDGE, LITE);
          g.text("DELAYED CHANNELS", 94, 20, SKY.muted, 1, "c");
          const align = s.c0 != null ? ease((clock - s.c0) / 1.2) : ease((t - 1) / 2.5), delays = [-14, 9, -6, 16, -10];
          for (let k = 0; k < 5; k++) {
            const y = 34 + k * 12, c = 92 + delays[k] * (1 - align);
            trace(g, 58, 130, y, c, 5, SKY.wave);
          }
          for (let y = 28; y < 84; y += 3) g.px(92, y, SKY.accent);
          g.text("COHERENT SUM", 97, 88, SKY.muted);
          const amp = 2 + 10 * align;
          trace(g, 58, 130, 102, 92, amp, SKY.accent);
          // the image: a grid of cells, the tumor's cell glowing once the echoes line up
          const X0 = 146, Y0 = 20, C = 6, NX = 16, NY = 13;
          g.rect(X0 - 1, Y0 - 1, NX * C + 2, NY * C + 2, "#111");
          const grow = s.c0 != null ? ease((clock - s.c0 - 0.9) / 1.2) : ease((t - 3) / 1.5);
          for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
            const d2 = ((i - s.tx) ** 2) / 2.2 + ((j - s.ty) ** 2) / 5, n = 0.08 + 0.06 * Math.sin(i * 12.9 + j * 7.1 + Math.floor(t * 3));
            g.rect(X0 + i * C, Y0 + j * C, C, C, g.jet(Math.min(1, n + grow * Math.exp(-d2) * 0.95)));
          }
          if (grow > 0.9) g.ring(X0 + s.tx * C + 3, Y0 + s.ty * C + 3, 7, "#fff");
          s.hit = { X0, Y0, C, NX, NY };
        },
        click(s, x, y, t, clock) {
          const h = s.hit; if (!h) return;
          const i = Math.floor((x - h.X0) / h.C), j = Math.floor((y - h.Y0) / h.C);
          if (i >= 0 && j >= 0 && i < h.NX && j < h.NY) { s.tx = i; s.ty = j; s.c0 = clock; }
        } },
      { ch: 1, title: "Background subtraction and localization", dur: 8.6, cap: "Background subtraction and localization: an empty-scene image is subtracted from the target image to remove the enclosure's reflections, values unrelated to the target are set to zero, and the centroid of what remains is compared with the true position (MSE).",
        subs: [[0.3, "I then subtract a scan of the empty enclosure,"], [3.2, "remove values unrelated to the target,"], [5.5, "and compare its centroid with the true position."]],
        draw(g, t, s) {
          room(g); chain(g, t < 4.4 ? [4] : [4, 5]);
          const tgt = (i, j) => 0.12 + 0.75 * Math.exp(-((i - 6) ** 2) / 2 - ((j - 6) ** 2) / 3);
          const bg = (i, j) => 0.1 + 0.55 * Math.exp(-((j - 1) ** 2) / 1.5) * (0.6 + 0.4 * Math.sin(i * 0.9)) + 0.15 * Math.exp(-((i - 1) ** 2) / 2 - ((j - 9) ** 2) / 3);
          const C = 4, N = 12, Y = 22;
          heat(g, 56, Y, N, N, C, (i, j) => Math.min(1, tgt(i, j) + bg(i, j)));
          g.text("TARGET SCAN", 80, Y + 52, SKY.ink, 1, "c");
          if (t > 0.8) { g.text("-", 112, Y + 20, SKY.ink, 2, "c"); heat(g, 122, Y, N, N, C, bg); g.text("EMPTY SCENE", 146, Y + 52, SKY.ink, 1, "c"); }
          if (t > 1.8) {
            g.text("=", 178, Y + 20, SKY.ink, 2, "c");
            const thr = t > 3.2;
            heat(g, 188, Y, N, N, C, (i, j) => { const v = tgt(i, j) - 0.1; return thr ? (v > 0.25 ? v / 0.65 : 0) : v / 0.65; });
            g.text(thr ? "THRESHOLDED" : "TARGET ONLY", 212, Y + 52, SKY.ink, 1, "c");
            if (t > 4.4) { const cx = 188 + 6.5 * C, cy = Y + 6.5 * C; g.ring(cx, cy, 9, "#fff"); g.rect(cx - 3, cy, 7, 1, "#fff"); g.rect(cx, cy - 3, 1, 7, "#fff"); }
          }
          if (t > 4.4) g.text("CENTROID VS. TRUE POSITION  >  MSE (cm²)", 150, 100, SKY.ink, 1, "c");
        } },
      { ch: 2, title: "Phantom results", dur: 12.3, cap: "Phantom results: maximum detection depth 2 cm, minimum detectable size 0.6 cm, and correct localization at every position tested. Beneath a skin layer the tumor was not detected, as penetration at these frequencies is limited.",
        subs: [[0.2, "In these phantom experiments, targets were detected up to 2 cm deep,"], [4.0, "with a minimum size of 0.6 cm,"], [5.9, "and were localized at each tested position."], [8.4, "Beneath a skin layer, however, the tumor could not be detected."]],
        draw(g, t, s, I) {
          room(g);
          const panel = (k, x, y, title, good) => { g.box(x, y, 90, 52, CARD, EDGE, LITE); g.text(title, x + 4, y + 4, SKY.ink); if (t > 0.9 + k * 1.5) g.tag(good ? "✓" : "×", x + 84, y + 2, good ? SKY.ok : SKY.bad, "#fff", "r"); return t > 0.2 + k * 1.5; };
          // depth: a column of tissue with a ruler, the tumor at 2 cm
          if (panel(0, 56, 10, "MAX DEPTH: 2 cm", true)) { g.box(66, 22, 30, 36, SKY.fat); g.disc(81, 46, 4, 3, SKY.tumor); for (let y = 22; y < 58; y += 6) g.rect(98, y, 3, 1, SKY.ink); g.text("2 cm", 104, 44, SKY.accent); g.line(102, 24, 102, 44, SKY.accent); }
          // size: dots of 1, 0.8, 0.6 found; 0.5 lost
          if (panel(1, 152, 10, "MIN SIZE: 0.6 cm", true)) [[1, 6], [0.8, 5], [0.6, 4], [0.5, 3]].forEach(([cm, r], i) => { const x = 166 + i * 20; g.disc(x, 40, r, r, i < 3 ? SKY.tumor : "#e8c8c8"); g.text(String(cm).replace("0.", "."), x, 52, i < 3 ? SKY.ink : "#b9a0a0", 1, "c"); });
          // location: the true circle, the found spot inside it
          if (panel(2, 56, 70, "LOCALIZATION", true)) { g.rect(66, 82, 76, 36, "#1c2a7a"); [[78, 92], [104, 100], [128, 90]].forEach(([x, y], i) => { g.ring(x, y, 6, "#fff"); g.disc(x + (i - 1), y, 2, 2, "#ffd23f"); }); }
          // under skin: waves bounce off the skin layer, nothing reaches the tumor
          if (panel(3, 152, 70, "WITH SKIN LAYER", false)) { g.rect(162, 92, 76, 26, SKY.fat); g.rect(162, 90, 76, 3, "#e9a3a3"); g.disc(200, 108, 4, 3, SKY.tumor); const r = (tick(t, 8) * 20) % 14; waves(g, 200, 80, r + 2, "#7fd1ff", false, 1, 8, 12); if (r > 8) waves(g, 200, 90, r - 6, SKY.hot, true, 1, 8, 10); }
        } },
      { ch: 2, title: "Why skin and fur are difficult", dur: 11.7, cap: "Why skin and fur are difficult: skin's high water content gives a strong surface reflection and absorbs most of the remaining energy within about 1 mm. Fur and an uneven surface scatter the wave into clutter that differs between channels, so average subtraction cannot remove it.",
        subs: [[0.3, "Skin is water-rich, so it reflects much of the incident wave"], [3.7, "and absorbs most of the remainder within about a millimeter."], [7.1, "Fur also scatters the wave, producing clutter that varies between channels."]],
        draw(g, t, s) {
          room(g);
          const panel = (x, title) => { g.box(x, 10, 94, 106, CARD, EDGE, LITE); g.text(title, x + 47, 14, SKY.ink, 1, "c"); };
          const r = (tick(t, 10) * 26) % 40;
          // skin: a thin, water-rich layer that reflects strongly and soaks up what gets through
          panel(56, "SKIN LAYER");
          g.rect(57, 62, 92, 6, "#e9a3a3"); g.rect(57, 68, 92, 47, "#f6efdc"); g.disc(138, 108, 4, 3, "rgba(224,48,47,.55)");
          if (r < 26) g.ring(103, 30, r + 4, SKY.wave, Math.PI * 0.2, Math.PI * 0.8, (r + 4) * 0.5);
          if (r > 26) { waves(g, 103, 62, r - 24, SKY.hot, true, 2, 6, 20); g.ring(103, 62, r - 24, "rgba(59,130,196,.3)", Math.PI * 0.25, Math.PI * 0.75, (r - 24) * 0.25); }
          g.text("HIGH WATER CONTENT", 103, 76, "#b02a2a", 1, "c"); g.text("STRONG REFLECTION", 103, 84, "#2a2f3a", 1, "c"); g.text("ABSORBED IN <1 mm", 103, 92, "#2a2f3a", 1, "c");
          g.text("TUMOR NOT REACHED", 100, 106, "#b02a2a", 1, "c");
          // fur: strands about the size of the wavelength scatter it every way
          panel(156, "FUR + UNEVEN SURFACE");
          g.rect(157, 76, 92, 39, "#f6efdc");
          for (let i = 0; i < 22; i++) { const x = 160 + i * 4, h = 8 + ((i * 7) % 6); g.line(x, 76, x + ((i % 3) - 1) * 2, 76 - h, "#6b5a4a"); }
          if (r < 22) g.ring(203, 30, r + 4, SKY.wave, Math.PI * 0.2, Math.PI * 0.8, (r + 4) * 0.5);
          if (r > 20) [[172, 64], [190, 60], [210, 66], [228, 61], [240, 68]].forEach(([x, y], i) => g.ring(x, y, (r - 20) * 0.5 + (i % 2), "rgba(255,90,90,.8)", i % 2 ? Math.PI : 0, (i % 2 ? Math.PI : 0) + Math.PI * 1.1, (r - 20) * 0.35));
          g.text("SCATTERING CLUTTER", 203, 84, "#2a2f3a", 1, "c"); g.text("DIFFERS PER CHANNEL", 203, 92, "#2a2f3a", 1, "c"); g.text("NOT REMOVED BY", 203, 100, "#b02a2a", 1, "c"); g.text("AVERAGE SUBTRACTION", 203, 107, "#b02a2a", 1, "c");
        } },
      { ch: 2, title: "Key findings and future work", dur: 8.6, cap: "Future work: improved hardware, reconstruction algorithms beyond delay-and-sum, and anatomical sites without a skin barrier.",
        subs: [[0.3, "These results point to a clear trade-off between resolution and depth."], [4.2, "Future work could explore improved hardware and reconstruction methods."]],
        draw(g, t, s, I) {
          room(g);
          g.box(60, 16, 186, 82, CARD, EDGE, LITE);
          g.text("KEY FINDINGS", 153, 24, SKY.accent, 1, "c");
          ["RESOLUTION VS. DEPTH TRADE-OFF", "SKIN PENETRATION IS LIMITING", "MULTI-ANGLE FUSION AIDS SIZING", "VALIDATED PHANTOMS ARE ESSENTIAL"].forEach((l, i) => { if (t > 0.5 + i * 0.9) { g.text("+", 70, 40 + i * 12, SKY.ok); g.text(l, 78, 40 + i * 12, SKY.ink); } });
          if (t > 4.5) g.text("KAO AND CHAO, IEEE ECBIOS 2022", 153, 106, SKY.muted, 1, "c");
        } },
    ],
  },
  sigma: {
    title: "Automatic Sigma rule generation · overview",
    chapters: ["Motivation", "Method", "Evaluation"],
    scenes: [
      { ch: 0, title: "Introduction", dur: 8.8, cap: "Research project: generating Sigma detection rules automatically with language and vision models, Applied Machine Learning Research, Texas A&M (2025 to 2026).",
        subs: [[0.3, "This project asks whether language models can help write security detection rules."], [4.9, "It was carried out with Texas A&M's Applied ML Research group."]],
        draw(g, t) {
          room(g);
          const up = (t0) => [ease((t - t0) / 0.6), Math.round(6 * (1 - ease((t - t0) / 0.6)))];
          let [a, d] = up(0.1); g.alpha(a, () => g.text("Sigma rule", 153, 18 + d, SKY.ink, 2, "c"));
          [a, d] = up(0.4); g.alpha(a, () => g.text("generation", 153, 33 + d, SKY.accent, 2, "c"));
          [a, d] = up(1.0); g.alpha(a, () => g.text("WITH LANGUAGE AND VISION MODELS", 153, 55 + d, SKY.ink, 1, "c"));
          [a, d] = up(1.3); g.alpha(a, () => g.text("APPLIED ML RESEARCH, TEXAS A&M, 2025-2026", 153, 65 + d, SKY.muted, 1, "c"));
          // a small terminal writing a rule
          g.box(104, 80, 98, 44, "#0b0c0f", "#3a3f4a"); g.rect(105, 81, 96, 6, "#1d2027"); [0, 1, 2].forEach((i) => g.rect(108 + i * 5, 83, 3, 2, ["#e06a5f", "#e8c35f", "#6cc49a"][i]));
          const n = Math.min(5, Math.floor(Math.max(0, t - 1.6) * 2.2));
          [[0, "title", "Suspicious Download"], [0, "detection", ""], [1, "selection", ""], [2, "Image|endswith", "'\\curl.exe'"], [1, "condition", "selection"]].slice(0, n).forEach((l, i) => yamlLine(g, 109, 90 + i * 6.4, l));
          if (blinkOn(t, 0.6)) g.rect(109 + (n < 5 ? 0 : 66), 90 + Math.min(n, 4) * 6.4, 3, 5, SKY.ink);
        } },
      { ch: 0, title: "Detection rules are written by hand", dur: 11, cap: "Security teams learn about new attack techniques every day, and each one needs a detection rule that a security analyst writes and tests by hand. Reports arrive faster than rules can be written.",
        subs: [[0.3, "New attack techniques are reported continually,"], [3.0, "and each one needs a detection rule, usually written by an analyst."], [6.8, "This is careful, expert work, and it can be difficult to keep pace."]],
        draw(g, t) {
          room(g);
          // the log stream, scrolling, now and then a suspicious line
          g.box(34, 16, 74, 100, CARD, EDGE, LITE); g.text("LOG STREAM", 71, 20, SKY.muted, 1, "c");
          const off = Math.floor(t * 8);
          for (let i = 0; i < 12; i++) { const k = i + off, bad = k % 7 === 3, y = 30 + i * 7; g.rect(38, y, 4, 3, bad ? SKY.bad : "#3a3f4a"); g.rect(45, y, 18 + ((k * 13) % 30), 3, bad ? "#7a3a36" : "#2c3038"); }
          analyst(g, 130, 82, t); g.text("ANALYST", 152, 108, SKY.muted, 1, "c");
          // threat reports piling up; rules trickling out
          const reps = Math.min(14, Math.floor(t * 2.2));
          g.text("NEW THREAT REPORTS", 236, 16, SKY.ink, 1, "c");
          for (let i = 0; i < reps; i++) { const x = 212 + (i % 2) * 22 + ((i * 7) % 5), y = 92 - Math.floor(i / 2) * 9; g.rect(x, y, 20, 8, OUT); g.rect(x + 1, y + 1, 18, 6, "#e9ecef"); g.rect(x + 3, y + 3, 10, 1, SKY.bad); }
          g.rect(206, 101, 54, 2, "#3a3f4a");
          const rules = t > 3 ? 1 : 0, prog = Math.min(1, Math.max(0, (t - 3) / 5));
          g.text("RULES WRITTEN", 236, 110, SKY.ink, 1, "c"); g.rect(212, 119, 48, 4, "#2c3038"); g.rect(212, 119, Math.round(48 * prog), 4, SKY.ok);
          if (t > 5.4) g.alpha(ease((t - 5.4) / 0.4), () => g.tag(`${reps} REPORTS : ${rules} RULE`, 152, 117, SKY.bad, "#fff", "c"));
        } },
      { ch: 0, title: "What is a Sigma rule?", dur: 11.5, cap: "Sigma is an open, YAML-based format for detection rules. A rule names the log source to look at and the pattern to match (selections combined by a condition), and converts into queries for many security tools.",
        subs: [[0.3, "Many such rules are written in Sigma, an open YAML-based format."], [3.9, "A rule specifies which logs to examine and which pattern to match,"], [7.6, "and it can be converted into queries for many security tools."]],
        draw(g, t) {
          room(g);
          g.box(32, 14, 124, 92, CARD, EDGE, LITE);
          const hi = t < 3.2 ? -1 : t < 4.6 ? 1 : t < 6.2 ? 3 : -1;
          yamlBlock(g, 37, 19, RULE, { lh: 7, upto: Math.floor(t * 6) + 1 });
          // brackets: what, where, how
          const br = (y0, y1, lab, t0) => { if (t < t0) return; g.alpha(ease((t - t0) / 0.4), () => { g.rect(158, y0, 2, 1, SKY.accent); g.rect(160, y0, 1, y1 - y0, SKY.accent); g.rect(158, y1, 2, 1, SKY.accent); g.text(lab, 164, Math.round((y0 + y1) / 2) - 3, SKY.accent); }); };
          br(19, 24, "WHAT IT DETECTS", 2.2); br(26, 38, "WHERE: LOG SOURCE", 3.2); br(40, 94, "HOW: PATTERN + CONDITION", 4.6);
          if (t > 6.2) g.alpha(ease((t - 6.2) / 0.5), () => {
            g.text("CONVERTS TO", 164, 84, SKY.muted);
            ["SIEM QUERY", "EDR QUERY", "LOG SEARCH"].forEach((l, i) => { const y = 94 + i * 11; g.rect(164, y + 4, 8, 1, "#5d626b"); g.tag(l, 176, y, "#2c313c", SKY.ink); });
          });
        } },
      { ch: 0, title: "Goal: from a description to a rule", dur: 11.8, cap: "The goal: describe the threat in plain language and have a model write the Sigma rule. A rule that looks right can still fail to parse, use the wrong field, or encode the wrong logic.",
        subs: [[0.3, "Our aim was to start from a plain-language description of a threat"], [4.0, "and have a language model draft the corresponding rule."], [7.2, "A key challenge is that a rule can appear plausible and still be incorrect."]],
        draw(g, t) {
          room(g);
          // the description
          g.box(30, 22, 64, 58, "#e9ecef", OUT);
          ["Detect proxy", "traffic to the", "OneDrive manifest", "URL, but skip", "ordinary web", "requests."].forEach((l, i) => g.alpha(ease((t - 0.3 - i * 0.22) / 0.3), () => g.text(l, 34, 27 + i * 8.4, "#2a2f3a")));
          if (t > 2.4) { arrow(g, 97, 112, 51, SKY.muted); chip(g, 129, 51, "LLM", SKY.accent, 30); arrow(g, 147, 161, 51, SKY.muted); }
          if (t > 2.8) { g.box(163, 16, 116, 66, CARD, EDGE, LITE); yamlBlock(g, 167, 21, DETECT, { lh: 7.6, upto: Math.floor((t - 2.8) * 4) }); }
          if (t > 5.2) g.alpha(ease((t - 5.2) / 0.5), () => {
            ["PARSES?", "RIGHT FIELDS?", "RIGHT LOGIC?"].forEach((q, i) => g.tag(q, 120 + i * 52, 104, "#2c313c", SKY.ink, "c"));
            g.text("LOOKING RIGHT IS NOT BEING RIGHT", 172, 120, SKY.bad, 1, "c");
          });
        } },
      { ch: 1, title: "Building the dataset", dur: 13.1, cap: "Dataset: public Sigma rules were crawled from GitHub (6,815 files), then validated: valid YAML, the required fields, a usable detection block, no duplicates. Files that only looked like Sigma rules (app configs, playbooks) were removed.",
        subs: [[0.3, "We began by collecting 6,815 publicly available Sigma rules from GitHub."], [4.3, "Each file was checked for valid YAML, required fields and usable detection logic,"], [8.9, "and duplicates or files that only resembled Sigma rules were removed."]],
        draw(g, t) {
          room(g); chain(g, t < 3.2 ? [0] : [0, 1], SIGMA_CHAIN);
          for (let i = 0; i < 12; i++) repo(g, 36 + (i % 3) * 20, 26 + Math.floor(i / 3) * 18);
          g.text("PUBLIC REPOS", 64, 100, SKY.muted, 1, "c");
          const n = Math.round(6815 * ease(t / 3));
          g.tag(`${n.toLocaleString("en-US")} RULES COLLECTED`, 64, 108, n >= 6815 ? SKY.accent : CARD, n >= 6815 ? "#fff" : SKY.ink, "c");
          // files flying into the funnel, a few rejected
          for (let k = 0; k < 6; k++) {
            const p = ((t * 0.9 + k / 6) % 1), bad = k === 2 && t > 6.2, sx = 96, sy = 30 + k * 10;
            if (p < 0.5) doc(g, sx + (150 - sx) * (p / 0.5), sy + (28 - sy) * (p / 0.5), bad ? "#f3c9c4" : "#e9ecef");
            else if (bad) doc(g, 172 + (p - 0.5) * 30, 58 + (p - 0.5) * 80, "#f3c9c4", SKY.bad);
            else if (t > 3.2) doc(g, 146, 46 + (p - 0.5) * 80, "#e9ecef");
          }
          for (let y = 0; y < 30; y++) { const w = Math.round(26 - y * 0.6); g.rect(150 - w, 40 + y, 2 * w + 8, 1, y === 0 ? SKY.ink : "rgba(127,176,240,.18)"); g.px(150 - w, 40 + y, SKY.wave); g.px(157 + w, 40 + y, SKY.wave); }
          cylinder(g, 152, 98, 16, 4, 14, ["#2e6b4a", "#3a8a5e", "#33794f", "#285f41"], "#5fc08a");
          g.text("CLEAN DATASET", 152, 122, SKY.ok, 1, "c");
          [["VALID YAML", 3.4], ["REQUIRED FIELDS", 4.0], ["DETECTION LOGIC", 4.6], ["NO DUPLICATES", 5.4], ["LOOK-ALIKE FILES", 6.2]].forEach(([l, t0], i) => {
            if (t < t0) return; const y = 30 + i * 13, bad = i === 4;
            g.alpha(ease((t - t0) / 0.4), () => { g.tag(bad ? "×" : "✓", 192, y - 2, bad ? SKY.bad : SKY.ok, "#fff"); g.text(l, 207, y, bad ? SKY.bad : SKY.ink); });
          });
        } },
      { ch: 1, title: "From rule to syntax tree", dur: 13.2, interactive: true, hint: "Click a node in the tree to find its line", cap: "Each rule is parsed into an abstract syntax tree (AST): keys, fields, values and the logic of the condition become nodes. The tree converts back to YAML without loss, so it can stand in for the rule. Click a node to find its line.",
        subs: [[0.2, "Each rule is then parsed into an abstract syntax tree."], [3.4, "Keys, fields and the logic of the condition become nodes,"], [6.7, "and the tree can be converted back to YAML without loss."], [9.8, "You can click a node to see the line it comes from."]],
        draw(g, t, s, I, clock) {
          room(g); chain(g, [2], SIGMA_CHAIN);
          // the tree: [id, label, cx, row, parent, kind, yaml line]
          const N = [["det", "detection", 156, 0, null, "k", 0], ["sel", "selection", 93, 1, "det", "k", 1], ["fil", "filter", 189, 1, "det", "k", 5], ["con", "condition", 238, 1, "det", "k", 7],
            ["f1", "cs-method", 45, 2, "sel", "f", 2], ["f2", "c-uri|endswith", 93, 2, "sel", "f", 3], ["f3", "cs-host", 140, 2, "sel", "f", 4], ["f4", "c-uri|startswith", 189, 2, "fil", "f", 6],
            ["and", "AND", 238, 2, "con", "l", 7], ["r1", "selection", 216, 3, "and", "r", 7], ["not", "NOT", 256, 3, "and", "l", 7], ["r2", "filter", 256, 4, "not", "r", 7]];
          const ROW = [74, 86, 98, 110, 121], COL = { k: SKY.wave, f: "#c9ccd2", l: SKY.accent, r: "#5d626b" };
          const shown = (row) => t > 0.6 + row * 0.7;
          const auto = N[Math.floor(Math.max(0, t - 3.4) / 0.6) % N.length], pick = s.pick ? N.find((n) => n[0] === s.pick) : t > 3.4 ? auto : null;
          yamlBlock(g, 36, 18, DETECT, { lh: 6.8, hi: pick ? pick[6] : -1, hiW: 112 });
          s.hits = [];
          N.forEach((n) => { if (!shown(n[3]) || !n[4]) return; const p = N.find((m) => m[0] === n[4]); elbow(g, p[2], ROW[p[3]] + 9, n[2], ROW[n[3]]); });
          N.forEach((n) => { if (!shown(n[3])) return; const b = tnode(g, n[2], ROW[n[3]], n[1], COL[n[5]], pick && pick[0] === n[0]); s.hits.push([n[0], b]); if (n[5] === "f") g.rect(n[2] - 1, ROW[n[3]] + 10, 3, 2, SKY.ok); });
          // legend and the round trip
          g.box(156, 16, 120, 50, CARD, EDGE, LITE);
          [["KEY", SKY.wave], ["FIELD (+ VALUE)", "#c9ccd2"], ["LOGIC", SKY.accent], ["REFERENCE", "#5d626b"]].forEach(([l, c], i) => { g.rect(161, 21 + i * 8, 5, 5, c); g.text(l, 170, 21 + i * 8, SKY.ink); });
          if (t > 6.4) g.alpha(ease((t - 6.4) / 0.5), () => g.text("AST > YAML: ROUND TRIP ✓", 216, 56, SKY.ok, 1, "c"));
        },
        click(s, x, y) { const h = (s.hits || []).find(([, b]) => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h); if (h) s.pick = h[0]; } },
      { ch: 1, title: "From syntax tree to prompt", dur: 11.9, cap: "A prompt generator walks the tree and writes a plain-language description of the rule: fields and modifiers become words, the condition becomes AND / OR / NOT. Each rule then has a matching prompt and AST, for training and testing.",
        subs: [[0.3, "Traversing the tree, we generate a plain-language description of each rule."], [4.5, "Fields and modifiers are rendered as words, such as \"ends with\"."], [8.1, "Each example thus pairs a prompt with its tree and its rule."]],
        draw(g, t) {
          room(g); chain(g, [3], SIGMA_CHAIN);
          // a small tree on the left
          const T = [[60, 22], [44, 40], [76, 40], [36, 58], [52, 58], [76, 58]]; [[0, 1], [0, 2], [1, 3], [1, 4], [2, 5]].forEach(([a, b]) => elbow(g, T[a][0], T[a][1] + 6, T[b][0], T[b][1]));
          T.forEach(([x, y], i) => { g.rect(x - 6, y, 12, 6, i === 0 ? SKY.wave : i < 3 ? SKY.wave : "#c9ccd2"); g.rect(x - 5, y + 1, 10, 4, CARD); });
          g.text("AST", 60, 70, SKY.muted, 1, "c");
          arrow(g, 92, 116, 42, SKY.accent, "PROMPTGEN");
          // the prompt being written
          g.box(120, 16, 156, 66, "#e9ecef", OUT);
          const P = ["Rule: Malleable OneDrive Profile.", "Log source: category 'proxy'.", "Detection: method is 'GET' AND URI", "ends with '?manifest=wac' AND host is", "'onedrive.live.com', AND NOT URI", "starts with 'http'. Severity: high."];
          P.forEach((l, i) => { const t0 = 0.5 + i * 0.45; if (t > t0) g.text(l.slice(0, Math.floor((t - t0) * 60)), 125, 21 + i * 9.6, "#2a2f3a"); });
          if (t > 3.4) g.alpha(ease((t - 3.4) / 0.4), () => {
            g.box(34, 84, 116, 26, CARD, EDGE, LITE);
            [["c-uri|endswith", "URI ENDS WITH"], ["cs-method", "METHOD"]].forEach(([a, b], i) => { yamlLine(g, 38, 89 + i * 10, [0, a, ""]); g.text("> " + b, 104, 89 + i * 10, SKY.ink); });
          });
          if (t > 6.2) g.alpha(ease((t - 6.2) / 0.5), () => {
            [["PROMPT", "#e9ecef"], ["AST", SKY.wave], ["RULE", SKY.ok]].forEach(([l, c], i) => { g.tag(l, 172 + i * 36, 96, c, SKY.bg, "c"); });
            g.text("ONE TRAINING EXAMPLE", 208, 110, SKY.muted, 1, "c");
          });
        } },
      { ch: 1, title: "Five ways to generate a rule", dur: 16.7, cap: "Five settings are compared: zero-shot (the prompt only), few-shot (with example pairs), fine-tuning on the prompt–rule pairs, AST-guided generation (the model also sees the rule's structure) and retrieval-augmented generation (templates and field mappings retrieved from a rule base), on open 7–8B instruction models.",
        subs: [[0.2, "We compared five settings, beginning with zero-shot and few-shot prompting,"], [4.4, "then fine-tuning on the prompt–rule pairs,"], [6.9, "then providing the rule's structure as a tree,"], [9.5, "and finally retrieving similar templates to guide generation,"], [13.0, "using open instruction models of 7 to 8 billion parameters."]],
        draw(g, t) {
          room(g); chain(g, [4], SIGMA_CHAIN);
          const E = [["EXP0", "ZERO-SHOT", "PROMPT ONLY", 0.3], ["EXP1", "FEW-SHOT", "+ EXAMPLE PAIRS", 1.6], ["EXP2", "FINE-TUNING", "TRAINED ON PAIRS", 3.0], ["EXP3", "AST-GUIDED", "+ RULE STRUCTURE", 5.0], ["EXP4", "RAG", "+ RETRIEVED TEMPLATES", 7.2]];
          E.forEach(([id, name, desc, t0], i) => {
            if (t < t0) return; const y = 20 + i * 20, on = (i === 0 && t < 3) || (i === 1 && t >= 1.6 && t < 3) || (i === 2 && t >= 3 && t < 5) || (i === 3 && t >= 5 && t < 7.2) || (i === 4 && t >= 7.2 && t < 9.4);
            g.alpha(ease((t - t0) / 0.4), () => {
              g.box(32, y - 2, 174, 18, on ? "#24262c" : CARD, on ? SKY.accent : EDGE);
              g.text(id, 37, y + 4, SKY.accent); g.text(name, 60, y + 1, SKY.ink); g.text(desc, 60, y + 8, SKY.muted);
              // what goes in: the prompt card, and the extra input
              const ix = 150; g.rect(ix, y + 1, 9, 11, "#e9ecef"); g.rect(ix + 2, y + 4, 5, 1, "#2a2f3a"); g.rect(ix + 2, y + 7, 4, 1, "#2a2f3a");
              if (i === 1) [0, 1].forEach((k) => { g.rect(ix + 13 + k * 12, y + 1, 9, 11, "#cfd5dc"); g.rect(ix + 15 + k * 12, y + 4, 5, 1, SKY.ok); });
              if (i === 2) { g.rect(ix + 14, y + 2, 20, 10, "#2c313c"); g.text("TRAIN", ix + 24, y + 4, SKY.ink, 1, "c"); }
              if (i === 3) { [[ix + 20, y + 1], [ix + 15, y + 8], [ix + 25, y + 8]].forEach(([x, yy], k) => { g.rect(x - 2, yy, 5, 4, k ? "#c9ccd2" : SKY.wave); if (k) g.rect(ix + 20, y + 5, 1, 3, "#5d626b"); }); g.rect(ix + 15, y + 6, 11, 1, "#5d626b"); }
              if (i === 4) { cylinder(g, ix + 22, y + 2, 6, 2, 7, ["#3a5f8f", "#4a78b0", "#3f6a9e", "#345683"], "#7fb0f0", { outline: null }); }
            });
          });
          if (t > 9.4) g.alpha(ease((t - 9.4) / 0.5), () => {
            g.box(212, 18, 64, 62, CARD, EDGE, LITE); g.text("BASE MODELS", 244, 22, SKY.muted, 1, "c");
            ["LLAMA 3.1 8B", "GEMMA 7B", "QWEN2.5 7B", "MISTRAL 7B", "FALCON 7B"].forEach((m, i) => g.text(m, 244, 33 + i * 9, SKY.ink, 1, "c"));
          });
        } },
      { ch: 1, title: "Adding vision: the tree as a picture", dur: 10.6, cap: "Beyond text, the rule's structure can be given as a picture: the AST is drawn as a diagram and a vision-language model reads it together with the prompt, so the structure is shown, not only described.",
        subs: [[0.3, "The syntax tree can also be rendered as a diagram."], [3.2, "A vision-language model can then read it together with the prompt,"], [6.9, "so that the structure is shown rather than only described."]],
        draw(g, t) {
          room(g); chain(g, [4], SIGMA_CHAIN);
          // the prompt and the diagram
          g.box(30, 18, 64, 40, "#e9ecef", OUT); g.text("PROMPT", 34, 22, "#5d626b"); for (let i = 0; i < 4; i++) g.rect(34, 32 + i * 6, [52, 44, 54, 28][i], 2, "#9aa3ad");
          if (t > 0.3) g.alpha(ease((t - 0.3) / 0.5), () => {
            g.rect(30, 64, 64, 54, "#f6f2e6"); g.rect(30, 64, 64, 1, OUT); g.rect(30, 117, 64, 1, OUT); g.rect(30, 64, 1, 54, OUT); g.rect(93, 64, 1, 54, OUT);
            g.text("AST DIAGRAM", 34, 68, "#5d626b");
            const T = [[62, 78, SKY.wave], [44, 92, SKY.wave], [62, 92, SKY.wave], [80, 92, SKY.accent], [37, 106, "#9aa3ad"], [51, 106, "#9aa3ad"], [62, 106, "#9aa3ad"], [80, 106, SKY.accent]];
            [[0, 1], [0, 2], [0, 3], [1, 4], [1, 5], [2, 6], [3, 7]].forEach(([a, b]) => g.line(T[a][0], T[a][1] + 5, T[b][0], T[b][1], "#7d8590"));
            T.forEach(([x, y, c]) => { g.rect(x - 5, y, 10, 6, OUT); g.rect(x - 4, y + 1, 8, 4, c); });
          });
          if (t > 2.6) { g.line(96, 38, 108, 60, SKY.muted); g.line(96, 90, 108, 68, SKY.muted); arrow(g, 108, 114, 64, SKY.muted); }
          if (t > 3) {
            chip(g, 130, 64, "", SKY.wave, 30, 22);
            g.ring(130, 64, 7, SKY.wave, 0, Math.PI * 2, 4); g.disc(130, 64, 2, 2, blinkOn(t, 1.2) ? SKY.wave : "#3a5f8f");
            g.text("VLM", 130, 80, SKY.wave, 1, "c");
            arrow(g, 147, 161, 64, SKY.muted);
            g.box(163, 30, 116, 66, CARD, EDGE, LITE); yamlBlock(g, 167, 35, DETECT, { lh: 7.6, upto: Math.floor((t - 3.2) * 4) });
          }
          if (t > 5.4) g.alpha(ease((t - 5.4) / 0.4), () => g.text("TEXT + IMAGE IN, RULE OUT", 221, 106, SKY.accent, 1, "c"));
        } },
      { ch: 2, title: "Check 1: does the rule hold together?", dur: 10.1, cap: "Every generated rule goes through a validator: does the YAML parse, are the required fields present, does the condition only use selections that exist, and does it survive the round trip through the AST?",
        subs: [[0.3, "Each generated rule is first checked by a validator:"], [3.3, "does the YAML parse, and are the required fields present?"], [6.5, "Does the condition refer only to selections that exist?"]],
        draw(g, t) {
          room(g); chain(g, [5], SIGMA_CHAIN);
          // the result list
          g.box(32, 18, 244, 62, CARD, EDGE, LITE);
          const R = [["RULE A", true, "PARSES, FIELDS PRESENT, ROUND TRIP OK", 0.3], ["RULE B", false, "YAML DOES NOT PARSE (BAD INDENTATION)", 3.2], ["RULE C", false, "CONDITION USES 'filter', WHICH IS NOT DEFINED", 6]];
          R.forEach(([n, ok, msg, t0], i) => { if (t < t0 + 1.6) return; const y = 26 + i * 16; g.alpha(ease((t - t0 - 1.6) / 0.3), () => { g.tag(ok ? "✓" : "×", 38, y - 2, ok ? SKY.ok : SKY.bad, "#fff"); g.text(n, 52, y, SKY.ink); g.text(msg, 84, y, ok ? SKY.ok : SKY.bad); }); });
          // the conveyor belt and the validator
          g.rect(32, 116, 120, 4, "#2c313c"); for (let x = 0; x < 120; x += 8) g.rect(32 + ((x + Math.floor(t * 20)) % 120), 117, 3, 2, "#4a4f59");
          g.box(152, 92, 50, 30, "#1b1e24", SKY.accent); g.text("VALIDATOR", 177, 103, SKY.accent, 1, "c");
          R.forEach(([, ok, , t0], i) => { const p = (t - t0) / 1.6; if (p < 0 || p > 1.6) return; if (p < 1) doc(g, 40 + p * 106, 104, "#e9ecef"); else doc(g, 208 + (p - 1) * 60, 104, ok ? "#d4f0e0" : "#f3c9c4", ok ? SKY.ok : SKY.bad); });
          g.rect(202, 116, 74, 4, "#2c313c");
        } },
      { ch: 2, title: "Check 2: how complex is the rule?", dur: 11, cap: "Structural complexity is compared with human-written rules. Halstead metrics count operators (AND, OR, NOT, field modifiers) and operands (fields and values) to give volume, difficulty and effort; cyclomatic complexity counts the independent paths through the condition.",
        subs: [[0.3, "We also compare structural complexity with that of human-written rules."], [4.3, "Halstead metrics count operators and operands,"], [7.0, "and cyclomatic complexity counts the paths through the condition."]],
        draw(g, t) {
          room(g); chain(g, [5], SIGMA_CHAIN);
          g.box(32, 16, 114, 64, CARD, EDGE, LITE);
          const segs = yamlBlock(g, 36, 21, DETECT, { lh: 7 });
          const ops = segs.filter((s) => s.kind === "op"), opn = segs.filter((s) => s.kind === "opnd");
          if (t > 3.2) ops.forEach((s) => g.rect(s.x, s.y + 6, s.w, 1, SKY.accent));
          if (t > 4.2) opn.forEach((s) => g.rect(s.x, s.y + 6, s.w, 1, SKY.wave));
          // Halstead tallies for this block
          if (t > 3.2) g.alpha(ease((t - 3.2) / 0.4), () => {
            g.box(32, 84, 114, 42, CARD, EDGE, LITE); g.text("HALSTEAD (DETECTION BLOCK)", 36, 88, SKY.muted);
            g.text(`OPERATORS  ${ops.length}`, 36, 98, SKY.accent); if (t > 4.2) g.text(`OPERANDS  ${opn.length}`, 90, 98, SKY.wave);
            if (t > 5.2) { g.text("VOLUME V = N × LOG2 n", 36, 108, SKY.ink); g.text("(N: ALL TOKENS, n: DISTINCT)", 36, 116, SKY.muted); }
          });
          // cyclomatic: the condition as a flow graph
          if (t > 6.4) g.alpha(ease((t - 6.4) / 0.5), () => {
            g.box(152, 16, 124, 110, CARD, EDGE, LITE); g.text("selection and not filter", 214, 21, SKY.ink, 1, "c");
            const dia = (cx, cy, lab) => { for (let k = 0; k <= 6; k++) g.rect(cx - k * 2, cy - 6 + k, k * 4 + 1, 1, "#2c3a52"); for (let k = 0; k < 6; k++) g.rect(cx - 10 + k * 2, cy + 1 + k, 21 - k * 4, 1, "#2c3a52"); g.text(lab, cx, cy - 2, SKY.wave, 1, "c"); };
            g.tag("START", 214, 30, "#2c313c", SKY.ink, "c"); g.rect(214, 39, 1, 5, SKY.muted);
            dia(214, 51, "SEL?"); g.rect(214, 58, 1, 8, SKY.muted); g.text("YES", 218, 59, SKY.ok);
            dia(214, 73, "FILTER?"); g.rect(214, 80, 1, 8, SKY.muted); g.text("NO", 218, 81, SKY.ok);
            g.tag("MATCH", 214, 89, SKY.ok, "#fff", "c");
            g.rect(226, 51, 22, 1, SKY.muted); g.rect(226, 73, 22, 1, SKY.muted); g.rect(248, 51, 1, 39, SKY.muted); g.text("NO", 232, 45, SKY.bad); g.text("YES", 230, 67, SKY.bad);
            g.tag("NO MATCH", 248, 92, SKY.bad, "#fff", "c");
            if (t > 7.6) g.text("2 DECISIONS > M = 2 + 1 = 3 PATHS", 214, 112, SKY.accent, 1, "c");
          });
        } },
      { ch: 2, title: "The pipeline, end to end", dur: 8, cap: "End to end: public rules are crawled and validated, turned into syntax trees and prompts, generated under five settings, and scored for validity and structural complexity, to compare prompt-only and structure-aware models.",
        subs: [[0.3, "Together, these steps form an end-to-end evaluation pipeline"], [3.7, "for comparing prompt-only and structure-aware approaches."]],
        draw(g, t) {
          room(g);
          let x = 36; SIGMA_CHAIN.forEach((lab, i) => { const w = g.textW(lab) + 8, on = t > 0.3 + i * 0.4; g.rect(x, 22, w, 11, on ? SKY.accent : CARD); g.text(lab, x + 4, 25, on ? SKY.bg : SKY.muted); x += w; if (i < 5) { g.text(">", x + 2, 25, SKY.trim); x += 9; } });
          g.box(52, 46, 202, 62, CARD, EDGE, LITE); g.text("QUESTIONS IT ANSWERS", 153, 52, SKY.accent, 1, "c");
          ["CAN OPEN LLMS WRITE VALID SIGMA RULES?", "DOES SEEING THE STRUCTURE (AST) HELP?", "HOW CLOSE IS THE COMPLEXITY TO EXPERT RULES?"].forEach((l, i) => { if (t > 2.8 + i * 0.8) { g.text("+", 62, 66 + i * 12, SKY.ok); g.text(l, 70, 66 + i * 12, SKY.ink); } });
          if (t > 5.6) g.text("APPLIED ML RESEARCH, TEXAS A&M · 2025-2026", 153, 116, SKY.muted, 1, "c");
        } },
    ],
  },
  mri: {
    title: "Benchtop MRI from scratch · overview",
    link: { label: "GitHub", url: "https://github.com/Dino-Boooo/Instrumentation-and-System-Design-for-Advanced-MRI-Imaging" },
    chapters: ["Motivation", "Method", "Results"],
    scenes: [
      { ch: 0, title: "Introduction", dur: 8, cap: "Course project (MR Engineering, Texas A&M, Fall 2024): a benchtop MRI system built from two Analog Discovery 2 boards, a permanent magnet, a hand-wound RF coil and custom Python software.",
        subs: [[0.3, "This course project set out to build a working MRI system from basic components,"], [4.8, "as part of the MR Engineering course at Texas A&M."]],
        draw(g, t) {
          room(g);
          const up = (t0) => [ease((t - t0) / 0.6), Math.round(6 * (1 - ease((t - t0) / 0.6)))];
          let [a, d] = up(0.1); g.alpha(a, () => g.text("Benchtop MRI", 153, 16 + d, SKY.ink, 2, "c"));
          [a, d] = up(0.4); g.alpha(a, () => g.text("from scratch", 153, 31 + d, SKY.accent, 2, "c"));
          [a, d] = up(1.0); g.alpha(a, () => g.text("2 INSTRUMENT BOARDS, A MAGNET, A HAND-WOUND COIL", 153, 53 + d, SKY.ink, 1, "c"));
          [a, d] = up(1.3); g.alpha(a, () => g.text("MR ENGINEERING, TEXAS A&M, FALL 2024", 153, 63 + d, SKY.muted, 1, "c"));
          ad2(g, 82, 92, "AD2 #1"); ad2(g, 192, 92, "AD2 #2"); magnet(g, 128, 82);
          for (let x = 114; x < 144; x++) g.px(x, 100 + Math.round(2 * Math.sin(x * 0.9 - t * 12)), SKY.accent);
          for (let x = 178; x < 192; x++) g.px(x, 106 + Math.round(2 * Math.sin(x * 0.5 - t * 6)), SKY.ok);
        } },
      { ch: 0, title: "How does MRI make an image?", dur: 15.4, cap: "MRI in one line: protons in a magnetic field precess at a set (Larmor) frequency; an RF pulse tips them over, and a second pulse makes them answer with an echo, a few millivolts for a few milliseconds. The project builds every stage from that echo to an image.",
        subs: [[0.3, "In a magnetic field, hydrogen nuclei precess at a characteristic frequency."], [4.5, "A radio-frequency pulse tips them away from the field,"], [7.6, "and a second pulse refocuses them into a measurable echo."], [10.8, "Our goal was to build each stage that turns this faint echo into an image."]],
        draw(g, t) {
          room(g);
          g.box(32, 16, 104, 98, CARD, EDGE, LITE); g.text("PROTONS IN B0", 84, 20, SKY.muted, 1, "c");
          g.rect(40, 34, 1, 70, "#3a3f4a"); for (let k = 0; k < 3; k++) g.rect(39 + k, 34 - 2 + k, 1, 1, "#3a3f4a"); g.text("B0", 44, 30, SKY.muted);
          const tip = Math.min(1, Math.max(0, (t - 2.6) / 0.8));
          for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) {
            const cx = 62 + i * 24, cy = 44 + j * 24, ph = (i * 3 + j) * 0.7 + t * 6 * (1 + (t > 4 ? 0.04 * (i - j) : 0)), L = 9;
            const x = Math.cos(ph) * L * (0.25 + 0.75 * tip), y = -L * (1 - tip) + Math.sin(ph) * 3 * tip;
            g.disc(cx, cy, 2, 2, "#3a5f8f"); g.line(cx, cy, cx + x, cy + y, SKY.wave); g.px(cx + x, cy + y, "#ffffff");
          }
          g.text("PRECESSING AT ABOUT 3.32 MHz", 84, 106, SKY.ink, 1, "c");
          // the signal: two RF pulses, then the echo
          g.box(142, 16, 134, 98, CARD, EDGE, LITE); g.text("SIGNAL", 209, 20, SKY.muted, 1, "c"); g.rect(148, 66, 122, 1, "#2c3038");
          const burst = (cx, amp, col) => { for (let x = -8; x <= 8; x++) { const v = Math.round(amp * Math.cos(x * 1.4) * Math.max(0, 1 - Math.abs(x) / 8.5)); g.rect(cx + x, 66 - Math.max(v, 0), 1, Math.abs(v) + 1, col); } };
          if (t > 2.6) { burst(168, 14, SKY.accent); g.text("RF 90°", 168, 86, SKY.accent, 1, "c"); }
          if (t > 4.8) { burst(204, 14, SKY.accent); g.text("RF 180°", 204, 86, SKY.accent, 1, "c"); }
          if (t > 5.6) { trace(g, 222, 268, 66, 246, 6 * ease((t - 5.6) / 0.5), SKY.wave); g.text("ECHO", 246, 86, SKY.wave, 1, "c"); }
          if (t > 6.2) g.text("A FEW mV, A FEW ms", 209, 98, SKY.ink, 1, "c");
          if (t > 7) g.alpha(ease((t - 7) / 0.4), () => g.tag("GOAL: ECHO > IMAGE, EVERY STAGE BUILT BY HAND", 153, 119, SKY.accent, "#fff", "c"));
        } },
      { ch: 1, title: "The system: two boards, one trigger", dur: 12.5, cap: "AD2 #1 is the master: it plays the RF pulses, the local oscillator, the switch timing and digitizes the echo. The echo returns through a T/R switch, preamp, 3.5 MHz low-pass filter and mixer. AD2 #2, started by AD2 #1's trigger, drives the gradient and shim coils through an amplifier (gain about 11).",
        subs: [[0.3, "One instrument board generates the RF pulses and controls the timing."], [4.2, "The echo returns through a preamplifier, a low-pass filter and a mixer."], [8.2, "A second board drives the gradient coils, started by a shared trigger."]],
        draw(g, t) {
          room(g);
          const ln = (pts, col) => { for (let i = 1; i < pts.length; i++) g.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], col); };
          const TX = [[142, 26], [212, 26], [212, 62], [236, 62]], RX = [[236, 66], [206, 66], [206, 98], [130, 98], [90, 98], [90, 31]], GR = [[176, 118], [256, 118], [256, 86]];
          ln(TX, "#4a3a30"); ln(RX, "#2f3d52"); ln([[106, 118], [176, 118]], "#2e4a3c"); ln(GR, "#2e4a3c"); ln([[124, 31], [124, 94]], "#3a3f4a"); ln([[50, 31], [50, 118], [78, 118]], "#3a3f4a");
          for (let y = 32; y < 112; y += 3) g.px(84, y, "#5d626b"); g.text("TRIG", 79, 74, SKY.muted, 1, "r"); g.text("LO", 128, 70, SKY.muted);
          g.tag("PYTHON GUI", 32, 22, "#2c313c", SKY.ink); g.tag("AD2 #1: RF, LO, ADC", 78, 22, SKY.wave, SKY.bg); g.tag("ATTENUATOR", 150, 22, "#2c313c", SKY.ink); g.tag("T/R SWITCH", 192, 22, "#2c313c", SKY.ink);
          g.tag("PREAMP + LOW-PASS", 140, 94, "#2c313c", SKY.ink); g.tag("MIXER", 102, 94, "#2c313c", SKY.ink); g.tag("AD2 #2", 78, 114, SKY.ok, SKY.bg); g.tag("GRADIENT AMP X11", 112, 114, "#2c313c", SKY.ink);
          magnet(g, 228, 44); g.text("S11 -34.8 dB", 252, 90, SKY.muted, 1, "r"); g.text("GRADIENTS", 226, 110, SKY.ok, 1, "r");
          const travel = (pts, p, col) => { const L = pts.slice(1).map((q, i) => Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1])), tot = L.reduce((a, b) => a + b, 0); let d = p * tot; for (let i = 0; i < L.length; i++) { if (d <= L[i]) { const u = d / L[i]; g.rect(pts[i][0] + (pts[i + 1][0] - pts[i][0]) * u - 1, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * u - 1, 3, 3, col); return; } d -= L[i]; } };
          if (t > 0.3 && t < 3.2) for (let k = 0; k < 3; k++) travel(TX, ((t - 0.3) * 0.5 + k / 3) % 1, SKY.accent);
          if (t > 3 && t < 6) for (let k = 0; k < 3; k++) travel(RX, ((t - 3) * 0.4 + k / 3) % 1, SKY.wave);
          if (t > 5.8) for (let k = 0; k < 3; k++) travel(GR, ((t - 5.8) * 0.5 + k / 3) % 1, SKY.ok);
        } },
      { ch: 1, title: "The pulse sequence", dur: 12.4, cap: "The spin-echo sequence: a 90° pulse, a 180° pulse TE/2 later, and the echo at TE. The T/R switch protects the receiver around the pulses, the digitizer window is centred on the echo, and gradient lobes play around the readout, all aligned to microseconds by one master trigger.",
        subs: [[0.3, "Each acquisition uses a spin echo: a 90° pulse followed by a 180° pulse."], [4.3, "The echo forms at TE, and the digitizer window is centered on it."], [8.0, "A single master trigger keeps all events aligned to within microseconds."]],
        draw(g, t) {
          room(g);
          const X0 = 62, X1 = 272, head = X0 + (X1 - X0) * Math.min(1, (t - 0.3) / 5.4), rows = [["RF", 26], ["T/R", 46], ["GRADIENT", 66], ["ADC", 86], ["SIGNAL", 106]];
          rows.forEach(([l, y]) => { g.text(l, 56, y - 3, SKY.muted, 1, "r"); g.rect(X0, y + 6, X1 - X0, 1, "#22252c"); });
          const seen = (x) => x <= head;
          for (let x = X0; x < X1; x++) {
            if (!seen(x)) break;
            const rf = (c) => Math.abs(x - c) <= 7 ? Math.round(9 * Math.cos((x - c) * 1.3) * (1 - Math.abs(x - c) / 8)) : null;
            const a = rf(84) ?? rf(140); if (a != null) g.rect(x, 32 - Math.max(a, 0), 1, Math.abs(a) + 1, SKY.accent);
            g.px(x, x > 76 && x < 150 ? 46 : 52, SKY.ink);
            const gr = x > 104 && x < 122 ? 72 - 4 : x > 178 && x < 222 ? 72 - 6 : 72; g.px(x, gr, SKY.ok); if (gr !== 72) g.rect(x, gr, 1, 72 - gr, "rgba(108,196,154,.35)");
            g.px(x, x > 180 && x < 220 ? 86 : 92, SKY.wave);
            const fid = x > 92 && x < 120 ? 7 * Math.exp(-(x - 92) / 7) * Math.cos((x - 92) * 1.2) : 0, ec = 7 * Math.exp(-((x - 200) ** 2) / 50) * Math.cos((x - 200) * 1.2);
            g.px(x, 112 - Math.round(fid + ec), SKY.ink);
          }
          if (head < X1) g.rect(Math.round(head), 18, 1, 100, "rgba(232,145,95,.5)");
          if (t > 3) g.alpha(ease((t - 3) / 0.4), () => { g.rect(84, 20, 1, 3, SKY.muted); g.rect(140, 20, 1, 3, SKY.muted); g.rect(200, 20, 1, 3, SKY.muted); g.rect(84, 21, 56, 1, SKY.muted); g.rect(140, 21, 60, 1, SKY.muted); g.text("TE/2", 112, 13, SKY.muted, 1, "c"); g.text("TE/2", 170, 13, SKY.muted, 1, "c"); g.tag("ECHO AT TE", 200, 120, SKY.wave, SKY.bg, "c"); });
        } },
      { ch: 1, title: "Finding and cleaning the echo", dur: 13, cap: "The resonance was found with a coarse sweep (3.2–3.6 MHz, 10 kHz steps) and a fine sweep (2 kHz steps): 3.318 MHz. The echo is mixed down to a low intermediate frequency and cleaned with a zero-phase Chebyshev II band-pass filter and a Hamming window: echo SNR 26 dB.",
        subs: [[0.3, "The first task was simply to detect the signal."], [3.0, "Coarse and then fine frequency sweeps located the resonance at 3.318 MHz."], [7.1, "Zero-phase band-pass filtering reduced the noise,"], [9.9, "giving an echo signal-to-noise ratio of 26 dB."]],
        draw(g, t) {
          room(g);
          g.box(32, 16, 116, 88, CARD, EDGE, LITE);
          const fine = t > 2.8, lo = fine ? 3.30 : 3.2, hi = fine ? 3.34 : 3.6, n = fine ? 21 : 41, prog = Math.min(1, fine ? (t - 2.8) / 1.4 : (t - 0.3) / 2.4);
          g.text(fine ? "FINE SWEEP" : "COARSE SWEEP", 36, 20, SKY.muted);
          for (let i = 0; i < Math.floor(n * prog); i++) { const f = lo + ((hi - lo) * i) / (n - 1), v = Math.exp(-(((f - 3.318) / (fine ? 0.006 : 0.012)) ** 2)) * 0.9 + 0.08 * rnd(i + (fine ? 50 : 0)), x = 40 + Math.round((i * 100) / (n - 1)), h = Math.round(v * 52); g.rect(x, 86 - h, fine ? 3 : 2, h, Math.abs(f - 3.318) < (fine ? 0.0015 : 0.006) ? SKY.accent : SKY.wave); }
          g.rect(38, 87, 106, 1, "#3a3f4a"); g.text(lo.toFixed(2), 38, 92, SKY.muted); g.text(hi.toFixed(2) + " MHz", 144, 92, SKY.muted, 1, "r");
          if (fine && prog >= 1) g.tag("3.318 MHz", 90, 24, SKY.accent, "#fff", "c");
          // the echo, raw then clean
          g.box(154, 16, 122, 88, CARD, EDGE, LITE);
          const clean = ease((t - 4.8) / 0.8);
          g.text(clean > 0.5 ? "FILTERED + WINDOWED" : "RAW CAPTURE", 158, 20, clean > 0.5 ? SKY.ok : SKY.muted);
          let py = 60; for (let x = 0; x < 112; x++) { const s = 16 * Math.exp(-(((x - 56) / 18) ** 2)) * Math.cos(x * 0.9), nz = (rnd(x * 3 + Math.floor(t * 8)) - 0.5) * 22 * (1 - clean), v = 60 - Math.round(s + nz); if (x) g.line(158 + x - 1, py, 158 + x, v, clean > 0.5 ? SKY.wave : "#7d8590"); py = v; }
          if (t > 4.8) g.text("CHEBYSHEV II, filtfilt, HAMMING", 215, 92, SKY.muted, 1, "c");
          if (t > 6.8) g.alpha(ease((t - 6.8) / 0.4), () => { g.tag("ECHO SNR 26 dB", 120, 112, SKY.ok, SKY.bg, "c"); g.tag("T2* 0.28 ms", 190, 112, "#2c313c", SKY.ink, "c"); });
        } },
      { ch: 1, title: "Shimming", dur: 11.7, cap: "An uneven main field (B0) broadens the spectral line. DC offsets on the shim coils, tuned with the line width as feedback, narrowed it from 1953 Hz to about 1220 Hz.",
        subs: [[0.3, "The main field is not perfectly uniform, which broadens the spectral line."], [4.4, "Small shim currents compensate for this, guided by the measured line width,"], [8.6, "which narrowed from 1953 Hz to about 1220 Hz."]],
        draw(g, t) {
          room(g);
          const k = ease((t - 2.4) / 2.6), fw = 1953 - (1953 - 1220) * k, wpx = fw / 1953 * 34;
          g.box(32, 16, 80, 98, CARD, EDGE, LITE); g.text("SHIM OFFSETS", 72, 20, SKY.muted, 1, "c");
          [["X", 0.12], ["Z", -0.08]].forEach(([ax, v], i) => { const cx = 52 + i * 40, cy = 56, a = -Math.PI / 2 + v * 6 * k; g.disc(cx, cy, 11, 11, "#2c313c"); g.disc(cx, cy, 9, 9, "#1b1e24"); g.line(cx, cy, cx + Math.cos(a) * 8, cy + Math.sin(a) * 8, SKY.accent); g.text("SHIM " + ax, cx, 74, SKY.ink, 1, "c"); g.text(((v * k) >= 0 ? "+" : "") + (v * k).toFixed(2) + " V", cx, 84, SKY.muted, 1, "c"); });
          g.text("LIMIT +/-0.2 V", 72, 102, SKY.muted, 1, "c");
          g.box(118, 16, 158, 98, CARD, EDGE, LITE); g.text("SPECTRUM", 197, 20, SKY.muted, 1, "c");
          let py = 96; for (let x = 0; x < 146; x++) { const d = (x - 73) / wpx, v = 96 - Math.round(62 * (1 / (1 + 4 * d * d)) * (0.75 + 0.25 * (1 - wpx / 34) / 0.38)); if (x) g.line(124 + x - 1, py, 124 + x, v, SKY.wave); py = v; }
          const hy = 96 - Math.round(31 * (0.75 + 0.25 * (1 - wpx / 34) / 0.38)); g.rect(197 - Math.round(wpx / 2), hy, Math.round(wpx), 1, SKY.accent);
          g.tag(`FWHM ${Math.round(fw)} Hz`, 197, 102, SKY.accent, "#fff", "c");
        } },
      { ch: 1, title: "Gradients encode position", dur: 12.2, cap: "With a gradient on, the precession frequency depends on position, so the spectrum becomes a projection of the object. The GUI turns a target resolution into a gradient, a coil current and an AD2 output voltage; for 0.333 mm: 1.10 G/cm, 2.2 A, 8.8 V, 0.80 V. Per-axis calibration factors corrected the measured spread.",
        subs: [[0.3, "With two water tubes in the magnet, the spectrum still shows a single peak."], [4.5, "Applying a gradient makes the frequency depend on position."], [7.9, "We calibrated the chain from target resolution to board output voltage."]],
        draw(g, t) {
          room(g);
          const on = ease((t - 2.6) / 0.6);
          g.box(32, 16, 90, 80, CARD, EDGE, LITE); g.text("TUBES (TOP VIEW)", 77, 20, SKY.muted, 1, "c");
          for (let x = 36; x < 118; x++) g.rect(x, 30, 1, 62, `rgba(${Math.round(120 + 100 * (x - 36) / 82)},${Math.round(150 - 40 * (x - 36) / 82)},240,${(0.25 * on).toFixed(2)})`);
          g.disc(62, 56, 12, 12, "#9fd0f0"); g.disc(62, 56, 10, 10, "#cfe8f7"); g.disc(96, 66, 9, 9, "#9fd0f0"); g.disc(96, 66, 7, 7, "#cfe8f7");
          if (on > 0) { g.rect(38, 88, Math.round(76 * on), 1, SKY.ok); g.rect(38 + Math.round(76 * on) - 2, 86, 1, 5, SKY.ok); g.text("Gx: FREQUENCY RISES >", 77, 80, SKY.ok, 1, "c"); }
          g.box(128, 16, 148, 80, CARD, EDGE, LITE); g.text("SPECTRUM = PROJECTION", 202, 20, SKY.muted, 1, "c");
          let py = 86; for (let x = 0; x < 136; x++) { const xx = ((x - 68) / 68) * 22, proj = MRI.proj(0, xx), v0 = 60 * Math.exp(-((x - 68) ** 2) / 6), v = 86 - Math.round(v0 * (1 - on) + proj * 2.6 * on); if (x) g.line(134 + x - 1, py, 134 + x, v, SKY.wave); py = v; }
          if (t > 5.4) g.alpha(ease((t - 5.4) / 0.5), () => {
            const S = [["0.333 mm", SKY.ink], ["1.10 G/cm", SKY.ok], ["2.2 A", SKY.ink], ["8.8 V", SKY.ink], ["0.80 V AD2", SKY.accent]]; let x = 34;
            S.forEach(([l, c], i) => { const w = g.textW(l) + 6; g.rect(x, 104, w, 9, "#22252c"); g.text(l, x + 3, 106, c); x += w; if (i < 4) { g.text(">", x + 2, 106, SKY.trim); x += 9; } });
            g.text("x CALIBRATION 1.28 / 0.56 PER AXIS", 34, 118, SKY.muted);
          });
        } },
      { ch: 1, title: "First image: projection reconstruction", dur: 14.6, interactive: true, hint: "Click the picture to switch between 8 and 32 angles", cap: "Mixing the two gradient axes rotates the readout, giving one projection per angle. Each projection is filtered and smeared back across the image (filtered backprojection). With 8 angles the image is dominated by streaks; 32 angles fill it in. Click to switch between 8 and 32 angles.",
        subs: [[0.3, "Rotating the gradient direction gives one projection per angle."], [3.9, "Filtered backprojection combines these projections into an image."], [7.5, "With 8 angles, streak artifacts dominate; 32 angles fill the image in."], [11.5, "You can click to switch between 8 and 32 angles."]],
        draw(g, t, s, I, clock) {
          room(g);
          const n = s.n ?? (t < 5.2 ? 8 : 32), R = MRI.fbp(n), el = s.n ? clock - s.c0 : t - (t < 5.2 ? 0.3 : 5.2), shown = Math.max(1, Math.min(n, Math.floor((el / (n === 8 ? 2.4 : 2)) * n) + 1));
          // the phantom with the readout direction rotating
          g.box(32, 16, 74, 74, CARD, EDGE, LITE); g.text("READOUT ANGLE", 69, 20, SKY.muted, 1, "c");
          gray(g, 37, 26, 32, 32, 2, 2, (i, j) => (MRI.inside(i, j) ? 0.85 : 0.06));
          const th = (Math.PI * (shown - 1)) / n; g.line(69 - Math.cos(th) * 30, 58 - Math.sin(th) * 30, 69 + Math.cos(th) * 30, 58 + Math.sin(th) * 30, SKY.accent);
          // the sinogram
          g.box(112, 16, 74, 74, CARD, EDGE, LITE); g.text(`SINOGRAM (${n})`, 149, 20, SKY.muted, 1, "c");
          const rh = 64 / n; for (let a = 0; a < shown; a++) for (let k = 0; k < 32; k++) { const v = R.sino[a][k] / R.pmax, c = Math.round(v * 255); g.rect(117 + k * 2, 26 + Math.floor(a * rh), 2, Math.max(1, Math.ceil(rh)), `rgb(${c},${c},${c})`); }
          // the backprojection, built up one angle at a time
          g.box(192, 16, 84, 74, CARD, EDGE, LITE); g.text("BACKPROJECTION", 234, 20, SKY.muted, 1, "c");
          const part = R.cum[shown - 1];
          gray(g, 202, 26, 32, 32, 2, 2, (i, j) => part[j * 32 + i] * 1.1);
          g.tag(`${n} ANGLES`, 153, 96, n === 32 ? SKY.ok : SKY.accent, n === 32 ? SKY.bg : "#fff", "c");
        },
        click(s, x, y, t, clock) { s.n = (s.n ?? (t < 5.2 ? 8 : 32)) === 8 ? 32 : 8; s.c0 = clock; } },
      { ch: 1, title: "Final image: phase encoding and k-space", dur: 13.2, cap: "Each shot combines a frequency-encode readout with a phase-encode lobe that steps over 32 values, so each shot fills one line of k-space (32 × 64). A 2D Hamming window and a 2D FFT turn k-space into the image, and pixels below 20 % of the maximum are set to zero.",
        subs: [[0.3, "For the final image, each acquisition fills one line of k-space."], [3.9, "Thirty-two phase-encoding steps complete the grid."], [6.8, "A two-dimensional Fourier transform then yields the image,"], [10.1, "and a simple threshold isolates the two tubes."]],
        draw(g, t) {
          room(g);
          const F = MRI.fourier(), rows = Math.min(32, Math.floor(Math.max(0, t - 0.3) / 5 * 32) + 1);
          // the phase-encode lobe stepping
          g.box(32, 16, 60, 74, CARD, EDGE, LITE); g.text("PHASE ENCODE", 62, 20, SKY.muted, 1, "c");
          for (let q = 0; q < 32; q += 2) { const a = (q - 16) / 16, h = Math.round(a * 22), cur = Math.abs(q - (rows - 1)) < 2; g.rect(44 + q, 56 - Math.max(h, 0), 1, Math.abs(h) + 1, cur ? SKY.accent : "#3a5f8f"); }
          g.text(`STEP ${rows}/32`, 62, 82, SKY.ink, 1, "c");
          // k-space filling line by line
          g.box(98, 16, 74, 74, CARD, EDGE, LITE); g.text("K-SPACE 32 X 64", 135, 20, SKY.muted, 1, "c");
          gray(g, 103, 26, 64, 32, 1, 2, (i, j) => (j < rows ? F.k[j * 64 + i] ** 1.6 : 0));
          if (t > 5.6) { arrow(g, 176, 194, 52, SKY.accent, "2D FFT"); }
          if (t > 5.6) g.alpha(ease((t - 5.6) / 0.6), () => {
            g.box(198, 16, 78, 74, CARD, EDGE, LITE); g.text(t > 8.2 ? "THRESHOLDED" : "IMAGE", 237, 20, SKY.muted, 1, "c");
            gray(g, 205, 26, 64, 32, 1, 2, (i, j) => { const v = F.img[j * 64 + i]; return t > 8.2 && v < 0.2 ? 0 : v; });
          });
          g.text("1 SHOT = 1 LINE", 135, 96, SKY.ink, 1, "c");
        } },
      { ch: 2, title: "Results", dur: 8.9, cap: "Results: a coil matched to S11 = −34.8 dB, resonance at 3.318 MHz, echo SNR 26 dB, line width 1953 → ~1220 Hz after shimming, a 32-angle projection image and a 32 × 64 phase-encoded image matching the two-tube phantom.",
        subs: [[0.3, "The final image is consistent with the two-tube phantom."], [4.2, "We learned how much careful timing and direct measurement matter in practice."]],
        draw(g, t) {
          room(g);
          g.box(32, 16, 160, 98, CARD, EDGE, LITE); g.text("KEY RESULTS", 112, 20, SKY.accent, 1, "c");
          [["COIL MATCH", "S11 -34.8 dB, Q 74"], ["RESONANCE", "3.318 MHz"], ["ECHO SNR", "26 dB"], ["LINE WIDTH", "1953 > ABOUT 1220 Hz"], ["FIRST IMAGE", "32-ANGLE PROJECTION"], ["FINAL IMAGE", "32 X 64, PHASE-ENCODED"]].forEach(([a, b], i) => { if (t < 0.4 + i * 0.4) return; g.text(a, 38, 32 + i * 12, SKY.muted); g.text(b, 96, 32 + i * 12, SKY.ink); });
          const F = MRI.fourier(); g.box(198, 16, 78, 74, CARD, EDGE, LITE); g.text("FINAL IMAGE", 237, 20, SKY.muted, 1, "c");
          gray(g, 205, 26, 64, 32, 1, 2, (i, j) => { const v = F.img[j * 64 + i]; return v < 0.2 ? 0 : v; });
          if (t > 4.2) g.text("MATCHES THE PHANTOM", 237, 98, SKY.ok, 1, "c");
        } },
    ],
  },
  mammo: {
    title: "Mammogram classification · overview",
    link: { label: "GitHub", url: "https://github.com/xoumyax/Breast-Cancer-Classification" },
    chapters: ["Motivation", "Method", "Results"],
    scenes: [
      { ch: 0, title: "Introduction", dur: 8.8, cap: "Course project (Texas A&M, Fall 2024): classifying mammograms as benign or malignant on the CBIS-DDSM dataset, comparing texture-feature SVMs with deep convolutional networks.",
        subs: [[0.3, "This course project studied how to classify mammogram findings as benign or malignant,"], [5.1, "comparing texture-based features with deep neural networks."]],
        draw(g, t) {
          room(g);
          const up = (t0) => [ease((t - t0) / 0.6), Math.round(6 * (1 - ease((t - t0) / 0.6)))];
          let [a, d] = up(0.1); g.alpha(a, () => g.text("Mammogram", 153, 16 + d, SKY.ink, 2, "c"));
          [a, d] = up(0.4); g.alpha(a, () => g.text("classification", 153, 31 + d, SKY.accent, 2, "c"));
          [a, d] = up(1.0); g.alpha(a, () => g.text("TEXTURE FEATURES VS. DEEP NETWORKS", 153, 53 + d, SKY.ink, 1, "c"));
          [a, d] = up(1.3); g.alpha(a, () => g.text("CBIS-DDSM, TEXAS A&M, FALL 2024", 153, 63 + d, SKY.muted, 1, "c"));
          mammo(g, 112, 72, 40, 42, 3); mammo(g, 160, 72, 40, 42, 7, false);
          g.tag("BENIGN?", 132, 118, "#2c313c", SKY.ink, "c"); g.tag("MALIGNANT?", 180, 118, "#2c313c", SKY.ink, "c");
        } },
      { ch: 0, title: "Why classify mammograms?", dur: 12.4, cap: "Mammography is the main screening tool for breast cancer. Telling benign from malignant findings, such as clusters of calcifications, is hard; automated classification could support radiologists. The project asks three questions on one public dataset.",
        subs: [[0.3, "Mammography is the primary screening tool for breast cancer."], [3.7, "Distinguishing benign from malignant findings is challenging, and automated methods may assist."], [9.0, "We examined three questions using one public dataset."]],
        draw(g, t) {
          room(g);
          mammo(g, 32, 16, 62, 96, 3);
          const z = ease((t - 1.2) / 0.6);
          if (z > 0) { g.rect(60, 50, 16, 14, "rgba(232,145,95,.0)"); g.rect(60, 50, 16, 1, SKY.accent); g.rect(60, 63, 16, 1, SKY.accent); g.rect(60, 50, 1, 14, SKY.accent); g.rect(75, 50, 1, 14, SKY.accent);
            g.alpha(z, () => { g.line(76, 50, 104, 18, "#5d626b"); g.line(76, 63, 104, 70, "#5d626b"); g.box(104, 16, 56, 56, "#050506", SKY.accent);
              gray(g, 106, 18, 26, 26, 2, 2, (i, j) => 0.35 + 0.25 * rnd(i * 13 + j * 71) + 0.25 * Math.exp(-((i - 13) ** 2 + (j - 13) ** 2) / 90));
              [[14, 12], [18, 16], [11, 19], [20, 22], [24, 14], [16, 25]].forEach(([i, j]) => g.rect(106 + i * 2, 18 + j * 2, 2, 2, "#ffffff")); g.text("CALCIFICATIONS", 132, 76, SKY.muted, 1, "c"); }); }
          if (t > 2.6) g.alpha(ease((t - 2.6) / 0.4), () => { g.tag("BENIGN", 168, 30, SKY.ok, SKY.bg); g.tag("MALIGNANT", 168, 44, SKY.bad, "#fff"); g.text("?", 214, 36, SKY.ink, 2); });
          if (t > 4.8) g.alpha(ease((t - 4.8) / 0.4), () => {
            ["1  CAN A PUBLISHED GLCM + SVM BE REPRODUCED?", "2  HOW MUCH DO PREPROCESSING CHOICES MATTER?", "3  HOW DO DEEP MODELS COMPARE?"].forEach((l, i) => g.text(l, 104, 88 + i * 10, i === 0 ? SKY.ink : SKY.ink));
          });
        } },
      { ch: 1, title: "The dataset: CBIS-DDSM", dur: 12.3, cap: "CBIS-DDSM is a curated subset of the Digital Database for Screening Mammography, with verified pathology and region-of-interest annotations. The calcification training set has 1,546 cases: 528 benign and 544 malignant are kept, 474 benign-without-callback cases are excluded, and the 1,072 remaining are split 70 / 30.",
        subs: [[0.3, "We used CBIS-DDSM, a curated set of mammograms with verified pathology."], [4.3, "From its calcification subset, we kept the benign and malignant cases,"], [8.2, "excluded cases without follow-up, and split the remainder 70 / 30."]],
        draw(g, t) {
          room(g);
          g.text("CALCIFICATION TRAINING SET: 1,546 ROI CASES", 153, 18, SKY.ink, 1, "c");
          const B = [["BENIGN", 528, SKY.ok], ["MALIGNANT", 544, SKY.bad], ["", 474, "#5d626b"]];
          let x = 40; B.forEach(([l, n, c], i) => { const w = Math.round((n / 1546) * 226 * ease((t - 0.6 - i * 0.4) / 0.6)); g.rect(x, 30, w, 14, c); if (w > 40) { g.text(l, x + 3, 33, i === 2 ? SKY.ink : SKY.bg); g.text(String(n), x + w - 3, 33, i === 2 ? SKY.ink : SKY.bg, 1, "r"); } x += Math.round((n / 1546) * 226); });
          if (t > 5.2) { const x0 = 40 + Math.round((1072 / 1546) * 226); g.rect(x0, 30, 266 - x0, 14, "rgba(16,17,20,.6)"); g.tag("× EXCLUDED: NO FOLLOW-UP", 266, 48, SKY.bad, "#fff", "r"); }
          if (t > 5.8) g.alpha(ease((t - 5.8) / 0.5), () => {
            g.text("1,072 CASES", 153, 66, SKY.ink, 1, "c");
            g.rect(40, 78, 158, 14, SKY.wave); g.text("TRAIN 70 %", 119, 82, SKY.bg, 1, "c"); g.rect(200, 78, 66, 14, SKY.accent); g.text("TEST 30 %", 233, 82, SKY.bg, 1, "c");
          });
        } },
      { ch: 1, title: "Preprocessing", dur: 7, cap: "Preprocessing: DICOM images are converted to PNG and to grayscale, and contrast is enhanced with histogram equalization, which spreads the gray levels over the full range.",
        subs: [[0.3, "Images were converted to grayscale,"], [3, "and histogram equalization was applied to enhance contrast."]],
        draw(g, t) {
          room(g);
          let x = 40; ["DICOM", "PNG", "GRAYSCALE", "HIST. EQUALIZATION"].forEach((l, i) => { const w = g.textW(l) + 8, on = t > 0.3 + i * 0.6; g.rect(x, 18, w, 11, on ? SKY.accent : CARD); g.text(l, x + 4, 21, on ? SKY.bg : SKY.muted); x += w; if (i < 3) { g.text(">", x + 3, 21, SKY.trim); x += 10; } });
          const eq = ease((t - 3) / 1.2), f = (i, j) => { const v = 0.42 + 0.12 * rnd(i * 17 + j * 31) + 0.1 * Math.exp(-((i - 14) ** 2 + (j - 12) ** 2) / 40) + ([[14, 12], [18, 16], [11, 19]].some(([a, b]) => a === i && b === j) ? 0.12 : 0); return eq ? Math.max(0, Math.min(1, (v - 0.42) * (1 + 3 * eq) + 0.42 - 0.1 * eq)) : v; };
          g.box(40, 36, 64, 64, "#050506", EDGE); gray(g, 42, 38, 30, 30, 2, 2, f); g.text(eq > 0.5 ? "AFTER" : "BEFORE", 72, 104, SKY.muted, 1, "c");
          // the histogram
          g.box(120, 36, 150, 64, CARD, EDGE, LITE); g.text("GRAY-LEVEL HISTOGRAM", 195, 40, SKY.muted, 1, "c");
          const H = new Array(32).fill(0); for (let j = 0; j < 30; j++) for (let i = 0; i < 30; i++) H[Math.min(31, Math.floor(Math.max(0, Math.min(1, f(i, j))) * 32))]++;
          const hm = Math.max(...H); H.forEach((n, k) => { const h = Math.round((n / hm) * 46); g.rect(126 + k * 4, 94 - h, 3, h, SKY.wave); });
        } },
      { ch: 1, title: "Texture features: the GLCM", dur: 13.5, interactive: true, hint: "Click an angle: 0°, 45°, 90° or 135°", cap: "A gray-level co-occurrence matrix (GLCM) counts how often gray level i sits next to level j, at a given distance and angle. It is computed at 0°, 45°, 90° and 135° (distance 1, 256 levels in the project; 4 levels here), and nine texture features are taken from each matrix. Click an angle to recount.",
        subs: [[0.2, "To describe texture, we count how often pairs of gray levels occur next to each other."], [5.0, "These counts are computed in four directions,"], [7.6, "and nine texture features are derived from each."], [10.4, "You can click an angle to recompute the counts."]],
        draw(g, t, s, I, clock) {
          room(g);
          const P = [[0, 0, 1, 1, 2, 3], [0, 1, 1, 2, 3, 3], [1, 1, 2, 2, 3, 2], [1, 2, 2, 3, 2, 1], [2, 2, 3, 2, 1, 1], [2, 3, 2, 1, 1, 0]], OFF = [[0, 1], [-1, 1], [-1, 0], [-1, -1]], ANG = ["0°", "45°", "90°", "135°"];
          const ai = s.a ?? Math.min(3, Math.floor(Math.max(0, t - 0.5) / 2.4) % 4), [dr, dc] = OFF[ai], pairs = [];
          for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) { const r2 = r + dr, c2 = c + dc; if (r2 >= 0 && r2 < 6 && c2 >= 0 && c2 < 6) pairs.push([r, c, r2, c2]); }
          const k = Math.floor(((s.a != null ? clock - s.c0 : t) * 8) % (pairs.length + 8)), done = Math.min(pairs.length, k + 1), M = [0, 1, 2, 3].map(() => [0, 0, 0, 0]);
          pairs.slice(0, done).forEach(([r, c, r2, c2]) => M[P[r][c]][P[r2][c2]]++);
          // the patch
          const shade = ["#1c1f25", "#5d626b", "#a3a9b3", "#eef0f3"];
          g.text("IMAGE PATCH", 62, 24, SKY.muted, 1, "c");
          P.forEach((row, r) => row.forEach((v, c) => { g.rect(38 + c * 8, 38 + r * 8, 8, 8, shade[v]); g.text(String(v), 41 + c * 8, 40 + r * 8, v > 1 ? SKY.bg : SKY.ink); }));
          const cur = pairs[Math.min(k, pairs.length - 1)];
          if (k < pairs.length) { [[cur[0], cur[1]], [cur[2], cur[3]]].forEach(([r, c]) => { g.rect(38 + c * 8, 38 + r * 8, 8, 1, SKY.accent); g.rect(38 + c * 8, 45 + r * 8, 8, 1, SKY.accent); g.rect(38 + c * 8, 38 + r * 8, 1, 8, SKY.accent); g.rect(45 + c * 8, 38 + r * 8, 1, 8, SKY.accent); }); }
          // the angle buttons
          s.btn = ANG.map((l, i) => { const x = 36 + i * 13; g.rect(x, 90, 12, 9, i === ai ? SKY.accent : "#2c313c"); g.text(l, x + 6, 92, i === ai ? SKY.bg : SKY.ink, 1, "c"); return [x, 90, 12, 9]; });
          // the matrix
          g.text("GLCM (COUNTS)", 134, 24, SKY.muted, 1, "c"); for (let i = 0; i < 4; i++) { g.text(String(i), 104, 41 + i * 12, SKY.muted); g.text(String(i), 115 + i * 12, 31, SKY.muted, 1, "c"); }
          for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const hit = k < pairs.length && P[cur[0]][cur[1]] === i && P[cur[2]][cur[3]] === j; g.rect(110 + j * 12, 38 + i * 12, 11, 11, hit ? SKY.accent : `rgba(127,176,240,${Math.min(0.9, M[i][j] / 8).toFixed(2)})`); g.text(String(M[i][j]), 115 + j * 12, 41 + i * 12, hit ? SKY.bg : SKY.ink, 1, "c"); }
          g.text("ROW: LEVEL i", 110, 90, SKY.muted); g.text("COLUMN: NEIGHBOUR j", 110, 98, SKY.muted);
          // features from the (normalised) matrix
          const tot = M.flat().reduce((a, b) => a + b, 0) || 1, p = M.map((r) => r.map((v) => v / tot));
          let con = 0, hom = 0, asm = 0, mi = 0, mj = 0; p.forEach((r, i) => r.forEach((v, j) => { con += v * (i - j) ** 2; hom += v / (1 + (i - j) ** 2); asm += v * v; mi += i * v; mj += j * v; }));
          let si = 0, sj = 0, cov = 0; p.forEach((r, i) => r.forEach((v, j) => { si += v * (i - mi) ** 2; sj += v * (j - mj) ** 2; cov += v * (i - mi) * (j - mj); }));
          g.box(170, 26, 106, 68, CARD, EDGE, LITE); g.text("FEATURES", 223, 30, SKY.muted, 1, "c");
          [["CONTRAST", con], ["HOMOGENEITY", hom], ["ENERGY", Math.sqrt(asm)], ["CORRELATION", si && sj ? cov / Math.sqrt(si * sj) : 0]].forEach(([l, v], i) => { g.text(l, 175, 42 + i * 10, SKY.ink); g.text(v.toFixed(2), 270, 42 + i * 10, SKY.accent, 1, "r"); });
          g.text("+ 5 MORE: ASM, DISSIMILARITY, ...", 223, 84, SKY.muted, 1, "c");
          g.text("9 FEATURES X 4 ANGLES PER IMAGE", 223, 104, SKY.ink, 1, "c");
        },
        click(s, x, y, t, clock) { (s.btn || []).forEach(([bx, by, bw, bh], i) => { if (x >= bx && x < bx + bw && y >= by && y < by + bh) { s.a = i; s.c0 = clock; } }); } },
      { ch: 1, title: "Normalization and the SVM", dur: 12.7, cap: "The nine features live on very different scales, so they are normalized before the SVM: none, standard scaling, or a Yeo-Johnson power transform, which reduces skew and was the most stable. The classifier is an SVM with an RBF kernel (C = 1); Random Forest and XGBoost serve as baselines.",
        subs: [[0.3, "Because the features differ greatly in scale, they are normalized first;"], [4.3, "a Yeo-Johnson transform was the most stable in our tests."], [7.6, "An RBF-kernel SVM then classifies them, with Random Forest and XGBoost as baselines."]],
        draw(g, t) {
          room(g);
          const F = [3.2, 0.05, 0.6, 1.8, 0.2];
          [["NONE", (v) => v / 3.2], ["STANDARD", (v, i) => 0.55 + 0.05 * (i % 3)], ["YEO-JOHNSON", (v, i) => 0.6]].forEach(([l, f], k) => {
            if (t < 0.3 + k * 1.2) return; const x = 34 + k * 46, best = k === 2 && t > 3.4;
            g.alpha(ease((t - 0.3 - k * 1.2) / 0.4), () => { g.box(x, 16, 42, 58, best ? "#24262c" : CARD, best ? SKY.ok : EDGE); g.text(l, x + 21, 20, best ? SKY.ok : SKY.muted, 1, "c"); F.forEach((v, i) => { const h = Math.round(Math.min(1, f(v, i)) * 40); g.rect(x + 5 + i * 7, 68 - h, 5, h, i === 0 && k === 0 ? SKY.bad : SKY.wave); }); });
          });
          if (t > 0.8) g.text("ONE FEATURE DOMINATES", 34, 78, SKY.bad);
          // the SVM: two overlapping classes, a wavy RBF boundary
          g.box(176, 16, 100, 98, CARD, EDGE, LITE); g.text("SVM, RBF KERNEL", 226, 20, SKY.muted, 1, "c");
          const bx = (y) => 226 + Math.round(10 * Math.sin(y * 0.12) + 4 * Math.sin(y * 0.31));
          for (let y = 28; y < 110; y++) { const b = bx(y); g.rect(180, y, b - 180, 1, "rgba(108,196,154,.08)"); g.rect(b, y, 272 - b, 1, "rgba(224,106,95,.08)"); if (t > 6) g.px(b, y, SKY.ink); }
          for (let i = 0; i < 34; i++) { const ben = i % 2 === 0, x = 226 + (ben ? -10 : 10) + (rnd(i * 7) - 0.5) * 70, y = 30 + rnd(i * 13 + 5) * 76; g.rect(x - 1, y - 1, 3, 3, ben ? SKY.ok : SKY.bad); }
          if (t > 6) g.tag("CLASSES OVERLAP", 226, 102, "#2c313c", SKY.ink, "c");
          if (t > 6) g.alpha(ease((t - 6) / 0.4), () => { g.tag("BASELINES: RANDOM FOREST, XGBOOST", 103, 96, "#2c313c", SKY.ink, "c"); });
        } },
      { ch: 1, title: "Deep models", dur: 12.7, cap: "Deep models: a two-view EfficientNet-B0 reads both standard mammogram views (CC and MLO) together, but was too compute-intensive to train fully on the available hardware, so a residual network (Xception-style, with shortcut connections) was trained instead, its hyperparameters tuned with Optuna.",
        subs: [[0.3, "We also considered a two-view network that reads both mammogram views together."], [4.7, "It was too computationally demanding to train fully, so we trained a residual network instead,"], [9.9, "with hyperparameters tuned using Optuna."]],
        draw(g, t) {
          room(g);
          g.box(32, 16, 104, 98, CARD, EDGE, LITE); g.text("TWO-VIEW EFFICIENTNET-B0", 84, 20, SKY.muted, 1, "c");
          mammo(g, 38, 30, 30, 40, 3); mammo(g, 72, 30, 30, 40, 5); g.text("CC", 53, 74, SKY.ink, 1, "c"); g.text("MLO", 87, 74, SKY.ink, 1, "c");
          g.line(53, 82, 84, 90, "#5d626b"); g.line(87, 82, 84, 90, "#5d626b"); g.tag("ONE NETWORK", 84, 90, "#2c313c", SKY.ink, "c");
          if (t > 3.4) g.alpha(ease((t - 3.4) / 0.4), () => g.tag("TOO COMPUTE-HEAVY", 84, 103, SKY.bad, "#fff", "c"));
          if (t > 3.6) g.alpha(ease((t - 3.6) / 0.5), () => {
            g.box(142, 16, 134, 98, "#24262c", SKY.ok); g.text("RESIDUAL CNN (XCEPTION)", 209, 20, SKY.ok, 1, "c");
            for (let i = 0; i < 5; i++) { const x = 150 + i * 24, on = Math.floor(t * 4) % 6 === i; g.rect(x, 40, 16, 28, on ? SKY.wave : "#3a5f8f"); g.rect(x + 1, 41, 14, 1, "#7fb0f0"); if (i < 4) g.rect(x + 16, 54, 8, 1, SKY.muted); if (i % 2 === 0 && i < 4) { g.rect(x + 8, 34, 49, 1, SKY.accent); g.rect(x + 8, 34, 1, 6, SKY.accent); g.rect(x + 56, 34, 1, 6, SKY.accent); } }
            g.text("SHORTCUTS", 209, 28, SKY.accent, 1, "c"); g.text("BENIGN / MALIGNANT", 209, 72, SKY.ink, 1, "c");
            if (t > 6.2) { g.text("OPTUNA TRIALS", 209, 86, SKY.muted, 1, "c"); for (let i = 0; i < 18; i++) { if (t < 6.2 + i * 0.12) break; const v = 0.4 + 0.5 * rnd(i * 9) * (0.6 + 0.4 * i / 18); g.rect(156 + i * 6, 108 - Math.round(v * 14), 3, 3, i === 13 ? SKY.accent : SKY.wave); } }
          });
        } },
      { ch: 2, title: "Results", dur: 15.8, cap: "Results: reproducing the published GLCM + SVM gave 0.50 accuracy (near chance, likely a mismatch in the selected cases). With Yeo-Johnson normalization the SVM reached 0.52–0.57 held-out (0.57 at 135°); Random Forest and XGBoost reached 0.51. The tuned residual CNN reached 0.80 / 0.78 validation accuracy (left / right models).",
        subs: [[0.3, "Reproducing the published SVM setup gave 50% accuracy, close to chance."], [4.3, "With normalization, held-out accuracy rose to 52–57%."], [7.3, "The residual network reached 80% and 78% on validation."], [10.5, "We also note that the best cross-validation fold, 79%, overstated the SVM's performance."]],
        draw(g, t) {
          room(g);
          g.text("ACCURACY", 153, 16, SKY.muted, 1, "c");
          hbars(g, 34, 28, [["GLCM + SVM, AS PUBLISHED", 0.50, SKY.bad], ["SVM + YEO-JOHNSON, 135°", 0.57, SKY.wave], ["RANDOM FOREST / XGBOOST", 0.51, "#7d8590"], ["RESIDUAL CNN (VALIDATION)", 0.80, SKY.ok]], { lw: 104, bw: 110, rh: 16, t, t0: 0.3, max: 1 });
          for (let y = 24; y < 94; y += 3) g.px(138 + 55, y, SKY.muted); g.text("CHANCE 0.5", 193, 96, SKY.muted, 1, "c");
          if (t > 4.6) g.text("/ 0.78", 138 + 88 + 22, 77, SKY.ok);
          if (t > 6.8) g.alpha(ease((t - 6.8) / 0.4), () => g.tag("SVM: BEST CV FOLD 0.79, HELD-OUT ABOUT 0.56", 153, 110, SKY.accent, "#fff", "c"));
        } },
      { ch: 2, title: "Takeaways", dur: 9.4, cap: "Takeaways: reproducibility depends on which cases are selected; normalization matters for distance-based SVMs; held-out accuracy, not the best fold, is the realistic figure; learned features beat global texture statistics, at far more compute.",
        subs: [[0.3, "These results suggest that data selection strongly affects reproducibility,"], [4.5, "and that learned features performed better here, at a higher computational cost."]],
        draw(g, t) {
          room(g);
          g.box(48, 22, 210, 84, CARD, EDGE, LITE); g.text("TAKEAWAYS", 153, 28, SKY.accent, 1, "c");
          ["REPRODUCIBILITY DEPENDS ON DATA SELECTION", "NORMALIZATION MATTERS FOR SVMS", "REPORT HELD-OUT ACCURACY, NOT THE BEST FOLD", "LEARNED FEATURES WIN, AT MORE COMPUTE"].forEach((l, i) => { if (t > 0.5 + i * 0.8) { g.text("+", 58, 44 + i * 13, SKY.ok); g.text(l, 66, 44 + i * 13, SKY.ink); } });
        } },
    ],
  },
  metagenomic: {
    title: "Benchmarking transformer enzyme annotation · overview",
    link: { label: "GitHub", url: "https://github.com/Dino-Boooo/Metagenomic-Functional-Profiling" },
    chapters: ["Motivation", "Method", "Results"],
    scenes: [
      { ch: 0, title: "Introduction", dur: 7.4, cap: "Course project (Texas A&M, Spring 2025): benchmarking a transformer-based enzyme classifier, DeepECtransformer, against alignment-based and machine-learning methods for annotating enzyme functions in metagenomes.",
        subs: [[0.3, "This course project evaluated how reliably a transformer model"], [3.8, "can annotate enzyme functions in microbial communities."]],
        draw(g, t) {
          room(g);
          const up = (t0) => [ease((t - t0) / 0.6), Math.round(6 * (1 - ease((t - t0) / 0.6)))];
          let [a, d] = up(0.1); g.alpha(a, () => g.text("Enzyme function", 153, 16 + d, SKY.ink, 2, "c"));
          [a, d] = up(0.4); g.alpha(a, () => g.text("from metagenomes", 153, 31 + d, SKY.accent, 2, "c"));
          [a, d] = up(1.0); g.alpha(a, () => g.text("BENCHMARKING A TRANSFORMER EC CLASSIFIER", 153, 53 + d, SKY.ink, 1, "c"));
          [a, d] = up(1.3); g.alpha(a, () => g.text("TEXAS A&M, SPRING 2025", 153, 63 + d, SKY.muted, 1, "c"));
          for (let x = 0; x < 120; x++) { const y1 = 100 + Math.round(8 * Math.sin(x * 0.18 + t * 2)), y2 = 100 - Math.round(8 * Math.sin(x * 0.18 + t * 2)); g.px(94 + x, y1, SKY.wave); g.px(94 + x, y2, SKY.accent); if (x % 6 === 0) g.rect(94 + x, Math.min(y1, y2), 1, Math.abs(y1 - y2), "#3a3f4a"); }
          [[70, 92, 1, SKY.ok], [78, 108, 0, "#e8c35f"], [236, 94, 0, SKY.ok], [244, 108, 1, "#e8c35f"]].forEach(([x, y, k, c], i) => microbe(g, x + Math.round(Math.sin(t * 2 + i) * 2), y, k, c));
        } },
      { ch: 0, title: "What can a microbial community do?", dur: 16.3, cap: "Functional profiling asks what a microbial community can do, by assigning Enzyme Commission (EC) numbers to its genes. Standard tools align genes to reference databases: precise, but divergent or novel genes stay unannotated. Transformers may annotate them, but their reliability on full metagenomes had rarely been benchmarked.",
        subs: [[0.3, "Functional profiling aims to describe what a microbial community can do."], [4.3, "Each gene is assigned an Enzyme Commission, or EC, number."], [7.6, "Alignment-based tools are precise, but may miss novel or divergent genes."], [11.7, "We asked whether a transformer could help close this gap on realistic data."]],
        draw(g, t) {
          room(g);
          g.box(32, 16, 66, 66, CARD, EDGE, LITE); g.text("COMMUNITY", 65, 20, SKY.muted, 1, "c");
          for (let i = 0; i < 14; i++) microbe(g, 42 + rnd(i) * 46 + Math.sin(t * 1.5 + i) * 2, 32 + rnd(i + 30) * 44, i % 3 === 0 ? 1 : 0, [SKY.ok, "#e8c35f", SKY.wave, SKY.hot][i % 4]);
          if (t > 1.6) arrow(g, 100, 112, 48, SKY.muted);
          const genes = [["EC 2.7.7.7", true], ["EC 1.1.1.1", true], ["EC 3.2.1.4", true], ["?", false]];
          genes.forEach(([ec, known], i) => { if (t < 1.8 + i * 0.3) return; const y = 22 + i * 15; g.rect(116, y, 40, 5, i === 3 ? SKY.hot : SKY.wave); for (let k = 0; k < 8; k++) g.rect(117 + k * 5, y + 1, 2, 3, "#1b1e24"); if (t > 2.4) g.text(ec, 162, y, known ? SKY.ink : SKY.bad); });
          if (t > 4.4) g.alpha(ease((t - 4.4) / 0.4), () => {
            g.box(206, 16, 70, 66, CARD, EDGE, LITE); g.text("REFERENCE DB", 241, 20, SKY.muted, 1, "c");
            for (let i = 0; i < 5; i++) g.rect(212, 30 + i * 7, 58, 4, "#2c313c");
            g.tag("3 MATCHED", 241, 72, SKY.ok, SKY.bg, "c"); g.tag("NOVEL: NO HIT", 182, 88, SKY.bad, "#fff", "c");
          });
          if (t > 6.8) g.alpha(ease((t - 6.8) / 0.4), () => g.tag("TRANSFORMERS MIGHT FILL THE GAP: HOW RELIABLY?", 153, 110, SKY.accent, "#fff", "c"));
        } },
      { ch: 1, title: "Four methods compared", dur: 10.9, cap: "Four methods: HUMAnN3 (alignment to pangenomes and UniRef clusters, the current gold standard), Carnelian (k-mer profiles with one-vs-all classifiers), DeepECtransformer (two ProtBERT transformer layers, two convolutions and a linear output, with a homology fallback) and ECPICK (a CNN with hierarchical EC layers).",
        subs: [[0.3, "We compared four methods: HUMAnN3, which aligns to reference databases,"], [4.3, "Carnelian, which uses k-mer profiles,"], [6.5, "and two deep-learning models, DeepECtransformer, our focus, and ECPICK."]],
        draw(g, t) {
          room(g);
          const C = [["HUMANN3", "ALIGNMENT TO PANGENOMES", "+ UNIREF CLUSTERS", "#7d8590", 0.3], ["CARNELIAN", "K-MER PROFILES,", "ONE-VS-ALL CLASSIFIERS", "#7d8590", 2.6], ["DEEPECTRANSFORMER", "PROTBERT TRANSFORMER + CNN,", "HOMOLOGY FALLBACK", SKY.accent, 4.4], ["ECPICK", "CNN WITH HIERARCHICAL", "EC LAYERS", SKY.wave, 5.2]];
          C.forEach(([n, a, b, col, t0], i) => { if (t < t0) return; const x = 34 + (i % 2) * 122, y = 18 + Math.floor(i / 2) * 50; g.alpha(ease((t - t0) / 0.4), () => { g.box(x, y, 118, 44, i === 2 ? "#24262c" : CARD, col); g.text(n, x + 6, y + 6, col === "#7d8590" ? SKY.ink : col); g.text(a, x + 6, y + 18, SKY.muted); g.text(b, x + 6, y + 26, SKY.muted); if (i === 2) g.tag("UNDER TEST", x + 112, y + 32, SKY.accent, "#fff", "r"); }); });
        } },
      { ch: 1, title: "Building a gold-standard benchmark", dur: 11.8, cap: "CAMI-II gives simulated metagenomes with known genomes but no functional labels, so the labels were built: genes predicted with Prodigal on gold-standard assemblies from five body sites, searched against UniRef90 with DIAMOND, kept only at identity ≥ 90 % and coverage ≥ 80 %, and mapped to EC numbers. Result: 251,559 labeled sequences covering 2,392 EC numbers.",
        subs: [[0.3, "As no labeled benchmark was available, we constructed one."], [3.6, "Genes were predicted and searched against UniRef90,"], [6.5, "only high-confidence matches were retained,"], [9.1, "resulting in 251,559 labeled sequences."]],
        draw(g, t) {
          room(g);
          const S = [["CAMI-II ASSEMBLIES", "5 BODY SITES", 0.3], ["PRODIGAL", "GENE PREDICTION", 2.6], ["DIAMOND VS. UNIREF90", "TOP HIT", 3.6], ["FILTER", "ID >= 90 %, COV >= 80 %", 5], ["MAP TO EC", "HUMANN3 UTILITY DB", 6.2]];
          S.forEach(([a, b, t0], i) => { const y = 18 + i * 20, on = t > t0; g.box(34, y, 100, 16, on ? "#24262c" : CARD, on ? SKY.accent : EDGE); g.text(a, 38, y + 3, on ? SKY.ink : SKY.muted); g.text(b, 38, y + 9, SKY.muted); if (i < 4) g.rect(84, y + 16, 1, 4, on ? SKY.accent : EDGE); });
          // the body sites
          ["AIRWAYS", "GASTROINTESTINAL", "ORAL", "SKIN", "UROGENITAL"].forEach((l, i) => { if (t < 0.6 + i * 0.25) return; g.tag(l, 150, 20 + i * 11, "#2c313c", SKY.ink); });
          // sequences flowing down and some filtered out
          for (let k = 0; k < 8; k++) { const p = (t * 0.35 + k / 8) % 1, y = 20 + p * 96, out = k % 3 === 0 && y > 82; if (y < 114 && t > 2.6) g.rect(out ? 139 + (y - 82) * 0.9 : 138, y, 3, 2, out ? SKY.bad : SKY.wave); }
          if (t > 7.4) g.alpha(ease((t - 7.4) / 0.5), () => {
            g.box(196, 74, 80, 40, CARD, SKY.ok); g.text("251,559", 236, 80, SKY.ok, 2, "c"); g.text("LABELED SEQUENCES", 236, 96, SKY.ink, 1, "c"); g.text("2,392 EC NUMBERS", 236, 104, SKY.muted, 1, "c");
          });
        } },
      { ch: 1, title: "The model under test", dur: 11.9, cap: "DeepECtransformer reads a protein sequence one amino acid at a time: two ProtBERT transformer layers, two convolutional layers and a linear output predict the EC number. When it is not confident, it falls back to a homology search. It was trained on 22 million enzymes covering 2,802 EC numbers.",
        subs: [[0.3, "The model reads a protein sequence one amino acid at a time."], [3.7, "Transformer layers, convolutions and a linear output produce the prediction."], [8.0, "When its confidence is low, it falls back to a homology search."]],
        draw(g, t) {
          room(g);
          const seq = "MKTAYIAKQRQISFVKSHFSRQLEERLGLIEVQAPIL", off = Math.floor(t * 4) % 6;
          for (let i = 0; i < 16; i++) { const ch = seq[(i + off) % seq.length], x = 34 + i * 9; g.rect(x, 18, 8, 9, "#2c313c"); g.text(ch, x + 4, 20, SKY.ink, 1, "c"); }
          g.text("PROTEIN SEQUENCE", 106, 30, SKY.muted, 1, "c");
          const L = [["PROTBERT LAYER 1", SKY.wave, 0.8, 38], ["PROTBERT LAYER 2", SKY.wave, 1.6, 54], ["CONV LAYER X2", SKY.ok, 2.6, 70], ["LINEAR", "#c9ccd2", 3.4, 86]];
          L.forEach(([l, c, t0, y]) => { if (t < t0) return; g.alpha(ease((t - t0) / 0.4), () => { g.box(40, y, 132, 12, "#1b1e24", c); g.text(l, 106, y + 3, c, 1, "c"); }); });
          if (t > 1.6) for (let i = 0; i < 6; i++) { const a = 44 + ((i * 37 + Math.floor(t * 5) * 11) % 120), b = 44 + ((i * 53 + 17) % 120); g.line(a, 51, b, 54, "rgba(127,176,240,.35)"); }
          if (t > 4.2) g.alpha(ease((t - 4.2) / 0.4), () => { arrow(g, 174, 192, 92, SKY.accent); g.tag("EC 2.7.7.7", 196, 88, SKY.accent, "#fff"); g.text("CONFIDENCE", 196, 102, SKY.muted); g.rect(196, 110, 60, 4, "#2c313c"); g.rect(196, 110, Math.round(60 * (t > 5.8 ? 0.35 : 0.9)), 4, t > 5.8 ? SKY.bad : SKY.ok); });
          if (t > 5.8) g.alpha(ease((t - 5.8) / 0.4), () => { g.box(196, 38, 80, 40, CARD, SKY.accent); g.text("LOW CONFIDENCE?", 236, 44, SKY.accent, 1, "c"); g.text("HOMOLOGY SEARCH", 236, 56, SKY.ink, 1, "c"); g.text("(FALLBACK)", 236, 66, SKY.muted, 1, "c"); });
          g.text("TRAINED: 22M ENZYMES, 2,802 ECS", 106, 108, SKY.muted, 1, "c");
        } },
      { ch: 1, title: "A 2023 model on 2025 hardware", dur: 13.3, cap: "DeepECtransformer was released for Python 3.6, CUDA 10.2 and Transformers 3.5.1, which no longer run on current clusters. It was rebuilt on Texas A&M's Grace HPC cluster; the newer Transformers library changed the model's behaviour, so the original configuration was restored by hand (attention settings, zeroed and frozen positional embeddings, tokenizer files downloaded in advance). It then ran on both CPU and GPU.",
        subs: [[0.3, "The model was released in 2023 for software versions that no longer run on current systems."], [5.3, "We rebuilt the environment on Texas A&M's Grace HPC cluster"], [8.7, "and restored the original configuration so that its behavior was preserved."]],
        draw(g, t) {
          room(g);
          g.box(32, 16, 132, 66, CARD, EDGE, LITE); g.text("ORIGINAL", 100, 20, SKY.bad, 1, "c"); g.text("OURS", 146, 20, SKY.ok, 1, "c");
          [["PYTHON", "3.6", "3.8"], ["CUDA", "10.2", "11.3.1"], ["TRANSFORMERS", "3.5.1", "4.2.2"], ["PYTORCH", "1.7.0", "1.12.1"]].forEach(([n, a, b], i) => { if (t < 0.4 + i * 0.4) return; const y = 32 + i * 11; g.text(n, 38, y, SKY.muted); g.text(a, 100, y, SKY.ink, 1, "c"); if (t > 3) { g.text(">", 123, y, SKY.trim, 1, "c"); g.text(b, 146, y, SKY.ok, 1, "c"); } });
          // the cluster
          g.box(176, 16, 100, 66, CARD, EDGE, LITE); g.text("GRACE HPC", 226, 20, SKY.muted, 1, "c");
          for (let r = 0; r < 4; r++) { g.rect(196, 30 + r * 11, 60, 9, "#22262e"); g.rect(197, 31 + r * 11, 58, 1, "#3a3f4a"); for (let k = 0; k < 6; k++) g.rect(200 + k * 4, 34 + r * 11, 2, 2, t > 3 && blinkOn(t + r * 0.3 + k * 0.17, 0.6) ? (k % 2 ? SKY.ok : SKY.wave) : "#2c3038"); g.text(r < 2 ? "CPU" : "GPU", 252, 33 + r * 11, SKY.muted, 1, "r"); }
          if (t > 5.4) ["RESTORE ATTENTION SETTINGS", "ZERO + FREEZE POSITIONAL EMBEDDINGS", "TOKENIZER DOWNLOADED IN ADVANCE"].forEach((l, i) => { if (t < 5.4 + i * 0.5) return; g.tag("✓", 36, 88 + i * 11, SKY.ok, "#fff"); g.text(l, 50, 90 + i * 11, SKY.ink); });
        } },
      { ch: 2, title: "Results: F1 by dataset", dur: 12, interactive: true, hint: "Click a dataset tab to compare", cap: "F1 scores: DeepECtransformer (ProtBERT) is the most accurate on every dataset, with micro-F1 0.89–0.91. HUMAnN3 recovers most true enzymes but with very low precision (F1 about 0.1). ProtT5 lowers peak accuracy but balances micro and macro scores; ECPICK left 915 of 7,884 validation proteins unannotated. Click a dataset to see its scores.",
        subs: [[0.2, "DeepECtransformer reached a micro-F1 of about 0.9 on every dataset."], [4.0, "HUMAnN3 recovered most enzymes but with low precision, giving an F1 near 0.1."], [8.3, "You can click a dataset to compare the scores."]],
        draw(g, t, s, I, clock) {
          room(g);
          const D = { VALIDATION: [0.91, 0.81, 0.71, 0.76, 0.81, null], AIRWAYS: [0.90, 0.69, 0.73, 0.64, 0.64, 0.16], GASTRO: [0.89, 0.79, 0.80, 0.71, 0.71, 0.10], ORAL: [0.91, 0.73, 0.80, 0.61, 0.76, 0.10], SKIN: [0.91, 0.67, 0.80, 0.61, 0.68, 0.17], URO: [0.89, 0.78, 0.82, 0.68, 0.73, 0.09] };
          const keys = Object.keys(D), cur = s.d ?? keys[Math.floor(Math.max(0, t - 0.2) / 2) % keys.length];
          let x = 34; s.btn = keys.map((k) => { const w = g.textW(k) + 6, on = k === cur; g.rect(x, 16, w, 10, on ? SKY.accent : "#2c313c"); g.text(k, x + 3, 18, on ? SKY.bg : SKY.ink); const b = [x, 16, w, 10, k]; x += w + 3; return b; });
          const v = D[cur], t0 = s.d ? s.c0 : Math.floor(Math.max(0, t - 0.2) / 2) * 2 + 0.2;
          hbars(g, 34, 36, [["PROTBERT MICRO", v[0], SKY.accent], ["PROTBERT MACRO", v[1], "#c98a5f"], ["PROTT5 MICRO", v[2], SKY.wave], ["PROTT5 MACRO", v[3], "#5d86b8"], ["ECPICK MICRO", v[4], SKY.ok], ["HUMANN3", v[5], SKY.bad]], { lw: 72, bw: 140, rh: 12, t: s.d ? clock : t, t0 });
          if (cur === "VALIDATION") g.text("HUMANN3 STARTS FROM RAW READS: NOT RUN HERE", 153, 112, SKY.muted, 1, "c");
        },
        click(s, x, y, t, clock) { (s.btn || []).forEach(([bx, by, bw, bh, k]) => { if (x >= bx && x < bx + bw && y >= by && y < by + bh) { s.d = k; s.c0 = clock; } }); } },
      { ch: 2, title: "Why rare enzymes are missed", dur: 16, cap: "Macro-F1, which weights every EC class equally, was up to 24 points lower than micro-F1: EC classes are long-tailed, and the model is weaker on rare ones. Misclassified proteins share little sequence with correctly classified ones (average 3-mer Jaccard similarity 0.03–0.04, maximum at most 0.20). Swapping in the ProtT5 encoder narrowed the micro–macro gap to about 10–13 points.",
        subs: [[0.3, "EC classes are long-tailed, with a few common classes and many rare ones."], [4.4, "Macro-F1, which weights each class equally, was up to 24 points lower."], [8.3, "Misclassified proteins showed little similarity to correctly classified ones."], [12.6, "Replacing the encoder with ProtT5 narrowed this gap."]],
        draw(g, t) {
          room(g);
          g.box(32, 16, 116, 70, CARD, EDGE, LITE); g.text("EXAMPLES PER EC CLASS", 90, 20, SKY.muted, 1, "c");
          for (let i = 0; i < 36; i++) { const h = Math.round(52 / (1 + i * 0.45)), lit = i > 12 && t > 2.6; if (t < 0.3 + i * 0.03) break; g.rect(38 + i * 3, 80 - h, 2, h, lit ? SKY.bad : SKY.wave); }
          if (t > 1) g.text("COMMON", 50, 30, SKY.wave); if (t > 2.6) g.text("RARE (LONG TAIL)", 140, 64, SKY.bad, 1, "r");
          if (t > 2.6) g.alpha(ease((t - 2.6) / 0.4), () => { g.text("SKIN, PROTBERT", 90, 92, SKY.muted, 1, "c"); g.tag("MICRO 0.91", 64, 100, SKY.accent, "#fff", "c"); g.tag("MACRO 0.67", 116, 100, "#c98a5f", "#fff", "c"); });
          if (t > 5) g.alpha(ease((t - 5) / 0.4), () => {
            g.box(154, 16, 122, 70, CARD, EDGE, LITE); g.text("SEQUENCE SIMILARITY", 215, 20, SKY.muted, 1, "c");
            for (let i = 0; i < 26; i++) { const a = rnd(i) * Math.PI * 2, r = rnd(i + 40) * 12; g.rect(194 + Math.cos(a) * r, 52 + Math.sin(a) * r * 0.8, 2, 2, SKY.ok); }
            [[250, 30], [262, 70], [168, 74], [256, 50], [172, 32]].forEach(([x, y]) => g.rect(x, y, 3, 3, SKY.bad));
            g.text("CORRECT", 194, 70, SKY.ok, 1, "c"); g.text("MISSED", 258, 78, SKY.bad, 1, "c");
            g.text("3-MER JACCARD: AVG 0.03-0.04, MAX <= 0.20", 215, 92, SKY.ink, 1, "c");
          });
          if (t > 7) g.alpha(ease((t - 7) / 0.4), () => g.tag("PROTT5: GAP NARROWS TO 10-13 POINTS", 215, 106, SKY.wave, SKY.bg, "c"));
        } },
      { ch: 2, title: "Takeaways", dur: 8.8, cap: "Takeaways: transformers can complement alignment, being far more precise than HUMAnN3 on well-characterized enzymes at a fraction of the compute; micro scores hide the long tail, so macro metrics matter; the encoder shapes the trade-off; and labels built by alignment may favour alignment tools. The benchmark is public on Zenodo.",
        subs: [[0.3, "Our results suggest that transformers can complement alignment-based tools,"], [4.5, "and that macro-level metrics are important for assessing rare classes."]],
        draw(g, t) {
          room(g);
          g.box(42, 20, 222, 88, CARD, EDGE, LITE); g.text("TAKEAWAYS", 153, 26, SKY.accent, 1, "c");
          ["TRANSFORMERS CAN COMPLEMENT ALIGNMENT", "MICRO SCORES HIDE THE LONG TAIL", "THE ENCODER SHAPES THE TRADE-OFF", "ALIGNMENT-BUILT LABELS MAY FAVOUR ALIGNMENT"].forEach((l, i) => { if (t > 0.5 + i * 0.8) { g.text("+", 52, 42 + i * 13, SKY.ok); g.text(l, 60, 42 + i * 13, SKY.ink); } });
          if (t > 4) g.text("BENCHMARK PUBLIC ON ZENODO", 153, 98, SKY.muted, 1, "c");
        } },
    ],
  },
};

// ---------- the window and its player
const TourPlayer = (() => {
  let tryEl, scrubbing = false, lastSec = -1, track, knob, trans = null, curSub = "", sub, head, dlg, cv, ctx, g, cap, dots, bar, playBtn, linkEl, tour, idx = 0, t = 0, playing = false, last = 0, raf = 0, imgs = {}, states = [];
  const W = 256, H = 132, SHIFT = 24, reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  function build() {
    dlg = document.createElement("dialog");
    dlg.className = "pxwin";
    dlg.setAttribute("aria-label", "Project tour");
    dlg.innerHTML = `<div class="pxwin-bar"><span class="pxwin-title"></span><button class="pxwin-x" type="button" aria-label="Close">×</button></div>
      <div class="pxwin-head"><p class="pxwin-eyebrow"></p><h3 class="pxwin-h"></h3><p class="pxwin-try" hidden></p></div>
      <div class="pxwin-stage"><canvas width="${W}" height="${H}" aria-hidden="true"></canvas></div>
      <p class="pxwin-sub" aria-hidden="true"></p><p class="pxwin-cap visually-hidden" aria-live="polite"></p>
      <div class="pxwin-ctl">
        <button type="button" class="pxb" data-act="prev" aria-label="Previous scene">◀◀</button>
        <button type="button" class="pxb play" data-act="play" aria-label="Pause">❚❚</button>
        <button type="button" class="pxb" data-act="next" aria-label="Next scene">▶▶</button>
        <div class="pxwin-track" role="slider" tabindex="0" aria-label="Position in the tour"><div class="pxwin-bar-fill"></div><div class="pxwin-dots" aria-hidden="true"></div><div class="pxwin-knob"></div></div>
        <a class="pxwin-link" target="_blank" rel="noopener"></a>
      </div>`;
    document.body.append(dlg);
    addEventListener("resize", () => { if (dlg.open) { fit(); draw(); } });
    cv = dlg.querySelector("canvas"); ctx = cv.getContext("2d"); g = pxKit(ctx);
    cap = dlg.querySelector(".pxwin-cap"); sub = dlg.querySelector(".pxwin-sub"); head = dlg.querySelector(".pxwin-head"); dots = dlg.querySelector(".pxwin-dots"); bar = dlg.querySelector(".pxwin-bar-fill"); playBtn = dlg.querySelector(".play"); linkEl = dlg.querySelector(".pxwin-link");
    dlg.querySelector(".pxwin-x").addEventListener("click", close);
    dlg.addEventListener("close", stop);
    dlg.addEventListener("click", (e) => { if (e.target === dlg) close(); }); // a click outside the window
    dlg.querySelector('[data-act="prev"]').addEventListener("click", () => go(idx - 1));
    dlg.querySelector('[data-act="next"]').addEventListener("click", () => go(idx + 1));
    playBtn.addEventListener("click", () => setPlaying(!playing));
    dlg.addEventListener("keydown", (e) => {
      if (e.key === " " && e.target.tagName !== "A") { e.preventDefault(); setPlaying(!playing); }
      if (e.key === "ArrowRight") go(idx + 1); if (e.key === "ArrowLeft") go(idx - 1);
    });
    // the progress bar can be dragged (or clicked) to any moment of the tour
    track = dlg.querySelector(".pxwin-track"); knob = dlg.querySelector(".pxwin-knob"); tryEl = dlg.querySelector(".pxwin-try");
    const at = (e) => { const r = track.getBoundingClientRect(); seek(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width))); };
    track.addEventListener("pointerdown", (e) => { e.preventDefault(); scrubbing = true; track.classList.add("drag"); track.setPointerCapture(e.pointerId); at(e); });
    track.addEventListener("pointermove", (e) => { if (scrubbing) at(e); });
    const end = () => { scrubbing = false; track.classList.remove("drag"); last = performance.now(); };
    track.addEventListener("pointerup", end); track.addEventListener("pointercancel", end);
    track.addEventListener("keydown", (e) => { const k = { Home: 0, End: 0.999 }[e.key]; if (k !== undefined) { e.preventDefault(); seek(k); } });
    cv.addEventListener("pointerdown", (e) => {
      const sc = tour.scenes[idx]; if (!sc.click) return;
      // the reader is exploring: pause here so the result stays on screen
      if (playing) setPlaying(false); states[idx].touched = true;
      const r = cv.getBoundingClientRect(); sc.click(states[idx], ((e.clientX - r.left) / r.width) * W + SHIFT, ((e.clientY - r.top) / r.height) * H, t, performance.now() / 1000);
      draw();
    });
  }
  function fit() {
    const dpr = window.devicePixelRatio || 1, avail = cv.parentElement.clientWidth * dpr;
    PXK = Math.max(1, Math.floor(avail / W));
    cv.width = W * PXK; cv.height = H * PXK;
    cv.style.width = (W * PXK) / dpr + "px"; cv.style.height = (H * PXK) / dpr + "px";
    ctx.imageSmoothingEnabled = false; trans = null;
  }
  function total() { return tour.scenes.reduce((n, s) => n + s.dur, 0); }
  function elapsed() { return tour.scenes.slice(0, idx).reduce((n, s) => n + s.dur, 0) + t; }
  function draw() {
    const sc = tour.scenes[idx];
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
    // between scenes, keynote style: the old slide slides off to the left and dissolves while the new one slides in
    const p = trans ? Math.min(1, (performance.now() - trans.t0) / 520) : 1, e = ease(p), dx = Math.round(18 * (1 - e));
    ctx.setTransform(PXK, 0, 0, PXK, (-SHIFT + dx) * PXK, 0); sc.draw(g, t, states[idx], imgs, performance.now() / 1000); ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (trans && p < 1) { ctx.globalAlpha = 1 - e; ctx.drawImage(trans.img, -Math.round(18 * e) * PXK, 0, cv.width, cv.height); ctx.globalAlpha = 1; } else trans = null;
    const pct = (100 * elapsed()) / total(), sec = Math.floor(elapsed()), mmss = (v) => `${Math.floor(v / 60)}:${String(Math.floor(v % 60)).padStart(2, "0")}`;
    bar.style.width = pct + "%"; knob.style.left = pct + "%";
    if (sec !== lastSec) { lastSec = sec; track.setAttribute("aria-valuenow", sec); track.setAttribute("aria-valuetext", `${mmss(sec)} of ${mmss(total())}`); }
    // the subtitle for this moment of the scene
    const cue = (sc.subs || []).filter(([t0]) => t >= t0).pop(), text = cue ? cue[1] : "";
    if (text !== curSub) { curSub = text; sub.classList.remove("in"); void sub.offsetWidth; sub.textContent = text; sub.classList.add("in"); }
    cv.style.cursor = sc.click ? "pointer" : "default";
    // interactive scenes: a hint above the picture; when paused there, it says how to carry on
    const st = states[idx], hint = !sc.click ? "" : !playing && (st.touched || st.waited) ? `${sc.hint}, then press ▶ to continue` : `Interactive: ${sc.hint.toLowerCase()}`;
    if (tryEl.textContent !== hint) tryEl.textContent = hint;
    tryEl.hidden = !hint; tryEl.classList.toggle("wait", !!hint && !playing);
  }
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (playing && !scrubbing) {
      t += dt;
      const sc = tour.scenes[idx];
      // at the end of an interactive scene, wait for the reader to try it (press ▶ to carry on)
      if (t >= sc.dur && sc.click && !states[idx].waited && !reduced) { states[idx].waited = true; t = sc.dur - 0.001; setPlaying(false); }
      else if (t >= sc.dur) { if (idx < tour.scenes.length - 1) go(idx + 1, true); else { t = sc.dur - 0.001; setPlaying(false); } }
    }
    draw();
    raf = requestAnimationFrame(frame);
  }
  // jump to a fraction of the whole tour (from the progress bar)
  function seek(f) {
    let T = f * total(), i = 0;
    while (i < tour.scenes.length - 1 && T >= tour.scenes[i].dur) { T -= tour.scenes[i].dur; i++; }
    if (i !== idx) go(i, true, true);
    t = Math.min(T, tour.scenes[i].dur - 0.001); draw();
  }
  function go(i, keepPlaying, quiet) {
    const to = Math.max(0, Math.min(tour.scenes.length - 1, i));
    if (to !== idx && !reduced && !quiet && cv.width) { const img = document.createElement("canvas"); img.width = cv.width; img.height = cv.height; img.getContext("2d").drawImage(cv, 0, 0); trans = { img, t0: performance.now() }; }
    idx = to; t = 0; states[idx] = {};
    const sc = tour.scenes[idx];
    cap.textContent = sc.cap;
    head.querySelector(".pxwin-eyebrow").textContent = `${tour.chapters[sc.ch]} · ${idx + 1} / ${tour.scenes.length}`;
    head.querySelector(".pxwin-h").textContent = sc.title;
    if (!quiet) { head.classList.remove("in"); void head.offsetWidth; head.classList.add("in"); }
    [...dots.children].forEach((d, k) => d.classList.toggle("on", k === sc.ch));
    if (reduced && !keepPlaying) t = sc.dur - 0.01; // without motion: each scene shown complete
    draw();
  }
  function setPlaying(p) {
    playing = p && !reduced;
    playBtn.textContent = playing ? "❚❚" : "▶"; playBtn.setAttribute("aria-label", playing ? "Pause" : "Play");
    if (p && t >= tour.scenes[idx].dur - 0.01) go(idx === tour.scenes.length - 1 ? 0 : idx + 1, true);
  }
  function stop() { cancelAnimationFrame(raf); playing = false; }
  function close() { dlg.close(); }
  function open(slug) {
    tour = TOURS[slug]; if (!tour) return;
    if (!dlg) build();
    dlg.querySelector(".pxwin-title").textContent = tour.title;
    dots.innerHTML = tour.chapters.map((c, k) => `<span style="flex:${tour.scenes.filter((s) => s.ch === k).reduce((n, s) => n + s.dur, 0)}">${c}</span>`).join("");
    track.setAttribute("aria-valuemin", 0); track.setAttribute("aria-valuemax", Math.round(total())); lastSec = -1;
    linkEl.hidden = !tour.link; if (tour.link) { linkEl.textContent = tour.link.label + " ↗"; linkEl.href = tour.link.url; }
    states = tour.scenes.map(() => ({}));
    dlg.showModal(); fit();
    document.fonts?.ready.then(() => draw());
    go(0); setPlaying(!reduced);
    last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(frame);
  }
  return { open };
})();
return { TOURS, TourPlayer };
})();
