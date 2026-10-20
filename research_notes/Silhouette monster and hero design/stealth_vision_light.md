# Stealth Vision, Alert States and Light in Dark 2D Silhouette Games

Context: Phaser 3 side-view game. Light exposes the hero; he hides in grass and behind rocks and pillars. Monsters' gaze is drawn as soft lamp-like cones from their eyes. A watcher has a beam with a 5-second countdown. The world is a dark, dried-out desert with lamps, fireflies and glowing flowers.

Source quality note: primary developer sources were thin. The Mark of the Ninja material (Nels Anderson, Game Developer 2012) and the Xbox Accessibility Guidelines are strong primary sources. The Inside GDC talk is paywalled, so only its abstract was available. Material on Invisible Inc, Aragami and Little Nightmares comes from community or review sources. I found nothing usable on Third Eye Crime, Monaco, Gunpoint, Hitman icons, Ori, Gris, Hob or Sundered (see Gaps). Inferences are my own design reasoning and are labelled as such.

## 1. How stealth games show vision, sound, suspicion and search (and what works in 2D side view)

### Takeaway
The best 2D reference is Mark of the Ninja. It has no visibility meter: the hero's own rendering shows whether he is lit or hidden, and sound reach is drawn as an expanding ring in the world. Guards have three readable awareness levels and a "last seen" ghost marker. AI state changes are meant to be instantly attributable to a cause. The 3D series (MGS) add music and directional flares as alert cues.

### Cited Findings
- **Mark of the Ninja: binary visibility on the hero.** There is no visibility meter. When the hero is concealed he is drawn black with red highlights, and in light he is fully coloured — [Game Developer: Mark of the Ninja's five stealth design rules](https://gamedeveloper.com/design/-i-mark-of-the-ninja-i-s-five-stealth-design-rules)
- **MotN: edge-of-vision glimpse.** At the very edge of a guard's field of view, the guard catches a glimpse and moves quickly toward the hero, but does not go on full alert — [Game Developer, five rules](https://gamedeveloper.com/design/-i-mark-of-the-ninja-i-s-five-stealth-design-rules)
- **MotN: three awareness levels and a last-known-position marker.** Guards have three clear awareness levels, and the game cues entry into each one. After losing the hero they race to where he was last seen, marked by a ghost icon. After hearing a sound they go to the area and look at it — [Game Developer, five rules](https://gamedeveloper.com/design/-i-mark-of-the-ninja-i-s-five-stealth-design-rules)
- **MotN: "Transparent AI".** When guard behaviour changes, players should immediately understand what set it off — [Game Developer, five rules](https://gamedeveloper.com/design/-i-mark-of-the-ninja-i-s-five-stealth-design-rules)
- **MotN: small encounter spaces.** Encounters are kept to about one screen plus 0.5–0.75 of a screen in any direction, because larger 2D spaces disorient players — [Game Developer, five rules](https://gamedeveloper.com/design/-i-mark-of-the-ninja-i-s-five-stealth-design-rules)
- **MotN: sound as a ring.** Each noise is "a spreading blue ring that says exactly how far that noise will reach, literally in the playfield". It is designed to be not obtrusive but clear, so players can plan — [Game Developer: Reinventing stealth in 2D](https://gamedeveloper.com/design/reinventing-stealth-in-2d-with-i-mark-of-the-ninja-i-)
- **MotN: hero's line of sight.** The 2D view first let players see through doors and vents, which undermined stealth. The team limited what is shown to what the avatar can directly see, and areas outside line of sight are darkened and blurred. Lit areas are reported as yellow cones. These come from secondary sources, not from Klei — [PopMatters](https://popmatters.com/166432-mark-of-the-ninja-2495791612.html); [Siliconera interview](https://www.siliconera.com/mark-of-the-ninja-interview-taking-stealth-from-3d-to-2d/)
- **Invisible Inc: two-tier cone.** Players report that guard peripheral vision is drawn in a lighter red labelled "noticed", and that alerted guards widen their cone to about 180°. This is community-reported, not official — [Steam discussion](https://steamcommunity.com/app/243970/discussions/0/617336568086845807)
- **Invisible Inc: cone must match the logic.** A Klei forum bug report describes a drawn cone that was larger than the guard's real detection, which confused players — [Klei forums](https://forums.kleientertainment.com/forums/topic/41104-graphics-rendered-guard-vision-cone-of-wrong-size/)
- **MGSV: alert cues without a HUD.** A lens flare marks the caution phase. It appears in the direction of whatever might spot Snake, and human enemies get a cone-shaped flare that echoes the classic field-of-view cone. Music, not a radar, tells the player the current alert phase — [Metal Gear Informer](https://www.metalgearinformer.com/?p=9380)
- **MGSV: Reflex Mode.** After being spotted, a slow-motion window lets the player silence the enemy and cancel the alert. It was added to offset the open world and the lack of a radar — [Metal Gear Informer](https://www.metalgearinformer.com/new-metal-gear-solid-v-info-and-screens-from-the-la-studio-opening-event/)
- **Metal Gear: "!" colour language.** The "!" grew from a small white bubble (MG2) to a big red mark (MGS). In Rising, red means ALERT and yellow means CAUTION — [Metal Gear Wiki](https://metalgear.fandom.com/wiki/Exclamation_point)
- **Aragami: hero tied to light.** The cape and scarf show shadow essence, which drains near strong light and refills in shadow. Spotting is not instantly fatal, because a slow-motion reaction window is on by default. After hiding long enough, guards return to patrol with heightened alertness — [Aragami, Wikipedia](https://en.wikipedia.org/wiki/Aragami_(video_game)); [reviews collection](https://www.trueachievements.com/game/Aragami-Shadow-Edition/reviews)
- **Little Nightmares: a blind sound-hunter.** The Janitor cannot see and hunts by sound, and carpets muffle footsteps. The hero's flickering lighter lights only a small radius, and its moving light makes players imagine movement in the dark — [Little Nightmares wiki: Lanterns and Candles](https://littlenightmares.fandom.com/wiki/Lanterns_and_Candles); [TheSixthAxis](https://www.thesixthaxis.com/?p=283000)
- **Hobbyist convention.** Patrol, Suspicious and Alerted are commonly colour-coded green, yellow and red, with a search from the last known position after line of sight breaks. Entering the cone starts a suspicion meter rather than an instant catch. These are hobbyist devlogs: they show the convention, not authority — [itch.io Stealth AI Proving Grounds](https://trappedcoder.itch.io/stealth-ai-proving-grounds); [n2h-games devlog](https://n2h-games.itch.io/stealth-game-prototype/devlog/849809/mechanical-breakdown-enemy-behavior)

### Inferences (my design reasoning for this game)
- **Swap the meter for the hero's own look.** Copy Mark of the Ninja. Hidden (in grass, behind a rock, in shadow) means a pure black silhouette with a faint cool rim. Exposed (in lamp or monster light) means the silhouette gains a warm inner fill or a bright rim and visible eye-glints. The exposure state then lives on the character, so no HUD bar is needed.
- **Cones are honest in 2D side view.** A side-view cone is a 2D wedge, so occlusion by rocks and pillars can be computed exactly: clip the gaze cone with a visibility polygon. The drawn shape must equal the detection shape (see the Invisible Inc bug). Draw the cone at the size it really detects, not the size that looks nicest.
- **Two-tier cone.** Use a bright inner core where detection is fast, and a faint outer "glimpse" band where suspicion builds slowly. This matches MotN's edge-of-vision glimpse and Invisible Inc's "noticed" zone.
- **Grass is the 2D answer to depth.** In side view the hero cannot step "behind" things freely. Tall grass, pillars and rocks act as cone-blocking volumes. When the hero is in grass, the cone visibly stops at the grass tips: draw the clipped edge as a slightly brighter lip.
- **Sound.** If monsters can hear (running, knocking stones), draw MotN-style expanding rings. In a gentle desert palette, use a pale dust-coloured ring rather than blue, so it does not compete with the monster-gaze colour.

### Gaps
- No primary source for Third Eye Crime, Monaco, Gunpoint, Hitman's suspicion icon, or Klei's GDC talk. Searches returned only store pages or unrelated results.
- No published exact timings (suspicion fill rates, search durations) from any commercial game.

## 2. Alert-state language: suspicious, alerted, searching, giving up

### Takeaway
Use a short, legible ladder (unaware, then suspicious, then alerted, then searching, then back to unaware with residual wariness). Make each step attributable to a cause, give a grace window before full alert, and signal each step through more than one channel (shape or motion plus colour plus sound). Colour alone fails for colour-blind players.

### Cited Findings
- Three levels with clear entry cues, a glimpse that triggers approach without full alert, and a ghost icon at the last-seen position — [Game Developer, MotN five rules](https://gamedeveloper.com/design/-i-mark-of-the-ninja-i-s-five-stealth-design-rules)
- Yellow means caution and red means alert in Metal Gear's "!" convention — [Metal Gear Wiki](https://metalgear.fandom.com/wiki/Exclamation_point)
- Alert can be conveyed through music and a directional flare instead of HUD icons (MGSV) — [Metal Gear Informer](https://www.metalgearinformer.com/?p=9380)
- In Ground Zeroes, the indicator colour shifts with enemy alertness. In full alert there is no indicator, and the player reads radio chatter until guards calm down — [Ground Zeroes guide archive](https://pages.cs.wisc.edu/~jmoeller/tableAhtml/Metal_Gear_Solid_V_Ground_ZeroesXbox_360.html)
- Grace windows (MGSV Reflex Mode, Aragami's slow-motion) make being spotted recoverable — [Metal Gear Informer](https://www.metalgearinformer.com/new-metal-gear-solid-v-info-and-screens-from-the-la-studio-opening-event/); [Aragami reviews](https://www.trueachievements.com/game/Aragami-Shadow-Edition/reviews)
- After the search ends, guards return to patrol with heightened alertness (Aragami) — [Aragami reviews](https://www.trueachievements.com/game/Aragami-Shadow-Edition/reviews)
- Do not convey information with colour alone. Red and green together commonly fail for colour-blind players — [Xbox Accessibility Guideline 102](https://devdocs.xbox.com/gaming/accessibility/xbox-accessibility-guidelines/102)

### Inferences: a proposed state ladder for silhouette monsters (no HUD icons, eyes do the talking)
| State | Eyes | Gaze cone | Body / motion | Sound | Suggested timing (my proposal, tune in playtest) |
|---|---|---|---|---|---|
| Unaware / patrol | Steady soft glow, slow blink | Soft, low alpha (~0.15–0.25), gentle sway with head | Idle walk | Low ambient hum or breath | — |
| Suspicious (something in the outer band, or a sound) | Eyes brighten and narrow; a small 3-dot or "?"-like flicker *optional* | Cone tightens and lengthens toward the stimulus, alpha rises | Head-turn and pause, lean toward the stimulus | Rising single tone | Suspicion fills in ~0.6–1.5 s (faster when closer or in the bright core); decays when unseen |
| Alerted (seen) | Eye flare: a quick bloom pop, then eyes turn danger colour | Cone snaps to full brightness, slight flicker | Rear up or freeze for ~0.3–0.5 s (grace window) before charging | Sharp sting | Grace ~0.4 s, then chase |
| Searching (lost sight) | Eyes stay hot but pulse slowly | Cone sweeps back and forth at the last-known spot; draw a faint "ghost" hero silhouette there (MotN) | Walk to the last-seen point, look both ways | Searching motif, sniffing | ~4–6 s search |
| Giving up | Eyes cool back down over ~1 s | Cone fades back to soft | Shrug or settle animation | Falling tone | Then patrol with a slightly wider cone (residual wariness, as in Aragami) |

- Use **colour temperature as the state axis**: cool or neutral when calm, amber when suspicious, hot (red-magenta, or the game's danger hue) when alerted. Pair every colour step with a change in **shape** (cone width, eye narrowing) and **motion** (flicker or pulse rate), so it holds up for colour-blind players.
- The gentle "regulate, don't intensify" feel the user favours elsewhere argues for soft transitions (lerped colour and alpha), a generous grace window, and no strobing.
- **Watcher beam with a 5 s countdown.** Show the countdown *diegetically* rather than as a number. Options: (a) the beam gradually narrows and brightens toward a hot core as the 5 s elapse; (b) a ring of light (an arc) around the watcher's eye closes like a clock; (c) dust motes in the beam speed up. Add a sharp warning at about 1 s left: a pulse plus a sound tick. That keeps one consistent "charging means brightening and tightening" language (see section 4).

### Gaps
- No sourced data on Hitman's suspicion icon design (the white or orange chevron that fills), or on Invisible Inc's official alarm-level UI.
- No user-research figures on optimal suspicion fill times.

## 3. Light design in dark silhouette art (Limbo, Inside, Ori, Hollow Knight and similar)

### Takeaway
Silhouette games keep readability by limiting values (a dark playfield, lighter atmospheric backgrounds), letting light and shadow carry direction and focus, and making a few emissive points (eyes, lamps) the brightest things on screen. Inside layers atmospheric fog and volumetric light and fights banding with dithering. All of this maps to Phaser as stacked gradient sprites, additive blending and a multiply darkness layer.

### Cited Findings
- **Limbo.** A limited grey palette where light and shadow define the playfield and the direction of travel; silhouette is the main language — [Girls on Games: Art Examination, Limbo](https://www.girlsongames.ca/2017/04/27/art-examination-playdead-limbo/)
- **Limbo.** Everything is a silhouette, and the boy is identified by his white glowing eyes. That is a direct precedent for emissive eyes as the identity marker of a character — [Giant Bomb user review](https://giantbomb.com/user-reviews/id/121580/visual-artistry-and-well-designed-puzzles-collide-)
- **Inside rendering talk** (Gjoel and Svendsen, GDC 2016). Lighting was authored as separate diffuse, specular and bounce-light entities. The talk covers local shadowed volumetrics and the use of dithering so subtle artwork is not "drowned in colour-banding" — [GDC Vault abstract](https://gdcvault.com/play/1023002/Low-Complexity-High-Fidelity-INSIDE); [80.lv](https://80.lv/articles/the-rendering-of-inside-low-complexity-high-fidelity/?amp=1)
- **Dithering** hides banding from low-bit-depth storage of fog or gradients. A blue-noise ray-marched fog post points to the Inside deck as closely related — [demofox blog](https://blog.demofox.org/2020/05/10/ray-marching-fog-with-blue-noise/)
- **Bloom on dark backgrounds.** Bloom over a dark background bands easily. A half-float render target helped, according to a forum opinion — [three.js forum](https://discourse.threejs.org/t/is-the-best-practice-a-dark-background-for-bloom-to-avoid-banding/72377)
- **2D layered lighting.** Assign 2D lights per parallax layer by depth. A fading horizon plus atmospheric fog, lights and particles sets the mood — [Unity: use 2D lights to set mood](https://unity.com/en/how-to/use-2d-lights-unity-set-mood)
- **Fog as stacked translucent flat-colour sprites** between parallax layers — [itch.io devlog comment](https://maaot.itch.io/mossy-cavern/comments?after=0)
- **Hollow Knight's art style breakdown** (The Superforge, via 80.lv): layered parallax backgrounds and foregrounds — [80.lv](https://80.lv/articles/breakdown-hollow-knights-art-style/?amp=1); [Polycount](https://polycount.com/discussion/comment/2268263)
- **Little Nightmares.** A small flickering light radius creates tension, as players imagine movement in the dark — [TheSixthAxis](https://www.thesixthaxis.com/?p=283000)

### Inferences: a Phaser 3 light recipe for the dark desert
- **Value structure.** Keep foreground silhouettes (hero, monsters, rocks, grass) the darkest values. Make each background parallax layer progressively lighter and more desaturated toward the horizon (atmospheric perspective, Limbo-style). That keeps silhouettes legible without lighting them.
- **Fog or haze bands.** Place 2–3 full-width horizontal gradient sprites between parallax layers (dusty ochre near the ground, cool violet higher up). Drift them slowly. Use NORMAL blending at low alpha, or SCREEN for glowing dust.
- **Darkness layer.** Use a full-screen RenderTexture filled with near-black. "Erase" or draw additive radial gradients into it at every light source (lamps, flowers, fireflies, the hero's exposure), then composite with MULTIPLY. This is the established Phaser technique: a white-on-black light map multiplied over the world, plus additive sprites for the glow itself — [CodePen (Phaser 2, needs porting)](https://codepen.io/scm1400/embed/preview/eYMwEJV); [html5gamedevs thread](https://www.html5gamedevs.com/topic/6771-masking-to-simulate-light-area/)
- **Occlusion.** Use visibility polygons (Byron Knoll's algorithm, ported to Phaser 3 by Feronato) or the phaser-raycaster plugin (which supports cone mode) to clip both lamp light and monster gaze against rocks and pillars — [Feronato: light and dark with visibility polygons, Phaser 3](https://emanueleferonato.com/?p=12908); [phaser-raycaster](https://github.com/wiserim/phaser-raycaster)
- **Colour temperature contrast.** Warm, safe-feeling world lights (lamps: amber; flowers: soft gold, teal or rose) against a cool or alien monster gaze (pale cyan or violet when calm, shifting to hot when alerted). The player can then tell at a glance which light is the world and which light is watching. Never give a collectible the same hue as monster light.
- **Rim light.** Fake rim light on flat silhouettes with a second copy of the sprite: tint it the light's colour, offset it 1–2 px toward the nearest light, put it behind the silhouette with ADD blend, and fade its alpha by distance to the light. Phaser 3.60+ also has preFX glow (`sprite.preFX.addGlow`), which gives a cheap emissive outline.
- **Emissive eyes.** Draw eyes as small additive sprites with a soft radial halo 3–5× the eye size. Eyes are the brightest pixels on a monster and carry its state (see section 2).
- **Light shafts.** Use tall, thin, additive linear-gradient quads from lamps, angled, with slow alpha flicker and dust particles drifting inside (particle emitter with an emitZone set to the shaft rectangle, ADD blend).
- **Fireflies and flowers.** Use small additive dots with sine-driven alpha (0.3–1.0) and random phase. Flowers pulse slowly, like breathing, which suits the calming aim, and cast a small radial into the darkness layer.
- **Banding.** Large soft gradients on near-black will band in 8-bit. Add a very subtle noise or dither overlay (a tiled blue-noise texture at ~2–4% alpha), as Inside does with dithering.
- **Bloom.** Phaser 3.60+ has a postFX bloom, but use it sparingly and only on emissives. On a dark background, broad bloom muddies silhouettes and bands.

### Gaps
- I found no primary lighting breakdowns for Ori, Gris, Hob or Sundered. The Ori and Gris claims would need art-book or GDC sources (e.g. Moon Studios talks, Nomada Studio interviews); none surfaced.
- The full Inside slides (exact fog and volumetric technique) are members-only on GDC Vault.

## 4. Making enemy attacks readable through light

### Takeaway
Telegraph through a consistent shape, timing and consequence mapping. Exaggerate the wind-up, and pair visual cues (flash, glow ramp) with audio. In a dark silhouette world, light is the cheapest and clearest wind-up: brightening, tightening and colour-shifting light before a strike.

### Cited Findings
- Each attack needs a clear signal: wind-up animation, visual cue or audio. Telegraphs make combat feel fair — [bugnet: how to design enemy attack telegraphs](https://bugnet.io/blog/how-to-design-enemy-attack-telegraphs)
- Consistent shape language (lines, cones, circles mapped to attack types) and consistent timing build trust. A thick red arc with a 700 ms wind-up next to a faint glow with a 250 ms wind-up erodes it (an illustrative example, not a standard) — [gamineai: telegraph shape language](https://gamineai.com/blog/enemy-telegraph-shape-language-top-down-boss-fights-fast-visual-consistency-audit-2026)
- Exaggerate the wind-up length, posing and VFX to sell the message — [UAL thesis blog](https://lucylueng.myblog.arts.ac.uk/2021/11/27/thesis05-reaserch-methodology/)
- Flashes, particles and squash-stretch are a cheap substitute for many anticipation frames. A brief red flash is suggested before a strike, and relying only on subtle animation is a pitfall — [itch.io post](https://itch.io/post/303381); [Wayline: boss battles](https://www.wayline.io/blog/crafting-legendary-boss-battles)
- Visual and audio telegraphs work best together — [r/gamedesign discussion](https://lr.in.psf.lt/r/gamedesign/comments/1fn63ts/question_from_a_layman)
- MGSV's directional lens flare uses light itself as the warning cue — [Metal Gear Informer](https://www.metalgearinformer.com/?p=9380)

### Inferences: a light-based attack grammar for this game
- **Charge equals gather.** Before an attack, additive particles stream *inward* to the eye or mouth and the halo shrinks and brightens. That reads as "charging" even on a pure-black silhouette.
- **Eye flare equals commit.** A single fast bloom pop (scale 1→2.5, alpha 1→0 over ~120 ms) marks the point of no return. Keep one universal "commit" flash for every monster type.
- **Danger colour is reserved.** One hue family (e.g. hot magenta-red) appears *only* on imminent danger: alerted eyes, charging glow, projectiles. Warm amber stays safe (lamps), and cool stays neutral (calm gaze).
- **Projectiles.** Draw an additive core with a bright white centre and a coloured halo, plus a short particle trail. The projectile also lights the darkness layer as it travels, so the player sees it light up the rocks around it.
- **Ground telegraph.** For area attacks, light the ground strip where it will land: a soft additive rectangle or arc that ramps up during the wind-up. This suits side view better than top-down circles.
- **Watcher beam.** Apply the same grammar: the beam brightens and tightens toward a hot core across the 5 s, with a commit flash when it "locks". The countdown is then readable through light alone.

### Gaps
- No primary developer source on attack telegraphing specific to dark silhouette games (e.g. Inside's or Limbo's enemies). The cited sources are general design blogs.

## 5. Accessibility and readability: contrast, and avoiding muddy darkness

### Takeaway
Treat key gameplay elements like UI. Target at least 4.5:1 contrast (3:1 for large elements) against the *lowest-contrast part* of the background, use outlines or backings, never rely on colour alone, and offer a high-contrast mode (7:1).

### Cited Findings
- Xbox AG 102 asks for **4.5:1** for standard visual elements (reticles, HUD icons, markers), **3:1** for large-scale elements (for example 36 px at 1080p on PC) and inactive elements, and **7:1** in high-contrast mode. On busy backgrounds, measure against the lowest-contrast part — [Xbox Accessibility Guideline 102](https://devdocs.xbox.com/gaming/accessibility/xbox-accessibility-guidelines/102)
- Use outlines or borders around characters and important elements, add a solid backing with adjustable opacity, let players pick key colours, and do not rely on colour alone. Red and green commonly fail. Suggested test tools: Colour Contrast Analyser, Color Oracle — [Xbox AG 102](https://devdocs.xbox.com/gaming/accessibility/xbox-accessibility-guidelines/102)
- There are no formal game accessibility standards, so developers often adapt W3C guidance — [Tuts+: accessibility in game design](https://code.tutsplus.com/accessibility-in-game-design-text-displays--cms-30655t)
- A brightness or gamma option that lifts dark areas without brightening the HUD is a common player request — [Icarus feature request](https://icarus.featureupvote.com/suggestions/482821/suggestion-a-few-accessibility-settings)

### Inferences
- **Silhouette against background, not against black.** The hero and monsters are black. Their contrast must come from the *background behind them*. Keep the playfield's backdrop (sky and the far dune layer) light enough that a black silhouette reaches at least 3:1 against it, measured at the darkest point. Check screenshots with a contrast analyser.
- **Do not darken the hero's lane.** Put the deepest darkness in foreground decor and distant layers, not the middle band where the hero and monsters move.
- **Hidden must still be visible to the player.** When the hero hides in grass, the *monsters* lose him, not the *player*. Keep a faint cool rim or eye-glint on him (MotN's black-with-red-highlights logic).
- **Cones are large elements.** Their edges against the ground and background should reach about 3:1. A gradient that fades to zero alpha leaves the boundary unclear. Add a faint crisp edge line (1–2 px, slightly brighter) at the true detection boundary.
- **Colour-blind safety.** Cool-to-amber-to-hot plus a width or flicker change separates the states without red versus green. Avoid encoding "safe light" as green and "danger light" as red.
- **Options.** Add a "visibility boost" setting that raises background-layer brightness and silhouette rim strength, plus a reduced-flash option for eye flares and commit flashes.

### Gaps
- No sourced numbers on perceptual readability of silhouettes specifically (e.g. a minimum luminance difference between a black sprite and a dark background). The Xbox guideline is the closest proxy.
