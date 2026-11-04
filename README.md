# Jen Li Kao — portfolio

A static site served by GitHub Pages from the repo root: plain HTML, CSS and classic scripts, with no build step and no npm packages. There are two versions of the same content, with a Pixel / ASCII switch in each header: the ASCII version is the home page, and the pixel cabin lives at `pixel/`.

```
index.html        the home page: the ASCII version
ascii/            its styles and script (style.css, main.js: text-art figures, cards, dialogs, the tours drawn in text)
pixel/index.html  the pixel version (the cabin)
css/style.css     the pixel version's styles
js/               content.js (all text and links, shared by both versions) → avatar, props, furni (pixel art) → cabin.js (the scene)
                  → narration.js, tours.js (narrated project overviews, played by both versions) → main.js (the pixel page)
audio/            voice-over tracks for the project overviews (made by tools/narrate.py)
tools/            dev only: checks, browser tests, screenshots
docs/             design spec and change log
```

## Before every commit

```sh
node tools/check.mjs --stamp   # offline checks; re-stamps ?v=<hash> on the CSS/JS links in index.html and pixel/index.html
node tools/browser.mjs         # browser tests (needs Google Chrome)
```

The project overviews in `js/tours.js` are narrated: after changing a subtitle there, re-make the voice-over with `tools/narrate.py` (instructions at its top; needs Python, ffmpeg and the Kokoro text-to-speech model), then re-stamp.

Other tools: `node tools/check.mjs --links` checks every external link, and `node tools/shot.mjs out.png [selector]` / `node tools/zoom.mjs out.png x y w h` take screenshots.

`CV_JLK.pdf`, `me.jpeg` and `template.rtf` are private: they stay git-ignored, and `check.mjs` fails if they are ever tracked.
