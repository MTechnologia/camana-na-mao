import { MessageSquare, Bus, Construction, Star, MapPin, Route, Users, Calendar, Heart } from "lucide-react";
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
    edgeFunction: 'ai-chat',
    initialMessage: 'Olá! Vou ajudar você a registrar um problema no transporte público. Qual linha você utiliza e qual problema está enfrentando?',
    color: 'from-green-500 to-green-600',
    icon: 'Bus',
  },
  
  urban_report: {
    id: 'urban_report',
    label: 'Relato Urbano',
    edgeFunction: 'ai-chat',
    initialMessage: 'Olá! Vou ajudar você a registrar um problema urbano. Pode me descrever o que está acontecendo e onde?',
    color: 'from-orange-500 to-orange-600',
    icon: 'Construction',
  },
  
  evaluate: {
    id: 'evaluate',
    label: 'Avaliação de Serviço',
    edgeFunction: 'ai-chat',
    initialMessage: 'Olá! Vou ajudar você a avaliar o serviço público que você utilizou. Qual serviço você gostaria de avaliar?',
    color: 'from-blue-500 to-blue-600',
    icon: 'Star',
  },
  
  services: {
    id: 'services',
    label: 'Recomendação de Serviços',
    edgeFunction: 'ai-chat',
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

  audiencias: {
    id: 'audiencias',
    label: 'Audiências Públicas',
    edgeFunction: 'ai-chat',
    initialMessage: 'Olá! Posso ajudar você a conhecer as audiências públicas da Câmara. Você gostaria de saber sobre audiências futuras, temas específicos ou como participar?',
    color: 'from-rose-500 to-rose-600',
    icon: 'Calendar',
  },

  vereadores: {
    id: 'vereadores',
    label: 'Vereadores',
    edgeFunction: 'ai-chat',
    initialMessage: 'Olá! Posso ajudar você a conhecer os vereadores de São Paulo. Você busca por nome, partido, região ou área de atuação?',
    color: 'from-indigo-500 to-indigo-600',
    icon: 'Users',
  },

  favorites: {
    id: 'favorites',
    label: 'Meus Favoritos',
    edgeFunction: 'ai-chat',
    initialMessage: 'Olá! Vou te ajudar com seus itens favoritos. Posso mostrar detalhes, buscar atualizações ou encontrar serviços similares. O que você prefere?',
    color: 'from-pink-500 to-pink-600',
    icon: 'Heart',
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
    Users,
    Calendar,
    Heart,
  };
  return icons[iconName as keyof typeof icons] || MessageSquare;
};
