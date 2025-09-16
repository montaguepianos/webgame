import { GAME_SCENES } from '@melody-dash/shared';
import type { NoteName, ScoreSummary } from '@melody-dash/shared';

const COMBO_STEP = 0.2;
const BASE_NOTE_SCORE = 100;
const MAX_MISTAKES = 3;
const PEDAL_BONUS = 240;
const REST_TIME_BONUS_MS = 3500;

export interface ScoreSnapshot extends ScoreSummary {
  remainingMs: number;
  isGameOver: boolean;
}

class ScoreSystem {
  private durationMs: number;

  private remainingMs: number;

  private score = 0;

  private combo = 0;

  private maxCombo = 0;

  private mistakes = 0;

  private motif: NoteName[] = [];

  private active = false;

  constructor(durationMs: number) {
    this.durationMs = durationMs;
    this.remainingMs = durationMs;
  }

  start(): void {
    this.active = true;
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.mistakes = 0;
    this.remainingMs = this.durationMs;
    this.motif = [];
  }

  update(delta: number): void {
    if (!this.active) {
      return;
    }
    this.remainingMs = Math.max(0, this.remainingMs - delta);
    if (this.remainingMs <= 0) {
      this.active = false;
    }
  }

  registerNote(note: NoteName, accuracy = 1): number {
    if (!this.active) {
      return this.score;
    }
    this.combo += 1;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    const multiplier = 1 + (this.combo - 1) * COMBO_STEP;
    const gained = Math.round(BASE_NOTE_SCORE * multiplier * accuracy);
    this.score += gained;
    this.motif.push(note);
    return gained;
  }

  registerMiss(): number {
    if (!this.active) {
      return this.mistakes;
    }
    this.combo = 0;
    this.mistakes += 1;
    if (this.mistakes >= MAX_MISTAKES) {
      this.active = false;
    }
    return this.mistakes;
  }

  registerPedal(): { bonus: number; combo: number } {
    if (!this.active) {
      return { bonus: 0, combo: this.combo };
    }
    const bonus = PEDAL_BONUS + Math.round(this.combo * COMBO_STEP * BASE_NOTE_SCORE);
    this.combo += 2;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    this.score += bonus;
    return { bonus, combo: this.combo };
  }

  registerRest(): { timeAdded: number; mistakes: number } {
    if (!this.active) {
      return { timeAdded: 0, mistakes: this.mistakes };
    }
    this.extendTime(REST_TIME_BONUS_MS);
    if (this.mistakes > 0) {
      this.mistakes -= 1;
    }
    return { timeAdded: REST_TIME_BONUS_MS, mistakes: this.mistakes };
  }

  extendTime(amountMs: number): void {
    this.remainingMs = Math.max(
      0,
      Math.min(this.remainingMs + amountMs, this.durationMs + REST_TIME_BONUS_MS),
    );
  }

  isOver(): boolean {
    return !this.active;
  }

  getSnapshot(): ScoreSnapshot {
    return {
      totalScore: this.score,
      combo: this.combo,
      maxCombo: this.maxCombo,
      mistakes: this.mistakes,
      motif: [...this.motif],
      durationMs: this.durationMs,
      remainingMs: this.remainingMs,
      isGameOver: this.isOver(),
    };
  }

  finalize(): ScoreSummary {
    this.active = false;
    return {
      totalScore: this.score,
      combo: this.combo,
      maxCombo: this.maxCombo,
      mistakes: this.mistakes,
      motif: [...this.motif],
      durationMs: this.durationMs,
    };
  }

  reset(durationMs = this.durationMs): void {
    this.durationMs = durationMs;
    this.start();
  }
}

export const SCORE_SCENE_TRANSITIONS = {
  [GAME_SCENES.PLAY]: [GAME_SCENES.GAME_OVER],
};

export default ScoreSystem;
