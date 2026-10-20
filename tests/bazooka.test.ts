import { describe, expect, it } from 'vitest';
import { readStepWish } from '../src/ai/wish';
import { repairWeapon } from '../src/settings/validate';

describe('a bazooka is a bazooka', () => {
  it('is read from the word, however it is spelled', () => {
    for (const word of ['a bazooka', 'bazoka', 'a rocket launcher', 'an RPG']) {
      const weapon = readStepWish('weapon', word)?.weapon;
      expect(weapon?.look, word).toBe('launcher');
      expect(weapon?.kind, word).toBe('ranged');
    }
  });

  it('is mended when the AI made it a sword (Amin, 17 Oct)', () => {
    const weapon = repairWeapon({ name: 'Bazoka', kind: 'melee', look: 'sword', reach: 100, speed: 1, power: 1 });
    expect(weapon).toMatchObject({ name: 'Bazooka', kind: 'ranged', look: 'launcher' });
  });
});
