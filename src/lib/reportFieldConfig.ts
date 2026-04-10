// Centralized report field configuration for frontend-backend sync
// This is the source of truth for required fields in each report type

export interface FieldConfig {
  key: string;
  label: string;
  required: boolean;
  minLength?: number;
  requiredFor?: string[]; // Categories that require this field
  requiredWhen?: { field: string; values: string[] }; // Conditional requirement
}

export interface ReportConfig {
  fields: FieldConfig[];
}

export interface TransportSubcategoryOption {
  value: string;
  label: string;
}

export const TRANSPORT_SUBCATEGORIES: Readonly<Record<string, readonly TransportSubcategoryOption[]>> = {
  atraso: [
    { value: "nao_passou", label: "Não passou" },
    { value: "atraso_maior_30", label: "Veio com mais de 30 min de atraso" },
    { value: "atraso_menor_30", label: "Veio com menos de 30 min de atraso" },
    { value: "intervalo_irregular", label: "Intervalo irregular" },
  ],
  lotacao: [
    { value: "superlotado", label: "Veículo superlotado" },
    { value: "nao_conseguiu_embarcar", label: "Não consegui embarcar" },
    { value: "fila_excessiva", label: "Fila excessiva no ponto/estação" },
    { value: "ar_condicionado_inoperante", label: "Ar-condicionado inoperante" },
  ],
  seguranca: [
    { value: "assedio", label: "Assédio/Importunação" },
    { value: "furto_roubo", label: "Furto/Roubo" },
    { value: "agressao_ameaca", label: "Agressão/Ameaça" },
    { value: "briga_confusao", label: "Briga/Confusão" },
  ],
  acessibilidade: [
    { value: "elevador_escada", label: "Elevador/Escada rolante indisponível" },
    { value: "rampa_bloqueada", label: "Rampa bloqueada/inacessível" },
    { value: "veiculo_sem_acessibilidade", label: "Veículo sem acessibilidade" },
    { value: "falta_assistencia", label: "Falta de assistência para embarque" },
  ],
  limpeza: [
    { value: "veiculo_sujo", label: "Veículo sujo" },
    { value: "mau_cheiro", label: "Mau cheiro" },
    { value: "lixo_acumulado", label: "Lixo acumulado" },
    { value: "presenca_pragas", label: "Presença de pragas/insetos" },
  ],
  conducao: [
    { value: "freada_brusca", label: "Freada brusca" },
    { value: "aceleracao_excessiva", label: "Aceleração excessiva" },
    { value: "motorista_imprudente", label: "Condução imprudente do motorista" },
    { value: "nao_parou_ponto", label: "Não parou no ponto" },
  ],
  outro: [
    { value: "outro", label: "Outro (descrever)" },
  ],
};

/**
 * Categorias urbanas com coleta de gravidade/criticidade (risk_level).
 * Exclui feedback_camara. Manter alinhado a `URBAN_RISK_COLLECTION_CATEGORIES` em supabase/functions/ai-orchestrator/lib.ts
 */
export const URBAN_RISK_COLLECTION_CATEGORIES: readonly string[] = [
  'via_publica',
  'pavimentacao',
  'iluminacao',
  'esgoto',
  'area_verde',
  'calcada',
  'sinalizacao',
  'drenagem',
  'poluicao',
  'lixo',
  'higiene_urbana',
  'animais',
  'outro',
];

export const URBAN_REPORT_FIELDS: FieldConfig[] = [
  { key: 'category', label: 'Categoria', required: true },
  { key: 'description', label: 'Descrição', required: true }, // No minLength - semantic validation by LLM
  { key: 'cep', label: 'CEP', required: false },
  { key: 'street', label: 'Rua', required: true },
  { key: 'street_number', label: 'Número', required: false },
  { key: 'neighborhood', label: 'Bairro', required: true },
  { key: 'reference_point', label: 'Referência', required: false },
  { key: 'risk_level', label: 'Gravidade', required: false, requiredFor: [...URBAN_RISK_COLLECTION_CATEGORIES] },
  { key: 'affected_scope', label: 'Afetação', required: false, requiredWhen: { field: 'risk_level', values: ['critical', 'moderate'] } },
];

export const TRANSPORT_REPORT_FIELDS: FieldConfig[] = [
  { key: 'report_type', label: 'Tipo', required: true },
  { key: 'sub_category', label: 'Detalhe do problema', required: true, requiredWhen: { field: 'report_type', values: ['atraso', 'lotacao', 'seguranca', 'acessibilidade', 'limpeza', 'conducao', 'outro'] } },
  { key: 'description', label: 'Descrição', required: true }, // No minLength - semantic validation by LLM
  { key: 'occurrence_date', label: 'Data', required: true },
  { key: 'occurrence_time', label: 'Horário', required: true },
  { key: 'direction', label: 'Sentido', required: true },
  { key: 'line_code', label: 'Linha', required: false },
  { key: 'location', label: 'Local', required: false },
  { key: 'severity', label: 'Gravidade', required: false },
];

export const SERVICE_RATING_FIELDS: FieldConfig[] = [
  { key: 'service_type', label: 'Tipo', required: true },
  { key: 'service_name', label: 'Serviço', required: true },
  { key: 'service_neighborhood', label: 'Bairro', required: false },
  { key: 'service_address', label: 'Endereço', required: false },
  { key: 'service_address_confirmed', label: 'Endereço Confirmado', required: true },
  { key: 'rating_stars', label: 'Avaliação geral (1–5)', required: true },
  { key: 'rating_text', label: 'Comentário', required: true },
];

export const CHAMBER_FEEDBACK_FIELDS: FieldConfig[] = [
  { key: 'subcategory', label: 'Tipo', required: true },
  { key: 'council_member_name', label: 'Vereador(a)', required: false },
  { key: 'council_member_party', label: 'Partido', required: false },
  { key: 'description', label: 'Detalhes', required: true },
];

/**
 * Get required fields that are missing based on collected data
 */
export function getMissingRequiredFields(
  collectionType: 'urban_report' | 'transport_report' | 'service_rating' | null,
  collectedFields: Record<string, unknown>
): string[] {
  if (!collectionType) return [];

  let fields: FieldConfig[];
  
  // Check for chamber feedback (urban_report with category=feedback_camara)
  if (collectionType === 'urban_report' && collectedFields.category === 'feedback_camara') {
    fields = CHAMBER_FEEDBACK_FIELDS;
  } else {
    switch (collectionType) {
      case 'urban_report':
        fields = URBAN_REPORT_FIELDS;
        break;
      case 'transport_report':
        fields = TRANSPORT_REPORT_FIELDS;
        break;
      case 'service_rating':
        fields = SERVICE_RATING_FIELDS;
        break;
      default:
        return [];
    }
  }

  const missing: string[] = [];
  const category = collectedFields.category;

  for (const field of fields) {
    // Skip if already collected
    if (collectedFields[field.key]) continue;

    // Check if required
    let isRequired = field.required;

    // Check conditional requirements (requiredFor)
    if (!isRequired && field.requiredFor && category) {
      isRequired = field.requiredFor.includes(category);
    }

    // Check conditional requirements (requiredWhen)
    if (!isRequired && field.requiredWhen) {
      const dependentValue = collectedFields[field.requiredWhen.field];
      if (dependentValue && field.requiredWhen.values.includes(dependentValue)) {
        isRequired = true;
      }
    }

    if (isRequired) {
      missing.push(field.key);
    }
  }

  return missing;
}

/**
 * Check if all required fields are collected
 */
export function isCollectionComplete(
  collectionType: 'urban_report' | 'transport_report' | 'service_rating' | null,
  collectedFields: Record<string, unknown>
): boolean {
  return getMissingRequiredFields(collectionType, collectedFields).length === 0;
}

/**
 * Get field label by key
 */
export function getFieldLabel(key: string): string {
  const allFields = [
    ...URBAN_REPORT_FIELDS,
    ...TRANSPORT_REPORT_FIELDS,
    ...SERVICE_RATING_FIELDS,
    ...CHAMBER_FEEDBACK_FIELDS,
  ];
  
  const field = allFields.find(f => f.key === key);
  return field?.label || key;
}
