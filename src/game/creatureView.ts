// Draws a described monster: one of our drawings (beasts.ts) or the silhouette the AI composed, its eyes, its gaze.
// What it does is decided in monsters.ts; this file only shows it, in the same language as the five monsters
// (signals.ts, design research of 19 Oct): eye colour for what it knows, light gathered before an attack and one
// flare to commit, a crouch before it acts and a stretch as it strikes, a white flash when struck, and a soft
// light on it while it recovers and is open to a strike. It leans into its speed and breathes when still.

import Phaser from 'phaser';
import { mixColour } from '../core/light';
import { GROUND_Y, WATCHER } from './config';
import { beastFor, beastScale, type Beast } from './beasts';
import { lookOf } from './creatures';
import type { MonsterLook } from './look';
import { MOVES, watcherEye, type Monster } from './monsters';
import { drawRecipe } from './recipeDraw';
import { drawGaze } from './gazeDraw';
import { sightPolygons } from './sight';
import { awareness, DANGER, eyeColour, GRAMMAR, Spring } from './signals';

/** Game pixels per recipe unit at size 1. */
const UNIT = 1.15;

/** Seconds of its wind-up, for the light that gathers to its eye. */
function windupOf(m: Monster): number {
  if (m.kind === 'crawler') return MOVES.crawler.windup;
  if (m.kind === 'thorn') return MOVES.thorn.aim;
  if (m.kind === 'flyer') return MOVES.flyer.windup;
  if (m.kind === 'stalker') return MOVES.stalker.windup;
  return WATCHER.countdown;
}

export class CreatureView {
  private readonly body: Phaser.GameObjects.Graphics;
  /** One of our own drawings (beasts.ts), when the monster is one we draw, with its rim of light. */
  private readonly beast?: Beast;
  private readonly picture?: Phaser.GameObjects.Image;
  private readonly rim?: Phaser.GameObjects.Image;
  private readonly sight: Phaser.GameObjects.Graphics;
  private readonly eyes: Phaser.GameObjects.Image[] = [];
  private readonly glows: Phaser.GameObjects.Image[] = [];
  private readonly gather: Phaser.GameObjects.Image;
  private readonly weak: Phaser.GameObjects.Image;
  private time: number;
  private alert = 0;
  private hop = 0;
  private lastX: number;
  private lastState = '';
  private flashT = 0;
  private exposedT = 0;
  private flaring = false;
  private readonly squash = new Spring(1, 0.07);
  private readonly lean = new Spring(0, 0.18);

  constructor(
    private readonly scene: Phaser.Scene,
    readonly monster: Monster,
    private readonly look: MonsterLook,
    private readonly beamColour: number,
    depth: number,
  ) {
    this.time = monster.id * 1.37;
    this.sight = scene.add.graphics().setDepth(depth - 0.2).setBlendMode(Phaser.BlendModes.ADD);
    this.body = scene.add.graphics().setDepth(depth);
    this.beast = beastFor(monster.creature?.name);
    if (this.beast) {
      this.picture = scene.add.image(0, 0, this.beast.key).setOrigin(0.5, 1).setDepth(depth);
      if (scene.textures.exists(`${this.beast.key}-rim`)) {
        this.rim = scene.add.image(0, 0, `${this.beast.key}-rim`).setOrigin(0.5, 1).setDepth(depth + 0.005).setBlendMode(Phaser.BlendModes.ADD).setTint(beamColour);
      }
    }
    const count = monster.creature?.eyes ?? 2;
    for (let i = 0; i < count; i++) {
      this.glows.push(scene.add.image(0, 0, 'glow').setDisplaySize(30, 30).setTint(look.eye).setBlendMode(Phaser.BlendModes.ADD).setDepth(depth + 0.01));
      this.eyes.push(scene.add.image(0, 0, 'mon-ball').setDisplaySize(7, 7).setTint(look.eye).setDepth(depth + 0.02));
    }
    this.gather = scene.add.image(0, 0, 'glow').setTint(DANGER).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD).setDepth(depth + 0.03);
    this.weak = scene.add.image(0, 0, 'glow').setDisplaySize(40, 40).setTint(0xfff2d0).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD).setDepth(depth + 0.03);
    this.lastX = monster.x;
    this.draw(0, 0);
  }

  /** Struck: it shows white for a moment. */
  flash(): void {
    this.flashT = GRAMMAR.flash;
  }

  /** Draw it. `light` is the light level where it stands, 0 to 1. */
  draw(dt: number, light: number): void {
    const m = this.monster;
    const creature = m.creature;
    if (!creature) return;
    this.time += dt;
    const state = awareness(m);
    this.alert += ((state === 'calm' ? 0 : 1) - this.alert) * (1 - Math.exp(-10 * dt));
    const movedBy = m.x - this.lastX;
    const moved = Math.abs(movedBy);
    this.lastX = m.x;
    this.flashT = Math.max(0, this.flashT - dt);
    this.exposedT = Math.max(0, this.exposedT - dt);
    if (this.lastState === 'windup' && m.state !== 'windup' && m.state !== 'idle') this.flare();
    if (this.lastState === 'attack' && m.state === 'rest') this.exposedT = m.kind === 'flyer' ? MOVES.flyer.stuck : 0.8;
    this.lastState = m.state;

    const stunned = m.stun > 0;
    const { recipe, eyeX, eyeY } = lookOf(creature);
    const scale = UNIT * creature.size;
    // Hoppers leave the ground as they go; floaters bob; everything breathes a little.
    if (creature.move === 'hop' && moved > 0.01) this.hop += moved * 0.09;
    const lift =
      creature.move === 'hop' ? Math.abs(Math.sin(this.hop)) * 14 : (creature.move === 'float' || creature.move === 'fly') && m.state !== 'rest' ? Math.sin(this.time * 2.4) * 4 : 0;
    const x = m.x + (stunned ? Math.sin(this.time * 90) * 3 : 0);
    const y = m.y - lift;

    // Its gaze, like the light of a lamp, in the colour of what it knows. A beam for the ones that have one.
    const colour = eyeColour(state, this.look.eye);
    this.sight.clear();
    if (!stunned) {
      if (m.sight) {
        drawGaze(this.sight, sightPolygons(m.sight, m, GROUND_Y), colour, this.alert, this.time);
      } else if (m.state !== 'turn') {
        const eye = watcherEye(m);
        const k = m.exposing ? Math.min(1, m.gaze / WATCHER.countdown) : 0;
        const far = eye.x + m.facing * WATCHER.range;
        const spread = (6 + WATCHER.range * WATCHER.spread) * (1 - k * 0.55);
        this.sight.fillStyle(m.exposing ? mixColour(this.beamColour, DANGER, k) : this.beamColour, m.exposing ? 0.3 + k * 0.3 : 0.16);
        this.sight.fillTriangle(eye.x, eye.y, far, eye.y - spread, far, eye.y + spread);
      }
    }

    // Its pose: crouched before it acts, stretched as it strikes, tipped over while it recovers; leaning into
    // its speed; breathing.
    const pose = m.state === 'windup' ? 0.82 : m.state === 'attack' ? 1.08 : 1;
    const s = this.squash.step(pose, dt);
    const breathe = Math.sin(this.time * 2.2) * 0.025;
    const sx = (1 / Math.sqrt(s)) * (1 - breathe * 0.5);
    const sy = s * (1 + breathe);
    const forward = this.lean.step(Phaser.Math.Clamp((movedBy / Math.max(dt, 1e-3)) * 0.0011 * m.facing, -0.22, 0.22), dt);
    const tip = m.state === 'rest' && m.kind === 'flyer' ? 0.45 : m.state === 'rest' ? Math.sin(this.time * 26) * 0.05 : 0;
    const rotation = (forward + tip) * m.facing;

    const bodyColour = stunned ? this.look.struck : mixColour(this.look.body[0], this.look.body[1], light);
    this.body.clear();
    const beast = this.beast;
    let eyeAt: (lx: number, ly: number) => { x: number; y: number };
    if (beast && this.picture) {
      // Our drawing, turned the way it faces; wings beat by squashing it a little in time.
      const k = beastScale(beast) * creature.size;
      const flap = beast.flaps && m.state !== 'rest' ? 1 + Math.sin(this.time * (m.state === 'windup' ? 18 : 9)) * 0.07 : 1;
      this.picture.setPosition(x, y).setRotation(rotation).setScale((k / 3) * m.facing * sx, (k / 3) * sy * flap);
      if (this.flashT > 0) this.picture.setTintFill(0xffffff);
      else this.picture.setTint(bodyColour);
      this.rim?.setPosition(x, y).setRotation(rotation).setScale(this.picture.scaleX, this.picture.scaleY).setAlpha(0.12 + light * 0.55);
      eyeAt = (lx, ly) => {
        const px = m.facing * lx * k * sx;
        const py = ly * k * sy * flap;
        return { x: x + px * Math.cos(rotation) - py * Math.sin(rotation), y: y + px * Math.sin(rotation) + py * Math.cos(rotation) };
      };
    } else {
      this.body.fillStyle(this.flashT > 0 ? 0xffffff : bodyColour, 1);
      drawRecipe(this.body, recipe, x, y, scale * sy, m.facing, this.flashT > 0 ? 0xffffff : bodyColour);
      eyeAt = (lx, ly) => ({ x: x + m.facing * lx * scale, y: y + ly * scale * sy });
    }

    // The eyes always glow, so it can be seen in the dark. They widen, and take the colour of what it knows.
    const size = (creature.eyes === 1 ? 10 : 7) * (1 + this.alert * 0.3) * Math.min(1.3, creature.size);
    const first = { x: 0, y: 0 };
    this.eyes.forEach((eye, i) => {
      // A second eye sits just behind the first, as seen from the side. On our drawings, where the drawing has it.
      const p = beast
        ? eyeAt(beast.eye.x - beast.w / 2 - (i * 7) / (beastScale(beast) * creature.size), -(beast.h - beast.eye.y))
        : eyeAt(eyeX - i * 7, -eyeY);
      if (i === 0) Object.assign(first, p);
      eye.setPosition(p.x, p.y).setDisplaySize(size, size).setTint(colour).setVisible(!stunned);
      this.glows[i].setPosition(p.x, p.y).setTint(colour).setAlpha(stunned ? 0 : 0.4 + this.alert * 0.35);
    });

    // The wind-up: light gathers in to its eye, from a wide faint ring to a bright point.
    if (m.state === 'windup') {
      const p = Math.min(1, m.t / windupOf(m));
      const ring = (1 - p) * 90 + 16;
      this.gather.setPosition(first.x, first.y).setDisplaySize(ring, ring).setAlpha(0.15 + p * 0.75);
    } else if (!this.flaring) this.gather.setAlpha(0);
    // Open to a strike while it recovers.
    const height = beast ? beast.height * creature.size : 40 * scale;
    this.weak.setPosition(x, y - height * 0.55).setAlpha(this.exposedT > 0 ? 0.3 + 0.2 * Math.sin(this.time * 14) : 0);
  }

  /** One flare of the eye: the attack is coming now. */
  private flare(): void {
    this.flaring = true;
    const base = this.eyes[0]?.displayWidth ?? 8;
    this.gather.setDisplaySize(base * 3, base * 3).setAlpha(1);
    this.scene.tweens.add({
      targets: this.gather,
      displayWidth: base * 8,
      displayHeight: base * 8,
      alpha: 0,
      duration: GRAMMAR.flare * 1000,
      ease: 'Cubic.easeOut',
      onComplete: () => (this.flaring = false),
    });
  }

  destroy(): void {
    this.sight.destroy();
    this.body.destroy();
    this.picture?.destroy();
    this.rim?.destroy();
    for (const image of [...this.eyes, ...this.glows, this.gather, this.weak]) image.destroy();
  }
}
