import { createWorld } from './scene.js';
import { PlayerCar, CAR_COLORS } from './playerCar.js';
import { Traffic } from './traffic.js';
import { Controls } from './controls.js';
import { GameAudio } from './audio.js';
import { UI } from './ui.js';

const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, String(v)); } catch { /* storage unavailable */ } }
};
const K_BEST = 'hrush3d.best', K_CAR = 'hrush3d.car', K_SND = 'hrush3d.sound';

export class Game {
  constructor(container) {
    this.world = createWorld(container);
    this.car = new PlayerCar();
    this.world.scene.add(this.car.group);
    this.traffic = new Traffic(this.world.scene);
    this.audio = new GameAudio(store.get(K_SND, '1') === '1');
    this.controls = new Controls({ onPause: () => this.togglePause() });

    const ci = parseInt(store.get(K_CAR, '0'), 10);
    this.carIndex = ci >= 0 && ci < CAR_COLORS.length ? ci : 0;
    this.car.setColor(CAR_COLORS[this.carIndex].hex);
    this.best = parseInt(store.get(K_BEST, '0'), 10) || 0;

    this.ui = new UI({
      onPlay: () => this.play(),
      onResume: () => this.togglePause(),
      onPauseButton: () => this.togglePause(),
      onMenu: () => this.toMenu(),
      onCar: (i) => { this.carIndex = i; this.car.setColor(CAR_COLORS[i].hex); store.set(K_CAR, i); },
      onSound: () => {
        this.audio.setEnabled(!this.audio.enabled);
        store.set(K_SND, this.audio.enabled ? '1' : '0');
        this.ui.setSound(this.audio.enabled);
      }
    });
    this.ui.setBest(this.best);
    this.ui.setSound(this.audio.enabled);
    this.ui.buildCars(CAR_COLORS, this.carIndex);

    this.onLost = (e) => { e.preventDefault(); this.stop(); this.ui.showError(); };
    this.world.renderer.domElement.addEventListener('webglcontextlost', this.onLost);
    this.onHide = () => { if (document.hidden && this.state === 'playing') this.togglePause(); };
    document.addEventListener('visibilitychange', this.onHide);

    this.menuT = 0;
    this.state = 'menu';
    this.ui.show('menu');
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  }

  loop = (now) => {
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.step(dt);
    this.world.render();
  };

  stop() { cancelAnimationFrame(this.raf); this.raf = 0; }

  reset() {
    this.car.reset();
    this.traffic.reset();
    this.controls.reset();
    this.distance = 0; this.bonus = 0; this.coins = 0; this.score = 0;
    this.crashTimer = 0;
  }

  play() {
    this.reset();
    this.car.speed = 14;
    this.state = 'playing';
    this.ui.show('hud');
    this.audio.startEngine();
  }

  toMenu() {
    this.reset();
    this.state = 'menu';
    this.audio.stopEngine();
    this.ui.setBest(this.best);
    this.ui.show('menu');
  }

  togglePause() {
    if (this.state === 'playing') {
      this.state = 'paused';
      this.controls.reset();
      this.audio.stopEngine();
      this.ui.show('pause');
    } else if (this.state === 'paused') {
      this.state = 'playing';
      this.ui.show('hud');
      this.audio.startEngine();
    }
  }

  crash() {
    this.state = 'crashed';
    this.crashTimer = 1.1;
    this.controls.reset();
    this.audio.stopEngine();
    this.audio.crash();
  }

  finish() {
    this.state = 'over';
    const newBest = this.score > this.best;
    if (newBest) { this.best = this.score; store.set(K_BEST, this.best); }
    this.ui.gameOver({ score: this.score, distance: this.distance, coins: this.coins, best: this.best, newBest });
  }

  chase(dt, shake) {
    const cam = this.world.camera, car = this.car;
    const k = 1 - Math.exp(-6 * dt);
    cam.position.x += (car.x * 0.7 - cam.position.x) * k;
    cam.position.y += (3.6 - cam.position.y) * k;
    cam.position.z += (9 - cam.position.z) * k;
    if (shake) cam.position.x += (Math.random() - 0.5) * shake;
    cam.lookAt(car.x * 0.6, 1.2, -14);
    const fov = 60 + 20 * (car.speed / 62);
    if (Math.abs(cam.fov - fov) > 0.05) { cam.fov = fov; cam.updateProjectionMatrix(); }
  }

  step(dt) {
    const { car, world, traffic, ui } = this;
    switch (this.state) {
      case 'menu': {
        this.menuT += dt * 0.4;
        car.speed = 25;
        car.spinWheels(dt);
        world.update(dt, 25);
        const c = world.camera;
        c.position.set(Math.sin(this.menuT) * 7, 2.4 + Math.sin(this.menuT * 0.7) * 0.5, Math.cos(this.menuT) * 7);
        c.lookAt(0, 0.8, 0);
        if (c.fov !== 60) { c.fov = 60; c.updateProjectionMatrix(); }
        break;
      }
      case 'playing': {
        car.update(dt, this.controls.state);
        world.update(dt, car.speed);
        const diff = 1 + this.distance / 1200;
        const ev = traffic.update(dt, car.speed, car.x, diff, true);
        this.distance += car.speed * dt;
        if (ev.overtakes) this.bonus += 25 * ev.overtakes;
        if (ev.near) { this.bonus += 75 * ev.near; ui.toast('Near miss +75'); }
        if (ev.coins) { this.coins += ev.coins; this.bonus += 20 * ev.coins; this.audio.coin(); }
        this.score = Math.floor(this.distance * 0.1 + this.bonus);
        ui.hud(Math.round(car.speed * 3.6), this.score, this.distance, this.coins);
        this.audio.setSpeed(car.speed);
        this.chase(dt, car.scraping ? 0.08 : 0);
        if (ev.crash) this.crash();
        break;
      }
      case 'crashed': {
        car.speed = Math.max(0, car.speed - 60 * dt);
        car.vx = 0;
        car.group.rotation.y += 6 * dt;
        car.spinWheels(dt);
        world.update(dt, car.speed);
        traffic.update(dt, car.speed, car.x, 1, false);
        this.chase(dt, 0.35);
        this.crashTimer -= dt;
        if (this.crashTimer <= 0) this.finish();
        break;
      }
      default:
        break;
    }
  }

  dispose() {
    this.stop();
    document.removeEventListener('visibilitychange', this.onHide);
    this.world.renderer.domElement.removeEventListener('webglcontextlost', this.onLost);
    this.audio.stopEngine();
    this.controls.dispose();
    this.ui.dispose();
    this.world.dispose();
  }
}
