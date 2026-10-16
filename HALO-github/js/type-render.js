// HALO Geometric renderer — turns skeleton strokes into an SVG at any weight / width / slant.
import { GLYPHS } from './data/glyphs.js';

// scale x-coordinates of a path numerically (so stroke width stays true in user units)
function scalePathX(d, sx) {
  const tokens = d.match(/[MLACQZ]|-?\d*\.?\d+(?:e-?\d+)?/gi) || [];
  let out = '', cmd = '', idx = 0;
  for (const tk of tokens) {
    if (/^[MLACQZ]$/i.test(tk)) { cmd = tk.toUpperCase(); idx = 0; out += ' ' + cmd; continue; }
    let v = parseFloat(tk);
    if (cmd === 'A') {
      const k = idx % 7;           // rx ry rot large sweep x y
      if (k === 0 || k === 5) v *= sx;
    } else if (idx % 2 === 0) v *= sx;
    out += ' ' + (Math.round(v * 100) / 100);
    idx++;
  }
  return out.trim();
}

const cache = new Map();
function glyphPaths(ch, width) {
  const key = ch + '|' + width.toFixed(3);
  if (cache.has(key)) return cache.get(key);
  const g = GLYPHS[ch] || GLYPHS[ch.toUpperCase()] || GLYPHS['?'];
  const r = { w: g.w * width, s: g.s.map(p => scalePathX(p, width)) };
  cache.set(key, r);
  return r;
}

/**
 * render(text, { weight, width, slant, tracking, cap, color }) → { svg, width, height }
 * Units: cap height 100.
 */
export function renderText(text, o = {}) {
  const weight = o.weight ?? 9, width = o.width ?? 1, slant = o.slant ?? 0, tracking = o.tracking ?? 14;
  const cap = o.cap || 'round';
  const join = cap === 'round' ? 'round' : 'miter';
  const capCss = cap === 'round' ? 'round' : 'square';
  const lines = String(text).split('\n');
  const lh = 100 + Math.max(42, weight * 2 + 24);
  let maxW = 0;
  let body = '';
  lines.forEach((line, li) => {
    let x = 0;
    const y0 = li * lh;
    let row = '';
    [...line].forEach(ch => {
      const g = glyphPaths(ch, width);
      if (g.s.length) row += `<g transform="translate(${x.toFixed(2)} ${y0})">${g.s.map(d => `<path d="${d}"/>`).join('')}</g>`;
      x += g.w + tracking + weight;
    });
    x -= tracking + weight;
    maxW = Math.max(maxW, x);
    body += row;
  });
  const pad = weight / 2 + 2;
  const tan = Math.tan((slant * Math.PI) / 180);
  const skew = slant ? ` transform="translate(${(100 * tan).toFixed(2)} 0) skewX(${-slant})"` : '';
  const height = lines.length * lh - (lh - 100);
  const extra = Math.abs(100 * tan) + 4;
  const vb = `${-pad} ${-pad} ${Math.max(1, maxW + pad * 2 + extra)} ${height + pad * 2}`;
  const svg = `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escapeAttr(text)}">` +
    `<g fill="none" stroke="${o.color || 'currentColor'}" stroke-width="${weight}" stroke-linecap="${capCss}" stroke-linejoin="${join}" stroke-miterlimit="3"${skew}>${body}</g></svg>`;
  return { svg, width: maxW, height };
}

const escapeAttr = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export const GLYPH_LIST = Object.keys(GLYPHS).filter(k => k !== ' ');
