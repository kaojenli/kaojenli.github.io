// Jen's building: a two-storey cabin, cut away like a Habbo room build. The ground floor is open plan: the living
// room, the entrance hall with the stairs, the café (its counter under the loft) and the hacker room, with the sidewalk
// and the practice field outside. The loft behind and above it holds the labs (mmWave, MRI, reading room, server room,
// security room) along a railed gallery. Each project has its own room (customer tracking has the café and the hacker
// room next to it). Draws the hero overview (speech bubbles; a coffee drinker, a cat and a dog who wander through
// doorways) and a close-up of each project's room(s) for the project list.
const OX = 264, OY = 186, NX = 20, NY = 16;          // ground grid NX×NY tiles
// The floors: the ground floor's rooms run from its back wall (y = 5) to y = 13; the loft sits behind it, y = 0..5.
const FLOORS = [{ level: 0, y0: 5, depth: 8 }, { level: 1, y0: 0, depth: 5 }];
const H = 64, SLAB = 6, WALL = H - SLAB, LOW = 12;   // storey height, floor slab, wall height, low partitions
const VW = 592, VH = 488;                            // overview viewBox
const lift = (level, inner) => (level ? `<g transform="translate(0 ${-level * H})">${inner}</g>` : inner);
const INK = "#161616"; // Habbo furni: black outlines
const iso = (x, y) => [OX + (x - y) * 16, OY + (x + y) * 8];
const up = ([x, y], h) => [x, y - h];
const poly = (p, fill, stroke = INK) => `<polygon points="${p.join(" ")}" fill="${fill}" stroke="${stroke}" stroke-width="0.5"/>`;
const circle = (cx, cy, r, fill, extra = "") => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"${extra}/>`;
const rect = (x, y, w, h, fill, extra = "") => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"${extra}/>`;
// Flat drawing on a vertical plane: u runs along the plane, v is height above the floor.
// dir 0.5 = plane runs toward the front-right (right walls, box left faces); -0.5 = toward the back-right.
const plane = ([x, y], dir, inner) => `<g transform="matrix(1 ${dir} 0 -1 ${x} ${y})">${inner}</g>`;
const onWall = (name, u, v) => `<g transform="translate(${u} ${v}) scale(1 -1)">${propImg(name)}</g>`; // prop upright on a plane
const tiles = (inner) => `<g transform="matrix(16 8 -16 8 ${OX} ${OY})">${inner}</g>`; // draw in floor-tile units

// While drawing a scene this collects the ground shadows of boxes standing on the floor (drawn under everything).
let shadows = null;
// Box on footprint [x0, x0+w] × [y0, y0+d], height h, lifted by z. c = [top, left face, right face].
// Sides get a light-to-dark gradient and the top's front edges a highlight, so boxes read as solid.
function box(x0, y0, w, d, h, c, z = 0) {
  const A = iso(x0, y0 + d), B = iso(x0 + w, y0 + d), C = iso(x0 + w, y0), D = iso(x0, y0);
  if (shadows && z === 0 && h >= 6) {
    const s = Math.min(h / 36, 0.9); // light from the back-right: the shadow falls toward the front-left
    shadows.push(poly([D, C, iso(x0 + w, y0 + d + s), iso(x0, y0 + d + s)], "rgba(20,40,60,.16)", "none"));
  }
  const L = [up(A, z), up(B, z), up(B, z + h), up(A, z + h)], R = [up(B, z), up(C, z), up(C, z + h), up(B, z + h)];
  const lift = ([x, y]) => [x, y + 0.6], mix = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
  const [tD, tC, tB, tA] = [D, C, B, A].map((p) => up(p, z + h));
  // thin pieces (legs, rails, poles) get flat faces only: the banding, sheen, grain and edge light wouldn't show
  if (Math.min(w, d) * 16 < 3) return poly(L, c[1]) + poly(R, c[2]) + poly([tD, tC, tB, tA], c[0]);
  const sheen = w * d > 0.2 ? poly([mix(tD, tC, 0.32), mix(tD, tC, 0.52), mix(tA, tB, 0.52), mix(tA, tB, 0.32)], "rgba(255,255,255,.16)", "none") : ""; // "vertical banding" on tops
  const bands = h >= 2.5 ? poly(L, "url(#shadeL)", "none") + poly(R, "url(#shadeR)", "none") : "";
  return poly(L, c[1]) + poly(R, c[2]) + bands + poly([tD, tC, tB, tA], c[0]) + sheen + material(c, x0, y0, w, d, h, z) +
    `<polyline points="${[up(A, z + h), up(B, z + h), up(C, z + h)].map(lift).join(" ")}" fill="none" stroke="rgba(255,255,255,.4)" stroke-width="0.5"/>`;
}
// Material texture on a box's faces, picked from the palette it was drawn with (see MATERIAL below).
function material(c, x0, y0, w, d, h, z) {
  const kind = MATERIAL.get(c);
  if (!kind || h < 3) return "";
  const lw = w * 16, rw = d * 16, onL = (inner) => plane(up(iso(x0, y0 + d), z), 0.5, inner), onR = (inner) => plane(up(iso(x0 + w, y0 + d), z), -0.5, inner);
  const top = (inner) => raised(z + h, inner);
  if (kind === "wood") {
    const grain = (len) => [0.3, 0.62].map((f) => rect(0, h * f, len, 0.5, "rgba(70,35,10,.28)")).join("") + (len > 6 ? rect(len * 0.4, h * 0.45, 2, 0.5, "rgba(70,35,10,.22)") : "");
    const lines = w >= d ? [0.3, 0.6].map((f) => rect(x0, y0 + d * f, w, 0.03, "rgba(70,35,10,.18)")).join("") : [0.3, 0.6].map((f) => rect(x0 + w * f, y0, 0.03, d, "rgba(70,35,10,.18)")).join("");
    return onL(grain(lw)) + onR(grain(rw)) + top(lines);
  }
  if (kind === "metal") return onL(rect(1, 1, 1, h - 2, "rgba(255,255,255,.35)") + rect(lw - 2, 1, 0.8, h - 2, "rgba(0,0,0,.18)")) + onR(rect(1, 1, 0.8, h - 2, "rgba(255,255,255,.2)")) +
    top(rect(x0 + w * 0.15, y0 + d * 0.2, w * 0.25, 0.04, "rgba(255,255,255,.7)"));
  if (kind === "fabric") return onL(rect(0, 0, lw, h, "url(#weave)")) + onR(rect(0, 0, rw, h, "url(#weave)")) + top(rect(x0, y0, w, d, "url(#weaveTop)"));
  if (kind === "glass") return onL([0.25, 0.45].map((f) => `<polygon points="${lw * f},1 ${lw * f + 2},1 ${lw * f + 0.5},${h - 1} ${lw * f - 1.5},${h - 1}" fill="rgba(255,255,255,.55)"/>`).join(""));
  return "";
}
const leftFace = (x0, y0, d, z, inner) => plane(up(iso(x0, y0 + d), z), 0.5, inner);          // faces +y, length w*16
const rightFace = (x0, y0, w, d, z, inner) => plane(up(iso(x0 + w, y0 + d), z), -0.5, inner);  // faces +x, length d*16

// Stable hash in [0, 1) for material variation (board tones, joints, knots), independent of the seeded rnd().
const hsh = (a, b = 0) => { const t = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return t - Math.floor(t); };
// Deterministic "random" so the scene looks the same on every visit.
let seed = 11;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const pickSeeded = (arr) => arr[Math.floor(rnd() * arr.length)];

// Top-left corner that puts a w×h picture's bottom-centre on floor point (x, y).
const at = (x, y, w, h) => { const [sx, sy] = iso(x, y); return [Math.round(sx - w / 2), Math.round(sy - h)]; };
const onFloor = (x, y, z, name, cls = "") => {
  const { w, h } = propImage(name), [px, py] = at(x, y, w, h);
  const g = propImg(name, px, py - z);
  return cls ? `<g class="${cls}">${g}</g>` : g; // animated class on a wrapper: a CSS transform would replace the translate
};

const WOOD = ["#c98b4f", "#a86f3b", "#8a5a2e"], DARK = ["#8b5a2b", "#6f4722", "#58381b"], CASE = ["#555c6b", "#3f4552", "#2d323c"];
const BLUE = ["#4f86c6", "#3b6fb6", "#2c5892"], RED = ["#e0584f", "#c2433b", "#9e342d"], WHITE = ["#f4f6f8", "#dfe4e9", "#c6cdd4"];
const LOG = ["#c47e40", "#a8652f", "#8a4f22"], SHELF = ["#d9d2c3", "#bfb6a4", "#a59b88"], BOOKCASE = ["#a0683a", "#8b5a2b", "#6f4722"];
const WOODS = { walnut: "#6e4630", brown: "#7d5237", honey: "#946a45", pale: "#b99a74", dark: "#4a3326" }; // wall boards
const STONE = ["#b3aea5", "#948f86", "#78736b"];
const stones = (len, h, shade) => {
  let s = rect(0, 0, len, h, "#4b4741");
  for (let v = 0, row = 0; v < h - 1; v += 4, row++) for (let u = row % 2 ? -3 : 0, sw; u < len; u += sw) {
    sw = 5 + Math.floor(hsh(u, v + len) * 4); // (stones of different widths)
    // each stone its own: warmer or cooler, lighter or darker; a lit top edge, a shaded underside, a speckled face, now
    // and then a hairline crack or a chipped corner
    const tint = hsh(u + 1, v) < 0.5 ? "#c8b49a" : "#8e9aa6", t = mixHex(mixHex(pickSeeded(shade), tint, 0.1 + hsh(v, u + 2) * 0.25), hsh(v, u) < 0.5 ? "#ffffff" : "#000000", hsh(u, v) * 0.14);
    const u0 = Math.max(0, u) + 0.5, w = Math.min(u + sw, len) - u0 - 0.5, sh = Math.min(3, h - v - 0.5);
    if (w <= 0 || sh <= 0) continue;
    s += rect(u0, v + 0.5, w, sh, t) + rect(u0, v + 0.5 + sh - 0.6, w, 0.6, "rgba(255,255,255,.32)") + rect(u0, v + 0.5, 0.5, sh, "rgba(255,255,255,.16)") +
      rect(u0, v + 0.5, w, 0.5, "rgba(0,0,0,.24)") + rect(u0 + w - 0.5, v + 0.5, 0.5, sh, "rgba(0,0,0,.18)");
    for (let q = 0; q < Math.round(w * 1.6); q++) s += rect(u0 + hsh(q, u + v) * (w - 0.6), v + 0.7 + hsh(u + v, q) * (sh - 0.9), 0.6, 0.55, hsh(q, v) < 0.55 ? "rgba(0,0,0,.2)" : "rgba(255,255,255,.28)");
    if (hsh(v + 5, u) < 0.18) s += `<polyline points="${u0 + w * 0.3},${v + 0.6} ${u0 + w * 0.45},${v + sh * 0.5} ${u0 + w * 0.4},${v + sh}" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="0.35"/>`;
    if (hsh(u, v * 3) < 0.22) s += rect(u0 + w - 1.2, v + 0.5 + sh - 0.9, 1.2, 0.9, "#4b4741");
  }
  return s;
};
const GRASS = ["#6cbd4a", "#6cbd4a"], GREEN = "#39ff88", HEDGE = ["#5cb346", "#469a3a", "#357d2d"];
const raised = (h, inner) => `<g transform="translate(0 ${-h})">${tiles(inner)}</g>`; // floor-space drawing lifted h
// Surface texture for one floor tile (tile units; 0.05 of a tile is about 2 screen pixels).
const specks = (i, j, n, colors, size = 0.05) => Array.from({ length: n }, () => rect(i + rnd() * 0.94, j + rnd() * 0.94, size, size, pickSeeded(colors))).join("");
// A flat slab (tile, flagstone) in floor space, inset from its grout: lit far edges, shaded near ones.
const flag = (x, y, w, d, t) => rect(x + 0.02, y + 0.02, w - 0.04, d - 0.04, t) + rect(x + 0.03, y + 0.03, w - 0.06, 0.035, "rgba(255,255,255,.4)") + rect(x + 0.03, y + 0.03, 0.035, d - 0.06, "rgba(255,255,255,.28)") +
  rect(x + 0.03, y + d - 0.065, w - 0.06, 0.035, "rgba(0,0,0,.16)") + rect(x + w - 0.065, y + 0.03, 0.035, d - 0.06, "rgba(0,0,0,.22)");
const TEX = {
  grass: (i, j) => specks(i, j, 3, ["rgba(255,255,255,.18)", "rgba(20,70,10,.2)"]) + rect(i + rnd() * 0.8, j + rnd() * 0.8, 0.03, 0.12, "rgba(20,70,10,.25)"),
  // wood: four planks per tile running along x, each board its own tone with a lit edge, a dark gap, staggered end joints,
  // grain and the odd knot
  wood: (i, j, c) => {
    const tones = [c, mixHex(c, "#ffffff", 0.18), mixHex(c, "#000000", 0.2), mixHex(c, "#d08a4a", 0.26), mixHex(c, "#3a1f10", 0.14)];
    let s = "";
    for (let k = 0; k < 4; k++) {
      const R = j * 4 + k, y0 = j + k * 0.25, off = hsh(R) * 1.5;
      for (let a = i; a < i + 1 - 1e-6;) {
        const n = Math.floor((a - off) / 1.5), b = Math.min(i + 1, off + (n + 1) * 1.5), t = tones[Math.floor(hsh(R, n) * 5)];
        s += rect(a, y0, b - a, 0.25, t);
        // grain: a long dark line and a shorter pale one along the board, each starting somewhere of its own
        s += rect(a + (b - a) * (0.05 + hsh(R, n + 3) * 0.2), y0 + 0.06 + hsh(R, n + 5) * 0.06, (b - a) * (0.4 + hsh(R, n + 9) * 0.4), 0.022, mixHex(t, "#000000", 0.3));
        if (hsh(R, n + 7) < 0.7) s += rect(a + (b - a) * (0.3 + hsh(R, n + 4) * 0.3), y0 + 0.15 + hsh(R, n + 6) * 0.05, (b - a) * 0.3, 0.016, mixHex(t, "#ffffff", 0.18));
        if (hsh(R, n + 11) < 0.1) { const kx = a + (b - a) * 0.6, ky = y0 + 0.13; s += `<ellipse cx="${kx}" cy="${ky}" rx="0.07" ry="0.045" fill="${mixHex(t, "#000000", 0.18)}"/><ellipse cx="${kx}" cy="${ky}" rx="0.035" ry="0.022" fill="${mixHex(t, "#000000", 0.38)}"/>`; }
        if (b < i + 1 - 1e-6) s += rect(b - 0.012, y0, 0.024, 0.25, "rgba(30,15,5,.6)") + rect(b + 0.012, y0, 0.02, 0.25, "rgba(255,230,190,.18)");
        a = b;
      }
      s += rect(i, y0, 1, 0.022, "rgba(255,230,190,.2)") + rect(i, y0 + 0.228, 1, 0.022, "rgba(30,15,5,.55)");
    }
    return s;
  },
  tile: (i, j, c) => rect(i, j, 1, 1, mixHex(c, "#000000", 0.22)) + flag(i, j, 1, 1, mixHex(c, hsh(i, j) < 0.5 ? "#ffffff" : "#000000", 0.035)) + rect(i + 0.15, j + 0.15, 0.25, 0.04, "rgba(255,255,255,.4)"),
  carpet: (i, j) => specks(i, j, 2, ["rgba(255,255,255,.1)", "rgba(0,0,0,.12)"]),
  field: (i, j) => rect(i, j, 1, 1, i % 2 ? "rgba(255,255,255,.07)" : "rgba(0,40,0,.05)") + specks(i, j, 2, ["rgba(255,255,255,.15)", "rgba(20,70,10,.18)"]),
  paving: (i, j, c) => { const t = (a, b) => mixHex(c, hsh(a, b) < 0.5 ? "#ffffff" : "#000000", 0.06 * hsh(b, a)), g = mixHex(c, "#000000", 0.28);
    return rect(i, j, 1, 1, g) + (j % 2 ? flag(i, j, 1, 0.5, t(i, j)) + flag(i, j + 0.5, 0.6, 0.5, t(i + 3, j)) + flag(i + 0.6, j + 0.5, 0.4, 0.5, t(i + 5, j))
      : flag(i, j, 0.45, 0.5, t(i, j + 9)) + flag(i + 0.45, j, 0.55, 0.5, t(i + 1, j + 9)) + flag(i, j + 0.5, 1, 0.5, t(i + 2, j + 9))); },
};
const tree = (x, y, name = "tree") => { const [bx, by] = iso(x, y); return `<ellipse cx="${bx - 3}" cy="${by}" rx="12" ry="4.5" fill="rgba(20,40,60,.2)"/>` + onFloor(x, y, 0, name); };
function lamp(x, y) {
  const [lx, ly] = up(iso(x, y), 33);
  return box(x - 0.04, y - 0.04, 0.08, 0.08, 30, CASE) + box(x - 0.13, y - 0.13, 0.26, 0.26, 6, ["#fff3b0", "#f6c945", "#c9962a"], 30) +
    box(x - 0.16, y - 0.16, 0.32, 0.32, 1.5, CASE, 36) + circle(lx, ly, 16, "url(#glow)", ' class="glow"');
}
const codeLines = (u, v, n, w, color) => Array.from({ length: n }, (_, i) => rect(u, v - 2 * i, Math.max(2, Math.round(w * (0.4 + rnd() * 0.6))), 1, color)).join("");
const blinkAttr = () => ` class="blink" style="animation-delay:-${pickSeeded([0, 0.4, 0.8])}s"`; // three shared phases: few repaints
// A rack's front: the frame, the servers set back in it, each blade with a handle and blinking lights.
const rackFront = (len, h) => hole(1.2, 1.5, len - 2.4, h - 3, 2.5, { back: "#15171b", side: "#2b2e35", floor: "#3a3d44",
  inside: `<g transform="translate(1.2 1.2)">${Array.from({ length: Math.floor((h - 5) / 4.2) }, (_, k) => { const v = 2.3 + k * 4.2;
    return rect(2, v, len - 5, 3.6, "#2b2f37", ` stroke="#111" stroke-width="0.3"`) + rect(3, v + 1.2, 1.2, 1.2, "#8a8f98") + [0, 1, 2].map((i) => rect(len - 8 + i * 1.6, v + 1.4, 0.9, 0.8, pickSeeded([GREEN, "#3bb8ff", "#ffb800"]), blinkAttr())).join(""); }).join("")}</g>` });
const leds = (len, h) => {
  let s = "";
  for (let v = 5; v < h - 3; v += 5) for (let u = 2; u < len - 2; u += 3) s += rect(u, v, 2, 1, pickSeeded([GREEN, "#3bb8ff", "#ffb800"]), blinkAttr());
  return s;
};

// The pitcher's wind-up drawn as a pose-estimation skeleton, from the avatar's own joints in each frame (design grid → units).
const skeleton = (poseName) => {
  const P = POSES[poseName], u = ([x, y]) => [(x * K) / 2, (y * K) / 2];
  const k = { head: u([15, 17]), neck: u([15, 31]), ls: u(P.armL[0]), rs: u(P.armR[0]), le: u(P.armL[1]), re: u(P.armR[1]), lw: u(P.armL[2]), rw: u(P.armR[2]),
    lh: u(P.legL[0]), rh: u(P.legR[0]), lk: u(P.legL[1]), rk: u(P.legR[1]), la: u(P.legL[2]), ra: u(P.legR[2]) };
  const bones = ["head-neck", "neck-ls", "neck-rs", "ls-le", "le-lw", "rs-re", "re-rw", "ls-lh", "rs-rh", "lh-rh", "lh-lk", "lk-la", "rh-rk", "rk-ra"];
  return `<g class="skel">` +
    bones.map((b) => { const [p, q] = b.split("-").map((n) => k[n]); return `<line x1="${p[0]}" y1="${p[1]}" x2="${q[0]}" y2="${q[1]}" stroke="${GREEN}" stroke-width="0.5"/>`; }).join("") +
    Object.values(k).map(([x, y]) => rect(x - 0.75, y - 0.75, 1.5, 1.5, "#ff3b7f")).join("") + `</g>`;
};
// Tracking box drawn around a person, like a detector's output (sized from the avatar canvas, in units).
const bbox = (color) => `<g class="bbox"><rect x="1.5" y="1.5" width="${AW / 2 - 3}" height="${AH / 2 - 1.5}" fill="none" stroke="${color}" stroke-width="0.5" stroke-dasharray="2 1"/>` + rect(1, -1.5, 6, 2.5, color) + `</g>`;

// The floor being drawn (people remember it, for who looks at whom).
let curLevel = 0;
const who = (look, w, h, x, y, z, cls, inner) => {
  const [px, py] = at(x, y, w, h);
  return `<g class="person who ${cls}" data-look="${look}" data-w="${w}" data-h="${h}" role="button" tabindex="0" aria-label="${CONTENT.npcs[look].name}" style="transform:translate(${px}px,${py - z}px)">` +
    (z > 0 ? "" : `<ellipse cx="${w / 2}" cy="${h - 1}" rx="${Math.ceil(w / 3)}" ry="2.5" fill="rgba(0,0,0,.2)"/>`) + `${inner}<rect class="hit" width="${w}" height="${h}" fill="transparent"/></g>`;
};
// People (avatar.js, 17×32 units), built like Habbo avatars from layers: the body, the head (which can turn on its own)
// and "over" (a raised arm in front of the head). Each layer is a window onto a sprite strip of frames, so changing
// frame only moves the window; the animator (after the scene is drawn) picks the frames. `idle` is the loop of poses a
// person does while standing still, each "pose" or "pose:ms". `face` is the way they look: "front" (down-right, +x),
// "frontL" (down-left, +y), "back" (up-left, -x) or "backR" (up-right, -y). `glance`: now and then they look around.
const WALK = ["walkA", "passA", "walkB", "passB"], EXTRA = {}, PEOPLE = new Map();
// The walk cycle in eight frames (62.5 ms each, two steps a tile): each key pose, then halfway to the next.
const WALK8 = WALK.flatMap((p, i) => [p, tweenPose(p, WALK[(i + 1) % 4], 0.5)]);
const POSE_MS = { stand: 1800, shift: 1500, phone: 2200, think: 1800, reach: 900, typeA: 150, typeB: 150, talk1: 380, talk2: 380, drink: 1300,
  sit: 2200, sitDrink: 1500, sitWave: 300, wave1: 260, wave2: 260, armsUp: 260, pSet: 700, pLift: 380, pCock: 320, pRelease: 480 };
const parsePose = (s) => { const [pose, ms] = s.split(":"); return { pose, ms: +ms || POSE_MS[pose] || 1200 }; };
const MIRROR = `translate(${AW / 2} 0) scale(-1 1)`, HEAD_MIRROR = "translate(15 0) scale(-1 1)"; // the head turns about its own middle (x = 15 px = 7.5 units)
const faceBack = (face) => face.startsWith("back"), faceMirror = (face) => face === "frontL" || face === "backR";
const frameWin = (strip, k, w, h, cls) => `<svg class="${cls}" x="0" y="0" width="${w}" height="${h}" viewBox="${k * w} 0 ${w} ${h}" overflow="hidden"><use href="#${strip.id}"/></svg>`;
function person(look, idle, x, y, { cls = "", top = "", dy = 0, extra = null, walker = false, face = "front", glance = false, scale = 1 } = {}) {
  if (extra) EXTRA[look] = extra;
  const back = faceBack(face) && !walker, first = parsePose(idle[0]).pose, w = AW / 2, h = AH / 2;
  PEOPLE.set(look, { idle, face: walker ? "front" : face, glance, walker, x, y, level: curLevel });
  const body = avatarStrip(look, [{ pose: first, back, layer: "body" }]), head = avatarStrip(look, [{ back, layer: "head" }]);
  const over = hasOver(first) ? frameWin(avatarStrip(look, [{ pose: first, back, layer: "over" }]), 0, w, h, "ov") : "";
  const fig = `<g class="face"${faceMirror(face) && !walker ? ` transform="${MIRROR}"` : ""}><g class="lift">${frameWin(body, 0, w, h, "bv")}` +
    `<g class="hl">${frameWin(head, 0, w, h, "hv")}</g><g class="ol">${over}</g><g class="extra">${EXTRA[look] ? EXTRA[look](first) : ""}</g></g></g>`;
  return who(look, w, h, x, y, -dy, cls, (scale === 1 ? fig : `<g transform="translate(${(w * (1 - scale)) / 2} ${h * (1 - scale)}) scale(${scale})">${fig}</g>`) + top); // (a child: smaller, feet on the floor)
}
// Animals and the robot: a strip of their frames (props.js), mirrored when they walk toward the left of the screen.
const critter = (look, frames, x, y, { cls = "", z = 0, extra = "" } = {}) => {
  const { w, h } = PROPS[frames[0]], W = w / 2, Hh = h / 2;
  PEOPLE.set(look, { level: curLevel, x, y });
  return who(look, W, Hh, x, y, z, `${cls} critter`, `<g class="face">${frameWin(propStrip(frames), 0, W, Hh, "bv")}</g>${extra}`);
};

const monitorFacingViewer = (x0, y0, w, z, screen) => box(x0, y0, w, 0.12, 10, CASE, z) + leftFace(x0, y0, 0.12, z, rect(1, 2, w * 16 - 2, 7, "#07140c") + screen);
const monitorFacingRight = (x0, y0, d, z, screen) => box(x0, y0, 0.12, d, 10, CASE, z) + rightFace(x0, y0, 0.12, d, z, rect(1, 2, d * 16 - 2, 7, "#07140c") + screen);
const camera = (x, y) => {
  return camera3(x, y);
};

const STEEL = ["#c9cdd3", "#9aa3ad", "#7d8792"], GLASS = ["rgba(225,238,248,.45)", "rgba(190,212,228,.55)", "rgba(170,192,210,.55)"];
const MATERIAL = new Map([[WOOD, "wood"], [DARK, "wood"], [BOOKCASE, "wood"], [CASE, "metal"], [STEEL, "metal"], [WHITE, "metal"], [SHELF, "metal"], [RED, "fabric"], [BLUE, "fabric"], [GLASS, "glass"]]);
const RAIL = ["#7a4e33", "#5e3b26", "#4a2e1c"], BEAM = ["#8a5634", "#7a4a2c", "#5e3820"];
[RAIL, BEAM].forEach((p) => MATERIAL.set(p, "wood"));
// The big beam along the front of an upper floor: light top edge, joints, iron straps.
const beamFace = (len) => rect(0, SLAB - 1.2, len, 0.7, "rgba(255,255,255,.22)") + rect(0, 0, len, 0.8, "rgba(0,0,0,.25)") +
  Array.from({ length: Math.floor(len / 9) }, (_, k) => rect(k * 9 + hsh(k) * 4, 1.6 + (k % 3) * 1.1, 5 + hsh(k, 1) * 3, 0.35, "rgba(40,20,8,.3)")).join("") +
  Array.from({ length: Math.floor(len / 72) }, (_, k) => rect(60 + k * 72, 0.5, 0.6, SLAB - 1, "rgba(0,0,0,.35)") + rect(56 + k * 72, 1.5, 9, 1, "#3a3d44") + rect(56 + k * 72, SLAB - 2.5, 9, 1, "#3a3d44")).join("");
// Planter box hung on the outside of a railing, flowers on top and ivy trailing down the beam.
function railPlanter(x, y) {
  const [sx, sy] = up(iso(x + 0.35, y + 0.12), 4);
  let ivy = "";
  // vines: a thin stem swaying down, small leaves on alternate sides, each lit on top and outlined
  for (const [dx, n] of [[-5, 9], [0, 13], [5, 7]]) {
    const pts = Array.from({ length: n + 1 }, (_, t) => [sx + dx + Math.sin(t * 1.1) * 1.4, sy + t * 2.2]);
    ivy += `<polyline points="${pts.map((q) => q.join(",")).join(" ")}" fill="none" stroke="#2d5a26" stroke-width="0.5"/>`;
    pts.slice(1).forEach(([lx, ly], t) => { const s = t % 2 ? 1 : -1, cx = lx + s * 1.3;
      ivy += `<path d="M${lx},${ly} q${s * 1.6},-1.6 ${s * 2.6},0.2 q${-s * 1},1.4 ${-s * 2.6},-0.2z" fill="${t % 3 ? "#3f8a3a" : "#5fb04a"}" stroke="#1f4a1b" stroke-width="0.35"/>` +
        `<line x1="${lx}" y1="${ly}" x2="${cx + s * 0.6}" y2="${ly - 0.3}" stroke="#8fd66a" stroke-width="0.3"/>`; });
  }
  return ivy + box(x, y, 0.7, 0.22, 4, pal(FC.oak, "wood"), 2) + onFloor(x + 0.15, y + 0.1, 6, "flowerP") + onFloor(x + 0.35, y + 0.12, 6, "flowerR") + onFloor(x + 0.55, y + 0.1, 6, "flowerP");
}
// ---------- the café's dressing: strings of warm bulbs twined with vines, bare-bulb pendants, cakes, planters on ledges.
// (Glows here carry no class, so they are flattened into pictures with the furniture around them.)
const warmGlow = (x, y, r) => circle(x, y, r, "url(#glow)", ' opacity=".7"');
const leaf = (x, y, s, k) => `<path d="M${x},${y} q${s * 1.4},-1.4 ${s * 2.3},0.2 q${-s * 0.9},1.2 ${-s * 2.3},-0.2z" fill="${k % 3 ? "#3f8a3a" : "#5fb04a"}" stroke="#1f4a1b" stroke-width="0.3"/>`;
// A string of bulbs from screen point a to b, sagging `sag` px, vines wound round it.
function bulbString(a, b, { sag = 5, bulbs = 6, leaves = true } = {}) {
  const P = (t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + sag * 4 * t * (1 - t)];
  let s = `<polyline points="${Array.from({ length: 17 }, (_, k) => P(k / 16).join(",")).join(" ")}" fill="none" stroke="#2b2216" stroke-width="0.45"/>`;
  if (leaves) for (let k = 1; k < 22; k++) { const [x, y] = P(k / 22); s += leaf(x, y, k % 2 ? 1 : -1, k); }
  for (let k = 0; k < bulbs; k++) { const [x, y] = P((k + 0.5) / bulbs);
    s += warmGlow(x, y + 2, 4.5) + `<line x1="${x}" y1="${y}" x2="${x}" y2="${y + 1}" stroke="#2b2216" stroke-width="0.5"/>` + `<ellipse cx="${x}" cy="${y + 2}" rx="0.9" ry="1.2" fill="${k % 2 ? "#ffd27a" : "#ffe7a8"}" stroke="#7a5418" stroke-width="0.3"/>`; }
  return s;
}
// A bare bulb in a little brass cap on a long cord, at floor point (x, y), its bottom z up.
function bulbPendant(x, y, z, cord = 18) {
  const [cx, cy] = up(iso(x, y), z);
  return rect(cx - 0.25, cy - cord - 3, 0.5, cord, INK) + rect(cx - 1, cy - 4, 2, 1.5, FC.brass) + warmGlow(cx, cy, 9) +
    `<ellipse cx="${cx}" cy="${cy - 1}" rx="1.6" ry="2" fill="#ffe7a8" stroke="#7a5418" stroke-width="0.35"/>` + rect(cx - 0.5, cy - 2, 1, 0.8, "#fff8de");
}
// Cakes: a tiered stand with little cakes on each plate, a cake under a glass dome, a jar of cookies, a slice on a plate.
function cakeStand(x, y, z, r = 0.2) {
  let s = disc(x, y, 0.03, z, 7, FC.brass);
  [[0, 1], [3.5, 0.75], [6.5, 0.5]].forEach(([dz, k]) => {
    s += disc(x, y, r * k, z + dz, 0.5, "#f4f1ea");
    for (let n = 0; n < Math.round(4 * k); n++) { const a = (n / Math.round(4 * k)) * 6.283 + 0.4; s += disc(x + Math.cos(a) * r * k * 0.55, y + Math.sin(a) * r * k * 0.55, 0.045, z + dz + 0.5, 1.4, ["#f06292", "#f3d9c4", "#6b3a22", "#f6c945"][n % 4]); }
  });
  return s;
}
const cakeDome = (x, y, z) => { const [dx, dy] = up(iso(x, y), z + 1);
  return disc(x, y, 0.2, z, 0.6, "#f4f1ea") + disc(x, y, 0.14, z + 0.6, 2.6, "#f3d9c4") + disc(x, y, 0.145, z + 3.2, 0.7, "#f06292") + disc(x + 0.03, y, 0.03, z + 3.9, 0.8, "#c8102e") +
    `<path d="M${dx - 4.6},${dy} a4.6,5.6 0 0 1 9.2,0z" fill="rgba(210,235,250,.35)" stroke="rgba(255,255,255,.75)" stroke-width="0.4"/>` + rect(dx - 0.6, dy - 6.4, 1.2, 0.9, "#c9cdd3") + rect(dx - 2.6, dy - 4.4, 0.6, 2.2, "rgba(255,255,255,.7)"); };
const cookieJar = (x, y, z) => { const [jx, jy] = up(iso(x, y), z);
  return disc(x, y, 0.1, z, 4.5, "rgba(210,235,250,.5)") + [[-1.2, -1.2], [0.8, -2], [-0.2, -3.2], [1, -0.8]].map(([a, b]) => `<ellipse cx="${jx + a}" cy="${jy + b}" rx="1" ry="0.7" fill="#c98b4f" stroke="#7a4a20" stroke-width="0.25"/>`).join("") + disc(x, y, 0.11, z + 4.5, 0.9, "#8a5634"); };
const cakeSlice = (x, y, z, cream = "#f3d9c4", top = "#f06292") => disc(x, y, 0.1, z, 0.4, "#f4f1ea") + box(x - 0.06, y - 0.05, 0.12, 0.09, 1.2, pal(cream), z + 0.4) + box(x - 0.06, y - 0.05, 0.12, 0.09, 0.4, pal(top), z + 1.6);
// A planter box on the cap of a low wall along plane y = j (from x to x + len), flowers on top and ivy trailing down its
// outside face; a string of bulbs along it.
function ledgePlanter(x, j, len) {
  const z = LOW + 1.5;
  let s = box(x, j - 0.12, len, 0.24, 3, pal("#7a4a2a", "wood"), z);
  for (let k = 0; k < len / 0.16; k++) s += onFloor(x + 0.08 + k * 0.16, j, z + 3, ["flowerP", "flowerR", "flowerP", "flowerR"][k % 4]);
  for (let k = 0; k < len / 0.3; k++) { // ivy over the front
    const [sx, sy] = up(iso(x + 0.15 + k * 0.3, j + 0.13), z + 1), n = 4 + Math.floor(hsh(k, x) * 5);
    const pts = Array.from({ length: n }, (_, t) => [sx + Math.sin(t * 1.2 + k) * 1.1, sy + t * 2]);
    s += `<polyline points="${pts.map((q) => q.join(",")).join(" ")}" fill="none" stroke="#2d5a26" stroke-width="0.45"/>` + pts.slice(1).map(([lx, ly], t) => leaf(lx, ly, t % 2 ? 1 : -1, t + k)).join("");
  }
  return s;
}
// Flower box under an outside window (wall units).
const flowerBox = (u, v, w, wall = "back") => slab3(u, v - 1, w, 3.5, 3.5, "#8a5634", "", wall) +
  `<g transform="translate(${wall === "back" ? -1.75 : 1.75} -1.75)">${[0, 1, 2, 3, 4].map((k) => rect(u + 2 + k * 4, v + 2.5, 3, 2.5, ["#f06292", "#f6c945", "#e0584f", "#ffffff", "#b39ddb"][k]) + rect(u + 3 + k * 4, v + 1.5, 1, 1.5, "#3f8a3a")).join("")}</g>`;
// Dotted walking path on the floor (tile units), like the output of a tracker.
const trail = (pts, color) => pts.slice(1).map((b, i) => {
  const a = pts[i], n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.22);
  return Array.from({ length: n }, (_, k) => rect(a[0] + ((b[0] - a[0]) * k) / n - 0.04, a[1] + ((b[1] - a[1]) * k) / n - 0.04, 0.08, 0.08, color)).join("");
}).join("");
// Stone stairs from the entrance hall (front, y = Y + 4) up to the loft (back, y = Y, one storey up): a post on every
// step and a handrail on the open (café) side.
const stairs = (X, Y) => (add) => {
  const S = pal("#a19c93"), tops = [];
  for (let k = 7; k >= 0; k--) {
    const y0 = Y + 3.5 - k * 0.5, h = (k + 1) * (H / 8);
    tops.push(up(iso(X + 1.8, y0 + 0.25), h + 13));
    add(X + 1 + y0, box(X + 0.15, y0, 1.7, 0.5, h, S) + raised(h, rect(X + 0.15, y0 + 0.42, 1.7, 0.08, "rgba(255,255,255,.3)")) +
      rightFace(X + 0.15, y0, 1.7, 0.5, 0, stones(8, h, ["#8a857c", "#7d786f", "#948f86"])) + box(X + 1.77, y0 + 0.22, 0.06, 0.06, 13, RAIL, h) + box(X + 1.74, y0 + 0.19, 0.12, 0.12, 1.2, RAIL, h + 12));
  }
  add(X + Y + 6, `<polyline points="${tops.join(" ")}" fill="none" stroke="${INK}" stroke-width="2.2"/><polyline points="${tops.join(" ")}" fill="none" stroke="${RAIL[0]}" stroke-width="1.2"/>`);
};

// ---------- rooms: level (0 = ground floor), rect [x, y, w, h] in tiles, `blocked` tiles local to the room.
// `right` decorates the room's back wall (u along it, 16 per tile; v up, walls are 58 tall), `left` the left wall of a
// room on x = 0 (u from the wall's front end backward), `live` holds animated wall pieces. `wall` and `wains` colour
// the boards and the wainscot.
const tumorMap = Array.from({ length: 20 }, (_, i) => { const x = i % 5, y = Math.floor(i / 5), d = Math.hypot(x - 2.6, y - 1.6); return rect(1.5 + x * 2.6, 1.5 + y * 1.8, 2.6, 1.8, d < 0.8 ? "#c8102e" : d < 1.6 ? "#f7a21b" : d < 2.4 ? "#3fa34d" : "#2c5892"); }).join("");
const cups = (x, y, z, n = 2) => Array.from({ length: n }, (_, i) => cup3(x + 0.05 + i * 0.16, y + 0.05, z)).join("");
const FLOOR_WOOD = ["#7a4a30", "#7a4a30"];
// The café's customers (see "the café's customers come and go" below). Tiles are whole-house coordinates.
// `edges`: where people step into the picture and out of it again: off the curb in front of the café door (toward the
// viewer), and at the left end of the sidewalk. `out` is the spot beyond the edge they fade out at.
// `queue`: the line along the curb, front first, facing the door (the door tile itself stays free, for the way out).
// `seats`: where each one sits (`at`, lifted `dy`), the tile they walk to first, which way they face, where they are
// drawn among the furniture (`depth`, between the seat and what stands in front of it), and what they do there.
const SIT_DO = {
  read: ["sitRead:7000", "sitDrink:1800", "sitRead:6000", "sit:1500"],
  laptop: [...Array.from({ length: 24 }, (_, i) => (i % 2 ? "sitTypeB" : "sitTypeA")), "sit:1400", "sitDrink:1800"],
  phone: ["sitPhone:5000", "sit:1500", "sitDrink:1800", "sitPhone:4000"],
  coffee: ["sit:3000", "sitDrink:2200", "sit:2600", "sitDrink:2000"],
};
const CAFE = {
  edges: [{ tiles: [[10, 15], [9, 15]], out: ([x]) => [x + 0.5, 16.4], inFace: "backR", outFace: "frontL" },
    { tiles: [[0, 14], [0, 13], [0, 15]], out: ([, y]) => [-0.9, y + 0.5], inFace: "front", outFace: "back" }],
  door: [10, 13], counter: [9, 8], window: [12, 13], lookIn: [7, 13], // (by the line; and where people out for a stroll stop to look in,
  // between the two ends of the sidewalk, so a party never has to turn back through itself)
  queue: [[11, 14], [12, 14], [13, 14], [14, 14]],
  seats: [
    { tile: [12, 6], at: [12.9, 5.95], dy: 1, face: "frontL", depth: 19.2, does: ["read", "coffee", "phone"] },  // the banquette, by the window
    { tile: [14, 6], at: [14.3, 5.95], dy: 1, face: "frontL", depth: 20.3, does: ["laptop"], needs: "backpack" }, // the banquette: a laptop out of the backpack
    { tile: [11, 7], at: [11.51, 8.31], dy: 0, face: "frontL", depth: 19.9, does: ["read", "phone", "coffee"] }, // the table for four
    { tile: [12, 7], at: [12.11, 8.31], dy: 0, face: "frontL", depth: 19.9, does: ["coffee", "read"] },
    { tile: [7, 10], at: [7.96, 9.71], dy: 0, face: "front", depth: 18.3, does: ["phone", "read"] },             // the table for two
    { tile: [8, 8], at: [8.1, 7.5], dy: -3, face: "backR", depth: 16.9, does: ["coffee", "phone"] },             // a stool at the counter
  ],
};
const ROOMS = [
  // --- ground floor: living room, stairs and entrance hall, café, hacker room; the sidewalk and the practice field outside
  {
    key: "living", wall: WOODS.walnut, level: 0, rect: [0, 5, 5, 8], href: "#about", label: "Living room", tex: "wood", floor: FLOOR_WOOD,
    blocked: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [0, 2], [1, 2], [2, 2], [3, 2], [1, 3], [2, 3], [3, 3], [2, 4], [0, 4], [0, 5], [1, 5], [0, 7]],
    rug: (X, Y) => rugF(X + 0.8, Y + 0.85, 3.0, 3.1) + furRug(X + 1.7, Y + 5.7, 0.7, 0.45),
    // a lamp, a landscape and a clock by the fireplace; on the left wall a curtained window, a picture and a shelf of books
    right: sconce(52, 32) + frame3("frameLandscape", 53, 51, { col: "#c9962a" }) + prop3("clock", 68, 53),
    left: windowW(18, 24, 22, 18, { curtain: FC.rust, wall: "left" }) + sconce(48, 32, "left") + frame3("frameAbstract", 56, 50, { col: "#2b2e35", wall: "left" }) + wallShelf(74, 38, 28, shelfBooks(76, 38, 24, "left"), "left"),
    draw(add, X, Y) {
      add(X + Y + 0.6, shelves(X + 0.1, Y + 0.05, 1.05, 0.42, { h: 44, wood: FC.walnut }));
      // stone fireplace standing out from the wall: the surround and firebox, a wooden mantel with candles, the chimney breast with antlers
      const F = X + 1.25, ST = ["#b3aea5", "#a19c93", "#bdb8af"], SD = ["#8a857c", "#7d786f", "#948f86"], D = 0.55, HEARTH = 1.2;
      // The firebox, drawn on the fireplace's face (u along it, v up) as a hole d deep into the stone: a sooty back wall, the
      // left inner side lit orange from below, an ash floor with embers, and a stone lintel with a keystone and soot above.
      // The fire itself (crossed logs and flames, a pixel sprite in two shapes) sits inside, seen only through the opening.
      const d = 7, pts = (p) => p.map(([u, v]) => `${u},${v}`).join(" ");
      const firebox = rect(4, 0, 16, 15, "#0b0605") +
        `<polygon points="${pts([[4, 0], [4 + d, d], [4 + d, 15], [4, 15]])}" fill="#2e211a"/><polygon points="${pts([[4, 0], [4 + d, d], [4 + d, d + 3], [4, 4]])}" fill="#7a3f1c"/>` +
        `<polygon points="${pts([[4, 0], [20, 0], [20, d], [4 + d, d]])}" fill="#1c120c"/>` + rect(4, 11.5, 16, 3.5, "rgba(0,0,0,.6)") +
        [[6, 1], [8, 2.5], [12, 0.8], [16, 2], [18.5, 1.2], [14.5, 3]].map(([u, v], i) => rect(u, v, 1, 0.6, ["#ff6a1f", "#c8453c", "#ffb627"][i % 3])).join("") + rect(5, 0.3, 3, 0.5, "#6e6a63") +
        `<ellipse cx="13" cy="4" rx="6.5" ry="4" fill="rgba(255,150,60,.3)"/>` +
        rect(4, 0, 16, 15, "none", ` stroke="${INK}" stroke-width="0.6"`) +
        rect(6, 18.5, 12, 3.5, "rgba(20,15,10,.3)") + rect(2.5, 15, 19, 3.5, "#8a857c", ` stroke="${INK}" stroke-width="0.4"`) + [6.5, 14, 17.5].map((u) => rect(u, 15, 0.5, 3.5, "#6e6a63")).join("") +
        rect(10.5, 14.6, 3, 4.4, "#a8a39a", ` stroke="${INK}" stroke-width="0.4"`);
      const o = iso(F, Y + D), hole = [[4, HEARTH], [20, HEARTH], [20, 15], [4, 15]].map(([u, v]) => [o[0] + u, o[1] + 0.5 * u - v]), [fx, fy] = at(F + 0.53, Y + D - 0.22, 16, 16); // a little behind the face, centred in the opening
      const fire = `<clipPath id="firebox"><polygon points="${hole.join(" ")}"/></clipPath><g clip-path="url(#firebox)">` +
        `<svg x="${fx}" y="${fy - HEARTH - 1.5}" width="16" height="16" viewBox="0 0 16 16" overflow="hidden"><use class="fire" href="#${propStrip(["fireA", "fireB"]).id}"/></svg></g>`;
      add(X + Y + 0.9, box(F, Y, 1.5, D, 27, STONE) + leftFace(F, Y, D, 0, stones(24, 27, ST) + firebox) + fire +
        rightFace(F, Y, 1.5, D, 0, stones(D * 16, 27, SD)) + box(F - 0.12, Y, 1.74, D + 0.13, 3, pal(FC.walnut, "wood"), 27) +
        box(F + 0.37, Y, 0.76, 0.4, WALL - 30, STONE, 30) + leftFace(F + 0.37, Y, 0.4, 30, stones(12.2, WALL - 30, ST) + onWall("antlers", -1.4, 26)) + rightFace(F + 0.37, Y, 0.76, 0.4, 30, stones(6.4, WALL - 30, SD)) +
        candle3(F + 0.12, Y + 0.45, 30) + candle3(F + 0.3, Y + 0.45, 30, 3.5) + candle3(F + 1.5, Y + 0.45, 30));
      // the hearth stone in front, warm from the fire; firewood stacked beside
      // the hearth stone in front, warm from the fire, with an iron grate standing on it; firewood stacked beside
      const iron = pal("#2b2b30");
      add(X + Y + 1.7, box(F - 0.1, Y + D, 1.7, 0.45, HEARTH, STONE) + raised(HEARTH, `<ellipse cx="${F + 0.72}" cy="${Y + D + 0.18}" rx="0.42" ry="0.14" fill="rgba(255,170,80,.28)"/>`) +
        box(F + 0.3, Y + D + 0.03, 0.05, 0.05, 6.5, iron, HEARTH) + box(F + 1.15, Y + D + 0.03, 0.05, 0.05, 6.5, iron, HEARTH) + box(F + 0.3, Y + D + 0.03, 0.9, 0.05, 0.8, iron, HEARTH + 3.5) +
        disc(F + 0.325, Y + D + 0.055, 0.05, HEARTH + 6.5, 0.8, "#2b2b30") + disc(F + 1.175, Y + D + 0.055, 0.05, HEARTH + 6.5, 0.8, "#2b2b30") + onFloor(X + 3.1, Y + 0.45, 0, "logs"));
      add(X + Y + 1.0, onFloor(X + 4.45, Y + 0.5, 0, "palm"));
      add(X + Y + 2.2, armchair(X + 0.15, Y + 1.15, "right", { col: FC.rust, pillows: [[0.4]] }));
      add(X + Y + 2.9, floorLamp(X + 0.3, Y + 2.55));
      add(X + Y + 3.4, tableF(X + 1.45, Y + 1.35, 1.1, 0.7, { h: 6, wood: FC.walnut }) + bookStack(X + 1.6, Y + 1.45, 6) + onTop(X, Y, 6, [[2.2, 1.85, "mug"]]) + candle3(X + 2.1, Y + 1.55, 6));
      add(X + Y + 3.2, armchair(X + 3.35, Y + 1.1, "left", { col: FC.rust }));
      add(X + Y + 5.2, sofa(X + 1.1, Y + 2.65, 2.2, "up", { col: FC.cream, cushion: "#f3ead8" }));
      add(X + Y + 7.1, person("jen", ["stand"], X + 2.5, Y + 4.55, { glance: true }));
      add(X + Y + 5.2, recordPlayer(X + 0.1, Y + 4.4));
      add(X + Y + 7.9, onFloor(X + 0.45, Y + 7.45, 0, "monstera"));
    },
  },
  { key: "stairs", level: 0, rect: [5, 5, 2, 4], hidden: true, tex: "wood", floor: FLOOR_WOOD, blocked: [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2], [1, 2], [0, 3], [1, 3]],
    draw(add, X, Y) { stairs(X, Y)(add); } },
  {
    key: "foyer", level: 0, rect: [5, 9, 2, 4], label: "Entrance hall", tex: "wood", floor: FLOOR_WOOD,
    blocked: [[0, 3]],
    rug: (X, Y) => rect(X + 0.55, Y + 0.3, 0.9, 3.4, "#6e2a22") + rect(X + 0.63, Y + 0.38, 0.74, 3.24, "none", ` stroke="#e9c46a" stroke-width="0.03"`),
    draw(add, X, Y) { add(X + Y + 3.9, coatRack(X + 0.3, Y + 3.6)); },
  },
  {
    key: "cafe", wall: WOODS.honey, level: 0, rect: [7, 5, 8, 8], label: "Café", href: "#project-tracking", slug: "tracking", tex: "wood", floor: ["#8e5634", "#8e5634"],
    blocked: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [0, 1], [1, 1], [2, 1], [3, 1], [5, 1], [6, 1], [7, 1], [0, 2], [1, 2], [2, 2], [3, 2],
      [4, 3], [5, 3], [4, 4], [5, 4], [0, 4], [1, 4], [2, 4], [7, 3], [7, 7], [2, 7]],
    // a doormat at the entrance, and people's paths through the café as the tracker saw them
    rug: (X, Y) => rugF(X + 3.85, Y + 2.85, 1.95, 2.25, { field: "#7a2b24", inner: "#5a1f1a", edge: "#d9b77a" }) + rugF(X + 0.45, Y + 4.15, 2.0, 1.05, { field: "#2f6b66", inner: "#1f4a46", edge: "#e8d6a8", fringe: false }) +
      rugF(X + 5.35, Y + 1.2, 2.55, 0.95, { field: "#7a2b24", inner: "#5a1f1a", edge: "#d9b77a", fringe: false }) +
      rect(X + 3.05, Y + 7.5, 0.9, 0.45, "#6e2a22") + rect(X + 3.1, Y + 7.55, 0.8, 0.35, "#8e3a2e") +
      trail([[X + 3.5, Y + 8], [X + 3.5, Y + 5.6], [X + 1.4, Y + 3.1]], "rgba(57,255,136,.75)") +
      trail([[X + 3.6, Y + 8], [X + 4.6, Y + 6.3], [X + 6.4, Y + 5.8], [X + 6.9, Y + 3.2], [X + 7.4, Y + 2.3]], "rgba(255,79,216,.75)") +
      trail([[X + 3.4, Y + 8], [X + 5.8, Y + 7.2], [X + 6.3, Y + 2.5]], "rgba(59,184,255,.75)"),
    right: slab3(36, 34, 40, 18, 1.5, "#5a3a22", rect(1, 1, 38, 16, "#2f4a3a") + [0, 1, 2].map((k) => rect(4, 13 - k * 4, 16 + ((k * 5) % 9), 1, "#e8efe9") + rect(28, 13 - k * 4, 6, 1, "#f6c945")).join("")) +
      wallShelf(40, 26, 34, shelfJars(42, 26, 6)) + frame3("cafeSign", 80, 57, { col: "#c8102e" }) + prop3("clock", 86, 45) + sconce(96, 32) + windowW(102, 22, 18, 18, { curtain: FC.teal }) + frame3("frameAbstract", 107, 57, { col: "#2b2e35" }),
    draw(add, X, Y) {
      // back counter: espresso machines, sink, cups, upper cabinets; a drinks fridge
      // back counter: the big espresso machine, a grinder, the sink, cups, flowers and fruit; upper cabinets over it
      const pro = espresso(X + 0.2, Y + 0.1, 14);
      add(X + Y + 2.6, cabinets(X + 0.1, Y + 0.05, 4.2, 0.62, { h: 14, body: FC.walnut, top: "#e8e2d6" }) + pro.svg + grinder(X + 1.55, Y + 0.2, 14) +
        [0, 1, 2].map((i) => rect(pro.steam[0] - 2 + i * 2, pro.steam[1] - 5, 1, 2, "#ffffff", ` class="steam" style="animation-delay:-${i * 0.6}s"`)).join("") +
        sinkTop(X + 2.05, Y + 0.17, 14) + cups(X + 2.7, Y + 0.25, 14, 3) + onTop(X, Y, 14, [[3.4, 0.3, "vaseFlowers"], [3.95, 0.3, "fruitBowl"]]) + upperCabinets(X + 1.5, Y + 0.02, 0.75, { z: 30, body: FC.walnut }));
      add(X + Y + 5.2, fridge(X + 4.4, Y + 0.05, { w: 0.75, col: "#d9e2e8" }));
      add(X + Y + 3, person("barista", ["stand"], X + 1.5, Y + 1.5, { cls: "walker", walker: true }));
      add(X + Y + 3.3, pendant(X + 1.8, Y + 1.95, 33, FC.mustard, 24) + pendant(X + 3.3, Y + 1.95, 33, FC.mustard, 24));
      add(X + Y + 0.05, [0, 2, 4, 6].map((u) => bulbString(up(iso(X + u, Y), 57), up(iso(X + u + 2, Y), 57), { sag: 6, bulbs: 5 })).join("") +
        [[1.4, 7], [5.2, 9]].map(([u, n]) => { const [px, py] = up(iso(X + u, Y + 0.1), 52); // a pot of ivy hung from the beam
          return rect(px - 0.25, py - 5, 0.5, 5, INK) + `<path d="M${px - 3},${py} h6 l-1,3.5 h-4z" fill="#b5652f" stroke="${INK}" stroke-width="0.4"/>` +
            [-2, 0, 2].map((dx, k) => { const pts = Array.from({ length: n - k * 2 }, (_, t) => [px + dx + Math.sin(t * 1.3 + k) * 1, py + 3 + t * 2]);
              return `<polyline points="${pts.map((q) => q.join(",")).join(" ")}" fill="none" stroke="#2d5a26" stroke-width="0.45"/>` + pts.slice(1).map(([lx, ly], t) => leaf(lx, ly, t % 2 ? 1 : -1, t + k)).join(""); }).join(""); }).join(""));
      [[4.8, 4.0, 30, 24], [1.6, 4.7, 32, 22], [6.0, 1.6, 34, 20], [7.35, 1.6, 34, 20]].forEach(([u, v, z, cord]) => add(X + Y + u + v - 0.3, bulbPendant(X + u, Y + v, z, cord)));
      // planters along the low wall to the street, either side of the door
      for (let i = 0; i < 8; i++) if (i !== 3) add(X + i + Y + 8 + 0.55, ledgePlanter(X + i + 0.06, Y + 8, 0.88));
      // island: panelled front, marble top, register, espresso with steam, glass case of pastries
      add(X + Y + 4.2, cabinets(X + 0.6, Y + 1.6, 3.4, 0.6, { h: 15, body: FC.walnut, top: "#e8e2d6", drawers: false, doors: 7 }) +
        cakeDome(X + 0.82, Y + 1.85, 15) + tipJar(X + 1.2, Y + 2.08, 15) + cookieJar(X + 2.28, Y + 1.85, 15) +
        smallBox(X + 1.4, Y + 1.75, 15, 0.34, 0.28, 4, FC.charcoal, (L) => rect(1, 1, L - 2, 2, "#8cc8f0")) + cups(X + 1.95, Y + 1.85, 15, 2) +
        cakeStand(X + 2.75, Y + 1.82, 15.4, 0.16) + cakeSlice(X + 3.1, Y + 1.8, 15.4) + cakeSlice(X + 3.35, Y + 1.8, 15.4, "#fbf3dc", "#f6c945") + cakeSlice(X + 3.6, Y + 1.8, 15.4, "#6b3a22", "#3a2014") +
        box(X + 2.58, Y + 1.96, 1.12, 0.17, 0.4, pal("#d8d2c4"), 15.4) + // a tray of brownies at the front, stacked two high
        [2.62, 2.9, 3.18, 3.46].map((dx) => box(X + dx, Y + 1.98, 0.24, 0.14, 1.3, pal("#3a2014"), 15.8) + box(X + dx + 0.02, Y + 1.99, 0.2, 0.12, 1.3, pal("#4a2a1a"), 17.1)).join("") +
        box(X + 2.5, Y + 1.65, 1.25, 0.5, 7, GLASS, 15));
      add(X + Y + 4.7, stool(X + 1.1, Y + 2.5, { h: 12 }) + stool(X + 2.1, Y + 2.5, { h: 12 }) + stool(X + 3.1, Y + 2.5, { h: 12 }));
      // banquette under the window with two customers, their tables in front
      add(X + Y + 7.1, sofa(X + 5.3, Y + 0.05, 2.6, "down", { col: FC.teal, cushion: "#56a8a0", pillows: [[0.3], [1.2], [2.1]] }));
      // the café's customers, two of them seated to begin with (see CAFE); a marker at each seat's depth keeps the
      // furniture behind a seat and in front of it in separate pictures, so whoever sits there is drawn between them
      CAFE.seats.forEach((s) => add(s.depth, `<g class="seat"></g>`));
      [["customerA", GREEN], ["customerB", "#ff4fd8"]].forEach(([look, col], i) => { const s = CAFE.seats[i];
        add(s.depth, person(look, ["sit"], s.at[0], s.at[1], { dy: s.dy, cls: "walker", walker: true, top: bbox(col), glance: true })); });
      add(X + Y + 7.6, roundTable(X + 6.0, Y + 1.6) + cups(X + 5.9, Y + 1.55, 12, 1) + bookStack(X + 6.05, Y + 1.5, 12, 2) + onFloor(X + 6.15, Y + 1.75, 12, "flowerR"));
      add(X + Y + 8.95, roundTable(X + 7.35, Y + 1.6) + cups(X + 7.5, Y + 1.75, 12, 1) + cakeSlice(X + 7.55, Y + 1.5, 12, "#6b3a22", "#3a2014"));
      add(X + Y + 8.96, `<g class="cafe-laptop" style="visibility:hidden">${laptop3(X + 7.12, Y + 1.42, 12)}</g>`); // (out of a backpack, see sitDown)
      // a table for four in the middle, a table for two by the entrance hall
      add(X + Y + 7.6, chairF(X + 4.3, Y + 3.1, "down", { wood: FC.walnut, seat: FC.teal }) + chairF(X + 4.9, Y + 3.1, "down", { wood: FC.walnut, seat: FC.teal }));
      add(X + Y + 8.8, tableF(X + 4.2, Y + 3.6, 1.2, 0.8, { wood: FC.walnut }) + cups(X + 4.4, Y + 3.8, 12, 2) + onFloor(X + 5.05, Y + 4.05, 12, "vaseFlowers"));
      add(X + Y + 9.5, chairF(X + 4.3, Y + 4.45, "up", { wood: FC.walnut, seat: FC.teal }) + chairF(X + 4.9, Y + 4.45, "up", { wood: FC.walnut, seat: FC.teal }));
      add(X + Y + 6.0, chairF(X + 0.75, Y + 4.5, "right", { wood: FC.walnut, seat: FC.teal })); // (apart from its table: someone sits between them)
      add(X + Y + 6.6, tableF(X + 1.3, Y + 4.4, 0.6, 0.6, { wood: FC.walnut }) + cups(X + 1.4, Y + 4.55, 12, 1) + cakeSlice(X + 1.65, Y + 4.8, 12) + onFloor(X + 1.75, Y + 4.55, 12, "flowerP") + chairF(X + 2.0, Y + 4.5, "left", { wood: FC.walnut, seat: FC.teal }));
      add(X + Y + 11.0, disc(X + 7.5, Y + 3.3, 0.18, 0, 1, FC.iron) + box(X + 7.47, Y + 3.27, 0.06, 0.06, 18, CASE) + box(X + 7.3, Y + 3.27, 0.4, 0.06, 1, pal(FC.oak), 18) + critter("parrot", ["parrot"], X + 7.5, Y + 3.3, { z: 19 }));
      add(X + Y + 15.0, onFloor(X + 7.5, Y + 7.45, 0, "palm"));
      add(X + Y + 10.3, easel3(X + 2.3, Y + 7.55));
      // two cameras high on the back wall, with translucent fields of view over the room
      for (const [cx, a, b] of [[0.25, [3.2, 7.4], [6.8, 4.2]], [7.85, [5.6, 3.4], [2.2, 7.2]]]) {
        const cam = up(iso(X + cx, Y + 0.1), 50);
        add(X + Y + cx + 0.1, wallCam(X + cx, Y, 46));
        add(99, `<g class="fov">${poly([cam, iso(X + a[0], Y + a[1]), iso(X + b[0], Y + b[1])], "rgba(255,220,80,.1)", "none")}</g>`);
      }
    },
  },
  {
    key: "hacker", wall: WOODS.dark, wains: "#4a4f5c", level: 0, rect: [15, 5, 5, 4], label: "Hacker room", href: "#project-tracking", slug: "tracking", tex: "carpet", floor: ["#23262e", "#262a33"],
    blocked: [[0, 0], [1, 1], [2, 1], [3, 1], [2, 2], [3, 0], [4, 0], [4, 2], [3, 3]],
    rug: (X, Y) => furRug(X + 4.35, Y + 2.95, 0.62, 0.48, "#4a3d6e") + rect(X + 0.6, Y + 1.9, 3.2, 1.7, "#2e3440") + rect(X + 0.7, Y + 2.0, 3.0, 1.5, "none", ` stroke="${GREEN}" stroke-width="0.03"`) +
      `<polyline points="${X + 3.7},${Y + 0.8} ${X + 3.3},${Y + 1.9} ${X + 2.4},${Y + 1.8}" fill="none" stroke="#111" stroke-width="0.05"/><polyline points="${X + 4.4},${Y + 0.8} ${X + 4.1},${Y + 2.2} ${X + 3.4},${Y + 2.9}" fill="none" stroke="#3b82c4" stroke-width="0.04"/>`,
    // wall screen: bird's-eye floor plan of the café, heat, and people moving as dots; an LED strip and a neon sign
    right: rect(0, 2, 80, 0.8, "#b14cff") + rect(0, 2.8, 80, 0.4, "rgba(177,76,255,.35)") +
      slab3(6, 20, 56, 32, 2.5, "#1b1f2a", rect(2, 2, 52, 28, "#07140c") + rect(5, 5, 30, 22, "none", ` stroke="#9aa4b1" stroke-width="0.5"`) +
        rect(7, 7, 10, 8, "rgba(200,16,46,.45)") + rect(15, 13, 12, 9, "rgba(246,201,69,.4)") + rect(21, 21, 10, 5, "rgba(59,130,196,.4)") +
        [0, 1, 2, 3, 4].map((k) => rect(40 + k * 2.4, 5, 1.6, 4 + ((k * 7) % 11), ["#3fa34d", "#f6c945", "#f7a21b", "#e0584f", "#3bb8ff"][k])).join("")) +
      slab3(66, 30, 12, 8, 1.5, "#2f3542", rect(1, 1, 10, 6, "#f06292") + rect(3, 3, 6, 2, "#1b1f2a")),
    live: [[11.5, 26.5, "dot"], [21.5, 32.5, "dot dot2"], [27.5, 40.5, "dot dot3"], [15.5, 36.5, "dot dot4"]].map(([u, v, c]) => rect(u, v, 1.5, 1.5, GREEN, ` class="${c}"`)).join(""),
    draw(add, X, Y) {
      const heat = Array.from({ length: 15 }, (_, i) => rect(1.5 + (i % 5) * 1.6, 2.5 + Math.floor(i / 5) * 2, 1.4, 1.8, pickSeeded(["#2c5892", "#3fa34d", "#f6c945", "#f7a21b", "#c8102e"]))).join("");
      const paths = `<polyline points="2,3 4,6 6,4 9,7" fill="none" stroke="#ff4fd8" stroke-width="0.6"/><polyline points="2,7 5,4 7,5 9,3" fill="none" stroke="${GREEN}" stroke-width="0.6"/>`;
      const can = (u, v, col) => rect(u, v, 1.8, 2.6, col, ` stroke="${INK}" stroke-width="0.3"`) + rect(u, v + 1, 1.8, 0.5, "rgba(255,255,255,.5)") + `<ellipse cx="${u + 0.9}" cy="${v + 2.6}" rx="0.9" ry="0.4" fill="#dfe4e9" stroke="${INK}" stroke-width="0.3"/>`;
      const cans = [1.2, 4.9, 8.6].map((v, r) => rect(1.8, v - 0.4, 7.4, 0.4, "#9aa4b1") + [2.2, 4.4, 6.6].map((u, i) => can(u, v, pickSeeded(["#39ff88", "#f06292", "#3bb8ff", "#f6c945", "#e0584f"]))).join("")).join("");
      add(X + Y + 0.8, box(X + 0.25, Y + 0.12, 0.55, 0.5, 14, pal("#2b2e35")) + onL(X + 0.25, Y + 0.12, 0.55, 0.5, 0, (L) =>
        hole(1, 1.2, L - 2, 11.5, 4, { back: "#0e1a22", side: "#1c2a36", floor: "#2a3848", art: rect(1, 1.2, L - 2, 11.5, "rgba(120,200,255,.18)"), inside: `<g transform="translate(1 1)">${cans}</g>` }) +
        rect(1, 1.2, L - 2, 11.5, "rgba(190,230,255,.12)") + `<polygon points="2,2 3.5,2 7.5,12 6,12" fill="rgba(255,255,255,.18)"/>` + rect(1, 12.7, L - 2, 0.5, "#b14cff") + slab3(L - 2.2, 4, 0.8, 5, 1, "#c9cdd3")));
      add(X + Y + 2.2, officeChair(X + 1.35, Y + 1.75, "up", "#5b2d86"));
      add(X + Y + 3.0, desk(X + 1.0, Y + 1.05, 2.25, 0.62, { wood: "#2f323a" }) + monitor(X + 1.05, Y + 1.12, 0.62, 12, heat) + monitor(X + 1.75, Y + 1.12, 0.62, 12, paths) +
        monitor(X + 2.45, Y + 1.12, 0.62, 12, codeLines(3, 7, 3, 6, GREEN)) + keyboard(X + 1.8, Y + 1.42, 12) +
        speaker(X + 1.02, Y + 1.4, 12) + speaker(X + 3.08, Y + 1.15, 12) + box(X + 2.8, Y + 1.4, 0.3, 0.2, 0.6, pal("#c98b4f"), 12) +
        raised(12, rect(X + 1.0, Y + 1.05, 2.25, 0.62, "rgba(140,210,255,.22)")) + raised(10.3, rect(X + 1.0, Y + 1.62, 2.25, 0.05, "#b14cff"))); // (a glass top, a purple glow under it)
      add(X + Y + 2.6, cubeLamp(X + 2.0, Y + 1.4, 36, 0.7, 14)); // a glowing cube lamp over the desk
      add(X + Y + 5.3, wasteBin(X + 3.45, Y + 1.8));
      add(X + Y + 7.2, sodaBottles(X + 3.55, Y + 3.55));
      add(X + Y + 4.7, person("hacker", ["typeA", "typeB", "typeA", "typeB", "typeA", "typeB", "typeA", "typeB", "typeA", "typeB", "typeA", "typeB", "typeA", "typeB", "typeA", "typeB", "typeA", "typeB", "stand:900", "think:1500"], X + 2.3, Y + 2.4, { face: "backR" }));
      for (const x0 of [3.4, 4.1]) add(X + Y + x0 + 0.6, box(X + x0, Y + 0.15, 0.6, 0.6, 32, pal("#2b2e35")) + leftFace(X + x0, Y + 0.15, 0.6, 0, rackFront(9.6, 32)) + rightFace(X + x0, Y + 0.15, 0.6, 0.6, 0, [6, 12, 18, 24].map((v) => rect(2, v, 5.6, 0.6, "#1c1e24")).join("")));
      add(X + Y + 6.9, onFloor(X + 4.35, Y + 2.6, 0, "beanbag"));
      add(X + Y + 6.6, box(X + 3.1, Y + 3.2, 0.5, 0.5, 0.8, pal("#e9dcc2")) + raised(0.8, rect(X + 3.15, Y + 3.25, 0.4, 0.4, "none", ` stroke="#c8453c" stroke-width="0.03"`)));
    },
  },
  {
    key: "street", level: 0, rect: [0, 13, 15, 3], label: "Sidewalk", outdoor: true, tex: "paving", floor: ["#c9c4bb", "#bfb9ae"],
    blocked: [[8, 2], [10, 0], [11, 1], [12, 1], [13, 1], [14, 1]], // (three rows: the line in the middle, a lane either side of it)
    // the curb, and a patch of snow under Snow girl
    rug: (X, Y) => rect(X, Y + 2.88, 15, 0.12, "#8d8d8d") + `<ellipse cx="${X + 8.4}" cy="${Y + 2.45}" rx="0.5" ry="0.38" fill="#f2f6fa"/><ellipse cx="${X + 8.15}" cy="${Y + 2.66}" rx="0.3" ry="0.16" fill="#f2f6fa"/>`,
    draw(add, X, Y) {
      // the line outside the café door, each person tracked with a box; two more are out of sight for now, at the curb
      ["q1", "q2", "q3", "q4", "q5", "q6"].forEach((look, k) => { const [tx, ty] = CAFE.queue[k] || CAFE.edges[0].tiles[0];
        add(tx + ty + 1, person(look, ["stand"], tx + 0.5, ty + 0.5, { cls: "walker", walker: true, glance: true, top: bbox([GREEN, "#ff4fd8", "#3bb8ff", "#ffb800", GREEN, "#ff4fd8"][k]) })); });
      // out for a stroll (out of sight to begin with): a lady walking her little dog; a family, the child in the middle
      [["lady"], ["pup"], ["mom"], ["kid", 0.72], ["dad"]].forEach(([look, scale]) => add(X + Y + 2, look === "pup" ? critter(look, ["pup", "pupB"], X + 0.5, Y + 1.5, { cls: "walker" })
        : person(look, ["stand"], X + 0.5, Y + 1.5, { cls: "walker", walker: true, glance: true, scale })));
      add(X + Y + 4.2, tree(X + 0.3, Y + 2.85)); // (at the corner of the curb: the sidewalk is open, two wide, to its end)
      add(X + Y + 1.5, box(X + 0.95, Y + 0.1, 1.6, 0.36, 6, pal("#8a5634", "wood")) + [1.2, 1.55, 1.9, 2.25].map((x, k) => onFloor(X + x, Y + 0.28, 6, k % 2 ? "flowerR" : "flowerP")).join(""));
      add(X + Y + 2.5, legs(X + 2.85, Y + 0.18, 0.95, 0.28, 5, pal(FC.iron), 0.06) + box(X + 2.8, Y + 0.12, 1.05, 0.36, 1.5, pal(FC.oak, "wood"), 5) + box(X + 2.8, Y + 0.1, 1.05, 0.08, 8, pal(FC.oak, "wood"), 6.5));
      add(X + Y + 4.6, lantern3(X + 4.55, Y + 0.08)); // (against the wall: two can pass here)
      add(X + Y + 7.4, lamp(X + 4.5, Y + 2.82)); // (at the curb; drawn in front of whoever walks past behind it)
      add(X + Y + 10.3, mailbox3(X + 7.5, Y + 2.75));
      add(X + Y + 10.9, critter("snowgirl", ["snowGirl"], X + 8.4, Y + 2.45));
      add(X + Y + 12.4, lamp(X + 9.2, Y + 2.82)); // (at the curb too)
    },
  },
  {
    key: "yard", level: 0, rect: [15, 9, 5, 7], label: "Practice field", href: "#project-pitching", slug: "pitching", outdoor: true, tex: "field", floor: ["#62b444", "#6cbd4a"],
    blocked: [[1, 0], [3, 0], [0, 2], [4, 1], [4, 2], [4, 3], [4, 4], [0, 5], [1, 5], [2, 5], [3, 5], [4, 5]],
    rug: (X, Y) => `<ellipse cx="${X + 0.9}" cy="${Y + 2.8}" rx="0.6" ry="0.6" fill="#b9834a"/><ellipse cx="${X + 0.9}" cy="${Y + 2.8}" rx="0.45" ry="0.45" fill="#c9955a"/>` + rect(X + 0.85, Y + 2.65, 0.08, 0.3, "#fff") +
      `<ellipse cx="${X + 4.3}" cy="${Y + 3.1}" rx="0.5" ry="0.5" fill="#b9834a"/>` + `<polygon points="${X + 4.2},${Y + 3.0} ${X + 4.4},${Y + 3.0} ${X + 4.45},${Y + 3.15} ${X + 4.3},${Y + 3.25} ${X + 4.15},${Y + 3.15}" fill="#fff"/>` +
      `<line x1="${X + 0.9}" y1="${Y + 2.8}" x2="${X + 4.3}" y2="${Y + 3.1}" stroke="rgba(255,255,255,.35)" stroke-width="0.03" stroke-dasharray="0.1 0.1"/>` +
      [[3.85, 2.5], [3.85, 3.35]].map(([a, b]) => rect(X + a, Y + b, 0.9, 0.55, "none", ` stroke="rgba(255,255,255,.85)" stroke-width="0.04"`)).join(""),
    draw(add, X, Y) {
      add(X + Y + 9.3, lamp(X + 4.6, Y + 4.7));
      // the pitcher throws across the field toward the net; the ball flies during the wind-up frame
      // wind-up in four frames (set, leg lift, arm cocked, release); the ball leaves the hand on the release frame
      const MOUND = 1.5, [px, py0] = at(X + 0.9, Y + 2.8, AW / 2, AH / 2), py = py0 - MOUND, [nx, ny] = up(iso(X + 4.5, Y + 3.1), 10), [bx, by] = POSES.pRelease.armR[2].map((v) => (v * K) / 2);
      add(X + Y + 3.4, disc(X + 0.9, Y + 2.8, 0.62, 0, MOUND, "#b9834a") + raised(MOUND, `<ellipse cx="${X + 0.95}" cy="${Y + 2.75}" rx="0.35" ry="0.3" fill="#c9955a"/>` + rect(X + 0.85, Y + 2.62, 0.08, 0.3, "#ffffff")));
      add(X + Y + 3.7, person("pitcher", ["pSet", "pLift", "pCock", "pRelease"], X + 0.9, Y + 2.8, { extra: skeleton, dy: -MOUND }) +
        `<g class="ball" style="--dx:${nx - px - bx}px;--dy:${ny - py - by}px">${rect(px + bx - 1, py + by - 1, 2, 2, "#fff", ` stroke="${INK}" stroke-width="0.5"`)}</g>`);
      let mesh = "";
      for (let u = 0; u <= 22; u += 2) mesh += rect(u, 0, 0.5, 18, "#dfe4e9");
      for (let v = 0; v <= 18; v += 3) mesh += rect(0, v, 22, 0.5, "#dfe4e9");
      add(X + Y + 7.9, box(X + 4.75, Y + 2.35, 0.06, 0.06, 18, CASE) + box(X + 4.75, Y + 3.7, 0.06, 0.06, 18, CASE) + rightFace(X + 4.72, Y + 2.35, 0.06, 1.4, 0, mesh));
      for (const [cx, cy] of [[1.9, 0.45], [3.3, 0.4], [4.35, 5.45]]) add(X + Y + cx + cy, camera(X + cx, Y + cy));
      add(X + Y + 5.3, onFloor(X + 4.45, Y + 1.0, 0, "treeSmall"));
      // Sam the turtle starts out on the field (he wanders the whole ground floor, see WALKERS)
      add(X + Y + 4, critter("sam", ["turtle", "turtleB"], X + 2.5, Y + 1.5, { cls: "walker" }));
      add(X + Y + 5.8, tableF(X + 0.2, Y + 5.1, 0.7, 0.6, { h: 11, wood: FC.oak }) + laptop3(X + 0.35, Y + 5.25, 11));
      add(X + Y + 7.2, legs(X + 1.45, Y + 5.4, 1.2, 0.3, 5, pal(FC.iron), 0.06) + box(X + 1.4, Y + 5.35, 1.3, 0.4, 1.5, pal(FC.oak, "wood"), 5));
      add(X + Y + 8.7, disc(X + 3.2, Y + 5.5, 0.16, 0, 6, "#3b6fb6") + [[3.16, 5.46], [3.26, 5.5], [3.2, 5.56]].map(([a, b]) => rect(...up(iso(X + a, Y + b), 7), 1.5, 1.5, "#fff", ` stroke="${INK}" stroke-width="0.3"`)).join(""));
    },
  },
  // --- the loft: mmWave lab, landing and gallery, MRI lab, reading room, server room, security room
  {
    key: "lab", wall: WOODS.pale, wains: "#e3e7ea", level: 1, rect: [0, 0, 5, 5], href: "#project-mmwave", slug: "mmwave", tex: "tile", floor: ["#e2e8ee", "#d4dce4"],
    blocked: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [3, 1], [4, 1], [0, 2], [0, 3], [1, 2], [2, 3], [3, 3]],
    // reagent shelf, and a poster of a phantom scan (breast phantom with a tumour); a window on the left wall
    right: wallShelf(4, 34, 34, shelfJars(6, 34, 6)) +
      slab3(42, 36, 22, 18, 0.8, "#dfe4e9", rect(1, 1, 20, 16, "#ffffff") + `<ellipse cx="11" cy="9" rx="7" ry="4.5" fill="none" stroke="#f06292" stroke-width="0.6"/>` + rect(10, 8, 2, 2, "#c8102e") + codeLines(3, 15, 2, 14, "#3b82c4")),
    left: windowW(20, 24, 20, 16, { curtain: "#8fb3d9", wall: "left" }) + sconce(48, 32, "left"),
    draw(add, X, Y) {
      // phantom bench: breast phantoms, flasks, a microscope
      add(X + Y + 1.3, cabinets(X + 0.1, Y + 0.05, 2.6, 0.65, { h: 14, body: FC.white, top: FC.iron }) +
        onFloor(X + 0.45, Y + 0.4, 14, "phantom") + onFloor(X + 0.95, Y + 0.35, 14, "phantom") + onFloor(X + 1.45, Y + 0.45, 14, "flasks") + onFloor(X + 1.95, Y + 0.35, 14, "microscope") + onFloor(X + 2.4, Y + 0.45, 14, "beaker"));
      add(X + Y + 1.8, person("labA", ["reach:1100", "stand:900", "typeA", "typeB", "typeA", "typeB", "typeA", "typeB", "reach:1100", "think:1400"], X + 0.8, Y + 0.95, { face: "backR" }));
      // mouse imaging: the mmWave sensor panel at the back of the scan table sends pulses at the tumour of a mouse lying on its pad
      const panel = up(iso(X + 3.95, Y + 0.22), 22), target = up(iso(X + 3.95, Y + 0.72), 15);
      add(X + Y + 4.0, tableF(X + 3.1, Y + 0.12, 1.75, 0.9, { h: 12, wood: "#dfe4e9" }) + radar3(X + 3.55, Y + 0.14, 12) + box(X + 3.6, Y + 0.45, 0.7, 0.45, 1.2, pal("#8fb3d9"), 12) +
        raised(13.2, rect(X + 3.64, Y + 0.49, 0.62, 0.37, "none", ` stroke="#ffffff" stroke-width="0.03"`)) + onFloor(X + 3.95, Y + 0.72, 13.2, "mouse") + rect(...up(iso(X + 3.95, Y + 0.72), 15.5), 1.5, 1.5, "#ff2a2a", ' class="blink"') + pulses(panel, target));
      add(X + Y + 4.8, person("radar", ["typeA", "typeB", "typeA", "typeB", "typeA", "typeB", "typeA", "typeB", "typeA", "typeB", "reach:1300", "stand:1000"], X + 3.3, Y + 1.5, { face: "backR" }));
      add(X + Y + 5.1, onFloor(X + 4.55, Y + 1.55, 0, "fern"));
      // mouse cages on a rack by the wall
      const cage = (y0, z) => box(X + 0.12, Y + y0, 0.42, 0.42, 1, pal(FC.steel), z) + onFloor(X + 0.33, Y + y0 + 0.3, z + 1, "mouse") + box(X + 0.12, Y + y0, 0.42, 0.42, 5, GLASS, z + 1) + box(X + 0.12, Y + y0, 0.42, 0.42, 0.6, pal(FC.steel), z + 6);
      add(X + Y + 3.0, legs(X + 0.1, Y + 2.25, 0.46, 1.0, 20, pal(FC.steel), 0.05) + box(X + 0.1, Y + 2.25, 0.46, 1.0, 0.8, pal(FC.steel), 1) + box(X + 0.1, Y + 2.25, 0.46, 1.0, 0.8, pal(FC.steel), 11) +
        cage(2.3, 1.8) + cage(2.78, 1.8) + cage(2.3, 11.8) + cage(2.78, 11.8));
      add(X + Y + 5, person("labB", ["stand"], X + 1.5, Y + 3.5, { cls: "walker", walker: true }));
      // console: the reconstructed image of the mouse's tumour
      add(X + Y + 6.4, desk(X + 2.3, Y + 3.3, 1.6, 0.62, { wood: FC.white }) + monitor(X + 2.45, Y + 3.38, 0.9, 12, tumorMap) + keyboard(X + 2.6, Y + 3.68, 12) + onFloor(X + 3.6, Y + 3.6, 12, "mug"));
    },
  },
  {
    key: "hall", wall: WOODS.walnut, level: 1, rect: [5, 0, 2, 5], label: "Landing", tex: "wood", floor: FLOOR_WOOD,
    blocked: [[0, 0], [1, 0]],
    right: windowW(7, 24, 18, 16, { curtain: FC.mustard }) + frame3("frameLandscape", 10, 57, { col: "#c9962a" }),
    draw(add, X, Y) {
      add(X + Y + 0.7, legs(X + 0.25, Y + 0.12, 1.1, 0.34, 6, pal(FC.walnut), 0.06) + box(X + 0.2, Y + 0.08, 1.2, 0.42, 1.5, pal(FC.walnut, "wood"), 6) + bookStack(X + 0.45, Y + 0.2, 7.5));
      add(X + Y + 1.9, onFloor(X + 1.65, Y + 0.4, 0, "plant"));
    },
  },
  { key: "gallery", level: 1, rect: [7, 4, 7, 1], countAs: "hall", tex: "wood", floor: FLOOR_WOOD, blocked: [], draw() {} },
  {
    key: "mri", wall: WOODS.pale, wains: "#e3e7ea", level: 1, rect: [7, 0, 4, 4], href: "#project-mri", slug: "mri", tex: "tile", floor: ["#e9edf0", "#dbe1e6"],
    blocked: [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2], [1, 2], [2, 0], [3, 0], [2, 2], [3, 2], [0, 3]],
    // magnet warning sign and a k-space poster
    // (the sign clear of the corner post, a plate 1 deep like the other wall pieces: its edge joins the face to the wall)
    right: `<polygon points="7,36 17,36 18,37 13,47 12,46" fill="#8a6a1a" stroke="${INK}" stroke-width="0.5"/><polygon points="7,36 17,36 12,46" fill="#f6c945" stroke="${INK}" stroke-width="0.5"/>` + rect(11.5, 39, 1, 4, INK) + rect(11.5, 37.5, 1, 1, INK) +
      slab3(20, 34, 15, 16, 1.2, "#2b2e35", rect(1, 1, 14, 14, "#101216") + rect(3, 4, 10, 8, "rgba(255,255,255,.12)") + rect(5, 6, 6, 4, "rgba(255,255,255,.35)") + rect(7, 7, 2, 2, "#ffffff")) +
      windowW(40, 26, 18, 16, { curtain: "#8fb3d9" }),
    draw(add, X, Y) {
      const M = pal("#eef2f5");
      add(X + Y + 2, box(X + 0.3, Y + 0.3, 1.6, 1.3, 24, M) +
        leftFace(X + 0.3, Y + 0.3, 1.3, 0, rect(0, 19, 25.6, 2, "#3b82c4") + (() => { const id = `clip${clipCount++}`, B = `x="6.5" y="3.5" width="12.6" height="12" rx="6"`, d = 8;
          return `<rect x="5" y="2" width="15.6" height="15" rx="7" fill="#c9d0d8" stroke="${INK}" stroke-width="0.5"/><clipPath id="${id}"><rect ${B}/></clipPath><g clip-path="url(#${id})">` +
            `<rect ${B} fill="#aeb7c1"/><rect x="${6.5 + d}" y="${3.5 + d}" width="12.6" height="12" rx="6" fill="#262b33"/>` +
            `<polygon points="8.8,8.5 16.8,8.5 ${16.8 + d},${8.5 + d} ${8.8 + d},${8.5 + d}" fill="#8cc8f0"/>` + rect(8.8, 7, 8, 1.5, "#dfe4e9") +
            `<rect ${B} fill="none" stroke="rgba(0,0,0,.3)" stroke-width="1.4"/></g><rect ${B} fill="none" stroke="${INK}" stroke-width="0.5"/>`; })() + rect(21, 12, 2, 1, GREEN)) +
        rightFace(X + 0.3, Y + 0.3, 1.6, 1.3, 0, rect(0, 19, 20.8, 2, "#3b82c4") + panelF(4, 4, 12, 10)));
      add(X + Y + 3.4, legs(X + 0.88, Y + 1.65, 0.44, 1.1, 6, pal(FC.steel), 0.05) + box(X + 0.85, Y + 1.6, 0.5, 1.2, 1.5, WHITE, 6) + box(X + 0.9, Y + 1.65, 0.4, 1.1, 1, pal("#8cc8f0"), 7.5) + box(X + 0.93, Y + 2.45, 0.34, 0.25, 1.5, pal("#ffffff"), 8.5));
      const [ax, ay] = up(iso(X + 2.55, Y + 0.45), 14), [mx, my] = up(iso(X + 1.9, Y + 0.7), 20);
      add(X + Y + 3.7, desk(X + 2.35, Y + 0.15, 1.55, 0.7, { wood: FC.oak }) +
        box(X + 2.5, Y + 0.35, 0.35, 0.3, 3, pal("#3b82c4"), 12) +
        monitor(X + 3.0, Y + 0.25, 0.7, 12, rect(1.5, 4, 2, 1, GREEN) + rect(3.5, 6, 1, 1, GREEN) + rect(4.5, 3, 1, 1, GREEN) + rect(5.5, 4, 2, 1, GREEN) + rect(7, 5, 2, 1, GREEN)) +
        `<polyline points="${ax},${ay} ${ax - 6},${ay - 6} ${mx},${my}" fill="none" stroke="#c8102e" stroke-width="0.8"/>`);
      add(X + Y + 4.4, officeChair(X + 2.9, Y + 1.0, "up", FC.navy));
      add(X + Y + 4.9, person("tech", ["stand:5200", "think:2600"], X + 2.7, Y + 2.2, { face: "back", glance: true }));
      // cart with a spare gradient coil
      add(X + Y + 6.0, legs(X + 3.25, Y + 2.3, 0.55, 0.55, 9, pal(FC.steel), 0.05) + box(X + 3.22, Y + 2.27, 0.6, 0.6, 1, pal(FC.steel), 9) + box(X + 3.22, Y + 2.27, 0.6, 0.6, 1, pal(FC.steel), 2) +
        disc(X + 3.52, Y + 2.57, 0.2, 10, 4, "#c9763a") + disc(X + 3.52, Y + 2.57, 0.1, 14, 0.2, "#3a2a20"));
      add(X + Y + 3.9, onFloor(X + 0.45, Y + 3.45, 0, "fern"));
    },
  },
  {
    key: "reading", wall: WOODS.brown, level: 1, rect: [11, 0, 3, 4], href: "#project-mammo", slug: "mammo", tex: "wood", floor: ["#86563a", "#86563a"],
    blocked: [[0, 0], [1, 0], [2, 0], [1, 1], [2, 1], [1, 2], [2, 2], [0, 3]],
    rug: (X, Y) => rugF(X + 1.3, Y + 1.3, 1.6, 1.6, { edge: "#d9cbb5", field: "#34507f", inner: "#23385a", accent: "#e9c46a" }),
    // lightbox with two mammograms over the desk, a pinboard over the bookcase
    right: slab3(3, 30, 26, 18, 1.5, "#9aa4b1", rect(1, 1, 24, 16, "#f5fbff") +
        [3, 14].map((u) => rect(u, 2, 9, 14, "#1c1f24") + `<rect x="${u + 1.5}" y="4" width="6" height="9" rx="3" fill="#8d96a0"/>` + rect(u + 4, 7, 1.5, 1.5, "#e8eef2")).join("")) + frame3("pinboard", 32, 57, { col: "#8a5a36" }),
    draw(add, X, Y) {
      const glcm = Array.from({ length: 12 }, (_, i) => rect(2 + (i % 4) * 2.4, 2.5 + Math.floor(i / 4) * 2, 2, 1.6, `hsl(0 0% ${25 + Math.floor(rnd() * 60)}%)`)).join("");
      add(X + Y + 0.9, desk(X + 0.1, Y + 0.08, 1.65, 0.62, { wood: FC.walnut }) + monitor(X + 0.25, Y + 0.14, 0.75, 12, glcm) + keyboard(X + 0.35, Y + 0.48, 12) + paper(X + 1.1, Y + 0.3, 12) + tableLamp(X + 1.55, Y + 0.25, 12));
      add(X + Y + 1.5, officeChair(X + 0.5, Y + 0.95, "up", FC.charcoal));
      add(X + Y + 2.2, shelves(X + 1.85, Y + 0.05, 1.1, 0.42, { h: 44, wood: FC.walnut }));
      add(X + Y + 3.6, armchair(X + 1.65, Y + 1.6, "down", { col: FC.navy }));
      add(X + Y + 3.9, person("student", ["sit:7000", "sitDrink:2000"], X + 2.05, Y + 2.45, { dy: 1, face: "frontL", glance: true }));
      add(X + Y + 3.9, floorLamp(X + 2.75, Y + 1.65));
      add(X + Y + 3.1, tableF(X + 1.1, Y + 1.85, 0.4, 0.4, { h: 9, wood: FC.oak }) + bookStack(X + 1.17, Y + 1.95, 9));
      add(X + Y + 3.1, paper(X + 0.25, Y + 2.5, 0, 0.3, 0.35) + paper(X + 0.55, Y + 2.8, 0, 0.3, 0.35));
      add(X + Y + 3.9, onFloor(X + 0.45, Y + 3.45, 0, "palm"));
    },
  },
  {
    key: "server", wall: WOODS.walnut, level: 1, rect: [14, 0, 3, 5], href: "#project-metagenomic", slug: "metagenomic", tex: "tile", floor: ["#3b4049", "#343941"],
    blocked: [[0, 0], [1, 0], [2, 0], [0, 2], [0, 3], [1, 2], [2, 1], [2, 4]],
    // an air-conditioner and a framed gold record above the racks
    right: frame3("frameGold", 30, 57, { col: "#6e4631" }) + slab3(4, 46, 18, 8, 3, "#eef0ee", [0, 1, 2, 3].map((k) => rect(2, 1.5 + k * 1.4, 14, 0.5, "#b8bfc7")).join("") + rect(14, 6, 2, 1, GREEN)),
    draw(add, X, Y) {
      for (let i = 0; i < 3; i++) {
        const x0 = X + 0.1 + i * 0.95;
        add(x0 + 0.4 + Y + 0.4, box(x0, Y + 0.05, 0.85, 0.75, 40, pal("#2b2e35")) + leftFace(x0, Y + 0.05, 0.75, 0, rackFront(13.6, 40)) + rightFace(x0, Y + 0.05, 0.85, 0.75, 0, rect(1, 1, 10, 38, "rgba(255,255,255,.05)")));
      }
      add(X + Y + 1.2, box(X + 0.1, Y + 0.1, 2.8, 0.3, 1, pal(FC.steel, "metal"), 44) + box(X + 0.15, Y + 0.12, 2.7, 0.26, 1.5, pal("#e0584f"), 42.5));
      add(X + Y + 3.0, desk(X + 0.05, Y + 2.3, 0.8, 1.35, { front: "R", wood: FC.charcoal }) + monitor(X + 0.3, Y + 2.5, 0.75, 12, codeLines(3, 7, 3, 8, GREEN), "R") + keyboard(X + 0.55, Y + 2.7, 12, 0.16, 0.45) + deskLamp(X + 0.2, Y + 2.42, 12) + speaker(X + 0.12, Y + 3.42, 12));
      add(X + Y + 3.8, officeChair(X + 1.0, Y + 2.75, "left", "#2f3542"));
      add(X + Y + 3.6, neonShelf(X + 2.08, Y + 1.1, 0.85, 0.42, 32)); // games and figurines
      add(X + Y + 7.6, onFloor(X + 2.88, Y + 4.7, 0, "extinguisher"));
      add(X + Y + 6.6, crate(X + 2.3, Y + 4.1, 0.5, 8) + crate(X + 2.35, Y + 4.15, 0.4, 6, 8));
    },
  },
  {
    key: "security", wall: WOODS.dark, wains: "#4a4f5c", level: 1, rect: [17, 0, 3, 5], href: "#project-sigma", slug: "sigma", tex: "carpet", floor: ["#2f3d60", "#2a3858"],
    rug: (X, Y) => furRug(X + 0.95, Y + 3.5, 0.7, 0.5, "#7fb7d9"),
    blocked: [[0, 0], [2, 0], [0, 1], [1, 1], [2, 1], [1, 2], [2, 2], [2, 4]],
    right: slab3(4, 18, 40, 32, 2.5, "#1b1f2a", rect(2, 2, 36, 28, "#07140c") + codeLines(5, 26, 11, 18, GREEN) + onWall("iconShield", 26, 24)),
    draw(add, X, Y) {
      add(X + Y + 0.7, box(X + 0.15, Y + 0.15, 0.55, 0.55, 14, pal("#3a3f4b", "metal")) + onL(X + 0.15, Y + 0.15, 0.55, 0.55, 0, (L) => panelF(1, 1, L - 2, 12) + stud(L / 2, 7, 2, 1.2, "#c9cdd3", "L", `<line x1="{cx}" y1="{cy}" x2="{cx}" y2="${7 - 1.2 + 1.5}" stroke="${INK}" stroke-width="0.4"/>`) + slab3(L - 3, 4, 1, 4, 1.2, "#c9cdd3")));
      add(X + Y + 2.75, aquarium(X + 2.33, Y + 0.13, 22, 0.54, 0.54, 7));
      add(X + Y + 2.7, box(X + 2.3, Y + 0.1, 0.6, 0.6, 22, pal("#8d96a0", "metal")) + onL(X + 2.3, Y + 0.1, 0.6, 0.6, 0, (L) => [0, 1, 2, 3].map((k) => panelF(1, 1 + k * 5.2, L - 2, 4.6) + pull(L / 2 - 1.5, 3 + k * 5.2, 3, "L", "#c9cdd3")).join("")));
      add(X + Y + 3.4, desk(X + 0.3, Y + 1.35, 2.4, 0.6, { wood: FC.charcoal }) +
        monitor(X + 0.45, Y + 1.41, 0.7, 12, codeLines(3, 7, 3, 8, GREEN)) + monitor(X + 1.2, Y + 1.41, 0.7, 12, codeLines(3, 7, 3, 8, "#ffb800")) + monitor(X + 1.95, Y + 1.41, 0.6, 12, codeLines(3, 7, 3, 7, "#ff5a5a")) +
        keyboard(X + 1.1, Y + 1.71, 12) + onFloor(X + 0.55, Y + 1.8, 12, "mug") + onFloor(X + 2.55, Y + 1.75, 12, "cactus") +
        speaker(X + 0.3, Y + 1.4, 12) + deskLamp(X + 2.6, Y + 1.45, 12) + raised(12, rect(X + 0.3, Y + 1.35, 2.4, 0.6, "rgba(140,210,255,.22)")));
      add(X + Y + 2.4, cubeLamp(X + 1.45, Y + 1.2, 36, 0.6, 14));
      add(X + Y + 4.0, person("analyst", ["typeA", "typeB", "typeA", "typeB", "typeA", "typeB", "typeA", "typeB", "typeA", "typeB", "typeA", "typeB", "typeA", "typeB", "think:1700", "stand:900", "typeA", "typeB", "typeA", "typeB", "typeA", "typeB", "typeA", "typeB"], X + 1.4, Y + 2.6, { face: "backR" }));
      add(X + Y + 5.3, critter("robot", ["robot"], X + 2.4, Y + 2.9, { extra: rect(5.5, 0, 1, 1, "#ff3b3b", ' class="blink"') }));
      add(X + Y + 7, onFloor(X + 2.55, Y + 4.45, 0, "monstera"));
    },
  },
];
const ROOM = Object.fromEntries(ROOMS.map((r) => [r.key, r]));
const roomsAt = (level) => ROOMS.filter((r) => r.level === level);
const roomAt = (level, i, j) => ROOMS.find(({ level: l, rect: [x, y, w, h] }) => l === level && i >= x && i < x + w && j >= y && j < y + h);
// Same seed per room, so its overview and its close-up get the same colours.
const drawRoom = (r, add) => { seed = 101 + ROOMS.indexOf(r) * 7919; curLevel = r.level; r.draw(add, r.rect[0], r.rect[1]); };

// ---------- walls and doors, per floor. Two tiles in different rooms have a wall between them unless both are
// outdoors or the edge is a door. "L:v:x,y" = floor L, plane x between tiles (x-1,y) and (x,y); "L:h:x,y" = plane y.
const DOORS = new Set([
  // ground floor: open plan around the stairs and the entrance hall; café entrance, café↔hacker room
  ...[5, 6, 7, 8].flatMap((y) => [`0:v:5,${y}`, `0:v:7,${y}`]), "0:h:5,9", "0:h:6,9", ...[9, 10, 11, 12].flatMap((y) => [`0:v:5,${y}`, `0:v:7,${y}`]),
  "0:h:5,13", "0:h:6,13", "0:h:10,13", "0:v:15,7",
  // loft: lab↔landing, landing↔gallery, gallery↔MRI, gallery↔reading room, gallery↔server room, server↔security; the stairs arrive at 5..7
  "1:v:5,2", "1:v:5,3", "1:v:7,4", "1:h:9,4", "1:h:12,4", "1:v:14,4", "1:v:17,3", "1:h:5,5", "1:h:6,5",
]);
const edgeKey = ([x, y], [nx, ny]) => (nx !== x ? `v:${Math.max(x, nx)},${y}` : `h:${x},${Math.max(y, ny)}`);
const isWall = (level, a, b) => {
  const ra = roomAt(level, ...a), rb = roomAt(level, ...b);
  return ra !== rb && !(ra.outdoor && rb.outdoor) && !DOORS.has(`${level}:${edgeKey(a, b)}`);
};

// ---------- shell: floors, back walls, slabs, walls between rooms, railings, hedges
const floorTiles = (r) => {
  const [X, Y, w, h] = r.rect;
  seed = 7 + ROOMS.indexOf(r) * 104729;
  let s = "";
  for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) s += rect(X + i, Y + j, 1, 1, r.floor[(i + j) % 2]) + TEX[r.tex](X + i, Y + j, r.floor[(i + j) % 2]);
  return s + (r.rug ? r.rug(X, Y) : "");
};
// Soft shadow on the floor along the foot of the back walls.
const wallShade = (X, Y, lenX, lenY) => rect(X, Y, lenX, 0.45, "url(#aoY)") + rect(X, Y, 0.45, lenY, "url(#aoX)");
// Plank walls like a Habbo cabin interior: vertical boards (a lit edge, a dark gap, the odd knot) over a panelled
// wainscot with a chair rail and a dark baseboard. `wood` colours the boards; `wains` the wainscot (null: a stone base).
const WAINS = 18, CAP = "#5e3b26";
function planks(len, h, wood = WOODS.brown, wains = "#c9a26a") {
  const r = ramp(wood), top = wains ? WAINS : 8, bh = h - top, tones = [wood, mixHex(wood, "#ffffff", 0.12), mixHex(wood, "#000000", 0.14), mixHex(wood, "#c07040", 0.16)];
  let s = rect(0, 0, len, h, r[3]);
  // boards: each its own tone, a lit left bevel and a shaded right one, grain streaks, the odd knot and butt joint, nails
  for (let u = 0, k = 0; u < len; u += 6, k++) {
    const bw = Math.min(6, len - u), t = tones[Math.floor(hsh(k, len + h) * 4)], dk = mixHex(t, "#000000", 0.14);
    if (bw <= 1) continue;
    s += rect(u + 0.6, top, bw - 0.6, bh, t) + rect(u + 0.6, top, 0.8, bh, mixHex(t, "#ffffff", 0.13)) + rect(u + bw - 1, top, 1, bh, dk) +
      rect(u + 2.1 + hsh(k, 1) * 1.2, top + 1.5 + hsh(k, 2) * 8, 0.45, bh * 0.42, mixHex(t, "#000000", 0.16)) + rect(u + 3.3 + hsh(k, 7) * 0.8, top + bh * 0.35 + hsh(k, 3) * 6, 0.4, bh * 0.38, mixHex(t, "#000000", 0.13)) +
      rect(u + 1.6 + hsh(k, 9) * 1.5, top + bh * 0.55 + hsh(k, 10) * 8, 0.35, bh * 0.3, mixHex(t, "#ffffff", 0.1)) + rect(u + 4.4, top + 4 + hsh(k, 11) * 10, 0.3, bh * 0.25, mixHex(t, "#000000", 0.1));
    if (hsh(k, 4) < 0.22) { const kv = top + 8 + hsh(k, 8) * (bh - 16); s += `<ellipse cx="${u + 3.2}" cy="${kv}" rx="1.1" ry="1.5" fill="${dk}"/><ellipse cx="${u + 3.2}" cy="${kv}" rx="0.5" ry="0.7" fill="${mixHex(t, "#000000", 0.28)}"/>`; }
    if (hsh(k, 5) < 0.3) { const jv = top + 10 + hsh(k, 6) * (bh - 20); s += rect(u + 0.6, jv, bw - 0.6, 0.5, r[3]) + rect(u + 0.6, jv + 0.5, bw - 0.6, 0.4, mixHex(t, "#ffffff", 0.12)); }
    s += rect(u + 2.8, h - 3.2, 0.8, 0.8, "#2b1a10") + rect(u + 2.8, top + 1.6, 0.8, 0.8, "#2b1a10");
  }
  if (!wains) return s + rect(0, 0, len, 8, STONE[2]) + `<g>${stones(len, 8, ["#a19c93", "#948f86", "#b3aea5"])}</g>`;
  // wainscot: raised panels with a lighter field, grain in the stiles, a chair rail and a baseboard
  const w = ramp(wains);
  s += rect(0, 0, len, WAINS, w[1]);
  for (let u = 2; u + 10 <= len; u += 12) s += rect(u + 1.2, 5.2, 7.6, WAINS - 10.4, mixHex(wains, "#ffffff", 0.09)) + panelF(u, 4, 10, WAINS - 8) + rect(u + 2.5, 6.5, 4, 0.35, mixHex(wains, "#000000", 0.08)) + rect(u - 1.2, 3.5, 0.35, WAINS - 7, mixHex(wains, "#000000", 0.12));
  return s + rect(0, WAINS - 1.5, len, 1.5, w[2]) + rect(0, WAINS, len, 1.2, w[0]) + rect(0, WAINS + 1.2, len, 0.6, r[3]) + rect(0, 0, len, 2.5, "#4a2e1c") + rect(0, 2.5, len, 0.5, "#8a5a3a");
}
// Tall walls at the back of a floor: the left wall on plane x = X0 (length lenY; `left` = [wood, wainscot], `leftDeco` on
// it, u from its front end), the back wall on plane y = Y0 in per-room segments [[u offset, length, wood, wainscot], ...],
// a thick dark cap along the top, and deco = [[u offset, content]] on the back wall.
function backWalls(X0, Y0, lenX, lenY, deco, segs, left = [WOODS.brown], leftDeco = "") {
  const t = 0.45, L = iso(X0, Y0 + lenY), C = iso(X0, Y0), R = iso(X0 + lenX, Y0);
  const Lb = iso(X0 - t, Y0 + lenY), Cb = iso(X0 - t, Y0 - t), Rb = iso(X0 + lenX, Y0 - t);
  return plane(L, -0.5, planks(lenY * 16, WALL, left[0], left[1]) + leftDeco) + poly([L, C, up(C, WALL), up(L, WALL)], "none") +
    segs.map(([u, len, wood, wains]) => plane(C, 0.5, `<g transform="translate(${u} 0)">${planks(len, WALL, wood, wains)}</g>`)).join("") +
    poly([C, R, up(R, WALL), up(C, WALL)], "none") +
    poly([up(L, WALL), up(C, WALL), up(Cb, WALL), up(Lb, WALL)], CAP) + poly([up(C, WALL), up(R, WALL), up(Rb, WALL), up(Cb, WALL)], CAP) +
    `<polyline points="${[up(L, WALL), up(C, WALL), up(R, WALL)].join(" ")}" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="0.5"/>` +
    deco.map(([u, c]) => plane(C, 0.5, `<g transform="translate(${u} 0)">${c}</g>`)).join("");
}
const wallSegs = (rooms, X0) => rooms.map((r) => [(r.rect[0] - X0) * 16, r.rect[2] * 16, r.wall || WOODS.brown, r.wains]);
// The left wall of a floor takes its colours and deco from the room against it (the one touching x = 0 at the back).
const leftOf = (rooms) => { const r = rooms.find((q) => q.rect[0] === 0 && q.wall) || {}; return [[r.wall || WOODS.brown, r.wains], r.left || ""]; };
// The ground under everything: its two visible sides show earth with stones in it, darker soil under the floor.
const earth = (len) => {
  let s = rect(0, 0, len, 10, "#5e3e24") + rect(0, 7.6, len, 2.4, "#7a5230") + rect(0, 7.3, len, 0.4, "#3a2616");
  for (let u = 2, k = 0; u < len - 2; u += 4 + hsh(k, len) * 6, k++) {
    const v = 1.6 + hsh(k, 1) * 4.2, r = 0.9 + hsh(k, 2) * 1.3;
    s += `<ellipse cx="${u}" cy="${v}" rx="${r}" ry="${r * 0.7}" fill="${hsh(k, 3) < 0.5 ? "#8a7a6a" : "#9a8c7c"}" stroke="#3a2a1a" stroke-width="0.3"/>` + rect(u - r * 0.5, v + r * 0.2, r * 0.8, 0.4, "#c0b2a2");
  }
  return s;
};
const slab = (X0, Y0, lenX, lenY) => {
  const L = iso(X0 - 0.25, Y0 + lenY), F = iso(X0 + lenX, Y0 + lenY), R = iso(X0 + lenX, Y0 - 0.25);
  const faceL = [L, F, up(F, -10), up(L, -10)], faceR = [F, R, up(R, -10), up(F, -10)];
  return poly(faceL, "#6e4a2a") + poly(faceR, "#553820") + plane(up(L, -10), 0.5, earth(F[0] - L[0])) + plane(up(F, -10), -0.5, earth(R[0] - F[0]) + rect(0, 0, R[0] - F[0], 10, "rgba(0,0,0,.18)")) +
    poly(faceL, "none") + poly(faceR, "none");
};
const leafy = (len, h) => { let s = ""; for (let k = 0; k < len * h / 5; k++) s += rect(rnd() * len, rnd() * h, 1, 1, pickSeeded(["rgba(150,230,110,.45)", "rgba(20,60,15,.35)"])); return s; };
// Leafy clumps along a hedge's top: each a dark outline, the leaf mass and a lit crown (light from the up-left).
const hedgeClumps = (x0, y0, w, d, h) => {
  let s = "";
  const n = Math.max(2, Math.round(Math.max(w, d) * 3));
  for (let k = 0; k < n; k++) {
    const t = (k + 0.5) / n, [cx, cy] = up(iso(x0 + (w >= d ? w * t : w / 2), y0 + (w >= d ? d / 2 : d * t)), h + 0.5), r = 3.1 + hsh(k, x0 + y0) * 0.8;
    s += circle(cx, cy, r + 0.5, "#1f4a1b") + circle(cx, cy, r, "#3f8a3a") + circle(cx - r * 0.25, cy - r * 0.3, r * 0.6, "#5cb346") +
      rect(Math.round(cx - r * 0.5), Math.round(cy - r * 0.55), 1, 1, "#8fd66a") + rect(Math.round(cx + r * 0.2), Math.round(cy - r * 0.2), 1, 1, "#8fd66a") + rect(Math.round(cx + r * 0.3), Math.round(cy + r * 0.3), 1, 1, "#2d6a2a");
  }
  return s;
};
const hedgeTop = hedgeClumps;
// Turned wooden balusters every 4 units on a plane (under a railing's top rail).
const balusters = (len) => { let s = ""; for (let u = 1.5; u < len; u += 4) s += rect(u, 1.5, 1.5, 8.5, "#b07a45") + rect(u, 1.5, 0.5, 8.5, "#d49e62") + rect(u + 1.5, 1.5, 0.5, 8.5, INK) +
  rect(u - 0.35, 4.6, 2.2, 1.6, "#8a5a36") + rect(u - 0.35, 4.6, 0.6, 1.6, "#b07a45") + rect(u - 0.35, 2, 2.2, 0.8, "#8a5a36") + rect(u - 0.35, 8.2, 2.2, 0.8, "#8a5a36"); return s; };
// One tile-long piece of edge on plane x=i (segV) or plane y=j (segH): a low panelled partition with a cap, a cut-away
// ledge, a balcony rail or a hedge.
const PART = ["#8a5a3a", "#6e4630", "#5a3826"], PCAP = ["#6e4630", "#5a3826", "#4a2e1c"];
[PART, PCAP].forEach((p) => MATERIAL.set(p, "wood"));
const lowFace = (len) => rect(0, 0, len, LOW, "#b58c5a") + rect(2.5, 4, len - 5, LOW - 7, "#c49b68") + panelF(1.5, 3, len - 3, LOW - 5) + rect(4, 5.5, len * 0.4, 0.35, "#9a7446") + rect(len * 0.55, 7.5, len * 0.3, 0.35, "#9a7446") + rect(0, 0, len, 2, "#4a2e1c");
const segV = (i, j, kind) => kind === "wall" ? box(i - 0.1, j, 0.2, 1, LOW, PART) + rightFace(i - 0.1, j, 0.2, 1, 0, lowFace(16)) + box(i - 0.13, j, 0.26, 1, 1.5, PCAP, LOW)
  : kind === "ledge" ? box(i - 0.12, j, 0.12, 1, 4, PART)
  : kind === "rail" ? box(i - 0.08, j, 0.08, 0.08, 12, RAIL) + rightFace(i - 0.04, j, 0, 1, 0, balusters(16)) + box(i - 0.08, j, 0.08, 1, 1.5, RAIL) + box(i - 0.1, j, 0.12, 1, 2, RAIL, 10)
  : box(i - 0.2, j, 0.4, 1, 8, HEDGE) + rightFace(i - 0.2, j, 0.4, 1, 0, leafy(16, 8)) + hedgeTop(i - 0.2, j, 0.4, 1, 8);
const segH = (i, j, kind) => kind === "wall" ? box(i, j - 0.1, 1, 0.2, LOW, PART) + leftFace(i, j - 0.1, 0.2, 0, lowFace(16)) + box(i, j - 0.13, 1, 0.26, 1.5, PCAP, LOW)
  : kind === "ledge" ? box(i, j - 0.12, 1, 0.12, 4, PART)
  : kind === "rail" ? box(i, j - 0.08, 0.08, 0.08, 12, RAIL) + leftFace(i, j - 0.04, 0, 0, balusters(16)) + box(i, j - 0.08, 1, 0.08, 1.5, RAIL) + box(i, j - 0.1, 1, 0.12, 2, RAIL, 10)
  : box(i, j - 0.2, 1, 0.4, 8, HEDGE) + leftFace(i, j - 0.2, 0.4, 0, leafy(16, 8)) + hedgeTop(i, j - 0.2, 1, 0.4, 8);
// Walls, rails and hedges of one floor: indoor pieces go to `add`, hedges (outdoors) to `addOut`.
function edges(level, add, addOut) {
  const kind = (a, b, key) => {
    if (!a && !b) return null;
    const green = (r) => r.outdoor && r.key !== "street";
    if (!a) return green(b) ? "hedge" : null;              // back boundary: the building's back walls are drawn separately
    if (!b) return DOORS.has(`${level}:${key}`) ? null : a.outdoor ? (green(a) ? "hedge" : null) : level ? "rail" : "ledge";
    return a !== b && !(a.outdoor && b.outdoor) && !DOORS.has(`${level}:${key}`) ? "wall" : null;
  };
  const put = (k, depth, svg) => k && (k === "hedge" ? addOut : add)(depth, svg);
  for (let i = 0; i <= NX; i++) for (let j = 0; j < NY; j++) {
    const k = kind(i > 0 && roomAt(level, i - 1, j), i < NX && roomAt(level, i, j), `v:${i},${j}`);
    if (k) put(k, i + j + 0.5, segV(i, j, k));
  }
  for (let j = 0; j <= NY; j++) for (let i = 0; i < NX; i++) {
    const k = kind(j > 0 && roomAt(level, i, j - 1), j < NY && roomAt(level, i, j), `h:${i},${j}`);
    if (k) put(k, i + 0.5 + j, segH(i, j, k));
  }
}
const sorted = (list) => list.sort((a, b) => a.depth - b.depth).map((t) => `<g data-depth="${t.depth}">${t.svg}</g>`).join("");
// The same for the live building, with the furniture flattened: every change in the scene (a blink, a step) makes the
// browser repaint all of it, and ten thousand shapes of furniture made that expensive. Things that never change (no
// class or id: not a person, nothing animated) become pictures, a run of neighbours at a time, each cropped to what it
// covers. A run never spans a whole-number depth, the depths walkers stand at (x + y + 1, see setDepth), so anyone
// walking still slips in between the right pieces.
function sortedFlat(list) {
  list.sort((a, b) => a.depth - b.depth);
  const probe = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  probe.setAttribute("style", "position:absolute;visibility:hidden;width:0;height:0");
  document.body.append(probe);
  let out = "", run = [], band = null;
  const flush = () => {
    if (!run.length) return;
    probe.innerHTML = run.map((t) => t.svg).join("");
    // (the outline, counting the shared prop images too: the browser leaves out a <use> of an image kept elsewhere)
    const bb = probe.getBBox(), box = [bb.x, bb.y, bb.x + bb.width, bb.y + bb.height];
    for (const [, id, ux, uy] of probe.innerHTML.matchAll(/<use href="#(img\d+)" x="([^"]*)" y="([^"]*)"/g)) {
      const im = document.getElementById(id), x0 = +ux, y0 = +uy;
      box[0] = Math.min(box[0], x0); box[1] = Math.min(box[1], y0); box[2] = Math.max(box[2], x0 + +im.getAttribute("width")); box[3] = Math.max(box[3], y0 + +im.getAttribute("height"));
    }
    const x = Math.floor(box[0] - 3), y = Math.floor(box[1] - 3), w = Math.ceil(box[2] + 3) - x, h = Math.ceil(box[3] + 3) - y;
    out += `<g data-depth="${run[run.length - 1].depth}"><image href="${asImage(probe.innerHTML, [x, y, w, h])}" x="${x}" y="${y}" width="${w}" height="${h}" pointer-events="none"/></g>`;
    run = [];
  };
  for (const t of list) {
    const live = / (class|id)=/.test(t.svg);
    if (live || Math.ceil(t.depth) !== band) flush();
    if (live) out += `<g data-depth="${t.depth}">${t.svg}</g>`;
    else { run.push(t); band = Math.ceil(t.depth); }
  }
  flush();
  probe.remove();
  return out;
}
const decoFor = (rooms, X0, withLive = false) => rooms.filter((r) => r.right || (withLive && r.live)).map((r) => [(r.rect[0] - X0) * 16, (r.right || "") + (withLive ? r.live || "" : "")]);
// Animated wall pieces (flames, blinking lights) are drawn with the room's things, flat on its back wall.
const liveWall = (r) => plane(iso(r.rect[0], r.rect[1]), 0.5, r.live);
// Static layers (floors, walls, scenery) become pictures: an SVG image the browser lays out and paints once, instead
// of thousands of live nodes. Pictures placed with <use> are copied in, since an image can't see the page's <defs>.
const staticURLs = [], imageMarkup = new Map();
function asImage(inner, [vx, vy, vw, vh]) {
  const defs = [...document.querySelectorAll("#img-defs > :not(image)")].map((e) => e.outerHTML).join("");
  const markup = (id) => imageMarkup.get(id) || (imageMarkup.set(id, document.getElementById(id).outerHTML), imageMarkup.get(id));
  // (props are <use>s of images kept in the page, which a picture can't reach: copy each image in. As markup they are
  // "<use .../>"; read back from the page, "<use ...></use>")
  const body = inner.replace(/<use href="#(img\d+)" x="([^"]*)" y="([^"]*)"(?:\/>|><\/use>)/g, (_, id, x, y) => markup(id).replace("<image ", `<image x="${x}" y="${y}" `));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vx} ${vy} ${vw} ${vh}" width="${vw * 2}" height="${vh * 2}" shape-rendering="crispEdges"><defs>${defs}</defs>${body}</svg>`;
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  staticURLs.push(url);
  return url;
}
const VIEW = [0, 0, VW, VH];
// (a picture never takes clicks: its see-through parts would otherwise block the people on the floor below)
const picture = (inner) => `<image href="${asImage(inner, VIEW)}" x="0" y="0" width="${VW}" height="${VH}" pointer-events="none"/>`;

// The building's right side under the loft (x = NX, y = 0..5): boards on a stone base, a window with a flower box.
function sideWalls() {
  const d = FLOORS[1].depth, o = iso(NX, d);
  return plane(o, -0.5, planks(d * 16, H, WOODS.brown, null) + windowW(d * 8 - 9, 28, 18, 16, { curtain: null, wall: "left" }) + flowerBox(d * 8 - 11, 22, 22, "left")) +
    poly([iso(NX, d), iso(NX, 0), up(iso(NX, 0), H), up(iso(NX, d), H)], "none");
}
// Things on top of the top floor's back wall: a stone chimney with smoke, a satellite dish and an antenna with a blinking light.
const smoke = (x, y) => [0, 1, 2].map((i) => `<circle cx="${x}" cy="${y}" r="${2.5 + i * 0.6}" fill="#eef1f4" stroke="${INK}" stroke-width="0.5" class="smoke" style="animation-delay:-${i}s"/>`).join("");
// The chimney stands just behind the back wall (0.25 thick) and rises from its top, so none of it shows inside the room.
function rooftop(add) {
  const [cx, cy] = up(iso(2.6, -0.55), WALL + 30);
  add(99, box(2.2, -0.85, 0.8, 0.6, 28, STONE, WALL) + leftFace(2.2, -0.85, 0.6, WALL, stones(12.8, 28, ["#b3aea5", "#a19c93", "#bdb8af"])) +
    rightFace(2.2, -0.85, 0.8, 0.6, WALL, stones(9.6, 28, ["#8a857c", "#7d786f", "#948f86"])) + box(2.1, -0.95, 1, 0.8, 3, STONE, WALL + 28) + smoke(cx, cy));
  const [dx, dy] = up(iso(18.9, 0.2), WALL + 16);
  add(99, box(18.85, 0.15, 0.1, 0.1, 12, CASE, WALL) + `<ellipse cx="${dx}" cy="${dy}" rx="9" ry="6" fill="#dfe4e9" stroke="${INK}" stroke-width="0.5"/>` +
    `<ellipse cx="${dx + 1}" cy="${dy + 0.5}" rx="6" ry="3.8" fill="#c9cdd3"/><line x1="${dx}" y1="${dy}" x2="${dx - 5}" y2="${dy - 7}" stroke="${CASE[1]}" stroke-width="0.8"/>` +
    rect(dx - 6, dy - 8, 2, 2, "#ff3b3b", ' class="blink"'));
  add(99, box(9.45, 0.15, 0.08, 0.08, 30, CASE, WALL) + rect(...up(iso(9.5, 0.2), WALL + 32), 1.5, 1.5, "#ff3b3b", ' class="blink"'));
}

// Scenery behind the building, painted on two panels along its back edges (x = -0.25 and y = -0.25), like a Habbo
// room's backdrop: a far and a near mountain range, then pines along the building's stepped outline.
const MTN = [["#8aa6c6", "#7089ad", "#a9c0da"], ["#4f729f", "#38567f", "#6c8fb8"]], SNOW = ["#f6fafd", "#cddcea"];
// One mountain on a panel (u along, v up): lit left flank with a light ridge, shaded right flank, jagged snow cap.
const mountain = ([u, v, hw], [lit, shade, ridge]) => {
  const f = 0.26, cap = v - f * (v + 12), P = (a, b) => [u + hw * a, v + (v + 12) * b];
  return poly([[u - hw, -12], [u, v], [u + hw * 0.15, -12]], lit, "none") + poly([[u, v], [u + hw, -12], [u + hw * 0.15, -12]], shade, "none") +
    poly([[u, v], P(-0.35, -0.55), P(-0.3, -0.62), P(-0.05, -0.2)], ridge, "none") + poly([[u, v], P(0.45, -0.7), P(0.35, -0.75), P(0.12, -0.3)], lit, "none") +
    poly([[u, v], [u + hw * f, cap], [u + hw * f * 0.5, cap + 4], [u + hw * f * 0.1, cap - 3], [u - hw * f * 0.4, cap + 5], [u - hw * f, cap]], SNOW[0], "none") +
    poly([[u, v], [u + hw * f, cap], [u + hw * f * 0.5, cap + 4], [u + hw * 0.04, cap + 2]], SNOW[1], "none");
};
function backdrop() {
  const L = iso(-0.25, NY), C = iso(-0.25, -0.25);
  const panel = (id, origin, dir, len, far, near) => `<clipPath id="${id}"><rect x="0" y="-12" width="${len}" height="400"/></clipPath>` +
    plane(origin, dir, `<g clip-path="url(#${id})">${far.map((m) => mountain(m, MTN[0])).join("")}${near.map((m) => mountain(m, MTN[1])).join("")}</g>`);
  // Pines on the panels in two rows along the building's outline (the left panel's outline steps down floor by floor).
  const pines = [], at = ([ox, oy], dir, u, v, small) => pines.push([ox + u, oy + dir * u - v, small]);
  const top = (y) => (y > 13 ? 0 : y > 5 ? WALL + 2 : H + WALL + 2), outlineL = (u) => top(NY + 0.25 - u / 16);
  for (let u = 3; u < (NY + 0.25) * 16 - 4; u += 8) at(L, -0.5, u, (outlineL(u) ? outlineL(u) + 2 : 14) + ((u * 5) % 7), true);          // back row, small
  for (let u = 6; u < (NY + 0.25) * 16 - 4; u += 9) at(L, -0.5, u, outlineL(u) ? outlineL(u) - 16 + ((u * 7) % 9) : (u * 3) % 5, false); // front row
  for (let u = 4; u < (NX + 0.25) * 16; u += 8) at(C, 0.5, u, H + WALL + 6 + ((u * 5) % 9), true);
  for (let u = 8; u < (NX + 0.25) * 16; u += 10) at(C, 0.5, u, H + WALL - 16 + ((u * 7) % 11), false);
  return panel("bd-l", L, -0.5, (NY + 0.25) * 16, [[20, 150, 110], [110, 200, 120], [200, 185, 100]], [[60, 110, 80], [150, 150, 90], [230, 160, 70]]) +
    panel("bd-r", C, 0.5, (NX + 0.25) * 16, [[25, 180, 110], [120, 230, 130], [230, 270, 120], [310, 280, 100]], [[70, 200, 80], [175, 225, 95], [280, 250, 80]]) +
    pines.map(([x, y, small]) => { const name = small ? "pineSmall" : "pine", { w, h } = propImage(name); return propImg(name, Math.round(x - w / 2), Math.round(y - h)); }).join("");
}

// ---------- the overview: the scenery and the building's side, then each floor from the ground up, then everything outdoors
// Stone posts at the front ends of partitions and at corners, per floor.
const POSTS = { 0: [[5, 13], [7, 13], [15, 9], [15, 13], [20, 9]], 1: [[5, 5], [7, 5], [7, 4], [11, 4], [14, 4], [17, 5], [20, 5]] };
function cabinSVG() {
  const outdoor = [], addOut = (depth, svg) => outdoor.push({ depth, svg });
  let s = picture(backdrop() + slab(0, 0, NX, NY) + sideWalls());
  for (const { level, y0, depth } of FLOORS) {
    const rooms = roomsAt(level), back = rooms.filter((r) => !r.outdoor && r.rect[1] === y0), list = [], add = (d, svg) => list.push({ depth: d, svg });
    shadows = [];
    edges(level, add, addOut);
    for (const r of rooms) drawRoom(r, r.outdoor ? addOut : add);
    for (const r of rooms) if (r.live) add(r.rect[0] + r.rect[1] - 0.2, liveWall(r));
    curLevel = level;
    if (level === 0) {
      add(12.5 + 11.5, person("coffee", ["stand"], 12.5, 11.5, { cls: "walker", walker: true }));
      addOut(3.5 + 14.5, critter("dog", ["dog", "dogB"], 3.5, 14.5, { cls: "walker" }));
    } else {
      add(6.5 + 2.5, critter("cat", ["cat", "catB"], 6.5, 2.5, { cls: "walker" }));
      rooftop(add);
      for (const x of [1.2, 3.1, 8.3, 11.8, 15.3, 18.3]) add(x + y0 + depth + 0.3, railPlanter(x, y0 + depth + 0.02));
    }
    // stone posts: at the front ends of partitions, at the front of the tall left wall, and where rooms meet on the back wall
    for (const [x, y] of POSTS[level]) add(x + y + 0.2, pillar(x - 0.15, y - 0.15, LOW + 7, { s: 0.3 }));
    add(y0 + depth, pillar(-0.3, y0 + depth - 0.3, WALL, { s: 0.34 }));
    const posts = [...new Set(back.filter((r) => r.rect[0] > 0).map((r) => r.rect[0]))].map((xb) => pillar(xb - 0.15, y0 - 0.12, WALL, { s: 0.3 })).join("") +
      pillar(-0.3, y0 - 0.3, WALL, { s: 0.4 }) + pillar(NX - 0.1, y0 - 0.3, WALL, { s: 0.34 });
    const floor = tiles(rooms.map(floorTiles).join("") + wallShade(0, y0, NX, depth));
    const [left, leftDeco] = leftOf(back);
    const still = (level ? box(0, y0, NX, depth, SLAB, BEAM, -SLAB) + leftFace(0, y0, depth, -SLAB, beamFace(NX * 16)) : "") + floor +
      backWalls(0, y0, NX, depth, decoFor(back, 0), wallSegs(back, 0), left, leftDeco) + posts + shadows.join("");
    s += lift(level, picture(still) + `<g id="things-${level}">${sortedFlat(list)}</g>`);
  }
  shadows = null;
  return s + `<g id="things-out">${sortedFlat(outdoor)}</g>`;
}

// ---------- a project's room(s) on their own, walls at full height (shown next to each project)
function closeupSVG(slug) {
  const rooms = ROOMS.filter((r) => r.slug === slug), level = rooms[0].level;
  const X = Math.min(...rooms.map((r) => r.rect[0])), Y = Math.min(...rooms.map((r) => r.rect[1]));
  const w = Math.max(...rooms.map((r) => r.rect[0] + r.rect[2])) - X, h = Math.max(...rooms.map((r) => r.rect[1] + r.rect[3])) - Y;
  const list = [], add = (depth, svg) => list.push({ depth, svg });
  shadows = [];
  // cut-away edges wherever the next tile isn't one of these rooms, and the walls between them
  const inside = (i, j) => rooms.some(({ rect: [x, y, rw, rh] }) => i >= x && i < x + rw && j >= y && j < y + rh);
  const front = rooms[0].outdoor ? "hedge" : "ledge";
  for (let i = X; i < X + w; i++) for (let j = Y; j < Y + h; j++) {
    if (!inside(i, j)) continue;
    if (!inside(i, j + 1)) add(i + 0.5 + j + 1, segH(i, j + 1, front));
    if (!inside(i + 1, j)) add(i + 1 + j + 0.5, segV(i + 1, j, front));
    if (i > X && inside(i - 1, j) && isWall(level, [i - 1, j], [i, j])) add(i + j + 0.5, segV(i, j, "wall"));
  }
  for (const r of rooms) drawRoom(r, add);
  const ground = shadows.join("");
  shadows = null;
  const [left] = iso(X, Y + h), [right] = iso(X + w, Y), top = iso(X, Y)[1] - WALL, bottom = iso(X + w, Y + h)[1] + 6;
  const vb = [left - 6, top - 4, right - left + 12, bottom - top + 8];
  const back = rooms.filter((r) => r.rect[1] === Y), first = rooms.find((r) => r.rect[0] === X) || rooms[0];
  const inner = slab(X, Y, w, h) + tiles(rooms.map(floorTiles).join("") + wallShade(X, Y, w, h)) +
    backWalls(X, Y, w, h, decoFor(back, X, true), wallSegs(back, X), [first.wall || WOODS.brown, first.wains], X === 0 ? first.left || "" : "") +
    pillar(X - 0.3, Y - 0.3, WALL, { s: 0.4 }) + pillar(X + w - 0.1, Y - 0.3, WALL, { s: 0.34 }) + ground + sorted(list);
  return `<img src="${asImage(inner, vb)}" width="${vb[2] * 2}" height="${vb[3] * 2}" alt="">`;
}

// ---------- hero: draw, bubbles, people
const scene = document.getElementById("scene");
const room = document.getElementById("room");
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
let onScreen = true; // the cabin is in view (see the animator at the end)
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
scene.innerHTML = cabinSVG();

// ---------- the animator, with Habbo's timing (from its open-source client): frames change on an 80 ms tick (Habbo
// advances avatar frames about every 82 ms); a step between tiles takes 500 ms; people blink every 4.5–5.5 s for
// 50–250 ms, move their mouth while they talk (about a second a word, with short pauses), and gestures last 3 s. The
// head turns on its own, to look at whoever talks nearby or just to glance around.
const STATES = new Map(), DECODED = new Set();
const decodeURL = (url) => Object.assign(new Image(), { src: url }).decode().catch(() => {});
const decodeStrip = (strip) => (DECODED.has(strip.id) ? Promise.resolve() : decodeURL(strip.url).then(() => DECODED.add(strip.id)));
const win = (svg) => svg && { svg, keys: new Map(), i: 0, W: +svg.getAttribute("width"), H: +svg.getAttribute("height") };
const setWin = (w, i) => { if (w.i !== i) { w.svg.setAttribute("viewBox", `${i * w.W} 0 ${w.W} ${w.H}`); w.i = i; } };
const bodyRight = (st) => (st.view === "front") === !st.mirror;
for (const el of scene.querySelectorAll(".who")) {
  const look = el.dataset.look, human = !el.classList.contains("critter"), cfg = PEOPLE.get(look), now = performance.now();
  const st = { el, look, human, cfg, level: cfg.level, pos: [cfg.x, cfg.y], walking: false, walkT0: 0, face: el.querySelector(".face"), body: win(el.querySelector(".bv")) };
  if (human) {
    const idle = cfg.idle.map(parsePose), view = faceBack(cfg.face) ? "back" : "front";
    Object.assign(st, { idle, idleI: reduceMotion ? 0 : Math.floor(Math.random() * idle.length), idleNext: 0, view, mirror: faceMirror(cfg.face),
      head: win(el.querySelector(".hv")), over: win(el.querySelector(".ov")), lift: el.querySelector(".lift"), hl: el.querySelector(".hl"), ol: el.querySelector(".ol"),
      extraG: el.querySelector(".extra"), blinkAt: now + Math.random() * 4500, blinkEnd: 0, talkUntil: 0, mouthOpen: false, mouthNext: 0, lookUntil: 0, lookRight: true,
      gesture: null, pose: idle[0].pose, headMirror: false });
    st.blinkEnd = st.blinkAt + 150;
    st.body.keys.set(`${idle[0].pose}|${view}`, 0);
    st.head.keys.set(`${view}|open|closed`, 0);
    if (st.over) st.over.keys.set(`${idle[0].pose}|${view}`, 0);
  }
  STATES.set(el, st);
}
const stateOf = (el) => STATES.get(el);
// Show the building once its pictures (the static layers and everyone's first frames) have decoded.
scene.style.visibility = "hidden";
const firstIds = [...new Set([...scene.querySelectorAll("use")].map((u) => u.getAttribute("href").slice(1)))];
Promise.all([...staticURLs.map(decodeURL), ...firstIds.map((id) => { const im = document.getElementById(id); return im && decodeURL(im.getAttribute("href")).then(() => DECODED.add(id)); })])
  .then(() => (scene.style.visibility = ""));

// Gestures: clicked people wave (sitting ones raise a hand); people talk with their hands while they speak.
const STANDING = ["stand", "shift", "phone", "think", "reach", "typeA", "typeB", "drink"], SITTING = ["sit", "sitDrink"];
const GESTURES = { wave: { stand: ["wave1", "wave2"], sit: ["sitWave", "sit"] }, talk: { stand: ["talk1", "stand", "talk2", "stand"], sit: ["sit", "sitWave"] } };
const bodyKind = (st) => (STANDING.includes(st.idle[0].pose) ? "stand" : SITTING.includes(st.idle[0].pose) ? "sit" : null);
// A little routine of her own for Jen in the living room: mostly she just stands there, and every so often she blinks
// twice, winks, looks round, stretches with a yawn, spins on the spot, turns to look at the fireplace for a bit, sips a coffee or
// (after checking nobody is looking) sneaks a cookie. Each act is a list of steps: a pose, a way to face, eyes (closed
// or a wink), a mouth (open), `look` (turn the head away) or `chew`, held for ms.
const ROUTINES = {
  jen: {
    still: [5, () => [{ ms: 3000 + Math.random() * 4000 }]],
    blink: [2, () => [{ eyes: "closed", ms: 130 }, { ms: 170 }, { eyes: "closed", ms: 130 }, { ms: 1500 }]],
    wink: [1, () => [{ eyes: "wink", ms: 700 }, { ms: 1200 }]],
    look: [2, () => [{ look: true, ms: 1500 + Math.random() * 800 }, { ms: 900 }]],
    yawn: [1, () => [{ pose: "armsUp", eyes: "closed", mouth: "open", ms: 1500 }, { ms: 900 }]],
    spin: [1, () => [...["frontL", "back", "backR", "front"].map((face) => ({ face, ms: 240 })), { ms: 1200 }]],
    away: [1, () => [{ face: "frontL", ms: 260 }, { face: "back", ms: 2400 }, { face: "frontL", ms: 260 }, { face: "front", ms: 1000 }]],
    coffee: [1.5, () => [{ pose: "holdCup", ms: 1200 }, { pose: "drink", ms: 1400 }, { pose: "holdCup", ms: 1600 }, { pose: "drink", ms: 1200 }, { pose: "holdCup", ms: 1000 }, { ms: 800 }]],
    snack: [1.5, () => [{ look: true, ms: 600 }, { ms: 300 }, { look: true, ms: 500 }, { pose: "snack", ms: 700 }, { chew: true, ms: 1600 }, { eyes: "wink", ms: 500 }, { ms: 800 }]],
  },
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function routine(st) {
  const acts = Object.values(ROUTINES[st.look]), total = acts.reduce((n, [w]) => n + w, 0);
  st.routine = true;
  while (st.routine) { // (set it false to stop)
    let r = Math.random() * total, i = 0;
    while ((r -= acts[i][0]) > 0) i++;
    for (const step of acts[i][1]()) {
      if (!st.routine) return;
      const now = performance.now();
      if (!st.gesture) { // (a wave when clicked takes over; the routine carries on after)
        st.override = step;
        if (step.face) turn(st, step.face);
        if (step.look) { st.lookUntil = now + step.ms; st.lookRight = !bodyRight(st); }
        if (step.chew) st.talkUntil = now + step.ms;
      }
      await wait(step.ms);
    }
    st.override = null;
    turn(st, st.cfg.face);
  }
}
// poses a routine uses one after the other (standing between them), with how long each is held
const routinePairs = (look) => Object.values(ROUTINES[look]).flatMap(([, make]) => {
  const steps = make(), list = steps.map((s) => ({ pose: s.pose || "stand", ms: s.ms }));
  return [["stand", list[0].pose, list[0].ms], ...list.slice(1).map((b, i) => [list[i].pose, b.pose, b.ms]), [list[list.length - 1].pose, "stand", 1800]];
});
function act(el, kind = "wave", ms = 3000) {
  const st = STATES.get(el);
  if (!st?.human || st.cfg.walker || !bodyKind(st)) return;
  if (st.routine) { st.override = null; turn(st, st.cfg.face); }
  const now = performance.now();
  st.gesture = { kind, poses: GESTURES[kind][bodyKind(st)], ms: kind === "wave" ? 260 : 380, t0: now, until: now + ms };
  el.classList.add("acting");
}
// Every frame a person may need, drawn once into strips after the page is showing (walkers first), and swapped in only
// once decoded, so nobody ever blinks out.
// Poses change through in-between frames (see tweenPose in avatar.js): every change that can happen gets them drawn.
const TWEENS = [1 / 3, 2 / 3], tweensOf = (a, b) => (a === b ? [] : TWEENS.map((t) => tweenPose(a, b, t)));
const loopPairs = (list) => list.map((p, i) => [p, list[(i + 1) % list.length]]);
function framesNeeded(st) {
  const views = st.cfg.walker ? ["front", "back"] : [st.view], poses = new Set(st.idle.map((p) => p.pose)), pairs = [];
  // pairs of poses one can follow the other, with how long the second is held (a change takes up to 45% of that)
  const seq = (list) => { list.forEach((p) => poses.add(p.pose)); pairs.push(...loopPairs(list).map(([a, b]) => [a.pose, b.pose, b.ms])); };
  seq(st.idle);
  if (st.cfg.walker) { WALK8.forEach((p) => poses.add(p)); poses.add("stand"); (ROUTES[st.look]?.stops || []).forEach((s) => seq(s.poses.map(parsePose))); }
  if (st.wk?.patron) ["shift", "phone", "talk1", "talk2", ...Object.values(SIT_DO).flat().map((p) => parsePose(p).pose)].forEach((p) => poses.add(p));
  else if (bodyKind(st)) {
    const rest = st.idle[0];
    Object.entries(GESTURES).forEach(([kind, g]) => {
      const list = g[bodyKind(st)].map((pose) => ({ pose, ms: kind === "wave" ? 260 : 380 }));
      seq(list); pairs.push([rest.pose, list[0].pose, list[0].ms], ...list.map((p) => [p.pose, rest.pose, rest.ms]));
    });
  }
  if (ROUTINES[st.look]) routinePairs(st.look).forEach((pair) => { poses.add(pair[1]); pairs.push(pair); });
  // in-between frames only where they get shown: a change that lasts at least two animation ticks (not quick typing)
  pairs.forEach(([a, b, ms]) => { if (0.45 * ms >= 120) tweensOf(a, b).forEach((p) => poses.add(p)); });
  const bodyKeys = views.flatMap((v) => [...poses].map((pose) => ({ pose, back: v === "back", key: `${pose}|${v}` })));
  const headKeys = views.flatMap((v) => (v === "back" ? [{ back: true, key: "back|open|closed" }]
    : ["open|closed", "closed|closed", "open|open", "closed|open"].map((e) => { const [eyes, mouth] = e.split("|"); return { back: false, eyes, mouth, key: `front|${e}` }; })));
  // a routine also turns round (standing, seen from behind) and winks
  if (ROUTINES[st.look]) {
    if (!views.includes("back")) { bodyKeys.push({ pose: "stand", back: true, key: "stand|back" }); headKeys.push({ back: true, key: "back|open|closed" }); }
    headKeys.push({ back: false, eyes: "wink", mouth: "closed", key: "front|wink|closed" });
  }
  return { bodyKeys, headKeys, overKeys: bodyKeys.filter((k) => hasOver(k.pose)) };
}
function swapStrip(w, strip, keys) { w.svg.querySelector("use").setAttribute("href", `#${strip.id}`); w.keys = new Map(keys.map((k, i) => [k.key, i])); w.i = -1; }
async function upgrade(st) {
  const { bodyKeys, headKeys, overKeys } = framesNeeded(st), look = st.look;
  const body = await avatarStripAsync(look, bodyKeys.map(({ pose, back }) => ({ pose, back, layer: "body" })));
  const head = await avatarStripAsync(look, headKeys.map(({ back, eyes, mouth }) => ({ back, eyes, mouth, layer: "head" })));
  const over = overKeys.length ? await avatarStripAsync(look, overKeys.map(({ pose, back }) => ({ pose, back, layer: "over" }))) : null;
  await Promise.all([body, head, over].filter(Boolean).map(decodeStrip));
  swapStrip(st.body, body, bodyKeys);
  swapStrip(st.head, head, headKeys);
  if (over) {
    if (!st.over) { st.ol.innerHTML = frameWin(over, 0, AW / 2, AH / 2, "ov"); st.over = win(st.ol.firstChild); }
    swapStrip(st.over, over, overKeys);
  }
  st.pose = null;
  if (onScreen) draw(st, performance.now()); // (off screen: the next tick once it is back)
}
// Pick and show one person's (or animal's) frame for this moment.
function draw(st, now) {
  if (!st.human) return setWin(st.body, st.walking ? Math.floor((now - st.walkT0) / ((st.wk?.stepMs || 500) / 2)) % 2 : 0);
  let target, hold;
  if (st.walking) target = WALK8[Math.floor((now - st.walkT0) / 62.5) % 8];
  else if (st.gesture && now < st.gesture.until) { target = st.gesture.poses[Math.floor((now - st.gesture.t0) / st.gesture.ms) % st.gesture.poses.length]; hold = st.gesture.ms; }
  else {
    if (st.gesture) { st.gesture = null; st.el.classList.remove("acting"); }
    if (st.override) { target = st.override.pose || "stand"; hold = st.override.ms; }
    else {
      if (!reduceMotion && now >= st.idleNext) { st.idleI = (st.idleI + 1) % st.idle.length; st.idleNext = now + st.idle[st.idleI].ms * (0.85 + Math.random() * 0.3); }
      target = st.idle[st.idleI].pose; hold = st.idle[st.idleI].ms;
    }
  }
  // a new target pose: move there through the in-between frames (not while walking: the walk cycle is its own)
  if (target !== st.to) { st.from = st.walking || WALK8.includes(st.to) ? null : st.to; st.to = target; st.tAt = now; st.tDur = Math.min(280, 0.45 * (hold || 300)); }
  let pose = target;
  if (st.from && now - st.tAt < st.tDur) {
    const k = Math.floor(((now - st.tAt) / st.tDur) * 3);
    const tw = k === 0 ? st.from : tweenPose(st.from, st.to, TWEENS[k - 1]);
    if (st.body.keys.has(`${tw}|${st.view}`)) pose = tw;
  }
  if (now > st.blinkEnd) { st.blinkAt = now + 4500 + Math.random() * 1000; st.blinkEnd = st.blinkAt + 90 + Math.random() * 160; } // long enough to land on a tick (below)
  const eyes = st.override?.eyes || (now >= st.blinkAt && now < st.blinkEnd ? "closed" : "open");
  if (now < st.talkUntil && now >= st.mouthNext) { st.mouthOpen = !st.mouthOpen; st.mouthNext = now + (st.mouthOpen ? 110 + Math.random() * 150 : 75 + Math.random() * 110); }
  const mouth = st.override?.mouth || (now < st.talkUntil && st.mouthOpen ? "open" : "closed"), v = st.view, bi = st.body.keys.get(`${pose}|${v}`);
  if (bi === undefined) return; // not drawn yet (before its strips are ready): stay as we are
  setWin(st.body, bi);
  const oi = st.over?.keys.get(`${pose}|${v}`);
  if (st.over) { st.over.svg.style.display = oi === undefined ? "none" : ""; if (oi !== undefined) setWin(st.over, oi); }
  const hi = st.head.keys.get(v === "back" ? "back|open|closed" : `front|${eyes}|${mouth}`);
  if (hi !== undefined) setWin(st.head, hi);
  const hm = now < st.lookUntil && st.lookRight !== bodyRight(st);
  if (hm !== st.headMirror) { st.headMirror = hm; st.hl.setAttribute("transform", hm ? HEAD_MIRROR : ""); }
  if (pose !== st.pose) {
    st.lift.setAttribute("transform", POSES[pose].bob ? "translate(0 -0.5)" : ""); // the walk cycle's lifted frames
    if (EXTRA[st.look]) st.extraG.innerHTML = EXTRA[st.look](pose);
    if (st.look === "pitcher" && pose === "pRelease") { const ball = scene.querySelector(".ball"); ball.classList.remove("fly"); void ball.getBBox(); ball.classList.add("fly"); }
    st.pose = pose;
  }
}

function say(el, text) {
  if (STATES.get(el)?.wk?.off) return;
  room.querySelector(`.bubble[data-for="${el.dataset.look}"]`)?.remove();
  const r = el.querySelector(".hit").getBoundingClientRect(), R = room.getBoundingClientRect(); // the person's own box (their layers hold whole strips)
  const b = document.createElement("div");
  b.className = "bubble";
  b.dataset.for = el.dataset.look;
  b.innerHTML = `<b>${CONTENT.npcs[el.dataset.look].name}:</b> `;
  b.append(text);
  b.style.left = `${((r.left + r.width / 2 - R.left) / R.width) * 100}%`;
  b.style.top = `${((r.top - R.top - 4) / R.height) * 100}%`;
  room.append(b);
  setTimeout(() => b.remove(), 4000);
  // the speaker's mouth moves (about a second a word) and they talk with their hands; everyone near turns their head to them
  const st = STATES.get(el), now = performance.now(), dur = Math.min(3600, Math.max(1200, String(text).trim().split(/\s+/).length * 900));
  if (!st) return;
  if (st.human) { st.talkUntil = now + dur; if (!st.gesture && !st.walking && st.view === "front") act(el, "talk", dur); }
  const [sx, sy] = posOf(st);
  STATES.forEach((o) => {
    if (o === st || !o.human || o.level !== st.level) return;
    const [ox, oy] = posOf(o);
    if (Math.max(Math.abs(ox - sx), Math.abs(oy - sy)) > 5) return;
    o.lookUntil = now + dur + 900;
    o.lookRight = sx - sy > ox - oy; // screen x runs along x − y
  });
}
const people = [...scene.querySelectorAll(".who")];
const npcOf = (el) => CONTENT.npcs[el.dataset.look];
const chatty = people.filter((el) => npcOf(el).lines.length);
const randomChat = () => {
  const el = pick(chatty), st = STATES.get(el);
  if (!st?.wk?.patron) return say(el, pick(npcOf(el).lines));
  if (!st.wk.off && !st.walking) say(el, pick(seated(st.wk) ? CONTENT.cafe.seated : npcOf(el).lines)); // (café customers: what fits where they are)
};
scene.addEventListener("click", (e) => { const el = e.target.closest(".who"); if (el) { act(el); say(el, pick(npcOf(el).click)); } });
scene.addEventListener("keydown", (e) => {
  const el = e.target.closest(".who");
  if (el && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); act(el); say(el, pick(npcOf(el).click)); }
});

// People and animals who move walk tile to tile on their own floor, through doors only, never onto furniture or each
// other, one tile per 500 ms without stopping until they get where they are going. Wanderers pick a spot a few tiles
// away, walk there and stand a while (the coffee drinker inside on the ground floor, the cat in the loft, the dog
// outdoors). The others have a route: stations to walk between, and at each one a way to face and a task to do for a
// while. `also` lets them onto tiles kept free of wanderers (behind the counter, their spot in line).
const BLOCKED = new Set(ROOMS.flatMap((r) => r.blocked.map(([u, v]) => `${r.level}:${r.rect[0] + u},${r.rect[1] + v}`)));
const T = (n) => Array.from({ length: n }, (_, i) => (i % 2 ? "typeB" : "typeA"));
const ROUTES = {
  barista: { level: 0, also: ["7,6", "8,6", "9,6", "10,6"], stops: [
    { tile: [8, 6], face: "backR", poses: [...T(12), "reach:1000", "reach:800"], wait: 5200 }, // pulling shots at the machine
    { tile: [9, 6], face: "frontL", poses: ["reach:1000", "stand:900", "talk1", "stand:700", "talk2"], wait: 4400 }, // serving at the counter
  ] },
  labB: { level: 1, stops: [
    { tile: [1, 3], face: "back", poses: ["reach:1100", "stand:900", "reach:1100", "think:1500"], wait: 5200 }, // checking on the mice
    { tile: [2, 4], face: "backR", poses: T(20), wait: 4800 },                                                  // reading the scan at the console
  ] },
};
// the stations are kept for their people: wanderers never stop (or get stuck) on them
const CAFE_TILES = [...CAFE.edges.flatMap((e) => e.tiles), CAFE.door, [10, 12], CAFE.counter, [10, 8], ...CAFE.queue, ...CAFE.seats.map((s) => s.tile)];
const STATIONS = new Set([...Object.values(ROUTES).flatMap((r) => r.stops.map((s) => `${r.level}:${s.tile}`)), ...CAFE_TILES.map((t) => `0:${t}`)]);
const onFloorOK = (wk, [x, y]) => !!roomAt(wk.level, x, y) && (!BLOCKED.has(`${wk.level}:${x},${y}`) || wk.also.has(`${x},${y}`)) && wk.allowed([x, y]) &&
  (!!wk.route || wk.through || !STATIONS.has(`${wk.level}:${x},${y}`));
const walkable = (wk, from, to) => onFloorOK(wk, to) && !isWall(wk.level, from, to);
const streetOrCafe = ([x, y]) => ["street", "cafe"].includes(roomAt(0, x, y)?.key);
const WALKERS = [
  { look: "coffee", level: 0, tile: [12, 11], allowed: ([x, y]) => !roomAt(0, x, y).outdoor },
  { look: "cat", level: 1, tile: [6, 2], allowed: () => true },
  { look: "dog", level: 0, tile: [3, 14], allowed: ([x, y]) => roomAt(0, x, y).outdoor },
  // a turtle: slow, and free to crawl anywhere downstairs, in and out by the café door (never stopping in it)
  { look: "sam", level: 0, tile: [17, 10], stepMs: 1400, allowed: () => true, through: true, also: ["10,13"] },
  ...Object.entries(ROUTES).map(([look, r]) => ({ look, level: r.level, tile: r.stops[0].tile, route: r, stopAt: 0, allowed: () => true })),
  // the café's customers: through any station, onto the café's own tiles; the sidewalk and the café only
  ...["q1", "q2", "q3", "q4", "q5", "q6", "customerA", "customerB"].map((look, k) => ({ look, level: 0, patron: true, through: true, allowed: streetOrCafe, trip: 0,
    tile: k < 4 ? CAFE.queue[k] : k < 6 ? [-10 - k, -10] : CAFE.seats[k - 6].tile, also: CAFE_TILES.map(String) })),
  // out for a stroll: a leader and who follows them (same pace)
  ...[["lady", "lady", 650], ["pup", "lady", 650], ["mom", "family", 560], ["kid", "family", 560], ["dad", "family", 560]].map(([look, party, stepMs], k) =>
    ({ look, level: 0, party, stepMs, through: true, allowed: ([x, y]) => roomAt(0, x, y)?.key === "street", trip: 0, tile: [-30 - k, -10], also: CAFE_TILES.map(String) })),
].map((w) => ({ ...w, also: new Set(w.also || w.route?.also || []), el: scene.querySelector(`.walker[data-look="${w.look}"]`), heading: [1, 0] }));
// where each walker is drawn (scene px), read from where the scene put them
WALKERS.forEach((wk) => (wk.xy = wk.el.style.transform.match(/-?[\d.]+/g).map(Number)));
// Walking between two tiles: in whole pixels, a little further on each animation tick.
function moveWalkers(now) {
  for (const wk of WALKERS) {
    if (!wk.move) continue;
    const { from, to, t0, ms, fade } = wk.move, t = Math.min(1, (now - t0) / (ms || wk.stepMs || 500)), xy = from.map((a, i) => Math.round(a + (to[i] - a) * t));
    if (xy[0] !== wk.xy[0] || xy[1] !== wk.xy[1]) { wk.xy = xy; wk.el.style.transform = `translate(${xy[0]}px,${xy[1]}px)`; }
    if (fade) wk.el.style.opacity = fade[0] + (fade[1] - fade[0]) * Math.max(0, t);
    else if (wk.el.style.opacity) wk.el.style.opacity = ""; // (a fade cut short by a step: fully there again)
    if (t === 1) wk.move = null;
  }
}
WALKERS.forEach((wk) => (STATES.get(wk.el).wk = wk));
WALKERS.filter((wk) => wk.party).forEach((wk) => { const all = WALKERS.filter((o) => o.party === wk.party); if (all[0] === wk) wk.followers = all.slice(1); else wk.follower = true; });
const posOf = (st) => (st.wk ? [st.wk.tile[0] + 0.5, st.wk.tile[1] + 0.5] : st.pos);
// (a party's leader may step onto the tile of whoever walks right behind: they swap, see followOn)
const takenBy = (wk, [x, y]) => WALKERS.some((o) => o !== wk && o !== wk.followers?.[0] && o.level === wk.level && o.tile[0] === x && o.tile[1] === y);
const anyoneOn = (wk, [x, y]) => WALKERS.some((o) => o !== wk && o.level === wk.level && o.tile[0] === x && o.tile[1] === y);
function setDepth(el, d) {
  const holder = el.parentElement, things = holder.parentElement;
  holder.dataset.depth = d;
  const next = [...things.children].find((c) => c !== holder && +c.dataset.depth > d);
  if (holder.nextElementSibling !== next) things.insertBefore(holder, next || null);
}
// Face a way ("front", "frontL", "back", "backR"; see person()); animals only mirror.
function turn(st, face) {
  if (st.human) { st.view = faceBack(face) ? "back" : "front"; st.mirror = faceMirror(face); }
  st.face.setAttribute("transform", faceMirror(face) ? `translate(${+st.el.dataset.w} 0) scale(-1 1)` : "");
}
const faceTo = (wk, face) => turn(STATES.get(wk.el), face);
const headingFace = ([hx, hy], human) => (human ? (hx > 0 ? "front" : hy > 0 ? "frontL" : hx < 0 ? "back" : "backR") : hx - hy < 0 ? "frontL" : "front");
// One step to a neighbouring tile (moving between the indoor and outdoor layers at a doorway), then done().
function stepTo(wk, [nx, ny], done) {
  const st = STATES.get(wk.el), [x, y] = wk.tile;
  wk.heading = [nx - x, ny - y];
  wk.tile = [nx, ny]; // claim the tile now so nobody else steps onto it
  if (wk.followers) followOn(wk, [x, y]); // the rest of the party: each into the tile the one ahead just left
  const d = nx + ny + 1, forward = d > x + y + 1, group = scene.querySelector(roomAt(wk.level, nx, ny).outdoor ? "#things-out" : `#things-${wk.level}`);
  if (wk.el.parentElement.parentElement !== group) { group.appendChild(wk.el.parentElement); setDepth(wk.el, d); }
  else if (forward) setDepth(wk.el, d); // stepping toward the viewer: draw in front before moving
  const [px, py] = at(nx + 0.5, ny + 0.5, +wk.el.dataset.w, +wk.el.dataset.h), ms = wk.stepMs || 500;
  faceTo(wk, headingFace(wk.heading, st.human));
  if (!st.walking) { st.walking = true; st.walkT0 = performance.now(); }
  wk.stepping = true;
  wk.move = { from: wk.xy, to: [px, py], t0: performance.now() }; // carried out by the animator (below)
  setTimeout(() => {
    if (!forward) setDepth(wk.el, d);
    wk.stepping = false;
    done();
    if (!wk.stepping) st.walking = false; // stopped here (not straight on to the next tile)
  }, ms);
}
// Shortest path over free tiles (ignoring the other walkers, who are waited for), as a list of tiles after the start.
function pathTo(wk, goal, avoid = false) {
  const key = ([x, y]) => `${x},${y}`, prev = new Map([[key(wk.tile), null]]), queue = [wk.tile];
  while (queue.length) {
    const t = queue.shift();
    if (key(t) === key(goal)) break;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = [t[0] + dx, t[1] + dy]; if (!prev.has(key(n)) && walkable(wk, t, n) && !(avoid && takenBy(wk, n))) { prev.set(key(n), t); queue.push(n); } }
  }
  if (!prev.has(key(goal))) return null;
  const path = [];
  for (let t = goal; key(t) !== key(wk.tile); t = prev.get(key(t))) path.unshift(t);
  return path;
}
function walkPath(wk, goal, done) {
  let waits = 0; // someone in the way: wait for them a little, then give up on this trip
  (function next() {
    if (wk.tile[0] === goal[0] && wk.tile[1] === goal[1]) return done();
    const path = pathTo(wk, goal);
    if (!path) return done();
    if (takenBy(wk, path[0])) return ++waits > 6 ? done() : setTimeout(next, 600);
    stepTo(wk, path[0], next);
  })();
}
// Wanderers: a free spot two to six steps away, walked to without stopping; then a pause.
function wander(wk) {
  const key = ([x, y]) => `${x},${y}`, dist = new Map([[key(wk.tile), 0]]), queue = [wk.tile], spots = [];
  while (queue.length) {
    const t = queue.shift(), dd = dist.get(key(t));
    if (dd >= 2 && !STATIONS.has(`${wk.level}:${t}`)) spots.push(t);
    if (dd === 6) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = [t[0] + dx, t[1] + dy]; if (!dist.has(key(n)) && walkable(wk, t, n) && !takenBy(wk, n)) { dist.set(key(n), dd + 1); queue.push(n); } }
  }
  if (!spots.length) { // boxed in: a step to any free tile next to us, and look again
    const free = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [wk.tile[0] + dx, wk.tile[1] + dy]).filter((n) => walkable(wk, wk.tile, n) && !takenBy(wk, n));
    return free.length ? stepTo(wk, pick(free), () => setTimeout(() => wander(wk), 800)) : setTimeout(() => wander(wk), 1500);
  }
  walkPath(wk, pick(spots), () => {
    if (Math.random() < 0.2) say(wk.el, pick(npcOf(wk.el).lines));
    setTimeout(() => wander(wk), 1500 + Math.random() * 3500);
  });
}
// Route walkers: at a station, face it and do the task; after a while, walk to the next one.
function arrive(wk) {
  const st = STATES.get(wk.el), stop = wk.route.stops[wk.stopAt];
  faceTo(wk, stop.face);
  st.idle = stop.poses.map(parsePose);
  st.idleI = 0;
  st.idleNext = performance.now() + st.idle[0].ms;
}
function route(wk) {
  arrive(wk);
  setTimeout(() => {
    wk.stopAt = (wk.stopAt + 1) % wk.route.stops.length;
    walkPath(wk, wk.route.stops[wk.stopAt].tile, () => route(wk));
  }, wk.route.stops[wk.stopAt].wait * (0.8 + Math.random() * 0.4));
}
// ---------- the café's customers come and go. Each one turns up at the curb (stepping in from the edge of the picture),
// joins the back of the line, moves up as the line does, goes in to order at the counter (the barista answers), sits
// down somewhere free to read, work on a laptop, scroll their phone or just have their coffee, and after a while
// leaves: out of the door, off the curb and out of the picture, to turn up again a little later as someone new. Now and
// then someone only walks past, or finds the line too long and goes away again.
const same = (a, b) => a[0] === b[0] && a[1] === b[1];
const cafeLine = [], seatOf = new Map(); // the line, front first; who sits on each seat (seat index → customer)
const CAFE_LOG = []; // what happened, in order ("join q5", "order q1", "sit q1", "leave q1", "turnup q5"), for the tests
let atCounter = null;
const doIdle = (wk, poses) => { const st = STATES.get(wk.el); st.idle = poses.map(parsePose); st.idleI = 0; st.idleNext = performance.now() + st.idle[0].ms; };
const spotXY = (wk, [x, y], dy = 0) => { const [px, py] = at(x, y, +wk.el.dataset.w, +wk.el.dataset.h); return [px, py + dy]; };
const seated = (wk) => [...seatOf.values()].includes(wk);
// Walk to a tile, waiting for (or going round) anyone in the way; a newer trip calls this one off. Kept waiting (in the
// doorway, say, by someone waiting for us), step aside to a free tile next to us and try again.
function goTo(wk, goal, done, besideOk = false) {
  const trip = ++wk.trip;
  let waits = 0;
  (function next() {
    if (trip !== wk.trip) return;
    wk.going = goal; // (where to: for anyone looking into a hold-up)
    if (same(wk.tile, goal)) { wk.going = null; return done(); }
    let path = pathTo(wk, goal);
    if (path && takenBy(wk, path[0])) path = pathTo(wk, goal, true) || path;
    if (!path || takenBy(wk, path[0])) {
      // a party (who can't all step aside) has the right of way: anyone else in its way makes room at once. A party's
      // leader kept waiting long makes do: next to a stop someone stands on is near enough; otherwise they step aside too.
      const party = path && WALKERS.find((o) => o.party && same(o.tile, path[0]));
      waits++;
      if (wk.followers && path && same(path[0], goal) && waits > 12 && !CAFE.edges.some((e) => e.tiles.some((t) => same(t, goal)))) return done();
      if (besideOk && path && same(path[0], goal) && waits > 2) return done(); // (out of the picture from beside the edge, then)
      if (same(goal, CAFE.counter) && path && same(path[0], goal) && waits > 6) return done(); // (order from beside it, then)
      if (wk.followers ? waits > 20 : waits > (party ? 1 : 4)) {
        const aside = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [wk.tile[0] + dx, wk.tile[1] + dy])
          .filter((n) => walkable(wk, wk.tile, n) && !takenBy(wk, n) && !(path && same(n, path[0])));
        if (aside.length) { waits = 0; return stepTo(wk, pick(aside), () => setTimeout(next, 300 + Math.random() * 600)); }
      }
      return setTimeout(next, 500);
    }
    waits = 0;
    stepTo(wk, path[0], next);
  })();
}
// A short walk off the tile grid (onto a seat, off the curb), fading in or out if asked.
function slide(wk, to, ms, done, fade) {
  const st = STATES.get(wk.el), now = performance.now();
  st.walking = true; st.walkT0 = now;
  wk.move = { from: wk.xy, to, t0: now, ms, fade };
  setTimeout(() => { st.walking = false; done(); }, ms);
}
function toPlaceInLine(wk) {
  const i = cafeLine.indexOf(wk);
  goTo(wk, CAFE.queue[i], () => {
    faceTo(wk, "back"); // facing the door
    doIdle(wk, pick([["stand:4000", "shift:2500"], ["phone:6000", "stand:2000"], ["stand:3000", "phone:5000"]]));
    if (i === 0) nextOrder();
  });
}
function nextOrder() {
  const wk = cafeLine[0];
  if (atCounter || !wk || !same(wk.tile, CAFE.queue[0])) return;
  atCounter = wk;
  setTimeout(() => {
    cafeLine.shift();
    cafeLine.forEach(toPlaceInLine); // everyone moves up
    goTo(wk, CAFE.counter, () => {
      faceTo(wk, "backR");
      doIdle(wk, ["stand:900", "talk1", "talk2", "stand:1500"]);
      say(wk.el, pick(CONTENT.cafe.order)); CAFE_LOG.push(`order ${wk.look}`);
      const barista = WALKERS.find((w) => w.look === "barista").el;
      setTimeout(() => say(barista, pick(CONTENT.cafe.serve)), 1600);
      setTimeout(() => { atCounter = null; nextOrder(); sitDown(wk); }, 4200);
    });
  }, 1500 + Math.random() * 2000);
}
const hasExtra = (wk, x) => (AVATAR_LOOKS[wk.look]?.extras || []).includes(x);
const showLaptop = (on) => (scene.querySelector(".cafe-laptop").style.visibility = on ? "" : "hidden");
function sitDown(wk) {
  const free = CAFE.seats.map((s, i) => i).filter((i) => !seatOf.has(i) && (!CAFE.seats[i].needs || hasExtra(wk, CAFE.seats[i].needs)));
  if (!free.length) { say(wk.el, pick(CONTENT.cafe.takeaway)); return leave(wk); }
  const mine = free.filter((i) => CAFE.seats[i].needs), i = mine.length && Math.random() < 0.7 ? mine[0] : pick(free), seat = CAFE.seats[i]; // (a backpack: the laptop seat if it's free)
  seatOf.set(i, wk);
  goTo(wk, seat.tile, () => {
    faceTo(wk, seat.face);
    setDepth(wk.el, seat.depth);
    slide(wk, spotXY(wk, seat.at, seat.dy), 800, () => {
      CAFE_LOG.push(`sit ${wk.look}`);
      if (seat.does.includes("laptop")) { doIdle(wk, ["sitReach:1300", ...SIT_DO.laptop]); setTimeout(() => showLaptop(true), 1100); return; } // out of the backpack
      doIdle(wk, SIT_DO[hasExtra(wk, "book") && seat.does.includes("read") ? "read" : pick(seat.does)]);
    });
    setTimeout(() => standUp(wk, i), 30000 + Math.random() * 30000);
  });
}
function standUp(wk, i) {
  const seat = CAFE.seats[i], packUp = seat.does.includes("laptop");
  if (packUp) { doIdle(wk, ["sitReach:1300"]); setTimeout(() => showLaptop(false), 700); } // the laptop back in the backpack first
  setTimeout(() => slide(wk, spotXY(wk, [seat.tile[0] + 0.5, seat.tile[1] + 0.5]), 700, () => { setDepth(wk.el, seat.tile[0] + seat.tile[1] + 1); seatOf.delete(i); leave(wk); }), packUp ? 1300 : 0);
}
// Into the picture at one of its edges (once the way in is clear), fading in as they step onto the sidewalk ...
function appearAt(wk, edge, then, wanted = () => true, only = null) {
  if (!wanted()) return; // (no longer: the rest of the party has gone)
  const tile = (only ? [only] : edge.tiles).find((t) => !WALKERS.some((o) => o !== wk && same(o.tile, t)));
  if (!tile || (edge === CAFE.edges[0] && WALKERS.some((o) => o !== wk && same(o.tile, CAFE.door)))) return setTimeout(() => appearAt(wk, edge, then, wanted, only), 1000);
  const out = scene.querySelector("#things-out");
  if (wk.el.parentElement.parentElement !== out) out.appendChild(wk.el.parentElement);
  setDepth(wk.el, tile[0] + tile[1] + 1);
  wk.tile = tile.slice(); wk.off = false; wk.edgeIn = edge; wk.edgeTile = tile;
  wk.xy = spotXY(wk, edge.out(tile));
  wk.el.style.opacity = 0; wk.el.style.visibility = "";
  faceTo(wk, edge.inFace);
  slide(wk, spotXY(wk, [tile[0] + 0.5, tile[1] + 0.5]), wk.stepMs ? wk.stepMs * 1.6 : 900, then, [0, 1]);
}
// ... and out of it again, fading away beyond the edge.
function vanish(wk, edge, then) {
  faceTo(wk, edge.outFace);
  slide(wk, spotXY(wk, edge.out(wk.tile)), wk.stepMs ? wk.stepMs * 1.6 : 900, () => {
    wk.off = true; wk.el.style.visibility = "hidden"; wk.tile = [-10 - WALKERS.indexOf(wk), -10];
    then();
  }, [1, 0]);
}
const otherEdge = (edge) => CAFE.edges.find((e) => e !== edge);
// to the nearest free tile of an edge (out of the picture from beside it, if someone stands on it too long)
function toEdge(wk, edge, then) {
  const d = (t) => Math.abs(t[0] - wk.tile[0]) + Math.abs(t[1] - wk.tile[1]) + (WALKERS.some((o) => o !== wk && same(o.tile, t)) ? 3 : 0);
  goTo(wk, [...edge.tiles].sort((a, b) => d(a) - d(b))[0], then, true);
}
// a café customer leaves: out of the door, to either end of the sidewalk, and out of the picture; back a while later
function leave(wk) {
  doIdle(wk, ["stand"]);
  const edge = pick(CAFE.edges);
  toEdge(wk, edge, () => vanish(wk, edge, () => { CAFE_LOG.push(`leave ${wk.look}`); setTimeout(() => turnUp(wk), 4000 + Math.random() * 10000); }));
}
function turnUp(wk) {
  appearAt(wk, pick(CAFE.edges), () => {
    CAFE_LOG.push(`turnup ${wk.look}`);
    if (cafeLine.length < CAFE.queue.length && Math.random() < 0.85) { cafeLine.push(wk); toPlaceInLine(wk); CAFE_LOG.push(`join ${wk.look}`); }
    else passBy(wk);
  });
}
// a passer-by: past the café (saying so if the line was too long to join) and out at the other end
function passBy(wk) {
  const full = cafeLine.length >= CAFE.queue.length, edge = otherEdge(wk.edgeIn);
  goTo(wk, CAFE.window, () => {
    faceTo(wk, "backR"); doIdle(wk, ["stand:1500"]);
    if (full) say(wk.el, pick(CONTENT.cafe.tooLong));
    setTimeout(() => toEdge(wk, edge, () => vanish(wk, edge, () => { CAFE_LOG.push(`leave ${wk.look}`); setTimeout(() => turnUp(wk), 4000 + Math.random() * 10000); })), 1800);
  });
}
// People out for a stroll: from one end of the sidewalk to the other, stopping to look in at the café, the others in
// the party (the child, the little dog) following, each into the tile the one ahead just left.
const adjacent = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) === 1;
function followOn(leader, target) {
  for (const f of leader.followers) {
    const was = f.tile;
    if (f.off) { // still out of sight: step in at the edge once the one ahead has moved on from it
      if (!f.entering && same(target, leader.edgeTile)) {
        f.entering = true; f.edgeIn = leader.edgeIn;
        appearAt(f, leader.edgeIn, () => { f.entering = false; }, () => !leader.off || ((f.entering = false), false), leader.edgeTile);
        CAFE_LOG.push(`follow ${f.look}`);
      }
      return;
    }
    if (!same(f.tile, target)) {
      const path = adjacent(f.tile, target) ? [target] : pathTo(f, target, true);
      if (path?.length && !anyoneOn(f, path[0])) stepTo(f, path[0], () => {});
    }
    target = was;
  }
}
function stroll(leader) {
  if (WALKERS.some((o) => o.party && o.party !== leader.party && !o.off)) return setTimeout(() => stroll(leader), 5000); // (one party out at a time)
  const edge = pick(CAFE.edges), to = otherEdge(edge), party = [leader, ...leader.followers];
  appearAt(leader, edge, () => {
    CAFE_LOG.push(`stroll ${leader.look}`);
    goTo(leader, CAFE.lookIn, () => {
      faceTo(leader, "backR"); doIdle(leader, ["stand:2600"]);
      if (Math.random() < 0.7) { const who = pick(party).el; say(who, pick(npcOf(who).lines)); }
      setTimeout(() => toEdge(leader, to, () => {
        // out at the far end, one after the other
        let k = 0;
        (function next() {
          if (k === party.length) return setTimeout(() => stroll(leader), 10000 + Math.random() * 15000);
          const m = party[k++];
          if (m.off) return next();
          toEdge(m, to, () => vanish(m, to, next));
        })();
      }), 2800);
    });
  });
}
// to begin with: four in line, two seated (one at the laptop), two out of sight; everyone out for a stroll out of sight
const PATRONS = WALKERS.filter((wk) => wk.patron), STROLLERS = WALKERS.filter((wk) => wk.followers);
const hide = (wk) => { wk.off = true; wk.el.style.visibility = "hidden"; wk.el.style.opacity = 0; };
PATRONS.forEach((wk, k) => {
  if (k < 4) { cafeLine.push(wk); faceTo(wk, "back"); doIdle(wk, k % 2 ? ["phone:6000", "stand:2000"] : ["stand:4000", "shift:2500"]); }
  else if (k < 6) hide(wk);
  else { const seat = CAFE.seats[k - 6]; seatOf.set(k - 6, wk); faceTo(wk, seat.face); doIdle(wk, SIT_DO[seat.does[0]]); if (seat.needs) showLaptop(true); }
});
WALKERS.filter((wk) => wk.party).forEach(hide);

// Now and then someone standing or sitting still turns their head to look the other way for a moment.
const glancers = [...STATES.values()].filter((st) => st.human && st.cfg.glance);
function glance() {
  const st = pick(glancers), now = performance.now();
  if (now > st.lookUntil && now > st.talkUntil) { st.lookUntil = now + 1400 + Math.random() * 2200; st.lookRight = !bodyRight(st); }
  setTimeout(glance, 700 + Math.random() * 1500);
}

WALKERS.filter((wk) => wk.route).forEach(arrive);
// draw everyone's frames, walkers first, one person at a time so the page stays responsive
(async () => {
  for (const st of [...STATES.values()].filter((s) => s.human).sort((a, b) => !!b.cfg.walker - !!a.cfg.walker)) { await upgrade(st); await new Promise((r) => setTimeout(r, 0)); }
})();
if (!reduceMotion) {
  // One clock for everything that moves: 16 ticks a second, like the walk cycle. Every change makes the browser repaint
  // the scene, so changes are batched onto the ticks, the CSS animations (fire, steam, screens...) too: they are paused
  // and moved on by hand at each tick. Nothing moves while the cabin is off screen.
  let lastTick = 0;
  const started = new WeakMap(); // animation → when it would have started
  new IntersectionObserver(([e]) => (onScreen = e.isIntersecting)).observe(scene);
  // (the clock is performance.now(), which gestures and steps also start from: the frame's own timestamp can lag it,
  // and a gesture that started "after" the frame would look up a frame before its first)
  (function tick() {
    const now = performance.now();
    if (onScreen && now - lastTick >= 60) {
      lastTick = now;
      STATES.forEach((st) => draw(st, now));
      moveWalkers(now);
      for (const a of scene.getAnimations({ subtree: true })) {
        if (!started.has(a)) { started.set(a, now - (a.currentTime || 0)); a.pause(); }
        a.currentTime = now - started.get(a);
      }
    }
    requestAnimationFrame(tick);
  })();
  WALKERS.filter((wk) => !wk.patron && !wk.party).forEach((wk, i) => setTimeout(() => (wk.route ? route(wk) : wander(wk)), 1200 + i * 500));
  PATRONS.forEach((wk, k) => setTimeout(() => (k < 4 ? k === 0 && nextOrder() : k < 6 ? turnUp(wk) : standUp(wk, k - 6)), k < 4 ? 2000 : k < 6 ? 3000 + (k - 4) * 6000 : 8000 + (k - 6) * 9000 + Math.random() * 4000));
  STROLLERS.forEach((wk, k) => setTimeout(() => stroll(wk), 4000 + k * 9000));
  // Failsafe: anyone out walking (a customer, a party) who hasn't got anywhere in 20 s, in a jam nobody could solve, fades
  // away where they stand and comes back later as someone new. ponytail: blunt; a real fix would reserve paths ahead.
  const lastMove = new Map();
  setInterval(() => {
    const now = performance.now();
    for (const wk of WALKERS.filter((w) => (w.patron || w.followers) && !w.off)) {
      const k = String(wk.tile), m = lastMove.get(wk);
      if (!m || m.k !== k) { lastMove.set(wk, { k, t: now }); continue; }
      if (now - m.t < 20000 || !wk.going || seated(wk) || cafeLine.includes(wk)) continue;
      lastMove.delete(wk);
      if (atCounter === wk) { atCounter = null; setTimeout(nextOrder, 1000); } // (the next in line goes in instead)
      (wk.followers ? [wk, ...wk.followers] : [wk]).filter((o) => !o.off).forEach((o) => {
        o.trip++; o.going = null;
        slide(o, o.xy, 900, () => { o.off = true; o.el.style.visibility = "hidden"; o.tile = [-10 - WALKERS.indexOf(o), -10]; }, [1, 0]);
      });
      CAFE_LOG.push(`gaveup ${wk.look}`);
      setTimeout(() => (wk.followers ? stroll(wk) : turnUp(wk)), 12000);
    }
  }, 3000);
  setTimeout(glance, 2000);
  STATES.forEach((st) => ROUTINES[st.look] && setTimeout(() => routine(st), 4000)); // (after the greeting)
  (function chatter() { setTimeout(() => { randomChat(); chatter(); }, 2500 + Math.random() * 2500); })();
}
// On phones the building scrolls sideways; start in the middle.
room.parentElement.scrollLeft = (room.parentElement.scrollWidth - room.parentElement.clientWidth) / 2;
setTimeout(() => { const jen = people.find((el) => el.dataset.look === "jen"); act(jen); say(jen, CONTENT.npcs.jen.click[0]); }, 700);
