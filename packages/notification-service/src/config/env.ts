import 'dotenv/config';
import { z } from 'zod';

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),
    PORT: z.coerce.number().int().min(1).max(65_535).default(9995),
    HOST: z.string().default('0.0.0.0'),
    LOG_LEVEL: z.string().default('info'),

    DATABASE_URL: z.string().min(1).optional(),
    DB_HOST: z.string().min(1).optional(),
    DB_PORT: z.coerce.number().int().min(1).max(65_535).optional(),
    DB_USER: z.string().min(1).optional(),
    DB_PASSWORD: z.string().optional(),
    DB_DATABASE: z.string().min(1).optional(),
    DB_SSL: z.string().optional(),

    NOTIFICATION_PROVIDER: z.string().trim().min(1).default('mock'),
    NOTIFICATION_MAX_ATTEMPTS: z.coerce
      .number()
      .int()
      .min(1)
      .max(10)
      .default(3),
  })
  .superRefine((value, ctx) => {
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
