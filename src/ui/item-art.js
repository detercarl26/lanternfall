// Item pictures for the inventory, drawn with paths and scaled to the cells an item covers: a blade,
// a coat, a helm, gloves, boots, a belt, a ring, an amulet. Metal or leather by the item's base; the
// rarity colour picks out an edge, a stone or a buckle.

import { ctx } from '../platform/page.js';
import { RCOL } from '../game/loot/items.js';

const METAL = /Plate|Mail|Gauntlets|Greaves|Great Helm|Iron Cap|Kettle|Heavy Belt/;
function tone(it) { return METAL.test(it.base || '') ? ['#9da3ad', '#5e636c'] : ['#8a6a48', '#4e3a28']; }
function path(pts, fill, stroke, lw = 2) {
  ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}

// Draws the item inside the box x, y, w, h (screen pixels); alpha fades it, for an empty slot's ghost
function itemArt(it, x, y, w, h, alpha = 1) {
  const kind = typeof it === 'string' ? it : it.slot, item = typeof it === 'string' ? { slot: kind, base: '', rarity: 0 } : it;
  const rc = RCOL[item.rarity] || RCOL[0], [lite, dark] = tone(item);
  const cx = x + w / 2, cy = y + h / 2, s = Math.min(w, h);
  ctx.save(); ctx.globalAlpha = alpha; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (kind === 'sword') {
    const bw = Math.max(5, w * (w > 50 ? 0.22 : 0.26)), top = y + h * 0.07, guard = y + h * 0.68;
    path([[cx, top], [cx + bw / 2, top + bw], [cx + bw / 2, guard], [cx - bw / 2, guard], [cx - bw / 2, top + bw]], '#cfd4dc', rc, 1.5);
    ctx.strokeStyle = 'rgba(80,86,96,0.8)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx, top + bw); ctx.lineTo(cx, guard - 3); ctx.stroke();
    ctx.fillStyle = '#8a7a5a'; ctx.fillRect(cx - w * 0.32, guard, w * 0.64, Math.max(4, h * 0.035));
    ctx.fillStyle = '#3a2a1c'; ctx.fillRect(cx - bw * 0.32, guard + 4, bw * 0.64, h * 0.2);
    ctx.fillStyle = rc; ctx.beginPath(); ctx.arc(cx, y + h * 0.93, Math.max(3, bw * 0.45), 0, Math.PI * 2); ctx.fill();
  } else if (kind === 'armor') {
    const L = x + w * 0.12, R = x + w * 0.88, T = y + h * 0.1, B = y + h * 0.92, n = w * 0.16;
    path([[cx - n, T], [cx + n, T], [R, T + h * 0.1], [R, T + h * 0.38], [R - w * 0.12, T + h * 0.38], [R - w * 0.1, B], [L + w * 0.1, B], [L + w * 0.12, T + h * 0.38], [L, T + h * 0.38], [L, T + h * 0.1]], lite, dark);
    path([[cx - n, T], [cx, T + h * 0.14], [cx + n, T]], '#2a2420');
    ctx.strokeStyle = rc; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(L + w * 0.14, T + h * 0.56); ctx.lineTo(R - w * 0.14, T + h * 0.56); ctx.stroke();
  } else if (kind === 'helm') {
    const r = s * 0.36;
    ctx.fillStyle = lite; ctx.beginPath(); ctx.arc(cx, cy + r * 0.25, r, Math.PI, 0); ctx.lineTo(cx + r, cy + r * 0.9); ctx.lineTo(cx - r, cy + r * 0.9); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = dark; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#16130f'; ctx.fillRect(cx - r * 0.7, cy + r * 0.2, r * 1.4, r * 0.18);
    ctx.fillStyle = rc; ctx.fillRect(cx - 1.5, cy - r * 0.75, 3, r * 0.9);
  } else if (kind === 'gloves') {
    const gw = s * 0.42, gh = s * 0.62, gx = cx - gw / 2, gy = cy - gh * 0.45;
    path([[gx, gy + gh * 0.3], [gx + gw, gy + gh * 0.3], [gx + gw, gy + gh * 0.78], [gx + gw * 0.85, gy + gh], [gx + gw * 0.1, gy + gh], [gx, gy + gh * 0.8]], lite, dark);
    for (let k = 0; k < 4; k++) { ctx.fillStyle = lite; ctx.fillRect(gx + k * gw / 4 + 1, gy + (k === 0 ? gh * 0.15 : 0), gw / 4 - 2, gh * 0.34); }
    path([[gx - gw * 0.28, gy + gh * 0.42], [gx, gy + gh * 0.36], [gx, gy + gh * 0.62], [gx - gw * 0.2, gy + gh * 0.6]], lite, dark, 1.5);
    ctx.fillStyle = rc; ctx.fillRect(gx - 1, gy + gh * 0.86, gw + 2, 3);
  } else if (kind === 'boots') {
    const bw = s * 0.3, bh = s * 0.6, bx = cx - bw * 0.6, by = cy - bh / 2;
    path([[bx, by], [bx + bw, by], [bx + bw, by + bh * 0.68], [bx + bw * 1.9, by + bh * 0.78], [bx + bw * 1.9, by + bh], [bx, by + bh]], lite, dark);
    ctx.fillStyle = dark; ctx.fillRect(bx, by + bh * 0.92, bw * 1.9, bh * 0.08);
    ctx.fillStyle = rc; ctx.fillRect(bx, by + bh * 0.12, bw, 3);
  } else if (kind === 'belt') {
    const bh = Math.min(h * 0.38, 14);
    ctx.fillStyle = lite; ctx.fillRect(x + w * 0.08, cy - bh / 2, w * 0.84, bh); ctx.strokeStyle = dark; ctx.lineWidth = 1.5; ctx.strokeRect(x + w * 0.08, cy - bh / 2, w * 0.84, bh);
    ctx.strokeStyle = rc; ctx.lineWidth = 3; ctx.strokeRect(cx - bh * 0.7, cy - bh * 0.75, bh * 1.4, bh * 1.5);
  } else if (kind === 'ring') {
    ctx.strokeStyle = '#c8a860'; ctx.lineWidth = Math.max(2.5, s * 0.1); ctx.beginPath(); ctx.arc(cx, cy + s * 0.08, s * 0.24, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = rc; ctx.beginPath(); ctx.arc(cx, cy - s * 0.18, s * 0.11, 0, Math.PI * 2); ctx.fill();
  } else if (kind === 'amulet') {
    ctx.strokeStyle = '#a8946a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx, cy - s * 0.12, s * 0.3, Math.PI * 0.1, Math.PI * 0.9); ctx.stroke();
    ctx.fillStyle = rc; ctx.beginPath(); ctx.moveTo(cx, cy + s * 0.1); ctx.lineTo(cx + s * 0.14, cy + s * 0.26); ctx.lineTo(cx, cy + s * 0.42); ctx.lineTo(cx - s * 0.14, cy + s * 0.26); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#3a2e1c'; ctx.lineWidth = 1; ctx.stroke();
  }
  ctx.restore();
}

export { itemArt };
