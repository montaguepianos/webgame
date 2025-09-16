import type { ScoreSubmission } from '@melody-dash/shared';
import admin from 'firebase-admin';
import type { ScoreRepository, StoredScore } from './ScoreRepository';

const collectionName = process.env.FIRESTORE_COLLECTION ?? 'scores';

const getCredentials = () => {
  const projectId = process.env.FIRESTORE_PROJECT;
  const clientEmail = process.env.FIRESTORE_CLIENT_EMAIL;
  const privateKey = process.env.FIRESTORE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Firestore credentials are incomplete.');
  }

  return {
    projectId,
    clientEmail,
    privateKey,
  };
};

class FirestoreScoreRepository implements ScoreRepository {
  private collection: FirebaseFirestore.CollectionReference<ScoreSubmission>;

  constructor() {
    if (!admin.apps.length) {
      const credentials = getCredentials();
      admin.initializeApp({
        credential: admin.credential.cert(credentials),
        projectId: credentials.projectId,
      });
    }
    const firestore = admin.firestore();
    this.collection = firestore.collection(collectionName) as FirebaseFirestore.CollectionReference<ScoreSubmission>;
  }

  async addScore(entry: ScoreSubmission): Promise<void> {
    await this.collection.add(entry);
  }

  async getTopScores(limit: number): Promise<StoredScore[]> {
    const snapshot = await this.collection.orderBy('score', 'desc').limit(limit).get();
    return snapshot.docs.map((doc) => doc.data());
  }
}

export default FirestoreScoreRepository;
