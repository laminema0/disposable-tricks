// The app's side of the locked frame. It puts the frame on the page, hands it a script,
// and listens. The frame is sandboxed with "allow-scripts" only: it has no origin, so it
// cannot read this page, its storage, the share link or the AI endpoint, and its own policy
// gives it no network. All this file ever receives from it are small messages, and it
// trusts none of them beyond their shape.

import { frameFigures } from '../game/kit';
import type { Palette } from '../settings/schema';

export interface TrickVerdict {
  ok: boolean;
  /** What went wrong, in words a model can act on. Empty when it worked. */
  message: string;
}

export interface TrickEvents {
  /** The game inside ended. */
  onOver(won: boolean, score: number): void;
  /** The script broke or froze while it was being played. */
  onBroke(message: string): void;
}

export interface TrickHost {
  /** Run six seconds of made-up play, hidden. Says whether the script works. */
  check(code: string, seed: number): Promise<TrickVerdict>;
  /** Show the frame and start the script. With `held`, it shows its first picture and waits for resume(). */
  play(code: string, seed: number, palette: Palette, events: TrickEvents, held?: boolean): void;
  pause(): void;
  resume(): void;
  /** Show a still picture of a written game's look behind the maker: its backdrop, the hero and a few monsters. */
  preview(look: FramePreview, palette: Palette): void;
  /** Stop the script and take the frame off the screen. */
  stop(): void;
}

export interface FramePreview {
  scene: 'road' | 'sky' | 'space' | 'room';
  vehicle: '' | 'car' | 'bike' | 'ship' | 'wings';
  monsters: string[];
  /** Where the hero stands, as a share of the screen's width. */
  at: number;
}

/** How long the app waits for the frame to answer a check, in milliseconds. */
const CHECK_PATIENCE = 6000;

export function createTrickHost(parent: HTMLElement): TrickHost {
  let frame: HTMLIFrameElement | undefined;
  let ready: Promise<void> | undefined;
  let onMessage: ((data: Record<string, unknown>) => void) | undefined;
  let playing = false;
  let page: Promise<string> | undefined;

  function build(): Promise<void> {
    frame?.remove();
    const node = document.createElement('iframe');
    // Scripts, and nothing else: no same-origin, no forms, no pop-ups, no top navigation.
    node.setAttribute('sandbox', 'allow-scripts');
    node.setAttribute('referrerpolicy', 'no-referrer');
    node.title = 'Game';
    node.className = 'trick-frame';
    node.hidden = true;
    frame = node;
    ready = new Promise((resolve) => {
      const listen = (event: MessageEvent) => {
        if (event.source !== node.contentWindow) return;
        const data = (typeof event.data === 'object' && event.data !== null ? event.data : {}) as Record<string, unknown>;
        if (data.type === 'ready') resolve();
        else onMessage?.(data);
      };
      window.addEventListener('message', listen);
      // When this frame is replaced, its listener goes with it.
      const watcher = new MutationObserver(() => {
        if (!node.isConnected) {
          window.removeEventListener('message', listen);
          watcher.disconnect();
        }
      });
      watcher.observe(parent, { childList: true });
    });
    // The frame's page is fetched as text and given to the frame directly. Loaded this way the
    // sandbox still gives it no origin, and its own policy still gives it no network.
    // The drawings of the merged monsters and the boss go in with it, as data.
    page ??= fetch(`${import.meta.env.BASE_URL}trick-frame.html`)
      .then((reply) => reply.text())
      .then((html) => html.replace('/*FIGURES*/{}', JSON.stringify(frameFigures())));
    void page.then((html) => {
      node.srcdoc = html;
      parent.append(node);
    });
    return ready;
  }

  const send = (message: Record<string, unknown>) => frame?.contentWindow?.postMessage(message, '*');

  // Keys pressed on the page are passed on while a trick is played.
  const key = (down: boolean) => (event: KeyboardEvent) => {
    if (playing && !(event.target instanceof HTMLInputElement)) send({ type: 'key', code: event.code, down });
  };
  window.addEventListener('keydown', key(true));
  window.addEventListener('keyup', key(false));

  return {
    async check(code, seed) {
      await (ready ?? build());
      return new Promise<TrickVerdict>((resolve) => {
        const timer = window.setTimeout(() => {
          onMessage = undefined;
          // A frame that stopped answering is thrown away, script and all.
          void build();
          resolve({ ok: false, message: 'It froze: the test run did not finish. Avoid loops that never end.' });
        }, CHECK_PATIENCE);
        onMessage = (data) => {
          if (data.type !== 'checked') return;
          window.clearTimeout(timer);
          onMessage = undefined;
          resolve({ ok: data.ok === true, message: typeof data.message === 'string' ? data.message.slice(0, 300) : '' });
        };
        send({ type: 'check', code, seed });
      });
    },

    play(code, seed, palette, events, held = false) {
      void (ready ?? build()).then(() => {
        if (!frame) return;
        frame.hidden = false;
        playing = true;
        onMessage = (data) => {
          if (data.type === 'over') events.onOver(data.won === true, typeof data.score === 'number' ? data.score : 0);
          else if (data.type === 'broke') events.onBroke(typeof data.message === 'string' ? data.message.slice(0, 200) : '');
        };
        send({ type: 'play', code, seed, palette, held });
      });
    },

    preview(look, palette) {
      void (ready ?? build()).then(() => {
        if (!frame) return;
        frame.hidden = false;
        playing = false;
        onMessage = undefined;
        send({ type: 'preview', ...look, palette });
      });
    },

    pause: () => send({ type: 'pause' }),
    resume: () => send({ type: 'resume' }),

    stop() {
      playing = false;
      onMessage = undefined;
      send({ type: 'stop' });
      if (frame) frame.hidden = true;
    },
  };
}
