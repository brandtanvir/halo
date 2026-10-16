# Video toolkit

How the HALO showreel and Instagram reel were made: the real site is driven in headless Chrome on a
virtual clock (exactly 1/60 s per frame, with CSS transitions pinned to the same clock), each frame is
captured, and the result is encoded with eased crossfades and the site's own generative score rendered offline.

Requirements: macOS, Google Chrome, Python 3 with `pip3 install --user playwright`, and Xcode command-line tools.

```bash
# from the repo root, serve the site
python3 -m http.server 4321
# in tools/video
swiftc -O encode.swift -o encode
python3 showreel.py            # → frames_showreel/<scene>/
python3 reel.py                # → frames_reel/<scene>/
python3 build.py frames_showreel s01_intro,s02_story,s03_systems,s04_grid,s05_icons,s06_type,s07_more,s08_systems_page,s09_icons_page,s10_fonts_page,s11_extras,s12_outro HALO-showreel.mp4 1920 1080 48 24000000
python3 build.py frames_reel r1_hook,r2_orbit,r3_color,r4_icons,r5_type,r6_eclipse,r7_tokens,r8_cta HALO-instagram-reel.mp4 1080 1920 30 20000000
```

`jumps.swift` / `vjumps.swift` check every frame for snaps, pops or hard cuts; `qa.py` checks every page for
console errors, overflow, unlabeled controls and dead links. Rendered frames and videos are git-ignored by size;
publish finished videos as GitHub Release assets.
