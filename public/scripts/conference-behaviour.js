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

  /* Submit, then store, THEN turn the card. The card used to flip the instant
     submit fired, which told the visitor they were registered before anything
     had been recorded. If the request fails they stay on the form with the
     reason, because a confirmation that is not backed by a stored row is a
     lie to someone who then does not turn up to a chair that was never set. */
  const submitBtn = document.getElementById('regSubmit');
  const note = document.getElementById('regNote');
  const noteText = note ? note.textContent : '';
  let sending = false;

  function say(msg, kind) {
    if (!note) return;
    note.textContent = msg;
    note.dataset.kind = kind || '';
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (sending) return;

    const endpoint = form.dataset.endpoint;
    const payload = {
      name:       (document.getElementById('rn2') || {}).value || '',
      email:      (document.getElementById('re2') || {}).value || '',
      phone:      (document.getElementById('rp2') || {}).value || '',
      discipline: (document.getElementById('rd2') || {}).value || '',
      page: location.pathname
    };

    /* No endpoint configured: say so plainly rather than faking a success.
       See site/REGISTRATION_SETUP.md. */
    if (!endpoint) {
      say('Registration is not connected yet. Nothing was stored.', 'err');
      return;
    }

    sending = true;
    form.dataset.sending = '1';
    if (submitBtn) { submitBtn.disabled = true; submitBtn.dataset.label = submitBtn.textContent; submitBtn.textContent = 'Saving…'; }
    say('Saving your place…', '');

    try {
      /* text/plain is deliberate. Google Apps Script web apps do not answer a
         CORS preflight, so an application/json POST fails before it is sent.
         text/plain makes this a "simple request", which skips preflight
         entirely AND still lets us read the response. The script parses the
         body as JSON on its side. */
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
        redirect: 'follow'
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const out = await res.json().catch(() => ({ ok: true }));
      if (out && out.ok === false) throw new Error(out.error || 'rejected');

      setFace(true);
      say(noteText, '');
    } catch (err) {
      say('That did not save. Check your connection and try again.', 'err');
    } finally {
      sending = false;
      form.dataset.sending = '0';
      if (submitBtn) { submitBtn.disabled = false; if (submitBtn.dataset.label) submitBtn.textContent = submitBtn.dataset.label; }
    }
  });

  if (undo) undo.addEventListener('click', () => { setFace(false); form.reset();
    form.querySelectorAll('.field').forEach(f => f.dataset.invalid = '0');
    say(noteText, ''); });
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

/* ============================================================================
   Registration form validation.

   Name, email and discipline are required. PHONE IS OPTIONAL, and when it is
   filled it must be an actual number: digits, spaces, dashes and a leading +
   only, resolving to a real Nigerian-length number. "actual numbers and not
   abstract stuff", per the client.

   The form carries `novalidate` so this runs instead of the browser's own
   bubbles, which cannot be styled and only ever surface one field at a time.
   The HTML constraints stay in the markup, so a no-JS visitor still gets
   native validation rather than none.
   ========================================================================= */
(() => {
  const form = document.getElementById('regForm');
  if (!form) return;

  const EMAIL = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

  /* Nigerian mobile numbers are 11 digits starting 0 (0801...), or the same
     subscriber number in international form: +234 then 10 digits. Accept both,
     plus a bare 10-digit subscriber number, and ignore spaces, dashes and
     brackets entirely so a pasted number is never rejected on formatting. */
  function phoneProblem(raw) {
    const v = raw.trim();
    if (!v) return null;                             /* optional: empty is fine */
    if (/[^\d\s()+-]/.test(v))
      return 'Numbers only, no letters.';
    const d = v.replace(/[^\d]/g, '');
    if (d.length < 10) return 'Too short. 11 digits, like 0801 234 5678.';
    if (/^234/.test(d))  return d.length === 13 ? null : 'With 234, that is 13 digits.';
    if (/^0/.test(d))    return d.length === 11 ? null : 'Starting with 0, that is 11 digits.';
    if (d.length === 10) return null;                /* subscriber part alone */
    return 'That does not look like a phone number.';
  }

  const CHECKS = {
    rn2: v => !v.trim()            ? 'Your name, so we know who to expect.'
            : v.trim().length < 2  ? 'That is too short to be a name.'
            : !/[A-Za-zÀ-ɏ]/.test(v) ? 'A name needs at least one letter.'
            : null,
    re2: v => !v.trim()            ? 'An email, so we can send directions.'
            : !EMAIL.test(v.trim()) ? 'Check this address. It needs an @ and a domain.'
            : null,
    rp2: phoneProblem,
    rd2: v => !v ? 'Pick the one closest to what you make.' : null
  };

  function mark(el, msg) {
    const field = el.closest('.field');
    const err = field && field.querySelector('.field__err');
    const bad = !!msg;
    if (field) field.dataset.invalid = bad ? '1' : '0';
    if (err) err.textContent = msg || '';
    el.setAttribute('aria-invalid', bad ? 'true' : 'false');
    return !bad;
  }

  Object.keys(CHECKS).forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;

    /* Validate on blur, never while someone is still mid-word: telling a
       visitor their email is wrong at "a@" is noise, not help. Once a field is
       already showing an error, re-check on input so the message clears the
       moment it is fixed rather than waiting for another blur. */
    el.addEventListener('blur', () => mark(el, CHECKS[id](el.value)));
    el.addEventListener('input', () => {
      const f = el.closest('.field');
      if (f && f.dataset.invalid === '1') mark(el, CHECKS[id](el.value));
    });
    if (el.tagName === 'SELECT')
      el.addEventListener('change', () => mark(el, CHECKS[id](el.value)));
  });

  /* Strip anything that is not part of a number as it is typed, so the field
     cannot hold letters at all. */
  const phone = document.getElementById('rp2');
  if (phone) phone.addEventListener('input', () => {
    const cleaned = phone.value.replace(/[^\d\s()+-]/g, '');
    if (cleaned !== phone.value) {
      const at = phone.selectionStart - (phone.value.length - cleaned.length);
      phone.value = cleaned;
      try { phone.setSelectionRange(at, at); } catch (_) {}
    }
  });

  form.addEventListener('submit', e => {
    let firstBad = null;
    Object.keys(CHECKS).forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      if (!mark(el, CHECKS[id](el.value)) && !firstBad) firstBad = el;
    });
    if (firstBad) {
      /* stop the existing handler from flipping the card on invalid input */
      e.preventDefault();
      e.stopImmediatePropagation();
      firstBad.focus();
      firstBad.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, true);   /* capture: must run BEFORE the flip handler bound further up */
})();

/* ============================================================================
   The speakers carousel: drifts on its own, and can be dragged.

   Why scrollLeft and not a CSS marquee. A translated track cannot be scrubbed,
   and the client specifically wants to go back and forth through the speakers
   to move faster. Driving the element's own scroll position means the drift
   and the drag are the same mechanism, so they cannot disagree: a finger just
   moves the thing the animation was already moving.

   The track is rendered twice, so wrapping at the halfway point is invisible.
   ========================================================================= */
(() => {
  const rail = document.getElementById('spkRail');
  if (!rail) return;

  const MOBILE = () => matchMedia('(max-width: 860px)').matches;
  const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Reduced motion keeps the carousel, it just never moves by itself: the
     strip is still fully reachable by dragging. Gentler, never zero. */
  if (REDUCE) return;

  const SPEED = 24;          /* px per second. Slow enough to read a face. */
  const RESUME_AFTER = 2600; /* ms of stillness before the drift comes back */

  let paused = false, inView = false, resumeTimer = 0, last = 0, raf = 0;
  /* The position is accumulated as a FLOAT and assigned, never incremented.
     scrollLeft is integer-quantised, so `scrollLeft += 0.4` every frame rounds
     to zero and the carousel never moves: measured 7px of travel where 29 was
     expected. Keeping the real position here and assigning it lets the
     fractional part carry over between frames. */
  let pos = 0;

  /* Wrap at the halfway mark, which is exactly one track.
     Operates on `pos`, the float, and never reads scrollLeft back: scrollLeft
     is integer-quantised, so a read-back rounds the fractional part away. An
     earlier version re-synced from it every frame and that silently destroyed
     the accumulation -- measured 1px of travel where 36 was expected. */
  function wrap() {
    const half = rail.scrollWidth / 2;
    if (half < 8) return;
    if (pos >= half) pos -= half;
    else if (pos < 0) pos += half;
  }

  function frame(now) {
    if (!last) last = now;
    const dt = Math.min(0.05, (now - last) / 1000);   /* clamp: a backgrounded
                                                         tab must not jump */
    last = now;
    if (!paused && inView && MOBILE()) {
      pos += SPEED * dt;
      wrap();
      rail.scrollLeft = pos;      /* write only; pos stays authoritative */
    }
    raf = requestAnimationFrame(frame);
  }

  const hold = () => {
    paused = true;
    clearTimeout(resumeTimer);
  };
  const release = () => {
    clearTimeout(resumeTimer);
    /* resync from wherever the finger left it, or the drift would snap back to
       where it was before the drag */
    resumeTimer = setTimeout(() => { pos = rail.scrollLeft; paused = false; last = 0; }, RESUME_AFTER);
  };

  /* A finger down stops the drift immediately, so the two never push against
     each other mid-gesture. pointer events cover touch, mouse and pen. */
  rail.addEventListener('pointerdown', hold, { passive: true });
  rail.addEventListener('pointerup', release, { passive: true });
  rail.addEventListener('pointercancel', release, { passive: true });
  rail.addEventListener('touchstart', hold, { passive: true });
  rail.addEventListener('touchend', release, { passive: true });
  /* a wheel or trackpad scrub counts as intent too */
  rail.addEventListener('wheel', () => { hold(); release(); }, { passive: true });
  rail.addEventListener('mouseenter', hold);
  rail.addEventListener('mouseleave', release);
  rail.addEventListener('focusin', hold);
  rail.addEventListener('focusout', release);
  /* wrapping has to happen on a manual scroll as well, or dragging backwards
     stops dead at zero instead of continuing into the previous card */
  rail.addEventListener('scroll', () => { if (paused) wrap(); }, { passive: true });

  /* Only run while the section is actually on screen. A rAF loop ticking
     through the whole page is wasted battery on the device class that matters
     most here. */
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(es => {
      inView = es.some(e => e.isIntersecting);
      if (inView) last = 0;
    }, { threshold: 0 }).observe(rail);
  } else {
    inView = true;
  }

  raf = requestAnimationFrame(frame);
})();
