"""Frame-perfect recorder for the HALO site.

The page runs on Playwright's fake clock; every frame we advance exactly 1/60 s, pin CSS animations
to that clock, then take a screenshot. Nothing can stutter, because nothing runs in real time.
"""
import json, math, os, shutil
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
OV_JS = open(os.path.join(HERE, "ov.js")).read()
BASE = "http://127.0.0.1:4321/"
FPS = 60
STEPS = [17, 17, 16]  # integer ms per frame, averages exactly 1000/60


def ease_io(t):  # smooth cubic in-out — the default for every move
    return 4 * t * t * t if t < 0.5 else 1 - (-2 * t + 2) ** 3 / 2


def ease_sine(t):
    return -(math.cos(math.pi * t) - 1) / 2


class Rec:
    def __init__(self, browser, name, *, width, height, scale, mobile=False, out_root):
        self.name = name
        self.dir = os.path.join(out_root, name)
        shutil.rmtree(self.dir, ignore_errors=True)
        os.makedirs(self.dir)
        self.ctx = browser.new_context(viewport=dict(width=width, height=height), device_scale_factor=scale,
                                       is_mobile=mobile, has_touch=mobile)
        self.page = self.ctx.new_page()
        self.page.on("pageerror", lambda e: print(f"[{name}] PAGEERROR", e))
        self.f = 0            # frames written
        self.scrolls = []     # scroll y per frame (for soundtrack energy)
        self.mouse = (width * 0.6, height * 0.6)
        self.mobile = mobile
        self.W, self.H = width, height
        self.scale = scale
        self.shoot = True

    # ------------------------------------------------------------ setup
    def open(self, path, *, first_visit=False, settle=1.2):
        init = "try{localStorage.setItem('halo-motion','full');" + ("sessionStorage.clear()" if first_visit else "sessionStorage.setItem('halo-visited','1')") + "}catch(e){}"
        self.ctx.add_init_script(init)
        self.page.clock.install(time=1_700_000_000_000)
        self.page.clock.pause_at(1_700_000_000_000 + 10)
        self.page.goto(BASE + path, wait_until="load", timeout=90000)
        self.page.evaluate("document.fonts.ready.then(() => 1)")
        self.page.wait_for_timeout(500)  # real time for fonts/GL to settle; the virtual clock stays paused
        self.page.add_script_tag(content=OV_JS)
        self.page.evaluate("window.__frame = 0")
        # let boot/preloader logic start; not recorded unless asked
        self.idle(settle, record=False)

    def js(self, code, *args):
        return self.page.evaluate(code, *args)

    # ------------------------------------------------------------ time
    def frame(self, record=True):
        self.page.clock.run_for(STEPS[self.f % 3])
        self.page.evaluate(f"window.__frame = {self.f}; window.__syncCSS && window.__syncCSS()")
        if record and self.shoot:
            self.page.screenshot(path=os.path.join(self.dir, f"{self.f:06d}.jpg"), type="jpeg", quality=93)
            self.scrolls.append(self.page.evaluate("scrollY"))
            self.f += 1
        elif record:
            self.f += 1

    def idle(self, sec, record=True):
        for _ in range(int(round(sec * FPS))):
            self.frame(record)

    # ------------------------------------------------------------ scrolling
    def y_of(self, expr):
        return self.js(expr)

    def pin(self, sid, p):
        return self.js(f"(() => {{ const s = ScrollTrigger.getAll().find(s => s.pin && s.trigger.id === '{sid}'); return s.start + {p} * (s.end - s.start); }})()")

    def top(self, sel, off=0):
        return self.js(f"(() => {{ const el = document.querySelector('{sel}'); return el.getBoundingClientRect().top + scrollY + {off}; }})()")

    def scroll(self, y, sec, ease=ease_io, during=None):
        y0 = self.js("scrollY")
        n = max(1, int(round(sec * FPS)))
        snap = lambda v: round(v * self.scale) / self.scale   # land on the device-pixel grid
        y = snap(y)
        for i in range(1, n + 1):
            t = ease(i / n)
            yy = snap(y0 + (y - y0) * t)
            self.js(f"HALO.lenis ? HALO.lenis.scrollTo({yy}, {{ immediate: true, force: true }}) : scrollTo(0, {yy})")
            if during: during(i / n)
            self.frame()

    def jump(self, y, settle=1.8):
        y = round(y * self.scale) / self.scale
        self.js(f"HALO.lenis ? HALO.lenis.scrollTo({y}, {{ immediate: true, force: true }}) : scrollTo(0, {y})")
        self.idle(settle, record=False)   # let the 3D stage glide to this section off-camera

    # ------------------------------------------------------------ pointer
    def rect(self, sel):
        return self.js(f"(() => {{ const r = document.querySelector(`{sel}`).getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; }})()")

    def center(self, sel, fx=0.5, fy=0.5):
        x, y, w, h = self.rect(sel)
        return x + w * fx, y + h * fy

    def move(self, x, y, sec=1.0, arc=0.12, ease=ease_io):
        x0, y0 = self.mouse
        n = max(1, int(round(sec * FPS)))
        # gentle curved path (quadratic bezier with a perpendicular offset)
        mx, my = (x0 + x) / 2, (y0 + y) / 2
        dx, dy = x - x0, y - y0
        cx, cy = mx - dy * arc, my + dx * arc
        for i in range(1, n + 1):
            t = ease(i / n)
            px = (1 - t) ** 2 * x0 + 2 * (1 - t) * t * cx + t * t * x
            py = (1 - t) ** 2 * y0 + 2 * (1 - t) * t * cy + t * t * y
            self.page.mouse.move(px, py)
            if self.mobile: self.js(f"__ov.touchMove({px},{py})")
            self.frame()
        self.mouse = (x, y)

    def move_to(self, sel, sec=1.0, fx=0.5, fy=0.5, **kw):
        x, y = self.center(sel, fx, fy)
        self.move(x, y, sec, **kw)

    def click(self, hold=0.12, ripple=True):
        x, y = self.mouse
        if self.mobile: self.js(f"__ov.touchDown({x},{y})")
        self.page.mouse.down()
        if ripple: self.js(f"__ov.ripple({x},{y})")
        self.idle(hold)
        self.page.mouse.up()
        if self.mobile: self.js("__ov.touchUp()")

    def drag(self, x, y, sec=1.2, ease=ease_io, arc=0.0):
        if self.mobile: self.js(f"__ov.touchDown({self.mouse[0]},{self.mouse[1]})")
        self.page.mouse.down()
        self.idle(0.1)
        self.move(x, y, sec, arc=arc, ease=ease)
        self.idle(0.1)
        self.page.mouse.up()
        if self.mobile: self.js("__ov.touchUp()")

    def range_xy(self, sel, value):
        """screen point of a range input's thumb at `value`"""
        return self.js(f"""(() => {{ const el = document.querySelector('{sel}'); const r = el.getBoundingClientRect();
            const p = ({value} - el.min) / (el.max - el.min); return [r.left + 7 + p * (r.width - 14), r.top + r.height / 2]; }})()""")

    def slide(self, sel, to, sec=1.4, approach=0.9, from_value=None):
        v0 = from_value if from_value is not None else float(self.js(f"document.querySelector('{sel}').value"))
        x0, y0 = self.range_xy(sel, v0)
        self.move(x0, y0, approach)
        x1, y1 = self.range_xy(sel, to)
        self.drag(x1, y1, sec)

    def type(self, text, per_char=0.11):
        for ch in text:
            self.page.keyboard.type(ch)
            self.idle(per_char)

    # ------------------------------------------------------------ overlay
    def ov(self, method, **kw):
        self.js(f"__ov.{method}({json.dumps(kw) if kw else ''})")

    def close(self):
        log = self.js("window.__audioLog || []")
        meta = dict(name=self.name, frames=self.f, scrolls=self.scrolls, audio=log, fps=FPS)
        json.dump(meta, open(os.path.join(self.dir, "meta.json"), "w"))
        self.ctx.close()
        return meta


def launch(p):
    return p.chromium.launch(channel="chrome", headless=True,
                             args=["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--hide-scrollbars"])
