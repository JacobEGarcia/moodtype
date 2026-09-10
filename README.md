# MOODTYPE

A dynamic **text-emotion dialogue system** for narrative games - the font shifts with the
mood of the line and the personality of the speaker - wrapped in a playable original scene,
**The Candle Wardens**. Built as an homage to
[@JungleSilicon's text-emotion demo](https://x.com/junglesilicon/status/2097796326583144825).
All art, story, characters, and code here are original.

## Run it

Static site, no build step. Open `index.html` or serve the folder:

```
python3 -m http.server 8000
# http://localhost:8000
```

Click (or space) to advance. Click again mid-line to complete the typewriter.
Buttons: **auto** (watch it like the video), **voices**, **replay**.
Debug/deep-link: `?beat=N&instant=1&mute=1&auto=1`.

## The system

Every script line carries a `mood`. The type layer re-skins itself live: font family,
weight, letter-spacing, case, color, and per-letter motion all change with the emotion,
while each speaker keeps a **personality base typeface** underneath.

| speaker | personality type |
|---|---|
| Vesk | Barlow Condensed, sturdy |
| Lio | Quicksand, light and round |
| Mother Thistle | Cormorant Garamond, old-style serif |
| The Visitor | Spectral hairline, wide tracking |

| mood | treatment |
|---|---|
| calm | old-style serif italic, soft green-white |
| tense | condensed, tightened spacing, heavier weight |
| fear | thin and pale, letters physically shake |
| whisper | small, wide-tracked, dimmed, dropped case |
| anger | black-weight sans, hot red, pulsing scale |
| menace | dripping horror face (Eater), violet glow, drifting letters |
| sorrow | faded thin italic, letters breathe in slowly |
| wonder | hairline serif, wide glowing tracking |
| joy | rounded bold, warm gold, gentle bob |
| resolve | steady tracked caps |

A mood chip in the corner narrates which treatment is active, so the system is legible
while the scene plays. Scene: 15 beats, 9 mood treatments, 4 speakers, 3 stage slots.

## Voices

Web Speech API (`speechSynthesis`) - free, offline, no API keys. Pitch and rate are set
per character and modulated per mood (menace slows and drops, fear speeds up).
Toggle with the **voices** button.

## Stack

Hand-written HTML/CSS/JS and inline SVG (characters, night-forest environment, the shrine).
Google Fonts via CDN (all OFL-licensed). No frameworks, no build, no paid anything.
Deploys as-is to GitHub Pages.
