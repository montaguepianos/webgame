import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, GAME_SCENES, SCORE_NAME_LIMIT } from './index';

describe('shared constants', () => {
  it('exposes all primary scene keys', () => {
    expect(Object.values(GAME_SCENES)).toContain('Play');
  });

  it('provides default settings', () => {
    expect(DEFAULT_SETTINGS.volume).toBeGreaterThan(0);
  });

  it('exposes score name limit', () => {
    expect(SCORE_NAME_LIMIT).toBeGreaterThan(0);
  });
});
