// Cached three.js materials (M, glowMat) and the painted canvas textures (TEX).

import * as THREE from 'three';
import { makeRng } from '../math.js';
import { HOLLOW } from '../game/world/floor1.js';
import { GW, GH } from '../game/world/grid.js';

const MATS = new Map();
function M(color, o = {}) { // a cached standard material
  const key = color + JSON.stringify(o);
  if (MATS.has(key)) return MATS.get(key);
  const m = new THREE.MeshStandardMaterial({ color, roughness: o.rough ?? 0.88, metalness: o.metal ?? 0.05,
    emissive: o.em ?? 0x000000, emissiveIntensity: o.ei ?? 1, transparent: !!o.transparent, opacity: o.opacity ?? 1,
    side: o.side ?? THREE.FrontSide, depthWrite: o.depthWrite ?? true, flatShading: !!o.flat });
  MATS.set(key, m); return m;
}
function glowMat(color, opacity = 1) {
  return new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: true });
}
function canvasTex(size, draw, rx, ry) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'); draw(g, size, makeRng(size + rx * 13 + ry * 7));
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
function blotches(g, s, r, colors, n, rmin, rmax, alpha) {
  for (let i = 0; i < n; i++) {
    const x = r() * s, y = r() * s, rad = rmin + r() * (rmax - rmin);
    g.globalAlpha = alpha * (0.5 + r() * 0.5); g.fillStyle = colors[Math.floor(r() * colors.length)];
    for (const ox of [-s, 0, s]) for (const oy of [-s, 0, s]) {
      g.beginPath(); g.ellipse(x + ox, y + oy, rad, rad * (0.5 + r() * 0.5), r() * 3, 0, Math.PI * 2); g.fill();
    }
  }
  g.globalAlpha = 1;
}
function speckle(g, s, r, colors, n, size) {
  for (let i = 0; i < n; i++) { g.fillStyle = colors[Math.floor(r() * colors.length)]; g.fillRect(r() * s, r() * s, size, size); }
}
const TEX = {
  ground: () => canvasTex(512, (g, s, r) => {
    g.fillStyle = '#2a261f'; g.fillRect(0, 0, s, s);
    blotches(g, s, r, ['#353024', '#23201a', '#2e3622', '#3b3326', '#283021', '#40372a'], 260, 8, 46, 0.55);
    speckle(g, s, r, ['#4a4233', '#1a1814', '#3c4a2c', '#57503f'], 2600, 2);
  }, GW / 16, GH / 16),
  cobble: () => canvasTex(512, (g, s, r) => {
    g.fillStyle = '#1c1a18'; g.fillRect(0, 0, s, s);
    const n = 12, c = s / n;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const off = (j % 2) * c / 2, x = i * c + off + r() * 3, y = j * c + r() * 3;
      const v = 40 + Math.floor(r() * 24), w = c - 5 - r() * 4, h = c - 5 - r() * 4;
      g.fillStyle = `rgb(${v},${v - 4},${v - 10})`;
      for (const ox of [-s, 0]) { g.beginPath(); g.roundRect(x + ox + (off ? 0 : 0), y, w, h, 7); g.fill(); }
      g.fillStyle = 'rgba(255,240,210,0.05)'; g.fillRect(x + 3, y + 3, w - 8, 4);
    }
    speckle(g, s, r, ['#2a2824', '#5a554c'], 900, 2);
  }, 13, 11.5),
  flag: (rx, ry) => canvasTex(512, (g, s, r) => {
    g.fillStyle = '#151413'; g.fillRect(0, 0, s, s);
    const n = 4, c = s / n;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const v = 46 + Math.floor(r() * 22);
      g.fillStyle = `rgb(${v},${v - 3},${v - 6})`; g.fillRect(i * c + 4, j * c + 4, c - 8, c - 8);
      g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 2; g.beginPath();
      g.moveTo(i * c + r() * c, j * c + 6); g.lineTo(i * c + r() * c, j * c + c - 6); g.stroke();
    }
    blotches(g, s, r, ['#2a3a24', '#1c1b18'], 40, 6, 30, 0.35);
    speckle(g, s, r, ['#5c574d', '#1a1917'], 1500, 2);
  }, rx, ry),
  hollow: () => canvasTex(512, (g, s, r) => {
    g.fillStyle = '#2e1d19'; g.fillRect(0, 0, s, s);
    blotches(g, s, r, ['#3d221c', '#24150f', '#4a2a20', '#33261b'], 220, 8, 40, 0.6);
    speckle(g, s, r, ['#5a3328', '#170e0b', '#6b4a35'], 2200, 2);
  }, (HOLLOW.x1 - HOLLOW.x0) / 16, (HOLLOW.z1 - HOLLOW.z0) / 16),
  dirt: () => canvasTex(256, (g, s, r) => {
    const grad = g.createLinearGradient(0, 0, 0, s);
    grad.addColorStop(0, 'rgba(70,56,40,0)'); grad.addColorStop(0.25, 'rgba(70,56,40,0.9)');
    grad.addColorStop(0.75, 'rgba(66,52,38,0.9)'); grad.addColorStop(1, 'rgba(66,52,38,0)');
    g.fillStyle = grad; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 900; i++) {
      const y = s * (0.2 + r() * 0.6); g.fillStyle = r() < 0.5 ? 'rgba(30,24,18,0.6)' : 'rgba(110,92,70,0.5)';
      g.fillRect(r() * s, y, 2, 2);
    }
  }, 1, 1),
};

export { M, glowMat, TEX };
