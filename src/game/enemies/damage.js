// Enemies taking hits and dying: knockback, stun, damage numbers, then XP, potion charges, loot and
// quest kills.

import { tune } from '../../config.js';
import { emit, FX, NUMS, state } from '../state.js';
import { sfx } from '../../audio/sfx.js';
import { chat } from '../chat.js';
import { moveEnt } from '../world/grid.js';
import { dropLoot } from '../loot/drops.js';
import { completeQuest } from '../quests.js';
import { wakePack } from './ai.js';
import { onBossDown } from '../warden.js';
import { gainXp } from '../hero/level.js';

function damageEnemy(e, dmg, o) {
  if (e.dead || (e.kind === 'warden' && !state.bossFight)) return;
  dmg = Math.max(1, Math.round(dmg));
  e.hp -= dmg; e.hurtT = 0.12;
  if (e.state === 'idle' || e.state === 'standoff' || e.state === 'return') {
    e.state = 'chase'; e.target = o.hero ? { kind: 'hero' } : { kind: 'bot', id: o.by }; e.retarget = 1.5; wakePack(e);
  }
  if (o.knock && e.kind !== 'warden' && !(e.act && e.act.type === 'charge')) {
    const a = Math.atan2(e.x - o.fromX, e.z - o.fromZ), k = o.knock * (e.kind === 'brute' ? 0.3 : 1);
    moveEnt(e, Math.sin(a) * k, Math.cos(a) * k);
  }
  if (o.stun) e.stun = Math.max(e.stun, e.kind === 'warden' ? o.stun * 0.3 : o.stun);
  if (o.hero) {
    const h = state.hero; h.combatT = 0;
    if (h.lifeHit) h.hp = Math.min(h.maxHp, h.hp + h.lifeHit);
    addNum(e, dmg, o.crit, o.agg);
    if (o.crit) sfx.crit();
    FX.push({ type: 'spark', x: e.x, z: e.z, y: e.kind === 'brute' ? 1.5 : e.kind === 'warden' ? 3 : 0.9, color: o.crit ? 0xffe070 : 0xfff0d0, n: o.crit ? 10 : 6 });
  }
  emit({ type: 'hit', kind: e.kind, dmg });
  if (e.hp <= 0) killEnemy(e);
}
function addNum(e, dmg, crit, agg) { // the hits of one swing or skill add into one rising number
  const now = state.t;
  if (agg) {
    const n = NUMS.find(q => q.agg === agg && now - q.t0 < 0.6);
    if (n) { n.v += dmg; n.t0 = now; n.crit = n.crit || crit; n.multi = true; return; }
  }
  NUMS.push({ x: e.x, z: e.z, y: e.kind === 'warden' ? 6.5 : e.kind === 'brute' ? 2.9 : 1.9, v: dmg, crit, agg, t0: now, multi: false });
  if (NUMS.length > 40) NUMS.shift();
}
function killEnemy(e) {
  const s = state, h = s.hero;
  e.dead = true; e.deadT = 0; e.act = null; e.tele = null; s.kills++;
  emit({ type: 'kill', kind: e.kind });
  FX.push({ type: 'death', x: e.x, z: e.z, kind: e.kind });
  if (e.summoned) return;
  const xp = { wolf: tune.xpWolf, spitter: tune.xpSpitter, brute: tune.xpBrute, rogue: tune.xpRogue, warden: tune.xpBoss }[e.kind];
  gainXp(Math.round(xp * (e.lab && e.kind !== 'warden' ? 1.3 : 1)));
  if (++h.potionProg >= tune.potionKills) {
    h.potionProg = 0;
    if (h.potions < tune.potionCharges) { h.potions++; FX.push({ type: 'ring', x: h.x, z: h.z, r: 1.2, color: 0xd04040 }); }
  }
  if (h.flags.emberwake) for (const k in h.cd) h.cd[k] = Math.max(0, h.cd[k] - 1);
  dropLoot(e);
  if (e.kind === 'wolf' && !s.quests.q1) { s.quests.wolves++; if (s.quests.wolves >= 6) completeQuest('q1'); }
  if (e.kind === 'rogue') { s.playersAlive--; chat('', `${e.name} [BOT] fell in the Red Hollow.`, 'death'); }
  if (e.kind === 'warden') onBossDown();
}

export { damageEnemy };
