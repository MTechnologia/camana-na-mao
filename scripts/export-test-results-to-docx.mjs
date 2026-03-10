/**
 * Exporta os resultados dos testes Playwright para um arquivo .docx
 * Uso: node scripts/export-test-results-to-docx.mjs
 * Requer: npm install docx --save-dev
 *
 * Rode os testes antes: npx playwright test
 * O reporter JSON deve estar configurado em playwright.config.ts
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const RESULTS_JSON = join(ROOT, 'test-results', 'results.json');
const OUTPUT_DOCX = join(ROOT, 'test-results', 'relatorio-testes-e2e.docx');

// Tentar importar docx - falhar com mensagem clara se não instalado
let docx;
try {
  docx = await import('docx');
} catch (e) {
  console.error('Erro: pacote "docx" não encontrado. Execute: npm install docx --save-dev');
  process.exit(1);
}

const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle } = docx;

function collectTests(suites, acc = []) {
  for (const suite of suites || []) {
    for (const spec of suite.specs || []) {
      for (const test of spec.tests || []) {
        for (const result of test.results || []) {
          acc.push({
            title: spec.title || test.title || 'Teste',
            project: test.projectName || '',
            status: result.status || 'unknown',
            duration: result.duration ?? 0,
            error: result.error?.message,
          });
        }
      }
    }
    collectTests(suite.suites, acc);
  }
  return acc;
}

function main() {
  if (!existsSync(RESULTS_JSON)) {
    console.error('Arquivo de resultados não encontrado:', RESULTS_JSON);
    console.error('Execute os testes primeiro: npx playwright test');
    process.exit(1);
  }

  const raw = readFileSync(RESULTS_JSON, 'utf-8');
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    console.error('Erro ao parsear JSON:', e.message);
    process.exit(1);
  }

  const tests = collectTests(data.suites || []);
  const passed = tests.filter(t => t.status === 'passed');
  const failed = tests.filter(t => t.status === 'failed' || t.status === 'timedOut');
  const skipped = tests.filter(t => t.status === 'skipped');

  const tableRows = [
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Teste', bold: true })] })], width: { size: 60, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Projeto', bold: true })] })], width: { size: 15, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Status', bold: true })] })], width: { size: 10, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Duração (ms)', bold: true })] })], width: { size: 15, type: WidthType.PERCENTAGE } }),
      ],
    }),
    ...tests.map(t => new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: t.title || '' })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: t.project || '' })] })] }),
        new TableCell({
          children: [new Paragraph({
            children: [new TextRun({
              text: t.status,
              color: t.status === 'passed' ? '008000' : t.status === 'failed' || t.status === 'timedOut' ? 'CC0000' : '666666',
            })],
          })],
        }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(Math.round(t.duration)) })] })] }),
      ],
    })),
  ];

  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          children: [new TextRun({ text: 'Relatório de Testes E2E - Câmara na Mão', bold: true, size: 32 })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: `Total: ${tests.length} testes | `, bold: true }),
            new TextRun({ text: `Passaram: ${passed.length}`, color: '008000', bold: true }),
            new TextRun({ text: ' | ' }),
            new TextRun({ text: `Falharam: ${failed.length}`, color: 'CC0000', bold: true }),
            new TextRun({ text: skipped.length ? ` | Pulados: ${skipped.length}` : '' }),
          ],
          spacing: { after: 200 },
        }),
        new Paragraph({ children: [new TextRun({ text: ' ' })], spacing: { after: 200 } }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.SINGLE },
            bottom: { style: BorderStyle.SINGLE },
            left: { style: BorderStyle.SINGLE },
            right: { style: BorderStyle.SINGLE },
          },
          rows: tableRows,
        }),
      ],
    }],
  });

  Packer.toBuffer(doc).then(buffer => {
    writeFileSync(OUTPUT_DOCX, buffer);
    console.log('Relatório gerado:', OUTPUT_DOCX);
    console.log(`  ${tests.length} testes | ${passed.length} passaram | ${failed.length} falharam`);
  }).catch(err => {
    console.error('Erro ao gerar docx:', err);
    process.exit(1);
  });
}

main();
