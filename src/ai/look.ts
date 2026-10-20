// Generated looks for monsters we have not drawn (server/src/look.ts makes the picture, silhouette.ts cuts it out).
// Asked for as soon as a player names such a monster, so it is usually ready by the time play starts; kept on the
// device, so it is instant the next time. The game listens and swaps its stand-in for the real shape on arrival.

import { silhouetteFrom, upright, type Silhouette } from './silhouette';

/** A monster's look, or the look of the weapon in his hand (20 Oct). */
export type LookKind = 'monster' | 'weapon';

export interface Look extends Silhouette {
  /** The name it was made for, as the player wrote it (in lower case). */
  name: string;
  kind: LookKind;
  /** The cut-out as a white shape, ready to become a texture. */
  canvas: HTMLCanvasElement;
}

const STORE = 'dt-look:v2:';
const INDEX = 'dt-looks:v2';
/** Looks kept on the device; the oldest goes when there are more. */
const KEEP = 40;
/** Pixels the picture is read at: enough for a crisp shape, quick to cut out. */
const READ = 256;
const TIMEOUT_MS = 12000;

const looks = new Map<string, Look>();
const asked = new Map<string, Promise<Look | undefined>>();
const listeners = new Set<(look: Look) => void>();

export function lookKey(name: string): string {
  return name.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9' -]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/** A look that is ready now, if there is one. */
export function readyLook(name: string | undefined, kind: LookKind = 'monster'): Look | undefined {
  return name ? looks.get(`${kind}:${lookKey(name)}`) : undefined;
}

/** Called whenever a look becomes ready. Returns a function that stops listening. */
export function onLook(listen: (look: Look) => void): () => void {
  listeners.add(listen);
  return () => listeners.delete(listen);
}

function lookUrl(): string {
  const make = import.meta.env.VITE_AI_URL ?? (import.meta.env.DEV ? '/api/make' : '');
  return make ? make.replace(/make\/?$/, 'look') : '';
}

/** Ask for the look of each of these that is not ready yet. Nothing is waited for. */
export function prepareLooks(names: readonly string[], kind: LookKind = 'monster'): void {
  for (const name of names) void requestLook(name, kind);
}

/** The look for this name: from memory, from the device, or made now. Undefined when it cannot be made. */
export function requestLook(name: string, kind: LookKind = 'monster'): Promise<Look | undefined> {
  const name_ = lookKey(name);
  if (name_.length < 2) return Promise.resolve(undefined);
  const key = `${kind}:${name_}`;
  const ready = looks.get(key);
  if (ready) return Promise.resolve(ready);
  let pending = asked.get(key);
  if (!pending) {
    pending = (async () => {
      const image = readStored(key) ?? (await fetchImage(name_, kind));
      if (!image) return undefined;
      const look = await cutOut(name_, kind, image);
      if (!look) return undefined;
      looks.set(key, look);
      store(key, look);
      for (const listen of listeners) listen(look);
      return look;
    })().catch(() => undefined);
    asked.set(key, pending);
    // A failure may be passing (a busy minute): it can be asked again later.
    void pending.then((look) => {
      if (!look) asked.delete(key);
    });
  }
  return pending;
}

async function fetchImage(key: string, kind: LookKind): Promise<string | undefined> {
  const url = lookUrl();
  if (!url) return undefined;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: key, kind }),
      signal: controller.signal,
    });
    const reply = (await res.json().catch(() => undefined)) as { ok?: boolean; image?: unknown } | undefined;
    return reply?.ok && typeof reply.image === 'string' && reply.image.startsWith('data:image/') ? reply.image : undefined;
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

/** Read the picture, cut the creature out of it, and draw it as a white shape. */
async function cutOut(key: string, kind: LookKind, src: string): Promise<Look | undefined> {
  const image = new Image();
  // Waiting for 'load' (not decode(), which a background tab may put off), and never for ever.
  const loaded = await new Promise<boolean>((resolve) => {
    const timer = setTimeout(() => resolve(false), 5000);
    image.onload = () => {
      clearTimeout(timer);
      resolve(true);
    };
    image.onerror = () => {
      clearTimeout(timer);
      resolve(false);
    };
    image.src = src;
  });
  if (!loaded || !image.naturalWidth) return undefined;
  const read = document.createElement('canvas');
  read.width = READ;
  read.height = READ;
  const ctx = read.getContext('2d', { willReadFrequently: true });
  if (!ctx) return undefined;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, READ, READ);
  // Fitted inside, with white round it, so a stored cut-out keeps its proportions.
  const fit = (READ - 16) / Math.max(image.naturalWidth, image.naturalHeight);
  const dw = image.naturalWidth * fit;
  const dh = image.naturalHeight * fit;
  ctx.drawImage(image, (READ - dw) / 2, (READ - dh) / 2, dw, dh);
  const found = silhouetteFrom(ctx.getImageData(0, 0, READ, READ).data, READ, READ);
  if (!found) return undefined;
  const shape = kind === 'weapon' ? upright(found) : found;
  const canvas = document.createElement('canvas');
  canvas.width = shape.w;
  canvas.height = shape.h;
  const out = canvas.getContext('2d');
  if (!out) return undefined;
  const pixels = out.createImageData(shape.w, shape.h);
  for (let i = 0; i < shape.alpha.length; i++) {
    pixels.data[i * 4] = 255;
    pixels.data[i * 4 + 1] = 255;
    pixels.data[i * 4 + 2] = 255;
    pixels.data[i * 4 + 3] = shape.alpha[i];
  }
  out.putImageData(pixels, 0, 0);
  return { ...shape, name: key, kind, canvas };
}

// ---- kept on the device: the cut-out as a small PNG ----

function readStored(key: string): string | undefined {
  try {
    return localStorage.getItem(STORE + key) ?? undefined;
  } catch {
    return undefined;
  }
}

function store(key: string, look: Look): void {
  try {
    if (readStored(key)) return;
    // The cut-out is stored as a black shape on white, so it is read back exactly as a fresh picture is.
    const flat = document.createElement('canvas');
    flat.width = look.w;
    flat.height = look.h;
    const ctx = flat.getContext('2d');
    if (!ctx) return;
    const black = document.createElement('canvas');
    black.width = look.w;
    black.height = look.h;
    const ink = black.getContext('2d');
    if (!ink) return;
    ink.drawImage(look.canvas, 0, 0);
    ink.globalCompositeOperation = 'source-in';
    ink.fillStyle = '#000000';
    ink.fillRect(0, 0, look.w, look.h);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, look.w, look.h);
    ctx.drawImage(black, 0, 0);
    const index: string[] = JSON.parse(localStorage.getItem(INDEX) ?? '[]');
    index.push(key);
    while (index.length > KEEP) localStorage.removeItem(STORE + index.shift());
    localStorage.setItem(STORE + key, flat.toDataURL('image/png'));
    localStorage.setItem(INDEX, JSON.stringify(index));
  } catch {
    // Full or blocked: the look is simply made again next time.
  }
}
