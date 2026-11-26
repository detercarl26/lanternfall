// buildWorld: the 3D meshes of every place and prop on Floor 1.

import * as THREE from 'three';
import { CHEAP } from '../platform/page.js';
import { WORLD, TOWN, FIELD, HOLLOW, RIDGE, CRYSTAL, BOARD, FORGE, DOORSTONE, HALL, STAIRS, LANTERN_WALL, PATH, CELL, MAZE_X0, MAZE_Z0, MAZE } from '../game/world/floor1.js';
import { BOT_ROSTER } from '../game/bots/roster.js';
import { GW, GH, HOUSES } from '../game/world/grid.js';
import { wrng, TREES, ROCKS, TUFTS, RUINS } from '../game/world/decor.js';
import { M, glowMat, TEX } from './materials.js';

function buildWorld(scene) {
  const out = { lanterns: [], anchors: [], door: null, doorStone: null, crystal: null, stairs: null, doorSlabs: [] };
  const add = (geo, mat, x, y, z, o = {}) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z);
    if (o.rx) m.rotation.x = o.rx; if (o.ry) m.rotation.y = o.ry; if (o.rz) m.rotation.z = o.rz;
    if (o.s) m.scale.set(o.s[0], o.s[1], o.s[2]);
    m.castShadow = !CHEAP && o.cast !== false; m.receiveShadow = !CHEAP && o.recv !== false;
    (o.parent || scene).add(m); return m;
  };
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const flat = (w, h) => { const g = new THREE.PlaneGeometry(w, h); g.rotateX(-Math.PI / 2); return g; };

  // Ground: the Greyfields, Ashgate's cobbles, the Hollow's red earth, the dirt road.
  add(flat(GW, GH), new THREE.MeshStandardMaterial({ map: TEX.ground(), roughness: 0.95 }), (WORLD.x0 + WORLD.x1) / 2, 0, (WORLD.z0 + WORLD.z1) / 2, { cast: false });
  add(flat(TOWN.x1 - TOWN.x0 + 2, TOWN.z1 - TOWN.z0 + 2), new THREE.MeshStandardMaterial({ map: TEX.cobble(), roughness: 0.9 }), (TOWN.x0 + TOWN.x1) / 2, 0.01, (TOWN.z0 + TOWN.z1) / 2, { cast: false });
  add(flat(HOLLOW.x1 - HOLLOW.x0 + 4, HOLLOW.z1 - HOLLOW.z0 + 4), new THREE.MeshStandardMaterial({ map: TEX.hollow(), roughness: 0.95 }), (HOLLOW.x0 + HOLLOW.x1) / 2, 0.012, (HOLLOW.z0 + HOLLOW.z1) / 2, { cast: false });
  const dirtMat = new THREE.MeshStandardMaterial({ map: TEX.dirt(), transparent: true, depthWrite: false, roughness: 1 });
  for (let i = 0; i < PATH.length - 1; i++) {
    const [ax, az] = PATH[i], [bx, bz] = PATH[i + 1], len = Math.hypot(bx - ax, bz - az) + 3;
    const m = add(flat(len, 5.5), dirtMat, (ax + bx) / 2, 0.02, (az + bz) / 2, { cast: false });
    m.rotation.y = -Math.atan2(bz - az, bx - ax);
  }

  // Ashgate: palisade, gate, houses, the lantern wall, the Waystone, the board, the forge.
  const logGeo = new THREE.CylinderGeometry(0.26, 0.3, 3.4, 6), tipGeo = new THREE.ConeGeometry(0.28, 0.7, 6);
  const logs = [];
  const runLogs = (x0, z0, x1, z1) => {
    const n = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 0.58);
    for (let i = 0; i <= n; i++) logs.push([x0 + (x1 - x0) * i / n, z0 + (z1 - z0) * i / n]);
  };
  const tx0 = TOWN.x0 - 0.5, tx1 = TOWN.x1 + 0.5, tz0 = TOWN.z0 - 0.5, tz1 = TOWN.z1 + 0.5;
  runLogs(tx0, tz0, tx1, tz0); runLogs(tx0, tz1, tx1, tz1); runLogs(tx0, tz0, tx0, tz1);
  runLogs(tx1, tz0, tx1, -4.3); runLogs(tx1, 4.3, tx1, tz1);
  const logMesh = new THREE.InstancedMesh(logGeo, M(0x3a2c20), logs.length), tipMesh = new THREE.InstancedMesh(tipGeo, M(0x4a3828), logs.length);
  const d = new THREE.Object3D();
  logs.forEach(([x, z], i) => {
    const h = 0.85 + wrng() * 0.3;
    d.position.set(x, 1.7 * h, z); d.scale.set(1, h, 1); d.rotation.set(0, wrng() * 3, 0); d.updateMatrix(); logMesh.setMatrixAt(i, d.matrix);
    d.position.set(x, 3.4 * h + 0.3, z); d.scale.set(1, 1, 1); d.updateMatrix(); tipMesh.setMatrixAt(i, d.matrix);
  });
  for (const im of [logMesh, tipMesh]) { im.castShadow = !CHEAP; im.receiveShadow = !CHEAP; scene.add(im); }
  for (const z of [-4.6, 4.6]) {
    add(new THREE.CylinderGeometry(0.4, 0.45, 5, 8), M(0x2e241a), TOWN.x1 + 0.5, 2.5, z);
    add(box(0.25, 0.5, 0.25), M(0x1a1a1a, { metal: 0.6 }), TOWN.x1 + 1.1, 3.2, z);
    add(new THREE.ConeGeometry(0.16, 0.45, 6), glowMat(0xffa040), TOWN.x1 + 1.1, 3.65, z, { cast: false });
    out.anchors.push({ x: TOWN.x1 + 1.6, y: 3.6, z, color: 0xffa24a, power: 14, flicker: true });
  }
  add(box(0.6, 0.6, 10.4), M(0x2e241a), TOWN.x1 + 0.5, 5.1, 0);

  for (const h of HOUSES) {
    const g = new THREE.Group(); g.position.set(h.x, 0, h.z); scene.add(g);
    add(box(h.w, 3.2, h.d), M(0x4a4138), 0, 1.6, 0, { parent: g });
    for (const sx of [-1, 1]) add(box(0.22, 3.25, 0.22), M(0x2a1f17), sx * (h.w / 2 - 0.1), 1.62, h.d / 2 + 0.02, { parent: g });
    add(box(h.w + 0.1, 0.22, 0.22), M(0x2a1f17), 0, 3.1, h.d / 2 + 0.03, { parent: g });
    const roof = add(new THREE.ConeGeometry(1, 1, 4), M(h.roof), 0, 3.2 + 1.3, 0, { parent: g, ry: Math.PI / 4 });
    roof.scale.set(h.w * 0.78, 2.6, h.d * 0.78);
    add(box(1.0, 1.8, 0.1), M(0x24190f), 0, 0.9, h.d / 2 + 0.06, { parent: g });
    for (const sx of [-1, 1]) add(box(0.7, 0.6, 0.06), M(0x000000, { em: 0xffa64d, ei: 1.4 }), sx * h.w * 0.28, 1.9, h.d / 2 + 0.05, { parent: g, cast: false });
    add(box(0.6, 1.4, 0.6), M(0x3a3430), h.w * 0.25, 4.6, -h.d * 0.2, { parent: g });
  }

  // The lantern wall: one lantern for each bot player on this floor; it goes dark when they fall.
  const lw = LANTERN_WALL, wlen = lw.x1 - lw.x0;
  add(box(wlen, 2.9, 0.9), M(0x3b3833), (lw.x0 + lw.x1) / 2, 1.45, lw.z - 0.6);
  add(box(wlen + 0.4, 0.3, 1.2), M(0x2c2a27), (lw.x0 + lw.x1) / 2, 3.0, lw.z - 0.6);
  for (let i = 0; i < BOT_ROSTER.length; i++) {
    const x = lw.x0 + 1.2 + i * (wlen - 2.4) / (BOT_ROSTER.length - 1);
    add(box(0.08, 0.08, 0.5), M(0x1c1c1c, { metal: 0.6 }), x, 2.35, lw.z - 0.05, { cast: false });
    const glass = new THREE.MeshStandardMaterial({ color: 0x2a1a08, emissive: 0xffb04a, emissiveIntensity: 2.2, roughness: 0.4 });
    const lan = add(new THREE.CylinderGeometry(0.15, 0.15, 0.36, 6), glass, x, 2.0, lw.z + 0.22, { cast: false });
    add(new THREE.ConeGeometry(0.2, 0.18, 6), M(0x1a1a1a, { metal: 0.6 }), x, 2.27, lw.z + 0.22, { cast: false });
    add(box(0.34, 0.04, 0.34), M(0x1a1a1a, { metal: 0.6 }), x, 1.81, lw.z + 0.22, { cast: false });
    const halo = add(new THREE.SphereGeometry(0.42, 10, 8), glowMat(0xffa040, 0.22), x, 2.0, lw.z + 0.24, { cast: false });
    out.lanterns.push({ mat: glass, halo, lit: true, x, z: lw.z + 0.22 });
  }
  out.wallAnchor = { x: (lw.x0 + lw.x1) / 2, y: 2.6, z: lw.z + 2.2, color: 0xffb257, power: 22, flicker: true };
  out.anchors.push(out.wallAnchor);

  const cr = CRYSTAL;
  add(new THREE.CylinderGeometry(0.9, 1.1, 0.6, 8), M(0x3d3a36), cr.x, 0.3, cr.z);
  add(new THREE.CylinderGeometry(0.55, 0.7, 0.5, 8), M(0x35322e), cr.x, 0.85, cr.z);
  out.crystal = add(new THREE.OctahedronGeometry(0.62, 0), M(0x5a8fb8, { em: 0x3f96df, ei: 1.1, rough: 0.25 }), cr.x, 2.0, cr.z, { cast: false });
  out.crystal.scale.set(0.8, 1.35, 0.8);
  out.anchors.push({ x: cr.x, y: 2.4, z: cr.z + 0.6, color: 0x8fd0ff, power: 16, flicker: false });

  const bd = BOARD;
  for (const sx of [-1, 1]) add(box(0.18, 2.6, 0.18), M(0x3a2c20), bd.x + sx * 1.1, 1.3, bd.z);
  add(box(2.6, 1.5, 0.12), M(0x4a3826), bd.x, 1.7, bd.z + 0.05);
  for (let i = 0; i < 5; i++) add(new THREE.PlaneGeometry(0.42, 0.52), M(0xcfc2a0, { side: THREE.DoubleSide }), bd.x - 0.9 + i * 0.45, 1.7 + (i % 2) * 0.22 - 0.1, bd.z + 0.12, { cast: false, rz: (wrng() - 0.5) * 0.2 });
  add(new THREE.ConeGeometry(1.0, 0.5, 4), M(0x2b2a31), bd.x, 2.85, bd.z, { ry: Math.PI / 4, s: [1.6, 1, 0.5] });

  const fg = FORGE;
  add(box(1.6, 1.0, 1.4), M(0x3a3430), fg.x, 0.5, fg.z);
  add(box(1.2, 0.2, 1.0), M(0x000000, { em: 0xff6a1a, ei: 2 }), fg.x, 1.02, fg.z, { cast: false });
  add(box(0.9, 0.5, 0.4), M(0x2a2a2c, { metal: 0.7, rough: 0.5 }), fg.x + 1.8, 0.75, fg.z);
  add(box(0.4, 0.5, 0.3), M(0x2a2a2c, { metal: 0.7, rough: 0.5 }), fg.x + 1.8, 0.25, fg.z);
  out.anchors.push({ x: fg.x, y: 1.8, z: fg.z + 0.8, color: 0xff7a2a, power: 14, flicker: true });

  // The Greyfields and the Hollow: dead trees, rocks, dry grass, ruins, the road's torches.
  const trunkGeo = new THREE.CylinderGeometry(0.14, 0.3, 1, 6), branchGeo = new THREE.CylinderGeometry(0.04, 0.1, 1, 5);
  const branches = TREES.reduce((n, t) => n + t.n, 0);
  const trunks = new THREE.InstancedMesh(trunkGeo, M(0x2a221c), TREES.length), brs = new THREE.InstancedMesh(branchGeo, M(0x2a221c), branches);
  let bi = 0;
  TREES.forEach((t, i) => {
    d.position.set(t.x, t.h / 2, t.z); d.rotation.set(t.lean, t.rot, t.lean * 0.5); d.scale.set(1, t.h, 1); d.updateMatrix(); trunks.setMatrixAt(i, d.matrix);
    for (let k = 0; k < t.n; k++) {
      const a = t.rot + k * 2.1, y = t.h * (0.45 + 0.17 * k), L = 1.2 + 0.6 * ((k + 1) % 2);
      d.position.set(t.x + Math.cos(a) * L * 0.4, y + L * 0.3, t.z + Math.sin(a) * L * 0.4);
      d.rotation.set(0, -a, 0.9); d.scale.set(1, L, 1); d.updateMatrix(); brs.setMatrixAt(bi++, d.matrix);
    }
  });
  for (const im of [trunks, brs]) { im.castShadow = !CHEAP; scene.add(im); }

  const rockGeo = new THREE.DodecahedronGeometry(1, 0);
  const rocks = new THREE.InstancedMesh(rockGeo, M(0xffffff, { flat: true }), ROCKS.length);
  const rc = new THREE.Color();
  ROCKS.forEach((r, i) => {
    d.position.set(r.x, r.s * 0.35, r.z); d.rotation.set(r.rot, r.rot * 2, 0); d.scale.set(r.s, r.s * 0.7, r.s * 0.9); d.updateMatrix();
    rocks.setMatrixAt(i, d.matrix); rc.setHSL(0.08, 0.06, 0.2 + (i % 5) * 0.025); rocks.setColorAt(i, rc);
  });
  rocks.castShadow = !CHEAP; rocks.receiveShadow = !CHEAP; scene.add(rocks);

  // The edge of the floor: boulders along every border, so the walls read as cliffs.
  const edge = [];
  const runEdge = (x0, z0, x1, z1) => { const n = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 3.2); for (let i = 0; i <= n; i++) edge.push([x0 + (x1 - x0) * i / n, z0 + (z1 - z0) * i / n]); };
  runEdge(FIELD.x0 - 1.5, FIELD.z1 + 1.5, FIELD.x1 + 1.5, FIELD.z1 + 1.5);
  runEdge(FIELD.x0 - 1.5, FIELD.z0 - 1.5, FIELD.x0 - 1.5, FIELD.z1 + 1.5);
  runEdge(FIELD.x0 - 1.5, FIELD.z0 - 1.5, RIDGE.gaps[0][0], FIELD.z0 - 1.5);
  runEdge(RIDGE.gaps[0][1], FIELD.z0 - 1.5, RIDGE.gaps[1][0], FIELD.z0 - 1.5);
  runEdge(RIDGE.gaps[1][1], FIELD.z0 - 1.5, FIELD.x1 + 1.5, FIELD.z0 - 1.5);
  runEdge(FIELD.x1 + 1.5, FIELD.z0 - 1.5, FIELD.x1 + 1.5, -21); runEdge(FIELD.x1 + 1.5, -11, FIELD.x1 + 1.5, FIELD.z1 + 1.5);
  runEdge(HOLLOW.x0 - 1.5, HOLLOW.z0 - 1.5, HOLLOW.x1 + 1.5, HOLLOW.z0 - 1.5);
  runEdge(HOLLOW.x0 - 1.5, HOLLOW.z0 - 1.5, HOLLOW.x0 - 1.5, -63);
  runEdge(HOLLOW.x1 + 1.5, HOLLOW.z0 - 1.5, HOLLOW.x1 + 1.5, -63);
  const boulders = new THREE.InstancedMesh(rockGeo, M(0xffffff, { flat: true }), edge.length);
  edge.forEach(([x, z], i) => {
    const s = 1.8 + wrng() * 2.2;
    d.position.set(x, s * 0.5, z); d.rotation.set(wrng() * 3, wrng() * 3, 0); d.scale.set(s, s * (0.9 + wrng() * 0.8), s); d.updateMatrix();
    boulders.setMatrixAt(i, d.matrix); rc.setHSL(0.07, 0.05, 0.15 + wrng() * 0.06); boulders.setColorAt(i, rc);
  });
  boulders.castShadow = !CHEAP; boulders.receiveShadow = !CHEAP; scene.add(boulders);

  const tuftGeo = new THREE.ConeGeometry(0.06, 0.7, 4);
  const tufts = new THREE.InstancedMesh(tuftGeo, M(0xffffff), TUFTS.length * 3);
  let ti = 0;
  for (const t of TUFTS) {
    const hollow = t.z < -64;
    for (let k = 0; k < 3; k++) {
      d.position.set(t.x + (k - 1) * 0.12, 0.3 * t.s, t.z + ((k * 7) % 3 - 1) * 0.1);
      d.rotation.set(t.tilt + (k - 1) * 0.25, t.rot, (k - 1) * 0.3); d.scale.set(1, t.s, 1); d.updateMatrix();
      tufts.setMatrixAt(ti, d.matrix);
      if (hollow) rc.setHSL(0.02 + t.hue * 0.03, 0.35, 0.16 + t.hue * 0.08); else rc.setHSL(0.13 + t.hue * 0.08, 0.3, 0.17 + t.hue * 0.1);
      tufts.setColorAt(ti++, rc);
    }
  }
  scene.add(tufts);

  for (const r of RUINS) {
    for (let k = 0; k < 3; k++) {
      const a = k * 2.2 + r.x, h = 1.2 + ((k * 37 + r.x) % 3);
      add(new THREE.CylinderGeometry(0.5, 0.55, h, 8), M(0x55524b), r.x + Math.cos(a) * 1.6, h / 2, r.z + Math.sin(a) * 1.6);
    }
    add(box(2.4, 0.6, 1.0), M(0x4d4a44), r.x + 0.5, 0.3, r.z + 1.8, { ry: 0.6 });
  }

  const torchAt = (x, z, light) => {
    add(new THREE.CylinderGeometry(0.08, 0.12, 2.2, 6), M(0x2a2018), x, 1.1, z);
    add(new THREE.ConeGeometry(0.14, 0.45, 6), glowMat(0xffa040), x, 2.4, z, { cast: false });
    add(new THREE.SphereGeometry(0.35, 8, 6), glowMat(0xff8a2a, 0.25), x, 2.35, z, { cast: false });
    if (light) out.anchors.push({ x, y: 2.6, z, color: 0xff9a3a, power: 12, flicker: true });
  };
  [[26, 4.5], [50, -3.5], [74, 3.5], [96, -12.5], [114, -19.5]].forEach(([x, z]) => torchAt(x, z, true));

  // The Red Hollow's border: red banners at both gaps and a warning post.
  const bannerMat = M(0x8a1c1c, { side: THREE.DoubleSide, rough: 0.7 });
  for (const [a, b] of RIDGE.gaps) for (const x of [a - 0.5, b + 0.5]) {
    add(new THREE.CylinderGeometry(0.1, 0.12, 4.2, 6), M(0x2a2018), x, 2.1, -63.5);
    const cloth = add(new THREE.PlaneGeometry(1.0, 1.8), bannerMat, x + 0.55, 3.0, -63.5, { cast: false });
    cloth.rotation.y = 0.1;
  }
  for (const [a, b] of RIDGE.gaps) {
    add(box(0.14, 1.6, 0.14), M(0x2a2018), (a + b) / 2 - 3.6, 0.8, -59.5);
    add(box(1.4, 0.8, 0.1), M(0x5a1a16), (a + b) / 2 - 3.6, 1.5, -59.45);
  }
  // the ridge itself: a row of jagged rocks between the field and the Hollow
  const ridgeRocks = [];
  for (let x = RIDGE.x0; x <= RIDGE.x1; x += 2.1) {
    if (RIDGE.gaps.some(([a, b]) => x > a - 0.8 && x < b + 0.8)) continue;
    ridgeRocks.push(x);
  }
  const ridge = new THREE.InstancedMesh(rockGeo, M(0x3e3a35, { flat: true }), ridgeRocks.length);
  ridgeRocks.forEach((x, i) => {
    const s = 1.6 + wrng() * 1.2;
    d.position.set(x, s * 0.6, -64 + (wrng() - 0.5)); d.rotation.set(wrng() * 3, wrng() * 3, 0); d.scale.set(s, s * 1.3, s); d.updateMatrix();
    ridge.setMatrixAt(i, d.matrix);
  });
  ridge.castShadow = !CHEAP; ridge.receiveShadow = !CHEAP; scene.add(ridge);
  out.anchors.push({ x: 79, y: 3, z: -88, color: 0xff4a3a, power: 10, flicker: true });

  // The Sunken Stair: flagstone floor, stone walls, wall torches.
  const mazeW = MAZE[0].length * CELL, mazeH = MAZE.length * CELL;
  add(flat(mazeW + 4, mazeH), new THREE.MeshStandardMaterial({ map: TEX.flag(mazeW / 8, mazeH / 8), roughness: 0.9 }), MAZE_X0 + mazeW / 2 - 2, 0.015, MAZE_Z0 + mazeH / 2, { cast: false });
  const wallCells = [];
  const isFloor = (r, c) => r >= 0 && c >= 0 && r < MAZE.length && c < MAZE[0].length && MAZE[r][c] === '.';
  for (let r = 0; r < MAZE.length; r++) for (let c = 0; c < MAZE[0].length; c++) {
    if (MAZE[r][c] !== '#') continue;
    let near = false;
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (isFloor(r + dr, c + dc)) near = true;
    if (near || r === 0 || c === 0 || r === MAZE.length - 1 || c === MAZE[0].length - 1) wallCells.push([r, c]);
  }
  const walls = new THREE.InstancedMesh(box(CELL, 1, CELL), M(0xffffff, { flat: true }), wallCells.length);
  wallCells.forEach(([r, c], i) => {
    const h = 3.4 + wrng() * 1.4;
    d.position.set(MAZE_X0 + c * CELL + CELL / 2, h / 2, MAZE_Z0 + r * CELL + CELL / 2); d.rotation.set(0, 0, 0); d.scale.set(1, h, 1); d.updateMatrix();
    walls.setMatrixAt(i, d.matrix); rc.setHSL(0.08, 0.07, 0.2 + wrng() * 0.08); walls.setColorAt(i, rc);
  });
  walls.castShadow = !CHEAP; walls.receiveShadow = !CHEAP; scene.add(walls);
  [[124.6, -21.5], [150, -38.6], [178, -21], [189.4, -14], [167, -6.6], [194.6, 6]].forEach(([x, z]) => torchAt(x, z, true));

  // The Waystone at the Warden's door: dark until you reach it.
  const ds = DOORSTONE;
  add(new THREE.CylinderGeometry(0.8, 1.0, 0.5, 8), M(0x3d3a36), ds.x, 0.25, ds.z);
  const dsMat = new THREE.MeshStandardMaterial({ color: 0x3a4650, emissive: 0x6fc6ff, emissiveIntensity: 0.0, roughness: 0.3 });
  out.doorStone = add(new THREE.OctahedronGeometry(0.5, 0), dsMat, ds.x, 1.6, ds.z, { cast: false });
  out.doorStone.scale.set(0.8, 1.35, 0.8); out.doorStoneMat = dsMat;

  // Warden's Hall: a round floor, a ring of standing stones, pillars, braziers, the door, the stairs.
  add(new THREE.CircleGeometry(HALL.r + 1, 56).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: TEX.flag(6, 6), roughness: 0.85 }), HALL.x, 0.02, HALL.z, { cast: false });
  add(new THREE.RingGeometry(6.2, 6.6, 64).rotateX(-Math.PI / 2), M(0x000000, { em: 0x8a2a1a, ei: 1.2, side: THREE.DoubleSide }), HALL.x, 0.03, HALL.z, { cast: false });
  add(new THREE.RingGeometry(10.4, 10.6, 64).rotateX(-Math.PI / 2), M(0x000000, { em: 0x5a1a12, ei: 1.0, side: THREE.DoubleSide }), HALL.x, 0.03, HALL.z, { cast: false });
  const stones = [];
  for (let a = 0; a < 360; a += 7.5) { if (Math.abs(a - 180) < 14 || a < 12 || a > 348) continue; stones.push(a * Math.PI / 180); }
  const hallWall = new THREE.InstancedMesh(box(2.4, 1, 1.6), M(0x46423c, { flat: true }), stones.length);
  stones.forEach((a, i) => {
    const h = 5 + wrng() * 2.5;
    d.position.set(HALL.x + Math.cos(a) * (HALL.r + 1.2), h / 2, HALL.z + Math.sin(a) * (HALL.r + 1.2)); d.rotation.set(0, -a, 0); d.scale.set(1, h, 1); d.updateMatrix();
    hallWall.setMatrixAt(i, d.matrix);
  });
  hallWall.castShadow = !CHEAP; hallWall.receiveShadow = !CHEAP; scene.add(hallWall);
  for (let k = 0; k < 8; k++) {
    const a = k * Math.PI / 4 + Math.PI / 8, x = HALL.x + Math.cos(a) * 12, z = HALL.z + Math.sin(a) * 12;
    add(new THREE.CylinderGeometry(0.9, 1.05, 7, 10), M(0x524d45), x, 3.5, z);
    add(box(2.2, 0.5, 2.2), M(0x3e3a34), x, 7.1, z);
  }
  for (const z of [-11, 11]) {
    add(new THREE.CylinderGeometry(0.6, 0.4, 1.2, 8), M(0x2a2622, { metal: 0.5 }), HALL.x - 3, 0.6, z);
    add(new THREE.ConeGeometry(0.5, 1.0, 7), glowMat(0xff5a2a), HALL.x - 3, 1.6, z, { cast: false });
    out.anchors.push({ x: HALL.x - 3, y: 2.4, z, color: 0xff5a30, power: 20, flicker: true });
  }
  const slabMat = M(0x3b3732, { flat: true });
  for (const sz of [-1, 1]) out.doorSlabs.push(add(box(1.2, 6, 4.1), slabMat, 201, 3, sz * 6.1));
  add(box(1.8, 1.4, 12.5), M(0x34302b), 201, 6.7, 0);
  for (const sz of [-1, 1]) add(box(1.8, 6, 2.2), M(0x34302b), 201, 3, sz * 5.4);

  const stepsMat = M(0x4a463f), edgeMat = new THREE.MeshStandardMaterial({ color: 0x223040, emissive: 0x8fd6ff, emissiveIntensity: 0.0 });
  for (let i = 0; i < 6; i++) {
    const h = 0.38 * (i + 1);
    add(box(1.3, h, 6), stepsMat, STAIRS.x + 0.6 + i * 1.3, h / 2, STAIRS.z);
    add(box(0.12, 0.06, 6), edgeMat, STAIRS.x + i * 1.3, h + 0.02, STAIRS.z, { cast: false });
  }
  const veil = add(new THREE.PlaneGeometry(6.4, 5.5), new THREE.MeshBasicMaterial({ color: 0x0a0606, transparent: true, opacity: 0.82, side: THREE.DoubleSide }), STAIRS.x - 0.4, 2.75, STAIRS.z, { cast: false, ry: Math.PI / 2 });
  out.stairs = { veil, edgeMat, anchor: { x: STAIRS.x + 2, y: 3, z: STAIRS.z, color: 0x9fe0ff, power: 0, flicker: false } };
  out.anchors.push(out.stairs.anchor);
  return out;
}

export { buildWorld };
