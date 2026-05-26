#!/usr/bin/env node
/**
 * Fase 4 — Avaliação noturna do chatbot.
 *
 * 1. Roda suíte Deno (intent + NLP + contrato de turno)
 * 2. Gera relatório HTML em tests/chatbot/reports/
 * 3. Opcional: CHATBOT_EVAL_LIVE=1 — amostra contra ai-orchestrator real (requer JWT)
 *
 * Uso:
 *   node scripts/chatbot-eval-nightly.mjs
 *   CHATBOT_EVAL_LIVE=1 CHATBOT_EVAL_JWT=... node scripts/chatbot-eval-nightly.mjs
 */

import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const reportsDir = join(root, 'tests', 'chatbot', 'reports');

const DENO_TESTS = [
  'supabase/functions/ai-orchestrator/lib-intent-detection.corpus.test.ts',
  'supabase/functions/ai-orchestrator/lib-nlp-utils.corpus.test.ts',
  'supabase/functions/ai-orchestrator/lib-turn-contract.corpus.test.ts',
];

function run(cmd, args, cwd = root) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd, shell: true });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    child.on('close', (code) => resolve({ code, stdout, stderr }));
  });
}

async function runDenoSuite() {
  const args = ['deno', 'test', '--no-check', '--allow-read', ...DENO_TESTS];
  return run('npx', args);
}

async function runLiveSample() {
  const url = process.env.VITE_SUPABASE_URL || process.env.CHATBOT_EVAL_URL;
  const anon = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.CHATBOT_EVAL_ANON_KEY;
  const jwt = process.env.CHATBOT_EVAL_JWT;

  if (!url || !anon || !jwt) {
    return {
      skipped: true,
      reason: 'Defina VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY e CHATBOT_EVAL_JWT para avaliação live',
    };
  }

  const samples = [
    { id: 'live_urban_typo', message: 'tem lixo acumulado na minha rua' },
    { id: 'live_transport_typo', message: 'onibus atrasou mt' },
    { id: 'live_services', message: 'ubs perto de mim' },
  ];

  const results = [];
  for (const s of samples) {
    const t0 = Date.now();
    try {
      const res = await fetch(`${url.replace(/\/$/, '')}/functions/v1/ai-orchestrator`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
          apikey: anon,
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: s.message }],
        }),
      });
      const text = await res.text();
      const snippet = text.slice(0, 400).replace(/\s+/g, ' ');
      results.push({
        id: s.id,
        ok: res.ok,
        status: res.status,
        ms: Date.now() - t0,
        snippet,
      });
    } catch (e) {
      results.push({
        id: s.id,
        ok: false,
        error: e instanceof Error ? e.message : String(e),
        ms: Date.now() - t0,
      });
    }
  }
  return { skipped: false, results };
}

function buildHtml({ deno, live, timestamp }) {
  const denoOk = deno.code === 0;
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Relatório chatbot — ${timestamp}</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 2rem; max-width: 960px; }
    .ok { color: #0a0; } .fail { color: #c00; }
    pre { background: #f4f4f4; padding: 1rem; overflow: auto; font-size: 12px; }
    table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
    th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
  </style>
</head>
<body>
  <h1>Bateria de testes do chatbot</h1>
  <p>Gerado em <strong>${timestamp}</strong></p>

  <h2>Suíte Deno (intent + NLP + contrato)</h2>
  <p class="${denoOk ? 'ok' : 'fail'}">${denoOk ? 'PASSOU' : 'FALHOU'} (exit ${deno.code})</p>
  <pre>${escapeHtml((deno.stdout + deno.stderr).slice(-8000))}</pre>

  <h2>Amostra live (orchestrator)</h2>
  ${live.skipped
    ? `<p><em>${escapeHtml(live.reason)}</em></p>`
  : `<table>
      <tr><th>ID</th><th>Status</th><th>ms</th><th>Trecho</th></tr>
      ${live.results.map((r) => `
        <tr>
          <td>${r.id}</td>
          <td class="${r.ok ? 'ok' : 'fail'}">${r.ok ? r.status ?? 'ok' : r.error ?? 'erro'}</td>
          <td>${r.ms ?? '-'}</td>
          <td><code>${escapeHtml(r.snippet ?? '')}</code></td>
        </tr>`).join('')}
    </table>`}

  <p><small>CI: <code>npm run test:chatbot</code> · E2E typos: <code>npx playwright test tests/e2e/chatbot-typo-</code></small></p>
</body>
</html>`;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function main() {
  console.log('[chatbot-eval] Rodando suíte Deno...');
  const deno = await runDenoSuite();
  console.log(deno.code === 0 ? '[chatbot-eval] Deno OK' : '[chatbot-eval] Deno FALHOU');

  let live = { skipped: true, reason: 'CHATBOT_EVAL_LIVE não definido' };
  if (process.env.CHATBOT_EVAL_LIVE === '1') {
    console.log('[chatbot-eval] Amostra live...');
    live = await runLiveSample();
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await mkdir(reportsDir, { recursive: true });
  const htmlPath = join(reportsDir, `report-${timestamp}.html`);
  const jsonPath = join(reportsDir, `report-${timestamp}.json`);

  const payload = { timestamp, deno: { code: deno.code }, live };
  await writeFile(jsonPath, JSON.stringify(payload, null, 2));
  await writeFile(htmlPath, buildHtml({ deno, live, timestamp }));

  console.log(`[chatbot-eval] Relatório: ${htmlPath}`);
  process.exit(deno.code === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
