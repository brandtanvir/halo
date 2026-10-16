// HALO score — a generative WebAudio soundtrack. No audio files.
// D dorian, 84 bpm. Layers: chord pad · sub bass · heartbeat pulse · glass-bell arpeggio · air.
// Mysterious harmony, but mixed for clarity: low end high-passed, bells bright, reverb + echo kept tidy.
// Scrolling feeds "energy" (0..1): the pad opens up, the arpeggio gets busier and climbs, hats appear.
// One engine drives both the live site (createScore) and offline renders for video (renderScore).

const midi = n => 440 * 2 ** ((n - 69) / 12);

// four chords, two bars each:  Dm9 → B♭maj7♯11 → Gm9 → A7sus4
const CHORDS = [
  { bass: 38, pad: [50, 57, 60, 64, 65], arp: [62, 64, 65, 69, 72, 74, 76, 81] },
  { bass: 34, pad: [53, 57, 58, 62, 64], arp: [62, 64, 65, 69, 70, 74, 76, 77] },
  { bass: 31, pad: [50, 55, 58, 62, 57], arp: [62, 65, 67, 69, 70, 74, 77, 79] },
  { bass: 33, pad: [52, 55, 57, 62, 64], arp: [62, 64, 67, 69, 72, 74, 76, 79] },
];
const BPM = 84;
export const EIGHTH = 60 / BPM / 2;
const STEPS_PER_CHORD = 16;

const mulberry32 = a => () => {
  a |= 0; a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

function engine(ctx, rnd = Math.random) {
  const E = { chord: 0, arpIdx: 3 };

  function impulse(seconds = 4.2, decay = 3) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (rnd() * 2 - 1) * (1 - i / len) ** decay;
    }
    return buf;
  }

  // master chain: gain → high-pass (clarity) → compressor → destination
  const out = ctx.createGain(); out.gain.value = 0;
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 38;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.3;
  out.connect(hp); hp.connect(comp); comp.connect(ctx.destination);

  // space: hall reverb + dotted-quarter echo with a darkened feedback loop
  const reverb = ctx.createConvolver(); reverb.buffer = impulse();
  const reverbIn = ctx.createGain();
  const revOut = ctx.createGain(); revOut.gain.value = 0.42;
  reverbIn.connect(reverb); reverb.connect(revOut); revOut.connect(out);

  const delay = ctx.createDelay(2); delay.delayTime.value = EIGHTH * 3;
  const fb = ctx.createGain(); fb.gain.value = 0.36;
  const fbTone = ctx.createBiquadFilter(); fbTone.type = 'lowpass'; fbTone.frequency.value = 3200;
  const delayIn = ctx.createGain();
  const delayOut = ctx.createGain(); delayOut.gain.value = 0.32;
  delayIn.connect(delay); delay.connect(fbTone); fbTone.connect(fb); fb.connect(delay);
  fbTone.connect(delayOut); delayOut.connect(out); delayOut.connect(reverbIn);

  // pad: warm saws through a lowpass that breathes with energy
  const padFilter = ctx.createBiquadFilter(); padFilter.type = 'lowpass'; padFilter.frequency.value = 700; padFilter.Q.value = 0.9;
  const padBus = ctx.createGain(); padBus.gain.value = 0.055;
  padBus.connect(padFilter); padFilter.connect(out);
  const padSend = ctx.createGain(); padSend.gain.value = 0.55; padFilter.connect(padSend); padSend.connect(reverbIn);
  const drift = ctx.createOscillator(); drift.frequency.value = 0.045;
  const driftAmt = ctx.createGain(); driftAmt.gain.value = 180;
  drift.connect(driftAmt); driftAmt.connect(padFilter.frequency); drift.start();

  const bassBus = ctx.createGain(); bassBus.gain.value = 0.15;
  const bassLp = ctx.createBiquadFilter(); bassLp.type = 'lowpass'; bassLp.frequency.value = 420;
  bassBus.connect(bassLp); bassLp.connect(out);

  const pulseBus = ctx.createGain(); pulseBus.gain.value = 0.32; pulseBus.connect(out);

  const bellBus = ctx.createGain(); bellBus.gain.value = 0.075; bellBus.connect(out);
  const bellRev = ctx.createGain(); bellRev.gain.value = 0.6; bellBus.connect(bellRev); bellRev.connect(reverbIn);
  const bellDel = ctx.createGain(); bellDel.gain.value = 0.55; bellBus.connect(bellDel); bellDel.connect(delayIn);

  const hatBus = ctx.createGain(); hatBus.gain.value = 0.05;
  const hatHp = ctx.createBiquadFilter(); hatHp.type = 'highpass'; hatHp.frequency.value = 7600;
  hatBus.connect(hatHp); hatHp.connect(out);
  const hatRev = ctx.createGain(); hatRev.gain.value = 0.25; hatHp.connect(hatRev); hatRev.connect(reverbIn);

  // air: looped noise through a sweeping band-pass — the "night wind"
  const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const nd = noiseBuf.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = rnd() * 2 - 1;
  const air = ctx.createBufferSource(); air.buffer = noiseBuf; air.loop = true;
  const airFilter = ctx.createBiquadFilter(); airFilter.type = 'bandpass'; airFilter.frequency.value = 900; airFilter.Q.value = 1.4;
  const airGain = ctx.createGain(); airGain.gain.value = 0.018;
  const sweep = ctx.createOscillator(); sweep.frequency.value = 0.06;
  const sweepAmt = ctx.createGain(); sweepAmt.gain.value = 500;
  sweep.connect(sweepAmt); sweepAmt.connect(airFilter.frequency); sweep.start();
  air.connect(airFilter); airFilter.connect(airGain); airGain.connect(reverbIn); airGain.connect(out);
  air.start();

  // ------------------------------------------------------------ voices
  function padChord(c, t, dur) {
    CHORDS[c].pad.forEach((n, i) => {
      const v = ctx.createGain();
      const lvl = i === 0 ? 0.9 : 0.6;
      v.gain.setValueAtTime(0, t); v.gain.linearRampToValueAtTime(lvl, t + 2.2);
      v.gain.setValueAtTime(lvl, t + dur); v.gain.linearRampToValueAtTime(0, t + dur + 3.4);
      v.connect(padBus);
      [-7, 7].forEach(cents => {
        const o = ctx.createOscillator();
        o.type = 'sawtooth'; o.frequency.value = midi(n); o.detune.value = cents + (rnd() - 0.5) * 4;
        o.connect(v); o.start(t); o.stop(t + dur + 3.6);
      });
    });
  }
  function bass(n, t, dur, vol = 1) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.06);
    g.gain.setTargetAtTime(vol * 0.6, t + 0.3, 0.8);
    g.gain.setValueAtTime(vol * 0.6, t + dur - 0.2); g.gain.linearRampToValueAtTime(0, t + dur + 0.4);
    g.connect(bassBus);
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = midi(n);
    const o2 = ctx.createOscillator(); o2.type = 'triangle'; o2.frequency.value = midi(n + 12);
    const g2 = ctx.createGain(); g2.gain.value = 0.18;
    o.connect(g); o2.connect(g2); g2.connect(g);
    o.start(t); o2.start(t); o.stop(t + dur + 0.5); o2.stop(t + dur + 0.5);
  }
  function pulse(t, vol) {
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.16);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
    o.connect(g); g.connect(pulseBus); o.start(t); o.stop(t + 0.5);
  }
  function bell(n, t, vol = 1, len = 1.8) {
    const f = midi(n);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    g.connect(bellBus);
    [[1, 1, 'sine'], [2.005, 0.28, 'sine'], [3.01, 0.08, 'triangle']].forEach(([mul, amp, type]) => {
      const o = ctx.createOscillator(); o.type = type; o.frequency.value = f * mul;
      const a = ctx.createGain(); a.gain.value = amp;
      o.connect(a); a.connect(g); o.start(t); o.stop(t + len + 0.05);
    });
  }
  function hat(t, vol) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    s.connect(g); g.connect(hatBus);
    s.start(t, rnd() * 1.5, 0.06);
  }

  // ------------------------------------------------------------ one sequencer step (an eighth note)
  function step(s, t, energy) {
    const inChord = s % STEPS_PER_CHORD;
    const inBar = s % 8;
    if (inChord === 0) {
      E.chord = (s / STEPS_PER_CHORD) % CHORDS.length;
      padChord(E.chord, t, STEPS_PER_CHORD * EIGHTH);
      bass(CHORDS[E.chord].bass, t, STEPS_PER_CHORD * EIGHTH * 0.94, 1);
    }
    if (inBar === 0) { pulse(t, 0.55 + energy * 0.35); pulse(t + EIGHTH * 0.5, 0.3 + energy * 0.25); }
    if (inBar === 4 && energy > 0.45) pulse(t, 0.35 * energy);
    if (inBar === 6 && energy > 0.3) bass(CHORDS[E.chord].bass + 12, t, EIGHTH * 1.6, 0.45 * energy);
    if (rnd() < 0.32 + energy * 0.6) {
      const arp = CHORDS[E.chord].arp;
      E.arpIdx += rnd() < 0.5 ? -1 : (rnd() < 0.5 ? 1 : 2);
      const top = Math.round(3 + energy * (arp.length - 4));
      E.arpIdx = Math.max(0, Math.min(top, E.arpIdx));
      const accent = inBar === 0 || inBar === 3 || inBar === 6;
      bell(arp[E.arpIdx], t, accent ? 1 : 0.62, accent ? 2.2 : 1.4);
      if (energy > 0.7 && rnd() < 0.3) bell(arp[Math.min(arp.length - 1, E.arpIdx + 2)] + 12, t + EIGHTH / 2, 0.35, 1.0);
    }
    if (s % 2 === 1 && energy > 0.2) hat(t, 0.4 + energy * 0.6);
  }
  function setEnergy(energy, t) {
    padFilter.frequency.setTargetAtTime(650 + energy * 2400, t, 0.4);
    airGain.gain.setTargetAtTime(0.016 + energy * 0.02, t, 0.6);
  }
  function tick(t) { const arp = CHORDS[E.chord].arp; bell(arp[arp.length - 1 - Math.floor(rnd() * 3)] + 12, t, 0.12, 0.35); }
  function chime(t, dir = 1) {
    const arp = CHORDS[E.chord].arp;
    bell(arp[dir ? 4 : 3], t, 0.9, 2.2);
    bell(arp[dir ? 6 : 1], t + 0.11, 0.7, 2.4);
  }
  return Object.assign(E, { out, step, setEnergy, tick, chime });
}

// ------------------------------------------------------------ live (site)
export function createScore() {
  let ctx = null, E = null, on = false, timer = null;
  let s = 0, nextTime = 0, energy = 0, energyTarget = 0, lastTick = 0;

  function loop() {
    energy += (energyTarget - energy) * 0.12;
    energyTarget *= 0.965;
    const now = ctx.currentTime;
    E.setEnergy(energy, now);
    while (nextTime < now + 0.14) { E.step(s, nextTime, energy); nextTime += EIGHTH; s++; }
  }
  return {
    get on() { return on; },
    toggle() {
      if (!ctx) { ctx = new (window.AudioContext || window.webkitAudioContext)(); E = engine(ctx); }
      on = !on;
      if (ctx.state === 'suspended') ctx.resume();
      const now = ctx.currentTime;
      E.out.gain.cancelScheduledValues(now);
      E.out.gain.setValueAtTime(E.out.gain.value, now);
      E.out.gain.linearRampToValueAtTime(on ? 0.85 : 0, now + (on ? 2.5 : 1.2));
      clearInterval(timer);
      if (nextTime < now) { nextTime = now + 0.1; s = 0; E.arpIdx = 3; }
      timer = setInterval(loop, 25);
      if (!on) setTimeout(() => { if (!on) clearInterval(timer); }, 1300);
      return on;
    },
    /** feed scroll velocity (px/frame); bigger moves = more energy */
    energy(v) { energyTarget = Math.max(energyTarget, Math.min(1, Math.abs(v) / 38)); },
    tick() {
      if (!on) return;
      const n = performance.now(); if (n - lastTick < 90) return; lastTick = n;
      E.tick(ctx.currentTime + 0.01);
    },
    chime(dir = 1) { if (on) E.chime(ctx.currentTime + 0.01, dir); },
  };
}

// ------------------------------------------------------------ offline (video soundtrack)
/**
 * renderScore({ duration, energyAt: t => 0..1, events: [{ t, type: 'tick'|'chime', dir }], seed })
 * → AudioBuffer. Fades in over 2.5s and out over the last 3s.
 */
export async function renderScore({ duration, energyAt = () => 0, events = [], seed = 7, sampleRate = 48000 }) {
  const ctx = new OfflineAudioContext(2, Math.ceil(duration * sampleRate), sampleRate);
  const E = engine(ctx, mulberry32(seed));
  E.out.gain.setValueAtTime(0, 0);
  E.out.gain.linearRampToValueAtTime(0.85, 2.5);
  E.out.gain.setValueAtTime(0.85, Math.max(2.6, duration - 3.2));
  E.out.gain.linearRampToValueAtTime(0, duration - 0.15);
  for (let t = 0; t < duration; t += 0.1) E.setEnergy(energyAt(t), t);
  // sequencer + one-shot UI sounds, interleaved in time so chimes use the chord playing then
  const evs = [...events].sort((a, b) => a.t - b.t);
  let k = 0, s = 0;
  for (let t = 0.1; t < duration - 0.5; t += EIGHTH) {
    while (k < evs.length && evs[k].t < t) { const e = evs[k++]; e.type === 'chime' ? E.chime(e.t, e.dir ?? 1) : E.tick(e.t); }
    E.step(s++, t, energyAt(t));
  }
  return ctx.startRendering();
}
