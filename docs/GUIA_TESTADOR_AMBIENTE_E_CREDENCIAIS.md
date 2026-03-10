# Guia para o testador – ambiente, credenciais e fluxo de validação

Este documento orienta **o que repassar** à pessoa que fará os testes (validação via banco + endpoint do AI Orchestrator) e **onde obter** cada informação. Use-o como checklist e preencha os campos entre colchetes antes de enviar.

---

## 1. Credenciais do Supabase (SQL Editor)

O testador pode validar dados diretamente no **SQL Editor** do Supabase (interface web, sem instalar nada).

**Como dar acesso:**

- **Opção A (recomendada):** Convidar a pessoa como **membro do projeto** no Supabase.
  - Supabase Dashboard → **Project Settings** (ícone engrenagem) → **Team** (ou **Organization** → projeto → membros).
  - Adicione o e-mail dela com role **Developer** ou **Read-only** (conforme a política de acesso).
  - Ela acessa o mesmo projeto em [app.supabase.com](https://app.supabase.com) e usa **SQL Editor** no menu lateral.

- **Opção B:** Se precisar de acesso externo (ex.: cliente DBeaver ou script), você pode compartilhar a **connection string** do banco (somente leitura, se possível):
  - Supabase Dashboard → **Project Settings** → **Database** → **Connection string** (URI).
  - Use a variante **Session mode** ou **Transaction** e, se disponível, uma role com permissão limitada.
  - **Não** coloque a connection string em repositório público; envie por canal seguro (ex.: 1Password, e-mail criptografado).

**O que informar ao testador:**

- [ ] **URL do projeto:** `https://app.supabase.com/project/<PROJECT_REF>`  
  (Substitua `<PROJECT_REF>` pelo ID do projeto, ex.: `vjzkzsczlbtmrzewffdx`.)
- [ ] **Que ele(a) foi convidado(a)** para o projeto (se usar Opção A), ou a connection string e instrução de uso (se usar Opção B).

---

## 2. URL do ambiente para testar o AI Orchestrator (/conversas)

O **AI Orchestrator** é acionado pelo **chat da aplicação**. A rota onde o usuário conversa com o assistente é:

- **`/conversas`** – lista de conversas e chat (página principal do assistente).

**URL completa** = URL base do app + `/conversas`.

**O que informar ao testador:**

- [ ] **Ambiente que ele(a) deve usar** (veja seção 3 abaixo).
- [ ] **URL base do app** desse ambiente, por exemplo:
  - **Produção:** `https://camara-na-mao.onrender.com` (ou o domínio final em uso).
  - **Staging/Preview:** a URL do deploy de preview (ex.: Render, Vercel).
  - **Dev local:** `http://localhost:5173` (se for o caso).
- [ ] **URL para testes do chat:**  
  `[URL_BASE]/conversas`  
  Exemplo: `https://camara-na-mao.onrender.com/conversas`

O endpoint técnico chamado pelo front é:

- `POST [SUPABASE_URL]/functions/v1/ai-orchestrator`  
  (O testador não precisa chamar esse POST manualmente para o fluxo “validação via app”; o uso da tela `/conversas` já faz isso.)

---

## 3. Qual ambiente utilizar (prod / staging / dev)

**O que definir e comunicar:**

- [ ] **Ambiente de testes:**  
  - **Produção** – se os testes forem no app já em uso pelos cidadãos.  
  - **Staging/Preview** – se existir um deploy separado (ex.: branch `staging` ou preview no Render).  
  - **Dev** – apenas se o testador for rodar o app localmente (`npm run dev`).

**O que informar ao testador:**

- [ ] **Use o ambiente:** _____________ (preencher: Produção / Staging / Dev).
- [ ] **URL base:** _____________ (conforme seção 2).
- [ ] Se houver **usuário de teste** (e-mail/senha) para login, informe com segurança.

---

## 4. Confirmação de que as tabelas estão criadas e populadas

As tabelas são criadas pelas **migrations** do Supabase (`supabase/migrations/*.sql`). Em projetos já deployados, elas costumam estar aplicadas.

**Como o responsável pelo projeto pode confirmar:**

1. **Supabase Dashboard** → **Table Editor**: verificar se as tabelas principais existem (ex.: `profiles`, `audiencias`, `ai_conversations`, `urban_reports`, etc.).
2. **SQL Editor**: rodar uma query simples, por exemplo:
   ```sql
   SELECT COUNT(*) FROM audiencias;
   SELECT COUNT(*) FROM profiles;
   ```
3. Se o projeto usa **CI/CD** ou **Supabase CLI**, as migrations são aplicadas no deploy; pode constar isso no README ou em docs de deploy.

**O que informar ao testador:**

- [ ] **Sim, as tabelas já estão criadas e as migrations foram aplicadas.**  
  (Ou: “Em [ambiente X] sim; em [ambiente Y] ainda não.”)
- [ ] **Dados de exemplo:** se houver dados iniciais (ex.: audiências, notícias), informe: “Sim, há dados nas tabelas X, Y, Z” ou “Algumas tabelas ainda estão vazias; o teste deve considerar isso.”

(O testador pode ele mesmo checar no SQL Editor, se tiver acesso ao projeto.)

---

## 5. Fluxo de validação: banco + testes no endpoint/app

**Sim, é correto** seguir um fluxo que combina:

1. **Validação via banco (SQL Editor)**  
   - Conferir se os dados esperados existem (audiências, perfis, conversas, etc.).  
   - Ajuda a saber se o problema é de dados (vazios/errados) ou do app/endpoint.

2. **Testes no app / endpoint**  
   - Testar na tela **/conversas** (e outras que usem o assistente).  
   - Validar se o AI Orchestrator responde como esperado (respostas, intents, RAG, etc.).

Ordem sugerida:

1. Confirmar ambiente e URL (seções 2 e 3).  
2. Confirmar no banco que as tabelas existem e têm dados quando aplicável (seção 4).  
3. Fazer login no app e testar o chat em **/conversas** (e Home, se o chat estiver lá também).  
4. Se algo falhar, usar os logs do **ai-orchestrator** (Supabase → Edge Functions → ai-orchestrator → Logs) e, se necessário, cruzar com os dados no SQL Editor.

Para detalhes de como testar o RAG no chat, use o [COMO_TESTAR_RAG.md](./COMO_TESTAR_RAG.md).

---

## 6. Resumo – checklist para enviar ao testador

Antes de enviar, preencha e confira:

| Item | O que enviar / combinar |
|------|--------------------------|
| **Supabase (SQL Editor)** | Acesso ao projeto (convite ou connection string) + URL do projeto no Dashboard. |
| **URL do app para o chat** | `[URL_BASE]/conversas` (ex.: `https://camara-na-mao.onrender.com/conversas`). |
| **Ambiente** | Deixar explícito: Produção / Staging / Dev e a URL correspondente. |
| **Tabelas e dados** | Confirmar que migrations estão aplicadas e se há dados nas tabelas relevantes. |
| **Fluxo de validação** | Validar primeiro no banco (SQL Editor), depois no app (/conversas); usar logs do ai-orchestrator em caso de erro. |

Com isso, o testador tem tudo para seguir o fluxo de validação via banco + testes no endpoint (tela de conversas e AI Orchestrator).
