// The hero: how he moves and how he is drawn.
// He is built from flat white shapes that are tinted every frame by the light level.
// Proportions follow "Hero version 5" on the FigJam board: big round head, small body,
// two legs, a cape to the ground, a sword held forward, one eye and one flower.

import Phaser from 'phaser';
import type { Intent } from '../core/controls';
import type { Side } from '../core/input';
import { mixColour } from '../core/light';
import { GROUND_Y, HEALTH, HERO, STRIKE, WEAPON_USE } from './config';
import { groundAt, pitAt, type HideSpot, type Level } from './level';
import type { HeroLook } from './look';
import type { WeaponLook } from '../settings/schema';
import { recipeTexture } from './recipeDraw';
import { TEX_SCALE } from './textures';

const JUMP_SPEED = Math.sqrt(2 * HERO.gravity * HERO.height * HERO.jumpHeights);
const STRIKE_ANIM = 0.22; // seconds the sword swing is shown
const FOOT = 14; // how close to a pit wall he can get
const ARM_LENGTH = 19.5;
/** The colour of the thin edge of light on him near a lamp. */
const RIM_COLOUR = 0xffe6bd;
/** Where each weapon shape is held, as a point on its picture (0 to 1 across, 0 to 1 down). */
const WEAPON_GRIP: Record<WeaponLook, [number, number]> = {
  sword: [0.5, 0.9],
  dagger: [0.5, 0.85],
  spear: [0.5, 0.72],
  axe: [0.3, 0.9],
  club: [0.5, 0.9],
  staff: [0.5, 0.6],
  bow: [0.25, 0.5],
  gun: [0.6, 0.8],
  sling: [0.5, 0.08],
  stone: [0.5, 0.5],
  knife: [0.5, 0.84],
  hammer: [0.5, 0.9],
  pen: [0.5, 0.86],
  pistol: [0.55, 0.82],
  shotgun: [0.5, 0.74],
  rifle: [0.5, 0.72],
  launcher: [0.5, 0.6],
};

interface Pose {
  x: number;
  y: number;
  rot?: number;
  sx?: number;
  sy?: number;
}
type PartName = 'cape' | 'legBack' | 'legFront' | 'torso' | 'head' | 'eye' | 'flower' | 'arm' | 'sword';
type PoseSet = Record<PartName, Pose>;

// Positions are measured from his feet, facing right. Up is negative.
// The sword is always placed in his hand; only its angle comes from the pose.
const STAND: PoseSet = {
  cape: { x: -1, y: -55 },
  legBack: { x: -2, y: -26, rot: 0.2 },
  legFront: { x: 1, y: -26, rot: -0.26 },
  torso: { x: 2, y: -56 },
  head: { x: 0, y: -74 },
  eye: { x: 12, y: -73 },
  flower: { x: 2, y: -93 },
  arm: { x: 5, y: -49, rot: -0.5 },
  sword: { x: 0, y: 0, rot: 1.26 },
};
// Lying flat: in the open and in grass.
const LIE: PoseSet = {
  cape: { x: 20, y: -19, rot: Math.PI / 2, sx: 0.5 },
  legBack: { x: -6, y: -8, rot: Math.PI / 2 },
  legFront: { x: -6, y: -13, rot: Math.PI / 2 - 0.12 },
  torso: { x: 22, y: -11, rot: Math.PI / 2 },
  head: { x: 38, y: -20 },
  eye: { x: 49, y: -21 },
  flower: { x: 39, y: -39 },
  arm: { x: 24, y: -8, rot: -Math.PI / 2 },
  sword: { x: 0, y: 0, rot: Math.PI / 2 },
};
// Crouching: behind a rock or a pillar.
const CROUCH: PoseSet = {
  cape: { x: -1, y: -33, sx: 1.1, sy: 0.62 },
  legBack: { x: -3, y: -13, rot: 0.95, sy: 0.6 },
  legFront: { x: 5, y: -13, rot: -0.95, sy: 0.6 },
  torso: { x: 2, y: -34, sy: 0.8 },
  head: { x: 2, y: -47 },
  eye: { x: 13, y: -46 },
  flower: { x: 4, y: -66 },
  arm: { x: 5, y: -28, rot: -0.4 },
  sword: { x: 0, y: 0, rot: 1.4 },
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Move `value` towards `target` smoothly, independent of frame rate. */
const ease = (value: number, target: number, rate: number, dt: number) =>
  lerp(value, target, 1 - Math.exp(-rate * dt));

/** How far short of a pit's far edge his toe still catches it. */
const LEDGE = { reach: 14 };

export class Hero {
  x: number;
  y = GROUND_Y;
  vx = 0;
  vy = 0;
  facing: Side = 1;
  onGround = true;
  lying = false;
  /** What happened in the last step, for sounds and splashes. */
  readonly events = { footstep: false, landed: false, struck: false, fell: false, shot: false, thrown: false, empty: false, jumped: false };
  /** How fast he was falling when he last landed, px per second. */
  landSpeed = 0;
  /** False while his weapon lies where he threw it. */
  armed = true;
  /** Weapon charges ready, how many it holds, and seconds for one to come back (config WEAPON_USE). */
  charges: number = WEAPON_USE.charges;
  maxCharges: number = WEAPON_USE.charges;
  recharge: number = WEAPON_USE.recharge;
  /** Seconds into bringing back the next charge. */
  chargeT = 0;
  /** Petals left on his flower: his hearts (brief 3.3). */
  petals: number = HEALTH.petals;
  /** True while he cannot be hurt: he flickers. */
  blink = false;
  /** Goes up by one with every strike, so one strike hits a monster only once. */
  strikeId = 0;

  private lastSafeX: number;
  private strikeT = Infinity; // seconds since the last strike began
  /** When the last few strike taps came, to tell three quick taps (a throw). */
  private taps: number[] = [];
  private clock = 0;
  /** The last strike was a throw: the arm goes forward, no swing. */
  private throwing = false;
  private cooldown = 0;
  private shelter: HideSpot | undefined;
  private knockV = 0;
  /** Time left in which he may still jump after leaving the ground, and a remembered early jump press. */
  private coyote = 0;
  private jumpBuffer = 0;
  private jumpHeld = false;
  /** Seconds since the last jump began: every jump rises for a short minimum time, even from a quick flick. */
  private jumpT = Infinity;
  /** A strike asked for during the recovery of the last one is kept a moment and then made. */
  private strikeBuffer = 0;
  private strikeAsk: Side | 0 = 0;
  /** Quick strikes alternate between a downswing (0) and an upswing (1). */
  private combo = 0;
  private lungeStopped = false;
  private blinkT = 0;
  private readonly rim: Phaser.GameObjects.Image;
  /** The ending: he kneels, and then his head is no longer on his shoulders (the scene carries it). */
  kneel = false;
  /** Extra jumps he may make in the air (the "Second jump" upgrade). */
  airJumps = 0;
  private airLeft = 0;
  headless = false;
  /** 1 is fully there. At the end of the flower story his kneeling body fades as the flower opens. */
  fade = 1;
  /** 1 just after he lands, fading to 0: he squashes and springs back. */
  private squash = 0;
  /** How hard that landing was, 0.4 to 1.4: a longer fall squashes him more. */
  private squashSize = 1;
  private sway = 0;

  // Animation amounts.
  private duckT = 0; // 0 standing, 1 fully down
  private duckPose: PoseSet = LIE;
  private hiddenT = 0;
  private runPhase = 0;
  private shownLight = 0;

  private readonly root: Phaser.GameObjects.Container;
  /**
   * Whether the weapon in his hand can be thrown: every one but stones (Amin, 19 Oct), which are thrown anyway.
   */
  get canThrow(): boolean {
    const weapon = this.look.weapon;
    return this.armed && this.look.sword && (weapon.kind === 'melee' || weapon.kind === 'ranged') && weapon.look !== 'stone' && weapon.look !== 'sling';
  }

  /** The picture his weapon is drawn with, and how big it is shown: a thrown weapon looks the same in the air. */
  get weaponShape(): { key: string; scale: number } {
    return { key: this.sword.texture.key, scale: Math.abs(this.sword.scaleX) || 1 };
  }

  /** Everything he is drawn with, as one object (to show, hide or picture him alone). */
  get view(): Phaser.GameObjects.Container {
    return this.root;
  }
  private readonly parts: Record<PartName, Phaser.GameObjects.Image | Phaser.GameObjects.Container>;
  private readonly cape: Phaser.GameObjects.Image;
  private readonly legBack: Phaser.GameObjects.Image;
  private readonly legFront: Phaser.GameObjects.Image;
  private readonly torso: Phaser.GameObjects.Image;
  private readonly head: Phaser.GameObjects.Image;
  private readonly eye: Phaser.GameObjects.Image;
  private readonly arm: Phaser.GameObjects.Image;
  private readonly sword: Phaser.GameObjects.Image;
  private readonly stem: Phaser.GameObjects.Image;
  private readonly leaf: Phaser.GameObjects.Image;
  private readonly petalImages: Phaser.GameObjects.Image[] = [];
  private readonly flowerGlow: Phaser.GameObjects.Image;
  private readonly dot: Phaser.GameObjects.Image;
  private readonly slash: Phaser.GameObjects.Image;
  private swordScale: number;
  /** A gun of some kind: held forward, ready to fire. */
  private readonly firearm: boolean;
  /** A soft outline of light around all of him: strong near a lamp, a faint edge in the dark. */
  private readonly halo?: Phaser.FX.Glow;

  constructor(
    scene: Phaser.Scene,
    x: number,
    private readonly depthFront: number,
    private readonly depthBehind: number,
    private readonly look: HeroLook,
  ) {
    this.x = x;
    this.lastSafeX = x;

    const image = (key: string, originX: number, originY: number) =>
      scene.add.image(0, 0, key).setOrigin(originX, originY).setScale(TEX_SCALE);

    // Every part is cut from the board's drawing (art/hero-v5.svg) and turns about its own joint.
    this.cape = image('h5-cape', 0.964, 0.012); // hangs from the shoulder
    this.legBack = image('h5-leg', 0.3, 0.116); // turns at the hip
    this.legFront = image('h5-leg', 0.3, 0.116);
    this.torso = image('h5-body', 0.49, 0.04);
    // A thin edge of light around his head when a light is near, so he never melts into the dark.
    this.rim = image('hero-head', 0.5, 0.5);
    this.head = image('hero-head', 0.5, 0.5);
    this.eye = image('hero-eye', 0.5, 0.5);
    this.arm = image('h5-arm', 0.48, 0.1); // turns at the shoulder
    // The weapon is one of our shapes, held at its grip.
    // The AI's own drawing is used only for a thing we have not drawn: a "Pen" with the pen look is ours.
    this.firearm =
      look.weapon.kind === 'ranged' && look.weapon.look !== 'bow' &&
      (['gun', 'pistol', 'shotgun', 'rifle', 'launcher'].includes(look.weapon.look) || /gun|rifle|pistol|laser|blaster|cannon|bazoo?k|bazuk|rocket|launcher/i.test(look.weapon.name));
    const ours = look.weapon.look === 'launcher' || new RegExp(look.weapon.look, 'i').test(look.weapon.name);
    const own = ours ? undefined : look.weapon.recipe;
    const grip = own ? [0.5, 0.96] : look.weapon.look === 'sword' ? [0.5, 0.89] : WEAPON_GRIP[look.weapon.look];
    const shape = look.weapon.look === 'sword' ? 'h5-sword' : `wpn-${look.weapon.look}`;
    this.sword = image(own ? recipeTexture(scene, own) : shape, grip[0], grip[1]);
    // A composed weapon is drawn in a square of 100 units: brought down to the size of a sword.
    this.swordScale = own ? 0.46 : 1;
    this.slash = image('slash', 0, 0.5).setPosition(4, -42).setVisible(false);
    this.cape.setVisible(look.cape);
    this.sword.setVisible(look.sword);

    // The flower: a stem with a leaf, five round petals and the centre dot.
    this.stem = image('hero-stem', 0.5, 1).setPosition(0, 1);
    this.leaf = image('hero-leaf', 1, 0.5).setPosition(0, -4).setRotation(0.35);
    for (let i = 0; i < 5; i++) this.petalImages.push(image('hero-petal', 0.5, 0.5));
    this.dot = image('hero-dot', 0.5, 0.5).setPosition(0, -13);
    // The flower is his one point of colour and light, as the mask is the Knight's or the eyes Limbo's boy's.
    this.flowerGlow = scene.add.image(0, -13, 'glow').setDisplaySize(30, 30).setTint(look.flower).setAlpha(0.4).setBlendMode(Phaser.BlendModes.ADD);
    const flower = scene.add.container(0, 0, [this.flowerGlow, this.stem, this.leaf, ...this.petalImages, this.dot]);

    this.parts = {
      cape: this.cape,
      legBack: this.legBack,
      legFront: this.legFront,
      torso: this.torso,
      head: this.head,
      eye: this.eye,
      flower,
      arm: this.arm,
      sword: this.sword,
    };
    this.root = scene.add
      .container(this.x, this.y, [
        this.cape,
        this.legBack,
        this.torso,
        this.rim,
        this.legFront,
        this.head,
        this.eye,
        flower,
        this.sword,
        this.arm,
        this.slash,
      ])
      .setDepth(depthFront);
    // WebGL only. On the plain canvas renderer he simply has no outline.
    this.halo = this.root.postFX?.addGlow(RIM_COLOUR, 0.6, 0, false, 0.1, 8);
  }

  /** Where his head is while he kneels, in the world. */
  get kneelingHead(): { x: number; y: number } {
    return { x: this.x + this.facing * CROUCH.head.x, y: this.y + CROUCH.head.y };
  }

  /** The point where the light on him is measured. */
  get centreY(): number {
    return this.y - lerp(55, 24, this.duckT);
  }

  get striking(): boolean {
    return this.strikeT < STRIKE_ANIM;
  }

  /** True for the short time his blade can hit something. */
  get strikeActive(): boolean {
    return this.look.weapon.kind === 'melee' && this.strikeT < STRIKE.activeTime;
  }

  /** A generated look for his weapon (game/generated.ts): held at its grip, at the size of a composed weapon. */
  useWeaponTexture(key: string): void {
    this.sword.setTexture(key).setOrigin(0.5, 0.96);
    // Sized by what it is: a sword-sized thing in the hand, half that for something that fires, between for a throw.
    const kind = this.look.weapon.kind;
    this.swordScale = this.firearm || kind === 'ranged' ? 0.22 : kind === 'thrown' ? 0.32 : 0.46;
  }

  /** His blade met something: the lunge ends there, so he does not run through it. */
  stopLunge(): void {
    this.lungeStopped = true;
  }

  /** Push him back after a hit. `speed` is in px per second and fades quickly. */
  knock(speed: number): void {
    this.knockV = speed;
  }

  /** True when he has gone behind a rock or a pillar. */
  get behindShelter(): boolean {
    return this.duckPose === CROUCH && this.duckT > 0.35 && !this.kneel;
  }

  /**
   * Move him one step of time. `dt` is in seconds.
   * `shelter` is the rock or pillar he stands at, if any: lying down there puts him behind it.
   */
  step(dt: number, intent: Intent, level: Level, shelter: HideSpot | undefined): void {
    const events = this.events;
    events.footstep = events.landed = events.struck = events.fell = events.shot = events.thrown = events.empty = events.jumped = false;
    this.clock += dt;
    // Charges come back one at a time.
    if (this.charges < this.maxCharges) {
      this.chargeT += dt;
      if (this.chargeT >= this.recharge) {
        this.charges++;
        this.chargeT = 0;
      }
    } else this.chargeT = 0;

    const weapon = this.look.weapon;
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (intent.strike) {
      this.strikeBuffer = 0.22;
      this.strikeAsk = intent.strikeDir;
      this.taps = [...this.taps.filter((t) => this.clock - t < WEAPON_USE.tripleTap), this.clock];
    } else this.strikeBuffer = Math.max(0, this.strikeBuffer - dt);
    // He throws his weapon at the monster ahead: with three quick taps, or with one tap once it is empty and
    // has nothing left to fire (Amin, 19 Oct: every weapon but stones, guns too, standing or lying).
    // It leaves no charges behind; the real cost is walking to pick it up.
    const emptyTap = this.strikeBuffer > 0 && this.cooldown <= 0 && this.charges <= 0;
    if (this.canThrow && (this.taps.length >= 3 || emptyTap)) {
      this.charges = 0;
      this.chargeT = 0;
      this.taps = [];
      this.strikeBuffer = 0;
      if (this.strikeAsk !== 0) this.facing = this.strikeAsk;
      this.armed = false;
      this.throwing = true;
      this.strikeT = 0;
      this.lungeStopped = true;
      events.thrown = true;
    }
    if (this.strikeBuffer > 0 && this.look.sword && this.armed && this.cooldown <= 0 && this.charges <= 0) {
      // Out of charges: nothing comes.
      this.strikeBuffer = 0;
      events.empty = true;
    }
    if (this.strikeBuffer > 0 && this.look.sword && this.armed && this.cooldown <= 0) {
      this.charges--;
      this.throwing = false;
      this.strikeBuffer = 0;
      if (this.strikeAsk !== 0) this.facing = this.strikeAsk;
      // Struck again soon after the last swing: the blade comes back the other way.
      this.combo = this.strikeT < 0.6 ? 1 - this.combo : 0;
      this.strikeT = 0;
      this.strikeId++;
      // Only a blade lunges. A bow or a stone is loosed from where he stands.
      this.lungeStopped = weapon.kind !== 'melee';
      this.cooldown = HERO.strikeCooldown / weapon.speed;
      events.struck = true;
      events.shot = weapon.kind !== 'melee';
    }
    const lunging = this.strikeT < HERO.lungeTime && !this.lungeStopped;
    if (!lunging && intent.move !== 0) this.facing = intent.move;

    const wasLying = this.lying;
    // A blade's swing brings him up onto his feet; a gun or a throw is fired from the ground (Amin, 19 Oct).
    this.lying = intent.lie && this.onGround && (!this.striking || this.throwing || weapon.kind !== 'melee');
    if (this.kneel) this.lying = this.onGround;
    if (this.lying && !wasLying) {
      this.shelter = this.kneel ? undefined : shelter;
      this.duckPose = shelter || this.kneel ? CROUCH : LIE;
    }

    if (lunging) this.vx = (this.facing * HERO.lungePx) / HERO.lungeTime;
    // Lying down he can still crawl, slowly.
    else if (this.lying) this.vx = intent.move * HERO.crawlSpeed;
    else {
      // He gets up to speed and slows down instead of starting and stopping dead, and turns round quickly.
      const target = intent.move * HERO.speed;
      const base = this.vx - this.knockV;
      const turning = target !== 0 && Math.sign(target) !== Math.sign(base) && Math.abs(base) > 1;
      const rate = !this.onGround ? HERO.airAccel : turning ? HERO.turn : target === 0 ? HERO.decel : HERO.accel;
      const step = rate * dt;
      this.vx = Math.abs(target - base) <= step ? target : base + Math.sign(target - base) * step;
    }
    this.vx += this.knockV;
    this.knockV = Math.abs(this.knockV) < 8 ? 0 : ease(this.knockV, 0, 9, dt);

    // A jump pressed a moment too early, or a moment after running off an edge, still counts.
    this.jumpT += dt;
    this.jumpHeld = (intent.jumpHeld ?? intent.jump) || this.jumpT < 0.14;
    this.jumpBuffer = intent.jump ? HERO.jumpBuffer : Math.max(0, this.jumpBuffer - dt);
    this.coyote = this.onGround ? HERO.coyote : Math.max(0, this.coyote - dt);
    if (this.onGround) this.airLeft = this.airJumps;
    else if (this.jumpBuffer > 0 && this.coyote <= 0 && this.airLeft > 0 && !this.lying) {
      // The second jump, a little lower than the first.
      this.airLeft--;
      this.jumpBuffer = 0;
      this.jumpT = 0;
      this.vy = -JUMP_SPEED * 0.88;
      events.jumped = true;
    }
    if (this.jumpBuffer > 0 && this.coyote > 0 && !this.lying) {
      this.vy = -JUMP_SPEED;
      this.onGround = false;
      events.jumped = true;
      this.jumpT = 0;
      this.coyote = 0;
      this.jumpBuffer = 0;
    }
    this.strikeT += dt;

    let nextX = Phaser.Math.Clamp(this.x + this.vx * dt, 30, level.width - 30);
    if (this.lying && this.shelter && intent.move === 0) {
      // Slide fully behind the rock or pillar.
      const s = this.shelter;
      const middle = (s.x0 + s.x1) / 2;
      const room = Math.max(0, (s.x1 - s.x0) / 2 - 34);
      nextX = ease(nextX, Phaser.Math.Clamp(nextX, middle - room, middle + room), 12, dt);
    }

    if (this.onGround) {
      if (pitAt(level, nextX)) this.onGround = false;
      else {
        this.lastSafeX = nextX;
        // On his feet he follows the ground up and down the slopes of a mound (level.ts).
        this.y = groundAt(level, nextX);
      }
      if (Math.abs(this.vx) > 1 && !this.lying) {
        const before = Math.floor(this.runPhase / Math.PI);
        this.runPhase += dt * 13;
        if (Math.floor(this.runPhase / Math.PI) !== before) events.footstep = true;
      }
    }
    if (!this.onGround) {
      // Rising slows to a soft top, a released jump is cut short, and a fall is quick.
      const g = this.vy > 0 ? HERO.fallGravity : !this.jumpHeld ? HERO.shortHopGravity : Math.abs(this.vy) < 110 ? HERO.apexGravity : 1;
      this.vy = Math.min(HERO.maxFall, this.vy + HERO.gravity * g * dt);
      let nextY = this.y + this.vy * dt;
      // A jump that only just misses the far side of a pit still lands: his toe catches the edge
      // (controls research, 19 Oct: Celeste's forgiveness).
      // Only a jump coming down from above the ground, and only at the edge it is heading for: walking off an
      // edge falls in (19 Oct: the first version caught him there too, so he could never fall).
      const pitBelow = pitAt(level, nextX);
      if (pitBelow && this.vy > 0 && this.y < GROUND_Y - 1 && nextY >= GROUND_Y) {
        const fromLeft = nextX - pitBelow.x0;
        const fromRight = pitBelow.x1 - nextX;
        const heading = this.vx > 1 ? 1 : this.vx < -1 ? -1 : 0;
        if ((heading >= 0 && fromRight <= LEDGE.reach) || (heading <= 0 && fromLeft <= LEDGE.reach)) {
          nextX = (heading > 0 ? true : heading < 0 ? false : fromRight < fromLeft) ? pitBelow.x1 + 1 : pitBelow.x0 - 1;
        }
      }
      // He lands wherever the ground is: the road, a slope, the top of a mound.
      const floor = groundAt(level, nextX);
      if (this.y <= GROUND_Y + 1 && nextY >= floor && !pitAt(level, nextX)) {
        nextY = floor;
        this.landSpeed = this.vy;
        this.squashSize = Phaser.Math.Clamp(this.vy / 700, 0.4, 1.4);
        this.vy = 0;
        this.onGround = true;
        events.landed = true;
        this.squash = 1;
      } else if (nextY > GROUND_Y) {
        // He is inside a pit: its walls hold him in.
        const pit = pitAt(level, this.x) ?? pitAt(level, nextX);
        if (pit) nextX = Phaser.Math.Clamp(nextX, pit.x0 + FOOT, pit.x1 - FOOT);
        if (nextY > GROUND_Y + 320) {
          // He is put back on the side he fell from. The scene takes a petal for it.
          events.fell = true;
          if (pit) nextX = this.lastSafeX < (pit.x0 + pit.x1) / 2 ? pit.x0 - 50 : pit.x1 + 50;
          nextY = GROUND_Y;
          this.vy = 0;
          this.onGround = true;
        }
      }
      this.y = nextY;
    }
    this.x = nextX;
  }

  /** Draw him. `light` is 0 to 1 at his position. */
  draw(dt: number, light: number, hidden: boolean): void {
    this.duckT = ease(this.duckT, this.lying ? 1 : 0, 14, dt);
    this.hiddenT = ease(this.hiddenT, hidden ? 1 : 0, 10, dt);
    this.shownLight = ease(this.shownLight, light, 12, dt);

    const moving = this.onGround && !this.lying && Math.abs(this.vx) > 1;
    const stride = moving ? Math.sin(this.runPhase) : 0;
    const bob = moving ? Math.abs(Math.cos(this.runPhase)) * 1.8 - 0.9 : 0;
    const rising = this.onGround ? 0 : Phaser.Math.Clamp(-this.vy / JUMP_SPEED, -1, 1);
    const inAir = this.onGround ? 0 : 1;
    const upright = 1 - this.duckT;

    // Blend every part between the standing pose and the lying or crouching pose.
    const down = this.duckPose;
    for (const name of Object.keys(this.parts) as PartName[]) {
      const a = STAND[name];
      const b = down[name];
      const part = this.parts[name];
      const base = part instanceof Phaser.GameObjects.Container ? 1 : TEX_SCALE;
      part.setPosition(lerp(a.x, b.x, this.duckT), lerp(a.y, b.y, this.duckT));
      part.setRotation(lerp(a.rot ?? 0, b.rot ?? 0, this.duckT));
      part.setScale(base * lerp(a.sx ?? 1, b.sx ?? 1, this.duckT), base * lerp(a.sy ?? 1, b.sy ?? 1, this.duckT));
    }

    // Walking and jumping, on top of the pose.
    this.legFront.rotation += upright * (-stride * 0.6 - inAir * 0.45);
    this.legBack.rotation += upright * (stride * 0.6 + inAir * 0.5);
    this.arm.rotation += upright * stride * 0.14;
    this.head.y += bob * upright;
    this.eye.y += bob * upright;
    this.parts.flower.y += bob * upright;
    // The flower nods as he moves and leans back when he runs.
    this.sway += dt * (moving ? 9 : 2.2);
    this.parts.flower.rotation += upright * (Math.sin(this.sway) * (moving ? 0.16 : 0.05) - (moving ? 0.18 : 0) - rising * 0.3);
    // The edge of light: just outside his head, brighter the more light is on him.
    this.rim.setPosition(this.head.x + 1.4, this.head.y - 1.4).setScale(this.head.scaleX * 1.04, this.head.scaleY * 1.04);
    this.rim.setTint(RIM_COLOUR).setAlpha(Math.min(0.6, this.shownLight * 0.8));
    if (this.halo) {
      // In the dark a thin cool edge keeps his shape readable; in light it warms and grows.
      const l = this.shownLight * (1 - this.hiddenT * 0.85);
      this.halo.color = mixColour(0x8e9cc8, RIM_COLOUR, Math.min(1, l * 1.4));
      this.halo.outerStrength = 0.55 + l * 1.5;
    }
    this.torso.y += bob * upright * 0.6;
    // Standing still, he breathes: the body swells a little and the head rises with it.
    const breath = moving ? 0 : Math.sin(this.sway * 1.1) * upright;
    this.torso.scaleY *= 1 + breath * 0.025;
    this.head.y -= breath * 0.8;
    this.eye.y -= breath * 0.8;
    // The cape trails behind when he runs or jumps.
    this.cape.rotation += upright * ((moving ? 0.14 + stride * 0.05 : 0) + rising * 0.28);

    // Anything that fires is held forward and ready, never upright like a sword.
    if (this.firearm && !this.striking) {
      this.arm.setRotation(lerp(this.arm.rotation, -1.25, upright));
      this.sword.setRotation(lerp(this.sword.rotation, Math.PI / 2 - 0.12, upright));
    }

    // Strike: the arm reaches forward, the sword swings down and a slash shows the reach.
    if (this.striking) {
      const t = this.strikeT / STRIKE_ANIM;
      const swing = Phaser.Math.Easing.Cubic.Out(t);
      if (this.look.weapon.kind === 'melee' && !this.throwing) {
        if (this.combo === 0) {
          this.arm.setRotation(lerp(-2.2, -1.1, swing));
          this.sword.setRotation(lerp(-0.2, 2.1, swing));
        } else {
          // The upswing: from low and forward, up over his head.
          this.arm.setRotation(lerp(-1.0, -2.4, swing));
          this.sword.setRotation(lerp(2.2, -0.4, swing));
        }
      } else {
        // Shooting or throwing: the arm comes up level and kicks back a little.
        this.arm.setRotation(-1.5 - (1 - swing) * 0.3);
        this.sword.setRotation(Math.PI / 2 - (1 - swing) * 0.25);
      }
      // The slash is as long as the weapon reaches. A shot has no slash.
      const long = this.look.weapon.reach / HERO.reach;
      this.slash
        .setVisible(this.look.weapon.kind === 'melee' && !this.throwing)
        .setAlpha(1 - t)
        .setScale(TEX_SCALE * long * lerp(0.7, 1, Math.min(1, t * 3)), TEX_SCALE * (this.combo === 1 ? -1 : 1));
    } else {
      this.slash.setVisible(false);
    }
    this.sword.setScale(this.sword.scaleX * this.swordScale, this.sword.scaleY * this.swordScale);
    this.sword.setVisible(this.look.sword && this.armed);
    // The sword sits in his hand.
    this.sword.setPosition(
      this.arm.x - ARM_LENGTH * Math.sin(this.arm.rotation),
      this.arm.y + ARM_LENGTH * Math.cos(this.arm.rotation),
    );

    // Hidden: the eye narrows and the flower closes into a bud.
    this.eye.scaleY *= lerp(1, 0.18, this.hiddenT);
    const open = 1 - this.hiddenT;
    this.petalImages.forEach((petal, i) => {
      petal.setVisible(i < this.petals);
      const angle = Phaser.Math.DegToRad(i * 72 - 90);
      const spread = 4.7 * open;
      petal.setPosition(Math.cos(angle) * spread, -13 + Math.sin(angle) * spread - (1 - open) * (i - 2) * 0.7);
      petal.setScale(TEX_SCALE * lerp(0.62, 1, open), TEX_SCALE * lerp(1.15, 1, open));
    });
    this.dot.setScale(TEX_SCALE * open);

    // Colour: everything moves between a dark and a lit colour with the light.
    const lit = this.shownLight;
    const look = this.look;
    const bodyColour = mixColour(look.body[0], look.body[1], lit);
    const shadeColour = mixColour(look.shade[0], look.shade[1], lit);
    this.head.setTint(bodyColour);
    this.torso.setTint(bodyColour);
    this.legFront.setTint(bodyColour);
    this.arm.setTint(bodyColour);
    this.legBack.setTint(shadeColour);
    this.cape.setTint(mixColour(look.capeColour[0], look.capeColour[1], lit));
    this.stem.setTint(shadeColour);
    this.leaf.setTint(shadeColour);
    // The heart of the flower is always in his colour; its glow brightens in light and is lost as it closes.
    this.dot.setTint(look.flower);
    this.flowerGlow.setAlpha((0.28 + lit * 0.3) * (1 - this.hiddenT * 0.8) * (this.petals > 0 ? 1 : 0));
    // The eye, the flower and the blade stay pale, so he can be found in the dark.
    this.eye.setTint(mixColour(0xa9a9b4, 0xffffff, lit));
    const petalColour = mixColour(0x9391a6, 0xffffff, lit);
    for (const petal of this.petalImages) petal.setTint(petalColour);
    this.sword.setTint(mixColour(0x555b70, 0xe4e8f6, lit));
    this.slash.setTint(mixColour(0xbfc6d8, 0xfff3c4, lit));

    const whole = !this.headless;
    this.head.setVisible(whole);
    this.eye.setVisible(whole);
    this.rim.setVisible(whole);
    this.parts.flower.setVisible(whole);
    this.squash = Math.max(0, this.squash - dt * 5);
    // Landing: wide and low for a moment, then back.
    const stretch = rising * 0.07 - Math.sin(this.squash * Math.PI) * 0.13 * this.squashSize;
    this.root.setPosition(this.x, this.y);
    this.root.setScale(this.facing * (1 - stretch * 0.6), 1 + stretch);
    this.root.setDepth(this.behindShelter ? this.depthBehind : this.depthFront);
    this.blinkT += dt;
    this.root.setAlpha((this.blink && Math.sin(this.blinkT * 38) > 0 ? 0.3 : 1) * this.fade);
  }
}
