import type { Json } from "@/integrations/supabase/types";

/** Tipos do formulário de sugestão (coluna correction_type). */
export const SERVICE_CORRECTION_TYPES = [
  {
    value: "horario_incorreto" as const,
    label: "Horário incorreto",
    hint: "O horário exibido não confere com o da unidade.",
  },
  {
    value: "servico_listado_indisponivel" as const,
    label: "Serviço listado não disponível",
    hint: "Algo consta no app mas a unidade não oferece ou está indisponível.",
  },
  {
    value: "servico_disponivel_nao_listado" as const,
    label: "Serviço disponível não listado",
    hint: "A unidade oferece algo que não aparece no cadastro.",
  },
  {
    value: "localizacao_incorreta" as const,
    label: "Localização / endereço incorreto",
    hint: "Endereço, bairro, CEP ou ponto no mapa está errado.",
  },
  {
    value: "informacao_desatualizada" as const,
    label: "Informação desatualizada",
    hint: "Telefone, nome, textos ou outros dados precisam de atualização.",
  },
] as const;

export type ServiceCorrectionTypeValue = (typeof SERVICE_CORRECTION_TYPES)[number]["value"];

const CORRECTION_TYPE_LABELS: Record<ServiceCorrectionTypeValue, string> = {
  horario_incorreto: "Horário incorreto",
  servico_listado_indisponivel: "Serviço listado não disponível",
  servico_disponivel_nao_listado: "Serviço disponível não listado",
  localizacao_incorreta: "Localização / endereço incorreto",
  informacao_desatualizada: "Informação desatualizada",
};

/** Rótulos para registros anteriores à migração v2 (ex.: export antigo). */
const LEGACY_CORRECTION_TYPE_LABELS: Record<string, string> = {
  horario: "Horário incorreto (legado)",
  servico: "Serviço (legado)",
  localizacao: "Localização (legado)",
  outro: "Informação desatualizada (legado)",
};

/** Chaves legadas em service_corrections.field_name (formulário antigo). */
export const SERVICE_CORRECTION_FIELDS = [
  { key: "name", label: "Nome do equipamento" },
  { key: "address", label: "Endereço (logradouro)" },
  { key: "district", label: "Bairro" },
  { key: "phone", label: "Telefone" },
  { key: "zip_code", label: "CEP" },
  { key: "opening_hours", label: "Horário de funcionamento" },
  { key: "capacity_info", label: "Capacidade / informações adicionais" },
  { key: "operational_status", label: "Status operacional" },
  { key: "services_offered", label: "O que o serviço oferece" },
] as const;

export type ServiceCorrectionFieldKey = (typeof SERVICE_CORRECTION_FIELDS)[number]["key"];

export type ServiceLike = {
  name?: string | null;
  address?: string | null;
  district?: string | null;
  phone?: string | null;
  zip_code?: string | null;
  opening_hours?: Json | null;
  capacity_info?: string | null;
  operational_status?: string | null;
  services_offered?: string | null;
  service_type?: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  open: "Aberto",
  closed: "Fechado",
  maintenance: "Em manutenção",
};

function openingHoursToText(openingHours: Json | null | undefined, serviceType?: string | null): string {
  const text =
    typeof openingHours === "string"
      ? openingHours
      : (openingHours as { text?: string } | null)?.text;
  if (text?.trim()) return text.trim();
  return "";
}

/** Valor exibido como "atual" no formulário de sugestão. */
export function getCorrectionCurrentValue(
  service: ServiceLike,
  fieldKey: ServiceCorrectionFieldKey,
): string {
  switch (fieldKey) {
    case "name":
      return (service.name ?? "").trim();
    case "address":
      return (service.address ?? "").trim();
    case "district":
      return (service.district ?? "").trim();
    case "phone":
      return (service.phone ?? "").trim();
    case "zip_code":
      return (service.zip_code ?? "").trim();
    case "opening_hours": {
      const t = openingHoursToText(service.opening_hours, service.service_type);
      return t || "(não informado — confirme na unidade)";
    }
    case "capacity_info":
      return (service.capacity_info ?? "").trim() || "(não informado)";
    case "operational_status": {
      const s = service.operational_status;
      if (!s) return "(não informado)";
      return STATUS_LABELS[s] ?? String(s);
    }
    case "services_offered":
      return (service.services_offered ?? "").trim() || "(não informado)";
    default:
      return "";
  }
}

export function correctionFieldLabel(fieldKey: string): string {
  const f = SERVICE_CORRECTION_FIELDS.find((x) => x.key === fieldKey);
  return f?.label ?? fieldKey;
}

export function correctionTypeLabel(type: string | null | undefined): string {
  if (!type) return "—";
  const v = CORRECTION_TYPE_LABELS[type as ServiceCorrectionTypeValue];
  if (v) return v;
  return LEGACY_CORRECTION_TYPE_LABELS[type] ?? type;
}

/** Rótulo para lista admin: tipo atual + detalhe legado opcional. */
export function correctionDisplayLabel(
  correctionType: string | null | undefined,
  fieldName: string | null | undefined,
): string {
  const main = correctionTypeLabel(correctionType);
  if (fieldName?.trim()) {
    return `${main} · ${correctionFieldLabel(fieldName)}`;
  }
  return main;
}

/** Resumo do equipamento para current_value (contexto na moderação). */
export function getServiceContextSummary(service: ServiceLike): string {
  const parts = [
    service.name?.trim(),
    [service.address, service.district].filter(Boolean).join(", "),
  ].filter(Boolean);
  return parts.join(" — ") || "(sem resumo)";
}

/** Meta comunicada ao munícipe e usada na fila admin (horas para análise). */
export const SERVICE_CORRECTION_REVIEW_SLA_HOURS = 24;

const SLA_MS = SERVICE_CORRECTION_REVIEW_SLA_HOURS * 60 * 60 * 1000;

/** Limite de tempo (data/hora) para validação após o envio. */
export function serviceCorrectionSlaDeadline(createdAt: string): Date {
  return new Date(new Date(createdAt).getTime() + SLA_MS);
}

/** Pendente e já ultrapassou o prazo desde `created_at`. */
export function isServiceCorrectionSlaOverdue(
  createdAt: string | null | undefined,
  status: string | null | undefined,
): boolean {
  if (!createdAt || status !== "pending") return false;
  return Date.now() > serviceCorrectionSlaDeadline(createdAt).getTime();
}
