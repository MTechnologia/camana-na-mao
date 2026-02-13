#!/usr/bin/env node
/**
 * Recoloca na fila as URLs .pdf e .docx que já estavam em "visitadas",
 * para que o crawler as baixe de novo com a extensão correta (e remova o .txt antigo).
 *
 * Uso (na pasta do projeto):
 *   node scripts/crawl-requeue-pdf-docx.mjs
 *   node scripts/crawl-requeue-pdf-docx.mjs --out=./crawl-output/camara-site
 *
 * Depois rode o crawler com --resume:
 *   node scripts/crawl-camara-site.mjs --resume --max=5000 --concurrency=8 --delay=300
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");
const DEFAULT_OUT = join(projectRoot, "crawl-output", "camara-site");

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v !== undefined ? v : true];
  })
);
const outDir = args.out || DEFAULT_OUT;
const statePath = join(outDir, ".crawl-state.json");

function getExtension(url) {
  try {
    const path = new URL(url).pathname;
    const last = path.split("/").pop() || "";
    const dot = last.lastIndexOf(".");
    if (dot <= 0) return "";
    return last.slice(dot).toLowerCase();
  } catch {
    return "";
  }
}

if (!existsSync(statePath)) {
  console.error("Arquivo de estado não encontrado:", statePath);
  process.exit(1);
}

const data = JSON.parse(readFileSync(statePath, "utf8"));
const visited = new Set(data.visited || []);
const queue = Array.isArray(data.queue) ? data.queue : [];

const toRequeue = [];
visited.forEach((url) => {
  const ext = getExtension(url);
  if (ext === ".pdf" || ext === ".docx") toRequeue.push(url);
});
toRequeue.forEach((url) => visited.delete(url));
const newQueue = [...toRequeue, ...queue];

writeFileSync(
  statePath,
  JSON.stringify({ visited: [...visited], queue: newQueue }, null, 2),
  "utf8"
);

console.log(`Removidas de "visitadas" e recolocadas na fila: ${toRequeue.length} URLs (.pdf/.docx).`);
console.log(`Próximo passo: node scripts/crawl-camara-site.mjs --resume --max=N ...`);
