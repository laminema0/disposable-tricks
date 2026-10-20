// The settings file (brief 5.2): one small object that fully describes a game.
// The engine reads it and runs. Nothing else may change what a game is.

export const SETTINGS_VERSION = 1;

export const GENRES = ['side-scroller'] as const;
export type Genre = (typeof GENRES)[number];

export const MOODS = ['calm', 'happy', 'eerie', 'fierce'] as const;
export type Mood = (typeof MOODS)[number];

export const WORLDS = ['forest', 'town', 'ruins', 'shore'] as const;
export type World = (typeof WORLDS)[number];
/** A world is a ready-made mix of scenery. All four can be played. */
export const SHIPPED_WORLDS: readonly World[] = WORLDS;

/**
 * Scenery: silhouette set pieces from our own library. A game names up to three kinds,
 * each with how much of it there is and how big it is drawn. The AI may pick and tune
 * these; it never draws anything itself.
 */
export const SCENERY_KINDS = ['buildings', 'houses', 'towers', 'ruins', 'trees', 'mountains', 'bridges', 'fences', 'dunes', 'cacti', 'custom'] as const;
export type SceneryKind = (typeof SCENERY_KINDS)[number];
export const SCENERY_MAX = 3;

/**
 * A recipe: a new silhouette composed from simple shapes [Amin, 13 Oct: the AI may do this].
 * It is data, never code: a short list of boxes, circles, triangles and lines inside a
 * square 100 units wide and 100 high. x runs from -50 (left) to 50, y from 0 (the ground) up.
 * - box:    x is its centre, y its bottom, w and h its size.
 * - circle: x and y are its centre, w its diameter.
 * - tri:    x is the centre of its base, y the base, w the base width, h the height (apex up).
 * - line:   from (x, y) to (x + w, y + h), three units thick.
 */
export const SHAPE_TYPES = ['box', 'circle', 'tri', 'line'] as const;
export type ShapeType = (typeof SHAPE_TYPES)[number];
export interface Shape {
  t: ShapeType;
  x: number;
  y: number;
  w: number;
  h: number;
}
export const RECIPE_PARTS_MAX = 12;
export const RECIPE_NAME_MAX = 16;
export interface Recipe {
  name: string;
  parts: Shape[];
}

/** How he travels, and what he travels on. */
export const TRAVELS = ['foot', 'bike', 'car'] as const;
export type Travel = (typeof TRAVELS)[number];
export const GROUNDS = ['path', 'road'] as const;
export type Ground = (typeof GROUNDS)[number];

export interface SceneryPiece {
  kind: SceneryKind;
  /** Only for the kind "custom": the silhouette to draw. */
  recipe?: Recipe;
  /** 0 to 1: how much of it stands along the road. */
  amount: number;
  /** 0.6 to 1.6: how big it is drawn. */
  size: number;
}

/** The weapon: how it works, how it looks (one of our shapes) and a few numbers. */
/** "mounted" is fixed to the bike or car and fires forward. On foot it becomes "ranged". */
export const WEAPON_KINDS = ['melee', 'ranged', 'thrown', 'mounted', 'none'] as const;
export type WeaponKind = (typeof WEAPON_KINDS)[number];
export const WEAPON_LOOKS = ['sword', 'dagger', 'spear', 'axe', 'club', 'staff', 'bow', 'gun', 'sling', 'stone', 'knife', 'hammer', 'pen', 'pistol', 'shotgun', 'rifle', 'launcher'] as const;
export type WeaponLook = (typeof WEAPON_LOOKS)[number];
export const WEAPON_NAME_MAX = 16;
/** How far each kind may reach, in pixels. */
export const WEAPON_REACH: Record<WeaponKind, [number, number]> = {
  melee: [40, 140],
  ranged: [160, 420],
  thrown: [120, 320],
  mounted: [160, 420],
  none: [0, 0],
};
export interface Weapon {
  /** What the player sees it called. */
  name: string;
  kind: WeaponKind;
  look: WeaponLook;
  /** Pixels. Melee: how far the blade reaches. Ranged and thrown: how far the shot flies. */
  reach: number;
  /** 0.5 to 2: how quickly it can be used again. 1 is the sword. */
  speed: number;
  /** 1 or 2: hits taken off a monster by one strike. */
  power: number;
  /** A silhouette of its own, drawn in place of the look. */
  recipe?: Recipe;
  /** Ranged and thrown: how many shots leave at once (a shotgun fires several), 1 to 6. */
  shots?: number;
  /** How widely those shots fan out, in radians, 0 to 0.6. */
  spread?: number;
}

export const LIGHT_KINDS = ['lamp', 'fireflies', 'water', 'mirror'] as const;
export type LightKind = (typeof LIGHT_KINDS)[number];

export const ENEMIES = ['crawler', 'thorn', 'flyer', 'stalker', 'watcher'] as const;
export type Enemy = (typeof ENEMIES)[number];

/**
 * A described monster, as building blocks [Amin, 13 Oct]. The five named monsters are
 * presets of the same blocks. Every number is capped so that any monster stays fair.
 * - body:   what kind of body it has, which decides where it looks.
 *           low looks along the ground, tall looks ahead at standing height, flying looks down.
 * - move:   how it gets about.
 * - attack: what it does when it has seen him.
 */
export const BODIES = ['low', 'tall', 'flying'] as const;
export type Body = (typeof BODIES)[number];
export const MOVES_OF = ['walk', 'hop', 'fly', 'float', 'still'] as const;
export type MoveOf = (typeof MOVES_OF)[number];
export const ATTACKS = ['touch', 'charge', 'spit', 'swoop', 'reach', 'beam'] as const;
export type Attack = (typeof ATTACKS)[number];
export const CREATURES_MAX = 3;
export interface Creature {
  name: string;
  body: Body;
  move: MoveOf;
  attack: Attack;
  /** 0.7 to 1.5: how big it is. */
  size: number;
  /** 0.6 to 1.4: how fast it moves. */
  speed: number;
  /** 1 to 3: strikes it takes to defeat. */
  hits: number;
  /** 1 to 3 eyes. They always glow, so it can be seen in the dark. */
  eyes: number;
  /** Its silhouette. Without one it takes the stock shape of its body. */
  recipe?: Recipe;
}

/** Things in the air. Only for show: they change nothing about who sees whom. */
export const WEATHERS = ['none', 'fog', 'rain', 'snow', 'petals'] as const;
export type Weather = (typeof WEATHERS)[number];

export const TWISTS = ['none', 'fewer-lights', 'more-watchers', 'no-sword', 'fast-flowers'] as const;
export type Twist = (typeof TWISTS)[number];

/**
 * What the adventure is about and how it ends [Amin, 13 Oct: "users can change the scenario"].
 * - flower: he carries his flower to the end of the road, where his own head is buried with it
 *           and the flower grows (the first ending, and the default).
 * - home:   he walks home into the light at the end of the road, and lives.
 * - hunt:   the way to the end stays closed until every monster has fallen.
 */
export const STORIES = ['flower', 'home', 'hunt'] as const;
export type Story = (typeof STORIES)[number];

export const PALETTE_SLOTS = ['far', 'mid', 'stage', 'hero', 'light', 'accent'] as const;
export type PaletteSlot = (typeof PALETTE_SLOTS)[number];
/** Every slot is a colour written as "#rrggbb". */
export type Palette = Record<PaletteSlot, string>;

export const TITLE_MAX = 40;
/** The intro is one line on the title card, so it has to stay short. */
export const INTRO_MAX = 64;
export const SEED_MAX = 0xffffffff;

export interface Settings {
  v: 1;
  genre: Genre;
  /** Reserved for later genres. Always null for now. */
  modifier: null;
  mood: Mood;
  world: World;
  palette: Palette;
  hero: { cape: boolean; colour: boolean };
  lights: LightKind[];
  /** 0 to 1. 0.5 is the base amount of light. */
  lightDensity: number;
  enemies: Enemy[];
  /** Described monsters, on top of (or instead of) the named ones. */
  creatures: Creature[];
  weather: Weather;
  scenery: SceneryPiece[];
  /** Groundwork for riding and driving. The game does not use these two yet. */
  travel: Travel;
  ground: Ground;
  weapon: Weapon;
  merges: boolean;
  twist: Twist;
  story: Story;
  /** 1 to 3. */
  difficulty: number;
  seed: number;
  title: string;
  /** One line shown under the title on the title card. */
  intro: string;
}
