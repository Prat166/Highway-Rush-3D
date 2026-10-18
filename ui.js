const SCREENS = ['menu', 'cars', 'howto', 'pause', 'gameover'];
const $ = (id) => document.getElementById(id);
const isTouch = () => 'ontouchstart' in window || navigator.maxTouchPoints > 0;

export class UI {
  constructor(cb) {
    this.cb = cb;
    this.cleanups = [];
    this.last = {};
    this.toastTimer = 0;
    const click = (id, fn) => {
      const el = $(id);
      el.addEventListener('click', fn);
      this.cleanups.push(() => el.removeEventListener('click', fn));
    };
    click('btn-play', () => cb.onPlay());
    click('btn-cars', () => this.show('cars'));
    click('btn-cars-back', () => this.show('menu'));
    click('btn-howto', () => this.show('howto'));
    click('btn-howto-back', () => this.show('menu'));
    click('btn-sound', () => cb.onSound());
    click('btn-pause', () => cb.onPauseButton());
    click('btn-resume', () => cb.onResume());
    click('btn-restart', () => cb.onPlay());
    click('btn-pause-menu', () => cb.onMenu());
    click('btn-again', () => cb.onPlay());
    click('btn-go-menu', () => cb.onMenu());
  }

  show(name) {
    for (const s of SCREENS) $('screen-' + s).classList.toggle('hidden', s !== name);
    $('hud').classList.toggle('hidden', name !== 'hud' && name !== 'pause');
    $('touch-controls').classList.toggle('hidden', !(name === 'hud' && isTouch()));
  }

  text(id, value) {
    if (this.last[id] === value) return;
    this.last[id] = value;
    $(id).textContent = value;
  }

  hud(speedKmh, score, distanceM, coins) {
    this.text('hud-speed', String(speedKmh));
    this.text('hud-score', String(score));
    this.text('hud-distance', (distanceM / 1000).toFixed(2) + ' km');
    this.text('hud-coins', String(coins));
  }

  setBest(v) { this.text('menu-best', String(v)); }

  setSound(on) {
    $('btn-sound').textContent = 'Sound: ' + (on ? 'On' : 'Off');
    $('btn-sound').setAttribute('aria-pressed', String(on));
  }

  buildCars(colors, selected) {
    const box = $('car-options');
    box.innerHTML = '';
    colors.forEach((c, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'car-opt' + (i === selected ? ' selected' : '');
      b.style.setProperty('--car', '#' + c.hex.toString(16).padStart(6, '0'));
      b.textContent = c.name;
      b.addEventListener('click', () => {
        box.querySelectorAll('.car-opt').forEach((n) => n.classList.remove('selected'));
        b.classList.add('selected');
        this.cb.onCar(i);
      });
      box.appendChild(b);
    });
  }

  toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => t.classList.remove('show'), 900);
  }

  gameOver(r) {
    $('go-score').textContent = r.score;
    $('go-distance').textContent = (r.distance / 1000).toFixed(2) + ' km';
    $('go-coins').textContent = r.coins;
    $('go-best').textContent = r.best;
    $('go-newbest').classList.toggle('hidden', !r.newBest);
    this.show('gameover');
  }

  showError() {
    SCREENS.forEach((s) => $('screen-' + s).classList.add('hidden'));
    $('hud').classList.add('hidden');
    $('touch-controls').classList.add('hidden');
    $('webgl-error').classList.remove('hidden');
  }

  dispose() { this.cleanups.forEach((f) => f()); this.cleanups = []; }
}
