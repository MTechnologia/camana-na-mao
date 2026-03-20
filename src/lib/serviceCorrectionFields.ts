import type { Json } from "@/integrations/supabase/types";

/** Tipos do formulário de sugestão (coluna correction_type). */
export const SERVICE_CORRECTION_TYPES = [
  {
    value: "horario" as const,
    label: "Horário de funcionamento",
    hint: "Horários incorretos ou desatualizados.",
  },
  {
    value: "servico" as const,
    label: "Serviço / informações do local",
    hint: "O que o equipamento oferece, telefone, status, capacidade etc.",
  },
  {
    value: "localizacao" as const,
    label: "Localização",
    hint: "Endereço, bairro, CEP ou ponto no mapa.",
  },
  {
    value: "outro" as const,
    label: "Outro",
    hint: "Qualquer outra correção relacionada a este equipamento.",
  },
] as const;

export type ServiceCorrectionTypeValue = (typeof SERVICE_CORRECTION_TYPES)[number]["value"];

const CORRECTION_TYPE_LABELS: Record<ServiceCorrectionTypeValue, string> = {
  horario: "Horário de funcionamento",
  servico: "Serviço / informações do local",
  localizacao: "Localização",
  outro: "Outro",
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
  return CORRECTION_TYPE_LABELS[type as ServiceCorrectionTypeValue] ?? type;
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
