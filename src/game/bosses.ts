// The ten bosses, one for each world (Amin, 20 Oct: "every boss in each level has a different characteristic and
// abilities, and is completely different person ... with different dialogues"). Each drank one land dry. Each has
// its own body (kit.ts bossBody), its own way of fighting (monsters.ts stepBoss reads these numbers), its own words,
// and its own line of help. They get harder in order; the tenth, the Last Drought, has a little of all of them.
// Pure data: no game engine.

/** Numbers by phase: the boss has three phases, and each is angrier than the last. */
type ByPhase = [number, number, number];

export type BossBody = 'thirst' | 'ash' | 'salt' | 'twins' | 'lamp' | 'mire' | 'giant' | 'crow' | 'widow' | 'drought';

export interface BossProfile {
  name: string;
  body: BossBody;
  /** Strikes it takes in all, and how many end one phase. Pulling its root ends a phase at once. */
  hits: number;
  perPhase: number;
  /** Seconds its eye stays open, and shut, by phase. */
  open: ByPhase;
  shut: ByPhase;
  /** How far its gaze reaches. */
  range: number;
  /** Its gaze costs a petal after this long. */
  countdown: number;
  /** Hidden inside its gaze for this long once it has found him, and it loses him and is dazed. By phase. */
  loseAfter: ByPhase;
  /** Seconds it stays dazed, by phase. */
  daze: ByPhase;
  /** Seconds between spits at him while its eye has him (0: none), and how many shots fan out each time. */
  spit: ByPhase;
  volley: ByPhase;
  /** Seconds between shots that fall on him from the sky while its eye is open (0: none). */
  rain: ByPhase;
  /** Seconds between stamps that send a wave along the ground both ways (0: none). He jumps over it. */
  stomp: ByPhase;
  /** It walks at him at this speed while its eye is open (0: it stands rooted). */
  walk: ByPhase;
  /** Seconds between gusts from its wings that blow him back (0: none). */
  gust: ByPhase;
  /** Soldiers it calls as it enters each phase (the first is called by the scene as it talks). */
  summon: ByPhase;
  /** As it is hurt into a new phase it vanishes and stands up again further back. */
  blink: boolean;
  /** Seconds to grow back one strike while its eye is shut (0: never). Never past the phase it is in. */
  heal: number;
  /** Before the fight; when its soldiers have fallen; as it dies (it speaks first, he answers). */
  intro: [string, string, string];
  alone: string;
  death: [string, string];
  /** One line of help while he fights it, and one while it is dazed. */
  hint: string;
  dazed: string;
}

const none: ByPhase = [0, 0, 0];

/** In order: the boss of world 1 first. */
export const BOSSES: BossProfile[] = [
  {
    name: 'The Thirst',
    body: 'thirst',
    hits: 6,
    perPhase: 2,
    open: [3.5, 4.5, 5],
    shut: [3, 2.5, 2],
    range: 480,
    countdown: 2.6,
    loseAfter: [1, 1.3, 1.6],
    daze: [5, 4.5, 4],
    spit: [0, 2.2, 1.6],
    volley: [1, 1, 1],
    rain: none,
    stomp: none,
    walk: none,
    gust: none,
    summon: none,
    blink: false,
    heal: 0,
    intro: ['A son of the rose. You came for the water?', 'Every drop you took. I want it back.', 'Then come and drink. First, meet my soldiers.'],
    alone: 'Enough. Face me yourself.',
    death: ["Don't smile yet. My sisters hold the rest.", 'Then I will find them.'],
    hint: 'Strike its stem. Or let its eye see you, then hide.',
    dazed: 'It is dazed. Run in and pull its root.',
  },
  {
    name: 'The Ash Queen',
    body: 'ash',
    hits: 7,
    perPhase: 2,
    open: [3.5, 4, 4.5],
    shut: [2.8, 2.3, 1.8],
    range: 500,
    countdown: 2.8,
    loseAfter: [1, 1.4, 1.7],
    daze: [4.5, 4, 3.6],
    spit: [2, 1.8, 1.5],
    volley: [1, 3, 3],
    rain: none,
    stomp: none,
    walk: none,
    gust: none,
    summon: none,
    blink: false,
    heal: 0,
    intro: ['I burnt this forest for warmth. You look cold, little bud.', 'You burnt it for nothing.', 'Then burn with it. My embers, take him.'],
    alone: 'So. I will light you myself.',
    death: ['The fire was only a beginning. The Salt King drinks the sea.', 'Then I am going to the sea.'],
    hint: 'Its embers fan out. Jump them, or hide and break its gaze.',
    dazed: 'Its fire is out. Pull its root now.',
  },
  {
    name: 'The Salt King',
    body: 'salt',
    hits: 8,
    perPhase: 3,
    open: [4, 4.5, 5],
    shut: [2.6, 2.2, 1.8],
    range: 560,
    countdown: 2.6,
    loseAfter: [1.1, 1.5, 1.8],
    daze: [4.4, 3.9, 3.4],
    spit: [0, 2.2, 1.8],
    volley: [1, 1, 2],
    rain: [2.4, 1.8, 1.3],
    stomp: none,
    walk: none,
    gust: none,
    summon: none,
    blink: false,
    heal: 0,
    intro: ['Kneel. This whole sea knelt to me, and I drank it.', 'I kneel to no one.', 'Then my salt falls on you like rain. Guards!'],
    alone: 'Alone? A king needs no guards.',
    death: ['My crown… the Twins will take it, and your bones.', 'Let them try.'],
    hint: 'Salt falls where you stand. Keep moving, and hide from its eye.',
    dazed: 'The king is dazed. Pull its root.',
  },
  {
    name: 'The Dust Twins',
    body: 'twins',
    hits: 8,
    perPhase: 3,
    open: [3.5, 4, 4.5],
    shut: [2.5, 2, 1.6],
    range: 520,
    countdown: 2.5,
    loseAfter: [1, 1.4, 1.8],
    daze: [4.2, 3.7, 3.2],
    spit: [1.9, 1.6, 1.3],
    volley: [2, 2, 3],
    rain: none,
    stomp: none,
    walk: none,
    gust: none,
    summon: [0, 1, 2],
    blink: true,
    heal: 0,
    intro: ['Two of us, one of you.', 'Then I strike twice.', 'Ha! He is funny, sister. Let our dogs play with him.'],
    alone: 'Now the two of us.',
    death: ['Sister… the Lamp still burns in the city.', 'I will put it out.'],
    hint: 'Hurt, they vanish and rise again right in front of you. Be ready.',
    dazed: 'Both heads are dizzy. Pull the root.',
  },
  {
    name: 'The Last Lamp',
    body: 'lamp',
    hits: 9,
    perPhase: 3,
    open: [5, 5.5, 6],
    shut: [2.2, 1.8, 1.5],
    range: 640,
    countdown: 1.9,
    loseAfter: [1.4, 1.8, 2.2],
    daze: [4, 3.5, 3],
    spit: [0, 2, 1.6],
    volley: [1, 1, 2],
    rain: none,
    stomp: none,
    walk: none,
    gust: none,
    summon: [0, 1, 1],
    blink: false,
    heal: 0,
    intro: ['Every window in this city was mine to watch.', 'Then watch me now.', 'I see you. Everyone sees you. Come out, all of you!'],
    alone: 'The light does not need help.',
    death: ['Dark at last. But the Mire Mother never sleeps.', 'Neither do I.'],
    hint: 'Its light reaches far and burns fast. Hide sooner.',
    dazed: 'The lamp is dark. Pull its root.',
  },
  {
    name: 'The Mire Mother',
    body: 'mire',
    hits: 10,
    perPhase: 3,
    open: [4, 4.5, 5],
    shut: [3, 2.6, 2.2],
    range: 540,
    countdown: 2.4,
    loseAfter: [1.2, 1.6, 2],
    daze: [4, 3.5, 3],
    spit: [2.2, 1.9, 1.6],
    volley: [1, 2, 2],
    rain: none,
    stomp: none,
    walk: none,
    gust: none,
    summon: [0, 2, 3],
    blink: false,
    heal: 2.6,
    intro: ['Shh. My children are sleeping in the mud.', 'Your children drank the marsh.', 'And they are hungry still. Wake up, my darlings!'],
    alone: 'You hurt my children. Mother is here now.',
    death: ['My children… the Giant will crush you for them.', 'He will have to catch me.'],
    hint: 'It heals while its eye is shut. Strike fast; its children keep coming.',
    dazed: 'Mother is dazed. Pull its root before it heals.',
  },
  {
    name: 'The Hollow Giant',
    body: 'giant',
    hits: 10,
    perPhase: 3,
    open: [4, 4.5, 5],
    shut: [2.4, 2, 1.6],
    range: 520,
    countdown: 2.4,
    loseAfter: [1.2, 1.6, 2],
    daze: [4, 3.4, 3],
    spit: none,
    volley: [1, 1, 1],
    rain: none,
    stomp: [3.2, 2.5, 1.9],
    walk: [34, 46, 58],
    gust: none,
    summon: [0, 0, 2],
    blink: false,
    heal: 0,
    intro: ['I am empty. I will fill myself with you.', 'You are big. And slow.', 'Not too slow to step on a flower. Bones, rise!'],
    alone: 'Now I walk.',
    death: ['I was hollow… the Storm Crow will carry you off.', 'Let it come.'],
    hint: 'It walks at you and stamps. Jump the waves, hide from its eye.',
    dazed: 'The giant is stunned. Pull its root.',
  },
  {
    name: 'The Storm Crow',
    body: 'crow',
    hits: 11,
    perPhase: 4,
    open: [4, 4.5, 5],
    shut: [2.4, 2, 1.6],
    range: 560,
    countdown: 2.3,
    loseAfter: [1.2, 1.6, 2],
    daze: [3.8, 3.3, 2.9],
    spit: [2.2, 1.8, 1.5],
    volley: [1, 2, 2],
    rain: [0, 2.2, 1.6],
    stomp: none,
    walk: none,
    gust: [3.2, 2.6, 2],
    summon: [0, 2, 2],
    blink: false,
    heal: 0,
    intro: ['I took the rain clouds away on my wings.', 'Then bring them back.', 'Ha! Fly, my flock. Peck out his petals!'],
    alone: 'The wind is mine. Fall, little seed.',
    death: ['My feathers… the Widow waits in the orchard.', 'Her orchard will bloom again.'],
    hint: 'Its wings blow you back. Hold on, hide, and come again.',
    dazed: 'The crow is dazed. Pull its root.',
  },
  {
    name: 'The Thorn Widow',
    body: 'widow',
    hits: 12,
    perPhase: 4,
    open: [4, 4.4, 4.8],
    shut: [2.4, 2, 1.6],
    range: 560,
    countdown: 2.2,
    loseAfter: [1.3, 1.7, 2.1],
    daze: [3.6, 3.2, 2.8],
    spit: [1.6, 1.3, 1.05],
    volley: [3, 3, 5],
    rain: none,
    stomp: none,
    walk: none,
    gust: none,
    summon: [0, 2, 2],
    blink: true,
    heal: 3.2,
    intro: ['This orchard was mine. I will keep its last flower.', 'The last flower is me.', 'Then I will plant you. Thorns, wake!'],
    alone: 'My thorns are many. You are one.',
    death: ['You cannot stop the Last Drought. It is the dry itself.', 'Then I end the dry.'],
    hint: 'Its thorns come in fans, and it heals. Never let its eye rest on you.',
    dazed: 'The widow is dazed. Pull its root now.',
  },
  {
    name: 'The Last Drought',
    body: 'drought',
    hits: 14,
    perPhase: 5,
    open: [4.5, 5, 5.5],
    shut: [2.2, 1.8, 1.4],
    range: 620,
    countdown: 2,
    loseAfter: [1.4, 1.8, 2.2],
    daze: [3.6, 3.2, 2.8],
    spit: [1.8, 1.5, 1.2],
    volley: [2, 3, 3],
    rain: [0, 2, 1.5],
    stomp: [0, 3, 2.4],
    walk: [0, 30, 44],
    gust: [0, 0, 2.6],
    summon: [0, 2, 3],
    blink: true,
    heal: 4,
    intro: ['I am every dry day there ever was.', 'And I am the last flower. I came for the rain.', 'Let the world choose which of us it keeps. Come, all of you!'],
    alone: 'All alone at the end of the world. Like me.',
    death: ['No… the rain… I can hear it…', 'Grow, world. Grow.'],
    hint: 'It does everything the others did. Hide, move, and strike its stem.',
    dazed: 'The Drought is dazed. Pull its root!',
  },
];

/** The boss of a world (1 to 10). */
export function bossOf(chapter: number): BossProfile {
  return BOSSES[Math.min(BOSSES.length, Math.max(1, chapter)) - 1];
}

/** Its phase (0 to 2) from the strikes it has left. */
export function bossPhase(profile: BossProfile, hitsLeft: number): number {
  return Math.min(2, Math.floor((profile.hits - hitsLeft) / profile.perPhase));
}
