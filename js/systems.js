// HALO Systems — palette lab, token-driven previews, export.
import { isMobile, copyText } from './core.js';
import { productPage, FOOTER } from './page.js';
import { colorDemo } from './demos.js';
import { buildScale, contrast, onColor, hexA } from './color.js';

const $ = s => document.querySelector(s);
const mobile = isMobile();
const m = (a, b) => (mobile ? b : a);
document.querySelector('main').insertAdjacentHTML('afterend', FOOTER);

productPage({
  key: 'systems', label: 'Systems',
  sections: [['#top', 'Systems', '01'], ['#lab', 'Palette lab', '01'], ['#preview', 'Tokens', '01'], ['#export', 'Export', '01'], ['.footer', 'HALO']],
  keyframes: [
    ['#top', 'top top', 'bottom top', 0, { lightX: 0.5, lightY: 1.04, lightSize: 0.42, lightI: 1.15, rays: 1.2, peak: 0.6, peakX: m(0.42, 0), mtnY: m(0.05, 0.1),
      orb: { vis: 0 }, cube: { vis: 1, x: m(0.42, 0), y: m(0.3, 0.34), s: m(0.62, 0.62), rx: 0.6, ry: 0.7, rz: 0.1 } }],
    ['#top', 'top top', 'bottom top', 1, { dark: 0.15, lightI: 0.8, cube: { y: m(0.55, 0.6), ry: 1.6, s: m(0.5, 0.5), tint: 0.35 } }],
    ['#lab', 'top bottom', 'bottom top', 0.4, { dark: 0.45, cube: { vis: 0, y: 0.9, ry: 2.4 }, peak: 0.2, mtnY: -0.1, accentI: 0.15 }],
    ['#export', 'top bottom', 'bottom top', 0.5, { dark: 0.35, accentI: 0.08, peak: 0, mtnY: -0.05 }],
  ],
});

// ------------------------------------------------------------------ palette
const T = { hue: 262, chroma: 0.21, accent: 18, p1: [0.32, 0.06], p2: [0.62, 0.94], base: 16, ratio: 1.25, sp: 8, r: 12 };
let scales = {};
let fmt = 'css';
let live = false;

const curve = colorDemo({
  dots: '#labDots', curve: '#labCurve', hue: '#labHue', hex: '#labHex', readout: '#labReadout', card: '#labCard',
  onChange: s => { T.hue = s.hue; T.p1 = s.p1; T.p2 = s.p2; if (live) update(); },
});

function renderRow(el, scale) {
  // update in place so colors glide (CSS transitions) instead of re-rendering
  if (el.children.length === scale.length) {
    scale.forEach((s, i) => {
      const b = el.children[i], ink = onColor(s.hex), c = contrast(s.hex, ink);
      b.style.background = s.hex; b.style.color = ink; b.dataset.hex = s.hex; b.title = `${s.hex} · ${c.toFixed(2)}:1`;
      b.querySelector('.aa').textContent = c >= 7 ? 'AAA' : c >= 4.5 ? 'AA' : c >= 3 ? 'AA L' : '—';
      b.lastElementChild.textContent = s.hex.slice(1);
    });
    return;
  }
  el.innerHTML = scale.map(s => {
    const ink = onColor(s.hex);
    const c = contrast(s.hex, ink);
    const badge = c >= 7 ? 'AAA' : c >= 4.5 ? 'AA' : c >= 3 ? 'AA L' : '—';
    return `<button class="sw" style="background:${s.hex};color:${ink}" data-hex="${s.hex}" title="${s.hex} · ${c.toFixed(2)}:1"><span class="aa">${badge}</span><b>${s.step}</b><span>${s.hex.slice(1)}</span></button>`;
  }).join('');
}
document.querySelector('.tool-main').addEventListener('click', e => {
  const b = e.target.closest('.sw');
  if (b) copyText(b.dataset.hex, `Copied ${b.dataset.hex}`);
});

const pvHTML = `
  <div class="row" style="justify-content:space-between"><span class="chip2">Tokens v2</span><span class="tg" aria-hidden="true"></span></div>
  <h4>Night with one light</h4>
  <p>Your palette, type scale, spacing and radius render this card. Change a token and it updates.</p>
  <div class="row"><span class="b pri">Primary action</span><span class="b sec">Secondary</span><span class="b ghost">Ghost</span></div>
  <div class="row"><span class="in focus">you@studio.com</span><span class="in">Search tokens…</span></div>
  <div class="crd"><span class="av"></span><div style="flex:1;display:flex;flex-direction:column;gap:8px"><strong style="font-weight:500">Design review</strong><div class="bar"><i></i></div></div></div>`;
$('#pvLight').innerHTML = pvHTML;
$('#pvDark').innerHTML = pvHTML;

function update() {
  scales.primary = buildScale({ hue: T.hue, chroma: T.chroma, p1: T.p1, p2: T.p2 });
  scales.accent = buildScale({ hue: T.accent, chroma: T.chroma * 0.95, p1: T.p1, p2: T.p2 });
  scales.neutral = buildScale({ hue: T.hue, chroma: 0.012, p1: T.p1, p2: T.p2 });
  renderRow($('#rowPrimary'), scales.primary);
  renderRow($('#rowAccent'), scales.accent);
  renderRow($('#rowNeutral'), scales.neutral);
  $('#nPrimary').textContent = scales.primary[5].hex;
  $('#nAccent').textContent = scales.accent[5].hex;
  const p = scales.primary;
  [['#pvLight', p[5].hex, p[1].hex], ['#pvDark', p[4].hex, hexA(p[4].hex, 0.16)]].forEach(([sel, pri, soft]) => {
    const el = $(sel);
    el.style.setProperty('--p', pri);
    el.style.setProperty('--p-ink', onColor(pri));
    el.style.setProperty('--p-soft', soft);
    el.style.setProperty('--base', T.base + 'px');
    el.style.setProperty('--ratio', T.ratio);
    el.style.setProperty('--sp', T.sp + 'px');
    el.style.setProperty('--r', T.r + 'px');
  });
  renderCode();
}

// ------------------------------------------------------------------ type / space controls
const bind = (id, out, key, fmt) => {
  const el = $(id);
  el.addEventListener('input', () => { T[key] = +el.value; $(out).textContent = fmt(+el.value); update(); });
};
bind('#labChroma', '#oChroma', 'chroma', v => v.toFixed(2));
bind('#labAccent', '#oAccent', 'accent', v => v + '°');
$('#labHue').addEventListener('input', e => { $('#oHue').textContent = e.target.value + '°'; });
bind('#tBase', '#oBase', 'base', v => v + 'px');
bind('#tRatio', '#oRatio', 'ratio', v => v.toFixed(3).replace(/0+$/, ''));
bind('#tSp', '#oSp', 'sp', v => v + 'px');
bind('#tR', '#oR', 'r', v => v + 'px');

// ------------------------------------------------------------------ export
function typeScale() {
  return ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl'].map((n, i) => [n, +(T.base * T.ratio ** (i - 2)).toFixed(2)]);
}
function tokens() {
  const color = {};
  for (const [name, sc] of Object.entries(scales)) color[name] = Object.fromEntries(sc.map(s => [s.step, s.hex]));
  const space = Object.fromEntries([1, 2, 3, 4, 6, 8, 12, 16].map(k => [k, `${k * T.sp / 2}px`]));
  return { color, font: Object.fromEntries(typeScale().map(([n, v]) => [n, v + 'px'])), space, radius: { sm: `${Math.round(T.r / 2)}px`, md: `${T.r}px`, lg: `${Math.round(T.r * 1.6)}px`, full: '9999px' } };
}
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
function renderCode() {
  const t = tokens();
  let out = '';
  if (fmt === 'css') {
    out = ':root {\n';
    for (const [n, sc] of Object.entries(t.color)) for (const [k, v] of Object.entries(sc)) out += `  --color-${n}-${k}: ${v};\n`;
    for (const [k, v] of Object.entries(t.font)) out += `  --font-size-${k}: ${v};\n`;
    for (const [k, v] of Object.entries(t.space)) out += `  --space-${k}: ${v};\n`;
    for (const [k, v] of Object.entries(t.radius)) out += `  --radius-${k}: ${v};\n`;
    out += '}';
  } else if (fmt === 'json') out = JSON.stringify(t, null, 2);
  else {
    out = `// tailwind.config.js — generated by HALO\nexport default {\n  theme: {\n    extend: {\n      colors: ${JSON.stringify(t.color, null, 2).replace(/\n/g, '\n      ')},\n      fontSize: ${JSON.stringify(t.font).replace(/,/g, ', ')},\n      spacing: ${JSON.stringify(t.space).replace(/,/g, ', ')},\n      borderRadius: ${JSON.stringify(t.radius).replace(/,/g, ', ')},\n    },\n  },\n};`;
  }
  $('#code').dataset.raw = out;
  $('#code').innerHTML = esc(out).replace(/(--[\w-]+|"[\w-]+"(?=:))/g, '<span class="k">$1</span>').replace(/(#[0-9A-F]{6})/g, '<span class="v">$1</span>');
}
document.querySelectorAll('#fmtTabs button').forEach(b => b.addEventListener('click', () => {
  fmt = b.dataset.f;
  document.querySelectorAll('#fmtTabs button').forEach(x => x.classList.toggle('on', x === b));
  renderCode();
}));
$('#copyCode').addEventListener('click', () => copyText($('#code').dataset.raw, 'Tokens copied'));

live = true;
update();
