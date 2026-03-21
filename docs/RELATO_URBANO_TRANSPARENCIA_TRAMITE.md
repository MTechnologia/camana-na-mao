# Transparência: trâmite administrativo do relato (chatbot)

**Objetivo (PO):** o assistente explica, quando perguntado ou após o registro, **para onde vai o relato**, **quem analisa**, **prazos esperados** (sem prometer prazos legais fixos inexistentes).

## Protocolo legível (cidadão)

Relatos urbanos usam **`REL-YYYY-NNNNNN`** (ex.: `REL-2026-000452`), gerado atomicamente no banco (`generate_protocol_code`). Relatos de transporte: **`TRP-YYYY-NNNNNN`**. O **UUID** permanece interno; o cidadão vê o código em **Contribuições urbanas**, **Minhas contribuições (transporte)**, no chat após o registro e no histórico via IA (`get_citizen_history`).

## Onde está implementado

| Local | Função |
|--------|--------|
| `supabase/migrations/20260304210000_citizen_protocol_rel_prefix.sql` | Prefixo `REL` para urban; migra `URB-*` → `REL-*`. |
| `supabase/functions/ai-orchestrator/lib-urban-tramite.ts` | Texto canônico (fonte única): bloco pós-registro urbano, resumo transporte, instruções para o system prompt. |
| `supabase/functions/ai-orchestrator/lib.ts` | Mensagens de sucesso de `create_urban_report` e `create_transport_report` incluem o bloco educativo. |
| `supabase/functions/ai-orchestrator/lib-prompts.ts` | Seção **TRÂMITE ADMINISTRATIVO DO RELATO URBANO** + exceção ao tom “máx. 2 frases” quando o cidadão pergunta explicitamente sobre trâmite/prazos. |

## Ajuste de conteúdo

Se a Câmara quiser **linguagem institucional** diferente (ex.: nome de setor, menção a SLA real, integração com 156 ou Ouvidoria), edite **`lib-urban-tramite.ts`** e faça deploy da Edge Function `ai-orchestrator`.

## O que **não** prometemos no texto

- Prazo único garantido (ex.: “em X dias”) para todas as demandas.
- Garantia de que um órgão específico responderá em tempo fixo.

Isso evita expectativa incorreta; o acompanhamento é orientado via **Meus relatos** e canais de urgência (156) quando aplicável.
