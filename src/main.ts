import Phaser from 'phaser';
import { MAX_VIEW_W, MIN_VIEW_W, VIEW_H } from './game/config';
import { startShell } from './shell';
import { startApp } from './ui/app';

/** The game is always VIEW_H tall. Its width follows the shape of the screen, so it fills a phone held sideways. */
function viewWidth(): number {
  const aspect = window.innerWidth / Math.max(1, window.innerHeight);
  return Math.round(Phaser.Math.Clamp(VIEW_H * aspect, MIN_VIEW_W, MAX_VIEW_W));
}

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#070a14',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: viewWidth(),
    height: VIEW_H,
  },
  input: { activePointers: 3 },
  // The game scene is added by the app once the player has made a game (or opened a share link).
  scene: [],
});

function fit(): void {
  // Phaser has to measure the page before the game changes size. Without this it fits the game
  // to the shape the page had before, and a phone turned onto its side keeps a small picture.
  game.scale.getParentBounds();
  const width = viewWidth();
  if (width !== game.scale.width) game.scale.setGameSize(width, VIEW_H);
  else game.scale.refresh();
}
window.addEventListener('resize', fit);
// Some phones report their new size a moment after they are turned.
window.addEventListener('orientationchange', () => window.setTimeout(fit, 300));

startApp(game);
// After the app, so the shell finds the screens it adds to.
startShell(game);
