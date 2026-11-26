// XP and level-ups: xpNeed, gainXp, levelUp.

import { tune } from '../../config.js';
import { emit, FX, state } from '../state.js';
import { sfx } from '../../audio/sfx.js';
import { botStats } from '../bots/roster.js';
import { SKILLS, recalcHero } from './hero.js';
import { announce } from '../chat.js';
import { saveGame } from '../save.js';

function xpNeed(L) { return Math.round(tune.xpBase * Math.pow(L, tune.xpGrowth)); }
function gainXp(n) {
  const h = state.hero; h.xp += n; let guard = 0;
  while (h.xp >= xpNeed(h.level) && guard++ < 20) { h.xp -= xpNeed(h.level); levelUp(); }
}
function levelUp() {
  const s = state, h = s.hero; h.level++; recalcHero(); h.hp = h.maxHp;
  for (const b of s.bots) if (b.alive) botStats(b, false);
  let sub = 'Stronger and tougher, and your sword skills grow';
  for (const k of ['q', 'e', 'r']) if (h.level === tune[SKILLS[k].lv]) sub = `New sword skill: ${SKILLS[k].name} · press ${SKILLS[k].key}`;
  announce(`Level ${h.level}`, sub, '#f2d257');
  sfx.level(); FX.push({ type: 'level', x: h.x, z: h.z }); emit({ type: 'level', level: h.level }); saveGame();
}

export { xpNeed, gainXp };
