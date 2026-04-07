# Relatório Técnico: Pergunta de Infraestrutura (OS-06)

**Ticket:** #8824578 — OS-06 (Subtask: Pergunta de infraestrutura)  
**Data de entrega:** 2026-04-06  
**Status:** ✅ Implementação e testes locais concluídos  

---

## 1. Descrição do Escopo

Implementação da dimensão de **infraestrutura** (instalações, limpeza, conservação) no fluxo de avaliação de serviço do chatbot. O objetivo é coletar a percepção do cidadão sobre o ambiente físico do serviço público e replicar automaticamente esse valor para a dimensão de **limpeza** no registro final de forma atômica.

---

## 2. Modificações no Orquestrador (Edge Function)

Foram realizadas alterações nos arquivos principais do orquestrador para integrar a nova dimensão.

### 2.1 [MODIFY] [index.ts](file:///wsl.localhost/Ubuntu/home/luana/camana-na-mao/supabase/functions/ai-orchestrator/index.ts)
**Localização:** Linhas 894-899 (dentro de `getNextMissingField`)

Adição da verificação de campo faltante para disparar a pergunta de infraestrutura.

```typescript
if (!('infraestrutura_score' in fields))
  return {
    field: 'infraestrutura',
    picker: '[DIMENSION_RATING_PICKER:infraestrutura]',
    prompt: 'Como você avalia a **infraestrutura** (instalações, limpeza e conservação)? De 1 a 5 estrelas.'
  };
```

### 2.2 [MODIFY] [lib.ts](file:///wsl.localhost/Ubuntu/home/luana/camana-na-mao/supabase/functions/ai-orchestrator/lib.ts)
**Localização 1:** Linhas 2533-2537 (em `accumulateFieldsFromHistory`)

Implementação da replicação no acúmulo de campos via histórico:
```typescript
if (dimKey === 'infraestrutura') {
  accumulated['limpeza_score'] = dimScore;
}
```

**Localização 2:** Linhas 5784-5787 (em `create_service_rating`)

Implementação da replicação na persistência final para o banco de dados (JSONB):
```typescript
if (args.infraestrutura_score) {
  dimensions.infraestrutura = Number(args.infraestrutura_score);
  dimensions.limpeza = Number(args.infraestrutura_score); 
}
```

---

## 3. Modificações no Frontend (Interface)

### 3.1 [MODIFY] [ChatMessageBubble.tsx](file:///wsl.localhost/Ubuntu/home/luana/camana-na-mao/src/components/ai/ChatMessageBubble.tsx)
**Localização:** Linhas 191-196 e 878-887

Refatoração para detectar e renderizar o seletor de estrelas para qualquer dimensão dinâmica, especificamente para `infraestrutura`.

```tsx
// Detecção (L191)
const dimensionRatingMatch = useMemo(() => {
  const match = message.content.match(/\[DIMENSION_RATING_PICKER:(\w+)\]/);
  return match ? match[1] : null;
}, [message.content]);

// Renderização (L878)
{hasDimensionRatingPicker && (
  <InlineRatingPicker
    dimensionKey={dimensionRatingMatch!}
    onSelect={handleDimensionRatingSelected}
  />
)}
```

### 3.2 [MODIFY] [App.tsx](file:///wsl.localhost/Ubuntu/home/luana/camana-na-mao/src/App.tsx)
**Localização:** Linha 331

Adição da rota de teste para validação da funcionalidade:
```tsx
<Route path="/test-infra-rating" element={<TestInfraRating />} />
```

---

## 4. Novos Arquivos Criados

| Arquivo | Descrição |
|---|---|
| [TestInfraRating.tsx](file:///wsl.localhost/Ubuntu/home/luana/camana-na-mao/src/pages/TestInfraRating.tsx) | Página de teste isolada para validação do picker de infraestrutura e geração do marcador. |

---

## 5. Validação e Evidência

A validação visual foi realizada via página de teste local (`/test-infra-rating`).

### Comportamento Verificado:
- ✅ O robô pergunta especificamente sobre infraestrutura (instalações, limpeza e conservação).
- ✅ O seletor de estrelas exibe labels de **Péssimo** a **Excelente** conforme a nota.
- ✅ Seleção de nota gera o marcador `[DIM_RATING:infraestrutura:N]`.
- ✅ A replicação para `limpeza_score` foi confirmada via logs do orquestrador.

---

## 6. Conclusão

A tarefa está completa com todas as modificações integradas ao fluxo existente de avaliação de serviços, garantindo a coleta de dados estruturados e a conformidade com as regras de negócio de replicação.
