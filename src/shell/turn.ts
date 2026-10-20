// The "turn your phone" screen. The game is played with the phone on its side.
// iPhone browsers cannot lock the rotation and Android only can for an installed app,
// so a phone held upright gets this screen instead of a squeezed game.
// It never shows on a desktop browser, however narrow the window is.

import type Phaser from 'phaser';

/** The key of the game scene (the same name src/ui/app.ts gives it). */
const SCENE = 'game';

/** A phone or tablet: it has a touch screen and no mouse as its main pointer. */
export function isTouchDevice(): boolean {
  if (navigator.maxTouchPoints < 1) return false;
  return window.matchMedia('(pointer: coarse)').matches || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

/** The rotation lock exists on Android Chrome only, and only while the page is full screen. */
function canTurnItself(): boolean {
  const orientation = window.screen.orientation as (ScreenOrientation & { lock?: unknown }) | undefined;
  return typeof document.documentElement.requestFullscreen === 'function' && typeof orientation?.lock === 'function';
}

async function turnItself(): Promise<void> {
  try {
    await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
    const orientation = window.screen.orientation as ScreenOrientation & { lock(type: string): Promise<void> };
    await orientation.lock('landscape');
  } catch {
    // The browser said no. The screen stays up and the player turns the phone by hand.
  }
}

export function startTurnScreen(game: Phaser.Game): void {
  if (!isTouchDevice()) return;

  const screen = document.createElement('section');
  screen.className = 'turn';
  screen.hidden = true;
  screen.setAttribute('role', 'status');

  const phone = document.createElement('div');
  phone.className = 'phone';
  phone.setAttribute('aria-hidden', 'true');
  const heading = document.createElement('h1');
  heading.textContent = 'Turn your phone sideways';
  const line = document.createElement('p');
  line.textContent = 'Nothing happens? Switch off rotation lock.';
  screen.append(phone, heading, line);

  if (canTurnItself()) {
    const turn = document.createElement('button');
    turn.type = 'button';
    turn.textContent = 'Turn it for me';
    turn.addEventListener('click', () => void turnItself());
    screen.append(turn);
  }
  document.body.append(screen);

  const upright = window.matchMedia('(orientation: portrait)');
  /** True when this screen paused a running game, so it knows to start it again. */
  let pausedByTurn = false;

  function update(): void {
    const show = upright.matches;
    if (show === !screen.hidden) return;
    screen.hidden = !show;
    // Nothing behind the screen can be tapped or reached with a keyboard.
    for (const id of ['game', 'ui']) document.getElementById(id)?.toggleAttribute('inert', show);

    if (show && game.scene.isActive(SCENE)) {
      game.scene.pause(SCENE);
      pausedByTurn = true;
    } else if (!show && pausedByTurn) {
      pausedByTurn = false;
      if (game.scene.isPaused(SCENE)) game.scene.resume(SCENE);
    }
  }

  upright.addEventListener('change', update);
  window.addEventListener('resize', update);
  // A phone turned while the page was in the background says so only when the page comes back.
  document.addEventListener('visibilitychange', update);
  update();
}
