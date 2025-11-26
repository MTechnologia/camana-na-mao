import { MessageSquare } from "lucide-react";
import { JourneyType } from "@/contexts/AIJourneyContext";

export const AI_JOURNEYS: Record<string, JourneyType> = {
  general: {
    id: 'general',
    label: 'Assistente CMSP',
    edgeFunction: 'ai-chat',
    initialMessage: 'Olá! Sou o assistente da CMSP. Como posso ajudar você hoje?',
    color: 'from-primary to-primary/80',
    icon: 'MessageSquare',
  },
};

export const getJourneyById = (id: string): JourneyType | null => {
  return AI_JOURNEYS[id] || null;
};
