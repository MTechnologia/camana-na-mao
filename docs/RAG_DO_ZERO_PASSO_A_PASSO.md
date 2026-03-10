# RAG do zero – passo a passo

Guia para criar e conectar um RAG (Retrieval-Augmented Generation) no projeto Câmara na Mão, do zero até o assistente usar na conversa.

---

## Escolha o tipo de RAG

| Opção | Fonte dos dados | Onde configurar | Quando usar |
|-------|------------------|-----------------|-------------|
| **A – Site** | URL do site (ex.: saopaulo.sp.leg.br) | Vertex AI Search (AI Applications) | Conteúdo já publicado no site da Câmara. |
| **B – Documentos (PDF, TXT, etc.)** | Arquivos em um bucket GCS | Vertex AI Search (data store “Unstructured”) ou RAG Engine | PDFs, manuais, export do banco em JSONL/TXT. |
| **C – Tabela no Supabase** | Tabela `knowledge_base` | Já existe; tool `search_knowledge_base` | Dados que vocês inserem/atualizam direto no banco. |

Para **começar do zero** o mais comum é **A (site)** ou **B (documentos)**. O assistente já usa **C** para dúvidas gerais; A ou B **enriquecem** esse contexto quando configurados (Opção B do ai-orchestrator).

---

# Caminho A: RAG com o site (Vertex AI Search)

Use quando a fonte de verdade for o **site** (ex.: https://saopaulo.sp.leg.br).

## Passo 1 – Ativar AI Applications

1. Acesse o [Google Cloud Console](https://console.cloud.google.com) e selecione o projeto (ex.: `arcane-atom-480020-f6`).
2. Abra **AI Applications** (busque no topo ou menu):  
   [https://console.cloud.google.com/gen-app-builder/engines](https://console.cloud.google.com/gen-app-builder/engines)
3. Aceite os termos e escolha a localização **global** (ou a que a documentação indicar).

## Passo 2 – Criar o Data Store (site)

1. Vá em **Data stores** → **Create Data Store** (ou [Create Data Store](https://console.cloud.google.com/gen-app-builder/data-stores/create)).
2. Escolha **Website** (conteúdo de site).
3. **Website URL:** use exatamente o domínio que o cliente tem no Google Search Console, ex.:
   - `https://saopaulo.sp.leg.br`  
   ou  
   - `https://www.saopaulo.sp.leg.br`
4. Se a interface pedir:
   - Em **Sites**, adicione o padrão do site (ex.: `https://saopaulo.sp.leg.br` ou `https://saopaulo.sp.leg.br/*`). **Não deixe “Sites” vazio.**
   - Em **Sitemap** (opcional), coloque a URL do arquivo de sitemap, ex.: `https://saopaulo.sp.leg.br/sitemap.xml` (se existir).
5. Marque **Advanced website indexing** se quiser indexação avançada.
6. Dê um nome ao data store (ex.: `rag-camara-site`) e crie.

## Passo 3 – Associar o domínio (evitar “No source owners found”)

1. No data store criado, vá na parte de **Website** / **Target sites**.
2. Envie a solicitação de associação ao “domain owner”.
3. O e-mail de aprovação deve ir para **quem tem a propriedade no Search Console** (ex.: o cliente com **saopaulo.sp.leg.br**). Essa pessoa precisa **aprovar** a associação com o projeto Cloud.
4. O domínio no data store deve ser **o mesmo** que está no Search Console (ex.: `saopaulo.sp.leg.br`), não um domínio pai diferente (ex.: `sp.leg.br` sozinho), para o Google encontrar o “source owner”.

## Passo 4 – Anotar o Data store ID

1. Em **AI Applications** → **Data stores** → abra o data store.
2. Aba **Data** (ou equivalente): copie o **Data store ID**.
3. Monte o path completo:
   ```
   projects/arcane-atom-480020-f6/locations/global/collections/default_collection/dataStores/SEU_DATASTORE_ID
   ```
   (Troque `SEU_DATASTORE_ID` pelo ID copiado; use o ID do seu projeto GCP se for diferente.)

## Passo 5 – Configurar no Supabase (ai-orchestrator)

1. No [Supabase Dashboard](https://supabase.com/dashboard) → projeto → **Project Settings** → **Edge Functions** → **Secrets**.
2. Crie (ou edite) o secret **`VERTEX_RAG_DATASTORE`**.
3. Valor: o path completo do passo 4, ex.:
   ```
   projects/arcane-atom-480020-f6/locations/global/collections/default_collection/dataStores/rag-camara-site_1234567890
   ```
4. Salve. O ai-orchestrator já está preparado para usar esse secret em perguntas de intenção **general** (chamada à API `generateContent` com grounding nesse data store).

## Passo 6 – Testar

1. Aguarde a indexação do site (pode levar alguns minutos ou horas, conforme o tamanho do site).
2. No app ou na interface do chat, faça uma pergunta geral sobre a Câmara (ex.: “O que a Câmara oferece sobre audiências?”).
3. A resposta deve usar o conteúdo indexado do site (e pode incluir citações/grounding no Vertex).

---

# Caminho B: RAG com documentos (PDF, TXT, etc.)

Use quando a fonte forem **arquivos** (export do banco, PDFs, manuais).

## B1 – Via Vertex AI Search (data store “Unstructured”)

1. Coloque os arquivos (PDF, TXT, HTML, DOCX, etc.) em um **bucket no Google Cloud Storage** (ex.: `gs://seu-bucket/rag-docs/`).
2. Em **AI Applications** → **Create Data Store** → escolha **Unstructured documents** (Cloud Storage).
3. Aponte para a pasta do bucket (ex.: `gs://seu-bucket/rag-docs/`).
4. Crie o data store; depois anote o **Data store ID** e monte o path como no caminho A (passo 4).
5. Configure o secret **`VERTEX_RAG_DATASTORE`** no Supabase com esse path (igual ao passo 5 do caminho A).

**Se os arquivos estão na pasta local `crawl-output`** (ex.: após o crawl do site): use o guia [RAG_UPLOAD_CRAWL_AI_APPLICATIONS.md](./RAG_UPLOAD_CRAWL_AI_APPLICATIONS.md) para enviar essa pasta ao GCS e configurar o data store Unstructured (inclui comandos para Windows e ~13 GB).

## B2 – Via RAG Engine (corpus)

1. Ative a **Vertex AI RAG API** no projeto GCP.
2. Crie um **RAG corpus** (via Console ou API):
   - Exemplo de body: `{ "display_name": "Conhecimento Câmara", "description": "Base para RAG" }`.
   - Região: use a mesma do modelo (ex.: `southamerica-east1`).
3. **Importe os arquivos** (ImportRagFiles) apontando para o GCS (ex.: `gcs_source.uris`).
4. Anote o **Corpus ID** e monte o path:
   ```
   projects/arcane-atom-480020-f6/locations/southamerica-east1/ragCorpora/CORPUS_ID
   ```
5. No Supabase, configure o secret **`VERTEX_RAG_CORPUS`** com esse path (e **não** defina `VERTEX_RAG_DATASTORE` se for usar só o corpus).

Formato dos arquivos aceitos: PDF, TXT, HTML, DOCX, PPTX, Markdown, JSON, JSONL. Ver [RAG_EXPORTAR_BANCO_CLIENTE.md](./RAG_EXPORTAR_BANCO_CLIENTE.md) para como o cliente pode exportar o banco.

---

# Caminho C: Só Supabase (já existe)

- A tabela **`knowledge_base`** e a tool **`search_knowledge_base`** já fazem RAG “em aplicação”.
- Não é preciso configurar nada no Vertex para isso.
- Se **não** configurar `VERTEX_RAG_DATASTORE` nem `VERTEX_RAG_CORPUS`, o assistente usa apenas a `search_knowledge_base` para dúvidas gerais.

### Enviar arquivos do crawl para a knowledge_base

Depois de extrair o site (crawl) e ter arquivos **.txt, .xml, .pdf, .qmd** (e opcionalmente .html/.htm) em `crawl-output/camara-site`, use o script para enviar ao RAG (tabela `knowledge_base`). Arquivos .qml, .cpg, .dbf, .prj, .shp, .shx são ignorados.

1. **Variáveis de ambiente:** defina `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` (Supabase → Project Settings → API → service_role).
2. **Opcional – extrair texto de PDF:** `npm install pdf-parse`. Sem isso, arquivos .pdf são ignorados.
3. **Dry-run (só listar):** `node scripts/upload-crawl-to-rag.mjs --dry-run`
4. **Enviar:** `npm run rag:upload` ou `node scripts/upload-crawl-to-rag.mjs --dir=./crawl-output/camara-site --batch=5`

O script percorre o diretório recursivamente, lê o texto, fragmenta em blocos de ~28k caracteres se necessário, e chama a Edge Function **generate-embeddings** em lotes. Os itens entram na `knowledge_base` com `content_type: "crawl_document"`.

---

# Resumo rápido

| O que fazer | Onde |
|-------------|------|
| RAG com **site** | AI Applications → Data store (Website) → associar domínio → copiar Data store ID → secret `VERTEX_RAG_DATASTORE` |
| RAG com **documentos** | AI Applications (Unstructured) ou RAG Engine (corpus) → path do data store ou corpus → secret `VERTEX_RAG_DATASTORE` ou `VERTEX_RAG_CORPUS` |
| Token Vertex | Já usado pelo ai-orchestrator (Cloud Function `vertex-token` + secrets no Supabase) |

Documentação técnica detalhada: [RAG_VERTEX_CONFIGURACAO.md](./RAG_VERTEX_CONFIGURACAO.md) e [SUPABASE_SECRETS_VERTEX.md](./SUPABASE_SECRETS_VERTEX.md).
