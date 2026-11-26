// Rules that need no browser: the seeded rng, the XP curve, item rolls and the walkable grid.
// Values come from src/config.js, so a retune does not break a test that was never about the number.
import { describe, it, expect } from 'vitest';
import { rng, setSeed, makeRng } from '../../src/math.js';
import { CONFIG } from '../../src/config.js';
import { xpNeed } from '../../src/game/hero/level.js';
import { makeItem } from '../../src/game/loot/items.js';
import { setState, newState } from '../../src/game/state.js';
import { inHollow, isSolid, circleFree } from '../../src/game/world/grid.js';
import { SPAWN, HOLLOW } from '../../src/game/world/floor1.js';

describe('rng', () => {
  it('repeats the same sequence for the same seed', () => {
    setSeed(1); const a = [rng(), rng(), rng()];
    setSeed(1); const b = [rng(), rng(), rng()];
    expect(b).toEqual(a);
  });
  it('gives numbers in [0, 1)', () => {
    setSeed(7);
    for (let i = 0; i < 1000; i++) { const x = rng(); expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThan(1); }
  });
  it('a different seed gives a different sequence', () => {
    setSeed(1); const a = rng(); setSeed(2); expect(rng()).not.toBe(a);
  });
  it('a decoration stream (makeRng) never moves the gameplay rng', () => {
    setSeed(5); const expected = rng();
    setSeed(5); const deco = makeRng(99); deco(); deco(); deco();
    expect(rng()).toBe(expected);
  });
});

describe('XP curve', () => {
  it('follows xpBase x level^xpGrowth', () => {
    for (const L of [1, 2, 5]) expect(xpNeed(L)).toBe(Math.round(CONFIG.xpBase.value * Math.pow(L, CONFIG.xpGrowth.value)));
  });
  it('each level needs more than the last', () => {
    for (let L = 1; L < 20; L++) expect(xpNeed(L + 1)).toBeGreaterThan(xpNeed(L));
  });
});

describe('items', () => {
  const fresh = () => setState(newState());
  it('a sword roll has a slot, a rarity and a damage range', () => {
    fresh(); setSeed(3);
    const it = makeItem('sword', 2, 1);
    expect(it.slot).toBe('sword');
    expect(it.rarity).toBe(1);
    expect(it.min).toBeLessThanOrEqual(it.max);
    expect(typeof it.name).toBe('string');
  });
  it('the same seed rolls the same item', () => {
    fresh(); setSeed(11); const a = makeItem('armor', 3, 2);
    fresh(); setSeed(11); const b = makeItem('armor', 3, 2);
    expect(b).toEqual(a);
  });
});

describe('walkable grid', () => {
  it('the spawn point is open ground', () => {
    expect(isSolid(SPAWN.x, SPAWN.z)).toBe(false);
    expect(circleFree(SPAWN.x, SPAWN.z, 0.5)).toBe(true);
  });
  it('knows where the Red Hollow is', () => {
    expect(inHollow((HOLLOW.x0 + HOLLOW.x1) / 2, (HOLLOW.z0 + HOLLOW.z1) / 2)).toBe(true);
    expect(inHollow(SPAWN.x, SPAWN.z)).toBe(false);
  });
});
