import Phaser from 'phaser';
import type { ScoreSummary } from '@melody-dash/shared';
import { GAME_SCENES } from '@melody-dash/shared';
import store from '../state/GameStore';
import profileStore from '../state/ProfileStore';
import { backgroundKeys } from '../assets/manifest';
import { brand, colors, typography } from '../theme';

interface GameOverData {
  summary?: ScoreSummary;
}

class GameOverScene extends Phaser.Scene {
  static KEY = GAME_SCENES.GAME_OVER;

  private backgrounds: Phaser.GameObjects.TileSprite[] = [];

  private vignette!: Phaser.GameObjects.Image;

  private feedbackText?: Phaser.GameObjects.Text;

  constructor() {
    super(GameOverScene.KEY);
  }

  create(data: GameOverData): void {
    this.createBackground();
    const summary = data.summary ?? {
      totalScore: 0,
      combo: 0,
      maxCombo: 0,
      mistakes: 0,
      motif: [],
      durationMs: 0,
    };

    void store.getAudio().startLoop();
    this.buildLayout(summary);
  }

  update(_time: number, delta: number): void {
    this.backgrounds.forEach((layer, index) => {
      layer.tilePositionY += (0.02 + index * 0.025) * (delta / 16);
    });
  }

  private createBackground(): void {
    const { width, height } = this.scale;
    this.backgrounds = [
      this.add
        .tileSprite(width / 2, height / 2, width * 1.1, height * 1.1, backgroundKeys.back)
        .setDepth(-3),
      this.add
        .tileSprite(width / 2, height / 2, width * 1.1, height * 1.1, backgroundKeys.mid)
        .setDepth(-2),
      this.add
        .tileSprite(width / 2, height / 2, width * 1.1, height * 1.1, backgroundKeys.front)
        .setDepth(-1),
    ];
    this.backgrounds.forEach((layer) => layer.setOrigin(0.5));
    this.vignette = this.add
      .image(width / 2, height / 2, backgroundKeys.vignette)
      .setDepth(6)
      .setDisplaySize(width * 1.02, height * 1.02)
      .setAlpha(0.55)
      .setBlendMode(Phaser.BlendModes.MULTIPLY);
  }

  private buildLayout(summary: ScoreSummary): void {
    const { width, height } = this.scale;
    const profile = profileStore.getProfile();

    const title = this.add.text(width / 2, height / 2 - 200, `${profile.name}'s Performance`, {
      fontFamily: typography.heading,
      fontSize: '64px',
      color: colors.ivory,
      stroke: colors.ebonySoft,
      strokeThickness: 5,
    });
    title.setOrigin(0.5);

    const tag = this.add.text(width / 2, height / 2 - 140, brand.tagline, {
      fontFamily: typography.body,
      fontSize: '20px',
      color: colors.cream,
    });
    tag.setOrigin(0.5);

    const panel = this.add.rectangle(
      width / 2,
      height / 2,
      width * 0.6,
      240,
      Phaser.Display.Color.HexStringToColor(colors.ebonySoft).color,
      0.82,
    );
    panel.setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(colors.brass).color, 0.6);

    const stats = [
      `Score ${summary.totalScore.toLocaleString()}`,
      `Best combo ${summary.maxCombo}`,
      `Mistakes ${summary.mistakes} of 3`,
    ];
    stats.forEach((line, index) => {
      const text = this.add.text(width / 2, height / 2 - 60 + index * 36, line, {
        fontFamily: typography.body,
        fontSize: '22px',
        color: colors.cream,
      });
      text.setOrigin(0.5);
    });

    if (summary.motif.length > 0) {
      const motifLabel = this.add.text(
        width / 2,
        height / 2 + 60,
        `Motif: ${summary.motif.slice(-8).join(' · ')}`,
        {
          fontFamily: typography.body,
          fontSize: '18px',
          color: colors.brass,
        },
      );
      motifLabel.setOrigin(0.5);
    }

    const playback = this.createButton(width / 2 - 160, height / 2 + 140, 'Playback motif', () => {
      void store.getAudio().playMotif(summary.motif.slice(-12));
      this.showFeedback('Motif replayed');
    });
    playback.setDepth(7);

    const copyButton = this.createButton(width / 2 + 160, height / 2 + 140, 'Copy score', () => {
      const text = `${profile.name} scored ${summary.totalScore} in Melody Dash!`;
      this.copyToClipboard(text);
    });
    copyButton.setDepth(7);

    const replay = this.createButton(width / 2 - 160, height / 2 + 220, 'Play Again', () => {
      this.scene.start(GAME_SCENES.PLAY);
    });
    replay.setDepth(7);

    const menu = this.createButton(width / 2 + 160, height / 2 + 220, 'Main Menu', () => {
      this.scene.start(GAME_SCENES.MENU);
    });
    menu.setDepth(7);

    const link = this.add.text(
      width / 2,
      height - 36,
      'Play on a real one? Visit Montague Pianos.',
      {
        fontFamily: typography.body,
        fontSize: '18px',
        color: colors.cream,
      },
    );
    link.setOrigin(0.5);
  }

  private createButton(
    x: number,
    y: number,
    label: string,
    handler: () => void,
  ): Phaser.GameObjects.Container {
    const button = this.add.container(x, y);
    button.setSize(220, 58);
    const bg = this.add.image(0, 0, 'ui-button');
    const text = this.add.text(0, 0, label, {
      fontFamily: typography.body,
      fontSize: '20px',
      color: colors.ebony,
    });
    text.setOrigin(0.5);
    button.add([bg, text]);
    button.setInteractive(
      new Phaser.Geom.Rectangle(-110, -29, 220, 58),
      Phaser.Geom.Rectangle.Contains,
    );
    button.on('pointerdown', () => {
      bg.setTexture('ui-button-active');
      handler();
    });
    button.on('pointerup', () => {
      bg.setTexture('ui-button');
    });
    button.on('pointerover', () => {
      bg.setTint(Phaser.Display.Color.HexStringToColor(colors.brass).color);
    });
    button.on('pointerout', () => {
      bg.clearTint();
      bg.setTexture('ui-button');
    });
    return button;
  }

  private showFeedback(label: string): void {
    this.feedbackText?.destroy();
    this.feedbackText = this.add.text(this.scale.width / 2, this.scale.height / 2 + 180, label, {
      fontFamily: typography.body,
      fontSize: '18px',
      color: colors.cream,
    });
    this.feedbackText.setOrigin(0.5);
    this.tweens.add({
      targets: this.feedbackText,
      alpha: 0,
      duration: 1200,
      ease: 'Sine.easeIn',
      onComplete: () => this.feedbackText?.destroy(),
    });
  }

  private async copyToClipboard(text: string): Promise<void> {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        window.prompt('Copy score to share', text);
      }
      this.showFeedback('Score copied');
    } catch (error) {
      this.showFeedback('Copy failed');
    }
  }
}

export default GameOverScene;
