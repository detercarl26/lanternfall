// What bot players do each step: wander in town, fight, heal, call for help, and follow you.

import { tune } from '../../config.js';
import { rng, rrange, dist, angTo, turnToward } from '../../math.js';
import { emit, nid, state } from '../state.js';
import { sfx } from '../../audio/sfx.js';
import { packIndex } from '../enemies/spawn.js';
import { chat, announce } from '../chat.js';
import { circleFree, moveEnt, los, moveDir, placeNear } from '../world/grid.js';
import { hittable } from '../hero/sword.js';
import { damageEnemy } from '../enemies/damage.js';

function updateBots(dt) {
  const s = state, h = s.hero;
  for (const b of s.bots) {
    b.px = b.x; b.pz = b.z;
    if (!b.alive) { b.deadT += dt; continue; }
    b.moving = 0; b.hurtT = Math.max(0, b.hurtT - dt); b.atkT = Math.max(0, b.atkT - dt); b.healT = Math.max(0, b.healT - dt); b.combatT += dt;
    if (b.act) { b.act.t += dt; if (b.act.t >= b.act.dur) b.act = null; }
    if (b.combatT > 5) b.hp = Math.min(b.maxHp, b.hp + tune.botRegen * dt);
    const far = dist(b, h) > 70;
    if (b.mode === 'town' || b.mode === 'lfg') { if (!far) wander(b, dt, 5, 2.0); }
    else if (b.mode === 'field') {
      if (!far && !botFight(b, dt, 9)) { if (dist(b, b.home) > 14) moveDir(b, angTo(b, b.home), 3, dt); else wander(b, dt, 9, 2.4); }
    } else if (b.mode === 'rescue') botRescue(b, dt);
    else if (b.mode === 'party') botParty(b, dt);
    else if (b.mode === 'toTown') {
      b.walkT += dt;
      if (!b.townSpot) b.townSpot = { x: rrange(-14, 10), z: rrange(-6, 12) };
      if (b.walkT > 4 || far) { b.x = b.px = b.townSpot.x; b.z = b.pz = b.townSpot.z; b.home = { ...b.townSpot }; b.mode = 'lfg'; }
      else moveDir(b, angTo(b, b.townSpot), 4.5, dt);
    }
  }
}
function wander(b, dt, radius, speed) {
  if (!b.goal) {
    b.wanderT -= dt;
    if (b.wanderT <= 0) {
      const a = rng() * Math.PI * 2, r = rng() * radius, gx = b.home.x + Math.cos(a) * r, gz = b.home.z + Math.sin(a) * r;
      if (circleFree(gx, gz, b.r)) b.goal = { x: gx, z: gz };
      b.wanderT = rrange(2, 6);
    }
    return;
  }
  const d = dist(b, b.goal); if (d < 0.4) { b.goal = null; return; }
  const ok = moveEnt(b, (b.goal.x - b.x) / d * speed * dt, (b.goal.z - b.z) / d * speed * dt);
  b.face = turnToward(b.face, angTo(b, b.goal), 8 * dt); b.moving = 0.6; b.walkPhase += speed * dt * 1.7;
  if (!ok) b.goal = null;
}
function botFight(b, dt, range) {
  const s = state;
  if (b.cls === 'mender' && menderHeal(b)) return true;
  let best = null, bd = range;
  for (const e of s.enemies) {
    if (!hittable(e) || (e.state === 'standoff' && !b.trouble)) continue;
    const d = dist(b, e) - e.r;
    if (d < bd && (d < 3 || los(b.x, b.z, e.x, e.z))) { bd = d; best = e; }
  }
  if (!best) return false;
  const e = best, d = dist(b, e), L = s.hero.level, dmg = tune.botDmg * (1 + tune.botDmgPerLevel * (L - 1));
  b.combatT = 0;
  if (b.cls === 'vanguard') {
    if (d > 1.5 + e.r) moveDir(b, angTo(b, e), 5.2, dt);
    else {
      b.face = turnToward(b.face, angTo(b, e), 12 * dt);
      if (b.atkT <= 0) { b.atkT = 0.95; b.act = { type: 'swing', t: 0, dur: 0.45 }; damageEnemy(e, dmg, { by: b.id, knock: 0.2, fromX: b.x, fromZ: b.z }); }
    }
  } else {
    const ranger = b.cls === 'ranger', want = ranger ? 7.5 : 6.5;
    if (d < want - 2.5) moveDir(b, angTo(e, b), 4.2, dt);
    else if (d > want + 3) moveDir(b, angTo(b, e), 4.8, dt);
    else {
      b.face = turnToward(b.face, angTo(b, e), 12 * dt);
      if (b.atkT <= 0 && los(b.x, b.z, e.x, e.z)) {
        b.atkT = ranger ? 1.1 : 1.4; b.act = { type: ranger ? 'shoot' : 'cast', t: 0, dur: 0.5 };
        const a = angTo(b, e), sp = ranger ? 22 : 14;
        s.projectiles.push({ id: nid(), kind: ranger ? 'arrow' : 'bolt', team: 'ally', x: b.x + Math.sin(a) * 0.6, z: b.z + Math.cos(a) * 0.6, px: b.x, pz: b.z,
          vx: Math.sin(a) * sp, vz: Math.cos(a) * sp, face: a, life: 14 / sp, maxLife: 14 / sp, r: 0.35, dmg: dmg * (ranger ? 1.1 : 0.6), by: b.id, hit: [] });
        if (ranger) sfx.arrow();
      }
    }
  }
  return true;
}
function menderHeal(b) {
  if (b.healT > 0) return false;
  const s = state, cands = [b];
  if (b.party || b.mode === 'rescue') {
    if (!s.hero.dead && (b.party || dist(b, s.hero) < 12)) cands.push(s.hero);
    for (const q of s.bots) if (q.alive && q !== b && (q.party || (q.mode === 'rescue' && q.trouble))) cands.push(q);
  }
  let best = null, bf = 0.7;
  for (const a of cands) { const f = a.hp / a.maxHp; if (f < bf && dist(b, a) < 11) { bf = f; best = a; } }
  if (!best) return false;
  b.healT = tune.botHealCd; b.act = { type: 'cast', t: 0, dur: 0.5 }; b.face = angTo(b, best);
  s.projectiles.push({ id: nid(), kind: 'heal', team: 'heal', x: b.x, z: b.z, px: b.x, pz: b.z, vx: 0, vz: 0, face: 0, life: 2, maxLife: 2, r: 0.4, tgt: best === s.hero ? 'hero' : best.id, amount: best.maxHp * tune.botHeal, hit: [] });
  sfx.heal(); if (best === s.hero && b.party && rng() < 0.3) chat(b.name, 'healing!', 'party');
  return true;
}
function botRescue(b, dt) {
  const s = state, h = s.hero;
  if (!b.trouble) {
    if (h.dead || dist(b, h) > 18) return;
    b.trouble = true;
    const pi = packIndex(b.packId);
    for (const e of s.enemies) if (e.pack === pi && !e.dead && e.state === 'standoff') { e.state = 'chase'; e.target = { kind: 'bot', id: b.id }; e.retarget = 2; }
    chat(b.name, 'help! anyone? over here!', 'bot');
    announce(`${b.name} is in trouble`, 'A player is fighting for their life. Their lantern is still lit.', '#ffcf8a');
    emit({ type: 'trouble', name: b.name });
  }
  if (!botFight(b, dt, 8) && dist(b, b.home) > 2) moveDir(b, angTo(b, b.home), 3, dt);
  if (dist(b, b.home) > 5) moveDir(b, angTo(b, b.home), 3, dt);
}
function botParty(b, dt) {
  const h = state.hero;
  if (h.dead) return;
  const d = dist(b, h);
  if (d > 45) { placeNear(b, h.x, h.z); return; }
  let engaged = false;
  if (d < 14) engaged = botFight(b, dt, 10);
  if (!engaged && b.cls === 'mender') menderHeal(b);
  if (!engaged) followHero(b, dt);
}
function followHero(b, dt) {
  const s = state, h = s.hero, f = h.face, fx = Math.sin(f), fz = Math.cos(f), rx = Math.cos(f), rz = -Math.sin(f);
  const off = [[-1.7, -1.5], [-1.7, 1.5], [-3.0, 0], [-3.2, -2.2], [-3.2, 2.2]][Math.max(0, b.slot) % 5];
  const gx = h.x + fx * off[0] + rx * off[1], gz = h.z + fz * off[0] + rz * off[1];
  const goal = circleFree(gx, gz, b.r) ? { x: gx, z: gz } : { x: h.x, z: h.z };
  let tgt = goal;
  if (!los(b.x, b.z, goal.x, goal.z)) {
    tgt = null;
    for (let i = s.trail.length - 1; i >= 0; i--) { const p = s.trail[i]; if (los(b.x, b.z, p.x, p.z)) { tgt = p; break; } }
    b.lostT += dt;
    if (!tgt || b.lostT > 5) { placeNear(b, h.x, h.z); b.lostT = 0; return; }
  } else b.lostT = 0;
  const dd = dist(b, tgt);
  if (dd > 0.6) {
    const sp = Math.min(tune.heroSpeed * 1.15, 2 + dd * 1.5);
    moveEnt(b, (tgt.x - b.x) / dd * sp * dt, (tgt.z - b.z) / dd * sp * dt);
    b.face = turnToward(b.face, Math.atan2(tgt.x - b.x, tgt.z - b.z), 10 * dt); b.moving = Math.min(1, sp / 5); b.walkPhase += sp * dt * 1.7;
  } else b.face = turnToward(b.face, h.face, 4 * dt);
}

export { updateBots };
