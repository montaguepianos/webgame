import request from 'supertest';
import express from 'express';
import { createScoresRouter } from './scores';
import InMemoryScoreRepository from '../repositories/InMemoryScoreRepository';

const buildApp = () => {
  const repository = new InMemoryScoreRepository();
  const app = express();
  app.use(express.json());
  app.use('/api/scores', createScoresRouter(repository));
  return { app, repository };
};

describe('scores routes', () => {
  it('accepts score submissions', async () => {
    const { app } = buildApp();
    const payload = { name: 'Jess', score: 2000, seed: 'local', ts: Date.now() };
    const response = await request(app).post('/api/scores').send(payload);
    expect(response.status).toBe(201);
  });

  it('lists top scores in descending order', async () => {
    const { app, repository } = buildApp();
    await repository.addScore({ name: 'A', score: 10, seed: 's', ts: 1 });
    await repository.addScore({ name: 'B', score: 40, seed: 's', ts: 2 });

    const response = await request(app).get('/api/scores/top?limit=5');
    expect(response.status).toBe(200);
    expect(response.body.entries[0].score).toBe(40);
  });

  it('rejects malformed payloads', async () => {
    const { app } = buildApp();
    const response = await request(app).post('/api/scores').send({});
    expect(response.status).toBe(400);
  });
});
