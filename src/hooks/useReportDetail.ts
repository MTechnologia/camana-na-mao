import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ReportSource } from "@/contexts/ReportDetailContext";
import {
  formatActiveConsequencesListPt,
  formatAffectedScopePt,
  formatTransportDirectionPt,
  formatTransportRecurrencePt,
  formatUrbanUrgencyReasonPt,
} from "@/lib/reportDisplayPt";

/**
 * HU-3.6 — Carrega dados completos de um relato individual para o
 * drill-through (sheet lateral).
 *
 * Carrega em paralelo:
 *   - Relato (urban_reports OU transport_reports conforme `source`)
 *   - Autor (profiles + user_demographics)
 *   - Comentários (urban_report_comments OU transport_report_comments)
 *   - Histórico de auditoria (audit_logs filtrado por entity_type/entity_id)
 *   - Respostas formais (apenas para transport: transport_report_responses)
 */

export interface ReportDetail {
  id: string;
  source: ReportSource;
  title: string;
  category: string;
  subCategory: string | null;
  description: string | null;
  status: string | null;
  severity: string | null;
  protocolCode: string | null;
  photos: string[];
  /** Endereço completo formatado. */
  addressLine: string | null;
  neighborhood: string | null;
  latitude: number | null;
  longitude: number | null;
  createdAt: string | null;
  updatedAt: string | null;
  /** Campos extras (impacto, urgência, etc) — chave-valor traduzido. */
  extras: Array<{ label: string; value: string }>;
  /** Análise IA disponível para visualização. */
  aiAnalysis: {
    sentiment: string | null;
    category: string | null;
    priority: string | null;
    patternDetected: boolean | null;
    tags: string[];
    enrichedData: Record<string, unknown> | null;
  };
  authorUserId: string | null;
}

export interface ReportAuthor {
  userId: string;
  fullName: string | null;
  avatarUrl: string | null;
  phone: string | null;
  gender: string | null;
  race: string | null;
  socialClass: string | null;
  age: number | null;
  /** Total de relatos do autor (urban + transport), opcional. */
  totalReports: number | null;
}

export interface ReportComment {
  id: string;
  userId: string | null;
  authorName: string | null;
  text: string;
  createdAt: string | null;
}

export interface ReportAuditEntry {
  id: string;
  action: string;
  actorUserId: string | null;
  actorName: string | null;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface UseReportDetailResult {
  detail: ReportDetail | null;
  author: ReportAuthor | null;
  comments: ReportComment[];
  auditLog: ReportAuditEntry[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  /**
   * HU-5.3 — Optimistic updates: aplica mudança local imediatamente para
   * feedback instantâneo. Em caso de erro na persistência, o caller deve
   * chamar com o valor anterior para reverter.
   */
  applyOptimisticDetail: (patch: Partial<ReportDetail>) => void;
  applyOptimisticComment: (comment: ReportComment) => void;
}

const URBAN_FIELDS =
  "id, user_id, category, subcategory, description, status, severity, photos, latitude, longitude, location_address, neighborhood, street, street_number, cep, reference_point, protocol_code, urgency_reason, affected_estimate, affected_scope, active_consequences, ai_classification, n8n_priority, n8n_validated_category, n8n_tags, n8n_enriched_data, created_at, updated_at";

const TRANSPORT_FIELDS =
  "id, user_id, report_type, sub_category, description, status, severity, photos, location, stop_name, stop_location, direction, line_code_custom, occurrence_date, occurrence_time, recurrence_frequency, impact_description, personal_impact, accessibility_details, protocol_code, ai_category, ai_sentiment, ai_pattern_detected, n8n_priority, n8n_validated_category, n8n_tags, n8n_enriched_data, responded_at, created_at, updated_at";

function safeJson(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  if (typeof value === "object") return value as Record<string, unknown>;
  return null;
}

/** Primeiro valor textual não vazio (IA / n8n / JSON aninhado). */
function pickStr(...candidates: unknown[]): string | null {
  for (const c of candidates) {
    if (c === null || c === undefined) continue;
    if (typeof c === "string") {
      const t = c.trim();
      if (t) return t;
    }
    if (typeof c === "number" && !Number.isNaN(c)) return String(c);
  }
  return null;
}

function pickBool(...candidates: unknown[]): boolean | null {
  for (const c of candidates) {
    if (typeof c === "boolean") return c;
    if (c === "true" || c === "sim" || c === "yes" || c === 1) return true;
    if (c === "false" || c === "não" || c === "nao" || c === "no" || c === 0) return false;
  }
  return null;
}

function buildAddressUrban(r: Record<string, unknown>): string | null {
  const parts = [
    r.location_address,
    r.street && r.street_number ? `${r.street}, ${r.street_number}` : r.street,
    r.neighborhood,
    r.cep,
  ].filter((p): p is string => typeof p === "string" && p.length > 0);
  return parts.length > 0 ? parts.join(" · ") : null;
}

function buildAddressTransport(r: Record<string, unknown>): string | null {
  const parts = [r.location, r.stop_name, r.stop_location].filter(
    (p): p is string => typeof p === "string" && p.length > 0,
  );
  return parts.length > 0 ? parts.join(" · ") : null;
}

function ageFromBirthDate(birth: string | null): number | null {
  if (!birth) return null;
  const t = new Date(birth).getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / (365.25 * 24 * 3600 * 1000));
}

export function useReportDetail(
  id: string | null,
  source: ReportSource | null,
): UseReportDetailResult {
  const [detail, setDetail] = useState<ReportDetail | null>(null);
  const [author, setAuthor] = useState<ReportAuthor | null>(null);
  const [comments, setComments] = useState<ReportComment[]>([]);
  const [auditLog, setAuditLog] = useState<ReportAuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!id || !source) {
      setDetail(null);
      setAuthor(null);
      setComments([]);
      setAuditLog([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const tableName = source === "urban" ? "urban_reports" : "transport_reports";
      const fields = source === "urban" ? URBAN_FIELDS : TRANSPORT_FIELDS;
      const commentsTable =
        source === "urban" ? "urban_report_comments" : "transport_report_comments";

      // 1) Relato
      const { data: rep, error: repErr } = await supabase
        .from(tableName)
        .select(fields)
        .eq("id", id)
        .maybeSingle();
      if (repErr) throw repErr;
      if (!rep) {
        setError("Relato não encontrado.");
        setDetail(null);
        return;
      }

      const r = rep as Record<string, unknown>;
      const ai = safeJson(r.ai_classification) ?? {};
      const enriched = safeJson(r.n8n_enriched_data) ?? {};
      const analysis =
        enriched.analysis !== null && enriched.analysis !== undefined && typeof enriched.analysis === "object"
          ? (enriched.analysis as Record<string, unknown>)
          : null;
      const photos = Array.isArray(r.photos) ? (r.photos as string[]) : [];

      const extras: Array<{ label: string; value: string }> = [];
      if (source === "urban") {
        if (r.urgency_reason)
          extras.push({
            label: "Razão da urgência",
            value: formatUrbanUrgencyReasonPt(r.urgency_reason as string),
          });
        if (r.affected_estimate)
          extras.push({ label: "Pessoas afetadas (estimativa)", value: String(r.affected_estimate) });
        if (r.affected_scope)
          extras.push({
            label: "Escopo do impacto",
            value: formatAffectedScopePt(r.affected_scope as string),
          });
        if (Array.isArray(r.active_consequences) && (r.active_consequences as string[]).length > 0) {
          extras.push({
            label: "Consequências ativas",
            value: formatActiveConsequencesListPt(r.active_consequences as string[]),
          });
        }
        if (r.reference_point) extras.push({ label: "Ponto de referência", value: String(r.reference_point) });
      } else {
        if (r.occurrence_date) extras.push({ label: "Data da ocorrência", value: String(r.occurrence_date) });
        if (r.occurrence_time) extras.push({ label: "Hora", value: String(r.occurrence_time) });
        if (r.line_code_custom) extras.push({ label: "Linha", value: String(r.line_code_custom) });
        if (r.direction)
          extras.push({ label: "Sentido", value: formatTransportDirectionPt(r.direction as string) });
        if (r.recurrence_frequency)
          extras.push({
            label: "Frequência",
            value: formatTransportRecurrencePt(r.recurrence_frequency as string),
          });
        if (r.personal_impact !== null && r.personal_impact !== undefined)
          extras.push({ label: "Impacto pessoal (1-5)", value: String(r.personal_impact) });
        if (r.impact_description)
          extras.push({ label: "Descrição do impacto", value: String(r.impact_description) });
      }

      const detailRecord: ReportDetail = {
        id: String(r.id),
        source,
        title:
          source === "urban"
            ? String(r.subcategory || r.category || "Relato urbano")
            : String(r.sub_category || r.report_type || "Relato de transporte"),
        category: String(source === "urban" ? r.category : r.report_type),
        subCategory: (source === "urban" ? r.subcategory : r.sub_category) as string | null,
        description: r.description as string | null,
        status: r.status as string | null,
        severity: r.severity as string | null,
        protocolCode: r.protocol_code as string | null,
        photos,
        addressLine: source === "urban" ? buildAddressUrban(r) : buildAddressTransport(r),
        neighborhood: (r.neighborhood as string) ?? null,
        latitude: typeof r.latitude === "number" ? (r.latitude as number) : null,
        longitude: typeof r.longitude === "number" ? (r.longitude as number) : null,
        createdAt: r.created_at as string | null,
        updatedAt: r.updated_at as string | null,
        extras,
        aiAnalysis: {
          sentiment: pickStr(
            ai.sentiment,
            enriched.sentiment,
            enriched.sentimento,
            analysis?.sentiment,
            source === "transport" ? r.ai_sentiment : null,
          ),
          category: pickStr(
            ai.category,
            ai.validated_category,
            r.n8n_validated_category,
            r.ai_category,
            enriched.validated_category,
            enriched.category,
            enriched.categoria_validada,
          ),
          priority: pickStr(
            ai.priority,
            r.n8n_priority,
            enriched.priority,
            enriched.prioridade,
            enriched.prioridade_ia,
          ),
          patternDetected:
            typeof r.ai_pattern_detected === "boolean"
              ? (r.ai_pattern_detected as boolean)
              : pickBool(
                  enriched.pattern_detected,
                  enriched.padrao_detectado,
                  analysis?.pattern_detected,
                ),
          tags: Array.isArray(r.n8n_tags) ? (r.n8n_tags as string[]) : [],
          enrichedData: Object.keys(enriched).length > 0 ? enriched : null,
        },
        authorUserId: r.user_id as string | null,
      };
      setDetail(detailRecord);

      // 2) Autor (profile + demographics) e contagem de relatos
      const userId = detailRecord.authorUserId;
      let authorRecord: ReportAuthor | null = null;
      if (userId) {
        const [{ data: profile }, { data: demo }] = await Promise.all([
          supabase.from("profiles").select("id, full_name, avatar_url, phone").eq("id", userId).maybeSingle(),
          supabase
            .from("user_demographics")
            .select("gender, race, social_class, birth_date")
            .eq("user_id", userId)
            .maybeSingle(),
        ]);
        const p = (profile ?? {}) as Record<string, unknown>;
        const d = (demo ?? {}) as Record<string, unknown>;
        // Conta relatos do mesmo usuário (rápido, head:true)
        let totalReports: number | null = null;
        try {
          const [{ count: cu }, { count: ct }] = await Promise.all([
            supabase
              .from("urban_reports")
              .select("*", { count: "exact", head: true })
              .eq("user_id", userId),
            supabase
              .from("transport_reports")
              .select("*", { count: "exact", head: true })
              .eq("user_id", userId),
          ]);
          totalReports = (cu || 0) + (ct || 0);
        } catch {
          totalReports = null;
        }
        authorRecord = {
          userId,
          fullName: (p.full_name as string | null) ?? null,
          avatarUrl: (p.avatar_url as string | null) ?? null,
          phone: (p.phone as string | null) ?? null,
          gender: (d.gender as string | null) ?? null,
          race: (d.race as string | null) ?? null,
          socialClass: (d.social_class as string | null) ?? null,
          age: ageFromBirthDate((d.birth_date as string | null) ?? null),
          totalReports,
        };
      }
      setAuthor(authorRecord);

      // 3) Comentários e 4) Audit log em paralelo
      const [{ data: cmts }, { data: audit }] = await Promise.all([
        supabase
          .from(commentsTable)
          .select("id, user_id, comment_text, created_at")
          .eq("report_id", id)
          .order("created_at", { ascending: true })
          .limit(100),
        supabase
          .from("audit_logs")
          .select("id, action, user_id, old_values, new_values, metadata, created_at")
          .eq("entity_type", tableName)
          .eq("entity_id", id)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

      setComments(
        (cmts ?? []).map((c) => {
          const cc = c as Record<string, unknown>;
          return {
            id: String(cc.id),
            userId: (cc.user_id as string | null) ?? null,
            authorName: null, // resolvido na UI via profiles cache se necessário
            text: String(cc.comment_text ?? ""),
            createdAt: (cc.created_at as string | null) ?? null,
          };
        }),
      );

      setAuditLog(
        (audit ?? []).map((a) => {
          const aa = a as Record<string, unknown>;
          return {
            id: String(aa.id),
            action: String(aa.action ?? "UPDATE"),
            actorUserId: (aa.user_id as string | null) ?? null,
            actorName: null,
            oldValues: safeJson(aa.old_values),
            newValues: safeJson(aa.new_values),
            metadata: safeJson(aa.metadata),
            createdAt: String(aa.created_at ?? ""),
          };
        }),
      );
    } catch (err) {
      console.error("[useReportDetail] fetch error", err);
      setError("Não foi possível carregar o detalhe deste relato.");
    } finally {
      setIsLoading(false);
    }
  }, [id, source]);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  // HU-5.3 — Optimistic updates
  const applyOptimisticDetail = useCallback((patch: Partial<ReportDetail>) => {
    setDetail((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const applyOptimisticComment = useCallback((comment: ReportComment) => {
    setComments((prev) => [comment, ...prev]);
  }, []);

  return {
    detail,
    author,
    comments,
    auditLog,
    isLoading,
    error,
    refresh: fetchAll,
    applyOptimisticDetail,
    applyOptimisticComment,
  };
}
