import { describe, expect, it } from 'vitest';
import { makeRng } from '../src/core/rng';
import { DEFAULT_SETTINGS, MOOD_PRESETS, WEAPON_PRESETS, WORLD_SCENERY } from '../src/settings/defaults';
import { applyChoice, applyPatch, choiceLabel, choiceOf, premadeCards, repairPatch, STEPS, surprise, twistsFor, understood } from '../src/settings/options';
import { MOODS, type Settings } from '../src/settings/schema';
import { decodeSettings, encodeSettings, shareLink } from '../src/settings/share';
import { makeIntro, makeTitle } from '../src/settings/title';
import { repairScenery, repairSettings, repairWeapon } from '../src/settings/validate';

describe('repairSettings', () => {
  it('keeps valid settings exactly as they are', () => {
    expect(repairSettings(DEFAULT_SETTINGS)).toEqual(DEFAULT_SETTINGS);
  });

  it('turns anything at all into the defaults', () => {
    // Only the name differs: a game that arrives without one is named from its seed.
    const expected = { ...DEFAULT_SETTINGS, title: makeTitle('calm', 'forest', DEFAULT_SETTINGS.seed) };
    for (const junk of [undefined, null, 7, 'hello', [], [1, 2], {}, () => 0]) {
      expect(repairSettings(junk)).toEqual(expected);
    }
  });

  it('repairs each invalid field and keeps the valid ones', () => {
    const repaired = repairSettings({
      v: 99,
      genre: 'racing',
      modifier: 'x',
      mood: 'fierce',
      world: 'moon',
      palette: { far: '#ABCDEF', mid: 'red', stage: 12, hero: '#12345', light: '#fff' },
      hero: { cape: false, colour: 'yes' },
      lights: ['mirror', 'laser', 'lamp', 'lamp'],
      lightDensity: 4,
      enemies: ['watcher', 'dragon'],
      merges: 'true',
      twist: 'gravity',
      difficulty: 2.6,
      seed: -5,
      title: '  <b>Hi</b>\n there  ',
    });
    const fierce = MOOD_PRESETS.fierce.palette;
    expect(repaired).toEqual({
      v: 1,
      genre: 'side-scroller',
      modifier: null,
      mood: 'fierce',
      world: 'forest',
      // A valid colour is kept (in lower case); the rest fall back to the mood's own palette.
      palette: { ...fierce, far: '#abcdef' },
      hero: { cape: false, colour: false },
      lights: ['lamp', 'mirror'],
      lightDensity: 1,
      enemies: ['watcher'],
      creatures: [],
      weather: 'none',
      scenery: WORLD_SCENERY.forest,
      travel: 'foot',
      ground: 'path',
      weapon: WEAPON_PRESETS.sword,
      merges: true,
      twist: 'none',
      story: 'flower',
      difficulty: 3,
      seed: 0,
      title: 'b Hi b there',
      intro: makeIntro('fierce', 0),
    } satisfies Settings);
  });

  it('never leaves a game without light, and gives a nameless game a name', () => {
    const repaired = repairSettings({ mood: 'eerie', lights: [], title: '   ' });
    expect(repaired.lights).toEqual(MOOD_PRESETS.eerie.lights);
    expect(repaired.title.length).toBeGreaterThan(0);
  });

  it('accepts a game with no monsters, and a world brings its own scenery', () => {
    expect(repairSettings({ enemies: [] }).enemies).toEqual([]);
    expect(repairSettings({ world: 'ruins' }).scenery).toEqual(WORLD_SCENERY.ruins);
    expect(repairSettings({ world: 'the moon' }).world).toBe('forest');
  });

  it('keeps only scenery from our library: known kinds, once each, three at most, numbers in range', () => {
    expect(repairScenery([{ kind: 'buildings', amount: 9, size: 0.1 }, 'trees', { kind: 'dragons' }, { kind: 'buildings' }])).toEqual([
      { kind: 'buildings', amount: 1, size: 0.6 },
      { kind: 'trees', amount: 0.6, size: 1 },
    ]);
    expect(repairScenery(['houses', 'towers', 'ruins', 'fences'])).toHaveLength(3);
    expect(repairScenery(['dragons'])).toBeUndefined();
    expect(repairScenery('buildings')).toBeUndefined();
    // Nothing usable: the world's own scenery stands.
    expect(repairSettings({ world: 'town', scenery: [{ kind: 'volcano' }] }).scenery).toEqual(WORLD_SCENERY.town);
  });

  it('builds a weapon from a kind, a shape and a few numbers, and repairs the rest', () => {
    expect(repairWeapon({ kind: 'ranged', name: 'Crossbow', reach: 9999, speed: 0, power: 7 })).toEqual({
      name: 'Crossbow',
      kind: 'ranged',
      look: 'bow',
      reach: 420,
      speed: 0.5,
      power: 2,
    });
    // A shape alone is enough, and a shape that does not fit its kind gives way to the kind.
    expect(repairWeapon({ look: 'spear' })).toEqual(WEAPON_PRESETS.spear);
    expect(repairWeapon({ kind: 'ranged', look: 'sword' })?.look).toBe('bow');
    expect(repairWeapon({ kind: 'none', name: 'Tank' })).toMatchObject({ kind: 'none', name: 'No weapon' });
    expect(repairWeapon({ kind: 'nuke', look: 'tank' })).toBeUndefined();
    expect(repairWeapon({ look: 'bow', name: '<b>x</b>' })?.name).toBe('B x b');
    expect(repairWeapon({ look: 'bow', name: 'crossbow' })?.name).toBe('Crossbow');
    expect(repairSettings({ weapon: 'a big gun' }).weapon).toEqual(WEAPON_PRESETS.sword);
  });

  it('carries scenery and weapon through a share link', () => {
    const game = repairSettings({
      scenery: [{ kind: 'buildings', amount: 0.85, size: 1.45 }, { kind: 'bridges', amount: 0.3, size: 0.6 }],
      weapon: { kind: 'thrown', look: 'sling', name: 'Slingshot', reach: 300, speed: 1.35, power: 2 },
    });
    expect(decodeSettings(encodeSettings(game))).toEqual(game);
    // A link from before these fields existed still plays, with the world's scenery and the sword.
    const old = decodeSettings('#v=1&m=calm&w=forest&s=5');
    expect(old?.scenery).toEqual(WORLD_SCENERY.forest);
    expect(old?.weapon).toEqual(WEAPON_PRESETS.sword);
  });

  it('caps the title length and rejects numbers that are not numbers', () => {
    const repaired = repairSettings({ title: 'x'.repeat(200), seed: NaN, lightDensity: Infinity, difficulty: '2' });
    expect(repaired.title).toHaveLength(40);
    expect(repaired.seed).toBe(DEFAULT_SETTINGS.seed);
    expect(repaired.lightDensity).toBe(DEFAULT_SETTINGS.lightDensity);
    expect(repaired.difficulty).toBe(DEFAULT_SETTINGS.difficulty);
  });

  it('gives back the same thing when run twice', () => {
    const once = repairSettings({ mood: 'happy', lightDensity: 0.123456, title: 'A & B' });
    expect(repairSettings(once)).toEqual(once);
  });
});

describe('share links', () => {
  it('round-trips the default settings', () => {
    expect(decodeSettings(encodeSettings(DEFAULT_SETTINGS))).toEqual(DEFAULT_SETTINGS);
  });

  it('round-trips every game the four taps can make', () => {
    const rng = makeRng(2026);
    for (let i = 0; i < 300; i++) {
      const settings = surprise(Math.floor(rng() * 1_000_000), rng);
      expect(decodeSettings(encodeSettings(settings))).toEqual(settings);
    }
  });

  it('round-trips unusual but valid settings', () => {
    const odd = repairSettings({
      mood: 'happy',
      palette: { far: '#000000', mid: '#ffffff', stage: '#123456', hero: '#abcdef', light: '#010203', accent: '#fedcba' },
      hero: { cape: false, colour: false },
      lights: ['water'],
      lightDensity: 0.07,
      enemies: [],
      merges: false,
      twist: 'no-sword',
      difficulty: 1,
      seed: 4294967295,
      title: "Zoë's Road, part 2 & more!",
      intro: 'Hold on, it gets dark & quiet!',
    });
    expect(decodeSettings(`#${encodeSettings(odd)}`)).toEqual(odd);
  });

  it('puts the settings after the # and replaces an old link', () => {
    const link = shareLink('https://example.test/play/?debug=1#old', DEFAULT_SETTINGS);
    expect(link.startsWith('https://example.test/play/?debug=1#v=1&')).toBe(true);
    expect(link.split('#')).toHaveLength(2);
    expect(decodeSettings(new URL(link).hash)).toEqual(DEFAULT_SETTINGS);
  });

  it('says no to an address that is not a share link', () => {
    for (const hash of ['', '#', '#about', '#v=2&m=calm', '#m=calm']) expect(decodeSettings(hash)).toBeNull();
  });

  it('still gives a playable game from a damaged link', () => {
    const damaged = decodeSettings('#v=1&m=happy&p=zzz.12&l=torch&d=lots&s=12&h=x');
    expect(damaged).toEqual(repairSettings({ mood: 'happy', seed: 12 }));
  });
});

describe('the cards of each step', () => {
  it('offers two to four cards at every step, whatever was picked before, and every card can be applied', () => {
    const rng = makeRng(7);
    for (let i = 0; i < 200; i++) {
      let settings = repairSettings({ seed: i });
      for (const step of STEPS) {
        const cards = premadeCards(step, settings);
        expect(cards.length).toBeGreaterThanOrEqual(2);
        expect(cards.length).toBeLessThanOrEqual(4);
        for (const card of cards) {
          expect(card.label.length).toBeLessThanOrEqual(18);
          expect(card.detail.length).toBeLessThanOrEqual(28);
        }
        const card = cards[Math.floor(rng() * cards.length)];
        settings = applyPatch(settings, step, card.patch);
        expect(choiceOf(step, settings)).toBe(card.id);
      }
      expect(repairSettings(settings)).toEqual(settings);
    }
  });

  it('every world can be picked and brings its own scenery', () => {
    const town = applyChoice(DEFAULT_SETTINGS, 'world', 'town');
    expect(town.world).toBe('town');
    expect(town.scenery.map((piece) => piece.kind)).toEqual(['buildings', 'houses', 'fences']);
    expect(choiceLabel('world', town)).toBe('Town');
    // The mood decides which world comes first.
    expect(premadeCards('world', repairSettings({ mood: 'eerie' }))[0].id).toBe('ruins');
    expect(premadeCards('world', repairSettings({ mood: 'happy' }))[0].id).toBe('town');
  });

  it('changes the monsters and the weapons on offer with the mood', () => {
    const ids = (step: 'monsters' | 'weapon', mood: string) => premadeCards(step, repairSettings({ mood })).map((card) => card.id);
    expect(ids('monsters', 'happy')).toContain('garden');
    expect(ids('monsters', 'happy')).not.toContain('watchers');
    expect(ids('monsters', 'eerie')).toContain('watchers');
    expect(new Set(MOODS.map((mood) => ids('monsters', mood).join())).size).toBe(MOODS.length);
    expect(ids('weapon', 'fierce')).toContain('axe');
    expect(ids('weapon', 'eerie')).toContain('none');
    expect(new Set(MOODS.map((mood) => ids('weapon', mood).join())).size).toBe(MOODS.length);
  });

  it('changes the twists on offer with the mood, the monsters and the weapon', () => {
    const withWatchers = applyChoice(repairSettings({ mood: 'fierce' }), 'monsters', 'watchers');
    const without = applyChoice(repairSettings({ mood: 'fierce' }), 'monsters', 'swoopers');
    expect(twistsFor(withWatchers)).toContain('more-watchers');
    expect(twistsFor(without)).not.toContain('more-watchers');
    expect(twistsFor(without)).toContain('fast-flowers');
    expect(twistsFor(repairSettings({ mood: 'eerie' }))).not.toContain('fewer-lights');
    // With no weapon there is nothing for "Unarmed" to take away.
    expect(twistsFor(applyChoice(repairSettings({ mood: 'eerie' }), 'weapon', 'none'))).not.toContain('no-sword');
  });

  it('a mood sets the palette, the hero colour and the lights', () => {
    const happy = applyChoice(DEFAULT_SETTINGS, 'mood', 'happy');
    expect(happy.palette).toEqual(MOOD_PRESETS.happy.palette);
    expect(happy.hero.colour).toBe(true);
    expect(happy.lights).toEqual(MOOD_PRESETS.happy.lights);
    expect(happy.seed).toBe(DEFAULT_SETTINGS.seed);
    expect(applyChoice(happy, 'mood', 'calm').hero.colour).toBe(false);
  });

  it('fewer lights halves the light, and taking the twist off gives it back', () => {
    const dim = applyChoice(DEFAULT_SETTINGS, 'twist', 'fewer-lights');
    expect(dim.lightDensity).toBe(0.25);
    expect(applyChoice(dim, 'twist', 'none').lightDensity).toBe(0.5);
  });

  it('remixing the mood drops a pack or a twist the new mood does not offer', () => {
    let settings = applyChoice(repairSettings({ mood: 'fierce' }), 'monsters', 'watchers');
    settings = applyChoice(settings, 'twist', 'more-watchers');
    const remixed = applyChoice(settings, 'mood', 'happy');
    expect(premadeCards('monsters', remixed).map((card) => card.id)).toContain(choiceOf('monsters', remixed));
    expect(remixed.twist).toBe('none');

    const dark = applyChoice(applyChoice(DEFAULT_SETTINGS, 'twist', 'fewer-lights'), 'mood', 'eerie');
    expect(dark.twist).toBe('none');
    expect(dark.lightDensity).toBe(MOOD_PRESETS.eerie.lightDensity);
  });

  it('ignores a card that is not on offer', () => {
    expect(applyChoice(DEFAULT_SETTINGS, 'mood', 'sleepy')).toBe(DEFAULT_SETTINGS);
    expect(applyChoice(repairSettings({ mood: 'eerie' }), 'twist', 'fewer-lights').twist).toBe('none');
  });

  it('reads a patch from anything, and only the fields of its own step', () => {
    const base = repairSettings({});
    // A world patch cannot smuggle in a weapon or a mood.
    const world = repairPatch('world', { scenery: ['buildings', 'unicorns'], weapon: { look: 'bow' }, mood: 'fierce' }, base);
    expect(world).toEqual({ world: 'town', scenery: [{ kind: 'buildings', amount: 0.6, size: 1 }] });
    expect(repairPatch('world', { scenery: ['unicorns'] }, base)).toBeUndefined();
    expect(repairPatch('monsters', { enemies: ['dragon', 'flyer'], difficulty: 9 }, base)).toEqual({ enemies: ['flyer'], difficulty: 3 });
    expect(repairPatch('monsters', { enemies: ['dragon'] }, base)).toBeUndefined();
    expect(repairPatch('weapon', { weapon: { kind: 'ranged', name: 'Gun' } }, base)?.weapon).toMatchObject({ kind: 'ranged', look: 'bow', name: 'Gun' });
    expect(repairPatch('twist', { twist: 'more-watchers' }, repairSettings({ enemies: ['thorn'] }))).toBeUndefined();
    expect(repairPatch('mood', { mood: 'purple' }, base)).toBeUndefined();
    // The amount of light may only move a little away from what the mood gives.
    expect(repairPatch('mood', { mood: 'calm', lightDensity: 0 }, base)?.lightDensity).toBeCloseTo(0.3);
  });

  it('says in plain words what a step now holds', () => {
    const game = applyPatch(applyPatch(repairSettings({}), 'world', { scenery: [{ kind: 'buildings', amount: 0.8, size: 1.4 }, { kind: 'bridges', amount: 0.4, size: 1 }] }), 'weapon', {
      weapon: { ...WEAPON_PRESETS.bow, name: 'Crossbow' },
    });
    expect(understood('world', game)).toBe('Buildings, bridges');
    expect(understood('weapon', game)).toBe('Crossbow, shoots far');
    expect(choiceLabel('world', game)).toBe('Buildings, bridges');
    expect(choiceLabel('weapon', game)).toBe('Crossbow');
    expect(choiceOf('world', game)).toBeUndefined();
  });

  it('surprise gives the same game for the same random numbers', () => {
    expect(surprise(5, makeRng(1))).toEqual(surprise(5, makeRng(1)));
    const moods = new Set(Array.from({ length: 40 }, (_, i) => surprise(i, makeRng(i)).mood));
    expect(moods.size).toBeGreaterThan(1);
  });
});
