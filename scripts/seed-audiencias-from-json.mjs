/**
 * Importa audiências do JSON do scraper (Splegis) para a tabela public.audiencias no Supabase.
 *
 * Uso:
 *   node scripts/seed-audiencias-from-json.mjs "C:\Users\Felipe\Desktop\Crawler audiencias publicas\audiencias_splegis.json"
 *
 * Variáveis de ambiente (obrigatórias):
 *   SUPABASE_URL=https://seu-projeto.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... (chave service_role, não anon)
 *
 * Opcional: LIMIT=500  (importar só os N primeiros; útil para teste)
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = resolve(__dirname, "..", ".env");
  try {
    let content = readFileSync(envPath, "utf8");
    if (content.charCodeAt(0) === 0xfeff) content = content.slice(1);
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const m = trimmed.match(/^\s*([^#=]+)=(.*)$/);
      if (m) {
        const key = m[1].trim().replace(/\r/g, "");
        const value = m[2].trim().replace(/\r/g, "").replace(/^["']|["']$/g, "");
        process.env[key] = value;
      }
    }
    if (!process.env.SUPABASE_URL && process.env.CAMARA_URL)
      process.env.SUPABASE_URL = process.env.CAMARA_URL;
  } catch (e) {
    console.error("Aviso: .env não encontrado em", envPath, "-", e.message);
  }
}

function parseDataBr(str) {
  if (!str || typeof str !== "string") return null;
  const [d, m, y] = str.trim().split(/[/-]/);
  if (!d || !m || !y) return null;
  const day = d.padStart(2, "0");
  const month = m.padStart(2, "0");
  const year = y.length === 2 ? "20" + y : y;
  return `${year}-${month}-${day}`;
}

function parseHorario(str) {
  if (!str || typeof str !== "string") return "09:00:00";
  const s = str.trim().toUpperCase();
  let hour = 9,
    minute = 0;
  const match = s.match(/(\d{1,2})\s*:\s*(\d{2})\s*(AM|PM)?/i);
  if (match) {
    hour = parseInt(match[1], 10);
    minute = parseInt(match[2], 10);
    if (match[3] === "PM" && hour < 12) hour += 12;
    if (match[3] === "AM" && hour === 12) hour = 0;
  }
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
}

function mapItem(item) {
  const dataStr = parseDataBr(item.Data) || "2000-01-01";
  const horaStr = parseHorario(item.Horario);
  const hoje = new Date().toISOString().split("T")[0];
  const status = dataStr < hoje ? "encerrada" : "agendada";

  const titulo =
    item.Comissao || item.Tema
      ? `${item.Tipo || "Audiência"}: ${(item.Comissao || item.Tema || "").slice(0, 200)}`
      : `Audiência ${item.Data || ""}`;
  const tema = (item.Comissao || item.Tema || "Geral").slice(0, 500);
  const descricao = (item.Tema || null) && item.Tema.length > 500 ? item.Tema.slice(0, 2000) : (item.Tema || null);
  const local = (item.Local || "A definir").slice(0, 500);

  return {
    titulo: titulo.slice(0, 500),
    descricao: descricao ? descricao.slice(0, 3000) : null,
    data: dataStr,
    hora: horaStr,
    local,
    tema: tema.slice(0, 500),
    status,
    vagas_disponiveis: null,
    inscricoes_abertas:
      item.FormInscricoes === 1 || (item.FormInscricoes !== 0 && status === "agendada"),
    link_transmissao: item.LinkTeleconferencia || null,
    documentos: Array.isArray(item.Projetos) && item.Projetos.length > 0 ? item.Projetos : [],
  };
}

async function main() {
  loadEnv();

  const jsonPath = process.argv[2];
  if (!jsonPath) {
    console.error("Uso: node scripts/seed-audiencias-from-json.mjs <caminho-do-audiencias_splegis.json>");
    process.exit(1);
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    const envPath = resolve(__dirname, "..", ".env");
    console.error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env na raiz do projeto.");
    console.error("Caminho esperado do .env:", envPath);
    if (!supabaseUrl) console.error("  - SUPABASE_URL (ou CAMARA_URL) está faltando.");
    if (!serviceKey) console.error("  - SUPABASE_SERVICE_ROLE_KEY está faltando (use a chave 'service_role' do Supabase).");
    process.exit(1);
  }

  let raw;
  try {
    raw = readFileSync(jsonPath, "utf8");
  } catch (e) {
    console.error("Erro ao ler arquivo:", e.message);
    process.exit(1);
  }

  let arr;
  try {
    arr = JSON.parse(raw);
  } catch (e) {
    console.error("JSON inválido:", e.message);
    process.exit(1);
  }

  if (!Array.isArray(arr)) {
    console.error("O JSON deve ser um array de audiências.");
    process.exit(1);
  }

  const limit = process.env.LIMIT ? parseInt(process.env.LIMIT, 10) : arr.length;
  const toImport = arr.slice(0, limit).map(mapItem);

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  console.log("Limpando tabela audiencias...");
  const { data: existing } = await supabase.from("audiencias").select("id");
  const ids = (existing || []).map((r) => r.id);
  if (ids.length > 0) {
    const BATCH_DELETE = 100;
    for (let i = 0; i < ids.length; i += BATCH_DELETE) {
      const chunk = ids.slice(i, i + BATCH_DELETE);
      const { error: deleteError } = await supabase.from("audiencias").delete().in("id", chunk);
      if (deleteError) {
        console.error("Erro ao limpar tabela:", deleteError.message);
        process.exit(1);
      }
    }
  }
  console.log("Tabela limpa. Importando", toImport.length, "registros...");

  const BATCH = 50;
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < toImport.length; i += BATCH) {
    const batch = toImport.slice(i, i + BATCH);
    const { data, error } = await supabase.from("audiencias").insert(batch).select("id");

    if (error) {
      console.error("Erro no lote", i / BATCH + 1, ":", error.message);
      errors += batch.length;
    } else {
      inserted += (data || []).length;
      console.log("Inseridos", inserted, "/", toImport.length);
    }
  }

  console.log("Concluído. Inseridos:", inserted, "Erros:", errors);
}

main();
