import type { NoteName } from '@melody-dash/shared';

const NOTE_FREQUENCIES: Record<NoteName, number> = {
  C3: 130.81,
  D3: 146.83,
  E3: 164.81,
  F3: 174.61,
  G3: 196,
  A3: 220,
  B3: 246.94,
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  F4: 349.23,
  G4: 392,
  A4: 440,
  B4: 493.88,
  C5: 523.25,
};

const LOOP_BEATS_PER_MINUTE = 100;
const NOTE_DURATION = 0.4;

export interface AudioState {
  volume: number;
  muted: boolean;
}

class AudioManager {
  private context?: AudioContext;

  private masterGain?: GainNode;

  private noteBuffers: Map<NoteName, AudioBuffer> = new Map();

  private loopBuffer?: AudioBuffer;

  private loopSource?: AudioBufferSourceNode;

  private state: AudioState = {
    volume: 0.7,
    muted: false,
  };

  async initialize(): Promise<void> {
    if (!this.context) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        return;
      }

      this.context = new AudioContextClass();
      await this.context.resume();
      this.masterGain = this.context.createGain();
      this.masterGain.gain.value = this.state.muted ? 0 : this.state.volume;
      this.masterGain.connect(this.context.destination);
      await this.prepareNoteBuffers();
      await this.prepareLoop();
    }
  }

  get audioContext(): AudioContext | undefined {
    return this.context;
  }

  get muted(): boolean {
    return this.state.muted;
  }

  get volume(): number {
    return this.state.volume;
  }

  async setVolume(nextVolume: number): Promise<void> {
    this.state.volume = Math.max(0, Math.min(1, nextVolume));
    if (!this.context) {
      await this.initialize();
    }
    if (this.masterGain && !this.state.muted) {
      this.masterGain.gain.value = this.state.volume;
    }
  }

  async toggleMute(force?: boolean): Promise<void> {
    const nextMuted = typeof force === 'boolean' ? force : !this.state.muted;
    this.state.muted = nextMuted;
    if (!this.context) {
      await this.initialize();
    }
    if (this.masterGain) {
      this.masterGain.gain.value = nextMuted ? 0 : this.state.volume;
    }
  }

  async playNote(note: NoteName, velocity = 1): Promise<void> {
    if (!this.context) {
      await this.initialize();
    }
    if (!this.context || !this.masterGain) {
      return;
    }
    const buffer = this.noteBuffers.get(note);
    if (!buffer) {
      return;
    }
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    const gain = this.context.createGain();
    gain.gain.value = this.state.muted ? 0 : this.state.volume * velocity;
    source.connect(gain);
    gain.connect(this.masterGain);
    source.start();
  }

  async playMotif(notes: NoteName[]): Promise<void> {
    if (!this.context) {
      await this.initialize();
    }
    if (!this.context) {
      return;
    }
    let when = this.context.currentTime;
    const step = NOTE_DURATION;
    notes.forEach((note, index) => {
      const buffer = this.noteBuffers.get(note);
      if (!buffer) {
        return;
      }
      const source = this.context!.createBufferSource();
      source.buffer = buffer;
      const gain = this.context!.createGain();
      const velocity = Math.max(0.4, 1 - index * 0.05);
      gain.gain.value = this.state.muted ? 0 : this.state.volume * velocity;
      source.connect(gain);
      gain.connect(this.masterGain!);
      source.start(when);
      when += step;
    });
  }

  async startLoop(): Promise<void> {
    if (!this.context) {
      await this.initialize();
    }
    if (!this.context || !this.loopBuffer || this.loopSource) {
      return;
    }
    const source = this.context.createBufferSource();
    source.buffer = this.loopBuffer;
    source.loop = true;
    source.connect(this.masterGain!);
    source.start(0);
    this.loopSource = source;
  }

  stopLoop(): void {
    if (this.loopSource) {
      this.loopSource.stop();
      this.loopSource.disconnect();
      this.loopSource = undefined;
    }
  }

  private async prepareNoteBuffers(): Promise<void> {
    if (!this.context || this.noteBuffers.size > 0) {
      return;
    }
    const ctx = this.context;
    Object.entries(NOTE_FREQUENCIES).forEach(([note, freq]) => {
      const buffer = ctx.createBuffer(1, ctx.sampleRate * NOTE_DURATION, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) {
        const time = i / ctx.sampleRate;
        const envelope = Math.exp(-3 * time);
        data[i] = Math.sin(2 * Math.PI * freq * time) * envelope;
      }
      this.noteBuffers.set(note as NoteName, buffer);
    });
  }

  private async prepareLoop(): Promise<void> {
    if (!this.context || this.loopBuffer) {
      return;
    }
    const ctx = this.context;
    const secondsPerBeat = 60 / LOOP_BEATS_PER_MINUTE;
    const duration = secondsPerBeat * 8;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    const baseFreq = 110;
    for (let i = 0; i < data.length; i += 1) {
      const time = i / ctx.sampleRate;
      const beat = Math.floor(time / secondsPerBeat);
      const withinBeat = time % secondsPerBeat;
      const envelope = Math.exp(-6 * withinBeat);
      const harmonic = Math.sin(2 * Math.PI * baseFreq * time) * 0.5;
      const bell = Math.sin(2 * Math.PI * baseFreq * 2 * time) * 0.25;
      const accent = beat % 4 === 0 ? 1 : 0.6;
      data[i] = (harmonic + bell) * envelope * accent;
    }
    this.loopBuffer = buffer;
  }
}

export default AudioManager;
