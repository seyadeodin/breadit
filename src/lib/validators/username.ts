import { z } from 'zod';

export const usernameValidator = z.object({
  name: z
    .string()
    .min(3)
    .max(32)
    .regex(/^[A-Za-z0-9_]+$/),
});

export type UsernameRequest = z.infer<typeof usernameValidator>;
