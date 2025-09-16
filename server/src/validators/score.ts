import { z } from 'zod';

export const scorePayloadSchema = z.object({
  name: z.string().trim().min(2).max(32),
  score: z.number().int().nonnegative(),
  seed: z.string().trim().min(1).max(64),
  ts: z.number().int().nonnegative(),
});

export type ScorePayload = z.infer<typeof scorePayloadSchema>;

export const scoreQuerySchema = z.object({
  limit: z
    .union([z.string(), z.number()])
    .transform((value) => Number(value))
    .refine((value) => Number.isFinite(value) && value > 0 && value <= 50, {
      message: 'limit must be between 1 and 50',
    })
    .optional()
    .default(20),
});

export type ScoreQuery = z.infer<typeof scoreQuerySchema>;
