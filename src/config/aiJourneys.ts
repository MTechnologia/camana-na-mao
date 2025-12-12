import { MessageSquare, Bus, MapPin, Star, Landmark, MessageCircleMore } from "lucide-react";
import { JourneyType } from "@/contexts/AIJourneyContext";

export const AI_JOURNEYS: Record<string, JourneyType> = {
  general: {
    id: 'general',
    label: 'Tudo Sobre a Câmara',
    edgeFunction: 'ai-chat',
    initialMessage: `Olá! Sou o assistente **Tudo Sobre a Câmara** 🏛️

Estou aqui para responder suas dúvidas sobre:
• **Vereadores** – mandatos, projetos, contatos
• **Audiências Públicas** – calendário, temas, como participar
• **Notícias e Agenda** – o que está acontecendo na Câmara
• **Funcionamento** – como funciona o processo legislativo

💡 *Se você quiser registrar um problema na cidade ou avaliar um serviço público, posso te direcionar para o canal certo.*

Como posso ajudar você hoje?`,
    color: 'from-primary to-primary/80',
    icon: 'Landmark',
  },
  
  urban_report: {
    id: 'urban_report',
    label: 'Fala Cidadão!',
    edgeFunction: 'urban-report-chat',
    initialMessage: `Olá! Este é o canal **Fala Cidadão!** 📢

Aqui você pode registrar:
• **Problemas urbanos** – buracos, iluminação, calçadas, lixo
• **Elogios ou reclamações** – sobre vereadores ou serviços da Câmara
• **Sugestões** – melhorias para a cidade ou para a Câmara

Vou te guiar para coletar as informações necessárias e encaminhar seu relato.

📍 *Este canal é exclusivo para manifestações cidadãs. Para dúvidas sobre a Câmara, use "Tudo Sobre a Câmara".*

Qual é a sua manifestação hoje?`,
    color: 'from-orange-500 to-orange-600',
    icon: 'MessageCircleMore',
  },
  
  transport: {
    id: 'transport',
    label: 'Transporte',
    edgeFunction: 'diagnose-transport',
    initialMessage: `Olá! Este é o canal de **Diagnóstico de Transporte** 🚌

Aqui você pode registrar problemas com:
• **Ônibus** – atrasos, lotação, limpeza, itinerários
• **Metrô e CPTM** – falhas, superlotação, acessibilidade
• **Pontos e terminais** – estrutura, segurança, informações

Vou coletar os detalhes do problema para encaminhar aos órgãos responsáveis.

🚇 *Este canal é exclusivo para transporte público. Para outros problemas urbanos, use "Fala Cidadão!".*

Qual problema de transporte você quer relatar?`,
    color: 'from-blue-500 to-blue-600',
    icon: 'Bus',
  },
  
  services: {
    id: 'services',
    label: 'Serviços',
    edgeFunction: 'ai-chat',
    initialMessage: `Olá! Este é o canal de **Serviços Públicos** 📍

Posso ajudar você a encontrar:
• **UBS e hospitais** – unidades de saúde próximas
• **Escolas e CEUs** – educação na sua região
• **Bibliotecas e centros esportivos** – cultura e lazer
• **Outros serviços municipais** – o que você precisa

Com base na sua localização, vou recomendar os serviços mais relevantes para você.

🏥 *Para avaliar um serviço que você já visitou, use o canal "Avaliar".*

Que tipo de serviço você está procurando?`,
    color: 'from-purple-500 to-purple-600',
    icon: 'MapPin',
  },
  
  evaluate: {
    id: 'evaluate',
    label: 'Avaliar',
    edgeFunction: 'evaluate-service',
    initialMessage: `Olá! Este é o canal de **Avaliação de Serviços** ⭐

Aqui você pode avaliar sua experiência em:
• **UBS e hospitais** – atendimento, tempo de espera, estrutura
• **Escolas e CEUs** – qualidade, infraestrutura, professores
• **Outros serviços públicos** – sua opinião importa!

Sua avaliação ajuda a melhorar os serviços para todos os cidadãos.

📝 *Este canal é para avaliar serviços já visitados. Para encontrar serviços, use o canal "Serviços".*

Qual serviço você gostaria de avaliar?`,
    color: 'from-amber-500 to-amber-600',
    icon: 'Star',
  },
};

export const getJourneyById = (id: string): JourneyType | null => {
  return AI_JOURNEYS[id] || null;
};

export const getJourneyIcon = (iconName: string) => {
  const icons = {
    MessageSquare,
    Bus,
    MapPin,
    Star,
    Landmark,
    MessageCircleMore,
  };
  return icons[iconName as keyof typeof icons] || MessageSquare;
};
