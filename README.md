# Lanternfall

A browser action RPG. You wake in Ashgate at the foot of a tower, trapped with thousands of
other players; the only way out is up. Fight wolf packs with a sword and sword skills that
unlock as you level, loot gear in rarity colours, recruit bot players into a raid party, and
bring down Garvath, Warden of the First Stair. Fall, and you wake in town with everything you
carried. Bots who fall are gone for good.

Built with [three.js](https://threejs.org) for the 3D world and a plain 2D canvas for the HUD.

## Play it

You need [Node.js](https://nodejs.org) 22.12 or later.

```bash
npm install
npm run dev
```

Then open the address it prints (usually http://localhost:5173).

| Key | Does |
|---|---|
| WASD or arrows | move |
| Mouse | aim |
| Left click | swing, pick up loot, talk to players |
| Q / E / R | sword skills (they unlock as you level) |
| Space | dodge roll |
| F | drink a potion |
| I | open your bag |
| Mouse wheel | zoom |
| P | pause |
| M | mute |

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | runs the game with live reload while you edit |
| `npm run lint` | checks the code; catches a name used without being defined or imported |
| `npm test` | runs the unit tests in `tests/` |
| `npm run build` | builds the game into `dist/`, ready for any static web host |
| `npm run build:single` | builds the whole game into one file, `dist-single/index.html`, that opens straight from disk |
| `npm run preview` | serves the `dist/` build locally |

## How the code is laid out

Each file starts with a comment saying what lives in it.

```text
index.html            the page: two canvases (3D world under the HUD) and src/main.js
src/
  main.js             boot, the fixed-step loop, window.game
  scenes.js           title, play, pause, results: what each screen does and draws
  config.js           every tunable number (CONFIG) and tune, the live view of them
  math.js             the seeded rng, distance and angle helpers, easing
  game/               the rules, on plain data (only hero/controls.js, reading input and the
                      mouse in 3D, and save.js, using localStorage, touch the browser)
    state.js          the run's state (newState() shows its shape)
    step.js           one fixed step of the whole game, every system in order
    hero/             controls, sword and skills, stats and gear, XP and levels
    enemies/          spawning packs, enemy AI, taking hits, what they can hit
    bots/             the bot players, their AI, the raid party
    loot/             item tables and rolls, drops on the ground
    world/            Floor 1's layout, the walkable grid, decoration, clicks, who lives where
    inventory.js      the bag
    warden.js         the boss fight
    hollow.js         the Red Hollow (PvP zone) and your haul
    quests.js  chat.js  projectiles.js  save.js
  render/             the 3D view with three.js: renderer and camera, figures, world meshes, frames
  ui/                 the HUD on the 2D canvas: kit (drawing helpers), panels, labels, inventory window
  platform/           the browser page and input (keyboard, mouse)
  audio/              sound effects, made from tones and noise
tests/unit/           Vitest tests for the rules and the bag
docs/game-brief.md    the design brief
```

The game's `state` is plain data with no three.js objects in it. The rules in `src/game/` read
and change it; `src/render/` and `src/ui/` only draw it. That split is what would let a server
own the simulation one day, for multiplayer.

### Tuning

Every number a designer would tune (speeds, damage, cooldowns, drop rates, bag size) lives in
`src/config.js`, each with its value and a sensible min, max and step. The game reads them live
through `tune.<name>`. While the game runs you can try a value from the browser console, for
example `CONFIG.bagSize.value = 24`, and copy it into `src/config.js` when you like it.

### Randomness

Every gameplay random number comes from the seeded `rng()`, never `Math.random`, so the same
seed and the same inputs always play out the same way. Add `?seed=7` to the address to try
another seed.

### For tests and debugging

`window.game` exposes the scene, the state, and `press`, `hold` and `step`. With `?manual=1`
in the address the loop stops and a script can step the game frame by frame.

## Design notes

[docs/game-brief.md](docs/game-brief.md) is the game's design brief: the pitch, the look, the
first minute, and what is in and out of scope.
