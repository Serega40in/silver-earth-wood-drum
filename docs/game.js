import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const canvas = document.getElementById("stage");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x140e0a);
scene.fog = new THREE.Fog(0x140e0a, 12, 28);

const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 80);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

// ---------- materials & textures ----------
function makeCanvasTex(draw, size = 256) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  draw(ctx, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

const plankTex = makeCanvasTex((ctx, s) => {
  ctx.fillStyle = "#6b3f24";
  ctx.fillRect(0, 0, s, s);
  for (let i = 0; i < 12; i++) {
    ctx.fillStyle = i % 2 ? "#7a4a2c" : "#5c361f";
    ctx.fillRect(0, (i * s) / 12, s, s / 12 - 1);
  }
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo((i * s) / 6, 0);
    ctx.lineTo((i * s) / 6, s);
    ctx.stroke();
  }
});
plankTex.wrapS = plankTex.wrapT = THREE.RepeatWrapping;

const faceTex = makeCanvasTex((ctx, s) => {
  const g = ctx.createRadialGradient(s * 0.5, s * 0.45, 4, s * 0.5, s * 0.5, s * 0.55);
  g.addColorStop(0, "#ffe8c8");
  g.addColorStop(1, "#e8b070");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  ctx.fillStyle = "#2a1810";
  ctx.beginPath();
  ctx.ellipse(s * 0.35, s * 0.42, 10, 14, 0, 0, Math.PI * 2);
  ctx.ellipse(s * 0.65, s * 0.42, 10, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff8f0";
  ctx.beginPath();
  ctx.arc(s * 0.33, s * 0.38, 3.5, 0, Math.PI * 2);
  ctx.arc(s * 0.63, s * 0.38, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#5a3020";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(s * 0.5, s * 0.62, 18, 0.15, Math.PI - 0.15);
  ctx.stroke();
});

const checkerTex = makeCanvasTex((ctx, s) => {
  const n = 8;
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      ctx.fillStyle = (x + y) % 2 ? "#3a2a1c" : "#c9a06a";
      ctx.fillRect((x * s) / n, (y * s) / n, s / n + 1, s / n + 1);
    }
});
checkerTex.wrapS = checkerTex.wrapT = THREE.RepeatWrapping;
checkerTex.repeat.set(6, 6);

const deckTex = makeCanvasTex((ctx, s) => {
  ctx.fillStyle = "#4a3424";
  ctx.fillRect(0, 0, s, s);
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = i % 2 ? "#5a4030" : "#3e2c1e";
    ctx.fillRect(0, (i * s) / 16, s, s / 16 - 1);
  }
});
deckTex.wrapS = deckTex.wrapT = THREE.RepeatWrapping;

const starTex = makeCanvasTex((ctx, s) => {
  ctx.clearRect(0, 0, s, s);
  ctx.fillStyle = "#fff6c8";
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = (i * 4 * Math.PI) / 5 - Math.PI / 2;
    const r = i % 2 === 0 ? s * 0.45 : s * 0.18;
    const x = s / 2 + Math.cos(a) * r;
    const y = s / 2 + Math.sin(a) * r;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
});

const coinTex = makeCanvasTex((ctx, s) => {
  const g = ctx.createRadialGradient(s * 0.35, s * 0.35, 2, s * 0.5, s * 0.5, s * 0.48);
  g.addColorStop(0, "#ffe9a0");
  g.addColorStop(0.6, "#e8b84a");
  g.addColorStop(1, "#a87820");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(s / 2, s / 2, s * 0.46, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#fff6c8";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(s / 2, s / 2, s * 0.32, 0, Math.PI * 2);
  ctx.stroke();
});

const matWood = new THREE.MeshStandardMaterial({ map: plankTex, roughness: 0.72, metalness: 0.05 });
const matFace = new THREE.MeshStandardMaterial({ map: faceTex, roughness: 0.45, metalness: 0.08 });
const matGold = new THREE.MeshStandardMaterial({ color: 0xe8b84a, roughness: 0.28, metalness: 0.85 });
const matCoat = new THREE.MeshPhysicalMaterial({
  color: 0x2a6b4a,
  roughness: 0.25,
  metalness: 0.35,
  clearcoat: 1,
  clearcoatRoughness: 0.15,
  sheen: 1,
  sheenRoughness: 0.4,
  sheenColor: new THREE.Color(0x8affc0),
});
const matFlame = new THREE.MeshStandardMaterial({
  color: 0xff6a20,
  emissive: 0xff3a00,
  emissiveIntensity: 1.4,
  roughness: 0.4,
  transparent: true,
  opacity: 0.92,
});
const matGlass = new THREE.MeshPhysicalMaterial({
  color: 0xa8d8ff,
  roughness: 0.05,
  metalness: 0.1,
  transmission: 0.7,
  thickness: 0.4,
  transparent: true,
  opacity: 0.85,
});
const matFloor = new THREE.MeshStandardMaterial({ map: checkerTex, roughness: 0.55, metalness: 0.1 });
const matDeck = new THREE.MeshStandardMaterial({ map: deckTex, roughness: 0.65, metalness: 0.05 });
const matCoin = new THREE.MeshStandardMaterial({
  map: coinTex,
  roughness: 0.25,
  metalness: 0.9,
  emissive: 0x442200,
  emissiveIntensity: 0.25,
});
const matGhost = new THREE.MeshStandardMaterial({
  color: 0x8affc0,
  transparent: true,
  opacity: 0.45,
  depthWrite: false,
  roughness: 0.4,
});

// ---------- lights ----------
const hemi = new THREE.HemisphereLight(0xffe8c8, 0x1a1008, 0.55);
scene.add(hemi);
const key = new THREE.SpotLight(0xffd8a0, 28, 30, 0.55, 0.35, 1.2);
key.position.set(3.5, 7.5, 4.5);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
key.shadow.bias = -0.0002;
scene.add(key);
scene.add(key.target);
const fill = new THREE.SpotLight(0xa8c8ff, 10, 24, 0.7, 0.4, 1.2);
fill.position.set(-4, 5, -2);
scene.add(fill);
const rim = new THREE.PointLight(0xff6a30, 6, 12);
rim.position.set(0, 3.2, -2.5);
scene.add(rim);

// ---------- stage ----------
const stage = new THREE.Group();
scene.add(stage);
const floor = new THREE.Mesh(new THREE.CircleGeometry(9, 64), matFloor);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
stage.add(floor);
const deck = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.6, 0.28, 48), matDeck);
deck.position.y = 0.14;
deck.receiveShadow = true;
deck.castShadow = true;
stage.add(deck);
const ring = new THREE.Mesh(
  new THREE.TorusGeometry(2.55, 0.06, 12, 64),
  new THREE.MeshStandardMaterial({ color: 0xe8b84a, roughness: 0.3, metalness: 0.8 })
);
ring.rotation.x = Math.PI / 2;
ring.position.y = 0.3;
stage.add(ring);

// soft curtain backdrop
const curtain = new THREE.Mesh(
  new THREE.PlaneGeometry(18, 8),
  new THREE.MeshStandardMaterial({ color: 0x2a1520, roughness: 0.9, side: THREE.DoubleSide })
);
curtain.position.set(0, 3.5, -6);
stage.add(curtain);

// ---------- character (birdhouse) ----------
class HelixCurve extends THREE.Curve {
  constructor(radius = 0.12, height = 0.55, turns = 4) {
    super();
    this.radius = radius;
    this.height = height;
    this.turns = turns;
  }
  getPoint(t, target = new THREE.Vector3()) {
    const a = t * Math.PI * 2 * this.turns;
    return target.set(Math.cos(a) * this.radius, t * this.height, Math.sin(a) * this.radius);
  }
}

function makeSpring(mat) {
  const curve = new HelixCurve(0.09, 0.5, 5);
  const geo = new THREE.TubeGeometry(curve, 48, 0.028, 6, false);
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  return m;
}

const hero = new THREE.Group();
hero.position.set(0, 0.28, 0);
scene.add(hero);

const body = new THREE.Mesh(new RoundedBoxGeometry(1.05, 1.15, 0.85, 4, 0.12), matCoat);
body.position.y = 1.05;
body.castShadow = true;
hero.add(body);

const roof = new THREE.Mesh(new THREE.ConeGeometry(0.72, 0.55, 4), matWood);
roof.position.y = 1.85;
roof.rotation.y = Math.PI / 4;
roof.castShadow = true;
hero.add(roof);

const flame = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.35, 8), matFlame);
flame.position.y = 2.25;
hero.add(flame);

const face = new THREE.Mesh(new THREE.CircleGeometry(0.32, 32), matFace);
face.position.set(0, 1.15, 0.44);
hero.add(face);

// glasses
const glassL = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.018, 8, 24), matGold);
glassL.position.set(-0.13, 1.2, 0.46);
const glassR = glassL.clone();
glassR.position.x = 0.13;
const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 0.02), matGold);
bridge.position.set(0, 1.2, 0.46);
hero.add(glassL, glassR, bridge);

// fedora
const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.45, 0.05, 32), matGold);
brim.position.y = 1.72;
const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.3, 0.22, 32), matGold);
crown.position.y = 1.85;
hero.add(brim, crown);

// arms
const armL = new THREE.Group();
armL.position.set(-0.6, 1.15, 0);
const armMeshL = new THREE.Mesh(new RoundedBoxGeometry(0.18, 0.55, 0.18, 3, 0.06), matCoat);
armMeshL.position.y = -0.2;
armMeshL.castShadow = true;
armL.add(armMeshL);
const armR = armL.clone();
armR.position.x = 0.6;
hero.add(armL, armR);

// spring legs
const legL = makeSpring(matGold);
legL.position.set(-0.22, 0.05, 0.05);
const legR = makeSpring(matGold);
legR.position.set(0.22, 0.05, 0.05);
hero.add(legL, legR);

const footL = new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.08, 0.3, 2, 0.04), matGold);
footL.position.set(-0.22, 0.04, 0.06);
const footR = footL.clone();
footR.position.x = 0.22;
hero.add(footL, footR);

// mouth for lip-sync (simple scale)
const mouth = new THREE.Mesh(
  new THREE.SphereGeometry(0.06, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
  new THREE.MeshStandardMaterial({ color: 0x5a2030, roughness: 0.5 })
);
mouth.position.set(0, 1.02, 0.45);
mouth.rotation.x = Math.PI;
hero.add(mouth);

// ---------- coins (instanced) ----------
const MAX_COINS = 24;
const coinGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.05, 24);
const coins = new THREE.InstancedMesh(coinGeo, matCoin, MAX_COINS);
coins.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
coins.castShadow = true;
scene.add(coins);
const coinDummy = new THREE.Object3D();
const coinAlive = new Array(MAX_COINS).fill(false);
const coinPos = Array.from({ length: MAX_COINS }, () => new THREE.Vector3());
const coinSpin = new Float32Array(MAX_COINS);

function spawnCoins(n = 12) {
  let placed = 0;
  for (let i = 0; i < MAX_COINS && placed < n; i++) {
    if (coinAlive[i]) continue;
    const a = Math.random() * Math.PI * 2;
    const r = 3.2 + Math.random() * 4.5;
    coinPos[i].set(Math.cos(a) * r, 0.35, Math.sin(a) * r);
    coinSpin[i] = Math.random() * Math.PI * 2;
    coinAlive[i] = true;
    placed++;
  }
  rebuildCoins();
}

function rebuildCoins() {
  let visible = 0;
  for (let i = 0; i < MAX_COINS; i++) {
    if (!coinAlive[i]) {
      coinDummy.scale.setScalar(0);
    } else {
      coinDummy.position.copy(coinPos[i]);
      coinDummy.rotation.set(Math.PI / 2, coinSpin[i], 0);
      coinDummy.scale.setScalar(1);
      visible++;
    }
    coinDummy.updateMatrix();
    coins.setMatrixAt(i, coinDummy.matrix);
  }
  coins.instanceMatrix.needsUpdate = true;
  coins.count = MAX_COINS;
  state.coinsOnField = visible;
}

// ---------- buildings ----------
const MODULES = [
  { id: "wall", label: "стена", cost: 2, color: 0xc9a06a },
  { id: "roof", label: "крыша", cost: 3, color: 0x8b4513 },
  { id: "door", label: "дверь", cost: 2, color: 0x5a3a22 },
  { id: "window", label: "окно", cost: 2, color: 0xa8d8ff },
  { id: "chimney", label: "труба", cost: 2, color: 0x6a4a3a },
  { id: "fence", label: "забор", cost: 1, color: 0xd4b48a },
  { id: "tree", label: "дерево", cost: 3, color: 0x3d6b4f },
  { id: "star", label: "звезда", cost: 4, color: 0xe8b84a },
];

const GRID = 1.1;
const gridMap = new Map();
const moduleGroup = new THREE.Group();
scene.add(moduleGroup);
const ghostGroup = new THREE.Group();
scene.add(ghostGroup);
let ghostKey = "";

function cellKey(ix, iz) {
  return `${ix},${iz}`;
}

function worldToCell(x, z) {
  return [Math.round(x / GRID), Math.round(z / GRID)];
}

function makeModuleMesh(id, color) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.15 });
  if (id === "wall") {
    const m = new THREE.Mesh(new RoundedBoxGeometry(1, 1, 0.22, 2, 0.06), mat);
    m.position.y = 0.5;
    m.castShadow = true;
    g.add(m);
  } else if (id === "roof") {
    const m = new THREE.Mesh(new THREE.ConeGeometry(0.75, 0.55, 4), mat);
    m.position.y = 0.9;
    m.rotation.y = Math.PI / 4;
    m.castShadow = true;
    g.add(m);
  } else if (id === "door") {
    const m = new THREE.Mesh(new RoundedBoxGeometry(0.45, 0.75, 0.12, 2, 0.04), mat);
    m.position.y = 0.38;
    g.add(m);
  } else if (id === "window") {
    const m = new THREE.Mesh(new RoundedBoxGeometry(0.4, 0.4, 0.1, 2, 0.04), matGlass);
    m.position.y = 0.55;
    g.add(m);
  } else if (id === "chimney") {
    const m = new THREE.Mesh(new RoundedBoxGeometry(0.28, 0.55, 0.28, 2, 0.04), mat);
    m.position.y = 0.9;
    g.add(m);
  } else if (id === "fence") {
    for (let i = -1; i <= 1; i++) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.45, 0.08), mat);
      p.position.set(i * 0.35, 0.22, 0);
      g.add(p);
    }
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 0.06), mat);
    bar.position.y = 0.32;
    g.add(bar);
  } else if (id === "tree") {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.5, 8), matWood);
    trunk.position.y = 0.25;
    const leaves = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 10), mat);
    leaves.position.y = 0.7;
    g.add(trunk, leaves);
  } else if (id === "star") {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.55), new THREE.MeshStandardMaterial({ map: starTex, transparent: true, side: THREE.DoubleSide, emissive: 0xffcc44, emissiveIntensity: 0.6 }));
    m.position.y = 0.9;
    g.add(m);
  }
  return g;
}

function placeModule(id, ix, iz, rot = 0) {
  const key = cellKey(ix, iz);
  if (gridMap.has(key)) return false;
  const mod = MODULES.find((m) => m.id === id);
  if (!mod || state.coins < mod.cost) return false;
  state.coins -= mod.cost;
  const mesh = makeModuleMesh(id, mod.color);
  mesh.position.set(ix * GRID, 0.28, iz * GRID);
  mesh.rotation.y = rot;
  mesh.userData = { id, ix, iz, rot };
  moduleGroup.add(mesh);
  gridMap.set(key, mesh);
  state.houses = Math.floor(gridMap.size / 4);
  sfxPlace();
  syncHud();
  return true;
}

function eraseAt(ix, iz) {
  const key = cellKey(ix, iz);
  const mesh = gridMap.get(key);
  if (!mesh) return;
  moduleGroup.remove(mesh);
  gridMap.delete(key);
  state.houses = Math.floor(gridMap.size / 4);
  syncHud();
}

function clearGhost() {
  while (ghostGroup.children.length) ghostGroup.remove(ghostGroup.children[0]);
  ghostKey = "";
}

function updateGhost() {
  if (state.mode !== "build" || !state.selected) {
    clearGhost();
    return;
  }
  const [ix, iz] = worldToCell(hero.position.x + Math.sin(hero.rotation.y) * 1.4, hero.position.z + Math.cos(hero.rotation.y) * 1.4);
  const key = `${state.selected}:${ix}:${iz}:${state.ghostRot}`;
  if (key === ghostKey) return;
  clearGhost();
  ghostKey = key;
  const mod = MODULES.find((m) => m.id === state.selected);
  if (!mod) return;
  const mesh = makeModuleMesh(state.selected, mod.color);
  mesh.traverse((o) => {
    if (o.isMesh) o.material = matGhost;
  });
  mesh.position.set(ix * GRID, 0.28, iz * GRID);
  mesh.rotation.y = state.ghostRot;
  ghostGroup.add(mesh);
}

// ---------- audio ----------
let audioCtx = null;
let masterGain = null;
let sfxBus = null;
let muted = false;

function ensureAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.55;
  masterGain.connect(audioCtx.destination);
  sfxBus = audioCtx.createGain();
  sfxBus.gain.value = 0.7;
  sfxBus.connect(masterGain);
}

function sfxCoin() {
  if (!audioCtx || muted) return;
  const t = audioCtx.currentTime;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = "triangle";
  o.frequency.setValueAtTime(880, t);
  o.frequency.exponentialRampToValueAtTime(1760, t + 0.08);
  g.gain.setValueAtTime(0.2, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
  o.connect(g);
  g.connect(sfxBus);
  o.start(t);
  o.stop(t + 0.16);
}

function sfxPlace() {
  if (!audioCtx || muted) return;
  const t = audioCtx.currentTime;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = "square";
  o.frequency.setValueAtTime(220, t);
  o.frequency.exponentialRampToValueAtTime(110, t + 0.1);
  g.gain.setValueAtTime(0.12, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
  o.connect(g);
  g.connect(sfxBus);
  o.start(t);
  o.stop(t + 0.13);
}

function sfxDeny() {
  if (!audioCtx || muted) return;
  const t = audioCtx.currentTime;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = "sawtooth";
  o.frequency.setValueAtTime(120, t);
  g.gain.setValueAtTime(0.1, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
  o.connect(g);
  g.connect(sfxBus);
  o.start(t);
  o.stop(t + 0.22);
}

function sfxFanfare() {
  if (!audioCtx || muted) return;
  const t = audioCtx.currentTime;
  [523, 659, 784, 1046].forEach((f, i) => {
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = "triangle";
    o.frequency.value = f;
    g.gain.setValueAtTime(0, t + i * 0.08);
    g.gain.linearRampToValueAtTime(0.15, t + i * 0.08 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.35);
    o.connect(g);
    g.connect(sfxBus);
    o.start(t + i * 0.08);
    o.stop(t + i * 0.08 + 0.4);
  });
}

const LYRICS = [
  ["Ис-", "кор-", "ка", "све-", "тит"],
  ["в", "но-", "чи", "как", "звёз-", "доч-", "ка"],
  ["Прыг-", "скок", "по", "сце-", "не"],
  ["и", "пес-", "ня", "льёт-", "ся"],
];
let lyricLine = 0;
let lyricSyl = 0;
let singCool = 0;

function singBurst() {
  if (!audioCtx || muted || singCool > 0) return;
  singCool = 0.42;
  const t = audioCtx.currentTime;
  const formants = [
    [700, 1200],
    [500, 1500],
    [800, 1100],
    [400, 1800],
  ];
  const [f1, f2] = formants[Math.floor(Math.random() * formants.length)];
  const base = 220 + Math.random() * 180;
  const o = audioCtx.createOscillator();
  o.type = "sawtooth";
  o.frequency.value = base;
  const f = audioCtx.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = f1;
  f.Q.value = 6;
  const fB = audioCtx.createBiquadFilter();
  fB.type = "bandpass";
  fB.frequency.value = f2;
  fB.Q.value = 4;
  const g = audioCtx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.12, t + 0.03);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
  o.connect(f);
  f.connect(fB);
  fB.connect(g);
  g.connect(masterGain);
  o.start(t);
  o.stop(t + 0.3);

  const line = LYRICS[lyricLine % LYRICS.length];
  const sylEl = document.getElementById("syl");
  const lineEl = document.getElementById("line");
  if (sylEl && lineEl) {
    sylEl.textContent = line[lyricSyl % line.length];
    lineEl.textContent = line.join("");
    lyricSyl++;
    if (lyricSyl >= line.length) {
      lyricSyl = 0;
      lyricLine++;
    }
  }
  mouth.scale.set(1, 1.6 + Math.random() * 0.8, 1);
}

// ---------- state & input ----------
const state = {
  mode: "dance",
  coins: 12,
  houses: 0,
  coinsOnField: 0,
  selected: "wall",
  ghostRot: 0,
  yaw: 0,
  speed: 0,
  bow: 0,
  started: false,
};

const keys = new Set();
const joy = { x: 0, y: 0, active: false };

window.addEventListener("keydown", (e) => {
  keys.add(e.code);
  if (e.code === "KeyM") {
    muted = !muted;
    if (masterGain) masterGain.gain.value = muted ? 0 : 0.55;
    const btn = document.getElementById("muteBtn");
    if (btn) btn.textContent = muted ? "♪̸" : "♪";
  }
  if (e.code === "Digit1" || e.code === "Digit2" || e.code === "Digit3" || e.code === "Digit4" || e.code === "Digit5" || e.code === "Digit6" || e.code === "Digit7" || e.code === "Digit8") {
    const idx = Number(e.code.replace("Digit", "")) - 1;
    if (MODULES[idx]) {
      state.selected = MODULES[idx].id;
      state.mode = "build";
      setModeUI();
    }
  }
  if (e.code === "KeyR") state.ghostRot = (state.ghostRot + Math.PI / 2) % (Math.PI * 2);
  if (e.code === "Space") {
    e.preventDefault();
    state.bow = 1;
  }
});
window.addEventListener("keyup", (e) => keys.delete(e.code));

// joystick
const joyEl = document.getElementById("joystick");
const knob = document.getElementById("knob");
function joyHandler(e) {
  if (!joyEl) return;
  const rect = joyEl.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const t = e.touches ? e.touches[0] : e;
  let dx = (t.clientX - cx) / (rect.width * 0.4);
  let dy = (t.clientY - cy) / (rect.height * 0.4);
  const len = Math.hypot(dx, dy) || 1;
  if (len > 1) {
    dx /= len;
    dy /= len;
  }
  joy.x = dx;
  joy.y = dy;
  joy.active = true;
  if (knob) {
    knob.style.transform = `translate(${dx * 28}px, ${dy * 28}px)`;
  }
}
function joyEnd() {
  joy.x = joy.y = 0;
  joy.active = false;
  if (knob) knob.style.transform = "";
}
if (joyEl) {
  joyEl.addEventListener("pointerdown", (e) => {
    joyEl.setPointerCapture(e.pointerId);
    joyHandler(e);
  });
  joyEl.addEventListener("pointermove", (e) => {
    if (joy.active) joyHandler(e);
  });
  joyEl.addEventListener("pointerup", joyEnd);
  joyEl.addEventListener("pointercancel", joyEnd);
}

// HUD
function syncHud() {
  const c = document.getElementById("coinCount");
  const h = document.getElementById("houseCount");
  if (c) c.textContent = String(state.coins);
  if (h) h.textContent = `${state.houses}/2`;
}

function setModeUI() {
  document.querySelectorAll(".mode").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.mode === state.mode);
  });
  const tray = document.getElementById("buildTray");
  if (tray) {
    tray.classList.toggle("hidden", state.mode !== "build");
    if (state.mode === "build" && !tray.children.length) {
      MODULES.forEach((m, i) => {
        const b = document.createElement("button");
        b.className = "build-btn" + (m.id === state.selected ? " active" : "");
        b.textContent = `${i + 1}`;
        b.title = `${m.label} (${m.cost})`;
        b.onclick = () => {
          state.selected = m.id;
          tray.querySelectorAll(".build-btn").forEach((x) => x.classList.remove("active"));
          b.classList.add("active");
        };
        tray.appendChild(b);
      });
    }
  }
}

document.querySelectorAll(".mode").forEach((btn) => {
  btn.addEventListener("click", () => {
    state.mode = btn.dataset.mode;
    setModeUI();
  });
});

document.getElementById("muteBtn")?.addEventListener("click", () => {
  muted = !muted;
  if (masterGain) masterGain.gain.value = muted ? 0 : 0.55;
  const btn = document.getElementById("muteBtn");
  if (btn) btn.textContent = muted ? "♪̸" : "♪";
});

document.getElementById("startBtn")?.addEventListener("click", () => {
  ensureAudio();
  if (audioCtx?.state === "suspended") audioCtx.resume();
  state.started = true;
  document.getElementById("startCard")?.classList.add("hidden");
  document.getElementById("hud")?.classList.remove("hidden");
  spawnCoins(12);
  sfxFanfare();
  setModeUI();
});

// ---------- camera & loop ----------
const camTarget = new THREE.Vector3();
const camPos = new THREE.Vector3(4.5, 3.2, 6.5);
camera.position.copy(camPos);

let last = performance.now();
const FIXED = 1 / 60;
let acc = 0;

function fixedUpdate(dt) {
  if (!state.started) return;

  // input
  let mx = 0;
  let mz = 0;
  if (keys.has("KeyW") || keys.has("ArrowUp")) mz -= 1;
  if (keys.has("KeyS") || keys.has("ArrowDown")) mz += 1;
  if (keys.has("KeyA") || keys.has("ArrowLeft")) mx -= 1;
  if (keys.has("KeyD") || keys.has("ArrowRight")) mx += 1;
  if (joy.active) {
    mx += joy.x;
    mz += joy.y;
  }
  const len = Math.hypot(mx, mz) || 1;
  mx /= len;
  mz /= len;

  if (state.mode === "dance") {
    state.yaw += dt * 0.6;
    hero.rotation.y = state.yaw;
    hero.position.x *= 0.92;
    hero.position.z *= 0.92;
    // bounce
    const bounce = Math.abs(Math.sin(performance.now() * 0.008)) * 0.12;
    hero.position.y = 0.28 + bounce;
    armL.rotation.z = Math.sin(performance.now() * 0.01) * 0.8;
    armR.rotation.z = -Math.sin(performance.now() * 0.01) * 0.8;
    legL.rotation.x = Math.sin(performance.now() * 0.012) * 0.3;
    legR.rotation.x = -Math.sin(performance.now() * 0.012) * 0.3;
    if (Math.random() < 0.02) singBurst();
  } else {
    // run / build
    if (mx !== 0 || mz !== 0) {
      const targetYaw = Math.atan2(mx, mz);
      let dy = targetYaw - hero.rotation.y;
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;
      hero.rotation.y += dy * Math.min(1, dt * 10);
      const sp = state.mode === "run" ? 4.2 : 2.6;
      hero.position.x += Math.sin(hero.rotation.y) * sp * dt;
      hero.position.z += Math.cos(hero.rotation.y) * sp * dt;
      // bounce walk
      hero.position.y = 0.28 + Math.abs(Math.sin(performance.now() * 0.015)) * 0.08;
      armL.rotation.z = Math.sin(performance.now() * 0.02) * 0.5;
      armR.rotation.z = -Math.sin(performance.now() * 0.02) * 0.5;
    } else {
      hero.position.y += (0.28 - hero.position.y) * 0.15;
    }
    // clamp to stage-ish area
    const r = Math.hypot(hero.position.x, hero.position.z);
    if (r > 8.2) {
      hero.position.x *= 8.2 / r;
      hero.position.z *= 8.2 / r;
    }
  }

  if (state.bow > 0) {
    state.bow -= dt * 1.8;
    body.rotation.x = Math.sin((1 - state.bow) * Math.PI) * 0.35;
  } else {
    body.rotation.x *= 0.85;
  }

  // flame flicker
  flame.scale.y = 0.85 + Math.sin(performance.now() * 0.02) * 0.2 + Math.random() * 0.08;
  flame.rotation.y += dt * 2;

  // mouth relax
  mouth.scale.y += (1 - mouth.scale.y) * 0.1;

  // coins spin & collect
  for (let i = 0; i < MAX_COINS; i++) {
    if (!coinAlive[i]) continue;
    coinSpin[i] += dt * 3;
    coinDummy.position.copy(coinPos[i]);
    coinDummy.position.y = 0.35 + Math.sin(performance.now() * 0.005 + i) * 0.08;
    coinDummy.rotation.set(Math.PI / 2, coinSpin[i], 0);
    coinDummy.scale.setScalar(1);
    coinDummy.updateMatrix();
    coins.setMatrixAt(i, coinDummy.matrix);
    const d = hero.position.distanceTo(coinPos[i]);
    if (d < 0.85) {
      coinAlive[i] = false;
      state.coins += 1;
      sfxCoin();
      syncHud();
    }
  }
  coins.instanceMatrix.needsUpdate = true;

  // respawn coins occasionally
  if (state.coinsOnField < 6 && Math.random() < 0.01) spawnCoins(3);

  // build place on click / E
  if (state.mode === "build" && (keys.has("KeyE") || keys.has("Enter"))) {
    keys.delete("KeyE");
    keys.delete("Enter");
    const [ix, iz] = worldToCell(hero.position.x + Math.sin(hero.rotation.y) * 1.4, hero.position.z + Math.cos(hero.rotation.y) * 1.4);
    if (!placeModule(state.selected, ix, iz, state.ghostRot)) sfxDeny();
  }

  updateGhost();
  singCool = Math.max(0, singCool - dt);

  // camera
  let dist = 6.8;
  let height = 2.7;
  let side = 2.15;
  let lookY = 0.45;
  if (state.mode === "run") {
    dist = 5.5;
    height = 2.4;
    side = 0.8;
    lookY = 0.9;
  } else if (state.mode === "build") {
    dist = 7.5;
    height = 4.2;
    side = 0;
    lookY = 0.5;
  }
  const yaw = hero.rotation.y;
  camTarget.set(hero.position.x, hero.position.y + lookY, hero.position.z);
  const desired = new THREE.Vector3(
    hero.position.x - Math.sin(yaw) * dist + Math.cos(yaw) * side,
    hero.position.y + height,
    hero.position.z - Math.cos(yaw) * dist - Math.sin(yaw) * side
  );
  camPos.lerp(desired, 1 - Math.pow(0.001, dt));
  camera.position.copy(camPos);
  camera.lookAt(camTarget);
  key.target.position.copy(hero.position);
}

function resize() {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (canvas.width !== w || canvas.height !== h) {
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
}

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  acc += dt;
  while (acc >= FIXED) {
    fixedUpdate(FIXED);
    acc -= FIXED;
  }
  resize();
  // subtle idle sway when not started
  if (!state.started) {
    hero.rotation.y = Math.sin(now * 0.0008) * 0.35;
    hero.position.y = 0.28 + Math.sin(now * 0.003) * 0.04;
    armL.rotation.z = Math.sin(now * 0.002) * 0.4;
    armR.rotation.z = -Math.sin(now * 0.002) * 0.4;
    flame.scale.y = 0.9 + Math.sin(now * 0.01) * 0.15;
    camPos.set(4.2 + Math.sin(now * 0.0005) * 0.3, 2.9, 6.2);
    camera.position.copy(camPos);
    camera.lookAt(0, 1.1, 0);
  }
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
syncHud();
