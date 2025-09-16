import { musicTracks, trackSources, AUTO_TRACK_ID } from './assets';

export type TrackId = string;

interface LoadedTrack {
  id: TrackId;
  buffer: AudioBuffer;
}

class MusicPlayer {
  private context: AudioContext;

  private output: GainNode;

  private baseVolume = 0.6;

  private currentSource?: AudioBufferSourceNode;

  private currentTrack?: LoadedTrack;

  private loading: Map<TrackId, Promise<AudioBuffer>> = new Map();

  private queueIndex = 0;

  constructor(context: AudioContext) {
    this.context = context;
    this.output = this.context.createGain();
    this.output.gain.value = this.baseVolume;
    this.output.connect(this.context.destination);
  }

  connect(node: AudioNode): void {
    this.output.disconnect();
    this.output.connect(node);
  }

  getTracks() {
    return musicTracks;
  }

  getCurrentTrack(): TrackId | undefined {
    return this.currentTrack?.id;
  }

  setBaseVolume(volume: number): void {
    this.baseVolume = volume;
    const now = this.context.currentTime;
    this.output.gain.cancelScheduledValues(now);
    this.output.gain.setValueAtTime(volume, now);
  }

  duck(amount = 0.25, release = 0.35): void {
    const now = this.context.currentTime;
    const target = Math.max(0, this.baseVolume * (1 - amount));
    this.output.gain.cancelScheduledValues(now);
    this.output.gain.setValueAtTime(this.output.gain.value, now);
    this.output.gain.linearRampToValueAtTime(target, now + 0.06);
    this.output.gain.linearRampToValueAtTime(this.baseVolume, now + release);
  }

  async play(trackId: TrackId): Promise<void> {
    const resolvedId = trackId === AUTO_TRACK_ID ? this.getNextAutoTrack() : trackId;
    const buffer = await this.loadTrack(resolvedId);
    this.stop();
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(this.output);
    source.start(0);
    this.currentSource = source;
    this.currentTrack = { id: resolvedId, buffer };
  }

  stop(): void {
    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch (error) {
        // ignore
      }
      this.currentSource.disconnect();
      this.currentSource = undefined;
    }
  }

  private getNextAutoTrack(): TrackId {
    if (!musicTracks.length) {
      throw new Error('No tracks available');
    }
    const id = musicTracks[this.queueIndex % musicTracks.length].id;
    this.queueIndex = (this.queueIndex + 1) % musicTracks.length;
    return id;
  }

  private async loadTrack(id: TrackId): Promise<AudioBuffer> {
    const cached = this.currentTrack?.id === id ? this.currentTrack.buffer : undefined;
    if (cached) {
      return cached;
    }
    const pending = this.loading.get(id);
    if (pending) {
      return pending;
    }
    const promise = this.fetchAndDecode(id);
    this.loading.set(id, promise);
    const buffer = await promise;
    this.loading.delete(id);
    return buffer;
  }

  private async fetchAndDecode(id: TrackId): Promise<AudioBuffer> {
    const source = trackSources[id];
    if (!source) {
      throw new Error(`Unknown track: ${id}`);
    }
    const urls = [source.ogg, source.mp3];
    let lastError: unknown;
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
        lastError = error;
      }
    }
    throw lastError instanceof Error ? lastError : new Error('Unable to decode track');
  }
}

export default MusicPlayer;
