// The screenshot scenes behind ?shot=title|play|victory|over. Each one
// plays the real rules forward from a fresh world for a fixed number of
// steps, steered by a simple autopilot (chase the nearest ember, flee a
// wisp that gets too close, dash through one that corners it), so the
// frame is what a short game really looks like and the same seed always
// gives the same frame. The victory scene starts the last wave one ember
// short of its quota, so the frame is the real victory screen the rules
// produce; the game-over scene's pilot never dashes and never flees, so
// the wisps catch it as they would a hurried player.
import { STEP, VIEW } from './config.js';
import {
  SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_UPGRADE, SCREEN_VICTORY,
} from './world.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 26;
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
  const limit = name === 'over' ? END_LIMIT_SECONDS : PLAY_SECONDS;
  const flee = name !== 'over';
  const useDash = name !== 'over';
  for (let i = 0; i < limit / STEP; i += 1) {
    // The game-over scene's pilot freezes: it never moves, never dashes
    // and never flees, so the hunting wisps catch it as they would a
    // player who panicked — three hits and the light is out.
    const input = name === 'over' ? new PilotInput() : autopilot(world, flee, useDash);
    world.step(STEP, input);
    input.endStep();
    if (world.screen === SCREEN_OVER) break;
    if (world.screen === SCREEN_UPGRADE) {
      // A cleared wave mid-scene: take the first blessing and keep playing.
      world.chooseBlessing(0);
    }
  }
  if (world.screen === SCREEN_OVER) return { screen: SCREEN_OVER };
  return { screen: SCREEN_PLAY };
}

export { SAMPLE_HORIZON };
