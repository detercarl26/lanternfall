// The Warden boss fight: his attacks and wolf summons, the sealed door, his fall, and the floor's
// end (endFloor, backToTown).

import { tune } from '../config.js';
import { rng, pick, dist, angTo, turnToward } from '../math.js';
import { emit, FX, SHAKE, setShake, state } from './state.js';
import { sfx } from '../audio/sfx.js';
import { SPAWN, HALL } from './world/floor1.js';
import { ENEMY_NAME, makeEnemy } from './enemies/spawn.js';
import { travel } from './hero/hero.js';
import { chat, announce } from './chat.js';
import { setDoorClosed, circleFree, moveEnt, moveDir, placeNear } from './world/grid.js';
import { resolveAlly, allies, hurtAlly, knockAlly, alliesInShape } from './enemies/targets.js';
import { saveGame } from './save.js';

function updateBoss(e, dt) {
  const s = state;
  if (!s.bossFight || e.dead) return;
  e.hurtT = Math.max(0, e.hurtT - dt);
  e.summonT -= dt;
  if (e.summonT <= 0) { e.summonT = tune.bossSummonEvery; summonWolves(); }
  if (e.stun > 0) { e.stun -= dt; return; }
  if (e.act) { stepBossAct(e, dt); return; }
  e.gap -= dt; e.retarget -= dt;
  if (e.retarget <= 0 || !resolveAlly(e.target)) { e.retarget = 3.5; e.target = bossTarget(); }
  const t = resolveAlly(e.target) || (s.hero.dead ? null : s.hero);
  if (!t) return;
  const d = dist(e, t);
  if (e.gap > 0) {
    if (d > 4.5) moveDir(e, angTo(e, t), tune.bossSpeed, dt); else e.face = turnToward(e.face, angTo(e, t), 3 * dt);
    return;
  }
  e.gap = tune.bossGap;
  const tl = tune.bossTelegraph, a = angTo(e, t);
  if (d < 7) {
    e.act = { type: 'sweep', t: 0, dur: tl + 0.55, hitAt: tl, face: a, done: false };
    e.tele = { shape: 'cone', x: e.x, z: e.z, face: a, radius: 7, arc: 2.8, t: 0, dur: tl };
  } else if (rng() < 0.5 || d > 17) {
    e.act = { type: 'slam', t: 0, dur: tl * 1.2 + 0.6, hitAt: tl * 1.2, face: a, done: false };
    e.tele = { shape: 'circle', x: t.x, z: t.z, radius: 4.5, t: 0, dur: tl * 1.2 };
  } else {
    e.act = { type: 'bossChargeTele', t: 0, dur: tl * 0.9, face: a };
    e.tele = { shape: 'line', x: e.x, z: e.z, face: a, len: 18, width: 3.4, t: 0, dur: tl * 0.9 };
  }
  e.face = a; sfx.warn();
}
function stepBossAct(e, dt) {
  const a = e.act; a.t += dt; if (e.tele) e.tele.t += dt;
  if (a.type === 'sweep' && !a.done && a.t >= a.hitAt) {
    a.done = true; const T = e.tele; e.tele = null;
    if (T) alliesInShape(T, al => hurtAlly(al, tune.bossSweepDmg));
    setShake(Math.max(SHAKE, 0.4)); sfx.slam();
    FX.push({ type: 'slash', x: e.x, z: e.z, face: a.face, reach: 7, arc: 160, color: 0xff7a3a });
  } else if (a.type === 'slam' && !a.done && a.t >= a.hitAt) {
    a.done = true; const T = e.tele; e.tele = null;
    if (T) { alliesInShape(T, al => { if (hurtAlly(al, tune.bossSlamDmg)) knockAlly(al, angTo(T, al), 2); }); FX.push({ type: 'ring', x: T.x, z: T.z, r: 4.5, color: 0xff6a2a }); }
    setShake(Math.max(SHAKE, 0.7)); sfx.slam();
  } else if (a.type === 'bossChargeTele' && a.t >= a.dur) {
    e.tele = null; e.act = { type: 'bossCharge', t: 0, dur: 2, face: a.face, dist: 0, hit: [] }; sfx.roar();
  } else if (a.type === 'bossCharge') {
    const sp = 20 * dt, ok = moveEnt(e, Math.sin(a.face) * sp, Math.cos(a.face) * sp);
    a.dist += sp; e.moving = 1; e.walkPhase += sp;
    for (const al of allies()) {
      if (a.hit.includes(al.id) || dist(e, al) > e.r + al.r + 0.3) continue;
      a.hit.push(al.id); if (hurtAlly(al, tune.bossChargeDmg)) knockAlly(al, a.face + (rng() < 0.5 ? 1.2 : -1.2), 3);
    }
    if (!ok || a.dist >= 18) { e.act = { type: 'recover', t: 0, dur: 1.1 }; setShake(Math.max(SHAKE, 0.5)); sfx.slam(); }
  }
  if (e.act === a && a.t >= a.dur) e.act = null;
}
function bossTarget() {
  const s = state, c = allies().filter(a => a.x > 200);
  if (!c.length) return null;
  if (!s.hero.dead && rng() < 0.6) return { kind: 'hero' };
  const t = pick(c);
  return t.kind === 'hero' ? { kind: 'hero' } : { kind: 'bot', id: t.id };
}
function summonWolves() {
  const s = state; sfx.roar(); announce('Garvath calls the pack', 'Wolves pour into the hall', '#ff9f6a');
  for (let k = 0; k < tune.bossSummonCount; k++) {
    const a = rng() * Math.PI * 2, x = HALL.x + Math.cos(a) * 11, z = HALL.z + Math.sin(a) * 11, ok = circleFree(x, z, 0.5);
    const w = makeEnemy('wolf', ok ? x : HALL.x, ok ? z : HALL.z + 6, -1, 'hall');
    w.summoned = true; w.state = 'chase'; w.target = { kind: 'hero' }; s.enemies.push(w);
  }
}
function startBossFight() {
  const s = state, b = s.boss; if (!b || b.dead) return;
  s.bossFight = true; setDoorClosed(true); b.state = 'fight';
  b.summonT = tune.bossSummonEvery * 0.7; b.gap = 2.2; b.hp = b.maxHp; b.target = { kind: 'hero' };
  for (const q of s.bots) if (q.alive && q.party && q.x < 203) placeNear(q, 206, 0);
  announce(ENEMY_NAME.warden, 'The door seals behind you. Bring it down.', '#ff9f6a');
  sfx.door(); sfx.roar(); emit({ type: 'bossStart' });
}
function resetBoss() {
  const s = state, b = s.boss;
  s.bossFight = false; setDoorClosed(false);
  if (b && !b.dead) { b.hp = b.maxHp; b.x = b.px = b.home.x; b.z = b.pz = b.home.z; b.act = null; b.tele = null; b.state = 'dormant'; b.face = -Math.PI / 2; b.stun = 0; }
  for (const e of s.enemies) if (e.summoned && !e.dead) { e.dead = true; e.deadT = 2; }
}
function onBossDown() {
  const s = state;
  s.wardenDown = true; s.bossFight = false; setDoorClosed(false); s.stairsOpen = true;
  for (const q of s.enemies) if (q.summoned && !q.dead) { q.dead = true; q.deadT = 0; FX.push({ type: 'death', x: q.x, z: q.z, kind: 'wolf' }); }
  announce('Garvath falls', 'The stairs to Floor 2 are open. Take what he dropped.', '#f2d257');
  chat('', 'Floor 1 boss defeated. The stairs are open.', 'sys');
  for (const b of s.bots) if (b.alive && b.party) { chat(b.name, 'we did it. we actually did it.', 'party'); break; }
  sfx.quest(); emit({ type: 'bossDown' }); saveGame();
}
function endFloor() { const s = state; s.ended = true; s.flags.resultsShown = true; s.gained = 'Floor 1 cleared'; emit({ type: 'win' }); saveGame(); }
function backToTown() { state.ended = false; travel(SPAWN.x, SPAWN.z); }

export { updateBoss, startBossFight, resetBoss, onBossDown, endFloor, backToTown };
