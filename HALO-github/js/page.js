// Shared boot for product pages: stage + director + chrome + hero intro.
import { boot, calm, revealLines, initReveals, setChapter } from './core.js';
import { createStage } from './stage.js';
import { createDirector } from './director.js';
import { hydrateIcons } from './demos.js';

const gsap = window.gsap, ST = window.ScrollTrigger;

export function productPage({ key, label, glyph, keyframes, sections = [] }) {
  const stage = createStage(document.getElementById('stage'), { calm, glyph });
  const director = createDirector(stage, { calm });
  hydrateIcons(document);
  const heroEls = ['.page-hero .lede', '.page-hero .btn-row', '.page-hero .label'];
  if (!calm) {
    gsap.set('.page-hero .h-hero .line-mask > span', { yPercent: 110 });
    gsap.set(heroEls, { opacity: 0 });
  }
  const intro = boot({ key, label }, stage.ready).then(() => {
    if (calm) return;
    revealLines(document.querySelector('.page-hero .h-hero'), 0.05);
    gsap.fromTo(heroEls, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 1.2, ease: 'power3.out', stagger: 0.1, delay: 0.3 });
  });

  // chapter labels by section
  const LABELS = sections.map(([sel, text, n]) => ({ st: ST.create({ trigger: sel, start: 'top center', end: 'bottom center' }), text, n }));
  gsap.ticker.add(() => {
    const y = window.scrollY;
    let best = null;
    for (const l of LABELS) if (y >= l.st.start - 1) best = l;
    if (best) setChapter(best.text, best.n || '');
  });

  // keyframes: [[selector, start, end, progress, state], ...]
  keyframes.forEach(([sel, start, end, p, s]) => director.key(ST.create({ trigger: sel, start, end }), p, s));
  director.build();
  let last = performance.now();
  gsap.ticker.add(() => { const t = performance.now(); director.update((t - last) / 1000); last = t; });

  initReveals();
  if (!calm) {
    gsap.from('.wordmark span', { yPercent: 100, stagger: 0.08, duration: 1.4, ease: 'power3.out', scrollTrigger: { trigger: '.wordmark', start: 'top 92%' } });
    gsap.utils.toArray('.block-head .h2').forEach(h => gsap.from(h, { yPercent: 40, opacity: 0, duration: 1.2, ease: 'power3.out', scrollTrigger: { trigger: h, start: 'top 85%' } }));
  }
  return { stage, director, intro };
}

export const FOOTER = `
  <footer class="footer" aria-label="Footer">
    <div class="footer-cols">
      <div><h6>HALO</h6><p style="margin:0;color:var(--ink-2);max-width:30ch">Systems, icons &amp; type. One studio for the whole visual language of your product.</p></div>
      <div><h6>Product</h6><a href="systems.html" data-link>Systems</a><a href="icons.html" data-link>Icons</a><a href="fonts.html" data-link>Fonts</a></div>
      <div><h6>Studio</h6><a href="index.html#pricing" data-link>Pricing</a><a href="index.html#export" data-link>Export</a><a href="index.html#beta" data-link>Beta</a></div>
      <div><h6>Social</h6><a href="index.html#beta" data-link>Newsletter</a><a href="index.html#beta" data-link>Community</a><a href="index.html#beta" data-link>Changelog</a></div>
    </div>
    <div class="wordmark" aria-hidden="true"><span>H</span><span>A</span><span>L</span><span>O</span></div>
    <div class="footer-bottom"><span>© 2026 HALO Studio</span><span>Night with one light.</span></div>
  </footer>`;
