// What the hero can click (loot, caches, the quest board, waystones, players) and what walking into
// an area does (banner, town refill, the door Waystone, the boss fight, the stairs).

import { tune } from '../../config.js';
import { dist } from '../../math.js';
import { emit, state } from '../state.js';
import { sfx } from '../../audio/sfx.js';
import { SPAWN, CRYSTAL, BOARD, DOORSTONE, AREA_INFO } from './floor1.js';
import { openCache, bankHaul } from '../hollow.js';
import { travel } from '../hero/hero.js';
import { chat, announce } from '../chat.js';
import { areaAt } from './grid.js';
import { addToInventory } from '../inventory.js';
import { recruit } from '../bots/party.js';
import { startBossFight, endFloor } from '../warden.js';
import { saveGame } from '../save.js';

function findHover(aim) {
  if (!aim) return null;
  const s = state; let best = null, bd = 1e9;
  const consider = (type, id, x, z, rad) => { const d = Math.hypot(aim.x - x, aim.z - z); if (d < rad && d < bd) { bd = d; best = { type, id, x, z }; } };
  for (const d of s.drops) if (d.settled && d.type !== 'gold') consider(d.type, d.id, d.x, d.z, 1.1);
  consider('board', 0, BOARD.x, BOARD.z, 1.8);
  consider('crystal', 0, CRYSTAL.x, CRYSTAL.z, 1.4);
  if (s.doorStone) consider('doorstone', 0, DOORSTONE.x, DOORSTONE.z, 1.4);
  for (const b of s.bots) if (b.alive && recruitable(b)) consider('bot', b.id, b.x, b.z, 0.9);
  return best;
}
function recruitable(b) { return !b.party && (b.mode === 'town' || b.mode === 'lfg' || b.mode === 'field'); }
function resolveHover(t) {
  const s = state;
  if (t.type === 'item' || t.type === 'cache') { const d = s.drops.find(q => q.id === t.id); return d ? { type: t.type, x: d.x, z: d.z, reach: tune.pickupReach, drop: d } : null; }
  if (t.type === 'bot') { const b = s.bots.find(q => q.id === t.id); return b && b.alive && recruitable(b) ? { type: 'bot', x: b.x, z: b.z, reach: 2.4, bot: b } : null; }
  if (t.type === 'board') return { type: 'board', x: BOARD.x, z: BOARD.z + 1.4, reach: 1.6 };
  if (t.type === 'crystal') return { type: 'crystal', x: CRYSTAL.x, z: CRYSTAL.z + 1.5, reach: 1.6 };
  if (t.type === 'doorstone') return { type: 'doorstone', x: DOORSTONE.x, z: DOORSTONE.z + 1.5, reach: 1.8 };
  return null;
}
function interact(t) {
  const s = state;
  if (t.type === 'item') addToInventory(t.drop);
  else if (t.type === 'cache') openCache(t.drop);
  else if (t.type === 'board') { s.ui.panel = 'board'; sfx.click(); emit({ type: 'board' }); }
  else if (t.type === 'crystal') {
    if (s.doorStone) travel(DOORSTONE.x - 2, DOORSTONE.z + 1.5);
    else chat('', "The Waystone at the Warden's door is not lit yet. Reach it once to travel there.", 'sys');
  } else if (t.type === 'doorstone') travel(SPAWN.x, SPAWN.z);
  else if (t.type === 'bot') recruit(t.bot);
}

// ---- Areas, quests, levels, chat --------------------------------------------------------------------
function updateArea() {
  const s = state, h = s.hero; if (h.dead) return;
  const a = areaAt(h.x, h.z);
  if (a !== s.area) {
    const prev = s.area; s.area = a;
    if (prev === 'hollow') bankHaul();
    if (a === 'town' && h.potions < tune.potionCharges) { h.potions = tune.potionCharges; chat('', 'Potions refilled in Ashgate.', 'sys'); }
    const info = AREA_INFO[a]; announce(info.name, info.sub, info.color);
    emit({ type: 'area', area: a });
  }
  if (!s.doorStone && dist(h, DOORSTONE) < 4) { s.doorStone = true; announce('Waystone lit', 'Click the Waystone in Ashgate to come straight back here', '#9fd8ff'); sfx.heal(); saveGame(); }
  if (!s.bossFight && !s.wardenDown && h.x > 203.5) startBossFight();
  if (s.stairsOpen && h.x > 226 && Math.abs(h.z) < 3.5) {
    if (!s.flags.resultsShown) endFloor();
    else if (s.t - s.flags.stairNote > 6) { s.flags.stairNote = s.t; announce('The stairs climb into the dark', 'Floor 2 is not built yet', '#cfd8e6'); }
  }
}

export { findHover, resolveHover, interact, updateArea };
