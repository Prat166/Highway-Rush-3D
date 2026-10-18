import * as THREE from 'three';
import { ROAD_HALF } from './scene.js';

export const CAR_COLORS = [
  { name: 'Red', hex: 0xd62828 },
  { name: 'Blue', hex: 0x1d6fe0 },
  { name: 'Yellow', hex: 0xf7b500 }
];

export const CAR_W = 1.9;
export const CAR_L = 4.4;
const MAX_SPEED = 62; // m/s, about 223 km/h

export class PlayerCar {
  constructor() {
    this.group = new THREE.Group();
    this.bodyMat = new THREE.MeshStandardMaterial({ color: 0xd62828, metalness: 0.6, roughness: 0.3 });
    const glass = new THREE.MeshStandardMaterial({ color: 0x10151c, metalness: 0.9, roughness: 0.1 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x15171b, roughness: 0.8 });
    this.tailMat = new THREE.MeshStandardMaterial({ color: 0x660000, emissive: 0xff1a1a, emissiveIntensity: 0.6 });
    const headMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff3c4, emissiveIntensity: 1.5 });

    const add = (geo, mat, x, y, z, shadow = true) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.castShadow = shadow;
      this.group.add(m);
      return m;
    };
    add(new THREE.BoxGeometry(CAR_W, 0.55, CAR_L), this.bodyMat, 0, 0.55, 0);
    add(new THREE.BoxGeometry(1.6, 0.5, 2.0), glass, 0, 1.07, 0.3);
    add(new THREE.BoxGeometry(1.5, 0.07, 1.4), this.bodyMat, 0, 1.35, 0.3);
    add(new THREE.BoxGeometry(1.8, 0.08, 0.45), dark, 0, 1.12, 2.05);
    for (const x of [-0.65, 0.65]) {
      add(new THREE.BoxGeometry(0.4, 0.14, 0.08), headMat, x, 0.62, -2.2, false);
      add(new THREE.BoxGeometry(0.45, 0.14, 0.08), this.tailMat, x, 0.66, 2.2, false);
    }
    const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 16);
    wheelGeo.rotateZ(Math.PI / 2);
    this.wheels = [];
    for (const x of [-0.95, 0.95]) {
      for (const z of [-1.4, 1.4]) {
        const pivot = new THREE.Group();
        pivot.position.set(x, 0.38, z);
        const w = new THREE.Mesh(wheelGeo, dark);
        w.castShadow = true;
        pivot.add(w);
        this.group.add(pivot);
        this.wheels.push(pivot);
      }
    }
    this.reset();
  }

  setColor(hex) { this.bodyMat.color.setHex(hex); }

  reset() {
    this.x = 0; this.vx = 0; this.speed = 0; this.scraping = false;
    this.group.position.set(0, 0, 0);
    this.group.rotation.set(0, 0, 0);
  }

  spinWheels(dt) {
    for (const w of this.wheels) w.rotation.x -= (this.speed * dt) / 0.38;
  }

  update(dt, input) {
    const a = 22 * (1 - 0.65 * (this.speed / MAX_SPEED));
    if (input.accel) this.speed += a * dt;
    if (input.brake) this.speed -= 40 * dt;
    else if (!input.accel) this.speed -= 5 * dt;
    this.speed = Math.min(MAX_SPEED, Math.max(0, this.speed));

    const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const factor = Math.min(1, this.speed / 12) * (1 - 0.4 * (this.speed / MAX_SPEED));
    this.vx += (dir * 11 * factor - this.vx) * Math.min(1, 10 * dt);
    this.x += this.vx * dt;

    const limit = ROAD_HALF - 1.1;
    this.scraping = false;
    if (this.x > limit || this.x < -limit) {
      this.x = Math.max(-limit, Math.min(limit, this.x));
      this.vx = 0;
      this.speed *= 1 - 0.6 * dt;
      this.scraping = true;
    }
    this.apply(dt);
    this.tailMat.emissiveIntensity = input.brake ? 2.5 : 0.6;
  }

  apply(dt) {
    this.group.position.x = this.x;
    this.group.rotation.y = -this.vx * 0.02;
    this.group.rotation.z = this.vx * 0.01;
    this.spinWheels(dt);
  }
}
