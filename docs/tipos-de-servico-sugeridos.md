# Tipos de serviço sugeridos para substituir "Outro"

Depois de **Feira** (`street_market`), estes são exemplos de tipos que podem ser adicionados ao enum `service_type` para reclassificar equipamentos que hoje estão como "Outro":

| Tipo sugerido (enum) | Label no app | Exemplos de equipamentos |
|----------------------|--------------|---------------------------|
| `community_center`   | Centro Comunitário | Casas de cultura, centros de convivência, CRAS |
| `daycare`           | Creche / CMEI | Creches municipais, CMEIs |
| `park`              | Parque / Área verde | Parques urbanos, praças equipadas |
| `social_assistance` | Assistência Social | CREAS, unidades de acolhimento, Centros de Referência |
| `police_station`    | Delegacia / Polícia | Delegacias, bases da Guarda Civil |
| `transit_station`   | Transporte | Terminais de ônibus, estações (quando forem “serviço” no mapa) |
| `market`            | Mercado / Sacolão | Sacolões, mercados municipais (diferente de feira livre) |
| `theater`           | Teatro / Cinema | Equipamentos culturais (teatros, cinemas públicos) |
| `museum`            | Museu | Museus municipais |
| `cemetery`          | Cemitério | Cemitérios públicos |
| `sports_center`      | *(já existe)* | Quadras, clubes esportivos |

**Sugestão de prioridade para próximas migrations:**

1. **community_center** – muito comum em dados de prefeitura (centros de convivência, CRAS).
2. **daycare** – creches/CMEIs costumam vir em listas próprias.
3. **park** – parques e praças aparecem como “Outro” com frequência.
4. **social_assistance** – CREAS e similares.
5. **market** – se quiser separar “sacolão/mercado” de “feira livre” (já temos `street_market`).

Para cada novo tipo é necessário:

1. Migration: `ALTER TYPE public.service_type ADD VALUE 'novo_tipo';`
2. Frontend: incluir em `ServiceTypeFilter`, `ServiceCard` (ícone + label), mapas e tipos Supabase.
3. Script de dados: `UPDATE public_services SET service_type = 'novo_tipo' WHERE ...` conforme critério (nome, fonte, etc.).
