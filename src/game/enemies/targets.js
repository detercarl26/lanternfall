// Who enemies can hit: allies() (the hero and fighting bots), the shapes their blows cover,
// hurtAlly and knockAlly.

import { angDiff } from '../../math.js';
import { state } from '../state.js';
import { combatBot } from '../bots/roster.js';
import { hurtHero } from '../hero/hero.js';
import { moveEnt } from '../world/grid.js';
import { hurtBot } from '../bots/party.js';

function resolveAlly(t) {
  if (!t) return null;
  const s = state;
  if (t.kind === 'hero') return s.hero.dead ? null : s.hero;
  const b = s.bots.find(q => q.id === t.id);
  return b && b.alive && combatBot(b) ? b : null;
}
function allies() { const s = state, out = []; if (!s.hero.dead) out.push(s.hero); for (const b of s.bots) if (b.alive && combatBot(b)) out.push(b); return out; }
function hurtAlly(a, dmg) { if (a.kind === 'hero') return hurtHero(dmg); hurtBot(a, dmg); return true; }
function knockAlly(a, face, k) { if (a.kind === 'hero' && a.act && a.act.type === 'roll') return; moveEnt(a, Math.sin(face) * k, Math.cos(face) * k); }
function inShape(T, a) {
  const dx = a.x - T.x, dz = a.z - T.z;
  if (T.shape === 'circle') return Math.hypot(dx, dz) <= T.radius + a.r;
  if (T.shape === 'cone') {
    const d = Math.hypot(dx, dz); if (d > T.radius + a.r) return false; if (d < 0.9) return true;
    return Math.abs(angDiff(Math.atan2(dx, dz), T.face)) <= T.arc / 2 + Math.atan2(a.r, d);
  }
  const fx = Math.sin(T.face), fz = Math.cos(T.face), along = dx * fx + dz * fz, perp = Math.abs(-dx * fz + dz * fx);
  return along >= -a.r && along <= T.len + a.r && perp <= T.width / 2 + a.r;
}
function alliesInShape(T, fn) { for (const a of allies()) if (inShape(T, a)) fn(a); }
function strikeCone(e, face, radius, arc, dmg) { alliesInShape({ shape: 'cone', x: e.x, z: e.z, face, radius, arc }, a => hurtAlly(a, dmg)); }

export { resolveAlly, allies, hurtAlly, knockAlly, alliesInShape, strikeCone };
