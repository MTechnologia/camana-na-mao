import { MessageSquare, Bus, Star, Calendar, MapPin, Sparkles } from "lucide-react";
import { JourneyType } from "@/contexts/AIJourneyContext";

export const AI_JOURNEYS: Record<string, JourneyType> = {
  general: {
    id: 'general',
    label: 'Assistente CMSP',
    edgeFunction: 'ai-chat',
    initialMessage: 'Olá! Como posso ajudar você hoje?',
    color: 'from-primary to-primary/80',
    icon: 'MessageSquare',
  },
  urban_report: {
    id: 'urban_report',
    label: 'Relato Urbano',
    edgeFunction: 'urban-report-chat',
    initialMessage: 'Vou te ajudar a relatar um problema urbano. Pode me contar o que está acontecendo?',
    color: 'from-pink-500 to-rose-500',
    icon: 'MapPin',
  },
  transport: {
    id: 'transport',
    label: 'Diagnóstico de Transporte',
    edgeFunction: 'diagnose-transport',
    initialMessage: 'Vou te ajudar com um problema de transporte. Qual linha você está usando?',
    color: 'from-green-500 to-emerald-500',
    icon: 'Bus',
  },
  evaluate: {
    id: 'evaluate',
    label: 'Avaliação de Serviço',
    edgeFunction: 'ai-chat',
    initialMessage: 'Vou te ajudar a avaliar um serviço público. Qual serviço você visitou?',
    color: 'from-amber-500 to-orange-500',
    icon: 'Star',
  },
  plan: {
    id: 'plan',
    label: 'Planejamento',
    edgeFunction: 'ai-chat',
    initialMessage: 'Vou te ajudar a se planejar! O que você precisa organizar?',
    color: 'from-purple-500 to-indigo-500',
    icon: 'Calendar',
  },
  services: {
    id: 'services',
    label: 'Conhecer Serviços',
    edgeFunction: 'ai-chat',
    initialMessage: 'Vou te mostrar os serviços públicos disponíveis na sua região. O que você procura?',
    color: 'from-blue-500 to-cyan-500',
    icon: 'Sparkles',
  },
};

export const getJourneyById = (id: string): JourneyType | null => {
  return AI_JOURNEYS[id] || null;
};
