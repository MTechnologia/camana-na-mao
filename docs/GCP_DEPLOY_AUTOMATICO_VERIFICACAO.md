# Por que o deploy automático no GCP pode não estar rodando

Quando você faz **push para o Git** e o **Cloud Run** não atualiza, o fluxo que deveria acontecer é:

1. **GitHub** envia um webhook para o **Google Cloud Build**
2. Um **Trigger** do Cloud Build dispara (ex.: em push na `main`)
3. O build roda o `cloudbuild.yaml` (Docker build + push + deploy no Cloud Run)

Se nada disso acontece, siga a verificação abaixo.

---

## 1. Conferir se existe um Trigger no Cloud Build

1. Acesse [Google Cloud Console](https://console.cloud.google.com) e selecione o projeto.
2. Vá em **Cloud Build** → **Triggers** (ou **Histórico** para ver builds).
3. Verifique:
   - Existe algum trigger para o repositório **camana-na-mao** (ou MTechnologia/camana-na-mao)?
   - O trigger está **habilitado** (toggle ativo)?

**Se não houver trigger:** crie um novo (veja seção “Criar trigger”, mais abaixo).

---

## 2. Branch configurada no trigger

- No trigger, veja o campo **Branch** (ou “Source” / “Branch to build”).
- Se estiver configurado para outra branch (ex.: `production`, `release`), pushes na `main` **não** disparam o build.
- Para deploy em todo push na principal: use `^main$` ou `main`.

---

## 3. Conexão do repositório com o GCP

O GCP precisa de uma “conexão” com o GitHub (1ª ou 2ª geração):

1. **Cloud Build** → **Repositories** (ou **Conexões com repositórios**).
2. Confira se o repositório **camana-na-mao** aparece e está **conectado**.
3. Se estiver “Desconectado” ou com erro:
   - Reautorize o GitHub (reconectar).
   - Confirme que o **GitHub App** do Google Cloud está instalado na org **MTechnologia** (ou na conta dona do repo) e com acesso a esse repositório.

---

## 4. Webhook do GitHub

O GitHub envia evento de “push” para o GCP. Se o webhook sumir ou estiver errado, o trigger não dispara:

1. No **GitHub**: repositório **MTechnologia/camana-na-mao** → **Settings** → **Webhooks**.
2. Veja se existe um webhook cuja URL seja do Google (ex.: `https://cloudbuild.gcp...` ou domínio do GCP).
3. Clique no webhook e veja **Recent Deliveries**:
   - Se os últimos pushes aparecem como entregues com **200**, o GitHub está chamando o GCP.
   - Se aparecem **4xx/5xx** ou “Failed”, a URL ou o secret podem estar errados (aí o GCP pode ignorar).

Se não houver webhook ou a URL for de outro serviço (ex.: só Vercel), o Cloud Build **não** recebe o push.

---

## 5. “Só quando certos arquivos mudam”

Alguns triggers têm filtro **Included files** (ou “Run only when…”).

- Ex.: `cloudbuild.yaml`, `src/**`, `package.json`.
- Se o filtro estiver muito restrito (ex.: só `docs/**`), pushes que mudam só outras pastas **não** disparam o build.
- Para testar: deixe temporariamente sem filtro ou inclua `.` (qualquer arquivo).

---

## 6. Ver o Histórico de builds

1. **Cloud Build** → **Histórico**.
2. Faça um push de teste e espere 1–2 minutos.
3. Veja se surge um novo build com:
   - **Source**: seu commit / branch.
   - **Status**: Queued → Working → Success/Failure.

- **Nenhum build novo:** o trigger não está disparando (branch, repo, webhook ou conexão).
- **Build aparece e falha:** o problema é no build/deploy (Docker, permissões, variáveis); veja os logs do build.

---

## 7. Resumo rápido de causas

| Sintoma | Possível causa |
|--------|-----------------|
| Nenhum build na fila ao dar push | Trigger inexistente, desligado, branch errada, repo desconectado ou webhook não chegando |
| Build dispara mas falha logo | Permissões da service account do Cloud Build, Dockerfile, variáveis de substituição |
| Build ok, Cloud Run não muda | Deploy falhando (região, nome do serviço, imagem); ver logs do passo “Deploy to Cloud Run” |

---

## Criar um trigger (se não existir)

1. **Cloud Build** → **Triggers** → **Create trigger**.
2. **Name:** ex. `deploy-camana-na-mao-on-push`.
3. **Region:** use a mesma do Cloud Run (ex.: `southamerica-east1`) se aparecer a opção.
4. **Event:** “Push to a branch”.
5. **Source:** selecione a conexão/repositório **camana-na-mao**.
6. **Branch:** `^main$` (ou a branch que você usa para produção).
7. **Configuration:** “Cloud Build configuration file” → **cloudbuild.yaml** (caminho na raiz do repo).
8. **Substitution variables** (se o build usar):  
   `_CAMARA_URL`, `_CAMARA_PUBLISHABLE_KEY`, `_CAMARA_PROJECT_ID`, `_CLOUD_RUN_SERVICE`, `_CLOUD_RUN_REGION` conforme você já usa no build.
9. Salve e deixe o trigger **habilitado**.

Depois disso, um push na branch configurada deve enfileirar um build e, se o `cloudbuild.yaml` estiver correto, fazer o deploy no Cloud Run.

---

## Referência no projeto

- Build e deploy: **`cloudbuild.yaml`** na raiz (Docker build → push para GCR → deploy no Cloud Run `camana-na-mao` em `southamerica-east1`).
