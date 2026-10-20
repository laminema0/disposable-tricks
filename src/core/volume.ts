// How loud the music and the sounds are, chosen in the pause menu and kept on this device only.

export interface Volumes {
  /** 0 to 1. */
  music: number;
  sound: number;
}

const KEY = 'dt-volumes';
const DEFAULTS: Volumes = { music: 0.7, sound: 0.9 };
const listeners = new Set<(v: Volumes) => void>();
let current: Volumes = load();

function load(): Volumes {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<Volumes> | null;
    if (saved) return { music: clamp(saved.music ?? DEFAULTS.music), sound: clamp(saved.sound ?? DEFAULTS.sound) };
  } catch {
    // No storage (a private window): the defaults are fine.
  }
  return { ...DEFAULTS };
}

function clamp(v: number): number {
  return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0;
}

export function volumes(): Volumes {
  return current;
}

export function setVolumes(next: Partial<Volumes>): void {
  current = { music: clamp(next.music ?? current.music), sound: clamp(next.sound ?? current.sound) };
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    // Not kept; it still applies for now.
  }
  for (const listen of listeners) listen(current);
}

/** Called whenever the volumes change. Returns a function that stops listening. */
export function onVolumes(listen: (v: Volumes) => void): () => void {
  listeners.add(listen);
  return () => listeners.delete(listen);
}

/** A soft room: decaying noise, used as a reverb's impulse. Made once per audio context and length. */
const rooms = new WeakMap<BaseAudioContext, Map<number, AudioBuffer>>();
export function room(ctx: BaseAudioContext, seconds: number): AudioBuffer {
  let made = rooms.get(ctx);
  if (!made) rooms.set(ctx, (made = new Map()));
  const found = made.get(seconds);
  if (found) return found;
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.6);
  }
  made.set(seconds, buffer);
  return buffer;
}
