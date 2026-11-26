// The HUD panels: party frames, minimap, quest tracker and board, chat, skill bar, stats, haul,
// boss bar, announcements and the fall overlay.

import { tune } from '../config.js';
import { W, H, ctx } from '../platform/page.js';
import { SERIF, text, measure, C, rr, bar, fitText, wrap, tri, icon, classIcon, dot, diamond } from './kit.js';
import { muted } from '../audio/sfx.js';
import { TOWN, FIELD, HOLLOW, RIDGE, GATE, PLAZA, MEMORIAL, SANCTUARY, GARDEN, CRYSTAL, DOORSTONE, HALL, PATH, MAZE_X0, CELL, MAZE_Z0, MAZE, AREA_INFO } from '../game/world/floor1.js';
import { FRAME, HOUSES } from '../game/world/town.js';
import { CLASS_NAME } from '../game/bots/roster.js';
import { ENEMY_NAME } from '../game/enemies/spawn.js';
import { SKILLS } from '../game/hero/hero.js';
import { questLines, questMarker } from '../game/quests.js';
import { xpNeed } from '../game/hero/level.js';

function partyFrames(party) {
  party.forEach((b, i) => {
    const y = 12 + i * 46;
    rr(12, y, 232, 40, 6, C.panel, C.edge);
    classIcon(b.cls, 28, y + 19);
    text(`${b.name} [BOT]`, 44, y + 13, 14, C.teal, 'left', '600');
    text(CLASS_NAME[b.cls], 236, y + 13, 14, C.dim, 'right');
    bar(44, y + 25, 190, 8, b.hp / b.maxHp, '#3fbf9f');
  });
}
function minimap(s) {
  const x0 = 1088, y0 = 16, S = 172, h = s.hero, sc = 1.3;
  rr(x0 - 4, y0 - 4, S + 8, S + 8, 8, C.panel, C.edge);
  ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, S, S); ctx.clip();
  ctx.fillStyle = '#0c0d0f'; ctx.fillRect(x0, y0, S, S);
  const cx = x0 + S / 2, cy = y0 + S / 2, mx = x => cx + (x - h.x) * sc, mz = z => cy + (z - h.z) * sc;
  const rect = (r, col) => { ctx.fillStyle = col; ctx.fillRect(mx(r.x0), mz(r.z0), (r.x1 - r.x0) * sc, (r.z1 - r.z0) * sc); };
  rect(FIELD, '#2a2a22'); rect(HOLLOW, '#3e2420');
  ctx.fillStyle = '#2a2a22'; for (const [a, b] of RIDGE.gaps) ctx.fillRect(mx(a), mz(RIDGE.z0), (b - a) * sc, (RIDGE.z1 - RIDGE.z0) * sc);
  rect(TOWN, '#3e3c36'); rect({ x0: TOWN.x1, x1: FIELD.x0, z0: GATE.z0, z1: GATE.z1 }, '#3e3c36');
  // Ashgate: the garden, the plaza inside its arcade and the four ways through, the houses, the hall, the sanctuary
  rect(GARDEN, '#2c3626');
  rect(FRAME, '#24221e');
  ctx.fillStyle = '#4a463e'; ctx.beginPath(); ctx.arc(mx(PLAZA.x), mz(PLAZA.z), PLAZA.r * sc, 0, Math.PI * 2); ctx.fill();
  const P = PLAZA, W = P.ways, way = (x0, z0, x1, z1) => rect({ x0, z0, x1, z1 }, '#4a463e');
  if (W.e) way(P.x + P.r - 1, P.z - W.e, P.x + P.ring + 1, P.z + W.e);
  if (W.w) way(P.x - P.ring - 1, P.z - W.w, P.x - P.r + 1, P.z + W.w);
  if (W.n) way(P.x - W.n, P.z - P.ring - 1, P.x + W.n, P.z - P.r + 1);
  if (W.s) way(P.x - W.s, P.z + P.r - 1, P.x + W.s, P.z + P.ring + 1);
  ctx.fillStyle = '#24221e';
  for (const b of HOUSES) if (Math.abs(b.x0 - h.x) < 90 && Math.abs(b.z0 - h.z) < 90) ctx.fillRect(mx(b.x0), mz(b.z0), (b.x1 - b.x0) * sc, (b.z1 - b.z0) * sc);
  rect(MEMORIAL, '#1c1a17'); rect(SANCTUARY, '#1c1a17');
  ctx.fillStyle = '#34322c';
  for (let r = 0; r < MAZE.length; r++) for (let c = 0; c < MAZE[r].length; c++) if (MAZE[r][c] === '.') ctx.fillRect(mx(MAZE_X0 + c * CELL), mz(MAZE_Z0 + r * CELL), CELL * sc + 0.6, CELL * sc + 0.6);
  ctx.fillRect(mx(116), mz(-20), 6 * sc, 8 * sc); ctx.fillRect(mx(196), mz(-4), 8 * sc, 8 * sc);
  ctx.beginPath(); ctx.arc(mx(HALL.x), mz(HALL.z), HALL.r * sc, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#5a4a34'; ctx.lineWidth = 2.5; ctx.beginPath();
  PATH.forEach(([x, z], i) => (i ? ctx.lineTo(mx(x), mz(z)) : ctx.moveTo(mx(x), mz(z)))); ctx.stroke();
  for (const e of s.enemies) if (!e.dead && Math.abs(e.x - h.x) < 70 && Math.abs(e.z - h.z) < 70 && (e.kind !== 'warden' || s.bossFight))
    dot(mx(e.x), mz(e.z), e.kind === 'warden' ? 4.5 : e.kind === 'brute' ? 2.8 : 2, e.kind === 'rogue' ? '#ff5a4a' : '#c8483a');
  for (const b of s.bots) if (b.alive) dot(mx(b.x), mz(b.z), 2.6, b.party ? C.teal : b.trouble ? '#ffcf8a' : '#d8d2c4');
  diamond(mx(CRYSTAL.x), mz(CRYSTAL.z), 4, '#8fd0ff');
  if (s.doorStone) diamond(mx(DOORSTONE.x), mz(DOORSTONE.z), 4, '#8fd0ff');
  const q = questMarker();
  if (q) { const qx = Math.max(x0 + 6, Math.min(x0 + S - 6, mx(q.x))), qy = Math.max(y0 + 6, Math.min(y0 + S - 6, mz(q.z))); diamond(qx, qy, 6, '#1a1408'); diamond(qx, qy, 4.5, C.gold); }
  tri(cx + Math.sin(h.face) * 2, cy + Math.cos(h.face) * 2, 6, Math.atan2(Math.cos(h.face), Math.sin(h.face)), '#ffffff');
  ctx.restore();
  const info = AREA_INFO[s.area];
  text(info.name, x0 + S / 2, y0 + S + 18, 15, info.color, 'center', '600');
  text(`Players alive ${s.playersAlive.toLocaleString('en-US')}`, x0 + S / 2, y0 + S + 38, 14, C.dim);
  if (muted) text('Sound off (M)', x0 + S / 2, y0 + S + 57, 14, C.dim);
}
function tracker(s) {
  const lines = questLines(), x = 1016, y0 = 256, w = 248;
  rr(x - 4, y0 - 4, w + 8, 14 + lines.length * 42, 6, C.panel, C.edge);
  lines.forEach((q, i) => {
    const y = y0 + 12 + i * 42, col = q.done ? C.green : C.gold;
    text(fitText(q.title, w - 8, 15, '600'), x + 4, y, 15, col, 'left', '600');
    text(fitText(q.line, w - 8, 14), x + 4, y + 19, 14, q.done ? C.green : C.text, 'left');
  });
}
function chatBox(s) {
  const x = 16, y = 544, w = 428;
  rr(x - 4, y - 4, w + 8, 168, 6, 'rgba(10,11,14,0.66)', C.edge);
  s.chat.slice(-7).forEach((c, i) => {
    const col = c.kind === 'sys' ? C.gold : c.kind === 'death' ? C.red : c.kind === 'warn' ? '#ffb89a' : c.kind === 'party' ? C.teal : C.dim;
    text(fitText(c.who ? `${c.who} [BOT]: ${c.text}` : c.text, w - 8, 14), x + 4, y + 12 + i * 22, 14, col, 'left');
  });
}
const SLOTS = [['LMB', 'swing'], ['Q', 'q'], ['E', 'e'], ['R', 'r'], ['Space', 'dodge'], ['F', 'potion']];
function skillBar(s) {
  const h = s.hero, size = 54, gap = 9, bw = SLOTS.length * size + (SLOTS.length - 1) * gap, x0 = 640 - bw / 2, y0 = 584;
  SLOTS.forEach(([key, id], i) => {
    const x = x0 + i * (size + gap), cx = x + size / 2, cy = y0 + size / 2 - 6;
    rr(x, y0, size, size, 7, 'rgba(12,13,16,0.88)', C.edge);
    let locked = false, cdLeft = 0, full = 1;
    if (SKILLS[id]) { const lv = tune[SKILLS[id].lv]; locked = h.level < lv; cdLeft = h.cd[id]; full = { q: tune.whirlCooldown, e: tune.lungeCooldown, r: tune.crescentCooldown }[id]; }
    if (id === 'dodge') { cdLeft = h.dodgeCd; full = Math.max(0.01, tune.dodgeCooldown); }
    icon(id, cx, cy, locked ? 0.28 : 1);
    if (!locked && cdLeft > 0.05) {
      ctx.save(); ctx.beginPath(); ctx.rect(x, y0, size, size); ctx.clip();
      ctx.fillStyle = 'rgba(0,0,0,0.62)'; ctx.beginPath(); ctx.moveTo(cx, y0 + size / 2);
      ctx.arc(cx, y0 + size / 2, size, -Math.PI / 2 + (1 - cdLeft / full) * Math.PI * 2, Math.PI * 1.5); ctx.closePath(); ctx.fill(); ctx.restore();
      if (cdLeft > 0.5) text(cdLeft < 3 ? cdLeft.toFixed(1) : `${Math.ceil(cdLeft)}`, cx, cy, 16, '#ffffff', 'center', '700');
    }
    if (locked) text(`Lv ${tune[SKILLS[id].lv]}`, cx, cy, 14, C.dim, 'center', '600');
    if (id === 'potion') for (let k = 0; k < tune.potionCharges; k++) dot(x + 10 + k * 8, y0 + 7, 2.6, k < h.potions ? '#ff5a4a' : '#3a2a2a');
    text(key, cx, y0 + size - 9, 14, C.text, 'center', '600');
  });
  const by = y0 + size + 10, f = Math.max(0, h.hp) / h.maxHp;
  bar(x0, by, bw, 20, f, f < 0.3 ? '#e0402a' : '#b8322a', 'rgba(40,12,12,0.88)');
  text(`${Math.ceil(Math.max(0, h.hp))} / ${h.maxHp}`, 640, by + 10, 14, '#ffffff', 'center', '600');
  bar(x0, by + 26, bw, 6, h.xp / xpNeed(h.level), '#d8b04a', 'rgba(30,26,12,0.88)');
}
function stats(s) {
  const h = s.hero, x = 846;
  text(`Level ${h.level}`, x, 610, 15, C.gold, 'left', '600');
  text(`${Math.floor(h.xp)} / ${xpNeed(h.level)} XP`, x, 632, 14, C.dim, 'left');
  text(`Gold ${h.gold}`, x, 656, 14, C.gold, 'left');
}
function haulBox(s) {
  const hl = s.hero.haul;
  if (s.area !== 'hollow' && !hl.gold && !hl.items.length) return;
  const str = `Haul: ${hl.gold} gold, ${hl.items.length} item${hl.items.length === 1 ? '' : 's'} · leave the Hollow to keep it`;
  const w = measure(str, 14) + 28;
  rr(640 - w / 2, 540, w, 28, 6, 'rgba(60,12,10,0.88)', '#ff8a78'); text(str, 640, 554, 14, '#ffd8d0');
}
function bossBar(s) {
  const b = s.boss; if (!s.bossFight || !b || b.dead) return;
  text(ENEMY_NAME.warden, 640, 22, 17, '#ffcfa0', 'center', '600');
  bar(390, 34, 500, 14, b.hp / b.maxHp, '#b83a1a', 'rgba(30,10,8,0.9)');
}
function announceBox(s) {
  const a = s.announce[0]; if (!a) return;
  const w = Math.min(800, Math.max(measure(a.title, 32, '600', SERIF), measure(a.sub, 16)) + 60);
  rr(640 - w / 2, 116, w, 84, 8, 'rgba(8,9,12,0.76)');
  text(a.title, 640, 145, 32, a.color, 'center', '600', SERIF);
  text(fitText(a.sub, w - 40, 16), 640, 181, 16, C.text);
}
const BOARD_TEXT = [
  ['Wolves at the Gate', 'Clear the wolves in the east field: slay six Gloam Wolves.', 'q1'],
  ['Lanterns in the Dark', 'Three players are fighting for their lives: Mira in the Greyfields, Sable by the southern rocks, Doran deep in the Sunken Stair. Reach them before their lanterns go dark. Saved players join your raid party.', 'q2'],
  ['The First Stair', 'Gather a raid party, cross the Sunken Stair and bring down Garvath, Warden of the First Stair. Only then will the stairs to Floor 2 open.', 'warden'],
  ['Optional: The Red Hollow', 'Rogue players haunt the Hollow beyond the red banners. Take a cache from one and carry it out. Fall in there and you drop what you picked up.', 'q4'],
];

function boardPanel(s) {
  const x = 330, y = 96, w = 620, h = 520;
  rr(x, y, w, h, 10, 'rgba(14,12,10,0.95)', '#a08a5a');
  text('Ashgate Quest Board', 640, y + 34, 26, C.gold, 'center', '600', SERIF);
  let yy = y + 74;
  for (const [t, d, k] of BOARD_TEXT) {
    const done = k === 'warden' ? s.wardenDown : s.quests[k];
    text(t + (done ? ' (done)' : ''), x + 28, yy, 16, done ? C.green : C.gold, 'left', '600');
    const lines = wrap(d, w - 56, 14);
    lines.forEach((ln, i) => text(ln, x + 28, yy + 23 + i * 19, 14, C.text, 'left'));
    yy += 34 + lines.length * 19 + 14;
  }
  text('Click anywhere or press Esc to close', 640, y + h - 22, 14, C.dim);
}

function deathOverlay(s) {
  const h = s.hero; if (!h.dead) return;
  const k = Math.min(1, h.deathT / 1.2);
  ctx.fillStyle = `rgba(0,0,0,${0.78 * k})`; ctx.fillRect(0, 0, W, H);
  if (k > 0.5) {
    text('You fall', 640, 320, 44, '#ecdccb', 'center', '600', SERIF);
    text('You wake in Ashgate. Everything you carried is still yours.', 640, 370, 16, '#d6cdbf');
  }
}

export { partyFrames, minimap, tracker, chatBox, skillBar, stats, haulBox, bossBar, announceBox, boardPanel, deathOverlay };
