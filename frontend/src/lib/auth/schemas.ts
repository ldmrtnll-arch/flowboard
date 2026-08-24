import { z } from "zod";

export const authUserSchema = z.object({
  id: z.number().int().positive(),
  email: z.string().email(),
  first_name: z.string(),
  last_name: z.string(),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

export const registerSchema = z.object({
  first_name: z.string().trim().max(150, "First name is too long.").optional(),
  last_name: z.string().trim().max(150, "Last name is too long.").optional(),
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
