# How Disposable Tricks was made

Designed and directed by Amin Ranjbar. Built with Claude Code as the AI engineer. Every decision below was Amin's, made by playing each version and saying what had to change.

The code was first saved in git on 20 October 2026, so this page keeps the history from before that. It is drawn from the dated notes in [WHAT_AMIN_WANTS.md](WHAT_AMIN_WANTS.md), [PROGRESS.md](PROGRESS.md) and the [reports](reports/).

Play it: https://disposable-tricks.pages.dev

## 12–13 October 2026: the idea and the first build

- **The idea:** a web app where anyone makes their own small 2D game by tapping options or writing what they want, and an AI turns it into a game using our art and rules. The base game: a small dark hero with a flower on his head, walking a dark world where light exposes him and monsters hunt him.
- **The AI:** the free AI services were tested on 12 October. Groq and Cloudflare Workers AI passed; OpenRouter and Gemini were left out.
- **The first play-test (13 October):** written games came out plain and often empty, so "make written games good" went ahead of the visuals.

## 17 October: one game, made simple

- **Amin:** "The UI of the application is not pleasant at all … Simplicity is the key."
- **One game only:** the flower boy's adventure. The other genres were cut.
- **The maker:** each question has four options and a fifth, written one. "I write shotgun, I expect to see a shotgun."
- **The game:** an endless road in chapters, harder each time.

## 18 October: detours, hunting monsters, and a story

- Detours behind glowing archway gates; monsters that hunt; weapon charges; throwing; skills earned while playing; water that makes noise.
- The maker shrank to two questions: what he carries and what he meets.
- **The story:** a dried-out desert. Find seven of ten living flowers, break stones, plant the flowers at the gate, and the world takes back its colour. A map in the corner.

## 19 October: research, then one improvement at a time

Each step began with research, then a plan, then measurement.

- **Characters and monsters:** a deep research pass on silhouette design (Limbo, Inside, Hollow Knight) led to the five monsters being redrawn. Each has one verb, a clear warning, a strike and an opening, all in one language of light. ([report](reports/Silhouette%20monster%20and%20hero%20design.md))
- **Monster behaviour:**
  - monsters become suspicious before they attack;
  - every attack is warned and can be avoided without the sword;
  - bumping into a monster hurts;
  - close up, monsters find you within a few seconds.
- **Weapons:** guns fire from lying down; every weapon but stones can be thrown, and one tap throws an empty weapon.
- **Controls and feel:** ([report](reports/Controls%20and%20feel.md))
  - the strike fires on touch-down;
  - flicks jump;
  - landings throw up dust;
  - hits push both bodies apart;
  - forgiving ledges;
  - phone vibration.
- **Sound:** calm ambient music made in code. It darkens when monsters notice you, adds bell notes with each flower found, and resolves when the flowers are planted. Monsters got their own voices. ([report](reports/Sound%20and%20music.md))
- **Difficulty:** bot players with human reaction times played 60 roads each. The skilled bot's finish rate rose from 63% to 87%. ([report](reports/Difficulty.md))
- **Story and bosses:** monsters taunt and the hero answers. Every world ends in a boss that talks, calls its soldiers, and as it dies warns of its brothers.
- **More to play:** five worlds (The Dry Desert, The Ash Forest, The Salt Sea, The Red Canyons, The Silent City), each with its own colours, scenery, monsters, music key and boss. Monsters return if you walk back for flowers.
- **In parallel:**
  - one AI session made the written wishes reliable: 35 of 49 test wishes came out right before, 57 of 57 after, and none come back empty;
  - another prepared the launch on Cloudflare.

## 20 October: the menus, the launch, and this repository

- **Menus redesigned:** everything centred, pictures instead of names, and a simple title card: "Disposable Tricks", one line, Play, Back.
- **Launched** at https://disposable-tricks.pages.dev, with the AI running online.
- **On GitHub:** this repository was created, with this history.
