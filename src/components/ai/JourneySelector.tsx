import { Card } from "@/components/ui/card";
import { AI_JOURNEYS, getJourneyIcon } from "@/config/aiJourneys";
import { useAIJourney } from "@/contexts/AIJourneyContext";
import { useAIConversations } from "@/hooks/useAIConversations";
import { motion } from "framer-motion";

interface JourneySelectorProps {
  onSelect?: () => void;
}

const JourneySelector = ({ onSelect }: JourneySelectorProps) => {
  const { setJourney, setActiveConversationId } = useAIJourney();
  const { createConversation } = useAIConversations();

  const handleSelectJourney = async (journeyId: string) => {
    const journey = AI_JOURNEYS[journeyId];
    if (journey) {
      // Criar nova conversa com mensagem inicial
      const newConvId = await createConversation(journeyId, journey.initialMessage);
      
      if (newConvId) {
        // Setar jornada e conversa ativa
        setJourney(journey, newConvId);
        setActiveConversationId(newConvId);
      }
      
      onSelect?.();
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Escolha uma jornada
        </h2>
        <p className="text-muted-foreground">
          Selecione o tipo de assistência que você precisa
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.values(AI_JOURNEYS).map((journey, index) => {
          const Icon = getJourneyIcon(journey.icon);
          
          return (
            <motion.div
              key={journey.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card
                className="p-6 cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-105 border-2 hover:border-primary"
                onClick={() => handleSelectJourney(journey.id)}
              >
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${journey.color} flex items-center justify-center mb-4`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">
                  {journey.label}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {journey.initialMessage}
                </p>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default JourneySelector;
