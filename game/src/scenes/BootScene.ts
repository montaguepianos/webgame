import Phaser from 'phaser';
import { GAME_SCENES } from '@melody-dash/shared';
import { colors, layout } from '../theme';

class BootScene extends Phaser.Scene {
  constructor() {
    super(GAME_SCENES.BOOT);
  }

  create(): void {
    this.cameras.main.setBackgroundColor(colors.ebony);
    this.scale.setGameSize(layout.worldWidth, layout.worldHeight);
    this.scene.start(GAME_SCENES.PRELOAD);
  }
}

export default BootScene;
