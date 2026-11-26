// FIG: every figure built from parts (the hero, bot classes, rogues, beasts, the Warden, loot on
// the ground) and their animations.
//
// Every figure, drawn in 3D from parts: the hero, the three bot-player classes, rogues, the
// three beasts and the Warden, each with its own silhouette, and their animations.

import * as THREE from 'three';
import { CHEAP } from '../platform/page.js';
import { lerp, ease, clamp01 } from '../math.js';
import { RHEX } from '../game/loot/items.js';
import { M, glowMat } from './materials.js';

const capCache = new Map();
const cap = (r, len) => { const k = r + ':' + len; if (!capCache.has(k)) capCache.set(k, new THREE.CapsuleGeometry(r, len, 4, 8)); return capCache.get(k); };
const SPH = new THREE.SphereGeometry(1, 14, 10), BOX = new THREE.BoxGeometry(1, 1, 1);
const CYL = new THREE.CylinderGeometry(1, 1, 1, 10), CONE = new THREE.ConeGeometry(1, 1, 10);
const BOW = new THREE.TorusGeometry(0.5, 0.028, 5, 18, 1.9);

function part(parent, geo, mat, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.rotation.set(rx, ry, rz);
  m.castShadow = !CHEAP; parent.add(m); return m;
}
function grp(parent, x = 0, y = 0, z = 0) { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; }
function hued(name, s, l) { // a colour of its own for each bot player, from their name
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 997;
  return new THREE.Color().setHSL((h % 360) / 360, s, l).getHex();
}
const BLADE = [M(0xb8bcc4, { metal: 0.85, rough: 0.3 }), M(0xa8b6ff, { metal: 0.8, rough: 0.3, em: 0x2a3cff, ei: 0.55 }),
  M(0xeed88a, { metal: 0.85, rough: 0.3, em: 0x6a5010, ei: 0.5 }), M(0xffb070, { metal: 0.7, rough: 0.3, em: 0xff5a10, ei: 1.0 })];
const COAT = [M(0x4a4036), M(0x2f4170, { rough: 0.6 }), M(0x6a5626, { rough: 0.55, metal: 0.3 }), M(0x7a3216, { rough: 0.5, metal: 0.3, em: 0x3a0e00, ei: 0.6 })];

// ---- People ----------------------------------------------------------------------------------
function humanoid(o) {
  const root = new THREE.Group(), scaler = grp(root);
  const body = grp(scaler, 0, 0.62, 0), hips = grp(body, 0, 0.33, 0);
  const skin = M(o.skin ?? 0xc9a184), cloth = M(o.cloth), pants = M(o.pants ?? 0x2a2622), boot = M(0x1e1a16);
  const armor = o.armorMat || M(o.armor, { metal: o.metal ? 0.6 : 0.08, rough: o.metal ? 0.45 : 0.8 });
  const trim = M(o.trim ?? 0x6a5a40, { metal: 0.45, rough: 0.6 });
  const lLeg = grp(hips, 0.12, 0, 0), rLeg = grp(hips, -0.12, 0, 0);
  for (const L of [lLeg, rLeg]) { part(L, cap(0.1, 0.55), pants, 0, -0.42, 0); part(L, BOX, boot, 0, -0.86, 0.05, 0.17, 0.16, 0.3); }
  const torso = grp(hips, 0, 0.02, 0);
  const chest = part(torso, cap(0.23, 0.3), armor, 0, 0.36, 0, 1, 1, 0.78);
  part(torso, BOX, M(0x2a2018), 0, 0.1, 0, 0.5, 0.09, 0.38);
  const ps = o.pads ?? 1;
  for (const s of [-1, 1]) part(torso, SPH, trim, s * 0.29, 0.6, 0, 0.14 * ps, 0.11 * ps, 0.15 * ps);
  const head = grp(torso, 0, 0.84, 0);
  part(head, SPH, skin, 0, 0, 0, 0.15, 0.17, 0.16);
  const hg = o.head;
  if (hg === 'hair') { part(head, SPH, M(o.hair ?? 0x1d1612), 0, 0.05, -0.03, 0.165, 0.15, 0.17); part(head, BOX, M(o.hair ?? 0x1d1612), 0, -0.08, -0.13, 0.22, 0.2, 0.08); }
  if (hg === 'hood') { const hm = M(o.hood); part(head, SPH, hm, 0, 0.02, -0.04, 0.2, 0.21, 0.21); part(head, CONE, hm, 0, 0.2, -0.1, 0.13, 0.3, 0.13, -0.5, 0, 0); }
  if (hg === 'helm') { const hm = M(0x7a7e88, { metal: 0.7, rough: 0.4 }); part(head, SPH, hm, 0, 0.04, 0, 0.18, 0.18, 0.19); part(head, BOX, M(o.crest ?? 0x8a2020), 0, 0.22, -0.02, 0.05, 0.14, 0.32); part(head, BOX, M(0x111111), 0, 0.0, 0.17, 0.2, 0.03, 0.02); }
  if (hg === 'warden') {
    const hm = M(0x2e2e34, { metal: 0.7, rough: 0.45 });
    part(head, CYL, hm, 0, 0.06, 0, 0.2, 0.36, 0.2);
    part(head, BOX, M(0x000000, { em: 0xff7a2a, ei: 3 }), 0, 0.03, 0.19, 0.22, 0.035, 0.03);
    for (const s of [-1, 1]) part(head, CONE, M(0xcfc3a5, { rough: 0.6 }), s * 0.26, 0.22, 0, 0.06, 0.42, 0.06, 0, 0, -s * 1.0);
  }
  if (o.scarf) part(torso, BOX, M(o.scarf), 0, 0.7, 0.05, 0.36, 0.12, 0.3);
  if (o.sack) { part(torso, SPH, M(0x5a4630), 0, 0.42, -0.32, 0.26, 0.3, 0.2); part(torso, BOX, M(0x8a1a1a), 0, 0.68, -0.3, 0.12, 0.05, 0.12); }
  if (o.quiver) { part(torso, CYL, M(0x4a3420), 0.13, 0.48, -0.24, 0.08, 0.55, 0.08, 0.3, 0, 0.25); for (let i = 0; i < 3; i++) part(torso, BOX, M(0xd8d0c0), 0.16 + i * 0.03, 0.82, -0.32, 0.03, 0.09, 0.015, 0.3, 0, 0.25); }
  let capeMesh = null;
  if (o.cape) { const cg = grp(torso, 0, 0.62, -0.2); capeMesh = part(cg, BOX, M(o.cape, { side: THREE.DoubleSide }), 0, -0.52, -0.02, 0.5, 1.05, 0.04); capeMesh.userData.cg = cg; }
  if (o.robe) part(hips, CONE, M(o.robe), 0, -0.42, 0, 0.36, 0.95, 0.32);
  const arm = side => {
    const sh = grp(torso, side * 0.33, 0.58, 0), pitch = grp(sh);
    part(pitch, cap(0.075, 0.4), o.sleeve ? M(o.sleeve) : cloth, 0, -0.27, 0);
    const hand = grp(pitch, 0, -0.55, 0); part(hand, SPH, skin, 0, 0, 0, 0.07, 0.07, 0.07);
    return { sh, pitch, hand };
  };
  const L = arm(1), R = arm(-1);
  let bladePivot = null, blade = null;
  if (o.weapon === 'sword' || o.weapon === 'cleaver') {
    const w = grp(R.hand); w.rotation.x = 0.15;
    const big = o.weapon === 'cleaver';
    part(w, CYL, M(0x2a1f17), 0, -0.05, 0, 0.035, big ? 0.3 : 0.18, 0.035);
    part(w, BOX, trim, 0, big ? -0.22 : -0.16, 0, big ? 0.4 : 0.26, 0.05, 0.07);
    bladePivot = grp(w, 0, big ? -0.22 : -0.17, 0);
    blade = part(bladePivot, BOX, o.bladeMat || BLADE[0], 0, big ? -0.62 : -0.45, big ? 0.08 : 0, big ? 0.36 : 0.075, big ? 1.25 : 0.9, big ? 0.06 : 0.022);
  }
  if (o.weapon === 'daggers') for (const h of [R.hand, L.hand]) {
    const w = grp(h); part(w, BOX, M(0x9aa0a8, { metal: 0.85, rough: 0.3 }), 0, -0.24, 0.05, 0.05, 0.38, 0.015, 0.25); part(w, BOX, M(0x2a1f17), 0, -0.04, 0, 0.05, 0.1, 0.05);
  }
  if (o.weapon === 'bow') {
    const outer = grp(L.hand, 0, 0.5, 0); outer.rotation.y = Math.PI / 2;
    const bow = part(outer, BOW, M(0x5a3a1e), 0, 0, 0); bow.rotation.z = -Math.PI / 2 - 0.95;
    part(L.hand, CYL, M(0xd8d0c0), 0, 0.21, 0, 0.007, 0.82, 0.007, Math.PI / 2, 0, 0);
  }
  if (o.weapon === 'staff') {
    part(R.hand, CYL, M(0x4a3420), 0, 0.2, 0.05, 0.04, 1.8, 0.04);
    part(R.hand, SPH, M(0x2a1a08, { em: 0xffb04a, ei: 2.4 }), 0, 1.16, 0.05, 0.12, 0.12, 0.12);
    part(R.hand, BOX, M(0x1a1a1a, { metal: 0.6 }), 0, 1.16, 0.05, 0.03, 0.3, 0.03);
  }
  if (o.offhand === 'shield') {
    part(L.hand, CYL, M(o.shield ?? 0x5a4a3a), 0.0, 0.05, 0.1, 0.36, 0.06, 0.36, Math.PI / 2, 0, 0);
    part(L.hand, SPH, M(0x9a9aa0, { metal: 0.7, rough: 0.4 }), 0, 0.05, 0.15, 0.08, 0.08, 0.05);
  }
  if (o.lantern) part(torso, CYL, M(0x000000, { em: 0xffa040, ei: 2.5 }), 0.26, 0.02, 0.22, 0.07, 0.15, 0.07);
  return { type: 'humanoid', root, scaler, body, hips, torso, head, lLeg, rLeg, L, R, chest, blade, bladePivot, cape: capeMesh, weapon: o.weapon, gearKey: '' };
}

function animHumanoid(rig, a) {
  const { body, torso, lLeg, rLeg, L, R } = rig;
  body.rotation.set(0, 0, 0); body.position.y = 0.62; torso.rotation.set(0, 0, 0);
  L.sh.rotation.set(0, 0, 0); R.sh.rotation.set(0, 0, 0); L.pitch.rotation.set(0, 0, 0); R.pitch.rotation.set(0, 0, 0);
  const mv = a.moving || 0, sw = Math.sin(a.phase || 0) * 0.75 * mv;
  lLeg.rotation.x = sw; rLeg.rotation.x = -sw;
  L.pitch.rotation.x = -sw * 0.6; R.pitch.rotation.x = sw * 0.5 - (rig.weapon === 'sword' ? 0.35 : 0.1);
  if (rig.weapon === 'bow') L.pitch.rotation.x = -0.25 - sw * 0.4;
  body.position.y = 0.62 + Math.abs(Math.cos(a.phase || 0)) * 0.04 * mv;
  if (rig.cape) rig.cape.userData.cg.rotation.x = 0.15 + mv * 0.35 + Math.sin((a.t || 0) * 3) * 0.04;
  const p = clamp01(a.p || 0);
  switch (a.kind) {
    case 'swing': case 'sweep': {
      if (p < 0.3) { const k = ease(p / 0.3); R.sh.rotation.y = lerp(0, -1.2, k); R.pitch.rotation.x = lerp(-0.35, -1.45, k); torso.rotation.y = lerp(0, -0.5, k); }
      else if (p < 0.6) { const k = ease((p - 0.3) / 0.3); R.sh.rotation.y = lerp(-1.2, 1.3, k); R.pitch.rotation.x = -1.45; torso.rotation.y = lerp(-0.5, 0.6, k); }
      else { const k = ease((p - 0.6) / 0.4); R.sh.rotation.y = lerp(1.3, 0, k); R.pitch.rotation.x = lerp(-1.45, -0.35, k); torso.rotation.y = lerp(0.6, 0, k); }
      break;
    }
    case 'whirl': body.rotation.y = p * Math.PI * 2; R.pitch.rotation.x = -1.5; R.sh.rotation.y = -1.45; L.pitch.rotation.x = -0.6; break;
    case 'lunge': case 'charge': body.rotation.x = 0.38; R.pitch.rotation.x = a.kind === 'lunge' ? -1.55 : 0.6; L.pitch.rotation.x = 0.6; lLeg.rotation.x = 0.6; rLeg.rotation.x = -0.5; break;
    case 'crescent': case 'slam': {
      if (p < 0.45) { const k = ease(p / 0.45); R.pitch.rotation.x = lerp(-0.35, -3.0, k); L.pitch.rotation.x = lerp(0, -2.6, k); body.rotation.x = -0.12 * k; }
      else { const k = ease(clamp01((p - 0.45) / 0.25)); R.pitch.rotation.x = lerp(-3.0, -0.5, k); L.pitch.rotation.x = lerp(-2.6, -0.4, k); body.rotation.x = 0.3 * k; }
      break;
    }
    case 'roll': body.rotation.x = p * Math.PI * 2; body.position.y = 0.62 - 0.3 * Math.sin(p * Math.PI); lLeg.rotation.x = rLeg.rotation.x = -1.2 * Math.sin(p * Math.PI); break;
    case 'shoot': { const k = Math.sin(p * Math.PI); L.pitch.rotation.x = -1.5; R.pitch.rotation.x = -1.4; R.sh.rotation.y = lerp(0.2, 0.9, k); torso.rotation.y = -0.3; break; }
    case 'cast': { const k = Math.sin(p * Math.PI); R.pitch.rotation.x = lerp(-0.2, -2.4, k); L.pitch.rotation.x = -1.0 * k; break; }
    case 'stab': R.pitch.rotation.x = -1.6 * Math.sin(p * Math.PI); L.pitch.rotation.x = -1.6 * Math.sin(clamp01(p * 1.4 - 0.4) * Math.PI); body.rotation.x = 0.15; break;
    case 'raise': R.pitch.rotation.x = -2.8; L.pitch.rotation.x = -2.5; body.rotation.x = -0.1; break;
    default: break;
  }
  if (a.dead) { const k = clamp01(a.dead); body.rotation.x = -1.45 * ease(k); body.position.y = lerp(0.62, 0.28, k); }
}

const HERO = { skin: 0xc9a184, cloth: 0x2b2f38, pants: 0x24201c, trim: 0x7a6a50, hair: 0x1a1410, head: 'hair', weapon: 'sword', cape: 0x22324a };
function hero() { const r = humanoid({ ...HERO, armorMat: COAT[0], bladeMat: BLADE[0] }); r.kind = 'hero'; return r; }
function dressHero(rig, sword, armor) {
  const key = sword.id + ':' + armor.id;
  if (rig.gearKey === key) return;
  rig.gearKey = key;
  rig.blade.material = BLADE[sword.rarity] || BLADE[0];
  rig.bladePivot.scale.y = sword.len || 1;
  rig.chest.material = COAT[armor.rarity] || COAT[0];
}
function bot(name, cls) {
  const c1 = hued(name, 0.4, 0.3), c2 = hued(name + 'x', 0.35, 0.22);
  let r;
  if (cls === 'vanguard') r = humanoid({ cloth: c2, armor: 0x6d717a, metal: true, trim: 0x8a7a5a, head: 'helm', crest: c1, weapon: 'sword', offhand: 'shield', shield: c1 });
  else if (cls === 'ranger') r = humanoid({ cloth: c2, armor: 0x4a3a2a, trim: 0x5a4a30, head: 'hood', hood: c1, weapon: 'bow', quiver: true });
  else r = humanoid({ cloth: 0x8a8270, sleeve: c1, armor: c1, trim: 0xb8a070, head: 'hair', hair: 0x6a5a48, weapon: 'staff', robe: c1 });
  r.kind = 'bot'; return r;
}
function rogue() { const r = humanoid({ cloth: 0x2a2a2e, armor: 0x2e2626, trim: 0x3a3030, head: 'hood', hood: 0x1e1a1a, weapon: 'daggers', scarf: 0x9a1a1a, sack: true }); r.kind = 'rogue'; return r; }
function warden() {
  const r = humanoid({ skin: 0x2b2420, cloth: 0x2a1c1c, armor: 0x3a3a42, metal: true, trim: 0x5a4a30, pants: 0x1e1c1c, head: 'warden', weapon: 'cleaver', cape: 0x4a1414, pads: 1.7, lantern: true, bladeMat: M(0x7a7470, { metal: 0.8, rough: 0.5 }) });
  r.scaler.scale.setScalar(2.6); r.kind = 'warden'; return r;
}

// ---- Beasts -------------------------------------------------------------------------------------
function wolf() {
  const root = new THREE.Group(), scaler = grp(root), body = grp(scaler, 0, 0.62, 0);
  const fur = M(0x56606e, { rough: 0.95 }), dark = M(0x2c313a), eye = M(0x000000, { em: 0xffb030, ei: 2.4 });
  part(body, cap(0.25, 0.75), fur, 0, 0, -0.05, 1, 1, 1, Math.PI / 2, 0, 0);
  part(body, SPH, fur, 0, 0.05, 0.35, 0.3, 0.3, 0.33);
  for (let i = 0; i < 4; i++) part(body, CONE, dark, 0, 0.28 - i * 0.03, 0.3 - i * 0.22, 0.07, 0.26, 0.07, -0.5, 0, 0);
  const head = grp(body, 0, 0.18, 0.62);
  part(head, SPH, fur, 0, 0, 0, 0.19, 0.17, 0.22);
  part(head, CONE, fur, 0, -0.04, 0.27, 0.1, 0.3, 0.1, Math.PI / 2, 0, 0);
  part(head, BOX, dark, 0, -0.12, 0.2, 0.12, 0.05, 0.22);
  for (const s of [-1, 1]) { part(head, CONE, dark, s * 0.11, 0.18, -0.04, 0.06, 0.17, 0.05, -0.2, 0, s * 0.25); part(head, SPH, eye, s * 0.085, 0.05, 0.17, 0.03, 0.03, 0.03); }
  const legs = [];
  for (const [x, z] of [[0.15, 0.35], [-0.15, 0.35], [0.15, -0.38], [-0.15, -0.38]]) {
    const Lg = grp(body, x, -0.05, z); part(Lg, cap(0.06, 0.38), fur, 0, -0.3, 0); part(Lg, SPH, dark, 0, -0.56, 0.03, 0.07, 0.04, 0.09); legs.push(Lg);
  }
  const tail = grp(body, 0, 0.12, -0.5); part(tail, CONE, fur, 0, 0.05, -0.2, 0.07, 0.5, 0.07, -1.07, 0, 0);
  return { type: 'wolf', kind: 'wolf', root, scaler, body, head, legs, tail };
}
function brute() {
  const root = new THREE.Group(), scaler = grp(root), body = grp(scaler, 0, 1.25, 0); body.rotation.x = 0.35;
  const hide = M(0x4b3a2a, { rough: 0.95 }), thorn = M(0xb2a27a), horn = M(0xd8ccb0, { rough: 0.6 }), eye = M(0x000000, { em: 0xff3a20, ei: 2.6 }), moss = M(0x3a4a2a);
  part(body, SPH, hide, 0, 0, 0, 0.85, 0.75, 1.0);
  part(body, SPH, moss, 0, 0.45, -0.1, 0.6, 0.4, 0.75);
  for (let i = 0; i < 6; i++) part(body, CONE, thorn, i % 2 ? 0.18 : -0.18, 0.78 - Math.abs(i - 2.5) * 0.06, 0.5 - i * 0.22, 0.08, 0.46, 0.08, -0.4, 0, i % 2 ? -0.3 : 0.3);
  const head = grp(body, 0, 0.15, 0.95);
  part(head, SPH, hide, 0, 0, 0, 0.38, 0.33, 0.38);
  for (const s of [-1, 1]) {
    part(head, CONE, horn, s * 0.32, 0.3, -0.05, 0.1, 0.64, 0.1, -0.4, 0, -s * 0.9);
    part(head, SPH, eye, s * 0.15, 0.06, 0.31, 0.05, 0.04, 0.04);
    part(head, CONE, horn, s * 0.14, -0.22, 0.3, 0.04, 0.17, 0.04, Math.PI, 0, 0);
  }
  const arms = [];
  for (const s of [-1, 1]) { const A = grp(body, s * 0.7, 0.05, 0.45); part(A, cap(0.2, 0.7), hide, 0, -0.55, 0.1); part(A, SPH, M(0x2e241a), 0, -1.05, 0.15, 0.24, 0.18, 0.28); arms.push(A); }
  const legs = [];
  for (const s of [-1, 1]) { const Lg = grp(body, s * 0.45, -0.45, -0.55); part(Lg, cap(0.17, 0.4), hide, 0, -0.35, 0); legs.push(Lg); }
  return { type: 'brute', kind: 'brute', root, scaler, body, head, arms, legs };
}
const SAC = new THREE.MeshStandardMaterial({ color: 0x3a6a1a, emissive: 0x8cff3a, emissiveIntensity: 1.1, roughness: 0.4 });
function spitter() {
  const root = new THREE.Group(), scaler = grp(root), body = grp(scaler, 0, 0.82, 0);
  const skin = M(0x4e5a2c, { rough: 0.8 }), spot = M(0x2e3a1a);
  part(body, SPH, skin, 0, 0, -0.05, 0.62, 0.5, 0.66);
  for (let i = 0; i < 5; i++) part(body, SPH, spot, Math.sin(i * 2.3) * 0.45, 0.25 + (i % 2) * 0.1, Math.cos(i * 2.3) * 0.4 - 0.1, 0.12, 0.06, 0.12);
  const sac = part(body, SPH, SAC, 0, -0.16, 0.42, 0.3, 0.3, 0.3);
  const neck = grp(body, 0, 0.32, 0.32); neck.rotation.x = 0.7;
  part(neck, CYL, skin, 0, 0.3, 0, 0.11, 0.6, 0.11);
  part(neck, CONE, spot, 0, 0.68, 0, 0.18, 0.26, 0.18, Math.PI, 0, 0);
  for (const s of [-1, 1]) { part(body, CYL, skin, s * 0.22, 0.58, 0.05, 0.025, 0.45, 0.025, 0, 0, s * 0.3); part(body, SPH, M(0x000000, { em: 0xffe14a, ei: 2.2 }), s * 0.29, 0.8, 0.05, 0.06, 0.06, 0.06); }
  const legs = [];
  for (let k = 0; k < 3; k++) {
    const an = k * 2.094 + 0.5, Lg = grp(body, Math.sin(an) * 0.4, -0.3, Math.cos(an) * 0.4);
    Lg.rotation.set(Math.cos(an) * 0.5, 0, -Math.sin(an) * 0.5); part(Lg, CONE, skin, 0, -0.27, 0, 0.09, 0.55, 0.09, Math.PI, 0, 0); legs.push(Lg);
  }
  return { type: 'spitter', kind: 'spitter', root, scaler, body, sac, neck, legs };
}
function animBeast(rig, a) {
  const mv = a.moving || 0, ph = a.phase || 0, p = clamp01(a.p || 0), t = a.t || 0;
  if (rig.type === 'wolf') {
    const s = Math.sin(ph) * 0.8 * mv;
    rig.legs[0].rotation.x = s; rig.legs[3].rotation.x = s; rig.legs[1].rotation.x = -s; rig.legs[2].rotation.x = -s;
    rig.body.position.y = 0.62 + Math.abs(Math.sin(ph)) * 0.05 * mv; rig.body.rotation.z = 0; rig.body.rotation.x = 0;
    rig.tail.rotation.y = Math.sin(t * 6) * 0.4;
    rig.head.rotation.x = a.kind === 'bite' ? (p < 0.4 ? -0.35 * ease(p / 0.4) : 0.45 * Math.sin(clamp01((p - 0.4) / 0.3) * Math.PI)) : 0;
    if (a.dead) { const k = clamp01(a.dead); rig.body.rotation.z = 1.5 * ease(k); rig.body.position.y = lerp(0.62, 0.3, k); }
  } else if (rig.type === 'brute') {
    const s = Math.sin(ph) * 0.6 * mv;
    rig.arms[0].rotation.x = s; rig.arms[1].rotation.x = -s; rig.legs[0].rotation.x = -s; rig.legs[1].rotation.x = s;
    rig.body.rotation.x = 0.35; rig.body.position.y = 1.25 + Math.abs(Math.sin(ph)) * 0.08 * mv; rig.body.rotation.z = 0;
    rig.head.rotation.x = 0;
    if (a.kind === 'swipe') { const k = p < 0.5 ? ease(p / 0.5) : 1 - ease((p - 0.5) / 0.5); rig.arms[0].rotation.x = -1.6 * k; rig.arms[0].rotation.z = 0.5 * k; }
    else rig.arms[0].rotation.z = 0;
    if (a.kind === 'chargeTele') { rig.body.rotation.x = 0.55; rig.head.rotation.x = 0.3 + Math.sin(t * 30) * 0.05; }
    if (a.kind === 'charge') { rig.body.rotation.x = 0.6; rig.arms[0].rotation.x = -0.8; rig.arms[1].rotation.x = -0.8; }
    if (a.dead) { const k = clamp01(a.dead); rig.body.rotation.z = 1.4 * ease(k); rig.body.position.y = lerp(1.25, 0.7, k); }
  } else if (rig.type === 'spitter') {
    for (let k = 0; k < 3; k++) rig.legs[k].rotation.y = Math.sin(ph + k * 2) * 0.3 * mv;
    rig.body.position.y = 0.82 + Math.sin(t * 3 + ph) * 0.03 + Math.abs(Math.sin(ph)) * 0.05 * mv; rig.body.rotation.z = 0;
    let sac = 1, neck = 0.7;
    if (a.kind === 'spit') { if (p < 0.6) { sac = 1 + 0.7 * ease(p / 0.6); neck = 0.7 - 0.5 * ease(p / 0.6); } else { sac = 1.7 - 0.7 * ease((p - 0.6) / 0.4); neck = 0.2 + 1.0 * Math.sin(clamp01((p - 0.6) / 0.4) * Math.PI); } }
    rig.sac.scale.setScalar(0.3 * sac); rig.neck.rotation.x = neck;
    if (a.dead) { const k = clamp01(a.dead); rig.body.rotation.z = 1.3 * ease(k); rig.body.position.y = lerp(0.82, 0.45, k); }
  }
}

// ---- Loot on the ground ----------------------------------------------------------------------
const COIN = new THREE.CylinderGeometry(0.1, 0.1, 0.035, 10), COINM = M(0xd8a531, { metal: 0.9, rough: 0.35, em: 0x3a2400, ei: 0.6 });
const BEAM = new THREE.CylinderGeometry(0.1, 0.16, 1, 8, 1, true);
function coins(n) {
  const g = new THREE.Group(), k = Math.min(6, 2 + Math.floor(n / 12));
  for (let i = 0; i < k; i++) { const c = part(g, COIN, COINM, Math.cos(i * 2.4) * 0.14 * (i > 0), 0.02 + i * 0.02, Math.sin(i * 2.4) * 0.14 * (i > 0)); c.rotation.z = (i % 3) * 0.2; }
  return g;
}
function beam(g, rarity, height) {
  const b = new THREE.Mesh(BEAM, glowMat(RHEX[rarity], rarity >= 2 ? 0.55 : 0.35)); b.scale.set(1, height, 1); b.position.y = height / 2; g.add(b);
  return b;
}
function groundItem(item) {
  const g = new THREE.Group(), glow = M(RHEX[item.rarity], { em: RHEX[item.rarity], ei: item.rarity ? 0.6 : 0.15, metal: 0.6, rough: 0.4 });
  if (item.slot === 'sword') {
    part(g, BOX, glow, 0, 0.06, 0, 0.09, 0.03, 0.9 * (item.len || 1));
    part(g, BOX, M(0x6a5a40, { metal: 0.5 }), 0, 0.06, -0.48 * (item.len || 1), 0.3, 0.04, 0.06);
    part(g, CYL, M(0x2a1f17), 0, 0.06, -0.62 * (item.len || 1), 0.035, 0.22, 0.035, Math.PI / 2, 0, 0);
  } else {
    part(g, cap(0.2, 0.22), item.rarity ? glow : COAT[0], 0, 0.14, 0, 1, 0.7, 0.55, Math.PI / 2, 0, 0);
    for (const s of [-1, 1]) part(g, SPH, glow, s * 0.24, 0.12, -0.18, 0.1, 0.07, 0.1);
  }
  if (item.rarity > 0) beam(g, item.rarity, item.rarity >= 2 ? 7 : 3.5);
  return g;
}
function cache() {
  const g = new THREE.Group();
  part(g, SPH, M(0x5a4630), 0, 0.28, 0, 0.32, 0.3, 0.28);
  part(g, BOX, M(0x8a1a1a), 0, 0.55, 0, 0.14, 0.06, 0.14);
  part(g, CONE, M(0x5a4630), 0, 0.66, 0, 0.1, 0.18, 0.1);
  beam(g, 2, 5).material = glowMat(0xff4a3a, 0.45);
  return g;
}

export { BLADE, COAT, animHumanoid, hero, dressHero, bot, rogue, warden, wolf, brute, spitter, animBeast, coins, groundItem, cache };
