"""Assemble a video: timeline with crossfades → offline-rendered HALO score → H.264 + AAC MP4.

usage: python3 build.py <frames_root> <scene,scene,...> <out.mp4> <width> <height> [xfade_frames] [bitrate]
"""
import base64, json, os, subprocess, sys
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
TOOLS = HERE if os.path.exists(os.path.join(HERE, "encode")) else os.path.join(HERE, "..", "tools")
BASE = "http://127.0.0.1:4321/"


def main():
    root, scenes, out, W, H = sys.argv[1], sys.argv[2].split(","), sys.argv[3], int(sys.argv[4]), int(sys.argv[5])
    xfade = int(sys.argv[6]) if len(sys.argv) > 6 else 48
    bitrate = int(sys.argv[7]) if len(sys.argv) > 7 else 24_000_000
    metas = [json.load(open(os.path.join(root, s, "meta.json"))) for s in scenes]
    fps = metas[0]["fps"]

    # timeline
    starts, t = [], 0
    for i, m in enumerate(metas):
        starts.append(t)
        t += m["frames"] - (xfade if i < len(metas) - 1 else 0)
    total = t

    # soundtrack energy from real scroll motion, smoothed exactly like the live site's score
    vel = [0.0] * total
    events = []
    for i, m in enumerate(metas):
        ys = m["scrolls"]
        for k in range(1, len(ys)):
            g = starts[i] + k
            if g < total: vel[g] = max(vel[g], abs(ys[k] - ys[k - 1]))
        for e in m["audio"]:
            g = starts[i] + e["f"]
            # skip sounds that would land inside the outgoing half of a crossfade
            if i < len(metas) - 1 and e["f"] > m["frames"] - xfade // 2: continue
            events.append({"t": g / fps, "type": e["type"], "dir": e.get("dir", 1)})
    energy, target, e = [], 0.0, 0.0
    k_t, k_e = 0.965 ** (1000 / fps / 25), 1 - (1 - 0.12) ** (1000 / fps / 25)
    for v in vel:
        target = max(target * k_t, min(1.0, v / 38))
        e += (target - e) * k_e
        energy.append(round(e, 4))
    dur = total / fps

    wav = out.replace(".mp4", ".wav")
    with sync_playwright() as p:
        b = p.chromium.launch(channel="chrome", headless=True)
        page = b.new_page()
        page.goto(BASE + "index.html", wait_until="load")
        b64 = page.evaluate("""async ({ dur, fps, energy, events }) => {
            const { renderScore } = await import('/js/score.js');
            const buf = await renderScore({ duration: dur, events, seed: 11,
                energyAt: t => energy[Math.min(energy.length - 1, Math.max(0, Math.round(t * fps)))] });
            const n = buf.length, L = buf.getChannelData(0), R = buf.getChannelData(1);
            // normalise to -1 dBFS peak, then 16-bit PCM WAV
            let peak = 0; for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
            const g = peak > 0 ? 0.89 / peak : 1;
            const out = new DataView(new ArrayBuffer(44 + n * 4));
            const w = (o, s) => [...s].forEach((c, i) => out.setUint8(o + i, c.charCodeAt(0)));
            w(0, 'RIFF'); out.setUint32(4, 36 + n * 4, true); w(8, 'WAVEfmt '); out.setUint32(16, 16, true);
            out.setUint16(20, 1, true); out.setUint16(22, 2, true); out.setUint32(24, buf.sampleRate, true);
            out.setUint32(28, buf.sampleRate * 4, true); out.setUint16(32, 4, true); out.setUint16(34, 16, true);
            w(36, 'data'); out.setUint32(40, n * 4, true);
            for (let i = 0; i < n; i++) {
              out.setInt16(44 + i * 4, Math.max(-1, Math.min(1, L[i] * g)) * 32767, true);
              out.setInt16(46 + i * 4, Math.max(-1, Math.min(1, R[i] * g)) * 32767, true);
            }
            const bytes = new Uint8Array(out.buffer); let s = '';
            for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
            return btoa(s);
        }""", {"dur": dur, "fps": fps, "energy": energy, "events": events})
        open(wav, "wb").write(base64.b64decode(b64))
        b.close()
    print(f"audio: {wav} ({dur:.1f}s, {len(events)} UI sounds)")

    manifest = dict(out=out, width=W, height=H, fps=fps, bitrate=bitrate, audio=wav,
                    fadeIn=int(fps * 0.9), fadeOut=int(fps * 1.6), xfade=xfade,
                    segments=[dict(dir=os.path.join(root, s), **{"from": 0, "to": m["frames"]}) for s, m in zip(scenes, metas)])
    mp = out.replace(".mp4", ".manifest.json")
    json.dump(manifest, open(mp, "w"))
    subprocess.run([os.path.join(TOOLS, "encode"), mp], check=True)


main()
