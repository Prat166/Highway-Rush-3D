import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export const LANES = 4;
export const LANE_W = 3.6;
export const ROAD_HALF = (LANES * LANE_W) / 2;
export const laneX = (i) => (i - (LANES - 1) / 2) * LANE_W;

const SEG_LEN = 20, SEG_COUNT = 16, SEG_TOTAL = SEG_LEN * SEG_COUNT;
const DASH = 12, ROAD_LEN = 360;

function roadTexture(maxAniso) {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#3b3f47';
  g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2500; i++) {
    const v = 50 + ((Math.random() * 30) | 0);
    g.fillStyle = `rgb(${v},${v + 3},${v + 8})`;
    g.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
  }
  g.fillStyle = '#f4f6fa';
  g.fillRect(8, 0, 8, 512);
  g.fillRect(496, 0, 8, 512);
  g.fillRect(125, 0, 6, 170);
  g.fillRect(381, 0, 6, 170);
  g.fillStyle = '#ffb020';
  g.fillRect(250, 0, 5, 512);
  g.fillRect(258, 0, 5, 512);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1, ROAD_LEN / DASH);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = Math.min(4, maxAniso);
  return t;
}

function skyTexture() {
  const c = document.createElement('canvas');
  c.width = 2; c.height = 256;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#3d7bd9');
  gr.addColorStop(0.65, '#9cc7ef');
  gr.addColorStop(1, '#cfe6f7');
  g.fillStyle = gr;
  g.fillRect(0, 0, 2, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createWorld(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = skyTexture();
  scene.fog = new THREE.Fog(0xcfe6f7, 100, 330);
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.5;
  pm.dispose();

  const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 500);
  camera.position.set(0, 3.6, 9);

  scene.add(new THREE.HemisphereLight(0xdff0ff, 0x5a7a3a, 0.9));
  const sun = new THREE.DirectionalLight(0xfff1d6, 2.2);
  sun.position.set(-12, 30, 10);
  sun.target.position.set(0, 0, -2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 22, bottom: -22, near: 1, far: 90 });
  scene.add(sun, sun.target);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(700, ROAD_LEN + 40),
    new THREE.MeshStandardMaterial({ color: 0x5f8f3e, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.03, -150);
  ground.receiveShadow = true;
  scene.add(ground);

  const roadTex = roadTexture(renderer.capabilities.getMaxAnisotropy());
  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(ROAD_HALF * 2, ROAD_LEN),
    new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.85 })
  );
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0, -150);
  road.receiveShadow = true;
  scene.add(road);

  // Far hills (static backdrop)
  const hillGeo = new THREE.ConeGeometry(80, 60, 7);
  const hillMats = [0x6f8fa8, 0x7a9a86, 0x6a8697].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 1 }));
  for (let i = 0; i < 10; i++) {
    const h = new THREE.Mesh(hillGeo, hillMats[i % 3]);
    const s = 0.8 + Math.random() * 1.1;
    h.scale.set(s, 0.7 + Math.random() * 0.8, s);
    h.position.set(-300 + i * 65 + Math.random() * 20, 18, -330 - Math.random() * 25);
    scene.add(h);
  }

  // Roadside segments (recycled)
  const barrierGeo = new THREE.BoxGeometry(0.35, 0.9, SEG_LEN);
  const barrierMat = new THREE.MeshStandardMaterial({ color: 0xb8bec8, roughness: 0.6, metalness: 0.3 });
  const trunkGeo = new THREE.CylinderGeometry(0.25, 0.35, 2.4, 6);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2b });
  const leafGeo = new THREE.ConeGeometry(2, 4, 7);
  const leafMats = [0x2f7d3a, 0x3c9147].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 1 }));
  const poleGeo = new THREE.CylinderGeometry(0.12, 0.12, 8, 6);
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x8a8f99, metalness: 0.5 });
  const armGeo = new THREE.BoxGeometry(2.6, 0.12, 0.12);
  const lampGeo = new THREE.BoxGeometry(0.8, 0.15, 0.35);
  const lampMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff2c0, emissiveIntensity: 1.2 });
  const signBoardGeo = new THREE.BoxGeometry(4, 2, 0.15);
  const signMat = new THREE.MeshStandardMaterial({ color: 0x0f6b3c, roughness: 0.6 });

  const segs = [];
  function randomize(seg) {
    for (const t of seg.userData.trees) {
      t.g.position.set(t.side * (ROAD_HALF + 4 + Math.random() * 14), 0, (Math.random() - 0.5) * SEG_LEN * 0.9);
      t.g.scale.setScalar(0.8 + Math.random() * 0.7);
    }
    seg.userData.sign.visible = Math.random() < 0.15;
  }
  for (let i = 0; i < SEG_COUNT; i++) {
    const seg = new THREE.Group();
    seg.position.z = SEG_LEN - i * SEG_LEN;
    for (const side of [-1, 1]) {
      const b = new THREE.Mesh(barrierGeo, barrierMat);
      b.position.set(side * (ROAD_HALF + 0.5), 0.45, 0);
      seg.add(b);
    }
    const trees = [];
    for (const side of [-1, 1]) {
      const g = new THREE.Group();
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 1.2;
      const l1 = new THREE.Mesh(leafGeo, leafMats[i % 2]);
      l1.position.y = 4;
      const l2 = new THREE.Mesh(leafGeo, leafMats[(i + 1) % 2]);
      l2.position.y = 5.8;
      l2.scale.setScalar(0.7);
      g.add(trunk, l1, l2);
      seg.add(g);
      trees.push({ g, side });
    }
    if (i % 2 === 0) {
      const lamp = new THREE.Group();
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.y = 4;
      const arm = new THREE.Mesh(armGeo, poleMat);
      arm.position.set(-1.3, 8, 0);
      const head = new THREE.Mesh(lampGeo, lampMat);
      head.position.set(-2.4, 7.9, 0);
      lamp.add(pole, arm, head);
      lamp.position.set(ROAD_HALF + 1.2, 0, 0);
      seg.add(lamp);
    }
    const sign = new THREE.Group();
    const board = new THREE.Mesh(signBoardGeo, signMat);
    board.position.y = 4.2;
    for (const dx of [-1.6, 1.6]) {
      const p = new THREE.Mesh(poleGeo, poleMat);
      p.scale.y = 0.55;
      p.position.set(dx, 2.2, 0);
      sign.add(p);
    }
    sign.add(board);
    sign.position.set(-(ROAD_HALF + 3.2), 0, 0);
    seg.add(sign);
    seg.userData = { trees, sign };
    randomize(seg);
    scene.add(seg);
    segs.push(seg);
  }

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resize);
  resize();

  return {
    renderer, scene, camera, resize,
    update(dt, speed) {
      const d = speed * dt;
      roadTex.offset.y = (roadTex.offset.y + d / DASH) % 1;
      for (const s of segs) {
        s.position.z += d;
        if (s.position.z > SEG_LEN) {
          s.position.z -= SEG_TOTAL;
          randomize(s);
        }
      }
    },
    render() { renderer.render(scene, camera); },
    dispose() {
      window.removeEventListener('resize', resize);
      window.removeEventListener('orientationchange', resize);
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
      });
      renderer.dispose();
      renderer.domElement.remove();
    }
  };
}
