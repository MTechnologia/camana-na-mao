/**
 * Extrai da planilha (aba "plano de teste executado") colunas A, C e F.
 * Filtra linhas onde coluna F não é "Resposta OK".
 * Uso: node scripts/extract-planilha-plano-executado.mjs "C:\Users\Felipe\Downloads\planilha_final_20260308162104753.xlsx"
 */
import XLSX from 'xlsx';
import { readFileSync } from 'fs';

const path = process.argv[2];
if (!path) {
  console.error('Uso: node scripts/extract-planilha-plano-executado.mjs <caminho-do-xlsx>');
  process.exit(1);
}

const buf = readFileSync(path);
const wb = XLSX.read(buf, { type: 'buffer' });

const sheetName = wb.SheetNames.find(
  (n) => n.toLowerCase().includes('plano de teste') && n.toLowerCase().includes('executado')
) || wb.SheetNames.find((n) => n.toLowerCase().includes('plano'));
if (!sheetName) {
  console.error('Abas encontradas:', wb.SheetNames.join(', '));
  process.exit(1);
}

const ws = wb.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

if (!data.length) {
  console.error('Aba vazia.');
  process.exit(1);
}

// Colunas A=0, C=2, F=5
const COL_A = 0;
const COL_C = 2;
const COL_F = 5;

const header = data[0];
const rows = [];
for (let i = 1; i < data.length; i++) {
  const row = data[i];
  const valA = String(row[COL_A] ?? '').trim();
  const valC = String(row[COL_C] ?? '').trim();
  const valF = String(row[COL_F] ?? '').trim();
  const isRespostaOk = /^Resposta OK\.?$/i.test(valF);
  if (valF && !isRespostaOk) {
    rows.push({
      linha: i + 1,
      col_A: valA,
      col_C: valC,
      col_F: valF,
    });
  }
}

console.log(JSON.stringify(rows, null, 2));
console.error('\nTotal (F != Resposta OK):', rows.length);
