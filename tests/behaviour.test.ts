// How every monster must behave (Amin, 19 Oct: "focus on the functionality of the monsters"), from the design
// research: each has one verb, warns before it acts, can be avoided without the sword, and leaves an opening after.
import { describe, expect, it } from 'vitest';
import { GROUND_Y } from '../src/game/config';
import { MonsterWorld, NOTICE, type HeroState, type Monster } from '../src/game/monsters';
import type { Enemy } from '../src/settings/schema';

const DT = 1 / 60;

function hero(x: number, over: Partial<HeroState> = {}): HeroState {
  return { x, y: GROUND_Y, centreY: GROUND_Y - 55, lying: false, hidden: false, light: 0.8, ...over };
}

function one(kind: Enemy, x = 1000): { w: MonsterWorld; m: Monster } {
  const w = new MonsterWorld([{ kind, x, minX: x - 460, maxX: x + 460 }]);
  return { w, m: w.monsters[0] };
}

/** Run for some seconds with a hero that may react to the monster. Reports when it first wound up and was first hurt. */
function play(w: MonsterWorld, m: Monster, seconds: number, at: (t: number) => HeroState) {
  let t = 0;
  let firstWindup = -1;
  let firstHurt = -1;
  let rests = 0;
  let restLongest = 0;
  let restNow = 0;
  let left = Infinity;
  let right = -Infinity;
  const states: string[] = [];
  for (; t < seconds; t += DT) {
    const r = w.step(DT, at(t));
    if (m.state === 'windup' && firstWindup < 0) firstWindup = t;
    if (r.hurt && firstHurt < 0) firstHurt = t;
    if (m.state === 'rest') {
      if (restNow === 0) rests++;
      restNow += DT;
      restLongest = Math.max(restLongest, restNow);
    } else restNow = 0;
    left = Math.min(left, m.x);
    right = Math.max(right, m.x);
    if (states[states.length - 1] !== m.state) states.push(m.state);
  }
  return { firstWindup, firstHurt, rests, restLongest, left, right, states };
}

const ATTACKERS: Enemy[] = ['crawler', 'thorn', 'flyer', 'stalker'];
/** Where he stands to be in each one's sight: a flyer sees below itself. */
const STAND: Record<Enemy, number> = { crawler: 820, thorn: 860, flyer: 1000, stalker: 880, watcher: 860 };

describe('every monster warns before it acts', () => {
  for (const kind of ATTACKERS) {
    it(`${kind}: a moment of suspicion, then a wind-up of at least 0.35 s before anything can hurt`, () => {
      const { w, m } = one(kind);
      const run = play(w, m, 6, () => hero(STAND[kind]));
      expect(run.firstWindup).toBeGreaterThan(NOTICE.near * 0.9);
      expect(run.firstHurt).toBeGreaterThan(0);
      expect(run.firstHurt - run.firstWindup).toBeGreaterThanOrEqual(0.35);
    });
  }

  it('a short glimpse in the light is forgiven: it turns to look, but does not attack', () => {
    for (const kind of ['crawler', 'stalker'] as Enemy[]) {
      const { w, m } = one(kind);
      const run = play(w, m, 3, (t) => hero(STAND[kind], { hidden: t > 0.2, lying: t > 0.2 }));
      expect(run.firstWindup).toBe(-1);
      expect(m.notice).toBeLessThan(1);
    }
  });

  it('while unsure it holds still, looking at him (it cannot see behind itself)', () => {
    const { w, m } = one('crawler');
    m.facing = -1;
    const x = m.x;
    play(w, m, 0.25, () => hero(800));
    expect(m.facing).toBe(-1);
    expect(Math.abs(m.x - x)).toBeLessThan(2);
    expect(m.notice).toBeGreaterThan(0);
    expect(m.sees).toBe(false);
  });
});

describe('every monster can be avoided without the sword', () => {
  it('charger: hiding as it winds up calls the charge off', () => {
    const { w, m } = one('crawler');
    let wound = -1;
    const run = play(w, m, 6, (t) => {
      if (m.state === 'windup' && wound < 0) wound = t;
      return hero(820, { hidden: wound >= 0, lying: wound >= 0 });
    });
    expect(run.firstHurt).toBe(-1);
  });

  it('spitter: hiding as it aims means no shot comes', () => {
    const { w, m } = one('thorn');
    let aimed = -1;
    const run = play(w, m, 6, (t) => {
      if (m.state === 'windup' && aimed < 0) aimed = t;
      return hero(860, { hidden: aimed >= 0, lying: aimed >= 0 });
    });
    expect(run.firstHurt).toBe(-1);
  });

  it('diver: stepping aside when it flashes, it dives to the empty ground', () => {
    const { w, m } = one('flyer');
    let flashed = false;
    let landed = false;
    // Only its first dive: afterwards it is hunting him and comes back for him, so he leaves.
    const run = play(w, m, 6, () => {
      if (m.state === 'windup') flashed = true;
      if (m.state === 'rest') landed = true;
      return landed ? hero(3000, { light: 0 }) : hero(flashed ? 1200 : 1000);
    });
    expect(run.states).toContain('attack');
    expect(run.firstHurt).toBe(-1);
  });

  it('stalker: lying flat, the swipe passes over him', () => {
    const { w, m } = one('stalker');
    let raised = false;
    const run = play(w, m, 6, () => {
      if (m.state === 'windup') raised = true;
      return hero(900, { lying: raised });
    });
    expect(run.states).toContain('attack');
    expect(run.firstHurt).toBe(-1);
  });

  it('watcher: out of its beam before the five seconds are up, no harm comes', () => {
    const { w, m } = one('watcher');
    m.facing = -1;
    const run = play(w, m, 8, (t) => hero(860, { hidden: t > 3.5, lying: t > 3.5 }));
    expect(run.firstHurt).toBe(-1);
  });
});

describe('every attack leaves an opening, and every monster keeps to its ground', () => {
  for (const kind of ATTACKERS) {
    it(`${kind}: after attacking it recovers for at least half a second, and stays on its stretch`, () => {
      const { w, m } = one(kind);
      const run = play(w, m, 8, () => hero(STAND[kind]));
      expect(run.rests).toBeGreaterThan(0);
      expect(run.restLongest).toBeGreaterThanOrEqual(0.5);
      expect(run.left).toBeGreaterThanOrEqual(m.minX - 0.5);
      expect(run.right).toBeLessThanOrEqual(m.maxX + 0.5);
    });
  }

  it('a strike in that opening counts double', () => {
    const { w, m } = one('stalker');
    m.state = 'rest';
    w.strike({ x0: m.x - 30, x1: m.x + 30, y0: GROUND_Y - 160, y1: GROUND_Y }, false, 9, 1);
    expect(m.alive).toBe(false); // two hits' worth on a stalker that takes two
  });
});

describe('monsters find him and attack quickly (Amin, 19 Oct: "within three to five seconds")', () => {
  for (const kind of ATTACKERS) {
    it(`${kind}: close by, even in the dark and behind it, it attacks within five seconds`, () => {
      const { w, m } = one(kind);
      // Behind its back, in the dark.
      m.facing = 1;
      const run = play(w, m, 5, () => hero(1000 - 150, { light: 0.04 }));
      expect(run.firstWindup).toBeGreaterThan(0);
      expect(run.firstWindup).toBeLessThan(5);
    });
  }
});
