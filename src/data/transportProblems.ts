import { Clock, Users, ShieldAlert, Accessibility, Sparkles, AlertCircle } from "lucide-react";

export const transportProblems = [
  {
    id: "atraso",
    label: "Atraso",
    icon: Clock,
    color: "text-orange-500",
    bgColor: "bg-orange-50",
    description: "Ônibus ou metrô atrasado",
    followUpQuestions: [
      "Quanto tempo de atraso aproximadamente?",
      "Isso acontece com frequência neste horário?",
      "Qual o impacto disso na sua rotina?",
    ],
  },
  {
    id: "lotacao",
    label: "Lotação",
    icon: Users,
    color: "text-red-500",
    bgColor: "bg-red-50",
    description: "Veículo muito cheio",
    followUpQuestions: [
      "Conseguiu embarcar no primeiro veículo que passou?",
      "Quantos veículos você precisou esperar?",
      "Esse problema ocorre frequentemente?",
    ],
  },
  {
    id: "seguranca",
    label: "Segurança",
    icon: ShieldAlert,
    color: "text-purple-500",
    bgColor: "bg-purple-50",
    description: "Problemas de segurança",
    followUpQuestions: [
      "Que tipo de problema de segurança você enfrentou?",
      "O incidente foi reportado para alguma autoridade?",
      "Você se sentiu em risco?",
    ],
  },
  {
    id: "acessibilidade",
    label: "Acessibilidade",
    icon: Accessibility,
    color: "text-blue-500",
    bgColor: "bg-blue-50",
    description: "Falta de acessibilidade",
    followUpQuestions: [
      "Qual recurso de acessibilidade estava faltando?",
      "Isso impediu você de usar o transporte?",
      "Já havia relatado isso antes?",
    ],
  },
  {
    id: "limpeza",
    label: "Limpeza",
    icon: Sparkles,
    color: "text-green-500",
    bgColor: "bg-green-50",
    description: "Falta de limpeza",
    followUpQuestions: [
      "Quão grave era o problema de limpeza?",
      "Isso afetou sua decisão de usar o transporte?",
      "Você notou isso em outros veículos da mesma linha?",
    ],
  },
  {
    id: "outro",
    label: "Outro",
    icon: AlertCircle,
    color: "text-gray-500",
    bgColor: "bg-gray-50",
    description: "Outro tipo de problema",
    followUpQuestions: [
      "Descreva o problema que você enfrentou",
      "Quando isso aconteceu?",
      "Já havia ocorrido antes?",
    ],
  },
];

export const severityLevels = [
  { value: "low", label: "Baixo", color: "bg-green-500", description: "Inconveniente menor" },
  { value: "medium", label: "Médio", color: "bg-yellow-500", description: "Problema frequente" },
  { value: "high", label: "Alto", color: "bg-orange-500", description: "Impacto significativo" },
  { value: "critical", label: "Crítico", color: "bg-red-500", description: "Situação urgente" },
];
