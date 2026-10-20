import { describe, expect, it } from 'vitest';
import { lightFalloff, lightLevelAt, mixColour, type LightSource } from '../src/core/light';
import { GROUND_Y, LIGHT } from '../src/game/config';
import { buildLevel } from '../src/game/level';

const lamp: LightSource = { x: 100, y: 0, radius: 200, strength: 1 };

describe('lightFalloff', () => {
  it('is 1 at the source and 0 at the radius and beyond', () => {
    expect(lightFalloff(0, 200)).toBe(1);
    expect(lightFalloff(200, 200)).toBe(0);
    expect(lightFalloff(500, 200)).toBe(0);
  });

  it('gets weaker with distance', () => {
    expect(lightFalloff(50, 200)).toBeGreaterThan(lightFalloff(100, 200));
    expect(lightFalloff(100, 200)).toBeGreaterThan(lightFalloff(150, 200));
  });

  it('is 0 for a light with no radius', () => {
    expect(lightFalloff(0, 0)).toBe(0);
  });
});

describe('lightLevelAt', () => {
  it('is the ambient level when there are no lights', () => {
    expect(lightLevelAt(0, 0, [], 0.04)).toBe(0.04);
    expect(lightLevelAt(0, 0, [])).toBe(0);
  });

  it('is the full strength at the source', () => {
    expect(lightLevelAt(100, 0, [lamp])).toBe(1);
    expect(lightLevelAt(100, 0, [{ ...lamp, strength: 0.6 }])).toBeCloseTo(0.6);
  });

  it('is only ambient outside the radius', () => {
    expect(lightLevelAt(400, 0, [lamp], 0.04)).toBe(0.04);
  });

  it('measures distance in both directions', () => {
    expect(lightLevelAt(100, 100, [lamp])).toBeCloseTo(lightLevelAt(200, 0, [lamp]));
  });

  it('adds lights together and never leaves 0 to 1', () => {
    const two = [lamp, { ...lamp, x: 140 }];
    expect(lightLevelAt(120, 0, two)).toBe(1);
    const dim = [
      { ...lamp, strength: 0.3 },
      { ...lamp, x: 140, strength: 0.3 },
    ];
    const one = lightLevelAt(120, 0, [dim[0]]);
    expect(lightLevelAt(120, 0, dim)).toBeCloseTo(one * 2);
    expect(lightLevelAt(100, 0, [{ ...lamp, strength: -5 }])).toBe(0);
  });
});

describe('mixColour', () => {
  it('returns the ends at 0 and 1 and the middle at 0.5', () => {
    expect(mixColour(0x000000, 0xffffff, 0)).toBe(0x000000);
    expect(mixColour(0x000000, 0xffffff, 1)).toBe(0xffffff);
    expect(mixColour(0x000000, 0x204060, 0.5)).toBe(0x102030);
    expect(mixColour(0x102030, 0xffffff, 7)).toBe(0xffffff);
  });
});

describe('the lights in a built level', () => {
  const level = buildLevel(48213);
  const heroY = GROUND_Y - 50;
  const at = (x: number) => lightLevelAt(x, heroY, level.lights, LIGHT.ambient);

  it('has a strong light, a weak light and a dark stretch', () => {
    const strong = level.lights.find((light) => light.strong)!;
    const weak = level.lights.find((light) => !light.strong && light.kind !== 'water')!;
    expect(at(strong.x)).toBeGreaterThan(0.7);
    expect(at(weak.x)).toBeGreaterThan(LIGHT.seenAbove);
    expect(at(weak.x)).toBeLessThan(at(strong.x));

    const hall = level.chunks.indexOf('pillarHall');
    expect(hall).toBeGreaterThan(-1);
    for (const offset of [150, 480, 800]) {
      expect(at(hall * level.chunkWidth + offset)).toBeLessThan(LIGHT.hiddenBelow);
    }
  });

  it('has a hide spot that is too bright and one that is dark enough', () => {
    const lightAtSpots = level.hideSpots.map((spot) => at((spot.x0 + spot.x1) / 2));
    expect(lightAtSpots.some((light) => light >= LIGHT.hiddenBelow)).toBe(true);
    expect(lightAtSpots.some((light) => light < LIGHT.hiddenBelow)).toBe(true);
  });
});
