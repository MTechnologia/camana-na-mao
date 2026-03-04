# Integração Google Directions (passo a passo no chat)

O fluxo **"como chegar"** do ai-orchestrator pode exibir o **passo a passo** das conduções (ônibus/metrô) diretamente no chat quando a **Google Directions API** está configurada. Caso contrário, apenas o link para o Google Maps é enviado.

## O que foi implementado

- **`lib.fetchGoogleDirectionsTransit(origin, destination, apiKey)`** em `supabase/functions/ai-orchestrator/lib.ts`: chama a API Directions com `mode=transit` e `language=pt-BR`, e devolve uma lista de passos em texto (ex.: "Pegue **123** na parada *X*, desça em *Y* (5 paradas)").
- No **index.ts**, nos três pontos em que a rota é montada (dois endereços, GPS → destino, endereço cadastrado → destino), se a variável **`GOOGLE_MAPS_API_KEY`** estiver definida, a função é chamada e o passo a passo é exibido **acima** da mensagem com o link do Maps.

## Como ativar

### 1. Google Cloud

1. Acesse [Google Cloud Console](https://console.cloud.google.com/).
2. Crie ou selecione um projeto.
3. Ative a **Directions API**: em "APIs e serviços" → "Biblioteca", busque por "Directions API" e ative.
4. Em "APIs e serviços" → "Credenciais", crie uma **Chave de API**.
5. (Recomendado) Restrinja a chave:
   - Por API: permitir apenas "Directions API".
   - Por aplicação: use restrição por IP se souber os IPs do Supabase Edge (ou deixe sem restrição de app para testes).

### 2. Supabase (Edge Function)

Defina o secret da função **ai-orchestrator**:

```bash
supabase secrets set GOOGLE_MAPS_API_KEY=sua_chave_aqui
```

Ou no dashboard: **Project Settings** → **Edge Functions** → **Secrets** → adicione `GOOGLE_MAPS_API_KEY`.

Depois, faça o deploy da função para que ela carregue o novo secret:

```bash
supabase functions deploy ai-orchestrator
```

### 3. Teste

No app, peça uma rota (ex.: "como chegar na Câmara Municipal de São Paulo") e informe origem por endereço, GPS ou endereço cadastrado. Se a chave estiver correta e a Directions API ativada, a resposta deve incluir um bloco **"Passo a passo"** com as conduções antes do link do Maps.

## Custos e limites

- A [Directions API](https://developers.google.com/maps/documentation/directions/usage-and-billing) é cobrada por solicitação (há crédito gratuito mensal no Google Cloud).
- Sem `GOOGLE_MAPS_API_KEY` configurada, o comportamento permanece o de sempre: só o link do Google Maps é enviado (sem chamada à API).

## Resumo

| Item | Valor |
|------|--------|
| Variável | `GOOGLE_MAPS_API_KEY` |
| Onde definir | Supabase Edge Function secrets (ai-orchestrator) |
| API no GCP | Directions API |
| Comportamento | Se definida: passo a passo no chat + link. Se não: apenas link. |
