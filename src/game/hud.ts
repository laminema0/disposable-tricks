// The corner of the screen: his flower again, larger, so the petals can be counted (brief 3.3),
// sitting in a soft glow, with a thin ring around it that fills, one segment per flower collected,
// towards the next petal. No words, no numbers.

import Phaser from 'phaser';
import { HEALTH } from './config';
import type { Look } from './look';
import type { Health } from './rules';
import { TEX_SCALE } from './textures';

const LOST_ALPHA = 0.16;
const RING = { radius: 25, width: 2.4, gapDeg: 7 };

export class Hud {
  private readonly flower: Phaser.GameObjects.Container;
  private readonly petals: Phaser.GameObjects.Image[] = [];
  private readonly glow: Phaser.GameObjects.Image;
  private readonly ring: Phaser.GameObjects.Graphics;
  /** A thin road along the bottom: where he is, and the planting place at its end. */
  private readonly road: Phaser.GameObjects.Graphics;
  private shownProgress = -1;
  private roadHidden = false;
  private shownPetals: number = HEALTH.petals;
  private shownFlowers = -1;
  /** Weapon charges: small marks beside the flower. */
  private readonly charges: Phaser.GameObjects.Graphics;
  private shownCharges = '';

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly look: Look,
    /** Flowers needed for one petal: one segment of the ring each. */
    private readonly perPetal: number,
    depth: number,
  ) {
    const x = 44;
    const y = 44;
    this.glow = scene.add
      .image(x, y, 'glow')
      .setDisplaySize(96, 96)
      .setTint(look.light)
      .setAlpha(0.18)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScrollFactor(0)
      .setDepth(depth);
    this.ring = scene.add.graphics().setPosition(x, y).setScrollFactor(0).setDepth(depth);
    this.flower = scene.add.container(x, y).setScrollFactor(0).setDepth(depth);
    this.road = scene.add.graphics().setScrollFactor(0).setDepth(depth);
    this.charges = scene.add.graphics().setPosition(x + 40, y).setScrollFactor(0).setDepth(depth);
    for (let i = 0; i < HEALTH.petals; i++) {
      const angle = Phaser.Math.DegToRad(i * 72 - 90);
      const petal = scene.add
        .image(Math.cos(angle) * 10.5, Math.sin(angle) * 10.5, 'hero-petal')
        .setScale(TEX_SCALE * 2.3);
      this.petals.push(petal);
    }
    const heart = scene.add.image(0, 0, 'hero-dot').setScale(TEX_SCALE * 2.2).setTint(look.hero.dot[1]);
    this.flower.add([...this.petals, heart]);
  }

  /** Hidden while the maker shows the scene. */
  setVisible(on: boolean): void {
    this.flower.setVisible(on);
    this.ring.setVisible(on);
    this.glow.setVisible(on);
    this.road.setVisible(on);
    this.charges.setVisible(on);
  }

  /** Out of charges: the marks shake for a moment. */
  shakeCharges(): void {
    const x = this.charges.x;
    this.scene.tweens.killTweensOf(this.charges);
    this.charges.x = x;
    this.scene.tweens.add({ targets: this.charges, x: x + 4, duration: 45, yoyo: true, repeat: 3, onComplete: () => (this.charges.x = x) });
  }

  /**
   * Weapon charges beside the flower: a filled mark for each one ready, the next one filling as it comes back.
   * With the weapon thrown away they all go faint. Nothing shows without a weapon.
   */
  drawCharges(ready: number, most: number, coming: number, armed: boolean, hasWeapon: boolean): void {
    const key = `${ready}/${most}/${Math.round(coming * 12)}/${armed}/${hasWeapon}`;
    if (key === this.shownCharges) return;
    this.shownCharges = key;
    const g = this.charges;
    g.clear();
    if (!hasWeapon) return;
    const w = 5;
    const h = 16;
    const gap = 5;
    for (let i = 0; i < most; i++) {
      const x = i * (w + gap);
      g.fillStyle(0xffffff, armed ? 0.14 : 0.06);
      g.fillRoundedRect(x, -h / 2, w, h, 2);
      const fill = !armed ? 0 : i < ready ? 1 : i === ready ? coming : 0;
      if (fill > 0) {
        g.fillStyle(i < ready ? this.look.light : 0xffffff, i < ready ? 0.95 : 0.4);
        g.fillRoundedRect(x, h / 2 - h * fill, w, h * fill, Math.min(2, (h * fill) / 2));
      }
    }
  }

  private drawRoad(progress: number): void {
    const g = this.road;
    const width = this.scene.scale.width;
    const x0 = width * 0.34;
    const x1 = width * 0.66;
    const y = this.scene.scale.height - 18;
    const at = x0 + (x1 - x0) * progress;
    g.clear();
    g.lineStyle(2, 0xffffff, 0.14);
    g.lineBetween(x0, y, x1, y);
    g.lineStyle(2, this.look.light, 0.6);
    g.lineBetween(x0, y, at, y);
    // The planting place: a small flower at the end of the road.
    g.fillStyle(0xffffff, 0.75);
    for (let i = 0; i < 5; i++) {
      const a = Phaser.Math.DegToRad(i * 72 - 90);
      g.fillCircle(x1 + 8 + Math.cos(a) * 3.2, y + Math.sin(a) * 3.2, 2.3);
    }
    g.fillStyle(this.look.accent, 1);
    g.fillCircle(x1 + 8, y, 1.6);
    // Him.
    g.fillStyle(this.look.light, 1);
    g.fillCircle(at, y, 4);
  }

  private drawRing(filled: number): void {
    const g = this.ring;
    g.clear();
    const step = 360 / this.perPetal;
    for (let i = 0; i < this.perPetal; i++) {
      const start = Phaser.Math.DegToRad(-90 + i * step + RING.gapDeg / 2);
      const end = Phaser.Math.DegToRad(-90 + (i + 1) * step - RING.gapDeg / 2);
      const on = i < filled;
      g.lineStyle(on ? RING.width + 0.6 : RING.width, on ? this.look.accent : 0xffffff, on ? 1 : 0.16);
      g.beginPath();
      g.arc(0, 0, RING.radius, start, end);
      g.strokePath();
    }
  }

  /** The thin road along the bottom is left out where the map (minimap.ts) shows the way instead. */
  hideRoad(): void {
    this.roadHidden = true;
    this.road.setVisible(false);
  }

  draw(health: Health, progress = 0): void {
    // Redrawn only when he has moved a visible amount.
    if (!this.roadHidden && Math.abs(progress - this.shownProgress) > 0.002) {
      this.shownProgress = progress;
      this.drawRoad(progress);
    }
    if (health.petals !== this.shownPetals) {
      // A lost petal shrinks the flower for a moment; a regrown one swells it.
      const grew = health.petals > this.shownPetals;
      this.flower.setScale(grew ? 1.45 : 0.72);
      this.scene.tweens.add({ targets: this.flower, scale: 1, duration: 380, ease: 'Back.easeOut' });
      this.shownPetals = health.petals;
    }
    this.petals.forEach((petal, i) => petal.setAlpha(i < health.petals ? 1 : LOST_ALPHA));
    if (health.flowers !== this.shownFlowers) {
      // A new segment lights; the glow swells a little with it.
      if (this.shownFlowers >= 0 && health.flowers > this.shownFlowers) {
        this.glow.setAlpha(0.42);
        this.scene.tweens.add({ targets: this.glow, alpha: 0.18, duration: 600, ease: 'Sine.easeOut' });
      }
      this.shownFlowers = health.flowers;
      this.drawRing(health.flowers);
    }
  }
}
