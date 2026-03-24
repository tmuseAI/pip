import { z } from "zod";

const emailSchema = z.email().transform((v) => v.trim().toLowerCase());
const passwordSchema = z.string().min(6, "Password must be at least 6 characters").max(72);

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(10),
});
