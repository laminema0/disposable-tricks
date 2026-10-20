// Default values. The validator falls back to these for anything missing or invalid.

import { makeIntro } from './title';
import type { LightKind, Mood, Palette, SceneryPiece, Settings, Weapon, WeaponLook, World } from './schema';

/** What a mood brings with it: colours, the hero in colour or not, and the lights. */
export interface MoodPreset {
  palette: Palette;
  heroColour: boolean;
  lights: LightKind[];
  lightDensity: number;
}

export const MOOD_PRESETS: Record<Mood, MoodPreset> = {
  // The base look from the board: navy night, warm lamps.
  calm: {
    palette: { far: '#17153a', mid: '#1f1c48', stage: '#070a14', hero: '#6b7388', light: '#ffd9a0', accent: '#ffe66d' },
    heroColour: false,
    lights: ['lamp', 'fireflies', 'water', 'mirror'],
    lightDensity: 0.5,
  },
  // Plum dusk, many lights, and the hero in colour.
  happy: {
    palette: { far: '#4a2858', mid: '#6b3360', stage: '#1a0d1e', hero: '#f0a257', light: '#ffe6ad', accent: '#ff7d92' },
    heroColour: true,
    lights: ['lamp', 'fireflies', 'water'],
    lightDensity: 0.85,
  },
  // Deep green, no lamps: only fireflies and the moon in water.
  eerie: {
    palette: { far: '#0b2622', mid: '#12362f', stage: '#030b0a', hero: '#6f8781', light: '#b6ffd2', accent: '#d9ff5c' },
    heroColour: false,
    lights: ['fireflies', 'water'],
    lightDensity: 0.4,
  },
  // Ember red, hard light from lamps and mirrors.
  fierce: {
    palette: { far: '#2c0f18', mid: '#42151f', stage: '#0c0406', hero: '#8c7774', light: '#ffb273', accent: '#ff5a3d' },
    heroColour: false,
    lights: ['lamp', 'mirror'],
    lightDensity: 0.5,
  },
};

/** The scenery each ready-made world brings. */
export const WORLD_SCENERY: Record<World, SceneryPiece[]> = {
  forest: [
    { kind: 'trees', amount: 0.7, size: 1 },
    { kind: 'mountains', amount: 0.6, size: 1 },
  ],
  town: [
    { kind: 'buildings', amount: 0.8, size: 1 },
    { kind: 'houses', amount: 0.5, size: 1 },
    { kind: 'fences', amount: 0.4, size: 1 },
  ],
  ruins: [
    { kind: 'ruins', amount: 0.8, size: 1 },
    { kind: 'towers', amount: 0.4, size: 1.1 },
    { kind: 'mountains', amount: 0.4, size: 0.8 },
  ],
  shore: [
    { kind: 'bridges', amount: 0.6, size: 1 },
    { kind: 'mountains', amount: 0.5, size: 1.2 },
    { kind: 'trees', amount: 0.2, size: 0.8 },
  ],
};

/** What each weapon shape is, unless a game says otherwise. */
export const WEAPON_PRESETS: Record<WeaponLook, Weapon> = {
  sword: { name: 'Sword', kind: 'melee', look: 'sword', reach: 70, speed: 1, power: 1 },
  dagger: { name: 'Dagger', kind: 'melee', look: 'dagger', reach: 46, speed: 1.6, power: 1 },
  spear: { name: 'Spear', kind: 'melee', look: 'spear', reach: 112, speed: 0.8, power: 1 },
  axe: { name: 'Axe', kind: 'melee', look: 'axe', reach: 62, speed: 0.6, power: 2 },
  club: { name: 'Club', kind: 'melee', look: 'club', reach: 58, speed: 0.7, power: 2 },
  staff: { name: 'Staff', kind: 'melee', look: 'staff', reach: 96, speed: 1, power: 1 },
  bow: { name: 'Bow', kind: 'ranged', look: 'bow', reach: 380, speed: 0.8, power: 1 },
  gun: { name: 'Gun', kind: 'ranged', look: 'gun', reach: 400, speed: 1.5, power: 1 },
  sling: { name: 'Sling', kind: 'thrown', look: 'sling', reach: 260, speed: 1, power: 1 },
  stone: { name: 'Stones', kind: 'thrown', look: 'stone', reach: 200, speed: 1.2, power: 1 },
  knife: { name: 'Knife', kind: 'melee', look: 'knife', reach: 50, speed: 1.5, power: 1 },
  hammer: { name: 'Hammer', kind: 'melee', look: 'hammer', reach: 60, speed: 0.6, power: 2 },
  pen: { name: 'Pen', kind: 'melee', look: 'pen', reach: 44, speed: 1.8, power: 1 },
  // A little slower and shorter than before (Amin, 20 Oct: "really easy to shoot").
  pistol: { name: 'Pistol', kind: 'ranged', look: 'pistol', reach: 300, speed: 1.1, power: 1 },
  shotgun: { name: 'Shotgun', kind: 'ranged', look: 'shotgun', reach: 230, speed: 0.7, power: 2, shots: 5, spread: 0.32 },
  rifle: { name: 'Rifle', kind: 'ranged', look: 'rifle', reach: 420, speed: 0.8, power: 2 },
  launcher: { name: 'Bazooka', kind: 'ranged', look: 'launcher', reach: 460, speed: 0.5, power: 2 },
};
export const NO_WEAPON: Weapon = { name: 'No weapon', kind: 'none', look: 'sword', reach: 0, speed: 1, power: 1 };

export const DEFAULT_SEED = 48213;

/** The example from brief 5.2. */
export const DEFAULT_SETTINGS: Settings = {
  v: 1,
  genre: 'side-scroller',
  modifier: null,
  mood: 'calm',
  world: 'forest',
  palette: { ...MOOD_PRESETS.calm.palette },
  hero: { cape: true, colour: false },
  lights: ['lamp', 'fireflies', 'water', 'mirror'],
  lightDensity: 0.5,
  enemies: ['crawler', 'thorn', 'watcher'],
  creatures: [],
  weather: 'none',
  scenery: WORLD_SCENERY.forest.map((piece) => ({ ...piece })),
  travel: 'foot',
  ground: 'path',
  weapon: { ...WEAPON_PRESETS.sword },
  merges: true,
  twist: 'none',
  story: 'flower',
  difficulty: 2,
  seed: DEFAULT_SEED,
  title: 'The Quiet Lamp Road',
  intro: makeIntro('calm', DEFAULT_SEED),
};

/** A fresh copy that is safe to change. */
export function defaultSettings(): Settings {
  return {
    ...DEFAULT_SETTINGS,
    palette: { ...DEFAULT_SETTINGS.palette },
    hero: { ...DEFAULT_SETTINGS.hero },
    lights: [...DEFAULT_SETTINGS.lights],
    enemies: [...DEFAULT_SETTINGS.enemies],
    creatures: [],
    scenery: DEFAULT_SETTINGS.scenery.map((piece) => ({ ...piece })),
    weapon: { ...DEFAULT_SETTINGS.weapon },
  };
}
