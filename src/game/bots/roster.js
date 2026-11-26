// Who the bot players are (BOT_ROSTER, CLASS_NAME), making one, their HP by level, and who is in
// your raid party.

import { tune } from '../../config.js';
import { rng } from '../../math.js';
import { nid, state } from '../state.js';

const BOT_ROSTER = [
  { name: 'Hale', cls: 'vanguard', mode: 'town', x: -66, z: 12 },     // Ashgate: the plaza, the Hall's forecourt, the avenue and the market
  { name: 'Orrin', cls: 'mender', mode: 'town', x: -80, z: -10 },
  { name: 'Tamsin', cls: 'ranger', mode: 'town', x: -30, z: 1 },
  { name: 'Pell', cls: 'vanguard', mode: 'town', x: -84, z: -27.5 },    // in the Hall's forecourt, not under its roof, where his name would float over it
  { name: 'Juno', cls: 'mender', mode: 'town', x: 2, z: 0 },
  { name: 'Bram', cls: 'vanguard', mode: 'lfg', x: -64, z: -4 },
  { name: 'Kestrel', cls: 'ranger', mode: 'lfg', x: -82, z: 10 },
  { name: 'Lio', cls: 'mender', mode: 'lfg', x: -76, z: 14 },
  { name: 'Mira', cls: 'ranger', mode: 'rescue', x: 52, z: 12, pack: 'r1' },
  { name: 'Sable', cls: 'mender', mode: 'rescue', x: 98, z: -34, pack: 'r2' },
  { name: 'Doran', cls: 'vanguard', mode: 'rescue', x: 156, z: -34, pack: 'r3' },
  { name: 'Ivo', cls: 'vanguard', mode: 'field', x: 36, z: 28 },
  { name: 'Wren', cls: 'ranger', mode: 'field', x: 42, z: -26 },
];
const CLASS_NAME = { vanguard: 'Vanguard', ranger: 'Ranger', mender: 'Mender' };

// ---- A new world ------------------------------------------------------------------------------
function makeBot(d, lantern) {
  const b = { id: nid(), kind: 'bot', name: d.name, cls: d.cls, mode: d.mode, x: d.x, z: d.z, px: d.x, pz: d.z, r: 0.45,
    face: rng() * 6.28, home: { x: d.x, z: d.z }, alive: true, party: false, rescued: false, lantern, packId: d.pack || null,
    hp: 1, maxHp: 1, atkT: rng(), healT: rng() * 2, act: null, goal: null, wanderT: rng() * 3, trouble: false,
    combatT: 99, moving: 0, walkPhase: rng() * 6, hurtT: 0, slot: -1, lostT: 0, deadT: 0, walkT: 0, townSpot: null };
  botStats(b, true); return b;
}
function botStats(b, fill) {
  const L = state.hero ? state.hero.level : 1, ratio = b.maxHp > 1 ? b.hp / b.maxHp : 1;
  b.maxHp = Math.round((tune.botHp + tune.botHpPerLevel * (L - 1)) * (b.cls === 'vanguard' ? tune.vanguardHpMult : 1));
  b.hp = fill ? b.maxHp : Math.max(1, Math.round(b.maxHp * ratio));
}

// ---- Bot players -----------------------------------------------------------------------------------
function partyCount() { return state.bots.filter(b => b.alive && b.party).length; }

function combatBot(b) { return b.mode === 'party' || b.mode === 'field' || (b.mode === 'rescue' && b.trouble); }

export { BOT_ROSTER, CLASS_NAME, makeBot, botStats, partyCount, combatBot };
