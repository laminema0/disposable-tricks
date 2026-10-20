import { describe, expect, it } from 'vitest';
import { GROUND_Y } from '../src/game/config';
import { heroTarget, MonsterWorld, type HeroState } from '../src/game/monsters';
import { inSight, SIGHTS, sightPolygons, type Seer, type SightShape } from '../src/game/sight';

const G = GROUND_Y;
const shape = (kind: 'crawler' | 'thorn' | 'flyer' | 'stalker'): SightShape => SIGHTS[kind]!;
const seer = (over: Partial<Seer> = {}): Seer => ({ x: 1000, y: G, facing: 1, ...over });
/** The hero at `x`: standing, lying flat, or in the air with his feet `up` above the ground. */
const standing = (x: number, up = 0) => ({ x, top: G - up - 92, bottom: G - up, roofed: false });
const lying = (x: number) => ({ x, top: G - 34, bottom: G, roofed: false });

describe('where each monster looks', () => {
  it('Stalker: sees a standing hero ahead of it and looks right over one who lies flat', () => {
    expect(inSight(shape('stalker'), seer(), standing(1200))).toBe(true);
    expect(inSight(shape('stalker'), seer(), lying(1200))).toBe(false);
    expect(inSight(shape('stalker'), seer(), lying(1060))).toBe(false);
    // Only ahead, and only as far as it can see.
    expect(inSight(shape('stalker'), seer(), standing(800))).toBe(false);
    expect(inSight(shape('stalker'), seer({ facing: -1 }), standing(800))).toBe(true);
    expect(inSight(shape('stalker'), seer(), standing(1500))).toBe(false);
  });

  it('Crawler: sees along the ground, so lying down does not fool it but being in the air does', () => {
    expect(inSight(shape('crawler'), seer(), standing(1200))).toBe(true);
    expect(inSight(shape('crawler'), seer(), lying(1200))).toBe(true);
    expect(inSight(shape('crawler'), seer(), standing(1200, 80))).toBe(false);
    expect(inSight(shape('crawler'), seer(), standing(900))).toBe(false);
  });

  it('Flyer: sees what is beneath it, standing or lying, unless he is under a roof', () => {
    const above = seer({ y: G - 128 });
    expect(inSight(shape('flyer'), above, standing(1010))).toBe(true);
    expect(inSight(shape('flyer'), above, lying(1040))).toBe(true);
    expect(inSight(shape('flyer'), above, { ...standing(1010), roofed: true })).toBe(false);
    // Not far to the side, whichever way it faces.
    expect(inSight(shape('flyer'), above, standing(1300))).toBe(false);
    expect(inSight(shape('flyer'), seer({ y: G - 128, facing: -1 }), standing(1010))).toBe(true);
  });

  it('Thorn: senses both ways, at every height, within its range', () => {
    expect(inSight(shape('thorn'), seer(), standing(1300))).toBe(true);
    expect(inSight(shape('thorn'), seer(), lying(700))).toBe(true);
    expect(inSight(shape('thorn'), seer(), standing(1400))).toBe(false);
  });

  it('gives the outline of every shape, for drawing', () => {
    expect(sightPolygons(shape('stalker'), seer(), G)).toHaveLength(1);
    expect(sightPolygons(shape('thorn'), seer(), G)).toHaveLength(2);
    const down = sightPolygons(shape('flyer'), seer({ y: G - 128 }), G)[0];
    expect(Math.max(...down.map((point) => point.y))).toBe(G);
    // The Stalker's outline never dips to where a lying hero is.
    const stalker = sightPolygons(shape('stalker'), seer(), G)[0];
    expect(Math.max(...stalker.map((point) => point.y))).toBeLessThan(heroTarget({ x: 0, y: G, centreY: G - 24, lying: true, hidden: false, light: 1 }).top);
  });
});

describe('passing a monster without a weapon', () => {
  const DT = 1 / 60;
  const lit = (x: number, over: Partial<HeroState> = {}): HeroState => ({ x, y: G, centreY: G - 55, lying: false, hidden: false, light: 0.9, ...over });

  it('he crawls right up to a Stalker, in full light, and is never seen or hurt', () => {
    const world = new MonsterWorld([{ kind: 'stalker', x: 1000, minX: 540, maxX: 1460 }]);
    let hurt = false;
    let seen = false;
    // From well in front of it to just short of its body, at crawling speed (bumping into it would hurt).
    const edge = 1000 - world.monsters[0].spec.halfW - 20;
    for (let x = 700; x < edge; x += 70 * DT) {
      const result = world.step(DT, lit(x, { lying: true, centreY: G - 24 }));
      hurt ||= result.hurt;
      seen ||= world.monsters[0].sees;
    }
    expect(seen).toBe(false);
    expect(hurt).toBe(false);
  });

  it('the same walk standing up gets him seen', () => {
    const world = new MonsterWorld([{ kind: 'stalker', x: 1000, minX: 540, maxX: 1460 }]);
    let seen = false;
    for (let x = 700; x < 1000; x += 220 * DT) {
      world.step(DT, lit(x));
      seen ||= world.monsters[0].sees;
    }
    expect(seen).toBe(true);
  });

  it('bumping into a monster always hurts, even one that had not seen him, and then it has him', () => {
    // Amin, 19 Oct: "when I bump into them, the character must be hurt".
    for (const kind of ['crawler', 'stalker', 'flyer', 'thorn', 'watcher'] as const) {
      const world = new MonsterWorld([{ kind, x: 1000, minX: 540, maxX: 1460 }]);
      const m = world.monsters[0];
      // In the dark it sees nothing, but walking into it still costs a petal.
      // A diver is up in the air: he jumps into it.
      const feet = Math.min(G, m.y + 40);
      const result = world.step(DT, lit(m.x, { light: 0.04, y: feet, centreY: feet - 55 }));
      expect(result.hurt, kind).toBe(true);
      if (kind !== 'watcher') expect(m.sees, kind).toBe(true);
    }
  });

  it('lying hidden in cover, a monster passes over him without harm', () => {
    const world = new MonsterWorld([{ kind: 'crawler', x: 1000, minX: 540, maxX: 1460 }]);
    let hurt = false;
    for (let t = 0; t < 2; t += DT) hurt ||= world.step(DT, lit(world.monsters[0].x, { light: 0.04, lying: true, hidden: true, centreY: G - 24 })).hurt;
    expect(hurt).toBe(false);
  });

  it('a jump carries him over a Crawler that is looking for him', () => {
    const crawler = SIGHTS.crawler!;
    expect(inSight(crawler, { x: 1000, y: G, facing: -1 }, standing(940, 70))).toBe(false);
  });
});
