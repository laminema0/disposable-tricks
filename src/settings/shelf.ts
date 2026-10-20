// "My games": games the player chose to keep. They are kept on the player's own device
// only (the browser's local storage), as the same short text a share link carries.
// Nothing here is ever sent anywhere, and the player can delete each one.
// Pure: it works on anything that can get and set a string, so it can be unit tested.

import type { Settings } from './schema';
import { decodeSettings, encodeSettings } from './share';

export interface Store {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface SavedGame {
  /** The game as share-link text. Also what tells two saved games apart. */
  id: string;
  /** When it was saved, in milliseconds. */
  saved: number;
  settings: Settings;
  /** For a game the AI wrote as code: its script, packed as in a share link. */
  js?: string;
}

export const SHELF_KEY = 'disposable-tricks.games';
/** The most games kept. Saving one more drops the oldest. */
export const SHELF_MAX = 24;

interface Row {
  g: string;
  t: number;
}

function read(store: Store): Row[] {
  try {
    const rows: unknown = JSON.parse(store.getItem(SHELF_KEY) ?? '[]');
    if (!Array.isArray(rows)) return [];
    return rows.filter((row): row is Row => typeof row === 'object' && row !== null && typeof row.g === 'string' && typeof row.t === 'number');
  } catch {
    // Storage that is switched off or holds something else: an empty shelf.
    return [];
  }
}

function write(store: Store, rows: Row[]): void {
  try {
    store.setItem(SHELF_KEY, JSON.stringify(rows));
  } catch {
    // Full or switched off (a private window, say). The game still plays; it just is not kept.
  }
}

/** The saved games, newest first. What is stored is read like a share link: repaired, never trusted. */
export function listGames(store: Store): SavedGame[] {
  const games: SavedGame[] = [];
  for (const row of read(store)) {
    const settings = decodeSettings(row.g);
    if (!settings) continue;
    const js = new URLSearchParams(row.g).get('js') ?? '';
    // Only the characters a packed script can have.
    if (js && /^[A-Za-z0-9_-]+$/.test(js)) games.push({ id: `${encodeSettings(settings)}&js=${js}`, saved: row.t, settings, js });
    else games.push({ id: encodeSettings(settings), saved: row.t, settings });
  }
  return games;
}

export function isSaved(store: Store, settings: Settings, js = ''): boolean {
  const id = encodeSettings(settings) + (js ? `&js=${js}` : '');
  return listGames(store).some((game) => game.id === id);
}

/** Keep a game. Saving the same game again only moves it to the front. */
export function saveGame(store: Store, settings: Settings, now: number, js = ''): SavedGame[] {
  const id = encodeSettings(settings) + (js ? `&js=${js}` : '');
  const rest = listGames(store).filter((game) => game.id !== id);
  write(store, [{ g: id, t: now }, ...rest.map((game) => ({ g: game.id, t: game.saved }))].slice(0, SHELF_MAX));
  return listGames(store);
}

export function deleteGame(store: Store, id: string): SavedGame[] {
  write(
    store,
    listGames(store)
      .filter((game) => game.id !== id)
      .map((game) => ({ g: game.id, t: game.saved })),
  );
  return listGames(store);
}

/** The browser's own storage, or a shelf that forgets when there is none. */
export function browserStore(): Store {
  try {
    const storage = globalThis.localStorage;
    storage.getItem(SHELF_KEY);
    return storage;
  } catch {
    const memory = new Map<string, string>();
    return { getItem: (key) => memory.get(key) ?? null, setItem: (key, value) => void memory.set(key, value) };
  }
}
