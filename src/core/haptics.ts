// A short buzz of the phone for hits, hurts and hard landings (controls research, 19 Oct).
// Android browsers vibrate; iPhone Safari does not let a web page do it, so there it is silently nothing.

export const BUZZ = {
  /** He struck something. */
  hit: 12,
  /** He was hurt. */
  hurt: 30,
  /** He landed hard. */
  land: 8,
};

export function buzz(ms: number): void {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') navigator.vibrate(ms);
  } catch {
    // Some browsers throw before the first touch; a missed buzz is fine.
  }
}
