// Turns the settings into the colours the game draws with.
// The six palette slots come from the settings; every other colour is mixed from them,
// so a palette swap recolours the whole game. Pure: no game engine.

import { mixColour } from '../core/light';
import type { Settings, Weapon } from '../settings/schema';

const WHITE = 0xffffff;
const BLACK = 0x000000;

export interface HeroLook {
  cape: boolean;
  /** True when he carries something he can use. */
  sword: boolean;
  weapon: Weapon;
  /** Each pair is [in full darkness, in full light]. */
  body: [number, number];
  shade: [number, number];
  capeColour: [number, number];
  /** The one colour that is his own: his flower glows with it (design research, 19 Oct). */
  flower: number;
  dot: [number, number];
}

export interface Look {
  far: number;
  mid: number;
  stage: number;
  light: number;
  accent: number;
  skyTop: number;
  horizon: number;
  hillFar: number;
  hillNear: number;
  /** Rocks, pillars, lamp posts. */
  prop: number;
  pit: number;
  moon: number;
  hero: HeroLook;
  monster: MonsterLook;
}

export interface MonsterLook {
  /** [in full darkness, in full light]. Black shapes either way. */
  body: [number, number];
  /** Shown for a moment when it is struck. */
  struck: number;
  /** Yellow, and never dimmed: the eyes must stay visible in the dark (brief 3.4). */
  eye: number;
  pupil: number;
}

/** The colours flowers come in when a monster bursts. */
export const FLOWER_COLOURS = [0xffffff, 0xffb3c7, 0x9fe8d2, 0xffd65a, 0xc9b5ff];
export const FLOWER_HEART = 0xffd65a;

export function toNumber(hex: string): number {
  return parseInt(hex.slice(1), 16);
}

export function toHex(colour: number): string {
  return `#${colour.toString(16).padStart(6, '0')}`;
}

export function makeLook(settings: Settings): Look {
  const p = settings.palette;
  const far = toNumber(p.far);
  const mid = toNumber(p.mid);
  const stage = toNumber(p.stage);
  const light = toNumber(p.light);
  const accent = toNumber(p.accent);
  const hero = toNumber(p.hero);

  const shade = mixColour(hero, BLACK, 0.18);
  const dark = (colour: number) => mixColour(stage, colour, settings.hero.colour ? 0.34 : 0.2);

  return {
    far,
    mid,
    stage,
    light,
    accent,
    skyTop: mixColour(far, BLACK, 0.45),
    horizon: mixColour(mid, light, 0.16),
    hillFar: mixColour(mid, light, 0.03),
    hillNear: mixColour(far, stage, 0.12),
    prop: mixColour(stage, mid, 0.14),
    pit: mixColour(stage, far, 0.4),
    moon: mixColour(WHITE, light, 0.2),
    hero: {
      cape: settings.hero.cape,
      sword: settings.twist !== 'no-sword' && settings.weapon.kind !== 'none',
      weapon: settings.weapon,
      body: [dark(hero), hero],
      shade: [dark(shade), shade],
      // In colour, the cape and the heart of the flower take the accent colour.
      capeColour: settings.hero.colour ? [dark(accent), accent] : [dark(shade), shade],
      flower: accent,
      dot: settings.hero.colour ? [dark(accent), accent] : [dark(hero), hero],
    },
    monster: {
      body: [mixColour(BLACK, stage, 0.5), mixColour(BLACK, mid, 0.45)],
      struck: mixColour(mid, WHITE, 0.45),
      eye: 0xffe66d,
      pupil: 0x05060c,
    },
  };
}
