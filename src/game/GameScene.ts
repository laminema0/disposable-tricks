// The one game scene: draws the level, runs the hero, follows him with the camera.
// Everything that can differ between two games comes from the settings object it is started with.

import Phaser from 'phaser';
import { DANGER, SUSPECT } from './signals';
import { Talk } from './talk';
import { onLook } from '../ai/look';
import { isLookFor, prepareCreatureLooks } from './generated';
import { landIndex, landOf } from './lands';
import { bossAlone, bossDeath, bossIntro, soldierCount, taunt } from './dialogue';
import { Controls, type Intent } from '../core/controls';
import { lightLevelAt } from '../core/light';
import { makeRng } from '../core/rng';
import { Sfx } from '../core/sfx';
import { buzz, BUZZ } from '../core/haptics';
import { Music } from '../core/music';
import type { Voice } from '../core/sfx';
import { mixColour } from '../core/light';
import { defaultSettings } from '../settings/defaults';
import { ENEMIES, type Creature, type Settings } from '../settings/schema';
import { DROPS, GOAL_FROM_END, SAFE_START, GROUND_Y, HEALTH, LIGHT, MAX_VIEW_W, NOISE, SHOT, STRIKE, VIEW_H, WEAPON_USE } from './config';
import { CreatureView } from './creatureView';
import { designFor, mergeDesign, type Design } from './creatures';
import { FigureView } from './figureView';
import { drawPlantingPlace, ENDING, playHome, playLoss, playWin } from './ending';
import { makeBurst, stepBlooms, type Bloom } from './flowers';
import { Hero } from './hero';
import { Hud } from './hud';
import { addArena, buildLevel, groundAt, hideSpotAt, isRoof, isShelter, pitAt, waterAt, waterKind, type HideSpot, type Level, type LevelLight, type Water } from './level';
import { FLOWER_COLOURS, makeLook, toHex, type Look } from './look';
import { HUNT, MonsterWorld, type Monster, type Shot, type Spawn } from './monsters';
import { RoleView } from './roleView';
import { groundAround, hasBoss, placeMonsters } from './placement';
import { drawScenery } from './sceneryView';
import { collectFlower, hurt, isHidden, isSeen, isSneakAttack, newHealth, tickHealth, type Health } from './rules';
import { createTextures, skyTexture } from './textures';
import { hintLine, nextHint, type HintKey } from './coach';
import { CornerTurn } from './corner';
import { MiniMap } from './minimap';
import { dryness, QUEST, type QuestFlower, type QuestLayout, type Stone } from './quest';
import { BACK_GATE, chooseGates, worldLayout } from './world';
import { afterGate, count, detourIndex, enterStreet, gainXp, has, leaveStreet, newRun, planChapter, SKILLS, XP, xpFor, type RunState, type SkillKey } from './run';

/** How often the monsters talk (Amin, 19 Oct: not all of them, and he does not answer all). */
const TALKING = { taunt: 0.4, answer: 0.5, line: 1.3 };

const DEPTH = { sky: -1, moon: 0, hills: 1, glow: 2, heroBehind: 2.5, props: 3, monster: 3.6, hero: 4, ground: 5, front: 6, pool: 7, hud: 100 };
const WATER_COLOUR = 0xcfdcff;
/** The veil of dust over the dry world sits above all of it; the living flowers above the dust. */
const DUST_DEPTH = 8;

/**
 * Sent on `game.events` once, when the run is over. It carries a `Finish`:
 * he planted the flower (won) or lost his last petal.
 */
export const FINISHED = 'dt-finished';

/** Hints shown in this run. Kept across its chapters and side streets, so each is taught once. */
const HINTS_SHOWN = new Set<HintKey>();

export interface Finish {
  won: boolean;
  petals: number;
  /** Monsters defeated in this run. */
  defeated: number;
  /** Set for a game the AI wrote as code: its own score. */
  score?: number;
  /** The endless run: the world he reached, how far he walked in all, and the flowers he found in it. */
  chapter?: number;
  flowers?: number;
  distance?: number;
}

interface Dart {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Pixels it may still fly. Below zero it is gone. */
  left: number;
  falls: boolean;
  id: number;
  sneak: boolean;
  dir: 1 | -1;
  image: Phaser.GameObjects.Image;
  /** A rocket: it bursts where it stops and hits everything near. */
  blast?: boolean;
}

export interface GameData {
  settings: Settings;
  debug?: boolean;
  /**
   * The maker's preview: the hero stands in the scene with the chosen monsters in front of him,
   * and nothing is played. `at` is where he stands, as a share of the width of the screen.
   */
  preview?: { at: number };
  /**
   * Carry on where a game left off: the game was changed while it was played ("change this game"),
   * rebuilt from its new settings, and he stands where he stood, with the petals and flowers he had.
   */
  resume?: Resume;
  /** The endless run: which chapter, what he carries, and whether he is in a side street. */
  run?: RunState;
  /** Arriving round a corner: the camera turns in from this side. */
  turnIn?: 1 | -1;
  /** The turn round the corner, still on screen: the new stretch finishes it. */
  corner?: CornerTurn;
}

export interface Resume {
  x: number;
  petals: number;
  flowers: number;
}

/** In the maker's preview: how far in front of the hero each monster stands, and how many are shown. */
const SHOWCASE = { first: 88, gap: 78, most: 3 };

export class GameScene extends Phaser.Scene {
  settings: Settings = defaultSettings();
  look!: Look;
  finished = false;
  level!: Level;
  hero!: Hero;
  light = 0;
  hidden = false;
  spot: HideSpot | undefined;
  /** The monsters and their shots. */
  world!: MonsterWorld;
  health: Health = newHealth();
  /** True while a Watcher's beam is on him. */
  exposed = false;
  /** Set when the run has ended and the last moments are playing. */
  ending: 'won' | 'lost' | undefined;
  defeated = 0;
  goalX = 0;

  private controls!: Controls;
  private sfx!: Sfx;
  private drops!: Phaser.GameObjects.Particles.ParticleEmitter;
  private wasInWater = false;
  private debugOn = false;
  private debugText!: Phaser.GameObjects.Text;
  private moon!: Phaser.GameObjects.Arc;
  private moonHalo!: Phaser.GameObjects.Image;
  private grain?: Phaser.GameObjects.TileSprite;
  /** Seconds the world stands still after a hit lands, so the blow is felt. */
  private hitStop = 0;
  private resume?: Resume;
  /** The endless run, the player's own settings (before a chapter made them harder), and this stretch's side streets. */
  run!: RunState;
  private baseSettings!: Settings;
  private turnIn?: 1 | -1;
  private corner?: CornerTurn;
  private streets: number[] = [];
  /** The story (quest.ts): the living flowers and the stones of this stretch, as drawn. */
  private quest: QuestLayout = { flowers: [], stones: [] };
  private flowerViews = new Map<string, { flower: QuestFlower; view: Phaser.GameObjects.Container }>();
  private stoneViews = new Map<string, { stone: Stone; view: Phaser.GameObjects.Graphics; hits: number; last: number }>();
  private minimap?: MiniMap;
  /** True while the whole map is open over the game. */
  private mapOpen = false;
  /**
   * How dry the world looks: a veil of dust over everything but the living flowers and the screen's own marks,
   * thick while it is dry, thinning as flowers are found and planted. The flowers stay in full colour above it.
   */
  private dust?: Phaser.GameObjects.Rectangle;
  private dryShown = -1;
  /** When he was last told the end gate wants more flowers. */
  private gateToldAt = -99;
  /** He has walked well away from the end gate since the last time monsters came back (a new wave may come). */
  private leftGate = true;
  /** In a detour: the gate he came in by, behind him. */
  private backGate?: number;
  /** He is splashing through water this step: loud. */
  private splashing = false;
  /** His weapon after a throw: flying, falling, coming back, or lying where it fell. */
  private thrown?: { x: number; y: number; vx: number; vy: number; flown: number; spin: number; state: 'fly' | 'fall' | 'back' | 'lie'; image: Phaser.GameObjects.Image; glow?: Phaser.GameObjects.Image[]; id: number };
  private atGate = false;
  /** Where he is buried: the camera comes to rest on it. */
  private graveX?: number;
  private leaving = false;
  /** Hints already shown in this run, the line on screen, and how long the run has lasted. */
  private readonly coachShown = HINTS_SHOWN;
  private coachText?: Phaser.GameObjects.Text;
  private coachUntil = 0;
  private runTime = 0;
  private mist?: Phaser.GameObjects.TileSprite;
  private hud!: Hud;
  private views = new Map<Monster, RoleView | CreatureView | FigureView>();
  /** The monsters hunting him right now, to mark the moment each one notices him. */
  private hunters = new Set<Monster>();
  /** A monster's shot: a hot core, its glow, and a fading tail along its path, all in the danger colour. */
  private shotViews = new Map<Shot, Phaser.GameObjects.Image[]>();
  private blooms: Bloom[] = [];
  private bloomViews = new Map<Bloom, Phaser.GameObjects.Container>();
  private petalBits!: Phaser.GameObjects.Particles.ParticleEmitter;
  private puff!: Phaser.GameObjects.Particles.ParticleEmitter;
  /** Dust kicked up when he lands. */
  private landDust!: Phaser.GameObjects.Particles.ParticleEmitter;
  /** A red glow at the edges of the screen when he is hurt. */
  private hurtEdge?: Phaser.GameObjects.Image;
  /** Where the fingers touch, drawn softly for the first minute so the controls can be learnt by seeing. */
  private touchMarks?: Phaser.GameObjects.Graphics;
  /** What the hero and the monsters say (dialogue.ts, talk.ts). */
  private talk!: Talk;
  /** Where the boss's story stands: not met, talking, its soldiers fighting, the two of them, fallen. */
  private bossStage: 'none' | 'intro' | 'soldiers' | 'duel' | 'dead' = 'none';
  /** The soldiers the boss called in. */
  private soldiers = new Set<Monster>();
  /** His weapon as it was before the fight with the soldiers: they make him quicker with it for a while. */
  private beforeFight?: { recharge: number; max: number };
  /** Kinds of monster that have already taunted him on this stretch, and when the last remark was. */
  private taunted = new Set<string>();
  private lastRemark = -99;
  /** The calm ambient music, one for the whole session (core/music.ts). */
  private music?: Music;
  /** Monsters that already had him last frame, so each speaks once as it finds him. */
  private voiced = new Set<Monster>();
  /** How long, in ms, he took to answer the last strike or jump (debug readout). */
  private answerMs = -1;
  private sand!: Phaser.GameObjects.Particles.ParticleEmitter;
  private sinceHidden = Infinity;
  private sneak = false;
  private flowersPerPetal: number = HEALTH.flowersPerPetal;
  private readonly burstRng = makeRng(1);
  /** Set while the scene is the maker's preview. */
  private previewAt: number | undefined;
  private bossHint: Phaser.GameObjects.Text | undefined;
  /** Arrows and stones in the air. */
  private darts: Dart[] = [];

  constructor() {
    super('game');
  }

  init(data: Partial<GameData>): void {
    if (data.settings) this.settings = data.settings;
    this.debugOn = data.debug === true;
    this.previewAt = data.preview?.at;
    this.resume = data.resume;
    this.baseSettings = this.settings;
    if (!data.run) HINTS_SHOWN.clear();
    this.run = data.run ?? newRun(HEALTH.petals);
    this.turnIn = data.turnIn;
    this.corner = data.corner;
  }

  /** One line for the pause card: the world, and the flowers found in it (loop 9). */
  progressLine(): string {
    if (this.previewAt !== undefined || !this.run) return '';
    return `World ${this.run.chapter} · ${this.foundCount()} of ${QUEST.total} flowers found`;
  }

  /** Where he is and what he has, so a changed game can carry on from here. */
  snapshot(): Resume {
    return { x: this.hero.x, petals: this.health.petals, flowers: this.health.flowers };
  }

  create(): void {
    // Each chapter (or side street) is the player's own game, made harder as the run goes on.
    const plan = this.previewAt === undefined ? planChapter(this.baseSettings, this.run) : undefined;
    if (plan) this.settings = plan.settings;
    const settings = this.settings;
    this.look = makeLook(settings);

    createTextures(this);
    this.level = buildLevel(plan?.seed ?? settings.seed, settings, plan?.screens, undefined, plan?.chunks);
    const rules = { ...settings, seed: plan?.seed ?? settings.seed, count: plan?.monsters, boss: plan?.boss, more: plan?.more };
    // A stretch with a boss gets its clearing before the gate.
    if (hasBoss(rules)) addArena(this.level);
    this.cameras.main.setBackgroundColor(this.look.far);
    this.cameras.main.setBounds(0, 0, this.level.width, VIEW_H);

    this.drawBackdrop();
    this.drawGround();
    for (const water of this.level.waters) this.drawPool(water);
    for (const light of this.level.lights) this.drawLight(light);
    for (const spot of this.level.hideSpots) this.drawHideSpot(spot);
    this.goalX = this.level.width - GOAL_FROM_END;
    if (plan) this.drawGate(this.goalX);
    else drawPlantingPlace(this, this.goalX, this.look, DEPTH);
    if (plan) this.placeStreets(plan.streets);

    // The settings say which monsters and how many; the seed says where.
    const startX = this.resume ? Phaser.Math.Clamp(this.resume.x, 300, this.level.width - GOAL_FROM_END - 200) : 300;
    // Carrying on after a change: nothing new may stand right on top of him.
    const placed = this.previewAt === undefined ? placeMonsters(this.level, rules).filter((spawn) => !this.resume || Math.abs(spawn.x - startX) > 380) : showcase(settings);
    this.world = new MonsterWorld(placed, plan ? { toughness: plan.toughness, pace: plan.pace, sight: plan.sight } : undefined);
    this.world.setGround((x) => groundAt(this.level, x));
    for (const monster of this.world.monsters) this.addView(monster);
    // A generated look that arrives during play replaces the stand-in shape at once (ai/look.ts).
    prepareCreatureLooks(settings.creatures);
    const stopLooks = onLook((look) => {
      for (const monster of this.world.monsters) {
        // Its stand-in, whether built from parts or from the AI's own rough shapes, gives way to the real look.
        if (!monster.alive || !isLookFor(look, monster.creature)) continue;
        this.views.get(monster)?.destroy();
        monster.figure = undefined;
        this.addView(monster);
        this.puff.explode(10, monster.x, monster.y - 30);
      }
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, stopLooks);
    this.talk = new Talk(this, { hero: this.look.hero.flower, monster: SUSPECT, boss: DANGER }, DEPTH.hud + 1);
    this.health = this.resume
      ? { ...newHealth(), petals: Math.max(1, this.resume.petals), flowers: this.resume.flowers }
      : plan
        ? { ...newHealth(), petals: Math.max(1, this.run.petals), flowers: this.run.flowers }
        : newHealth();
    if (this.resume) this.coachShown.add('goal');
    this.flowersPerPetal = settings.twist === 'fast-flowers' ? HEALTH.flowersPerPetalFast : HEALTH.flowersPerPetal;
    this.hud = new Hud(this, this.look, this.flowersPerPetal, DEPTH.hud);
    if (this.previewAt !== undefined) this.hud.setVisible(false);
    if (plan) this.setUpQuest();

    this.hero = new Hero(this, startX, DEPTH.hero, DEPTH.heroBehind, this.look.hero);
    // Weapon charges, with what his skills add.
    this.hero.maxCharges = WEAPON_USE.charges + count(this.run, 'charges');
    this.hero.charges = this.hero.maxCharges;
    this.hero.recharge = WEAPON_USE.recharge * Math.pow(0.75, count(this.run, 'reload'));
    this.controls = new Controls(this);
    this.sfx = new Sfx(this);
    const audio = (this.sound as { context?: AudioContext }).context;
    this.music = audio ? Music.for(audio) : undefined;
    this.music?.setLand(landIndex(this.run.chapter));
    this.music?.setPlace(this.run.stage === 'street' ? detourIndex(this.run) : -1);
    this.music?.setFlowers(this.foundCount());
    this.music?.setTension(0);
    this.music?.start();
    this.input.keyboard?.on('keydown-M', () => {
      this.sfx.muted = !this.sfx.muted;
      this.music?.setMuted(this.sfx.muted);
    });
    this.drops = this.add
      .particles(0, 0, 'drop', {
        speed: { min: 70, max: 210 },
        angle: { min: -155, max: -25 },
        gravityY: 760,
        lifespan: { min: 280, max: 520 },
        scale: { start: 0.55, end: 0.15 },
        alpha: { start: 0.9, end: 0 },
        tint: WATER_COLOUR,
        emitting: false,
      })
      .setDepth(DEPTH.pool + 1);
    // Dry sand his feet kick up (loop 5).
    this.sand = this.add
      .particles(0, 0, 'mon-ball', {
        speed: { min: 20, max: 70 },
        angle: { min: 200, max: 340 },
        gravityY: 160,
        lifespan: { min: 300, max: 600 },
        scale: { start: 0.18, end: 0.05 },
        alpha: { start: 0.55, end: 0 },
        tint: mixColour(this.look.mid, 0xd9c7a0, 0.5),
        emitting: false,
      })
      .setDepth(DEPTH.front);
    // Bits of colour when a monster bursts, and the dark puff it leaves.
    this.petalBits = this.add
      .particles(0, 0, 'hero-petal', {
        speed: { min: 60, max: 260 },
        angle: { min: 0, max: 360 },
        gravityY: 300,
        lifespan: { min: 400, max: 900 },
        scale: { start: 0.7, end: 0.1 },
        alpha: { start: 1, end: 0 },
        tint: FLOWER_COLOURS,
        emitting: false,
      })
      .setDepth(DEPTH.front);
    this.puff = this.add
      .particles(0, 0, 'mon-ball', {
        speed: { min: 20, max: 120 },
        angle: { min: 0, max: 360 },
        lifespan: { min: 250, max: 500 },
        scale: { start: 0.3, end: 0 },
        alpha: { start: 0.9, end: 0 },
        tint: this.look.monster.body[0],
        emitting: false,
      })
      .setDepth(DEPTH.monster);
    this.landDust = this.add
      .particles(0, 0, 'glow', {
        speedX: { min: -110, max: 110 },
        speedY: { min: -60, max: -10 },
        lifespan: { min: 260, max: 520 },
        scale: { start: 0.16, end: 0.32 },
        alpha: { start: 0.35, end: 0 },
        tint: mixColour(this.look.mid, 0xd9c7a0, 0.6),
        emitting: false,
      })
      .setDepth(DEPTH.front);
    this.drawWeather();
    this.drawAtmosphere();
    this.createDebug();

    this.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this));
    this.layout();
    this.cameras.main.scrollX = this.cameraTarget();
    // Draw him once now, so he looks right while the title card is still up.
    this.light = lightLevelAt(this.hero.x, this.hero.centreY, this.level.lights, LIGHT.ambient);
    this.hero.draw(1, this.light, false);

    this.hero.airJumps = has(this.run, 'double-jump') ? 1 : 0;
    if (plan) this.introduceStretch();
    if (import.meta.env.DEV) (window as unknown as { __dt: GameScene }).__dt = this;
  }

  update(_time: number, deltaMs: number): void {
    // Film grain moves every frame; the low mist drifts slowly.
    if (this.grain) this.grain.setTilePosition(Math.random() * 128, Math.random() * 128);
    if (this.mist) this.mist.tilePositionX += deltaMs * 0.006;
    const dt = Math.min(deltaMs, 50) / 1000;
    if (this.previewAt !== undefined) return this.showPreview(dt);
    if (this.hitStop > 0) {
      this.hitStop -= dt;
      this.talk?.step(dt, false);
      return;
    }
    // At a gate the world waits for his choice; turning a corner, it waits for the new stretch.
    // The whole map is open: the world waits.
    if (this.atGate || this.leaving || this.mapOpen) return;
    if (this.talk.blocking) {
      this.bossHint?.setVisible(false);
      this.coachText?.setVisible(false);
      const ask = this.controls.poll();
      this.talk.step(dt, ask.strike || ask.jump);
      return;
    }
    const hero = this.hero;
    const here = hideSpotAt(this.level, hero.x);
    // Once the run has ended he is no longer steered: he stands at the flower, or lies where he fell.
    const intent = this.controls.poll();
    const steer: Intent = this.ending
      ? { move: 0, jump: false, lie: false, strike: false, strikeDir: 0 }
      : intent;
    const gate = steer.jump && hero.onGround && !hero.lying ? this.gateHere() : undefined;
    if (gate !== undefined) return this.throughGate(gate);
    hero.step(dt, steer, this.level, here && isShelter(here.kind) ? here : undefined);
    this.feel(dt);
    // While the boss lives, the road ends at its stem.
    const boss = this.world.monsters.find((m) => m.boss !== undefined && m.alive);
    if (boss && hero.x > boss.x + 20) hero.x = boss.x + 20;
    // In the hunt, the end of the road stays closed while any monster stands.
    const standing = this.settings.story === 'hunt' ? this.world.monsters.filter((m) => m.alive).length : 0;
    if (standing > 0 && hero.x > this.goalX - 140) hero.x = this.goalX - 140;
    this.showBossHint(boss, standing);
    this.playEvents();

    // Hiding is judged by the lights of the level alone: a Watcher's beam cannot find him in a hide spot.
    const levelLight = lightLevelAt(hero.x, hero.centreY, this.level.lights, LIGHT.ambient);
    this.spot = hideSpotAt(this.level, hero.x);
    this.hidden = isHidden({ lying: hero.lying, inHideSpot: this.spot !== undefined, light: levelLight });
    this.sinceHidden = this.hidden ? 0 : this.sinceHidden + dt;
    this.light = levelLight;

    if (!this.ending) {
      this.strikeMonsters();
      // Walking in water splashes, and monsters close by hear it. Crawling through is silent.
      const inWater = waterAt(this.level, hero.x) !== undefined;
      const quiet = !inWater || hero.lying || has(this.run, 'quiet');
      const noise = quiet ? 0 : hero.events.landed ? NOISE.landing : hero.onGround && Math.abs(hero.vx) > 30 ? NOISE.step : 0;
      this.splashing = noise > 0;
      const result = this.world.step(dt, {
        x: hero.x,
        y: hero.y,
        centreY: hero.centreY,
        lying: hero.lying,
        hidden: this.hidden,
        // With soft steps, monsters take him for less lit than he is.
        light: levelLight * (has(this.run, 'soft-steps') ? 0.72 : 1),
        roofed: this.spot !== undefined && isRoof(this.spot.kind),
        noise,
      });
      this.light = result.light;
      this.exposed = result.exposed;
      // He pulled the boss's root: it bursts a little, or altogether.
      for (const monster of this.world.monsters) {
        if (!monster.pulled) continue;
        monster.pulled = false;
        this.sfx.hit();
        if (monster.alive) {
          this.petalBits.explode(24, monster.x, GROUND_Y - 20);
          this.cameras.main.shake(160, 0.004);
        } else this.burst(monster);
      }
      this.playMonsterSounds(result.sounds);

      if (result.push && !result.hurt) hero.knock(result.push * 220);
      this.health = tickHealth(this.health, dt);
      if (result.hurt || (hero.events.fell && HEALTH.pitCostsPetal)) this.loseHeart();
      this.collectFlowers(dt);
    }

    hero.petals = this.health.petals;
    hero.blink = this.health.safe > 0 && !this.ending;
    hero.draw(dt, this.light, this.hidden);
    this.drawMonsters(dt);
    this.hud.draw(this.health, Phaser.Math.Clamp(hero.x / this.goalX, 0, 1));
    this.hud.drawCharges(hero.charges, hero.maxCharges, hero.chargeT / hero.recharge, hero.armed, this.look.hero.sword);
    if (!this.ending) this.coach(dt);

    const camera = this.cameras.main;
    camera.scrollX += (this.cameraTarget() - camera.scrollX) * (1 - Math.exp(-5 * dt));

    if (hero.x < this.goalX - 1500) this.leftGate = true;
    if (!this.ending && hero.onGround && hero.x >= this.goalX - 24) {
      if (this.previewAt !== undefined) this.end('won');
      else if (this.run.stage === 'road' && this.foundCount() < QUEST.needed) this.gateWantsMore();
      else this.openGate();
    }
    if (!this.ending && this.previewAt === undefined) {
      this.pickFlowers();
      this.drawQuest(dt);
    }

    if (this.debugOn) {
      const seen = isSeen(this.light, this.hidden);
      const alive = this.world.monsters.filter((m) => m.alive);
      this.debugText.setText(
        [
          `light  ${this.light.toFixed(2)}${seen ? '  (seen)' : ''}${this.exposed ? '  BEAM' : ''}`,
          `hidden ${this.hidden ? 'YES' : 'no'}`,
          `spot   ${this.spot ? this.spot.kind : '-'}${hero.lying ? '  lying' : ''}`,
          `seed   ${this.level.seed}  ${this.settings.mood}`,
          `petals ${this.health.petals}  flowers ${this.health.flowers}/${this.flowersPerPetal}`,
          `seen by ${alive.filter((m) => m.sees).length} of ${alive.length}`,
          `answer ${this.answerMs < 0 ? '-' : Math.round(this.answerMs) + ' ms'}  (touch to action)`,
        ].join('\n'),
      );
    }
  }

  // ---- monsters, hearts, flowers ---------------------------------------------

  /** While his blade is out, hit every monster it reaches. */
  private strikeMonsters(): void {
    const hero = this.hero;
    // A strike that begins within half a second of being hidden is a sneak attack.
    const weapon = this.settings.weapon;
    if (hero.events.struck) this.sneak = isSneakAttack(this.sinceHidden);
    if (hero.events.shot) this.loose();
    if (hero.events.thrown) this.throwWeapon();
    if (hero.events.empty) {
      // Nothing comes: the charge marks shake, so he sees why (loop 8).
      this.sfx.step();
      this.hud.shakeCharges();
    }
    this.flyThrown();
    this.flyDarts();
    if (!hero.strikeActive) return;
    const back = hero.x - hero.facing * 8;
    const front = hero.x + hero.facing * weapon.reach;
    const zone = { x0: Math.min(back, front), x1: Math.max(back, front), y0: hero.y - STRIKE.up, y1: hero.y + 5 };
    if (this.hitStones(zone, weapon.power, hero.strikeId)) hero.stopLunge();
    for (const monster of this.world.strike(zone, this.sneak, hero.strikeId, hero.facing, weapon.power)) {
      this.sfx.hit();
      hero.stopLunge();
      // Both bodies are pushed apart, as in Hollow Knight: he does not trade blows by standing in them.
      hero.knock(-hero.facing * 130);
      buzz(BUZZ.hit);
      this.impact(monster, hero.facing, monster.alive ? 0.06 : 0.1);
      if (!monster.alive) this.burst(monster);
    }
  }

  /** Three quick taps: he throws his blade at the nearest monster ahead (WEAPON_USE). */
  private throwWeapon(): void {
    const hero = this.hero;
    const fromY = hero.y - (hero.lying ? 16 : 52);
    const ahead = this.world.monsters
      .filter((m) => m.alive && (m.x - hero.x) * hero.facing > 10 && Math.abs(m.x - hero.x) < WEAPON_USE.throwRange)
      .sort((a, b) => Math.abs(a.x - hero.x) - Math.abs(b.x - hero.x))[0];
    const angle = ahead ? Phaser.Math.Clamp(Math.atan2(ahead.y - ahead.spec.height / 2 - fromY, Math.abs(ahead.x - hero.x)), -0.6, 0.6) : -0.04;
    const shape = hero.weaponShape;
    const image = this.add.image(hero.x + hero.facing * 14, fromY, shape.key).setScale(shape.scale).setDepth(DEPTH.hero).setTint(0xe4e8f6);
    this.thrown?.image.destroy();
    this.thrown?.glow?.forEach((g) => g.destroy());
    this.run = { ...this.run, throws: this.run.throws + 1 };
    this.thrown = {
      x: image.x,
      y: fromY,
      vx: hero.facing * WEAPON_USE.throwSpeed * Math.cos(angle),
      vy: WEAPON_USE.throwSpeed * Math.sin(angle),
      flown: 0,
      spin: hero.facing * 17,
      state: 'fly',
      image,
      id: 1e6 + this.run.throws,
    };
    this.sfx.swish();
  }

  /** The thrown blade: it flies, hits, falls and lies until he picks it up, or with a boomerang comes back. */
  private flyThrown(): void {
    const t = this.thrown;
    if (!t) return;
    const dt = this.game.loop.delta / 1000;
    const hero = this.hero;
    if (t.state === 'fly') {
      t.x += t.vx * dt;
      t.y += t.vy * dt;
      t.flown += Math.abs(t.vx) * dt;
      const zone = { x0: t.x - 16, x1: t.x + 16, y0: t.y - 16, y1: t.y + 16 };
      const hit = this.world.strike(zone, this.sneak, t.id, t.vx > 0 ? 1 : -1, WEAPON_USE.throwPower);
      if (this.hitStones(zone, WEAPON_USE.throwPower, t.id)) t.flown = WEAPON_USE.throwRange;
      for (const monster of hit) {
        this.sfx.hit();
        this.impact(monster, t.vx > 0 ? 1 : -1, 0.09);
        if (!monster.alive) this.burst(monster);
      }
      if (hit.length > 0 || t.flown >= WEAPON_USE.throwRange || t.y >= groundAt(this.level, t.x) - 6) {
        t.state = 'fall';
        t.vx = -t.vx * 0.12;
        t.vy = -200;
      }
    } else if (t.state === 'back') {
      const dx = hero.x - t.x;
      const dy = hero.y - 50 - t.y;
      const d = Math.hypot(dx, dy) || 1;
      t.x += (dx / d) * 720 * dt;
      t.y += (dy / d) * 720 * dt;
      if (d < 26) return this.pickUpWeapon();
    } else if (t.state === 'fall') {
      t.vy += 900 * dt;
      t.x += t.vx * dt;
      t.y += t.vy * dt;
      if (t.y >= groundAt(this.level, t.x) - 4) {
        // It never lies out of reach: over a pit it comes to rest at the nearer edge.
        const pit = pitAt(this.level, t.x);
        if (pit) t.x = t.x - pit.x0 < pit.x1 - t.x ? pit.x0 - 18 : pit.x1 + 18;
        t.y = groundAt(this.level, t.x) - 4;
        t.state = 'lie';
        t.spin = 0;
        t.image.setRotation(Math.PI / 2 * (t.vx >= 0 ? 1 : -1));
        // It glows where it lies, under a thin column of light, so he can find it from afar.
        const pool = this.add.image(t.x, t.y - 2, 'glow').setDisplaySize(120, 50);
        const column = this.add.image(t.x, GROUND_Y - 70, 'glow').setDisplaySize(16, 150);
        t.glow = [pool, column];
        for (const g of t.glow) g.setTint(this.look.light).setAlpha(0.7).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.glow);
        t.image.setTint(0xffffff).setDepth(DEPTH.front);
        this.tweens.add({ targets: t.glow, alpha: 0.3, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }
    } else if (Math.abs(hero.x - t.x) < WEAPON_USE.pickUp && hero.onGround) {
      return this.pickUpWeapon();
    }
    if (t.spin !== 0) t.image.rotation += t.spin * dt;
    t.image.setPosition(t.x, t.y);
  }

  private pickUpWeapon(): void {
    const t = this.thrown;
    if (!t) return;
    t.image.destroy();
    t.glow?.forEach((g) => g.destroy());
    this.thrown = undefined;
    this.hero.armed = true;
    this.sfx.land();
  }

  /** He earns XP; a new skill, when it comes, works at once (docs/skills.md). Returns the run with it. */
  private earn(xp: number, from: RunState = this.carried()): RunState {
    if (this.previewAt !== undefined) return from;
    const { run, skill } = gainXp(from, xp, this.level.seed, HEALTH.petals);
    this.run = { ...this.run, xp: run.xp, upgrades: run.upgrades };
    if (skill) this.learn(skill);
    return run;
  }

  /** A new skill takes hold at once; and the monsters grow a little with him. */
  private learn(skill: SkillKey): void {
    const weapon = this.settings.weapon;
    const hero = this.hero;
    if (skill === 'reach') weapon.reach = Math.round(weapon.reach * 1.25);
    else if (skill === 'quick') weapon.speed = Math.round(weapon.speed * 125) / 100;
    else if (skill === 'power') weapon.power += 1;
    else if (skill === 'charges') {
      hero.maxCharges++;
      hero.charges++;
    } else if (skill === 'reload') hero.recharge *= 0.75;
    else if (skill === 'double-jump') hero.airJumps = 1;
    else if (skill === 'bloom') this.health = { ...this.health, petals: HEALTH.petals };
    for (const m of this.world.monsters) if (m.alive) m.speed *= 1.05;
    this.showSkill(SKILLS[skill].name);
  }

  /** One quiet line at the top: the new skill, and that the monsters grew too. */
  private showSkill(name: string): void {
    const w = this.scale.width;
    const line = this.add
      .text(w / 2, 26, `New skill · ${name}`, { fontFamily: '"Instrument Sans", system-ui, sans-serif', fontSize: '16px', fontStyle: '600', color: '#f4f4ee' })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH.hud)
      .setAlpha(0);
    const under = this.add
      .text(w / 2, 50, 'The monsters grow stronger too.', { fontFamily: '"Instrument Sans", system-ui, sans-serif', fontSize: '13px', color: '#c9cbd6' })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH.hud)
      .setAlpha(0);
    this.sfx.bloom(true);
    this.tweens.chain({
      targets: [line, under],
      tweens: [
        { alpha: 1, duration: 300 },
        { alpha: 0, duration: 600, delay: 2200, onComplete: () => (line.destroy(), under.destroy()) },
      ],
    });
  }

  /** Loose an arrow (flies level) or throw a stone (flies in an arc). */
  private loose(): void {
    const hero = this.hero;
    const weapon = this.settings.weapon;
    const thrown = weapon.kind === 'thrown';
    // A throw is aimed so that it lands about as far away as the weapon reaches.
    // Anything that fires several shots, or is called a gun, fires bullets, whatever shape it was drawn with.
    const rocket = weapon.look === 'launcher' || /bazoo?k|bazuk|rocket|missile|\brpg\b|launcher/i.test(weapon.name);
    const gun = rocket || ['gun', 'pistol', 'shotgun', 'rifle'].includes(weapon.look) || (weapon.shots ?? 1) > 1 || /gun|rifle|pistol|laser|blaster|cannon/i.test(weapon.name);
    const speed = thrown ? SHOT.throwSpeed * (weapon.reach / 230) : rocket ? SHOT.bulletSpeed * 0.55 : gun ? SHOT.bulletSpeed : SHOT.arrowSpeed;
    // A shot that flies straight is aimed at the nearest monster ahead, up or down a little, so flyers can be hit too.
    const fromY = hero.y - (hero.lying ? 16 : 46);
    let angle = 0;
    const ahead = this.world.monsters
      .filter((m) => m.alive && (m.x - hero.x) * hero.facing > 10 && Math.abs(m.x - hero.x) < weapon.reach * (thrown ? 1.4 : 1.15))
      .sort((a, b) => Math.abs(a.x - hero.x) - Math.abs(b.x - hero.x))[0];
    if (!thrown && ahead) angle = Phaser.Math.Clamp(Math.atan2(ahead.y - ahead.spec.height / 2 - fromY, Math.abs(ahead.x - hero.x)), -0.7, 0.7);
    // A stone's arc is solved to come down on the middle of the monster ahead, or on the ground at its reach.
    const startX = hero.x + hero.facing * 16;
    const aimX = ahead ? ahead.x : hero.x + hero.facing * weapon.reach;
    const aimY = ahead ? ahead.y - ahead.spec.height * 0.5 : GROUND_Y;
    const across = Math.max(30, Math.abs(aimX - startX));
    const flight = Phaser.Math.Clamp(across / speed, 0.32, 0.9);
    const arc = { vx: hero.facing * (across / flight), vy: (aimY - fromY - 0.5 * SHOT.gravity * flight * flight) / flight };
    const shots = thrown ? 1 : Math.max(1, weapon.shots ?? 1);
    for (let i = 0; i < shots; i++) {
      // Several shots at once (a shotgun) fan out evenly around the aim.
      const a = shots === 1 ? angle : angle + (weapon.spread ?? 0.25) * (i / (shots - 1) - 0.5);
      const image = this.add
        .image(0, 0, thrown ? 'wpn-stone' : rocket ? 'rocket' : gun ? 'mon-shot' : 'arrow')
        .setScale(rocket ? 1 : gun ? 0.4 : 0.5)
        .setTint(mixColour(this.look.stage, 0xe4e8f6, 0.85))
        .setDepth(DEPTH.hero);
      this.darts.push({
        x: startX,
        y: fromY,
        vx: thrown ? arc.vx : hero.facing * speed * Math.cos(a),
        vy: thrown ? arc.vy : speed * Math.sin(a),
        left: thrown ? weapon.reach * 2 : weapon.reach,
        falls: thrown,
        id: hero.strikeId,
        sneak: this.sneak,
        dir: hero.facing,
        image,
        blast: rocket && !thrown,
      });
    }
  }

  /** A rocket bursts: a flash of light, and every monster close by is hit. */
  private blast(dart: Dart): void {
    const r = 110;
    const zone = { x0: dart.x - r, x1: dart.x + r, y0: dart.y - r, y1: Math.min(GROUND_Y, dart.y + r) };
    for (const monster of this.world.strike(zone, dart.sneak, dart.id + 0.5, dart.dir, this.settings.weapon.power)) {
      this.impact(monster, dart.dir, 0.05);
      if (!monster.alive) this.burst(monster);
    }
    this.sfx.hit();
    this.cameras.main.shake(180, 0.01);
    const flash = this.add
      .image(dart.x, dart.y, 'glow')
      .setDisplaySize(60, 60)
      .setTint(this.look.light)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(DEPTH.front);
    this.tweens.add({ targets: flash, displayWidth: r * 3, displayHeight: r * 3, alpha: 0, duration: 420, ease: 'Cubic.easeOut', onComplete: () => flash.destroy() });
    const ring = this.add.circle(dart.x, dart.y, r, 0xffffff, 0).setStrokeStyle(2, 0xf4f4ee, 0.8).setScale(0.2).setDepth(DEPTH.front);
    this.tweens.add({ targets: ring, scale: 1, alpha: 0, duration: 360, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
  }

  private flyDarts(): void {
    const dt = this.game.loop.delta / 1000;
    const power = this.settings.weapon.power;
    for (const dart of this.darts) {
      dart.x += dart.vx * dt;
      dart.y += dart.vy * dt;
      if (dart.falls) dart.vy += SHOT.gravity * dt;
      dart.left -= Math.abs(dart.vx) * dt;
      const zone = { x0: dart.x - 9, x1: dart.x + 9, y0: dart.y - 9, y1: dart.y + 9 };
      const hit = this.world.strike(zone, dart.sneak, dart.id, dart.dir, power);
      if (this.hitStones(zone, power, dart.id + 0.25)) dart.left = 0;
      for (const monster of hit) {
        this.sfx.hit();
        this.impact(monster, dart.dir, monster.alive ? 0.035 : 0.08);
        if (!monster.alive) this.burst(monster);
      }
      if (hit.length > 0 || dart.left <= 0 || dart.y >= groundAt(this.level, dart.x)) {
        dart.left = -1;
        if (dart.blast) this.blast(dart);
      }
      dart.image.setPosition(dart.x, dart.y).setRotation(Math.atan2(dart.vy, dart.vx));
    }
    for (const dart of this.darts) if (dart.left < 0) dart.image.destroy();
    this.darts = this.darts.filter((dart) => dart.left >= 0);
  }

  /**
   * Development only: stand every merge (or the given described monsters) in a row along
   * the road, each held in place, to look at them beside the hero. Called from the console.
   */
  zoo(creatures: Creature[] = []): number[] {
    for (const view of this.views.values()) view.destroy();
    this.views.clear();
    const designs = creatures.length > 0 ? creatures.map(designFor) : ENEMIES.flatMap((a, i) => ENEMIES.slice(i + 1).map((b) => mergeDesign(a, b)));
    const spawns = designs.map((design, i) => ({ kind: design.brain, x: 700 + i * 420, minX: 700 + i * 420, maxX: 700 + i * 420, design }));
    this.world = new MonsterWorld(spawns);
    for (const monster of this.world.monsters) {
      const View = monster.figure ? FigureView : monster.creature ? CreatureView : RoleView;
      this.views.set(monster, new View(this, monster, this.look.monster, this.look.light, DEPTH.monster));
    }
    return spawns.map((spawn) => spawn.x);
  }

  /** Each monster is drawn from the kit (a merge, the boss, most described monsters), its own recipe, or one of the five. */
  private addView(monster: Monster): void {
    const View = monster.figure ? FigureView : monster.creature ? CreatureView : RoleView;
    this.views.set(monster, new View(this, monster, this.look.monster, this.look.light, DEPTH.monster));
  }

  // ---- the boss's story (Amin, 19 Oct) -----------------------------------------

  /** He walks into its clearing: it talks, calls its soldiers, waits for them to fall, fights, and dies talking. */
  private bossFlow(): void {
    const boss = this.world.monsters.find((m) => m.boss !== undefined);
    const arena = this.level.arena;
    if (!boss?.boss || !arena || this.ending) return;
    const chapter = this.run.chapter;
    if (this.bossStage === 'none' && boss.alive && this.hero.x > arena.x0 + 40) {
      this.bossStage = 'intro';
      boss.boss.waiting = true;
      this.talk.say(bossIntro(chapter), () => this.callSoldiers(boss));
    } else if (this.bossStage === 'soldiers' && [...this.soldiers].every((m) => !m.alive)) {
      this.bossStage = 'duel';
      boss.boss.waiting = false;
      this.fightMood(false);
      this.talk.say(bossAlone(chapter));
    }
    if (!boss.alive && this.bossStage !== 'dead' && this.bossStage !== 'none') {
      this.bossStage = 'dead';
      this.fightMood(false);
      this.talk.say(bossDeath(chapter));
    }
  }

  /** Its soldiers come out of the dust, between him and it, and come straight for him. */
  private callSoldiers(boss: Monster): void {
    const arena = this.level.arena;
    if (!arena) return;
    const n = soldierCount(this.run.chapter);
    const from = Math.max(this.hero.x + 240, arena.x0 + 200);
    const to = Math.max(from + 40, boss.x - 110);
    const kinds = (['crawler', 'flyer', 'stalker'] as const).filter((k) => this.settings.enemies.includes(k));
    const cast = kinds.length > 0 ? kinds : (['crawler'] as const);
    const spawns: Spawn[] = Array.from({ length: n }, (_, i) => {
      const x = Math.round(from + ((to - from) * i) / Math.max(1, n - 1));
      return { kind: cast[i % cast.length], x, minX: arena.x0 + 20, maxX: boss.x - 60 };
    });
    for (const m of this.world.summon(spawns)) {
      this.soldiers.add(m);
      this.addView(m);
      m.facing = -1;
      m.hunt = HUNT.memory;
      m.lastX = this.hero.x;
      m.notice = 0.8;
      this.puff.explode(14, m.x, m.y - 20);
    }
    this.sfx.rush();
    this.cameras.main.shake(220, 0.006);
    this.bossStage = 'soldiers';
    this.fightMood(true);
  }

  /** In the fight with the soldiers his weapon is full, holds two more, and comes back three times as fast. */
  private fightMood(on: boolean): void {
    const hero = this.hero;
    if (on && !this.beforeFight) {
      this.beforeFight = { recharge: hero.recharge, max: hero.maxCharges };
      hero.maxCharges += 2;
      hero.charges = hero.maxCharges;
      hero.recharge /= 3;
      this.hud.shakeCharges();
    } else if (!on && this.beforeFight) {
      hero.recharge = this.beforeFight.recharge;
      hero.maxCharges = this.beforeFight.max;
      hero.charges = Math.min(hero.charges, hero.maxCharges);
      this.beforeFight = undefined;
    }
  }

  /** Where the hero stands in the maker's preview, as a share of the screen's width. */
  setPreviewAt(at: number): void {
    this.previewAt = at;
  }

  /** The maker's preview: he stands still with his weapon, the chosen monsters stand in front of him, the world moves around them. */
  private showPreview(dt: number): void {
    const hero = this.hero;
    const camera = this.cameras.main;
    camera.scrollX = 0;
    hero.x = Math.max(60, (this.previewAt ?? 0.3) * this.scale.width);
    hero.facing = 1;
    hero.step(dt, { move: 0, jump: false, lie: false, strike: false, strikeDir: 0 }, this.level, undefined);
    hero.x = Math.max(60, (this.previewAt ?? 0.3) * this.scale.width);
    this.light = lightLevelAt(hero.x, hero.centreY, this.level.lights, LIGHT.ambient);
    hero.draw(dt, this.light, false);
    this.world.monsters.forEach((monster, i) => {
      monster.x = monster.homeX = monster.minX = monster.maxX = hero.x + SHOWCASE.first + i * SHOWCASE.gap;
      monster.facing = -1;
    });
    this.drawMonsters(dt);
  }

  /** One line of help while he faces the boss: what its eye does, and the way to beat it that he has. */
  private showBossHint(boss: Monster | undefined, standing = 0): void {
    const hunted = !boss && standing > 0 && !this.ending && this.goalX - this.hero.x < 700;
    const near = (boss !== undefined && !this.ending && boss.x - this.hero.x < 760) || hunted;
    if (!near) {
      this.bossHint?.setVisible(false);
      return;
    }
    this.bossHint ??= this.add
      .text(0, 16, '', { fontFamily: '"Instrument Sans", system-ui, sans-serif', fontSize: '15px', color: '#f4f4ee' })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH.front + 1);
    const armed = this.settings.weapon.kind !== 'none';
    const line = this.bossStage === 'soldiers'
      ? 'Its soldiers are here. Fight!'
      : !boss
      ? `${standing} still stand. Every one must fall.`
      : boss.boss && boss.boss.daze > 0 ? 'It is dazed. Run in and pull its root.' : armed ? 'Strike its stem. Or let it see you, then hide.' : 'Let it see you, then hide. It will lose you.';
    this.bossHint.setText(line).setX(this.scale.width / 2).setVisible(true);
  }

  /** A defeated monster bursts into flowers (brief 3.4). */
  // ---- the endless run: gates, side streets, chapters ------------------------

  /** The run as it stands now, with what he carries from this stretch. */
  private carried(): RunState {
    return { ...this.run, petals: this.health.petals, flowers: this.health.flowers, defeated: this.run.defeated + this.defeated };
  }

  /** The gate at the end of a stretch: two stone posts, a lintel and a light. */
  private drawGate(x: number): void {
    const look = this.look;
    const g = this.add.graphics().setDepth(DEPTH.props);
    g.fillStyle(look.prop, 1);
    g.fillRect(x - 72, GROUND_Y - 190, 22, 190);
    g.fillRect(x + 50, GROUND_Y - 190, 22, 190);
    g.fillRect(x - 86, GROUND_Y - 208, 172, 20);
    g.fillStyle(look.light, 0.95);
    g.fillCircle(x, GROUND_Y - 224, 7);
    const glow = this.add
      .image(x, GROUND_Y - 110, 'glow')
      .setDisplaySize(240, 300)
      .setTint(look.light)
      .setAlpha(0.3)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(DEPTH.glow);
    this.tweens.add({ targets: glow, alpha: 0.16, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  /**
   * Detours open inside archway gates (Amin, 18 Oct). On the road they stand between its other features, each
   * walked once. In a detour the gate he came through stands behind him, so he can always go back.
   */
  private placeStreets(n: number): void {
    if (this.run.stage === 'street') {
      this.backGate = BACK_GATE;
      this.drawDetourGate(this.backGate, true);
      return;
    }
    if (n <= 0) return;
    // The same places the map shows (world.ts). A gate whose detour still holds a flower glows in the flowers' colour.
    const world = worldLayout(this.baseSettings, this.run);
    const waiting = (x: number) => world.detours.find((d) => d.gateX === x)?.quest.flowers.some((f) => !this.run.found.includes(f.id)) ?? false;
    for (const x of chooseGates(this.level, this.goalX, n)) {
      // A detour already walked: its gate still stands, dimmer, and no longer opens.
      if (this.run.streetsDone.includes(Math.round(x))) {
        this.drawDetourGate(x, true);
        continue;
      }
      this.streets.push(x);
      this.drawDetourGate(x, false, waiting(x));
    }
  }

  /**
   * An archway gate, the same stone as the others, with another place glowing faintly inside it: a path running
   * away under a lamp. It is also a place to hide under, like any arch.
   */
  private drawDetourGate(x: number, back: boolean, waiting = false): void {
    const look = this.look;
    const G = GROUND_Y;
    const half = 62; // half the opening
    const top = G - 196; // the underside of the lintel
    this.level.hideSpots.push({ kind: 'arch', x0: x - half - 20, x1: x + half + 20 });

    // Inside the opening (Amin, 18 Oct): nothing to make out, only a blurred, dim glimpse of somewhere else and a
    // faint light breathing in it, enough to say "you can go through here".
    const inside = this.add.graphics().setDepth(DEPTH.props - 0.2);
    inside.fillStyle(mixColour(look.stage, look.far, 0.6), 1);
    inside.fillRect(x - half, top, half * 2, G - top);
    const opening = this.make.graphics({}, false).fillRect(x - half, top, half * 2, G - top);
    const mask = opening.createGeometryMask();
    const blur = [
      { dx: -24, dy: 0.35, size: 120, tint: look.mid, alpha: 0.5 },
      { dx: 22, dy: 0.55, size: 110, tint: look.horizon, alpha: 0.4 },
      { dx: 0, dy: 0.8, size: 140, tint: mixColour(look.mid, look.light, 0.3), alpha: 0.3 },
    ];
    for (const [i, b] of blur.entries()) {
      const y = top + (G - top) * b.dy;
      const blob = this.add.image(x + b.dx, y, 'glow').setDisplaySize(b.size, b.size).setTint(b.tint).setAlpha(b.alpha * (back ? 0.6 : 1)).setDepth(DEPTH.props - 0.18).setMask(mask);
      this.tweens.add({ targets: blob, x: x - b.dx * 0.6, y: y - 10, duration: 5200 + i * 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    const dim = this.add
      .image(x, G - 40, 'glow')
      .setDisplaySize(110, 120)
      .setTint(waiting ? look.accent : look.light)
      .setAlpha(back ? 0.08 : waiting ? 0.24 : 0.12)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(DEPTH.props - 0.15)
      .setMask(mask);
    this.tweens.add({ targets: dim, alpha: back ? 0.04 : 0.08, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // The stone: two posts, the lintel, and the shoulders of the arch.
    const g = this.add.graphics().setDepth(DEPTH.props);
    g.fillStyle(look.prop, 1);
    g.fillRect(x - half - 22, top, 22, G - top);
    g.fillRect(x + half, top, 22, G - top);
    g.fillRect(x - half - 34, top - 32, (half + 34) * 2, 32);
    g.fillTriangle(x - half, top, x - half + 34, top, x - half, top + 36);
    g.fillTriangle(x + half, top, x + half - 34, top, x + half, top + 36);
    // A thin edge of the inner light on the posts.
    g.fillStyle(look.light, 0.22);
    g.fillRect(x - half - 1.5, top + 36, 1.5, G - top - 36);
    g.fillRect(x + half, top + 36, 1.5, G - top - 36);
  }

  /** The detour gate he stands at, if any: on the road one not yet walked, in a detour the way back. */
  private gateHere(): number | undefined {
    if (this.ending || this.previewAt !== undefined) return undefined;
    const x = this.hero.x;
    if (this.run.stage === 'street') return this.backGate !== undefined && Math.abs(x - this.backGate) < 46 ? this.backGate : undefined;
    return this.streets.find((s) => Math.abs(x - s) < 46);
  }

  /** Up at a detour gate: he goes through it, and the camera turns round him as he goes. */
  private throughGate(at: number): void {
    if (this.run.stage === 'street') this.leave(leaveStreet(this.carried()), -1);
    else this.leave(enterStreet(this.carried(), at), 1);
  }

  /** A detour brings him back round the camera's turn; there is no title over the play. */
  private introduceStretch(): void {
    if (this.corner) {
      // Through a gate: the world waits, without him, until the turn has brought him here.
      const corner = this.corner;
      this.corner = undefined;
      this.leaving = true;
      this.hero.view.setVisible(false);
      this.game.events.once(Phaser.Core.Events.POST_RENDER, () => {
        corner
          .finish(this, this.hero.view)
          .catch(() => this.hero.view.setVisible(true))
          .finally(() => (this.leaving = false));
      });
    } else if (this.turnIn) {
      this.cameras.main.fadeIn(520, 7, 10, 20);
    } else if (this.run.chapter > 1 || this.resume) {
      this.cameras.main.fadeIn(420, 7, 10, 20);
    }
    this.tellStory();
  }

  /** The story, told in two quiet lines as a world or a detour begins (enhancement loop 1). */
  private tellStory(): void {
    if (this.previewAt !== undefined || (this.resume && this.run.stage === 'road')) return;
    const street = this.run.stage === 'street';
    const here = street ? this.quest.flowers.filter((f) => !this.run.found.includes(f.id)).length : 0;
    const land = landOf(this.run.chapter);
    const head = street ? 'A detour' : `World ${this.run.chapter} · ${land.name}`;
    const line = street
      ? here > 0
        ? `${here} living ${here === 1 ? 'flower waits' : 'flowers wait'} here.`
        : 'Nothing living is left here.'
      : land.line;
    const w = this.scale.width;
    const title = this.add
      .text(w / 2, VIEW_H * 0.24, head, { fontFamily: '"Newsreader", Georgia, serif', fontSize: '28px', color: '#f4f4ee' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH.hud)
      .setAlpha(0);
    const under = this.add
      .text(w / 2, VIEW_H * 0.24 + 30, line, { fontFamily: '"Instrument Sans", system-ui, sans-serif', fontSize: '14px', color: '#d9dbe4' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH.hud)
      .setAlpha(0);
    this.tweens.chain({
      targets: [title, under],
      tweens: [
        { alpha: 1, duration: 600, delay: this.corner || street ? 1500 : 400 },
        { alpha: 0, duration: 800, delay: 2600, onComplete: () => (title.destroy(), under.destroy()) },
      ],
    });
  }

  /** Leave this stretch for the next: through a gate (turn 1 in, -1 back out) or straight on along the road (0). */
  private leave(next: RunState, turn: 0 | 1 | -1): void {
    if (this.leaving) return;
    this.leaving = true;
    const cam = this.cameras.main;
    const back = next.stage === 'road' && next.returnTo ? { x: next.returnTo.x + 120, petals: next.petals, flowers: next.flowers } : undefined;
    const data: GameData = { settings: this.baseSettings, debug: this.debugOn, run: back ? { ...next, returnTo: undefined } : next, resume: back };
    const swap = () => {
      const game = this.game;
      const key = this.scene.key;
      game.scene.remove(key);
      // Phaser removes a scene on its next step: the new stretch starts once the old one is gone.
      const start = () => (game.scene.keys[key] ? setTimeout(start, 16) : game.scene.add(key, GameScene, true, data));
      setTimeout(start, 0);
    };
    if (turn !== 0) {
      // Through a gate: he stands up, and the camera turns round him (corner.ts).
      this.hero.lying = false;
      this.hero.draw(1, this.light, false);
      // Words on screen stay out of the picture that turns.
      this.coachText?.setVisible(false);
      this.bossHint?.setVisible(false);
      for (const child of this.children.list) if (child instanceof Phaser.GameObjects.Text) child.setVisible(false);
      CornerTurn.begin(this, this.hero.view, turn, this.look.light)
        .then((corner) => {
          data.corner = corner;
          swap();
        })
        .catch(() => {
          data.turnIn = turn;
          swap();
        });
      return;
    }
    cam.fadeOut(520, 7, 10, 20);
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, swap);
  }

  /**
   * The gate at the end of a stretch. No cards (Amin, 18 Oct): skills come while playing. A detour's far gate
   * leads back to the road; the road's leads on.
   */
  private openGate(): void {
    const street = this.run.stage === 'street';
    if (!street) return this.plant();
    const next = this.earn(XP.detour, afterGate(this.carried(), Math.round(this.goalX)));
    this.leave(next, -1);
  }

  // ---- the story: living flowers, stones, and the planting (quest.ts) ----------

  private foundCount(): number {
    return this.run.found.filter((id) => /f\d+$/.test(id)).length;
  }

  /** Lay out this stretch's flowers and stones, the map, and how dry the world looks. */
  private setUpQuest(): void {
    const street = this.run.stage === 'street';
    // The whole world, known from its seed: this part's flowers and stones are where the map says.
    const world = worldLayout(this.baseSettings, this.run);
    const here = street ? world.detours.find((d) => d.gateX === this.run.returnTo?.x) : undefined;
    this.quest = street ? (here?.quest ?? { flowers: [], stones: [] }) : world.road.quest;
    for (const stone of this.quest.stones) if (!this.run.found.includes(stone.id)) this.drawStone(stone);
    for (const flower of this.quest.flowers) {
      const inStone = flower.stone !== undefined && !this.run.found.includes(flower.stone);
      if (!inStone && !this.run.found.includes(flower.id)) this.drawLivingFlower(flower, false);
      // Where a flower was taken, the ground has come back to life (loop 4).
      if (this.run.found.includes(flower.id)) this.drawRevival(flower.x, false);
    }
    this.guardFlowers();
    this.hud.hideRoad();
    this.minimap = new MiniMap(this, world, this.look, DEPTH.hud, (open) => {
      this.mapOpen = open;
      // Taps on the map are not taps in the game.
      this.controls.reset();
    });
    this.dust = this.add
      .rectangle(0, 0, MAX_VIEW_W + 40, VIEW_H + 40, mixColour(this.look.far, 0x8c8272, 0.55), 1)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(DUST_DEPTH);
    this.applyDryness(dryness(this.foundCount(), this.run.planted));
  }

  /**
   * Monsters keep watch over the flowers in the open (loop 7): for each, the nearest monster that can reach it
   * without crossing a pit comes to stand a little way off it. A flower is something to sneak or fight for.
   */
  private guardFlowers(): void {
    const taken = new Set<Monster>();
    for (const flower of this.quest.flowers) {
      if (flower.stone || this.run.found.includes(flower.id)) continue;
      const guard = this.world.monsters
        .filter((m) => m.alive && !m.boss && !taken.has(m) && Math.abs(m.x - (this.resume?.x ?? 300)) > 500)
        .sort((a, b) => Math.abs(a.x - flower.x) - Math.abs(b.x - flower.x))[0];
      if (!guard || Math.abs(guard.x - flower.x) > 1600) continue;
      taken.add(guard);
      // Its new ground: around the flower, never past a pit.
      const left = Math.max(0, ...this.level.pits.filter((pit) => pit.x1 <= flower.x).map((pit) => pit.x1));
      const right = Math.min(this.goalX, ...this.level.pits.filter((pit) => pit.x0 >= flower.x).map((pit) => pit.x0));
      const side = guard.x >= flower.x ? 1 : -1;
      const x = Phaser.Math.Clamp(flower.x + side * 120, left + 30, right - 30);
      guard.x = guard.homeX = guard.originX = guard.lastX = x;
      guard.minX = Math.max(left + 20, x - 460);
      guard.maxX = Math.min(right - 20, x + 460);
      guard.facing = side === 1 ? -1 : 1;
    }
  }

  /** Grey and dim (1) to full colour (0). */
  private applyDryness(d: number): void {
    if (!this.dust || Math.abs(d - this.dryShown) < 0.002) return;
    this.dryShown = d;
    this.dust.setAlpha(0.5 * d);
  }

  /** A living flower: one tall bloom on a stem, glowing softly so it can be found in the dark. */
  private drawLivingFlower(flower: QuestFlower, rising: boolean): void {
    const look = this.look;
    const glow = this.add.image(0, -26, 'glow').setDisplaySize(70, 70).setTint(look.accent).setAlpha(0.45).setBlendMode(Phaser.BlendModes.ADD);
    const stem = this.add.rectangle(0, 0, 2.5, 30, mixColour(look.prop, 0x6f9a5a, 0.6)).setOrigin(0.5, 1);
    const leaf = this.add.ellipse(4, -12, 9, 4, mixColour(look.prop, 0x6f9a5a, 0.6)).setRotation(-0.5);
    const bloom = this.add.image(0, -32, 'flower').setDisplaySize(20, 20).setTint(look.accent);
    const heart = this.add.image(0, -32, 'mon-ball').setDisplaySize(6, 6).setTint(0xfff2c2);
    // Above the dust: the one thing still in colour.
    // A faint column of light over it, so it can be seen from afar (loop 3).
    const column = this.add.image(0, -90, 'glow').setDisplaySize(18, 190).setTint(look.accent).setAlpha(0.22).setBlendMode(Phaser.BlendModes.ADD);
    const view = this.add.container(flower.x, GROUND_Y, [column, glow, stem, leaf, bloom, heart]).setDepth(DUST_DEPTH + 0.5);
    this.tweens.add({ targets: column, alpha: 0.1, duration: 1700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: glow, alpha: 0.2, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: [bloom, heart], angle: 8, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    if (rising) {
      view.setScale(0.2).setY(GROUND_Y + 6);
      this.tweens.add({ targets: view, scale: 1, y: GROUND_Y, duration: 600, ease: 'Back.easeOut' });
    }
    this.flowerViews.set(flower.id, { flower, view });
  }

  /** A patch of green grass where a living flower stood: the first of the land coming back (loop 4). */
  private drawRevival(x: number, growing: boolean): void {
    const rng = makeRng(Math.round(x) ^ 0x9e11);
    const g = this.add.graphics().setDepth(DUST_DEPTH + 0.4).setPosition(x, GROUND_Y + 1);
    const greens = [0x7fb069, 0x9ccc65, 0x6a994e];
    for (let i = 0; i < 26; i++) {
      const bx = (rng() - 0.5) * 120 * (0.4 + rng() * 0.6);
      const h = 5 + rng() * 12 * (1 - Math.abs(bx) / 80);
      const lean = (rng() - 0.4) * 5;
      g.fillStyle(greens[i % greens.length], 0.95);
      g.fillTriangle(bx - 1.5, 0, bx + 1.5, 0, bx + lean, -h);
    }
    if (growing) {
      g.setScale(1, 0);
      this.tweens.add({ targets: g, scaleY: 1, duration: 900, delay: 150, ease: 'Back.easeOut' });
    }
  }

  /** A cracked stone: something may be inside. */
  private drawStone(stone: Stone): void {
    const look = this.look;
    const g = this.add.graphics().setDepth(DEPTH.props + 0.2).setPosition(stone.x, GROUND_Y);
    const rng = makeRng(this.level.seed ^ Math.round(stone.x));
    const points: Phaser.Math.Vector2[] = [];
    for (let i = 0; i <= 9; i++) {
      const a = Math.PI + (i / 9) * Math.PI;
      const r = 1 + (rng() - 0.5) * 0.25;
      points.push(new Phaser.Math.Vector2(Math.cos(a) * 26 * r, Math.sin(a) * 30 * r + 2));
    }
    g.fillStyle(mixColour(look.prop, look.mid, 0.35), 1);
    g.fillPoints(points, true);
    // Its cracks, pale, so it reads as something that can be broken.
    g.lineStyle(1.4, mixColour(look.mid, look.light, 0.45), 0.8);
    g.lineBetween(-4, -26, 2, -14);
    g.lineBetween(2, -14, -6, -6);
    g.lineBetween(2, -14, 12, -10);
    this.stoneViews.set(stone.id, { stone, view: g, hits: QUEST.stoneHits, last: -1 });
  }

  /** A strike, a shot or a thrown blade meets stones in `zone`. True when it hit one. */
  private hitStones(zone: { x0: number; x1: number; y0: number; y1: number }, power: number, strikeId: number): boolean {
    let hitAny = false;
    for (const entry of [...this.stoneViews.values()]) {
      const { stone, view } = entry;
      if (zone.x1 < stone.x - 26 || zone.x0 > stone.x + 26 || zone.y1 < GROUND_Y - 34 || zone.y0 > GROUND_Y) continue;
      if (entry.last === strikeId) continue;
      entry.last = strikeId;
      hitAny = true;
      entry.hits -= Math.max(1, power);
      this.sfx.hit();
      this.puff.explode(6, stone.x, GROUND_Y - 16);
      this.tweens.add({ targets: view, x: stone.x + 3, duration: 40, yoyo: true, repeat: 2 });
      if (entry.hits <= 0) this.breakStone(entry.stone);
    }
    return hitAny;
  }

  /** The stone breaks: what it held comes out. */
  private breakStone(stone: Stone): void {
    this.stoneViews.get(stone.id)?.view.destroy();
    this.stoneViews.delete(stone.id);
    this.run = { ...this.run, found: [...this.run.found, stone.id] };
    this.puff.explode(18, stone.x, GROUND_Y - 14);
    this.cameras.main.shake(100, 0.004);
    // Shards of the stone fly and fall (loop 8).
    const shardColour = mixColour(this.look.prop, this.look.mid, 0.35);
    for (let i = 0; i < 7; i++) {
      const shard = this.add.triangle(stone.x, GROUND_Y - 16, 0, 0, 7 + i, 2, 3, 6 + (i % 3) * 2, shardColour).setDepth(DEPTH.props + 0.3);
      const dx = (i - 3) * (14 + Math.random() * 10);
      this.tweens.add({ targets: shard, x: stone.x + dx, y: GROUND_Y - 30 - Math.random() * 30, angle: dx * 6, duration: 260, ease: 'Sine.easeOut' });
      this.tweens.add({ targets: shard, y: GROUND_Y - 2, delay: 260, duration: 300, ease: 'Sine.easeIn' });
      this.tweens.add({ targets: shard, alpha: 0, delay: 1400, duration: 600, onComplete: () => shard.destroy() });
    }
    if (stone.holds === 'flower') {
      const flower = this.quest.flowers.find((f) => f.stone === stone.id);
      if (flower) this.drawLivingFlower(flower, true);
    } else if (stone.holds === 'petal') {
      this.health = { ...this.health, petals: Math.min(HEALTH.petals, this.health.petals + 1) };
      this.floatLine(stone.x, '+1 petal');
    } else if (stone.holds === 'charge') {
      this.hero.charges = Math.min(this.hero.maxCharges, this.hero.charges + 2);
      this.floatLine(stone.x, '+2 charges');
    }
  }

  /** A short word rising from a place and fading. */
  private floatLine(x: number, words: string): void {
    const line = this.add
      .text(x, GROUND_Y - 50, words, { fontFamily: '"Instrument Sans", system-ui, sans-serif', fontSize: '13px', color: '#f4f4ee' })
      .setOrigin(0.5)
      .setDepth(DEPTH.front);
    this.tweens.add({ targets: line, y: line.y - 30, alpha: 0, duration: 1300, ease: 'Sine.easeOut', onComplete: () => line.destroy() });
  }

  /** He walks over a living flower: it is his. The world takes back a little colour. */
  private pickFlowers(): void {
    const hero = this.hero;
    for (const [id, { flower, view }] of this.flowerViews) {
      if (Math.abs(hero.x - flower.x) > QUEST.reach || hero.y < GROUND_Y - 60) continue;
      this.flowerViews.delete(id);
      this.run = { ...this.run, found: [...this.run.found, id] };
      // A chime, and from now on the music's bells come a little more often.
      this.sfx.chime();
      this.music?.chime();
      this.music?.setFlowers(this.foundCount());
      this.petalBits.explode(16, flower.x, GROUND_Y - 30);
      this.drawRevival(flower.x, true);
      // It flies up into the map, where it is counted (loop 3).
      const cam = this.cameras.main;
      const to = this.minimap?.centre ?? { x: this.scale.width - 56, y: 86 };
      view.setScrollFactor(1);
      this.tweens.add({
        targets: view,
        x: cam.scrollX + to.x,
        y: to.y + 32,
        scale: 0.35,
        duration: 700,
        ease: 'Cubic.easeIn',
        onComplete: () => {
          view.destroy();
          this.minimap?.pulse();
        },
      });
      this.sfx.bloom(true);
      const found = this.foundCount();
      this.floatLine(flower.x, found >= QUEST.needed ? `${found} flowers · the gate is open` : `${found} / ${QUEST.needed}`);
    }
  }

  /** The map, and the colour coming back. */
  private drawQuest(dt: number): void {
    const target = dryness(this.foundCount(), this.run.planted);
    const shown = this.dryShown < 0 ? target : this.dryShown + (target - this.dryShown) * (1 - Math.exp(-2 * dt));
    this.applyDryness(shown);
    this.minimap?.draw({ heroX: this.hero.x, gateX: this.run.stage === 'street' ? this.run.returnTo?.x : undefined, found: this.run.found });
  }

  /** At the end gate with too few flowers: it stays shut, and says how many more. */
  private gateWantsMore(): void {
    const hero = this.hero;
    hero.x = this.goalX - 60;
    hero.vx = 0;
    if (this.runTime - this.gateToldAt < 3) return;
    this.gateToldAt = this.runTime;
    const more = QUEST.needed - this.foundCount();
    this.floatLine(this.goalX - 60, `${more} more ${more === 1 ? 'flower' : 'flowers'} to plant here`);
    if (this.leftGate && this.returnWave()) {
      this.leftGate = false;
      this.time.delayedCall(1400, () => this.floatLine(this.hero.x - 40, 'The dust stirs. They are back on the road.'));
    }
  }

  /**
   * Monsters come back onto the road behind him (Amin, 19 Oct: going back for flowers must not be an empty walk).
   * Enough to fill it again, spread out, never on a pit or right beside him. Returns true when any came.
   */
  private returnWave(): boolean {
    const hero = this.hero;
    const end = this.level.arena ? this.level.arena.x0 - 260 : this.goalX - 700;
    const from = SAFE_START;
    const to = Math.min(end, hero.x - 600);
    if (to - from < 400) return false;
    const want = Math.min(7, 3 + this.run.chapter);
    const behind = this.world.monsters.filter((m) => m.alive && !m.boss && m.x > from && m.x < to).length;
    const n = want - behind;
    if (n <= 0) return false;
    const land = landOf(this.run.chapter);
    const cast = [...this.settings.enemies, ...land.more.filter((k) => this.settings.enemies.includes(k))];
    const spawns: Spawn[] = [];
    for (let i = 0; i < n; i++) {
      let x = Math.round(from + ((to - from) * (i + 0.2 + this.burstRng() * 0.6)) / n);
      // Off any pit, onto firm ground.
      const pit = this.level.pits.find((p) => x > p.x0 - 60 && x < p.x1 + 60);
      if (pit) x = pit.x0 - 70 > from ? pit.x0 - 70 : pit.x1 + 70;
      const kind = cast[Math.floor(this.burstRng() * cast.length)];
      spawns.push({ kind, x, ...groundAround(this.level, x) });
    }
    for (const m of this.world.summon(spawns)) {
      this.addView(m);
      this.puff.explode(10, m.x, m.y - 20);
    }
    return true;
  }

  /** The planting: the flowers he found go into the ground before the gate, grow, and the world fills with colour. */
  private plant(): void {
    if (this.atGate) return;
    this.atGate = true;
    const found = Math.min(QUEST.total, this.foundCount());
    const look = this.look;
    // All of them in one place, as one bunch growing from a single spot (Amin, 20 Oct: a row of seven was a lot).
    const root = this.goalX - 40;
    for (let i = 0; i < found; i++) {
      const t = found === 1 ? 0.5 : i / (found - 1);
      const tilt = (t - 0.5) * 1.1;
      const long = 34 + Math.sin(t * Math.PI) * 22 + (i % 2) * 6;
      const stem = this.add.rectangle(root, GROUND_Y, 2.5, long, mixColour(look.prop, 0x6f9a5a, 0.6)).setOrigin(0.5, 1).setRotation(tilt).setDepth(DEPTH.front).setScale(1, 0);
      const tip = { x: root + Math.sin(tilt) * long, y: GROUND_Y - Math.cos(tilt) * long };
      const bloom = this.add.image(tip.x, tip.y, 'flower').setDisplaySize(22, 22).setTint(FLOWER_COLOURS[i % FLOWER_COLOURS.length]).setDepth(DEPTH.front + 0.01).setScale(0);
      const k = 22 / bloom.width;
      this.tweens.add({ targets: stem, scaleY: 1, duration: 420, delay: 200 + i * 90, ease: 'Sine.easeOut' });
      this.tweens.add({ targets: bloom, scale: k, angle: 72, duration: 520, delay: 420 + i * 90, ease: 'Back.easeOut' });
    }
    const glow = this.add.image(this.goalX, GROUND_Y - 60, 'glow').setDisplaySize(80, 80).setTint(look.light).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.glow);
    this.tweens.add({ targets: glow, alpha: 0.8, displayWidth: 1100, displayHeight: 900, duration: 1800, delay: 400, ease: 'Sine.easeOut' });
    // The world comes back to colour.
    const colour = { d: this.dryShown < 0 ? 1 : this.dryShown };
    this.tweens.add({ targets: colour, d: 0, duration: 1800, delay: 500, ease: 'Sine.easeInOut', onUpdate: () => this.applyDryness(colour.d) });
    this.music?.resolve();
    this.sfx.win();
    this.time.delayedCall(3200, () => {
      const next = afterGate({ ...this.carried(), planted: this.run.planted + 1 }, Math.round(this.goalX));
      this.atGate = false;
      this.leave(next, 0);
    });
  }

  /** The end of the run: he kneels at `x`, his head is buried with his flower, and the flower grows there. */
  private bury(at: number): void {
    const hero = this.hero;
    // He kneels still, on firm ground: not over a pit, not still flying back from the blow.
    const pit = pitAt(this.level, at);
    const x = pit ? (at - pit.x0 < pit.x1 - at ? pit.x0 - 40 : pit.x1 + 40) : at;
    hero.x = x;
    hero.vx = 0;
    hero.vy = 0;
    if (pit) hero.y = GROUND_Y;
    hero.knock(0);
    this.graveX = x;
    hero.kneel = true;
    this.time.delayedCall(ENDING.headOff * 1000, () => (hero.headless = true));
    this.time.delayedCall((ENDING.bloomAt + 0.5) * 1000, () => {
      this.petalBits.explode(18, hero.x, hero.y - 30);
      this.tweens.add({ targets: hero, fade: 0, duration: 1400, ease: 'Sine.easeIn' });
    });
    this.time.delayedCall(ENDING.bloomAt * 1000, () => this.level.lights.push({ kind: 'lamp', strong: true, x, y: GROUND_Y - 60, ...ENDING.bloomLight }));
    playWin(this, x, this.look, DEPTH, { ...hero.kneelingHead, facing: hero.facing, armed: this.look.hero.sword });
  }

  /** One short hint at a time, each once, when it is needed (coach.ts). */
  private coach(dt: number): void {
    this.runTime += dt;
    const hero = this.hero;
    const ahead = (x: number) => (x - hero.x) * hero.facing;
    const pitAhead = this.level.pits.some((pit) => ahead((pit.x0 + pit.x1) / 2) > 40 && ahead((pit.x0 + pit.x1) / 2) < 230);
    const spot = this.level.hideSpots.find((h) => hero.x > h.x0 - 60 && hero.x < h.x1 + 20);
    const alive = this.world.monsters.filter((m) => m.alive);
    const busy = this.bossHint?.visible === true;
    if (this.coachText?.visible && this.runTime > this.coachUntil) {
      this.tweens.add({ targets: this.coachText, alpha: 0, duration: 300, onComplete: () => this.coachText?.setVisible(false) });
      this.coachUntil = Infinity;
    }
    if (busy || (this.coachText?.visible && this.runTime < this.coachUntil)) return;
    const key = nextHint(
      {
        time: this.runTime,
        touch: this.sys.game.device.input.touch,
        armed: hero.armed && this.settings.weapon.kind !== 'none' && this.settings.twist !== 'no-sword',
        pitAhead,
        hideAhead: spot ? (isShelter(spot.kind) ? 'shelter' : 'grass') : undefined,
        lying: hero.lying,
        monsterNear: alive.some((m) => ahead(m.x) > -40 && ahead(m.x) < 380),
        seen: alive.some((m) => m.sees),
        beam: this.exposed,
        street: this.run.stage === 'road' && this.streets.some((x) => Math.abs(hero.x - x) < 90),
        back: this.run.stage === 'street' && this.backGate !== undefined && Math.abs(hero.x - this.backGate) < 90 && this.runTime > 2,
        canThrow: hero.canThrow,
        emptyThrow: hero.canThrow && hero.charges <= 0,
        weaponDown: this.thrown?.state === 'lie',
        empty: hero.events.empty,
        splashing: this.splashing,
      },
      this.coachShown,
    );
    if (!key) return;
    this.coachShown.add(key);
    this.coachText ??= this.add
      .text(0, VIEW_H - 64, '', {
        fontFamily: '"Instrument Sans", system-ui, sans-serif',
        fontSize: '16px',
        color: '#f4f4ee',
        backgroundColor: 'rgba(7,10,20,0.55)',
        padding: { x: 14, y: 8 },
      })
      .setOrigin(0.5, 0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH.hud);
    this.coachText.setText(hintLine(key, this.sys.game.device.input.touch)).setX(this.scale.width / 2).setAlpha(0).setVisible(true);
    this.tweens.add({ targets: this.coachText, alpha: 1, duration: 250 });
    this.coachUntil = this.runTime + (key === 'goal' ? 3.6 : 3);
  }

  /** A blow lands: the world stops for a moment, a spark flies where it hit, and the screen gives a small jolt. */
  private impact(monster: Monster, dir: number, stop: number): void {
    this.hitStop = Math.max(this.hitStop, stop);
    this.music?.duck();
    // Struck: it shows white for a moment (the shared grammar, signals.ts).
    const view = this.views.get(monster) as { flash?: () => void } | undefined;
    view?.flash?.();
    const x = monster.x - dir * 10;
    const y = monster.y - monster.spec.height * 0.55;
    const spark = this.add.image(x, y, 'glow').setDisplaySize(26, 26).setTint(0xffffff).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.front);
    this.tweens.add({ targets: spark, displayWidth: 110, displayHeight: 34, alpha: 0, duration: 200, ease: 'Cubic.easeOut', onComplete: () => spark.destroy() });
    // Dark bits, not petals: the only flowers in this world are the living ones (loop 8).
    this.puff.explode(5, x, y);
    this.cameras.main.shake(90, 0.0028);
  }

  private burst(monster: Monster): void {
    const x = monster.x;
    const y = monster.y - monster.spec.height / 2;
    this.defeated++;
    this.views.get(monster)?.destroy();
    this.views.delete(monster);
    this.puff.explode(this.sneak ? 34 : 24, x, y);
    // It breaks into shards of its own dark, which fall and fade (design research: freeze, flash, shards).
    const shard = mixColour(this.look.monster.body[0], this.look.monster.body[1], 0.5);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const piece = this.add.triangle(x, y, 0, 0, 6 + (i % 4) * 2, 1, 2, 5 + (i % 3) * 2, shard).setDepth(DEPTH.monster);
      const tx = x + Math.cos(a) * (30 + (i % 3) * 18);
      this.tweens.add({ targets: piece, x: tx, y: y + Math.sin(a) * 26 - 18, angle: (i - 5) * 70, duration: 240, ease: 'Sine.easeOut' });
      this.tweens.add({ targets: piece, y: GROUND_Y - 2, delay: 240, duration: 340, ease: 'Sine.easeIn' });
      this.tweens.add({ targets: piece, alpha: 0, delay: 900, duration: 500, onComplete: () => piece.destroy() });
    }
    // A ring of light that opens and is gone, and the ground gives a small jolt.
    const ring = this.add.circle(x, y, 14).setStrokeStyle(3, this.look.light, 0.9).setDepth(DEPTH.glow);
    this.tweens.add({ targets: ring, scale: 9, alpha: 0, duration: 460, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
    this.cameras.main.shake(130, 0.0035);
    // Only some monsters drop flowers, and fewer of them (DROPS). Every defeat earns XP.
    const drops = monster.boss !== undefined || this.burstRng() < (has(this.run, 'blooms') ? DROPS.chanceFertile : DROPS.chance);
    if (drops) this.blooms.push(...makeBurst(x, y, Math.max(1, Math.round(monster.spec.flowers * DROPS.share)), this.burstRng, FLOWER_COLOURS.length));
    this.earn(xpFor({ hits: monster.spec.hits, boss: monster.boss !== undefined, strong: monster.kind === 'watcher' || monster.also !== undefined, sneak: this.sneak }));
    this.sfx.bloom(this.sneak);
    const flash = this.add
      .image(x, y, 'glow')
      .setDisplaySize(90, 90)
      .setTint(this.look.light)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(DEPTH.glow);
    this.tweens.add({
      targets: flash,
      displayWidth: 520,
      displayHeight: 520,
      alpha: 0,
      duration: 520,
      onComplete: () => flash.destroy(),
    });
  }

  /** Something hit him. One petal goes, unless he is still safe from the last hit. */
  private loseHeart(): void {
    const before = this.health.petals;
    this.health = hurt(this.health);
    if (this.health.petals === before) return;
    const hero = this.hero;
    this.sfx.hurt();
    // Pushed away from what hurt him, so a bump does not leave him inside it (19 Oct, difficulty pass).
    const from = this.world.monsters.filter((m) => m.alive && Math.abs(m.x - hero.x) < 140).sort((a, b) => Math.abs(a.x - hero.x) - Math.abs(b.x - hero.x))[0];
    hero.knock(from ? (hero.x >= from.x ? 300 : -300) : -hero.facing * 300);
    this.cameras.main.shake(140, 0.008);
    // A hit can never go unnoticed: a short freeze, the screen's edges glow red, and the phone buzzes.
    this.hitStop = Math.max(this.hitStop, 0.08);
    this.music?.duck();
    this.flashHurt();
    buzz(BUZZ.hurt);
    // The petal drifts away from his flower.
    const petal = this.add.image(hero.x, hero.y - 104, 'hero-petal').setScale(0.6).setDepth(DEPTH.front);
    this.tweens.add({
      targets: petal,
      x: hero.x - hero.facing * 46,
      y: hero.y - 30,
      angle: 200,
      alpha: 0,
      duration: 900,
      ease: 'Sine.easeIn',
      onComplete: () => petal.destroy(),
    });
    if (this.health.petals <= 0) this.end('lost');
  }

  private collectFlowers(dt: number): void {
    const hero = this.hero;
    const picked = stepBlooms(this.blooms, dt, hero.x, hero.centreY, (x) => pitAt(this.level, x) !== undefined, (x) => groundAt(this.level, x));
    for (let i = 0; i < picked; i++) {
      const before = this.health.petals;
      this.health = collectFlower(this.health, this.flowersPerPetal);
      if (this.health.petals > before) this.sfx.petal();
      else this.sfx.pick(this.health.flowers);
    }
  }

  private playMonsterSounds(sounds: readonly string[]): void {
    for (const sound of sounds) {
      // Finding him, each monster speaks with its own voice (listenToMonsters); hearing him, a short note.
      if (sound === 'alert') continue;
      if (sound === 'heard') this.sfx.alert();
      else if (sound === 'spit') this.sfx.spit();
      else if (sound === 'gaze') this.sfx.gaze();
      else if (sound === 'tick') {
        const watcher = this.world.monsters.find((m) => m.alive && m.exposing);
        this.sfx.tick(watcher ? watcher.gaze / 5 : 0);
      } else this.sfx.rush();
    }
  }

  /** Draw the monsters, their shots and the fallen flowers. */
  private drawMonsters(dt: number): void {
    for (const [monster, view] of this.views) {
      view.draw(dt, lightLevelAt(monster.x, monster.y - 30, this.level.lights, LIGHT.ambient));
      // It has just noticed him (seen or heard): a ring of its eye-light opens from its head (loop 2).
      const hunting = monster.alive && monster.hunt > 0;
      if (hunting && !this.hunters.has(monster)) {
        const ring = this.add
          .circle(monster.x, monster.y - monster.spec.height * 0.75, 10)
          .setStrokeStyle(2, this.look.monster.eye, 0.9)
          .setDepth(DEPTH.monster + 0.1);
        this.tweens.add({ targets: ring, scale: 3.2, alpha: 0, duration: 520, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
      }
      if (hunting) this.hunters.add(monster);
      else this.hunters.delete(monster);
    }

    for (const shot of this.world.shots) {
      let views = this.shotViews.get(shot);
      if (!views) {
        // Whatever can hurt him is the one danger colour (signals.ts), so a shot reads at a glance in the dark.
        const tail = this.add.image(0, 0, 'glow').setTint(DANGER).setAlpha(0.45).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.monster);
        const glow = this.add.image(0, 0, 'glow').setDisplaySize(34, 34).setTint(DANGER).setAlpha(0.55).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.monster);
        const core = this.add.image(0, 0, 'mon-shot').setDisplaySize(16, 7).setTint(mixColour(DANGER, 0xffffff, 0.45)).setDepth(DEPTH.monster);
        views = [tail, glow, core];
        this.shotViews.set(shot, views);
      }
      const [tail, glow, core] = views;
      const angle = Math.atan2(shot.vy, shot.vx);
      const speed = Math.hypot(shot.vx, shot.vy);
      const length = Math.min(70, 14 + speed * 0.12);
      core.setPosition(shot.x, shot.y).setRotation(angle);
      glow.setPosition(shot.x, shot.y).setAlpha(0.45 + 0.15 * Math.sin(this.time.now * 0.03));
      tail
        .setPosition(shot.x - Math.cos(angle) * length * 0.5, shot.y - Math.sin(angle) * length * 0.5)
        .setRotation(angle)
        .setDisplaySize(length, 9);
    }
    for (const [shot, views] of this.shotViews) {
      if (shot.dead) {
        for (const view of views) view.destroy();
        this.shotViews.delete(shot);
      }
    }

    for (const bloom of this.blooms) {
      let view = this.bloomViews.get(bloom);
      if (!view) {
        // What a monster leaves: drops of water, glowing, that heal him (18 Oct: no more flowers on the ground;
        // the only flowers are the ten living ones of the story).
        const colour = WATER_COLOUR;
        const glow = this.add
          .image(0, 0, 'glow')
          .setDisplaySize(40, 40)
          .setTint(0x9fd8ff)
          .setAlpha(0.35)
          .setBlendMode(Phaser.BlendModes.ADD);
        const drop = this.add.image(0, 0, 'drop').setDisplaySize(8, 11).setTint(colour);
        const shine = this.add.image(-1.5, -1.5, 'mon-ball').setDisplaySize(2.5, 2.5).setTint(0xffffff);
        view = this.add.container(0, 0, [glow, drop, shine]).setDepth(DEPTH.front);
        this.bloomViews.set(bloom, view);
      }
      view.setPosition(bloom.x, bloom.y);
      if (!bloom.landed) view.rotation += dt * 3;
      else view.rotation = 0;
      view.setScale(Math.min(1, 0.3 + bloom.age * 3));
    }
    for (const [bloom, view] of this.bloomViews) {
      if (bloom.gone) {
        view.destroy();
        this.bloomViews.delete(bloom);
      }
    }
  }

  /** The run is over. Play its last moments, then tell the app. */
  private end(how: 'won' | 'lost'): void {
    this.ending = how;
    this.coachText?.setVisible(false);
    this.bossHint?.setVisible(false);
    this.finished = true;
    this.exposed = false;
    let wait: number;
    if (how === 'won' && this.settings.story === 'home') {
      // He walks home into the light, and lives.
      playHome(this, this.goalX, this.look, DEPTH);
      this.sfx.win();
      wait = ENDING.homeTime;
    } else if (how === 'won') {
      // The planted flower lights the place.
      // He kneels at the planting place. His head is taken off and buried, and his flower grows from it.
      const hero = this.hero;
      hero.kneel = true;
      this.time.delayedCall(ENDING.headOff * 1000, () => (hero.headless = true));
      // As the flower opens, what is left of him kneeling fades into a drift of petals: he has become the flower.
      this.time.delayedCall((ENDING.bloomAt + 0.5) * 1000, () => {
        this.petalBits.explode(18, hero.x, hero.y - 30);
        this.tweens.add({ targets: hero, fade: 0, duration: 1400, ease: 'Sine.easeIn' });
      });
      // The flower that grows there lights the place.
      this.time.delayedCall(ENDING.bloomAt * 1000, () =>
        this.level.lights.push({ kind: 'lamp', strong: true, x: this.goalX, y: GROUND_Y - 60, ...ENDING.bloomLight }),
      );
      playWin(this, this.goalX, this.look, DEPTH, { ...hero.kneelingHead, facing: hero.facing, armed: this.look.hero.sword });
      this.sfx.win();
      this.music?.resolve();
      wait = ENDING.winTime;
    } else if (this.previewAt === undefined) {
      // The run is over. He kneels where he fell; his head is buried with his flower, and it grows there.
      this.bury(this.hero.x);
      this.sfx.lose();
      this.music?.sink();
      // Time to see the flower open before the card comes.
      wait = ENDING.winTime + 2;
    } else {
      playLoss(this, DEPTH);
      this.sfx.lose();
      wait = ENDING.lossTime;
    }
    const finish: Finish = {
      won: how === 'won',
      petals: this.health.petals,
      defeated: this.run.defeated + this.defeated,
      chapter: this.run.chapter,
      flowers: this.foundCount(),
      distance: Math.round(this.run.distance + this.hero.x),
    };
    this.time.delayedCall(wait * 1000, () => this.game.events.emit(FINISHED, finish));
  }

  /** Sounds and splashes for what the hero just did. */
  private playEvents(): void {
    const hero = this.hero;
    const inWater = hero.onGround && waterAt(this.level, hero.x) !== undefined;
    if (hero.events.landed) {
      if (inWater) this.splash(1);
      else {
        this.sfx.land();
        // Sand kicks up where he lands (loop 5).
        this.sand.explode(10, hero.x, GROUND_Y - 2);
      }
    } else if (inWater && !this.wasInWater) {
      this.splash(0.7);
    } else if (hero.events.footstep) {
      if (inWater) this.splash(0.4);
      else {
        this.sfx.step();
        if (Math.abs(hero.vx) > 150) this.sand.explode(2, hero.x - hero.facing * 6, GROUND_Y - 2);
      }
    }
    if (hero.events.struck) this.sfx.swish();
    this.wasInWater = inWater;
  }

  /** Water thrown up at his feet. `size` 1 is a landing, 0.4 is one step. */
  private splash(size: number): void {
    const { x } = this.hero;
    this.sfx.splash(size);
    this.drops.explode(Math.round(6 + 16 * size), x, GROUND_Y + 2);
    const ring = this.add
      .ellipse(x, GROUND_Y + 6, 30, 6)
      .setStrokeStyle(2, WATER_COLOUR, 0.8)
      .setDepth(DEPTH.pool + 1);
    this.tweens.add({
      targets: ring,
      scaleX: 2 + 2.5 * size,
      scaleY: 1.6,
      alpha: 0,
      duration: 420,
      onComplete: () => ring.destroy(),
    });
  }

  /** Where the camera wants to be: the hero a little behind centre, looking ahead. */
  private cameraTarget(): number {
    const width = this.scale.width;
    // At the end the grave sits right of centre, clear of the end card on the left.
    const target = this.graveX !== undefined ? this.graveX - width * 0.64 : this.hero.x + this.hero.facing * 90 - width / 2;
    return Phaser.Math.Clamp(target, 0, Math.max(0, this.level.width - width));
  }

  // ---- feel (controls research, 19 Oct) --------------------------------------

  /** Dust and a buzz on landing, the touch marks, and how quickly he answered. */
  private feel(dt: number): void {
    const hero = this.hero;
    if (hero.events.landed && hero.landSpeed > 260) {
      this.landDust.explode(Math.round(Phaser.Math.Clamp(hero.landSpeed / 90, 3, 12)), hero.x, hero.y - 2);
      if (hero.landSpeed > 650) buzz(BUZZ.land);
    }
    if ((hero.events.struck || hero.events.thrown || hero.events.jumped) && this.controls.askedAt > 0) {
      const ms = performance.now() - this.controls.askedAt;
      if (ms < 600) this.answerMs = ms;
      this.controls.askedAt = 0;
    }
    this.drawTouchMarks(dt);
    this.talk.step(dt, false);
    this.bossFlow();
    this.listenToMonsters();
  }

  /** The music follows how aware the monsters are; each monster speaks as it finds him, from where it is. */
  private listenToMonsters(): void {
    let tension = 0;
    const cam = this.cameras.main;
    const middle = cam.scrollX + cam.width / 2;
    for (const m of this.world.monsters) {
      if (!m.alive) {
        this.voiced.delete(m);
        continue;
      }
      const has = m.sees || m.exposing || m.state === 'windup' || m.state === 'attack';
      if (has || this.bossStage === 'soldiers') tension = 1;
      else if (m.hunt > 0 || m.notice > 0.05) tension = Math.max(tension, 0.5);
      // The first of each kind on a stretch may taunt him as it first notices him (Amin, 20 Oct: sooner, never
      // after it is gone). Only on screen, and as a short held moment: the world waits while it speaks and he answers.
      const noticing = m.notice > 0.05 || has;
      const onScreen = m.x > cam.scrollX + 30 && m.x < cam.scrollX + cam.width - 30;
      if (noticing && onScreen && !m.boss && !this.soldiers.has(m) && !this.taunted.has(m.kind) && this.runTime - this.lastRemark > 9 && !this.ending && !this.talk.blocking) {
        this.taunted.add(m.kind);
        if (Math.random() < TALKING.taunt) this.tauntMoment(m);
      }
      if (has && !this.voiced.has(m)) {
        this.voiced.add(m);
        const voice: Voice = m.kind === 'crawler' ? 'charger' : m.kind === 'thorn' ? 'spitter' : m.kind === 'flyer' ? 'diver' : m.kind === 'stalker' ? 'stalker' : 'watcher';
        this.sfx.at((m.x - middle) / (cam.width / 2), () => this.sfx.voice(voice));
      } else if (!has && m.hunt <= 0) this.voiced.delete(m);
    }
    this.music?.setTension(this.ending ? 0 : tension);
  }

  /** A monster's taunt, and maybe his answer, while the world holds still for a moment. */
  private tauntMoment(m: Monster): void {
    this.lastRemark = this.runTime;
    const [them, him] = taunt(m.kind, this.run.chapter);
    const answers = Math.random() < TALKING.answer;
    const alive = () => m.alive;
    this.talk.remark('monster', them.text, () => ({ x: m.x, y: m.y - m.spec.height - 8 }), TALKING.line, 0, alive);
    if (answers) this.talk.remark('hero', him.text, () => ({ x: this.hero.x, y: this.hero.y - 118 }), TALKING.line, TALKING.line * 0.85, () => !this.ending);
    this.hitStop = Math.max(this.hitStop, TALKING.line * (answers ? 1.85 : 1));
  }

  private drawTouchMarks(_dt: number): void {
    const fade = this.runTime < 60 ? 1 : Math.max(0, 1 - (this.runTime - 60) / 15);
    if (fade <= 0 || !this.sys.game.device.input.touch) {
      this.touchMarks?.clear();
      return;
    }
    this.touchMarks ??= this.add.graphics().setScrollFactor(0).setDepth(DEPTH.hud - 1);
    const g = this.touchMarks;
    g.clear();
    const scale = this.scale.displayScale;
    for (const f of this.controls.fingers()) {
      const sx = f.startX * scale.x;
      const sy = f.startY * scale.y;
      const x = f.x * scale.x;
      const y = f.y * scale.y;
      g.lineStyle(2, 0xffffff, 0.28 * fade);
      g.strokeCircle(sx, sy, 26);
      if (f.action === 'jump' || f.action === 'lie') {
        // An arrow from where the finger landed to where it is: up jumps, down lies.
        const dir = f.action === 'jump' ? -1 : 1;
        g.lineStyle(3, 0xffffff, 0.4 * fade);
        g.lineBetween(sx, sy, sx, sy + dir * 44);
        g.fillStyle(0xffffff, 0.4 * fade);
        g.fillTriangle(sx - 8, sy + dir * 40, sx + 8, sy + dir * 40, sx, sy + dir * 54);
      } else {
        g.fillStyle(0xffffff, 0.16 * fade);
        g.fillCircle(x, y, 12);
      }
    }
  }

  /** The screen's edges glow red for a moment. */
  private flashHurt(): void {
    if (!this.textures.exists('hurt-edge')) {
      const t = this.textures.createCanvas('hurt-edge', 256, 144);
      if (t) {
        const ctx = t.getContext();
        const g = ctx.createRadialGradient(128, 72, 40, 128, 72, 150);
        g.addColorStop(0, 'rgba(255,77,46,0)');
        g.addColorStop(1, 'rgba(255,77,46,0.9)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 256, 144);
        t.refresh();
      }
    }
    this.hurtEdge ??= this.add.image(0, 0, 'hurt-edge').setOrigin(0).setScrollFactor(0).setDepth(DEPTH.hud - 2).setAlpha(0);
    this.hurtEdge.setDisplaySize(this.scale.width, this.scale.height);
    this.tweens.killTweensOf(this.hurtEdge);
    this.hurtEdge.setAlpha(0.6);
    this.tweens.add({ targets: this.hurtEdge, alpha: 0, duration: 420, ease: 'Sine.easeOut' });
  }

  // ---- debug readout --------------------------------------------------------

  private createDebug(): void {
    const style = { fontFamily: 'ui-monospace, Menlo, Consolas, monospace', fontSize: '12px', color: '#cfd4e6' };
    this.debugText = this.add
      .text(16, 96, '', { ...style, backgroundColor: 'rgba(7,10,20,0.6)', padding: { x: 8, y: 6 } })
      .setScrollFactor(0)
      .setDepth(DEPTH.hud)
      .setVisible(this.debugOn);
    this.input.keyboard?.on('keydown-Q', () => {
      this.debugOn = !this.debugOn;
      this.debugText.setVisible(this.debugOn);
    });
  }

  private layout(): void {
    this.minimap?.layout();
    this.moon.setX(this.scale.width * 0.56);
    this.moonHalo.setX(this.scale.width * 0.56);
  }

  // ---- drawing the level ----------------------------------------------------

  private drawBackdrop(): void {
    const look = this.look;
    // Sky: darkest at the top, paler at the horizon, as on the board.
    this.add
      .image(0, 0, skyTexture(this, toHex(look.skyTop), toHex(look.far), toHex(look.horizon)))
      .setOrigin(0, 0)
      .setDisplaySize(MAX_VIEW_W, GROUND_Y + 10)
      .setScrollFactor(0)
      .setDepth(DEPTH.sky);
    // Stars, faint and few, only in the upper sky; some breathe.
    const starRng = makeRng(this.level.seed ^ 0x57a2);
    for (let i = 0; i < 46; i++) {
      const star = this.add
        .circle(starRng() * MAX_VIEW_W, 8 + Math.pow(starRng(), 1.6) * 170, 0.6 + starRng() * 0.9, look.moon, 0.25 + starRng() * 0.5)
        .setScrollFactor(0.02, 0)
        .setDepth(DEPTH.sky);
      if (starRng() < 0.35) this.tweens.add({ targets: star, alpha: 0.08, duration: 1200 + starRng() * 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    // The moon, with a soft halo of light around it.
    this.moonHalo = this.add
      .image(0, 62, 'glow')
      .setDisplaySize(190, 190)
      .setTint(look.moon)
      .setAlpha(0.22)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScrollFactor(0)
      .setDepth(DEPTH.moon);
    this.moon = this.add.circle(0, 62, 20, look.moon, 0.85).setScrollFactor(0).setDepth(DEPTH.moon);

    // The scenery the settings name: mountains, trees, buildings and so on, from our own library.
    drawScenery(this, this.level.seed, this.settings.scenery, this.level.width, look, { back: DEPTH.hills, road: DEPTH.props - 0.1 });
  }

  /** The air itself: a low mist along the ground, fine grain over everything, and darker corners. */
  private drawAtmosphere(): void {
    const look = this.look;
    if (!this.textures.exists('mist')) {
      const t = this.textures.createCanvas('mist', 512, 64);
      if (t) {
        const ctx = t.getContext();
        const rng = makeRng(0x1157);
        for (let i = 0; i < 26; i++) {
          const x = rng() * 512;
          const y = 26 + rng() * 12;
          const r = 22 + rng() * 26;
          for (const dx of [-512, 0, 512]) {
            const g = ctx.createRadialGradient(x + dx, y, 0, x + dx, y, r);
            g.addColorStop(0, 'rgba(255,255,255,0.35)');
            g.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = g;
            ctx.fillRect(x + dx - r, y - r, r * 2, r * 2);
          }
        }
        // Fade the whole strip out at its top and bottom, so it never shows an edge.
        ctx.globalCompositeOperation = 'destination-in';
        const fade = ctx.createLinearGradient(0, 0, 0, 64);
        fade.addColorStop(0, 'rgba(0,0,0,0)');
        fade.addColorStop(0.5, 'rgba(0,0,0,1)');
        fade.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = fade;
        ctx.fillRect(0, 0, 512, 64);
        ctx.globalCompositeOperation = 'source-over';
        t.refresh();
      }
      const n = this.textures.createCanvas('grain', 128, 128);
      if (n) {
        const ctx = n.getContext();
        const data = ctx.createImageData(128, 128);
        for (let i = 0; i < data.data.length; i += 4) {
          const v = Math.random() * 255;
          data.data[i] = v; data.data[i + 1] = v; data.data[i + 2] = v; data.data[i + 3] = 255;
        }
        ctx.putImageData(data, 0, 0);
        n.refresh();
      }
    }
    this.mist = this.add
      .tileSprite(0, GROUND_Y - 34, MAX_VIEW_W, 64, 'mist')
      .setOrigin(0, 0)
      .setTint(mixColour(look.horizon, look.light, 0.15))
      .setAlpha(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH.front);
    this.grain = this.add
      .tileSprite(0, 0, MAX_VIEW_W, VIEW_H, 'grain')
      .setOrigin(0, 0)
      .setAlpha(0.045)
      .setScrollFactor(0)
      .setDepth(DEPTH.hud - 1);
    this.cameras.main.postFX?.addVignette(0.5, 0.5, 0.92, 0.28);
  }

  /** Fog, rain, snow or falling petals. Only for show: it changes nothing about who sees whom. */
  private drawWeather(): void {
    const weather = this.settings.weather;
    const look = this.look;
    // Dust in the air, in every weather: slow specks that catch the light.
    this.add
      .particles(0, 0, 'drop', {
        x: { min: -40, max: MAX_VIEW_W + 40 },
        y: { min: 40, max: GROUND_Y - 10 },
        speedX: { min: -14, max: -4 },
        speedY: { min: -6, max: 6 },
        scale: { min: 0.12, max: 0.3 },
        alpha: { start: 0, end: 0.55, ease: 'Sine.easeInOut' },
        lifespan: { min: 3500, max: 6500 },
        frequency: 260,
        tint: look.light,
        blendMode: Phaser.BlendModes.ADD,
      })
      .setScrollFactor(0)
      .setDepth(DEPTH.front);
    if (weather === 'none') return;
    if (weather === 'fog') {
      const rng = makeRng(this.level.seed ^ 0xf09);
      for (let x = -200; x < this.level.width * 0.7 + MAX_VIEW_W; x += 420) {
        const bank = this.add
          .image(x, GROUND_Y - 30 - rng() * 50, 'glow')
          .setDisplaySize(760 + rng() * 300, 150 + rng() * 80)
          .setTint(mixColour(look.mid, look.light, 0.35))
          .setAlpha(0.2 + rng() * 0.12)
          .setScrollFactor(0.7, 0)
          .setDepth(DEPTH.front);
        this.tweens.add({ targets: bank, x: x + 90, duration: 7000 + rng() * 5000, ease: 'Sine.easeInOut', yoyo: true, repeat: -1 });
      }
      return;
    }
    const across = { min: -40, max: MAX_VIEW_W + 260 };
    const falling =
      weather === 'rain'
        ? { key: 'drop', speedY: { min: 520, max: 640 }, speedX: -150, scaleX: 0.14, scaleY: 1.5, lifespan: 900, frequency: 16, quantity: 2, alpha: 0.5, tint: mixColour(look.light, 0xcfdcff, 0.6) }
        : weather === 'snow'
          ? { key: 'drop', speedY: { min: 50, max: 110 }, speedX: { min: -30, max: 20 }, scale: { min: 0.3, max: 0.6 }, lifespan: 6000, frequency: 80, quantity: 1, alpha: 0.8, tint: 0xffffff }
          : { key: 'hero-petal', speedY: { min: 45, max: 90 }, speedX: { min: -50, max: 10 }, scale: { min: 0.5, max: 0.9 }, lifespan: 6500, frequency: 150, quantity: 1, alpha: 0.85, tint: FLOWER_COLOURS, rotate: { min: 0, max: 360 } };
    const { key, ...config } = falling;
    this.add
      .particles(0, 0, key, { x: across, y: -12, ...config })
      .setScrollFactor(0)
      .setDepth(DEPTH.front);
  }

  private drawGround(): void {
    const look = this.look;
    const ground = this.add.graphics().setDepth(DEPTH.ground);
    const edges = [-2000, ...this.level.pits.flatMap((pit) => [pit.x0, pit.x1]), this.level.width + 2000];
    // The earth: a little lighter just under its edge, sinking into darkness further down.
    const top = mixColour(look.stage, look.mid, 0.3);
    const deep = mixColour(look.stage, 0x000000, 0.45);
    for (let i = 0; i < edges.length; i += 2) {
      const x0 = edges[i];
      const x1 = edges[i + 1];
      ground.fillStyle(look.stage, 1);
      ground.fillRect(x0, GROUND_Y, x1 - x0, VIEW_H - GROUND_Y + 400);
      ground.fillGradientStyle(top, top, deep, deep, 1, 1, 1, 1);
      ground.fillRect(x0, GROUND_Y, x1 - x0, VIEW_H - GROUND_Y);
    }

    // The mounds (level.ts): the same earth, risen, with its top a little lighter where it meets the sky.
    const gy = (x: number) => groundAt(this.level, x);
    for (const mound of this.level.mounds) {
      const points: Phaser.Types.Math.Vector2Like[] = [{ x: mound.x0, y: GROUND_Y + 2 }];
      for (let x = mound.x0; x <= mound.x1; x += 6) points.push({ x, y: gy(x) });
      points.push({ x: mound.x1, y: GROUND_Y + 2 });
      ground.fillStyle(mixColour(look.stage, look.mid, 0.22), 1);
      ground.fillPoints(points, true);
      const band = points.slice(1, -1).map((p) => ({ x: p.x, y: p.y + 10 }));
      ground.fillStyle(mixColour(look.stage, look.mid, 0.12), 1);
      ground.fillPoints([{ x: mound.x0, y: GROUND_Y + 2 }, ...band, { x: mound.x1, y: GROUND_Y + 2 }], true);
    }

    // How much light reaches a point of the path, so the edge and the flowers can answer it.
    const lights = this.level.lights;
    const lit = (x: number) =>
      Math.min(1, lights.reduce((sum, l) => sum + l.strength * Math.max(0, 1 - Math.abs(l.x - x) / (l.radius * 1.1)), 0));
    const inPit = (x: number, pad: number) => this.level.pits.some((pit) => x > pit.x0 - pad && x < pit.x1 + pad);

    // The edge of the path catches the light: a thin rim, brighter near every lamp.
    const rimDark = mixColour(look.stage, look.mid, 0.75);
    for (let x = -200; x < this.level.width + 400; x += 8) {
      if (inPit(x, 0)) continue;
      const amount = lit(x);
      ground.fillStyle(mixColour(rimDark, look.light, amount * 0.8), 0.55 + amount * 0.45);
      ground.fillRect(x, gy(x + 4), 8, 1.5 + amount * 1.5);
    }

    // Grass along the edge, in clumps, and the small pale flowers of the road:
    // open where light reaches them, closed in the dark, like the one on his head.
    const blades = this.add.graphics().setDepth(DEPTH.ground);
    const flowers = this.add.graphics().setDepth(DEPTH.ground);
    const rng = makeRng(this.level.seed ^ 0x6a11);
    const grass = mixColour(look.stage, look.far, 0.25);
    for (let x = -200; x < this.level.width + 400; x += 14 + rng() * 46) {
      if (inPit(x, 14)) continue;
      const clump = 2 + Math.floor(rng() * 4);
      blades.fillStyle(grass, 1);
      for (let b = 0; b < clump; b++) {
        const bx = x + b * 3.2 + rng() * 2;
        const h = 5 + rng() * 13;
        const lean = (rng() - 0.35) * 7;
        const by = gy(bx);
        blades.fillTriangle(bx - 1.4, by + 1, bx + 1.4, by + 1, bx + lean, by - h);
      }
      if (rng() < 0.22) {
        // A dry twig (18 Oct: the only flowers in this world are the ten living ones he looks for).
        const fx = x + clump * 3 + 4;
        const h = 8 + rng() * 10;
        const lean = (rng() - 0.5) * 6;
        flowers.lineStyle(1.2, grass, 1);
        const fy = gy(fx);
        flowers.lineBetween(fx, fy, fx + lean, fy - h);
        flowers.lineBetween(fx + lean * 0.6, fy - h * 0.6, fx + lean * 0.6 + 3.5, fy - h * 0.85);
        flowers.lineBetween(fx + lean * 0.4, fy - h * 0.4, fx + lean * 0.4 - 3, fy - h * 0.6);
      }
    }
    // A few stones half sunk in the earth.
    for (let x = 60; x < this.level.width; x += 160 + rng() * 260) {
      if (inPit(x, 20)) continue;
      ground.fillStyle(mixColour(look.stage, look.mid, 0.18), 1);
      ground.fillEllipse(x, GROUND_Y + 10 + rng() * 26, 10 + rng() * 16, 4 + rng() * 4);
    }
    // The inside of a pit is darker than the sky behind it.
    const pits = this.add.graphics().setDepth(DEPTH.hills + 0.5);
    pits.fillStyle(look.pit, 1);
    for (const pit of this.level.pits) pits.fillRect(pit.x0, GROUND_Y, pit.x1 - pit.x0, 500);
  }

  /** A shallow pool on the ground. With a water light it also holds the moon (see drawLight). */
  /** Water in one of four kinds: still pond, running stream, puddles, or marsh with reeds. */
  private drawPool(water: Water): void {
    const kind = waterKind(this.level, water);
    if (kind === 'stream') return this.drawStream(water);
    if (kind === 'puddles') return this.drawPuddles(water);
    if (kind === 'marsh') return this.drawMarsh(water);
    // Still water that holds a piece of the night sky: darker below, a pale lip where it meets the earth,
    // and slow ripples crossing it.
    const look = this.look;
    const centre = (water.x0 + water.x1) / 2;
    const width = water.x1 - water.x0;
    const sky = mixColour(look.far, look.horizon, 0.45);
    const pool = this.add.graphics().setDepth(DEPTH.pool);
    pool.fillStyle(mixColour(look.stage, sky, 0.55), 1);
    pool.fillEllipse(centre, GROUND_Y + 6, width, 13);
    pool.fillStyle(mixColour(look.stage, sky, 0.85), 1);
    pool.fillEllipse(centre, GROUND_Y + 4.5, width * 0.94, 7);
    pool.lineStyle(1, mixColour(sky, look.light, 0.4), 0.55);
    pool.strokeEllipse(centre, GROUND_Y + 6, width, 13);
    const rng = makeRng(this.level.seed ^ Math.round(water.x0) ^ 0x7a7e);
    for (let i = 0; i < 6; i++) {
      const x = water.x0 + width * (0.12 + rng() * 0.7);
      const ripple = this.add.rectangle(x, GROUND_Y + 3 + rng() * 6, 10 + rng() * 26, 1, look.moon, 0.22).setDepth(DEPTH.pool);
      this.tweens.add({ targets: ripple, x: x + 14 + rng() * 10, alpha: 0.04, duration: 1600 + rng() * 1600, ease: 'Sine.easeInOut', yoyo: true, repeat: -1 });
    }
  }

  /** A running stream: a long low band, its current drawn as pale streaks always moving one way, stones on its banks. */
  private drawStream(water: Water): void {
    const look = this.look;
    const width = water.x1 - water.x0;
    const centre = (water.x0 + water.x1) / 2;
    const sky = mixColour(look.far, look.horizon, 0.5);
    const g = this.add.graphics().setDepth(DEPTH.pool);
    g.fillStyle(mixColour(look.stage, sky, 0.5), 1);
    g.fillRect(water.x0, GROUND_Y, width, 9);
    g.fillEllipse(water.x0, GROUND_Y + 4.5, 18, 9);
    g.fillEllipse(water.x1, GROUND_Y + 4.5, 18, 9);
    g.fillStyle(mixColour(look.stage, sky, 0.8), 1);
    g.fillRect(water.x0 + 4, GROUND_Y + 1.5, width - 8, 3);
    // Stones on the banks.
    const rng = makeRng(this.level.seed ^ Math.round(water.x0) ^ 0x57e4);
    g.fillStyle(look.prop, 1);
    for (const x of [water.x0 - 6, water.x0 + 8, water.x1 - 10, water.x1 + 4]) g.fillEllipse(x, GROUND_Y + 1, 10 + rng() * 8, 6 + rng() * 3);
    // The current: streaks that run along and come round again.
    const dir = rng() < 0.5 ? 1 : -1;
    for (let i = 0; i < Math.max(5, Math.round(width / 40)); i++) {
      const y = GROUND_Y + 2 + rng() * 5;
      const length = 8 + rng() * 18;
      const streak = this.add.rectangle(0, y, length, 1, look.moon, 0.3 + rng() * 0.2).setDepth(DEPTH.pool);
      const run = () => {
        streak.x = dir > 0 ? water.x0 + 6 : water.x1 - 6;
        this.tweens.add({ targets: streak, x: dir > 0 ? water.x1 - 6 : water.x0 + 6, duration: (width / (70 + rng() * 40)) * 1000, ease: 'Linear', onComplete: run });
      };
      streak.x = water.x0 + 6 + rng() * (width - 12);
      this.tweens.add({ targets: streak, x: dir > 0 ? water.x1 - 6 : water.x0 + 6, duration: (Math.abs((dir > 0 ? water.x1 : water.x0) - streak.x) / 90) * 1000, ease: 'Linear', onComplete: run });
    }
    const shine = this.add.image(centre, GROUND_Y + 3, 'glow').setDisplaySize(width, 16).setTint(sky).setAlpha(0.18).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.pool);
    this.tweens.add({ targets: shine, alpha: 0.08, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  /** Puddles: a few small pools with drops falling into them now and then. */
  private drawPuddles(water: Water): void {
    const look = this.look;
    const sky = mixColour(look.far, look.horizon, 0.45);
    const rng = makeRng(this.level.seed ^ Math.round(water.x0) ^ 0x9dd1);
    const g = this.add.graphics().setDepth(DEPTH.pool);
    const width = water.x1 - water.x0;
    const n = Math.max(2, Math.round(width / 90));
    for (let i = 0; i < n; i++) {
      const w = 34 + rng() * 40;
      const x = water.x0 + (width / n) * (i + 0.5) + (rng() - 0.5) * 20;
      g.fillStyle(mixColour(look.stage, sky, 0.6), 1);
      g.fillEllipse(x, GROUND_Y + 3, w, 7);
      g.fillStyle(mixColour(look.stage, sky, 0.9), 1);
      g.fillEllipse(x - w * 0.12, GROUND_Y + 2.4, w * 0.5, 2.4);
      // A drop lands, and its ring opens and fades.
      const ring = this.add.ellipse(x + (rng() - 0.5) * w * 0.5, GROUND_Y + 3, 4, 1.6).setStrokeStyle(1, look.moon, 0.7).setDepth(DEPTH.pool);
      ring.setScale(0);
      this.tweens.add({ targets: ring, scale: 5, alpha: { from: 0.8, to: 0 }, duration: 900, delay: 400 + rng() * 2400, repeat: -1, repeatDelay: 1200 + rng() * 2600, ease: 'Cubic.easeOut' });
    }
  }

  /** Marsh: dark still water, reeds with brown heads that sway, and floating lily pads. */
  private drawMarsh(water: Water): void {
    const look = this.look;
    const width = water.x1 - water.x0;
    const centre = (water.x0 + water.x1) / 2;
    const rng = makeRng(this.level.seed ^ Math.round(water.x0) ^ 0x3a45);
    const g = this.add.graphics().setDepth(DEPTH.pool);
    const murk = mixColour(look.stage, look.mid, 0.35);
    g.fillStyle(murk, 1);
    g.fillEllipse(centre, GROUND_Y + 6, width, 13);
    g.fillStyle(mixColour(murk, look.horizon, 0.25), 1);
    g.fillEllipse(centre, GROUND_Y + 4.5, width * 0.9, 6);
    // Lily pads, each a disc with a notch, drifting a little.
    for (let i = 0; i < Math.max(2, Math.round(width / 70)); i++) {
      const x = water.x0 + 20 + rng() * (width - 40);
      const pad = this.add.graphics().setDepth(DEPTH.pool).setPosition(x, GROUND_Y + 3.5);
      pad.fillStyle(mixColour(look.prop, look.mid, 0.5), 1);
      pad.slice(0, 0, 7 + rng() * 3, 0.35, Math.PI * 2 - 0.1, false);
      pad.fillPath();
      pad.setScale(1, 0.32);
      this.tweens.add({ targets: pad, x: x + (rng() - 0.5) * 12, duration: 3000 + rng() * 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    // Reeds, in front of the water, swaying from their roots.
    for (let i = 0; i < Math.max(6, Math.round(width / 22)); i++) {
      const x = water.x0 + rng() * width;
      const h = 26 + rng() * 34;
      const reed = this.add.graphics().setDepth(DEPTH.props + 0.1).setPosition(x, GROUND_Y + 3);
      reed.lineStyle(1.6, look.prop, 1);
      reed.lineBetween(0, 0, 0, -h);
      if (rng() < 0.55) {
        reed.fillStyle(mixColour(look.prop, 0x6b4a2e, 0.5), 1);
        reed.fillRoundedRect(-2, -h - 2, 4, 11, 2);
      }
      reed.rotation = (rng() - 0.5) * 0.12;
      this.tweens.add({ targets: reed, rotation: reed.rotation + 0.09, duration: 1400 + rng() * 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
  }

  private drawLight(light: LevelLight): void {
    const look = this.look;
    const colour = light.kind === 'water' ? mixColour(0xc9d6ff, look.light, 0.25) : look.light;
    // The glow in the air. It breathes a little, as a flame or a swarm does.
    const air = this.add
      .image(light.x, light.y, 'glow')
      .setDisplaySize(light.radius * 2, light.radius * 2)
      .setTint(colour)
      .setAlpha(light.strength * 0.6)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(DEPTH.glow);
    this.tweens.add({ targets: air, alpha: light.strength * 0.5, duration: 900 + (Math.abs(light.x) % 700), ease: 'Sine.easeInOut', yoyo: true, repeat: -1 });

    if (light.kind === 'water') {
      // The moon in the pool: a short column of broken light, never quite still.
      const widths = [30, 22, 26, 14, 18, 8];
      widths.forEach((w, i) => {
        const piece = this.add
          .rectangle(light.x + 12 + (i % 2 ? 3 : -3), GROUND_Y + 1.5 + i * 1.8, w, 1.3, look.moon, 0.85 - i * 0.11)
          .setDepth(DEPTH.pool)
          .setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({ targets: piece, scaleX: 0.55, x: piece.x + (i % 2 ? -5 : 5), duration: 700 + i * 190, ease: 'Sine.easeInOut', yoyo: true, repeat: -1 });
      });
      // The light the water throws back up, soft and cool.
      this.add
        .image(light.x, GROUND_Y + 4, 'glow')
        .setDisplaySize(260, 40)
        .setTint(colour)
        .setAlpha(0.35)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(DEPTH.pool);
      return;
    }

    // The pool of light on the ground under it.
    this.add
      .image(light.x, GROUND_Y + 20, 'glow')
      .setDisplaySize(light.radius * 1.5, 56)
      .setTint(colour)
      .setAlpha(light.strength * 0.4)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(DEPTH.pool);

    if (light.kind === 'fireflies') this.drawFireflies(light);
    else if (light.kind === 'mirror') this.drawMirror(light);
    else this.drawLamp(light);
  }

  private drawLamp(light: LevelLight): void {
    const post = this.add.graphics().setDepth(DEPTH.props);
    post.fillStyle(this.look.prop, 1);
    post.fillRect(light.x - 3, light.y - 6, 6, GROUND_Y - light.y + 6);
    post.fillRect(light.x - 16, light.y - 14, 32, 8);
    post.fillRect(light.x - 9, GROUND_Y - 8, 18, 8);
    post.fillStyle(this.look.light, light.strong ? 1 : 0.6);
    post.fillCircle(light.x, light.y, light.strong ? 8 : 5);
    // The light falling from the lamp to the ground, widest where it lands.
    const fall = this.add.graphics().setDepth(DEPTH.glow).setBlendMode(Phaser.BlendModes.ADD);
    const c = this.look.light;
    const a = light.strong ? 0.2 : 0.11;
    const spread = light.strong ? 120 : 80;
    fall.fillGradientStyle(c, c, c, c, a, a, 0, 0);
    fall.fillTriangle(light.x - 7, light.y + 4, light.x + 7, light.y + 4, light.x - spread, GROUND_Y);
    fall.fillGradientStyle(c, c, c, c, a, 0, 0, 0);
    fall.fillTriangle(light.x + 7, light.y + 4, light.x + spread, GROUND_Y, light.x - spread, GROUND_Y);
    this.tweens.add({ targets: fall, alpha: 0.82, duration: 140 + (Math.abs(light.x) % 90), yoyo: true, repeat: -1, repeatDelay: 1800 + (Math.abs(light.x) % 2400) });
  }

  /** A swarm of small lights that drift around one spot. */
  private drawFireflies(light: LevelLight): void {
    const rng = makeRng(this.level.seed ^ Math.round(light.x) ^ 0xf1f1);
    const count = light.strong ? 16 : 9;
    const spread = light.strong ? 130 : 85;
    for (let i = 0; i < count; i++) {
      const x = light.x + (rng() - 0.5) * 2 * spread;
      const y = light.y + (rng() - 0.5) * 110;
      const fly = this.add
        .image(x, y, 'drop')
        .setScale(0.45 + rng() * 0.35)
        .setTint(this.look.accent)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(DEPTH.props);
      this.tweens.add({
        targets: fly,
        x: x + (rng() - 0.5) * 70,
        y: y + (rng() - 0.5) * 50,
        alpha: 0.25 + rng() * 0.3,
        duration: 1400 + rng() * 1800,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1,
        delay: rng() * 900,
      });
    }
  }

  /** A mirror on a post that throws the moonlight down onto the path. */
  private drawMirror(light: LevelLight): void {
    const look = this.look;
    const beam = this.add.graphics().setDepth(DEPTH.glow).setBlendMode(Phaser.BlendModes.ADD);
    // The thrown light starts bright at the glass and spreads and fades toward the ground.
    const c = mixColour(look.light, 0xdbe6ff, 0.5);
    const a = 0.12 * light.strength + 0.06;
    beam.fillGradientStyle(c, c, c, c, a, 0.01, 0.01, 0);
    beam.fillTriangle(light.x, light.y, light.x - 130, GROUND_Y, light.x + 130, GROUND_Y);
    const spot = this.add.image(light.x, GROUND_Y + 3, 'glow').setDisplaySize(230, 22).setTint(c).setAlpha(0.45).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.pool);
    this.tweens.add({ targets: spot, alpha: 0.3, duration: 1700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const size = light.strong ? 30 : 22;
    const quad = (grow: number) =>
      [
        [-0.5 * grow, -0.9 * grow],
        [0.62 * grow, -0.5 * grow],
        [0.5 * grow, 0.5 * grow],
        [-0.62 * grow, 0.1 * grow],
      ].map(([dx, dy]) => new Phaser.Math.Vector2(light.x + dx * size, light.y - 6 + dy * size));
    const post = this.add.graphics().setDepth(DEPTH.props);
    post.fillStyle(look.prop, 1);
    post.fillRect(light.x - 3, light.y, 6, GROUND_Y - light.y);
    post.fillRect(light.x - 9, GROUND_Y - 8, 18, 8);
    post.fillPoints(quad(1.25), true);
    // The glass holds the sky: dark at the top, pale where it catches the moon, with one bright streak.
    post.fillStyle(mixColour(look.far, look.horizon, 0.6), 1);
    post.fillPoints(quad(1), true);
    post.fillStyle(mixColour(look.horizon, look.moon, 0.6), 0.85);
    post.fillPoints(quad(0.62), true);
    const q = quad(1);
    post.lineStyle(2, look.moon, 0.9);
    post.lineBetween(q[0].x + (q[1].x - q[0].x) * 0.25, q[0].y + (q[1].y - q[0].y) * 0.25, q[3].x + (q[2].x - q[3].x) * 0.55, q[3].y + (q[2].y - q[3].y) * 0.55);
  }

  /** How much light reaches a point of the road, and from which side the strongest comes. */
  private lightNear(x: number): { amount: number; dir: 1 | -1 } {
    let amount = 0;
    let best = 0;
    let dir: 1 | -1 = 1;
    for (const l of this.level.lights) {
      const reach = l.strength * Math.max(0, 1 - Math.abs(l.x - x) / (l.radius * 1.3));
      amount += reach;
      if (reach > best) {
        best = reach;
        dir = l.x >= x ? 1 : -1;
      }
    }
    return { amount: Math.min(1, amount), dir };
  }

  private drawHideSpot(spot: HideSpot): void {
    const rng = makeRng(this.level.seed ^ Math.round(spot.x0));
    const { x0, x1 } = spot;
    const g = GROUND_Y;

    if (spot.kind === 'rock') {
      const rock = this.add.graphics().setDepth(DEPTH.props);
      rock.fillStyle(this.look.prop, 1);
      const w = x1 - x0;
      rock.fillPoints(
        [
          new Phaser.Math.Vector2(x0, g),
          new Phaser.Math.Vector2(x0 + w * 0.08, g - 42),
          new Phaser.Math.Vector2(x0 + w * 0.34, g - 74),
          new Phaser.Math.Vector2(x0 + w * 0.7, g - 64),
          new Phaser.Math.Vector2(x0 + w * 0.94, g - 30),
          new Phaser.Math.Vector2(x1, g),
        ],
        true,
      );
      // The face toward the nearest light, and a crack.
      const { amount, dir } = this.lightNear((x0 + x1) / 2);
      if (amount > 0.05) {
        rock.fillStyle(this.look.light, 0.08 + amount * 0.3);
        const crest = dir > 0 ? [x0 + w * 0.34, g - 74, x0 + w * 0.7, g - 64, x0 + w * 0.94, g - 30] : [x0 + w * 0.34, g - 74, x0 + w * 0.08, g - 42, x0, g];
        rock.fillTriangle(crest[0], crest[1], crest[2], crest[3], crest[4], crest[5]);
      }
      rock.lineStyle(1.2, mixColour(this.look.prop, this.look.mid, 0.5), 0.8);
      rock.lineBetween(x0 + w * 0.4, g - 66, x0 + w * 0.48, g - 40);
      rock.lineBetween(x0 + w * 0.48, g - 40, x0 + w * 0.44, g - 22);
    } else if (spot.kind === 'crate') {
      const crate = this.add.graphics().setDepth(DEPTH.props);
      const w = x1 - x0;
      crate.fillStyle(this.look.prop, 1);
      crate.fillRect(x0 + 4, g - 54, w - 8, 54);
      crate.fillRect(x0 + w * 0.3, g - 86, w * 0.5, 32);
      // Planks, a shade lighter.
      crate.fillStyle(this.look.mid, 0.5);
      crate.fillRect(x0 + 4, g - 54, w - 8, 2);
      crate.fillRect(x0 + 4, g - 28, w - 8, 2);
      crate.fillRect(x0 + w * 0.3, g - 86, w * 0.5, 2);
    } else if (spot.kind === 'arch') {
      // An archway he can walk through. Its roof hides him from above.
      const arch = this.add.graphics().setDepth(DEPTH.props);
      arch.fillStyle(this.look.prop, 1);
      arch.fillRect(x0, g - 150, 20, 150);
      arch.fillRect(x1 - 20, g - 150, 20, 150);
      arch.fillRect(x0 - 10, g - 178, x1 - x0 + 20, 30);
      arch.fillTriangle(x0 + 20, g - 148, x0 + 52, g - 148, x0 + 20, g - 112);
      arch.fillTriangle(x1 - 20, g - 148, x1 - 52, g - 148, x1 - 20, g - 112);
      // The shadow under it.
      arch.fillStyle(this.look.stage, 0.45);
      arch.fillRect(x0 + 20, g - 148, x1 - x0 - 40, 148);
    } else if (spot.kind === 'bush') {
      // A bush: round clumps, some behind him and some in front.
      const back = this.add.graphics().setDepth(DEPTH.props);
      const front = this.add.graphics().setDepth(DEPTH.front);
      back.fillStyle(this.look.prop, 1);
      front.fillStyle(this.look.stage, 1);
      for (let x = x0 + 12; x < x1 - 6; x += 20) {
        back.fillCircle(x, g - 30 - rng() * 14, 22 + rng() * 8);
        front.fillCircle(x + 6, g - 8 - rng() * 8, 18 + rng() * 6);
      }
    } else if (spot.kind === 'pillar') {
      // A stone column of a fallen place: plinth, a shaft that narrows a little, a capital,
      // and sometimes a broken top. The side that faces the nearest light catches it.
      const centre = (x0 + x1) / 2;
      const pillar = this.add.graphics().setDepth(DEPTH.props);
      const broken = rng() < 0.4;
      const top = g - (broken ? 190 + rng() * 40 : 250 + rng() * 30);
      const stone = this.look.prop;
      pillar.fillStyle(stone, 1);
      pillar.fillRect(centre - 38, g - 14, 76, 14);
      pillar.fillRect(centre - 32, g - 24, 64, 10);
      pillar.fillPoints([
        new Phaser.Math.Vector2(centre - 26, g - 24),
        new Phaser.Math.Vector2(centre - 22, top + 18),
        new Phaser.Math.Vector2(centre + 22, top + 18),
        new Phaser.Math.Vector2(centre + 26, g - 24),
      ], true);
      if (broken) {
        pillar.fillTriangle(centre - 22, top + 18, centre + 4, top + 18, centre - 14, top - 6);
        pillar.fillTriangle(centre - 2, top + 18, centre + 22, top + 18, centre + 16, top + 4);
      } else {
        pillar.fillRect(centre - 30, top + 8, 60, 10);
        pillar.fillRect(centre - 36, top, 72, 9);
      }
      // Flutes down the shaft, a shade lighter.
      pillar.fillStyle(mixColour(stone, this.look.mid, 0.35), 0.5);
      for (let f = -14; f <= 14; f += 9) pillar.fillRect(centre + f - 0.6, top + 22, 1.2, g - 26 - (top + 22));
      const { amount, dir } = this.lightNear(centre);
      if (amount > 0.05) {
        pillar.fillStyle(this.look.light, 0.12 + amount * 0.45);
        const edge = centre + dir * 22;
        pillar.fillRect(dir > 0 ? edge - 4 : edge, top + 18, 4, g - 24 - (top + 18));
      }
      // Ivy climbing one side.
      pillar.fillStyle(mixColour(this.look.stage, this.look.far, 0.25), 1);
      const side = rng() < 0.5 ? -1 : 1;
      for (let y = g - 30; y > top + 40 + rng() * 60; y -= 9) pillar.fillCircle(centre + side * (18 + Math.sin(y * 0.09) * 6), y, 4 + rng() * 3);
    } else {
      // Grass: some blades behind him, taller ones in front.
      const back = this.add.graphics().setDepth(DEPTH.props);
      const front = this.add.graphics().setDepth(DEPTH.front);
      back.fillStyle(this.look.prop, 1);
      front.fillStyle(this.look.stage, 1);
      for (let x = x0; x < x1; x += 7) {
        const inFront = rng() < 0.55;
        const height = inFront ? 30 + rng() * 26 : 44 + rng() * 30;
        const lean = (rng() - 0.5) * 16;
        (inFront ? front : back).fillTriangle(x - 4, g + 1, x + 4, g + 1, x + lean, g - height);
      }
    }
  }
}

/** The monsters shown in the maker's preview: the named kinds chosen, then the described ones, three at most. */
function showcase(settings: Settings): Spawn[] {
  const designs = [...new Set(settings.enemies)].map((kind) => ({ kind, design: undefined as Design | undefined }));
  for (const creature of settings.creatures) {
    const design = designFor(creature);
    designs.push({ kind: design.brain, design });
  }
  return designs.slice(0, SHOWCASE.most).map(({ kind, design }) => (design ? { kind, x: 0, minX: 0, maxX: 0, design } : { kind, x: 0, minX: 0, maxX: 0 }));
}
