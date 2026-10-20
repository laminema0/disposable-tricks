import { describe, expect, it } from 'vitest';
import { applyChoice } from '../src/settings/options';
import { encodeSettings } from '../src/settings/share';
import { deleteGame, isSaved, listGames, saveGame, SHELF_KEY, SHELF_MAX, type Store } from '../src/settings/shelf';
import { repairSettings } from '../src/settings/validate';

function memory(start?: string): Store & { data: Map<string, string> } {
  const data = new Map<string, string>(start === undefined ? [] : [[SHELF_KEY, start]]);
  return { data, getItem: (key) => data.get(key) ?? null, setItem: (key, value) => void data.set(key, value) };
}

const calm = repairSettings({ seed: 1 });
const town = applyChoice(repairSettings({ seed: 2 }), 'world', 'town');

describe('My games', () => {
  it('starts empty, keeps what is saved newest first, and saves a game only once', () => {
    const store = memory();
    expect(listGames(store)).toEqual([]);
    saveGame(store, calm, 100);
    saveGame(store, town, 200);
    expect(listGames(store).map((game) => game.settings.seed)).toEqual([2, 1]);
    expect(isSaved(store, calm)).toBe(true);
    // Saving the same game again moves it to the front; it is not kept twice.
    saveGame(store, calm, 300);
    expect(listGames(store).map((game) => game.settings.seed)).toEqual([1, 2]);
    expect(listGames(store)[0]).toEqual({ id: encodeSettings(calm), saved: 300, settings: calm });
  });

  it('deletes one game and leaves the others', () => {
    const store = memory();
    saveGame(store, calm, 1);
    saveGame(store, town, 2);
    expect(deleteGame(store, encodeSettings(calm)).map((game) => game.settings.seed)).toEqual([2]);
    expect(isSaved(store, calm)).toBe(false);
    expect(deleteGame(store, 'not there')).toHaveLength(1);
  });

  it('keeps a limited number, dropping the oldest', () => {
    const store = memory();
    for (let seed = 0; seed < SHELF_MAX + 5; seed++) saveGame(store, repairSettings({ seed }), seed);
    const games = listGames(store);
    expect(games).toHaveLength(SHELF_MAX);
    expect(games[0].settings.seed).toBe(SHELF_MAX + 4);
    expect(games.at(-1)?.settings.seed).toBe(5);
  });

  it('reads what is stored like a share link: repaired, never trusted', () => {
    expect(listGames(memory('not json'))).toEqual([]);
    expect(listGames(memory('{"a":1}'))).toEqual([]);
    const odd = JSON.stringify([{ g: 'v=1&m=purple&s=7&kn=<b>x</b>', t: 5 }, { g: 'hello', t: 6 }, { g: 42 }, null]);
    const games = listGames(memory(odd));
    expect(games).toHaveLength(1);
    expect(games[0].settings).toEqual(repairSettings({ seed: 7 }));
  });

  it('copes with storage that refuses to work', () => {
    const broken: Store = {
      getItem: () => {
        throw new Error('off');
      },
      setItem: () => {
        throw new Error('full');
      },
    };
    expect(listGames(broken)).toEqual([]);
    expect(saveGame(broken, calm, 1)).toEqual([]);
    expect(isSaved(broken, calm)).toBe(false);
  });
});
