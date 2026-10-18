const KEY_MAP = {
  KeyW: 'accel', ArrowUp: 'accel', KeyS: 'brake', ArrowDown: 'brake',
  KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right'
};
const ACTIONS = ['left', 'right', 'accel', 'brake'];
const TOUCH_BTNS = { 'touch-left': 'left', 'touch-right': 'right', 'touch-accel': 'accel', 'touch-brake': 'brake' };

export class Controls {
  constructor({ onPause }) {
    this.state = { left: false, right: false, accel: false, brake: false };
    this.touch = { left: false, right: false, accel: false, brake: false };
    this.keys = new Set();
    this.cleanups = [];

    const on = (el, ev, fn, opts) => {
      el.addEventListener(ev, fn, opts);
      this.cleanups.push(() => el.removeEventListener(ev, fn, opts));
    };

    on(window, 'keydown', (e) => {
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (!e.repeat) onPause();
        e.preventDefault();
        return;
      }
      if (KEY_MAP[e.code]) { this.keys.add(e.code); this.recalc(); e.preventDefault(); }
    });
    on(window, 'keyup', (e) => {
      if (KEY_MAP[e.code]) { this.keys.delete(e.code); this.recalc(); }
    });
    on(window, 'blur', () => this.reset());

    for (const [id, action] of Object.entries(TOUCH_BTNS)) {
      const el = document.getElementById(id);
      if (!el) continue;
      const press = (e) => {
        e.preventDefault();
        if (el.setPointerCapture) try { el.setPointerCapture(e.pointerId); } catch { /* ignore */ }
        this.touch[action] = true; el.classList.add('down'); this.recalc();
      };
      const release = () => { this.touch[action] = false; el.classList.remove('down'); this.recalc(); };
      on(el, 'pointerdown', press);
      for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture', 'pointerleave']) on(el, ev, release);
      on(el, 'contextmenu', (e) => e.preventDefault());
    }
    const pad = document.getElementById('touch-controls');
    if (pad) on(pad, 'touchmove', (e) => e.preventDefault(), { passive: false });
  }

  recalc() {
    for (const a of ACTIONS) {
      let k = false;
      for (const c of this.keys) if (KEY_MAP[c] === a) k = true;
      this.state[a] = k || this.touch[a];
    }
  }

  reset() {
    this.keys.clear();
    for (const a of ACTIONS) this.touch[a] = false;
    document.querySelectorAll('.touch-btn.down').forEach((b) => b.classList.remove('down'));
    this.recalc();
  }

  dispose() { this.cleanups.forEach((f) => f()); this.cleanups = []; }
}
