// Every item: the tables (rarities, bases, affixes, names, uniques) and how one is rolled
// (makeItem, rollRarity).

import { tune } from '../../config.js';
import { rng, rrange, pick } from '../../math.js';
import { nid } from '../state.js';

const RARITY = ['Common', 'Magic', 'Rare', 'Unique'];
const RCOL = ['#d9d4c8', '#86a2ff', '#f2d257', '#ff9442'];
const RHEX = [0xd9d4c8, 0x6f8fff, 0xf2c94c, 0xff8a33];
const SWORD_BASES = [
  { name: 'Shortsword', min: 5, max: 8, speed: 1.1, len: 0.85 },
  { name: 'Sabre', min: 6, max: 10, speed: 1.05, len: 0.95 },
  { name: 'Longsword', min: 7, max: 12, speed: 1.0, len: 1.05 },
  { name: 'Bastard Sword', min: 9, max: 15, speed: 0.92, len: 1.15 },
  { name: 'Greatblade', min: 11, max: 19, speed: 0.85, len: 1.3 },
];
const ARMOR_BASES = [
  { name: 'Coat', hp: 10, red: 0.02 },
  { name: 'Brigandine', hp: 18, red: 0.04 },
  { name: 'Mail Hauberk', hp: 26, red: 0.06 },
  { name: 'Plate Cuirass', hp: 34, red: 0.08 },
];
const PREFIX = ['Keen', 'Heavy', 'Swift', 'Vicious', 'Tempered', 'Grim', 'Bright', 'Hollow'];
const SUFFIX = ['of the Fox', 'of Embers', 'of the Watch', 'of Dusk', 'of the Stair', 'of Mending', 'of Thorns', 'of the Gate'];
const RARE_A = ['Grim', 'Dusk', 'Ash', 'Hollow', 'Iron', 'Pale', 'Ember', 'Thorn', 'Gloam', 'Lantern'];
const RARE_B = ['Fang', 'Oath', 'Bite', 'Vow', 'Edge', 'Shroud', 'Ward', 'Mantle', 'Song', 'Sorrow'];
const AFFIX_TEXT = {
  skillDmg: v => `+${Math.round(v * 100)}% sword-skill damage`,
  crit: v => `+${Math.round(v * 100)}% critical chance`,
  lifeHit: v => `+${v} HP each time you hit`,
  atkSpeed: v => `+${Math.round(v * 100)}% swing speed`,
  hpFlat: v => `+${v} max HP`,
  regen: v => `+${v} HP per second out of combat`,
  move: v => `+${Math.round(v * 100)}% run speed`,
  potion: v => `+${Math.round(v * 100)}% potion healing`,
};
const SWORD_AFFIX = ['skillDmg', 'crit', 'lifeHit', 'atkSpeed'];
const ARMOR_AFFIX = ['hpFlat', 'regen', 'move', 'potion'];
const UNIQUES = [
  { slot: 'sword', name: 'Emberwake', base: 'Sabre', min: 12, max: 19, speed: 1.1, len: 0.95, affixes: { skillDmg: 0.25 }, special: 'Each kill takes 1 second off every sword-skill cooldown', flag: 'emberwake' },
  { slot: 'armor', name: "Lanternkeeper's Coat", base: 'Coat', hp: 55, red: 0.08, affixes: { potion: 0.25 }, special: 'Your potions also heal your raid party', flag: 'lanternkeeper' },
];
const BOSS_UNIQUE = { slot: 'sword', name: "Warden's Grief", base: 'Greatblade', min: 26, max: 40, speed: 0.9, len: 1.35, affixes: { skillDmg: 0.3, lifeHit: 3 }, special: "Taken from the first floor's keeper", flag: '' };

// ---- Shots, drops, crowds, packs, rogues ----------------------------------------------------------
function rollRarity() {
  const r = rng(), u = tune.rarityUnique, ra = u + tune.rarityRare, m = ra + tune.rarityMagic;
  return r < u ? 3 : r < ra ? 2 : r < m ? 1 : 0;
}

// ---- Items ----------------------------------------------------------------------------------------
function makeItem(slot, ilvl, rarity) {
  if (rarity >= 3) { const opts = UNIQUES.filter(u => u.slot === slot); if (opts.length) return uniqueItem(pick(opts), ilvl); rarity = 2; }
  const q = [1, 1.15, 1.3][rarity], sc = 1 + 0.14 * (ilvl - 1), it = { id: nid(), slot, rarity, ilvl, affixes: {} };
  if (slot === 'sword') {
    const b = SWORD_BASES[Math.min(SWORD_BASES.length - 1, Math.floor(rng() * Math.min(SWORD_BASES.length, 2 + Math.floor(ilvl / 2))))];
    it.base = b.name; it.min = Math.round(b.min * sc * q); it.max = Math.round(b.max * sc * q); it.speed = b.speed; it.len = b.len;
  } else {
    const b = ARMOR_BASES[Math.min(ARMOR_BASES.length - 1, Math.floor(rng() * Math.min(ARMOR_BASES.length, 1 + Math.floor(ilvl / 2))))];
    it.base = b.name; it.hp = Math.round(b.hp * sc * q); it.red = Math.round((b.red + 0.004 * ilvl) * 1000) / 1000;
  }
  const keys = (slot === 'sword' ? SWORD_AFFIX : ARMOR_AFFIX).slice(), n = rarity === 0 ? 0 : rarity === 1 ? 1 : 2 + (rng() < 0.4 ? 1 : 0);
  for (let k = 0; k < n && keys.length; k++) { const key = keys.splice(Math.floor(rng() * keys.length), 1)[0]; it.affixes[key] = affixValue(key, ilvl); }
  if (rarity === 0) it.name = it.base;
  else if (rarity === 1) it.name = rng() < 0.5 ? `${pick(PREFIX)} ${it.base}` : `${it.base} ${pick(SUFFIX)}`;
  else it.name = `${pick(RARE_A)} ${pick(RARE_B)}`;
  return it;
}
function affixValue(k, ilvl) {
  const f = 1 + 0.1 * ilvl, r2 = v => Math.round(v * 100) / 100;
  switch (k) {
    case 'skillDmg': return r2(rrange(0.08, 0.18) * f);
    case 'crit': return r2(rrange(0.02, 0.05) * f);
    case 'lifeHit': return Math.max(1, Math.round(rrange(1, 2.5) * f));
    case 'atkSpeed': return r2(rrange(0.05, 0.1) * f);
    case 'hpFlat': return Math.round(rrange(8, 18) * f);
    case 'regen': return Math.round(rrange(0.6, 1.6) * f * 10) / 10;
    case 'move': return r2(rrange(0.03, 0.06) * f);
    case 'potion': return r2(rrange(0.1, 0.2) * f);
    default: return 0;
  }
}
function uniqueItem(u, ilvl) {
  const it = { id: nid(), slot: u.slot, rarity: 3, ilvl, base: u.base, name: u.name, affixes: { ...u.affixes }, special: u.special, flag: u.flag };
  if (u.slot === 'sword') { it.min = u.min; it.max = u.max; it.speed = u.speed; it.len = u.len || 1; } else { it.hp = u.hp; it.red = u.red; }
  return it;
}

export { RARITY, RCOL, RHEX, AFFIX_TEXT, BOSS_UNIQUE, rollRarity, makeItem, uniqueItem };
