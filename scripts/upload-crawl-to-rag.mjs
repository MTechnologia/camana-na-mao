#!/usr/bin/env node
/**
 * Envia os arquivos extraídos do crawl (xml, txt, pdf, qmd) para o RAG na tabela knowledge_base (Supabase).
 * Para usar Vertex AI Applications (Unstructured documents) em vez da knowledge_base, veja docs/RAG_UPLOAD_CRAWL_AI_APPLICATIONS.md.
 * Exclui: .qml, .cpg, .dbf, .prj, .shp, .shx e outros binários.
 *
 * Uso:
 *   node scripts/upload-crawl-to-rag.mjs [--dir=./crawl-output/camara-site] [--batch=5] [--dry-run]
 *
 * Variáveis de ambiente:
 *   SUPABASE_URL              - URL do projeto (ex.: https://xxx.supabase.co)
 *   SUPABASE_SERVICE_ROLE_KEY - Chave service_role (Edge Functions → Secrets)
 *
 * Opcional para extrair texto de PDF (senão PDFs são ignorados):
 *   npm install pdf-parse
 */

import { readdirSync, readFileSync, statSync, existsSync } from "fs";
import { join, dirname, relative } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");

const DEFAULT_DIR = join(projectRoot, "crawl-output", "camara-site");
const EXT_RAG = new Set([".txt", ".xml", ".pdf", ".qmd", ".html", ".htm"]);
const EXT_SKIP = new Set([".qml", ".cpg", ".dbf", ".prj", ".shp", ".shx", ".zip"]);
const MAX_CONTENT_LENGTH = 28000;
const DEFAULT_BATCH = 5;

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v !== undefined ? v : true];
  })
);

const inputDir = args.dir || DEFAULT_DIR;
const batchSize = Math.max(1, parseInt(args.batch || String(DEFAULT_BATCH), 10) || DEFAULT_BATCH);
const dryRun = args["dry-run"] === true || args["dry-run"] === "true";

function* walkDir(dir, base = dir) {
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return;
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, name.name);
    if (name.isDirectory()) {
      if (name.name === "zip" || name.name.startsWith(".")) continue;
      yield* walkDir(full, base);
    } else {
      const ext = name.name.includes(".") ? "." + name.name.split(".").pop().toLowerCase() : "";
      if (EXT_RAG.has(ext) && !EXT_SKIP.has(ext)) yield full;
    }
  }
}

async function readText(filePath, ext) {
  const buf = readFileSync(filePath);
  if (ext === ".pdf") {
    try {
      const pdfParse = (await import("pdf-parse")).default;
      const data = await pdfParse(buf);
      return data?.text?.trim() || "";
    } catch (e) {
      console.warn(`  [skip PDF sem pdf-parse] ${filePath}`);
      return "";
    }
  }
  return buf.toString("utf-8").trim();
}

function chunkText(text, maxLen = MAX_CONTENT_LENGTH) {
  if (!text || text.length <= maxLen) return text ? [text] : [];
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    let end = start + maxLen;
    if (end < text.length) {
      const lastBreak = text.lastIndexOf("\n\n", end);
      if (lastBreak > start) end = lastBreak + 2;
      else {
        const lastSpace = text.lastIndexOf(" ", end);
        if (lastSpace > start) end = lastSpace + 1;
      }
    }
    chunks.push(text.slice(start, end).trim());
    start = end;
  }
  return chunks.filter(Boolean);
}

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!dryRun && (!supabaseUrl || !serviceKey)) {
    console.error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (ou use --dry-run).");
    process.exit(1);
  }

  const files = [...walkDir(inputDir)];
  console.log(`Diretório: ${inputDir}`);
  console.log(`Arquivos para RAG (${EXT_RAG.size} extensões): ${files.length}`);
  if (dryRun) {
    console.log("Modo --dry-run: nenhuma requisição será feita.");
    files.slice(0, 20).forEach((f) => console.log("  ", relative(inputDir, f)));
    if (files.length > 20) console.log(`  ... e mais ${files.length - 20}`);
    return;
  }

  const items = [];
  for (const filePath of files) {
    const ext = "." + filePath.split(".").pop().toLowerCase();
    const rel = relative(inputDir, filePath);
    let text;
    try {
      text = await readText(filePath, ext);
    } catch (e) {
      console.warn(`  [erro leitura] ${rel}:`, e.message);
      continue;
    }
    if (!text) continue;
    const chunks = chunkText(text);
    const baseTitle = rel.replace(/\.[^.]+$/, "").replace(/[_/\\]+/g, " ");
    chunks.forEach((content, i) => {
      items.push({
        title: chunks.length > 1 ? `${baseTitle} (parte ${i + 1}/${chunks.length})` : baseTitle,
        content,
        content_type: "crawl_document",
        source_table: "crawl_camara",
        metadata: { path: rel, extension: ext, chunk: chunks.length > 1 ? i + 1 : null, total_chunks: chunks.length > 1 ? chunks.length : null },
      });
    });
  }

  console.log(`Itens a enviar (após chunking): ${items.length}`);
  const url = `${supabaseUrl.replace(/\/$/, "")}/functions/v1/generate-embeddings`;
  let ok = 0;
  let err = 0;
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ items: batch }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error(`Batch ${Math.floor(i / batchSize) + 1}: ${res.status}`, data);
        err += batch.length;
        continue;
      }
      ok += batch.length;
      if (items.length > batchSize) process.stdout.write(`\rEnviados: ${ok}/${items.length}`);
    } catch (e) {
      console.error(`Batch ${Math.floor(i / batchSize) + 1}:`, e.message);
      err += batch.length;
    }
  }
  console.log(`\nConcluído: ${ok} ok, ${err} erro(s).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
