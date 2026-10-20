// The five monsters: what they are made of and how they behave (brief 3.4 and 3.6).
// No game engine in here, so the behaviour can be unit tested. monsterView.ts draws them.

import type { Creature, Enemy } from '../settings/schema';
import type { Design } from './creatures';
import { BOSS, GROUND_Y, WATCHER } from './config';
import { BOSS_POINTS, type Figure } from './kit';
import { hitsAfterStrike, monsterSees, stepGaze, tickGap } from './rules';
import { inSight, SIGHTS, type SightShape, type Target } from './sight';

// ---- parts ------------------------------------------------------------------
// Every monster is a mix of four parts. A merged monster (later) is a new mix.

export type BodyPart = 'lump' | 'stem' | 'orb' | 'torso' | 'ball';
export type MoverPart = 'feet' | 'leaves' | 'wings' | 'limbs' | 'none';
export type HeadPart = 'ears' | 'jaw' | 'knob' | 'spikes';
export type EyePart = 'pair' | 'dot' | 'big';

export interface Parts {
  body: BodyPart;
  mover: MoverPart;
  head: HeadPart;
  eye: EyePart;
}

export interface MonsterSpec {
  parts: Parts;
  /** Strikes it takes to defeat (brief 3.6). */
  hits: number;
  /** Flowers it bursts into. */
  flowers: number;
  /** Its body for touching and for being struck: half its width, and its height. */
  halfW: number;
  height: number;
  /** How far it can see him. */
  sight: number;
  /** Touching it costs a petal. */
  touch: boolean;
  /** For a flying monster: how high above the ground its underside hovers. */
  fly?: number;
}

export const MONSTERS: Record<Enemy, MonsterSpec> = {
  crawler: {
    parts: { body: 'lump', mover: 'feet', head: 'ears', eye: 'pair' },
    hits: 1,
    flowers: 5,
    halfW: 24,
    height: 44,
    sight: 330,
    touch: true,
  },
  thorn: {
    parts: { body: 'stem', mover: 'leaves', head: 'jaw', eye: 'dot' },
    hits: 2,
    flowers: 7,
    halfW: 16,
    height: 108,
    sight: 380,
    touch: true,
  },
  flyer: {
    parts: { body: 'orb', mover: 'wings', head: 'ears', eye: 'pair' },
    hits: 1,
    flowers: 5,
    halfW: 16,
    height: 28,
    sight: 300,
    touch: true,
    fly: 128,
  },
  stalker: {
    parts: { body: 'torso', mover: 'limbs', head: 'knob', eye: 'dot' },
    hits: 2,
    flowers: 7,
    halfW: 13,
    height: 150,
    sight: 420,
    touch: true,
  },
  watcher: {
    parts: { body: 'ball', mover: 'none', head: 'spikes', eye: 'big' },
    hits: 3,
    flowers: 10,
    halfW: 30,
    height: 64,
    sight: WATCHER.range,
    touch: false,
  },
};

/** How each monster moves and attacks. First guesses, to tune in play. */
export const MOVES = {
  crawler: { patrol: 40, roam: 110, windup: 0.5, charge: 290, chargeTime: 1.1, rest: 0.7 },
  /** A Stalker with nothing to look at turns round this often, in seconds. */
  stalkerTurn: 5,
  thorn: { aim: 0.5, rest: 1.3, shotSpeed: 300, shotLife: 1.8 },
  /** The flyer is a diver (design research, 19 Oct): it dives in a straight line to where he was, then lies stuck. */
  flyer: { roam: 90, windup: 0.6, dive: 0.5, stuck: 0.8, recover: 0.9, low: 52 },
  stalker: { walk: 60, home: 30, reach: 125, startSwipe: 100, windup: 0.7, swipe: 0.25, rest: 0.8 },
  stun: 0.4,
  knock: 26,
};

/**
 * Hunting (Amin, 18 Oct): a monster that has seen him hunts him. It goes to where it last saw him, even past its
 * usual patch, and searches there before it gives up. Hiding is how he shakes it off. A splash it hears close by
 * brings it to look too.
 */
export const HUNT = {
  /** Seconds it keeps hunting after it last saw him. */
  memory: 4.5,
  /** Seconds it comes to look after hearing him. */
  listen: 3.2,
  /** How fast it moves while hunting, times its usual walk. */
  crawlerRun: 3.2,
  stalkerRun: 1.6,
  flyerDrift: 120,
  /** Searching where he was: it looks one way, then the other, this often. */
  lookAround: 0.8,
};

/**
 * Noticing (design research, 19 Oct: suspicious before alerted, a grace window, "transparent AI"): a monster that
 * catches sight of him first turns to him and holds still, its eyes amber, while its certainty fills. Only when it
 * is full does it have him and act. Close and in strong light that takes a moment; at the edge of its sight, longer.
 * Out of its sight, the certainty drains away.
 */
export const NOTICE = {
  /** Seconds to be sure of him right in front of it, and at the far edge of its sight. */
  near: 0.35,
  far: 1.2,
  /** How fast certainty drains once he is out of its sight, per second. */
  drain: 0.9,
};

/**
 * Sensing (Amin, 19 Oct: monsters must find him and attack "within three to five seconds"). Close to a monster he
 * is found even in the dark or behind its back: it smells or hears him, more slowly than it would see him in light.
 * Only lying hidden in cover keeps him from it.
 */
export const SENSE = {
  /** How close he must be, in pixels. */
  range: 240,
  /** Seconds it takes to be sure of him by sensing alone. */
  time: 3,
};

/** How much the monsters have grown with his skills (run.ts, threat). */
export interface Growth {
  /** Extra hits each takes. */
  toughness: number;
  /** Times their speed. */
  pace: number;
  /** Times how far they see. */
  sight: number;
}

// ---- state ------------------------------------------------------------------

export interface Spawn {
  kind: Enemy;
  x: number;
  /** A ground monster never leaves this stretch (it ends at pits). */
  minX: number;
  maxX: number;
  /** For a described monster: its body, sight and speed. `kind` is then the behaviour that drives it. */
  design?: Design;
}

export type MonsterState = 'idle' | 'walk' | 'windup' | 'attack' | 'rest' | 'recover' | 'turn';

export interface Monster {
  id: number;
  kind: Enemy;
  spec: MonsterSpec;
  /** The shape its eye throws. Undefined for a beam. */
  sight: SightShape | undefined;
  /** 1 is the usual speed of its kind. */
  speed: number;
  /** Set for a described monster. */
  creature?: Creature;
  /** A merge: the second kind it also is. Its attack and its way of seeing are added to the first. */
  also?: Enemy;
  extraSight?: SightShape;
  /** Where its beam starts: this far ahead of its middle, this high above its base. */
  eye?: { ahead: number; up: number };
  /** What it is drawn from, when it is built from the kit. */
  figure?: Figure;
  name?: string;
  /** Set for the boss. */
  boss?: BossState;
  /** True for the one step in which he pulled the boss's root. The scene shows it and clears it. */
  pulled?: boolean;
  /** Seconds until a merge may spit, or swipe, again; and the swipe it is winding up. */
  spitIn: number;
  swipeIn: number;
  swipeT: number;
  x: number;
  /** The underside of its body. The ground line for everything that does not fly. */
  y: number;
  homeX: number;
  minX: number;
  maxX: number;
  facing: 1 | -1;
  hitsLeft: number;
  alive: boolean;
  state: MonsterState;
  /** Seconds in the current state. */
  t: number;
  /** Seconds it stays stunned after being struck. */
  stun: number;
  /** True while it sees him and is sure of him: it acts. */
  sees: boolean;
  /** How sure it is of him, 0 to 1. Between 0 and 1 it is suspicious: it turns to him and holds still. */
  notice: number;
  /** Seconds it goes on hunting him; and where it last saw or heard him. */
  hunt: number;
  lastX: number;
  /** Where it was placed: a flyer drifts back here once the hunt is over. */
  originX: number;
  /** A clock for idle motion (hovering, swaying). */
  phase: number;
  lastStrike: number;
  // Flyer: the dive goes from (ax, ay) straight to (bx, by), where he stood when it committed.
  ax: number;
  ay: number;
  bx: number;
  by: number;
  cx: number;
  // Watcher.
  /** Seconds he has been in its gaze. 0 when it is not exposing him. */
  gaze: number;
  exposing: boolean;
  tickIn: number;
}

export interface BossState {
  /** 0, 1 or 2: it gets harder as it is hurt. */
  phase: number;
  /** True while its eye is open. */
  open: boolean;
  /** Seconds into the open-and-shut of its eye. */
  cycle: number;
  /** True once its open eye has found him. Only then can hiding break its gaze. */
  found: boolean;
  /** Seconds he has been hidden inside its gaze since it found him. */
  lost: number;
  /** Seconds it stays dazed: eye shut, root bare. */
  daze: number;
  spitIn: number;
  /** While its soldiers fight him it waits, eye shut (the boss's dialogue, 19 Oct). */
  waiting?: boolean;
}

export interface Shot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  dead: boolean;
}

/** What the monsters need to know about the hero. */
export interface HeroState {
  x: number;
  /** His feet. */
  y: number;
  centreY: number;
  lying: boolean;
  hidden: boolean;
  /** Light level on him from the lights of the level, 0 to 1. */
  light: number;
  /** True when he is under a roof (an archway). Eyes in the sky cannot see him there. */
  roofed?: boolean;
  /** How far the sound he makes carries this step (a splash), in px. 0 or unset: silent. */
  noise?: number;
}

/** His outline as the monsters' eyes meet it: lying flat he is a third as tall. */
export function heroTarget(hero: HeroState): Target {
  return { x: hero.x, top: hero.y - (hero.lying ? 34 : 92), bottom: hero.y, roofed: hero.roofed === true };
}

export type MonsterSound = 'heard' | 'alert' | 'charge' | 'spit' | 'swoop' | 'swipe' | 'tick' | 'gaze';

export interface StepResult {
  /** Something hit him this step. */
  hurt: boolean;
  /** A Watcher's beam is on him and he is not hidden. */
  exposed: boolean;
  /** Light level on him with the beams added. */
  light: number;
  sounds: MonsterSound[];
  /** He bumped into a resting monster: no harm, but it pushes him this way (-1 or 1). */
  push?: -1 | 1;
}

export interface Box {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

const overlap = (a: Box, b: Box) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

export function heroBox(hero: HeroState): Box {
  return { x0: hero.x - 13, x1: hero.x + 13, y0: hero.y - (hero.lying ? 34 : 90), y1: hero.y };
}

export function monsterBox(m: Monster): Box {
  return { x0: m.x - m.spec.halfW, x1: m.x + m.spec.halfW, y0: m.y - m.spec.height, y1: m.y };
}

/** Where the eye with the beam is: the beam starts here. */
export function watcherEye(m: Monster): { x: number; y: number } {
  const eye = m.eye ?? { ahead: 14, up: 36 };
  return { x: m.x + m.facing * eye.ahead, y: m.y - eye.up };
}

/** How steeply a beam slants down, so that an eye held high still finds him on the ground. */
export function beamTilt(m: Monster): number {
  // How high the eye is held above the monster's own feet (it may stand on a mound).
  const up = m.y - watcherEye(m).y;
  return Math.max(0, (up - 46) / 250);
}

/** True when the boss's open eye covers this place on the ground. */
export function inBossGaze(m: Monster, x: number): boolean {
  if (!m.boss || !m.boss.open || m.boss.daze > 0 || m.stun > 0) return false;
  const ahead = (x - m.x) * m.facing;
  return ahead >= BOSS.near && ahead <= BOSS.range;
}

/** True when a point is inside the Watcher's beam. The beam is off while it turns. */
export function inBeam(m: Monster, x: number, y: number): boolean {
  if (m.state === 'turn' || m.stun > 0) return false;
  const eye = watcherEye(m);
  const ahead = (x - eye.x) * m.facing;
  if (ahead < 0 || ahead > WATCHER.range) return false;
  // He is taller than a point: 34 px of slack above and below.
  return Math.abs(y - (eye.y + ahead * beamTilt(m))) <= 6 + ahead * WATCHER.spread + 34;
}

export class MonsterWorld {
  readonly monsters: Monster[];
  readonly shots: Shot[] = [];
  /** Where the ground is at x: the road, or higher on a mound (level.ts groundAt). Flat unless the scene says. */
  ground: (x: number) => number = () => GROUND_Y;

  constructor(
    spawns: readonly Spawn[],
    private readonly grow: Growth = { toughness: 0, pace: 1, sight: 1 },
  ) {
    this.monsters = spawns.map((spawn, id) => this.make(spawn, id));
  }

  /** The shape of the ground (level.ts groundAt): walkers stand on it from now on. */
  setGround(ground: (x: number) => number): void {
    this.ground = ground;
    for (const m of this.monsters) if (!m.spec.fly && m.kind !== 'flyer') m.y = ground(m.x);
  }

  /** More monsters join (a boss calls its soldiers). Returns them. */
  summon(spawns: readonly Spawn[]): Monster[] {
    const added = spawns.map((spawn, i) => this.make(spawn, this.monsters.length + i));
    this.monsters.push(...added);
    return added;
  }

  private make(spawn: Spawn, id: number): Monster {
    const grow = this.grow;
    {
      const own = spawn.design?.spec ?? MONSTERS[spawn.kind];
      // Grown with his skills: harder to fell and further-sighted. The boss keeps its own count of hits.
      const spec = { ...own, hits: own.hits + (spawn.design?.boss ? 0 : grow.toughness), sight: Math.round(own.sight * grow.sight) };
      return {
        id,
        kind: spawn.kind,
        spec,
        sight: spawn.design ? spawn.design.sight : SIGHTS[spawn.kind],
        speed: (spawn.design?.speed ?? 1) * grow.pace,
        creature: spawn.design?.creature,
        also: spawn.design?.also,
        extraSight: spawn.design?.extraSight,
        eye: spawn.design?.eye,
        figure: spawn.design?.figure,
        name: spawn.design?.name,
        boss: spawn.design?.boss ? { phase: 0, open: true, cycle: 0, found: false, lost: 0, daze: 0, spitIn: 1 } : undefined,
        spitIn: 1,
        swipeIn: 0,
        swipeT: 0,
        x: spawn.x,
        y: (spec.fly ? GROUND_Y : this.ground(spawn.x)) - (spec.fly ?? 0),
        homeX: spawn.x,
        minX: spawn.minX,
        maxX: spawn.maxX,
        facing: -1, // they start looking back along the road, towards him
        hitsLeft: spec.hits,
        alive: true,
        state: 'idle',
        t: 0,
        stun: 0,
        sees: false,
        notice: 0,
        hunt: 0,
        lastX: spawn.x,
        originX: spawn.x,
        phase: id * 1.7,
        lastStrike: -1,
        ax: 0,
        ay: 0,
        bx: 0,
        by: 0,
        cx: 0,
        gaze: 0,
        exposing: false,
        tickIn: 0,
      };
    }
  }

  /** Move every monster and every shot one step of time. `dt` is in seconds. */
  step(dt: number, hero: HeroState): StepResult {
    const out: StepResult = { hurt: false, exposed: false, light: hero.light, sounds: [] };
    const alive = this.monsters.filter((m) => m.alive);

    // Watchers first: their beams change how lit he is for everyone else.
    for (const m of alive) {
      if (m.boss) this.stepBoss(m, dt, hero, out);
      else if (m.kind === 'watcher') this.stepWatcher(m, dt, hero, out);
      else if (m.also === 'watcher' && m.stun <= 0) this.gazeOn(m, !hero.hidden && inBeam(m, hero.x, hero.centreY), dt, out);
    }
    if (out.exposed) out.light = Math.max(out.light, WATCHER.beamLight);
    const lit: HeroState = { ...hero, light: out.light };

    const body = heroBox(hero);
    const target = heroTarget(hero);
    for (const m of alive) {
      if (m.kind === 'watcher') {
        // Bumping into the eye hurts too (Amin, 19 Oct: "when I bump into them, the character must be hurt").
        if (!hero.hidden && overlap(monsterBox(m), body)) out.hurt = true;
        continue;
      }
      // Seen = lit, not hidden, and inside the shape this monster's eye throws.
      // A merge sees in both of its ways; one with a beam also sees whoever stands in it.
      const within = (m.sight !== undefined && inSight(m.sight, m, target)) || (m.extraSight !== undefined && inSight(m.extraSight, m, target));
      const glimpse = (monsterSees({ light: lit.light, hidden: hero.hidden, distance: hero.x - m.x, range: m.spec.sight }) && within) || (m.also === 'watcher' && m.exposing);
      // It fills with certainty while he is in sight (faster when he is close), and acts only once it is sure.
      // Already hunting him, it is sure again at once.
      // A flyer cannot get at him under a roof, so it does not come for him there.
      const senses = !hero.hidden && !(hero.roofed && m.kind === 'flyer') && Math.abs(hero.x - m.x) <= SENSE.range;
      if (glimpse) {
        const far = Math.min(1, Math.abs(hero.x - m.x) / Math.max(1, m.spec.sight));
        const needs = m.hunt > 0 ? 0.05 : NOTICE.near + (NOTICE.far - NOTICE.near) * far;
        m.notice = Math.min(1, m.notice + dt / needs);
      } else if (senses) m.notice = Math.min(1, m.notice + dt / (m.hunt > 0 ? 0.3 : SENSE.time));
      else m.notice = Math.max(0, m.notice - dt * NOTICE.drain);
      const wasSure = m.sees;
      m.sees = (glimpse || senses) && m.notice >= 1;
      if (m.sees && !wasSure && m.hunt <= 0) out.sounds.push('alert');
      this.listen(m, dt, hero, out);
      // Suspicious, not yet sure: it turns to him and holds still, looking.
      if ((glimpse || (senses && m.notice > 0.25)) && !m.sees && m.state === 'idle' && m.stun <= 0) {
        m.facing = hero.x >= m.x ? 1 : -1;
        if (m.kind === 'crawler' || m.kind === 'stalker') continue;
      }
      if (m.stun > 0) {
        m.stun -= dt;
        continue;
      }
      if (m.kind === 'crawler') this.stepCrawler(m, dt, lit, out);
      else if (m.kind === 'thorn') this.stepThorn(m, dt, lit, out);
      else if (m.kind === 'flyer') this.stepFlyer(m, dt, lit, out);
      else this.stepStalker(m, dt, lit, out);
      if (m.also) this.stepAlso(m, dt, lit, out);
      // Walkers keep their feet on the ground, up and down the slopes of a mound.
      if (!m.spec.fly && m.kind !== 'flyer') m.y = this.ground(m.x);
      // Bumping into a monster always hurts (Amin, 19 Oct), whether or not it had noticed him, and it has him
      // at once: it turns on him and attacks. Only lying hidden in cover does it pass over him.
      // A monster at rest after its attack is spent: bumping into it only pushes him back (Amin, 19 Oct).
      if (!hero.hidden && m.state === 'rest' && overlap(monsterBox(m), body)) {
        out.push = hero.x >= m.x ? 1 : -1;
      } else if (!hero.hidden && overlap(monsterBox(m), body)) {
        out.hurt = true;
        if (!m.sees) {
          m.notice = 1;
          m.sees = true;
          m.facing = hero.x >= m.x ? 1 : -1;
          if (m.state === 'idle') out.sounds.push('alert');
        }
        if (!m.boss) {
          m.hunt = HUNT.memory;
          m.lastX = hero.x;
        }
        // A charge that meets him ends there: it bounces off him instead of running on through (18 Oct).
        if (m.kind === 'crawler' && m.state === 'attack') {
          m.x = clamp(m.x - m.facing * MOVES.knock * 1.5, m.minX, m.maxX);
          this.enter(m, 'rest');
        }
      }
    }

    for (const shot of this.shots) {
      shot.x += shot.vx * dt;
      shot.y += shot.vy * dt;
      shot.age += dt;
      if (shot.y >= this.ground(shot.x) || shot.age > MOVES.thorn.shotLife) shot.dead = true;
      else if (overlap({ x0: shot.x - 5, x1: shot.x + 5, y0: shot.y - 5, y1: shot.y + 5 }, body)) {
        shot.dead = true;
        out.hurt = true;
      }
    }
    for (let i = this.shots.length - 1; i >= 0; i--) if (this.shots[i].dead) this.shots.splice(i, 1);
    return out;
  }

  /**
   * His blade passes through `zone`. Every monster in it is hit once per strike.
   * Returns the monsters that were hit; the defeated ones have `alive` false.
   */
  strike(zone: Box, sneak: boolean, strikeId: number, dir: 1 | -1, power = 1): Monster[] {
    const hit: Monster[] = [];
    for (const m of this.monsters) {
      if (!m.alive || m.lastStrike === strikeId || !overlap(monsterBox(m), zone)) continue;
      m.lastStrike = strikeId;
      // The boss cannot be felled in one blow: a strike from hiding counts double.
      // While it recovers from an attack its weak point is open: a strike then counts as one from hiding.
      const open = sneak || m.state === 'rest';
      if (m.boss) m.hitsLeft = Math.max(0, m.hitsLeft - power * (open ? 2 : 1));
      else for (let i = 0; i < power; i++) m.hitsLeft = hitsAfterStrike(m.hitsLeft, open);
      m.stun = MOVES.stun;
      if (m.hitsLeft <= 0) {
        m.alive = false;
        m.exposing = false;
        m.gaze = 0;
      } else if (m.kind === 'crawler' || m.kind === 'stalker' || (m.kind === 'flyer' && m.state !== 'rest')) {
        m.x = clamp(m.x + dir * MOVES.knock, m.minX, m.maxX);
        if (m.kind === 'flyer') m.state = 'recover';
        else m.state = 'rest';
        m.t = 0;
      }
      hit.push(m);
    }
    for (const shot of this.shots) {
      if (overlap({ x0: shot.x - 5, x1: shot.x + 5, y0: shot.y - 5, y1: shot.y + 5 }, zone)) shot.dead = true;
    }
    return hit;
  }

  // ---- Crawler: walks its patch, charges when it sees him --------------------

  private stepCrawler(m: Monster, dt: number, hero: HeroState, out: StepResult): void {
    const move = MOVES.crawler;
    m.t += dt;
    if (m.state === 'idle') {
      const lo = Math.max(m.minX, m.homeX - move.roam);
      const hi = Math.min(m.maxX, m.homeX + move.roam);
      // One that only "touches" never charges: it turns and comes at him at a quicker walk.
      // A walking spitter comes on at a walk too, spitting as it comes.
      const plods = m.creature?.attack === 'touch' || m.creature?.attack === 'spit';
      if (!m.sees && m.hunt > 0) this.seek(m, dt, move.patrol * HUNT.crawlerRun);
      else if (m.x < lo - 2 || m.x > hi + 2) {
        // Back from a hunt: it walks home to its patch.
        m.facing = m.x < lo ? 1 : -1;
        m.x += m.facing * move.patrol * 1.5 * m.speed * dt;
      } else {
        m.x += m.facing * move.patrol * m.speed * (plods && m.sees ? 2.4 : 1) * dt;
        if (m.x <= lo) (m.x = lo), (m.facing = 1);
        else if (m.x >= hi) (m.x = hi), (m.facing = -1);
      }
      if (m.sees) {
        m.facing = hero.x >= m.x ? 1 : -1;
        if (!plods) {
          this.enter(m, 'windup');
          out.sounds.push('alert');
        }
      }
    } else if (m.state === 'windup') {
      if (!m.sees) this.enter(m, 'idle');
      else if (m.t >= move.windup) {
        this.enter(m, 'attack');
        out.sounds.push('charge');
      }
    } else if (m.state === 'attack') {
      // Committed: it runs in a straight line and cannot turn.
      m.x += m.facing * move.charge * m.speed * dt;
      if (m.x <= m.minX || m.x >= m.maxX || m.t >= move.chargeTime) {
        m.x = clamp(m.x, m.minX, m.maxX);
        this.enter(m, 'rest');
      }
    } else if (m.t >= move.rest) {
      this.enter(m, 'idle');
    }
  }

  // ---- Thorn: stays put, spits when he is lit and in range -------------------

  private stepThorn(m: Monster, dt: number, hero: HeroState, out: StepResult): void {
    const move = MOVES.thorn;
    m.t += dt;
    if (m.sees || m.hunt > 0) m.facing = (m.sees ? hero.x : m.lastX) >= m.x ? 1 : -1;
    if (m.state === 'idle') {
      if (m.sees) this.enter(m, 'windup');
    } else if (m.state === 'windup') {
      if (!m.sees) this.enter(m, 'idle');
      else if (m.t >= move.aim) {
        const x = m.x + m.facing * 18;
        const y = m.y - m.spec.height * 0.8;
        const dx = hero.x - x;
        const dy = hero.centreY - y;
        const length = Math.hypot(dx, dy) || 1;
        this.shots.push({ x, y, vx: (dx / length) * move.shotSpeed, vy: (dy / length) * move.shotSpeed, age: 0, dead: false });
        out.sounds.push('spit');
        this.enter(m, 'rest');
      }
    } else if (m.t >= move.rest) {
      this.enter(m, 'idle');
    }
  }

  // ---- Flyer: hovers, then swoops down ---------------------------------------

  private stepFlyer(m: Monster, dt: number, hero: HeroState, out: StepResult): void {
    const move = MOVES.flyer;
    const base = GROUND_Y - (m.spec.fly ?? 0);
    const hoverX = () => clamp(m.homeX + Math.sin(m.phase * 0.7) * move.roam, m.minX, m.maxX);
    const hoverY = () => base + Math.sin(m.phase * 2.3) * 8;
    m.t += dt;
    // Hunting, it drifts over to where he was; afterwards, back to where it began.
    const goal = m.hunt > 0 ? m.lastX : m.originX;
    const drift = Math.sign(goal - m.homeX) * Math.min(Math.abs(goal - m.homeX), HUNT.flyerDrift * m.speed * dt);
    m.homeX = clamp(m.homeX + drift, m.minX, m.maxX);
    if (m.state === 'idle') {
      m.phase += dt;
      const x = hoverX();
      if (Math.abs(x - m.x) > 0.01) m.facing = x > m.x ? 1 : -1;
      m.x = x;
      m.y = hoverY();
      if (m.sees) {
        m.facing = hero.x >= m.x ? 1 : -1;
        // It marks where he is as it flashes, and will dive there: stepping aside now dodges it.
        m.bx = clamp(hero.x, m.minX, m.maxX);
        this.enter(m, 'windup');
        out.sounds.push('alert');
      }
    } else if (m.state === 'windup') {
      m.y -= 30 * dt; // it lifts a little before it dives
      // Once it has started, it dives unless it has lost him altogether (18 Oct: it gave up at every blink).
      if (!m.sees && m.hunt <= 0) this.enter(m, 'recover');
      else if (m.t >= move.windup) {
        // It dives to where he stood when it flashed; it does not follow him after.
        m.ax = m.x;
        m.ay = m.y;
        m.by = this.ground(m.bx);
        m.facing = m.bx >= m.ax ? 1 : -1;
        this.enter(m, 'attack');
        out.sounds.push('swoop');
      }
    } else if (m.state === 'attack') {
      // A straight dive, quickening, to the ground where he stood.
      const k = Math.min(1, m.t / move.dive);
      const e = k * k;
      m.x = m.ax + (m.bx - m.ax) * e;
      m.y = m.ay + (m.by - m.ay) * e;
      if (k >= 1) this.enter(m, 'rest');
    } else if (m.state === 'rest') {
      // Stuck on the ground for a moment, within reach of his blade. Harmless while it struggles.
      m.y = this.ground(m.x);
      if (m.t >= move.stuck) this.enter(m, 'recover');
    } else {
      const k = 1 - Math.exp(-3 * dt);
      m.x += (hoverX() - m.x) * k;
      m.y += (hoverY() - m.y) * k;
      if (m.t >= move.recover) this.enter(m, 'idle');
    }
  }

  // ---- Stalker: tall and slow, with a long reach -----------------------------

  private stepStalker(m: Monster, dt: number, hero: HeroState, out: StepResult): void {
    const move = MOVES.stalker;
    m.t += dt;
    m.phase += dt;
    const ahead = (hero.x - m.x) * m.facing;
    if (m.state === 'idle') {
      // Hunting: it strides to where it last saw him and looks about. Otherwise it wanders back to where it stood.
      const home = m.homeX - m.x;
      if (m.hunt > 0 && !m.sees && Math.abs(m.lastX - m.x) <= move.startSwipe) {
        // He is right in front of it, under its eyes: it knows he is there, and swipes (18 Oct: it only turned about).
        m.facing = m.lastX >= m.x ? 1 : -1;
        this.enter(m, 'windup');
      } else if (m.hunt > 0 && !m.sees) {
        // It stops at arm's length: its reach is long.
        this.seek(m, dt, move.walk * HUNT.stalkerRun, move.startSwipe * 0.8);
      } else if (Math.abs(home) > 4) {
        m.facing = home > 0 ? 1 : -1;
        m.x += m.facing * move.home * dt;
        m.t = 0;
      } else if (m.t >= MOVES.stalkerTurn) {
        // Nothing to look at: it turns and watches the other way for a while.
        m.facing = m.facing === 1 ? -1 : 1;
        m.t = 0;
      }
      if (m.sees) {
        this.enter(m, 'walk');
        out.sounds.push('alert');
      }
    } else if (m.state === 'walk') {
      if (!m.sees) return this.enter(m, 'idle');
      m.facing = hero.x >= m.x ? 1 : -1;
      if (Math.abs(hero.x - m.x) > move.startSwipe) m.x = clamp(m.x + m.facing * move.walk * m.speed * dt, m.minX, m.maxX);
      else this.enter(m, 'windup');
    } else if (m.state === 'windup') {
      if (m.t >= move.windup) {
        this.enter(m, 'attack');
        out.sounds.push('swipe');
        // The arm sweeps at standing height. Lying flat lets it pass over him.
        if (ahead > -10 && ahead <= move.reach && !hero.lying) out.hurt = true;
      }
    } else if (m.state === 'attack') {
      if (m.t >= move.swipe) this.enter(m, 'rest');
    } else if (m.t >= move.rest) {
      this.enter(m, 'idle');
    }
  }

  // ---- Watcher: its beam exposes him, and then he has five seconds -----------

  private stepWatcher(m: Monster, dt: number, hero: HeroState, out: StepResult): void {
    if (m.stun > 0) {
      // Struck: it blinks, but the countdown does not forget him.
      m.stun -= dt;
      return;
    }
    m.phase += dt;
    if (m.state === 'turn') {
      m.t += dt;
      if (m.t >= WATCHER.turnTime / 2 && m.t - dt < WATCHER.turnTime / 2) m.facing = m.facing === 1 ? -1 : 1;
      if (m.t >= WATCHER.turnTime) this.enter(m, 'idle');
    }

    const exposed = !hero.hidden && inBeam(m, hero.x, hero.centreY);
    m.sees = exposed;
    // A splash behind it: it turns to look.
    const behind = (hero.x - m.x) * m.facing < 0;
    if (!exposed && behind && m.state === 'idle' && (hero.noise ?? 0) >= Math.abs(hero.x - m.x)) {
      this.enter(m, 'turn');
      out.sounds.push('heard');
    }
    this.gazeOn(m, exposed, dt, out);
    if (!exposed && m.state === 'idle') {
      // It only looks away when it has nobody in its light.
      m.t += dt;
      if (m.t >= WATCHER.turnEvery) this.enter(m, 'turn');
    }
  }

  /** The countdown of a gaze: while it is on him he is lit, and when it runs out he loses a petal. */
  private gazeOn(m: Monster, exposed: boolean, dt: number, out: StepResult, countdown = WATCHER.countdown): void {
    if (exposed && !m.exposing) {
      out.sounds.push('gaze');
      m.tickIn = tickGap(0);
    }
    const gaze = stepGaze(m.gaze, exposed, dt, countdown);
    m.gaze = gaze.time;
    m.exposing = exposed;
    if (gaze.expired) out.hurt = true;
    if (!exposed) return;
    out.exposed = true;
    m.tickIn -= dt;
    if (m.tickIn <= 0) {
      out.sounds.push('tick');
      m.tickIn += tickGap(m.gaze, countdown);
    }
  }

  // ---- a merge: what its second kind adds ------------------------------------------

  private stepAlso(m: Monster, dt: number, hero: HeroState, out: StepResult): void {
    // A merge uses one attack at a time (design research): its second only while its body is not attacking.
    if (m.state === 'windup' || m.state === 'attack' || (m.state === 'rest' && m.kind !== 'thorn')) return;
    if (m.also === 'thorn') {
      // It spits as a Thorn does, while it does whatever its body does.
      m.spitIn -= dt;
      if (m.sees && m.spitIn <= 0) {
        this.spit(m.x + m.facing * 12, m.y - m.spec.height * 0.9, hero, MOVES.thorn.shotSpeed);
        out.sounds.push('spit');
        m.spitIn = MOVES.thorn.aim + MOVES.thorn.rest;
      }
    } else if (m.also === 'stalker' && (m.spec.fly === undefined || m.y >= GROUND_Y - 170)) {
      // It swipes as a Stalker does when he comes within reach; one that flies reaches down with its long arms
      // while it hovers low enough. Lying flat lets the arm pass over him.
      const move = MOVES.stalker;
      const ahead = (hero.x - m.x) * m.facing;
      m.swipeIn -= dt;
      if (m.swipeT > 0) {
        m.swipeT -= dt;
        if (m.swipeT <= 0) {
          out.sounds.push('swipe');
          if (ahead > -10 && ahead <= move.reach && !hero.lying) out.hurt = true;
          m.swipeIn = move.rest + 0.8;
        }
      } else if (m.sees && m.swipeIn <= 0 && Math.abs(hero.x - m.x) <= move.startSwipe) m.swipeT = move.windup;
    }
  }

  private spit(x: number, y: number, hero: HeroState, speed: number): void {
    const dx = hero.x - x;
    const dy = hero.centreY - y;
    const length = Math.hypot(dx, dy) || 1;
    this.shots.push({ x, y, vx: (dx / length) * speed, vy: (dy / length) * speed, age: 0, dead: false });
  }

  // ---- the boss: three phases, an eye that opens and shuts, a root that can be pulled ----

  private stepBoss(m: Monster, dt: number, hero: HeroState, out: StepResult): void {
    const boss = m.boss;
    if (!boss) return;
    m.phase += dt;
    if (boss.waiting) {
      this.gazeOn(m, false, dt, out);
      m.sees = false;
      return;
    }
    const phase = Math.min(2, Math.floor((BOSS.hits - m.hitsLeft) / BOSS.perPhase));
    if (phase !== boss.phase) {
      // Hurt into its next phase: it reels, and wakes angrier.
      boss.phase = phase;
      boss.daze = 0;
      boss.cycle = 0;
      boss.lost = 0;
      boss.found = false;
      m.stun = 1;
      out.sounds.push('alert');
    }
    if (m.stun > 0) {
      m.stun -= dt;
      this.gazeOn(m, false, dt, out);
      m.sees = false;
      return;
    }
    if (boss.daze > 0) {
      // Dazed: its eye is shut. He can walk up and pull its root, weapon or no weapon.
      boss.daze -= dt;
      this.gazeOn(m, false, dt, out);
      m.sees = false;
      if (Math.abs(hero.x - m.x) <= BOSS.pull && !hero.lying) this.pullRoot(m);
      return;
    }
    m.facing = hero.x >= m.x ? 1 : -1;
    boss.cycle += dt;
    if (boss.cycle >= BOSS.open[phase] + BOSS.shut[phase]) boss.cycle = 0;
    boss.open = boss.cycle < BOSS.open[phase];

    const covered = inBossGaze(m, hero.x);
    const exposed = covered && !hero.hidden;
    // It has to find him first. Then, hidden inside its gaze, he breaks it: it loses him, and is dazed.
    if (exposed) boss.found = true;
    if (covered && hero.hidden && boss.found) {
      boss.lost += dt;
      if (boss.lost >= BOSS.loseAfter[phase]) {
        boss.lost = 0;
        boss.found = false;
        boss.daze = BOSS.daze[phase];
        out.sounds.push('swoop');
      }
    } else boss.lost = Math.max(0, boss.lost - dt * 0.5);
    m.sees = exposed;
    this.gazeOn(m, exposed, dt, out, BOSS.countdown);

    // From its second phase its side heads spit at whoever its eye has found.
    if (BOSS.spit[phase] > 0 && exposed) {
      boss.spitIn -= dt;
      if (boss.spitIn <= 0) {
        boss.spitIn = BOSS.spit[phase];
        this.spit(m.x + m.facing * BOSS_POINTS.head.ahead, m.y - BOSS_POINTS.head.up, hero, MOVES.thorn.shotSpeed);
        out.sounds.push('spit');
      }
    }
  }

  /** He pulls its root: the phase it is in ends at once. */
  private pullRoot(m: Monster): void {
    if (!m.boss) return;
    const next = (m.boss.phase + 1) * BOSS.perPhase;
    m.hitsLeft = Math.max(0, BOSS.hits - next);
    m.boss.daze = 0;
    m.pulled = true;
    if (m.hitsLeft <= 0) {
      m.alive = false;
      m.exposing = false;
      m.gaze = 0;
    }
  }

  /** Seeing or hearing him keeps a hunt going. */
  private listen(m: Monster, dt: number, hero: HeroState, out: StepResult): void {
    if (m.boss || m.kind === 'watcher') return;
    if (m.sees) {
      m.hunt = HUNT.memory;
      m.lastX = hero.x;
      return;
    }
    const noise = hero.noise ?? 0;
    if (noise > 0 && Math.abs(hero.x - m.x) <= noise) {
      if (m.hunt <= 0) out.sounds.push('heard');
      m.hunt = Math.max(m.hunt, HUNT.listen);
      m.lastX = hero.x;
      return;
    }
    m.hunt = Math.max(0, m.hunt - dt);
  }

  /** Go to where he was last seen or heard, within its own stretch of ground, then look one way and the other. */
  private seek(m: Monster, dt: number, speed: number, stopAt = 8): void {
    const to = clamp(m.lastX, m.minX, m.maxX);
    if (Math.abs(to - m.x) > stopAt) {
      m.facing = to > m.x ? 1 : -1;
      m.x = clamp(m.x + m.facing * speed * m.speed * dt, m.minX, m.maxX);
      m.t = 0;
    } else if (m.t >= HUNT.lookAround) {
      m.facing = m.facing === 1 ? -1 : 1;
      m.t = 0;
    }
  }

  private enter(m: Monster, state: MonsterState): void {
    m.state = state;
    m.t = 0;
  }
}
