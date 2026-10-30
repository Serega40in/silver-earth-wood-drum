import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

function canvasTex(draw: (g: CanvasRenderingContext2D, s: number) => void, size: number) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext("2d");
  if (!g) throw new Error("canvas");
  draw(g, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export function plankTexture() {
  const tex = canvasTex((g, s) => {
    g.fillStyle = "#c4894c";
    g.fillRect(0, 0, s, s);
    const cols = 6;
    for (let i = 0; i < cols; i++) {
      const x = (i * s) / cols;
      g.fillStyle = i % 2 === 0 ? "rgba(255,220,170,0.16)" : "rgba(90,48,18,0.14)";
      g.fillRect(x, 0, s / cols, s);
      g.strokeStyle = "rgba(70,36,12,0.45)";
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(x + 1, 0);
      g.lineTo(x + 1, s);
      g.stroke();
      g.strokeStyle = "rgba(255,236,200,0.18)";
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(x + s / cols / 2, 0);
      g.bezierCurveTo(x + 20, s * 0.3, x + s / cols - 10, s * 0.6, x + s / cols / 2, s);
      g.stroke();
    }
  }, 256);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function faceTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 640;
  const g = canvas.getContext("2d");
  if (!g) throw new Error("canvas");
  g.fillStyle = "#d39a58";
  g.fillRect(0, 0, 512, 640);
  for (let i = 0; i < 7; i++) {
    const x = ((i + 0.5) * 512) / 7;
    g.strokeStyle = "rgba(92,48,16,0.38)";
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x + (i % 2 === 0 ? 6 : -8), 640);
    g.stroke();
    g.strokeStyle = "rgba(255,228,190,0.2)";
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(x - 16, 12);
    g.bezierCurveTo(x - 4, 180, x + 18, 380, x - 10, 620);
    g.stroke();
  }
  g.fillStyle = "rgba(232, 112, 104, 0.62)";
  g.beginPath();
  g.ellipse(138, 318, 52, 30, 0, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.ellipse(374, 318, 52, 30, 0, 0, Math.PI * 2);
  g.fill();
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export function checkerTexture() {
  return canvasTex((g, s) => {
    const n = 8;
    const cell = s / n;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const amber = (x + y) % 2 === 0;
        g.fillStyle = amber ? "#e39a3a" : "#1b5a3c";
        g.fillRect(x * cell, y * cell, cell + 1, cell + 1);
        g.fillStyle = amber ? "rgba(255,236,190,0.18)" : "rgba(255,255,255,0.05)";
        g.fillRect(x * cell, y * cell, cell, cell * 0.18);
        g.fillStyle = "rgba(0,0,0,0.12)";
        g.fillRect(x * cell, y * cell + cell - 4, cell, 4);
      }
    }
  }, 512);
}

export function deckTexture() {
  const tex = canvasTex((g, s) => {
    g.fillStyle = "#a8743e";
    g.fillRect(0, 0, s, s);
    g.strokeStyle = "rgba(70,38,14,0.35)";
    g.lineWidth = 3;
    for (let i = 0; i < 18; i++) {
      const x = ((i + 0.5) * s) / 18;
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, s);
      g.stroke();
    }
    g.strokeStyle = "rgba(246,234,214,0.55)";
    g.lineWidth = 6;
    for (let i = 0; i <= 4; i++) {
      const p = (i / 4) * s;
      g.beginPath();
      g.moveTo(p, 0);
      g.lineTo(p, s);
      g.stroke();
      g.beginPath();
      g.moveTo(0, p);
      g.lineTo(s, p);
      g.stroke();
    }
  }, 512);
  tex.anisotropy = 8;
  return tex;
}

function starCanvas() {
  return canvasTex((g, s) => {
    g.clearRect(0, 0, s, s);
    g.translate(s / 2, s / 2);
    g.fillStyle = "#fff4d2";
    g.beginPath();
    for (let i = 0; i < 8; i++) {
      const r = i % 2 === 0 ? s * 0.46 : s * 0.12;
      const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
      g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    g.closePath();
    g.fill();
  }, 128);
}

function blobCanvas() {
  return canvasTex((g, s) => {
    const grd = g.createRadialGradient(s / 2, s / 2, 4, s / 2, s / 2, s / 2);
    grd.addColorStop(0, "rgba(0,0,0,0.45)");
    grd.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, s, s);
  }, 128);
}

function coinCanvas() {
  return canvasTex((g, s) => {
    g.fillStyle = "#f0b429";
    g.beginPath();
    g.arc(s / 2, s / 2, s * 0.48, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = "#a86a12";
    g.lineWidth = s * 0.06;
    g.stroke();
    g.fillStyle = "#fff1c2";
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? s * 0.22 : s * 0.09;
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      g.lineTo(s / 2 + Math.cos(a) * r, s / 2 + Math.sin(a) * r);
    }
    g.closePath();
    g.fill();
  }, 128);
}

export type Studio = {
  env: THREE.Texture;
  green: THREE.MeshPhysicalMaterial;
  wood: THREE.MeshPhysicalMaterial;
  face: THREE.MeshPhysicalMaterial;
  woodDark: THREE.MeshPhysicalMaterial;
  black: THREE.MeshPhysicalMaterial;
  silver: THREE.MeshPhysicalMaterial;
  glove: THREE.MeshPhysicalMaterial;
  sock: THREE.MeshPhysicalMaterial;
  gold: THREE.MeshPhysicalMaterial;
  clay: THREE.MeshPhysicalMaterial;
  cream: THREE.MeshPhysicalMaterial;
  blush: THREE.MeshPhysicalMaterial;
  glass: THREE.MeshPhysicalMaterial;
  eyeWhite: THREE.MeshPhysicalMaterial;
  iris: THREE.MeshPhysicalMaterial;
  pupil: THREE.MeshBasicMaterial;
  highlight: THREE.MeshBasicMaterial;
  flameMats: THREE.MeshBasicMaterial[];
  checker: THREE.MeshPhysicalMaterial;
  deck: THREE.MeshPhysicalMaterial;
  ground: THREE.MeshStandardMaterial;
  runway: THREE.MeshPhysicalMaterial;
  blob: THREE.MeshBasicMaterial;
  starMat: THREE.SpriteMaterial;
  coinMat: THREE.MeshPhysicalMaterial;
  ghostOk: THREE.MeshStandardMaterial;
  ghostBad: THREE.MeshStandardMaterial;
  dispose: () => void;
};

function phys(params: THREE.MeshPhysicalMaterialParameters) {
  return new THREE.MeshPhysicalMaterial(params);
}

export function createStudio(renderer: THREE.WebGLRenderer): Studio {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  const plank = plankTexture();
  const face = faceTexture();
  const checker = checkerTexture();
  const deck = deckTexture();
  const coinMap = coinCanvas();

  const flameMats = [0xfff3b0, 0xffb03a, 0xff6a1f].map(
    (color) =>
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.92,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
  );

  const studio: Studio = {
    env,
    green: phys({
      color: 0x1c5a38,
      roughness: 0.32,
      metalness: 0.04,
      clearcoat: 0.72,
      clearcoatRoughness: 0.22,
    }),
    wood: phys({
      map: plank,
      roughness: 0.48,
      metalness: 0.02,
      clearcoat: 0.28,
      clearcoatRoughness: 0.4,
    }),
    face: phys({
      map: face,
      roughness: 0.42,
      clearcoat: 0.34,
      clearcoatRoughness: 0.3,
    }),
    woodDark: phys({
      color: 0x8d5a30,
      map: plank,
      roughness: 0.5,
      clearcoat: 0.2,
    }),
    black: phys({
      color: 0x161616,
      roughness: 0.28,
      metalness: 0.45,
      clearcoat: 0.95,
      clearcoatRoughness: 0.18,
    }),
    silver: phys({
      color: 0xd5d8e2,
      roughness: 0.18,
      metalness: 0.92,
      clearcoat: 1,
      clearcoatRoughness: 0.12,
      emissive: 0x222433,
      emissiveIntensity: 0.18,
    }),
    glove: phys({ color: 0xf7f3ea, roughness: 0.42, clearcoat: 0.35 }),
    sock: phys({ color: 0xf3efe6, roughness: 0.62 }),
    gold: phys({
      color: 0xf0b429,
      roughness: 0.22,
      metalness: 0.82,
      clearcoat: 0.65,
      emissive: 0x5a3a08,
      emissiveIntensity: 0.18,
    }),
    clay: phys({ color: 0xc46a45, roughness: 0.45, clearcoat: 0.3 }),
    cream: phys({ color: 0xf6ead6, roughness: 0.4, clearcoat: 0.25 }),
    blush: phys({
      color: 0xe88980,
      roughness: 0.55,
      transparent: true,
      opacity: 0.85,
    }),
    glass: phys({
      color: 0xd5e7f2,
      roughness: 0.05,
      metalness: 0.05,
      transmission: 0,
      transparent: true,
      opacity: 0.28,
      clearcoat: 1,
      depthWrite: false,
    }),
    eyeWhite: phys({ color: 0xfffaf4, roughness: 0.18, clearcoat: 0.8 }),
    iris: phys({
      color: 0xf0a024,
      roughness: 0.2,
      clearcoat: 0.9,
      emissive: 0x7a3e00,
      emissiveIntensity: 0.25,
    }),
    pupil: new THREE.MeshBasicMaterial({ color: 0x1a120c }),
    highlight: new THREE.MeshBasicMaterial({ color: 0xffffff }),
    flameMats,
    checker: phys({
      map: checker,
      roughness: 0.28,
      metalness: 0.08,
      clearcoat: 0.55,
      clearcoatRoughness: 0.25,
    }),
    deck: phys({
      map: deck,
      roughness: 0.42,
      clearcoat: 0.28,
    }),
    ground: new THREE.MeshStandardMaterial({ color: 0x1a120e, roughness: 0.92, metalness: 0 }),
    runway: phys({
      map: plank,
      roughness: 0.4,
      clearcoat: 0.22,
    }),
    blob: new THREE.MeshBasicMaterial({
      map: blobCanvas(),
      transparent: true,
      depthWrite: false,
    }),
    starMat: new THREE.SpriteMaterial({
      map: starCanvas(),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      color: 0xffe6b0,
    }),
    coinMat: phys({
      map: coinMap,
      color: 0xffe09a,
      roughness: 0.18,
      metalness: 0.78,
      clearcoat: 0.8,
      emissive: 0x8a5a10,
      emissiveIntensity: 0.28,
      emissiveMap: coinMap,
    }),
    ghostOk: new THREE.MeshStandardMaterial({
      color: 0x8dcaa8,
      transparent: true,
      opacity: 0.42,
      roughness: 0.4,
      depthWrite: false,
    }),
    ghostBad: new THREE.MeshStandardMaterial({
      color: 0xe07a4a,
      transparent: true,
      opacity: 0.4,
      roughness: 0.4,
      depthWrite: false,
    }),
    dispose() {
      env.dispose();
      const mats = [
        studio.green,
        studio.wood,
        studio.face,
        studio.woodDark,
        studio.black,
        studio.silver,
        studio.glove,
        studio.sock,
        studio.gold,
        studio.clay,
        studio.cream,
        studio.blush,
        studio.glass,
        studio.eyeWhite,
        studio.iris,
        studio.pupil,
        studio.highlight,
        ...studio.flameMats,
        studio.checker,
        studio.deck,
        studio.ground,
        studio.runway,
        studio.blob,
        studio.starMat,
        studio.coinMat,
        studio.ghostOk,
        studio.ghostBad,
      ];
      for (const mat of mats) {
        const maps = mat as THREE.MeshStandardMaterial;
        maps.map?.dispose();
        maps.emissiveMap?.dispose();
        mat.dispose();
      }
    },
  };
  return studio;
}
