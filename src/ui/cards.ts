// The title card (before play) and the end card (after play, or from the Menu button).

import { WISH_MAX } from '../ai/protocol';
import { answerLabel, question } from '../settings/tree';
import type { Finish } from '../game/GameScene';
import type { Settings } from '../settings/schema';
import type { SavedGame } from '../settings/shelf';
import { button, el } from './dom';
import { setVolumes, volumes, type Volumes } from '../core/volume';
import { ACTION_ICONS, iconButton } from './icons';

/** Two sliders, music and sound, each marked by its picture, kept on this device. */
function volumeRow(): HTMLElement {
  const row = el('div', 'volume-row');
  for (const [key, label] of [['music', 'Music'], ['sound', 'Sound']] as [keyof Volumes, string][]) {
    const field = el('label', 'volume');
    field.title = label;
    const mark = el('span', 'volume-mark');
    mark.innerHTML = ACTION_ICONS[key];
    const slider = el('input');
    slider.type = 'range';
    slider.min = '0';
    slider.max = '100';
    slider.value = String(Math.round(volumes()[key] * 100));
    slider.setAttribute('aria-label', label);
    slider.addEventListener('input', () => setVolumes({ [key]: Number(slider.value) / 100 }));
    field.append(mark, slider);
    row.append(field);
  }
  return row;
}

/** "Knife · Crawlers": what he carries and what he meets. */
export function summaryLine(settings: Settings): string {
  return ['carries', 'meets'].map((id) => answerLabel(question(id, settings), settings)).join(' · ');
}

export interface TitleCard {
  element: HTMLElement;
  /** `notice` is one plain line shown under the name, for when something had to be left out. */
  open(settings: Settings, notice?: string, written?: boolean): void;
}

export function createTitleCard(onPlay: () => void, onBack: () => void): TitleCard {
  const element = el('section', 'screen card');
  element.hidden = true;
  const frame = el('div', 'frame');
  element.append(frame);

  return {
    element,
    open(settings, notice = '', written = false) {
      // Only the game's name, one line of what to do, Play, and the way back (Amin, 19 Oct), all centred.
      const play = button('btn primary hub-go', 'Play', onPlay);
      const back = iconButton('icon-btn ghost', ACTION_ICONS.back, 'Back', onBack);
      const column = el('div', 'hub');
      column.append(
        el('h1', 'hub-title', written ? settings.title : 'Disposable Tricks'),
        el('p', 'hub-line', written ? 'Written for you just now.' : 'Let’s save the world and plant the flowers.'),
        play,
        back,
      );
      if (notice) column.append(el('p', 'hub-note', notice));
      frame.replaceChildren(column);
      element.hidden = false;
      play.focus({ preventScroll: true });
    },
  };
}

/** How a run of the endless road went. Chapter and distance come from the game when it reports them. */
type Run = Finish & { chapter?: number; distance?: number; flowers?: number };

/** "World 3 · 5 flowers · 1,240 m · 12 monsters defeated" */
function tally(finish: Run): string {
  if (finish.score !== undefined) return `Score ${finish.score}`;
  if (finish.chapter !== undefined || finish.distance !== undefined) {
    const parts = [];
    if (finish.chapter !== undefined) parts.push(`World ${finish.chapter}`);
    if (finish.flowers !== undefined) parts.push(`${finish.flowers} ${finish.flowers === 1 ? 'flower' : 'flowers'}`);
    if (finish.distance !== undefined) parts.push(`${Math.round(finish.distance).toLocaleString('en-GB')} m`);
    parts.push(`${finish.defeated} ${finish.defeated === 1 ? 'monster' : 'monsters'} defeated`);
    return parts.join(' · ');
  }
  const monsters = `${finish.defeated} ${finish.defeated === 1 ? 'monster' : 'monsters'} defeated`;
  if (!finish.won) return monsters;
  return `${monsters} · ${finish.petals} ${finish.petals === 1 ? 'petal' : 'petals'} left`;
}

export interface EndCard {
  element: HTMLElement;
  /** `finish` is how the run ended. Leave it out when the player opened the menu mid-game. */
  /** `progress`: one line on how far he has come, shown when the game is only paused. */
  open(settings: Settings, finish?: Finish, progress?: string): void;
}

interface EndHandlers {
  onResume(): void;
  /**
   * The player wrote a change for the game on screen. Resolves with one plain line to show
   * when it could not be made; on success the app has already started the changed game.
   */
  change(text: string): Promise<{ ok: boolean; line: string }>;
  onReplay(): void;
  onNew(): void;
  /** The share link of the current game. */
  link(): string;
  /** "My games": is this game kept on the device, and keep it or let it go. Returns the new state. */
  isSaved(): boolean;
  toggleSaved(): boolean;
}

/** Copy text to the clipboard. Resolves to false when the browser does not allow it. */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function createEndCard(handlers: EndHandlers): EndCard {
  const element = el('section', 'screen card');
  element.hidden = true;
  const frame = el('div', 'frame');
  element.append(frame);

  return {
    element,
    open(settings, finish, progress) {
      const finished = finish !== undefined;
      const actions = el('div', 'hub-actions');
      // One line under the pictures says what the last one did.
      const said = el('p', 'hub-note', '');
      const tell = (line: string) => {
        said.textContent = line;
        window.setTimeout(() => {
          if (said.textContent === line) said.textContent = '';
        }, 1800);
      };
      const copy = iconButton('icon-btn', ACTION_ICONS.share, 'Share', async () => {
        const link = handlers.link();
        const copied = () => tell('Link copied');
        if (await copyText(link)) return copied();
        // The browser said no (it does on a plain http address, such as a phone on the
        // same Wi-Fi): show the link, and try the older way of copying a selected field.
        let field = frame.querySelector<HTMLInputElement>('.link-field');
        if (!field) {
          field = el('input', 'link-field');
          field.readOnly = true;
          field.setAttribute('aria-label', 'Share link');
          said.after(field);
        }
        field.value = link;
        field.select();
        try {
          if (document.execCommand('copy')) copied();
        } catch {
          // The link stays on screen to be copied by hand.
        }
      });
      // Keep it, or let it go: a kept game sits on this device only, under "Saved" on the first screen.
      const keep = iconButton('icon-btn', handlers.isSaved() ? ACTION_ICONS.saved : ACTION_ICONS.save, handlers.isSaved() ? 'Saved' : 'Save', () => {
        const saved = handlers.toggleSaved();
        keep.innerHTML = saved ? ACTION_ICONS.saved : ACTION_ICONS.save;
        keep.setAttribute('aria-label', saved ? 'Saved' : 'Save');
        keep.title = saved ? 'Saved' : 'Save';
        keep.setAttribute('aria-pressed', String(saved));
        tell(saved ? 'Saved on this device' : 'Removed from saved');
      });
      keep.setAttribute('aria-pressed', String(handlers.isSaved()));
      if (!finished) actions.append(iconButton('icon-btn primary', ACTION_ICONS.play, 'Keep playing', handlers.onResume));
      // One line to change the game with words. The AI changes it, and play goes on (or starts again).
      const change = changeRow(handlers.change);
      actions.append(
        iconButton(finished ? 'icon-btn primary' : 'icon-btn', ACTION_ICONS.again, finished ? 'Play again' : 'Start over', handlers.onReplay),
        copy,
        keep,
        iconButton('icon-btn', ACTION_ICONS.fresh, 'New game', handlers.onNew),
      );
      const heading = !finish ? 'Paused' : finish.score !== undefined ? (finish.won ? 'You won' : 'Game over') : (finish as Run).chapter !== undefined ? 'The flower grows' : finish.won ? (settings.story === 'home' ? 'Home at last' : 'The flower grows') : 'The last petal fell';
      // Under the heading, only how the run went (Amin, 18 Oct: no line of answers here).
      const column = el('div', 'hub');
      column.append(el('h1', 'hub-title', heading));
      if (!finish && progress) column.append(el('p', 'hub-line', progress));
      if (finish) column.append(el('p', 'hub-line', tally(finish)));
      column.append(change, actions, said, volumeRow());
      frame.replaceChildren(column);
      element.hidden = false;
    },
  };
}

const CHANGE_LABEL = 'Change this game';
const CHANGE_HINT = 'A dragon, a frying pan, more monsters…';
const CHANGING = 'Changing your game…';

/** The write-in on the pause menu: a field, a button, and one line for what is happening. */
function changeRow(change: EndHandlers['change']): HTMLElement {
  const row = el('div', 'change');
  const field = el('input');
  field.type = 'text';
  field.maxLength = WISH_MAX;
  field.autocomplete = 'off';
  field.spellcheck = false;
  field.enterKeyHint = 'go';
  field.placeholder = CHANGE_HINT;
  field.setAttribute('aria-label', CHANGE_LABEL);
  const note = el('p', 'change-note', '');
  const submit = button('btn', 'Change', () => void send());
  const sync = () => (submit.disabled = field.disabled || field.value.trim() === '');
  async function send(): Promise<void> {
    if (submit.disabled) return;
    field.disabled = true;
    sync();
    note.textContent = CHANGING;
    const result = await change(field.value);
    field.disabled = false;
    sync();
    note.textContent = result.ok ? '' : result.line;
    if (!result.ok) field.focus({ preventScroll: true });
  }
  field.addEventListener('input', () => {
    note.textContent = '';
    sync();
  });
  field.addEventListener('keydown', (event) => {
    // The game listens for keys on the whole page. Letters typed here are not for it.
    event.stopPropagation();
    if (event.key !== 'Enter') return;
    event.preventDefault();
    void send();
  });
  sync();
  const line = el('div', 'wish');
  line.append(field, submit);
  row.append(el('p', 'change-label', CHANGE_LABEL), line, note);
  return row;
}

export interface Shelf {
  element: HTMLElement;
  open(games: readonly SavedGame[]): void;
}

interface ShelfHandlers {
  onPlay(game: SavedGame): void;
  /** Delete one game. Returns the games that are left. */
  onDelete(id: string): readonly SavedGame[];
  onBack(): void;
}

/** "My games": the games kept on this device. Tap one to play it, or delete it. */
export function createShelf(handlers: ShelfHandlers): Shelf {
  const element = el('section', 'screen card shelf');
  element.hidden = true;
  const frame = el('div', 'frame');
  element.append(frame);

  function draw(games: readonly SavedGame[]): void {
    const list = el('div', 'saved');
    for (const game of games) {
      const row = el('div', 'row');
      const play = button('game', '', () => handlers.onPlay(game));
      play.append(el('span', 'label', game.settings.title), el('span', 'detail', game.js ? 'A game of its own' : summaryLine(game.settings)));
      row.append(play, button('btn', 'Delete', () => draw(handlers.onDelete(game.id))));
      list.append(row);
    }
    const head = el('div', 'head');
    head.append(el('h1', '', 'My games'), button('btn', 'Back', handlers.onBack));
    frame.replaceChildren(head, games.length > 0 ? list : el('p', '', 'Nothing saved yet. Save a game from its menu.'), el('p', 'note', 'Kept on this device only.'));
  }

  return {
    element,
    open(games) {
      draw(games);
      element.hidden = false;
    },
  };
}
