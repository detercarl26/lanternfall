// The save in this browser: saveGame, readSave, hasSave, clearSave, and loadGame, which puts the
// saved hero and party back into a fresh world.

import { emit, state } from './state.js';
import { SPAWN } from './world/floor1.js';
import { botStats } from './bots/roster.js';
import { packIndex } from './enemies/spawn.js';
import { recalcHero } from './hero/hero.js';
import { chat } from './chat.js';
import { placeNear, townSpot } from './world/grid.js';
import { settle } from './inventory.js';
import { placeItem } from './loot/drops.js';

const SAVE_KEY = 'lanternfall.floor1.v1';
function saveGame() {
  const s = state; if (!s || !s.hero) return;
  const h = s.hero;
  const data = { v: 1, level: h.level, xp: h.xp, gold: h.gold, sword: h.sword, armor: h.armor, deaths: s.deaths, kills: s.kills,
    playersAlive: s.playersAlive, fallen: s.fallen, quests: s.quests, firstDrop: s.flags.firstDrop, resultsShown: s.flags.resultsShown,
    doorStone: s.doorStone, wardenDown: s.wardenDown, runTime: s.runTime, nextId: s.nextId,
    bag: s.ui.held ? h.bag.concat({ ...s.ui.held.item, gx: -1, gy: -1 }) : h.bag, stash: h.stash, // an item in hand saves as in the bag
    helm: h.helm, amulet: h.amulet, ring1: h.ring1, ring2: h.ring2, gloves: h.gloves, belt: h.belt, boots: h.boots,
    bots: s.bots.map(b => ({ name: b.name, alive: b.alive, party: b.party, rescued: b.rescued, mode: b.mode === 'toTown' ? 'lfg' : b.mode, slot: b.slot })) };
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch (err) { emit({ type: 'saveFailed' }); }
}
function readSave() { try { const d = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); return d && d.v === 1 ? d : null; } catch (err) { return null; } }
function hasSave() { return !!readSave(); }
function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (err) { emit({ type: 'saveFailed' }); } }
function loadGame() {
  const d = readSave(); if (!d) return false;
  const s = state, h = s.hero;
  h.level = d.level; h.xp = d.xp; h.gold = d.gold; h.sword = d.sword; h.armor = d.armor;
  for (const k of ['helm', 'amulet', 'ring1', 'ring2', 'gloves', 'belt', 'boots']) h[k] = d[k] || null;
  // a save from before the grid has a bag with no cells: every item finds a spot, the bag first, then
  // the stash, and what fits nowhere waits on the ground where you wake
  const bag = settle('bag', d.bag || []), stash = settle('stash', (d.stash || []).concat(bag.rest));
  h.bag = bag.kept; h.stash = stash.kept;
  for (const it of stash.rest) { delete it.gx; delete it.gy; placeItem(it, SPAWN.x + 1, SPAWN.z); }
  s.deaths = d.deaths || 0; s.kills = d.kills || 0; s.playersAlive = d.playersAlive; s.fallen = d.fallen || [];
  s.quests = { ...s.quests, ...d.quests }; s.flags.firstDrop = !!d.firstDrop; s.flags.resultsShown = !!d.resultsShown;
  s.doorStone = !!d.doorStone; s.runTime = d.runTime || 0; s.nextId = Math.max(s.nextId, d.nextId || 0) + 10;
  for (const sb of d.bots || []) {
    const b = s.bots.find(q => q.name === sb.name); if (!b) continue;
    b.rescued = !!sb.rescued;
    if (!sb.alive) { b.alive = false; b.deadT = 99; b.party = false; continue; }
    if (sb.party) { b.party = true; b.mode = 'party'; b.slot = sb.slot >= 0 ? sb.slot : 0; placeNear(b, SPAWN.x, SPAWN.z); }
    else if (b.packId && sb.mode !== 'rescue') { b.mode = 'lfg'; b.home = townSpot(); b.x = b.px = b.home.x; b.z = b.pz = b.home.z; }
    else if (sb.mode === 'lfg' || sb.mode === 'town') b.mode = sb.mode;
  }
  for (const b of s.bots) if (b.packId && b.mode !== 'rescue') { const pi = packIndex(b.packId); for (const e of s.enemies) if (e.pack === pi && e.state === 'standoff') e.state = 'idle'; }
  if (d.wardenDown) { s.wardenDown = true; s.stairsOpen = true; if (s.boss) { s.boss.dead = true; s.boss.deadT = 99; } }
  recalcHero(); h.hp = h.maxHp;
  for (const b of s.bots) if (b.alive) botStats(b, true);
  s.chat = []; chat('', `Welcome back. Level ${h.level}, ${h.gold} gold.`, 'sys');
  return true;
}

export { saveGame, readSave, hasSave, clearSave, loadGame };
