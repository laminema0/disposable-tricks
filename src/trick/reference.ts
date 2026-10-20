// The game API a "trick" may use. A trick is one small script written by an AI for a wish
// that the building blocks cannot express ("flying cars", "a fishing game").
// This text is the whole contract: it is what the AI is given, word for word, and it
// describes exactly what the runtime in public/trick-frame.html provides. Nothing else exists
// for a trick: no page, no network, no storage.

export const TRICK_REFERENCE = `
THE GAME API

Your script is the body of a function that receives one object, "game". It runs once, at the
start. It sets things up and registers an update function that runs every frame.
Plain JavaScript only (ES2017). No imports, no DOM, no timers, no network: none of them exist.

The screen is 800 wide and 400 high. x grows to the right, y grows DOWN. (0, 0) is the top left.
game.width = 800, game.height = 400, game.ground = 330 (the y of the ground line).

THINGS ON SCREEN
  var s = game.add({ shape, x, y, w, h, color, vx, vy, gravity, tag, glow, fixed })
    shape:  "box", "circle" or "tri" (a triangle pointing up). Default "box".
    x, y:   the CENTRE of the thing.   w, h: its width and height.
    color:  "hero", "light", "accent", "dark", "mid", "far", "white", or "#rrggbb".
            Use "dark" for enemies and obstacles, "hero" for the player, "accent" for things to collect.
    vx, vy: speed in pixels per second. The thing moves by itself every frame.
    gravity: pixels per second squared added to vy every frame (0 = floats). 900 feels like falling.
    tag:    any word, to find it again later.
    glow:   true draws a soft light around it.
    fixed:  true keeps it in place on screen when the camera moves.
  You may change s.x, s.y, s.w, s.h, s.vx, s.vy, s.color at any time.
  s.remove()  takes it away.   s.alive is false after that.
  Build a bigger picture from several things (a car = a box, a smaller box on top, two circles).
  Things do NOT stop at the ground or at each other by themselves. If something should stand on
  the ground, you must do it:  if (s.y > game.ground - s.h / 2) { s.y = game.ground - s.h / 2; s.vy = 0; }
  At most 300 things at once. Remove what leaves the screen.

OUR OWN ART (use these instead of plain boxes wherever you can; every game has the hero in it)
  var hero = game.hero({ x, y, vehicle, gravity, face })
    The player: a boy with a big round head, one eye and a flower on top. He is in EVERY game.
    vehicle: leave it out for on foot, or "car", "bike", "ship" (seen from above, for space) or "wings" (flying).
    A flying car is vehicle "car" with the flying controls. face: 1 looks right, -1 looks left.
    It is a thing like any other: hero.x, hero.y, hero.vy, hero.w, hero.h, game.hits(hero, other). Tag "hero".
  var m = game.monster({ kind, x, y, vx, vy, face })
    kind: "crawler" (low, on the ground), "flyer" (in the air), "thorn" (a plant), "stalker" (tall), "watcher" (a ball with one eye).
    A black shape with yellow eyes. Tag "monster". game.find("monster") finds them all.
    HARDER MONSTERS: join any two kinds with a plus sign for a merged monster, bigger than either:
      "crawler+flyer" (a winged crawler), "stalker+thorn" (a tall walker with a thorn head), "flyer+watcher", and so on.
    kind "boss" is one giant: a great eye on a thick stem with two thorn heads (110 wide, 210 high).
    Bring merged monsters in as the score grows, and a boss last. Give them more hits: keep your own
    count on the thing (m.hp = 5) and only remove it when the count reaches 0.
  game.add({ shape: "flower", ... })   a five-petalled flower: use it for things to collect.
  game.burst(x, y)      a burst of flowers. Call it whenever a monster is defeated or a goal is reached.
  game.light(x, y, r)   a pool of light of radius r. Returns a thing you can move.
  game.dark(0.4)        darkens the whole scene (0 to 0.85). Lights then show clearly.
  game.lives            is shown as the petals of his flower, 5 at most.

  game.find(tag)    -> an array of the living things with that tag.
  game.hits(a, b)   -> true when the two things overlap.

EVERY FRAME
  game.onUpdate(function (dt) { ... })   dt is seconds since the last frame (about 0.016).
  game.time     seconds since the start.

THE PLAYER'S INPUT (read it inside the update function)
  game.input.left, game.input.right   true while the player holds that side of the screen (or A / D).
  game.input.up     true for the moment the player swipes up (or presses W): use it to jump.
  game.input.down   true while the player drags down (or holds S).
  game.input.action true for ONE frame when the player taps (or presses Space): shoot, hit, grab.
  game.input.held   true while a finger is down.   game.input.x, game.input.y   where it is.

SCORE, LIVES, WORDS, SOUND
  game.score   a number shown top left. Add to it.
  game.lives   a number of dots shown under it. Starts at 3. Take one away when the player is hurt.
  game.say("text")   one short line at the top of the screen, at most 44 characters. Say what to do.
  game.sound(name)   name is "hit", "pick", "jump", "shoot", "win", "lose" or "tick".
  game.random()      a number from 0 to 1. Use it instead of Math.random.
  game.camera(x)     scrolls the view so that world x is at the left edge.
  game.scene(name)   the backdrop, drawn for you in the colours of the mood. Call it first.
                     "road" (the default): night sky, far hills and the ground.   "sky": high up among clouds, for flying.
                     "space": stars, seen from above.   "room": a plain floor seen from above, for puzzles and mazes.

ENDING
  game.win()   the player has won.   game.lose()   the player has lost.
  Every game needs a way to win and a way to lose, and must last longer than a few seconds.

A SHORT EXAMPLE (the boy catches falling stars)
  var basket = game.hero({ x: 400, y: 302 });
  var next = 0;
  game.say("Catch 10 stars");
  game.onUpdate(function (dt) {
    if (game.input.left) basket.x -= 320 * dt;
    if (game.input.right) basket.x += 320 * dt;
    basket.x = Math.max(35, Math.min(765, basket.x));
    next -= dt;
    if (next <= 0) {
      next = 0.8;
      game.add({ shape: "circle", x: 40 + game.random() * 720, y: -10, w: 16, h: 16, color: "accent", vy: 160, tag: "star", glow: true });
    }
    game.find("star").forEach(function (star) {
      if (game.hits(star, basket)) { star.remove(); game.score += 1; game.sound("pick"); }
      else if (star.y > 400) { star.remove(); game.lives -= 1; game.sound("hit"); }
    });
    if (game.score >= 10) game.win();
    if (game.lives <= 0) game.lose();
  });
`.trim();
