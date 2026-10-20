import { describe, expect, it } from 'vitest';
import { HEALTH, WATCHER } from '../src/game/config';
import {
  collectFlower,
  hitsAfterStrike,
  hurt,
  isSneakAttack,
  monsterSees,
  newHealth,
  pupilSize,
  stepGaze,
  tickGap,
  tickHealth,
} from '../src/game/rules';

describe('sight', () => {
  const near = { distance: 100, range: 300 };

  it('sees him when he is lit above 0.35, not hidden and in range', () => {
    expect(monsterSees({ light: 0.5, hidden: false, ...near })).toBe(true);
  });

  it('does not see him in the dark', () => {
    expect(monsterSees({ light: 0.35, hidden: false, ...near })).toBe(false);
    expect(monsterSees({ light: 0.04, hidden: false, ...near })).toBe(false);
  });

  it('loses him the moment he hides, even in bright light', () => {
    expect(monsterSees({ light: 0.9, hidden: true, ...near })).toBe(false);
  });

  it('does not see further than its range, on either side', () => {
    expect(monsterSees({ light: 0.9, hidden: false, distance: 301, range: 300 })).toBe(false);
    expect(monsterSees({ light: 0.9, hidden: false, distance: -301, range: 300 })).toBe(false);
    expect(monsterSees({ light: 0.9, hidden: false, distance: -300, range: 300 })).toBe(true);
  });
});

describe('hearts', () => {
  it('starts with five petals', () => {
    expect(newHealth()).toEqual({ petals: 5, flowers: 0, safe: 0 });
  });

  it('a hit removes one petal and gives a moment of safety', () => {
    const after = hurt(newHealth());
    expect(after.petals).toBe(4);
    expect(after.safe).toBe(HEALTH.safeTime);
  });

  it('a second hit during the safe second does nothing', () => {
    const once = hurt(newHealth());
    expect(hurt(once)).toBe(once);
    const later = tickHealth(once, 0.6);
    expect(hurt(later).petals).toBe(4);
  });

  it('can be hurt again once the safe moment has passed', () => {
    const later = tickHealth(hurt(newHealth()), HEALTH.safeTime);
    expect(later.safe).toBe(0);
    expect(hurt(later).petals).toBe(3);
  });

  it('five hits end the run and a sixth changes nothing', () => {
    let health = newHealth();
    for (let i = 0; i < 5; i++) health = hurt(tickHealth(health, HEALTH.safeTime));
    expect(health.petals).toBe(0);
    expect(hurt(tickHealth(health, HEALTH.safeTime)).petals).toBe(0);
  });

  it('ten flowers regrow a petal', () => {
    let health = hurt(newHealth());
    for (let i = 0; i < 9; i++) health = collectFlower(health);
    expect(health).toMatchObject({ petals: 4, flowers: 9 });
    health = collectFlower(health);
    expect(health).toMatchObject({ petals: 5, flowers: 0 });
  });

  it('never grows more than five petals; spare flowers wait for the next loss', () => {
    let health = newHealth();
    for (let i = 0; i < 25; i++) health = collectFlower(health);
    expect(health).toMatchObject({ petals: HEALTH.petals, flowers: 9 });
    health = collectFlower(hurt(health));
    expect(health).toMatchObject({ petals: 5, flowers: 0 });
  });

  it('the fast flowers twist needs only five', () => {
    let health = hurt(newHealth());
    for (let i = 0; i < 5; i++) health = collectFlower(health, HEALTH.flowersPerPetalFast);
    expect(health.petals).toBe(5);
  });
});

describe('fighting', () => {
  it('a strike takes one hit off', () => {
    expect(hitsAfterStrike(3, false)).toBe(2);
    expect(hitsAfterStrike(1, false)).toBe(0);
  });

  it('a strike from hiding defeats in one hit, whatever the monster', () => {
    expect(hitsAfterStrike(3, true)).toBe(0);
  });

  it('counts as a sneak attack up to half a second after being hidden', () => {
    expect(isSneakAttack(0)).toBe(true);
    expect(isSneakAttack(0.5)).toBe(true);
    expect(isSneakAttack(0.51)).toBe(false);
    expect(isSneakAttack(Infinity)).toBe(false);
  });
});

describe("the Watcher's countdown", () => {
  it('runs for five seconds while he is exposed, then costs a petal and starts again', () => {
    let time = 0;
    let expired = 0;
    for (let i = 0; i < 49; i++) {
      const gaze = stepGaze(time, true, 0.1);
      time = gaze.time;
      if (gaze.expired) expired++;
    }
    expect(expired).toBe(0);
    expect(time).toBeCloseTo(4.9);
    const last = stepGaze(time, true, 0.11);
    expect(last).toEqual({ time: 0, expired: true });
  });

  it('stops and resets the moment he leaves the beam or hides', () => {
    expect(stepGaze(4.2, false, 0.1)).toEqual({ time: 0, expired: false });
  });

  it('shows in the pupil, which shrinks, and in the ticks, which speed up', () => {
    expect(pupilSize(0)).toBe(1);
    expect(pupilSize(2.5)).toBeLessThan(pupilSize(1));
    expect(pupilSize(WATCHER.countdown)).toBeCloseTo(0.2);
    expect(tickGap(0)).toBe(WATCHER.tickSlow);
    expect(tickGap(4)).toBeLessThan(tickGap(1));
    expect(tickGap(WATCHER.countdown)).toBeCloseTo(WATCHER.tickFast);
  });
});
