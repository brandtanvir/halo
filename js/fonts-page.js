// HALO Fonts — parametric glyph builder, character map, variable playground, scale ladder.
import { isMobile, copyText, toast, calm, HALO } from './core.js';
import { productPage, FOOTER } from './page.js';
import { renderText, GLYPH_LIST } from './type-render.js';
import { GLYPHS } from './data/glyphs.js';

const gsap = window.gsap;
const $ = s => document.querySelector(s);
const mobile = isMobile();
const m = (a, b) => (mobile ? b : a);
document.querySelector('main').insertAdjacentHTML('afterend', FOOTER);

const asp = innerWidth / innerHeight;
productPage({
  key: 'fonts', label: 'Fonts', glyph: 'Aa',
  sections: [['#top', 'Fonts', '03'], ['#builder', 'Glyph builder', '03'], ['#charmap', 'Character map', '03'], ['#variable', 'Variable', '03'], ['#scale', 'Scale map', '03'], ['.footer', 'HALO']],
  keyframes: [
    ['#top', 'top top', 'bottom top', 0, { lightX: m(0.72, 0.5), lightY: 0.42, lightSize: 0.5, lightI: 1.1, rays: 0.9, peak: 0.75, peakX: m(0.24 * asp, 0.05), mtnY: m(0, 0.06),
      orb: { vis: 0 }, glyph: { vis: 1, x: m(0.42, 0.04), y: m(-0.2, 0.1), s: m(1, 0.9) } }],
    ['#top', 'top top', 'bottom top', 1, { dark: 0.2, lightY: 0.25, glyph: { y: m(-0.75, -0.6), vis: 0.6 } }],
    ['#builder', 'top bottom', 'bottom top', 0.3, { dark: 0.55, glyph: { vis: 0 }, peak: 0.3, mtnY: -0.15 }],
    ['#scale', 'top bottom', 'bottom top', 0.5, { dark: 0.3, accentI: 0.1, lightX: 0.5, lightY: 1.04, peak: 0, mtnY: -0.05 }],
  ],
});

// ------------------------------------------------------------------ builder
const P = { weight: 9, width: 1, slant: 0, tracking: 14, cap: 'round' };
const sanitize = t => t.toUpperCase().split('\n').map(l => [...l].filter(c => GLYPHS[c]).join('')).join('\n');
let svgOut = '';
let lastGlyphs = 0;
function renderBuilder() {
  const txt = sanitize($('#bText').value) || 'HALO';
  const r = renderText(txt, P);
  svgOut = r.svg.replace('stroke="currentColor"', 'stroke="#0B0C0F"');
  $('#bOut').innerHTML = r.svg;
  // fixed scale while typing (height-driven), and newly typed glyphs fade in softly
  const out = $('#bOut'), svg = out.querySelector('svg');
  if (svg) {
    svg.classList.toggle('two', txt.includes('\n'));
    // cap & baseline guides live inside the svg, so they always move with the glyphs
    const vb = svg.viewBox.baseVal;
    svg.insertAdjacentHTML('afterbegin', `<g fill="none" stroke="rgba(107,149,255,.42)" stroke-width="1">
      <line x1="-4000" x2="8000" y1="0" y2="0" vector-effect="non-scaling-stroke"/><line x1="-4000" x2="8000" y1="100" y2="100" vector-effect="non-scaling-stroke"/></g>
      <g fill="rgba(107,149,255,.85)" font-family="Geist Mono, monospace" font-size="6.5" letter-spacing="1"><text x="${vb.x}" y="-4">CAP 100</text><text x="${vb.x}" y="96">BASELINE 0</text></g>`);
    // fit to the stage with an eased scale on a persistent wrapper — never a jump
    const stage = $('#bStage'), cs = getComputedStyle(stage);
    const avail = stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const natural = svg.getBoundingClientRect().width / (parseFloat((out.style.transform.match(/scale\(([\d.]+)/) || [0, 1])[1]) || 1);
    const fit = Math.min(1, avail / (natural || 1));
    out.style.transform = `scale(${fit.toFixed(4)})`;
  }
  const groups = [...out.querySelectorAll('svg > g[stroke-width] > g')];
  if (!calm && lastGlyphs && groups.length > lastGlyphs) gsap.fromTo(groups.slice(lastGlyphs), { opacity: 0 }, { opacity: 1, duration: 0.6, ease: 'power2.out' });
  lastGlyphs = groups.length;
  $('#bInfo').textContent = `${[...txt.replace(/\s/g, '')].length} glyphs · wght ${P.weight} · wdth ${P.width.toFixed(2)} · slnt ${P.slant}°`;
  renderMap();
}
const bind = (id, out, key, fmt) => $(id).addEventListener('input', e => { P[key] = +e.target.value; $(out).textContent = fmt(P[key]); renderBuilder(); });
bind('#bW', '#oW', 'weight', v => v);
bind('#bWd', '#oWd', 'width', v => v.toFixed(2));
bind('#bS', '#oS', 'slant', v => v + '°');
bind('#bT', '#oT', 'tracking', v => v);
$('#bText').addEventListener('input', renderBuilder);
document.querySelectorAll('[data-term]').forEach(b => b.addEventListener('click', () => {
  P.cap = b.dataset.term;
  document.querySelectorAll('[data-term]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
  renderBuilder();
}));
const PRESETS = {
  hairline: { weight: 2, width: 1, tracking: 18 }, regular: { weight: 9, width: 1, tracking: 14 },
  black: { weight: 21, width: 1.08, tracking: 6 }, condensed: { weight: 10, width: 0.64, tracking: 10 }, extended: { weight: 8, width: 1.45, tracking: 20 },
};
const setRange = (id, v) => { const el = $(id); el.value = v; el.dispatchEvent(new Event('input')); };
document.querySelectorAll('[data-preset]').forEach(b => b.addEventListener('click', () => {
  const to = PRESETS[b.dataset.preset];
  document.querySelectorAll('[data-preset]').forEach(x => x.classList.toggle('on', x === b));
  const from = { weight: P.weight, width: P.width, tracking: P.tracking };
  gsap.to(from, {
    ...to, duration: calm ? 0 : 1.4, ease: 'power2.inOut',
    onUpdate: () => {
      // continuous values drive the glyphs; the sliders just mirror them (no integer steps)
      P.weight = from.weight; P.width = from.width; P.tracking = from.tracking;
      [['#bW', '#oW', from.weight, from.weight.toFixed(1)], ['#bWd', '#oWd', from.width, from.width.toFixed(2)], ['#bT', '#oT', from.tracking, Math.round(from.tracking)]].forEach(([id, o, v, txt]) => {
        const el = $(id); el.value = v; el.style.setProperty('--p', ((v - el.min) / (el.max - el.min)) * 100 + '%'); $(o).textContent = txt;
      });
      renderBuilder();
    },
  });
}));
$('#bCopy').addEventListener('click', () => copyText(svgOut, 'SVG copied'));
$('#bDown').addEventListener('click', () => {
  const blob = new Blob([svgOut], { type: 'image/svg+xml' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'halo-geometric-specimen.svg';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast('Saved halo-geometric-specimen.svg');
});
addEventListener('resize', renderBuilder);

// ------------------------------------------------------------------ character map
let mapT;
function renderMap() {
  clearTimeout(mapT);
  mapT = setTimeout(() => {
    $('#cmap').innerHTML = GLYPH_LIST.map(c => `<button data-c="${c === '"' ? '&quot;' : c}" aria-label="Add ${c}"><small>${c === '&' ? '&amp;' : c}</small>${renderText(c, { ...P, tracking: 0 }).svg}</button>`).join('');
  }, 60);
}
$('#cmap').addEventListener('click', e => {
  const b = e.target.closest('[data-c]'); if (!b) return;
  const ta = $('#bText');
  ta.value += b.dataset.c;
  renderBuilder();
  HALO.sound?.tick();
  toast(`Added “${b.dataset.c}”`);
});

// ------------------------------------------------------------------ variable playground
const AXES = [
  ['wght', 'Weight', 100, 1000, 1, 420], ['wdth', 'Width', 25, 151, 1, 100], ['opsz', 'Optical size', 8, 144, 1, 96],
  ['slnt', 'Slant', -10, 0, 0.5, 0], ['GRAD', 'Grade', -200, 150, 1, 0],
];
const ax = Object.fromEntries(AXES.map(a => [a[0], a[5]]));
$('#axes').innerHTML = AXES.map(([t, n, mn, mx, st, v]) => `<div class="field"><span>${n} <span class="mono dim">${t}</span> <output id="ax-${t}">${v}</output></span><input type="range" min="${mn}" max="${mx}" step="${st}" value="${v}" data-ax="${t}" aria-label="${n}"></div>`).join('');
// variable specimen stays on one line and scales continuously to fit — it never re-wraps
let flexBase = 0;
const fitFlex = () => {
  const el = $('#flex'), box = el.parentElement;
  if (!flexBase) flexBase = parseFloat(getComputedStyle(el).fontSize);
  el.style.fontSize = flexBase + 'px';
  const avail = box.clientWidth - parseFloat(getComputedStyle(box).paddingLeft) * 2;
  if (el.scrollWidth > avail) el.style.fontSize = (flexBase * avail / el.scrollWidth) + 'px';
};
const applyAxes = () => { $('#flex').style.fontVariationSettings = AXES.map(([t]) => `"${t}" ${ax[t]}`).join(', '); fitFlex(); };
$('#flex').addEventListener('input', fitFlex);
addEventListener('resize', () => { flexBase = 0; fitFlex(); });
(document.fonts ? document.fonts.ready : Promise.resolve()).then(fitFlex);
document.querySelectorAll('[data-ax]').forEach(el => {
  el.addEventListener('input', () => { ax[el.dataset.ax] = +el.value; $(`#ax-${el.dataset.ax}`).textContent = el.value; applyAxes(); });
  const set = () => el.style.setProperty('--p', ((el.value - el.min) / (el.max - el.min)) * 100 + '%');
  el.addEventListener('input', set); set();
});
applyAxes();
// a gentle breathing demo on first view, until someone touches an axis
if (!calm) {
  let touched = false;
  document.querySelectorAll('[data-ax]').forEach(el => el.addEventListener('pointerdown', () => { touched = true; }));
  const o = { w: 420 };
  window.ScrollTrigger.create({
    trigger: '#variable', start: 'top 70%', once: true,
    onEnter: () => gsap.to(o, {
      w: 900, duration: 1.6, ease: 'sine.inOut', yoyo: true, repeat: 3,
      onUpdate: () => { if (touched) return; ax.wght = Math.round(o.w); const el = $('[data-ax="wght"]'); el.value = ax.wght; el.dispatchEvent(new Event('input')); },
    }),
  });
}

// ------------------------------------------------------------------ scale ladder
const RATIOS = [['1.125', 'Major 2nd'], ['1.2', 'Minor 3rd'], ['1.25', 'Major 3rd'], ['1.333', 'Perfect 4th'], ['1.5', 'Perfect 5th'], ['1.618', 'Golden']];
let base = 16, ratio = 1.25;
$('#sRatios').innerHTML = RATIOS.map(([r, n]) => `<button class="chip${r === '1.25' ? ' on' : ''}" data-r="${r}" title="${n}">${r} · ${n}</button>`).join('');
$('#sRatios').addEventListener('click', e => {
  const b = e.target.closest('[data-r]'); if (!b) return;
  ratio = +b.dataset.r;
  document.querySelectorAll('#sRatios .chip').forEach(c => c.classList.toggle('on', c === b));
  ladder(true);
});
$('#sBase').addEventListener('input', e => { base = +e.target.value; $('#oBase').textContent = base + 'px'; ladder(false); });
const NAMES = ['caption', 'small', 'body', 'lead', 'h5', 'h4', 'h3', 'h2', 'h1', 'display'];
function ladder(animate) {
  const rows = NAMES.map((n, i) => [n, base * ratio ** (i - 2)]).reverse();
  $('#ladder').innerHTML = rows.map(([n, px]) => `<div class="ladder-row"><small>${n}</small><small>${px.toFixed(1)}px</small>
    <div style="font-size:${Math.min(px, mobile ? 64 : 140)}px;font-weight:${px > 30 ? 400 : px > 18 ? 500 : 400}">${px > 40 ? 'Night with one light' : 'Systems, icons & type, one halo'}</div></div>`).join('');
  if (animate && !calm) gsap.fromTo('#ladder .ladder-row', { opacity: 0, x: -14 }, { opacity: 1, x: 0, stagger: 0.05, duration: 1, ease: 'power3.out' });
}
ladder(false);

(document.fonts ? document.fonts.ready : Promise.resolve()).then(renderBuilder);
renderBuilder();
