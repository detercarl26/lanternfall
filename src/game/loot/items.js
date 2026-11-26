// Every item: the tables (kinds, rarities, bases, affixes, names, uniques), how one is rolled
// (rollKind, makeItem, rollRarity) and how many bag cells it takes (itemSize).

import { tune } from '../../config.js';
import { rng, rrange, pick } from '../../math.js';
import { nid } from '../state.js';

const RARITY = ['Common', 'Magic', 'Rare', 'Unique'];
const RCOL = ['#d9d4c8', '#86a2ff', '#f2d257', '#ff9442'];
const RHEX = [0xd9d4c8, 0x6f8fff, 0xf2c94c, 0xff8a33];

// Each kind of item: the name a tooltip calls it, how often it drops, and its bag size in cells
const KINDS = {
  sword: { name: 'Sword', weight: 0.28, w: 1, h: 3 },
  armor: { name: 'Body armour', weight: 0.2, w: 2, h: 3 },
  helm: { name: 'Helm', weight: 0.12, w: 2, h: 2 },
  gloves: { name: 'Gloves', weight: 0.1, w: 2, h: 2 },
  boots: { name: 'Boots', weight: 0.1, w: 2, h: 2 },
  belt: { name: 'Belt', weight: 0.08, w: 2, h: 1 },
  ring: { name: 'Ring', weight: 0.08, w: 1, h: 1 },
  amulet: { name: 'Amulet', weight: 0.04, w: 1, h: 1 },
};
const SWORD_BASES = [
  { name: 'Shortsword', min: 5, max: 8, speed: 1.1, len: 0.85, w: 1, h: 3 },
  { name: 'Sabre', min: 6, max: 10, speed: 1.05, len: 0.95, w: 1, h: 3 },
  { name: 'Longsword', min: 7, max: 12, speed: 1.0, len: 1.05, w: 1, h: 4 },
  { name: 'Bastard Sword', min: 9, max: 15, speed: 0.92, len: 1.15, w: 1, h: 4 },
  { name: 'Greatblade', min: 11, max: 19, speed: 0.85, len: 1.3, w: 2, h: 4 },
];
// Gear you wear: max HP and a share of damage taken off. The body piece gives the most.
const WEAR_BASES = {
  armor: [{ name: 'Coat', hp: 10, red: 0.02 }, { name: 'Brigandine', hp: 18, red: 0.04 }, { name: 'Mail Hauberk', hp: 26, red: 0.06 }, { name: 'Plate Cuirass', hp: 34, red: 0.08 }],
  helm: [{ name: 'Hood', hp: 5, red: 0.005 }, { name: 'Iron Cap', hp: 8, red: 0.01 }, { name: 'Kettle Helm', hp: 11, red: 0.015 }, { name: 'Great Helm', hp: 14, red: 0.02 }],
  gloves: [{ name: 'Wraps', hp: 3, red: 0 }, { name: 'Leather Gloves', hp: 5, red: 0.005 }, { name: 'Gauntlets', hp: 8, red: 0.01 }],
  boots: [{ name: 'Shoes', hp: 3, red: 0 }, { name: 'Leather Boots', hp: 6, red: 0.005 }, { name: 'Greaves', hp: 9, red: 0.01 }],
  belt: [{ name: 'Rope Sash', hp: 4, red: 0 }, { name: 'Leather Belt', hp: 7, red: 0 }, { name: 'Heavy Belt', hp: 10, red: 0.005 }],
};
const WEAR_RED_PER_ILVL = { armor: 0.004, helm: 0.002, gloves: 0.001, boots: 0.001, belt: 0 };
// Jewellery: no base stats, one fixed bonus (its implicit) that grows with the item's level
const JEWEL_BASES = {
  ring: [{ name: 'Iron Ring', key: 'hpFlat' }, { name: 'Amber Ring', key: 'crit' }, { name: 'Bone Ring', key: 'lifeHit' }],
  amulet: [{ name: 'Lantern Charm', key: 'skillDmg' }, { name: 'Wolf-tooth Necklace', key: 'atkSpeed' }, { name: 'Ash Locket', key: 'regen' }],
};
const PREFIX = ['Keen', 'Heavy', 'Swift', 'Vicious', 'Tempered', 'Grim', 'Bright', 'Hollow'];
const SUFFIX = ['of the Fox', 'of Embers', 'of the Watch', 'of Dusk', 'of the Stair', 'of Mending', 'of Thorns', 'of the Gate'];
const RARE_A = ['Grim', 'Dusk', 'Ash', 'Hollow', 'Iron', 'Pale', 'Ember', 'Thorn', 'Gloam', 'Lantern'];
const RARE_B = {
  sword: ['Fang', 'Oath', 'Bite', 'Edge', 'Song', 'Sorrow'], armor: ['Shroud', 'Ward', 'Mantle', 'Vow', 'Shell'],
  helm: ['Crown', 'Visor', 'Brow', 'Cowl', 'Gaze'], gloves: ['Grip', 'Grasp', 'Knuckle', 'Clutch', 'Touch'],
  boots: ['Stride', 'Tread', 'Path', 'March', 'Step'], belt: ['Cinch', 'Coil', 'Girdle', 'Clasp', 'Knot'],
  ring: ['Loop', 'Band', 'Circle', 'Eye', 'Promise'], amulet: ['Charm', 'Heart', 'Star', 'Talisman', 'Ember'],
};
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
const AFFIXES = {
  sword: ['skillDmg', 'crit', 'lifeHit', 'atkSpeed'], armor: ['hpFlat', 'regen', 'move', 'potion'], helm: ['hpFlat', 'regen', 'skillDmg'],
  gloves: ['atkSpeed', 'crit', 'lifeHit', 'hpFlat'], boots: ['move', 'hpFlat', 'regen'], belt: ['potion', 'hpFlat', 'regen'],
  ring: Object.keys(AFFIX_TEXT), amulet: Object.keys(AFFIX_TEXT),
};
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
// Which kind of item drops, by the weights in KINDS
function rollKind() {
  let r = rng() * Object.values(KINDS).reduce((a, k) => a + k.weight, 0);
  for (const [kind, k] of Object.entries(KINDS)) { r -= k.weight; if (r < 0) return kind; }
  return 'sword';
}

// ---- Items ----------------------------------------------------------------------------------------
// Bases unlock as the item level climbs: the first one or two at level 1, the heaviest by level 6 or so
const baseFor = (list, ilvl, start) => list[Math.min(list.length - 1, Math.floor(rng() * Math.min(list.length, start + Math.floor(ilvl / 2))))];
function makeItem(slot, ilvl, rarity) {
  if (rarity >= 3) { const opts = UNIQUES.filter(u => u.slot === slot); if (opts.length) return uniqueItem(pick(opts), ilvl); rarity = 2; }
  const q = [1, 1.15, 1.3][rarity], sc = 1 + 0.14 * (ilvl - 1), it = { id: nid(), slot, rarity, ilvl, affixes: {} };
  if (slot === 'sword') {
    const b = baseFor(SWORD_BASES, ilvl, 2);
    it.base = b.name; it.min = Math.round(b.min * sc * q); it.max = Math.round(b.max * sc * q); it.speed = b.speed; it.len = b.len;
  } else if (WEAR_BASES[slot]) {
    const b = baseFor(WEAR_BASES[slot], ilvl, 1);
    it.base = b.name; it.hp = Math.round(b.hp * sc * q); it.red = Math.round((b.red + WEAR_RED_PER_ILVL[slot] * ilvl) * 1000) / 1000;
  } else {
    const b = pick(JEWEL_BASES[slot]);
    it.base = b.name; it.implicit = { [b.key]: implicitValue(b.key, ilvl) };
  }
  const keys = AFFIXES[slot].slice(), n = rarity === 0 ? 0 : rarity === 1 ? 1 : 2 + (rng() < 0.4 ? 1 : 0);
  for (let k = 0; k < n && keys.length; k++) { const key = keys.splice(Math.floor(rng() * keys.length), 1)[0]; it.affixes[key] = affixValue(key, ilvl); }
  if (rarity === 0) it.name = it.base;
  else if (rarity === 1) it.name = rng() < 0.5 ? `${pick(PREFIX)} ${it.base}` : `${it.base} ${pick(SUFFIX)}`;
  else it.name = `${pick(RARE_A)} ${pick(RARE_B[slot])}`;
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
// A ring's or amulet's own bonus: about half a rolled affix, never rounded away to nothing
function implicitValue(k, ilvl) {
  const v = affixValue(k, ilvl) * 0.6;
  if (k === 'lifeHit' || k === 'hpFlat') return Math.max(1, Math.round(v));
  if (k === 'regen') return Math.max(0.1, Math.round(v * 10) / 10);
  return Math.max(0.01, Math.round(v * 100) / 100);
}
function uniqueItem(u, ilvl) {
  const it = { id: nid(), slot: u.slot, rarity: 3, ilvl, base: u.base, name: u.name, affixes: { ...u.affixes }, special: u.special, flag: u.flag };
  if (u.slot === 'sword') { it.min = u.min; it.max = u.max; it.speed = u.speed; it.len = u.len || 1; } else { it.hp = u.hp; it.red = u.red; }
  return it;
}
// How many bag cells an item covers, wide by tall: a sword by its base, everything else by its kind
function itemSize(it) {
  if (it.slot === 'sword') { const b = SWORD_BASES.find(q => q.name === it.base); return b ? { w: b.w, h: b.h } : { w: 1, h: 3 }; }
  const k = KINDS[it.slot] || KINDS.sword; return { w: k.w, h: k.h };
}

export { RARITY, RCOL, RHEX, KINDS, AFFIX_TEXT, BOSS_UNIQUE, rollRarity, rollKind, makeItem, uniqueItem, itemSize };
