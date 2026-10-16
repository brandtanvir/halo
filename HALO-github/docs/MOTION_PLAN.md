# HALO: Scroll, Motion & Interaction Plan

## 1. Motion language (rules every scene follows)

| Rule | Value |
|---|---|
| Smooth scroll | Lenis, `lerp 0.085`, drives GSAP ScrollTrigger from one rAF loop |
| Primary ease | `expo.out` for entrances (0.9–1.4s), `power2.inOut` for scrubbed travel |
| Scrub | `scrub: 1` (1s catch-up), so the motion feels like it has weight, not like it's wired to the wheel |
| Text entrance | lines rise 110% from a mask plus a slight blur (8px→0), staggered 0.08s |
| "Light-up words" | big statements start at 18% opacity; each word brightens to 100% as scroll passes it |
| Chapter lists | the active item is at 100% opacity and 1.0 scale, the others at 22%; the description swaps with a 12px rise |
| Light | there is only ever one light source. It moves; objects respond (rim light, eclipse halo) |
| Palette | graphite and silver; electric blue `#2F6BFF` appears only inside product moments |
| Depth | WebGL scene in a fixed full-screen canvas *behind* the DOM; the DOM holds type and UI |

## 2. The persistent stage (one WebGL canvas, all pages)

Draw order (back → front): **sky** (gradient, spotlight, god rays, grain) → **behind-mountain objects**
(glyph sun, distant moons) → **mountains** (3 parallax ridges, computed in a shader, rim lit
by the light) → **front objects** (iris orb, moons, cube, gear).

Every property is a number on `stage.state`, so GSAP can tween or scrub any of them:
`lightX, lightY, lightI, lightSize, rays, peak (range→single peak), mtnY, mtnAmp,
orb{vis,x,y,s,moon}, moons{vis,t,behind}, cube{vis,y,rx,ry}, gear{vis,s,spin}, glyph{vis,y,s}`.

Pointer parallax: the orb, cube and mountains drift up to 1.5% toward the cursor (lerped).
On touch devices this follows gentle device tilt only if allowed; otherwise there's no drift.

## 3. Home: scene by scene

| # | Section (scroll length) | What happens as you scroll |
|---|---|---|
| 00 | **Preloader** (time-based) | The ring stroke draws 0→100% with a counter, the ring shrinks into the logo position, then the hero headline lines rise in |
| 01 | **Hero** (100vh) | Idle: the iris rotates, the orb breathes, H·A·L·O letters float, a spotlight shimmers. Scrolling out: the headline lifts and blurs out, the orb rises and grows |
| 02 | **Orbit** (pinned 180vh) | The orb's iris shader cross-fades into a cratered moon (`orb.moon 0→1`); two moons slide in from the right; labels SYSTEMS / ICONS / TYPE appear under them; the sky brightens to fog |
| 03 | **Studio** (pinned 220vh) | The app window starts at 55% scale with a 18° tilt and scrubs flat to full-screen; the palette columns stagger in, the curve path draws (stroke-dashoffset), a fake cursor slides to "Push"; at the end the window dims to black |
| 04 | **Eclipse** (pinned 220vh) | Moons line up on a diagonal (`moons.t`), the light slides *behind* the centre moon (`moons.behind 0→1`), so the moons go from lit to silhouettes with a corona; the headline lights up word by word |
| 05 | **01 Systems** (pinned 320vh) | The header label becomes "01 SYSTEMS"; a single peak rises with the light behind it. Three steps, each about a third of the scroll: **Tints & Shades** (dots grow from the primary; the curve card), **Transparency** (dots step their alpha over a checkerboard), **Gradient** (dots become linear/radial/conic). Clickable list and a draggable curve, live |
| 06 | **Vertical beat** (pinned 260vh) | The light narrows to a cone; the cube descends, slowly rotating, scrubbed; words light up; then **Columns** take over: 12 bars build left→right, 3 turn blue, counters tick; the slider (live) changes the column count |
| 07 | **02 Icons** (pinned 320vh) | **Keyline grid**: the keylines draw, then an icon draws itself stroke by stroke. **Stroke & corners**: the grid of icons, with stroke width scrubbed by scroll from 1→2.5 (also a live slider). **Search & copy**: the query types itself ("arrow"), the grid filters, "Copied" toasts |
| 08 | **03 Type** (pinned 360vh) | A giant "Hg" glyph sun rises from behind the mountain (`glyph.y`); the intro words light up. **Font builder**: a HALO Geometric specimen with weight/width scrubbed and live sliders. **Scale map**: the bars grow, the curve draws, a "16" base marker you can drag. **Pairing**: style rows swap |
| 09 | **Features** (pinned 200vh) | A gear of 96 radial bars rotates with the scroll; the tab underline slides from For Designers → For Developers at 50% scroll (also clickable); the cards flip up |
| 10 | **Export** (normal) | The gear scales into a radial burst; a word wheel cycles Figma → CSS → SVG → OTF; the plugin window floats up with parallax |
| 11 | **Pricing** (normal) | Cards rise in with a stagger; on hover, a spotlight follows the cursor inside the card and the border lights up |
| 12 | **Final CTA** (normal) | The orb returns to the centre (`orb.vis`, iris again); the headline masks in; the email field focuses with a ring pulse; submitting fills the ring 0→360° and shows "You're in orbit." |
| 13 | **Footer** | The HALO letters rise from the baseline when it enters the viewport |

## 4. Interaction details

- **Cursor**: an 8px white dot (instant) plus a 36px ring (lerped 0.15). Over a link the ring grows to 64px;
  over a `[data-magnetic]` element it pulls toward the element's center (strength 0.3) and the element
  follows the cursor by 25%. Over a drag handle it shows "DRAG". Hidden on touch.
- **Logo ring**: the arc length is the page scroll progress; clicking it scrolls to the top.
- **Chapter label**: when a chapter pins, the label text swaps (vertical slide).
- **Menu**: the dot expands into a full-screen dark panel (clip-path circle from the button);
  links are staggered from a mask; hovering a link previews its moon icon.
- **Page transition**: a click on an internal link closes a black circle (clip-path) around the cursor,
  then the next page opens from its centre. The preloader shows only on the first visit in a session.
- **Tour (▶)**: Lenis auto-scrolls the home page at a cinematic pace; any wheel or touch input cancels it.
- **Sound** (off by default): a WebAudio drone (two detuned sines → lowpass, an LFO on the gain); a soft
  tick on hover over interactive items; the step change in a chapter plays a 2-note chime. Bottom-right
  toggle with animated bars.
- **Reduced motion / "Calm"**: no Lenis, no pinning, no scrub; sections stack and fade in;
  the WebGL scene stays still (no idle animation, parallax off). Automatic from the OS setting,
  and you can switch it in the menu (remembered locally).

## 5. Responsive plan

| | Desktop ≥ 1024 | Tablet 768–1023 | Phone < 768 |
|---|---|---|---|
| Chapters | text left, visual right | same, tighter | visual on the top 52%, text below, list becomes 3 step pills |
| Pins | full lengths | full | about 75% of the length (shorter scroll) |
| WebGL | DPR ≤ 2 | DPR ≤ 1.75 | DPR ≤ 1.5, fewer gear bars, no god rays |
| Cursor | yes | pointer only | none (tap states instead) |
| Type | clamp scale | clamp | headline 40–56px |
| Gutters | 4vw | 32px | 16px, no horizontal scroll ever |

## 6. Performance budget
- Shaders only, no textures except one canvas-drawn glyph. Every scene is under 50k triangles.
- Render only when the tab is visible; DPR is capped; resize is debounced.
- No layout reads inside scroll callbacks (all GSAP transforms/opacity).
- Fonts: Geist / Geist Mono / Roboto Flex from Google Fonts with `display=swap`.
