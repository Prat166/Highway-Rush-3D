export class GameAudio {
  constructor(enabled) {
    this.enabled = enabled;
    this.ctx = null;
    this.eng = null;
  }

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return true;
  }

  setEnabled(v) {
    this.enabled = v;
    if (!v) this.stopEngine();
  }

  startEngine() {
    if (!this.enabled || this.eng || !this.ensure()) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = 60;
    filter.type = 'lowpass';
    filter.frequency.value = 500;
    gain.gain.value = 0.04;
    osc.connect(filter).connect(gain).connect(ctx.destination);
    osc.start();
    this.eng = { osc, gain, filter };
  }

  setSpeed(s) {
    if (this.eng) this.eng.osc.frequency.setTargetAtTime(55 + s * 3.2, this.ctx.currentTime, 0.05);
  }

  stopEngine() {
    if (!this.eng) return;
    try { this.eng.osc.stop(); this.eng.gain.disconnect(); } catch { /* ignore */ }
    this.eng = null;
  }

  coin() {
    if (!this.enabled || !this.ensure()) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'square';
    o.frequency.setValueAtTime(880, t);
    o.frequency.setValueAtTime(1320, t + 0.06);
    g.gain.setValueAtTime(0.05, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    o.connect(g).connect(ctx.destination);
    o.start(t); o.stop(t + 0.2);
  }

  crash() {
    if (!this.enabled || !this.ensure()) return;
    const ctx = this.ctx, n = Math.floor(ctx.sampleRate * 0.6);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 2;
    const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = buf;
    f.type = 'lowpass';
    f.frequency.value = 900;
    g.gain.value = 0.5;
    src.connect(f).connect(g).connect(ctx.destination);
    src.start();
  }
}
