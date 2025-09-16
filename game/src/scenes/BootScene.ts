import Phaser from 'phaser';
import { GAME_SCENES } from '@melody-dash/shared';
import { colors, layout } from '../theme';

class BootScene extends Phaser.Scene {
  static KEY = GAME_SCENES.BOOT;

  constructor() {
    super(BootScene.KEY);
  }

  create(): void {
    this.cameras.main.setBackgroundColor(colors.ebony);
    this.scale.setGameSize(layout.worldWidth, layout.worldHeight);
    this.scene.start(GAME_SCENES.PRELOAD);
  }
}

export default BootScene;
