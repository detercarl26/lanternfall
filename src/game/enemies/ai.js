// What wolves, spitters, brutes and rogues do each step: wake, pick a target, chase, attack behind
// red warning marks, and give up and go home.

import { tune } from '../../config.js';
import { rng, rrange, dist, angTo, turnToward } from '../../math.js';
import { SHAKE, setShake, nid, state } from '../state.js';
import { sfx } from '../../audio/sfx.js';
import { moveEnt, los, inHollow, moveDir } from '../world/grid.js';
import { resolveAlly, allies, hurtAlly, knockAlly, strikeCone } from './targets.js';
import { updateBoss } from '../warden.js';

function pickTarget(e) {
  const R = e.kind === 'rogue' ? 14 : tune.aggroRadius, cur = resolveAlly(e.target);
  let best = null, bs = 1e9;
  for (const a of allies()) {
    if (e.kind === 'rogue' && !inHollow(a.x, a.z)) continue;
    const d = dist(e, a), lim = (cur === a ? 1.8 : 1) * (e.state === 'chase' ? R * 1.5 : R);
    if (d > lim) continue;
    if (e.lab && d > 3 && !los(e.x, e.z, a.x, a.z)) continue;
    const sc = d - (a.cls === 'vanguard' ? 3 : 0) - (cur === a ? 2 : 0);
    if (sc < bs) { bs = sc; best = a; }
  }
  return best ? (best.kind === 'hero' ? { kind: 'hero' } : { kind: 'bot', id: best.id }) : null;
}
function wakePack(e) {
  if (e.pack < 0) return;
  for (const o of state.enemies) if (o.pack === e.pack && !o.dead && (o.state === 'idle' || o.state === 'standoff')) { o.state = 'chase'; o.target = e.target; o.retarget = 1; }
}
function speedOf(e) { return { wolf: tune.wolfSpeed, spitter: 3.6, brute: tune.bruteSpeed, rogue: tune.rogueSpeed, warden: tune.bossSpeed }[e.kind]; }
function updateEnemies(dt) {
  const s = state, h = s.hero;
  for (let i = s.enemies.length - 1; i >= 0; i--) {
    const e = s.enemies[i];
    e.px = e.x; e.pz = e.z; e.moving = 0;
    if (e.dead) { e.deadT += dt; if (e.deadT > 1.6) s.enemies.splice(i, 1); continue; }
    if (e.kind === 'warden') { updateBoss(e, dt); continue; }
    const onBot = e.target && e.target.kind === 'bot';
    if (dist(e, h) > 60 && !onBot && e.state !== 'chase') continue; // asleep, far from anyone
    e.hurtT = Math.max(0, e.hurtT - dt); e.cd -= dt; e.chargeCd -= dt;
    if (e.stun > 0) { e.stun -= dt; e.act = null; e.tele = null; continue; }
    if (e.act) { stepEnemyAct(e, dt); continue; }
    if (e.state === 'standoff') continue;
    if (e.state === 'return') {
      if (dist(e, e.home) < 1) { e.state = 'idle'; e.hp = e.maxHp; }
      else { moveDir(e, angTo(e, e.home), speedOf(e) * 1.1, dt); e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.3 * dt); }
      continue;
    }
    e.retarget -= dt;
    if (e.retarget <= 0) { e.retarget = 0.5; e.target = pickTarget(e); if (e.target && e.state === 'idle') { e.state = 'chase'; wakePack(e); } }
    const t = resolveAlly(e.target);
    if (!t) { if (e.state === 'chase') e.state = 'return'; continue; }
    if (dist(e, e.home) > tune.leash || (e.kind === 'rogue' && !inHollow(e.x, e.z))) { e.state = 'return'; e.target = null; continue; }
    if (e.kind === 'wolf') aiWolf(e, t, dt);
    else if (e.kind === 'spitter') aiSpitter(e, t, dt);
    else if (e.kind === 'brute') aiBrute(e, t, dt);
    else aiRogue(e, t, dt);
  }
}
function aiWolf(e, t, dt) {
  const d = dist(e, t), reach = 1.25 + t.r;
  if (d > reach) moveDir(e, angTo(e, t) + e.strafe * 0.5 * Math.min(1, (d - reach) / 4), tune.wolfSpeed, dt);
  else {
    e.face = turnToward(e.face, angTo(e, t), 12 * dt);
    if (e.cd <= 0) { e.cd = tune.wolfAttack * rrange(0.85, 1.15); e.act = { type: 'bite', t: 0, dur: 0.55, hitAt: 0.24, face: angTo(e, t), done: false }; }
  }
}
function aiSpitter(e, t, dt) {
  const d = dist(e, t), see = los(e.x, e.z, t.x, t.z);
  if (d < 5) moveDir(e, angTo(t, e), 3.4, dt);
  else if (d > tune.spitterRange || !see) moveDir(e, angTo(e, t), 3.6, dt);
  else {
    e.face = turnToward(e.face, angTo(e, t), 8 * dt);
    if (e.cd <= 0) { e.cd = tune.spitterAttack * rrange(0.85, 1.2); e.act = { type: 'spit', t: 0, dur: 0.95, hitAt: 0.58, face: angTo(e, t), done: false, tx: t.x, tz: t.z, tgt: e.target }; }
  }
}
function aiBrute(e, t, dt) {
  const d = dist(e, t);
  if (e.chargeCd <= 0 && d > 4.5 && d < tune.bruteChargeLen - 1 && los(e.x, e.z, t.x, t.z)) {
    const a = angTo(e, t); e.face = a; e.chargeCd = tune.bruteChargeCd;
    e.act = { type: 'chargeTele', t: 0, dur: tune.bruteTelegraph, face: a };
    e.tele = { shape: 'line', x: e.x, z: e.z, face: a, len: tune.bruteChargeLen, width: 2.4, t: 0, dur: tune.bruteTelegraph };
    sfx.warn(); return;
  }
  if (d > 2.0 + t.r) moveDir(e, angTo(e, t), tune.bruteSpeed, dt);
  else {
    e.face = turnToward(e.face, angTo(e, t), 6 * dt);
    if (e.cd <= 0) {
      e.cd = 1.7; const a = angTo(e, t);
      e.act = { type: 'swipe', t: 0, dur: 0.95, hitAt: 0.5, face: a, done: false };
      e.tele = { shape: 'cone', x: e.x, z: e.z, face: a, radius: 3.1, arc: 2.1, t: 0, dur: 0.5 };
    }
  }
}
function aiRogue(e, t, dt) {
  const d = dist(e, t);
  if (e.chargeCd <= 0 && d > 3.5 && d < 9 && los(e.x, e.z, t.x, t.z)) {
    const a = angTo(e, t); e.face = a; e.chargeCd = 4.5 + rng() * 2;
    e.act = { type: 'lungeTele', t: 0, dur: 0.5, face: a };
    e.tele = { shape: 'line', x: e.x, z: e.z, face: a, len: 9, width: 1.6, t: 0, dur: 0.5 };
    sfx.warn(); return;
  }
  if (d > 1.5 + t.r) moveDir(e, angTo(e, t) + e.strafe * 0.6 * Math.min(1, d / 6), tune.rogueSpeed, dt);
  else {
    e.face = turnToward(e.face, angTo(e, t), 12 * dt);
    if (e.cd <= 0) { e.cd = 0.85; e.act = { type: 'stab', t: 0, dur: 0.5, hitAt: 0.22, face: angTo(e, t), done: false }; }
  }
}
function stepEnemyAct(e, dt) {
  const s = state, a = e.act; a.t += dt; if (e.tele) e.tele.t += dt;
  const dm = e.lab ? tune.labDmgMult : 1;
  switch (a.type) {
    case 'bite':
      if (a.t < a.hitAt) moveEnt(e, Math.sin(a.face) * 3 * dt, Math.cos(a.face) * 3 * dt);
      if (!a.done && a.t >= a.hitAt) { a.done = true; strikeCone(e, a.face, 1.7, 1.4, tune.wolfDmg * dm); }
      break;
    case 'spit':
      if (!a.done && a.t >= a.hitAt) {
        a.done = true;
        const tg = resolveAlly(a.tgt), tx = tg ? tg.x : a.tx, tz = tg ? tg.z : a.tz;
        const ang = Math.atan2(tx - e.x, tz - e.z), dd = Math.max(1, Math.hypot(tx - e.x, tz - e.z)), sp = tune.spitterShot;
        const life = Math.min(tune.spitterRange + 2, dd + 0.5) / sp;
        s.projectiles.push({ id: nid(), kind: 'glob', team: 'enemy', x: e.x + Math.sin(ang) * 0.7, z: e.z + Math.cos(ang) * 0.7, px: e.x, pz: e.z,
          vx: Math.sin(ang) * sp, vz: Math.cos(ang) * sp, face: ang, life, maxLife: life, r: 0.5, dmg: tune.spitterDmg * dm, hit: [] });
        sfx.spit();
      }
      break;
    case 'swipe':
      if (!a.done && a.t >= a.hitAt) { a.done = true; e.tele = null; strikeCone(e, a.face, 3.1, 2.1, tune.bruteDmg * dm); setShake(Math.max(SHAKE, 0.15)); }
      break;
    case 'chargeTele':
      if (a.t >= a.dur) { e.tele = null; e.act = { type: 'charge', t: 0, dur: 2, face: a.face, dist: 0, hit: [] }; sfx.roar(); }
      break;
    case 'charge': {
      const sp = tune.bruteChargeSpeed * dt, ok = moveEnt(e, Math.sin(a.face) * sp, Math.cos(a.face) * sp);
      a.dist += sp; e.moving = 1; e.walkPhase += sp * 1.2;
      for (const al of allies()) {
        if (a.hit.includes(al.id) || dist(e, al) > e.r + al.r + 0.4) continue;
        a.hit.push(al.id); if (hurtAlly(al, tune.bruteChargeDmg * dm)) knockAlly(al, a.face, 2.5);
      }
      if (!ok || a.dist >= tune.bruteChargeLen) { e.act = { type: 'recover', t: 0, dur: 0.9 }; setShake(Math.max(SHAKE, ok ? 0.1 : 0.3)); }
      break;
    }
    case 'lungeTele':
      if (a.t >= a.dur) { e.tele = null; e.act = { type: 'lunge', t: 0, dur: 2, face: a.face, dist: 0, hit: [] }; }
      break;
    case 'lunge': {
      const sp = 22 * dt, ok = moveEnt(e, Math.sin(a.face) * sp, Math.cos(a.face) * sp);
      a.dist += sp; e.moving = 1;
      for (const al of allies()) { if (a.hit.length) break; if (dist(e, al) < e.r + al.r + 0.3) { a.hit.push(al.id); hurtAlly(al, tune.rogueLungeDmg); } }
      if (!ok || a.dist >= 9 || a.hit.length) e.act = { type: 'recover', t: 0, dur: 0.5 };
      break;
    }
    case 'stab':
      if (!a.done && a.t >= a.hitAt) { a.done = true; strikeCone(e, a.face, 2.0, 1.8, tune.rogueDmg); }
      break;
    default: break;
  }
  if (e.act === a && a.t >= a.dur) e.act = null;
}

export { wakePack, updateEnemies };
