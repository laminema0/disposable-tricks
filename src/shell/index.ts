// The shell around the app: what a phone needs that is neither the game nor the pick screens.

import type Phaser from 'phaser';
import { startLegalLine } from './legal';
import { startTurnScreen } from './turn';
import './shell.css';

/** Call after the app has built its interface. */
export function startShell(game: Phaser.Game): void {
  startTurnScreen(game);
  startLegalLine();
}
