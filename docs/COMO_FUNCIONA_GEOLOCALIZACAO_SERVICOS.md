# Como Funciona a Geolocalização de "Serviços Próximos a Mim"

## 📍 Resumo

A geolocalização de serviços próximos funciona em **duas camadas**:
1. **Frontend**: Usa dados mockados (`servicosProximos`) e calcula distâncias no cliente
2. **Backend**: Usa a tabela `public_services` do banco de dados com coordenadas (latitude/longitude)

## 🏗️ Arquitetura

### 1. Obtenção da Localização do Usuário

**Hook:** `src/hooks/useGeolocation.ts`

```typescript
// Tenta obter localização real do navegador
navigator.geolocation.getCurrentPosition(
  (position) => {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude
  }
)

// Se falhar, usa localização simulada (Praça da Sé)
SIMULATED_LOCATION = {
  latitude: -23.5505,
  longitude: -46.6333
}
```

**Fluxo:**
1. Solicita permissão de geolocalização do navegador
2. Se permitido → usa coordenadas reais do GPS
3. Se negado/erro → usa localização simulada (Centro SP)
4. Cache de 5 minutos para evitar requisições repetidas

### 2. Cálculo de Distância

**Fórmula:** Haversine (cálculo de distância entre dois pontos na Terra)

**Localização:** `src/hooks/useNearbyServices.ts`

```typescript
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // Raio da Terra em metros
  // ... fórmula Haversine
  return distanceInMeters;
}
```

### 3. Fonte de Dados dos Serviços

#### A) Dados Mockados (Frontend - Atual)

**Arquivo:** `src/data/searchData.ts`

```typescript
export const servicosProximos: SearchResult[] = [
  {
    id: "1",
    title: "UBS Vila Formosa",
    metadata: {
      latitude: -23.5489,
      longitude: -46.6358,
      serviceType: "ubs",
      district: "Vila Formosa"
    }
  },
  // ... mais serviços
]
```

**Como funciona:**
- Dados hardcoded no frontend
- Hook `useNearbyServices` calcula distância para cada serviço
- Ordena por distância (mais próximo primeiro)
- **NÃO filtra por raio** - mostra todos, apenas ordenados

#### B) Banco de Dados (Backend - Disponível)

**Tabela:** `public_services`

```sql
CREATE TABLE public.public_services (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  service_type service_type NOT NULL,
  address TEXT NOT NULL,
  district TEXT NOT NULL,
  latitude NUMERIC(10, 7) NOT NULL,  -- ⭐ Coordenada
  longitude NUMERIC(10, 7) NOT NULL, -- ⭐ Coordenada
  phone TEXT,
  average_rating NUMERIC(2, 1),
  total_ratings INTEGER,
  ...
);
```

**Como funciona:**
- Cada serviço tem `latitude` e `longitude` armazenadas
- Edge Functions podem buscar serviços e calcular distância
- Exemplo: `recommend-services` busca até 50 serviços e filtra por raio

## 🔄 Fluxo Completo

### Frontend (Página "Serviços Próximos")

```
1. useGeolocation() → Obtém lat/lng do usuário
   ↓
2. useNearbyServices({ latitude, longitude })
   ↓
3. Busca servicosProximos (dados mockados)
   ↓
4. Para cada serviço:
   - Calcula distância usando Haversine
   - Adiciona campo `distance` ao serviço
   ↓
5. Ordena por distância (mais próximo primeiro)
   ↓
6. Renderiza na UI com distância exibida
```

### Backend (Edge Functions)

```
1. Recebe userId ou coordenadas
   ↓
2. Busca endereço do usuário (user_addresses)
   ↓
3. SELECT * FROM public_services LIMIT 50
   ↓
4. Para cada serviço:
   - Calcula distância usando Haversine
   - Adiciona campo `distance`
   ↓
5. Filtra por raio (ex: <= 5000 metros)
   ↓
6. Ordena por distância
   ↓
7. Retorna top 20 mais próximos
```

## 📊 Exemplos de Uso

### 1. Frontend - Página de Serviços Próximos

**Arquivo:** `src/pages/NearbyServicesPage.tsx`

```typescript
const { latitude, longitude } = useGeolocation();
const { services } = useNearbyServices({
  latitude,
  longitude,
  radiusMeters: 5000,
  serviceType: "ubs"
});

// services já vem ordenado por distância
services.map(service => (
  <ServiceCard 
    service={service}
    distance={service.distance} // em metros
  />
))
```

### 2. Backend - Recomendação de Serviços

**Arquivo:** `supabase/functions/recommend-services/index.ts`

```typescript
// Busca endereço do usuário
const { data: address } = await supabase
  .from('user_addresses')
  .select('*')
  .eq('user_id', userId)
  .eq('is_primary', true)
  .single();

if (address?.latitude && address?.longitude) {
  // Busca serviços do banco
  const { data } = await supabase
    .from('public_services')
    .select('*')
    .limit(50);
  
  // Calcula distância para cada um
  const nearbyServices = data
    .map(service => ({
      ...service,
      distance: calculateDistance(
        address.latitude,
        address.longitude,
        service.latitude,
        service.longitude
      )
    }))
    .filter(s => s.distance <= 5000) // Filtra por raio
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 20); // Top 20
}
```

### 3. AI Orchestrator - Busca por Bairro

**Arquivo:** `supabase/functions/ai-orchestrator/index.ts`

```typescript
async function findNearbyServices(supabase, serviceType, district) {
  // 1ª tentativa: busca por bairro específico
  const { data } = await supabase
    .from('public_services')
    .select('name, address, district, phone, average_rating, service_type')
    .eq('service_type', serviceType)
    .ilike('district', `%${district}%`)
    .limit(5);
  
  // Se não encontrar, expande para cidade inteira
  if (!data?.length) {
    const { data: cityWide } = await supabase
      .from('public_services')
      .select('*')
      .eq('service_type', serviceType)
      .limit(10);
  }
}
```

### 4. Chatbot (GPS) — endereço legível na resposta

Quando o munícipe envia **Localização GPS: lat,lon**, a tool `find_nearby_services` ordena por distância usando essas coordenadas. Para a mensagem não parecer “lista sem contexto”, o orchestrator chama **`reverseGeocodeLatLon`** em `lib.ts`: tenta **Google Geocoding** (`GOOGLE_MAPS_API_KEY` no Edge) e, se necessário, **Nominatim (OSM)**. O texto entra no cabeçalho da lista, por exemplo: *Encontrei 5 UBS perto de Rua Augusta, 1200 - Bela Vista, São Paulo*.

## 🗄️ Estrutura do Banco de Dados

### Tabela `public_services`

```sql
-- Campos de geolocalização
latitude NUMERIC(10, 7) NOT NULL,  -- Ex: -23.5505000
longitude NUMERIC(10, 7) NOT NULL, -- Ex: -46.6333000

-- Exemplo de registro
INSERT INTO public_services (
  name,
  service_type,
  address,
  district,
  latitude,
  longitude
) VALUES (
  'UBS Vila Formosa',
  'ubs',
  'Rua Exemplo, 123',
  'Vila Formosa',
  -23.5489000,  -- ⭐ Coordenada
  -46.6358000   -- ⭐ Coordenada
);
```

### Tabela `user_addresses`

```sql
-- Armazena endereços dos usuários com coordenadas
CREATE TABLE user_addresses (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  address TEXT,
  district TEXT,
  is_primary BOOLEAN DEFAULT false,
  ...
);
```

## 🔍 Queries SQL para Proximidade

### Busca Simples (sem cálculo de distância)

```sql
-- Busca por bairro
SELECT * FROM public_services
WHERE district ILIKE '%Vila Formosa%'
AND service_type = 'ubs'
LIMIT 10;
```

### Busca com Cálculo de Distância (PostGIS - Futuro)

**Nota:** Atualmente o cálculo é feito em JavaScript. Para melhor performance com muitos registros, pode-se usar PostGIS:

```sql
-- Com PostGIS (extensão do PostgreSQL)
SELECT 
  *,
  ST_Distance(
    ST_MakePoint(longitude, latitude)::geography,
    ST_MakePoint(-46.6333, -23.5505)::geography
  ) AS distance
FROM public_services
WHERE service_type = 'ubs'
ORDER BY distance
LIMIT 20;
```

## 🚀 Melhorias Futuras

### 1. Migrar para Banco de Dados

**Atual:** Dados mockados no frontend  
**Futuro:** Buscar todos os serviços do banco `public_services`

```typescript
// Substituir useNearbyServices para buscar do banco
const { data: services } = await supabase
  .from('public_services')
  .select('*')
  .limit(100);

// Calcular distância no frontend
const withDistance = services.map(service => ({
  ...service,
  distance: calculateDistance(userLat, userLng, service.latitude, service.longitude)
}));
```

### 2. Implementar PostGIS

Para queries mais eficientes com muitos serviços:

```sql
-- Criar extensão
CREATE EXTENSION IF NOT EXISTS postgis;

-- Adicionar coluna geográfica
ALTER TABLE public_services
ADD COLUMN location GEOGRAPHY(POINT, 4326);

-- Criar índice espacial
CREATE INDEX idx_public_services_location 
ON public_services USING GIST(location);

-- Query otimizada
SELECT *, ST_Distance(location, ST_MakePoint(-46.6333, -23.5505)::geography) AS distance
FROM public_services
WHERE ST_DWithin(
  location,
  ST_MakePoint(-46.6333, -23.5505)::geography,
  5000  -- 5km em metros
)
ORDER BY distance
LIMIT 20;
```

### 3. Cache de Resultados

```typescript
// Cachear resultados por coordenada (grid de 100m)
const cacheKey = `${Math.floor(lat * 1000)}_${Math.floor(lng * 1000)}`;
const cached = localStorage.getItem(cacheKey);
if (cached) return JSON.parse(cached);
```

## 📝 Resumo

| Aspecto | Frontend (Atual) | Backend (Disponível) |
|---------|------------------|----------------------|
| **Fonte de Dados** | Dados mockados (`servicosProximos`) | Tabela `public_services` |
| **Cálculo de Distância** | JavaScript (Haversine) | JavaScript (Haversine) |
| **Filtro por Raio** | ❌ Não (mostra todos) | ✅ Sim (ex: 5km) |
| **Performance** | ⚠️ Limitado a ~100 serviços | ✅ Escalável |
| **Atualização** | ⚠️ Requer deploy | ✅ Dinâmico (banco) |

## 🎯 Conclusão

**Resposta direta:** Sim, a geolocalização **tem relação com o banco de dados**, mas atualmente:

1. **Frontend** usa dados mockados e calcula distância no cliente
2. **Backend** já tem suporte completo com tabela `public_services` (latitude/longitude)
3. **Edge Functions** já usam o banco para buscar serviços próximos
4. **Futuro:** Migrar frontend para buscar do banco ao invés de dados mockados

A infraestrutura está pronta no banco, só falta conectar o frontend completamente! 🚀
