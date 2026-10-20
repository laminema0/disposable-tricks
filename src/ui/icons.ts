// The pictures on the menus (Amin, 19 Oct: "just buttons without the name, just the visuals"). Drawn here, in one
// line weight, so they look the same on every phone; real emoji differ from one phone to the next.
// Every button that shows only a picture still carries its name for screen readers and as a tooltip.

const line = (body: string, box = 24) =>
  `<svg viewBox="0 0 ${box} ${box}" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
const solid = (body: string, box = 32) => `<svg viewBox="0 0 ${box} ${box}" fill="currentColor" aria-hidden="true">${body}</svg>`;

/** What he can carry. */
export const WEAPON_ICONS: Record<string, string> = {
  knife: line('<path d="M5 19l5.5-5.5"/><path d="M8.5 12l3.5 3.5"/><path d="M12 12.5L19.5 5c.6 3.4-.6 6.4-3.6 8.9L14 15"/>'),
  gun: line('<path d="M3 8.5h15.5l1.5 2.5-1.5 1.5H13"/><path d="M13 12.5l-1.6 5.5H8l1.2-5.5H3z"/><path d="M10.5 12.5c.3 1.3 1.2 2 2.5 2"/>'),
  sword: line('<path d="M19.5 4.5L9 15"/><path d="M19.5 4.5v3L10.5 16.5"/><path d="M6.5 12.5l5 5"/><path d="M8 16l-3.5 3.5"/>'),
  stone: line('<path d="M3.5 17.5c0-2.6 2-4.5 4.6-4.5 2.4 0 4.1 1.6 4.1 3.7 0 2.3-1.9 3.8-4.4 3.8-2.6 0-4.3-1.1-4.3-3z" fill="currentColor" fill-opacity=".18"/><path d="M13 15.5c.2-2.4 2-4 4.2-4 2 0 3.3 1.3 3.3 3 0 2.1-1.7 3.5-3.9 3.5-2 0-3.6-.9-3.6-2.5z" fill="currentColor" fill-opacity=".18"/><path d="M8.5 9.5c0-2.2 1.6-4 3.8-4 1.9 0 3.2 1.3 3.2 3 0 1.9-1.6 3.2-3.6 3.2-2 0-3.4-.8-3.4-2.2z" fill="currentColor" fill-opacity=".18"/>'),
  spear: line('<path d="M4 20L16 8"/><path d="M16 8l1-4 3 3-4 1z"/>'),
  hammer: line('<path d="M6 20l7.5-7.5"/><path d="M11.5 6.5l3-3 6 6-3 3z"/>'),
  bow: line('<path d="M6 4c6 2.5 9.5 7.5 9.5 16"/><path d="M6 4v16"/><path d="M6 12h13"/><path d="M16.5 10l2.5 2-2.5 2"/>'),
  rifle: line('<path d="M2.5 10h17l2 1.5-2 1.5H10l-2 4.5H5l1.5-4.5h-4z"/>'),
  shotgun: line('<path d="M2.5 9.5h18v2.5H11l-2 5H6l1.6-5H2.5z"/><path d="M14 9.5V7"/>'),
  sling: line('<path d="M5 5c2 6 5 9 7 9s5-3 7-9"/><circle cx="12" cy="17" r="2.5"/>'),
};
export const ANY_WEAPON = line('<path d="M12 4v4M12 16v4M4 12h4M16 12h4"/><circle cx="12" cy="12" r="2"/>');

/** The five monsters as small silhouettes, eyes in their own colour. */
export const MONSTER_ICONS: Record<string, string> = {
  // The charger: a low horned wedge on short legs.
  crawler: solid(
    '<path d="M3 22c1-6 6-10 14-10 4 0 7 1 9 3l3-5 1 6c1 1 1 3 0 5-2 2-6 3-12 3H7c-2 0-4-1-4-2z"/><path d="M9 25h3v3H9zM20 25h3v3h-3z"/><circle class="eye" cx="24" cy="18" r="1.6"/>',
  ),
  // The spitter: a rooted plant with a toothed pod.
  thorn: solid(
    '<path d="M15 30h2V18h-2z"/><path d="M16 4c5 0 8 3 8 7s-3 7-8 7-8-3-8-7 3-7 8-7z"/><path d="M9 22c2-3 4-3 6-1-2 2-4 3-6 1zM23 22c-2-3-4-3-6-1 2 2 4 3 6 1z"/><circle class="eye" cx="16" cy="10" r="2"/>',
  ),
  // The diver: wings folded back, beak down.
  flyer: solid(
    '<path d="M16 9c2 0 3 2 3 4l11-4-6 9-8 6-8-6-6-9 11 4c0-2 1-4 3-4z"/><circle class="eye" cx="14.5" cy="13" r="1.2"/><circle class="eye" cx="17.5" cy="13" r="1.2"/>',
  ),
  // The stalker: tall, thin, arms to the ground.
  stalker: solid(
    '<path d="M14 3h4l1 5-1 5 1 17h-2l-1-12-1 12h-2l1-17-1-5z"/><path d="M13 11l-6 17h-1.5l5.5-18zM19 11l6 17h1.5L21 10z"/><circle class="eye" cx="16.8" cy="5.5" r="1.1"/>',
  ),
  // The watcher: one great eye in a spiked ring.
  watcher: solid(
    '<path d="M16 5l2 3 3.5-1.5.5 3.7 3.7.5L24 14l3 2-3 2 1.5 3.3-3.7.5-.5 3.7L18 24l-2 3-2-3-3.5 1.5-.5-3.7-3.7-.5L8 18l-3-2 3-2-1.5-3.3 3.7-.5.5-3.7L14 8z"/><circle cx="16" cy="16" r="5.5" fill="#0b0d14"/><circle class="eye" cx="16" cy="16" r="3"/>',
  ),
};

/** The menu's actions. */
export const ACTION_ICONS = {
  play: line('<path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/>'),
  again: line('<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.5 4.5v4h4"/>'),
  share: line('<path d="M12 15V4"/><path d="M8 8l4-4 4 4"/><path d="M6 12v6.5h12V12"/>'),
  save: line('<path d="M7 4h10v16l-5-3.5L7 20z"/>'),
  saved: line('<path d="M7 4h10v16l-5-3.5L7 20z" fill="currentColor"/>'),
  fresh: line('<path d="M12 5v14M5 12h14"/>'),
  back: line('<path d="M19 12H5"/><path d="M11 6l-6 6 6 6"/>'),
  go: line('<path d="M5 12h14"/><path d="M13 6l6 6-6 6"/>'),
  music: line('<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>'),
  sound: line('<path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z"/><path d="M15.5 9a4 4 0 0 1 0 6"/><path d="M18 6.5a7.5 7.5 0 0 1 0 11"/>'),
  surprise: line('<path d="M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9-1.9 5.1-1.9-5.1-5.1-1.9 5.1-1.9z"/><path d="M18.5 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>'),
  saves: line('<path d="M5 4h10v15l-5-3.5L5 19z"/><path d="M9 4h10v15l-2-1.4"/>'),
};

/** A button that shows only a picture, its name kept for screen readers and as a tooltip. */
export function iconButton(className: string, icon: string, name: string, onClick: () => void): HTMLButtonElement {
  const node = document.createElement('button');
  node.type = 'button';
  node.className = className;
  node.innerHTML = icon;
  node.setAttribute('aria-label', name);
  node.title = name;
  node.addEventListener('click', onClick);
  return node;
}
