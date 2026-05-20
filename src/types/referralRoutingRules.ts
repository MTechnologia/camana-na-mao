/** Regras de sugestão inteligente para encaminhamento (comissão + vereador). */
export type ReferralRoutingRules = {
  /** Ativa ordenação e cálculo de afinidade. */
  enabled: boolean;
  /** Prioriza destinos cujo tema coincide com a categoria do relato. */
  prioritizeThemeMatch: boolean;
  /** Peso (0–100) da correspondência temática no score final. */
  themeMatchWeight: number;
  /** Considera quantidade de encaminhamentos ativos no destino. */
  considerActiveLoad: boolean;
  /** Peso (0–100) da carga no score final. */
  loadWeight: number;
  /** true = prefere destinos com menor fila; false = maior fila primeiro no desempate. */
  preferLowerLoad: boolean;
  /** Exibe % de afinidade nas listas do relato. */
  showMatchScoreInUi: boolean;
  /** Tamanho mínimo de palavra-chave para cruzar tema ↔ categoria. */
  minThemeTokenLength: number;
  /** ISO da última alteração (exibição). */
  updatedAt?: string;
};

export type ScoredReferralDestination = {
  id: string;
  name: string;
  themes: string[];
  activeReferrals: number;
  matchScore: number;
};
