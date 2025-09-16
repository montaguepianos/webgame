import type { ScoreSubmission } from '@melody-dash/shared';

export type StoredScore = ScoreSubmission;

export interface ScoreRepository {
  addScore(entry: ScoreSubmission): Promise<void>;
  getTopScores(limit: number): Promise<StoredScore[]>;
}
