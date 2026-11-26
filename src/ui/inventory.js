// The inventory window (I) and the compare tooltip over loot on the ground.

import { tune } from '../config.js';
import { W, H } from '../platform/page.js';
import { SERIF, text, measure, C, rr, tri, icon } from './kit.js';
import { mouse } from '../platform/input.js';
import { RARITY, RCOL, AFFIX_TEXT } from '../game/loot/items.js';
import { BAG, bagSlotRect, bagSlotAt, bagSlots } from '../game/inventory.js';
import { lootHint } from './labels.js';

function inventoryPanel(s) {
  const h = s.hero, n = bagSlots(), w = 48 + BAG.cols * (BAG.size + BAG.gap) - BAG.gap;
  const hgt = 130 + Math.ceil(n / BAG.cols) * (BAG.size + BAG.gap) + 40;
  rr(BAG.x, BAG.y, w, hgt, 10, 'rgba(14,12,10,0.95)', '#a08a5a');
  text('Inventory', BAG.x + w / 2, BAG.y + 30, 24, C.gold, 'center', '600', SERIF);
  text(`${h.bag.length}/${tune.bagSize}`, BAG.x + w - 24, BAG.y + 30, 14, C.dim, 'right');
  text(`Sword: ${h.sword.name}`, BAG.x + 24, BAG.y + 70, 15, RCOL[h.sword.rarity], 'left', '600');
  text(`Coat: ${h.armor.name}`, BAG.x + 24, BAG.y + 96, 15, RCOL[h.armor.rarity], 'left', '600');
  for (let i = 0; i < n; i++) {
    const r = bagSlotRect(i), it = h.bag[i];
    rr(r.x, r.y, r.w, r.h, 6, 'rgba(30,28,26,0.9)', it ? RCOL[it.rarity] : C.edge);
    if (it) icon(it.slot === 'sword' ? 'swing' : 'coat', r.x + r.w / 2, r.y + r.h / 2, 1);
  }
  text('Left click: wear it    Right click: drop it    I or Esc: close', BAG.x + w / 2, BAG.y + hgt - 22, 14, C.dim);
  const at = bagSlotAt(mouse.x, mouse.y);
  if (at >= 0 && h.bag[at]) itemTooltip(s, h.bag[at], 'Left click: wear it    Right click: drop it');
}

function itemScore(it) {
  const a = it.affixes || {};
  if (it.slot === 'sword') return (it.min + it.max) / 2 * it.speed * (1 + (a.atkSpeed || 0)) * (1 + (a.crit || 0)) + (a.skillDmg || 0) * 20 + (a.lifeHit || 0) * 1.5;
  return it.hp + it.red * 400 + (a.hpFlat || 0) + (a.regen || 0) * 6 + (a.move || 0) * 200 + (a.potion || 0) * 40;
}
function diffMark(x, y, d, pct) {
  if (Math.abs(d) < 1e-6) { text('same', x, y, 14, C.dim, 'left'); return; }
  const up = d > 0, col = up ? '#8fe08f' : '#ff8a78';
  tri(x + 6, y, 6, up ? -Math.PI / 2 : Math.PI / 2, col);
  const v = Math.abs(d);
  text(`${up ? '+' : '-'}${pct ? Math.round(v * 100) + '%' : v.toFixed(v < 10 ? 1 : 0)}`, x + 16, y, 14, col, 'left');
}
function tooltip(s) {
  const hov = s.ui.hover; if (!hov || hov.type !== 'item') return;
  const d = s.drops.find(q => q.id === hov.id); if (!d || !d.item) return;
  itemTooltip(s, d.item, lootHint(s));
}

// ---- Screens ----
// An item's name, stats, affixes and how it compares with what you wear, drawn by the mouse; the
// last line says what a click does (pick it up, or wear or drop it from the bag)
function itemTooltip(s, it, hint) {
  const cur = s.hero[it.slot], L = [];
  L.push([it.name, RCOL[it.rarity], 16, '600']);
  L.push([`${RARITY[it.rarity]} ${it.base}`, C.dim, 14, '']);
  if (it.slot === 'sword') { L.push([`Damage ${it.min}-${it.max}`, C.text, 14, '', (it.min + it.max) / 2 - (cur.min + cur.max) / 2, false]); L.push([`Speed ${it.speed.toFixed(2)}`, C.text, 14, '', it.speed - cur.speed, true]); }
  else { L.push([`Max HP +${it.hp}`, C.text, 14, '', it.hp - cur.hp, false]); L.push([`Damage taken -${Math.round(it.red * 100)}%`, C.text, 14, '', it.red - cur.red, true]); }
  for (const k in it.affixes) L.push([AFFIX_TEXT[k](it.affixes[k]), '#a8c0ff', 14, '']);
  if (it.special) L.push([it.special, '#ffb070', 14, '']);
  const better = itemScore(it) - itemScore(cur);
  L.push([better > 0.5 ? `Better than your ${cur.name}` : better < -0.5 ? `Worse than your ${cur.name}` : `About the same as your ${cur.name}`, better > 0.5 ? '#8fe08f' : better < -0.5 ? '#ff8a78' : C.dim, 14, '']);
  L.push([hint, C.gold, 14, '600']);
  const w = Math.max(...L.map(l => measure(l[0], l[2], l[3]) + (l[4] !== undefined ? 78 : 0))) + 28, h = L.length * 21 + 16;
  let x = mouse.x + 18, y = mouse.y + 18;
  if (x + w > W - 8) x = mouse.x - w - 18; if (y + h > H - 8) y = H - 8 - h; x = Math.max(8, x); y = Math.max(8, y);
  rr(x, y, w, h, 8, 'rgba(10,10,12,0.96)', RCOL[it.rarity]);
  L.forEach((l, i) => {
    const yy = y + 18 + i * 21;
    text(l[0], x + 14, yy, l[2], l[1], 'left', l[3]);
    if (l[4] !== undefined) diffMark(x + 26 + measure(l[0], l[2], l[3]), yy, l[4], l[5]);
  });
}

export { inventoryPanel, tooltip };
