# Inscrição em audiências – integração CMSP (Ninja Forms)

## Como funciona

- **Só no app:** o app sempre grava a inscrição na tabela `audiencia_participacoes` (nosso banco).
- **Inscrição oficial + e-mail:** quando a audiência tem `slug` e `ap_code` preenchidos no banco, o backend chama o formulário Ninja Forms da CMSP e o cidadão recebe o e-mail de confirmação da Câmara.

Se você se inscreveu e **não recebeu o e-mail**, é porque essa audiência ainda não tem `slug` e `ap_code` configurados.

## Ativar o envio para o formulário oficial (e o e-mail)

É preciso preencher, para cada audiência que tem formulário no site da CMSP, os campos **`slug`** e **`ap_code`** na tabela `audiencias`.

### Opção 1: Sincronização automática (recomendado)

A listagem oficial está em [Audiências Públicas – CMSP](https://www.saopaulo.sp.leg.br/audienciaspublicas/audiencias/). Um script lê essa página, extrai os slugs dos links (`/audiencia/{slug}/`) e atualiza as audiências no nosso banco que batem por **data**.

```bash
node scripts/sync-audiencias-cmsp-slugs.mjs [páginas]
```

- **páginas** = quantas páginas da listagem buscar (default: 5). Aumente (ex.: 20) para cobrir mais audiências antigas.
- Requer no `.env`: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

Assim, sempre que rodar o seed (ou tiver audiências novas com a mesma data da CMSP), pode rodar esse script para preencher `slug` e `ap_code` em massa.

### Opção 2: Preencher manualmente no banco

1. **`slug`** – parte da URL da audiência no site (ex.: `fin02-26-02-2026` em `.../audiencia/fin02-26-02-2026/`).
2. **`ap_code`** – código no formulário Ninja (ex.: `FIN02-26-02-2026`; costuma ser o slug com a primeira parte em maiúsculas).

No Supabase (SQL Editor):

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

## Resumo

| Situação                         | O que acontece |
|----------------------------------|----------------|
| Audiência **sem** `slug`/`ap_code` | Só grava no app; **não** envia para a CMSP; **não** há e-mail da Câmara. |
| Audiência **com** `slug` e `ap_code` | Grava no app **e** envia para o Ninja Forms; o cidadão **recebe** o e-mail de confirmação da Câmara. |
