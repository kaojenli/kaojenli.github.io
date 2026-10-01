// Furniture kit for the cabin, in the spirit of Habbo furni: pieces built from cabin.js's iso helpers (box, faces,
// planes) with small parts and 1px details: legs, raised door panels, knobs, cushions, worktops, items on top.
// Positions are in tiles, heights in units (a storey is 64, a person 32). Everything here is a function that runs
// while the scene is drawn, so it can use cabin.js's helpers. `front` says which face shows the fronts of doors and
// drawers: "L" is the +y face (a piece standing against a back wall), "R" the +x face (against a left wall).
const PALS = new Map();
function pal(hex, mat) {
  if (!PALS.has(hex)) { const r = ramp(hex); PALS.set(hex, [r[0], r[1], r[2], r[3]]); }
  const p = PALS.get(hex);
  if (mat) MATERIAL.set(p, mat);
  return p;
}
const FC = { walnut: "#70452d", oak: "#a86d3c", pine: "#c99155", cream: "#e9dcc2", linen: "#f3eee4", charcoal: "#3b3e46", iron: "#2b2e35", brass: "#d9a441",
  sage: "#86a07a", rust: "#b5533a", navy: "#34507f", plum: "#7b4a86", white: "#eef0ee", steel: "#b8bfc7", red: "#c8453c", teal: "#3f8f8a", mustard: "#d6a53a" };
const LITE = "rgba(255,255,255,.38)", SHADE = "rgba(0,0,0,.3)";
const onL = (x, y, w, d, z, f) => leftFace(x, y, d, z, f(w * 16));
const onR = (x, y, w, d, z, f) => rightFace(x, y, w, d, z, f(d * 16));
const onFront = (front, x, y, w, d, z, f) => (front === "L" ? onL : onR)(x, y, w, d, z, f);
// A raised panel on a face (u along, v up): lit top and left edges, shaded bottom and right.
// ---------- the fireplace's rules, for every object: an opening is a real recess (its far inner side and floor showing,
// the back darker, a shadow under the top edge, contents standing inside); a round thing is a cylinder; a handle, knob,
// lens or dial stands out from its face. Face coordinates: u along the face, v up. face "L" is a +y face (depth runs up-
// right), "R" a +x face (depth runs up-left); on a face, slab3's wall "back" is the L orientation and "left" the R one.
function hole(u, v, w, h, d, { face = "L", back = "#1a120c", side = "#3a2a20", floor = "#4a3626", art = "", inside = "" } = {}) {
  const P = (pts, fill) => `<polygon points="${pts.map((q) => q.join(",")).join(" ")}" fill="${fill}"/>`;
  const walls = face === "L"
    ? P([[u, v], [u + d, v + d], [u + d, v + h], [u, v + h]], side) + P([[u, v], [u + w, v], [u + w, v + d], [u + d, v + d]], floor)
    : P([[u + w, v], [u + w - d, v + d], [u + w - d, v + h], [u + w, v + h]], side) + P([[u, v], [u + w, v], [u + w - d, v + d], [u, v + d]], floor);
  return rect(u, v, w, h, back) + art + walls + inside + rect(u, v + h - 1.2, w, 1.2, "rgba(0,0,0,.35)") + rect(u, v, w, h, "none", ` stroke="${INK}" stroke-width="0.5"`);
}
const wallOf = (face) => (face === "L" ? "back" : "left");
// A round knob, dial or lens standing t out of a face: its side as a short tube, then its front.
const stud = (u, v, r, t, col, face = "L", front = "") => {
  const s = face === "L" ? -1 : 1, fu = u + s * t, fv = v - t, p = pal(col);
  return `<line x1="${u}" y1="${v}" x2="${fu}" y2="${fv}" stroke="${p[3]}" stroke-width="${2 * r}" stroke-linecap="round"/>` +
    `<circle cx="${fu}" cy="${fv}" r="${r}" fill="${p[1]}" stroke="${INK}" stroke-width="0.4"/>` + front.replace(/\{cx\}/g, fu).replace(/\{cy\}/g, fv) + `<circle cx="${fu - r * 0.35}" cy="${fv + r * 0.35}" r="${r * 0.3}" fill="rgba(255,255,255,.6)"/>`;
};
const lensStud = (u, v, face = "L") => stud(u, v, 1.9, 1.6, "#3a3d44", face, `<circle cx="{cx}" cy="{cy}" r="1.2" fill="#3b82c4"/>`);
// A book standing in a shelf, its spine f in from the front: the spine, its top (the pages) and the side you can see.
function book3(u, v, bw, bh, dd, col, face = "L", f = 1) {
  const s = face === "L" ? 1 : -1, r = pal(col), a = u + s * f, b = v + f, e = face === "L" ? a + bw : a;
  const P = (pts, fill) => `<polygon points="${pts.map((q) => q.join(",")).join(" ")}" fill="${fill}" stroke="${INK}" stroke-width="0.3"/>`;
  return P([[e, b], [e + s * dd, b + dd], [e + s * dd, b + bh + dd], [e, b + bh]], r[2]) + P([[a, b + bh], [a + bw, b + bh], [a + bw + s * dd, b + bh + dd], [a + s * dd, b + bh + dd]], "#efe6cf") +
    rect(a, b, bw, bh, r[1], ` stroke="${INK}" stroke-width="0.3"`) + rect(a, b + bh * 0.62, bw, 0.6, r[0]);
}
// A basin sunk t into a horizontal surface at height z (world coordinates): the bottom, and the two far inner walls.
let clipCount = 0;
function basin(x, y, w, d, z, t, { wall = "#c3cbd3", wallDark = "#9aa4ad", bottom = "#d9e0e6", art = "" } = {}) {
  const id = `clip${clipCount++}`, o = [iso(x, y), iso(x + w, y), iso(x + w, y + d), iso(x, y + d)].map((p) => up(p, z)), dn = ([a, b]) => [a, b + t];
  const P = (pts, fill, extra = "") => `<polygon points="${pts.join(" ")}" fill="${fill}"${extra}/>`;
  return `<clipPath id="${id}">${P(o, "#000")}</clipPath><g clip-path="url(#${id})">${P(o.map(dn), bottom)}${art}${P([o[0], o[1], dn(o[1]), dn(o[0])], wall)}${P([o[3], o[0], dn(o[0]), dn(o[3])], wallDark)}</g>` +
    P(o, "none", ` stroke="${INK}" stroke-width="0.5"`);
}
// A cup on a saucer: a cylinder with the drink inside and a handle.
const cup3 = (x, y, z, col = "#f4f1ea", drink = "#5a3822") => { const [cx, cy] = up(iso(x, y), z + 2.6);
  return disc(x, y, 0.07, z, 0.4, "#e8e2d6") + disc(x, y, 0.045, z + 0.4, 2.2, col) + `<ellipse cx="${cx}" cy="${cy}" rx="0.7" ry="0.33" fill="${drink}"/>` +
    `<path d="M${cx + 1},${cy + 0.5} q1.3,0.4 0,1.5" fill="none" stroke="${INK}" stroke-width="1"/><path d="M${cx + 1},${cy + 0.5} q1.3,0.4 0,1.5" fill="none" stroke="${col}" stroke-width="0.4"/>`; };
const panelF = (u, v, w, h) => rect(u, v, w, 0.5, SHADE) + rect(u + w - 0.5, v, 0.5, h, SHADE) + rect(u, v + h - 0.5, w, 0.5, LITE) + rect(u, v, 0.5, h, LITE);
const knob = (u, v, c = FC.brass, face = "L") => stud(u + 0.6, v + 0.6, 0.65, 0.8, c, face);
const pull = (u, v, w, face = "L", c = FC.brass) => slab3(u, v, w, 0.8, 0.8, c, "", wallOf(face));

// ---------- legs, tables, chairs, stools
const legs = (x, y, w, d, h, c, t = 0.07) => [[x, y], [x + w - t, y], [x, y + d - t], [x + w - t, y + d - t]].map(([a, b]) => box(a, b, t, t, h, c)).join("");
function tableF(x, y, w, d, { h = 12, wood = FC.oak } = {}) {
  const c = pal(wood, "wood");
  return legs(x + 0.06, y + 0.06, w - 0.12, d - 0.12, h - 1.5, c) + box(x, y, w, d, 1.5, c, h - 1.5);
}
// A disc (round top) of radius r tiles at height z, t thick.
function disc(x, y, r, z, t, col) {
  const [cx, cy] = iso(x, y), rx = r * 22.6, ry = r * 11.3, p = pal(col);
  return `<ellipse cx="${cx}" cy="${cy - z}" rx="${rx}" ry="${ry}" fill="${p[2]}" stroke="${INK}" stroke-width="0.5"/>` + rect(cx - rx, cy - z - t, 2 * rx, t, p[1]) +
    rect(cx - rx - 0.25, cy - z - t, 0.5, t, INK) + rect(cx + rx - 0.25, cy - z - t, 0.5, t, INK) +
    `<ellipse cx="${cx}" cy="${cy - z - t}" rx="${rx}" ry="${ry}" fill="${p[0]}" stroke="${INK}" stroke-width="0.5"/>` +
    `<ellipse cx="${cx - rx * 0.3}" cy="${cy - z - t - ry * 0.3}" rx="${rx * 0.35}" ry="${ry * 0.25}" fill="rgba(255,255,255,.25)"/>`;
}
const roundTable = (x, y, { r = 0.32, h = 12, wood = FC.walnut } = {}) =>
  disc(x, y, 0.16, 0, 1, FC.iron) + box(x - 0.04, y - 0.04, 0.08, 0.08, h - 1.5, pal(FC.iron)) + disc(x, y, r, h - 1.5, 1.5, wood);
const stool = (x, y, { h = 9, seat = FC.red, wood = FC.walnut } = {}) =>
  legs(x - 0.13, y - 0.13, 0.26, 0.26, h - 1.5, pal(wood), 0.05) + disc(x, y, 0.17, h - 1.5, 1.5, seat);
// Chair with a slatted back. face: which way the sitter looks ("down" = +y, "right" = +x, "up" = -y, "left" = -x).
function chairF(x, y, face = "down", { wood = FC.oak, seat = null } = {}) {
  const s = 0.42, c = pal(wood, "wood"), sc = seat ? pal(seat, "fabric") : c, t = 0.07;
  const L = legs(x, y, s, s, 6.5, c, 0.06), S = box(x, y, s, s, 1.5, sc, 6.5);
  const slats = (len) => [0.3, 0.55].map((f) => rect(len * f, 2, 1, 5, SHADE)).join("");
  const back = {
    down: box(x, y, s, t, 10, c, 8) + onL(x, y, s, t, 8, slats), right: box(x, y, t, s, 10, c, 8) + onR(x, y, t, s, 8, slats),
    up: box(x, y + s - t, s, t, 10, c, 8) + onL(x, y + s - t, s, t, 8, slats), left: box(x + s - t, y, t, s, 10, c, 8) + onR(x + s - t, y, t, s, 8, slats),
  }[face];
  return face === "up" || face === "left" ? L + S + back : L + back + S;
}
function officeChair(x, y, face = "down", col = FC.charcoal) {
  const c = pal(col, "fabric"), m = pal(FC.iron), [cx, cy] = iso(x + 0.21, y + 0.21);
  const star = [[-7, 0], [7, 0], [0, -3.5], [0, 3.5]].map(([dx, dy]) => `<line x1="${cx}" y1="${cy}" x2="${cx + dx}" y2="${cy + dy}" stroke="${INK}" stroke-width="1.2"/>`).join("");
  const back = { down: box(x + 0.04, y, 0.34, 0.08, 11, c, 9), right: box(x, y + 0.04, 0.08, 0.34, 11, c, 9), up: box(x + 0.04, y + 0.34, 0.34, 0.08, 11, c, 9), left: box(x + 0.34, y + 0.04, 0.08, 0.34, 11, c, 9) }[face];
  const seat = box(x, y, 0.42, 0.42, 2.5, c, 6.5);
  return star + box(x + 0.18, y + 0.18, 0.06, 0.06, 6.5, m) + (face === "up" || face === "left" ? seat + back : back + seat);
}

// ---------- sofas, armchairs, beds
// Sofa `len` tiles long, 0.9 deep. face "down": seat looks +y, back along the far side; "right": looks +x; "up"/"left": we see its back.
// Upholstery details drawn on top of a box's parts. puffTop: a cushion's top swelling up in the middle (a lighter
// rounded pad, a highlight, a seam round the edge). rollTop: an arm or back rounded along its length (a light ridge,
// a darker far edge). piping: a light line just under the top of a front face, a crease near the bottom.
const puffTop = (x0, y0, w, d, z, p) => raised(z, `<rect x="${x0 + w * 0.08}" y="${y0 + d * 0.1}" width="${w * 0.84}" height="${d * 0.8}" rx="${Math.min(w, d) * 0.25}" fill="${p[0]}" opacity=".7"/>` +
  `<rect x="${x0 + w * 0.22}" y="${y0 + d * 0.25}" width="${w * 0.3}" height="${d * 0.22}" rx="${Math.min(w, d) * 0.1}" fill="#ffffff" opacity=".25"/>` +
  `<rect x="${x0 + 0.02}" y="${y0 + 0.02}" width="${w - 0.04}" height="${d - 0.04}" rx="${Math.min(w, d) * 0.2}" fill="none" stroke="${p[2]}" stroke-width="0.025"/>`);
const rollTop = (x0, y0, w, d, z, p) => raised(z, w >= d ? rect(x0, y0 + d * 0.3, w, d * 0.3, p[0]) + rect(x0, y0, w, d * 0.14, p[2]) : rect(x0 + w * 0.3, y0, w * 0.3, d, p[0]) + rect(x0, y0, w * 0.14, d, p[2]));
const piping = (L, h, p) => rect(0, h - 1.2, L, 0.6, p[0]) + rect(0, 0.6, L, 0.5, "rgba(0,0,0,.18)");
function sofa(x, y, len, face = "down", { col = FC.cream, cushion = null, pillows = [] } = {}) {
  const c = pal(col, "fabric"), cc = pal(cushion || col, "fabric"), D = 0.9, along = face === "down" || face === "up";
  const n = Math.max(1, Math.round((len - 0.36) / 0.62)), cw = (len - 0.36) / n;
  const B = (a, b, l, dd, h, p, z) => (along ? box(x + a, y + b, l, dd, h, p, z) : box(x + b, y + a, dd, l, h, p, z)); // a along the sofa, b across it
  const backAt = face === "down" || face === "right" ? 0 : D - 0.28, seatAt = face === "down" || face === "right" ? 0.28 : 0.02;
  const feet = [0.05, len - 0.13].flatMap((a) => [0.05, D - 0.13].map((b) => B(a, b, 0.08, 0.08, 1.5, pal(FC.walnut)))).join("");
  const base = B(0, 0.02, len, D - 0.04, 4.5, c, 1.5);
  const back = B(0, backAt, len, 0.28, 15, c, 1.5) + rollTop(...(along ? [x, y + backAt, len, 0.28] : [x + backAt, y, 0.28, len]), 16.5, c);
  // F: a part's footprint in world terms, for the tops and fronts drawn over it
  const F = (a, b, l, dd) => (along ? [x + a, y + b, l, dd] : [x + b, y + a, dd, l]);
  const front = (a, b, l, dd, z, fn) => { const [fx, fy, fw, fd] = F(a, b, l, dd); return along ? leftFace(fx, fy, fd, z, fn(fw * 16)) : rightFace(fx, fy, fw, fd, z, fn(fd * 16)); };
  const seats = Array.from({ length: n }, (_, i) => { const a = 0.18 + i * cw + 0.01;
    return B(a, seatAt, cw - 0.02, 0.6, 3, cc, 6) + puffTop(...F(a, seatAt, cw - 0.02, 0.6), 9, cc) + front(a, seatAt, cw - 0.02, 0.6, 6, (L) => piping(L, 3, cc)); }).join("");
  const bAt = face === "down" || face === "right" ? 0.28 : D - 0.46;
  const backCush = Array.from({ length: n }, (_, i) => { const a = 0.18 + i * cw + 0.01;
    return B(a, bAt, cw - 0.02, 0.18, 8, cc, 9) + puffTop(...F(a, bAt, cw - 0.02, 0.18), 17, cc) +
      front(a, bAt, cw - 0.02, 0.18, 9, (L) => piping(L, 8, cc) + `<circle cx="${L / 2}" cy="4.5" r="0.7" fill="${cc[2]}"/>`); }).join("");
  const arm = (a) => B(a, 0.02, 0.18, D - 0.04, 11, c, 1.5) + rollTop(...F(a, 0.02, 0.18, D - 0.04), 12.5, c) + front(a, 0.02, 0.18, D - 0.04, 1.5, (L) => piping(L, 11, c));
  const armA = arm(0), armB = arm(len - 0.18);
  const pil = pillows.map(([a, name]) => { const [px, py] = along ? [x + a, y + seatAt + 0.12] : [x + seatAt + 0.12, y + a]; return onFloor(px, py, 9, name || "pillow"); }).join("");
  return face === "down" || face === "right" ? feet + base + back + armA + backCush + seats + pil + armB : feet + base + armA + seats + backCush + back + armB;
}
const armchair = (x, y, face, opts) => sofa(x, y, 0.8, face, opts);

// ---------- cabinets, worktops, shelves, desks
// Base cabinets (doors, drawers, kick plate) under a worktop; with drawers: false they are plain door cabinets (uppers, sideboards).
function cabinets(x, y, w, d, { h = 14, z = 0, body = FC.cream, top = FC.charcoal, front = "L", doors = null, drawers = true, worktop = true } = {}) {
  const c = pal(body), len = (front === "L" ? w : d) * 16, n = doors || Math.max(1, Math.round(len / 9)), dw = len / n, hb = worktop ? h - 1.5 : h;
  const face = () => {
    let s = z === 0 ? rect(0, 0, len, 1.8, SHADE) : "";
    for (let k = 0; k < n; k++) {
      const u = k * dw + 0.75, v0 = z === 0 ? 2.6 : 1;
      if (drawers) s += panelF(u, hb - 4, dw - 1.5, 3) + pull(u + dw / 2 - 1.75, hb - 3, 2, front);
      const top = drawers ? hb - 4.8 : hb - 1;
      s += panelF(u, v0, dw - 1.5, top - v0) + knob(k % 2 ? u + 1 : u + dw - 3.5, Math.min(top - 2.5, v0 + 3), FC.brass, front);
    }
    return s;
  };
  return box(x, y, w, d, hb, c, z) + onFront(front, x, y, w, d, z, face) + (worktop ? box(x - 0.03, y - 0.03, w + 0.06, d + 0.06, 1.5, pal(top), z + hb) : "");
}
// A professional two-group espresso machine on a counter at height z, its front toward +y: a polished steel body on
// feet with red enamel side panels, a cup-warmer rail on top with cups on it, two group heads with portafilters whose
// black handles stick out, pressure gauges, a row of buttons, a recessed drip-tray bay with cups under the groups, and a
// steam wand over a milk jug. Returns the steam wand's tip (screen point) for the steam to rise from.
function espresso(x, y, z) {
  const W = 1.2, D = 0.5, Hb = 12, zb = z + 0.8, steel = pal("#cfd4da", "metal"), black = pal("#2b2b30"), L = W * 16;
  const groups = [x + W * 0.3, x + W * 0.66];
  const front = (Lf) => {
    const grate = [1, 2, 3].map((t) => rect(2 + t, 0.6 + t, Lf - 4 - t, 0.3, "#5a6068")).join("");
    return hole(2, 0.6, Lf - 4, 5, 4, { back: "#1c1e22", side: "#3a3d44", floor: "#8a9099", inside: grate }) +
      rect(1.5, Hb - 2.6, Lf - 3, 1.6, "#c8453c") + [0, 1, 2, 3, 4].map((k) => rect(Lf / 2 - 4 + k * 1.8, Hb - 2.2, 1, 0.8, "#f3e2c0")).join("") +
      [4, Lf - 4].map((u) => stud(u, 9.2, 1.5, 0.8, "#e8ecef", "L", `<circle cx="{cx}" cy="{cy}" r="1.1" fill="#fbfbf6"/><line x1="{cx}" y1="{cy}" x2="${u - 0.2}" y2="${9.2 - 0.8 + 0.9}" stroke="#c8102e" stroke-width="0.35"/>`)).join("") +
      [7, 8.6, 10.2, 11.8].map((u, i) => stud(u, 9.2, 0.55, 0.5, ["#39ff88", "#e8ecef", "#e8ecef", "#f7a21b"][i], "L")).join("");
  };
  let s = legs(x + 0.06, y + 0.06, W - 0.12, D - 0.12, 0.8, black, 0.06) + box(x, y, W, D, Hb, steel, zb) + onL(x, y, W, D, zb, front) +
    rightFace(x, y, W, D, zb, rect(0.8, 1, D * 16 - 1.6, Hb - 2, "#c8453c") + rect(0.8, Hb - 2.2, D * 16 - 1.6, 0.8, "rgba(255,255,255,.35)") + rect(0.8, 1, D * 16 - 1.6, 0.6, "rgba(0,0,0,.2)"));
  // cups on the drip tray, set back in the bay under each group
  s += groups.map((gx) => cup3(gx, y + D - 0.14, zb + 0.6)).join("");
  // group heads and portafilters in front of the face, handles pointing at the viewer
  s += groups.map((gx) => { const gz = zb + 6.4;
    return box(gx - 0.08, y + D, 0.16, 0.06, 1.6, steel, gz) + disc(gx, y + D + 0.05, 0.075, gz - 1.3, 1.3, "#9aa1a8") +
      box(gx - 0.025, y + D + 0.1, 0.05, 0.26, 1, black, gz - 1.1) + disc(gx, y + D + 0.37, 0.03, gz - 1.1, 1, "#2b2b30"); }).join("");
  // cup warmer on top: a rail on four posts and cups resting there
  const zt = zb + Hb;
  s += [[0.05, 0.05], [W - 0.09, 0.05], [0.05, D - 0.09], [W - 0.09, D - 0.09]].map(([dx, dy]) => box(x + dx, y + dy, 0.04, 0.04, 2.2, steel, zt)).join("") +
    [0.2, 0.42, 0.64, 0.86].map((dx, i) => cup3(x + dx, y + 0.22 + (i % 2) * 0.08, zt)).join("") +
    box(x + 0.05, y + 0.05, W - 0.1, 0.04, 0.5, steel, zt + 2.2) + box(x + 0.05, y + D - 0.09, W - 0.1, 0.04, 0.5, steel, zt + 2.2) + box(x + 0.05, y + 0.05, 0.04, D - 0.1, 0.5, steel, zt + 2.2) + box(x + W - 0.09, y + 0.05, 0.04, D - 0.1, 0.5, steel, zt + 2.2);
  // steam wand from the right front corner down over a milk jug on the counter; a hot-water spout on the left
  const a = up(iso(x + W - 0.1, y + D + 0.02), zb + 8.5), b = up(iso(x + W + 0.05, y + D + 0.12), zb + 3.6);
  s += box(x + W + 0.0, y + D + 0.05, 0.1, 0.1, 0.6, pal("#9aa1a8"), z) + disc(x + W + 0.05, y + D + 0.1, 0.06, z, 3.6, "#dfe4e9") +
    `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/><line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="#dfe4e9" stroke-width="0.7" stroke-linecap="round"/>` +
    box(x + 0.08, y + D, 0.05, 0.08, 2.5, steel, zb + 5.5);
  return { svg: s, steam: b };
}
// A coffee grinder: a dark body with a spout, a hopper of beans on top with a lid.
const grinder = (x, y, z) => box(x, y, 0.24, 0.26, 7, pal("#2b2b30"), z) + onL(x, y, 0.24, 0.26, z, (L) => rect(1, 5, L - 2, 1.2, "#c8453c") + hole(1.2, 0.6, L - 2.4, 3, 2, { back: "#111", side: "#2b2b30", floor: "#3a3d44" })) +
  disc(x + 0.12, y + 0.13, 0.09, z + 7, 5.5, "#6f4a2f") + raised(z + 12.5, [[0.08, 0.1], [0.14, 0.15], [0.1, 0.18]].map(([a, b]) => rect(x + a, y + b, 0.03, 0.02, "#3a2416")).join("")) +
  disc(x + 0.12, y + 0.13, 0.1, z + 12.5, 0.8, "#2b2b30");
// A tip jar: a glass cylinder with coins and a note.
const tipJar = (x, y, z) => disc(x, y, 0.07, z, 1.5, "#d9a441") + disc(x, y, 0.07, z + 1.5, 3, "rgba(210,235,250,.55)") + (() => { const [a, b] = up(iso(x, y), z + 3); return rect(a - 1, b, 2, 1.4, "#7fbf4a"); })();
// Things standing on a worktop / shelf at height z: [[dx, dy, prop], ...] relative to (x, y).
const onTop = (x, y, z, list) => list.map(([dx, dy, name]) => onFloor(x + dx, y + dy, z, name)).join("");
// Bookcase: each shelf a recess (dark back, the far side panel and the board showing), books standing in it as solids
// (spines, page tops, covers), now and then a lying stack.
function shelves(x, y, w, d, { h = 40, z = 0, wood = FC.walnut, front = "L", rows = null } = {}) {
  const c = pal(wood, "wood"), len = (front === "L" ? w : d) * 16, dep = (front === "L" ? d : w) * 16 - 1.5, R = rows || Math.max(2, Math.floor((h - 4) / 11));
  const face = () => {
    const gap = (h - 4.5) / R;
    let s = "";
    for (let k = 0; k < R; k++) {
      const v = 1.5 + k * gap, oh = gap - 1.5, books = [];
      for (let u = 3; u < len - 4;) {
        const col = pickSeeded(["#c8453c", "#3b6fb6", "#e9c46a", "#4f9a3c", "#d9828f", "#f3eee4", "#7b4a86", "#2f4a6a"]);
        if (rnd() < 0.14 && u < len - 9) { books.push(book3(u, v + 1.5, 5.5, 1.4, 3.5, col, front) + book3(u + 0.4, v + 2.9, 4.8, 1.3, 3.5, pickSeeded(["#86a07a", "#e9c46a", "#3b6fb6"]), front)); u += 7; continue; }
        const bw = pickSeeded([1.5, 2, 2, 2.5]);
        books.push(book3(u, v + 1.5, bw, oh - 5.5 - pickSeeded([0, 0.5, 1, 1.5]), 3.5, col, front));
        u += bw + (rnd() < 0.1 ? 1.5 : 0);
      }
      s += rect(1.5, v, len - 3, 1.5, c[1]) + rect(1.5, v + 1.2, len - 3, 0.3, LITE) +
        hole(1.5, v + 1.5, len - 3, oh, dep, { face: front, back: "#24160c", side: front === "L" ? c[2] : c[1], floor: c[0], inside: (front === "L" ? books : books.reverse()).join("") });
    }
    return s + rect(1.5, h - 3, len - 3, 1.5, c[1]);
  };
  return box(x, y, w, d, h, c, z) + onFront(front, x, y, w, d, z, face);
}
// Desk: top, a drawer pedestal on one end, legs on the other.
function desk(x, y, w, d, { h = 12, wood = FC.oak, front = "L", pedestal = "end" } = {}) {
  const c = pal(wood, "wood"), along = front === "L";
  const ped = along ? [x + w - 0.5, y + 0.04, 0.46, d - 0.08] : [x + 0.04, y + d - 0.5, w - 0.08, 0.46];
  const legsAt = along ? legs(x + 0.05, y + 0.05, 0.4, d - 0.1, h - 1.5, c) : legs(x + 0.05, y + 0.05, w - 0.1, 0.4, h - 1.5, c);
  const pedFace = () => [0, 1, 2].map((k) => panelF(1, 1 + k * 3.3, 6.2, 3) + pull(3.4, 2.3 + k * 3.3, 1.8, front)).join("");
  return legsAt + box(...ped, h - 1.5, c) + onFront(front, ...ped, 0, pedFace) + box(x, y, w, d, 1.5, c, h - 1.5);
}
// Monitor on a stand, screen toward +y (L) or +x (R).
function monitor(x, y, w, z, screen, front = "L") {
  const st = front === "L" ? box(x + w / 2 - 0.12, y + 0.02, 0.24, 0.14, 0.8, CASE, z) + box(x + w / 2 - 0.04, y + 0.06, 0.08, 0.06, 2.5, CASE, z)
    : box(x + 0.02, y + w / 2 - 0.12, 0.14, 0.24, 0.8, CASE, z) + box(x + 0.06, y + w / 2 - 0.04, 0.06, 0.08, 2.5, CASE, z);
  return st + (front === "L" ? monitorFacingViewer(x, y, w, z + 2.5, screen) : monitorFacingRight(x, y, w, z + 2.5, screen));
}
const keyboard = (x, y, z, w = 0.45, d = 0.16) => box(x, y, w, d, 0.6, pal("#2b2e35"), z) + raised(z + 0.6, Array.from({ length: 8 }, (_, i) => rect(x + 0.04 + (i % 4) * (w / 4.3), y + 0.03 + Math.floor(i / 4) * 0.06, w / 6, 0.035, "#6c7480")).join(""));
const paper = (x, y, z, w = 0.22, d = 0.3) => raised(z, rect(x, y, w, d, "#fbfbf6") + [0.08, 0.14, 0.2].map((f) => rect(x + 0.03, y + f, w - 0.08, 0.02, "#9aa4b1")).join(""));

// ---------- kitchen
function fridge(x, y, { w = 0.8, d = 0.7, h = 36, col = FC.white, front = "L" } = {}) {
  const face = (L) => rect(0, h * 0.6, L, 0.6, SHADE) + slab3(L - 3.2, h * 0.64, 1, 8, 1.4, "#c9cdd3", "", wallOf(front)) + slab3(L - 3.2, h * 0.28, 1, 10, 1.4, "#c9cdd3", "", wallOf(front)) +
    rect(3, h * 0.8, 2, 2, FC.red) + rect(6.5, h * 0.76, 2, 2, "#3b82c4") + rect(4, h * 0.7, 2.5, 2, "#f6c945") + rect(8, h * 0.84, 3, 3.5, "#fbfbf6");
  return box(x, y, w, d, h, pal(col, "metal")) + onFront(front, x, y, w, d, 0, face);
}
// Sink set into a worktop (drawn over the cabinets' top): basin and a tap.
const sinkTop = (x, y, z, w = 0.5, d = 0.35) => raised(z, rect(x - 0.03, y - 0.03, w + 0.06, d + 0.06, "#b8c0c8")) +
  basin(x + 0.03, y + 0.03, w - 0.06, d - 0.06, z, 4, { art: (() => { const [a, b] = up(iso(x + w * 0.55, y + d * 0.6), z - 4); return `<ellipse cx="${a}" cy="${b}" rx="2.2" ry="0.9" fill="#9fd3f0"/><ellipse cx="${a - 0.8}" cy="${b - 0.2}" rx="0.7" ry="0.25" fill="#ffffff"/>`; })() }) +
  box(x + w / 2 - 0.03, y - 0.02, 0.06, 0.06, 5, pal(FC.steel, "metal"), z) + box(x + w / 2 - 0.03, y - 0.02, 0.06, 0.2, 1, pal(FC.steel), z + 5);
const smallBox = (x, y, z, w, d, h, col, face) => box(x, y, w, d, h, pal(col), z) + (face ? onL(x, y, w, d, z, face) : "");

// ---------- lights
function lampShade(x, y, z, h, rb, rt, col) {
  const [cx, cy] = up(iso(x, y), z), r = pal(col), bx = rb * 22.6, tx = rt * 22.6;
  return `<polygon points="${cx - bx},${cy} ${cx + bx},${cy} ${cx + tx},${cy - h} ${cx - tx},${cy - h}" fill="${r[1]}" stroke="${INK}" stroke-width="0.5"/>` +
    `<polygon points="${cx - bx + 0.5},${cy - 0.5} ${cx - bx * 0.45},${cy - 0.5} ${cx - tx * 0.4},${cy - h + 0.5} ${cx - tx + 0.5},${cy - h + 0.5}" fill="${r[0]}"/>` +
    `<ellipse cx="${cx}" cy="${cy}" rx="${bx}" ry="${bx * 0.45}" fill="#fff3b0" stroke="${INK}" stroke-width="0.5"/>` + rect(cx - bx, cy - 0.5, bx * 2, 0.5, r[2]);
}
const glowAt = (x, y, z, r = 16) => { const [gx, gy] = up(iso(x, y), z); return circle(gx, gy, r, "url(#glow)", ' class="glow"'); };
const floorLamp = (x, y, { h = 30, col = FC.cream } = {}) =>
  disc(x, y, 0.12, 0, 1, FC.iron) + box(x - 0.025, y - 0.025, 0.05, 0.05, h - 7, pal(FC.iron), 1) + lampShade(x, y, h - 7, 7, 0.17, 0.11, col) + glowAt(x, y, h - 5, 20);
const tableLamp = (x, y, z) => onFloor(x, y, z, "lampTable") + glowAt(x, y, z + 8, 13);
// Pendant light hanging from the storey above: cord and a shade.
function pendant(x, y, z, col = FC.mustard, cord = 14) {
  const [cx, cy] = up(iso(x, y), z);
  return rect(cx - 0.25, cy - cord, 0.5, cord, INK) + lampShade(x, y, z - 5, 5, 0.16, 0.05, col) + glowAt(x, y, z - 8, 18);
}

// ---------- floor and wall pieces
// Rug in floor space (tile units): border, field, centre medallion and corner blocks, fringe at the short ends.
function rugF(x, y, w, d, { edge = "#e8d6a8", field = "#9c3b2e", inner = "#6e2a22", accent = "#e9c46a", fringe = true } = {}) {
  const b = Math.min(w, d) * 0.12, cx = x + w / 2, cy = y + d / 2, r = Math.min(w, d) * 0.28;
  let s = rect(x, y, w, d, edge) + rect(x + b, y + b, w - 2 * b, d - 2 * b, field) + rect(x + b * 1.6, y + b * 1.6, w - 3.2 * b, d - 3.2 * b, "none", ` stroke="${accent}" stroke-width="0.04"`) +
    `<polygon points="${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}" fill="${inner}" stroke="${accent}" stroke-width="0.04"/>` + rect(cx - r * 0.25, cy - r * 0.25, r * 0.5, r * 0.5, accent);
  for (const [a, c] of [[x + b * 0.25, y + b * 0.25], [x + w - b * 0.75, y + b * 0.25], [x + b * 0.25, y + d - b * 0.75], [x + w - b * 0.75, y + d - b * 0.75]]) s += rect(a, c, b * 0.5, b * 0.5, field);
  if (fringe) for (let k = 0; k <= w / 0.08; k++) s += rect(x + k * 0.08, y - 0.06, 0.03, 0.06, edge) + rect(x + k * 0.08, y + d, 0.03, 0.06, edge);
  // the weave all over, a band of little diamonds inside the border, a worn (lighter) middle
  s += rect(x, y, w, d, "url(#rugWeave)");
  for (let a = x + b * 1.6; a < x + w - b * 1.6; a += 0.16) for (const yy of [y + b * 1.15, y + d - b * 1.15]) s += `<polygon points="${a},${yy - 0.04} ${a + 0.05},${yy} ${a},${yy + 0.04} ${a - 0.05},${yy}" fill="${accent}" opacity=".8"/>`;
  for (let c = y + b * 1.6; c < y + d - b * 1.6; c += 0.16) for (const xx of [x + b * 1.15, x + w - b * 1.15]) s += `<polygon points="${xx},${c - 0.04} ${xx + 0.05},${c} ${xx},${c + 0.04} ${xx - 0.05},${c}" fill="${accent}" opacity=".8"/>`;
  s += `<ellipse cx="${cx}" cy="${cy}" rx="${w * 0.32}" ry="${d * 0.3}" fill="#ffffff" opacity=".06"/>`;
  // the pile, and the rug's thickness showing along its two front edges
  for (let k = 0; k < w * d * 60; k++) s += rect(x + b + hsh(k, w) * (w - 2 * b), y + b + hsh(w, k) * (d - 2 * b), 0.03, 0.03, k % 2 ? "rgba(255,255,255,.12)" : "rgba(0,0,0,.12)");
  return s + rect(x, y + d - 0.035, w, 0.035, "rgba(0,0,0,.28)") + rect(x + w - 0.035, y, 0.035, d, "rgba(0,0,0,.35)");
}
// Fluffy round rug (floor space).
const furRug = (x, y, rx, ry, col = "#efe6d4") => Array.from({ length: 28 }, (_, k) => { const a = (k / 28) * 6.283; return `<ellipse cx="${x + Math.cos(a) * rx * 0.93}" cy="${y + Math.sin(a) * ry * 0.93}" rx="${rx * 0.14}" ry="${ry * 0.16}" fill="${mixHex(col, "#000000", 0.12)}"/>`; }).join("") +
  `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${col}"/><ellipse cx="${x - rx * 0.12}" cy="${y - ry * 0.15}" rx="${rx * 0.6}" ry="${ry * 0.55}" fill="#ffffff" opacity=".35"/>` +
  Array.from({ length: Math.round(rx * ry * 30) }, () => { const a = rnd() * 6.28, k = Math.sqrt(rnd()); return rect(x + Math.cos(a) * rx * k, y + Math.sin(a) * ry * k, 0.04, 0.04, pickSeeded(["rgba(255,255,255,.7)", "rgba(0,0,0,.08)"])); }).join("");
// ---------- wall pieces with depth. Drawn in a wall's own coordinates (u along it, v up): a piece standing d units out
// shows its top and one side as strips and its front moved off the wall. wall = "back" (a back wall: the front moves
// left and down and the right side shows) or "left" (a left wall: the front moves right and down and the left side shows).
function slab3(u, v, w, h, d, col, face = "", wall = "back") {
  const p = pal(col), fu = u + (wall === "back" ? -d : d), fv = v - d;
  const P = (pts, fill) => `<polygon points="${pts.map((q) => q.join(",")).join(" ")}" fill="${fill}" stroke="${INK}" stroke-width="0.5"/>`;
  const [a, b] = wall === "back" ? [fu + w, u + w] : [fu, u];
  return P([[fu, fv + h], [fu + w, fv + h], [u + w, v + h], [u, v + h]], p[0]) + P([[a, fv], [b, v], [b, v + h], [a, fv + h]], wall === "back" ? p[2] : p[1]) +
    rect(fu, fv, w, h, p[1], ` stroke="${INK}" stroke-width="0.5"`) + (face ? `<g transform="translate(${fu} ${fv})">${face}</g>` : "");
}
// A picture (a prop from props.js) in a frame d deep, its top edge at v.
const frame3 = (name, u, vTop, { d = 1.2, col = "#4a2e1a", wall = "back" } = {}) => { const { w, h } = propImage(name); return slab3(u, vTop - h, w, h, d, col, onWall(name, 0, h), wall); };
// An odd-shaped wall piece (a clock, antlers): its silhouette in the side colour behind it, the piece d out in front.
const prop3 = (name, u, vTop, { d = 1, col = "#3a2616", wall = "back" } = {}) =>
  `<g transform="translate(${u} ${vTop}) scale(1 -1)">${imageTag(propShadow(name, col), 0, 0)}</g>` + onWall(name, u + (wall === "back" ? -d : d), vTop - d);
// A window set in a wall: sky and pines behind the glass, a frame and bars standing out, a deep sill, curtains on a rod.
function windowW(u, v, w, h, { curtain = FC.rust, panes = 2, wall = "back" } = {}) {
  const fr = "#4a2e1a", S = (a, b, c, e, d, col, face = "") => slab3(a, b, c, e, d, col, face, wall), back = wall === "back";
  const D = 3, s = back ? 1 : -1;
  let view = rect(u, v + h * 0.6, w, h * 0.4, "#e6f5fd");
  for (let k = 0; k < 4; k++) { const px = u + 2 + ((k * 7) % Math.max(1, w - 6)); view += `<polygon points="${px},${v} ${px + 3},${v} ${px + 1.5},${v + 6 + (k % 2) * 3}" fill="#3f7a4a"/>`; }
  const sash = `<g transform="translate(${s * D} ${D})">` + Array.from({ length: panes - 1 }, (_, k) => rect(u + (w * (k + 1)) / panes - 0.75, v, 1.5, h - D, fr)).join("") +
    rect(u, v + h / 2 - 0.75 - D / 2, w, 1.5, fr) + rect(u + 3, v + h - 7, 1, 2.5, "#ffffff") + rect(u + 4, v + h - 5.5, 1, 1, "#ffffff") + `</g>`;
  let g = hole(u, v, w, h, D, { face: back ? "L" : "R", back: "#bfe6fb", side: "#5a3826", floor: "#b58c5a", art: view + sash });
  const casing = [S(u - 2, v - 1, 2, h + 1, 1.6, fr), S(u + w, v - 1, 2, h + 1, 1.6, fr)];
  g += S(u - 2, v + h, w + 4, 2.5, 1.6, fr) + (back ? casing : casing.reverse()).join("") + S(u - 4, v - 3.5, w + 8, 2.5, 3.2, "#8a5a36");
  if (!curtain) return g;
  const folds = (cw, ch) => rect(1.5, 0, 1, ch, "rgba(0,0,0,.18)") + rect(3.5, 0, 1, ch, "rgba(255,255,255,.16)") + rect(5.5, 0, 0.8, ch, "rgba(0,0,0,.12)") + rect(0, ch * 0.35, cw, 1.2, "rgba(0,0,0,.25)");
  const panels = [S(u - 6, v - 3, 7, h + 7, 2.4, curtain, folds(7, h + 7)), S(u + w - 1, v - 3, 7, h + 7, 2.4, curtain, folds(7, h + 7))];
  return g + (back ? panels : panels.reverse()).join("") + S(u - 7, v + h + 3.5, w + 14, 1.2, 3.4, "#2b1a10") + S(u - 8, v + h + 3, 2, 2, 3.6, FC.brass) + S(u + w + 6, v + h + 3, 2, 2, 3.6, FC.brass);
}
// Wall lamp: a plate on the wall, an arm, a shade standing out, and a warm glow.
const sconce = (u, v, wall = "back") => {
  const fu = u + (wall === "back" ? -4 : 4), fv = v - 4;
  return slab3(u - 1.5, v - 4, 3, 5, 0.8, "#2b1a10", "", wall) + `<line x1="${u}" y1="${v - 1}" x2="${fu}" y2="${fv + 1}" stroke="${INK}" stroke-width="1"/>` +
    `<polygon points="${fu - 3},${fv} ${fu + 3},${fv} ${fu + 2},${fv + 4.5} ${fu - 2},${fv + 4.5}" fill="#f4e2b0" stroke="${INK}" stroke-width="0.5"/>` +
    `<polygon points="${fu + 1},${fv} ${fu + 3},${fv} ${fu + 2},${fv + 4.5} ${fu + 0.8},${fv + 4.5}" fill="#dcc38a"/>` + circle(fu, fv + 2, 12, "url(#glow)", ' class="glow"');
};
// Wall shelf on two brackets, standing 4 out; `items` (drawn in wall coordinates, standing on v) are moved onto the board.
const wallShelf = (u, v, w, items = "", wall = "back") => slab3(u + 2, v - 5, 1, 3.5, 3, "#4a2e1a", "", wall) + slab3(u + w - 3, v - 5, 1, 3.5, 3, "#4a2e1a", "", wall) +
  slab3(u, v - 1.5, w, 1.5, 4, "#8a5a36", "", wall) + `<g transform="translate(${wall === "back" ? -2 : 2} -2)">${items}</g>`;
// Things standing on a wall shelf, each with a little depth: jars with lids, or a row of books.
const shelfJars = (u, v, n, wall = "back") => { const j = Array.from({ length: n }, (_, i) => slab3(u + i * 5, v, 3.5, 5, 1.5, ["#f6e7c0", "#e8f4fb", "#f0d0c8", "#d8f0d8"][i % 4], rect(0, 4, 3.5, 1, ["#6e4631", "#c8453c", "#3b6fb6"][i % 3]) + rect(0.5, 0.5, 1, 3, ["#b87a44", "#e0584f", "#7fbf4a"][i % 3]), wall)); return (wall === "back" ? j : j.reverse()).join(""); };
const shelfBooks = (u, v, w, wall = "back") => { const b = []; for (let x = u; x < u + w - 2;) { const bw = pickSeeded([1.5, 2, 2.5]); b.push(slab3(x, v, bw, 5 + pickSeeded([0, 1, 2]), 2.5, pickSeeded(["#c8453c", "#3b6fb6", "#e9c46a", "#4f9a3c", "#f3eee4", "#7b4a86"]), "", wall)); x += bw; } return (wall === "back" ? b : b.reverse()).join(""); };
// Upper kitchen cabinets hung on a back wall (box against the wall at height z).
const upperCabinets = (x, y, w, { z = 30, body = FC.cream } = {}) => cabinets(x, y, w, 0.34, { h: 13, z, body, drawers: false, worktop: false, doors: Math.max(1, Math.round(w * 16 / 9)) });
// Stone pillar (the building's posts): stones on both visible faces, a cap and a base.
function pillar(x, y, h, { s = 0.34, z = 0 } = {}) {
  return box(x, y, s, s, h, STONE, z) + leftFace(x, y, s, z, stones(s * 16, h, ["#b3aea5", "#a19c93", "#bdb8af"])) + rightFace(x, y, s, s, z, stones(s * 16, h, ["#8a857c", "#7d786f", "#948f86"])) +
    box(x - 0.04, y - 0.04, s + 0.08, s + 0.08, 2.5, pal("#6e4631", "wood"), z + h - 2.5) + box(x - 0.03, y - 0.03, s + 0.06, s + 0.06, 2, STONE, z);
}
// A crate / box with planks.
const crate = (x, y, s = 0.4, h = 7, z = 0) => box(x, y, s, s, h, pal("#b98a55", "wood"), z) +
  onL(x, y, s, s, z, (L) => rect(0, h / 2 - 0.25, L, 0.5, SHADE) + rect(1, 0, 0.5, h, SHADE) + rect(L - 1.5, 0, 0.5, h, SHADE)) +
  onR(x, y, s, s, z, (L) => rect(0, h / 2 - 0.25, L, 0.5, SHADE));
// Coat rack with a couple of coats and a hat.
const coatRack = (x, y) => disc(x, y, 0.13, 0, 1, FC.walnut) + [[-0.13, 0.02], [0.1, 0.05], [0.02, -0.13]].map(([a, b]) => box(x + a - 0.02, y + b - 0.02, 0.04, 0.04, 1.2, pal(FC.walnut), 0.2)).join("") +
  box(x - 0.03, y - 0.03, 0.06, 0.06, 31, pal(FC.walnut)) + onFloor(x + 0.02, y - 0.08, 13, "coatRust") + onFloor(x - 0.06, y + 0.08, 12, "coatBlue") + onFloor(x, y, 29, "hatStraw");
// Record player on a low cabinet (front on +x), a spinning-looking record on top.
const recordPlayer = (x, y) => cabinets(x, y, 0.45, 0.8, { h: 10, body: FC.walnut, top: FC.walnut, front: "R", doors: 2 }) + box(x + 0.05, y + 0.12, 0.35, 0.45, 1.5, pal("#2b2e35"), 10) +
  disc(x + 0.22, y + 0.34, 0.13, 11.5, 0.3, "#15171c") + disc(x + 0.22, y + 0.34, 0.04, 11.8, 0.2, FC.red);

// ---------- small things built as solids rather than flat pictures
// A flame standing at world point (x, y, z): layered tongues that flicker.
const flame3 = (x, y, z, s = 1) => { const [fx, fy] = up(iso(x, y), z);
  return `<g class="flicker"><polygon points="${fx - 1.3 * s},${fy} ${fx - 0.6 * s},${fy - 2.5 * s} ${fx},${fy - 4.5 * s} ${fx + 0.7 * s},${fy - 2.2 * s} ${fx + 1.3 * s},${fy}" fill="#ffb627" stroke="#b34700" stroke-width="0.3"/>` +
    `<polygon points="${fx - 0.5 * s},${fy} ${fx},${fy - 2.6 * s} ${fx + 0.5 * s},${fy}" fill="#fff3b0"/></g>`; };
// A candle: a brass dish, a wax cylinder, a flame and a little glow.
const candle3 = (x, y, z, h = 5) => disc(x, y, 0.09, z, 0.8, FC.brass) + disc(x, y, 0.05, z + 0.8, h, "#f3ead8") + flame3(x, y, z + h + 1, 0.8) + glowAt(x, y, z + h + 3, 7);
// A stack of books, alternately shifted, their page edges showing on the front.
const bookStack = (x, y, z, n = 3) => Array.from({ length: n }, (_, i) => {
  const bx = x + (i % 2) * 0.03, by = y - (i % 2) * 0.03, bz = z + i * 1.6, col = ["#c8453c", "#3b6fb6", "#e9c46a", "#4f9a3c"][(i + Math.round(x * 7)) % 4];
  return box(bx, by, 0.26, 0.18, 1.6, pal(col), bz) + leftFace(bx, by, 0.18, bz, rect(0.6, 0.35, 3.2, 0.9, "#f6f1e4"));
}).join("");
// An open laptop: the base with its keyboard, the screen standing up at the back edge.
const laptop3 = (x, y, z) => box(x, y, 0.38, 0.26, 0.6, pal("#b9c0c8", "metal"), z) + raised(z + 0.6, rect(x + 0.04, y + 0.1, 0.3, 0.12, "#3a3d44")) +
  box(x, y, 0.38, 0.03, 5, pal("#3a3d44"), z + 0.6) + leftFace(x, y, 0.03, z + 0.6, rect(0.6, 0.5, 4.9, 4, "#8cc8f0") + rect(1.2, 3, 3, 0.6, "#3b82c4") + rect(1.2, 1.8, 2.2, 0.6, "#3b82c4"));
// A mailbox on a post: the slot on its front, a yellow flag on its side.
// ---------- computer rooms: the things in a gamer's or a hacker's den
const NEON = ["#ff4fd8", "#3bb8ff", "#39ff88", "#ffb800", "#b14cff", "#ff5a5a"];
// A glowing cube lamp of coloured squares (3 by 3 on each face), hung on a cord; its bottom corner at z.
function cubeLamp(x, y, z, s = 0.42, cord = 14) {
  const [cx, cy] = up(iso(x, y), z), e = s * 16, P = (u, v, w) => [cx + (u - v) * e * 0.5, cy - (u + v) * e * 0.25 - w * e * 0.62]; // u, v along the floor, w up (0..1)
  const top = P(1, 1, 1);
  return rect(top[0] - 0.25, top[1] - cord, 0.5, cord, INK) + circle(cx, cy - e * 0.6, e * 1.5, "url(#glow)", ' opacity=".8"') +
    `<polygon points="${[P(0, 0, 0), P(1, 0, 0), P(1, 0, 1), P(1, 1, 1), P(0, 1, 1), P(0, 1, 0)].map((p) => p.join(",")).join(" ")}" fill="#1b1f2a"/>` +
    [0, 1, 2].map((i) => [0, 1, 2].map((j) => { const q = (a, b) => P((i + a) / 3, 0, (j + b) / 3); return `<polygon points="${[q(0.1, 0.1), q(0.9, 0.1), q(0.9, 0.9), q(0.1, 0.9)].map((p) => p.join(",")).join(" ")}" fill="${NEON[(i * 3 + j * 2) % 6]}" opacity=".8"/>`; }).join("")).join("") + // the right face (v = 0, nearest the viewer with u = 0)
    [0, 1, 2].map((i) => [0, 1, 2].map((j) => { const q = (a, b) => P(0, (i + a) / 3, (j + b) / 3); return `<polygon points="${[q(0.1, 0.1), q(0.9, 0.1), q(0.9, 0.9), q(0.1, 0.9)].map((p) => p.join(",")).join(" ")}" fill="${NEON[(i + j * 4 + 2) % 6]}" opacity=".85"/>`; }).join("")).join("") + // the left face (u = 0)
    [0, 1, 2].map((i) => [0, 1, 2].map((j) => { const q = (a, b) => P((i + a) / 3, (j + b) / 3, 1); return `<polygon points="${[q(0.1, 0.1), q(0.9, 0.1), q(0.9, 0.9), q(0.1, 0.9)].map((p) => p.join(",")).join(" ")}" fill="${NEON[(i * 2 + j + 4) % 6]}"/>`; }).join("")).join(""); // the top
}
// A pair of desk speakers, a lamp on an arm, a wastebasket of crumpled paper, a crate of soda bottles, an aquarium.
const speaker = (x, y, z) => box(x, y, 0.14, 0.14, 4.5, pal("#2b2e35"), z) + (() => { const [a, b] = up(iso(x + 0.07, y + 0.14), z); return `<circle cx="${a - 0.6}" cy="${b - 1.5}" r="0.9" fill="#4a4f5c" stroke="#111" stroke-width="0.25"/><circle cx="${a - 0.6}" cy="${b - 3.4}" r="0.45" fill="#4a4f5c"/>`; })();
const deskLamp = (x, y, z, col = "#2b2e35") => { const [a, b] = up(iso(x, y), z);
  return disc(x, y, 0.08, z, 0.6, col) + `<polyline points="${a},${b - 0.6} ${a - 1},${b - 6} ${a + 2.5},${b - 8.5}" fill="none" stroke="${col}" stroke-width="0.7"/>` +
    `<polygon points="${a + 1.5},${b - 9.5} ${a + 4.5},${b - 8.5} ${a + 3.8},${b - 6.6} ${a + 1.4},${b - 7.4}" fill="${col}" stroke="#111" stroke-width="0.3"/>` + circle(a + 3, b - 5, 6, "url(#glow)", ' opacity=".6"'); };
const wasteBin = (x, y) => { const [a, b] = up(iso(x, y), 5);
  return disc(x, y, 0.13, 0, 5, "#c8453c") + [[-1, 0], [0.8, -0.6], [0, -1.2]].map(([dx, dy]) => `<circle cx="${a + dx}" cy="${b + dy}" r="0.9" fill="#f4f1ea" stroke="#9aa4b1" stroke-width="0.25"/>`).join(""); };
const sodaBottles = (x, y) => ["#c8102e", "#39a845", "#f7a21b"].map((col, k) => disc(x + k * 0.12, y + (k % 2) * 0.08, 0.05, 0, 4, col) + disc(x + k * 0.12, y + (k % 2) * 0.08, 0.025, 4, 1.5, col) + disc(x + k * 0.12, y + (k % 2) * 0.08, 0.03, 5.5, 0.5, "#f4f1ea")).join("");
function aquarium(x, y, z, w, d, h) {
  const [a, b] = up(iso(x + w, y + d), z);
  let fish = "";
  for (let k = 0; k < 4; k++) { const [fx, fy] = up(iso(x + w * (0.2 + 0.2 * k), y + d), z + 2 + (k % 3) * 1.8); fish += `<ellipse cx="${fx - 1}" cy="${fy}" rx="1" ry="0.55" fill="${["#ff7a2f", "#ffd23f", "#ff4fd8", "#3bb8ff"][k]}"/><polygon points="${fx},${fy} ${fx + 0.9},${fy - 0.6} ${fx + 0.9},${fy + 0.6}" fill="${["#ff7a2f", "#ffd23f", "#ff4fd8", "#3bb8ff"][k]}"/>`; }
  let weed = "";
  for (let k = 0; k < 5; k++) { const [px, py] = up(iso(x + w * (0.1 + 0.2 * k), y + d * 0.6), z + 1); weed += `<polyline points="${px},${py} ${px - 0.6},${py - 2} ${px + 0.4},${py - 3.8} ${px - 0.3},${py - 5}" fill="none" stroke="#3fa34d" stroke-width="0.7"/>`; }
  return box(x, y, w, d, 1, pal("#d9c7a0"), z) + box(x, y, w, d, h, pal("#7fc9e8", "glass"), z + 1) + weed + fish +
    box(x - 0.02, y - 0.02, w + 0.04, d + 0.04, 0.8, pal("#2b2e35"), z + h + 1);
}
// A tall dark shelf: rows of neon-spined games and books, a figurine now and then.
function neonShelf(x, y, w, d, h, front = "L") {
  const rows = Math.floor(h / 8);
  return box(x, y, w, d, h, pal("#23262e")) + onFront(front, x, y, w, d, 0, (L) => Array.from({ length: rows }, (_, r) => {
    const v = 1 + r * 8;
    let row = rect(0.8, v, L - 1.6, 6.6, "#0e1014");
    for (let u = 1.2; u < L - 1.6; u += 1.3) row += hsh(u, r) < 0.12 ? rect(u, v + 2.5, 1, 4, "#f4f1ea") + rect(u + 0.2, v + 1.6, 0.6, 1, "#f6c945") : rect(u, v + 0.8 + hsh(r, u) * 1.2, 1, 5.6, NEON[Math.floor(hsh(u * 3, r) * 6)]);
    return row;
  }).join(""));
}
const mailbox3 = (x, y) => box(x - 0.04, y - 0.04, 0.08, 0.08, 10, pal("#8a8f98")) + box(x - 0.13, y - 0.22, 0.26, 0.44, 6, pal("#c8102e"), 10) +
  leftFace(x - 0.13, y - 0.22, 0.44, 10, rect(1, 3, 2.2, 0.6, "#5a0a14")) + box(x + 0.13, y - 0.05, 0.02, 0.06, 5, pal("#f6c945"), 13);
// A camera on a tripod, lens toward +y ("L") or +x ("R"), a blinking record light.
function camera3(x, y, face = "L") {
  const top = up(iso(x, y), 12), feet = [iso(x - 0.16, y + 0.1), iso(x + 0.14, y + 0.08), iso(x, y - 0.16)];
  const legs = feet.map(([fx, fy]) => `<line x1="${top[0]}" y1="${top[1]}" x2="${fx}" y2="${fy}" stroke="#2b2e35" stroke-width="1"/>`).join("");
  const B = [x - 0.12, y - 0.09, 0.24, 0.18], lens = (L) => lensStud(L / 2, 2.5, face);
  return legs + box(...B, 5, CASE, 12) + (face === "L" ? onL(...B, 12, lens) : onR(...B, 12, lens)) + rect(...up(iso(x - 0.06, y - 0.04), 17.6), 1, 0.6, "#ff2a2a", ' class="blink"');
}
// A small camera on a bracket high on a back wall.
const wallCam = (x, y, z) => box(x - 0.05, y, 0.1, 0.12, 2, CASE, z + 2) + box(x - 0.09, y + 0.08, 0.18, 0.26, 3.5, pal("#555c6b"), z) +
  onL(x - 0.09, y + 0.08, 0.18, 0.26, z, (L) => stud(L / 2, 1.7, 1.3, 1.3, "#3a3d44", "L", `<circle cx="{cx}" cy="{cy}" r="0.8" fill="#3b82c4"/>`)) + rect(...up(iso(x + 0.05, y + 0.1), z + 3.5), 0.8, 0.5, "#ff2a2a", ' class="blink"');
// The mmWave sensor: an antenna panel (facing +y) on a short post, x..x+0.8.
function radar3(x, y, z) {
  const grid = (L) => { let s = rect(0.5, 0.5, L - 1, 10, "#eef2f5"); for (let r = 0; r < 2; r++) for (let k = 0; k < 4; k++) s += rect(1.5 + k * 3, 2 + r * 4.5, 2, 2.5, "#3b82c4") + rect(2, 3.4 + r * 4.5, 1, 0.6, "#8cc8f0"); return s; };
  return box(x + 0.2, y - 0.05, 0.4, 0.2, 1, pal("#555c6b"), z) + box(x + 0.36, y + 0.02, 0.08, 0.06, 5, pal("#555c6b"), z + 1) + box(x, y, 0.8, 0.08, 11, pal("#d9dde2", "metal"), z + 6) +
    leftFace(x, y, 0.08, z + 6, grid(12.8)) + rect(...up(iso(x + 0.72, y + 0.08), z + 16), 1, 1, "#39ff88", ' class="blink"');
}
// Pulses travelling from screen point a to b: chevrons across the path, each lit in turn.
const pulses = (a, b, n = 3) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, px = -uy, py = ux;
  return Array.from({ length: n }, (_, i) => { const t = (i + 1) / (n + 1), cx = a[0] + dx * t, cy = a[1] + dy * t;
    return `<g class="wave"><polyline points="${cx + px * 2.5 - ux},${cy + py * 2.5 - uy} ${cx + ux},${cy + uy} ${cx - px * 2.5 - ux},${cy - py * 2.5 - uy}" fill="none" stroke="#7fd1ff" stroke-width="0.8"/></g>`; }).join("");
};
// A chalkboard menu on an easel, board facing +y.
const easel3 = (x, y) => { const a = iso(x + 0.05, y + 0.12), b = iso(x + 0.45, y + 0.12), t = up(iso(x + 0.25, y), 26), c = up(iso(x + 0.25, y - 0.2), 0);
  return `<line x1="${t[0]}" y1="${t[1]}" x2="${c[0]}" y2="${c[1]}" stroke="#6e4631" stroke-width="1.2"/>` + box(x, y, 0.5, 0.05, 15, pal("#5a3a22"), 8) +
    leftFace(x, y, 0.05, 8, rect(0.8, 0.8, 6.4, 13.4, "#2f4a3a") + [[1.6, 11, 4.5, "#fbf6ea"], [1.6, 8.5, 3.5, "#fbf6ea"], [1.6, 6, 4.8, "#f6c945"], [1.6, 3, 3, "#f06292"]].map(([u, v, w, col]) => rect(u, v, w, 0.7, col)).join("")) +
    `<line x1="${t[0]}" y1="${t[1]}" x2="${a[0]}" y2="${a[1]}" stroke="#8a5a36" stroke-width="1.2"/><line x1="${t[0]}" y1="${t[1]}" x2="${b[0]}" y2="${b[1]}" stroke="#8a5a36" stroke-width="1.2"/>` + box(x - 0.02, y, 0.54, 0.12, 0.8, pal("#8a5a36"), 7.4); };
// A lantern: black frame, lit glass, a cap and a warm glow.
const lantern3 = (x, y) => { const B = [x - 0.08, y - 0.08, 0.16, 0.16];
  return box(x - 0.1, y - 0.1, 0.2, 0.2, 0.8, pal("#2b2e35")) + box(...B, 6, pal("#ffd966"), 0.8) + onL(...B, 0.8, (L) => rect(0, 0, 0.6, 6, "#2b2e35") + rect(L - 0.6, 0, 0.6, 6, "#2b2e35")) +
    onR(...B, 0.8, (L) => rect(L - 0.6, 0, 0.6, 6, "#2b2e35")) + box(x - 0.1, y - 0.1, 0.2, 0.2, 1, pal("#2b2e35"), 6.8) + glowAt(x, y, 4, 9); };
