// Emberfall's rules: the Keeper, the falling embers, the hunting wisps,
// the waves and the blessings between them. One fixed step (1/60 s) at a
// time; rendering and sound only read this state, they never change it.
//
// Round 3 adds: wave themes (storm nights rain embers, swarm nights send
// more wisps), two new wisp kinds (shards split when banished, shades
// telegraph and lunge), one ember cache per wave worth chasing, hit-stop
// and shockwave rings for the banish, and blessings that chain banishes,
// ward a hit a wave, or save the run once.
import {
  VIEW, STEP, TOTAL_WAVES, PLAYER, EMBER, CACHE, WISP, SHADE, PICKUP, COMBO,
  SCORE, HITSTOP, NOVA_RADIUS, waveQuota,
} from './config.js';
import { makeRng, range, pick } from './random.js';
import { dealBlessings, ownedOneTime } from './upgrades.js';
import {
  waveTheme, waveQuotaBonus, emberInterval, emberCap, wispTarget, wispInterval,
  pickWispKind,
} from './waves.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_UPGRADE = 'upgrade';
export const SCREEN_PAUSE = 'pause';
export const SCREEN_VICTORY = 'victory';
export const SCREEN_OVER = 'over';
export const EVENT_OVER = 1;

const BEST_KEY = 'emberfall.best';

export function loadBest() {
  try {
    return Number(localStorage.getItem(BEST_KEY) || 0) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    localStorage.setItem(BEST_KEY, String(value));
  } catch {
    /* best score is a nicety, never a failure */
  }
}

function freshPlayer() {
  return {
    x: VIEW.width / 2,
    y: VIEW.height - 140,
    vx: 0,
    vy: 0,
    radius: PLAYER.radius,
    dirX: 0,
    dirY: -1,
    flames: PLAYER.startFlames,
    maxFlames: PLAYER.maxFlames,
    speed: PLAYER.speed,
    dashCooldown: PLAYER.dashCooldown,
    dashTimeLeft: 0,
    dashCdLeft: 0,
    invulnLeft: 0,
    shield: false,
    magnetUntil: 0,
    hourglassUntil: 0,
    magnetRadius: EMBER.magnetRadius,
    magnetPull: EMBER.magnetPull,
    emberBonus: 0,
    comboWindow: COMBO.window,
    invulnAfterHit: PLAYER.invulnAfterHit,
    nova: false,
    flameWard: false,
    wardUsed: false,
    secondWind: false,
    stormCaller: false,
  };
}

export class World {
  constructor(sounds) {
    this.sounds = sounds;
    this.rng = makeRng(1);
    this.reset(1);
  }

  reset(seed) {
    this.rng = makeRng(seed);
    this.screen = SCREEN_TITLE;
    this.time = 0;
    this.score = 0;
    this.best = loadBest();
    this.combo = 0;
    this.bestCombo = 0;
    this.comboTimer = 0;
    this.mult = 1;
    this.wave = 0;
    this.waveTime = 0;
    this.quotaLeft = 0;
    this.collected = 0;
    this.banished = 0;
    this.player = freshPlayer();
    this.embers = [];
    this.wisps = [];
    this.pickups = [];
    this.particles = [];
    this.rings = [];
    this.trail = [];
    this.floaters = [];
    this.emberTimer = 0;
    this.wispTimer = 0;
    this.cacheSpawned = false;
    this.hitstop = 0;
    this.shake = 0;
    this.flash = 0;
    this.banner = '';
    this.bannerTimer = 0;
    this.blessings = [];
    this.rerollsLeft = 0;
    this.stars = [];
    for (let i = 0; i < 110; i += 1) {
      this.stars.push({
        x: this.rng() * VIEW.width,
        y: this.rng() * VIEW.height,
        r: 0.6 + this.rng() * 1.7,
        phase: this.rng() * Math.PI * 2,
      });
    }
    this.fireflies = [];
    for (let i = 0; i < 14; i += 1) {
      this.fireflies.push({
        x: this.rng() * VIEW.width,
        y: this.rng() * VIEW.height,
        phase: this.rng() * Math.PI * 2,
        speed: 0.2 + this.rng() * 0.5,
      });
    }
  }

  get timeScale() {
    return this.player.hourglassUntil > this.time ? PICKUP.hourglassScale : 1;
  }

  startRun() {
    this.score = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.comboTimer = 0;
    this.mult = 1;
    this.collected = 0;
    this.banished = 0;
    this.player = freshPlayer();
    this.embers = [];
    this.wisps = [];
    this.pickups = [];
    this.particles = [];
    this.rings = [];
    this.trail = [];
    this.floaters = [];
    this.hitstop = 0;
    this.wave = 1;
    this.startWave();
    this.screen = SCREEN_PLAY;
  }

  startWave() {
    const theme = waveTheme(this.wave);
    this.quotaLeft = waveQuota(this.wave) + waveQuotaBonus(this.wave);
    this.waveTime = 0;
    this.cacheSpawned = false;
    this.player.wardUsed = false;
    this.emberTimer = 0.4;
    this.wispTimer = 1.2;
    this.banner = this.wave === 1 ? 'GATHER THE EMBERS' : theme.name;
    this.bannerTimer = 2.2;
    if (this.player.stormCaller) {
      for (let i = 0; i < 5; i += 1) this.spawnEmber(true);
    }
    if (theme.storm) this.sounds.horn();
  }

  pause() {
    if (this.screen === SCREEN_PLAY) this.screen = SCREEN_PAUSE;
  }

  resume() {
    if (this.screen === SCREEN_PAUSE) this.screen = SCREEN_PLAY;
  }

  quitToTitle() {
    this.reset((Math.random() * 0xffffffff) >>> 0);
  }

  chooseBlessing(index) {
    const blessing = this.blessings[index];
    if (!blessing || this.screen !== SCREEN_UPGRADE) return;
    blessing.apply(this.player);
    this.sounds.pickup();
    this.wave += 1;
    this.startWave();
    this.screen = SCREEN_PLAY;
  }

  /** Once per wave, deal a fresh hand of three blessings (never the same cards). */
  rerollBlessings() {
    if (this.screen !== SCREEN_UPGRADE || this.rerollsLeft <= 0) return false;
    this.rerollsLeft -= 1;
    this.blessings = dealBlessings(this.rng, 3, this.blessings.map((b) => b.id), ownedOneTime(this.player));
    this.sounds.click();
    return true;
  }

  spawnEmber(anywhere = false) {
    this.embers.push({
      x: 30 + this.rng() * (VIEW.width - 60),
      y: anywhere ? -20 - this.rng() * 260 : -20,
      vy: range(this.rng, EMBER.fallMin, EMBER.fallMax),
      sway: range(this.rng, 0.6, 1.6),
      phase: this.rng() * Math.PI * 2,
      r: EMBER.radius,
      kind: this.rng() < 0.12 ? 'gold' : 'ember',
    });
  }

  /** The wave's one ember cache: big, slow, golden — and gone in seconds. */
  spawnCache() {
    this.cacheSpawned = true;
    this.embers.push({
      x: 80 + this.rng() * (VIEW.width - 160),
      y: -30,
      vy: 34,
      sway: 0.8,
      phase: this.rng() * Math.PI * 2,
      r: CACHE.radius,
      kind: 'cache',
      life: CACHE.lifetime,
    });
    this.floater(VIEW.width / 2, 120, 'EMBER CACHE!', '#ffe066');
    this.sounds.cache();
  }

  makeWisp(kind, x, y, vx = 0, vy = 0) {
    const def = WISP.kinds[kind];
    return {
      kind,
      x,
      y,
      vx,
      vy,
      r: def.radius,
      speed: def.speed + this.wave * WISP.speedPerWave,
      phase: this.rng() * Math.PI * 2,
      wobble: range(this.rng, 1.5, 3.2),
      // Shades run a little state machine: drift, telegraph, lunge.
      state: kind === 'shade' ? 'drift' : 'chase',
      stateT: kind === 'shade' ? 2 + this.rng() * 2 : 0,
      lx: 0,
      ly: 0,
    };
  }

  spawnWisp() {
    const kind = pickWispKind(this.rng, this.wave);
    const edge = Math.floor(this.rng() * 4);
    let x = 0;
    let y = 0;
    if (edge === 0) { x = this.rng() * VIEW.width; y = -30; }
    if (edge === 1) { x = this.rng() * VIEW.width; y = VIEW.height + 30; }
    if (edge === 2) { x = -30; y = this.rng() * VIEW.height; }
    if (edge === 3) { x = VIEW.width + 30; y = this.rng() * VIEW.height; }
    this.wisps.push(this.makeWisp(kind, x, y));
  }

  spawnPickup(x, y) {
    this.pickups.push({
      kind: pick(this.rng, PICKUP.kinds),
      x,
      y,
      r: PICKUP.radius,
      life: PICKUP.lifetime,
      phase: this.rng() * Math.PI * 2,
    });
  }

  burst(x, y, color, count, speed = 180) {
    for (let i = 0; i < count; i += 1) {
      const angle = this.rng() * Math.PI * 2;
      const v = speed * (0.3 + this.rng() * 0.7);
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * v,
        vy: Math.sin(angle) * v,
        life: 0.5 + this.rng() * 0.5,
        maxLife: 1,
        size: 2 + this.rng() * 3.5,
        color,
      });
    }
  }

  ring(x, y, color) {
    this.rings.push({ x, y, color, life: 0.45, maxLife: 0.45 });
  }

  floater(x, y, text, color) {
    this.floaters.push({ x, y, text, color, life: 1.1 });
  }

  collectEmber(ember) {
    this.combo += 1;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    this.comboTimer = this.player.comboWindow;
    const nextMult = Math.min(COMBO.maxMult, 1 + Math.floor(this.combo / COMBO.perTier));
    if (nextMult > this.mult) {
      this.floater(this.player.x, this.player.y - 34, `COMBO x${nextMult}!`, '#ffd94d');
      this.shake = Math.max(this.shake, 4);
      this.sounds.comboUp();
    }
    this.mult = nextMult;
    const isCache = ember.kind === 'cache';
    const base = isCache ? CACHE.value : EMBER.value + this.player.emberBonus + (ember.kind === 'gold' ? 15 : 0);
    const value = base * this.mult;
    this.score += value;
    this.collected += 1;
    this.quotaLeft -= isCache ? CACHE.quota : 1;
    this.floater(
      ember.x,
      ember.y - 14,
      isCache ? `CACHE +${value}` : `+${value}`,
      ember.kind === 'gold' || isCache ? '#ffe066' : '#ffd97a',
    );
    this.burst(ember.x, ember.y, isCache ? '#ffe066' : '#ffb347', isCache ? 18 : 10, isCache ? 220 : 150);
    if (isCache) this.ring(ember.x, ember.y, '#ffe066');
    this.sounds.collect(this.combo);
  }

  banishWisp(wisp, playSound = true) {
    this.score += SCORE.banish(wisp.kind);
    this.banished += 1;
    this.floater(wisp.x, wisp.y - 18, `+${SCORE.banish(wisp.kind)}`, '#c9b8ff');
    this.burst(wisp.x, wisp.y, '#9d7bff', 16, 220);
    this.ring(wisp.x, wisp.y, '#b79bff');
    this.hitstop = Math.max(this.hitstop, HITSTOP.banish);
    // The dash that banished this wisp plays the sound once, for the
    // whole chain — a nova's wash, or a plain banish.
    if (playSound) this.sounds.banish();
    if (wisp.kind === 'shard') {
      // A banished shard bursts into two motes, flying off sideways.
      this.sounds.split();
      this.floater(wisp.x, wisp.y - 38, 'SPLIT!', '#ff6ad5');
      const away = Math.atan2(this.player.y - wisp.y, this.player.x - wisp.x);
      for (const side of [-1, 1]) {
        const a = away + side * 2.2;
        this.wisps.push(this.makeWisp('mote', wisp.x, wisp.y, Math.cos(a) * 230, Math.sin(a) * 230));
      }
    }
    if (this.rng() < WISP.dropChance) this.spawnPickup(wisp.x, wisp.y);
  }

  hitPlayer(wisp) {
    const p = this.player;
    if (p.invulnLeft > 0 || p.dashTimeLeft > 0) return;
    if (p.shield) {
      p.shield = false;
      p.invulnLeft = 1.2;
      this.floater(p.x, p.y - 30, 'SHIELD!', '#8ef2ff');
      this.burst(p.x, p.y, '#8ef2ff', 14, 200);
      this.sounds.pickup();
      return;
    }
    if (p.flameWard && !p.wardUsed) {
      p.wardUsed = true;
      p.invulnLeft = 1.2;
      this.floater(p.x, p.y - 30, 'WARD!', '#ffe9a8');
      this.ring(p.x, p.y, '#ffe9a8');
      this.sounds.pickup();
      return;
    }
    p.flames -= 1;
    p.invulnLeft = p.invulnAfterHit;
    this.shake = 14;
    this.flash = 0.55;
    this.hitstop = Math.max(this.hitstop, HITSTOP.hit);
    this.combo = 0;
    this.mult = 1;
    this.comboTimer = 0;
    const dx = p.x - wisp.x;
    const dy = p.y - wisp.y;
    const len = Math.hypot(dx, dy) || 1;
    p.vx = (dx / len) * 520;
    p.vy = (dy / len) * 520;
    this.burst(p.x, p.y, '#ff5a6e', 22, 260);
    this.sounds.hit();
    if (p.flames <= 0) {
      if (p.secondWind) {
        // One last spark: the run is saved at a single flame.
        p.secondWind = false;
        p.flames = 1;
        p.invulnLeft = 2.0;
        this.hitstop = Math.max(this.hitstop, HITSTOP.secondWind);
        this.shake = 18;
        this.floater(p.x, p.y - 34, 'SECOND WIND!', '#ffe066');
        this.burst(p.x, p.y, '#ffe066', 30, 300);
        this.ring(p.x, p.y, '#ffe066');
        this.sounds.victory();
        return;
      }
      this.gameOver();
    }
  }

  gameOver() {
    this.screen = SCREEN_OVER;
    this.bannerTimer = 0;
    this.floaters = [];
    if (this.score > this.best) {
      this.best = this.score;
      saveBest(this.best);
    }
    this.sounds.gameOver();
  }

  victory() {
    this.screen = SCREEN_VICTORY;
    this.bannerTimer = 0;
    this.floaters = [];
    this.score += 500;
    if (this.score > this.best) {
      this.best = this.score;
      saveBest(this.best);
    }
    this.sounds.victory();
  }

  waveClear() {
    this.score += SCORE.waveClearBonus(this.wave);
    this.sounds.waveClear();
    this.burst(this.player.x, this.player.y, '#ffe066', 30, 280);
    this.ring(this.player.x, this.player.y, '#ffe9a8');
    this.floater(this.player.x, this.player.y - 40, `WAVE CLEAR +${SCORE.waveClearBonus(this.wave)}`, '#ffe066');
    this.embers = [];
    this.wisps = [];
    if (this.wave >= TOTAL_WAVES) {
      this.victory();
      return;
    }
    this.blessings = dealBlessings(this.rng, 3, [], ownedOneTime(this.player));
    this.rerollsLeft = 1;
    this.screen = SCREEN_UPGRADE;
  }

  step(dt, input) {
    this.time += dt;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 30);
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 1.4);
    if (this.bannerTimer > 0) this.bannerTimer -= dt;
    for (let i = this.particles.length - 1; i >= 0; i -= 1) {
      const pt = this.particles[i];
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vx *= 0.96;
      pt.vy *= 0.96;
      pt.life -= dt;
      if (pt.life <= 0) this.particles.splice(i, 1);
    }
    for (let i = this.rings.length - 1; i >= 0; i -= 1) {
      const r = this.rings[i];
      r.life -= dt;
      if (r.life <= 0) this.rings.splice(i, 1);
    }
    for (let i = this.trail.length - 1; i >= 0; i -= 1) {
      const g = this.trail[i];
      g.life -= dt;
      if (g.life <= 0) this.trail.splice(i, 1);
    }
    for (let i = this.floaters.length - 1; i >= 0; i -= 1) {
      const f = this.floaters[i];
      f.y -= 34 * dt;
      f.life -= dt;
      if (f.life <= 0) this.floaters.splice(i, 1);
    }
    if (this.screen === SCREEN_TITLE) {
      this.stepAmbient(dt);
      return 0;
    }
    if (this.screen !== SCREEN_PLAY) return 0;
    return this.stepPlay(dt, input);
  }

  stepAmbient(dt) {
    // Embers drift behind the title screen so it is alive, not static.
    this.emberTimer -= dt;
    if (this.emberTimer <= 0 && this.embers.length < 8) {
      this.spawnEmber();
      this.emberTimer = 0.7;
    }
    const scale = 1;
    this.moveEmbers(dt * scale);
  }

  stepPlay(dt, input) {
    // Hit-stop: the world holds still for a beat after a banish or a hit.
    if (this.hitstop > 0) {
      this.hitstop -= dt;
      return 0;
    }
    const p = this.player;
    const scale = this.timeScale;
    const sdt = dt * scale;
    this.waveTime += sdt;

    // --- Spawning ---
    this.emberTimer -= sdt;
    if (this.emberTimer <= 0 && this.embers.length < emberCap(this.wave)) {
      this.spawnEmber();
      this.emberTimer = Math.max(EMBER.spawnMin, EMBER.spawnBase - this.wave * EMBER.spawnPerWave);
      this.emberTimer = emberInterval(this.wave, this.emberTimer);
    }
    if (this.wave >= CACHE.fromWave && !this.cacheSpawned && this.waveTime > CACHE.delay) {
      this.spawnCache();
    }
    this.wispTimer -= sdt;
    const targetWisps = wispTarget(this.wave);
    if (this.wispTimer <= 0 && this.wisps.length < targetWisps) {
      this.spawnWisp();
      this.wispTimer = wispInterval(this.wave);
    }

    // --- Player movement: keyboard, else the mouse when it moved lately ---
    const axis = input.axis();
    let mx = 0;
    let my = 0;
    if (axis.x !== 0 || axis.y !== 0) {
      mx = axis.x;
      my = axis.y;
    } else if (input.mouseFresh()) {
      const dx = input.mouse.x - p.x;
      const dy = input.mouse.y - p.y;
      const len = Math.hypot(dx, dy);
      if (len > 6) {
        mx = dx / len;
        my = dy / len;
      }
    }
    if (mx !== 0 || my !== 0) {
      const len = Math.hypot(mx, my) || 1;
      p.dirX = mx / len;
      p.dirY = my / len;
    }
    const wantDash = input.wasPressed('Space') || input.mouse.clicked;
    if (wantDash && p.dashCdLeft <= 0 && p.dashTimeLeft <= 0) {
      p.dashTimeLeft = PLAYER.dashTime;
      p.dashCdLeft = p.dashCooldown;
      p.invulnLeft = Math.max(p.invulnLeft, PLAYER.invulnAfterDash);
      this.sounds.dash();
      this.burst(p.x, p.y, '#ffe9a8', 8, 120);
    }
    if (p.dashTimeLeft > 0) {
      p.dashTimeLeft -= dt;
      p.vx = p.dirX * PLAYER.dashSpeed;
      p.vy = p.dirY * PLAYER.dashSpeed;
      this.trail.push({ x: p.x, y: p.y, life: 0.28, dirX: p.dirX });
    } else {
      p.vx += mx * PLAYER.accel * dt;
      p.vy += my * PLAYER.accel * dt;
      const damp = Math.exp(-PLAYER.friction * dt);
      p.vx *= damp;
      p.vy *= damp;
      const speed = Math.hypot(p.vx, p.vy);
      const max = p.speed;
      if (speed > max) {
        p.vx = (p.vx / speed) * max;
        p.vy = (p.vy / speed) * max;
      }
    }
    p.x = Math.min(VIEW.width - p.radius, Math.max(p.radius, p.x + p.vx * dt));
    p.y = Math.min(VIEW.height - p.radius, Math.max(p.radius, p.y + p.vy * dt));
    if (p.dashCdLeft > 0) p.dashCdLeft -= dt;
    if (p.invulnLeft > 0) p.invulnLeft -= dt;

    // --- Combo decay ---
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.combo = 0;
        this.mult = 1;
      }
    }

    // --- Embers ---
    this.moveEmbers(sdt);
    const magnetActive = p.magnetUntil > this.time;
    const magnetR = magnetActive ? 9999 : p.magnetRadius;
    for (let i = this.embers.length - 1; i >= 0; i -= 1) {
      const e = this.embers[i];
      const dx = p.x - e.x;
      const dy = p.y - e.y;
      const d = Math.hypot(dx, dy);
      if (d < magnetR && d > 1) {
        const pull = p.magnetPull * (1 - d / (magnetR + 1)) + 120;
        e.x += (dx / d) * pull * sdt;
        e.y += (dy / d) * pull * sdt;
      }
      if (d < p.radius + e.r + 4) {
        this.collectEmber(e);
        this.embers.splice(i, 1);
      }
    }

    // --- Wisps ---
    for (let i = this.wisps.length - 1; i >= 0; i -= 1) {
      const w = this.wisps[i];
      const dx = p.x - w.x;
      const dy = p.y - w.y;
      const d = Math.hypot(dx, dy) || 1;
      let tx = dx / d;
      let ty = dy / d;
      if (w.kind === 'mote') {
        const wob = Math.sin(this.time * w.wobble + w.phase) * 0.9;
        const px = -ty * wob;
        const py = tx * wob;
        tx += px;
        ty += py;
        const tl = Math.hypot(tx, ty) || 1;
        tx /= tl;
        ty /= tl;
      }
      if (w.kind === 'shade') {
        // Drift almost unseen, telegraph, then lunge at the Keeper.
        if (w.state === 'drift') {
          w.stateT -= sdt;
          tx *= 0.55;
          ty *= 0.55;
          if (w.stateT <= 0) {
            w.state = 'telegraph';
            w.stateT = SHADE.telegraph;
          }
        } else if (w.state === 'telegraph') {
          w.stateT -= sdt;
          tx = 0;
          ty = 0;
          if (w.stateT <= 0) {
            w.state = 'lunge';
            w.stateT = SHADE.lungeTime;
            w.lx = dx / d;
            w.ly = dy / d;
          }
        } else if (w.state === 'lunge') {
          w.stateT -= sdt;
          tx = w.lx;
          ty = w.ly;
          if (w.stateT <= 0) {
            w.state = 'drift';
            w.stateT = 2.5 + this.rng() * 2;
          }
        }
      }
      const steer = w.kind === 'brute' ? 1.6 : w.kind === 'shade' && w.state === 'lunge' ? 14 : 3.2;
      const chase = w.kind === 'shade' && w.state === 'lunge' ? SHADE.lungeSpeed : w.speed;
      w.vx += (tx * chase - w.vx) * Math.min(1, steer * sdt);
      w.vy += (ty * chase - w.vy) * Math.min(1, steer * sdt);
      w.x += w.vx * sdt;
      w.y += w.vy * sdt;
      const dist = Math.hypot(p.x - w.x, p.y - w.y);
      if (dist < p.radius + w.r) {
        if (p.dashTimeLeft > 0) {
          // A dash banishes this wisp — and, with Banish Nova, its neighbours too.
          const victims = [w];
          if (p.nova) {
            for (const other of this.wisps) {
              if (other !== w && Math.hypot(other.x - w.x, other.y - w.y) < NOVA_RADIUS) victims.push(other);
            }
          }
          for (const v of victims) {
            this.banishWisp(v, false);
            const at = this.wisps.indexOf(v);
            if (at >= 0) this.wisps.splice(at, 1);
          }
          if (victims.length > 1) this.sounds.nova();
          else this.sounds.banish();
          break;
        } else {
          this.hitPlayer(w);
          if (this.screen !== SCREEN_PLAY) return EVENT_OVER;
        }
      }
    }

    // --- Pickups ---
    for (let i = this.pickups.length - 1; i >= 0; i -= 1) {
      const pk = this.pickups[i];
      pk.life -= sdt;
      if (pk.life <= 0) {
        this.pickups.splice(i, 1);
        continue;
      }
      const d = Math.hypot(p.x - pk.x, p.y - pk.y);
      if (d < p.radius + pk.r + 4) {
        if (pk.kind === 'shield') p.shield = true;
        if (pk.kind === 'magnet') p.magnetUntil = this.time + PICKUP.magnetSeconds;
        if (pk.kind === 'hourglass') p.hourglassUntil = this.time + PICKUP.hourglassSeconds;
        this.floater(pk.x, pk.y - 18, pk.kind.toUpperCase(), '#8ef2ff');
        this.burst(pk.x, pk.y, '#8ef2ff', 12, 180);
        this.sounds.pickup();
        this.pickups.splice(i, 1);
      }
    }

    if (this.quotaLeft <= 0) this.waveClear();
    return 0;
  }

  moveEmbers(dt) {
    for (let i = this.embers.length - 1; i >= 0; i -= 1) {
      const e = this.embers[i];
      e.y += e.vy * dt;
      e.x += Math.sin(this.time * e.sway + e.phase) * 18 * dt;
      if (e.kind === 'cache') {
        e.life -= dt;
        if (e.life <= 0) {
          this.burst(e.x, e.y, '#ffe066', 8, 120);
          this.embers.splice(i, 1);
          continue;
        }
      }
      if (e.y > VIEW.height + 24) this.embers.splice(i, 1);
    }
  }
}
