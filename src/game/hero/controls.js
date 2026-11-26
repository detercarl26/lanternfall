// updateHero, the hero's step (timers, regen, then keys and the mouse aimed through the 3D view
// into moves, skills and clicks), and respawnHero.

import { tune } from '../../config.js';
import { pressed, held, mouse } from '../../platform/input.js';
import { turnToward } from '../../math.js';
import { emit, state } from '../state.js';
import { sfx } from '../../audio/sfx.js';
import { SPAWN } from '../world/floor1.js';
import { drinkPotion } from './hero.js';
import { announce } from '../chat.js';
import { moveEnt, placeNear } from '../world/grid.js';
import { startSwing, startRoll, trySkill, stepHeroAct } from './sword.js';
import { findHover, resolveHover, interact } from '../world/interact.js';
import { invOpen, invClick, invRightClick, updateInventory } from '../inventory.js';
import { resetBoss } from '../warden.js';
import { saveGame } from '../save.js';
import * as VIEW from '../../render/view.js';

function updateHero(dt) {
  const s = state, h = s.hero;
  h.px = h.x; h.pz = h.z;
  updateInventory();
  if (h.dead) { h.deathT += dt; if (h.deathT >= 2.6) respawnHero(); return; }
  h.dodgeCd = Math.max(0, h.dodgeCd - dt); h.hurtT = Math.max(0, h.hurtT - dt); h.combatT += dt;
  for (const k in h.cd) h.cd[k] = Math.max(0, h.cd[k] - dt);
  if (h.healLeft > 0) { const a = Math.min(h.healLeft, h.healRate * dt); h.hp = Math.min(h.maxHp, h.hp + a); h.healLeft -= a; }
  if (h.combatT > tune.regenDelay) h.hp = Math.min(h.maxHp, h.hp + h.regen * dt);

  const aim = VIEW.mouseWorld();
  const hov = s.ui.panel ? null : findHover(aim);
  s.ui.hover = hov;
  if (!held('Mouse0')) h.mouseLock = false;
  let mx = 0, mz = 0;
  if (held('KeyW') || held('ArrowUp')) mz -= 1;
  if (held('KeyS') || held('ArrowDown')) mz += 1;
  if (held('KeyA') || held('ArrowLeft')) mx -= 1;
  if (held('KeyD') || held('ArrowRight')) mx += 1;
  if (mx || mz) h.target = null;
  if (pressed('KeyI')) { s.ui.panel = invOpen() ? null : 'inventory'; h.target = null; } // the bag stops a walk to something
  if (pressed('Mouse0')) {
    if (invOpen()) { invClick(mouse.x, mouse.y); h.mouseLock = true; }
    else if (s.ui.panel) { s.ui.panel = null; h.mouseLock = true; }
    else if (hov) { h.target = { type: hov.type, id: hov.id }; h.mouseLock = true; sfx.click(); }
  }
  if (pressed('Mouse2') && invOpen()) invRightClick(mouse.x, mouse.y);
  const a = h.act, landed = a && a.type !== 'roll' && a.t >= a.hitAt;
  const aimAng = aim ? Math.atan2(aim.x - h.x, aim.z - h.z) : h.face;
  if (pressed('Space') && h.dodgeCd <= 0 && (!a || landed)) startRoll(mx, mz, aimAng);
  else if (pressed('KeyF')) drinkPotion();
  else if (!a || (a.type === 'swing' && landed)) {
    if (pressed('KeyQ')) trySkill('q', aimAng);
    else if (pressed('KeyE')) trySkill('e', aimAng);
    else if (pressed('KeyR')) trySkill('r', aimAng);
  }
  if (!h.act && held('Mouse0') && !h.mouseLock && !h.target && !s.ui.panel) startSwing(aimAng);
  if (h.act) stepHeroAct(h, dt);

  let vx = 0, vz = 0;
  if (!h.act) {
    if (mx || mz) { const l = Math.hypot(mx, mz); vx = mx / l; vz = mz / l; }
    else if (h.target) {
      const t = resolveHover(h.target);
      if (!t) h.target = null;
      else {
        const d = Math.hypot(t.x - h.x, t.z - h.z);
        if (d <= t.reach) { h.target = null; interact(t); } else { vx = (t.x - h.x) / d; vz = (t.z - h.z) / d; }
      }
    }
  }
  h.moving = 0;
  if (vx || vz) {
    const sp = tune.heroSpeed * h.moveMult, ok = moveEnt(h, vx * sp * dt, vz * sp * dt);
    h.face = turnToward(h.face, Math.atan2(vx, vz), 14 * dt); h.moving = 1;
    if (!ok && h.target) { h.stuckT += dt; if (h.stuckT > 1.2) { h.target = null; h.stuckT = 0; } } else h.stuckT = 0;
  }
  h.walkPhase += dt * 10 * h.moving;
  const last = s.trail[s.trail.length - 1];
  if (!last || Math.hypot(last.x - h.x, last.z - h.z) > 1.5) { s.trail.push({ x: h.x, z: h.z }); if (s.trail.length > 90) s.trail.shift(); }
}

function respawnHero() {
  const s = state, h = s.hero;
  if (s.bossFight) resetBoss();
  h.dead = false; h.deathT = 0; h.x = h.px = SPAWN.x; h.z = h.pz = SPAWN.z; h.hp = h.maxHp; h.potions = tune.potionCharges;
  h.act = null; h.healLeft = 0; h.combatT = 99;
  for (const b of s.bots) if (b.alive && b.party) { placeNear(b, h.x, h.z); b.hp = b.maxHp; }
  for (const e of s.enemies) if (!e.dead && e.kind !== 'warden' && e.state === 'chase') { e.target = null; e.state = 'return'; e.act = null; e.tele = null; }
  s.projectiles.length = 0; s.trail = [];
  announce('You wake in Ashgate', 'Everything you carried is still yours. The others are not so lucky.', '#cfd8e6');
  saveGame(); emit({ type: 'respawn' });
}

export { updateHero };
