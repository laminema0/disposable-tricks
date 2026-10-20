// The scenario, in one place so it is easy to change. He carries his flower through a dark
// land to the end of the road. There his own head is cut off and buried in the ground
// together with his flower [Amin, 13 Oct]. Two details are a reading Amin has not confirmed:
// he does it himself with his sword, and the flower stays above the ground and grows from
// where the head lies. Shown quietly, in silhouette, with nothing gory.
// Losing every petal on the way ends the run.
// To try another scenario, change what is drawn and played here; the scene only calls these.

import Phaser from 'phaser';
import { GROUND_Y } from './config';
import { FLOWER_COLOURS, FLOWER_HEART, type Look } from './look';

export const ENDING = {
  /** Seconds from reaching the planting place to the end card. */
  winTime: 6.6,
  /** Seconds until his head leaves his shoulders, and until the flower begins to grow from the ground. */
  headOff: 1.2,
  bloomAt: 3.5,
  /** "Home": seconds from reaching the light to the end card. */
  homeTime: 4.4,
  /** Seconds from the last petal to the end card. */
  lossTime: 1.7,
  /** The light the planted flower gives. */
  bloomLight: { radius: 460, strength: 1 },
};

interface Depths {
  glow: number;
  props: number;
  front: number;
  hud: number;
}

/** The end of the road: a ring of stones around bare soil, under a thin shaft of light. */
export function drawPlantingPlace(scene: Phaser.Scene, x: number, look: Look, depth: Depths): void {
  const shaft = scene.add.graphics().setDepth(depth.glow).setBlendMode(Phaser.BlendModes.ADD);
  shaft.fillStyle(look.accent, 0.07);
  shaft.fillTriangle(x - 12, -20, x + 12, -20, x + 70, GROUND_Y);
  shaft.fillTriangle(x - 12, -20, x - 70, GROUND_Y, x + 70, GROUND_Y);
  scene.add
    .image(x, GROUND_Y - 6, 'glow')
    .setDisplaySize(300, 150)
    .setTint(look.accent)
    .setAlpha(0.4)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setDepth(depth.glow);

  const place = scene.add.graphics().setDepth(depth.props);
  place.fillStyle(look.prop, 1);
  place.fillEllipse(x, GROUND_Y + 1, 86, 16); // the soil
  for (const [dx, w, h] of [[-62, 20, 16], [-44, 14, 10], [46, 16, 12], [64, 22, 18]]) {
    place.fillEllipse(x + dx, GROUND_Y - h / 2 + 3, w, h);
  }
}

export interface Kneeler {
  /** Where his head is as he kneels. */
  x: number;
  y: number;
  facing: 1 | -1;
  /** With a weapon, one stroke of it. Without one he lifts his head off with his own hands. */
  armed: boolean;
}

/**
 * The ending. He kneels; with one quiet stroke his head comes away; it is set down in the
 * soil with the flower still on it; the earth closes over the head and the flower is left
 * standing alone. Then it grows, opens, and the dark lifts.
 */
export function playWin(scene: Phaser.Scene, x: number, look: Look, depth: Depths, hero: Kneeler): void {
  const at = (seconds: number, run: () => void) => scene.time.delayedCall(seconds * 1000, run);

  if (hero.armed) {
    // The stroke: one thin pale line at his neck, gone almost at once.
    at(ENDING.headOff - 0.25, () => {
      const stroke = scene.add
        .rectangle(hero.x - hero.facing * 26, hero.y + 22, 70, 2, 0xf2f4fa)
        .setRotation(hero.facing * -0.5)
        .setAlpha(0)
        .setDepth(depth.front);
      scene.tweens.add({ targets: stroke, alpha: { from: 0.95, to: 0 }, x: hero.x + hero.facing * 20, duration: 260, ease: 'Cubic.easeOut', onComplete: () => stroke.destroy() });
    });
  }

  at(ENDING.headOff, () => {
    // His head, with its one eye. It goes below the ground line, so the ground hides it as it sinks.
    const skull = scene.add.image(0, 0, 'hero-head').setScale(0.5).setTint(look.hero.body[1]);
    const eye = scene.add.image(hero.facing * 11, 1, 'hero-eye').setScale(0.5, 0.18).setTint(0xdfe4f2);
    const head = scene.add.container(hero.x, hero.y, [skull, eye]).setDepth(depth.props + 0.5);
    // His flower, closed, still on the head. It stays above the ground.
    const bud = scene.add.ellipse(0, -9, 7, 12, 0xf2f4fa);
    const budStem = scene.add.rectangle(0, 0, 2, 12, look.hero.shade[1]).setOrigin(0.5, 1);
    const flower = scene.add.container(hero.x + hero.facing * 2, hero.y - 20, [budStem, bud]).setDepth(depth.front);

    // Lifted a little, carried to the soil, and set down.
    scene.tweens.add({ targets: head, x, y: GROUND_Y - 21, duration: 1100, ease: 'Sine.easeInOut' });
    scene.tweens.add({ targets: flower, x, y: GROUND_Y - 41, duration: 1100, ease: 'Sine.easeInOut' });
    // The head sinks into the earth. The flower comes to rest on the ground.
    scene.tweens.add({ targets: head, y: GROUND_Y + 26, duration: 900, delay: 1250, ease: 'Sine.easeIn', onComplete: () => head.destroy() });
    scene.tweens.add({ targets: flower, y: GROUND_Y - 3, duration: 900, delay: 1250, ease: 'Sine.easeIn' });
    // The earth closes over it.
    const mound = scene.add.ellipse(x, GROUND_Y + 2, 74, 20, look.prop).setDepth(depth.front - 0.1);
    mound.scaleY = 0;
    scene.tweens.add({ targets: mound, scaleY: 1, duration: 500, delay: 1900, ease: 'Sine.easeOut' });
    // When the big flower opens, the small bud has become it.
    at(ENDING.bloomAt - ENDING.headOff + 0.5, () => flower.destroy());
  });

  at(ENDING.bloomAt, () => grow(scene, x, look, depth));
}

/** The flower grows from where the head lies: a stem rises, a large flower opens and the dark lifts. */
function grow(scene: Phaser.Scene, x: number, look: Look, depth: Depths): void {
  const stem = scene.add.rectangle(x, GROUND_Y - 2, 4, 58, look.hero.shade[1]).setOrigin(0.5, 1).setDepth(depth.front);
  stem.scaleY = 0;
  scene.tweens.add({ targets: stem, scaleY: 1, duration: 700, ease: 'Sine.easeOut' });

  const petals = scene.add.image(0, 0, 'flower').setDisplaySize(50, 50);
  const heart = scene.add.image(0, 0, 'mon-ball').setDisplaySize(15, 15).setTint(FLOWER_HEART);
  const flower = scene.add.container(x, GROUND_Y - 62, [petals, heart]).setDepth(depth.front).setScale(0);
  scene.tweens.add({ targets: flower, scale: 1, angle: 72, duration: 700, delay: 600, ease: 'Back.easeOut' });

  const glow = scene.add
    .image(x, GROUND_Y - 62, 'glow')
    .setDisplaySize(80, 80)
    .setTint(look.light)
    .setAlpha(0)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setDepth(depth.glow);
  scene.tweens.add({ targets: glow, alpha: 0.85, displayWidth: 900, displayHeight: 900, duration: 1500, delay: 700, ease: 'Sine.easeOut' });

  // A few small flowers come up round the grave and stay.
  for (let i = 0; i < 9; i++) {
    const dx = (i - 4) * 24 + Math.sin(i * 7.3) * 7;
    if (Math.abs(dx) < 16) continue;
    const small = scene.add.image(x + dx, GROUND_Y - 5, 'flower').setTint(FLOWER_COLOURS[i % FLOWER_COLOURS.length]).setDepth(depth.front);
    const k = (13 + (i % 3) * 4) / small.width;
    small.setScale(0);
    scene.tweens.add({ targets: small, scale: k, duration: 500, delay: 900 + Math.abs(dx) * 5, ease: 'Back.easeOut' });
  }

  // Small flowers come up along the ground on both sides.
  scene.add
    .particles(x, GROUND_Y - 4, 'flower', {
      x: { min: -260, max: 260 },
      speedY: { min: -150, max: -40 },
      gravityY: 220,
      lifespan: 1500,
      scale: { start: 0.1, end: 0.5 },
      alpha: { start: 1, end: 0 },
      tint: FLOWER_COLOURS,
      frequency: 45,
      duration: 1500,
    })
    .setDepth(depth.front);
}

/**
 * The story "Home": the thin shaft of light at the end of the road opens wide and fills the
 * place. He stands in it with his flower, and small flowers rise around him. He lives.
 */
export function playHome(scene: Phaser.Scene, x: number, look: Look, depth: Depths): void {
  const glow = scene.add
    .image(x, GROUND_Y - 110, 'glow')
    .setDisplaySize(120, 260)
    .setTint(look.light)
    .setAlpha(0)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setDepth(depth.glow);
  scene.tweens.add({ targets: glow, alpha: 0.95, displayWidth: 1500, displayHeight: 1100, duration: 2600, ease: 'Sine.easeIn' });
  const wash = scene.add
    .rectangle(0, 0, 4000, 2000, look.light)
    .setOrigin(0)
    .setScrollFactor(0)
    .setAlpha(0)
    .setDepth(depth.hud - 1);
  scene.tweens.add({ targets: wash, alpha: 0.5, duration: 2000, delay: 1800, ease: 'Sine.easeIn' });
  scene.add
    .particles(x, GROUND_Y - 4, 'flower', {
      x: { min: -220, max: 220 },
      speedY: { min: -120, max: -30 },
      lifespan: 2200,
      scale: { start: 0.15, end: 0.45 },
      alpha: { start: 1, end: 0 },
      tint: FLOWER_COLOURS,
      frequency: 70,
      duration: 3000,
    })
    .setDepth(depth.front);
}

/** The last petal has fallen: the land goes dark. */
export function playLoss(scene: Phaser.Scene, depth: Depths): void {
  const dark = scene.add
    .rectangle(0, 0, 4000, 2000, 0x000000)
    .setScrollFactor(0)
    .setAlpha(0)
    .setDepth(depth.hud - 1);
  scene.tweens.add({ targets: dark, alpha: 0.78, duration: ENDING.lossTime * 1000, ease: 'Sine.easeIn' });
}
