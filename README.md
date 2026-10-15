# Jen Li Kao — portfolio

A static site served by GitHub Pages from the repo root: plain HTML, CSS and classic scripts, with no build step and no npm packages. Opening `index.html` straight from disk also works.

```
index.html      the page
css/style.css   all styles
js/             content.js (all text and links) → avatar, props, furni (pixel art) → cabin.js (the scene) → narration.js, tours.js (project overviews) → main.js
audio/          voice-over tracks for the project overviews (made by tools/narrate.py)
tools/          dev only: checks, browser tests, screenshots
docs/           design spec and change log
```

## Before every commit

```sh
node tools/check.mjs --stamp   # offline checks; re-stamps ?v=<hash> on the CSS/JS links in index.html
node tools/browser.mjs         # browser tests (needs Google Chrome)
```

The project overviews in `js/tours.js` are narrated: after changing a subtitle there, re-make the voice-over with `tools/narrate.py` (instructions at its top; needs Python, ffmpeg and the Kokoro text-to-speech model), then re-stamp.

Other tools: `node tools/check.mjs --links` checks every external link, and `node tools/shot.mjs out.png [selector]` / `node tools/zoom.mjs out.png x y w h` take screenshots.

`CV_JLK.pdf`, `me.jpeg` and `template.rtf` are private: they stay git-ignored, and `check.mjs` fails if they are ever tracked.
