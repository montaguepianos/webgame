import { describe, expect, it } from '@jest/globals';
import { scorePayloadSchema, scoreQuerySchema } from './score';

describe('score validators', () => {
  it('accepts well formed payloads', () => {
    const payload = {
      name: 'Alicia',
      score: 1200,
      seed: 'seed-1',
      ts: Date.now(),
    };
    expect(scorePayloadSchema.parse(payload)).toEqual(payload);
  });

  it('rejects invalid payloads', () => {
    const result = scorePayloadSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('normalises query limits', () => {
    const parsed = scoreQuerySchema.parse('10');
    expect(parsed).toBe(10);
  });
});
