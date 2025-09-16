import Phaser from 'phaser';
import { GAME_SCENES } from '@melody-dash/shared';
import { atlas, backgroundKeys, backgrounds } from '../assets/manifest';
import { brand, colors, tokens, typography } from '../theme';

class PreloadScene extends Phaser.Scene {
  static KEY = GAME_SCENES.PRELOAD;

  constructor() {
    super(PreloadScene.KEY);
  }

  preload(): void {
    const progressBar = this.renderLoader();
    this.registerLoaderHooks(progressBar);
    this.loadAtlas();
    this.loadBackgrounds();
    this.createUiTextures();
  }

  create(): void {
    this.time.delayedCall(400, () => {
      this.scene.start(GAME_SCENES.MENU);
    });
  }

  private renderLoader(): Phaser.GameObjects.Rectangle {
    const { width, height } = this.scale;
    const title = this.add.text(width / 2, height / 2 - 48, brand.title, {
      fontFamily: typography.heading,
      fontSize: '54px',
      color: colors.ivory,
    });
    title.setOrigin(0.5);

    const tagline = this.add.text(width / 2, height / 2 + 4, brand.tagline, {
      fontFamily: typography.body,
      fontSize: '19px',
      color: colors.cream,
      align: 'center',
    });
    tagline.setOrigin(0.5);

    const barBg = this.add.rectangle(width / 2, height / 2 + 88, 260, 12, 0xffffff, 0.1);
    barBg.setStrokeStyle(1, Phaser.Display.Color.HexStringToColor(colors.brass).color, 0.8);
    const bar = this.add.rectangle(
      barBg.x - barBg.width / 2,
      barBg.y,
      26,
      8,
      Phaser.Display.Color.HexStringToColor(colors.teal).color,
    );
    bar.setOrigin(0, 0.5);
    return bar;
  }

  private registerLoaderHooks(bar: Phaser.GameObjects.Rectangle): void {
    const totalWidth = 260;
    this.load.on('progress', (value: number) => {
      bar.width = Math.max(24, totalWidth * value);
    });
    this.load.on(Phaser.Loader.Events.COMPLETE, () => {
      this.tweens.add({
        targets: bar,
        width: totalWidth,
        duration: 280,
        ease: 'Cubic.easeOut',
      });
    });
  }

  private loadAtlas(): void {
    this.load.atlas(atlas.key, atlas.texture, atlas.data);
  }

  private loadBackgrounds(): void {
    Object.entries(backgrounds).forEach(([key, url]) => {
      this.load.image(key, url);
    });
    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      Object.values(backgroundKeys).forEach((key) => {
        const texture = this.textures.get(key);
        if (texture) {
          texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
        }
      });
    });
  }

  private createUiTextures(): void {
    const graphics = this.add.graphics();
    graphics.setVisible(false);
    const width = 200;
    const height = 54;
    const radius = tokens.radii.md;

    graphics.clear();
    graphics.fillStyle(Phaser.Display.Color.HexStringToColor(colors.teal).color, 1);
    graphics.fillRoundedRect(0, 0, width, height, radius);
    graphics.lineStyle(2, Phaser.Display.Color.HexStringToColor(colors.brass).color, 0.8);
    graphics.strokeRoundedRect(0, 0, width, height, radius);
    graphics.generateTexture('ui-button', width, height);

    graphics.clear();
    graphics.fillStyle(Phaser.Display.Color.HexStringToColor(colors.brass).color, 1);
    graphics.fillRoundedRect(0, 0, width, height, radius);
    graphics.lineStyle(2, Phaser.Display.Color.HexStringToColor(colors.cream).color, 0.9);
    graphics.strokeRoundedRect(0, 0, width, height, radius);
    graphics.generateTexture('ui-button-active', width, height);

    graphics.clear();
    graphics.fillStyle(Phaser.Display.Color.HexStringToColor(colors.ebonySoft).color, 0.65);
    graphics.fillRoundedRect(0, 0, width, 42, radius);
    graphics.lineStyle(1, Phaser.Display.Color.HexStringToColor(colors.cream).color, 0.4);
    graphics.strokeRoundedRect(0, 0, width, 42, radius);
    graphics.generateTexture('ui-pill', width, 42);

    graphics.destroy();
  }
}

export default PreloadScene;
