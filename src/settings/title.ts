// Pre-made game names and intro lines, chosen by the seed. They are what a game gets
// when no AI is there to write them.

import { makeRng } from '../core/rng';
import type { Mood, World } from './schema';

const ADJECTIVES: Record<Mood, readonly string[]> = {
  calm: ['Quiet', 'Slow', 'Still', 'Soft', 'Sleeping'],
  happy: ['Bright', 'Warm', 'Golden', 'Singing', 'Glad'],
  eerie: ['Hollow', 'Pale', 'Whispering', 'Sunken', 'Watching'],
  fierce: ['Burning', 'Red', 'Iron', 'Howling', 'Scorched'],
};

// Each mood only names things that can be met in it (eerie has no lamps, for one).
const THINGS: Record<Mood, readonly string[]> = {
  calm: ['Lamp', 'Flower', 'Moon', 'Firefly', 'Mirror', 'Petal'],
  happy: ['Lamp', 'Flower', 'Moon', 'Firefly', 'Petal', 'Pond'],
  eerie: ['Firefly', 'Flower', 'Moon', 'Pond', 'Shadow', 'Petal'],
  fierce: ['Lamp', 'Mirror', 'Ember', 'Shadow', 'Flower', 'Moon'],
};

const PLACES: Record<World, readonly string[]> = {
  forest: ['Road', 'Wood', 'Path', 'Grove', 'Thicket'],
  town: ['Street', 'Square', 'Lane', 'Alley', 'Rooftops'],
  ruins: ['Hall', 'Arch', 'Stair', 'Court', 'Wall'],
  shore: ['Tide', 'Pier', 'Dune', 'Bay', 'Reef'],
};

/** A name such as "The Quiet Lamp Road". The same inputs always give the same name. */
export function makeTitle(mood: Mood, world: World, seed: number): string {
  const rng = makeRng(seed ^ 0x7171e);
  const pick = (words: readonly string[]) => words[Math.floor(rng() * words.length)];
  return `The ${pick(ADJECTIVES[mood])} ${pick(THINGS[mood])} ${pick(PLACES[world])}`;
}

// Every line must fit the title card on one line (INTRO_MAX in the schema).
const INTROS: Record<Mood, readonly string[]> = {
  calm: [
    'Walk softly. The lamps remember you.',
    'A quiet road, a small flower, a long night.',
    'Nothing hurries here. Not even the dark.',
    'Keep to the dim places and breathe.',
  ],
  happy: [
    'The dusk is warm and the road is yours.',
    'Bring the flower. Leave the worry.',
    'Even the monsters seem glad to see you.',
    'A bright little walk before the stars come out.',
  ],
  eerie: [
    'Only the fireflies know the way through.',
    'Something in the green dark is listening.',
    'Do not trust a light that moves.',
    'The pond is watching the moon. And you.',
  ],
  fierce: [
    'The road is burning. Walk it anyway.',
    'Hard light, long shadows, no mercy.',
    'Strike first or stay hidden.',
    'Every lamp here is a dare.',
  ],
};

/** A one-line intro for the title card. The same inputs always give the same line. */
export function makeIntro(mood: Mood, seed: number): string {
  const lines = INTROS[mood];
  return lines[Math.floor(makeRng(seed ^ 0x1470)() * lines.length)];
}
