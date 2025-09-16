import Phaser from 'phaser';
import { GAME_SCENES } from '@melody-dash/shared';
import { brand, colors, typography } from '../theme';

class PreloadScene extends Phaser.Scene {
  constructor() {
    super(GAME_SCENES.PRELOAD);
  }

  preload(): void {
    this.renderLoader();
    this.generateTextures();
  }

  create(): void {
    this.time.delayedCall(500, () => {
      this.scene.start(GAME_SCENES.MENU);
    });
  }

  private renderLoader(): void {
    const { width, height } = this.scale;
    const title = this.add.text(width / 2, height / 2 - 40, brand.title, {
      fontFamily: typography.heading,
      fontSize: '48px',
      color: colors.ivory,
    });
    title.setOrigin(0.5);

    const tagline = this.add.text(width / 2, height / 2 + 10, brand.tagline, {
      fontFamily: typography.body,
      fontSize: '18px',
      color: colors.cream,
    });
    tagline.setOrigin(0.5);

    const barBg = this.add.rectangle(width / 2, height / 2 + 80, 260, 12, 0xffffff, 0.1);
    barBg.setStrokeStyle(1, Phaser.Display.Color.HexStringToColor(colors.brass).color);
    const bar = this.add.rectangle(barBg.x - barBg.width / 2, barBg.y, 12, 8, Phaser.Display.Color.HexStringToColor(colors.teal).color);
    bar.setOrigin(0, 0.5);

    this.tweens.add({
      targets: bar,
      width: barBg.width,
      duration: 600,
      ease: 'Quad.easeInOut',
      yoyo: true,
      repeat: -1,
    });
  }

  private generateTextures(): void {
    const graphics = this.add.graphics();

    graphics.clear();
    graphics.fillStyle(Phaser.Display.Color.HexStringToColor(colors.brass).color, 1);
    graphics.fillRoundedRect(0, 0, 48, 64, 12);
    graphics.lineStyle(3, Phaser.Display.Color.HexStringToColor(colors.cream).color, 0.8);
    graphics.beginPath();
    graphics.moveTo(12, 20);
    graphics.lineTo(36, 32);
    graphics.lineTo(12, 44);
    graphics.strokePath();
    graphics.generateTexture('note-token', 48, 64);

    graphics.clear();
    graphics.fillStyle(Phaser.Display.Color.HexStringToColor(colors.royalRed).color, 0.9);
    graphics.fillRoundedRect(0, 0, 44, 44, 16);
    graphics.fillStyle(0x000000, 0.15);
    graphics.fillCircle(32, 32, 10);
    graphics.generateTexture('dust-token', 44, 44);

    graphics.clear();
    graphics.fillStyle(Phaser.Display.Color.HexStringToColor(colors.ivory).color, 1);
    graphics.fillRoundedRect(0, 0, 72, 60, 10);
    graphics.fillStyle(0x000000, 1);
    graphics.fillRect(6, 12, 60, 12);
    graphics.fillStyle(Phaser.Display.Color.HexStringToColor(colors.brass).color, 1);
    graphics.fillRect(6, 26, 60, 24);
    graphics.lineStyle(1, Phaser.Display.Color.HexStringToColor(colors.cream).color);
    for (let i = 0; i < 7; i += 1) {
      graphics.lineBetween(12 + i * 8, 26, 12 + i * 8, 50);
    }
    graphics.generateTexture('piano-avatar', 72, 60);

    graphics.clear();
    graphics.fillStyle(Phaser.Display.Color.HexStringToColor(colors.teal).color, 0.8);
    graphics.fillCircle(8, 8, 8);
    graphics.generateTexture('spark', 16, 16);

    graphics.destroy();
  }
}

export default PreloadScene;
