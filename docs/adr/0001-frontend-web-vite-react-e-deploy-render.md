# ADR-0001: Frontend Web (Vite/React) e deploy como Static Site no Render

- **Status**: Aceito
- **Data**: 2026-01-13

## Contexto

O projeto já possuía frontend em **React + Vite + TypeScript** (SPA), com necessidade de disponibilização pública para validação por stakeholders e para consumo pelo app mobile PoV.

## Decisão

- Manter o frontend como **SPA** em **React + Vite + TypeScript**
- Publicar no **Render** como **Static Site**:
  - Build: `bun run build`
  - Publish: `dist`
  - Reescrita de rotas (`/*` → `/index.html`) para suportar SPA routing

## Alternativas consideradas

- Hospedar em Vercel/Netlify
- Rodar como Web Service (Node) no Render
- Hospedar apenas via plataforma de prototipagem externa (descartado)

## Consequências

### Positivas

- URL pública estável para testes e demos
- Setup simples e barato (static hosting)
- Compatível com WebView no mobile

### Negativas / Trade-offs

- Como SPA, exige regra de rewrite para rotas internas
- Variáveis `VITE_*` precisam estar corretas no deploy (ex.: Supabase URL/Key)

### Próximos passos

- Formalizar variáveis por ambiente (dev/hml/prod)
- Adicionar monitoramento básico (analytics/logs) conforme necessidade

