// HALO — Home choreography.
import { boot, HALO, calm, isMobile, setChapter, wordSetter, revealLines, initReveals, scrollTo } from './core.js';
import { createStage } from './stage.js';
import { createDirector } from './director.js';
import * as D from './demos.js';

const gsap = window.gsap, ST = window.ScrollTrigger;
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const mobile = isMobile();
const m = (desk, mob) => (mobile ? mob : desk);
const short = mobile && innerHeight < 720;   // short phones: smaller, higher orb

const stage = createStage($('#stage'), { calm, glyph: 'Hg' });
const director = createDirector(stage, { calm });

// ------------------------------------------------------------------ demos
D.hydrateIcons(document);
const app = D.appCanvas($('#appCanvas'));
const sys = D.colorDemo({
  dots: '#sysDots', curve: '#sysCurve', hue: '#sysHue', hex: '#sysHex', readout: '#sysReadout', card: '#sysCard',
  onChange: s => { app?.setPrimary(s.scale); },
});
const cols = D.columnsDemo({ row: '#colsRow', range: '#colRange', n: '#colN', g: '#colG', w: '#colW' });
D.spacingDemo('#spacingVis');
const keyline = D.keylineDemo('#keylineStage', 'compass');
const icoGrid = D.iconGridDemo({ grid: '#icoGrid', stroke: '#icoStroke', out: '#icoStrokeOut', caps: '[data-cap]' });
const search = D.searchDemo({ input: '#icoSearch', results: '#icoResults' });
const spec = D.specimenDemo({ el: '#typeSpecimen', weight: '#tWeight', width: '#tWidth', wOut: '#tWeightO', dOut: '#tWidthO', meta: '#typeMeta' });
const scale = D.scaleDemo({ chart: '#scaleChart', chips: '#ratioChips' });
const pair = D.pairDemo('#pairVis');

// mobile orbit layout: a triangle instead of a row
const ROW = m(
  { orb: [-0.52, -0.08, 0.58], m0: [0.0, -0.08, 0.48], m1: [0.52, -0.08, 0.48] },
  short ? { orb: [0.0, 0.3, 0.5], m0: [-0.5, -0.42, 0.46], m1: [0.5, -0.42, 0.46] }
        : { orb: [0.0, 0.22, 0.56], m0: [-0.48, -0.3, 0.5], m1: [0.48, -0.3, 0.5] },
);
if (stage.moonLayout.length) {
  stage.moonLayout[0].row = [...ROW.m0, 1];
  stage.moonLayout[1].row = [...ROW.m1, 1];
  // phones: keep the eclipse diagonal in the upper part of the screen, clear of the manifesto text
  if (mobile) stage.moonLayout.forEach(L => { L.diag = [L.diag[0] * 2.3, L.diag[1] * 0.62 + 0.32, L.diag[2] * 0.92]; });
}

// ------------------------------------------------------------------ generic pinned chapter
function chapter(sec, { len, intro, introFrac = 0.26, onStep, onProgress }) {
  const items = [...sec.querySelectorAll('.steps li')];
  const pills = [...sec.querySelectorAll('.step-pills i')];
  const views = [...sec.querySelectorAll('.step-view')];
  const parts = [sec.querySelector('.chapter-text'), sec.querySelector('.chapter-visual'), sec.querySelector('.learn-more')].filter(Boolean);
  const setIntro = intro ? wordSetter(intro) : null;
  let cur = -1;
  const go = i => {
    if (i === cur) return;
    cur = i;
    items.forEach((li, k) => li.classList.toggle('on', k === i));
    pills.forEach((p, k) => p.classList.toggle('on', k === i));
    views.forEach((v, k) => v.classList.toggle('on', k === i));
    onStep?.(i);
    if (HALO.sound?.on) HALO.sound.chime();
  };
  go(0);

  if (calm) {
    setIntro?.(1);
    items.forEach((li, i) => li.querySelector('button').addEventListener('click', () => go(i)));
    const st = ST.create({ trigger: sec, start: 'top center', end: 'bottom center' });
    label(st, sec.dataset.chapter, sec.dataset.n);
    onProgress?.(1, 0, 1);
    return { st, go };
  }

  const st = ST.create({
    trigger: sec, pin: true, start: 'top top', end: () => '+=' + innerHeight * len, anticipatePin: 1,
    onUpdate: self => {
      const p = self.progress;
      let rest = p;
      if (intro) {
        setIntro(clamp(p / (introFrac * 0.8)));
        const f = clamp((p - introFrac * 0.8) / (introFrac * 0.3));
        intro.style.opacity = String(1 - f);
        intro.style.transform = `translate3d(0, ${-f * 70}px, 0)`;
        parts.forEach(el => { el.style.opacity = String(f); el.style.transform = `translate3d(0, ${(1 - f) * 50}px, 0)`; });
        rest = clamp((p - introFrac) / (1 - introFrac));
      }
      const n = items.length;
      const i = Math.min(n - 1, Math.floor(rest * n));
      go(i);
      onProgress?.(rest, i, clamp(rest * n - i));
    },
  });
  label(st, sec.dataset.chapter, sec.dataset.n);
  if (intro) parts.forEach(el => { el.style.opacity = '0'; });
  items.forEach((li, i) => li.querySelector('button').addEventListener('click', () => {
    const rest = (i + 0.5) / items.length;
    const p = intro ? introFrac + rest * (1 - introFrac) : rest;
    scrollTo(st.start + p * (st.end - st.start), { duration: 2.2, easing: t => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2) });
  }));
  return { st, go };
}

// chapter labels: the last section whose start has passed the viewport middle wins
const LABELS = [];
const label = (sel, text, n = '') => {
  const st = typeof sel === 'string' ? ST.create({ trigger: sel, start: 'top center', end: 'bottom center' }) : sel;
  LABELS.push({ st, text, n, pinned: typeof sel !== 'string' });
};
gsap.ticker.add(() => {
  const y = window.scrollY;
  let best = null;
  for (const l of LABELS) if (y >= l.st.start - (l.pinned ? innerHeight * 0.5 : 0) - 1) best = l;
  if (best) setChapter(best.text, best.n);
});

// ------------------------------------------------------------------ build scroll scenes
function scenes() {
  const L = mobile ? 0.75 : 1;   // shorter pins on phones

  // HERO
  const heroST = ST.create({ trigger: '#top', start: 'top top', end: 'bottom top' });
  label('#top', 'Home');
  if (!calm) {
    gsap.timeline({ scrollTrigger: { trigger: '#top', start: 'top top', end: 'bottom top', scrub: 1 } })
      .to('.hero-copy', { y: -140, opacity: 0, filter: 'blur(10px)', ease: 'none' }, 0)
      .to('.hero-products', { y: -80, opacity: 0, ease: 'none' }, 0)
      .to('.scroll-hint', { opacity: 0, duration: 0.2 }, 0);
  }

  // ORBIT
  const orbitTitle = wordSetter($('.orbit-title'));
  const ols = $$('.ol');
  const orbitST = ST.create({
    trigger: '#orbit', pin: !calm, start: calm ? 'top bottom' : 'top top', end: calm ? 'bottom top' : () => '+=' + innerHeight * 1.8 * L,
    onUpdate: s => {
      const p = s.progress;
      orbitTitle(clamp((p - 0.12) / 0.4));
      const op = clamp((p - 0.4) / 0.15) * (1 - clamp((p - 0.86) / 0.1));
      $('.orbit-title').style.opacity = String(1 - clamp((p - 0.86) / 0.1));
      ols.forEach((el, i) => {
        const pos = i === 0 ? ROW.orb : i === 1 ? ROW.m0 : ROW.m1;
        const pr = stage.project(pos[0], pos[1], pos[2]);
        el.style.left = pr.x + 'px';
        el.style.top = (pr.y + pr.r + 18) + 'px';
        el.style.opacity = String(clamp(op * 1.4 - i * 0.15));
      });
    },
  });
  label(orbitST, 'Orbit');

  // STUDIO
  const appEl = $('.app');
  const curvePath = $('.app-curve-path');
  const cLen = curvePath.getTotalLength ? curvePath.getTotalLength() : 300;
  curvePath.style.strokeDasharray = cLen;
  let studioST;
  if (calm) {
    studioST = ST.create({ trigger: '#studio', start: 'top bottom', end: 'bottom top' });
  } else {
    const tl = gsap.timeline({ scrollTrigger: { trigger: '#studio', pin: true, start: 'top top', end: () => '+=' + innerHeight * 2.2 * L, scrub: 1, anticipatePin: 1 } });
    tl.fromTo(appEl, { scale: m(0.55, 0.72), rotateX: 22, yPercent: 22, opacity: 0 }, { scale: 1, rotateX: 0, yPercent: 0, opacity: 1, duration: 1, ease: 'power2.out' })
      .from('.app-col', { opacity: 0, y: 50, stagger: 0.1, duration: 0.45 }, 0.4)
      .from('.app-col .swatch', { scale: 0.4, opacity: 0, stagger: 0.012, duration: 0.5, ease: 'power2.out' }, 0.5)
      .from('.app-panel > *', { opacity: 0, x: 20, stagger: 0.03, duration: 0.3 }, 0.6)
      .fromTo(curvePath, { strokeDashoffset: cLen }, { strokeDashoffset: 0, duration: 0.5 }, 0.85)
      .fromTo('.app-cursor', { left: '70%', top: '85%', opacity: 0 }, { left: '22%', top: '46%', opacity: 1, duration: 0.6, ease: 'power2.inOut' }, 1.0)
      .to('.app-cursor', { scale: 0.8, duration: 0.08, yoyo: true, repeat: 1 }, 1.6)
      .to('.app-col[data-col="0"] .swatch.lg', { scale: 1.25, duration: 0.2, yoyo: true, repeat: 1 }, 1.6)
      .to(appEl, { scale: 1.06, opacity: 0, filter: 'blur(6px)', duration: 0.5 }, 2.1);
    studioST = tl.scrollTrigger;
  }
  label(studioST, 'Studio');

  // ECLIPSE
  const eWords = wordSetter($('#eclipseWords'));
  const eclipseST = ST.create({
    trigger: '#eclipse', pin: !calm, start: calm ? 'top bottom' : 'top top', end: calm ? 'bottom top' : () => '+=' + innerHeight * 2.2 * L,
    onUpdate: s => {
      eWords(clamp((s.progress - 0.18) / 0.55));
      $('.statement-wrap').style.opacity = String(1 - clamp((s.progress - 0.9) / 0.1));
    },
  });
  if (calm) eWords(1);
  label(eclipseST, 'Manifesto');

  // SYSTEMS
  // dots breathe in when the chapter first pins
  let dotsIn = calm;
  if (!calm) gsap.set(sys.dots, { scale: 0, opacity: 0 });
  const sysCh = chapter($('#systems'), {
    len: 3.2 * L,
    onStep: i => sys.setStep(i),
    onProgress: () => {
      if (dotsIn) return;
      dotsIn = true;
      gsap.to(sys.dots, { scale: 1, opacity: 1, stagger: 0.05, duration: 1.1, ease: 'power3.out' });
    },
  });

  // BEAT
  const bWords = wordSetter($('#beatWords'));
  const beatST = ST.create({
    trigger: '#beat', pin: !calm, start: calm ? 'top bottom' : 'top top', end: calm ? 'bottom top' : () => '+=' + innerHeight * 1.8 * L,
    onUpdate: s => {
      bWords(clamp((s.progress - 0.1) / 0.55));
      const f = 1 - clamp((s.progress - 0.85) / 0.15);
      $('#beat .beat-title').style.opacity = String(f);
      $('#beat .beat-icon').style.opacity = String(f);
    },
  });
  if (calm) bWords(1);
  label(beatST, 'Grid', '01');

  // GRID
  const gridCh = chapter($('#grid'), {
    len: 2.6 * L,
    onStep: i => {
      if (i === 1 && !calm) gsap.fromTo(cols.bars(), { scaleY: 0 }, { scaleY: 1, duration: 0.9, ease: 'power3.out', stagger: 0.03, overwrite: true });
    },
  });

  // ICONS
  const icCh = chapter($('#icons'), {
    len: 3.4 * L, intro: $('#iconsWords'),
    onStep: i => { if (i === 2) search.autoType('arrow'); else search.reset(); },
    onProgress: (rest, i, local) => {
      if (i === 0) keyline.set(clamp(local * 1.3));
      if (i === 1) icoGrid.scrub(local);
    },
  });

  // TYPE
  const tyCh = chapter($('#type'), {
    len: 3.6 * L, intro: $('#typeWords'), introFrac: 0.3,
    onStep: i => {
      if (i === 2 && !calm) gsap.fromTo(pair.rows(), { opacity: 0, y: 30 }, { opacity: 1, y: 0, stagger: 0.08, duration: 0.9, ease: 'power3.out', overwrite: true });
    },
    onProgress: (rest, i, local) => {
      if (i === 0) spec.scrub(local);
      if (i === 1) scale.scrub(local);
    },
  });
  if (calm) scale.scrub(1);

  // FEATURES
  const tabs = $$('.tabs-big button');
  const sets = $$('.feat-set');
  let tab = 0;
  const setTab = i => {
    if (i === tab) return;
    tab = i;
    tabs.forEach((b, k) => { b.classList.toggle('on', k === i); b.setAttribute('aria-selected', String(k === i)); });
    if (calm) { sets.forEach((s, k) => { s.hidden = k !== i; }); return; }
    // crossfade: the old cards drift out, then the new ones drift in
    const old = sets[1 - i];
    gsap.killTweensOf('.feat');
    gsap.to(old.querySelectorAll('.feat'), {
      opacity: 0, y: -16, duration: 0.45, ease: 'power2.inOut', stagger: 0.04,
      onComplete: () => {
        sets.forEach((s, k) => { s.hidden = k !== tab; });
        gsap.fromTo(sets[tab].querySelectorAll('.feat'), { opacity: 0, y: 24 }, { opacity: 1, y: 0, stagger: 0.08, duration: 1.1, ease: 'power3.out' });
      },
    });
    HALO.sound?.chime();
  };
  const featST = ST.create({
    trigger: '#features', pin: !calm, start: calm ? 'top bottom' : 'top top', end: calm ? 'bottom top' : () => '+=' + innerHeight * 2 * L,
    onUpdate: s => { if (!calm) setTab(s.progress > 0.5 ? 1 : 0); },
  });
  tabs.forEach((b, i) => b.addEventListener('click', () => {
    if (calm) return setTab(i);
    scrollTo(featST.start + (i ? 0.75 : 0.25) * (featST.end - featST.start), { duration: 1.2 });
  }));
  label(featST, 'Features');

  // EXPORT
  const exportST = ST.create({ trigger: '#export', start: 'top bottom', end: 'bottom top' });
  if (!calm) {
    const ws = $$('#wheel span');
    const wt = gsap.timeline({ scrollTrigger: { trigger: '#export', start: 'top 70%', end: 'bottom 40%', scrub: 1 } });
    [1, 2, 3, 4].forEach(k => wt.to(ws, { yPercent: -100 * k, duration: 1, ease: 'power3.inOut' }, k - 1 + 0.3 * k));
    gsap.from('.plugin', { y: 120, rotateX: 18, ease: 'none', scrollTrigger: { trigger: '.plugin', start: 'top bottom', end: 'center center', scrub: 1 } });
  }
  label('#export', 'Export');

  // PRICING
  const priceST = ST.create({ trigger: '#pricing', start: 'top bottom', end: 'bottom top' });
  label('#pricing', 'Pricing');
  $$('.price').forEach(card => card.addEventListener('pointermove', e => {
    const r = card.getBoundingClientRect();
    card.style.setProperty('--x', `${e.clientX - r.left}px`);
    card.style.setProperty('--y', `${e.clientY - r.top}px`);
  }));
  $$('[data-bill]').forEach(b => b.addEventListener('click', () => {
    $$('[data-bill]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    const k = b.dataset.bill;
    $$('.amt > span').forEach(s => {
      const to = +s.dataset[k];
      const o = { v: parseFloat(s.textContent.replace('$', '')) || 0 };
      gsap.to(o, { v: to, duration: calm ? 0 : 1.1, ease: 'power3.inOut', onUpdate: () => { s.textContent = '$' + Math.round(o.v); } });
    });
  }));

  // CTA
  const ctaST = ST.create({ trigger: '#beta', start: 'top bottom', end: 'bottom top' });
  label('#beta', 'Beta');
  ST.create({ trigger: '#beta', start: 'top 55%', once: true, onEnter: () => revealLines($('#ctaTitle')) });
  if (!calm) gsap.set('#ctaTitle .line-mask > span', { yPercent: 110 });

  // FOOTER
  const footST = ST.create({ trigger: '.footer', start: 'top bottom', end: 'bottom bottom' });
  if (!calm) gsap.from('.wordmark span', { yPercent: 100, stagger: 0.08, duration: 1.4, ease: 'power3.out', scrollTrigger: { trigger: '.wordmark', start: 'top 92%' } });

  // ---------------------------------------------------------------- stage keyframes
  const asp = innerWidth / innerHeight;
  const sysPeakX = m((0.62 - 0.5) * asp, 0);
  const sysLight = m([0.62, 0.47], [0.5, 0.62]);
  const k = (st, p, s) => director.key(st, p, s);

  k(heroST, 0, {
    lightX: 0.5, lightY: 1.06, lightI: 1, lightSize: 0.55, rays: 0.7, fog: 0, dark: 0, peak: 0, mtnY: m(0, 0.02), mtnVis: 1,
    orb: { vis: 1, x: 0, y: m(0.14, short ? 0.5 : 0.3), s: m(1, short ? 0.78 : 1.05), moon: 0, glass: 1, front: 0 }, moons: { vis: 0, t: 0, behind: 0 }, halo: 0,
  });
  k(orbitST, 0, { fog: 0.18, mtnY: -0.14, orb: { y: m(0.18, short ? 0.5 : 0.32), s: m(1.15, short ? 0.9 : 1.15), front: 1 } });
  k(orbitST, 0.42, { fog: 0.55, lightY: 1.1, mtnY: -0.4, orb: { x: ROW.orb[0], y: ROW.orb[1], s: ROW.orb[2], moon: 1, glass: 0 }, moons: { vis: 1, t: 0 } });
  k(orbitST, 0.86, { fog: 0.5 });
  k(orbitST, 1, { fog: 0.12, dark: 0.3, orb: { vis: 0 }, moons: { vis: 0 } });
  k(studioST, 0.3, { fog: 0, dark: 0.55, lightI: 0.7 });
  k(studioST, 1, { dark: 0.9 });
  k(eclipseST, 0, { dark: 0.4, lightX: 0.47, lightY: 0.72, lightI: 0.8, lightSize: 0.42, mtnY: -0.12, rays: 0.4,
    orb: { vis: 0, x: m(-0.07, -0.16), y: m(0.12, 0.39), s: m(0.52, 0.5), moon: 1, glass: 0, front: 1 }, moons: { vis: 0, t: 1, behind: 0 } });
  k(eclipseST, 0.22, { dark: 0, orb: { vis: 1 }, moons: { vis: 1 } });
  k(eclipseST, 0.72, { lightX: m(0.465, 0.42), lightY: m(0.56, 0.695), lightI: 1.25, lightSize: 0.32, moons: { behind: 1 }, halo: 1 });
  k(eclipseST, 0.92, { halo: 1 });
  k(sysCh.st, 0, { orb: { vis: 0 }, moons: { vis: 0 }, halo: 0, lightX: sysLight[0], lightY: sysLight[1], lightI: 1.05, lightSize: 0.38,
    peak: 1, peakX: sysPeakX, mtnY: m(0, 0.12), rays: 0.6, accentI: 0.12 });
  k(sysCh.st, 1, { accentI: 0.2 });
  k(beatST, 0, { lightX: 0.5, lightY: 1.04, lightSize: 0.42, lightI: 1.15, rays: 1.2, peak: 0.55, peakX: m(0.1 * asp, 0), mtnY: m(0.16, 0.2), accentI: 0,
    cube: { vis: 0, x: m(0.18, 0), y: 0.9, s: m(0.5, 0.6), rx: 0.5, ry: 0.4, rz: 0.1 } });
  k(beatST, 0.3, { cube: { vis: 1, y: m(0.42, 0.35), rx: 0.62, ry: 0.8 } });
  k(beatST, 1, { cube: { y: m(0.12, 0.1), s: m(0.62, 0.7), rx: 0.95, ry: 2.1, rz: 0.2 } });
  k(gridCh.st, 0.12, { cube: { vis: 0, y: -0.2, s: 0.3, ry: 2.8 }, lightI: 0.65, rays: 0.5, peak: 0.2, mtnY: -0.05, accentI: 0.1 });
  k(gridCh.st, 1, { accentI: 0.18 });
  k(icCh.st, 0, { lightX: 0.5, lightY: 1.06, lightSize: 0.6, lightI: 0.95, rays: 0.7, peak: 0, mtnY: -0.02, accentI: 0, fog: 0 });
  k(icCh.st, 0.3, { lightX: m(0.66, 0.5), lightY: 0.95, mtnY: -0.12, accentI: 0.1 });
  k(icCh.st, 1, { accentI: 0.12 });
  k(tyCh.st, 0, { accentI: 0, lightX: m(0.72, 0.5), lightY: 0.3, lightSize: 0.5, lightI: 1.1, peak: 0.75, peakX: m(0.24 * asp, 0.05), mtnY: m(0, 0.08),
    glyph: { vis: 1, x: m(0.42, 0.04), y: m(-0.95, -0.9), s: m(1, 0.9) } });
  k(tyCh.st, 0.2, { lightY: 0.42, glyph: { y: m(-0.2, -0.05) } });
  k(tyCh.st, 0.3, { glyph: { vis: 0, y: m(0.05, 0.1) }, lightI: 0.8, lightY: 0.5 });
  k(tyCh.st, 1, { lightI: 0.7 });
  k(featST, 0, { glyph: { vis: 0 }, lightX: 0.85, lightY: 0.75, lightSize: 0.7, lightI: 0.85, rays: 0.3, fog: 0.22, peak: 0, mtnY: -0.65,
    gear: { vis: 0, x: 0, y: m(-0.08, -0.05), s: m(1.0, 0.9), burst: 0, tilt: 0.35, spin: 0 } });
  k(featST, 0.15, { gear: { vis: 0.55 } });
  k(featST, 1, { gear: { spin: 2.4 } });
  k(exportST, 0.15, { fog: 0.3, gear: { vis: 1, burst: 0.2, tilt: 0.7, spin: 3, s: m(1.2, 1.1), y: 0.1 } });
  k(exportST, 0.55, { fog: 0.35, gear: { burst: 1, tilt: 1.0, spin: 4.2, s: m(1.5, 1.3), y: 0.15 } });
  k(priceST, 0.35, { fog: 0, dark: 0.3, gear: { vis: 0, spin: 5 }, lightX: 0.5, lightY: 1.06, lightI: 0.8, mtnY: -0.3 });
  k(ctaST, 0.25, { dark: 0, mtnY: m(-0.06, -0.02), lightX: 0.5, lightY: m(0.55, 0.68), lightI: 0.6, lightSize: 0.3, rays: 0.8,
    orb: { vis: 0, x: 0, y: m(0.16, 0.36), s: m(1.0, 0.8), moon: 1, glass: 0, front: 1 }, moons: { vis: 0, behind: 1 }, halo: 0 });
  k(ctaST, 0.5, { lightI: 1.2, lightY: m(0.535, 0.68), orb: { vis: 1, y: m(0.07, 0.3) }, halo: 1 });
  k(footST, 1, { dark: 0.55, orb: { vis: 0.2 }, halo: 0.4 });
  director.build();
}

// ------------------------------------------------------------------ orb letters follow the orb
function lettersFollow() {
  const el = $('.orb-letters');
  gsap.ticker.add(() => {
    const o = stage.state.orb;
    const pr = stage.project(o.x, o.y, o.s);
    const hero = clamp(1 - window.scrollY / (innerHeight * 0.9));
    el.style.left = pr.x + 'px';
    el.style.top = pr.y + 'px';
    el.style.opacity = String(o.vis * (1 - o.moon) * hero * (introDone ? 1 : 0));
    el.style.transform = `translate(-50%, -50%) scale(${clamp(pr.r / 216, 0.6, 1.4)})`;
  });
}

// ------------------------------------------------------------------ tour
function tour() {
  const btn = $('.tour-btn'), ico = $('.tour-ico'), txt = $('.tour-txt');
  const setTxt = playing => { if (txt) txt.textContent = playing ? 'Pause tour' : 'Watch the tour'; };
  let on = false;
  const stop = () => {
    if (!on) return;
    on = false; btn.setAttribute('aria-pressed', 'false'); ico.setAttribute('d', 'M7 4.5v15l12-7.5z'); setTxt(false);
    HALO.lenis?.scrollTo(window.scrollY, { immediate: true, force: true });
  };
  btn.addEventListener('click', () => {
    if (on) return stop();
    on = true; btn.setAttribute('aria-pressed', 'true'); ico.setAttribute('d', 'M7 5h3.5v14H7zM13.5 5H17v14h-3.5z'); setTxt(true);
    const target = $('#pricing');
    const dist = target.getBoundingClientRect().top;
    if (HALO.lenis) HALO.lenis.scrollTo(target, { duration: Math.max(24, dist / innerHeight * 3.6), easing: t => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2), onComplete: () => { on = false; ico.setAttribute('d', 'M7 4.5v15l12-7.5z'); setTxt(false); } });
    else scrollTo(target);
  });
  ['wheel', 'touchstart', 'keydown'].forEach(ev => addEventListener(ev, e => { if (on && !(ev === 'keydown' && e.target === btn)) stop(); }, { passive: true }));
}

// ------------------------------------------------------------------ beta form
function betaForm() {
  const f = $('#betaForm'), inp = $('#betaEmail'), note = $('#formNote');
  f.addEventListener('submit', e => {
    e.preventDefault();
    const v = inp.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
      note.textContent = 'That email looks a little off-orbit. Try again?';
      note.classList.remove('ok');
      if (!calm) gsap.fromTo(f, { boxShadow: '0 0 0 0 rgba(255,77,109,0)', borderColor: 'rgba(255,77,109,.9)' }, { boxShadow: '0 0 0 10px rgba(255,77,109,0)', borderColor: 'rgba(255,255,255,.16)', duration: 1.6, ease: 'power2.out', clearProps: 'borderColor' });
      inp.focus();
      return;
    }
    note.textContent = "You're in orbit. We'll write when your seat is ready.";
    note.classList.add('ok');
    f.querySelector('button').textContent = 'Requested ✓';
    inp.value = '';
    HALO.sound?.chime();
  });
}

// ------------------------------------------------------------------ boot
let introDone = false;
const ready = stage.ready;
lettersFollow();
let lastT = performance.now();
gsap.ticker.add(() => { const t = performance.now(); director.update((t - lastT) / 1000); lastT = t; });

boot({ key: 'home', label: 'Home' }, ready).then(mode => {
  introDone = true;
  const heroEls = ['.hero-eyebrow', '.hero-lede', '.hero-ctas', '.hero-products li'];
  if (calm) gsap.set(heroEls, { opacity: 1 });
  else {
    revealLines($('.hero .h-hero'), 0.05);
    gsap.fromTo(heroEls, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 1.2, ease: 'power3.out', stagger: 0.1, delay: 0.35 });
    gsap.fromTo('.orb-letters span', { opacity: 0, y: 12 }, { opacity: 1, y: 0, stagger: 0.08, duration: 1, ease: 'power3.out', delay: 0.4 });
  }
  if (location.hash) { const el = document.querySelector(location.hash); if (el) setTimeout(() => scrollTo(el, { immediate: true }), 50); }
});
if (!calm) {
  gsap.set('.hero .h-hero .line-mask > span', { yPercent: 110 });
  gsap.set(['.hero-eyebrow', '.hero-lede', '.hero-ctas', '.hero-products li'], { opacity: 0 });
}

scenes();
initReveals();
tour();
betaForm();
ST.refresh();
