gsap.registerPlugin(ScrollTrigger);
const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp  = gsap.utils.clamp;
/* map v from [a,b] → [0,1], clamped */
const at = (v, a, b) => clamp(0, 1, (v - a) / (b - a));
const ease = t => t * t * (3 - 2 * t);                 // smoothstep
const easeOut = t => 1 - Math.pow(1 - t, 3);

/* ---------------- build the room ---------------- */
const WALLS = { t: 'YOUR CRAFT', l: 'YOUR PEOPLE', r: 'YOUR WORK', b: 'YOURS TO SHOW' };
const DEPTH = 5;
const room = document.getElementById('room');

/* Leonardo's walls are BIG and unequal — the four sides are deliberately
   different sizes, which is what makes the room read as a built space rather
   than a border. Per-edge multipliers, and a much larger base than the first
   pass used (that one capped at 30px, which read as a caption, not a wall). */
const EDGE_SCALE = { t: 1.00, l: 0.68, r: 0.86, b: 1.28 };

for (let i = 0; i < DEPTH; i++) {
  const p = document.createElement('div');
  p.className = 'plane';
  const depthMul = 1 - i * 0.14;                       // further planes, smaller type
  const fs = k => {
    const m = EDGE_SCALE[k] * depthMul;
    return `clamp(${(30 * m).toFixed(1)}px, ${(13.5 * m).toFixed(2)}vw, ${(240 * m).toFixed(0)}px)`;
  };
  p.innerHTML =
    `<div class="plane__w plane__w--t" style="font-size:${fs('t')}">${WALLS.t}</div>` +
    `<div class="plane__w plane__w--l" style="font-size:${fs('l')}">${WALLS.l}</div>` +
    `<div class="plane__w plane__w--r" style="font-size:${fs('r')}">${WALLS.r}</div>` +
    `<div class="plane__w plane__w--b" style="font-size:${fs('b')}">${WALLS.b}</div>`;
  room.appendChild(p);
}
const planes = [...room.children];
const baseScale = i => Math.pow(0.66, DEPTH - 1 - i);

/* ---------------- build the work ---------------- */
const WORK = [
  {w:170, ar:'3/4',  a:-28, d:1.00}, {w:130, ar:'1/1',  a: 34, d:0.86},
  {w:200, ar:'16/9', a:  8, d:1.12}, {w:110, ar:'4/5',  a:-62, d:0.78},
  {w:150, ar:'4/5',  a: 72, d:0.94}, {w:180, ar:'3/4',  a:-96, d:1.06},
  {w:120, ar:'1/1',  a:124, d:0.82}, {w:160, ar:'16/9', a:158, d:0.98},
  {w:140, ar:'3/4',  a:-140,d:0.90}, {w:105, ar:'4/5',  a:196, d:0.74}
];
const workEl = document.getElementById('work');
WORK.forEach((w, i) => {
  const el = document.createElement('div');
  el.className = 'slot';
  el.dataset.slot = 'TGT WORK ' + String(i + 1).padStart(2, '0');
  el.dataset.placeholder = 'P4';
  el.style.cssText = `--w:clamp(${Math.round(w.w * .42)}px, ${w.w / 13}vw, ${w.w}px); --ar:${w.ar};`;
  /* each source pre-cropped to THIS slot's declared aspect ratio, so object-fit
     never crops a second time. 600px covers the largest slot at its maximum
     fly-past scale on a 2x display. Still P4: real photographs, but stock
     standing in for TGT's own work. */
  const img = document.createElement('img');
  img.src = `/img/work/w${String(i + 1).padStart(2, '0')}.webp`;
  img.alt = '';
  img.loading = i < 4 ? 'eager' : 'lazy';
  img.decoding = 'async';
  el.appendChild(img);
  workEl.appendChild(el);
});
const works = [...workEl.children];

/* ---------------- elements ---------------- */
const mark  = document.getElementById('mark');
const sub   = document.getElementById('sub');
const timer = document.getElementById('timer');
const venue = document.getElementById('venue');
const cta   = document.getElementById('cta');
const cue   = document.getElementById('cue');
const beat  = document.getElementById('beat');
const core  = document.querySelector('.core');
const below = document.getElementById('below');

/* ===================================================================
   v2 HERO — the O is the engine. See HERO_CHOREOGRAPHY.md.
   Every number lives in T so the dialkit panel can move it: 03-deliver.md
   is explicit that motion fails because models guess numbers, so nothing
   here is defended as tuned until it has been.
   =================================================================== */
const markBloom  = document.getElementById('markBloom');
const markBase   = document.getElementById('markBase');
const markO      = document.getElementById('markO');
const markReveal = document.getElementById('markReveal');
const markFront  = document.getElementById('markFront');
const markShine  = document.getElementById('markShine');

const T = {
  scrub: 0.55,
  b: { room: 0.06, tunnel: 0.18, oMat: 0.44, build: 0.58, clear: 0.74, emit: 0.81, card: 0.90 },
  bloomBase: 0.15, bloomCharge: 0.24, bloomRest: 0.20, bloomScale: 1.00, bloomDMul: 6.2,
  oFar: 0.30,             /* how distant the O starts. 1 = already arrived */
  push: 5.4, spin: 22,
  rfeather: 90,           /* soft shoulder on the reveal's light front, px */
  frontFlare: 0.85,
  emitPeriod: 2600,       /* ms per emitter cycle */
  emitDist: 62, emitScale: 1.15, emitCurve: 1.5,
  cardRise: 26,
  /* beat 8, on the `tail` clock. markOut ends before handIn * (markH/2) can
     carry the lockup's top edge anywhere near 0, which is the whole point:
     the name is gone BEFORE the edge could cut it. */
  markOut: 0.26, handIn: 0.22, handOut: 0.56
};

/* --- the O's centre, MEASURED. The reveal and the bloom both originate
       here, so a guessed centre puts the light where the letter isn't. --- */
let oX = 0, oY = 0, rvMax = 0;
function measureO() {
  if (!markO || !markBase) return;
  const m = mark.getBoundingClientRect(), o = markO.getBoundingClientRect();
  if (!m.width || !o.width) return;
  oX = (o.left - m.left) + o.width / 2;
  oY = (o.top - m.top) + o.height / 2;
  /* furthest corner from the O — the radius that guarantees the whole name is
     uncovered, whatever the breakpoint does to the line lengths */
  rvMax = Math.max(Math.hypot(oX, oY), Math.hypot(m.width - oX, oY),
                   Math.hypot(oX, m.height - oY),
                   Math.hypot(m.width - oX, m.height - oY)) * 1.06;
  mark.style.setProperty('--ox', oX.toFixed(1) + 'px');
  mark.style.setProperty('--oy', oY.toFixed(1) + 'px');
  mark.style.setProperty('--bloom-d', (Math.max(o.width, o.height) * (T.bloomDMul || 6.2)).toFixed(0) + 'px');
}
/* Sketch: NOBUSHELS must fill on TAP, not just on a hover that does not
   exist on touch. Gated to coarse pointers so this never fights the desktop
   hover/focus rule the CSS already carries. */
const nbGhost = document.getElementById('nbGhost');
if (nbGhost && matchMedia('(pointer: coarse)').matches) {
  nbGhost.addEventListener('click', () => nbGhost.classList.toggle('is-lit'));
}

measureO();
/* Sketch (sketches/mobile_home.png), hero state 3: "make the O larger on
   phone so the brightening is still readable." The glyph itself already
   scales with .mark's clamp; what needed widening is the glow radius and the
   charge SWING, both of which read smaller in absolute px on a phone even at
   the same proportion. Mobile only, set once at load — not a live breakpoint
   effect, so it does not need a resize listener. */
if (matchMedia('(max-width: 620px)').matches) {
  T.bloomDMul = 8.4;             /* was the hard-coded 6.2, see measureO() */
  T.bloomCharge = Math.min(1, T.bloomCharge * 1.5);
  T.bloomRest = Math.min(1, T.bloomRest * 1.3);
}

/* Position #whoNext from the WELL'S OWN measured box, at EVERY width.
   A hand-derived clamp*aspect-ratio calc measured 49px short of the well's
   real rendered bottom at 390px, because aspect-ratio does not resolve to
   width*1.5 exactly once border-box and rounding are in play. That was fixed
   for mobile and the fix stopped there, so desktop kept running the formula:
   measured at 1440 it sat 144px right of the well's left edge, overlapped the
   live photo by 21px, and ran past the bottom of the viewport.

   Left, width and top all come from the rect now, so the band shares the
   well's exact edges by construction and cannot drift again. Measured, not
   guessed -- the same pattern measureO() already uses above. */
function positionWhoNext() {
  const well = document.getElementById('whoWell'), next = document.getElementById('whoNext');
  if (!well || !next) return;
  const stage = well.offsetParent;
  if (!stage) return;
  const wr = well.getBoundingClientRect(), sr = stage.getBoundingClientRect();
  if (!wr.width) return;
  /* a shallow band, proportional to the plate so it holds at any width */
  const band = Math.round(Math.min(72, Math.max(34, wr.width * 0.17)));
  next.style.left   = Math.round(wr.left - sr.left) + 'px';
  next.style.width  = Math.round(wr.width) + 'px';
  next.style.top    = Math.round(wr.bottom - sr.top + 10) + 'px';
  next.style.height = band + 'px';
}
positionWhoNext();
addEventListener('resize', () => { measureO(); ScrollTrigger.refresh(); positionWhoNext(); });
if (document.fonts && document.fonts.ready)
  document.fonts.ready.then(() => { measureO(); ScrollTrigger.refresh(); });

markBloom.style.setProperty('--bloom-scrub', String(T.bloomBase));
markBase.style.setProperty('--o-z', String(T.oFar));

/* ---- the emitter (beat 6). A TIME-based loop layered over the scrub, not a
        scroll hold: stop scrolling and it cycles forever, keep scrolling and
        you reach the card. Input is never absorbed. Fixed pool, recycled —
        an emitter that appends nodes for the length of a dwell is a leak. ---- */
let emitGain = 0, emitRAF = 0, emitT0 = 0;
function emitFrame(now) {
  if (!emitT0) emitT0 = now;
  const t = now - emitT0;
  works.forEach((el, i) => {
    const cfg = WORK[i];
    const ph = (((t / T.emitPeriod) + i / works.length) % 1 + 1) % 1;
    const e = Math.pow(ph, T.emitCurve);
    const rad = cfg.a * Math.PI / 180;
    const d = e * T.emitDist * cfg.d;
    const sc = 0.04 + e * T.emitScale * cfg.d;
    /* two smoothstepped ramps multiplied: no kink at either end, and the
       recycle point sits at true zero so the jump back is never visible */
    const fade = ease(Math.min(1, ph / 0.22)) * ease(Math.min(1, (1 - ph) / 0.34));
    el.style.opacity = (fade * emitGain).toFixed(3);
    el.style.transform = `translate(-50%,-50%) translate(${(Math.cos(rad)*d).toFixed(2)}vw, ${(Math.sin(rad)*d*0.62).toFixed(2)}vh) scale(${sc.toFixed(3)})`;
  });
  emitRAF = emitGain > 0 ? requestAnimationFrame(emitFrame) : 0;
  if (!emitRAF) { emitT0 = 0; works.forEach(el => { el.style.opacity = 0; }); }
}

/* Measured, not guessed — the lift has to equal half the below-group's real
   height or the final lockup sits off-centre. Recomputed on resize. */
let _belowH = 0, _markH = 0, _cardMid = 0;
const _hcard = below.querySelector('.hcard');
const measureBelow = () => {
  const b = below.getBoundingClientRect();
  _belowH = b.height;
  _markH  = mark.getBoundingClientRect().height;
  /* The thing that gets centred at the handoff is the VISIBLE card, not its
     wrapper -- .core__below carries a padding-top, so centring the wrapper
     leaves the card half that padding low. Measured, like everything else
     here: a derived offset, never a dialled one. */
  _cardMid = _hcard ? (_hcard.getBoundingClientRect().top - b.top)
                      + _hcard.getBoundingClientRect().height / 2
                    : _belowH / 2;
};
/* Watch the card's own box. Its height changes when the CTA wraps or the
   webfont lands, and neither fires a resize event — a stale height left the
   card hanging on the boundary with the next section. */
if (window.ResizeObserver) {
  const ro = new ResizeObserver(() => { measureBelow(); ScrollTrigger.refresh(); });
  ro.observe(below);
  ro.observe(mark);
}
const belowH = () => _belowH;
measureBelow();
addEventListener('resize', () => { measureBelow(); ScrollTrigger.refresh(); });

/* ---------------- the countdown ---------------- */
const TARGET = new Date('2026-11-21T09:00:00+01:00').getTime();
const cells = { d:0, h:0, m:0, s:0 };
const node  = k => document.querySelector('[data-c=' + k + ']');
const pad   = n => String(Math.max(0, n)).padStart(2, '0');

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
  node('d').textContent = pad(v.d); node('h').textContent = pad(v.h);
  node('m').textContent = pad(v.m); node('s').textContent = pad(v.s);
}

/* beat 6: spin fast, then lock. `locked` gates the live tick. */
let locked = false;
function spinTo(progress) {
  /* progress 0→1 across the spin. Values race, then converge on the truth. */
  const t = trueValues();
  if (progress >= 1) { locked = true; paint(t); return; }
  locked = false;
  const chaos = 1 - easeOut(progress);
  const rand  = max => Math.floor(Math.random() * max);
  paint({
    d: Math.round(t.d * easeOut(progress) + rand(400) * chaos),
    h: Math.round(t.h * easeOut(progress) + rand(24)  * chaos),
    m: Math.round(t.m * easeOut(progress) + rand(60)  * chaos),
    s: rand(60)
  });
}
setInterval(() => { if (locked) paint(trueValues()); }, 1000);
/* paint once at init. Under reduced motion the sequence never advances, so
   this is the only thing that fills the countdown at all — and an unpainted
   00 DAYS reads as an event that has already happened. */
paint(trueValues());
if (REDUCE) locked = true;

/* The closing CTA restates the countdown in words. The hero's is numeric and
   spins; this one is deliberately plain — same single source of truth, so the
   two can never disagree. */
const closeCount = document.getElementById('closeCount');
function tickClose() {
  const days = Math.max(0, Math.floor((TARGET - Date.now()) / 864e5));
  closeCount.textContent = days === 0 ? 'Today' : days + (days === 1 ? ' day to go' : ' days to go');
}
tickClose(); setInterval(tickClose, 60000);

/* ---- FAQ switchboard. Radio behaviour — one always selected, because an
        empty panel reads as broken rather than as a choice. The wipe runs on
        every change so the answer is uncovered, not merely swapped. ---- */
const faqItems   = [...document.querySelectorAll('.faq__item')];
const faqAnswers = [...document.querySelectorAll('.faq__answer')];
const faqWipe    = document.querySelector('.faq__wipe');
const FAQ_REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;

faqItems.forEach(item => {
  item.addEventListener('click', () => {
    const i = item.dataset.i;
    if (item.dataset.on === '1') return;

    faqItems.forEach(x => {
      const on = x === item;
      x.dataset.on = on ? '1' : '0';
      x.setAttribute('aria-selected', on ? 'true' : 'false');
    });

    const swap = () => faqAnswers.forEach(a => { a.dataset.on = a.dataset.i === i ? '1' : '0'; });

    if (FAQ_REDUCE || !faqWipe) { swap(); return; }
    /* swap under cover of the wipe, at the point it fully covers the panel */
    faqWipe.dataset.run = '0';
    void faqWipe.offsetWidth;               // restart the animation
    faqWipe.dataset.run = '1';
    setTimeout(swap, 260);
  });
});

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
  /* transform:scale does not affect layout, so the row would keep the height of
     the UNSCALED text and clip the letters. Reserve the scaled height. */
  /* height is left to the band's own padding now — it is a full-bleed block
     with generous vertical padding, so pinning an explicit pixel height only
     fought the bloom's overflow. */
}
fitWordmark();
addEventListener('resize', fitWordmark);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitWordmark);

/* ---- footer: live Warri time ---- */
/* footer clock removed: it printed colon-numeral pairs, which BRIEF.md
   reserves exclusively for Matthew 5:15. */

/* ---------------- the sequence ---------------- */
const BEATS = [
  [0.00, '0 \u00b7 the O, as light'],     [T.b.room,   '1 \u00b7 the room arrives'],
  [T.b.tunnel, '2 \u00b7 tunnel charges the O'], [T.b.oMat, '3 \u00b7 the O materialises'],
  [T.b.build, '4 \u00b7 the name constructs'],   [T.b.clear,'5 \u00b7 room clears + shine'],
  [T.b.emit, '6 \u00b7 the work erupts (loop)'], [T.b.card, '7 \u00b7 the card']
];

/* ---- the two clocks -------------------------------------------------
   The sticky stage releases at heroHeight - viewportHeight, which is exactly
   where ScrollTrigger's `end: bottom bottom` also resolves -- so progress 1.0
   and the pin release used to be the same frame. Everything the hero had just
   built was therefore at full opacity when the stage began to scroll away:
   the card hit opacity 1 and was immediately carried off, and the wordmark was
   sliced through its letterforms by the top edge.

   SEQ_END splits them. Beats 0-7 run across the first SEQ_END of the pin, at
   the pixel budgets they already had; the remainder -- exactly one viewport of
   PINNED distance -- is the `tail`, and belongs to beat 8 alone.
   See HERO_CHOREOGRAPHY.md, "Two clocks". ------------------------------- */
const heroEl = document.getElementById('hero');
let SEQ_END = 1;
function measureSeq() {
  const span = heroEl.offsetHeight - innerHeight;
  SEQ_END = span > innerHeight ? (span - innerHeight) / span : 1;
}
measureSeq();
addEventListener('resize', measureSeq);

function heroUpdate(self) {
  const raw  = self.progress;
  /* REDUCE collapses the hero to one viewport, so there is no tail to run and
     no handoff to choreograph -- the static frame already shows what 8c
     resolves to. Gentler, never zero: the card still fades, it just never
     travels and the name is never withdrawn. */
  const p    = REDUCE ? raw : clamp(0, 1, raw / SEQ_END);
  const tail = REDUCE ? 0   : at(raw, SEQ_END, 1);

  /* The beat readout is a DEV element (?dev=1) and may not be in the DOM.
     Unguarded, this threw on EVERY update and aborted the rest of onUpdate,
     so the walls, the eruption and the countdown all silently stopped.
     Guard, never assume. */
  if (beat) {
    if (tail > 0) {
      beat.textContent = tail < T.markOut ? '8a \u00b7 the exposure is withdrawn'
                       : tail < T.handOut ? '8b \u00b7 the ask takes the centre'
                                          : '8c \u00b7 the hold';
    } else {
      for (let i = BEATS.length - 1; i >= 0; i--) {
        if (p >= BEATS[i][0]) { beat.textContent = BEATS[i][1]; break; }
      }
    }
  }

  const arrange = at(p, T.b.room,   T.b.tunnel);
  const travel  = at(p, T.b.tunnel, T.b.clear);   /* runs UNDER beats 3 and 4 */
  const leave   = at(p, T.b.clear,  T.b.emit);
  const oMat    = at(p, T.b.oMat,   T.b.build);
  const build   = at(p, T.b.build,  T.b.clear);
  const shine   = at(p, T.b.clear,  T.b.emit);
  const card    = at(p, T.b.card,   1.0);

  const push = ease(travel) * T.push;
  const spin = REDUCE ? 0 : ease(travel) * T.spin;

  /* — beats 1-2/5: the room, and how many planes have passed — */
  let passed = 0;
  planes.forEach((pl, i) => {
    const sc = baseScale(i) * (1 + push);
    /* both envelopes smoothstepped; linear ramps gave a visible kink as a
       plane arrived and again as it passed the camera */
    const appear = ease(clamp(0, 1, arrange * 1.5 - i * 0.12));
    const past   = ease(clamp(0, 1, 1 - (sc - 2.2) / 1.5));
    if (sc > 2.2) passed++;
    pl.style.opacity   = appear * past * (1 - ease(leave));
    pl.style.transform = REDUCE
      ? `scale(${0.96 + appear * 0.04})`
      : `rotate(${spin}deg) scale(${sc * (0.96 + appear * 0.04)})`;
  });

  /* the O's approach: distant -> arrived, across beats 0-3. Deliberately
     back-loaded (pow 1.8): easeOut front-loaded it so hard that the O had
     arrived by 18% of the tunnel. */
  markBase.style.setProperty('--o-z',
    REDUCE ? '1' : (T.oFar + (1 - T.oFar) * Math.pow(at(p, 0, T.b.build), 1.8)).toFixed(4));

  /* — beat 2's real job: the tunnel CHARGES the O, one step per plane that
       clears. Stepped, not smooth: a discrete jump is readable, and a slow
       ramp over 936px is exactly the dead beat F2 blocked on. — */
  if (!REDUCE) {
    const charge = passed / DEPTH;
    const lit    = easeOut(oMat);
    markO.style.setProperty('--o-lit', lit.toFixed(3));
    /* exposure climbs while charging, then settles to a resting halo as the
       letterform resolves: the light stops being the subject and becomes the
       thing behind the subject */
    const exposure = T.bloomBase + charge * T.bloomCharge;
    markBloom.style.setProperty('--bloom-scrub',
      (exposure * (1 - lit) + T.bloomRest * lit).toFixed(3));
    markBloom.style.transform =
      `scale(${(T.bloomScale * (1 + charge * 0.34 - lit * 0.22)).toFixed(3)})`;
  }

  /* — beat 4: MASK-REVEAL (take E). The letters never move; the O's light is
       the mask and the name is uncovered wherever it reaches. — */
  const rv = REDUCE ? 9999 : easeOut(build) * (rvMax + T.rfeather);
  markReveal.style.setProperty('--rv', rv.toFixed(1) + 'px');
  markReveal.style.setProperty('--rfeather', T.rfeather + 'px');
  markFront.style.setProperty('--rv', rv.toFixed(1) + 'px');
  markFront.style.setProperty('--rfeather', T.rfeather + 'px');
  /* the flare belongs to the front while it travels and leaves with it; it
     must not linger once the name is fully lit */
  markFront.style.opacity = REDUCE ? 0
    : (Math.sin(Math.PI * clamp(0, 1, build)) * T.frontFlare).toFixed(3);

  /* — beat 5: one sweep — */
  if (!REDUCE) {
    markShine.style.setProperty('--sx', (-40 + shine * 180).toFixed(1) + '%');
    markShine.style.opacity = (Math.sin(Math.PI * clamp(0, 1, shine)) * 0.95).toFixed(3);
  }

  /* the wordmark holds DEAD CENTRE through beats 0-5, then rises so the
     finished lockup re-centres as ONE group.
     belowH/2 is exact, not tuned: .core is the mark's own box, centred by the
     stage's grid, and .core__below is absolute at top:100%, so the group's
     centre sits exactly belowH/2 below the viewport's. The old 0.66 was a
     fudge -- it measured 41px high of centre at 1440x900, with 56px of air
     above the lockup against 138px below, which is what the client read as
     poor positioning. */
  const settle = easeOut(at(p, T.b.clear, 0.94)) * (belowH() * 0.5);

  /* — beat 8a: the exposure is withdrawn. The name is never allowed to leave
       by being cut; it leaves the way it arrived, as light. One write on
       .mark takes bloom, O, reveal, front and shine down together, and
       .mark carries no WAAPI opacity animation, so nothing outranks it. — */
  if (!REDUCE) mark.style.opacity = (1 - ease(at(tail, 0, T.markOut))).toFixed(3);

  /* — beat 8b: the ask takes the centre. The extra lift is the rest of the
       way from "group centred" to "the visible card centred", derived from
       the measured boxes. Starts 36px before 8a finishes so the name dims AS
       the card rises -- a handover, not two events. — */
  const hand  = easeOut(at(tail, T.handIn, T.handOut));
  const extra = hand * (_markH / 2 + _cardMid - belowH() * 0.5);
  const lift  = settle + extra;
  core.style.transform = REDUCE ? 'none' : `translateY(${-lift}px)`;

  /* — beat 6: hand the emitter its gain and let its own clock drive it — */
  if (!REDUCE) {
    /* widened and eased: a 0.05 window popped all ten images on at once */
    /* These two windows used to overlap, so the gain peaked at ~0.57 and the
       images read faint (client, 15 Sept). Ramp in sooner, start the exit
       later: the emitter now holds a true 1.0 across the middle of its beat. */
    emitGain = ease(at(p, T.b.emit, T.b.emit + 0.045))
             * (1 - ease(at(p, 0.93, 1.0)));
    if (emitGain > 0 && !emitRAF) emitRAF = requestAnimationFrame(emitFrame);
  }

  /* — beat 7: the card, as ONE object — */
  const rise = (1 - easeOut(card)) * T.cardRise;
  below.style.opacity   = card;
  below.style.transform =
    `translateX(-50%) translateY(${rise}px) scale(${(0.972 + easeOut(card) * 0.028).toFixed(4)})`;

  const s6 = at(p, T.b.card, 0.99);
  if (REDUCE) { if (!locked) { locked = true; paint(trueValues()); } }
  else spinTo(s6);

  cue.style.opacity = 1 - at(p, 0.005, 0.05);
}

/* scrub is fixed at creation, so tuning it live means recreating the trigger */
const makeHeroST = () => ScrollTrigger.create({
  trigger: '#hero', start: 'top top', end: 'bottom bottom',
  scrub: REDUCE ? 0 : T.scrub,
  onUpdate: heroUpdate
});
let heroST = makeHeroST();

/* handed to the dialkit rig (?dev=1 only) so tuning needs no reload */
window.__hero = {
  T, measureO,
  setScrub: () => { heroST.kill(); heroST = makeHeroST(); },
  setPin: vh => { heroEl.style.height = vh + 'vh'; measureSeq(); ScrollTrigger.refresh(); },
  shine: markShine,
  refresh: () => { measureO(); measureBelow(); measureSeq(); ScrollTrigger.refresh(); }
};

/* =====================================================================
   WHY WE EXIST — the aperture opens: width, then height, then the text.
   Two clearly separated phases, because the client asked for width FIRST
   and then height; running them together would read as a plain scale-up.
   ===================================================================== */
(() => {
  const ap = document.getElementById('whyAp');
  const film = document.getElementById('whyFilm');
  if (!ap) return;
  const sec = document.getElementById('why');
  const panels = [...ap.querySelectorAll('.why__panel img')];
  const reveals = [...ap.querySelectorAll('.why__reveal')];

  if (REDUCE) {
    /* designed static state — open, exposed, readable. Never zero. */
    ap.style.clipPath = 'none';
    panels.forEach(i => i.style.setProperty('--expose', '1'));
    if (film) { film.style.setProperty('--expose', '1'); }
    reveals.forEach(r => r.style.setProperty('--tr', '1'));
    return;
  }

  /* the video only ever loads and plays while the section is on screen: a
     looping 3MB clip running off-screen is pure waste on a mobile-first site */
  let playing = false;
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!film) return;
    if (e.isIntersecting && !playing) {
      playing = true; film.preload = 'auto';
      const pr = film.play(); if (pr && pr.catch) pr.catch(() => {});
    } else if (!e.isIntersecting && playing) { playing = false; film.pause(); }
  }), { threshold: 0.15 });
  io.observe(sec);

  ScrollTrigger.create({
    trigger: sec, start: 'top 82%', end: 'bottom 62%', scrub: 0.5,
    onUpdate: self => {
      const q = self.progress;
      /* phase 1: width. phase 2: height. Deliberately sequential. */
      const wide = at(q, 0.00, 0.42);
      const tall = at(q, 0.40, 0.78);
      ap.style.setProperty('--apX', ((1 - easeOut(wide)) * 46).toFixed(2) + '%');
      ap.style.setProperty('--apY', ((1 - easeOut(tall)) * 46).toFixed(2) + '%');

      /* exposure rides the opening: the panels and the film come up out of the
         dark together rather than being switched on */
      const ex = ease(at(q, 0.12, 0.72));
      panels.forEach(i => i.style.setProperty('--expose', ex.toFixed(3)));
      if (film) film.style.setProperty('--expose', ex.toFixed(3));

      /* the text is what the height reveals, staggered down the block */
      reveals.forEach((r, i) => {
        const t = at(q, 0.46 + i * 0.055, 0.74 + i * 0.055);
        r.style.setProperty('--tr', easeOut(t).toFixed(3));
      });
    }
  });
})();

/* =====================================================================
   WHO IS TGT — scroll-scrubbed typewriter
   Mechanics taken from newformcap.com: each statement's old text
   BACKSPACES to nothing, then the new text TYPES in, both scrubbed to
   scroll so reversing the scroll reverses the typing. The label and
   description beneath never move — that contrast is what stops the
   effect reading as a gimmick.
   Copy is real (brief §4).
   ===================================================================== */
const STATEMENTS = [
  ['The Glow Tribe is a community',
   'of creatives building',
   'something real.'],
  ['Musicians, filmmakers and storytellers',
   'who gather to create, sharpen our craft,',
   'and push each other forward.'],
  ['Faith woven into the work,',
   'not stapled on top. Creativity and',
   "conviction aren't opposites."]
];

const lineEls = [...document.querySelectorAll('.who__line')];
const whoIndex = document.getElementById('whoIndex');

/* Each statement owns an equal slice of the pinned range. Within a slice:
   HOLD it complete, then BACKSPACE it away, leaving the next slice to type in. */
const SLICE = 1 / STATEMENTS.length;
const TYPE_PORTION = 0.34;   // of a slice spent typing in
const HOLD_PORTION = 0.40;   // then held complete
                             // remainder backspaces out

function renderWho(p) {
  const raw = clamp(0, 0.9999, p);
  const idx = Math.floor(raw / SLICE);
  const local = (raw - idx * SLICE) / SLICE;      // 0→1 within this statement
  const cur = STATEMENTS[idx] || STATEMENTS[STATEMENTS.length - 1];

  whoIndex.textContent = String(idx + 1).padStart(2, '0');

  /* Statement 1 arrives ALREADY WRITTEN — no type-in.
     Scrolling out of the hero must not land on an empty screen; the reference's
     text is complete the moment its section enters, and the handoff from the
     hero is the part that matters most here. So statement 1 only ever
     backspaces; statements 2 and 3 type in normally. */
  const typeIn = idx === 0 ? 0 : TYPE_PORTION;
  const hold   = idx === 0 ? TYPE_PORTION + HOLD_PORTION : HOLD_PORTION;

  let frac;
  if (typeIn > 0 && local < typeIn) {
    frac = local / typeIn;                                         // typing in
  } else if (local < typeIn + hold) {
    frac = 1;                                                      // held complete
  } else {
    const out = (local - typeIn - hold) / (1 - typeIn - hold);
    frac = 1 - out;                                                // backspacing
  }
  /* the last statement never backspaces — it stays, to hand off to the work */
  if (idx === STATEMENTS.length - 1 && local >= typeIn) frac = 1;

  const totalChars = cur.reduce((n, l) => n + l.length, 0);
  const shown = Math.round(totalChars * clamp(0, 1, frac));

  let used = 0, typing = -1;
  lineEls.forEach((el, i) => {
    const line = cur[i] || '';
    const take = clamp(0, line.length, shown - used);
    el.textContent = line.slice(0, take);
    if (take > 0 && take < line.length) typing = i;
    el.style.opacity = take === 0 ? 0 : 1;
    used += line.length;
  });

  /* caret sits on whichever line is mid-type — the tell that it is being written */
  lineEls.forEach(el => { const c = el.querySelector('.who__caret'); if (c) c.remove(); });
  if (typing >= 0 && !REDUCE) {
    const c = document.createElement('i');
    c.className = 'who__caret';
    lineEls[typing].appendChild(c);
  }
}

renderWho(0);

ScrollTrigger.create({
  trigger: '#who', start: 'top top', end: 'bottom bottom',
  scrub: REDUCE ? 0 : 0.4,
  onUpdate: self => {
    const p = self.progress;
    if (REDUCE) {
      /* gentler, never zero: show the final statement, skip the typing entirely */
      const cur = STATEMENTS[Math.min(STATEMENTS.length - 1, Math.floor(p / SLICE))];
      lineEls.forEach((el, i) => { el.textContent = cur[i] || ''; el.style.opacity = 1; });
      whoIndex.textContent = String(Math.min(3, Math.floor(p / SLICE) + 1)).padStart(2, '0');
    } else {
      renderWho(p);
    }

    /* ONE WELL, THREE FRAMES, SWAPPING TOP-TO-BOTTOM.
       The scatter was replaced: the three statements and the three images are
       now the same clock. Whichever statement is being typed owns the frame on
       screen; when the words change, the image slides out through the top and
       the next slides in from the bottom. State is set as a data attribute and
       the CSS owns the motion, so the transition survives scroll-reversal and
       is interruptible by construction. */
    const frames = [...document.querySelectorAll('#whoWell .who__plate')];
    if (frames.length) {
      const active = Math.min(frames.length - 1, Math.floor(p * frames.length));
      frames.forEach((el, i) => {
        el.dataset.state = i === active ? 'in' : (i < active ? 'out' : 'below');
      });
      /* the peek shows the NEXT plate's image, and retires on the last one —
         there is nothing coming up after the final statement. */
      const nextEl = document.getElementById('whoNext');
      if (nextEl) {
        const nxt = frames[active + 1];
        const src = nxt && nxt.querySelector('img');
        if (src) {
          const img = nextEl.querySelector('img');
          if (img && img.getAttribute('src') !== src.getAttribute('src'))
            img.setAttribute('src', src.getAttribute('src'));
          /* ONE authored moment, and a motivated one: the band answers "how
             close is the next plate", so it rises and gains as this statement
             runs out rather than sitting at a constant ghost opacity. sub is
             the progress THROUGH the current frame, 0 to 1. Exponential
             ease-out, so most of the movement happens as the handover nears.
             Held under 0.5 opacity at full strength: it is a hint behind the
             subject, never a second photo competing with it. */
          const sub = Math.min(1, Math.max(0, p * frames.length - active));
          const e = 1 - Math.pow(1 - sub, 3);
          nextEl.style.opacity = String(0.14 + e * 0.34);
          nextEl.style.transform = 'translate3d(0,' + (-8 + e * 8).toFixed(2) + 'px,0)';
          /* Measured once at load, positionWhoNext() was reading the WELL's
             box before the Who section had ever been scrolled to — its sticky
             stage reports different geometry cold than once actually in view,
             so a load-time measurement was consistently ~27px off. The
             section's own scroll update is when the geometry is real. */
          positionWhoNext();
          /* The previous build wrote transform a SECOND time here, from a
             separate `localUp` ramp that travelled -74px. Two writes to one
             property in one frame means the last one wins and the first is
             dead code, and -74px was most of why the band climbed up over the
             photo instead of sitting under it. One write now, above. */
        } else {
          nextEl.style.opacity = '0';
        }
      }
    }
  }
});
