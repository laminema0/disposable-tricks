// The monster kit: a small set of drawn parts (bodies, legs, wings, horns, spikes, tails,
// stems, heads, eyes) in the style of art/enemies.svg, and the rules for putting them together.
// A described monster, a merged monster and the boss are all built from it, so each reads as
// one creature. Pure data: no game engine, nothing here is run as code. The base game draws a
// figure with figureView.ts; written games draw the same figures inside their frame.
//
// A figure faces right. Its origin is the middle of its base; up is negative y. One unit is
// one game pixel at scale 1.

import type { Creature, Enemy } from '../settings/schema';

export interface Shape {
  /** An outline in SVG path form, filled; or, with `stroke`, a line of that width. */
  d: string;
  x: number;
  y: number;
  /** Scale, and -1 in `fx` to mirror it left to right. */
  s: number;
  fx: 1 | -1;
  stroke?: number;
  /** Wings are drawn as their own layer, so they can beat. */
  wing?: true;
}

export interface FigEye {
  x: number;
  y: number;
  r: number;
  /** A big eye has a dark pupil. */
  pupil?: true;
}

export interface Figure {
  shapes: Shape[];
  eyes: FigEye[];
  /** Its body for touching and striking. */
  halfW: number;
  height: number;
  /** How far the drawing reaches to each side and upward (for the size of its picture). */
  reach: number;
  rise: number;
  /** The height its wings are hinged at. 0 when it has none. */
  wingAt: number;
}

// ---- the parts, as outlines -----------------------------------------------------------------

const P = {
  lump: 'M-40 0 q0 -56 40 -56 q40 0 40 56 z',
  ear: 'M28 -38 L36 -68 L12 -50 Z',
  orb: 'M-22 0 a22 17 0 1 0 44 0 a22 17 0 1 0 -44 0 z',
  orbEar: 'M14 -12 L16 -28 L4 -16 Z',
  wing: 'M18 -4 L70 -40 L54 -6 L72 6 L30 12 Z',
  ball: 'M-48 0 a48 48 0 1 0 96 0 a48 48 0 1 0 -96 0 z',
  spikes: 'M24 -40 L30 -66 L8 -48 Z M0 -48 L-2 -74 L-16 -48 Z M-20 -42 L-34 -64 L-36 -36 Z',
  torso: 'M-20 0 a20 30 0 1 0 40 0 a20 30 0 1 0 -40 0 z',
  knob: 'M-16 0 a16 16 0 1 0 32 0 a16 16 0 1 0 -32 0 z',
  jaw: 'M0 0 L26 -16 A30 30 0 1 0 26 16 Z',
  stem: 'M0 0 C10 -38 -16 -68 0 -102',
  sprout: 'M0 0 C8 -12 -8 -24 0 -36',
  thorns: 'M4 -30 L24 -38 L4 -44 Z M-8 -56 L-28 -64 L-8 -70 Z M0 -78 L18 -88 L-2 -92 Z',
  leaf: 'M0 0 q30 -4 38 -22 q-26 0 -38 22 z',
  horn: 'M6 0 Q32 -12 30 -40 Q16 -22 -6 -4 Z',
  tail: 'M-30 -8 Q-70 -6 -78 -40 Q-58 -22 -30 -24 Z',
  haunch: 'M-36 0 L-22 -30 L-4 0 Z',
  strand: 'M0 0 C-8 14 6 26 -4 40',
};

/** A figure while it is being put together. */
interface Build {
  shapes: Shape[];
  eyes: FigEye[];
  /** Heights above its base: the top and the middle of its main body. */
  top: number;
  mid: number;
  /** Half the width of its main body. */
  half: number;
  reach: number;
  rise: number;
  wingAt: number;
}

const blank = (): Build => ({ shapes: [], eyes: [], top: 0, mid: 0, half: 0, reach: 0, rise: 0, wingAt: 0 });

function put(b: Build, d: string, x = 0, y = 0, s = 1, fx: 1 | -1 = 1, stroke?: number): void {
  b.shapes.push(stroke === undefined ? { d, x, y, s, fx } : { d, x, y, s, fx, stroke });
}
/** The same part on both sides. */
function pair(b: Build, d: string, x = 0, y = 0, s = 1, stroke?: number): void {
  put(b, d, x, y, s, 1, stroke);
  put(b, d, x, y, s, -1, stroke);
}
const line = (x0: number, y0: number, x1: number, y1: number) => `M${x0} ${y0} L${x1} ${y1}`;

/** Raise everything drawn so far, to stand it on legs or a stem. */
function lift(b: Build, by: number): void {
  for (const shape of b.shapes) shape.y -= by;
  for (const eye of b.eyes) eye.y -= by;
  b.top += by;
  b.mid += by;
  if (b.wingAt > 0) b.wingAt += by;
}

function wings(b: Build): void {
  const s = Math.max(1, (b.half / 22) * 0.85);
  for (const fx of [1, -1] as const) b.shapes.push({ d: P.wing, x: 0, y: -b.mid, s, fx, wing: true });
  b.wingAt = b.mid;
  b.reach = Math.max(b.reach, 74 * s);
}

function legs(b: Build, tall: number): void {
  lift(b, tall);
  const out = b.half * 0.45;
  put(b, line(out + 6, 0, out, -(tall + 10)), 0, 0, 1, 1, 7);
  put(b, line(-out - 8, 0, -out, -(tall + 10)), 0, 0, 1, 1, 7);
}

function arms(b: Build): void {
  const out = b.half * 0.8;
  put(b, line(out, -(b.mid + 10), out + 18, -(b.mid - 62)), 0, 0, 1, 1, 6);
  put(b, line(-out, -(b.mid + 10), -out - 18, -(b.mid - 62)), 0, 0, 1, 1, 6);
  b.reach = Math.max(b.reach, out + 24);
}

/** A thorn head on a short stalk, growing from the top of whatever is there. */
function thornHead(b: Build): void {
  const x = -b.half * 0.25;
  put(b, P.sprout, x, -(b.top - 8), 1, 1, 9);
  put(b, P.jaw, x + 2, -(b.top + 40), 0.72);
  b.eyes.push({ x: x - 1, y: -(b.top + 50), r: 3.6 });
  b.top += 62;
}

function bigEye(b: Build, x: number, y: number, r: number): void {
  b.eyes = [{ x, y, r, pupil: true }];
}

/** The body of one of the five, with its own head and eyes. `bare` leaves off what a merge replaces. */
function bodyOf(kind: Enemy, bare = false): Build {
  const b = blank();
  if (kind === 'crawler') {
    put(b, P.lump);
    if (!bare) pair(b, P.ear);
    b.eyes.push({ x: 14, y: -24, r: 5 }, { x: -6, y: -24, r: 5 });
    Object.assign(b, { top: 56, mid: 28, half: 40 });
  } else if (kind === 'flyer') {
    put(b, P.orb, 0, -17);
    pair(b, P.orbEar, 0, -17);
    b.eyes.push({ x: 8, y: -17, r: 4 }, { x: -6, y: -17, r: 4 });
    Object.assign(b, { top: 34, mid: 17, half: 22 });
    wings(b);
  } else if (kind === 'watcher') {
    put(b, P.ball, 0, -48);
    put(b, P.spikes, 0, -48);
    b.eyes.push({ x: 16, y: -56, r: 17, pupil: true });
    Object.assign(b, { top: 96, mid: 48, half: 48 });
  } else if (kind === 'stalker') {
    put(b, P.torso, 0, -22);
    Object.assign(b, { top: 52, mid: 22, half: 20 });
    legs(b, 78);
    arms(b);
    if (!bare) {
      put(b, P.knob, 2, -144);
      b.eyes.push({ x: 9, y: -145, r: 4 });
      b.top = 160;
    }
  } else {
    put(b, P.stem, 0, 0, 1, 1, 12);
    put(b, P.thorns);
    pair(b, P.leaf);
    put(b, P.jaw, 0, -124);
    b.eyes.push({ x: -4, y: -138, r: 4.5 });
    Object.assign(b, { top: 154, mid: 110, half: 16 });
    b.reach = 40;
  }
  return b;
}

function finish(b: Build, scale = 1): Figure {
  const reach = Math.max(b.reach, b.half + 30) + 12;
  const figure: Figure = {
    shapes: b.shapes,
    eyes: b.eyes,
    halfW: Math.max(14, Math.min(b.half, 46)),
    height: b.top,
    reach,
    rise: b.top + 44,
    wingAt: b.wingAt,
  };
  return scale === 1 ? figure : scaled(figure, scale);
}

const round = (v: number) => Math.round(v * 10) / 10;

/** The same figure, larger or smaller. */
export function scaled(figure: Figure, k: number): Figure {
  return {
    shapes: figure.shapes.map((shape) => {
      const next: Shape = { ...shape, x: round(shape.x * k), y: round(shape.y * k), s: round(shape.s * k * 100) / 100 };
      if (shape.stroke !== undefined) next.stroke = round(shape.stroke);
      return next;
    }),
    eyes: figure.eyes.map((eye) => ({ ...eye, x: round(eye.x * k), y: round(eye.y * k), r: round(eye.r * k) })),
    halfW: Math.round(figure.halfW * k),
    height: Math.round(figure.height * k),
    reach: Math.round(figure.reach * k),
    rise: Math.round(figure.rise * k),
    wingAt: round(figure.wingAt * k),
  };
}

// ---- merged monsters ------------------------------------------------------------------------

/** Which of two kinds gives the body. The other is added to it. */
const BODY_FIRST: readonly Enemy[] = ['crawler', 'watcher', 'stalker', 'flyer', 'thorn'];

/** The two kinds of a merge, in the order of its name ("crawler+flyer"). */
export function mergeKey(a: Enemy, b: Enemy): string {
  return [a, b].sort().join('+');
}

/** Two of the five as one creature. Any pair works. */
export function mergeFigure(a: Enemy, b: Enemy): Figure {
  const [donor, other] = BODY_FIRST.indexOf(a) <= BODY_FIRST.indexOf(b) ? [a, b] : [b, a];
  // What the other kind brings replaces the donor's own head in two cases.
  const bare = (donor === 'stalker' && other === 'thorn') || (donor === 'crawler' && other === 'watcher');
  const build = bodyOf(donor, bare);
  if (other === 'flyer') wings(build);
  else if (other === 'stalker') {
    legs(build, 70);
    arms(build);
  } else if (other === 'thorn') {
    if (donor === 'stalker') {
      // The board's tall walker with a spitting thorn head.
      put(build, P.jaw, 2, -146, 0.8);
      build.eyes.push({ x: 0, y: -158, r: 4 });
      put(build, P.thorns, 0, -30, 0.7);
      build.top = 172;
    } else thornHead(build);
  } else if (other === 'watcher') {
    // On a crawler: one great eye, and the Watcher's spikes along its back.
    put(build, P.spikes, -4, -16, 0.8);
    bigEye(build, 14, -27, 13);
    build.top = 76;
  }
  return finish(build);
}

/** The boss: a giant Watcher on a thick stem, with Thorn heads on side stems (the board's example). */
export function bossFigure(): Figure {
  const b = blank();
  put(b, 'M0 0 C26 -44 -26 -92 0 -138', 0, 0, 1, 1, 26);
  put(b, P.thorns, 0, -8, 1.3);
  pair(b, P.leaf, 0, 0, 1.7);
  // The side stems and their heads. Both heads look the way it faces.
  put(b, 'M0 -34 C50 -44 84 -84 92 -128', 0, 0, 1, 1, 10);
  put(b, 'M0 -34 C-50 -44 -84 -84 -92 -128', 0, 0, 1, 1, 10);
  put(b, P.jaw, 94, -146, 0.8);
  put(b, P.jaw, -90, -146, 0.8);
  put(b, P.ball, 0, -190, 1.25);
  put(b, P.spikes, 0, -190, 1.25);
  b.eyes.push({ x: 22, y: -200, r: 23, pupil: true }, { x: 92, y: -158, r: 4 }, { x: -92, y: -158, r: 4 });
  Object.assign(b, { top: 250, mid: 190, half: 46, reach: 124 });
  const figure = finish(b);
  figure.rise = 300;
  return figure;
}

/** Where the boss's side heads spit from, and where its eye is: heights above its base, distance ahead. */
export const BOSS_POINTS = { eye: { ahead: 22, up: 200 }, head: { ahead: 110, up: 146 } };

// ---- described monsters -----------------------------------------------------------------------

function hash(text: string): number {
  let h = 7;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return h;
}

/**
 * A described monster, built from the kit. Its body, the way it moves and the way it attacks
 * each choose parts; its name decides the small things, so two creatures with the same blocks
 * can still look different.
 */
export function creatureFigure(creature: Creature): Figure {
  const { body, move, attack } = creature;
  const quirk = hash(creature.name);
  const b = blank();
  if (body === 'low') {
    put(b, P.lump);
    Object.assign(b, { top: 56, mid: 28, half: 40 });
    if (move === 'hop') pair(b, P.haunch, 0, 0, 1.1);
    else if (move === 'still') pair(b, P.leaf, 0, 0, 1.3);
    else if (quirk % 2 === 0) {
      put(b, P.tail);
      b.reach = 84;
    }
    if (isAir(move)) wings(b);
  } else if (body === 'tall') {
    if (move === 'still') {
      put(b, P.stem, 0, 0, 1, 1, 12);
      put(b, P.thorns);
      pair(b, P.leaf);
      Object.assign(b, { top: 102, mid: 96, half: 16, reach: 40 });
    } else {
      put(b, P.torso, 0, -22);
      Object.assign(b, { top: 52, mid: 22, half: 20 });
      legs(b, 78);
      if (attack === 'reach' || quirk % 3 !== 0) arms(b);
      if (isAir(move)) wings(b);
    }
  } else {
    put(b, P.orb, 0, -17);
    Object.assign(b, { top: 34, mid: 17, half: 22 });
    if (move === 'float') {
      for (const x of [-12, 0, 12]) put(b, P.strand, x, -4, 1, 1, 4);
    } else wings(b);
    if (quirk % 2 === 0) put(b, P.tail, 6, -6, 0.6);
  }

  // The head, from the way it attacks.
  const tallHead = body === 'tall';
  const headY = tallHead ? b.top + 22 : 0;
  if (attack === 'spit') {
    if (tallHead) {
      put(b, P.jaw, 0, -headY);
      b.eyes.push({ x: -4, y: -(headY + 14), r: 4.5 });
      b.top = headY + 30;
    } else thornHead(b);
  } else if (tallHead) {
    put(b, P.knob, 2, -(b.top + 14));
    b.top += 30;
  }
  const crown = -(b.top - (body === 'low' ? 14 : 4));
  if (attack === 'charge') pair(b, P.horn, body === 'low' ? 14 : 4, crown, body === 'flying' ? 0.6 : 0.9);
  else if (attack === 'touch' || attack === 'beam') put(b, P.spikes, 0, body === 'low' ? -8 : -(b.top - 48 * 0.6), body === 'low' ? 0.8 : 0.6);
  else if (attack !== 'spit' && body !== 'tall') pair(b, body === 'low' ? P.ear : P.orbEar, 0, body === 'low' ? 0 : -17);
  if (attack !== 'spit' && body !== 'tall') b.top += 12;

  // The eyes sit at the front of the head. A beam comes from one great eye.
  const eyeY = tallHead && attack !== 'spit' ? -(b.top - 15) : body === 'low' ? -26 : -(b.mid);
  const front = tallHead ? 8 : body === 'low' ? 16 : 9;
  if (attack === 'beam') bigEye(b, front - 2, eyeY, tallHead ? 9 : 12);
  else if (!(attack === 'spit' && tallHead)) {
    const r = creature.eyes === 1 ? 5.5 : 4.2;
    for (let i = 0; i < creature.eyes; i++) b.eyes.push({ x: front - i * (r * 2 + 5), y: eyeY, r });
  }
  return finish(b, 0.86 * creature.size);
}

const isAir = (move: Creature['move']) => move === 'fly' || move === 'float';

// ---- for written games ------------------------------------------------------------------------

const ALL: readonly Enemy[] = ['crawler', 'flyer', 'stalker', 'thorn', 'watcher'];

/** Every merge and the boss, by name, for the frame that plays written games. */
export function frameFigures(): Record<string, Figure> {
  const out: Record<string, Figure> = { boss: bossFigure() };
  for (let i = 0; i < ALL.length; i++) for (let j = i + 1; j < ALL.length; j++) out[mergeKey(ALL[i], ALL[j])] = mergeFigure(ALL[i], ALL[j]);
  return out;
}
