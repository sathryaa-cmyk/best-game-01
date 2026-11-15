// The screenshot scenes behind ?shot=title|play|victory|over. Each one
// plays the real rules forward from a fresh world for a fixed number of
// steps, steered by a simple autopilot (chase the nearest ember, flee a
// wisp that gets too close, dash through one that corners it), so the
// frame is what a short game really looks like and the same seed always
// gives the same frame. The play scene fast-forwards through the opening
// waves to wave 4, where the shard wisps join — the cover should show
// the game with its depth on, not its first quiet seconds. The victory
// scene starts the last wave one ember short of its quota, so the frame
// is the real victory screen the rules produce; the game-over scene's
// pilot never dashes and never flees, so the wisps catch it as they
// would a hurried player.
import { STEP, VIEW } from './config.js';
import {
  SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_UPGRADE, SCREEN_VICTORY,
} from './world.js';

const START_SECONDS = 5;
const PLAY_TARGET_WAVE = 4;
const PLAY_HOLD_SECONDS = 10;
const FAST_FORWARD_LIMIT_SECONDS = 180;
const END_LIMIT_SECONDS = 600;
const SAMPLE_HORIZON = 0.9;

class PilotInput {
  constructor() {
    this.move = { x: 0, y: 0 };
    this.dash = false;
    this._mouse = { x: 640, y: 360, down: false, movedAt: -1, clicked: false };
  }

  axis() {
    return this.move;
  }

  wasPressed(code) {
    return code === 'Space' ? this.dash : false;
  }

  get mouse() {
    return this._mouse;
  }

  mouseFresh() {
    return false;
  }

  endStep() {
    this.dash = false;
  }
}

function autopilot(world, flee, useDash) {
  const p = world.player;
  const input = new PilotInput();
  let threat = null;
  let threatD = Infinity;
  for (const w of world.wisps) {
    const d = Math.hypot(w.x - p.x, w.y - p.y);
    if (d < threatD) {
      threatD = d;
      threat = w;
    }
  }
  let ember = null;
  let emberD = Infinity;
  for (const e of world.embers) {
    const d = Math.hypot(e.x - p.x, e.y - p.y);
    if (d < emberD) {
      emberD = d;
      ember = e;
    }
  }
  let tx = VIEW.width / 2 - p.x;
  let ty = VIEW.height / 2 - p.y;
  if (flee && threat && threatD < 150) {
    tx = p.x - threat.x;
    ty = p.y - threat.y;
    if (useDash && threatD < 72 && p.dashCdLeft <= 0) {
      // Dash straight through the threat to banish it.
      tx = threat.x - p.x;
      ty = threat.y - p.y;
      input.dash = true;
    }
  } else if (ember) {
    tx = ember.x - p.x;
    ty = ember.y - p.y;
  }
  const len = Math.hypot(tx, ty) || 1;
  input.move = { x: tx / len, y: ty / len };
  return input;
}

/**
 * One autopilot step, taking the first blessing whenever a wave clears.
 * Returns false when the run has ended (game over or victory).
 */
function pilotStep(world) {
  const input = autopilot(world, true, true);
  world.step(STEP, input);
  input.endStep();
  if (world.screen === SCREEN_UPGRADE) world.chooseBlessing(0);
  return world.screen === SCREEN_PLAY;
}

/**
 * Set `world` to the named scene and return the screen to draw over it.
 */
export function stageShot(name, world, seed) {
  world.reset(seed);
  if (name !== 'play' && name !== 'victory' && name !== 'over') {
    for (let i = 0; i < START_SECONDS / STEP; i += 1) world.step(STEP, new PilotInput());
    return { screen: SCREEN_TITLE };
  }
  if (name === 'victory') {
    world.startRun();
    world.wave = 10;
    world.startWave();
    world.quotaLeft = 1;
    world.wisps = [];
    world.embers = [];
    // The scene stages the last ember of a long winning run, so the
    // victory screen shows the stats such a run earns.
    world.collected = 158;
    world.banished = 41;
    world.bestCombo = 24;
    world.time = 512;
    world.score = 3200;
    world.embers.push({
      x: world.player.x, y: world.player.y - 90, vy: 55, sway: 1, phase: 0, r: 11, kind: 'ember',
    });
    for (let i = 0; i < 30 / STEP; i += 1) {
      const input = autopilot(world, true, true);
      world.step(STEP, input);
      input.endStep();
      if (world.screen === SCREEN_VICTORY) break;
    }
    if (world.screen === SCREEN_VICTORY) {
      // Embers drifting behind the victory screen, for the backdrop.
      for (let i = 0; i < 10; i += 1) {
        world.embers.push({
          x: 60 + world.rng() * (VIEW.width - 120),
          y: 60 + world.rng() * (VIEW.height - 160),
          vy: 55, sway: 1, phase: world.rng() * Math.PI * 2, r: 11,
          kind: world.rng() < 0.15 ? 'gold' : 'ember',
        });
      }
    }
    return { screen: world.screen === SCREEN_VICTORY ? SCREEN_VICTORY : SCREEN_PLAY };
  }
  world.startRun();
  if (name === 'over') {
    for (let i = 0; i < END_LIMIT_SECONDS / STEP; i += 1) {
      // The game-over scene's pilot freezes: it never moves, never dashes
      // and never flees, so the hunting wisps catch it as they would a
      // player who panicked — three hits and the light is out.
      world.step(STEP, new PilotInput());
      if (world.screen === SCREEN_OVER) break;
    }
    return { screen: world.screen === SCREEN_OVER ? SCREEN_OVER : SCREEN_PLAY };
  }
  // Play: fast-forward through the opening waves to the target wave,
  // then hold there a few seconds so the frame is mid-wave, mid-action.
  let guard = 0;
  while (world.wave < PLAY_TARGET_WAVE && guard < FAST_FORWARD_LIMIT_SECONDS / STEP) {
    if (!pilotStep(world)) break;
    guard += 1;
  }
  if (world.screen === SCREEN_OVER) {
    // The pilot lost on the way up: stage the target wave directly from
    // the same seed, so the cover still shows the game at its depth.
    world.reset(seed);
    world.startRun();
    world.wave = PLAY_TARGET_WAVE;
    world.startWave();
  }
  if (world.screen === SCREEN_PLAY) {
    for (let i = 0; i < PLAY_HOLD_SECONDS / STEP; i += 1) {
      if (!pilotStep(world)) break;
    }
  }
  // Never ship an empty frame: if the hold ended on a wave transition,
  // play on until embers are falling and wisps are hunting again.
  if (world.screen === SCREEN_UPGRADE) world.chooseBlessing(0);
  let settle = 0;
  while (
    world.screen === SCREEN_PLAY
    && (world.embers.length < 4 || world.wisps.length < 2)
    && settle < 15 / STEP
  ) {
    if (!pilotStep(world)) break;
    settle += 1;
  }
  if (world.screen === SCREEN_OVER) return { screen: SCREEN_OVER };
  return { screen: SCREEN_PLAY };
}

export { SAMPLE_HORIZON };
