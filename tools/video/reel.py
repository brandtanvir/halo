"""HALO Instagram reel — 1080×1920 @ 60 fps, captured on the real phone layout (360×640 @ 3x)."""
import os, sys, time
from playwright.sync_api import sync_playwright
from rec import Rec, launch, ease_io, ease_sine

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "frames_reel")
W, H, S = 360, 640, 3


def line(r, l, s="", top="63%", size="40px"):
    r.ov("reel", l=l, s=s, top=top, size=size)


def r1_hook(r):
    r.open("index.html?hq")
    r.page.mouse.move(300, 560)
    r.js("gsap.set('.hero-copy', { opacity: 0 }); 0")
    r.ov("card", kick="For product teams", big="Stop juggling\nthree tools.", dense=True, instant=True)
    r.idle(2.4)
    r.js("__ov.uncard(); gsap.to('.hero-copy', { opacity: 1, duration: 1.4, delay: 0.5, ease: 'power2.inOut' }); 0")
    r.idle(1.2)
    r.js("__ov.tag('New · Free beta', '12.5%')")
    r.idle(2.8)
    r.js("__ov.untag()")
    r.idle(0.3)


def r2_orbit(r):
    r.open("index.html?hq")
    r.idle(0.2)
    r.scroll(r.pin("orbit", 0.56), 2.8)
    r.idle(1.2)


def r3_color(r):
    r.open("index.html?hq")
    r.jump(r.pin("systems", 0.06))
    r.idle(0.6)
    r.js("__ov.scrim(true)")
    r.idle(0.45)
    line(r, "Color systems\nin seconds.", "01 · Design System Builder")
    x, y = r.center("#sysCurve .h2")
    r.mouse = (x + 30, y + 40); r.page.mouse.move(*r.mouse)
    r.move(x, y, 0.5)
    r.drag(x - 34, y + 26, 1.2)
    r.slide("#sysHue", 200, 1.2, approach=0.5)
    r.idle(0.5)


def r4_icons(r):
    r.open("index.html?hq")
    r.jump(r.pin("icons", 0.62))
    r.idle(0.6)
    r.js("__ov.scrim(true)")
    r.idle(0.45)
    line(r, "140 icons.\nOne slider.", "02 · Icon Library")
    r.idle(0.3)
    r.slide("#icoStroke", 1.0, 1.0, approach=0.5)
    r.slide("#icoStroke", 2.3, 1.3, approach=0.2)
    r.idle(0.4)


def r5_type(r):
    r.open("index.html?hq")
    r.jump(r.pin("type", 0.36))
    r.idle(0.4)
    r.js("__ov.scrim(true)")
    r.idle(0.45)
    line(r, "Shape your\nown typeface.", "03 · Font Builder")
    r.scroll(r.pin("type", 0.52), 3.2, ease=ease_sine)   # weight & width morph with the scroll
    r.idle(0.3)


def r6_eclipse(r):
    r.open("index.html?hq")
    r.jump(r.pin("eclipse", 0.36))
    r.idle(0.2)
    r.scroll(r.pin("eclipse", 0.82), 3.2)
    r.idle(0.6)


def r7_tokens(r):
    r.open("systems.html?hq")
    r.jump(r.top("#preview", 330))
    r.idle(0.6)
    r.js("__ov.scrim(true)")
    r.idle(0.45)
    line(r, "Every token.\nLive.", "Light & dark, in sync")
    r.slide("#tR", 26, 1.4, approach=0.5)
    r.idle(1.0)


def r8_cta(r):
    r.open("index.html?hq")
    r.jump(r.top("#beta"))
    r.page.mouse.move(180, 600)
    r.idle(1.0)
    r.js("__ov.tag('Free beta · Link in bio', '14%')")
    r.idle(4.2)


SCENES = [r1_hook, r2_orbit, r3_color, r4_icons, r5_type, r6_eclipse, r7_tokens, r8_cta]

if __name__ == "__main__":
    pick = sys.argv[1:]
    with sync_playwright() as p:
        b = launch(p)
        for fn in SCENES:
            if pick and fn.__name__[:2] not in pick: continue
            t0 = time.time()
            r = Rec(b, fn.__name__, width=W, height=H, scale=S, mobile=True, out_root=OUT)
            fn(r)
            m = r.close()
            print(f"{fn.__name__}: {m['frames']} frames ({m['frames']/60:.1f}s) in {time.time()-t0:.0f}s", flush=True)
        b.close()
