// The HUD drawing kit: fonts, colours, text, rounded panels, bars, labels that keep clear of each
// other, and every icon drawn with paths.

import { W, H, ctx } from '../platform/page.js';

const FONT = '"Segoe UI", "Helvetica Neue", Arial, sans-serif';
const SERIF = 'Georgia, "Palatino Linotype", "Times New Roman", serif';

// ---- Screen: the 3D world canvas under the HUD canvas, both fitted to the window ----------
function clearHud() { ctx.clearRect(0, 0, W, H); }
function text(s, x, y, size, c, align = 'center', weight = '', font = FONT) {
  ctx.fillStyle = c; ctx.font = `${weight} ${size}px ${font}`; ctx.textAlign = align;
  ctx.textBaseline = 'middle'; ctx.fillText(s, x, y);
}
function measure(s, size, weight = '', font = FONT) {
  ctx.font = `${weight} ${size}px ${font}`; return ctx.measureText(s).width;
}

const C = { panel: 'rgba(10,11,14,0.8)', edge: 'rgba(190,170,130,0.35)', text: '#ece6d8', dim: '#bdb5a4', gold: '#f2d257',
  teal: '#7fe0d0', red: '#ff8a78', cyan: '#8fe8ff', green: '#9fe09f' };
let placed = [];
function rr(x, y, w, h, r, fill, stroke) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
}
function bar(x, y, w, h, f, col, back) { rr(x, y, w, h, 3, back || 'rgba(0,0,0,0.65)'); if (f > 0) rr(x, y, Math.max(2, w * Math.min(1, f)), h, 3, col); }
const reserve = (x, y, w, h) => placed.push({ x0: x, y0: y, x1: x + w, y1: y + h });
function overlaps(b) { for (const p of placed) if (b.x0 < p.x1 && b.x1 > p.x0 && b.y0 < p.y1 && b.y1 > p.y0) return true; return false; }
function wlabel(str, x, y, size, color, o = {}) { // a label in the world, kept clear of every other label
  const w = measure(str, size, o.weight || '');
  const b = { x0: x - w / 2 - 5, y0: y - size / 2 - 3, x1: x + w / 2 + 5, y1: y + size / 2 + 3 };
  for (let k = 0; k < 3 && overlaps(b); k++) { const dy = -(size + 8); b.y0 += dy; b.y1 += dy; y += dy; }
  if (overlaps(b) || b.x0 < 2 || b.x1 > W - 2 || b.y0 < 2 || b.y1 > H - 2) return null;
  placed.push(b);
  rr(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0, 4, o.bg || 'rgba(8,9,12,0.76)');
  text(str, x, y, size, color, 'center', o.weight || '');
  return b;
}
function fitText(str, maxW, size, weight = '') {
  if (measure(str, size, weight) <= maxW) return str;
  while (str.length > 4 && measure(str + '...', size, weight) > maxW) str = str.slice(0, -1);
  return str + '...';
}
function wrap(str, maxW, size) {
  const out = []; let cur = '';
  for (const w of str.split(' ')) { const t = cur ? cur + ' ' + w : w; if (cur && measure(t, size) > maxW) { out.push(cur); cur = w; } else cur = t; }
  if (cur) out.push(cur); return out;
}

// ---- Drawn icons ----
function line(x0, y0, x1, y1) { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); }
function tri(x, y, s, ang, col) {
  ctx.fillStyle = col; ctx.beginPath();
  for (let k = 0; k < 3; k++) { const a = ang + k * Math.PI * 2 / 3; const px = x + Math.cos(a) * s, py = y + Math.sin(a) * s; k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
  ctx.closePath(); ctx.fill();
}
function icon(id, cx, cy, alpha) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (id === 'swing') { ctx.strokeStyle = '#dde1ea'; ctx.lineWidth = 4; line(cx - 11, cy + 11, cx + 12, cy - 12); ctx.strokeStyle = '#a08a5a'; ctx.lineWidth = 3; line(cx - 15, cy + 3, cx - 3, cy + 15); line(cx - 13, cy + 13, cx - 17, cy + 17); }
  else if (id === 'q') { ctx.strokeStyle = C.cyan; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, 13, 0.4, Math.PI * 1.75); ctx.stroke(); tri(cx + 12, cy + 6, 5, 1.9, C.cyan); ctx.beginPath(); ctx.arc(cx, cy, 6, Math.PI, Math.PI * 2.5); ctx.stroke(); }
  else if (id === 'e') { ctx.strokeStyle = C.cyan; ctx.lineWidth = 3; line(cx - 13, cy, cx + 9, cy); tri(cx + 12, cy, 6, 0, C.cyan); ctx.lineWidth = 2; line(cx - 15, cy - 7, cx - 4, cy - 7); line(cx - 15, cy + 7, cx - 4, cy + 7); }
  else if (id === 'r') { ctx.fillStyle = C.cyan; ctx.beginPath(); ctx.arc(cx - 3, cy, 14, -1.25, 1.25); ctx.arc(cx - 10, cy, 11, 1.05, -1.05, true); ctx.closePath(); ctx.fill(); }
  else if (id === 'dodge') { ctx.strokeStyle = '#d8d0c0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy + 3, 11, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke(); tri(cx + 11, cy + 1, 5, 1.4, '#d8d0c0'); ctx.lineWidth = 2; line(cx - 14, cy + 9, cx - 6, cy + 9); }
  else if (id === 'potion') { ctx.fillStyle = '#b8322a'; ctx.beginPath(); ctx.arc(cx, cy + 4, 10, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#d8cfc0'; ctx.fillRect(cx - 3, cy - 12, 6, 8); ctx.fillStyle = '#6a4a2a'; ctx.fillRect(cx - 4, cy - 14, 8, 3); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.arc(cx - 3, cy + 1, 3, 0, Math.PI * 2); ctx.fill(); }
  else if (id === 'coat') {
    ctx.fillStyle = '#8a7a5c'; ctx.strokeStyle = '#d8cfc0'; ctx.lineWidth = 2; ctx.beginPath();
    ctx.moveTo(cx - 6, cy - 13); ctx.lineTo(cx + 6, cy - 13); ctx.lineTo(cx + 14, cy - 6); ctx.lineTo(cx + 10, cy + 1); ctx.lineTo(cx + 8, cy - 1);
    ctx.lineTo(cx + 8, cy + 13); ctx.lineTo(cx - 8, cy + 13); ctx.lineTo(cx - 8, cy - 1); ctx.lineTo(cx - 10, cy + 1); ctx.lineTo(cx - 14, cy - 6);
    ctx.closePath(); ctx.fill(); ctx.stroke(); line(cx, cy - 13, cx, cy + 13);
  }
  ctx.restore();
}
function classIcon(cls, x, y) {
  ctx.save(); ctx.lineWidth = 2; ctx.lineCap = 'round';
  if (cls === 'vanguard') { ctx.fillStyle = '#9aa0ac'; ctx.beginPath(); ctx.moveTo(x - 7, y - 8); ctx.lineTo(x + 7, y - 8); ctx.lineTo(x + 7, y); ctx.quadraticCurveTo(x, y + 10, x, y + 10); ctx.quadraticCurveTo(x, y + 10, x - 7, y); ctx.closePath(); ctx.fill(); }
  else if (cls === 'ranger') { ctx.strokeStyle = '#c8a070'; ctx.beginPath(); ctx.arc(x - 4, y, 9, -1.2, 1.2); ctx.stroke(); ctx.strokeStyle = '#e8e0d0'; ctx.lineWidth = 1; line(x - 1, y - 8, x - 1, y + 8); }
  else { ctx.fillStyle = '#ffb04a'; ctx.beginPath(); ctx.arc(x, y + 1, 5, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#8a7a5a'; ctx.strokeRect(x - 6, y - 6, 12, 14); }
  ctx.restore();
}
const dot = (x, y, r, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); };
const diamond = (x, y, r, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath(); ctx.fill(); };

// Other modules cannot assign to an imported variable, so they call these.
export function setPlaced(v) { placed = v; return v; }

export { SERIF, clearHud, text, measure, C, rr, bar, reserve, wlabel, fitText, wrap, tri, icon, classIcon, dot, diamond };
