import { z } from 'zod';
import { email } from '../common.js';

export const RegisterSchema = z.object({
  email: email,
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long'),
});

export const LoginSchema = z.object({
  email: email,
  password: z.string().min(1, 'Password required').max(128),
});

export const CreateUserSchema = z.object({
  email: email,
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long'),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type CreateUserInput = z.infer<typeof CreateUserSchema>;
