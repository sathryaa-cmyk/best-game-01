// All of Emberfall's sound is synthesized with WebAudio: no audio files,
// no network, just oscillators and filtered noise. Everything is guarded,
// so a browser with no audio (or a headless screenshot run) never breaks
// the game: sounds simply do nothing until the first gesture unlocks them.
const MUTE_KEY = 'emberfall.muted';

function tone(ctx, { freq, freqEnd, dur, type = 'sine', gain = 0.16, when = 0 }) {
  const t0 = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (freqEnd !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t0 + dur);
  amp.gain.setValueAtTime(0, t0);
  amp.gain.linearRampToValueAtTime(gain, t0 + 0.012);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(amp).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function noise(ctx, { dur, gain = 0.2, freq = 1200, when = 0 }) {
  const t0 = ctx.currentTime + when;
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  const amp = ctx.createGain();
  amp.gain.setValueAtTime(gain, t0);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter).connect(amp).connect(ctx.destination);
  src.start(t0);
}

export class SoundBank {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.padNodes = null;
    try {
      this.muted = localStorage.getItem(MUTE_KEY) === '1';
    } catch {
      this.muted = false;
    }
  }

  /** Call from a user gesture; browsers only let audio start after one. */
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.startPad();
    } catch {
      this.ctx = null;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    try {
      localStorage.setItem(MUTE_KEY, this.muted ? '1' : '0');
    } catch {
      /* storage unavailable: mute still applies for this session */
    }
    if (this.ctx) void this.ctx.resume();
    return this.muted;
  }

  /** A low, slow two-note drone under the whole game. */
  startPad() {
    if (!this.ctx || this.padNodes) return;
    const ctx = this.ctx;
    const amp = ctx.createGain();
    amp.gain.value = 0.035;
    amp.connect(ctx.destination);
    const oscs = [110, 164.81, 220].map((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = i === 2 ? 'triangle' : 'sine';
      osc.frequency.value = freq;
      osc.detune.value = i === 1 ? 4 : 0;
      osc.connect(amp);
      osc.start();
      return osc;
    });
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoAmp = ctx.createGain();
    lfoAmp.gain.value = 0.015;
    lfo.connect(lfoAmp).connect(amp.gain);
    lfo.start();
    this.padNodes = { oscs, lfo, amp };
  }

  ready() {
    return this.ctx !== null && !this.muted;
  }

  collect(combo) {
    if (!this.ready()) return;
    const step = Math.min(combo, 12);
    tone(this.ctx, { freq: 520 * Math.pow(1.059, step), freqEnd: 780 * Math.pow(1.059, step), dur: 0.14, type: 'sine', gain: 0.14 });
    tone(this.ctx, { freq: 1040 * Math.pow(1.059, step), dur: 0.09, type: 'triangle', gain: 0.05 });
  }

  banish() {
    if (!this.ready()) return;
    noise(this.ctx, { dur: 0.22, gain: 0.16, freq: 900 });
    tone(this.ctx, { freq: 320, freqEnd: 90, dur: 0.2, type: 'sawtooth', gain: 0.07 });
  }

  hit() {
    if (!this.ready()) return;
    tone(this.ctx, { freq: 160, freqEnd: 55, dur: 0.35, type: 'sawtooth', gain: 0.2 });
    noise(this.ctx, { dur: 0.3, gain: 0.22, freq: 300 });
  }

  dash() {
    if (!this.ready()) return;
    noise(this.ctx, { dur: 0.18, gain: 0.12, freq: 2400 });
  }

  pickup() {
    if (!this.ready()) return;
    tone(this.ctx, { freq: 660, dur: 0.1, gain: 0.12 });
    tone(this.ctx, { freq: 990, dur: 0.16, gain: 0.12, when: 0.08 });
  }

  waveClear() {
    if (!this.ready()) return;
    [523, 659, 784, 1047].forEach((freq, i) => tone(this.ctx, { freq, dur: 0.22, gain: 0.12, when: i * 0.09 }));
  }

  victory() {
    if (!this.ready()) return;
    [523, 659, 784, 1047, 1319, 1568].forEach((freq, i) => tone(this.ctx, { freq, dur: 0.35, type: 'triangle', gain: 0.12, when: i * 0.11 }));
  }

  gameOver() {
    if (!this.ready()) return;
    [392, 330, 262, 196].forEach((freq, i) => tone(this.ctx, { freq, dur: 0.4, type: 'triangle', gain: 0.12, when: i * 0.16 }));
  }

  click() {
    if (!this.ready()) return;
    tone(this.ctx, { freq: 880, dur: 0.06, type: 'triangle', gain: 0.08 });
  }
}
