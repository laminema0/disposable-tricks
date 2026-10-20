// Bot players for tuning difficulty (19 Oct, step 3 of the improvement plan). They play the game's real rules
// (level.ts, placement.ts, monsters.ts, rules.ts) on real roads, with a hero that moves like hero.ts, and react
// to what they see with a human delay and human mistakes. Not a replacement for a person: a way to measure.

import { GROUND_Y, HERO, HEALTH, LIGHT, STRIKE, WEAPON_USE, GOAL_FROM_END } from '../../src/game/config';
import { lightLevelAt } from '../../src/core/light';
import { makeRng } from '../../src/core/rng';
import { addArena, buildLevel, hideSpotAt, isRoof, pitAt, type Level } from '../../src/game/level';
import { MonsterWorld, type HeroState, type Monster } from '../../src/game/monsters';
import { hasBoss, placeMonsters } from '../../src/game/placement';
import { hurt, isHidden, newHealth, tickHealth, type Health } from '../../src/game/rules';
import { ENEMIES } from '../../src/settings/schema';

export interface Skill {
  name: string;
  /** Seconds from a warning to his answer, and how much that varies. */
  reaction: number;
  spread: number;
  /** Chance he misses a warning altogether. */
  miss: number;
  /** How far off his jump at a pit's edge can be, px. */
  jumpError: number;
  /** He strikes only in a monster's opening (skilled), or whenever one is close. */
  patient: boolean;
  armed: boolean;
}

export const SKILLS: Record<'novice' | 'average' | 'skilled', Skill> = {
  novice: { name: 'novice', reaction: 0.5, spread: 0.15, miss: 0.25, jumpError: 26, patient: false, armed: true },
  average: { name: 'average', reaction: 0.33, spread: 0.08, miss: 0.12, jumpError: 14, patient: false, armed: true },
  skilled: { name: 'skilled', reaction: 0.22, spread: 0.05, miss: 0.04, jumpError: 7, patient: true, armed: true },
};

export interface RoadSetup {
  seed: number;
  screens: number;
  monsters: number;
  boss?: boolean;
  toughness?: number;
  pace?: number;
  sight?: number;
}

export interface RunResult {
  won: boolean;
  petalsLost: number;
  hits: number;
  falls: number;
  defeated: number;
  seconds: number;
  /** What hurt him, by monster kind or 'pit'. */
  causes: Record<string, number>;
}

const DT = 1 / 60;
const JUMP_SPEED = Math.sqrt(2 * HERO.gravity * HERO.height * HERO.jumpHeights);

type Plan = { at: number; act: 'jump' | 'lie' | 'back' | 'hold' | 'watch'; until?: number; m?: Monster };

export function playRoad(setup: RoadSetup, skill: Skill): RunResult {
  const rng = makeRng(setup.seed * 31 + skill.name.length);
  const level: Level = buildLevel(setup.seed, { lights: ['lamp', 'fireflies', 'water', 'mirror'], lightDensity: 0.5 }, setup.screens);
  const rules = { enemies: [...ENEMIES], difficulty: 2, twist: 'none' as const, seed: setup.seed, count: setup.monsters, boss: setup.boss ?? false };
  if (hasBoss(rules)) addArena(level);
  const world = new MonsterWorld(placeMonsters(level, rules), { toughness: setup.toughness ?? 0, pace: setup.pace ?? 1, sight: setup.sight ?? 1 });
  const goal = level.width - GOAL_FROM_END;

  let x = 300;
  let y = GROUND_Y;
  let vy = 0;
  let onGround = true;
  let lying = false;
  let move = 1;
  let knock = 0;
  let health: Health = newHealth();
  let charges: number = WEAPON_USE.charges;
  let chargeT = 0;
  let cooldown = 0;
  let strikeId = 0;
  let t = 0;
  let hits = 0;
  let falls = 0;
  let lastSafe = x;
  const causes: Record<string, number> = {};
  const plans: Plan[] = [];
  const holdUntil = { lie: 0, back: 0, wait: 0, over: 0 };

  const was = new Map<Monster, string>();
  const seenShots = new WeakSet<object>();
  const watching = new Set<Monster>();
  const react = (act: Plan['act'], hold: number, m?: Monster) => {
    if (rng() < skill.miss) return;
    const at = t + Math.max(0.08, skill.reaction + (rng() * 2 - 1) * skill.spread);
    plans.push({ at, act, until: at + hold, m });
  };

  while (t < 600) {
    t += DT;
    // ---- what he sees, and what he decides ----
    const ahead = world.monsters.filter((m) => m.alive && m.x - x > -60 && m.x - x < 420).sort((a, b) => Math.abs(a.x - x) - Math.abs(b.x - x));
    // A warning is a monster starting its wind-up: he answers it after his reaction time, or misses it.
    for (const m of world.monsters) {
      const before = was.get(m);
      was.set(m, m.state);
      if (!m.alive || before === 'windup' || m.state !== 'windup' || Math.abs(m.x - x) > 420) continue;
      if (m.kind === 'stalker') react('lie', 1.0);
      else if (m.kind === 'flyer') react('back', 0.7);
      // A charge: he watches it come and jumps when it is close.
      else if (m.kind === 'crawler') react('watch', 3, m);
    }
    for (const shot of world.shots) {
      if (shot.dead || seenShots.has(shot)) continue;
      seenShots.add(shot);
      if ((x - shot.x) * Math.sign(shot.vx) > 0) react('lie', 0.7);
    }
    // A watcher's beam: he hurries on through it.

    for (const plan of plans.splice(0)) {
      if (plan.at > t) {
        plans.push(plan);
        continue;
      }
      if (plan.act === 'lie') holdUntil.lie = Math.max(holdUntil.lie, plan.until ?? t);
      if (plan.act === 'back') holdUntil.back = Math.max(holdUntil.back, plan.until ?? t);
      if (plan.act === 'watch' && plan.m) watching.add(plan.m);
      if (plan.act === 'jump' && onGround && !lying) {
        vy = -JUMP_SPEED;
        onGround = false;
      }
    }

    for (const m of watching) {
      if (!m.alive || (m.state !== 'windup' && m.state !== 'attack')) watching.delete(m);
      else if (m.state === 'attack' && Math.abs(m.x - x) < 95 + skill.jumpError * (rng() * 2 - 1) && onGround && !lying) {
        vy = -JUMP_SPEED;
        onGround = false;
        watching.delete(m);
      }
    }
    // Pits: jump at his chosen distance from the edge.
    const nextPit = level.pits.find((p) => p.x0 > x - 2);
    if (nextPit && onGround && !lying) {
      const lead = 18 + (rng() * 2 - 1) * skill.jumpError * 0.06 * 16;
      if (move === 1 && nextPit.x0 - x <= Math.max(2, lead)) {
        vy = -JUMP_SPEED;
        onGround = false;
      }
    }

    lying = onGround && t < holdUntil.lie;
    move = t < holdUntil.back ? -1 : 1;
    if (move === -1 && level.pits.some((p) => x - p.x1 > 0 && x - p.x1 < 40)) move = 0;
    // Jumping over something: he keeps going forward until he has landed past it.
    const over = t < holdUntil.over;
    // Don't walk into a monster that has not yet attacked: an armed player stops at reach and strikes.
    const front = ahead.find((m) => m.x > x && m.y > GROUND_Y - 60);
    let wantStrike = false;
    if (over) move = 1;
    else if (skill.armed && front && front.x - x < 66 + front.spec.halfW) {
      move = front.x - x < front.spec.halfW + 26 ? -1 : 0;
      // Nothing left to strike with: over it.
      if (charges <= 0 && cooldown <= 0 && onGround && front.spec.height < 120 && move === 0) {
        vy = -JUMP_SPEED;
        onGround = false;
        holdUntil.over = t + 0.9;
      }
      wantStrike = !skill.patient || front.state === 'rest' || front.state === 'idle' || front.state === 'recover';
    }
    // A flyer resting on the ground is a free hit.
    const flyerDown = ahead.find((m) => m.kind === 'flyer' && m.state === 'rest' && Math.abs(m.x - x) < 90);
    if (skill.armed && flyerDown) {
      move = flyerDown.x > x + 50 ? 1 : 0;
      wantStrike = true;
    }

    // ---- his body ----
    if (charges < WEAPON_USE.charges) {
      chargeT += DT;
      if (chargeT >= WEAPON_USE.recharge) {
        charges++;
        chargeT = 0;
      }
    }
    cooldown = Math.max(0, cooldown - DT);
    if (wantStrike && cooldown <= 0 && charges > 0 && !lying) {
      charges--;
      cooldown = HERO.strikeCooldown;
      strikeId++;
      for (const m of world.strike({ x0: x - 8, x1: x + 70, y0: y - STRIKE.up, y1: y + 5 }, false, strikeId, 1, 1)) {
        if (m.alive) knock = -130;
      }
    }

    const speed = lying ? HERO.crawlSpeed * Math.max(0, move) : HERO.speed * move;
    let vx = speed + knock;
    knock = Math.abs(knock) < 8 ? 0 : knock * Math.exp(-9 * DT);
    if (lying) vx = 0;
    let nx = Math.max(30, Math.min(level.width - 30, x + vx * DT));
    if (onGround) {
      if (pitAt(level, nx)) onGround = false;
      else lastSafe = nx;
    }
    if (!onGround) {
      const g = vy > 0 ? HERO.fallGravity : Math.abs(vy) < 110 ? HERO.apexGravity : 1;
      vy = Math.min(HERO.maxFall, vy + HERO.gravity * g * DT);
      let ny = y + vy * DT;
      const pit = pitAt(level, nx);
      if (pit && vy > 0 && y < GROUND_Y - 1 && ny >= GROUND_Y && pit.x1 - nx <= 14) nx = pit.x1 + 1;
      if (y <= GROUND_Y && ny >= GROUND_Y && !pitAt(level, nx)) {
        ny = GROUND_Y;
        vy = 0;
        onGround = true;
      } else if (ny > GROUND_Y + 320) {
        falls++;
        causes.pit = (causes.pit ?? 0) + 1;
        const before = health.petals;
        health = hurt({ ...health, safe: 0 });
        if (health.petals < before) hits++;
        const fell = pitAt(level, x) ?? level.pits.find((p) => x >= p.x0 - 20 && x <= p.x1 + 20);
        nx = fell ? (lastSafe < (fell.x0 + fell.x1) / 2 ? fell.x0 - 50 : fell.x1 + 50) : lastSafe;
        ny = GROUND_Y;
        vy = 0;
        onGround = true;
      }
      y = ny;
    }
    x = nx;

    // ---- the monsters ----
    const centreY = y - (lying ? 24 : 55);
    const light = lightLevelAt(x, centreY, level.lights, LIGHT.ambient);
    const spot = hideSpotAt(level, x);
    const hidden = isHidden({ lying, inHideSpot: spot !== undefined, light });
    const hero: HeroState = { x, y, centreY, lying, hidden, light, roofed: spot !== undefined && isRoof(spot.kind) };
    const result = world.step(DT, hero);
    health = tickHealth(health, DT);
    if (result.hurt) {
      const before = health.petals;
      health = hurt(health);
      if (health.petals < before) {
        hits++;
        // Pushed away from what hurt him (the game does the same).
        const from = world.monsters.filter((m) => m.alive).sort((a, b) => Math.abs(a.x - x) - Math.abs(b.x - x))[0];
        knock = from && Math.abs(from.x - x) < 140 ? (x >= from.x ? 300 : -300) : -300;
        const near = world.monsters.filter((m) => m.alive).sort((a, b) => Math.abs(a.x - x) - Math.abs(b.x - x))[0];
        const cause = world.shots.length > 0 && (!near || Math.abs(near.x - x) > 120) ? 'thorn-shot' : `${near?.kind ?? '?'}:${near?.state ?? ''}:${near && Math.abs(near.x - x) < near.spec.halfW + 22 && near.y - near.spec.height < y && near.y > y - (lying ? 34 : 92) ? 'touch' : 'far'}`;
        causes[cause] = (causes[cause] ?? 0) + 1;
      }
    }
    if (health.petals <= 0) break;
    if (x >= goal) break;
  }
  return {
    won: health.petals > 0 && x >= goal,
    petalsLost: HEALTH.petals - Math.max(0, health.petals),
    hits,
    falls,
    defeated: world.monsters.filter((m: Monster) => !m.alive).length,
    seconds: Math.round(t),
    causes,
  };
}

export interface Summary {
  skill: string;
  runs: number;
  winRate: number;
  petalsLost: number;
  falls: number;
  defeated: number;
  seconds: number;
  causes: Record<string, number>;
}

export function summarise(skill: Skill, setups: RoadSetup[]): Summary {
  const results = setups.map((s) => playRoad(s, skill));
  const mean = (f: (r: RunResult) => number) => Math.round((results.reduce((a, r) => a + f(r), 0) / results.length) * 100) / 100;
  const causes: Record<string, number> = {};
  for (const r of results) for (const [k, v] of Object.entries(r.causes)) causes[k] = (causes[k] ?? 0) + v;
  return {
    skill: skill.name,
    runs: results.length,
    winRate: mean((r) => (r.won ? 1 : 0)),
    petalsLost: mean((r) => r.petalsLost),
    falls: mean((r) => r.falls),
    defeated: mean((r) => r.defeated),
    seconds: mean((r) => r.seconds),
    causes,
  };
}
