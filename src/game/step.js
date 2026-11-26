// simStep: one fixed step of the whole game, calling every system in order.

import { state } from './state.js';
import { updateRogues } from './hollow.js';
import { updateChat } from './chat.js';
import { separate } from './world/grid.js';
import { updatePacks } from './world/populate.js';
import { updateHero } from './hero/controls.js';
import { updateArea } from './world/interact.js';
import { updateDrops } from './loot/drops.js';
import { updateBots } from './bots/ai.js';
import { updateEnemies } from './enemies/ai.js';
import { updateProjectiles } from './projectiles.js';
import { saveGame } from './save.js';

function simStep(dt) {
  const s = state;
  s.t += dt; s.runTime += dt;
  updateHero(dt);
  updateArea();
  updateBots(dt);
  updateEnemies(dt);
  updateProjectiles(dt);
  updateDrops(dt);
  separate();
  updatePacks(dt);
  updateRogues(dt);
  updateChat(dt);
  const a = s.announce[0]; if (a) { a.t += dt; if (a.t > 3.4) s.announce.shift(); }
  s.saveT -= dt; if (s.saveT <= 0) { s.saveT = 20; saveGame(); }
  s.score = s.hero.gold;
}

export { simStep };
