// A test run of a trick outside the browser, for the unit tests only.
// It uses the very same runtime text as the locked frame (public/trick-frame.html), so a
// script that passes here is run by the same code in the game. Node only.
//
// This is a test bench for OUR OWN test scripts only. It is not a lock, and a script written by
// a model must never be run here: Node's vm is not a security boundary. In the game a trick
// runs only in the sandboxed frame with no
// network. Here it runs in a bare context with a time limit, which is enough to learn
// whether it works.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { checkTrick, TRICK_PARAMS } from '../../src/trick/check';

let runtime: string | undefined;

/** The runtime block of the frame page, read once. */
export function trickRuntime(): string {
  if (runtime === undefined) {
    const page = readFileSync(fileURLToPath(new URL('../../public/trick-frame.html', import.meta.url)), 'utf8');
    const block = /<script id="runtime" type="text\/plain">([\s\S]*?)<\/script>/.exec(page);
    if (!block) throw new Error('The runtime block is missing from public/trick-frame.html');
    runtime = block[1];
  }
  return runtime;
}

export interface TrickRun {
  ok: boolean;
  /** What went wrong, in words a model can act on. Empty when it worked. */
  message: string;
}

/** Check a script, then run six seconds of made-up play. */
export function runTrick(input: unknown, seed = 1): TrickRun {
  const checked = checkTrick(input);
  if (!checked.ok) return { ok: false, message: checked.reason };
  const source = `${trickRuntime()}\nvar __trick = function (${TRICK_PARAMS}) {\n"use strict";\n${checked.code}\n};\n__result = simulate(__trick, ${seed >>> 0});`;
  const sandbox: { __result?: TrickRun } = {};
  try {
    vm.runInNewContext(source, sandbox, { timeout: 2000 });
  } catch (error) {
    const text = error instanceof Error ? error.message : String(error);
    if (/timed out/i.test(text)) return { ok: false, message: 'It froze: the test run did not finish. Avoid loops that never end.' };
    return { ok: false, message: `It could not be read: ${text}` };
  }
  return sandbox.__result ?? { ok: false, message: 'The test run gave no result.' };
}
