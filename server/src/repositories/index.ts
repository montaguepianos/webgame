import InMemoryScoreRepository from './InMemoryScoreRepository';
import FirestoreScoreRepository from './FirestoreScoreRepository';
import type { ScoreRepository } from './ScoreRepository';

export const createScoreRepository = (): ScoreRepository => {
  if (process.env.FIRESTORE_PROJECT) {
    try {
      return new FirestoreScoreRepository();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Falling back to in-memory scores store:', error);
    }
  }
  return new InMemoryScoreRepository();
};

export type { ScoreRepository } from './ScoreRepository';
