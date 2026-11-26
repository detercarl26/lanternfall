// The inventory window (I): the paperdoll of worn gear, your stats, the bag grid and, at the strongbox
// in the plaza, the stash grid beside it; an item held on the cursor, and the tooltip that compares an
// item with what you wear, over the bag or over loot on the ground.

import { W, H } from '../platform/page.js';
import { SERIF, text, measure, C, rr, tri } from './kit.js';
import { mouse } from '../platform/input.js';
import { RARITY, RCOL, KINDS, AFFIX_TEXT, itemSize } from '../game/loot/items.js';
import { SLOTS, SLOT_KEYS, CELL, COLS, PAD, LAYOUT, invHeight, stashHeight, slotRect, gridOrigin, sortRect, invHit, stashOpen,
  boxItems, boxSize, dropTarget, itemScore, slotFor } from '../game/inventory.js';
import { lootHint } from './labels.js';
import { itemArt } from './item-art.js';

const tint = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };

function windowFrame(x, y, w, h, title, right) {
  rr(x, y, w, h, 10, '#0d0c0b', '#a08a5a');
  rr(x + 4, y + 4, w - 8, h - 8, 8, null, 'rgba(160,138,90,0.25)');
  text(title, x + w / 2, y + 26, 22, C.gold, 'center', '600', SERIF);
  if (right) text(right, x + w - 20, y + 26, 14, C.dim, 'right');
}
function cellBox(x, y, w, h, it, hot) {
  rr(x + 1, y + 1, w - 2, h - 2, 4, it ? tint(RCOL[it.rarity], hot ? 0.24 : 0.13) : 'rgba(26,24,22,0.95)', it ? RCOL[it.rarity] : 'rgba(190,170,130,0.22)');
  if (it) itemArt(it, x + 2, y + 2, w - 4, h - 4);
}

function inventoryPanel(s) {
  const h = s.hero, held = s.ui.held, hit = held ? null : invHit(mouse.x, mouse.y);
  const L = LAYOUT.inv, hgt = invHeight();
  windowFrame(L.x, L.y, L.w, hgt, 'Inventory', `Level ${h.level}`);
  text(`${h.gold} gold`, L.x + 20, L.y + 26, 14, C.gold, 'left', '600');

  // the paperdoll: each slot shows what you wear, or a faint picture of what goes there
  for (const key of SLOT_KEYS) {
    const r = slotRect(key), it = h[key], fits = held && held.item.slot === SLOTS[key].kind;
    const hot = hit && hit.kind === 'slot' && hit.key === key;
    rr(r.x, r.y, r.w, r.h, 6, it ? tint(RCOL[it.rarity], hot ? 0.24 : 0.12) : 'rgba(22,20,18,0.95)', fits ? '#9fe09f' : it ? RCOL[it.rarity] : C.edge);
    if (it) itemArt(it, r.x + 3, r.y + 3, r.w - 6, r.h - 6);
    else { itemArt(SLOTS[key].kind, r.x + 3, r.y + 3, r.w - 6, r.h - 6, 0.16); if (r.h >= 2 * CELL) text(SLOTS[key].label, r.x + r.w / 2, r.y + r.h - 10, 11, 'rgba(189,181,164,0.5)'); }
  }
  heroStats(s, L.x + PAD + 6.85 * CELL, L.y + LAYOUT.dollTop + 4, 5.15 * CELL - 4);

  // the bag
  const o = gridOrigin('bag');
  text('Bag', o.x, o.y - 15, 16, C.text, 'left', '600', SERIF);
  text(`${cellsUsed('bag')}/${COLS * boxSize('bag', true).rows} cells`, o.x + 44, o.y - 15, 13, C.dim, 'left');
  sortButton('bag', hit);
  grid('bag', hit);
  const hint = held ? 'Click: put it down or swap    Click outside: drop it on the ground'
    : stashOpen() ? 'Click: pick up    Right click: move to the stash    Esc: close'
      : 'Click: pick up    Right click: wear or take off    I or Esc: close';
  text(hint, L.x + L.w / 2, L.y + hgt - 20, 13, C.dim);

  if (stashOpen()) {
    const S = LAYOUT.stash, so = gridOrigin('stash');
    windowFrame(S.x, S.y, S.w, stashHeight(), 'Stash', `${boxItems('stash').length} items`);
    text('Kept in Ashgate: what you leave here is safe', so.x, so.y - 15, 13, C.dim, 'left');
    sortButton('stash', hit);
    grid('stash', hit);
    text('Click: pick up    Right click: move to the bag', S.x + S.w / 2, S.y + stashHeight() - 20, 13, C.dim);
  }

  if (held) { heldItem(held.item); landing('bag'); if (stashOpen()) landing('stash'); }
  else if (hit && hit.kind === 'grid' && hit.item) itemTooltip(s, hit.item, stashOpen() ? `Right click: move to the ${hit.box === 'bag' ? 'stash' : 'bag'}` : 'Right click: wear it');
  else if (hit && hit.kind === 'slot' && h[hit.key]) itemTooltip(s, h[hit.key], hit.key === 'sword' ? 'Put another sword here to swap' : 'Right click: take it off', true);
}
const cellsUsed = box => boxItems(box).reduce((a, it) => { const z = itemSize(it); return a + z.w * z.h; }, 0);

function sortButton(box, hit) {
  const r = sortRect(box), hot = hit && hit.kind === 'sort' && hit.box === box;
  rr(r.x, r.y, r.w, r.h, 5, hot ? 'rgba(160,138,90,0.35)' : 'rgba(40,36,30,0.9)', '#a08a5a');
  text('Sort', r.x + r.w / 2, r.y + r.h / 2 + 1, 13, C.gold, 'center', '600');
}
function grid(box, hit) {
  const o = gridOrigin(box), { cols, rows } = boxSize(box), place = boxSize(box, true).rows;
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++)
    rr(o.x + x * CELL + 1, o.y + y * CELL + 1, CELL - 2, CELL - 2, 3, y < place ? 'rgba(20,18,16,0.95)' : 'rgba(60,20,16,0.6)', 'rgba(190,170,130,0.1)');
  for (const it of boxItems(box)) {
    const z = itemSize(it), hot = hit && hit.kind === 'grid' && hit.box === box && hit.item === it;
    cellBox(o.x + it.gx * CELL, o.y + it.gy * CELL, z.w * CELL, z.h * CELL, it, hot);
  }
}
// Over everything, the held item too: where it would land, green, gold for a swap, red when it cannot
function landing(box) {
  const o = gridOrigin(box), { cols, rows } = boxSize(box), t = dropTarget(box, mouse.x, mouse.y);
  if (!t || mouse.x < o.x || mouse.x >= o.x + cols * CELL || mouse.y < o.y || mouse.y >= o.y + rows * CELL) return;
  const edge = !t.ok ? '#ff8a78' : t.swap ? C.gold : '#9fe09f';
  rr(o.x + t.gx * CELL, o.y + t.gy * CELL, t.w * CELL, t.h * CELL, 4, !t.ok ? 'rgba(200,60,50,0.35)' : t.swap ? 'rgba(242,210,87,0.3)' : 'rgba(120,220,120,0.28)', edge);
  rr(o.x + t.gx * CELL + 1, o.y + t.gy * CELL + 1, t.w * CELL - 2, t.h * CELL - 2, 4, null, edge);
}
function heldItem(it) {
  const z = itemSize(it), w = z.w * CELL, h = z.h * CELL;
  rr(mouse.x - w / 2, mouse.y - h / 2, w, h, 4, 'rgba(13,12,11,0.7)');
  rr(mouse.x - w / 2, mouse.y - h / 2, w, h, 4, tint(RCOL[it.rarity], 0.3), RCOL[it.rarity]);
  itemArt(it, mouse.x - w / 2 + 2, mouse.y - h / 2 + 2, w - 4, h - 4);
}

// Your numbers, from level and everything worn
function heroStats(s, x, y, w) {
  const h = s.hero, sw = h.sword, dm = h.dmgMult;
  const rows = [
    ['Health', `${Math.ceil(h.hp)} / ${h.maxHp}`],
    ['Damage', `${Math.round(sw.min * dm)}-${Math.round(sw.max * dm)}`],
    ['Swings per second', h.atkSpeed.toFixed(2)],
    ['Critical chance', `${Math.round(h.crit * 100)}%`],
    ['Damage taken', `-${Math.round(h.red * 100)}%`],
    ['Run speed', `+${Math.round((h.moveMult - 1) * 100)}%`],
    ['Regeneration', `${h.regen.toFixed(1)}/s`],
    ['Skill damage', `+${Math.round(h.skillDmg * 100)}%`],
  ];
  if (h.lifeHit) rows.push(['Life per hit', `+${h.lifeHit}`]);
  rr(x - 6, y - 4, w + 6, rows.length * 17 + 10, 6, 'rgba(22,20,18,0.8)', 'rgba(190,170,130,0.18)');
  rows.forEach(([k, v], i) => { text(k, x + 2, y + 10 + i * 17, 13, C.dim, 'left'); text(v, x + w - 8, y + 10 + i * 17, 13, C.text, 'right', '600'); });
}

// ---- Tooltips -----------------------------------------------------------------------------------
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
// An item's name, stats, bonuses and how it compares with what you wear in that slot; the last line
// says what a click does. Worn items skip the comparison.
function itemTooltip(s, it, hint, isWorn = false) {
  const cur = isWorn ? null : s.hero[slotFor(it)], cmp = !isWorn, L = [];
  const z = (k, fallback = 0) => (cur ? cur[k] || 0 : fallback);
  L.push([it.name, RCOL[it.rarity], 16, '600']);
  L.push([`${RARITY[it.rarity]} ${KINDS[it.slot].name.toLowerCase()}${it.name !== it.base ? ' · ' + it.base : ''}`, C.dim, 14, '']);
  if (it.slot === 'sword') {
    L.push([`Damage ${it.min}-${it.max}`, C.text, 14, '', cmp ? (it.min + it.max) / 2 - (z('min') + z('max')) / 2 : undefined, false]);
    L.push([`Speed ${it.speed.toFixed(2)}`, C.text, 14, '', cmp ? it.speed - z('speed') : undefined, true]);
  } else if (it.hp !== undefined) {
    L.push([`Max HP +${it.hp}`, C.text, 14, '', cmp ? it.hp - z('hp') : undefined, false]);
    if (it.red || z('red')) L.push([`Damage taken -${(it.red * 100).toFixed(1).replace('.0', '')}%`, C.text, 14, '', cmp ? it.red - z('red') : undefined, true]);
  }
  for (const k in it.implicit || {}) L.push([AFFIX_TEXT[k](it.implicit[k]), '#e2d6b8', 14, '']);
  for (const k in it.affixes) L.push([AFFIX_TEXT[k](it.affixes[k]), '#a8c0ff', 14, '']);
  if (it.special) L.push([it.special, '#ffb070', 14, '']);
  if (cmp) {
    if (!cur) L.push([`Nothing worn there: wearing it is all gain`, '#8fe08f', 14, '']);
    else {
      const better = itemScore(it) - itemScore(cur);
      L.push([better > 0.5 ? `Better than your ${cur.name}` : better < -0.5 ? `Worse than your ${cur.name}` : `About the same as your ${cur.name}`, better > 0.5 ? '#8fe08f' : better < -0.5 ? '#ff8a78' : C.dim, 14, '']);
    }
  }
  L.push([hint, C.gold, 14, '600']);
  const w = Math.max(...L.map(l => measure(l[0], l[2], l[3]) + (l[4] !== undefined ? 78 : 0))) + 28, h = L.length * 21 + 16;
  let x = mouse.x + 18, y = mouse.y + 18;
  if (x + w > W - 8) x = mouse.x - w - 18; if (y + h > H - 8) y = H - 8 - h; x = Math.max(8, x); y = Math.max(8, y);
  rr(x, y, w, h, 8, 'rgba(10,10,12,0.97)', RCOL[it.rarity]);
  L.forEach((l, i) => {
    const yy = y + 18 + i * 21;
    text(l[0], x + 14, yy, l[2], l[1], 'left', l[3]);
    if (l[4] !== undefined) diffMark(x + 26 + measure(l[0], l[2], l[3]), yy, l[4], l[5]);
  });
}

export { inventoryPanel, tooltip };
