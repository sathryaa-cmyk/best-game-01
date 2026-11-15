// Emberfall's boot and fixed-step loop. The canvas is 1280x720 inside and
// scales to the window; the world steps at a fixed 1/60 s so the game
// plays the same on any machine, and ?shot=<scene>&seed=<n> stages a
// deterministic screenshot scene instead of the live game.
import { VIEW, STEP } from './config.js';
import { SoundBank } from './audio.js';
import { Input } from './input.js';
import {
  World, SCREEN_TITLE, SCREEN_PLAY, SCREEN_UPGRADE, SCREEN_PAUSE,
  SCREEN_VICTORY, SCREEN_OVER,
} from './world.js';
import {
  drawWorld, TITLE_BUTTON, END_AGAIN_BUTTON, END_TITLE_BUTTON,
  PAUSE_RESUME_BUTTON, PAUSE_QUIT_BUTTON, REROLL_BUTTON,
  upgradeCardRect, inside,
} from './render.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

function fitCanvas() {
  const scale = Math.min(window.innerWidth / VIEW.width, window.innerHeight / VIEW.height);
  canvas.style.width = `${Math.floor(VIEW.width * scale)}px`;
  canvas.style.height = `${Math.floor(VIEW.height * scale)}px`;
}
window.addEventListener('resize', fitCanvas);
fitCanvas();

const sounds = new SoundBank();
const input = new Input(canvas);
const world = new World(sounds);
// A handle for play-testing from the console or a script; the game itself
// never reads it.
window.__emberfall = world;

function announce(text) {
  if (statusEl) statusEl.textContent = text;
}

function handleScreenClick() {
  if (!input.mouse.clicked) return false;
  const { x, y } = input.mouse;
  // A click on the play screen is a dash: leave it for the world to read.
  if (world.screen === SCREEN_PLAY) return false;
  input.mouse.clicked = false;
  sounds.unlock();
  if (world.screen === SCREEN_TITLE && inside(TITLE_BUTTON, x, y)) {
    sounds.click();
    world.startRun();
    announce('Wave 1. Gather the embers.');
    return true;
  }
  if (world.screen === SCREEN_UPGRADE) {
    if (inside(REROLL_BUTTON, x, y)) {
      if (world.rerollBlessings()) announce('Blessings re-dealt.');
      return true;
    }
    for (let i = 0; i < world.blessings.length; i += 1) {
      if (inside(upgradeCardRect(i), x, y)) {
        world.chooseBlessing(i);
        announce(`Blessing chosen. Wave ${world.wave}.`);
        return true;
      }
    }
    return true;
  }
  if (world.screen === SCREEN_PAUSE) {
    if (inside(PAUSE_RESUME_BUTTON, x, y)) {
      sounds.click();
      world.resume();
    } else if (inside(PAUSE_QUIT_BUTTON, x, y)) {
      sounds.click();
      world.quitToTitle();
    }
    return true;
  }
  if (world.screen === SCREEN_VICTORY || world.screen === SCREEN_OVER) {
    if (inside(END_AGAIN_BUTTON, x, y)) {
      sounds.click();
      world.startRun();
    } else if (inside(END_TITLE_BUTTON, x, y)) {
      sounds.click();
      world.quitToTitle();
    }
    return true;
  }
  return false;
}

function handleScreenKeys() {
  if (input.wasPressed('KeyM')) {
    const muted = sounds.toggleMute();
    announce(muted ? 'Sound off.' : 'Sound on.');
  }
  if (world.screen === SCREEN_TITLE) {
    if (input.wasPressed('Enter') || input.wasPressed('Space')) {
      sounds.unlock();
      sounds.click();
      world.startRun();
      announce('Wave 1. Gather the embers.');
    }
    return;
  }
  if (world.screen === SCREEN_PLAY) {
    if (input.wasPressed('KeyP') || input.wasPressed('Escape')) {
      sounds.unlock();
      world.pause();
      announce('Paused.');
    }
    return;
  }
  if (world.screen === SCREEN_PAUSE) {
    if (input.wasPressed('KeyP') || input.wasPressed('Escape') || input.wasPressed('Enter')) {
      world.resume();
    }
    if (input.wasPressed('KeyQ')) world.quitToTitle();
    return;
  }
  if (world.screen === SCREEN_UPGRADE) {
    if (input.wasPressed('KeyR')) {
      if (world.rerollBlessings()) announce('Blessings re-dealt.');
    }
    if (input.wasPressed('Digit1')) world.chooseBlessing(0);
    if (input.wasPressed('Digit2')) world.chooseBlessing(1);
    if (input.wasPressed('Digit3')) world.chooseBlessing(2);
    return;
  }
  if (world.screen === SCREEN_VICTORY || world.screen === SCREEN_OVER) {
    if (input.wasPressed('KeyR') || input.wasPressed('Enter')) {
      sounds.unlock();
      world.startRun();
      announce('Wave 1. Gather the embers.');
    }
    if (input.wasPressed('KeyT')) world.quitToTitle();
  }
}

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
if (shotName) {
  const seed = Number(params.get('seed') || 7) >>> 0;
  const staged = stageShot(shotName, world, seed);
  world.screen = staged.screen;
  // A screenshot is one fixed frame: freeze the shake and hit-flash so
  // the same seed always renders the same pixels.
  world.shake = 0;
  world.flash = 0;
  // Screenshot scenes render one frame and stop: no loop, no audio.
  drawWorld(ctx, world);
  window.__shotReady = true;
} else {
  let last = performance.now();
  let acc = 0;
  let prevScreen = world.screen;
  function frame(now) {
    requestAnimationFrame(frame);
    input.tick(now / 1000);
    const elapsed = Math.min(0.25, (now - last) / 1000);
    last = now;
    acc += elapsed;
    handleScreenKeys();
    const clickedOnScreen = handleScreenClick();
    // A key or click that just started a run must not also fire a dash in it.
    if (world.screen === SCREEN_PLAY && prevScreen !== SCREEN_PLAY) {
      input.pressed.clear();
      input.mouse.clicked = false;
    }
    prevScreen = world.screen;
    let steps = 0;
    while (acc >= STEP && steps < 5) {
      if (!clickedOnScreen) {
        world.step(STEP, input);
      }
      input.endStep();
      acc -= STEP;
      steps += 1;
    }
    if (steps === 5) acc = 0;
    drawWorld(ctx, world);
  }
  requestAnimationFrame(frame);
}
