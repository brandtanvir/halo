// HALO core runtime — chrome, smooth scroll, cursor, menu, preloader, transitions, sound, calm mode.
import { createScore } from './score.js';

const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;
gsap.registerPlugin(ScrollTrigger);

const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
  sget(k) { try { return sessionStorage.getItem(k); } catch { return null; } },
  sset(k, v) { try { sessionStorage.setItem(k, v); } catch {} },
};

const osReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const pref = store.get('halo-motion');
export const calm = pref ? pref === 'calm' : osReduced;
export const isTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches;
export const isMobile = () => window.innerWidth < 768;
document.documentElement.classList.toggle('calm', calm);

export const HALO = { calm, isTouch, lenis: null, gsap, ScrollTrigger, sound: null };
window.HALO = HALO;

// ---------------------------------------------------------------- icons used by chrome
const svg = (d, cls = 'ico') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
export const UI = {
  play: '<path d="M8 5.5v13l10-6.5z"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  arrow: '<path d="M5 12h14"/><path d="M13 6l6 6-6 6"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  drop: '<path d="M12 3.5s6 6.4 6 10.5a6 6 0 0 1-12 0c0-4.1 6-10.5 6-10.5z"/>',
  type: '<path d="M5 6V4.5h14V6M12 4.5v15M9 19.5h6"/>',
  grid: '<path d="M4 9h16M4 15h16M9 4v16M15 4v16"/>',
  shapes: '<circle cx="8" cy="8" r="4"/><rect x="13" y="13" width="7" height="7" rx="1.5"/><path d="M16.5 3.5l3.5 6h-7z"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/>',
};
export const icon = (name, cls) => svg(UI[name] || name, cls);

// ---------------------------------------------------------------- chrome markup
const PAGES = [
  { href: 'index.html', key: 'home', label: 'Home', n: '00' },
  { href: 'systems.html', key: 'systems', label: 'Design Systems', n: '01' },
  { href: 'icons.html', key: 'icons', label: 'Icon Library', n: '02' },
  { href: 'fonts.html', key: 'fonts', label: 'Font Builder', n: '03' },
  { href: 'index.html#pricing', key: 'pricing', label: 'Pricing', n: '04' },
];

function mountChrome(page) {
  const b = document.body;
  b.insertAdjacentHTML('afterbegin', `
    <div class="grain" aria-hidden="true"></div>
    <header class="chrome">
      <a class="brand" href="index.html" data-link aria-label="HALO home">
        <span class="brand-ring" data-magnetic>
          <svg viewBox="0 0 40 40" aria-hidden="true">
            <circle class="r-base" cx="20" cy="20" r="17" fill="none" stroke-width="1.2"/>
            <circle class="r-arc" cx="20" cy="20" r="17" fill="none" stroke-width="1.6" stroke-linecap="round"
              stroke-dasharray="106.8" stroke-dashoffset="80" transform="rotate(-90 20 20)"/>
          </svg>
        </span>
        <span class="chapter-label" aria-live="polite"><span>${page.label}</span></span>
      </a>
      <nav class="chrome-nav" aria-label="Products">
        <a href="systems.html" data-link ${page.key === 'systems' ? 'aria-current="page"' : ''}>Design Systems</a>
        <a href="icons.html" data-link ${page.key === 'icons' ? 'aria-current="page"' : ''}>Icons</a>
        <a href="fonts.html" data-link ${page.key === 'fonts' ? 'aria-current="page"' : ''}>Fonts</a>
        <a href="index.html#pricing" data-link>Pricing</a>
      </nav>
      <div class="chrome-right">
        <a class="pill login" href="index.html#beta" data-link data-magnetic>Join beta</a>
        <button class="dot-btn" data-magnetic aria-label="Open menu" aria-expanded="false" aria-controls="menu"><i></i></button>
      </div>
    </header>
    <div class="menu" id="menu" aria-hidden="true">
      <nav aria-label="Main">
        ${PAGES.map(p => `<a href="${p.href}" data-link ${p.key === page.key ? 'aria-current="page"' : ''}><small>${p.n}</small><span class="t">${p.label}</span></a>`).join('')}
      </nav>
      <div class="menu-foot">
        <span>Systems, icons &amp; type — one halo.</span>
        <span style="display:flex;gap:14px;align-items:center">Motion
          <span class="seg" role="group" aria-label="Motion">
            <button data-motion="full" aria-pressed="${!calm}">Full</button>
            <button data-motion="calm" aria-pressed="${calm}">Calm</button>
          </span>
        </span>
      </div>
    </div>
    <button class="sound-btn" data-magnetic aria-label="Play the HALO soundtrack" title="Soundtrack" aria-pressed="false"><b></b><b></b><b></b><b></b></button>
    <div class="cursor hidden" aria-hidden="true"></div>
    <div class="cursor-ring hidden" aria-hidden="true"></div>
    <div class="veil" aria-hidden="true"></div>
    <div class="toast" role="status"></div>
  `);
}

// ---------------------------------------------------------------- chapter label
let currentLabel = '';
export function setChapter(text, n = '') {
  const key = n + text;
  if (key === currentLabel) return;
  currentLabel = key;
  const el = document.querySelector('.chapter-label');
  if (!el) return;
  const olds = [...el.children];
  const nu = document.createElement('span');
  nu.innerHTML = (n ? `<span class="n" style="display:inline">${n}</span>` : '') + text;
  nu.style.transform = 'translateY(100%)';
  el.style.position = 'relative';
  el.appendChild(nu);
  void nu.offsetWidth; // flush so the transition runs
  nu.style.transform = 'none';
  olds.forEach(o => {
    o.style.position = 'absolute'; o.style.left = '0'; o.style.top = '0';
    o.style.transform = 'translateY(-100%)'; o.style.opacity = '0';
    setTimeout(() => o.remove(), 650);
  });
}

// ---------------------------------------------------------------- toast
let toastT;
export function toast(msg) {
  const t = document.querySelector('.toast');
  t.innerHTML = icon('check') + `<span>${msg}</span>`;
  t.querySelector('svg').style.cssText = 'width:16px;height:16px';
  t.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('show'), 1800);
  HALO.sound?.chime();
}
export async function copyText(text, msg = 'Copied') {
  try { await navigator.clipboard.writeText(text); }
  catch {
    const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch {} ta.remove();
  }
  toast(msg);
}

// ---------------------------------------------------------------- smooth scroll
function initScroll() {
  if (calm) {
    let lastY = window.scrollY;
    window.addEventListener('scroll', () => {
      ScrollTrigger.update();
      HALO.sound?.energy(window.scrollY - lastY); lastY = window.scrollY;
    }, { passive: true });
    return;
  }
  const lenis = new window.Lenis({ lerp: 0.075, smoothWheel: true, wheelMultiplier: 1, touchMultiplier: 1.4 });
  HALO.lenis = lenis;
  lenis.on('scroll', ScrollTrigger.update);
  lenis.on('scroll', e => HALO.sound?.energy(e.velocity));
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  // anchor links glide
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href*="#"]');
    if (!a) return;
    const url = new URL(a.href, location.href);
    if (url.pathname !== location.pathname || url.hash.length < 2) return;
    const id = url.hash;
    const el = document.querySelector(id);
    if (!el) return;
    e.preventDefault();
    lenis.scrollTo(el, { duration: 2.6 });
  });
}

export function scrollTo(target, opts = {}) {
  if (HALO.lenis) HALO.lenis.scrollTo(target, opts);
  else {
    const y = typeof target === 'number' ? target : (target.getBoundingClientRect().top + window.scrollY);
    window.scrollTo({ top: y, behavior: calm ? 'auto' : 'smooth' });
  }
}

// ---------------------------------------------------------------- logo ring progress
function initRing() {
  const arc = document.querySelector('.brand-ring .r-arc');
  const C = 106.8;
  const upd = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    const p = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
    arc.style.strokeDashoffset = String(C * (1 - (0.06 + p * 0.94)));
  };
  if (HALO.lenis) HALO.lenis.on('scroll', upd); else addEventListener('scroll', upd, { passive: true });
  addEventListener('resize', upd);
  upd();
  document.querySelector('.brand').addEventListener('click', e => {
    const onHome = /index\.html$|\/$/.test(location.pathname);
    if (onHome && scrollY > 10) { e.preventDefault(); e.stopPropagation(); scrollTo(0, { duration: 2.4 }); }
  }, true);
}

// ---------------------------------------------------------------- cursor
function initCursor() {
  if (isTouch) return;
  document.documentElement.classList.add('has-cursor');
  const dot = document.querySelector('.cursor');
  const ring = document.querySelector('.cursor-ring');
  let x = innerWidth / 2, y = innerHeight / 2, rx = x, ry = y, shown = false;
  addEventListener('pointermove', e => {
    x = e.clientX; y = e.clientY;
    if (!shown) { shown = true; rx = x; ry = y; dot.classList.remove('hidden'); ring.classList.remove('hidden'); }
  }, { passive: true });
  document.addEventListener('pointerleave', () => { dot.classList.add('hidden'); ring.classList.add('hidden'); shown = false; });
  let magnet = null;
  gsap.ticker.add(() => {
    let tx = x, ty = y;
    if (magnet) {
      const r = magnet.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      tx = cx + (x - cx) * 0.3; ty = cy + (y - cy) * 0.3;
    }
    rx += (tx - rx) * 0.16; ry += (ty - ry) * 0.16;
    dot.style.transform = `translate3d(${x}px,${y}px,0)`;
    ring.style.transform = `translate3d(${rx}px,${ry}px,0)`;
  });
  const hoverSel = 'a, button, [data-cursor], input[type="range"], .ico-cell, label';
  document.addEventListener('pointerover', e => {
    const lab = e.target.closest('[data-cursor-label]');
    if (lab) { ring.classList.add('label'); ring.textContent = lab.dataset.cursorLabel; return; }
    const h = e.target.closest(hoverSel);
    if (h) { ring.classList.add('hover'); HALO.sound?.tick(); }
    magnet = e.target.closest('[data-magnetic]');
  });
  document.addEventListener('pointerout', e => {
    const lab = e.target.closest('[data-cursor-label]');
    if (lab && !lab.contains(e.relatedTarget)) { ring.classList.remove('label'); ring.textContent = ''; }
    const h = e.target.closest(hoverSel);
    if (h && !h.contains(e.relatedTarget)) ring.classList.remove('hover');
    const m = e.target.closest('[data-magnetic]');
    if (m && !m.contains(e.relatedTarget)) { magnet = null; gsap.to(m, { x: 0, y: 0, duration: 1.2, ease: 'power3.out' }); }
  });
  addEventListener('pointermove', e => {
    if (!magnet) return;
    const r = magnet.getBoundingClientRect();
    gsap.to(magnet, { x: (e.clientX - (r.left + r.width / 2)) * 0.25, y: (e.clientY - (r.top + r.height / 2)) * 0.25, duration: 0.9, ease: 'power3.out' });
  }, { passive: true });
}

// ---------------------------------------------------------------- menu
function initMenu() {
  const btn = document.querySelector('.dot-btn');
  const menu = document.getElementById('menu');
  const root = document.documentElement;
  const set = open => {
    const r = btn.getBoundingClientRect();
    menu.style.setProperty('--mx', `${r.left + r.width / 2}px`);
    menu.style.setProperty('--my', `${r.top + r.height / 2}px`);
    root.classList.toggle('menu-open', open);
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.setAttribute('aria-hidden', String(!open));
    if (open) HALO.lenis?.stop(); else HALO.lenis?.start();
    HALO.sound?.chime(open ? 1 : 0);
  };
  btn.addEventListener('click', () => set(!root.classList.contains('menu-open')));
  addEventListener('keydown', e => { if (e.key === 'Escape' && root.classList.contains('menu-open')) set(false); });
  menu.querySelectorAll('nav a').forEach(a => a.addEventListener('click', e => {
    const href = a.getAttribute('href');
    const [file, hash] = href.split('#');
    const here = location.pathname.split('/').pop() || 'index.html';
    if (file === here) {
      e.preventDefault(); e.stopImmediatePropagation(); set(false);
      const el = hash ? document.getElementById(hash) : null;
      setTimeout(() => scrollTo(el || 0, { duration: 2 }), 400);
    }
  }, true));
  menu.querySelectorAll('[data-motion]').forEach(b => b.addEventListener('click', () => {
    store.set('halo-motion', b.dataset.motion);
    location.reload();
  }));
}

// ---------------------------------------------------------------- page transitions
function initTransitions() {
  const veil = document.querySelector('.veil');
  document.addEventListener('click', e => {
    const a = e.target.closest('a[data-link], a[href$=".html"], a[href*=".html#"]');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank') return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;
    if (url.pathname === location.pathname && url.hash) return; // same-page anchor
    if (url.pathname === location.pathname && !url.hash) { e.preventDefault(); return; }
    e.preventDefault();
    veil.style.setProperty('--vx', `${e.clientX || innerWidth / 2}px`);
    veil.style.setProperty('--vy', `${e.clientY || innerHeight / 2}px`);
    veil.classList.add('closing');
    HALO.sound?.chime(0);
    store.sset('halo-transition', '1');
    setTimeout(() => { location.href = url.href; }, calm ? 50 : 820);
  });
  addEventListener('pageshow', e => { if (e.persisted) veil.classList.remove('closing'); });
}

// ---------------------------------------------------------------- preloader / intro
function runIntro(ready) {
  const veil = document.querySelector('.veil');
  const first = !store.sget('halo-visited');
  store.sset('halo-visited', '1');
  const fromTransition = store.sget('halo-transition');
  store.sset('halo-transition', '');

  if (!first || calm) {
    veil.classList.add('opening-start');
    return ready.then(() => new Promise(res => {
      setTimeout(() => {
        void veil.offsetWidth;
        veil.classList.add('opening');
        veil.classList.remove('opening-start');
        setTimeout(() => { veil.className = 'veil'; }, 1150);
        res(fromTransition ? 'transition' : 'return');
      }, 30);
    }));
  }

  document.body.insertAdjacentHTML('beforeend', `
    <div class="preloader" aria-hidden="true">
      <svg class="pl-ring" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="54" stroke="rgba(255,255,255,.12)"/>
        <circle class="pl-arc" cx="60" cy="60" r="54" stroke="#fff" stroke-linecap="round"
          stroke-dasharray="339.3" stroke-dashoffset="339.3" transform="rotate(-90 60 60)"/>
      </svg>
      <div class="pl-count">000</div>
      <div class="pl-word">HALO — loading the night</div>
    </div>`);
  const pl = document.querySelector('.preloader');
  const arc = pl.querySelector('.pl-arc');
  const cnt = pl.querySelector('.pl-count');
  const prog = { p: 0 };
  let done = false;
  ready.then(() => { done = true; });
  return new Promise(res => {
    const tl = gsap.timeline();
    tl.to(prog, {
      p: 0.86, duration: 1.4, ease: 'power2.inOut',
      onUpdate: () => { arc.style.strokeDashoffset = 339.3 * (1 - prog.p); cnt.textContent = String(Math.round(prog.p * 100)).padStart(3, '0'); },
    });
    tl.add(() => {
      const finish = () => {
        gsap.to(prog, {
          p: 1, duration: 0.5, ease: 'power2.out',
          onUpdate: () => { arc.style.strokeDashoffset = 339.3 * (1 - prog.p); cnt.textContent = String(Math.round(prog.p * 100)).padStart(3, '0'); },
          onComplete: () => {
            const ring = document.querySelector('.brand-ring').getBoundingClientRect();
            const me = pl.querySelector('.pl-ring').getBoundingClientRect();
            const s = ring.width / me.width;
            const out = gsap.timeline({ onComplete: () => pl.remove() });
            out.to(pl.querySelectorAll('.pl-count,.pl-word'), { opacity: 0, duration: 0.4 }, 0);
            out.to(pl.querySelector('.pl-ring'), {
              x: ring.left + ring.width / 2 - (me.left + me.width / 2), y: ring.top + ring.height / 2 - (me.top + me.height / 2),
              scale: s, duration: 1.1, ease: 'power2.inOut',
            }, 0.1);
            out.to(pl, { backgroundColor: 'rgba(5,6,8,0)', duration: 0.9, ease: 'power2.inOut' }, 0.45);
            out.add(() => res('first'), 0.55);
          },
        });
      };
      const wait = () => (done ? finish() : setTimeout(wait, 60));
      wait();
    });
  });
}

// ---------------------------------------------------------------- sound: generative score (js/score.js)
function initSound() {
  const s = createScore();
  HALO.sound = s;
  const btn = document.querySelector('.sound-btn');
  btn.addEventListener('click', () => {
    const on = s.toggle();
    btn.classList.toggle('on', on);
    btn.setAttribute('aria-pressed', String(on));
  });
}

// ---------------------------------------------------------------- text helpers
export function splitWords(el) {
  if (el.dataset.split) return el.querySelectorAll('.w');
  el.dataset.split = '1';
  const walk = node => {
    [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) frag.appendChild(document.createTextNode(part));
          else { const s = document.createElement('span'); s.className = 'w'; s.textContent = part; if (!calm) s.style.opacity = '0.16'; frag.appendChild(s); }
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1 && !n.classList.contains('w')) walk(n);
    });
  };
  walk(el);
  return el.querySelectorAll('.w');
}

// words light up across a scroll range (scrubbed)
export function lightWords(el, trigger, start = 'top 75%', end = 'bottom 40%') {
  const words = splitWords(el);
  if (calm) { words.forEach(w => (w.style.opacity = 1)); return null; }
  return ScrollTrigger.create({
    trigger: trigger || el, start, end, scrub: true,
    onUpdate: st => {
      const p = st.progress * (words.length + 2);
      words.forEach((w, i) => { w.style.opacity = String(0.16 + 0.84 * Math.min(1, Math.max(0, p - i))); });
    },
  });
}
// timeline-driven version: returns a setter for progress 0..1
export function wordSetter(el) {
  const words = splitWords(el);
  return p => {
    const k = p * (words.length + 1.5);
    words.forEach((w, i) => { w.style.opacity = String(0.16 + 0.84 * Math.min(1, Math.max(0, k - i))); });
  };
}

// masked line reveal for headings: wraps each `.line-mask > span`
export function revealLines(el, delay = 0) {
  const spans = el.querySelectorAll('.line-mask > span');
  if (calm) { gsap.set(spans, { yPercent: 0, opacity: 1 }); return gsap.timeline(); }
  return gsap.timeline({ delay })
    .fromTo(spans, { yPercent: 110, filter: 'blur(8px)' }, { yPercent: 0, filter: 'blur(0px)', duration: 1.3, ease: 'power3.out', stagger: 0.08 });
}

// IntersectionObserver reveal for [data-reveal]
export function initReveals(root = document) {
  const els = root.querySelectorAll('[data-reveal]');
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting) {
        const d = Number(en.target.dataset.reveal) || 0;
        setTimeout(() => en.target.classList.add('in'), d);
        io.unobserve(en.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  els.forEach(el => io.observe(el));
}

// range inputs show filled track
export function syncRange(input) {
  const set = () => {
    const p = ((input.value - input.min) / (input.max - input.min)) * 100;
    input.style.setProperty('--p', p + '%');
  };
  input.addEventListener('input', set); set();
}

// ---------------------------------------------------------------- boot
/**
 * boot({ key, label }, readyPromise) → Promise<'first'|'return'|'transition'>
 * Mounts chrome and starts everything. Resolves when the intro has opened.
 */
export function boot(page, ready = Promise.resolve()) {
  mountChrome(page);
  initScroll();
  initRing();
  initCursor();
  initMenu();
  initTransitions();
  initSound();
  document.querySelectorAll('input[type="range"]').forEach(syncRange);
  // every control gets an accessible name from its visible field label
  document.querySelectorAll('.field input:not([aria-label]), .field textarea:not([aria-label])').forEach(inp => {
    const lab = inp.closest('.field')?.querySelector(':scope > span');
    const txt = lab ? (lab.firstChild?.textContent || lab.textContent).trim() : '';
    if (txt) inp.setAttribute('aria-label', txt);
  });
  const fontsReady = document.fonts ? document.fonts.ready.catch(() => {}) : Promise.resolve();
  const all = Promise.all([ready, fontsReady]);
  // safety: never block longer than 6s
  const capped = Promise.race([all, new Promise(r => setTimeout(r, 6000))]);
  return runIntro(capped);
}
