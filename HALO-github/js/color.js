// HALO color math — OKLCH scales from a bezier lightness curve, WCAG contrast.

const clamp01 = v => Math.min(1, Math.max(0, v));
const toLin = c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGam = c => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

export function hexToRgb(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => v / 255);
}
export function rgbToHex([r, g, b]) {
  return '#' + [r, g, b].map(v => Math.round(clamp01(v) * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
}

function oklabToLinear(L, a, b) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  ];
}
function linearToOklab([r, g, b]) {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
  ];
}

/** oklch → sRGB [0..1], reducing chroma until it fits the gamut */
export function oklch(L, C, H) {
  const h = (H * Math.PI) / 180;
  let c = C;
  for (let i = 0; i < 24; i++) {
    const lin = oklabToLinear(L, c * Math.cos(h), c * Math.sin(h));
    if (lin.every(v => v >= -0.0005 && v <= 1.0005)) return lin.map(v => toGam(clamp01(v)));
    c *= 0.9;
  }
  return oklabToLinear(L, 0, 0).map(v => toGam(clamp01(v)));
}
export function hexToOklch(hex) {
  const [L, a, b] = linearToOklab(hexToRgb(hex).map(toLin));
  return { L, C: Math.hypot(a, b), H: ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360 };
}

export function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map(toLin);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrast(a, b) {
  const la = luminance(a), lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
export const onColor = hex => (contrast(hex, '#FFFFFF') >= contrast(hex, '#08090B') ? '#FFFFFF' : '#08090B');

/** cubic bezier y for x, with p0=(0,0), p3=(1,1) */
export function bezierY(x, p1, p2) {
  let lo = 0, hi = 1, t = x;
  const bx = t => 3 * (1 - t) ** 2 * t * p1[0] + 3 * (1 - t) * t * t * p2[0] + t ** 3;
  for (let i = 0; i < 24; i++) { t = (lo + hi) / 2; if (bx(t) < x) lo = t; else hi = t; }
  return 3 * (1 - t) ** 2 * t * p1[1] + 3 * (1 - t) * t * t * p2[1] + t ** 3;
}

export const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

/**
 * Build an 11-step scale. curve handles p1/p2 shape how lightness falls from 50 → 950.
 * chroma peaks around the middle and eases off at the light/dark ends.
 */
export function buildScale({ hue = 255, chroma = 0.2, p1 = [0.3, 0.12], p2 = [0.7, 0.88], lMax = 0.975, lMin = 0.2 } = {}) {
  return STEPS.map((step, i) => {
    const x = i / (STEPS.length - 1);
    const y = bezierY(x, p1, p2);
    const L = lMax - y * (lMax - lMin);
    const cMul = 0.25 + 0.75 * Math.sin(Math.PI * Math.min(1, 0.12 + x * 0.88));
    const hex = rgbToHex(oklch(L, chroma * cMul, hue + (x - 0.5) * 6));
    return { step, hex, L };
  });
}

export const hexA = (hex, a) => {
  const [r, g, b] = hexToRgb(hex).map(v => Math.round(v * 255));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};
