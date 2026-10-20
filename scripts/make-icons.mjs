// Draws the app icon: the hero's flower, flat, on the night sky of the game.
// Run with `node scripts/make-icons.mjs`. It writes the PNG and SVG icons into public/.
// The flower uses the same measures as the one on the hero's head (src/game/hero.ts):
// five round petals 4.7 from the centre, a centre dot, a stem and one leaf.

import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const OUT = new URL('../public/', import.meta.url);

const SKY_TOP = '#17153a';
const SKY_BOTTOM = '#070a14';
const GLOW = '#ffd9a0';
const PETAL = '#f3efe6';
const HEART = '#ffe66d';
const STEM = '#6b7388';

/** The flower in its own units, with the foot of the stem at (0, 1) and the heart at (0, -13). */
const HEART_Y = -13;
const PETALS = [0, 1, 2, 3, 4].map((i) => {
  const angle = ((i * 72 - 90) * Math.PI) / 180;
  return { x: Math.cos(angle) * 4.7, y: HEART_Y + Math.sin(angle) * 4.7, r: 3.9 };
});
const DOT = { x: 0, y: HEART_Y, r: 2.7 };
const STEM_RECT = { x: -0.9, y: -11, w: 1.8, h: 12 };
const LEAF = { x: -4.23, y: -5.54, rx: 4.5, ry: 2.2, turn: 0.35 };
/** The flower is 22.6 units tall. It fills this share of the icon, inside the safe zone of a masked icon. */
const FILL = 0.54;
const MIDDLE_Y = -10.3;

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

function inLeaf(x, y) {
  const dx = x - LEAF.x;
  const dy = y - LEAF.y;
  const c = Math.cos(-LEAF.turn);
  const s = Math.sin(-LEAF.turn);
  const lx = dx * c - dy * s;
  const ly = dx * s + dy * c;
  return (lx / LEAF.rx) ** 2 + (ly / LEAF.ry) ** 2 <= 1;
}
const inCircle = (x, y, c) => (x - c.x) ** 2 + (y - c.y) ** 2 <= c.r ** 2;

/** The colour of one point of the icon. u and v run from 0 to 1. */
function colourAt(u, v) {
  const scale = 22.6 / FILL;
  const x = (u - 0.5) * scale;
  const y = (v - 0.5) * scale + MIDDLE_Y;
  if (inCircle(x, y, DOT)) return rgb(HEART);
  if (PETALS.some((petal) => inCircle(x, y, petal))) return rgb(PETAL);
  if (inLeaf(x, y)) return rgb(STEM);
  if (x >= STEM_RECT.x && x <= STEM_RECT.x + STEM_RECT.w && y >= STEM_RECT.y && y <= STEM_RECT.y + STEM_RECT.h)
    return rgb(STEM);
  // The sky, with the soft light the flower stands in.
  const top = rgb(SKY_TOP);
  const bottom = rgb(SKY_BOTTOM);
  const glow = rgb(GLOW);
  const d = Math.hypot(u - 0.5, v - 0.42) / 0.46;
  const light = d < 1 ? 0.2 * (1 - d * d) ** 2 : 0;
  return top.map((t, i) => {
    const sky = t + (bottom[i] - t) * v;
    return sky + (glow[i] - sky) * light;
  });
}

function crcTable() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
}
const CRC = crcTable();
function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  let c = 0xffffffff;
  for (const byte of body) c = CRC[(c ^ byte) & 0xff] ^ (c >>> 8);
  const out = Buffer.alloc(body.length + 8);
  out.writeUInt32BE(data.length, 0);
  body.copy(out, 4);
  out.writeUInt32BE((c ^ 0xffffffff) >>> 0, body.length + 4);
  return out;
}

function png(size) {
  const SAMPLES = 4;
  const rows = Buffer.alloc(size * (size * 3 + 1));
  for (let py = 0; py < size; py++) {
    const row = py * (size * 3 + 1);
    for (let px = 0; px < size; px++) {
      const sum = [0, 0, 0];
      for (let sy = 0; sy < SAMPLES; sy++) {
        for (let sx = 0; sx < SAMPLES; sx++) {
          const c = colourAt((px + (sx + 0.5) / SAMPLES) / size, (py + (sy + 0.5) / SAMPLES) / size);
          sum[0] += c[0];
          sum[1] += c[1];
          sum[2] += c[2];
        }
      }
      for (let i = 0; i < 3; i++) rows[row + 1 + px * 3 + i] = Math.round(sum[i] / SAMPLES ** 2);
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header.set([8, 2, 0, 0, 0], 8); // 8 bits, RGB, no transparency
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(rows, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function svg() {
  const scale = 22.6 / FILL;
  const n = (value) => +value.toFixed(2);
  const shapes = [
    `<rect x="${STEM_RECT.x}" y="${STEM_RECT.y}" width="${STEM_RECT.w}" height="${STEM_RECT.h}" fill="${STEM}"/>`,
    `<ellipse cx="${LEAF.x}" cy="${LEAF.y}" rx="${LEAF.rx}" ry="${LEAF.ry}" fill="${STEM}" transform="rotate(${n((LEAF.turn * 180) / Math.PI)} ${LEAF.x} ${LEAF.y})"/>`,
    ...PETALS.map((petal) => `<circle cx="${n(petal.x)}" cy="${n(petal.y)}" r="${petal.r}" fill="${PETAL}"/>`),
    `<circle cx="${DOT.x}" cy="${DOT.y}" r="${DOT.r}" fill="${HEART}"/>`,
  ];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${n(-scale / 2)} ${n(MIDDLE_Y - scale / 2)} ${n(scale)} ${n(scale)}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${SKY_TOP}"/>
      <stop offset="1" stop-color="${SKY_BOTTOM}"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.42" r="0.46">
      <stop offset="0" stop-color="${GLOW}" stop-opacity="0.2"/>
      <stop offset="0.5" stop-color="${GLOW}" stop-opacity="0.11"/>
      <stop offset="1" stop-color="${GLOW}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect x="${n(-scale / 2)}" y="${n(MIDDLE_Y - scale / 2)}" width="${n(scale)}" height="${n(scale)}" fill="url(#sky)"/>
  <rect x="${n(-scale / 2)}" y="${n(MIDDLE_Y - scale / 2)}" width="${n(scale)}" height="${n(scale)}" fill="url(#glow)"/>
  ${shapes.join('\n  ')}
</svg>
`;
}

mkdirSync(OUT, { recursive: true });
const files = {
  'icon-192.png': png(192),
  'icon-512.png': png(512),
  'apple-touch-icon.png': png(180),
  'icon.svg': svg(),
};
for (const [name, data] of Object.entries(files)) {
  writeFileSync(new URL(name, OUT), data);
  console.log(name, data.length, 'bytes');
}
