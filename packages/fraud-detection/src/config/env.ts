import 'dotenv/config';
import { z } from 'zod';

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),
    PORT: z.coerce.number().int().min(1).max(65_535).default(9996),
    HOST: z.string().default('0.0.0.0'),
    LOG_LEVEL: z.string().default('info'),

    DATABASE_URL: z.string().min(1).optional(),
    DB_HOST: z.string().min(1).optional(),
    DB_PORT: z.coerce.number().int().min(1).max(65_535).optional(),
    DB_USER: z.string().min(1).optional(),
    DB_PASSWORD: z.string().optional(),
    DB_DATABASE: z.string().min(1).optional(),
    DB_SSL: z.string().optional(),

    FRAUD_REVIEW_THRESHOLD: z.coerce.number().int().min(0).max(100).default(50),
    FRAUD_BLOCK_THRESHOLD: z.coerce.number().int().min(0).max(100).default(80),
  })
  .superRefine((value, ctx) => {
    if (value.FRAUD_REVIEW_THRESHOLD >= value.FRAUD_BLOCK_THRESHOLD) {
      ctx.addIssue({
        code: 'custom',
        path: ['FRAUD_REVIEW_THRESHOLD'],
        message: 'FRAUD_REVIEW_THRESHOLD deve ser menor que FRAUD_BLOCK_THRESHOLD',
      });
    }
    if (value.DATABASE_URL) return;
    if (!value.DB_HOST || !value.DB_DATABASE || !value.DB_USER) {
      ctx.addIssue({
        code: 'custom',
        path: ['DATABASE_URL'],
        message:
          'Define DATABASE_URL ou, em alternativa, DB_HOST + DB_DATABASE + DB_USER',
      });
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    'Variáveis de ambiente inválidas:',
    parsed.error.flatten().fieldErrors
  );
  process.exit(1);
}

export const env = parsed.data;
