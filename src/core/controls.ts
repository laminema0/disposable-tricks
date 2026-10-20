// Reads fingers and keys from Phaser and turns them into one "intent" per frame.
// The decision of what a finger means is in input.ts (pure and tested).

import Phaser from 'phaser';
import { TOUCH } from '../game/config';
import { classifyTouch, type Side, type TouchAction, type TouchTrace } from './input';

export interface Intent {
  move: -1 | 0 | 1;
  /** True on the one frame a jump was asked for. */
  jump: boolean;
  /** True while the jump is still held: a longer hold gives a higher jump. */
  jumpHeld?: boolean;
  lie: boolean;
  /** True on the one frame a strike was asked for. */
  strike: boolean;
  /** Side of the tap that asked for the strike. 0 means "the way he faces" (keyboard). */
  strikeDir: Side | 0;
}

interface ActiveTouch {
  pointer: Phaser.Input.Pointer;
  startX: number;
  startY: number;
  startTime: number;
  jumped: boolean;
  /** It has lain down: it stays down while the finger is held below where it started. */
  lay: boolean;
  /** It already struck on touch-down (a second finger): its lift does not strike again. */
  struck: boolean;
  /** For the finger's speed: where it was last frame, when, and how fast it moves up or down. */
  lastY: number;
  lastT: number;
  vy: number;
  /** What it means now, for the touch marks on screen. */
  action: TouchAction;
}

/** A finger on the screen, for drawing where it touches (screen pixels). */
export interface Finger {
  startX: number;
  startY: number;
  x: number;
  y: number;
  action: TouchAction;
}

type Keys = Record<
  'A' | 'D' | 'W' | 'S' | 'J' | 'LEFT' | 'RIGHT' | 'UP' | 'DOWN' | 'SPACE' | 'ENTER',
  Phaser.Input.Keyboard.Key
>;

export class Controls {
  private readonly touches = new Map<number, ActiveTouch>();
  private queuedStrike: Side | 0 = 0;
  private readonly keys?: Keys;
  /** When the last strike or jump was asked for (performance.now), to measure how quickly he answers. */
  askedAt = 0;

  constructor(private readonly scene: Phaser.Scene) {
    const input = scene.input;
    input.mouse?.disableContextMenu();

    input.on('pointerdown', (pointer: Phaser.Input.Pointer, over: unknown[]) => {
      if (over.length > 0) return; // the touch landed on a button, not on the game
      const at = this.screenPoint(pointer);
      const now = performance.now();
      // A second finger while another walks strikes at once, on touch-down (controls research, 19 Oct).
      const walking = [...this.touches.values()].some((t) => t.pointer.isDown && now - t.startTime >= TOUCH.walkDelayMs);
      if (walking) {
        this.queuedStrike = at.x < this.screenWidth() / 2 ? -1 : 1;
        this.askedAt = now;
      }
      this.touches.set(pointer.id, {
        pointer,
        startX: at.x,
        startY: at.y,
        startTime: now,
        jumped: false,
        lay: false,
        struck: walking,
        lastY: at.y,
        lastT: now,
        vy: 0,
        action: 'none',
      });
    });

    const lift = (pointer: Phaser.Input.Pointer) => {
      const touch = this.touches.get(pointer.id);
      if (!touch) return;
      this.touches.delete(pointer.id);
      const result = classifyTouch(this.trace(touch, true), this.screenWidth());
      if (result.action === 'strike' && !touch.struck) {
        this.queuedStrike = result.side;
        this.askedAt = performance.now();
      }
    };
    input.on('pointerup', lift);
    input.on('pointerupoutside', lift);
    const clear = () => this.touches.clear();
    scene.game.events.on(Phaser.Core.Events.BLUR, clear);
    scene.events.on(Phaser.Scenes.Events.PAUSE, clear);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.game.events.off(Phaser.Core.Events.BLUR, clear));

    this.keys = input.keyboard?.addKeys('A,D,W,S,J,LEFT,RIGHT,UP,DOWN,SPACE,ENTER') as Keys | undefined;
  }

  /** Forget every finger and any strike waiting: for when the game was covered (the map) and comes back. */
  reset(): void {
    this.touches.clear();
    this.queuedStrike = 0;
  }

  /** Call once per frame. */
  poll(): Intent {
    const intent: Intent = { move: 0, jump: false, lie: false, strike: false, strikeDir: 0 };
    const width = this.screenWidth();

    // Later fingers win over earlier ones. A lying finger that slides sideways crawls,
    // and it wins over a second finger that only holds a side.
    let crawl: -1 | 0 | 1 = 0;
    for (const [id, touch] of this.touches) {
      if (!touch.pointer.isDown) {
        this.touches.delete(id);
        continue;
      }
      // The finger's speed up or down, smoothed over a few frames, so a quick flick can jump.
      const now = performance.now();
      const at = this.screenPoint(touch.pointer);
      const gap = Math.max(1, now - touch.lastT);
      touch.vy = touch.vy * 0.4 + ((at.y - touch.lastY) / gap) * 0.6;
      touch.lastY = at.y;
      touch.lastT = now;
      let result = classifyTouch(this.trace(touch, false), width);
      // Once down, it stays down while the finger is held below where it started; once jumped, the hold
      // keeps the jump high while the finger stays above where it started.
      if (touch.lay && result.action !== 'jump' && at.y - touch.startY > 6) result = { ...result, action: 'lie' };
      if (touch.jumped && result.action !== 'lie' && at.y < touch.startY) result = { ...result, action: 'jump' };
      if (result.action === 'lie') touch.lay = true;
      touch.action = result.action;
      if (result.action === 'lie') {
        intent.lie = true;
        if (result.crawl !== 0) crawl = result.crawl;
      } else {
        intent.move = result.side;
        if (result.action === 'jump') {
          intent.jumpHeld = true;
          if (!touch.jumped) {
            touch.jumped = true;
            intent.jump = true;
            this.askedAt = now;
          }
        }
      }
    }

    if (crawl !== 0) intent.move = crawl;

    if (this.queuedStrike !== 0) {
      intent.strike = true;
      intent.strikeDir = this.queuedStrike;
      this.queuedStrike = 0;
    }

    const keys = this.keys;
    if (keys) {
      const keyMove = (keys.D.isDown || keys.RIGHT.isDown ? 1 : 0) - (keys.A.isDown || keys.LEFT.isDown ? 1 : 0);
      if (keyMove !== 0) intent.move = keyMove as -1 | 1;
      if (keys.S.isDown || keys.DOWN.isDown) intent.lie = true;
      const justDown = Phaser.Input.Keyboard.JustDown;
      if (justDown(keys.W) || justDown(keys.SPACE) || justDown(keys.UP)) intent.jump = true;
      if (keys.W.isDown || keys.SPACE.isDown || keys.UP.isDown) intent.jumpHeld = true;
      if (justDown(keys.J) || justDown(keys.ENTER)) {
        intent.strike = true;
        this.askedAt = performance.now();
      }
      if (intent.jump && this.touches.size === 0) this.askedAt = performance.now();
    }
    return intent;
  }

  /** The fingers on the screen now, in screen pixels. */
  fingers(): Finger[] {
    return [...this.touches.values()]
      .filter((t) => t.pointer.isDown)
      .map((t) => {
        const at = this.screenPoint(t.pointer);
        return { startX: t.startX, startY: t.startY, x: at.x, y: at.y, action: t.action };
      });
  }

  // Thresholds are in screen pixels, so convert from game pixels.
  private screenPoint(pointer: Phaser.Input.Pointer): { x: number; y: number } {
    const scale = this.scene.scale.displayScale;
    return { x: pointer.x / scale.x, y: pointer.y / scale.y };
  }

  private screenWidth(): number {
    return this.scene.scale.width / this.scene.scale.displayScale.x;
  }

  private trace(touch: ActiveTouch, released: boolean): TouchTrace {
    const at = this.screenPoint(touch.pointer);
    return {
      startX: touch.startX,
      startY: touch.startY,
      x: at.x,
      y: at.y,
      heldMs: performance.now() - touch.startTime,
      released,
      vy: touch.vy,
    };
  }
}
