"""HALO showreel — 1920×1080 @ 60 fps, one folder of frames per scene."""
import os, sys, time
from playwright.sync_api import sync_playwright
from rec import Rec, launch, ease_io, ease_sine

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "frames_showreel")
W, H, S = 1440, 810, 4 / 3


def cap(r, k, t, b="", pos="bl", y=56):
    r.ov("caption", k=k, t=t, b=b, pos=pos, y=y)


def s01_intro(r):
    r.open("index.html?hq", first_visit=True, settle=0)
    r.page.mouse.move(1180, 760)
    r.idle(3.8)                                   # preloader ring → hero reveal
    cap(r, "HALO · Product tour", "One app for design systems,\nicons and fonts.",
        "A walkthrough of everything on the site, and how to use it.", pos="tl")
    r.idle(1.6)
    r.move_to(".hero-products li:nth-child(1) a", 1.6, fx=0.4)
    r.idle(0.5)
    r.move_to(".hero-products li:nth-child(2) a", 1.0, fx=0.4)
    r.idle(0.5)
    r.move_to(".hero-products li:nth-child(3) a", 1.0, fx=0.4)
    r.idle(1.2)
    r.move(1250, 330, 1.4)
    r.idle(0.6)


def s02_story(r):
    r.open("index.html?hq")
    r.page.mouse.move(1250, 330)
    r.idle(1.0)
    cap(r, "Scroll to explore", "Every section is a live,\nscroll-driven scene.")
    r.js("__ov.hint('scroll', 'Scroll')")
    r.idle(1.6)
    r.scroll(r.pin("orbit", 0.55), 5.0)
    r.js("__ov.unhint()")
    cap(r, "Three tools · one orbit", "Systems, Icons and Type:\nthe three parts of HALO.", pos="tr")
    r.idle(2.0)
    r.js("__ov.uncaption()")
    state = {"shown": False, "hidden": False}
    def studio_caption(p):
        if p > 0.12 and not state["shown"]:
            state["shown"] = True
            cap(r, "The studio", "Your whole palette,\nin one window.", pos="tr")
        if p > 0.62 and not state["hidden"]:
            state["hidden"] = True
            r.js("__ov.uncaption()")
    r.scroll(r.pin("studio", 0.62), 5.5, during=studio_caption)
    r.idle(1.6)
    r.scroll(r.pin("eclipse", 0.84), 6.0)
    r.idle(1.6)


def s03_systems(r):
    r.open("index.html?hq")
    r.jump(r.pin("systems", 0.08))
    r.page.mouse.move(1100, 700)
    r.idle(1.4)
    cap(r, "01 · Design System Builder", "Drag the curve to reshape\nall 11 color steps.",
        "Built on OKLCH, so every step looks evenly spaced.")
    r.idle(1.0)
    x, y = r.center("#sysCurve .h2")
    r.move(x, y, 1.4)
    r.js("__ov.hint('drag', 'Drag the handle')")
    r.drag(x - 46, y + 34, 1.8)
    r.idle(0.3)
    x2, y2 = r.center("#sysCurve .h1")
    r.move(x2, y2, 0.9)
    r.drag(x2 + 26, y2 - 22, 1.5)
    r.js("__ov.unhint()")
    r.idle(0.4)
    cap(r, "01 · Design System Builder", "Change the hue and every\nlinked token follows.")
    r.slide("#sysHue", 200, 2.0)
    r.idle(0.3)
    r.slide("#sysHue", 285, 1.8, approach=0.4)
    r.idle(0.6)
    cap(r, "01 · Design System Builder", "Scroll on for Transparency\nand Gradient.")
    r.scroll(r.pin("systems", 0.5), 2.8)
    r.idle(1.3)
    r.scroll(r.pin("systems", 0.86), 2.8)
    r.idle(1.6)


def s04_grid(r):
    r.open("index.html?hq")
    r.jump(r.pin("beat", 0.12))
    r.page.mouse.move(1200, 640)
    r.idle(0.8)
    cap(r, "Grid", "Baseline, columns and spacing\ncome from one grid.")
    r.scroll(r.pin("beat", 0.92), 4.2)
    r.scroll(r.pin("grid", 0.5), 3.4)
    r.idle(0.8)
    cap(r, "Grid", "Set the columns once; gutters\nand widths are computed.")
    r.slide("#colRange", 6, 1.8)
    r.idle(0.5)
    r.slide("#colRange", 16, 2.0, approach=0.3)
    r.idle(0.5)
    r.slide("#colRange", 12, 1.4, approach=0.3)
    r.idle(1.2)


def s05_icons(r):
    r.open("index.html?hq")
    r.jump(r.pin("icons", 0.0))
    r.page.mouse.move(1250, 300)
    r.idle(0.6)
    r.scroll(r.pin("icons", 0.24), 4.2)
    cap(r, "02 · Icon Library", "140 icons, all drawn\non one keyline grid.")
    r.scroll(r.pin("icons", 0.46), 3.4)
    r.idle(1.2)
    r.scroll(r.pin("icons", 0.64), 2.6)
    cap(r, "02 · Icon Library", "One slider restyles\nthe whole set.")
    r.idle(0.4)
    r.slide("#icoStroke", 1.0, 1.4)
    r.idle(0.3)
    r.slide("#icoStroke", 2.2, 1.8, approach=0.3)
    r.idle(0.4)
    r.move_to('[data-cap="square"]', 1.0)
    r.click(); r.idle(1.2)
    r.move_to('[data-cap="round"]', 0.7)
    r.click(); r.idle(0.8)
    cap(r, "02 · Icon Library", "Search by name or meaning,\nthen click to copy the SVG.")
    r.scroll(r.pin("icons", 0.92), 2.6)
    r.idle(2.2)
    r.move_to("#icoResults .ico-cell:nth-child(3)", 1.2)
    r.click(); r.idle(1.8)


def s06_type(r):
    r.open("index.html?hq")
    r.jump(r.pin("type", 0.0))
    r.page.mouse.move(1250, 300)
    r.idle(0.6)
    cap(r, "03 · Font Builder", "Shape a typeface,\nnot just a style.")
    r.scroll(r.pin("type", 0.25), 4.6)
    r.scroll(r.pin("type", 0.42), 2.4)
    cap(r, "03 · Font Builder", "Weight and width are\nlive parameters.")
    r.idle(0.3)
    r.slide("#tWeight", 20, 1.8)
    r.idle(0.2)
    r.slide("#tWeight", 4, 2.0, approach=0.2)
    r.idle(0.2)
    r.slide("#tWidth", 1.4, 1.6)
    r.idle(0.6)
    r.scroll(r.pin("type", 0.66), 2.6)
    cap(r, "03 · Font Builder", "Pick a ratio and the\nscale map updates.")
    r.move_to('[data-r="1.5"]', 1.2)
    r.click(); r.idle(1.4)
    r.move_to('[data-r="1.2"]', 1.0)
    r.click(); r.idle(1.2)
    r.scroll(r.pin("type", 0.9), 2.6)
    r.idle(1.6)


def s07_more(r):
    r.open("index.html?hq")
    r.jump(r.pin("features", 0.08))
    r.page.mouse.move(1200, 640)
    r.idle(0.6)
    cap(r, "Features", "Built for designers\nand developers.")
    r.idle(1.4)
    r.move_to('.tabs-big [data-tab="1"]', 1.4)
    r.click()
    r.idle(2.6)
    r.js("__ov.uncaption()")
    r.scroll(r.top("#export", 260), 3.8)
    cap(r, "Export", "Ship to Figma, CSS,\nSVG and OTF.")
    r.idle(1.6)
    r.scroll(r.top("#pricing", -10), 3.4)
    cap(r, "Pricing", "Start free. Upgrade when\nyour team grows.")
    r.move_to('[data-bill="y"]', 1.4)
    r.click(); r.idle(1.6)
    r.js("__ov.uncaption()")
    r.move_to(".price.featured", 1.4, fx=0.4, fy=0.35)
    r.move_to(".price.featured", 1.2, fx=0.65, fy=0.6)
    r.scroll(r.top("#beta"), 3.4)
    cap(r, "Private beta", "Join with one email.")
    r.move_to("#betaEmail", 1.2)
    r.click(ripple=False)
    r.type("you@studio.com", 0.09)
    r.move_to("#betaForm button", 1.0)
    r.click(); r.idle(2.2)


def s08_systems_page(r):
    r.open("systems.html?hq")
    r.page.mouse.move(1200, 600)
    r.idle(0.4)
    cap(r, "Systems page", "The full design\nsystem builder.", pos="br")
    r.idle(2.6)
    r.scroll(r.top("#lab", 150), 3.2)
    cap(r, "Palette lab", "Tune hue and chroma; every\nswatch shows its contrast.", pos="br", y=40)
    r.slide("#labHue", 150, 2.2)
    r.idle(0.3)
    r.slide("#labChroma", 0.28, 1.4)
    r.idle(0.3)
    r.move_to("#rowPrimary .sw:nth-child(6)", 1.2)
    r.click(); r.idle(1.4)
    r.scroll(r.top("#preview", 262), 3.2)
    cap(r, "Live tokens", "Every token drives real\ncomponents, light and dark.")
    r.slide("#tR", 26, 1.7)
    r.idle(0.3)
    r.slide("#tBase", 18, 1.3)
    r.idle(0.3)
    r.slide("#tSp", 10, 1.3)
    r.idle(0.6)
    r.scroll(r.top("#export", 10), 3.2)
    cap(r, "Export", "CSS, JSON or Tailwind:\npaste it straight in.")
    r.move_to('#fmtTabs [data-f="json"]', 1.2)
    r.click(); r.idle(1.4)
    r.move_to('#fmtTabs [data-f="tw"]', 0.8)
    r.click(); r.idle(1.4)
    r.move_to("#copyCode", 1.0)
    r.click(); r.idle(1.8)


def s09_icons_page(r):
    r.open("icons.html?hq")
    r.page.mouse.move(1200, 600)
    r.idle(0.4)
    cap(r, "Icons page", "Browse, restyle and\ncopy any icon.", pos="br")
    r.idle(2.8)
    r.scroll(r.top("#library", 250), 3.2)
    r.move_to("#q", 1.2, fx=0.3)
    r.click(ripple=False)
    cap(r, "Library", "Search by name or meaning.")
    r.type("sun", 0.16)
    r.idle(1.4)
    for _ in range(3):
        r.page.keyboard.press("Backspace"); r.idle(0.12)
    r.idle(0.5)
    r.move_to('#cats [data-c="design"]', 1.2)
    r.click(); r.idle(1.2)
    cap(r, "Library", "Stroke, size, corners and color\napply to the whole set.")
    r.slide("#lStroke", 2.3, 1.6)
    r.idle(0.2)
    r.slide("#lSize", 40, 1.4)
    r.idle(0.6)
    r.move_to("#lib .ico-cell:nth-child(4)", 1.3)
    r.click()
    cap(r, "Icon details", "Each icon opens on its keyline.\nCopy or download the SVG.")
    r.idle(2.4)
    r.move_to("#dCopy", 1.2)
    r.click(); r.idle(1.5)
    r.move_to("#dClose", 1.0)
    r.click(); r.idle(1.4)


def s10_fonts_page(r):
    r.open("fonts.html?hq")
    r.page.mouse.move(1200, 600)
    r.idle(0.4)
    cap(r, "Fonts page", "Build your own typeface.", pos="br")
    r.idle(2.8)
    r.scroll(r.top("#builder", 200), 3.2)
    cap(r, "Glyph builder", "Start from a preset, or tune\nevery parameter by hand.")
    for p in ["black", "condensed", "extended", "regular"]:
        r.move_to(f'[data-preset="{p}"]', 0.9)
        r.click(); r.idle(1.5)
    r.slide("#bS", 12, 1.6)
    r.idle(0.3)
    r.move_to('[data-term="square"]', 1.0)
    r.click(); r.idle(1.0)
    r.move_to("#bText", 1.0, fx=0.6, fy=0.75)
    r.click(ripple=False)
    r.page.keyboard.press("Meta+ArrowDown")
    r.type(" NOW", 0.16)
    r.idle(0.8)
    r.scroll(r.top("#charmap", 120), 3.0)
    cap(r, "Character map", "Every glyph follows\nyour settings.")
    r.idle(2.0)
    r.scroll(r.top("#variable", 140), 3.0)
    cap(r, "Variable playground", "Bring your own variable\nfonts and play with the axes.")
    r.slide('[data-ax="wdth"]', 150, 1.8)
    r.idle(0.2)
    r.slide('[data-ax="wght"]', 860, 1.6)
    r.idle(1.4)


def s11_extras(r):
    r.open("index.html?hq")
    r.page.mouse.move(1000, 400)
    r.idle(0.6)
    cap(r, "Extras", "A soundtrack, a full menu,\nand a Calm motion mode.")
    r.move_to(".sound-btn", 1.6)
    r.click(); r.idle(1.4)
    r.move_to(".dot-btn", 1.4)
    r.click(); r.idle(1.6)
    for i in (2, 3, 4):
        r.move_to(f"#menu nav a:nth-child({i}) .t", 0.9, fx=0.3)
        r.idle(0.4)
    r.move_to('[data-motion="calm"]', 1.2)
    r.idle(1.2)
    r.move_to(".dot-btn", 1.4)
    r.click(); r.idle(1.6)


def s12_outro(r):
    r.open("index.html?hq")
    r.jump(r.top("#beta"))
    r.page.mouse.move(1500, 900)
    r.idle(1.0)
    r.js("gsap.to('#beta > div', { opacity: 0, duration: 1.2, ease: 'power2.inOut' }); 0")
    r.ov("card", kick="HALO", big="Design systems, icons & fonts.\nOne app.", sub="Free private beta · Autumn 2026", pill="Join the free beta", dense=True)
    r.idle(6.0)


SCENES = [s01_intro, s02_story, s03_systems, s04_grid, s05_icons, s06_type, s07_more,
          s08_systems_page, s09_icons_page, s10_fonts_page, s11_extras, s12_outro]

if __name__ == "__main__":
    pick = sys.argv[1:]
    with sync_playwright() as p:
        b = launch(p)
        for fn in SCENES:
            if pick and fn.__name__[:3] not in pick: continue
            t0 = time.time()
            r = Rec(b, fn.__name__, width=W, height=H, scale=S, out_root=OUT)
            fn(r)
            m = r.close()
            print(f"{fn.__name__}: {m['frames']} frames ({m['frames']/60:.1f}s) in {time.time()-t0:.0f}s", flush=True)
        b.close()
