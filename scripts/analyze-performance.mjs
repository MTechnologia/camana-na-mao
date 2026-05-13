#!/usr/bin/env node
/**
 * HU-13.2 — Análise de performance.
 *
 * Lê `performance_metrics` no Supabase, agrupa por route+marker,
 * calcula P50/P95/P99, conta amostras, e flag SLA (P95 < 3000ms).
 *
 * Uso:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/analyze-performance.mjs
 *
 * Opções (env):
 *   PERF_LAST_DAYS=7      janela de análise em dias (default 7)
 *   PERF_SLA_MS=3000      limite de SLA em ms (default 3000)
 *   PERF_MIN_SAMPLES=5    mínimo de amostras pra incluir (default 5)
 */

import { createClient } from "@supabase/supabase-js";
import { config as dotenvConfig } from "dotenv";

dotenvConfig({ path: ".env.local" });
dotenvConfig({ path: ".env" });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const LAST_DAYS = Number(process.env.PERF_LAST_DAYS ?? 7);
const SLA_MS = Number(process.env.PERF_SLA_MS ?? 3000);
const MIN_SAMPLES = Number(process.env.PERF_MIN_SAMPLES ?? 5);

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("❌ SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios.");
  console.error("   Coloque em .env.local ou exporte antes de rodar.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(idx, sorted.length - 1))];
}

function mean(arr) {
  if (!arr.length) return 0;
  return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
}

async function fetchMetrics() {
  const cutoff = new Date(Date.now() - LAST_DAYS * 24 * 3600 * 1000).toISOString();
  const all = [];
  const pageSize = 1000;
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from("performance_metrics")
      .select("route, marker, duration_ms")
      .gte("created_at", cutoff)
      .range(offset, offset + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < pageSize) break;
    offset += pageSize;
  }
  return all;
}

function groupByKey(rows) {
  const map = new Map();
  for (const r of rows) {
    const key = `${r.route}::${r.marker}`;
    let bucket = map.get(key);
    if (!bucket) {
      bucket = { route: r.route, marker: r.marker, durations: [] };
      map.set(key, bucket);
    }
    bucket.durations.push(r.duration_ms);
  }
  return Array.from(map.values());
}

function buildSummary(groups) {
  return groups
    .filter((g) => g.durations.length >= MIN_SAMPLES)
    .map((g) => {
      const sorted = [...g.durations].sort((a, b) => a - b);
      return {
        route: g.route,
        marker: g.marker,
        count: sorted.length,
        avg: mean(sorted),
        p50: percentile(sorted, 50),
        p95: percentile(sorted, 95),
        p99: percentile(sorted, 99),
        max: sorted[sorted.length - 1],
        slaOk: percentile(sorted, 95) < SLA_MS,
      };
    })
    .sort((a, b) => b.p95 - a.p95);
}

function printTable(rows) {
  if (rows.length === 0) {
    console.log("Sem amostras suficientes para análise.");
    return;
  }
  const headers = ["Route", "Marker", "N", "Avg", "P50", "P95", "P99", "Max", "SLA"];
  const colWidths = headers.map((h, i) =>
    Math.max(
      h.length,
      ...rows.map((r) => String(Object.values(r)[i] ?? "").length),
    ),
  );

  const fmtRow = (vals) =>
    vals.map((v, i) => String(v).padEnd(colWidths[i])).join("  ");

  console.log(fmtRow(headers));
  console.log(colWidths.map((w) => "-".repeat(w)).join("  "));
  for (const r of rows) {
    const sla = r.slaOk ? "✅" : "❌";
    console.log(
      fmtRow([r.route, r.marker, r.count, `${r.avg}ms`, `${r.p50}ms`, `${r.p95}ms`, `${r.p99}ms`, `${r.max}ms`, sla]),
    );
  }
}

async function main() {
  console.log(
    `📊 Performance Analysis (últimos ${LAST_DAYS}d, SLA P95 < ${SLA_MS}ms, min ${MIN_SAMPLES} amostras)\n`,
  );

  const rows = await fetchMetrics();
  console.log(`Total de medições: ${rows.length}\n`);

  if (rows.length === 0) {
    console.log("Nenhuma medição encontrada. Use a aplicação para gerar dados.");
    process.exit(0);
  }

  const groups = groupByKey(rows);
  const summary = buildSummary(groups);
  printTable(summary);

  console.log("");
  const failing = summary.filter((s) => !s.slaOk);
  if (failing.length === 0) {
    console.log(`✅ Todos os ${summary.length} markers passam no SLA P95 < ${SLA_MS}ms`);
  } else {
    console.log(`❌ ${failing.length} de ${summary.length} markers FALHAM no SLA P95 < ${SLA_MS}ms:`);
    for (const f of failing) {
      console.log(`   - ${f.route} :: ${f.marker} → P95 ${f.p95}ms`);
    }
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("❌ Erro:", err.message ?? err);
  process.exit(1);
});
