// A generated look (ai/look.ts) as one of our drawings (beasts.ts), so the game shows it exactly as it shows a
// hand-drawn monster: a white shape tinted dark, a rim of light along its top, glowing eyes on its head.

import type Phaser from 'phaser';
import { lookKey, prepareLooks, readyLook, type Look } from '../ai/look';
import type { Body, Creature } from '../settings/schema';
import { beastFor, type Beast } from './beasts';

/** How tall it stands at size 1, by its body; never wider than this, so a long creature stays on screen. */
const HEIGHT: Record<Body, number> = { low: 74, tall: 140, flying: 66 };
const MAX_WIDTH = 230;
/** Textures are kept three times larger than the drawing, as our own drawings are. */
const RES = 3;

const made = new Map<string, Beast>();

/** Our drawing for this creature, or its generated look when that is ready. */
export function drawingFor(creature: Creature | undefined): Beast | undefined {
  if (!creature) return undefined;
  return beastFor(creature.name) ?? generatedBeast(creature);
}

function generatedBeast(creature: Creature): Beast | undefined {
  const look = readyLook(creature.name);
  if (!look) return undefined;
  const id = `${look.name}|${creature.body}`;
  let beast = made.get(id);
  if (!beast) {
    const height = Math.round(Math.min(HEIGHT[creature.body], (MAX_WIDTH * look.h) / look.w));
    beast = {
      key: `gen-${look.name.replace(/[^a-z0-9]+/g, '-')}`,
      words: /(?!)/,
      w: look.w,
      h: look.h,
      height,
      eye: look.eye,
      blocks: { body: creature.body, move: creature.move, attack: creature.attack, size: 1, speed: 1, hits: creature.hits, eyes: creature.eyes },
      draw: (ctx) => ctx.drawImage(look.canvas, 0, 0),
    };
    made.set(id, beast);
  }
  return beast;
}

/** Make sure a generated drawing has its textures (the shape and its rim), as createBeastTextures does for ours. */
export function ensureLookTextures(scene: Phaser.Scene, beast: Beast): void {
  if (!beast.key.startsWith('gen-') || scene.textures.exists(beast.key)) return;
  for (const rim of [false, true]) {
    const texture = scene.textures.createCanvas(rim ? `${beast.key}-rim` : beast.key, beast.w * RES, beast.h * RES);
    if (!texture) continue;
    const ctx = texture.getContext();
    ctx.imageSmoothingEnabled = true;
    ctx.scale(RES, RES);
    beast.draw(ctx);
    if (rim) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.translate(-1.6, 2.6);
      beast.draw(ctx);
    }
    texture.refresh();
  }
}

/** Ask for the looks of the monsters in this game that we have not drawn. */
export function prepareCreatureLooks(creatures: readonly Creature[]): void {
  prepareLooks(creatures.filter((creature) => !beastFor(creature.name)).map((creature) => creature.name));
}

/** True when this look is the one for this creature. */
export function isLookFor(look: Look, creature: Creature | undefined): boolean {
  return creature !== undefined && lookKey(creature.name) === look.name;
}
