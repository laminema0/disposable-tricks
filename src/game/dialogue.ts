// What the hero and the monsters say to each other (Amin, 19 Oct). The monsters drank the Earth dry; he is the
// son of the rose, come to take it back. A monster that finds him for the first time taunts him and he answers;
// the first to fall warns of its master; each world's boss talks before the fight, calls its soldiers, and as it
// dies tells him its brothers hold the rest of the world. Pure: the scene shows the lines.

import type { Enemy } from '../settings/schema';

export type Speaker = 'hero' | 'monster' | 'boss';

export interface Line {
  who: Speaker;
  /** The name shown over the line. */
  name: string;
  text: string;
}

export const HERO_NAME = 'Son of the rose';

/** A monster's taunt as it first finds him, and his answer. Several per kind; the world picks one. */
const TAUNTS: Record<Enemy, [string, string][]> = {
  crawler: [
    ['You think you can save this dust?', 'I can. And I will.'],
    ['Run, little seed. Nothing grows here now.', 'Something will.'],
    ['We drank your rivers. You are next.', 'Then come and try.'],
  ],
  thorn: [
    ['A flower? Here? You will wilt like the rest.', 'Not today.'],
    ['Every root you dig up, we already dried.', "I'll find the ones you missed."],
    ['Go home, rose. There is no home.', "I'm making one."],
  ],
  flyer: [
    ['From up here the whole Earth is ours.', 'Then come down and keep it.'],
    ['I can see every dead field from here.', 'Look again soon.'],
    ['Small thing. I will drop on you like rain.', 'Rain would be welcome.'],
  ],
  stalker: [
    ['Every drop you lost, we took.', "I'm here to take it back."],
    ['I have walked this desert since it was green.', 'Then you know what you killed.'],
    ['Your petals will dry in my hands.', 'Your hands first.'],
  ],
  watcher: [
    ['I see you, seed.', 'Then watch me.'],
    ['Nothing moves here without my eye.', "I'm moving."],
    ['The light shows me everything.', 'It shows me you, too.'],
  ],
};

/** The first monster of a world to fall says this. */
const DYING = ['We die… but our master is waiting.', 'Kill us. He will still drink the world.', 'You are too late, rose.'];

/** One boss for each world, in order; after the last they come round again. */
const BOSSES = [
  { name: 'The Thirst', brothers: 'my brothers' },
  { name: 'The Ash Queen', brothers: 'my sisters' },
  { name: 'The Salt King', brothers: 'my brothers' },
  { name: 'The Dust Twins', brothers: 'our elders' },
  { name: 'The Last Drought', brothers: 'the deep ones' },
];

export function bossName(chapter: number): string {
  return BOSSES[(Math.max(1, chapter) - 1) % BOSSES.length].name;
}

/** The taunt a monster of this kind makes in this world, and his answer. */
export function taunt(kind: Enemy, chapter: number): Line[] {
  const options = TAUNTS[kind];
  const [them, him] = options[(Math.max(1, chapter) - 1) % options.length];
  return [
    { who: 'monster', name: monsterName(kind), text: them },
    { who: 'hero', name: HERO_NAME, text: him },
  ];
}

export function dyingLine(chapter: number): string {
  return DYING[(Math.max(1, chapter) - 1) % DYING.length];
}

export function monsterName(kind: Enemy): string {
  return { crawler: 'Charger', thorn: 'Spitter', flyer: 'Diver', stalker: 'Stalker', watcher: 'Watcher' }[kind];
}

/** As he walks into the boss's clearing. It ends with the boss calling its soldiers. */
export function bossIntro(chapter: number): Line[] {
  const boss = BOSSES[(Math.max(1, chapter) - 1) % BOSSES.length];
  const b = (text: string): Line => ({ who: 'boss', name: boss.name, text });
  const h = (text: string): Line => ({ who: 'hero', name: HERO_NAME, text });
  return [
    b('Well, well. A son of the rose.'),
    b('You came all this way to give the Earth back its water?'),
    h('Yes. Every flower you dried.'),
    b('You? Against me?'),
    h('I can. And I will end you.'),
    b('Brave little bud. First, meet my soldiers.'),
  ];
}

/** When its soldiers have fallen. */
export function bossAlone(chapter: number): Line[] {
  const name = bossName(chapter);
  return [
    { who: 'boss', name, text: 'Enough. Then face me yourself.' },
  ];
}

/** As it dies. */
export function bossDeath(chapter: number): Line[] {
  const boss = BOSSES[(Math.max(1, chapter) - 1) % BOSSES.length];
  return [
    { who: 'boss', name: boss.name, text: "Don't smile yet, little rose…" },
    { who: 'boss', name: boss.name, text: `This was one world. ${capital(boss.brothers)} hold the rest.` },
    { who: 'hero', name: HERO_NAME, text: 'Then I will find them. One by one.' },
  ];
}

/** How many soldiers the boss calls in, by world. */
export function soldierCount(chapter: number): number {
  return Math.min(6, 2 + Math.max(1, chapter));
}

function capital(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
