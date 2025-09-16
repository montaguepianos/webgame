import Phaser from 'phaser';
import { GAME_SCENES } from '@melody-dash/shared';
import type { NoteName } from '@melody-dash/shared';
import store from '../state/GameStore';
import { colors, typography } from '../theme';
import ScoreSystem from '../systems/ScoreSystem';
import SettingsPanel from '../ui/SettingsPanel';
import { submitScore } from '../services/ScoresClient';

const LANES = [-220, 0, 220];
const GAME_DURATION_MS = 60_000;
const NOTE_SPAWN_INTERVAL = 900;
const DUST_SPAWN_INTERVAL = 1600;
const NOTE_POOL: NoteName[] = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'];

class PlayScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;

  private notes!: Phaser.Physics.Arcade.Group;

  private dust!: Phaser.Physics.Arcade.Group;

  private scoreSystem = new ScoreSystem(GAME_DURATION_MS);

  private scoreText!: Phaser.GameObjects.Text;

  private comboText!: Phaser.GameObjects.Text;

  private timerText!: Phaser.GameObjects.Text;

  private mistakesText!: Phaser.GameObjects.Text;

  private pauseOverlay?: Phaser.GameObjects.Text;

  private paused = false;

  private currentLane = 1;

  private spawnTimer?: Phaser.Time.TimerEvent;

  private dustTimer?: Phaser.Time.TimerEvent;

  private reducedMotion = store.isReducedMotion();

  private settingsPanel?: SettingsPanel;

  private sparkPool!: Phaser.GameObjects.Group;

  constructor() {
    super(GAME_SCENES.PLAY);
  }

  create(): void {
    this.cameras.main.setBackgroundColor(colors.ebony);
    this.scoreSystem.start();
    this.createPlayer();
    this.createGroups();
    this.sparkPool = this.add.group({ classType: Phaser.GameObjects.Image, maxSize: 20 });
    this.createUI();
    this.configureAudio();
    this.configureInput();
    this.startSpawners();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      store.getAudio().stopLoop();
    });
  }

  update(_time: number, delta: number): void {
    if (this.paused) {
      return;
    }
    this.scoreSystem.update(delta);
    this.refreshHud();

    this.notes.children.each((child) => {
      const sprite = child as Phaser.Physics.Arcade.Sprite;
      if (sprite.active && sprite.y > this.scale.height + 50) {
        sprite.disableBody(true, true);
        this.handleMiss();
      }
      return true;
    });

    this.dust.children.each((child) => {
      const sprite = child as Phaser.Physics.Arcade.Sprite;
      if (sprite.active && sprite.y > this.scale.height + 50) {
        sprite.disableBody(true, true);
      }
      return true;
    });

    if (this.scoreSystem.isOver()) {
      this.endGame();
    }
  }

  private createPlayer(): void {
    this.player = this.physics.add.sprite(this.scale.width / 2 + LANES[this.currentLane], this.scale.height - 120, 'piano-avatar');
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(5);
    this.player.body?.setCircle(28, 8, 4);
  }

  private createGroups(): void {
    this.notes = this.physics.add.group({
      classType: Phaser.Physics.Arcade.Sprite,
      maxSize: 48,
    });
    this.notes.createMultiple({ key: 'note-token', quantity: 12, active: false, visible: false });
    this.dust = this.physics.add.group({
      classType: Phaser.Physics.Arcade.Sprite,
      maxSize: 24,
    });
    this.dust.createMultiple({ key: 'dust-token', quantity: 6, active: false, visible: false });

    this.physics.add.overlap(this.player, this.notes, (_player, note) => {
      const sprite = note as Phaser.Physics.Arcade.Sprite;
      this.collectNote(sprite);
    });

    this.physics.add.overlap(this.player, this.dust, (_player, hazard) => {
      const sprite = hazard as Phaser.Physics.Arcade.Sprite;
      this.collideDust(sprite);
    });
  }

  private createUI(): void {
    this.scoreText = this.add.text(32, 28, 'Score: 0', {
      fontFamily: typography.body,
      fontSize: '26px',
      color: colors.cream,
    });

    this.comboText = this.add.text(32, 60, 'Combo: 0', {
      fontFamily: typography.body,
      fontSize: '20px',
      color: colors.teal,
    });

    this.timerText = this.add.text(this.scale.width / 2, 28, '01:00', {
      fontFamily: typography.heading,
      fontSize: '32px',
      color: colors.brass,
    });
    this.timerText.setOrigin(0.5, 0);

    this.mistakesText = this.add.text(this.scale.width - 32, 28, 'Mistakes: 0/3', {
      fontFamily: typography.body,
      fontSize: '20px',
      color: colors.royalRed,
    });
    this.mistakesText.setOrigin(1, 0);

    const pauseButton = this.add.text(this.scale.width - 32, 64, 'Pause', {
      fontFamily: typography.body,
      fontSize: '18px',
      color: colors.cream,
      backgroundColor: Phaser.Display.Color.HexStringToColor(colors.royalRed).rgba,
      padding: { x: 10, y: 6 },
    });
    pauseButton.setOrigin(1, 0);
    pauseButton.setInteractive({ useHandCursor: true });
    pauseButton.on('pointerdown', () => this.togglePause());

    const settingsButton = this.add.text(this.scale.width - 130, 64, 'Settings', {
      fontFamily: typography.body,
      fontSize: '18px',
      color: colors.cream,
      backgroundColor: Phaser.Display.Color.HexStringToColor(colors.teal).rgba,
      padding: { x: 10, y: 6 },
    });
    settingsButton.setOrigin(1, 0);
    settingsButton.setInteractive({ useHandCursor: true });
    settingsButton.on('pointerdown', () => {
      if (this.settingsPanel) {
        return;
      }
      this.togglePause(true);
      this.settingsPanel = new SettingsPanel(this, (_settings) => {
        this.togglePause(false);
        this.reducedMotion = _settings.reducedMotion;
        this.settingsPanel = undefined;
      });
      this.settingsPanel.setScrollFactor(0);
    });
  }

  private configureAudio(): void {
    void store
      .getAudio()
      .initialize()
      .then(() => store.getAudio().startLoop())
      .catch(() => undefined);
  }

  private configureInput(): void {
    const keys = this.input.keyboard?.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      pause: Phaser.Input.Keyboard.KeyCodes.P,
      mute: Phaser.Input.Keyboard.KeyCodes.M,
    }) as {
      left: Phaser.Input.Keyboard.Key;
      right: Phaser.Input.Keyboard.Key;
      pause: Phaser.Input.Keyboard.Key;
      mute: Phaser.Input.Keyboard.Key;
    } | undefined;

    keys?.left.on('down', () => this.moveLane(-1));
    keys?.right.on('down', () => this.moveLane(1));
    keys?.pause.on('down', () => this.togglePause());
    keys?.mute.on('down', async () => {
      const next = !store.getAudio().muted;
      await store.updateSettings({ muted: next });
    });

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const normalized = pointer.x / this.scale.width;
      if (normalized < 0.33) {
        this.setLane(0);
      } else if (normalized > 0.66) {
        this.setLane(2);
      } else {
        this.setLane(1);
      }
    });
  }

  private startSpawners(): void {
    this.spawnTimer = this.time.addEvent({
      delay: NOTE_SPAWN_INTERVAL,
      callback: () => this.spawnNote(),
      loop: true,
    });

    this.dustTimer = this.time.addEvent({
      delay: DUST_SPAWN_INTERVAL,
      callback: () => this.spawnDust(),
      loop: true,
    });
  }

  private moveLane(direction: number): void {
    this.setLane(Phaser.Math.Clamp(this.currentLane + direction, 0, LANES.length - 1));
  }

  private setLane(index: number): void {
    if (index === this.currentLane) {
      return;
    }
    this.currentLane = index;
    const targetX = this.scale.width / 2 + LANES[this.currentLane];
    if (this.reducedMotion) {
      this.player.setX(targetX);
    } else {
      this.tweens.add({
        targets: this.player,
        x: targetX,
        duration: 200,
        ease: 'Sine.easeInOut',
      });
    }
  }

  private spawnNote(): void {
    const laneIndex = Phaser.Math.Between(0, LANES.length - 1);
    const noteName = Phaser.Utils.Array.GetRandom(NOTE_POOL);
    const spawnX = this.scale.width / 2 + LANES[laneIndex];
    const sprite = this.notes.get(spawnX, -40, 'note-token') as Phaser.Physics.Arcade.Sprite;
    if (!sprite) {
      return;
    }
    sprite.setActive(true);
    sprite.setVisible(true);
    sprite.setVelocityY(160 + this.scoreSystem.getSnapshot().combo * 5);
    sprite.setData('note', noteName);
    sprite.body?.setSize(30, 50);
  }

  private spawnDust(): void {
    const laneIndex = Phaser.Math.Between(0, LANES.length - 1);
    const spawnX = this.scale.width / 2 + LANES[laneIndex];
    const sprite = this.dust.get(spawnX, -40, 'dust-token') as Phaser.Physics.Arcade.Sprite;
    if (!sprite) {
      return;
    }
    sprite.setActive(true);
    sprite.setVisible(true);
    sprite.setVelocityY(120);
    sprite.body?.setCircle(16, 8, 8);
  }

  private collectNote(sprite: Phaser.Physics.Arcade.Sprite): void {
    const note = (sprite.getData('note') || Phaser.Utils.Array.GetRandom(NOTE_POOL)) as NoteName;
    sprite.disableBody(true, true);
    const gained = this.scoreSystem.registerNote(note);
    this.showSparkle(sprite.x, sprite.y);
    void store.getAudio().playNote(note, 0.8 + Math.random() * 0.2);
    this.scoreText.setText(`Score: ${this.scoreSystem.getSnapshot().totalScore}`);
    this.comboText.setText(`Combo: ${this.scoreSystem.getSnapshot().combo}`);
    if (gained > 0 && !this.reducedMotion) {
      const floating = this.add.text(sprite.x, sprite.y - 20, `+${gained}`, {
        fontFamily: typography.body,
        fontSize: '16px',
        color: colors.cream,
      });
      floating.setOrigin(0.5);
      this.tweens.add({
        targets: floating,
        y: sprite.y - 60,
        alpha: 0,
        duration: 600,
        onComplete: () => floating.destroy(),
      });
    }
  }

  private collideDust(sprite: Phaser.Physics.Arcade.Sprite): void {
    sprite.disableBody(true, true);
    this.handleMiss();
    this.cameras.main.shake(180, this.reducedMotion ? 0.002 : 0.01);
  }

  private handleMiss(): void {
    const mistakes = this.scoreSystem.registerMiss();
    this.comboText.setText('Combo: 0');
    this.mistakesText.setText(`Mistakes: ${mistakes}/${3}`);
    if (mistakes >= 3) {
      this.endGame();
    }
  }

  private refreshHud(): void {
    const snapshot = this.scoreSystem.getSnapshot();
    const remaining = Math.ceil(snapshot.remainingMs / 1000);
    const minutes = Math.floor(remaining / 60)
      .toString()
      .padStart(2, '0');
    const seconds = (remaining % 60).toString().padStart(2, '0');
    this.timerText.setText(`${minutes}:${seconds}`);
    this.scoreText.setText(`Score: ${snapshot.totalScore}`);
    this.comboText.setText(`Combo: ${snapshot.combo}`);
  }

  private togglePause(force?: boolean): void {
    const shouldPause = typeof force === 'boolean' ? force : !this.paused;
    if (shouldPause === this.paused) {
      return;
    }
    this.paused = shouldPause;
    this.physics.world.isPaused = shouldPause;
    this.spawnTimer && (this.spawnTimer.paused = shouldPause);
    this.dustTimer && (this.dustTimer.paused = shouldPause);
    if (shouldPause) {
      this.pauseOverlay = this.add.text(this.scale.width / 2, this.scale.height / 2, 'Paused', {
        fontFamily: typography.heading,
        fontSize: '64px',
        color: colors.cream,
      });
      this.pauseOverlay.setOrigin(0.5);
    } else {
      this.pauseOverlay?.destroy();
    }
  }

  private showSparkle(x: number, y: number): void {
    if (this.reducedMotion) {
      return;
    }
    const sparkle = (this.sparkPool.get(x, y, 'spark') as Phaser.GameObjects.Image) ?? this.add.image(x, y, 'spark');
    sparkle.setActive(true);
    sparkle.setVisible(true);
    sparkle.setAlpha(1);
    sparkle.setScale(0.6);
    this.tweens.add({
      targets: sparkle,
      alpha: 0,
      scale: 1.4,
      duration: 400,
      onComplete: () => {
        this.sparkPool.killAndHide(sparkle);
        sparkle.setActive(false);
        sparkle.setVisible(false);
      },
    });
  }

  private endGame(): void {
    this.spawnTimer?.remove(false);
    this.dustTimer?.remove(false);
    this.time.delayedCall(200, () => {
      const summary = this.scoreSystem.finalize();
      void submitScore(summary);
      this.scene.start(GAME_SCENES.GAME_OVER, { summary });
    });
  }
}

export default PlayScene;
