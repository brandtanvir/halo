// Capture-only overlay for the HALO videos. Injected after page load; never shipped with the site.
// Everything animates with long, gentle eases on GSAP (which runs on the recorder's virtual clock).
(() => {
  const gsap = window.gsap;
  const css = `
  .ov { position: fixed; inset: 0; z-index: 400; pointer-events: none; font-family: Geist, system-ui, sans-serif; color: #eef0f3; }
  .ov-cap { position: absolute; max-width: min(560px, calc(100vw - 48px));
    padding: 22px 26px 24px; border-radius: 20px; background: rgba(8,9,12,.62); border: 1px solid rgba(255,255,255,.12);
    -webkit-backdrop-filter: blur(18px) saturate(1.2); backdrop-filter: blur(18px) saturate(1.2); box-shadow: 0 30px 80px rgba(0,0,0,.45); opacity: 0; }
  .ov-cap .k { display: flex; align-items: center; gap: 10px; font-size: 11px; letter-spacing: .24em; text-transform: uppercase; color: rgba(238,240,243,.7); margin-bottom: 12px; font-weight: 500; }
  .ov-cap .k i { width: 6px; height: 6px; border-radius: 50%; background: #6b95ff; box-shadow: 0 0 12px #6b95ff; }
  .ov-cap .t { font-size: 26px; line-height: 1.18; letter-spacing: -.02em; font-weight: 450; }
  .ov-cap .b { margin-top: 10px; font-size: 15.5px; line-height: 1.5; color: rgba(238,240,243,.74); }
  .ov-m { display: block; overflow: hidden; padding-bottom: .06em; }
  .ov-m > span { display: inline-block; }
  .ov-card { position: absolute; inset: 0; display: grid; place-items: center; text-align: center; opacity: 0;
    background: radial-gradient(70% 60% at 50% 50%, rgba(6,7,9,.35), rgba(6,7,9,.82)); }
  .ov-card .big { font-size: clamp(44px, 7vw, 118px); line-height: .98; letter-spacing: -.045em; font-weight: 400; }
  .ov-card .sub { margin-top: 22px; font-size: clamp(14px, 1.3vw, 20px); color: rgba(238,240,243,.72); letter-spacing: .01em; }
  .ov-card .kick { font-size: 12px; letter-spacing: .3em; text-transform: uppercase; color: rgba(238,240,243,.6); margin-bottom: 26px; }
  .ov-card .pill { display: inline-flex; margin-top: 34px; height: 54px; padding: 0 28px; align-items: center; border-radius: 99px; background: #eef0f3; color: #08090b; font-size: 12px; letter-spacing: .22em; text-transform: uppercase; font-weight: 600; }
  .ov-ring { position: absolute; width: 22px; height: 22px; margin: -11px 0 0 -11px; border-radius: 50%; border: 1.5px solid rgba(255,255,255,.9); opacity: 0; }
  .ov-touch { position: absolute; width: 46px; height: 46px; margin: -23px 0 0 -23px; border-radius: 50%; background: rgba(255,255,255,.28); border: 1.5px solid rgba(255,255,255,.75); box-shadow: 0 0 30px rgba(255,255,255,.25); opacity: 0; }
  .ov-hint { position: absolute; left: 50%; bottom: var(--ovh, 34px); transform: translateX(-50%); display: flex; align-items: center; gap: 10px;
    padding: 10px 18px; border-radius: 99px; background: rgba(8,9,12,.6); border: 1px solid rgba(255,255,255,.14); -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px);
    font-size: 12px; letter-spacing: .18em; text-transform: uppercase; opacity: 0; white-space: nowrap; }
  .ov-hint svg { width: 16px; height: 16px; }
  .ov-prog { position: absolute; left: 0; bottom: 0; height: 2px; width: 100%; transform-origin: left; transform: scaleX(0); background: linear-gradient(90deg, rgba(107,149,255,.0), rgba(107,149,255,.9)); }
  .ov-reel { position: absolute; left: 24px; right: 24px; top: var(--rt, 17%); text-align: left; }
  .ov-reel .l { font-size: var(--rs, 38px); line-height: 1.02; letter-spacing: -.04em; font-weight: 500; text-shadow: 0 6px 40px rgba(0,0,0,.55); }
  .ov-reel .s { margin-top: 14px; font-size: 14px; letter-spacing: .2em; text-transform: uppercase; color: rgba(238,240,243,.8); font-weight: 500; text-shadow: 0 4px 24px rgba(0,0,0,.6); }
  .ov-scrim { position: absolute; left: 0; right: 0; bottom: 0; height: 49%; opacity: 0; background: linear-gradient(to bottom, rgba(6,7,9,0) 0%, rgba(6,7,9,.95) 24%, rgba(6,7,9,.99) 100%); }
  .ov-tag { position: absolute; left: 24px; top: var(--tt, 12%); display: inline-flex; gap: 8px; align-items: center; padding: 7px 12px; border-radius: 99px; font-size: 10px; letter-spacing: .2em; text-transform: uppercase; font-weight: 600; background: #2f6bff; color: #fff; opacity: 0; }
  `;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  const root = document.createElement('div'); root.className = 'ov'; document.body.appendChild(root);
  const prog = document.createElement('div'); prog.className = 'ov-prog'; root.appendChild(prog);

  const lines = t => t.split('\n').map(l => `<span class="ov-m"><span>${l}</span></span>`).join('');
  const ICON = {
    scroll: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="7" y="3" width="10" height="18" rx="5"/><path d="M12 7v3"/></svg>',
    drag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M8 9l-3 3 3 3M16 9l3 3-3 3"/></svg>',
    click: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3v3M4.5 5.5l2 2M3 10h3"/><path d="M10 10l9 3.5-4 1.5-1.5 4z"/></svg>',
    type: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="3" y="7" width="18" height="10" rx="2"/><path d="M7 11h.01M11 11h.01M15 11h.01M8 14h8"/></svg>',
    tap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="10" r="3"/><circle cx="12" cy="10" r="7" opacity=".5"/></svg>',
  };

  let cap = null, card = null, hint = null, reel = null, tag = null;
  const O = window.__ov = {
    // lower-third explainer: kicker · title · body
    caption({ k = '', t = '', b = '', pos = 'bl', x = 64, y = 56 } = {}) {
      O.uncaption();
      const el = document.createElement('div'); el.className = 'ov-cap';
      el.style[pos[0] === 't' ? 'top' : 'bottom'] = (pos[0] === 't' ? y + 64 : y) + 'px';
      el.style[pos[1] === 'l' ? 'left' : 'right'] = x + 'px';
      el.innerHTML = `${k ? `<div class="k"><i></i>${k}</div>` : ''}<div class="t">${lines(t)}</div>${b ? `<div class="b">${b}</div>` : ''}`;
      root.appendChild(el); cap = el;
      gsap.fromTo(el, { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 1.3, ease: 'power3.out' });
      gsap.fromTo(el.querySelectorAll('.ov-m > span'), { yPercent: 110 }, { yPercent: 0, duration: 1.4, ease: 'power3.out', stagger: 0.09, delay: 0.1 });
      if (b) gsap.fromTo(el.querySelector('.b'), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 1.3, ease: 'power3.out', delay: 0.35 });
    },
    uncaption() {
      if (!cap) return; const el = cap; cap = null;
      gsap.to(el, { opacity: 0, y: -14, duration: 0.9, ease: 'power2.inOut', onComplete: () => el.remove() });
    },
    // full-screen title card
    card({ kick = '', big = '', sub = '', pill = '', dense = false, instant = false } = {}) {
      O.uncard();
      const el = document.createElement('div'); el.className = 'ov-card';
      if (dense) el.style.background = 'radial-gradient(80% 60% at 50% 45%, rgba(6,7,9,.95), rgba(6,7,9,.99))';
      el.innerHTML = `<div>${kick ? `<div class="kick">${kick}</div>` : ''}<div class="big">${lines(big)}</div>${sub ? `<div class="sub">${sub}</div>` : ''}${pill ? `<div class="pill">${pill}</div>` : ''}</div>`;
      root.appendChild(el); card = el;
      if (instant) gsap.set(el, { opacity: 1 }); else gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 1.4, ease: 'power2.inOut' });
      gsap.fromTo(el.querySelectorAll('.ov-m > span'), { yPercent: 110 }, { yPercent: 0, duration: 1.6, ease: 'power3.out', stagger: 0.12, delay: 0.2 });
      gsap.fromTo(el.querySelectorAll('.kick, .sub, .pill'), { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 1.4, ease: 'power3.out', stagger: 0.12, delay: 0.55 });
    },
    uncard() {
      if (!card) return; const el = card; card = null;
      // words lift and soften away first, then the backdrop dissolves — no two texts fighting
      gsap.to(el.firstElementChild, { opacity: 0, y: -24, filter: 'blur(8px)', duration: 0.8, ease: 'power2.in' });
      gsap.to(el, { opacity: 0, duration: 1.3, delay: 0.35, ease: 'power2.inOut', onComplete: () => el.remove() });
    },
    // small gesture hint chip
    hint(kind, text, h) {
      O.unhint();
      const el = document.createElement('div'); el.className = 'ov-hint';
      if (h != null) el.style.setProperty('--ovh', h + 'px');
      el.innerHTML = (ICON[kind] || '') + `<span>${text}</span>`;
      root.appendChild(el); hint = el;
      gsap.fromTo(el, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 1.1, ease: 'power3.out' });
    },
    unhint() { if (!hint) return; const el = hint; hint = null; gsap.to(el, { opacity: 0, y: 8, duration: 0.8, ease: 'power2.inOut', onComplete: () => el.remove() }); },
    // a soft ring expanding where a click lands
    ripple(x, y) {
      const el = document.createElement('div'); el.className = 'ov-ring'; el.style.left = x + 'px'; el.style.top = y + 'px';
      root.appendChild(el);
      gsap.fromTo(el, { scale: 0.6, opacity: 0.9 }, { scale: 3.4, opacity: 0, duration: 1.1, ease: 'power2.out', onComplete: () => el.remove() });
    },
    // touch indicator for the vertical reel (soft dot that follows the finger)
    touch: null,
    touchDown(x, y) {
      if (!O.touch) { O.touch = document.createElement('div'); O.touch.className = 'ov-touch'; root.appendChild(O.touch); }
      gsap.set(O.touch, { left: x, top: y }); gsap.to(O.touch, { opacity: 1, scale: 1, duration: 0.35, ease: 'power2.out', overwrite: 'auto' });
    },
    touchMove(x, y) { if (O.touch) gsap.set(O.touch, { left: x, top: y }); },
    touchUp() { if (O.touch) gsap.to(O.touch, { opacity: 0, scale: 1.4, duration: 0.6, ease: 'power2.out' }); },
    progress(p) { prog.style.transform = `scaleX(${p})`; },
    // vertical-reel kinetic headline
    scrim(on = true) {
      if (!O._scrim) { O._scrim = document.createElement('div'); O._scrim.className = 'ov-scrim'; root.insertBefore(O._scrim, root.firstChild); }
      gsap.to(O._scrim, { opacity: on ? 1 : 0, duration: 1.0, ease: 'power2.inOut', overwrite: true });
    },
    reel({ l = '', s = '', top, size } = {}) {
      O.unreel();
      const el = document.createElement('div'); el.className = 'ov-reel';
      if (top) el.style.setProperty('--rt', top);
      if (size) el.style.setProperty('--rs', size);
      el.innerHTML = `<div class="l">${lines(l)}</div>${s ? `<div class="s">${s}</div>` : ''}`;
      root.appendChild(el); reel = el;
      gsap.fromTo(el.querySelectorAll('.ov-m > span'), { yPercent: 112 }, { yPercent: 0, duration: 1.2, ease: 'power3.out', stagger: 0.1 });
      if (s) gsap.fromTo(el.querySelector('.s'), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 1.1, ease: 'power3.out', delay: 0.35 });
    },
    unreel() {
      if (!reel) return; const el = reel; reel = null;
      gsap.to(el, { opacity: 0, y: -18, filter: 'blur(6px)', duration: 0.8, ease: 'power2.inOut', onComplete: () => el.remove() });
    },
    tag(text, top) {
      if (!tag) { tag = document.createElement('div'); tag.className = 'ov-tag'; root.appendChild(tag); }
      if (top) tag.style.setProperty('--tt', top);
      tag.textContent = text;
      gsap.fromTo(tag, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 1, ease: 'power3.out' });
    },
    untag() { if (tag) gsap.to(tag, { opacity: 0, duration: 0.8, ease: 'power2.inOut' }); },
  };

  // UI-sound recorder: the site calls HALO.sound.tick()/chime(); we log them for the offline soundtrack
  const log = window.__audioLog = [];
  let lastTick = -99;
  window.HALO.sound = {
    on: true,
    tick() { const f = window.__frame || 0; if (f - lastTick < 6) return; lastTick = f; log.push({ f, type: 'tick' }); },
    chime(dir = 1) { log.push({ f: window.__frame || 0, type: 'chime', dir }); },
    energy() {},
    toggle() { return true; },
  };
  // CSS transitions/animations follow the virtual clock too: pin each one and set its time every frame
  window.__syncCSS = () => {
    const now = performance.now();
    for (const a of document.getAnimations()) {
      if (!(a instanceof CSSTransition || a instanceof CSSAnimation)) continue;
      if (a.__t0 == null) { a.__t0 = now - (a.currentTime || 0); a.pause(); }
      a.currentTime = Math.max(0, now - a.__t0);
    }
  };
})();
