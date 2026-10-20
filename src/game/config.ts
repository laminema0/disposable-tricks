// Every tunable number of milestone 1 lives here.
// The values come from BUILD_BRIEF.md sections 3.5 and 3.6 and are first guesses.

/** The game is always this tall in game pixels. The width follows the screen shape. */
export const VIEW_H = 400;
/** One "screen" of level. A level chunk is this wide. */
export const SCREEN_W = 960;
export const MIN_VIEW_W = 540;
export const MAX_VIEW_W = 980;

/** Height of the ground line, measured from the top of the view. */
export const GROUND_Y = 330;

export const LEVEL_SCREENS = 8;
/** After the last chunk the road ends in an empty clearing this wide: the planting place. */
export const END_CLEARING = 400;

export const HERO = {
  speed: 220, // px per second
  height: 100, // used for the jump height
  jumpHeights: 1.6, // jump height in hero heights
  gravity: 1800, // px per second squared
  crawlSpeed: 70, // px per second while lying down
  lungePx: 48,
  lungeTime: 0.12, // seconds the lunge takes
  reach: 70,
  strikeCooldown: 0.35,
  /** How quickly he gets up to speed, slows down, turns round, and steers in the air (px per second squared). */
  accel: 2100,
  decel: 2800,
  turn: 3600,
  airAccel: 1400,
  /** Seconds after leaving the edge in which a jump still works, and how early a jump press is remembered. */
  coyote: 0.1,
  jumpBuffer: 0.13,
  /** Gravity is stronger falling than rising, stronger again when the jump is let go early, lighter at the top. */
  fallGravity: 1.5,
  shortHopGravity: 2.2,
  apexGravity: 0.6,
  maxFall: 950,
};

export const LIGHT = {
  ambient: 0.04, // the light level of full darkness
  hiddenBelow: 0.15,
  seenAbove: 0.35,
};

/** Touch thresholds, in screen (CSS) pixels and milliseconds. */
export const TOUCH = {
  tapMaxMs: 200,
  tapMaxMovePx: 12,
  /** Controls research, 19 Oct: 40 px was a long way to drag; a quick flick of half that also counts. */
  dragPx: 28,
  flickPx: 14,
  /** Finger speed, px per ms, that makes a short drag a flick. */
  flickSpeed: 0.5,
  /** He starts walking only after the finger has been held this long, so a tap to strike does not step him. */
  walkDelayMs: 80,
  /** While lying down, sliding the same finger this far sideways crawls that way. */
  crawlPx: 28,
};

/** Shots from a ranged or thrown weapon. */
export const SHOT = {
  arrowSpeed: 560, // px per second, flies level
  bulletSpeed: 880,
  throwSpeed: 330, // px per second forward
  throwUp: 250, // and upward at the start
  gravity: 900,
};

// ---- milestone 2: monsters, hearts, flowers (brief 3.2 to 3.4 and 3.6) ----

export const HEALTH = {
  petals: 5,
  safeTime: 1.5, // seconds he cannot be hurt after losing a petal (19 Oct difficulty pass: was 1)
  flowersPerPetal: 10,
  flowersPerPetalFast: 5, // with the "fast flowers" twist
  /** Falling into a pit costs a petal. Set to false to make pits harmless again. */
  pitCostsPetal: true,
};

/**
 * Weapon charges (Amin, 18 Oct): a weapon cannot be used all the time. It holds a few charges; each strike or shot
 * uses one, and they come back one at a time. Three quick taps throw a blade at a monster; it then lies where it
 * fell until he picks it up.
 */
export const WEAPON_USE = {
  /** Amin, 18 Oct evening: four is better than three. */
  charges: 4,
  /** Seconds for one charge to come back. */
  recharge: 8,
  /** Three taps within this many seconds throw the weapon. */
  tripleTap: 0.6,
  throwSpeed: 640,
  /** How far a thrown weapon flies before it drops. */
  throwRange: 520,
  /** Hits a thrown weapon deals: enough to fell almost anything. */
  throwPower: 4,
  /** How close he must come to pick it up again. */
  pickUp: 30,
};

/** Flowers are rare (Amin, 18 Oct): only some monsters drop them, and fewer. */
export const DROPS = {
  /** The chance a defeated monster drops flowers. Bosses always do. */
  chance: 0.6,
  /** With "Fertile ground". */
  chanceFertile: 0.6,
  /** Of the flowers a monster used to give, this share. */
  share: 1,
};

/** How far the sound of his feet in water carries. */
export const NOISE = { step: 300, landing: 420 };

export const STRIKE = {
  activeTime: 0.16, // seconds the blade can hit after a strike begins
  up: 125, // how far above his feet the blade reaches
  /** A strike this soon after being hidden is a sneak attack: one hit defeats. */
  sneakWindow: 0.5,
};

/** How many monsters a level holds, by difficulty 1 to 3. */
export const MONSTER_COUNT = [0, 5, 8, 11];
/** Extra Watchers with the "more Watchers" twist. */
export const EXTRA_WATCHERS = 2;
/** No monster stands closer than this to the start or the end of the road. */
export const SAFE_START = 1150;
export const SAFE_END = 760;

export const WATCHER = {
  countdown: 5, // seconds in its gaze before a petal is lost
  range: 330, // length of the beam
  spread: 0.25, // the beam grows this much taller per pixel of length
  beamLight: 0.8, // light level the beam puts on him
  turnEvery: 4.5, // seconds it looks one way
  turnTime: 0.6, // seconds the beam is off while it turns
  tickSlow: 0.8, // seconds between ticks when the countdown starts
  tickFast: 0.13, // and when it is about to end
};

export const FLOWER = {
  gravity: 900,
  pull: 85, // he draws flowers in from this far
  take: 24,
  pickDelay: 0.35, // seconds before a fresh flower can be picked up
};

/** The planting place stands this far before the end of the level. */
export const GOAL_FROM_END = 170;

/** The boss at the end of the road. First guesses, to tune in play. */
export const BOSS = {
  hits: 9,
  /** Strikes that end one phase. Pulling its root ends a phase at once. */
  perPhase: 3,
  /** Seconds its eye stays open, and shut, in each of its three phases. */
  open: [3.5, 4.5, 5.5],
  shut: [3, 2.2, 1.6],
  /** Its gaze covers the ground from this near to this far in front of it. */
  near: 30,
  range: 520,
  /** Its gaze costs a petal after this long: half a Watcher's time. */
  countdown: 2.5,
  /** Once its eye has found him: hidden inside its gaze for this long, and it loses him and is dazed. By phase. */
  loseAfter: [1, 1.5, 2],
  /** Seconds it stays dazed, by phase. */
  daze: [4.5, 3.8, 3.2],
  /** Seconds between spits in each phase. 0 means it does not spit yet. */
  spit: [0, 1.7, 1.1],
  /** How close to its stem he must be to pull its root while it is dazed. */
  pull: 46,
  flowers: 26,
};
/** The share of a level's monsters that are merges, by difficulty 1 to 3. They stand in the later part of the road. */
export const MERGE_SHARE = [0, 0.2, 0.4, 0.55];
/** From this difficulty up, a boss waits before the planting place. */
export const BOSS_FROM = 2;
/** The boss's clearing: how long it is, and where things stand in it, from its start. */
export const ARENA = { width: 700, grass: [120, 230], rock: [330, 380], boss: 560 };
