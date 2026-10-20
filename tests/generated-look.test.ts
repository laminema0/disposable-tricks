// Generated monster looks (20 Oct): the server's request for a picture, the cut-out of the creature from it,
// and the game showing our own drawings for creatures we have drawn.
import { describe, expect, it } from 'vitest';
import { handleLook, lookName, lookPrompt } from '../server/src/look';
import { silhouetteFrom } from '../src/ai/silhouette';
import { designFor } from '../src/game/creatures';

/** A white picture with black shapes painted in. */
function picture(size: number, paint: (x: number, y: number) => boolean): Uint8ClampedArray {
  const rgba = new Uint8ClampedArray(size * size * 4).fill(255);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!paint(x, y)) continue;
      const i = (y * size + x) * 4;
      rgba[i] = rgba[i + 1] = rgba[i + 2] = 0;
    }
  }
  return rgba;
}

describe('cutting a creature out of a generated picture', () => {
  // A body, with its head raised at the left: it faces left.
  const creature = (x: number, y: number) => (x >= 30 && x < 90 && y >= 50 && y < 80) || (x >= 20 && x < 40 && y >= 30 && y < 50);

  it('keeps the creature, cut to its size, turned so its front is to the right', () => {
    const shape = silhouetteFrom(picture(120, creature), 120, 120)!;
    expect(shape).toBeDefined();
    expect(shape.w).toBe(70 + 4);
    expect(shape.h).toBe(50 + 4);
    // The head was at the left; after turning it is at the right, so the top-right is solid and the top-left is air.
    expect(shape.alpha[(2 + 5) * shape.w + (shape.w - 2 - 5)]).toBe(255);
    expect(shape.alpha[(2 + 5) * shape.w + (2 + 5)]).toBe(0);
    // Its eye is on its head, on the shape.
    expect(shape.eye.x).toBeGreaterThan(shape.w / 2);
    expect(shape.eye.y).toBeLessThan(shape.h / 2);
    expect(shape.alpha[shape.eye.y * shape.w + shape.eye.x]).toBe(255);
  });

  it('drops small specks and soft grey shadows, and fills a painted eye', () => {
    const shape = silhouetteFrom(
      picture(120, (x, y) => (creature(x, y) && !(x >= 25 && x < 28 && y >= 35 && y < 38)) || (x >= 100 && x < 103 && y >= 5 && y < 8)),
      120,
      120,
    )!;
    expect(shape.w).toBe(74);
    // The painted eye hole was filled.
    expect(shape.alpha.filter((a) => a === 0).length).toBeLessThan(shape.w * shape.h);
    const grey = picture(120, creature);
    for (let y = 85; y < 95; y++) for (let x = 20; x < 100; x++) grey.fill(200, (y * 120 + x) * 4, (y * 120 + x) * 4 + 3);
    expect(silhouetteFrom(grey, 120, 120)!.h).toBe(54);
  });

  it('refuses a picture that is not one creature on white', () => {
    expect(silhouetteFrom(picture(60, () => false), 60, 60)).toBeUndefined();
    expect(silhouetteFrom(picture(60, () => true), 60, 60)).toBeUndefined();
  });
});

describe('the server asks for a look', () => {
  it('accepts plain names and refuses unsafe or empty ones', () => {
    expect(lookName('  A Giant  Crab! ')).toBe('a giant crab');
    expect(lookName('Dragón')).toBe('dragon');
    expect(lookName('')).toBeUndefined();
    expect(lookName('x')).toBeUndefined();
    expect(lookName('naked monster')).toBeUndefined();
    expect(lookName('a'.repeat(60))).toBeUndefined();
    expect(lookPrompt('kraken')).toMatch(/black silhouette of a menacing kraken/);
  });

  const post = (body: unknown) => new Request('https://x.test/api/look', { method: 'POST', body: JSON.stringify(body) });

  it('answers with the picture, and says when it cannot', async () => {
    let asked = '';
    const fake = (async (_url: string, init: RequestInit) => {
      asked = JSON.parse(String(init.body)).prompt;
      return new Response(JSON.stringify({ result: { image: 'A'.repeat(2000) } }));
    }) as unknown as typeof fetch;
    const env = { CLOUDFLARE_ACCOUNT_ID: 'acc', CLOUDFLARE_API_TOKEN: 'tok' };
    const ok = await (await handleLook(post({ name: 'Kraken' }), env, fake, 1)).json();
    expect(ok.ok).toBe(true);
    expect(ok.image).toMatch(/^data:image\/jpeg;base64,/);
    expect(asked).toMatch(/kraken/);
    expect((await handleLook(post({ name: 'naked' }), env, fake, 2)).status).toBe(400);
    expect((await (await handleLook(post({ name: 'kraken' }), {}, fake, 3)).json()).reason).toBe('unavailable');
    const broken = (async () => new Response('{}', { status: 500 })) as unknown as typeof fetch;
    expect((await (await handleLook(post({ name: 'golem' }), env, broken, 4)).json()).ok).toBe(false);
  });
});

describe('creatures we have drawn are shown as our drawings', () => {
  it('a written-in dragon is our dragon drawing, not a figure built from parts', () => {
    const dragon = designFor({ name: 'Dragon', body: 'flying', move: 'fly', attack: 'swoop', size: 1.2, speed: 1, hits: 2, eyes: 2 });
    expect(dragon.figure).toBeUndefined();
    // Something we have no drawing for (and no look yet) is built from parts until its look arrives.
    const umbrella = designFor({ name: 'Umbrella beast', body: 'low', move: 'walk', attack: 'charge', size: 1, speed: 1, hits: 1, eyes: 2 });
    expect(umbrella.figure).toBeDefined();
  });
});

describe('a name finds our drawing by the thing it names', async () => {
  const { beastFor } = await import('../src/game/beasts');
  it('describing words do not pick the drawing', () => {
    expect(beastFor('Giant snail')).toBeUndefined();
    expect(beastFor('a giant')?.key).toBe(beastFor('troll')?.key);
    expect(beastFor('Stone giant')?.key).toBe(beastFor('troll')?.key);
    expect(beastFor('Fire demon')?.key).toBe(beastFor('demon')?.key);
    expect(beastFor('rock monster')?.key).toBe(beastFor('golem')?.key);
    expect(beastFor('Dragon')).toBeDefined();
    expect(beastFor('Unicorn')).toBeUndefined();
  });
});

describe('weapons get generated looks too (20 Oct)', async () => {
  const { upright } = await import('../src/ai/silhouette');
  const { lookPrompts } = await import('../server/src/look');
  const { isOurWeapon } = await import('../src/game/generated');
  it('a weapon stands upright with its heavier end at the top', () => {
    // A lying shape: a heavy head on the right, a thin handle on the left.
    const w = 40;
    const h = 10;
    const alpha = new Uint8ClampedArray(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (x >= 28 || (y >= 4 && y < 6)) alpha[y * w + x] = 255;
    const up = upright({ w, h, alpha, eye: { x: 0, y: 0 } });
    expect(up.h).toBe(40);
    expect(up.w).toBe(10);
    const topRows = up.alpha.slice(0, 10 * 10).filter((a) => a > 0).length;
    const bottomRows = up.alpha.slice(30 * 10).filter((a) => a > 0).length;
    expect(topRows).toBeGreaterThan(bottomRows);
  });
  it('asks for a weapon in gentler words when the first are refused', () => {
    const prompts = lookPrompts('banana', 'weapon');
    expect(prompts.length).toBeGreaterThanOrEqual(2);
    expect(prompts[1]).toMatch(/road sign symbol/);
    expect(lookPrompts('banana')[1]).toMatch(/monster with legs and eyes/);
  });
  it('only weapons we have not drawn are generated', () => {
    expect(isOurWeapon({ name: 'Sword', kind: 'melee', look: 'sword', reach: 70, speed: 1, power: 1 })).toBe(true);
    expect(isOurWeapon({ name: 'Banana', kind: 'thrown', look: 'sling', reach: 200, speed: 1, power: 1 })).toBe(false);
  });
});
