// Shots in flight (arrows, bolts, heals, spit globs, the crescent wave) and what they hit.

import { tune } from '../config.js';
import { dist } from '../math.js';
import { FX, state } from './state.js';
import { sfx } from '../audio/sfx.js';
import { isSolid } from './world/grid.js';
import { hittable, heroDamage } from './hero/sword.js';
import { allies, hurtAlly, alliesInShape } from './enemies/targets.js';
import { damageEnemy } from './enemies/damage.js';

function updateProjectiles(dt) {
  const s = state;
  for (let i = s.projectiles.length - 1; i >= 0; i--) {
    const p = s.projectiles[i]; p.px = p.x; p.pz = p.z; p.life -= dt;
    if (p.team === 'heal') {
      const t = p.tgt === 'hero' ? (s.hero.dead ? null : s.hero) : s.bots.find(b => b.id === p.tgt && b.alive);
      if (!t || p.life <= 0) { s.projectiles.splice(i, 1); continue; }
      const d = dist(p, t), sp = 14 * dt;
      if (d <= sp + 0.3) { t.hp = Math.min(t.maxHp, t.hp + p.amount); FX.push({ type: 'heal', x: t.x, z: t.z }); s.projectiles.splice(i, 1); continue; }
      p.x += (t.x - p.x) / d * sp; p.z += (t.z - p.z) / d * sp; continue;
    }
    const nx = p.x + p.vx * dt, nz = p.z + p.vz * dt;
    if (isSolid(nx, nz) || p.life <= 0) { if (p.kind === 'glob') splash(p); s.projectiles.splice(i, 1); continue; }
    p.x = nx; p.z = nz;
    if (p.team === 'enemy') {
      if (allies().some(al => dist(p, al) < p.r + al.r)) { splash(p); s.projectiles.splice(i, 1); }
      continue;
    }
    for (const e of s.enemies) {
      if (!hittable(e) || p.hit.includes(e.id) || dist(p, e) > p.r + e.r) continue;
      if (p.kind === 'crescent') {
        p.hit.push(e.id); const r = heroDamage(p.dmgMult);
        damageEnemy(e, r.d, { crit: r.crit, agg: p.agg, knock: 0.8, stun: tune.stunTime, fromX: p.px, fromZ: p.pz, hero: true }); sfx.hit();
      } else { damageEnemy(e, p.dmg, { by: p.by, knock: 0.15, fromX: p.px, fromZ: p.pz }); s.projectiles.splice(i, 1); break; }
    }
  }
}
function splash(p) { alliesInShape({ shape: 'circle', x: p.x, z: p.z, radius: 1.1 }, a => hurtAlly(a, p.dmg)); FX.push({ type: 'splash', x: p.x, z: p.z }); }

export { updateProjectiles };
