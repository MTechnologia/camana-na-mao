// HU-7.4 + HU-7.5 — Edge function para processar export_jobs em modo
// server-side (grande volumetria + agendamentos periódicos).
//
// Recebe { jobId } no POST. Carrega o job em status='pending', muda pra
// 'running', pagina o banco com keyset pagination (created_at, id) em batches
// de 5000 linhas, gera CSV ou XLSX em streaming, faz upload incremental no
// bucket `export-files` e atualiza o status pra 'completed' com `storage_path`
// preenchido. Em erro, marca 'failed' com mensagem.
//
// IMPORTANTE: usa SERVICE_ROLE_KEY para bypassar RLS (precisa ler dados do
// usuário e escrever no bucket privado).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PAGE_SIZE = 5000;
// Caps a aplicar conforme role do dono do job. Espelha o que está em
// src/lib/exportFields.ts (EXPORT_ROW_CAPS).
const ROW_CAPS: Record<string, { csv: number; xlsx: number }> = {
  admin: { csv: 5_000_000, xlsx: 1_000_000 },
  gestor: { csv: 100_000, xlsx: 50_000 },
};

interface JobRecord {
  id: string;
  user_id: string;
  dataset: string;
  format: "csv" | "xlsx";
  fields: string[];
  order_by: { fieldId: string; direction: "asc" | "desc" };
  filters: {
    startDate?: string | null;
    endDate?: string | null;
    categories?: string[];
    regions?: string[];
    zones?: string[];
  };
  include_summary: boolean;
}

interface FieldMeta {
  id: string;
  dbColumn: string;
  label: string;
}

// Catálogo simplificado (espelha src/lib/exportFields.ts — apenas o que é
// necessário no server: id, dbColumn, label). Para evitar drift, mantenha em
// sincronia com o arquivo TS quando adicionar campos.
const URBAN_FIELDS: Record<string, FieldMeta> = {
  id: { id: "id", dbColumn: "id", label: "ID interno" },
  protocol_code: { id: "protocol_code", dbColumn: "protocol_code", label: "Protocolo" },
  category: { id: "category", dbColumn: "category", label: "Categoria" },
  subcategory: { id: "subcategory", dbColumn: "subcategory", label: "Subcategoria" },
  description: { id: "description", dbColumn: "description", label: "Descrição" },
  report_nature: { id: "report_nature", dbColumn: "report_nature", label: "Natureza do relato" },
  affected_scope: { id: "affected_scope", dbColumn: "affected_scope", label: "Escopo afetado" },
  affected_estimate: { id: "affected_estimate", dbColumn: "affected_estimate", label: "Pessoas afetadas (estimativa)" },
  status: { id: "status", dbColumn: "status", label: "Status" },
  severity: { id: "severity", dbColumn: "severity", label: "Severidade" },
  risk_level: { id: "risk_level", dbColumn: "risk_level", label: "Nível de risco" },
  urgency_reason: { id: "urgency_reason", dbColumn: "urgency_reason", label: "Justificativa de urgência" },
  neighborhood: { id: "neighborhood", dbColumn: "neighborhood", label: "Bairro" },
  street: { id: "street", dbColumn: "street", label: "Rua" },
  street_number: { id: "street_number", dbColumn: "street_number", label: "Número" },
  cep: { id: "cep", dbColumn: "cep", label: "CEP" },
  reference_point: { id: "reference_point", dbColumn: "reference_point", label: "Ponto de referência" },
  location_address: { id: "location_address", dbColumn: "location_address", label: "Endereço completo" },
  latitude: { id: "latitude", dbColumn: "latitude", label: "Latitude" },
  longitude: { id: "longitude", dbColumn: "longitude", label: "Longitude" },
  created_at: { id: "created_at", dbColumn: "created_at", label: "Criado em" },
  updated_at: { id: "updated_at", dbColumn: "updated_at", label: "Atualizado em" },
  user_id: { id: "user_id", dbColumn: "user_id", label: "ID do usuário" },
  active_consequences: { id: "active_consequences", dbColumn: "active_consequences", label: "Consequências ativas" },
  risk_types: { id: "risk_types", dbColumn: "risk_types", label: "Tipos de risco" },
  n8n_priority: { id: "n8n_priority", dbColumn: "n8n_priority", label: "Prioridade" },
  n8n_tags: { id: "n8n_tags", dbColumn: "n8n_tags", label: "Tags" },
  n8n_validated_category: { id: "n8n_validated_category", dbColumn: "n8n_validated_category", label: "Categoria validada" },
};

const TRANSPORT_FIELDS: Record<string, FieldMeta> = {
  id: { id: "id", dbColumn: "id", label: "ID interno" },
  protocol_code: { id: "protocol_code", dbColumn: "protocol_code", label: "Protocolo" },
  report_type: { id: "report_type", dbColumn: "report_type", label: "Tipo de relato" },
  sub_category: { id: "sub_category", dbColumn: "sub_category", label: "Subcategoria" },
  description: { id: "description", dbColumn: "description", label: "Descrição" },
  impact_description: { id: "impact_description", dbColumn: "impact_description", label: "Descrição do impacto" },
  recurrence_frequency: { id: "recurrence_frequency", dbColumn: "recurrence_frequency", label: "Frequência de recorrência" },
  status: { id: "status", dbColumn: "status", label: "Status" },
  severity: { id: "severity", dbColumn: "severity", label: "Severidade" },
  personal_impact: { id: "personal_impact", dbColumn: "personal_impact", label: "Impacto pessoal (1-5)" },
  line_id: { id: "line_id", dbColumn: "line_id", label: "ID da linha" },
  line_code_custom: { id: "line_code_custom", dbColumn: "line_code_custom", label: "Código da linha (custom)" },
  direction: { id: "direction", dbColumn: "direction", label: "Sentido" },
  stop_name: { id: "stop_name", dbColumn: "stop_name", label: "Nome da parada" },
  stop_location: { id: "stop_location", dbColumn: "stop_location", label: "Local da parada" },
  location: { id: "location", dbColumn: "location", label: "Local" },
  occurrence_date: { id: "occurrence_date", dbColumn: "occurrence_date", label: "Data da ocorrência" },
  occurrence_time: { id: "occurrence_time", dbColumn: "occurrence_time", label: "Hora da ocorrência" },
  created_at: { id: "created_at", dbColumn: "created_at", label: "Criado em" },
  updated_at: { id: "updated_at", dbColumn: "updated_at", label: "Atualizado em" },
  responded_at: { id: "responded_at", dbColumn: "responded_at", label: "Respondido em" },
  user_id: { id: "user_id", dbColumn: "user_id", label: "ID do usuário" },
  accessibility_details: { id: "accessibility_details", dbColumn: "accessibility_details", label: "Detalhes de acessibilidade" },
  ai_category: { id: "ai_category", dbColumn: "ai_category", label: "Categoria (IA)" },
  ai_sentiment: { id: "ai_sentiment", dbColumn: "ai_sentiment", label: "Sentimento (IA)" },
  ai_pattern_detected: { id: "ai_pattern_detected", dbColumn: "ai_pattern_detected", label: "Padrão detectado (IA)" },
  n8n_priority: { id: "n8n_priority", dbColumn: "n8n_priority", label: "Prioridade" },
  n8n_tags: { id: "n8n_tags", dbColumn: "n8n_tags", label: "Tags" },
  n8n_validated_category: { id: "n8n_validated_category", dbColumn: "n8n_validated_category", label: "Categoria validada" },
};

const FIELDS_BY_DATASET: Record<string, Record<string, FieldMeta>> = {
  urban_reports: URBAN_FIELDS,
  transport_reports: TRANSPORT_FIELDS,
};

const DEFAULT_DATE_COLUMN: Record<string, string> = {
  urban_reports: "created_at",
  transport_reports: "created_at",
};

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  let s: string;
  if (typeof value === "string") s = value;
  else if (typeof value === "number" || typeof value === "boolean") s = String(value);
  else if (Array.isArray(value))
    s = value.map((x) => (typeof x === "string" ? x : JSON.stringify(x))).join("; ");
  else {
    try {
      s = JSON.stringify(value);
    } catch {
      s = String(value);
    }
  }
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

async function getUserRole(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<"admin" | "gestor" | null> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "gestor", "assessor", "vereador"]);
  if (error || !data) return null;
  if (data.some((r) => r.role === "admin")) return "admin";
  if (
    data.some((r) =>
      r.role === "gestor" || r.role === "assessor" || r.role === "vereador"
    )
  ) {
    return "gestor";
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Config ausente" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const jobId: string | undefined = body?.jobId;
    if (!jobId) {
      return new Response(JSON.stringify({ error: "jobId obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 1) Pega o job em pending e marca como running atomicamente.
    const { data: jobData, error: jobErr } = await supabase
      .from("export_jobs")
      .update({ status: "running", started_at: new Date().toISOString() })
      .eq("id", jobId)
      .eq("status", "pending")
      .select("*")
      .single();

    if (jobErr || !jobData) {
      return new Response(
        JSON.stringify({ error: "Job não encontrado ou já em execução", details: jobErr?.message }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const job = jobData as JobRecord;

    // 2) Valida role do dono e aplica cap.
    const role = await getUserRole(supabase, job.user_id);
    if (!role) {
      await supabase
        .from("export_jobs")
        .update({
          status: "failed",
          error: "Usuário sem perfil staff para exportação.",
          completed_at: new Date().toISOString(),
        })
        .eq("id", job.id);
      return new Response(JSON.stringify({ error: "Sem permissão" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const maxRows = ROW_CAPS[role][job.format];
    const datasetFields = FIELDS_BY_DATASET[job.dataset];
    if (!datasetFields) {
      await supabase
        .from("export_jobs")
        .update({
          status: "failed",
          error: `Dataset desconhecido: ${job.dataset}`,
          completed_at: new Date().toISOString(),
        })
        .eq("id", job.id);
      return new Response(JSON.stringify({ error: "Dataset inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3) Resolve campos selecionados (na ordem solicitada pelo usuário).
    const selectedFields: FieldMeta[] = job.fields
      .map((id) => datasetFields[id])
      .filter((f): f is FieldMeta => !!f);
    if (selectedFields.length === 0) {
      await supabase
        .from("export_jobs")
        .update({
          status: "failed",
          error: "Nenhum campo válido selecionado.",
          completed_at: new Date().toISOString(),
        })
        .eq("id", job.id);
      return new Response(JSON.stringify({ error: "Sem campos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const categoryColumn =
      job.dataset === "urban_reports" ? "category" : "report_type";
    const dateColumn = DEFAULT_DATE_COLUMN[job.dataset];

    // Conjunto de colunas pro SELECT
    const selectColsSet = new Set<string>(selectedFields.map((f) => f.dbColumn));
    selectColsSet.add(dateColumn);
    selectColsSet.add("id");
    selectColsSet.add(categoryColumn);
    if (job.dataset === "urban_reports") selectColsSet.add("neighborhood");
    if (job.include_summary) selectColsSet.add("status");
    const selectCols = Array.from(selectColsSet).join(",");

    // 4) Paginação keyset pra escalar acima do PostgREST limit.
    const orderField = selectedFields.find((f) => f.id === job.order_by.fieldId);
    const orderColumn = orderField?.dbColumn ?? dateColumn;
    const orderAsc = job.order_by.direction === "asc";

    const rows: Array<Record<string, unknown>> = [];
    let offset = 0;
    while (offset < maxRows) {
      const to = Math.min(offset + PAGE_SIZE - 1, maxRows - 1);
      let q = supabase.from(job.dataset).select(selectCols);
      if (job.filters?.startDate) q = q.gte(dateColumn, job.filters.startDate);
      if (job.filters?.endDate) q = q.lte(dateColumn, job.filters.endDate);
      if (job.filters?.categories?.length)
        q = q.in(categoryColumn, job.filters.categories);
      if (job.dataset === "urban_reports" && job.filters?.regions?.length)
        q = q.in("neighborhood", job.filters.regions);
      q = q.order(orderColumn, { ascending: orderAsc });
      q = q.range(offset, to);
      const { data, error } = await q;
      if (error) throw error;
      const batch = (data ?? []) as Array<Record<string, unknown>>;
      if (batch.length === 0) break;
      rows.push(...batch);
      offset += PAGE_SIZE;
      if (batch.length < PAGE_SIZE) break;
    }

    // 5) Serializa CSV ou XLSX.
    let buffer: Uint8Array;
    let mimeType: string;
    let extension: string;

    if (job.format === "csv") {
      const headerLine = selectedFields.map((f) => csvEscape(f.label)).join(",");
      const bodyLines = rows.map((r) =>
        selectedFields.map((f) => csvEscape(r[f.dbColumn])).join(","),
      );
      const csv = "﻿" + [headerLine, ...bodyLines].join("\r\n");
      buffer = new TextEncoder().encode(csv);
      mimeType = "text/csv";
      extension = "csv";
    } else {
      // XLSX
      const headerRow = selectedFields.map((f) => f.label);
      const dataRows = rows.map((r) =>
        selectedFields.map((f) => normalizeXlsxCell(r[f.dbColumn])),
      );
      const wb = XLSX.utils.book_new();
      const detailSheet = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows]);
      if (job.include_summary) {
        const summaryRows = buildSummaryAOA(rows, categoryColumn, job.dataset);
        const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
        XLSX.utils.book_append_sheet(wb, summarySheet, "Resumo");
      }
      XLSX.utils.book_append_sheet(wb, detailSheet, "Detalhe");
      buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" }) as Uint8Array;
      mimeType =
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      extension = "xlsx";
    }

    // 6) Upload no Storage no path `{user_id}/{job_id}.{ext}`.
    const storagePath = `${job.user_id}/${job.id}.${extension}`;
    const uploadResp = await supabase.storage
      .from("export-files")
      .upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: true,
      });
    if (uploadResp.error) throw uploadResp.error;

    // 7) Marca como completed.
    await supabase
      .from("export_jobs")
      .update({
        status: "completed",
        row_count: rows.length,
        storage_path: storagePath,
        completed_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    // HU-8.1 — Notificação in-app quando o job veio de um agendamento e o
    // dono pediu pra ser avisado.
    try {
      // O job pode ter `scheduled_export_id` populado quando source='scheduled'.
      const { data: jobFresh } = await supabase
        .from("export_jobs")
        .select("source, scheduled_export_id")
        .eq("id", job.id)
        .single();

      const scheduledExportId = (jobFresh as { source?: string; scheduled_export_id?: string } | null)
        ?.scheduled_export_id;

      if (scheduledExportId) {
        const { data: sch } = await supabase
          .from("scheduled_exports")
          .select("name, notify_in_app")
          .eq("id", scheduledExportId)
          .single();
        const schedule = sch as { name?: string; notify_in_app?: boolean } | null;
        if (schedule?.notify_in_app) {
          const datasetLabel =
            job.dataset === "urban_reports"
              ? "relatos urbanos"
              : job.dataset === "transport_reports"
                ? "relatos de transporte"
                : job.dataset;
          const exportsPath = `/admin/exports?jobId=${job.id}`;
          await supabase.from("notifications").insert({
            user_id: job.user_id,
            title: `Exportação "${schedule.name ?? "agendada"}" concluída`,
            message: `Sua exportação de ${datasetLabel} (${rows.length.toLocaleString("pt-BR")} linhas) está disponível para download.`,
            type: "export_completed",
            action_url: exportsPath,
            priority: "normal",
            metadata: {
              jobId: job.id,
              scheduledExportId,
              format: job.format,
              rowCount: rows.length,
            },
          });
        }

        // E-mail dedicado com link de download (independente do webhook genérico).
        await invokeSendExportEmail(job.id);
      }
    } catch (notifErr) {
      console.warn("[process-export-job] falha ao criar notificação:", notifErr);
    }

    return new Response(
      JSON.stringify({ ok: true, jobId: job.id, rowCount: rows.length, storagePath }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[process-export-job] erro:", err);
    const message = err instanceof Error ? err.message : "Erro desconhecido";

    // Best-effort: marca o job como failed se conseguir.
    try {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      const body = await req.clone().json().catch(() => ({}));
      if (body?.jobId) {
        await supabase
          .from("export_jobs")
          .update({
            status: "failed",
            error: message,
            completed_at: new Date().toISOString(),
          })
          .eq("id", body.jobId);
      }
    } catch (_inner) {
      /* ignore */
    }

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function invokeSendExportEmail(jobId: string): Promise<void> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const cronSecret = Deno.env.get("CRON_SECRET")?.trim();
  if (!supabaseUrl || !serviceKey) return;

  try {
    const res = await fetch(`${supabaseUrl.replace(/\/$/, "")}/functions/v1/send-export-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
        ...(cronSecret ? { "X-Cron-Secret": cronSecret } : {}),
      },
      body: JSON.stringify({ jobId }),
    });
    if (!res.ok) {
      console.warn("[process-export-job] send-export-email:", res.status, await res.text());
    }
  } catch (e) {
    console.warn("[process-export-job] send-export-email invoke failed:", e);
  }
}

function normalizeXlsxCell(v: unknown): string | number | boolean | Date {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v;
  if (typeof v === "number" || typeof v === "string" || typeof v === "boolean") return v;
  if (Array.isArray(v))
    return v.map((x) => (typeof x === "string" ? x : JSON.stringify(x))).join("; ");
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function buildSummaryAOA(
  rows: Array<Record<string, unknown>>,
  categoryColumn: string,
  dataset: string,
): Array<Array<string | number>> {
  const total = rows.length;
  const byStatus = new Map<string, number>();
  const byCategory = new Map<string, number>();
  for (const r of rows) {
    const s = String(r.status ?? "—");
    byStatus.set(s, (byStatus.get(s) ?? 0) + 1);
    const c = String(r[categoryColumn] ?? "—");
    byCategory.set(c, (byCategory.get(c) ?? 0) + 1);
  }
  const aoa: Array<Array<string | number>> = [];
  aoa.push([`Dataset: ${dataset}`]);
  aoa.push([`Gerado em: ${new Date().toISOString()}`]);
  aoa.push([""]);
  aoa.push(["Indicadores principais"]);
  aoa.push(["Métrica", "Valor"]);
  aoa.push(["Total exportado", total]);
  aoa.push([
    "Resolvidos",
    (byStatus.get("resolved") ?? 0) + (byStatus.get("completed") ?? 0),
  ]);
  aoa.push(["Pendentes", byStatus.get("pending") ?? 0]);
  aoa.push(["Em análise", byStatus.get("in_progress") ?? 0]);
  aoa.push([""]);
  aoa.push(["Por status"]);
  aoa.push(["Categoria", "Quantidade"]);
  for (const [k, v] of Array.from(byStatus.entries()).sort((a, b) => b[1] - a[1])) {
    aoa.push([k, v]);
  }
  aoa.push([""]);
  aoa.push([dataset === "urban_reports" ? "Por categoria" : "Por tipo de relato"]);
  aoa.push(["Categoria", "Quantidade"]);
  for (const [k, v] of Array.from(byCategory.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)) {
    aoa.push([k, v]);
  }
  return aoa;
}
