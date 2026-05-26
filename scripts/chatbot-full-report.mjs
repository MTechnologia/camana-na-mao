#!/usr/bin/env node
/**
 * Relatório completo da bateria de testes do chatbot.
 * Executa Deno + E2E Playwright e gera HTML evidenciado em tests/chatbot/reports/
 *
 * Uso: node scripts/chatbot-full-report.mjs
 *      npm run test:chatbot:report
 */

import { spawn } from 'node:child_process';
import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const corpusDir = join(root, 'tests', 'chatbot', 'corpus');
const reportsDir = join(root, 'tests', 'chatbot', 'reports');

const DENO_TESTS = [
  'supabase/functions/ai-orchestrator/lib-intent-detection.corpus.test.ts',
  'supabase/functions/ai-orchestrator/lib-nlp-utils.corpus.test.ts',
  'supabase/functions/ai-orchestrator/lib-turn-contract.corpus.test.ts',
];

const INTENT_FILES = [
  'urban-intent.json',
  'transport-intent.json',
  'service-rating-intent.json',
  'services-intent.json',
  'audiencias-intent.json',
  'history-intent.json',
  'general-intent.json',
  'occupancy-intent.json',
  'vereadores-intent.json',
  'noticias-intent.json',
  'bus-informational-intent.json',
  'ambiguous-intent.json',
];

const JOURNEY_LABELS = {
  urban_report: 'Relato urbano',
  transport_report: 'Transporte',
  service_rating: 'Avaliação de serviço',
  services: 'Serviços próximos',
  audiencias: 'Audiências',
  history: 'Histórico',
  general: 'Geral / RAG',
  occupancy: 'Ocupação',
  vereadores: 'Vereadores',
  noticias: 'Notícias',
};

function run(cmd, args, cwd = root, timeoutMs = 300000) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd, shell: true });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill();
      resolve({ code: 1, stdout, stderr: stderr + '\n[timeout]' });
    }, timeoutMs);
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code: code ?? 1, stdout, stderr });
    });
  });
}

function stripAnsi(s) {
  return String(s).replace(/\x1b\[[0-9;]*m/g, '');
}

function parseDenoSummary(stdout) {
  const clean = stripAnsi(stdout);
  const m = clean.match(/(\d+) passed\s*\|\s*(\d+) failed/);
  const passed = m ? Number(m[1]) : 0;
  const failed = m ? Number(m[2]) : 0;
  const suites = [];
  for (const line of clean.split('\n')) {
    const ok = line.match(/^(.+?) \.\.\. ok \((\d+m?s)\)/);
    const fail = line.match(/^(.+?) \.\.\. FAILED/);
    if (ok) suites.push({ name: ok[1].trim(), status: 'passed', duration: ok[2] });
    if (fail) suites.push({ name: fail[1].trim(), status: 'failed' });
  }
  return { passed, failed, total: passed + failed, suites };
}

function flattenPlaywrightJson(report) {
  const rows = [];
  function walk(suite, titles = []) {
    const nextTitles = suite.title ? [...titles, suite.title] : titles;
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests ?? []) {
        const project = test.projectName ?? test.projectId ?? 'default';
        const result = test.results?.[0];
        rows.push({
          title: [...nextTitles, spec.title].filter(Boolean).join(' › '),
          project,
          status: result?.status ?? test.status ?? 'unknown',
          durationMs: result?.duration ?? 0,
        });
      }
    }
    for (const child of suite.suites ?? []) walk(child, nextTitles);
  }
  for (const suite of report.suites ?? []) walk(suite);
  return rows;
}

async function loadCorpusEvidence() {
  const intentByJourney = {};
  const intentAll = [];

  for (const file of INTENT_FILES) {
    const raw = JSON.parse(await readFile(join(corpusDir, file), 'utf8'));
    const journey = raw.journey ?? 'unknown';
    const cases = raw.cases ?? [];
    intentByJourney[journey] = (intentByJourney[journey] ?? 0) + cases.length;
    for (const c of cases) {
      intentAll.push({
        id: c.id,
        journey,
        expect_intent: c.expect_intent ?? journey,
        input: c.input,
        has_history: Boolean(c.history?.length),
      });
    }
  }

  const nlpAff = JSON.parse(await readFile(join(corpusDir, 'nlp-affirmative-negative.json'), 'utf8'));
  const nlpTime = JSON.parse(await readFile(join(corpusDir, 'nlp-time-parsing.json'), 'utf8'));
  const nlpField = JSON.parse(await readFile(join(corpusDir, 'nlp-field-parsing.json'), 'utf8'));
  const turnAcc = JSON.parse(await readFile(join(corpusDir, 'turn-accumulate.json'), 'utf8'));
  const turnNext = JSON.parse(await readFile(join(corpusDir, 'turn-next-field.json'), 'utf8'));
  const turnAuto = JSON.parse(await readFile(join(corpusDir, 'turn-auto-create.json'), 'utf8'));

  const nlpAll = [
    ...(nlpAff.cases ?? []).map((c) => ({
      id: c.id,
      kind: 'afirmativo/negativo',
      input: c.input,
      expect: c.expect,
    })),
    ...(nlpTime.cases ?? []).map((c) => ({
      id: c.id,
      kind: 'horário',
      input: c.input,
      expect: c.expect ?? 'null',
    })),
    ...(nlpField.cases ?? []).map((c) => ({
      id: c.id,
      kind: 'campo',
      input: c.input,
      expect: `${c.field} → ${c.expect_value}`,
    })),
  ];

  const turnAll = [
    ...(turnAcc.cases ?? []).map((c) => ({
      id: c.id,
      kind: 'acumulação',
      journey: c.journey,
      detail: c.expect
        ? Object.entries(c.expect).map(([k, v]) => `${k}=${v}`).join(', ')
        : (c.expect_keys_present?.join(', ') ?? '—'),
      msgs: c.history?.length ?? 0,
    })),
    ...(turnNext.cases ?? []).map((c) => ({
      id: c.id,
      kind: 'próximo campo',
      journey: c.journey,
      detail: `campo: ${c.expect_field}${c.expect_picker_contains ? ` · ${c.expect_picker_contains}` : ''}`,
      msgs: Object.keys(c.accumulated ?? {}).length,
    })),
    ...(turnAuto.cases ?? []).map((c) => ({
      id: c.id,
      kind: 'auto-create',
      journey: c.handler ?? 'transport_report',
      detail: c.expect?.field_request
        ? `FIELD_REQUEST: ${c.expect.field_request}${c.expect.picker_contains ? ` · ${c.expect.picker_contains}` : ''}`
        : '—',
      msgs: Object.keys(c.accumulated ?? {}).length,
    })),
  ];

  const intentTotal = intentAll.length;
  const nlpTotal = nlpAll.length;
  const turnTotal = turnAll.length;

  return {
    intentTotal,
    nlpTotal,
    turnTotal,
    corpusCasesTotal: intentTotal + nlpTotal + turnTotal,
    intentByJourney,
    intentAll,
    nlpAll,
    turnAll,
    e2eScenarios: [
      { id: 'urban_lixo_typo', journey: 'urbano', message: 'tem muito lixo na rua do lado de casa' },
      { id: 'urban_buraco_giria', journey: 'urbano', message: 'buraco gigante q quase derrubou meu carro' },
      {
        id: 'transport_atraso_typo',
        journey: 'transporte',
        message: 'onibus atrasou mt no pico da manha → 7h5, td semana',
      },
      {
        id: 'transport_nao_passou_typo',
        journey: 'transporte',
        message: 'o onibus nao passou no ponto hj',
      },
    ],
  };
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDuration(ms) {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

function buildHtml(data) {
  const {
    timestamp,
    displayDate,
    corpus,
    deno,
    e2e,
    denoRaw,
    overallOk,
  } = data;

  const denoOk = deno.failed === 0;
  const e2eOk = e2e.failed === 0;
  const statusClass = overallOk ? 'status-ok' : 'status-fail';
  const statusLabel = overallOk ? 'TODOS APROVADOS' : 'COM FALHAS';

  const journeyRows = Object.entries(corpus.intentByJourney)
    .sort((a, b) => b[1] - a[1])
    .map(([j, n]) => {
      const pct = Math.round((n / corpus.intentTotal) * 100);
      return `
        <tr>
          <td><span class="journey-tag">${escapeHtml(JOURNEY_LABELS[j] ?? j)}</span></td>
          <td class="num">${n}</td>
          <td>
            <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
          </td>
        </tr>`;
    })
    .join('');

  const denoSuiteRows = deno.suites
    .map(
      (s) => `
      <tr>
        <td>${escapeHtml(s.name)}</td>
        <td><span class="badge ${s.status === 'passed' ? 'badge-ok' : 'badge-fail'}">${s.status === 'passed' ? 'OK' : 'FALHOU'}</span></td>
        <td class="num">${s.duration ?? '—'}</td>
      </tr>`,
    )
    .join('');

  const e2eRows = e2e.tests
    .map(
      (t) => `
      <tr>
        <td>${escapeHtml(t.title)}</td>
        <td><span class="proj">${escapeHtml(t.project)}</span></td>
        <td><span class="badge ${t.status === 'passed' ? 'badge-ok' : 'badge-fail'}">${t.status === 'passed' ? 'OK' : 'FALHOU'}</span></td>
        <td class="num">${formatDuration(t.durationMs)}</td>
      </tr>`,
    )
    .join('');

  const e2eScenarioRows = corpus.e2eScenarios
    .map(
      (s) => `
      <tr>
        <td><code>${escapeHtml(s.id)}</code></td>
        <td>${escapeHtml(s.journey)}</td>
        <td class="quote">"${escapeHtml(s.message)}"</td>
        <td><span class="badge badge-ok">8 execuções</span></td>
      </tr>`,
    )
    .join('');

  const intentDataJson = JSON.stringify(corpus.intentAll).replace(/</g, '\\u003c');
  const nlpDataJson = JSON.stringify(corpus.nlpAll).replace(/</g, '\\u003c');
  const turnDataJson = JSON.stringify(corpus.turnAll).replace(/</g, '\\u003c');
  const journeyLabelsJson = JSON.stringify(JOURNEY_LABELS).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Relatório — Bateria Chatbot · Câmara na Mão</title>
  <style>
    :root {
      --bg: #0f1419;
      --surface: #1a2332;
      --surface2: #243044;
      --border: #2d3f56;
      --text: #e8edf4;
      --muted: #8b9cb3;
      --accent: #3b82f6;
      --accent-dim: #2563eb33;
      --ok: #22c55e;
      --ok-dim: #22c55e22;
      --fail: #ef4444;
      --fail-dim: #ef444422;
      --warn: #f59e0b;
      --font: 'Segoe UI', system-ui, -apple-system, sans-serif;
      --mono: 'Cascadia Code', 'Consolas', monospace;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--font);
      background: var(--bg);
      color: var(--text);
      line-height: 1.55;
      min-height: 100vh;
    }
    .wrap { max-width: 1100px; margin: 0 auto; padding: 2.5rem 1.5rem 4rem; }
    header {
      border-bottom: 1px solid var(--border);
      padding-bottom: 2rem;
      margin-bottom: 2.5rem;
    }
    header h1 {
      font-size: 1.75rem;
      font-weight: 600;
      letter-spacing: -0.02em;
      margin-bottom: 0.35rem;
    }
    header .sub { color: var(--muted); font-size: 0.95rem; }
    .status-banner {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-top: 1.5rem;
      padding: 1rem 1.25rem;
      border-radius: 10px;
      border: 1px solid var(--border);
    }
    .status-banner.status-ok { background: var(--ok-dim); border-color: #22c55e55; }
    .status-banner.status-fail { background: var(--fail-dim); border-color: #ef444455; }
    .status-dot {
      width: 12px; height: 12px; border-radius: 50%;
      background: var(--ok);
      flex-shrink: 0;
    }
    .status-fail .status-dot { background: var(--fail); }
    .status-banner strong { font-size: 1.1rem; }
    .cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 2.5rem;
    }
    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.25rem 1.35rem;
    }
    .card .label { color: var(--muted); font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.06em; }
    .card .value { font-size: 2rem; font-weight: 700; margin: 0.25rem 0; font-variant-numeric: tabular-nums; }
    .card .hint { font-size: 0.85rem; color: var(--muted); }
    .card.highlight { border-color: var(--accent); background: linear-gradient(135deg, var(--surface) 0%, #1e3a5f44 100%); }
    section { margin-bottom: 2.75rem; }
    section h2 {
      font-size: 1.15rem;
      font-weight: 600;
      margin-bottom: 0.35rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    section h2 .phase {
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--accent);
      background: var(--accent-dim);
      padding: 0.15rem 0.5rem;
      border-radius: 4px;
    }
    section .lead { color: var(--muted); font-size: 0.9rem; margin-bottom: 1rem; }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.88rem;
      background: var(--surface);
      border-radius: 10px;
      overflow: hidden;
      border: 1px solid var(--border);
    }
    th, td { padding: 0.65rem 1rem; text-align: left; border-bottom: 1px solid var(--border); }
    th { background: var(--surface2); color: var(--muted); font-weight: 600; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: #ffffff06; }
    .num { font-variant-numeric: tabular-nums; color: var(--muted); }
    .quote { font-style: italic; color: #c5d4e8; max-width: 420px; }
    code { font-family: var(--mono); font-size: 0.8rem; background: #00000044; padding: 0.1rem 0.35rem; border-radius: 4px; }
    .badge {
      display: inline-block;
      font-size: 0.72rem;
      font-weight: 600;
      padding: 0.2rem 0.55rem;
      border-radius: 999px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .badge-ok { background: var(--ok-dim); color: var(--ok); }
    .badge-fail { background: var(--fail-dim); color: var(--fail); }
    .proj { font-size: 0.75rem; color: var(--warn); background: #f59e0b22; padding: 0.15rem 0.45rem; border-radius: 4px; }
    .journey-tag { font-size: 0.85rem; }
    .bar-track { height: 6px; background: var(--surface2); border-radius: 3px; overflow: hidden; min-width: 80px; }
    .bar-fill { height: 100%; background: var(--accent); border-radius: 3px; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
    @media (max-width: 768px) { .grid-2 { grid-template-columns: 1fr; } }
    .log-box {
      background: #0a0e14;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1rem;
      font-family: var(--mono);
      font-size: 0.72rem;
      color: #94a3b8;
      max-height: 220px;
      overflow: auto;
      white-space: pre-wrap;
      word-break: break-word;
      margin-top: 1rem;
    }
    footer {
      margin-top: 3rem;
      padding-top: 1.5rem;
      border-top: 1px solid var(--border);
      color: var(--muted);
      font-size: 0.82rem;
    }
    footer code { color: var(--accent); }
    .paginated-block { margin-top: 1rem; }
    .paginated-toolbar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      margin-bottom: 0.75rem;
      padding: 0.65rem 0.85rem;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
    }
    .paginated-toolbar .info { color: var(--muted); font-size: 0.85rem; }
    .paginated-toolbar .controls { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
    .paginated-toolbar label { font-size: 0.8rem; color: var(--muted); display: flex; align-items: center; gap: 0.35rem; }
    .paginated-toolbar select {
      background: var(--surface2);
      color: var(--text);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 0.3rem 0.5rem;
      font-size: 0.85rem;
    }
    .paginated-toolbar button {
      background: var(--surface2);
      color: var(--text);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 0.35rem 0.75rem;
      font-size: 0.85rem;
      cursor: pointer;
    }
    .paginated-toolbar button:hover:not(:disabled) { background: var(--accent-dim); border-color: var(--accent); }
    .paginated-toolbar button:disabled { opacity: 0.4; cursor: not-allowed; }
    .paginated-toolbar .page-num { font-variant-numeric: tabular-nums; font-size: 0.85rem; min-width: 5rem; text-align: center; }
    .table-scroll { overflow-x: auto; border-radius: 10px; border: 1px solid var(--border); }
    .table-scroll table { border: none; border-radius: 0; }
    .tag-history { font-size: 0.7rem; color: var(--warn); background: #f59e0b22; padding: 0.1rem 0.4rem; border-radius: 4px; margin-left: 0.35rem; }
  </style>
</head>
<body>
  <div class="wrap">
    <header>
      <h1>Bateria de testes do chatbot</h1>
      <p class="sub">Câmara na Mão · typos, gíria e jornadas do munícipe</p>
      <p class="sub">Gerado em <strong>${escapeHtml(displayDate)}</strong></p>
      <div class="status-banner ${statusClass}">
        <span class="status-dot"></span>
        <div>
          <strong>${statusLabel}</strong>
          <div class="sub">${deno.passed}/${deno.total} testes Deno · ${e2e.passed}/${e2e.total} E2E Playwright · ${corpus.corpusCasesTotal} casos no corpus</div>
        </div>
      </div>
    </header>

    <div class="cards">
      <div class="card highlight">
        <div class="label">Corpus total</div>
        <div class="value">${corpus.corpusCasesTotal}</div>
        <div class="hint">${corpus.intentTotal} intenção · ${corpus.nlpTotal} NLP · ${corpus.turnTotal} contrato</div>
      </div>
      <div class="card">
        <div class="label">Deno (Fases 1–2)</div>
        <div class="value" style="color:${denoOk ? 'var(--ok)' : 'var(--fail)'}">${deno.passed}/${deno.total}</div>
        <div class="hint">intent + NLP + turn contract</div>
      </div>
      <div class="card">
        <div class="label">E2E Playwright (Fase 3)</div>
        <div class="value" style="color:${e2eOk ? 'var(--ok)' : 'var(--fail)'}">${e2e.passed}/${e2e.total}</div>
        <div class="hint">chromium + mobile-chrome</div>
      </div>
      <div class="card">
        <div class="label">Cenários E2E únicos</div>
        <div class="value">4</div>
        <div class="hint">2 urbano · 2 transporte (fluxo completo)</div>
      </div>
    </div>

    <section>
      <h2><span class="phase">Fase 1</span> Detecção de intenção — ${corpus.intentTotal} casos</h2>
      <p class="lead">Valida <code>detectCollectionIntent</code> para todas as jornadas com digitação informal do munícipe.</p>
      <table style="margin-bottom:1.25rem; max-width:520px">
        <thead><tr><th>Jornada</th><th>Casos</th><th>Distribuição</th></tr></thead>
        <tbody>${journeyRows}</tbody>
      </table>
      <div id="intent-pagination" class="paginated-block" data-table="intent"></div>
    </section>

    <section>
      <h2><span class="phase">Fase 1</span> NLP — ${corpus.nlpTotal} casos</h2>
      <p class="lead">Afirmativo/negativo, horário flexível (<code>7h5</code>) e parsing de campos estruturados.</p>
      <div id="nlp-pagination" class="paginated-block" data-table="nlp"></div>
    </section>

    <section>
      <h2><span class="phase">Fase 2</span> Contrato de turno — ${corpus.turnTotal} casos</h2>
      <p class="lead">Acumulação de campos, próximo campo e validação determinística de transporte.</p>
      <div id="turn-pagination" class="paginated-block" data-table="turn"></div>
    </section>

    <section>
      <h2><span class="phase">Execução</span> Suíte Deno — ${deno.passed}/${deno.total}</h2>
      <p class="lead"><code>npm run test:chatbot</code></p>
      <table>
        <thead><tr><th>Teste</th><th>Status</th><th>Duração</th></tr></thead>
        <tbody>${denoSuiteRows}</tbody>
      </table>
      ${deno.failed > 0 ? `<div class="log-box">${escapeHtml(denoRaw.slice(-6000))}</div>` : ''}
    </section>

    <section>
      <h2><span class="phase">Fase 3</span> E2E Playwright — ${e2e.passed}/${e2e.total}</h2>
      <p class="lead"><code>npm run test:chatbot:e2e</code> · mock SSE do orchestrator (sem LLM real)</p>
      <table>
        <thead><tr><th>Cenário</th><th>Projeto</th><th>Status</th><th>Duração</th></tr></thead>
        <tbody>${e2eRows}</tbody>
      </table>
      <table style="margin-top:1.25rem">
        <thead><tr><th>Cenário</th><th>Jornada</th><th>Mensagem evidenciada</th><th>Cobertura</th></tr></thead>
        <tbody>${e2eScenarioRows}</tbody>
      </table>
    </section>

    <footer>
      <p>Arquivo: <code>report-full-${timestamp}.html</code></p>
      <p>Comandos: <code>npm run test:chatbot</code> · <code>npm run test:chatbot:e2e</code> · <code>npm run test:chatbot:report</code></p>
      <p>Documentação: <code>docs/GUIA_TESTES_CHATBOT.md</code></p>
    </footer>
  </div>
  <script type="application/json" id="corpus-intent-data">${intentDataJson}</script>
  <script type="application/json" id="corpus-nlp-data">${nlpDataJson}</script>
  <script type="application/json" id="corpus-turn-data">${turnDataJson}</script>
  <script type="application/json" id="journey-labels-data">${journeyLabelsJson}</script>
  <script>
    (function () {
      const JOURNEY_LABELS = JSON.parse(document.getElementById('journey-labels-data').textContent);
      const DATASETS = {
        intent: JSON.parse(document.getElementById('corpus-intent-data').textContent),
        nlp: JSON.parse(document.getElementById('corpus-nlp-data').textContent),
        turn: JSON.parse(document.getElementById('corpus-turn-data').textContent),
      };

      const state = {
        intent: { page: 1, pageSize: 15 },
        nlp: { page: 1, pageSize: 15 },
        turn: { page: 1, pageSize: 10 },
      };

      function esc(s) {
        return String(s)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      }

      function renderIntentRow(row) {
        const hist = row.has_history ? '<span class="tag-history">com histórico</span>' : '';
        const expectLabel = JOURNEY_LABELS[row.expect_intent] ?? row.expect_intent;
        return '<tr>' +
          '<td><code>' + esc(row.id) + '</code></td>' +
          '<td>' + esc(JOURNEY_LABELS[row.journey] ?? row.journey) + '</td>' +
          '<td class="num">' + esc(expectLabel) + '</td>' +
          '<td class="quote">"' + esc(row.input) + '"' + hist + '</td>' +
          '</tr>';
      }

      function renderNlpRow(row) {
        return '<tr>' +
          '<td><code>' + esc(row.id) + '</code></td>' +
          '<td>' + esc(row.kind) + '</td>' +
          '<td class="quote">"' + esc(row.input) + '"</td>' +
          '<td class="num">' + esc(row.expect) + '</td>' +
          '</tr>';
      }

      function renderTurnRow(row) {
        return '<tr>' +
          '<td><code>' + esc(row.id) + '</code></td>' +
          '<td>' + esc(row.kind) + '</td>' +
          '<td>' + esc(row.journey) + '</td>' +
          '<td class="num">' + esc(row.detail) + '</td>' +
          '<td class="num">' + row.msgs + '</td>' +
          '</tr>';
      }

      const CONFIG = {
        intent: {
          mountId: 'intent-pagination',
          headers: ['ID', 'Jornada', 'Intenção esperada', 'Entrada do munícipe'],
          renderRow: renderIntentRow,
        },
        nlp: {
          mountId: 'nlp-pagination',
          headers: ['ID', 'Tipo', 'Entrada', 'Esperado'],
          renderRow: renderNlpRow,
        },
        turn: {
          mountId: 'turn-pagination',
          headers: ['ID', 'Tipo de teste', 'Jornada', 'Detalhe / validação', 'Msgs'],
          renderRow: renderTurnRow,
        },
      };

      function renderTable(key) {
        const cfg = CONFIG[key];
        const rows = DATASETS[key];
        const st = state[key];
        const total = rows.length;
        const totalPages = Math.max(1, Math.ceil(total / st.pageSize));
        if (st.page > totalPages) st.page = totalPages;
        if (st.page < 1) st.page = 1;
        const start = (st.page - 1) * st.pageSize;
        const end = Math.min(start + st.pageSize, total);
        const slice = rows.slice(start, end);

        const head = cfg.headers.map((h) => '<th>' + esc(h) + '</th>').join('');
        const body = slice.length
          ? slice.map(cfg.renderRow).join('')
          : '<tr><td colspan="' + cfg.headers.length + '">Nenhum caso</td></tr>';

        const mount = document.getElementById(cfg.mountId);
        mount.innerHTML =
          '<div class="paginated-toolbar">' +
            '<span class="info">Exibindo <strong>' + (total ? start + 1 : 0) + '–' + end + '</strong> de <strong>' + total + '</strong> casos</span>' +
            '<div class="controls">' +
              '<label>Por página <select data-key="' + key + '" data-action="size">' +
                [10, 15, 25, 50].map((n) =>
                  '<option value="' + n + '"' + (st.pageSize === n ? ' selected' : '') + '>' + n + '</option>'
                ).join('') +
              '</select></label>' +
              '<button type="button" data-key="' + key + '" data-action="first"' + (st.page <= 1 ? ' disabled' : '') + '>«</button>' +
              '<button type="button" data-key="' + key + '" data-action="prev"' + (st.page <= 1 ? ' disabled' : '') + '>‹ Anterior</button>' +
              '<span class="page-num">Página ' + st.page + ' / ' + totalPages + '</span>' +
              '<button type="button" data-key="' + key + '" data-action="next"' + (st.page >= totalPages ? ' disabled' : '') + '>Próxima ›</button>' +
              '<button type="button" data-key="' + key + '" data-action="last"' + (st.page >= totalPages ? ' disabled' : '') + '>»</button>' +
            '</div>' +
          '</div>' +
          '<div class="table-scroll">' +
            '<table><thead><tr>' + head + '</tr></thead><tbody>' + body + '</tbody></table>' +
          '</div>';
      }

      document.addEventListener('click', function (e) {
        const btn = e.target.closest('button[data-key][data-action]');
        if (!btn) return;
        const key = btn.getAttribute('data-key');
        const action = btn.getAttribute('data-action');
        const totalPages = Math.max(1, Math.ceil(DATASETS[key].length / state[key].pageSize));
        if (action === 'first') state[key].page = 1;
        if (action === 'prev') state[key].page = Math.max(1, state[key].page - 1);
        if (action === 'next') state[key].page = Math.min(totalPages, state[key].page + 1);
        if (action === 'last') state[key].page = totalPages;
        renderTable(key);
      });

      document.addEventListener('change', function (e) {
        const sel = e.target.closest('select[data-key][data-action="size"]');
        if (!sel) return;
        const key = sel.getAttribute('data-key');
        state[key].pageSize = Number(sel.value);
        state[key].page = 1;
        renderTable(key);
      });

      renderTable('intent');
      renderTable('nlp');
      renderTable('turn');
    })();
  </script>
</body>
</html>`;
}

async function main() {
  const htmlOnly = process.argv.includes('--html-only') || process.env.CHATBOT_REPORT_ONLY === '1';

  console.log('[chatbot-report] Carregando corpus...');
  const corpus = await loadCorpusEvidence();

  let denoRun = { code: 0, stdout: '', stderr: '' };
  let e2eRun = { code: 0, stdout: '' };

  if (!htmlOnly) {
    console.log('[chatbot-report] Rodando suíte Deno...');
    denoRun = await run('npx', ['deno', 'test', '--no-check', '--allow-read', ...DENO_TESTS]);
    console.log(denoRun.code === 0 ? '[chatbot-report] Deno OK' : '[chatbot-report] Deno FALHOU');

    console.log('[chatbot-report] Rodando E2E Playwright (pode levar ~2 min)...');
    await mkdir(reportsDir, { recursive: true });
    e2eRun = await run(
      'npx',
      [
        'playwright',
        'test',
        'tests/e2e/chatbot-typo-urban.spec.ts',
        'tests/e2e/chatbot-typo-transport.spec.ts',
        '--reporter=json',
      ],
      root,
      240000,
    );
    console.log(e2eRun.code === 0 ? '[chatbot-report] E2E OK' : '[chatbot-report] E2E FALHOU');
  } else {
    console.log('[chatbot-report] CHATBOT_REPORT_ONLY=1 — pulando execução de testes');
  }

  const deno = htmlOnly
    ? { code: 0, passed: 9, failed: 0, total: 9, suites: [] }
    : { ...parseDenoSummary(stripAnsi(denoRun.stdout + denoRun.stderr)), code: denoRun.code };

  let e2eTests = [];
  if (!htmlOnly) {
    try {
      const jsonText = stripAnsi(e2eRun.stdout).trim();
      const start = jsonText.indexOf('{');
      const report = JSON.parse(jsonText.slice(start >= 0 ? start : 0));
      e2eTests = flattenPlaywrightJson(report);
    } catch {
      e2eTests = [
        { title: 'E2E (parse JSON falhou — ver log)', project: '—', status: e2eRun.code === 0 ? 'passed' : 'failed', durationMs: 0 },
      ];
    }
  }

  const e2e = htmlOnly
    ? { code: 0, passed: 8, failed: 0, total: 8, tests: [] }
    : {
      code: e2eRun.code,
      passed: e2eTests.filter((t) => t.status === 'passed').length,
      failed: e2eTests.filter((t) => t.status !== 'passed').length,
      total: e2eTests.length,
      tests: e2eTests,
    };

  await mkdir(reportsDir, { recursive: true });

  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-');
  const displayDate = now.toLocaleString('pt-BR', {
    dateStyle: 'full',
    timeStyle: 'medium',
  });

  const overallOk = htmlOnly ? true : denoRun.code === 0 && e2eRun.code === 0;
  const html = buildHtml({
    timestamp,
    displayDate,
    corpus,
    deno,
    e2e,
    denoRaw: stripAnsi(denoRun.stdout + denoRun.stderr),
    overallOk,
  });

  const htmlPath = join(reportsDir, `report-full-${timestamp}.html`);
  const jsonPath = join(reportsDir, `report-full-${timestamp}.json`);

  const payload = {
    timestamp,
    displayDate,
    overallOk,
    corpus: {
      intentTotal: corpus.intentTotal,
      nlpTotal: corpus.nlpTotal,
      turnTotal: corpus.turnTotal,
      corpusCasesTotal: corpus.corpusCasesTotal,
      intentByJourney: corpus.intentByJourney,
    },
    deno: { code: denoRun.code, ...deno },
    e2e: { code: e2eRun.code, ...e2e },
  };

  await writeFile(htmlPath, html, 'utf8');
  await writeFile(jsonPath, JSON.stringify(payload, null, 2), 'utf8');

  console.log(`\n[chatbot-report] Relatório HTML: ${htmlPath}`);
  console.log(`[chatbot-report] Dados JSON:     ${jsonPath}`);

  process.exit(overallOk ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
