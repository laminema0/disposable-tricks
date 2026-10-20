# Controls and feel: research and plan (19 October 2026)

Step 1 of improving the game (Amin: "firstly, controls and feel").

## Where we are (measured from the code)

| | Ours | Reference |
|---|---|---|
| Jump grace after leaving an edge | 0.10 s | Celeste about 0.1 s |
| Early jump press remembered | 0.13 s | Celeste about 0.08–0.1 s |
| Hold longer, jump higher; lighter at the top | Yes | Celeste: half gravity at the peak |
| Falls faster than rises | 1.5× | Common practice 1.5–2× |
| Full walking speed reached in | 0.10 s | Feels instant under 0.1 s |
| Strike fires | when the finger **lifts**, up to 0.20 s late | Good touch games: on touch-down, under 0.05 s |
| A strike tap also | walks him a step toward that side | Should not move him |
| Jump needs a drag up of | 40 px | Limbo: a quick flick up |
| Freeze on a hit, screen shake | Yes | Hollow Knight: freeze, knockback both ways, sound |
| Phone vibration | None | Android: works on the web. iPhone: not from a web page |
| Dust or squash on landing | None | Standard in good platformers |
| Corner forgiveness (head bump nudges aside, toe catches a ledge) | None | Celeste |

Score now: about 5/10. The movement maths is already at a good standard. The weak spots are the touch layer and the feedback.

## How the best did it

- **Limbo (phone):** the whole screen is the control. Press and lean the finger to walk, flick up to jump, hold to grab. There's no tutorial. Reviews praised it as simple, but said the jump gesture takes getting used to and it's less precise than a pad.
- **Celeste:** many small invisible helps. Jump grace, remembered presses, half gravity at the top, and nudging past corners. The player feels skilled and never cheated.
- **Hollow Knight:** each hit has a tiny freeze, both bodies are pushed apart, and the sound differs on armour and on flesh. That push stops you trading blows by accident.
- **Touch research:** irregular delay is worse than a short steady one. React on touch-down, keep handlers light, and use a minimum target of 44 px (60–80 px for game controls).
- **Vibration:** works from a web page on Android. On iPhone it doesn't. A workaround exists, but Apple may have closed it in iOS 26.5. So vibration can only ever be a bonus.

## The plan, in order of value

1. **Instant strike.** A second finger striking while the first walks fires on touch-down: 0 ms instead of up to 200 ms. With one finger, he only starts walking after 0.08 s of holding, so a tap no longer steps him sideways, and the strike fires on lift (about 0.12 s).
2. **Easier jump and lie down.** Trigger on a quick flick (fast finger), or 28 px instead of 40.
3. **Landing feel:** a puff of dust, a small squash on landing and a stretch on take-off, scaled by the fall.
4. **Hits that push both ways:** his strike knocks him back a little too, as in Hollow Knight. When he's hurt: a short freeze, a red flash at the screen edge and a knockback, so a hit can never go unnoticed.
5. **Corner forgiveness:** a head bump on an edge nudges him past it. A jump that just misses a ledge or a pit edge still lands.
6. **Vibration on Android:** 12 ms for a hit, 30 ms when hurt, 8 ms for a hard landing. Off on iPhone, with nothing broken.
7. **Showing the touch:** a soft ring where the finger lands and an arrow as it drags up or down, fading after the first minute. Limbo had no tutorial and players had to discover the controls.
8. **Measure it:** a debug readout of the time from touch to reaction, aiming at under 50 ms.

Expected after 1–6: about 7/10. Steps 7–8 are about trust and checking. The final judge is Amin's phone test.

## Sources

- [Celeste & Forgiveness (Maddy Thorson)](https://maddymakesgames.com/articles/celeste_and_forgiveness/)
- [GameSpot: Celeste dev explains how they made the game feel](https://www.gamespot.com/articles/celeste-dev-explains-how-they-made-their-game-feel/1100-6474775/)
- [Macworld: Limbo for iPad and iPhone](https://www.macworld.com/article/667064/limbo-game-for-ipad-and-iphone-review-a-puzzle-platform-masterpiece.html)
- [Game Informer: Limbo iOS impressions](https://gameinformer.com/b/features/archive/2013/07/03/limbo-ios-impressions)
- [AppSpy: Limbo review](https://www.appspy.com/review/7575/limbo-game)
- [TechCrunch: why touchscreen controls in games are hard](https://techcrunch.com/2016/04/28/researchers-propose-theory-on-why-touchscreen-controls-in-mobile-games-are-the-worst)
- [Touch controls guide (abratabia)](https://abratabia.com/game-controls/touch-controls.php)
- [Hollow Knight review (critpoints)](https://critpoints.net/2017/06/22/hollow-knight-review/)
- [Epilogue Gaming: Hollow Knight](https://epiloguegaming.com/three-and-out-hollow-knight/)
- [bugnet: knockback that feels good](https://bugnet.io/blog/how-to-implement-knockback-that-feels-good)
- [Web haptics browser support](https://www.mintlify.com/lochie/web-haptics/advanced/browser-support)
- [bugnet: vibrate API on iOS Safari](https://bugnet.io/blog/fix-web-game-vibrate-api-not-available-ios-safari)

## Done (19 October 2026), and the new evaluation

| | Before | Now |
|---|---|---|
| Strike with a second finger while walking | on lift, up to 200 ms | on touch-down, the next frame |
| A strike tap steps him sideways | yes | no: walking waits 80 ms of holding |
| Jump or lie down | 40 px drag | 28 px drag, or a quick flick of 14 px |
| Landing | the same small squash every time | squash scaled by the fall, a puff of dust |
| His hit on a monster | the monster is pushed back | both are pushed apart, and the phone buzzes |
| Being hurt | knockback and shake | plus a 0.08 s freeze, red screen edges and a buzz |
| A jump that just misses a pit's far edge | falls in | lands if within 14 px |
| Phone vibration | none | Android: hit 12 ms, hurt 30 ms, hard landing 8 ms |
| Seeing your touch | nothing | a ring and an up/down arrow for the first minute |
| Delay readout | none | in the debug panel (Q): touch to action, in ms |

Checked in a phone-sized browser tab with simulated fingers: second finger struck the next frame; quick flick of 16–18 px jumped, a slow 18 px drag did not; ledge catch at 6 and 12 px, not at 22; red edges and dust shown.
Not applicable: head-bump corner correction (the world has no ceilings or platforms yet).
Score: about 5 → about 6.5–7 out of 10. The last half point needs Amin's phone test.
