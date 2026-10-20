// The maker screen [Amin, 17 and 18 Oct]: one game, the flower boy's road, made by answering two
// questions, what he carries and what he meets. Each question has four options and a fifth, written answer, all the same size.
// What is asked next follows from the answer (see settings/tree.ts). A written answer is a
// small change the AI makes to the game: "shotgun" gives a shotgun. When it cannot be made,
// one plain line says so and the game stays as it was.
// The game being made stands behind the questions and changes with every answer.

import type { Maker } from '../ai/maker';
import { WISH_MAX } from '../ai/protocol';
import { randomSeed, STEPS, type Step } from '../settings/options';
import type { Settings } from '../settings/schema';
import { FIRST, nextQuestion, question, readLook, sceneFor, surprisePath, type Question } from '../settings/tree';
import { repairSettings } from '../settings/validate';
import { button, el } from './dom';
import { ACTION_ICONS, ANY_WEAPON, iconButton, MONSTER_ICONS, WEAPON_ICONS } from './icons';
import { ENEMIES, type Enemy } from '../settings/schema';
import { prepareCreatureLooks, prepareWeaponLook } from '../game/generated';

const MONSTER_NAMES: Record<Enemy, string> = { crawler: 'Charger', thorn: 'Spitter', flyer: 'Diver', stalker: 'Stalker', watcher: 'Watcher' };

export interface PickScreen {
  element: HTMLElement;
  /** Start a new game from nothing. */
  openNew(): void;
  /** Back from the title card: the last question again, with every answer kept. */
  reopen(): void;
}

interface Handlers {
  /** Called with the finished settings. */
  onDone(settings: Settings): void;
  /** Called whenever the colours of the draft change, so the whole interface can follow. */
  onPalette(settings: Settings): void;
  /**
   * The scene behind the questions should show this game. `at` is where the hero stands, as a
   * share of the screen's width: in the open space between the answers and the questions.
   */
  onPreview(preview: { at: number; settings: Settings }): void;
  /** How many games are kept in "My games", and open that list. */
  savedCount(): number;
  onShelf(): void;
}

const MAKING = 'Making your game…';
/** The longest the AI may take to name a game before play starts with the name it has. */
const NAME_WAIT_MS = 2500;
const READING = 'Reading that…';
const REFUSED = 'Can’t make that. Try other words.';
const UNCLEAR = 'Didn’t catch that. Try other words.';

export function createPickScreen(handlers: Handlers, maker: Maker): PickScreen {
  const element = el('section', 'screen pick');
  element.hidden = true;
  const frame = el('div', 'frame');
  element.append(frame);

  let draft: Settings = repairSettings({});
  /** The question on screen, and the ones answered before it, in order. */
  let current = FIRST;
  let path: string[] = [];
  /** The game as it was before each answered question, so going back can undo it. */
  let before: Settings[] = [];
  let busy = false;
  /** One line beside the question: what is happening, what was understood, or what could not be made. */
  let status = '';

  // The written answer is built once and moved into each drawing of the screen. Its text is
  // never stored and never put in a share link.
  const field = el('input');
  field.type = 'text';
  field.maxLength = WISH_MAX;
  field.autocomplete = 'off';
  field.spellcheck = false;
  field.enterKeyHint = 'go';
  const use = button('btn', 'Use', () => void write());
  const written = el('div', 'hub-write');
  written.append(field, use);
  const sync = () => {
    use.disabled = busy || field.value.trim() === '';
  };
  field.addEventListener('input', () => {
    if (status === REFUSED || status === UNCLEAR) {
      status = '';
      render();
      field.focus({ preventScroll: true });
    }
    sync();
  });
  field.addEventListener('keydown', (event) => {
    // The game listens for keys on the whole page. Letters typed here are not for it.
    event.stopPropagation();
    if (event.key !== 'Enter') return;
    // Without this the same key press would also press Play on the title card that follows.
    event.preventDefault();
    if (!use.disabled) void write();
  });

  /** Tell the app what the scene behind the questions should show. */
  function showScene(): void {
    if (element.hidden) return;
    const width = window.innerWidth || 1;
    // He stands in the open space to the left of the centred column.
    const column = frame.querySelector('.hub')?.getBoundingClientRect();
    const at = column ? Math.max(0.08, column.left / 2 / width) : 0.15;
    handlers.onPreview({ at, settings: draft });
  }
  window.addEventListener('resize', () => {
    if (!element.hidden) showScene();
  });

  /** An answer was given: move to the next question, or finish. */
  function answered(next: Settings, note = ''): void {
    before.push(draft);
    path.push(current);
    draft = next;
    handlers.onPalette(draft);
    const following = nextQuestion(current, draft);
    if (!following) return void finish();
    current = following;
    status = note;
    render();
  }

  /** Every question is answered: name the game and hand it over. */
  async function finish(): Promise<void> {
    busy = true;
    status = MAKING;
    render();
    // The name is no longer on the title card (only in saved games and links): it may not hold up play.
    const named = draft;
    draft = await Promise.race([maker.name(draft), new Promise<Settings>((resolve) => setTimeout(() => resolve(named), NAME_WAIT_MS))]);
    busy = false;
    status = '';
    handlers.onPalette(draft);
    handlers.onDone(draft);
  }

  /** Back to an earlier question. The answers after it are undone. */
  function goBack(index: number): void {
    if (busy) return;
    draft = before[index];
    current = path[index];
    path = path.slice(0, index);
    before = before.slice(0, index);
    status = '';
    handlers.onPalette(draft);
    render();
  }

  /** The written fifth answer: a small change to this part of the game, made by the AI. */
  async function write(): Promise<void> {
    if (busy) return;
    const q = question(current, draft);
    const text = field.value;
    if (q.step === 'look') {
      // How he looks is read here: a cape or none, grey or in colour.
      const looked = readLook(text, draft);
      if (!looked) {
        status = 'Only a cape, no cape, grey or colour for now.';
        return render();
      }
      field.value = '';
      return answered(looked);
    }
    busy = true;
    status = READING;
    render();
    // Only this part of the game may change.
    const step: Step = q.step;
    const locked = new Set<Step>(STEPS.filter((name) => name !== step));
    const result = await maker.wish(step, draft, text, locked);
    busy = false;
    if (result.kind !== 'made') {
      status = result.kind === 'refused' ? REFUSED : UNCLEAR;
      render();
      field.focus({ preventScroll: true });
      return;
    }
    field.value = '';
    if (q.options.length === 0) {
      // Adding monsters: he can add more, and starts when he is ready.
      draft = result.settings;
      prepareCreatureLooks(draft.creatures);
      handlers.onPalette(draft);
      status = result.missed ? `No ${result.missed} here yet.` : `Added: ${draft.creatures.map((c) => c.name).join(', ')}`;
      render();
      showScene();
      return;
    }
    // A weapon we have not drawn: its look is asked for now, so it is ready by Play.
    prepareWeaponLook(result.settings.weapon);
    // What could not be built is said in one plain line; the game goes on with the rest.
    answered(result.settings, result.missed ? `No ${result.missed} here yet.` : result.heard);
  }

  function render(): void {
    frame.classList.toggle('busy', busy);
    const q: Question = question(current, draft);
    const monsters = q.options.length === 0;

    // Everything in one centred column (Amin, 19 Oct): the question, the pictures, the line to write in, the way on.
    const column = el('div', 'hub');
    const corner = el('div', 'hub-corner');
    if (path.length > 0) corner.append(iconButton('icon-btn ghost', ACTION_ICONS.back, 'Back', () => goBack(path.length - 1)));
    if (handlers.savedCount() > 0) corner.append(iconButton('icon-btn ghost right', ACTION_ICONS.saves, 'Saved games', handlers.onShelf));

    const ask = el('h2', 'hub-ask', q.ask);
    const pictures = el('div', monsters ? 'hub-cast' : 'hub-choices');
    if (monsters) {
      // Every one of our monsters is in every game: shown, not chosen.
      for (const kind of ENEMIES) {
        const face = el('span', 'cast-face');
        face.innerHTML = MONSTER_ICONS[kind];
        face.title = MONSTER_NAMES[kind];
        face.setAttribute('role', 'img');
        face.setAttribute('aria-label', MONSTER_NAMES[kind]);
        pictures.append(face);
      }
      for (const creature of draft.creatures) pictures.append(el('span', 'cast-added', creature.name));
    } else {
      for (const option of q.options) {
        const node = iconButton('choice', WEAPON_ICONS[option.id] ?? ANY_WEAPON, `${option.label}: ${option.detail}`, () => {
          if (busy) return;
          field.value = '';
          answered(option.apply(draft));
        });
        node.disabled = busy;
        pictures.append(node);
      }
    }

    field.placeholder = q.write;
    field.setAttribute('aria-label', q.write);
    field.disabled = busy;
    use.textContent = monsters ? 'Add' : 'Use';
    sync();

    const next = monsters
      ? button('btn primary hub-go', 'Play', () => !busy && answered(draft))
      : button('btn primary hub-go', 'Surprise me', () => {
          if (busy) return;
          before = [];
          path = [];
          draft = surprisePath(repairSettings({ seed: draft.seed }));
          field.value = '';
          handlers.onPalette(draft);
          void finish();
        });
    // The line under everything is always there, so nothing jumps when it fills.
    column.append(ask, pictures, written, next, el('p', 'hub-note', status));
    frame.replaceChildren(corner, column);
    showScene();
  }

  return {
    element,
    openNew() {
      // The night and the place are the game's choice; the player picks the weapon and the monsters.
      draft = sceneFor(repairSettings({ seed: randomSeed() }));
      current = FIRST;
      path = [];
      before = [];
      busy = false;
      status = '';
      field.value = '';
      handlers.onPalette(draft);
      render();
      element.hidden = false;
      showScene();
    },
    reopen() {
      busy = false;
      status = '';
      // The last answer (adding monsters) is open again; earlier ones are a tap on Back away.
      if (path.length > 0 && current !== 'meets') goBack(path.length - 1);
      handlers.onPalette(draft);
      render();
      element.hidden = false;
      showScene();
    },
  };
}
