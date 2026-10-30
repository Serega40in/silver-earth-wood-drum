import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type { Studio } from "@/game/materials";
import { moduleInfo, type ModuleId, type Piece } from "@/game/types";

export type Plot = { id: number; x0: number; z0: number; n: number; cell: number };

export const PLOTS: Plot[] = [
  { id: 0, x0: -5.55, z0: -8.7, n: 4, cell: 1.16 },
  { id: 1, x0: 0.9, z0: -8.7, n: 4, cell: 1.16 },
];

const SAVE_KEY = "iskorka-v1";

export type Cell = {
  floor: boolean;
  piece: Piece;
  roof: boolean;
  chimney: boolean;
  flower: boolean;
  rot: number;
};

type SaveFile = {
  v: 1;
  coins: number;
  cells: { p: number; c: number; r: number; cell: Cell }[];
  celebrated: boolean[];
};

function emptyCell(): Cell {
  return { floor: false, piece: "none", roof: false, chimney: false, flower: false, rot: 0 };
}

export function cellCenter(plot: Plot, c: number, r: number) {
  return {
    x: plot.x0 + (c + 0.5) * plot.cell,
    z: plot.z0 + (r + 0.5) * plot.cell,
  };
}

export type Yard = {
  group: THREE.Group;
  ghost: THREE.Group;
  load: (coinsFallback: number) => number;
  save: (coins: number) => void;
  rebuild: () => void;
  hover: (x: number, z: number, moduleId: ModuleId, rot: number, coins: number) => void;
  hideGhost: () => void;
  place: (
    x: number,
    z: number,
    moduleId: ModuleId,
    rot: number,
    coins: number,
  ) => { ok: boolean; coins: number; reason: string; fanfare: boolean };
  collide: (x: number, z: number, radius: number) => { x: number; z: number };
  houseCount: () => number;
  tickFlames: (t: number) => void;
};

function solid(cell: Cell) {
  return cell.piece !== "none" || cell.roof;
}

export function createYard(studio: Studio): Yard {
  const grids: Cell[][][] = PLOTS.map((plot) =>
    Array.from({ length: plot.n }, () => Array.from({ length: plot.n }, () => emptyCell())),
  );
  let celebrated = [false, false];
  const group = new THREE.Group();
  const ghost = new THREE.Group();
  const flames: THREE.Object3D[] = [];
  const geos = {
    floor: new RoundedBoxGeometry(1.08, 0.16, 1.08, 2, 0.04),
    block: new RoundedBoxGeometry(1.02, 0.78, 1.02, 2, 0.05),
    roof: new THREE.ConeGeometry(0.84, 0.5, 4),
    chimney: new RoundedBoxGeometry(0.22, 0.36, 0.22, 2, 0.03),
    pot: new THREE.CylinderGeometry(0.1, 0.08, 0.14, 10),
    petal: new THREE.SphereGeometry(0.09, 10, 8),
    flame: new THREE.ConeGeometry(0.07, 0.18, 8),
    glass: new RoundedBoxGeometry(0.46, 0.36, 0.06, 2, 0.02),
    door: new RoundedBoxGeometry(0.4, 0.56, 0.06, 2, 0.02),
    knob: new THREE.SphereGeometry(0.04, 8, 8),
  };
  geos.roof.rotateY(Math.PI / 4);

  const deckMat = studio.deck;
  for (const plot of PLOTS) {
    const size = plot.n * plot.cell;
    const deck = new THREE.Mesh(new THREE.BoxGeometry(size, 0.1, size), deckMat);
    deck.position.set(plot.x0 + size / 2, 0.05, plot.z0 + size / 2);
    deck.receiveShadow = true;
    group.add(deck);
  }

  function at(x: number, z: number) {
    for (const plot of PLOTS) {
      const size = plot.n * plot.cell;
      if (x < plot.x0 || z < plot.z0 || x >= plot.x0 + size || z >= plot.z0 + size) continue;
      const c = Math.floor((x - plot.x0) / plot.cell);
      const r = Math.floor((z - plot.z0) / plot.cell);
      if (c < 0 || r < 0 || c >= plot.n || r >= plot.n) continue;
      return { plot, c, r, cell: grids[plot.id][r][c] };
    }
    return null;
  }

  function plotDone(id: number) {
    let n = 0;
    for (const row of grids[id]) {
      for (const cell of row) {
        if (cell.floor && cell.piece !== "none" && cell.roof) n++;
      }
    }
    return n >= 3;
  }

  function houseCount() {
    return PLOTS.filter((plot) => plotDone(plot.id)).length;
  }

  function clearBuilt() {
    for (let i = group.children.length - 1; i >= 0; i--) {
      const child = group.children[i];
      if (child.userData.built) group.remove(child);
    }
    flames.length = 0;
  }

  function addFlame(parent: THREE.Object3D, y: number, register: boolean) {
    studio.flameMats.forEach((mat, i) => {
      const mesh = new THREE.Mesh(geos.flame, mat);
      mesh.position.y = y + i * 0.08;
      mesh.userData.phase = i * 1.4;
      parent.add(mesh);
      if (register) flames.push(mesh);
    });
  }

  function flower(parent: THREE.Group, y: number) {
    const pot = new THREE.Mesh(geos.pot, studio.clay);
    pot.position.y = y;
    const leaf = new THREE.Mesh(geos.petal, studio.green);
    leaf.position.set(0, y + 0.12, 0);
    leaf.scale.set(0.7, 0.45, 0.7);
    const colors = [studio.gold, studio.cream, studio.clay];
    parent.add(pot, leaf);
    for (let i = 0; i < 3; i++) {
      const petal = new THREE.Mesh(geos.petal, colors[i]);
      const a = (i / 3) * Math.PI * 2;
      petal.position.set(Math.cos(a) * 0.1, y + 0.22, Math.sin(a) * 0.1);
      parent.add(petal);
    }
  }

  function previewGroup(id: ModuleId, rot: number) {
    const g = new THREE.Group();
    g.rotation.y = rot * (Math.PI / 2);
    if (id === "floor") {
      const mesh = new THREE.Mesh(geos.floor, studio.wood);
      mesh.position.y = 0.18;
      g.add(mesh);
    } else if (id === "wall" || id === "window" || id === "door") {
      const mesh = new THREE.Mesh(geos.block, id === "wall" ? studio.green : studio.wood);
      mesh.position.y = 0.64;
      g.add(mesh);
      if (id === "window") {
        const glass = new THREE.Mesh(geos.glass, studio.glass);
        glass.position.set(0, 0.68, 0.5);
        g.add(glass);
      }
      if (id === "door") {
        const door = new THREE.Mesh(geos.door, studio.woodDark);
        door.position.set(0, 0.52, 0.5);
        const knob = new THREE.Mesh(geos.knob, studio.gold);
        knob.position.set(0.1, 0.5, 0.56);
        g.add(door, knob);
      }
    } else if (id === "roof") {
      const mesh = new THREE.Mesh(geos.roof, studio.green);
      mesh.position.y = 1.2;
      g.add(mesh);
    } else if (id === "chimney") {
      const mesh = new THREE.Mesh(geos.chimney, studio.green);
      mesh.position.y = 1.5;
      g.add(mesh);
      addFlame(g, 1.72, false);
    } else if (id === "flower") {
      flower(g, 0.2);
    }
    return g;
  }

  function rebuild() {
    clearBuilt();
    for (const plot of PLOTS) {
      for (let r = 0; r < plot.n; r++) {
        for (let c = 0; c < plot.n; c++) {
          const cell = grids[plot.id][r][c];
          if (!cell.floor && cell.piece === "none" && !cell.roof && !cell.flower) continue;
          const { x, z } = cellCenter(plot, c, r);
          const g = new THREE.Group();
          g.position.set(x, 0.1, z);
          g.rotation.y = cell.rot * (Math.PI / 2);
          g.userData.built = true;
          if (cell.floor) {
            const mesh = new THREE.Mesh(geos.floor, studio.wood);
            mesh.position.y = 0.08;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            g.add(mesh);
          }
          if (cell.piece !== "none") {
            const mesh = new THREE.Mesh(geos.block, cell.piece === "wall" ? studio.green : studio.wood);
            mesh.position.y = 0.55;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            g.add(mesh);
            if (cell.piece === "window") {
              const glass = new THREE.Mesh(geos.glass, studio.glass);
              glass.position.set(0, 0.58, 0.5);
              g.add(glass);
            }
            if (cell.piece === "door") {
              const door = new THREE.Mesh(geos.door, studio.woodDark);
              door.position.set(0, 0.42, 0.5);
              const knob = new THREE.Mesh(geos.knob, studio.gold);
              knob.position.set(0.1, 0.4, 0.56);
              g.add(door, knob);
            }
          }
          if (cell.roof) {
            const mesh = new THREE.Mesh(geos.roof, studio.green);
            mesh.position.y = cell.piece === "none" ? 0.5 : 1.12;
            mesh.castShadow = true;
            g.add(mesh);
          }
          if (cell.chimney && cell.roof) {
            const mesh = new THREE.Mesh(geos.chimney, studio.black);
            mesh.position.set(0.18, cell.piece === "none" ? 0.78 : 1.42, -0.12);
            mesh.castShadow = true;
            g.add(mesh);
            addFlame(g, mesh.position.y + 0.26, true);
          }
          if (cell.flower) {
            const potGroup = new THREE.Group();
            potGroup.position.set(0, 0, 0.42);
            flower(potGroup, 0.12);
            g.add(potGroup);
          }
          group.add(g);
        }
      }
    }
  }

  function reasonFor(moduleId: ModuleId, cell: Cell, coins: number): string {
    if (moduleId === "erase") {
      if (cell.chimney || cell.flower || cell.roof || cell.piece !== "none" || cell.floor) return "";
      return "Тут пусто";
    }
    const cost = moduleInfo(moduleId).cost;
    if (coins < cost) return "Мало монеток";
    if (moduleId === "floor") return cell.floor ? "Пол уже есть" : "";
    if (!cell.floor && moduleId !== "flower") return "Сначала пол";
    if (moduleId === "flower") {
      if (!cell.floor) return "Сначала пол";
      return cell.flower ? "Цветы уже есть" : "";
    }
    if (moduleId === "wall" || moduleId === "window" || moduleId === "door") {
      if (cell.roof) return "Сначала сними крышу";
      return cell.piece !== "none" ? "Стена уже стоит" : "";
    }
    if (moduleId === "roof") {
      if (cell.piece === "none") return "Нужны стены";
      return cell.roof ? "Крыша уже есть" : "";
    }
    if (moduleId === "chimney") {
      if (!cell.roof) return "Нужна крыша";
      return cell.chimney ? "Труба уже есть" : "";
    }
    return "";
  }

  let ghostKey = "";

  function clearGhost() {
    ghostKey = "";
    while (ghost.children.length) ghost.remove(ghost.children[0]);
  }

  function hover(x: number, z: number, moduleId: ModuleId, rot: number, coins: number) {
    const hit = at(x, z);
    const why = hit ? reasonFor(moduleId, hit.cell, coins) : "aside";
    const key = hit ? `${hit.plot.id}:${hit.c}:${hit.r}:${moduleId}:${rot}:${why}` : "";
    if (key === ghostKey) return;
    ghostKey = key;
    while (ghost.children.length) ghost.remove(ghost.children[0]);
    if (!hit) return;
    const previewId = moduleId === "erase" ? (topModule(hit.cell) ?? "floor") : moduleId;
    const preview = previewGroup(previewId, rot);
    const { x: cx, z: cz } = cellCenter(hit.plot, hit.c, hit.r);
    preview.position.set(cx, 0.1, cz);
    preview.traverse((obj: THREE.Object3D) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.material = why ? studio.ghostBad : studio.ghostOk;
        mesh.castShadow = false;
        mesh.receiveShadow = false;
      }
    });
    ghost.add(preview);
  }

  function topModule(cell: Cell): ModuleId | null {
    if (cell.chimney) return "chimney";
    if (cell.flower) return "flower";
    if (cell.roof) return "roof";
    if (cell.piece !== "none") return cell.piece;
    if (cell.floor) return "floor";
    return null;
  }

  function place(x: number, z: number, moduleId: ModuleId, rot: number, coins: number) {
    const hit = at(x, z);
    if (!hit) return { ok: false, coins, reason: "Мимо площадки", fanfare: false };
    const why = reasonFor(moduleId, hit.cell, coins);
    if (why) return { ok: false, coins, reason: why, fanfare: false };
    let next = coins;
    const cell = hit.cell;
    if (moduleId === "erase") {
      const top = topModule(cell);
      if (!top) return { ok: false, coins, reason: "Тут пусто", fanfare: false };
      next += moduleInfo(top).cost;
      if (top === "chimney") cell.chimney = false;
      else if (top === "flower") cell.flower = false;
      else if (top === "roof") cell.roof = false;
      else if (top === "floor") cell.floor = false;
      else cell.piece = "none";
    } else {
      next -= moduleInfo(moduleId).cost;
      cell.rot = rot;
      if (moduleId === "floor") cell.floor = true;
      else if (moduleId === "flower") cell.flower = true;
      else if (moduleId === "roof") cell.roof = true;
      else if (moduleId === "chimney") cell.chimney = true;
      else if (moduleId === "wall" || moduleId === "window" || moduleId === "door") cell.piece = moduleId;
    }
    const done = plotDone(hit.plot.id);
    let fanfare = false;
    if (done && !celebrated[hit.plot.id]) {
      celebrated[hit.plot.id] = true;
      next += 8;
      fanfare = true;
    }
    if (!done) celebrated[hit.plot.id] = false;
    rebuild();
    return { ok: true, coins: next, reason: fanfare ? "Домик зажёгся!" : "Готово", fanfare };
  }

  function collide(x: number, z: number, radius: number) {
    let px = x;
    let pz = z;
    for (const plot of PLOTS) {
      for (let r = 0; r < plot.n; r++) {
        for (let c = 0; c < plot.n; c++) {
          if (!solid(grids[plot.id][r][c])) continue;
          const center = cellCenter(plot, c, r);
          const hx = plot.cell * 0.48 + radius;
          const hz = plot.cell * 0.48 + radius;
          const dx = px - center.x;
          const dz = pz - center.z;
          if (Math.abs(dx) < hx && Math.abs(dz) < hz) {
            const pushX = hx - Math.abs(dx);
            const pushZ = hz - Math.abs(dz);
            if (pushX < pushZ) px = center.x + Math.sign(dx || 1) * hx;
            else pz = center.z + Math.sign(dz || 1) * hz;
          }
        }
      }
    }
    return { x: px, z: pz };
  }

  function load(coinsFallback: number) {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return coinsFallback;
      const data = JSON.parse(raw) as SaveFile;
      if (data.v !== 1 || !Array.isArray(data.cells)) return coinsFallback;
      for (const item of data.cells) {
        if (!grids[item.p]?.[item.r]?.[item.c]) continue;
        grids[item.p][item.r][item.c] = { ...emptyCell(), ...item.cell };
      }
      if (Array.isArray(data.celebrated)) celebrated = [!!data.celebrated[0], !!data.celebrated[1]];
      rebuild();
      return typeof data.coins === "number" ? data.coins : coinsFallback;
    } catch {
      return coinsFallback;
    }
  }

  function save(coins: number) {
    const cells: SaveFile["cells"] = [];
    for (const plot of PLOTS) {
      for (let r = 0; r < plot.n; r++) {
        for (let c = 0; c < plot.n; c++) {
          const cell = grids[plot.id][r][c];
          if (!cell.floor && cell.piece === "none" && !cell.roof && !cell.flower && !cell.chimney) continue;
          cells.push({ p: plot.id, c, r, cell });
        }
      }
    }
    const data: SaveFile = { v: 1, coins, cells, celebrated };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch {
      /* ignore quota */
    }
  }

  function tickFlames(t: number) {
    for (const flame of flames) {
      const phase = (flame.userData.phase as number) || 0;
      const flick = 0.75 + Math.sin(t * 12 + phase) * 0.25;
      flame.scale.y = flick;
    }
  }

  return {
    group,
    ghost,
    load,
    save,
    rebuild,
    hover,
    hideGhost: clearGhost,
    place,
    collide,
    houseCount,
    tickFlames,
  };
}
