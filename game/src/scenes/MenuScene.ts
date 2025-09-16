import Phaser from 'phaser';
import { GAME_SCENES, SCORE_NAME_LIMIT } from '@melody-dash/shared';
import { brand, colors, typography } from '../theme';
import store from '../state/GameStore';
import SettingsPanel from '../ui/SettingsPanel';
import profileStore from '../state/ProfileStore';
import { fetchTopScores, scoresEnabled } from '../services/ScoresClient';

class MenuScene extends Phaser.Scene {
  private settingsPanel?: SettingsPanel;

  private leaderboardText?: Phaser.GameObjects.Text;

  constructor() {
    super(GAME_SCENES.MENU);
  }

  create(): void {
    this.cameras.main.setBackgroundColor(colors.ebony);
    this.cameras.main.fadeIn(400, 0, 0, 0);
    this.buildLayout();
    this.setupInput();
  }

  private buildLayout(): void {
    const { width, height } = this.scale;
    const title = this.add.text(width / 2, height / 2 - 150, brand.title, {
      fontFamily: typography.heading,
      fontSize: '72px',
      color: colors.ivory,
    });
    title.setOrigin(0.5);

    const tagline = this.add.text(width / 2, height / 2 - 80, brand.tagline, {
      fontFamily: typography.body,
      fontSize: '22px',
      color: colors.cream,
    });
    tagline.setOrigin(0.5);

    const playButton = this.createButton(width / 2, height / 2 + 10, 'Begin the Dash', () => {
      this.startGame();
    });
    playButton.setScale(1.1);

    this.createButton(width / 2, height / 2 + 80, 'Settings', () => {
      this.openSettings();
    });

    const instructions = this.add.text(width / 2, height / 2 + 160, 'Arrow keys or swipe to glide. Collect the glowing notes!', {
      fontFamily: typography.body,
      fontSize: '18px',
      align: 'center',
      color: colors.cream,
      wordWrap: { width: width * 0.6 },
    });
    instructions.setOrigin(0.5);

    const muteButton = this.add.text(width - 30, 30, store.getAudio().muted ? '🔇' : '🔊', {
      fontFamily: typography.body,
      fontSize: '28px',
      color: colors.cream,
    });
    muteButton.setOrigin(1, 0);
    muteButton.setInteractive({ useHandCursor: true });
    muteButton.on('pointerdown', async () => {
      const next = !store.getAudio().muted;
      await store.updateSettings({ muted: next });
      muteButton.setText(next ? '🔇' : '🔊');
    });

    this.buildProfileCard(width, height);
    if (scoresEnabled) {
      this.buildLeaderboard(width, height);
      void this.loadLeaderboard();
    }
  }

  private setupInput(): void {
    this.input.keyboard?.on('keydown-ENTER', () => this.startGame());
    this.input.keyboard?.on('keydown-SPACE', () => this.startGame());
    this.input.once('pointerdown', () => {
      void store.getAudio().initialize();
    });
  }

  private createButton(x: number, y: number, label: string, onClick: () => void): Phaser.GameObjects.Text {
    const button = this.add.text(x, y, label, {
      fontFamily: typography.body,
      fontSize: '26px',
      color: colors.ebony,
      backgroundColor: Phaser.Display.Color.HexStringToColor(colors.brass).rgba,
      padding: { x: 18, y: 12 },
    });
    button.setOrigin(0.5);
    button.setInteractive({ useHandCursor: true });
    button.on('pointerdown', () => onClick());
    button.on('pointerover', () => button.setStyle({ backgroundColor: Phaser.Display.Color.HexStringToColor(colors.teal).rgba, color: colors.ivory }));
    button.on('pointerout', () => button.setStyle({ backgroundColor: Phaser.Display.Color.HexStringToColor(colors.brass).rgba, color: colors.ebony }));
    button.on('pointerdown', () => void store.getAudio().initialize());
    return button;
  }

  private startGame(): void {
    this.scene.start(GAME_SCENES.PLAY);
  }

  private openSettings(): void {
    if (this.settingsPanel) {
      return;
    }
    this.settingsPanel = new SettingsPanel(this, () => {
      this.settingsPanel = undefined;
    });
  }

  private buildProfileCard(width: number, height: number): void {
    const profile = profileStore.getProfile();
    const text = this.add.text(width / 2, height / 2 + 220, `Player: ${profile.name}`, {
      fontFamily: typography.body,
      fontSize: '18px',
      color: colors.cream,
      backgroundColor: Phaser.Display.Color.HexStringToColor(colors.ebony).rgba,
      padding: { x: 12, y: 6 },
    });
    text.setOrigin(0.5);
    text.setInteractive({ useHandCursor: true });
    text.on('pointerdown', () => {
      const response = window.prompt('Your stage name', profileStore.getProfile().name);
      if (response) {
        const trimmed = response.slice(0, SCORE_NAME_LIMIT);
        const updated = profileStore.updateName(trimmed);
        text.setText(`Player: ${updated.name}`);
      }
    });
  }

  private buildLeaderboard(width: number, height: number): void {
    const label = this.add.text(width / 2, height / 2 + 260, 'Top Pianists', {
      fontFamily: typography.heading,
      fontSize: '24px',
      color: colors.brass,
    });
    label.setOrigin(0.5);

    this.leaderboardText = this.add.text(width / 2, label.y + 20, 'Loading...', {
      fontFamily: typography.body,
      fontSize: '18px',
      color: colors.cream,
      align: 'center',
      wordWrap: { width: width * 0.6 },
    });
    this.leaderboardText.setOrigin(0.5, 0);
  }

  private async loadLeaderboard(): Promise<void> {
    const entries = await fetchTopScores(5);
    if (!this.leaderboardText) {
      return;
    }
    if (!entries.length) {
      this.leaderboardText.setText('Be the first to set a score!');
      return;
    }
    const lines = entries.map((entry, index) => `${index + 1}. ${entry.name} — ${entry.score}`).join('\n');
    this.leaderboardText.setText(lines);
  }
}

export default MenuScene;
