# Enemy Roles, Telegraphing and Hit/Death Feedback in 2D Action Platformers

Research note scope: making every enemy's job obvious at a glance in a dark 2D side-scroller with flat, code-drawn silhouettes. The roles are: ground charger, rooted spitter plant, hovering/diving flyer, tall long-armed swiper, one-eyed light-beam watcher (5 s exposure countdown), merged monsters, and a boss.

Source quality warning: the web search returned few primary sources this session. GDC talk pages, GMTK videos, and wiki pages (Hollow Knight wiki, Mega Man fandom, gamedev.net) were either not found or blocked (403/402). Cited findings below come from the sources that did load. Anything drawn from general knowledge of specific games is marked as an inference and is not cited.

## 1. Enemy design principles: verbs, telegraphs, recovery windows, weak points

### Takeaway
Every attack should pose a clear "question" through a visible pre-attack delay (wind-up), a short active phase, and a readable cooldown. Hard-to-dodge attacks must always be telegraphed, and the player must always have a way out. Design the behaviour first, then pick the telegraphs, and only then draw the look.

### Cited Findings
- Telegraphing tells the player what the enemy is about to do so they can respond: "If players don't know how to play your game, they can't actually play your game." The pre-attack "small delay" says, in effect, "Okay, here I come." The article frames each enemy around the question it asks and the tools the player has to answer it. — [Mike Stout, Game Developer: Enemy Attacks and Telegraphing](https://gamedeveloper.com/design/enemy-attacks-and-telegraphing)
- For melee, animation is the most common telegraph, such as a long wind-up before a sword strike. Projectile attacks combine animation, sound, voice and VFX. The typical charge-up pattern is particles gathering at the weapon, a reverse "vacuum" sound, then a bright flash before the projectile appears. Effects don't need to be cartoony to work. — [Stout, Game Developer](https://gamedeveloper.com/design/enemy-attacks-and-telegraphing)
- The Stout article gives no specific wind-up durations. — [Stout, Game Developer](https://gamedeveloper.com/design/enemy-attacks-and-telegraphing)
- Attacks with clear startup, active and cooldown phases make enemies easier to read. Hard-to-dodge attacks need a telegraph or a build-up, and enemies should always leave the player a way to avoid damage, with no "checkmate" situations. — [critpoints: What makes an enemy well designed?](https://critpoints.net/2016/10/28/what-makes-an-enemy-well-designed/)
- In platformers, an enemy's main job is blocking progress: it should be harder to get past than to fight. Enemies should amplify environmental dangers, for example knockback toward pits. Enemies that chase directly should be slower than the player, or faster but limited by slow turning or recovery time. Movement should be "weird but predictable" and should force the player to move. — [critpoints](https://critpoints.net/2016/10/28/what-makes-an-enemy-well-designed/)
- Good enemies combine well, and different enemies should control different parts of the battlefield. Good examples cited: Medusa Heads (sine-wave flyers), Ninja Gaiden birds (homing), boomerang throwers, Hammer Bros. Axiom Verge bosses are criticised because the player's attacks and the boss's attacks don't interact. — [critpoints](https://critpoints.net/2016/10/28/what-makes-an-enemy-well-designed/)
- A forum thread notes that simple, predictable movement suits precision platformers. One commenter argues that the shift toward distinct startup/active/recovery attacks made enemies worse at blocking progress. — [gamedev.net: basic enemy design](https://gamedev.net/forums/topic/667381-basic-enemy-design)
- Developer workflow: design the enemy's mechanics first, decide which telegraphs it needs, then design its look. Player moveset shapes enemy behaviour, and behaviour shapes the graphics. — [itch.io dev post](https://itch.io/post/8596517)
- Shmup developer: telegraphing matters most for fast, bursty attacks. Without reaction time, players feel the game is unfair. — [ModDB: designing enemies on a budget](https://www.moddb.com/games/rick-henderson/features/designing-enemies-on-a-budget)
- Cuphead's team often designed how a boss plays before deciding how it looks (Jared Moldenhauer). — [Kotaku interview](https://kotaku.com/cuphead-developers-talk-cut-bosses-and-whats-in-the-cup-1820126327)
- Dead Cells' combat "rewards players for studying enemy patterns." Designer Sébastien Bénard describes about 30–40 hidden fairness tricks. The article only details platforming aids (late "just in time" jump, ledge assist), not the enemy tells. — [80.lv: Dead Cells hidden tricks](https://80.lv/articles/dead-cells-hidden-tricks-that-make-the-game-feel-fair)
- Celeste's Seekers fly toward Madeline on sight and kill on contact. Jumping on one stuns it temporarily and restores her dash. They ignore her when she is behind a barrier. Crushing one kills it permanently, with a pink-particle death. — [Celeste wiki: Seeker](https://celeste.ink/wiki/Seeker)

### Inferences
- Give each enemy one verb (charge, spit, dive, swipe, watch). Each verb gets a three-beat timeline: telegraph → active → recovery. Recovery is the punish window and where the weak point should be most exposed.
- Working timing ranges. These are common practice and not sourced this session, so playtest them. Telegraph 0.3–0.5 s for basic enemies, 0.6–0.9 s for big or lethal attacks, and 1 s or more for boss supers. Recovery 0.4–0.8 s. Active phase as short as the motion allows (0.1–0.25 s for a swipe).
- A tween-only telegraph kit for flat silhouettes:
  1. Anticipation pose: squash or crouch opposite to the attack direction. Charger: scale Y 0.8, X 1.15, and lean back.
  2. A colour or emissive flash on the attacking part only (eye, mouth, claw tip). Use one consistent "danger" accent colour that nothing else in the scene uses.
  3. A small shake or tremble during the wind-up.
  4. A sound cue at telegraph start, not at impact.
- Weak points: draw them as a different-value shape (a lighter core, an exposed eye) that is only visible or open during recovery. This follows the Mega Man Met pattern (helmet closed = invulnerable, opens to shoot = hittable). That description is general knowledge; the wiki page was unreachable.

### Gaps
- No primary GDC transcripts (Hollow Knight, Dead Cells, Celeste) or GMTK enemy-design transcripts could be retrieved. Team Cherry has published little on enemy design.
- No authoritative frame-data source for wind-up lengths was found. The 0.3–0.8 s range is industry convention, not verified here.

## 2. Visually distinguishing roles (charger, spitter, flyer/diver, reach/grab, watcher/sentry, boss)

### Takeaway
Roles should read from the silhouette and the idle motion before any attack happens. Each role "controls a different part of the battlefield" (ground lane, a stationary zone, air space, a reach radius, a sight cone). Combining them should create the challenge.

### Cited Findings
- Different enemies should control different parts of the battlefield. Cited flyer archetypes: Medusa heads (predictable wave path), Ninja Gaiden birds (homing divers). Contact enemies are best when they approach at an angle rather than head-on. — [critpoints](https://critpoints.net/2016/10/28/what-makes-an-enemy-well-designed/)
- An indie developer argues that flying enemies the player cannot reach fail the "good enemy" test. A flyer has to come into the player's reach at some point. — [itch.io devlog: enemies design, what I learned](https://itch.io/devlog/624502/game-design-enemies-design-what-i-learned.amp)
- Behaviour can be built from movement + qualities + abilities, with triggers switching between states (for example idle → alert → attack). — [gamedev.net: Enemy Design in Retro Games](https://gamedev.net/articles/game-design/game-design-and-theory/enemy-design-in-retro-games-build-a-bad-guy-work-shop-r4738/) (summary from search snippet only; page returned 403)
- Celeste Seeker as a watcher/chaser: it reacts on sight and is blocked by line-of-sight barriers. — [Celeste wiki](https://celeste.ink/wiki/Seeker)

### Inferences (per-role guidance for this game)
- **Low ground charger.** Wide, low, wedge-shaped silhouette pointing forward, so the shape says "lane". Idle: short sniffing paces. Telegraph: stops, crouches back (squash), front edge or eye flares, plus a scrape sound, held ~0.4–0.5 s. Then a straight dash at fixed speed that can't turn. Recovery: skids, wobbles or is stuck for ~0.6 s with the back exposed. Per critpoints, a fast chaser must have a limit; here that limit is no turning and a long recovery.
- **Rooted spitter plant.** Anchored base with roots drawn into the ground, so it never moves and the shape says "turret". A bulb or mouth is the only moving part. Telegraph: the bulb swells (scale 1→1.3), its glow brightens, and it turns to aim at the hero, ~0.5–0.6 s. Fire one slow, glowing projectile on a clear arc or straight line. After firing, the mouth stays open and the bulb deflates (vulnerable) for ~0.5 s. Optional "inhale" sound during the swell (Stout's reverse-vacuum charge-up).
- **Flyer (answer to "does it fire?").** Make it one or the other and show which in the silhouette:
  - Diver (recommended default): no mouth or gun, sharp beak or talons pointing down. Hovers with a sine bob above the hero, then stops bobbing, rises slightly and flashes (~0.5 s), and dives in a straight line toward the hero's position at the moment the telegraph started (not homing). Ends with an impact on the ground and a ~0.7 s stuck or grounded recovery, which brings it into the hero's reach (itch.io point above).
  - Shooter variant: a visible glowing sac or eye on its underside. Hovers at a fixed height, pauses, the sac glows, and it drops or spits a slow projectile.
  - Never let one flyer do both, or the player can't tell which threat is coming.
- **Tall stalker with long arms (reach/grab).** Tall, thin and hunched, with arms longer than its body, so the silhouette advertises its reach radius. Idle: slow steps, arms dangling and swaying. Telegraph: the arm draws back high behind the body (big, slow, ~0.6–0.8 s, because the reach is long and the hit is heavy), and the claw tip glows. Swipe: a fast arc with a visible arc trail. Recovery: the arm drags on the floor and the torso bends forward, exposing the head or core for ~0.8 s. Optionally draw a faint reach arc on the ground during the telegraph.
- **One-eyed watcher (sentry).** A large single eye is the whole silhouette, so the eye is its verb. Idle: the eye slowly sweeps a visible cone or beam (low-alpha wedge). Beam states by colour: neutral dim (searching) → amber (hero entered, countdown 5→0 shown as a shrinking ring or brightening beam) → red (exposed or alarm). The countdown must be visible on the beam or the eye, not only in the HUD, and should come with a rising tone. Breaking line of sight (cover) should visibly reset it, as with Celeste's barrier rule. Weak point: the eye itself, hittable when it blinks or closes after a sweep.
- **Merged monsters.** Keep each parent's readable part (the charger's wedge base plus the plant's bulb, for example). The merge shows which verbs it combines, and it alternates them, never using both at once, so each telegraph stays separate. Use a visible seam or pulsing join as the weak point.
- **Boss.** See section 5.

### Gaps
- No sourced catalogue of role-to-visual-cue mappings across Hollow Knight, Blasphemous, Katana Zero or Rain World was found this session. The per-role specifics above are design inference.

## 3. Projectile readability (shape, colour, glow, trails, hero vs enemy)

### Takeaway
Enemy projectiles must contrast with the background and must never share colour or shape with the hero's projectiles. Use a single reserved enemy-danger hue (warm red/orange is a common convention), round or glowing shapes, and trails that show direction.

### Cited Findings
- Matching player and enemy bullet colours makes it hard to tell whose bullets are whose. Players ask for strong colour contrast between player, enemy and environment. — [itch.io comment](https://itch.io/post/16632227)
- A developer changed projectile colour because enemies and their projectiles shared a colour, which was confusing. — [ZeroG devlog](https://rather-smashing.itch.io/zero-g/devlog/276770/small-qol-update-to-zerog)
- One designer keeps enemy bullets red/orange specifically to separate them from player bullets. Another suggests animating bullets so they stand out. Another suggests player shots as sprites and enemy shots as simple circles. — [itch.io posts via search](https://itch.io/post/8450358); [itch.io](https://itch.io/post/6862780)
- Bullets that contrast with the background are acceptable in any colour. — [itch.io comments](https://foosel.itch.io/pew-pew-pew-danger-zone/comments)
- These are anecdotal developer and player comments, not formal research.

### Inferences
- On a dark, flat-silhouette background, give enemy projectiles a bright core and a soft outer glow (additive circle at 2–3× radius, low alpha). Add a short fading trail (3–6 ghost copies) so speed and direction read even in a single frame.
- Hero projectiles should use a different hue family (cool, for example) and a different shape (elongated or streak versus the enemy's round blob).
- Spawn a "muzzle" flash on the enemy at the moment of firing, so the projectile's origin is visible.
- Keep enemy projectiles slower than the hero's dash speed, so dodging is always possible (critpoints' no-checkmate rule).

### Gaps
- No primary shmup-developer source (Cave, Touhou postmortems) retrieved.

## 4. Hit feedback and death feedback: how much is enough

### Takeaway
Layer several small effects at the moment of impact: target-only white flash ~0.08 s, hit-stop ~0.03–0.08 s (up to ~0.15 s for critical or kill hits), small knockback, a particle burst, and sound. Save screen shake for heavy or finishing hits. The contrast between weak and strong hits matters more than absolute strength.

### Cited Findings
- Example defaults: hit flash 0.08 s, hit stop 0.05 s. Hit-stop tiers: weak 0–0.03 s, strong 0.05–0.08 s, critical 0.1–0.15 s. Shake impulse tiers: 0.1–0.2 / 0.3–0.5 / 0.6–1.0. — [uhiyama-lab: Unity game feel hit feedback](https://uhiyama-lab.com/en/notes/unity/unity-game-feel-hit-feedback/)
- "Make everything flashy, and everything becomes ordinary." Keep weak hits restrained so strong hits stand out. Don't shake on every combo hit; save shake for finishers. Apply hit stop to the first and last hits of a multi-hit. Flash only the target, never the full screen (photosensitivity). To audit, turn effects off one at a time and remove any that changes nothing. — [uhiyama-lab](https://uhiyama-lab.com/en/notes/unity/unity-game-feel-hit-feedback/)
- Hitstop: both combatants freeze for a few frames, scaled by damage. — [Slap City wiki: Hitstop](https://slapcity.wiki.gg/wiki/Hitstop)
- 50–100 ms of freeze on a heavy hit makes it feel forceful. One developer reports using 0.12 s on melee only, because on continuous ranged fire it would be "unplayable". — [search summary of uhiyama-lab UE5 note](https://uhiyama-lab.com/en/notes/ue/game-feel-hit-feedback/); [itch.io](https://itch.io/post/16119529)
- Knockback plus hit-stop plus shake plus a meaty sound together make hits feel powerful. Tune knockback by feel in play. — [bugnet: knockback that feels good](https://bugnet.io/blog/how-to-implement-knockback-that-feels-good) (search snippet only)
- Light hitstop 0.04–0.08 s, heavy 0.10–0.18 s (Godot tutorial suggestion). — [Godot forum tutorial](https://forum.godotengine.org/t/tutorial-hit-stop-and-screen-shake-in-godot-4-autoload-trauma-camera-mit/145240)
- Jan Willem Nijman's "The Art of Screenshake" (Vlambeer) shows stacking small feedback. For a single Nuclear Throne pistol shot: kick the camera back 6 px from the aim direction and "add 4 to the screenshake." A recreation of the talk lists Hit Pause and Enemy Knockback among the effects. — [infovore: Making Game "Feel"](https://infovore.org/?p=5275); [DK Liao recreation devlog](https://dkliao.itch.io/the-art-of-screenshake-recreation/devlog/451576/quick-breakdown-of-all-the-effects) (page 403; title and snippet only)

### Inferences
- Suggested ladder for this game:
  - Normal hit: white silhouette flash 0.06–0.08 s, hit-stop ~0.04 s, knockback 6–12 px with ease-out, 4–6 particles in the enemy's colour, no shake.
  - Killing blow: hit-stop ~0.1 s, a small shake, then the death sequence.
  - Hero hurt: red tint, ~0.1 s hit-stop, and a short shake, so damage taken always feels different from damage dealt.
- Death feel with silhouettes: freeze → flash white → squash then burst into 8–15 shards or particles that fade. Celeste does this with pink particles for a Seeker's permanent death. Leave a brief afterimage or puff so the player sees the space is now safe.
- Since the project aims at regulating mood and not intensifying it, keep screen shake low-amplitude and offer a reduce-shake/flash option. This matches the uhiyama-lab accessibility advice.

### Gaps
- Exact numbers from Nijman's talk on hit-stop and knockback were not retrievable.

## 5. Boss telegraphing and phase changes

### Takeaway
Bosses use the same telegraph → active → recovery grammar, with longer, bigger wind-ups and unique tells per move. Phase changes need an unmistakable transition beat (pause, visual change, new arena behaviour). Fairness comes from clear animations and dodge windows.

### Cited Findings
- Hollow Knight's Grimm is cited as fair difficulty because its attacks come with clear animations and dodge windows. — [Choost Games: What makes a good boss fight](https://choostgames.com/blog/what-makes-a-good-boss-fight/)
- Failing to telegraph leads to frustration. Phases should change the boss's behaviour and also the arena. — [Wayline: Crafting legendary boss battles](https://www.wayline.io/blog/crafting-legendary-boss-battles)
- Psychonauts' Lungfishopolis boss announces attacks with animation, effects and voice ("Hard…to…avoid… AREA ATTACK!!!"). — [Stout, Game Developer](https://gamedeveloper.com/design/enemy-attacks-and-telegraphing)
- Cuphead animation runs at 24 fps for the cartoon look over 60 fps gameplay. A reviewer claims musical tempo hints at incoming attacks (third-party claim, unverified). — [Windows Central](https://windowscentral.com/check-out-how-cuphead-team-makes-its-cool-looking-2d-animations); [games.gg](https://games.gg/cuphead/)
- Bosses fail when the player's attacks and the boss's attacks don't interact. Example: Axiom Verge's Telal can't turn, so players simply stand behind it. — [critpoints](https://critpoints.net/2016/10/28/what-makes-an-enemy-well-designed/)

### Inferences
- Give the boss three or four moves borrowed from the regular roster (charge, spit, swipe, watcher beam). Players already know those telegraphs, so the boss becomes the final exam of the bestiary.
- Each move gets a unique pose and a unique sound. Use the shared danger colour on the part that will hit.
- Phase change: the boss stops, becomes invulnerable briefly, flashes, and its silhouette visibly changes (cracks open, eye revealed, grows a limb). The arena changes too (light shrinks, platforms drop). Then it resumes with faster telegraphs (about −20 %), never removed ones.
- Show boss health as a bar with phase tick marks, so phase transitions are expected.

### Gaps
- No primary Team Cherry or StudioMDHR boss-telegraph documentation was found. The GDC 2017 Cuphead animation talk (Jake Clark) exists but was not retrieved.

## 6. Personality through idle behaviour and motion

### Takeaway
Idle motion is the cheapest role signal. How an enemy moves while not attacking should preview what it does when it attacks, and its patterns should be "weird but predictable."

### Cited Findings
- Enemies should move in weird but predictable ways and force the player to move. Medusa heads and orbiting AM2R enemies are cited as memorable movement patterns. — [critpoints](https://critpoints.net/2016/10/28/what-makes-an-enemy-well-designed/)
- A good enemy is memorable, grabs attention, and is more than a pile of stats. — [itch.io devlog](https://itch.io/devlog/624502/game-design-enemies-design-what-i-learned.amp)
- State triggers (idle → alert → attack) structure retro enemy behaviour. — [gamedev.net retro enemy design](https://gamedev.net/articles/game-design/game-design-and-theory/enemy-design-in-retro-games-build-a-bad-guy-work-shop-r4738/) (snippet only)

### Inferences
- Idle motion for each role, implemented as tweens:
  - Charger: twitchy, impatient pacing; quick 0.1 s turns; pawing.
  - Plant: slow breathing pulse (scale 1.0↔1.05 over 2 s); the bulb tracks the hero.
  - Flyer: sine bob plus small wing-flap scale on Y.
  - Stalker: slow, heavy steps; long arms swaying with a lag (secondary motion).
  - Watcher: slow eye sweep with occasional blinks.
- Add an "alert" beat when the enemy first notices the hero: a small hop, the eye widening, a "!" flash or a sound. This tells the player the enemy's state changed before any attack, and it gives each enemy character.
- Keep each enemy's movement speed distinct (fast/twitchy versus slow/heavy), so roles read even when silhouettes are partly hidden in darkness.

### Gaps
- No sourced animation-principle essay specific to enemy idles was retrieved (for example Hollow Knight's idle animation design, or Rain World's procedural creature behaviour).
