// The Red Hollow (the PvP zone): rogue players and their respawns, their caches, and carrying your
// haul out to keep it.

import { tune } from '../config.js';
import { rng, rrange } from '../math.js';
import { emit, state } from './state.js';
import { sfx } from '../audio/sfx.js';
import { HOLLOW } from './world/floor1.js';
import { makeEnemy } from './enemies/spawn.js';
import { rollRarity, makeItem } from './loot/items.js';
import { chat, announce } from './chat.js';
import { circleFree, inHollow } from './world/grid.js';
import { placeItem } from './loot/drops.js';
import { completeQuest } from './quests.js';
import { saveGame } from './save.js';

const ROGUE_NAMES = ['Vex', 'Nyx', 'Cutter', 'Morrow', 'Rook', 'Shade', 'Fen', 'Grist', 'Lark', 'Thorne', 'Quill', 'Sorrel'];

// ---- A new world ------------------------------------------------------------------------------
function spawnRogue(fromEdge) {
  const s = state; let x = 0, z = 0, tries = 0;
  do {
    x = rrange(HOLLOW.x0 + 4, HOLLOW.x1 - 4);
    z = fromEdge ? rrange(HOLLOW.z0 + 3, HOLLOW.z0 + 12) : rrange(HOLLOW.z0 + 4, HOLLOW.z1 - 10);
  } while (!circleFree(x, z, 0.7) && ++tries < 50);
  const e = makeEnemy('rogue', x, z, -1, 'hollow');
  const lap = Math.floor(s.rogueIdx / ROGUE_NAMES.length);
  e.name = ROGUE_NAMES[s.rogueIdx % ROGUE_NAMES.length] + (lap ? ' ' + (lap + 1) : '');
  s.rogueIdx++;
  const item = rng() < tune.dropRogue ? makeItem(rng() < 0.55 ? 'sword' : 'armor', 3 + Math.min(2, Math.floor(s.hero.level / 3)), Math.max(1, rollRarity())) : null;
  e.cache = { gold: Math.round(tune.cacheGold * rrange(0.6, 1.5)), items: item ? [item] : [] };
  s.enemies.push(e);
}

// ---- Things to click: loot, caches, the board, waystones, players ------------------------------
function openCache(d) {
  const s = state, h = s.hero, c = d.cache || { gold: 0, items: [] };
  s.drops.splice(s.drops.indexOf(d), 1);
  const what = `${c.gold} gold${c.items.length ? ' and ' + c.items.map(i => i.name).join(', ') : ''}`;
  if (inHollow(h.x, h.z)) { h.haul.gold += c.gold; h.haul.items.push(...c.items); chat('', `Cache opened: ${what}, into your haul.`, 'warn'); }
  else { h.gold += c.gold; c.items.forEach((it, i) => placeItem(it, h.x + 1 + i * 0.6, h.z + 0.4)); chat('', `Cache opened: ${what}.`, 'sys'); }
  sfx.gold(); if (c.items.length) sfx.drop(Math.max(...c.items.map(i => i.rarity))); emit({ type: 'cache' });
}
function bankHaul() {
  const s = state, h = s.hero, hl = h.haul;
  if (!hl.gold && !hl.items.length) return;
  h.gold += hl.gold;
  hl.items.forEach((it, i) => placeItem(it, h.x + Math.cos(i * 1.7) * 1.3, h.z + 1.2 + Math.sin(i * 1.7) * 0.6));
  announce('Haul secured', `${hl.gold} gold${hl.items.length ? ' and ' + hl.items.length + (hl.items.length > 1 ? ' items at your feet' : ' item at your feet') : ''}`, '#f2d257');
  hl.gold = 0; hl.items = [];
  if (!s.quests.q4) completeQuest('q4');
  sfx.quest(); emit({ type: 'haul' }); saveGame();
}

// ---- Shots, drops, crowds, packs, rogues ----------------------------------------------------------
function updateRogues(dt) {
  const s = state, alive = s.enemies.filter(e => e.kind === 'rogue' && !e.dead).length;
  if (alive < tune.rogueCount) { s.rogueT -= dt; if (s.rogueT <= 0) { s.rogueT = tune.rogueRespawn; spawnRogue(true); } }
}

export { spawnRogue, openCache, bankHaul, updateRogues };
