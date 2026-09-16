# TheGlowTribe

Website for The Glow Tribe, a cross-denominational creative community in Warri,
Nigeria, and its No Bushels creative conference on 21 November 2026.

Built with [Astro](https://astro.build). Two pages: `/` and `/conference`.

## Develop

```
npm install
npm run dev       # local dev server
npm run build     # static build to dist/
npm run preview   # serve the built output
```

## Decisions that look arbitrary but are load-bearing

**CSS and JS are plain files in `public/`, not bundled through Astro.** The
markup is componentised per section, but the styles and behaviour are not,
because there is real cross-section coupling:

- A documented stylesheet order: `skeleton.css` → the page's own CSS →
  `footer.css` → `reveal.css` → `tokens.css` → `type.css`. The last two must
  stay last, so the type system wins over stand-in sizing at equal
  specificity. Source order is the whole mechanism.
- One shared `[data-fade]`/`[data-r]` reveal system drives every section from
  a single observer pass. Per-component scoping would silently break it across
  component boundaries.
- Shared helpers (`at`, `ease`, `easeOut`) are reused by the hero, the Who
  typewriter, and the Why aperture.

**Images and video are static files in `public/`, not `astro:assets`.** They
are already pre-cropped WebP at the exact dimensions each slot needs, so
re-processing them at build time would cost time for no gain. Revisit if the
asset pipeline changes.

**`og:image` is omitted rather than stubbed.** No real production image exists
yet. A missing tag is honest; a placeholder ships a broken share card.

**The favicon is the Astro scaffold's stock icon.** It resolves, so nothing
404s, but it is not final.

**`?dev=1` loads a motion tuning rig** (`public/scripts/dialkit-rig.js` and
`public/vendor/dialkit/`, MIT). It never renders without that query string and
writes only to `localStorage`. It should come out once the hero's motion
values are settled and hard-coded.

## Before launch

- Real speaker names and photography. The three speaker cards currently pair
  real stock photographs with invented names, which must not ship as-is.
- Real schedule times. The current ones are provisional.
- Confirmed community size figure, or drop the numeric claim.
- The logo and wordmark from the client's designer.
- A real `og:image` and a branded favicon.
- Form backend and newsletter provider are unowned.
