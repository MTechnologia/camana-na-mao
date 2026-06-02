import type { ReferralRoutingRules } from "@/types/referralRoutingRules";

export const DEFAULT_REFERRAL_ROUTING_RULES: ReferralRoutingRules = {
  enabled: true,
  prioritizeThemeMatch: true,
  themeMatchWeight: 70,
  considerActiveLoad: true,
  loadWeight: 30,
  preferLowerLoad: true,
  showMatchScoreInUi: true,
  minThemeTokenLength: 3,
};

export const REFERRAL_RULE_LABELS: {
  key: keyof ReferralRoutingRules;
  label: string;
  description: string;
  type: "boolean" | "number";
  min?: number;
  max?: number;
}[] = [
  {
    key: "enabled",
    label: "Sugestão inteligente ativa",
    description: "Ordena comissões e vereadores e calcula afinidade com base nas regras abaixo.",
    type: "boolean",
  },
  {
    key: "prioritizeThemeMatch",
    label: "Priorizar afinidade temática",
    description:
      "Destinos cujo tema coincide (total ou parcial) com a categoria do relato sobem na lista.",
    type: "boolean",
  },
  {
    key: "themeMatchWeight",
    label: "Peso da afinidade temática (%)",
    description: "Contribuição máxima da correspondência de tema no score de 0 a 100.",
    type: "number",
    min: 0,
    max: 100,
  },
  {
    key: "considerActiveLoad",
    label: "Considerar carga da fila",
    description: "Usa o número de encaminhamentos ativos de cada destino no cálculo.",
    type: "boolean",
  },
  {
    key: "loadWeight",
    label: "Peso da carga (%)",
    description: "Contribuição máxima da fila no score de 0 a 100.",
    type: "number",
    min: 0,
    max: 100,
  },
  {
    key: "preferLowerLoad",
    label: "Preferir menor fila",
    description:
      "Se ativo, destinos com menos encaminhamentos ativos pontuam melhor na carga. Se inativo, desempata pela maior fila.",
    type: "boolean",
  },
  {
    key: "showMatchScoreInUi",
    label: "Exibir % de afinidade no relato",
    description: "Mostra o score ao lado de cada opção na gestão do protocolo.",
    type: "boolean",
  },
  {
    key: "minThemeTokenLength",
    label: "Tamanho mínimo da palavra-chave",
    description: "Palavras do tema com menos caracteres são ignoradas no cruzamento.",
    type: "number",
    min: 2,
    max: 12,
  },
];
