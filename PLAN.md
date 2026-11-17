# VOID RUNNER — Design Plan

A browser-based, wave-based space survival/strategy game. You pilot a single ship through
hostile sectors of space: fight, collect, upgrade at a hub, survive bosses, and bank
permanent upgrades (Star Charts) between runs.

- **Goal:** simple to run (double-click `index.html`), light on hardware, heavy on fun/imagery.
- **Stack:** single HTML file, vanilla JS + Canvas 2D, zero dependencies, works offline / from `file://`.
- **Persistence:** `localStorage` (versioned key `voidrunner_v1`), try/catch guarded with in-memory fallback.

---

## 1. Game States

| State | Description |
|---|---|
| **Title** | Neon title screen, high scores, "Start Mission", hangar/tech access, reset save |
| **Combat** | Wave-based arena gameplay (sector wave, then boss on every 3rd sector) |
| **Hub** | Between-sector upgrade terminal (shop, spends in-run credits) |
| **Sector Clear** | Stats, score, lore fragment, Star Charts awarded (on boss sectors) |
| **Game Over** | Final score, Star Charts earned, return to title (new meta options available) |
| **Paused** | Esc |

---

## 2. Player Ship — *The Void Strider*

- **HP** 100 base (scales with hull upgrades, meta tech, ship variant)
- **Shields** 50 base, regenerate after 3s without taking damage
- **Heat** — weapons build heat; overheating locks weapons for ~1.5s; heat sink/bleed upgrades reduce
- **Dash** — Space key: burst in movement/aim direction, 0.15s invulnerability, 1s cooldown (engine upgrades improve)
- **Controls** — WASD/arrows move, mouse aim, left-click (hold) fire, Space dash, Esc pause, F2 debug, M mute
- **Customization** — hull color varies by sector/variant; ship variants from meta tree (see §11)

---

## 3. Enemies (all mostly shootable threats)

HP values are base, scaled by sector (+8%/sector).

| Enemy | HP | Speed | Behavior | Reward |
|---|---|---|---|---|
| **Scout** | 15 | Fast | Zigs in, quick single shots, tries to flank | Credits |
| **Raider** | 30 | Medium | Charges, stops to fire a broadside, repeats | Credits + power-up chance |
| **Cruiser** | 80 | Slow | Keeps range, heavy cannon, fires 3-round bursts | Credits, power-up chance |
| **Cannon** | 50 | Very slow | Holds position, high-damage aimed shots | Credits |
| **Swarm** (5–8 minis) | 8 each | Fast | Spawn as a group, converge, contact damage | Credits each |
| **Dreadnought** | 150+ | Very slow | Big target, multi-shot volleys, drops 1 mine on death, best credit source | Credits + power-up + mine |

Per-type silhouettes: Scout (slim dart), Raider (diamond), Cruiser (hex), Cannon (turret block + barrel), Swarm (small circles), Dreadnought (spiked heavy).

---

## 4. Bosses — every 3rd sector (3, 6, 9…), 3 phases each (100% / 67% / 33% HP)

| Sector | Boss | HP | Abilities by phase |
|---|---|---|---|
| 3 | **Reaver Queen** | 600 | **P1** orbit + shot fans, summons mini-swarms → **P2** periodic invulnerability shield (glow telegraphs), plasma lance (telegraphed beam) → **P3** enrage: faster fire, more summons, bigger beam |
| 6 | **Iron Monarch** | 1000 | **P1** shield generator orbs protect an absorb-shield; destroy orbs to stop regen; spread fire → **P2** homing missile barrages, devastating main cannon → **P3** slow but overwhelming: big missiles, enrage |
| 9 | **Void Leviathan** | 1500 | **P1** blink/teleport with telegraph, drops mines, fans → **P2** reality-tear area-denial zones, mines + fans → **P3** full enrage: everything faster and denser |

Boss arena = the normal arena (enemies cleared, boss enters with alarm SFX).
Shared ability primitives: fan fire, aimed fire, telegraphed beam (line), area-denial zone (circle,
tick damage with per-player cooldown), homing missiles, blink/teleport, mine drop, summons, absorb shield.

---

## 5. Power-Ups

Drop from heavy enemies (Raider/Cruiser/Dreadnought ~25% per kill) and bosses; drift in place,
collected on touch.

| Power-Up | Effect | Duration |
|---|---|---|
| **Shield Recharge** | +30 shield | Instant |
| **Triple Shot** | 3-way firing | 15s |
| **Shield Bubble** | Invincibility | 5s |
| **Nanite Regen** | +2 HP/s | 10s |
| **Overcharge** | 2× damage, no heat | 8s |
| **Mines** | Up to 3 active proximity mines (trigger only on enemies) | Until detonated |

---

## 6. Weapons (player)

Main weapon line (upgradeable in hub):

| Tier | Weapon | Shots | Dmg/shots | Rate | Heat/shot |
|---|---|---|---|---|---|
| 1 | Pulse Rifle | 1 | 12 | 4/s | 8 |
| 2 | Heavy Blaster | 1 | 30 | 2.2/s | 13 |
| 3 | Pulse Cannon | 2 | 22 | 3/s | 11 |

Secondary modules (one-time unlock, then optional upgrade):

- **Side Guns → Back Turret**: +2 side bullets per shot; upgrade = autonomous rear turret (auto-aims, 1/s)
- **Spread → Rail Gun**: +2 spread bullets; upgrade = piercing Rail Gun (dmg 70, 0.8/s, pierces all, high heat, own cooldown)
- **Crit tech (meta)**: 10% chance ×2 damage

**Heat rule:** heat added per fire event = summed active emitters; overheat = 1.5s lockout.
Overcharge power-up zeroes heat gain for 8s.

---

## 7. Hub / Shop (in-run credits, applied immediately)

| Upgrade | Levels | Effect / Cost |
|---|---|---|
| Hull Plating | 5 | +25 max HP (40 → ×1.5/level) |
| Shield Capacitor | 5 | +20 max shield (40 → ×1.5/level) |
| Shield Regen | 3 | Faster shield recharge (60 → ×1.5) |
| Engine Boost | 4 | +8% speed, better dash (60 → ×1.5) |
| Main Weapon | 2 upgrades (t2, t3) | Per §6 (100 → 220) |
| Side/Back | 1 upgrade | Per §6 (75 → 150) |
| Spread/Rail | 1 upgrade | Per §6 (75 → 150) |
| Heat Sink | 3 | Slower heat buildup (50 → ×1.5) |
| Repair Drones | 2 | +1 HP/s auto-repair (80 → 160) |
| Heat Bleed | 2 | Passive extra cooling (60 → 120) |

Starting credits per run: 100 (+10% per meta level).

---

## 8. Sectors, Waves, Scoring

**Flow:** each sector = 1 combat wave. Sectors 3, 6, 9 are boss sectors (wave, then boss).
After every sector → Hub. Boss sectors additionally show Sector Clear + Star Charts.
Sectors beyond 9 continue with scaling difficulty ("Endless" — randomized, brutal).

**Wave composition:** difficulty budget = 18 + sector×6; enemies drawn (weighted) from the
per-sector unlock pool:

| Sector | New additions |
|---|---|
| 1 | Scout, Swarm |
| 2 | Raider |
| 3 | Cruiser + Boss 1 |
| 4 | Cannon |
| 5 | Dreadnought |
| 6 | + Boss 2 |
| 9 | + Boss 3 |

Cap ~14 simultaneous enemies. All spawns enter from arena edges.

**Score:**

| Source | Points |
|---|---|
| Scout / Swarmling | 100 / 40 |
| Raider / Cannon | 200 / 300 |
| Cruiser / Dreadnought | 500 / 1000 |
| Boss | 5000 |
| Wave clear bonus | Scales with remaining HP% |
| Combo | Kills within 3s chain; +15%/chain, max ×5 |

**High scores:** top 10 in localStorage, shown on title screen.

**Sector themes (background + palette):**
1–3 Nebula Drift (purple/pink) · 4–6 Asteroid Belt (gray/amber) · 7–9 Void Rift (blue/green) · 10+ randomized extreme.

**Lore:** short radio-chatter flavor text on each Sector Clear screen — collectible worldbuilding.

---

## 9. Meta-Progression — Star Charts (persistent, spent in Hangar/Tech screen)

Earned: each sector cleared (≈2) + boss kills (≈10) + game-over pity (≈ sector count).

**Spent on (permanent across runs):**

| Unlock | Cost | Effect |
|---|---|---|
| Ship variant — Tank | 15 | +50% HP, +40% shield, −20% speed |
| Ship variant — Speed | 20 | −20% HP, +25% speed, better dash |
| +5% max HP | 5 × (1+lvl) | Repeatable, max 10 |
| +5% weapon damage | 5 × (1+lvl) | Repeatable, max 10 |
| +10% starting credits | 4 × (1+lvl) | Repeatable, max 8 |
| Rail Gun starter | 25 | Begin runs with Rail module unlocked |
| Critical Rounds | 20 | 10% chance ×2 damage on all weapons |
| Void Aegis | 12 | +10 starting shield, faster regen |

---

## 10. Rendering & Feel

- **Arena:** fixed logical 1280×720, scaled to fit window (letterboxed), camera never scrolls — a bounded arena keeps dodging intense.
- **Background:** parallax star layers that drift subtly; per-sector palette; faint arena boundary marker.
- **Ships:** geometric silhouettes with soft glow (canvas shadow blur), engine trails.
- **Combat juice:** muzzle flashes, explosion particles + debris (hard cap ~800 live particles), shockwave rings, screen shake on big hits.
- **HUD (canvas):** HP/shield bars + heat gauge (bottom-left), dash cooldown + active power-up icons, score/wave/credits (top).
- **CRT look:** CSS scanlines + vignette overlay.
- **Audio:** synthesized WebAudio (osc/noise), no files: shoot, hit, boom, dash, power-up, boss alarm, UI click. Mute with M. Context unlocked on first user gesture.

---

## 11. Hard Constraints (local-playability)

1. **Single `index.html`**, everything inline, **zero network/fetch, no ES modules, no CDN** — must run by double-click from `file://`, fully offline.
2. **localStorage guarded** in try/catch; on failure the game degrades to "no persistence", never crashes. Versioned key `voidrunner_v1`; "Reset Save" button on title.
3. **Performance caps:** ≤14 enemies, ≤800 particles, clamped `dt` (max 50ms).
4. **Auto-pause** on `document.hidden` / tab switch.
5. **Input hygiene:** Space/arrows don't scroll page; aim freezes at last angle when mouse leaves canvas; mousedown outside combat never fires.
6. **Debug menu (F2):** jump to sector N, spawn any enemy/boss, grant credits, toggle invulnerable, clear enemies — for fast testing and player experimentation.

---

## 12. Milestones (each independently playable)

- **M1 — core loop:** canvas/loop, ship movement + dash + shoot, 3 enemy types (Scout, Raider, Cruiser), 1 sector, basic scoring, title + game over.
- **M2 — combat depth:** all 6 enemy types, all 3 bosses w/ 3 phases, all power-ups, combo system, sector themes, boss alarm + juice.
- **M3 — progression:** full hub shop, Star Charts, Hangar/tech tree, ship variants, lore, high scores.
- **M4 — polish:** CRT overlay, audio, particles/shake tuning, debug menu, balance pass, F2 debug, self-review checklist.

---

## 13. Cut List (only if something breaks, in priority order)

1. 4 sector themes → 2
2. Boss 3 phases → 2
3. Meta ship variants → only stat-type upgrades
4. Lore fragments → stats-only clear screens
5. CRT overlay → plain dark background

Nothing in the core loop (M1) gets cut.

---

## 14. Verification Plan

- JS syntax/parse check over the full script.
- Node smoke tests on pure logic (wave generation, upgrade costs, combo math, boss thresholds).
- Design-coverage check: every enemy/boss/power-up in this doc has a spawn path.
- Acceptance (§15) + player hands-on pass; debug menu available for anything odd.

## 15. Definition of Done

1. `index.html` in this folder opens by double-click, runs fully offline.
2. Complete loop plays: Title → 9 sectors (3 boss fights) → Game Over → meta progression persisted → next run starts unlocked.
3. High scores work in a normal browser session; fail gracefully if storage is blocked.
4. All enemies spawn per §8, all 3 bosses have 3 phases, all 6 power-ups can spawn.
5. F2 debug menu responds.
6. Steady frame rate with swarm + boss + heavy particles alive at once.

---

## 16. Confirmed Design Decisions (from Q&A)

- Mostly **shootable** threats (env hazards limited to boss mines/zones)
- **Single ship**, no fleet command
- **Permanent meta-progression: Yes** (Star Charts)
- Enemy mix **favors big/heavy ships** (Dreadnoughts, Cruisers, turreted Cannons)
- **In-arena power-ups: Yes**
- **Bosses: Yes** (every 3rd sector)
- **Dash with brief i-frames: Yes** (Space)

*Plan v1 — 2026-11-16. Approved for implementation.*
