// The bag: picking loot up, a full bag, the Red Hollow's haul, wearing and dropping, the slots
// on screen, and the bag surviving a save and reload.
import { describe, it, expect, beforeEach } from 'vitest';
import { CONFIG, tune } from '../../src/config.js';
import { setSeed } from '../../src/math.js';
import { setState, newState, state } from '../../src/game/state.js';
import { placeItem } from '../../src/game/loot/drops.js';
import { populateWorld } from '../../src/game/world/populate.js';
import { addToInventory, equipFromBag, dropFromBag, bagSlotAt, bagSlotRect, bagSlots } from '../../src/game/inventory.js';
import { saveGame, loadGame } from '../../src/game/save.js';
import { HOLLOW } from '../../src/game/world/floor1.js';

const sword = (n, rarity = 1) => ({ id: 'test' + n, slot: 'sword', name: 'Test Blade ' + n, base: 'Shortsword', rarity, ilvl: 2, min: 6, max: 10, speed: 1.1, len: 0.9, affixes: {} });
// a ground drop next to the hero, the way loot lies after a kill
function dropNearHero(item) { const h = state.hero; placeItem(item, h.x + 0.5, h.z); return state.drops[state.drops.length - 1]; }

// localStorage stands in for the browser's, so the save can be read back
const store = new Map();
globalThis.localStorage = { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) };

beforeEach(() => {
  store.clear();
  setSeed(CONFIG.seed);
  setState(newState());
  populateWorld();
});

describe('picking loot up', () => {
  it('puts the item in the bag and takes it off the ground', () => {
    const d = dropNearHero(sword(1));
    addToInventory(d);
    expect(state.hero.bag.map(i => i.name)).toEqual(['Test Blade 1']);
    expect(state.drops).not.toContain(d);
    expect(state.hero.sword.name).not.toBe('Test Blade 1'); // picking up does not wear it
  });
  it('a full bag refuses the item and leaves it on the ground', () => {
    state.hero.bag = Array.from({ length: tune.bagSize }, (_, i) => sword(100 + i));
    const d = dropNearHero(sword(1));
    addToInventory(d);
    expect(state.hero.bag.length).toBe(tune.bagSize);
    expect(state.drops).toContain(d);
  });
  it('in the Red Hollow it goes into the haul instead', () => {
    const h = state.hero;
    h.x = h.px = (HOLLOW.x0 + HOLLOW.x1) / 2; h.z = h.pz = (HOLLOW.z0 + HOLLOW.z1) / 2;
    addToInventory(dropNearHero(sword(1)));
    expect(h.haul.items.map(i => i.name)).toEqual(['Test Blade 1']);
    expect(h.bag).toEqual([]);
  });
});

describe('wearing and dropping', () => {
  it('wearing swaps the item with what you wore', () => {
    const old = state.hero.sword;
    state.hero.bag = [sword(1)];
    equipFromBag(0);
    expect(state.hero.sword.name).toBe('Test Blade 1');
    expect(state.hero.bag[0]).toBe(old);
  });
  it('dropping takes it out of the bag and puts it on the ground', () => {
    state.hero.bag = [sword(1), sword(2)];
    dropFromBag(0);
    expect(state.hero.bag.map(i => i.name)).toEqual(['Test Blade 2']);
    expect(state.drops.some(d => d.item && d.item.name === 'Test Blade 1')).toBe(true);
    expect(state.chat[state.chat.length - 1].text).toBe('Dropped Test Blade 1.');
  });
  it('an empty slot does nothing', () => {
    const before = state.hero.sword;
    equipFromBag(5); dropFromBag(5);
    expect(state.hero.sword).toBe(before);
  });
});

describe('slots on screen', () => {
  it('finds the slot under a point, and none outside', () => {
    const r = bagSlotRect(3);
    expect(bagSlotAt(r.x + r.w / 2, r.y + r.h / 2)).toBe(3);
    expect(bagSlotAt(0, 0)).toBe(-1);
  });
  it('the largest bag still fits on the 720-px screen', () => {
    const r = bagSlotRect(CONFIG.bagSize.max - 1);
    expect(r.y + r.h).toBeLessThanOrEqual(720);
  });
  it('a lowered bag size still shows every item', () => {
    state.hero.bag = Array.from({ length: 8 }, (_, i) => sword(i));
    const was = CONFIG.bagSize.value; CONFIG.bagSize.value = 4;
    try { expect(bagSlots()).toBe(8); } finally { CONFIG.bagSize.value = was; }
  });
});

describe('the save', () => {
  it('the bag survives a save and reload', () => {
    state.hero.bag = [sword(1, 2), sword(2, 3)];
    saveGame();
    setState(newState()); populateWorld();
    expect(state.hero.bag).toEqual([]);
    expect(loadGame()).toBe(true);
    expect(state.hero.bag.map(i => i.name)).toEqual(['Test Blade 1', 'Test Blade 2']);
  });
});
