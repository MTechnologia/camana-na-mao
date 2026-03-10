# Inscrição em audiências – integração CMSP (Ninja Forms)

## Como funciona

- **Sempre no app:** o app grava a inscrição na tabela `audiencia_participacoes` (nosso banco) e o cidadão recebe o e-mail de confirmação que enviamos (SendGrid).
- **Inscrição oficial na CMSP:** quando a audiência tem `slug` e `ap_code` preenchidos no banco, o app **também** chama a API `POST .../api-router/audiencias/inscricao`, que envia os dados para o formulário Ninja Forms da CMSP. A Câmara pode enviar seu próprio e-mail de confirmação. Requer usuário logado.

Se a audiência **não** tiver `slug` e `ap_code`, a inscrição fica só no nosso app (e nosso e-mail); não há chamada ao sistema da Câmara.

## De onde vêm `slug` e `ap_code`?

- **Dados da audiência** (título, data, comissão, etc.) vêm da **API SPLEGIS** (splegisws.saopaulo.sp.leg.br), via Edge Function **fetch-audiencias**.
- **slug** e **ap_code** vêm do **site de inscrições da CMSP** (WordPress), onde cada audiência tem uma URL `/audiencia/{slug}/` e o formulário Ninja usa o `ap_code`. A API SPLEGIS não retorna esses campos.

A partir da integração na **fetch-audiencias**, sempre que a função roda (cron ou chamada manual), após o upsert dos dados SPLEGIS ela **busca até 2 páginas** da listagem [Audiências Públicas – CMSP](https://www.saopaulo.sp.leg.br/audienciaspublicas/audiencias/), extrai os slugs dos links e **preenche automaticamente** `slug` e `ap_code` nas audiências que ainda não têm e cuja data bate com a listagem. Assim, as audiências passam a ter inscrição oficial disponível sem passo manual, desde que existam na listagem da CMSP.

## Ativar o envio para o formulário oficial (e o e-mail)

É preciso que a audiência tenha **`slug`** e **`ap_code`** na tabela `audiencias`. Na maioria dos casos isso já é preenchido pela própria **fetch-audiencias** (ver acima). Se faltar (ex.: audiências antigas ou muitas páginas), use uma das opções abaixo.

### Opção 1: Rodar fetch-audiencias (já preenche slug/ap_code)

Invocar a Edge Function **fetch-audiencias** (com ou sem `?replace=1`) para trazer dados da API e, em seguida, preencher slug/ap_code a partir da listagem CMSP (2 páginas):

```bash
# Exemplo: chamar a função (ajuste a URL do projeto)
curl "https://<project-ref>.supabase.co/functions/v1/fetch-audiencias?replace=1" \
  -H "Authorization: Bearer <service_role_key>"
```

Ou pelo Dashboard: Edge Functions → fetch-audiencias → Invoke.

### Opção 2: Script de sincronização (mais páginas)

Para cobrir mais páginas da listagem (ex.: 20) ou fazer um backfill em massa, use o script:

```bash
node scripts/sync-audiencias-cmsp-slugs.mjs [páginas]
```

- **páginas** = quantas páginas da listagem buscar (default: 5). Aumente (ex.: 20) para cobrir mais audiências antigas.
- Requer no `.env`: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

### Opção 3: Preencher manualmente no banco

1. **`slug`** – parte da URL da audiência no site (ex.: `fin02-26-02-2026` em `.../audiencia/fin02-26-02-2026/`).
2. **`ap_code`** – código no formulário Ninja (ex.: `FIN02-26-02-2026`; costuma ser o slug com a primeira parte em maiúsculas).

No Supabase (SQL Editor), para **uma audiência específica** (ex.: Comissão de Finanças, fev/2026):

```sql
-- Exemplo: audiência "Comissão de Finanças e Orçamento" / Metas Fiscais (26 ou 25 fev 2026)
UPDATE public.audiencias
SET slug = 'fin02-26-02-2026',
    ap_code = 'FIN02-26-02-2026'
WHERE (titulo ILIKE '%Finanças%' OR tema ILIKE '%Finanças%')
  AND data >= '2026-02-01' AND data <= '2026-02-28';
```

Ou por UUID (pegue o id na URL ao abrir os detalhes da audiência):

```sql
UPDATE public.audiencias
SET slug = 'fin02-26-02-2026',
    ap_code = 'FIN02-26-02-2026'
WHERE id = 'uuid-da-audiencia';
```

### Deploy do backend

Para a inscrição oficial funcionar, a Edge Function do api-router precisa estar publicada:

```bash
supabase functions deploy api-router
```

## O endpoint admin-ajax.php está “funcional”?

O endpoint usado é:

`https://www.saopaulo.sp.leg.br/audienciaspublicas/wp-admin/admin-ajax.php`

**Abrir esse link no navegador (GET)** não é um teste válido:

- O WordPress/Ninja Forms espera um **POST** com parâmetros específicos: `action=nf_ajax_submit`, `security` (nonce), `formData` (JSON), além do header `Referer` da página da audiência.
- Ao acessar a URL em GET, o servidor costuma responder com **“0”** na tela — isso é o comportamento padrão do admin-ajax quando a requisição não é a esperada.
- Um **400** no console pode ser de outra requisição (ex.: a própria página da CMSP fazendo ajax) ou de um GET/POST sem os parâmetros corretos.

**Como verificar se está funcional:**

1. **Pelo app:** fazer uma inscrição em uma audiência que tenha `slug` e `ap_code` preenchidos; verificar se o usuário recebe o e-mail de confirmação da Câmara.
2. **Logs da Edge Function:** após a inscrição, ver nos logs da função `api-router` (ou da rota de audiências) se o POST para o admin-ajax retornou sucesso ou erro (status e corpo da resposta).

O backend do app primeiro faz GET na página da audiência (`.../audiencia/{slug}/`) para obter o nonce e o `form_id`, depois faz POST no admin-ajax com esses dados. Só esse fluxo completo indica se o endpoint está aceitando as inscrições.

## Resumo

| Situação                         | O que acontece |
|----------------------------------|----------------|
| Audiência **sem** `slug`/`ap_code` | Só grava no app; **não** envia para a CMSP; **não** há e-mail da Câmara. |
| Audiência **com** `slug` e `ap_code` | Grava no app **e** envia para o Ninja Forms; o cidadão **recebe** o e-mail de confirmação da Câmara. |
