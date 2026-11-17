class BuzzerEngine {
  private ctx: AudioContext | null = null;
  private voice: { out: GainNode; oscillators: OscillatorNode[]; kind: 'game' | 'shot' } | null = null;

  unlock() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  get ready(): boolean {
    return !!this.ctx && this.ctx.state === 'running';
  }

  sync(shouldSound: boolean, kind: 'game' | 'shot' = 'game') {
    if (!shouldSound) return this.stop();
    if (this.voice && this.voice.kind !== kind) this.stop();
    this.start(kind);
  }

  start(kind: 'game' | 'shot' = 'game') {
    if (this.voice || !this.ready || !this.ctx) return;
    const c = this.ctx;
    const t = c.currentTime;
    const shot = kind === 'shot';

    const out = c.createGain();
    out.gain.setValueAtTime(0, t);
    out.gain.linearRampToValueAtTime(0.28, t + 0.02);

    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2200;

    out.connect(c.destination);
    filter.connect(out);

    const tones: Array<[OscillatorType, number]> = shot
      ? [
          ['sawtooth', 294],
          ['sawtooth', 297],
          ['square', 588],
        ]
      : [
          ['sawtooth', 233],
          ['sawtooth', 236],
          ['square', 466],
        ];

    const oscillators = tones.map(([type, hz]) => {
      const o = c.createOscillator();
      o.type = type;
      o.frequency.value = hz;
      o.connect(filter);
      o.start();
      return o;
    });

    this.voice = { out, oscillators, kind };
  }

  stop() {
    if (!this.voice || !this.ctx) return;
    const { out, oscillators } = this.voice;
    const t = this.ctx.currentTime;
    out.gain.cancelScheduledValues(t);
    out.gain.setTargetAtTime(0, t, 0.03);
    oscillators.forEach((o) => {
      try {
        o.stop(t + 0.2);
      } catch {
        // already stopped
      }
    });
    this.voice = null;
  }
}

export const Buzzer = new BuzzerEngine();

export function haptic(ms = 15) {
  try {
    if (navigator.vibrate) navigator.vibrate(ms);
  } catch {
    // unsupported
  }
}