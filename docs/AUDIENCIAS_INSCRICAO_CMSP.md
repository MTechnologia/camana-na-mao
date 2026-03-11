# Inscrição em audiências – integração CMSP (Ninja Forms)

## Como funciona

- **Sempre no app:** o app grava a inscrição na tabela `audiencia_participacoes` (nosso banco) e o cidadão recebe o e-mail de confirmação que enviamos (SendGrid).
- **Inscrição oficial na CMSP:** quando a audiência tem `slug` e `ap_code` preenchidos no banco, o app **também** chama a API `POST .../api-router/audiencias/inscricao`, que envia os dados para o formulário Ninja Forms da CMSP. A Câmara pode enviar seu próprio e-mail de confirmação. Requer usuário logado.

Se a audiência **não** tiver `slug` e `ap_code`, a inscrição fica só no nosso app (e nosso e-mail); não há chamada ao sistema da Câmara.

## De onde vêm `slug` e `ap_code`?

- **Dados da audiência** (título, data, comissão, etc.) vêm da **API SPLEGIS** (splegisws.saopaulo.sp.leg.br), via Edge Function **fetch-audiencias**.
- **slug** e **ap_code** vêm do **site de inscrições da CMSP** (WordPress), onde cada audiência tem uma URL `/audiencia/{slug}/` e o formulário Ninja usa o `ap_code`. A API SPLEGIS não retorna esses campos.

A partir da integração na **fetch-audiencias**, sempre que a função roda (cron ou chamada manual), após o upsert dos dados SPLEGIS ela **busca até 2 páginas** da listagem [Audiências Públicas – CMSP](https://www.saopaulo.sp.leg.br/audienciaspublicas/audiencias/), extrai os slugs dos links e **preenche automaticamente** `slug` e `ap_code` nas audiências que ainda não têm e cuja data bate com a listagem. Assim, as audiências passam a ter inscrição oficial disponível sem passo manual, desde que existam na listagem da CMSP.

**Inscrições encerradas no app:** o campo `inscricoes_abertas` vem da API SPLEGIS (e pode não refletir o prazo da CMSP). Por isso, na mesma **fetch-audiencias**, após preencher slug/ap_code, a função **abre a página de cada audiência** (até 20 por execução, com data ≥ hoje) no site da CMSP. Se a página contiver “Inscrições encerradas” (ou texto equivalente), a função grava `inscricoes_abertas = false` naquela audiência. Na próxima vez que o app carregar a lista ou o detalhe, o usuário verá que as inscrições foram encerradas (botão desabilitado ou mensagem adequada), sem precisar tentar inscrever para descobrir.

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

**Inscrições encerradas:** quando a CMSP encerra o prazo (ex.: “Inscrições encerradas” na página), o formulário é removido ou desativado e o POST pode retornar “Formulário não existe”. O backend agora **detecta** no HTML da página trechos como “inscrições encerradas” ou “inscrições … foram encerradas” e devolve de imediato a mensagem “As inscrições para esta audiência já foram encerradas…”, sem tentar o POST, orientando o cidadão a comparecer presencialmente ou enviar manifestação por escrito pelo site da Câmara.

## Por que no navegador funciona e no app não?

Se no **site da CMSP** a inscrição retorna **200 OK** e no **app** o log mostra *"O formulário da Câmara está temporariamente indisponível"*, a diferença costuma ser:

1. **Sessão / cookies** – O WordPress/Ninja Forms pode exigir a **sessão do navegador** (cookies como `wordpress_test_cookie`, sessão de usuário, etc.) para aceitar o POST no `admin-ajax.php`. A Edge Function faz a requisição **sem** esses cookies, então o servidor da CMSP pode rejeitar (por exemplo com mensagem de “formulário não existe” ou “form not found”), que o app traduz para “formulário temporariamente indisponível”.

2. **Nonce de uso único** – O nonce extraído da página pode ser válido só para a **mesma “sessão”** (IP, cookies, etc.). Usar esse nonce em outra requisição (servidor, sem cookies) pode ser invalidado pelo Ninja/WordPress.

3. **Validação de origem** – O site pode checar `Origin`/`Referer` e aceitar só requisições que pareçam vir do próprio domínio. O app já envia `Referer` e `Origin: https://www.saopaulo.sp.leg.br`; mesmo assim, sem os cookies da sessão, a CMSP pode recusar.

**O que fazer:**

- Nos **logs do api-router** (e da inscrição Ninja), o app agora registra o **erro bruto** retornado pela CMSP (`[inscricao-ninja] CMSP respondeu com errors (raw): ...`). Vale conferir esse trecho no log para ver a mensagem exata (ex.: “form does not exist”, “nonce inválido”, etc.).
- Enquanto a CMSP depender de sessão/cookies no `admin-ajax.php`, a inscrição **pelo app** pode continuar falhando. Nesse caso, o fluxo atual já orienta o cidadão a se inscrever **diretamente no site da Câmara** (link na audiência) quando a integração retorna erro.

## Como inspecionar a página para descobrir form_id e field IDs

Quando a CMSP responde “Formulário não existe” mesmo com o fallback para `form_id=2`, vale conferir **na própria página da audiência** qual `form_id` e quais **IDs dos campos** o Ninja Forms está usando. Assim dá para alinhar o backend com o que o site espera.

### Método 1: Aba Rede (Network) – mais direto

1. Abra a página da audiência no navegador, por exemplo:
   `https://www.saopaulo.sp.leg.br/audienciaspublicas/audiencia/saude07-11-03-2026/`
2. Abra as **Ferramentas do desenvolvedor** (F12) e vá na aba **Rede** (Network).
3. Marque **Preservar log** (Preserve log), se existir.
4. No formulário da página, preencha **nome**, **e-mail**, **telefone**, aceite o termo (LGPD) e clique em **Enviar** / **Inscrever-se**.
5. Na lista de requisições, localize um **POST** para `admin-ajax.php` (pode filtrar por “ajax” ou “admin”).
6. Clique nessa requisição e abra a seção **Payload** (ou **Corpo** / **Request**). Você deve ver algo como:
   - `action`: `nf_ajax_submit` (ou similar)
   - `security`: um valor alfanumérico (nonce)
   - `formData`: uma **string JSON**
7. Copie o valor de **formData** (ou use “Copy value”) e cole em um editor. O conteúdo deve ser parecido com:
   ```json
   {"form_id":1,"fields":{"7":"Nome","9":"email@...","10":"(11) 99999-9999","19":"SAUDE07-11-03-2026","94":1}}
   ```
   - **`form_id`** é o número do formulário (ex.: `1` ou `2`).
   - **`fields`** é um objeto em que **as chaves são os IDs dos campos** (ex.: `7`, `9`, `10`, `19`, `94`) e os valores são o que você digitou.
   - No nosso código, usamos: **nome**, **email**, **telefone**, **apCode** (código da audiência, ex. SAUDE07-11-03-2026), **lgpd** (1 = aceito). Basta anotar qual ID numérico corresponde a cada um (comparando com os valores que você preencheu).

Anote o **form_id** e o mapeamento dos campos (ex.: nome=7, email=9, telefone=10, apCode=19, lgpd=94). Se for diferente do que está em `inscricao-ninja.ts` em `FIELD_IDS_BY_FORM`, podemos adicionar ou ajustar esse form na configuração.

### Método 2: Código-fonte da página (View Source)

1. Na página da audiência, **clique com o botão direito → Ver código-fonte da página** (ou Ctrl+U).
2. Use **Ctrl+F** para buscar:
   - **`form_id`** ou **`formID`** – aparece em trechos de JavaScript (ex.: `"form_id":1` ou `formID: "1"`).
   - **`ajaxNonce`** ou **`security`** – confirma o nonce que a página usa.
3. Para os **field IDs**, às vezes o Ninja Forms deixa no HTML atributos como `name="nf-field-7"` ou `data-id="7"` nos inputs. Busque por **`nf-field`** ou pelo nome do campo (ex.: “nome”, “email”) e veja o número no `name` ou em `data-id`.

Se a página usar um **form_id** ou conjunto de **field IDs** diferente do que temos hoje, anote e podemos adicionar em `FIELD_IDS_BY_FORM` (ou um novo form_id) em `supabase/functions/api/v1/audiencias/inscricao-ninja.ts`.

## Resumo

| Situação                         | O que acontece |
|----------------------------------|----------------|
| Audiência **sem** `slug`/`ap_code` | Só grava no app; **não** envia para a CMSP; **não** há e-mail da Câmara. |
| Audiência **com** `slug` e `ap_code` | Grava no app **e** envia para o Ninja Forms; o cidadão **recebe** o e-mail de confirmação da Câmara. |
