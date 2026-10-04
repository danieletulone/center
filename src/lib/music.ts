/* ============================================================
   CENTER — score
   Two layers on one music bus:
   1. A procedural suspense score (always available, no assets):
      sub drone with a breathing filter, a dissonant pad, a
      heartbeat that quickens with tension, a ticking ostinato
      in the late game, a distant toll and a noise riser.
   2. Optional recorded tracks in /public/audio (e.g. made with
      Suno): title.mp3, match.mp3, tension.mp3, victory.mp3,
      defeat.mp3 — list the ones present in /public/audio/tracks.json. When a track
      plays, the procedural layer ducks underneath it.
   Tension (0..1) is driven by the match: how close anyone is to
   winning, Convergence, the final rounds.
   ============================================================ */

export type Scene = 'title' | 'match' | 'off';
type TrackName = 'title' | 'match' | 'tension' | 'victory' | 'defeat';
const TRACKS: TrackName[] = ['title', 'match', 'tension', 'victory', 'defeat'];

export class Score {
  private ctx: AudioContext;
  private out: GainNode; // volume
  private proc: GainNode; // procedural layer (ducks under tracks)
  private trackBus: GainNode;
  private padGain: GainNode;
  private dissonance: GainNode;
  private riserGain: GainNode;
  private droneFilter: BiquadFilterNode;
  private tension = 0.15;
  private target = 0.15;
  private scene: Scene = 'off';
  private nextBeat = 0;
  private nextTick = 0;
  private nextToll = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private tracks: Partial<Record<TrackName, { el: HTMLAudioElement; gain: GainNode }>> = {};
  private volume = 0.8;
  private enabled = true;

  constructor(ctx: AudioContext, destination: AudioNode, reverb: AudioNode) {
    this.ctx = ctx;
    this.out = ctx.createGain();
    this.out.gain.value = 0;
    this.out.connect(destination);
    this.proc = ctx.createGain();
    this.proc.gain.value = 1;
    this.proc.connect(this.out);
    const wet = ctx.createGain();
    wet.gain.value = 0.5;
    this.proc.connect(wet).connect(reverb);
    this.trackBus = ctx.createGain();
    this.trackBus.connect(this.out);

    // --- drone: A1 saw + E2 + detuned A2 through a breathing low-pass
    this.droneFilter = ctx.createBiquadFilter();
    this.droneFilter.type = 'lowpass';
    this.droneFilter.frequency.value = 180;
    this.droneFilter.Q.value = 6;
    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.32;
    this.droneFilter.connect(droneGain).connect(this.proc);
    for (const [f, type, det] of [
      [55, 'sawtooth', 0],
      [55, 'sawtooth', 7],
      [82.41, 'sine', 0],
      [110, 'triangle', -5],
    ] as const) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f;
      o.detune.value = det;
      o.connect(this.droneFilter);
      o.start();
    }
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoAmt = ctx.createGain();
    lfoAmt.gain.value = 90;
    lfo.connect(lfoAmt).connect(this.droneFilter.frequency);
    lfo.start();

    // --- pad: A minor (A3 C4 E4) with slow tremolo; dissonant Bb3 + Eb4 fade in with tension
    this.padGain = ctx.createGain();
    this.padGain.gain.value = 0.05;
    const padFilter = ctx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.value = 1400;
    this.padGain.connect(padFilter).connect(this.proc);
    const trem = ctx.createOscillator();
    trem.frequency.value = 0.18;
    const tremAmt = ctx.createGain();
    tremAmt.gain.value = 0.025;
    trem.connect(tremAmt).connect(this.padGain.gain);
    trem.start();
    for (const f of [220, 261.63, 329.63, 440]) this.voice(f, this.padGain);
    this.dissonance = ctx.createGain();
    this.dissonance.gain.value = 0;
    this.dissonance.connect(padFilter);
    for (const f of [233.08, 311.13, 466.16]) this.voice(f, this.dissonance);

    // --- riser: band-passed noise
    const len = ctx.sampleRate * 4;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    noise.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 900;
    bp.Q.value = 3;
    const sweep = ctx.createOscillator();
    sweep.frequency.value = 0.05;
    const sweepAmt = ctx.createGain();
    sweepAmt.gain.value = 600;
    sweep.connect(sweepAmt).connect(bp.frequency);
    sweep.start();
    this.riserGain = ctx.createGain();
    this.riserGain.gain.value = 0;
    noise.connect(bp).connect(this.riserGain).connect(this.proc);
    noise.start();

    void this.loadTracks();
  }

  private voice(f: number, dest: AudioNode) {
    for (const det of [-6, 6]) {
      const o = this.ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = f;
      o.detune.value = det;
      o.connect(dest);
      o.start();
    }
  }

  /** Load the tracks listed in /audio/tracks.json (e.g. ["title", "match"]). */
  private async loadTracks() {
    let names: TrackName[] = [];
    try {
      const res = await fetch('/audio/tracks.json', { cache: 'no-cache' });
      if (res.ok) names = ((await res.json()) as string[]).filter((n): n is TrackName => (TRACKS as string[]).includes(n));
    } catch {
      /* no manifest — procedural score only */
    }
    for (const name of names) {
      const el = new Audio(`/audio/${name}.mp3`);
      el.preload = 'auto';
      el.loop = name !== 'victory' && name !== 'defeat';
      const src = this.ctx.createMediaElementSource(el);
      const gain = this.ctx.createGain();
      gain.gain.value = 0;
      src.connect(gain).connect(this.trackBus);
      this.tracks[name] = { el, gain };
    }
    this.applyScene();
  }

  hasTracks() {
    return Object.keys(this.tracks).length > 0;
  }

  start() {
    if (this.timer) return;
    const now = this.ctx.currentTime;
    this.nextBeat = now + 0.5;
    this.nextTick = now + 1;
    this.nextToll = now + 6;
    this.timer = setInterval(() => this.schedule(), 90);
    this.applyLevel();
  }

  setEnabled(v: boolean) {
    this.enabled = v;
    this.applyLevel();
    if (!v) for (const t of Object.values(this.tracks)) t?.el.pause();
    else this.applyScene();
  }

  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
    this.applyLevel();
  }

  private applyLevel() {
    const v = this.enabled ? this.volume : 0;
    this.out.gain.setTargetAtTime(v * 0.9, this.ctx.currentTime, 0.6);
  }

  setScene(s: Scene) {
    if (s === this.scene) return;
    this.scene = s;
    if (s === 'title') this.target = 0.12;
    this.applyScene();
  }

  /** 0 calm … 1 someone is about to claim the Center */
  setTension(t: number) {
    this.target = Math.max(0, Math.min(1, t));
  }

  /** End of match: duck the loop and play the stinger (track if present). */
  stinger(won: boolean) {
    const name: TrackName = won ? 'victory' : 'defeat';
    const now = this.ctx.currentTime;
    this.target = won ? 0.2 : 0.35;
    for (const k of ['match', 'tension', 'title'] as TrackName[]) this.fade(k, 0, 1.2);
    const t = this.tracks[name];
    if (t && this.enabled) {
      t.el.currentTime = 0;
      void t.el.play().catch(() => {});
      t.gain.gain.setTargetAtTime(1, now, 0.05);
      this.proc.gain.setTargetAtTime(0.15, now, 0.5);
    }
  }

  private fade(name: TrackName, to: number, time = 1.5) {
    const t = this.tracks[name];
    if (!t) return;
    t.gain.gain.setTargetAtTime(to, this.ctx.currentTime, time / 3);
    if (to > 0 && t.el.paused && this.enabled) void t.el.play().catch(() => {});
    if (to === 0) setTimeout(() => t.gain.gain.value < 0.02 && t.el.pause(), time * 1200);
  }

  private applyScene() {
    const has = (n: TrackName) => !!this.tracks[n];
    if (this.scene === 'title') {
      this.fade('title', 1);
      this.fade('match', 0);
      this.fade('tension', 0);
    } else if (this.scene === 'match') {
      this.fade('title', 0);
      for (const k of ['victory', 'defeat'] as TrackName[]) this.fade(k, 0, 0.6);
      this.mixMatch();
    } else {
      for (const k of TRACKS) this.fade(k, 0);
    }
    const trackPlaying = (this.scene === 'title' && has('title')) || (this.scene === 'match' && (has('match') || has('tension')));
    this.proc.gain.setTargetAtTime(trackPlaying ? 0.25 : 1, this.ctx.currentTime, 1);
  }

  private mixMatch() {
    if (this.scene !== 'match') return;
    const hi = this.tracks.tension ? Math.max(0, Math.min(1, (this.tension - 0.45) / 0.3)) : 0;
    this.fade('match', 1 - hi * 0.85, 2);
    if (this.tracks.tension) this.fade('tension', hi, 2);
  }

  private schedule() {
    const ctx = this.ctx;
    const now = ctx.currentTime;
    // ease tension
    this.tension += (this.target - this.tension) * 0.03;
    const T = this.tension;
    this.padGain.gain.setTargetAtTime(0.045 + T * 0.04, now, 1.5);
    this.dissonance.gain.setTargetAtTime(Math.max(0, T - 0.3) * 0.07, now, 1.5);
    this.riserGain.gain.setTargetAtTime(Math.max(0, T - 0.4) * 0.09, now, 1.5);
    this.droneFilter.frequency.setTargetAtTime(160 + T * 320, now, 2);
    this.mixMatch();

    const ahead = now + 0.25;
    // heartbeat: lub-dub, quicker with tension
    const period = 1.6 - T * 0.85;
    while (this.nextBeat < ahead) {
      const v = 0.18 + T * 0.32;
      this.thump(this.nextBeat, v);
      this.thump(this.nextBeat + 0.22, v * 0.65);
      this.nextBeat += period;
    }
    // ticking ostinato: late game only
    while (this.nextTick < ahead) {
      if (T > 0.5) this.tick(this.nextTick, (T - 0.5) * 0.12);
      this.nextTick += period / 4;
    }
    // distant toll
    if (this.nextToll < ahead) {
      this.toll(this.nextToll, 0.08 + T * 0.06);
      this.nextToll += 13 + Math.random() * 9 - T * 6;
    }
  }

  private thump(t: number, vol: number) {
    const o = this.ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(62, t);
    o.frequency.exponentialRampToValueAtTime(34, t + 0.25);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
    o.connect(g).connect(this.proc);
    o.start(t);
    o.stop(t + 0.4);
  }

  private tick(t: number, vol: number) {
    const o = this.ctx.createOscillator();
    o.type = 'square';
    o.frequency.value = 1760;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 2400;
    f.Q.value = 8;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    o.connect(f).connect(g).connect(this.proc);
    o.start(t);
    o.stop(t + 0.08);
  }

  private toll(t: number, vol: number) {
    // inharmonic bell partials around a low D
    for (const [ratio, amp, dec] of [
      [1, 1, 6],
      [2.76, 0.5, 4],
      [5.4, 0.25, 2.5],
      [0.5, 0.6, 7],
    ] as const) {
      const o = this.ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = 73.42 * ratio;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol * amp, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
      o.connect(g).connect(this.proc);
      o.start(t);
      o.stop(t + dec + 0.1);
    }
  }
}
