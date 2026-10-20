// The map (Amin, 18 and 19 Oct): seen from above, simple, nothing but the ways. The road runs east; each detour
// leaves it at its gate and runs north, as he turns into it. While he plays, a small circle in the top right
// shows only what is around him. Tapping the circle opens the whole map over the game, and pauses it.

import Phaser from 'phaser';
import type { Look } from './look';
import { QUEST } from './quest';
import type { WorldLayout } from './world';

/** The circle: its radius, and how many world pixels one map pixel stands for. */
const R = 34;
const NEAR_SCALE = 1 / 26;
const TOP = 52;

export interface MapMarks {
  /** Where he is: on the road, or in the detour that leaves the road at gateX. */
  gateX?: number;
  heroX: number;
  /** Ids of everything found or broken (run.found). */
  found: readonly string[];
}

interface Way {
  /** From and to, in map space: x east along the road, y north up a detour (negative is north). */
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export class MiniMap {
  private readonly ring: Phaser.GameObjects.Graphics;
  private readonly near: Phaser.GameObjects.Graphics;
  private readonly mask: Phaser.GameObjects.Graphics;
  private readonly count: Phaser.GameObjects.Text;
  private readonly hit: Phaser.GameObjects.Zone;
  private readonly ways: Way[];
  private big?: Phaser.GameObjects.Container;
  private cx = 0;
  private cy = 0;
  private shown = '';
  private last: MapMarks = { heroX: 0, found: [] };

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly world: WorldLayout,
    private readonly look: Look,
    private readonly depth: number,
    /** Called with true when the whole map opens (the game waits), false when it closes. */
    private readonly onOpen: (open: boolean) => void,
  ) {
    const road = world.road;
    // The road, broken where its pits are, and each detour going north from its gate.
    this.ways = [];
    let from = 0;
    for (const pit of [...road.level.pits].sort((a, b) => a.x0 - b.x0)) {
      this.ways.push({ x0: from, y0: 0, x1: pit.x0, y1: 0 });
      from = pit.x1;
    }
    this.ways.push({ x0: from, y0: 0, x1: road.level.width, y1: 0 });
    for (const detour of world.detours) this.ways.push({ x0: detour.gateX, y0: 0, x1: detour.gateX, y1: -detour.width });

    this.ring = scene.add.graphics().setScrollFactor(0).setDepth(depth);
    this.near = scene.add.graphics().setScrollFactor(0).setDepth(depth + 0.01);
    // The circle that clips it stays on the screen, like the map itself.
    this.mask = scene.make.graphics({}, false).setScrollFactor(0);
    this.near.setMask(this.mask.createGeometryMask());
    this.count = scene.add
      .text(0, 0, '', { fontFamily: '"Instrument Sans", system-ui, sans-serif', fontSize: '12px', color: '#f4f4ee' })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(depth + 0.01);
    this.hit = scene.add.zone(0, 0, R * 2, R * 2).setScrollFactor(0).setDepth(depth + 0.02).setInteractive({ useHandCursor: true });
    this.hit.on('pointerup', () => this.toggle());
    this.layout();
  }

  /** Where he is on the map: east along the road, or north up the detour he is in. */
  private heroAt(marks: MapMarks): { x: number; y: number } {
    return marks.gateX === undefined ? { x: marks.heroX, y: 0 } : { x: marks.gateX, y: -marks.heroX };
  }

  /** The circle in the top right, under the Menu button. */
  layout(): void {
    this.cx = this.scene.scale.width - R - 22;
    this.cy = TOP + R;
    this.ring.clear();
    this.ring.fillStyle(0x05070f, 0.55);
    this.ring.fillCircle(this.cx, this.cy, R);
    this.ring.lineStyle(1.5, 0xffffff, 0.25);
    this.ring.strokeCircle(this.cx, this.cy, R);
    this.mask.clear();
    this.mask.fillStyle(0xffffff, 1);
    this.mask.fillCircle(this.cx, this.cy, R - 1);
    this.count.setPosition(this.cx, this.cy + R + 6);
    this.hit.setPosition(this.cx, this.cy);
    this.shown = '';
    if (this.big) this.openBig();
  }

  /** Draw the ways on a graphics, placed by the function at(). */
  private drawWays(g: Phaser.GameObjects.Graphics, at: (x: number, y: number) => { x: number; y: number }, width: number): void {
    g.lineStyle(width, 0xffffff, 0.55);
    for (const way of this.ways) {
      const a = at(way.x0, way.y0);
      const b = at(way.x1, way.y1);
      g.lineBetween(a.x, a.y, b.x, b.y);
    }
    // The gates, small; the gate at the end, lit.
    g.fillStyle(this.look.light, 0.8);
    for (const detour of this.world.detours) {
      const p = at(detour.gateX, 0);
      g.fillCircle(p.x, p.y, width * 0.9);
    }
    const end = at(this.world.road.goalX, 0);
    g.fillStyle(this.look.light, 1);
    g.fillRect(end.x - width * 1.4, end.y - width * 1.4, width * 2.8, width * 2.8);
  }

  private foundCount(found: readonly string[]): number {
    return found.filter((id) => /f\d+$/.test(id)).length;
  }

  draw(marks: MapMarks): void {
    this.last = marks;
    const hero = this.heroAt(marks);
    const key = `${Math.round(hero.x / 12)}|${Math.round(hero.y / 12)}|${marks.found.length}`;
    if (key === this.shown) return;
    this.shown = key;
    const g = this.near;
    g.clear();
    this.drawWays(g, (x, y) => ({ x: this.cx + (x - hero.x) * NEAR_SCALE, y: this.cy + (y - hero.y) * NEAR_SCALE }), 3);
    g.fillStyle(this.look.light, 1);
    g.fillCircle(this.cx, this.cy, 3.5);
    const count = this.foundCount(marks.found);
    this.count.setText(`${count} / ${QUEST.needed}`).setColor(count >= QUEST.needed ? '#ffe9a8' : '#f4f4ee');
  }

  private toggle(): void {
    if (this.big) {
      this.big.destroy();
      this.big = undefined;
      this.onOpen(false);
    } else {
      this.openBig();
      this.onOpen(true);
    }
  }

  /** The whole map, over the game: every way, every gate, the end, and him. */
  private openBig(): void {
    this.big?.destroy();
    const scene = this.scene;
    const w = scene.scale.width;
    const h = scene.scale.height;
    const shade = scene.add.rectangle(0, 0, w, h, 0x05070f, 0.82).setOrigin(0).setInteractive();
    shade.on('pointerup', () => this.toggle());
    const g = scene.add.graphics();
    const north = Math.max(...this.world.detours.map((d) => d.width), 1);
    const east = this.world.road.level.width;
    const pad = 46;
    const k = Math.min((w - pad * 2) / east, (h - pad * 2 - 30) / north);
    const left = (w - east * k) / 2;
    const ground = h - pad - (h - pad * 2 - 30 - north * k) / 2;
    const at = (x: number, y: number) => ({ x: left + x * k, y: ground + y * k });
    this.drawWays(g, at, 4);
    const hero = at(this.heroAt(this.last).x, this.heroAt(this.last).y);
    g.fillStyle(this.look.light, 1);
    g.fillCircle(hero.x, hero.y, 6);
    g.lineStyle(1.5, this.look.light, 0.5);
    g.strokeCircle(hero.x, hero.y, 11);
    const style = { fontFamily: '"Instrument Sans", system-ui, sans-serif', fontSize: '13px', color: '#c9cbd6' };
    const count = this.foundCount(this.last.found);
    const title = scene.add.text(w / 2, 22, `The map · ${count} of ${QUEST.total} flowers found, ${QUEST.needed} to plant`, { ...style, color: '#f4f4ee' }).setOrigin(0.5, 0);
    const close = scene.add.text(w / 2, h - 26, 'Tap to close', style).setOrigin(0.5, 0);
    this.big = scene.add.container(0, 0, [shade, g, title, close]).setScrollFactor(0).setDepth(this.depth + 5);
  }

  /** The middle of the circle, on the screen. */
  get centre(): { x: number; y: number } {
    return { x: this.cx, y: this.cy };
  }

  /** A flower has come in: the count swells for a moment. */
  pulse(): void {
    this.count.setScale(1.5);
    this.scene.tweens.add({ targets: this.count, scale: 1, duration: 420, ease: 'Back.easeOut' });
    const ring = this.scene.add.circle(this.cx, this.cy, R).setStrokeStyle(2, this.look.accent, 0.9).setScrollFactor(0).setDepth(this.depth + 0.02);
    this.scene.tweens.add({ targets: ring, scale: 1.35, alpha: 0, duration: 600, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
  }

  get open(): boolean {
    return this.big !== undefined;
  }

  setVisible(on: boolean): void {
    this.ring.setVisible(on);
    this.near.setVisible(on);
    this.count.setVisible(on);
  }
}
