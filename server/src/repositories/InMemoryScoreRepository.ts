import type { ScoreSubmission } from '@melody-dash/shared';
import type { ScoreRepository, StoredScore } from './ScoreRepository';

class InMemoryScoreRepository implements ScoreRepository {
  private scores: StoredScore[] = [];

  async addScore(entry: ScoreSubmission): Promise<void> {
    this.scores.push({ ...entry });
    this.scores.sort((a, b) => b.score - a.score || a.ts - b.ts);
    if (this.scores.length > 100) {
      this.scores.length = 100;
    }
  }

  async getTopScores(limit: number): Promise<StoredScore[]> {
    return this.scores.slice(0, limit);
  }
}

export default InMemoryScoreRepository;
