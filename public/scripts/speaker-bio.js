/* ============================================================================
   SPEAKER BIOS — 29 Oct. Click a speaker card, their full bio opens.

   Native <dialog> + showModal() does the heavy lifting: focus trap, Escape,
   the top layer and ::backdrop are all the platform's, which is both less
   code and better behaviour than a hand-rolled div. What is left here is
   the four things the platform does NOT give you:

     1. which of the five pre-rendered bio entries is showing,
     2. scroll lock on <html> (showModal does not reliably stop the page
        behind it scrolling),
     3. returning focus to the exact card that opened it,
     4. tap-vs-drag on the mobile rail -- the rail is a live scroller that
        drifts under the finger (conference-behaviour.js), so a horizontal
        drag that happens to end on a card must NOT be read as a tap.

   The bios themselves are already in the DOM, rendered once by
   Speakers.astro. Nothing is templated here.
   ========================================================================= */
(() => {
  const dialog = document.getElementById('bioDialog');
  if (!dialog) return;

  const panel   = document.getElementById('bioPanel');
  const countEl = document.getElementById('bioCount');
  const closeEl = document.getElementById('bioClose');
  const entries = [...dialog.querySelectorAll('.bio__entry')];
  const steps   = [...dialog.querySelectorAll('.bio__step')];
  const cards   = [...document.querySelectorAll('.spk__card[data-bio]')];
  if (!entries.length || !cards.length) return;

  const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let current = 0;
  let opener  = null;      /* the card to hand focus back to on close */

  function show(i) {
    current = (i + entries.length) % entries.length;
    entries.forEach((el, n) => { el.hidden = n !== current; });
    const name = entries[current].querySelector('.bio__name')?.textContent || '';
    /* The dialog is relabelled rather than carrying a fixed aria-labelledby:
       its accessible name has to follow whichever speaker is showing. */
    dialog.setAttribute('aria-label', name ? name + ', biography' : 'Biography');
    if (countEl) countEl.textContent = `${current + 1} / ${entries.length}`;
    /* A new bio is a new document as far as the reader is concerned, so the
       panel goes back to the top rather than holding the old scroll depth. */
    if (panel) panel.scrollTop = 0;
  }

  function open(i, from) {
    opener = from || null;
    show(i);
    dialog.showModal();
    document.documentElement.classList.add('bio-locked');
  }

  function close() {
    if (dialog.open) dialog.close();
  }

  /* `close` fires for Escape and for the backdrop path below alike, so the
     unlock and the focus restore live here once rather than at each call. */
  dialog.addEventListener('close', () => {
    document.documentElement.classList.remove('bio-locked');
    if (opener && document.contains(opener)) opener.focus();
    opener = null;
  });

  closeEl?.addEventListener('click', close);
  steps.forEach(b => b.addEventListener('click', () => show(current + Number(b.dataset.step))));

  /* Clicking the backdrop closes. The dialog element fills the viewport, so
     a click whose target IS the dialog (not the panel inside it) landed on
     the backdrop area. */
  dialog.addEventListener('click', e => { if (e.target === dialog) close(); });

  /* Arrow keys browse the set once it is open. Escape is already native. */
  dialog.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') { e.preventDefault(); show(current + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); show(current - 1); }
  });

  /* ---- opening, with tap-vs-drag discrimination ------------------------
     On the rail a card can be dragged sideways. pointerdown records where
     the gesture started; if the pointer travelled more than TAP_SLOP before
     it came up, the gesture was a scrub of the carousel and not a tap, so
     the click that follows is swallowed. Pure-click (mouse, keyboard) is
     unaffected: no pointerdown movement, no suppression. */
  const TAP_SLOP = 8;
  let sx = 0, sy = 0, dragged = false;

  cards.forEach(card => {
    card.addEventListener('pointerdown', e => {
      sx = e.clientX; sy = e.clientY; dragged = false;
    }, { passive: true });

    card.addEventListener('pointermove', e => {
      if (Math.abs(e.clientX - sx) > TAP_SLOP || Math.abs(e.clientY - sy) > TAP_SLOP) dragged = true;
    }, { passive: true });

    card.addEventListener('click', e => {
      if (dragged) { dragged = false; e.preventDefault(); return; }
      open(Number(card.dataset.bio), card);
    });
  });

  /* Reduced motion: the panel still opens, it just does not travel. The CSS
     already drops the transform; this flag lets it drop the transition too
     without a second media query inside every rule. */
  if (REDUCE) dialog.dataset.reduce = '1';
})();
