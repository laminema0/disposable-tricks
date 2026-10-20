// Game rules as pure functions. Numbers from docs/build-brief.md section 3.6.

import { HEALTH, LIGHT, STRIKE, WATCHER } from './config';

export interface HideCheck {
  lying: boolean;
  inHideSpot: boolean;
  /** Light level where the hero is, 0 to 1. */
  light: number;
}

/** Hidden: lying down in a hide spot where the light is low. */
export function isHidden(check: HideCheck, hiddenBelow = LIGHT.hiddenBelow): boolean {
  return check.lying && check.inHideSpot && check.light < hiddenBelow;
}

/** Bright enough for enemies to see him. */
export function isSeen(light: number, hidden: boolean, seenAbove = LIGHT.seenAbove): boolean {
  return !hidden && light > seenAbove;
}

// ---- sight ------------------------------------------------------------------

export interface SightCheck {
  /** Light level where the hero is, 0 to 1. */
  light: number;
  hidden: boolean;
  /** How far the hero is from the monster, in pixels. */
  distance: number;
  /** How far this monster can see. */
  range: number;
}

/**
 * The one sight rule for every monster: it sees him when he is lit above 0.35,
 * not hidden, and close enough. The moment he hides or steps into the dark, it loses him.
 */
export function monsterSees(check: SightCheck, seenAbove = LIGHT.seenAbove): boolean {
  return isSeen(check.light, check.hidden, seenAbove) && Math.abs(check.distance) <= check.range;
}

// ---- hearts: the petals of his flower ---------------------------------------

export interface Health {
  /** 0 to 5. At 0 the run is over. */
  petals: number;
  /** Flowers collected towards the next petal. */
  flowers: number;
  /** Seconds left in which he cannot be hurt. */
  safe: number;
}

export function newHealth(): Health {
  return { petals: HEALTH.petals, flowers: 0, safe: 0 };
}

/** Time passing: the safety after a hit runs out. */
export function tickHealth(health: Health, dt: number): Health {
  return health.safe > 0 ? { ...health, safe: Math.max(0, health.safe - dt) } : health;
}

/** A hit. It removes one petal and gives a second of safety; during that second it does nothing. */
export function hurt(health: Health, safeTime = HEALTH.safeTime): Health {
  if (health.safe > 0 || health.petals <= 0) return health;
  return { ...health, petals: health.petals - 1, safe: safeTime };
}

/**
 * One flower picked up. Every `perPetal` flowers regrow a petal.
 * With all petals in place, flowers are kept (one short of a petal at most) for later.
 */
export function collectFlower(health: Health, perPetal = HEALTH.flowersPerPetal): Health {
  const flowers = health.flowers + 1;
  if (flowers < perPetal) return { ...health, flowers };
  if (health.petals >= HEALTH.petals) return { ...health, flowers: perPetal - 1 };
  return { ...health, petals: health.petals + 1, flowers: flowers - perPetal };
}

// ---- fighting ---------------------------------------------------------------

/** A strike made within half a second of being hidden is a sneak attack. */
export function isSneakAttack(secondsSinceHidden: number, window = STRIKE.sneakWindow): boolean {
  return secondsSinceHidden <= window;
}

/** Hits a monster has left after one strike. A sneak attack defeats in one hit. */
export function hitsAfterStrike(hitsLeft: number, sneak: boolean): number {
  return sneak ? 0 : Math.max(0, hitsLeft - 1);
}

// ---- the Watcher's countdown ------------------------------------------------

export interface Gaze {
  /** Seconds he has been in the gaze, 0 to the countdown. */
  time: number;
  /** True on the step the countdown ran out: he loses a petal and it starts again. */
  expired: boolean;
}

/** One step of the countdown. It runs only while the beam exposes him, and resets the moment it does not. */
export function stepGaze(time: number, exposed: boolean, dt: number, countdown = WATCHER.countdown): Gaze {
  if (!exposed) return { time: 0, expired: false };
  const next = time + dt;
  return next >= countdown ? { time: 0, expired: true } : { time: next, expired: false };
}

/** Size of the Watcher's pupil, 1 at rest down to 0.2 when time is up. */
export function pupilSize(gazeTime: number, countdown = WATCHER.countdown): number {
  return 1 - 0.8 * Math.min(1, Math.max(0, gazeTime / countdown));
}

/** Seconds between two ticks of the countdown sound. It speeds up. */
export function tickGap(gazeTime: number, countdown = WATCHER.countdown): number {
  const t = Math.min(1, Math.max(0, gazeTime / countdown));
  return WATCHER.tickSlow + (WATCHER.tickFast - WATCHER.tickSlow) * t;
}
