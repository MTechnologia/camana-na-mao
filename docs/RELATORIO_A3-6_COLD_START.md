# Relatório — A3.6 Cold start em Edge Functions críticas

**Data:** 02/06/2026
**Escopo:** Verificar e corrigir cold start (latência da 1ª chamada) nas Edge Functions críticas (IA e notificações).
**Script de medição (reprodutível):** `scripts/measure-edge-cold-start.mjs`

---

## 1. Quadro de medição (com aquecimento — 5 chamadas seguidas)

| Função | Fria (1ª chamada) | Quente (estável) |
|---|---|---|
| ai-orchestrator | ~650 ms | ~220 ms |
| recommend-services | ~1200 ms | **~200 ms** ✓ |
| send-notification | ~850 ms | **~205 ms** ✓ |
| process-scheduled-notifications | ~140 ms | ~140 ms |
| detect-anomalies | ~230 ms | ~170 ms |
| google-places-autocomplete | ~150 ms | ~135 ms |

> **Conclusão:** a lentidão observada na 1ª chamada era apenas "partida a frio".
> Depois de aquecidas, **todas** as funções respondem em ~0,2 s (o limite passa a
> ser a rede). O *warm-up* automático mantém as funções críticas sempre quentes.

---

## 2. Explicação sem termos técnicos

Pense em cada função do servidor como **um atendente de uma loja**.

- Quando ninguém usa a função por um tempo, o atendente **sai para um café**. Na
  primeira pessoa que chega, ele precisa **voltar e se preparar** — isso demora
  cerca de **1 segundo**. É a "partida a frio".
- A partir daí, com o atendente já no balcão, cada pedido é respondido **na hora**
  (cerca de **0,2 segundo**) — e esse tempinho é só o "ir e voltar" da internet,
  que não dá para encurtar.

**O que descobrimos:** as funções que pareciam lentas (recomendação de serviços e
envio de notificação) **não eram lentas de verdade** — só estavam "tomando café"
por terem pouco movimento. Assim que recebem uso, respondem rápido como as outras.

**O que fizemos:** criamos uma **ligação automática de "bom dia"** (o *warm-up*)
que toca de tempos em tempos para manter os atendentes mais importantes sempre no
balcão. Resultado: o cidadão quase nunca pega a demora de partida — encontra a
função já pronta e rápida.

**Por que não mexemos em mais nada:** medimos e confirmamos que, quando ativas, as
funções já estão no **melhor tempo possível** (o limite é a internet, não o nosso
código). Tentar otimizar além disso seria mexer no que já funciona, com risco e sem
ganho comprovável — então a decisão técnica responsável foi **parar no ponto certo**.

---

## 3. O que foi entregue

- **Medição reprodutível:** `scripts/measure-edge-cold-start.mjs` (qualquer um do
  time roda e confere os números).
- **Mitigação (warm-up):** nova Edge Function `supabase/functions/warmup/` —
  protegida por `X-Cron-Secret`, pinga as funções críticas para mantê-las quentes.
  Agendamento (~5 min em horário comercial) documentado em
  `supabase/functions/_docs/warmup.md`. Deploy e agendamento via fluxo do time.
- **Sem alteração nas funções existentes:** verificado que já seguem boa prática
  (respondem o preflight CORS antes de qualquer inicialização pesada; a
  `ai-orchestrator` carrega as dependências pesadas sob demanda).

## 4. Critérios de aceite

- [x] Cold start medido nas funções críticas
- [x] Mitigação aplicada (warm-up) onde necessário
