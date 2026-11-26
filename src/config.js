// Every tunable number (CONFIG) and tune, the live view of them (tune.speed is CONFIG.speed.value).
//
// Every tuning value lives here, each with value, min, max and step. The game reads them live
// through tune.<name> (index.html); the tweak panel, an add-on, writes them back here.

const CONFIG = globalThis.CONFIG = {
  seed: 1, // every gameplay random call reads rng(), seeded from this (or ?seed= in the address)
  volume: { value: 0.5, min: 0, max: 1, step: 0.05 },

  // ---- Camera (the Look: fixed angled top-down 3D) ----
  camAngle: { value: 55, min: 35, max: 80, step: 1 },        // degrees above the ground
  camDist: { value: 20, min: 12, max: 40, step: 0.5 },       // units from the hero at start
  camZoomMin: { value: 14, min: 8, max: 30, step: 0.5 },     // closest zoom, units
  camZoomMax: { value: 32, min: 16, max: 50, step: 0.5 },    // farthest zoom, units
  camFov: { value: 40, min: 25, max: 70, step: 1 },          // vertical field of view, degrees
  heroLight: { value: 9, min: 0, max: 30, step: 0.5 },       // warm light radius around the hero, intensity
  shake: { value: 1, min: 0, max: 2, step: 0.1 },            // screen shake strength, multiplier
  cutRadius: { value: 5, min: 0, max: 8, step: 0.1 },      // buildings between the camera and the hero open up this far round them, units (0: off)

  // ---- Hero ----
  heroSpeed: { value: 6.2, min: 3, max: 10, step: 0.1 },     // run speed, units per second
  heroHp: { value: 95, min: 40, max: 300, step: 5 },         // max HP at level 1
  heroHpPerLevel: { value: 22, min: 0, max: 60, step: 1 },   // max HP gained each level
  heroRegen: { value: 1.5, min: 0, max: 10, step: 0.5 },     // HP per second when out of combat
  regenDelay: { value: 4, min: 1, max: 10, step: 0.5 },      // seconds without a hit before regen starts
  heroDmgPerLevel: { value: 0.06, min: 0, max: 0.2, step: 0.01 }, // damage bonus per level, fraction
  critChance: { value: 0.08, min: 0, max: 0.5, step: 0.01 }, // chance a hit is a critical
  critMult: { value: 1.5, min: 1, max: 3, step: 0.1 },       // critical damage multiplier
  swingReach: { value: 2.6, min: 1.5, max: 4, step: 0.1 },   // sword reach, units
  swingArc: { value: 130, min: 60, max: 220, step: 5 },      // swing arc, degrees
  swingTime: { value: 0.42, min: 0.2, max: 0.9, step: 0.02 },// one swing start to end, seconds
  swingWindup: { value: 0.11, min: 0.03, max: 0.3, step: 0.01 }, // seconds before the swing lands
  autoAim: { value: 4.2, min: 0, max: 8, step: 0.1 },        // sure-strike: turn to an enemy this close, units
  dodgeDist: { value: 5.5, min: 2, max: 10, step: 0.1 },     // dodge roll distance, units
  dodgeTime: { value: 0.32, min: 0.15, max: 0.6, step: 0.01 },// dodge roll duration, seconds
  dodgeIframes: { value: 0.28, min: 0, max: 0.6, step: 0.01 },// seconds of the roll that ignore hits
  dodgeCooldown: { value: 0.45, min: 0, max: 2, step: 0.05 },// seconds between rolls
  potionCharges: { value: 3, min: 1, max: 6, step: 1 },      // potion charges held
  potionHeal: { value: 0.45, min: 0.1, max: 1, step: 0.05 }, // fraction of max HP a potion heals
  potionHealTime: { value: 0.6, min: 0.1, max: 3, step: 0.1 },// seconds a potion takes to heal
  potionKills: { value: 6, min: 2, max: 20, step: 1 },       // kills that refill one potion charge
  pickupReach: { value: 1.8, min: 0.8, max: 4, step: 0.1 },  // how close a click-walk gets before picking up, units

  // ---- Sword skills (unlock by level; ranks rise at levels without an unlock) ----
  skillQLevel: { value: 2, min: 1, max: 10, step: 1 },       // level that unlocks Whirling Edge (Q)
  skillELevel: { value: 4, min: 1, max: 10, step: 1 },       // level that unlocks Rising Lunge (E)
  skillRLevel: { value: 6, min: 1, max: 12, step: 1 },       // level that unlocks Crescent Break (R)
  skillRankBonus: { value: 0.12, min: 0, max: 0.5, step: 0.01 }, // damage per rank above unlock, fraction
  whirlMult: { value: 1.6, min: 0.5, max: 5, step: 0.1 },    // Whirling Edge damage, x weapon
  whirlRadius: { value: 3.3, min: 1.5, max: 6, step: 0.1 },  // Whirling Edge radius, units
  whirlTime: { value: 0.5, min: 0.2, max: 1.2, step: 0.05 }, // Whirling Edge duration, seconds
  whirlCooldown: { value: 4, min: 0.5, max: 15, step: 0.5 }, // seconds
  whirlKnock: { value: 2.2, min: 0, max: 6, step: 0.1 },     // knockback, units
  lungeMult: { value: 2.0, min: 0.5, max: 5, step: 0.1 },    // Rising Lunge damage, x weapon
  lungeDist: { value: 7, min: 3, max: 12, step: 0.5 },       // dash distance, units
  lungeTime: { value: 0.3, min: 0.1, max: 0.8, step: 0.02 }, // dash duration, seconds
  lungeCooldown: { value: 6, min: 0.5, max: 20, step: 0.5 }, // seconds
  crescentMult: { value: 2.6, min: 0.5, max: 6, step: 0.1 }, // Crescent Break damage, x weapon
  crescentRange: { value: 12, min: 4, max: 20, step: 0.5 },  // how far the wave travels, units
  crescentSpeed: { value: 20, min: 6, max: 40, step: 1 },    // wave speed, units per second
  crescentWidth: { value: 4.2, min: 1.5, max: 8, step: 0.1 },// wave width, units
  crescentCooldown: { value: 9, min: 1, max: 30, step: 0.5 },// seconds
  stunTime: { value: 0.8, min: 0, max: 3, step: 0.1 },       // Crescent Break stun, seconds

  // ---- Experience ----
  xpBase: { value: 40, min: 10, max: 200, step: 5 },         // XP from level 1 to 2
  xpGrowth: { value: 1.5, min: 1, max: 2.5, step: 0.05 },    // each next level needs base x level^growth
  xpWolf: { value: 14, min: 1, max: 100, step: 1 },
  xpSpitter: { value: 25, min: 1, max: 150, step: 1 },
  xpBrute: { value: 45, min: 1, max: 300, step: 1 },
  xpRogue: { value: 60, min: 1, max: 300, step: 1 },
  xpBoss: { value: 600, min: 50, max: 3000, step: 50 },
  xpRescue: { value: 30, min: 0, max: 200, step: 5 },        // XP for each player rescued

  // ---- Enemies (field values; the labyrinth multiplies them) ----
  aggroRadius: { value: 11, min: 4, max: 25, step: 0.5 },    // units an enemy notices you from
  leash: { value: 32, min: 10, max: 80, step: 1 },           // units from home before an enemy gives up
  packRespawn: { value: 90, min: 10, max: 600, step: 5 },    // seconds before a cleared pack returns (you far away)
  labHpMult: { value: 1.45, min: 0.5, max: 4, step: 0.05 },  // labyrinth enemy HP multiplier
  labDmgMult: { value: 1.25, min: 0.5, max: 4, step: 0.05 }, // labyrinth enemy damage multiplier
  wolfHp: { value: 34, min: 5, max: 300, step: 1 },
  wolfDmg: { value: 5, min: 1, max: 60, step: 1 },
  wolfSpeed: { value: 7.0, min: 2, max: 14, step: 0.1 },     // units per second
  wolfAttack: { value: 1.05, min: 0.3, max: 3, step: 0.05 }, // seconds between bites
  spitterHp: { value: 55, min: 5, max: 400, step: 1 },
  spitterDmg: { value: 10, min: 1, max: 80, step: 1 },
  spitterRange: { value: 11, min: 4, max: 20, step: 0.5 },   // units
  spitterAttack: { value: 2.4, min: 0.6, max: 6, step: 0.1 },// seconds between spits
  spitterShot: { value: 9, min: 3, max: 25, step: 0.5 },     // glob speed, units per second
  bruteHp: { value: 170, min: 20, max: 1200, step: 5 },
  bruteDmg: { value: 14, min: 1, max: 100, step: 1 },        // swipe damage
  bruteChargeDmg: { value: 24, min: 1, max: 150, step: 1 },  // charge damage
  bruteSpeed: { value: 4.4, min: 1, max: 10, step: 0.1 },
  bruteChargeSpeed: { value: 17, min: 6, max: 30, step: 0.5 },
  bruteChargeLen: { value: 13, min: 5, max: 25, step: 0.5 }, // charge length, units
  bruteTelegraph: { value: 0.8, min: 0.2, max: 2, step: 0.05 }, // seconds the red line shows first
  bruteChargeCd: { value: 5, min: 1, max: 15, step: 0.5 },   // seconds between charges
  rogueHp: { value: 140, min: 20, max: 800, step: 5 },
  rogueDmg: { value: 11, min: 1, max: 80, step: 1 },
  rogueLungeDmg: { value: 18, min: 1, max: 120, step: 1 },
  rogueSpeed: { value: 6.2, min: 2, max: 12, step: 0.1 },
  rogueCount: { value: 4, min: 0, max: 8, step: 1 },         // rogue players in the Red Hollow at once
  rogueRespawn: { value: 40, min: 5, max: 300, step: 5 },    // seconds before a new rogue walks in
  cacheGold: { value: 55, min: 0, max: 500, step: 5 },       // average gold in a rogue's cache

  // ---- The floor boss ----
  bossHp: { value: 6000, min: 500, max: 30000, step: 100 },
  bossSpeed: { value: 3.0, min: 0.5, max: 8, step: 0.1 },
  bossSweepDmg: { value: 38, min: 1, max: 200, step: 1 },    // cleaver sweep (a red cone)
  bossSlamDmg: { value: 48, min: 1, max: 250, step: 1 },     // ground slam (a red circle)
  bossChargeDmg: { value: 55, min: 1, max: 250, step: 1 },   // charge (a red line)
  bossTelegraph: { value: 0.9, min: 0.3, max: 2.5, step: 0.05 }, // seconds the red marks show first
  bossGap: { value: 1.6, min: 0.3, max: 5, step: 0.1 },      // seconds between boss attacks
  bossSummonEvery: { value: 30, min: 5, max: 120, step: 1 }, // seconds between wolf summons
  bossSummonCount: { value: 3, min: 0, max: 8, step: 1 },

  // ---- Bot players ----
  botHp: { value: 150, min: 30, max: 800, step: 5 },
  botHpPerLevel: { value: 12, min: 0, max: 60, step: 1 },    // bots grow with your level
  botDmg: { value: 7, min: 1, max: 60, step: 1 },
  botDmgPerLevel: { value: 0.07, min: 0, max: 0.3, step: 0.01 },
  vanguardHpMult: { value: 1.5, min: 1, max: 3, step: 0.05 },
  botHeal: { value: 0.18, min: 0, max: 0.6, step: 0.01 },    // a Mender's heal, fraction of max HP
  botHealCd: { value: 3.5, min: 0.5, max: 10, step: 0.5 },   // seconds between heals
  botRegen: { value: 3, min: 0, max: 20, step: 0.5 },        // HP per second out of combat
  partySize: { value: 3, min: 1, max: 5, step: 1 },          // bots that can join your raid party
  rescueGrace: { value: 0.25, min: 0, max: 1, step: 0.05 },  // damage a player in trouble takes before you arrive, fraction
  playersAlive: { value: 4812, min: 100, max: 10000, step: 1 }, // players alive in the tower at start

  // ---- Loot ----
  dropWolf: { value: 0.18, min: 0, max: 1, step: 0.01 },     // chance a wolf drops gear
  dropSpitter: { value: 0.25, min: 0, max: 1, step: 0.01 },
  dropBrute: { value: 0.5, min: 0, max: 1, step: 0.01 },
  dropRogue: { value: 0.7, min: 0, max: 1, step: 0.01 },     // chance a rogue's cache holds gear
  rarityMagic: { value: 0.32, min: 0, max: 1, step: 0.01 },  // share of drops that are magic (blue)
  rarityRare: { value: 0.11, min: 0, max: 1, step: 0.01 },   // share that are rare (yellow)
  rarityUnique: { value: 0.025, min: 0, max: 0.5, step: 0.005 }, // share that are unique (orange)
  goldPerKill: { value: 6, min: 0, max: 100, step: 1 },      // average gold from a wolf; others more
  goldMagnet: { value: 5.5, min: 0, max: 15, step: 0.5 },    // gold flies to you from this close, units
  bagSize: { value: 20, min: 4, max: 30, step: 1 },          // bag slots; the bag window fits 6 rows of 5 on the 720-px HUD
};

// ---- Built to be checked ----------------------------------------------------------------
const tune = new Proxy({}, { get: (_, k) => CONFIG[k].value }); // live: tune.speed is CONFIG.speed.value

export { CONFIG, tune };
