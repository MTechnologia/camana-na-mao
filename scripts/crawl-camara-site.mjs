#!/usr/bin/env node
/**
 * Crawler do site da Câmara (www.saopaulo.sp.leg.br).
 * Extrai/salva apenas: HTML (texto → .txt), PDF (.pdf), TXT (.txt), DOCX (.docx).
 * Ignora: MP3, JPG, PNG e demais extensões de mídia/arquivo.
 *
 * Uso:
 *   node scripts/crawl-camara-site.mjs [--out=./crawl-output] [--max=500] [--delay=1000]
 *   node scripts/crawl-camara-site.mjs --resume --max=1000   # continua de onde parou
 *   node scripts/crawl-camara-site.mjs --resume --max=2000 --concurrency=8 --delay=300   # mais rápido
 *
 * Dependência: npm install cheerio
 */

import { createWriteStream, mkdirSync, readFileSync, writeFileSync, existsSync, unlinkSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");

const BASE_URL = "https://www.saopaulo.sp.leg.br";
const DEFAULT_OUT = join(projectRoot, "crawl-output", "camara-site");
const DEFAULT_MAX_PAGES = 500;
const DEFAULT_DELAY_MS = 1200;
const DEFAULT_CONCURRENCY = 1;

// Extensões que serão baixadas/extraídas: PDF (binário), TXT, DOCX (binário), HTML (texto extraído → .txt)
const ALLOWED_FILE_EXT = new Set([".pdf", ".txt", ".docx", ".html", ".htm"]);
// Extensões ignoradas (não baixar, não enfileirar): áudio, imagem, vídeo, etc.
const SKIP_EXT = new Set([
  ".mp3", ".wav", ".ogg", ".m4a", ".aac",
  ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".ico", ".svg",
  ".mp4", ".webm", ".avi", ".mov", ".wmv",
  ".css", ".js", ".map", ".xml", ".json",
  ".zip", ".rar", ".7z", ".exe",
]);

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v !== undefined ? v : true];
  })
);
if (args.concurency !== undefined) args.concurrency = args.concurency;

const outDir = args.out || DEFAULT_OUT;
const maxPagesRaw = parseInt(args.max || String(DEFAULT_MAX_PAGES), 10);
const maxPages = Number.isFinite(maxPagesRaw) ? maxPagesRaw : DEFAULT_MAX_PAGES;
const delayMsRaw = parseInt(args.delay || String(DEFAULT_DELAY_MS), 10);
const delayMs = Number.isFinite(delayMsRaw) && delayMsRaw >= 0 ? delayMsRaw : DEFAULT_DELAY_MS;
const concurrencyRaw = parseInt(args.concurrency || String(DEFAULT_CONCURRENCY), 10);
const concurrency = Number.isFinite(concurrencyRaw) && concurrencyRaw >= 1 ? Math.min(concurrencyRaw, 20) : 1;
const resume = args.resume === true || args.resume === "true";
const STATE_FILE = join(outDir, ".crawl-state.json");
const SAVE_STATE_EVERY = 25;

let cheerio;
try {
  cheerio = (await import("cheerio")).load;
} catch {
  console.error("Erro: instale cheerio com: npm install cheerio");
  process.exit(1);
}

function normalizeUrl(url) {
  try {
    const u = new URL(url, BASE_URL);
    if (u.origin !== new URL(BASE_URL).origin) return null;
    u.hash = "";
    u.searchParams.sort();
    let path = u.pathname.replace(/\/+/g, "/") || "/";
    if (path !== "/" && path.endsWith("/")) path = path.slice(0, -1);
    return u.origin + path + (u.search || "");
  } catch {
    return null;
  }
}

function getExtension(url) {
  const u = new URL(url);
  const path = u.pathname;
  const last = path.split("/").pop() || "";
  const dot = last.lastIndexOf(".");
  if (dot <= 0) return "";
  return last.slice(dot).toLowerCase();
}

function pathToFilename(url) {
  const u = new URL(url);
  let path = u.pathname.replace(/\/+/g, "_").replace(/^_|_$/g, "") || "index";
  if (path.length > 150) path = path.slice(0, 150);
  const safe = path.replace(/[^a-zA-Z0-9_.-]/g, "_");
  const ext = getExtension(url);
  if (ext === ".pdf" || ext === ".txt" || ext === ".docx") return (safe || "index") + ext;
  if (ext === ".html" || ext === ".htm") return (safe || "index") + ".txt";
  return (safe || "index") + ".txt";
}

function extractText($) {
  $("script, style, nav, footer, .menu, .cookie, iframe, noscript").remove();
  const main =
    $("main").length ? $("main").first() : $("article").length ? $("article").first() : $.root();
  const text = (main.length ? main : $.root())
    .find("p, h1, h2, h3, h4, li, td, th, figcaption, .content, .post")
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean)
    .join("\n\n");
  return text.replace(/\n{3,}/g, "\n\n").trim();
}

function extractLinks($, pageUrl) {
  const links = new Set();
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("javascript:"))
      return;
    const full = normalizeUrl(href);
    if (!full || !full.startsWith(BASE_URL)) return;
    const ext = getExtension(full);
    if (SKIP_EXT.has(ext)) return;
    links.add(full);
  });
  return [...links];
}

async function fetchWithRetry(url, opts = {}) {
  const { retries = 3, binary = false } = opts;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "CâmaraNaMao-RAG-Crawler/1.0 (contato@mtechnologia.com.br)" },
        redirect: "follow",
      });
      if (res.ok) return binary ? await res.arrayBuffer() : await res.text();
      if (res.status === 404 || res.status === 403) return null;
    } catch (e) {
      if (i === retries - 1) throw e;
    }
    await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
  }
  return null;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function loadState() {
  if (!existsSync(STATE_FILE)) return null;
  try {
    const data = JSON.parse(readFileSync(STATE_FILE, "utf8"));
    return {
      visited: new Set(data.visited || []),
      queue: Array.isArray(data.queue) ? data.queue : [],
    };
  } catch {
    return null;
  }
}

function saveState(visited, queue) {
  try {
    writeFileSync(
      STATE_FILE,
      JSON.stringify({
        visited: [...visited],
        queue: [...queue],
      }),
      "utf8"
    );
  } catch (e) {
    console.warn("Aviso: não foi possível salvar estado:", e.message);
  }
}

async function run() {
  mkdirSync(outDir, { recursive: true });
  let visited = new Set();
  let queue = [BASE_URL + "/"];
  let done = 0;
  let totalBefore = 0;

  if (resume) {
    const state = loadState();
    if (state && (state.visited.size > 0 || state.queue.length > 0)) {
      visited = state.visited;
      queue = state.queue;
      totalBefore = visited.size;
      console.log(`(Resumo) Carregadas ${visited.size} URLs já visitadas e ${queue.length} na fila.\n`);
    }
  }

  console.log(`Crawler: ${BASE_URL}`);
  console.log(`Saída: ${outDir}`);
  console.log(`Máx. páginas: ${maxPages} | Delay: ${delayMs}ms | Concorrência: ${concurrency}`);
  if (resume && totalBefore > 0) console.log(`Total já extraídas antes: ${totalBefore}`);
  console.log("");

  async function processOneUrl(norm) {
    const ext = getExtension(norm);
    if (SKIP_EXT.has(ext)) return [];

    const filename = pathToFilename(norm);
    const filepath = join(outDir, filename);

    if (ext === ".pdf" || ext === ".docx") {
      const buf = await fetchWithRetry(norm, { binary: true });
      if (!buf || !(buf instanceof ArrayBuffer)) return [];
      const oldTxtPath = filepath.slice(0, -ext.length) + ".txt";
      if (existsSync(oldTxtPath)) {
        try {
          unlinkSync(oldTxtPath);
        } catch (e) {
          console.warn("Aviso: não foi possível remover .txt antigo:", oldTxtPath, e.message);
        }
      }
      writeFileSync(filepath, Buffer.from(buf));
      return [];
    }

    if (ext === ".txt") {
      const text = await fetchWithRetry(norm);
      if (text == null) return [];
      const content = `URL: ${norm}\n\n${typeof text === "string" ? text : ""}`;
      writeFileSync(filepath, content, "utf8");
      return [];
    }

    const html = await fetchWithRetry(norm);
    if (!html) return [];
    const $ = cheerio(html);
    const title = $("title").text().trim() || norm;
    const body = extractText($);
    const links = extractLinks($, norm);
    const content = `URL: ${norm}\nTítulo: ${title}\n\n${body}`;
    await new Promise((resolve, reject) => {
      const w = createWriteStream(filepath, { encoding: "utf8" });
      w.on("finish", resolve);
      w.on("error", reject);
      w.write(content);
      w.end();
    });
    return links;
  }

  const pending = new Set();
  while (done < maxPages && (queue.length > 0 || pending.size > 0)) {
    while (queue.length > 0 && pending.size < concurrency && done < maxPages) {
      const url = queue.shift();
      const norm = normalizeUrl(url);
      if (!norm || visited.has(norm)) continue;
      visited.add(norm);
      if (SKIP_EXT.has(getExtension(norm))) continue;
      const p = processOneUrl(norm)
        .then((links) => {
          for (const link of links) {
            const n = normalizeUrl(link);
            if (n && !visited.has(n)) queue.push(n);
          }
          pending.delete(p);
          done++;
          if (done % SAVE_STATE_EVERY === 0) saveState(visited, queue);
          console.log(`[${done}/${maxPages}] ${norm} (total: ${visited.size})`);
        })
        .catch((err) => {
          pending.delete(p);
          console.warn(`Erro ${norm}:`, err.message);
        });
      pending.add(p);
      if (delayMs > 0) await sleep(Math.max(0, Math.floor(delayMs / Math.max(1, concurrency))));
    }
    if (pending.size > 0) await Promise.race(pending);
    else break;
  }

  if (pending.size > 0) await Promise.all(pending);

  saveState(visited, queue);
  console.log(`\nConcluído: ${done} páginas nesta execução. Total extraídas: ${visited.size} em ${outDir}`);
  if (queue.length > 0) {
    console.log(`Fila restante: ${queue.length} URLs. Rode com --resume --max=N para continuar.`);
  }
  console.log("Próximo passo: envie a pasta para um bucket GCS e crie um Data Store (Unstructured) no AI Applications.");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
