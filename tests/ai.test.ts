import { describe, expect, it } from 'vitest';
import { applyWish, repairCards, repairName, repairWish } from '../src/ai/assemble';
import { createAiClient } from '../src/ai/client';
import { checkText } from '../src/ai/filter';
import { createMaker } from '../src/ai/maker';
import type { MakeRequest, MakeResponse } from '../src/ai/protocol';
import { pathKey } from '../src/ai/protocol';
import { readStepWish, readWish } from '../src/ai/wish';
import { WEAPON_PRESETS } from '../src/settings/defaults';
import { applyChoice, premadeCards } from '../src/settings/options';
import { repairSettings } from '../src/settings/validate';

const base = repairSettings({ seed: 7 });

describe('the text filter', () => {
  it('lets a game wish through, tidied', () => {
    for (const wish of ['a scary swamp full of eyes', 'kill all the monsters with my sword', 'blood moon over a dead town', '  cute   and bright  ']) {
      expect(checkText(wish).ok, wish).toBe(true);
    }
    expect(checkText('  cute   and bright  ')).toEqual({ ok: true, text: 'cute and bright' });
  });

  it('refuses unsafe text, personal data and nothing at all', () => {
    expect(checkText('p0rn game')).toEqual({ ok: false, reason: 'unsafe' });
    expect(checkText('i want to kill myself')).toEqual({ ok: false, reason: 'unsafe' });
    expect(checkText('mail me at someone@example.com')).toEqual({ ok: false, reason: 'personal' });
    expect(checkText('call 0151 2345 6789')).toEqual({ ok: false, reason: 'personal' });
    expect(checkText('   ')).toEqual({ ok: false, reason: 'empty' });
    expect(checkText(42)).toEqual({ ok: false, reason: 'empty' });
  });
});

describe('our own reading of a wish', () => {
  it('reads a place as scenery from our library', () => {
    expect(readStepWish('world', 'a town with tall buildings')?.scenery).toEqual([{ kind: 'buildings', amount: 0.8, size: 1.4 }]);
    expect(readStepWish('world', 'a village by the river')?.scenery?.map((piece) => piece.kind)).toEqual(['houses', 'bridges']);
    expect(readStepWish('world', 'somewhere nice')).toBeUndefined();
  });

  it('reads a weapon: its kind, the closest shape we have, and its own name', () => {
    expect(readStepWish('weapon', 'a bow instead of a sword')?.weapon).toEqual(WEAPON_PRESETS.bow);
    expect(readStepWish('weapon', 'a crossbow')?.weapon).toMatchObject({ kind: 'ranged', look: 'bow', name: 'Crossbow' });
    expect(readStepWish('weapon', 'a heavy hammer')?.weapon).toMatchObject({ look: 'hammer', name: 'Hammer', power: 2 });
    expect(readStepWish('weapon', 'I throw snowballs')?.weapon).toMatchObject({ kind: 'thrown', name: 'Snowballs' });
    expect(readStepWish('weapon', 'no weapon at all')?.weapon?.kind).toBe('none');
    expect(readStepWish('weapon', 'something cool')).toBeUndefined();
  });

  it('reads moods, monsters and twists as before', () => {
    expect(readStepWish('mood', 'a scary haunted swamp')?.mood).toBe('eerie');
    expect(readStepWish('monsters', 'something with a huge eye, very hard')).toEqual({ enemies: ['watcher'], difficulty: 3 });
    // A monster we draw ourselves is that monster, not the nearest of the five (18 Oct).
    expect(readStepWish('monsters', 'bats')?.creatures?.[0]).toMatchObject({ name: 'Bat', body: 'flying' });
    expect(readStepWish('monsters', 'a giant dragon')?.creatures?.[0]).toMatchObject({ name: 'Dragon', attack: 'spit', size: 1.45 });
    expect(readStepWish('twist', 'make it pitch black')?.twist).toBe('fewer-lights');
    expect(readStepWish('mood', '')).toBeUndefined();
  });

  it('one sentence can answer several steps, the step he is at first', () => {
    const parts = readWish('a calm town with tall buildings and a bow', 'world');
    expect(parts.map((part) => part.step)).toEqual(['world', 'mood', 'weapon']);
    // "no sword" is a weapon, not also a twist.
    expect(readWish('no sword, just hide').map((part) => part.step)).toEqual(['weapon']);
  });
});

describe('what an AI proposes, made safe', () => {
  it('keeps the cards the game can build, with their own names when those are clean', () => {
    const answer = {
      suggest: 1,
      cards: [
        { label: 'Lantern Quarter', detail: 'Tall blocks, lit windows', patch: { scenery: [{ kind: 'buildings', amount: 0.9, size: 1.3 }] } },
        { label: 'Old Harbour', detail: 'Bridges over black water', patch: { scenery: ['bridges', 'houses'] } },
        { label: 'Dragon Lair', detail: 'Fire everywhere', patch: { scenery: ['dragons'] } },
        { label: 'x'.repeat(40), detail: 'p0rn', patch: { scenery: ['trees'] } },
        'junk',
      ],
    };
    const repaired = repairCards('world', answer, base)!;
    expect(repaired.cards.map((card) => card.label)).toEqual(['Lantern Quarter', 'Old Harbour', 'Trees']);
    expect(repaired.cards[2].detail).toBe('Trees');
    expect(repaired.suggest).toBe(repaired.cards[1].id);
    expect(repaired.cards[0].patch).toEqual({ world: 'town', scenery: [{ kind: 'buildings', amount: 0.9, size: 1.3 }] });
  });

  it('gives up on an answer with fewer than two usable cards, and drops doubles', () => {
    expect(repairCards('weapon', { cards: [{ label: 'Tank', patch: { weapon: { kind: 'vehicle' } } }] }, base)).toBeUndefined();
    const same = { label: 'Bow', patch: { weapon: { look: 'bow' } } };
    expect(repairCards('weapon', { cards: [same, { ...same, label: 'Another bow' }] }, base)).toBeUndefined();
    expect(repairCards('weapon', 'nonsense', base)).toBeUndefined();
    expect(repairCards('weapon', { cards: [same, { label: 'Spear', patch: { weapon: { look: 'spear' } } }, {}, {}, {}, {}] }, base)?.cards).toHaveLength(2);
  });

  it('reads the parts of a wish and says what could not be built', () => {
    const read = repairWish(
      {
        parts: [
          { step: 'world', patch: { scenery: [{ kind: 'buildings', amount: 0.8, size: 1.5 }] } },
          { step: 'weapon', patch: { weapon: { kind: 'ranged', look: 'bow', name: 'Bow' } } },
          { step: 'cheats', patch: { lives: 99 } },
          { step: 'monsters', patch: { enemies: ['dragon'] } },
        ],
        missed: 'dragons',
      },
      base,
    );
    expect(read.parts.map((part) => part.step)).toEqual(['world', 'weapon']);
    expect(read.missed).toBe('dragons');
    expect(repairWish({ missed: '<script>' + 'x'.repeat(60) }, base)).toEqual({ parts: [], missed: '' });
  });

  it('a wish never changes a step that was answered before it', () => {
    const calm = applyChoice(base, 'mood', 'calm');
    const parts = readWish('a scary town with a bow', 'world');
    const { settings, filled } = applyWish(calm, parts, new Set(['mood']));
    expect(settings.mood).toBe('calm');
    expect(filled).toEqual(['world', 'weapon']);
    expect(settings.scenery[0].kind).toBe('buildings');
    expect(settings.weapon.kind).toBe('ranged');
  });

  it('takes a name only when it is clean and fits', () => {
    expect(repairName({ title: 'Silent City', intro: 'Mind the windows.' })).toEqual({ title: 'Silent City', intro: 'Mind the windows.' });
    expect(repairName({ title: 'Silent City', intro: 'x'.repeat(200) })).toEqual({ title: 'Silent City', intro: '' });
    expect(repairName({ title: 'x'.repeat(200) })).toBeUndefined();
    expect(repairName({ title: 'nazi town' })).toBeUndefined();
  });

  it('keys saved cards by the answers before the step', () => {
    const town = applyChoice(applyChoice(base, 'mood', 'calm'), 'world', 'town');
    expect(pathKey('mood', town)).toBe('');
    expect(pathKey('monsters', town)).toBe('calm>buildings+houses+fences');
    expect(pathKey('monsters', { ...town, seed: 99 })).toBe(pathKey('monsters', town));
  });
});

/** A client whose server gives the canned answer for each job, and remembers what was asked. */
function fakeServer(answers: Partial<Record<MakeRequest['job'], MakeResponse | null | 'never'>>) {
  const asked: MakeRequest[] = [];
  return {
    asked,
    client: {
      async ask(request: MakeRequest): Promise<MakeResponse | null> {
        asked.push(request);
        const answer = answers[request.job] ?? null;
        if (answer === 'never') return new Promise(() => undefined);
        return answer;
      },
    },
  };
}

describe('the maker', () => {
  const calm = applyChoice(base, 'mood', 'calm');

  it('asks no AI for the first step', async () => {
    const { client, asked } = fakeServer({});
    const answer = await createMaker(client).cards('mood', base);
    expect(answer.from).toBe('local');
    expect(answer.cards.map((card) => card.id)).toEqual(['calm', 'happy', 'eerie', 'fierce']);
    expect(asked).toEqual([]);
  });

  it('shows the cards the AI proposes for the next step, and remembers them', async () => {
    const cards: MakeResponse = {
      ok: true,
      job: 'cards',
      step: 'world',
      from: 'ai',
      suggest: 0,
      cards: [
        { label: 'Lantern Quarter', detail: 'Tall blocks, lit windows', patch: { scenery: [{ kind: 'buildings', amount: 0.9, size: 1.3 }] } },
        { label: 'Quiet Orchard', detail: 'Low trees and fences', patch: { scenery: [{ kind: 'trees', amount: 0.6, size: 0.8 }, { kind: 'fences', amount: 0.5, size: 1 }] } },
        { label: 'Moon Base', detail: 'Not ours to build', patch: { scenery: ['craters'] as never } },
      ],
    };
    const { client, asked } = fakeServer({ cards });
    const maker = createMaker(client);
    const answer = await maker.cards('world', calm);
    expect(answer.from).toBe('ai');
    expect(answer.cards.map((card) => card.label)).toEqual(['Lantern Quarter', 'Quiet Orchard']);
    expect(answer.suggest).toBe(answer.cards[0].id);
    await maker.cards('world', calm);
    expect(asked).toHaveLength(1);
  });

  it('falls back to our own cards when the AI is missing, wrong or too slow', async () => {
    const own = premadeCards('world', calm).map((card) => card.id);
    for (const answer of [null, { ok: false, reason: 'unavailable' }, { ok: true, job: 'cards', step: 'world', from: 'ai', suggest: null, cards: [] }, 'never'] as const) {
      const maker = createMaker(fakeServer({ cards: answer as MakeResponse | null | 'never' }).client, { cardWaitMs: 20 });
      const cards = await maker.cards('world', calm);
      expect(cards.from).toBe('local');
      expect(cards.cards.map((card) => card.id)).toEqual(own);
    }
  });

  it('turns a written wish into settings, through the AI or by itself', async () => {
    const wish: MakeResponse = {
      ok: true,
      job: 'wish',
      step: 'world',
      from: 'ai',
      missed: 'dragons',
      parts: [
        { step: 'world', patch: { scenery: [{ kind: 'buildings', amount: 0.8, size: 1.5 }] } },
        { step: 'weapon', patch: { weapon: { ...WEAPON_PRESETS.bow } } },
        { step: 'mood', patch: { mood: 'fierce' } },
      ],
    };
    const text = 'a town with tall buildings, dragons, and a bow instead of a sword';
    const locked = new Set(['mood'] as const);
    const viaAi = await createMaker(fakeServer({ wish }).client).wish('world', calm, text, locked);
    expect(viaAi).toMatchObject({ kind: 'made', from: 'ai', filled: ['world', 'weapon'], heard: 'Buildings · Bow, shoots far', missed: 'dragons' });
    if (viaAi.kind === 'made') expect(viaAi.settings.mood).toBe('calm');

    // No server at all: nothing is sent, and the same wish still gives a town and a bow.
    const sent: unknown[] = [];
    const offline = createMaker(createAiClient({ url: '', fetch: async (...args) => (sent.push(args), new Response('{}')) }));
    const alone = await offline.wish('world', calm, text, locked);
    expect(alone).toMatchObject({ kind: 'made', from: 'local', filled: ['world', 'monsters', 'weapon'], missed: '' });
    if (alone.kind === 'made') {
      expect(alone.settings.scenery[0]).toEqual({ kind: 'buildings', amount: 0.8, size: 1.4 });
      expect(alone.settings.weapon.kind).toBe('ranged');
    }
    expect(sent).toEqual([]);
  });

  it('refuses unsafe text without asking anyone, and says so when it understood nothing', async () => {
    const { client, asked } = fakeServer({});
    const maker = createMaker(client);
    expect(await maker.wish('world', calm, 'a p0rn town', new Set())).toEqual({ kind: 'refused' });
    expect(asked).toEqual([]);
    expect(await maker.wish('world', calm, 'asdf qwer', new Set())).toEqual({ kind: 'unclear' });
    expect(await maker.wish('world', calm, '   ', new Set())).toEqual({ kind: 'unclear' });
    expect(await createMaker(fakeServer({ wish: { ok: false, reason: 'unsafe' } }).client).wish('world', calm, 'a town', new Set())).toEqual({ kind: 'refused' });
  });

  it('names the game through the AI, and keeps our own name when it cannot', async () => {
    const named = await createMaker(fakeServer({ name: { ok: true, job: 'name', from: 'ai', title: 'Silent City', intro: 'Mind the windows.' } }).client).name(calm);
    expect(named).toMatchObject({ title: 'Silent City', intro: 'Mind the windows.', mood: 'calm' });
    expect(await createMaker(fakeServer({}).client).name(calm)).toEqual(calm);
    const dirty = await createMaker(fakeServer({ name: { ok: true, job: 'name', from: 'ai', title: '<b>' + 'x'.repeat(90), intro: '' } }).client).name(calm);
    expect(dirty.title).toBe(calm.title);
  });
});

describe('the line to the server', () => {
  const request: MakeRequest = { job: 'name', draft: base, seed: 7 };
  const reply = (body: unknown, status = 200) => async () => new Response(JSON.stringify(body), { status });

  it('sends nothing when there is no address', async () => {
    let called = false;
    const client = createAiClient({ url: '', fetch: async () => ((called = true), new Response('{}')) });
    expect(await client.ask(request)).toBeNull();
    expect(called).toBe(false);
  });

  it('gives the answer when it has the right shape, and null when it does not', async () => {
    const good = { ok: true, job: 'name', title: 'A', intro: 'B', from: 'ai' };
    expect(await createAiClient({ url: '/x', fetch: reply(good) }).ask(request)).toEqual(good);
    expect(await createAiClient({ url: '/x', fetch: reply({ ok: true, job: 'cards', cards: [] }) }).ask(request)).toBeNull();
    expect(await createAiClient({ url: '/x', fetch: reply({}, 500) }).ask(request)).toBeNull();
    expect(await createAiClient({ url: '/x', fetch: async () => new Response('not json') }).ask(request)).toBeNull();
  });

  it('stops waiting after the timeout, then leaves the server alone for a while', async () => {
    let calls = 0;
    let time = 0;
    const client = createAiClient({
      url: '/x',
      now: () => time,
      restMs: 1000,
      timeouts: { cards: 20, wish: 20, name: 20, trick: 20 },
      fetch: () => (calls++, new Promise(() => undefined)),
    });
    expect(await client.ask(request)).toBeNull();
    expect(await client.ask(request)).toBeNull();
    expect(calls).toBe(1);
    time = 1001;
    await client.ask(request);
    expect(calls).toBe(2);
  });
});
