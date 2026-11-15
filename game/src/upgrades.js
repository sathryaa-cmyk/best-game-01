// The blessings offered when a wave clears: pick one of three, and the
// choice shapes the rest of the run. Each blessing knows its own name,
// what it does, and how it changes the player's stats.
export const BLESSINGS = [
  {
    id: 'wide-light',
    name: 'Wide Light',
    desc: 'Your lantern pulls embers from 60% further away.',
    apply: (p) => {
      p.magnetRadius *= 1.6;
    },
  },
  {
    id: 'swift-boots',
    name: 'Swift Boots',
    desc: 'Move 18% faster. Outrun the dark.',
    apply: (p) => {
      p.speed *= 1.18;
    },
  },
  {
    id: 'extra-flame',
    name: 'Extra Flame',
    desc: 'Gain a flame, up to 5. A little more light to lose.',
    apply: (p) => {
      p.maxFlames = Math.min(5, p.maxFlames + 1);
      p.flames = Math.min(p.maxFlames, p.flames + 1);
    },
  },
  {
    id: 'quick-dash',
    name: 'Quick Dash',
    desc: 'Dash recharges 35% faster. Dash through wisps to banish them.',
    apply: (p) => {
      p.dashCooldown *= 0.65;
    },
  },
  {
    id: 'golden-embers',
    name: 'Golden Embers',
    desc: 'Every ember is worth +6 points.',
    apply: (p) => {
      p.emberBonus += 6;
    },
  },
  {
    id: 'long-combo',
    name: 'Long Combo',
    desc: 'Your combo lasts 1.5s longer before it fades.',
    apply: (p) => {
      p.comboWindow += 1.5;
    },
  },
  {
    id: 'steady-heart',
    name: 'Steady Heart',
    desc: 'After a hit, stay untouchable 1s longer.',
    apply: (p) => {
      p.invulnAfterHit += 1.0;
    },
  },
  {
    id: 'ember-magnet',
    name: 'Ember Magnet',
    desc: 'Embers drift toward you from across the garden.',
    apply: (p) => {
      p.magnetRadius *= 2.2;
      p.magnetPull *= 1.5;
    },
  },
];

/** Deal three different blessings for the wave-clear choice. */
export function dealBlessings(rng, count = 3) {
  const pool = [...BLESSINGS];
  const dealt = [];
  while (dealt.length < count && pool.length > 0) {
    const i = Math.floor(rng() * pool.length);
    dealt.push(pool.splice(i, 1)[0]);
  }
  return dealt;
}
