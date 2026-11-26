// Who is on Floor 1: populateWorld() fills a fresh world (hero, bot players, packs, rogues, the
// sleeping Warden), and cleared packs come back.

import { tune } from '../../config.js';
import { FX, NUMS, setShake, state } from '../state.js';
import { HALL, AREA_INFO } from './floor1.js';
import { BOT_ROSTER, makeBot } from '../bots/roster.js';
import { spawnRogue } from '../hollow.js';
import { PACKS, makeEnemy, spawnPack } from '../enemies/spawn.js';
import { makeHero, recalcHero } from '../hero/hero.js';
import { makeItem } from '../loot/items.js';
import { chat, announce } from '../chat.js';
import { setDoorClosed } from './grid.js';
import { spawnDrop } from '../loot/drops.js';
import { rescueDone } from '../bots/party.js';

function populateWorld() {
  const s = state;
  setDoorClosed(false); FX.length = 0; NUMS.length = 0; setShake(0);
  s.hero = makeHero();
  BOT_ROSTER.forEach((d, i) => s.bots.push(makeBot(d, i)));
  PACKS.forEach((p, i) => { s.packs.push({ cleared: false, respawnT: 0 }); spawnPack(i, true); });
  for (let i = 0; i < tune.rogueCount; i++) spawnRogue(false);
  const b = makeEnemy('warden', HALL.x + 1, HALL.z, -1, 'hall');
  b.state = 'dormant'; b.face = -Math.PI / 2; s.boss = b; s.enemies.push(b);
  recalcHero(); s.hero.hp = s.hero.maxHp;
  chat('', 'Logout unavailable. Clear the floors to leave the tower.', 'sys');
  chat('', 'The quest board in the square has notices. Click it to read them.', 'sys');
  announce(AREA_INFO.town.name, AREA_INFO.town.sub, AREA_INFO.town.color);
}

// ---- Shots, drops, crowds, packs, rogues ----------------------------------------------------------
function updatePacks(dt) {
  const s = state, h = s.hero;
  s.packs.forEach((p, i) => {
    const def = PACKS[i];
    if (!p.cleared) {
      if (!s.enemies.some(e => e.pack === i && !e.dead)) { p.cleared = true; p.respawnT = tune.packRespawn; onPackCleared(i); }
    } else {
      p.respawnT -= dt;
      if (p.respawnT <= 0 && Math.hypot(h.x - def.x, h.z - def.z) > 45 && !s.bossFight) { p.cleared = false; spawnPack(i, false); }
    }
  });
}
function onPackCleared(i) {
  const s = state, def = PACKS[i];
  if (def.first && !s.flags.firstDrop) { s.flags.firstDrop = true; spawnDrop('item', def.x + 1, def.z, { item: makeItem('sword', 2, 1) }); }
  if (def.rescue) { const b = s.bots.find(q => q.name === def.rescue); if (b && b.alive && !b.rescued && b.mode === 'rescue') rescueDone(b); }
}

export { populateWorld, updatePacks };
