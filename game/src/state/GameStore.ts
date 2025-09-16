import { DEFAULT_SETTINGS } from '@melody-dash/shared';
import type { GameSettings } from '@melody-dash/shared';
import AudioManager from '../managers/AudioManager';

class GameStore {
  private settings: GameSettings = { ...DEFAULT_SETTINGS };

  private audioManager = new AudioManager();

  private reducedMotion = DEFAULT_SETTINGS.reducedMotion;

  getAudio(): AudioManager {
    return this.audioManager;
  }

  getSettings(): GameSettings {
    return { ...this.settings };
  }

  async updateSettings(next: Partial<GameSettings>): Promise<GameSettings> {
    this.settings = { ...this.settings, ...next };
    this.reducedMotion = this.settings.reducedMotion;
    if (typeof next.volume === 'number') {
      await this.audioManager.setVolume(this.settings.volume);
    }
    if (typeof next.muted === 'boolean') {
      await this.audioManager.toggleMute(this.settings.muted);
    }
    return this.getSettings();
  }

  isReducedMotion(): boolean {
    return this.reducedMotion;
  }
}

const store = new GameStore();

export default store;
