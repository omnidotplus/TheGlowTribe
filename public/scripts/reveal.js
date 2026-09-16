/* Shared scroll fade-in/out — extracted from home-hero-and-sections.js so
   / and /conference run the same mechanic. IntersectionObserver, not scroll
   maths: the browser does the work off the main thread and it costs nothing.
   Self-contained (own REDUCE check) so it can load standalone on any page. */
(() => {
  const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const secs = [...document.querySelectorAll('[data-fade]')];
  if (!secs.length) return;
  if (REDUCE) { secs.forEach(s => s.dataset.in = '1'); }
  else {
    /* threshold:0 + a viewport band. A fractional threshold cannot be met by a
       section TALLER than the viewport — that is why #faq never faded in. */
    /* Tag the staggerable children. Anything taken out of normal flow is
       SKIPPED: a clip-path or transform on the Who section's sticky stage, or
       on an absolutely-positioned plate, breaks the layout it belongs to.
       Capped at 8 per section — past that a stagger is just a queue. */
    const outOfFlow = el => {
      const pos = getComputedStyle(el).position;
      return pos === 'sticky' || pos === 'absolute' || pos === 'fixed';
    };
    secs.forEach(s => {
      /* Most sections wrap their content in a single __inner, so staggering
         the section's direct children staggered exactly one element. Descend
         through single wrappers until there is something to stagger. */
      let host = s, guard = 0;
      while (guard++ < 4) {
        const kids = [...host.children].filter(el => !outOfFlow(el));
        if (kids.length === 1 && kids[0].children.length > 1) host = kids[0];
        else break;
      }
      let i = 0;
      [...host.children].forEach(el => {
        if (outOfFlow(el)) return;      /* a clip-path here breaks sticky/absolute */
        if (i >= 8) return;             /* past 8 a stagger is just a queue */
        el.setAttribute('data-r', '');
        el.style.setProperty('--i', i++);
      });
    });
    const io = new IntersectionObserver(
      es => es.forEach(e => { e.target.dataset.in = e.isIntersecting ? '1' : '0'; }),
      { threshold: 0, rootMargin: '-12% 0px -12% 0px' });
    secs.forEach(s => io.observe(s));
  }
})();
