import { beforeEach, describe, expect, it, vi } from 'vitest';
import AudioManager from './AudioManager';

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

class FakeGainNode {
  gain = { value: 1 };

  connect = vi.fn();
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
}

describe('AudioManager', () => {
  beforeEach(() => {
    vi.stubGlobal('AudioContext', FakeAudioContext);
    window.AudioContext = FakeAudioContext as unknown as typeof AudioContext;
    createdSources.length = 0;
  });

  it('initialises context with default volume', async () => {
    const manager = new AudioManager();
    await manager.initialize();
    expect(manager.volume).toBeGreaterThan(0);
    expect((manager as any).masterGain.gain.value).toBeCloseTo(manager.volume);
  });

  it('mutes and unmutes audio', async () => {
    const manager = new AudioManager();
    await manager.initialize();
    await manager.toggleMute(true);
    expect((manager as any).masterGain.gain.value).toBe(0);
    await manager.toggleMute(false);
    expect((manager as any).masterGain.gain.value).toBeCloseTo(manager.volume);
  });

  it('plays note buffers when triggered', async () => {
    const manager = new AudioManager();
    await manager.initialize();
    await manager.playNote('C4');
    const latest = createdSources.at(-1);
    expect(latest?.start).toHaveBeenCalled();
  });
});
