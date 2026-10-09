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
  g.rect(0, 0, 256, 144, SKY.bg); g.rect(0, 128, 256, 1, SKY.stage);
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
function chain(g, on) {
  let x = 34;
  CHAIN.forEach((lab, i) => {
    const w = g.textW(lab) + 6, lit = on.includes(i);
    g.rect(x, 3, w, 9, lit ? SKY.accent : CARD); g.text(lab, x + 3, 5, lit ? SKY.bg : SKY.muted);
    x += w; if (i < CHAIN.length - 1) { g.text(">", x + 2, 5, SKY.trim); x += 8; }
  });
}
// ---------- the tours
const TOURS = {
  mmwave: {
    title: "Millimeter-wave breast tumor imaging · overview",
    link: { label: "Read the paper", url: "https://ieeexplore.ieee.org/document/9945009" },
    chapters: ["Motivation", "Method", "Results"],
    scenes: [
      { ch: 0, title: "Introduction", dur: 6, cap: "M.S. thesis: a preliminary study of breast tumor detection with a multi-channel 62–69 GHz millimeter-wave imaging radar.",
        subs: [[0.3, "Millimeter-wave imaging for breast tumor detection"], [3, "M.S. thesis, Chang Gung University, 2022"]],
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
      { ch: 0, title: "Why another imaging modality?", dur: 9, cap: "Current modalities involve trade-offs: ionizing radiation and compression (mammography), limited resolution (ultrasound), high cost and contrast agents (MRI).",
        subs: [[0.3, "Mammography: ionizing radiation and breast compression"], [2.0, "Ultrasound: limited resolution"], [3.6, "MRI: high cost, often with a contrast agent"], [6, "A safe, low-cost sensor could complement them"]],
        draw(g, t, s, I) {
          room(g);
          const show = (k) => t > 0.4 + k * 1.6, tagAt = (k) => t > 1.2 + k * 1.6;
          // X-ray mammography: a tall unit with an arm and two plates pressing together
          if (show(0)) { g.box(52, 40, 20, 88, "#dfe4e8", "#111", "#fff"); g.box(70, 58, 26, 6, "#c9d0d6"); const sq = tick(t, 4) % 1 < 0.5 ? 0 : 2; g.box(70, 76 - sq, 26, 5, "#c9d0d6"); g.box(70, 86, 26, 5, "#aab3bb"); g.text("MAMMOGRAPHY", 66, 132, SKY.ink, 1, "c"); }
          if (tagAt(0)) { g.tag("IONIZING RADIATION", 74, 28, SKY.bad, "#fff", "c"); }
          // ultrasound: a cart with a screen of grey speckle and a probe on a cable
          if (show(1)) { g.box(118, 92, 34, 36, "#e7ebee", "#111", "#fff"); g.box(120, 58, 30, 26, "#2b2e35"); for (let i = 0; i < 70; i++) g.px(123 + ((i * 37 + tick(t, 6) * 60) % 24), 61 + ((i * 53) % 20), i % 3 ? "#7a7f86" : "#c9cdd3"); g.rect(134, 84, 2, 8, "#555"); g.box(154, 96, 5, 12, "#cfd6dc"); g.line(156, 96, 150, 90, "#555"); g.text("ULTRASOUND", 135, 132, SKY.ink, 1, "c"); }
          if (tagAt(1)) g.tag("LIMITED RESOLUTION", 135, 46, SKY.bad, "#fff", "c");
          // MRI: a big ring with a table through it
          if (show(2)) { g.disc(212, 84, 30, 30, "#111"); g.disc(212, 84, 29, 29, "#eef1f4"); g.disc(212, 84, 13, 13, "#111"); g.disc(212, 84, 12, 12, "#4a5568"); g.box(176, 94, 72, 6, "#cfd6dc"); g.rect(196, 100, 4, 28, "#9aa6b0"); g.rect(226, 100, 4, 28, "#9aa6b0"); g.text("MRI", 212, 132, SKY.ink, 1, "c"); }
          if (tagAt(2)) g.tag("COST, CONTRAST AGENT", 212, 28, SKY.bad, "#fff", "c");
        } },
      { ch: 0, title: "Principle: dielectric contrast", dur: 8, cap: "Principle: malignant tissue has a higher water content than adipose tissue, so its dielectric properties differ sharply and it reflects millimeter waves more strongly.",
        subs: [[0.3, "Tumors hold more water than the surrounding fat"], [3, "so their dielectric properties differ sharply"], [5.5, "and they reflect millimeter waves more strongly"]],
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
      { ch: 0, title: "Research gap: above 50 GHz", dur: 8, cap: "Prior radar-based breast imaging systems operated at or below 50 GHz. This work evaluates 62–69 GHz, where resolution improves at the cost of penetration depth.",
        subs: [[0.3, "Prior radar breast imaging stayed at or below 50 GHz"], [3.6, "This work: 62 to 69 GHz"], [5.5, "Higher frequency: finer resolution, shallower penetration"]],
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
      { ch: 1, title: "Tissue-mimicking phantoms", dur: 8, cap: "Tissue-mimicking phantoms. Water sets the high permittivity of water-rich tissue, sunflower oil mimics fat, gelatin forms the solid matrix, and a surfactant emulsifies oil and water. The tumor uses far less oil and twice the gelatin, so its water fraction and permittivity are higher.",
        subs: [[0.2, "Phantom recipe: water, oil, gelatin, surfactant"], [2.8, "each standing in for a property of breast tissue"], [4.4, "Tumor: less oil, more gelatin, so more water"], [5.8, "Measured permittivity: 14.8 (breast) vs. 40.7 (tumor)"]],
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
      { ch: 1, title: "Data acquisition", dur: 7.5, cap: "Data acquisition: a Vayyar IMAGEVK-74 MIMO radar (20 Tx × 20 Rx) in an absorber-lined enclosure records 400 channels × 150 frequency points from 62 to 69 GHz.",
        subs: [[0.3, "Vayyar IMAGEVK-74: a 20 Tx × 20 Rx MIMO radar"], [2.8, "An absorber-lined enclosure blocks stray reflections"], [5, "400 channels × 150 frequency points, 62 to 69 GHz"]],
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
      { ch: 1, title: "Wave propagation in tissue", dur: 9, cap: "Propagation: at the phantom surface part of the wave reflects (the strong early response); the rest is attenuated as it travels through the tissue. At the tumor the dielectric contrast reflects part of it back, attenuated again on the way out. Higher frequencies attenuate faster.",
        subs: [[0.3, "Part of the wave reflects at the surface"], [3, "the rest is attenuated inside the tissue"], [5.8, "and the tumor's dielectric contrast reflects it back"]],
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
      { ch: 1, title: "Signal model: 20 × 20 MIMO", dur: 12, cap: "Signal model: each of the 20 transmitters fires in turn while all 20 receivers listen, giving 20 × 20 = 400 channels. Each channel is a 150-point frequency sweep (I/Q) from 62 to 69 GHz; an inverse FFT turns it into a 512-sample echo in time, where each peak is a reflector at a given distance.",
        subs: [[0.2, "Each transmitter fires in turn; all 20 receivers listen"], [3.6, "20 × 20 = 400 channels, each a 150-point frequency sweep"], [7.2, "Inverse FFT: each sweep becomes an echo in time"], [9.6, "Each peak is a reflector: later echoes come from deeper"]],
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
      { ch: 1, title: "Clutter removal: average subtraction", dur: 10, cap: "Clutter removal by average subtraction: antenna coupling and the surface reflection arrive early and look nearly the same in every channel. Their mean over all 400 channels is subtracted from each channel, which removes the shared early response while the tumor response, different in every channel, remains.",
        subs: [[0.2, "Every channel starts with a strong early echo"], [2.6, "It is nearly identical across channels: take the mean"], [5.2, "Subtract the mean from each channel"], [7.6, "The early echo is gone; the tumor response remains"]],
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
      { ch: 1, title: "Delay-and-sum beamforming", dur: 10, cap: "Delay-and-sum beamforming: for every point in the image, the round-trip distance from each transmitter to that point and back to each receiver gives a delay. Each channel is read at its own delay and all 400 are summed. Repeating this for every point builds the image; only at the tumor do the channels add up in phase.",
        subs: [[0.2, "For one image point: path from a transmitter to the point, back to a receiver"], [2.8, "That path sets the delay τ for this Tx–Rx pair"], [5, "Read all 400 channels at their delays and sum them"], [6.8, "Repeat for every point: energy builds up only at the tumor"]],
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
      { ch: 1, title: "Delay-and-sum: try it", dur: 10, interactive: true, cap: "Delay-and-sum beamforming: each channel is shifted by its round-trip delay to every image point and the channels are summed; they add coherently only at the target. Click the image to relocate the target.",
        subs: [[0.2, "At the tumor, the delayed channels line up in phase"], [3.5, "so their sum is large; elsewhere they cancel"], [6.2, "Try it: click the image to move the target"]],
        draw(g, t, s, I) {
          room(g); chain(g, [3]);
          s.tx ??= 9; s.ty ??= 6; s.t0 ??= 0;
          // five channels' echoes, each arriving at a different time, sliding into line
          g.box(52, 16, 84, 100, CARD, EDGE, LITE);
          g.text("DELAYED CHANNELS", 94, 20, SKY.muted, 1, "c");
          const align = ease((t - 1) / 2.5), delays = [-14, 9, -6, 16, -10];
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
          const grow = ease((t - s.t0 - 3) / 1.5);
          for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
            const d2 = ((i - s.tx) ** 2) / 2.2 + ((j - s.ty) ** 2) / 5, n = 0.08 + 0.06 * Math.sin(i * 12.9 + j * 7.1 + Math.floor(t * 3));
            g.rect(X0 + i * C, Y0 + j * C, C, C, g.jet(Math.min(1, n + grow * Math.exp(-d2) * 0.95)));
          }
          if (grow > 0.9) g.ring(X0 + s.tx * C + 3, Y0 + s.ty * C + 3, 7, "#fff");
          if (blinkOn(t, 1)) g.text("CLICK TO RELOCATE TARGET", X0 + (NX * C) / 2, Y0 + NY * C + 5, SKY.ink, 1, "c");
          s.hit = { X0, Y0, C, NX, NY };
        },
        click(s, x, y, t) {
          const h = s.hit; if (!h) return;
          const i = Math.floor((x - h.X0) / h.C), j = Math.floor((y - h.Y0) / h.C);
          if (i >= 0 && j >= 0 && i < h.NX && j < h.NY) { s.tx = i; s.ty = j; s.t0 = t - 3; }
        } },
      { ch: 1, title: "Background subtraction and localization", dur: 8.5, cap: "Background subtraction and localization: an empty-scene image is subtracted from the target image to remove the enclosure's reflections, values unrelated to the target are set to zero, and the centroid of what remains is compared with the true position (MSE).",
        subs: [[0.3, "Subtract an empty-scene scan to remove the enclosure"], [3.2, "Threshold everything unrelated to the target"], [4.6, "Its centroid vs. the true position gives the error (MSE)"]],
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
      { ch: 2, title: "Phantom results", dur: 10, cap: "Phantom results: maximum detection depth 2 cm, minimum detectable size 0.6 cm, and correct localization at every position tested. Beneath a skin layer the tumor was not detected, as penetration at these frequencies is limited.",
        subs: [[0.2, "Detected up to 2 cm deep"], [1.7, "and as small as 0.6 cm"], [3.2, "Localized correctly at every position tested"], [4.7, "Under a skin layer, the tumor was not detected"]],
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
      { ch: 2, title: "Why skin and fur are difficult", dur: 9, cap: "Why skin and fur are difficult: skin's high water content gives a strong surface reflection and absorbs most of the remaining energy within about 1 mm. Fur and an uneven surface scatter the wave into clutter that differs between channels, so average subtraction cannot remove it.",
        subs: [[0.3, "Skin is water-rich: it reflects strongly"], [2.8, "and absorbs the rest within about 1 mm"], [5.3, "Fur scatters the wave into clutter that varies per channel"]],
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
      { ch: 2, title: "Key findings and future work", dur: 7, cap: "Future work: improved hardware, reconstruction algorithms beyond delay-and-sum, and anatomical sites without a skin barrier.",
        subs: [[0.3, "A clear resolution–depth trade-off at 62 to 69 GHz"], [3.5, "Next: better hardware, reconstruction beyond delay-and-sum"]],
        draw(g, t, s, I) {
          room(g);
          g.box(60, 16, 186, 82, CARD, EDGE, LITE);
          g.text("KEY FINDINGS", 153, 24, SKY.accent, 1, "c");
          ["RESOLUTION VS. DEPTH TRADE-OFF", "SKIN PENETRATION IS LIMITING", "MULTI-ANGLE FUSION AIDS SIZING", "VALIDATED PHANTOMS ARE ESSENTIAL"].forEach((l, i) => { if (t > 0.5 + i * 0.9) { g.text("+", 70, 40 + i * 12, SKY.ok); g.text(l, 78, 40 + i * 12, SKY.ink); } });
          if (t > 4.5) g.text("KAO AND CHAO, IEEE ECBIOS 2022", 153, 106, SKY.muted, 1, "c");
        } },
    ],
  },
};

// ---------- the window and its player
const TourPlayer = (() => {
  let trans = null, curSub = "", sub, head, dlg, cv, ctx, g, cap, dots, bar, playBtn, linkEl, tour, idx = 0, t = 0, playing = false, last = 0, raf = 0, imgs = {}, states = [];
  const W = 256, H = 144, SHIFT = 24, reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  function build() {
    dlg = document.createElement("dialog");
    dlg.className = "pxwin";
    dlg.setAttribute("aria-label", "Project tour");
    dlg.innerHTML = `<div class="pxwin-bar"><span class="pxwin-title"></span><button class="pxwin-x" type="button" aria-label="Close">×</button></div>
      <div class="pxwin-head"><p class="pxwin-eyebrow"></p><h3 class="pxwin-h"></h3></div>
      <div class="pxwin-stage"><canvas width="${W}" height="${H}" aria-hidden="true"></canvas></div>
      <p class="pxwin-sub" aria-hidden="true"></p><p class="pxwin-cap visually-hidden" aria-live="polite"></p>
      <div class="pxwin-ctl">
        <button type="button" class="pxb" data-act="prev" aria-label="Previous scene">◀◀</button>
        <button type="button" class="pxb play" data-act="play" aria-label="Pause">❚❚</button>
        <button type="button" class="pxb" data-act="next" aria-label="Next scene">▶▶</button>
        <div class="pxwin-track"><div class="pxwin-bar-fill"></div><div class="pxwin-dots"></div></div>
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
    cv.addEventListener("pointerdown", (e) => {
      const sc = tour.scenes[idx]; if (!sc.click) return;
      const r = cv.getBoundingClientRect(); sc.click(states[idx], ((e.clientX - r.left) / r.width) * W + SHIFT, ((e.clientY - r.top) / r.height) * H, t);
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
    ctx.setTransform(PXK, 0, 0, PXK, (-SHIFT + dx) * PXK, 0); sc.draw(g, t, states[idx], imgs); ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (trans && p < 1) { ctx.globalAlpha = 1 - e; ctx.drawImage(trans.img, -Math.round(18 * e) * PXK, 0, cv.width, cv.height); ctx.globalAlpha = 1; } else trans = null;
    bar.style.width = (100 * elapsed()) / total() + "%";
    // the subtitle for this moment of the scene
    const cue = (sc.subs || []).filter(([t0]) => t >= t0).pop(), text = cue ? cue[1] : "";
    if (text !== curSub) { curSub = text; sub.classList.remove("in"); void sub.offsetWidth; sub.textContent = text; sub.classList.add("in"); }
    cv.style.cursor = sc.click ? "pointer" : "default";
  }
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (playing) {
      t += dt;
      const sc = tour.scenes[idx];
      if (t >= sc.dur) { if (idx < tour.scenes.length - 1) go(idx + 1, true); else { t = sc.dur - 0.001; setPlaying(false); } }
    }
    draw();
    raf = requestAnimationFrame(frame);
  }
  function go(i, keepPlaying) {
    const to = Math.max(0, Math.min(tour.scenes.length - 1, i));
    if (to !== idx && !reduced && cv.width) { const img = document.createElement("canvas"); img.width = cv.width; img.height = cv.height; img.getContext("2d").drawImage(cv, 0, 0); trans = { img, t0: performance.now() }; }
    idx = to; t = 0; states[idx] = {};
    const sc = tour.scenes[idx];
    cap.textContent = sc.cap;
    head.querySelector(".pxwin-eyebrow").textContent = `${tour.chapters[sc.ch]} · ${idx + 1} / ${tour.scenes.length}`;
    head.querySelector(".pxwin-h").textContent = sc.title;
    head.classList.remove("in"); void head.offsetWidth; head.classList.add("in");
    [...dots.children].forEach((d, k) => d.classList.toggle("on", k === sc.ch));
    if (reduced && !keepPlaying) t = sc.dur - 0.01; // without motion: each scene shown complete
    draw();
  }
  function setPlaying(p) {
    playing = p && !reduced;
    playBtn.textContent = playing ? "❚❚" : "▶"; playBtn.setAttribute("aria-label", playing ? "Pause" : "Play");
    if (p && idx === tour.scenes.length - 1 && t >= tour.scenes[idx].dur - 0.01) go(0);
  }
  function stop() { cancelAnimationFrame(raf); playing = false; }
  function close() { dlg.close(); }
  function open(slug) {
    tour = TOURS[slug]; if (!tour) return;
    if (!dlg) build();
    dlg.querySelector(".pxwin-title").textContent = tour.title;
    dots.innerHTML = tour.chapters.map((c, k) => `<button type="button" data-ch="${k}" style="flex:${tour.scenes.filter((s) => s.ch === k).reduce((n, s) => n + s.dur, 0)}">${c}</button>`).join("");
    dots.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => go(tour.scenes.findIndex((s) => s.ch === +b.dataset.ch))));
    linkEl.textContent = tour.link.label + " ↗"; linkEl.href = tour.link.url;
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
