import Phaser from 'phaser';
import { GAME_SCENES } from '@melody-dash/shared';
import type { NoteName } from '@melody-dash/shared';
import store from '../state/GameStore';
import { colors, typography } from '../theme';
import ScoreSystem from '../systems/ScoreSystem';
import SettingsPanel from '../ui/SettingsPanel';
import { submitScore } from '../services/ScoresClient';
import { atlas, backgroundKeys } from '../assets/manifest';

const GAME_DURATION_MS = 60_000;
const BASE_SPAWN_INTERVAL = 900;
const MIN_SPAWN_INTERVAL = 520;
const NOTE_POOL: NoteName[] = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'];
const BASE_LANE_SPREAD = 200;
const MAX_LANE_SPREAD = 260;

const enum TokenType {
  GOOD = 'good',
  SOUR = 'sour',
  PEDAL = 'pedal',
  REST = 'rest',
}

const TOKEN_FRAMES: Record<TokenType, string> = {
  [TokenType.GOOD]: 'note_good',
  [TokenType.SOUR]: 'note_sour',
  [TokenType.PEDAL]: 'note_pedal',
  [TokenType.REST]: 'note_rest',
};

const PLAYER_ANIMS = {
  IDLE: 'player-idle',
  HIT: 'player-hit',
};

class PlayScene extends Phaser.Scene {
  static KEY = GAME_SCENES.PLAY;

  private backgrounds: Phaser.GameObjects.TileSprite[] = [];

  private vignette!: Phaser.GameObjects.Image;

  private player!: Phaser.Physics.Arcade.Sprite;

  private notes!: Phaser.Physics.Arcade.Group;

  private scoreSystem = new ScoreSystem(GAME_DURATION_MS);

  private scoreText!: Phaser.GameObjects.Text;

  private comboText!: Phaser.GameObjects.Text;

  private timerText!: Phaser.GameObjects.Text;

  private mistakesText!: Phaser.GameObjects.Text;

  private pauseOverlay?: Phaser.GameObjects.Container;

  private paused = false;

  private currentLane = 1;

  private laneSpread = BASE_LANE_SPREAD;

  private spawnTimer?: Phaser.Time.TimerEvent;

  private reducedMotion = store.isReducedMotion();

  private settingsPanel?: SettingsPanel;

  private sparkEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;

  private dustEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor() {
    super(PlayScene.KEY);
  }

  create(): void {
    this.cameras.main.setBackgroundColor(colors.ebony);
    this.createBackground();
    this.createAnimations();
    this.createPlayer();
    this.createGroups();
    this.createParticles();
    this.createHud();
    this.scoreSystem.start();
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
    this.backgrounds.forEach((layer, index) => {
      const speed = 0.02 + index * 0.03;
      layer.tilePositionY += speed * (delta / 16);
    });
    this.scoreSystem.update(delta);
    this.refreshHud();

    this.notes.children.each((child) => {
      const sprite = child as Phaser.Physics.Arcade.Sprite;
      if (!sprite.active) {
        return true;
      }
      if (sprite.y > this.scale.height + 60) {
        const type = sprite.getData('tokenType') as TokenType;
        sprite.disableBody(true, true);
        if (type !== TokenType.SOUR) {
          this.handleMiss(sprite.x, sprite.y);
        }
      }
      return true;
    });

    if (this.scoreSystem.isOver()) {
      this.endGame();
    }
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
    this.backgrounds.forEach((layer) => {
      layer.setOrigin(0.5);
      layer.setTileScale(1, 1);
    });
    this.vignette = this.add
      .image(width / 2, height / 2, backgroundKeys.vignette)
      .setDepth(6)
      .setAlpha(0.55)
      .setBlendMode(Phaser.BlendModes.MULTIPLY);
    this.vignette.setDisplaySize(width * 1.02, height * 1.02);
  }

  private createAnimations(): void {
    if (this.anims.exists(PLAYER_ANIMS.IDLE)) {
      return;
    }
    this.anims.create({
      key: PLAYER_ANIMS.IDLE,
      frames: [
        { key: atlas.key, frame: 'player_idle_0' },
        { key: atlas.key, frame: 'player_idle_1' },
      ],
      frameRate: 2,
      repeat: -1,
    });
    this.anims.create({
      key: PLAYER_ANIMS.HIT,
      frames: [
        { key: atlas.key, frame: 'player_hit', duration: 90 },
        { key: atlas.key, frame: 'player_idle_0', duration: 120 },
      ],
      repeat: 0,
    });
  }

  private createPlayer(): void {
    this.player = this.physics.add.sprite(
      this.scale.width / 2 + this.getLaneOffset(this.currentLane),
      this.scale.height - 140,
      atlas.key,
      'player_idle_0',
    );
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(5);
    this.player.body?.setCircle(26, 10, 16);
    this.player.play(PLAYER_ANIMS.IDLE);
  }

  private createGroups(): void {
    this.notes = this.physics.add.group({ classType: Phaser.Physics.Arcade.Sprite, maxSize: 48 });
    this.physics.add.overlap(this.player, this.notes, (_player, note) => {
      const sprite = note as Phaser.Physics.Arcade.Sprite;
      this.handleTokenCollision(sprite);
    });
  }

  private createParticles(): void {
    this.sparkEmitter = this.add.particles(0, 0, atlas.key, {
      frame: 'spark',
      speed: { min: 60, max: 160 },
      quantity: 12,
      lifespan: { min: 240, max: 420 },
      scale: { start: 0.6, end: 0.1 },
      alpha: { start: 0.9, end: 0 },
      emitting: false,
      blendMode: Phaser.BlendModes.ADD,
    });

    this.dustEmitter = this.add.particles(0, 0, atlas.key, {
      frame: 'note_sour',
      tint: 0x332022,
      speed: { min: 10, max: 40 },
      quantity: 8,
      lifespan: { min: 260, max: 480 },
      scale: { start: 0.25, end: 0 },
      alpha: { start: 0.45, end: 0 },
      gravityY: 80,
      emitting: false,
    });
  }

  private createHud(): void {
    const scoreContainer = this.add.container(32, 42);
    const scoreChip = this.add.image(0, 0, 'ui-pill');
    scoreChip.setOrigin(0, 0.5);
    this.scoreText = this.add.text(18, -12, 'Score 0', {
      fontFamily: typography.heading,
      fontSize: '26px',
      color: colors.cream,
    });
    this.comboText = this.add.text(18, 12, 'Combo 0', {
      fontFamily: typography.body,
      fontSize: '18px',
      color: colors.teal,
    });
    scoreContainer.add([scoreChip, this.scoreText, this.comboText]);
    scoreContainer.setDepth(7);

    this.timerText = this.add.text(this.scale.width / 2, 32, '01:00', {
      fontFamily: typography.heading,
      fontSize: '36px',
      color: colors.brass,
      stroke: colors.ebonySoft,
      strokeThickness: 4,
    });
    this.timerText.setOrigin(0.5, 0);
    this.timerText.setDepth(7);

    const mistContainer = this.add.container(this.scale.width - 32, 42);
    const mistChip = this.add.image(0, 0, 'ui-pill');
    mistChip.setOrigin(1, 0.5);
    mistChip.setFlipX(true);
    this.mistakesText = this.add.text(-180, -12, 'Mistakes 0/3', {
      fontFamily: typography.body,
      fontSize: '18px',
      color: colors.royalRed,
      align: 'right',
    });
    this.mistakesText.setOrigin(0, 0);
    mistContainer.add([mistChip, this.mistakesText]);
    mistContainer.setDepth(7);

    const pauseButton = this.createButton(this.scale.width - 32, 96, 'Pause', () =>
      this.togglePause(),
    );
    const settingsButton = this.createButton(this.scale.width - 248, 96, 'Settings', () =>
      this.openSettings(),
    );
    pauseButton.setDepth(7);
    settingsButton.setDepth(7);
  }

  private createButton(
    x: number,
    y: number,
    label: string,
    handler: () => void,
  ): Phaser.GameObjects.Container {
    const button = this.add.container(x, y);
    button.setSize(200, 54);
    const bg = this.add.image(0, 0, 'ui-button');
    bg.setInteractive({ useHandCursor: true });
    const text = this.add.text(0, 0, label, {
      fontFamily: typography.body,
      fontSize: '20px',
      color: colors.ebony,
    });
    text.setOrigin(0.5);
    button.add([bg, text]);
    button.setInteractive(
      new Phaser.Geom.Rectangle(-100, -27, 200, 54),
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
    }) as
      | {
          left: Phaser.Input.Keyboard.Key;
          right: Phaser.Input.Keyboard.Key;
          pause: Phaser.Input.Keyboard.Key;
          mute: Phaser.Input.Keyboard.Key;
        }
      | undefined;

    keys?.left.on('down', () => this.moveLane(-1));
    keys?.right.on('down', () => this.moveLane(1));
    keys?.pause.on('down', () => this.togglePause());
    keys?.mute.on('down', async () => {
      const next = !store.getAudio().muted;
      await store.updateSettings({ muted: next });
    });

    this.input.on('pointerdown', async (pointer: Phaser.Input.Pointer) => {
      await store.getAudio().unlock();
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
      delay: BASE_SPAWN_INTERVAL,
      callback: () => this.spawnToken(),
      loop: true,
    });
  }

  private spawnToken(): void {
    const combo = this.scoreSystem.getSnapshot().combo;
    const difficulty = Phaser.Math.Clamp(combo / 24, 0, 1);
    const laneIndex = Phaser.Math.Between(0, 2);
    const x = this.scale.width / 2 + this.getLaneOffset(laneIndex);
    const type = this.pickTokenType();
    const frame = TOKEN_FRAMES[type];
    const sprite = this.notes.get(x, -80, atlas.key, frame) as Phaser.Physics.Arcade.Sprite;
    if (!sprite) {
      return;
    }
    sprite.setActive(true);
    sprite.setVisible(true);
    sprite.setDepth(4);
    sprite.setScale(1);
    sprite.setData('tokenType', type);
    const noteName = Phaser.Utils.Array.GetRandom(NOTE_POOL);
    sprite.setData('note', noteName);
    const speed = 170 + difficulty * 80 + Phaser.Math.Between(-12, 12);
    sprite.setVelocityY(speed);
    sprite.body?.setCircle(32, 16, 18);
    if (!this.reducedMotion) {
      sprite.alpha = 0;
      sprite.scale = 0.8;
      this.tweens.add({
        targets: sprite,
        alpha: 1,
        scale: 1,
        duration: 220,
        ease: 'Back.easeOut',
      });
    }
    this.updateSpawnRhythm(difficulty);
  }

  private pickTokenType(): TokenType {
    const roll = Phaser.Math.FloatBetween(0, 1);
    if (roll < 0.65) {
      return TokenType.GOOD;
    }
    if (roll < 0.78) {
      return TokenType.SOUR;
    }
    if (roll < 0.88) {
      return TokenType.PEDAL;
    }
    return TokenType.REST;
  }

  private updateSpawnRhythm(difficulty: number): void {
    if (!this.spawnTimer) {
      return;
    }
    const targetDelay = Phaser.Math.Linear(BASE_SPAWN_INTERVAL, MIN_SPAWN_INTERVAL, difficulty);
    if (Math.abs(targetDelay - this.spawnTimer.delay) > 5) {
      this.spawnTimer.reset({
        delay: targetDelay,
        callback: () => this.spawnToken(),
        callbackScope: this,
        loop: true,
      });
    }
  }

  private getLaneOffset(index: number): number {
    return [-this.laneSpread, 0, this.laneSpread][index];
  }

  private moveLane(direction: number): void {
    this.setLane(Phaser.Math.Clamp(this.currentLane + direction, 0, 2));
  }

  private setLane(index: number): void {
    if (index === this.currentLane) {
      return;
    }
    this.currentLane = index;
    const targetX = this.scale.width / 2 + this.getLaneOffset(this.currentLane);
    if (this.reducedMotion) {
      this.player.setX(targetX);
    } else {
      this.tweens.add({
        targets: this.player,
        x: targetX,
        duration: 220,
        ease: 'Sine.easeInOut',
      });
    }
  }

  private handleTokenCollision(sprite: Phaser.Physics.Arcade.Sprite): void {
    const type = sprite.getData('tokenType') as TokenType;
    sprite.disableBody(true, true);
    switch (type) {
      case TokenType.GOOD:
        this.collectGood(sprite);
        break;
      case TokenType.SOUR:
        this.collectSour(sprite);
        break;
      case TokenType.PEDAL:
        this.collectPedal(sprite);
        break;
      case TokenType.REST:
        this.collectRest(sprite);
        break;
      default:
        break;
    }
  }

  private collectGood(sprite: Phaser.Physics.Arcade.Sprite): void {
    const note = (sprite.getData('note') as NoteName) ?? Phaser.Utils.Array.GetRandom(NOTE_POOL);
    const gained = this.scoreSystem.registerNote(note);
    void store.getAudio().playNote(note, 0.9 + Math.random() * 0.2);
    this.animatePlayerHit();
    this.showSparkle(sprite.x, sprite.y);
    this.showFloatingText(sprite.x, sprite.y, `+${gained}`);
  }

  private collectSour(sprite: Phaser.Physics.Arcade.Sprite): void {
    this.handleMiss(sprite.x, sprite.y);
    this.cameras.main.shake(200, this.reducedMotion ? 0.002 : 0.01);
    this.dustEmitter.emitParticleAt(sprite.x, sprite.y);
  }

  private collectPedal(sprite: Phaser.Physics.Arcade.Sprite): void {
    const { bonus, combo } = this.scoreSystem.registerPedal();
    this.animatePlayerHit();
    this.showSparkle(sprite.x, sprite.y - 10);
    this.showFloatingText(sprite.x, sprite.y, `Pedal +${bonus}`);
    this.comboText.setText(`Combo ${combo}`);
  }

  private collectRest(sprite: Phaser.Physics.Arcade.Sprite): void {
    const result = this.scoreSystem.registerRest();
    this.animatePlayerHit();
    this.showFloatingText(sprite.x, sprite.y, '+3s calm');
    this.mistakesText.setText(`Mistakes ${result.mistakes}/3`);
  }

  private animatePlayerHit(): void {
    this.player.play(PLAYER_ANIMS.HIT, true);
    this.player.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.player.play(PLAYER_ANIMS.IDLE, true);
    });
    if (!this.reducedMotion) {
      this.tweens.add({
        targets: this.player,
        scaleX: 0.92,
        scaleY: 1.08,
        yoyo: true,
        duration: 140,
      });
    }
  }

  private showSparkle(x: number, y: number): void {
    this.sparkEmitter.emitParticleAt(x, y);
  }

  private handleMiss(x = this.player.x, y = this.player.y - 20): void {
    const mistakes = this.scoreSystem.registerMiss();
    this.comboText.setText('Combo 0');
    this.mistakesText.setText(`Mistakes ${mistakes}/${3}`);
    this.dustEmitter.emitParticleAt(x, y);
    if (mistakes >= 3) {
      this.endGame();
    }
  }

  private showFloatingText(x: number, y: number, label: string): void {
    if (this.reducedMotion) {
      return;
    }
    const text = this.add.text(x, y - 12, label, {
      fontFamily: typography.body,
      fontSize: '18px',
      color: colors.cream,
      stroke: colors.ebony,
      strokeThickness: 2,
    });
    text.setOrigin(0.5);
    this.tweens.add({
      targets: text,
      y: y - 60,
      alpha: 0,
      duration: 680,
      ease: 'Sine.easeOut',
      onComplete: () => text.destroy(),
    });
  }

  private refreshHud(): void {
    const snapshot = this.scoreSystem.getSnapshot();
    const remaining = Math.ceil(snapshot.remainingMs / 1000);
    const minutes = Math.floor(remaining / 60)
      .toString()
      .padStart(2, '0');
    const seconds = (remaining % 60).toString().padStart(2, '0');
    this.timerText.setText(`${minutes}:${seconds}`);
    this.scoreText.setText(`Score ${snapshot.totalScore}`);
    this.comboText.setText(`Combo ${snapshot.combo}`);

    const nextSpread = Phaser.Math.Linear(
      BASE_LANE_SPREAD,
      MAX_LANE_SPREAD,
      Math.min(snapshot.combo, 20) / 20,
    );
    this.laneSpread = Phaser.Math.Linear(this.laneSpread, nextSpread, 0.15);
  }

  private togglePause(force?: boolean): void {
    const shouldPause = typeof force === 'boolean' ? force : !this.paused;
    if (shouldPause === this.paused) {
      return;
    }
    this.paused = shouldPause;
    this.physics.world.isPaused = shouldPause;
    this.spawnTimer && (this.spawnTimer.paused = shouldPause);
    if (shouldPause) {
      this.pauseOverlay = this.add.container(this.scale.width / 2, this.scale.height / 2);
      const bg = this.add.rectangle(
        0,
        0,
        this.scale.width * 0.6,
        180,
        Phaser.Display.Color.HexStringToColor(colors.ebony).color,
        0.88,
      );
      bg.setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(colors.brass).color, 0.6);
      const text = this.add.text(0, 0, 'Paused', {
        fontFamily: typography.heading,
        fontSize: '56px',
        color: colors.cream,
      });
      text.setOrigin(0.5);
      this.pauseOverlay.add([bg, text]);
    } else {
      this.pauseOverlay?.destroy(true);
      this.pauseOverlay = undefined;
    }
  }

  private openSettings(): void {
    if (this.settingsPanel) {
      return;
    }
    this.togglePause(true);
    this.settingsPanel = new SettingsPanel(this, (settings) => {
      this.togglePause(false);
      this.reducedMotion = settings.reducedMotion;
      this.settingsPanel = undefined;
    });
    this.settingsPanel.setDepth(20);
  }

  private endGame(): void {
    this.spawnTimer?.remove(false);
    this.time.delayedCall(200, () => {
      const summary = this.scoreSystem.finalize();
      void submitScore(summary);
      this.scene.start(GAME_SCENES.GAME_OVER, { summary });
    });
  }
}

export default PlayScene;
