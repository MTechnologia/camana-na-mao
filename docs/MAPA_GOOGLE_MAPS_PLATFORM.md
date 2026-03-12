# Google Maps Platform (mapa e distâncias)

## Status para validação (PO / checklist)

- **Produção (Cloud Run):** O mapa e as distâncias a pé no "Perto de Você" usam **Google Maps**. A chave **não** fica no repositório; é configurada no **GCP** no trigger do Cloud Build (substitution `_VITE_GOOGLE_MAPS_API_KEY`). Se o trigger estiver configurado no console do GCP, o build de produção recebe a chave e o mapa e as distâncias funcionam em produção.
- **Repositório:** O `.env` da raiz não deve conter chaves (segurança). Os valores vazios no `cloudbuild.yaml` são **propositalmente** defaults do arquivo; o valor real é definido no **trigger** no GCP.
- **Mapbox:** **Removido.** O app utiliza **apenas Google Maps Platform** (mapa em `MapView` → `GoogleMapView` e distâncias por rota via **Routes API** na página "Perto de Você").

---

## O que está habilitado no código

| Funcionalidade | API / uso |
|----------------|-----------|
| Mapa interativo (marcadores, zoom, camadas) | **Maps JavaScript API** + `GoogleMapView` |
| Distâncias a pé no "Perto de Você" (ordenar/filtrar por rota real) | **Routes API** – `RouteMatrix.computeRouteMatrix` em `useGoogleDistanceMatrix` (biblioteca `routes` do Maps JavaScript API) |
| Endereços nos cards (reverse geocode) | **Geocoding API** (onde aplicável) |

Uma única **API key** (`VITE_GOOGLE_MAPS_API_KEY`) é usada para todas essas APIs.

---

## O que habilitar no GCP

1. No **Google Cloud Console** → **APIs & Services**:
   - **Maps JavaScript API** – mapa no navegador.
   - **Routes API** – distâncias/tempos por rota (a pé ou carro) para a lista "Perto de Você" (via `RouteMatrix.computeRouteMatrix`). Não use a API legada "Distance Matrix API".
   - **Geocoding API** – coordenadas → endereço (ex.: preencher endereços nos cards).

2. Em **Keys & Credentials**:
   - Crie uma **API key** (ou use uma existente).
   - Recomendado: restringir a chave:
     - **Application restriction:** “HTTP referrers” e colocar seus domínios (ex.: `https://seu-dominio.com/*`, `http://localhost:*`).
     - **API restriction:** “Restrict key” e marcar **Maps JavaScript API**, **Routes API** e **Geocoding API**.

3. **Billing:** A Routes API exige que o projeto tenha uma conta de faturamento ativa (mesmo dentro da cota gratuita). Em **Billing** do projeto, associe uma conta ou ative o free trial.

---

## Erro 403 (Forbidden) no ComputeRouteMatrix

Se no console do navegador aparecer `POST https://routes.googleapis.com/.../ComputeRouteMatrix 403 (Forbidden)` ou a página exibir "Routes API retornou acesso negado (403)", confira:

1. **Routes API habilitada** – Em **APIs & Services** → **Library**, busque "Routes API" e clique em **Enable** no projeto correto.
2. **Chave com permissão** – Em **Credentials** → sua API key → **API restrictions**, inclua **Routes API** (ou use "Don't restrict key" só para testar).
3. **Billing ativo** – Em **Billing**, o projeto deve estar vinculado a uma conta de faturamento. Sem isso, a Routes API retorna 403 mesmo com a API habilitada.

Depois de ajustar, recarregue a página "Perto de Você".

---

## Custo (referência)

- **Maps JavaScript API:** cota gratuita mensal (ex.: 28.500 carregamentos de mapa).
- **Routes API (Route Matrix):** cota gratuita mensal; uso moderado na página "Perto de Você" costuma ficar no free tier.
- O Console do GCP mostra uso e custos.

---

## Como testar

### 1. Teste manual (desenvolvimento, com chave)

1. Coloque uma API key válida no `.env`: `VITE_GOOGLE_MAPS_API_KEY=sua-chave`.
2. Rode `npm run dev` e acesse **Perto de Você** (menu ou `/servicos-proximos`).
3. Permita a localização (ou informe um CEP) e aguarde a lista carregar.
4. Verifique:
   - O **mapa** carrega (Google Maps, com marcadores).
   - Aparece brevemente **"Atualizando distâncias a pé…"** quando há serviços no raio.
   - Os cards mostram **distância** (ex.: "450 m a pé"); a lista está ordenada por distância real.
   - Aba **Mapa** mostra o mesmo mapa com os mesmos serviços.
5. No DevTools → **Rede**: devem aparecer chamadas a `maps.googleapis.com` (Distance Matrix e/ou Maps JS). **Não** deve haver chamadas a `api.mapbox.com`.

### 2. Teste manual (sem chave)

1. Comente ou remova `VITE_GOOGLE_MAPS_API_KEY` do `.env` e reinicie o dev.
2. Em **Perto de Você**:
   - O mapa pode aparecer como "Mapa não configurado" ou simulado (conforme o fluxo do app).
   - As distâncias na lista ficam **em linha reta** (Haversine); não aparece "Atualizando distâncias a pé…".
   - A página deve continuar funcionando (lista, filtros, ordenação).

### 3. Teste E2E

O teste **"deve buscar serviços próximos"** em `tests/e2e/evaluation.spec.ts` abre a página e valida que a lista carrega. Para rodar:

```bash
npm run test:e2e -- tests/e2e/evaluation.spec.ts -g "serviços próximos"
```

Ou todos os testes de avaliação:

```bash
npm run test:e2e -- tests/e2e/evaluation.spec.ts
```

(O E2E não exige chave do Google; a página deve carregar normalmente, possivelmente com mapa simulado ou mensagem de configuração.) Na primeira vez, instale os browsers do Playwright: `npm run playwright:install`.

### 4. Build de produção

```bash
npm run build
```

Deve concluir sem erros. Em produção, com `_VITE_GOOGLE_MAPS_API_KEY` configurada no trigger do Cloud Build, o mapa e as distâncias a pé funcionam após o deploy.

---

## Por que o mapa aparece no dev mas não após o build?

O Vite embute variáveis `VITE_*` **no momento do build**. Em desenvolvimento (`npm run dev`) o `.env` da raiz é lido e a chave está disponível. Quando você faz **build** (local ou CI):

- **Build local:** rode `npm run build` com o `.env` na raiz contendo `VITE_GOOGLE_MAPS_API_KEY=...`; a chave será incluída no bundle.
- **Build no Cloud Build / CI:** a variável precisa existir no ambiente de build. No GCP, configure a **substitution variable** no trigger (veja abaixo). Sem isso, o bundle é gerado com a chave vazia e o mapa mostra "Mapa não configurado".

---

## Deploy no GCP (Cloud Build)

A chave do Google Maps é injetada no **build** do front (Vite). No deploy automático:

1. **Cloud Build** → **Triggers** → abra o trigger do repositório (ex.: branch `dev`).
2. Em **Substitution variables** (ou "Variáveis de substituição"), adicione:
   - **Nome:** `_VITE_GOOGLE_MAPS_API_KEY`
   - **Valor:** sua API key (a mesma do `.env` local).
3. Salve o trigger. Nos próximos builds (push na branch configurada), a chave será passada ao Docker e o mapa e as distâncias a pé funcionarão em produção.

Não commite a chave no repositório; use só a substituição do trigger (ou Secret Manager, se preferir).
