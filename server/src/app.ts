import path from 'node:path';
import express from 'express';
import cors from 'cors';
import { createScoresRouter } from './routes/scores';
import { createScoreRepository } from './repositories';

const app = express();

app.set('trust proxy', 1);

app.use(
  cors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
  }),
);
app.use(express.json({ limit: '1mb' }));

app.get('/healthz', (_req, res) => {
  res.json({ status: 'ok' });
});

const scoreRepository = createScoreRepository();
app.use('/api/scores', createScoresRouter(scoreRepository));

const staticDir = path.resolve(__dirname, 'public');
app.use(express.static(staticDir));
app.get('*', (_req, res) => {
  res.sendFile(path.join(staticDir, 'index.html'));
});

export default app;
