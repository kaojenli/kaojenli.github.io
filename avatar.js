// Habbo-style avatars drawn pixel by pixel at Habbo's in-room size, from measurements of a real Habbo figure (its
// standard pose, direction 2): the figure is about 30×81 px on a 64×32 floor tile, tall and slim; the head is 26×31, a
// plain skin shape with the face on its front (small eyes, a nose line, a short mouth) and the ear on the back; arms
// hang thin and straight; every part has a 1px black outline and just two or three tones, the back of the body in
// shade and the side it faces lit. Everything is drawn straight in canvas pixels (K = 1), facing down-right.
// A look is { skin, hair: [style, colour], top: [style, colour], bottom: [style, colour], shoes, extras: [...] }.
const AW = 32, AH = 84, K = 1, OUTLINE = "#111111";

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
  const n = pts.length, xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const x0 = Math.min(...xs), y0 = Math.min(...ys), x1 = Math.max(...xs), y1 = Math.max(...ys);
  return bounded((x, y) => {
    const px = x + 0.5, py = y + 0.5;
    if (px < x0 || px > x1 || py < y0 || py > y1) return false; // (cheap, and most tests in a union land outside)
    let inside = false;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const yi = ys[i], yj = ys[j];
      if (yi > py !== yj > py && px < ((xs[j] - xs[i]) * (py - yi)) / (yj - yi) + xs[i]) inside = !inside;
    }
    return inside;
  }, [x0 - 1, y0 - 1, x1, y1]);
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

// ---------- body geometry for each pose, in canvas pixels (three-quarter view facing down-right).
// Arms run shoulder → elbow → hand and legs hip → knee → ankle; armL / legL are the near side (screen left), armR /
// legR the far side; feet are [x0, y0, x1, y1] boxes with the toe to the right; `seat` is for sitting; `bob` lifts
// the figure a pixel (walking); `phone` / `cupNear` put a phone or the cup in the near hand.
const posed = (o) => ({ armL: [[6, 33], [5, 45], [6, 57.5]], armR: [[26, 33], [27, 45], [27, 56]], legL: [[12, 54], [12, 65], [12, 75]], legR: [[20, 54], [20.5, 65], [21, 74]],
  footL: [6, 74, 18, 81], footR: [15, 72, 27, 79], ...o });
const SIT = { seat: true, armL: [[6, 33], [8, 45], [12, 54]], armR: [[26, 33], [27, 45], [27, 52]], legL: [[12, 60], [22, 63], [22, 73]], legR: [[19, 59], [27, 61], [27, 70]],
  footL: [18, 72, 28, 79], footR: [22, 69, 31, 76] };
const POSES = {
  stand: posed({}),
  shift: posed({ armL: [[6, 33], [6, 45], [8, 56]], armR: [[26, 33], [26, 45], [26, 55]], legL: [[12, 54], [11, 65], [10, 75]], footL: [4, 74, 16, 81], legR: [[20, 54], [21, 65], [22, 74]], footR: [17, 72, 29, 79] }),
  phone: posed({ armL: [[6, 33], [8, 45], [14, 41]], phone: true }),
  reach: posed({ armL: [[6, 33], [11, 42], [18, 45]] }),
  think: posed({ armL: [[6, 33], [10, 44], [16, 33]] }),
  wave1: posed({ armL: [[6, 33], [1, 25], [2, 14]] }),
  wave2: posed({ armL: [[6, 33], [1, 24], [5, 13]] }),
  walkA: posed({ armL: [[6, 33], [3, 44], [2, 54]], armR: [[26, 33], [29, 44], [30, 53]], legL: [[12, 54], [14, 65], [16, 75]], footL: [11, 74, 23, 81], legR: [[20, 54], [19, 64], [17, 72.5]], footR: [11, 71, 22, 78] }),
  passA: posed({ legR: [[20, 54], [22, 62.5], [20, 70]], footR: [15, 70, 26, 76], bob: 1 }),
  walkB: posed({ armL: [[6, 33], [9, 44], [11, 54]], armR: [[26, 33], [24, 44], [23, 53]], legL: [[12, 54], [10, 65], [8, 75]], footL: [2, 74, 14, 81], legR: [[20, 54], [23, 64], [25, 74]], footR: [20, 73, 31, 80] }),
  passB: posed({ legL: [[12, 54], [15, 62.5], [13, 70]], footL: [8, 70, 20, 77], bob: 1 }),
  armsUp: posed({ armL: [[6, 33], [3, 21], [4, 9]], armR: [[26, 33], [29, 21], [28, 9]] }),
  // at a keyboard (two frames, hands taking turns), talking with the hands, sipping from the cup
  typeA: posed({ armL: [[6, 33], [9, 43], [15, 45]], armR: [[26, 33], [28, 42], [30, 44]] }),
  typeB: posed({ armL: [[6, 33], [9, 42], [14, 43]], armR: [[26, 33], [28, 43], [30, 46]] }),
  talk1: posed({ armL: [[6, 33], [10, 44], [16, 41]] }),
  talk2: posed({ armL: [[6, 33], [9, 42], [13, 36]], armR: [[26, 33], [29, 41], [31, 38]] }),
  drink: posed({ armL: [[6, 33], [10, 43], [16, 31]], cupNear: true }),
  danceL: posed({ armL: [[6, 33], [1, 26], [1, 16]], armR: [[26, 33], [21, 25], [17, 17]], legL: [[12, 54], [9, 65], [7, 75]], footL: [1, 74, 13, 81], legR: [[20, 54], [22, 65], [24, 74]], footR: [20, 72, 31, 79] }),
  danceMix: posed({ armL: [[6, 33], [2, 24], [2, 13]], armR: [[26, 33], [30, 40], [31, 47]], legL: [[12, 54], [15, 64], [13, 74]], footL: [8, 73, 20, 80] }),
  danceR: posed({ armL: [[6, 33], [11, 40], [18, 38]], armR: [[26, 33], [30, 23], [29, 13]], legL: [[12, 54], [14, 65], [17, 75]], footL: [12, 74, 24, 81], legR: [[20, 54], [20, 65], [19, 74]], footR: [13, 72, 25, 79] }),
  // the pitcher's wind-up: set, leg lift, arm cocked, release
  pSet: posed({ armL: [[6, 33], [9, 44], [15, 41]], armR: [[26, 33], [25, 43], [18, 41]] }),
  pLift: posed({ armL: [[6, 33], [10, 42], [16, 38]], armR: [[26, 33], [25, 41], [19, 38]], legL: [[12, 54], [20, 57.5], [16, 69]], footL: [10, 68, 22, 74] }),
  pCock: posed({ armL: [[6, 33], [12, 37], [19, 38]], armR: [[26, 33], [31, 26], [30, 15]], legL: [[12, 54], [17, 64], [21, 75]], footL: [16, 74, 28, 81], legR: [[20, 54], [16, 65], [12, 74]], footR: [6, 72, 18, 79] }),
  pRelease: posed({ armL: [[6, 33], [5, 43], [7, 50]], armR: [[26, 33], [23, 42], [16, 50]], legL: [[12, 54], [17, 64], [21, 75]], footL: [16, 74, 28, 81], legR: [[20, 54], [17, 62.5], [14, 70]], footR: [8, 69, 20, 76] }),
  sit: { ...SIT },
  sitDrink: { ...SIT, armL: [[6, 33], [10, 43], [16, 31]], cupNear: true },
  sitWave: { ...SIT, armL: [[6, 33], [1, 25], [2, 14]] },
};

// An in-between pose, t of the way from pose a to pose b: every joint and foot moved part way (named "a>b@t", made once).
const lerpPts = (A, B, t) => A.map((p, i) => [p[0] + (B[i][0] - p[0]) * t, p[1] + (B[i][1] - p[1]) * t]);
function tweenPose(a, b, t) {
  const name = `${a}>${b}@${t}`;
  if (!POSES[name]) {
    const A = POSES[a], B = POSES[b], near = t < 0.5 ? A : B, box = (p, q) => p.map((v, i) => v + (q[i] - v) * t);
    POSES[name] = { armL: lerpPts(A.armL, B.armL, t), armR: lerpPts(A.armR, B.armR, t), legL: lerpPts(A.legL, B.legL, t), legR: lerpPts(A.legR, B.legR, t),
      footL: box(A.footL, B.footL), footR: box(A.footR, B.footR), seat: near.seat, phone: near.phone, cupNear: near.cupNear, bob: A.bob && B.bob };
  }
  return name;
}

// A limb as a thick polyline (pixel test).
function limb(points, w) {
  const segs = points.slice(1).map(([bx, by], i) => { const [ax, ay] = points[i], dx = bx - ax, dy = by - ay; return [ax, ay, dx, dy, dx * dx + dy * dy]; });
  const xs = points.map((p) => p[0]), ys = points.map((p) => p[1]), r = w / 2;
  const x0 = Math.min(...xs) - r, y0 = Math.min(...ys) - r, x1 = Math.max(...xs) + r, y1 = Math.max(...ys) + r;
  return bounded((x, y) => {
    const px = x + 0.5, py = y + 0.5;
    if (px < x0 || px > x1 || py < y0 || py > y1) return false;
    for (const [ax, ay, dx, dy, l2] of segs) {
      const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2));
      if (Math.hypot(px - (ax + t * dx), py - (ay + t * dy)) <= r) return true;
    }
    return false;
  }, [Math.min(...xs) - r - 1, Math.min(...ys) - r - 1, Math.max(...xs) + r, Math.max(...ys) + r]);
}

// ---------- the head: a skull with a flat front and a jaw, 26×31; the face shows through a window in the hair
const HEAD = { cx: 15, cy: 15, rx: 12.5, ry: 13 };
const headShape = union(ellipse(15, 15, 12.5, 13), polyS([[6, 20], [27.5, 14], [27.8, 24], [25.8, 29], [21.5, 32.6], [15, 34], [10, 31.5], [6.5, 26]]));
// The hairline sweeps diagonally, high over the far eye and low toward the ear, so the fringe falls across the forehead.
const faceWindow = polyS([[8.5, 23.5], [12, 19], [17, 15], [23, 11.5], [29.5, 9.5], [29.5, 36], [8.5, 36]]);
const hairCut = (shape) => minus(shape, faceWindow);
// Pointed tips hanging off a fringe or a nape: [x, y] where the tip points, drawn as small triangles.
const tips = (list, down = 3) => union(...list.map(([x, y]) => polyS([[x - 2, y - down], [x + 2.2, y - down], [x - 0.3, y + 0.6]])));
const FRINGE = [[11.5, 21.5], [15.5, 18], [20, 14.5], [24.5, 12]];
const HAIR = {
  long: () => ({
    back: polyS([[3, 14], [14, 3], [26, 8], [28, 20], [26, 46], [21, 49], [17, 46], [13, 50], [8, 46], [4, 49], [2, 38]]),
    front: union(hairCut(union(ellipse(15, 12, 13.8, 10.5), tips(FRINGE))), polyS([[1.5, 12], [8.5, 14], [9.5, 38], [6, 44], [1.5, 38]])),
  }),
  bob: () => ({ front: union(hairCut(union(ellipse(15, 12.5, 14, 11), tips(FRINGE))), polyS([[1.2, 13], [8.5, 16], [9.5, 30], [6, 33.5], [1.2, 30]]), tips([[3.5, 34], [7, 33.5]])) }),
  spiky: () => ({ front: union(hairCut(union(ellipse(15, 12, 13.2, 9.8), polyS([[3, 11], [4, 2], [8, 6], [10, 0], [14, 5], [17, 0], [19, 5], [23, 0.5], [24, 7], [28.5, 4], [28, 13]]), tips(FRINGE, 3.5))),
    polyS([[5, 13], [9, 15], [9, 21], [6.5, 21]])) }),
  bun: () => ({ front: union(hairCut(union(ellipse(15, 12.5, 13.5, 10.2), tips(FRINGE))), ellipse(10, 4.5, 5, 4), polyS([[4, 13], [9, 15], [9, 22], [6, 22]])) }),
  curly: () => ({ front: hairCut(union(ellipse(15, 12.5, 13.5, 10.5), ...[[5, 6], [10, 2.5], [16, 2], [22, 3], [26.5, 7], [3, 13], [3.5, 20], [27.5, 11], [12, 19], [18, 14.5]].map(([x, y]) => ellipse(x, y, 4.2, 4.2)))) }),
  cap: () => ({ front: union(hairCut(ellipse(15, 13, 13, 9.5)), polyS([[4, 13], [9, 15], [9, 23], [6, 23]])), cap: true }),
  hood: () => ({ front: minus(ellipse(15.5, 18, 15.5, 17.5), polyS([[10, 17], [16, 12.5], [26, 10], [29.5, 11], [29.5, 36], [9, 36]])), hood: true }),
  // a high ponytail swinging behind the head, tied with a band
  ponytail: () => ({ back: polyS([[3, 9], [8, 7], [7, 14], [5, 26], [3.5, 40], [1, 34], [0.5, 22]]), front: union(hairCut(union(ellipse(15, 12.3, 13.5, 10.2), tips(FRINGE))), polyS([[4, 13], [9, 15], [9, 21], [6, 21]])), tie: [4, 11] }),
  // a big round afro, wider than the head
  afro: () => ({ front: hairCut(union(ellipse(15, 11, 15.8, 12), ellipse(4, 18, 4.8, 7), ellipse(26.5, 7, 4.5, 5))), texture: "curl" }),
  // clipped close to the skull, the hairline high
  buzz: () => ({ front: minus(ellipse(15, 12.5, 13.1, 11), polyS([[6.5, 20], [11, 12], [19, 8.5], [29.5, 7], [29.5, 36], [6.5, 36]])), texture: "buzz" }),
  // parted on the side, a long fringe swept over the forehead
  sidepart: () => ({ front: union(hairCut(union(ellipse(15, 11.5, 13.6, 10.2), polyS([[11, 4], [28, 7], [29, 12.5], [24, 12], [18, 15.5], [12, 19]]), tips([[13, 20], [18, 16.5], [23, 13.5], [27.5, 12]]))),
    polyS([[4, 12], [9, 14], [9, 21], [6, 21]])), part: [[11, 3], [11, 4], [12, 5], [12, 6], [13, 7]] }),
  // two bunches low behind the ears
  pigtails: () => ({ back: union(ellipse(3, 30, 3.2, 6.5), ellipse(27.5, 28, 2.6, 6)), front: union(hairCut(union(ellipse(15, 12.5, 13.8, 10.8), tips(FRINGE))), polyS([[1.5, 13], [8.5, 16], [9, 26], [2, 26]])), ties: [[3, 23], [27, 21]] }),
  // one long braid down the back
  braid: () => ({ back: union(...[0, 1, 2, 3, 4, 5].map((k) => ellipse(k % 2 ? 3.5 : 2.5, 26 + k * 4.5, 2.8, 2.6))), front: union(hairCut(union(ellipse(15, 12.3, 13.6, 10.4), tips(FRINGE))), polyS([[1.5, 12], [8.5, 15], [9, 25], [4, 27], [1.5, 22]])), tie: [3, 50] }),
  // a knitted beanie with a folded brim; a little hair at the back
  beanie: () => ({ front: union(hairCut(ellipse(15, 13, 13.3, 10)), polyS([[3, 14], [9, 16], [8.5, 24], [4, 24]])), beanie: true }),
  // no hair
  bald: () => ({ front: rectS(0, 0, 0, 0) }),
  // long and wavy, the ends in soft points
  wavy: () => ({
    back: union(polyS([[3, 14], [14, 3], [26, 8], [28, 20], [27, 40], [3, 40], [1.5, 30]]), tips([[4, 44], [9, 45], [14, 44], [19, 45], [24, 43]], 5)),
    front: union(hairCut(union(ellipse(15, 12, 14, 10.8), tips(FRINGE))), polyS([[1, 12], [9, 14], [9.5, 34], [7, 38], [1, 36]]), tips([[3, 40], [7.5, 41]], 4)),
  }),
  // Jen's: parted just off the middle, falling past the shoulders on both sides in loose natural waves, fuller toward
  // the ends, which turn in small curls; the forehead shows between the two sides
  jen: () => {
    const ends = (list) => union(...list.map(([x, y]) => ellipse(x, y, 2.3, 1.8)));
    const bare = polyS([[9, 26], [9.5, 20], [12.5, 14.5], [15.5, 10.5], [18, 7.5], [19, 7.5], [22.5, 9.5], [26, 12], [28.8, 16], [29.5, 36], [9, 36]]);
    return {
      back: union(polyS([[3, 12], [14, 3], [26, 7], [29, 16], [30.5, 27], [30, 39], [2, 39], [0.5, 28], [1.5, 18]]), ends([[3, 40], [7, 41], [25, 41], [29, 40]])),
      front: union(minus(ellipse(15, 12, 13.9, 10.6), bare), tips([[12, 18.5], [27, 14.5]], 3),
        polyS([[1, 12], [9, 14], [10.5, 22], [9.5, 27], [11, 32], [10, 37], [11, 41], [7.5, 43], [4, 42], [1.5, 43], [0.5, 38], [1.5, 33], [0, 27]]), ends([[9, 42], [3.5, 43]]),
        polyS([[26, 10], [29.8, 13], [31, 22], [30, 28], [31.5, 34], [29.5, 39], [27, 36], [28.2, 30], [27.6, 22]]), ends([[29.5, 39]])),
      part: [[18, 2], [18, 3], [18, 4], [18, 5], [18, 6], [18, 7]], scalp: true, waves: [3, 6.5, 29],
    };
  },
  // short and tousled, tufts sticking out every way
  messy: () => ({ front: union(hairCut(union(ellipse(15, 12, 13.4, 10), tips([[6, 1.5], [12, 0.5], [18, 1], [24, 2.5], [28.5, 6.5], [2, 8]], -4), tips([[12, 21], [16.5, 17.5], [21, 14.5], [25.5, 12.5]]))),
    polyS([[4.5, 13], [9, 15], [9, 21], [6.5, 21]])) }),
};
// Hair is drawn in clumps of strands: darker strand lines follow the sweep of the fringe, a few light strands catch the
// light near the front of the crown, and the back of the head is in shade.
const hairTone = (r, texture) => (x, y) => {
  if (texture === "buzz") return (x + y) % 2 ? r[1] : r[2];                                    // clipped: fine stubble dots
  if (texture === "curl") return x < 6 ? r[2] : ((x * 7 + y * 3) % 9 < 2 ? r[2] : (x * 5 + y * 11) % 13 === 0 ? r[0] : r[1]); // tight curls
  const k = x + Math.floor(y * 0.7), strand = k % 5 === 0 && (Math.floor(y / 3) + k) % 3 !== 0; // broken strands, in clumps
  if (x < 6.5) return strand ? r[3] : r[2];
  if (strand) return y < 9 && x > 12 && x % 8 === 3 ? r[0] : r[2];
  return r[1];
};

// ---------- draw one avatar. opts: eyes "open"/"closed", mouth "closed"/"open", back (seen from behind: no face).
// layer: "all", or one of the three layers a figure is built from, like Habbo's separate body parts: "body" (everything
// under the head), "head" (head, face, hair, hat, glasses; the same in every pose, and free to turn on its own) and "over"
// (a raised arm, or what the near hand holds, in front of the head).
const mixHex = (a, b, t) => { const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); const [x, y] = [p(a), p(b)]; return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join(""); };
// Habbo's body lighting: the back of the figure (screen left) in shade, the side it faces lit.
const bodyShade = (r, x0, x1, frac = 0.36) => (x, y) => r[(x + 0.5 - x0) / (x1 - x0) < frac ? 2 : 1];
function drawAvatar(look, poseName, { eyes = "open", mouth = "closed", back = false, layer = "all" } = {}) {
  const base = makeCanvas(), pose = POSES[poseName];
  let cur = "body";
  const on = () => layer === "all" || layer === cur;
  const c = { px: base.px, part: (...q) => on() && base.part(...q), set: (...q) => on() && base.set(...q) };
  const skin = skinRamp(look.skin), hairC = ramp(look.hair[1]), top = ramp(look.top[1]), bottom = ramp(look.bottom[1]), shoe = ramp(look.shoes);
  const hair = HAIR[look.hair[0]](), extras = look.extras || [], kind = look.top[0];
  const longSleeve = ["sweater", "hoodie", "coat", "long", "shirt", "jacket", "cardigan", "turtleneck"].includes(kind), coat = kind === "coat", hoodie = kind === "hoodie" || look.hair[0] === "hood";
  const face = look.face || {}, inner = look.inner ? ramp(look.inner) : top, sleeve = kind === "overalls" ? inner : top, bKind = look.bottom[0];
  const legSkin = bKind === "skirt" || bKind === "shorts" || kind === "dress", tights = look.tights ? ramp(look.tights) : null;
  const hoodC = look.hair[0] === "hood" ? top : hairC;
  const raised = (arm) => arm[2][1] < 36;

  // an arm: the sleeve (short ones end above the elbow, long ones at the wrist with a darker cuff), skin, then the hand
  const arm = ([s, e, h], near) => {
    const w = near ? 5.5 : 4.6, cut = longSleeve ? 1.85 : kind === "tank" ? 0.02 : 0.5, x0 = Math.min(s[0], e[0], h[0]) - 3, x1 = Math.max(s[0], e[0], h[0]) + 3;
    const along = (x, y) => {
      const seg = (p, q, off) => { const dx = q[0] - p[0], dy = q[1] - p[1], t = Math.max(0, Math.min(1, ((x + 0.5 - p[0]) * dx + (y + 0.5 - p[1]) * dy) / (dx * dx + dy * dy || 1))); return [Math.hypot(x + 0.5 - p[0] - t * dx, y + 0.5 - p[1] - t * dy), off + t]; };
      const p = seg(s, e, 0), q = seg(e, h, 1);
      return p[0] <= q[0] ? p[1] : q[1];
    };
    c.part(union(limb([s, e], w), limb([e, h], w - 0.6)), (x, y) => {
      const t = along(x, y);
      if (t < cut) return t > cut - 0.12 ? sleeve[2] : kind === "stripe" && y % 4 < 2 ? ramp(look.stripe)[1] : bodyShade(sleeve, x0, x1, 0.4)(x, y);
      return bodyShade(skin, x0, x1, 0.4)(x, y);
    });
    const L = Math.hypot(h[0] - e[0], h[1] - e[1]) || 1, hx = h[0] + ((h[0] - e[0]) / L) * 1.4, hy = h[1] + ((h[1] - e[1]) / L) * 1.4;
    c.part(ellipse(hx, hy, 2.3, 2.7), bodyShade(skin, hx - 2.3, hx + 2.3, 0.4));
    return [hx, hy];
  };
  const cupAt = ([hx, hy]) => { c.part(rectS(hx - 2, hy - 5, hx + 2.5, hy + 1), (x, y) => (y < hy - 3.5 ? "#6f4a2f" : y > hy - 2 && y < hy - 0.5 ? "#c8453c" : "#fbfbf6")); };

  if (hair.back) c.part(hair.back, bodyShade(hairC, 2, 28, 0.4));
  if (hoodie) c.part(polyS([[6, 29], [23, 28.5], [25, 34], [5, 35]]), bodyShade(top, 5, 25));   // the hood lying behind the neck
  // the far arm, behind the body (a raised one behind the head too). Seen from behind, a near arm reaching forward
  // (toward what the person faces) also goes behind the body.
  const farHand = arm(pose.armR, false), reachesAway = back && !raised(pose.armL) && pose.armL[2][0] > pose.armL[0][0] + 4;
  let nearHand = reachesAway ? arm(pose.armL, true) : null;
  if (extras.includes("cup") && !pose.cupNear) cupAt(farHand);
  // legs and shoes, the far side first; trousers shaded at the back, a front crease (a lighter seam on jeans), soles
  const jeans = look.bottom[0] === "jeans", sole = look.shoes === "#f4f1ea" ? "#c9c3b8" : "#e8e2d6";
  const shoeS = ([x0, y0, x1, y1]) => union(rectS(x0, y0 + 2, x1 - 3, y1), ellipse(x1 - 3.5, (y0 + y1) / 2 + 1, 3.5, (y1 - y0) / 2 - 0.5), ellipse(x0 + 3, y0 + 2.5, 3, 2));
  for (const [leg, foot] of [[pose.legR, pose.footR], [pose.legL, pose.footL]]) {
    const near = leg === pose.legL;
    const legC = legSkin ? tights || skin : bottom, bare = (y) => legSkin && (bKind === "shorts" ? y > leg[1][1] - 3 : true);
    c.part(limb(leg, legSkin ? 7 : 8.5), (x, y) => { const r = bare(y) ? legC : bottom; return x + 0.5 < 10 || (near && x < leg[1][0] - 1) ? r[2] : r[1]; });
    if (look.shoeStyle === "boots") c.part(limb([leg[1].map((v, i) => v + (leg[2][i] - v) * 0.45), leg[2]], legSkin ? 7.5 : 9), (x, y) => (x + 0.5 < 10 ? shoe[2] : shoe[1]));
    if (bKind === "cargo" && near) c.part(rectS(leg[1][0] - 3.5, leg[1][1] - 6, leg[1][0] + 0.5, leg[1][1] - 1), () => bottom[2]);
    if (!legSkin) for (let t = 0.1; t < 0.95; t += 0.05) {
      const [p, q] = t < 0.5 ? [leg[0], leg[1]] : [leg[1], leg[2]], u = t < 0.5 ? t * 2 : (t - 0.5) * 2;
      c.set(Math.round(p[0] + (q[0] - p[0]) * u + 2), Math.round(p[1] + (q[1] - p[1]) * u), jeans ? bottom[0] : bottom[2]);
    }
    c.part(shoeS(foot), (x, y) => (y >= foot[3] - 1.5 ? sole : look.shoeStyle === "sneakers" && y === foot[1] + 4 && x > foot[0] + 2 ? ramp(look.stripe || "#c8453c")[1] : bodyShade(shoe, foot[0], foot[2], 0.3)(x, y)));
  }
  // the body: shaded at the back, lit in front, with each top's own details
  // the torso is a box in three-quarter view: its back side (x < 10) in shade, the front lit, the hem a V like the box's
  // bottom edges (lowest at the front corner, rising up-left and up-right)
  const dress = kind === "dress", hem = coat ? 67 : dress ? 66 : 58, hemAt = (x) => (x < 10 ? hem - (10 - x) / 2 : hem - (x - 10) / 2), side = (r) => (x) => (x + 0.5 < 10 ? r[2] : r[1]);
  // a skirt (or a dress's skirt): the same box as the body, flaring out a little, its hem a V lower down; pleats
  const skirt = (r, waist, len) => {
    const V = (x, y0) => (x < 10 ? y0 - (10 - x) / 2 : y0 - (x - 10) / 2);
    c.part(polyS([[4, V(4, waist)], [10, waist], [27.6, V(27.6, waist)], [30, V(30, waist + len)], [10, waist + len], [1.5, V(1.5, waist + len)]]),
      (x, y) => ((x > 10 && (x - 12) % 5 === 0) || (x < 10 && x % 3 === 0) ? r[2] : side(r)(x)));
  };
  if (bKind === "skirt" && !dress) skirt(bottom, 57, 11);
  if (dress) skirt(top, 51, 17);
  c.part(polyS([[9.5, 30.5], [20.5, 29.5], [26.5, 32.5], [27.6, 45], [27.6, (dress ? 45 : hemAt(27.6)) + 0.5], [10, (dress ? 54 : hem) + 0.5], [4, (dress ? 51 : hemAt(4)) + 0.5], [4, 45], [4.5, 33]]),
    (x, y) => (kind === "stripe" && y % 4 < 2 ? side(ramp(look.stripe))(x) : side(top)(x)));
  if (kind === "sweater") { for (let x = 5; x < 27; x += 2) for (let d = 1; d < 3.5; d++) c.set(x, Math.round(hemAt(x) - d), top[2]); for (let x = 11; x < 20; x++) c.set(x, 31, top[2]); }
  const front = !back; // pockets, buttons, lapels, logos and things held in front only show from the front
  if ((kind === "jacket" || kind === "cardigan") && front) {                                   // open front showing the shirt under it
    c.part(polyS([[12, 31], [18.5, 30], [18.5, hemAt(18.5)], [12, hemAt(12) + 0.5]]), () => inner[1]);
    c.part(polyS([[10.5, 31], [13.5, 31], [12.5, 42]]), () => top[2]); c.part(polyS([[17, 30.5], [20.5, 30], [18.5, 41]]), () => top[0]);
    if (kind === "cardigan") [37, 42, 47, 52].forEach((y) => c.set(12, y, top[3]));
    else c.part(rectS(21, 47, 25.5, 51), () => top[2]);
  }
  if ((kind === "shirt" || kind === "polo") && front) {                                         // a collar, a button placket, a pocket
    c.part(polyS([[11, 30], [15, 31.5], [13, 35]]), () => top[0]); c.part(polyS([[15.5, 31.5], [20.5, 29.5], [18.5, 34.5]]), () => top[0]);
    for (let y = 34; y < (kind === "polo" ? 42 : hemAt(15.5)); y += 1) c.set(15, y, top[2]);
    [37, 42, 47, 52].filter((y) => kind === "shirt" || y < 42).forEach((y) => c.set(16, y, "#f4f1ea"));
    if (kind === "shirt") c.part(rectS(19, 38, 24, 42), () => top[2]);
  }
  if (kind === "overalls" && front) {                                                           // a bib with straps and buttons
    c.part(polyS([[11, 40], [22, 38], [22, hemAt(22)], [11, hemAt(11) + 0.5]]), () => bottom[1]);
    c.part(limb([[8, 32], [11.5, 40.5]], 1.8), () => bottom[1]); c.part(limb([[22.5, 31], [21.5, 38.5]], 1.8), () => bottom[1]);
    c.set(12, 41, "#d9a441"); c.set(21, 39, "#d9a441"); c.part(rectS(14, 44, 19, 48), () => bottom[2]);
  }
  if (kind === "turtleneck") c.part(polyS([[11, 28], [20, 27.5], [20.5, 32], [11, 32.5]]), (x) => side(top)(x));
  if (hoodie && front) { c.part(polyS([[11, 48], [22, 45.5], [22, 51], [11, 54]]), () => top[1]); c.set(13, 33, top[0]); c.set(13, 34, top[0]); c.set(13, 36, top[0]); c.set(18, 33, top[0]); c.set(18, 34, top[0]); c.set(18, 36, top[0]); }
  if (coat && front) {
    c.part(polyS([[11, 30.5], [15, 30.5], [15, 42]]), () => top[1]); c.part(polyS([[15.5, 30.5], [20, 30.5], [15.5, 42]]), () => top[1]);
    for (let y = 42; y < hemAt(15); y++) c.set(15, y, top[2]);
    c.part(rectS(18, 52, 24, 58), () => top[1]); c.set(13, 46, top[2]); c.set(13, 53, top[2]); c.set(13, 60, top[2]);
  }
  if (kind === "jersey") { if (front) for (let y = 32; y < hemAt(15); y++) c.set(15, y, "#c8453c"); for (let x = 5; x < 27; x++) c.set(x, Math.round(hemAt(x) - 1), "#c8453c"); if (front) [[20, 38], [21, 38], [21, 39], [20, 40], [21, 41], [20, 42]].forEach(([x, y]) => c.set(x, y, "#c8453c")); }
  if (extras.includes("apron") && front) { const ap = ramp("#f4f1ea"); c.part(polyS([[11, 38], [24, 36], [24, 56], [11, 62]]), () => ap[1]); c.part(polyS([[13, 49], [21, 47.5], [21, 52.5], [13, 54]]), () => ap[1]); }
  if (!coat && !hoodie && !["shirt", "polo", "turtleneck"].includes(kind) && front) c.part(kind === "tank" || dress ? polyS([[10.5, 30.5], [20, 30], [15.5, 36]]) : polyS([[11.5, 30.5], [19, 30.5], [15.5, 34.5]]), () => skin[1]);   // the neckline
  if (extras.includes("tie") && front) c.part(polyS([[14.5, 33], [16.5, 33], [17.5, 45], [15.5, 48], [14, 45]]), (x, y) => (y < 35 ? ramp(look.tie || "#c8453c")[2] : ramp(look.tie || "#c8453c")[1]));
  if (extras.includes("necklace") && front) [[12, 33], [13, 34], [14, 35], [15, 35.5 | 0], [16, 35], [17, 34], [18, 33]].forEach(([x, y]) => c.set(x, y, "#d9a441"));
  // the near arm in front of the body (a raised one waits until after the head)
  if (!raised(pose.armL) && !reachesAway) nearHand = arm(pose.armL, true);
  if (extras.includes("bag") && front) { c.part(limb([[7, 32], [23, 50]], 1.6), () => "#4e5a29", null); c.part(polyS([[18, 48], [27, 47], [27.5, 55], [18.5, 56]]), bodyShade(ramp("#6b7a3a"), 18, 28, 0.25)); }
  if (extras.includes("paper") && front) { c.part(polyS([[10, 40], [22, 39], [22, 51], [10, 52]]), () => "#fbfbf6"); for (const y of [43, 46, 49]) for (let x = 12; x < 20; x++) c.set(x, y, "#9aa4b1"); }

  // head: neck, head, ear
  c.part(rectS(12, 27, 19, 35), (x, y) => (x < 14 ? skin[2] : skin[1]));
  if (extras.includes("scarf")) { const sc = ramp(look.scarf || "#c8453c"); c.part(polyS([[7, 29], [24, 27.5], [25, 34], [8, 35.5]]), (x, y) => (y % 3 === 0 ? sc[2] : side(sc)(x)));
    if (front) c.part(polyS([[18, 33], [22, 33], [21.5, 46], [18.5, 46]]), (x, y) => (y > 43 ? sc[2] : sc[1])); }
  cur = "head";
  c.part(headShape, (x, y) => (x < 4.5 || (y > 31.5 && x < 17) ? skin[2] : skin[1]));
  const ear = () => { c.part(ellipse(5.5, 20.5, 2.3, 3.3), (x, y) => (x < 5 ? skin[2] : skin[1])); c.set(5, 20, skin[3]); c.set(5, 21, skin[3]); };
  ear();
  if (!back) {
    // the face, on the front of the head: small eyes looking the way they face (the far one a little higher), brows,
    // a nose line, a short mouth
    const iris = look.eyes || "#6b4526", st = { eyes: "round", brows: "flat", nose: "line", mouth: "smile", ...face };
    const darkHair = hexToHsl(look.hair[1])[2] < 38, brow = st.brows === "thin" ? skin[3] : darkHair ? OUTLINE : hairC[3];
    const eye = (x, y, outer) => {
      if (eyes === "closed") { c.set(x, y + 3, OUTLINE); c.set(x + 1, y + 3, OUTLINE); c.set(x + 2, y + 2, OUTLINE); c.set(x + 3, y + 2, OUTLINE); return; }
      if (st.eyes === "narrow") { [[0, 2], [1, 2], [2, 2], [3, 2]].forEach(([dx, dy]) => c.set(x + dx, y + dy, OUTLINE)); c.set(x + 1, y + 3, "#ffffff"); c.set(x + 2, y + 3, OUTLINE); c.set(x + 3, y + 3, OUTLINE); c.set(x, y + 3, OUTLINE); return; }
      const lid = st.eyes === "sleepy" ? 1 : 0;
      [[1, 0], [2, 0], [3, 0], [0, 1], [0, 2], [0, 3], [1, 4]].forEach(([dx, dy]) => c.set(x + dx, y + dy, OUTLINE));   // lid and the back of the eye
      [[1, 1], [2, 1], [1, 2], [1, 3]].forEach(([dx, dy]) => c.set(x + dx, y + dy, "#ffffff"));                        // the white
      c.set(x + 3, y + 1, iris);
      [[2, 2], [3, 2], [2, 3], [3, 3]].forEach(([dx, dy]) => c.set(x + dx, y + dy, OUTLINE));                           // the pupil, looking right
      if (lid) { c.set(x + 1, y + 1, skin[2]); c.set(x + 2, y + 1, skin[2]); c.set(x + 3, y + 1, OUTLINE); }             // a heavy lid
      if (st.eyes === "wide") { c.set(x + 1, y + 4, "#ffffff"); c.set(x + 2, y + 4, OUTLINE); c.set(x, y + 4, OUTLINE); }
      if (st.eyes === "lash") { c.set(outer ? x + 4 : x - 1, y, OUTLINE); c.set(outer ? x + 4 : x - 1, y - 1, OUTLINE); }
    };
    eye(14, 18, false); eye(21, 15, true);
    const BROWS = { flat: [[14, 16], [15, 16], [16, 16], [21, 13], [22, 13], [23, 13], [24, 13]], arched: [[14, 16], [15, 15], [16, 15], [21, 13], [22, 12], [23, 12], [24, 13]],
      thick: [[14, 16], [15, 16], [16, 16], [15, 15], [16, 15], [21, 13], [22, 13], [23, 13], [24, 13], [22, 12], [23, 12], [24, 12]],
      angled: [[14, 15], [15, 15], [16, 16], [21, 14], [22, 13], [23, 12], [24, 12]], thin: [[15, 16], [16, 16], [22, 13], [23, 13]] };
    (BROWS[st.brows] || BROWS.flat).forEach(([x, y]) => c.set(x, y, brow));
    const NOSES = { line: [[20, 20], [21, 21], [21, 22], [22, 23], [21, 24], [20, 24]], button: [[21, 22], [22, 23], [21, 24]], long: [[20, 19], [21, 20], [21, 21], [22, 22], [22, 23], [23, 24], [21, 25], [22, 25]] };
    (NOSES[st.nose] || NOSES.line).forEach(([x, y]) => c.set(x, y, OUTLINE));
    c.set(19, 23, skin[2]); c.set(20, 23, skin[2]);                                                                     // the nose's shadow
    [[13, 25], [14, 26], [23, 27], [22, 28]].forEach(([x, y]) => c.set(x, y, skin[2]));                                 // cheek and chin shading
    if (st.freckles) [[12, 22], [14, 23], [13, 24], [23, 21], [24, 22.5 | 0]].forEach(([x, y]) => c.set(x, y, mixHex(look.skin, "#8a4a2a", 0.45)));
    const fh = ramp(look.beardColor || look.hair[1]);
    if (st.beard === "stubble") for (let y = 26; y < 33; y++) for (let x = 11; x < 27; x++) if ((x + y) % 2 === 0 && headShape(x, y) && (y > 28 || x < 14 || x > 22)) c.set(x, y, mixHex(look.skin, look.beardColor || look.hair[1], 0.5));
    if (st.beard === "beard") c.part(polyS([[7.5, 22], [11, 27], [16, 29.5], [22, 28], [26.5, 23], [27.4, 26.5], [25, 31], [19, 34.5], [12, 33.5], [8, 29]]), (x, y) => (x < 11 ? fh[2] : (x * 3 + y) % 5 === 0 ? fh[2] : fh[1]));
    if (st.beard === "goatee") c.part(polyS([[16, 29], [21.5, 28.5], [21, 33.5], [17, 33.5]]), () => fh[1]);
    if (st.beard === "mustache" || st.beard === "beard") c.part(polyS([[15.5, 25], [22.5, 24.5], [22, 26.5], [19, 26], [16, 27]]), () => fh[2]);
    const lip = st.lips || OUTLINE;
    const MOUTHS = { smile: [[16, 27], [17, 28], [18, 28], [19, 28], [20, 27]], flat: [[17, 28], [18, 28], [19, 28], [20, 28]], small: [[18, 28], [19, 28]],
      smirk: [[16, 28], [17, 28], [18, 28], [19, 27], [20, 26]], grin: [[16, 27], [17, 28], [18, 28], [19, 28], [20, 28], [21, 27]] };
    if (mouth === "open") { [[16, 27], [17, 28], [18, 28], [19, 28], [20, 27]].forEach(([x, y]) => c.set(x, y, OUTLINE)); c.set(18, 27, "#c0504a"); c.set(19, 27, "#c0504a"); }
    else {
      (MOUTHS[st.mouth] || MOUTHS.smile).forEach(([x, y]) => c.set(x, y, lip));
      if (st.mouth === "grin") { c.set(17, 27, "#ffffff"); c.set(18, 27, "#ffffff"); c.set(19, 27, "#ffffff"); c.set(20, 27, "#ffffff"); }
      if (st.lips) { c.set(18, 29, mixHex(st.lips, "#ffffff", 0.2)); c.set(19, 29, mixHex(st.lips, "#ffffff", 0.2)); }
    }
  }
  if (face.earrings) { c.set(5, 24, face.earrings); c.set(5, 25, OUTLINE); }
  // hair (and cap / hood); from behind the hair covers the whole head
  const hairShape = back ? union(hair.front, minus(headShape, rectS(0, 29, AW, AH))) : hair.front;
  if (hair.hood) c.part(back ? ellipse(15.5, 18, 15.5, 17.5) : hair.front, bodyShade(hoodC, 0, 31, 0.4));
  else {
    c.part(hairShape, hairTone(hairC, hair.texture));
    if (hair.part && !back) hair.part.forEach(([x, y]) => c.set(x, y, hair.scalp ? mixHex(look.skin, look.hair[1], 0.45) : hairC[3]));
    // wavy locks: darker strands snaking down the lengths
    if (hair.waves && !back) for (const x0 of hair.waves) for (let y = 18; y < 43; y++) { const x = Math.round(x0 + 1.2 * Math.sin(y / 2.2)); if (hair.front(x, y)) c.set(x, y, hairC[2]); }
    for (const t of [hair.tie, ...(hair.ties || [])].filter(Boolean)) c.part(rectS(t[0] - 1.5, t[1] - 1, t[0] + 1.5, t[1] + 1.5), () => look.tieColor || "#e0584f");
    if (look.hair[0] === "long") for (let x = 3; x < 9; x += 3) for (let y = 22; y < 42; y++) c.set(x, y, hairC[2]);
  }
  if (back) ear();
  if (hair.beanie) {
    const b = ramp(look.capColor || "#6b7a8f");
    c.part(ellipse(15, 11.5, 13.6, 10), (x, y) => (x < 7 ? b[2] : (x % 3 === 0 ? b[2] : b[1])));
    c.part(polyS([[1.5, 13], [29, 10], [29.5, 15], [2, 18.5]]), (x, y) => (x < 7 ? b[2] : x % 2 ? b[0] : b[1]));   // the folded brim, ribbed
    c.part(ellipse(15, 1.5, 3, 2), () => b[0]);                                                                     // the pompom
  }
  if (extras.includes("headphones")) { c.part(limb([[5, 16], [9, 2], [20, 0.5], [27, 7]], 1.8), () => "#2b2e35"); c.part(ellipse(5.5, 19.5, 2.8, 3.8), () => "#3a3d44"); }
  if (extras.includes("headband") && !back) c.part(polyS([[2, 12], [28.5, 6], [29, 8.5], [2.5, 15]]), () => ramp(look.bandColor || "#e0584f")[1]);
  if (hair.cap) {
    const capC = ramp(look.capColor || "#c8102e");
    c.part(ellipse(15, 10.5, 13, 8.5), (x, y) => (x < 8 ? capC[2] : y < 5 && x > 13 && x < 22 ? capC[0] : capC[1]));
    if (!back) c.part(polyS([[18, 13], [31.5, 14.5], [31.5, 17.5], [18, 16.5]]), (x, y) => (y > 16 ? capC[3] : capC[2]));
    else c.part(rectS(8, 16, 20, 18.5), () => capC[2]);
    c.set(15, 2, capC[0]);
  }
  // raised arms over the head, and whatever the near hand holds
  cur = "over";
  if (raised(pose.armL)) nearHand = arm(pose.armL, true);
  if (pose.cupNear && !back) cupAt(nearHand);
  if (pose.phone && !back) { const [hx, hy] = nearHand; c.part(rectS(hx - 1.5, hy - 5, hx + 2, hy + 1), () => "#2b2e35"); c.set(Math.round(hx), Math.round(hy - 4), "#8cc8f0"); }
  // things worn on the face
  cur = "head";
  if (!back) {
    if (extras.includes("sunglasses")) {
      for (let y = 17; y < 22; y++) for (let x = 13; x < 18; x++) c.set(x, y, y === 17 ? OUTLINE : "#15171c");
      for (let y = 14; y < 19; y++) for (let x = 20; x < 25; x++) c.set(x, y, y === 14 ? OUTLINE : "#15171c");
      [[18, 17], [19, 16]].forEach(([x, y]) => c.set(x, y, OUTLINE)); c.set(14, 18, "#6a7384"); c.set(21, 15, "#6a7384"); c.set(22, 15, "#6a7384");
    }
    if (extras.includes("glasses")) {
      const fr = look.frames || "#c8102e";
      for (const [x0, y0] of [[13, 17], [20, 14]]) { for (let x = x0; x < x0 + 6; x++) { c.set(x, y0, fr); c.set(x, y0 + 5, fr); } for (let y = y0; y < y0 + 6; y++) { c.set(x0, y, fr); c.set(x0 + 5, y, fr); } }
      c.set(19, 17, fr); c.set(19, 16, fr);
    }
    if (extras.includes("visor")) for (let x = 11; x < 27; x++) for (let y = Math.round(17.5 - (x - 11) * 0.2); y < Math.round(22 - (x - 11) * 0.2); y++) c.set(x, y, y === Math.round(17.5 - (x - 11) * 0.2) ? "#b9ffd6" : "#39ff88");
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
// Colours as [r, g, b, a] (parsed once each, by letting the canvas normalise any CSS colour).
const RGBA = new Map();
let colourCtx = null;
function rgba(col) {
  if (!RGBA.has(col)) {
    colourCtx ||= document.createElement("canvas").getContext("2d");
    colourCtx.fillStyle = "#000"; colourCtx.fillStyle = col;
    const s = colourCtx.fillStyle, n = s.startsWith("#") ? [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16)).concat(255) : s.match(/[\d.]+/g).map(Number);
    RGBA.set(col, n.length === 4 && !s.startsWith("#") ? [n[0], n[1], n[2], Math.round(n[3] * 255)] : n);
  }
  return RGBA.get(col);
}
function toImage(px, W, Ht) {
  const canvas = Object.assign(document.createElement("canvas"), { width: W, height: Ht }), ctx = canvas.getContext("2d"), img = ctx.createImageData(W, Ht), d = img.data;
  px.forEach((col, k) => { if (col) d.set(rgba(col), k * 4); });
  ctx.putImageData(img, 0, 0);
  const url = canvas.toDataURL(), id = `img${imageCount++}`;
  document.getElementById("img-defs").insertAdjacentHTML("beforeend", `<image id="${id}" href="${url}" width="${W / 2}" height="${Ht / 2}" style="image-rendering:pixelated"/>`);
  return { url, id, w: W / 2, h: Ht / 2 };
}
// A drawn picture placed at (x, y) in units.
const imageTag = ({ id }, x, y) => `<use href="#${id}" x="${x}" y="${y}"/>`;
// Whether a pose has anything in the "over" layer (a raised near arm, a cup at the mouth, a phone).
const hasOver = (poseName) => { const p = POSES[poseName]; return p.armL[2][1] < 36 || !!p.cupNear || !!p.phone; };
// Frames side by side in one picture (a sprite strip): showing another frame only moves the window onto the strip, so
// nothing new has to load and nothing can blink out. frames: [{ pose, back, eyes, mouth, layer }].
function joinFrames(list, W, Ht) {
  const n = list.length, px = new Array(W * n * Ht).fill(null);
  list.forEach((f, i) => f.forEach((col, k) => { if (col) px[Math.floor(k / W) * W * n + i * W + (k % W)] = col; }));
  return toImage(px, W * n, Ht);
}
const STRIPS = new Map();
// The same, drawn a few frames at a time so the page never stalls while a long strip is made.
async function avatarStripAsync(look, frames) {
  const key = look + JSON.stringify(frames);
  if (!STRIPS.has(key)) {
    const out = [];
    for (let i = 0; i < frames.length; i++) {
      const { pose = "stand", ...o } = frames[i];
      out.push(drawAvatar(AVATAR_LOOKS[look], pose, o));
      if (i % 5 === 4) await new Promise((r) => setTimeout(r, 0));
    }
    if (!STRIPS.has(key)) STRIPS.set(key, joinFrames(out, AW, AH));
  }
  return STRIPS.get(key);
}
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
  jen: { skin: "#f1c29b", hair: ["jen", "#26201c"], top: ["sweater", "#2b3a66"], bottom: ["jeans", "#9dbad6"], shoes: "#f4f1ea", face: { eyes: "lash", mouth: "small", brows: "arched" } },
  dancer: { skin: "#e6b08a", hair: ["ponytail", "#e0569b"], top: ["tank", "#8e44ad"], bottom: ["pants", "#2d2d3a"], shoes: "#f4f1ea", shoeStyle: "sneakers", stripe: "#e0569b", face: { eyes: "lash", mouth: "grin", brows: "arched" }, tieColor: "#f6c945" },
  pitcher: { skin: "#d9a77c", hair: ["cap", "#3a2a24"], top: ["jersey", "#f2f2f2"], bottom: ["pants", "#c9cdd3"], shoes: "#2b2b2b", capColor: "#c8102e", face: { brows: "angled", mouth: "flat", beard: "stubble" } },
  radar: { skin: "#f1c29b", hair: ["sidepart", "#6b4426"], top: ["shirt", "#9fc4e8"], bottom: ["cargo", "#5a6048"], shoes: "#6f4a2f", extras: ["headphones"], face: { eyes: "narrow", nose: "button", mouth: "smirk" } },
  student: { skin: "#f1c29b", hair: ["bun", "#2a2a2a"], top: ["cardigan", "#c9b48a"], inner: "#f4f1ea", bottom: ["skirt", "#34507f"], tights: "#3a3d44", shoes: "#6f4a2f", extras: ["glasses", "paper"], face: { eyes: "wide", freckles: true, mouth: "small" } },
  coffee: { skin: "#c68a62", hair: ["curly", "#b5562b"], top: ["sweater", "#e0a82e"], bottom: ["pants", "#6b4a2e"], shoes: "#f4f1ea", extras: ["cup", "scarf"], scarf: "#3f8f5a", face: { brows: "thick", beard: "beard" } },
  labA: { skin: "#f1c29b", hair: ["ponytail", "#6b4226"], top: ["coat", "#f2f4f6"], bottom: ["pants", "#3d4a66"], shoes: "#2b2b2b", face: { eyes: "lash", lips: "#b83a4a", brows: "arched" } },
  labB: { skin: "#e8b996", hair: ["buzz", "#1f1714"], top: ["coat", "#f2f4f6"], bottom: ["pants", "#6b7a3a"], shoes: "#2b2b2b", extras: ["glasses"], frames: "#3b82c4", face: { beard: "goatee", nose: "long", brows: "thick" } },
  analyst: { skin: "#8d5a3b", hair: ["afro", "#1f1714"], top: ["hoodie", "#5b3f8f"], bottom: ["pants", "#2d2d3a"], shoes: "#f4f1ea", face: { eyes: "sleepy", earrings: "#d9a441", mouth: "smile" } },
  tech: { skin: "#f1c29b", hair: ["bun", "#d9b25a"], top: ["tee", "#3fa3a3"], bottom: ["pants", "#3fa3a3"], shoes: "#f4f1ea", face: { freckles: true, eyes: "round", brows: "thin" } },
  customerA: { skin: "#f1c29b", hair: ["wavy", "#b5562b"], top: ["stripe", "#f4f1ea"], stripe: "#e05a7a", bottom: ["jeans", "#2f5a99"], shoes: "#f4f1ea", extras: ["necklace"], face: { eyes: "lash", lips: "#c0504a" } },
  customerB: { skin: "#d9a77c", hair: ["sidepart", "#2a2a2a"], top: ["polo", "#f2c94c"], bottom: ["pants", "#b8a47a"], shoes: "#6f4a2f", face: { brows: "arched", mouth: "flat", nose: "long" } },
  barista: { skin: "#e6b08a", hair: ["bun", "#3a2a24"], top: ["shirt", "#1e6b52"], bottom: ["pants", "#2d2d3a"], shoes: "#2b2b2b", extras: ["apron"], face: { eyes: "narrow", mouth: "smile", earrings: "#c9cdd3" } },
  hacker: { skin: "#e9c9a8", hair: ["hood", "#2b2f3a"], top: ["hoodie", "#2b2f3a"], bottom: ["pants", "#1f222a"], shoes: "#2b2b2b", extras: ["visor"], face: { mouth: "flat", beard: "stubble" } },
  q1: { skin: "#f1c29b", hair: ["pigtails", "#6b4226"], top: ["hoodie", "#f06292"], bottom: ["jeans", "#2f5a99"], shoes: "#f4f1ea", shoeStyle: "sneakers", stripe: "#f06292", face: { eyes: "wide", freckles: true, mouth: "grin" } },
  q2: { skin: "#f1c29b", hair: ["messy", "#d9b25a"], top: ["jacket", "#4a6fa5"], inner: "#f4f1ea", bottom: ["pants", "#2d2d3a"], shoes: "#2b2b2b", face: { beard: "stubble", brows: "angled", mouth: "smirk" } },
  q3: { skin: "#7a4a30", hair: ["braid", "#1f1714"], top: ["turtleneck", "#e0a82e"], bottom: ["skirt", "#6b4a2e"], tights: "#3a2a24", shoes: "#2b2b2b", shoeStyle: "boots", face: { eyes: "lash", lips: "#8a3a3a", earrings: "#d9a441" } },
  q4: { skin: "#f1c29b", hair: ["beanie", "#9aa0a6"], capColor: "#8a5a3a", top: ["shirt", "#b5533a"], bottom: ["jeans", "#2d3a5c"], shoes: "#6f4a2f", shoeStyle: "boots", face: { beard: "beard", brows: "thick", eyes: "sleepy" }, beardColor: "#b9bec6" },
  q5: { skin: "#e6b08a", hair: ["bald", "#3a2a24"], top: ["tee", "#e0584f"], bottom: ["cargo", "#3d4a66"], shoes: "#f4f1ea", shoeStyle: "sneakers", stripe: "#3b82c4", extras: ["glasses"], frames: "#2b2e35", face: { beard: "mustache", mouth: "smile" } },
  q6: { skin: "#d9a77c", hair: ["bob", "#2a2a2a"], top: ["dress", "#8e44ad"], bottom: ["pants", "#2a2a2a"], tights: "#2b2e35", shoes: "#2b2b2b", extras: ["headband"], bandColor: "#f6c945", face: { eyes: "lash", lips: "#9a3050", brows: "arched" } },
};
