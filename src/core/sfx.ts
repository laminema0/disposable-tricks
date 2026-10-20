// Sound effects made in code from filtered noise. No sound files yet.
// Replace these with real recordings when the sound design is done (brief, open question 3).
// 19 Oct (reports/Sound and music.md): all of them share one soft room, as in Limbo, and are placed left or
// right by where they happen; each monster has its own voice; the volume is the player's.

import Phaser from 'phaser';
import { onVolumes, room, volumes } from './volume';

/** The monsters' voices, by what they do. */
export type Voice = 'charger' | 'spitter' | 'diver' | 'stalker' | 'watcher';

interface Burst {
  filter: BiquadFilterType;
  /** Filter frequency at the start and at the end, in Hz. */
  from: number;
  to: number;
  q?: number;
  volume: number;
  /** Length in seconds. */
  time: number;
  delay?: number;
}

export class Sfx {
  muted = false;
  private readonly ctx?: AudioContext;
  private readonly noise?: AudioBuffer;
  /** Everything goes through here: the player's volume. */
  private readonly out?: GainNode;
  /** And a little of it into one shared soft room. */
  private readonly roomIn?: GainNode;
  /** Left (-1) to right (1) for the sounds being made now. */
  private pan = 0;

  constructor(scene: Phaser.Scene) {
    // Phaser owns the audio context and unlocks it on the first touch.
    const ctx = (scene.sound as { context?: AudioContext }).context;
    if (!ctx) return;
    this.ctx = ctx;
    const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    this.noise = buffer;
    this.out = ctx.createGain();
    this.out.gain.value = volumes().sound;
    this.out.connect(ctx.destination);
    const reverb = ctx.createConvolver();
    reverb.buffer = room(ctx, 2.2);
    this.roomIn = ctx.createGain();
    this.roomIn.gain.value = 0.22;
    this.roomIn.connect(reverb).connect(this.out);
    const stop = onVolumes((v) => this.out?.gain.setTargetAtTime(v.sound, ctx.currentTime, 0.05));
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, stop);
  }

  /** Make the sounds in `play` come from the left or right (-1 to 1). */
  at(pan: number, play: () => void): void {
    this.pan = Math.max(-1, Math.min(1, pan));
    try {
      play();
    } finally {
      this.pan = 0;
    }
  }

  /** A monster's own voice as it notices him. */
  voice(kind: Voice): void {
    if (kind === 'charger') {
      // A low growl.
      this.burst({ filter: 'lowpass', from: 420, to: 160, q: 4, volume: 0.22, time: 0.45 });
      this.tone({ from: 82, to: 66, time: 0.45, volume: 0.08, wave: 'sawtooth' });
    } else if (kind === 'spitter') {
      // A hiss.
      this.burst({ filter: 'highpass', from: 3200, to: 5200, volume: 0.13, time: 0.4 });
    } else if (kind === 'diver') {
      // Two wing beats.
      this.burst({ filter: 'lowpass', from: 700, to: 200, volume: 0.2, time: 0.12 });
      this.burst({ filter: 'lowpass', from: 700, to: 200, volume: 0.18, time: 0.12, delay: 0.17 });
    } else if (kind === 'stalker') {
      // A dry creak.
      this.tone({ from: 140, to: 96, time: 0.5, volume: 0.07, wave: 'sawtooth' });
      this.burst({ filter: 'bandpass', from: 900, to: 600, q: 8, volume: 0.12, time: 0.45 });
    } else {
      // A low hum that swells.
      this.tone({ from: 110, to: 116, time: 0.8, volume: 0.1, wave: 'triangle' });
    }
  }

  /** A soft chime: a living flower found. */
  chime(): void {
    [0, 1, 2].forEach((i) => this.tone({ from: [988, 1319, 1568][i], time: 0.9, volume: 0.06, delay: i * 0.09 }));
  }

  /** Water. `size` 1 is a full landing, 0.4 is one step. */
  splash(size = 1): void {
    this.burst({ filter: 'bandpass', from: 1100, to: 320, q: 0.8, volume: 0.32 * size, time: 0.22 + 0.2 * size });
    this.burst({ filter: 'highpass', from: 2600, to: 4200, volume: 0.1 * size, time: 0.12, delay: 0.02 });
  }

  /** A step on sand: each a little different, a soft crunch over a dull thud. */
  step(): void {
    const r = 0.8 + Math.random() * 0.4;
    this.burst({ filter: 'lowpass', from: 260 * r, to: 120 * r, volume: 0.08 * r, time: 0.07 });
    this.burst({ filter: 'bandpass', from: 2400 * r, to: 1600 * r, q: 1.2, volume: 0.035 * r, time: 0.06 });
  }

  land(): void {
    this.burst({ filter: 'lowpass', from: 200, to: 70, volume: 0.3, time: 0.14 });
    this.burst({ filter: 'bandpass', from: 2200, to: 1200, q: 1, volume: 0.05, time: 0.12 });
  }

  swish(): void {
    this.burst({ filter: 'bandpass', from: 700, to: 2800, q: 1.4, volume: 0.22, time: 0.15 });
  }

  // ---- monsters, hearts and flowers (stand-ins, like the rest) ----

  /** He loses a petal. */
  hurt(): void {
    this.burst({ filter: 'lowpass', from: 900, to: 90, volume: 0.4, time: 0.28 });
    this.tone({ from: 220, to: 110, time: 0.3, volume: 0.16, wave: 'triangle' });
  }

  /** His blade lands on a monster. */
  hit(): void {
    this.burst({ filter: 'bandpass', from: 1800, to: 500, q: 2, volume: 0.34, time: 0.1 });
  }

  /** A monster bursts into flowers. A sneak attack rings a little higher. */
  bloom(sneak = false): void {
    this.burst({ filter: 'highpass', from: 900, to: 3600, volume: 0.2, time: 0.3 });
    const base = sneak ? 660 : 523;
    [0, 1, 2].forEach((i) => this.tone({ from: base * [1, 1.26, 1.5][i], time: 0.26, volume: 0.1, delay: i * 0.06 }));
  }

  /** One flower picked up. `count` raises the note a step with every flower. */
  pick(count = 0): void {
    this.tone({ from: 784 * Math.pow(1.06, count % 10), time: 0.12, volume: 0.09 });
  }

  /** A petal grows back. */
  petal(): void {
    [0, 1, 2, 3].forEach((i) => this.tone({ from: [523, 659, 784, 1047][i], time: 0.3, volume: 0.11, delay: i * 0.07 }));
  }

  /** A monster has seen him. */
  alert(): void {
    this.tone({ from: 300, to: 420, time: 0.12, volume: 0.07, wave: 'square' });
  }

  spit(): void {
    this.burst({ filter: 'bandpass', from: 2400, to: 700, q: 3, volume: 0.24, time: 0.12 });
  }

  /** Something big moves fast: a charge, a swoop, a long arm. */
  rush(): void {
    this.burst({ filter: 'bandpass', from: 300, to: 1300, q: 1, volume: 0.24, time: 0.3 });
  }

  /** The Watcher's light has found him. */
  gaze(): void {
    this.tone({ from: 150, to: 190, time: 0.5, volume: 0.14, wave: 'sawtooth' });
  }

  /** One tick of the Watcher's countdown. `urgency` 0 to 1 raises it. */
  tick(urgency = 0): void {
    this.tone({ from: 700 + 700 * urgency, time: 0.05, volume: 0.13, wave: 'square' });
  }

  /** The flower is planted. */
  win(): void {
    [0, 1, 2, 3, 4].forEach((i) =>
      this.tone({ from: [392, 523, 659, 784, 1047][i], time: 0.9, volume: 0.1, delay: 0.5 + i * 0.16, wave: 'triangle' }),
    );
  }

  /** The last petal falls. */
  lose(): void {
    [0, 1, 2].forEach((i) => this.tone({ from: [330, 262, 196][i], time: 0.7, volume: 0.12, delay: i * 0.28, wave: 'triangle' }));
  }

  /** A short note from an oscillator. */
  private tone(t: { from: number; to?: number; time: number; volume: number; delay?: number; wave?: OscillatorType }): void {
    const ctx = this.ctx;
    if (!ctx || this.muted || ctx.state !== 'running') return;
    const start = ctx.currentTime + (t.delay ?? 0);
    const osc = ctx.createOscillator();
    osc.type = t.wave ?? 'sine';
    osc.frequency.setValueAtTime(t.from, start);
    if (t.to) osc.frequency.exponentialRampToValueAtTime(t.to, start + t.time);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(t.volume, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + t.time);
    osc.connect(gain);
    this.send(gain);
    osc.start(start);
    osc.stop(start + t.time + 0.05);
  }

  /** Into the player's volume, placed left or right, with a little of it into the room. */
  private send(node: AudioNode): void {
    const ctx = this.ctx;
    if (!ctx || !this.out || !this.roomIn) return;
    let last: AudioNode = node;
    if (this.pan !== 0 && typeof ctx.createStereoPanner === 'function') {
      const panner = ctx.createStereoPanner();
      panner.pan.value = this.pan;
      last = node.connect(panner);
    }
    last.connect(this.out);
    last.connect(this.roomIn);
  }

  private burst(b: Burst): void {
    const ctx = this.ctx;
    if (!ctx || !this.noise || this.muted || ctx.state !== 'running') return;
    const start = ctx.currentTime + (b.delay ?? 0);
    const source = ctx.createBufferSource();
    source.buffer = this.noise;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = b.filter;
    filter.Q.value = b.q ?? 0.7;
    filter.frequency.setValueAtTime(b.from, start);
    filter.frequency.exponentialRampToValueAtTime(b.to, start + b.time);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(b.volume, start + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + b.time);

    source.connect(filter).connect(gain);
    this.send(gain);
    source.start(start, Math.random() * 0.9);
    source.stop(start + b.time + 0.05);
  }
}
