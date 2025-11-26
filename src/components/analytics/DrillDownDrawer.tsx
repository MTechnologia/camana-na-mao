import { X, ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';

interface DrillLevel {
  label: string;
  value: string;
}

interface DrillDownDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  breadcrumbs: DrillLevel[];
  onNavigate: (index: number) => void;
  children: React.ReactNode;
  title: string;
}

export const DrillDownDrawer = ({
  isOpen,
  onClose,
  breadcrumbs,
  onNavigate,
  children,
  title,
}: DrillDownDrawerProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 20 }}
            className="fixed right-0 top-0 h-full w-full md:w-2/3 lg:w-1/2 bg-background border-l border-border z-50 flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-foreground">{title}</h2>
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Breadcrumbs */}
              {breadcrumbs.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  {breadcrumbs.map((crumb, index) => (
                    <div key={index} className="flex items-center gap-2">
                      {index > 0 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onNavigate(index)}
                        className="h-7"
                      >
                        {crumb.label}
                        <Badge variant="secondary" className="ml-2">
                          {crumb.value}
                        </Badge>
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Back button */}
              {breadcrumbs.length > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigate(breadcrumbs.length - 2)}
                  className="mt-4 gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Voltar
                </Button>
              )}
            </div>

            {/* Content */}
            <ScrollArea className="flex-1 p-6">
              {children}
            </ScrollArea>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
