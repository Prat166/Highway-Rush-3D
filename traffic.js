import * as THREE from 'three';
import { LANES, laneX } from './scene.js';

// part: [sx, sy, sz, x, y, z, kind] kind 0 = glass, 1 = body colour, 2 = cargo
const TYPES = [
  { w: 1.9, l: 4.3, tail: 0.65, parts: [[1.9, 0.6, 4.3, 0, 0.55, 0, 1], [1.6, 0.5, 2, 0, 1.1, 0.2, 0]] },
  { w: 2.3, l: 8, tail: 0.9, parts: [[2.2, 1.9, 2.2, 0, 1.2, -2.9, 1], [2.3, 2.5, 5.6, 0, 1.7, 1.2, 2]] },
  { w: 1.8, l: 3.6, tail: 0.6, parts: [[1.8, 0.65, 3.6, 0, 0.6, 0, 1], [1.5, 0.55, 1.9, 0, 1.17, 0.1, 0]] }
];
const PALETTE = [0xe63946, 0x2a9d8f, 0xf4a261, 0xf1f1f1, 0x264653, 0x8d99ae, 0x9b5de5, 0x1b1b1b];
const SPAWN_Z = -290;

export class Traffic {
  constructor(scene) {
    this.scene = scene;
    this.ev = { crash: false, overtakes: 0, near: 0, coins: 0 };
    this.mats = PALETTE.map((c) => new THREE.MeshStandardMaterial({ color: c, metalness: 0.5, roughness: 0.4 }));
    const glass = new THREE.MeshStandardMaterial({ color: 0x10151c, metalness: 0.9, roughness: 0.1 });
    const cargo = new THREE.MeshStandardMaterial({ color: 0xd9dde3, roughness: 0.7 });
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x15171b });
    const tailMat = new THREE.MeshStandardMaterial({ color: 0x660000, emissive: 0xff1a1a, emissiveIntensity: 0.8 });
    const wheelGeo = new THREE.BoxGeometry(0.3, 0.7, 0.7);
    const tailGeo = new THREE.BoxGeometry(0.45, 0.14, 0.08);
    const kinds = [glass, null, cargo];

    TYPES.forEach((t) => { t.geos = t.parts.map((p) => new THREE.BoxGeometry(p[0], p[1], p[2])); });

    this.cars = [];
    for (let i = 0; i < 14; i++) {
      const t = TYPES[i % TYPES.length];
      const group = new THREE.Group();
      const colored = [];
      t.parts.forEach((p, k) => {
        const m = new THREE.Mesh(t.geos[k], kinds[p[6]] || this.mats[0]);
        m.position.set(p[3], p[4], p[5]);
        if (p[6] === 1) { m.castShadow = true; colored.push(m); }
        group.add(m);
      });
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          const w = new THREE.Mesh(wheelGeo, wheelMat);
          w.position.set(sx * (t.w / 2), 0.35, sz * t.l * 0.3);
          group.add(w);
        }
        const tl = new THREE.Mesh(tailGeo, tailMat);
        tl.position.set(sx * (t.w / 2 - 0.45), t.tail, t.l / 2);
        group.add(tl);
      }
      group.visible = false;
      scene.add(group);
      this.cars.push({ group, colored, w: t.w, l: t.l, x: 0, z: 0, speed: 20, lane: 0, active: false, passed: false });
    }

    const coinGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.12, 18);
    coinGeo.rotateX(Math.PI / 2);
    const coinMat = new THREE.MeshStandardMaterial({ color: 0xffc933, emissive: 0xaa7a00, emissiveIntensity: 0.6, metalness: 0.8, roughness: 0.3 });
    this.coins = [];
    for (let i = 0; i < 25; i++) {
      const mesh = new THREE.Mesh(coinGeo, coinMat);
      mesh.visible = false;
      scene.add(mesh);
      this.coins.push({ mesh, x: 0, z: 0, active: false, collect: 0 });
    }
    this.reset();
  }

  reset() {
    for (const c of this.cars) { c.active = false; c.group.visible = false; }
    for (const c of this.coins) { c.active = false; c.mesh.visible = false; }
    this.timer = 0;
    this.coinTimer = 2;
  }

  spawnCar(diff) {
    const free = this.cars.filter((c) => !c.active);
    if (!free.length) return;
    const car = free[(Math.random() * free.length) | 0];
    const lane = (Math.random() * LANES) | 0;
    const near = new Set();
    let speed = Math.min(36, 14 + Math.random() * 10 + Math.min(diff, 8) * 1.5);
    for (const c of this.cars) {
      if (!c.active) continue;
      if (Math.abs(c.z - SPAWN_Z) < 40) near.add(c.lane);
      if (c.lane === lane) {
        if (c.z < SPAWN_Z + 35) return; // too close in same lane
        if (Math.abs(c.z - SPAWN_Z) < 200) speed = Math.max(speed, c.speed);
      }
    }
    if (near.size >= LANES - 1 && !near.has(lane)) return; // always keep one lane open
    car.lane = lane;
    car.x = laneX(lane);
    car.z = SPAWN_Z;
    car.speed = Math.min(36, speed);
    car.passed = false;
    car.active = true;
    const mat = this.mats[(Math.random() * this.mats.length) | 0];
    car.colored.forEach((m) => { m.material = mat; });
    car.group.visible = true;
  }

  spawnCoins() {
    const free = this.coins.filter((c) => !c.active);
    if (free.length < 5) return;
    const x = laneX((Math.random() * LANES) | 0);
    for (let i = 0; i < 5; i++) {
      const c = free[i];
      c.x = x; c.z = SPAWN_Z - i * 6; c.active = true; c.collect = 0;
      c.mesh.scale.setScalar(1);
      c.mesh.visible = true;
    }
  }

  update(dt, ps, px, diff, collide) {
    const ev = this.ev;
    ev.crash = false; ev.overtakes = 0; ev.near = 0; ev.coins = 0;

    this.timer += dt * Math.min(1.2, ps / 40);
    if (this.timer > Math.max(0.45, 1.3 - diff * 0.06)) { this.timer = 0; this.spawnCar(diff); }
    this.coinTimer -= (dt * ps) / 40;
    if (this.coinTimer <= 0) { this.coinTimer = 4 + Math.random() * 4; this.spawnCoins(); }

    for (const car of this.cars) {
      if (!car.active) continue;
      car.z += (ps - car.speed) * dt;
      car.group.position.set(car.x, 0, car.z);
      if (!car.passed && car.z > 0) {
        car.passed = true;
        ev.overtakes++;
        if (Math.abs(car.x - px) < (1.9 + car.w) / 2 + 1.2) ev.near++;
      }
      if (collide && Math.abs(car.x - px) < (1.9 + car.w) / 2 - 0.12 && Math.abs(car.z) < (4.4 + car.l) / 2 - 0.25) ev.crash = true;
      if (car.z > 30 || car.z < -340) { car.active = false; car.group.visible = false; }
    }

    for (const c of this.coins) {
      if (!c.active) continue;
      if (c.collect > 0) {
        c.collect -= dt;
        c.mesh.position.y += 6 * dt;
        c.mesh.scale.setScalar(Math.max(0.01, c.collect / 0.25));
        if (c.collect <= 0) { c.active = false; c.mesh.visible = false; }
        continue;
      }
      c.z += ps * dt;
      c.mesh.position.set(c.x, 0.9, c.z);
      c.mesh.rotation.y += 4 * dt;
      if (collide && Math.abs(c.x - px) < 1.3 && Math.abs(c.z) < 3) { c.collect = 0.25; ev.coins++; }
      else if (c.z > 15) { c.active = false; c.mesh.visible = false; }
    }
    return ev;
  }
}
