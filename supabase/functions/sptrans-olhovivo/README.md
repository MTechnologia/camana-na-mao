# `sptrans-olhovivo`

Proxy autenticado para a [API Olho Vivo](https://www.sptrans.com.br/desenvolvedores/api-do-olho-vivo-guia-de-referencia/documentacao-api/) (SPTrans) via [gateway APILib](https://apilib.prefeitura.sp.gov.br/store/apis/info?name=OlhoVivo&version=v2.1&provider=admin&tag=SPTrans). O **Bearer token** da API Store fica apenas em **secret** no Supabase, nunca no app.

## Secrets (Supabase)

| Secret | Descrição |
|--------|-----------|
| `SPTRANS_OLHOVIVO_BEARER_TOKEN` | **Obrigatório.** Só o token (JWT/string) da API Store — **sem** o prefixo `Bearer ` (a função adiciona ao chamar o gateway). |
| `SPTRANS_OLHOVIVO_BASE_URL` | Opcional. Padrão: `https://gateway.apilib.prefeitura.sp.gov.br/sptrans/olhovivo/v2.1` |

Configurar no projeto:

```bash
npx supabase secrets set SPTRANS_OLHOVIVO_BEARER_TOKEN="seu_token_aqui"
```

(Em produção, usar o painel Supabase → Edge Functions → Secrets.)

## 404 no navegador / no `invoke`

O proxy **repassa o status HTTP** da API Olho Vivo. Um **404** na chamada a `.../functions/v1/sptrans-olhovivo` pode ser:

1. **Função não deployada** no projeto Supabase (mensagem típica do gateway: função não encontrada), ou  
2. **404 vindo do gateway SPTrans** (path/parâmetros incorretos, linha inexistente, etc.) — o primeiro pedido pode dar 200 e o seguinte 404 se mudarem os parâmetros.

O app trata esses casos com mensagens distintas quando consegue ler o corpo da resposta.

## Autenticação

Só utilizadores **com sessão válida** (JWT Supabase no header `Authorization: Bearer <access_token>`) podem chamar a função.

## Uso

### `GET`

Query obrigatória: `path` — caminho relativo à v2.1 (ex.: `Posicao`, `Posicao/Linha`, `Linha/Buscar`). Demais parâmetros são repassados à API SPTrans.

Exemplo (ajustar paths conforme [documentação oficial](https://www.sptrans.com.br/desenvolvedores/api-do-olho-vivo-guia-de-referencia/documentacao-api/)):

```http
GET /functions/v1/sptrans-olhovivo?path=Posicao&codigoLinha=33887
Authorization: Bearer <supabase_user_jwt>
apikey: <supabase_anon_key>
```

### `POST` (recomendado com `supabase.functions.invoke`)

Corpo JSON: `path` + parâmetros da API:

```json
{
  "path": "Posicao",
  "codigoLinha": "33887"
}
```

## Paths permitidos (primeiro segmento)

`Posicao`, `Linha`, `Parada`, `Previsao`, `Corredor`, `Empresa`, `KMZ`, `Integracao` — para reduzir superfície de ataque. Para ampliar, editar `ALLOWED_ROOTS` em `index.ts`.

### Parâmetros comuns (SPTrans v2.1)

- **`Linha/Buscar`**: query **`termosBusca`** (não `termos`) — ex.: número ou nome parcial da linha (`8000`, `Lapa`).
- **`Parada/Buscar`**: query **`termosBusca`**.
- **`Posicao/Linha`**: query **`codigoLinha`** (inteiro `cl` retornado pela busca de linha).
- **`Posicao`** (sem sufixo): visão agregada com **`l[]`**, cada item com **`c`** (texto, ex. `8500-10`), **`cl`** e **`vs`**. O app pode usar isto como recurso quando `Linha/Buscar` não devolve a linha — atenção: resposta maior.
- **`Previsao`**: query **`codigoParada`** + **`codigoLinha`** — previsão de chegada do veículo da linha ao ponto.
- **`Parada/Buscar`**: query **`termosBusca`** — pesquisa fonética de paradas (rua, nome, etc.); devolve **`cp`** (código da parada), **`np`**, **`ed`**, coordenadas.

No ecrã **Ônibus ao vivo**, o app pode atualizar posições automaticamente (~25 s) e consultar previsão após indicar o código da parada; evite intervalos muito curtos para não sobrecarregar a API.

## Teste em ecrã (app web, após deploy)

1. `npm run dev` e iniciar sessão no app.
2. Abrir **`/debug/sptrans-olhovivo`** (ex.: `http://localhost:5173/debug/sptrans-olhovivo`).
3. Preencher `path` (ex.: `Posicao`) e, se a doc SPTrans pedir, `codigoLinha` — **Chamar API**.

## Deploy no projeto Supabase (obrigatório para o app em produção / URL remota)

Se o app chamar `.../functions/v1/sptrans-olhovivo` e receber **404 Not Found**, a função ainda não foi publicada nesse projeto:

```bash
npx supabase login
npx supabase link --project-ref SEU_PROJECT_REF
npx supabase secrets set SPTRANS_OLHOVIVO_BEARER_TOKEN="seu_token_aqui"
npx supabase functions deploy sptrans-olhovivo
```

(`project_id` em `supabase/config.toml` deve corresponder ao projeto onde fazes o deploy.)

## Teste local (Edge Function)

```bash
npx supabase functions serve sptrans-olhovivo --env-file .env.local
```

Definir no `.env.local` (não commitar): `SPTRANS_OLHOVIVO_BEARER_TOKEN`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`.
