// The inventory: items covering cells in a grid bag, picking loot up, a full bag, the Red Hollow's
// haul, holding an item to move, swap or wear it, right-click shortcuts, the stash, sorting, every
// kind of item rolling and counting toward your stats, the windows fitting the screen, and the save.
import { describe, it, expect, beforeEach } from 'vitest';
import { CONFIG } from '../../src/config.js';
import { setSeed } from '../../src/math.js';
import { setState, newState, state } from '../../src/game/state.js';
import { placeItem } from '../../src/game/loot/drops.js';
import { populateWorld } from '../../src/game/world/populate.js';
import { KINDS, makeItem, rollKind, itemSize } from '../../src/game/loot/items.js';
import { recalcHero } from '../../src/game/hero/hero.js';
import { SLOT_KEYS, CELL, COLS, STASH_ROWS, slotRect, gridOrigin, sortRect, invHeight, stashHeight, LAYOUT, invHit, putIn, sortBox,
  wearFromBag, takeOff, moveAcross, invClick, invRightClick, returnHeld, updateInventory, addToInventory } from '../../src/game/inventory.js';
import { saveGame, loadGame } from '../../src/game/save.js';
import { HOLLOW, STASH } from '../../src/game/world/floor1.js';

const sword = (n, base = 'Shortsword', rarity = 1) => ({ id: 'test' + n, slot: 'sword', name: 'Test Blade ' + n, base, rarity, ilvl: 2, min: 6 + n, max: 10 + n, speed: 1.1, len: 0.9, affixes: {} });
const piece = (slot, n, o = {}) => ({ id: slot + n, slot, name: `Test ${slot} ${n}`, base: 'Test', rarity: 0, ilvl: 1, hp: 5, red: 0.01, affixes: {}, ...o });
const ring = (n, o = {}) => ({ id: 'ring' + n, slot: 'ring', name: 'Test Ring ' + n, base: 'Iron Ring', rarity: 1, ilvl: 1, implicit: { hpFlat: 3 }, affixes: {}, ...o });
// a ground drop next to the hero, the way loot lies after a kill
function dropNearHero(item) { const h = state.hero; placeItem(item, h.x + 0.5, h.z); return state.drops[state.drops.length - 1]; }
// the screen point at the middle of a bag or stash cell
const cellPt = (box, gx, gy) => { const o = gridOrigin(box); return [o.x + (gx + 0.5) * CELL, o.y + (gy + 0.5) * CELL]; };
const mid = r => [r.x + r.w / 2, r.y + r.h / 2];
const at = (box, gx, gy) => (box === 'bag' ? state.hero.bag : state.hero.stash).find(it => it.gx === gx && it.gy === gy);
const lastChat = () => state.chat[state.chat.length - 1].text;

// localStorage stands in for the browser's, so the save can be read back
const store = new Map();
globalThis.localStorage = { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) };

beforeEach(() => {
  store.clear();
  setSeed(CONFIG.seed);
  setState(newState());
  populateWorld();
});

describe('item sizes and kinds', () => {
  it('a sword is one cell wide and three or four tall; a greatblade is two wide', () => {
    expect(itemSize(sword(1, 'Shortsword'))).toEqual({ w: 1, h: 3 });
    expect(itemSize(sword(1, 'Longsword'))).toEqual({ w: 1, h: 4 });
    expect(itemSize(sword(1, 'Greatblade'))).toEqual({ w: 2, h: 4 });
    expect(itemSize(piece('armor', 1))).toEqual({ w: 2, h: 3 });
    expect(itemSize(ring(1))).toEqual({ w: 1, h: 1 });
  });
  it('every kind can roll at every rarity, with a name, a base and a size', () => {
    setSeed(7);
    for (const kind of Object.keys(KINDS)) for (let r = 0; r < 4; r++) for (let ilvl = 1; ilvl <= 8; ilvl += 3) {
      const it = makeItem(kind, ilvl, r);
      expect(it.slot).toBe(kind);
      expect(it.name && it.base).toBeTruthy();
      expect(itemSize(it).w).toBeGreaterThan(0);
    }
  });
  it('drops roll every kind', () => {
    setSeed(3);
    const seen = new Set(); for (let i = 0; i < 400; i++) seen.add(rollKind());
    expect([...seen].sort()).toEqual(Object.keys(KINDS).sort());
  });
});

describe('picking loot up', () => {
  it('puts the item in the first free spot and takes it off the ground', () => {
    const d = dropNearHero(sword(1));
    addToInventory(d);
    expect(state.hero.bag.map(i => [i.name, i.gx, i.gy])).toEqual([['Test Blade 1', 0, 0]]);
    expect(state.drops).not.toContain(d);
    expect(state.hero.sword.name).not.toBe('Test Blade 1'); // picking up does not wear it
  });
  it('fills down a column before moving right', () => {
    for (let i = 0; i < 5; i++) addToInventory(dropNearHero(ring(i)));
    expect(state.hero.bag.map(i => [i.gx, i.gy])).toEqual([[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]]);
    addToInventory(dropNearHero(ring(9)));
    expect(at('bag', 1, 0).name).toBe('Test Ring 9');
  });
  it('a bag with no room for the item refuses it and leaves it on the ground', () => {
    // swords fill every column three rows deep, so a 2x2 helm fits nowhere though rings still would
    for (let x = 0; x < COLS; x++) state.hero.bag.push({ ...sword(x), gx: x, gy: 0 });
    const d = dropNearHero(piece('helm', 1));
    CONFIG.bagRows.value = 4;
    try { addToInventory(d); } finally { CONFIG.bagRows.value = 5; }
    expect(state.drops).toContain(d);
    expect(lastChat()).toMatch(/No room in your bag/);
    addToInventory(dropNearHero(ring(1)));
    expect(state.hero.bag.length).toBe(COLS + 1);
  });
  it('in the Red Hollow it goes into the haul instead', () => {
    const h = state.hero;
    h.x = h.px = (HOLLOW.x0 + HOLLOW.x1) / 2; h.z = h.pz = (HOLLOW.z0 + HOLLOW.z1) / 2;
    addToInventory(dropNearHero(sword(1)));
    expect(h.haul.items.map(i => i.name)).toEqual(['Test Blade 1']);
    expect(h.bag).toEqual([]);
  });
});

describe('moving things by hand', () => {
  beforeEach(() => { state.ui.panel = 'inventory'; });
  it('click picks an item up, click elsewhere puts it down', () => {
    putIn('bag', sword(1));
    invClick(...cellPt('bag', 0, 1));
    expect(state.ui.held.item.name).toBe('Test Blade 1');
    expect(state.hero.bag).toEqual([]);
    invClick(...cellPt('bag', 5, 2));     // centred on the cursor: a 1x3 sword's middle cell lands there
    expect(state.ui.held).toBe(null);
    expect(at('bag', 5, 1).name).toBe('Test Blade 1');
  });
  it('putting an item over exactly one other swaps them; over two, nothing happens', () => {
    const a = sword(1), b = ring(2), c = ring(3);
    Object.assign(a, { gx: 0, gy: 0 }); Object.assign(b, { gx: 3, gy: 0 }); Object.assign(c, { gx: 3, gy: 2 });
    state.hero.bag.push(a, b, c);
    invClick(...cellPt('bag', 0, 0));
    invClick(...cellPt('bag', 3, 1));     // covers rows 0-2 of column 3: both rings, so it will not go
    expect(state.ui.held.item).toBe(a);
    invClick(...cellPt('bag', 3, 0));     // clamped to the top: rows 0-2 still cover both rings
    expect(state.ui.held.item).toBe(a);
    invClick(...cellPt('bag', 4, 1));     // free column: goes down
    expect(state.ui.held).toBe(null);
    invClick(...cellPt('bag', 2, 0)); expect(state.ui.held).toBe(null); // an empty cell does nothing
    invClick(...cellPt('bag', 3, 0));     // pick the first ring up and drop it on the sword: a swap
    invClick(...cellPt('bag', 4, 1));
    expect(state.ui.held.item).toBe(a);
    expect(at('bag', 4, 1)).toBe(b);
  });
  it('putting an item on its slot wears it, and what you wore is now in hand', () => {
    const old = state.hero.sword;
    putIn('bag', sword(1));
    invClick(...cellPt('bag', 0, 0));
    invClick(...mid(slotRect('sword')));
    expect(state.hero.sword.name).toBe('Test Blade 1');
    expect(state.ui.held.item).toBe(old);
  });
  it('an item will not go in the wrong slot', () => {
    putIn('bag', ring(1));
    invClick(...cellPt('bag', 0, 0));
    invClick(...mid(slotRect('helm')));
    expect(state.hero.helm).toBe(null);
    expect(state.ui.held.item.name).toBe('Test Ring 1');
    invClick(...mid(slotRect('ring2')));
    expect(state.hero.ring2.name).toBe('Test Ring 1');
    expect(state.ui.held).toBe(null);
  });
  it('you can take gear off by hand, but never your sword', () => {
    state.hero.helm = piece('helm', 1); recalcHero();
    invClick(...mid(slotRect('helm')));
    expect(state.ui.held.item.name).toBe('Test helm 1');
    expect(state.hero.helm).toBe(null);
    returnHeld();
    invClick(...mid(slotRect('sword')));
    expect(state.ui.held).toBe(null);
    expect(state.hero.sword).toBeTruthy();
  });
  it('clicking outside the window drops what you hold on the ground', () => {
    putIn('bag', sword(1));
    invClick(...cellPt('bag', 0, 0));
    invClick(400, 360);
    expect(state.ui.held).toBe(null);
    expect(state.drops.some(d => d.item && d.item.name === 'Test Blade 1')).toBe(true);
    expect(lastChat()).toBe('Dropped Test Blade 1.');
  });
  // a full bag of rings around one coat: dropping a ring on the coat swaps them, and the coat's 2x3 no longer fits
  function swapIntoFullBag() {
    const h = state.hero; h.bag.push({ ...piece('armor', 1), gx: 0, gy: 0 });
    for (let x = 0; x < COLS; x++) for (let y = 0; y < 5; y++) if (x > 1 || y > 2) h.bag.push({ ...ring(x * 10 + y), gx: x, gy: y });
    invClick(...cellPt('bag', 5, 0)); invClick(...cellPt('bag', 0, 0));
    expect(state.ui.held.item.name).toBe('Test armor 1');
  }
  it('closing after a swap with a full bag sends the item to the stash, never the ground', () => {
    swapIntoFullBag();
    state.ui.panel = null; updateInventory();
    expect(state.ui.held).toBe(null);
    expect(state.hero.stash.map(i => i.name)).toEqual(['Test armor 1']);
    expect(state.drops.some(d => d.item && d.item.name === 'Test armor 1')).toBe(false);
  });
  it('with no room anywhere, the item stays in hand and the window reopens', () => {
    for (let x = 0; x < COLS; x++) for (let y = 0; y < STASH_ROWS; y++) state.hero.stash.push({ ...ring(1000 + x * 100 + y), gx: x, gy: y });
    swapIntoFullBag();
    state.ui.panel = null; updateInventory();
    expect(state.ui.held.item.name).toBe('Test armor 1');
    expect(state.ui.panel).toBe('inventory');
    expect(state.drops.some(d => d.item && d.item.name === 'Test armor 1')).toBe(false);
  });
  it('a worn item taken off goes back on an empty slot of its kind', () => {
    state.hero.ring1 = ring(1); recalcHero();
    invClick(...mid(slotRect('ring1')));
    state.ui.held.from = { slot: 'ring2' }; state.hero.ring2 = ring(2);  // its own slot is taken meanwhile
    state.ui.panel = null; updateInventory();
    expect(state.hero.ring1.name).toBe('Test Ring 1');
  });
  it('closing the window puts what you hold back where it was', () => {
    putIn('bag', sword(1)); putIn('bag', ring(2));
    invClick(...cellPt('bag', 0, 0));
    state.ui.panel = null; updateInventory();
    expect(state.ui.held).toBe(null);
    expect(at('bag', 0, 0).name).toBe('Test Blade 1');
  });
});

describe('right click', () => {
  beforeEach(() => { state.ui.panel = 'inventory'; });
  it('wears a bag item; what you wore takes its place in the bag', () => {
    const old = state.hero.sword;
    putIn('bag', ring(0)); putIn('bag', sword(1));
    invRightClick(...cellPt('bag', 0, 2));
    expect(state.hero.sword.name).toBe('Test Blade 1');
    expect(at('bag', 0, 1)).toBe(old);
  });
  it('a ring goes to an empty ring slot first, then replaces the weaker one', () => {
    for (let i = 1; i <= 3; i++) putIn('bag', ring(i, { implicit: { hpFlat: i * 10 } }));
    wearFromBag(state.hero.bag[0]); wearFromBag(state.hero.bag[0]);
    expect([state.hero.ring1.name, state.hero.ring2.name]).toEqual(['Test Ring 1', 'Test Ring 2']);
    wearFromBag(state.hero.bag[0]);
    expect([state.hero.ring1.name, state.hero.ring2.name]).toEqual(['Test Ring 3', 'Test Ring 2']);
  });
  it('takes worn gear off into the bag, but not the sword', () => {
    state.hero.boots = piece('boots', 1); recalcHero();
    invRightClick(...mid(slotRect('boots')));
    expect(state.hero.boots).toBe(null);
    expect(state.hero.bag[0].name).toBe('Test boots 1');
    expect(takeOff('sword')).toBe(false);
  });
  it('with the stash open, moves items between the bag and the stash', () => {
    state.ui.panel = 'stash';
    putIn('bag', sword(1));
    invRightClick(...cellPt('bag', 0, 0));
    expect(state.hero.bag).toEqual([]);
    expect(state.hero.stash.map(i => i.name)).toEqual(['Test Blade 1']);
    invRightClick(...cellPt('stash', 0, 0));
    expect(state.hero.bag.map(i => i.name)).toEqual(['Test Blade 1']);
  });
});

describe('the stash', () => {
  it('opens at the strongbox and shuts when you walk away', () => {
    const h = state.hero;
    h.x = STASH.x; h.z = STASH.z - 1.2; state.ui.panel = 'stash';
    updateInventory(); expect(state.ui.panel).toBe('stash');
    h.x += 8; updateInventory(); expect(state.ui.panel).toBe('inventory');
  });
  it('a full stash refuses more', () => {
    for (let x = 0; x < COLS; x++) for (let y = 0; y < STASH_ROWS; y++) state.hero.stash.push({ ...ring(x * 100 + y), gx: x, gy: y });
    putIn('bag', ring(999));
    expect(moveAcross('bag', state.hero.bag[0])).toBe(false);
    expect(lastChat()).toBe('Your stash is full.');
  });
});

describe('sorting', () => {
  it('packs the bag tight, kinds together, bigger first', () => {
    const h = state.hero;
    h.bag.push({ ...ring(1), gx: 11, gy: 4 }, { ...sword(2), gx: 6, gy: 1 }, { ...piece('armor', 3), gx: 9, gy: 0 }, { ...sword(4, 'Greatblade'), gx: 3, gy: 1 });
    expect(sortBox('bag')).toBe(true);
    expect(h.bag.map(i => [i.name, i.gx, i.gy]).sort()).toEqual([
      ['Test Blade 2', 2, 0], ['Test Blade 4', 0, 0], ['Test Ring 1', 0, 4], ['Test armor 3', 3, 0]]);
  });
});

describe('stats from every slot', () => {
  it('helm, gloves, boots, belt, rings and amulet all count', () => {
    const h = state.hero; recalcHero();
    const hp0 = h.maxHp, red0 = h.red, crit0 = h.crit;
    h.helm = piece('helm', 1, { hp: 10, red: 0.02 }); h.boots = piece('boots', 1, { hp: 4, red: 0, affixes: { move: 0.05 } });
    h.ring1 = ring(1, { implicit: { hpFlat: 6 } }); h.amulet = { ...ring(2), slot: 'amulet', implicit: { crit: 0.03 } };
    recalcHero();
    expect(h.maxHp).toBe(hp0 + 10 + 4 + 6);
    expect(h.red).toBeCloseTo(red0 + 0.02);
    expect(h.crit).toBeCloseTo(crit0 + 0.03);
    expect(h.moveMult).toBeCloseTo(1.05);
  });
  it('no body armour is fine', () => {
    state.hero.armor = null; recalcHero();
    expect(state.hero.red).toBe(0);
  });
});

describe('the windows on screen', () => {
  it('fit the 720-px screen at the largest bag, and the stash beside it', () => {
    const was = CONFIG.bagRows.value; CONFIG.bagRows.value = CONFIG.bagRows.max;
    try { expect(LAYOUT.inv.y + invHeight()).toBeLessThanOrEqual(720); } finally { CONFIG.bagRows.value = was; }
    expect(LAYOUT.stash.y + stashHeight()).toBeLessThanOrEqual(720);
    expect(LAYOUT.inv.x + LAYOUT.inv.w).toBeLessThanOrEqual(1280);
    expect(LAYOUT.stash.x + LAYOUT.stash.w).toBeLessThan(LAYOUT.inv.x);
  });
  it('no two slots overlap, and none overlaps the bag', () => {
    const rs = SLOT_KEYS.map(k => [k, slotRect(k)]), bagTop = gridOrigin('bag').y;
    for (let i = 0; i < rs.length; i++) {
      expect(rs[i][1].y + rs[i][1].h, rs[i][0]).toBeLessThan(sortRect('bag').y);
      expect(rs[i][1].y + rs[i][1].h).toBeLessThan(bagTop);
      for (let j = i + 1; j < rs.length; j++) {
        const a = rs[i][1], b = rs[j][1];
        expect(a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y, `${rs[i][0]} and ${rs[j][0]}`).toBe(false);
      }
    }
  });
  it('finds what is under the cursor', () => {
    state.ui.panel = 'inventory';
    expect(invHit(...mid(slotRect('helm')))).toEqual({ kind: 'slot', key: 'helm' });
    expect(invHit(...cellPt('bag', 3, 2))).toMatchObject({ kind: 'grid', box: 'bag', gx: 3, gy: 2, item: null });
    expect(invHit(...mid(sortRect('bag')))).toEqual({ kind: 'sort', box: 'bag' });
    expect(invHit(5, 700)).toBe(null);
  });
  it('a lowered bag size still shows every item', () => {
    state.hero.bag.push({ ...ring(1), gx: 0, gy: 5 });
    const was = CONFIG.bagRows.value; CONFIG.bagRows.value = CONFIG.bagRows.min;
    try { state.ui.panel = 'inventory'; expect(invHit(...cellPt('bag', 0, 5)).item.name).toBe('Test Ring 1'); } finally { CONFIG.bagRows.value = was; }
  });
});

describe('the save', () => {
  it('the bag, the stash and every worn slot survive a save and reload, in their cells', () => {
    const h = state.hero;
    h.bag.push({ ...sword(1, 'Sabre', 2), gx: 4, gy: 1 }); h.stash.push({ ...ring(2), gx: 7, gy: 6 });
    h.helm = piece('helm', 1); h.ring2 = ring(3);
    saveGame();
    setState(newState()); populateWorld();
    expect(state.hero.bag).toEqual([]);
    expect(loadGame()).toBe(true);
    expect(state.hero.bag.map(i => [i.name, i.gx, i.gy])).toEqual([['Test Blade 1', 4, 1]]);
    expect(state.hero.stash.map(i => [i.name, i.gx, i.gy])).toEqual([['Test Ring 2', 7, 6]]);
    expect(state.hero.helm.name).toBe('Test helm 1');
    expect(state.hero.ring2.name).toBe('Test Ring 3');
  });
  it('an item held on the cursor is saved in the bag', () => {
    state.ui.panel = 'inventory';
    putIn('bag', sword(1));
    invClick(...cellPt('bag', 0, 0));
    saveGame();
    setState(newState()); populateWorld(); loadGame();
    expect(state.hero.bag.map(i => i.name)).toEqual(['Test Blade 1']);
  });
  it('a save from before the grid finds every item a spot', () => {
    const items = [sword(1), sword(2), { ...piece('armor', 1) }];
    store.set('lanternfall.floor1.v1', JSON.stringify({ v: 1, level: 3, xp: 0, gold: 5, sword: sword(0), armor: piece('armor', 0), bag: items, quests: {}, bots: [] }));
    expect(loadGame()).toBe(true);
    const h = state.hero;
    expect(h.bag.length).toBe(3);
    expect(h.bag.every(it => Number.isInteger(it.gx) && Number.isInteger(it.gy))).toBe(true);
    expect(h.helm).toBe(null);
  });
});
