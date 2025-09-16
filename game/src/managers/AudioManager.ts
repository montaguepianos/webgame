import type { NoteName } from '@melody-dash/shared';
import MusicPlayer from '../audio/MusicPlayer';
import { AUTO_TRACK_ID, musicTracks, noteSources } from '../audio/assets';

export interface AudioState {
  volume: number;
  muted: boolean;
  song: string;
}

const NOTE_NAMES = Object.keys(noteSources) as NoteName[];

class AudioManager {
  private context?: AudioContext;

  private masterGain?: GainNode;

  private musicGain?: GainNode;

  private sfxGain?: GainNode;

  private musicPlayer?: MusicPlayer;

  private noteBuffers: Map<NoteName, AudioBuffer> = new Map();

  private state: AudioState = {
    volume: 0.7,
    muted: false,
    song: AUTO_TRACK_ID,
  };

  private unlocked = false;

  async initialize(): Promise<void> {
    if (this.context) {
      return;
    }
    const legacyContext = (
      window as Window & {
        webkitAudioContext?: typeof AudioContext;
      }
    ).webkitAudioContext;
    const AudioContextClass = window.AudioContext ?? legacyContext;
    if (!AudioContextClass) {
      return;
    }
    this.context = new AudioContextClass();
    try {
      await this.context.resume();
      this.unlocked = true;
    } catch (error) {
      this.unlocked = false;
    }

    this.masterGain = this.context.createGain();
    this.musicGain = this.context.createGain();
    this.sfxGain = this.context.createGain();

    this.masterGain.gain.value = this.state.muted ? 0 : this.state.volume;
    this.musicGain.gain.value = 0.6;
    this.sfxGain.gain.value = 1;

    this.musicGain.connect(this.masterGain);
    this.sfxGain.connect(this.masterGain);
    this.masterGain.connect(this.context.destination);

    this.musicPlayer = new MusicPlayer(this.context);
    this.musicPlayer.connect(this.musicGain);
    this.musicPlayer.setBaseVolume(0.6);

    await this.prepareNoteBuffers();
  }

  async unlock(): Promise<void> {
    if (!this.context) {
      await this.initialize();
      return;
    }
    if (this.unlocked) {
      return;
    }
    await this.context.resume();
    this.unlocked = true;
  }

  get volume(): number {
    return this.state.volume;
  }

  get muted(): boolean {
    return this.state.muted;
  }

  get song(): string {
    return this.state.song;
  }

  getTracks(): { id: string; title: string; composer: string }[] {
    return [
      {
        id: AUTO_TRACK_ID,
        title: 'Auto rotation',
        composer: 'Cycle each run',
      },
      ...musicTracks.map((track) => ({
        id: track.id,
        title: track.title,
        composer: track.composer,
      })),
    ];
  }

  getCurrentTrackMeta() {
    const activeId =
      this.state.song === AUTO_TRACK_ID
        ? (this.musicPlayer?.getCurrentTrack() ?? musicTracks[0]?.id)
        : this.state.song;
    return musicTracks.find((track) => track.id === activeId);
  }

  async setVolume(nextVolume: number): Promise<void> {
    this.state.volume = Math.max(0, Math.min(1, nextVolume));
    if (!this.context) {
      await this.initialize();
    }
    if (this.masterGain && !this.state.muted) {
      const now = this.context?.currentTime ?? 0;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.linearRampToValueAtTime(this.state.volume, now + 0.1);
    }
  }

  async toggleMute(force?: boolean): Promise<void> {
    const nextMuted = typeof force === 'boolean' ? force : !this.state.muted;
    this.state.muted = nextMuted;
    if (!this.context) {
      await this.initialize();
    }
    if (this.masterGain) {
      const now = this.context?.currentTime ?? 0;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.linearRampToValueAtTime(nextMuted ? 0 : this.state.volume, now + 0.08);
    }
  }

  async setSong(song: string): Promise<void> {
    this.state.song = song;
    if (!this.context) {
      await this.initialize();
    }
    if (this.musicPlayer && this.unlocked) {
      await this.musicPlayer.play(song);
    }
  }

  async startLoop(): Promise<void> {
    if (!this.context) {
      await this.initialize();
    }
    if (!this.musicPlayer) {
      return;
    }
    if (!this.unlocked) {
      await this.unlock();
    }
    await this.musicPlayer.play(this.state.song);
  }

  stopLoop(): void {
    this.musicPlayer?.stop();
  }

  async playNote(note: NoteName, velocity = 1): Promise<void> {
    if (!this.context) {
      await this.initialize();
    }
    if (!this.context || !this.sfxGain) {
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
    gain.connect(this.sfxGain);
    source.start(0);
    this.musicPlayer?.duck(0.18, 0.4);
  }

  async playMotif(notes: NoteName[]): Promise<void> {
    if (!this.context) {
      await this.initialize();
    }
    if (!this.context || !this.sfxGain) {
      return;
    }
    let when = this.context.currentTime + 0.1;
    const bpm = this.getCurrentTrackMeta()?.bpm ?? 96;
    const beatDuration = 60 / bpm;
    const step = beatDuration / 2;
    notes.forEach((note) => {
      const buffer = this.noteBuffers.get(note);
      if (!buffer) {
        return;
      }
      const source = this.context!.createBufferSource();
      source.buffer = buffer;
      const gain = this.context!.createGain();
      gain.gain.value = this.state.muted ? 0 : this.state.volume * 0.9;
      source.connect(gain);
      gain.connect(this.sfxGain!);
      source.start(when);
      when += step;
    });
    this.musicPlayer?.duck(0.35, 0.6);
  }

  private async prepareNoteBuffers(): Promise<void> {
    if (!this.context || this.noteBuffers.size > 0) {
      return;
    }
    await Promise.all(
      NOTE_NAMES.map(async (note) => {
        const source = noteSources[note];
        const urls = [source.ogg, source.mp3];
        const buffer = await this.fetchAudioBuffer(urls);
        if (buffer) {
          this.noteBuffers.set(note, buffer);
        }
      }),
    );
  }

  private async fetchAudioBuffer(urls: string[]): Promise<AudioBuffer | undefined> {
    if (!this.context) {
      return undefined;
    }
    for (const url of urls) {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch ${url}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const decoded = await this.context.decodeAudioData(arrayBuffer.slice(0));
        return decoded;
      } catch (error) {
        // try next
      }
    }
    return undefined;
  }
}

export default AudioManager;
