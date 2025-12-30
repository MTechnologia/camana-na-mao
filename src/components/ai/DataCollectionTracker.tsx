import { motion, AnimatePresence } from "framer-motion";
import { Check, Circle, FileText, Bus, Star, ChevronDown, ChevronUp, Users } from "lucide-react";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";

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
    title: "Problema urbano",
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
    title: "Transporte",
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
    title: "Avaliação",
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
  title: "Feedback",
  icon: Users,
  fields: [
    { key: 'subcategory', label: 'Tipo', required: true },
    { key: 'council_member_name', label: 'Vereador', required: false },
    { key: 'council_member_party', label: 'Partido', required: false },
    { key: 'description', label: 'Detalhes', required: true },
  ]
};

// Circular progress indicator
const CircularProgress = ({ progress, size = 18, isComplete }: { progress: number; size?: number; isComplete: boolean }) => {
  const strokeWidth = 2;
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

// Field indicator component - mobile-friendly, no tooltip dependency
const FieldIndicator = ({ label, isCollected, isRequired }: { 
  label: string; 
  isCollected: boolean; 
  isRequired: boolean;
}) => (
  <span className={cn(
    "inline-flex items-center gap-1 text-xs whitespace-nowrap",
    isCollected 
      ? "text-green-600 dark:text-green-400" 
      : isRequired
        ? "text-amber-600 dark:text-amber-400"
        : "text-muted-foreground"
  )}>
    {isCollected ? (
      <Check className="h-3 w-3 flex-shrink-0" />
    ) : (
      <Circle className={cn(
        "h-3 w-3 flex-shrink-0",
        isRequired ? "fill-amber-500/20" : ""
      )} />
    )}
    {label}
  </span>
);

const DataCollectionTracker = ({ 
  collectionType, 
  collectedFields,
  className 
}: DataCollectionTrackerProps) => {
  const [showOptional, setShowOptional] = useState(false);

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
                Pronto
              </span>
            )}
          </div>

          {/* Required Fields */}
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {requiredFields.map(field => (
              <FieldIndicator
                key={field.key}
                label={field.label}
                isCollected={!!collectedFields[field.key]}
                isRequired={true}
              />
            ))}
          </div>

          {/* Optional Fields Toggle + Content */}
          {hasOptional && (
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
