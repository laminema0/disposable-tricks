// The story told in words (Amin, 19 Oct): taunts and answers, the boss's talk, and its warning as it dies.
import { describe, expect, it } from 'vitest';
import { bossAlone, bossDeath, bossIntro, bossName, dyingLine, soldierCount, taunt } from '../src/game/dialogue';
import { ENEMIES } from '../src/settings/schema';
import { GROUND_Y } from '../src/game/config';
import { MonsterWorld } from '../src/game/monsters';

describe('dialogue', () => {
  it('every monster kind taunts, and he answers', () => {
    for (const kind of ENEMIES) {
      const [them, him] = taunt(kind, 1);
      expect(them.who).toBe('monster');
      expect(him.who).toBe('hero');
      expect(them.text.length).toBeGreaterThan(5);
    }
  });

  it('each world has its own boss, who talks, calls soldiers, and warns of more as it dies', () => {
    expect(bossName(1)).not.toBe(bossName(2));
    const intro = bossIntro(1);
    expect(intro[0].who).toBe('boss');
    expect(intro.some((l) => l.who === 'hero')).toBe(true);
    expect(intro[intro.length - 1].text).toMatch(/soldiers/);
    expect(bossAlone(1)[0].who).toBe('boss');
    const death = bossDeath(2);
    expect(death.map((l) => l.text).join(' ')).toMatch(/sisters|brothers|elders|deep/);
    expect(death[death.length - 1].who).toBe('hero');
    expect(dyingLine(1).length).toBeGreaterThan(5);
  });

  it('lines stay short enough to read in a moment', () => {
    const all = [...ENEMIES.flatMap((k) => [1, 2, 3].flatMap((c) => taunt(k, c))), ...[1, 2, 3, 4, 5].flatMap((c) => [...bossIntro(c), ...bossAlone(c), ...bossDeath(c)])];
    for (const line of all) expect(line.text.length, line.text).toBeLessThanOrEqual(60);
  });

  it('more soldiers in later worlds, never more than six', () => {
    expect(soldierCount(1)).toBe(3);
    expect(soldierCount(9)).toBe(6);
  });
});

describe('a boss calls its soldiers', () => {
  it('summoned monsters join the world and hunt; a waiting boss keeps its eye shut', () => {
    const w = new MonsterWorld([{ kind: 'crawler', x: 1000, minX: 600, maxX: 1400 }]);
    const added = w.summon([{ kind: 'stalker', x: 1200, minX: 900, maxX: 1500 }]);
    expect(w.monsters).toHaveLength(2);
    expect(added[0].kind).toBe('stalker');
    expect(added[0].id).toBe(1);
  });
});

describe('bumping a resting monster (Amin, 19 Oct)', () => {
  it('only pushes him back, no petal lost', () => {
    const w = new MonsterWorld([{ kind: 'crawler', x: 1000, minX: 600, maxX: 1400 }]);
    const m = w.monsters[0];
    m.state = 'rest';
    m.t = 0;
    const r = w.step(1 / 60, { x: 1000 - 10, y: GROUND_Y, centreY: GROUND_Y - 55, lying: false, hidden: false, light: 0.8 });
    expect(r.hurt).toBe(false);
    expect(r.push).toBe(-1);
  });
});
