# Phaser 3 (3.80–3.90) techniques for code-drawn silhouette characters, monsters and lighting

Scope: Phaser 3 with WebGL only (not Phaser 4). Phaser 4 renamed or removed several of these APIs. For example, `setTintFill` is a no-op in v4 ([v4 reference](https://unpkg.com/phaser@4.2.1/skills/v4-new-features/references/REFERENCE.md)), and FX became "filters" ([Phaser 4 Glow filter](https://docs.phaser.io/api-documentation/4.0.0/class/filters-glow)). Pin the dependency to `phaser@3.90.x`.

## Q1. Which preFX/postFX are usable for rim light, emissive eyes, attack-charge glow and hit flash, and what do they cost in WebGL?

### Takeaway
The 3.60+ FX system (Glow, Shadow, Bloom, ColorMatrix, Displacement, Barrel, Vignette and others) covers everything on the list. It is WebGL-only and shader-based, and each FX is an extra render pass. Put per-object FX only on a few hero objects, such as the player, a boss, or one charging enemy. Put global looks (vignette, bloom, colour grade) on the camera's postFX once, not on every monster. Do hit flash with `setTintFill`, which is free, not with an FX.

### Cited Findings
**What exists, and where it can go**
- The FX pipeline arrived in v3.60 and is WebGL only. **preFX** works only on texture-based objects: Image, Sprite, TileSprite, Text, RenderTexture and Video. **postFX** works on all Game Objects and on cameras. — [Phaser FX concepts](https://docs.phaser.io/phaser/concepts/fx)
- Containers support postFX but not preFX. Plane supports postFX but not preFX. — [Container docs](https://docs.phaser.io/phaser/concepts/gameobjects/container); [Plane docs](https://docs.phaser.io/phaser/concepts/gameobjects/plane)
- Each `add*` call returns an FX controller whose properties can change at runtime, including from tweens. Effects stack, and their order changes the result. The 14 effects are Barrel, Bloom, Blur, Bokeh/TiltShift, Circle, ColorMatrix, Displacement, Glow, Gradient, Pixelate, Shadow, Shine, Vignette and Wipe, plus `addReveal`. — [3.60 FX changelog](https://cdn.jsdelivr.net/npm/phaser@4.1.0/changelog/v3/3.60/FX.md)
- To switch effects off or remove them, use `fx.setActive(false)`, `preFX.remove(fx)`, `preFX.clear()` or `preFX.disable(true)`. — [FX concepts](https://docs.phaser.io/phaser/concepts/fx)

**Parameters and defaults** (all from [FX concepts](https://docs.phaser.io/phaser/concepts/fx))
- **Glow**: `addGlow(color=0xffffff, outerStrength=4, innerStrength=0, knockout=false)`. The postFX version also takes `quality=0.1` and `distance=10`, and both are fixed once the effect is created. `knockout:true` draws only the glow, not the texture, which gives a glow-only halo layer.
- **Shadow**: `addShadow(x=0, y=0, decay=0.1, power=1, color=0x000000, samples (1–12), intensity=1)`.
- **Bloom**: `color`, `offsetX/offsetY=1`, `blurStrength=1`, `strength=1`, `steps=4`. More steps give a smoother result, but the docs say the cost "grows exponentially with more GL operations".
- **Blur**: `quality` (0 low, 1 medium, 2 high), `x/y=2`, `strength=1`, `color`, `steps`.
- **ColorMatrix**: takes no arguments. It has methods such as `brightness`, `saturate`, `hue`, `grayscale`, `sepia`, `night`, `polaroid`, `kodachrome` and `lsd`. Each takes a `multiply` flag (default false) for stacking.
- **Displacement**: `addDisplacement(texture='__WHITE', x=0.005, y=0.005)`. It needs a whole texture in the Texture Manager. Atlas and spritesheet frames are not supported.
- **Barrel**: `amount`, where 1 means no distortion. It needs `preFX.setPadding()` when `amount` is above 1.
- **Vignette**: `x/y=0.5`, `radius=0.5`, `strength=0.5`, all in 0–1 range.
- **Shine**: `speed=0.5`, `lineWidth=0.5`, `gradient=3`, `reveal`. It gives a sweeping highlight, for example a "charged" sheen.
- **Gradient** and **Circle** also exist. Phaser 4 drops them in favour of the p3-fx project. — [search summary of Phaser notes](https://docs.phaser.io/phaser/concepts/fx)

**Padding**
- preFX glow and shadow need extra texture room. Use `sprite.preFX.setPadding(px)`. This is not needed for postFX. — [FX component docs (3.85)](https://newdocs.phaser.io/docs/3.85.2/Phaser.GameObjects.Components.FX); [FX concepts](https://docs.phaser.io/phaser/concepts/fx)

**Cost**
- preFX runs on a texture sized to the Game Object, not the whole canvas. The docs call this "a much more efficient way" to apply intensive effects such as blur, bloom or glow. — [FX component docs](https://newdocs.phaser.io/docs/3.85.2/Phaser.GameObjects.Components.FX)
- Putting one effect on the camera's postFX is "a much faster way of doing it than applying the same effect to every child in a Scene." — [3.60 FX changelog](https://cdn.jsdelivr.net/npm/phaser@4.1.0/changelog/v3/3.60/FX.md)
- Internally, all preFX pipelines share pooled RenderTargets. These start at 32px and grow in steps of 32 (`frameInc`), which keeps VRAM use low. — [3.60 FX changelog](https://cdn.jsdelivr.net/npm/phaser@4.1.0/changelog/v3/3.60/FX.md)

**Hit flash**
- `setTintFill(color)` replaces the texture's pixel colours with the tint while keeping alpha. It is WebGL only. The docs' own example is a player flashing white when hit. `clearTint()` restores the sprite. — [Tint component docs](https://docs.phaser.io/api-documentation/3.90.0/namespace/gameobjects-components-tint)
- Tints are "practically free". — [Phaser Discourse reply](https://phaser.discourse.group/t/is-generatetexture-culled-by-the-viewport-camera/7167/4)
- Rope also has `setTintFill(mode)`: 0 = additive (default), 1 = fill with alpha, 2 = fill without alpha. — [Rope docs](https://docs.phaser.io/phaser/concepts/gameobjects/rope)

**Outline and rim light**
- The rexrainbow plugins add WebGL filters for inner and outer glow, Shadow, Vignette and Key, which work on any Game Object or camera. Built-in Glow with `innerStrength>0` gives a soft inner rim. — [rex notes index](https://docs.phaser.io/phaser/concepts/fx); [Glow FX pipeline](https://docs.phaser.io/api-documentation/3.88.2/class/renderer-webgl-pipelines-fx-glowfxpipeline)

### Inferences
- **Recommended mapping:**
  - Rim light on the hero: `preFX.addGlow(rimColor, 2, 0)` with padding of about 8–16 px, or bake a lighter rim stroke into the texture (free).
  - Emissive eyes: a separate small additive sprite or particle, not an FX.
  - Attack-charge glow: tween `glow.outerStrength` from 0 to 6, or tween `shine`, then remove the FX afterwards.
  - Hit flash: `setTintFill(0xffffff)` for 60–90 ms, then `clearTint()`.
  - Hurt or desaturate states: one ColorMatrix (`grayscale`/`saturate`), applied only while the state is active.
  - Global look: on `cameras.main.postFX`, one `addVignette(0.5,0.5,0.85,0.4)` plus optionally a cheap `addBloom` (steps 2–4) or ColorMatrix grade.
- Each per-object FX adds draw passes and breaks batching, so "dozens of monsters each with a Glow" is the expensive pattern to avoid. A preFX on a Container is impossible. To glow a multi-part Container monster, use postFX on the container (costlier) or bake the monster to a RenderTexture.

### Gaps
- I found no official benchmark, forum benchmark or GitHub benchmark giving FX-per-frame numbers for mid-range phones. Device profiling is required.

## Q2. "Lights in darkness": Light2D with normal maps vs render-texture light masks vs additive sprites

### Takeaway
For code-drawn silhouettes, the practical choice is a full-screen darkness RenderTexture that you fill and then **erase** soft light-gradient stamps from each frame, plus **ADD**-blend glow sprites for coloured light. Light2D needs normal maps and cannot light Graphics or Shapes, so it suits painted, textured art rather than procedural silhouettes. `PointLight` objects are the cheap Light2D-family option for torch-style blobs.

### Cited Findings
**Light2D**
- Enable it with `obj.setPipeline('Light2D')`, `this.lights.enable()` and `this.lights.setAmbientColor(0x101018)`. Add a light with `this.lights.addLight(x, y, radius=128, color=0xffffff, intensity=1)`. — [Lights concepts](https://docs.phaser.io/phaser/concepts/gameobjects/light)
- Objects on Light2D are lit only when they have a normal map. Load one with `this.load.image(key, [url, normalUrl])`. — [Lights concepts](https://docs.phaser.io/phaser/concepts/gameobjects/light)
- On older versions, sprites without a normal map disappeared under Light2D. One workaround is a flat `#7F7FFF` normal map. — [Discourse thread (v3.18)](https://phaser.discourse.group/t/phaser3-webgl-lights-light2d-am-i-missing-something-or-are-they-broken/3016)
- "Note that you cannot use this pipeline on Graphics Game Objects or Shape Game Objects." — [LightsPlugin API 3.88](https://docs.phaser.io/api-documentation/3.88.2/class/gameobjects-lightsplugin)
- The max light count comes from render config `maxLights`, default 10. The official example raises it to 20. — [LightPipeline API](https://docs.phaser.io/api-documentation/class/renderer-webgl-pipelines-lightpipeline); [Phaser example](https://phaser.io/examples-show/4035)
- Lights are WebGL only, cannot go inside Containers, and must sit at the scene root. — [Lights concepts](https://docs.phaser.io/phaser/concepts/gameobjects/light)

**PointLight**
- `this.lights.addPointLight(x, y, color, radius, intensity, attenuation=0.1)` uses its own shader and is "much cheaper to render" than a Light. It doesn't light other objects and ignores normal maps. That makes it good for torches, muzzle flashes and glowing eyes. — [Lights concepts](https://docs.phaser.io/phaser/concepts/gameobjects/light)

**RenderTexture darkness mask**
- RenderTexture API: `rt.fill(rgb, alpha)`, `rt.clear()`, `rt.draw(entries, x, y, alpha, tint)`, `rt.erase(entries, x, y)`, `rt.stamp(key, frame, x, y, {alpha, scale, blendMode, erase})`, and batching with `beginDraw()` / `batchDraw()` / `endDraw()`. — [RenderTexture docs](https://docs.phaser.io/phaser/concepts/gameobjects/render-texture)
- The WebGL blend modes are NORMAL, ADD, MULTIPLY, SCREEN and ERASE. ERASE only works when rendering to a framebuffer such as a RenderTexture. Each change of blend mode causes a WebGL batch flush. — [BlendMode API 3.90](https://docs.phaser.io/api-documentation/3.90.0/namespace/gameobjects-components-blendmode); [Blend mode concept](https://docs.phaser.io/phaser/concepts/display/blend-mode)
- Under WebGL1, framebuffers can't be anti-aliased. Pre-make shapes as textures before drawing them into an RT. — [RenderTexture docs](https://docs.phaser.io/phaser/concepts/gameobjects/render-texture)
- Community patterns:
  - Fill an RT black and erase light holes with `destination-out` or erase stamps. With a canvas texture, call `texture.refresh()`. — [Noob Detective devlog](https://noobongames.itch.io/noob-detective/devlog/176581/beginners-devlog-3-creating-a-night-map-in-phaser-3-its-getting-dark)
  - Use a second RT as a bitmap-mask source. — [Discourse](https://phaser.discourse.group/t/use-multiple-masks-on-a-render-texture/8578)
  - Official examples include "Erase Part Of Render Texture". — [Phaser render-texture examples](https://editor.phaser.io/examples/v3.55.0/game-objects/render-texture)
  - Official tutorial on using an RT as an alpha mask for spotlights. — [Phaser reveal-effect tutorial](https://phaser.io/news/2021/03/reveal-effect-with-alpha-masks-tutorial)

### Inferences
**Recommended "gloom" recipe** (no normal maps needed):
1. At boot, generate a radial gradient texture `'lightBlob'` (white at the centre to transparent at the edge) on a CanvasTexture with `createRadialGradient`.
2. Create one screen-sized `darkRT` with `setScrollFactor(0)` and depth above the world.
3. Each frame:
   - `darkRT.clear().fill(0x05060a, 0.85)`
   - `darkRT.beginDraw()`
   - For each light: `darkRT.stamp('lightBlob', null, sx, sy, {scale:r/128, erase:true, skipBatch:true})`
   - `darkRT.endDraw()`
4. On top, add `ADD`-blend tinted copies of `lightBlob` for coloured warmth (ember orange, eye red). Use `SCREEN` for softer bloom-like light and `MULTIPLY` for colour-grading shadow overlays.

**Notes on the recipe:**
- Flicker comes from tweening scale and alpha with small noise.
- Keep ADD sprites grouped so the blend mode changes rarely, because each change is a flush.
- Silhouettes read best as near-black shapes against lit backgrounds. A thin rim (a baked stroke, or a Glow on the hero only) separates them when they stand in darkness.

### Gaps
- I found no official or community benchmark comparing the cost of Light2D with the RT-mask approach. I did not verify whether Rope or Mesh accept Light2D.

## Q3. Rope for tails, capes and tentacles; Containers for procedural limb animation

### Takeaway
`Rope` is a textured strip whose points you move every frame, a cheap fit for tails, capes and tentacles. Animate it with verlet or sine chains and call `setDirty()`. Build monsters as Containers of part-Images (torso, head, limbs) driven by sine tweens and IK math. Keep nesting shallow, because Containers add per-child cost and block preFX.

### Cited Findings
**Rope**
- Create it with `this.add.rope(x, y, texture, frame, points, horizontal, colors, alphas)`. `points` is either a number (how many segments to split the frame into) or an array of vertices relative to the rope's position. — [Rope docs](https://docs.phaser.io/phaser/concepts/gameobjects/rope)
- Animate the shape by changing `rope.points[i].x/y` in `update()` and then calling `rope.setDirty()` (or `updateVertices()`). Use `setPoints(points, colors, alphas)` to replace the points. — [Rope docs](https://docs.phaser.io/phaser/concepts/gameobjects/rope)
- Horizontal ropes are edited through `points[i].y` and vertical ropes through `points[i].x`. `setColors(array)` and `setAlphas(top, bottom)` or per-point arrays can fade a tentacle to transparent at its tip. `rope.play(animKey)` animates the texture itself. — [Rope docs](https://docs.phaser.io/phaser/concepts/gameobjects/rope)

**Containers**
- Containers add overhead to every child, and "the deeper you nest them, the more the cost escalates". Their origin is fixed at 0,0, so place children around the centre. They don't support preFX. Masks only apply on root containers. Physics on children ignores the container transform. — [Container docs](https://docs.phaser.io/phaser/concepts/gameobjects/container)

**Plane and Mesh**
- `this.add.plane(x, y, key, frame, widthCells, heightCells, tile)` is a grid Mesh with per-vertex control and 3-axis rotation for perspective. It batches like a Sprite, with no extra shader overhead. It supports postFX but not preFX. — [Plane docs](https://docs.phaser.io/phaser/concepts/gameobjects/plane)

### Inferences
- **Tentacle or tail:**
  - Use `rope = this.add.rope(0, 0, 'tentacleTex', null, 16)`, a texture tapered in the canvas.
  - Each frame, for each point i, set `p.y = Math.sin(t*0.004 + i*0.5) * amp * (i/N)` so the tip moves more than the root, then call `setDirty()`.
  - For physical lag, run a simple verlet chain (each point follows the previous one at a fixed length) and copy the positions into the rope.
- **Cape:** a vertical rope pinned at the shoulders, with a follow-delay on the hero's velocity.
- **Creeping or heaving body:** wobble Plane vertices.
- **Limbs:**
  - Make one Container per monster, children 4–10 Images from a shared atlas, one nesting level, and keep the Rope as a child too.
  - Drive the parts with yoyo tweens for idle breathing (`scaleY` 1 to 1.04 over about 900 ms, `Sine.easeInOut`) or with per-frame trig in `update` for walk cycles.
  - For many monsters, prefer flat sprites plus a manual transform in `update` over deep nesting.

### Gaps
- I found no official Rope tentacle demo source with verlet code. The pattern above is standard practice rather than a cited Phaser example.

## Q4. Crisp silhouettes: canvas and Path2D textures at 2–3x, Graphics vs textures, filtering and mipmaps

### Takeaway
Draw each silhouette once into a CanvasTexture using the browser's anti-aliased 2D canvas (Path2D, bezier and quadratic curves), at 2–3x the display size. Show it as a Sprite or Image scaled down, with LINEAR filtering. This beats a live `Graphics` object, which re-triangulates every frame and is not anti-aliased under WebGL. If monsters are drawn very small, turn on mipmaps and use power-of-two atlas pages.

### Cited Findings
**CanvasTexture**
- `this.textures.createCanvas(key, w, h)` gives a texture whose `getContext()` returns a normal 2D context. After drawing on the context, call `refresh()` to upload to WebGL, or `update()` if you also read pixels. `addCanvas(key, canvas)` wraps an existing canvas. — [Textures docs](https://docs.phaser.io/phaser/concepts/textures)
- Set filtering with `texture.setFilter(Phaser.Textures.FilterMode.LINEAR | NEAREST)`. Safe maximum texture size is about 2048 px on mobile and about 4096 px on desktop. Check with `renderer.getMaxTextureSize()`. — [Textures docs](https://docs.phaser.io/phaser/concepts/textures)

**Graphics vs textures**
- A Graphics object re-renders its whole contents every frame, while textures cost more memory but are cheaper to draw. Rectangle Shapes cache their triangles, whereas Graphics recalculates them every tick. `generateTexture` produces a static snapshot that later drawing doesn't update. — [Discourse: generateTexture](https://phaser.discourse.group/t/is-generatetexture-culled-by-the-viewport-camera/7167/4); [Discourse: rendering performance](https://phaser.discourse.group/t/rendering-performance-problem/11069)
- WebGL1 framebuffers can't be anti-aliased. — [RenderTexture docs](https://docs.phaser.io/phaser/concepts/gameobjects/render-texture)

**Mipmaps**
- Since v3.60, no mipmaps are generated unless the game config sets `render: { mipmapFilter: 'LINEAR_MIPMAP_LINEAR' }` (or another option, listed from cheapest to costliest). Mipmaps need power-of-two textures. Downscaled sprites alias without them. — [WebGLRenderer.mipmapFilter 3.80](https://newdocs.phaser.io/docs/3.80.0/focus/Phaser.Renderer.WebGL.WebGLRenderer-mipmapFilter); [Spine forum on Phaser downscale blur](https://ru.esotericsoftware.com/forum/d/28522-textures-losing-quality-when-scaled-down-in-using-phaser-3-runtime)

**Canvas 2D**
- Path2D objects can be built once and reused with `ctx.fill(path)` or `ctx.stroke(path)`, and they accept SVG path strings. For sharpness on high-DPI screens, scale the canvas backing store by `devicePixelRatio`. — [MDN Path2D](https://developer.mozilla.org/en-US/docs/Web/API/Path2D); [MDN devicePixelRatio](https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio)

### Inferences
**Recipe:**
1. Set `const S = 3`.
2. Create `tex = this.textures.createCanvas('wolf', 128*S, 96*S)`, then `ctx = tex.getContext()` and `ctx.scale(S, S)`.
3. Draw the body with `bezierCurveTo` and `quadraticCurveTo` in a near-black fill.
4. Add a 1–1.5 px lighter rim stroke on the light-facing edge, using `ctx.save(); ctx.clip(path)` and a stroke offset toward the light.
5. Punch the eyes as separate frames.
6. Call `tex.refresh()`.
7. Display with `this.add.image(x, y, 'wolf').setScale(1/S)`.

**Production details:**
- Draw each body part to its own region of one big canvas, which acts as a code-built atlas. Register frames with `tex.add(name, 0, x, y, w, h)` so every monster shares a single texture and batches into one draw call.
- Keep atlas pages at power-of-two sizes (1024 or 2048) if you enable mipmaps.
- Keep `pixelArt: false` and `antialias: true` (the default) for smooth silhouettes.
- Use `Graphics` only for things that change shape every frame, such as telegraph arcs, debug and UI. Even then, prefer pre-baked arc textures that are scaled and rotated.

### Gaps
- I did not confirm from a primary page how the `antialias` / `antialiasGL` config interacts with `mipmapFilter`. A texture-level setter for mipmaps was also not confirmed.

## Q5. Particles, tweens, timelines and camera effects for embers, dust, spit and telegraphs

### Takeaway
The 3.60+ `this.add.particles(x, y, key, config)` returns an emitter that is itself a display object. With a tiny shared soft-dot texture and `blendMode: 'ADD'`, it covers embers, dust and spit cheaply. Use Timelines and tween chains to script telegraphs (wind-up, flash, strike), and camera shake, flash and zoom for impact.

### Cited Findings
**Particles**
- 3.60 removed ParticleEmitterManager. `this.add.particles(x, y, 'flares', {...})` now returns a ParticleEmitter Game Object. — [Particles docs](https://docs.phaser.io/phaser/concepts/gameobjects/particles)
- Config keys: `speed`/`speedX`/`speedY`, `lifespan` (ms), `scale:{start,end,ease}`, `alpha`, `blendMode`, `frequency` (-1 = explode mode), `quantity`, `emitting`, `maxParticles` (hard cap), `follow` + `followOffset`, `emitZone` (random or edge over a geometry or curve), `deathZone`, `tint`/`color` + `colorEase` (WebGL), `gravityY`, `stopAfter`, `duration`. — [Particles docs](https://docs.phaser.io/phaser/concepts/gameobjects/particles)
- `emitter.explode(count, x, y)` gives one-shot bursts (spit, impact). Pooling: `reserve(n)` pre-allocates dead particles, `getAliveParticleCount()` reports what's live, and `killAll()` clears. — [Particles docs](https://docs.phaser.io/phaser/concepts/gameobjects/particles)

**Timelines**
- `this.add.timeline([...]).play()`. Events use `at` (absolute ms), `in` or `from` (relative ms). Actions are `set`, `tween`, `run`, `sound` and `event`. `once` and `stop` control flow, and `repeat()` loops. — [Time / Timeline docs](https://docs.phaser.io/phaser/concepts/time)

**Camera effects** (3.88 signatures)
- `shake(duration=100, intensity=0.05)`
- `flash(duration=250, r=255, g=255, b=255)`
- `fade(duration=1000, r=0, g=0, b=0)`
- `zoomTo(zoom, duration=1000, ease)`
- `pan(x, y, duration=1000)`
- Most won't interrupt a running effect unless `force=true`.
- [Camera API 3.88.2](https://docs.phaser.io/api-documentation/3.88.2/class/cameras-scene2d-camera); [Cameras concepts](https://docs.phaser.io/phaser/concepts/cameras)
- Don't start camera effects every update. Tween `zoom` or `scroll` directly for continuous motion. — [Cameras concepts](https://docs.phaser.io/phaser/concepts/cameras)

### Inferences
- **Embers:** `{lifespan:{min:800,max:1600}, speedY:{min:-40,max:-15}, speedX:{min:-10,max:10}, scale:{start:0.5,end:0}, alpha:{start:1,end:0}, tint:[0xff6a00,0xffb347], blendMode:'ADD', frequency:80, maxParticles:60}`
- **Dust puffs on landing:** `explode(6)` with a grey NORMAL-blend, `scale 0.3→1`, `alpha 0.5→0`.
- **Spit:** `explode(10)` with `speed 150–250`, `gravityY:400` and green tint.
- **Telegraph timeline:**
  1. `at:0` tween `scaleY` 1 to 0.9 (crouch) and tint toward red, or tween a glow `outerStrength` 0 to 5 on a boss only.
  2. `at:350` `setTintFill(0xffffff)` for one frame-pair.
  3. `at:420` strike tween, plus `camera.shake(120, 0.006)`.
  4. `at:600` `clearTint`.
- The shake values above are much below the 0.05 default. 0.05 is violent on mobile. This is my judgement, not a cited figure.

### Gaps
- I did not fetch the `this.tweens.chain()` syntax from primary docs.

## Q6. Performance for dozens of animated monsters at 60 fps on mid-range phones

### Takeaway
The biggest levers are:
- one shared atlas (one texture, so the whole batch is a single draw call)
- few blend-mode switches
- no per-monster FX
- pooled particles with `maxParticles` caps
- flat sprites rather than deep Containers
- one camera-level postFX for the global look

Phaser 3.60's renderer rework specifically improved mobile batching.

### Cited Findings
- Each texture switch costs a bind and an extra draw, so sharing an atlas reduces both. 3.50 added multi-texture batching (typically 16 textures per draw call). Phaser's changelog says the renderer was tripped up on mobile by the GPU blocking caused by `bufferSubData`. 3.60 moved to a hybrid batch system. The reported iPhone SE benchmark rose from 192 texture binds under v3.50 to 15,104 texture binds "at a rock solid 60 fps". — [3.60 Mobile Performance changelog](https://unpkg.com/phaser@4.2.1/changelog/v3/3.60/MobilePerformance.md); [Phaser Dev Log Oct 2022](https://phaser.io/devlogs/270)
- Blend mode changes flush the WebGL batch. — [BlendMode API](https://docs.phaser.io/api-documentation/3.90.0/namespace/gameobjects-components-blendmode)
- Container cost grows with nesting depth. — [Container docs](https://docs.phaser.io/phaser/concepts/gameobjects/container)
- Camera-level postFX is much faster than applying the same FX to each child. — [3.60 FX changelog](https://cdn.jsdelivr.net/npm/phaser@4.1.0/changelog/v3/3.60/FX.md)
- Bloom and Blur `steps` raise cost steeply. — [FX concepts](https://docs.phaser.io/phaser/concepts/fx)
- Graphics redraws everything every frame, while tints are practically free. — [Discourse](https://phaser.discourse.group/t/is-generatetexture-culled-by-the-viewport-camera/7167/4)
- Plane and Mesh batch like Sprites. — [Plane docs](https://docs.phaser.io/phaser/concepts/gameobjects/plane)
- Safe texture size on mobile is about 2048 px. — [Textures docs](https://docs.phaser.io/phaser/concepts/textures)

### Inferences
**Practical budget** (my estimates; nothing published gives these numbers):
- 30–60 monsters × 5–8 atlas parts is about 300–500 quads. That is fine on mid-range phones if it's one texture and few blend switches.
- Particles: about 300–600 live in total, split across about 4–8 emitters with `maxParticles` caps.
- Per-object preFX: 1–3 objects at a time.
- Camera postFX: 1–2 cheap ones (Vignette, ColorMatrix). Bloom with steps ≤ 4 only if profiling allows.
- Light2D lights: avoid them, or keep ≤ 10 (the default `maxLights`).
- The darkness RT costs one full-screen clear, fill and stamp batch per frame. Render it at half resolution and scale it ×2 if fill-rate is tight.

**Other habits:**
- Pool monsters and projectiles with Groups (`get()`, `setActive(false)`, `setVisible(false)`) instead of create/destroy.
- Bake every procedural shape to the atlas once at boot.
- Animate with transforms and tints, not by redrawing.
- Order the display list so ADD-blend objects sit together.

### Gaps
- I found no published Phaser 3 benchmark giving concrete FX or particle counts for mid-range Android or iOS devices. The budget above is an estimate and must be checked by profiling on the target device.
