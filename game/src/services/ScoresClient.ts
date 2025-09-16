import type { LeaderboardEntry, LeaderboardResponse, ScoreSummary } from '@melody-dash/shared';
import profileStore from '../state/ProfileStore';

const env = (import.meta && import.meta.env) || {};
const scoresEndpoint = env.VITE_SCORES_ENDPOINT ?? '/api/scores';
const flag = (env.VITE_ENABLE_SCORES ?? '').toLowerCase() === 'true';

export const scoresEnabled = flag;

export const fetchTopScores = async (limit = 10): Promise<LeaderboardEntry[]> => {
  if (!scoresEnabled) {
    return [];
  }
  try {
    const response = await fetch(`${scoresEndpoint}/top?limit=${limit}`);
    if (!response.ok) {
      throw new Error('Failed to fetch scores');
    }
    const data = (await response.json()) as LeaderboardResponse;
    return data.entries ?? [];
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('Unable to load scores', error);
    return [];
  }
};

export const submitScore = async (summary: ScoreSummary): Promise<void> => {
  if (!scoresEnabled) {
    return;
  }
  const { name, seed } = profileStore.getProfile();
  try {
    await fetch(`${scoresEndpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        seed,
        score: summary.totalScore,
        ts: Date.now(),
      }),
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('Unable to submit score', error);
  }
};
