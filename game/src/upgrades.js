// The blessings offered when a wave clears: pick one of three, and the
// choice shapes the rest of the run. Each blessing knows its own name,
// what it does, and how it changes the player's stats. The `glyph` is the
// two-letter mark drawn on its card, so a blessing reads at a glance.
/** Blessings that are flags, not stacks: taking one twice would be a dead pick. */
const ONE_TIME = ['banish-nova', 'flame-ward', 'second-wind', 'storm-caller'];

/** The one-time blessings this player already holds, by id. */
export function ownedOneTime(player) {
  return ONE_TIME.filter((id) => {
    if (id === 'banish-nova') return player.nova;
    if (id === 'flame-ward') return player.flameWard;
    if (id === 'second-wind') return player.secondWind;
    if (id === 'storm-caller') return player.stormCaller;
    return false;
  });
}

export const BLESSINGS = [
  {
    id: 'wide-light',
    glyph: 'WL',
    name: 'Wide Light',
    desc: 'Your lantern pulls embers from 60% further away.',
    apply: (p) => {
      p.magnetRadius *= 1.6;
    },
  },
  {
    id: 'swift-boots',
    glyph: 'SB',
    name: 'Swift Boots',
    desc: 'Move 18% faster. Outrun the dark.',
    apply: (p) => {
      p.speed *= 1.18;
    },
  },
  {
    id: 'extra-flame',
    glyph: 'EF',
    name: 'Extra Flame',
    desc: 'Gain a flame, up to 5. A little more light to lose.',
    apply: (p) => {
      p.maxFlames = Math.min(5, p.maxFlames + 1);
      p.flames = Math.min(p.maxFlames, p.flames + 1);
    },
  },
  {
    id: 'quick-dash',
    glyph: 'QD',
    name: 'Quick Dash',
    desc: 'Dash recharges 35% faster. Dash through wisps to banish them.',
    apply: (p) => {
      p.dashCooldown *= 0.65;
    },
  },
  {
    id: 'golden-embers',
    glyph: 'GE',
    name: 'Golden Embers',
    desc: 'Every ember is worth +6 points.',
    apply: (p) => {
      p.emberBonus += 6;
    },
  },
  {
    id: 'long-combo',
    glyph: 'LC',
    name: 'Long Combo',
    desc: 'Your combo lasts 1.5s longer before it fades.',
    apply: (p) => {
      p.comboWindow += 1.5;
    },
  },
  {
    id: 'steady-heart',
    glyph: 'SH',
    name: 'Steady Heart',
    desc: 'After a hit, stay untouchable 1s longer.',
    apply: (p) => {
      p.invulnAfterHit += 1.0;
    },
  },
  {
    id: 'ember-magnet',
    glyph: 'EM',
    name: 'Ember Magnet',
    desc: 'Embers drift toward you from across the garden.',
    apply: (p) => {
      p.magnetRadius *= 2.2;
      p.magnetPull *= 1.5;
    },
  },
  {
    id: 'banish-nova',
    glyph: 'NV',
    name: 'Banish Nova',
    desc: 'Banishing a wisp also banishes every wisp near it.',
    apply: (p) => {
      p.nova = true;
    },
  },
  {
    id: 'flame-ward',
    glyph: 'FW',
    name: 'Flame Ward',
    desc: 'The first hit of each wave costs no flame at all.',
    apply: (p) => {
      p.flameWard = true;
    },
  },
  {
    id: 'second-wind',
    glyph: 'SW',
    name: 'Second Wind',
    desc: 'Once per run, a fatal hit leaves you at one flame instead.',
    apply: (p) => {
      p.secondWind = true;
    },
  },
  {
    id: 'storm-caller',
    glyph: 'SC',
    name: 'Storm Caller',
    desc: 'Every wave begins with five embers already falling.',
    apply: (p) => {
      p.stormCaller = true;
    },
  },
];

/**
 * Deal `count` different blessings. `exclude` holds ids to leave out —
 * the reroll deals a fresh hand, never the cards just shown. `owned`
 * holds one-time blessings already taken this run: they never come back,
 * so a hand is never a dead pick.
 */
export function dealBlessings(rng, count = 3, exclude = [], owned = []) {
  const pool = BLESSINGS.filter((b) => !exclude.includes(b.id) && !(ONE_TIME.includes(b.id) && owned.includes(b.id)));
  const dealt = [];
  while (dealt.length < count && pool.length > 0) {
    const i = Math.floor(rng() * pool.length);
    dealt.push(pool.splice(i, 1)[0]);
  }
  return dealt;
}
