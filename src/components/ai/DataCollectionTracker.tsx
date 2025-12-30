import { motion, AnimatePresence } from "framer-motion";
import { Check, Circle, MapPin, MessageSquare, FileText, Bus, Star, Clock, Tag, Minimize2, Users, User, AlertCircle, Building, Navigation, ShieldAlert, Target } from "lucide-react";
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
  icon: React.ComponentType<{ className?: string }>;
  required: boolean;
}

interface CollectionConfig {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  fields: FieldConfig[];
}

// Categories that require impact assessment
const RISK_CATEGORIES = ['via_publica', 'iluminacao', 'esgoto', 'area_verde'];

const DEFAULT_CONFIGS: Record<string, CollectionConfig> = {
  urban_report: {
    title: "Registrando problema urbano",
    icon: FileText,
    fields: [
      { key: 'category', label: 'Categoria', icon: Tag, required: true },
      { key: 'description', label: 'Descrição', icon: MessageSquare, required: true },
      { key: 'cep', label: 'CEP', icon: MapPin, required: false },
      { key: 'street', label: 'Rua/Avenida', icon: MapPin, required: true },
      { key: 'street_number', label: 'Número', icon: Navigation, required: false },
      { key: 'neighborhood', label: 'Bairro', icon: Building, required: true },
      { key: 'reference_point', label: 'Referência', icon: Navigation, required: false },
      // Impact fields - shown dynamically for risk categories
      { key: 'risk_level', label: 'Risco', icon: ShieldAlert, required: false },
      { key: 'affected_scope', label: 'Afetação', icon: Target, required: false },
    ]
  },
  transport_report: {
    title: "Registrando problema de transporte",
    icon: Bus,
    fields: [
      { key: 'report_type', label: 'Tipo', icon: Tag, required: true },
      { key: 'description', label: 'Descrição', icon: MessageSquare, required: true },
      { key: 'occurrence_date', label: 'Data', icon: Clock, required: true },
      { key: 'occurrence_time', label: 'Horário', icon: Clock, required: false },
      { key: 'line_code', label: 'Linha', icon: Bus, required: false },
      { key: 'location', label: 'Local', icon: MapPin, required: false },
      { key: 'severity', label: 'Gravidade', icon: AlertCircle, required: false },
    ]
  },
  service_rating: {
    title: "Avaliando serviço público",
    icon: Star,
    fields: [
      { key: 'service_type', label: 'Tipo', icon: Tag, required: true },
      { key: 'service_name', label: 'Serviço', icon: FileText, required: true },
      { key: 'service_neighborhood', label: 'Bairro', icon: Building, required: false },
      { key: 'rating_stars', label: 'Nota', icon: Star, required: true },
      { key: 'rating_text', label: 'Comentário', icon: MessageSquare, required: true },
    ]
  }
};

// Special config for chamber feedback (stored as urban_report with category=feedback_camara)
const CHAMBER_FEEDBACK_CONFIG: CollectionConfig = {
  title: "Feedback sobre Vereador/Câmara",
  icon: Users,
  fields: [
    { key: 'subcategory', label: 'Tipo', icon: Tag, required: true },
    { key: 'council_member_name', label: 'Vereador(a)', icon: User, required: false },
    { key: 'council_member_party', label: 'Partido', icon: Tag, required: false },
    { key: 'description', label: 'Detalhes', icon: MessageSquare, required: true },
  ]
};

const CATEGORY_LABELS: Record<string, string> = {
  // Urban report categories - expanded
  iluminacao: 'Iluminação',
  calcada: 'Calçada',
  via_publica: 'Via Pública',
  lixo: 'Lixo/Entulho',
  esgoto: 'Esgoto/Bueiro',
  area_verde: 'Área Verde',
  higiene_urbana: 'Higiene Urbana',
  animais: 'Animais',
  poluicao: 'Poluição',
  outro: 'Outro',
  feedback_camara: 'Feedback Câmara',
  // Transport report types
  atraso: 'Atraso',
  lotacao: 'Lotação',
  seguranca: 'Segurança',
  acessibilidade: 'Acessibilidade',
  limpeza: 'Limpeza',
  // Service types
  ubs: 'UBS',
  school: 'Escola',
  ceu: 'CEU',
  hospital: 'Hospital',
  library: 'Biblioteca',
  sports_center: 'Centro Esportivo',
  // Chamber feedback subcategories
  elogio: 'Elogio',
  reclamacao: 'Reclamação',
  sugestao: 'Sugestão',
  // Severity levels
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
  critica: 'Crítica',
  // Risk levels (impact)
  critical: 'Crítico',
  moderate: 'Moderado',
  low: 'Baixo',
  none: 'Nenhum',
  // Affected scope (impact)
  individual: 'Individual',
  street: 'Rua toda',
  neighborhood: 'Bairro',
  zone: 'Zona',
  city: 'Cidade',
};

const DataCollectionTracker = ({ 
  collectionType, 
  collectedFields,
  className 
}: DataCollectionTrackerProps) => {
  const [isMinimized, setIsMinimized] = useState(false);

  // Determine the correct config based on collection type and fields
  const config = useMemo(() => {
    if (!collectionType) return null;
    
    // Check for chamber feedback (urban_report with category=feedback_camara)
    if (collectionType === 'urban_report' && collectedFields.category === 'feedback_camara') {
      return CHAMBER_FEEDBACK_CONFIG;
    }
    
    const baseConfig = DEFAULT_CONFIGS[collectionType];
    if (!baseConfig) return null;
    
    // For urban reports with risk categories, show impact fields
    // For other categories, hide risk_level and affected_scope
    if (collectionType === 'urban_report') {
      const category = collectedFields.category;
      const isRiskCategory = category && RISK_CATEGORIES.includes(category);
      
      if (!isRiskCategory) {
        // Filter out impact fields for non-risk categories
        return {
          ...baseConfig,
          fields: baseConfig.fields.filter(f => 
            f.key !== 'risk_level' && f.key !== 'affected_scope'
          )
        };
      }
    }
    
    return baseConfig;
  }, [collectionType, collectedFields.category]);

  if (!collectionType || !config) {
    return null;
  }
  // Contagem de TODOS os campos para consistência visual
  const totalFields = config.fields.length;
  const collectedCount = config.fields.filter(f => !!collectedFields[f.key]).length;
  
  // Contagem de campos obrigatórios para indicar quando pode submeter
  const requiredFields = config.fields.filter(f => f.required);
  const collectedRequiredCount = requiredFields.filter(f => collectedFields[f.key]).length;
  const allRequiredCollected = collectedRequiredCount === requiredFields.length;
  
  // Progresso baseado em todos os campos
  const progress = Math.round((collectedCount / totalFields) * 100);
  const TitleIcon = config.icon;

  const formatValue = (key: string, value: any): string => {
    if (!value) return '';
    
    // Check for label mapping
    if (CATEGORY_LABELS[value]) {
      return CATEGORY_LABELS[value];
    }
    
    // Truncate long strings
    if (typeof value === 'string' && value.length > 20) {
      return value.slice(0, 20) + '...';
    }
    
    // Format rating stars
    if (key === 'rating_stars') {
      return '⭐'.repeat(Math.min(value, 5));
    }
    
    return String(value);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, height: 0 }}
        animate={{ 
          opacity: 1, 
          y: 0, 
          height: 'auto'
        }}
        exit={{ opacity: 0, y: -20, height: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className={cn(
          "bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-b border-primary/20",
          className
        )}
      >
        <div className="px-4 py-3">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/10">
                <TitleIcon className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-medium text-foreground">
                {config.title}
              </span>
            </div>
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 rounded hover:bg-primary/10 transition-colors"
              aria-label={isMinimized ? "Expandir" : "Minimizar"}
            >
              <Minimize2 className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                isMinimized && "rotate-180"
              )} />
            </button>
          </div>

          <AnimatePresence>
            {!isMinimized && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                {/* Fields Grid */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {config.fields.map((field, index) => {
                    const isCollected = !!collectedFields[field.key];
                    const value = collectedFields[field.key];
                    const FieldIcon = field.icon;

                    return (
                      <motion.div
                        key={field.key}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ 
                          opacity: 1, 
                          scale: 1,
                        }}
                        transition={{ 
                          delay: index * 0.05,
                          duration: 0.2
                        }}
                        className={cn(
                          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all",
                          isCollected 
                            ? "bg-primary/20 text-primary border border-primary/30" 
                            : "bg-muted/50 text-muted-foreground border border-border/50"
                        )}
                      >
                        {isCollected ? (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 500, damping: 25 }}
                          >
                            <Check className="h-3 w-3" />
                          </motion.div>
                        ) : (
                          <Circle className="h-3 w-3" />
                        )}
                        <span>{field.label}</span>
                        {isCollected && value && (
                          <span className="opacity-75 max-w-[80px] truncate">
                            : {formatValue(field.key, value)}
                          </span>
                        )}
                        {field.required && !isCollected && (
                          <span className="text-destructive/60">*</span>
                        )}
                      </motion.div>
                    );
                  })}
                </div>

                {/* Progress Bar */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-muted/50 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      className={cn(
                        "h-full rounded-full transition-colors",
                        allRequiredCollected 
                          ? "bg-green-500" 
                          : "bg-primary"
                      )}
                    />
                  </div>
                  <span className={cn(
                    "text-xs font-medium min-w-[36px] text-right",
                    allRequiredCollected ? "text-green-600" : "text-muted-foreground"
                  )}>
                    {collectedCount}/{totalFields}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Minimized State */}
          {isMinimized && (
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-muted/50 rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all",
                    allRequiredCollected ? "bg-green-500" : "bg-primary"
                  )}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className={cn(
                "text-xs font-medium",
                allRequiredCollected ? "text-green-600" : "text-muted-foreground"
              )}>
                {collectedCount}/{totalFields}
              </span>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default DataCollectionTracker;
