/**
 * Formata um número de telefone brasileiro
 * Suporta telefones fixos (10 dígitos) e celulares (11 dígitos)
 * Formato: (XX) XXXXX-XXXX para celular ou (XX) XXXX-XXXX para fixo
 */
export const formatPhone = (value: string): string => {
  // Remove tudo que não é dígito
  const cleaned = value.replace(/\D/g, '');
  
  // Limita a 11 dígitos (máximo para celular brasileiro)
  const limited = cleaned.slice(0, 11);
  
  // Aplica a máscara baseada no tamanho
  if (limited.length <= 2) {
    return limited;
  } else if (limited.length <= 6) {
    return `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
  } else if (limited.length <= 10) {
    // Telefone fixo: (XX) XXXX-XXXX
    return `(${limited.slice(0, 2)}) ${limited.slice(2, 6)}-${limited.slice(6)}`;
  } else {
    // Celular: (XX) XXXXX-XXXX
    return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7)}`;
  }
};

/**
 * Remove a formatação do telefone, retornando apenas os dígitos
 */
export const unformatPhone = (value: string): string => {
  return value.replace(/\D/g, '');
};

/**
 * Valida se o telefone está completo
 * Aceita telefones fixos (10 dígitos) ou celulares (11 dígitos)
 */
export const isValidPhone = (value: string): boolean => {
  const cleaned = unformatPhone(value);
  return cleaned.length === 10 || cleaned.length === 11;
};
