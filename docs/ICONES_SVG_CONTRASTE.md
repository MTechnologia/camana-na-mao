# Ícones SVG – Contraste e Acessibilidade (OS-05)

## Onde ficam os SVGs (referência rápida)

| O quê | Caminho no projeto |
|-------|--------------------|
| **Pasta dos ícones (mapa e filtro)** | `public/icons/map/` |
| **URL em produção** | `{BASE_URL}icons/map/{nome}.svg` (ex.: `/icons/map/ubs.svg`) |

**Convenção de nomes:** um arquivo `.svg` por tipo de serviço; o tipo `transit_station` usa o arquivo `transit.svg`. Demais tipos usam o valor do tipo + `.svg` (ex.: `ubs.svg`, `school.svg`, `hospital.svg`).

**Lista dos arquivos atuais:**  
`accessibility.svg`, `cemetery.svg`, `ceu.svg`, `city_market.svg`, `community_center.svg`, `daycare.svg`, `fire_station.svg`, `hospital.svg`, `library.svg`, `market.svg`, `museum.svg`, `other.svg`, `park.svg`, `police_station.svg`, `recycling_point.svg`, `school.svg`, `social_assistance.svg`, `sports_center.svg`, `street_market.svg`, `theater.svg`, `transit.svg`, `ubs.svg`.

---

## Visão geral

Os ícones por tipo de serviço no mapa e nos filtros foram padronizados em **SVG customizados** em substituição aos emojis, garantindo identidade visual, contraste consistente e o mesmo aspecto em todos os dispositivos e sistemas operacionais.

## Por que SVG

- **Vetoriais**: escalam sem perda de qualidade em qualquer zoom (mapa e telas).
- **Renderização uniforme**: mesma aparência em Android, iOS, Windows e navegadores, ao contrário de emojis que variam por plataforma.
- **Controle de cor**: cada categoria tem uma cor definida em `SERVICE_TYPE_MAP_COLORS`; os ícones usam traço/preenchimento nessa cor sobre fundo claro, permitindo atender requisitos de contraste.
- **Acessibilidade**: ícones com `stroke`/`fill` escuros ou coloridos sobre fundo claro (ex.: círculo branco no mapa) atendem a boas práticas de contraste; textos alternativos são tratados nos componentes (labels, `alt` vazio onde o ícone é decorativo).

## Onde são usados

- **Mapa (Google Maps)**: balão por marcador com círculo colorido + ícone SVG inline (sem emoji).
- **Filtro de tipos**: dropdown em `ServiceTypeFilter` exibe ícones a partir de `public/icons/map/*.svg` (um arquivo por tipo; `transit_station` usa `transit.svg`).

## Contraste

- Nos **marcadores do mapa**: o ícone usa a cor da categoria (ex.: teal para Transporte) em traço sobre fundo claro (branco ou teal claro), garantindo legibilidade.
- Nos **filtros**: os SVGs usam `stroke="currentColor"`, herdando a cor do texto da interface; em temas claros o contraste fica adequado.
- Cores das categorias foram escolhidas para serem distintas entre si e legíveis sobre fundo claro (paleta em `src/components/icons/serviceTypeIcons.tsx`, `SERVICE_TYPE_MAP_COLORS`).

## Arquivos

- **Definição de cores e paths (mapa)**: `src/components/icons/serviceTypeIcons.tsx`
- **Assets SVG**: `public/icons/map/` (ubs, school, ceu, hospital, library, sports_center, street_market, community_center, daycare, park, market, city_market, theater, museum, social_assistance, transit, police_station, cemetery, accessibility, recycling_point, fire_station, other)
- **Filtro**: `src/components/evaluation/ServiceTypeFilter.tsx` (exibe os ícones SVG em vez de emoji)
