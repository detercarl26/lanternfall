// The chat box and the big announcements (chat, announce), and every line the bot players say.

import { rrange, pick } from '../math.js';
import { state } from './state.js';

const CHAT_LINES = [
  'anyone up for the Warden? need a healer',
  'LFG east field, wolves',
  'the Warden flattened my whole party yesterday',
  'stay out of the Red Hollow unless you want to lose your bag',
  'selling a blue sabre, 40 gold',
  'does anyone know what floor 2 looks like',
  'dodge the red lines. seriously.',
  'my lantern flickered last night. not funny.',
  'day 41 in the tower. still no logout button',
  'the spitters in the labyrinth hit like trucks',
  'who keeps lighting candles at the wall?',
  'if you save someone out there they usually tag along',
  'Hale fixed my sword for free, legend',
  'the board has new notices',
  'brutes always charge in a straight line, just step aside',
  'heard someone made it to the Warden door alone',
  'keep your potions for the boss',
  'rogues in the Hollow carry fat caches',
  'one floor at a time, people',
  'whoever lit the Waystone at the door, thank you',
];
const JOIN_LINES = ['thanks for the save. I am with you.', 'count me in for the Warden.', 'I will keep you standing.', 'lead the way.'];
const GRIEF_LINES = ['rest easy, {n}.', '{n}... no.', 'that was not a respawn, was it.', 'light one for {n} tonight.'];
const FIGHT_LINES = ['behind you!', 'nice one', 'pull them to me', 'watch the red!', 'healing!'];

// ---- Areas, quests, levels, chat --------------------------------------------------------------------
function chat(who, text, kind) { const s = state; s.chat.push({ who, text, kind: kind || 'bot', t: s.t }); if (s.chat.length > 30) s.chat.shift(); }
function announce(title, sub, color) { const s = state; s.announce.push({ title, sub, color: color || '#f3e6c4', t: 0 }); if (s.announce.length > 4) s.announce.shift(); }
function updateChat(dt) {
  const s = state; s.chatT -= dt;
  if (s.chatT > 0) return;
  s.chatT = rrange(8, 15);
  const pool = s.bots.filter(b => b.alive && (b.mode === 'town' || b.mode === 'lfg' || b.mode === 'field'));
  if (pool.length) { const b = pick(pool); chat(b.name, pick(CHAT_LINES), 'bot'); }
}

export { JOIN_LINES, GRIEF_LINES, chat, announce, updateChat };
