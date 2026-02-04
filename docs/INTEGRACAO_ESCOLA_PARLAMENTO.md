# Integração da API WordPress da Escola do Parlamento

## 📋 Resumo

Esta integração traz todos os 649 itens (7 páginas) da API WordPress da Escola do Parlamento para o sistema, seguindo o mesmo padrão das outras integrações WordPress (notícias, agenda).

**URL da API:** `https://www.saopaulo.sp.leg.br/escoladoparlamento/wp-json/wp/v2/pages`

## 🏗️ Arquitetura

### Stack Utilizada

- **Frontend:** React + TypeScript + Vite
- **HTTP Client:** Fetch API nativo
- **Backend:** Supabase Edge Functions (Deno runtime)
- **Cache:** 
  - Memória (30 min TTL)
  - Banco de dados (tabela `escola_parlamento_cache`)
- **State Management:** React Query (`@tanstack/react-query`)

### Componentes Criados

1. **Edge Function:** `supabase/functions/fetch-escola-parlamento/index.ts`
   - Busca todas as 7 páginas da API WordPress
   - Transforma dados do formato WordPress para formato interno
   - Implementa cache em memória e banco de dados
   - Fallback: memory cache → database cache → erro

2. **Migration:** `supabase/migrations/20260202000002_escola_parlamento_cache.sql`
   - Cria tabela `escola_parlamento_cache`
   - Índices para performance
   - RLS policies (público pode ler)

3. **Hook Frontend:** `src/hooks/useEscolaParlamento.ts`
   - `useEscolaParlamento()` - Busca todos os itens
   - `useEscolaParlamentoItem(id)` - Busca item específico
   - `useEscolaParlamentoByCategory(category)` - Filtra por categoria
   - `useEscolaParlamentoCursos()` - Apenas cursos
   - `useEscolaParlamentoEventos()` - Apenas eventos

## 🚀 Como Aplicar

### 1. Aplicar Migration

```bash
# Via Supabase Dashboard
# 1. Acesse SQL Editor
# 2. Execute o conteúdo de: supabase/migrations/20260202000002_escola_parlamento_cache.sql

# Ou via CLI
supabase db push
```

### 2. Configurar Edge Function

A configuração já está adicionada em `supabase/config.toml`:

```toml
[functions.fetch-escola-parlamento]
verify_jwt = false
```

### 3. Deploy da Edge Function

```bash
# Deploy da função
supabase functions deploy fetch-escola-parlamento

# Ou deploy de todas as funções
supabase functions deploy
```

### 4. Testar a Integração

```typescript
// No frontend
import { useEscolaParlamento } from '@/hooks/useEscolaParlamento';

function MyComponent() {
  const { data: items, isLoading, error } = useEscolaParlamento();
  
  if (isLoading) return <div>Carregando...</div>;
  if (error) return <div>Erro: {error.message}</div>;
  
  return (
    <div>
      <p>Total de itens: {items?.length}</p>
      {items?.map(item => (
        <div key={item.id}>
          <h3>{item.title}</h3>
          <p>{item.excerpt}</p>
        </div>
      ))}
    </div>
  );
}
```

## 📊 Estrutura de Dados

### Interface `EscolaParlamentoItem`

```typescript
interface EscolaParlamentoItem {
  id: string;              // "ep-{wp_id}"
  wp_id: number;           // ID original do WordPress
  title: string;            // Título (HTML removido)
  slug: string;            // Slug da URL
  content: string;          // Conteúdo completo (HTML)
  excerpt: string;          // Resumo (300 chars, HTML removido)
  link: string;            // URL completa
  date: string;            // Data de criação (ISO)
  modified: string;         // Data de modificação (ISO)
  parent: number | null;    // ID do parent (hierarquia)
  menu_order: number;       // Ordem no menu
  imageUrl: string | null; // URL da imagem destacada
  category: string;         // 'curso' | 'evento' | 'material' | 'inscricao' | 'geral'
  status: string;          // Status do post
}
```

### Categorias Automáticas

A categoria é determinada automaticamente baseada em:
- **Slug:** palavras-chave como "curso", "evento", "material"
- **Conteúdo:** análise do texto para identificar tipo

## 🔄 Fluxo de Dados

```
1. Frontend chama useEscolaParlamento()
   ↓
2. React Query verifica cache local (30 min)
   ↓
3. Se não houver cache, chama Edge Function
   ↓
4. Edge Function verifica cache em memória (30 min)
   ↓
5. Se não houver, busca da API WordPress (7 páginas)
   ↓
6. Transforma e armazena em:
   - Cache em memória
   - Banco de dados (background)
   ↓
7. Retorna dados para frontend
```

## 📝 Paginação da API WordPress

A Edge Function busca automaticamente todas as páginas:

```typescript
// Loop através de todas as páginas
let page = 1;
let totalPages = 1;

while (hasMore) {
  const url = `${WP_API_BASE}?per_page=100&page=${page}&orderby=modified&order=desc&_embed`;
  const response = await fetch(url);
  
  // Lê total de páginas do header
  totalPages = parseInt(response.headers.get('X-WP-TotalPages'), 10);
  
  const pages = await response.json();
  allPages.push(...pages.map(transformPage));
  
  if (page >= totalPages) break;
  page++;
  
  // Delay para evitar rate limiting
  await new Promise(resolve => setTimeout(resolve, 200));
}
```

## 🎯 Próximos Passos

### Integrar na Página EscolaParlamento

Atualizar `src/pages/institucional/EscolaParlamento.tsx` para:

1. **Usar dados reais** ao invés de `mockCourses`
2. **Filtrar por categoria** para mostrar apenas cursos
3. **Implementar busca/filtros** se necessário
4. **Adicionar paginação** no frontend se houver muitos itens

### Exemplo de Integração

```typescript
import { useEscolaParlamentoCursos } from '@/hooks/useEscolaParlamento';

const EscolaParlamento = () => {
  const { data: cursos, isLoading } = useEscolaParlamentoCursos();
  
  if (isLoading) return <div>Carregando cursos...</div>;
  
  return (
    <div>
      {cursos?.map(curso => (
        <Card key={curso.id}>
          <h3>{curso.title}</h3>
          <p>{curso.excerpt}</p>
          <Button onClick={() => window.open(curso.link)}>
            Ver mais
          </Button>
        </Card>
      ))}
    </div>
  );
};
```

## 🔧 Troubleshooting

### Erro: "relation 'escola_parlamento_cache' does not exist"

**Solução:** A migration não foi aplicada. Execute a migration no Supabase.

### Erro: "Edge Function returned a non-2xx status code"

**Solução:** 
1. Verifique se a Edge Function foi deployada
2. Verifique os logs: `supabase functions logs fetch-escola-parlamento`
3. Verifique se a URL da API WordPress está acessível

### Dados não atualizando

**Solução:**
- O cache é de 30 minutos. Aguarde ou limpe o cache do React Query
- Verifique se a Edge Function está buscando da API (veja logs)

### Rate Limiting da API WordPress

**Solução:**
- A Edge Function já implementa delay de 200ms entre páginas
- Se necessário, aumentar o delay ou implementar retry logic

## 📚 Referências

- [WordPress REST API Documentation](https://developer.wordpress.org/rest-api/)
- [React Query Documentation](https://tanstack.com/query/latest)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
