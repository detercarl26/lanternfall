// Keyboard and mouse state (held, pressed, mouse), the listeners that fill it, starting audio on
// the first input, and the CONTROLS help text.

import { tune } from '../config.js';
import { W, H, viewScale, viewLeft, viewTop } from './page.js';
import { makeRng } from '../math.js';
import { audio, muted, setAudio, setMuted } from '../audio/sfx.js';

const CONTROLS = [
  'WASD or arrows: move    Mouse: aim',
  'Left click: swing, pick up loot, talk to players',
  'Q / E / R: sword skills (they unlock as you level)',
  'Space: dodge roll    F: drink a potion',
  'Mouse wheel: zoom    P: pause    M: mute',
];

// ---- Input: keys by position (event.code), OS key repeat ignored; the mouse aims -----------
const down = new Set(), hit = new Set();
const pressed = code => hit.has(code); // true for one step after the key goes down
const held = code => down.has(code);
addEventListener('keydown', e => {
  startAudio();
  if (!e.repeat) { down.add(e.code); hit.add(e.code); }
  if (e.code === 'Space' || e.code.startsWith('Arrow') || e.code === 'Tab') e.preventDefault();
});
addEventListener('keyup', e => down.delete(e.code));
const mouse = { x: W / 2, y: H / 2, inside: false, wheel: 0 };
function trackMouse(e) {
  mouse.x = (e.clientX - viewLeft) / viewScale; mouse.y = (e.clientY - viewTop) / viewScale;
  mouse.inside = mouse.x >= 0 && mouse.y >= 0 && mouse.x <= W && mouse.y <= H;
}
addEventListener('pointermove', trackMouse);
addEventListener('pointerdown', e => {
  startAudio(); trackMouse(e);
  const code = 'Mouse' + e.button; down.add(code); hit.add(code);
});
addEventListener('pointerup', e => down.delete('Mouse' + e.button));
addEventListener('contextmenu', e => e.preventDefault());
addEventListener('wheel', e => { mouse.wheel += Math.sign(e.deltaY); }, { passive: true });
addEventListener('blur', () => down.clear());

// ---- Audio: started on first input, mute on M --------------------------------------------
function startAudio() {
  if (!audio) {
    const ac = window.GAME_AUDIO || new (window.AudioContext || window.webkitAudioContext)(); // a check may inject one
    const out = ac.createGain(); out.gain.value = muted ? 0 : tune.volume;
    out.connect(ac.destination);
    const len = Math.floor(ac.sampleRate * 1.0), buf = ac.createBuffer(1, len, ac.sampleRate);
    const d = buf.getChannelData(0), nr = makeRng(99);
    for (let i = 0; i < len; i++) d[i] = nr() * 2 - 1;
    setAudio({ ac, out, noise: buf, last: {} });
  }
  if (audio.ac.state === 'suspended') audio.ac.resume();
}

addEventListener('tune', () => setMuted(muted)); // the tweak panel (an add-on), when added, moved a value: the volume follows

export { CONTROLS, hit, down, pressed, held, mouse };
