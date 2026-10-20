# Sound and music: research and plan (19 October 2026)

Step 2 of improving the game. Amin: "a calm ambient music on the background".

## Where we are

- **About 16 sound effects**, all made in code from filtered noise and simple tones (src/core/sfx.ts). There are no sound files.
- **No music** and no background ambience: between effects the game is silent.
- Score: 2/10. Limbo, Inside and Alto's Odyssey are about 10.

## How the best did it

- **Limbo (Martin Stig Andersen):** modelled on old films.
  - Long near-silences and one muffled texture throughout.
  - Sounds were run through antique wire recorders.
  - Each dry mono sound has a smeared stereo "shadow" for a dreamlike space.
  - Only the sounds that matter play at any moment, to lead the player's attention.
- **Adaptive music:**
  - Vertical layering stacks layers that fade in and out with play. It changes the mood without breaking the flow; in Sackboy's stealth level the layers follow where the player is.
  - Horizontal resequencing switches sections. It's better for big changes.
- **Ambient music in the browser:** the usual recipe is:
  - a few slightly detuned soft oscillators or a noise bed;
  - a low-pass filter moved slowly;
  - a long reverb;
  - a scheduler that picks the next chord from a scale every few seconds.
  It never loops audibly and costs no download.
- **Free recorded music:** CC0 loop packs exist (Tallbeard's bundle on itch.io, OpenGameArt, Freesound), and Pixabay has its own free licence. Each piece's licence must be checked; some look free but are non-commercial. They add 2–4 MB per track and can't react to play.

## The plan

1. **Calm ambient music, made in code.** A soft pad, 4–6 voices, in a gentle mode. It changes chord every 10–14 s with slow fades and a long reverb. It sits quietly under everything, never loops and adds 0 KB.
2. **The desert's own air:** a soft wind bed that swells and falls, and a faint far-away drone.
3. **The music follows the story, gently (vertical layering):**
   - **A monster becomes suspicious:** the pad darkens a little.
   - **A monster has him:** a low soft pulse joins, and fades out when he is safe again. Never loud; the aim is to keep calm, not to frighten.
   - **Each living flower found:** one more bell tone in the chord, so the world sounds fuller as it gets greener.
   - **Planting the flowers:** the chord resolves and brightens.
   - **Each detour (oasis, old city, canyon):** its own key and colour.
4. **Limbo's restraint and space:**
   - all effects share one soft reverb;
   - sounds are placed left or right by where they happen;
   - the music dips under hits.
5. **Better effects:**
   - footsteps on sand that vary;
   - monster voices of their own (a growl for the charger, a hiss for the spitter, a wing beat for the diver, a creak for the stalker, a hum for the watcher);
   - a soft chime on picking up a flower.
6. **Separate music and sound volumes** in the menu, remembered on the device.

Expected: 2/10 → about 6/10. Real recorded sound or a composer would be the step after that.

## Sources

- [Audiokinetic: interview with Martin Stig Andersen on LIMBO](https://blog.audiokinetic.com/interview-with-martin-stig-andersen-composer-and-sound-designer-on-playdeads-limbo/)
- [Designing Sound: LIMBO interview](https://designingsound.org/2011/08/01/limbo-exclusive-interview-with-martin-stig-andersen/)
- [Laced Records: Martin Stig Andersen](https://lacedrecords.com/blogs/news/interview-control-inside-composer-martin-stig-andersen)
- [Audiokinetic: interactive music to score gameplay](https://blog.audiokinetic.com/how-to-use-interactive-music-to-score-gameplay/)
- [Game Developer: vertical layering (GDC 2021)](https://www.gamedeveloper.com/game-platforms/pure-vertical-layering-for-game-music-composers-from-spyder-to-sackboy-gdc-2021-)
- [Game Developer: horizontal resequencing (GDC 2021)](https://www.gamedeveloper.com/audio/horizontal-resequencing-and-dynamic-transitions-for-game-music-composers-from-spyder-to-sackboy-gdc-2021-)
- [DEV: procedural audio textures in the browser](https://dev.to/hexshift/how-to-generate-procedural-audio-textures-in-the-browser-no-samples-needed-332l)
- [Cosmic Drift generative ambient](https://kaospappa.itch.io/cosmicdrift)
- [I Built an Ambient Synth](https://www.pootlepress.com/2026/03/i-built-an-ambient-synth/)
- [Tallbeard CC0 Music Loop Bundle](https://tallbeard.itch.io/music-loop-bundle/purchase)
- [OpenGameArt ambient pack](https://opengameart.org/content/ambientloading-screen-game-music-pack)
- [Free sound and music for games (2026)](https://app.cinevva.com/guides/free-sound-effects-music)

## Done (19 October 2026)

- core/music.ts: the calm pad (5 notes, 2 soft oscillators each, 5 s fades, a new chord every 10–14 s), a 5 s room, the wind, the drone.
  - It follows the monsters: darker when one is suspicious, a soft pulse when one has him.
  - Each found flower makes the bells more frequent (8% → 93% of the chances, with a second answering note from 4 flowers).
  - Planting resolves to a bright D major for 24 s; losing sinks it. Each detour has its own key.
  - It keeps playing across stretches and detours.
- core/sfx.ts: one shared 2.2 s room, sounds placed left or right, a voice per monster as it finds him, varied sand footsteps, a chime for a living flower. The music dips under hits.
- Pause menu: Music and Sound sliders, kept on this device. The M key mutes both.
- Score: 2 → about 5.5–6 of 10 (code-made instruments; a recorded or composed score is the next step).
