import { describe, expect, it } from 'vitest';
import { classifyTouch, type TouchTrace } from '../src/core/input';

const SCREEN = 800;
const trace = (over: Partial<TouchTrace>): TouchTrace => ({
  startX: 600,
  startY: 200,
  x: 600,
  y: 200,
  heldMs: 0,
  released: false,
  ...over,
});

describe('classifyTouch: which side', () => {
  it('the right half goes forward, the left half goes back', () => {
    expect(classifyTouch(trace({ startX: 600 }), SCREEN).side).toBe(1);
    expect(classifyTouch(trace({ startX: 100, x: 100 }), SCREEN).side).toBe(-1);
  });

  it('keeps the side where the finger started, even if it slides across', () => {
    expect(classifyTouch(trace({ startX: 390, x: 500, heldMs: 400 }), SCREEN).side).toBe(-1);
  });
});

describe('classifyTouch: hold', () => {
  it('waits 80 ms before walking, so a tap to strike does not step him', () => {
    expect(classifyTouch(trace({ heldMs: 0 }), SCREEN).action).toBe('none');
    expect(classifyTouch(trace({ heldMs: 79 }), SCREEN).action).toBe('none');
    expect(classifyTouch(trace({ heldMs: 80 }), SCREEN).action).toBe('move');
  });

  it('keeps moving on a long hold', () => {
    expect(classifyTouch(trace({ heldMs: 3000, x: 610, y: 215 }), SCREEN).action).toBe('move');
  });

  it('does nothing more when a long hold is lifted', () => {
    expect(classifyTouch(trace({ heldMs: 900, released: true }), SCREEN).action).toBe('none');
  });
});

describe('classifyTouch: tap', () => {
  it('a quick, still tap is a strike on that side', () => {
    expect(classifyTouch(trace({ heldMs: 90, x: 603, y: 204, released: true }), SCREEN)).toMatchObject({
      side: 1,
      action: 'strike',
    });
    expect(classifyTouch(trace({ startX: 50, x: 50, heldMs: 90, released: true }), SCREEN)).toMatchObject({
      side: -1,
      action: 'strike',
    });
  });

  it('200 ms is still a tap, 201 ms is not', () => {
    expect(classifyTouch(trace({ heldMs: 200, released: true }), SCREEN).action).toBe('strike');
    expect(classifyTouch(trace({ heldMs: 201, released: true }), SCREEN).action).toBe('none');
  });

  it('a finger that moved 12 px or more is not a tap', () => {
    expect(classifyTouch(trace({ heldMs: 90, x: 611, released: true }), SCREEN).action).toBe('strike');
    expect(classifyTouch(trace({ heldMs: 90, x: 612, released: true }), SCREEN).action).toBe('none');
    expect(classifyTouch(trace({ heldMs: 90, x: 609, y: 209, released: true }), SCREEN).action).toBe('none');
  });
});

describe('classifyTouch: drag', () => {
  it('a drag up of more than 28 px is a jump', () => {
    expect(classifyTouch(trace({ y: 200 - 28, heldMs: 120 }), SCREEN).action).toBe('move');
    expect(classifyTouch(trace({ y: 200 - 29, heldMs: 120 }), SCREEN).action).toBe('jump');
  });

  it('a drag down of more than 28 px is a lie-down', () => {
    expect(classifyTouch(trace({ y: 200 + 28, heldMs: 120 }), SCREEN).action).toBe('move');
    expect(classifyTouch(trace({ y: 200 + 29, heldMs: 120 }), SCREEN).action).toBe('lie');
  });

  it('a quick flick of only 15 px jumps or lies down; the same slow drag does not', () => {
    expect(classifyTouch(trace({ y: 185, heldMs: 120, vy: -1.2 }), SCREEN).action).toBe('jump');
    expect(classifyTouch(trace({ y: 185, heldMs: 120, vy: -0.2 }), SCREEN).action).toBe('move');
    expect(classifyTouch(trace({ y: 215, heldMs: 120, vy: 1.2 }), SCREEN).action).toBe('lie');
  });

  it('a sideways drag is still a hold', () => {
    expect(classifyTouch(trace({ x: 760, heldMs: 300 }), SCREEN).action).toBe('move');
  });

  it('a fast flick up is a jump, never a strike', () => {
    expect(classifyTouch(trace({ y: 130, heldMs: 80 }), SCREEN).action).toBe('jump');
    expect(classifyTouch(trace({ y: 130, heldMs: 80, released: true }), SCREEN).action).toBe('none');
  });

  it('lying down, a slide to one side crawls that way and back to the middle stops', () => {
    const lying = (x: number) => classifyTouch(trace({ x, y: 260, heldMs: 500 }), SCREEN);
    expect(lying(600)).toEqual({ side: 1, action: 'lie', crawl: 0 });
    expect(lying(628).crawl).toBe(0);
    expect(lying(629).crawl).toBe(1);
    expect(lying(560).crawl).toBe(-1);
    // Sliding sideways without first dragging down is still a walk.
    expect(classifyTouch(trace({ x: 660, heldMs: 500 }), SCREEN)).toEqual({ side: 1, action: 'move', crawl: 0 });
  });

  it('uses the thresholds it is given', () => {
    const loose = { tapMaxMs: 500, tapMaxMovePx: 30, dragPx: 10, crawlPx: 10 };
    expect(classifyTouch(trace({ heldMs: 400, x: 620, released: true }), SCREEN, loose).action).toBe('strike');
    expect(classifyTouch(trace({ y: 185 }), SCREEN, loose).action).toBe('jump');
  });
});
