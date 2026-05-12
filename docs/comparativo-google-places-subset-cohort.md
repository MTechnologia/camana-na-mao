# Google Places — subconjunto por coorte (Marco **C**)

Documento focado na **estimativa de custo** (Place Details) para o recorte definido em  
[`comparativo-equipamentos-antes-depois-google-places.md`](comparativo-equipamentos-antes-depois-google-places.md) (secção 5), com resultado da query  
`scripts/sql/diagnostic-google-places-subset-cohort.sql` (2.ª `SELECT`).

**Câmbio ilustrativo:** R$ **5,50** por US$ **1,00**.

**Premissas Google:** 1 chamada **Place Details (Enterprise + Atmosphere)** por POI; **US$ 25 / 1 000** após **1 000** grátis/mês; **sem** `ponto_onibus`; **sem** Popular times.

---

## 1. O que entra no subconjunto

| Área | Critério (resumo) |
|------|-------------------|
| Metrô | `transit_station` + `estacao_metro` / `estacao_metro_projeto` |
| Trem | `transit_station` + `estacao_trem` / `estacao_trem_projeto` |
| Terminal ônibus | `transit_station` + `terminal_onibus` |
| Escola (4 camadas) | Ver quadro abaixo |
| Saúde (hospitais, UPAs e afins no mapa) | `service_type = 'hospital'` + `source_layer` conforme GeoSampa (ver quadro abaixo) |
| Parque, centro esportivo, CEU, teatro/cinema, biblioteca, museu | `service_type` ∈ `park`, `sports_center`, `ceu`, `theater`, `library`, `museum` |

### 1.1. Escolas — quatro camadas GeoSampa (rede pública / SENAI–SESI–SENAC)

Entram **apenas** POIs com `service_type = 'school'` **e** `source_layer` igual a um dos valores abaixo (sincronização WFS GeoSampa → `public_services`):

| `source_layer` | O que representa (resumo) |
|----------------|---------------------------|
| `ensino_fundamental_medio` | Ensino fundamental e médio da rede pública municipal (camada WFS *equipamento_educacao_rede_publica*). |
| `educacao_infantil` | Educação infantil da rede pública (*equipamento_educacao_infantil_rede_publica*). |
| `ensino_tecnico` | Ensino técnico da rede pública (*equipamento_educacao_ensino_tecnico_rede_publica*). |
| `senai_sesi_senac` | Unidades SENAI / SESI / SENAC (*equipamento_educacao_senai_sesi_senac*). |

**Fora deste recorte (exemplos):** `rede_privada`, `educacao_outros`, escolas vindas só da API Escola Aberta com `source_layer` diferente (ou sem camada compatível), e demais camadas de educação que não casem com os quatro valores acima.

### 1.2. Saúde — tudo o que o app classifica como “hospital” (`service_type = 'hospital'`)

No mapa, **hospitais, UPAs / urgência–emergência e unidades afins** vêm agrupados em `service_type = 'hospital'`, distinguindo-se pelo **`source_layer`** (GeoSampa):

| `source_layer` | O que representa (resumo) |
|----------------|---------------------------|
| `urgencia_emergencia` | Unidades de urgência e emergência (inclui perfil tipo **UPA** / atenção 24h conforme cadastro GeoSampa). |
| `hospital` | Hospitais. |
| `equipamento_saude_ambulatorios_especializados` | Ambulatórios especializados. |
| `equipamento_saude_saude_mental` | Equipamentos de saúde mental. |
| `equipamento_ccz` | Centro de Controle de Zoonoses (CCZ). |
| `equipamento_saude_outros` | Outros equipamentos de saúde mapeados nesta família. |
| `equipamento_saude_unidades_dst_aids` | Unidades DST / AIDS. |

Qualquer outro `source_layer` ainda com `service_type = 'hospital'` aparece na 1.ª query do SQL como coorte `hospital_source_layer_outros` (para auditoria).

---

## 2. Contagens por grupo (Marco **C**)

| Linha | N |
|------|--:|
| Escola (4 camadas, ver §1.1) | 57 962 |
| Transporte (metrô + trem + terminal) | 13 199 |
| Parque | 6 125 |
| Centro esportivo | 620 |
| CEU | 513 |
| Teatro / cinema | 410 |
| Biblioteca | 384 |
| Museu | 167 |
| **Saúde (hospital / UPA / afins, ver §1.2)** | **699** |
| **Total** | **80 079** |

*Detalhe por coorte (`transit_*`, `school_*`, `hospital_*`, etc.): 1.ª `SELECT` em `diagnostic-google-places-subset-cohort.sql`.*

---

## 3. Total do subconjunto e custo ilustrativo (Marco **C**)

| Métrica | Valor |
|--------|------:|
| **POIs (N)** | **80 079** |
| **USD (≈)** | **1 976,98** |
| **BRL (≈)** | **10 873,36** |

**Fórmula:** `max(0, N − 1 000) × 0,025` USD; BRL = USD × 5,50 (mesmo arredondamento que a 2.ª query SQL).

*(80 079 − 1 000) × 0,025 = **1 976,98** USD; × 5,50 = **10 873,36** BRL (arredondado a 2 casas).*

---

*Valores ilustrativos; não substituem fatura Google. Para atualizar após mudança na base, volte a correr o SQL e alinhe este ficheiro e o script `scripts/generate_comparativo_google_places_subset_docx.py`.*
