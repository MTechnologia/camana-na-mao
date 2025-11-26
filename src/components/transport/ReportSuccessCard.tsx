import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, TrendingUp, Bell, Plus } from 'lucide-react';
import { motion } from 'framer-motion';

interface ReportSuccessCardProps {
  reportId: string;
  onViewPatterns?: () => void;
  onSubscribe?: () => void;
  onNewReport?: () => void;
}

export const ReportSuccessCard = ({
  reportId,
  onViewPatterns,
  onSubscribe,
  onNewReport,
}: ReportSuccessCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-2 border-green-500/20">
        <CardContent className="p-6 text-center space-y-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
          >
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
          </motion.div>

          <div>
            <h3 className="font-semibold text-xl mb-2">Relato enviado com sucesso!</h3>
            <p className="text-sm text-muted-foreground">
              Seu relato foi registrado e está sendo analisado. Você receberá atualizações sobre o andamento.
            </p>
          </div>

          <div className="pt-4 space-y-2">
            {onViewPatterns && (
              <Button variant="outline" onClick={onViewPatterns} className="w-full">
                <TrendingUp className="w-4 h-4 mr-2" />
                Ver padrões similares
              </Button>
            )}

            {onSubscribe && (
              <Button variant="outline" onClick={onSubscribe} className="w-full">
                <Bell className="w-4 h-4 mr-2" />
                Receber atualizações
              </Button>
            )}

            {onNewReport && (
              <Button onClick={onNewReport} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Novo relato
              </Button>
            )}
          </div>

          <p className="text-xs text-muted-foreground pt-4">
            ID do relato: {reportId.slice(0, 8)}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
};
