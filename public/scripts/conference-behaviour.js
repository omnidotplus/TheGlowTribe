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

/* ============================================================================
   The flyer-to-register connector.

   Drawn from MEASURED geometry rather than fixed percentages. The first
   attempt positioned the arrow at left:38%/top:44% and it landed in the middle
   of the Email field, because the form's height is content-dependent and the
   button moves with it. Measuring both ends and recomputing on resize is the
   only version that stays pointed at the thing it is about.

   Decorative: aria-hidden in the markup, pointer-events none in CSS. Skipped
   entirely below 900px, where the columns stack and a diagonal would be lying
   about the relationship.
   ========================================================================= */
(() => {
  const hero = document.querySelector('.ev__hero');
  const svg  = document.querySelector('.ev__link');
  const fly  = document.getElementById('evFlyer');
  const btn  = document.getElementById('regSubmit');
  if (!hero || !svg || !fly || !btn) return;

  const pathEl = svg.querySelector('.ev__linkPath');
  const headEl = svg.querySelector('.ev__linkHead');

  function draw() {
    if (window.innerWidth <= 900) { svg.style.display = 'none'; return; }
    svg.style.display = '';

    const H = hero.getBoundingClientRect();
    const F = fly.getBoundingClientRect();
    const B = btn.getBoundingClientRect();
    if (!H.width) return;

    svg.setAttribute('viewBox', `0 0 ${H.width} ${H.height}`);

    /* Start BELOW the flyer, not at its right edge. The flyer's right edge and
       the button's left edge sit at nearly the same x, so leaving sideways
       produced an almost vertical line -- not the slant this is meant to be.
       Dropping below the poster first gives the arrow real horizontal travel,
       and it reads as coming from the whole object rather than from one edge. */
    const x1 = F.left - H.left + F.width * 0.62;
    const y1 = F.bottom - H.top + 16;
    const x2 = B.left  - H.left - 16;
    const y2 = B.top   - H.top  + B.height / 2;

    /* If the form has flipped to "you're in", withdraw the arrow: it would be
       pointing at a button the visitor can no longer see. Testing the button's
       own box is NOT enough -- the flipped-away face keeps its layout
       dimensions (it is rotated and transparent, not removed), so the only
       reliable signal is the flip's own state. Verified: the first version
       checked B.width and left the arrow visible after submit. */
    const flip = document.getElementById('regFlip');
    if ((flip && flip.dataset.flipped === '1') || !B.width || !B.height) {
      svg.style.display = 'none'; return;
    }

    /* control point below the straight line, so the curve sags the way a
       drawn-on arrow would rather than bulging upward */
    const cx = x1 + (x2 - x1) * 0.55;
    const cy = y1 + (y2 - y1) * 0.92;
    pathEl.setAttribute('d', `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`);

    /* arrowhead rotated to the curve's actual exit angle (tangent at t=1 of a
       quadratic is simply end minus control) */
    const ang = Math.atan2(y2 - cy, x2 - cx);
    const L = 15, spread = 0.42;
    const hx1 = x2 - L * Math.cos(ang - spread), hy1 = y2 - L * Math.sin(ang - spread);
    const hx2 = x2 - L * Math.cos(ang + spread), hy2 = y2 - L * Math.sin(ang + spread);
    headEl.setAttribute('d', `M ${hx1} ${hy1} L ${x2} ${y2} L ${hx2} ${hy2}`);
  }

  draw();
  addEventListener('resize', draw);
  if (window.ResizeObserver) new ResizeObserver(draw).observe(hero);
  /* the webfonts change the button's position when they swap in */
  if (document.fonts) document.fonts.ready.then(draw).catch(() => {});

  /* redraw when the card flips either way, so the arrow withdraws on submit
     and comes back if they register someone else */
  const flipEl = document.getElementById('regFlip');
  if (flipEl && window.MutationObserver) {
    new MutationObserver(draw).observe(flipEl, {
      attributes: true, attributeFilter: ['data-flipped']
    });
  }
})();
