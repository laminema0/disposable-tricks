# Procedural animation for code-built 2D characters (Phaser 3, no sprite sheets)

## Which of the 12 principles give the most appeal for the least effort in game characters?

### Takeaway
For code-built characters, five principles give the most appeal for the least effort: squash and stretch (with volume kept constant), follow-through and overlapping action (parts settling at different rates), slow-in/slow-out (easing, plus fast-in/slow-out for weight), arcs, and anticipation. Anticipation has to be balanced against responsiveness. Hero actions should get very short wind-ups, and enemy telegraphs longer ones.

### Cited Findings
- Squash and stretch: stretch a jumping character vertically during the fast part of a jump, and squash at the apex and on landing. Keep the volume constant by squashing the other axis. — [Game Developer, "The 12 principles of animation in video games" (Jonathan Cooper, Game Anim excerpt)](https://gamedeveloper.com/production/the-12-principles-of-animation-in-video-games)
- Anticipation is the main tension between design and animation. Too little makes a punch or swing feel weightless, and too much feels unresponsive. Enemy telegraphs should be longer so players can read and dodge them. Pairing longer wind-ups with bigger damage creates risk versus reward. — [Game Developer / Cooper](https://gamedeveloper.com/production/the-12-principles-of-animation-in-video-games)
- Follow-through and overlap: body parts move at different rates (the head and torso lead, the arm trails and snaps). Follow-through covers recovery and secondary items like hair and cloth catching up. For responsiveness, the player should regain control at a set frame before the follow-through ends, so the full follow-through plays unless input interrupts it. Procedural physics can handle drag on cloth and hair. — [Game Developer / Cooper](https://gamedeveloper.com/production/the-12-principles-of-animation-in-video-games)
- Slow in/slow out: a sword swinging at full speed looks light. Add weight with fast-in/slow-out, meaning a slow follow-through. — [Game Developer / Cooper](https://gamedeveloper.com/production/the-12-principles-of-animation-in-video-games)
- Arcs: most motion follows arcs. Strict arcs can look floaty, so a deliberate break (such as a head snap on a hit) adds punch. — [Game Developer / Cooper](https://gamedeveloper.com/production/the-12-principles-of-animation-in-video-games)
- Timing: speed = distance / time, and faster motion reads as lighter. The article's only numeric example is that a punch over 2 frames is faster than one over 5. Holding a pose after a swing lets players read it. — [Game Developer / Cooper](https://gamedeveloper.com/production/the-12-principles-of-animation-in-video-games)
- Appeal in games means believable, readable performance, not just likability. Enemies need it too. Proportions, color blocking, simple posing and clear silhouettes all help. — [Game Developer / Cooper](https://gamedeveloper.com/production/the-12-principles-of-animation-in-video-games)
- Secondary action: details that support the main action. Additive or partial layers can run longer than control animations. — [Game Developer / Cooper](https://gamedeveloper.com/production/the-12-principles-of-animation-in-video-games)
- Cooper's book *Game Anim* reinterprets the classic 12 and adds 5 new game-specific principles. — [Routledge, Game Anim 2nd ed.](https://www.routledge.com/Game-Anim-Video-Game-Animation-Explained/Cooper/p/book/9780367707651)

### Inferences
- In code, each high-value principle maps to one cheap mechanism:
  - Squash and stretch: `scaleX = 1/s, scaleY = s` (area roughly preserved), driven by vertical velocity or a landing spring.
  - Follow-through and overlap: a spring or chain on each appendage, so parts lag and settle by themselves.
  - Slow in/out: Phaser tween eases (`Sine.easeInOut` for idle, `Back.easeOut` or `Cubic.easeOut` for snaps).
  - Arcs: rotate parts about pivots instead of translating them.
  - Anticipation: a short reverse motion before the main tween.
- These starting timings are my own suggestions, not from the sources. Tune them per game.
  - Hero action anticipation: about 2–4 frames (33–66 ms) at 60 fps.
  - Enemy telegraph: about 300–600 ms, which matches Cooper's "longer telegraphs" advice.
  - Strike: 1–3 frames.
  - Follow-through hold: 80–200 ms before easing back to idle over about 150–300 ms.
- Exaggeration and solid drawing matter less for tiny code-drawn characters. Staging is mostly a level and camera concern.

### Gaps
- No authoritative source gave specific frame counts for anticipation and recovery in 2D platformers. The timings above are inferred and must be play-tested.
- I couldn't access Steve Swink's *Game Feel* text or Game Maker's Toolkit transcripts in this pass.

## Core techniques and parameters (sine idle, springs, verlet chains, IK, easing)

### Takeaway
A small toolkit covers almost every case:
1. Sine oscillators for idle breathing and bob.
2. A critically damped (or slightly underdamped) spring per secondary part.
3. A distance-constrained point chain ("follow the leader") for tails, snakes, tentacles and antennae, optionally with an angle limit.
4. Verlet particles with stick constraints, 1–4 relaxation iterations, for capes and dangling ropes.
5. A 2-bone or FABRIK IK solve, plus a step threshold, for procedural legs.

All five are a few dozen lines of TypeScript.

### Cited Findings
**Springs (secondary motion, smoothing, squash recovery)**
- Daniel Holden's exact critically damped spring is parameterised by a half-life (the time for the distance to the goal to halve):
  - `damping = 4*ln2/(halflife+eps)`, `y = damping/2`
  - `j0 = x - goal`, `j1 = v + j0*y`, `e = fast_negexp(y*dt)`
  - `x = e*(j0 + j1*dt) + goal`, `v = e*(v - j1*y*dt)`
  - `fast_negexp(x) = 1/(1 + x + 0.48x² + 0.235x³)`

  Because the solution is exact, it stays stable at any dt. The article gives no recommended half-life values for secondary motion. — [The Orange Duck, "Spring-It-On: The Game Developer's Spring-Roll-Call"](https://theorangeduck.com/page/spring-roll-call)
- t3ssel8r's "Giving Personality to Procedural Animations using Math" (June 2022) uses a second-order system with three intuitive parameters:
  - frequency (f)
  - damping (ζ)
  - initial response (r): negative values cause anticipation (moving the wrong way first), and values above 1 cause overshoot.

  It is solved with semi-implicit Euler, and large timesteps can blow up unless the step is clamped using eigenvalues. — [Hackaday summary](https://hackaday.com/tag/game-design); [video mirror/description](https://yt.dorper.me/v/yt/KPoeNZZ6H4s)
- Implementations of the t3ssel8r system exist, for example the Rust crate `spring_motion`. — [docs.rs spring_motion](https://docs.rs/spring_motion)
- Damping-ratio behaviour: ζ < 1 overshoots and oscillates, and ζ = 1 is critically damped, reaching the target fastest with no overshoot. — [SIU control lecture](https://www.engr.siu.edu/staff/spezia/Web438A/Lecture%20Notes/lesson20et438a.pdf)

**Chains (snakes, tails, tentacles, spines): argonaut's "A simple procedural animation technique"**
- Source code: [argonautcode/animal-proc-anim](https://github.com/argonautcode/animal-proc-anim). It covers a fish, a snake and a lizard on a 2D chain rig.
- `Chain` holds joints, a fixed `linkSize`, and an `angleConstraint` ("higher = loose, lower = rigid"). In `resolve(pos)`, the head moves to the target and each following joint is pulled to exactly `linkSize` from its predecessor, along its own direction clamped to within `angleConstraint` of the previous joint's angle. `fabrikResolve(pos, anchor)` does one forward and one backward FABRIK pass per frame, without iterating to convergence. — [Chain.pde](https://raw.githubusercontent.com/argonautcode/animal-proc-anim/main/Chain.pde)
- Lizard parameters:
  - Spine: `new Chain(origin, 14, 64, PI/8)`, i.e. 14 joints, 64 px links and a 22.5° bend limit.
  - Per-vertebra body widths: `{52,58,40,60,68,71,65,50,28,15,11,9,7,7}`. The body outline is drawn from these widths.
  - Legs: 4 three-joint FABRIK chains (link 52 px front, 36 px back), attached at vertebrae 3 and 7, angled PI/4 (front) and PI/3 (back) off the spine.
  - Stepping: the desired foot spot is 80 px out from the attachment point. A foot replants only when the desired spot is more than 200 px from the planted spot, and each frame the foot lerps 40% toward its planted target.
  - Drawing: legs are Bezier curves.

  — [Lizard.pde](https://raw.githubusercontent.com/argonautcode/animal-proc-anim/main/Lizard.pde)

**Verlet ropes and capes (Jakobsen, Hitman)**
- Position Verlet: `x' = 2x - x_old + a·dt²`. It stores the previous position instead of velocity.
- Stick constraint: `delta = x2-x1; d=|delta|; diff=(d-rest)/d; x1 -= delta*0.5*diff; x2 += delta*0.5*diff`.
- Iterations: usually 3–4 relaxation iterations are enough for rigid bodies, between 1 and 10 were used across Hitman's objects, and cloth often needs only 1.
- A sqrt-free approximation: `delta *= rest²/(delta·delta + rest²) - 0.5`.

— [Jakobsen, "Advanced Character Physics" (Game Developer)](https://gamedeveloper.com/programming/advanced-character-physics)
- Relaxation with few iterations can look "bouncy" or stretchy. Fast motion can visibly stretch chains. — [gamedev.net thread](https://gamedev.net/forums/topic/626870-ropecloth-simulation-problems/); [Blender Artists thread](https://blenderartists.org/t/a-chain-of-dynamic-cubes-moving-about-under-physics/631887)
- Tutorial with tearable cloth and ragdolls in simple Verlet. — [Envato Tuts+](https://code.tutsplus.com/simulate-tearable-cloth-and-ragdolls-with-simple-verlet-integration--gamedev-519t)
- 2D constraint-relaxation IK reference. — [Ryan Juckett](https://www.ryanjuckett.com/constraint-relaxation-ik-in-2d/)

**Procedural legs (spiders, insects)**
- Godot 4.5 spider:
  - Each leg has a raycast sensor that projects a future step point (hit point plus velocity).
  - When that point is farther than a threshold from the current IK target, the target moves along an arc.
  - Legs are grouped into diagonal pairs, and only one group steps at a time.

  — [80.lv, IK-driven procedural spider locomotion in Godot 4.5](https://80.lv/articles/ik-driven-procedural-spider-locomotion-in-godot-4-5)
- Godwalker:
  - Each foot tracks a current and a target position. When it falls too far behind, it steps past the target in the direction of travel.
  - Per-foot parameters: step-forward distance, return speed and randomized inaccuracy.
  - Legs take turns, but this rule is suspended when two or more legs are out of range (a sudden move).
  - When the body moves faster than the foot return speed, the legs visibly lag, which reads as a dash.

  — [Josh Hirshfield, "Procedural Animation Techniques in Godwalker"](https://joshhirshfield.substack.com/p/procedural-animation-techniques-in)
- Creature IK (itch.io) exposes foot distance, step threshold, step height and step duration as the tunable leg parameters. — [nappin, Creature IK](https://nappin.itch.io/creature-ik)
- Unity gecko tutorial: cast a ray down from above the foot's home position to find the new target, and use the ray normal to orient the foot. — [willymcgeejr/UnityProceduralAnimation](https://github.com/willymcgeejr/UnityProceduralAnimation)

**Attack and recoil layering**
- Godwalker adds per-shot procedural offsets to an IK pose: positional kick, recoil rotation, and body rotation. Different weapons get different mixes. For example, the plasma rifle uses body rotation only for a "bouncy recovery". A randomized rotational "damage flick" overrides the other procedural layers. — [Godwalker](https://joshhirshfield.substack.com/p/procedural-animation-techniques-in)

### Inferences
- Recommended TypeScript structure: a `Spring1D` class (Holden's exact form, with a half-life parameter, stable at any dt) for things that should settle without bounce, plus a `SecondOrder` class (t3ssel8r f/ζ/r) for personality.
  - The r parameter is a one-number "anticipation dial". With r < 0 the part dips the wrong way before following, which gives anticipation for free.
  - The same goes for overshoot: ζ ≈ 0.3–0.6 gives bouncy, cartoony follow-through, and ζ = 1 gives a calm settle.

  These ranges are my suggestions, based on how damping ratio behaves.
- Suggested starting half-lives (not sourced, tune them):
  - antennae and ears: 60–120 ms
  - heavy belly or cape tip: 150–300 ms
  - camera and body-follow smoothing: 100–200 ms
- Idle "breathing" (not sourced, a standard pattern):
  - body `scaleY = 1 + 0.03·sin(2π·t/period)`, `scaleX = 1 - 0.015·sin(…)` (volume-ish preserve), with a period of about 1.5–3 s
  - head offset by a phase of about 0.15–0.3 rad so it lags, giving overlap for free
  - a random per-instance phase and ±10% period so a crowd doesn't move in lockstep
- Walk cycle without frames:
  - Drive a phase from distance travelled, not time (`phase += speed*dt/strideLength`). This stops foot sliding.
  - Then bob = `|sin(phase)|·amp` and lean = `velocityX·k` clamped. Feet get arcs from `sin` (lift only while positive).
- Wings: rotate each wing about its root with a flap that is fast down and slower up, by warping the phase. Add `scaleY` foreshortening (cos of the flap angle) to fake 3D. Add a body bob opposite to the downstroke. This is inferred, not from a source.
- Snake slither: move the head along a sine path perpendicular to its heading, and let an argonaut-style chain follow. The wave then propagates down the body by itself.
- Legs in Phaser: for 2-segment legs, analytic two-bone IK (law of cosines) is cheaper and more stable than FABRIK. Use FABRIK for 3+ segments.
- Combining argonaut's numbers with Godwalker gives a simple stepping recipe:
  - threshold ≈ 0.6–1.0× leg reach
  - step duration ≈ 80–150 ms
  - arc height ≈ 20–30% of the step length
  - alternate groups, or a "max one leg stepping per side" rule

  These are inferred defaults.

### Gaps
- I couldn't retrieve t3ssel8r's exact k1/k2/k3 formulas from a primary text source. The video and Patreon were not readable. The commonly reproduced form (unverified here) is `k1 = ζ/(πf)`, `k2 = 1/(2πf)²`, `k3 = r·ζ/(2πf)`, with a stable-k2 clamp `max(k2, T²/2 + T·k1/2, T·k1)`. Verify it against the video before relying on it.
- I didn't fetch Daniel Shiffman's Coding Train IK and steering episodes or CodeParade videos in this pass.

## How Rain World, Hollow Knight, Ori, Little Nightmares, Spore and demos achieve lively motion

### Takeaway
Rain World is the most relevant model. Creatures are a few physics points joined at fixed distances, with "paper doll" sprites layered on top and positioned each frame by a per-creature graphics script. Limbs and tails are cosmetic procedural additions driven by input and AI. argonaut's demos show the same idea at hobby scale: a chain plus a body outline from per-joint widths plus FABRIK legs.

### Cited Findings
- Rain World creator Joar Jakobsson: "a bunch of points in space and I connect them at certain distances". Each creature is "basically a paper doll", which makes creatures "soft and bendable" and lets them move through almost any environment. — [Game Developer, "Crafting the complex, chaotic ecosystem of Rain World"](https://gamedeveloper.com/design/crafting-the-complex-chaotic-ecosystem-of-i-rain-world-i-)
- The slugcat is two spherical chunks locked at a fixed distance, which lets it tumble and rotate. Its limbs and tail are "cosmetic additions drawn on top of this base", animated procedurally from player inputs. Jakobsson first mixed classical and procedural animation, then moved toward procedural. Each creature needs unique body-building and movement code (stubby legs, spider legs, fins, jet propulsion, tentacles, wings). Sprites are positioned and colored by each creature's graphics script. — [Unity blog, "Exploring procedural design in Rain World: The Watcher"](https://unity.com/en/blog/exploring-procedural-design-rain-world)
- Rain World's vulture wing tips are moved by code, while hinge joints control the rest. Grow Home has code that places the feet while ragdoll constraints keep the motion plausible. — [Alan Zucconi, "An Introduction to Procedural Animations"](https://www.alanzucconi.com/2017/04/17/procedural-animations/)
- argonaut's fish, snake and lizard use "a 2D chain simulation for rigging". The parameters are in the previous section. — [argonautcode/animal-proc-anim](https://github.com/argonautcode/animal-proc-anim)
- Many hobby projects are built from argonaut's video, for example an itch.io port. — [humensmoc, procedural-anim on itch.io](https://humensmoc.itch.io/procedural-anim)

### Inferences
- The Rain World pattern maps directly onto Phaser:
  - A tiny simulation (2–3 Verlet points, or a chain) owns the physics.
  - A `Container` of simple shapes, or a few `Image` parts, is posed from those points every frame: position at the point, rotation from `atan2` between points.
  - Cosmetic limbs and tails are solved after the simulation.

  Gameplay never depends on the cosmetic layer, so it can be dropped at a lower level of detail.

### Gaps
- I found no primary technical sources for Hollow Knight, Ori, Little Nightmares or Spore. They mostly use hand-keyed or skeletal animation (Spore uses procedural rigging in 3D), so their transferable lessons come down to Cooper's principles above. That characterization is unverified here.
- I found no GDC Rain World talk transcript. A Jakobsson talk on procedural animation and AI is listed on ti.to, but that it was a GDC session is unconfirmed. — [ti.to listing](https://ti.to/techmeetupspace/rain-world-creator-joar-jakobsson)

## Animating a single flat silhouette image cheaply

### Takeaway
A single silhouette can feel alive with transform-only tricks on a pivot:
- squash and stretch about a bottom pivot
- a small rotation sway
- a shear-like lean
- a hop arc

For more life, split it into 2–5 parts (body, head, 1–2 limbs or tail) as separate images in a container. Each part gets its own pivot and phase-offset springs. This is the "paper doll" model Rain World uses.

### Cited Findings
- Rain World builds creatures as "paper doll" sprites positioned by a graphics script on top of a few simulated points. — [Game Developer](https://gamedeveloper.com/design/crafting-the-complex-chaotic-ecosystem-of-i-rain-world-i-); [Unity blog](https://unity.com/en/blog/exploring-procedural-design-rain-world)
- Squash and stretch should preserve volume. Scale the other axis inversely. — [Game Developer / Cooper](https://gamedeveloper.com/production/the-12-principles-of-animation-in-video-games)
- Phaser Containers have a fixed transform point at local [0,0]. Children are positioned around it, and rotating the container rotates every child. — [Phaser docs, Container](https://docs.phaser.io/phaser/concepts/gameobjects/container)

### Inferences
- Single image recipe (unsourced, standard practice):
  - `setOrigin(0.5, 1)` so the feet stay planted while scaling.
  - Idle: `scaleY` ±3% and a sine rotation of ±2–3°.
  - Hop: on takeoff, a fast `scaleY` 0.8 → 1.15 (squash, then stretch); at landing, `scaleY` 0.85 with a spring back to 1.
  - Lean into motion: rotate by about `vx·0.02` rad, clamped to about 10°.
- Phaser 3 `Image` has no built-in skew property, as far as I know (unverified). True shear needs a `Mesh` or `Plane`, a shader, or redrawing a `Graphics` shape. A cheap substitute is rotation plus non-uniform scale.
- Phaser 3's `Rope` game object (unverified) can bend one texture along a list of points. Driven by a chain, it would let a single tail, snake or tentacle image wiggle without splitting it.
- Splitting for an AI or maker pipeline: cut the silhouette along 1–4 lines into body, head, tail/arm and leg parts. Store a pivot per part at the cut joint. Give each part a `SecondOrder` spring on rotation, driven by body velocity and acceleration. Overlap then emerges from different f/ζ per part. Even 2 parts (body plus head with a lagging spring) noticeably improves appeal.

### Gaps
- I found no published benchmark or tutorial specifically on "silhouette splitting" for 2D games.
- Phaser's skew, Mesh and Rope APIs need checking against the exact Phaser version in use.

## Performance for dozens of characters in a browser at 60 fps

### Takeaway
The math (springs, chains with 10–20 points, 2-bone IK) costs very little for dozens of characters. The real costs are rendering and display-list overhead:
- Redrawing `Graphics` paths every frame.
- Deep or nested Containers.
- Mixing object types that break batching.

Bake shapes to textures once, animate Images by transform, and keep Containers one level deep.

### Cited Findings
- Containers "add additional processing overhead into every one of their children". The cost grows with nesting depth, input handling is especially affected, and child depth control is limited. Use them only when needed, keep nesting shallow, and use a Group when you don't need shared transforms. — [Phaser docs, Container](https://docs.phaser.io/phaser/concepts/gameobjects/container)
- Since Phaser 3.12, Graphics share the sprite batch pipeline, so mixing Graphics and Sprites no longer forces a batch flush. Fill and line styles are cached. — [Phaser 3.12 changelog](https://unpkg.com/phaser@4.2.1/changelog/v3/3.12/CHANGELOG-v3.12.md); [GitHub release v3.12.0-beta2](https://github.com/phaserjs/phaser/releases/tag/v3.12.0-beta2)
- One user's grid of about 174 Text and Graphics objects slowed down as cells updated. This is anecdotal. — [Phaser Discourse, rendering performance problem](https://phaser.discourse.group/t/rendering-performance-problem/11069)
- RenderTexture and DynamicTexture "redraw" modes exist for textures that change every frame. Regenerating a mipmap costs more than 10 µs. — [Phaser RenderTexture source](https://app.unpkg.com/phaser@4.2.1/files/src/gameobjects/rendertexture/RenderTexture.js)
- Jakobsen's sqrt-free constraint and low iteration counts (cloth often needs 1) keep Verlet cheap. — [Advanced Character Physics](https://gamedeveloper.com/programming/advanced-character-physics)
- argonaut's FABRIK runs only one forward and one backward pass per frame, without iterating to convergence, and still looks good. — [Chain.pde](https://raw.githubusercontent.com/argonautcode/animal-proc-anim/main/Chain.pde)

### Inferences
- Recommended budget (inferred):
  - Bake each part's vector shape once with `Graphics.generateTexture(key)` and render it as an `Image`.
  - Use per-frame `Graphics.clear()` and redraw only for things that truly deform (a tail outline from chain widths, legs as curves). Cap these, for example to the hero and a few on-screen bosses.
  - Use one Graphics object for all leg lines of all spiders rather than one per spider.
- Pool spring and chain state in flat typed arrays (`Float32Array`) per character type. Update everything in one `scene.update` loop instead of hundreds of individual tweens. Phaser tweens are fine for one-shot actions (attack wind-up, hit flash), but continuous idles are cheaper as one `sin(t)` per object.
- Level of detail:
  - Skip the cosmetic chain, spring and IK solve for off-screen characters (camera cull).
  - Run distant ones at half rate.
  - Use fewer chain segments for small monsters (6–8 instead of 14).
- Use a fixed-step or clamped dt (e.g. `min(dt, 1/30)`), because Verlet and semi-implicit springs explode on tab-switch frame spikes. Holden's exact spring is unconditionally stable. — inference supported by [Hackaday on stability](https://hackaday.com/tag/game-design) and [The Orange Duck](https://theorangeduck.com/page/spring-roll-call)

### Gaps
- I found no hard benchmark numbers for "N procedurally animated containers in Phaser 3 at 60 fps". Benchmark in the target project on a mid-range phone.
- Phaser 3 vs Phaser 4 renderer differences were not investigated.
