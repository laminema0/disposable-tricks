// A generated look (ai/look.ts) as one of our drawings (beasts.ts), so the game shows it exactly as it shows a
// hand-drawn monster: a white shape tinted dark, a rim of light along its top, glowing eyes on its head.

import type Phaser from 'phaser';
import { lookKey, prepareLooks, readyLook, type Look } from '../ai/look';
import type { Body, Creature, Weapon } from '../settings/schema';
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
  return creature !== undefined && look.kind === 'monster' && lookKey(creature.name) === look.name;
}

// ---- weapons (20 Oct) ----

/** Words that name a weapon we have drawn ourselves: such a weapon keeps our drawing, whatever its look is called. */
const OUR_WEAPON_WORDS = /\b(guns?|pistols?|handguns?|revolvers?|rifles?|shotguns?|bows?|arrows?|swords?|knife|knives|daggers?|spears?|lances?|hammers?|axes?|clubs?|staffs?|staves|stones?|rocks?|slings?|launchers?|bazookas?|rockets?|pens?)\b/i;

/**
 * One of our own drawn weapons: the game's own choices ("Gun" is drawn as our pistol, 20 Oct: it was being
 * generated, too big), or any name with a weapon word we draw. Only the rest get a generated look.
 */
export function isOurWeapon(weapon: Weapon): boolean {
  return weapon.kind === 'none' || weapon.look === 'launcher' || new RegExp(weapon.look, 'i').test(weapon.name) || OUR_WEAPON_WORDS.test(weapon.name);
}

/** Ask for the look of a weapon we have not drawn. */
export function prepareWeaponLook(weapon: Weapon): void {
  if (!isOurWeapon(weapon)) prepareLooks([weapon.name], 'weapon');
}

/**
 * The texture for a weapon's generated look, when it is ready: drawn upright in a square like a composed weapon's
 * (recipeDraw.ts), standing on the bottom edge where the hand holds it. Undefined while it is not ready.
 */
export function weaponLookTexture(scene: Phaser.Scene, weapon: Weapon): string | undefined {
  if (isOurWeapon(weapon)) return undefined;
  const look = readyLook(weapon.name, 'weapon');
  if (!look) return undefined;
  const key = `gen-weapon-${look.name.replace(/[^a-z0-9]+/g, '-')}`;
  if (scene.textures.exists(key)) return key;
  const texture = scene.textures.createCanvas(key, 240, 260);
  if (!texture) return undefined;
  const ctx = texture.getContext();
  const margin = 14;
  const k = Math.min((240 - margin * 2) / look.w, (260 - margin * 2) / look.h);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(look.canvas, 120 - (look.w * k) / 2, 260 - margin - look.h * k, look.w * k, look.h * k);
  texture.refresh();
  return key;
}

/** True when this look is the one for this weapon. */
export function isWeaponLookFor(look: Look, weapon: Weapon): boolean {
  return look.kind === 'weapon' && lookKey(weapon.name) === look.name;
}
