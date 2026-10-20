// Our own drawings of the monsters players ask for most (Amin, 18 Oct: "what I got wasn't a dragon").
// A few blocks cannot make a dragon; these are drawn with curves, as flat silhouettes in one colour like
// everything in the game, and tinted by the light. A described monster whose name is one of these is drawn
// with ours and gets a body to hit that matches it. Anything else keeps the drawing the AI composed.

import type Phaser from 'phaser';
import type { Attack, Body, MoveOf } from '../settings/schema';

type Ctx = CanvasRenderingContext2D;

export interface Beast {
  key: string;
  words: RegExp;
  /** The drawing's size, in its own pixels. The ground is its bottom edge; the front is to the right. */
  w: number;
  h: number;
  /** How tall it stands in the game at size 1, and half its width there, for hitting it. */
  height: number;
  /** Where its eye is on the drawing. */
  eye: { x: number; y: number };
  /** Its wings beat (drawn a little squashed and stretched in turn). */
  flaps?: boolean;
  /** How it really gets about and fights, for when it is named with no AI to ask (ai/wish.ts). */
  blocks: { body: Body; move: MoveOf; attack: Attack; size: number; speed: number; hits: number; eyes: number };
  draw(ctx: Ctx): void;
}

const RES = 3;

function ellipse(ctx: Ctx, x: number, y: number, rx: number, ry: number, turn = 0): void {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, turn, 0, Math.PI * 2);
  ctx.fill();
}

function poly(ctx: Ctx, points: number[]): void {
  ctx.beginPath();
  ctx.moveTo(points[0], points[1]);
  for (let i = 2; i < points.length; i += 2) ctx.lineTo(points[i], points[i + 1]);
  ctx.closePath();
  ctx.fill();
}

/** A limb or a leg: a thick line through these points, with round joints. */
function limb(ctx: Ctx, width: number, points: number[]): void {
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(points[0], points[1]);
  for (let i = 2; i < points.length; i += 2) ctx.lineTo(points[i], points[i + 1]);
  ctx.stroke();
}

export const BEASTS: Beast[] = [
  {
    key: 'beast-dragon',
    words: /dragon|wyvern|drake|wyrm|drache|drago/i,
    blocks: { body: 'flying', move: 'fly', attack: 'spit', size: 1.3, speed: 1, hits: 3, eyes: 1 },
    w: 240,
    h: 172,
    height: 118,
    eye: { x: 196, y: 42 },
    flaps: true,
    draw(ctx) {
      // The wing, raised: a membrane between long fingers, with a scalloped trailing edge.
      ctx.beginPath();
      ctx.moveTo(112, 92);
      ctx.lineTo(96, 6);
      ctx.quadraticCurveTo(84, 40, 60, 26);
      ctx.quadraticCurveTo(52, 52, 26, 46);
      ctx.quadraticCurveTo(36, 70, 14, 74);
      ctx.quadraticCurveTo(52, 92, 84, 104);
      ctx.closePath();
      ctx.fill();
      // Body, long and heavy.
      ellipse(ctx, 108, 108, 46, 23, -0.08);
      // Neck curving up to the head.
      ctx.beginPath();
      ctx.moveTo(136, 96);
      ctx.quadraticCurveTo(168, 82, 178, 46);
      ctx.lineTo(194, 52);
      ctx.quadraticCurveTo(180, 96, 150, 116);
      ctx.closePath();
      ctx.fill();
      // Head, with a long snout and a jaw.
      ellipse(ctx, 192, 44, 17, 11, -0.2);
      poly(ctx, [198, 36, 230, 42, 228, 49, 200, 53]);
      poly(ctx, [196, 50, 224, 54, 220, 60, 194, 57]);
      // Horns sweeping back.
      poly(ctx, [184, 36, 166, 18, 190, 32]);
      poly(ctx, [192, 34, 180, 12, 198, 33]);
      // A ridge of spines along the back.
      for (const [x, y] of [[88, 88], [104, 85], [120, 86], [146, 92], [158, 80]]) poly(ctx, [x - 5, y + 4, x, y - 8, x + 5, y + 4]);
      // Tail, tapering to a spade.
      ctx.beginPath();
      ctx.moveTo(70, 100);
      ctx.quadraticCurveTo(38, 128, 14, 120);
      ctx.lineTo(16, 128);
      ctx.quadraticCurveTo(44, 140, 74, 120);
      ctx.closePath();
      ctx.fill();
      poly(ctx, [16, 116, 0, 112, 6, 124, 0, 136, 18, 130]);
      // Legs, the back one bent like a hound's.
      limb(ctx, 12, [92, 118, 82, 146, 90, 166]);
      poly(ctx, [82, 162, 100, 162, 104, 172, 80, 172]);
      limb(ctx, 11, [134, 120, 140, 148, 132, 166]);
      poly(ctx, [124, 162, 144, 162, 148, 172, 122, 172]);
    },
  },
  {
    key: 'beast-spider',
    words: /spider|tarantula|arana|araignee|spinne|ragno/i,
    blocks: { body: 'low', move: 'walk', attack: 'charge', size: 1, speed: 1.2, hits: 1, eyes: 3 },
    w: 240,
    h: 124,
    height: 62,
    eye: { x: 160, y: 64 },
    draw(ctx) {
      // Eight legs, knees high, feet spread.
      for (const leg of [
        [118, 66, 84, 18, 36, 124],
        [124, 68, 102, 14, 70, 124],
        [130, 68, 126, 12, 108, 124],
        [138, 70, 150, 14, 150, 124],
        [142, 70, 176, 20, 196, 124],
        [146, 72, 196, 34, 230, 124],
      ])
        limb(ctx, 6, leg);
      limb(ctx, 6, [112, 64, 70, 30, 16, 112]);
      limb(ctx, 6, [150, 74, 206, 54, 236, 104]);
      // Abdomen and head.
      ellipse(ctx, 96, 64, 42, 32, -0.2);
      ellipse(ctx, 152, 72, 22, 17);
      // Fangs.
      poly(ctx, [166, 80, 174, 94, 162, 86]);
    },
  },
  {
    key: 'beast-snake',
    words: /snake|serpent|cobra|viper|python|serpiente|schlange|\bsnek/i,
    blocks: { body: 'low', move: 'walk', attack: 'charge', size: 1, speed: 1.1, hits: 1, eyes: 1 },
    w: 240,
    h: 110,
    height: 56,
    eye: { x: 208, y: 22 },
    draw(ctx) {
      // A body in waves along the ground, rising to a head held high: many discs along a curve, thickest in the middle.
      const at = (t: number) => {
        const x = 10 + t * 190;
        const ground = 96 - Math.sin(t * Math.PI * 2.4) * 8;
        const y = t < 0.72 ? ground : ground - Math.pow((t - 0.72) / 0.28, 1.4) * 66;
        return [x, y];
      };
      for (let i = 0; i <= 60; i++) {
        const t = i / 60;
        const [x, y] = at(t);
        const r = 4 + Math.sin(Math.min(1, t * 1.25) * Math.PI) * 9 + (t > 0.8 ? 4 : 0);
        ellipse(ctx, x, y, r, r);
      }
      // A hood behind the head, the head, and a forked tongue.
      ellipse(ctx, 194, 36, 13, 20);
      ellipse(ctx, 206, 24, 18, 11, 0.1);
      limb(ctx, 2, [222, 28, 236, 26]);
      limb(ctx, 2, [230, 27, 238, 21]);
      limb(ctx, 2, [230, 27, 238, 32]);
    },
  },
  {
    key: 'beast-wolf',
    words: /(?<!were)wolf|wolves|hound|\bdog\b|jackal|hyena|\blobos?\b|\bloups?\b|\blup[oi]\b/i,
    blocks: { body: 'low', move: 'walk', attack: 'charge', size: 1.1, speed: 1.3, hits: 2, eyes: 1 },
    w: 240,
    h: 150,
    height: 82,
    eye: { x: 180, y: 46 },
    draw(ctx) {
      // A bushy tail, held out.
      ctx.beginPath();
      ctx.moveTo(62, 70);
      ctx.quadraticCurveTo(26, 64, 8, 92);
      ctx.quadraticCurveTo(30, 96, 64, 88);
      ctx.closePath();
      ctx.fill();
      // Body, deeper at the chest.
      ctx.beginPath();
      ctx.moveTo(56, 76);
      ctx.quadraticCurveTo(100, 54, 156, 58);
      ctx.quadraticCurveTo(170, 84, 158, 104);
      ctx.quadraticCurveTo(110, 108, 66, 100);
      ctx.closePath();
      ctx.fill();
      // Neck and head, the muzzle long, the ears up.
      poly(ctx, [146, 58, 166, 36, 186, 40, 176, 84, 152, 96]);
      ellipse(ctx, 176, 48, 20, 15);
      poly(ctx, [186, 40, 222, 52, 220, 60, 184, 64]);
      poly(ctx, [162, 38, 164, 12, 176, 34]);
      poly(ctx, [174, 34, 182, 10, 188, 38]);
      // Four legs in mid-stride.
      limb(ctx, 10, [76, 96, 64, 124, 70, 148]);
      limb(ctx, 10, [92, 98, 98, 126, 90, 148]);
      limb(ctx, 10, [142, 98, 152, 124, 144, 148]);
      limb(ctx, 10, [156, 96, 170, 120, 176, 148]);
    },
  },
  {
    key: 'beast-bat',
    words: /\bbats?\b|vampire bat|murcielago|chauve.souris|fledermaus|pipistrell/i,
    blocks: { body: 'flying', move: 'fly', attack: 'swoop', size: 0.8, speed: 1.3, hits: 1, eyes: 2 },
    w: 200,
    h: 110,
    height: 52,
    eye: { x: 108, y: 48 },
    flaps: true,
    draw(ctx) {
      for (const side of [-1, 1]) {
        const x = (v: number) => 100 + side * v;
        ctx.beginPath();
        ctx.moveTo(x(8), 52);
        ctx.lineTo(x(92), 14);
        ctx.quadraticCurveTo(x(80), 44, x(62), 40);
        ctx.quadraticCurveTo(x(56), 66, x(36), 60);
        ctx.quadraticCurveTo(x(30), 78, x(10), 76);
        ctx.closePath();
        ctx.fill();
        poly(ctx, [x(2), 38, x(10), 16, x(14), 40]);
      }
      ellipse(ctx, 100, 60, 15, 22);
      ellipse(ctx, 104, 44, 13, 12);
      limb(ctx, 3, [94, 80, 92, 96]);
      limb(ctx, 3, [106, 80, 108, 96]);
    },
  },
  {
    key: 'beast-ghost',
    words: /ghost|spirit|phantom|spectre|specter|wraith|banshee|fantasma|fantome|gespenst|espectro|poltergeist/i,
    blocks: { body: 'flying', move: 'float', attack: 'swoop', size: 1.1, speed: 0.8, hits: 2, eyes: 2 },
    w: 170,
    h: 180,
    height: 100,
    eye: { x: 108, y: 58 },
    draw(ctx) {
      // A dome of a head, a sheet that flows back and ends in a ragged hem, one arm reaching forward.
      ctx.beginPath();
      ctx.moveTo(40, 70);
      ctx.bezierCurveTo(40, 10, 140, 10, 140, 70);
      ctx.bezierCurveTo(142, 110, 138, 140, 132, 160);
      for (let i = 0; i < 6; i++) {
        const x0 = 132 - i * 20;
        ctx.quadraticCurveTo(x0 - 10, 150, x0 - 20, 178 - (i % 2) * 10);
      }
      ctx.bezierCurveTo(20, 140, 8, 110, 40, 70);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(126, 92);
      ctx.quadraticCurveTo(156, 92, 166, 112);
      ctx.quadraticCurveTo(150, 108, 128, 112);
      ctx.closePath();
      ctx.fill();
    },
  },
  {
    key: 'beast-zombie',
    words: /zombie|undead|ghoul|zombi|walking dead|mort.?vivant|untote/i,
    blocks: { body: 'tall', move: 'walk', attack: 'reach', size: 1, speed: 0.7, hits: 2, eyes: 2 },
    w: 150,
    h: 220,
    height: 140,
    eye: { x: 84, y: 30 },
    draw(ctx) {
      // Head lolling forward on a thin neck.
      ellipse(ctx, 76, 32, 19, 22, 0.25);
      limb(ctx, 9, [70, 50, 66, 62]);
      // A ragged shirt over hunched shoulders.
      ctx.beginPath();
      ctx.moveTo(44, 64);
      ctx.quadraticCurveTo(70, 54, 96, 66);
      ctx.lineTo(92, 132);
      for (let i = 0; i < 5; i++) ctx.lineTo(92 - i * 10 - 5, i % 2 ? 140 : 128);
      ctx.lineTo(46, 134);
      ctx.closePath();
      ctx.fill();
      // Arms held out in front.
      limb(ctx, 10, [88, 72, 120, 80, 146, 76]);
      limb(ctx, 10, [80, 84, 112, 96, 140, 94]);
      // Legs, one dragging.
      limb(ctx, 12, [60, 132, 56, 176, 50, 214]);
      limb(ctx, 12, [80, 132, 92, 174, 94, 214]);
      poly(ctx, [40, 210, 60, 210, 62, 220, 38, 220]);
      poly(ctx, [86, 210, 108, 210, 110, 220, 84, 220]);
    },
  },
  {
    key: 'beast-scorpion',
    words: /scorpion/i,
    blocks: { body: 'low', move: 'walk', attack: 'spit', size: 1, speed: 1, hits: 2, eyes: 2 },
    w: 240,
    h: 130,
    height: 66,
    eye: { x: 170, y: 94 },
    draw(ctx) {
      // The tail, arching high over the back to a hooked sting.
      for (let i = 0; i <= 18; i++) {
        const t = i / 18;
        const x = 70 - Math.sin(t * Math.PI * 0.9) * 46 + t * 60;
        const y = 98 - Math.sin(t * Math.PI * 0.75) * 86;
        ellipse(ctx, x, y, 11 - t * 3, 10 - t * 3);
      }
      poly(ctx, [132, 32, 156, 40, 140, 50]);
      // Body in plates, and the head.
      for (let i = 0; i < 5; i++) ellipse(ctx, 76 + i * 18, 102, 17, 15);
      ellipse(ctx, 166, 102, 14, 11);
      // Claws held forward.
      limb(ctx, 8, [170, 98, 192, 86, 206, 92]);
      poly(ctx, [200, 82, 236, 80, 222, 92]);
      poly(ctx, [202, 98, 238, 104, 222, 92]);
      // Legs.
      for (const x of [86, 106, 126, 146]) limb(ctx, 4, [x, 110, x - 10, 122, x - 14, 130]);
    },
  },
  {
    key: 'beast-skeleton',
    words: /skeleton|\bbones?\b|skull|esqueleto|squelette|skelett|scheletr/i,
    w: 150,
    h: 220,
    height: 138,
    eye: { x: 86, y: 26 },
    blocks: { body: 'tall', move: 'walk', attack: 'reach', size: 1, speed: 0.9, hits: 1, eyes: 2 },
    draw(ctx) {
      ellipse(ctx, 78, 28, 18, 19); // skull
      poly(ctx, [68, 38, 92, 38, 90, 50, 70, 50]); // jaw
      limb(ctx, 6, [72, 52, 70, 124]); // spine
      for (let i = 0; i < 4; i++) limb(ctx, 4, [56, 62 + i * 13, 74, 58 + i * 13, 90, 62 + i * 13]); // ribs
      poly(ctx, [56, 120, 86, 120, 80, 134, 62, 134]); // hips
      limb(ctx, 5, [64, 58, 52, 92, 58, 122]); // back arm
      limb(ctx, 5, [80, 58, 104, 76, 132, 70]); // arm reaching
      limb(ctx, 6, [64, 132, 58, 172, 56, 214]);
      limb(ctx, 6, [78, 132, 88, 172, 92, 214]);
      poly(ctx, [46, 210, 64, 210, 66, 220, 44, 220]);
      poly(ctx, [86, 210, 106, 210, 108, 220, 84, 220]);
    },
  },
  {
    key: 'beast-mummy',
    words: /mumm(y|ies)|momia|momie|mumie/i,
    w: 150,
    h: 220,
    height: 140,
    eye: { x: 86, y: 30 },
    blocks: { body: 'tall', move: 'walk', attack: 'reach', size: 1, speed: 0.6, hits: 3, eyes: 1 },
    draw(ctx) {
      ellipse(ctx, 78, 32, 19, 22);
      ctx.beginPath(); // a body wrapped tight, narrowing to the feet
      ctx.moveTo(52, 56);
      ctx.quadraticCurveTo(78, 46, 102, 58);
      ctx.lineTo(96, 140);
      ctx.lineTo(92, 216);
      ctx.lineTo(56, 216);
      ctx.lineTo(54, 140);
      ctx.closePath();
      ctx.fill();
      limb(ctx, 11, [92, 66, 122, 70, 146, 68]); // arms out
      limb(ctx, 11, [86, 80, 116, 88, 142, 86]);
      // Loose bandages trailing behind.
      for (const [x, y, l] of [[54, 90, 26], [56, 128, 34], [58, 170, 22]]) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x - l * 0.6, y + 6, x - l, y + 14);
        ctx.lineTo(x - l + 4, y + 18);
        ctx.quadraticCurveTo(x - l * 0.5, y + 12, x + 2, y + 8);
        ctx.closePath();
        ctx.fill();
      }
    },
  },
  {
    key: 'beast-vampire',
    words: /vampire|dracula|nosferatu|vampir/i,
    w: 170,
    h: 220,
    height: 140,
    eye: { x: 92, y: 32 },
    blocks: { body: 'tall', move: 'walk', attack: 'reach', size: 1, speed: 1.1, hits: 2, eyes: 2 },
    draw(ctx) {
      ellipse(ctx, 86, 34, 16, 20); // head
      poly(ctx, [62, 50, 70, 22, 80, 46]); // high collar
      poly(ctx, [110, 50, 102, 22, 92, 46]);
      ctx.beginPath(); // the cape, spread wide by raised arms, its hem in points like a bat's wing
      ctx.moveTo(86, 48);
      ctx.lineTo(160, 60);
      ctx.lineTo(150, 110);
      ctx.lineTo(140, 96);
      ctx.lineTo(128, 150);
      ctx.lineTo(112, 130);
      ctx.lineTo(100, 196);
      ctx.lineTo(72, 196);
      ctx.lineTo(60, 130);
      ctx.lineTo(44, 150);
      ctx.lineTo(32, 96);
      ctx.lineTo(20, 110);
      ctx.lineTo(10, 60);
      ctx.closePath();
      ctx.fill();
      limb(ctx, 8, [78, 190, 74, 218]);
      limb(ctx, 8, [94, 190, 98, 218]);
    },
  },
  {
    key: 'beast-werewolf',
    words: /werewolf|wolfman|lycan|hombre lobo|loup.?garou|werwolf|lupo mannaro|lobisomem/i,
    w: 170,
    h: 220,
    height: 146,
    eye: { x: 128, y: 40 },
    blocks: { body: 'tall', move: 'walk', attack: 'charge', size: 1.1, speed: 1.3, hits: 2, eyes: 1 },
    draw(ctx) {
      ctx.beginPath(); // hunched back, chest thrust forward
      ctx.moveTo(56, 70);
      ctx.quadraticCurveTo(84, 42, 118, 56);
      ctx.quadraticCurveTo(128, 100, 108, 134);
      ctx.lineTo(66, 136);
      ctx.quadraticCurveTo(48, 100, 56, 70);
      ctx.closePath();
      ctx.fill();
      ellipse(ctx, 122, 46, 18, 15); // head
      poly(ctx, [130, 38, 166, 50, 164, 58, 130, 60]); // muzzle
      poly(ctx, [110, 38, 112, 12, 124, 34]); // ears
      poly(ctx, [120, 34, 128, 10, 134, 38]);
      limb(ctx, 10, [112, 70, 140, 96, 150, 120]); // arm, claws out
      for (const d of [-6, 0, 6]) limb(ctx, 3, [150, 120, 156 + d, 132]);
      limb(ctx, 13, [74, 130, 64, 168, 78, 192, 70, 216]); // legs bent back like a dog's
      limb(ctx, 13, [100, 130, 104, 168, 118, 192, 112, 216]);
      ctx.beginPath(); // bushy tail
      ctx.moveTo(58, 110);
      ctx.quadraticCurveTo(24, 118, 12, 150);
      ctx.quadraticCurveTo(36, 140, 62, 128);
      ctx.closePath();
      ctx.fill();
    },
  },
  {
    key: 'beast-goblin',
    words: /goblin|\bimps?\b|gremlin|\borcs?\b|kobold/i,
    w: 130,
    h: 120,
    height: 70,
    eye: { x: 82, y: 34 },
    blocks: { body: 'low', move: 'walk', attack: 'charge', size: 1, speed: 1.3, hits: 1, eyes: 2 },
    draw(ctx) {
      ellipse(ctx, 74, 36, 20, 18); // head, big
      poly(ctx, [90, 34, 112, 42, 90, 46]); // long nose
      poly(ctx, [58, 30, 26, 14, 56, 42]); // big ears
      poly(ctx, [84, 24, 104, 6, 92, 30]);
      ellipse(ctx, 66, 72, 20, 22); // hunched body
      limb(ctx, 7, [78, 66, 98, 76, 112, 72]); // arm with a knife
      poly(ctx, [110, 66, 128, 58, 114, 74]);
      limb(ctx, 8, [58, 88, 52, 104, 56, 118]);
      limb(ctx, 8, [74, 88, 82, 104, 80, 118]);
    },
  },
  {
    key: 'beast-troll',
    words: /troll|ogre|brute|\bgiants?\b|hulk/i,
    w: 190,
    h: 230,
    height: 160,
    eye: { x: 124, y: 52 },
    blocks: { body: 'tall', move: 'walk', attack: 'reach', size: 1.2, speed: 0.7, hits: 3, eyes: 2 },
    draw(ctx) {
      ellipse(ctx, 92, 112, 52, 58); // huge hunched body
      ellipse(ctx, 120, 54, 20, 18); // small head thrust forward
      poly(ctx, [132, 54, 148, 62, 130, 66]); // nose
      limb(ctx, 20, [124, 90, 150, 140, 156, 180]); // long arm to the ground, dragging a club
      ctx.beginPath();
      ctx.moveTo(150, 176);
      ctx.lineTo(186, 150);
      ctx.lineTo(190, 166);
      ctx.lineTo(160, 194);
      ctx.closePath();
      ctx.fill();
      limb(ctx, 18, [62, 120, 44, 156, 46, 182]);
      limb(ctx, 22, [72, 160, 66, 222]); // short thick legs
      limb(ctx, 22, [110, 160, 116, 222]);
    },
  },
  {
    key: 'beast-cyclops',
    words: /cyclops|one.eyed/i,
    w: 170,
    h: 230,
    height: 160,
    eye: { x: 96, y: 30 },
    blocks: { body: 'tall', move: 'walk', attack: 'reach', size: 1.2, speed: 0.8, hits: 3, eyes: 1 },
    draw(ctx) {
      ellipse(ctx, 88, 34, 24, 26); // big round head
      poly(ctx, [56, 62, 120, 62, 126, 138, 50, 138]); // broad chest
      poly(ctx, [50, 134, 126, 134, 118, 152, 58, 152]); // belt
      limb(ctx, 16, [118, 72, 146, 108, 150, 140]); // arm, holding a rock up
      ellipse(ctx, 156, 40, 16, 14);
      limb(ctx, 12, [146, 132, 156, 54]);
      limb(ctx, 14, [60, 72, 40, 112, 44, 140]);
      limb(ctx, 18, [72, 150, 68, 224]);
      limb(ctx, 18, [104, 150, 110, 224]);
    },
  },
  {
    key: 'beast-golem',
    words: /golem|rock monster|stone (giant|monster)|statue|gargoyle/i,
    w: 180,
    h: 220,
    height: 150,
    eye: { x: 112, y: 46 },
    blocks: { body: 'tall', move: 'walk', attack: 'reach', size: 1.2, speed: 0.6, hits: 3, eyes: 2 },
    draw(ctx) {
      const rock = (x: number, y: number, w: number, h: number) => {
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 8);
        ctx.fill();
      };
      rock(92, 28, 40, 34); // head
      rock(52, 64, 86, 76); // chest of stacked stone
      rock(60, 140, 70, 24);
      rock(132, 70, 30, 26); // arms of boulders
      rock(140, 98, 28, 34);
      rock(146, 134, 30, 30);
      rock(30, 72, 26, 28);
      rock(22, 102, 26, 30);
      rock(62, 164, 28, 56); // legs
      rock(102, 164, 28, 56);
    },
  },
  {
    key: 'beast-slime',
    words: /slime|blob|ooze|jelly|goo/i,
    w: 140,
    h: 90,
    height: 48,
    eye: { x: 92, y: 40 },
    blocks: { body: 'low', move: 'hop', attack: 'touch', size: 1.1, speed: 0.9, hits: 2, eyes: 2 },
    draw(ctx) {
      ctx.beginPath(); // a dome that sags and drips
      ctx.moveTo(10, 90);
      ctx.bezierCurveTo(10, 10, 130, 10, 130, 90);
      ctx.closePath();
      ctx.fill();
      ellipse(ctx, 70, 86, 68, 6); // spreading out where it sits, like a puddle
      ellipse(ctx, 42, 30, 9, 7); // lumps on top
      ellipse(ctx, 96, 26, 7, 6);
    },
  },
  {
    key: 'beast-robot',
    words: /robot|droid|android|\bmech|machine|cyborg/i,
    w: 150,
    h: 190,
    height: 118,
    eye: { x: 96, y: 36 },
    blocks: { body: 'tall', move: 'walk', attack: 'spit', size: 1, speed: 0.9, hits: 3, eyes: 1 },
    draw(ctx) {
      ctx.fillRect(60, 18, 50, 38); // head
      limb(ctx, 3, [86, 18, 92, 2]); // antenna
      ellipse(ctx, 92, 2, 4, 4);
      ctx.fillRect(46, 62, 72, 64); // body
      ctx.fillRect(74, 56, 16, 8); // neck
      limb(ctx, 9, [116, 72, 140, 86, 146, 70]); // arm with a gun
      ctx.fillRect(138, 60, 12, 10);
      limb(ctx, 9, [50, 72, 34, 100, 40, 124]);
      ctx.fillRect(52, 126, 22, 40); // legs
      ctx.fillRect(92, 126, 22, 40);
      ctx.fillRect(44, 166, 36, 22); // feet
      ctx.fillRect(86, 166, 36, 22);
    },
  },
  {
    key: 'beast-alien',
    words: /alien|martian|extraterrestrial|\bufo\b|grey man|extraterrestr/i,
    w: 130,
    h: 190,
    height: 116,
    eye: { x: 82, y: 42 },
    blocks: { body: 'tall', move: 'walk', attack: 'beam', size: 1, speed: 1, hits: 2, eyes: 1 },
    draw(ctx) {
      ellipse(ctx, 70, 40, 34, 38, -0.15); // a big bare head
      ctx.beginPath(); // narrowing to a small chin
      ctx.moveTo(44, 56);
      ctx.quadraticCurveTo(72, 108, 96, 56);
      ctx.closePath();
      ctx.fill();
      limb(ctx, 6, [70, 90, 70, 104]); // thin neck
      ellipse(ctx, 70, 124, 16, 24); // thin body
      limb(ctx, 4, [80, 112, 104, 132, 114, 128]); // long thin arms, long fingers
      for (const d of [-4, 0, 4]) limb(ctx, 2, [114, 128, 126, 124 + d]);
      limb(ctx, 4, [60, 112, 46, 140, 44, 156]);
      limb(ctx, 5, [64, 146, 60, 188]);
      limb(ctx, 5, [76, 146, 82, 188]);
    },
  },
  {
    key: 'beast-octopus',
    words: /octopus|kraken|squid|tentacle|pulpo|pieuvre|krake/i,
    w: 180,
    h: 140,
    height: 84,
    eye: { x: 112, y: 46 },
    blocks: { body: 'low', move: 'walk', attack: 'reach', size: 1.2, speed: 0.8, hits: 2, eyes: 2 },
    draw(ctx) {
      ellipse(ctx, 92, 46, 40, 38, -0.2); // the mantle, swelling up and back
      // Arms curling out along the ground.
      for (const [x0, x1, x2, up] of [
        [64, 34, 8, 1],
        [76, 56, 30, -1],
        [90, 92, 70, 1],
        [104, 122, 110, -1],
        [116, 146, 172, 1],
        [124, 160, 150, -1],
      ]) {
        ctx.lineWidth = 9;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x0, 74);
        ctx.quadraticCurveTo(x1, 140 - up * 6, x2, 118 - up * 14);
        ctx.stroke();
      }
    },
  },
  {
    key: 'beast-crab',
    words: /crab|lobster/i,
    w: 180,
    h: 110,
    height: 54,
    eye: { x: 104, y: 46 },
    blocks: { body: 'low', move: 'walk', attack: 'charge', size: 1, speed: 1, hits: 2, eyes: 2 },
    draw(ctx) {
      ellipse(ctx, 90, 70, 46, 26); // shell
      limb(ctx, 3, [98, 48, 100, 34]); // eye stalks
      limb(ctx, 3, [110, 50, 114, 36]);
      limb(ctx, 7, [52, 62, 30, 40, 22, 26]); // claws raised
      poly(ctx, [6, 22, 26, 6, 32, 30]);
      poly(ctx, [14, 30, 34, 30, 22, 40]);
      limb(ctx, 7, [128, 62, 150, 40, 158, 26]);
      poly(ctx, [174, 22, 154, 6, 148, 30]);
      poly(ctx, [166, 30, 146, 30, 158, 40]);
      for (const x of [56, 74, 106, 124]) limb(ctx, 4, [x, 82, x + (x < 90 ? -12 : 12), 98, x + (x < 90 ? -16 : 16), 110]);
    },
  },
  {
    key: 'beast-rat',
    words: /\brats?\b|mouse|mice|rodent/i,
    w: 170,
    h: 70,
    height: 36,
    eye: { x: 136, y: 32 },
    blocks: { body: 'low', move: 'walk', attack: 'charge', size: 0.8, speed: 1.4, hits: 1, eyes: 1 },
    draw(ctx) {
      ellipse(ctx, 92, 44, 40, 20); // body
      poly(ctx, [118, 30, 162, 44, 120, 54]); // pointed snout
      ellipse(ctx, 120, 24, 9, 10); // round ear
      ctx.lineWidth = 3; // a long thin tail
      ctx.beginPath();
      ctx.moveTo(54, 48);
      ctx.quadraticCurveTo(20, 40, 2, 60);
      ctx.stroke();
      for (const x of [70, 82, 104, 116]) limb(ctx, 4, [x, 58, x - 2, 70]);
    },
  },
  {
    key: 'beast-raven',
    words: /raven|crow|\bbirds?\b|vulture|eagle|hawk|owl/i,
    w: 200,
    h: 110,
    height: 54,
    eye: { x: 140, y: 42 },
    flaps: true,
    blocks: { body: 'flying', move: 'fly', attack: 'swoop', size: 1, speed: 1.3, hits: 1, eyes: 1 },
    draw(ctx) {
      ellipse(ctx, 106, 58, 34, 16, -0.1); // body
      ellipse(ctx, 138, 46, 14, 12); // head
      poly(ctx, [148, 40, 176, 48, 148, 52]); // beak
      poly(ctx, [76, 58, 44, 50, 38, 70, 74, 66]); // tail fanned
      ctx.beginPath(); // wing raised, feathers fingered at its tip
      ctx.moveTo(90, 52);
      ctx.lineTo(40, 6);
      ctx.lineTo(52, 10);
      ctx.lineTo(44, 0);
      ctx.lineTo(62, 8);
      ctx.lineTo(60, 0);
      ctx.lineTo(80, 16);
      ctx.quadraticCurveTo(110, 30, 124, 52);
      ctx.closePath();
      ctx.fill();
      limb(ctx, 3, [104, 72, 100, 92]); // legs tucked
      limb(ctx, 3, [114, 72, 112, 92]);
    },
  },
  {
    key: 'beast-bear',
    words: /\bbears?\b|grizzly|\bosos?\b/i,
    w: 200,
    h: 140,
    height: 86,
    eye: { x: 160, y: 50 },
    blocks: { body: 'low', move: 'walk', attack: 'charge', size: 1.2, speed: 1, hits: 3, eyes: 1 },
    draw(ctx) {
      ctx.beginPath(); // a heavy body with a hump at the shoulders
      ctx.moveTo(30, 90);
      ctx.quadraticCurveTo(40, 40, 110, 36);
      ctx.quadraticCurveTo(140, 30, 152, 56);
      ctx.lineTo(150, 104);
      ctx.lineTo(36, 108);
      ctx.closePath();
      ctx.fill();
      ellipse(ctx, 160, 60, 22, 19); // head
      poly(ctx, [172, 56, 196, 66, 174, 74]); // snout
      ellipse(ctx, 150, 42, 7, 7); // round ears
      ellipse(ctx, 164, 40, 7, 7);
      limb(ctx, 18, [52, 100, 50, 132]); // legs, thick
      limb(ctx, 18, [80, 100, 84, 132]);
      limb(ctx, 18, [124, 100, 122, 132]);
      limb(ctx, 18, [144, 98, 150, 132]);
    },
  },
  {
    key: 'beast-beetle',
    words: /beetle|\bbugs?\b|insect|cockroach|\bants?\b|termite|scarab/i,
    w: 160,
    h: 80,
    height: 40,
    eye: { x: 128, y: 44 },
    blocks: { body: 'low', move: 'walk', attack: 'charge', size: 0.9, speed: 1.1, hits: 2, eyes: 2 },
    draw(ctx) {
      ellipse(ctx, 76, 46, 48, 26); // shell
      ellipse(ctx, 128, 50, 16, 14); // head
      poly(ctx, [136, 40, 160, 14, 146, 44]); // horn
      for (const x of [50, 76, 102]) {
        limb(ctx, 4, [x, 64, x - 10, 74, x - 16, 80]);
        limb(ctx, 4, [x + 6, 64, x + 14, 74, x + 20, 80]);
      }
    },
  },
  {
    key: 'beast-plant',
    words: /plant|flytrap|venus|\bvines?\b|carnivorous|man.?eater/i,
    w: 150,
    h: 200,
    height: 120,
    eye: { x: 104, y: 40 },
    blocks: { body: 'tall', move: 'still', attack: 'spit', size: 1.1, speed: 1, hits: 2, eyes: 1 },
    draw(ctx) {
      ctx.lineWidth = 10; // a stem bending up out of the ground
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(64, 200);
      ctx.quadraticCurveTo(40, 130, 84, 74);
      ctx.stroke();
      ctx.beginPath(); // leaves at its foot
      ctx.moveTo(62, 190);
      ctx.quadraticCurveTo(20, 160, 6, 176);
      ctx.quadraticCurveTo(30, 196, 62, 196);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(66, 180);
      ctx.quadraticCurveTo(110, 150, 128, 168);
      ctx.quadraticCurveTo(100, 190, 66, 188);
      ctx.fill();
      // The head: two jaws open, toothed.
      ctx.beginPath();
      ctx.moveTo(80, 70);
      ctx.quadraticCurveTo(96, 6, 146, 30);
      ctx.lineTo(96, 58);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(80, 76);
      ctx.quadraticCurveTo(110, 110, 148, 66);
      ctx.lineTo(98, 66);
      ctx.closePath();
      ctx.fill();
      for (let i = 0; i < 4; i++) {
        poly(ctx, [104 + i * 10, 46 - i * 3, 108 + i * 10, 58 - i * 3, 112 + i * 10, 44 - i * 3]);
        poly(ctx, [104 + i * 10, 70 - i, 108 + i * 10, 60 - i, 112 + i * 10, 70 - i]);
      }
    },
  },
  {
    key: 'beast-demon',
    words: /demon|devil|fiend|hellhound|satan|diablo|diable|teufel/i,
    w: 190,
    h: 220,
    height: 146,
    eye: { x: 108, y: 40 },
    blocks: { body: 'tall', move: 'walk', attack: 'spit', size: 1.1, speed: 1, hits: 3, eyes: 2 },
    draw(ctx) {
      ellipse(ctx, 100, 42, 18, 20); // head
      poly(ctx, [86, 32, 70, 2, 92, 26]); // horns curving up
      poly(ctx, [110, 28, 124, 0, 116, 34]);
      ctx.beginPath(); // wings behind the shoulders
      ctx.moveTo(80, 70);
      ctx.lineTo(10, 30);
      ctx.lineTo(24, 70);
      ctx.lineTo(8, 90);
      ctx.lineTo(40, 96);
      ctx.lineTo(30, 120);
      ctx.lineTo(84, 100);
      ctx.closePath();
      ctx.fill();
      poly(ctx, [76, 62, 126, 62, 118, 136, 84, 136]); // body
      limb(ctx, 10, [120, 70, 150, 92, 166, 80]); // arm with claws
      for (const d of [-6, 0, 6]) limb(ctx, 3, [166, 80, 178, 76 + d]);
      limb(ctx, 13, [88, 132, 80, 170, 92, 196, 86, 216]); // goat-like legs
      limb(ctx, 13, [112, 132, 116, 170, 128, 196, 122, 216]);
      ctx.lineWidth = 4; // a tail with an arrow tip
      ctx.beginPath();
      ctx.moveTo(84, 130);
      ctx.quadraticCurveTo(40, 170, 30, 140);
      ctx.stroke();
      poly(ctx, [22, 132, 38, 136, 28, 148]);
    },
  },
  {
    key: 'beast-witch',
    words: /witch|wizard|sorcer|warlock|\bmage\b|necromancer|bruja|brujo|hexe|strega/i,
    w: 200,
    h: 150,
    height: 90,
    eye: { x: 118, y: 52 },
    flaps: true,
    blocks: { body: 'flying', move: 'fly', attack: 'spit', size: 1, speed: 1.1, hits: 2, eyes: 1 },
    draw(ctx) {
      // On a broom, flying, her robe streaming back.
      limb(ctx, 5, [20, 116, 186, 100]); // the broom handle
      poly(ctx, [24, 106, 0, 96, 0, 136, 24, 124]); // its bristles
      ctx.beginPath(); // robe
      ctx.moveTo(98, 62);
      ctx.lineTo(126, 70);
      ctx.lineTo(118, 112);
      ctx.lineTo(60, 126);
      ctx.lineTo(80, 108);
      ctx.lineTo(50, 104);
      ctx.closePath();
      ctx.fill();
      ellipse(ctx, 112, 54, 13, 14); // head
      poly(ctx, [122, 56, 136, 60, 122, 62]); // nose
      poly(ctx, [88, 44, 136, 40, 104, 8]); // hat brim and point
      poly(ctx, [104, 8, 82, 0, 100, 18]);
      limb(ctx, 5, [118, 82, 140, 98]); // hands on the broom
    },
  },
  {
    key: 'beast-yeti',
    words: /yeti|bigfoot|sasquatch|abominable|ape|gorilla/i,
    w: 190,
    h: 220,
    height: 150,
    eye: { x: 124, y: 52 },
    blocks: { body: 'tall', move: 'walk', attack: 'reach', size: 1.2, speed: 0.9, hits: 3, eyes: 2 },
    draw(ctx) {
      // A shaggy body: its outline in tufts.
      ctx.beginPath();
      const tufts = [[60, 60], [90, 40], [120, 44], [140, 70], [138, 110], [132, 150], [120, 160], [62, 160], [50, 120], [46, 84]];
      ctx.moveTo(tufts[0][0], tufts[0][1]);
      for (let i = 1; i <= tufts.length; i++) {
        const [x, y] = tufts[i % tufts.length];
        const [px, py] = tufts[i - 1];
        ctx.quadraticCurveTo((px + x) / 2 + (y - py) * 0.25, (py + y) / 2 - (x - px) * 0.25, x, y);
      }
      ctx.fill();
      ellipse(ctx, 122, 52, 20, 18); // head low between the shoulders
      limb(ctx, 18, [134, 80, 162, 130, 170, 176]); // long arms
      limb(ctx, 18, [56, 80, 36, 126, 34, 166]);
      limb(ctx, 22, [74, 156, 70, 218]);
      limb(ctx, 22, [112, 156, 118, 218]);
    },
  },
  {
    key: 'beast-worm',
    words: /\bworms?\b|sandworm|centipede|millipede|leech|grub/i,
    w: 150,
    h: 200,
    height: 120,
    eye: { x: 108, y: 36 },
    blocks: { body: 'tall', move: 'still', attack: 'reach', size: 1.2, speed: 1, hits: 3, eyes: 1 },
    draw(ctx) {
      // Rising out of the sand in rings, its round mouth open at the top.
      for (let i = 0; i <= 12; i++) {
        const t = i / 12;
        const x = 60 + Math.sin(t * Math.PI * 0.9) * 26 + t * 30;
        const y = 196 - t * 160;
        ellipse(ctx, x, y, 26 - t * 6, 12);
      }
      ctx.beginPath(); // the mouth ringed with teeth
      ctx.arc(116, 30, 26, Math.PI * 1.1, Math.PI * 1.9);
      ctx.fill();
      for (let i = 0; i < 6; i++) {
        const a = Math.PI * (1.1 + i * 0.16);
        poly(ctx, [116 + Math.cos(a) * 22, 30 + Math.sin(a) * 22, 116 + Math.cos(a) * 34, 30 + Math.sin(a) * 34, 116 + Math.cos(a + 0.12) * 22, 30 + Math.sin(a + 0.12) * 22]);
      }
      ellipse(ctx, 70, 198, 46, 6); // the sand heaped round it
    },
  },
  {
    key: 'beast-scarecrow',
    words: /scarecrow/i,
    w: 170,
    h: 230,
    height: 150,
    eye: { x: 92, y: 46 },
    blocks: { body: 'tall', move: 'walk', attack: 'reach', size: 1, speed: 0.8, hits: 2, eyes: 2 },
    draw(ctx) {
      limb(ctx, 7, [84, 60, 84, 230]); // the pole
      ellipse(ctx, 86, 50, 20, 22); // sack head
      poly(ctx, [56, 34, 116, 34, 104, 22, 70, 22]); // hat brim and crown
      poly(ctx, [72, 22, 100, 22, 94, 4, 76, 6]);
      limb(ctx, 6, [20, 86, 152, 82]); // the cross-bar arms
      ctx.beginPath(); // a ragged coat hanging off them
      ctx.moveTo(50, 80);
      ctx.lineTo(120, 78);
      ctx.lineTo(116, 150);
      for (let i = 0; i < 6; i++) ctx.lineTo(116 - i * 12 - 6, i % 2 ? 160 : 146);
      ctx.lineTo(54, 150);
      ctx.closePath();
      ctx.fill();
      for (const x of [20, 152]) for (const d of [-6, 0, 6]) limb(ctx, 2, [x, 84, x + (x < 80 ? -8 : 8), 84 + d]); // straw hands
    },
  },
  {
    key: 'beast-wasp',
    words: /wasp|\bbees?\b|hornet|mosquito|dragonfly/i,
    w: 150,
    h: 90,
    height: 40,
    eye: { x: 116, y: 44 },
    flaps: true,
    blocks: { body: 'flying', move: 'fly', attack: 'swoop', size: 0.8, speed: 1.4, hits: 1, eyes: 2 },
    draw(ctx) {
      ellipse(ctx, 56, 54, 30, 16, 0.25); // striped abdomen (as a silhouette, its stripes are notches)
      for (const x of [44, 58]) {
        ctx.clearRect(x, 38, 3, 6);
        ctx.clearRect(x + 2, 64, 3, 6);
      }
      poly(ctx, [26, 64, 6, 74, 28, 70]); // sting
      ellipse(ctx, 92, 48, 14, 12); // thorax
      ellipse(ctx, 114, 46, 11, 10); // head
      limb(ctx, 2, [118, 38, 132, 22]); // antennae
      limb(ctx, 2, [114, 38, 120, 20]);
      ellipse(ctx, 82, 22, 26, 10, -0.5); // wings
      ellipse(ctx, 98, 24, 20, 8, -0.2);
      for (const x of [86, 96]) limb(ctx, 2, [x, 58, x - 4, 76]);
    },
  },
  {
    key: 'beast-frog',
    words: /\bfrogs?\b|\btoads?\b/i,
    w: 140,
    h: 90,
    height: 42,
    eye: { x: 96, y: 26 },
    blocks: { body: 'low', move: 'hop', attack: 'spit', size: 1, speed: 1.1, hits: 1, eyes: 2 },
    draw(ctx) {
      ellipse(ctx, 70, 60, 46, 24, -0.15); // squat body
      ellipse(ctx, 96, 30, 11, 11); // eye bumps
      ellipse(ctx, 78, 30, 10, 10);
      limb(ctx, 10, [30, 70, 12, 82, 36, 90]); // folded back leg
      limb(ctx, 7, [100, 74, 110, 90]); // front leg
    },
  },
  {
    key: 'beast-dino',
    words: /dinosaur|t.?rex|raptor|tyranno|velociraptor|lizard/i,
    w: 220,
    h: 200,
    height: 130,
    eye: { x: 170, y: 40 },
    blocks: { body: 'tall', move: 'walk', attack: 'charge', size: 1.1, speed: 1.2, hits: 3, eyes: 1 },
    draw(ctx) {
      ctx.beginPath(); // body leaning forward, balanced by a long tail
      ctx.moveTo(4, 96);
      ctx.quadraticCurveTo(60, 70, 110, 70);
      ctx.quadraticCurveTo(146, 60, 154, 50);
      ctx.lineTo(166, 72);
      ctx.quadraticCurveTo(150, 120, 120, 128);
      ctx.quadraticCurveTo(70, 122, 4, 104);
      ctx.closePath();
      ctx.fill();
      // A big head with a long jaw.
      poly(ctx, [146, 30, 196, 28, 214, 44, 210, 58, 168, 60, 150, 60]);
      poly(ctx, [160, 62, 206, 62, 200, 72, 164, 72]);
      limb(ctx, 4, [150, 92, 162, 104, 168, 100]); // tiny arm
      limb(ctx, 18, [96, 116, 104, 152, 92, 176, 98, 198]); // strong legs
      limb(ctx, 16, [124, 116, 136, 154, 128, 178, 138, 198]);
    },
  },
  {
    key: 'beast-cat',
    words: /\bcats?\b|panther|tiger|\blions?\b|leopard|jaguar|puma|lynx/i,
    w: 200,
    h: 120,
    height: 70,
    eye: { x: 168, y: 40 },
    blocks: { body: 'low', move: 'walk', attack: 'charge', size: 1.1, speed: 1.5, hits: 2, eyes: 1 },
    draw(ctx) {
      ctx.beginPath(); // a long low body, crouched to spring
      ctx.moveTo(40, 66);
      ctx.quadraticCurveTo(100, 44, 150, 54);
      ctx.lineTo(152, 82);
      ctx.quadraticCurveTo(100, 90, 44, 84);
      ctx.closePath();
      ctx.fill();
      ellipse(ctx, 164, 48, 18, 15); // head
      poly(ctx, [152, 38, 156, 20, 166, 36]); // ears
      poly(ctx, [166, 36, 176, 20, 178, 40]);
      poly(ctx, [174, 46, 190, 52, 174, 58]); // muzzle
      limb(ctx, 9, [60, 80, 50, 98, 58, 118]); // legs
      limb(ctx, 9, [80, 82, 86, 118]);
      limb(ctx, 9, [132, 80, 126, 118]);
      limb(ctx, 9, [146, 78, 156, 118]);
      ctx.lineWidth = 7; // tail curling up
      ctx.beginPath();
      ctx.moveTo(42, 70);
      ctx.quadraticCurveTo(6, 64, 14, 22);
      ctx.stroke();
    },
  },
  {
    key: 'beast-knight',
    words: /knight|soldier|warrior|armou?r|paladin|samurai|guard|caballero|chevalier|ritter/i,
    w: 170,
    h: 220,
    height: 142,
    eye: { x: 96, y: 34 },
    blocks: { body: 'tall', move: 'walk', attack: 'reach', size: 1, speed: 0.9, hits: 3, eyes: 1 },
    draw(ctx) {
      ctx.beginPath(); // a helmet with a plume
      ctx.roundRect(70, 16, 38, 40, 10);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(78, 16);
      ctx.quadraticCurveTo(60, -4, 40, 20);
      ctx.quadraticCurveTo(60, 8, 74, 22);
      ctx.fill();
      ctx.clearRect(88, 32, 20, 4); // the visor slit
      poly(ctx, [62, 60, 116, 60, 112, 130, 66, 130]); // breastplate
      poly(ctx, [62, 128, 116, 128, 120, 150, 58, 150]); // skirt of mail
      ellipse(ctx, 70, 96, 22, 32); // shield on the near arm
      limb(ctx, 9, [110, 68, 132, 86, 140, 74]); // sword arm
      limb(ctx, 5, [140, 74, 166, 20]); // the sword raised
      limb(ctx, 4, [130, 80, 150, 66]);
      limb(ctx, 13, [76, 148, 72, 214]);
      limb(ctx, 13, [102, 148, 108, 214]);
    },
  },
  {
    key: 'beast-mushroom',
    words: /mushroom|fungus|fungi|shroom|toadstool|\bseta\b|champignon|\bpilz/i,
    w: 130,
    h: 120,
    height: 64,
    eye: { x: 82, y: 70 },
    blocks: { body: 'low', move: 'hop', attack: 'spit', size: 1, speed: 0.9, hits: 2, eyes: 2 },
    draw(ctx) {
      ctx.beginPath(); // a wide cap
      ctx.moveTo(6, 54);
      ctx.bezierCurveTo(10, 0, 120, 0, 124, 54);
      ctx.quadraticCurveTo(66, 66, 6, 54);
      ctx.fill();
      ctx.fillRect(44, 54, 42, 44); // stem
      limb(ctx, 8, [52, 96, 46, 118]); // little legs
      limb(ctx, 8, [78, 96, 84, 118]);
    },
  },
];

/**
 * Words that only describe the thing that follows them: "a giant snail" is a snail, not our giant (the troll), and
 * "a dark wolf" is our wolf. A describing word on its own ("a giant") still counts (20 Oct).
 */
const DESCRIBING = /^(giant|huge|big|large|massive|enormous|small|little|tiny|evil|dark|scary|angry|mad|wild|undead|ghostly|shadow|black|white|red|green|blue|golden|ancient|old|young|baby|mega|super|monster|monstrous|cursed|demonic|flying|fire|ice|stone|rock|metal|iron|robot|zombie|vampire|killer|mutant|mutated|two|three|four|many|headed|legged|winged|eyed)$/;

function headOf(name: string): string {
  const words = name
    .toLowerCase()
    .replace(/[^a-z\s-]/g, ' ')
    .split(/[\s-]+/)
    .filter((w) => w && !/^(a|an|the|some)$/.test(w));
  while (words.length > 1 && DESCRIBING.test(words[0])) words.shift();
  return words.join(' ');
}

/** Our drawing for a monster with this name, if we have one: by the thing it is, not by the words describing it. */
export function beastFor(name: string | undefined): Beast | undefined {
  if (!name) return undefined;
  const head = headOf(name);
  const found = BEASTS.find((beast) => beast.words.test(head));
  if (found) return found;
  // A name made only of describing words ("rock monster") is read whole.
  return DESCRIBING.test(head) ? BEASTS.find((beast) => beast.words.test(name.toLowerCase())) : undefined;
}

/** Every drawing, as a white silhouette at three times its size, so it stays sharp when scaled. */
export function createBeastTextures(scene: Phaser.Scene): void {
  for (const beast of BEASTS) {
    if (scene.textures.exists(beast.key)) continue;
    // The drawing, and its rim: the drawing less itself moved down and back, a crescent along its top that the
    // light catches (design research, 19 Oct).
    for (const rim of [false, true]) {
      const texture = scene.textures.createCanvas(rim ? `${beast.key}-rim` : beast.key, beast.w * RES, beast.h * RES);
      if (!texture) continue;
      const ctx = texture.getContext();
      ctx.scale(RES, RES);
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#ffffff';
      beast.draw(ctx);
      if (rim) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.translate(-1.6, 2.6);
        beast.draw(ctx);
      }
      texture.refresh();
    }
  }
}

/** Game pixels per pixel of the drawing, at size 1. */
export function beastScale(beast: Beast): number {
  return beast.height / beast.h;
}
