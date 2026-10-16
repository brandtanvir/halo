// HALO stage — one fixed WebGL canvas behind every page.
// Draw order: sky → (glyph sun, orb when "behind") → mountains → front objects.
// Everything is driven by numbers on `stage.state`, so GSAP can tween/scrub any of it.
import * as THREE from 'three';

const NOISE = /* glsl */`
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float hash1(float n){ return fract(sin(n * 91.345) * 47453.5453); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
float hash3(vec3 p){ return fract(sin(dot(p, vec3(17.1, 113.7, 271.9))) * 43758.5453); }
float noise3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  float a = mix(mix(hash3(i), hash3(i+vec3(1,0,0)), f.x), mix(hash3(i+vec3(0,1,0)), hash3(i+vec3(1,1,0)), f.x), f.y);
  float b = mix(mix(hash3(i+vec3(0,0,1)), hash3(i+vec3(1,0,1)), f.x), mix(hash3(i+vec3(0,1,1)), hash3(i+vec3(1,1,1)), f.x), f.y);
  return mix(a, b, f.z); }
float fbm3(vec3 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ v += a*noise3(p); p *= 2.03; a *= 0.5; } return v; }
`;

const QUAD_VS = /* glsl */`
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const SKY_FS = /* glsl */`
precision highp float;
varying vec2 vUv;
uniform vec2 uRes; uniform float uTime;
uniform vec2 uLight; uniform float uLightI, uLightSize, uRays, uFog, uDark, uAccentI;
uniform vec3 uAccent;
${NOISE}
void main(){
  float asp = uRes.x / uRes.y;
  vec2 p = vUv - uLight; p.x *= asp;
  float d = length(p);
  float s = uLightSize;
  float glow = exp(-(d*d) / (s*s));
  float wide = exp(-d * 1.6 / s);
  float core = exp(-(d*d) / (s*s*0.025));
  vec2 dir = d > 0.0 ? p / d : vec2(0.0, 1.0);
  float rn = noise(dir * 3.0 + vec2(uTime*0.03, 0.0)) * 0.6 + noise(dir * 8.0 - vec2(0.0, uTime*0.02)) * 0.4;
  float rays = pow(rn, 2.2) * exp(-d * 1.3) * uRays;
  vec3 base = mix(vec3(0.010, 0.011, 0.014), vec3(0.045, 0.048, 0.056), smoothstep(0.0, 1.0, vUv.y));
  vec3 lc = vec3(0.80, 0.83, 0.90);
  vec3 col = base + lc * (glow*0.40 + wide*0.10 + core*0.55 + rays*0.32) * uLightI;
  col = mix(col, vec3(0.42, 0.44, 0.49) * (0.5 + 0.7*glow), uFog);
  col += uAccent * uAccentI * (glow*0.55 + core*0.25);
  vec2 v = vUv - 0.5; v.x *= 0.8;
  col *= 1.0 - 0.75 * dot(v, v);
  col *= (1.0 - uDark);
  col += (hash(gl_FragCoord.xy + fract(uTime)) - 0.5) * (2.5/255.0);
  gl_FragColor = vec4(col, 1.0);
}
`;

const MTN_FS = /* glsl */`
precision highp float;
varying vec2 vUv;
uniform vec2 uRes; uniform float uTime;
uniform vec2 uLight; uniform float uLightI, uFog, uPeak, uMtnY, uVis, uDark, uPeakX;
uniform vec2 uMouse;
${NOISE}
float n1(float x){ float i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f); return mix(hash1(i), hash1(i+1.0), f); }
int LOD = 5;
float ridgeN(float x, float seed, int oct){
  float v = 0.0, a = 0.5, fr = 1.0;
  for (int i = 0; i < 6; i++){
    if (i >= oct) break;
    float n = n1(x*fr + seed*17.13); n = 1.0 - abs(n*2.0 - 1.0); v += n*n*a; a *= 0.46; fr *= 2.13;
  }
  return v;
}
float ridge(float x, float seed){ return ridgeN(x, seed, LOD); }
float layerH(float X, int L){
  float h;
  if (L == 0){
    float r = 0.40 + (ridge(X*1.2, 1.0) - 0.35) * 0.30;
    float pk = 0.33 - abs(X - uPeakX*0.6) * 0.22 + (ridge(X*2.4, 4.0) - 0.4) * 0.06;
    h = mix(r, pk, uPeak);
  } else if (L == 1){
    float r = 0.27 + (ridge(X*0.95 + 3.0, 2.0) - 0.35) * 0.36;
    float pk = 0.52 - abs(X - uPeakX) * 0.95 + (ridge(X*3.1, 5.0) - 0.45) * 0.07;
    h = mix(r, pk, uPeak);
  } else {
    float r = 0.11 + (ridge(X*1.5 + 7.0, 3.0) - 0.35) * 0.22;
    float pk = 0.13 - abs(X + 0.15) * 0.30 + (ridge(X*2.0, 6.0) - 0.4) * 0.08;
    h = mix(r, pk, uPeak);
  }
  return h + uMtnY * (0.8 + 0.2*float(L));
}
void main(){
  if (uVis <= 0.001) discard;
  float asp = uRes.x / uRes.y;
  float aa = 1.6 / uRes.y;
  vec4 col = vec4(0.0);
  vec2 lp = vec2((uLight.x - 0.5) * asp, uLight.y);
  for (int L = 0; L < 3; L++){
    float par = 0.6 + 0.4*float(L);
    float X = (vUv.x - 0.5) * asp + uMouse.x * 0.012 * par;
    float h = layerH(X, L) + uMouse.y * 0.006 * par;
    float m = smoothstep(h + aa, h - aa, vUv.y);
    if (m <= 0.0) continue;
    float depth = max(h - vUv.y, 0.0);
    // light proximity to this ridge point
    float prox = exp(-length(vec2(X, h) - lp) * 2.2) * uLightI;
    // slope → lit faces
    float e = 0.02;
    LOD = 2;
    float s = (layerH(X + e, L) - layerH(X - e, L)) / (2.0*e);
    LOD = 5;
    float side = sign(lp.x - X + 0.0001);
    float face = clamp(-s * side * 0.6, 0.0, 1.0);
    vec3 baseC = L == 0 ? vec3(0.085, 0.09, 0.10) : (L == 1 ? vec3(0.03, 0.032, 0.038) : vec3(0.008, 0.009, 0.011));
    baseC = mix(baseC, vec3(0.30, 0.31, 0.34) * (L == 0 ? 1.0 : 0.45), uFog * (L == 0 ? 0.8 : 0.35));
    vec3 c = baseC;
    c += vec3(0.75, 0.78, 0.86) * face * prox * 0.22 * exp(-depth * 5.0) * (L == 2 ? 0.4 : 1.0);
    float rim = exp(-depth * uRes.y / 2.6) * prox * (L == 2 ? 0.55 : 1.0);
    c += vec3(0.95, 0.96, 1.0) * rim * 0.9;
    c *= 1.0 - 0.45 * smoothstep(0.0, 0.5, depth);  // darker toward the valley floor
    col.rgb = col.a > 0.0 ? mix(col.rgb, c, m) : c;
    col.a = max(col.a, m);
  }
  col.rgb *= (1.0 - uDark);
  col.a *= uVis;
  if (col.a <= 0.001) discard;
  gl_FragColor = col;
}
`;

const ORB_VS = /* glsl */`
varying vec3 vN; varying vec3 vP;
void main(){ vP = position; vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const ORB_FS = /* glsl */`
precision highp float;
varying vec3 vN; varying vec3 vP;
uniform float uTime, uMoon, uOpacity, uBehind, uSeed, uGlass;
uniform vec3 uL;
${NOISE}
void main(){
  vec3 n = normalize(vN);
  float ndv = clamp(n.z, 0.0, 1.0);
  float fres = pow(1.0 - ndv, 2.2);

  // ---- iris (glass orb with spiral fibres) — in view space so it always faces you
  vec2 q = n.xy; float r = length(q); float a = atan(q.y, q.x);
  float tw = a + r * 2.6 - uTime * 0.10;
  float f1 = sin(tw * 64.0 + 2.2 * noise(q * 14.0 + uTime * 0.05));
  float f2 = sin(tw * 23.0 - r * 9.0);
  float fib = 0.6 * smoothstep(0.0, 1.0, f1) + 0.4 * smoothstep(0.3, 1.0, f2);
  float ring = smoothstep(0.14, 0.36, r);
  float iris = mix(0.05, 0.86, fib) * ring * (0.35 + 0.65 * r);
  float tl = 0.30 + 0.95 * clamp(n.y * 0.65 + 0.45, 0.0, 1.0);
  vec3 irisC = vec3(iris * tl) * vec3(0.92, 0.94, 1.0);
  irisC *= 0.5 + 0.5 * smoothstep(-1.0, 0.5, n.y);
  irisC += vec3(0.78, 0.80, 0.88) * fres * 0.95 * uGlass;
  float spec = pow(max(dot(n, normalize(vec3(0.0, 0.78, 0.62))), 0.0), 90.0) * 1.6;
  irisC += spec * uGlass;

  // ---- moon (cratered, lit by uL; backlit corona when uBehind → 1)
  vec3 p = vP * 1.7 + uSeed;
  float m = fbm3(p * 1.4);
  float cn = noise3(p * 3.0);
  float cr = smoothstep(0.62, 0.78, cn) * 0.5 + smoothstep(0.7, 0.9, noise3(p * 7.0)) * 0.35;
  float alb = 0.5 + 0.34 * (m - 0.5) * 1.4 - 0.1 * cr + 0.06 * noise3(p * 16.0) + 0.04 * noise3(p * 32.0);
  alb *= mix(0.62, 1.0, smoothstep(0.38, 0.62, fbm3(p * 0.7 + 3.0)));
  float diff = smoothstep(-0.08, 1.0, dot(n, normalize(uL)));
  vec3 moonC = vec3(alb) * (0.035 + 1.15 * diff) * vec3(0.95, 0.96, 1.0);
  moonC += vec3(0.92, 0.94, 1.0) * pow(1.0 - ndv, 3.2) * uBehind * 1.8;

  vec3 col = mix(irisC, moonC, uMoon);
  gl_FragColor = vec4(col, uOpacity);
}
`;

const HALO_FS = /* glsl */`
precision highp float;
varying vec2 vUv;
uniform float uI, uTime;
${NOISE}
void main(){
  vec2 p = vUv - 0.5; float r = length(p) * 2.0;           // sphere edge sits at r = 0.5
  float a = atan(p.y, p.x);
  vec2 dir = normalize(p + 1e-5);
  float rays = 0.65 + 0.35 * noise(dir * 4.0 + uTime * 0.05);
  float corona = exp(-max(r - 0.5, 0.0) * 7.5) * smoothstep(0.44, 0.5, r);
  float wide = exp(-max(r - 0.5, 0.0) * 2.4) * 0.35;
  float v = (corona + wide) * rays * uI * (1.0 - smoothstep(0.62, 0.98, r));
  gl_FragColor = vec4(vec3(0.92, 0.94, 1.0) * v, 1.0);
}
`;
const HALO_VS = /* glsl */`
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;

const CUBE_VS = /* glsl */`
varying vec3 vWN; varying vec2 vUv;
void main(){ vUv = uv; vWN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const CUBE_FS = /* glsl */`
precision highp float;
varying vec3 vWN; varying vec2 vUv;
uniform float uOpacity; uniform vec3 uTint; uniform float uTintI;
void main(){
  vec3 n = normalize(vWN);
  vec3 L = normalize(vec3(0.25, 1.0, 0.35));
  float d = max(dot(n, L), 0.0);
  vec3 col = vec3(0.105, 0.11, 0.125) * (0.30 + 1.25 * d);
  float e = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
  col += vec3(0.55, 0.57, 0.62) * (1.0 - smoothstep(0.0, 0.014, e)) * (0.25 + 0.75 * d);
  col += pow(d, 10.0) * 0.06;
  col = mix(col, uTint * (0.4 + 0.8*d), uTintI);
  gl_FragColor = vec4(col, uOpacity);
}
`;

function noWebGL() {
  try {
    const c = document.createElement('canvas');
    return !(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { return true; }
}

export function defaultState() {
  return {
    lightX: 0.5, lightY: 1.06, lightI: 1, lightSize: 0.55, rays: 0.7, fog: 0, dark: 0,
    accentI: 0, accent: [0.18, 0.42, 1.0],
    peak: 0, peakX: 0, mtnY: 0, mtnVis: 1,
    orb: { vis: 1, x: 0, y: 0.08, s: 1, moon: 0, glass: 1, front: 0, spin: 1 },
    moons: { vis: 0, t: 0, behind: 0 },
    halo: 0,
    cube: { vis: 0, x: 0, y: 0, s: 1, rx: 0.5, ry: 0.6, rz: 0, tint: 0 },
    gear: { vis: 0, x: 0, y: 0, s: 1, burst: 0, tilt: 0.95, spin: 0 },
    glyph: { vis: 0, x: 0.18, y: -0.55, s: 1 },
    parallax: 1,
  };
}

export function createStage(canvas, opts = {}) {
  const state = defaultState();
  const mobile = window.innerWidth < 768;
  const calm = !!opts.calm;

  if (!canvas || noWebGL()) {
    const fb = document.createElement('div');
    fb.className = 'stage-fallback';
    canvas?.replaceWith(fb);
    const project = (x, y, s = 1) => ({ x: ((x + 1) / 2) * innerWidth, y: ((1 - y) / 2) * innerHeight, r: s * Math.min(innerHeight * 0.24, innerWidth * 0.37) });
    return { state, ready: Promise.resolve(), setGlyph() {}, project, moonLayout: [], fallback: true };
  }

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  const hq = /[?&]hq\b/.test(location.search);  // video capture: render at full device density
  const DPR_CAP = hq ? 3 : mobile ? 1.5 : (window.innerWidth < 1024 ? 1.75 : 2);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, DPR_CAP));
  renderer.setClearColor(0x060709, 1);
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0, 10);

  const res = new THREE.Vector2(1, 1);
  const shared = { uTime: { value: 0 }, uRes: { value: res } };

  // ---- sky
  const quad = new THREE.PlaneGeometry(2, 2);
  const skyU = {
    ...shared, uLight: { value: new THREE.Vector2(0.5, 1.06) }, uLightI: { value: 1 }, uLightSize: { value: 0.55 },
    uRays: { value: 0.7 }, uFog: { value: 0 }, uDark: { value: 0 }, uAccent: { value: new THREE.Vector3(...state.accent) }, uAccentI: { value: 0 },
  };
  const sky = new THREE.Mesh(quad, new THREE.ShaderMaterial({ vertexShader: QUAD_VS, fragmentShader: SKY_FS, uniforms: skyU, depthTest: false, depthWrite: false }));
  sky.frustumCulled = false; sky.renderOrder = 0;
  scene.add(sky);

  // ---- mountains
  const mtnU = {
    ...shared, uLight: skyU.uLight, uLightI: skyU.uLightI, uFog: skyU.uFog, uDark: skyU.uDark,
    uPeak: { value: 0 }, uPeakX: { value: 0 }, uMtnY: { value: 0 }, uVis: { value: 1 }, uMouse: { value: new THREE.Vector2() },
  };
  const mtn = new THREE.Mesh(quad, new THREE.ShaderMaterial({ vertexShader: QUAD_VS, fragmentShader: MTN_FS, uniforms: mtnU, transparent: true, depthTest: false, depthWrite: false }));
  mtn.frustumCulled = false; mtn.renderOrder = 20;
  scene.add(mtn);

  // ---- orb / moons
  const sphere = new THREE.SphereGeometry(1, mobile ? 72 : 128, mobile ? 48 : 96);
  const lightDir = { value: new THREE.Vector3(-0.4, 0.5, 0.8) };
  const behindU = { value: 0 };
  const orbMat = (seed, moon) => new THREE.ShaderMaterial({
    vertexShader: ORB_VS, fragmentShader: ORB_FS, transparent: true,
    uniforms: { uTime: shared.uTime, uMoon: { value: moon }, uOpacity: { value: 1 }, uBehind: behindU, uSeed: { value: seed }, uGlass: { value: 1 }, uL: lightDir },
  });
  const orb = new THREE.Mesh(sphere, orbMat(0.0, 0));
  scene.add(orb);

  const haloMat = new THREE.ShaderMaterial({
    vertexShader: HALO_VS, fragmentShader: HALO_FS, uniforms: { uI: { value: 0 }, uTime: shared.uTime },
    transparent: true, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false,
  });
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), haloMat);
  halo.renderOrder = 29;
  scene.add(halo);

  const MOONS = [
    // row (t=0): [x, y, s, vis]   diagonal (t=1): [x, y, s]
    { row: [0.58, 0.10, 0.62, 1], diag: [-0.40, 0.56, 0.24] },
    { row: [1.10, 0.14, 0.58, 1], diag: [-0.27, 0.36, 0.26] },
    { row: [1.6, 0.1, 0.5, 0], diag: [0.12, -0.18, 0.27] },
    { row: [1.8, 0.1, 0.5, 0], diag: [0.25, -0.38, 0.26] },
    { row: [2.0, 0.1, 0.5, 0], diag: [0.38, -0.58, 0.25] },
    { row: [2.2, 0.1, 0.5, 0], diag: [0.51, -0.78, 0.25] },
  ];
  const moonMeshes = MOONS.map((m, i) => {
    const mesh = new THREE.Mesh(sphere, orbMat(3.7 * (i + 1), 1));
    mesh.material.uniforms.uGlass.value = 0;
    mesh.renderOrder = 30;
    scene.add(mesh);
    return mesh;
  });

  // ---- cube
  const cube = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.ShaderMaterial({
    vertexShader: CUBE_VS, fragmentShader: CUBE_FS, transparent: true,
    uniforms: { uOpacity: { value: 1 }, uTint: { value: new THREE.Vector3(0.18, 0.42, 1.0) }, uTintI: { value: 0 } },
  }));
  cube.renderOrder = 30;
  scene.add(cube);

  // ---- gear (instanced radial bars)
  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  const dl = new THREE.DirectionalLight(0xffffff, 2.4); dl.position.set(2, 4, 5); scene.add(dl);
  const BARS = mobile ? 64 : 96;
  const gearMat = new THREE.MeshLambertMaterial({ color: 0x5e626b, transparent: true, opacity: 1 });
  const gearBars = new THREE.InstancedMesh(new THREE.BoxGeometry(0.06, 1, 0.16), gearMat, BARS);
  const gearDisk = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 0.92, 0.22, 96, 1), new THREE.MeshLambertMaterial({ color: 0x22252b, transparent: true, opacity: 1 }));
  gearDisk.rotation.x = Math.PI / 2;
  const gear = new THREE.Group();
  const gearSpin = new THREE.Group();
  gearSpin.add(gearBars, gearDisk);
  gear.add(gearSpin);
  gear.renderOrder = 30; gearBars.renderOrder = 30; gearDisk.renderOrder = 29;
  scene.add(gear);
  const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpV = new THREE.Vector3(), tmpS = new THREE.Vector3(), zAxis = new THREE.Vector3(0, 0, 1);
  let lastBurst = -1;
  function layoutGear(b) {
    if (Math.abs(b - lastBurst) < 0.002) return;
    lastBurst = b;
    for (let i = 0; i < BARS; i++) {
      const a = (i / BARS) * Math.PI * 2;
      const len = 0.26 + b * (0.9 + 0.5 * Math.sin(i * 1.7) * Math.sin(i * 0.37));
      const rad = 0.98 + len / 2 + b * 0.25;
      tmpQ.setFromAxisAngle(zAxis, a - Math.PI / 2);
      tmpV.set(Math.cos(a) * rad, Math.sin(a) * rad, 0);
      tmpS.set(1, len, 1);
      tmpM.compose(tmpV, tmpQ, tmpS);
      gearBars.setMatrixAt(i, tmpM);
    }
    gearBars.instanceMatrix.needsUpdate = true;
  }
  layoutGear(0);

  // ---- glyph sun (canvas texture, behind mountains)
  const gCanvas = document.createElement('canvas');
  gCanvas.width = gCanvas.height = 1024;
  const gTex = new THREE.CanvasTexture(gCanvas);
  gTex.colorSpace = THREE.LinearSRGBColorSpace;
  const glyph = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ map: gTex, transparent: true, depthTest: false, depthWrite: false, opacity: 0 }));
  glyph.renderOrder = 10;
  scene.add(glyph);
  function setGlyph(text = 'Hg', weight = 500) {
    const g = gCanvas.getContext('2d');
    g.clearRect(0, 0, 1024, 1024);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const size = text.length > 2 ? 420 : 640;
    g.font = `${weight} ${size}px Geist, system-ui, sans-serif`;
    g.fillStyle = 'rgba(255,255,255,0.55)'; g.shadowColor = 'rgba(255,255,255,0.9)'; g.shadowBlur = 80;
    g.fillText(text, 512, 540);
    g.shadowBlur = 0; g.fillStyle = '#f4f6fa';
    g.fillText(text, 512, 540);
    gTex.needsUpdate = true;
  }

  // ---- sizing
  let W = 1, H = 1, U = 1;
  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    H = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
    W = H * camera.aspect;
    U = Math.min(H * 0.48, W * 0.74) / 2;
    renderer.getDrawingBufferSize(res);
  }
  let rT;
  window.addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(resize, 80); });
  resize();

  // ---- pointer parallax
  const mouse = new THREE.Vector2(), mouseL = new THREE.Vector2();
  if (!calm) window.addEventListener('pointermove', e => { mouse.set((e.clientX / innerWidth) * 2 - 1, -((e.clientY / innerHeight) * 2 - 1)); }, { passive: true });

  const place = (mesh, x, y, s, par = 1) => {
    mesh.position.set(x * W / 2 + mouseL.x * 0.06 * par * state.parallax, y * H / 2 + mouseL.y * 0.04 * par * state.parallax, 0);
    mesh.scale.setScalar(Math.max(s * U, 1e-4));
  };
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => t * t * (3 - 2 * t);
  const vFront = new THREE.Vector3(-0.45, 0.5, 0.75).normalize(), vBack = new THREE.Vector3(0.0, 0.12, -1).normalize();

  const clock = new THREE.Clock();
  let time = 0;
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05);
    if (!calm) time += dt;
    shared.uTime.value = time;
    mouseL.lerp(mouse, 0.05);
    const S = state;

    skyU.uLight.value.set(S.lightX, S.lightY);
    skyU.uLightI.value = S.lightI; skyU.uLightSize.value = S.lightSize;
    skyU.uRays.value = mobile ? S.rays * 0.5 : S.rays; skyU.uFog.value = S.fog; skyU.uDark.value = S.dark;
    skyU.uAccentI.value = S.accentI;
    mtnU.uPeak.value = S.peak; mtnU.uPeakX.value = S.peakX; mtnU.uMtnY.value = S.mtnY; mtnU.uVis.value = S.mtnVis;
    mtnU.uMouse.value.copy(mouseL).multiplyScalar(S.parallax);

    // orb
    const o = S.orb;
    orb.visible = o.vis > 0.001;
    if (orb.visible) {
      place(orb, o.x, o.y, o.s, 0.6);
      orb.material.uniforms.uOpacity.value = o.vis;
      orb.material.uniforms.uMoon.value = o.moon;
      orb.material.uniforms.uGlass.value = o.glass;
      orb.renderOrder = o.front > 0.5 ? 30 : 15;
      orb.rotation.y += dt * 0.05 * o.spin;
      orb.rotation.x = mouseL.y * 0.15; orb.rotation.z = -mouseL.x * 0.06;
    }
    // moons
    const mn = S.moons;
    lightDir.value.copy(vFront).lerp(vBack, ease(Math.min(1, mn.behind))).normalize();
    behindU.value = mn.behind;
    const t = ease(Math.min(1, Math.max(0, mn.t)));
    moonMeshes.forEach((mesh, i) => {
      const M = MOONS[i];
      const vis = mn.vis * lerp(M.row[3], 1, t);
      mesh.visible = vis > 0.001;
      if (!mesh.visible) return;
      place(mesh, lerp(M.row[0], M.diag[0], t), lerp(M.row[1], M.diag[1], t), lerp(M.row[2], M.diag[2], t), 0.8 + i * 0.1);
      mesh.material.uniforms.uOpacity.value = vis;
      mesh.rotation.y += dt * 0.04;
    });
    // eclipse halo behind the orb
    const hI = S.halo * o.vis;
    halo.visible = hI > 0.001;
    if (halo.visible) { place(halo, o.x, o.y, o.s, 0.6); halo.position.z = -0.01; haloMat.uniforms.uI.value = hI; }

    // cube
    const c = S.cube;
    cube.visible = c.vis > 0.001;
    if (cube.visible) {
      place(cube, c.x, c.y, c.s * 1.05, 1);
      cube.rotation.set(c.rx + mouseL.y * 0.1, c.ry + mouseL.x * 0.15 + (calm ? 0 : time * 0.06), c.rz);
      cube.material.uniforms.uOpacity.value = c.vis;
      cube.material.uniforms.uTintI.value = c.tint;
    }
    // gear
    const g = S.gear;
    gear.visible = g.vis > 0.001;
    if (gear.visible) {
      layoutGear(g.burst);
      place(gear, g.x, g.y, g.s * 0.62, 0.5);
      gear.rotation.set(-g.tilt + mouseL.y * 0.08, mouseL.x * 0.1, 0);
      gearSpin.rotation.z = g.spin + (calm ? 0 : time * 0.05);
      gearMat.opacity = g.vis; gearDisk.material.opacity = g.vis;
    }
    // glyph
    const gl = S.glyph;
    glyph.visible = gl.vis > 0.001;
    if (glyph.visible) { place(glyph, gl.x, gl.y, gl.s * 1.25, 0.3); glyph.material.opacity = gl.vis; }

    renderer.render(scene, camera);
  });

  const ready = (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => setGlyph(opts.glyph || 'Hg'));
  // stage coords → CSS pixels (x,y in −1..1 of the viewport, s in orb units)
  const project = (x, y, s = 1) => ({
    x: ((x + 1) / 2) * innerWidth, y: ((1 - y) / 2) * innerHeight, r: (s * U * innerHeight) / H,
  });
  return { state, ready, setGlyph, renderer, project, moonLayout: MOONS, fallback: false };
}
