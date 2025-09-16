import Phaser from 'phaser';
import { GAME_SCENES, SCORE_NAME_LIMIT } from '@melody-dash/shared';
import { backgroundKeys } from '../assets/manifest';
import { brand, colors, typography } from '../theme';
import store from '../state/GameStore';
import SettingsPanel from '../ui/SettingsPanel';
import profileStore from '../state/ProfileStore';
import { fetchTopScores, scoresEnabled } from '../services/ScoresClient';

class MenuScene extends Phaser.Scene {
  static KEY = GAME_SCENES.MENU;

  private settingsPanel?: SettingsPanel;

  private leaderboardText?: Phaser.GameObjects.Text;

  private backgrounds: Phaser.GameObjects.TileSprite[] = [];

  private vignette!: Phaser.GameObjects.Image;

  private songLabel?: Phaser.GameObjects.Text;

  constructor() {
    super(MenuScene.KEY);
  }

  create(): void {
    this.createBackground();
    this.buildLayout();
    this.setupInput();
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

  update(_time: number, delta: number): void {
    this.backgrounds.forEach((layer, index) => {
      layer.tilePositionY += (0.015 + index * 0.02) * (delta / 16);
    });
    if (this.songLabel) {
      const label = this.getSongLabel();
      if (this.songLabel.text !== label) {
        this.songLabel.setText(label);
      }
    }
  }

  private buildLayout(): void {
    const { width, height } = this.scale;
    const title = this.add.text(width / 2, height / 2 - 190, brand.title, {
      fontFamily: typography.heading,
      fontSize: '80px',
      color: colors.ivory,
      stroke: colors.ebonySoft,
      strokeThickness: 6,
    });
    title.setOrigin(0.5);

    const tagline = this.add.text(width / 2, height / 2 - 120, brand.tagline, {
      fontFamily: typography.body,
      fontSize: '22px',
      color: colors.cream,
    });
    tagline.setOrigin(0.5);

    const playButton = this.createButton(width / 2, height / 2 - 20, 'Begin the Dash', () => {
      this.startGame();
    });
    playButton.setScale(1.08);

    this.createButton(width / 2, height / 2 + 60, 'Workshop Settings', () => {
      this.openSettings();
    });

    const instructions = this.add.text(
      width / 2,
      height / 2 + 140,
      'Swipe or arrow keys to glide. Collect glowing notes, dodge the sour ones.',
      {
        fontFamily: typography.body,
        fontSize: '18px',
        align: 'center',
        color: colors.cream,
        wordWrap: { width: width * 0.6 },
      },
    );
    instructions.setOrigin(0.5);

    const muteButton = this.add.text(width - 40, 32, store.getAudio().muted ? '🔇' : '🔊', {
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

    const profile = profileStore.getProfile();
    const profileCard = this.add.rectangle(
      width / 2,
      height / 2 + 220,
      360,
      66,
      Phaser.Display.Color.HexStringToColor(colors.ebonySoft).color,
      0.82,
    );
    profileCard.setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(colors.brass).color, 0.6);
    profileCard.setDepth(5);
    const profileText = this.add.text(width / 2, height / 2 + 220, `Stage name: ${profile.name}`, {
      fontFamily: typography.body,
      fontSize: '20px',
      color: colors.cream,
    });
    profileText.setOrigin(0.5);
    profileText.setInteractive({ useHandCursor: true });
    profileText.on('pointerdown', () => {
      const response = window.prompt('Your stage name', profileStore.getProfile().name);
      if (response) {
        const trimmed = response.slice(0, SCORE_NAME_LIMIT);
        const updated = profileStore.updateName(trimmed);
        profileText.setText(`Stage name: ${updated.name}`);
      }
    });

    const songLabelBg = this.add.rectangle(
      width / 2,
      height / 2 + 268,
      280,
      48,
      Phaser.Display.Color.HexStringToColor(colors.ebonySoft).color,
      0.75,
    );
    songLabelBg.setStrokeStyle(1, Phaser.Display.Color.HexStringToColor(colors.brass).color, 0.5);
    songLabelBg.setDepth(5);
    this.songLabel = this.add.text(width / 2, height / 2 + 268, this.getSongLabel(), {
      fontFamily: typography.body,
      fontSize: '18px',
      color: colors.cream,
    });
    this.songLabel.setOrigin(0.5);

    if (scoresEnabled) {
      this.buildLeaderboard(width, height);
      void this.loadLeaderboard();
    }
  }

  private getSongLabel(): string {
    const audio = store.getAudio();
    const meta = audio.getCurrentTrackMeta();
    if (!meta) {
      return 'Song: Auto rotation';
    }
    return `Song: ${meta.title} — ${meta.composer}`;
  }

  private createButton(
    x: number,
    y: number,
    label: string,
    handler: () => void,
  ): Phaser.GameObjects.Container {
    const button = this.add.container(x, y);
    button.setSize(220, 58);
    button.setDepth(7);
    const bg = this.add.image(0, 0, 'ui-button');
    const text = this.add.text(0, 0, label, {
      fontFamily: typography.body,
      fontSize: '22px',
      color: colors.ebony,
    });
    text.setOrigin(0.5);
    const hit = this.add.rectangle(0, 0, 220, 58, 0xffffff, 0);
    hit.setInteractive({ useHandCursor: true });
    button.add([bg, text, hit]);
    hit.on('pointerdown', () => {
      bg.setTexture('ui-button-active');
      handler();
    });
    hit.on('pointerup', () => {
      bg.setTexture('ui-button');
    });
    hit.on('pointerover', () => {
      bg.setTint(Phaser.Display.Color.HexStringToColor(colors.brass).color);
    });
    hit.on('pointerout', () => {
      bg.clearTint();
      bg.setTexture('ui-button');
    });
    return button;
  }

  private setupInput(): void {
    this.input.keyboard?.on('keydown-ENTER', () => this.startGame());
    this.input.keyboard?.on('keydown-SPACE', () => this.startGame());
    this.input.once('pointerdown', async () => {
      await store.getAudio().unlock();
    });
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
      this.songLabel?.setText(this.getSongLabel());
    });
  }

  private buildLeaderboard(width: number, height: number): void {
    const label = this.add.text(width - 40, height / 2 - 60, 'Top Pianists', {
      fontFamily: typography.heading,
      fontSize: '26px',
      color: colors.brass,
      align: 'right',
    });
    label.setOrigin(1, 0);

    const panel = this.add.rectangle(
      width - 40,
      height / 2 + 100,
      280,
      220,
      Phaser.Display.Color.HexStringToColor(colors.ebonySoft).color,
      0.8,
    );
    panel.setOrigin(1, 0.5);
    panel.setStrokeStyle(1, Phaser.Display.Color.HexStringToColor(colors.cream).color, 0.3);

    this.leaderboardText = this.add.text(
      width - 46,
      panel.y - panel.height / 2 + 12,
      'Loading...',
      {
        fontFamily: typography.body,
        fontSize: '18px',
        color: colors.cream,
        align: 'right',
        wordWrap: { width: 240 },
      },
    );
    this.leaderboardText.setOrigin(1, 0);
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
    const lines = entries
      .map((entry, index) => `${index + 1}. ${entry.name} — ${entry.score}`)
      .join('\n');
    this.leaderboardText.setText(lines);
  }
}

export default MenuScene;
