import { motion, AnimatePresence } from "framer-motion";
import { Check, Circle, MapPin, MessageSquare, FileText, Bus, Star, Clock, Tag, Minimize2 } from "lucide-react";
import { useState } from "react";
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

const COLLECTION_CONFIGS: Record<string, {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  fields: FieldConfig[];
}> = {
  urban_report: {
    title: "Registrando problema urbano",
    icon: FileText,
    fields: [
      { key: 'category', label: 'Categoria', icon: Tag, required: true },
      { key: 'description', label: 'Descrição', icon: MessageSquare, required: true },
      { key: 'location_address', label: 'Localização', icon: MapPin, required: false },
    ]
  },
  transport_report: {
    title: "Registrando problema de transporte",
    icon: Bus,
    fields: [
      { key: 'report_type', label: 'Tipo', icon: Tag, required: true },
      { key: 'description', label: 'Descrição', icon: MessageSquare, required: true },
      { key: 'occurrence_date', label: 'Data', icon: Clock, required: true },
      { key: 'line_code', label: 'Linha', icon: Bus, required: false },
      { key: 'location', label: 'Local', icon: MapPin, required: false },
    ]
  },
  service_rating: {
    title: "Avaliando serviço público",
    icon: Star,
    fields: [
      { key: 'service_name', label: 'Serviço', icon: FileText, required: true },
      { key: 'service_type', label: 'Tipo', icon: Tag, required: true },
      { key: 'rating_stars', label: 'Nota', icon: Star, required: true },
      { key: 'rating_text', label: 'Comentário', icon: MessageSquare, required: true },
    ]
  }
};

const CATEGORY_LABELS: Record<string, string> = {
  iluminacao: 'Iluminação',
  calcada: 'Calçada',
  via_publica: 'Via Pública',
  lixo: 'Lixo/Entulho',
  area_verde: 'Área Verde',
  outro: 'Outro',
  atraso: 'Atraso',
  lotacao: 'Lotação',
  seguranca: 'Segurança',
  acessibilidade: 'Acessibilidade',
  limpeza: 'Limpeza',
  ubs: 'UBS',
  school: 'Escola',
  ceu: 'CEU',
  hospital: 'Hospital',
  library: 'Biblioteca',
  sports_center: 'Centro Esportivo',
};

const DataCollectionTracker = ({ 
  collectionType, 
  collectedFields,
  className 
}: DataCollectionTrackerProps) => {
  const [isMinimized, setIsMinimized] = useState(false);

  if (!collectionType || !COLLECTION_CONFIGS[collectionType]) {
    return null;
  }

  const config = COLLECTION_CONFIGS[collectionType];
  const requiredFields = config.fields.filter(f => f.required);
  const collectedRequiredCount = requiredFields.filter(f => collectedFields[f.key]).length;
  const progress = Math.round((collectedRequiredCount / requiredFields.length) * 100);
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
                        progress === 100 
                          ? "bg-green-500" 
                          : "bg-primary"
                      )}
                    />
                  </div>
                  <span className={cn(
                    "text-xs font-medium min-w-[36px] text-right",
                    progress === 100 ? "text-green-600" : "text-muted-foreground"
                  )}>
                    {progress}%
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
                    progress === 100 ? "bg-green-500" : "bg-primary"
                  )}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                {collectedRequiredCount}/{requiredFields.length}
              </span>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default DataCollectionTracker;
