# Como testar o RAG na aplicação

Guia rápido para validar se o **RAG (Vertex AI Search / data store)** está respondendo no chat do Câmara na Mão.

---

## Pré-requisitos

1. **Secret configurado no Supabase**  
   - `VERTEX_RAG_DATASTORE` com o path do data store (ex.: `projects/.../locations/global/collections/default_collection/dataStores/camara-na-mao-rag_...`).  
   - Ver [SUPABASE_SECRETS_VERTEX.md](./SUPABASE_SECRETS_VERTEX.md) e [RAG_UPLOAD_CRAWL_AI_APPLICATIONS.md](./RAG_UPLOAD_CRAWL_AI_APPLICATIONS.md).

2. **Data store indexado**  
   - No GCP → AI Applications → Data stores → seu data store: importação concluída (sem erros ou com poucos itens falhados).

3. **Usuário logado**  
   - O chat chama o **ai-orchestrator**, que exige autenticação.

---

## Testes manuais no app

### 1. Acessar o chat

- Faça login na aplicação.
- Na **Home** (/), use o assistente (área de chat).

### 2. Perguntas que acionam o RAG

O RAG é usado quando a **intenção** da mensagem é classificada como **"general"**. Perguntas abertas sobre a Câmara tendem a cair nisso.

**Exemplos de perguntas para testar:**

- "O que é a Câmara Municipal?"
- "Como funciona uma audiência pública?"
- "Quais são as atribuições dos vereadores?"
- "O que é o Câmara na Mão?"
- "Como posso participar das sessões?"
- "Onde fica a Câmara Municipal de São Paulo?"

### 3. O que verificar

- **Resposta não vazia** e coerente com o tema.
- **Conteúdo específico** que provavelmente veio dos documentos (nomes, processos, atribuições) em vez de resposta genérica.
- **Logs do ai-orchestrator** (Supabase → Edge Functions → ai-orchestrator → Logs):  
  - Mensagem como:  
    `[ai-orchestrator] Injected Vertex RAG context for general intent, length: XXXX`  
  - Indica que o Vertex retornou contexto do data store e ele foi injetado no prompt.

### 4. Se não aparecer contexto do RAG

- Confirme o secret **VERTEX_RAG_DATASTORE** (path completo do data store).
- Confirme que o **ai-orchestrator** está usando esse secret (variável de ambiente na Edge Function).
- Veja nos logs se há:  
  `Vertex RAG generateContent failed` ou `Could not parse project/location from AI base URL`.

---

## Teste automatizado (E2E)

Foi adicionado um teste em **`tests/e2e/ai-chat.spec.ts`** que:

1. Faz login.
2. Envia uma pergunta de intenção geral (ex.: "O que é a Câmara Municipal?").
3. Verifica se o assistente responde (presença de texto na resposta).

Para rodar:

```bash
npx playwright test tests/e2e/ai-chat.spec.ts
```

Para rodar só o teste de RAG (se existir o test com nome específico):

```bash
npx playwright test tests/e2e/ai-chat.spec.ts -g "RAG"
```

---

## Resumo

| O que testar              | Onde / como |
|---------------------------|-------------|
| Pergunta geral no chat    | Home → assistente → pergunta aberta sobre a Câmara |
| Resposta usa conteúdo     | Resposta específica + log "Injected Vertex RAG context" |
| E2E                       | `npx playwright test tests/e2e/ai-chat.spec.ts` |

Se o RAG estiver ok, perguntas gerais devem trazer informações ancoradas nos documentos do data store (crawl do site, etc.).
