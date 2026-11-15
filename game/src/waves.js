// Emberfall's waves: what each of the ten nights brings. One module, one
// job — the theme of a wave (storm nights rain embers, swarm nights send
// more wisps), which wisps may appear and in what mix, and how the sky
// warms toward dawn as the Keeper clears waves. world.js asks it what a
// wave is; render.js asks it what a wave looks like.
import { EMBER, WISP } from './config.js';

/** The ten nights, in order. `storm` rains embers twice as fast and asks
 *  for four more of them; `swarm` fields four extra wisps at once. */
export const WAVE_THEMES = [
  null, // waves are 1-based; index 0 is never used
  { name: 'FIRST LIGHT', storm: false, swarm: false },
  { name: 'THE GARDEN WAKES', storm: false, swarm: false },
  { name: 'EMBER STORM', storm: true, swarm: false },
  { name: 'THE SHARDS WAKE', storm: false, swarm: false },
  { name: 'WISP SWARM', storm: false, swarm: true },
  { name: 'SHADES IN THE DARK', storm: true, swarm: false },
  { name: 'THE SWARM RETURNS', storm: false, swarm: true },
  { name: 'STORM OF EMBERS', storm: true, swarm: false },
  { name: 'THE LONG NIGHT', storm: true, swarm: true },
  { name: 'THE LAST NIGHT', storm: true, swarm: true },
];

export function waveTheme(wave) {
  return WAVE_THEMES[Math.max(1, Math.min(10, wave))] || WAVE_THEMES[1];
}

/** Extra embers a storm wave asks for before it clears. */
export function waveQuotaBonus(wave) {
  return waveTheme(wave).storm ? 4 : 0;
}

/** Ember spawn interval for this wave: storms halve it. */
export function emberInterval(wave, base) {
  return waveTheme(wave).storm ? base * 0.55 : base;
}

/** How many wisps a wave fields at once: swarms add four. */
export function wispTarget(wave) {
  return WISP.countForWave(wave) + (waveTheme(wave).swarm ? 4 : 0);
}

/** How many embers may fall at once: storms rain a thicker sky. */
export function emberCap(wave) {
  return EMBER.maxAlive + (waveTheme(wave).storm ? 6 : 0);
}

/** Wisp spawn interval for this wave: swarms send them faster. */
export function wispInterval(wave) {
  return waveTheme(wave).swarm ? WISP.spawnInterval * 0.7 : WISP.spawnInterval;
}

// Weighted mix of the wisp kinds a wave may field. The plain wisp is
// always the most common; each new kind joins the mix from its wave and
// stays rarer than the ones before it.
const KIND_WEIGHTS = {
  wisp: 5,
  mote: 3,
  shard: 2.5,
  brute: 2,
  shade: 2,
};

/** Pick one wisp kind for this wave, from the kinds unlocked so far. */
export function pickWispKind(rng, wave) {
  const kinds = Object.keys(WISP.kinds).filter((k) => wave >= WISP.kinds[k].fromWave);
  let total = 0;
  for (const k of kinds) total += KIND_WEIGHTS[k] || 1;
  let roll = rng() * total;
  for (const k of kinds) {
    roll -= KIND_WEIGHTS[k] || 1;
    if (roll <= 0) return k;
  }
  return kinds[0];
}

function hexRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function lerpColor(a, b, t) {
  const ca = hexRgb(a);
  const cb = hexRgb(b);
  const mix = ca.map((v, i) => Math.round(v + (cb[i] - v) * t));
  return `rgb(${mix[0]},${mix[1]},${mix[2]})`;
}

// The dawn creeps in: wave 1 is deep indigo night, wave 10 is a rose
// horizon with the first gold of morning. t is 0 at wave 1, 1 at wave 10.
const DAWN_FROM = { top: '#0b1030', mid: '#1a1440', bottom: '#2c1a4d' };
const DAWN_TO = { top: '#241a4d', mid: '#4a2350', bottom: '#8a4a3a' };

/** Sky colours for this wave, plus the warm glow hugging the horizon. */
export function wavePalette(wave) {
  const t = Math.max(0, Math.min(1, (wave - 1) / 9));
  return {
    skyTop: lerpColor(DAWN_FROM.top, DAWN_TO.top, t),
    skyMid: lerpColor(DAWN_FROM.mid, DAWN_TO.mid, t),
    skyBottom: lerpColor(DAWN_FROM.bottom, DAWN_TO.bottom, t),
    /** 0 on the first night, 1 on the last: how much dawn shows. */
    dawn: t,
  };
}
