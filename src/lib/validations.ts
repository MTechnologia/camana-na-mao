import { z } from "zod";

// Auth validations - Step 1 (Personal Data)
export const registerStep1Schema = z.object({
  fullName: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  email: z.string().email("E-mail inválido"),
  phone: z.string().min(10, "Telefone inválido"),
});

// Auth validations - Step 2 (Password)
export const registerStep2Schema = z.object({
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

// Complete registration schema
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
  birthDate: z.date().optional().nullable(),
  gender: z.string().min(1, "Gênero é obrigatório"),
  race: z.string().min(1, "Raça/Cor é obrigatória"),
  socialClass: z.string().min(1, "Classe social é obrigatória"),
});

export const addressSchema = z.object({
  street: z.string().min(3, "Rua é obrigatória").max(255, "Rua muito longa"),
  number: z.string().min(1, "Número é obrigatório").max(10, "Número muito longo"),
  complement: z.string().max(100, "Complemento muito longo").optional(),
  neighborhood: z.string().min(2, "Bairro é obrigatório").max(100, "Bairro muito longo"),
  city: z.string().min(2, "Cidade é obrigatória").max(100, "Cidade muito longa"),
  state: z.string().length(2, "Estado deve ter 2 caracteres (ex: SP)"),
  zipCode: z.string().regex(/^\d{8}$/, "CEP deve conter apenas 8 dígitos"),
  isPrimary: z.boolean().default(false),
});

export type RegisterStep1Input = z.infer<typeof registerStep1Schema>;
export type RegisterStep2Input = z.infer<typeof registerStep2Schema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type DemographicsInput = z.infer<typeof demographicsSchema>;
export type AddressInput = z.infer<typeof addressSchema>;
