// drawPlay and drawTitle: one 3D frame from the plain-data state (figures, shots, drops, red
// warning marks, effects, lanterns, door, stairs).
//
// The 3D view: a fixed angled top-down camera that follows the hero, the lights, and every
// figure, shot, drop, red warning mark and effect drawn from the plain-data state.

import * as THREE from 'three';
import { tune } from '../config.js';
import { ALPHA } from '../main.js';
import { mouse } from '../platform/input.js';
import { makeRng } from '../math.js';
import { FX, SHAKE, setShake } from '../game/state.js';
import { SPAWN, PLAZA } from '../game/world/floor1.js';
import { doorClosed } from '../game/world/grid.js';
import { M, glowMat, CUT } from './materials.js';
import * as FIG from './figures.js';
import { renderer, scene, camera, heroLight, world, zoom, setZoom, placeCamera, lightsAt } from './scene.js';

const rigs = new Map(); let frameNo = 0, lastT = 0;
function rigFor(key, make) {
  let r = rigs.get(key);
  if (!r) { r = make(); r.base = r.scaler.scale.x; scene.add(r.root); rigs.set(key, r); }
  r.seen = frameNo; return r;
}
function placeRig(r, e, alpha) {
  r.root.position.set(e.px + (e.x - e.px) * alpha, 0, e.pz + (e.z - e.pz) * alpha);
  r.root.rotation.y = e.face;
}
function squash(r, hurt) {
  const k = Math.max(0, hurt / 0.12) * 0.1, b = r.base;
  r.scaler.scale.set(b * (1 + k), b * (1 - k), b * (1 + k));
}
const pAct = a => (a && a.dur ? a.t / a.dur : 0);
function syncHero(s, alpha) {
  const h = s.hero, r = rigFor('hero', FIG.hero);
  FIG.dressHero(r, h.sword, h.armor); placeRig(r, h, alpha);
  const a = h.act;
  FIG.animHumanoid(r, { moving: h.moving, phase: h.walkPhase, kind: a ? a.type : null, p: pAct(a), t: s.t, dead: h.dead ? Math.min(1, h.deathT / 0.7) : 0 });
  squash(r, h.hurtT);
}
function syncBots(s, alpha) {
  for (const b of s.bots) {
    if (!b.alive && b.deadT > 3.2) continue;
    const r = rigFor('b' + b.id, () => FIG.bot(b.name, b.cls));
    placeRig(r, b, alpha);
    const a = b.act;
    FIG.animHumanoid(r, { moving: b.moving, phase: b.walkPhase, kind: a ? a.type : null, p: pAct(a), t: s.t, dead: b.alive ? 0 : Math.min(1, b.deadT / 0.8) });
    r.root.position.y = b.alive ? 0 : -Math.max(0, b.deadT - 1.6) * 1.2;
    squash(r, b.hurtT);
  }
}
const ENEMY_RIG = { wolf: () => FIG.wolf(), brute: () => FIG.brute(), spitter: () => FIG.spitter(), rogue: () => FIG.rogue(), warden: () => FIG.warden() };
const HUMAN_ACT = { stab: 'stab', lungeTele: 'lunge', lunge: 'lunge', sweep: 'sweep', slam: 'slam', bossChargeTele: 'charge', bossCharge: 'charge' };
function syncEnemies(s, alpha) {
  for (const e of s.enemies) {
    if (e.kind === 'warden' && e.dead && e.deadT > 3) continue;
    const r = rigFor('e' + e.id, ENEMY_RIG[e.kind]);
    placeRig(r, e, alpha);
    const a = e.act, dead = e.dead ? Math.min(1, e.deadT / 0.6) : 0;
    if (r.type === 'humanoid') {
      let p = pAct(a);
      if (a && a.type === 'slam') p = Math.min(1, a.t / a.hitAt) * 0.6;
      if (a && a.type === 'sweep') p = a.t < a.hitAt ? (a.t / a.hitAt) * 0.32 : 0.32 + (a.t - a.hitAt) / (a.dur - a.hitAt) * 0.68;
      FIG.animHumanoid(r, { moving: e.moving, phase: e.walkPhase, kind: a ? HUMAN_ACT[a.type] : null, p, t: s.t, dead });
    } else FIG.animBeast(r, { moving: e.moving, phase: e.walkPhase, kind: a ? a.type : null, p: pAct(a), t: s.t, dead });
    if (e.stun > 0 && !e.dead) r.root.rotation.z = Math.sin(s.t * 18) * 0.08; else r.root.rotation.z = 0;
    r.root.position.y = e.dead ? -Math.max(0, e.deadT - 0.9) * 1.4 : 0;
    squash(r, e.hurtT);
  }
}
const things = new Map();
function thingFor(key, make) {
  let t = things.get(key);
  if (!t) { t = { root: make() }; scene.add(t.root); things.set(key, t); }
  t.seen = frameNo; return t;
}
const GLOB = new THREE.SphereGeometry(0.24, 10, 8), GLOBHALO = new THREE.SphereGeometry(0.48, 8, 6), BOLT = new THREE.SphereGeometry(0.16, 8, 6);
const ARROW = new THREE.CylinderGeometry(0.025, 0.025, 0.85, 5).rotateX(Math.PI / 2);
const CRES = new THREE.RingGeometry(0.72, 1, 28, 1, -1.1, 2.2).rotateX(-Math.PI / 2);
function projMesh(p) {
  if (p.kind === 'glob') { const g = new THREE.Group(); g.add(new THREE.Mesh(GLOB, M(0x4a9020, { em: 0x9cff3a, ei: 1.6 }))); g.add(new THREE.Mesh(GLOBHALO, glowMat(0x8cff3a, 0.22))); return g; }
  if (p.kind === 'arrow') return new THREE.Mesh(ARROW, M(0xd8d0c0));
  if (p.kind === 'bolt') return new THREE.Mesh(BOLT, glowMat(0xffc070, 0.95));
  if (p.kind === 'heal') return new THREE.Mesh(BOLT, glowMat(0x9fffb0, 0.95));
  return new THREE.Mesh(CRES, glowMat(0x8fe8ff, 0.9));
}
function syncProjectiles(s, alpha) {
  for (const p of s.projectiles) {
    const t = thingFor('p' + p.id, () => projMesh(p)), m = t.root;
    const x = p.px + (p.x - p.px) * alpha, z = p.pz + (p.z - p.pz) * alpha;
    let y = 1.25;
    if (p.kind === 'glob') { const k = 1 - p.life / p.maxLife; y = 0.9 + Math.sin(Math.max(0, Math.min(1, k)) * Math.PI) * 1.8; }
    if (p.kind === 'crescent') { y = 0.9; m.scale.set(p.r, 1, p.r); m.rotation.y = p.face - Math.PI / 2; }
    if (p.kind === 'arrow') m.rotation.y = p.face;
    m.position.set(x, y, z);
  }
}
function syncDrops(s, alpha) {
  for (const d of s.drops) {
    const t = thingFor('d' + d.id, () => d.type === 'gold' ? FIG.coins(d.amount) : d.type === 'cache' ? FIG.cache() : FIG.groundItem(d.item));
    t.root.position.set(d.px + (d.x - d.px) * alpha, d.y, d.pz + (d.z - d.pz) * alpha);
    t.root.rotation.y = d.settled ? (d.id % 7) * 0.9 : s.t * 9;
  }
}

// ---- Red warning marks on the ground: where a blow will land, filling as it comes ----
const CIRCLE = new THREE.CircleGeometry(1, 40).rotateX(-Math.PI / 2), RING = new THREE.RingGeometry(0.93, 1, 48).rotateX(-Math.PI / 2);
const LINE = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2).translate(0.5, 0, 0);
const coneCache = new Map();
const coneGeo = arc => { const k = arc.toFixed(2); if (!coneCache.has(k)) coneCache.set(k, new THREE.CircleGeometry(1, 32, -arc / 2, arc).rotateX(-Math.PI / 2)); return coneCache.get(k); };
const teles = new Map();
function syncTele(key, T) {
  let m = teles.get(key);
  if (!m) {
    const geo = T.shape === 'circle' ? CIRCLE : T.shape === 'cone' ? coneGeo(T.arc) : LINE;
    m = { g: new THREE.Group() };
    m.base = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xff2a18, transparent: true, opacity: 0.2, depthWrite: false }));
    m.fill = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xff5a2a, transparent: true, opacity: 0.4, depthWrite: false }));
    m.g.add(m.base, m.fill);
    if (T.shape === 'circle') { m.edge = new THREE.Mesh(RING, new THREE.MeshBasicMaterial({ color: 0xff6a3a, transparent: true, opacity: 0.85, depthWrite: false })); m.g.add(m.edge); }
    m.g.renderOrder = 3; scene.add(m.g); teles.set(key, m);
  }
  m.seen = frameNo;
  const k = Math.min(1, T.t / T.dur);
  m.g.position.set(T.x, 0.06, T.z);
  if (T.shape === 'circle') { m.base.scale.setScalar(T.radius); m.edge.scale.setScalar(T.radius); m.fill.scale.setScalar(Math.max(0.01, T.radius * k)); }
  else if (T.shape === 'cone') { m.g.rotation.y = T.face - Math.PI / 2; m.base.scale.setScalar(T.radius); m.fill.scale.setScalar(Math.max(0.01, T.radius * k)); }
  else { m.g.rotation.y = T.face - Math.PI / 2; m.base.scale.set(T.len, 1, T.width); m.fill.scale.set(Math.max(0.01, T.len * k), 1, T.width); }
}
function sweep(map, remove) { for (const [k, v] of map) if (v.seen !== frameNo) { remove(v); map.delete(k); } }

// ---- Effects: slashes, sparks, embers, rings (visual only, never gameplay) ----
const vr = makeRng(5), fx = [], PART = new THREE.BoxGeometry(0.1, 0.1, 0.1), pmats = new Map();
const pmat = c => { if (!pmats.has(c)) pmats.set(c, glowMat(c, 0.95)); return pmats.get(c); };
function particles(x, y, z, n, color, speed, life, rise) {
  for (let i = 0; i < n && fx.length < 420; i++) {
    const m = new THREE.Mesh(PART, pmat(color)); m.position.set(x, y, z); scene.add(m);
    fx.push({ m, kind: 'p', vx: (vr() - 0.5) * speed, vy: rise ? 0.5 + vr() * speed * 0.6 : (vr() - 0.2) * speed, vz: (vr() - 0.5) * speed, life: life * (0.6 + vr() * 0.6), age: 0, grav: rise ? -0.6 : 9 });
  }
}
function flatFx(geo, color, x, y, z, rotY, life, grow, opacity = 0.85) {
  const mat = glowMat(color, opacity), m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z); m.rotation.y = rotY; scene.add(m);
  fx.push({ m, kind: 'flat', life, age: 0, grow, mat, geo, o0: opacity });
}
function spawnFx(f) {
  switch (f.type) {
    case 'slash': {
      const geo = new THREE.RingGeometry(f.reach * 0.45, f.reach, 24, 1, -f.arc * Math.PI / 360, f.arc * Math.PI / 180).rotateX(-Math.PI / 2);
      flatFx(geo, f.color, f.x, 1.0, f.z, f.face - Math.PI / 2, 0.18, 0.15, 0.75); break;
    }
    case 'whirl': flatFx(new THREE.RingGeometry(f.r * 0.55, f.r, 40).rotateX(-Math.PI / 2), 0x8fe8ff, f.x, 0.9, f.z, 0, f.dur, 0.2, 0.7); break;
    case 'ring': flatFx(new THREE.RingGeometry(f.r * 0.8, f.r, 40).rotateX(-Math.PI / 2), f.color, f.x, 0.1, f.z, 0, 0.5, 0.6, 0.8); break;
    case 'spark': particles(f.x, f.y, f.z, f.n, f.color, 6, 0.3, false); break;
    case 'death': {
      const big = f.kind === 'brute' || f.kind === 'warden';
      particles(f.x, big ? 1.4 : 0.8, f.z, big ? 30 : 14, 0xff9a40, big ? 5 : 3.5, 1.1, true);
      particles(f.x, 0.6, f.z, big ? 14 : 6, 0x5a5048, 3, 0.8, true); break;
    }
    case 'fade': particles(f.x, 1.0, f.z, 26, 0xffc070, 2.2, 1.8, true); break;
    case 'level': particles(f.x, 0.3, f.z, 40, 0xf2d257, 3, 1.4, true); flatFx(new THREE.RingGeometry(0.8, 1.1, 40).rotateX(-Math.PI / 2), 0xf2d257, f.x, 0.15, f.z, 0, 0.8, 3, 0.9); break;
    case 'potion': particles(f.x, 0.6, f.z, 16, 0xff5a4a, 2, 0.8, true); break;
    case 'heal': particles(f.x, 0.6, f.z, 10, 0x9fffb0, 1.8, 0.8, true); break;
    case 'dust': particles(f.x, 0.2, f.z, 10, 0x8a8070, 3, 0.5, false); break;
    case 'splash': particles(f.x, 0.4, f.z, 14, 0x8cff3a, 4, 0.5, false); break;
    case 'trail': particles(f.x, 1.0, f.z, 3, 0x8fe8ff, 1, 0.35, true); break;
    default: break;
  }
}
function stepFx(dt) {
  for (let i = fx.length - 1; i >= 0; i--) {
    const f = fx[i]; f.age += dt;
    const k = f.age / f.life;
    if (k >= 1) { scene.remove(f.m); if (f.kind === 'flat') { f.mat.dispose(); f.geo.dispose(); } fx.splice(i, 1); continue; }
    if (f.kind === 'p') {
      f.vy -= f.grav * dt; f.m.position.x += f.vx * dt; f.m.position.y = Math.max(0.05, f.m.position.y + f.vy * dt); f.m.position.z += f.vz * dt;
      f.m.scale.setScalar(1 - k);
    } else { f.m.scale.setScalar(1 + f.grow * k); f.mat.opacity = f.o0 * (1 - k); }
  }
}

// ---- The world's living parts: lanterns, waystones, the door, the stairs ----
function worldTick(s, t) {
  let lit = 0;
  world.lanterns.forEach((L, i) => {
    const b = s.bots[i], on = !!(b && b.alive);
    if (on) { lit++; L.mat.emissiveIntensity = 2.0 + Math.sin(t * 6 + i * 1.7) * 0.25; L.mat.emissive.setHex(0xffb04a); L.halo.visible = true; }
    else { L.mat.emissiveIntensity = 0; L.halo.visible = false; }
  });
  world.wallAnchor.scale = 0.15 + 0.85 * lit / Math.max(1, world.lanterns.length);
  world.crystal.rotation.y = t * 0.6; world.crystal.position.y = world.crystalY + Math.sin(t * 1.4) * 0.12;
  const h = s.hero; // a roof you are standing under is lifted off
  for (const R of world.roofs) { const inside = !!h && h.x > R.x0 && h.x < R.x1 && h.z > R.z0 && h.z < R.z1; for (const o of R.objs) o.visible = !inside; }
  swayFolk(t);
  world.doorStone.rotation.y = t * 0.6;
  world.doorStoneMat.emissiveIntensity = s.doorStone ? 1.6 + Math.sin(t * 2) * 0.2 : 0;
  world.doorSlabs.forEach((m, i) => { const target = (i ? 1 : -1) * (doorClosed ? 2.05 : 6.1); m.position.z += (target - m.position.z) * 0.12; });
  const open = s.stairsOpen;
  world.stairs.veil.visible = !open;
  world.stairs.edgeMat.emissiveIntensity = open ? 1.3 + Math.sin(t * 3) * 0.4 : 0;
  world.stairs.anchor.power = open ? 18 : 0;
}

function swayFolk(t) { // Ashgate's townsfolk shift their weight and look about a little
  const F = world.folk; if (!F) return;
  const d = F.d;
  F.list.forEach((f, i) => {
    const turn = f.face + Math.sin(t * 0.5 + i * 1.7) * 0.3, lean = Math.sin(t * 0.9 + i * 2.3) * 0.03;
    d.position.set(f.x, 0, f.z); d.rotation.set(lean, turn, 0); d.scale.set(1, 1, 1); d.updateMatrix(); F.bodies.setMatrixAt(i, d.matrix);
    d.position.set(f.x + Math.sin(turn) * lean * 1.6, 1.6, f.z + Math.cos(turn) * lean * 1.6); d.rotation.set(0, turn + Math.sin(t * 0.7 + i) * 0.25, 0); d.updateMatrix();
    F.heads.setMatrixAt(i, d.matrix); F.hoods.setMatrixAt(i, d.matrix);
  });
  F.bodies.instanceMatrix.needsUpdate = F.heads.instanceMatrix.needsUpdate = F.hoods.instanceMatrix.needsUpdate = true;
}

function render(s, tx, tz, angle, dist, cut) {
  frameNo++;
  const dtv = Math.max(0, Math.min(0.1, s.t - lastT)); lastT = s.t;
  setShake(Math.max(0, SHAKE - dtv * 2.2));
  placeCamera(camera, tx, tz, 1.0, angle, dist, s.t);
  CUT.cam.value.copy(camera.position); CUT.hero.value.set(tx, 1.0, tz); CUT.r.value = cut ? tune.cutRadius : 0;
  lightsAt(tx, tz, s.t);
  heroLight.intensity = tune.heroLight;
  syncHero(s, ALPHA); syncBots(s, ALPHA); syncEnemies(s, ALPHA); syncDrops(s, ALPHA); syncProjectiles(s, ALPHA);
  for (const e of s.enemies) if (e.tele && !e.dead) syncTele('t' + e.id + e.tele.shape, e.tele);
  while (FX.length) spawnFx(FX.shift());
  stepFx(dtv);
  worldTick(s, s.t);
  sweep(rigs, r => scene.remove(r.root));
  sweep(things, t => scene.remove(t.root));
  sweep(teles, m => scene.remove(m.g));
  renderer.render(scene, camera);
}
function drawPlay(s) {
  if (mouse.wheel) { setZoom(Math.max(tune.camZoomMin, Math.min(tune.camZoomMax, zoom + mouse.wheel * 1.6))); mouse.wheel = 0; }
  const h = s.hero, tx = h.px + (h.x - h.px) * ALPHA, tz = h.pz + (h.z - h.pz) * ALPHA;
  heroLight.position.set(tx, 3.2, tz + 0.6);
  render(s, tx, tz, tune.camAngle, zoom, true);
}
function drawTitle(s) { // the plaza at night, looking north to the Hall of Lanterns
  heroLight.position.set(SPAWN.x, 3.2, SPAWN.z + 0.6);
  render(s, PLAZA.x + Math.sin(s.t * 0.08) * 5, PLAZA.z - 6, 38, 34, false);
}

export { drawPlay, drawTitle };
