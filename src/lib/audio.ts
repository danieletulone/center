/* ============================================================
   CENTER — procedural sound
   Every sound is synthesised with WebAudio at runtime: no asset
   downloads, no licensing. Hushed and ritual — low drones, glassy
   bells, filtered noise for impacts. Lazily unlocked on the first
   user gesture (browser autoplay policy).
   ============================================================ */

type Tone = string | undefined;

const PITCH: Record<string, number> = { fire: 110, ice: 523.25, arcane: 196, flux: 392, mono: 261.63 };

class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private reverb: ConvolverNode | null = null;
  private enabled = true;
  private musicOn = true;
  private droneStarted = false;
  private lastPlay: Record<string, number> = {};

  private ensure(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.55;
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.ratio.value = 4;
      this.master.connect(comp).connect(this.ctx.destination);
      this.reverb = this.ctx.createConvolver();
      this.reverb.buffer = this.impulse(2.8);
      const wet = this.ctx.createGain();
      wet.gain.value = 0.32;
      this.reverb.connect(wet).connect(this.master);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0;
      this.musicGain.connect(this.master);
      this.musicGain.connect(this.reverb);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  private impulse(seconds: number) {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    return buf;
  }

  private noise(dur: number) {
    const ctx = this.ctx!;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    return src;
  }

  private out(gain: GainNode, wet = true) {
    gain.connect(this.master!);
    if (wet) gain.connect(this.reverb!);
  }

  private tone(freq: number, dur: number, opts: { type?: OscillatorType; vol?: number; attack?: number; glide?: number; delay?: number; wet?: boolean } = {}) {
    const ctx = this.ctx!;
    const t0 = ctx.currentTime + (opts.delay ?? 0);
    const o = ctx.createOscillator();
    o.type = opts.type ?? 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (opts.glide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * opts.glide), t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(opts.vol ?? 0.2, t0 + (opts.attack ?? 0.01));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    this.out(g, opts.wet ?? true);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  private hiss(dur: number, opts: { freq?: number; q?: number; vol?: number; type?: BiquadFilterType; sweep?: number; delay?: number } = {}) {
    const ctx = this.ctx!;
    const t0 = ctx.currentTime + (opts.delay ?? 0);
    const src = this.noise(dur);
    const f = ctx.createBiquadFilter();
    f.type = opts.type ?? 'bandpass';
    f.frequency.setValueAtTime(opts.freq ?? 1200, t0);
    if (opts.sweep) f.frequency.exponentialRampToValueAtTime(opts.sweep, t0 + dur);
    f.Q.value = opts.q ?? 1;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(opts.vol ?? 0.2, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f).connect(g);
    this.out(g);
    src.start(t0);
  }

  setEnabled(v: boolean) {
    this.enabled = v;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(v ? 0.55 : 0, this.ctx.currentTime, 0.05);
  }

  setMusic(v: boolean) {
    this.musicOn = v;
    if (this.musicGain && this.ctx) this.musicGain.gain.setTargetAtTime(v ? 0.05 : 0, this.ctx.currentTime, 0.8);
  }

  /** Start the ambient drone (call from a user gesture). */
  unlock() {
    const ctx = this.ensure();
    if (!ctx || this.droneStarted) return;
    this.droneStarted = true;
    const freqs = [55, 82.41, 110.0, 164.81];
    freqs.forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = i % 2 ? 'triangle' : 'sine';
      o.frequency.value = f;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.05 + i * 0.03;
      const lg = ctx.createGain();
      lg.gain.value = f * 0.004;
      lfo.connect(lg).connect(o.frequency);
      const g = ctx.createGain();
      g.gain.value = 0.25 / (i + 1);
      const filt = ctx.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.value = 600;
      o.connect(filt).connect(g).connect(this.musicGain!);
      o.start();
      lfo.start();
    });
    this.setMusic(this.musicOn);
  }

  play(name: string, tone?: Tone, power = 1) {
    if (!this.enabled) return;
    const ctx = this.ensure();
    if (!ctx) return;
    const now = performance.now();
    if (now - (this.lastPlay[name] ?? 0) < 35) return; // de-flam bursts
    this.lastPlay[name] = now;
    const base = PITCH[tone ?? 'mono'] ?? 261.63;
    switch (name) {
      case 'hover':
        this.tone(1760, 0.08, { vol: 0.015, wet: false });
        break;
      case 'select':
        this.tone(880, 0.18, { vol: 0.05, type: 'triangle' });
        this.tone(1318.5, 0.25, { vol: 0.03, delay: 0.04 });
        break;
      case 'deny':
        this.tone(130, 0.22, { vol: 0.08, type: 'square', glide: 0.7, wet: false });
        break;
      case 'cast':
        this.hiss(0.35, { freq: 400, sweep: 4000, vol: 0.06, q: 0.8 });
        this.tone(base * 2, 0.6, { vol: 0.06, type: 'triangle' });
        break;
      case 'bolt':
        this.hiss(0.5, { freq: 3000, sweep: 300, vol: 0.05, q: 2 });
        this.tone(base * 4, 0.45, { vol: 0.03, glide: 0.5 });
        break;
      case 'impact':
        this.tone(70, 0.6, { vol: 0.18 + Math.min(power, 6) * 0.03, glide: 0.4, wet: false });
        this.hiss(0.5 + power * 0.05, { freq: 900, sweep: 120, vol: 0.12, type: 'lowpass' });
        break;
      case 'pull':
        this.tone(base, 0.9, { vol: 0.06, attack: 0.15, glide: 1.5 });
        this.tone(base * 1.5, 1.1, { vol: 0.04, attack: 0.25, glide: 1.5, delay: 0.08 });
        break;
      case 'block':
        this.tone(1046.5, 0.5, { vol: 0.06, type: 'triangle' });
        this.tone(1568, 0.7, { vol: 0.04, delay: 0.02 });
        break;
      case 'shield':
        this.tone(196, 1.2, { vol: 0.07, attack: 0.2 });
        this.tone(392, 1.0, { vol: 0.04, attack: 0.3 });
        break;
      case 'freeze':
        [2093, 2637, 3136].forEach((f, i) => this.tone(f, 0.6, { vol: 0.025, delay: i * 0.05 }));
        this.hiss(0.6, { freq: 6000, vol: 0.03, type: 'highpass' });
        break;
      case 'gain':
        this.tone(base * 2, 0.35, { vol: 0.025, type: 'sine' });
        break;
      case 'swap':
        this.hiss(0.8, { freq: 200, sweep: 2000, vol: 0.06 });
        this.tone(220, 0.8, { vol: 0.05, glide: 2 });
        break;
      case 'shockwave':
        this.tone(45, 1.8, { vol: 0.22, glide: 0.5, wet: false });
        this.hiss(1.6, { freq: 1800, sweep: 80, vol: 0.12, type: 'lowpass' });
        this.tone(base, 2.2, { vol: 0.05, attack: 0.3 });
        break;
      case 'genesis':
        [261.63, 329.63, 392, 523.25, 659.25].forEach((f, i) => this.tone(f, 2.6, { vol: 0.05, attack: 0.4, delay: i * 0.12 }));
        this.hiss(2.4, { freq: 8000, vol: 0.03, type: 'highpass' });
        break;
      case 'turn':
        this.tone(220, 1.4, { vol: 0.06, attack: 0.2 });
        this.tone(330, 1.6, { vol: 0.04, attack: 0.3, delay: 0.15 });
        break;
      case 'endturn':
        this.tone(330, 0.5, { vol: 0.04, glide: 0.75 });
        break;
      case 'victory':
        [220, 277.18, 329.63, 440, 554.37, 659.25].forEach((f, i) => this.tone(f, 3.2, { vol: 0.06, attack: 0.3, delay: i * 0.18 }));
        break;
      case 'defeat':
        [220, 207.65, 164.81, 110].forEach((f, i) => this.tone(f, 2.8, { vol: 0.07, attack: 0.2, delay: i * 0.3, type: 'triangle' }));
        break;
    }
  }
}

export const sfx = new Sfx();
