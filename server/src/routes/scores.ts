import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import type { ScoreRepository } from '../repositories';
import { scorePayloadSchema, scoreQuerySchema } from '../validators/score';

export const createScoresRouter = (repository: ScoreRepository): Router => {
  const router = Router();
  const limiter = rateLimit({
    windowMs: 60_000,
    limit: Number(process.env.SCORES_RATE_LIMIT ?? 20),
    standardHeaders: true,
    legacyHeaders: false,
  });

  router.use(limiter);

  router.post('/', async (req, res) => {
    const parsed = scorePayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid score payload', issues: parsed.error.issues });
    }

    try {
      await repository.addScore(parsed.data);
      return res.status(201).json({ ok: true });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to persist score', detail: `${error}` });
    }
  });

  router.get('/top', async (req, res) => {
    const parsed = scoreQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid limit', issues: parsed.error.issues });
    }

    try {
      const entries = await repository.getTopScores(parsed.data.limit);
      return res.json({ entries });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to load scores', detail: `${error}` });
    }
  });

  return router;
};
