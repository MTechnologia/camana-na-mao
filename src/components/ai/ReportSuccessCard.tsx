import { CheckCircle2, FileText, Plus, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

interface ReportSuccessCardProps {
  reportId: string;
  onNewReport?: () => void;
}

const ReportSuccessCard = ({ reportId, onNewReport }: ReportSuccessCardProps) => {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200 dark:border-green-800">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">
                Relato Registrado!
              </h3>
              <p className="text-sm text-green-700 dark:text-green-300">
                Seu relato foi enviado com sucesso e será analisado pela equipe responsável.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full pt-2">
              <Button
                variant="outline"
                className="flex-1 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/50"
                onClick={() => navigate("/relato-urbano/historico")}
              >
                <FileText className="h-4 w-4 mr-2" />
                Ver Meus Relatos
              </Button>
              
              <Button
                variant="outline"
                className="flex-1 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/50"
                onClick={() => navigate("/servicos-proximos")}
              >
                <MapPin className="h-4 w-4 mr-2" />
                Ver no Mapa
              </Button>
            </div>

            {onNewReport && (
              <Button
                variant="ghost"
                className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"
                onClick={onNewReport}
              >
                <Plus className="h-4 w-4 mr-2" />
                Fazer Outro Relato
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ReportSuccessCard;
