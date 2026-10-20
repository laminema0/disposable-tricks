// Draws one monster from its four parts (body, mover, head, eye), following
// "First five enemies" on the FigJam board. Every shape is flat white and tinted at run time.
// What a monster does is decided in monsters.ts; this file only shows it.

import Phaser from 'phaser';
import { mixColour } from '../core/light';
import { GROUND_Y, WATCHER } from './config';
import type { MonsterLook } from './look';
import { MOVES, type BodyPart, type Monster, type MoverPart } from './monsters';
import { pupilSize } from './rules';
import { drawGaze } from './gazeDraw';
import { SIGHTS, sightPolygons } from './sight';

type Image = Phaser.GameObjects.Image;
type Holder = Phaser.GameObjects.Container;

// Positions are measured from the underside of the body, facing right. Up is negative.
const BODY: Record<BodyPart, { key: string; w: number; h: number; originX: number; head: [number, number]; eye: [number, number]; ears: number }> = {
  lump: { key: 'mon-lump', w: 56, h: 44, originX: 0.5, head: [0, -38], eye: [9, -20], ears: 17 },
  stem: { key: 'mon-stem', w: 34, h: 76, originX: 15 / 34, head: [5, -74], eye: [5, -90], ears: 8 },
  orb: { key: 'mon-ball', w: 28, h: 28, originX: 0.5, head: [0, -23], eye: [2, -14], ears: 8 },
  torso: { key: 'mon-torso', w: 26, h: 60, originX: 0.5, head: [0, -58], eye: [4, -40], ears: 8 },
  ball: { key: 'mon-ball', w: 64, h: 64, originX: 0.5, head: [0, -57], eye: [14, -36], ears: 20 },
};
/** How far the mover lifts the body off the ground. */
const LIFT: Record<MoverPart, number> = { feet: 3, leaves: 0, wings: 0, limbs: 70, none: 0 };

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (value: number, target: number, rate: number, dt: number) => lerp(value, target, 1 - Math.exp(-rate * dt));

export class MonsterView {
  private readonly root: Holder;
  /** Everything that takes the black body colour. */
  private readonly dark: Image[] = [];
  private readonly eyes: Image[] = [];
  private readonly glows: Image[] = [];
  private readonly body: Image;
  private feet: Image[] = [];
  private wings: Image[] = [];
  private legs: Image[] = [];
  private arms: Image[] = [];
  private jawTop?: Holder;
  private jawBottom?: Image;
  private pupil?: Image;
  private beam?: Image;
  private dots: Image[] = [];
  /** The faint shape its eye throws: where it is looking. */
  private readonly sight: Phaser.GameObjects.Graphics;

  private walk = 0;
  private lastX: number;
  private open = 0.32;
  private alert = 0;
  private time = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    readonly monster: Monster,
    private readonly look: MonsterLook,
    beamColour: number,
    depth: number,
  ) {
    const parts = monster.spec.parts;
    const spec = BODY[parts.body];
    this.sight = scene.add.graphics().setDepth(depth - 0.2).setBlendMode(Phaser.BlendModes.ADD);
    const lift = LIFT[parts.mover];
    this.lastX = monster.x;
    this.root = scene.add.container(monster.x, monster.y).setDepth(depth);

    if (parts.eye === 'big') {
      const height = 2 * (6 + WATCHER.range * WATCHER.spread);
      this.beam = scene.add
        .image(spec.eye[0], spec.eye[1] - lift, 'beam')
        .setOrigin(0, 0.5)
        .setDisplaySize(WATCHER.range, height)
        .setTint(beamColour)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.root.add(this.beam);
    }

    // The mover, the parts of it that sit behind the body.
    if (parts.mover === 'feet') {
      this.feet = [-13, 13].map((x) => this.shape('mon-foot', x, 0, 14, 8, 0.5, 1));
    } else if (parts.mover === 'leaves') {
      this.shape('mon-leaves', 0, 3, 80, 22, 0.5, 1);
    } else if (parts.mover === 'wings') {
      this.wings = [this.shape('mon-wing', 9, -17, 52, 40, 0, 0.6), this.shape('mon-wing', -9, -17, 52, 40, 1, 0.6).setFlipX(true)];
    } else if (parts.mover === 'limbs') {
      this.legs = [-5, 5].map((x) => this.shape('mon-limb', x, -72, 6, 72, 0.5, 0.03));
      this.arms.push(this.shape('mon-limb', -8, -lift - 46, 6, 70, 0.5, 0.03));
    }

    this.body = this.shape(spec.key, 0, -lift, spec.w, spec.h, spec.originX, 1);

    // The head. Some heads carry the eye, so that it moves with them.
    let eyeHolder: Holder = this.root;
    let eyeAt: [number, number] = [spec.eye[0], spec.eye[1] - lift];
    const [hx, hy] = [spec.head[0], spec.head[1] - lift];
    if (parts.head === 'ears') {
      const size = parts.body === 'orb' ? 0.62 : 1;
      this.shape('mon-ear', hx - spec.ears, hy + 5, 16 * size, 20 * size, 0.5, 1);
      this.shape('mon-ear', hx + spec.ears, hy + 5, 16 * size, 20 * size, 0.5, 1).setFlipX(true);
    } else if (parts.head === 'jaw') {
      // A round head in two halves, hinged at the back, so the mouth can open.
      const hinge: [number, number] = [hx - 16, hy - 16];
      this.jawBottom = this.shape('mon-jaw', hinge[0], hinge[1], 52, 26, 6 / 52, 0).setFlipY(true);
      this.jawTop = scene.add.container(hinge[0], hinge[1]);
      this.root.add(this.jawTop);
      const top = scene.add.image(0, 0, 'mon-jaw').setOrigin(6 / 52, 1).setDisplaySize(52, 26);
      this.jawTop.add(top);
      this.dark.push(top);
      eyeHolder = this.jawTop;
      eyeAt = [24, -14];
    } else if (parts.head === 'knob') {
      this.shape('mon-ball', hx + 2, hy - 8, 24, 24, 0.5, 0.5);
      eyeAt = [hx + 7, hy - 9];
    } else {
      const spikes: [number, number, number][] = [[-15, 7, -0.5], [2, 0, 0.05], [18, 8, 0.55]];
      for (const [x, y, rot] of spikes) this.shape('mon-spike', hx + x, hy + y, 14, 26, 0.5, 1).setRotation(rot);
    }

    // The eye. Yellow, with a small glow of its own so it shows in the dark.
    const eye = (x: number, y: number, size: number) => {
      const glow = scene.add
        .image(x, y, 'glow')
        .setDisplaySize(size * 4.5, size * 4.5)
        .setTint(look.eye)
        .setAlpha(0.4)
        .setBlendMode(Phaser.BlendModes.ADD);
      const disc = scene.add.image(x, y, 'mon-ball').setDisplaySize(size, size).setTint(look.eye);
      eyeHolder.add([glow, disc]);
      this.glows.push(glow);
      this.eyes.push(disc);
    };
    if (parts.eye === 'pair') {
      eye(eyeAt[0] - 5.5, eyeAt[1], 7);
      eye(eyeAt[0] + 5.5, eyeAt[1], 7);
    } else if (parts.eye === 'dot') {
      eye(eyeAt[0], eyeAt[1], 7);
    } else {
      eye(eyeAt[0], eyeAt[1], 26);
      this.pupil = scene.add.image(eyeAt[0] + 5, eyeAt[1], 'mon-ball').setDisplaySize(12, 12).setTint(look.pupil);
      this.root.add(this.pupil);
      // Five dots above it count the seconds down, as drawn on the board.
      for (let i = 0; i < 5; i++) {
        const dot = scene.add.image(-24 + i * 12, -lift - 100, 'mon-ball').setDisplaySize(7, 7).setTint(look.eye).setAlpha(0);
        this.root.add(dot);
        this.dots.push(dot);
      }
    }

    // The front arm goes over the body.
    if (parts.mover === 'limbs') this.arms.push(this.shape('mon-limb', 8, -lift - 46, 6, 70, 0.5, 0.03));

    this.draw(0, 0);
  }

  private shape(key: string, x: number, y: number, w: number, h: number, originX: number, originY: number): Image {
    const image = this.scene.add.image(x, y, key).setOrigin(originX, originY).setDisplaySize(w, h);
    this.root.add(image);
    this.dark.push(image);
    return image;
  }

  /** Draw it. `light` is the light level where it stands, 0 to 1. */
  draw(dt: number, light: number): void {
    const m = this.monster;
    const parts = m.spec.parts;
    this.time += dt;
    this.walk += Math.abs(m.x - this.lastX) * 0.22;
    this.lastX = m.x;
    this.alert = ease(this.alert, m.sees || m.state === 'attack' ? 1 : 0, 10, dt);

    const stunned = m.stun > 0;
    // Its gaze, drawn like the light of a lamp. Brighter once it has seen him.
    const shape = SIGHTS[m.kind];
    this.sight.clear();
    if (shape && !stunned) {
      drawGaze(this.sight, sightPolygons(shape, m, GROUND_Y), this.look.eye, this.alert, this.time);
    }
    const shake = stunned ? Math.sin(this.time * 90) * 3 : 0;
    this.root.setPosition(m.x + shake, m.y);
    let flip: number = m.facing;
    let squashX = 1;
    let squashY = 1;

    if (parts.mover === 'feet') {
      this.feet.forEach((foot, i) => (foot.y = -Math.max(0, Math.sin(this.walk + i * Math.PI)) * 4));
      this.body.y = -LIFT.feet - Math.abs(Math.sin(this.walk)) * 1.5;
      if (m.state === 'windup') (squashX = 1.1), (squashY = 0.8); // it crouches before it runs
      else if (m.state === 'attack') (squashX = 1.16), (squashY = 0.9);
    } else if (parts.mover === 'wings') {
      const swept = m.state === 'attack';
      const flap = swept ? -0.85 : Math.sin(this.time * (m.state === 'windup' ? 26 : 15)) * 0.55;
      this.wings[0].setRotation(flap);
      this.wings[1].setRotation(-flap);
    } else if (parts.mover === 'limbs') {
      const stride = Math.sin(this.walk) * 0.28;
      this.legs[0].setRotation(stride);
      this.legs[1].setRotation(-stride);
      const sway = Math.sin(this.time * 1.4) * 0.05;
      this.arms[0].setRotation(0.14 + sway - stride * 0.5);
      // The front arm does the reaching: up and back, then a long sweep forward.
      const arm = this.arms[1];
      const move = MOVES.stalker;
      if (m.state === 'windup') {
        arm.setRotation(lerp(arm.rotation, 2.5, 1 - Math.exp(-12 * dt)));
        arm.scaleY = lerp(arm.scaleY, 70 / 144, 0.2);
      } else if (m.state === 'attack') {
        const k = Math.min(1, m.t / (move.swipe * 0.7));
        arm.setRotation(lerp(2.5, -1.5, k));
        arm.scaleY = (move.reach - 10) / 144;
      } else {
        arm.setRotation(ease(arm.rotation, -0.14 - sway + stride * 0.5, 6, dt));
        arm.scaleY = ease(arm.scaleY, 70 / 144, 8, dt);
      }
    }

    if (this.jawTop && this.jawBottom) {
      // Aiming: the mouth opens wide. Just after spitting it snaps shut.
      const target = m.state === 'windup' ? 0.85 : m.state === 'rest' && m.t < 0.25 ? 0.02 : 0.32;
      this.open = ease(this.open, target, m.state === 'rest' ? 30 : 9, dt);
      this.jawTop.setRotation(-this.open);
      this.jawBottom.setRotation(this.open * 0.8);
    }

    if (this.beam && this.pupil) {
      // While it turns, it narrows to nothing and opens again facing the other way.
      const turning = m.state === 'turn' ? Math.abs(1 - (2 * m.t) / WATCHER.turnTime) : 1;
      flip = m.facing * Math.max(0.06, turning);
      const flicker = m.exposing ? 0.5 + Math.sin(this.time * 24) * 0.06 : 0.3;
      this.beam.setAlpha(stunned ? 0 : flicker * turning);
      const size = 12 * pupilSize(m.gaze);
      this.pupil.setDisplaySize(size, size);
      const left = Math.ceil(WATCHER.countdown - m.gaze);
      this.dots.forEach((dot, i) => dot.setAlpha(m.exposing ? (i < left ? 1 : 0.2) : 0));
      const breathe = 1 + Math.sin(this.time * 2) * 0.015;
      squashX = breathe;
      squashY = 2 - breathe;
    }

    this.root.setScale(flip * squashX, squashY);

    const bodyColour = stunned ? this.look.struck : mixColour(this.look.body[0], this.look.body[1], light);
    for (const image of this.dark) image.setTint(bodyColour);
    // Eyes widen and glow harder when it has seen him.
    const eyeGrow = 1 + this.alert * 0.3;
    // Just before it attacks, its eyes flare hot and pulse: the warning the player reads to dodge.
    const warn = m.state === 'windup' ? 0.75 + 0.25 * Math.sin(this.time * 32) : 0;
    this.eyes.forEach((eye, i) => {
      const base = this.pupil ? 26 : 7;
      const size = base * (this.pupil ? 1 : eyeGrow + warn * 0.25);
      eye.setDisplaySize(size, size);
      const glowSize = base * 4.5 * (1 + warn * 0.7);
      this.glows[i]
        .setAlpha(Math.min(1, 0.4 + this.alert * 0.35 + warn * 0.5))
        .setDisplaySize(glowSize, glowSize)
        .setTint(warn > 0 ? 0xff8a3d : this.look.eye);
    });
  }

  destroy(): void {
    this.sight.destroy();
    this.root.destroy();
  }
}
