// Draws the scenery that scenery.ts laid out: flat silhouettes in the colours of the
// palette, a few lit windows, nothing else. Every shape here is ours; a game (or an AI)
// only chooses which kinds appear, how many and how big.

import Phaser from 'phaser';
import { mixColour } from '../core/light';
import { makeRng } from '../core/rng';
import type { SceneryPiece } from '../settings/schema';
import { GROUND_Y } from './config';
import type { Look } from './look';
import { drawRecipe } from './recipeDraw';
import { LAYER_SCROLL, layerWidth, layoutScenery, type SceneryItem, type SceneryLayer } from './scenery';

type G = Phaser.GameObjects.Graphics;
const G0 = GROUND_Y;
const LAYERS: SceneryLayer[] = ['far', 'mid', 'near', 'road'];

function mountains(g: G, item: SceneryItem, width: number): void {
  const rng = makeRng(Math.floor(item.variant * 1e9));
  g.beginPath();
  g.moveTo(0, G0);
  let up = rng() < 0.5;
  for (let x = 0; x <= width + 300; x += item.w * (1 + rng() * 1.4)) {
    g.lineTo(x, G0 - (up ? item.h * (0.65 + rng() * 0.6) : item.h * (0.2 + rng() * 0.4)));
    up = !up;
  }
  g.lineTo(width + 300, G0);
  g.closePath();
  g.fillPath();
}

/** Dunes: long, soft swells of sand, each crest leaning a little one way as the wind left it. */
function dunes(g: G, item: SceneryItem, width: number): void {
  const rng = makeRng(Math.floor(item.variant * 1e9) ^ 0xd0e5);
  g.beginPath();
  g.moveTo(0, G0);
  let x = 0;
  let y = G0 - item.h * (0.3 + rng() * 0.4);
  g.lineTo(0, y);
  while (x < width + 300) {
    const step = item.w * (0.8 + rng() * 0.8);
    const crest = G0 - item.h * (0.45 + rng() * 0.55);
    const next = G0 - item.h * (0.15 + rng() * 0.35);
    // Up the long windward slope to the crest, then down the short steep lee side.
    for (let i = 1; i <= 8; i++) {
      const t = i / 8;
      const rise = t < 0.7 ? Math.sin((t / 0.7) * Math.PI * 0.5) : 1 - Math.pow((t - 0.7) / 0.3, 1.6) * 1;
      const top = t < 0.7 ? y + (crest - y) * rise : crest + (next - crest) * (1 - rise);
      g.lineTo(x + step * t, top);
    }
    x += step;
    y = next;
  }
  g.lineTo(width + 300, G0);
  g.closePath();
  g.fillPath();
}

/** A cactus with raised arms, or, for some, a dead tree: a bare trunk with a few crooked branches. */
function cactus(g: G, { x, w, h, variant }: SceneryItem): void {
  const rng = makeRng(Math.floor(variant * 1e9) ^ 0xcac7);
  const mid = x + w / 2;
  if (variant < 0.6) {
    const trunk = w * 0.32;
    g.fillRoundedRect(mid - trunk / 2, G0 - h, trunk, h, trunk / 2);
    for (const side of [-1, 1]) {
      if (rng() < 0.25) continue;
      const armH = h * (0.25 + rng() * 0.25);
      const at = G0 - h * (0.35 + rng() * 0.25);
      const out = mid + side * (trunk / 2 + w * 0.22);
      const arm = trunk * 0.75;
      // Out from the trunk, then up.
      g.fillRect(Math.min(mid, out), at - arm / 2, Math.abs(out - mid), arm);
      g.fillRoundedRect(out - arm / 2, at - armH, arm, armH, arm / 2);
    }
    return;
  }
  const lean = (rng() - 0.5) * w * 0.4;
  g.fillTriangle(mid - w * 0.08, G0, mid + w * 0.08, G0, mid + lean, G0 - h);
  for (let i = 0; i < 4; i++) {
    const t = 0.35 + i * 0.15;
    const bx = mid + lean * t;
    const by = G0 - h * t;
    const side = i % 2 ? 1 : -1;
    const len = h * (0.22 - i * 0.03);
    g.fillTriangle(bx, by - 3, bx, by + 3, bx + side * len, by - len * 0.7);
  }
}

function building(g: G, lit: G, { x, w, h, variant }: SceneryItem): void {
  const rng = makeRng(Math.floor(variant * 1e9));
  g.fillRect(x, G0 - h, w, h);
  if (variant < 0.35) g.fillRect(x + w * 0.2, G0 - h - 12, w * 0.35, 12);
  else if (variant > 0.7) g.fillRect(x + w * 0.7, G0 - h - 26, 3, 26);
  const cols = Math.floor((w - 10) / 18);
  const rows = Math.floor((h - 16) / 24);
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (rng() < 0.2) lit.fillRect(x + 10 + col * 18, G0 - h + 12 + row * 24, 7, 10);
    }
  }
}

function house(g: G, lit: G, { x, w, h, variant }: SceneryItem): void {
  const wall = h * 0.6;
  g.fillRect(x, G0 - wall, w, wall);
  g.fillTriangle(x - 8, G0 - wall, x + w + 8, G0 - wall, x + w / 2, G0 - h);
  g.fillRect(x + w * (variant < 0.5 ? 0.18 : 0.7), G0 - h * 0.95, 9, h * 0.3);
  lit.fillRect(x + w * (variant < 0.5 ? 0.6 : 0.2), G0 - wall * 0.7, 10, 12);
}

function tower(g: G, lit: G, { x, w, h, variant }: SceneryItem): void {
  g.fillRect(x, G0 - h, w, h);
  if (variant < 0.5) {
    g.fillRect(x - 5, G0 - h - 8, w + 10, 8);
    for (let i = 0; i < 3; i++) g.fillRect(x - 5 + (i * (w + 2)) / 2.4, G0 - h - 18, 8, 10);
  } else {
    g.fillTriangle(x - 6, G0 - h, x + w + 6, G0 - h, x + w / 2, G0 - h - w * 1.3);
  }
  lit.fillRect(x + w / 2 - 2, G0 - h * 0.75, 4, 12);
}

function ruin(g: G, { x, w, h, variant }: SceneryItem): void {
  const rng = makeRng(Math.floor(variant * 1e9));
  // A wall with a broken top, falling away to one side.
  const points = [new Phaser.Math.Vector2(x, G0), new Phaser.Math.Vector2(x, G0 - h)];
  const steps = 5;
  for (let i = 1; i <= steps; i++) {
    const top = h * (1 - (i / steps) * (0.5 + rng() * 0.4));
    points.push(new Phaser.Math.Vector2(x + (w * (i - 0.5)) / steps, G0 - top - rng() * 14));
    points.push(new Phaser.Math.Vector2(x + (w * i) / steps, G0 - top));
  }
  points.push(new Phaser.Math.Vector2(x + w, G0));
  g.fillPoints(points, true);
  // A lone column beside it, with or without its cap.
  const cx = x + w + 26;
  g.fillRect(cx, G0 - h * 0.8, 14, h * 0.8);
  if (variant > 0.4) g.fillRect(cx - 5, G0 - h * 0.8 - 8, 24, 8);
}

/** A branch and its smaller branches, as thin tapering strokes. */
function branch(g: G, colour: number, x: number, y: number, angle: number, length: number, width: number, depth: number, rng: () => number): void {
  const x2 = x + Math.cos(angle) * length;
  const y2 = y + Math.sin(angle) * length;
  g.lineStyle(width, colour, 1);
  g.lineBetween(x, y, x2, y2);
  if (depth <= 0) return;
  const spread = 0.35 + rng() * 0.3;
  branch(g, colour, x2, y2, angle - spread, length * (0.62 + rng() * 0.12), width * 0.62, depth - 1, rng);
  branch(g, colour, x2, y2, angle + spread * 0.8, length * (0.55 + rng() * 0.15), width * 0.6, depth - 1, rng);
}

function tree(g: G, { x, w, h, variant }: SceneryItem, colour: number): void {
  const rng = makeRng(Math.floor(variant * 1e9) ^ 0x7e3);
  const mid = x + w / 2;
  if (variant < 0.42) {
    // A tall pine: a thin trunk under tiers that droop at their tips.
    g.fillRect(mid - w * 0.03, G0 - h * 0.3, w * 0.06, h * 0.3);
    const tiers = 5 + Math.floor(rng() * 3);
    for (let t = 0; t < tiers; t++) {
      const k = t / tiers;
      const y = G0 - h * (0.16 + k * 0.78);
      const half = (w / 2) * (1 - k * 0.82) * (0.9 + rng() * 0.2);
      g.fillTriangle(mid - half, y + h * 0.07, mid + half, y + h * 0.07, mid, y - h * 0.13);
      g.fillTriangle(mid - half, y + h * 0.07, mid - half * 0.55, y + h * 0.04, mid - half * 1.08, y + h * 0.1);
      g.fillTriangle(mid + half, y + h * 0.07, mid + half * 0.55, y + h * 0.04, mid + half * 1.08, y + h * 0.1);
    }
  } else if (variant < 0.78) {
    // A broad tree: a leaning trunk, two limbs, and a crown of uneven clouds of leaves.
    const lean = (rng() - 0.5) * w * 0.25;
    g.fillTriangle(mid - w * 0.07, G0, mid + w * 0.07, G0, mid + lean, G0 - h * 0.62);
    branch(g, colour, mid + lean * 0.6, G0 - h * 0.45, -Math.PI / 2 - 0.7, h * 0.22, w * 0.05, 1, rng);
    branch(g, colour, mid + lean * 0.7, G0 - h * 0.5, -Math.PI / 2 + 0.6, h * 0.2, w * 0.045, 1, rng);
    const cx = mid + lean;
    const cy = G0 - h * 0.7;
    const blobs = 7 + Math.floor(rng() * 4);
    for (let b = 0; b < blobs; b++) {
      const angle = rng() * Math.PI * 2;
      const r = w * (0.16 + rng() * 0.16);
      const d = w * 0.28 * Math.sqrt(rng());
      g.fillCircle(cx + Math.cos(angle) * d * 1.2, cy + Math.sin(angle) * d * 0.75, r);
    }
  } else {
    // A bare tree, all forks and twigs.
    g.fillTriangle(mid - w * 0.05, G0, mid + w * 0.05, G0, mid, G0 - h * 0.45);
    branch(g, colour, mid, G0 - h * 0.42, -Math.PI / 2 - 0.25, h * 0.3, w * 0.07, 3, rng);
    branch(g, colour, mid, G0 - h * 0.4, -Math.PI / 2 + 0.45, h * 0.24, w * 0.06, 3, rng);
  }
}

function bridge(g: G, { x, w, h }: SceneryItem): void {
  g.fillRect(x, G0 - h, w, 12);
  g.fillRect(x, G0 - h - 8, w, 2);
  const spans = Math.max(2, Math.round(w / 170));
  for (let i = 0; i <= spans; i++) {
    const px = x + (w * i) / spans;
    g.fillRect(px - 9, G0 - h, 18, h);
    g.fillRect(px - 1, G0 - h - 8, 2, 8);
    // The shoulders of an arch on each side of a pier.
    g.fillTriangle(px - 9, G0 - h + 12, px - 44, G0 - h + 12, px - 9, G0 - h + 46);
    g.fillTriangle(px + 9, G0 - h + 12, px + 44, G0 - h + 12, px + 9, G0 - h + 46);
  }
}

function fence(g: G, { x, w, h }: SceneryItem): void {
  for (let px = x; px <= x + w; px += 22) {
    g.fillRect(px, G0 - h, 4, h);
    g.fillTriangle(px - 1, G0 - h, px + 5, G0 - h, px + 2, G0 - h - 5);
  }
  g.fillRect(x, G0 - h * 0.7, w, 2);
  g.fillRect(x, G0 - h * 0.3, w, 2);
}

/** Draw all the scenery of a game. `depth.back` is behind everything on the road, `depth.road` is beside the props. */
export function drawScenery(
  scene: Phaser.Scene,
  seed: number,
  scenery: readonly SceneryPiece[],
  levelWidth: number,
  look: Look,
  depth: { back: number; road: number },
): void {
  const items = layoutScenery(seed, scenery, levelWidth);
  // Air between the layers: the further a layer, the more it fades toward the horizon's colour.
  const colours: Record<SceneryLayer, number> = {
    far: mixColour(look.hillFar, look.horizon, 0.38),
    mid: mixColour(look.hillFar, look.hillNear, 0.45),
    near: mixColour(look.hillNear, look.stage, 0.35),
    road: look.prop,
  };
  for (const layer of LAYERS) {
    const mine = items.filter((item) => item.layer === layer);
    if (mine.length === 0) continue;
    const at = layer === 'road' ? depth.road : depth.back;
    if (layer === 'mid' || layer === 'near') {
      // A band of haze along the ground in front of the layer behind, so the layers separate.
      const haze = scene.add.graphics().setScrollFactor(0).setDepth(at);
      const tone = layer === 'mid' ? look.horizon : mixColour(look.horizon, look.light, 0.12);
      haze.fillGradientStyle(tone, tone, tone, tone, 0, 0, layer === 'mid' ? 0.42 : 0.26, layer === 'mid' ? 0.42 : 0.26);
      haze.fillRect(-20, G0 - 150, scene.scale.width + 2000, 150);
    }
    const g = scene.add.graphics().setScrollFactor(LAYER_SCROLL[layer], 0).setDepth(at);
    const lit = scene.add.graphics().setScrollFactor(LAYER_SCROLL[layer], 0).setDepth(at);
    g.fillStyle(colours[layer], 1);
    // Far windows are fainter than near ones.
    lit.fillStyle(look.light, layer === 'near' ? 0.5 : 0.28);
    const width = layer === 'road' ? levelWidth : layerWidth(layer, levelWidth);
    for (const item of mine) {
      if (item.kind === 'mountains') mountains(g, item, width);
      else if (item.kind === 'dunes') dunes(g, item, width);
      else if (item.kind === 'cacti') cactus(g, item);
      else if (item.kind === 'buildings') building(g, lit, item);
      else if (item.kind === 'houses') house(g, lit, item);
      else if (item.kind === 'towers') tower(g, lit, item);
      else if (item.kind === 'ruins') ruin(g, item);
      else if (item.kind === 'trees') tree(g, item, colours[layer]);
      else if (item.kind === 'bridges') bridge(g, item);
      else if (item.kind === 'custom') {
        // A silhouette composed for this game, from simple shapes.
        if (item.recipe) drawRecipe(g, item.recipe, item.x + item.w / 2, G0, item.h / 100, item.variant < 0.5 ? 1 : -1, colours[layer]);
      }
      else fence(g, item);
    }
  }
}
