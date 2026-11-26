// The inventory: what the hero wears (SLOTS), a bag and a stash that are grids where an item covers
// several cells, an item held on the cursor while you move it, and where every window, slot and cell
// sits on the 1280x720 HUD (LAYOUT, slotRect, gridOrigin, invHit).
//
// Items in a grid carry their top-left cell as gx, gy. A held item is in no grid and worn by no slot:
// it lives in state.ui.held until it is put down, and the save counts it as in the bag.

import { tune } from '../config.js';
import { state } from './state.js';
import { sfx } from '../audio/sfx.js';
import { recalcHero } from './hero/hero.js';
import { chat } from './chat.js';
import { inHollow } from './world/grid.js';
import { STASH } from './world/floor1.js';
import { placeItem } from './loot/drops.js';
import { KINDS, itemSize } from './loot/items.js';
import { saveGame } from './save.js';

// ---- What you wear ------------------------------------------------------------------------------
// Each slot: the kind of item it takes and where it sits on the paperdoll, in cells from its corner
const SLOTS = {
  sword: { kind: 'sword', label: 'Weapon', cx: 0, cy: 0.3, w: 2, h: 4 },
  helm: { kind: 'helm', label: 'Helm', cx: 3.2, cy: 0, w: 2, h: 2 },
  amulet: { kind: 'amulet', label: 'Amulet', cx: 5.45, cy: 1, w: 1, h: 1 },
  ring1: { kind: 'ring', label: 'Ring', cx: 2.05, cy: 3.2, w: 1, h: 1 },
  armor: { kind: 'armor', label: 'Body', cx: 3.2, cy: 2.2, w: 2, h: 3 },
  ring2: { kind: 'ring', label: 'Ring', cx: 5.45, cy: 3.2, w: 1, h: 1 },
  gloves: { kind: 'gloves', label: 'Gloves', cx: 0, cy: 4.45, w: 2, h: 2 },
  belt: { kind: 'belt', label: 'Belt', cx: 3.2, cy: 5.45, w: 2, h: 1 },
  boots: { kind: 'boots', label: 'Boots', cx: 6.6, cy: 4.45, w: 2, h: 2 },
};
const SLOT_KEYS = Object.keys(SLOTS);
const worn = h => SLOT_KEYS.map(k => h[k]).filter(Boolean);

// ---- Where things sit on screen ---------------------------------------------------------------
const CELL = 38, COLS = 12, PAD = 18, STASH_ROWS = 10;
const WIN_W = COLS * CELL + PAD * 2;
const LAYOUT = {
  inv: { x: 1280 - 12 - WIN_W, y: 22, w: WIN_W },  // the hero stays in view between the two windows
  stash: { x: 12, y: 22, w: WIN_W },
  dollTop: 52,                                      // the paperdoll, below the title
  bagTop: 52 + 6.45 * CELL + 30,                    // the bag grid, below the paperdoll and its label
  stashTop: 68,
};
// How many bag rows to draw: the bag's size, or more when a lowered bagRows leaves items past it
function bagRowsShown() {
  let r = tune.bagRows;
  for (const it of state.hero.bag) r = Math.max(r, it.gy + itemSize(it).h);
  return r;
}
function invHeight() { return LAYOUT.bagTop + bagRowsShown() * CELL + 44; }
function stashHeight() { return LAYOUT.stashTop + STASH_ROWS * CELL + 44; }
function slotRect(key) {
  const s = SLOTS[key], W0 = LAYOUT.inv;
  return { x: W0.x + PAD + s.cx * CELL, y: W0.y + LAYOUT.dollTop + s.cy * CELL, w: s.w * CELL, h: s.h * CELL };
}
function gridOrigin(box) {
  return box === 'bag' ? { x: LAYOUT.inv.x + PAD, y: LAYOUT.inv.y + LAYOUT.bagTop } : { x: LAYOUT.stash.x + PAD, y: LAYOUT.stash.y + LAYOUT.stashTop };
}
function sortRect(box) {
  const o = gridOrigin(box); return { x: o.x + COLS * CELL - 64, y: o.y - 27, w: 64, h: 22 };
}
const inRect = (r, x, y) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
const stashOpen = () => state.ui.panel === 'stash';
const invOpen = () => state.ui.panel === 'inventory' || state.ui.panel === 'stash';

// What is under a point on screen: a worn slot, a grid cell, a sort button, the bare window, or nothing
function invHit(mx, my) {
  if (!invOpen()) return null;
  const boxes = stashOpen() ? ['bag', 'stash'] : ['bag'];
  for (const key of SLOT_KEYS) if (inRect(slotRect(key), mx, my)) return { kind: 'slot', key };
  for (const box of boxes) {
    if (inRect(sortRect(box), mx, my)) return { kind: 'sort', box };
    const o = gridOrigin(box), { cols, rows } = boxSize(box);
    const gx = Math.floor((mx - o.x) / CELL), gy = Math.floor((my - o.y) / CELL);
    if (gx >= 0 && gx < cols && gy >= 0 && gy < rows) return { kind: 'grid', box, gx, gy, item: itemAtCell(box, gx, gy) };
  }
  if (inRect({ ...LAYOUT.inv, h: invHeight() }, mx, my)) return { kind: 'window' };
  if (stashOpen() && inRect({ ...LAYOUT.stash, h: stashHeight() }, mx, my)) return { kind: 'window' };
  return null;
}

// ---- Grids --------------------------------------------------------------------------------------
const boxItems = box => (box === 'bag' ? state.hero.bag : state.hero.stash);
// The grid's size: rows you can drop into (the bag's tuned size) and rows drawn may differ, see bagRowsShown
function boxSize(box, forPlacing = false) {
  if (box === 'stash') return { cols: COLS, rows: STASH_ROWS };
  return { cols: COLS, rows: forPlacing ? tune.bagRows : bagRowsShown() };
}
function collide(items, gx, gy, w, h, skip) {
  return items.filter(it => it !== skip && gx < it.gx + itemSize(it).w && gx + w > it.gx && gy < it.gy + itemSize(it).h && gy + h > it.gy);
}
function itemAtCell(box, gx, gy) { return collide(boxItems(box), gx, gy, 1, 1)[0] || null; }
// The first free spot for an item, scanning down each column from the left
function findSpot(box, it, items = boxItems(box)) {
  const { cols, rows } = boxSize(box, true), { w, h } = itemSize(it);
  for (let x = 0; x + w <= cols; x++) for (let y = 0; y + h <= rows; y++) if (!collide(items, x, y, w, h).length) return { gx: x, gy: y };
  return null;
}
function putIn(box, it) {
  const p = findSpot(box, it); if (!p) return false;
  it.gx = p.gx; it.gy = p.gy; boxItems(box).push(it); return true;
}
function takeOut(box, it) { const L = boxItems(box), i = L.indexOf(it); if (i >= 0) L.splice(i, 1); }
const hasRoom = (box, it) => !!findSpot(box, it);

// Puts every item of a loaded or older save where it can go: its own spot if it is free and inside the
// grid, else the first free one; returns what found no room
function settle(box, list) {
  const kept = [], left = [];
  const { cols, rows } = boxSize(box, true);
  for (const it of list) {
    const { w, h } = itemSize(it);
    const ok = Number.isInteger(it.gx) && Number.isInteger(it.gy) && it.gx >= 0 && it.gy >= 0 && it.gx + w <= cols && it.gy + h <= rows && !collide(kept, it.gx, it.gy, w, h).length;
    if (ok) kept.push(it); else left.push(it);
  }
  const rest = [];
  for (const it of left) { const p = findSpot(box, it, kept); if (p) { it.gx = p.gx; it.gy = p.gy; kept.push(it); } else rest.push(it); }
  return { kept, rest };
}

// Sorting packs a grid tight: by kind in paperdoll order, bigger first, then rarer
const KIND_ORDER = Object.keys(KINDS);
function sortBox(box) {
  const L = boxItems(box), was = L.map(it => [it, it.gx, it.gy]);
  const order = L.slice().sort((a, b) => KIND_ORDER.indexOf(a.slot) - KIND_ORDER.indexOf(b.slot) || area(b) - area(a) || b.rarity - a.rarity || a.name.localeCompare(b.name));
  const placed = [];
  for (const it of order) {
    const p = findSpot(box, it, placed);
    if (!p) { for (const [q, x, y] of was) { q.gx = x; q.gy = y; } chat('', 'Those will not pack any tighter.', 'warn'); return false; }
    it.gx = p.gx; it.gy = p.gy; placed.push(it);
  }
  sfx.click(); saveGame(); return true;
}
const area = it => { const s = itemSize(it); return s.w * s.h; };

// ---- Comparing ----------------------------------------------------------------------------------
// One number for how good an item is, to compare it with what you wear in the same slot
function itemScore(it) {
  if (!it) return 0;
  const a = { ...it.affixes }; for (const k in it.implicit || {}) a[k] = (a[k] || 0) + it.implicit[k];
  const rest = (a.hpFlat || 0) + (a.regen || 0) * 6 + (a.move || 0) * 200 + (a.potion || 0) * 40 + (a.skillDmg || 0) * 20 + (a.lifeHit || 0) * 1.5 + (a.crit || 0) * 150 + (a.atkSpeed || 0) * 60;
  if (it.slot === 'sword') return (it.min + it.max) / 2 * it.speed * (1 + (a.atkSpeed || 0)) * (1 + (a.crit || 0)) + (a.skillDmg || 0) * 20 + (a.lifeHit || 0) * 1.5;
  return (it.hp || 0) + (it.red || 0) * 400 + rest;
}
// Which slot an item would go in: its own, or for a ring an empty ring slot, else the weaker ring
function slotFor(it) {
  if (it.slot !== 'ring') return it.slot;
  const h = state.hero;
  if (!h.ring1) return 'ring1'; if (!h.ring2) return 'ring2';
  return itemScore(h.ring2) < itemScore(h.ring1) ? 'ring2' : 'ring1';
}

// ---- Moving things ------------------------------------------------------------------------------
function wear(key, it) { const h = state.hero, old = h[key]; h[key] = it || null; recalcHero(); return old || null; }

// Right click on a bag item (stash closed): wear it; what you wore goes where it was, or anywhere free
function wearFromBag(it) {
  const h = state.hero; if (!it || !h.bag.includes(it)) return false;
  const key = slotFor(it), at = { gx: it.gx, gy: it.gy };
  takeOut('bag', it);
  const old = h[key];
  if (old) {
    const { w, h: hh } = itemSize(old), { cols, rows } = boxSize('bag', true);
    const fits = at.gx + w <= cols && at.gy + hh <= rows && !collide(h.bag, at.gx, at.gy, w, hh).length;
    const p = fits ? at : findSpot('bag', old);
    if (!p) { it.gx = at.gx; it.gy = at.gy; h.bag.push(it); chat('', `No room in your bag for your ${old.name}.`, 'warn'); return false; }
    old.gx = p.gx; old.gy = p.gy; h.bag.push(old);
  }
  wear(key, it);
  sfx.click(); chat('', `Equipped ${it.name}.`, 'sys'); saveGame(); return true;
}
// Right click on a worn item: take it off into the bag. The sword stays: you always hold one.
function takeOff(key) {
  const h = state.hero, it = h[key]; if (!it) return false;
  if (key === 'sword') { chat('', 'You always hold a sword: put another one in its place to swap.', 'warn'); return false; }
  if (!putIn('bag', it)) { chat('', `No room in your bag for ${it.name}.`, 'warn'); return false; }
  wear(key, null); sfx.click(); saveGame(); return true;
}
// Right click with the stash open: send an item across to the other grid
function moveAcross(box, it) {
  const to = box === 'bag' ? 'stash' : 'bag';
  if (!hasRoom(to, it)) { chat('', to === 'stash' ? 'Your stash is full.' : `No room in your bag for ${it.name}.`, 'warn'); return false; }
  takeOut(box, it); putIn(to, it); sfx.click(); saveGame(); return true;
}

// Where the held item would land if put down with the cursor here: centred on the cursor, kept inside
// the grid; ok when it covers nothing or exactly one item (which it swaps for)
function dropTarget(box, mx, my) {
  const held = state.ui.held; if (!held) return null;
  const o = gridOrigin(box), { cols, rows } = boxSize(box, true), { w, h } = itemSize(held.item);
  const gx = Math.max(0, Math.min(cols - w, Math.round((mx - o.x) / CELL - w / 2)));
  const gy = Math.max(0, Math.min(rows - h, Math.round((my - o.y) / CELL - h / 2)));
  const under = collide(boxItems(box), gx, gy, w, h);
  return { box, gx, gy, w, h, ok: under.length <= 1 && rows >= h, swap: under.length === 1 ? under[0] : null };
}

// A left click in the inventory: pick up, put down, swap, wear, sort, or drop what you hold
function invClick(mx, my) {
  const s = state, h = s.hero, hit = invHit(mx, my), held = s.ui.held;
  if (!held) {
    if (!hit) return;
    if (hit.kind === 'sort') { sortBox(hit.box); return; }
    if (hit.kind === 'grid' && hit.item) { takeOut(hit.box, hit.item); s.ui.held = { item: hit.item, from: { box: hit.box, gx: hit.item.gx, gy: hit.item.gy } }; sfx.click(); return; }
    if (hit.kind === 'slot' && h[hit.key]) {
      if (hit.key === 'sword') { chat('', 'You always hold a sword: put another one in its place to swap.', 'warn'); return; }
      s.ui.held = { item: wear(hit.key, null), from: { slot: hit.key } }; sfx.click(); return;
    }
    return;
  }
  if (!hit) { dropHeld(); return; }
  if (hit.kind === 'grid') {
    const t = dropTarget(hit.box, mx, my);
    if (!t.ok) { sfx.click(); return; }
    if (t.swap) takeOut(hit.box, t.swap);
    held.item.gx = t.gx; held.item.gy = t.gy; boxItems(hit.box).push(held.item);
    s.ui.held = t.swap ? { item: t.swap, from: { box: hit.box, gx: t.swap.gx, gy: t.swap.gy } } : null;
    sfx.click(); if (!s.ui.held) saveGame(); return;
  }
  if (hit.kind === 'slot') {
    const kind = SLOTS[hit.key].kind;
    if (held.item.slot !== kind) { chat('', `${held.item.name} does not go there: it is ${aKind(held.item.slot)}.`, 'warn'); return; }
    const old = wear(hit.key, held.item);
    s.ui.held = old ? { item: old, from: { slot: hit.key } } : null;
    sfx.click(); chat('', `Equipped ${held.item.name}.`, 'sys'); if (!s.ui.held) saveGame();
  }
}
const aKind = k => { const n = KINDS[k].name.toLowerCase(); return (/^[aeiou]/.test(n) ? 'an ' : 'a ') + n; };

// A right click in the inventory: wear, take off, or with the stash open move an item across
function invRightClick(mx, my) {
  if (state.ui.held) return;
  const hit = invHit(mx, my); if (!hit) return;
  if (hit.kind === 'slot') takeOff(hit.key);
  else if (hit.kind === 'grid' && hit.item) {
    if (stashOpen()) moveAcross(hit.box, hit.item);
    else if (hit.box === 'bag') wearFromBag(hit.item);
  }
}

function dropHeld() {
  const s = state, h = s.hero, held = s.ui.held; if (!held) return;
  s.ui.held = null; delete held.item.gx; delete held.item.gy;
  placeItem(held.item, h.x + 1, h.z);
  sfx.click(); chat('', `Dropped ${held.item.name}.`, 'sys'); saveGame();
}
// Closing the window with an item in hand: it goes back where it came from, else on an empty slot of its
// kind, else into the bag, else the stash. It never lands on the ground (which the save does not keep):
// with nowhere to go it stays in hand and the window reopens.
function returnHeld() {
  const s = state, h = s.hero, held = s.ui.held; if (!held) return true;
  const it = held.item, f = held.from;
  s.ui.held = null;
  if (f.slot && !h[f.slot]) { wear(f.slot, it); saveGame(); return true; }
  if (f.box) {
    const { w, h: hh } = itemSize(it), { cols, rows } = boxSize(f.box, true);
    if (f.gx + w <= cols && f.gy + hh <= rows && !collide(boxItems(f.box), f.gx, f.gy, w, hh).length) { it.gx = f.gx; it.gy = f.gy; boxItems(f.box).push(it); saveGame(); return true; }
  }
  const free = SLOT_KEYS.find(k => SLOTS[k].kind === it.slot && !h[k]);
  if (free) { wear(free, it); chat('', `Equipped ${it.name}.`, 'sys'); saveGame(); return true; }
  if (putIn('bag', it)) { saveGame(); return true; }
  if (putIn('stash', it)) { chat('', `No room in your bag: ${it.name} went to your stash in Ashgate.`, 'warn'); saveGame(); return true; }
  s.ui.held = held; s.ui.panel = s.ui.panel === 'stash' ? 'stash' : 'inventory';
  chat('', `No room anywhere for ${it.name}: put it down or drop it first.`, 'warn');
  return false;
}

// Each step: an item in hand goes back once the window closes, and the stash shuts when you walk off or fall
function updateInventory() {
  const s = state, h = s.hero;
  if (s.ui.panel === 'stash' && (h.dead || Math.hypot(h.x - STASH.x, h.z - STASH.z) > 5)) s.ui.panel = h.dead ? null : 'inventory';
  if (s.ui.held && !invOpen()) returnHeld();
}
function openStash() { state.ui.panel = 'stash'; state.hero.target = null; sfx.click(); }

// ---- Picking loot up ----------------------------------------------------------------------------
function addToInventory(d) {
  const s = state, h = s.hero, it = d.item; if (!it) return;
  if (inHollow(h.x, h.z)) { s.drops.splice(s.drops.indexOf(d), 1); h.haul.items.push(it); chat('', `${it.name} goes into your haul. Leave the Hollow to keep it.`, 'warn'); sfx.click(); return; }
  if (!putIn('bag', it)) { chat('', `No room in your bag for ${it.name}. Press I to make room.`, 'warn'); return; }
  s.drops.splice(s.drops.indexOf(d), 1);
  sfx.click(); chat('', `${it.name} goes into your bag. Press I to wear it.`, 'sys'); saveGame();
}

export { SLOTS, SLOT_KEYS, worn, CELL, COLS, PAD, STASH_ROWS, LAYOUT, bagRowsShown, invHeight, stashHeight, slotRect, gridOrigin, sortRect, invHit,
  invOpen, stashOpen, boxItems, boxSize, findSpot, putIn, hasRoom, settle, sortBox, itemScore, slotFor, wearFromBag, takeOff, moveAcross,
  dropTarget, invClick, invRightClick, dropHeld, returnHeld, updateInventory, openStash, addToInventory };
