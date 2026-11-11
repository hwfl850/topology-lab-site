# Topology Lab

A drag-and-drop practice board for drawing bus, mesh and star networks, with
answer keys, scoring, a failure test, a field guide and a quiz.

It is a static site with no build step and no dependencies.

- `index.html` is the page.
- `js/data.js` holds all the content: role plays, devices, cables, prices, quiz.
- `js/engine.js` builds each board, its answer key and its scoring rules.
- `js/app.js` is the interface.
- `css/lab.css` is the only stylesheet.

## Run it

Open `index.html` in a browser, or serve the folder:

```
python3 -m http.server 8000
```

Progress (charts, best scores, quiz best) is saved in the browser's local
storage. Nothing is sent anywhere.

## Change it

Answer keys are generated from the role play descriptions in `js/data.js`, so
edit a role play there rather than placing nodes by hand. Then check that every
answer key still scores 100:

```
node tests/engine.test.js
```

Bump the `?v=` strings in `index.html` after editing CSS or JS so browsers
fetch the new files.

## Search engines

`index.html` carries a `noindex` tag so the site stays out of search results.
Keep it if you rename or add pages.

## Fonts

Figtree and Patrick Hand, both under the SIL Open Font License. The license
texts are in `fonts/`.
