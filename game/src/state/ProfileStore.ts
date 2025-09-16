const STORAGE_KEY = 'melody-dash-profile';

export interface PlayerProfile {
  name: string;
  seed: string;
}

const randomSeed = () =>
  crypto?.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);

class ProfileStore {
  private profile: PlayerProfile;

  constructor() {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
    this.profile = stored ? JSON.parse(stored) : { name: 'Guest Pianist', seed: randomSeed() };
  }

  getProfile(): PlayerProfile {
    return { ...this.profile };
  }

  updateName(name: string): PlayerProfile {
    const trimmed = name.trim();
    if (!trimmed) {
      return this.getProfile();
    }
    this.profile = { ...this.profile, name: trimmed };
    this.persist();
    return this.getProfile();
  }

  private persist(): void {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.profile));
  }
}

export default new ProfileStore();
