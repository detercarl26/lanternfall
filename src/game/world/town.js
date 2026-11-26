// Ashgate's layout as plain data, laid out once from a fixed seed: the wall towers, the plaza's
// arcade and the ways through it, the houses packed wall to wall on both sides of the one street,
// the market stalls, trees, hedges, lamp posts and the townsfolk standing about. grid.js carves it;
// render/town-meshes.js and the minimap draw it. Nothing here touches three.js.

import { makeRng } from '../../math.js';
import { TOWN, GATE, PLAZA, MEMORIAL, FORECOURT, AVENUE, SANCTUARY, GARDEN, WELL_YARD, WELL, MARKET, FORGE_YARD, GATE_SQUARE, LANTERN_WALL } from './floor1.js';

const trng = makeRng(31);
const tr = (a, b) => a + (b - a) * trng();
const cellMid = v => Math.floor(v) + 0.5; // things that block one grid cell stand in its middle

// ---- The plaza: a round court inside a square frame, passable only by its ways ----
const FRAME = { x0: PLAZA.x - PLAZA.ring, x1: PLAZA.x + PLAZA.ring, z0: PLAZA.z - PLAZA.ring, z1: PLAZA.z + PLAZA.ring };
function inPlazaWay(x, z) { // PLAZA.ways holds each open side's half-width; a closed side has none
  const dx = x - PLAZA.x, dz = z - PLAZA.z, w = PLAZA.ways;
  return (dx > 0 && Math.abs(dz) < (w.e || 0)) || (dx < 0 && Math.abs(dz) < (w.w || 0)) || (dz < 0 && Math.abs(dx) < (w.n || 0)) || (dz > 0 && Math.abs(dx) < (w.s || 0));
}
const PILLARS = [];   // the arcade's columns, by angle; an arch spans each pair of neighbours
const PILLAR_N = 32;
for (let i = 0; i < PILLAR_N; i++) {
  const a = i / PILLAR_N * Math.PI * 2, r = PLAZA.r + 0.8, x = PLAZA.x + Math.cos(a) * r, z = PLAZA.z + Math.sin(a) * r;
  PILLARS.push({ i, a, x, z, on: !inPlazaWay(x, z) });
}
const PYLONS = [];    // a pier each side of each way, where the way passes through the wall
for (const [side, half] of Object.entries(PLAZA.ways)) for (const s of [-1, 1]) {
  const rw = PLAZA.ring - 0.8, u = s * (half + 0.9), v = Math.sqrt(rw * rw - u * u);
  PYLONS.push(side === 'e' ? { x: PLAZA.x + v, z: PLAZA.z + u } : side === 'w' ? { x: PLAZA.x - v, z: PLAZA.z + u }
    : side === 'n' ? { x: PLAZA.x + u, z: PLAZA.z - v } : { x: PLAZA.x + u, z: PLAZA.z + v });
}

// ---- Wall towers: the corners, about every 30 units along the walls, and the two at the gate ----
// The south wall's are low: the camera hangs over that side of the street.
const TOWERS = [];
{
  const along = (a, b) => { const n = Math.max(1, Math.round((b - a) / 30)); return Array.from({ length: n + 1 }, (_, i) => a + (b - a) * i / n); };
  const xs = along(TOWN.x0 - 1, TOWN.x1 + 1), zs = along(TOWN.z0 - 1, TOWN.z1 + 1), corner = (x, z) => (x === xs[0] || x === xs[xs.length - 1]) && (z === zs[0] || z === zs[zs.length - 1]);
  for (const x of xs) { TOWERS.push({ x, z: zs[0], r: corner(x, zs[0]) ? 3 : 2.6, h: 10 }); TOWERS.push({ x, z: zs[zs.length - 1], r: corner(x, zs[zs.length - 1]) ? 3 : 2.6, h: 6.5 }); }
  for (const z of zs.slice(1, -1)) { TOWERS.push({ x: xs[0], z, r: 2.6, h: 10 }); if (z < GATE.z0 - 8 || z > GATE.z1 + 8) TOWERS.push({ x: xs[xs.length - 1], z, r: 2.6, h: 10 }); }
  for (const z of [GATE.z0 - 3, GATE.z1 + 3]) TOWERS.push({ x: TOWN.x1 + 1.5, z, r: 2.6, h: 8.5, gate: true });
}

// ---- Houses: every block beside the street is tiled wall to wall, so there are no side alleys ----
// North of the street the town rises behind the landmarks; south of it everything stays low.
const HOUSES = [];
function tile(r, zone) {
  const w = r.x1 - r.x0, d = r.z1 - r.z0;
  if (w <= 9 && d <= 9) {
    const back = zone.low ? 0 : (zone.z1 - r.z1) / Math.max(1, zone.z1 - zone.z0), roll = trng(); // further back, taller
    const h = zone.low ? tr(3, 4.2) : 4.4 + back * 3.2 + tr(0, 1.6);
    HOUSES.push({ ...r, h, roof: zone.low || roll < 0.5 ? 'flat' : roll < 0.85 ? 'hip' : 'dome', tone: trng() });
    return;
  }
  const alongX = w > d || (w === d && trng() < 0.5), len = alongX ? w : d;
  const cut = Math.max(4, Math.min(len - 4, Math.round(len * tr(0.36, 0.64)))) + (alongX ? r.x0 : r.z0);
  if (alongX) { tile({ ...r, x1: cut }, zone); tile({ ...r, x0: cut }, zone); } else { tile({ ...r, z1: cut }, zone); tile({ ...r, z0: cut }, zone); }
}
const ZONES = [
  { x0: TOWN.x0, x1: MEMORIAL.x0, z0: TOWN.z0, z1: FRAME.z0 },                          // west of the Hall
  { x0: MEMORIAL.x1, x1: GARDEN.x0, z0: TOWN.z0, z1: FRAME.z0 },                        // between the Hall and the garden
  { x0: GARDEN.x0, x1: GARDEN.x1, z0: TOWN.z0, z1: GARDEN.z0 },                         // behind the garden
  { x0: MARKET.x0, x1: GATE_SQUARE.x0, z0: TOWN.z0, z1: MARKET.z0 },                    // north of the Market Way
  { x0: GATE_SQUARE.x0, x1: TOWN.x1, z0: TOWN.z0, z1: GATE_SQUARE.z0 },                 // inside the east wall
  { x0: FRAME.x1, x1: WELL_YARD.x0, z0: AVENUE.z1, z1: TOWN.z1, low: true },            // south of the avenue
  { x0: WELL_YARD.x1, x1: MARKET.x0, z0: AVENUE.z1, z1: TOWN.z1, low: true },
  { x0: MARKET.x0, x1: FORGE_YARD.x0, z0: MARKET.z1, z1: TOWN.z1, low: true },          // south of the Market Way
  { x0: FORGE_YARD.x0, x1: FORGE_YARD.x1, z0: FORGE_YARD.z1, z1: TOWN.z1, low: true },
  { x0: FORGE_YARD.x1, x1: TOWN.x1, z0: GATE_SQUARE.z1, z1: TOWN.z1, low: true },
];
for (const zone of ZONES) tile({ x0: zone.x0, x1: zone.x1, z0: zone.z0, z1: zone.z1 }, zone);

// ---- The Market Way: stalls along both sides, none in front of the forge yard ----
const STALLS = [];
for (let x = MARKET.x0 + 3; x <= MARKET.x1 - 6; x += 4.4) {
  STALLS.push({ x, z: MARKET.z0 + 1.3, side: -1, tint: STALLS.length % 5 });
  if (x < FORGE_YARD.x0 - 1.8 || x > FORGE_YARD.x1 + 1.8) STALLS.push({ x, z: MARKET.z1 - 1.3, side: 1, tint: (STALLS.length * 3) % 5 });
}

// ---- Inside the Hall of Lanterns: two rows of columns. Inside the Sanctuary: two long tables, the hearth ----
const SX = (SANCTUARY.x0 + SANCTUARY.x1) / 2, HX = (MEMORIAL.x0 + MEMORIAL.x1) / 2;
const COLUMNS = [];
for (const x of [MEMORIAL.x0 + 8, MEMORIAL.x1 - 8]) for (let z = MEMORIAL.z0 + 8; z < MEMORIAL.z1 - 4; z += 5) COLUMNS.push({ x, z });
const TABLES = [-1, 1].map(s => ({ x0: SX + (s < 0 ? -5 : 2), x1: SX + (s < 0 ? -2 : 5), z0: SANCTUARY.z0 + 6, z1: SANCTUARY.z1 - 4 })); // whole cells: wall to aisle
const HEARTH = { x0: SX - 2, x1: SX + 2, z0: SANCTUARY.z0 + 2, z1: SANCTUARY.z0 + 4 };

// ---- Trees, cypresses, hedges, lamp posts ----
const TREES = [], CYPRESS = [], HEDGES = [], LAMPS = [];
for (let x = AVENUE.x0 + 4; x < AVENUE.x1 - 1; x += 7) for (const z of [AVENUE.z0 + 1.5, AVENUE.z1 - 1.5])
  if (z > 0 || Math.abs(cellMid(x) - SX) > 3.5) TREES.push({ x: cellMid(x), z, s: tr(0.9, 1.15) }); // none in front of the Sanctuary's path
for (const [x, z] of [[GARDEN.x0 + 4, GARDEN.z0 + 4], [GARDEN.x1 - 4, GARDEN.z0 + 4], [GARDEN.x0 + 4, GARDEN.z1 - 5], [GARDEN.x1 - 4, GARDEN.z1 - 5], [GARDEN.x0 + 4, GARDEN.z0 + 15], [GARDEN.x1 - 4, GARDEN.z0 + 17]])
  TREES.push({ x: cellMid(x), z: cellMid(z), s: tr(1.0, 1.3) });
for (const dx of [-6, 6]) TREES.push({ x: cellMid(WELL.x + dx), z: cellMid(WELL.z + 5), s: tr(0.95, 1.2) });
for (const dz of [1.5, 4.5]) for (const x of [SX - 3.5, SX + 3.5]) CYPRESS.push({ x: cellMid(x), z: cellMid(SANCTUARY.z1 + dz), s: tr(0.9, 1.1) }); // two cells apart: you can step between them onto the lawn
for (const x of [SANCTUARY.x0 - 2.5, SANCTUARY.x1 + 2.5]) for (const z of [SANCTUARY.z0 + 3, SANCTUARY.z0 + 9]) CYPRESS.push({ x: cellMid(x), z: cellMid(z), s: tr(1.0, 1.2) });
const hedge = (x0, z0, x1, z1) => HEDGES.push({ x0, z0, x1, z1 });
hedge(GARDEN.x0, GARDEN.z1 - 1, SX - 2, GARDEN.z1); hedge(SX + 2, GARDEN.z1 - 1, GARDEN.x1, GARDEN.z1);   // along the avenue, a gap for the path
hedge(GARDEN.x0, GARDEN.z0, GARDEN.x1, GARDEN.z0 + 1);                                                   // north
hedge(GARDEN.x0, GARDEN.z0, GARDEN.x0 + 1, GARDEN.z1); hedge(GARDEN.x1 - 1, GARDEN.z0, GARDEN.x1, GARDEN.z1); // west and east
const lamp = (x, z, light) => LAMPS.push({ x: cellMid(x), z: cellMid(z), light });
for (let k = 0; k < 8; k++) { const a = (k + 0.5) * Math.PI / 4; lamp(PLAZA.x + Math.cos(a) * 17.5, PLAZA.z + Math.sin(a) * 17.5, k % 2 === 0); }
for (const x of [HX - 8, HX + 8]) lamp(x, FORECOURT.z0 + 3.5, false);
for (let x = AVENUE.x0 + 7.5, i = 0; x < AVENUE.x1 - 2; x += 7, i++) lamp(x, i % 2 ? AVENUE.z1 - 1.5 : AVENUE.z0 + 1.5, true);
for (const dx of [-6, 6]) lamp(WELL.x + dx, WELL.z - 5, dx > 0);
STALLS.filter(s => s.side < 0).forEach((s, i) => lamp(s.x + 2.2, MARKET.z0 + 0.6, i % 2 === 0));
for (const z of [GATE_SQUARE.z0 + 0.5, GATE_SQUARE.z1 - 0.5]) lamp(TOWN.x1 - 3, z, z > 0);

// ---- Townsfolk: customers at the stalls, talkers in the plaza, mourners at the lantern wall ----
const FOLK = [];
const folk = (x, z, faceX, faceZ) => { const fx = cellMid(x), fz = cellMid(z); FOLK.push({ x: fx, z: fz, face: Math.atan2(faceX - fx, faceZ - fz), tone: trng(), skin: trng() }); };
for (const s of STALLS) folk(s.x + tr(-0.9, 0.9), s.z - s.side * 2.4, s.x, s.z);
for (const [deg, r, n] of [[30, 17, 3], [140, 16, 2], [215, 16, 3], [300, 17, 2], [105, 18.5, 2], [180, 14, 2]]) {
  const a = deg * Math.PI / 180, cx = PLAZA.x + Math.cos(a) * r, cz = PLAZA.z + Math.sin(a) * r;
  for (let k = 0; k < n; k++) { const b = k / n * Math.PI * 2 + trng(); folk(cx + Math.cos(b) * 1.3, cz + Math.sin(b) * 1.3, cx, cz); }
}
for (const dx of [-4, 1, 5]) folk((LANTERN_WALL.x0 + LANTERN_WALL.x1) / 2 + dx, LANTERN_WALL.z + 4.5, (LANTERN_WALL.x0 + LANTERN_WALL.x1) / 2 + dx, LANTERN_WALL.z);
folk(HX + 10, FORECOURT.z0 + 2.5, HX + 12, FORECOURT.z0 + 4); folk(HX + 12, FORECOURT.z0 + 4.5, HX + 10, FORECOURT.z0 + 2.5);
folk(GARDEN.x0 + 8, GARDEN.z1 - 9, GARDEN.x0 + 10, GARDEN.z1 - 12); folk(GARDEN.x1 - 7, GARDEN.z0 + 8, GARDEN.x1 - 9, GARDEN.z0 + 6);
folk(WELL.x - 2.5, WELL.z + 1.5, WELL.x, WELL.z); folk(WELL.x + 2.5, WELL.z - 1, WELL.x, WELL.z); folk(WELL.x + 5, WELL.z + 6, WELL.x, WELL.z);

export { FRAME, inPlazaWay, PILLARS, PYLONS, TOWERS, HOUSES, STALLS, COLUMNS, TABLES, HEARTH, TREES, CYPRESS, HEDGES, LAMPS, FOLK };
