// Calm ambient music, made in code (Amin, 19 Oct: "a calm ambient music on the background"; reports/Sound and music.md).
// A soft pad that drifts from chord to chord, the desert's wind, and a faint low drone. It follows the journey
// gently: it darkens when a monster is suspicious, a soft low pulse joins when one has him, each living flower
// found adds bell notes, and planting resolves it into a bright chord. Each detour has its own key.
// One player for the whole session: it carries on across stretches and detours instead of starting again.

import { onVolumes, room, volumes } from './volume';

/** The places, each with its root note (MIDI) and chords as steps above the root. */
const PLACES = [
  // The dry road: D, dorian, open and a little wistful.
  { root: 50, chords: [[0, 7, 10, 14, 15], [-2, 5, 9, 14], [3, 10, 14, 17], [5, 12, 14, 19], [0, 7, 12, 14, 17]] },
  // The oasis: F, lydian, light.
  { root: 53, chords: [[0, 7, 11, 14, 16], [2, 9, 14, 18], [-5, 4, 7, 11, 14], [0, 4, 9, 14]] },
  // The old city: A, aeolian, older and quieter.
  { root: 45, chords: [[0, 7, 12, 15, 19], [-4, 3, 7, 12], [-2, 5, 10, 14], [-7, 0, 5, 9, 12]] },
  // The canyon: E, suspended and wide.
  { root: 52, chords: [[0, 7, 12, 14, 19], [5, 12, 14, 17], [-2, 5, 10, 14], [3, 10, 15, 19]] },
];
/** The road of each land (lands.ts), in order: the desert above, then ash, salt, canyon and city. */
const ROADS = [
  PLACES[0],
  // Ash: C, aeolian, low and smoky.
  { root: 48, chords: [[0, 7, 12, 15], [-4, 3, 8, 12], [-2, 5, 10, 14], [3, 10, 15, 19]] },
  // Salt: G, lydian, cold and open.
  { root: 55, chords: [[0, 7, 11, 14, 18], [2, 9, 14, 18], [-3, 4, 9, 12, 16], [0, 4, 11, 14]] },
  // Canyon: E, phrygian, dry and wide.
  { root: 52, chords: [[0, 7, 12, 15, 19], [1, 8, 13, 17], [-2, 5, 10, 13], [0, 7, 10, 15]] },
  // City: Bb, dorian, hushed.
  { root: 46, chords: [[0, 7, 10, 14, 17], [5, 12, 16, 21], [-2, 5, 9, 14], [3, 10, 14, 19]] },
];

/** Planting: the road's key, brightened to major. */
const RESOLVED = [0, 7, 11, 14, 16, 19];

const LEVEL = {
  /** Overall loudness of the music under the sound effects. */
  master: 0.42,
  pad: 0.03,
  bell: 0.022,
  drone: 0.018,
  wind: 0.03,
  pulse: 0.05,
  /** The pad's brightness: calm, and fully dark. */
  bright: 2100,
  dark: 850,
};

const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

export class Music {
  private static players = new WeakMap<AudioContext, Music>();

  /** The one player for this audio context. */
  static for(ctx: AudioContext): Music {
    let player = Music.players.get(ctx);
    if (!player) Music.players.set(ctx, (player = new Music(ctx)));
    return player;
  }

  private readonly master: GainNode;
  private readonly duckGain: GainNode;
  private readonly padFilter: BiquadFilterNode;
  private readonly reverbIn: GainNode;
  private readonly pulseAmp: GainNode;
  private readonly pulseDepth: GainNode;
  private readonly windGain: GainNode;
  private readonly windFilter: BiquadFilterNode;
  private readonly drone: OscillatorNode;
  private started = false;
  private muted = false;
  private place = 0;
  private flowers = 0;
  private tension = 0;
  private chordIndex = 0;
  private notes: number[] = PLACES[0].chords[0];
  private voices: { stop: (at: number) => void }[] = [];
  private resolvedUntil = 0;
  private timers: number[] = [];

  private constructor(private readonly ctx: AudioContext) {
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.duckGain = ctx.createGain();
    this.master.connect(this.duckGain).connect(ctx.destination);

    // One long, soft room for everything musical.
    const reverb = ctx.createConvolver();
    reverb.buffer = room(ctx, 5);
    this.reverbIn = ctx.createGain();
    this.reverbIn.gain.value = 0.7;
    this.reverbIn.connect(reverb).connect(this.master);

    this.padFilter = ctx.createBiquadFilter();
    this.padFilter.type = 'lowpass';
    this.padFilter.frequency.value = LEVEL.bright;
    this.padFilter.Q.value = 0.4;
    this.padFilter.connect(this.master);
    this.padFilter.connect(this.reverbIn);

    // A faint drone an octave under the root.
    this.drone = ctx.createOscillator();
    this.drone.type = 'sine';
    const droneGain = ctx.createGain();
    droneGain.gain.value = LEVEL.drone;
    this.drone.connect(droneGain).connect(this.padFilter);

    // The pulse that joins when a monster has him: the drone's note, breathing slowly.
    const pulse = ctx.createOscillator();
    pulse.type = 'sine';
    pulse.frequency.value = hz(PLACES[0].root - 12);
    this.pulseAmp = ctx.createGain();
    this.pulseAmp.gain.value = 0;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.9;
    this.pulseDepth = ctx.createGain();
    this.pulseDepth.gain.value = 0;
    lfo.connect(this.pulseDepth).connect(this.pulseAmp.gain);
    pulse.connect(this.pulseAmp).connect(this.master);
    pulse.start();
    lfo.start();

    // The wind: filtered noise that wanders.
    const noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const wind = ctx.createBufferSource();
    wind.buffer = noise;
    wind.loop = true;
    this.windFilter = ctx.createBiquadFilter();
    this.windFilter.type = 'bandpass';
    this.windFilter.frequency.value = 600;
    this.windFilter.Q.value = 0.9;
    this.windGain = ctx.createGain();
    this.windGain.gain.value = LEVEL.wind;
    wind.connect(this.windFilter).connect(this.windGain).connect(this.master);
    this.windGain.connect(this.reverbIn);
    wind.start();
    this.drone.frequency.value = hz(PLACES[0].root - 12);
    this.drone.start();

    onVolumes(() => this.applyVolume());
  }

  /** Begin, once the browser lets sound play (after the first touch). Safe to call again. */
  start(): void {
    if (this.started) return;
    if (this.ctx.state !== 'running') {
      const go = () => {
        if (this.ctx.state === 'running') {
          this.ctx.removeEventListener('statechange', go);
          this.start();
        }
      };
      this.ctx.addEventListener('statechange', go);
      return;
    }
    this.started = true;
    this.applyVolume(6);
    this.nextChord();
    this.loop(() => this.bell(), 4.5, 8);
    this.loop(() => this.wanderWind(), 3, 6);
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.applyVolume(0.4);
  }

  /** Which land's road plays when he is on the road (lands.ts). */
  setLand(index: number): void {
    const road = ROADS[Math.max(0, index) % ROADS.length];
    if (PLACES[0] === road) return;
    PLACES[0] = road;
    if (this.place === 0) {
      this.chordIndex = 0;
      this.drone.frequency.setTargetAtTime(hz(road.root - 12), this.ctx.currentTime, 3);
      if (this.started) this.nextChord(true);
    }
  }

  /** Which place: -1 or 0 is the road, 1 to 3 the detours. Takes effect at the next chord. */
  setPlace(index: number): void {
    const next = Math.max(0, Math.min(PLACES.length - 1, index + 1));
    if (next === this.place) return;
    this.place = next;
    this.chordIndex = 0;
    const now = this.ctx.currentTime;
    const low = hz(PLACES[next].root - 12);
    this.drone.frequency.setTargetAtTime(low, now, 3);
    if (this.started) this.nextChord(true);
  }

  /** How many living flowers he has found: each makes the bells come more often. */
  setFlowers(count: number): void {
    this.flowers = Math.max(0, count);
  }

  /** 0 calm, about 0.5 a monster is suspicious, 1 a monster has him. Eased, never sudden. */
  setTension(level: number): void {
    const t = Math.max(0, Math.min(1, level));
    if (Math.abs(t - this.tension) < 0.01) return;
    this.tension = t;
    const now = this.ctx.currentTime;
    this.padFilter.frequency.setTargetAtTime(LEVEL.bright - (LEVEL.bright - LEVEL.dark) * t, now, 1.6);
    const pulse = t > 0.75 ? LEVEL.pulse * (t - 0.75) * 4 : 0;
    this.pulseAmp.gain.setTargetAtTime(pulse / 2, now, 1.2);
    this.pulseDepth.gain.setTargetAtTime(pulse / 2, now, 1.2);
  }

  /** A living flower found: a small rising chime in the key. */
  chime(): void {
    if (!this.started) return;
    const top = this.notes.slice(-3);
    top.forEach((n, i) => this.bellNote(hz(PLACES[this.place].root + n + 24), LEVEL.bell * 1.6, i * 0.14));
  }

  /** Planting: the music resolves into a bright major chord for a while. */
  resolve(): void {
    if (!this.started) return;
    this.resolvedUntil = this.ctx.currentTime + 24;
    this.padFilter.frequency.setTargetAtTime(3000, this.ctx.currentTime, 2);
    this.playChord(RESOLVED, PLACES[this.place].root, 3);
  }

  /** The last petal fell: the music sinks and quietens. */
  sink(): void {
    this.padFilter.frequency.setTargetAtTime(500, this.ctx.currentTime, 2.5);
    this.setTension(0);
  }

  /** A short dip under a hit, so the hit is heard. */
  duck(): void {
    const now = this.ctx.currentTime;
    this.duckGain.gain.cancelScheduledValues(now);
    this.duckGain.gain.setValueAtTime(this.duckGain.gain.value, now);
    this.duckGain.gain.linearRampToValueAtTime(0.65, now + 0.04);
    this.duckGain.gain.setTargetAtTime(1, now + 0.12, 0.35);
  }

  private applyVolume(fade = 0.6): void {
    const target = this.muted || !this.started ? 0 : LEVEL.master * volumes().music;
    this.master.gain.setTargetAtTime(target, this.ctx.currentTime, fade / 3);
  }

  /** Run `act` again and again, a random number of seconds apart. */
  private loop(act: () => void, min: number, max: number): void {
    const next = () => {
      act();
      this.timers.push(window.setTimeout(next, (min + Math.random() * (max - min)) * 1000));
    };
    this.timers.push(window.setTimeout(next, (min + Math.random() * (max - min)) * 1000));
  }

  private nextChord(now = false): void {
    if (!now) {
      // Each chord holds 10–14 s; the first comes at once.
      this.timers.push(window.setTimeout(() => this.nextChord(), (10 + Math.random() * 4) * 1000));
    }
    if (this.ctx.currentTime < this.resolvedUntil) return;
    if (this.tension < 0.75 && this.ctx.currentTime >= this.resolvedUntil) {
      const bright = LEVEL.bright - (LEVEL.bright - LEVEL.dark) * this.tension;
      this.padFilter.frequency.setTargetAtTime(bright, this.ctx.currentTime, 3);
    }
    const place = PLACES[this.place];
    const chord = place.chords[this.chordIndex % place.chords.length];
    // Mostly in order, now and then a step skipped, so it never sounds like a loop.
    this.chordIndex += Math.random() < 0.8 ? 1 : 2;
    this.playChord(chord, place.root, 5);
  }

  /** Fade the old chord out slowly and the new one in. */
  private playChord(chord: number[], root: number, attack: number): void {
    const ctx = this.ctx;
    const now = ctx.currentTime;
    for (const voice of this.voices) voice.stop(now);
    this.voices = [];
    this.notes = chord;
    for (const step of chord) {
      const freq = hz(root + step);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(LEVEL.pad, now + attack);
      gain.connect(this.padFilter);
      const oscs = [
        { type: 'sine' as OscillatorType, detune: -5 },
        { type: 'triangle' as OscillatorType, detune: 6 },
      ].map((o) => {
        const osc = ctx.createOscillator();
        osc.type = o.type;
        osc.frequency.value = freq;
        osc.detune.value = o.detune + (Math.random() - 0.5) * 4;
        osc.connect(gain);
        osc.start(now);
        return osc;
      });
      this.voices.push({
        stop: (at) => {
          gain.gain.cancelScheduledValues(at);
          gain.gain.setValueAtTime(gain.gain.value, at);
          gain.gain.setTargetAtTime(0.0001, at, 2.2);
          for (const osc of oscs) osc.stop(at + 9);
        },
      });
    }
  }

  /** Now and then a bell note from the chord, high up. None at first; more with every flower found. */
  private bell(): void {
    if (!this.started || this.tension >= 0.75) return;
    const chance = 0.08 + Math.min(10, this.flowers) * 0.085;
    if (Math.random() > chance) return;
    const step = this.notes[Math.floor(Math.random() * this.notes.length)];
    this.bellNote(hz(PLACES[this.place].root + step + 24), LEVEL.bell, 0);
    // With more flowers, a second note answers.
    if (this.flowers >= 4 && Math.random() < this.flowers / 12) {
      const other = this.notes[Math.floor(Math.random() * this.notes.length)];
      this.bellNote(hz(PLACES[this.place].root + other + 24), LEVEL.bell * 0.8, 0.6 + Math.random() * 0.8);
    }
  }

  private bellNote(freq: number, volume: number, delay: number): void {
    const ctx = this.ctx;
    const at = ctx.currentTime + delay;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.linearRampToValueAtTime(volume, at + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 3.5);
    gain.connect(this.master);
    gain.connect(this.reverbIn);
    for (const [mult, share] of [[1, 1], [2, 0.25]]) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq * mult;
      const g = ctx.createGain();
      g.gain.value = share;
      osc.connect(g).connect(gain);
      osc.start(at);
      osc.stop(at + 3.6);
    }
  }

  private wanderWind(): void {
    const now = this.ctx.currentTime;
    this.windFilter.frequency.setTargetAtTime(380 + Math.random() * 700, now, 2.5);
    this.windGain.gain.setTargetAtTime(LEVEL.wind * (0.5 + Math.random() * 0.9), now, 2.5);
  }
}
