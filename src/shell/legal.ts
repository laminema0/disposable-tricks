// The one line that says who the app is for and links to the privacy page: "Ages 16 and up · Privacy".
// It is seen before play and never during it:
//   - in the rail of the pick screen, above the button;
//   - under the first title card, when a visit starts from a share link and so skips the pick screen.
// The screens belong to src/ui and are rebuilt whenever they change, so the line is put back in
// each time. If src/ui wants to place it itself, it can call legalLine() and drop the watcher.

export const PRIVACY_PAGE = 'privacy.html';

export function legalLine(): HTMLElement {
  const line = document.createElement('p');
  line.className = 'legal';
  const link = document.createElement('a');
  link.href = PRIVACY_PAGE;
  link.textContent = 'Privacy';
  line.append('Ages 16 and up · ', link);
  return line;
}

export function startLegalLine(): void {
  const ui = document.getElementById('ui');
  if (!ui) return;

  let pickSeen = false;
  let titleCardDone = false;

  function place(): void {
    const pick = ui!.querySelector<HTMLElement>(':scope > .pick');
    if (pick && !pick.hidden) pickSeen = true;

    const rail = pick?.querySelector<HTMLElement>('.rail');
    if (rail && !rail.querySelector('.legal')) {
      const last = rail.lastElementChild;
      if (last instanceof HTMLButtonElement) last.before(legalLine());
      else rail.append(legalLine());
    }

    // The title card is the first card. It only carries the line until the pick screen has been seen.
    const frame = ui!.querySelector<HTMLElement>(':scope > .card .frame');
    if (frame && !pickSeen && !titleCardDone && frame.childElementCount > 0) {
      titleCardDone = true;
      frame.append(legalLine());
    }
  }

  new MutationObserver(place).observe(ui, { childList: true, subtree: true });
  place();
}
