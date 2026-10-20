// A monster's gaze, drawn like the light of a lamp: brightest at the eye, fading smoothly
// to nothing at the far end (no hard edge), and brighter once it has seen him.

import Phaser from 'phaser';
import { shrinkToEye, type Point } from './sight';

/** How bright a point of the gaze is, from 1 at the eye to 0 at the farthest point. */
function falloff(distance: number, longest: number): number {
  const t = Math.min(1, distance / Math.max(1, longest));
  return Math.pow(1 - t, 1.35);
}

/** One polygon, filled as a fan of triangles whose corners carry their own brightness. */
function fadedPolygon(g: Phaser.GameObjects.Graphics, polygon: readonly Point[], colour: number, strength: number): void {
  // A gaze that looks down starts along a line (four points); the others start at the eye.
  const flat = polygon.length === 4;
  const eye = flat ? { x: (polygon[0].x + polygon[1].x) / 2, y: polygon[0].y } : polygon[0];
  const distances = polygon.map((p) => Math.hypot(p.x - eye.x, p.y - eye.y));
  const longest = Math.max(...distances);
  // Only the eye (or the line it looks down from) is bright on the outline; every other corner
  // is dark, so the sides feather out like a beam instead of ending in a hard edge.
  const edge = polygon.map((_, i) => (flat ? (i < 2 ? strength * 0.7 : 0) : i === 0 ? strength : 0));
  // The middle of the shape carries the light along its length.
  const centre = polygon.reduce((sum, p) => ({ x: sum.x + p.x / polygon.length, y: sum.y + p.y / polygon.length }), { x: 0, y: 0 });
  const middle = strength * falloff(Math.hypot(centre.x - eye.x, centre.y - eye.y), longest) * 1.15;
  for (let i = 0; i < polygon.length; i++) {
    const b = polygon[i];
    const c = polygon[(i + 1) % polygon.length];
    // Corner order for a triangle: top-left, top-right, bottom-left.
    g.fillGradientStyle(colour, colour, colour, colour, middle, edge[i], edge[(i + 1) % polygon.length], 0);
    g.fillTriangle(centre.x, centre.y, b.x, b.y, c.x, c.y);
  }
}

/** `alert` runs from 0 (has not seen him) to 1 (has). `time` makes a seeing gaze tremble a little. */
export function drawGaze(g: Phaser.GameObjects.Graphics, polygons: readonly Point[][], colour: number, alert: number, time: number): void {
  const tremble = alert > 0.5 ? 0.025 * Math.sin(time * 22) : 0;
  // Two gazes laid over each other are each drawn fainter, so a merge is not twice as bright.
  const share = polygons.length > 1 ? 0.65 : 1;
  const strength = (0.13 + alert * 0.2 + tremble) * share;
  for (const polygon of polygons) {
    // A wide soft cone, and a tighter, brighter core near the eye.
    fadedPolygon(g, polygon, colour, strength);
    fadedPolygon(g, shrinkToEye(polygon, 0.45), colour, strength * 0.9);
  }
}
