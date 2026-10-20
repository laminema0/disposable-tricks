// Starters: small complete games written by us against the trick API (see reference.ts).
// They are the foundation Amin asked for: for a wish, the AI takes the nearest starter and
// changes it, instead of writing a game from nothing. They also play as they are, at once,
// with no AI, from the first question of the maker ("What do you want to play?").
// Each one uses our own art: the boy with his flower, the monsters, petals as lives, the
// flower burst. Each is checked and test-run by the unit tests like any other trick.

export interface Starter {
  id: string;
  /** The card: a name and one short line. */
  label: string;
  detail: string;
  /** Words in a wish that point to this starter. */
  words: readonly string[];
  code: string;
}

const ROAD = `
var VEHICLE = "car";
var hero = game.hero({ x: 150, y: game.ground - 26, vehicle: VEHICLE, gravity: 1500 });
var floor = hero.y;
var next = 1.2;
game.monster({ kind: "crawler", x: 620, y: game.ground - 20, vx: -200, face: -1 });
var cool = 0;
for (var d = 0; d < 6; d++) game.add({ x: d * 160, y: game.ground + 30, w: 70, h: 5, color: "mid", vx: -260, tag: "dash" });
game.say("Tap to shoot, swipe up to jump. Reach 15.");
game.onUpdate(function (dt) {
  if (game.input.left) hero.x -= 220 * dt;
  if (game.input.right) hero.x += 220 * dt;
  hero.x = Math.max(60, Math.min(520, hero.x));
  if (hero.y >= floor) { hero.y = floor; hero.vy = 0; if (game.input.up) { hero.vy = -560; game.sound("jump"); } }
  cool -= dt;
  if (game.input.action && cool <= 0) {
    cool = 0.25;
    game.add({ x: hero.x + 46, y: hero.y - 6, w: 14, h: 4, color: "accent", vx: 640, tag: "shot", glow: true });
    game.sound("shoot");
  }
  next -= dt;
  if (next <= 0) {
    next = 1.1 + game.random() * 1.2;
    var flies = game.random() < 0.3;
    // Plain monsters first; from 6 on, winged crawlers that take two shots.
    var hard = game.score >= 6 && game.random() < 0.35;
    var made = game.monster({ kind: hard ? "crawler+flyer" : flies ? "flyer" : "crawler", x: 860, y: hard ? floor - 50 : flies ? floor - 95 : game.ground - 20, vx: -(180 + game.random() * 120), face: -1 });
    made.hp = hard ? 2 : 1;
  }
  game.find("dash").forEach(function (dash) { if (dash.x < -40) dash.x += 960; });
  game.find("shot").forEach(function (shot) { if (shot.x > 860) shot.remove(); });
  game.find("monster").forEach(function (m) {
    game.find("shot").forEach(function (shot) {
      if (!m.alive || !game.hits(m, shot)) return;
      shot.remove();
      m.hp = (m.hp || 1) - 1;
      if (m.hp <= 0) { game.burst(m.x, m.y); m.remove(); game.score += 1; } else game.sound("hit");
    });
    if (!m.alive) return;
    if (game.hits(m, hero)) { m.remove(); game.lives -= 1; game.sound("hit"); }
    else if (m.x < -60) m.remove();
  });
  if (game.score >= 15) game.win();
  if (game.lives <= 0) game.lose();
});
`;

const FLYING = `
var VEHICLE = "wings";
game.scene("sky");
var hero = game.hero({ x: 170, y: 170, vehicle: VEHICLE, gravity: 700 });
var next = 1;
game.add({ shape: "flower", x: 420, y: 150, w: 24, h: 24, color: "accent", vx: -170, tag: "flower", glow: true });
game.add({ shape: "flower", x: 620, y: 230, w: 24, h: 24, color: "accent", vx: -170, tag: "flower", glow: true });
game.monster({ kind: "flyer", x: 760, y: 120, vx: -190, face: -1 });
var bloom = 0.6;
var safe = 0;
game.say("Tap to rise. Collect 12, dodge the flyers.");
game.onUpdate(function (dt) {
  if (game.input.action || game.input.up) { hero.vy = -300; game.sound("jump"); }
  if (game.input.left) hero.x -= 200 * dt;
  if (game.input.right) hero.x += 200 * dt;
  hero.x = Math.max(40, Math.min(760, hero.x));
  if (hero.y < 34) { hero.y = 34; hero.vy = 0; }
  safe -= dt;
  if (hero.y > game.ground - 30) {
    hero.y = game.ground - 30;
    hero.vy = -260;
    if (safe <= 0) { game.lives -= 1; safe = 1; game.sound("hit"); }
  }
  next -= dt;
  if (next <= 0) {
    next = 1.3 + game.random();
    game.monster({ kind: "flyer", x: 860, y: 50 + game.random() * 220, vx: -(150 + game.random() * 110), face: -1 });
  }
  bloom -= dt;
  if (bloom <= 0) {
    bloom = 1.1;
    game.add({ shape: "flower", x: 860, y: 50 + game.random() * 230, w: 24, h: 24, color: "accent", vx: -170, tag: "flower", glow: true });
  }
  game.find("monster").forEach(function (m) {
    if (game.hits(m, hero) && safe <= 0) { game.lives -= 1; safe = 1; game.sound("hit"); m.remove(); }
    else if (m.x < -60) m.remove();
  });
  game.find("flower").forEach(function (f) {
    if (game.hits(f, hero)) { f.remove(); game.score += 1; game.sound("pick"); }
    else if (f.x < -40) f.remove();
  });
  if (game.score >= 12) game.win();
  if (game.lives <= 0) game.lose();
});
`;

const SPACE = `
game.scene("space");
var hero = game.hero({ x: 400, y: 340, vehicle: "ship" });
var next = 0.8;
var cool = 0;
var boss = null;
game.monster({ kind: "watcher", x: 300, y: 60, vy: 90 }).hp = 1;
game.monster({ kind: "flyer", x: 560, y: 20, vy: 110 }).hp = 1;
game.say("Move and tap to shoot. Beat the boss.");
game.onUpdate(function (dt) {
  if (game.input.left) hero.x -= 300 * dt;
  if (game.input.right) hero.x += 300 * dt;
  hero.x = Math.max(40, Math.min(760, hero.x));
  cool -= dt;
  if (game.input.action && cool <= 0) {
    cool = 0.2;
    game.add({ x: hero.x, y: hero.y - 30, w: 4, h: 14, color: "accent", vy: -620, tag: "shot", glow: true });
    game.sound("shoot");
  }
  next -= dt;
  if (next <= 0) {
    next = 0.6 + game.random() * 0.9;
    // Plain monsters first; from 8 on, merged ones that take two shots; at 15, the boss.
    var hard = game.score >= 8 && game.random() < 0.4;
    var m = game.monster({ kind: hard ? "flyer+watcher" : game.random() < 0.5 ? "watcher" : "flyer", x: 40 + game.random() * 720, y: -30, vy: 70 + game.random() * 80 });
    m.hp = hard ? 2 : 1;
  }
  if (game.score >= 15 && !boss) {
    boss = game.monster({ kind: "boss", x: 400, y: -110, vy: 60 });
    boss.hp = 8;
    game.say("The boss. Shoot it 8 times.");
  }
  if (boss && boss.alive && boss.y >= 120) { boss.vy = 0; boss.x = 400 + Math.sin(game.time * 0.9) * 250; }
  game.find("shot").forEach(function (shot) { if (shot.y < -20) shot.remove(); });
  game.find("monster").forEach(function (m) {
    game.find("shot").forEach(function (shot) {
      if (!m.alive || !game.hits(m, shot)) return;
      shot.remove();
      m.hp -= 1;
      game.sound("hit");
      if (m.hp <= 0) { game.burst(m.x, m.y); m.remove(); game.score += 1; }
    });
    if (m.alive && m !== boss && (game.hits(m, hero) || m.y > 420)) { m.remove(); game.lives -= 1; game.sound("hit"); }
  });
  if (boss && !boss.alive) game.win();
  if (game.lives <= 0) game.lose();
});
`;

const PUZZLE = `
game.scene("room");
var CELL = 44, OX = 70, OY = 46, COLS = 15, ROWS = 7;
var px = 1, py = 3, moves = 60, wait = 0;
function at(cx, cy) { return { x: OX + cx * CELL, y: OY + cy * CELL }; }
for (var cx = 0; cx < COLS; cx++) for (var cy = 0; cy < ROWS; cy++) {
  var edge = cx === 0 || cy === 0 || cx === COLS - 1 || cy === ROWS - 1;
  game.add({ x: at(cx, cy).x, y: at(cx, cy).y, w: CELL - 2, h: CELL - 2, color: edge ? "dark" : "far" });
}
var goals = [[11, 2], [11, 3], [11, 4]].map(function (c) {
  var g = game.add({ shape: "flower", x: at(c[0], c[1]).x, y: at(c[0], c[1]).y, w: 26, h: 26, color: "accent", glow: true });
  g.cx = c[0]; g.cy = c[1];
  return g;
});
var boxes = [[4, 2], [6, 4], [5, 5]].map(function (c) {
  var b = game.add({ x: at(c[0], c[1]).x, y: at(c[0], c[1]).y, w: CELL - 10, h: CELL - 10, color: "hero", tag: "box" });
  b.cx = c[0]; b.cy = c[1];
  return b;
});
var hero = game.hero({ x: at(px, py).x, y: at(px, py).y - 4, w: 24, h: 44 });
function boxAt(cx, cy) { for (var i = 0; i < boxes.length; i++) if (boxes[i].cx === cx && boxes[i].cy === cy) return boxes[i]; return null; }
function wall(cx, cy) { return cx <= 0 || cy <= 0 || cx >= COLS - 1 || cy >= ROWS - 1; }
game.say("Push the three boxes onto the flowers. 60 moves.");
game.onUpdate(function (dt) {
  wait -= dt;
  var dx = game.input.right ? 1 : game.input.left ? -1 : 0;
  var dy = dx !== 0 ? 0 : game.input.up ? -1 : game.input.down ? 1 : 0;
  if ((dx !== 0 || dy !== 0) && wait <= 0) {
    wait = 0.17;
    var nx = px + dx, ny = py + dy, box = boxAt(nx, ny);
    if (!wall(nx, ny) && (!box || (!wall(nx + dx, ny + dy) && !boxAt(nx + dx, ny + dy)))) {
      if (box) { box.cx += dx; box.cy += dy; box.x = at(box.cx, box.cy).x; box.y = at(box.cx, box.cy).y; game.sound("tick"); }
      px = nx; py = ny; moves -= 1;
      hero.x = at(px, py).x; hero.y = at(px, py).y - 4; hero.face = dx === -1 ? -1 : 1;
    }
  }
  var done = 0;
  goals.forEach(function (g) { if (boxAt(g.cx, g.cy)) done += 1; });
  game.score = done;
  game.say("Boxes home: " + done + " of 3. Moves left: " + moves);
  if (done === 3) game.win();
  if (moves <= 0) game.lose();
});
`;

const CATCH = `
var hero = game.hero({ x: 400, y: game.ground - 42 });
var next = 0.5;
game.add({ shape: "flower", x: 520, y: 110, w: 24, h: 24, color: "accent", vy: 170, tag: "flower", glow: true });
game.dark(0.35);
var lamp = game.light(400, 120, 260);
game.say("Catch 15 flowers. Dodge the flyers.");
game.onUpdate(function (dt) {
  if (game.input.left) { hero.x -= 300 * dt; hero.face = -1; }
  if (game.input.right) { hero.x += 300 * dt; hero.face = 1; }
  hero.x = Math.max(30, Math.min(770, hero.x));
  lamp.x += (hero.x - lamp.x) * 2 * dt;
  next -= dt;
  if (next <= 0) {
    next = 0.55 + game.random() * 0.5;
    var x = 40 + game.random() * 720;
    if (game.random() < 0.3) game.monster({ kind: "flyer", x: x, y: -20, vy: 170 + game.random() * 90 });
    else game.add({ shape: "flower", x: x, y: -20, w: 24, h: 24, color: "accent", vy: 150 + game.random() * 70, tag: "flower", glow: true });
  }
  game.find("flower").forEach(function (f) {
    if (game.hits(f, hero)) { f.remove(); game.score += 1; game.sound("pick"); }
    else if (f.y > game.ground) f.remove();
  });
  game.find("monster").forEach(function (m) {
    if (game.hits(m, hero)) { m.remove(); game.lives -= 1; game.sound("hit"); }
    else if (m.y > game.ground - 10) { game.burst(m.x, m.y); m.remove(); }
  });
  if (game.score >= 15) game.win();
  if (game.lives <= 0) game.lose();
});
`;

const STAGE = `
var hero = game.hero({ x: 80, y: game.ground - 42, gravity: 1500 });
var floor = hero.y;
var LENGTH = 2400;
var safe = 0;
game.dark(0.45);
for (var l = 0; l < 5; l++) game.light(300 + l * 520, game.ground - 150, 230);
var goal = game.add({ shape: "flower", x: LENGTH, y: game.ground - 40, w: 44, h: 44, color: "accent", glow: true });
for (var i = 0; i < 5; i++) game.monster({ kind: i % 2 ? "stalker" : "crawler", x: 520 + i * 400, y: game.ground - (i % 2 ? 48 : 20), vx: -50, face: -1 });
for (var f = 0; f < 8; f++) game.add({ shape: "flower", x: 260 + f * 270, y: game.ground - 70 - (f % 3) * 30, w: 20, h: 20, color: "light", tag: "flower", glow: true });
game.say("Reach the big flower. Swipe up to jump.");
game.onUpdate(function (dt) {
  if (game.input.left) { hero.x -= 220 * dt; hero.face = -1; }
  if (game.input.right) { hero.x += 220 * dt; hero.face = 1; }
  hero.x = Math.max(30, Math.min(LENGTH + 40, hero.x));
  if (hero.y >= floor) { hero.y = floor; hero.vy = 0; if (game.input.up) { hero.vy = -600; game.sound("jump"); } }
  safe -= dt;
  game.find("monster").forEach(function (m) {
    if (m.x < hero.x - 500) m.x = hero.x + 500;
    if (game.hits(m, hero) && safe <= 0) { game.lives -= 1; safe = 1.2; game.sound("hit"); }
  });
  game.find("flower").forEach(function (b) {
    if (game.hits(b, hero)) { b.remove(); game.score += 1; game.sound("pick"); }
  });
  game.camera(Math.max(0, hero.x - 300));
  if (game.hits(goal, hero)) { game.burst(goal.x, goal.y); game.win(); }
  if (game.lives <= 0) game.lose();
});
`;

export const STARTERS: readonly Starter[] = [
  { id: 'road', label: 'Road', detail: 'Drive, jump and shoot', words: ['car', 'drive', 'driving', 'road', 'bike', 'bicycle', 'motorbike', 'motorcycle', 'ride', 'riding', 'truck', 'race', 'racing', 'highway', 'tank', 'train', 'skate'], code: ROAD.trim() },
  { id: 'flying', label: 'Flying', detail: 'Rise, dodge, collect', words: ['fly', 'flying', 'flies', 'wings', 'plane', 'bird', 'jetpack', 'balloon', 'helicopter', 'glide', 'sky', 'dragon', 'flap'], code: FLYING.trim() },
  { id: 'space', label: 'Space shooter', detail: 'Shoot what comes down', words: ['space', 'spaceship', 'shooter', 'asteroid', 'alien', 'rocket', 'galaxy', 'laser', 'invader', 'ufo'], code: SPACE.trim() },
  { id: 'puzzle', label: 'Puzzle', detail: 'Push boxes onto flowers', words: ['puzzle', 'box', 'boxes', 'push', 'sokoban', 'maze', 'think', 'brain', 'grid', 'slide'], code: PUZZLE.trim() },
  { id: 'catch', label: 'Catch', detail: 'Catch flowers, dodge flyers', words: ['catch', 'collect', 'falling', 'basket', 'dodge', 'rain', 'fishing', 'fish', 'tennis', 'ball', 'juggle'], code: CATCH.trim() },
  { id: 'stage', label: 'Open stage', detail: 'Walk, jump, reach the flower', words: ['walk', 'jump', 'run', 'platform', 'forest', 'adventure', 'explore', 'climb'], code: STAGE.trim() },
];

/** The starter whose words a wish uses most. With none of them, the open stage. */
export function nearestStarter(text: string): Starter {
  const wish = ` ${text.toLowerCase().replace(/[^a-z]+/g, ' ')} `;
  let best = STARTERS[STARTERS.length - 1];
  let bestHits = 0;
  for (const starter of STARTERS) {
    const hits = starter.words.filter((word) => wish.includes(` ${word}`)).length;
    if (hits > bestHits) {
      bestHits = hits;
      best = starter;
    }
  }
  return best;
}
