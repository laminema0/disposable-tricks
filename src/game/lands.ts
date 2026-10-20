// The worlds of the run (19 Oct, step 4 of the improvement plan: more to play). Each world is a land that one of
// the bosses dried: its own colours, scenery, light, a lean towards some monsters and some kinds of road, and its
// own key in the music. Ten of them (Amin, 20 Oct: "only 10 levels"), one for each boss (bosses.ts); the tenth is
// the Dry Heart, and when its boss falls the world turns green (GameScene finale).

import type { Enemy, Palette, SceneryPiece } from '../settings/schema';
import type { ChunkType } from './level';

export interface Land {
  name: string;
  /** One line as the world begins (with the count of flowers). */
  line: string;
  /** Undefined for the first world: it keeps the colours and scenery the game was made with. */
  palette?: Palette;
  scenery?: SceneryPiece[];
  /** Added to the amount of light (darker below 0). */
  light: number;
  /** Monsters that are more common here: each entry is one more share. */
  more: Enemy[];
  /** Kinds of road stretch that come up more often here. */
  chunks: ChunkType[];
}

export const LANDS: Land[] = [
  {
    name: 'The Dry Desert',
    line: 'The Thirst drank this land dry. Find seven living flowers.',
    light: 0,
    more: [],
    chunks: [],
  },
  {
    name: 'The Ash Forest',
    line: 'The Ash Queen burnt this forest. Find seven flowers.',
    palette: { far: '#3a343f', mid: '#4d4550', stage: '#100d12', hero: '#857d88', light: '#ffb890', accent: '#ff8a5c' },
    scenery: [
      { kind: 'trees', amount: 1, size: 1.25 },
      { kind: 'mountains', amount: 0.5, size: 1 },
      { kind: 'ruins', amount: 0.15, size: 0.7 },
    ],
    // Darker under the dead trees: a land for hiding.
    light: -0.12,
    more: ['stalker', 'stalker', 'crawler'],
    chunks: ['pillarHall', 'grassField'],
  },
  {
    name: 'The Salt Sea',
    line: 'The Salt King drank a whole sea. Only its salt is left.',
    palette: { far: '#8a9eb0', mid: '#b0c2cf', stage: '#2a3743', hero: '#a3b0bb', light: '#ffffff', accent: '#9fe3ff' },
    scenery: [
      { kind: 'dunes', amount: 0.6, size: 0.6 },
      { kind: 'bridges', amount: 0.5, size: 1 },
      { kind: 'towers', amount: 0.3, size: 0.9 },
    ],
    // Open and bright: nowhere to hide from the sky.
    light: 0.08,
    more: ['flyer', 'flyer', 'thorn'],
    chunks: ['gap', 'pond'],
  },
  {
    name: 'The Red Canyons',
    line: 'The Dust Twins dried these canyons. Find seven flowers.',
    palette: { far: '#3a1a14', mid: '#57261a', stage: '#120705', hero: '#8c6f66', light: '#ffc27a', accent: '#ff7a3d' },
    scenery: [
      { kind: 'mountains', amount: 1, size: 1.4 },
      { kind: 'cacti', amount: 0.6, size: 1 },
      { kind: 'ruins', amount: 0.3, size: 0.9 },
    ],
    light: 0,
    more: ['thorn', 'thorn', 'watcher'],
    chunks: ['gap', 'lampRoad'],
  },
  {
    name: 'The Silent City',
    line: 'The Last Lamp watches every street here. Wake its flowers.',
    palette: { far: '#28324f', mid: '#3a4668', stage: '#0a0d18', hero: '#7a83a0', light: '#ffefc4', accent: '#b8c7ff' },
    scenery: [
      { kind: 'buildings', amount: 0.8, size: 1 },
      { kind: 'houses', amount: 0.6, size: 1 },
      { kind: 'towers', amount: 0.5, size: 1.1 },
      { kind: 'fences', amount: 0.4, size: 1 },
    ],
    light: 0,
    more: ['watcher', 'watcher', 'stalker'],
    chunks: ['pillarHall', 'archway'],
  },
  {
    name: 'The Glass Marsh',
    line: 'The Mire Mother drowned this marsh. Find seven flowers.',
    palette: { far: '#22343a', mid: '#335058', stage: '#091416', hero: '#7f9a9a', light: '#d8fff0', accent: '#7fffd4' },
    scenery: [
      { kind: 'trees', amount: 0.5, size: 0.8 },
      { kind: 'bridges', amount: 0.6, size: 1 },
      { kind: 'dunes', amount: 0.3, size: 0.6 },
    ],
    light: -0.05,
    more: ['crawler', 'crawler', 'thorn'],
    chunks: ['pond', 'pond', 'gap'],
  },
  {
    name: 'The Bone Hills',
    line: 'The Hollow Giant walks these hills. Find seven flowers.',
    palette: { far: '#3b3630', mid: '#5a5246', stage: '#14110d', hero: '#9a9184', light: '#fff0d0', accent: '#ffd27a' },
    scenery: [
      { kind: 'mountains', amount: 1, size: 1.2 },
      { kind: 'ruins', amount: 0.5, size: 0.9 },
      { kind: 'cacti', amount: 0.2, size: 0.8 },
    ],
    light: 0,
    more: ['stalker', 'stalker', 'crawler'],
    chunks: ['gap', 'grassField'],
  },
  {
    name: 'The Windworn Towers',
    line: 'The Storm Crow stole the clouds here. Find seven flowers.',
    palette: { far: '#2c3346', mid: '#454e66', stage: '#0c0f17', hero: '#8790a6', light: '#e6ecff', accent: '#a8c4ff' },
    scenery: [
      { kind: 'towers', amount: 1, size: 1.2 },
      { kind: 'bridges', amount: 0.4, size: 1 },
      { kind: 'mountains', amount: 0.4, size: 0.8 },
    ],
    light: 0.04,
    more: ['flyer', 'flyer', 'watcher'],
    chunks: ['gap', 'archway'],
  },
  {
    name: 'The Night Orchard',
    line: 'The Thorn Widow keeps this orchard. Find seven flowers.',
    palette: { far: '#2a1f33', mid: '#3e2d4a', stage: '#0d0812', hero: '#8a7a96', light: '#ffd6f0', accent: '#ff8ad8' },
    scenery: [
      { kind: 'trees', amount: 1, size: 1 },
      { kind: 'fences', amount: 0.6, size: 1 },
      { kind: 'houses', amount: 0.3, size: 0.9 },
    ],
    light: -0.08,
    more: ['thorn', 'thorn', 'stalker'],
    chunks: ['pillarHall', 'grassField'],
  },
  {
    name: 'The Dry Heart',
    line: 'The Last Drought lives here, where the dry began. End it.',
    palette: { far: '#2a1712', mid: '#45241a', stage: '#0b0504', hero: '#86685e', light: '#ffd9a0', accent: '#ff6a3d' },
    scenery: [
      { kind: 'dunes', amount: 1, size: 1.2 },
      { kind: 'ruins', amount: 0.6, size: 1 },
      { kind: 'mountains', amount: 0.6, size: 1.3 },
    ],
    light: -0.04,
    more: ['watcher', 'stalker', 'flyer', 'thorn'],
    chunks: ['gap', 'lampRoad', 'pillarHall'],
  },
];

/** The land of a world (chapter 1 is the first, 10 the last). */
export function landOf(chapter: number): Land {
  return LANDS[Math.min(LANDS.length, Math.max(1, chapter)) - 1];
}

/** Its place in the list, for the music's key. */
export function landIndex(chapter: number): number {
  return Math.min(LANDS.length, Math.max(1, chapter)) - 1;
}
