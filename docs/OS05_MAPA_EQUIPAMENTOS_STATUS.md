# OS05 – Mapa interativo de equipamentos públicos

**Objetivo:** Mapa interativo de equipamentos públicos com filtros por **tipo**, **distância** e **avaliação**.

Referência: Sprint 5 (PLANO_SPRINTS_PRODUCAO.md), Épico E07 – Mapa de Serviços Públicos.

---

## Estado atual

| Recurso | Status | Onde |
|--------|--------|------|
| **Mapa interativo** | ✅ | `NearbyServicesPage` → `MapView` (SimulatedMap sem token Mapbox, MapboxMap com token). Aba Lista/Mapa. |
| **Filtro por tipo** | ✅ | `ServiceTypeFilter`: Todos, UBS, Escolas, CEU, Hospitais, Bibliotecas, Esportes. |
| **Filtro por distância** | ✅ | `RadiusSelector`: raio 1km–10km (slider + atalhos). |
| **Filtro por avaliação** | 🔶 Em implementação | Filtro “avaliação mínima” e ordenação por avaliação. |
| **Detalhes no mapa** | ✅ | Clique no serviço → `/servico/:id` (ServiceDetailPage). |
| **Avaliação nos cards** | ✅ | `ServiceCard` exibe estrelas e total de avaliações. |

---

## Implementado nesta entrega

- **Filtro por avaliação mínima:** “Todas” | “4+ estrelas” | “3+ estrelas” | “2+ estrelas”.
- **Ordenação:** por distância (padrão) ou por avaliação (melhor nota primeiro).

---

## Rotas e arquivos principais

- **Página:** `/servicos-proximos` → `src/pages/NearbyServicesPage.tsx`
- **Mapa:** `src/components/map/MapView.tsx`, `MapboxMap.tsx`, `SimulatedMap.tsx`
- **Filtros:** `src/components/evaluation/ServiceTypeFilter.tsx`, `src/components/map/RadiusSelector.tsx`
- **Dados:** `src/hooks/useNearbyServices.ts` (Supabase `public_services` + distância Haversine)
