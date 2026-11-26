// The hero: starting gear, stats from level and gear (recalcHero), potions, taking damage and
// falling, waystone travel, and SKILLS, the three sword skills.

import { tune } from '../../config.js';
import { emit, FX, NUMS, SHAKE, setShake, state } from '../state.js';
import { sfx } from '../../audio/sfx.js';
import { SPAWN } from '../world/floor1.js';
import { chat } from '../chat.js';
import { inHollow, placeNear } from '../world/grid.js';
import { spawnDrop } from '../loot/drops.js';

const SKILLS = {
  q: { name: 'Whirling Edge', key: 'Q', lv: 'skillQLevel', desc: 'Spin and cut everything around you' },
  e: { name: 'Rising Lunge', key: 'E', lv: 'skillELevel', desc: 'Dash through a line of enemies' },
  r: { name: 'Crescent Break', key: 'R', lv: 'skillRLevel', desc: 'A piercing wave that stuns' },
};

// ---- A new world ------------------------------------------------------------------------------
function makeHero() {
  return { id: 0, kind: 'hero', name: 'You', x: SPAWN.x, z: SPAWN.z, px: SPAWN.x, pz: SPAWN.z, r: 0.5, face: Math.PI / 2,
    hp: 1, maxHp: 1, level: 1, xp: 0, gold: 0, potions: tune.potionCharges, potionProg: 0, healLeft: 0, healRate: 0,
    act: null, dodgeCd: 0, cd: { q: 0, e: 0, r: 0 }, sword: starterSword(), armor: starterArmor(),
    combatT: 99, dead: false, deathT: 0, target: null, mouseLock: false, stuckT: 0, haul: { gold: 0, items: [] },
    moving: 0, walkPhase: 0, hurtT: 0, red: 0, dmgMult: 1, crit: 0, skillDmg: 0, lifeHit: 0, atkSpeed: 1,
    moveMult: 1, regen: 0, potionMult: 1, flags: {}, bag: [] };
}
function starterSword() { return { id: 's1', slot: 'sword', name: 'Rusted Shortsword', base: 'Shortsword', rarity: 0, ilvl: 1, min: 4, max: 7, speed: 1.1, len: 0.85, affixes: {} }; }
function starterArmor() { return { id: 's2', slot: 'armor', name: 'Frayed Coat', base: 'Coat', rarity: 0, ilvl: 1, hp: 8, red: 0.02, affixes: {} }; }
function recalcHero() {
  const h = state.hero, sw = h.sword, ar = h.armor, af = {};
  for (const it of [sw, ar]) for (const k in it.affixes) af[k] = (af[k] || 0) + it.affixes[k];
  const ratio = h.maxHp > 1 ? Math.max(0, h.hp) / h.maxHp : 1;
  h.maxHp = Math.round(tune.heroHp + tune.heroHpPerLevel * (h.level - 1) + (ar.hp || 0) + (af.hpFlat || 0));
  if (!h.dead) h.hp = Math.min(h.maxHp, Math.max(1, Math.round(h.maxHp * ratio)));
  h.red = Math.min(0.5, ar.red || 0);
  h.dmgMult = 1 + tune.heroDmgPerLevel * (h.level - 1);
  h.crit = tune.critChance + (af.crit || 0);
  h.skillDmg = af.skillDmg || 0; h.lifeHit = af.lifeHit || 0;
  h.atkSpeed = (sw.speed || 1) * (1 + (af.atkSpeed || 0));
  h.moveMult = 1 + (af.move || 0); h.regen = tune.heroRegen + (af.regen || 0); h.potionMult = 1 + (af.potion || 0);
  h.flags = { emberwake: sw.flag === 'emberwake', lanternkeeper: ar.flag === 'lanternkeeper' };
}

// ---- The hero -----------------------------------------------------------------------------------
function drinkPotion() {
  const s = state, h = s.hero;
  if (h.potions <= 0 || h.hp >= h.maxHp) return;
  h.potions--;
  const amt = h.maxHp * tune.potionHeal * h.potionMult;
  h.healLeft += amt; h.healRate = amt / tune.potionHealTime;
  sfx.potion(); FX.push({ type: 'potion', x: h.x, z: h.z }); emit({ type: 'potion' });
  if (h.flags.lanternkeeper) for (const b of s.bots) if (b.alive && b.party) { b.hp = Math.min(b.maxHp, b.hp + b.maxHp * tune.potionHeal * 0.6); FX.push({ type: 'heal', x: b.x, z: b.z }); }
}

function hurtHero(dmg) {
  const s = state, h = s.hero;
  if (h.dead) return false;
  if (h.act && h.act.type === 'roll' && h.act.t < tune.dodgeIframes) { emit({ type: 'dodged' }); return false; }
  const d = Math.max(1, Math.round(dmg * (1 - h.red)));
  h.hp -= d; h.hurtT = 0.15; h.combatT = 0;
  sfx.hurt(); setShake(Math.max(SHAKE, Math.min(0.6, d / 40)));
  NUMS.push({ x: h.x, z: h.z, y: 2.3, v: d, crit: false, agg: 0, t0: s.t, hurt: true });
  emit({ type: 'hurt', d });
  if (h.hp <= 0) heroDie();
  return true;
}
function heroDie() {
  const s = state, h = s.hero;
  h.dead = true; h.deathT = 0; h.hp = 0; h.act = null; h.target = null; h.healLeft = 0; s.deaths++;
  if (inHollow(h.x, h.z) && (h.haul.gold || h.haul.items.length)) {
    spawnDrop('cache', h.x, h.z, { cache: { gold: h.haul.gold, items: h.haul.items.slice() }, name: 'your haul' });
    h.haul = { gold: 0, items: [] };
    chat('', 'You dropped your haul where you fell. Win it back, or lose it.', 'warn');
  }
  chat('', 'You fall.', 'death'); sfx.toll(); emit({ type: 'death' });
}

// ---- Things to click: loot, caches, the board, waystones, players ------------------------------
function travel(x, z) {
  const s = state, h = s.hero;
  h.x = h.px = x; h.z = h.pz = z; h.act = null; h.target = null;
  for (const b of s.bots) if (b.alive && b.party) placeNear(b, x, z);
  s.trail = []; FX.push({ type: 'ring', x, z, r: 2, color: 0x8fd0ff }); sfx.heal(); emit({ type: 'travel' });
}

export { SKILLS, makeHero, recalcHero, drinkPotion, hurtHero, travel };
