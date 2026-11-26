// The quests: completing one, the rescue quest check, the tracker lines and the minimap marker.

import { tune } from '../config.js';
import { dist } from '../math.js';
import { emit, state } from './state.js';
import { sfx } from '../audio/sfx.js';
import { STAIRS } from './world/floor1.js';
import { partyCount } from './bots/roster.js';
import { announce } from './chat.js';
import { gainXp } from './hero/level.js';
import { saveGame } from './save.js';

function checkRescueQuest() {
  const s = state, resolved = s.bots.filter(b => b.packId && (b.rescued || !b.alive)).length;
  if (resolved >= 3 && !s.quests.q2) completeQuest('q2');
}

// ---- Areas, quests, levels, chat --------------------------------------------------------------------
const QUEST_INFO = {
  q1: { name: 'Wolves at the Gate', xp: 50, gold: 25 },
  q2: { name: 'Lanterns in the Dark', xp: 80, gold: 40 },
  q4: { name: 'The Red Hollow', xp: 60, gold: 30 },
};
function completeQuest(k) {
  const s = state, q = QUEST_INFO[k]; if (s.quests[k]) return;
  s.quests[k] = true; s.hero.gold += q.gold;
  if (k === 'q1') s.hero.potions = tune.potionCharges;
  announce('Quest complete', `${q.name} · +${q.xp} XP, +${q.gold} gold`, '#f2d257');
  gainXp(q.xp); sfx.quest(); emit({ type: 'quest', id: k }); saveGame();
}
function questLines() {
  const s = state, q = s.quests;
  return [
    { title: 'Wolves at the Gate', line: q.q1 ? 'Done' : `Gloam Wolves slain ${Math.min(6, q.wolves)}/6`, done: q.q1 },
    { title: 'Lanterns in the Dark', line: q.q2 ? 'Done' : `Players rescued ${q.rescued}/3`, done: q.q2 },
    { title: 'The First Stair', line: s.wardenDown ? 'The stairs are open' : `Raid party ${partyCount()}/${tune.partySize} · defeat the Warden`, done: s.wardenDown },
    { title: 'Optional: The Red Hollow', line: q.q4 ? 'Done' : 'Carry a haul out of the Hollow', done: q.q4 },
  ];
}
function questMarker() { // where the tracker points next
  const s = state, h = s.hero;
  if (!s.quests.q1) {
    let best = null, bd = 1e9;
    for (const e of s.enemies) if (e.kind === 'wolf' && !e.dead && !e.lab && !e.summoned) { const d = dist(e, h); if (d < bd) { bd = d; best = e; } }
    if (best) return { x: best.x, z: best.z };
  }
  for (const n of ['Mira', 'Sable', 'Doran']) { const b = s.bots.find(q => q.name === n); if (b && b.alive && b.mode === 'rescue') return { x: b.x, z: b.z }; }
  if (!s.wardenDown) return h.x < 118 ? { x: 121, z: -16 } : { x: 201, z: 0 };
  return { x: STAIRS.x, z: STAIRS.z };
}

export { checkRescueQuest, completeQuest, questLines, questMarker };
