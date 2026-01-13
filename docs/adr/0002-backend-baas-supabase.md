# ADR-0002: Backend como BaaS (Supabase)

- **Status**: Aceito
- **Data**: 2026-01-13

## Contexto

O repo possui estrutura `supabase/` com migrations e Edge Functions, e o frontend integra via `@supabase/supabase-js`.
Precisávamos de um backend viável para autenticação, banco, storage e funções serverless, com suporte a ambiente local para desenvolvimento.

## Decisão

Adotar **Supabase** como backend (BaaS), usando:

- **Auth** para autenticação/sessão
- **Postgres** como banco
- **Storage** para arquivos
- **Edge Functions** para APIs server-side específicas (ex.: orquestrador de IA)
- **Supabase CLI + Docker** para ambiente local (`supabase start`)

## Alternativas consideradas

- Backend próprio (NestJS/Express/FastAPI) + Postgres
- Firebase
- Appwrite

## Consequências

### Positivas

- Acelera entrega (Auth/DB/Storage prontos)
- Local dev reproduzível via Docker
- Edge Functions permitem lógica server-side sem manter servidor próprio

### Negativas / Trade-offs

- Dependência de plataforma (vendor)
- Precisamos de disciplina com variáveis/segredos (nunca commitar chaves sensíveis)
- Algumas integrações móveis podem exigir ajustes (CORS, redirects, deep links)

### Próximos passos

- Definir padrões de naming/versionamento das migrations
- Definir estratégia de ambientes (local/dev/hml/prod) e rotação de chaves

