// Habbo-style avatars drawn pixel by pixel at Habbo's in-room size: 34×64 px (about one floor tile tall),
// three-quarter view facing down-right, 1px black outline on every part, colour ramps lit from the top left.
// Body shapes are laid out on a 44×86 design grid and sampled at K = 64/86; the face is placed pixel by pixel.
// A look is { skin, hair: [style, colour], top: [style, colour], bottom: [style, colour], shoes, extras: [...] }.
const AW = 34, AH = 64, K = 64 / 86, OUTLINE = "#111111";

// ---------- colour ramps: [highlight, base, shadow, deep] from one base colour
function hexToHsl(hex) {
  const n = parseInt(hex.slice(1), 16), r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return [0, 0, l * 100];
  const d = max - min, s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s * 100, l * 100];
}
const hsl = (h, s, l) => `hsl(${h.toFixed(1)} ${Math.max(0, Math.min(100, s)).toFixed(1)}% ${Math.max(0, Math.min(100, l)).toFixed(1)}%)`;
function ramp(hex) {
  const [h, s, l] = hexToHsl(hex);
  return [hsl(h, s - 4, l + 13), hsl(h, s, l), hsl(h + 4, s + 6, l - 12), hsl(h + 8, s + 10, l - 24)];
}
const skinRamp = (hex) => { const [h, s, l] = hexToHsl(hex); return [hsl(h, s, l + 6), hsl(h, s, l), hsl(h - 2, s - 6, l - 9), hsl(h - 2, s - 4, l - 18)]; };

// ---------- tiny rasteriser: shapes are pixel tests, parts are shapes painted with a shading function.
// Each shape carries a conservative bounding box `b` = [x0, y0, x1, y1] (design coordinates) so a part only scans that area.
const bounded = (f, b) => Object.assign(f, { b });
const ellipse = (cx, cy, rx, ry) => bounded((x, y) => ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1, [cx - rx - 1, cy - ry - 1, cx + rx, cy + ry]);
const rectS = (x0, y0, x1, y1) => bounded((x, y) => x >= x0 && x < x1 && y >= y0 && y < y1, [x0 - 1, y0 - 1, x1, y1]);
function polyS(pts) {
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  return bounded((x, y) => {
    let inside = false;
    const px = x + 0.5, py = y + 0.5;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }, [Math.min(...xs) - 1, Math.min(...ys) - 1, Math.max(...xs), Math.max(...ys)]);
}
const union = (...s) => bounded((x, y) => s.some((f) => f(x, y)), s.every((f) => f.b) ? [0, 1, 2, 3].map((i) => (i < 2 ? Math.min : Math.max)(...s.map((f) => f.b[i]))) : undefined);
const minus = (a, b) => bounded((x, y) => a(x, y) && !b(x, y), a.b);
const dither = (x, y) => (x + y) % 2 === 0;

// Three clean bands across a part (lit left, base, shaded right) and a darker bottom edge.
const bands = (r, x0, x1, yBottom = Infinity, split = [0.25, 0.75]) => (x, y) => {
  const t = (x + 0.5 - x0) / (x1 - x0);
  const k = t < split[0] ? 0 : t < split[1] ? 1 : 2;
  return r[y >= yBottom ? Math.min(3, k + 1) : k];
};
// Ball shading for heads: mostly the base tone, light at the top left, a shaded rim at the bottom right.
const sphere = (r, cx, cy, rx, ry) => (x, y) => {
  const d = ((x + 0.5 - cx) / rx) * 0.6 + ((y + 0.5 - cy) / ry) * 0.8;
  return r[d < -0.62 ? 0 : d < 0.8 ? 1 : d < 0.95 ? 2 : 3];
};
// Hair: sphere shading plus a light streak across the top and a few darker strands.
const hairShade = (r, cx, cy, rx, ry, long) => (x, y) => {
  const base = sphere(r, cx, cy, rx, ry)(x, y);
  const u = (x - cx) / rx, v = (y - cy) / ry;
  if (Math.abs(v + 0.55 - u * 0.25) < 0.1 && u < 0.5) return r[0];                     // highlight streak
  if (long && y > cy + 4 && (x % 4 === 1)) return r[Math.min(3, r.indexOf(base) + 1)];  // strands falling down
  if (!long && v > 0.15 && (x - Math.round(y * 0.5)) % 5 === 0) return r[Math.min(3, r.indexOf(base) + 1)]; // a few strands at the ends
  return base;
};

// A pixel canvas W×Ht. Shapes and shades are evaluated on a design grid scaled by k (k = 1: design = output pixels).
function makeCanvas(W = AW, Ht = AH, k = K) {
  const AW = W, AH = Ht, K = k;
  const px = new Array(AW * AH).fill(null);
  const inb = (x, y) => x >= 0 && y >= 0 && x < AW && y < AH;
  const d = (v) => (v + 0.5) / K - 0.5; // output pixel → design-grid coordinate
  return {
    px,
    get: (x, y) => (inb(x, y) ? px[y * AW + x] : null),
    set:(x, y, c) => { if (inb(x, y)) px[y * AW + x] = c; },            // output pixels (the face)
    setD: (x, y, c) => { const X = Math.floor((x + 0.5) * K), Y = Math.floor((y + 0.5) * K); if (inb(X, Y)) px[Y * AW + X] = c; }, // design grid
    // Paint a part (shape and shade work in design coordinates): edge pixels get the outline, the inside gets shade.
    // The shape is tested once per pixel (plus a 1px border) and edges are read from that mask.
    part(shape, shade, outline = OUTLINE) {
      // pixel range to scan: the shape's box in output pixels (clamped to the canvas), plus a 1px border for the mask
      const [X0, Y0, X1, Y1] = shape.b ? [Math.max(0, Math.floor(shape.b[0] * K) - 1), Math.max(0, Math.floor(shape.b[1] * K) - 1), Math.min(AW, Math.ceil((shape.b[2] + 1) * K) + 1), Math.min(AH, Math.ceil((shape.b[3] + 1) * K) + 1)] : [0, 0, AW, AH];
      const MW = X1 - X0 + 2, mask = new Uint8Array(MW * (Y1 - Y0 + 2)), at = (x, y) => (y - Y0 + 1) * MW + x - X0 + 1;
      for (let y = Y0 - 1; y <= Y1; y++) for (let x = X0 - 1; x <= X1; x++) mask[at(x, y)] = shape(d(x), d(y)) ? 1 : 0;
      for (let y = Y0; y < Y1; y++) for (let x = X0; x < X1; x++) {
        const k = at(x, y);
        if (!mask[k]) continue;
        const edge = !mask[k - 1] || !mask[k + 1] || !mask[k - MW] || !mask[k + MW];
        px[y * AW + x] = edge && outline ? (typeof outline === "function" ? outline(d(x), d(y)) : outline) : shade(d(x), d(y));
      }
    },
  };
}

// ---------- body geometry for each pose (three-quarter view facing down-right), on the 44×86 design grid.
// Arms run shoulder → elbow → hand and legs hip → knee → ankle; feet are [x0, y0, x1, y1] boxes; `seat` is for sitting;
// `bob` lifts the whole figure a pixel (walking); `phone` / `cupNear` put a phone or the cup in the near hand.
const posed = (o) => ({ armL: [[14, 42], [13, 52], [12, 62]], armR: [[30, 41], [32, 50], [33, 60]], legL: [[18, 62], [18, 70], [18, 78]], legR: [[26, 62], [26.5, 70], [27, 77]], footL: [16, 78, 25, 84], footR: [25, 76, 33, 82], ...o });
const SIT = { seat: true, armL: [[14, 42], [16, 51], [17, 60]], armR: [[30, 41], [32, 50], [33, 58]], legL: [[18, 62], [33, 64], [34, 76]], legR: [[25, 61], [38, 62], [39, 73]], footL: [31, 76, 40, 81], footR: [36, 72, 44, 77] };
const POSES = {
  stand: posed({}),
  shift: posed({ armL: [[14, 42], [14, 52], [15, 61]], armR: [[30, 41], [31, 51], [31, 59]], legL: [[18, 62], [17, 70], [16, 78]], footL: [14, 78, 23, 84], legR: [[26, 62], [27, 70], [28, 77]], footR: [26, 76, 34, 82] }),
  phone: posed({ armL: [[14, 42], [15, 52], [21, 48]], phone: true }),
  reach: posed({ armL: [[14, 42], [19, 50], [26, 53]] }),
  think: posed({ armL: [[14, 42], [17, 51], [21, 41]] }),
  wave1: posed({ armL: [[14, 42], [5, 35], [2, 24]] }),
  wave2: posed({ armL: [[14, 42], [5, 34], [6, 22]] }),
  walkA: posed({ armL: [[14, 42], [11, 51], [9, 58]], armR: [[30, 41], [33, 49], [36, 56]], legL: [[18, 62], [20, 70], [22, 78]], legR: [[26, 62], [25, 69], [23, 76]], footL: [20, 78, 29, 84], footR: [19, 74, 27, 80] }),
  passA: posed({ armL: [[14, 42], [13, 52], [13, 61]], armR: [[30, 41], [31, 50], [32, 59]], legR: [[26, 62], [28, 68], [26, 74]], footR: [23, 72, 31, 78], bob: 1 }),
  walkB: posed({ armL: [[14, 42], [16, 51], [19, 58]], armR: [[30, 41], [29, 50], [27, 57]], legL: [[18, 62], [16, 70], [14, 77]], legR: [[26, 62], [29, 70], [31, 77]], footL: [11, 76, 20, 82], footR: [28, 76, 37, 82] }),
  passB: posed({ armL: [[14, 42], [13, 52], [13, 61]], armR: [[30, 41], [31, 50], [32, 59]], legL: [[18, 62], [21, 68], [19, 74]], footL: [17, 73, 26, 79], bob: 1 }),
  armsUp: posed({ armL: [[14, 42], [9, 22], [10, 8]], armR: [[30, 41], [35, 22], [34, 8]] }),
  // at a keyboard (two frames, hands taking turns), talking with the hands, sipping from the cup
  typeA: posed({ armL: [[14, 42], [17, 50], [23, 51]], armR: [[30, 41], [33, 49], [37, 50]] }),
  typeB: posed({ armL: [[14, 42], [17, 49], [22, 48.5]], armR: [[30, 41], [33, 50], [36, 52.5]] }),
  talk1: posed({ armL: [[14, 42], [18, 50], [25, 47]] }),
  talk2: posed({ armL: [[14, 42], [17, 48], [22, 42]], armR: [[30, 41], [34, 48], [38, 46]] }),
  drink: posed({ armL: [[14, 42], [17, 50], [21, 39]], cupNear: true }),
  danceL: posed({ armL: [[14, 42], [6, 34], [2, 26]], armR: [[30, 41], [24, 30], [17, 22]], legL: [[18, 62], [15, 70], [13, 78]], footL: [10, 78, 19, 84], legR: [[26, 62], [28, 70], [30, 77]], footR: [28, 76, 36, 82] }),
  danceMix: posed({ armL: [[14, 42], [8, 32], [6, 20]], armR: [[30, 41], [36, 47], [40, 53]], legL: [[18, 62], [21, 69], [19, 77]], footL: [17, 77, 26, 83] }),
  danceR: posed({ armL: [[14, 42], [19, 47], [27, 44]], armR: [[30, 41], [38, 32], [41, 21]], legL: [[18, 62], [21, 70], [23, 78]], footL: [21, 78, 30, 84], legR: [[26, 62], [26, 70], [25, 77]], footR: [23, 76, 31, 82] }),
  pSet: posed({ armL: [[14, 42], [15, 51], [21, 48]], armR: [[30, 41], [30, 50], [24, 48]] }),
  pLift: posed({ armL: [[14, 42], [16, 49], [22, 45]], armR: [[30, 41], [29, 48], [24, 45]], legL: [[18, 62], [26, 66], [22, 74]], footL: [18, 72, 27, 77] }),
  pCock: posed({ armL: [[14, 42], [20, 44], [27, 46]], armR: [[30, 41], [36, 35], [38, 26]], legL: [[18, 62], [23, 69], [27, 77]], footL: [25, 76, 34, 82], legR: [[26, 62], [22, 70], [17, 77]], footR: [13, 76, 21, 82] }),
  pRelease: posed({ armL: [[14, 42], [12, 50], [14, 56]], armR: [[30, 41], [27, 50], [20, 58]], legL: [[18, 62], [23, 69], [27, 77]], footL: [25, 76, 34, 82], legR: [[26, 62], [23, 69], [20, 75]], footR: [16, 73, 24, 79] }),
  sit: { ...SIT },
  sitDrink: { ...SIT, armL: [[14, 42], [17, 50], [21, 38]], cupNear: true },
  sitWave: { ...SIT, armL: [[14, 42], [5, 35], [3, 24]] },
};

// A limb as a thick polyline (pixel test).
function limb(points, w) {
  const segs = points.slice(1).map(([bx, by], i) => { const [ax, ay] = points[i], dx = bx - ax, dy = by - ay; return [ax, ay, dx, dy, dx * dx + dy * dy]; });
  const xs = points.map((p) => p[0]), ys = points.map((p) => p[1]), r = w / 2;
  return bounded((x, y) => {
    const px = x + 0.5, py = y + 0.5;
    for (const [ax, ay, dx, dy, l2] of segs) {
      const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2));
      if (Math.hypot(px - (ax + t * dx), py - (ay + t * dy)) <= r) return true;
    }
    return false;
  }, [Math.min(...xs) - r - 1, Math.min(...ys) - r - 1, Math.max(...xs) + r, Math.max(...ys) + r]);
}

// ---------- hair styles (drawn over the head; the face window stays clear)
const HEAD = { cx: 22, cy: 22, rx: 12.5, ry: 13.5 };
const faceWindow = ellipse(25.5, 26.5, 9.5, 10.5);
const HAIR = {
  long: () => ({
    back: polyS([[8, 18], [21, 12], [34, 17], [37, 34], [36, 48], [32, 55], [29, 51], [26, 56], [22, 50], [17, 55], [13, 49], [9, 52], [7, 40]]),
    front: minus(union(ellipse(21, 16, 14, 10.5), polyS([[7, 16], [16, 16], [15, 44], [11, 50], [7, 44]]), polyS([[31, 22], [36, 20], [37, 40], [34, 46], [32, 38]])), minus(faceWindow, rectS(0, 0, AW, 20.5))),
  }),
  bob: () => ({ front: minus(union(ellipse(21.5, 17, 14.5, 11), polyS([[7, 17], [36, 17], [37, 36], [33, 38], [31, 30], [12, 30], [9, 38], [6, 34]])), minus(faceWindow, rectS(0, 0, AW, 20))) }),
  spiky: () => ({ front: minus(union(ellipse(21.5, 16, 13.5, 9.5), polyS([[10, 12], [12, 3], [16, 9], [19, 1], [23, 8], [27, 2], [29, 9], [34, 5], [34, 14]]), polyS([[8, 16], [13, 16], [12, 28], [9, 27]])), minus(faceWindow, rectS(0, 0, AW, 19))) }),
  bun: () => ({ front: minus(union(ellipse(21.5, 16.5, 13.5, 10), ellipse(17, 6, 6, 5), polyS([[8, 16], [13, 16], [12, 29], [9, 28]])), minus(faceWindow, rectS(0, 0, AW, 20))) }),
  curly: () => {
    const bumps = [[12, 9], [18, 5], [25, 5], [31, 9], [35, 15], [9, 16], [8, 24], [36, 22], [34, 29], [10, 30]].map(([x, y]) => ellipse(x, y, 5.5, 5.5));
    return { front: minus(union(ellipse(22, 17, 14, 11), ...bumps), minus(faceWindow, rectS(0, 0, AW, 19))) };
  },
  cap: () => ({ front: minus(union(ellipse(21.5, 17, 13, 8), polyS([[8, 17], [12, 17], [12, 28], [9, 27]])), minus(faceWindow, rectS(0, 0, AW, 18))), cap: true }),
  hood: () => ({ front: minus(ellipse(22.5, 24, 16, 17.5), minus(faceWindow, rectS(0, 0, AW, 15))), hood: true }),
};

// ---------- draw one avatar. opts: eyes "open"/"closed", mouth "closed"/"open", back (seen from behind: no face).
// Parts are outlined in a dark shade of their own colour; only the silhouette gets the black outline, as in Habbo.
const mixHex = (a, b, t) => { const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); const [x, y] = [p(a), p(b)]; return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join(""); };
// layer: "all", or one of the three layers a figure is built from, like Habbo's separate body parts: "body" (everything
// under the head), "head" (head, face, hair, hat, glasses; the same in every pose, and free to turn on its own) and "over"
// (a raised arm, or what the near hand holds, in front of the head).
function drawAvatar(look, poseName, { eyes = "open", mouth = "closed", back = false, layer = "all" } = {}) {
  const base = makeCanvas(), pose = POSES[poseName];
  let cur = "body";
  const on = () => layer === "all" || layer === cur;
  const c = { px: base.px, part: (...q) => on() && base.part(...q), set: (...q) => on() && base.set(...q), setD: (...q) => on() && base.setD(...q) };
  const skin = skinRamp(look.skin), hairC = ramp(look.hair[1]), top = ramp(look.top[1]), bottom = ramp(look.bottom[1]), shoe = ramp(look.shoes);
  const hair = HAIR[look.hair[0]](), extras = look.extras || [], kind = look.top[0];
  const longSleeve = ["sweater", "hoodie", "coat", "long"].includes(kind), coat = kind === "coat", hoodie = kind === "hoodie" || look.hair[0] === "hood";
  const hoodC = look.hair[0] === "hood" ? top : hairC;
  const raised = (arm) => arm[2][1] < 40;

  // an arm: sleeve down to its hem (a darker band), then skin, then a hand with a finger line
  const arm = ([s, e, h], near) => {
    const cut = longSleeve ? 1.8 : 0.55, xs = [s[0], e[0], h[0]], x0 = Math.min(...xs) - 4, x1 = Math.max(...xs) + 4;
    const along = (x, y) => {
      const seg = (a, b, off) => { const dx = b[0] - a[0], dy = b[1] - a[1], t = Math.max(0, Math.min(1, ((x + 0.5 - a[0]) * dx + (y + 0.5 - a[1]) * dy) / (dx * dx + dy * dy || 1))); return [Math.hypot(x + 0.5 - a[0] - t * dx, y + 0.5 - a[1] - t * dy), off + t]; };
      const p = seg(s, e, 0), q = seg(e, h, 1);
      return p[0] <= q[0] ? p[1] : q[1];
    };
    const cloth = (x, y) => along(x, y) < cut;
    c.part(union(limb([s, e], near ? 7 : 6.6), limb([e, h], near ? 6.2 : 5.8)), (x, y) => {
      const t = along(x, y);
      if (t < cut) return t > cut - 0.12 || (Math.abs(t - 1) < 0.06 && longSleeve) ? top[2] : bands(top, x0, x1)(x, y);
      return bands(skin, x0, x1)(x, y);
    }, (x, y) => (cloth(x, y) ? top[3] : skin[3]));
    const L = Math.hypot(h[0] - e[0], h[1] - e[1]) || 1, hx = h[0] + ((h[0] - e[0]) / L) * 1.2, hy = h[1] + ((h[1] - e[1]) / L) * 1.2;
    c.part(ellipse(hx, hy, 2.8, 3), bands(skin, hx - 3, hx + 3), skin[3]);
    c.setD(Math.round(hx + 0.5), Math.round(hy + 0.5), skin[2]);
    return [hx, hy];
  };
  const cupAt = ([hx, hy]) => { c.part(rectS(hx - 3, hy - 7, hx + 3, hy + 1), (x, y) => (y < hy - 5 ? "#6f4a2f" : "#fbfbf6"), "#8a8f98"); c.part(rectS(hx - 3, hy - 3, hx + 3, hy - 1), () => "#c8453c", null); };

  if (hair.back) c.part(hair.back, hairShade(hairC, 21, 20, 15, 20, true), hairC[3]);
  if (hoodie) c.part(polyS([[15, 36], [30, 35], [32, 42], [13, 43]]), () => top[2], top[3]);      // the hood lying behind the neck
  // far arm behind the body (a raised one goes behind the head too)
  const farHand = arm(pose.armR, false);
  if (extras.includes("cup") && !pose.cupNear) cupAt(farHand);
  // legs, far one first, with a crease (or a jeans seam) and a knee fold; then shoes with laces and a sole
  const shorts = look.bottom[0] === "shorts", jeans = look.bottom[0] === "jeans";
  for (const leg of [pose.legR, pose.legL]) {
    c.part(limb(leg, 8), (x, y) => (shorts && y > 68 ? bands(skin, 14, 40)(x, y) : bands(bottom, 14, 40, pose.seat ? 70 : 74)(x, y)), (x, y) => (shorts && y > 68 ? skin[3] : bottom[3]));
    for (let t = 0.15; t < 0.95; t += 0.08) {
      const [a, b] = t < 0.5 ? [leg[0], leg[1]] : [leg[1], leg[2]], u = t < 0.5 ? t * 2 : (t - 0.5) * 2;
      c.setD(Math.round(a[0] + (b[0] - a[0]) * u + 1.5), Math.round(a[1] + (b[1] - a[1]) * u), jeans ? bottom[0] : bottom[2]);
    }
    c.setD(Math.round(leg[1][0] + 1), Math.round(leg[1][1]), bottom[2]);
  }
  const sole = look.shoes === "#f4f1ea" ? "#b8b3a8" : "#e8e2d6";
  for (const f of [pose.footR, pose.footL]) {
    c.part(union(rectS(f[0], f[1], f[2] + 1, f[3] + 1), ellipse(f[2] - 1, f[1] + 3.5, 3.5, 3.5)), (x, y) => (y >= f[3] - 1 ? sole : y < f[1] + 1.5 ? shoe[0] : bands(shoe, f[0], f[2])(x, y)), shoe[3]);
    c.setD(f[0] + 3, f[1] + 2, sole); c.setD(f[0] + 5, f[1] + 2, sole);
  }
  // body: folds, then the top's own details
  const torso = polyS([[13, 41], [17, 38], [28, 37], [32, 40], [33, 50], [32, coat ? 72 : 63], [13, coat ? 73 : 64], [12, 50]]);
  c.part(torso, bands(top, 12, 34, coat ? 70 : 61), top[3]);
  [[16, 49], [16, 50], [17, 57], [29, 54], [30, 55], [22, 60]].forEach(([x, y]) => c.setD(x, y, top[2]));
  if (!coat && !hoodie && kind !== "sweater") { c.part(rectS(13, 61.5, 33, 64.5), () => "#3a2a20", "#241810"); c.part(rectS(21, 61.5, 24, 64.5), () => "#d9a441", "#8a6420"); }
  if (kind === "sweater") { for (let y = 44; y < 60; y += 4) for (let x = 15 + (y % 8 ? 2 : 0); x < 31; x += 4) c.setD(x, y, top[2]); for (let x = 13; x < 32; x += 2) for (let y = 60; y < 63; y++) c.setD(x, y, top[2]); }
  if (hoodie) { c.part(rectS(19, 52, 29, 58), () => top[2], top[3]); [[21, 40], [21, 41], [21, 43], [25, 40], [25, 41], [25, 43]].forEach(([x, y]) => c.setD(x, y, top[0])); }
  if (coat) {
    c.part(polyS([[19, 38], [23, 38], [23, 50]]), () => top[0], top[3]); c.part(polyS([[24, 38], [28, 38], [24, 50]]), () => top[1], top[3]);
    for (let y = 50; y < 72; y++) c.setD(24, y, top[3]);
    c.part(rectS(15, 58, 21, 63), () => top[1], top[3]); c.setD(26, 55, top[3]); c.setD(26, 62, top[3]); c.setD(26, 68, top[3]);
  }
  if (kind === "tee") c.part(rectS(26, 45, 30, 49), () => top[1], top[2]);
  if (kind === "jersey") { for (let x = 13; x < 32; x++) c.setD(x, 62, "#c8102e"); for (let y = 41; y < 62; y++) c.setD(24, y, "#b9bec6"); [[27, 46], [28, 46], [28, 47], [27, 48], [28, 49], [27, 50]].forEach(([x, y]) => c.setD(x, y, "#c8102e")); }
  if (extras.includes("apron")) { const ap = ramp("#f4f1ea"); c.part(polyS([[16, 46], [30, 45], [30, 64], [16, 65]]), bands(ap, 16, 30), ap[3]); c.part(limb([[20, 38], [18, 46]], 1.5), () => ap[1], null); c.part(limb([[26, 37], [28, 45]], 1.5), () => ap[1], null); c.part(rectS(19, 54, 27, 59), () => ap[1], ap[3]); }
  if (!coat && !hoodie) { c.part(polyS([[19, 38], [26, 37], [23, 42]]), () => skin[1], skin[2]); if (kind === "long" || kind === "jersey") [[19, 38], [20, 39], [21, 40], [26, 37], [25, 38], [24, 39]].forEach(([x, y]) => c.setD(x, y, top[3])); }
  // near arm in front of the body (a raised one waits until after the head)
  let nearHand = null;
  if (!raised(pose.armL)) nearHand = arm(pose.armL, true);
  if (extras.includes("bag")) { c.part(limb([[15, 41], [29, 55]], 2), () => "#4e5a29", null); c.part(polyS([[22, 53], [32, 52], [33, 59], [23, 60]]), bands(ramp("#6b7a3a"), 22, 33), "#3c4520"); for (let x = 24; x < 32; x++) c.setD(x, 55, "#3c4520"); }
  if (extras.includes("paper")) { c.part(polyS([[18, 46], [31, 45], [31, 58], [18, 59]]), () => "#fbfbf6", "#9aa4b1"); for (const y of [49, 52, 55]) for (let x = 20; x < 29; x++) c.setD(x, y, "#9aa4b1"); }

  // head: neck with the chin's shadow, head, ear
  c.part(rectS(19, 34, 26, 40), (x, y) => (y < 36 || x > 23 ? skin[2] : skin[1]), skin[3]);
  cur = "head";
  c.part(ellipse(HEAD.cx, HEAD.cy, HEAD.rx, HEAD.ry), sphere(skin, HEAD.cx, HEAD.cy, HEAD.rx, HEAD.ry), skin[3]);
  const ear = () => { c.part(ellipse(11, 24, 2.6, 3.6), (x, y) => (x < 11 ? skin[1] : skin[2]), skin[3]); c.setD(11, 24, skin[3]); };
  ear();
  if (!back) {
    // face at output resolution (34×64): brows, eyes with iris, pupil and catch-light, nose, mouth, blush
    const brow = hairC[3], iris = look.eyes || "#5a3a24", blush = mixHex(look.skin, "#ff6f6f", 0.35);
    [[13, 13], [14, 12], [15, 12], [16, 12], [14, 13], [20, 12], [21, 12], [22, 13], [20, 13]].forEach(([x, y]) => c.set(x, y, brow));
    if (eyes === "closed") { for (let x = 13; x < 17; x++) c.set(x, 17, OUTLINE); for (let x = 19; x < 22; x++) c.set(x, 17, OUTLINE); c.set(13, 16, OUTLINE); c.set(19, 16, OUTLINE); }
    else {
      for (let y = 15; y < 19; y++) { for (let x = 14; x < 17; x++) c.set(x, y, "#ffffff"); for (let x = 20; x < 22; x++) c.set(x, y, "#ffffff"); }
      for (let x = 13; x < 17; x++) c.set(x, 14, OUTLINE); for (let x = 19; x < 22; x++) c.set(x, 14, OUTLINE);
      for (let y = 16; y < 19; y++) { c.set(15, y, iris); c.set(16, y, OUTLINE); c.set(21, y, OUTLINE); c.set(20, y, iris); }
      c.set(15, 16, "#ffffff"); c.set(20, 16, "#ffffff");
      c.set(14, 19, skin[2]); c.set(15, 19, skin[2]); c.set(20, 19, skin[2]);
    }
    c.set(20, 20, skin[3]); c.set(20, 21, skin[2]); c.set(19, 21, skin[0]);
    if (mouth === "open") { [[16, 23], [17, 23], [18, 23]].forEach(([x, y]) => c.set(x, y, "#4a1f18")); [[16, 24], [17, 24], [18, 24]].forEach(([x, y]) => c.set(x, y, "#c0504a")); c.set(15, 22, "#8a3a2e"); c.set(19, 22, "#8a3a2e"); }
    else [[15, 22], [16, 23], [17, 23], [18, 23], [19, 22]].forEach(([x, y]) => c.set(x, y, "#8a3a2e"));
    [[13, 21], [14, 21], [21, 21], [22, 21]].forEach(([x, y]) => c.set(x, y, blush));
  }
  // hair (and cap / hood); from behind the hair covers the whole head
  if (hair.hood) c.part(back ? ellipse(22.5, 24, 16, 17.5) : hair.front, sphere(hoodC, 22, 22, 16, 17), hoodC[3]);
  else c.part(back ? union(hair.front, ellipse(HEAD.cx, HEAD.cy - 0.5, HEAD.rx + 0.4, HEAD.ry)) : hair.front, hairShade(hairC, 21, 17, 14, 13, look.hair[0] === "long"), hairC[3]);
  if (back) ear();
  if (hair.cap) {
    const capC = ramp(look.capColor || "#c8102e");
    c.part(ellipse(21.5, 13.5, 12.5, 8.5), sphere(capC, 21.5, 13, 12, 8), capC[3]);
    if (!back) c.part(polyS([[24, 15], [40, 16], [39, 20], [24, 19]]), (x, y) => (y > 18 ? capC[3] : capC[2]), capC[3]);
    else c.part(rectS(17, 19, 27, 21), () => capC[2], capC[3]);
    c.setD(20, 9, "#ffffff"); c.setD(21, 10, "#ffffff");
  }
  // raised arms over the head, and whatever the near hand holds
  cur = "over";
  if (raised(pose.armL)) nearHand = arm(pose.armL, true);
  if (pose.cupNear) cupAt(nearHand);
  if (pose.phone) { const [hx, hy] = nearHand; c.part(rectS(hx - 2, hy - 5, hx + 2, hy + 1), () => "#2b2e35", OUTLINE); c.setD(Math.round(hx - 1), Math.round(hy - 4), "#8cc8f0"); c.setD(Math.round(hx), Math.round(hy - 4), "#8cc8f0"); }
  // things worn on the face (output pixels)
  cur = "head";
  if (!back) {
    if (extras.includes("sunglasses")) {
      for (let y = 15; y < 18; y++) { for (let x = 14; x < 17; x++) c.set(x, y, "#15171c"); for (let x = 20; x < 22; x++) c.set(x, y, "#15171c"); }
      for (let x = 17; x < 20; x++) c.set(x, 15, OUTLINE);
      c.set(14, 15, "#8a93a3"); c.set(20, 15, "#8a93a3");
    }
    if (extras.includes("glasses")) {
      const fr = look.frames || "#c8102e";
      for (const [x0, x1] of [[13, 17], [19, 23]]) { for (let x = x0; x < x1; x++) { c.set(x, 14, fr); c.set(x, 19, fr); } for (let y = 14; y < 20; y++) { c.set(x0, y, fr); c.set(x1 - 1, y, fr); } }
      c.set(17, 15, fr); c.set(18, 15, fr);
    }
    if (extras.includes("visor")) for (let x = 12; x < 24; x++) for (let y = 15; y < 18; y++) c.set(x, y, y === 15 ? "#b9ffd6" : "#39ff88");
  }
  // the silhouette: every pixel on the edge of the figure goes black
  const px = c.px, out = px.slice(), empty = (x, y) => x < 0 || y < 0 || x >= AW || y >= AH || !px[y * AW + x];
  for (let y = 0; y < AH; y++) for (let x = 0; x < AW; x++) if (px[y * AW + x] && (empty(x - 1, y) || empty(x + 1, y) || empty(x, y - 1) || empty(x, y + 1))) out[y * AW + x] = OUTLINE;
  return out;
}

// Pixels → PNG data URL (1 canvas px per screen px; the scene draws 2 px per unit, so w and h are in units).
// Each picture is defined once in the page's <defs id="img-defs"> and placed with <use>, so a prop drawn 50 times
// doesn't carry its PNG 50 times.
let imageCount = 0;
function toImage(px, W, Ht) {
  const canvas = Object.assign(document.createElement("canvas"), { width: W, height: Ht }), ctx = canvas.getContext("2d");
  px.forEach((col, k) => { if (col) { ctx.fillStyle = col; ctx.fillRect(k % W, Math.floor(k / W), 1, 1); } });
  const url = canvas.toDataURL(), id = `img${imageCount++}`;
  document.getElementById("img-defs").insertAdjacentHTML("beforeend", `<image id="${id}" href="${url}" width="${W / 2}" height="${Ht / 2}" style="image-rendering:pixelated"/>`);
  return { url, id, w: W / 2, h: Ht / 2 };
}
// A drawn picture placed at (x, y) in units.
const imageTag = ({ id }, x, y) => `<use href="#${id}" x="${x}" y="${y}"/>`;
// Whether a pose has anything in the "over" layer (a raised near arm, a cup at the mouth, a phone).
const hasOver = (poseName) => { const p = POSES[poseName]; return p.armL[2][1] < 40 || !!p.cupNear || !!p.phone; };
// Frames side by side in one picture (a sprite strip): showing another frame only moves the window onto the strip, so
// nothing new has to load and nothing can blink out. frames: [{ pose, back, eyes, mouth, layer }].
function joinFrames(list, W, Ht) {
  const n = list.length, px = new Array(W * n * Ht).fill(null);
  list.forEach((f, i) => f.forEach((col, k) => { if (col) px[Math.floor(k / W) * W * n + i * W + (k % W)] = col; }));
  return toImage(px, W * n, Ht);
}
const STRIPS = new Map();
function avatarStrip(look, frames) {
  const key = look + JSON.stringify(frames);
  if (!STRIPS.has(key)) STRIPS.set(key, joinFrames(frames.map(({ pose = "stand", ...o }) => drawAvatar(AVATAR_LOOKS[look], pose, o)), AW, AH));
  return STRIPS.get(key);
}
const AVATARS = new Map();
function avatarImage(look, pose, opts = {}) {
  const key = `${look}:${pose}:${JSON.stringify(opts)}`;
  if (!AVATARS.has(key)) AVATARS.set(key, toImage(drawAvatar(AVATAR_LOOKS[look], pose, opts), AW, AH));
  return AVATARS.get(key);
}

// Everyone's look.
const AVATAR_LOOKS = {
  jen: { skin: "#f1c29b", hair: ["long", "#26201c"], top: ["sweater", "#2b3a66"], bottom: ["jeans", "#9dbad6"], shoes: "#f4f1ea", extras: ["sunglasses", "bag"] },
  dancer: { skin: "#e6b08a", hair: ["bob", "#e0569b"], top: ["tee", "#8e44ad"], bottom: ["pants", "#2d2d3a"], shoes: "#f4f1ea" },
  pitcher: { skin: "#d9a77c", hair: ["cap", "#3a2a24"], top: ["jersey", "#f2f2f2"], bottom: ["pants", "#c9cdd3"], shoes: "#2b2b2b", capColor: "#c8102e" },
  radar: { skin: "#f1c29b", hair: ["spiky", "#6b4426"], top: ["hoodie", "#3f8f5a"], bottom: ["pants", "#2f3542"], shoes: "#f4f1ea" },
  student: { skin: "#f1c29b", hair: ["bun", "#2a2a2a"], top: ["long", "#e7dcc6"], bottom: ["pants", "#5b6b8c"], shoes: "#6f4a2f", extras: ["glasses", "paper"] },
  coffee: { skin: "#c68a62", hair: ["curly", "#b5562b"], top: ["sweater", "#e0a82e"], bottom: ["pants", "#6b4a2e"], shoes: "#f4f1ea", extras: ["cup"] },
  labA: { skin: "#f1c29b", hair: ["bob", "#6b4226"], top: ["coat", "#f2f4f6"], bottom: ["pants", "#3d4a66"], shoes: "#2b2b2b" },
  labB: { skin: "#e8b996", hair: ["spiky", "#1f1714"], top: ["coat", "#f2f4f6"], bottom: ["pants", "#6b7a3a"], shoes: "#2b2b2b", extras: ["glasses"], frames: "#3b82c4" },
  analyst: { skin: "#c68a62", hair: ["curly", "#1f1714"], top: ["hoodie", "#5b3f8f"], bottom: ["pants", "#2d2d3a"], shoes: "#f4f1ea" },
  tech: { skin: "#f1c29b", hair: ["bun", "#d9b25a"], top: ["tee", "#3fa3a3"], bottom: ["pants", "#3fa3a3"], shoes: "#f4f1ea" },
  customerA: { skin: "#f1c29b", hair: ["bob", "#b5562b"], top: ["tee", "#e05a7a"], bottom: ["jeans", "#2f5a99"], shoes: "#f4f1ea" },
  customerB: { skin: "#d9a77c", hair: ["spiky", "#2a2a2a"], top: ["tee", "#f2c94c"], bottom: ["pants", "#555555"], shoes: "#2b2b2b" },
  barista: { skin: "#e6b08a", hair: ["bun", "#3a2a24"], top: ["tee", "#1e6b52"], bottom: ["pants", "#2d2d3a"], shoes: "#2b2b2b", extras: ["apron"] },
  hacker: { skin: "#e9c9a8", hair: ["hood", "#2b2f3a"], top: ["hoodie", "#2b2f3a"], bottom: ["pants", "#1f222a"], shoes: "#2b2b2b", extras: ["visor"] },
  q1: { skin: "#f1c29b", hair: ["bob", "#6b4226"], top: ["hoodie", "#f06292"], bottom: ["jeans", "#2f5a99"], shoes: "#f4f1ea" },
  q2: { skin: "#f1c29b", hair: ["spiky", "#d9b25a"], top: ["tee", "#3fa34d"], bottom: ["pants", "#555555"], shoes: "#2b2b2b" },
  q3: { skin: "#a8704a", hair: ["curly", "#1f1714"], top: ["sweater", "#f6c945"], bottom: ["pants", "#6b4a2e"], shoes: "#f4f1ea" },
  q4: { skin: "#f1c29b", hair: ["cap", "#3a2a24"], top: ["long", "#e9e4d8"], bottom: ["jeans", "#2d3a5c"], shoes: "#2b2b2b", capColor: "#3b82c4" },
  q5: { skin: "#e6b08a", hair: ["bun", "#b5562b"], top: ["tee", "#e0584f"], bottom: ["pants", "#3d4a66"], shoes: "#f4f1ea" },
  q6: { skin: "#d9a77c", hair: ["bob", "#2a2a2a"], top: ["sweater", "#8e44ad"], bottom: ["jeans", "#9dbad6"], shoes: "#f4f1ea" },
};
