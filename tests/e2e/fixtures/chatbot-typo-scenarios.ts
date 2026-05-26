/**
 * Cenários E2E com digitação informal do munícipe (typos, gíria, abreviações).
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
] as const;
