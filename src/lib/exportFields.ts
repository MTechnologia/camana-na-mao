/**
 * HU-7.1 — Catálogo de campos exportáveis em CSV por dataset.
 *
 * Cada campo descreve uma coluna do dataset com:
 *  - `dbColumn`: nome real no Supabase (passado a `.select`)
 *  - `label`: PT-BR amigável (vira o header do CSV)
 *  - `group`: agrupamento visual no dialog
 *  - `inBasicPreset`: se entra no preset "Básicos"
 *  - `kind`: tipo do dado (afeta formatação na serialização)
 */

export type ExportDataset = "urban_reports" | "transport_reports";

export type FieldKind =
  | "text"
  | "number"
  | "datetime"
  | "date"
  | "boolean"
  | "array"
  | "json"
  | "uuid";

export type FieldGroup =
  | "Identificação"
  | "Conteúdo"
  | "Status"
  | "Localização"
  | "Datas"
  | "Avançado";

/** HU-7.3 — Roles que podem exportar este campo. Undefined = qualquer
 *  admin/gestor. Quando definido, apenas as roles listadas têm acesso. */
export type ExportRole = "admin" | "gestor";

export interface ExportField {
  id: string;
  dbColumn: string;
  label: string;
  group: FieldGroup;
  kind: FieldKind;
  inBasicPreset: boolean;
  /** HU-7.3 — Restrição de role; ausente = todos. */
  restrictedToRoles?: ExportRole[];
}

export interface DatasetMeta {
  id: ExportDataset;
  label: string;
  table: string;
  /** Coluna de data padrão usada nos filtros de período. */
  defaultDateColumn: string;
  /** Coluna de ordenação padrão (fallback se o usuário não escolher). */
  defaultOrderColumn: string;
  fields: readonly ExportField[];
}

const URBAN_FIELDS: readonly ExportField[] = [
  // Identificação
  { id: "id", dbColumn: "id", label: "ID interno", group: "Identificação", kind: "uuid", inBasicPreset: false },
  { id: "protocol_code", dbColumn: "protocol_code", label: "Protocolo", group: "Identificação", kind: "text", inBasicPreset: true },
  // Conteúdo
  { id: "category", dbColumn: "category", label: "Categoria", group: "Conteúdo", kind: "text", inBasicPreset: true },
  { id: "subcategory", dbColumn: "subcategory", label: "Subcategoria", group: "Conteúdo", kind: "text", inBasicPreset: true },
  { id: "description", dbColumn: "description", label: "Descrição", group: "Conteúdo", kind: "text", inBasicPreset: false, restrictedToRoles: ["admin"] },
  { id: "report_nature", dbColumn: "report_nature", label: "Natureza do relato", group: "Conteúdo", kind: "text", inBasicPreset: false },
  { id: "affected_scope", dbColumn: "affected_scope", label: "Escopo afetado", group: "Conteúdo", kind: "text", inBasicPreset: false },
  { id: "affected_estimate", dbColumn: "affected_estimate", label: "Pessoas afetadas (estimativa)", group: "Conteúdo", kind: "number", inBasicPreset: false },
  // Status
  { id: "status", dbColumn: "status", label: "Status", group: "Status", kind: "text", inBasicPreset: true },
  { id: "severity", dbColumn: "severity", label: "Severidade", group: "Status", kind: "text", inBasicPreset: true },
  { id: "risk_level", dbColumn: "risk_level", label: "Nível de risco", group: "Status", kind: "text", inBasicPreset: false },
  { id: "urgency_reason", dbColumn: "urgency_reason", label: "Justificativa de urgência", group: "Status", kind: "text", inBasicPreset: false },
  // Localização
  { id: "neighborhood", dbColumn: "neighborhood", label: "Bairro", group: "Localização", kind: "text", inBasicPreset: true },
  { id: "street", dbColumn: "street", label: "Rua", group: "Localização", kind: "text", inBasicPreset: false, restrictedToRoles: ["admin"] },
  { id: "street_number", dbColumn: "street_number", label: "Número", group: "Localização", kind: "text", inBasicPreset: false, restrictedToRoles: ["admin"] },
  { id: "cep", dbColumn: "cep", label: "CEP", group: "Localização", kind: "text", inBasicPreset: false, restrictedToRoles: ["admin"] },
  { id: "reference_point", dbColumn: "reference_point", label: "Ponto de referência", group: "Localização", kind: "text", inBasicPreset: false },
  { id: "location_address", dbColumn: "location_address", label: "Endereço completo", group: "Localização", kind: "text", inBasicPreset: false },
  { id: "latitude", dbColumn: "latitude", label: "Latitude", group: "Localização", kind: "number", inBasicPreset: false },
  { id: "longitude", dbColumn: "longitude", label: "Longitude", group: "Localização", kind: "number", inBasicPreset: false },
  // Datas
  { id: "created_at", dbColumn: "created_at", label: "Criado em", group: "Datas", kind: "datetime", inBasicPreset: true },
  { id: "updated_at", dbColumn: "updated_at", label: "Atualizado em", group: "Datas", kind: "datetime", inBasicPreset: false },
  // Avançado
  { id: "user_id", dbColumn: "user_id", label: "ID do usuário", group: "Avançado", kind: "uuid", inBasicPreset: false, restrictedToRoles: ["admin"] },
  { id: "active_consequences", dbColumn: "active_consequences", label: "Consequências ativas", group: "Avançado", kind: "array", inBasicPreset: false },
  { id: "risk_types", dbColumn: "risk_types", label: "Tipos de risco", group: "Avançado", kind: "array", inBasicPreset: false },
];

const TRANSPORT_FIELDS: readonly ExportField[] = [
  // Identificação
  { id: "id", dbColumn: "id", label: "ID interno", group: "Identificação", kind: "uuid", inBasicPreset: false },
  { id: "protocol_code", dbColumn: "protocol_code", label: "Protocolo", group: "Identificação", kind: "text", inBasicPreset: true },
  // Conteúdo
  { id: "report_type", dbColumn: "report_type", label: "Tipo de relato", group: "Conteúdo", kind: "text", inBasicPreset: true },
  { id: "sub_category", dbColumn: "sub_category", label: "Subcategoria", group: "Conteúdo", kind: "text", inBasicPreset: true },
  { id: "description", dbColumn: "description", label: "Descrição", group: "Conteúdo", kind: "text", inBasicPreset: false, restrictedToRoles: ["admin"] },
  { id: "impact_description", dbColumn: "impact_description", label: "Descrição do impacto", group: "Conteúdo", kind: "text", inBasicPreset: false, restrictedToRoles: ["admin"] },
  { id: "recurrence_frequency", dbColumn: "recurrence_frequency", label: "Frequência de recorrência", group: "Conteúdo", kind: "text", inBasicPreset: false },
  // Status
  { id: "status", dbColumn: "status", label: "Status", group: "Status", kind: "text", inBasicPreset: true },
  { id: "severity", dbColumn: "severity", label: "Severidade", group: "Status", kind: "text", inBasicPreset: true },
  { id: "personal_impact", dbColumn: "personal_impact", label: "Impacto pessoal (1-5)", group: "Status", kind: "number", inBasicPreset: false },
  // Localização
  { id: "line_id", dbColumn: "line_id", label: "ID da linha", group: "Localização", kind: "uuid", inBasicPreset: false },
  { id: "line_code_custom", dbColumn: "line_code_custom", label: "Código da linha (custom)", group: "Localização", kind: "text", inBasicPreset: false },
  { id: "direction", dbColumn: "direction", label: "Sentido", group: "Localização", kind: "text", inBasicPreset: false },
  { id: "stop_name", dbColumn: "stop_name", label: "Nome da parada", group: "Localização", kind: "text", inBasicPreset: false },
  { id: "stop_location", dbColumn: "stop_location", label: "Local da parada", group: "Localização", kind: "text", inBasicPreset: false },
  { id: "location", dbColumn: "location", label: "Local", group: "Localização", kind: "text", inBasicPreset: true },
  // Datas
  { id: "occurrence_date", dbColumn: "occurrence_date", label: "Data da ocorrência", group: "Datas", kind: "date", inBasicPreset: true },
  { id: "occurrence_time", dbColumn: "occurrence_time", label: "Hora da ocorrência", group: "Datas", kind: "text", inBasicPreset: false },
  { id: "created_at", dbColumn: "created_at", label: "Criado em", group: "Datas", kind: "datetime", inBasicPreset: true },
  { id: "updated_at", dbColumn: "updated_at", label: "Atualizado em", group: "Datas", kind: "datetime", inBasicPreset: false },
  { id: "responded_at", dbColumn: "responded_at", label: "Respondido em", group: "Datas", kind: "datetime", inBasicPreset: false },
  // Avançado
  { id: "user_id", dbColumn: "user_id", label: "ID do usuário", group: "Avançado", kind: "uuid", inBasicPreset: false, restrictedToRoles: ["admin"] },
  { id: "accessibility_details", dbColumn: "accessibility_details", label: "Detalhes de acessibilidade", group: "Avançado", kind: "json", inBasicPreset: false, restrictedToRoles: ["admin"] },
  { id: "ai_category", dbColumn: "ai_category", label: "Categoria (IA)", group: "Avançado", kind: "text", inBasicPreset: false },
  { id: "ai_sentiment", dbColumn: "ai_sentiment", label: "Sentimento (IA)", group: "Avançado", kind: "text", inBasicPreset: false },
  { id: "ai_pattern_detected", dbColumn: "ai_pattern_detected", label: "Padrão detectado (IA)", group: "Avançado", kind: "boolean", inBasicPreset: false },
];

export const EXPORT_DATASETS: Record<ExportDataset, DatasetMeta> = {
  urban_reports: {
    id: "urban_reports",
    label: "Relatos urbanos",
    table: "urban_reports",
    defaultDateColumn: "created_at",
    defaultOrderColumn: "created_at",
    fields: URBAN_FIELDS,
  },
  transport_reports: {
    id: "transport_reports",
    label: "Relatos de transporte",
    table: "transport_reports",
    defaultDateColumn: "created_at",
    defaultOrderColumn: "created_at",
    fields: TRANSPORT_FIELDS,
  },
};

export const DATASET_LIST: readonly DatasetMeta[] = [
  EXPORT_DATASETS.urban_reports,
  EXPORT_DATASETS.transport_reports,
];

export function getDataset(id: ExportDataset): DatasetMeta {
  return EXPORT_DATASETS[id];
}

export function getBasicPresetFieldIds(dataset: DatasetMeta): string[] {
  return dataset.fields.filter((f) => f.inBasicPreset).map((f) => f.id);
}

/** Configuração padrão para agendar exportação fora do DataExportDialog. */
export type ExportScheduleConfig = {
  dataset: ExportDataset;
  format: 'csv' | 'xlsx';
  fieldIds: string[];
  orderBy: { fieldId: string; direction: 'asc' | 'desc' };
  filters?: Record<string, unknown>;
  includeSummary?: boolean;
};

export function getDefaultExportScheduleConfig(
  datasetId: ExportDataset = 'urban_reports',
): ExportScheduleConfig {
  const ds = getDataset(datasetId);
  return {
    dataset: datasetId,
    format: 'csv',
    fieldIds: getBasicPresetFieldIds(ds),
    orderBy: { fieldId: ds.defaultOrderColumn, direction: 'desc' },
    includeSummary: false,
  };
}

export function getAllFieldIds(dataset: DatasetMeta): string[] {
  return dataset.fields.map((f) => f.id);
}

/**
 * HU-7.3 — Filtra os campos visíveis para uma role específica.
 *  - Sem `restrictedToRoles`: todos veem.
 *  - Com `restrictedToRoles`: apenas as roles listadas.
 *
 * Quando role=null (nenhuma role definida), só campos não-restritos.
 */
export function filterFieldsByRole(
  fields: readonly ExportField[],
  role: ExportRole | null,
): ExportField[] {
  return fields.filter((f) => {
    if (!f.restrictedToRoles || f.restrictedToRoles.length === 0) return true;
    if (!role) return false;
    return f.restrictedToRoles.includes(role);
  });
}

/** Retorna true se o usuário com essa role pode acessar o campo. */
export function canAccessField(field: ExportField, role: ExportRole | null): boolean {
  if (!field.restrictedToRoles || field.restrictedToRoles.length === 0) return true;
  if (!role) return false;
  return field.restrictedToRoles.includes(role);
}

/**
 * HU-7.3 — Caps de volume por role e por formato. Aplicados em hooks
 * client-side e na edge function server-side.
 */
export const EXPORT_ROW_CAPS: Record<ExportRole, { csv: number; xlsx: number }> = {
  admin: { csv: 5_000_000, xlsx: 1_000_000 },
  gestor: { csv: 100_000, xlsx: 50_000 },
};

export function getRowCap(role: ExportRole | null, format: "csv" | "xlsx"): number {
  if (!role) return 0;
  return EXPORT_ROW_CAPS[role][format];
}

/** Agrupa os campos por `group` preservando a ordem original dentro de cada grupo. */
export function groupFields(
  dataset: DatasetMeta,
): { group: FieldGroup; fields: ExportField[] }[] {
  const order: FieldGroup[] = [
    "Identificação",
    "Conteúdo",
    "Status",
    "Localização",
    "Datas",
    "Avançado",
  ];
  const map = new Map<FieldGroup, ExportField[]>();
  for (const g of order) map.set(g, []);
  for (const f of dataset.fields) {
    map.get(f.group)?.push(f);
  }
  return order.map((g) => ({ group: g, fields: map.get(g) ?? [] }));
}
