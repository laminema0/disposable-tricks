import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { runTrick } from '../server/src/trickVm';
import { checkTrick, TRICK_MAX, TRICK_PARAMS, unwrapTrick } from '../src/trick/check';
import { TRICK_REFERENCE } from '../src/trick/reference';

/** The example from the reference, taken from the text itself, so the two cannot drift apart. */
const EXAMPLE = TRICK_REFERENCE.slice(TRICK_REFERENCE.indexOf('var basket'));

describe('the first look at a trick', () => {
  it('accepts a script that only uses the game API', () => {
    expect(checkTrick(EXAMPLE).ok).toBe(true);
  });

  it('refuses anything that reaches for the page, the network or storage', () => {
    const body = 'game.onUpdate(function (dt) { game.score += dt; });\n';
    for (const escape of [
      'fetch("https://example.com")',
      'new XMLHttpRequest()',
      'document.cookie',
      'window.parent',
      'localStorage.getItem("x")',
      'self.postMessage(1)',
      'importScripts("x.js")',
      'eval("1")',
      'new Function("return 1")()',
      '(function(){}).constructor("return this")()',
      'game.__proto__',
      'import("x")',
      'navigator.sendBeacon("x")',
      'location.href = "x"',
    ]) {
      const result = checkTrick(`${body}var leak = ${escape};`);
      expect(result.ok, escape).toBe(false);
    }
  });

  it('refuses an endless loop, HTML, a script that is too long, and one that does nothing', () => {
    const body = 'game.onUpdate(function (dt) { game.score += dt; });\n';
    expect(checkTrick(`${body}while (true) {}`).ok).toBe(false);
    expect(checkTrick(`${body}for (;;) {}`).ok).toBe(false);
    expect(checkTrick(`${body}var s = "</script>";`).ok).toBe(false);
    expect(checkTrick(body + 'var x = 1;\n'.repeat(TRICK_MAX)).ok).toBe(false);
    expect(checkTrick('game.add({ x: 1, y: 1, w: 10, h: 10, color: "hero" }); var a = 1; var b = 2;').ok).toBe(false);
    expect(checkTrick(42).ok).toBe(false);
  });

  it('takes the body out of a code fence or a wrapping function', () => {
    expect(unwrapTrick('```js\nvar a = 1;\n```')).toBe('var a = 1;');
    expect(unwrapTrick('function (game) {\n  var a = 1;\n}')).toBe('var a = 1;');
    expect(unwrapTrick('(function(game){ var a = 1; })(game);')).toBe('var a = 1;');
  });

  it('gives a trick the same empty names in the game as in the tests', () => {
    const page = readFileSync(new URL('../public/trick-frame.html', import.meta.url), 'utf8');
    expect(page).toContain(`var PARAMS = '${TRICK_PARAMS}';`);
    // The frame has no network and is sandboxed by the page that embeds it.
    expect(page).toContain("default-src 'none'");
    expect(page).not.toContain('connect-src');
  });
});

describe('the test run of a trick', () => {
  it('passes the example from the reference', () => {
    expect(runTrick(EXAMPLE)).toEqual({ ok: true, message: '' });
  });

  it('fails a script that throws, and says why', () => {
    const run = runTrick('game.onUpdate(function (dt) { game.nothing.here = 1; });\ngame.add({ x: 10, y: 10 });');
    expect(run.ok).toBe(false);
    expect(run.message).toContain('broke while running');
  });

  it('fails a script that cannot be read', () => {
    expect(runTrick('game.onUpdate(function (dt) { var = ; });').message).toContain('could not be read');
  });

  it('fails a script that draws nothing, never changes, or ends at once', () => {
    expect(runTrick('var t = 0; game.onUpdate(function (dt) { t += dt; game.score = t; });').message).toContain('Nothing was drawn');
    expect(runTrick('game.add({ x: 100, y: 100, w: 20, h: 20 }); game.onUpdate(function (dt) { game.score = 1; });').message).toContain('Nothing moved');
    expect(runTrick('game.add({ x: 100, y: 100, w: 20, h: 20, vx: 5 }); game.onUpdate(function (dt) { game.lose(); });').message).toContain('ended by itself');
  });

  it('stops a script that never comes back', () => {
    const run = runTrick('game.add({ x: 1, y: 1 }); game.onUpdate(function (dt) { var i = 0; while (i < 1) { i -= 1; } });');
    expect(run.ok).toBe(false);
    expect(run.message).toContain('froze');
  }, 10_000);

  it('gives a trick nothing but the game: the outside names are empty', () => {
    // A small playable game with a probe in it. If the name were reachable, the probe ends the game at once and the run fails.
    const game = 'var b = game.add({ x: 400, y: 300, w: 20, h: 20, vx: 20 }); game.onUpdate(function (dt) { if (game.input.left) b.x -= 200 * dt; game.score += 1; });';
    for (const name of ['fetch', 'document', 'postMessage', 'setTimeout']) {
      const run = runTrick(`${game}
if (typeof arguments[${TRICK_PARAMS.split(', ').indexOf(name)}] !== "undefined") { game.lose(); }`);
      expect(run, name).toEqual({ ok: true, message: '' });
    }
  });
});
