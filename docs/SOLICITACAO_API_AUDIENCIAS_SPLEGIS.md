# Solicitação à API SPLEGIS – Audiências Públicas

Documento para encaminhar ao responsável pela API **SPLEGIS** (Câmara Municipal de São Paulo) para que o aplicativo **Câmara na Mão** possa exibir descrição e observações das audiências de forma alinhada ao portal oficial.

---

## Situação atual

- O app consome **AudienciasPublicasV2JSON** (listagem) e **AudienciaPublicaPorChaveV2JSON** (detalhe por chave).
- Para várias audiências, no app aparecem:
  - **Descrição:** apenas o texto genérico *"Geral. Participe e contribua com sua opinião."*, mesmo quando no portal há descrição específica (ex.: ementa do PL ou objetivo da audiência).
  - **Observação:** vazia, embora no portal exista texto como *"As inscrições para participação virtual nesta Audiência Pública se encerrarão às 10h do dia 16/12/2025."*

- Nos testes, o endpoint **AudienciaPublicaPorChaveV2JSON** retornou os campos **Descricao**, **Colabore** e **Observacao** com conteúdo vazio (length 0).
- Na listagem, **Colabore** e **FormInscricoes** vêm como valores numéricos (ex.: `"1"`, `"2"`), e não como texto.

---

## O que precisa ser disponibilizado na API

### 1. Descrição da audiência (campo descrição no app)

Para que o app mostre a mesma descrição do portal:

- **Na listagem (AudienciasPublicasV2JSON)**  
  Enviar em cada item **um campo de texto** com a descrição da audiência, por exemplo:
  - **Descricao** (ou nome equivalente), contendo:
    - quando houver vínculo com projeto de lei: a **ementa** do projeto (ex.: *"Altera a Lei nº 13.545..."*), ou
    - quando não houver PL: o **objetivo/tema** detalhado (ex.: *"Esta audiência tem o objetivo de debater o seguinte tema: Metas fiscais do 3º quadrimestre de 2025..."*).

- **Ou no detalhe (AudienciaPublicaPorChaveV2JSON)**  
  Se a descrição for apenas no detalhe, que o campo **Descricao** (ou equivalente) da resposta seja **preenchido** com esse mesmo texto (ementa ou objetivo/tema), e não vazio.

### 2. Referência ao projeto de lei (opcional, mas muito útil)

Para audiências vinculadas a PL/PDL etc., seria suficiente **uma** das opções abaixo:

- **Opção A – Campos explícitos na listagem**  
  Para cada item da listagem, quando houver matéria vinculada, enviar por exemplo:
  - **TipoMateria** (ou **Tipo**): ex. `"PL"`
  - **NumeroMateria** (ou **Numero**): ex. `1461`
  - **AnoMateria** (ou **Ano**): ex. `2025`  
  (evitar usar **Tipo**/**Numero** para outro fim, ex.: tipo “Audiência Pública” e número da audiência, para não conflitar.)

- **Opção B – Descrição já preenchida**  
  Manter o campo **Descricao** (na listagem ou no detalhe) já preenchido com a ementa/objetivo, como no item 1.

### 3. Observação (prazo de inscrição e instruções)

Para que o app mostre a observação que aparece no portal (ex.: *"As inscrições para participação virtual nesta Audiência Pública se encerrarão às 10h do dia 16/12/2025."*):

- **Na listagem (AudienciasPublicasV2JSON)**  
  Enviar esse texto em um campo de texto, por exemplo:
  - **Observacao** ou **Colabore** (ou equivalente), contendo o texto completo da observação (prazo de inscrição virtual, instruções de participação etc.), e **não** apenas um identificador numérico (ex.: `"1"` ou `"2"`).

- **Ou no detalhe (AudienciaPublicaPorChaveV2JSON)**  
  Se a observação for apenas no detalhe, que o campo **Observacao** (ou **Colabore**, conforme usado no portal) da resposta seja **preenchido** com esse texto, e não vazio.

### 4. Chave (identificador único) em todos os itens da listagem

- Hoje, parte dos itens retornados por **AudienciasPublicasV2JSON** não traz o campo **Chave** (ou equivalente).
- Para esses itens o app gera um identificador sintético e **não consegue** chamar o detalhe (**AudienciaPublicaPorChaveV2JSON**).
- **Solicitação:** que **todos** os itens da listagem tenham **Chave** (ou id único) preenchido, de forma que seja possível chamar o endpoint de detalhe por chave para qualquer audiência.

---

## Resumo para o cliente

| O quê | Onde | Pedido |
|-------|------|--------|
| **Descrição** (ementa ou objetivo da audiência) | Listagem e/ou detalhe | Campo **Descricao** (ou equivalente) preenchido com o mesmo texto exibido no portal. |
| **Referência ao PL** (opcional) | Listagem | Campos **TipoMateria**, **NumeroMateria**, **AnoMateria** (ou **Tipo**/ **Numero**/ **Ano** só para matéria) quando houver vínculo com projeto de lei. |
| **Observação** (prazo de inscrição, instruções) | Listagem e/ou detalhe | Campo **Observacao** ou **Colabore** (ou equivalente) com o **texto completo**, não só ID. |
| **Chave** em todos os itens | Listagem | Garantir que todo item tenha **Chave** (ou id único) para permitir consulta ao detalhe por chave. |

Com isso, o app poderá refletir no **campo descrição** e na **coluna observação** o mesmo conteúdo que o cidadão vê no portal da Câmara.

---

## Teste manual pela API

Para validar as respostas (e conferir se **Descricao**, **Colabore** e **Observacao** vêm preenchidos), use estes dois endpoints em **JSON**:

### 1. Relatório de audiências (listagem) – **AudienciasPublicasV2JSON**

Retorna várias audiências em um intervalo de datas.

**URL (GET):**
```
https://splegisws.saopaulo.sp.leg.br/ws/ws2.asmx/AudienciasPublicasV2JSON?dataInicial=2025-01-01&dataFinal=2025-12-31
```

**Parâmetros (query string):**
| Parâmetro     | Exemplo     | Obrigatório |
|---------------|-------------|-------------|
| `dataInicial` | `2025-01-01`| Sim         |
| `dataFinal`   | `2025-12-31`| Sim         |

**Como testar:** abra a URL no navegador ou use:
```bash
curl "https://splegisws.saopaulo.sp.leg.br/ws/ws2.asmx/AudienciasPublicasV2JSON?dataInicial=2025-01-01&dataFinal=2025-12-31"
```

Na resposta, confira nos itens se existem e vêm preenchidos: **Chave**, **Descricao**, **Colabore**, **Observacao**, **Tema**, **Comissao**, **Data**, **Horario**, **Local**.

---

### 2. Audiência por chave (detalhe de uma) – **AudienciaPublicaPorChaveV2JSON**

Retorna os dados de **uma** audiência a partir da **Chave** obtida na listagem.

**URL (GET):**
```
https://splegisws.saopaulo.sp.leg.br/ws/ws2.asmx/AudienciaPublicaPorChaveV2JSON?chave=62
```

**Parâmetros (query string):**
| Parâmetro | Exemplo | Obrigatório |
|-----------|---------|-------------|
| `chave`   | `62`    | Sim (número da Chave de um item da listagem) |

**Como testar:** primeiro pegue um valor de **Chave** de algum item retornado por AudienciasPublicasV2JSON. Depois abra no navegador ou use:
```bash
curl "https://splegisws.saopaulo.sp.leg.br/ws/ws2.asmx/AudienciaPublicaPorChaveV2JSON?chave=62"
```

Na resposta, confira se **Descricao**, **Colabore** e **Observacao** vêm com texto (e não vazios).

---

**Resumo:** use **AudienciasPublicasV2JSON** para a listagem (com `dataInicial` e `dataFinal`) e **AudienciaPublicaPorChaveV2JSON** para o detalhe (com `chave`). Ambos retornam JSON e podem ser testados direto no navegador ou com `curl`.
