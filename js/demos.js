// HALO live demos — shared by Home and the product pages.
import { ICONS } from './data/icons.js';
import { buildScale, hexA, onColor } from './color.js';
import { renderText } from './type-render.js';
import { copyText, HALO } from './core.js';

export const ICON_MAP = Object.fromEntries(ICONS.map(i => [i.n, i]));
const $ = (s, r = document) => (typeof s === 'string' ? r.querySelector(s) : s);
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
// crossfade a container's content: ease out, re-render, ease back in (never a hard swap)
export function swapIn(el, render) {
  const g = window.gsap;
  if (!g || HALO.calm) { render(); return; }
  g.to(el, {
    opacity: 0, duration: 0.24, ease: 'power1.in', overwrite: true,
    onComplete: () => { render(); g.to(el, { opacity: 1, duration: 0.6, ease: 'power2.out' }); softIn(el.children, 0.004); },
  });
}
export const debounce = (fn, ms = 220) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
// gentle fade-in for freshly rendered content (never a hard swap)
export function softIn(nodes, stagger = 0.012) {
  const g = window.gsap;
  if (!g || HALO.calm || !nodes || !nodes.length) return;
  g.fromTo(nodes, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out', stagger: Math.min(stagger, 0.4 / nodes.length), overwrite: true });
}

// ------------------------------------------------------------------ icons
export const iconSvg = (name, cls = 'ico') => {
  const i = ICON_MAP[name];
  return `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${i ? i.d : ''}</svg>`;
};
export function iconSource(name, { stroke = 1.5, cap = 'round', size = 24 } = {}) {
  const i = ICON_MAP[name];
  const join = cap === 'round' ? 'round' : 'miter';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="${cap}" stroke-linejoin="${join}">${i ? i.d : ''}</svg>`;
}
export function hydrateIcons(root = document) {
  root.querySelectorAll('svg[data-i]').forEach(s => { const i = ICON_MAP[s.dataset.i]; if (i) s.innerHTML = i.d; });
}

// ------------------------------------------------------------------ color: dots + curve editor
export function colorDemo({ dots, curve, hue, hex, readout, card, onChange }) {
  const st = { hue: 262, chroma: 0.21, p1: [0.32, 0.06], p2: [0.62, 0.94], active: 0, step: 0, scale: [] };
  const dotsEl = $(dots), svg = $(curve), hueEl = $(hue), hexEl = $(hex), roEl = $(readout), cardEl = $(card);
  const ORDER = [9, 8, 7, 6, 5, 4, 3, 2, 1];             // indices into the 11-step scale (950..50)
  // three stacked layers per dot (checker · color · gradient) so every step change crossfades
  dotsEl.innerHTML = ORDER.map(i => `<div class="dot${i === 5 ? ' primary' : ''}" data-k="${i}"><div class="chk"></div><div class="fill"></div><div class="grad"></div></div>`).join('');
  const dotEls = [...dotsEl.children];

  const W = 200, Hh = 140;
  svg.innerHTML = `
    <path d="M0 0H200V140H0Z" fill="none" stroke="rgba(255,255,255,.06)"/>
    <path d="M0 35H200M0 70H200M0 105H200M50 0V140M100 0V140M150 0V140" stroke="rgba(255,255,255,.04)"/>
    <line class="l1" stroke="rgba(255,255,255,.3)" stroke-dasharray="2 3"/>
    <line class="l2" stroke="rgba(255,255,255,.3)" stroke-dasharray="2 3"/>
    <path class="cv" fill="none" stroke="#fff" stroke-width="1.4"/>
    <g class="samples"></g>
    <circle class="h h1" r="6" fill="#fff" data-cursor-label="Drag"/>
    <circle class="h h2" r="6" fill="#fff" data-cursor-label="Drag"/>
    <text x="2" y="152" fill="rgba(255,255,255,.35)" font-size="8" font-family="Geist Mono">50</text>
    <text x="186" y="152" fill="rgba(255,255,255,.35)" font-size="8" font-family="Geist Mono">950</text>`;
  const toX = x => x * W, toY = y => Hh - y * Hh;

  function draw() {
    const { p1, p2 } = st;
    svg.querySelector('.cv').setAttribute('d', `M0 ${Hh} C ${toX(p1[0])} ${toY(p1[1])}, ${toX(p2[0])} ${toY(p2[1])}, ${W} 0`);
    const l1 = svg.querySelector('.l1'), l2 = svg.querySelector('.l2');
    l1.setAttribute('x1', 0); l1.setAttribute('y1', Hh); l1.setAttribute('x2', toX(p1[0])); l1.setAttribute('y2', toY(p1[1]));
    l2.setAttribute('x1', W); l2.setAttribute('y1', 0); l2.setAttribute('x2', toX(p2[0])); l2.setAttribute('y2', toY(p2[1]));
    const h1 = svg.querySelector('.h1'), h2 = svg.querySelector('.h2');
    h1.setAttribute('cx', toX(p1[0])); h1.setAttribute('cy', toY(p1[1]));
    h2.setAttribute('cx', toX(p2[0])); h2.setAttribute('cy', toY(p2[1]));
    h1.setAttribute('r', st.active === 0 ? 6.5 : 4.5); h2.setAttribute('r', st.active === 1 ? 6.5 : 4.5);
    st.scale = buildScale({ hue: st.hue, chroma: st.chroma, p1: st.p1, p2: st.p2 });
    svg.querySelector('.samples').innerHTML = st.scale.map((s, i) => {
      const x = (i / 10) * W, y = Hh * (s.L - 0.2) / (0.975 - 0.2);
      return `<circle cx="${x}" cy="${y}" r="2.6" fill="${s.hex}" stroke="rgba(0,0,0,.6)" stroke-width=".6"/>`;
    }).join('');
    if (roEl) roEl.innerHTML = `<span>x1 <b>${p1[0].toFixed(2)}</b></span><span>y1 <b>${p1[1].toFixed(2)}</b></span><span>x2 <b>${p2[0].toFixed(2)}</b></span><span>y2 <b>${p2[1].toFixed(2)}</b></span>`;
    if (hexEl) hexEl.textContent = st.scale[5].hex;
    paint();
    onChange?.(st);
  }

  function paint() {
    const s = st.scale;
    const prim = s[5].hex;
    const alphas = { 9: 1, 8: 0.86, 7: 0.72, 6: 0.58, 5: 1, 4: 0.44, 3: 0.3, 2: 0.18, 1: 0.08 };
    dotEls.forEach(d => {
      const k = +d.dataset.k;
      const [chk, fill, grad] = d.children;
      chk.style.opacity = st.step === 1 ? '1' : '0';
      fill.style.background = st.step === 1 && k !== 5 ? hexA(prim, alphas[k]) : s[k === 5 ? 5 : k].hex;
      fill.style.opacity = st.step === 2 ? '0' : '1';
      const a = s[clamp(k - 2, 0, 10)].hex, b = s[clamp(k + 2, 0, 10)].hex;
      grad.style.background = k > 6 ? `linear-gradient(135deg, ${b}, ${a})`
        : k === 5 ? `conic-gradient(from 210deg, ${s[2].hex}, ${prim}, ${s[8].hex}, ${s[2].hex})`
        : k > 2 ? `radial-gradient(circle at 30% 30%, ${s[1].hex}, ${a} 75%)`
        : `linear-gradient(200deg, ${s[0].hex}, ${b})`;
      grad.style.opacity = st.step === 2 ? '1' : '0';
    });
  }

  // drag handles
  let drag = null;
  const pt = e => {
    const r = svg.getBoundingClientRect();
    const vb = svg.viewBox.baseVal;
    return [clamp(((e.clientX - r.left) / r.width * vb.width + vb.x) / W), clamp(1 - ((e.clientY - r.top) / r.height * vb.height + vb.y) / Hh)];
  };
  svg.addEventListener('pointerdown', e => {
    const h = e.target.closest('.h');
    let which;
    if (h) which = h.classList.contains('h1') ? 0 : 1;
    else { // grab the closest handle
      const [x, y] = pt(e);
      const d1 = Math.hypot(x - st.p1[0], y - st.p1[1]), d2 = Math.hypot(x - st.p2[0], y - st.p2[1]);
      which = d1 < d2 ? 0 : 1;
    }
    drag = which; st.active = which;
    cardEl?.querySelectorAll('.tabs button').forEach((b, i) => b.classList.toggle('on', i === which));
    svg.setPointerCapture(e.pointerId);
    e.preventDefault();
    move(e);
  });
  const move = e => {
    if (drag === null) return;
    const p = pt(e);
    if (drag === 0) st.p1 = p; else st.p2 = p;
    draw();
  };
  svg.addEventListener('pointermove', move);
  svg.addEventListener('pointerup', () => { drag = null; HALO.sound?.tick(); });
  svg.addEventListener('lostpointercapture', () => { drag = null; });

  cardEl?.querySelectorAll('.tabs button').forEach((b, i) => b.addEventListener('click', () => {
    st.active = i;
    cardEl.querySelectorAll('.tabs button').forEach((x, j) => x.classList.toggle('on', i === j));
    draw();
  }));
  hueEl?.addEventListener('input', () => { st.hue = +hueEl.value; draw(); });
  if (hueEl) st.hue = +hueEl.value;
  draw();

  return {
    state: st,
    setStep(i) { st.step = i; paint(); },
    set(o) { Object.assign(st, o); if (hueEl && o.hue != null) { hueEl.value = o.hue; hueEl.dispatchEvent(new Event('input')); } else draw(); },
    dots: dotEls,
  };
}

// ------------------------------------------------------------------ app mockup palettes
export function appCanvas(el) {
  const cols = [
    { name: 'BLUE ORBIT', hue: 262, chroma: 0.21 },
    { name: 'RED DANGER', hue: 18, chroma: 0.2 },
    { name: 'GRAPHITE', hue: 260, chroma: 0.02 },
  ];
  const cursor = el.querySelector('.app-cursor');
  const html = cols.map((c, ci) => {
    const s = buildScale(c);
    const sw = (i, lg) => `<div class="swatch${lg ? ' lg' : ''}" style="background:${s[i].hex};color:${onColor(s[i].hex)}">${s[i].step}</div><div class="swatch-hex">${s[i].hex}</div>`;
    return `<div class="app-col" data-col="${ci}"><h6>${c.name}</h6>${[9, 8, 7, 6].map(i => sw(i)).join('')}${sw(5, true)}${[4, 3, 2].map(i => sw(i)).join('')}</div>`;
  }).join('');
  el.insertAdjacentHTML('afterbegin', html);
  return {
    setPrimary(scale) {
      const col = el.querySelector('[data-col="0"]');
      if (!col) return;
      const sws = col.querySelectorAll('.swatch'), hx = col.querySelectorAll('.swatch-hex');
      [9, 8, 7, 6, 5, 4, 3, 2].forEach((k, i) => { sws[i].style.background = scale[k].hex; sws[i].style.color = onColor(scale[k].hex); hx[i].textContent = scale[k].hex; });
    },
  };
}

// ------------------------------------------------------------------ columns
export function columnsDemo({ row, range, n: nEl, g: gEl, w: wEl }) {
  const rowEl = $(row), rangeEl = $(range);
  function render(n) {
    const total = 1200, gutter = n > 12 ? 16 : 24;
    const w = Math.round((total - gutter * (n - 1)) / n);
    rowEl.style.gridTemplateColumns = `repeat(${n}, 1fr)`;
    const sel = Math.max(1, Math.round(n / 4));
    rowEl.innerHTML = Array.from({ length: n }, (_, i) => `<i class="${i < sel ? 'sel' : ''}"></i>`).join('') +
      `<div class="cols-baseline"><em>subline · 8px</em></div>`;
    $(nEl).textContent = n;
    $(gEl).innerHTML = `${gutter}<sup>px</sup>`;
    $(wEl).innerHTML = `${w}<sup>px</sup>`;
  }
  rangeEl.addEventListener('input', () => render(+rangeEl.value));
  render(+rangeEl.value);
  return {
    bars: () => rowEl.querySelectorAll('i'),
    render,
  };
}

export function spacingDemo(el) {
  const vals = [4, 8, 12, 16, 24, 32, 48, 64];
  $(el).innerHTML = vals.map((v, i) => `<div><i style="width:${Math.max(6, v * 1.3)}px;height:${Math.max(6, v * 1.3)}px"></i><span>${v}</span><span style="color:var(--ink-3)">space.${i + 1}</span></div>`).join('');
}

// ------------------------------------------------------------------ keyline stage
export function keylineDemo(el, name = 'compass') {
  const host = $(el);
  let grid = '';
  for (let i = 0; i <= 24; i++) grid += `<line class="kg" x1="${i}" y1="0" x2="${i}" y2="24"/><line class="kg" x1="0" y1="${i}" x2="24" y2="${i}"/>`;
  host.innerHTML = `<svg viewBox="-1 -1 26 26" aria-label="Icon on keyline grid">
    <g>${grid}</g>
    <rect class="kl" x="2" y="2" width="20" height="20" pathLength="1" stroke-dasharray=".01 .012"/>
    <circle class="kl k" cx="12" cy="12" r="10" pathLength="1"/>
    <rect class="kl k" x="4" y="4" width="16" height="16" rx="1" pathLength="1"/>
    <rect class="kl k" x="5" y="3" width="14" height="18" rx="1" pathLength="1"/>
    <rect class="kl k" x="3" y="5" width="18" height="14" rx="1" pathLength="1"/>
    <line class="kl k" x1="0" y1="0" x2="24" y2="24" pathLength="1"/><line class="kl k" x1="24" y1="0" x2="0" y2="24" pathLength="1"/>
    <g class="big-ico"></g>
  </svg>`;
  const g = host.querySelector('.big-ico');
  let parts = [];
  function setIcon(n) {
    g.innerHTML = ICON_MAP[n]?.d || '';
    parts = [...g.children];
    parts.forEach(p => { p.setAttribute('pathLength', '1'); p.style.strokeDasharray = '1'; });
  }
  setIcon(name);
  const kls = [...host.querySelectorAll('.kl.k')];
  kls.forEach(k => { k.style.strokeDasharray = '1'; });
  function set(p) {
    const kp = clamp(p / 0.45);
    kls.forEach((k, i) => { k.style.strokeDashoffset = String(1 - clamp(kp * 1.6 - i * 0.12)); });
    const ip = clamp((p - 0.3) / 0.6);
    parts.forEach((pp, i) => { pp.style.strokeDashoffset = String(1 - clamp(ip * (1 + parts.length * 0.25) - i * 0.25)); });
  }
  set(1);
  return { set, setIcon };
}

// ------------------------------------------------------------------ icon grid with stroke + caps
export function iconGridDemo({ grid, stroke, out, caps, names }) {
  const g = $(grid), s = $(stroke), o = $(out);
  const list = names || ['search', 'palette', 'layers', 'pen-tool', 'droplet', 'type', 'compass', 'camera', 'bell', 'heart', 'cloud', 'code', 'eclipse', 'sparkle', 'mountain'];
  g.innerHTML = list.map(n => `<button class="ico-cell" data-n="${n}" aria-label="Copy ${n} icon">${iconSvg(n)}</button>`).join('');
  let touched = false, cap = 'round';
  const setStroke = v => { g.style.setProperty('--sw', v); if (o) o.textContent = (+v).toFixed(2); };
  s.addEventListener('input', () => { touched = true; setStroke(s.value); });
  document.querySelectorAll(caps).forEach(b => b.addEventListener('click', () => {
    cap = b.dataset.cap;
    document.querySelectorAll(caps).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    g.style.setProperty('--cap', cap === 'round' ? 'round' : 'square');
    g.style.setProperty('--join', cap === 'round' ? 'round' : 'miter');
  }));
  g.addEventListener('click', e => {
    const c = e.target.closest('.ico-cell'); if (!c) return;
    copyText(iconSource(c.dataset.n, { stroke: +s.value, cap }), `Copied ${c.dataset.n}.svg`);
  });
  setStroke(s.value);
  return {
    scrub(p) {
      if (touched) return;
      const v = (1 + p * 1.5).toFixed(2);
      s.value = v; s.dispatchEvent(new Event('input')); touched = false;
    },
  };
}

// ------------------------------------------------------------------ search
export function searchDemo({ input, results, limit = 18 }) {
  const inp = $(input), res = $(results);
  function paint(q) {
    q = q.trim().toLowerCase();
    const hits = !q ? ICONS.slice(0, limit) : ICONS.filter(i => i.n.includes(q) || i.t.some(t => t.includes(q)) || i.c.includes(q)).slice(0, limit);
    res.innerHTML = hits.length ? hits.map(i => `<button class="ico-cell${q ? ' hit' : ''}" data-n="${i.n}" aria-label="Copy ${i.n}">${iconSvg(i.n)}</button>`).join('')
      : `<p style="grid-column:1/-1;color:var(--ink-3);margin:0">No icons for “${q.replace(/[<>&]/g, '')}”. Try “arrow” or “sun”.</p>`;
  }
  // results settle once typing pauses, then crossfade in
  const run = debounce(q => swapIn(res, () => paint(q)), 220);
  inp.addEventListener('input', () => { user = true; run(inp.value); });
  res.addEventListener('click', e => { const c = e.target.closest('.ico-cell'); if (c) copyText(iconSource(c.dataset.n), `Copied ${c.dataset.n}.svg`); });
  let user = false, timer = null;
  paint('');
  return {
    autoType(word) {
      if (user || document.activeElement === inp) return;
      clearInterval(timer);
      let i = 0; inp.value = ''; run('');
      timer = setInterval(() => {
        if (user) return clearInterval(timer);
        i++; inp.value = word.slice(0, i); run(inp.value); HALO.sound?.tick();
        if (i >= word.length) clearInterval(timer);
      }, 140);
    },
    reset() { if (!user) { clearInterval(timer); inp.value = ''; run(''); } },
  };
}

// ------------------------------------------------------------------ type specimen (HALO Geometric)
export function specimenDemo({ el, weight, width, wOut, dOut, meta, text = 'HALO' }) {
  const host = $(el), we = $(weight), wi = $(width);
  let touched = false;
  function render() {
    const w = +we.value, d = +wi.value;
    host.innerHTML = renderText(text, { weight: w, width: d, tracking: 16 }).svg;
    if (wOut) $(wOut).textContent = w;
    if (dOut) $(dOut).textContent = d.toFixed(2);
    if (meta) $(meta).textContent = `wght ${w} · wdth ${d.toFixed(2)}`;
  }
  we.addEventListener('input', e => { if (e.isTrusted) touched = true; render(); });
  wi.addEventListener('input', e => { if (e.isTrusted) touched = true; render(); });
  render();
  return {
    scrub(p) {
      if (touched) return;
      we.value = (3 + p * 15).toFixed(1); wi.value = (0.82 + Math.sin(p * Math.PI) * 0.36).toFixed(2);
      we.dispatchEvent(new Event('input')); wi.dispatchEvent(new Event('input'));
    },
  };
}

// ------------------------------------------------------------------ scale map chart
export function scaleDemo({ chart, chips, base = 16 }) {
  const host = $(chart), chipsEl = $(chips);
  const RATIOS = [['1.125', 'Major 2nd'], ['1.2', 'Minor 3rd'], ['1.25', 'Major 3rd'], ['1.333', 'Perfect 4th'], ['1.5', 'Perfect 5th'], ['1.618', 'Golden']];
  let ratio = 1.25, grow = 1;
  chipsEl.innerHTML = RATIOS.map(([r, n]) => `<button class="chip${r === '1.25' ? ' on' : ''}" data-r="${r}" title="${n}">${r}</button>`).join('');
  chipsEl.addEventListener('click', e => {
    const b = e.target.closest('.chip'); if (!b) return;
    ratio = +b.dataset.r;
    chipsEl.querySelectorAll('.chip').forEach(c => c.classList.toggle('on', c === b));
    render();
  });
  function render() {
    const steps = Array.from({ length: 12 }, (_, i) => Math.round(base * ratio ** (i - 2)));
    const max = steps[steps.length - 1];
    const W = 600, H = 260, top = 20;
    const xs = steps.map((_, i) => 20 + i * ((W - 40) / (steps.length - 1)));
    const hs = steps.map(s => (s / max) * (H - top) * grow);
    const pts = xs.map((x, i) => [x, H - hs[i]]);
    let d = `M${pts[0][0]} ${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
      const cx = (x0 + x1) / 2;
      d += ` C${cx} ${y0}, ${cx} ${y1}, ${x1} ${y1}`;
    }
    host.innerHTML = `<svg viewBox="0 -10 ${W} ${H + 40}" preserveAspectRatio="xMidYMid meet" aria-label="Type scale ${ratio}">
      <path class="curve" d="${d}"/>
      ${xs.map((x, i) => `<line class="bar" x1="${x}" x2="${x}" y1="${H}" y2="${H - hs[i]}"/><circle cx="${x}" cy="${H - hs[i]}" r="2.5" fill="#fff"/>
        <text class="lbl" x="${x}" y="${H + 18}">${steps[i]}</text>`).join('')}
      <circle class="base" cx="${xs[2]}" cy="${H + 40}" r="13"/><text class="base-t" x="${xs[2]}" y="${H + 44}">${base}</text>
    </svg>`;
  }
  render();
  return {
    scrub(p) { const g = Math.round(clamp(p * 1.4) * 200) / 200; if (g !== grow) { grow = Math.max(0.02, g); render(); } },
    setBase(b) { base = b; render(); },
    get ratio() { return ratio; },
  };
}

// ------------------------------------------------------------------ pairing / styles
export function pairDemo(el) {
  const rows = [
    ['Display', 'Geist 300', 'clamp(28px,3.4vw,52px)', 300, '-0.04em', 'Night with one light'],
    ['Heading', 'Geist 500', 'clamp(24px,2.6vw,36px)', 500, '-0.02em', 'One system, every pixel'],
    ['Body', 'Geist 400', '16px', 400, '0', 'Tokens, icons and type that ship together.'],
    ['Label', 'Geist Mono', '12px', 500, '0.2em', 'COLOR.PRIMARY.500'],
  ];
  $(el).innerHTML = rows.map(([n, f, size, w, ls, txt]) => `<div class="pair-row"><small>${n.toUpperCase()}</small>
    <div style="font-size:${size};font-weight:${w};letter-spacing:${ls};${f === 'Geist Mono' ? 'font-family:var(--mono);' : ''}line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${txt}</div><em>${f}</em></div>`).join('');
  return { rows: () => $(el).querySelectorAll('.pair-row') };
}
