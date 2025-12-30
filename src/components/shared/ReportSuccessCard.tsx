import { CheckCircle2, FileText, Plus, MapPin, TrendingUp, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface ReportSuccessCardProps {
  reportId: string;
  variant?: "urban" | "transport";
  onNewReport?: () => void;
  onViewPatterns?: () => void;
  onSubscribe?: () => void;
}

export const ReportSuccessCard = ({
  reportId,
  variant = "urban",
  onNewReport,
  onViewPatterns,
  onSubscribe,
}: ReportSuccessCardProps) => {
  const navigate = useNavigate();

  const isUrban = variant === "urban";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Card
        className={cn(
          "border-2",
          isUrban
            ? "bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200 dark:border-green-800"
            : "border-green-500/20"
        )}
      >
        <CardContent className={cn("pt-6", !isUrban && "p-6 text-center")}>
          <div className={cn("flex flex-col items-center space-y-4", !isUrban && "space-y-6")}>
            {/* Success Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
            >
              <div
                className={cn(
                  "flex items-center justify-center",
                  isUrban
                    ? "h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/50"
                    : ""
                )}
              >
                <CheckCircle2
                  className={cn(
                    isUrban
                      ? "h-8 w-8 text-green-600 dark:text-green-400"
                      : "w-16 h-16 text-green-500"
                  )}
                />
              </div>
            </motion.div>

            {/* Title & Description */}
            <div className={cn("space-y-2", !isUrban && "")}>
              <h3
                className={cn(
                  "font-semibold",
                  isUrban
                    ? "text-lg text-green-800 dark:text-green-200"
                    : "text-xl"
                )}
              >
                {isUrban ? "Relato Registrado!" : "Relato enviado com sucesso!"}
              </h3>
              <p
                className={cn(
                  "text-sm",
                  isUrban
                    ? "text-green-700 dark:text-green-300"
                    : "text-muted-foreground"
                )}
              >
                {isUrban
                  ? "Seu relato foi enviado e está sendo analisado por inteligência artificial. Você pode acompanhar o status em 'Meus Relatos'."
                  : "Seu relato foi registrado e está sendo analisado por IA. Geralmente em poucos minutos você verá a classificação e prioridade definidas."}
              </p>
              <p className={cn(
                "text-xs mt-2",
                isUrban 
                  ? "text-green-600/80 dark:text-green-400/80"
                  : "text-muted-foreground/80"
              )}>
                ⏱️ Tempo estimado de análise: 1-5 minutos
              </p>
            </div>

            {/* Action Buttons */}
            <div
              className={cn(
                "w-full",
                isUrban ? "flex flex-col sm:flex-row gap-3 pt-2" : "pt-4 space-y-2"
              )}
            >
              {isUrban ? (
                <Button
                  variant="outline"
                  className="w-full border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/50"
                  onClick={() => navigate("/relato-urbano/historico")}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Ver Meus Relatos
                </Button>
              ) : (
                <>
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
                </>
              )}
            </div>

            {/* New Report Button */}
            {onNewReport && (
              <Button
                variant={isUrban ? "ghost" : "default"}
                className={cn(
                  isUrban
                    ? "text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"
                    : "w-full"
                )}
                onClick={onNewReport}
              >
                <Plus className="h-4 w-4 mr-2" />
                {isUrban ? "Fazer Outro Relato" : "Novo relato"}
              </Button>
            )}

            {/* Report ID */}
            {!isUrban && (
              <p className="text-xs text-muted-foreground pt-4">
                ID do relato: {reportId.slice(0, 8)}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ReportSuccessCard;
