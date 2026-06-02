import { AlertCircle, Bell } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface PatternAlertProps {
  pattern: {
    description: string;
    occurrence_count: number;
    suggested_action?: string | null;
  };
  onSubscribe?: () => void;
}

export const PatternAlert = ({ pattern, onSubscribe }: PatternAlertProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Alert className="border-amber-500/50 bg-amber-50/50">
        <AlertCircle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="space-y-2">
          <div>
            <p className="font-semibold text-amber-900">Problema recorrente detectado</p>
            <p className="text-sm text-amber-800">
              {pattern.occurrence_count}{" "}
              {pattern.occurrence_count === 1 ? "usuário relatou" : "usuários relataram"}{" "}
              {pattern.description.toLowerCase()}
            </p>
          </div>

          {pattern.suggested_action && (
            <p className="text-xs text-amber-700">
              <strong>Recomendação:</strong> {pattern.suggested_action}
            </p>
          )}

          {onSubscribe && (
            <Button
              size="sm"
              variant="outline"
              onClick={onSubscribe}
              className="mt-2 border-amber-600 text-amber-700 hover:bg-amber-100"
            >
              <Bell className="w-3 h-3 mr-2" />
              Receber atualizações
            </Button>
          )}
        </AlertDescription>
      </Alert>
    </motion.div>
  );
};
