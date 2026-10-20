// How dialogue is shown (dialogue.ts says what). Two ways:
// - a conversation: a quiet panel at the bottom of the screen, one line at a time, the world held still until it
//   ends. A tap shows the whole line, the next tap moves on; each line also moves on by itself after a while.
// - a passing remark: a small bubble over whoever speaks, while play goes on.

import Phaser from 'phaser';
import type { Line, Speaker } from './dialogue';

const PANEL = { maxW: 640, side: 16, bottom: 20, pad: 18, nameSize: 13, textSize: 20 };
/** Characters a second as a line appears, and how long a shown line stays before it moves on by itself. */
const PACE = { type: 45, readBase: 1.6, readPerChar: 0.045 };

export interface TalkColours {
  hero: number;
  monster: number;
  boss: number;
}

export class Talk {
  private lines: Line[] = [];
  private index = 0;
  private shown = 0;
  private wait = 0;
  private onDone?: () => void;
  private readonly panel: Phaser.GameObjects.Graphics;
  private readonly name: Phaser.GameObjects.Text;
  private readonly text: Phaser.GameObjects.Text;
  private readonly more: Phaser.GameObjects.Text;
  private bubbles: { box: Phaser.GameObjects.Container; at: () => { x: number; y: number }; left: number; alive: () => boolean }[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly colours: TalkColours,
    private readonly depth: number,
  ) {
    this.panel = scene.add.graphics().setScrollFactor(0).setDepth(depth).setVisible(false);
    this.name = scene.add
      .text(0, 0, '', { fontFamily: '"Instrument Sans", system-ui, sans-serif', fontSize: `${PANEL.nameSize}px`, fontStyle: '600' })
      .setScrollFactor(0)
      .setDepth(depth + 0.1)
      .setVisible(false);
    this.text = scene.add
      .text(0, 0, '', { fontFamily: '"Newsreader", Georgia, serif', fontSize: `${PANEL.textSize}px`, color: '#f3efe6', lineSpacing: 4 })
      .setScrollFactor(0)
      .setDepth(depth + 0.1)
      .setVisible(false);
    this.more = scene.add
      .text(0, 0, 'Tap', { fontFamily: '"Instrument Sans", system-ui, sans-serif', fontSize: '12px', color: '#f3efe6' })
      .setAlpha(0.5)
      .setOrigin(1, 1)
      .setScrollFactor(0)
      .setDepth(depth + 0.1)
      .setVisible(false);
  }

  /** True while a conversation holds the world still. */
  get blocking(): boolean {
    return this.index < this.lines.length;
  }

  /** Start a conversation. `onDone` runs after its last line. */
  say(lines: Line[], onDone?: () => void): void {
    this.lines = lines;
    this.index = 0;
    this.onDone = onDone;
    this.begin();
  }

  /** Call every frame. `advance` is true on a tap (or a key) that asks to move on. */
  step(dt: number, advance: boolean): void {
    this.stepBubbles(dt);
    if (!this.blocking) return;
    const line = this.lines[this.index];
    if (this.shown < line.text.length) {
      this.shown = advance ? line.text.length : Math.min(line.text.length, this.shown + PACE.type * dt);
      this.text.setText(line.text.slice(0, Math.floor(this.shown)));
      if (this.shown >= line.text.length) this.wait = PACE.readBase + line.text.length * PACE.readPerChar;
      return;
    }
    this.wait -= dt;
    if (advance || this.wait <= 0) {
      this.index++;
      if (this.blocking) this.begin();
      else this.finish();
    }
  }

  /** A short remark over whoever speaks; `at` says where they are now (world position of the top of the head). */
  remark(who: Speaker, text: string, at: () => { x: number; y: number }, seconds = 2.8, delay = 0, alive: () => boolean = () => true): void {
    const show = () => {
      if (!alive()) return;
      const colour = this.colourOf(who);
      const label = this.scene.add
        .text(0, 0, text, {
          fontFamily: '"Newsreader", Georgia, serif',
          fontSize: '16px',
          color: '#f3efe6',
          align: 'center',
          wordWrap: { width: 220 },
        })
        .setOrigin(0.5, 1);
      const w = label.width + 20;
      const h = label.height + 12;
      const back = this.scene.add.graphics();
      back.fillStyle(0x070a14, 0.82);
      back.fillRoundedRect(-w / 2, -h - 6, w, h, 8);
      back.fillTriangle(-6, -6, 6, -6, 0, 2);
      back.lineStyle(1, colour, 0.7);
      back.strokeRoundedRect(-w / 2, -h - 6, w, h, 8);
      label.setPosition(0, -12);
      const box = this.scene.add.container(0, 0, [back, label]).setDepth(this.depth - 1).setAlpha(0);
      this.scene.tweens.add({ targets: box, alpha: 1, duration: 180 });
      this.bubbles.push({ box, at, left: seconds, alive });
      this.place(box, at);
    };
    if (delay > 0) this.scene.time.delayedCall(delay * 1000, show);
    else show();
  }

  destroy(): void {
    for (const b of this.bubbles) b.box.destroy();
    this.bubbles = [];
  }

  private begin(): void {
    const line = this.lines[this.index];
    this.shown = 0;
    this.wait = 0;
    const width = Math.min(PANEL.maxW, this.scene.scale.width - PANEL.side * 2);
    const x = (this.scene.scale.width - width) / 2;
    this.text.setWordWrapWidth(width - PANEL.pad * 2).setText(line.text);
    const height = PANEL.pad * 2 + PANEL.nameSize + 8 + this.text.height;
    const y = this.scene.scale.height - PANEL.bottom - height;
    this.text.setText('');
    const colour = this.colourOf(line.who);
    this.panel.clear().setVisible(true);
    this.panel.fillStyle(0x070a14, 0.86);
    this.panel.fillRoundedRect(x, y, width, height, 12);
    this.panel.fillStyle(colour, 0.9);
    this.panel.fillRoundedRect(x, y + 12, 3, height - 24, 1.5);
    this.name
      .setText(line.name.toUpperCase())
      .setColor(Phaser.Display.Color.IntegerToColor(colour).rgba)
      .setPosition(x + PANEL.pad, y + PANEL.pad)
      .setVisible(true);
    this.text.setPosition(x + PANEL.pad, y + PANEL.pad + PANEL.nameSize + 8).setVisible(true);
    this.more.setPosition(x + width - PANEL.pad, y + height - PANEL.pad + 4).setVisible(true);
  }

  private finish(): void {
    this.panel.setVisible(false);
    this.name.setVisible(false);
    this.text.setVisible(false);
    this.more.setVisible(false);
    const done = this.onDone;
    this.onDone = undefined;
    done?.();
  }

  private stepBubbles(dt: number): void {
    for (const b of this.bubbles) {
      b.left -= dt;
      if (!b.alive() && b.box.active) {
        b.box.destroy();
        b.left = -1;
        continue;
      }
      this.place(b.box, b.at);
      if (b.left <= 0 && b.box.alpha >= 1) {
        this.scene.tweens.add({ targets: b.box, alpha: 0, duration: 260, onComplete: () => b.box.destroy() });
        b.box.setAlpha(0.99);
      }
    }
    this.bubbles = this.bubbles.filter((b) => b.box.active && b.left > -0.5);
  }

  private place(box: Phaser.GameObjects.Container, at: () => { x: number; y: number }): void {
    const p = at();
    box.setPosition(p.x, p.y);
  }

  private colourOf(who: Speaker): number {
    return who === 'hero' ? this.colours.hero : who === 'boss' ? this.colours.boss : this.colours.monster;
  }
}
