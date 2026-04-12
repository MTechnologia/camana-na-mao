export interface TransportLineFixture {
  id: string;
  line_code: string;
  line_name: string;
  line_type: 'onibus' | 'metro';
}

export const TRANSPORT_LINE_FIXTURES: TransportLineFixture[] = [
  {
    id: 'line-fixture-875a',
    line_code: '875A-10',
    line_name: 'Lapa - Metrô Sé',
    line_type: 'onibus',
  },
  {
    id: 'line-fixture-509m',
    line_code: '509M-10',
    line_name: 'Terminal Sacomã - Terminal Pinheiros',
    line_type: 'onibus',
  },
  {
    id: 'line-fixture-l4',
    line_code: 'LINHA 4',
    line_name: 'Amarela',
    line_type: 'metro',
  },
];

export const TRANSPORT_CONVERSATIONAL_SCENARIOS = [
  {
    name: 'atraso recorrente no sentido ida',
    openingMessage:
      'Quero relatar atraso frequente na linha 875A-10. O ônibus está demorando muito no pico da manhã.',
    lineSearchTerm: '875',
    lineCodeToPick: '875A-10',
    timeButtonLabel: /Manhã/i,
    directionButtonLabel: /^Ida$/i,
    recurrenceButtonLabel: /Toda semana/i,
    impactMessage: 'Isso me faz chegar atrasado no trabalho e perder reuniões importantes.',
    expectedTypeLabel: /Tipo:\s*Atraso/i,
    expectedSeverityLabel: /Gravidade:\s*(Média|Alta|Crítica)/i,
  },
  {
    name: 'condução insegura recorrente no sentido volta',
    openingMessage:
      'Quero relatar que o motorista está freando bruscamente e dirigindo de forma perigosa na volta para casa.',
    lineSearchTerm: '509',
    lineCodeToPick: '509M-10',
    timeButtonLabel: /Noite/i,
    directionButtonLabel: /^Volta$/i,
    recurrenceButtonLabel: /Todos os dias/i,
    impactMessage: 'Já quase caí dentro do ônibus e tenho medo de acontecer um acidente.',
    expectedTypeLabel: /Tipo:\s*Condução|Tipo:\s*Segurança/i,
    expectedSeverityLabel: /Gravidade:\s*(Alta|Crítica|Média)/i,
  },
] as const;
