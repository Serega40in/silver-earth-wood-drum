import * as THREE from "three";
import { createCharacter } from "@/game/character";
import { createYard } from "@/game/buildings";
import { createStudio } from "@/game/materials";
import { getHud, patchHud } from "@/game/hud-store";
import {
  pollAudio,
  setMusicMuted,
  sfxCoin,
  sfxDeny,
  sfxFanfare,
  sfxPlace,
} from "@/game/audio";
import type { Mode } from "@/game/types";

declare global {
  interface Window {
    __controlsTest?: {
      getYaw: () => number;
      getSpeed: () => number;
      setKeys: (codes: string[]) => void;
      setSteer?: (v: number) => void;
    };
  }
}

const STEP = 1 / 60;
const COIN_SPOTS: [number, number][] = [
  [-1.6, 1.4],
  [0, 2.1],
  [1.6, 1.4],
  [-2.5, 0.2],
  [2.5, 0.2],
  [-1.2, -0.8],
  [1.2, -0.8],
  [0, -1.7],
  [-2.2, -1.6],
  [2.2, -1.6],
  [0, -2.8],
  [-1.3, -3.2],
  [1.3, -3.2],
  [0, 0.3],
  [-2.8, 2.4],
  [2.8, 2.4],
];

type Coin = {
  x: number;
  z: number;
  homeX: number;
  homeZ: number;
  phase: number;
  alive: boolean;
  pop: number;
  respawn: number;
};

type Spark = {
  sprite: THREE.Sprite;
  life: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
};

export type WorldHandle = {
  dispose: () => void;
  setJoy: (x: number, y: number) => void;
};

export function mountWorld(canvas: HTMLCanvasElement): WorldHandle {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
  } catch (err) {
    patchHud({
      ready: true,
      error: err instanceof Error ? err.message : "Не удалось включить 3D",
    });
    return { dispose() {}, setJoy() {} };
  }

  const studio = createStudio(renderer);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x140e0a);
  scene.fog = new THREE.Fog(0x140e0a, 10, 26);
  scene.environment = studio.env;
  scene.environmentIntensity = 0.72;

  const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 40);
  const camPos = new THREE.Vector3(1.4, 1.7, -3.6);
  camera.position.copy(camPos);

  const hemi = new THREE.HemisphereLight(0xffe4c4, 0x2a1c12, 0.72);
  scene.add(hemi);
  const fill = new THREE.DirectionalLight(0xfff1dc, 1.35);
  fill.position.set(-4, 6, 3);
  scene.add(fill);

  const key = new THREE.SpotLight(0xffc48a, 18, 28, 0.62, 0.55, 1);
  key.position.set(1.6, 8.2, -2.4);
  key.target.position.set(0, 1, 0.2);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.bias = -0.0006;
  key.shadow.camera.near = 2;
  key.shadow.camera.far = 20;
  scene.add(key, key.target);

  const warm = new THREE.SpotLight(0xffb15a, 10, 22, 0.5, 0.7, 1);
  warm.position.set(-3.2, 7.2, 2.4);
  warm.target.position.set(0, 1, 0);
  scene.add(warm, warm.target);

  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xffd7a8,
    transparent: true,
    opacity: 0.05,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  for (const light of [key, warm]) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(1.1, 4.2, 18, 1, true), beamMat);
    cone.position.copy(light.position);
    cone.position.y -= 2.1;
    const dir = light.target.position.clone().sub(cone.position).normalize();
    cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    scene.add(cone);
  }

  const ground = new THREE.Mesh(new THREE.CircleGeometry(18, 48), studio.ground);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.04;
  ground.receiveShadow = true;
  scene.add(ground);

  const stage = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.06, 6.4), studio.checker);
  stage.position.set(0, 0.02, 0.7);
  stage.receiveShadow = true;
  scene.add(stage);

  const runway = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.05, 3.2), studio.runway);
  runway.position.set(0, 0.02, -2.7);
  runway.receiveShadow = true;
  scene.add(runway);

  const yard = createYard(studio);
  scene.add(yard.group, yard.ghost);
  const savedCoins = yard.load(12);

  const character = createCharacter(studio);
  scene.add(character.root);
  const blob = new THREE.Mesh(new THREE.CircleGeometry(0.55, 20), studio.blob);
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.03;
  scene.add(blob);

  const starPositions: [number, number, number][] = [
    [-2.4, 3.5, 1.6],
    [1.8, 3.9, 2.1],
    [0.3, 4.3, -1.4],
    [-3.3, 3.3, -2.2],
    [3.1, 3.7, -0.6],
    [2.4, 4.2, 3.4],
    [-1.5, 3.8, 3.3],
  ];
  const stars: THREE.Sprite[] = [];
  for (const [x, y, z] of starPositions) {
    const sprite = new THREE.Sprite(studio.starMat);
    sprite.position.set(x, y, z);
    sprite.scale.setScalar(0.28 + Math.random() * 0.18);
    scene.add(sprite);
    stars.push(sprite);
  }

  const coins: Coin[] = COIN_SPOTS.map(([x, z], i) => ({
    x,
    z,
    homeX: x,
    homeZ: z,
    phase: i * 0.7,
    alive: true,
    pop: 0,
    respawn: 0,
  }));
  const coinMesh = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.22, 0.22, 0.06, 20),
    studio.coinMat,
    coins.length,
  );
  coinMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  coinMesh.frustumCulled = false;
  coinMesh.castShadow = false;
  scene.add(coinMesh);
  const dummy = new THREE.Object3D();

  const sparks: Spark[] = [];
  for (let i = 0; i < 18; i++) {
    const mat = studio.starMat.clone();
    mat.opacity = 0;
    const sprite = new THREE.Sprite(mat);
    sprite.visible = false;
    sprite.scale.setScalar(0.22);
    scene.add(sprite);
    sparks.push({ sprite, life: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 });
  }

  const keys = new Set<string>();
  let steerOverride: number | null = null;
  let joyX = 0;
  let joyY = 0;
  let yaw = 0;
  let speed = 0;
  const pos = new THREE.Vector3(0, 0, 0.35);
  let emote = 0;
  let seenEmote = getHud().emoteSeq;
  let combo = 0;
  let comboTimer = 0;
  let coinsCount = savedCoins;
  let movingBlend = 0;
  let shake = 0;
  let toastTimer: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;
  let singCool = 0;
  let lastLine = "";
  let lastSyl = "";
  let saveTimer: ReturnType<typeof setTimeout> | null = null;

  patchHud({
    ready: true,
    coins: coinsCount,
    houses: yard.houseCount(),
    error: "",
  });

  function queueSave() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => yard.save(coinsCount), 250);
  }

  function toast(text: string) {
    patchHud({ toast: text });
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => patchHud({ toast: "" }), 1400);
  }

  function burst(x: number, y: number, z: number, n: number, color: number) {
    let left = n;
    for (const spark of sparks) {
      if (left <= 0) break;
      if (spark.life > 0) continue;
      spark.life = 0.7 + Math.random() * 0.3;
      spark.x = x;
      spark.y = y;
      spark.z = z;
      spark.vx = (Math.random() - 0.5) * 1.6;
      spark.vy = 1.2 + Math.random() * 1.4;
      spark.vz = (Math.random() - 0.5) * 1.6;
      spark.sprite.visible = true;
      (spark.sprite.material as THREE.SpriteMaterial).color.setHex(color);
      left--;
    }
  }

  const desired = new THREE.Vector3();
  const look = new THREE.Vector3();
  const ndc = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hitPoint = new THREE.Vector3();
  let pointerX = 0;
  let pointerY = 0;
  let pointerOn = false;

  function aim(clientX: number, clientY: number) {
    const rect = canvas.getBoundingClientRect();
    ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(ndc, camera);
    return raycaster.ray.intersectPlane(groundPlane, hitPoint);
  }

  function onPointerMove(event: PointerEvent) {
    pointerX = event.clientX;
    pointerY = event.clientY;
    pointerOn = true;
  }
  function onPointerDown(event: PointerEvent) {
    pointerX = event.clientX;
    pointerY = event.clientY;
    pointerOn = true;
    downX = event.clientX;
    downY = event.clientY;
  }
  let downX = 0;
  let downY = 0;
  function onPointerUp(event: PointerEvent) {
    const hud = getHud();
    if (!hud.started || hud.mode !== "build") return;
    const dx = event.clientX - downX;
    const dy = event.clientY - downY;
    if (dx * dx + dy * dy > 100) return;
    if (!aim(event.clientX, event.clientY)) return;
    const result = yard.place(hitPoint.x, hitPoint.z, hud.module, hud.rot, coinsCount);
    if (!result.ok) {
      sfxDeny();
      toast(result.reason);
      return;
    }
    coinsCount = result.coins;
    shake = Math.max(shake, result.fanfare ? 0.18 : 0.06);
    if (result.fanfare) {
      sfxFanfare();
      burst(hitPoint.x, 1.4, hitPoint.z, 8, 0xf0b429);
    } else {
      sfxPlace();
    }
    patchHud({ coins: coinsCount, houses: yard.houseCount(), toast: result.fanfare ? result.reason : "" });
    if (result.fanfare) toast(result.reason);
    queueSave();
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.repeat) {
      keys.add(event.code);
      return;
    }
    keys.add(event.code);
    const hud = getHud();
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)) {
      event.preventDefault();
    }
    if (!hud.started) return;
    if (event.code === "Space") emote = 2.35;
    if (event.code === "KeyM") {
      const muted = !hud.muted;
      setMusicMuted(muted);
      patchHud({ muted });
    }
    if (event.code === "KeyR") patchHud({ rot: (hud.rot + 1) % 4 });
    if (event.code === "Digit1") patchHud({ module: "floor", mode: "build" });
    if (event.code === "Digit2") patchHud({ module: "wall", mode: "build" });
    if (event.code === "Digit3") patchHud({ module: "window", mode: "build" });
    if (event.code === "Digit4") patchHud({ module: "door", mode: "build" });
    if (event.code === "Digit5") patchHud({ module: "roof", mode: "build" });
    if (event.code === "Digit6") patchHud({ module: "chimney", mode: "build" });
    if (event.code === "Digit7") patchHud({ module: "flower", mode: "build" });
    if (event.code === "Digit8") patchHud({ module: "erase", mode: "build" });
  }
  function onKeyUp(event: KeyboardEvent) {
    keys.delete(event.code);
  }
  function onBlur() {
    keys.clear();
    joyX = 0;
    joyY = 0;
  }

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointerup", onPointerUp);

  function keySteer() {
    let steer = 0;
    if (keys.has("KeyA") || keys.has("ArrowLeft")) steer += 1;
    if (keys.has("KeyD") || keys.has("ArrowRight")) steer -= 1;
    return Math.max(-1, Math.min(1, steer));
  }
  function keyThrottle() {
    let throttle = 0;
    if (keys.has("KeyW") || keys.has("ArrowUp")) throttle += 1;
    if (keys.has("KeyS") || keys.has("ArrowDown")) throttle -= 1;
    return Math.max(-1, Math.min(1, throttle));
  }

  // Chase cam, yaw 0 faces world −Z.
  // A → steer +1 → yaw increases → nose left on the chase camera.
  window.__controlsTest = {
    getYaw: () => yaw,
    getSpeed: () => Math.abs(speed),
    setKeys: (codes) => {
      keys.clear();
      for (const code of codes) keys.add(code);
    },
    setSteer: (v) => {
      steerOverride = v;
    },
  };

  const timer = new THREE.Timer();
  timer.connect(document);
  let acc = 0;

  function fixedUpdate() {
    const hud = getHud();
    if (hud.emoteSeq !== seenEmote) {
      seenEmote = hud.emoteSeq;
      if (hud.started) emote = 2.35;
    }
    if (emote > 0) emote = Math.max(0, emote - STEP);
    if (comboTimer > 0) {
      comboTimer -= STEP;
      if (comboTimer <= 0) {
        combo = 0;
        patchHud({ combo: 0 });
      }
    }

    if (!hud.started) {
      speed += (0 - speed) * (1 - Math.exp(-6 * STEP));
    } else {
      const steer = Math.max(
        -1,
        Math.min(1, (steerOverride !== null ? steerOverride : keySteer()) - joyX),
      );
      const throttle = Math.max(-1, Math.min(1, keyThrottle() + joyY));
      const max = 5.4;
      const target = throttle * (throttle >= 0 ? max : max * 0.45);
      speed += (target - speed) * (1 - Math.exp(-6 * STEP));
      if (Math.abs(speed) < 0.02 && Math.abs(throttle) < 0.05) speed = 0;
      const reverse = speed >= 0 ? 1 : -1;
      const speedFactor = Math.min(1, Math.abs(speed) / 1.4);
      yaw += steer * 2.8 * (0.45 + 0.55 * speedFactor) * reverse * STEP;
      const fx = -Math.sin(yaw);
      const fz = -Math.cos(yaw);
      let nx = pos.x + fx * speed * STEP;
      let nz = pos.z + fz * speed * STEP;
      const pushed = yard.collide(nx, nz, 0.42);
      nx = Math.max(-9.2, Math.min(9.2, pushed.x));
      nz = Math.max(-10.2, Math.min(4.6, pushed.z));
      pos.x = nx;
      pos.z = nz;

      for (const coin of coins) {
        if (!coin.alive) {
          coin.respawn -= STEP;
          if (coin.respawn <= 0) {
            coin.alive = true;
            coin.x = coin.homeX;
            coin.z = coin.homeZ;
            coin.pop = 0;
          }
          continue;
        }
        if (coin.pop > 0) {
          coin.pop -= STEP;
          if (coin.pop <= 0) {
            coin.alive = false;
            coin.respawn = 8;
          }
          continue;
        }
        const dx = pos.x - coin.x;
        const dz = pos.z - coin.z;
        const dist = Math.hypot(dx, dz) || 0.0001;
        if (dist < 1.7) {
          coin.x += (dx / dist) * 3.2 * STEP;
          coin.z += (dz / dist) * 3.2 * STEP;
        }
        if (dist < 0.62) {
          coin.pop = 0.28;
          if (comboTimer > 0) combo += 1;
          else combo = 0;
          comboTimer = 1.4;
          const value = 1 + combo;
          coinsCount += value;
          shake = Math.max(shake, 0.08);
          sfxCoin();
          burst(coin.x, 0.5, coin.z, 5, 0xf0b429);
          patchHud({ coins: coinsCount, combo });
          queueSave();
        }
      }
    }
  }

  function resize() {
    const parent = canvas.parentElement;
    const width = parent?.clientWidth || window.innerWidth;
    const height = parent?.clientHeight || window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, width < 800 ? 1.4 : 1.75));
    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(1, height);
    camera.updateProjectionMatrix();
  }
  resize();
  const observer = new ResizeObserver(() => resize());
  if (canvas.parentElement) observer.observe(canvas.parentElement);

  function frame(stamp?: number) {
    if (disposed) return;
    timer.update(stamp);
    const delta = Math.min(timer.getDelta(), 0.05);
    const elapsed = timer.getElapsed();
    acc += delta;
    let steps = 0;
    while (acc >= STEP && steps < 5) {
      fixedUpdate();
      acc -= STEP;
      steps++;
    }

    const hud = getHud();
    const mode: Mode = hud.mode;
    const targetMove = Math.min(1, Math.abs(speed) / 2.1);
    movingBlend += (targetMove - movingBlend) * (1 - Math.exp(-8 * delta));
    let showcase = mode === "dance" && Math.abs(speed) < 1.15 ? 1 : 0;
    if (!hud.started) showcase = 1;
    const face = mode === "build" ? -1 : THREE.MathUtils.lerp(-1, 1, showcase);
    const dist = mode === "build" ? 9.4 : THREE.MathUtils.lerp(5.3, 6.8, showcase);
    const height = mode === "build" ? 7.4 : THREE.MathUtils.lerp(2.3, 2.7, showcase);
    const side = mode === "build" ? 0.15 : THREE.MathUtils.lerp(0.55, 2.15, showcase);
    const fx = -Math.sin(yaw);
    const fz = -Math.cos(yaw);
    const rx = Math.cos(yaw);
    const rz = -Math.sin(yaw);
    desired.set(
      pos.x + fx * dist * face + rx * side,
      height,
      pos.z + fz * dist * face + rz * side,
    );
    const k = 1 - Math.exp(-3.4 * delta);
    camPos.lerp(desired, k);
    shake *= Math.exp(-5 * delta);
    camera.position.set(
      camPos.x + (Math.random() - 0.5) * shake,
      camPos.y + (Math.random() - 0.5) * shake * 0.45,
      camPos.z,
    );
    const ahead = mode === "build" ? 3.4 : 0;
    look.set(pos.x + fx * ahead, mode === "build" ? 0.15 : THREE.MathUtils.lerp(1.2, 0.45, showcase), pos.z + fz * ahead);
    camera.lookAt(look);

    character.root.position.set(pos.x, 0, pos.z);
    character.root.rotation.y = yaw + Math.PI;
    const mouth = hud.started ? pollAudio() : { mouth: 0.15 + Math.sin(elapsed * 3) * 0.05, line: "", syl: "" };
    if (hud.started && (mouth.line !== lastLine || mouth.syl !== lastSyl)) {
      lastLine = mouth.line;
      lastSyl = mouth.syl;
      patchHud({ line: mouth.line, syl: mouth.syl });
    }
    character.update({
      t: elapsed,
      dt: delta,
      moving: movingBlend,
      emote: emote > 0 ? Math.sin(Math.min(1, emote / 2.35) * Math.PI) : 0,
      mouth: mouth.mouth,
    });
    blob.position.x = pos.x;
    blob.position.z = pos.z;
    blob.scale.setScalar(1 - movingBlend * 0.15);

    for (let i = 0; i < coins.length; i++) {
      const coin = coins[i];
      const show = coin.alive || coin.pop > 0;
      const bob = show ? 0.38 + Math.sin(elapsed * 3 + coin.phase) * 0.07 : -1;
      const popScale = coin.pop > 0 ? 1 + (0.28 - coin.pop) * 3 : coin.alive ? 1 : 0;
      dummy.position.set(coin.x, coin.pop > 0 ? bob + (0.28 - coin.pop) : bob, coin.z);
      dummy.rotation.set(0, elapsed * 1.6 + coin.phase, 0);
      dummy.scale.setScalar(show ? popScale : 0);
      dummy.updateMatrix();
      coinMesh.setMatrixAt(i, dummy.matrix);
    }
    coinMesh.instanceMatrix.needsUpdate = true;

    if (hud.started && mouth.mouth > 0.82) {
      singCool -= delta;
      if (singCool <= 0) {
        burst(pos.x, 2.2, pos.z, 1, 0xfff1c4);
        singCool = 0.42;
      }
    } else {
      singCool = 0;
    }
    for (const spark of sparks) {
      if (spark.life <= 0) continue;
      spark.life -= delta;
      spark.vy -= delta * 1.4;
      spark.x += spark.vx * delta;
      spark.y += spark.vy * delta;
      spark.z += spark.vz * delta;
      spark.sprite.position.set(spark.x, spark.y, spark.z);
      const mat = spark.sprite.material as THREE.SpriteMaterial;
      mat.opacity = Math.max(0, spark.life);
      if (spark.life <= 0) spark.sprite.visible = false;
    }

    stars.forEach((star, i) => {
      const s = 0.22 + 0.1 * (0.5 + 0.5 * Math.sin(elapsed * 2 + i));
      star.scale.setScalar(s);
    });
    yard.tickFlames(elapsed);

    if (hud.mode === "build" && hud.started && pointerOn && aim(pointerX, pointerY)) {
      yard.hover(hitPoint.x, hitPoint.z, hud.module, hud.rot, coinsCount);
    } else {
      yard.hideGhost();
    }

    renderer.render(scene, camera);
  }

  renderer.setAnimationLoop(frame);

  return {
    setJoy(x: number, y: number) {
      joyX = x;
      joyY = y;
    },
    dispose() {
      disposed = true;
      renderer.setAnimationLoop(null);
      timer.dispose();
      observer.disconnect();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointerup", onPointerUp);
      if (toastTimer) clearTimeout(toastTimer);
      if (saveTimer) clearTimeout(saveTimer);
      yard.save(coinsCount);
      if (window.__controlsTest) delete window.__controlsTest;
      scene.traverse((obj: THREE.Object3D) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
      });
      for (const spark of sparks) spark.sprite.material.dispose();
      studio.dispose();
      renderer.dispose();
    },
  };
}
