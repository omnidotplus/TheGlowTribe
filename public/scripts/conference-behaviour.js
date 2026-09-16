/* ---------------- the countdown ---------------- */
const TARGET = new Date('2026-11-21T09:00:00+01:00').getTime();
const pad = n => String(Math.max(0, n)).padStart(2, '0');

function trueValues() {
  const diff = Math.max(0, TARGET - Date.now());
  return {
    d: Math.floor(diff / 864e5),
    h: Math.floor(diff / 36e5) % 24,
    m: Math.floor(diff / 6e4) % 60,
    s: Math.floor(diff / 1e3) % 60
  };
}
function paint(v) {
  const set = (k, val) => {
    const el = document.querySelector('[data-c="' + k + '"]');
    if (el) el.textContent = pad(val);
  };
  set('d', v.d); set('h', v.h); set('m', v.m); set('s', v.s);
}

paint(trueValues());
setInterval(() => paint(trueValues()), 1000);





/* ---- R4: the register panel turns over. The confirmation is the reverse of
        the same card, not a message stacked beneath it. ---- */
(() => {
  const flip = document.getElementById('regFlip');
  const form = document.getElementById('regForm');
  const back = document.getElementById('regBack');
  const undo = flip && flip.querySelector('.ev__undo');
  if (!flip || !form || !back) return;

  const setFace = (flipped) => {
    flip.dataset.flipped = flipped ? '1' : '0';
    back.setAttribute('aria-hidden', flipped ? 'false' : 'true');
    /* the hidden face must leave the tab order, or you can focus through the card */
    form.querySelectorAll('input,select,button').forEach(el => el.tabIndex = flipped ? -1 : 0);
    back.querySelectorAll('button').forEach(el => el.tabIndex = flipped ? 0 : -1);
  };

  form.addEventListener('submit', e => { e.preventDefault(); setFace(true); });
  if (undo) undo.addEventListener('click', () => { setFace(false); form.reset(); });
  setFace(false);
})();

/* ---- footer wordmark: fit-to-width.
        clamp() cannot do this — the ratio between viewport and container
        changes with the page's padding, so any vw value is either clipped at
        one breakpoint or short at another. Measure the natural width at a
        known size, then scale. Exact at every width. ---- */
const ftWord = document.querySelector('.ft__word');
function fitWordmark() {
  if (!ftWord) return;
  ftWord.style.transform = 'scale(1)';
  const natural = ftWord.getBoundingClientRect().width;
  const row = ftWord.parentElement;
  const cs = getComputedStyle(row);
  /* the band now carries horizontal padding, so the border box overstates the
     space the letters may occupy. Measure the CONTENT width or the wordmark
     bleeds into the gutter. */
  const avail = row.clientWidth
              - (parseFloat(cs.paddingLeft) || 0)
              - (parseFloat(cs.paddingRight) || 0);
  if (natural <= 0 || avail <= 0) return;
  const k = avail / natural;
  ftWord.style.transform = `scale(${k.toFixed(4)})`;
  /* height is left to the band's own padding now — it is a full-bleed block
     with generous vertical padding, so pinning an explicit pixel height only
     fought the bloom's overflow. */
}
fitWordmark();
addEventListener('resize', fitWordmark);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitWordmark);

/* footer live Warri time */
/* footer clock removed: colon-numeral pairs are reserved for Matthew 5:15 */

/* ---- The notched-card outline.
   An S-curve step at the top-left and bottom-right: the edge travels in, turns
   down through a CONCAVE curve, then back out through a CONVEX one. Two
   opposing arcs per step — which is why border-radius cannot do it and why a
   quarter-circle bite is the wrong shape.

   Generated as a clip-path so the arcs stay circular at any element size,
   rather than stretching with the box. Recomputed on resize. ---- */
(() => {
  const el = document.querySelector('.ev__panel');
  if (!el || !CSS.supports('clip-path', 'path("M0,0")')) return;

  function outline() {
    const { width: W, height: H } = el.getBoundingClientRect();
    if (!W || !H) return;
    const R  = 26;                                   // outer corners
    const r  = Math.min(18, W * 0.05);               // the step's curves
    const SW = Math.max(90, Math.min(W * 0.34, 190));// step width
    const SH = Math.max(30, Math.min(H * 0.11, 46)); // step depth

    const p = [
      `M 0,${SH + R}`,
      `A ${R},${R} 0 0 1 ${R},${SH}`,                // outer corner, lower level
      `L ${SW - r},${SH}`,
      `A ${r},${r} 0 0 0 ${SW},${SH - r}`,           // concave — into the step
      `L ${SW},${r}`,
      `A ${r},${r} 0 0 1 ${SW + r},0`,               // convex — back out to the top edge
      `L ${W - R},0`,
      `A ${R},${R} 0 0 1 ${W},${R}`,
      `L ${W},${H - SH - R}`,
      `A ${R},${R} 0 0 1 ${W - R},${H - SH}`,        // mirrored step, bottom-right
      `L ${W - SW + r},${H - SH}`,
      `A ${r},${r} 0 0 0 ${W - SW},${H - SH + r}`,   // concave
      `L ${W - SW},${H - r}`,
      `A ${r},${r} 0 0 1 ${W - SW - r},${H}`,        // convex
      `L ${R},${H}`,
      `A ${R},${R} 0 0 1 0,${H - R}`,
      'Z'
    ].join(' ');

    el.style.clipPath = `path("${p}")`;
    el.dataset.clipped = '1';
  }

  outline();
  addEventListener('resize', outline);
  if (window.ResizeObserver) new ResizeObserver(outline).observe(el);
})();

/* ============================================================================
   THE ASK — the line types in, then "something" changes face five times and
   settles on a sixth.

   Why JS and not CSS: font-family is not an animatable property, so this
   cannot be a keyframe animation at all. An earlier attempt animated
   Archivo's width/weight axes instead and the client correctly called it out
   as "all looked the same" -- it was one typeface stretching. Stepping
   discrete families is the only way to actually change face, and stepping
   discrete states over time is exactly what JS is for.

   Pacing: 5 face changes at 360ms = 2.8 changes/sec, deliberately under
   WCAG 2.3.1's 3-flashes-per-second photosensitivity threshold. Recount
   before shortening this.
   ========================================================================= */
(() => {
  const h = document.getElementById('askStatement');
  if (!h) return;

  const word  = h.querySelector('.flashword');
  const caret = h.querySelector('.ev__caret');
  const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* the markup already holds the finished line, so no-JS and crawlers get
     real text. Only enhance when we can actually animate. */
  if (REDUCE) { h.dataset.typed = '1'; return; }

  const L1 = h.dataset.line1 || '';
  const L2 = h.dataset.line2 || '';
  const WORD = word.textContent;

  /* rebuild as: line1 <br> line2 + word. Text nodes are replaced rather than
     using innerHTML per character, so the .flashword element itself is never
     destroyed and keeps its data-face/bloom state. */
  const t1 = document.createTextNode('');
  const br = document.createElement('br');
  const t2 = document.createTextNode('');
  h.textContent = '';
  h.append(t1, br, t2, word, caret);
  word.textContent = '';
  word.removeAttribute('data-face');

  const FACES = ['1', '2', '3', '4', '5'];
  const CHAR_MS = 42;     /* per character while typing */
  const FACE_MS = 360;    /* per face while flashing -- see pacing note above */

  const sleep = ms => new Promise(r => setTimeout(r, ms));

  async function typeInto(node, text) {
    for (let i = 1; i <= text.length; i++) {
      node.textContent = text.slice(0, i);
      await sleep(CHAR_MS);
    }
  }

  (async () => {
    /* FORCE the six faces to download before flashing.
       document.fonts.ready is NOT sufficient and this was a real bug: it
       resolves once the fonts currently IN USE have loaded, and says nothing
       about families that are merely declared. Measured: only 2 of 6 font
       files had actually been fetched at that point, so the flash rendered
       fallbacks for most states -- which is why one face came out as caps
       from a substitute rather than the face it was meant to be.
       document.fonts.load() forces the fetch per family. */
    const FAMS = ['Bebas Neue','Playfair Display','Rubik Mono One',
                  'Caprasimo','Syne','Alfa Slab One'];
    try {
      await Promise.race([
        Promise.all(FAMS.map(f => document.fonts.load('400 40px "' + f + '"'))
          .concat([document.fonts.load('900 40px "Playfair Display"'),
                   document.fonts.load('800 40px "Syne"')])),
        sleep(2500)   /* a CDN stall must not hold the headline hostage */
      ]);
    } catch (_) {}

    await typeInto(t1, L1);
    await typeInto(t2, L2);
    await typeInto(word, WORD);
    h.dataset.typed = '1';          /* retires the caret */
    await sleep(240);

    for (const f of FACES) { word.dataset.face = f; await sleep(FACE_MS); }
    word.dataset.face = 'final';    /* settles white, bloom fades in via CSS */
  })();
})();

/* ============================================================================
   THE DETAILS card is gated behind registering, on mobile.

   Client, stated twice: the card must not be reachable by scrolling before
   the form is submitted. On submit the "you're in" face shows first, and the
   card only then becomes available further down the page.

   Mobile only -- on desktop the card sits BESIDE the form as one composition,
   and hiding half of a side-by-side layout would leave a hole.
   ========================================================================= */
(() => {
  const sec   = document.getElementById('event');
  const form  = document.getElementById('regForm');
  const panel = document.querySelector('.ev__panel');
  if (!sec || !form || !panel) return;

  /* aria-hidden + inert would be wrong before submit only if the content were
     reachable; it is not, so hide it from assistive tech too while gated. */
  const gate = on => {
    sec.dataset.registered = on ? '1' : '0';
    panel.setAttribute('aria-hidden', on ? 'false' : 'true');
  };
  gate(false);

  form.addEventListener('submit', () => {
    /* the flip to "you're in" is owned by the existing handler above; this
       only releases the card, and deliberately lags it so the confirmation
       is what the visitor reads first. */
    setTimeout(() => gate(true), 900);
  });

  const undo = document.querySelector('.ev__undo');
  if (undo) undo.addEventListener('click', () => gate(false));
})();
