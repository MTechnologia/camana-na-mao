import { z } from "zod";
import { unformatPhone } from "./phoneMask";

const BRAZILIAN_DDDS = new Set([
  "11", "12", "13", "14", "15", "16", "17", "18", "19",
  "21", "22", "24", "27", "28",
  "31", "32", "33", "34", "35", "37", "38",
  "41", "42", "43", "44", "45", "46", "47", "48", "49",
  "51", "53", "54", "55",
  "61", "62", "63", "64", "65", "66", "67", "68", "69",
  "71", "73", "74", "75", "77", "79",
  "81", "82", "83", "84", "85", "86", "87", "88", "89",
  "91", "92", "93", "94", "95", "96", "97", "98", "99",
]);

function hasPlausibleFullName(value: string): boolean {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (normalized.length < 5 || /\d/.test(normalized)) return false;
  if (!/^[A-Za-zÀ-ÖØ-öø-ÿ' .-]+$/.test(normalized)) return false;

  const parts = normalized.split(" ").filter(Boolean);
  return parts.length >= 2 && parts.every((part) => /[A-Za-zÀ-ÖØ-öø-ÿ]{2,}/.test(part));
}

function hasPlausibleEmailDomain(value: string): boolean {
  const domain = value.trim().toLowerCase().split("@")[1] ?? "";
  const labels = domain.split(".");
  if (labels.length < 2) return false;
  if (!/^[a-z]{2,}$/.test(labels[labels.length - 1])) return false;

  return labels.every((label) => {
    if (!label || label.startsWith("-") || label.endsWith("-")) return false;
    if (/^\d+$/.test(label)) return false;
    return /[a-z]/.test(label);
  });
}

function isValidBrazilianMobilePhone(value: string): boolean {
  const digits = unformatPhone(value);
  if (digits.length !== 11) return false;
  if (/^(\d)\1+$/.test(digits)) return false;

  const ddd = digits.slice(0, 2);
  const subscriber = digits.slice(2);
  if (!BRAZILIAN_DDDS.has(ddd)) return false;
  if (!subscriber.startsWith("9")) return false;
  if (/^(\d)\1+$/.test(subscriber)) return false;

  return true;
}

const PASSWORD_SPECIAL_CHARACTER_REGEX = /[!@#$%^&*()_+\-=[\]{};':"\\|<>?,./`~]/;

export const passwordRequirements = [
  {
    id: "length",
    label: "Pelo menos 8 caracteres",
    test: (password: string) => password.length >= 8,
  },
  {
    id: "lowercase",
    label: "Uma letra minúscula",
    test: (password: string) => /[a-z]/.test(password),
  },
  {
    id: "uppercase",
    label: "Uma letra maiúscula",
    test: (password: string) => /[A-Z]/.test(password),
  },
  {
    id: "number",
    label: "Um número",
    test: (password: string) => /\d/.test(password),
  },
  {
    id: "special",
    label: "Um caractere especial, como !@#$%&*",
    test: (password: string) => PASSWORD_SPECIAL_CHARACTER_REGEX.test(password),
  },
];

export const validatePasswordPolicy = (password: string) =>
  passwordRequirements.every((requirement) => requirement.test(password));

export const passwordPolicyMessage =
  "A senha deve ter pelo menos 8 caracteres, incluindo letra maiúscula, letra minúscula, número e caractere especial.";

/** Redefinição / troca de senha — mesmas regras do cadastro (registerStep2). */
export const updatePasswordSchema = z
  .object({
    password: z.string().refine(validatePasswordPolicy, passwordPolicyMessage),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

// Auth validations - Step 1 (Personal Data)
export const registerStep1Schema = z.object({
  fullName: z.string()
    .min(3, "Nome deve ter no mínimo 3 caracteres")
    .refine(hasPlausibleFullName, "Informe nome e sobrenome válidos, sem números."),
  email: z.string()
    .email("E-mail inválido")
    .refine(hasPlausibleEmailDomain, "Informe um e-mail com domínio válido."),
  phone: z.string().refine(isValidBrazilianMobilePhone, {
    message: "Informe um celular válido com DDD, no formato (XX) 9XXXX-XXXX.",
  }),
});

// Auth validations - Step 2 (Password)
export const registerStep2Schema = z.object({
  password: z.string().refine(validatePasswordPolicy, passwordPolicyMessage),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

// Complete registration schema
export const registerSchema = z.object({
  fullName: z.string()
    .min(3, "Nome deve ter no mínimo 3 caracteres")
    .refine(hasPlausibleFullName, "Informe nome e sobrenome válidos, sem números."),
  email: z.string()
    .email("E-mail inválido")
    .refine(hasPlausibleEmailDomain, "Informe um e-mail com domínio válido."),
  phone: z.string().refine(isValidBrazilianMobilePhone, {
    message: "Informe um celular válido com DDD, no formato (XX) 9XXXX-XXXX.",
  }),
  password: z.string().refine(validatePasswordPolicy, passwordPolicyMessage),
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
