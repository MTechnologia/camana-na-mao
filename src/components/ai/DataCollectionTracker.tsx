import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  Circle,
  FileText,
  Bus,
  Star,
  ChevronDown,
  ChevronUp,
  Users,
  Eye,
  Sparkles,
} from "lucide-react";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { isCompleteServiceRatingDimensions } from "@/lib/serviceRatingDimensions";
import { CitizenSeverityBadge } from "@/components/citizen/CitizenSeverityBadge";
import {
  getFieldLabel as getReportFieldLabel,
  URBAN_RISK_COLLECTION_CATEGORIES,
} from "@/lib/reportFieldConfig";
import { formatTrackerFieldValue } from "@/lib/reportTrackerLabels";

function isTrackerFieldCollected(fieldKey: string, fields: CollectedFields): boolean {
  if (fieldKey === "wait_time_score") return "wait_time_score" in fields;
  if (fieldKey === "rating_stars") {
    const n = Number(fields.rating_stars);
    return Number.isInteger(n) && n >= 1 && n <= 5;
  }
  if (fieldKey === "personal_impact") {
    const n = Number(fields.personal_impact);
    return Number.isInteger(n) && n >= 2 && n <= 5;
  }
  if (fieldKey === "rating_dimensions") {
    return isCompleteServiceRatingDimensions(fields.rating_dimensions);
  }
  return !!fields[fieldKey];
}

export type CollectionType = "urban_report" | "transport_report" | "service_rating" | null;

export interface CollectedFields {
  [key: string]: unknown;
}

interface DataCollectionTrackerProps {
  collectionType: CollectionType;
  collectedFields: CollectedFields;
  currentField?: string;
  className?: string;
}

interface FieldConfig {
  key: string;
  label: string;
  required: boolean;
}

interface CollectionConfig {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  fields: FieldConfig[];
}

const DEFAULT_CONFIGS: Record<string, CollectionConfig> = {
  urban_report: {
    title: "Experiência Urbana",
    icon: FileText,
    fields: [
      { key: "report_nature", label: "Natureza", required: true },
      { key: "category", label: "Categoria", required: true },
      { key: "subcategory", label: "Tipo", required: false },
      { key: "description", label: "Descrição", required: true },
      { key: "cep", label: "CEP", required: false },
      { key: "street", label: "Rua", required: true },
      { key: "street_number", label: "Número", required: false },
      { key: "neighborhood", label: "Bairro", required: true },
      { key: "reference_point", label: "Referência", required: false },
      { key: "risk_level", label: "Gravidade", required: false },
      { key: "affected_scope", label: "Afetação", required: false },
    ],
  },
  transport_report: {
    title: "Experiência Transporte",
    icon: Bus,
    fields: [
      { key: "report_type", label: "Tipo", required: true },
      { key: "sub_category", label: "Detalhe", required: true },
      { key: "description", label: "Descrição", required: true },
      { key: "stop_name", label: "Parada / estação", required: false },
      { key: "stop_location", label: "Ponto / referência", required: false },
      { key: "occurrence_date", label: "Data", required: true },
      { key: "occurrence_time", label: "Horário", required: true },
      { key: "direction", label: "Sentido", required: true },
      { key: "recurrence_frequency", label: "Frequência", required: true },
      { key: "personal_impact", label: "Impacto na rotina", required: true },
      { key: "line_code", label: "Linha", required: false },
      { key: "location", label: "Local", required: false },
      { key: "accessibility_details", label: "Checklist de acessibilidade", required: false },
      { key: "severity", label: "Gravidade", required: false },
    ],
  },
  service_rating: {
    title: "Avaliação de Serviço",
    icon: Star,
    fields: [
      { key: "service_type", label: "Tipo", required: true },
      { key: "service_name", label: "Serviço", required: true },
      { key: "service_neighborhood", label: "Bairro", required: false },
      { key: "service_address_confirmed", label: "Endereço confirmado", required: true },
      { key: "rating_stars", label: "Avaliação geral (1–5)", required: true },
      { key: "wait_time_score", label: "Tempo de espera", required: true },
      { key: "rating_text", label: "Comentário", required: true },
    ],
  },
};

const CHAMBER_FEEDBACK_CONFIG: CollectionConfig = {
  title: "Sua Contribuição",
  icon: Users,
  fields: [
    { key: "subcategory", label: "Tipo", required: true },
    { key: "council_member_name", label: "Vereador", required: false },
    { key: "council_member_party", label: "Partido", required: false },
    { key: "description", label: "Detalhes", required: true },
  ],
};

// Field indicator component
const FieldIndicator = ({
  label,
  isCollected,
  isRequired,
  isCurrent,
}: {
  label: string;
  isCollected: boolean;
  isRequired: boolean;
  isCurrent?: boolean;
}) => (
  <span
    className={cn(
      "inline-flex items-center gap-1 text-xs whitespace-nowrap transition-all duration-200",
      isCurrent && !isCollected
        ? "text-primary font-medium bg-primary/10 px-1.5 py-0.5 rounded-full border border-primary/30 animate-pulse"
        : isCollected
          ? "text-green-600 dark:text-green-400"
          : isRequired
            ? "text-amber-600 dark:text-amber-400"
            : "text-muted-foreground",
    )}
  >
    {isCollected ? (
      <Check className="h-3 w-3 flex-shrink-0" />
    ) : isCurrent ? (
      <Circle className="h-3 w-3 flex-shrink-0 fill-primary/30" />
    ) : (
      <Circle className={cn("h-3 w-3 flex-shrink-0", isRequired ? "fill-amber-500/20" : "")} />
    )}
    {label}
    {isCurrent && !isCollected && <span className="text-[10px] ml-0.5">←</span>}
  </span>
);

const getTrackerStepLabel = (key: string, fields: FieldConfig[]): string => {
  if (key === "wait_time") {
    return fields.find((f) => f.key === "wait_time_score")?.label ?? "Tempo de espera";
  }
  const field = fields.find((f) => f.key === key);
  return field?.label || getReportFieldLabel(key);
};

const DataCollectionTracker = ({
  collectionType,
  collectedFields,
  currentField,
  className,
}: DataCollectionTrackerProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const config = useMemo(() => {
    if (!collectionType) return null;

    if (collectionType === "urban_report" && collectedFields.category === "feedback_camara") {
      return CHAMBER_FEEDBACK_CONFIG;
    }

    const baseConfig = DEFAULT_CONFIGS[collectionType];
    if (!baseConfig) return null;

    if (collectionType === "urban_report") {
      const category = collectedFields.category;
      // `collectedFields` é `unknown`, então tipamos com segurança antes do `includes`.
      const isRiskCategory =
        typeof category === "string" && URBAN_RISK_COLLECTION_CATEGORIES.includes(category);

      if (!isRiskCategory) {
        return {
          ...baseConfig,
          fields: baseConfig.fields.filter(
            (f) => f.key !== "risk_level" && f.key !== "affected_scope",
          ),
        };
      } else {
        return {
          ...baseConfig,
          fields: baseConfig.fields.map((f) =>
            f.key === "risk_level" || f.key === "affected_scope" ? { ...f, required: true } : f,
          ),
        };
      }
    }

    return baseConfig;
  }, [collectionType, collectedFields.category]);

  if (!collectionType || !config) return null;

  const requiredFields = config.fields.filter((f) => f.required);
  const optionalFields = config.fields.filter((f) => !f.required);
  const totalFields = config.fields.length;
  const collectedCount = config.fields.filter((f) =>
    isTrackerFieldCollected(f.key, collectedFields),
  ).length;
  const missingRequiredCount = requiredFields.filter(
    (f) => !isTrackerFieldCollected(f.key, collectedFields),
  ).length;
  const allRequiredCollected = missingRequiredCount === 0;
  const progress = Math.round((collectedCount / totalFields) * 100);
  const hasOptional = optionalFields.length > 0;
  const collectedOptionalCount = optionalFields.filter((f) =>
    isTrackerFieldCollected(f.key, collectedFields),
  ).length;

  const totalRequiredCount = requiredFields.length;
  const completedRequiredCount = requiredFields.filter((f) =>
    isTrackerFieldCollected(f.key, collectedFields),
  ).length;
  const currentStep =
    totalRequiredCount > 0
      ? Math.min(completedRequiredCount + (allRequiredCollected ? 0 : 1), totalRequiredCount)
      : 0;

  const Icon = config.icon;

  const requirementSummary = (() => {
    if (!collectionType) return [];

    if (collectionType === "urban_report") {
      const hasText = !!collectedFields.description;
      const hasLocation = !!collectedFields.street && !!collectedFields.neighborhood;
      return [
        { key: "text", label: "Texto", required: true, fulfilled: hasText },
        { key: "location", label: "Localização", required: true, fulfilled: hasLocation },
        { key: "photo", label: "Foto", required: false, fulfilled: false },
      ];
    }

    if (collectionType === "transport_report") {
      const hasText = !!collectedFields.description;
      const hasWhen = !!collectedFields.occurrence_date;
      const hasLineOrPlace = !!collectedFields.line_code || !!collectedFields.location;
      return [
        { key: "text", label: "Texto", required: true, fulfilled: hasText },
        { key: "when", label: "Quando", required: true, fulfilled: hasWhen },
        { key: "where", label: "Onde", required: false, fulfilled: hasLineOrPlace },
      ];
    }

    if (collectionType === "service_rating") {
      const hasRating =
        isCompleteServiceRatingDimensions(collectedFields.rating_dimensions) ||
        !!collectedFields.rating_stars;
      const hasText = !!collectedFields.rating_text;
      const hasLocation = !!collectedFields.service_address_confirmed;
      return [
        { key: "rating", label: "Avaliação", required: true, fulfilled: hasRating },
        { key: "text", label: "Comentário", required: true, fulfilled: hasText },
        { key: "location", label: "Localização", required: true, fulfilled: hasLocation },
      ];
    }

    return [];
  })();

  // Collapsed (Minimal) Mode
  if (!isExpanded) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn("bg-muted/40 border-b border-border/40", className)}
      >
        <button
          onClick={() => setIsExpanded(true)}
          className="w-full px-3 py-2 flex items-center gap-2 hover:bg-muted/60 transition-colors"
          data-testid="tracker-collapsed"
        >
          {/* Progress Bar */}
          <div className="flex-1 flex items-center gap-2">
            <Progress
              value={progress}
              className={cn(
                "h-1.5 flex-1 max-w-[120px]",
                allRequiredCollected && "bg-green-500/20",
              )}
            />
            <span
              className={cn(
                "text-xs font-medium tabular-nums min-w-[32px]",
                allRequiredCollected ? "text-green-600 dark:text-green-400" : "text-foreground",
              )}
            >
              {progress}%
            </span>

            {totalRequiredCount > 0 && (
              <span className="text-[10px] text-muted-foreground ml-1">
                Passo {currentStep} de {totalRequiredCount}
              </span>
            )}
          </div>

          {/* Separator dot */}
          <span className="text-muted-foreground/50">•</span>

          {/* Title with icon */}
          <div className="flex items-center gap-1.5">
            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{config.title}</span>
          </div>

          {/* Current field hint or completion badge */}
          {allRequiredCollected ? (
            <motion.span
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-1 text-[10px] font-medium text-green-600 dark:text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full"
            >
              <Sparkles className="h-3 w-3" />
              Pronto
            </motion.span>
          ) : currentField ? (
            <span className="text-[10px] text-primary truncate max-w-[100px]">
              → {getTrackerStepLabel(currentField, config.fields)}
            </span>
          ) : null}

          {/* Expand indicator */}
          <ChevronDown className="h-4 w-4 text-muted-foreground ml-auto" />
        </button>
      </motion.div>
    );
  }

  // Expanded Mode
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.2 }}
        className={cn("bg-muted/40 border-b border-border/40", className)}
        data-testid="tracker-expanded"
      >
        <div className="px-3 py-2 space-y-2">
          {/* Header Row - Clickable to collapse */}
          <button
            onClick={() => setIsExpanded(false)}
            className="w-full flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            {/* Progress */}
            <div className="flex items-center gap-2">
              <Progress
                value={progress}
                className={cn("h-1.5 w-[80px]", allRequiredCollected && "bg-green-500/20")}
              />
              <span
                className={cn(
                  "text-xs font-medium tabular-nums",
                  allRequiredCollected ? "text-green-600 dark:text-green-400" : "text-foreground",
                )}
              >
                {progress}%
              </span>

              {totalRequiredCount > 0 && (
                <span className="text-[10px] text-muted-foreground ml-1 whitespace-nowrap">
                  Passo {currentStep} de {totalRequiredCount}
                </span>
              )}
            </div>

            <span className="text-muted-foreground/50">•</span>

            <div className="flex items-center gap-1.5">
              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-foreground">{config.title}</span>
            </div>

            <span className="text-[10px] text-muted-foreground">
              {collectedCount}/{totalFields}
            </span>

            {!allRequiredCollected && (
              <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                {missingRequiredCount} obrigatório{missingRequiredCount > 1 ? "s" : ""}
              </span>
            )}

            {allRequiredCollected && (
              <span className="text-[10px] font-medium text-green-600 dark:text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                Pronto
              </span>
            )}

            <div className="flex-1" />
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          </button>

          {/* Required Fields */}
          <div className="flex flex-wrap gap-x-3 gap-y-1 overflow-x-auto">
            {requiredFields.map((field) => (
              <FieldIndicator
                key={field.key}
                label={field.label}
                isCollected={isTrackerFieldCollected(field.key, collectedFields)}
                isRequired={true}
                isCurrent={
                  currentField === field.key ||
                  (field.key === "wait_time_score" && currentField === "wait_time")
                }
              />
            ))}
          </div>

          {/* High-level requirement summary (texto, foto, localização, etc.) */}
          {requirementSummary.length > 0 && (
            <div className="flex flex-wrap gap-1.5 text-[10px]">
              {requirementSummary.map((req) => (
                <span
                  key={req.key}
                  className={cn(
                    "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border",
                    req.fulfilled
                      ? "border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-300"
                      : req.required
                        ? "border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-300"
                        : "border-muted-foreground/30 bg-muted text-muted-foreground",
                  )}
                >
                  {req.fulfilled ? <Check className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
                  <span>
                    {req.label}
                    {!req.required && " (opcional)"}
                  </span>
                </span>
              ))}
            </div>
          )}

          {/* Optional Fields */}
          {hasOptional && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase tracking-wide">
                <span>Opcionais</span>
                {collectedOptionalCount > 0 && (
                  <span className="text-foreground">
                    ({collectedOptionalCount}/{optionalFields.length})
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 overflow-x-auto">
                {optionalFields.map((field) => (
                  <FieldIndicator
                    key={field.key}
                    label={field.label}
                    isCollected={isTrackerFieldCollected(field.key, collectedFields)}
                    isRequired={false}
                    isCurrent={
                      currentField === field.key ||
                      (field.key === "wait_time_score" && currentField === "wait_time")
                    }
                  />
                ))}
              </div>
            </div>
          )}

          {/* View Details Button */}
          {collectedCount > 0 && (
            <div className="pt-1 border-t border-border/30">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDetails(!showDetails);
                }}
                className={cn(
                  "flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded transition-colors",
                  showDetails
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                )}
              >
                <Eye className="h-3 w-3" />
                {showDetails ? "Ocultar detalhes" : "Ver detalhes coletados"}
              </button>

              {/* Details Panel */}
              <AnimatePresence>
                {showDetails && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.15 }}
                    className="mt-2 bg-background/60 rounded-md p-2 border border-border/30 space-y-1"
                  >
                    {config.fields
                      .filter((f) => isTrackerFieldCollected(f.key, collectedFields))
                      .map((field) => (
                        <div key={field.key} className="flex items-start gap-2 text-xs">
                          <span className="text-muted-foreground shrink-0 min-w-[70px]">
                            {field.label}:
                          </span>
                          {field.key === "severity" && collectedFields[field.key] ? (
                            <CitizenSeverityBadge
                              severity={String(collectedFields[field.key])}
                              size="sm"
                            />
                          ) : (
                            <span className="text-foreground break-words">
                              {formatTrackerFieldValue(field.key, collectedFields[field.key])}
                            </span>
                          )}
                        </div>
                      ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default DataCollectionTracker;
