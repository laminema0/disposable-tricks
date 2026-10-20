// Small helpers for building the screens. Text is always set as plain text, never as HTML,
// so words that arrive in a share link cannot inject anything into the page.

import { PALETTE_SLOTS, type Palette } from '../settings/schema';

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = '',
  text = '',
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

export function button(className: string, text: string, onTap: () => void): HTMLButtonElement {
  const node = el('button', className, text);
  node.type = 'button';
  node.addEventListener('click', onTap);
  return node;
}

/** Put the six palette colours on an element as CSS variables (--far, --mid, ...). */
export function setPalette(node: HTMLElement, palette: Palette): void {
  for (const slot of PALETTE_SLOTS) node.style.setProperty(`--${slot}`, palette[slot]);
}
