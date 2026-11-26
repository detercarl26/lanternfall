// buildTown: Ashgate's meshes, laid out from floor1.js and town.js: the walls, towers and east gate,
// the Lantern Plaza with its arcade, spire and Waystone, the Hall of Lanterns and its lantern wall,
// the Sanctuary in its garden, the Market Way and the forge, the houses, trees, lamps and townsfolk.
// Anything tall uses cutMat, so it opens up round the hero; the roofs of rooms you can walk into go
// in out.roofs and hide while you are inside.

import * as THREE from 'three';
import { CHEAP } from '../platform/page.js';
import { makeRng } from '../math.js';
import { TOWN, GATE, PLAZA, MEMORIAL, FORECOURT, AVENUE, SANCTUARY, GARDEN, MARKET, WELL, CRYSTAL, BOARD, FORGE, LANTERN_WALL } from '../game/world/floor1.js';
import { BOT_ROSTER } from '../game/bots/roster.js';
import { FRAME, inPlazaWay, PILLARS, PYLONS, TOWERS, HOUSES, STALLS, COLUMNS, TABLES, HEARTH, TREES, CYPRESS, HEDGES, LAMPS, FOLK } from '../game/world/town.js';
import { M, glowMat, cutMat, TEX } from './materials.js';

const STONE = [0x8f8676, 0x9b9180, 0x857c6d, 0xa39985, 0x7b7366, 0x958a76]; // weathered limestone
const SLATE = 0x3c3b42, TILE = 0x5e4234, LEAD = 0x56606a;
const CLOTH = [0x7c3a30, 0x3b6656, 0x8a7442, 0x3e4d78, 0xa49a82];          // awnings and bunting
const CLOAKS = [0x4a3f36, 0x3c4048, 0x5a3a30, 0x3a4a3c, 0x4e4a40, 0x2f3540, 0x5c5040];
const SKINS = [0xc9a487, 0xa8805f, 0x8a6248, 0xdcbca0];
const pick = (arr, t) => arr[Math.floor(t * arr.length) % arr.length];

function buildTown(scene, out, add) {
  const vr = makeRng(41), d = new THREE.Object3D(), col = new THREE.Color();
  const box = (w, h, dp) => new THREE.BoxGeometry(w, h, dp);
  const flat = (w, h) => new THREE.PlaneGeometry(w, h).rotateX(-Math.PI / 2);
  const shade = (hex, k) => col.setHex(hex).multiplyScalar(k).getHex();
  const many = (geo, mat, list, pose, o = {}) => { // one InstancedMesh; pose(item, d, i) places each and may return its colour
    const im = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length)); im.count = list.length;
    list.forEach((it, i) => {
      d.position.set(0, 0, 0); d.rotation.set(0, 0, 0); d.scale.set(1, 1, 1);
      const c = pose(it, d, i); d.updateMatrix(); im.setMatrixAt(i, d.matrix);
      if (c !== undefined) im.setColorAt(i, col.setHex(c));
    });
    im.castShadow = !CHEAP && o.cast !== false; im.receiveShadow = !CHEAP && o.recv !== false;
    scene.add(im); return im;
  };
  const glass = () => new THREE.MeshStandardMaterial({ color: 0x2a1a08, emissive: 0xffb04a, emissiveIntensity: 2.2, roughness: 0.4 });
  const aura = (color, opacity) => { const m = glowMat(color, opacity); m.side = THREE.FrontSide; return m; }; // a big glow: unseen from inside, so the camera can pass through it
  const SX = (SANCTUARY.x0 + SANCTUARY.x1) / 2, HX = (MEMORIAL.x0 + MEMORIAL.x1) / 2, HZ = (MEMORIAL.z0 + MEMORIAL.z1) / 2;

  // ---- Ground: pale cobbles, flagged avenues, the plaza's rings, the garden lawn ----
  const tw = TOWN.x1 - TOWN.x0, td = TOWN.z1 - TOWN.z0;
  add(flat(tw + 4, td + 4), new THREE.MeshStandardMaterial({ map: TEX.cobble(tw / 4.5, td / 4.5), roughness: 0.92 }), (TOWN.x0 + TOWN.x1) / 2, 0.01, (TOWN.z0 + TOWN.z1) / 2, { cast: false });
  const flags = (w, h) => new THREE.MeshStandardMaterial({ map: TEX.flag(w / 5, h / 5), roughness: 0.88 });
  const strip = (x0, z0, x1, z1, y = 0.014) => add(flat(x1 - x0, z1 - z0), flags(x1 - x0, z1 - z0), (x0 + x1) / 2, y, (z0 + z1) / 2, { cast: false });
  strip(AVENUE.x0 - 4, AVENUE.z0, TOWN.x1 + 2, MARKET.z1);                         // the one street: avenue, then the Market Way, out through the gate
  strip(FORECOURT.x0, FORECOURT.z0, FORECOURT.x1, FORECOURT.z1 + 4);                // the Hall's forecourt, in through the plaza's north way
  add(new THREE.CircleGeometry(WELL.r, 40).rotateX(-Math.PI / 2), flags(12, 12), WELL.x, 0.016, WELL.z, { cast: false });
  add(new THREE.CircleGeometry(PLAZA.ring + 0.6, 96).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: TEX.plaza(), roughness: 0.85 }), PLAZA.x, 0.02, PLAZA.z, { cast: false });
  const gw = GARDEN.x1 - GARDEN.x0, gd = GARDEN.z1 - GARDEN.z0;
  add(flat(gw, gd), new THREE.MeshStandardMaterial({ map: TEX.grass(gw / 6, gd / 6), roughness: 1 }), (GARDEN.x0 + GARDEN.x1) / 2, 0.018, (GARDEN.z0 + GARDEN.z1) / 2, { cast: false });
  strip(SX - 2, SANCTUARY.z1, SX + 2, GARDEN.z1 + 2, 0.022);                        // the garden path

  // ---- The walls, their towers and the east gate ----
  const wallMat = cutMat(0x6f685d, { flat: true }), WH = 7;
  const wall = (x0, z0, x1, z1) => add(box(x1 - x0, WH, z1 - z0), wallMat, (x0 + x1) / 2, WH / 2, (z0 + z1) / 2);
  wall(TOWN.x0 - 2, TOWN.z0 - 2, TOWN.x1 + 2, TOWN.z0); wall(TOWN.x0 - 2, TOWN.z1, TOWN.x1 + 2, TOWN.z1 + 2);
  wall(TOWN.x0 - 2, TOWN.z0, TOWN.x0, TOWN.z1); wall(TOWN.x1, TOWN.z0, TOWN.x1 + 2, GATE.z0); wall(TOWN.x1, GATE.z1, TOWN.x1 + 2, TOWN.z1);
  add(box(2.4, 2.2, GATE.z1 - GATE.z0 + 2.4), wallMat, TOWN.x1 + 1, WH + 1.1, (GATE.z0 + GATE.z1) / 2);   // over the gate
  const merlons = [];
  const crenel = (x0, z0, x1, z1) => { const n = Math.round(Math.hypot(x1 - x0, z1 - z0) / 1.8); for (let i = 0; i <= n; i++) merlons.push([x0 + (x1 - x0) * i / n, z0 + (z1 - z0) * i / n]); };
  crenel(TOWN.x0 - 1.6, TOWN.z0 - 1.6, TOWN.x1 + 1.6, TOWN.z0 - 1.6); crenel(TOWN.x0 - 1.6, TOWN.z1 + 1.6, TOWN.x1 + 1.6, TOWN.z1 + 1.6);
  crenel(TOWN.x0 - 1.6, TOWN.z0 - 1.6, TOWN.x0 - 1.6, TOWN.z1 + 1.6);
  crenel(TOWN.x1 + 1.6, TOWN.z0 - 1.6, TOWN.x1 + 1.6, GATE.z0 - 4); crenel(TOWN.x1 + 1.6, GATE.z1 + 4, TOWN.x1 + 1.6, TOWN.z1 + 1.6);
  many(box(0.9, 0.9, 0.9), wallMat, merlons, ([x, z], o) => { o.position.set(x, WH + 0.45, z); });
  many(new THREE.CylinderGeometry(1, 1.08, 1, 14), cutMat(0x766e62, { flat: true }), TOWERS, (t, o) => { o.position.set(t.x, t.h / 2, t.z); o.scale.set(t.r, t.h, t.r); });
  many(new THREE.ConeGeometry(1, 1, 14), cutMat(SLATE, { flat: true }), TOWERS, (t, o) => { const k = t.gate ? 1.3 : 1.8; o.position.set(t.x, t.h + t.r * k / 2, t.z); o.scale.set(t.r * 1.2, t.r * k, t.r * 1.2); });
  for (const z of [GATE.z0 + 1.2, GATE.z1 - 1.2]) {   // two lanterns hung in the gateway
    add(box(0.06, 1.2, 0.06), M(0x1a1a1a, { metal: 0.6 }), TOWN.x1 + 1, 6.4, z, { cast: false });
    add(new THREE.CylinderGeometry(0.2, 0.17, 0.45, 6), glass(), TOWN.x1 + 1, 5.6, z, { cast: false });
    add(new THREE.SphereGeometry(0.5, 8, 6), glowMat(0xffa040, 0.22), TOWN.x1 + 1, 5.6, z, { cast: false });
  }
  out.anchors.push({ x: TOWN.x1 + 2.5, y: 4.5, z: 0, color: 0xffa24a, power: 16, flicker: true });

  // ---- The Lantern Plaza: the arcade, its four ways, the spire with the great lantern ----
  const arcMat = cutMat(0x8a8273, { flat: true }), da = Math.PI * 2 / PILLARS.length, rp = PLAZA.r + 0.8;
  const chord = 2 * rp * Math.sin(da / 2), mid = rp * Math.cos(da / 2), along = a => -(a + Math.PI / 2);
  many(new THREE.CylinderGeometry(0.5, 0.62, 4.4, 10), arcMat, PILLARS.filter(p => p.on), (p, o) => { o.position.set(p.x, 2.2, p.z); });
  const spans = PILLARS.filter(p => p.on && PILLARS[(p.i + 1) % PILLARS.length].on);
  const spanAt = (p, o, y) => { const a = p.a + da / 2; o.position.set(PLAZA.x + Math.cos(a) * mid, y, PLAZA.z + Math.sin(a) * mid); o.rotation.y = along(a); };
  many(new THREE.TorusGeometry(chord / 2 - 0.52, 0.3, 6, 14, Math.PI), arcMat, spans, (p, o) => spanAt(p, o, 4.4));
  many(box(chord + 0.15, 1.5, 0.8), arcMat, spans, (p, o) => spanAt(p, o, 6.75));
  const segs = [], SEG_N = 80, rw = PLAZA.ring - 0.8;
  const segLen = 2 * rw * Math.sin(Math.PI / SEG_N) + 0.1;
  for (let i = 0; i < SEG_N; i++) { // a segment stays only if neither end reaches into a way; a pier covers the gap
    const a = (i + 0.5) / SEG_N * Math.PI * 2, x = PLAZA.x + Math.cos(a) * rw, z = PLAZA.z + Math.sin(a) * rw, ex = -Math.sin(a) * segLen / 2, ez = Math.cos(a) * segLen / 2;
    if (!inPlazaWay(x, z) && !inPlazaWay(x + ex, z + ez) && !inPlazaWay(x - ex, z - ez)) segs.push({ a, x, z });
  }
  many(box(segLen, 7.5, 1.6), arcMat, segs, (sg, o) => { o.position.set(sg.x, 3.75, sg.z); o.rotation.y = along(sg.a); });
  many(box(segLen, 0.45, 2.1), cutMat(0x6f685d, { flat: true }), segs, (sg, o) => { o.position.set(sg.x, 7.7, sg.z); o.rotation.y = along(sg.a); });
  // the square frame round the court: a flat roof from the arcade's wall out to the frame's own walls
  const fw = FRAME.x1 - FRAME.x0, frameMat = cutMat(0x7b7467, { flat: true });
  const slab = new THREE.Shape().moveTo(-fw / 2, -fw / 2).lineTo(fw / 2, -fw / 2).lineTo(fw / 2, fw / 2).lineTo(-fw / 2, fw / 2).closePath();
  slab.holes.push(new THREE.Path().absarc(0, 0, PLAZA.ring - 1.5, 0, Math.PI * 2, true));
  add(new THREE.ExtrudeGeometry(slab, { depth: 0.4, bevelEnabled: false, curveSegments: 48 }).rotateX(-Math.PI / 2), frameMat, PLAZA.x, 7.5, PLAZA.z);
  const flank = (x0, z0, x1, z1) => { if (x1 - x0 > 0.01 && z1 - z0 > 0.01) add(box(x1 - x0, 7.5, z1 - z0), frameMat, (x0 + x1) / 2, 3.75, (z0 + z1) / 2); };
  const W = PLAZA.ways, we = W.e || 0, ww = W.w || 0, wn = W.n || 0, ws = W.s || 0, F = FRAME, PX = PLAZA.x, PZ = PLAZA.z;
  flank(F.x1 - 1, F.z0, F.x1, PZ - we); flank(F.x1 - 1, PZ + we, F.x1, F.z1);     // east, either side of its way
  flank(F.x0, F.z0, F.x0 + 1, PZ - ww); flank(F.x0, PZ + ww, F.x0 + 1, F.z1);     // west
  flank(F.x0, F.z0, PX - wn, F.z0 + 1); flank(PX + wn, F.z0, F.x1, F.z0 + 1);     // north
  flank(F.x0, F.z1 - 1, PX - ws, F.z1); flank(PX + ws, F.z1 - 1, F.x1, F.z1);     // south
  spans.filter((p, i) => i % 3 === 1).forEach((p, i) => { // lanterns hung in every third arch
    const a = p.a + da / 2, x = PLAZA.x + Math.cos(a) * (mid - 0.3), z = PLAZA.z + Math.sin(a) * (mid - 0.3);
    add(new THREE.CylinderGeometry(0.18, 0.15, 0.4, 6), glass(), x, 3.5, z, { cast: false });
    add(new THREE.SphereGeometry(0.5, 8, 6), glowMat(0xffa040, 0.2), x, 3.5, z, { cast: false });
    if (i % 2 === 0) out.anchors.push({ x, y: 3.4, z, color: 0xffa24a, power: 12, flicker: true });
  });
  many(box(1.8, 8.6, 1.8), arcMat, PYLONS, (p, o) => { o.position.set(p.x, 4.3, p.z); });   // a pier each side of each way
  many(new THREE.ConeGeometry(1.35, 1.4, 4).rotateY(Math.PI / 4), cutMat(SLATE, { flat: true }), PYLONS, (p, o) => { o.position.set(p.x, 9.3, p.z); });
  // the dais, the spire and the great lantern on top; the Waystone at its foot
  add(new THREE.CylinderGeometry(6.4, 6.5, 0.04, 48), M(0x5e584e), PLAZA.x, 0.04, PLAZA.z, { cast: false });   // paving rings, flush: figures stand at y 0
  add(new THREE.CylinderGeometry(4.6, 4.7, 0.04, 48), M(0x676054), PLAZA.x, 0.07, PLAZA.z, { cast: false });
  const spireMat = cutMat(0x7c7468, { flat: true }); // the whole spire stays under the closest camera (y 12.5), so it never fills the view
  add(box(3.4, 1.8, 3.4), spireMat, PLAZA.x, 0.9, PLAZA.z);
  add(new THREE.CylinderGeometry(0.6, 0.95, 6.4, 8), spireMat, PLAZA.x, 5.0, PLAZA.z);
  add(box(2.0, 0.5, 2.0), spireMat, PLAZA.x, 8.45, PLAZA.z);
  add(new THREE.CylinderGeometry(0.95, 0.75, 1.6, 8), cutMat(0x2a1a08, { em: 0xffb04a, ei: 2.2, rough: 0.4 }), PLAZA.x, 9.5, PLAZA.z, { cast: false });
  add(new THREE.ConeGeometry(1.3, 1.1, 8), cutMat(0x1a1a1a, { metal: 0.6 }), PLAZA.x, 10.85, PLAZA.z);
  add(new THREE.SphereGeometry(2.4, 14, 10), aura(0xffa040, 0.14), PLAZA.x, 9.5, PLAZA.z, { cast: false });
  out.anchors.push({ x: PLAZA.x, y: 8.5, z: PLAZA.z, color: 0xffb25a, power: 40, flicker: true });
  const cr = CRYSTAL;
  add(new THREE.CylinderGeometry(0.9, 1.1, 0.6, 8), M(0x3d3a36), cr.x, 0.3, cr.z);
  add(new THREE.CylinderGeometry(0.55, 0.7, 0.5, 8), M(0x35322e), cr.x, 0.85, cr.z);
  out.crystalY = 2.0;
  out.crystal = add(new THREE.OctahedronGeometry(0.62, 0), M(0x5a8fb8, { em: 0x3f96df, ei: 1.1, rough: 0.25 }), cr.x, out.crystalY, cr.z, { cast: false });
  out.crystal.scale.set(0.8, 1.35, 0.8);
  out.anchors.push({ x: cr.x, y: 2.4, z: cr.z + 0.6, color: 0x8fd0ff, power: 16, flicker: false });
  const bd = BOARD;   // the quest board
  for (const sx of [-1, 1]) add(box(0.18, 2.6, 0.18), M(0x3a2c20), bd.x + sx * 1.1, 1.3, bd.z);
  add(box(2.6, 1.5, 0.12), M(0x4a3826), bd.x, 1.7, bd.z + 0.05);
  for (let i = 0; i < 5; i++) add(new THREE.PlaneGeometry(0.42, 0.52), M(0xcfc2a0, { side: THREE.DoubleSide }), bd.x - 0.9 + i * 0.45, 1.7 + (i % 2) * 0.22 - 0.1, bd.z + 0.12, { cast: false, rz: (vr() - 0.5) * 0.2 });
  add(new THREE.ConeGeometry(1.0, 0.5, 4).rotateY(Math.PI / 4), M(SLATE), bd.x, 2.85, bd.z, { s: [2.3, 1, 0.75] });

  // ---- The Hall of Lanterns: walls, a portal, columns, the lantern wall; roof and dome hide inside ----
  const hallMat = cutMat(0x5b554d, { flat: true }), HH = 10, T = 2, hw = MEMORIAL.x1 - MEMORIAL.x0, hd = MEMORIAL.z1 - MEMORIAL.z0;
  add(flat(hw - 2 * T, hd - 2 * T), new THREE.MeshStandardMaterial({ map: TEX.flag(6, 6), roughness: 0.55 }), HX, 0.026, HZ, { cast: false });
  add(box(hw, HH, T), hallMat, HX, HH / 2, MEMORIAL.z0 + T / 2);
  for (const x of [MEMORIAL.x0 + T / 2, MEMORIAL.x1 - T / 2]) add(box(T, HH, hd), hallMat, x, HH / 2, HZ);
  const side = hw / 2 - MEMORIAL.door;
  for (const s of [-1, 1]) add(box(side, HH, T), hallMat, HX + s * (MEMORIAL.door + side / 2), HH / 2, MEMORIAL.z1 - T / 2);
  add(box(MEMORIAL.door * 2 + 0.2, HH - 7.5, T), hallMat, HX, 7.5 + (HH - 7.5) / 2, MEMORIAL.z1 - T / 2);
  const portal = cutMat(0x47423c, { flat: true });
  for (const s of [-1, 1]) add(box(2, 9.4, 2), portal, HX + s * (MEMORIAL.door + 1), 4.7, MEMORIAL.z1 + 1);   // piers on whole cells, solid in the grid
  add(box(MEMORIAL.door * 2 + 4, 1.5, 2), portal, HX, 9.9, MEMORIAL.z1 + 1);
  for (const s of [-1, 1]) { // lanterns either side of the door
    add(new THREE.CylinderGeometry(0.22, 0.19, 0.5, 6), glass(), HX + s * (MEMORIAL.door + 1), 5.2, MEMORIAL.z1 + 2.2, { cast: false });
    add(new THREE.SphereGeometry(0.55, 8, 6), glowMat(0xffa040, 0.25), HX + s * (MEMORIAL.door + 1), 5.2, MEMORIAL.z1 + 2.25, { cast: false });
  }
  out.anchors.push({ x: HX, y: 4, z: MEMORIAL.z1 + 3.2, color: 0xffa24a, power: 16, flicker: true });
  const DZ = HZ - 1.5, lead = cutMat(LEAD, { metal: 0.3, rough: 0.6 }), roof = [];
  roof.push(add(box(hw, 0.6, hd), hallMat, HX, HH + 0.3, HZ));
  roof.push(add(new THREE.CylinderGeometry(12.4, 12.4, 3, 32), hallMat, HX, HH + 2.1, DZ));
  roof.push(add(new THREE.SphereGeometry(12, 32, 14, 0, Math.PI * 2, 0, Math.PI / 2), lead, HX, HH + 3.6, DZ));
  roof.push(add(new THREE.CylinderGeometry(1.1, 1.3, 2.2, 8), hallMat, HX, HH + 16.6, DZ));
  roof.push(add(new THREE.SphereGeometry(1.7, 12, 8), aura(0xffa040, 0.22), HX, HH + 16.9, DZ, { cast: false }));
  out.roofs.push({ x0: MEMORIAL.x0 + T - 0.5, x1: MEMORIAL.x1 - T + 0.5, z0: MEMORIAL.z0 + T - 0.5, z1: MEMORIAL.z1 + 0.4, objs: roof });
  for (const x of [MEMORIAL.x0, MEMORIAL.x1]) for (const z of [MEMORIAL.z0, MEMORIAL.z1]) {
    add(new THREE.CylinderGeometry(2.0, 2.3, 16, 12), hallMat, x, 8, z);
    add(new THREE.ConeGeometry(2.5, 4, 12), lead, x, 18, z);
    add(new THREE.SphereGeometry(0.7, 10, 8), aura(0xffa040, 0.5), x, 20.5, z, { cast: false });   // a lantern on the tip
  }
  many(new THREE.CylinderGeometry(0.75, 0.9, 9, 10), cutMat(0x6a645b, { flat: true }), COLUMNS, (c, o) => { o.position.set(c.x, 4.5, c.z); });
  // the lantern wall: one lantern for each bot player on this floor; it goes dark when they fall
  const lw = LANTERN_WALL, wlen = lw.x1 - lw.x0, lx = (lw.x0 + lw.x1) / 2;
  add(box(wlen + 4, 0.06, 3), M(0x4a463f), lx, 0.05, lw.z + 1.9, { cast: false });
  add(box(wlen, 3.4, 0.9), M(0x2f2c29), lx, 1.7, lw.z - 0.6);
  add(box(wlen + 0.4, 0.3, 1.2), M(0x24221f), lx, 3.5, lw.z - 0.6);
  for (let i = 0; i < BOT_ROSTER.length; i++) {
    const x = lw.x0 + 1.2 + i * (wlen - 2.4) / (BOT_ROSTER.length - 1);
    add(box(0.08, 0.08, 0.5), M(0x1c1c1c, { metal: 0.6 }), x, 2.35, lw.z - 0.05, { cast: false });
    const g = new THREE.MeshStandardMaterial({ color: 0x2a1a08, emissive: 0xffb04a, emissiveIntensity: 2.2, roughness: 0.4 });
    add(new THREE.CylinderGeometry(0.15, 0.15, 0.36, 6), g, x, 2.0, lw.z + 0.22, { cast: false });
    add(new THREE.ConeGeometry(0.2, 0.18, 6), M(0x1a1a1a, { metal: 0.6 }), x, 2.27, lw.z + 0.22, { cast: false });
    add(box(0.34, 0.04, 0.34), M(0x1a1a1a, { metal: 0.6 }), x, 1.81, lw.z + 0.22, { cast: false });
    const halo = add(new THREE.SphereGeometry(0.42, 10, 8), glowMat(0xffa040, 0.22), x, 2.0, lw.z + 0.24, { cast: false });
    out.lanterns.push({ mat: g, halo, lit: true, x, z: lw.z + 0.22 });
  }
  out.wallAnchor = { x: lx, y: 2.6, z: lw.z + 2.2, color: 0xffb257, power: 22, flicker: true };
  out.anchors.push(out.wallAnchor);

  // ---- The Sanctuary: a pale chapel with a rose window, long tables inside; its roof hides inside ----
  const S = SANCTUARY, sw = S.x1 - S.x0, sd = S.z1 - S.z0, st = 2, SH = 7, SZ = (S.z0 + S.z1) / 2;
  const sMat = cutMat(0x8d8576, { flat: true });
  add(flat(sw - 2 * st, sd - 2 * st), M(0x3b2e22), SX, 0.026, SZ, { cast: false });
  add(box(sw, SH, st), sMat, SX, SH / 2, S.z0 + st / 2);
  for (const x of [S.x0 + st / 2, S.x1 - st / 2]) add(box(st, SH, sd), sMat, x, SH / 2, SZ);
  const sside = sw / 2 - S.door;
  for (const s of [-1, 1]) add(box(sside, SH, st), sMat, SX + s * (S.door + sside / 2), SH / 2, S.z1 - st / 2);
  add(box(S.door * 2 + 0.2, SH - 4, st), sMat, SX, 4 + (SH - 4) / 2, S.z1 - st / 2);
  add(box(sw - 6.4, 2.8, 0.2), cutMat(0x6a3f33), SX, 5.4, S.z1 + 0.1);
  add(new THREE.CircleGeometry(1.5, 24), cutMat(0x000000, { em: 0xffb05a, ei: 0.85 }), SX, 5.4, S.z1 + 0.22, { cast: false });
  add(new THREE.RingGeometry(1.5, 1.85, 24), cutMat(0x3a3530), SX, 5.4, S.z1 + 0.23, { cast: false });
  for (let k = 0; k < 6; k++) add(box(0.09, 2.9, 0.05), cutMat(0x3a3530), SX, 5.4, S.z1 + 0.25, { cast: false, rz: k * Math.PI / 6 }); // the window's tracery
  for (const x of [S.x0 + 1.5, S.x1 - 1.5]) {
    add(box(3, 11, 3), sMat, x, 5.5, S.z1 - 1.5);
    add(new THREE.ConeGeometry(2.2, 3.6, 4), cutMat(SLATE, { flat: true }), x, 12.8, S.z1 - 1.5, { ry: Math.PI / 4 });
  }
  const prism = new THREE.CylinderGeometry(1, 1, 1, 3).rotateX(-Math.PI / 2), RH = 5;
  const sroof = add(prism, cutMat(SLATE, { flat: true }), SX, SH + RH / 3, SZ - 0.6, { s: [(sw + 0.8) / 1.732, RH / 1.5, sd - 1.6] });
  out.roofs.push({ x0: S.x0 + st - 0.5, x1: S.x1 - st + 0.5, z0: S.z0 + st - 0.5, z1: S.z1 + 0.4, objs: [sroof] });
  for (const t of TABLES) { // a long table with a bench each side, filling its three cells from the wall to the aisle
    const x = (t.x0 + t.x1) / 2, z = (t.z0 + t.z1) / 2, len = t.z1 - t.z0;
    add(box(1.3, 0.12, len), M(0x5a4030), x, 0.86, z);
    add(box(0.9, 0.8, len - 0.8), M(0x3a2a1e), x, 0.4, z);
    for (const s of [-1, 1]) add(box(0.5, 0.45, len - 0.4), M(0x4a3626), x + s * 1.2, 0.23, z);
  }
  const hz = (HEARTH.z0 + HEARTH.z1) / 2;
  add(box(HEARTH.x1 - HEARTH.x0, 1.2, HEARTH.z1 - HEARTH.z0), M(0x3a3430), SX, 0.6, hz);
  add(box(2.6, 0.3, 1.1), M(0x000000, { em: 0xff7a2a, ei: 2 }), SX, 1.25, hz, { cast: false });
  out.anchors.push({ x: SX, y: 2.2, z: HEARTH.z1 + 1.2, color: 0xff8a3a, power: 14, flicker: true });

  // ---- The Market Way: stalls with awnings and goods, bunting overhead; the forge in its yard ----
  many(box(2.8, 1.0, 1.0), M(0x4a3a2a), STALLS, (s, o) => { o.position.set(s.x, 0.5, s.z - s.side * 0.4); });
  const posts = [];
  for (const s of STALLS) for (const dx of [-1.4, 1.4]) for (const dz of [-0.9, 0.9]) posts.push({ x: s.x + dx, z: s.z + dz, h: dz * -s.side > 0 ? 2.5 : 2.95 });
  many(box(0.14, 1, 0.14), M(0x2e241a), posts, (p, o) => { o.position.set(p.x, p.h / 2, p.z); o.scale.set(1, p.h, 1); });
  many(box(3.2, 0.08, 2.4), cutMat(0xffffff), STALLS, (s, o) => { o.position.set(s.x, 2.75, s.z); o.rotation.x = -s.side * 0.2; return CLOTH[s.tint]; });
  const goods = [];
  for (const s of STALLS) for (let k = 0; k < 3; k++) goods.push({ x: s.x - 0.9 + k * 0.9, z: s.z - s.side * 0.4, h: 0.22 + vr() * 0.22, c: pick(CLOTH.concat([0x6a8a3a, 0xa0603a, 0x8a8a7a]), vr()) });
  many(box(0.62, 1, 0.5), M(0xffffff), goods, (g, o) => { o.position.set(g.x, 1.0 + g.h / 2, g.z); o.scale.set(1, g.h, 1); return g.c; });
  const lines = [], pennants = [];
  for (let x = MARKET.x0 + 1.5; x < MARKET.x1 - 3; x += 7) {
    lines.push(x);
    for (let z = MARKET.z0 - 0.6; z <= MARKET.z1 + 0.6; z += 0.9) pennants.push({ x, z, c: CLOTH[pennants.length % CLOTH.length] });
  }
  many(box(0.04, 0.04, MARKET.z1 - MARKET.z0 + 2.4), M(0x1a1a1a), lines, (x, o) => { o.position.set(x, 5.6, (MARKET.z0 + MARKET.z1) / 2); }, { cast: false });
  many(new THREE.ConeGeometry(0.24, 0.5, 3), M(0xffffff, { side: THREE.DoubleSide }), pennants, (p, o) => { o.position.set(p.x, 5.33, p.z); o.rotation.set(Math.PI, Math.PI / 2, 0); return p.c; }, { cast: false });
  const fg = FORGE;
  add(box(1.6, 1.0, 1.4), M(0x3a3430), fg.x, 0.5, fg.z);
  add(box(1.2, 0.2, 1.0), M(0x000000, { em: 0xff6a1a, ei: 2 }), fg.x, 1.02, fg.z, { cast: false });
  add(box(0.9, 0.5, 0.4), M(0x2a2a2c, { metal: 0.7, rough: 0.5 }), fg.x + 1.8, 0.75, fg.z);
  add(box(0.4, 0.5, 0.3), M(0x2a2a2c, { metal: 0.7, rough: 0.5 }), fg.x + 1.8, 0.25, fg.z);
  add(box(3.0, 3.2, 0.5), cutMat(0x5a534a, { flat: true }), fg.x + 0.6, 1.6, fg.z - 1.3);   // the hood wall behind the hearth
  add(box(1.0, 2.2, 1.0), cutMat(0x4a443d, { flat: true }), fg.x, 4.2, fg.z - 1.1);        // the chimney
  out.anchors.push({ x: fg.x, y: 1.8, z: fg.z + 0.8, color: 0xff7a2a, power: 14, flicker: true });

  // ---- Houses: walls in weathered stone, flat roofs with a cornice, slate or tile hips, small domes ----
  const houseMat = cutMat(0xffffff, { flat: true }), dims = h => [(h.x0 + h.x1) / 2, (h.z0 + h.z1) / 2, h.x1 - h.x0, h.z1 - h.z0];
  many(box(1, 1, 1), houseMat, HOUSES, (h, o) => { const [x, z, w, dp] = dims(h); o.position.set(x, h.h / 2, z); o.scale.set(w, h.h, dp); return pick(STONE, h.tone); });
  const capped = HOUSES.filter(h => h.roof !== 'hip');
  many(box(1, 1, 1), houseMat, capped, (h, o) => { const [x, z, w, dp] = dims(h); o.position.set(x, h.h + 0.2, z); o.scale.set(w + 0.3, 0.4, dp + 0.3); return shade(pick(STONE, h.tone), 0.8); });
  many(new THREE.ConeGeometry(0.72, 1, 4).rotateY(Math.PI / 4), houseMat, HOUSES.filter(h => h.roof === 'hip'), (h, o) => { // turn baked in: a long house gets a long roof
    const [x, z, w, dp] = dims(h), rh = Math.min(w, dp) * 0.38; o.position.set(x, h.h + rh / 2, z); o.scale.set(w * 1.02, rh, dp * 1.02);
    return h.tone < 0.5 ? SLATE : TILE;
  });
  many(new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), cutMat(LEAD, { metal: 0.3, rough: 0.6 }), HOUSES.filter(h => h.roof === 'dome'), (h, o) => {
    const [x, z, w, dp] = dims(h), r = Math.min(w, dp) * 0.34; o.position.set(x, h.h + 0.4, z); o.scale.set(r, r * 0.9, r);
  });
  const lit = [], dark = [], doors = [];
  for (const h of HOUSES) { // windows and a door on the face the camera sees
    const [x, , w] = dims(h), n = Math.max(1, Math.floor((w - 1) / 2.6)), rows = h.h > 5.6 ? 2 : 1;
    for (let r = 0; r < rows; r++) for (let k = 0; k < n; k++) (vr() < 0.38 ? lit : dark).push([h.x0 + (k + 0.5) * w / n, 2.0 + r * 2.6, h.z1 + 0.03]);
    if (w >= 5) doors.push([x + (vr() - 0.5) * (w - 3), h.z1 + 0.05]);
  }
  const win = new THREE.PlaneGeometry(0.7, 0.95);
  many(win, cutMat(0x000000, { em: 0xffa64d, ei: 1.5 }), lit, ([x, y, z], o) => { o.position.set(x, y, z); }, { cast: false });
  many(win, cutMat(0x16130f), dark, ([x, y, z], o) => { o.position.set(x, y, z); }, { cast: false });
  many(box(1.0, 1.9, 0.1), cutMat(0x2a1f17), doors, ([x, z], o) => { o.position.set(x, 0.95, z); }, { cast: false });

  // ---- Trees, cypresses, hedges, the well, lamp posts ----
  many(new THREE.CylinderGeometry(0.16, 0.24, 1, 6), M(0x2a221c), TREES, (t, o) => { o.position.set(t.x, 1.3 * t.s, t.z); o.scale.set(t.s, 2.6 * t.s, t.s); });
  many(new THREE.IcosahedronGeometry(1, 1), cutMat(0xffffff, { flat: true }), TREES, (t, o) => { o.position.set(t.x, 3.5 * t.s, t.z); o.scale.set(1.7 * t.s, 1.5 * t.s, 1.7 * t.s); return shade(0x34442a, 0.75 + vr() * 0.45); });
  many(new THREE.ConeGeometry(0.75, 1, 8), cutMat(0x23301e, { flat: true }), CYPRESS, (c, o) => { o.position.set(c.x, 2.6 * c.s, c.z); o.scale.set(c.s, 5.2 * c.s, c.s); });
  many(box(1, 1, 1), M(0x22301c, { flat: true }), HEDGES, (h, o) => { o.position.set((h.x0 + h.x1) / 2, 0.55, (h.z0 + h.z1) / 2); o.scale.set(h.x1 - h.x0, 1.1, h.z1 - h.z0); });
  add(new THREE.CylinderGeometry(0.95, 1.0, 0.9, 16, 1, true), M(0x6a6358, { side: THREE.DoubleSide }), WELL.x, 0.45, WELL.z);   // drawn to fit its 2 x 2 cells
  add(new THREE.CircleGeometry(0.92, 16).rotateX(-Math.PI / 2), M(0x05070a), WELL.x, 0.6, WELL.z, { cast: false });
  for (const s of [-1, 1]) add(box(0.18, 2.6, 0.18), M(0x2e241a), WELL.x + s * 0.85, 1.3, WELL.z);
  add(box(2.1, 0.2, 0.3), M(0x2e241a), WELL.x, 2.6, WELL.z);
  many(new THREE.CylinderGeometry(0.07, 0.1, 3.2, 6), M(0x1e1a16, { metal: 0.4 }), LAMPS, (l, o) => { o.position.set(l.x, 1.6, l.z); });
  many(new THREE.CylinderGeometry(0.2, 0.17, 0.42, 6), M(0x2a1a08, { em: 0xffb04a, ei: 2.2 }), LAMPS, (l, o) => { o.position.set(l.x, 3.35, l.z); }, { cast: false });
  many(new THREE.SphereGeometry(0.38, 8, 6), glowMat(0xffa040, 0.2), LAMPS, (l, o) => { o.position.set(l.x, 3.35, l.z); }, { cast: false });
  for (const l of LAMPS) if (l.light) out.anchors.push({ x: l.x, y: 3.4, z: l.z, color: 0xffa24a, power: 13, flicker: true });

  // ---- Townsfolk: robed figures standing about; frame.js sways them a little ----
  const robe = new THREE.CylinderGeometry(0.17, 0.38, 1.45, 8).translate(0, 0.725, 0);
  const bodies = many(robe, M(0xffffff, { flat: true }), FOLK, (f, o) => { o.position.set(f.x, 0, f.z); o.rotation.y = f.face; return pick(CLOAKS, f.tone); });
  const heads = many(new THREE.SphereGeometry(0.17, 8, 6), M(0xffffff), FOLK, (f, o) => { o.position.set(f.x, 1.6, f.z); return pick(SKINS, f.skin); });
  const hood = new THREE.SphereGeometry(0.21, 10, 6, Math.PI / 2 + 0.6, Math.PI * 2 - 1.2, 0, Math.PI * 0.6); // open at the front (+z)
  const hoods = many(hood, M(0xffffff, { side: THREE.DoubleSide }), FOLK, (f, o) => { o.position.set(f.x, 1.6, f.z); o.rotation.y = f.face; return shade(pick(CLOAKS, f.tone), 0.85); });
  out.folk = { bodies, heads, hoods, list: FOLK, d };
}

export { buildTown };
