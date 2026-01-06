import { motion, AnimatePresence } from "framer-motion";
import { Check, Circle, FileText, Bus, Star, ChevronDown, ChevronUp, Users, Eye } from "lucide-react";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";

export type CollectionType = 'urban_report' | 'transport_report' | 'service_rating' | null;

export interface CollectedFields {
  [key: string]: any;
}

// Human-readable labels for field values
const VALUE_LABELS: Record<string, Record<string, string>> = {
  risk_level: {
    critical: 'Crítico',
    moderate: 'Moderado',
    low: 'Baixo',
    none: 'Nenhum'
  },
  affected_scope: {
    individual: 'Individual',
    local: 'Local (rua/quadra)',
    regional: 'Regional (bairro)',
    citywide: 'Cidade toda'
  },
  severity: {
    baixa: 'Baixa',
    media: 'Média',
    alta: 'Alta',
    critica: 'Crítica'
  },
  category: {
    via_publica: 'Via Pública',
    iluminacao: 'Iluminação',
    esgoto: 'Esgoto/Saneamento',
    area_verde: 'Área Verde',
    limpeza: 'Limpeza Urbana',
    transito: 'Trânsito',
    calcada: 'Calçada',
    sinalizacao: 'Sinalização',
    feedback_camara: 'Feedback da Câmara',
    outros: 'Outros'
  },
  subcategory: {
    elogio: 'Elogio',
    reclamacao: 'Reclamação',
    sugestao: 'Sugestão'
  },
  service_type: {
    ubs: 'UBS',
    school: 'Escola',
    ceu: 'CEU',
    hospital: 'Hospital',
    library: 'Biblioteca',
    sports_center: 'Centro Esportivo',
    other: 'Outro'
  }
};

interface DataCollectionTrackerProps {
  collectionType: CollectionType;
  collectedFields: CollectedFields;
  currentField?: string; // Campo sendo solicitado atualmente (destaque visual)
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

const RISK_CATEGORIES = ['via_publica', 'iluminacao', 'esgoto', 'area_verde'];

const DEFAULT_CONFIGS: Record<string, CollectionConfig> = {
  urban_report: {
    title: "Experiência Urbana",
    icon: FileText,
    fields: [
      { key: 'category', label: 'Categoria', required: true },
      { key: 'description', label: 'Descrição', required: true },
      { key: 'cep', label: 'CEP', required: false },
      { key: 'street', label: 'Rua', required: true },
      { key: 'street_number', label: 'Número', required: false },
      { key: 'neighborhood', label: 'Bairro', required: true },
      { key: 'reference_point', label: 'Referência', required: false },
      { key: 'risk_level', label: 'Risco', required: false },
      { key: 'affected_scope', label: 'Afetação', required: false },
    ]
  },
  transport_report: {
    title: "Experiência Transporte",
    icon: Bus,
    fields: [
      { key: 'report_type', label: 'Tipo', required: true },
      { key: 'description', label: 'Descrição', required: true },
      { key: 'occurrence_date', label: 'Data', required: true },
      { key: 'occurrence_time', label: 'Horário', required: false },
      { key: 'line_code', label: 'Linha', required: false },
      { key: 'location', label: 'Local', required: false },
      { key: 'severity', label: 'Gravidade', required: false },
    ]
  },
  service_rating: {
    title: "Avaliação de Serviço",
    icon: Star,
    fields: [
      { key: 'service_type', label: 'Tipo', required: true },
      { key: 'service_name', label: 'Serviço', required: true },
      { key: 'service_neighborhood', label: 'Bairro', required: false },
      { key: 'rating_stars', label: 'Nota', required: true },
      { key: 'rating_text', label: 'Comentário', required: true },
    ]
  }
};

const CHAMBER_FEEDBACK_CONFIG: CollectionConfig = {
  title: "Sua Contribuição",
  icon: Users,
  fields: [
    { key: 'subcategory', label: 'Tipo', required: true },
    { key: 'council_member_name', label: 'Vereador', required: false },
    { key: 'council_member_party', label: 'Partido', required: false },
    { key: 'description', label: 'Detalhes', required: true },
  ]
};

// Circular progress indicator
const CircularProgress = ({ progress, size = 20, isComplete }: { progress: number; size?: number; isComplete: boolean }) => {
  const strokeWidth = 2.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90 flex-shrink-0">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-border"
      />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={isComplete ? "text-green-500" : "text-primary"}
      />
    </svg>
  );
};

// Field indicator component - mobile-friendly, with current field highlight
const FieldIndicator = ({ label, isCollected, isRequired, isCurrent }: { 
  label: string; 
  isCollected: boolean; 
  isRequired: boolean;
  isCurrent?: boolean;
}) => (
  <span className={cn(
    "inline-flex items-center gap-1 text-xs whitespace-nowrap transition-all duration-200",
    isCurrent && !isCollected
      ? "text-primary font-medium bg-primary/10 px-1.5 py-0.5 rounded-full border border-primary/30 animate-pulse"
      : isCollected 
        ? "text-green-600 dark:text-green-400" 
        : isRequired
          ? "text-amber-600 dark:text-amber-400"
          : "text-muted-foreground"
  )}>
    {isCollected ? (
      <Check className="h-3 w-3 flex-shrink-0" />
    ) : isCurrent ? (
      <Circle className="h-3 w-3 flex-shrink-0 fill-primary/30" />
    ) : (
      <Circle className={cn(
        "h-3 w-3 flex-shrink-0",
        isRequired ? "fill-amber-500/20" : ""
      )} />
    )}
    {label}
    {isCurrent && !isCollected && (
      <span className="text-[10px] ml-0.5">←</span>
    )}
  </span>
);

// Format field value for display
const formatFieldValue = (key: string, value: any): string => {
  if (value === null || value === undefined) return '';
  
  // Check for mapped labels
  if (VALUE_LABELS[key] && VALUE_LABELS[key][value]) {
    return VALUE_LABELS[key][value];
  }
  
  // Handle arrays
  if (Array.isArray(value)) {
    return value.map(v => VALUE_LABELS[key]?.[v] || v).join(', ');
  }
  
  // Handle rating stars
  if (key === 'rating_stars' && typeof value === 'number') {
    return `${'★'.repeat(value)}${'☆'.repeat(5 - value)} (${value}/5)`;
  }
  
  // Truncate long text
  if (typeof value === 'string' && value.length > 60) {
    return value.substring(0, 57) + '...';
  }
  
  return String(value);
};

const DataCollectionTracker = ({ 
  collectionType, 
  collectedFields,
  currentField,
  className 
}: DataCollectionTrackerProps) => {
  const [showOptional, setShowOptional] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Debug logging for development
  if (process.env.NODE_ENV === 'development' || typeof window !== 'undefined') {
    console.log('[DataCollectionTracker] Rendering with:', {
      collectionType,
      collectedFields,
      fieldCount: Object.keys(collectedFields).length
    });
  }

  const config = useMemo(() => {
    if (!collectionType) return null;
    
    if (collectionType === 'urban_report' && collectedFields.category === 'feedback_camara') {
      return CHAMBER_FEEDBACK_CONFIG;
    }
    
    const baseConfig = DEFAULT_CONFIGS[collectionType];
    if (!baseConfig) return null;
    
    if (collectionType === 'urban_report') {
      const category = collectedFields.category;
      const isRiskCategory = category && RISK_CATEGORIES.includes(category);
      
      if (!isRiskCategory) {
        return {
          ...baseConfig,
          fields: baseConfig.fields.filter(f => f.key !== 'risk_level' && f.key !== 'affected_scope')
        };
      } else {
        return {
          ...baseConfig,
          fields: baseConfig.fields.map(f => 
            (f.key === 'risk_level' || f.key === 'affected_scope') ? { ...f, required: true } : f
          )
        };
      }
    }
    
    return baseConfig;
  }, [collectionType, collectedFields.category]);

  if (!collectionType || !config) return null;

  const requiredFields = config.fields.filter(f => f.required);
  const optionalFields = config.fields.filter(f => !f.required);
  const totalFields = config.fields.length;
  const collectedCount = config.fields.filter(f => !!collectedFields[f.key]).length;
  const missingRequiredCount = requiredFields.filter(f => !collectedFields[f.key]).length;
  const allRequiredCollected = missingRequiredCount === 0;
  const progress = Math.round((collectedCount / totalFields) * 100);
  const hasOptional = optionalFields.length > 0;
  const collectedOptionalCount = optionalFields.filter(f => !!collectedFields[f.key]).length;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "bg-muted/40 border-b border-border/40",
          className
        )}
      >
        <div className="px-3 py-2 space-y-1.5">
          {/* Header Row */}
          <div className="flex items-center gap-1.5">
            <CircularProgress progress={progress} isComplete={allRequiredCollected} />
            
            <span className="text-xs font-medium text-foreground">
              {config.title}
            </span>
            
            <span className="text-[10px] text-muted-foreground">
              {collectedCount}/{totalFields}
            </span>
            
            {!allRequiredCollected && (
              <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                {missingRequiredCount} obrigatório{missingRequiredCount > 1 ? 's' : ''}
              </span>
            )}
            
            {allRequiredCollected && (
              <span className="text-[10px] font-medium text-green-600 dark:text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded">
                Registrado ✓
              </span>
            )}
            
            {/* Ver Detalhes Button - spacer to push to end */}
            <div className="flex-1" />
            {collectedCount > 0 && (
              <button
                onClick={() => setShowDetails(!showDetails)}
                className={cn(
                  "flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded transition-colors",
                  showDetails 
                    ? "bg-primary/10 text-primary" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <Eye className="h-3 w-3" />
                {showDetails ? 'Ocultar' : 'Ver Detalhes'}
              </button>
            )}
          </div>

          {/* Details Panel - Collected Values */}
          <AnimatePresence>
            {showDetails && collectedCount > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.15 }}
                className="bg-background/60 rounded-md p-2 border border-border/30 space-y-1"
              >
                {config.fields.filter(f => collectedFields[f.key]).map(field => (
                  <div key={field.key} className="flex items-start gap-2 text-xs">
                    <span className="text-muted-foreground shrink-0 min-w-[70px]">
                      {field.label}:
                    </span>
                    <span className="text-foreground break-words">
                      {formatFieldValue(field.key, collectedFields[field.key])}
                    </span>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Required Fields */}
          {!showDetails && (
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {requiredFields.map(field => (
                <FieldIndicator
                  key={field.key}
                  label={field.label}
                  isCollected={!!collectedFields[field.key]}
                  isRequired={true}
                  isCurrent={currentField === field.key}
                />
              ))}
            </div>
          )}

          {/* Optional Fields Toggle + Content */}
          {hasOptional && !showDetails && (
            <>
              <button
                onClick={() => setShowOptional(!showOptional)}
                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
              >
                {showOptional ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
                <span className="uppercase tracking-wide">
                  Opcionais {collectedOptionalCount > 0 && `(${collectedOptionalCount}/${optionalFields.length})`}
                </span>
              </button>

              <AnimatePresence>
                {showOptional && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.15 }}
                    className="flex flex-wrap gap-x-3 gap-y-1"
                  >
                    {optionalFields.map(field => (
                      <FieldIndicator
                        key={field.key}
                        label={field.label}
                        isCollected={!!collectedFields[field.key]}
                        isRequired={false}
                        isCurrent={currentField === field.key}
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default DataCollectionTracker;
