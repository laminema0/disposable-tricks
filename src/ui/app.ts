// The flow around the game: pick, title card, play, end card, remix, share.
// A share link in the address skips the pick screen and plays that exact game.

import type Phaser from 'phaser';
import { prepareCreatureLooks, prepareWeaponLook } from '../game/generated';
import { FINISHED, GameScene, type Finish, type GameData, type Resume } from '../game/GameScene';
import type { RunState } from '../game/run';
import { defaultMaker } from '../ai/maker';
import type { Settings } from '../settings/schema';
import { decodeSettings, encodeSettings, shareLink } from '../settings/share';
import { browserStore, deleteGame, isSaved, listGames, saveGame } from '../settings/shelf';
import { createEndCard, createShelf, createTitleCard } from './cards';
import { button, el, setPalette } from './dom';
import { createTrickHost } from '../trick/host';
import { packTrick, unpackTrick } from '../trick/pack';
import { repairSettings } from '../settings/validate';
import { createPickScreen } from './pick';
import './styles.css';

const SCENE = 'game';

export function startApp(game: Phaser.Game): void {
  // The locked frame for games the AI wrote as code sits under the interface.
  const stage = el('div');
  const root = el('div');
  root.id = 'ui';
  document.body.append(stage, root);
  const host = createTrickHost(stage);
  /** One short line over the game for a moment: what a change did. */
  const toast = el('p', 'toast');
  toast.hidden = true;
  let toastTimer = 0;
  const maker = defaultMaker();
  /** The script of the game on screen, when it is one the AI wrote; and the same, packed for a link. */
  let trick: string | undefined;
  let trickJs = '';
  const testTrick = (code: string) => host.check(code, 7);

  const debug = new URLSearchParams(window.location.search).get('debug') === '1';
  let current: Settings | undefined;
  /** True once the run on screen has ended: a change then starts a fresh run instead of carrying on. */
  let over = false;
  /** The settings the maker's preview scene was built from. */
  let previewKey = '';
  // "My games" lives in this browser only.
  const store = browserStore();

  const pick = createPickScreen(
    {
      onDone: (settings) => play(settings),
      onPalette: (settings) => setPalette(root, settings.palette),
      onPreview: (preview) => {
        // The game itself, as the answers so far make it. Built again only when they change.
        host.stop();
        const key = encodeSettings(preview.settings);
        const scene = game.scene.getScene(SCENE) as GameScene | null;
        if (scene && key === previewKey) return scene.setPreviewAt(preview.at);
        previewKey = key;
        if (scene) game.scene.remove(SCENE);
        const data: GameData = { settings: preview.settings, debug, preview: { at: preview.at } };
        game.scene.add(SCENE, GameScene, true, data);
      },
      savedCount: () => listGames(store).length,
      onShelf: () => {
        shelf.open(listGames(store));
        show(shelf.element);
      },
    },
    // The AI when it answers, our own pre-made options when it does not.
    maker,
  );
  const title = createTitleCard(
    () => {
      show(menu);
      if (trick) host.resume();
      else game.scene.resume(SCENE);
    },
    () => {
      // Back to the questions, every answer kept.
      host.stop();
      if (game.scene.getScene(SCENE)) game.scene.remove(SCENE);
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      show(pick.element);
      pick.reopen();
    },
  );
  const end = createEndCard({
    change: (text) => change(text),
    onResume: () => {
      show(menu);
      if (trick) host.resume();
      else game.scene.resume(SCENE);
    },
    onReplay: () => current && play(current, trick),
    // The world he fell in, from its start, at once.
    onRetry: (run) => current && play(current, undefined, '', { run, direct: true }),
    onNew: () => {
      host.stop();
      // Clear the share link from the address, so a reload starts fresh too.
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      show(pick.element);
      pick.openNew();
    },
    // A written game carries its script in the link, after the settings.
    link: () => shareLink(window.location.href, current!) + (trickJs ? `&js=${trickJs}` : ''),
    isSaved: () => current !== undefined && isSaved(store, current, trickJs),
    toggleSaved: () => {
      if (!current) return false;
      if (isSaved(store, current, trickJs)) deleteGame(store, encodeSettings(current) + (trickJs ? `&js=${trickJs}` : ''));
      else saveGame(store, current, Date.now(), trickJs);
      return isSaved(store, current, trickJs);
    },
  });
  const shelf = createShelf({
    onPlay: (saved) => void open(saved.settings, saved.js),
    onDelete: (id) => deleteGame(store, id),
    onBack: () => {
      show(pick.element);
      pick.openNew();
    },
  });
  const menu = button('btn menu', 'Menu', () => {
    if (!current) return;
    if (trick) host.pause();
    else game.scene.pause(SCENE);
    over = false;
    const scene = trick ? null : (game.scene.getScene(SCENE) as GameScene | null);
    end.open(current, undefined, scene?.progressLine());
    show(end.element);
  });
  menu.hidden = true;
  root.append(pick.element, title.element, end.element, shelf.element, menu, toast);

  /** Show one part of the interface and hide the others. */
  function show(part: HTMLElement): void {
    for (const other of [pick.element, title.element, end.element, shelf.element, menu]) other.hidden = other !== part;
  }

  /** Open a game from a link or from the shelf. A packed script is unpacked and test-run before it is played. */
  async function open(settings: Settings, js = ''): Promise<void> {
    const code = js ? await unpackTrick(js) : null;
    if (!code) return play(settings, undefined, js ? 'The written game could not be read, so this is the nearest one.' : '');
    const verdict = await testTrick(code);
    if (verdict.ok) play(settings, code);
    else play(settings, undefined, 'The written game did not pass its test, so this is the nearest one.');
  }

  function say(line: string): void {
    toast.textContent = line;
    toast.hidden = line === '';
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => (toast.hidden = true), 2600);
  }

  /**
   * The player asked, from the pause menu, to change the game on screen. A change the
   * blocks can make rebuilds the adventure where he stood; anything else, and every
   * written game, has its script changed by the AI. Either way play goes straight on.
   */
  async function change(text: string): Promise<{ ok: boolean; line: string }> {
    if (!current) return { ok: false, line: '' };
    const settings = current;
    const code = trick;
    // Where he stands now, so a rebuilt adventure carries on from here.
    const scene = code || over ? null : (game.scene.getScene(SCENE) as GameScene | null);
    const resume = scene?.snapshot();
    const made = await maker.change(settings, text, testTrick, code);
    // The game moved on while the AI worked (the player left the menu): leave it alone.
    if (current !== settings) return { ok: false, line: '' };
    if (made.kind === 'refused') return { ok: false, line: 'Can’t make that. Try other words.' };
    if (made.kind === 'failed') {
      if (import.meta.env.DEV) console.info('The change failed:', made.reason);
      return { ok: false, line: 'Could not change that. The game is as it was.' };
    }
    // The game stays the flower boy's road: a change that would turn it into another kind of game is not made.
    if (made.kind === 'code' && !code) return { ok: false, line: 'That would be another game. Try a change to this one.' };
    if (made.kind === 'settings') {
      // The same game, changed: it keeps its name.
      play(repairSettings({ ...made.settings, title: settings.title, intro: settings.intro }), undefined, '', { resume, direct: true });
      say(made.heard);
    } else {
      play(repairSettings({ ...made.settings, title: made.title || settings.title }), made.code, '', { direct: true });
      say('Changed.');
    }
    return { ok: true, line: '' };
  }

  /**
   * Build the game these settings describe and put its title card up.
   * With `code`, the game is one the AI wrote: it plays in the locked frame instead.
   * With `direct`, there is no title card: play starts at once (after a change), and an
   * adventure carries on from `resume`.
   */
  function play(settings: Settings, code?: string, notice = '', how: { resume?: Resume; direct?: boolean; run?: RunState } = {}): void {
    host.stop();
    over = false;
    previewKey = '';
    trick = code;
    trickJs = '';
    current = settings;
    prepareCreatureLooks(settings.creatures);
    prepareWeaponLook(settings.weapon);
    setPalette(root, settings.palette);
    // The address always holds the share link of the game on screen.
    window.history.replaceState(null, '', `#${encodeSettings(settings)}`);
    if (code) {
      void packTrick(code).then((js) => {
        if (trick !== code) return;
        trickJs = js;
        window.history.replaceState(null, '', `#${encodeSettings(settings)}&js=${js}`);
      });
    }

    if (game.scene.getScene(SCENE)) game.scene.remove(SCENE);
    if (code) {
      // A written game shows its own first picture behind the title card, and waits there.
      host.play(
        code,
        settings.seed,
        settings.palette,
        {
          onOver: (won, score) => {
            end.open(settings, { won, petals: 0, defeated: 0, score });
            show(end.element);
          },
          // It passed its test run and still broke: the nearest game from the blocks takes over.
          onBroke: () => play(settings, undefined, 'The written game broke, so this is the nearest one.'),
        },
        !how.direct,
      );
    } else {
      const data: GameData = how.resume ? { settings, debug, resume: how.resume } : how.run ? { settings, debug, run: how.run } : { settings, debug };
      game.scene.add(SCENE, GameScene, true, data);
      // The game waits behind the title card. Paused here, at once, so that a quick
      // tap on Play can never arrive before the pause does.
      if (!how.direct) game.scene.pause(SCENE);
    }

    if (how.direct) return show(menu);
    title.open(settings, notice, code !== undefined);
    show(title.element);
  }

  game.events.on(FINISHED, (finish: Finish) => {
    if (!current || trick) return;
    over = true;
    game.scene.pause(SCENE);
    end.open(current, finish);
    show(end.element);
  });

  // A share link pasted into a tab that already has the game open.
  window.addEventListener('hashchange', () => {
    const shared = decodeSettings(window.location.hash);
    if (shared) void open(shared, new URLSearchParams(window.location.hash.slice(1)).get('js') ?? '');
  });

  const begin = () => {
    const shared = decodeSettings(window.location.hash);
    if (shared) void open(shared, new URLSearchParams(window.location.hash.slice(1)).get('js') ?? '');
    else pick.openNew();
  };
  // For the trial (development only): write a game for a wish and test-run it, without playing it.
  if (import.meta.env.DEV) {
    (window as unknown as { __trial: (wish: string) => unknown }).__trial = (wish) => maker.trick(repairSettings({ seed: 1 }), wish, testTrick);
    // And to look at a script of our own in the frame, without going through the maker.
    (window as unknown as { __play: (code: string) => void }).__play = (code) => play(repairSettings({ seed: 1 }), code);
    (window as unknown as { __host: unknown }).__host = host;
  }
  // Scenes can only be added and paused once Phaser's scene manager is up.
  if (game.scene.isBooted) begin();
  else game.events.once('ready', begin);
}
