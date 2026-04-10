# Relatório de testes — classificação de relatos (`ai-orchestrator`)

Documentação da suíte em `supabase/functions/ai-orchestrator/lib-classify.test.ts`. Atualize a seção **Resultado da execução** após rodar os testes localmente ou em CI.

## Escopo

| Item | Detalhe |
|------|---------|
| **Arquivo** | `supabase/functions/ai-orchestrator/lib-classify.test.ts` |
| **Alvos** | `autoClassifyCategory()` e a ferramenta `classify_report_category` (via `executeTool` em `lib.ts`) |
| **Framework** | Deno Test + `std@0.168.0` asserts |
| **Supabase** | Cliente mockado (`{}`); cenários de `executeTool` não dependem de banco real |

## Resultado da execução (referência)

- **Total:** 38 testes  
- **Passaram:** 38  
- **Falharam:** 0  
- **Tempo total (referência):** ~56 ms  

Comando:

```bash
npx deno test --no-check --allow-env --allow-net supabase/functions/ai-orchestrator/lib-classify.test.ts
```

## Parte 1 — `autoClassifyCategory` (29 casos)

Objetivo: garantir mapeamento texto → `category`, `confidence`, `suggestedLabel` conforme pesos, padrões e desempates.

| Grupo | Foco | Qtd | Exemplos de comportamento validado |
|-------|------|-----|--------------------------------------|
| **A** | Alta confiança (≈ ≥ 0,9) | 6 | Iluminação, poluição sonora vs. estabelecimento, esgoto/alagamento/vazamento |
| **B** | Confiança média (0,7–0,86) + labels | 9 | Via pública, calçada, área verde, lixo, higiene, animais, pavimentação, sinalização, drenagem; inclui `suggestedLabel` null onde não há padrão |
| **C** | Baixa confiança / fallback | 3 | Barulho genérico, “situação irregular” → `outro`, feedback câmara |
| **D** | Sem classificação | 3 | Texto vazio, saudações → `category` null, `confidence` 0 |
| **E** | Ambiguidade / empate | 2 | Peso maior vence; empate strict → primeiro match na lista |
| **F** | Labels específicos | 3 | Escorpiões, mato alto, acessibilidade |
| **L** | Case-insensitive | 3 | Maiúsculas e mixed case normalizados |

Categorias exercitadas incluem, entre outras: `iluminacao`, `poluicao`, `esgoto`, `via_publica`, `calcada`, `area_verde`, `lixo`, `higiene_urbana`, `animais`, `pavimentacao`, `sinalizacao`, `drenagem`, `outro`, `feedback_camara`.

## Parte 2 — `classify_report_category` via `executeTool` (9 casos)

Objetivo: validar resposta da ferramenta (sucesso/erro, `data`, mensagem ao usuário, marcador de progresso `[COLLECTION_PROGRESS:urban_report:…]`).

| Grupo | Foco | Qtd | O que é assertado |
|-------|------|-----|-------------------|
| **G** | Entrada inválida | 2 | Categoria inexistente ou vazia → `success: false`; mensagem com “Categoria inválida” quando aplicável |
| **H** | Alta confiança (≥ 0,8) | 3 | Sucesso; `data` coerente; H1 checa texto (ex.: “Iluminação”, “CEP”) e JSON do progress marker |
| **I** | Baixa confiança + alternativas | 2 | `needs_confirmation: true`; mensagem cita alternativa em português |
| **J** | Baixa confiança + `user_confirmed: true` | 1 | Confirmação direta (“Entendido”), sem `needs_confirmation`, progress marker com `category_user_confirmed: true` |
| **K** | Baixa confiança sem alternativas | 1 | Não pede confirmação; mensagem inclui label humanizado (“Animais”) |

## Observações

- Os testes assíncronos de `executeTool` podem emitir **logs no console** (execução da tool e classificação); isso é esperado.  
- A flag `--allow-net` atende às importações HTTP do Deno (`lib.ts` e dependências); não implica chamadas de rede de negócio nos cenários mockados.

## Conclusão

A suíte cobre a classificação heurística local (`autoClassifyCategory`) e o contrato da tool `classify_report_category` (validação, limiar de confirmação, alternativas, confirmação explícita do usuário e marcador de progresso). Na execução de referência acima, **100% dos 38 testes passaram**.
