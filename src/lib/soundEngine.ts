/**
 * Browser-Native Adaptive Cybernetic Sound Engine
 * Uses Web Audio API with zero external audio assets.
 * Pure real-time procedural sound synthesis (oscillators, biquad filters, gains).
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private activeSirenOsc1: OscillatorNode | null = null;
  private activeSirenOsc2: OscillatorNode | null = null;
  private activeSirenGain: GainNode | null = null;
  private sirenTimeout: any = null;

  constructor() {
    // Lazy init audio context on first user interaction
  }

  private init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stopPoliceSiren();
    }
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  /**
   * String Pluck: Smooth organic pentatonic string pluck when plucking spider web strands
   */
  public playWebPluck(frequency = 440, intensity = 1.0) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      // Soft sine/triangle blend
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(frequency, now);
      osc.frequency.exponentialRampToValueAtTime(frequency * 0.96, now + 0.22);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, now);
      filter.frequency.exponentialRampToValueAtTime(250, now + 0.3);

      const vol = Math.min(0.08 * intensity, 0.12);
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.31);
    } catch {
      // Audio safety fallback
    }
  }

  /**
   * Node Pulse Hit: Resonance chime when data packet is triggered deliberately by user
   */
  public playNodePulse(isEmergency = false) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = isEmergency ? 'sawtooth' : 'sine';
      const baseFreq = isEmergency ? 880 : 523.25;
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.3, now + 0.1);

      gain.gain.setValueAtTime(isEmergency ? 0.12 : 0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.17);
    } catch {
      // Audio safety fallback
    }
  }

  /**
   * Shockwave Core Boom: Sub-bass resonance when energy hits the central cyber shield
   */
  public playCoreImpact(intensity = 1.0) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const subOsc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(100, now);
      osc.frequency.exponentialRampToValueAtTime(32, now + 0.35);

      subOsc.type = 'triangle';
      subOsc.frequency.setValueAtTime(50, now);
      subOsc.frequency.exponentialRampToValueAtTime(20, now + 0.4);

      gain.gain.setValueAtTime(0.15 * intensity, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);

      osc.connect(gain);
      subOsc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      subOsc.start(now);
      osc.stop(now + 0.41);
      subOsc.stop(now + 0.41);
    } catch {
      // Audio safety fallback
    }
  }

  /**
   * Authentic Police Siren (Wail & Yelp Modulation)
   * Modulates dual oscillators between 650Hz and 1450Hz over 3.5 seconds.
   */
  public playPoliceSiren(durationSeconds = 3.5) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    this.stopPoliceSiren();

    try {
      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc1.type = 'sawtooth';
      osc2.type = 'sine';

      // Siren wail cycles: ramp up and down
      const cycleTime = 0.55; // Fast wail cycle
      const cycles = Math.ceil(durationSeconds / cycleTime);

      for (let i = 0; i < cycles; i++) {
        const tStart = now + i * cycleTime;
        const tMid = tStart + cycleTime * 0.5;
        const tEnd = tStart + cycleTime;

        // Primary Siren Tone (600Hz -> 1350Hz -> 600Hz)
        osc1.frequency.setValueAtTime(620, tStart);
        osc1.frequency.linearRampToValueAtTime(1380, tMid);
        osc1.frequency.linearRampToValueAtTime(620, tEnd);

        // Secondary Harmonic Tone (Detuned for realism)
        osc2.frequency.setValueAtTime(625, tStart);
        osc2.frequency.linearRampToValueAtTime(1390, tMid);
        osc2.frequency.linearRampToValueAtTime(625, tEnd);
      }

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2400, now);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.15);
      gain.gain.setValueAtTime(0.18, now + durationSeconds - 0.4);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSeconds);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + durationSeconds + 0.05);
      osc2.stop(now + durationSeconds + 0.05);

      this.activeSirenOsc1 = osc1;
      this.activeSirenOsc2 = osc2;
      this.activeSirenGain = gain;

      this.sirenTimeout = setTimeout(() => {
        this.stopPoliceSiren();
      }, (durationSeconds + 0.1) * 1000);
    } catch {
      // Audio safety fallback
    }
  }

  public stopPoliceSiren() {
    if (this.sirenTimeout) {
      clearTimeout(this.sirenTimeout);
      this.sirenTimeout = null;
    }
    if (this.activeSirenGain && this.ctx) {
      try {
        this.activeSirenGain.gain.setValueAtTime(0, this.ctx.currentTime);
      } catch {}
    }
    if (this.activeSirenOsc1) {
      try {
        this.activeSirenOsc1.stop();
        this.activeSirenOsc1.disconnect();
      } catch {}
      this.activeSirenOsc1 = null;
    }
    if (this.activeSirenOsc2) {
      try {
        this.activeSirenOsc2.stop();
        this.activeSirenOsc2.disconnect();
      } catch {}
      this.activeSirenOsc2 = null;
    }
  }
}

export const sound = new SoundEngine();
