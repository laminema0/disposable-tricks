# Graphics loops

Amin asked on 15 October 2026 for a focused pass on the game's graphics, in about ten loops:
"Work on the graphic of the game really, really hard. Evaluate it, check it, try to make something really unique.
It must be pleasant. You can make something simple, but the way you make it and present it must be visually good."

Each loop: look at the game at phone-landscape size (844 x 390), name what is weakest, change it, look again.

## Loop 0: the starting point

What works: one coherent night palette, the moon, the lamp's glow, black silhouettes with yellow eyes, the merged winged Watcher.

What is weak, worst first:
1. The ground is a flat dark band across the bottom fifth, with random dashes that read as noise.
2. Monster gaze cones end in a hard straight edge, like a cut-out.
3. The hero is grey-violet on a grey-violet world. He blends in, even near a lamp.
4. The trees are clip-art (lollipops and stacked triangles), all one colour, so there is little depth.
5. The puddle is a flat pale ellipse that reads as a hole.
6. Pillars and rocks are plain dark slabs with no light on them.
7. The lamp is a radial blob; there is no sense of light falling.
8. Half the screen is empty sky.

## Loop 1: the ground and the gaze

- Ground: a gradient earth that sinks into darkness, a thin rim that catches the light and brightens near every lamp,
  curved grass in clumps, a few sunk stones.
- A signature detail: small pale flowers line the road. They are open where light reaches them and closed in the dark,
  like the flower on his head.
- Gaze: each cone is now a fan whose corners carry their own brightness, so it fades smoothly to nothing at the far end.
  A tighter, brighter core sits near the eye.
- Checked: the beams first still looked like boxes because the Stalker's sight is a band. Reworked so only the eye is
  bright on the outline and every other corner is dark: the sides now feather out like a real beam.

## Loop 2: depth in the backdrop

- Trees redrawn: tall pines with drooping tiers, broad trees with a leaning trunk and an uneven crown, bare trees with forking twigs.
- Air between the layers: each layer further back fades toward the horizon colour, and a band of haze lies along the ground between layers.
- Stars in the upper sky (some breathe) and a soft halo round the moon.

## Loop 3: the hero

- A soft outline of light all round him: a thin cool edge in the dark, warmer and stronger near a lamp, weaker when he hides.
  He no longer melts into dark trees.

## Loop 4: props and lamps

- Lamps throw a cone of light down to the path, with a rare flicker.
- Pillars are stone columns now: plinth, slightly tapering shaft with flutes, a capital or a broken top, ivy, and a lit edge on the side facing the nearest light.
- Rocks catch light on the face toward the lamp and have a crack.

## Loop 5: water and mirrors

- Pools hold a piece of the night sky: darker inside, a pale lip, slow ripples. The moon in the water is a short column of broken light.
- The mirror's glass shows the sky with one bright streak; its thrown beam fades toward the ground and leaves a soft spot.

## Loop 6: atmosphere

- A low mist drifts along the ground (first version had hard edges; fixed by fading the strip at top and bottom).
- Fine moving film grain over everything, and softly darker corners.

## Loop 7: the corner display

- The petal flower now sits in a soft glow, and the row of tiny dots became a thin ring around it that fills one golden segment per flower collected.

## Loop 8: moods

- Checked calm, happy, eerie and fierce. Every new colour comes from the mood's palette, so all four hold together.
- The flower burst already reads as the best moment (ring of light, flash, coloured flowers); left as it is.

## Loop 9: written games

- Written games share the look: stars, moon halo, haze between hills, a row of pines, a gradient earth with a lit edge,
  grass clumps and the small road flowers, and darker corners.
- Their lights are capped in size and brightness, so the Catch game's light no longer washes out the screen.

## Loop 10: checks

- 234 tests and the build pass.
- Not measured: speed on a phone. The preview pane slows animation while it is hidden, so frame rate could not be judged here.
  The new effects that cost the most are the hero's outline glow, the vignette and the grain. If a phone stutters, those are the first to switch off.
