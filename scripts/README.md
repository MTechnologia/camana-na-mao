# Orphan Routes Detector

Script de análise automática para detectar rotas definidas no App.tsx que não possuem links de navegação no código.

## Uso Local

```bash
# Análise básica (apenas relatório)
node scripts/detect-orphan-routes.mjs

# Modo estrito (falha se encontrar rotas órfãs)
node scripts/detect-orphan-routes.mjs --strict

# Saída em JSON
node scripts/detect-orphan-routes.mjs --json

# Combinado
node scripts/detect-orphan-routes.mjs --strict --json
```

## Códigos de Saída

| Código | Significado |
|--------|-------------|
| 0 | Nenhuma rota órfã encontrada (ou --strict não habilitado) |
| 1 | Rotas órfãs encontradas (com --strict) |
| 2 | Erro durante análise |

## Integração com CI/CD

### GitHub Actions

Adicione ao seu workflow (`.github/workflows/ci.yml`):

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint-routes:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          
      - name: Check for orphan routes
        run: node scripts/detect-orphan-routes.mjs --strict
```

### Como Parte do Workflow de Build

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Check orphan routes
        run: node scripts/detect-orphan-routes.mjs --strict
        
      - name: Lint
        run: npm run lint
        
      - name: Build
        run: npm run build
```

## Exemplo de Saída

```
🔍 Orphan Routes Analysis Report
══════════════════════════════════════════════════
📅 2025-01-15T10:30:00.000Z
📊 Total routes analyzed: 45

✅ No orphan routes detected!

📎 Redirect routes (1):
  ↪️  /docs

✅ Healthy routes with navigation: 44
══════════════════════════════════════════════════
```

## Configuração

O script pode ser configurado editando as constantes no início do arquivo:

- `ignoredPatterns`: Padrões de rota a ignorar (regex)
- `searchDirs`: Diretórios para buscar referências
- `extensions`: Extensões de arquivo a analisar
- `referencePatterns`: Padrões para detectar referências de navegação

## Adicionando ao package.json

Para adicionar como script npm, peça ao desenvolvedor para adicionar:

```json
{
  "scripts": {
    "lint:routes": "node scripts/detect-orphan-routes.mjs",
    "lint:routes:strict": "node scripts/detect-orphan-routes.mjs --strict"
  }
}
```
