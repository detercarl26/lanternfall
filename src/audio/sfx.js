// Every sound effect (sfx.hit(), sfx.level() ...) built from tones and noise, and mute; silent
// until the first input starts audio.

import { tune } from '../config.js';

let audio = null, muted = false;

function setMuted(m) { muted = m; if (audio) audio.out.gain.value = m ? 0 : tune.volume; }

function tone(freq, dur, type = 'square', vol = 0.3, when = 0) {
  if (!audio || muted) return;
  const t = audio.ac.currentTime + when, o = audio.ac.createOscillator(), g = audio.ac.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(audio.out); o.start(t); o.stop(t + dur);
}
function sweep(f0, f1, dur, type = 'sine', vol = 0.2, when = 0) {
  if (!audio || muted) return;
  const t = audio.ac.currentTime + when, o = audio.ac.createOscillator(), g = audio.ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(audio.out); o.start(t); o.stop(t + dur);
}
function noise(dur, freq, q = 1, vol = 0.2, when = 0) {
  if (!audio || muted) return;
  const ac = audio.ac, t = ac.currentTime + when, src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  src.buffer = audio.noise; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f).connect(g).connect(audio.out); src.start(t, 0); src.stop(t + dur);
}
function sfxGap(name, gap) { // keeps one sound from stacking into a roar
  if (!audio) return false;
  const t = audio.ac.currentTime;
  if (audio.last[name] !== undefined && t - audio.last[name] < gap) return false;
  audio.last[name] = t; return true;
}
const sfx = {
  swing() { if (sfxGap('swing', 0.05)) { noise(0.14, 1100, 0.7, 0.16); } },
  hit() { if (sfxGap('hit', 0.05)) { noise(0.09, 260, 1.2, 0.3); tone(95, 0.09, 'square', 0.07); } },
  crit() { if (sfxGap('crit', 0.08)) tone(720, 0.12, 'triangle', 0.1); },
  skill() { sweep(260, 980, 0.28, 'sawtooth', 0.06); noise(0.3, 1700, 0.6, 0.15); },
  hurt() { if (sfxGap('hurt', 0.12)) { tone(88, 0.18, 'sawtooth', 0.12); noise(0.12, 220, 1, 0.18); } },
  dodge() { noise(0.22, 520, 0.5, 0.12); },
  potion() { sweep(320, 760, 0.35, 'sine', 0.14); },
  gold() { if (sfxGap('gold', 0.04)) tone(1320, 0.07, 'triangle', 0.07); },
  drop(r) {
    if (r <= 0) return;
    if (r === 1) { tone(880, 0.25, 'triangle', 0.09); return; }
    const notes = r === 2 ? [660, 880, 1320] : [392, 523, 784, 1046];
    notes.forEach((f, i) => tone(f, 0.45, 'triangle', 0.1, i * 0.08));
  },
  level() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.5, 'triangle', 0.12, i * 0.09)); },
  quest() { tone(988, 0.16, 'triangle', 0.11); tone(1319, 0.3, 'triangle', 0.11, 0.12); },
  toll() { tone(98, 2.4, 'sine', 0.3); tone(147, 2.2, 'sine', 0.12, 0.05); },
  slam() { tone(52, 0.6, 'sine', 0.4); noise(0.45, 110, 0.7, 0.4); },
  roar() { sweep(190, 60, 0.9, 'sawtooth', 0.12); noise(0.8, 180, 0.6, 0.12); },
  warn() { if (sfxGap('warn', 0.15)) tone(150, 0.22, 'sine', 0.1); },
  spit() { if (sfxGap('spit', 0.08)) sweep(520, 190, 0.2, 'sine', 0.08); },
  arrow() { if (sfxGap('arrow', 0.06)) noise(0.07, 2600, 1, 0.07); },
  heal() { if (sfxGap('heal', 0.1)) sweep(620, 1240, 0.3, 'sine', 0.06); },
  door() { noise(1.0, 75, 0.5, 0.35); tone(45, 0.9, 'sine', 0.25); },
  click() { tone(700, 0.05, 'square', 0.04); },
};

// Other modules cannot assign to an imported variable, so they call these.
export function setAudio(v) { audio = v; return v; }

export { muted, audio, setMuted, sfx };
