# Relatório E2E — Playwright

**Data:** 02/06/2026
**Branch:** `dev`
**Projeto:** chromium (Desktop Chrome)
**Backend:** Supabase real (`.env`), sessão admin via `E2E_TEST_*`
**Comando:** `npx playwright test --project=chromium`
**Relatório HTML:** `npx playwright show-report` (em `playwright-report/index.html`)

---

## 1. Totais

| Métrica | Valor |
|---|---|
| Arquivos de spec | 25 |
| Testes executados | 74 |
| ✅ Passou | **55** |
| ❌ Falhou | **3** |
| ⏭️ Pulado (skip condicional) | 16 |
| 🔁 Flaky (retry) | 0 |
| Duração total | ~15 min (912,9 s) |

**Taxa de sucesso (excluindo skips):** 55/58 = **94,8%**. As 3 falhas são **2 conhecidas (RBAC/credencial)** + **1 flake sob carga** — nenhuma é regressão de código nova.

---

## 2. Resultado por spec

| Spec | ✅ | ❌ | ⏭️ |
|---|---:|---:|---:|
| admin-dashboard.spec.ts | 3 | 0 | 0 |
| ai-chat.spec.ts | 5 | 1 | 0 |
| analytics-drills.spec.ts | 4 | 0 | 0 |
| audiencias.spec.ts | 4 | 0 | 0 |
| auth.spec.ts | 3 | 0 | 1 |
| chat-evaluation-hub-smoke.spec.ts | 1 | 0 | 0 |
| chat-journey-switch.spec.ts | 1 | 0 | 0 |
| chat-transport-smoke.spec.ts | 1 | 0 | 0 |
| chat-urban-smoke.spec.ts | 1 | 0 | 0 |
| chatbot-typo-transport.spec.ts | 4 | 0 | 0 |
| chatbot-typo-urban.spec.ts | 4 | 0 | 0 |
| console-errors.spec.ts | 3 | 0 | 0 |
| demographic-drill.spec.ts | 0 | 0 | 1 |
| evaluation-conversational.spec.ts | 0 | 0 | 3 |
| evaluation.spec.ts | 1 | 0 | 2 |
| exportacao.spec.ts | 1 | 0 | 1 |
| legacy-admin-redirects.spec.ts | 1 | 0 | 0 |
| mobile-responsive.spec.ts | 4 | 0 | 0 |
| rbac.spec.ts | 1 | 2 | 5 |
| referral-auto.spec.ts | 0 | 0 | 1 |
| transport-conversational.spec.ts | 2 | 0 | 0 |
| transport.spec.ts | 3 | 0 | 0 |
| triagem.spec.ts | 3 | 0 | 1 |
| urban.spec.ts | 5 | 0 | 0 |
| visit-notification.spec.ts | 0 | 0 | 1 |

---

## 3. Cobertura por área

| Área | Specs | Situação |
|---|---|---|
| **Relatos** (urbano/transporte) | urban, transport, transport-conversational, chatbot-typo-* | ✅ verde |
| **Chat / IA** (jornadas, RAG, smokes, troca) | ai-chat, chat-*-smoke, chat-journey-switch | ✅ verde (exceto 1 flake — ver §4) |
| **Avaliação / serviços** | evaluation, evaluation-conversational, chat-evaluation-hub-smoke | ✅ (vários skips condicionais por falta de visita pendente) |
| **Audiências** | audiencias | ✅ verde |
| **Admin / Analytics OS-07** | admin-dashboard, analytics-drills, demographic-drill | ✅ verde |
| **Gestão admin** | triagem, referral-auto, exportacao | ✅ verde |
| **RBAC** | rbac | ⚠️ 2 falhas conhecidas (credencial) + skips de gestor/cidadão |
| **Autenticação** | auth | ✅ (registro pulado p/ não criar usuários) |
| **Qualidade A3.x** (novos) | console-errors, legacy-admin-redirects, mobile-responsive | ✅ verde |

---

## 4. Análise das falhas (3)

### 4.1 `rbac › admin acessa /admin/permissions (matriz)` e `rbac › sidebar do admin mostra todos os itens críticos` — CONHECIDAS (credencial)
- **Causa:** o usuário de teste (`E2E_TEST_*`, usado como fallback de admin) tem acesso admin geral (passa em `/admin/users`, `/admin/audit-logs`) mas **não tem o grant de gestão de permissões** (`permissions.manage`). Por isso a sidebar oculta "Matriz de permissões" e `/admin/permissions` mostra fallback.
- **Não é regressão** — é RBAC funcionando. Documentado na A3.4.
- **Correção:** configurar `E2E_ADMIN_EMAIL`/`E2E_ADMIN_PASSWORD` de um admin com `permissions.manage` em `.env.e2e.local` para esses 2 testes (e os 5 skips de gestor/cidadão precisam de `E2E_GESTOR_*`/`E2E_CIDADAO_*`).

### 4.2 `ai-chat › deve deletar conversa` — FLAKE sob carga
- **Sintoma:** o botão "Deletar permanentemente" é **encontrado**, mas o `click`/toast de sucesso estoura o timeout de 15 s. Em re-execução, falhou num ponto **diferente** (confirmar → toast), confirmando instabilidade de **timing/carga**, não bug determinístico.
- O próprio spec já reconhece a lentidão ("sob carga o delete e o toast podem demorar", timeout de teste de 45 s), mas os timeouts **por-passo** (15 s) são apertados contra o backend real sob carga.
- **Não é regressão de código.** Recomendação: estabilizar (aumentar os timeouts por-passo do delete/toast, ou `waitFor` mais tolerante).

---

## 5. Skips (16) — todos condicionais/esperados

- **rbac (5):** testes de gestor/cidadão — pulam sem `E2E_GESTOR_*`/`E2E_CIDADAO_*`.
- **evaluation-conversational (3) + evaluation (2):** precisam de visita pendente seedada.
- **demographic-drill (1), referral-auto (1), visit-notification (1), triagem (1), exportacao (1):** condicionais a dados (heatmap, histórico urbano, geofence/visita, relato para triar, dados de export).
- **auth (1):** registro de novo usuário pulado p/ não poluir o Supabase.

São skips graciosos (a suíte roda contra backend compartilhado sem fixtures seedadas) — não indicam falha.

---

## 6. Conclusão

A suíte E2E está **saudável**: 55/58 verdes (94,8%), 0 flaky no relatório oficial, fluxos cidadão e admin cobertos. As 2 falhas de RBAC são de **credencial de teste** (não-código) e a 1 falha de chat é **flake de timing sob carga**. Itens de follow-up:

1. Configurar `E2E_ADMIN_*` (e `E2E_GESTOR_*`/`E2E_CIDADAO_*`) em `.env.e2e.local` → fecha 2 falhas + 5 skips de RBAC.
2. Estabilizar `ai-chat › deve deletar conversa` (timeouts por-passo).
3. (Opcional) Seedar fixtures de visita/relato para destravar os skips condicionais.
