"""HALO QA: load every page at desktop + phone, scroll it end to end, and report problems."""
import json, sys, urllib.request
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:4321/"
PAGES = ["index.html", "systems.html", "icons.html", "fonts.html"]
VIEWS = {"desktop": dict(width=1440, height=900), "phone": dict(width=390, height=844)}

CHECK_JS = r"""
() => {
  const out = { overflow: document.documentElement.scrollWidth - innerWidth, offscreen: [], unnamed: [], anchors: [], links: [] };
  // elements poking out horizontally (visible, not inside an overflow-hidden/auto ancestor)
  const clipped = el => { for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if (o === 'hidden' || o === 'auto' || o === 'clip' || o === 'scroll') return true; } return false; };
  document.querySelectorAll('main *, .chrome *, footer *').forEach(el => {
    const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    if (!r.width || cs.visibility === 'hidden' || cs.display === 'none' || cs.position === 'fixed') return;
    if ((r.right > innerWidth + 2 || r.left < -2) && !clipped(el)) out.offscreen.push((el.id ? '#' + el.id : el.className || el.tagName).toString().slice(0, 60) + ` [${Math.round(r.left)}..${Math.round(r.right)}]`);
  });
  document.querySelectorAll('button, a[href], input, textarea, select, [role="tab"]').forEach(el => {
    const name = (el.getAttribute('aria-label') || el.textContent || el.title || el.placeholder || (el.labels && el.labels[0] && el.labels[0].textContent) || '').trim();
    if (!name && el.type !== 'hidden') out.unnamed.push(el.outerHTML.slice(0, 90));
  });
  document.querySelectorAll('a[href]').forEach(a => {
    const h = a.getAttribute('href');
    const u = new URL(a.href);
    if (u.origin !== location.origin) return;
    out.links.push(u.pathname);
    if (u.hash && u.pathname === location.pathname && !document.querySelector(u.hash)) out.anchors.push(h);
  });
  out.links = [...new Set(out.links)];
  out.offscreen = [...new Set(out.offscreen)].slice(0, 12);
  return out;
}
"""

def main():
    report = {}
    with sync_playwright() as p:
        b = p.chromium.launch(channel="chrome", headless=True, args=["--use-angle=metal", "--enable-gpu"])
        for vname, vp in VIEWS.items():
            ctx = b.new_context(viewport=vp, device_scale_factor=1, is_mobile=(vname == "phone"), has_touch=(vname == "phone"))
            ctx.add_init_script("try{sessionStorage.setItem('halo-visited','1');localStorage.setItem('halo-motion','full')}catch(e){}")
            for pg in PAGES:
                page = ctx.new_page()
                errs = []
                page.on("console", lambda m, e=errs: m.type == "error" and e.append(m.text[:200]))
                page.on("pageerror", lambda ex, e=errs: e.append("PAGEERROR " + str(ex)[:200]))
                page.on("requestfailed", lambda r, e=errs: e.append("REQFAIL " + r.url[:120]))
                page.goto(BASE + pg, wait_until="networkidle")
                page.wait_for_timeout(2500)
                checks = page.evaluate(CHECK_JS)
                # scroll end to end in steps, re-checking overflow on the way
                H = page.evaluate("document.documentElement.scrollHeight")
                worst = checks["overflow"]
                y = 0
                while y < H:
                    page.evaluate(f"HALO.lenis ? HALO.lenis.scrollTo({y}, {{immediate: true}}) : scrollTo(0, {y})")
                    page.wait_for_timeout(120)
                    worst = max(worst, page.evaluate("document.documentElement.scrollWidth - innerWidth"))
                    y += vp["height"] * 0.8
                    H = page.evaluate("document.documentElement.scrollHeight")
                page.wait_for_timeout(600)
                # keyboard: first few tab stops are visible & named
                page.evaluate("HALO.lenis ? HALO.lenis.scrollTo(0,{immediate:true}) : scrollTo(0,0)")
                tabs = []
                for _ in range(6):
                    page.keyboard.press("Tab")
                    tabs.append(page.evaluate("(() => { const a = document.activeElement; return a ? (a.getAttribute('aria-label') || a.textContent || a.tagName).trim().slice(0, 30) : '' })()"))
                report[f"{vname}:{pg}"] = dict(errors=errs, overflow_max=worst, offscreen=checks["offscreen"], unnamed=checks["unnamed"],
                                              dead_anchors=checks["anchors"], links=checks["links"], tab_order=tabs, height=H)
                page.close()
            ctx.close()
        b.close()
    # link targets exist
    links = set(l for r in report.values() for l in r["links"])
    dead = []
    for l in links:
        try: urllib.request.urlopen(BASE.rstrip("/") + l).read(1)
        except Exception as ex: dead.append(f"{l}: {ex}")
    print(json.dumps(report, indent=1))
    print("DEAD LINKS:", dead)

main()
