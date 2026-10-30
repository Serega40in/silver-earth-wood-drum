import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type { Studio } from "@/game/materials";

class HelixCurve extends THREE.Curve<THREE.Vector3> {
  constructor(
    private radius: number,
    private height: number,
    private turns: number,
  ) {
    super();
  }

  getPoint(t: number, optionalTarget?: THREE.Vector3) {
    const target = optionalTarget ?? new THREE.Vector3();
    const a = t * Math.PI * 2 * this.turns;
    return target.set(Math.cos(a) * this.radius, -t * this.height, Math.sin(a) * this.radius);
  }
}

const SPRING = 0.66;

export type Character = {
  root: THREE.Group;
  update: (opts: {
    t: number;
    dt: number;
    moving: number;
    emote: number;
    mouth: number;
  }) => void;
};

export function createCharacter(studio: Studio): Character {
  const root = new THREE.Group();
  const bob = new THREE.Group();
  root.add(bob);

  const torso = new THREE.Group();
  torso.position.y = 1.38;
  bob.add(torso);

  const shell = new THREE.Mesh(new RoundedBoxGeometry(1.18, 1.22, 0.78, 3, 0.07), studio.green);
  shell.castShadow = true;
  shell.receiveShadow = true;
  torso.add(shell);

  const door = new THREE.Mesh(new RoundedBoxGeometry(1.0, 1.05, 0.06, 2, 0.04), studio.face);
  door.position.z = 0.4;
  door.castShadow = true;
  torso.add(door);

  const sideGeo = new RoundedBoxGeometry(0.06, 0.92, 0.5, 2, 0.03);
  const sideL = new THREE.Mesh(sideGeo, studio.wood);
  sideL.position.set(-0.58, -0.02, 0);
  const sideR = new THREE.Mesh(sideGeo, studio.wood);
  sideR.position.set(0.58, -0.02, 0);
  torso.add(sideL, sideR);

  const roofGeo = new RoundedBoxGeometry(1.46, 0.16, 1.05, 2, 0.04);
  const eave = new THREE.Mesh(roofGeo, studio.green);
  eave.position.y = 0.68;
  eave.castShadow = true;
  const cap = new THREE.Mesh(new RoundedBoxGeometry(1.22, 0.22, 0.86, 2, 0.05), studio.green);
  cap.position.y = 0.82;
  cap.castShadow = true;
  const top = new THREE.Mesh(new RoundedBoxGeometry(0.72, 0.1, 0.52, 2, 0.03), studio.black);
  top.position.y = 0.96;
  torso.add(eave, cap, top);

  const flames: THREE.Mesh[] = [];
  [0.16, 0.22, 0.12].forEach((scale, i) => {
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.11 * (1 - i * 0.18), 0.28, 10), studio.flameMats[i]);
    flame.position.y = 1.12 + i * 0.12;
    flame.scale.setScalar(scale / 0.16);
    flame.userData.base = flame.scale.y;
    flames.push(flame);
    torso.add(flame);
  });
  const flameLight = new THREE.PointLight(0xff8a32, 2.4, 4.2, 2);
  flameLight.position.y = 1.25;
  torso.add(flameLight);

  const hat = new THREE.Group();
  hat.position.set(-0.06, 0.98, 0.22);
  hat.rotation.z = -0.22;
  hat.rotation.x = -0.08;
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.045, 28), studio.black);
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.24, 24), studio.black);
  crown.position.y = 0.14;
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.245, 0.245, 0.045, 24), studio.gold);
  band.position.y = 0.05;
  brim.castShadow = true;
  crown.castShadow = true;
  hat.add(brim, crown, band);
  torso.add(hat);

  function eye(x: number) {
    const g = new THREE.Group();
    g.position.set(x, 0.16, 0.46);
    const white = new THREE.Mesh(new THREE.SphereGeometry(0.125, 20, 16), studio.eyeWhite);
    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.072, 16, 12), studio.iris);
    iris.position.z = 0.07;
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.038, 12, 10), studio.pupil);
    pupil.position.z = 0.1;
    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 8), studio.highlight);
    glint.position.set(0.03, 0.03, 0.12);
    g.add(white, iris, pupil, glint);
    return g;
  }
  const eyeL = eye(-0.24);
  const eyeR = eye(0.24);
  torso.add(eyeL, eyeR);

  const browGeo = new RoundedBoxGeometry(0.2, 0.035, 0.03, 2, 0.01);
  const browL = new THREE.Mesh(browGeo, studio.black);
  browL.position.set(-0.24, 0.32, 0.48);
  browL.rotation.z = 0.25;
  const browR = new THREE.Mesh(browGeo, studio.black);
  browR.position.set(0.24, 0.32, 0.48);
  browR.rotation.z = -0.25;
  torso.add(browL, browR);

  function lens(x: number) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.145, 0.016, 8, 28), studio.black);
    ring.position.set(x, 0.15, 0.52);
    const glass = new THREE.Mesh(new THREE.CircleGeometry(0.132, 20), studio.glass);
    glass.position.set(x, 0.15, 0.5);
    return [ring, glass];
  }
  torso.add(...lens(-0.24), ...lens(0.24));
  const bridge = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.03, 0.03, 1, 0.01), studio.black);
  bridge.position.set(0, 0.17, 0.52);
  torso.add(bridge);

  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.02, 8, 20, Math.PI), studio.black);
  smile.position.set(0, -0.08, 0.47);
  smile.rotation.z = Math.PI;
  torso.add(smile);
  const mouthIn = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10), studio.pupil);
  mouthIn.position.set(0, -0.12, 0.44);
  mouthIn.scale.set(1.1, 0.18, 0.45);
  torso.add(mouthIn);

  const blushGeo = new THREE.SphereGeometry(0.09, 12, 10);
  const blushL = new THREE.Mesh(blushGeo, studio.blush);
  blushL.position.set(-0.36, -0.05, 0.42);
  blushL.scale.set(1.2, 0.7, 0.4);
  const blushR = blushL.clone();
  blushR.position.x = 0.36;
  torso.add(blushL, blushR);

  const mini = new THREE.Mesh(new RoundedBoxGeometry(0.36, 0.4, 0.05, 2, 0.04), studio.woodDark);
  mini.position.set(0, -0.36, 0.45);
  const arch = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), studio.woodDark);
  arch.position.set(0, -0.18, 0.45);
  const miniSmile = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.012, 6, 14, Math.PI), studio.black);
  miniSmile.position.set(0, -0.38, 0.49);
  miniSmile.rotation.z = Math.PI;
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 8), studio.gold);
  knob.position.set(0.1, -0.36, 0.49);
  torso.add(mini, arch, miniSmile, knob);

  function arm(side: -1 | 1) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.62, 0.28, 0.08);
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.28, 4, 8), studio.green);
    upper.position.y = -0.22;
    const sleeve = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.26, 4, 8), studio.silver);
    sleeve.position.y = -0.2;
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.095, 16, 12), studio.glove);
    hand.position.y = -0.48;
    if (side === 1) {
      const finger = new THREE.Mesh(new THREE.CapsuleGeometry(0.026, 0.1, 3, 6), studio.glove);
      finger.rotation.z = Math.PI / 2;
      finger.position.set(0.12, 0.01, 0.02);
      hand.add(finger);
    }
    pivot.add(upper, sleeve, hand);
    torso.add(pivot);
    return { pivot, hand };
  }
  const rightArm = arm(-1);
  const leftArm = arm(1);

  const coatL = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.85, 0.55, 2, 0.04), studio.silver);
  coatL.position.set(-0.66, -0.12, -0.02);
  coatL.rotation.z = 0.08;
  const coatR = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.85, 0.55, 2, 0.04), studio.silver);
  coatR.position.set(0.66, -0.12, -0.02);
  coatR.rotation.z = -0.08;
  const cape = new THREE.Mesh(new RoundedBoxGeometry(0.85, 0.78, 0.1, 2, 0.03), studio.silver);
  cape.position.set(0, -0.08, -0.42);
  torso.add(coatL, coatR, cape);

  const sequinGeo = new THREE.SphereGeometry(0.035, 6, 6);
  const sequins: THREE.Mesh[] = [];
  const spots: [number, number, number][] = [
    [-0.66, 0.1, 0.2],
    [-0.7, -0.2, 0.05],
    [0.68, 0.05, 0.18],
    [0.64, -0.28, -0.05],
    [0.1, -0.15, -0.48],
    [-0.2, 0.08, -0.48],
    [0.66, -0.05, -0.16],
    [-0.62, -0.36, 0.12],
  ];
  for (const [x, y, z] of spots) {
    const s = new THREE.Mesh(sequinGeo, studio.highlight);
    s.position.set(x, y, z);
    torso.add(s);
    sequins.push(s);
  }

  const springGeo = new THREE.TubeGeometry(new HelixCurve(0.075, SPRING, 5.2), 72, 0.02, 8, false);
  function leg(x: number) {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.78, 0);
    const spring = new THREE.Mesh(springGeo, studio.black);
    spring.castShadow = true;
    const sock = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.08, 0.12, 12), studio.sock);
    const shoe = new THREE.Group();
    const sole = new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.1, 0.36, 2, 0.04), studio.black);
    sole.castShadow = true;
    const toe = new THREE.Mesh(new THREE.SphereGeometry(0.09, 14, 10), studio.black);
    toe.scale.set(1.15, 0.72, 1.35);
    toe.position.set(0, 0.01, 0.12);
    shoe.add(sole, toe);
    pivot.add(spring, sock, shoe);
    bob.add(pivot);
    return { pivot, spring, sock, shoe };
  }
  const legL = leg(-0.24);
  const legR = leg(0.24);

  let blinkIn = 0;
  let blinkWait = 1.6;
  let phase = 0;

  function update(opts: { t: number; dt: number; moving: number; emote: number; mouth: number }) {
    const moving = THREE.MathUtils.clamp(opts.moving, 0, 1);
    const pose = Math.max(1 - moving, opts.emote);
    phase += opts.dt * (3.2 + moving * 8);
    const hop = Math.sin(opts.emote * Math.PI);
    bob.position.y = (1 - moving) * Math.abs(Math.sin(opts.t * 3.1)) * 0.07 + hop * 0.16;
    bob.rotation.z = Math.sin(opts.t * 1.7) * 0.06 * (1 - moving);
    bob.rotation.y = Math.sin(opts.t * 1.3) * 0.05 * (1 - moving);
    torso.rotation.x = -0.08 * moving;
    const squash = 1 + Math.sin(opts.t * 6.2) * 0.02 * (1 - moving) - hop * 0.04;
    torso.scale.set(1 + (1 - squash) * 0.45, squash, 1 + (1 - squash) * 0.45);

    const swing = Math.sin(phase);
    rightArm.pivot.rotation.z = THREE.MathUtils.lerp(-0.35, -2.05, pose);
    rightArm.pivot.rotation.x = THREE.MathUtils.lerp(swing * 0.9 * moving, -0.35, pose);
    rightArm.hand.rotation.z = THREE.MathUtils.lerp(0, 0.7, pose);
    leftArm.pivot.rotation.z = THREE.MathUtils.lerp(0.35, 1.22, pose);
    leftArm.pivot.rotation.x = THREE.MathUtils.lerp(-swing * 0.9 * moving, -0.25, pose);
    leftArm.pivot.rotation.y = THREE.MathUtils.lerp(0, -0.25, pose);

    hat.rotation.z = -0.18 - pose * 0.12 + Math.sin(opts.t * 2.2) * 0.04 * pose;
    hat.rotation.x = -0.08 - opts.emote * 0.4;
    hat.position.y = 0.98 + opts.emote * 0.05;

    const stepL = 1 - moving * 0.22 * Math.max(0, Math.sin(phase));
    const stepR = 1 - moving * 0.22 * Math.max(0, Math.sin(phase + Math.PI));
    const danceL = 1 - (1 - moving) * (0.08 + 0.05 * Math.sin(opts.t * 3.1));
    const danceR = 1 - (1 - moving) * 0.04;
    const sL = moving > 0.2 ? stepL : danceL;
    const sR = moving > 0.2 ? stepR : danceR;
    legL.spring.scale.y = sL;
    legR.spring.scale.y = sR;
    legL.shoe.position.y = -SPRING * sL;
    legR.shoe.position.y = -SPRING * sR;
    legL.sock.position.y = -SPRING * sL + 0.12;
    legR.sock.position.y = -SPRING * sR + 0.12;
    legL.pivot.position.y = 0.78 + (1 - moving) * 0.06 * (0.5 + 0.5 * Math.sin(opts.t * 3.1));
    legR.pivot.position.y = 0.78;

    blinkWait -= opts.dt;
    if (blinkWait <= 0 && blinkIn <= 0) {
      blinkIn = 0.12;
      blinkWait = 2.2 + Math.random() * 2.4;
    }
    let eyeY = 1;
    if (blinkIn > 0) {
      blinkIn -= opts.dt;
      eyeY = 1 - 0.92 * Math.sin(Math.min(1, (0.12 - Math.max(0, blinkIn)) / 0.12) * Math.PI);
    }
    eyeL.scale.y = eyeY;
    eyeR.scale.y = eyeY;

    const open = 0.16 + opts.mouth * 1.15;
    mouthIn.scale.set(1.05 + opts.mouth * 0.25, open, 0.4);
    mouthIn.position.y = -0.1 - opts.mouth * 0.04;

    flames.forEach((flame, i) => {
      const base = flame.userData.base as number;
      const flick = 0.82 + Math.sin(opts.t * 11 + i * 1.7) * 0.18;
      flame.scale.y = base * flick;
      flame.position.x = Math.sin(opts.t * 8 + i) * 0.015;
    });
    flameLight.intensity = 2.1 + Math.sin(opts.t * 13) * 0.45;

    sequins.forEach((s, i) => {
      const k = 0.45 + 0.7 * (0.5 + 0.5 * Math.sin(opts.t * 6 + i * 1.3));
      s.scale.setScalar(k);
    });
  }

  return { root, update };
}
