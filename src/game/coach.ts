// Short hints that teach the game while it is played: each one once, at the moment it is needed,
// one at a time. Pure: the scene tells it what is happening, it answers with a line or nothing.

export type HintKey = 'street' | 'back' | 'throw' | 'emptyThrow' | 'pickup' | 'empty' | 'water' | 'goal' | 'jump' | 'hide' | 'crawl' | 'strike' | 'unarmed' | 'seen' | 'beam';

export interface CoachState {
  /** Seconds since the run began. */
  time: number;
  touch: boolean;
  armed: boolean;
  /** A pit lies just ahead of him. */
  pitAhead: boolean;
  /** He stands at, or is about to reach, a place to hide; and what kind. */
  hideAhead: 'grass' | 'shelter' | undefined;
  lying: boolean;
  /** A living monster is close in front of him. */
  monsterNear: boolean;
  /** Some monster sees him now. */
  seen: boolean;
  /** A Watcher's beam is on him. */
  beam: boolean;
  /** He stands at a detour gate; or, in a detour, at the gate he came in by. */
  street?: boolean;
  back?: boolean;
  /** He holds a blade he could throw. */
  canThrow?: boolean;
  /** His thrown weapon lies on the ground. */
  weaponDown?: boolean;
  /** He tried to strike with no charges left. */
  empty?: boolean;
  /** His weapon is out of charges and can be thrown. */
  emptyThrow?: boolean;
  /** He is splashing through water. */
  splashing?: boolean;
}

export function hintLine(key: HintKey, touch: boolean): string {
  switch (key) {
    case 'goal':
      return 'Find 7 flowers. Break stones, try the gates.';
    case 'street':
      return touch ? 'Drag up to go through the gate.' : 'Press W to go through the gate.';
    case 'back':
      return touch ? 'Drag up here to go back.' : 'Press W here to go back.';
    case 'throw':
      return touch ? 'Tap three times quickly to throw your weapon.' : 'Press J three times quickly to throw your weapon.';
    case 'emptyThrow':
      return touch ? 'Empty. Tap to throw it, then pick it up.' : 'Empty. Press J to throw it, then pick it up.';
    case 'pickup':
      return 'Walk over your weapon to pick it up.';
    case 'empty':
      return 'No charges left. One comes back every few seconds.';
    case 'water':
      return 'Splashing is loud. Crawl through water to stay quiet.';
    case 'jump':
      return touch ? 'Drag up to jump.' : 'Press W to jump.';
    case 'hide':
      return touch ? 'Drag down and hold to hide here.' : 'Hold S to hide here.';
    case 'crawl':
      return touch ? 'Slide your finger sideways to crawl.' : 'Keep S held, press A or D to crawl.';
    case 'strike':
      return touch ? 'Tap to strike.' : 'Press J to strike.';
    case 'unarmed':
      return 'No weapon this time. Hide, crawl or jump past.';
    case 'seen':
      return 'It has seen you. Get out of the light.';
    case 'beam':
      return 'Its eye has you. Strike it, hide, or leave its light.';
  }
}

/** The next hint to show, if any. Urgent ones (being seen, the beam) come before teaching ones. */
export function nextHint(state: CoachState, shown: ReadonlySet<HintKey>): HintKey | undefined {
  const wants: [HintKey, boolean][] = [
    ['beam', state.beam],
    ['seen', state.seen],
    ['pickup', state.weaponDown === true],
    ['empty', state.empty === true],
    ['emptyThrow', state.emptyThrow === true],
    ['goal', state.time > 0.6 && state.time < 6],
    ['street', state.street === true],
    ['back', state.back === true],
    ['strike', state.armed && state.monsterNear],
    ['throw', state.canThrow === true && state.monsterNear && shown.has('strike')],
    ['water', state.splashing === true],
    ['unarmed', !state.armed && state.monsterNear],
    ['jump', state.pitAhead],
    ['hide', state.hideAhead !== undefined && !state.lying],
    ['crawl', state.lying && state.monsterNear],
  ];
  for (const [key, now] of wants) if (now && !shown.has(key)) return key;
  return undefined;
}
