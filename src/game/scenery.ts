// Scenery: where the silhouette set pieces stand. The settings name the kinds, with how
// much of each and how big; the seed decides the rest, so a share link gives the same view.
// Pure layout, no game engine: the scene draws whatever this returns.

import { makeRng } from '../core/rng';
import type { Recipe, SceneryKind, SceneryPiece } from '../settings/schema';
import { MAX_VIEW_W } from './config';

/** Far things move slowest. "road" stands on the road itself and moves with it. */
export type SceneryLayer = 'far' | 'mid' | 'near' | 'road';
export const LAYER_SCROLL: Record<SceneryLayer, number> = { far: 0.12, mid: 0.3, near: 0.6, road: 1 };

export interface SceneryItem {
  kind: SceneryKind;
  layer: SceneryLayer;
  /** Left edge, width and height, in the layer's own pixels. */
  x: number;
  w: number;
  h: number;
  /** 0 to 1: picks between the looks a kind can have (roof, windows, how broken). */
  variant: number;
  /** For the kind "custom": what to draw. */
  recipe?: Recipe;
}

interface Rule {
  layer: SceneryLayer;
  /** Pixels between two pieces when the amount is 1, and how much that varies. */
  gap: number;
  w: [number, number];
  h: [number, number];
}

// Where each kind appears, and at what size. A kind can stand on more than one layer.
const RULES: Record<SceneryKind, Rule[]> = {
  buildings: [
    { layer: 'mid', gap: 95, w: [60, 120], h: [110, 230] },
    { layer: 'near', gap: 260, w: [110, 180], h: [150, 260] },
  ],
  houses: [{ layer: 'near', gap: 230, w: [80, 120], h: [62, 92] }],
  towers: [{ layer: 'mid', gap: 420, w: [34, 54], h: [170, 270] }],
  ruins: [
    { layer: 'mid', gap: 240, w: [70, 150], h: [60, 150] },
    { layer: 'near', gap: 330, w: [50, 110], h: [70, 170] },
  ],
  trees: [
    { layer: 'mid', gap: 80, w: [40, 70], h: [80, 150] },
    { layer: 'near', gap: 210, w: [60, 100], h: [130, 230] },
  ],
  // Mountains are drawn as two long ridges. One item per ridge carries their height.
  mountains: [],
  bridges: [{ layer: 'mid', gap: 900, w: [520, 760], h: [70, 110] }],
  fences: [{ layer: 'road', gap: 620, w: [150, 280], h: [24, 30] }],
  // The dry world (Amin, 18 Oct): dunes are long low swells like the mountains; cacti and dead trees stand nearer.
  dunes: [],
  cacti: [
    { layer: 'mid', gap: 150, w: [22, 40], h: [40, 80] },
    { layer: 'near', gap: 330, w: [36, 60], h: [80, 140] },
  ],
  // A silhouette composed for this game. It stands near the road and, smaller, further back.
  custom: [
    { layer: 'near', gap: 300, w: [110, 110], h: [120, 150] },
    { layer: 'mid', gap: 240, w: [70, 70], h: [70, 95] },
  ],
};

/** The width a layer needs so it never runs out while the camera crosses the level. */
export function layerWidth(layer: SceneryLayer, levelWidth: number): number {
  return MAX_VIEW_W + levelWidth * LAYER_SCROLL[layer];
}

export function layoutScenery(seed: number, scenery: readonly SceneryPiece[], levelWidth: number): SceneryItem[] {
  const items: SceneryItem[] = [];
  scenery.forEach((piece, index) => {
    const rng = makeRng(seed ^ (0x5ce0 + piece.kind.length * 977 + piece.kind.charCodeAt(0) * 31 + index * 7919));
    if (piece.kind === 'dunes') {
      items.push({ kind: 'dunes', layer: 'far', x: 0, w: 260 * piece.size, h: 90 * (0.5 + piece.amount * 0.7) * piece.size, variant: rng() });
      items.push({ kind: 'dunes', layer: 'mid', x: 0, w: 220 * piece.size, h: 60 * (0.5 + piece.amount * 0.7) * piece.size, variant: rng() });
      return;
    }
    if (piece.kind === 'mountains') {
      // amount raises the ridges, size stretches them.
      items.push({ kind: 'mountains', layer: 'far', x: 0, w: 150 * piece.size, h: 150 * (0.5 + piece.amount * 0.7) * piece.size, variant: rng() });
      items.push({ kind: 'mountains', layer: 'mid', x: 0, w: 150 * piece.size, h: 95 * (0.5 + piece.amount * 0.7) * piece.size, variant: rng() });
      return;
    }
    for (const rule of RULES[piece.kind]) {
      const width = rule.layer === 'road' ? levelWidth : layerWidth(rule.layer, levelWidth);
      const gap = rule.gap / Math.max(0.1, piece.amount);
      // The road itself starts clear, so nothing stands on top of him at the start.
      let x = rule.layer === 'road' ? 520 + rng() * gap : rng() * gap * 0.6;
      while (x < width) {
        const w = (rule.w[0] + rng() * (rule.w[1] - rule.w[0])) * piece.size;
        const h = (rule.h[0] + rng() * (rule.h[1] - rule.h[0])) * piece.size;
        items.push({ kind: piece.kind, layer: rule.layer, x, w, h, variant: rng(), recipe: piece.recipe });
        x += w + gap * (0.5 + rng());
      }
    }
  });
  return items;
}
