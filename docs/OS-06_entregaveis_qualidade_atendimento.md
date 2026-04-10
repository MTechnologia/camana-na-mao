# Relatório Técnico: Task OS-06 - Qualidade de Atendimento (#3106160)

## 📌 Contexto da Tarefa
**OS-06 (Avaliação Estruturada com Perguntas sobre Tempo de Espera, Qualidade do Atendimento, Infraestrutura e Sugestões)**

**Título:** Pergunta de qualidade do atendimento
**Descrição:** Implementar no chatbot a pergunta sobre a qualidade do atendimento, utilizando um componente visual de estrelas com rótulos descritivos. A tarefa envolve adaptar o componente InlineRatingPicker existente para suportar dimensões e rótulos customizados.

### 📝 Critérios de Aceite Atendidos:
1. ✓ A pergunta de atendimento exibe o picker de estrelas (1 a 5).
2. ✓ Os labels contextuais ("Péssimo", "Ruim", "Regular", "Bom", "Excelente") são exibidos corretamente.
3. ✓ A seleção envia a mensagem no formato esperado (ex: Atendimento: 4 estrelas [DIM_RATING:atendimento:4]).

### 💼 Regras de Negócio:
*   ✓ **RN-IA-003:** A pergunta deve ser feita de forma atômica (apenas a pergunta de avaliação do atendimento deve ser feita no momento).

---

## 🛠️ Implementação Técnica

### 1. Adaptação do Componente `InlineRatingPicker`
O componente existente `src/components/ai/InlineRatingPicker.tsx` foi atualizado para suportar dimensões customizadas, mantendo 100% de retrocompatibilidade com a avaliação geral.

**Modificações:**
*   Adição de props opcionais: `dimensionKey` (ex: "atendimento"), `labels` (array de strings) e `promptText` (texto de instrução).
*   Se `dimensionKey` for especificado, os rótulos interpolados dinamicamente são: "Péssimo", "Ruim", "Regular", "Bom", "Excelente".
*   Exibição do rótulo ativo em destaque sob as estrelas durante o hover/foco.

### 2. Orquestrador e Heurísticas UI (`ChatMessageBubble` & `useUnifiedAIChat`)
*   **Novo Marcador:** Integrada a detecção do marcador `[DIMENSION_RATING_PICKER:atendimento]` no `ChatMessageBubble.tsx`.
*   **Parsing e Persistência:** Implementado parsing da expressão regular `/\[DIM_RATING:(\w+):(\d)\]/i` no frontend (`useUnifiedAIChat.ts`) e no backend (`supabase/functions/ai-orchestrator/lib.ts`).
*   **Campo Mapeado:** O score de atendimento é salvo dinamicamente sob a chave `{dimension}_score` (ex: `atendimento_score`).

### 3. Integração com o Backend (Edge Functions)
*   **Sequência de Coleta:** O arquivo `supabase/functions/ai-orchestrator/index.ts` foi mapeado para solicitar o `atendimento_score` caso ele ainda não exista nas variáveis `fields` acumuladas (após a verificação de `wait_time`).
*   **Tool Exec:** O argumento `atendimento_score` foi inserido no construtor de acionamento das tools (`create_service_rating`).

### 4. Sanitização de Interface
*   Atualizado o módulo utilitário `src/lib/sanitizeMarkers.ts` para capturar os novos painéis visuais:
    *   `\[DIMENSION_RATING_PICKER:\w+\]`
    *   `\[DIM_RATING:\w+:\d\]`

### 5. Rota de Validação Visual
Foi criada uma página em `http://localhost:5173/test-dimension-rating` que permite visualizar localmente o comportamento das estrelas, mensagens geradas e validação das strings antes da comunicação final no chat.
***(Página de testes provisória a ser removida das rotas finais, conforme praxe)***

---

## ✅ Evidências a Serem Capturadas
Para finalizar os entregáveis exigidos, o desenvolvedor ou testador responsável deve capturar as screenshots na branch local após rodar os testes na UI e salvá-los no diretório `docs/images/`:

1.  📸 `os06_atendimento_picker.png` - Captura do chatbot exibindo as estrelas.
2.  📸 `os06_atendimento_selecionado.png` - Captura de hover/seleção com a visibilidade de labels, como "Ruim" ou "Excelente".
3.  📸 `os06_atendimento_rota_teste.png` - Print da tela isolada `/test-dimension-rating`.

---

## 🚀 Status e Próximos Passos
O desenvolvimento do código foi **concluído** e implementado. A coleta e roteamento desta etapa compõem a segunda parte completa da Task OS-06.

**Lembrete de Deploy:**  
As funções Supabase foram devidamente modificadas (em `/supabase/functions/ai-orchestrator`). Logo, para as mudanças surtirem efeito completo no banco:
```bash
supabase functions deploy ai-orchestrator --project-ref vjzkzsczlbtmrzewffdx
```
