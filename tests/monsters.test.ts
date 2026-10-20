import { describe, expect, it } from 'vitest';
import { GROUND_Y, WATCHER } from '../src/game/config';
import { makeBurst, stepBlooms } from '../src/game/flowers';
import { MONSTERS, MonsterWorld, type HeroState, type Monster, type StepResult, SENSE } from '../src/game/monsters';
import type { Enemy } from '../src/settings/schema';

const DT = 1 / 60;

function world(kind: Enemy, x = 1000): { world: MonsterWorld; m: Monster } {
  const w = new MonsterWorld([{ kind, x, minX: x - 460, maxX: x + 460 }]);
  return { world: w, m: w.monsters[0] };
}

/** The hero standing at `x`. Lit unless told otherwise. */
function hero(x: number, over: Partial<HeroState> = {}): HeroState {
  return { x, y: GROUND_Y, centreY: GROUND_Y - 55, lying: false, hidden: false, light: 0.8, ...over };
}

/** Run for some seconds. Reports if he was hurt, and every sound made. */
function run(w: MonsterWorld, seconds: number, at: HeroState | (() => HeroState)): { hurt: boolean; sounds: string[]; last: StepResult } {
  let hurt = false;
  const sounds: string[] = [];
  let last!: StepResult;
  for (let t = 0; t < seconds; t += DT) {
    last = w.step(DT, typeof at === 'function' ? at() : at);
    hurt ||= last.hurt;
    sounds.push(...last.sounds);
  }
  return { hurt, sounds, last };
}

/** A blade zone wide enough to reach a monster. */
const zoneAt = (m: Monster) => ({ x0: m.x - 40, x1: m.x + 40, y0: m.y - 125, y1: m.y + 5 });

describe('hit counts (brief 3.6)', () => {
  it('Crawler and Flyer 1, Thorn and Stalker 2, Watcher 3', () => {
    expect(MONSTERS.crawler.hits).toBe(1);
    expect(MONSTERS.flyer.hits).toBe(1);
    expect(MONSTERS.thorn.hits).toBe(2);
    expect(MONSTERS.stalker.hits).toBe(2);
    expect(MONSTERS.watcher.hits).toBe(3);
  });

  it('takes that many strikes to defeat each one, one hit per strike', () => {
    for (const kind of ['crawler', 'thorn', 'stalker', 'watcher'] as Enemy[]) {
      const { world: w, m } = world(kind);
      for (let strike = 1; strike <= m.spec.hits; strike++) {
        expect(m.alive).toBe(true);
        w.strike(zoneAt(m), false, strike, 1);
        w.strike(zoneAt(m), false, strike, 1); // the same swing does not count twice
      }
      expect(m.alive).toBe(false);
    }
  });

  it('a sneak attack defeats even the Watcher in one hit', () => {
    const { world: w, m } = world('watcher');
    w.strike(zoneAt(m), true, 1, 1);
    expect(m.alive).toBe(false);
  });

  it('a strike that does not reach it does nothing', () => {
    const { world: w, m } = world('crawler');
    expect(w.strike({ x0: 0, x1: 100, y0: 0, y1: 400 }, false, 1, 1)).toEqual([]);
    expect(m.alive).toBe(true);
  });
});

describe('Crawler', () => {
  it('charges when it sees him and hurts him', () => {
    const { world: w, m } = world('crawler');
    const result = run(w, 2, hero(800));
    expect(result.sounds).toContain('charge');
    expect(result.hurt).toBe(true);
    expect(m.x).toBeLessThan(900);
  });

  it('in the dark, close by, it still finds him within a few seconds (Amin, 19 Oct)', () => {
    const { world: w, m } = world('crawler');
    run(w, SENSE.time + 0.2, hero(1000 - SENSE.range + 40, { light: 0.04 }));
    expect(m.sees).toBe(true);
  });

  it('keeps to its patch when he is in the dark and not close', () => {
    const { world: w, m } = world('crawler');
    // Beyond where its patrol and its senses reach.
    const result = run(w, 6, hero(1000 - 111 - SENSE.range - 30, { light: 0.04 }));
    expect(result.hurt).toBe(false);
    expect(m.sees).toBe(false);
    expect(Math.abs(m.x - 1000)).toBeLessThanOrEqual(111);
  });

  it('does not see him when he is hidden, even next to it', () => {
    const { world: w, m } = world('crawler');
    const result = run(w, 1, hero(900, { hidden: true, lying: true, light: 0.1 }));
    expect(m.sees).toBe(false);
    expect(result.sounds).not.toContain('charge');
  });

  it('gives up a charge it has not begun when he hides', () => {
    const { world: w, m } = world('crawler');
    // It needs a moment to be sure of him (NOTICE), then winds up.
    run(w, 1, hero(800));
    expect(m.state).toBe('windup');
    run(w, 0.1, hero(800, { hidden: true, lying: true }));
    expect(m.state).toBe('idle');
  });
});

describe('Thorn', () => {
  it('stays in place and spits when he is lit and in range', () => {
    const { world: w, m } = world('thorn');
    const result = run(w, 3, hero(760));
    expect(m.x).toBe(1000);
    expect(result.sounds).toContain('spit');
    expect(result.hurt).toBe(true);
  });

  it('does not spit when he is out of range or in the dark', () => {
    const far = world('thorn');
    expect(run(far.world, 3, hero(1000 - MONSTERS.thorn.sight - 20)).sounds).toEqual([]);
    const dark = world('thorn');
    expect(run(dark.world, 3, hero(1000 - SENSE.range - 20, { light: 0.2 })).sounds).toEqual([]);
  });

  it('his blade knocks a thorn out of the air', () => {
    const { world: w } = world('thorn');
    while (w.shots.length === 0) w.step(DT, hero(760));
    const shot = w.shots[0];
    w.strike({ x0: shot.x - 20, x1: shot.x + 20, y0: shot.y - 20, y1: shot.y + 20 }, false, 1, 1);
    w.step(DT, hero(760));
    expect(w.shots).toHaveLength(0);
  });
});

describe('Flyer', () => {
  it('hovers above his head until it sees him, then swoops down to him', () => {
    const { world: w, m } = world('flyer');
    run(w, 2, hero(1000, { light: 0.04 }));
    expect(m.y).toBeLessThan(GROUND_Y - 100);
    // It looks down, so it has to drift over him first.
    const result = run(w, 8, hero(1000));
    expect(result.sounds).toContain('swoop');
    expect(result.hurt).toBe(true);
  });

  it('does not see him under a roof, and does not see him far to one side', () => {
    const roofed = world('flyer');
    expect(run(roofed.world, 8, hero(1000, { roofed: true })).sounds).not.toContain('alert');
    const aside = world('flyer');
    expect(run(aside.world, 8, hero(1000 + 90 + SENSE.range + 30)).sounds).not.toContain('alert');
  });

  it('dives to where he stood when it flashed, so stepping aside dodges it (19 Oct: a diver, not a swooper)', () => {
    const { world: w, m } = world('flyer');
    let t = 0;
    let dived = false;
    // Only its first dive: afterwards it is hunting him and comes back for him.
    let landed = false;
    const result = run(w, 4, () => {
      t += 1 / 60;
      if (m.state === 'attack') dived = true;
      if (m.state === 'rest') landed = true;
      if (landed) return hero(3000, { light: 0 });
      // Seen right under it; once it commits, he steps well away.
      return hero(dived ? 1000 + SENSE.range + 20 : 1000);
    });
    expect(result.sounds).toContain('swoop');
    expect(result.hurt).toBe(false);
  });

  it('lies stuck on the ground after its dive, harmless and open to a strike', () => {
    const { world: w, m } = world('flyer');
    let landed = false;
    run(w, 4, () => {
      if (m.state === 'rest') landed = true;
      return hero(1000);
    });
    expect(landed).toBe(true);
    w.monsters[0].state = 'rest';
    w.monsters[0].y = GROUND_Y;
    const hits = w.strike({ x0: m.x - 30, x1: m.x + 30, y0: GROUND_Y - 60, y1: GROUND_Y }, false, 77, 1);
    expect(hits).toHaveLength(1);
    expect(m.alive).toBe(false);
  });
});

describe('Stalker', () => {
  it('walks slowly towards him and reaches him from far off', () => {
    const { world: w, m } = world('stalker');
    const result = run(w, 6, hero(760));
    expect(result.sounds).toContain('swipe');
    expect(result.hurt).toBe(true);
    expect(m.x).toBeLessThan(1000);
    // It hit him without touching him: that is the long reach.
    expect(m.x - 760).toBeGreaterThan(60);
  });

  it('stops following when it loses him', () => {
    const { world: w, m } = world('stalker');
    run(w, 1, hero(700));
    expect(m.state).toBe('walk');
    run(w, 0.1, hero(700, { light: 0.04 }));
    expect(m.state).toBe('idle');
  });
});

describe('Watcher', () => {
  // It starts looking left, so a hero on its left stands in its beam.
  const inLight = () => hero(880, { light: 0.04 });

  it('lights him with its beam, even in the dark', () => {
    const { world: w } = world('watcher');
    const { last } = run(w, 0.1, inLight());
    expect(last.exposed).toBe(true);
    expect(last.light).toBe(WATCHER.beamLight);
  });

  it('takes a petal after five seconds in its beam, with ticks that speed up', () => {
    const { world: w, m } = world('watcher');
    const early = run(w, 4.9, inLight());
    expect(early.hurt).toBe(false);
    expect(m.gaze).toBeGreaterThan(4.8);
    const late = run(w, 0.2, inLight());
    expect(late.hurt).toBe(true);
    const ticks = early.sounds.filter((sound) => sound === 'tick').length;
    expect(ticks).toBeGreaterThan(8);
  });

  it('stops the countdown when he hides', () => {
    const { world: w, m } = world('watcher');
    run(w, 3, inLight());
    const result = run(w, 4, hero(880, { light: 0.04, hidden: true, lying: true }));
    expect(result.hurt).toBe(false);
    expect(m.gaze).toBe(0);
    expect(result.last.exposed).toBe(false);
  });

  it('stops the countdown when he leaves the beam', () => {
    const { world: w, m } = world('watcher');
    run(w, 3, inLight());
    const result = run(w, 1, hero(1000 - WATCHER.range - 60, { light: 0.04 }));
    expect(result.hurt).toBe(false);
    expect(m.gaze).toBe(0);
  });

  it('stops the countdown when he defeats it', () => {
    const { world: w, m } = world('watcher');
    run(w, 4, inLight());
    for (let strike = 1; strike <= 3; strike++) w.strike(zoneAt(m), false, strike, 1);
    expect(m.alive).toBe(false);
    expect(run(w, 3, inLight()).hurt).toBe(false);
  });

  it('does not see behind itself, and keeps looking at him while he is in its beam', () => {
    const behind = world('watcher');
    expect(run(behind.world, 0.5, hero(1120, { light: 0.04 })).last.exposed).toBe(false);
    const held = world('watcher');
    run(held.world, WATCHER.turnEvery - 0.3, inLight());
    expect(held.m.facing).toBe(-1);
  });

  it('other monsters see him by its light', () => {
    const w = new MonsterWorld([
      { kind: 'watcher', x: 1000, minX: 540, maxX: 1460 },
      { kind: 'crawler', x: 700, minX: 240, maxX: 1160 },
    ]);
    // The Crawler has to be looking his way: its eyes only see ahead.
    w.monsters[1].facing = 1;
    run(w, 1.4, inLight());
    expect(w.monsters[1].sees).toBe(true);
  });
});

describe('flowers', () => {
  const rng = () => 0.5;
  const noPit = () => false;

  it('a defeated monster bursts into its flowers, which land on the ground', () => {
    const blooms = makeBurst(1000, GROUND_Y - 30, MONSTERS.watcher.flowers, rng);
    expect(blooms).toHaveLength(10);
    for (let t = 0; t < 3; t += DT) stepBlooms(blooms, DT, 0, 0, noPit);
    expect(blooms).toHaveLength(10);
    for (const bloom of blooms) expect(bloom.landed).toBe(true);
  });

  it('he picks them up by walking to them', () => {
    const blooms = makeBurst(1000, GROUND_Y - 30, 5, rng);
    for (let t = 0; t < 2; t += DT) stepBlooms(blooms, DT, 0, 0, noPit);
    let picked = 0;
    for (let t = 0; t < 1; t += DT) picked += stepBlooms(blooms, DT, blooms[0]?.x ?? 1000, GROUND_Y - 55, noPit);
    expect(picked).toBe(5);
    expect(blooms).toHaveLength(0);
  });

  it('flowers that fall into a pit are lost', () => {
    const blooms = makeBurst(1000, GROUND_Y - 30, 4, rng);
    for (let t = 0; t < 3; t += DT) stepBlooms(blooms, DT, 0, 0, () => true);
    expect(blooms).toHaveLength(0);
  });
});
