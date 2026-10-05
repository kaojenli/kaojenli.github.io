// Props drawn pixel by pixel at native resolution with the avatar rasteriser (avatar.js): plants, trees, cameras,
// lab gear, animals, signs, posters. Black 1px outlines, colour ramps lit from the top left, and bushy things
// built from clumps painted back to front so each clump keeps its own outline.
// Each prop: w×h in pixels (the scene shows 2 px per unit) and draw(c) on a makeCanvas(w, h, 1).
const O = OUTLINE;
const clumps = (c, list, col) => list.forEach(([x, y, rx, ry]) => c.part(ellipse(x, y, rx, ry), sphere(ramp(col), x, y, rx, ry)));
const specksOn = (c, n, x0, y0, x1, y1, col, test) => {
  for (let i = 0; i < n; i++) {
    const x = x0 + ((i * 37) % (x1 - x0)), y = y0 + ((i * 53) % (y1 - y0));
    if (!test || test(x, y)) c.set(x, y, col);
  }
};
// A leafy tree, s = scale (1 → 60×80 px): trunk, then clumps back to front, then light specks on the leaves.
const treeDraw = (s) => (c) => {
  c.part(polyS([[26, 48], [34, 48], [35, 76], [38, 79], [22, 79], [25, 76]].map(([x, y]) => [x * s, y * s])), bands(ramp("#7a5230"), 23 * s, 37 * s));
  clumps(c, [[30, 12, 13, 10], [18, 20, 12, 10], [42, 20, 12, 10], [12, 34, 11, 10], [48, 34, 11, 10], [30, 28, 16, 13], [21, 44, 12, 8], [39, 44, 12, 8]].map((v) => v.map((n) => n * s)), "#469a3a");
  specksOn(c, Math.round(40 * s), 4, 3, Math.round(56 * s), Math.round(52 * s), "#8fd66a", (x, y) => c.get(x, y) && c.get(x, y) !== O);
};
// A flower pot seen from above at the iso angle: tapered body with a round bottom, a lit rim and soil inside.
function pot(c, cx, top, rt, rb, h, col = "#c0643a") {
  const r = ramp(col);
  c.part(union(polyS([[cx - rt, top], [cx + rt, top], [cx + rb, top + h], [cx - rb, top + h]]), ellipse(cx, top + h, rb, rb * 0.45)), bands(r, cx - rt, cx + rt, top + h - 1));
  c.part(ellipse(cx, top, rt + 1, (rt + 1) * 0.45), (x, y) => (y < top - 0.5 ? r[0] : r[1]));
  c.part(ellipse(cx, top + 0.3, rt - 0.6, (rt - 0.6) * 0.42), () => "#4a2e1a", null);
}
// A box drawn in iso in pixel space: back corner (x, y), a pixels along the right axis, b along the left, h tall.
function isoBox(c, x, y, a, b, h, col) {
  const r = ramp(col), T = [[x, y], [x + a, y + a / 2], [x + a - b, y + (a + b) / 2], [x - b, y + b / 2]], dn = ([u, v]) => [u, v + h];
  c.part(polyS([T[3], T[2], dn(T[2]), dn(T[3])]), () => r[1]);
  c.part(polyS([T[2], T[1], dn(T[1]), dn(T[2])]), () => r[2]);
  c.part(polyS(T), () => r[0]);
  return T;
}
const LETTERS = {
  C: [".###", "#...", "#...", "#...", "#...", "#...", ".###"],
  A: [".##.", "#..#", "#..#", "####", "#..#", "#..#", "#..#"],
  F: ["####", "#...", "#...", "###.", "#...", "#...", "#..."],
  E: ["####", "#...", "#...", "###.", "#...", "#...", "####"],
};

const PROPS = {
  plant: { w: 24, h: 32, draw(c) {
    pot(c, 12, 22, 6.5, 5, 7);
    for (let y = 8; y < 22; y++) c.set(12, y, "#2d7a38");
    clumps(c, [[8, 7, 3.5, 4.5], [16, 7, 3.5, 4.5], [12, 4, 3, 3.5], [6.5, 14, 4.5, 3.5], [17.5, 14, 4.5, 3.5], [12, 12, 5.5, 6.5]], "#3fa34d");
    for (let y = 8; y < 17; y++) c.set(12, y, "#2d7a38");
  } },
  tree: { w: 60, h: 80, draw: treeDraw(1) },
  treeSmall: { w: 48, h: 64, draw: treeDraw(0.8) },
  // Snowy firs for the forest behind the building, in four sizes and two greens (name + "B": the bluer one). Tiers are
  // painted bottom to top so each keeps its outline: drooping sides, a ragged hem, dark where the tier above overhangs
  // it; snow lies in clumps along the upper slopes (more on the lit left) and on the tip.
  ...Object.fromEntries([["pineL", 1.25], ["pine", 1], ["pineS", 0.75], ["pineXS", 0.55]].flatMap(([name, k]) => [["", "#2f7a45"], ["B", "#2a6a58"]].map(([tint, green]) => [name + tint, { w: Math.round(32 * k), h: Math.round(64 * k), draw(c) {
    const S = (v) => v * k, g = ramp(green), m = S(16), tiers = [[26, 56, 15], [16, 44, 12], [7, 32, 9], [1, 18, 6]];
    const clump = (x, y, r) => c.part(ellipse(x, y, r, r * 0.65), (px, py) => (py < y - r * 0.15 ? "#ffffff" : "#d8e4ee"), "#6f8296");
    c.part(rectS(S(14), S(52), S(18), S(64)), bands(ramp("#6b4426"), S(14), S(18)));
    tiers.forEach(([y0, y1, hw], i) => {
      const [a, b, w] = [S(y0), S(y1), S(hw)], over = tiers[i + 1] ? S(tiers[i + 1][1]) + S(2.5) : -1, n = 4, hem = [];
      for (let j = 0; j <= 2 * n; j++) hem.push([m - w + (w * j) / n, b - (j % 2 ? S(3) : j && j < 2 * n ? S(1) : 0)]);
      c.part(polyS([[m, a], [m - w * 0.42, a + (b - a) * 0.52], ...hem, [m + w * 0.42, a + (b - a) * 0.52]]),
        (x, y) => (y < over ? g[2] : bands(g, m - w, m + w, b - S(2.5))(x, y)));
      const on = (side, t) => [m + side * w * t, a + (b - a) * t - S(1)]; // a point on the upper slope, t from the top
      [0.62, 0.86].forEach((t) => clump(...on(-1, t), S(2.4)));
      clump(...on(1, 0.84), S(1.8));
    });
    c.part(polyS([[m, S(0.2)], [m + S(2.2), S(4.5)], [m, S(3.6)], [m - S(2.2), S(4.5)]]), () => "#ffffff", "#6f8296");
  } }]))),
  // a boulder half under snow, for the open ground at the forest's foot
  rockSnow: { w: 22, h: 14, draw(c) {
    c.part(union(ellipse(8, 9, 7.5, 5), ellipse(14.5, 10, 6.5, 4)), sphere(ramp("#8d949c"), 9, 8, 11, 6));
    c.part(union(ellipse(8, 6, 6, 2.6), ellipse(14, 7.5, 4.5, 2)), (x, y) => (y < 5.5 ? "#ffffff" : "#d8e4ee"), "#6f8296");
  } },
  // ---- plants in pots
  palm: { w: 44, h: 74, draw(c) {
    const g = ramp("#4f9a3c");
    pot(c, 22, 57, 10, 7.5, 12, "#9a6a3e");
    for (let y = 60; y < 70; y += 3) for (let x = 16 + (y % 2); x < 28; x += 3) c.set(x, y, "#7a522c");
    const fronds = [[[22, 34], [10, 26], [2, 33]], [[22, 32], [13, 14], [5, 9]], [[22, 31], [23, 10], [19, 1]], [[22, 32], [32, 14], [40, 10]], [[22, 34], [34, 26], [42, 34]], [[22, 36], [14, 44], [8, 52]], [[22, 36], [31, 44], [37, 51]]];
    c.part(limb([[22, 58], [21, 34]], 2.5), () => "#7a6a3a", null);
    fronds.forEach((f) => c.part(limb(f, 5), (x, y) => g[y < 20 ? 0 : y < 38 ? 1 : 2]));
    fronds.forEach((f) => { const [[ax, ay], [bx, by], [cx, cy]] = f; for (let t = 0.15; t < 1; t += 0.12) { const [x, y] = t < 0.5 ? [ax + (bx - ax) * t * 2, ay + (by - ay) * t * 2] : [bx + (cx - bx) * (t - 0.5) * 2, by + (cy - by) * (t - 0.5) * 2]; c.set(Math.round(x), Math.round(y), g[3]); } });
  } },
  fern: { w: 30, h: 30, draw(c) {
    const g = ramp("#5aa83e");
    pot(c, 15, 20, 7, 5, 6, "#d9cfc0");
    [[[15, 18], [6, 10], [1, 17]], [[15, 18], [24, 10], [29, 17]], [[15, 17], [10, 4], [5, 3]], [[15, 17], [20, 4], [25, 3]], [[15, 17], [15, 2]], [[15, 19], [5, 18], [2, 25]], [[15, 19], [25, 18], [28, 25]]]
      .forEach((f, i) => c.part(limb(f, 4), (x, y) => g[(i + (x + y)) % 5 === 0 ? 0 : y > 14 ? 2 : 1]));
  } },
  monstera: { w: 34, h: 42, draw(c) {
    const g = ramp("#2f8a4a");
    pot(c, 17, 30, 8, 6, 8, "#e8e2d6");
    [[17, 30, 17, 18], [17, 30, 8, 22], [17, 30, 26, 22]].forEach(([a, b, x, y]) => c.part(limb([[a, b], [x, y]], 1.5), () => "#2d6a35", null));
    for (const [x, y, rx, ry] of [[9, 17, 8, 6.5], [25, 16, 8, 6.5], [17, 9, 8.5, 7.5]]) {
      c.part(minus(ellipse(x, y, rx, ry), union(rectS(x + 2, y - 1, x + rx, y), rectS(x - rx, y + 2, x - 3, y + 3))), sphere(g, x, y, rx, ry));
      for (let t = -rx + 2; t < rx - 2; t++) c.set(Math.round(x + t), Math.round(y + t * 0.3), g[3]);
    }
  } },
  cactus: { w: 12, h: 18, draw(c) {
    pot(c, 6, 12, 4, 3, 4, "#d27a4c");
    c.part(union(ellipse(6, 7, 2.6, 6), ellipse(2.5, 7, 1.6, 2.5), ellipse(9.5, 5, 1.6, 2.5)), bands(ramp("#4f9a3c"), 2, 10));
    [[6, 4], [5, 8], [7, 10]].forEach(([x, y]) => c.set(x, y, "#e8f5d0"));
  } },
  vaseFlowers: { w: 14, h: 22, draw(c) {
    const v = ramp("#5b8fc9");
    c.part(union(ellipse(7, 17, 4, 4.5), rectS(5, 11.5, 9, 14)), sphere(v, 7, 16, 4, 5));
    c.part(ellipse(7, 11.5, 2.6, 1.2), (x, y) => (y < 11 ? v[0] : v[1]));
    c.part(ellipse(7, 11.6, 1.5, 0.6), () => "#1f3a5a", null);
    [[7, 12, 3, 5], [7, 12, 11, 4], [7, 12, 7, 2]].forEach(([a, b, x, y]) => c.part(limb([[a, b], [x, y]], 1), () => "#3f8a3a", null));
    [[3, 5, "#f06292"], [11, 4, "#f6c945"], [7, 2.5, "#ffffff"], [5, 8, "#e0584f"], [10, 8, "#b39ddb"]].forEach(([x, y, col]) => c.part(ellipse(x, y, 2.2, 2), sphere(ramp(col), x, y, 2.2, 2)));
  } },
  // Firewood stacked in a pyramid, each log lying front to back: its ringed cut end toward the viewer, the rest running up-right.
  logs: { w: 30, h: 29, draw(c) {
    const log = (ex, ey) => {
      const bx = ex + 9, by = ey - 4.5, k = (by - ey) / (bx - ex);
      c.part(limb([[ex, ey], [bx, by]], 6), (x, y) => { const s = y + 0.5 - (ey + (x + 0.5 - ex) * k); return s < -1.4 ? "#b06a3a" : s < 1.2 ? "#6e4630" : "#3a2416"; });
      c.part(ellipse(ex, ey, 2.6, 3), (x, y) => (Math.hypot((x + 0.5 - ex) / 2.6, (y + 0.5 - ey) / 3) < 0.45 ? "#b87a44" : "#e0b07a"));
      c.set(Math.round(ex - 0.5), Math.round(ey - 0.5), "#8a5530");
    };
    [[4, 19], [9.4, 21.7], [14.8, 24.4], [6.7, 15.2], [12.1, 17.9], [9.4, 11.3]].forEach(([x, y]) => log(x, y));
  } },
  // A fire in three-quarter view: two logs crossed (one along each floor axis, lit on top by the flames, a cut end with
  // rings toward the viewer), embers under them and layered flames between; fireA and fireB are the flames' two shapes.
  ...Object.fromEntries([["fireA", 0], ["fireB", 1]].map(([name, f]) => [name, { w: 32, h: 32, draw(c) {
    c.part(ellipse(16, 27.5, 12.5, 3.5), (x, y) => ((x * 7 + y * 3) % 5 === 0 ? "#ff8a3d" : (x + y) % 4 === 0 ? "#6e6a63" : "#4a2414"), null);
    const log = (ax, ay, bx, by, cx, cy) => {
      const k = (by - ay) / (bx - ax);
      c.part(limb([[ax, ay], [bx, by]], 6), (x, y) => { const s = y + 0.5 - (ay + (x + 0.5 - ax) * k); return s < -1.4 ? "#c0703a" : s < 1.2 ? "#6e4630" : "#3a2416"; });
      c.part(ellipse(cx, cy, 2.4, 3), (x, y) => (Math.hypot((x + 0.5 - cx) / 2.4, (y + 0.5 - cy) / 3) < 0.45 ? "#b87a44" : "#e0b07a"));
      c.set(Math.round(cx - 0.5), Math.round(cy - 0.5), "#8a5530");
    };
    log(4, 18, 22, 27, 22.5, 27);
    const F = f ? [[[7, 22], [9, 13], [10, 16], [12, 6], [14, 13], [15, 5], [17, 11], [19, 4], [20, 14], [23, 9], [24, 17], [25, 23]], [[9, 22], [10, 15], [12, 17], [13, 10], [15, 15], [17, 9], [18, 14], [20, 8], [21, 16], [23, 22]], [[11, 22], [12, 17], [14, 18], [15, 13], [17, 17], [18, 12], [19, 18], [21, 22]], [[13, 22], [14, 18], [16, 19], [17, 16], [18, 20], [19, 22]]]
      : [[[7, 22], [8, 14], [10, 17], [11, 8], [13, 14], [15, 3], [17, 12], [19, 6], [21, 15], [23, 10], [24, 18], [25, 23]], [[9, 22], [10, 16], [12, 18], [13, 11], [15, 16], [16, 8], [18, 15], [20, 10], [21, 17], [23, 22]], [[11, 22], [12, 18], [14, 19], [15, 14], [17, 18], [18, 13], [19, 19], [21, 22]], [[13, 22], [14, 19], [16, 20], [17, 17], [18, 21], [19, 22]]];
    const low = (pts) => pts.map(([x, y]) => [x, 22 - (22 - y) * 0.72]); // flames kept low enough to fit under the lintel
    ["#e0441e", "#f7a21b", "#ffe27a", "#fff6d0"].forEach((col, i) => c.part(polyS(low(F[i])), () => col, i ? null : "#9a2a0c"));
    log(28, 19, 10, 28, 9.5, 28);
    [[6, 25], [12, 30], [19, 30], [26, 25], [24, 29]].forEach(([x, y], i) => c.set(x, y, i % 2 ? "#ffb627" : "#e0441e"));
  } }])),
  // ---- lamps, light and small things for tables and shelves
  lampTable: { w: 16, h: 24, draw(c) {
    const b = ramp("#b5533a"), s = ramp("#f4e2b0");
    c.part(ellipse(8, 22.5, 4, 1.4), () => "#6e4631");
    c.part(union(ellipse(8, 17, 3.5, 4), rectS(7, 11, 9, 14)), sphere(b, 8, 16, 3.5, 4));
    c.part(union(polyS([[4, 3], [12, 3], [15.5, 11], [0.5, 11]]), ellipse(8, 11, 7.5, 2)), (x, y) => (x < 5 ? "#fff7de" : x < 11 ? s[1] : s[2]));
    c.part(ellipse(8, 3, 4, 1.2), () => "#fff3b0");
  } },
  mug: { w: 8, h: 9, draw(c) {
    const r = ramp("#e0584f");
    c.part(limb([[6, 4], [7.5, 5], [6, 7]], 1.2), () => r[2]);
    c.part(union(rectS(1, 2.5, 6, 8), ellipse(3.5, 8, 2.5, 1.1)), bands(r, 1, 6));
    c.part(ellipse(3.5, 2.5, 2.6, 1.2), () => r[0]);
    c.part(ellipse(3.5, 2.6, 1.8, 0.7), () => "#4a2a18", null);
  } },
  fruitBowl: { w: 16, h: 10, draw(c) {
    c.part(ellipse(8, 4.5, 7.5, 2.4), (x, y) => (y < 4 ? "#cfc8b8" : "#e8e2d6"));
    [[5, 3.5, "#e0584f"], [9, 3, "#f6c945"], [12, 4, "#7fbf4a"], [7.5, 4.5, "#f7a21b"]].forEach(([x, y, col]) => c.part(ellipse(x, y, 2.3, 2.3), sphere(ramp(col), x, y, 2.3, 2.3)));
    c.part(minus(ellipse(8, 4.6, 7.5, 4.8), rectS(0, 0, 16, 4.8)), bands(ramp("#e8e2d6"), 0.5, 15.5));
  } },
  pillow: { w: 12, h: 10, draw(c) {
    c.part(polyS([[1, 1], [11, 0], [12, 9], [0, 10]]), sphere(ramp("#e9c46a"), 6, 5, 6, 5));
    for (let x = 3; x < 10; x += 2) c.set(x, 5, "#c9962a");
  } },
  // ---- on walls
  clock: { w: 14, h: 14, draw(c) {
    c.part(ellipse(7, 7, 6.8, 6.8), (x, y) => (Math.hypot(x + 0.5 - 7, y + 0.5 - 7) > 5 ? "#6e4631" : "#fbf6ea"));
    for (let y = 3; y < 8; y++) c.set(7, y, O);
    for (let x = 7; x < 10; x++) c.set(x, 7, O);
    [[7, 2], [12, 7], [7, 12], [2, 7]].forEach(([x, y]) => c.set(x, y, "#6e4631"));
  } },
  antlers: { w: 30, h: 22, draw(c) {
    const a = ramp("#e8d9b8");
    for (const s of [-1, 1]) {
      const X = (v) => 15 + s * v;
      c.part(limb([[X(3), 14], [X(8), 8], [X(12), 2]], 2.4), bands(a, 0, 30));
      c.part(limb([[X(8), 8], [X(14), 6]], 2), bands(a, 0, 30));
      c.part(limb([[X(6), 11], [X(5), 4]], 2), bands(a, 0, 30));
    }
    c.part(polyS([[9, 13], [21, 13], [19, 21], [11, 21]]), bands(ramp("#7a4a2e"), 9, 21));
  } },
  frameLandscape: { w: 24, h: 18, draw(c) {
    c.part(rectS(0, 0, 24, 18), () => "#c9962a");
    c.part(rectS(2, 2, 22, 16), (x, y) => (y < 8 ? "#9fd3f0" : y < 11 ? "#5d7fa8" : "#4f9a3c"), null);
    c.part(polyS([[4, 11], [9, 5], [14, 11]]), () => "#eef5fb", null); c.part(polyS([[10, 11], [15, 6], [20, 11]]), () => "#cddcea", null);
    for (let x = 2; x < 22; x++) c.set(x, 11, "#3f7a35");
  } },
  frameAbstract: { w: 16, h: 20, draw(c) {
    c.part(rectS(0, 0, 16, 20), () => "#2b2e35");
    c.part(rectS(2, 2, 14, 18), () => "#f4efe4", null);
    c.part(ellipse(6, 8, 3.5, 3.5), () => "#e0584f", null); c.part(rectS(8, 10, 13, 16), () => "#3b6fb6", null); c.part(rectS(4, 13, 8, 15), () => "#f6c945", null);
  } },
  frameGold: { w: 18, h: 22, draw(c) {
    c.part(rectS(0, 0, 18, 22), () => "#6e4631");
    c.part(rectS(2, 2, 16, 20), () => "#c8453c", null);
    c.part(ellipse(9, 9, 5.5, 5.5), (x, y) => (Math.hypot(x + 0.5 - 9, y + 0.5 - 9) < 1.5 ? "#6e4631" : "#f6c945"));
    for (let x = 5; x < 13; x++) c.set(x, 17, "#f6c945");
  } },
  pinboard: { w: 28, h: 20, draw(c) {
    c.part(rectS(0, 0, 28, 20), () => "#8a5a36");
    c.part(rectS(2, 2, 26, 18), () => "#c9a36a", null);
    [[4, 4, 8, 6, "#fbf6ea"], [14, 3, 6, 6, "#f6c945"], [21, 5, 4, 5, "#8cc8f0"], [6, 11, 7, 5, "#f06292"], [16, 11, 8, 5, "#fbf6ea"]].forEach(([x, y, w, h, col]) => {
      c.part(rectS(x, y, x + w, y + h), () => col, null); c.set(x + Math.floor(w / 2), y, "#e0584f");
    });
  } },
  // ---- lab
  microscope: { w: 16, h: 20, draw(c) {
    c.part(rectS(2, 16, 14, 20), bands(ramp("#e8ecf0"), 2, 14));
    c.part(limb([[10, 16], [10, 9], [7, 4]], 3), bands(ramp("#e8ecf0"), 5, 12));
    c.part(limb([[6, 4], [5, 1]], 2.2), () => "#3a3d44");
    c.part(rectS(3, 11, 11, 13), () => "#3a3d44");
    c.part(limb([[7, 7], [6, 11]], 1.6), () => "#9aa4b1");
  } },
  flasks: { w: 18, h: 12, draw(c) {
    c.part(union(polyS([[1.5, 11], [8.5, 11], [6, 5], [6, 2], [4, 2], [4, 5]]), ellipse(5, 11, 3.5, 0.9)), (x, y) => (y > 7.5 ? "#7fd1ff" : "#e8f4fb"));
    c.part(ellipse(5, 2, 1.4, 0.6), () => "#f4fbff");
    c.part(union(ellipse(13, 8.5, 3.6, 3.2), rectS(12, 1.5, 14, 6)), (x, y) => (y > 7.5 ? "#f06292" : "#e8f4fb"));
    c.part(ellipse(13, 1.6, 1.4, 0.6), () => "#f4fbff");
    c.set(11, 7, "#ffffff");
  } },
  extinguisher: { w: 8, h: 16, draw(c) {
    const r = ramp("#c8102e");
    c.part(union(ellipse(4, 6, 3, 1.6), rectS(1, 6, 7, 14.5), ellipse(4, 14.5, 3, 1)), bands(r, 1, 7));
    c.part(ellipse(4, 5.8, 2.2, 1), () => r[0], null);
    c.part(rectS(3, 1, 6, 4.5), () => "#3a3d44");
    c.part(limb([[5.5, 2], [7.5, 5], [7, 10]], 1), () => "#2b2e35", null);
    for (let x = 2; x < 6; x++) c.set(x, 10, "#fbf6ea");
  } },
  phantom: { w: 16, h: 10, draw(c) {
    c.part(ellipse(8, 8, 7.8, 1.9), () => "#c9cdd3");
    c.part(minus(ellipse(8, 8, 7, 7), rectS(0, 8, 16, 10)), sphere(ramp("#f06292"), 8, 8, 7, 7));
    c.part(minus(ellipse(8, 8, 7.8, 1.9), rectS(0, 0, 16, 8.4)), () => "#dfe3e8");
    c.set(5, 3, "#fbd0df"); c.set(6, 3, "#fbd0df");
  } },
  beaker: { w: 10, h: 12, draw(c) {
    c.part(union(rectS(1, 2, 9, 10.5), ellipse(5, 10.5, 4, 1.1)), (x, y) => (y >= 6.5 ? (x < 3 ? "#9fdcff" : "#5fb4e6") : "#e8f4fb"));
    c.part(ellipse(5, 6.6, 3.5, 0.9), () => "#bfe9ff", null);
    c.part(ellipse(5, 2, 4, 1.1), () => "#f4fbff");
    [4.5, 7.5].forEach((y) => c.set(7, Math.round(y), "#7d8792"));
    c.set(2, 4, "#ffffff");
  } },
  mouse: { w: 14, h: 7, draw(c) {
    c.part(limb([[2, 5], [0, 3]], 1), () => "#f4a7c0", null);
    c.part(ellipse(6, 4, 4.5, 2.6), sphere(ramp("#f4f4f4"), 6, 4, 4.5, 2.6));
    c.part(ellipse(10.5, 3.5, 2.6, 2.2), sphere(ramp("#f4f4f4"), 10.5, 3.5, 2.6, 2.2));
    c.part(ellipse(9.5, 1.5, 1.4, 1.4), () => "#f4a7c0");
    c.set(11, 3, O); c.set(13, 4, "#f06292");
  } },
  parrot: { w: 12, h: 18, draw(c) {
    c.part(polyS([[4, 12], [7, 12], [6, 18], [4, 18]]), (x, y) => (y > 15 ? "#3b82c4" : "#c8102e"));
    c.part(ellipse(6, 9.5, 3.8, 5), sphere(ramp("#3fa34d"), 6, 9.5, 3.8, 5));
    c.part(ellipse(6.5, 4, 3.4, 3.2), sphere(ramp("#3fa34d"), 6.5, 4, 3.4, 3.2));
    c.part(polyS([[8.5, 3], [11.5, 4.5], [8.5, 6]]), () => "#f6c945");
    c.set(7, 3, O); c.set(6, 4, "#f6c945");
    for (let y = 8; y < 13; y++) c.set(5, y, "#2d7a38");
  } },
  ...Object.fromEntries(["cat", "catB"].map((name, f) => [name, { w: 24, h: 18, draw(c) {
    const fur = ramp("#ef9a3c");
    c.part(limb([[6, 9], [2, 5], [3, 1]], 2.2), bands(fur, 1, 6));
    const far = f ? [[8, 12, 7, 16], [15, 13, 16, 17]] : [[8, 12, 9, 16], [15, 13, 14, 17]], near = f ? [[10, 13, 11, 17], [13, 14, 12, 17.5]] : [[10, 13, 9, 17], [13, 14, 14, 17.5]];
    far.forEach(([x0, y0, x1, y1]) => c.part(limb([[x0, y0], [x1, y1]], 2.2), () => fur[2]));
    c.part(union(ellipse(9, 9.5, 5, 3.6), ellipse(13.5, 11.5, 4.5, 3.4)), sphere(fur, 11, 10, 7, 4.5));
    near.forEach(([x0, y0, x1, y1]) => c.part(limb([[x0, y0], [x1, y1]], 2.4), bands(fur, x0 - 1, x0 + 2)));
    [[8, 7], [10, 7], [7, 9]].forEach(([x, y]) => { c.set(x, y, fur[3]); c.set(x + 1, y, fur[3]); });
    c.part(polyS([[15, 3], [17.5, 5.5], [15, 6.5]]), () => fur[1]); c.part(polyS([[21.5, 3], [22, 6.5], [19.5, 5.5]]), () => fur[1]);
    c.part(ellipse(18.5, 8.5, 4.3, 3.8), sphere(fur, 18.5, 8.5, 4.3, 3.8));
    c.set(17, 8, O); c.set(20, 8, O); c.set(18, 10, "#f06292"); c.set(19, 10, "#f06292"); c.set(18, 11, "#f8d9b8"); c.set(19, 11, "#f8d9b8");
  } }])),
  ...Object.fromEntries([["dog", "#b07a45", "#c8453c", "#6f4a2f"], ["pup", "#f3eee4", "#e86a9a", "#e2c7b0"]].flatMap(([base, coat, collar, ears]) => [base, base + "B"].map((name, f) => [name, { w: 28, h: 18, draw(c) {
    const fur = ramp(coat);
    c.part(limb([[6, 8], [3, 3]], 2.4), bands(fur, 2, 6));
    const far = f ? [[8, 12, 7, 16.5], [17, 13, 18, 17]] : [[8, 12, 9, 16.5], [17, 13, 16, 17]], near = f ? [[11, 13, 12, 17], [15, 14, 14, 17.5]] : [[11, 13, 10, 17], [15, 14, 16, 17.5]];
    far.forEach(([x0, y0, x1, y1]) => c.part(limb([[x0, y0], [x1, y1]], 2.6), () => fur[2]));
    c.part(union(ellipse(10, 9, 6, 4), ellipse(15.5, 11, 5.5, 3.8)), sphere(fur, 12.5, 10, 8, 5));
    c.part(ellipse(15, 12.5, 3, 1.8), () => "#f1e3cf", null);
    near.forEach(([x0, y0, x1, y1]) => c.part(limb([[x0, y0], [x1, y1]], 2.8), bands(fur, x0 - 1, x0 + 2)));
    c.part(limb([[18, 9.5], [22, 11]], 1.6), () => collar);
    c.part(ellipse(21.5, 7.5, 4.8, 4.2), sphere(fur, 21.5, 7.5, 4.8, 4.2));
    c.part(ellipse(23.5, 10.5, 2.8, 2), () => "#e7c9a0");
    c.part(polyS([[16.5, 5], [18.5, 4], [18.5, 11], [16.5, 10]]), () => ears); c.part(polyS([[25, 4], [27, 5], [27, 10], [25, 11]]), () => ears);
    c.set(20, 7, O); c.set(23, 7, O); c.set(24, 10, O); c.set(23, 10, O);
  } }]))),
  // Sam the turtle (aqua blue), walking to the right: a domed shell with its plates marked out and a pale rim, head on a stretched
  // neck, the legs stepping in turn (two frames).
  ...Object.fromEntries(["turtle", "turtleB"].map((name, f) => [name, { w: 24, h: 13, draw(c) {
    const skin = ramp("#8fdbe6"), shell = ramp("#3eaecb"); // aqua blue
    const far = f ? [[7, 9, 6, 12], [15, 9, 16.5, 12]] : [[7, 9, 8, 12], [15, 9, 14, 12]], near = f ? [[5.5, 9.5, 6.5, 12.5], [13.5, 9.5, 12.5, 12.5]] : [[5.5, 9.5, 4.5, 12.5], [13.5, 9.5, 14.5, 12.5]];
    far.forEach(([x0, y0, x1, y1]) => c.part(limb([[x0, y0], [x1, y1]], 3.4), () => skin[2]));
    c.part(polyS([[1.5, 8.5], [4.5, 7.5], [4.5, 9.8]]), () => skin[1]);
    c.part(limb([[16, 8], [19, 6.5]], 2.6), bands(skin, 16, 20));
    c.part(ellipse(20.2, 5.8, 3, 2.5), sphere(skin, 20.2, 5.8, 3, 2.5));
    c.part(minus(ellipse(10.5, 7.5, 7.5, 6), rectS(0, 9, 24, 13)), sphere(shell, 9, 5, 7.5, 6));
    c.part(rectS(3, 8, 18, 10), (x) => (x < 6 ? "#e2f7fa" : "#bfe7ef"), null);
    for (let x = 2; x < 19; x++) c.set(x, 10, O);
    for (let y = 3; y < 9; y++) { c.set(7, y, shell[3]); c.set(13, y, shell[3]); }
    for (let x = 5; x < 17; x++) c.set(x, 5, shell[3]);
    [[5, 3], [6, 2], [9, 2]].forEach(([x, y]) => c.set(x, y, shell[0]));
    near.forEach(([x0, y0, x1, y1]) => c.part(limb([[x0, y0], [x1, y1]], 3.6), bands(skin, x0 - 1.5, x0 + 2)));
    c.set(21, 5, O); c.set(22, 7, skin[3]); c.set(21, 7, skin[3]);
  } }])),
  // Snow girl: three balls of snow, coal eyes with lashes, rosy cheeks, a carrot nose, twig arms, and a red tartan scarf
  // (with a matching bow) wound round her neck, one end hanging down with a fringe.
  snowGirl: { w: 28, h: 46, draw(c) {
    const snow = ["#ffffff", "#eaf0f7", "#c7d3e2", "#a3b3c9"], twig = () => "#6f4a2f";
    const tartan = (x, y) => { const a = x % 4 === 1, b = y % 3 === 0; return a && b ? "#1f2d4f" : a || b ? "#8a0f22" : x % 8 === 3 && y % 3 === 1 ? "#f6c945" : "#c8102e"; };
    c.part(limb([[7, 22], [2, 15.5]], 1.4), twig, null); c.part(limb([[3.5, 17.5], [1, 18.5]], 1), twig, null);
    c.part(limb([[21, 22], [26, 15.5]], 1.4), twig, null); c.part(limb([[24.5, 17.5], [27, 18.5]], 1), twig, null);
    c.part(ellipse(14, 36, 11, 9), sphere(snow, 14, 36, 11, 9));
    c.part(ellipse(14, 22.5, 8, 7), sphere(snow, 14, 22.5, 8, 7));
    c.part(ellipse(14, 10.5, 6.5, 6), sphere(snow, 14, 10.5, 6.5, 6));
    [[12, 21], [12, 24], [12, 27]].forEach(([x, y]) => { c.set(x, y, O); c.set(x + 1, y, "#2b2e35"); });
    c.part(polyS([[7, 15], [21, 15], [21.5, 18.5], [6.5, 18.5]]), tartan);
    c.part(polyS([[16, 17], [19.5, 17], [20.5, 27], [17, 27]]), tartan);
    for (let x = 17; x < 21; x++) if (x % 2) c.set(x, 28, "#c8102e");
    // the bow, on the side of her head
    c.part(polyS([[5, 3], [10, 5.5], [5, 8.5]]), (x, y) => (y < 5 ? "#e0334f" : "#c8102e")); c.part(polyS([[15, 3], [10, 5.5], [15, 8.5]]), () => "#a30d25");
    c.part(rectS(9, 4.5, 11, 6.5), () => "#7a0b1c", null);
    // round coal eyes with a glint, lashes at the outer corners, rosy cheeks
    for (const ex of [10, 16]) { c.set(ex, 9, O); c.set(ex + 1, 9, O); c.set(ex, 10, O); c.set(ex + 1, 10, O); c.set(ex, 9, "#6b7280"); }
    c.set(9, 8, O); c.set(18, 8, O);
    c.set(9, 11, "#f4a7c0"); c.set(10, 12, "#f4a7c0"); c.set(18, 12, "#f4a7c0"); c.set(19, 11, "#f4a7c0");
    // the carrot nose, pointing to the right
    c.part(polyS([[13.5, 10.5], [19.5, 12], [13.5, 13]]), (x, y) => (y > 11.5 ? "#c9611a" : "#f28c28"), null);
    [[11, 14], [12, 15], [14, 15], [15, 14]].forEach(([x, y]) => c.set(x, y, "#2b2e35"));
  } },
  ...Object.fromEntries([["flowerP", "#f06292"], ["flowerR", "#e0584f"]].map(([name, col]) => [name, { w: 8, h: 12, draw(c) {
    c.part(limb([[4, 6], [4, 11]], 1), () => "#2d7a38", null);
    c.part(ellipse(2, 9, 1.8, 1), () => "#3fa34d", null);
    c.part(ellipse(4, 3.5, 3.5, 3.2), sphere(ramp(col), 4, 3.5, 3.5, 3.2));
    c.set(4, 3, "#f6c945"); c.set(3, 3, "#f6c945");
  } }])),
  // A beanbag seen from the front-right: a big soft sack with a dent where you sit, seams and a highlight.
  beanbag: { w: 26, h: 18, draw(c) {
    const r = ramp("#e0584f");
    c.part(union(ellipse(13, 12, 12.5, 6), ellipse(10, 7.5, 8, 6.5)), (x, y) => { const d = ((x + 0.5 - 9) / 9) ** 2 + ((y + 0.5 - 6) / 6) ** 2; return y > 14.5 ? r[3] : x > 17 || y > 12 ? r[2] : d < 0.25 ? r[0] : r[1]; });
    c.part(ellipse(14, 10.5, 5.5, 2.4), (x, y) => (y < 10 ? r[2] : r[1]), null);            // the dent
    for (let x = 4; x < 23; x += 1) c.set(x, Math.round(12.5 + Math.sin(x / 3) * 0.6), x % 3 ? r[2] : r[3]); // a seam
    [[6, 5], [7, 4], [8, 4]].forEach(([x, y]) => c.set(x, y, "#f7b0a8"));
  } },
  // Coats hanging from a hook: collar, sleeve, folds; and a straw hat.
  ...Object.fromEntries([["coatBlue", "#34507f"], ["coatRust", "#b5533a"]].map(([name, col]) => [name, { w: 12, h: 30, draw(c) {
    const r = ramp(col);
    c.part(polyS([[5, 1], [7, 1], [10, 5], [11.5, 29], [0.5, 29], [2, 5]]), (x, y) => (x < 4 ? r[2] : x > 8 ? r[2] : r[1]));
    c.part(polyS([[3, 3], [6, 6], [9, 3], [8.5, 8], [6, 9], [3.5, 8]]), () => r[0]);           // the collar
    c.part(limb([[9.5, 7], [10.5, 24]], 2.4), (x, y) => r[2]);                                  // a sleeve
    for (let y = 11; y < 28; y++) { c.set(6, y, r[3]); if (y % 5 === 0) c.set(5, y, r[3]); }  // front edge, buttons
    c.set(5, 0, "#2b1a10"); c.set(6, 0, "#2b1a10");
  } }])),
  hatStraw: { w: 14, h: 8, draw(c) {
    const r = ramp("#d9b25a");
    c.part(ellipse(7, 6, 6.8, 1.8), (x, y) => (y > 6 ? r[2] : r[1]));
    c.part(union(ellipse(7, 3.5, 4, 3), rectS(3, 3.5, 11, 5.5)), (x, y) => (x < 5 ? r[0] : r[1]));
    for (let x = 3; x < 11; x++) c.set(x, 4, "#8a4a2a");
  } },
  robot: { w: 26, h: 40, draw(c) {
    c.part(limb([[21, 22], [24, 30]], 3), () => "#8d96a0");
    const B = isoBox(c, 13, 18, 10, 10, 11, "#c9cdd3");
    c.part(polyS([[5, 25], [10, 27.5], [10, 33], [5, 30.5]]), () => "#3b82c4");
    c.set(7, 28, "#8cc8f0"); c.set(8, 29, "#f6c945");
    c.part(limb([[3, 25], [1, 33]], 3), () => "#aab3bd");
    [[6, 36], [12, 38.5]].forEach(([x, y]) => c.part(ellipse(x, y, 2.2, 1.4), () => "#3a3f4b"));
    isoBox(c, 13, 2, 9, 9, 10, "#d9dde2");
    c.part(polyS([[5.5, 8.5], [11.5, 11.5], [11.5, 18.5], [5.5, 15.5]]), () => "#10261a");
    [[7, 11], [8, 11], [10, 12], [10, 13], [7, 12]].forEach(([x, y]) => c.set(x, y, "#39ff88"));
    [[7, 15], [8, 15.5], [9, 16], [10, 16.5]].forEach(([x, y]) => c.set(x, Math.round(y), "#39ff88"));
    c.part(limb([[13, 3], [13, 0.5]], 1.2), () => "#8a8f98", null);
  } },
  cafeSign: { w: 38, h: 14, draw(c) {
    c.part(rectS(0, 0, 38, 14), () => "#c8102e");
    c.part(rectS(2, 2, 36, 12), () => "#fbf6ea", null);
    "CAFE".split("").forEach((ch, i) => LETTERS[ch].forEach((row, y) => [...row].forEach((p, x) => p === "#" && c.set(8 + i * 6 + x, 4 + y, "#2b1d16"))));
  } },
  iconShield: { w: 24, h: 24, draw(c) {
    c.part(polyS([[2, 1], [22, 1], [22, 12], [12, 23], [2, 12]]), bands(ramp("#3b82c4"), 2, 22));
    c.part(polyS([[7, 5], [17, 5], [17, 7], [11, 7], [14, 11], [11, 15], [17, 15], [17, 17], [7, 17], [7, 15.5], [10.5, 11], [7, 6.5]]), () => "#ffffff", null);
  } },
};

const PROP_IMAGES = new Map();
function propImage(name) {
  if (!PROP_IMAGES.has(name)) {
    const p = PROPS[name], c = makeCanvas(p.w, p.h, 1);
    p.draw(c);
    PROP_IMAGES.set(name, toImage(c.px, p.w, p.h));
  }
  return PROP_IMAGES.get(name);
}
const propImg = (name, x = 0, y = 0) => imageTag(propImage(name), x, y);
// Several props of the same size side by side in one picture (an animal's walking frames), see joinFrames in avatar.js.
const PROP_STRIPS = new Map();
function propStrip(names) {
  const key = names.join(",");
  if (!PROP_STRIPS.has(key)) {
    const { w, h } = PROPS[names[0]];
    PROP_STRIPS.set(key, joinFrames(names.map((n) => { const c = makeCanvas(w, h, 1); PROPS[n].draw(c); return c.px; }), w, h));
  }
  return PROP_STRIPS.get(key);
}
// A prop's silhouette in one colour: the visible thickness of a wall piece (see prop3 in furni.js).
const PROP_SHADOWS = new Map();
function propShadow(name, col) {
  const key = name + col;
  if (!PROP_SHADOWS.has(key)) {
    const p = PROPS[name], c = makeCanvas(p.w, p.h, 1);
    p.draw(c);
    PROP_SHADOWS.set(key, toImage(c.px.map((q) => (q ? col : null)), p.w, p.h));
  }
  return PROP_SHADOWS.get(key);
}
