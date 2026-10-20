// Going through a detour gate (Amin, 17 and 18 Oct): the camera films him from his side the whole time and
// turns with him as he turns into the gate. The place behind him swings away round him, a soft light from the
// gate carries the change, and the other place swings into view, still turning, until the camera has come round.
// He stays where he is on the screen, walking. Nothing jumps.
//
// How: a picture of where he was (without him) and of where he arrives (without him) are turned in 3D, in the
// page over the game, round an upright line through him; a picture of him alone, cut out of a plain green
// backdrop, walks in front.

import Phaser from 'phaser';

const TURN_MS = 1700;
/** How far round the camera goes, in degrees: past halfway the light carries it into the other place. */
const SWING = 76;
/** The upright line the camera turns round stands this far in front of the backdrop, as a share of the width. */
const DEPTH = 0.5;
/** The picture of him: this big, with his feet here (game pixels). */
const HERO_BOX = { w: 170, h: 240, feetX: 85, feetY: 222 };

export interface ScreenSpot {
  x: number;
  y: number;
}

function grab(game: Phaser.Game): Promise<HTMLImageElement> {
  return new Promise((done) => game.renderer.snapshot((image) => done(image as HTMLImageElement)));
}

function grabArea(game: Phaser.Game, x: number, y: number, w: number, h: number): Promise<HTMLImageElement> {
  return new Promise((done) => game.renderer.snapshotArea(Math.round(x), Math.round(y), w, h, (image) => done(image as HTMLImageElement)));
}

function loaded(image: HTMLImageElement): Promise<HTMLImageElement> {
  return image.complete && image.naturalWidth > 0 ? Promise.resolve(image) : new Promise((done) => (image.onload = () => done(image)));
}

/** Cut him out of the green backdrop: green goes clear, and green light on his edges goes grey. */
async function cutOut(image: HTMLImageElement): Promise<string> {
  await loaded(image);
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(image, 0, 0);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const px = data.data;
  for (let i = 0; i < px.length; i += 4) {
    const r = px[i], g = px[i + 1], b = px[i + 2];
    const spill = g - Math.max(r, b);
    if (spill > 24) {
      px[i + 3] = Math.round(px[i + 3] * Math.max(0, 1 - (spill - 24) / 90));
      px[i + 1] = Math.max(r, b);
    }
  }
  ctx.putImageData(data, 0, 0);
  return canvas.toDataURL();
}

const rgb = (colour: number) => `${(colour >> 16) & 255},${(colour >> 8) & 255},${colour & 255}`;

export class CornerTurn {
  private constructor(
    private readonly box: HTMLDivElement,
    private readonly from: HTMLDivElement,
    private readonly veil: HTMLDivElement,
    private readonly hero: HTMLImageElement,
    private readonly at: ScreenSpot,
    private readonly dir: 1 | -1,
    private readonly scale: number,
    private readonly width: number,
  ) {}

  /**
   * Picture where he is without him, cover the game with it, then picture him alone.
   * `dir` 1 goes in through a gate, -1 comes back out. `light` colours the passage between the two places.
   */
  static async begin(scene: Phaser.Scene, heroView: Phaser.GameObjects.Container, dir: 1 | -1, light = 0xffe6bd): Promise<CornerTurn> {
    const game = scene.game;
    const cam = scene.cameras.main;
    const canvas = game.canvas;
    const at = { x: heroView.x - cam.scrollX, y: heroView.y - cam.scrollY };

    heroView.setVisible(false);
    const here = await grab(game);

    // Cover the game with this place while he is pictured alone.
    const rect = canvas.getBoundingClientRect();
    const scale = rect.width / canvas.width;
    const box = document.createElement('div');
    box.style.cssText = `position:fixed;left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;overflow:hidden;pointer-events:none;z-index:5;background:#070a14;perspective:${rect.width}px;perspective-origin:${at.x * scale}px 50%;`;
    const from = CornerTurn.face(here.src, at.x * scale, rect.width);
    box.appendChild(from);
    const veil = document.createElement('div');
    veil.style.cssText = `position:absolute;inset:0;opacity:0;background:radial-gradient(ellipse at ${at.x * scale}px ${(at.y - 90) * scale}px, rgba(${rgb(light)},0.95), rgba(${rgb(light)},0.35) 45%, rgba(${rgb(light)},0) 80%);`;
    box.appendChild(veil);
    canvas.parentElement?.appendChild(box);

    // Him alone, on green.
    const hidden: Phaser.GameObjects.GameObject[] = [];
    for (const child of scene.children.list) {
      const shown = (child as unknown as { visible?: boolean }).visible;
      if (child !== heroView && shown) {
        (child as unknown as Phaser.GameObjects.Components.Visible).setVisible(false);
        hidden.push(child);
      }
    }
    heroView.setVisible(true);
    const fx = cam.postFX?.list.slice() ?? [];
    for (const effect of fx) effect.active = false;
    const bg = cam.backgroundColor.color;
    cam.setBackgroundColor(0x00ff00);
    const shot = await grabArea(game, at.x - HERO_BOX.feetX, at.y - HERO_BOX.feetY, HERO_BOX.w, HERO_BOX.h);
    cam.setBackgroundColor(bg);
    for (const effect of fx) effect.active = true;
    for (const child of hidden) (child as unknown as Phaser.GameObjects.Components.Visible).setVisible(true);
    heroView.setVisible(false);

    const hero = document.createElement('img');
    hero.src = await cutOut(shot);
    hero.style.cssText = `position:absolute;width:${HERO_BOX.w * scale}px;height:${HERO_BOX.h * scale}px;left:${(at.x - HERO_BOX.feetX) * scale}px;top:${(at.y - HERO_BOX.feetY) * scale}px;`;
    box.appendChild(hero);
    // He begins to walk at once, while the new place is made ready behind the cover.
    hero.animate(
      [{ transform: 'translateY(0)' }, { transform: `translateY(${-2.5 * scale}px)` }, { transform: 'translateY(0)' }],
      { duration: 260, iterations: Infinity },
    );
    return new CornerTurn(box, from, veil, hero, at, dir, scale, rect.width);
  }

  /** One place as a picture that can turn round an upright line through him (at `pivot` px across). */
  private static face(src: string, pivot: number, width: number): HTMLDivElement {
    const face = document.createElement('div');
    face.style.cssText = `position:absolute;inset:0;backface-visibility:hidden;transform-origin:${pivot}px 50% ${width * DEPTH}px;background:#070a14 url(${src}) center/100% 100% no-repeat;`;
    return face;
  }

  /** The new place is ready (without him in it): turn round him, through the light, into it. */
  async finish(scene: Phaser.Scene, heroView: Phaser.GameObjects.Container): Promise<void> {
    const cam = scene.cameras.main;
    const to = { x: heroView.x - cam.scrollX, y: heroView.y - cam.scrollY };
    heroView.setVisible(false);
    const there = await grab(scene.game);
    const k = this.scale;
    const into = CornerTurn.face(there.src, to.x * k, this.width);
    into.style.opacity = '0';
    this.box.insertBefore(into, this.veil);

    const d = this.dir;
    const timing = { duration: TURN_MS, fill: 'forwards' as const };
    // Where he was swings away round him and gives way to the light...
    this.from.animate(
      [
        { transform: 'rotateY(0deg)', opacity: 1, offset: 0, easing: 'cubic-bezier(.5,0,1,1)' },
        { transform: `rotateY(${SWING * 0.6 * d}deg)`, opacity: 1, offset: 0.4, easing: 'linear' },
        { transform: `rotateY(${SWING * d}deg)`, opacity: 0, offset: 0.6 },
        { transform: `rotateY(${SWING * d}deg)`, opacity: 0, offset: 1 },
      ],
      timing,
    );
    // ...the passage is a soft light from the gate...
    this.veil.animate(
      [
        { opacity: 0, offset: 0 },
        { opacity: 0, offset: 0.28 },
        { opacity: 0.9, offset: 0.5 },
        { opacity: 0, offset: 0.78 },
        { opacity: 0, offset: 1 },
      ],
      timing,
    );
    // ...and the new place comes round, still turning, until the camera has settled.
    const turning = into.animate(
      [
        { transform: `rotateY(${-SWING * d}deg)`, opacity: 0, offset: 0 },
        { transform: `rotateY(${-SWING * d}deg)`, opacity: 0, offset: 0.4, easing: 'linear' },
        { transform: `rotateY(${-SWING * 0.6 * d}deg)`, opacity: 1, offset: 0.6, easing: 'cubic-bezier(0,0,.5,1)' },
        { transform: 'rotateY(0deg)', opacity: 1, offset: 1 },
      ],
      timing,
    );
    // He keeps walking where he is, and settles where he stands in the new place.
    this.hero.animate(
      [
        { left: `${(this.at.x - HERO_BOX.feetX) * k}px`, top: `${(this.at.y - HERO_BOX.feetY) * k}px`, offset: 0 },
        { left: `${(this.at.x - HERO_BOX.feetX) * k}px`, top: `${(this.at.y - HERO_BOX.feetY) * k}px`, offset: 0.5 },
        { left: `${(to.x - HERO_BOX.feetX) * k}px`, top: `${(to.y - HERO_BOX.feetY) * k}px`, offset: 1 },
      ],
      { ...timing, easing: 'ease-in-out' },
    );
    await turning.finished;
    heroView.setVisible(true);
    // One frame with him back in the game, then the cover goes.
    await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
    this.box.remove();
  }
}
