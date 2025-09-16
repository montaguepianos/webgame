import { describe, expect, it } from 'vitest';
import { GAME_SCENES } from '@melody-dash/shared';
import ScoreSystem, { SCORE_SCENE_TRANSITIONS } from './ScoreSystem';

describe('ScoreSystem', () => {
  it('increments score and combo with each collected note', () => {
    const system = new ScoreSystem(60_000);
    system.start();
    const first = system.registerNote('C4');
    const second = system.registerNote('E4');

    expect(first).toBeGreaterThan(0);
    expect(second).toBeGreaterThan(first);
    const snapshot = system.getSnapshot();
    expect(snapshot.combo).toBe(2);
    expect(snapshot.totalScore).toBe(first + second);
  });

  it('ends the run after too many mistakes', () => {
    const system = new ScoreSystem(10_000);
    system.start();
    system.registerMiss();
    system.registerMiss();
    expect(system.isOver()).toBe(false);
    system.registerMiss();
    expect(system.isOver()).toBe(true);
  });

  it('decrements the timer over time', () => {
    const system = new ScoreSystem(5_000);
    system.start();
    system.update(1_000);
    expect(system.getSnapshot().remainingMs).toBe(4_000);
  });
});

describe('scene transition guards', () => {
  it('allows play to transition to game over', () => {
    expect(SCORE_SCENE_TRANSITIONS[GAME_SCENES.PLAY]).toContain(GAME_SCENES.GAME_OVER);
  });
});
