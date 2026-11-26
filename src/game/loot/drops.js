// Loot on the ground: what a kill drops, drops flying out and settling, gold flying to you, and
// placing an item at your feet.

import { tune } from '../../config.js';
import { rng, rrange, dist } from '../../math.js';
import { emit, nid, state } from '../state.js';
import { sfx } from '../../audio/sfx.js';
import { BOSS_UNIQUE, rollRarity, rollKind, makeItem, uniqueItem } from './items.js';
import { isSolid, circleFree, inHollow } from '../world/grid.js';

function placeItem(item, x, z) {
  const s = state, h = s.hero;
  if (!circleFree(x, z, 0.3)) { x = h.x; z = h.z; }
  s.drops.push({ id: nid(), type: 'item', x, z, px: x, pz: z, y: 0, vy: 0, vx: 0, vz: 0, settled: true, age: 1, amount: 0, item, cache: null, name: null, flying: false });
}

// ---- Shots, drops, crowds, packs, rogues ----------------------------------------------------------
function areaIlvl(e) {
  const L = state.hero.level;
  if (e.lab) return 4 + Math.min(2, Math.floor(L / 4));
  return 1 + Math.min(2, Math.floor(L / 2));
}
function dropLoot(e) {
  const gm = { wolf: 1, spitter: 1.6, brute: 3, rogue: 0, warden: 25 }[e.kind];
  const g = Math.round(tune.goldPerKill * gm * rrange(0.6, 1.4) * (e.lab ? 1.4 : 1));
  if (g > 0) spawnDrop('gold', e.x, e.z, { amount: g });
  if (e.kind === 'rogue') { spawnDrop('cache', e.x, e.z, { cache: e.cache, name: e.name }); return; }
  if (e.kind === 'warden') { spawnDrop('item', e.x - 1, e.z, { item: uniqueItem(BOSS_UNIQUE, 8) }); spawnDrop('item', e.x + 1, e.z + 1, { item: makeItem('armor', 8, 2) }); return; }
  const ch = { wolf: tune.dropWolf, spitter: tune.dropSpitter, brute: tune.dropBrute }[e.kind] * (e.lab ? 1.3 : 1);
  if (rng() < ch) spawnDrop('item', e.x, e.z, { item: makeItem(rollKind(), areaIlvl(e), rollRarity()) });
}
function spawnDrop(type, x, z, o) {
  const a = rng() * Math.PI * 2, sp = rrange(1.0, 2.6);
  const d = { id: nid(), type, x, z, px: x, pz: z, y: 0.8, vy: rrange(4, 6), vx: Math.sin(a) * sp, vz: Math.cos(a) * sp, settled: false, age: 0,
    amount: o.amount || 0, item: o.item || null, cache: o.cache || null, name: o.name || null, flying: false };
  state.drops.push(d);
  if (d.item) { sfx.drop(d.item.rarity); emit({ type: 'drop', rarity: d.item.rarity }); }
  return d;
}
function updateDrops(dt) {
  const s = state, h = s.hero;
  for (let i = s.drops.length - 1; i >= 0; i--) {
    const d = s.drops[i]; d.px = d.x; d.pz = d.z; d.age += dt;
    if (!d.settled) {
      d.vy -= 20 * dt; d.y += d.vy * dt;
      const nx = d.x + d.vx * dt, nz = d.z + d.vz * dt;
      if (!isSolid(nx, nz)) { d.x = nx; d.z = nz; }
      if (d.y <= 0) { d.y = 0; d.settled = true; d.vx = d.vz = 0; }
      continue;
    }
    if (d.type === 'gold' && !h.dead) {
      const dd = dist(d, h);
      if (d.flying || (d.age > 0.45 && dd < tune.goldMagnet)) {
        d.flying = true; const sp = 16 * dt;
        if (dd <= Math.max(0.6, sp)) { collectGold(d.amount); s.drops.splice(i, 1); continue; }
        d.x += (h.x - d.x) / dd * sp; d.z += (h.z - d.z) / dd * sp; d.y = 0.5;
      }
    }
  }
  if (s.drops.length > 90) { const k = s.drops.findIndex(d => d.type === 'item' && d.item.rarity === 0); if (k >= 0) s.drops.splice(k, 1); }
}
function collectGold(n) {
  const h = state.hero;
  if (inHollow(h.x, h.z)) h.haul.gold += n; else h.gold += n;
  sfx.gold(); emit({ type: 'gold', n });
}

export { placeItem, dropLoot, spawnDrop, updateDrops };
