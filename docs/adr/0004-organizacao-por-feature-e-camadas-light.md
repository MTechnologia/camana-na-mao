# ADR-0004: Organização por Feature + camadas “light” (UI/Domain/Data/Infra)

- **Status**: Aceito
- **Data**: 2026-01-13

## Contexto

O projeto tem muitas áreas funcionais (admin, IA, mapas, cadastros, etc.) e precisa suportar evolução paralela (web + mobile).

## Decisão

Adotar organização **feature-based** com separação de responsabilidades em camadas “light”:

- **UI**: componentes, páginas/telas, navegação
- **Domain**: tipos, regras, validações, casos de uso
- **Data**: serviços/repositórios, mapeamentos, cache, orquestração
- **Infra**: integrações (Supabase, Mapbox, etc.), adapters e IO

## Alternativas consideradas

- Organização por tipo (components/hooks/services globais)
- MVVM “puro”
- Clean Architecture “completa” (mais formal/cerimonial)

## Consequências

### Positivas

- Reduz acoplamento e facilita manutenção por domínio
- Ajuda a migração gradual do mobile para nativo, reaproveitando regras e contratos
- Escala melhor com mais pessoas no time

### Negativas / Trade-offs

- Exige disciplina para não “vazar” infra para UI
- Alguns arquivos “shared” precisam de curadoria para não virar depósito

### Próximos passos

- Documentar estrutura alvo de pastas (web e mobile) e convenções de nomenclatura
- Definir critérios claros para o que entra em `shared/` versus dentro de `features/`

