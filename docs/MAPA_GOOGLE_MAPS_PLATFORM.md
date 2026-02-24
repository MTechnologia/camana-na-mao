# Usar Google Maps Platform em vez de Mapbox

O mapa atual ("Perto de Você") usa **Mapbox** (mapa + rotas). É possível trocar por **Google Maps Platform**, aproveitando a integração com o GCP (mesma conta, faturamento e controles).

---

## Vantagens

- **Uma conta:** mesmo projeto/organização do GCP.
- **Faturamento centralizado:** junto com Cloud Run, etc.
- **Controle de custo:** quotas e limites no Console do GCP.
- **APIs no mesmo lugar:** Keys & Credentials, APIs & Services.

---

## O que habilitar no GCP

1. No **Google Cloud Console** → **APIs & Services** (como no print):
   - **Maps JavaScript API** – mapa interativo no navegador (markers, zoom, etc.).
   - **Directions API** – rotas a pé, carro e bicicleta (equivalente ao que o Mapbox faz hoje).
   - **Geocoding API** – reverse geocode (coordenadas → endereço) para preencher endereços nos cards quando o cadastro não tem endereço (ex.: pontos de ônibus).

2. Em **Keys & Credentials**:
   - Crie uma **API key** (ou use uma existente).
   - Recomendado: restringir a chave:
     - **Application restriction:** “HTTP referrers” e colocar seus domínios (ex.: `https://seu-dominio.com/*`, `http://localhost:*`).
     - **API restriction:** “Restrict key” e marcar **Maps JavaScript API**, **Directions API** e **Geocoding API**.

---

## O que mudaria no código

| Hoje (Mapbox) | Com Google Maps |
|---------------|------------------|
| `mapbox-gl` + token `pk.*` | `@react-google-maps/api` ou Maps JavaScript API + API key |
| `useMapboxDirections` (Mapbox Directions API) | Google Directions API (ou serviço de rotas do Google) |
| `MapboxMap.tsx` | Novo componente `GoogleMapView.tsx` (mapa + marcadores + rotas) |
| `VITE_MAPBOX_ACCESS_TOKEN` | `VITE_GOOGLE_MAPS_API_KEY` |

Funcionalidades a manter:
- Mapa centralizado na localização do usuário.
- Marcadores por tipo de serviço (UBS, CEU, etc.).
- Clique no marcador → detalhes + “Traçar rota”.
- Rotas a pé / carro / bicicleta e desenho da rota no mapa.

---

## Custo (referência)

- **Maps JavaScript API:** cota gratuita mensal (ex.: 28.500 carregamentos de mapa).
- **Directions API:** cota gratuita mensal (ex.: 40.000 solicitações).
- Para tráfego moderado, costuma ficar dentro do free tier; o Console mostra uso e custos.

---

## Próximo passo

Se quiser seguir com a troca, o fluxo seria:

1. Você habilita **Maps JavaScript API** e **Directions API** e cria a **API key** (com as restrições acima).
2. No código: novo componente de mapa com Google Maps, hook de rotas usando Directions API, e `MapView` passando a usar a API key (ex.: `VITE_GOOGLE_MAPS_API_KEY`) em vez do token Mapbox.

Assim você deixa de depender do Mapbox e usa só o Google Maps Platform integrado ao GCP.

---

## Deploy no GCP (Cloud Build)

A chave do Google Maps é injetada no **build** do front (Vite). No deploy automático:

1. **Cloud Build** → **Triggers** → abra o trigger do repositório (ex.: branch `dev`).
2. Em **Substitution variables** (ou "Variáveis de substituição"), adicione:
   - **Nome:** `_VITE_GOOGLE_MAPS_API_KEY`
   - **Valor:** sua API key (a mesma do `.env` local).
3. Salve o trigger. Nos próximos builds (push na branch configurada), a chave será passada ao Docker e o mapa carregará em produção.

Não commite a chave no repositório; use só a substituição do trigger (ou Secret Manager, se preferir).
