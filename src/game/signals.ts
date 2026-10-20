// The language every monster speaks (design research, 19 Oct, "Silhouette monster and hero design"):
// - its eyes say how much it knows: calm, suspicious (amber), alerted (the danger colour);
// - an attack is always gathered first (light draws in to the eye) and committed with one flare of the eye;
// - one hot colour is kept for danger only: alerted eyes, charging glow, its shots. Nothing friendly uses it.
// Also the small motion tools the views share. Pure: no game engine.

/** Reserved for danger. Lamps stay warm amber; the living flowers never use it. */
export const DANGER = 0xff4d2e;
/** Suspicious: it heard something, or lost him and is searching. */
export const SUSPECT = 0xffb347;

export type Awareness = 'calm' | 'suspicious' | 'alerted';

export function awareness(m: { sees: boolean; hunt: number; state: string; notice?: number }): Awareness {
  if (m.sees || m.state === 'windup' || m.state === 'attack') return 'alerted';
  if (m.hunt > 0 || (m.notice ?? 0) > 0.05) return 'suspicious';
  return 'calm';
}

export function eyeColour(state: Awareness, calm: number): number {
  return state === 'alerted' ? DANGER : state === 'suspicious' ? SUSPECT : calm;
}

/**
 * A critically damped spring (Daniel Holden, "Spring-It-On"): moves the value towards the target, settling in about
 * halfLife seconds, stable at any frame time. Keeps its own velocity.
 */
export class Spring {
  value: number;
  velocity = 0;
  constructor(value = 0, private readonly halfLife = 0.12) {
    this.value = value;
  }
  step(target: number, dt: number): number {
    const y = (4 * Math.LN2) / (this.halfLife + 1e-5) / 2;
    const j0 = this.value - target;
    const j1 = this.velocity + j0 * y;
    const e = Math.exp(-y * dt);
    this.value = e * (j0 + j1 * dt) + target;
    this.velocity = e * (this.velocity - j1 * y * dt);
    return this.value;
  }
}

/** Seconds each phase of the shared attack grammar takes on screen. */
export const GRAMMAR = {
  /** The one eye flare that says "now": grows 2.5 times and fades in this long. */
  flare: 0.12,
  /** How long a struck monster shows white. */
  flash: 0.08,
};
