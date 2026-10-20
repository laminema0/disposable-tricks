// Difficulty measured by bot players (tests/sim/playtest.ts; reports/Difficulty.md). The bots never hide,
// sneak-attack or pick up water, so they do worse than a person: these are floors, not targets.
import { describe, expect, it } from 'vitest';
import { SKILLS, summarise, type RoadSetup } from './sim/playtest';

const ROADS: RoadSetup[] = Array.from({ length: 60 }, (_, i) => ({ seed: 1000 + i * 37, screens: 8, monsters: 5 }));

describe('difficulty of the first road, played by bots', () => {
  it('is not out of reach: most bot runs finish it, and a skilled bot nearly always', () => {
    const rows = Object.values(SKILLS).map((skill) => summarise(skill, ROADS));
    if (process.env.PLAYTEST) console.table(rows.map(({ causes, ...r }) => ({ ...r, causes: JSON.stringify(causes) })));
    const by = Object.fromEntries(rows.map((r) => [r.skill, r]));
    expect(by.skilled.winRate).toBeGreaterThanOrEqual(0.75);
    expect(by.average.winRate).toBeGreaterThanOrEqual(0.5);
    expect(by.novice.winRate).toBeGreaterThanOrEqual(0.5);
    // Pits are part of it, but rarely the end of a run.
    expect(by.skilled.falls).toBeLessThan(0.6);
  });
});
