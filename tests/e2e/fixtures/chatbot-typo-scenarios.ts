/**
 * Cenários E2E com digitação informal do munícipe (typos, gíria, abreviações,
 * frustração, ofensa direta e risco).
 */

export const URBAN_TYPO_SCENARIOS = [
  {
    id: 'urban_lixo_typo',
    openingMessage: 'tem muito lixo na rua do lado de casa',
    assistantAck: /lixo|problema|descreva|endereço|localização|natureza/i,
  },
  {
    id: 'urban_buraco_giria',
    openingMessage: 'buraco gigante q quase derrubou meu carro',
    assistantAck: /buraco|via|problema|descreva|endereço/i,
  },
  {
    id: 'urban_lixo_frustrado',
    openingMessage: 'essa rua ta uma merda, tem lixo espalhado na esquina',
    assistantAck: /lixo|problema|frustra|descreva|endereço/i,
  },
  {
    id: 'urban_buraco_ofensa_direta',
    openingMessage: 'voces sao incompetentes, tem buraco enorme na avenida',
    assistantAck: /respeito|frustra|buraco|problema|descreva|endereço/i,
  },
] as const;

export const TRANSPORT_TYPO_SCENARIOS = [
  {
    id: 'transport_atraso_typo',
    openingMessage: 'onibus atrasou mt no pico da manha',
    lineSearchTerm: '875',
    lineCodeToPick: '875A-10',
    timeReply: '7h5',
    directionReply: 'ida',
    recurrenceReply: 'td semana',
    impactMessage: 'chego atrasado no trampo',
  },
  {
    id: 'transport_nao_passou_typo',
    openingMessage: 'o onibus nao passou no ponto hj',
    lineSearchTerm: '509',
    lineCodeToPick: '509M-10',
    timeReply: '08:00',
    directionReply: 'volta',
    recurrenceReply: 'todo dia',
    impactMessage: 'perdi reuniao importante',
  },
  {
    id: 'transport_busao_lotado_baixa_escrita',
    openingMessage: 'qro fala do busao lotado td dia',
    lineSearchTerm: '875',
    lineCodeToPick: '875A-10',
    timeReply: '18h20',
    directionReply: 'volta',
    recurrenceReply: 'td dia',
    impactMessage: 'chego mt cansado e atrasado em casa',
  },
  {
    id: 'transport_risco_seguranca',
    openingMessage: 'tem arma e briga dentro do onibus agora',
    lineSearchTerm: '509',
    lineCodeToPick: '509M-10',
    timeReply: 'agora 20h',
    directionReply: 'ida',
    recurrenceReply: 'primeira vez',
    impactMessage: 'fiquei com medo e desci antes',
  },
] as const;
