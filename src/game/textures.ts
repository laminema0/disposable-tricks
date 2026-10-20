// Placeholder art. Every shape is drawn flat white and tinted at run time (brief 5.3),
// so a palette swap is free. The hero follows "Hero version 5" on the FigJam board.
// Replace these with the SVG exports from the board later.

import Phaser from 'phaser';
import { createBeastTextures } from './beasts';

/** Textures are drawn at double size so they stay sharp on phone screens. */
const RES = 2;
/** Scale to give an image so one texture pixel is half a game pixel. */
export const TEX_SCALE = 1 / RES;

type Draw = (ctx: CanvasRenderingContext2D) => void;

function canvasTexture(scene: Phaser.Scene, key: string, width: number, height: number, draw: Draw): void {
  if (scene.textures.exists(key)) return;
  const texture = scene.textures.createCanvas(key, width * RES, height * RES);
  if (!texture) return;
  const ctx = texture.getContext();
  ctx.scale(RES, RES);
  ctx.fillStyle = '#ffffff';
  draw(ctx);
  texture.refresh();
}

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

export function createTextures(scene: Phaser.Scene): void {
  // Our drawings of the monsters players ask for most (beasts.ts).
  createBeastTextures(scene);
  // ---- hero parts ----
  // Cape: hangs from the shoulder (top right) and sweeps back to the ground.
  canvasTexture(scene, 'hero-cape', 44, 56, (ctx) => {
    ctx.beginPath();
    ctx.moveTo(30, 0);
    ctx.quadraticCurveTo(43, 0, 43, 12);
    ctx.lineTo(41, 56);
    ctx.lineTo(3, 56);
    ctx.quadraticCurveTo(-1, 55, 2, 52);
    ctx.quadraticCurveTo(22, 40, 30, 0);
    ctx.fill();
  });
  canvasTexture(scene, 'hero-torso', 16, 31, (ctx) => {
    ctx.beginPath();
    ctx.roundRect(0, 0, 16, 31, [6, 6, 3, 3]);
    ctx.fill();
  });
  // Leg with a foot that points forward. The hip is at the top.
  canvasTexture(scene, 'hero-leg', 18, 29, (ctx) => {
    ctx.beginPath();
    ctx.moveTo(3, 0);
    ctx.lineTo(10, 0);
    ctx.lineTo(8.5, 26);
    ctx.lineTo(3.5, 26);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(3, 29);
    ctx.lineTo(3, 25);
    ctx.quadraticCurveTo(12, 21, 17, 27);
    ctx.lineTo(17, 29);
    ctx.closePath();
    ctx.fill();
  });
  // Arm with the hand at the bottom.
  canvasTexture(scene, 'hero-arm', 8, 20, (ctx) => {
    ctx.beginPath();
    ctx.roundRect(1.5, 0, 5, 15, 2.5);
    ctx.fill();
    circle(ctx, 4, 16, 4);
  });
  canvasTexture(scene, 'hero-head', 40, 40, (ctx) => circle(ctx, 20, 20, 20));
  canvasTexture(scene, 'hero-eye', 6, 10, (ctx) => {
    ctx.beginPath();
    ctx.ellipse(3, 5, 3, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  canvasTexture(scene, 'hero-stem', 3, 12, (ctx) => ctx.fillRect(0.6, 0, 1.8, 12));
  canvasTexture(scene, 'hero-leaf', 9, 5, (ctx) => {
    ctx.beginPath();
    ctx.ellipse(4.5, 2.5, 4.5, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  canvasTexture(scene, 'hero-petal', 8, 8, (ctx) => circle(ctx, 4, 4, 3.9));
  canvasTexture(scene, 'hero-dot', 6, 6, (ctx) => circle(ctx, 3, 3, 2.7));
  // The hero, from art/hero-v5.svg (Hero version 5 on the board). Each part is drawn from the
  // board's own outline, in the board's units, and scaled so he stands 112 px tall.
  const K = 0.349;
  const board = (ctx: CanvasRenderingContext2D, left: number, top: number) => {
    ctx.scale(K, K);
    ctx.translate(-left, -top);
  };
  // Cape: hangs from the shoulder and sweeps back to a wavy hem on the ground.
  canvasTexture(scene, 'h5-cape', 42, 57, (ctx) => {
    board(ctx, 84, 198);
    ctx.fill(new Path2D('M200 200 C176 202 160 226 152 266 C146 300 128 330 96 346 Q86 351 100 352 Q118 358 136 352 Q154 346 170 352 Q180 355 190 352 C186 328 188 300 190 280 L192 208 Z'));
  });
  canvasTexture(scene, 'h5-body', 17, 35, (ctx) => {
    board(ctx, 182, 196);
    ctx.fill(new Path2D('M190 204 Q206 198 220 206 L226 280 Q206 290 186 280 Z'));
  });
  // A leg, drawn straight down from the hip, with its foot pointing forward.
  canvasTexture(scene, 'h5-leg', 14, 30, (ctx) => {
    board(ctx, -12, -10);
    ctx.lineWidth = 17;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 62);
    ctx.stroke();
    ctx.fill(new Path2D('M-10 62 h22 q12 2 14 12 h-38 z'));
  });
  // An arm, straight down from the shoulder, ending in the hand.
  canvasTexture(scene, 'h5-arm', 8, 27, (ctx) => {
    board(ctx, -11, -8);
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 50);
    ctx.stroke();
    circle(ctx, 0, 56, 10);
  });
  // His sword: grip, crossguard and a long blade. Drawn pointing up from the hand.
  canvasTexture(scene, 'h5-sword', 11, 46, (ctx) => {
    ctx.translate(5.5, 41);
    ctx.rotate(-Math.PI / 2);
    ctx.scale(K, K);
    ctx.beginPath();
    ctx.roundRect(-14, -4, 26, 8, 3);
    ctx.roundRect(10, -15, 7, 30, 3);
    ctx.fill();
    ctx.fill(new Path2D('M17 -7 L98 -7 L114 0 L98 7 L17 7 Z'));
  });

  // The other weapons. Like the sword they point up from the hand.
  canvasTexture(scene, 'wpn-dagger', 8, 26, (ctx) => {
    ctx.beginPath();
    ctx.moveTo(4, 0);
    ctx.lineTo(6.6, 6);
    ctx.lineTo(6, 18);
    ctx.lineTo(2, 18);
    ctx.lineTo(1.4, 6);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(0.5, 18, 7, 2.2);
    ctx.fillRect(2.8, 20, 2.4, 6);
  });
  canvasTexture(scene, 'wpn-spear', 8, 72, (ctx) => {
    ctx.beginPath();
    ctx.moveTo(4, 0);
    ctx.lineTo(7.5, 12);
    ctx.lineTo(4, 16);
    ctx.lineTo(0.5, 12);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(3, 12, 2, 60);
  });
  canvasTexture(scene, 'wpn-axe', 18, 42, (ctx) => {
    ctx.fillRect(4, 0, 2.6, 42);
    ctx.beginPath();
    ctx.moveTo(6, 3);
    ctx.quadraticCurveTo(18, 2, 17, 12);
    ctx.quadraticCurveTo(18, 22, 6, 19);
    ctx.closePath();
    ctx.fill();
  });
  canvasTexture(scene, 'wpn-club', 12, 42, (ctx) => {
    ctx.beginPath();
    ctx.moveTo(1, 5);
    ctx.quadraticCurveTo(6, -4, 11, 5);
    ctx.lineTo(7.4, 42);
    ctx.lineTo(4.6, 42);
    ctx.closePath();
    ctx.fill();
  });
  canvasTexture(scene, 'wpn-staff', 8, 64, (ctx) => {
    ctx.fillRect(3, 4, 2, 60);
    circle(ctx, 4, 4, 4);
  });
  canvasTexture(scene, 'wpn-bow', 16, 52, (ctx) => {
    ctx.lineWidth = 2.6;
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(4, 1.5);
    ctx.quadraticCurveTo(22, 26, 4, 50.5);
    ctx.stroke();
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(4, 1.5);
    ctx.lineTo(4, 50.5);
    ctx.stroke();
  });
  // A gun, in the same flat style: barrel up, grip to the side.
  canvasTexture(scene, 'wpn-gun', 14, 24, (ctx) => {
    ctx.fillRect(4, 0, 5, 17);
    ctx.fillRect(3, 9, 8, 10);
    ctx.fillRect(8, 16, 6, 5);
  });
  canvasTexture(scene, 'wpn-sling', 10, 26, (ctx) => {
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(5, 1);
    ctx.lineTo(2.5, 19);
    ctx.moveTo(5, 1);
    ctx.lineTo(7.5, 19);
    ctx.stroke();
    circle(ctx, 5, 21, 4);
  });
  canvasTexture(scene, 'wpn-stone', 10, 10, (ctx) => circle(ctx, 5, 5, 4.6));
  canvasTexture(scene, 'wpn-knife', 8, 30, (ctx) => {
    ctx.beginPath(); // a single-edged blade with a point
    ctx.moveTo(2, 0);
    ctx.quadraticCurveTo(7.2, 6, 6.6, 19);
    ctx.lineTo(1.6, 19);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(0.5, 19, 7, 1.8); // guard
    ctx.beginPath();
    ctx.roundRect(2.2, 20.8, 3.6, 9, 1.4); // handle
    ctx.fill();
  });
  canvasTexture(scene, 'wpn-hammer', 20, 42, (ctx) => {
    ctx.beginPath();
    ctx.roundRect(8.5, 6, 3, 36, 1.4); // handle
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(1, 0, 18, 9, 1.6); // head
    ctx.fill();
    ctx.fillRect(15, 1, 5, 7); // face
  });
  canvasTexture(scene, 'wpn-pen', 6, 36, (ctx) => {
    ctx.beginPath(); // the nib
    ctx.moveTo(3, 0);
    ctx.lineTo(5, 6);
    ctx.lineTo(1, 6);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(1, 6, 4, 29, 1.4); // body
    ctx.fill();
    ctx.fillRect(4.6, 22, 1.2, 10); // clip
  });
  canvasTexture(scene, 'wpn-pistol', 14, 24, (ctx) => {
    ctx.fillRect(5, 0, 4.5, 15); // barrel and slide
    ctx.fillRect(4, 10, 7, 7);
    ctx.beginPath(); // grip, angled back
    ctx.moveTo(4, 16);
    ctx.lineTo(11, 16);
    ctx.lineTo(13.5, 24);
    ctx.lineTo(7, 24);
    ctx.closePath();
    ctx.fill();
  });
  canvasTexture(scene, 'wpn-shotgun', 12, 60, (ctx) => {
    ctx.fillRect(2.4, 0, 3, 34); // two barrels side by side
    ctx.fillRect(6.6, 0, 3, 34);
    ctx.beginPath(); // fore-end under the barrels
    ctx.roundRect(1.4, 16, 9.2, 9, 2);
    ctx.fill();
    ctx.fillRect(2, 34, 8, 8); // action
    ctx.beginPath(); // stock, widening to the butt
    ctx.moveTo(2.5, 42);
    ctx.lineTo(9.5, 42);
    ctx.lineTo(11.5, 60);
    ctx.lineTo(1, 60);
    ctx.closePath();
    ctx.fill();
  });
  canvasTexture(scene, 'wpn-launcher', 16, 72, (ctx) => {
    ctx.beginPath(); // the flared muzzle
    ctx.moveTo(1, 0);
    ctx.lineTo(15, 0);
    ctx.lineTo(13, 7);
    ctx.lineTo(3, 7);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(3.5, 6, 9, 60); // the long tube
    ctx.fillRect(1, 64, 14, 8); // the back end
    ctx.fillRect(12, 22, 4, 9); // the sight
    ctx.fillRect(12.5, 38, 3.5, 10); // the grip and trigger
  });
  canvasTexture(scene, 'rocket', 30, 10, (ctx) => {
    ctx.beginPath(); // the body and the nose, pointing right
    ctx.moveTo(4, 2.5);
    ctx.lineTo(22, 2.5);
    ctx.quadraticCurveTo(30, 5, 22, 7.5);
    ctx.lineTo(4, 7.5);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath(); // the fins
    ctx.moveTo(0, 0);
    ctx.lineTo(7, 2.5);
    ctx.lineTo(7, 7.5);
    ctx.lineTo(0, 10);
    ctx.closePath();
    ctx.fill();
  });
  canvasTexture(scene, 'wpn-rifle', 12, 64, (ctx) => {
    ctx.fillRect(5, 0, 2.6, 38); // long barrel
    ctx.beginPath(); // scope
    ctx.roundRect(1, 16, 5, 12, 2);
    ctx.fill();
    ctx.fillRect(3.5, 36, 6.5, 9); // action
    ctx.fillRect(8.6, 40, 3.2, 3); // bolt
    ctx.beginPath(); // stock
    ctx.moveTo(3.5, 45);
    ctx.lineTo(10, 45);
    ctx.lineTo(11.5, 64);
    ctx.lineTo(2, 64);
    ctx.closePath();
    ctx.fill();
  });
  // What a bow shoots.
  canvasTexture(scene, 'arrow', 26, 6, (ctx) => {
    ctx.fillRect(0, 2.3, 21, 1.4);
    ctx.beginPath();
    ctx.moveTo(26, 3);
    ctx.lineTo(19, 0);
    ctx.lineTo(19, 6);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(0, 0.8, 5, 4.4);
  });
  canvasTexture(scene, 'wpn-sword', 8, 44, (ctx) => {
    ctx.beginPath(); // blade
    ctx.moveTo(4, 0);
    ctx.lineTo(7, 7);
    ctx.lineTo(6.5, 34);
    ctx.lineTo(1.5, 34);
    ctx.lineTo(1, 7);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(0, 34, 8, 2.5); // guard
    ctx.fillRect(2.8, 36.5, 2.4, 7.5); // grip
  });
  // The slash: a crescent whose tip is 70 px (the reach) from its left edge.
  canvasTexture(scene, 'slash', 72, 104, (ctx) => {
    ctx.beginPath();
    ctx.arc(10, 52, 60, -1, 1);
    ctx.arc(-8, 52, 62, 0.8, -0.8, true);
    ctx.closePath();
    ctx.fill();
  });

  // ---- monster parts (first five enemies on the board: black shapes, yellow eyes) ----
  const poly = (ctx: CanvasRenderingContext2D, points: number[][]) => {
    ctx.beginPath();
    points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.closePath();
    ctx.fill();
  };
  // One disc serves as the Watcher's ball, the Flyer's body, the Stalker's head, eyes and pupils.
  canvasTexture(scene, 'mon-ball', 64, 64, (ctx) => circle(ctx, 32, 32, 32));
  // Crawler body: a dome.
  canvasTexture(scene, 'mon-lump', 56, 44, (ctx) => {
    ctx.beginPath();
    ctx.moveTo(0, 44);
    ctx.bezierCurveTo(0, 8, 12, 0, 28, 0);
    ctx.bezierCurveTo(44, 0, 56, 8, 56, 44);
    ctx.closePath();
    ctx.fill();
  });
  canvasTexture(scene, 'mon-ear', 16, 20, (ctx) => poly(ctx, [[0, 20], [3, 0], [16, 15]]));
  canvasTexture(scene, 'mon-foot', 14, 8, (ctx) => {
    ctx.beginPath();
    ctx.ellipse(7, 8, 7, 8, 0, Math.PI, 0);
    ctx.fill();
  });
  // Thorn body: a bent stem with three thorns.
  canvasTexture(scene, 'mon-stem', 34, 76, (ctx) => {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(15, 76);
    ctx.bezierCurveTo(10, 52, 26, 30, 20, 2);
    ctx.stroke();
    poly(ctx, [[14, 60], [0, 56], [14, 50]]);
    poly(ctx, [[20, 44], [34, 38], [20, 34]]);
    poly(ctx, [[18, 24], [4, 16], [19, 14]]);
  });
  canvasTexture(scene, 'mon-leaves', 80, 22, (ctx) => {
    ctx.beginPath();
    ctx.moveTo(40, 22);
    ctx.quadraticCurveTo(18, 22, 0, 4);
    ctx.quadraticCurveTo(24, 4, 40, 16);
    ctx.quadraticCurveTo(56, 4, 80, 4);
    ctx.quadraticCurveTo(62, 22, 40, 22);
    ctx.fill();
  });
  // Half of the Thorn's round head. Two of them make a mouth that opens.
  canvasTexture(scene, 'mon-jaw', 52, 26, (ctx) => {
    ctx.beginPath();
    ctx.arc(26, 26, 26, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
  });
  canvasTexture(scene, 'mon-shot', 14, 6, (ctx) => poly(ctx, [[0, 3], [5, 0], [14, 3], [5, 6]]));
  // Flyer wing: angular, hinged at the left edge.
  canvasTexture(scene, 'mon-wing', 52, 40, (ctx) =>
    poly(ctx, [[0, 20], [50, 0], [38, 16], [52, 30], [28, 26], [32, 40], [0, 30]]),
  );
  canvasTexture(scene, 'mon-torso', 26, 60, (ctx) => {
    ctx.beginPath();
    ctx.ellipse(13, 30, 13, 30, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  // Stalker arm or leg, hinged at the top.
  canvasTexture(scene, 'mon-limb', 6, 72, (ctx) => {
    ctx.beginPath();
    ctx.roundRect(0.5, 0, 5, 72, 2.5);
    ctx.fill();
  });
  canvasTexture(scene, 'mon-spike', 14, 26, (ctx) => poly(ctx, [[0, 26], [7, 0], [14, 26]]));
  // The Watcher's beam: a cone that starts at its eye (left edge) and fades with distance.
  canvasTexture(scene, 'beam', 256, 128, (ctx) => {
    const gradient = ctx.createLinearGradient(0, 0, 256, 0);
    gradient.addColorStop(0, 'rgba(255,255,255,0.95)');
    gradient.addColorStop(0.6, 'rgba(255,255,255,0.45)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    poly(ctx, [[0, 58], [256, 0], [256, 128], [0, 70]]);
  });

  // ---- flowers ----
  // Five round petals. The heart of the flower is a separate dot, so it can have its own colour.
  canvasTexture(scene, 'flower', 22, 22, (ctx) => {
    for (let i = 0; i < 5; i++) {
      const angle = ((i * 72 - 90) * Math.PI) / 180;
      circle(ctx, 11 + Math.cos(angle) * 5.6, 11 + Math.sin(angle) * 5.6, 5);
    }
  });

  // ---- world ----
  // A soft round glow for every light.
  canvasTexture(scene, 'glow', 128, 128, (ctx) => {
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.2, 'rgba(255,255,255,0.55)');
    gradient.addColorStop(0.55, 'rgba(255,255,255,0.16)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
  });
  canvasTexture(scene, 'drop', 6, 6, (ctx) => circle(ctx, 3, 3, 3));
}

/**
 * The sky: darkest at the top, the "far" colour in the middle, a paler horizon.
 * A gradient cannot be tinted, so there is one texture per set of colours.
 * Colours are "#rrggbb". Returns the texture key.
 */
export function skyTexture(scene: Phaser.Scene, top: string, middle: string, horizon: string): string {
  const key = `sky-${top}-${middle}-${horizon}`;
  canvasTexture(scene, key, 4, 270, (ctx) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, 270);
    gradient.addColorStop(0, top);
    gradient.addColorStop(0.5, middle);
    gradient.addColorStop(0.82, horizon);
    gradient.addColorStop(1, horizon);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 4, 270);
  });
  return key;
}
