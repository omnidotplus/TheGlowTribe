/* ============================================================================
   NAV BEHAVIOUR — one file, both pages, so the two can never drift.

   Two jobs:
   1. REVEAL. On a page with a hero the nav stays out until the hero sequence is
      behind you — the hero ends on its own Register card and a bar on top of it
      competes with the one moment the page is built around. On a page with no
      hero (the conference page) the nav is present immediately.
   2. ADAPT. The bar flips with whatever ground is under it. Classification is
      read from the section's OWN rendered background rather than a hard-coded
      list, so it keeps working when the ground rota changes.
   ========================================================================= */
(() => {
  const nav = document.querySelector('.tnav');
  if (!nav) return;

  const hero = document.querySelector('.hero');

  /* WCAG relative luminance — the same maths the contrast audit uses, so the
     nav's idea of "dark" cannot disagree with the rest of the system. */
  const lin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const lumOf = str => {
    const m = (str || '').match(/[\d.]+/g);
    if (!m) return null;
    if (m.length > 3 && parseFloat(m[3]) === 0) return null;   // transparent
    return 0.2126 * lin(+m[0]) + 0.7152 * lin(+m[1]) + 0.0722 * lin(+m[2]);
  };
  const groundLum = el => {
    let n = el;
    while (n && n !== document.documentElement) {
      const l = lumOf(getComputedStyle(n).backgroundColor);
      if (l !== null) return l;
      n = n.parentElement;
    }
    return lumOf(getComputedStyle(document.body).backgroundColor) ?? 1;
  };

  let ticking = false;
  function update() {
    ticking = false;

    /* reveal */
    const show = hero ? (window.scrollY > hero.offsetHeight * 0.92) : true;
    nav.dataset.show = show ? '1' : '0';
    if (!show) return;

    /* ADAPT — sample what is ACTUALLY painted under the bar.

       The first version asked each <section> for its own background and took
       the first one spanning the bar. That is wrong wherever a child overrides
       the section's ground: the footer is a paper section containing a
       full-bleed DARK wordmark band, so the bar was told "light", went ink, and
       became invisible against the band it was actually sitting on.

       elementsFromPoint gives the real stack at a point. Skip the nav itself
       (and its children) and take the first element that paints a background. */
    const r0 = nav.getBoundingClientRect();
    const probeY = r0.bottom + 6;
    const probeX = r0.left + r0.width / 2;
    let lum = null;
    for (const el of document.elementsFromPoint(probeX, probeY)) {
      if (el === nav || nav.contains(el)) continue;
      const l = lumOf(getComputedStyle(el).backgroundColor);
      if (l !== null) { lum = l; break; }
    }
    if (lum === null) lum = lumOf(getComputedStyle(document.body).backgroundColor);
    if (lum === null) return;
    /* 0.18 sits between the dark surfaces (~0.01) and ember (~0.26), so ember
       is treated as a light ground and takes the ink bar — which is correct:
       ink on ember is 5.44:1, a light-grey bar on ember would be 2.1:1. */
    nav.dataset.on = lum < 0.18 ? 'dark' : 'light';
  }

  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(update);
  update();

  /* ------------------------------------------------------------------------
     MOBILE MENU. The toggle reveals the SAME <a> elements the desktop bar
     already has -- see skeleton.css's .tnav__links panel rule -- so this is
     open/close state only, never a second copy of the links. */
  const toggle = document.getElementById('tnavToggle');
  const links  = document.getElementById('tnavLinks');
  const scrim  = document.getElementById('tnavScrim');
  if (toggle && links) {
    const setMenu = open => {
      nav.dataset.menu = open ? '1' : '0';
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      /* lock <html>, not <body> -- overflow:hidden on body fights the
         overflow-x:clip that keeps the hero's sticky stage alive, a
         documented trap on this project. */
      document.documentElement.classList.toggle('tnav-locked', open);
    };
    toggle.addEventListener('click', () => setMenu(nav.dataset.menu !== '1'));
    /* close on choosing a destination -- some of these are same-page anchors
       (#teaser on home), which do not reload the page, so the panel has to
       be told to close explicitly rather than relying on navigation to do it */
    links.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
    if (scrim) scrim.addEventListener('click', () => setMenu(false));
    document.addEventListener('click', e => { if (!nav.contains(e.target)) setMenu(false); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });
    /* a resize past the breakpoint (rotation, or a resized browser window)
       must not leave the panel stuck open with nothing to close it visibly */
    addEventListener('resize', () => { if (innerWidth > 700) setMenu(false); });
  }
})();
