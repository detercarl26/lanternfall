// Labels in the 3D world: names, loot, click hints and damage numbers.

import { tune } from '../config.js';
import { C, bar, wlabel } from './kit.js';
import { NUMS } from '../game/state.js';
import { partyCount } from '../game/bots/roster.js';
import { RCOL } from '../game/loot/items.js';
import { inHollow } from '../game/world/grid.js';
import * as VIEW from '../render/view.js';

const HOVER_Y = { item: 0.8, cache: 1.1, board: 3.0, crystal: 3.2, doorstone: 2.6, bot: 2.7 };
function hoverText(s, hov) {
  const inH = inHollow(s.hero.x, s.hero.z);
  if (hov.type === 'item') return inH ? 'Click to take it into your haul' : 'Click to equip';
  if (hov.type === 'cache') return 'Click to open the cache';
  if (hov.type === 'board') return 'Click to read the quest board';
  if (hov.type === 'crystal') return s.doorStone ? "Click to travel to the Warden's door" : 'The Waystone of Ashgate';
  if (hov.type === 'doorstone') return 'Click to travel back to Ashgate';
  const b = s.bots.find(q => q.id === hov.id);
  return partyCount() < tune.partySize ? `Click to invite ${b ? b.name : 'them'} to your raid party` : 'Your raid party is full';
}
function worldLabels(s) {
  const h = s.hero, hov = s.ui.hover;
  if (hov) { const p = VIEW.toScreen(hov.x, HOVER_Y[hov.type] || 1, hov.z); if (p.on) wlabel(hoverText(s, hov), p.x, p.y - 26, 15, C.gold, { weight: '600' }); }
  for (const b of s.bots) {
    if (!b.alive || Math.hypot(b.x - h.x, b.z - h.z) > 26) continue;
    const p = VIEW.toScreen(b.x, 2.35, b.z); if (!p.on) continue;
    const col = b.party ? C.teal : b.trouble ? '#ffcf8a' : b.mode === 'lfg' ? C.gold : C.text;
    const lb = wlabel(`${b.name} [BOT]${b.mode === 'lfg' ? ' · LFG' : ''}${b.trouble ? ' · needs help' : ''}`, p.x, p.y, 14, col);
    if (lb && (b.party || b.trouble || b.hp < b.maxHp)) bar(p.x - 28, lb.y1 + 2, 56, 5, b.hp / b.maxHp, b.party ? '#3fbf9f' : '#d0a050');
  }
  for (const e of s.enemies) {
    if (e.dead || e.kind === 'warden' || Math.hypot(e.x - h.x, e.z - h.z) > 30) continue;
    const top = e.kind === 'brute' ? 2.9 : e.kind === 'rogue' ? 2.35 : e.kind === 'spitter' ? 1.9 : 1.5;
    const p = VIEW.toScreen(e.x, top, e.z); if (!p.on) continue;
    if (e.kind === 'rogue') {
      const lb = wlabel(`${e.name} [BOT] · rogue`, p.x, p.y, 14, '#ff7a6a');
      if (lb) bar(p.x - 28, lb.y1 + 2, 56, 5, e.hp / e.maxHp, '#d0402a');
    } else if (e.hp < e.maxHp) bar(p.x - 24, p.y, 48, 5, e.hp / e.maxHp, '#c0392b');
  }
  const drops = s.drops.filter(d => d.settled && d.type !== 'gold' && Math.hypot(d.x - h.x, d.z - h.z) < 20)
    .sort((a, b) => (b.item ? b.item.rarity : 2) - (a.item ? a.item.rarity : 2));
  for (const d of drops) {
    const p = VIEW.toScreen(d.x, 0.6, d.z); if (!p.on) continue;
    if (d.type === 'cache') wlabel(d.name === 'your haul' ? 'Your dropped haul' : `${d.name}'s cache`, p.x, p.y, 14, '#ff9a8a');
    else wlabel(d.item.name, p.x, p.y, 14, RCOL[d.item.rarity], { weight: d.item.rarity >= 2 ? '600' : '' });
  }
}
function damageNumbers(s) {
  for (let i = NUMS.length - 1; i >= 0; i--) {
    const n = NUMS[i], age = s.t - n.t0;
    if (age > 0.9 || age < 0) { NUMS.splice(i, 1); continue; }
    const p = VIEW.toScreen(n.x, n.y + age * 1.6, n.z); if (!p.on) continue;
    const size = n.hurt ? 16 : n.crit ? 22 : n.multi ? 20 : 17;
    const col = n.hurt ? '#ff7060' : n.crit ? '#ffd84a' : n.multi ? C.cyan : '#f4efe4';
    wlabel(`${Math.round(n.v)}`, p.x, p.y, size, col, { weight: '700', bg: 'rgba(8,9,12,0.6)' });
  }
}

export { worldLabels, damageNumbers };
