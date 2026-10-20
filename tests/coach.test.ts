import { describe, expect, it } from 'vitest';
import { hintLine, nextHint, type CoachState, type HintKey } from '../src/game/coach';

const calm: CoachState = {
  time: 10,
  touch: true,
  armed: true,
  pitAhead: false,
  hideAhead: undefined,
  lying: false,
  monsterNear: false,
  seen: false,
  beam: false,
};

describe('coach', () => {
  it('says the goal once, at the start', () => {
    expect(nextHint({ ...calm, time: 1 }, new Set())).toBe('goal');
    expect(nextHint({ ...calm, time: 1 }, new Set<HintKey>(['goal']))).toBeUndefined();
    expect(nextHint({ ...calm, time: 20 }, new Set())).toBeUndefined();
  });

  it('puts danger before teaching', () => {
    expect(nextHint({ ...calm, time: 1, beam: true, monsterNear: true }, new Set())).toBe('beam');
    expect(nextHint({ ...calm, seen: true, pitAhead: true }, new Set())).toBe('seen');
  });

  it('teaches striking only to an armed hero, and hiding only while standing', () => {
    expect(nextHint({ ...calm, monsterNear: true }, new Set())).toBe('strike');
    expect(nextHint({ ...calm, armed: false, monsterNear: true }, new Set())).toBe('unarmed');
    expect(nextHint({ ...calm, hideAhead: 'grass', lying: true }, new Set())).toBeUndefined();
    expect(nextHint({ ...calm, hideAhead: 'grass' }, new Set())).toBe('hide');
  });

  it('words a hint for the hand that plays', () => {
    expect(hintLine('jump', true)).toContain('Drag up');
    expect(hintLine('jump', false)).toContain('W');
  });
});
