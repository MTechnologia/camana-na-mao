import { accumulateFieldsFromHistory } from './lib.ts';

console.log("=== TESTE ISOLADO: TASK 4 (Pular texto livre) ===");

// Simulamos as mensagens onde o bot recém pediu a rating_text e o usuário tentou "pular"
const conversationPular = [
  { role: 'assistant', content: '[FIELD_REQUEST:rating_text]Você tem alguma sugestão de melhoria ou quer deixar um comentário extra? (Digite abaixo ou diga "pular")' },
  { role: 'user', content: 'pular' }
];

console.log("\n1) Testando a recusa do usuário (escreveu 'pular'):");
const resultPular = accumulateFieldsFromHistory(conversationPular, 'service_rating');
console.log("Resultado processado:", { 
  rating_text: resultPular.rating_text, 
  skipped: resultPular._rating_text_skipped 
});

// Simulamos as mensagens onde o usuário escreve algo curto
const conversationCurto = [
  { role: 'assistant', content: '[FIELD_REQUEST:rating_text]Você tem alguma sugestão de melhoria ou quer deixar um comentário extra? (Digite abaixo ou diga "pular")' },
  { role: 'user', content: 'sim' }
];

console.log("\n2) Testando texto curto de 3 caracteres (escreveu 'sim'):");
const resultCurto = accumulateFieldsFromHistory(conversationCurto, 'service_rating');
console.log("Resultado processado:", { 
  rating_text: resultCurto.rating_text, 
  skipped: resultCurto._rating_text_skipped 
});

// Simulamos as mensagens onde o usuário escreve algo válido
const conversationValido = [
  { role: 'assistant', content: '[FIELD_REQUEST:rating_text]Você tem alguma sugestão de melhoria ou quer deixar um comentário extra? (Digite abaixo ou diga "pular")' },
  { role: 'user', content: 'Gostei muito!' }
];

console.log("\n3) Testando texto longo e válido (escreveu 'Gostei muito!'):");
const resultValido = accumulateFieldsFromHistory(conversationValido, 'service_rating');
console.log("Resultado processado:", { 
  rating_text: resultValido.rating_text, 
  skipped: resultValido._rating_text_skipped 
});

console.log("\n=== FIM DO TESTE ===");
