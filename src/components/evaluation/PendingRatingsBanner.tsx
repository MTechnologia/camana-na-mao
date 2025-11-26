import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, X } from "lucide-react";
import { usePendingRatings } from "@/hooks/usePendingRatings";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

export const PendingRatingsBanner = () => {
  const { pendingRatings, loading, markAsSkipped } = usePendingRatings();
  const navigate = useNavigate();

  if (loading || pendingRatings.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="mb-4"
      >
        <Card className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200 dark:border-amber-800">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-lg">
                <Star className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              
              <div className="flex-1">
                <h3 className="font-semibold text-foreground mb-1">
                  {pendingRatings.length === 1 
                    ? "Você tem uma avaliação pendente" 
                    : `Você tem ${pendingRatings.length} avaliações pendentes`}
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Sua opinião ajuda a melhorar os serviços públicos de São Paulo
                </p>
                
                <div className="space-y-2">
                  {pendingRatings.slice(0, 3).map((rating) => (
                    <div 
                      key={rating.id}
                      className="flex items-center justify-between p-2 bg-background/50 rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">
                          {rating.service.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {rating.service.district}
                        </p>
                      </div>
                      
                      <div className="flex gap-2 ml-2">
                        <Button
                          size="sm"
                          onClick={() => navigate(`/avaliar/${rating.id}`)}
                          className="bg-amber-600 hover:bg-amber-700"
                        >
                          Avaliar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => markAsSkipped(rating.id)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};
