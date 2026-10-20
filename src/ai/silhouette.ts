// Turns a generated picture (a black shape on white, server/src/look.ts) into one of the game's shadow creatures:
// see-through around it, only the creature itself kept, small holes such as a painted eye filled, cut to its size,
// turned so its front is to the right like all our drawings, with a place for its glowing eye on its head.
// Pure: it works on raw pixels, so it is tested without a browser.

export interface Silhouette {
  /** Size of the cut-out, in pixels. */
  w: number;
  h: number;
  /** How solid each pixel is, 0 to 255, row by row. */
  alpha: Uint8ClampedArray;
  /** Where its eye goes, on the cut-out. */
  eye: { x: number; y: number };
}

/** A pixel this dark (0 black, 1 white) is the creature; lighter grey, such as a soft shadow, is not. */
const DARK = { full: 0.32, none: 0.62 };

/** Read a picture's pixels (RGBA, row by row). Undefined when it does not hold one clear creature. */
export function silhouetteFrom(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  /** The smallest share of the picture it may cover: a thin wand or whip covers far less than a creature. */
  minArea = 0.02,
): Silhouette | undefined {
  const n = width * height;
  const soft = new Float32Array(n);
  const solid = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const lum = (0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2]) / 255;
    const a = Math.min(1, Math.max(0, (DARK.none - lum) / (DARK.none - DARK.full)));
    soft[i] = a;
    solid[i] = a > 0.5 ? 1 : 0;
  }

  // The parts of the shape: keep the biggest, and any other that is nearly as big (two heads, a detached wing).
  const label = new Int32Array(n).fill(-1);
  const sizes: number[] = [];
  const stack: number[] = [];
  for (let start = 0; start < n; start++) {
    if (!solid[start] || label[start] >= 0) continue;
    const id = sizes.length;
    let size = 0;
    label[start] = id;
    stack.push(start);
    while (stack.length) {
      const i = stack.pop()!;
      size++;
      const x = i % width;
      for (const j of [i - 1, i + 1, i - width, i + width]) {
        if (j < 0 || j >= n || (j === i - 1 && x === 0) || (j === i + 1 && x === width - 1)) continue;
        if (solid[j] && label[j] < 0) {
          label[j] = id;
          stack.push(j);
        }
      }
    }
    sizes.push(size);
  }
  if (sizes.length === 0) return undefined;
  const biggest = Math.max(...sizes);
  const keep = new Set(sizes.map((s, id) => (s >= biggest * 0.3 ? id : -1)).filter((id) => id >= 0));
  const kept = new Uint8Array(n);
  let area = 0;
  for (let i = 0; i < n; i++) {
    if (label[i] >= 0 && keep.has(label[i])) {
      kept[i] = 1;
      area++;
    }
  }
  if (area < n * minArea) return undefined;

  // Small holes inside it (a painted eye, a gap of a few pixels) are filled; open spaces, such as between the legs, stay open.
  const outside = new Uint8Array(n);
  const reach = (i: number) => {
    if (!kept[i] && !outside[i]) {
      outside[i] = 1;
      stack.push(i);
    }
  };
  for (let x = 0; x < width; x++) {
    reach(x);
    reach((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    reach(y * width);
    reach(y * width + width - 1);
  }
  while (stack.length) {
    const i = stack.pop()!;
    const x = i % width;
    if (x > 0) reach(i - 1);
    if (x < width - 1) reach(i + 1);
    if (i >= width) reach(i - width);
    if (i < n - width) reach(i + width);
  }
  const holeLabel = new Int32Array(n).fill(-1);
  for (let start = 0; start < n; start++) {
    if (kept[start] || outside[start] || holeLabel[start] >= 0) continue;
    const members: number[] = [];
    holeLabel[start] = 1;
    stack.push(start);
    while (stack.length) {
      const i = stack.pop()!;
      members.push(i);
      const x = i % width;
      for (const j of [x > 0 ? i - 1 : -1, x < width - 1 ? i + 1 : -1, i - width, i + width]) {
        if (j < 0 || j >= n || kept[j] || outside[j] || holeLabel[j] >= 0) continue;
        holeLabel[j] = 1;
        stack.push(j);
      }
    }
    if (members.length < area * 0.015) for (const i of members) kept[i] = 1;
  }

  // Its box. A shape that fills its box, or runs off three sides of the picture, is not a creature on white.
  let x0 = width;
  let y0 = height;
  let x1 = -1;
  let y1 = -1;
  for (let i = 0; i < n; i++) {
    if (!kept[i]) continue;
    const x = i % width;
    const y = (i / width) | 0;
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  const bw = x1 - x0 + 1;
  const bh = y1 - y0 + 1;
  const edges = Number(x0 === 0) + Number(y0 === 0) + Number(x1 === width - 1) + Number(y1 === height - 1);
  // (0.97, not less: a toaster or a crate is nearly a box and is still a thing.)
  if (edges >= 3 || area > bw * bh * 0.97) return undefined;

  // Which way it faces: its head is usually the high part, so the top of it leans towards its front.
  let all = 0;
  let allX = 0;
  let top = 0;
  let topX = 0;
  const topEdge = y0 + bh * 0.35;
  for (let i = 0; i < n; i++) {
    if (!kept[i]) continue;
    const x = i % width;
    all++;
    allX += x;
    if (((i / width) | 0) <= topEdge) {
      top++;
      topX += x;
    }
  }
  const facesRight = top === 0 || topX / top >= allX / all;

  // The cut-out, two pixels of air round it, front to the right.
  const pad = 2;
  const w = bw + pad * 2;
  const h = bh + pad * 2;
  const alpha = new Uint8ClampedArray(w * h);
  for (let y = 0; y < bh; y++) {
    for (let x = 0; x < bw; x++) {
      const src = (y0 + y) * width + (x0 + x);
      if (!kept[src]) continue;
      const tx = facesRight ? x : bw - 1 - x;
      alpha[(y + pad) * w + (tx + pad)] = 255;
    }
  }
  return { w, h, alpha, eye: eyeOf(alpha, w, h) };
}

/**
 * Its eye: on the front-most part of its upper body that is thick enough to be a head, so it never sits on the tip of
 * a horn, an ear or a spike. Always on the shape.
 */
function eyeOf(alpha: Uint8ClampedArray, w: number, h: number): { x: number; y: number } {
  const solidAt = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && alpha[y * w + x] > 200;
  const r = Math.max(2, Math.round(Math.min(w, h) * 0.04));
  const thick = (cx: number, cy: number) => {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (dx * dx + dy * dy <= r * r && !solidAt(cx + dx, cy + dy)) return false;
    return true;
  };
  let best: { x: number; y: number } | undefined;
  for (let y = Math.round(h * 0.06); y <= Math.round(h * 0.55); y++) {
    for (let x = w - 1 - r; x > (best?.x ?? r); x--) {
      if (thick(x, y)) {
        best = { x: x - Math.round(r * 0.6), y };
        break;
      }
    }
  }
  if (best) return best;
  // Thin all over: the middle of its top part.
  for (let y = 0; y < h; y++) for (let x = Math.round(w / 2); x < w; x++) if (solidAt(x, y)) return { x, y: Math.min(h - 1, y + 1) };
  return { x: Math.round(w / 2), y: Math.round(h / 2) };
}

/**
 * A weapon held in the hand: turned so its long side stands up and its heavier end (a blade, a head, a pan) is at the
 * top, where our own weapons have theirs; the lighter end is the grip, at the bottom.
 */
export function upright(shape: Silhouette): Silhouette {
  let { w, h, alpha } = shape;
  if (w > h) {
    // A quarter turn.
    const turned = new Uint8ClampedArray(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) turned[x * h + (h - 1 - y)] = alpha[y * w + x];
    alpha = turned;
    [w, h] = [h, w];
  }
  let top = 0;
  let bottom = 0;
  for (let i = 0; i < alpha.length; i++) {
    if (alpha[i] < 128) continue;
    if (((i / w) | 0) < h / 2) top++;
    else bottom++;
  }
  if (bottom > top) {
    const flipped = new Uint8ClampedArray(w * h);
    for (let y = 0; y < h; y++) flipped.set(alpha.subarray(y * w, y * w + w), (h - 1 - y) * w);
    alpha = flipped;
  }
  return { w, h, alpha, eye: { x: w / 2, y: 0 } };
}
