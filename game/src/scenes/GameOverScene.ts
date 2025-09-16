import Phaser from 'phaser';
import type { ScoreSummary } from '@melody-dash/shared';
import { GAME_SCENES } from '@melody-dash/shared';
import store from '../state/GameStore';
import profileStore from '../state/ProfileStore';
import { brand, colors, typography } from '../theme';

interface GameOverData {
  summary?: ScoreSummary;
}

class GameOverScene extends Phaser.Scene {
  constructor() {
    super(GAME_SCENES.GAME_OVER);
  }

  create(data: GameOverData): void {
    this.cameras.main.setBackgroundColor(colors.ebony);
    this.cameras.main.fadeIn(400, 0, 0, 0);
    const summary = data.summary ?? {
      totalScore: 0,
      combo: 0,
      maxCombo: 0,
      mistakes: 0,
      motif: [],
      durationMs: 0,
    };

    const { width, height } = this.scale;
    const profile = profileStore.getProfile();

    this.add.text(width / 2, height / 2 - 160, `${profile.name}'s Performance`, {
      fontFamily: typography.heading,
      fontSize: '56px',
      color: colors.ivory,
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 - 110, brand.tagline, {
      fontFamily: typography.body,
      fontSize: '20px',
      color: colors.cream,
    }).setOrigin(0.5);

    const stats = [
      `Score: ${summary.totalScore.toLocaleString()}`,
      `Max combo: ${summary.maxCombo}`,
      `Mistakes: ${summary.mistakes} of 3`,
    ];
    stats.forEach((line, index) => {
      this.add.text(width / 2, height / 2 - 20 + index * 32, line, {
        fontFamily: typography.body,
        fontSize: '22px',
        color: colors.cream,
      }).setOrigin(0.5);
    });

    const motif = summary.motif.slice(-8);
    if (motif.length > 0) {
      this.add.text(width / 2, height / 2 + 90, `Motif: ${motif.join(' · ')}`, {
        fontFamily: typography.body,
        fontSize: '20px',
        color: colors.brass,
      }).setOrigin(0.5);

      void store.getAudio().playMotif(motif);
    }

    this.createButton(width / 2 - 100, height / 2 + 150, 'Play Again', () => {
      this.scene.start(GAME_SCENES.PLAY);
    });

    this.createButton(width / 2 + 100, height / 2 + 150, 'Main Menu', () => {
      this.scene.start(GAME_SCENES.MENU);
    });

    this.add.text(width / 2, height - 40, 'Play on a real one? Visit Montague Pianos.', {
      fontFamily: typography.body,
      fontSize: '18px',
      color: colors.cream,
    }).setOrigin(0.5);
  }

  private createButton(x: number, y: number, label: string, onClick: () => void): void {
    const button = this.add.text(x, y, label, {
      fontFamily: typography.body,
      fontSize: '20px',
      color: colors.ebony,
      backgroundColor: Phaser.Display.Color.HexStringToColor(colors.brass).rgba,
      padding: { x: 16, y: 10 },
    });
    button.setOrigin(0.5);
    button.setInteractive({ useHandCursor: true });
    button.on('pointerdown', () => onClick());
    button.on('pointerover', () => button.setStyle({ backgroundColor: Phaser.Display.Color.HexStringToColor(colors.teal).rgba, color: colors.ivory }));
    button.on('pointerout', () => button.setStyle({ backgroundColor: Phaser.Display.Color.HexStringToColor(colors.brass).rgba, color: colors.ebony }));
  }
}

export default GameOverScene;
