// Where each monster looks. Its eye works like a lamp: what is inside the shape it throws
// can be seen, what is outside cannot. The same shapes are drawn faintly in the game, so
// the player can read them and plan a way past. Pure, no game engine: unit tested.
//
// Being inside a shape is not enough to be seen. He must also be lit and not hidden
// (see `monsterSees` in rules.ts).

import type { Enemy } from '../settings/schema';

export type SightShape =
  | {
      kind: 'ahead';
      /** True when it looks both ways at once (a plant has no front). */
      both: boolean;
      /** How far it sees along the ground. */
      range: number;
      /** The band it sees, as heights above its own feet. */
      low: number;
      high: number;
      /** Within this distance the band is still opening up from the eye. */
      fan: number;
      /** Where the eye is: this high, and this far in front of its middle. */
      eyeUp: number;
      eyeAhead: number;
    }
  | {
      kind: 'below';
      /** How far down it sees. */
      range: number;
      /** Half the width of what it sees right under it, and how much wider per pixel down. */
      half: number;
      spread: number;
    };

/**
 * - Crawler: low to the ground and looking ahead. Lying down does not fool it; being in the air does.
 * - Thorn: a plant, so it senses both ways, at every height.
 * - Flyer: looks down. It sees what is beneath it, standing or lying, unless he is under a roof.
 * - Stalker: tall, looking ahead at standing height. It looks right over a hero who lies flat.
 * - Watcher: its own beam (see monsters.ts).
 */
export const SIGHTS: Record<Enemy, SightShape | undefined> = {
  crawler: { kind: 'ahead', both: false, range: 330, low: 0, high: 52, fan: 40, eyeUp: 22, eyeAhead: 10 },
  thorn: { kind: 'ahead', both: true, range: 380, low: 0, high: 150, fan: 70, eyeUp: 90, eyeAhead: 6 },
  flyer: { kind: 'below', range: 200, half: 26, spread: 0.8 },
  stalker: { kind: 'ahead', both: false, range: 420, low: 44, high: 175, fan: 60, eyeUp: 140, eyeAhead: 6 },
  watcher: undefined,
};

export interface Seer {
  x: number;
  /** Its feet, or the underside of a flying body. */
  y: number;
  facing: 1 | -1;
}

export interface Target {
  x: number;
  /** His top and his feet, as positions on screen (smaller is higher). */
  top: number;
  bottom: number;
  /** True when something is over his head: an archway, a doorway. */
  roofed: boolean;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** The band an "ahead" shape covers at a distance, as heights above the seer's feet. */
function bandAt(shape: Extract<SightShape, { kind: 'ahead' }>, distance: number): [number, number] {
  const open = Math.min(1, Math.max(0, distance / shape.fan));
  return [lerp(shape.eyeUp, shape.low, open), lerp(shape.eyeUp, shape.high, open)];
}

/** True when any part of the target is inside the shape. */
export function inSight(shape: SightShape, seer: Seer, target: Target): boolean {
  if (shape.kind === 'below') {
    if (target.roofed) return false;
    const depth = target.top - seer.y;
    if (target.bottom <= seer.y || depth > shape.range) return false;
    return Math.abs(target.x - seer.x) <= shape.half + shape.spread * Math.max(0, depth);
  }
  let distance = (target.x - seer.x) * seer.facing;
  if (shape.both) distance = Math.abs(distance);
  if (distance < 0 || distance > shape.range) return false;
  const [low, high] = bandAt(shape, distance);
  const feet = seer.y - target.bottom;
  const head = seer.y - target.top;
  return head >= low && feet <= high;
}

export interface Point {
  x: number;
  y: number;
}

/** The outline of the shape in the world, for drawing. One polygon, or two for a shape that looks both ways. */
export function sightPolygons(shape: SightShape, seer: Seer, groundY: number): Point[][] {
  if (shape.kind === 'below') {
    const depth = Math.min(shape.range, groundY - seer.y);
    const wide = shape.half + shape.spread * depth;
    return [
      [
        { x: seer.x - shape.half, y: seer.y },
        { x: seer.x + shape.half, y: seer.y },
        { x: seer.x + wide, y: seer.y + depth },
        { x: seer.x - wide, y: seer.y + depth },
      ],
    ];
  }
  const side = (facing: 1 | -1): Point[] => [
    { x: seer.x + facing * shape.eyeAhead, y: seer.y - shape.eyeUp },
    { x: seer.x + facing * shape.fan, y: seer.y - shape.high },
    { x: seer.x + facing * shape.range, y: seer.y - shape.high },
    { x: seer.x + facing * shape.range, y: seer.y - shape.low },
    { x: seer.x + facing * shape.fan, y: seer.y - shape.low },
  ];
  return shape.both ? [side(1), side(-1)] : [side(seer.facing)];
}

/** How many layers a gaze is drawn in. Each is shorter than the last, so the light is strongest at the eye. */
export const GAZE_LAYERS = [1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.41, 0.32, 0.24, 0.16] as const;

/**
 * The same outline pulled toward the eye, to `portion` of its length (0 to 1).
 * Drawn one over another, these make a gaze that fades with distance like the light of a lamp.
 */
export function shrinkToEye(polygon: readonly Point[], portion: number): Point[] {
  // A gaze that looks down starts along a line (two points); the others start at the eye (one point).
  const flat = polygon.length === 4;
  const eye = flat ? { x: (polygon[0].x + polygon[1].x) / 2, y: polygon[0].y } : polygon[0];
  return polygon.map((point, index) => {
    if (flat && index < 2) return point;
    if (!flat && index === 0) return point;
    return { x: eye.x + (point.x - eye.x) * portion, y: flat ? eye.y + (point.y - eye.y) * portion : eye.y + (point.y - eye.y) * (0.35 + 0.65 * portion) };
  });
}
