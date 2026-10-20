import { describe, expect, it } from 'vitest';
import { lightLevelAt } from '../src/core/light';
import { GROUND_Y, LIGHT } from '../src/game/config';
import { buildLevel } from '../src/game/level';
import { makeLook, toHex, toNumber } from '../src/game/look';
import { MOOD_PRESETS } from '../src/settings/defaults';
import { applyChoice } from '../src/settings/options';
import { LIGHT_KINDS, MOODS, type LightKind } from '../src/settings/schema';
import { repairSettings } from '../src/settings/validate';

describe('the level follows the light settings', () => {
  const kinds = (lights: readonly LightKind[], lightDensity = 0.5) =>
    new Set(buildLevel(48213, { lights, lightDensity }).lights.map((light) => light.kind));

  it('only uses the kinds of light the settings allow', () => {
    for (const mood of MOODS) {
      const preset = MOOD_PRESETS[mood];
      for (const kind of kinds(preset.lights, preset.lightDensity)) expect(preset.lights).toContain(kind);
    }
    expect([...kinds(['fireflies'])]).toEqual(['fireflies']);
  });

  it('shows all four kinds in the base game', () => {
    expect(kinds(LIGHT_KINDS).size).toBe(4);
  });

  it('has fewer lights at a low density and more at a high one', () => {
    const count = (lightDensity: number) => buildLevel(48213, { lights: LIGHT_KINDS, lightDensity }).lights.length;
    expect(count(0.25)).toBeLessThan(count(0.5));
    expect(count(0.85)).toBeGreaterThan(count(0.5));
    expect(count(0)).toBeGreaterThan(0);
  });

  it('keeps the same ground whatever the light settings are', () => {
    const base = buildLevel(99);
    const dim = buildLevel(99, { lights: ['water'], lightDensity: 0.1 });
    expect(dim.chunks).toEqual(base.chunks);
    expect(dim.hideSpots).toEqual(base.hideSpots);
    expect(dim.pits).toEqual(base.pits);
  });

  it('leaves a dark hide spot in every mood, so hiding always works', () => {
    for (const mood of MOODS) {
      for (let seed = 1; seed <= 30; seed++) {
        const settings = applyChoice(repairSettings({ seed }), 'mood', mood);
        const level = buildLevel(settings.seed, settings);
        const dark = level.hideSpots.some(
          (spot) => lightLevelAt((spot.x0 + spot.x1) / 2, GROUND_Y - 24, level.lights, LIGHT.ambient) < LIGHT.hiddenBelow,
        );
        expect(dark).toBe(true);
      }
    }
  });
});

describe('makeLook', () => {
  it('reads the six palette slots from the settings', () => {
    const settings = repairSettings({ mood: 'eerie' });
    const look = makeLook(settings);
    expect(toHex(look.far)).toBe(settings.palette.far);
    expect(toHex(look.stage)).toBe(settings.palette.stage);
    expect(toHex(look.light)).toBe(settings.palette.light);
    expect(toHex(look.accent)).toBe(settings.palette.accent);
    expect(look.hero.body[1]).toBe(toNumber(settings.palette.hero));
  });

  it('gives every mood its own colours', () => {
    const skies = new Set(MOODS.map((mood) => makeLook(repairSettings({ mood })).far));
    expect(skies.size).toBe(MOODS.length);
  });

  it('puts the cape in the accent colour only when the hero is in colour', () => {
    const grey = makeLook(repairSettings({ mood: 'calm' }));
    const colour = makeLook(repairSettings({ mood: 'happy' }));
    expect(grey.hero.capeColour[1]).not.toBe(grey.accent);
    expect(colour.hero.capeColour[1]).toBe(colour.accent);
  });

  it('takes the cape and the sword off when the settings say so', () => {
    expect(makeLook(repairSettings({})).hero).toMatchObject({ cape: true, sword: true });
    expect(makeLook(repairSettings({ hero: { cape: false } })).hero.cape).toBe(false);
    expect(makeLook(repairSettings({ twist: 'no-sword' })).hero.sword).toBe(false);
  });
});
