# Game Brief: Lanternfall *(guessed)*

## In your words

i would like to make a game inspired by sword art online combined with path of exile 2, help me plan ask me questions if necessary.

1. Pitch: Pitch 1, Floor One: You're trapped with thousands of other players in a VR game's tower. at some point i would like it to be real players (multiplayer) for now it can be ai/npc's You fight packs from an angled top-down view, using a sword and sword skills that unlock as you level. You loot gear in rarity colours and lead bot players from town against the floor boss. If you die, you wake in town with everything kept, but bots that fall are gone for good. It feels like growing strong in a world that's counting on you. you can also choose to go stray and fight other players/ai to get their items on a designated pvp zone.
Originality: All names, characters, the tower, items and UI will be our own. Sword Art Online and Path of Exile 2 are only references.
3. Look: view wise i want the style of path of exile 2, so 3d top down?

**Pitch:** Trapped in a VR game's tower with thousands of others, you fight your way up with a sword and sword skills, loot gear, and lead bot players against the floor boss, in a world that's counting on you.

**Genre:** action RPG × MMO (a trapped-in-the-tower climb with a town full of bot players)

**Controls:** WASD to move, the mouse to aim, left click to swing, Q / E / R for sword skills, Space to dodge roll, F for a potion, I for the bag *(inferred (strong): from Path of Exile 2)*

**Question:** Is fighting up one floor, with sword skills, loot and a bot raid party who can die for good, fun enough to want floor 2?

**Hooks:** Named bot players who fight beside you and can die for good, each with a lantern on the town wall that goes dark when they fall *(lantern guessed)*; sword skills that unlock as you level; a PvP zone where you can take other players' items.

**Intent:** soft or no failure *(you said: you wake in town with everything kept)*

## Look and references
- Look: Path of Exile 2's style, as you said: dark, grounded gothic fantasy in real 3D, its camera, proportions, palette mood and light, never its art. Small, realistically proportioned figures in a large weathered world of stone, mud, dead grass and ruins. The ground held dark and muted; the hero and enemies brightest, picked out by rim light. Cold blue-grey shadows, warm amber torch and lantern light, a colour per loot rarity, red ground telegraphs before an attack, a pale cyan trail on sword skills. Detail on the hero, the enemies and skill effects, kept off the ground. Signature: the town's lantern wall. Every figure drawn: no emoji, no plain circles or boxes standing in for figures.
- References: Path of Exile 2 (the 3D angled top-down look, WASD and dodge-roll combat, packs and loot in rarity colours); Sword Art Online (trapped in a VR game's tower, a town on the floor, sword skills, the floor boss raided together).
- View: 3D · Camera: fixed angled top-down, about 55°, following the hero, mouse wheel to zoom.

## First minute
You wake in the town square at the foot of the tower; a system message says logging out is impossible and the only way out is up. Named bot players (marked BOT) mill around under the lantern wall, and the quest board offers "Clear the wolves in the east field." You walk out with WASD; the first pack of three beasts teaches the swing and the dodge. They burst into gold and a blue sword in a light beam: hover to compare, click to put it in your bag, press I to wear it. Around 45 seconds you level up and your first sword skill, a spinning slash, unlocks on Q. Then a cry: a bot player is surrounded by a pack around a tougher leader. Your new skill scatters them and the bot joins your raid party; back in town, their lantern stays lit.

## Challenge
The first real trouble comes around minute 2: a pack led by a charging alpha that kills you if you don't dodge and drink. The labyrinth's packs are bigger. The floor boss telegraphs sweeps and charges you must dodge and takes two or three tries *(provisional)*; bots in your party can fall for good during the fight. A loss wakes you in town with everything kept and the boss back at full health. Later floors bring tougher packs and more to lose.

## Core loop
- Take a quest in town, head out into the fields or the labyrinth.
- Fight packs with the swing, sword skills and the dodge → XP, gold and gear in rarity colours.
- Level up to unlock sword skills, equip better gear, rescue or recruit bot players for the raid.
- Raid the floor boss with your bot party to open the stairs; die and you wake in town, fallen bots gone for good.
- Optional: stray into the PvP zone to fight rogue players for their items.
- Leads: the action RPG leads input, camera, combat, loot and the build; the MMO leads the town, the bot players, quests and the save; your words lead death and the PvP zone.

## Goal & fail state
- Goal: beat the floor 1 boss with your bot party to open the stairs to floor 2 *(provisional)*.
- Fail: nothing ends the game. You wake in town with everything kept; what you can lose for good is bots (their lanterns go dark) and, in the PvP zone, the loot you picked up there *(guessed)*. A session feels complete when the boss falls and the stairs open.

## Features
- [x] Floor 1: a town with a quest board and the lantern wall, open fields, and a short labyrinth ending at the boss door
- [x] Combat: a sword swing that turns toward the nearest enemy, a dodge roll that can cut the end of a skill, and potion charges refilled in town and a little by kills *(provisional)*
- [x] Sword skills that unlock as you level, 3 by the boss, each on a key with a cooldown that sweeps round, and a level-up you can hear
- [x] Loot bursts of gold and gear in rarity colours, with a quick compare against what you wear; worn gear shows on the hero
- [x] 4 enemy kinds, each attacking differently, in packs around a tougher one; the last is the floor boss
- [x] Named bot players (marked BOT) in town and the fields: rescue or recruit them into your raid party; one that falls is gone for good and its lantern goes dark
- [x] A PvP zone where rogue bot players carry loot: beat one for its items; fall there and you drop what you picked up there (thin stand-in)
- [x] Your hero, level, gear and the fallen saved in this browser

## Your systems
- sword skills that unlock as you level · in the slice *(guessed)*
- loot gear in rarity colours · in the slice *(guessed)*
- bot players you lead from town against the floor boss · in the slice *(guessed)*
- die and you wake in town with everything kept, but bots that fall are gone for good · in the slice *(guessed)*
- a designated pvp zone to fight other players/ai for their items · thin stand-in *(guessed)*
- real players (multiplayer) · later

## Keep
-

## Avoid
- Sword Art Online's and Path of Exile 2's names, characters, the tower, items, art and UI *(you said: all names, characters, the tower, items and UI will be our own)*

## Out of scope
- Online: persistent world: needs a server, so not built; built instead: bot players in this browser, named as bots, and the character saved here
- Real players in town, raids and the PvP zone; trading, guilds and chat: needs a server: not built yet
- More floors, zones and quest chains; endgame maps of rising tiers: grow it
- A stash and several characters: grow it
- A long-run economy that stays in balance: grow it
- Crafting that rerolls gear; item slots and affix rules: add it as a feature
- Bosses with phases and parts to break; loot weighted to your build; a rested bonus; protection from bad-luck streaks on rare drops: change it after play

## Build order
1. The slice, floor 1 from town to boss: town and bots → the fields with packs, loot, levels and sword skills → rescue bots into your party, the PvP zone off to the side → the labyrinth → the boss raid. Win: the boss falls and the stairs open. Lose: you wake in town with everything kept, the boss back at full; fallen bots stay gone.
2. Tune after play: how sword skills and the dodge feel, the boss's difficulty, the loot drops.
3. Grow it: floor 2 and beyond, a stash, crafting.
4. Real players: needs a server.

---
**Kill condition:** if fighting packs with the sword and sword skills still feels flat after two rounds of tuning *(guessed)*

**Who it's for / what they feel:** ARPG and anime fans; growing strong in a world that's counting on you.

**Games you love / don't:** Love Sword Art Online (the trapped-in-a-tower story) and Path of Exile 2 (the look and the combat) *(inferred (strong))*
