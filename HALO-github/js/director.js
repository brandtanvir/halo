// HALO director — scroll-keyed keyframes for the WebGL stage.
// Each keyframe sits at a progress point of a ScrollTrigger; the stage state is the eased
// interpolation between the two keyframes around the current scroll, smoothed over time.
import { defaultState } from './stage.js';

const flatten = (obj, pre = '', out = {}) => {
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'number') out[pre + k] = v;
    else if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, pre + k + '.', out);
  }
  return out;
};
const smooth = t => t * t * (3 - 2 * t);

export function createDirector(stage, { calm = false } = {}) {
  const raw = [];
  let frames = [];
  const cur = flatten(defaultState());
  const keys = Object.keys(cur);
  let snapped = false;

  function apply(flat) {
    for (const k of keys) {
      const v = flat[k];
      const dot = k.indexOf('.');
      if (dot < 0) stage.state[k] = v;
      else stage.state[k.slice(0, dot)][k.slice(dot + 1)] = v;
    }
  }

  return {
    /** key(scrollTrigger, progress 0..1, partial nested state) */
    key(st, p, partial) { raw.push({ st, p, partial }); return this; },
    build() {
      let acc = flatten(defaultState());
      frames = raw.map(r => {
        acc = { ...acc, ...flatten(r.partial) };
        return { st: r.st, p: r.p, s: acc };
      });
      return this;
    },
    update(dt = 1 / 60) {
      if (!frames.length) return;
      const y = window.scrollY;
      const pos = f => f.st.start + f.p * (f.st.end - f.st.start);
      let target;
      if (y <= pos(frames[0])) target = frames[0].s;
      else if (y >= pos(frames[frames.length - 1])) target = frames[frames.length - 1].s;
      else {
        for (let i = 0; i < frames.length - 1; i++) {
          const a = pos(frames[i]), b = pos(frames[i + 1]);
          if (y >= a && y <= b) {
            const t = b > a ? smooth((y - a) / (b - a)) : 1;
            const A = frames[i].s, B = frames[i + 1].s;
            target = {};
            for (const k of keys) target[k] = A[k] + (B[k] - A[k]) * t;
            break;
          }
        }
        target = target || frames[frames.length - 1].s;
      }
      const k = calm || !snapped ? 1 : 1 - Math.exp(-dt * 5.5);
      snapped = true;
      for (const key of keys) cur[key] += (target[key] - cur[key]) * k;
      apply(cur);
    },
  };
}
