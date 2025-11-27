import { MessageSquare, Bus, Construction, Star, MapPin, Route } from "lucide-react";
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
  
  transport: {
    id: 'transport',
    label: 'Diagnóstico de Transporte',
    edgeFunction: 'diagnose-transport',
    initialMessage: 'Olá! Vou ajudar você a registrar um problema no transporte público. Qual linha você utiliza?',
    color: 'from-green-500 to-green-600',
    icon: 'Bus',
  },
  
  urban_report: {
    id: 'urban_report',
    label: 'Relato Urbano',
    edgeFunction: 'urban-report-chat',
    initialMessage: 'Olá! Vou ajudar você a registrar um problema urbano. Qual tipo de problema você gostaria de relatar?',
    color: 'from-orange-500 to-orange-600',
    icon: 'Construction',
  },
  
  evaluate: {
    id: 'evaluate',
    label: 'Avaliação de Serviço',
    edgeFunction: 'evaluate-service',
    initialMessage: 'Olá! Vou ajudar você a avaliar o serviço público que você utilizou. Como foi sua experiência?',
    color: 'from-blue-500 to-blue-600',
    icon: 'Star',
  },
  
  services: {
    id: 'services',
    label: 'Recomendação de Serviços',
    edgeFunction: 'recommend-services',
    initialMessage: 'Olá! Posso ajudar você a encontrar serviços públicos próximos. O que você está buscando?',
    color: 'from-purple-500 to-purple-600',
    icon: 'MapPin',
  },
  
  plan: {
    id: 'plan',
    label: 'Planejador de Roteiro',
    edgeFunction: 'ai-chat',
    initialMessage: 'Olá! Vou ajudar você a planejar seu roteiro de serviços públicos. Quais serviços você precisa visitar?',
    color: 'from-teal-500 to-teal-600',
    icon: 'Route',
  },
};

export const getJourneyById = (id: string): JourneyType | null => {
  return AI_JOURNEYS[id] || null;
};

export const getJourneyIcon = (iconName: string) => {
  const icons = {
    MessageSquare,
    Bus,
    Construction,
    Star,
    MapPin,
    Route,
  };
  return icons[iconName as keyof typeof icons] || MessageSquare;
};
