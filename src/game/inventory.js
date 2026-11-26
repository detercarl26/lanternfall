// The bag: picking an item up into it, wearing one (equipFromBag), dropping one, and where its
// slots sit on screen (BAG, bagSlotRect, bagSlotAt).

import { tune } from '../config.js';
import { state } from './state.js';
import { sfx } from '../audio/sfx.js';
import { recalcHero } from './hero/hero.js';
import { chat } from './chat.js';
import { inHollow } from './world/grid.js';
import { placeItem } from './loot/drops.js';
import { saveGame } from './save.js';

const BAG = { x: 864, y: 110, cols: 5, size: 64, gap: 8 };   // the bag window, at the right edge so the hero at the centre stays in view
function bagSlotRect(i) {
  const c = i % BAG.cols, r = Math.floor(i / BAG.cols);
  return { x: BAG.x + 24 + c * (BAG.size + BAG.gap), y: BAG.y + 130 + r * (BAG.size + BAG.gap), w: BAG.size, h: BAG.size };
}
function bagSlotAt(mx, my) {
  for (let i = 0; i < bagSlots(); i++) { const r = bagSlotRect(i); if (mx >= r.x && mx < r.x + r.w && my >= r.y && my < r.y + r.h) return i; }
  return -1;
}
function equipFromBag(i) {
  const h = state.hero, it = h.bag[i]; if (!it) return;
  h.bag[i] = h[it.slot];          // what you wore takes its place in the bag
  h[it.slot] = it; recalcHero();
  sfx.click(); chat('', `Equipped ${it.name}.`, 'sys'); saveGame();
}
function dropFromBag(i) {
  const h = state.hero, it = h.bag.splice(i, 1)[0]; if (!it) return;
  placeItem(it, h.x + 1, h.z);
  sfx.click(); chat('', `Dropped ${it.name}.`, 'sys'); saveGame();
}

function addToInventory(d) {
  const s = state, h = s.hero, it = d.item; if (!it) return;
  if (inHollow(h.x, h.z)) { s.drops.splice(s.drops.indexOf(d), 1); h.haul.items.push(it); chat('', `${it.name} goes into your haul. Leave the Hollow to keep it.`, 'warn'); sfx.click(); return; }
  if (h.bag.length >= tune.bagSize) { chat('', 'Your bag is full. Press I and drop something.', 'warn'); return; }
  s.drops.splice(s.drops.indexOf(d), 1);
  h.bag.push(it);
  sfx.click(); chat('', `${it.name} goes into your bag. Press I to wear it.`, 'sys'); saveGame();
}

// ---- The save: this browser keeps your hero, your party and who has fallen -------------------
// How many bag slots to show: the bag's size, or more when a lowered bagSize leaves items past it
function bagSlots() { return Math.max(tune.bagSize, state.hero.bag.length); }

export { BAG, bagSlotRect, bagSlotAt, equipFromBag, dropFromBag, addToInventory, bagSlots };
