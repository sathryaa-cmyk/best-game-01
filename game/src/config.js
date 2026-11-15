// Emberfall tuning: every number the game balances on lives here, so a
// play-test can retune the feel without touching the rules in world.js.
export const VIEW = { width: 1280, height: 720 };
export const STEP = 1 / 60;
export const TOTAL_WAVES = 10;

export const PLAYER = {
  radius: 16,
  speed: 310,
  accel: 2600,
  friction: 6.5,
  dashSpeed: 980,
  dashTime: 0.16,
  dashCooldown: 2.2,
  invulnAfterHit: 1.6,
  invulnAfterDash: 0.35,
  startFlames: 3,
  maxFlames: 5,
};

export const EMBER = {
  radius: 11,
  value: 10,
  fallMin: 42,
  fallMax: 78,
  sway: 26,
  maxAlive: 14,
  /** Seconds between spawns at wave 1; each wave shaves a little off. */
  spawnBase: 0.95,
  spawnPerWave: 0.05,
  spawnMin: 0.34,
  magnetRadius: 110,
  magnetPull: 620,
};

/** Quota of embers to gather before a wave clears. */
export function waveQuota(wave) {
  return 6 + wave * 2;
}

/**
 * The ember cache: one big golden ember per wave from wave 2, worth a
 * chunk of score and three quota at once — but it drifts away and fades
 * in seconds, so chasing it means leaving the safe lanes.
 */
export const CACHE = {
  radius: 20,
  value: 50,
  quota: 3,
  lifetime: 7,
  fromWave: 2,
  /** Seconds into the wave before the cache drifts in. */
  delay: 6,
};

export const WISP = {
  kinds: {
    wisp: { radius: 17, speed: 72, score: 25, fromWave: 1 },
    mote: { radius: 12, speed: 168, score: 40, fromWave: 3 },
    /** A shard splits into two motes when banished — never dash it blind. */
    shard: { radius: 19, speed: 96, score: 50, fromWave: 4 },
    brute: { radius: 27, speed: 46, score: 60, fromWave: 5 },
    /** A shade drifts almost unseen, then telegraphs and lunges. */
    shade: { radius: 15, speed: 58, score: 70, fromWave: 6 },
  },
  /** How many wisps a wave fields at once (cap included). */
  countForWave: (wave) => Math.min(3 + wave, 13),
  speedPerWave: 7,
  spawnInterval: 1.6,
  /** A wisp banished by a dash may drop a blessing pickup. */
  dropChance: 0.14,
};

/** A shade drifts almost unseen, then telegraphs and lunges. */
export const SHADE = {
  /** How fast a lunging shade flies at the Keeper. */
  lungeSpeed: 430,
  /** Seconds a shade warns before it lunges. */
  telegraph: 0.6,
  /** Seconds a lunge lasts before the shade drifts again. */
  lungeTime: 0.5,
};

export const PICKUP = {
  radius: 15,
  lifetime: 9,
  kinds: ['shield', 'magnet', 'hourglass'],
  magnetSeconds: 7,
  hourglassSeconds: 5,
  hourglassScale: 0.45,
};

export const COMBO = {
  window: 2.5,
  /** Every 5 chained embers raises the multiplier by one. */
  perTier: 5,
  maxMult: 5,
};

/** Freeze frames: the world holds still for a beat on a banish or a hit. */
export const HITSTOP = {
  banish: 0.09,
  hit: 0.14,
  secondWind: 0.3,
};

/** A Banish Nova chains to every wisp inside this radius of the banished one. */
export const NOVA_RADIUS = 95;

export const SCORE = {
  waveClearBonus: (wave) => 50 * wave,
  banish: (kind) => WISP.kinds[kind].score,
};

export const COLORS = {
  skyTop: '#0b1030',
  skyMid: '#1a1440',
  skyBottom: '#2c1a4d',
  ember: '#ffb347',
  emberCore: '#fff3c4',
  wisp: '#7b5cff',
  mote: '#c44dff',
  shard: '#ff6ad5',
  brute: '#5a3fd4',
  shade: '#8f7bff',
  player: '#ffd97a',
  lantern: '#ffe9a8',
  hud: '#f5eeda',
  danger: '#ff5a6e',
};
