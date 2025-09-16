import { describe, expect, it, vi } from 'vitest';
import { GAME_SCENES } from '@melody-dash/shared';
import MenuScene from './MenuScene';

describe('MenuScene', () => {
  it('transitions to play scene when startGame is invoked', () => {
    const scene = new MenuScene();
    (scene as any).scene = {
      start: vi.fn(),
    };

    (scene as any).startGame();

    expect((scene as any).scene.start).toHaveBeenCalledWith(GAME_SCENES.PLAY);
  });
});
