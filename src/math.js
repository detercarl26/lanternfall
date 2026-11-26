// Number helpers: the seeded gameplay rng (rng, rrange, pick), makeRng for decoration and effects,
// distance and angle helpers, and easing.

let seed;
function rng() { // mulberry32; every gameplay random call reads this, never Math.random
  seed = (seed + 0x6D2B79F5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), seed | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function rrange(a, b) { return a + (b - a) * rng(); }
function pick(arr) { return arr[Math.floor(rng() * arr.length)]; }
function makeRng(s0) { // a separate seeded stream for decoration and visual effects (never gameplay)
  let s = s0 | 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), s | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const lerp = (a, b, k) => a + (b - a) * k;
const ease = k => k * k * (3 - 2 * k);
const clamp01 = k => Math.max(0, Math.min(1, k));

const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const angTo = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
function angDiff(a, b) { let d = a - b; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; }
function turnToward(cur, target, maxStep) { const d = angDiff(target, cur); return cur + Math.max(-maxStep, Math.min(maxStep, d)); }

// Other modules cannot assign to an imported variable, so they call these.
export function setSeed(v) { seed = v; return v; }

export { rng, rrange, pick, makeRng, lerp, ease, clamp01, dist, angTo, angDiff, turnToward };
