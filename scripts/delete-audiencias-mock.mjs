/**
 * Remove as 5 audiências de exemplo/mock que não vêm do import real (Splegis).
 * Uso: node scripts/delete-audiencias-mock.mjs
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

const TITULOS_MOCK = [
  "Audiência: Mobilidade Urbana 2025",
  "Audiência: Educação e Tecnologia",
  "Audiência: Habitação Popular",
  "Audiência: Meio Ambiente e Sustentabilidade",
  "Audiência: Saúde Pública Municipal",
];

async function main() {
  loadEnv();
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const { data: rows } = await supabase.from("audiencias").select("id, titulo").in("titulo", TITULOS_MOCK);
  if (!rows?.length) {
    console.log("Nenhuma das audiências mock encontrada. Nada a remover.");
    return;
  }

  const ids = rows.map((r) => r.id);
  const { error } = await supabase.from("audiencias").delete().in("id", ids);
  if (error) {
    console.error("Erro ao remover:", error.message);
    process.exit(1);
  }
  console.log("Removidas", ids.length, "audiências mock:", rows.map((r) => r.titulo).join("; "));
}

main();
