# Silhouette and Shape-Language Design for Heroes and Enemies in Flat-Silhouette 2D Games

Scope note: These notes cover 2D side-view games and flat or near-flat colour art. Sourcing is uneven. The strongest primary sources are Valve (TF2 paper and talks), Moon Studios via Xbox Wire, Team Cherry via MCV/UK, and peer-reviewed baby-schema studies. Shape-language conventions come mostly from tutorial and blog sources. Under "Inferences", rules are turned into numbers and code-drawable heuristics. They are my synthesis, not sourced facts.

## Q1. Core silhouette principles (shape language, big-medium-small, negative space, asymmetry, line of action, exaggeration, small-size readability)

### Takeaway
A character must be identifiable as a solid black fill with no interior detail. Valve validated its TF2 classes this way and calls the silhouette "a building block of character design". Shape language (circle = friendly, square = stable, triangle = dangerous) is a working convention, not proven psychology. Read order should be big shape first, medium second, small third.

### Cited Findings
- Valve's goal for TF2: class differentiation is "the core of Team Fortress 2", so classes had to be clearly differentiated visually. Silhouette was the primary method ("very unique shapes"), varied through footwear, hats and clothing folds — [Valve NPAR07 slides](https://cdn.fastly.steamstatic.com/apps/valve/2007/NPAR07_IllustrativeRenderingInTeamFortress2_Slides.pdf); [Mitchell et al., Illustrative Rendering in TF2](https://www.cs.princeton.edu/courses/archive/fall07/cos597B/papers/mitchell-team-fortress.pdf)
- Valve reports the characters are readily identifiable "even when viewed only in silhouette with no internal shading at all". It used this test to validate concept designs — [Mitchell et al. course notes](https://www.advances.realtimerendering.com/s2007/Mitchell-IllustrativeRenderingInTF2(Siggraph07%20Course%20Notes).pdf)
- Interior folds and details were drawn to repeat the silhouette's shapes, which reinforces the outer shape — [Mitchell et al.](https://www.cs.princeton.edu/courses/archive/fall07/cos597B/papers/mitchell-team-fortress.pdf)
- Moby Francke (Valve) called the silhouette "a building block of character design". Valve posed characters in three-quarter view to pack more identifying information into the outline. Its read hierarchy was colour (team), then shape (class), then fine detail kept on the upper chest — [Game Developer, "How Valve Makes Art To Enhance Gameplay"](https://gamedeveloper.com/art/in-depth-how-valve-makes-art-to-enhance-gameplay)
- Shape-language convention: circles read as friendly and approachable, squares as stable and sturdy, triangles as aggressive or dangerous. Strong silhouettes let a character be recognised "even at a distance or in low lighting" — [RocketBrush, shape language in game character design](https://rocketbrush.com/blog/shape-language-in-game-character-design-how-to-make-characters-readable-and-consistent); [3DSense](https://3dsense.net/blogs/shape-language-in-character-design-communicating-through-geometry)
- Role contrast at blockout stage: a blocky, low-centred tank vs a sharp-angled fast enemy vs a rounder, upright support unit. The differences should be visible "even in greybox" — [RocketBrush](https://rocketbrush.com/blog/shape-language-in-game-character-design-how-to-make-characters-readable-and-consistent)
- Avoid building a design from only one primitive. Mix forms (ellipses, parallelograms, hexagons). Use straights and zigzags for tension and curves for looseness — [DonCorgi, character design mistakes](https://doncorgi.com/blog/character-design-mistakes/)
- Big-Medium-Small (also called primary/secondary/tertiary, or first/second/third read): the eye sees big shapes first and then "cascades" to smaller ones. Each tier should be clearly distinct in size, and all three should be present. This is linked to a loose 70/30 or 80/20 split — [Maya Beginner design primer](https://mayabeginner.readthedocs.io/en/latest/Design/L3_DesignPrinicplesPrimer.html) (single tutorial source, thin)
- Negative space: small stray negative shapes between limbs grab attention without earning it. The fix is to move the limb or make the gap clearly larger. If a pose doesn't read in silhouette, repose it — [Lynda/LinkedIn, "Pushing the pose", 21 Foundations of Animation](https://origin-www.lynda.com/3D-Animation-tutorials/Pushing-pose/2811343/2923304-4.html); [Brosatsu, 4 tricks](https://brosatsu.beehiiv.com/p/learn-4-tricks-instantly-improve-line-art)
- In Limbo, silhouettes and negative space define the art style, with a limited grey palette where light and shadow define the playing field and direction — [Polycount thread](https://polycount.com/discussion/comment/2370285); [Girls on Games, Art Examination: Limbo](https://www.girlsongames.ca/2017/04/27/art-examination-playdead-limbo/)
- Limbo creator Arnt Jensen deliberately avoided detailed 3D models in favour of a minimalistic style. His 2006 concept trailer was noted for "strong silhouettes, fluid animation" — [Wikipedia, Limbo](https://en.wikipedia.org/wiki/Limbo_(video_game))
- Ori's prototype "was just black-and-white silhouettes" (art director Johannes Figlhuber) — [Xbox Wire, The Art of Ori](https://news.xbox.com/en-us/?p=4339)

### Inferences (code-drawable rules)
- Run a fill test. Render each creature in pure #000 at the target in-game height (60–150 px) on mid-grey and on the actual dark background. If you can't name the creature and its role, the outline is wrong; added interior detail will not fix it.
- Treat Big-Medium-Small as numbers. Pick one dominant mass, about 55–70% of the silhouette area. Add one secondary mass at about 20–30% and one or two accents at 5–10% each, such as a horn, a flower or a claw. Never make two masses nearly equal in size.
- For asymmetry, offset the eye from the head centre and tilt the flower stem. Make the cape trail longer on the back side and carry the sword on one side only. Mirror symmetry left to right in profile reads as clip-art.
- For negative space, make every hole or gap (between the arm and body, under a raised leg, between the cape and the legs) either at least about 8% of body height or fully closed. Avoid 1–3 px slivers.
- Line of action: build the body on a single curved spine (a quadratic or cubic Bezier) rather than a vertical axis, then hang the masses off it. Lean the spine forward for chasers and back for cautious idles.

### Gaps
- No primary source found for a formal "big-medium-small" definition from a named game art director; the tutorial source is thin.
- No sourced pixel-size thresholds (e.g., minimum readable feature size at 60 px) were found.

## Q2. How specific games design heroes and enemies as silhouettes

### Takeaway
The confirmed design rationale is small but concrete. Ori was deliberately tiny so players can see danger coming and to show the character's insignificance. Hollow Knight's Knight is "the simplest way of representing something bug-like", and its cloak hides the arms. Little Nightmares' Janitor is scary because his proportions are wrong: arms far too long, legs too short, a huge head. Inside's boy is faceless and carries the only colour. For Gris, Alto's Odyssey, Hob, Salt and Sanctuary and Blasphemous, I found no usable primary sources in this pass.

### Cited Findings
- **Ori (Moon Studios):** "We wanted Ori to be very small on the screen... you can see further ahead, and have more time to react". Max Degen added that the size conveys "the insignificance of the character, who's very small in this huge and intimidating world". Early influence was Ghibli's Princess Mononoke — [Xbox Wire](https://news.xbox.com/en-us/?p=4339)
- **Hollow Knight (Team Cherry):** Ari Gibson: "The main character is probably just built from what is the simplest way of representing something bug-like". "Putting a little cloak on a character is good because you can't see their arms". The Knight sprites date back to the earlier prototype Hungry Knight. The bugs make "simple characters, which are nice and easy to put together" (William Pellen). The game has over 150 enemies, each with a distinctive design and attack style — [MCV/UK, When We Made... Hollow Knight](https://mcvuk.com/when-we-made-hollow-knight/)
- An analysis notes that the Knight reads as a bright white mask (illuminated) while the Hollow Knight is black with dark-blue accents, drawing the eye to the player. The towering statue makes the small Knight feel insignificant — [Mechanics of Magic, Visual Design of Games – Hollow Knight](https://mechanicsofmagic.com/?p=15853) (secondary analysis)
- Team Cherry later felt some Hollow Knight enemies, such as the City of Tears sentries, were "video gamey", and made Silksong's enemies more dynamic — [Amara transcript of Edge interview analysis](https://amara.org/subtitles/o0bVaNh1hdi6/en/1/download/Silksong%20News%20Really%20Is%20that%20even%20possible%20Edge%20Magazine%20Analysis.en.vtt) (secondary)
- **Little Nightmares (Tarsier):** The Janitor has very long arms, very short legs and a large head, with arms "far too long for its body" in a way that "does not look natural". He sweeps the floor with his arms as if feeling his way, he is blind, and he is neither clearly adult nor child (uncanny). Six is a small girl in a yellow raincoat in giant environments. Adults look grotesque while children look like "kin" — [Monster Masterclass: Little Nightmares](https://residentanna.substack.com/p/monster-masterclass-little-nightmares); [Hypercritic](https://hypercritic.org/collection/tarsier-studios-little-nightmares-2017-review); [Wikipedia](https://en.wikipedia.org/wiki/Little_Nightmares)
- **Inside (Playdead):** Faces carry so much information that the mind latches onto them, so Playdead's characters communicate through body movement and gesture. The boy's red shirt is essentially the only colour in a grey world — [GDC Narrative Review paper, John Myres](https://media.gdcvault.com/gdc2017/GameNarrativeReview/John%20Myres_GDCNarrativeContest2016.pdf) (student analysis); [GameRevolution review](https://gamerevolution.com/review/70543-inside-review)
- **Limbo:** The boy faces a "behemoth spider" (a huge, many-legged threat against a tiny child). The art relies on monochrome, strong silhouettes and fluid animation — [Wikipedia, Limbo](https://en.wikipedia.org/wiki/Limbo_(video_game)); [Hardcore Gaming 101](https://www.hardcoregaming101.net/limbo/)

### Inferences
- A recurring pattern across Limbo, Ori, Little Nightmares, Inside and Hollow Knight: one tiny, simple, rounded hero against huge, angular or wrongly proportioned threats. The scale gap carries the drama.
- The common appeal trick in flat art is one point of light or colour on a dark hero: Limbo's glowing eyes (commonly observed, not sourced here), the Knight's white mask, Six's yellow coat, Inside's red shirt. For this game, the flower is the natural candidate. Make it the one saturated or light element.
- Hide the arms under the cape (Gibson). This cuts the outline noise and animation cost, and keeps the hero a clean blob, with only the sword breaking the outline.
- The "wrong proportion" rule (the Janitor) maps straight onto the tall long-armed stalker. Arms should reach the ground or past the knees, the torso should be long, and the legs short or hidden. Give it a slow, groping arm-sweep idle.

### Gaps
- No primary art-direction sources found in this pass for Gris (Nomada/Conrad Roset), Alto's Odyssey, Hob, Salt and Sanctuary, or Blasphemous.
- No developer source on the Limbo spider's design process, or on the boy's glowing eyes as a deliberate choice.

## Q3. How enemy silhouettes should differ from the hero, and from each other by role

### Takeaway
Shape should carry identity and state. Colour or tint alone fails under pressure. Valve redesigned Left 4 Dead's survivors when playtesters confused them with zombies, and keeps fog light enough that silhouettes still read. Good practice is "behaviour first, then visuals": each role's outline should advertise its attack before the attack lands.

### Cited Findings
- In Left 4 Dead playtests, players struggled to tell survivors from zombies, so the survivors got different silhouettes and colours. Randy Lundeen: "Without the silhouette read players would be too surprised" — [Game Developer, Valve art](https://gamedeveloper.com/art/in-depth-how-valve-makes-art-to-enhance-gameplay)
- Valve used rim lighting so "the shadowed side" doesn't get "lost into the background". Shadows go cool, "never going black" — [Game Developer](https://gamedeveloper.com/art/in-depth-how-valve-makes-art-to-enhance-gameplay); [Mitchell et al.](https://www.cs.princeton.edu/courses/archive/fall07/cos597B/papers/mitchell-team-fortress.pdf)
- Players should be able to infer the attack class from silhouette and motion cues before damage happens. Inconsistent wind-ups erode trust — [GamineAI, enemy telegraph shape language](https://gamineai.com/blog/enemy-telegraph-shape-language-top-down-boss-fights-fast-visual-consistency-audit-2026) (blog)
- Fatshark (Darktide) gives each enemy a readability priority based on type, range and role. It adds back attachments to long-range elites so they stand out in silhouette — [Darktide enemy character art dev blog via DevTrackers](https://devtrackers.gg/darktide/p/67a2496a-darktide-101-enemy-character-art-dev-blog)
- Indie metroidvania practice: "player moveset informs enemy behavior. Enemy behavior informs that enemies GFX" — [itch.io devlog discussion](https://itch.io/post/8596185); [Soul Seeker devlog](https://jamtonyx.itch.io/soul-seeker/devlog/446517/bringing-enemies-to-life)
- Role contrast in silhouette (tank = low and blocky, fast = sharp and angled, support = round and upright) — [RocketBrush](https://rocketbrush.com/blog/shape-language-in-game-character-design-how-to-make-characters-readable-and-consistent)

### Inferences (role → silhouette spec for this game)
- **Hero:** circle-dominant, with a head about 45–55% of total height. The only vertical spike is the flower, and the sword is the one sharp line. Every enemy should have more points or straighter edges than the hero.
- **Low charger:** wide, flat and wedge-shaped. Make it 1.5–2.5× wider than tall, with a forward-tapering head or horn (a triangle pointing the way it moves) and a lowered centre of mass. Before it charges, it crouches lower and widens.
- **Rooted spitter (plant):** vertical, with a fixed wide base (roots fanning out) and a bulb or mouth on a curved stalk. No legs, so it reads as static. Swelling the bulb is the telegraph.
- **Flying diver:** horizontal, with spread wings (big negative-space gaps under them) and a sharp downward beak or tail. Its outline changes to a folded, narrow arrow when diving, so the state shows in the shape.
- **Tall long-armed stalker:** the tallest normal enemy at 2–3× hero height, built on the Janitor rule. Arms reach the ground, the head is small or eyeless, and the shape is a long narrow rectangle with thin, tapered limbs. Use a slow sway.
- **One-eyed watcher:** a circle like the hero, but inverted. The eye is very large relative to the body, or the body is mostly eye, and the beam is a long triangle. Echoing the hero's circle and eye makes it read as a "corrupted twin".
- **Boss:** 4–8× hero height, combining the families (round core plus many triangular points). It needs a clear "head" read so the player knows where to look.
- **User creatures:** for a dragon, use a long S-curve spine with wing triangles. A spider is a small round body with 8 long, jointed, thin legs (a Limbo-style scale threat). A zombie is a human-like rectangle with broken asymmetry (a dropped shoulder, one arm forward, a forward lean).
- Show state changes (wind-up, vulnerable, enraged) through shape: squash, open the jaw, raise spikes. Don't rely on colour alone.

### Gaps
- No primary source from Team Cherry or Playdead on per-role enemy silhouette rules; the role mapping above is synthesis.

## Q4. How to make a tiny hero appealing

### Takeaway
Appeal is well supported by baby-schema research: a relatively large head, large eyes set low on the face, a large forehead and a small chin. Studies show these traits raise ratings of cuteness and likability, including in designed avatars. Designers pair this with tiny on-screen size, simplicity (Ori, the Knight) and one signature element.

### Cited Findings
- Kindchenschema (Lorenz) traits: a relatively large head compared with the body, large eyes below the horizontal midline of the skull, and round, protruding cheeks — [PMC article on baby schema](https://pmc.ncbi.nlm.nih.gov/articles/PMC3596402)
- High-baby-schema faces were rated cuter and drew stronger caretaking motivation (Glocker et al.) — [Penn repository](https://repository.upenn.edu/cog_neuro_pubs/11); [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC3260535/)
- Avatars designed with baby schema were rated cuter, more likable, approachable and pleasant than mature avatars. Cuteness transfers to designed objects and robots — [AI & Society 2024, Springer](https://link.springer.com/article/10.1007/s00146-024-01878-3/fulltext.html)
- The Knight was "the simplest way of representing something bug-like", and the cloak hides the arms — [MCV/UK](https://mcvuk.com/when-we-made-hollow-knight/)
- Ori was kept very small on screen for both gameplay (reaction time) and emotion (insignificance in a huge world) — [Xbox Wire](https://news.xbox.com/en-us/?p=4339)
- Simplicity makes characters more recognisable. Overloading with accessories (the "21 belts" example) hurts — [DonCorgi](https://doncorgi.com/blog/character-design-mistakes/)
- Faceless or minimal-face characters push communication into body movement and gesture (Inside analysis) — [GDC Narrative Review paper](https://media.gdcvault.com/gdc2017/GameNarrativeReview/John%20Myres_GDCNarrativeContest2016.pdf)

### Inferences
- Make the head about 45–55% of total height (2–2.5 heads tall), with a tiny body and stubby or hidden legs.
- Place the single eye below the head's horizontal midline and somewhat toward the facing direction. Make it large, about 25–35% of head width, and use a light or negative-space eye (cut out of the black) so it reads on a dark field, as in Limbo. Keep the head's forehead area large above the eye.
- For the cape, use a secondary-motion shape: a tapered, trailing triangle-ish curve that lags the body by a few frames and flutters at its tip. It also hides the arms (Gibson), so the outline stays a clean blob.
- For the flower, give it a thin, slightly curved stem and a small rounded bloom. It is the "small" accent in big-medium-small, and the hero's single point of colour or light. Let it bob with secondary motion and droop or perk with state (health or mood). This also makes it storytelling in a dried-out world.
- The sword should be the only long straight line on the hero, a deliberate contrast to his roundness.

### Gaps
- No source found with numeric head-to-body ratios from these specific games.

## Q5. Common mistakes that make silhouette art look elementary or amateur, and the professional fixes

### Takeaway
Amateur silhouette art tends to have uniform outlines: all curves or all straight lines, constant-width limbs, symmetric poses, equal-sized masses, stray slivers of negative space, and detail spread evenly. The professional fixes are mostly about variety and hierarchy. Mix straight and curve edges, taper limbs, overlap forms, echo the outline in interior detail, cluster detail in one area, and separate the figure from the background with rim light or value.

### Cited Findings
- A weak silhouette is the classic error. Test by blocking the figure in solid black — [DonCorgi](https://doncorgi.com/blog/character-design-mistakes/)
- Building only from squares, triangles or circles is a mistake. Mix shape types and use less common forms. Straights and zigzags give tension, curves give looseness — [DonCorgi](https://doncorgi.com/blog/character-design-mistakes/)
- Inconsistent proportions across a cast break cohesion — [DonCorgi](https://doncorgi.com/blog/character-design-mistakes/)
- Tangents (lines that accidentally touch) create "optical fuzz" — [Brosatsu](https://brosatsu.beehiiv.com/p/learn-4-tricks-instantly-improve-line-art) (thin support)
- Small, stray negative shapes are distracting. Move the limb or enlarge the gap — [Lynda/LinkedIn](https://origin-www.lynda.com/3D-Animation-tutorials/Pushing-pose/2811343/2923304-4.html)
- Valve concentrated fine detail in one area (upper chest) rather than spreading it evenly, used a value split (darker lower body, lighter upper torso), and echoed outline shapes in interior folds — [Game Developer](https://gamedeveloper.com/art/in-depth-how-valve-makes-art-to-enhance-gameplay); [Mitchell et al.](https://www.cs.princeton.edu/courses/archive/fall07/cos597B/papers/mitchell-team-fortress.pdf)
- Rim highlights, not dark outlines, define shapes against the background in TF2 — [Mitchell et al.](https://www.cs.princeton.edu/courses/archive/fall07/cos597B/papers/mitchell-team-fortress.pdf)
- Most readability failures are value failures: backgrounds in similar tones swallow the figures. State changes should show in shape, because "shape reads through chaos; tint doesn't" — reported in search results from [Bugnet blog](https://bugnet.io/blog/readable-game-art-why-clarity-beats-detail). The fetched page returned a blog index, so the exact article was not verified.

### Inferences (code-level fixes)
- **Edge variety:** on every outline, alternate long gentle curves with short straight segments and one or two sharp corners. Use cubic Beziers for the curves and explicit lines for the straights. A shape built entirely of arcs or circles looks like a primitive ("elementary").
- **Taper:** limbs, tails, horns, cape tips and stems should go from thick to thin to a point. Never use constant-width strokes or rectangles for limbs. Draw them as closed polygons whose half-width shrinks along the length.
- **Overlap:** build creatures from several overlapping filled shapes (head in front of the body, near leg overlapping the body) rather than shapes that merely touch. Touching circles read as a snowman.
- **Interior holes or cut-outs:** use a few deliberate negative cuts, such as the eye, a gap between ribs or a torn wing membrane, to add a second read inside the black. Use even-odd fill or a destination-out composite.
- **Rim or edge light:** on a dark background, add a 1–2 px lighter offset edge on one side (the light-source side) or a slightly lighter body tone than the background. Pure black on near-black disappears. Valve's "never black" principle applies.
- **Detail clustering:** put spikes, teeth and texture notches in one zone per creature (the head or front), and leave other areas quiet. Even spikes all around reads as amateur.
- **Asymmetry and pose:** avoid perfectly vertical, symmetric T-poses in idle frames. Tilt the spine and offset the limbs.
- **Consistency:** keep one shared design grammar (same taper style, corner sharpness and eye style) across all creatures so the cast looks like one world, as with the DonCorgi proportion consistency point.

### Gaps
- No primary sources found on rim highlights specifically in pure-silhouette 2D games (Limbo, Inside). The rim guidance here is from TF2 (3D) and is applied by analogy.
- The Bugnet readability article could not be retrieved; its claims are from search snippets only.
