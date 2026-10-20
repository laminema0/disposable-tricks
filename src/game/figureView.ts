// Draws a monster that is built from the kit (kit.ts): a described monster, a merge, or the
// boss. Its outline is one picture and its wings another, so the wings can beat; its eyes are
// lights of their own, so they always show in the dark. What it does is decided in monsters.ts.

import Phaser from 'phaser';
import { mixColour } from '../core/light';
import { BOSS, GROUND_Y, WATCHER } from './config';
import { drawGaze } from './gazeDraw';
import type { Figure, Shape } from './kit';
import type { MonsterLook } from './look';
import { beamTilt, watcherEye, type Monster } from './monsters';
import { sightPolygons } from './sight';

/** Picture pixels per game pixel, so a figure stays sharp. */
const SHARP = 2;
/** Room under the base, for leaves and feet that dip below it. */
const UNDER = 16;

function paint(ctx: CanvasRenderingContext2D, shape: Shape): void {
  const path = new Path2D();
  path.addPath(new Path2D(shape.d), new DOMMatrix([shape.s * shape.fx, 0, 0, shape.s, shape.x, shape.y]));
  if (shape.stroke === undefined) ctx.fill(path);
  else {
    ctx.lineWidth = shape.stroke * Math.max(0.6, shape.s);
    ctx.stroke(path);
  }
}

/** White pictures of a figure: its body, and its wings if it has any. Tinted when drawn. */
function figureTextures(scene: Phaser.Scene, key: string, figure: Figure): { body: string; wings: string | undefined } {
  const body = `fig-${key}`;
  const wings = figure.wingAt > 0 ? `fig-${key}-wings` : undefined;
  const make = (name: string, pick: (shape: Shape) => boolean) => {
    if (scene.textures.exists(name)) return;
    const texture = scene.textures.createCanvas(name, Math.ceil(figure.reach * 2 * SHARP), Math.ceil((figure.rise + UNDER) * SHARP));
    if (!texture) return;
    const ctx = texture.getContext();
    ctx.setTransform(SHARP, 0, 0, SHARP, figure.reach * SHARP, figure.rise * SHARP);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#ffffff';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const shape of figure.shapes) if (pick(shape)) paint(ctx, shape);
    texture.refresh();
  };
  make(body, (shape) => !shape.wing);
  if (wings) make(wings, (shape) => shape.wing === true);
  return { body, wings };
}

export class FigureView {
  private readonly figure: Figure;
  private readonly body: Phaser.GameObjects.Image;
  private readonly wings: Phaser.GameObjects.Image | undefined;
  private readonly sight: Phaser.GameObjects.Graphics;
  private readonly eyes: Phaser.GameObjects.Image[] = [];
  private readonly glows: Phaser.GameObjects.Image[] = [];
  private readonly pupils: (Phaser.GameObjects.Image | undefined)[] = [];
  private time = 0;
  private alert = 0;
  private hop = 0;
  private lastX: number;

  constructor(
    scene: Phaser.Scene,
    readonly monster: Monster,
    private readonly look: MonsterLook,
    private readonly beamColour: number,
    depth: number,
  ) {
    const figure = monster.figure;
    if (!figure) throw new Error('FigureView needs a monster built from the kit.');
    this.figure = figure;
    const key = monster.name ?? `c-${JSON.stringify(monster.creature)}`;
    const textures = figureTextures(scene, key, figure);
    const originY = figure.rise / (figure.rise + UNDER);
    this.sight = scene.add.graphics().setDepth(depth - 0.2).setBlendMode(Phaser.BlendModes.ADD);
    // Wings are hinged where they join the body, so they beat without sliding.
    if (textures.wings) {
      this.wings = scene.add
        .image(0, 0, textures.wings)
        .setOrigin(0.5, (figure.rise - figure.wingAt) / (figure.rise + UNDER))
        .setScale(1 / SHARP)
        .setDepth(depth - 0.05);
    }
    this.body = scene.add.image(0, 0, textures.body).setOrigin(0.5, originY).setScale(1 / SHARP).setDepth(depth);
    for (const eye of figure.eyes) {
      this.glows.push(scene.add.image(0, 0, 'glow').setDisplaySize(eye.r * 6, eye.r * 6).setTint(look.eye).setBlendMode(Phaser.BlendModes.ADD).setDepth(depth + 0.01));
      this.eyes.push(scene.add.image(0, 0, 'mon-ball').setDisplaySize(eye.r * 2, eye.r * 2).setTint(look.eye).setDepth(depth + 0.02));
      this.pupils.push(eye.pupil ? scene.add.image(0, 0, 'mon-ball').setDisplaySize(eye.r * 0.8, eye.r * 0.8).setTint(0x05060c).setDepth(depth + 0.03) : undefined);
    }
    this.lastX = monster.x;
    this.draw(0, 0);
  }

  /** Draw it. `light` is the light level where it stands, 0 to 1. */
  draw(dt: number, light: number): void {
    const m = this.monster;
    const figure = this.figure;
    this.time += dt;
    const dazed = m.boss !== undefined && m.boss.daze > 0;
    this.alert += ((m.sees || m.state === 'attack' ? 1 : 0) - this.alert) * (1 - Math.exp(-10 * dt));
    const moved = Math.abs(m.x - this.lastX);
    this.lastX = m.x;
    const stunned = m.stun > 0;
    const airborne = m.spec.fly !== undefined;
    const still = m.kind === 'thorn' || m.kind === 'watcher';

    // Hoppers leave the ground as they go, fliers bob, and what stands still sways like a plant.
    if (m.creature?.move === 'hop' && moved > 0.01) this.hop += moved * 0.09;
    const liftBy = m.creature?.move === 'hop' ? Math.abs(Math.sin(this.hop)) * 14 : airborne ? Math.sin(this.time * 2.4) * 4 : 0;
    const x = m.x + (stunned ? Math.sin(this.time * 90) * 3 : 0);
    const y = m.y - liftBy;
    const lean = dazed ? 0.1 + Math.sin(this.time * 2) * 0.03 : still ? Math.sin(this.time * 1.3 + m.id) * 0.025 : m.state === 'attack' && !airborne ? 0.08 : 0;
    const squash = m.state === 'windup' || m.swipeT > 0 ? 0.92 : 1;

    this.drawGazes(stunned);

    const colour = stunned ? this.look.struck : mixColour(this.look.body[0], this.look.body[1], light);
    this.body
      .setPosition(x, y)
      .setScale((m.facing / SHARP) * (2 - squash), squash / SHARP)
      .setRotation(lean * m.facing)
      .setTint(colour);
    if (this.wings) {
      const beat = 0.62 + 0.38 * Math.sin(this.time * (m.state === 'attack' ? 22 : 13));
      this.wings
        .setPosition(x, y - figure.wingAt)
        .setScale(m.facing / SHARP, beat / SHARP)
        .setTint(colour);
    }

    // The eyes always glow, so it can be seen in the dark. They widen when it has seen him.
    const cos = Math.cos(lean * m.facing);
    const sin = Math.sin(lean * m.facing);
    figure.eyes.forEach((eye, i) => {
      const dx = m.facing * eye.x;
      const dy = eye.y * squash;
      const ex = x + dx * cos - dy * sin;
      const ey = y + dx * sin + dy * cos;
      const shut = dazed || (m.boss !== undefined && i === 0 && !m.boss.open);
      const size = eye.r * 2 * (1 + this.alert * 0.25) * (shut ? 0.35 : 1);
      this.eyes[i].setPosition(ex, ey).setDisplaySize(size, shut ? size * 0.4 : size).setVisible(!stunned);
      this.glows[i].setPosition(ex, ey).setAlpha(shut ? 0.12 : 0.4 + this.alert * 0.35);
      // The pupil narrows as its countdown runs out.
      const left = 1 - 0.7 * Math.min(1, m.gaze / (m.boss ? BOSS.countdown : WATCHER.countdown));
      this.pupils[i]?.setPosition(ex + m.facing * eye.r * 0.3, ey).setDisplaySize(eye.r * 0.8 * left, eye.r * 0.8).setVisible(!stunned && !shut);
    });
  }

  /** Each way it sees, drawn like the light of a lamp; and its beam, if it has one. */
  private drawGazes(stunned: boolean): void {
    const m = this.monster;
    this.sight.clear();
    if (stunned) return;
    const polygons = [m.sight, m.extraSight].flatMap((shape) => (shape ? sightPolygons(shape, m, GROUND_Y) : []));
    if (polygons.length > 0) drawGaze(this.sight, polygons, this.look.eye, this.alert, this.time);

    if (m.boss) {
      // The boss's eye lights the ground in front of it, from near its stem to far along the road.
      if (!m.boss.open || m.boss.daze > 0) return;
      const eye = watcherEye(m);
      this.sight.fillStyle(this.beamColour, m.exposing ? 0.26 : 0.13);
      this.sight.fillTriangle(eye.x, eye.y, m.x + m.facing * BOSS.near, GROUND_Y, m.x + m.facing * BOSS.range, GROUND_Y);
    } else if ((m.kind === 'watcher' || m.also === 'watcher') && m.state !== 'turn') {
      const eye = watcherEye(m);
      const far = eye.x + m.facing * WATCHER.range;
      const farY = eye.y + WATCHER.range * beamTilt(m);
      const spread = 6 + WATCHER.range * WATCHER.spread;
      this.sight.fillStyle(this.beamColour, m.exposing ? 0.3 : 0.16);
      this.sight.fillTriangle(eye.x, eye.y, far, farY - spread, far, Math.min(GROUND_Y, farY + spread));
    }
  }

  destroy(): void {
    this.sight.destroy();
    this.body.destroy();
    this.wings?.destroy();
    for (const image of [...this.eyes, ...this.glows, ...this.pupils]) image?.destroy();
  }
}
