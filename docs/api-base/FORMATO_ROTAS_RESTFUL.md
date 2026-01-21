# Formato de Rotas RESTful - API Router

**Data:** Janeiro 2026  
**Formato:** Rotas RESTful padrão (sem query parameters)

---

## 🎯 Formato de Rotas

### Base URL

```
https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1/api-router
```

### Formato de Acesso

O API Router aceita **dois formatos** (ambos funcionam):

**Formato 1 (Recomendado - Mais curto):**
```
GET /functions/v1/api-router/{recurso}
GET /functions/v1/api-router/{recurso}/{id}
GET /functions/v1/api-router/{recurso}/{id}/{sub-recurso}
```

**Formato 2 (Compatibilidade - Com prefixo):**
```
GET /functions/v1/api-router/api/v1/{recurso}
GET /functions/v1/api-router/api/v1/{recurso}/{id}
```

> **Nota:** Ambos os formatos são equivalentes. O router remove automaticamente o prefixo `api/v1/` quando presente.

---

## ✅ Exemplos de Uso

### Vereadores (Implementado)

```bash
# Lista de vereadores (formato recomendado)
curl "https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1/api-router/vereadores"

# Lista de vereadores (formato com prefixo - também funciona)
curl "https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1/api-router/api/v1/vereadores"

# Com filtros (query parameters)
curl "https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1/api-router/vereadores?page=1&limit=10&search=Silva&partido=PT"

# Detalhes de vereador
curl "https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1/api-router/vereadores/joao-silva"
```

### Notícias (Planejado)

```bash
# Lista de notícias
curl "https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1/api-router/noticias"

# Com filtros
curl "https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1/api-router/noticias?page=1&limit=20&category=legislativo"

# Detalhes
curl "https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1/api-router/noticias/wp-12345"
```

### Projetos (Planejado)

```bash
# Lista de projetos
curl "https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1/api-router/projetos"

# Detalhes
curl "https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1/api-router/projetos/12345"

# Tramitação
curl "https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1/api-router/projetos/12345/tramitacao"

# Autores
curl "https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1/api-router/projetos/12345/autores"
```

---

## 📋 Padrões de Rotas

### Lista de Recursos

```
GET /api-router/{recurso}
```

**Query Parameters (opcionais):**
- `page` - Número da página
- `limit` - Itens por página
- `search` - Busca textual
- Outros filtros específicos do recurso

**Exemplo:**
```
GET /api-router/vereadores?page=1&limit=20&search=Silva
```

### Detalhes de Recurso

```
GET /api-router/{recurso}/{id}
```

**Exemplo:**
```
GET /api-router/vereadores/joao-silva
```

### Sub-recursos

```
GET /api-router/{recurso}/{id}/{sub-recurso}
```

**Exemplo:**
```
GET /api-router/projetos/12345/tramitacao
GET /api-router/projetos/12345/autores
```

---

## 🔧 Como Funciona

### 1. Parsing do Pathname

O `api-router` extrai o recurso do pathname:

```
/functions/v1/api-router/vereadores
                              ^^^^^^^^^^
                              Recurso extraído: "vereadores"
```

### 2. Matching de Rotas

O router compara o recurso extraído com as rotas registradas:

```typescript
// Rota registrada
registerRoute('GET', 'vereadores', getVereadores);

// Path recebido
/functions/v1/api-router/vereadores

// Match encontrado! ✅
```

### 3. Parâmetros de Rota

Para rotas com parâmetros:

```typescript
// Rota registrada
registerRoute('GET', 'vereadores/:id', getVereadorById);

// Path recebido
/functions/v1/api-router/vereadores/joao-silva

// Parâmetros extraídos
{ id: 'joao-silva' }
```

---

## 🚀 Vantagens do Formato RESTful

1. **URLs Limpas** - Mais fáceis de ler e entender
2. **Padrão REST** - Segue convenções RESTful
3. **SEO Friendly** - Melhor para indexação
4. **Cacheable** - URLs podem ser cacheadas facilmente
5. **Semântico** - O caminho indica claramente o recurso

---

## 📝 Comparação

### ❌ Formato Antigo (Query Parameters)

```
/functions/v1/api-router?path=vereadores&page=1&limit=10
```

**Desvantagens:**
- URL menos legível
- Não segue padrão REST
- Mais difícil de cachear

### ✅ Formato Novo (RESTful)

```
/functions/v1/api-router/vereadores?page=1&limit=10
```

**Vantagens:**
- URL limpa e semântica
- Segue padrão REST
- Fácil de cachear
- Melhor para documentação

---

## 🔍 Health Check

Acesse a rota base para ver informações do router:

```bash
curl "https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1/api-router"
```

**Resposta:**
```json
{
  "success": true,
  "message": "API Router está funcionando",
  "version": "1.0",
  "baseUrl": "https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1/api-router",
  "endpoints": {
    "vereadores": "/functions/v1/api-router/vereadores",
    "vereadorById": "/functions/v1/api-router/vereadores/:id"
  },
  "examples": {
    "list": "https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1/api-router/vereadores",
    "detail": "https://vjzkzsczlbtmrzewffdx.supabase.co/functions/v1/api-router/vereadores/joao-silva"
  }
}
```

---

## ⚠️ Notas Importantes

1. **Query Parameters** são usados apenas para filtros e paginação, não para o recurso
2. **Path Parameters** (como `:id`) são parte do caminho
3. **Sub-recursos** são suportados (ex: `/projetos/:id/tramitacao`)
4. **Case Sensitive** - Os caminhos são case-sensitive

---

**Última atualização:** Janeiro 2026
