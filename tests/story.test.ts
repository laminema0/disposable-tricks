import { describe, expect, it } from 'vitest';
import { applyPatch, premadeCards, storiesFor } from '../src/settings/options';
import { decodeSettings, encodeSettings } from '../src/settings/share';
import { NO_WEAPON } from '../src/settings/defaults';
import { repairSettings } from '../src/settings/validate';
import { readStepWish } from '../src/ai/wish';

describe('the story', () => {
  it('is the flower by default, and travels in a share link when it is another', () => {
    expect(repairSettings({}).story).toBe('flower');
    const home = repairSettings({ seed: 4, story: 'home' });
    expect(decodeSettings(`#${encodeSettings(home)}`)?.story).toBe('home');
    expect(encodeSettings(repairSettings({ seed: 4 }))).not.toContain('st=');
  });

  it('offers the hunt only to a game that can fell monsters', () => {
    expect(storiesFor(repairSettings({}))).toContain('hunt');
    const unarmed = repairSettings({ weapon: NO_WEAPON });
    expect(storiesFor(unarmed)).not.toContain('hunt');
    expect(premadeCards('story', unarmed).map((card) => card.id)).toEqual(['flower', 'home']);
    // Taking the weapon away later sends a hunt back to the flower.
    const hunt = applyPatch(repairSettings({}), 'story', { story: 'hunt' });
    expect(hunt.story).toBe('hunt');
    expect(applyPatch(hunt, 'weapon', { weapon: NO_WEAPON }).story).toBe('flower');
  });

  it('reads a written story', () => {
    expect(readStepWish('story', 'he finds his way home')?.story).toBe('home');
    expect(readStepWish('story', 'every monster must die')?.story).toBe('hunt');
    expect(readStepWish('story', 'plant the flower')?.story).toBe('flower');
  });
});
