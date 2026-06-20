import { z } from "zod";

export const registerSchema = z.object({
  username: z
    .string()
    .min(3, "El usuario debe tener al menos 3 caracteres")
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/, "Solo letras, números y guión bajo"),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .max(72),
  fullName: z
    .string()
    .min(2, "El nombre completo es requerido")
    .max(100),
});

export const loginSchema = z.object({
  username: z.string().min(1, "Usuario requerido"),
  password: z.string().min(1, "Contraseña requerida"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
