// The renderer, scene, camera and lights, the world's meshes built once, and the follow camera with
// zoom.

import * as THREE from 'three';
import { tune } from '../config.js';
import { W, H, CHEAP, worldCanvas, fit } from '../platform/page.js';
import { SHAKE } from '../game/state.js';
import { buildWorld } from './world-meshes.js';

const renderer = new THREE.WebGLRenderer({ canvas: worldCanvas, antialias: !CHEAP, powerPreference: 'high-performance' });
renderer.setPixelRatio(CHEAP ? 0.5 : Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = !CHEAP; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.25;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x07090c); scene.fog = new THREE.Fog(0x090c11, 30, 74);
const camera = new THREE.PerspectiveCamera(tune.camFov, W / H, 0.5, 320);
const hemi = new THREE.HemisphereLight(0x5a6a88, 0x1c1611, 1.2); scene.add(hemi);
const moon = new THREE.DirectionalLight(0xa4b8dc, 1.6);
moon.castShadow = !CHEAP; moon.shadow.mapSize.set(2048, 2048);
Object.assign(moon.shadow.camera, { left: -34, right: 34, top: 34, bottom: -34, near: 1, far: 160 });
moon.shadow.bias = -0.0006; moon.shadow.normalBias = 0.03;
scene.add(moon, moon.target);
const rim = new THREE.DirectionalLight(0x7f9bff, 1.0); scene.add(rim, rim.target);
const heroLight = new THREE.PointLight(0xffc27a, tune.heroLight, 18, 1.3); scene.add(heroLight);
const pool = [];
for (let i = 0; i < 4; i++) { const l = new THREE.PointLight(0xffa040, 0, 22, 1.4); scene.add(l); pool.push(l); }
const world = buildWorld(scene);
function resize(cw, ch) { renderer.setSize(cw, ch, false); }
window.VIEW_RESIZE = resize; fit();

// ---- Camera ----
let zoom = tune.camDist;
function placeCamera(cam, tx, tz, ty, angleDeg, dist, t) {
  const a = angleDeg * Math.PI / 180, k = SHAKE * 0.35 * tune.shake;
  const sx = Math.sin(t * 61) * k, sz = Math.cos(t * 47) * k;
  cam.position.set(tx + sx, ty + Math.sin(a) * dist, tz + Math.cos(a) * dist + sz);
  cam.lookAt(tx + sx * 0.5, ty, tz + sz * 0.5);
  if (cam.fov !== tune.camFov && cam === camera) { cam.fov = tune.camFov; cam.updateProjectionMatrix(); }
  cam.updateMatrixWorld();
}
function lightsAt(tx, tz, t) {
  moon.position.set(tx - 24, 46, tz - 18); moon.target.position.set(tx, 0, tz);
  rim.position.set(tx + 6, 9, tz - 26); rim.target.position.set(tx, 1, tz);
  const list = world.anchors.filter(a => a.power > 0).map(a => ({ a, d: Math.hypot(a.x - tx, a.z - tz) })).sort((p, q) => p.d - q.d);
  pool.forEach((l, i) => {
    const it = list[i];
    if (!it || it.d > 46) { l.intensity = 0; return; }
    const A = it.a, fl = A.flicker ? 0.86 + 0.14 * Math.sin(t * 11 + i * 3) * Math.sin(t * 7.3 + i) : 1;
    l.position.set(A.x, A.y, A.z); l.color.setHex(A.color); l.intensity = A.power * fl * (A.scale ?? 1);
  });
}

// Other modules cannot assign to an imported variable, so they call these.
export function setZoom(v) { zoom = v; return v; }

export { renderer, scene, camera, heroLight, world, zoom, placeCamera, lightsAt };
