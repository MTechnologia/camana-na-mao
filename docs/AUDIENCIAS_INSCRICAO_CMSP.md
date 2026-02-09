# Inscrição em audiências – integração CMSP (Ninja Forms)

## Como funciona

- **Só no app:** o app sempre grava a inscrição na tabela `audiencia_participacoes` (nosso banco).
- **Inscrição oficial + e-mail:** quando a audiência tem `slug` e `ap_code` preenchidos no banco, o backend chama o formulário Ninja Forms da CMSP e o cidadão recebe o e-mail de confirmação da Câmara.

Se você se inscreveu e **não recebeu o e-mail**, é porque essa audiência ainda não tem `slug` e `ap_code` configurados.

## Ativar o envio para o formulário oficial (e o e-mail)

É preciso preencher, para cada audiência que tem formulário no site da CMSP:

1. **`slug`** – parte da URL da audiência no site:
   - Exemplo: URL `https://www.saopaulo.sp.leg.br/audienciaspublicas/audiencia/financas-26-02-2026/`
   - `slug` = `financas-26-02-2026`

2. **`ap_code`** – código usado no formulário Ninja (ex.: `FIN02-26-02-2026`). Costuma aparecer na página ou no formulário da audiência no site da CMSP.

### Como preencher no banco

No Supabase (SQL Editor ou via script), por exemplo:

```sql
UPDATE public.audiencias
SET slug = 'financas-26-02-2026',
    ap_code = 'FIN02-26-02-2026'
WHERE id = 'uuid-da-audiencia';
```

Ou atualizar em lote se você tiver uma planilha/JSON com `id`, `slug` e `ap_code` de cada audiência.

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
