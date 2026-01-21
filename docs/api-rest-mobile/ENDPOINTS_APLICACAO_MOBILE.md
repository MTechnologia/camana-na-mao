# Endpoints da CMSP - Guia para Aplicação Mobile

## 📱 Visão Geral

Este documento lista os endpoints disponíveis nas APIs da Câmara Municipal de São Paulo (CMSP) e suas aplicações práticas no desenvolvimento de um aplicativo mobile. As APIs estão organizadas em três sistemas principais: **SP LEG**, **SPLEGIS** e **SISGV**.

> **📌 Nota:** Este projeto também implementa uma **API REST própria** que funciona como proxy e padroniza as respostas. Para endpoints da nossa API, veja:
> - [IMPLEMENTACAO_STATUS.md](./IMPLEMENTACAO_STATUS.md) - Status da implementação
> - [GUIA_TESTES.md](./GUIA_TESTES.md) - Como testar nossa API
> - **Nossa API Base URL:** `https://vzkwkcypkfrpfhhsghwn.supabase.co/functions/v1/api/v1/`
> - **Exemplo:** `GET /api/v1/vereadores` - Lista de vereadores (com cache, rate limiting, paginação)

---

## 🎯 Nossa API REST (Recomendado)

### Endpoints Disponíveis

#### Vereadores

**Lista de Vereadores:**
```
GET https://vzkwkcypkfrpfhhsghwn.supabase.co/functions/v1/api/v1/vereadores
```

**Parâmetros:**
- `page` (number, default: 1) - Página
- `limit` (number, default: 20, max: 100) - Itens por página
- `search` (string, optional) - Busca por nome ou partido
- `partido` (string, optional) - Filtrar por partido
- `sort` (string, optional) - Campo para ordenação (ex: "name")
- `order` (string, optional) - Ordem: "asc" ou "desc"

**Detalhes de um Vereador:**
```
GET https://vzkwkcypkfrpfhhsghwn.supabase.co/functions/v1/api/v1/vereadores/:id
```

**Vantagens da nossa API:**
- ✅ Cache implementado (respostas mais rápidas)
- ✅ Rate limiting (proteção contra abuso)
- ✅ Paginação padronizada
- ✅ Validação de entrada
- ✅ Respostas padronizadas
- ✅ Headers informativos (X-RateLimit-*, X-Cache, etc.)

**Exemplo de uso:**
```typescript
// React Native / Expo
const fetchVereadores = async (page: number = 1) => {
  const response = await fetch(
    `https://vzkwkcypkfrpfhhsghwn.supabase.co/functions/v1/api/v1/vereadores?page=${page}&limit=20`
  );
  const result = await response.json();
  
  if (result.success) {
    return result.data; // Array de vereadores
  } else {
    throw new Error(result.error.message);
  }
};
```

**📖 Mais informações:** Veja [GUIA_TESTES.md](./GUIA_TESTES.md) para exemplos completos.

---

## 📚 APIs Externas (SP LEG, SPLEGIS, SISGV)

As APIs abaixo são as APIs originais da CMSP. Nossa API REST funciona como proxy e padroniza essas respostas. Para desenvolvimento mobile, **recomendamos usar nossa API REST** quando disponível.

---

## 🔗 Variáveis de Ambiente

```yaml
spleg: https://www.saopaulo.sp.leg.br/wp-json
splegis: https://splegisws.saopaulo.sp.leg.br
sisgv: https://sisgvconsulta.saopaulo.sp.leg.br
```

---

## 1. SP LEG - WordPress REST API

Base URL: `https://www.saopaulo.sp.leg.br/wp-json`

### 1.1 Agenda Cerimonial

**Endpoint:** `GET /wp/v2/agenda_cerimonial`

**Aplicação Mobile:**
- **Tela de Eventos e Cerimônias**: Exibir calendário de eventos oficiais da Câmara
- **Notificações Push**: Alertar usuários sobre eventos importantes
- **Filtros**: Permitir busca por data, tipo de evento, localização
- **Compartilhamento**: Compartilhar eventos específicos nas redes sociais

**Exemplo de Uso:**
```typescript
// React Native / Expo
const fetchAgendaCerimonial = async () => {
  const response = await fetch('https://www.saopaulo.sp.leg.br/wp-json/wp/v2/agenda_cerimonial');
  const eventos = await response.json();
  return eventos;
};
```

---

### 1.2 Vereadores

**Endpoint:** `GET /wp/v2/vereador`

**Aplicação Mobile:**
- **Lista de Vereadores**: Tela principal com grid/lista de todos os vereadores
- **Perfil do Vereador**: Detalhes completos (foto, biografia, contatos)
- **Busca e Filtros**: Buscar por nome, partido, região
- **Favoritos**: Permitir salvar vereadores favoritos localmente
- **Compartilhamento**: Compartilhar perfil de vereador

**Exemplo de Uso:**
```typescript
// Tela de Lista de Vereadores
const fetchVereadores = async () => {
  const response = await fetch('https://www.saopaulo.sp.leg.br/wp-json/wp/v2/vereador');
  const vereadores = await response.json();
  return vereadores;
};

// Tela de Detalhes
const fetchVereadorById = async (id: number) => {
  const response = await fetch(`https://www.saopaulo.sp.leg.br/wp-json/wp/v2/vereador/${id}`);
  return await response.json();
};
```

**Funcionalidades Sugeridas:**
- Cache local para offline
- Paginação infinita
- Pull-to-refresh
- Filtros por partido, região, comissões

---

### 1.3 Notícias

**Endpoint:** `GET /wp/v2/posts`

**Aplicação Mobile:**
- **Feed de Notícias**: Tela principal com notícias da Câmara
- **Detalhes da Notícia**: Visualização completa com imagens e texto formatado
- **Categorias**: Filtrar por categorias (sessões, projetos, eventos)
- **Busca**: Buscar notícias por palavras-chave
- **Compartilhamento**: Compartilhar notícias
- **Favoritos**: Salvar notícias para leitura posterior

**Exemplo de Uso:**
```typescript
// Feed de Notícias com Paginação
const fetchNoticias = async (page: number = 1, perPage: number = 10) => {
  const response = await fetch(
    `https://www.saopaulo.sp.leg.br/wp-json/wp/v2/posts?page=${page}&per_page=${perPage}`
  );
  return await response.json();
};

// Busca de Notícias
const buscarNoticias = async (termo: string) => {
  const response = await fetch(
    `https://www.saopaulo.sp.leg.br/wp-json/wp/v2/posts?search=${encodeURIComponent(termo)}`
  );
  return await response.json();
};
```

**Funcionalidades Sugeridas:**
- Cache com React Query / SWR
- Imagens otimizadas (lazy loading)
- Leitura offline
- Notificações para notícias importantes

---

## 2. SPLEGIS - Web Services Legislativos

Base URL: `https://splegisws.saopaulo.sp.leg.br`

### 2.1 Audiências Públicas

**Endpoint:** `GET /ws/ws2.asmx/AudienciasPublicasJSON`

**Parâmetros:**
- `dataInicial` (string): Data inicial no formato YYYY-MM-DD
- `dataFinal` (string): Data final no formato YYYY-MM-DD

**Aplicação Mobile:**
- **Calendário de Audiências**: Visualização em calendário mensal/semanal
- **Lista de Audiências**: Lista filtrada por período
- **Detalhes da Audiência**: Informações completas (local, horário, tema, participantes)
- **Notificações**: Alertar sobre audiências futuras
- **Participação**: Permitir que usuários marquem interesse em participar

**Exemplo de Uso:**
```typescript
// Buscar audiências do mês atual
const fetchAudenciasPublicas = async (dataInicial: string, dataFinal: string) => {
  const response = await fetch(
    `https://splegisws.saopaulo.sp.leg.br/ws/ws2.asmx/AudienciasPublicasJSON?dataInicial=${dataInicial}&dataFinal=${dataFinal}`
  );
  return await response.json();
};

// Uso prático
const hoje = new Date();
const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
const audiencias = await fetchAudenciasPublicas(
  inicioMes.toISOString().split('T')[0],
  fimMes.toISOString().split('T')[0]
);
```

---

### 2.2 Pautas de Sessões Plenárias

**Endpoint:** `GET /ws/ws2.asmx/PautasSessoesPlenariasJSON`

**Parâmetros:**
- `Ano` (string): Ano da sessão (ex: "2025")

**Aplicação Mobile:**
- **Agenda de Sessões**: Lista de todas as sessões plenárias do ano
- **Pauta da Sessão**: Itens que serão votados/discutidos
- **Histórico**: Acessar sessões anteriores
- **Notificações**: Alertar sobre sessões importantes
- **Acompanhamento**: Marcar sessões para acompanhar

**Exemplo de Uso:**
```typescript
const fetchPautasSessoes = async (ano: string) => {
  const response = await fetch(
    `https://splegisws.saopaulo.sp.leg.br/ws/ws2.asmx/PautasSessoesPlenariasJSON?Ano=${ano}`
  );
  return await response.json();
};
```

---

### 2.3 Pauta Estendida de Sessão Plenária

**Endpoint:** `GET /ws/ws2.asmx/PautaEstendidaSessaoPlenariaJSON`

**Parâmetros:**
- `chave` (string): Identificador da sessão (ex: "7805")

**Aplicação Mobile:**
- **Detalhes da Pauta**: Informações completas sobre cada item da pauta
- **Projetos em Votação**: Lista detalhada de projetos que serão votados
- **Contexto**: Histórico e tramitação de cada projeto
- **Compartilhamento**: Compartilhar itens específicos da pauta

**Exemplo de Uso:**
```typescript
const fetchPautaEstendida = async (chave: string) => {
  const response = await fetch(
    `https://splegisws.saopaulo.sp.leg.br/ws/ws2.asmx/PautaEstendidaSessaoPlenariaJSON?chave=${chave}`
  );
  return await response.json();
};
```

---

### 2.4 Projetos por Ano

**Endpoint:** `GET /ws/ws2.asmx/ProjetosPorAnoJSON`

**Parâmetros:**
- `Ano` (string): Ano dos projetos (ex: "2026")

**Aplicação Mobile:**
- **Lista de Projetos**: Todos os projetos do ano
- **Filtros Avançados**: Por tipo, status, autor, tema
- **Busca**: Buscar projetos por palavras-chave
- **Favoritos**: Salvar projetos de interesse
- **Acompanhamento**: Receber atualizações sobre projetos favoritos

**Exemplo de Uso:**
```typescript
const fetchProjetosPorAno = async (ano: string) => {
  const response = await fetch(
    `https://splegisws.saopaulo.sp.leg.br/ws/ws2.asmx/ProjetosPorAnoJSON?Ano=${ano}`
  );
  return await response.json();
};
```

---

### 2.5 Vereadores CMSP

**Endpoint:** `GET /ws/ws2.asmx/VereadoresCMSPJSON`

**Aplicação Mobile:**
- **Lista Completa de Vereadores**: Dados atualizados dos vereadores
- **Sincronização**: Comparar com dados do SP LEG para consistência
- **Informações Legislativas**: Dados específicos do sistema legislativo
- **Atualização Automática**: Sincronizar periodicamente

**Exemplo de Uso:**
```typescript
const fetchVereadoresCMSP = async () => {
  const response = await fetch(
    'https://splegisws.saopaulo.sp.leg.br/ws/ws2.asmx/VereadoresCMSPJSON'
  );
  return await response.json();
};
```

---

### 2.6 Resumo de Projeto

**Endpoint:** `GET /ws/ws2.asmx/ProjetoResumoJSON`

**Parâmetros:**
- `tipo` (string): Tipo do projeto (ex: "RDS")
- `ano` (string): Ano do projeto (ex: "2026")
- `numero` (string): Número do projeto (ex: "1")

**Aplicação Mobile:**
- **Detalhes do Projeto**: Tela de detalhes completa
- **Histórico de Tramitação**: Timeline visual da tramitação
- **Compartilhamento**: Compartilhar projeto específico
- **Favoritos**: Salvar para acompanhamento

**Exemplo de Uso:**
```typescript
const fetchProjetoResumo = async (tipo: string, ano: string, numero: string) => {
  const response = await fetch(
    `https://splegisws.saopaulo.sp.leg.br/ws/ws2.asmx/ProjetoResumoJSON?tipo=${tipo}&ano=${ano}&numero=${numero}`
  );
  return await response.json();
};
```

---

### 2.7 Matérias e Eventos

**Endpoint:** `GET /ws/ws2.asmx/MateriasEventosJSON`

**Parâmetros:**
- `dataPesquisa` (string): Data no formato YYYY-MM-DD (ex: "2026-01-14")

**Aplicação Mobile:**
- **Timeline Diária**: Eventos e matérias do dia
- **Calendário**: Navegar por datas e ver eventos
- **Notificações Diárias**: Resumo do dia pela manhã
- **Histórico**: Acessar dias anteriores

**Exemplo de Uso:**
```typescript
const fetchMateriasEventos = async (data: Date) => {
  const dataFormatada = data.toISOString().split('T')[0];
  const response = await fetch(
    `https://splegisws.saopaulo.sp.leg.br/ws/ws2.asmx/MateriasEventosJSON?dataPesquisa=${dataFormatada}`
  );
  return await response.json();
};
```

---

### 2.8 Autores de Projetos

**Endpoint:** `GET /ws/ws2.asmx/ProjetosAutoresJSON`

**Parâmetros:**
- `ano` (string): Ano do projeto
- `tipo` (string): Tipo do projeto
- `numero` (string): Número do projeto

**Aplicação Mobile:**
- **Perfil do Vereador**: Mostrar projetos de um vereador específico
- **Detalhes do Projeto**: Lista de autores e coautores
- **Estatísticas**: Número de projetos por vereador
- **Filtros**: Buscar projetos por autor

**Exemplo de Uso:**
```typescript
const fetchProjetosAutores = async (tipo: string, ano: string, numero: string) => {
  const response = await fetch(
    `https://splegisws.saopaulo.sp.leg.br/ws/ws2.asmx/ProjetosAutoresJSON?tipo=${tipo}&ano=${ano}&numero=${numero}`
  );
  return await response.json();
};
```

---

### 2.9 Promoventes CMSP

**Endpoint:** `GET /ws/ws2.asmx/PromoventesCMSPJSON`

**Aplicação Mobile:**
- **Lista de Promoventes**: Entidades que propõem projetos
- **Filtros**: Buscar por tipo de promovente
- **Estatísticas**: Projetos por promovente

---

### 2.10 Comissões CMSP

**Endpoint:** `GET /ws/ws2.asmx/ComissoesCMSPJSON`

**Aplicação Mobile:**
- **Lista de Comissões**: Todas as comissões da Câmara
- **Detalhes da Comissão**: Membros, reuniões, projetos em análise
- **Filtros**: Buscar vereadores por comissão
- **Agenda**: Próximas reuniões de comissões

---

### 2.11 Tipos de Matéria

**Endpoint:** `GET /ws/ws2.asmx/TiposDeMateriaJSON`

**Aplicação Mobile:**
- **Filtros**: Usar para filtrar projetos por tipo
- **Glossário**: Explicar cada tipo de matéria
- **Estatísticas**: Distribuição de projetos por tipo

---

### 2.12 Áreas de Tramitação

**Endpoint:** `GET /ws/ws2.asmx/AreasDeTramitacaoJSON`

**Aplicação Mobile:**
- **Filtros**: Filtrar projetos por área de tramitação
- **Timeline**: Mostrar onde o projeto está na tramitação
- **Status**: Indicar status atual do projeto

---

### 2.13 Catálogo de Assuntos

**Endpoint:** `GET /ws/ws2.asmx/CatalogoDeAssuntosJSON`

**Aplicação Mobile:**
- **Categorização**: Categorizar projetos por assunto
- **Busca Temática**: Buscar projetos por tema
- **Tags**: Sistema de tags para projetos
- **Navegação**: Navegar por assuntos

---

## 3. SISGV - Sistema de Gestão de Verba

Base URL: `https://sisgvconsulta.saopaulo.sp.leg.br`

**Nota:** Todos os endpoints do SISGV são `POST` com `Content-Type: application/x-www-form-urlencoded`

### 3.1 Créditos de Vereador

**Endpoint:** `POST /ws/Servicos.asmx/ObterCreditoVereadorJSON`

**Parâmetros (Body):**
- `ano` (string): Ano (ex: "2025")
- `mes` (string): Mês (ex: "1")

**Aplicação Mobile:**
- **Transparência**: Mostrar créditos/verbas de vereadores
- **Gráficos**: Visualização de gastos por vereador
- **Comparação**: Comparar verbas entre vereadores
- **Histórico**: Evolução dos créditos ao longo do tempo
- **Filtros**: Filtrar por período, vereador, tipo de crédito

**Exemplo de Uso:**
```typescript
const fetchCreditoVereador = async (ano: string, mes: string) => {
  const formData = new URLSearchParams();
  formData.append('ano', ano);
  formData.append('mes', mes);

  const response = await fetch(
    'https://sisgvconsulta.saopaulo.sp.leg.br/ws/Servicos.asmx/ObterCreditoVereadorJSON',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    }
  );
  return await response.json();
};
```

---

### 3.2 Débitos de Vereador

**Endpoint:** `POST /ws/Servicos.asmx/ObterDebitoVereadorJSON`

**Parâmetros (Body):**
- `ano` (string): Ano
- `mes` (string): Mês

**Aplicação Mobile:**
- **Transparência**: Mostrar débitos/gastos de vereadores
- **Gráficos**: Visualização de gastos detalhados
- **Análise**: Análise de padrões de gastos
- **Comparação**: Comparar gastos entre vereadores
- **Detalhamento**: Detalhar cada tipo de gasto

**Exemplo de Uso:**
```typescript
const fetchDebitoVereador = async (ano: string, mes: string) => {
  const formData = new URLSearchParams();
  formData.append('ano', ano);
  formData.append('mes', mes);

  const response = await fetch(
    'https://sisgvconsulta.saopaulo.sp.leg.br/ws/Servicos.asmx/ObterDebitoVereadorJSON',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    }
  );
  return await response.json();
};
```

---

### 3.3 Créditos de Liderança

**Endpoint:** `POST /ws/Servicos.asmx/ObterCreditoLiderancaJSON`

**Parâmetros (Body):**
- `ano` (string): Ano
- `mes` (string): Mês

**Aplicação Mobile:**
- **Transparência**: Verbas de lideranças partidárias
- **Comparação**: Comparar verbas entre partidos
- **Gráficos**: Visualização por partido

---

### 3.4 Débitos de Liderança

**Endpoint:** `POST /ws/Servicos.asmx/ObterDebitoLiderancaJSON`

**Parâmetros (Body):**
- `ano` (string): Ano
- `mes` (string): Mês

**Aplicação Mobile:**
- **Transparência**: Gastos de lideranças partidárias
- **Análise**: Análise de gastos por partido
- **Comparação**: Comparar eficiência de gastos

---

## 📱 Estrutura Sugerida para o App Mobile

### Telas Principais

1. **Home/Dashboard**
   - Resumo do dia (MateriasEventosJSON)
   - Notícias recentes (posts)
   - Próximas sessões (PautasSessoesPlenariasJSON)

2. **Vereadores**
   - Lista completa (VereadoresCMSPJSON, /wp/v2/vereador)
   - Perfil detalhado
   - Projetos do vereador (ProjetosAutoresJSON)
   - Gastos e verbas (SISGV endpoints)

3. **Projetos**
   - Lista por ano (ProjetosPorAnoJSON)
   - Detalhes (ProjetoResumoJSON)
   - Busca e filtros
   - Acompanhamento

4. **Sessões e Eventos**
   - Calendário de sessões (PautasSessoesPlenariasJSON)
   - Pautas detalhadas (PautaEstendidaSessaoPlenariaJSON)
   - Audiências públicas (AudienciasPublicasJSON)
   - Agenda cerimonial (agenda_cerimonial)

5. **Notícias**
   - Feed de notícias (posts)
   - Categorias e busca
   - Favoritos

6. **Transparência**
   - Gastos de vereadores (SISGV)
   - Gastos de lideranças (SISGV)
   - Gráficos e análises

7. **Busca**
   - Busca unificada
   - Filtros avançados
   - Histórico de buscas

---

## 🔧 Boas Práticas de Implementação

### 1. Cache e Offline (Implementação Robusta)

**Estratégia de Cache Multi-Camada:**

```typescript
// Exemplo com React Query e cache offline
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configuração global do QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutos
      gcTime: 30 * 60 * 1000, // 30 minutos (antigo cacheTime)
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Cache offline
      networkMode: 'offlineFirst',
    },
  },
});

// Hook para vereadores com cache offline
const useVereadores = () => {
  return useQuery({
    queryKey: ['vereadores'],
    queryFn: async () => {
      const response = await fetch(
        'https://vzkwkcypkfrpfhhsghwn.supabase.co/functions/v1/api/v1/vereadores',
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error?.message || 'Erro desconhecido');
      }
      
      // Salvar no AsyncStorage para offline
      await AsyncStorage.setItem(
        'cache:vereadores',
        JSON.stringify({
          data: result.data,
          timestamp: Date.now(),
        })
      );
      
      return result.data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutos
    gcTime: 60 * 60 * 1000, // 1 hora
    // Fallback para dados offline
    placeholderData: async () => {
      try {
        const cached = await AsyncStorage.getItem('cache:vereadores');
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          // Retornar cache se tiver menos de 1 hora
          if (Date.now() - timestamp < 60 * 60 * 1000) {
            return data;
          }
        }
      } catch (err) {
        console.error('Error reading cache:', err);
      }
      return undefined;
    },
  });
};
```

**Cache com Service Worker (Web):**

```typescript
// sw.js - Service Worker para cache de APIs
const CACHE_NAME = 'camara-api-v1';
const API_CACHE_TTL = {
  vereadores: 10 * 60 * 1000, // 10 minutos
  projetos: 60 * 60 * 1000, // 1 hora
  noticias: 30 * 60 * 1000, // 30 minutos
};

self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/v1/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(event.request);
        const cachedTime = cached?.headers.get('x-cached-time');
        
        if (cached && cachedTime) {
          const age = Date.now() - parseInt(cachedTime);
          const endpoint = event.request.url.split('/api/v1/')[1].split('/')[0];
          const ttl = API_CACHE_TTL[endpoint] || 5 * 60 * 1000;
          
          if (age < ttl) {
            return cached;
          }
        }
        
        // Buscar da rede
        try {
          const response = await fetch(event.request);
          if (response.ok) {
            const cloned = response.clone();
            cloned.headers.set('x-cached-time', Date.now().toString());
            cache.put(event.request, cloned);
          }
          return response;
        } catch (err) {
          // Retornar cache mesmo se estiver stale em caso de erro de rede
          if (cached) return cached;
          throw err;
        }
      })
    );
  }
});
```

### 2. Tratamento de Erros Robusto

```typescript
// Cliente de API com tratamento de erros completo
interface ApiError {
  code: string;
  message: string;
  details?: any;
  field?: string;
}

class ApiClient {
  private baseUrl: string;
  
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }
  
  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ success: true; data: T } | { success: false; error: ApiError }> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      // Verificar rate limiting
      const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
      if (rateLimitRemaining === '0') {
        const resetAt = parseInt(response.headers.get('X-RateLimit-Reset') || '0');
        return {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Limite de requisições excedido',
            details: { resetAt },
          },
        };
      }

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: data.error?.code || 'UNKNOWN_ERROR',
            message: data.error?.message || 'Erro desconhecido',
            details: data.error?.details,
            field: data.error?.field,
          },
        };
      }

      if (!data.success) {
        return {
          success: false,
          error: data.error || {
            code: 'API_ERROR',
            message: 'Erro na resposta da API',
          },
        };
      }

      return { success: true, data: data.data };
    } catch (error) {
      // Erro de rede
      if (error instanceof TypeError && error.message.includes('fetch')) {
        return {
          success: false,
          error: {
            code: 'NETWORK_ERROR',
            message: 'Erro de conexão. Verifique sua internet.',
          },
        };
      }

      // Erro de timeout
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          error: {
            code: 'TIMEOUT',
            message: 'A requisição demorou muito. Tente novamente.',
          },
        };
      }

      return {
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message: error instanceof Error ? error.message : 'Erro desconhecido',
        },
      };
    }
  }

  // Helper para retry automático
  async requestWithRetry<T>(
    endpoint: string,
    options: RequestInit = {},
    maxRetries: number = 3
  ): Promise<{ success: true; data: T } | { success: false; error: ApiError }> {
    let lastError: ApiError | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const result = await this.request<T>(endpoint, options);
      
      if (result.success) {
        return result;
      }

      lastError = result.error;

      // Não fazer retry para erros de cliente (4xx)
      if (['VALIDATION_ERROR', 'UNAUTHORIZED', 'FORBIDDEN', 'NOT_FOUND'].includes(result.error.code)) {
        return result;
      }

      // Aguardar antes de retry (exponential backoff)
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return { success: false, error: lastError! };
  }
}

// Uso no app
const apiClient = new ApiClient('https://vzkwkcypkfrpfhhsghwn.supabase.co/functions/v1/api/v1');

const fetchVereadores = async () => {
  const result = await apiClient.requestWithRetry<Vereador[]>('/vereadores');
  
  if (!result.success) {
    // Tratar erro baseado no código
    switch (result.error.code) {
      case 'RATE_LIMIT_EXCEEDED':
        // Mostrar mensagem e aguardar
        break;
      case 'NETWORK_ERROR':
        // Tentar usar cache offline
        break;
      case 'NOT_FOUND':
        // Mostrar mensagem de não encontrado
        break;
      default:
        // Erro genérico
    }
    throw new Error(result.error.message);
  }
  
  return result.data;
};
```

### 3. Paginação Robusta

```typescript
// Hook para paginação infinita com cache e otimizações
import { useInfiniteQuery } from '@tanstack/react-query';

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

const useInfiniteVereadores = (filters?: {
  partido?: string;
  search?: string;
}) => {
  return useInfiniteQuery({
    queryKey: ['vereadores', 'infinite', filters],
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams({
        page: pageParam.toString(),
        limit: '20',
        ...(filters?.partido && { partido: filters.partido }),
        ...(filters?.search && { search: filters.search }),
      });

      const response = await fetch(
        `https://vzkwkcypkfrpfhhsghwn.supabase.co/functions/v1/api/v1/vereadores?${params}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error?.message || 'Erro desconhecido');
      }
      
      return {
        data: result.data,
        pagination: result.pagination,
      } as PaginatedResponse<Vereador>;
    },
    getNextPageParam: (lastPage) => {
      return lastPage.pagination.hasNext 
        ? lastPage.pagination.page + 1 
        : undefined;
    },
    getPreviousPageParam: (firstPage) => {
      return firstPage.pagination.hasPrev 
        ? firstPage.pagination.page - 1 
        : undefined;
    },
    initialPageParam: 1,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 30 * 60 * 1000, // 30 minutos
  });
};

// Hook para paginação tradicional (com controles de página)
const usePaginatedVereadores = (
  page: number = 1,
  limit: number = 20,
  filters?: { partido?: string; search?: string }
) => {
  return useQuery({
    queryKey: ['vereadores', 'paginated', page, limit, filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(filters?.partido && { partido: filters.partido }),
        ...(filters?.search && { search: filters.search }),
      });

      const response = await fetch(
        `https://vzkwkcypkfrpfhhsghwn.supabase.co/functions/v1/api/v1/vereadores?${params}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error?.message || 'Erro desconhecido');
      }
      
      return {
        data: result.data,
        pagination: result.pagination,
      } as PaginatedResponse<Vereador>;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};
```

### 4. Notificações Push

- Configurar notificações para:
  - Novas sessões importantes
  - Projetos favoritos atualizados
  - Audiências públicas próximas
  - Notícias importantes

### 5. Performance

- Implementar lazy loading de imagens
- Usar virtualização para listas longas
- Implementar debounce em buscas
- Cache de imagens
- Compressão de dados

---

## 📊 Resumo de Endpoints por Funcionalidade

| Funcionalidade | Endpoints Principais |
|---------------|---------------------|
| **Lista de Vereadores** | `/wp/v2/vereador`, `VereadoresCMSPJSON` |
| **Perfil de Vereador** | `/wp/v2/vereador/{id}`, `ProjetosAutoresJSON` |
| **Projetos** | `ProjetosPorAnoJSON`, `ProjetoResumoJSON` |
| **Sessões** | `PautasSessoesPlenariasJSON`, `PautaEstendidaSessaoPlenariaJSON` |
| **Eventos** | `AudienciasPublicasJSON`, `/wp/v2/agenda_cerimonial` |
| **Notícias** | `/wp/v2/posts` |
| **Transparência** | `ObterCreditoVereadorJSON`, `ObterDebitoVereadorJSON` |
| **Busca e Filtros** | Todos os endpoints com parâmetros de filtro |

---

## 🔐 Considerações de Segurança

### 1. Autenticação e Autorização

**Implementação no Mobile:**
```typescript
// Gerenciamento de tokens com refresh automático
import AsyncStorage from '@react-native-async-storage/async-storage';

class AuthManager {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  async initialize() {
    this.accessToken = await AsyncStorage.getItem('access_token');
    this.refreshToken = await AsyncStorage.getItem('refresh_token');
  }

  async getAccessToken(): Promise<string | null> {
    if (this.accessToken && !this.isTokenExpired(this.accessToken)) {
      return this.accessToken;
    }

    // Tentar refresh
    if (this.refreshToken) {
      const newToken = await this.refreshAccessToken();
      if (newToken) {
        return newToken;
      }
    }

    // Redirecionar para login
    return null;
  }

  private async refreshAccessToken(): Promise<string | null> {
    try {
      const response = await fetch(
        'https://vzkwkcypkfrpfhhsghwn.supabase.co/functions/v1/api/v1/auth/refresh',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: this.refreshToken }),
        }
      );

      if (response.ok) {
        const result = await response.json();
        this.accessToken = result.data.access_token;
        await AsyncStorage.setItem('access_token', this.accessToken);
        return this.accessToken;
      }
    } catch (error) {
      console.error('Error refreshing token:', error);
    }
    return null;
  }

  private isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  }
}
```

### 2. Validação de Dados

**Sempre validar no cliente antes de enviar:**
```typescript
import { z } from 'zod';

const VereadorQuerySchema = z.object({
  page: z.number().min(1).max(1000),
  limit: z.number().min(1).max(100),
  search: z.string().max(100).optional(),
});

// Validar antes de fazer requisição
const validateAndFetch = async (params: unknown) => {
  const validation = VereadorQuerySchema.safeParse(params);
  if (!validation.success) {
    throw new Error('Parâmetros inválidos');
  }
  // Fazer requisição com params validados
};
```

### 3. Proteção contra Rate Limiting

**Implementar retry com backoff:**
```typescript
async function fetchWithRateLimitHandling<T>(
  fetchFn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fetchFn();
    } catch (error: any) {
      if (error.code === 'RATE_LIMIT_EXCEEDED' && attempt < maxRetries) {
        const resetAt = error.details?.resetAt || Date.now() + 60000;
        const waitTime = Math.max(0, resetAt - Date.now());
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}
```

### 4. Armazenamento Seguro

**Nunca armazenar tokens em texto plano:**
```typescript
// React Native - usar Keychain/Keystore
import * as Keychain from 'react-native-keychain';

// Salvar token
await Keychain.setGenericPassword('access_token', token);

// Recuperar token
const credentials = await Keychain.getGenericPassword();
const token = credentials?.password;
```

### 5. Headers de Segurança

**Sempre incluir headers apropriados:**
```typescript
const secureHeaders = {
  'Content-Type': 'application/json',
  'X-API-Version': '1.0',
  'User-Agent': 'CamaraNaMao/1.0',
  // Não incluir Authorization aqui - adicionar dinamicamente
};
```

### 6. Tratamento de Erros Sensíveis

**Não expor informações sensíveis em logs:**
```typescript
// ❌ ERRADO
console.error('Error:', error);
console.log('Token:', accessToken);

// ✅ CORRETO
console.error('API Error:', {
  code: error.code,
  message: error.message,
  // Não logar tokens, senhas, ou dados pessoais
});
```

---

## 📝 Notas Finais

- Todos os endpoints retornam JSON
- Alguns endpoints podem ter limitações de rate
- Recomenda-se implementar retry logic para requisições falhadas
- Considerar implementar um service layer para centralizar chamadas de API
- Documentar tipos TypeScript/Interfaces para cada resposta de API

---

**Última atualização:** Janeiro 2026
**Versão do documento:** 1.0
