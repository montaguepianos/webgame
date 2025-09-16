import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AudioManager from './AudioManager';

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

class FakeGainNode {
  gain = {
    value: 1,
    cancelScheduledValues: vi.fn(),
    setValueAtTime: vi.fn((value: number) => {
      this.gain.value = value;
      return this.gain;
    }),
    linearRampToValueAtTime: vi.fn((value: number) => {
      this.gain.value = value;
      return this.gain;
    }),
  } as unknown as AudioParam;

  connect = vi.fn();

  disconnect = vi.fn();
}

const createdSources: FakeAudioBufferSourceNode[] = [];

class FakeAudioBufferSourceNode {
  public buffer: AudioBuffer | null = null;

  public loop = false;

  connect = vi.fn();

  start = vi.fn();

  stop = vi.fn();

  disconnect = vi.fn();
}

class FakeAudioBuffer {
  readonly sampleRate: number;

  readonly length: number;

  readonly duration: number;

  readonly numberOfChannels: number;

  private data: Float32Array;

  constructor(length: number, sampleRate: number) {
    this.sampleRate = sampleRate;
    this.length = length;
    this.duration = length / sampleRate;
    this.numberOfChannels = 1;
    this.data = new Float32Array(length);
  }

  getChannelData(): Float32Array {
    return this.data;
  }
}

class FakeAudioContext {
  readonly sampleRate = 44_100;

  readonly currentTime = 0;

  readonly destination = {};

  createGain(): GainNode {
    return new FakeGainNode() as unknown as GainNode;
  }

  createBuffer(_numberOfChannels: number, length: number, sampleRate: number): AudioBuffer {
    return new FakeAudioBuffer(length, sampleRate) as unknown as AudioBuffer;
  }

  createBufferSource(): AudioBufferSourceNode {
    const source = new FakeAudioBufferSourceNode();
    createdSources.push(source);
    return source as unknown as AudioBufferSourceNode;
  }

  resume = vi.fn().mockResolvedValue(void 0);

  decodeAudioData = vi.fn(async () => this.createBuffer(1, this.sampleRate / 2, this.sampleRate));
}

describe('AudioManager', () => {
  beforeEach(() => {
    vi.stubGlobal('AudioContext', FakeAudioContext);
    window.AudioContext = FakeAudioContext as unknown as typeof AudioContext;
    const fakeResponse = {
      ok: true,
      arrayBuffer: vi.fn(async () => new ArrayBuffer(32)),
    } as unknown as Response;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(fakeResponse));
    createdSources.length = 0;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('initialises context with default volume', async () => {
    const manager = new AudioManager();
    await manager.initialize();
    expect(manager.volume).toBeGreaterThan(0);
  });

  it('mutes and unmutes audio', async () => {
    const manager = new AudioManager();
    await manager.initialize();
    await manager.toggleMute(true);
    expect(manager.muted).toBe(true);
    await manager.toggleMute(false);
    expect(manager.muted).toBe(false);
  });

  it('plays note buffers when triggered', async () => {
    const manager = new AudioManager();
    await manager.initialize();
    await manager.playNote('C4');
    const latest = createdSources.at(-1);
    expect(latest?.start).toHaveBeenCalled();
  });

  it('updates song preference', async () => {
    const manager = new AudioManager();
    await manager.initialize();
    expect(manager.song).toBe('auto');
    await manager.setSong('prelude_c');
    expect(manager.song).toBe('prelude_c');
  });
});
