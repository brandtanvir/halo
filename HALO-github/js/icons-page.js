// HALO Icons — orbiting ring hero, full library, detail drawer.
import { isMobile, copyText, calm, HALO, toast } from './core.js';
import { productPage, FOOTER } from './page.js';
import { iconSvg, iconSource, keylineDemo, ICON_MAP, softIn, swapIn, debounce } from './demos.js';
import { ICONS, ICON_CATEGORIES } from './data/icons.js';

const gsap = window.gsap;
const $ = s => document.querySelector(s);
const mobile = isMobile();
const m = (a, b) => (mobile ? b : a);
document.querySelector('main').insertAdjacentHTML('afterend', FOOTER);

const ORB = { x: m(0.42, 0), y: m(0.12, 0.38), s: m(0.62, 0.66) };
const { stage } = productPage({
  key: 'icons', label: 'Icons',
  sections: [['#top', 'Icons', '02'], ['#library', 'Library', '02'], ['#principles', 'Principles', '02'], ['.footer', 'HALO']],
  keyframes: [
    ['#top', 'top top', 'bottom top', 0, { lightX: m(0.7, 0.5), lightY: 1.04, lightI: 1, lightSize: 0.5, rays: 0.8, mtnY: m(-0.04, 0.0),
      orb: { vis: 1, x: ORB.x, y: ORB.y, s: ORB.s, moon: 0, glass: 1, front: 0 } }],
    ['#top', 'top top', 'bottom top', 1, { dark: 0.2, orb: { y: ORB.y + 0.35, s: ORB.s * 0.8 } }],
    ['#library', 'top bottom', 'bottom top', 0.3, { dark: 0.55, orb: { vis: 0 }, mtnY: -0.2 }],
    ['#principles', 'top bottom', 'bottom top', 0.5, { dark: 0.25, lightX: 0.5, accentI: 0.12, mtnY: -0.05 }],
  ],
});

// ------------------------------------------------------------------ orbit ring around the orb
const RING = ['palette', 'pen-tool', 'layers', 'droplet', 'type', 'compass', 'sparkle', 'eclipse', 'code', 'camera', 'heart', 'cloud', 'bolt', 'grid'];
const ring = $('#ring');
ring.innerHTML = RING.map(n => `<i>${iconSvg(n)}</i>`).join('');
const nodes = [...ring.children];
let spin = 0;
gsap.ticker.add((t, dt) => {
  const o = stage.state.orb;
  const pr = stage.project(o.x, o.y, o.s);
  const hero = $('#top').getBoundingClientRect();
  ring.style.left = pr.x + 'px';
  ring.style.top = (pr.y - hero.top) + 'px';
  ring.style.opacity = String(o.vis);
  if (!calm) spin += dt * 0.00012;
  const R = pr.r * 1.42;
  nodes.forEach((n, i) => {
    const a = spin * Math.PI * 2 + (i / nodes.length) * Math.PI * 2;
    const z = Math.sin(a);
    n.style.transform = `translate3d(${Math.cos(a) * R}px, ${z * R * 0.36}px, 0) scale(${0.78 + 0.22 * (z + 1) / 2})`;
    n.style.opacity = String(z < 0 ? Math.max(0, 0.08 + z * 0.08) + Math.max(0, 1 + z * 6) * 0.9 : 1);
    n.style.zIndex = String(Math.round(z * 10) + 10);
  });
});
if (!calm) gsap.from(nodes, { scale: 0, opacity: 0, stagger: 0.04, duration: 1.2, ease: 'power3.out', delay: 0.6 });

// ------------------------------------------------------------------ library
const st = { q: '', cat: 'all', stroke: 1.5, size: 28, cap: 'round', color: '#eef0f3' };
const lib = $('#lib');
$('#cats').innerHTML = ['all', ...ICON_CATEGORIES].map(c => `<button class="chip${c === 'all' ? ' on' : ''}" role="tab" data-c="${c}">${c} <span class="dim">${c === 'all' ? ICONS.length : ICONS.filter(i => i.c === c).length}</span></button>`).join('');
$('#cats').addEventListener('click', e => {
  const b = e.target.closest('[data-c]'); if (!b) return;
  st.cat = b.dataset.c;
  document.querySelectorAll('#cats .chip').forEach(x => x.classList.toggle('on', x === b));
  swapIn(lib, () => render(false));
});
function render(animate) {
  const q = st.q.trim().toLowerCase();
  const list = ICONS.filter(i => (st.cat === 'all' || i.c === st.cat) && (!q || i.n.includes(q) || i.t.some(t => t.includes(q)) || i.c.includes(q)));
  lib.innerHTML = list.length
    ? list.map(i => `<button class="ico-cell" data-n="${i.n}" aria-label="${i.n}">${iconSvg(i.n)}<small>${i.n}</small></button>`).join('')
    : `<p style="grid-column:1/-1;color:var(--ink-3);padding:30px 0;margin:0">Nothing in orbit for “${q.replace(/[<>&]/g, '')}”. Try “sun”, “file” or “arrow”.</p>`;
  $('#count').textContent = `${list.length} / ${ICONS.length} icons`;
  if (animate && !calm) softIn(lib.children, 0.006);
}
const applyStyle = () => {
  lib.style.setProperty('--sw', st.stroke);
  lib.style.setProperty('--size', st.size + 'px');
  lib.style.setProperty('--cap', st.cap === 'round' ? 'round' : 'square');
  lib.style.setProperty('--join', st.cap === 'round' ? 'round' : 'miter');
  lib.style.color = st.color;
};
const searchLib = debounce(() => swapIn(lib, () => render(false)), 220);
$('#q').addEventListener('input', e => { st.q = e.target.value; searchLib(); });
$('#lStroke').addEventListener('input', e => { st.stroke = +e.target.value; $('#oStroke').textContent = st.stroke.toFixed(2); applyStyle(); });
$('#lSize').addEventListener('input', e => { st.size = +e.target.value; $('#oSize').textContent = st.size; applyStyle(); });
$('#lColor').addEventListener('input', e => { st.color = e.target.value; applyStyle(); });
document.querySelectorAll('[data-lcap]').forEach(b => b.addEventListener('click', () => {
  st.cap = b.dataset.lcap;
  document.querySelectorAll('[data-lcap]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
  applyStyle();
}));
render(false);
applyStyle();

// ------------------------------------------------------------------ drawer
const drawer = $('#drawer'), scrim = $('#scrim');
const kl = keylineDemo('#dStage', 'compass');
let current = null;
const src = n => iconSource(n, { stroke: st.stroke, cap: st.cap, size: 24 });
function open(n) {
  current = n;
  const i = ICON_MAP[n];
  $('#dName').textContent = n;
  $('#dCat').textContent = i.c;
  $('#dTags').innerHTML = i.t.map(t => `<span>${t}</span>`).join('');
  $('#dCode').textContent = src(n);
  kl.setIcon(n);
  const big = $('#dStage .big-ico');
  big.style.strokeWidth = st.stroke;
  big.style.strokeLinecap = st.cap === 'round' ? 'round' : 'square';
  big.style.strokeLinejoin = st.cap === 'round' ? 'round' : 'miter';
  drawer.classList.add('open'); scrim.classList.add('open');
  drawer.setAttribute('aria-hidden', 'false');
  HALO.lenis?.stop();
  if (calm) kl.set(1);
  else { const o = { p: 0 }; gsap.to(o, { p: 1, duration: 1.6, ease: 'power2.inOut', onUpdate: () => kl.set(o.p) }); }
  setTimeout(() => $('#dClose').focus(), 300);
  HALO.sound?.chime();
}
function close() {
  drawer.classList.remove('open'); scrim.classList.remove('open');
  drawer.setAttribute('aria-hidden', 'true');
  HALO.lenis?.start();
  lib.querySelector(`[data-n="${current}"]`)?.focus();
}
lib.addEventListener('click', e => { const c = e.target.closest('.ico-cell'); if (c) open(c.dataset.n); });
$('#dClose').addEventListener('click', close);
scrim.addEventListener('click', close);
addEventListener('keydown', e => { if (e.key === 'Escape' && drawer.classList.contains('open')) close(); });
$('#dCopy').addEventListener('click', () => copyText(src(current), `Copied ${current}.svg`));
$('#dDown').addEventListener('click', () => {
  const blob = new Blob([src(current)], { type: 'image/svg+xml' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = `halo-${current}.svg`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast(`Saved halo-${current}.svg`);
});
