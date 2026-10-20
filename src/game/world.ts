// One world (Amin, 18 Oct): a long road with three detour gates off it, and ten living flowers across all of
// it. The whole world is known from its seed before any of it is played, so the map can show every part of
// it, detours included, from the start. Pure: no game engine. Both the road and each detour build themselves
// from these same functions, so what the map shows is what is there.

import { makeRng } from '../core/rng';
import type { Settings } from '../settings/schema';
import { GOAL_FROM_END } from './config';
import { addArena, buildLevel, type Level } from './level';
import { hasBoss } from './placement';
import { placeQuest, type QuestLayout } from './quest';
import { enterStreet, planChapter, type RunState } from './run';

/** Where the gate back stands in a detour. */
export const BACK_GATE = 170;

/** Where the detour gates stand on a road: spread out between its other features, never on a pit or water. */
export function chooseGates(level: Level, goalX: number, n: number): number[] {
  const free = (x: number) =>
    !level.pits.some((p) => x > p.x0 - 170 && x < p.x1 + 170) &&
    !level.hideSpots.some((h) => x > h.x0 - 130 && x < h.x1 + 130) &&
    !level.waters.some((w) => x > w.x0 - 90 && x < w.x1 + 90);
  const rng = makeRng(level.seed ^ 0x57ee7);
  let places: number[] = [];
  for (let x = 900; x < goalX - 760; x += 140) if (free(x)) places.push(x);
  const gates: number[] = [];
  for (let i = 0; i < n && places.length > 0; i++) {
    const x = places[Math.floor(rng() * places.length)];
    places = places.filter((p) => Math.abs(p - x) > 900);
    gates.push(x);
  }
  return gates.sort((a, b) => a - b);
}

/** The level of a stretch as its scene builds it. */
export function levelOf(base: Settings, run: RunState): { level: Level; goalX: number } {
  const plan = planChapter(base, run);
  const level = buildLevel(plan.seed, plan.settings, plan.screens, undefined, plan.chunks);
  const rules = { ...plan.settings, seed: plan.seed, count: plan.monsters, boss: plan.boss, more: plan.more };
  if (hasBoss(rules)) addArena(level);
  return { level, goalX: level.width - GOAL_FROM_END };
}

/** A detour's id in the flowers' ids: one per gate. */
export const detourTag = (gateX: number) => `d${Math.round(gateX)}:`;
export const roadTag = (chapter: number) => `r${chapter}:`;

export interface DetourPart {
  gateX: number;
  width: number;
  goalX: number;
  quest: QuestLayout;
}

export interface WorldLayout {
  road: { level: Level; goalX: number; gates: number[]; quest: QuestLayout };
  detours: DetourPart[];
}

/** The whole world of this run's current chapter: its road and every detour, with where every flower is. */
export function worldLayout(base: Settings, runIn: RunState): WorldLayout {
  const run: RunState = { ...runIn, stage: 'road', returnTo: undefined };
  const { level, goalX } = levelOf(base, run);
  const gates = chooseGates(level, goalX, planChapter(base, run).streets);
  const quest = placeQuest(level, goalX, gates.length, [...gates, goalX], roadTag(run.chapter), false);
  const detours = gates.map((gateX) => {
    const inside = levelOf(base, enterStreet(run, gateX));
    return {
      gateX,
      width: inside.level.width,
      goalX: inside.goalX,
      quest: placeQuest(inside.level, inside.goalX, 0, [BACK_GATE, inside.goalX], detourTag(gateX), true),
    };
  });
  return { road: { level, goalX, gates, quest }, detours };
}
