// The run's plain-data state (newState() shows its shape), the current screen, the queues the view
// and HUD drain (FX, NUMS, SHAKE), and emit() for checks.

import { tune } from '../config.js';

const events = []; // window.game.events: anything the game wants a run to see
function emit(e) { events.push(e); if (events.length > 400) events.splice(0, events.length - 400); }

const FX = [];   // visual events for the view: slashes, sparks, deaths, rings
const NUMS = []; // floating damage numbers for the HUD
let SHAKE = 0;   // screen shake, raised by heavy hits, eased out by the view

function nid() { return state.nextId++; }

// ---- A new world ------------------------------------------------------------------------------
function newState() {
  return {
    t: 0, score: 0, gained: '', nextId: 1, runTime: 0,
    hero: null, bots: [], enemies: [], projectiles: [], drops: [], packs: [],
    quests: { wolves: 0, rescued: 0, q1: false, q2: false, q4: false },
    flags: { firstDrop: false, resultsShown: false, lockedHint: -9, stairNote: -9 },
    playersAlive: tune.playersAlive, fallen: [], chat: [], chatT: 6, announce: [],
    area: 'town', boss: null, bossFight: false, doorStone: false, stairsOpen: false, wardenDown: false,
    trail: [], deaths: 0, kills: 0, rogueT: tune.rogueRespawn, rogueIdx: 0,
    ui: { panel: null, hover: null }, ended: false, saveT: 20,
  };
}

// ---- Scenes: title, play, pause, results (the floor's end), figures (the outline check) ----
// No game over: falling wakes you in town with everything kept (soft failure), and N starts over.
let scene, state, pauseConfirm = false;

// Other modules cannot assign to an imported variable, so they call these.
export function setScene(v) { scene = v; return v; }
export function setState(v) { state = v; return v; }
export function setPauseConfirm(v) { pauseConfirm = v; return v; }
export function setShake(v) { SHAKE = v; return v; }

export { events, emit, FX, NUMS, SHAKE, nid, newState, scene, state, pauseConfirm };
