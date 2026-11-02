/* ============================================================================
   FLYER PROMO — eases in once the hero is behind you.

   Trigger is the section AFTER the hero entering the viewport, not a timer:
   "after the hero" is a position on the page, and the hero is ~5 viewports
   tall, so any delay long enough for a slow reader fires far too early for
   everyone else.

   Shown once per session. A promo that reopens every time you scroll past
   is the thing everyone hates about these, and the ask is already repeated
   in the nav, the No Bushels band and the closing CTA.
   ========================================================================= */
(() => {
  const dialog = document.getElementById('flyerPromo');
  const after  = document.getElementById('who');   /* first section past the hero */
  if (!dialog || !after) return;

  const KEY = 'tgt.flyerPromo.seen';
  try { if (sessionStorage.getItem(KEY)) return; } catch {}

  const closeEl = document.getElementById('promoClose');

  function open() {
    if (dialog.open) return;
    try { sessionStorage.setItem(KEY, '1'); } catch {}
    dialog.showModal();
    document.documentElement.classList.add('promo-locked');
  }
  const close = () => { if (dialog.open) dialog.close(); };

  /* one listener for every close path: the button, Escape, the backdrop */
  dialog.addEventListener('close', () => {
    document.documentElement.classList.remove('promo-locked');
  });
  closeEl?.addEventListener('click', close);
  dialog.addEventListener('click', e => { if (e.target === dialog) close(); });
  /* taking the CTA is also leaving the promo, so it must not stay locked */
  dialog.querySelector('.promo__cta')?.addEventListener('click', close);

  const io = new IntersectionObserver(entries => {
    if (entries.some(e => e.isIntersecting)) { io.disconnect(); open(); }
  }, { threshold: 0.12 });
  io.observe(after);
})();
