// Where bodies can stand and how they move: the walkable grid carved from the layout, the Warden's
// door, moveEnt, moveDir, line of sight, areaAt, placeNear, separate.

import { dist, turnToward } from '../../math.js';
import { state } from '../state.js';
import { WORLD, TOWN, FIELD, HOLLOW, RIDGE, CRYSTAL, HALL, DOOR, LANTERN_WALL, PATH, MAZE_X0, CELL, MAZE_Z0, MAZE } from './floor1.js';

const GW = WORLD.x1 - WORLD.x0, GH = WORLD.z1 - WORLD.z0;
const solid = new Uint8Array(GW * GH).fill(1);
let doorClosed = false; // the Warden's door, shut while the boss fight runs
const HOUSES = [
  { x: -26, z: -10, w: 6, d: 6, roof: 0x2b2a31 }, { x: -26, z: 12, w: 6, d: 6, roof: 0x4a3a24 },
  { x: -12, z: 17, w: 6, d: 5, roof: 0x2b2a31 }, { x: 10, z: -14, w: 6, d: 6, roof: 0x4a3a24 },
  { x: -18, z: -14, w: 5, d: 5, roof: 0x3a2f2a },
];
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
  if (z < -63) return 'hollow';
  if (x >= TOWN.x0 - 1 && x <= TOWN.x1 + 1 && z >= TOWN.z0 - 1 && z <= TOWN.z1 + 1) return 'town';
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
  // Ashgate's palisade, with its east gate
  setRect(TOWN.x0 - 1, TOWN.z0 - 1, TOWN.x0, TOWN.z1 + 1, 1);
  setRect(TOWN.x0 - 1, TOWN.z0 - 1, TOWN.x1 + 1, TOWN.z0, 1);
  setRect(TOWN.x0 - 1, TOWN.z1, TOWN.x1 + 1, TOWN.z1 + 1, 1);
  setRect(TOWN.x1, TOWN.z0 - 1, TOWN.x1 + 1, -4, 1);
  setRect(TOWN.x1, 4, TOWN.x1 + 1, TOWN.z1 + 1, 1);
  for (const h of HOUSES) setRect(h.x - h.w / 2, h.z - h.d / 2, h.x + h.w / 2, h.z + h.d / 2, 1);
  setRect(LANTERN_WALL.x0, TOWN.z0 - 1, LANTERN_WALL.x1, LANTERN_WALL.z + 0.6, 1);
  setRect(CRYSTAL.x - 0.8, CRYSTAL.z - 0.8, CRYSTAL.x + 0.8, CRYSTAL.z + 0.8, 1);
  for (let k = 0; k < 8; k++) {
    const a = k * Math.PI / 4 + Math.PI / 8;
    setCircle(HALL.x + Math.cos(a) * 12, HALL.z + Math.sin(a) * 12, 1.1, 1);
  }
})();

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

export { GW, GH, doorClosed, HOUSES, setCircle, isSolid, circleFree, moveEnt, los, areaAt, inHollow, distToPath, moveDir, placeNear, separate };
