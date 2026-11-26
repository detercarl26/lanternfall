// Making enemies and placing packs: PACKS (who stands where), spawnPack, makeEnemy, and the enemy
// kinds' names.

import { tune } from '../../config.js';
import { rng, angTo } from '../../math.js';
import { nid, state } from '../state.js';
import { circleFree } from '../world/grid.js';

const PACKS = [
  { id: 'f1', area: 'field', x: 34, z: -3, kinds: ['wolf', 'wolf', 'wolf'], first: true },
  { id: 'r1', area: 'field', x: 52, z: 12, kinds: ['wolf', 'wolf', 'wolf', 'spitter'], rescue: 'Mira' },
  { id: 'f2', area: 'field', x: 72, z: -16, kinds: ['brute', 'wolf', 'wolf', 'wolf', 'wolf'] },
  { id: 'f3', area: 'field', x: 86, z: 24, kinds: ['spitter', 'spitter', 'wolf', 'wolf'] },
  { id: 'r2', area: 'field', x: 98, z: -34, kinds: ['brute', 'wolf', 'wolf'], rescue: 'Sable' },
  { id: 'f4', area: 'field', x: 106, z: -2, kinds: ['brute', 'spitter', 'spitter'] },
  { id: 'f5', area: 'field', x: 58, z: 40, kinds: ['wolf', 'wolf', 'wolf', 'wolf'] },
  { id: 'f6', area: 'field', x: 40, z: -40, kinds: ['spitter', 'wolf', 'wolf', 'wolf'] },
  { id: 'l1', area: 'labyrinth', x: 134, z: -16, kinds: ['wolf', 'wolf', 'wolf', 'spitter'] },
  { id: 'l2', area: 'labyrinth', x: 142, z: -32, kinds: ['brute', 'wolf', 'wolf'] },
  { id: 'r3', area: 'labyrinth', x: 156, z: -34, kinds: ['brute', 'spitter', 'spitter'], rescue: 'Doran' },
  { id: 'l3', area: 'labyrinth', x: 186, z: -30, kinds: ['spitter', 'spitter', 'wolf', 'wolf', 'brute'] },
  { id: 'l4', area: 'labyrinth', x: 178, z: 0, kinds: ['brute', 'brute', 'wolf', 'wolf', 'wolf'] },
];

const ENEMY_NAME = { wolf: 'Gloam Wolf', spitter: 'Bog Spitter', brute: 'Bramble Brute', warden: 'Garvath, Warden of the First Stair' };

// ---- A new world ------------------------------------------------------------------------------
const EK = { wolf: 0.45, spitter: 0.6, brute: 0.95, rogue: 0.45, warden: 1.7 };
function makeEnemy(kind, x, z, pack, area) {
  const lab = area === 'labyrinth' || area === 'hall';
  const base = { wolf: tune.wolfHp, spitter: tune.spitterHp, brute: tune.bruteHp, rogue: tune.rogueHp, warden: tune.bossHp }[kind];
  const hp = Math.round(base * (lab && kind !== 'warden' ? tune.labHpMult : 1));
  return { id: nid(), kind, x, z, px: x, pz: z, r: EK[kind], face: rng() * 6.28, home: { x, z }, hp, maxHp: hp, pack, lab,
    state: 'idle', target: null, retarget: 0, cd: 0.5 + rng(), chargeCd: 1 + rng() * 2, act: null, tele: null, stun: 0,
    hurtT: 0, walkPhase: rng() * 6, moving: 0, strafe: rng() < 0.5 ? 1 : -1, dead: false, deadT: 0, name: null,
    cache: null, summoned: false, gap: 0, summonT: 0 };
}
function spawnPack(i, initial) {
  const def = PACKS[i], s = state, n = def.kinds.length;
  const rb = initial && def.rescue ? s.bots.find(b => b.name === def.rescue) : null;
  def.kinds.forEach((k, j) => {
    const a = (j / n) * Math.PI * 2 + 0.4, rad = rb ? 3.4 : (j === 0 && n > 2 ? 0.4 : 2.4);
    let x = def.x + Math.cos(a) * rad, z = def.z + Math.sin(a) * rad;
    if (!circleFree(x, z, EK[k])) { x = def.x + (j % 2 ? 1 : -1) * 0.6; z = def.z; }
    const e = makeEnemy(k, x, z, i, def.area);
    if (rb) { e.state = 'standoff'; e.face = angTo(e, rb); }
    s.enemies.push(e);
  });
}
function packIndex(id) { return PACKS.findIndex(p => p.id === id); }

export { PACKS, ENEMY_NAME, makeEnemy, spawnPack, packIndex };
