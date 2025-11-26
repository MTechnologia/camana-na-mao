import { z } from "zod";

// Auth validations
export const registerSchema = z.object({
  fullName: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  email: z.string().email("E-mail inválido"),
  phone: z.string().min(10, "Telefone inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

export const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

// Profile validations
export const demographicsSchema = z.object({
  birthDate: z.string().optional(),
  gender: z.string().optional(),
  race: z.string().optional(),
  socialClass: z.string().optional(),
});

export const addressSchema = z.object({
  street: z.string().min(3, "Rua é obrigatória"),
  number: z.string().min(1, "Número é obrigatório"),
  complement: z.string().optional(),
  neighborhood: z.string().min(2, "Bairro é obrigatório"),
  city: z.string().min(2, "Cidade é obrigatória"),
  state: z.string().length(2, "Estado deve ter 2 caracteres"),
  zipCode: z.string().length(8, "CEP deve ter 8 dígitos"),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type DemographicsInput = z.infer<typeof demographicsSchema>;
export type AddressInput = z.infer<typeof addressSchema>;
