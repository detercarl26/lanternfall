// The browser page: URL flags (?seed, ?scene, ?render=cheap, ?manual), the clock, and the 3D canvas
// under the HUD canvas fitted to the window.

const params = new URLSearchParams(location.search);

const W = 1280, H = 720;        // logical size of the HUD; the 3D view fills the same box
const PIXEL = false;

const TITLE = 'Lanternfall';

const clock = window.GAME_CLOCK || { now: () => performance.now() / 1000 }; // a check may inject one
const CHEAP = params.get('render') === 'cheap'; // a headless shot or check: 3D draws cheap; players never see it

// ---- Screen: the 3D world canvas under the HUD canvas, both fitted to the window ----------
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const worldCanvas = document.getElementById('world');
let viewScale = 1, viewLeft = 0, viewTop = 0;
function fit() { // fills the window at any size and pixel ratio
  const k = Math.min(innerWidth / W, innerHeight / H);
  const s = PIXEL ? Math.max(1, Math.floor(k)) : k;
  const r = PIXEL ? 1 : s * (devicePixelRatio || 1);
  canvas.width = Math.round(W * r); canvas.height = Math.round(H * r);
  const cw = Math.round(W * s), ch = Math.round(H * s);
  viewScale = s;
  viewLeft = Math.max(0, Math.floor((innerWidth - cw) / 2));
  viewTop = Math.max(0, Math.floor((innerHeight - ch) / 2));
  for (const c of [canvas, worldCanvas]) {
    c.style.width = cw + 'px'; c.style.height = ch + 'px';
    c.style.left = viewLeft + 'px'; c.style.top = viewTop + 'px';
  }
  ctx.setTransform(r, 0, 0, r, 0, 0); ctx.imageSmoothingEnabled = true;
  if (window.VIEW_RESIZE) window.VIEW_RESIZE(cw, ch);
}
addEventListener('resize', fit); fit();

export { params, W, H, clock, CHEAP, ctx, worldCanvas, viewScale, viewLeft, viewTop, fit };
