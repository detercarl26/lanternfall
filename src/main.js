// Boot and the loop: the fixed step, the frame clock, and window.game, which automated checks read
// and drive.

import './config.js';
import { params, clock } from './platform/page.js';
import './ui/kit.js';
import { hit, down, pressed } from './platform/input.js';
import './math.js';
import { events, scene, state, setScene } from './game/state.js';
import { muted, setMuted } from './audio/sfx.js';
import './game/world/floor1.js';
import './game/bots/roster.js';
import './game/hollow.js';
import './game/enemies/spawn.js';
import './game/hero/hero.js';
import './game/loot/items.js';
import './game/chat.js';
import './game/world/grid.js';
import './game/world/decor.js';
import './render/materials.js';
import './render/world-meshes.js';
import './render/figures.js';
import './game/hero/sword.js';
import './game/world/populate.js';
import './game/step.js';
import './game/hero/controls.js';
import './game/world/interact.js';
import './game/inventory.js';
import './game/loot/drops.js';
import './game/bots/party.js';
import './game/quests.js';
import './game/bots/ai.js';
import './game/enemies/targets.js';
import './game/enemies/ai.js';
import './game/enemies/damage.js';
import './game/warden.js';
import './game/projectiles.js';
import './game/hero/level.js';
import { saveGame } from './game/save.js';
import './render/scene.js';
import './render/frame.js';
import './render/view.js';
import './ui/labels.js';
import './ui/panels.js';
import './ui/inventory.js';
import './ui/hud.js';
import { reset, scenes } from './scenes.js';

const STEP = 1 / 60;            // simulation step in seconds; motion is per second, never per frame

// ---- Loop: fixed step, frame time clamped ---------------------------------------------
function step() {
  if (pressed('KeyM')) { setMuted(!muted); hit.delete('KeyM'); }
  scenes[scene].update(STEP); hit.clear();
}
let last, acc = 0, ALPHA = 1; // ALPHA: how far the frame is between the last two steps
function tick() {
  const now = clock.now();
  acc += Math.min(now - last, 0.25); last = now; // a stall never fast-forwards the game
  while (acc >= STEP) { step(); acc -= STEP; }
  ALPHA = acc / STEP; // draw between steps, so the view never judders
  drawFrame();
}
function drawFrame() { scenes[scene].draw(); }
function frame() { tick(); requestAnimationFrame(frame); }
// A headless browser on a time budget runs timers but almost no animation frames: a timer
// ticks when no frame has come for 100 ms on a visible page; a hidden tab stays paused.
function timer() { if (document.visibilityState === 'visible' && clock.now() - last > 0.1) tick(); }

// ---- What a check can read and drive (?manual=1 stops the loop; players never see it) ----
window.game = {
  get scene() { return scene; },
  get state() { return state; },
  press(code) { hit.add(code); },
  hold(code, on) { on ? down.add(code) : down.delete(code); },
  get events() { return events; }, // the loop steps; a check empties it
  step(n = 1, draw = true, alpha = 1) {
    for (let i = 0; i < n; i++) step();
    if (draw) { ALPHA = alpha; drawFrame(); }
  },
};
addEventListener('pagehide', () => { if (scene === 'play' || scene === 'pause') saveGame(); });

reset();
setScene(params.get('scene') || 'title');
last = clock.now();
if (params.get('manual') === '1') drawFrame();
else { requestAnimationFrame(frame); setInterval(timer, 50); }

export { ALPHA };
