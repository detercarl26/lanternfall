// HUD, the HUD of each screen: play() lays out every panel, plus title, pause, results and the
// figures lineup labels.

import { W, H, ctx } from '../platform/page.js';
import { SERIF, clearHud, text, C, setPlaced, rr, reserve, wlabel, fitText } from './kit.js';
import { CONTROLS } from '../platform/input.js';
import { readSave } from '../game/save.js';
import { worldLabels, damageNumbers } from './labels.js';
import { partyFrames, minimap, tracker, chatBox, skillBar, stats, haulBox, bossBar, announceBox, boardPanel, deathOverlay } from './panels.js';
import { inventoryPanel, tooltip } from './inventory.js';

function play(s) {
  clearHud(); setPlaced([]);
  const h = s.hero, party = s.bots.filter(b => b.party && b.alive).sort((a, b) => a.slot - b.slot);
  if (party.length) reserve(12, 12, 232, party.length * 46);
  reserve(1080, 8, 192, 246); reserve(1008, 248, 264, 190); reserve(8, 536, 444, 176);
  reserve(450, 580, 380, 136); reserve(840, 596, 200, 76);
  if (s.bossFight) reserve(380, 8, 520, 46);
  if (s.announce.length) reserve(240, 112, 800, 92);
  if (s.area === 'hollow' || h.haul.gold || h.haul.items.length) reserve(300, 536, 680, 36);
  const quiet = s.ui.panel || h.dead;
  if (!quiet) { worldLabels(s); damageNumbers(s); }
  partyFrames(party); minimap(s); tracker(s); chatBox(s); skillBar(s); stats(s); haulBox(s); bossBar(s); announceBox(s);
  if (s.ui.panel === 'board') boardPanel(s);
  else if (s.ui.panel === 'inventory') inventoryPanel(s);
  else if (!h.dead) tooltip(s);
  deathOverlay(s);
}
function title() {
  clearHud(); setPlaced([]);
  rr(330, 92, 620, 512, 12, 'rgba(6,7,9,0.8)', 'rgba(190,170,130,0.45)');
  text('LANTERNFALL', 640, 164, 64, '#f3e2b8', 'center', '600', SERIF);
  text('Floor 1 · Ashgate and the Greyfields', 640, 218, 18, '#d6c8a6');
  text('Trapped in the tower. The only way out is up.', 640, 250, 16, '#c4bcac');
  CONTROLS.forEach((c, i) => text(c, 640, 302 + i * 30, 16, '#ece6d8'));
  const save = readSave();
  text(save ? `Enter: continue (level ${save.level}${save.wardenDown ? ', Floor 1 cleared' : ''})` : 'Enter: start', 640, 474, 20, '#f2d257', 'center', '600');
  text(save ? 'N: start a new game (erases the save)' : 'Your progress saves in this browser', 640, 508, 15, '#c4bcac');
  text('Bot players stand in for real players: an online world needs a server.', 640, 560, 14, '#aaa294');
}
function pause(confirm) {
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, W, H);
  rr(420, 240, 440, 230, 10, 'rgba(10,11,14,0.95)', C.edge);
  text('Paused', 640, 288, 40, C.text, 'center', '600', SERIF);
  text('P or Esc: resume', 640, 340, 16, C.text);
  text(confirm ? 'Press N again to erase your save and start over' : 'N: start a new game', 640, 374, 16, confirm ? C.red : C.dim);
  text('Your progress saves on its own · M: sound on or off', 640, 412, 14, C.dim);
}
function results(s) {
  ctx.fillStyle = 'rgba(0,0,0,0.62)'; ctx.fillRect(0, 0, W, H);
  rr(320, 110, 640, 500, 12, 'rgba(10,10,12,0.96)', '#c8a860');
  text('Floor 1 cleared', 640, 170, 44, C.gold, 'center', '600', SERIF);
  const h = s.hero, m = Math.floor(s.runTime / 60), sec = Math.floor(s.runTime % 60);
  const saved = s.bots.filter(b => b.rescued && b.alive).map(b => b.name), party = s.bots.filter(b => b.party && b.alive).map(b => b.name);
  [
    `Time in the tower ${m}:${String(sec).padStart(2, '0')}`,
    `Level ${h.level} · gold ${h.gold} · falls ${s.deaths}`,
    `Raid party at the end: ${party.length ? party.join(', ') : 'you alone'}`,
    `Players you rescued: ${saved.length ? saved.join(', ') : 'none'}`,
    `Lanterns gone dark: ${s.fallen.length ? s.fallen.join(', ') : 'none'}`,
    `Players alive in the tower: ${s.playersAlive.toLocaleString('en-US')}`,
  ].forEach((l, i) => text(fitText(l, 580, 16), 640, 232 + i * 34, 16, C.text));
  text('Floor 2 is not built yet. Tell me what to change, keep or add.', 640, 468, 15, C.dim);
  text('Enter: back to Ashgate    N: start a new game', 640, 548, 18, C.gold, 'center', '600');
}
function figures(labels) {
  clearHud(); setPlaced([]);
  text('Every figure in Lanternfall', 640, 40, 22, '#f3e2b8', 'center', '600', SERIF);
  reserve(380, 22, 520, 36);
  labels.forEach((l, i) => wlabel(l.name, l.x, l.y + (i % 2) * 26, 14, '#ece6d8'));
}

export { play, title, pause, results, figures };
