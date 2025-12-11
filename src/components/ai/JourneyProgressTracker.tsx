import { useMemo } from "react";
import { Check, Circle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface DataSlot {
  id: string;
  label: string;
  required: boolean;
}

interface JourneyProgressTrackerProps {
  journeyId: string;
  messages: Array<{ role: string; content: string }>;
  className?: string;
}

// Define data slots for each journey type
const JOURNEY_SLOTS: Record<string, DataSlot[]> = {
  urban_report: [
    { id: 'problem', label: 'Problema', required: true },
    { id: 'location', label: 'Local', required: true },
    { id: 'details', label: 'Detalhes', required: false },
  ],
  transport: [
    { id: 'line', label: 'Linha', required: true },
    { id: 'problem', label: 'Problema', required: true },
    { id: 'date', label: 'Data', required: true },
    { id: 'time', label: 'Horário', required: false },
    { id: 'location', label: 'Local', required: false },
  ],
  evaluate: [
    { id: 'service', label: 'Serviço', required: true },
    { id: 'rating', label: 'Nota', required: true },
    { id: 'comment', label: 'Comentário', required: true },
  ],
};

// Keywords to detect if a slot has been filled
const SLOT_DETECTION_PATTERNS: Record<string, Record<string, RegExp[]>> = {
  urban_report: {
    problem: [/buraco|iluminação|iluminacao|poste|lixo|calçada|calcada|esgoto|semáforo|semaforo|mato|árvore|arvore|problema/i],
    location: [/rua |av\.|avenida |bairro |próximo|perto de|esquina|número|\d{5}-?\d{3}/i],
    details: [/grande|pequeno|urgente|perigoso|muito|sempre|desde|faz tempo/i],
  },
  transport: {
    line: [/linha\s*\d+|metrô|metro|trem|cptm|\d{3,4}[a-z]?-?\d*/i],
    problem: [/atraso|lotação|lotacao|cheio|superlotado|não passou|demora|segurança|seguranca|sujo|quebrado/i],
    date: [/hoje|ontem|segunda|terça|quarta|quinta|sexta|sábado|domingo|\d{1,2}\/\d{1,2}|semana passada/i],
    time: [/\d{1,2}:\d{2}|\d{1,2}h|\d{1,2} horas|manhã|tarde|noite|madrugada/i],
    location: [/ponto|estação|estacao|terminal|parada|trecho/i],
  },
  evaluate: {
    service: [/ubs|hospital|escola|ceu|biblioteca|posto|unidade|creche|atendimento/i],
    rating: [/\d\s*estrela|nota\s*\d|péssimo|ruim|regular|bom|ótimo|excelente/i],
    comment: [/.{30,}/], // At least 30 chars of detailed comment
  },
};

const JourneyProgressTracker = ({ journeyId, messages, className }: JourneyProgressTrackerProps) => {
  const slots = JOURNEY_SLOTS[journeyId];
  const patterns = SLOT_DETECTION_PATTERNS[journeyId];

  // Analyze messages to determine which slots are filled
  const filledSlots = useMemo(() => {
    if (!slots || !patterns) return new Set<string>();

    const filled = new Set<string>();
    const userMessages = messages
      .filter(m => m.role === 'user')
      .map(m => m.content)
      .join(' ');

    for (const slot of slots) {
      const slotPatterns = patterns[slot.id];
      if (slotPatterns) {
        const isFilled = slotPatterns.some(pattern => pattern.test(userMessages));
        if (isFilled) {
          filled.add(slot.id);
        }
      }
    }

    return filled;
  }, [slots, patterns, messages]);

  // Determine which slot is currently being collected
  const currentSlotIndex = useMemo(() => {
    if (!slots) return -1;
    
    for (let i = 0; i < slots.length; i++) {
      if (slots[i].required && !filledSlots.has(slots[i].id)) {
        return i;
      }
    }
    
    // All required slots filled, check optional ones
    for (let i = 0; i < slots.length; i++) {
      if (!filledSlots.has(slots[i].id)) {
        return i;
      }
    }
    
    return -1; // All slots filled
  }, [slots, filledSlots]);

  // Don't render if journey doesn't have slots defined
  if (!slots) return null;

  const allRequiredFilled = slots.filter(s => s.required).every(s => filledSlots.has(s.id));

  return (
    <motion.div 
      className={cn(
        "flex items-center gap-1.5 px-3 py-2 bg-muted/50 rounded-lg overflow-x-auto",
        className
      )}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <span className="text-xs text-muted-foreground shrink-0 mr-1">Dados:</span>
      
      {slots.map((slot, index) => {
        const isFilled = filledSlots.has(slot.id);
        const isCurrent = index === currentSlotIndex;
        
        return (
          <motion.div
            key={slot.id}
            className={cn(
              "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium shrink-0 transition-colors",
              isFilled 
                ? "bg-green-500/20 text-green-700 dark:text-green-400" 
                : isCurrent
                ? "bg-amber-500/20 text-amber-700 dark:text-amber-400"
                : "bg-muted text-muted-foreground"
            )}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: index * 0.05, duration: 0.2 }}
          >
            {isFilled ? (
              <Check className="h-3 w-3" />
            ) : isCurrent ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Circle className="h-3 w-3" />
            )}
            <span>{slot.label}</span>
            {slot.required && !isFilled && (
              <span className="text-destructive">*</span>
            )}
          </motion.div>
        );
      })}

      {allRequiredFilled && (
        <motion.span 
          className="ml-2 text-xs text-green-600 dark:text-green-400 font-medium shrink-0"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.2 }}
        >
          ✓ Pronto para enviar
        </motion.span>
      )}
    </motion.div>
  );
};

export default JourneyProgressTracker;
