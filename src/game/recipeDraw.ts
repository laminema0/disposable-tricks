// Draws a recipe (a silhouette composed from simple shapes, see schema.ts) as flat shapes.
// A recipe is data. Nothing in it is run: each part is one of four known shapes with
// numbers that the validator has already clamped.

import Phaser from 'phaser';
import type { Recipe } from '../settings/schema';

/**
 * Draw a recipe with a Graphics object. (x, groundY) is where the middle of its base
 * stands; `scale` is game pixels per recipe unit; `flip` -1 mirrors it.
 * The fill colour must be set by the caller.
 */
export function drawRecipe(g: Phaser.GameObjects.Graphics, recipe: Recipe, x: number, groundY: number, scale: number, flip = 1, colour?: number): void {
  const px = (ux: number) => x + ux * scale * flip;
  const py = (uy: number) => groundY - uy * scale;
  for (const part of recipe.parts) {
    if (part.t === 'box') {
      g.fillRect(px(part.x) - (part.w * scale) / 2, py(part.y + part.h), part.w * scale, part.h * scale);
    } else if (part.t === 'circle') {
      g.fillCircle(px(part.x), py(part.y), (part.w * scale) / 2);
    } else if (part.t === 'tri') {
      g.fillTriangle(px(part.x - part.w / 2), py(part.y), px(part.x + part.w / 2), py(part.y), px(part.x), py(part.y + part.h));
    } else {
      // A line is drawn as a thin four-sided shape, so it takes the fill colour like the rest.
      const x0 = px(part.x);
      const y0 = py(part.y);
      const x1 = px(part.x + part.w);
      const y1 = py(part.y + part.h);
      const length = Math.hypot(x1 - x0, y1 - y0) || 1;
      const nx = ((y1 - y0) / length) * 1.5 * scale;
      const ny = (-(x1 - x0) / length) * 1.5 * scale;
      if (colour !== undefined) g.fillStyle(colour, 1);
      g.fillPoints(
        [new Phaser.Math.Vector2(x0 + nx, y0 + ny), new Phaser.Math.Vector2(x1 + nx, y1 + ny), new Phaser.Math.Vector2(x1 - nx, y1 - ny), new Phaser.Math.Vector2(x0 - nx, y0 - ny)],
        true,
      );
    }
  }
}

/** A white texture of a recipe, 120 by 130 units, for things that are tinted like the rest of the art. */
export function recipeTexture(scene: Phaser.Scene, recipe: Recipe): string {
  const key = `recipe-${JSON.stringify(recipe.parts)}`;
  if (scene.textures.exists(key)) return key;
  const texture = scene.textures.createCanvas(key, 240, 260);
  if (!texture) return key;
  const ctx = texture.getContext();
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 6;
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  const take = (x: number, y: number) => {
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  };
  for (const part of recipe.parts) {
    if (part.t === 'circle') { take(part.x - part.w, part.y - part.w); take(part.x + part.w, part.y + part.w); }
    else if (part.t === 'box' || part.t === 'tri') { take(part.x - part.w / 2, part.y); take(part.x + part.w / 2, part.y + part.h); }
    else { take(part.x, part.y); take(part.x + part.w, part.y + part.h); }
  }
  const margin = 14;
  const k = recipe.parts.length > 0 ? Math.min((240 - margin * 2) / Math.max(1, x1 - x0), (260 - margin * 2) / Math.max(1, y1 - y0)) : 2;
  const cx = (x0 + x1) / 2;
  // Centred across; standing on the bottom edge, where the hand holds it.
  const px = (ux: number) => 120 + (ux - cx) * k;
  const py = (uy: number) => 260 - margin - (uy - y0) * k;
  ctx.lineWidth = Math.max(5, Math.min(14, 3 * k));
  for (const part of recipe.parts) {
    ctx.beginPath();
    if (part.t === 'box') ctx.rect(px(part.x - part.w / 2), py(part.y + part.h), part.w * k, part.h * k);
    else if (part.t === 'circle') ctx.arc(px(part.x), py(part.y), part.w * k, 0, Math.PI * 2);
    else if (part.t === 'tri') {
      ctx.moveTo(px(part.x - part.w / 2), py(part.y));
      ctx.lineTo(px(part.x + part.w / 2), py(part.y));
      ctx.lineTo(px(part.x), py(part.y + part.h));
      ctx.closePath();
    } else {
      ctx.moveTo(px(part.x), py(part.y));
      ctx.lineTo(px(part.x + part.w), py(part.y + part.h));
      ctx.stroke();
      continue;
    }
    ctx.fill();
  }
  texture.refresh();
  return key;
}
