# Guia para testar a Avaliação conversacional

Este guia descreve como testar o fluxo de **avaliação conversacional** (ConversationalEvaluation), integrado ao AI Orchestrator.

---

## Pré-requisitos

1. **Usuário logado** — a avaliação exige autenticação.
2. **AI Orchestrator em execução** — a edge function `ai-orchestrator` deve estar deployada e configurada (Supabase).
3. **App rodando** — `npm run dev` ou ambiente de staging/produção.

---

## Modos de uso

A avaliação conversacional pode ser usada de duas formas:

| Modo | Rota | Comportamento |
|------|------|---------------|
| **Com visita** | `/avaliar/:visitId` | O assistente já sabe o serviço (`visit_id`, nome, tipo). Inicia com *"Olá, quero avaliar o [nome]"* e segue o mesmo roteiro atômico do modo livre: nota geral, tempo de espera, dimensões (atendimento, infraestrutura) e comentário/sugestão. |
| **Modo livre** | `/avaliar` | Lista visitas pendentes (se houver) e, abaixo, chat **modo livre**: pergunta tipo, bairro, nome e confirmação de endereço; em seguida o **mesmo** fluxo de dimensões do caminho com visita. A avaliação grava uma visita virtual `completed` na base. |

---

## Como testar

### 1. Teste rápido (modo livre)

1. Faça login no app.
2. Acesse: **`http://localhost:5173/avaliar`** (ou a URL base do ambiente).
3. Role até **Modo livre** (ou *Ou avalie outro serviço* se houver visitas pendentes). O chat inicia em branco. Escreva algo como:
   - *"Quero avaliar a UBS do Centro"*
   - *"Quero avaliar o CEU Aricanduva"*
   - *"Quero avaliar a biblioteca que visitei"*
4. O assistente vai:
   - pedir tipo, bairro e nome do serviço (e confirmar endereço), se ainda não tiver;
   - em seguida, nota geral, tempo de espera, dimensões e comentário (igual ao fluxo com `visit_id`);
   - registrar a avaliação via ferramenta `create_service_rating` (com visita virtual `completed` quando não há visita prévia).

### 2. Teste com visita (contexto completo)

Para usar o contexto de visita, é preciso um `visit_id` válido em `service_visits`.

**Obter um visit_id no banco:**

```sql
SELECT id, user_id, service_id, created_at
FROM service_visits
ORDER BY created_at DESC
LIMIT 5;
```

Depois acesse:

```
http://localhost:5173/avaliar/[visit_id]
```

Exemplo: `http://localhost:5173/avaliar/abc123-def456-...`

Neste modo, o assistente já sabe o serviço e pode começar com:

> *"Olá, quero avaliar o [nome do serviço]"*

E em seguida segue o mesmo roteiro de dimensões (nota geral, espera, atendimento, infraestrutura, comentário).

### 3. Teste via fluxo completo (detecção de visita)

1. Acesse **Perto de Você** (`/servicos-proximos`).
2. Use **GPS real** (ou simulado, dentro de um geofence de serviço).
3. Permaneça **≥ 10 minutos** dentro do raio de 50 m de um serviço.
4. Surge o toast **"Você visitou [nome]. Gostaria de avaliar?"** com botão **Avaliar**.
5. Clique em **Avaliar** → navega para `/avaliar/:visitId`.
6. O chat já vem com contexto e pode iniciar automaticamente a avaliação do serviço.

### 4. Teste via serviço visitado

1. Acesse um serviço em `/servico/:id`.
2. Se houver visita registrada, pode haver botão ou link para **Avaliar visita**.
3. Isso leva a `/avaliar/:visitId`.

---

## Validando o resultado

### Na interface

- Após concluir, a avaliação é registrada e o callback `onComplete` é chamado.
- O usuário pode ser redirecionado ou ver uma mensagem de sucesso.

### No banco de dados

```sql
SELECT id, user_id, service_id, visit_id, rating_stars, rating_text, sentiment, created_at
FROM service_ratings
ORDER BY created_at DESC
LIMIT 10;
```

Verifique se `rating_stars`, `rating_text` e `sentiment` foram preenchidos corretamente.

---

## Testes E2E automatizados

Há testes Playwright em `tests/e2e/evaluation.spec.ts`:

```bash
# Com o app rodando em outro terminal:
npm run dev

# Em outro terminal:
npx playwright test tests/e2e/evaluation.spec.ts --workers=1
```

Os testes cobrem:

- Avaliar serviço pendente (modo livre).
- Encaminhar avaliação para vereador.
- Buscar serviços próximos.

---

## Problemas comuns

| Problema | O que checar |
|----------|--------------|
| Chat não responde | Edge function `ai-orchestrator` está deployada? Variáveis de ambiente (SUPABASE_URL, keys de IA) configuradas? |
| Redirecionamento para /login | Usuário precisa estar logado. Fazer login antes de acessar `/avaliar`. |
| "Erro ao carregar" na página | Verificar se existe visita válida quando usar `/avaliar/:visitId`. |
| "Não encontrei esse serviço na base" | O serviço precisa estar em `public_services`. No Supabase SQL Editor: `SELECT id, name, service_type, district FROM public_services WHERE name ILIKE '%Rosa%' LIMIT 10;` |
| Avaliação não aparece no banco | Conferir RLS em `service_ratings`. Usuário deve ter permissão de INSERT. |
| Sem toast "Você visitou..." | Detecção de visita exige 10 min dentro do geofence (50 m). Ver `docs/OS05_DETECCAO_VISITAS.md`. |

---

## Referências

- `docs/OS05_DETECCAO_VISITAS.md` — Detecção de visitas e geofencing.
- `src/components/evaluation/ConversationalEvaluation.tsx` — Componente principal.
- `src/pages/EvaluationPage.tsx` — Página que renderiza a avaliação.
