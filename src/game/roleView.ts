// The five monsters of the game, redrawn (design research, 19 Oct): each is one verb, and its outline,
// its idle motion and its light all say that verb before it acts.
// - Charger: a low wedge with a forward horn. Crouches, eyes flare, dashes straight, skids with its back open.
// - Spitter: rooted (fanned roots, no legs), a bulb on a swaying stalk. The pod swells and glows, spits, deflates.
// - Diver: beak and talons hooked down, bat wings. Freezes, flashes, folds into an arrow, dives where he was,
//   and lies stuck on the ground within reach. It never shoots.
// - Stalker: arms far too long for its body, a small head. Draws one arm back high, swipes, drags it.
// - Watcher: mostly eye. Its five seconds are shown on the beam itself and a ring closing round the eye.
// All share one grammar (signals.ts): eye colour for awareness, light gathered before an attack, one flare to
// commit, a white flash when struck, and a soft light on the weak point while it recovers.
// Silhouettes are drawn once at three times their size with curves and tapers, each with a rim of light.

import Phaser from 'phaser';
import { mixColour } from '../core/light';
import { GROUND_Y, WATCHER } from './config';
import type { MonsterLook } from './look';
import { MOVES, type Monster } from './monsters';
import { drawGaze } from './gazeDraw';
import { SIGHTS, sightPolygons } from './sight';
import { awareness, DANGER, eyeColour, GRAMMAR, Spring } from './signals';

type Ctx = CanvasRenderingContext2D;
type Image = Phaser.GameObjects.Image;
const RES = 3;

// ---- drawing helpers ------------------------------------------------------------------------------

/** A limb, horn, root or tail: thick at its start, thin at its end, along a curve. Never a constant-width stroke. */
function taper(ctx: Ctx, x0: number, y0: number, cx: number, cy: number, x1: number, y1: number, w0: number, w1: number): void {
  const n = 14;
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push([(1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1, (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * y1]);
  }
  const left: [number, number][] = [];
  const right: [number, number][] = [];
  pts.forEach(([x, y], i) => {
    const [ax, ay] = pts[Math.max(0, i - 1)];
    const [bx, by] = pts[Math.min(n, i + 1)];
    const len = Math.hypot(bx - ax, by - ay) || 1;
    const nx = -(by - ay) / len;
    const ny = (bx - ax) / len;
    const w = (w0 + (w1 - w0) * (i / n)) / 2;
    left.push([x + nx * w, y + ny * w]);
    right.push([x - nx * w, y - ny * w]);
  });
  ctx.beginPath();
  ctx.moveTo(left[0][0], left[0][1]);
  for (const [x, y] of left) ctx.lineTo(x, y);
  for (const [x, y] of right.reverse()) ctx.lineTo(x, y);
  ctx.closePath();
  ctx.fill();
}

function poly(ctx: Ctx, pts: number[]): void {
  ctx.beginPath();
  ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  ctx.closePath();
  ctx.fill();
}

/** A deliberate hole in the black (an eye socket, a gap between ribs): a second read inside the silhouette. */
function cut(ctx: Ctx, draw: () => void): void {
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  draw();
  ctx.restore();
}

/**
 * A silhouette drawn once at three times its size, and its rim: the shape less itself moved down and back,
 * a thin crescent along the top edge that the light catches.
 */
function bake(scene: Phaser.Scene, key: string, w: number, h: number, draw: (ctx: Ctx) => void): void {
  if (scene.textures.exists(key)) return;
  for (const rim of [false, true]) {
    const texture = scene.textures.createCanvas(rim ? `${key}-rim` : key, w * RES, h * RES);
    if (!texture) return;
    const ctx = texture.getContext();
    ctx.scale(RES, RES);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#ffffff';
    draw(ctx);
    if (rim) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.translate(-1.4, 2.2);
      draw(ctx);
    }
    texture.refresh();
  }
}

export function createRoleTextures(scene: Phaser.Scene): void {
  // Charger: a low wedge, hunched back with three spines, a horn thrust forward, a short tail.
  bake(scene, 'role-charger', 78, 42, (ctx) => {
    ctx.beginPath();
    ctx.moveTo(10, 30);
    ctx.bezierCurveTo(8, 14, 26, 4, 42, 6);
    ctx.bezierCurveTo(54, 7, 62, 12, 66, 20);
    ctx.lineTo(64, 31);
    ctx.quadraticCurveTo(40, 40, 14, 36);
    ctx.closePath();
    ctx.fill();
    taper(ctx, 60, 20, 70, 16, 78, 6, 9, 0.5); // the horn
    poly(ctx, [62, 24, 74, 28, 63, 32]); // snout
    for (const [x, y, s] of [[24, 9, 1], [33, 6, 1.2], [42, 6, 1]]) poly(ctx, [x - 4 * s, y + 3, x - 6 * s, y - 8 * s, x + 4 * s, y + 2]);
    taper(ctx, 12, 26, 4, 22, 0, 12, 7, 0.5); // tail
  });
  bake(scene, 'role-charger-leg', 12, 18, (ctx) => {
    taper(ctx, 6, 0, 8, 9, 5, 16, 8, 3);
    poly(ctx, [2, 15, 11, 15, 12, 18, 1, 18]);
  });

  // Spitter: fanned roots into the ground, a curved stalk with thorns, a pod that opens like a jaw.
  bake(scene, 'role-spitter-roots', 84, 22, (ctx) => {
    ctx.beginPath();
    ctx.ellipse(42, 10, 15, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    for (const [x, c] of [[4, 18], [16, 24], [30, 34], [54, 50], [68, 60], [80, 66]]) taper(ctx, 42, 6, c, 12, x, 22, 8, 1);
  });
  bake(scene, 'role-spitter-stalk', 30, 90, (ctx) => {
    taper(ctx, 14, 90, 0, 48, 18, 2, 12, 6);
    for (const [x, y, d] of [[9, 66, -1], [7, 44, -1], [14, 30, 1], [12, 56, 1]]) poly(ctx, [x, y, x + d * 9, y - 6, x, y - 5]);
    ctx.beginPath(); // a leaf
    ctx.ellipse(22, 52, 9, 3.5, -0.6, 0, Math.PI * 2);
    ctx.fill();
  });
  bake(scene, 'role-spitter-lid', 54, 28, (ctx) => {
    ctx.beginPath();
    ctx.moveTo(4, 22);
    ctx.bezierCurveTo(2, 2, 44, -2, 54, 20);
    ctx.lineTo(54, 22);
    ctx.closePath();
    ctx.fill();
    for (let x = 14; x <= 46; x += 7) poly(ctx, [x, 21, x + 3.5, 28, x + 7, 21]);
    for (const [x, y] of [[16, 6], [28, 3], [40, 5]]) poly(ctx, [x - 3, y + 2, x - 6, y - 7, x + 3, y]);
  });
  bake(scene, 'role-spitter-jaw', 54, 22, (ctx) => {
    ctx.beginPath();
    ctx.moveTo(4, 6);
    ctx.lineTo(52, 6);
    ctx.bezierCurveTo(48, 20, 16, 24, 4, 10);
    ctx.closePath();
    ctx.fill();
    for (let x = 16; x <= 44; x += 7) poly(ctx, [x, 7, x + 3.5, 0, x + 7, 7]);
  });

  // Diver: a teardrop body, a hooked beak, talons hanging, a forked tail; bat wings with fingers.
  bake(scene, 'role-diver-body', 48, 34, (ctx) => {
    ctx.beginPath();
    ctx.moveTo(6, 15);
    ctx.bezierCurveTo(12, 4, 30, 2, 36, 9);
    ctx.quadraticCurveTo(48, 12, 45, 26); // the beak, hooked down
    ctx.lineTo(39, 18);
    ctx.quadraticCurveTo(24, 26, 6, 18);
    ctx.closePath();
    ctx.fill();
    poly(ctx, [7, 14, 0, 7, 3, 16, 0, 22, 8, 18]); // forked tail
    taper(ctx, 19, 20, 17, 27, 21, 33, 3.5, 0.8); // talons
    taper(ctx, 26, 21, 26, 28, 30, 33, 3.5, 0.8);
  });
  bake(scene, 'role-diver-wing', 66, 42, (ctx) => {
    ctx.beginPath();
    ctx.moveTo(3, 38);
    ctx.lineTo(28, 10); // the arm, up to the wrist
    ctx.lineTo(64, 2); // the longest finger
    ctx.quadraticCurveTo(56, 14, 62, 18); // scallops between the fingers
    ctx.quadraticCurveTo(48, 22, 52, 30);
    ctx.quadraticCurveTo(38, 30, 38, 40);
    ctx.quadraticCurveTo(22, 34, 3, 38);
    ctx.closePath();
    ctx.fill();
    taper(ctx, 4, 38, 14, 22, 28, 10, 5, 3); // the arm bone, thicker
  });

  // Stalker: a tall hunched torso, the head small on a forward neck, ribs cut out; long tapering arms with claws.
  bake(scene, 'role-stalker-torso', 48, 88, (ctx) => {
    ctx.beginPath();
    ctx.moveTo(16, 88);
    ctx.bezierCurveTo(4, 70, 2, 40, 12, 26); // the hunched back
    ctx.quadraticCurveTo(22, 14, 32, 18); // over the shoulders to the neck
    ctx.lineTo(36, 26);
    ctx.quadraticCurveTo(32, 48, 28, 64); // down the chest to the waist
    ctx.lineTo(32, 88);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath(); // the head, small, thrust forward
    ctx.ellipse(38, 13, 9, 8, 0.3, 0, Math.PI * 2);
    ctx.fill();
    cut(ctx, () => {
      ctx.lineWidth = 2;
      for (const y of [40, 48, 56]) {
        ctx.beginPath();
        ctx.moveTo(14, y);
        ctx.quadraticCurveTo(22, y - 4, 29, y + 1);
        ctx.stroke();
      }
    });
  });
  bake(scene, 'role-stalker-upper', 14, 58, (ctx) => {
    taper(ctx, 7, 0, 9, 30, 7, 58, 10, 6);
  });
  bake(scene, 'role-stalker-fore', 20, 78, (ctx) => {
    taper(ctx, 9, 0, 11, 34, 9, 64, 7, 4);
    for (const [x, y] of [[3, 78], [9, 78], [16, 75]]) taper(ctx, 9, 62, (9 + x) / 2, 70, x, y, 3, 0.6);
  });
  bake(scene, 'role-stalker-leg', 16, 56, (ctx) => {
    taper(ctx, 8, 0, 12, 28, 6, 52, 10, 4);
    poly(ctx, [2, 50, 12, 50, 15, 56, 0, 56]);
  });

  // Watcher: a round body crowned with spikes, a stub for a foot, a socket cut for the one great eye; an eyelid.
  bake(scene, 'role-watcher-orb', 84, 90, (ctx) => {
    ctx.beginPath();
    ctx.arc(42, 50, 31, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI * (0.85 - i * 0.175);
      const len = i === 2 ? 30 : 22 + (i % 2) * 4;
      taper(ctx, 42 + Math.cos(a) * 24, 50 + Math.sin(a) * 24, 42 + Math.cos(a) * (30 + len * 0.4), 50 + Math.sin(a) * (30 + len * 0.4) - 2, 42 + Math.cos(a) * (31 + len), 50 + Math.sin(a) * (31 + len), 9, 0.5);
    }
    poly(ctx, [30, 78, 54, 78, 60, 90, 24, 90]);
    cut(ctx, () => {
      ctx.beginPath();
      ctx.arc(50, 48, 15, 0, Math.PI * 2);
      ctx.fill();
    });
  });
  bake(scene, 'role-watcher-lid', 36, 20, (ctx) => {
    ctx.beginPath();
    ctx.moveTo(0, 20);
    ctx.bezierCurveTo(0, -4, 36, -4, 36, 20);
    ctx.quadraticCurveTo(18, 14, 0, 20);
    ctx.closePath();
    ctx.fill();
  });
}

// ---- the view --------------------------------------------------------------------------------------

interface Part {
  image: Image;
  rim?: Image;
}

/** Seconds of each monster's wind-up, for the light that gathers to its eye. */
function windupOf(m: Monster): number {
  if (m.kind === 'crawler') return MOVES.crawler.windup;
  if (m.kind === 'thorn') return MOVES.thorn.aim;
  if (m.kind === 'flyer') return MOVES.flyer.windup;
  if (m.kind === 'stalker') return MOVES.stalker.windup;
  return WATCHER.countdown;
}

export class RoleView {
  private readonly root: Phaser.GameObjects.Container;
  private readonly sight: Phaser.GameObjects.Graphics;
  /** Everything drawn in the body colour, and the rims the light catches. */
  private readonly dark: Image[] = [];
  private readonly rims: Image[] = [];
  private readonly eyes: { disc: Image; glow: Image; x: number; y: number; size: number }[] = [];
  /** The light that gathers to the eye in a wind-up, the flare that commits, and the weak point's glow. */
  private readonly gather: Image;
  private readonly weak: Image;
  private readonly ring: Phaser.GameObjects.Graphics;
  private readonly trail: Phaser.GameObjects.Graphics;
  private parts: Record<string, Part> = {};
  private time: number;
  private walk = 0;
  private lastX: number;
  private lastState = '';
  private alert = 0;
  private flashT = 0;
  /** After an attack, while it recovers: the weak point is open. */
  private exposedT = 0;
  private readonly sway = new Spring(0, 0.25);
  private readonly lean = new Spring(0, 0.18);
  private readonly armBack = new Spring(0.2, 0.22);
  private readonly armFront = new Spring(0.2, 0.08);
  private readonly fold = new Spring(0, 0.07);
  private readonly open = new Spring(0.25, 0.06);
  private readonly swell = new Spring(1, 0.1);
  private readonly squash = new Spring(1, 0.06);
  private beam?: Image;
  private pupil?: Image;
  private head?: Phaser.GameObjects.Container;

  constructor(
    private readonly scene: Phaser.Scene,
    readonly monster: Monster,
    private readonly look: MonsterLook,
    private readonly light: number,
    depth: number,
  ) {
    createRoleTextures(scene);
    this.time = monster.id * 1.37;
    this.lastX = monster.x;
    this.sight = scene.add.graphics().setDepth(depth - 0.2).setBlendMode(Phaser.BlendModes.ADD);
    this.trail = scene.add.graphics().setDepth(depth + 0.05).setBlendMode(Phaser.BlendModes.ADD);
    this.root = scene.add.container(monster.x, monster.y).setDepth(depth);
    const kind = monster.kind;
    if (kind === 'crawler') this.buildCharger();
    else if (kind === 'thorn') this.buildSpitter();
    else if (kind === 'flyer') this.buildDiver();
    else if (kind === 'stalker') this.buildStalker();
    else this.buildWatcher();
    const eye = this.eyes[0];
    this.gather = scene.add.image(eye?.x ?? 0, eye?.y ?? 0, 'glow').setTint(DANGER).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD);
    this.weak = scene.add.image(0, 0, 'glow').setDisplaySize(36, 36).setTint(0xfff2d0).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD);
    this.ring = scene.add.graphics();
    this.root.add([this.gather, this.weak, this.ring]);
    this.draw(0, 0);
  }

  /** A part of the body, with its rim of light if it has one. */
  private part(name: string, key: string, x: number, y: number, ox: number, oy: number, rim = true, holder: Phaser.GameObjects.Container = this.root): Image {
    const image = this.scene.add.image(x, y, key).setOrigin(ox, oy).setScale(1 / RES);
    this.dark.push(image);
    let rimImage: Image | undefined;
    if (rim && this.scene.textures.exists(`${key}-rim`)) {
      rimImage = this.scene.add.image(x, y, `${key}-rim`).setOrigin(ox, oy).setScale(1 / RES).setBlendMode(Phaser.BlendModes.ADD).setTint(this.light);
      this.rims.push(rimImage);
    }
    holder.add(rimImage ? [image, rimImage] : [image]);
    this.parts[name] = { image, rim: rimImage };
    return image;
  }

  private eye(x: number, y: number, size: number, holder: Phaser.GameObjects.Container = this.root): void {
    const glow = this.scene.add.image(x, y, 'glow').setDisplaySize(size * 4.5, size * 4.5).setTint(this.look.eye).setAlpha(0.4).setBlendMode(Phaser.BlendModes.ADD);
    const disc = this.scene.add.image(x, y, 'mon-ball').setDisplaySize(size, size).setTint(this.look.eye);
    holder.add([glow, disc]);
    this.eyes.push({ disc, glow, x, y, size });
  }

  private buildCharger(): void {
    for (const x of [-20, 12]) this.part(`legB${x}`, 'role-charger-leg', x + 3, -14, 0.5, 0, false);
    this.part('body', 'role-charger', 0, -12, 0.5, 1);
    for (const x of [-24, 8]) this.part(`legF${x}`, 'role-charger-leg', x, -14, 0.5, 0, false);
    this.eye(21, -35, 6);
    this.eye(15, -34, 5);
  }

  private buildSpitter(): void {
    this.part('roots', 'role-spitter-roots', 0, 2, 0.5, 1, false);
    this.part('stalk', 'role-spitter-stalk', 0, -6, 14 / 30, 1);
    this.head = this.scene.add.container(0, -94);
    this.root.add(this.head);
    this.part('jaw', 'role-spitter-jaw', 0, 0, 4 / 54, 6 / 22, true, this.head);
    this.part('lid', 'role-spitter-lid', 0, 0, 4 / 54, 22 / 28, true, this.head);
    this.eye(26, -12, 7, this.head);
  }

  private buildDiver(): void {
    this.part('wingFar', 'role-diver-wing', -2, -22, 3 / 66, 38 / 42, false);
    this.part('body', 'role-diver-body', 0, -14, 0.5, 0.7);
    this.part('wingNear', 'role-diver-wing', 2, -22, 3 / 66, 38 / 42);
    this.eye(10, -27, 6);
  }

  private buildStalker(): void {
    this.part('upperB', 'role-stalker-upper', -8, -102, 0.5, 0.04, false);
    this.part('foreB', 'role-stalker-fore', 0, 0, 9 / 20, 0.02, false);
    for (const x of [-5, 5]) this.part(`leg${x}`, 'role-stalker-leg', x, -54, 0.5, 0, false);
    this.part('torso', 'role-stalker-torso', 0, -50, 0.5, 1);
    this.eye(15, -126, 6);
    this.part('upperF', 'role-stalker-upper', -6, -102, 0.5, 0.04, false);
    this.part('foreF', 'role-stalker-fore', 0, 0, 9 / 20, 0.02, false);
  }

  private buildWatcher(): void {
    const height = 2 * (6 + WATCHER.range * WATCHER.spread);
    this.beam = this.scene.add.image(8, -42, 'beam').setOrigin(0, 0.5).setDisplaySize(WATCHER.range, height).setTint(this.light).setBlendMode(Phaser.BlendModes.ADD);
    this.root.add(this.beam);
    this.eye(8, -42, 26);
    this.pupil = this.scene.add.image(13, -42, 'mon-ball').setDisplaySize(12, 12).setTint(this.look.pupil);
    this.root.add(this.pupil);
    this.part('orb', 'role-watcher-orb', 0, 0, 0.5, 1);
    this.part('lid', 'role-watcher-lid', 8, -50, 0.5, 1, false);
  }

  /** Struck: it shows white for a moment. */
  flash(): void {
    this.flashT = GRAMMAR.flash;
  }

  draw(dt: number, light: number): void {
    const m = this.monster;
    this.time += dt;
    const moved = m.x - this.lastX;
    this.walk += Math.abs(moved) * 0.2;
    this.lastX = m.x;
    const state = awareness(m);
    this.alert += ((state === 'calm' ? 0 : 1) - this.alert) * (1 - Math.exp(-8 * dt));
    const stunned = m.stun > 0;

    // The shared grammar: the moment an attack is committed, one flare of the eye.
    if (this.lastState === 'windup' && m.state !== 'windup' && m.state !== 'idle') this.flare();
    if (this.lastState === 'attack' && m.state === 'rest') this.exposedT = m.kind === 'flyer' ? MOVES.flyer.stuck : 0.8;
    if (m.kind === 'thorn' && this.lastState === 'windup' && m.state === 'rest') this.exposedT = 0.6;
    this.lastState = m.state;
    this.exposedT = Math.max(0, this.exposedT - dt);
    this.flashT = Math.max(0, this.flashT - dt);

    // Its gaze: cool while calm, amber when it searches, hot when it has him.
    this.sight.clear();
    const shape = SIGHTS[m.kind];
    if (shape && !stunned) drawGaze(this.sight, sightPolygons(shape, m, GROUND_Y), eyeColour(state, this.look.eye), this.alert, this.time);

    const shake = stunned ? Math.sin(this.time * 90) * 3 : 0;
    this.root.setPosition(m.x + shake, m.y);
    // Leaning into its speed; a slow breath when still.
    const lean = this.lean.step(Phaser.Math.Clamp((moved / Math.max(dt, 1e-3)) * 0.0012 * m.facing, -0.25, 0.25), dt);
    const breathe = Math.sin(this.time * 2.2) * 0.025;
    let scaleX = 1;
    let scaleY = 1;
    let flip = m.facing as number;

    if (m.kind === 'crawler') {
      // Crouched back before it charges; stretched while it runs; wobbling after.
      const target = m.state === 'windup' ? 0.78 : m.state === 'attack' ? 1.08 : 1;
      const s = this.squash.step(target, dt);
      scaleY = s + breathe;
      scaleX = 1 / Math.sqrt(s);
      const body = this.parts.body.image;
      body.rotation = m.state === 'rest' ? Math.sin(this.time * 30) * 0.06 : lean * 0.6;
      this.sync('body');
      const run = m.state === 'attack' ? 2.6 : 1;
      ['legB-20', 'legB12', 'legF-24', 'legF8'].forEach((name, i) => {
        const leg = this.parts[name].image;
        leg.rotation = Math.sin(this.walk * run + i * Math.PI * 0.5) * (Math.abs(moved) > 0.05 ? 0.6 : 0.05);
        leg.y = -14 + (1 - s) * 30;
      });
      this.weak.setPosition(-8, -44);
    } else if (m.kind === 'thorn') {
      // The stalk sways; the pod swells and opens as it aims, snaps shut and deflates after.
      const sway = this.sway.step(Math.sin(this.time * 1.1) * 0.08 + (m.sees ? 0.05 : 0), dt);
      const stalk = this.parts.stalk.image;
      stalk.rotation = sway;
      this.sync('stalk');
      const head = this.head!;
      head.setPosition(Math.sin(sway) * 86 + 4, -6 - Math.cos(sway) * 86);
      const aiming = m.state === 'windup';
      const swell = this.swell.step(aiming ? 1.3 : m.state === 'rest' && m.t < 0.4 ? 0.85 : 1 + breathe, dt);
      head.setScale(swell);
      head.rotation = sway * 0.6 + (aiming ? -0.15 : 0);
      const open = this.open.step(aiming ? 0.75 : m.state === 'rest' && m.t < 0.25 ? 0.02 : 0.22, dt);
      this.parts.lid.image.rotation = -open * 0.7;
      this.parts.jaw.image.rotation = open * 0.6;
      this.sync('lid');
      this.sync('jaw');
      // Its eye rides on the lid.
      const e = this.eyes[0];
      const a = -open * 0.7;
      e.x = Math.cos(a) * 26 - Math.sin(a) * -12;
      e.y = Math.sin(a) * 26 + Math.cos(a) * -12;
      e.disc.setPosition(e.x, e.y);
      e.glow.setPosition(e.x, e.y);
      this.weak.setPosition(head.x + 20, head.y - 6);
    } else if (m.kind === 'flyer') {
      // Flapping while it hovers; wings thrown up as it winds up; folded into an arrow as it dives; sprawled
      // on the ground, stuck, after.
      const diving = m.state === 'attack';
      const stuck = m.state === 'rest';
      const fold = this.fold.step(diving ? 1 : 0, dt);
      const beat = stuck ? 0 : Math.sin(this.time * (m.state === 'windup' ? 22 : 12));
      const wingRot = stuck ? 1.25 : (1 - fold) * (beat * 0.6 - 0.15) + fold * -1.15 + (m.state === 'windup' ? -0.35 : 0);
      const wingY = stuck ? 0.55 : (1 - fold) * (0.65 + 0.35 * Math.abs(Math.cos(this.time * 12))) + fold * 0.35;
      const near = this.parts.wingNear.image;
      const far = this.parts.wingFar.image;
      near.setRotation(wingRot).setScale(-1 / RES, wingY / RES);
      far.setRotation(wingRot * 0.9 - 0.1).setScale(-0.85 / RES, wingY * 0.9 / RES);
      this.sync('wingNear');
      const body = this.parts.body.image;
      // Pitched down along the dive; tipped over on the ground.
      body.rotation = stuck ? 0.5 : diving ? 0.55 : lean * 0.8;
      this.sync('body');
      scaleY = 1 + (stuck ? -0.1 : breathe * 0.5);
      this.weak.setPosition(-2, -16);
    } else if (m.kind === 'stalker') {
      // Heavy, slow steps; long arms that drag and lag behind the body; the front arm drawn back high to swipe.
      const stride = Math.sin(this.walk * 0.7);
      this.parts['leg-5'].image.rotation = stride * 0.3;
      this.parts.leg5.image.rotation = -stride * 0.3;
      const torso = this.parts.torso.image;
      torso.rotation = m.state === 'rest' ? 0.22 : lean * 0.5 + breathe * 0.6;
      this.sync('torso');
      // Arms longer than he is tall: they reach forward and their claws drag along the ground.
      const hang = -1.12 + Math.sin(this.time * 1.3) * 0.05 - lean * 0.8;
      const backUpper = this.armBack.step(hang - 0.08, dt);
      let frontUpper = hang;
      let frontFore = -0.05;
      if (m.state === 'windup') {
        frontUpper = 2.7;
        frontFore = 0.9;
      } else if (m.state === 'attack') {
        const k = Math.min(1, m.t / (MOVES.stalker.swipe * 0.7));
        frontUpper = 2.7 - k * 4.3;
        frontFore = 0.9 - k * 1.1;
      } else if (m.state === 'rest') {
        frontUpper = -1.0;
        frontFore = -0.3;
      }
      const fu = m.state === 'attack' ? frontUpper : this.armFront.step(frontUpper, dt);
      this.limb('upperB', 'foreB', -8, -102, backUpper, -0.08);
      const hand = this.limb('upperF', 'foreF', -6, -102, fu, frontFore);
      // The swipe leaves a trail of its light.
      this.trail.clear();
      if (m.state === 'attack') {
        // The path its claw has swept, fading as the swipe ends.
        const left = 1 - m.t / MOVES.stalker.swipe;
        this.trail.lineStyle(5, DANGER, 0.55 * Math.max(0, left));
        this.trail.beginPath();
        for (let i = 0; i <= 12; i++) {
          const a = 2.7 + (hand - 2.7) * (i / 12);
          const x = m.x + m.facing * (-6 - Math.sin(a) * 124);
          const y = m.y - 102 + Math.cos(a) * 124;
          if (i === 0) this.trail.moveTo(x, y);
          else this.trail.lineTo(x, y);
        }
        this.trail.strokePath();
      }
      this.weak.setPosition(14, -126);
    } else {
      // The watcher: its five seconds are on the beam and on a ring closing round its eye.
      const turning = m.state === 'turn' ? Math.abs(1 - (2 * m.t) / WATCHER.turnTime) : 1;
      flip = m.facing * Math.max(0.06, turning);
      const k = m.exposing ? Math.min(1, m.gaze / WATCHER.countdown) : 0;
      const beam = this.beam!;
      const height = 2 * (6 + WATCHER.range * WATCHER.spread);
      beam.setDisplaySize(WATCHER.range, height * (1 - k * 0.55));
      beam.setTint(m.exposing ? mixColour(this.light, DANGER, k) : this.light);
      beam.setAlpha(stunned ? 0 : (m.exposing ? 0.35 + k * 0.35 : 0.22) * turning);
      const size = 12 * (1 - k * 0.45);
      this.pupil!.setDisplaySize(size, size);
      this.ring.clear();
      if (m.exposing) {
        const last = WATCHER.countdown - m.gaze < 1;
        this.ring.lineStyle(last ? 3.5 : 2.5, mixColour(0xffb347, DANGER, k), last ? 0.7 + 0.3 * Math.sin(this.time * 30) : 0.85);
        this.ring.beginPath();
        this.ring.arc(8, -42, 19, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - k), false);
        this.ring.strokePath();
      }
      // It blinks now and then; the eye is open to a strike while it does.
      const blink = Math.max(0, Math.sin(this.time * 0.9) - 0.96) / 0.04;
      this.parts.lid.image.setScale(1 / RES, Math.max(0.15, blink) / RES);
      scaleX = 1 + breathe * 0.6;
      scaleY = 1 - breathe * 0.6;
      this.weak.setPosition(8, -42);
      if (blink > 0.5) this.exposedT = Math.max(this.exposedT, 0.1);
    }
    if (m.kind !== 'stalker') this.trail.clear();

    this.root.setScale(flip * scaleX, scaleY);

    // Colours: the body tinted by the light where it stands; white for a moment when struck.
    const bodyColour = stunned ? this.look.struck : mixColour(this.look.body[0], this.look.body[1], light);
    for (const image of this.dark) {
      if (this.flashT > 0) image.setTintFill(0xffffff);
      else image.setTint(bodyColour);
    }
    for (const rim of this.rims) rim.setAlpha(0.12 + light * 0.55);

    // Eyes: the colour of what it knows, wider and brighter once it has him.
    const colour = eyeColour(state, this.look.eye);
    for (const e of this.eyes) {
      const grow = 1 + this.alert * 0.3;
      e.disc.setDisplaySize(e.size * grow, e.size * grow).setTint(colour).setVisible(!stunned);
      e.glow.setTint(colour).setAlpha(stunned ? 0 : 0.35 + this.alert * 0.35);
    }
    // The wind-up: light gathers in to the eye, from a wide faint ring to a bright point.
    const eye = this.eyes[0];
    if (m.state === 'windup' && eye) {
      const p = Math.min(1, m.t / windupOf(m));
      const size = (1 - p) * 80 + 14;
      this.gather.setPosition(eye.x + (this.head?.x ?? 0), eye.y + (this.head?.y ?? 0)).setDisplaySize(size, size).setAlpha(0.15 + p * 0.75);
    } else if (!this.flaring) this.gather.setAlpha(0);
    // The weak point, open while it recovers.
    this.weak.setAlpha(this.exposedT > 0 ? 0.35 + 0.25 * Math.sin(this.time * 14) : 0);
  }

  private flaring = false;

  /** One flare of the eye: the attack is coming now. */
  private flare(): void {
    const eye = this.eyes[0];
    if (!eye) return;
    this.flaring = true;
    this.gather.setPosition(eye.x + (this.head?.x ?? 0), eye.y + (this.head?.y ?? 0)).setDisplaySize(eye.size * 3, eye.size * 3).setAlpha(1);
    this.scene.tweens.add({
      targets: this.gather,
      displayWidth: eye.size * 7.5,
      displayHeight: eye.size * 7.5,
      alpha: 0,
      duration: GRAMMAR.flare * 1000,
      ease: 'Cubic.easeOut',
      onComplete: () => (this.flaring = false),
    });
  }

  /** Copy a part's place to its rim. */
  private sync(name: string): void {
    const { image, rim } = this.parts[name];
    if (rim) rim.setPosition(image.x, image.y).setRotation(image.rotation).setScale(image.scaleX, image.scaleY);
  }

  /** An arm in two parts from a shoulder: returns the angle the hand ends at. */
  private limb(upper: string, fore: string, sx: number, sy: number, a: number, bend: number): number {
    const u = this.parts[upper].image;
    const f = this.parts[fore].image;
    u.setPosition(sx, sy).setRotation(a);
    const len = 56;
    const ex = sx - Math.sin(a) * len;
    const ey = sy + Math.cos(a) * len;
    f.setPosition(ex, ey).setRotation(a + bend);
    return a + bend;
  }

  destroy(): void {
    this.sight.destroy();
    this.trail.destroy();
    this.root.destroy();
  }
}
