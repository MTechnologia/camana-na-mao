# invite-user

Cria conta de usuário enviando convite por email. Atribui role inicial e
opcionalmente vincula a um gabinete de vereador.

## Endpoint

```
POST {SUPABASE_URL}/functions/v1/invite-user
```

## Auth

JWT do solicitante com permissão `users.invite` (apenas admin).

```
Authorization: Bearer <user_jwt>
```

## Payload

```json
{
  "email": "novo@exemplo.com",
  "role": "gestor",
  "fullName": "Maria da Silva",
  "councilMemberId": "abc-123"
}
```

| Campo | Tipo | Obrigatório | Valores |
|---|---|---|---|
| `email` | string | sim | email válido |
| `role` | string | sim | `admin` \| `gestor` \| `vereador` \| `assessor` \| `cidadao_engajado` \| `cidadao` |
| `fullName` | string | não | nome completo (vira metadata `full_name`) |
| `councilMemberId` | string | quando role é `vereador` ou `assessor` | id da `council_members_cache` |

## Response 200

```json
{
  "status": "success",
  "user_id": "uuid-do-novo-user",
  "email": "novo@exemplo.com",
  "role": "gestor"
}
```

## Response 409 — email já cadastrado

```json
{
  "error": "Este email já tem cadastro no sistema.",
  "raw": "User already registered"
}
```

## Response 429 — rate limit do SMTP

```json
{
  "error": "Limite de envio de emails atingido. Aguarde alguns minutos antes de tentar novamente, ou configure SMTP customizado no Supabase.",
  "raw": "email rate limit exceeded"
}
```

## Side-effects

1. `auth.users` recebe novo registro em estado `invited`.
2. Email de convite enviado via SMTP do Supabase (ou custom — recomendado SendGrid).
3. `user_roles` recebe linha com `(user_id, role)` (DELETE + INSERT para sobrescrever default `cidadao` que o trigger cria).
4. Se `councilMemberId` fornecido e role é `vereador`/`assessor`: insere em `vereador_user_links`.
5. Email aponta para `${ORIGIN}/completar-convite` onde o user define senha + nome + telefone.

## Variáveis de ambiente

```
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

`SITE_URL` é opcional — a função detecta o ambiente que disparou pelo header `Origin`. Se ausente, usa `SUPABASE_URL` como fallback.

## Exemplo curl

```bash
curl -X POST "$SUPABASE_URL/functions/v1/invite-user" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "novo.gestor@orgao.gov.br",
    "role": "gestor",
    "fullName": "Maria Silva"
  }'
```
