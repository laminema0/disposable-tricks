import { describe, expect, it } from 'vitest';
import { runTrick } from '../server/src/trickVm';
import { checkTrick } from '../src/trick/check';
import { nearestStarter, STARTERS } from '../src/trick/starters';

describe('the starters: complete small games of our own', () => {
  it('there are six, each with a card that fits', () => {
    expect(STARTERS.map((starter) => starter.id)).toEqual(['road', 'flying', 'space', 'puzzle', 'catch', 'stage']);
    for (const starter of STARTERS) {
      expect(starter.label.length, starter.id).toBeLessThanOrEqual(18);
      expect(starter.detail.length, starter.id).toBeLessThanOrEqual(28);
    }
  });

  for (const starter of STARTERS) {
    it(`"${starter.id}" passes the same check and test run as a game the AI writes`, () => {
      expect(checkTrick(starter.code), starter.id).toMatchObject({ ok: true });
      for (const seed of [1, 7, 99]) expect(runTrick(starter.code, seed), `${starter.id} seed ${seed}`).toEqual({ ok: true, message: '' });
    });
  }

  it('every starter shows the boy with his flower', () => {
    for (const starter of STARTERS) expect(starter.code, starter.id).toContain('game.hero(');
  });

  it('a wish is matched to the nearest starter', () => {
    expect(nearestStarter('flying cars').id).toBe('flying');
    expect(nearestStarter('ride a bike on a road').id).toBe('road');
    expect(nearestStarter('drive a car and shoot from it').id).toBe('road');
    expect(nearestStarter('a simple puzzle with boxes to push').id).toBe('puzzle');
    expect(nearestStarter('space shooter').id).toBe('space');
    expect(nearestStarter('catch falling flowers in a basket').id).toBe('catch');
    expect(nearestStarter('something completely different').id).toBe('stage');
  });
});

describe('the playability check', () => {
  const moving = 'var b = game.add({ x: 400, y: 300, w: 20, h: 20, vx: 30 });';

  it('fails a game where what the player does changes nothing', () => {
    const run = runTrick(`${moving} game.onUpdate(function (dt) { game.score += 1; });`);
    expect(run.ok).toBe(false);
    expect(run.message).toContain('What the player does changes nothing');
  });

  it('fails a game where nothing can be scored, won or lost', () => {
    const run = runTrick(`${moving} game.onUpdate(function (dt) { if (game.input.left) b.x -= 200 * dt; if (game.input.right) b.x += 200 * dt; });`);
    expect(run.ok).toBe(false);
    expect(run.message).toContain('nothing was scored');
  });

  it('passes a small game that can be played and scored', () => {
    const run = runTrick(
      `${moving} var goal = game.add({ x: 600, y: 300, w: 30, h: 30, color: "accent" });
       game.onUpdate(function (dt) { if (game.input.left) b.x -= 200 * dt; if (game.input.right) b.x += 200 * dt; if (game.hits(b, goal)) { game.score += 1; goal.x = 100 + game.random() * 600; } });`,
    );
    expect(run).toEqual({ ok: true, message: '' });
  });
});
