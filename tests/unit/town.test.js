// Ashgate's layout: nothing you need is walled off. A walk over the grid from the spawn point, with
// the hero's radius and the field's decoration in place, must reach every landmark, every town bot's
// spot and the way out; the wall must hold everywhere but the gate.
import { describe, it, expect } from 'vitest';
import { setSeed } from '../../src/math.js';
import { circleFree, isSolid, areaAt, townSpot } from '../../src/game/world/grid.js';
import '../../src/game/world/decor.js';
import { WORLD, TOWN, GATE, PLAZA, MEMORIAL, FORECOURT, AVENUE, SANCTUARY, GARDEN, WELL_YARD, MARKET, FORGE_YARD, GATE_SQUARE, SPAWN, CRYSTAL, BOARD, FORGE, LANTERN_WALL, WELL, DOORSTONE } from '../../src/game/world/floor1.js';
import { FRAME, HOUSES, PILLARS, PYLONS } from '../../src/game/world/town.js';
import { BOT_ROSTER } from '../../src/game/bots/roster.js';

function reachableFromSpawn(r) {
  const W = WORLD.x1 - WORLD.x0, H = WORLD.z1 - WORLD.z0, seen = new Uint8Array(W * H);
  const at = (i, j) => (j - WORLD.z0) * W + (i - WORLD.x0);
  const stack = [[Math.floor(SPAWN.x), Math.floor(SPAWN.z)]]; seen[at(...stack[0])] = 1;
  while (stack.length) {
    const [i, j] = stack.pop();
    for (const [a, b] of [[i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]]) {
      if (a < WORLD.x0 || a >= WORLD.x1 || b < WORLD.z0 || b >= WORLD.z1 || seen[at(a, b)]) continue;
      if (!circleFree(a + 0.5, b + 0.5, r)) continue;
      seen[at(a, b)] = 1; stack.push([a, b]);
    }
  }
  return (x, z) => !!seen[at(Math.floor(x), Math.floor(z))];
}
const reach = reachableFromSpawn(0.5);
const mid = (a, b) => (a + b) / 2;

describe('Ashgate', () => {
  it('the spawn point is open ground inside the town', () => {
    expect(circleFree(SPAWN.x, SPAWN.z, 0.5)).toBe(true);
    expect(areaAt(SPAWN.x, SPAWN.z)).toBe('town');
  });

  it('the hero can walk from the spawn point to every landmark and out of the gate', () => {
    const spots = {
      'the Waystone': [CRYSTAL.x, CRYSTAL.z + 1.5], 'the quest board': [BOARD.x, BOARD.z + 1.4], 'the forge': [FORGE.x, FORGE.z + 2.5],
      'the Hall of Lanterns door': [mid(MEMORIAL.x0, MEMORIAL.x1), MEMORIAL.z1 + 2], 'the lantern wall': [mid(LANTERN_WALL.x0, LANTERN_WALL.x1), LANTERN_WALL.z + 3],
      'the Sanctuary': [mid(SANCTUARY.x0, SANCTUARY.x1), SANCTUARY.z1 - 3], 'the well': [WELL.x, WELL.z + 3],
      'inside the gate': [TOWN.x1 - 2, mid(GATE.z0, GATE.z1)], 'outside the gate': [TOWN.x1 + 6, mid(GATE.z0, GATE.z1)],
      "the Warden's door": [DOORSTONE.x - 2, DOORSTONE.z + 1.5],
    };
    for (const [name, [x, z]] of Object.entries(spots)) expect(reach(x, z), name).toBe(true);
  });

  it('every bot player who starts in town stands on open ground the hero can reach', () => {
    for (const b of BOT_ROSTER.filter(q => q.mode === 'town' || q.mode === 'lfg')) {
      expect(circleFree(b.x, b.z, 0.45), b.name).toBe(true);
      expect(reach(b.x, b.z), b.name).toBe(true);
    }
  });

  it('a bot walking home is sent somewhere open in the plaza', () => {
    setSeed(4);
    for (let i = 0; i < 200; i++) {
      const p = townSpot();
      expect(circleFree(p.x, p.z, 0.6)).toBe(true);
      expect(Math.hypot(p.x - PLAZA.x, p.z - PLAZA.z)).toBeLessThan(PLAZA.r);
    }
  });

  it('the wall holds everywhere but the east gate', () => {
    for (let z = TOWN.z0; z < TOWN.z1; z++) {
      expect(isSolid(TOWN.x0 - 1, z + 0.5), `west wall at z ${z}`).toBe(true);
      const gate = z >= GATE.z0 && z < GATE.z1;
      expect(isSolid(TOWN.x1 + 1, z + 0.5), `east wall at z ${z}`).toBe(!gate);
    }
    for (let x = TOWN.x0; x < TOWN.x1; x++) {
      expect(isSolid(x + 0.5, TOWN.z0 - 1), `north wall at x ${x}`).toBe(true);
      expect(isSolid(x + 0.5, TOWN.z1 + 1), `south wall at x ${x}`).toBe(true);
    }
  });

  it('the whole town counts as town, its far north end too, and the field starts past the gate', () => {
    expect(areaAt(mid(LANTERN_WALL.x0, LANTERN_WALL.x1), LANTERN_WALL.z + 2)).toBe('town');
    expect(areaAt(TOWN.x0 + 2, TOWN.z0 + 1)).toBe('town');
    expect(areaAt(TOWN.x1 + 6, 0)).toBe('field');
  });

  it('what is drawn solid is solid: piers, towers, columns, the forge wall, the board, the well', () => {
    const hx = mid(MEMORIAL.x0, MEMORIAL.x1), S = SANCTUARY;
    const spots = {
      'the Hall portal, west pier': [hx - MEMORIAL.door - 1, MEMORIAL.z1 + 1], 'the Hall portal, east pier': [hx + MEMORIAL.door + 1, MEMORIAL.z1 + 1],
      'the Sanctuary west tower': [S.x0 + 2.5, S.z1 - 2.5], 'the Sanctuary east tower': [S.x1 - 2.5, S.z1 - 2.5],
      'the forge hood wall': [FORGE.x + 0.6, FORGE.z - 1.3], 'the quest board': [BOARD.x, BOARD.z],
      'the well, west post': [WELL.x - 0.85, WELL.z], 'the well, east post': [WELL.x + 0.85, WELL.z],
      'the spire base, a corner': [PLAZA.x + 1.5, PLAZA.z - 1.5],
    };
    for (const [name, [x, z]] of Object.entries(spots)) expect(isSolid(x, z), name).toBe(true);
    for (const p of PYLONS) expect(isSolid(p.x, p.z), `pier at ${p.x.toFixed(1)}, ${p.z.toFixed(1)}`).toBe(true);
    for (const p of PILLARS.filter(q => q.on)) expect(isSolid(p.x, p.z), `column ${p.i}`).toBe(true);
  });

  it('you can walk right up to the lantern wall', () => {
    expect(circleFree(mid(LANTERN_WALL.x0, LANTERN_WALL.x1), LANTERN_WALL.z + 0.55, 0.5)).toBe(true);
  });

  it('is one street: nothing in town is walkable off the route from the plaza to the gate', () => {
    const route = [FRAME, FORECOURT, MEMORIAL, AVENUE, GARDEN, WELL_YARD, MARKET, FORGE_YARD, GATE_SQUARE];
    const onRoute = (x, z) => route.some(r => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1);
    const stray = [];
    for (let z = TOWN.z0; z < TOWN.z1; z++) for (let x = TOWN.x0; x < TOWN.x1; x++)
      if (reach(x + 0.5, z + 0.5) && !onRoute(x + 0.5, z + 0.5)) stray.push(`${x},${z}`);
    expect(stray).toEqual([]);
  });

  it('every part of the route can be reached', () => {
    const parts = { 'the forecourt': FORECOURT, 'the avenue': AVENUE, 'the garden': { ...GARDEN, z0: SANCTUARY.z1, x1: SANCTUARY.x0 }, 'the well yard': WELL_YARD, 'the market': MARKET, 'the forge yard': FORGE_YARD, 'the gate square': GATE_SQUARE };
    for (const [name, r] of Object.entries(parts)) {
      let any = false;
      for (let z = r.z0; z < r.z1 && !any; z++) for (let x = r.x0; x < r.x1 && !any; x++) any = reach(x + 0.5, z + 0.5);
      expect(any, name).toBe(true);
    }
  });

  it('fills the blocks with houses that never overlap', () => {
    expect(HOUSES.length).toBeGreaterThan(50);
    for (let i = 0; i < HOUSES.length; i++) for (let j = i + 1; j < HOUSES.length; j++) {
      const a = HOUSES[i], b = HOUSES[j];
      expect(a.x0 < b.x1 && a.x1 > b.x0 && a.z0 < b.z1 && a.z1 > b.z0, `houses ${i} and ${j}`).toBe(false);
    }
  });
});
