import { motion, AnimatePresence } from "framer-motion";
import { Check, Circle, MapPin, MessageSquare, FileText, Bus, Star, Clock, Tag, ChevronDown, ChevronUp, Users, User, AlertCircle, Building, Navigation, ShieldAlert, Target } from "lucide-react";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

export type CollectionType = 'urban_report' | 'transport_report' | 'service_rating' | null;

export interface CollectedFields {
  [key: string]: any;
}

interface DataCollectionTrackerProps {
  collectionType: CollectionType;
  collectedFields: CollectedFields;
  className?: string;
}

interface FieldConfig {
  key: string;
  label: string;
  shortLabel?: string;
  icon: React.ComponentType<{ className?: string }>;
  required: boolean;
  group: 'identification' | 'location' | 'impact' | 'details';
}

interface CollectionConfig {
  title: string;
  shortTitle: string;
  icon: React.ComponentType<{ className?: string }>;
  fields: FieldConfig[];
}

// Categories that require impact assessment
const RISK_CATEGORIES = ['via_publica', 'iluminacao', 'esgoto', 'area_verde'];

const DEFAULT_CONFIGS: Record<string, CollectionConfig> = {
  urban_report: {
    title: "Registrando problema urbano",
    shortTitle: "Problema urbano",
    icon: FileText,
    fields: [
      { key: 'category', label: 'Categoria', shortLabel: 'Cat', icon: Tag, required: true, group: 'identification' },
      { key: 'description', label: 'Descrição', shortLabel: 'Desc', icon: MessageSquare, required: true, group: 'identification' },
      { key: 'cep', label: 'CEP', icon: MapPin, required: false, group: 'location' },
      { key: 'street', label: 'Rua', icon: MapPin, required: true, group: 'location' },
      { key: 'street_number', label: 'Número', shortLabel: 'Nº', icon: Navigation, required: false, group: 'location' },
      { key: 'neighborhood', label: 'Bairro', icon: Building, required: true, group: 'location' },
      { key: 'reference_point', label: 'Referência', shortLabel: 'Ref', icon: Navigation, required: false, group: 'location' },
      { key: 'risk_level', label: 'Risco', icon: ShieldAlert, required: false, group: 'impact' },
      { key: 'affected_scope', label: 'Afetação', shortLabel: 'Afet', icon: Target, required: false, group: 'impact' },
    ]
  },
  transport_report: {
    title: "Registrando problema de transporte",
    shortTitle: "Transporte",
    icon: Bus,
    fields: [
      { key: 'report_type', label: 'Tipo', icon: Tag, required: true, group: 'identification' },
      { key: 'description', label: 'Descrição', shortLabel: 'Desc', icon: MessageSquare, required: true, group: 'identification' },
      { key: 'occurrence_date', label: 'Data', icon: Clock, required: true, group: 'details' },
      { key: 'occurrence_time', label: 'Horário', shortLabel: 'Hora', icon: Clock, required: false, group: 'details' },
      { key: 'line_code', label: 'Linha', icon: Bus, required: false, group: 'details' },
      { key: 'location', label: 'Local', icon: MapPin, required: false, group: 'location' },
      { key: 'severity', label: 'Gravidade', shortLabel: 'Grav', icon: AlertCircle, required: false, group: 'impact' },
    ]
  },
  service_rating: {
    title: "Avaliando serviço público",
    shortTitle: "Avaliação",
    icon: Star,
    fields: [
      { key: 'service_type', label: 'Tipo', icon: Tag, required: true, group: 'identification' },
      { key: 'service_name', label: 'Serviço', shortLabel: 'Serv', icon: FileText, required: true, group: 'identification' },
      { key: 'service_neighborhood', label: 'Bairro', icon: Building, required: false, group: 'location' },
      { key: 'rating_stars', label: 'Nota', icon: Star, required: true, group: 'details' },
      { key: 'rating_text', label: 'Comentário', shortLabel: 'Com', icon: MessageSquare, required: true, group: 'details' },
    ]
  }
};

// Special config for chamber feedback
const CHAMBER_FEEDBACK_CONFIG: CollectionConfig = {
  title: "Feedback sobre Vereador/Câmara",
  shortTitle: "Feedback",
  icon: Users,
  fields: [
    { key: 'subcategory', label: 'Tipo', icon: Tag, required: true, group: 'identification' },
    { key: 'council_member_name', label: 'Vereador(a)', shortLabel: 'Ver', icon: User, required: false, group: 'details' },
    { key: 'council_member_party', label: 'Partido', shortLabel: 'Part', icon: Tag, required: false, group: 'details' },
    { key: 'description', label: 'Detalhes', shortLabel: 'Det', icon: MessageSquare, required: true, group: 'identification' },
  ]
};

const CATEGORY_LABELS: Record<string, string> = {
  iluminacao: 'Iluminação', calcada: 'Calçada', via_publica: 'Via Pública',
  lixo: 'Lixo/Entulho', esgoto: 'Esgoto/Bueiro', area_verde: 'Área Verde',
  higiene_urbana: 'Higiene Urbana', animais: 'Animais', poluicao: 'Poluição',
  outro: 'Outro', feedback_camara: 'Feedback Câmara',
  atraso: 'Atraso', lotacao: 'Lotação', seguranca: 'Segurança',
  acessibilidade: 'Acessibilidade', limpeza: 'Limpeza',
  ubs: 'UBS', school: 'Escola', ceu: 'CEU', hospital: 'Hospital',
  library: 'Biblioteca', sports_center: 'Centro Esportivo',
  elogio: 'Elogio', reclamacao: 'Reclamação', sugestao: 'Sugestão',
  baixa: 'Baixa', media: 'Média', alta: 'Alta', critica: 'Crítica',
  critical: 'Crítico', moderate: 'Moderado', low: 'Baixo', none: 'Nenhum',
  individual: 'Individual', street: 'Rua toda', neighborhood: 'Bairro',
  zone: 'Zona', city: 'Cidade',
};

// Circular progress indicator
const CircularProgress = ({ progress, size = 20, isComplete }: { progress: number; size?: number; isComplete: boolean }) => {
  const strokeWidth = 2.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-muted/30"
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

const DataCollectionTracker = ({ 
  collectionType, 
  collectedFields,
  className 
}: DataCollectionTrackerProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

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

  const totalFields = config.fields.length;
  const collectedCount = config.fields.filter(f => !!collectedFields[f.key]).length;
  const requiredFields = config.fields.filter(f => f.required);
  const collectedRequiredCount = requiredFields.filter(f => collectedFields[f.key]).length;
  const missingRequiredCount = requiredFields.length - collectedRequiredCount;
  const allRequiredCollected = missingRequiredCount === 0;
  const progress = Math.round((collectedCount / totalFields) * 100);
  
  // Separate required and optional fields
  const optionalFields = config.fields.filter(f => !f.required);
  const hasOptionalFields = optionalFields.length > 0;

  const formatValue = (key: string, value: any): string => {
    if (!value) return '';
    if (CATEGORY_LABELS[value]) return CATEGORY_LABELS[value];
    if (typeof value === 'string' && value.length > 15) return value.slice(0, 15) + '…';
    if (key === 'rating_stars') return '⭐'.repeat(Math.min(value, 5));
    return String(value);
  };

  const FieldChip = ({ field, isCompact = false }: { field: FieldConfig; isCompact?: boolean }) => {
    const isCollected = !!collectedFields[field.key];
    const value = collectedFields[field.key];
    const displayLabel = isCompact ? (field.shortLabel || field.label) : field.label;

    return (
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs transition-colors",
                isCollected 
                  ? "text-primary" 
                  : field.required
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-muted-foreground"
              )}
            >
              {isCollected ? (
                <Check className="h-3 w-3 text-green-500" />
              ) : (
                <Circle className={cn(
                  "h-3 w-3",
                  field.required ? "text-amber-500" : "text-muted-foreground/50"
                )} />
              )}
              <span className={cn(
                "font-medium",
                isCollected && "text-foreground"
              )}>
                {displayLabel}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            <p className="font-medium">{field.label}</p>
            {isCollected && value && (
              <p className="text-muted-foreground">{formatValue(field.key, value)}</p>
            )}
            {!isCollected && field.required && (
              <p className="text-amber-500">Obrigatório</p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "bg-muted/30 border-b border-border/50",
          className
        )}
      >
        <div className="px-3 py-2">
          {/* Compact Header */}
          <div className="flex items-center gap-2">
            {/* Circular Progress */}
            <CircularProgress progress={progress} isComplete={allRequiredCollected} />
            
            {/* Title + Status */}
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <span className="text-xs font-medium text-foreground truncate">
                {config.shortTitle}
              </span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className={cn(
                "text-xs font-medium",
                allRequiredCollected ? "text-green-600" : "text-muted-foreground"
              )}>
                {collectedCount}/{totalFields}
              </span>
              {!allRequiredCollected && (
                <>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs text-amber-600 dark:text-amber-400">
                    {missingRequiredCount} obrig.
                  </span>
                </>
              )}
            </div>

            {/* Required Fields Inline (compact) */}
            <div className="hidden sm:flex items-center gap-0.5 flex-shrink-0">
              {requiredFields.slice(0, 4).map(field => (
                <FieldChip key={field.key} field={field} isCompact />
              ))}
              {requiredFields.length > 4 && (
                <span className="text-xs text-muted-foreground ml-1">
                  +{requiredFields.length - 4}
                </span>
              )}
            </div>

            {/* Expand Toggle */}
            {hasOptionalFields && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1 rounded hover:bg-muted transition-colors flex-shrink-0"
                aria-label={isExpanded ? "Recolher" : "Expandir"}
              >
                {isExpanded ? (
                  <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </button>
            )}
          </div>

          {/* Mobile: Required fields row */}
          <div className="flex sm:hidden items-center gap-0.5 mt-1.5 flex-wrap">
            {requiredFields.map(field => (
              <FieldChip key={field.key} field={field} isCompact />
            ))}
          </div>

          {/* Expanded: Optional fields */}
          <AnimatePresence>
            {isExpanded && hasOptionalFields && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.15 }}
                className="mt-2 pt-2 border-t border-border/30"
              >
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground mr-1">
                    Opcionais:
                  </span>
                  {optionalFields.map(field => (
                    <FieldChip key={field.key} field={field} />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default DataCollectionTracker;
