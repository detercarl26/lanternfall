// The hero's sword: swing, dodge roll, the sword skills (Q/E/R) with auto-aim, and what each blow
// hits and for how much.

import { tune } from '../../config.js';
import { rng, rrange, dist, angTo, angDiff } from '../../math.js';
import { emit, FX, SHAKE, setShake, nid, state } from '../state.js';
import { sfx } from '../../audio/sfx.js';
import { SKILLS } from './hero.js';
import { announce } from '../chat.js';
import { moveEnt } from '../world/grid.js';
import { damageEnemy } from '../enemies/damage.js';

let aggCounter = 1;

// ---- The hero -----------------------------------------------------------------------------------
function hittable(e) { return !e.dead && !(e.kind === 'warden' && !state.bossFight); }
function sureStrike(h, ang, range) { // turn toward the nearest enemy in reach, preferring where you aimed
  const R = range || tune.autoAim; if (R <= 0) return ang;
  let best = null, bs = 1e9;
  for (const e of state.enemies) {
    if (!hittable(e)) continue;
    const d = dist(h, e) - e.r; if (d > R) continue;
    const da = Math.abs(angDiff(angTo(h, e), ang));
    if (da > 1.6 && d > 1.2) continue;
    const sc = d + da * 2.2; if (sc < bs) { bs = sc; best = e; }
  }
  return best ? angTo(h, best) : ang;
}
function startSwing(ang) {
  const h = state.hero; ang = sureStrike(h, ang, 0);
  h.act = { type: 'swing', t: 0, dur: tune.swingTime / h.atkSpeed, hitAt: tune.swingWindup / h.atkSpeed, face: ang, done: false, agg: aggCounter++ };
  h.face = ang; sfx.swing();
}
function startRoll(mx, mz, aimAng) {
  const h = state.hero, ang = (mx || mz) ? Math.atan2(mx, mz) : aimAng;
  h.act = { type: 'roll', t: 0, dur: tune.dodgeTime, hitAt: 0, face: ang };
  h.face = ang; h.dodgeCd = tune.dodgeCooldown; h.target = null;
  sfx.dodge(); FX.push({ type: 'dust', x: h.x, z: h.z }); emit({ type: 'dodge' });
}
function trySkill(k, ang) {
  const s = state, h = s.hero, sk = SKILLS[k], lv = tune[sk.lv];
  if (h.level < lv) {
    if (s.t - s.flags.lockedHint > 2) { s.flags.lockedHint = s.t; announce(sk.name, `Unlocks at level ${lv}`, '#c8c0b0'); }
    return;
  }
  if (h.cd[k] > 0) return;
  const type = { q: 'whirl', e: 'lunge', r: 'crescent' }[k];
  if (type !== 'whirl') ang = sureStrike(h, ang, 8);
  const dur = { whirl: tune.whirlTime, lunge: tune.lungeTime + 0.12, crescent: 0.55 }[type];
  h.act = { type, t: 0, dur, hitAt: type === 'crescent' ? 0.26 : 0.05, face: ang, done: false, ticks: 0, hit: [], agg: aggCounter++, last: -1 };
  h.face = ang; h.target = null;
  h.cd[k] = { q: tune.whirlCooldown, e: tune.lungeCooldown, r: tune.crescentCooldown }[k];
  sfx.skill(); emit({ type: 'skill', key: k });
  if (type === 'whirl') FX.push({ type: 'whirl', x: h.x, z: h.z, r: tune.whirlRadius, dur: tune.whirlTime });
}

function rankMult(k) { return 1 + tune.skillRankBonus * Math.max(0, state.hero.level - tune[SKILLS[k].lv]); }
function heroDamage(mult) {
  const h = state.hero, sw = h.sword;
  let d = rrange(sw.min, sw.max) * h.dmgMult * mult; const crit = rng() < h.crit;
  if (crit) d *= tune.critMult;
  return { d, crit };
}
function stepHeroAct(h, dt) {
  const a = h.act; a.t += dt;
  const skillMult = k => (1 + h.skillDmg) * rankMult(k);
  if (a.type === 'swing') {
    if (!a.done && a.t >= a.hitAt) {
      a.done = true; hitArc(h.x, h.z, a.face, tune.swingReach, tune.swingArc, 1, a.agg, 0.4);
      FX.push({ type: 'slash', x: h.x, z: h.z, face: a.face, reach: tune.swingReach, arc: tune.swingArc, color: 0xe8e2d0 });
    }
  } else if (a.type === 'whirl') {
    while (a.ticks < 2 && a.t >= a.dur * (0.2 + a.ticks * 0.45)) { a.ticks++; hitArc(h.x, h.z, 0, tune.whirlRadius, 360, tune.whirlMult * skillMult('q') / 2, a.agg, tune.whirlKnock); }
  } else if (a.type === 'lunge') {
    if (a.t < tune.lungeTime) {
      const sp = tune.lungeDist / tune.lungeTime;
      moveEnt(h, Math.sin(a.face) * sp * dt, Math.cos(a.face) * sp * dt);
      for (const e of state.enemies) {
        if (!hittable(e) || a.hit.includes(e.id) || dist(h, e) > 1.3 + e.r) continue;
        a.hit.push(e.id); const r = heroDamage(tune.lungeMult * skillMult('e'));
        damageEnemy(e, r.d, { crit: r.crit, agg: a.agg, knock: 1.2, fromX: h.x, fromZ: h.z, hero: true }); sfx.hit();
      }
      if (a.t - a.last > 0.05) { a.last = a.t; FX.push({ type: 'trail', x: h.x, z: h.z }); }
    }
  } else if (a.type === 'crescent') {
    if (!a.done && a.t >= a.hitAt) {
      a.done = true; const sp = tune.crescentSpeed;
      state.projectiles.push({ id: nid(), kind: 'crescent', team: 'ally', x: h.x + Math.sin(a.face) * 0.8, z: h.z + Math.cos(a.face) * 0.8, px: h.x, pz: h.z,
        vx: Math.sin(a.face) * sp, vz: Math.cos(a.face) * sp, face: a.face, life: tune.crescentRange / sp, maxLife: tune.crescentRange / sp,
        r: tune.crescentWidth / 2, dmgMult: tune.crescentMult * skillMult('r'), hit: [], agg: a.agg });
      setShake(Math.max(SHAKE, 0.35));
    }
  } else if (a.type === 'roll') {
    if (a.t < tune.dodgeTime) { const sp = tune.dodgeDist / tune.dodgeTime; moveEnt(h, Math.sin(a.face) * sp * dt, Math.cos(a.face) * sp * dt); }
  }
  if (h.act === a && a.t >= a.dur) h.act = null;
}
function hitArc(x, z, face, reach, arcDeg, mult, agg, knock) {
  const half = arcDeg * Math.PI / 360; let n = 0;
  for (const e of state.enemies) {
    if (!hittable(e)) continue;
    const d = Math.hypot(e.x - x, e.z - z); if (d > reach + e.r) continue;
    if (d > e.r + 0.5 && Math.abs(angDiff(Math.atan2(e.x - x, e.z - z), face)) > half) continue;
    const r = heroDamage(mult); damageEnemy(e, r.d, { crit: r.crit, agg, knock, fromX: x, fromZ: z, hero: true }); n++;
  }
  if (n) { sfx.hit(); setShake(Math.max(SHAKE, 0.12)); }
  return n;
}

export { hittable, startSwing, startRoll, trySkill, heroDamage, stepHeroAct };
