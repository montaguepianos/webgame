import Phaser from 'phaser';
import type { GameSettings } from '@melody-dash/shared';
import store from '../state/GameStore';
import { colors, typography } from '../theme';

const PANEL_WIDTH = 480;
const PANEL_HEIGHT = 360;

export type SettingsCloseHandler = (settings: GameSettings) => void;

class SettingsPanel extends Phaser.GameObjects.Container {
  private sliderHandle!: Phaser.GameObjects.Ellipse;

  private sliderTrack!: Phaser.GameObjects.Rectangle;

  private volumeText!: Phaser.GameObjects.Text;

  private muteButton!: Phaser.GameObjects.Text;

  private reducedMotionButton!: Phaser.GameObjects.Text;

  private currentSettings: GameSettings;

  private onClose: SettingsCloseHandler;

  constructor(scene: Phaser.Scene, onClose: SettingsCloseHandler) {
    super(scene, scene.scale.width / 2, scene.scale.height / 2);
    this.onClose = onClose;
    this.currentSettings = store.getSettings();
    this.setDepth(1000);
    this.setSize(PANEL_WIDTH, PANEL_HEIGHT);

    this.drawBackground();
    this.drawHeader();
    this.buildVolumeSlider();
    this.buildMuteButton();
    this.buildReducedMotionButton();
    this.buildCloseButton();

    this.scene.add.existing(this);
    this.scene.input.keyboard?.addKey('ESC').once('down', () => this.handleClose());
  }

  private drawBackground(): void {
    const bg = this.scene.add.rectangle(0, 0, PANEL_WIDTH, PANEL_HEIGHT, Phaser.Display.Color.HexStringToColor(colors.ebony).color, 0.92);
    bg.setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(colors.brass).color, 0.5);
    bg.setOrigin(0.5);
    this.add(bg);
  }

  private drawHeader(): void {
    const title = this.scene.add.text(0, -PANEL_HEIGHT / 2 + 40, 'Workshop Settings', {
      fontFamily: typography.heading,
      fontSize: '36px',
      color: colors.cream,
    });
    title.setOrigin(0.5, 0.5);
    this.add(title);
  }

  private buildVolumeSlider(): void {
    const label = this.scene.add.text(-PANEL_WIDTH / 2 + 40, -60, 'Volume', {
      fontFamily: typography.body,
      fontSize: '20px',
      color: colors.ivory,
    });
    label.setOrigin(0, 0.5);
    this.add(label);

    const trackWidth = PANEL_WIDTH - 160;
    this.sliderTrack = this.scene.add.rectangle(0, -20, trackWidth, 6, Phaser.Display.Color.HexStringToColor(colors.cream).color, 0.3);
    this.sliderTrack.setOrigin(0.5, 0.5);
    this.sliderTrack.setInteractive({ useHandCursor: true });
    this.sliderTrack.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.updateVolumeFromPointer(pointer.x - this.x);
    });
    this.add(this.sliderTrack);

    const handleX = this.volumeToPosition(this.currentSettings.volume, trackWidth);
    this.sliderHandle = this.scene.add.ellipse(handleX, -20, 24, 24, Phaser.Display.Color.HexStringToColor(colors.teal).color);
    this.sliderHandle.setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(colors.brass).color, 0.8);
    this.sliderHandle.setInteractive({ draggable: true, useHandCursor: true });

    this.scene.input.setDraggable(this.sliderHandle, true);
    this.sliderHandle.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number) => {
      this.updateVolumeFromPointer(dragX - this.x);
    });
    this.add(this.sliderHandle);

    this.volumeText = this.scene.add.text(PANEL_WIDTH / 2 - 80, -60, `${Math.round(this.currentSettings.volume * 100)}%`, {
      fontFamily: typography.body,
      fontSize: '20px',
      color: colors.cream,
    });
    this.volumeText.setOrigin(1, 0.5);
    this.add(this.volumeText);
  }

  private buildMuteButton(): void {
    this.muteButton = this.createButton(0, 40, this.currentSettings.muted ? 'Unmute' : 'Mute', () => {
      this.currentSettings = {
        ...this.currentSettings,
        muted: !this.currentSettings.muted,
      };
      void store.updateSettings({ muted: this.currentSettings.muted });
      this.muteButton.setText(this.currentSettings.muted ? 'Unmute' : 'Mute');
    });
  }

  private buildReducedMotionButton(): void {
    this.reducedMotionButton = this.createButton(0, 110, this.currentSettings.reducedMotion ? 'Reduced Motion: On' : 'Reduced Motion: Off', () => {
      this.currentSettings = {
        ...this.currentSettings,
        reducedMotion: !this.currentSettings.reducedMotion,
      };
      void store.updateSettings({ reducedMotion: this.currentSettings.reducedMotion });
      this.reducedMotionButton.setText(
        this.currentSettings.reducedMotion ? 'Reduced Motion: On' : 'Reduced Motion: Off',
      );
    });
  }

  private buildCloseButton(): void {
    this.createButton(0, PANEL_HEIGHT / 2 - 60, 'Close', () => this.handleClose());
  }

  private createButton(x: number, y: number, label: string, handler: () => void): Phaser.GameObjects.Text {
    const button = this.scene.add.text(x, y, label, {
      fontFamily: typography.body,
      fontSize: '22px',
      color: colors.ivory,
      backgroundColor: Phaser.Display.Color.HexStringToColor(colors.royalRed).rgba,
      padding: { x: 16, y: 10 },
    });
    button.setOrigin(0.5);
    button.setInteractive({ useHandCursor: true });
    button.on('pointerdown', () => handler());
    button.on('pointerover', () => button.setStyle({ backgroundColor: Phaser.Display.Color.HexStringToColor(colors.teal).rgba }));
    button.on('pointerout', () => button.setStyle({ backgroundColor: Phaser.Display.Color.HexStringToColor(colors.royalRed).rgba }));
    this.add(button);
    return button;
  }

  private async updateVolumeFromPointer(localX: number): Promise<void> {
    const halfWidth = this.sliderTrack.width / 2;
    const clamped = Phaser.Math.Clamp(localX, -halfWidth, halfWidth);
    const raw = (clamped + halfWidth) / this.sliderTrack.width;
    const volume = Math.round(Phaser.Math.Clamp(raw, 0, 1) * 100) / 100;
    this.sliderHandle.setPosition(clamped, -20);
    this.volumeText.setText(`${Math.round(volume * 100)}%`);
    this.currentSettings = { ...this.currentSettings, volume };
    await store.updateSettings({ volume });
  }

  private volumeToPosition(volume: number, trackWidth: number): number {
    return volume * trackWidth - trackWidth / 2;
  }

  private handleClose(): void {
    this.onClose(this.currentSettings);
    this.destroy(true);
  }
}

export default SettingsPanel;
