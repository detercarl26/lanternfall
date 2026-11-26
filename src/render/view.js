// VIEW, what the rest of the game may ask of the 3D view (drawPlay, drawTitle, mouseWorld,
// toScreen), and the figures lineup screen.

import * as THREE from 'three';
import { W, H } from '../platform/page.js';
import { mouse } from '../platform/input.js';
import { TEX } from './materials.js';
import * as FIG from './figures.js';
import { renderer, camera } from './scene.js';

let fig = null;
const FIG_LIST = [
  ['You, the hero', () => FIG.hero(), 0], ['Vanguard [BOT]', () => FIG.bot('Bram', 'vanguard'), 0], ['Ranger [BOT]', () => FIG.bot('Kestrel', 'ranger'), 0],
  ['Mender [BOT]', () => FIG.bot('Lio', 'mender'), 0], ['Rogue [BOT]', () => FIG.rogue(), 0], ['Gloam Wolf', () => FIG.wolf(), 0],
  ['Bramble Brute', () => FIG.brute(), 0.4], ['Bog Spitter', () => FIG.spitter(), 0.4], ['Garvath, the Warden', () => FIG.warden(), 1.8],
];
function buildFigures() {
  const sc = new THREE.Scene(); sc.background = new THREE.Color(0x0b0d11);
  sc.add(new THREE.HemisphereLight(0x6a7a98, 0x1c1611, 1.4));
  const key = new THREE.DirectionalLight(0xffe2c0, 3.0); key.position.set(-6, 14, 12); sc.add(key);
  const back = new THREE.DirectionalLight(0x7f9bff, 1.4); back.position.set(4, 8, -14); sc.add(back);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 20).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: TEX.flag(8, 3), roughness: 0.9 }));
  sc.add(floor);
  const items = []; let x = 0;
  FIG_LIST.forEach(([name, make, pad], i) => {
    x += pad; const r = make(); r.root.position.set(x, 0, 0); r.root.rotation.y = 0.35; sc.add(r.root);
    if (r.kind === 'hero') FIG.dressHero(r, { id: 'f1', rarity: 1, len: 1.0 }, { id: 'f2', rarity: 0 });
    items.push({ name, r, x, i }); x += 3.0 + pad;
  });
  const cx = x / 2 - 1.5, cam = new THREE.PerspectiveCamera(30, W / H, 0.5, 200);
  cam.position.set(cx - 0.8, 7.5, 34); cam.lookAt(cx - 0.8, 1.8, 0); cam.updateMatrixWorld();
  fig = { sc, cam, items };
}
function drawFigures(t) {
  if (!fig) buildFigures();
  for (const it of fig.items) {
    if (it.r.type === 'humanoid') FIG.animHumanoid(it.r, { moving: 0, phase: 0, kind: null, p: 0, t });
    else FIG.animBeast(it.r, { moving: 0, phase: 0, kind: null, p: 0, t });
  }
  renderer.render(fig.sc, fig.cam);
}
const v3 = new THREE.Vector3();
function project(cam, x, y, z) {
  v3.set(x, y, z).project(cam);
  return { x: (v3.x + 1) / 2 * W, y: (1 - v3.y) / 2 * H, on: v3.z < 1 && v3.x > -1.05 && v3.x < 1.05 && v3.y > -1.05 && v3.y < 1.05 };
}
function figureLabels() { if (!fig) buildFigures(); return fig.items.map(it => { const p = project(fig.cam, it.x, -0.1, 1.2); return { name: it.name, x: p.x, y: p.y + 14 }; }); }

// ---- What the sim and the HUD ask of the view ----
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hitV = new THREE.Vector3();
function mouseWorld() {
  if (!mouse.inside) return null;
  ndc.set(mouse.x / W * 2 - 1, -(mouse.y / H) * 2 + 1); ray.setFromCamera(ndc, camera);
  return ray.ray.intersectPlane(ground, hitV) ? { x: hitV.x, z: hitV.z } : null;
}
const toScreen = (x, y, z) => project(camera, x, y, z);

export { drawFigures, figureLabels, mouseWorld, toScreen };
export { drawPlay, drawTitle } from './frame.js';
