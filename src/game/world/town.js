// Ashgate's layout as plain data, laid out once from a fixed seed: the wall towers, the plaza's
// arcade and the four ways through it, the houses that fill the blocks between the landmarks, the
// market stalls, trees, hedges, lamp posts and the townsfolk standing about. grid.js carves it;
// render/town-meshes.js and the minimap draw it. Nothing here touches three.js.

import { makeRng } from '../../math.js';
import { TOWN, GATE, PLAZA, MEMORIAL, SANCTUARY, GARDEN, MARKET, FORGE_YARD, WELL, LANTERN_WALL } from './floor1.js';

const trng = makeRng(31);
const tr = (a, b) => a + (b - a) * trng();
const cellMid = v => Math.floor(v) + 0.5; // things that block one grid cell stand in its middle

// ---- The plaza's arcade: a solid ring, passable only by its four ways ----
function inPlazaWay(x, z) {
  const dx = x - PLAZA.x, dz = z - PLAZA.z;
  return (dx > 0 && Math.abs(dz) < MARKET.z1) || (dx < 0 && Math.abs(dz) < 5) || (dz < 0 && Math.abs(dx) < MEMORIAL.door) || (dz > 0 && Math.abs(dx) < 5);
}
const PILLARS = [];   // the arcade's columns, by angle; an arch spans each pair of neighbours
const PILLAR_N = 32;
for (let i = 0; i < PILLAR_N; i++) {
  const a = i / PILLAR_N * Math.PI * 2, r = PLAZA.r + 0.8, x = PLAZA.x + Math.cos(a) * r, z = PLAZA.z + Math.sin(a) * r;
  PILLARS.push({ i, a, x, z, on: !inPlazaWay(x, z) });
}

// ---- Wall towers: the corners, every 30-odd units along the walls, and the two at the gate ----
const TOWERS = [];
{
  const xs = [-113, -80, -47, -14, 19], zs = [-69, -38.5, -8, 22.5, 53];
  for (const x of xs) for (const z of [TOWN.z0 - 1, TOWN.z1 + 1]) TOWERS.push({ x, z, r: x === xs[0] || x === xs[4] ? 3 : 2.6, h: 10 });
  for (const z of zs.slice(1, -1)) TOWERS.push({ x: TOWN.x0 - 1, z, r: 2.6, h: 10 });
  for (const z of [zs[1], zs[3]]) TOWERS.push({ x: TOWN.x1 + 1, z, r: 2.6, h: 10 });
  for (const z of [GATE.z0 - 3, GATE.z1 + 3]) TOWERS.push({ x: TOWN.x1 + 1.5, z, r: 2.6, h: 8.5, gate: true });
}

// ---- Open ground the houses keep clear of: the landmarks, the avenues and a lane round each ----
const KEEP = [
  { x0: MARKET.x0 - 3, x1: TOWN.x1, z0: MARKET.z0 - 1, z1: MARKET.z1 + 1 },               // the Market Way
  { x0: TOWN.x1 - 8, x1: TOWN.x1, z0: GATE.z0 - 6, z1: GATE.z1 + 6 },                       // the square inside the gate
  { x0: FORGE_YARD.x0 - 1, x1: FORGE_YARD.x1 + 1, z0: FORGE_YARD.z0, z1: FORGE_YARD.z1 + 1 },
  { x0: MEMORIAL.x0 - 3, x1: MEMORIAL.x1 + 3, z0: MEMORIAL.z0 - 3, z1: MEMORIAL.z1 + 3 },   // the Hall of Lanterns
  { x0: GARDEN.x0 - 2, x1: GARDEN.x1 + 2, z0: GARDEN.z0 - 2, z1: GARDEN.z1 + 2 },           // the Sanctuary's garden
  { x0: TOWN.x0, x1: PLAZA.x, z0: -6, z1: 6 },                                              // the west avenue
  { x0: PLAZA.x - 6, x1: PLAZA.x + 6, z0: PLAZA.z, z1: TOWN.z1 },                           // the south avenue
];
const KEEP_ROUND = [{ x: PLAZA.x, z: PLAZA.z, r: PLAZA.ring + 3.5 }, { x: WELL.x, z: WELL.z, r: WELL.r + 2.5 }];
function touchesKeep(r) {
  for (const k of KEEP) if (r.x0 < k.x1 && r.x1 > k.x0 && r.z0 < k.z1 && r.z1 > k.z0) return true;
  for (const c of KEEP_ROUND) {
    const nx = Math.max(r.x0, Math.min(c.x, r.x1)), nz = Math.max(r.z0, Math.min(c.z, r.z1));
    if (Math.hypot(nx - c.x, nz - c.z) < c.r) return true;
  }
  return false;
}
function insideKeep(r) {
  for (const k of KEEP) if (r.x0 >= k.x0 && r.x1 <= k.x1 && r.z0 >= k.z0 && r.z1 <= k.z1) return true;
  const corners = [[r.x0, r.z0], [r.x1, r.z0], [r.x0, r.z1], [r.x1, r.z1]];
  return KEEP_ROUND.some(c => corners.every(([x, z]) => Math.hypot(x - c.x, z - c.z) < c.r));
}

// ---- Houses: split the town into blocks and lots (streets 5 wide, alleys 2), one house per lot ----
// Every edge is a whole number, so a 2-wide alley is two open grid cells: always walkable.
const HOUSES = [];
function split(r) {
  const w = r.x1 - r.x0, d = r.z1 - r.z0;
  if (w < 4 || d < 4 || insideKeep(r)) return;
  const hit = touchesKeep(r);
  if (!hit && w <= 9 && d <= 9) {
    const roll = trng();
    HOUSES.push({ ...r, h: tr(3.6, 8), roof: roll < 0.55 ? 'flat' : roll < 0.85 ? 'hip' : 'dome', tone: trng() });
    return;
  }
  if (hit && w <= 5 && d <= 5) return; // a sliver beside a landmark stays open ground
  const alongX = w > d || (w === d && trng() < 0.5), len = alongX ? w : d, gap = len >= 30 ? 5 : 2;
  const cut = Math.round((alongX ? r.x0 : r.z0) + len * tr(0.36, 0.64)), a = Math.floor(gap / 2), b = gap - a;
  if (alongX) { split({ ...r, x1: cut - a }); split({ ...r, x0: cut + b }); }
  else { split({ ...r, z1: cut - a }); split({ ...r, z0: cut + b }); }
}
split({ x0: TOWN.x0 + 3, x1: TOWN.x1 - 3, z0: TOWN.z0 + 3, z1: TOWN.z1 - 3 });

// ---- The Market Way: stalls along both sides, none in front of the forge yard ----
const STALLS = [];
for (let x = MARKET.x0 + 3; x <= MARKET.x1 - 6; x += 4.4) {
  STALLS.push({ x, z: MARKET.z0 + 1.3, side: -1, tint: STALLS.length % 5 });
  if (x < FORGE_YARD.x0 - 1.8 || x > FORGE_YARD.x1 + 1.8) STALLS.push({ x, z: MARKET.z1 - 1.3, side: 1, tint: (STALLS.length * 3) % 5 });
}

// ---- Inside the Hall of Lanterns: two rows of columns. Inside the Sanctuary: two long tables, the hearth ----
const SX = (SANCTUARY.x0 + SANCTUARY.x1) / 2;
const COLUMNS = [];
for (const x of [MEMORIAL.x0 + 8, MEMORIAL.x1 - 8]) for (let z = MEMORIAL.z0 + 8; z < MEMORIAL.z1 - 4; z += 5) COLUMNS.push({ x, z });
const TABLES = [-3, 3].map(dx => ({ x0: SX + dx - 1.6, x1: SX + dx + 1.6, z0: SANCTUARY.z0 + 6, z1: SANCTUARY.z1 - 4 }));
const HEARTH = { x0: SX - 1.5, x1: SX + 1.5, z0: SANCTUARY.z0 + 1.2, z1: SANCTUARY.z0 + 2.6 };

// ---- Trees, cypresses, hedges, lamp posts ----
const TREES = [], CYPRESS = [], HEDGES = [], LAMPS = [];
for (let x = PLAZA.x - PLAZA.ring - 6; x > TOWN.x0 + 3; x -= 7) for (const z of [-4.5, 4.5])
  if (z > 0 || Math.abs(cellMid(x) - SX) > 3.5) TREES.push({ x: cellMid(x), z, s: tr(0.9, 1.15) }); // none in front of the Sanctuary's path
for (let z = 31; z <= 38; z += 7) for (const x of [PLAZA.x - 4.5, PLAZA.x + 4.5]) TREES.push({ x, z: cellMid(z), s: tr(0.9, 1.15) });
for (const [x, z] of [[GARDEN.x0 + 4, GARDEN.z0 + 4], [GARDEN.x1 - 4, GARDEN.z0 + 4], [GARDEN.x0 + 4, GARDEN.z1 - 5], [GARDEN.x1 - 4, GARDEN.z1 - 5], [GARDEN.x0 + 4, -24], [GARDEN.x1 - 4, -26]])
  TREES.push({ x: cellMid(x), z: cellMid(z), s: tr(1.0, 1.3) });
for (let z = SANCTUARY.z1 + 1.5; z < GARDEN.z1 - 1; z += 2.2) for (const x of [SX - 3.5, SX + 3.5]) CYPRESS.push({ x: cellMid(x), z: cellMid(z), s: tr(0.9, 1.1) });
for (const x of [SANCTUARY.x0 - 2.5, SANCTUARY.x1 + 2.5]) for (const z of [SANCTUARY.z0 + 3, SANCTUARY.z0 + 9]) CYPRESS.push({ x: cellMid(x), z: cellMid(z), s: tr(1.0, 1.2) });
const hedge = (x0, z0, x1, z1) => HEDGES.push({ x0, z0, x1, z1 });
hedge(GARDEN.x0, GARDEN.z1 - 1, SX - 2, GARDEN.z1); hedge(SX + 2, GARDEN.z1 - 1, GARDEN.x1, GARDEN.z1);   // south, a gap for the path
hedge(GARDEN.x0, GARDEN.z0, GARDEN.x1, GARDEN.z0 + 1);                                                   // north
hedge(GARDEN.x0, GARDEN.z0, GARDEN.x0 + 1, GARDEN.z1);                                                   // west
hedge(GARDEN.x1 - 1, GARDEN.z0, GARDEN.x1, -24); hedge(GARDEN.x1 - 1, -20, GARDEN.x1, GARDEN.z1);         // east, a side gate
const lamp = (x, z, light) => LAMPS.push({ x: cellMid(x), z: cellMid(z), light });
for (let k = 0; k < 8; k++) { const a = (k + 0.5) * Math.PI / 4; lamp(PLAZA.x + Math.cos(a) * 17.5, PLAZA.z + Math.sin(a) * 17.5, k % 2 === 0); }
STALLS.filter(s => s.side < 0).forEach((s, i) => lamp(s.x + 2.2, MARKET.z0 + 0.6, i % 2 === 0));
for (let x = PLAZA.x - PLAZA.ring - 9.5; x > TOWN.x0 + 3; x -= 14) lamp(x, -4.5, true);
for (const x of [PLAZA.x - MEMORIAL.door - 1.5, PLAZA.x + MEMORIAL.door + 1.5]) lamp(x, MEMORIAL.z1 + 4, false);
for (const z of [GATE.z0 - 6, GATE.z1 + 6]) lamp(TOWN.x1 - 3, z, z > 0);
lamp(PLAZA.x + 5.5, PLAZA.z + PLAZA.ring + 9, true); lamp(WELL.x + 4, WELL.z - 4, false);

// ---- Townsfolk: customers at the stalls, talkers in the plaza, mourners at the lantern wall ----
const FOLK = [];
const folk = (x, z, faceX, faceZ) => { const fx = cellMid(x), fz = cellMid(z); FOLK.push({ x: fx, z: fz, face: Math.atan2(faceX - fx, faceZ - fz), tone: trng(), skin: trng() }); };
for (const s of STALLS) folk(s.x + tr(-0.9, 0.9), s.z - s.side * 2.4, s.x, s.z);
for (const [deg, r, n] of [[30, 17, 3], [140, 16, 2], [215, 16, 3], [300, 17, 2], [105, 18.5, 2]]) {
  const a = deg * Math.PI / 180, cx = PLAZA.x + Math.cos(a) * r, cz = PLAZA.z + Math.sin(a) * r;
  for (let k = 0; k < n; k++) { const b = k / n * Math.PI * 2 + trng(); folk(cx + Math.cos(b) * 1.3, cz + Math.sin(b) * 1.3, cx, cz); }
}
for (const dx of [-4, 1, 5]) folk((LANTERN_WALL.x0 + LANTERN_WALL.x1) / 2 + dx, LANTERN_WALL.z + 4.5, (LANTERN_WALL.x0 + LANTERN_WALL.x1) / 2 + dx, LANTERN_WALL.z);
folk(GARDEN.x0 + 8, GARDEN.z1 - 9, GARDEN.x0 + 10, GARDEN.z1 - 12); folk(GARDEN.x1 - 7, GARDEN.z0 + 8, GARDEN.x1 - 9, GARDEN.z0 + 6);
folk(WELL.x - 2.5, WELL.z + 1.5, WELL.x, WELL.z); folk(WELL.x + 2.5, WELL.z - 1, WELL.x, WELL.z);

export { inPlazaWay, PILLARS, TOWERS, HOUSES, STALLS, COLUMNS, TABLES, HEARTH, TREES, CYPRESS, HEDGES, LAMPS, FOLK };
