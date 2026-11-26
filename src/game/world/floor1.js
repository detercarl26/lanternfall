// Floor 1's layout: the areas (Ashgate, the Greyfields, the Red Hollow, the Sunken Stair, the
// Hall), the landmarks and the labyrinth. Ashgate's houses, stalls and trees are laid out from
// these in town.js.

const WORLD = { x0: -118, z0: -118, x1: 246, z1: 56 };
const TOWN = { x0: -112, z0: -68, x1: 18, z1: 52 };       // Ashgate, inside its walls (2 thick)
const FIELD = { x0: 20, z0: -62, x1: 118, z1: 52 };       // the Greyfields, out past the east gate
const HOLLOW = { x0: 48, z0: -114, x1: 110, z1: -66 };    // the Red Hollow, the PvP zone
const RIDGE = { z0: -66, z1: -62, x0: 46, x1: 112, gaps: [[58, 66], [90, 98]] };

// Ashgate's landmarks
const GATE = { z0: -4, z1: 4 };                           // the east gate, through the wall at TOWN.x1
const PLAZA = { x: -44, z: 0, r: 21, ring: 24 };          // the Lantern Plaza: open floor to r, arcade out to ring
const MEMORIAL = { x0: -60, x1: -28, z0: -64, z1: -33, door: 4 };  // the Hall of Lanterns, door in its south wall
const SANCTUARY = { x0: -96, x1: -82, z0: -32, z1: -14, door: 2 }; // the Sanctuary, door in its south wall
const GARDEN = { x0: -106, x1: -72, z0: -38, z1: -7 };   // the Sanctuary's garden
const MARKET = { x0: -19, x1: 18, z0: -6, z1: 6 };        // the Market Way, from the plaza to the gate
const FORGE_YARD = { x0: -2, x1: 10, z0: 6, z1: 18 };
const WELL = { x: -44, z: 44, r: 6 };                     // the well square, at the end of the south avenue

const SPAWN = { x: -40, z: 8 };         // you wake here, in the plaza
const CRYSTAL = { x: -44, z: 4 };       // the Waystone, at the foot of the plaza's spire
const BOARD = { x: -31, z: -8 };        // the quest board
const STASH = { x: -34, z: 10.5 };      // your stash: a strongbox in the plaza, 2 cells wide
const FORGE = { x: 4, z: 13 };
const LANTERN_WALL = { x0: -52, x1: -36, z: -61 };        // inside the Hall of Lanterns, facing its door
const DOORSTONE = { x: 191, z: 5 };     // the Waystone at the Warden's door
const HALL = { x: 216, z: 0, r: 15 };   // Warden's Hall
const DOOR = { x0: 199.5, x1: 202.5, z0: -4, z1: 4 };
const STAIRS = { x: 228, z: 0 };
const PATH = [[18, 0], [40, 2], [62, 0], [84, -6], [104, -12], [121, -16]];

// The labyrinth, the Sunken Stair: '#' wall, '.' floor. Cell = 4 units, from (120, -44).
const CELL = 4, MAZE_X0 = 120, MAZE_Z0 = -44;
const MAZE = [
  '####################',
  '######......##.....#',
  '###................#',
  '###................#',
  '###..#......##.....#',
  '#.....########.....#',
  '......########.....#',
  '......##########..##',
  '#.....##########..##',
  '###########........#',
  '###########.........',
  '###########.........',
  '###########........#',
  '####################',
];

const AREA_INFO = {
  town: { name: 'Ashgate', sub: 'Floor 1 · the last safe town at the foot of the tower', color: '#f3e6c4' },
  field: { name: 'The Greyfields', sub: 'Floor 1 · wolves, spitters and worse', color: '#e6dcc0' },
  hollow: { name: 'The Red Hollow', sub: 'PvP zone · rogue players take what you carry · what you pick up here, you can lose', color: '#ff8a78' },
  labyrinth: { name: 'The Sunken Stair', sub: "The labyrinth to the Warden's door", color: '#d8d0c0' },
  hall: { name: "Warden's Hall", sub: 'The floor boss waits. Dodge the red.', color: '#ff9f6a' },
};

export { WORLD, TOWN, FIELD, HOLLOW, RIDGE, GATE, PLAZA, MEMORIAL, SANCTUARY, GARDEN, MARKET, FORGE_YARD, WELL,
  SPAWN, CRYSTAL, BOARD, STASH, FORGE, DOORSTONE, HALL, DOOR, STAIRS, LANTERN_WALL, PATH, MAZE_X0, CELL, MAZE_Z0, MAZE, AREA_INFO };
