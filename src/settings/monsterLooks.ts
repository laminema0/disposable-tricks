// Our own drawings of the monsters players ask for most (Amin, 18 Oct: "a dragon" came out as a few
// blocks). A described monster whose name is one of these is drawn with ours; anything else keeps the
// drawing the AI composed. Same units as every recipe: a square 100 wide and 100 high, x from -50 to 50,
// y from 0 (the ground) up, the front to the right. The eyes are added by the game, on the head.
// Pure data: no game engine.

import type { Recipe, Shape } from './schema';

const box = (x: number, y: number, w: number, h: number): Shape => ({ t: 'box', x, y, w, h });
const circle = (x: number, y: number, w: number): Shape => ({ t: 'circle', x, y, w, h: 0 });
const tri = (x: number, y: number, w: number, h: number): Shape => ({ t: 'tri', x, y, w, h });
const line = (x: number, y: number, w: number, h: number): Shape => ({ t: 'line', x, y, w, h });

const LOOKS: { words: RegExp; recipe: Recipe }[] = [
  {
    words: /dragon|wyvern|drake/,
    recipe: {
      name: 'Dragon',
      parts: [
        circle(-10, 44, 30), // body, long
        circle(6, 44, 28),
        line(14, 52, 12, 22), // neck
        circle(28, 78, 15), // head
        box(37, 72, 12, 7), // snout
        tri(24, 84, 5, 9), // horn
        tri(-16, 56, 30, 40), // wing, scalloped: a tall back edge and a shorter front one
        tri(2, 56, 22, 26),
        line(-24, 40, -20, -12), // tail
        tri(-44, 26, 10, 10), // tail tip
        line(-10, 30, -2, -30), // legs
        line(8, 30, 2, -30),
      ],
    },
  },
  {
    words: /spider|tarantula/,
    recipe: {
      name: 'Spider',
      parts: [
        circle(-8, 24, 30), // body
        circle(14, 20, 16), // head
        line(-14, 26, -32, -26), // legs, four a side
        line(-8, 30, -20, -30),
        line(-2, 30, -6, -30),
        line(4, 28, 10, -28),
        line(-12, 32, -36, 4),
        line(6, 30, 30, -30),
      ],
    },
  },
  {
    words: /snake|serpent|cobra|viper|python/,
    recipe: {
      name: 'Snake',
      parts: [circle(-34, 7, 12), circle(-20, 10, 14), circle(-5, 8, 15), circle(9, 12, 15), line(14, 14, 8, 14), circle(26, 30, 16), box(34, 26, 10, 6), line(39, 28, 10, -2)],
    },
  },
  {
    words: /wolf|hound|werewolf|\bdog\b|jackal|hyena/,
    recipe: {
      name: 'Wolf',
      parts: [
        box(-4, 22, 46, 20), // body
        line(-20, 24, 0, -24), // legs
        line(-12, 24, 0, -24),
        line(8, 24, 0, -24),
        line(16, 24, 0, -24),
        circle(24, 48, 18), // head
        box(36, 40, 14, 8), // snout
        tri(19, 54, 7, 11), // ears
        tri(27, 55, 7, 11),
        line(-26, 40, -18, 8), // tail
      ],
    },
  },
  {
    words: /\bbats?\b|vampire bat/,
    recipe: {
      name: 'Bat',
      parts: [circle(0, 30, 16), tri(-18, 26, 30, 18), tri(18, 26, 30, 18), tri(-20, 26, 26, -10), tri(20, 26, 26, -10), tri(-4, 37, 5, 8), tri(4, 37, 5, 8), line(-3, 22, -2, -8), line(3, 22, 2, -8)],
    },
  },
  {
    words: /ghost|spirit|phantom|spectre|specter|wraith|banshee/,
    recipe: {
      name: 'Ghost',
      parts: [circle(0, 54, 40), box(0, 22, 40, 34), tri(-13, 22, 14, -14), tri(0, 22, 14, -14), tri(13, 22, 14, -14), line(18, 46, 16, -10)],
    },
  },
  {
    words: /zombie|undead|ghoul|mummy|skeleton/,
    recipe: {
      name: 'Zombie',
      parts: [line(-6, 0, 2, 50), line(6, 0, -2, 50), box(0, 48, 22, 44), circle(2, 102, 22), line(6, 86, 30, -2), line(0, 82, 32, -6), box(-2, 48, 26, 6)],
    },
  },
  {
    words: /scorpion/,
    recipe: {
      name: 'Scorpion',
      parts: [
        box(-4, 6, 36, 14), // body
        circle(16, 14, 14), // head
        line(20, 16, 14, 6), // claw arm
        tri(36, 20, 10, 10), // claw
        line(-20, 18, -10, 22), // tail
        line(-30, 40, 12, 16),
        tri(-16, 54, 9, -9), // sting
        line(-12, 8, -8, -8), // legs
        line(0, 8, -4, -8),
        line(10, 8, 4, -8),
      ],
    },
  },
];

/** Our drawing for a monster with this name, if we have one. */
export function ownMonsterLook(name: string): Recipe | undefined {
  const words = name.toLowerCase();
  return LOOKS.find((look) => look.words.test(words))?.recipe;
}
