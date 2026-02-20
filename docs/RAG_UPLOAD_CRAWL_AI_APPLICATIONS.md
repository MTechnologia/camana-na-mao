# Subir o crawl para AI Applications (Unstructured documents)

Guia para enviar os arquivos extraídos do crawl (pasta `crawl-output`, ~13.8 GB) para o **Vertex AI Search** como data store **Unstructured documents**, e conectar ao assistente via `VERTEX_RAG_DATASTORE`.

**Não** usa a tabela `knowledge_base` do Supabase; o RAG fica no GCP.

---

## Visão geral

1. **Criar um bucket** no Google Cloud Storage (GCS).
2. **Enviar** a pasta local `crawl-output` para o bucket (ex.: `gs://SEU_BUCKET/rag-crawl/`).
3. **Criar o Data Store** em AI Applications → Unstructured (Cloud Storage) → apontar para esse prefixo.
4. **Configurar** o secret `VERTEX_RAG_DATASTORE` no Supabase com o path do data store.

Formatos que o Vertex indexa bem: **PDF, TXT, HTML, DOCX, PPTX, Markdown**. Arquivos como .qml, .shp, .dbf, .prj, .shx, .cpg são ignorados ou não indexados; você pode subir só as extensões úteis para reduzir tamanho (opcional).

---

## Passo 1 – Bucket no GCS

1. Abra o [Google Cloud Console](https://console.cloud.google.com) e selecione o projeto (ex.: o do Câmara na Mão).
2. Vá em **Cloud Storage** → **Buckets** → **Create bucket**.
3. Nome: ex. `camara-na-mao-rag` (único no GCP).
4. Região: ex. `southamerica-east1` (São Paulo) ou `us-central1` (recomendado para AI Applications em algumas regiões — confira a doc do App Builder).
5. Crie o bucket.

---

## Passo 2 – Upload da pasta `crawl-output` para o bucket

A pasta local é: **`C:\Projetos\camana-na-mao\crawl-output`** (~13.8 GB).

### Opção A – gcloud (recomendado no Windows)

Instale o [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) e faça login.

**Descobrir o Project ID:** no [Cloud Console](https://console.cloud.google.com), o ID aparece no topo ao lado do nome do projeto (ou em **Select a project**). No terminal: `gcloud projects list`.

```powershell
gcloud auth login
gcloud config set project arcane-atom-480020-f6
```

Envie a pasta inteira (pode demorar para 13.8 GB). Bucket de exemplo: **camara_na_mao_bucket_rag**.

```powershell
cd C:\Projetos\camana-na-mao
gcloud storage cp -r .\crawl-output gs://camara_na_mao_bucket_rag/rag-crawl/
```

Ou com paralelismo para acelerar (múltiplos arquivos em paralelo):

```powershell
gcloud storage cp -r .\crawl-output gs://camara_na_mao_bucket_rag/rag-crawl/ --multiprocessing-threshold=0
```

Os arquivos ficarão em `gs://camara_na_mao_bucket_rag/rag-crawl/` (estrutura de subpastas preservada). No passo 3 do guia, use esse prefixo como **Cloud Storage location**.

### Se der timeout ("Write operation timed out")

Em conexões lentas ou arquivos grandes, alguns uploads podem falhar com `TimeoutError('The write operation timed out')`. O que fazer:

1. **Rodar de novo o mesmo comando**  
   O que já subiu permanece no bucket; só os que falharam serão tentados de novo (em nova execução, o `gcloud` não “pula” automaticamente os que já existem, mas você não perde o que já foi enviado).

2. **Reduzir paralelismo** (mais estável em rede instável)  
   Use o comando **sem** `--multiprocessing-threshold=0`, para menos uploads em paralelo:
   ```powershell
   gcloud storage cp -r .\crawl-output gs://camara_na_mao_bucket_rag/rag-crawl/
   ```
   Ou limite o número de processos (ex.: 2):
   ```powershell
   gcloud storage cp -r .\crawl-output gs://camara_na_mao_bucket_rag/rag-crawl/ -j 2
   ```

3. **Subir por partes (subpastas)**  
   Assim um timeout não atrapalha o resto. Exemplo:
   ```powershell
   cd C:\Projetos\camana-na-mao\crawl-output
   gcloud storage cp -r .\camara-site gs://camara_na_mao_bucket_rag/rag-crawl/crawl-output/
   ```
   Se dentro de `camara-site` houver muitas pastas, repita para subpastas menores (ex.: `.\camara-site\wp-content_uploads_2017` etc.).

4. **Rede**  
   Prefira rede cabeada ou Wi‑Fi estável; VPN ou link muito instável tende a dar mais timeout.

### Opção B – Subir só extensões úteis para RAG (opcional)

Para não enviar .qml, .shp, .dbf, .prj, .shx, .cpg, etc., você pode:

- Usar um script que copia só `.txt`, `.xml`, `.pdf`, `.qmd`, `.html`, `.htm`, `.docx` para uma pasta temporária e depois faz `gcloud storage cp -r` dessa pasta, ou  
- Enviar a pasta inteira; o Vertex indexa o que suporta e ignora o resto (pode só gastar mais tempo e espaço no bucket).

---

## Passo 3 – Data Store “Unstructured” no AI Applications

1. Abra **AI Applications**:  
   [https://console.cloud.google.com/gen-app-builder/data-stores](https://console.cloud.google.com/gen-app-builder/data-stores)
2. **Create Data Store**.
3. Escolha **Unstructured documents** (Cloud Storage).
4. **Cloud Storage location:** informe o prefixo do bucket onde estão os arquivos, ex.:  
   `gs://SEU_BUCKET/rag-crawl/`  
   (com a barra no final; pode usar um subdiretório se tiver organizado assim.)
5. Dê um nome ao data store (ex.: `rag-camara-crawl`) e crie.
6. Na tela do data store, anote o **Data store ID** (ex.: `rag-camara-crawl_1234567890`).

---

## Passo 4 – Path completo e secret no Supabase

1. Monte o path completo do data store:
   ```
   projects/arcane-atom-480020-f6/locations/global/collections/default_collection/dataStores/camara-na-mao-rag_1770999938229
   ```
   (Substitua `SEU_PROJECT_ID` e `SEU_DATASTORE_ID`.)

2. No **Supabase Dashboard** → projeto → **Project Settings** → **Edge Functions** → **Secrets**:
   - Crie ou edite o secret **`VERTEX_RAG_DATASTORE`**.
   - Valor: o path completo acima.
   - Salve.

O ai-orchestrator já usa esse secret para grounding em perguntas gerais; não é preciso alterar código.

---

## Passo 5 – Indexação e teste

1. No AI Applications, o data store vai **indexar** os documentos do GCS (pode levar bastante tempo para ~13.8 GB).
2. Quando a indexação estiver concluída (ou em andamento, dependendo da interface), teste no app fazendo uma pergunta que deveria ser respondida com base nos documentos (ex.: conteúdo de um PDF ou página específica do crawl).

---

## Resumo de comandos (Windows)

```powershell
# 1. Login e projeto
gcloud auth login
gcloud config set project SEU_PROJECT_ID

# 2. Upload (a partir da raiz do projeto)
cd C:\Projetos\camana-na-mao
gcloud storage cp -r .\crawl-output gs://SEU_BUCKET/rag-crawl/

# 3 e 4: Console (AI Applications + Supabase Secrets)
```

Depois disso, o RAG dos documentos do crawl estará em **AI Applications (Unstructured)** e não na `knowledge_base` do Supabase.
