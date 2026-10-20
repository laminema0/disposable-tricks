import { describe, expect, it } from 'vitest';
import { readStepWish, readWish } from '../src/ai/wish';
import { GROUND_Y } from '../src/game/config';
import { brainFor, designFor, lookOf, mixedCreature } from '../src/game/creatures';
import { MonsterWorld, type HeroState } from '../src/game/monsters';
import { placeMonsters } from '../src/game/placement';
import { buildLevel } from '../src/game/level';
import { layoutScenery } from '../src/game/scenery';
import { SIGHTS } from '../src/game/sight';
import { applyPatch, premadeCards, repairPatch, understood } from '../src/settings/options';
import type { Creature } from '../src/settings/schema';
import { decodeSettings, encodeSettings } from '../src/settings/share';
import { repairCreature, repairRecipe, repairSettings } from '../src/settings/validate';

const creature = (over: Partial<Creature> = {}): Creature => ({ name: 'Thing', body: 'low', move: 'walk', attack: 'charge', size: 1, speed: 1, hits: 1, eyes: 2, ...over });

describe('a recipe: a silhouette from simple shapes', () => {
  it('keeps known shapes with whole numbers inside the square, twelve at most', () => {
    const recipe = repairRecipe({
      name: 'windmill <b>',
      parts: [
        { t: 'box', x: 0, y: 0, w: 20.4, h: 60 },
        { t: 'circle', x: 20.2, y: -5, w: 30 },
        { t: 'tri', x: 0, y: 60, w: 30, h: 20 },
        { t: 'line', x: 0, y: 70, w: 40, h: 30 },
        { t: 'polygon', points: [1, 2, 3] },
        { t: 'box', x: 0, y: 0, w: 10, h: 0 },
        'junk',
      ],
    });
    expect(recipe).toEqual({
      name: 'Windmill b',
      parts: [
        { t: 'box', x: 0, y: 0, w: 20, h: 60 },
        { t: 'circle', x: 20, y: 0, w: 30, h: 0 },
        { t: 'tri', x: 0, y: 60, w: 30, h: 20 },
        { t: 'line', x: 0, y: 70, w: 40, h: 30 },
      ],
    });
    // A drawing that spills out of the square is shrunk until it fits.
    expect(repairRecipe({ parts: [{ t: 'circle', x: 0, y: 0, w: 100 }, { t: 'tri', x: 0, y: 100, w: 50, h: 100 }] })?.parts).toEqual([
      { t: 'circle', x: 0, y: 0, w: 50, h: 0 },
      { t: 'tri', x: 0, y: 50, w: 25, h: 50 },
    ]);
    expect(repairRecipe({ parts: Array.from({ length: 40 }, () => ({ t: 'box', x: 0, y: 0, w: 5, h: 5 })) })?.parts).toHaveLength(12);
    expect(repairRecipe({ parts: [{ t: 'script', src: 'x' }] })).toBeUndefined();
    expect(repairRecipe('<svg onload=alert(1)>')).toBeUndefined();
  });

  it('stands as custom scenery, and falls away when its recipe is broken', () => {
    const windmill = { name: 'Windmill', parts: [{ t: 'box', x: 0, y: 0, w: 20, h: 60 }] };
    const game = repairSettings({ scenery: [{ kind: 'custom', amount: 0.5, size: 1, recipe: windmill }, { kind: 'custom', recipe: 'nope' }, 'trees'] });
    expect(game.scenery.map((piece) => piece.kind)).toEqual(['custom', 'trees']);
    expect(layoutScenery(1, game.scenery, 8000).some((item) => item.kind === 'custom' && item.recipe?.name === 'Windmill')).toBe(true);
    expect(decodeSettings(encodeSettings(game))).toEqual(game);
  });
});

describe('a described monster', () => {
  it('is built from blocks, with every number capped', () => {
    expect(repairCreature({ name: 'sky eel', body: 'tall', move: 'float', attack: 'spit', size: 9, speed: 0, hits: 99, eyes: 12 })).toEqual({
      name: 'Sky eel',
      body: 'flying',
      move: 'float',
      attack: 'spit',
      size: 1.5,
      speed: 0.6,
      hits: 3,
      eyes: 3,
    });
    // One known block is enough; the rest follows from its body.
    expect(repairCreature({ body: 'tall' })).toMatchObject({ body: 'tall', move: 'walk', attack: 'reach', eyes: 2, hits: 1 });
    expect(repairCreature({ name: 'Godzilla', power: 'infinite' })).toBeUndefined();
    expect(repairSettings({ creatures: [{ body: 'low' }, { body: 'low' }, { body: 'low' }, { body: 'low' }, 'x'] }).creatures).toHaveLength(3);
  });

  it('is driven by one of the five behaviours, and its body decides where it looks', () => {
    expect(brainFor(creature({ attack: 'charge' }))).toBe('crawler');
    expect(brainFor(creature({ attack: 'reach' }))).toBe('stalker');
    // A spitter keeps its body's way of moving and spits as it goes; only a rooted one is a thorn (18 Oct).
    expect(brainFor(creature({ move: 'still', attack: 'spit' }))).toBe('thorn');
    expect(brainFor(creature({ move: 'walk', attack: 'spit' }))).toBe('crawler');
    expect(brainFor(creature({ body: 'flying', move: 'fly', attack: 'spit' }))).toBe('flyer');
    expect(designFor(creature({ body: 'flying', move: 'fly', attack: 'spit' })).also).toBe('thorn');
    expect(designFor(creature({ move: 'still', attack: 'spit' })).also).toBeUndefined();
    expect(brainFor(creature({ attack: 'beam' }))).toBe('watcher');
    // In the air, an attack that needs the ground becomes a swoop.
    expect(brainFor(creature({ move: 'float', attack: 'charge' }))).toBe('flyer');

    expect(designFor(creature({ body: 'tall', attack: 'touch' })).sight).toBe(SIGHTS.stalker);
    expect(designFor(creature({ body: 'low' })).sight).toBe(SIGHTS.crawler);
    expect(designFor(creature({ body: 'flying', move: 'fly', attack: 'swoop' })).sight).toBe(SIGHTS.flyer);
    const big = designFor(creature({ body: 'tall', size: 1.5, hits: 3 }));
    expect(big.spec.height).toBe(210);
    expect(big.spec.hits).toBe(3);
    expect(designFor(creature({ move: 'still' })).speed).toBe(0);
  });

  it('always has a silhouette and a place for its eyes', () => {
    for (const body of ['low', 'tall', 'flying'] as const) {
      const look = lookOf(creature({ body }));
      expect(look.recipe.parts.length).toBeGreaterThan(0);
      expect(look.eyeY).toBeGreaterThan(0);
    }
    const own = { name: 'Pole', parts: [{ t: 'box' as const, x: 0, y: 0, w: 10, h: 90 }] };
    expect(lookOf(creature({ recipe: own })).recipe).toBe(own);
    expect(lookOf(creature({ recipe: own })).eyeY).toBeCloseTo(70.2);
  });

  it('takes its place in the level and plays by the same rules: a tall one misses a hero lying flat', () => {
    const tall = creature({ name: 'Loomer', body: 'tall', attack: 'reach' });
    const game = repairSettings({ enemies: [], creatures: [tall], difficulty: 1 });
    const spawns = placeMonsters(buildLevel(game.seed, game), game);
    expect(spawns).toHaveLength(5);
    expect(spawns.every((spawn) => spawn.kind === 'stalker' && spawn.design?.creature?.name === 'Loomer')).toBe(true);

    const world = new MonsterWorld([{ ...spawns[0], x: 1000, minX: 540, maxX: 1460 }]);
    const hero = (over: Partial<HeroState>): HeroState => ({ x: 800, y: GROUND_Y, centreY: GROUND_Y - 55, lying: false, hidden: false, light: 0.9, ...over });
    for (let i = 0; i < 90; i++) world.step(1 / 60, hero({ lying: true }));
    expect(world.monsters[0].sees).toBe(false);
    for (let i = 0; i < 90; i++) world.step(1 / 60, hero({}));
    expect(world.monsters[0].sees).toBe(true);
  });

  it('travels in a share link, recipe and all', () => {
    const game = repairSettings({
      enemies: ['thorn'],
      weather: 'fog',
      creatures: [creature({ name: 'Sky eel', body: 'flying', move: 'float', attack: 'spit', eyes: 3, recipe: { name: 'Eel', parts: [{ t: 'line', x: -30, y: 20, w: 60, h: 10 }, { t: 'circle', x: 32, y: 30, w: 14, h: 0 }] } })],
    });
    expect(decodeSettings(encodeSettings(game))).toEqual(game);
  });
});

describe('monsters in the maker', () => {
  const base = repairSettings({ seed: 11 });

  it('every pack of ours also brings one monster mixed by the seed, so two games differ', () => {
    const cards = premadeCards('monsters', base);
    for (const card of cards) expect(card.patch.creatures).toHaveLength(1);
    expect(mixedCreature(5)).toEqual(mixedCreature(5));
    const names = new Set(Array.from({ length: 30 }, (_, seed) => JSON.stringify(mixedCreature(seed))));
    expect(names.size).toBeGreaterThan(20);
    const played = applyPatch(base, 'monsters', cards[0].patch);
    expect(played.creatures).toHaveLength(1);
    expect(understood('monsters', played)).toContain(played.creatures[0].name);
  });

  it('reads a described monster from an AI answer or from the words themselves', () => {
    const patch = repairPatch('monsters', { enemies: [], creatures: [{ name: 'Lantern Ghost', body: 'flying', move: 'float', attack: 'beam', eyes: 1 }] }, base);
    expect(patch?.creatures?.[0]).toMatchObject({ name: 'Lantern Ghost', attack: 'beam' });
    expect(repairPatch('monsters', { enemies: [], creatures: [{ name: 'Nothing' }] }, base)).toBeUndefined();

    const read = readStepWish('monsters', 'a tall three-eyed thing that floats')?.creatures?.[0];
    expect(read).toMatchObject({ body: 'flying', move: 'float', eyes: 3 });
    expect(readStepWish('monsters', 'slow zombies')?.creatures?.[0]).toMatchObject({ name: 'Zombie', attack: 'reach', speed: 0.7 });
    // "tall buildings" at the world step is not a monster.
    expect(readWish('a town with tall buildings', 'world').map((part) => part.step)).toEqual(['world']);
  });
});

describe('atmosphere and guns', () => {
  const base = repairSettings({ seed: 11 });

  it('reads the air: a mood, the weather, and the kinds of light', () => {
    expect(readStepWish('mood', 'a foggy green swamp')).toEqual({ mood: 'eerie', weather: 'fog' });
    expect(readStepWish('mood', 'rain')).toEqual({ mood: 'calm', weather: 'rain' });
    const patch = repairPatch('mood', { mood: 'eerie', weather: 'fog', lights: ['fireflies', 'torches'], palette: { far: '#ffffff' } }, base);
    expect(patch).toEqual({ mood: 'eerie', weather: 'fog', lights: ['fireflies'] });
    const game = applyPatch(base, 'mood', patch!);
    expect(game.weather).toBe('fog');
    expect(game.lights).toEqual(['fireflies']);
    expect(understood('mood', game)).toBe('Eerie, fog');
    // Picking a plain mood afterwards clears the weather again.
    expect(applyPatch(game, 'mood', { mood: 'calm' }).weather).toBe('none');
  });

  it('takes a readable palette from outside and refuses an unreadable one', () => {
    const swamp = { far: '#0b2a1f', mid: '#12382a', stage: '#030a07', hero: '#7f9a8c', light: '#c8ffd8', accent: '#d9ff5c' };
    expect(repairPatch('mood', { mood: 'eerie', palette: swamp }, base)?.palette).toEqual(swamp);
    // A white stage would hide everything.
    expect(repairPatch('mood', { mood: 'eerie', palette: { ...swamp, stage: '#ffffff' } }, base)?.palette).toBeUndefined();
  });

  it('a gun is a ranged weapon with a quick rate of fire, by any of its names', () => {
    expect(readStepWish('weapon', 'a gun')?.weapon).toMatchObject({ kind: 'ranged', look: 'gun', name: 'Gun' });
    expect(readStepWish('weapon', 'a laser rifle')?.weapon).toMatchObject({ kind: 'ranged', look: 'rifle' });
    expect(repairPatch('weapon', { weapon: { kind: 'ranged', look: 'gun', name: 'plasma pistol', speed: 9 } }, base)?.weapon).toMatchObject({ look: 'gun', name: 'Plasma pistol', speed: 2 });
  });
});
