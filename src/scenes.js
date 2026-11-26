// The five screens (title, play, pause, results, figures), what each does on a step and draws, plus
// reset() and startGame().

import { CONFIG } from './config.js';
import { params } from './platform/page.js';
import { pressed } from './platform/input.js';
import { setSeed } from './math.js';
import { newState, state, pauseConfirm, setState, setScene, setPauseConfirm } from './game/state.js';
import { populateWorld } from './game/world/populate.js';
import { simStep } from './game/step.js';
import { backToTown } from './game/warden.js';
import { hasSave, clearSave, loadGame } from './game/save.js';
import * as VIEW from './render/view.js';
import * as HUD from './ui/hud.js';

function reset() {
  setSeed(Number(params.get('seed')) || CONFIG.seed);
  // state.gained: what this run gained or learned, the high the ending shows.
  setState(newState()); populateWorld();
}
function startGame(fresh) {
  reset();
  if (fresh) clearSave();
  else if (hasSave()) loadGame();
  setScene('play');
}
const scenes = {
  figures: {
    update(dt) { state.t += dt; },
    draw() { VIEW.drawFigures(state.t); HUD.figures(VIEW.figureLabels()); },
  },
  title: {
    update(dt) {
      state.t += dt;
      if (pressed('Enter') || pressed('Space')) startGame(false);
      else if (pressed('KeyN')) startGame(true);
    },
    draw() { VIEW.drawTitle(state); HUD.title(); },
  },
  play: {
    update(dt) {
      if (pressed('KeyP') || pressed('Escape')) {
        if (state.ui.panel) state.ui.panel = null;
        else { setScene('pause'); setPauseConfirm(false); return; }
      }
      simStep(dt);
      if (state.ended) setScene('results');
    },
    draw() { VIEW.drawPlay(state); HUD.play(state); },
  },
  pause: {
    update() {
      if (pressed('KeyP') || pressed('Escape')) setScene('play');
      else if (pressed('KeyN')) {
        if (pauseConfirm) { startGame(true); setPauseConfirm(false); } else setPauseConfirm(true);
      }
    },
    draw() { VIEW.drawPlay(state); HUD.play(state); HUD.pause(pauseConfirm); },
  },
  results: {
    update() {
      if (pressed('Enter')) { backToTown(); setScene('play'); }
      else if (pressed('KeyN')) startGame(true);
    },
    draw() { VIEW.drawPlay(state); HUD.play(state); HUD.results(state); },
  },
};

export { reset, scenes };
