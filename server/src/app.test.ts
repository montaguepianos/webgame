import request from 'supertest';
import app from './app';

describe('app', () => {
  it('responds to health checks', async () => {
    const response = await request(app).get('/healthz');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});
