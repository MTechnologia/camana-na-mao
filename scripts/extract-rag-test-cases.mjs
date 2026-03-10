/**
 * Extrai da planilha de avaliação os casos com status "aprovado parcialmente" ou "não aprovado".
 * Uso: node scripts/extract-rag-test-cases.mjs "C:\Users\Felipe\Downloads\planilha_de_avaliaa_a_o_logs_supabase_....xlsx"
 */
import XLSX from 'xlsx';
import { readFileSync } from 'fs';

const path = process.argv[2];
if (!path) {
  console.error('Uso: node scripts/extract-rag-test-cases.mjs <caminho-do-xlsx>');
  process.exit(1);
}

const buf = readFileSync(path);
const wb = XLSX.read(buf, { type: 'buffer' });

// Encontrar aba "Plano de teste executado" (pode variar capitalização/acento)
const sheetName = wb.SheetNames.find(
  (n) => n.toLowerCase().includes('plano de teste') && n.toLowerCase().includes('executado')
) || wb.SheetNames.find((n) => n.toLowerCase().includes('plano'));
if (!sheetName) {
  console.error('Abas encontradas:', wb.SheetNames.join(', '));
  process.exit(1);
}

const ws = wb.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false });

// Detectar nomes das colunas (podem vir com espaços/acentos)
const first = data[0] || {};
const keys = Object.keys(first);
const statusKey = keys.find((k) => /status/i.test(k)) || keys.find((k) => /situa[cç][aã]o/i.test(k));
const perguntaKey = keys.find((k) => /pergunta/i.test(k));
const logKey = keys.find((k) => /log\s*ai|orchestrator|supabase/i.test(k)) || keys[keys.length - 1];

if (!statusKey || !perguntaKey) {
  console.error('Colunas esperadas (Status, Pergunta). Encontradas:', keys.join(', '));
  process.exit(1);
}

const statusValues = ['aprovado parcialmente', 'não aprovado', 'nao aprovado'];
const rows = data.filter((row) => {
  const s = String((row[statusKey] || '').toLowerCase().trim());
  return statusValues.some((v) => s.includes(v) || s === v);
});

const out = rows.map((row, i) => ({
  index: i + 1,
  status: row[statusKey],
  pergunta: row[perguntaKey] || '',
  log_ai_orchestrator: row[logKey] || '',
}));

console.log(JSON.stringify(out, null, 2));
