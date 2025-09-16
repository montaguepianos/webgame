import { describe, expect, it, vi } from 'vitest';
import { GAME_SCENES } from '@melody-dash/shared';
import MenuScene from './MenuScene';

describe('MenuScene', () => {
  it('transitions to play scene when startGame is invoked', () => {
    const scene = new MenuScene();
    const startSpy = vi.fn();
    (scene as unknown as { scene: { start: (key: string) => void } }).scene = {
      start: startSpy,
    };

    (scene as unknown as { startGame: () => void }).startGame();

    expect(startSpy).toHaveBeenCalledWith(GAME_SCENES.PLAY);
  });
});
