import { describe, expect, it } from 'vitest';
import { DETAIL_MAX, LABEL_MAX } from '../src/settings/options';
import { answerLabel, DEPTH, FIRST, nextQuestion, question, readLook, reachFor, surprisePath } from '../src/settings/tree';
import { repairSettings } from '../src/settings/validate';
import type { Settings } from '../src/settings/schema';

/** Every path through the tree, as the questions asked and the game at the end. */
function walk(id: string | undefined, game: Settings, asked: string[], out: { asked: string[]; game: Settings }[]): void {
  if (!id) return void out.push({ asked, game });
  // A step with nothing to pick (adding monsters) leads straight on.
  if (question(id, game).options.length === 0) return walk(nextQuestion(id, game), game, [...asked, id], out);
  for (const option of question(id, game).options) walk(nextQuestion(id, option.apply(game)), option.apply(game), [...asked, id], out);
}

describe('the question tree', () => {
  const paths: { asked: string[]; game: Settings }[] = [];
  walk(FIRST, repairSettings({ seed: 9 }), [], paths);

  it('asks the weapon (four options) and then only offers to add monsters, every line short enough for one line', () => {
    expect(paths.length).toBe(4);
    expect(question('meets', repairSettings({})).options).toHaveLength(0);
    const seen = new Set<string>();
    for (const path of paths) {
      expect(path.asked).toHaveLength(DEPTH);
      for (const id of path.asked) seen.add(id);
    }
    for (const id of seen) {
      const q = question(id, repairSettings({}));
      if (id === 'meets') continue;
      expect(q.options).toHaveLength(4);
      for (const option of q.options) {
        expect(option.label.length).toBeLessThanOrEqual(LABEL_MAX);
        expect(option.detail.length).toBeLessThanOrEqual(DETAIL_MAX);
      }
    }
  });

  it('asks what he carries, then what he meets (18 Oct: nothing else)', () => {
    expect(FIRST).toBe('carries');
    expect(nextQuestion('carries', repairSettings({}))).toBe('meets');
    expect(nextQuestion('meets', repairSettings({}))).toBeUndefined();
    expect(question('carries', repairSettings({})).options.map((o) => o.label)).toEqual(['Knife', 'Gun', 'Sword', 'Stones']);
  });

  it('builds what each option says', () => {
    const night = question('night', repairSettings({}));
    expect(night.options.find((o) => o.id === 'fierce')!.apply(repairSettings({})).mood).toBe('fierce');
    const town = question('place-calm', repairSettings({})).options.find((o) => o.id === 'town')!.apply(repairSettings({}));
    expect(town.world).toBe('town');
    expect(nextQuestion('place-calm', town)).toBe('monsters-town');
    const flyers = question('monsters-shore', town).options.find((o) => o.id === 'flyer')!.apply(town);
    expect(flyers.enemies).toEqual(['flyer']);
    expect(nextQuestion('monsters-shore', flyers)).toBe('weapon-far');
    const knife = question('weapon-mixed', flyers).options.find((o) => o.id === 'knife')!.apply(flyers);
    expect(knife.weapon.name).toBe('Knife');
    expect(question('look', knife).ask).toBe('Knife in hand. How does he look?');
    const bare = question('look', knife).options.find((o) => o.id === 'colour')!.apply(knife);
    expect(bare.hero).toEqual({ cape: false, colour: true });
    expect(answerLabel(question('look', bare), bare)).toBe('Colour, no cape');
  });

  it('meets far monsters at range and near ones up close', () => {
    expect(reachFor(['crawler', 'thorn'])).toBe('near');
    expect(reachFor(['flyer', 'watcher'])).toBe('far');
    expect(reachFor(['crawler', 'flyer'])).toBe('mixed');
  });

  it('reads a written look, and surprises along a real path', () => {
    const game = repairSettings({ hero: { cape: true, colour: false } });
    expect(readLook('no cape please', game)?.hero.cape).toBe(false);
    expect(readLook('in bright colours', game)?.hero.colour).toBe(true);
    expect(readLook('a hat', game)).toBeUndefined();
    const surprised = surprisePath(repairSettings({ seed: 3 }), () => 0.99);
    // Every game has all of our monsters.
    expect(surprised.enemies).toEqual(['crawler', 'thorn', 'flyer', 'stalker', 'watcher']);
  });
});
