// The first look at a trick, before it is run anywhere: is it small enough, and does it
// reach for anything outside the game API? This is a safety filter that REJECTS scripts.
// It is not what keeps a trick locked in: the sandboxed frame does that (no origin, no
// network, a worker that can be stopped). This only turns away the obvious, so that a
// script which tries to get out is never started. Pure: no browser, no server.

/** The longest script we accept, in characters. */
export const TRICK_MAX = 9000;

/**
 * The names a trick is given as empty, so that it cannot reach them. Only the first one
 * ("game") is filled in. The list in public/trick-frame.html must be the same; a unit
 * test checks that it is.
 */
export const TRICK_PARAMS =
  'game, self, globalThis, window, document, fetch, XMLHttpRequest, WebSocket, EventSource, importScripts, postMessage, close, navigator, location, indexedDB, caches, Worker, setTimeout, setInterval, requestAnimationFrame, onmessage';

// Words that have no business in a script that only uses the game API. A script that
// contains any of them is refused.
const REFUSED_WORDS = [
  'import', 'require', 'eval', 'Function', 'constructor', '__proto__', 'prototype', 'Reflect', 'Proxy',
  'fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'importScripts', 'postMessage', 'navigator', 'location',
  'indexedDB', 'caches', 'localStorage', 'sessionStorage', 'document', 'window', 'globalThis', 'self',
  'opener', 'Worker', 'SharedArrayBuffer', 'Atomics', 'WebAssembly', 'debugger',
];
const REFUSED = new RegExp(`(^|[^A-Za-z0-9_$])(${REFUSED_WORDS.join('|')})(?![A-Za-z0-9_$])`);
const ENDLESS_LOOP = /\bwhile\s*\(\s*(true|1)\s*\)|\bfor\s*\(\s*;\s*;\s*\)/;
const MARKUP = /<\/?script|<!--/i;

export type TrickCheck = { ok: true; code: string } | { ok: false; reason: string };

/** Models like to wrap code in a fence or in "function (game) { ... }". Take the body. */
export function unwrapTrick(text: string): string {
  let code = text.trim();
  const fence = /```(?:javascript|js)?\s*\n([\s\S]*?)```/.exec(code);
  if (fence) code = fence[1].trim();
  const wrapped = /^(?:\(\s*)?function\s*\w*\s*\(\s*game\s*\)\s*\{([\s\S]*)\}\s*\)?\s*(?:\(\s*game\s*\))?\s*;?$/.exec(code);
  if (wrapped) code = wrapped[1].trim();
  return code;
}

/** Check a script without running it. On success it returns the script that may be run. */
export function checkTrick(input: unknown): TrickCheck {
  if (typeof input !== 'string') return { ok: false, reason: 'There is no script.' };
  const code = unwrapTrick(input);
  if (code.length < 40) return { ok: false, reason: 'The script is empty.' };
  if (code.length > TRICK_MAX) return { ok: false, reason: `The script is too long (${code.length} characters, the limit is ${TRICK_MAX}).` };
  const word = REFUSED.exec(code);
  if (word) return { ok: false, reason: `The script uses "${word[2]}". Only the game API may be used.` };
  if (ENDLESS_LOOP.test(code)) return { ok: false, reason: 'The script has a loop that never ends.' };
  if (MARKUP.test(code)) return { ok: false, reason: 'The script contains HTML. Only plain JavaScript may be used.' };
  if (!/\bgame\s*\.\s*onUpdate\s*\(/.test(code)) return { ok: false, reason: 'The script never calls game.onUpdate, so nothing would happen.' };
  return { ok: true, code };
}
