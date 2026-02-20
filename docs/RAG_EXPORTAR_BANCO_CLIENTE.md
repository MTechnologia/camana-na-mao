# Como o cliente pode exportar o banco de dados para alimentar o RAG

Este documento é um **guia para enviar ao cliente** (ex.: Câmara, equipe de TI ou gestor de conteúdo) explicando como exportar os dados que serão usados para alimentar a base de conhecimento do assistente (RAG).

---

## Objetivo

Precisamos de uma **exportação dos dados** que o cliente quer que o assistente “conheça” (leis, FAQs, notícias, procedimentos, etc.). Esses dados podem ser:

- Exportados do **banco de dados** do cliente, ou  
- Exportados de **planilhas**, **documentos** ou **sistemas** que eles já usam.

Os formatos aceitos para importação no RAG (Vertex AI) são: **PDF, TXT, HTML, DOCX, PPTX, Markdown, JSON, JSONL**.

---

## Instruções para o cliente (texto pronto para enviar)

Você pode copiar e colar o texto abaixo em um e-mail ou documento para o cliente, ajustando o que estiver entre colchetes.

---

### Opção 1 – O cliente usa **Supabase** ou **PostgreSQL**

**Pedir ao cliente:**

> Para alimentar a base de conhecimento do assistente, precisamos de uma exportação dos dados que devem ser consultados (ex.: tabela de FAQs, notícias, procedimentos).
>
> **Como exportar:**
> 1. No **Supabase**: Dashboard do projeto → **Table Editor** → selecione a tabela desejada → ícone **…** (ou "Export") → **Export as CSV** (ou use a opção de export se existir).
> 2. Ou, se tiverem acesso ao **SQL**: rodar uma query que exporte as colunas de texto (título, conteúdo, etc.) e salvar o resultado em **CSV** ou **JSON**.
>
> **O que precisamos:** um arquivo **CSV** ou **JSON** (ou **JSONL** – um objeto JSON por linha) com pelo menos:
> - um campo de **título** (ou nome do assunto),
> - um campo de **conteúdo** (texto que o assistente vai usar para responder).
>
> Podem enviar o arquivo por e-mail (se for pequeno), link seguro ou compartilhar em nuvem. A equipe técnica fará a conversão para o formato usado no RAG, se necessário.

---

### Opção 2 – O cliente usa **planilhas** (Excel, Google Sheets)

**Pedir ao cliente:**

> Para enriquecer a base de conhecimento do assistente, precisamos dos dados que devem ser consultados (perguntas frequentes, procedimentos, normas, etc.).
>
> **Como exportar:**
> 1. Abrir a planilha (Excel ou Google Sheets) que contém essas informações.
> 2. **Excel:** Arquivo → Salvar como → escolher **CSV (UTF-8)**.
> 3. **Google Sheets:** Arquivo → Fazer download → **Valores separados por vírgula (.csv)**.
>
> **O que precisamos:** uma coluna com o **título/assunto** e outra com o **texto completo** (conteúdo). Se tiverem mais de uma planilha ou aba, podem enviar um CSV por tema.
>
> Enviar o(s) arquivo(s) CSV por e-mail, link seguro ou nuvem. A equipe técnica converterá para o formato do RAG, se necessário.

---

### Opção 3 – O cliente tem **documentos** (Word, PDF, sites)

**Pedir ao cliente:**

> Para alimentar a base de conhecimento do assistente, precisamos dos **documentos** ou **páginas** que o assistente deve usar para responder (manuais, leis, FAQs em PDF, etc.).
>
> **O que podem enviar:**
> - **PDF** – manuais, leis, procedimentos.
> - **Word (.docx)** – textos, FAQs, normas.
> - **Texto (.txt)** ou **Markdown (.md)** – se já tiverem nesse formato.
> - **HTML** – se tiverem páginas exportadas do site.
>
> **Como enviar:** os arquivos podem ser enviados por e-mail (se forem poucos e não muito grandes), link de download ou pasta compartilhada (Google Drive, OneDrive, etc.). Informar o link ou anexar os arquivos.
>
> A equipe técnica fará o upload para o ambiente do RAG (Vertex AI) e configurará a indexação.

---

### Opção 4 – O cliente tem **outro banco ou sistema**

**Pedir ao cliente:**

> Precisamos de uma **exportação** dos dados que o assistente deve consultar (ex.: tabela de conteúdos, FAQs, notícias).
>
> **Formato preferido:** **CSV**, **JSON** ou **JSONL** (um registro por linha em JSON).
>
> **Conteúdo mínimo por registro:**
> - **título** (ou nome do assunto),
> - **conteúdo** (texto completo que será usado nas respostas).
>
> Se o sistema deles permitir exportar em PDF, Word ou TXT por “documento” ou por tema, também podemos aceitar. Pedir à equipe de TI ou ao fornecedor do sistema que faça a exportação nesses formatos e enviar por canal seguro (e-mail, link, nuvem).

---

## Resumo para você (equipe técnica)

| Situação do cliente      | Pedir ao cliente                          | Formato final para o RAG      |
|--------------------------|-------------------------------------------|-------------------------------|
| Supabase / PostgreSQL    | Export CSV ou JSON da(s) tabela(s)       | CSV/JSON → converter para JSONL/TXT/PDF |
| Planilhas (Excel/Sheets) | Export CSV com título + conteúdo          | CSV → JSONL ou TXT            |
| Só documentos            | Enviar PDF, DOCX, TXT, MD                 | Subir no GCS e importar no Vertex |
| Outro banco/sistema      | Export CSV, JSON ou JSONL (título + conteúdo) | Validar e converter se necessário |

Depois de receber o material, a equipe técnica pode:
1. Converter CSV/JSON para **JSONL** ou **TXT** (um “documento” por registro).
2. Fazer upload no **Google Cloud Storage (GCS)**.
3. Importar no **Vertex AI Search** (data store) ou **RAG Engine** (corpus), conforme [RAG_VERTEX_CONFIGURACAO.md](./RAG_VERTEX_CONFIGURACAO.md).

---

## Exemplo de JSONL (para referência do cliente avançado)

Se o cliente souber exportar em JSONL, cada linha pode ser um objeto como:

```jsonl
{"title": "Como solicitar audiência pública", "content": "Para solicitar uma audiência..."}
{"title": "Prazos de tramitação", "content": "Os prazos para tramitação são..."}
```

Uma linha = um documento. Campos obrigatórios: algo como **title** e **content** (os nomes podem ser combinados com a equipe técnica).

---

## Segurança e LGPD

- Combinar com o cliente o **canal seguro** para envio (e-mail criptografado, link com senha, nuvem com acesso restrito).
- Exportações não devem incluir **dados pessoais desnecessários**; apenas o conteúdo que será usado na base de conhecimento.
- Ver [CRITERIOS_ACEITE/LGPD.md](./CRITERIOS_ACEITE/LGPD.md) e boas práticas do projeto para tratamento de dados.
