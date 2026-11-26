// Trees, rocks, grass and ruins, placed once from their own seed away from paths, packs and bot
// spots; they block the grid.

import { makeRng } from '../../math.js';
import { TOWN, FIELD, HOLLOW, RIDGE } from './floor1.js';
import { BOT_ROSTER } from '../bots/roster.js';
import { PACKS } from '../enemies/spawn.js';
import { setCircle, isSolid, circleFree, areaAt, distToPath } from './grid.js';

const wrng = makeRng(7);
const wr = (a, b) => a + (b - a) * wrng();
const TREES = [], ROCKS = [], TUFTS = [], RUINS = [{ x: 64, z: 30 }, { x: 94, z: -46 }, { x: 28, z: -30 }, { x: 80, z: -96 }];
function clearSpot(x, z, pad) {
  if (x > TOWN.x0 - 4 && x < TOWN.x1 + 5 && z > TOWN.z0 - 4 && z < TOWN.z1 + 4) return false;
  if (distToPath(x, z) < 4.5) return false;
  for (const p of PACKS) if (Math.hypot(p.x - x, p.z - z) < 8) return false;
  for (const b of BOT_ROSTER) if (Math.hypot(b.x - x, b.z - z) < 6) return false;
  for (const r of RUINS) if (Math.hypot(r.x - x, r.z - z) < 5) return false;
  for (const g of RIDGE.gaps) if (x > g[0] - 3 && x < g[1] + 3 && z > -72 && z < -56) return false;
  return circleFree(x, z, pad);
}
(function decorate() {
  for (const r of RUINS) setCircle(r.x, r.z, 1.2, 1);
  let tries = 0;
  while (TREES.length < 58 && tries++ < 4000) {
    const inH = TREES.length >= 46;
    const x = inH ? wr(HOLLOW.x0 + 2, HOLLOW.x1 - 2) : wr(FIELD.x0 + 2, FIELD.x1 - 3);
    const z = inH ? wr(HOLLOW.z0 + 2, HOLLOW.z1 - 2) : wr(FIELD.z0 + 2, FIELD.z1 - 2);
    if (!clearSpot(x, z, 1.4)) continue;
    TREES.push({ x, z, h: wr(3.6, 6.8), rot: wr(0, 6.28), lean: wr(-0.12, 0.12), n: 3 + Math.floor(wr(0, 3)) });
    setCircle(x, z, 0.55, 1);
  }
  tries = 0;
  while (ROCKS.length < 90 && tries++ < 4000) {
    const inH = ROCKS.length >= 70;
    const x = inH ? wr(HOLLOW.x0 + 1, HOLLOW.x1 - 1) : wr(FIELD.x0 + 2, FIELD.x1 - 2);
    const z = inH ? wr(HOLLOW.z0 + 1, HOLLOW.z1 - 1) : wr(FIELD.z0 + 2, FIELD.z1 - 2);
    const s = wr(0.35, 1.5);
    if (!clearSpot(x, z, s + 0.4)) continue;
    ROCKS.push({ x, z, s, rot: wr(0, 6.28) });
    if (s > 1.0) setCircle(x, z, s * 0.7, 1);
  }
  tries = 0;
  while (TUFTS.length < 1100 && tries++ < 6000) {
    const inH = TUFTS.length >= 900;
    const x = inH ? wr(HOLLOW.x0, HOLLOW.x1) : wr(FIELD.x0 + 1, FIELD.x1 - 1);
    const z = inH ? wr(HOLLOW.z0, HOLLOW.z1) : wr(FIELD.z0 + 1, FIELD.z1 - 1);
    if (isSolid(x, z) || areaAt(x, z) === 'town' || distToPath(x, z) < 2.2) continue;
    TUFTS.push({ x, z, s: wr(0.5, 1.2), rot: wr(0, 6.28), tilt: wr(-0.3, 0.3), hue: wrng() });
  }
})();

export { wrng, TREES, ROCKS, TUFTS, RUINS };
