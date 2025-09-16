import { describe, expect, it } from 'vitest';
import BootScene from '../scenes/BootScene';
import GameOverScene from '../scenes/GameOverScene';
import MenuScene from '../scenes/MenuScene';
import PlayScene from '../scenes/PlayScene';
import PreloadScene from '../scenes/PreloadScene';

const SCENES = [BootScene, PreloadScene, MenuScene, PlayScene, GameOverScene];

describe('scene scaffolding', () => {
  it('defines five core scenes', () => {
    expect(SCENES).toHaveLength(5);
  });

  it('derives scene keys from Phaser Scene definitions', () => {
    expect(new BootScene().scene.key).toBe('Boot');
  });
});
