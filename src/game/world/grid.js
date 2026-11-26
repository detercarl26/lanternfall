// Where bodies can stand and how they move: the walkable grid carved from the layout, the Warden's
// door, moveEnt, moveDir, line of sight, areaAt, placeNear, separate.

import { rng, dist, turnToward } from '../../math.js';
import { state } from '../state.js';
import { WORLD, TOWN, FIELD, HOLLOW, RIDGE, GATE, PLAZA, MEMORIAL, SANCTUARY, WELL, SPAWN, CRYSTAL, BOARD, FORGE, HALL, DOOR, LANTERN_WALL, PATH, MAZE_X0, CELL, MAZE_Z0, MAZE } from './floor1.js';
import { FRAME, inPlazaWay, PILLARS, PYLONS, TOWERS, HOUSES, STALLS, COLUMNS, TABLES, HEARTH, TREES, CYPRESS, HEDGES, LAMPS, FOLK } from './town.js';

const GW = WORLD.x1 - WORLD.x0, GH = WORLD.z1 - WORLD.z0;
const solid = new Uint8Array(GW * GH).fill(1);
let doorClosed = false; // the Warden's door, shut while the boss fight runs
function cellOf(x, z) {
  const i = Math.floor(x - WORLD.x0), j = Math.floor(z - WORLD.z0);
  return (i < 0 || j < 0 || i >= GW || j >= GH) ? -1 : j * GW + i;
}
function setRect(x0, z0, x1, z1, v) {
  const i0 = Math.max(0, Math.floor(x0 - WORLD.x0)), i1 = Math.min(GW, Math.ceil(x1 - WORLD.x0));
  const j0 = Math.max(0, Math.floor(z0 - WORLD.z0)), j1 = Math.min(GH, Math.ceil(z1 - WORLD.z0));
  for (let j = j0; j < j1; j++) for (let i = i0; i < i1; i++) solid[j * GW + i] = v;
}
function setCircle(cx, cz, r, v) {
  for (let z = Math.floor(cz - r); z <= Math.ceil(cz + r); z++)
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++)
      if (Math.hypot(x + 0.5 - cx, z + 0.5 - cz) <= r) { const k = cellOf(x + 0.5, z + 0.5); if (k >= 0) solid[k] = v; }
}
function isSolid(x, z) {
  const k = cellOf(x, z);
  if (k < 0 || solid[k]) return true;
  return doorClosed && x >= DOOR.x0 && x <= DOOR.x1 && z >= DOOR.z0 && z <= DOOR.z1;
}
function circleFree(x, z, r) {
  if (isSolid(x, z)) return false;
  for (let k = 0; k < 8; k++) {
    const a = k * Math.PI / 4;
    if (isSolid(x + Math.cos(a) * r, z + Math.sin(a) * r)) return false;
  }
  return true;
}
function moveEnt(e, dx, dz) { // slides along walls, one axis at a time
  const r = e.r || 0.5; let blocked = false;
  if (dx) { if (circleFree(e.x + dx, e.z, r)) e.x += dx; else blocked = true; }
  if (dz) { if (circleFree(e.x, e.z + dz, r)) e.z += dz; else blocked = true; }
  return !blocked;
}
function los(x0, z0, x1, z1) {
  const dx = x1 - x0, dz = z1 - z0, n = Math.ceil(Math.hypot(dx, dz) / 0.5);
  for (let i = 1; i < n; i++) { const t = i / n; if (isSolid(x0 + dx * t, z0 + dz * t)) return false; }
  return true;
}
function areaAt(x, z) {
  if (x >= 199) return 'hall';
  if (x >= 120) return 'labyrinth';
  if (x >= TOWN.x0 - 1 && x <= TOWN.x1 + 1 && z >= TOWN.z0 - 1 && z <= TOWN.z1 + 1) return 'town'; // before the Hollow: the town reaches further north
  if (z < -63) return 'hollow';
  return 'field';
}
function inHollow(x, z) { return z < -64 && x > HOLLOW.x0 - 2 && x < HOLLOW.x1 + 2; }
function distToPath(x, z) {
  let best = 1e9;
  for (let i = 0; i < PATH.length - 1; i++) {
    const [ax, az] = PATH[i], [bx, bz] = PATH[i + 1], vx = bx - ax, vz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz)));
    best = Math.min(best, Math.hypot(x - ax - vx * t, z - az - vz * t));
  }
  return best;
}

(function carve() {
  setRect(FIELD.x0, FIELD.z0, FIELD.x1, FIELD.z1, 0);
  setRect(HOLLOW.x0, HOLLOW.z0, HOLLOW.x1, HOLLOW.z1, 0);
  for (const [a, b] of RIDGE.gaps) setRect(a, RIDGE.z0, b, RIDGE.z1, 0);
  for (let r = 0; r < MAZE.length; r++) for (let c = 0; c < MAZE[r].length; c++)
    if (MAZE[r][c] === '.') setRect(MAZE_X0 + c * CELL, MAZE_Z0 + r * CELL, MAZE_X0 + (c + 1) * CELL, MAZE_Z0 + (r + 1) * CELL, 0);
  setRect(116, -20, 122, -12, 0);   // the field's mouth into the labyrinth
  setRect(196, -4, 204, 4, 0);      // the passage through the Warden's door
  setCircle(HALL.x, HALL.z, HALL.r, 0);
  carveTown();
  for (let k = 0; k < 8; k++) {
    const a = k * Math.PI / 4 + Math.PI / 8;
    setCircle(HALL.x + Math.cos(a) * 12, HALL.z + Math.sin(a) * 12, 1.1, 1);
  }
})();

// Ashgate: open ground inside the walls, the east gate the one way out; then everything standing in it.
// Each footprint matches what town-meshes.js draws, to whole cells where it can.
function carveTown() {
  const block = (x0, z0, x1, z1) => setRect(x0, z0, x1, z1, 1);
  setRect(TOWN.x0, TOWN.z0, TOWN.x1, TOWN.z1, 0);
  setRect(TOWN.x1, GATE.z0, TOWN.x1 + 2, GATE.z1, 0);
  for (const t of TOWERS) setCircle(t.x, t.z, t.r, 1);
  // the plaza: a round court in a square frame, solid from the arcade's wall outward except through the ways;
  // the columns stand in front of the wall, a pier at each side of each way
  const R0 = PLAZA.ring - 1.9;
  for (let z = FRAME.z0; z < FRAME.z1; z++) for (let x = FRAME.x0; x < FRAME.x1; x++)
    if (Math.hypot(x + 0.5 - PLAZA.x, z + 0.5 - PLAZA.z) > R0 && !inPlazaWay(x + 0.5, z + 0.5)) block(x, z, x + 1, z + 1);
  for (const p of PILLARS) if (p.on) setCircle(p.x, p.z, 0.75, 1);
  for (const p of PYLONS) block(p.x - 0.9, p.z - 0.9, p.x + 0.9, p.z + 0.9);
  block(PLAZA.x - 2, PLAZA.z - 2, PLAZA.x + 2, PLAZA.z + 2);                                   // the spire's base
  block(CRYSTAL.x - 0.8, CRYSTAL.z - 0.8, CRYSTAL.x + 0.8, CRYSTAL.z + 0.8);
  block(BOARD.x - 1.3, BOARD.z - 0.3, BOARD.x + 1.3, BOARD.z + 0.3);
  // the Hall of Lanterns: walls with a door in the south side, the portal's piers, corner towers, columns, the lantern wall
  const hx = (MEMORIAL.x0 + MEMORIAL.x1) / 2;
  houseWalls(MEMORIAL, 2);
  for (const s of [-1, 1]) block(hx + s * (MEMORIAL.door + 1) - 1, MEMORIAL.z1, hx + s * (MEMORIAL.door + 1) + 1, MEMORIAL.z1 + 2);
  for (const x of [MEMORIAL.x0, MEMORIAL.x1]) for (const z of [MEMORIAL.z0, MEMORIAL.z1]) setCircle(x, z, 2.3, 1);
  for (const c of COLUMNS) setCircle(c.x, c.z, 0.9, 1);
  block(LANTERN_WALL.x0, LANTERN_WALL.z - 1.2, LANTERN_WALL.x1, LANTERN_WALL.z - 0.15);
  // the Sanctuary: walls, the two front towers, the long tables and the hearth
  houseWalls(SANCTUARY, 2);
  for (const x of [SANCTUARY.x0, SANCTUARY.x1 - 3]) block(x, SANCTUARY.z1 - 3, x + 3, SANCTUARY.z1);
  for (const t of [...TABLES, HEARTH]) block(t.x0, t.z0, t.x1, t.z1);
  for (const h of HOUSES) block(h.x0, h.z0, h.x1, h.z1);
  for (const s of STALLS) block(s.x - 1.5, s.z - 1, s.x + 1.5, s.z + 1);
  for (const t of [...TREES, ...CYPRESS]) setCircle(t.x, t.z, 0.6, 1);
  for (const h of HEDGES) block(h.x0, h.z0, h.x1, h.z1);
  for (const p of [...LAMPS, ...FOLK]) block(p.x - 0.5, p.z - 0.5, p.x + 0.5, p.z + 0.5);
  block(FORGE.x - 1, FORGE.z - 1.6, FORGE.x + 2.4, FORGE.z + 0.8);                             // hearth, anvil and the hood wall behind
  block(WELL.x - 1, WELL.z - 1, WELL.x + 1, WELL.z + 1);
}
function houseWalls(b, t) {
  const cx = (b.x0 + b.x1) / 2;
  setRect(b.x0, b.z0, b.x1, b.z0 + t, 1); setRect(b.x0, b.z0, b.x0 + t, b.z1, 1); setRect(b.x1 - t, b.z0, b.x1, b.z1, 1);
  setRect(b.x0, b.z1 - t, cx - b.door, b.z1, 1); setRect(cx + b.door, b.z1 - t, b.x1, b.z1, 1);
}

// Somewhere open in the plaza, for a bot walking back to town
function townSpot() {
  for (let k = 0; k < 40; k++) {
    const a = rng() * Math.PI * 2, r = 8 + rng() * 10, x = PLAZA.x + Math.cos(a) * r, z = PLAZA.z + Math.sin(a) * r;
    if (circleFree(x, z, 0.6)) return { x, z };
  }
  return { x: SPAWN.x, z: SPAWN.z };
}

function moveDir(e, ang, speed, dt) {
  moveEnt(e, Math.sin(ang) * speed * dt, Math.cos(ang) * speed * dt);
  e.face = turnToward(e.face, ang, 10 * dt); e.moving = 1; e.walkPhase += speed * dt * 1.7;
}

// ---- Things to click: loot, caches, the board, waystones, players ------------------------------
function placeNear(b, x, z) {
  for (let k = 0; k < 14; k++) {
    const a = k * 0.9 + b.slot * 2.1, r = 1.7 + (k > 6 ? 1.2 : 0), nx = x + Math.cos(a) * r, nz = z + Math.sin(a) * r;
    if (circleFree(nx, nz, b.r)) { b.x = b.px = nx; b.z = b.pz = nz; return; }
  }
  b.x = b.px = x; b.z = b.pz = z;
}

// ---- Shots, drops, crowds, packs, rogues ----------------------------------------------------------
function separate() { // no two bodies stand in one place; the Warden is never pushed
  const s = state, h = s.hero, list = [];
  if (!h.dead && !(h.act && h.act.type === 'roll')) list.push(h);
  for (const b of s.bots) if (b.alive && dist(b, h) < 40) list.push(b);
  for (const e of s.enemies) if (!e.dead && dist(e, h) < 40 && !(e.act && /charge|lunge|bossCharge/.test(e.act.type))) list.push(e);
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const a = list[i], b = list[j], dx = b.x - a.x, dz = b.z - a.z, rr = a.r + b.r, d2 = dx * dx + dz * dz;
    if (d2 >= rr * rr || d2 < 1e-6) continue;
    const d = Math.sqrt(d2), push = rr - d, nx = dx / d, nz = dz / d;
    const wa = a.kind === 'warden' ? 0 : b.kind === 'warden' ? 1 : 0.5, wb = 1 - wa;
    if (wa) moveEnt(a, -nx * push * wa, -nz * push * wa);
    if (wb) moveEnt(b, nx * push * wb, nz * push * wb);
  }
}

// Other modules cannot assign to an imported variable, so they call these.
export function setDoorClosed(v) { doorClosed = v; return v; }

export { GW, GH, doorClosed, setCircle, isSolid, circleFree, moveEnt, los, areaAt, inHollow, distToPath, moveDir, placeNear, separate, townSpot };
