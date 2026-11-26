// Bot players joining your raid party, being rescued, getting hurt and falling (their lantern goes
// dark).

import { tune } from '../../config.js';
import { pick, dist } from '../../math.js';
import { emit, FX, state } from '../state.js';
import { sfx } from '../../audio/sfx.js';
import { CLASS_NAME, partyCount } from './roster.js';
import { JOIN_LINES, GRIEF_LINES, chat, announce } from '../chat.js';
import { checkRescueQuest } from '../quests.js';
import { gainXp } from '../hero/level.js';
import { saveGame } from '../save.js';

function joinParty(b) {
  const s = state, used = new Set(s.bots.filter(q => q.party && q.alive).map(q => q.slot));
  let slot = 0; while (used.has(slot)) slot++;
  b.party = true; b.mode = 'party'; b.slot = slot; b.goal = null; b.trouble = false;
  chat(b.name, pick(JOIN_LINES), 'party');
  announce(`${b.name} joins your raid party`, `${CLASS_NAME[b.cls]} · party ${partyCount()}/${tune.partySize}`, '#7fe0d0');
  sfx.quest(); emit({ type: 'join', name: b.name }); saveGame();
}
function recruit(b) {
  if (partyCount() >= tune.partySize) { chat('', `Your raid party is full (${tune.partySize}/${tune.partySize}).`, 'sys'); return; }
  joinParty(b);
}
function rescueDone(b) {
  const s = state; if (!b.alive || b.rescued) return;
  b.rescued = true; b.trouble = false; s.quests.rescued++;
  gainXp(tune.xpRescue); FX.push({ type: 'ring', x: b.x, z: b.z, r: 1.6, color: 0xffc070 });
  if (partyCount() < tune.partySize) joinParty(b);
  else { b.mode = 'toTown'; b.walkT = 0; chat(b.name, 'thank you. I will wait in Ashgate if you need me.', 'bot'); }
  checkRescueQuest();
}

function hurtBot(b, dmg) {
  if (!b.alive || b.mode === 'town' || b.mode === 'lfg' || b.mode === 'toTown') return;
  let d = dmg;
  if ((b.mode === 'rescue' || b.mode === 'field') && dist(b, state.hero) > 10) d *= tune.rescueGrace;
  b.hp -= d; b.hurtT = 0.12; b.combatT = 0;
  if (b.hp <= 0) botDie(b);
}
function botDie(b) {
  const s = state, wasParty = b.party;
  b.alive = false; b.hp = 0; b.deadT = 0; b.act = null; b.party = false;
  s.playersAlive--; s.fallen.push(b.name);
  chat('', `${b.name}'s lantern went dark.`, 'death');
  const mourner = s.bots.find(q => q.alive && q.party) || s.bots.find(q => q.alive && q.mode === 'town');
  if (mourner) chat(mourner.name, pick(GRIEF_LINES).replace('{n}', b.name), mourner.party ? 'party' : 'bot');
  announce(`${b.name} has fallen`, wasParty ? 'Gone for good. Their lantern in Ashgate is dark.' : 'Their lantern in Ashgate is dark.', '#ff8a78');
  sfx.toll(); FX.push({ type: 'fade', x: b.x, z: b.z }); emit({ type: 'botDied', name: b.name });
  if (b.packId) checkRescueQuest();
  for (const e of s.enemies) if (e.target && e.target.kind === 'bot' && e.target.id === b.id) { e.target = null; e.retarget = 0; }
  saveGame();
}

export { recruit, rescueDone, hurtBot };
