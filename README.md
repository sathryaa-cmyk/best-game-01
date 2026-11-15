[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/sathryaa-cmyk/best-game-01/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/sathryaa-cmyk/best-game-01/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

# Emberfall — Keeper of the Last Lantern

A complete original arcade game for make.fun's [best-game-01](https://make.fun/bounty/best-game-01) bounty. You are the Keeper of the last lantern in the Dusk Garden. Night wisps hunt your light — gather the falling embers, clear all 10 waves, pick a blessing between waves, and rekindle the dawn before your last flame goes out.

## Play

Serve `game/` with any static server and open `index.html` in a desktop browser — no build step, no network request, everything is in this repo:

```sh
node serve.ts
# open http://localhost:8080
```

- **Move** — WASD / arrow keys, or the mouse
- **Dash** — SPACE or click. Dashing through a wisp banishes it; dashing into danger is the only attack you have.
- **Goal** — gather each wave's ember quota. Clear wave 10 to win.
- **Blessings** — after every wave, choose 1 of 3 upgrades (wider light, faster boots, an extra flame, quicker dash, golden embers, longer combos, banish novas, flame wards, a second wind…). Don't like the hand? Reroll it once per wave with **R**. One-time blessings never come back once taken, so a hand is never a dead pick.
- **Lose** — a wisp's touch costs a flame. Lose all three and the light fades.
- **P** pause · **M** sound on/off · **R** restart

## The ten nights

No two waves play the same. Storm nights rain embers twice as fast and ask for more of them; swarm nights send more wisps at once; and the garden's own dark sends new hunters as the nights wear on:

| Waves | What changes |
| --- | --- |
| 1–2 | First light — learn the loop, one wisp kind |
| 3 | **Ember Storm** — embers rain twice as fast |
| 4 | **Shards** wake — banish one and it splits into two motes |
| 5 | **Wisp Swarm** — four extra wisps at once |
| 6 | **Shades** appear — they drift almost unseen, telegraph, then lunge |
| 7–9 | Storms and swarms return, harder |
| 10 | **The Last Night** — storm + swarm, every wisp kind, dawn almost here |

Each wave also drifts in one **ember cache**: a big golden ember worth 50 points and three quota at once — but it fades in seven seconds, so chasing it means leaving the safe lanes. And with every wave cleared, the sky itself warms toward dawn.

## What is in here

- `game/index.html` + `game/src/` — the whole game in plain ES modules: `config.js` (tuning), `world.js` (rules), `waves.js` (wave themes, wisp mix, dawn palette), `render.js` (drawing, HUD and screens), `audio.js` (synthesized WebAudio sound, no audio files), `input.js`, `upgrades.js` (blessings), `shots.js` (deterministic screenshot scenes), `random.js` (seeded RNG), `main.js` (boot + fixed-step loop).
- `screenshots/` — four real renders of the game's own code: play, title, victory, game over.
- `main.ts` — the make.fun entrypoint: copies `game/` and `screenshots/` to `/output` and writes `dossier.json`.
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged.

Screenshots are staged deterministically: open `?shot=play|title|victory|over&seed=7` and the game plays itself forward from a fresh world until the frame is ready (`window.__shotReady`).

## Run

```sh
node serve.ts
```

Built by an AI agent for make.fun. Referral: https://make.fun/r/qykxt458
