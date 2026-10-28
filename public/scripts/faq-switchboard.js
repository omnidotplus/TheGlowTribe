/* FAQ switchboard — shared by home and conference (17 Oct: the FAQ content
   split into two pages, but the mechanic is the same, so this is the one
   copy both load, extracted from home-hero-and-sections.js rather than
   duplicated. Self-contained: a page with no .faq__item on it just no-ops.

   Radio behaviour — one always selected, because an empty panel reads as
   broken rather than as a choice. The wipe runs on every change so the
   answer is uncovered, not merely swapped. */
(() => {
  const faqItems   = [...document.querySelectorAll('.faq__item')];
  const faqAnswers = [...document.querySelectorAll('.faq__answer')];
  const faqWipe    = document.querySelector('.faq__wipe');
  if (!faqItems.length) return;
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
})();
