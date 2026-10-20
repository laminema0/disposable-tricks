import { describe, expect, it } from 'vitest';
import { END_CLEARING, LEVEL_SCREENS, SCREEN_W } from '../src/game/config';
import { buildLevel, CHUNK_TYPES, chooseChunks, hideSpotAt, pitAt, waterAt } from '../src/game/level';
import { isHidden, isSeen } from '../src/game/rules';

describe('buildLevel', () => {
  it('gives the same level for the same seed', () => {
    expect(buildLevel(48213)).toEqual(buildLevel(48213));
  });

  it('gives different levels for different seeds', () => {
    const orders = new Set([1, 2, 3, 4, 5, 6, 7, 8].map((seed) => chooseChunks(seed).join()));
    expect(orders.size).toBeGreaterThan(1);
  });

  it('is about 8 screens long, plus the clearing at the end', () => {
    const level = buildLevel(7);
    expect(level.chunks).toHaveLength(LEVEL_SCREENS);
    expect(level.width).toBe(LEVEL_SCREENS * SCREEN_W + END_CLEARING);
    const lastChunkEnd = LEVEL_SCREENS * SCREEN_W;
    for (const spot of level.hideSpots) expect(spot.x1).toBeLessThan(lastChunkEnd);
    for (const pit of level.pits) expect(pit.x1).toBeLessThan(lastChunkEnd);
  });

  it('opens on a lamp road, uses every chunk type and never repeats one twice in a row', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const chunks = chooseChunks(seed);
      expect(chunks[0]).toBe('lampRoad');
      for (const type of CHUNK_TYPES) expect(chunks).toContain(type);
      chunks.forEach((type, i) => {
        if (i > 0) expect(type).not.toBe(chunks[i - 1]);
      });
    }
  });

  it('finds hide spots and pits by position', () => {
    const level = buildLevel(48213);
    const spot = level.hideSpots[0];
    expect(hideSpotAt(level, (spot.x0 + spot.x1) / 2)).toBe(spot);
    expect(hideSpotAt(level, spot.x0 - 5)).toBeUndefined();
    const pit = level.pits[0];
    expect(pitAt(level, (pit.x0 + pit.x1) / 2)).toBe(pit);
    expect(pitAt(level, pit.x0)).toBeUndefined();
    const water = level.waters[0];
    expect(waterAt(level, (water.x0 + water.x1) / 2)).toBe(water);
    expect(waterAt(level, water.x1 + 5)).toBeUndefined();
  });
});

describe('hiding rules', () => {
  it('needs all three: lying down, a hide spot and low light', () => {
    expect(isHidden({ lying: true, inHideSpot: true, light: 0.1 })).toBe(true);
    expect(isHidden({ lying: false, inHideSpot: true, light: 0.1 })).toBe(false);
    expect(isHidden({ lying: true, inHideSpot: false, light: 0.1 })).toBe(false);
    expect(isHidden({ lying: true, inHideSpot: true, light: 0.15 })).toBe(false);
  });

  it('is seen above 0.35 unless hidden', () => {
    expect(isSeen(0.5, false)).toBe(true);
    expect(isSeen(0.35, false)).toBe(false);
    expect(isSeen(0.5, true)).toBe(false);
  });
});

describe('pits (Amin, 19 Oct: "the holes in the game are not a lot")', () => {
  it('every road has several pits to jump, never on top of a hiding place', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const level = buildLevel(seed);
      expect(level.pits.length, `seed ${seed}`).toBeGreaterThanOrEqual(4);
      for (const pit of level.pits) {
        expect(level.hideSpots.some((h) => h.x1 > pit.x0 && h.x0 < pit.x1), `seed ${seed}`).toBe(false);
      }
    }
  });
});
