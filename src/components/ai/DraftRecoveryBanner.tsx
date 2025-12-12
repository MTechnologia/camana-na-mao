import { motion, AnimatePresence } from 'framer-motion';
import { FileText, ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { JourneyDraft } from '@/hooks/useJourneyDraft';

interface DraftRecoveryBannerProps {
  draft: JourneyDraft;
  draftAge: string;
  onResume: () => void;
  onDiscard: () => void;
}

export function DraftRecoveryBanner({ 
  draft, 
  draftAge, 
  onResume, 
  onDiscard 
}: DraftRecoveryBannerProps) {
  const messageCount = draft.messages.filter(m => m.role === 'user').length;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="w-full max-w-md mx-auto mb-4"
      >
        <div className="relative bg-card border border-border rounded-xl p-4 shadow-lg">
          {/* Accent line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/60 via-primary to-primary/60 rounded-t-xl" />
          
          {/* Close button */}
          <button
            onClick={onDiscard}
            className="absolute top-3 right-3 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Descartar rascunho"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Content */}
          <div className="flex items-start gap-3 pr-6">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground text-sm">
                Rascunho pendente
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                <span className="font-medium text-foreground">{draft.journeyLabel}</span>
                {' '}&bull;{' '}
                {messageCount} {messageCount === 1 ? 'mensagem' : 'mensagens'}
                {' '}&bull;{' '}
                {draftAge}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={onDiscard}
              className="flex-1 text-xs"
            >
              Descartar
            </Button>
            <Button
              size="sm"
              onClick={onResume}
              className="flex-1 text-xs gap-1"
            >
              Continuar
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
