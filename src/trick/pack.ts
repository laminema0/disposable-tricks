// Packs a trick's script small enough to travel in a share link, and unpacks it again.
// The link is the only place a script is kept: there is no server store.
// What comes out of a link is as untrusted as what an AI wrote: it is checked again and
// only ever run in the locked frame.

import { TRICK_MAX } from './check';

const toUrl = (bytes: Uint8Array) => {
  let text = '';
  for (const byte of bytes) text += String.fromCharCode(byte);
  return btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const fromUrl = (text: string) => {
  const plain = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = new Uint8Array(plain.length);
  for (let i = 0; i < plain.length; i++) bytes[i] = plain.charCodeAt(i);
  return bytes;
};

async function pipe(bytes: Uint8Array, through: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(through);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** The script, compressed, as text that is safe in a link. */
export async function packTrick(code: string): Promise<string> {
  return toUrl(await pipe(new TextEncoder().encode(code), new CompressionStream('deflate-raw')));
}

/** The script back from a link, or null when the text is not one or is too large. */
export async function unpackTrick(text: string): Promise<string | null> {
  try {
    // A packed script is at most a few thousand characters. Anything much longer is not ours.
    if (text.length > TRICK_MAX * 2) return null;
    const code = new TextDecoder().decode(await pipe(fromUrl(text), new DecompressionStream('deflate-raw')));
    return code.length <= TRICK_MAX ? code : null;
  } catch {
    return null;
  }
}
