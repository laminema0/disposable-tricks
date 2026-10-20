import { describe, expect, it } from 'vitest';
import { afterGate, chooseSkill, enterStreet, gainXp, leaveStreet, newRun, planChapter, skillAt, takeUpgrade, xpFor } from '../src/game/run';
import { defaultSettings } from '../src/settings/defaults';

describe('the endless run', () => {
  const base = defaultSettings();

  it('makes every chapter harder than the one before', () => {
    const run = newRun(5);
    const one = planChapter(base, run);
    const four = planChapter(base, { ...run, chapter: 4 });
    expect(four.monsters).toBeGreaterThan(one.monsters);
    expect(four.settings.difficulty).toBeGreaterThanOrEqual(one.settings.difficulty);
    expect(four.settings.lightDensity).toBeLessThan(one.settings.lightDensity);
    // Every world's road ends at a boss (Amin, 19 Oct); a detour never has one.
    expect(planChapter(base, { ...run, chapter: 3 }).boss).toBe(true);
    expect(one.boss).toBe(true);
    expect(planChapter(base, { ...run, stage: 'street', returnTo: { x: 900 } }).boss).toBe(false);
  });

  it('gives a skill while playing when the XP reaches the next mark, chosen by the game (SKILLS.md)', () => {
    expect([1, 2, 3, 4].map(skillAt)).toEqual([4, 10, 18, 28]);
    let run = newRun(5);
    const first = gainXp(run, xpFor({ hits: 1 }), 3, 5);
    expect(first.skill).toBeUndefined();
    const second = gainXp(first.run, xpFor({ hits: 2 }), 3, 5);
    expect(second.skill).toBeDefined();
    expect(second.run.upgrades).toHaveLength(1);
    run = takeUpgrade(newRun(5), 'double-jump', 5);
    for (let seed = 0; seed < 40; seed++) expect(chooseSkill(run, seed, 5)).not.toBe('double-jump');
    // Low on petals, full bloom comes first.
    expect(chooseSkill({ ...newRun(5), petals: 1 }, 9, 5)).toBe('bloom');
  });

  it('makes the monsters grow as he gains skills', () => {
    const plain = planChapter(base, newRun(5));
    const grown = planChapter(base, { ...newRun(5), upgrades: ['reach', 'quick', 'power', 'charges', 'reload', 'quiet'] });
    expect(grown.toughness).toBe(2);
    expect(grown.pace).toBeGreaterThan(plain.pace);
    expect(grown.monsters).toBeGreaterThan(plain.monsters);
  });

  it('lets him turn back through the gate he came in by', () => {
    const inside = enterStreet(newRun(5), 1400);
    const out = leaveStreet(inside);
    expect(out.stage).toBe('road');
    expect(out.returnTo?.x).toBe(1400);
    expect(out.streetsDone).toContain(1400);
  });

  it('heals with full bloom and strengthens the weapon with reach', () => {
    const hurt = { ...newRun(5), petals: 2 };
    expect(takeUpgrade(hurt, 'bloom', 5).petals).toBe(5);
    const longer = takeUpgrade(hurt, 'reach', 5);
    expect(planChapter(base, longer).settings.weapon.reach).toBeGreaterThan(base.weapon.reach);
  });

  it('goes into a side street and comes back to the same place on the road', () => {
    const run = newRun(5);
    const inStreet = enterStreet(run, 1400);
    expect(inStreet.stage).toBe('street');
    expect(planChapter(base, inStreet).streets).toBe(0);
    const back = afterGate(inStreet, 2000);
    expect(back.stage).toBe('road');
    expect(back.chapter).toBe(1);
    expect(back.returnTo?.x).toBe(1400);
    expect(back.streetsDone).toContain(1400);
  });

  it('moves on to the next chapter at a road gate, counting the distance', () => {
    const next = afterGate(newRun(5), 5000);
    expect(next.chapter).toBe(2);
    expect(next.distance).toBe(5000);
    expect(next.streetsDone).toEqual([]);
  });
});
