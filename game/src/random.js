// A tiny seeded RNG (mulberry32) so the screenshot scenes and the game
// itself can be replayed from one seed: the same seed always deals the
// same embers, wisps and upgrade offers.
export function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pick a value in [min, max) from `rng`. */
export function range(rng, min, max) {
  return min + rng() * (max - min);
}

/** Pick one element of `list` from `rng`. */
export function pick(rng, list) {
  return list[Math.floor(rng() * list.length)];
}
