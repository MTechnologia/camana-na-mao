/**
 * HU-12.2 — Utilitário para serialização CSV de audit logs.
 *
 * Mantém a lógica de escape RFC-4180 isolada do componente AuditLogs
 * pra facilitar testes. Reusado no botão "Exportar CSV".
 */

export interface AuditCsvRow {
  data_hora: string;
  user_id: string;
  usuario: string;
  email: string;
  acao: string;
  entidade: string;
  entidade_id: string;
  ip: string;
  user_agent: string;
  old_values: unknown;
  new_values: unknown;
}

export const AUDIT_CSV_COLUMNS: Array<keyof AuditCsvRow> = [
  "data_hora",
  "user_id",
  "usuario",
  "email",
  "acao",
  "entidade",
  "entidade_id",
  "ip",
  "user_agent",
  "old_values",
  "new_values",
];

/** Escape RFC-4180: aspas duplas + envolver em aspas se contiver `,` `"` `;` ou newline. */
export function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = typeof value === "object" ? JSON.stringify(value) : String(value);
  if (/[",;\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Serializa um array de linhas em CSV (com BOM UTF-8 para Excel). */
export function rowsToCsv(rows: AuditCsvRow[]): string {
  const header = AUDIT_CSV_COLUMNS.join(",");
  const body = rows
    .map((r) => AUDIT_CSV_COLUMNS.map((col) => csvEscape(r[col])).join(","))
    .join("\n");
  return "﻿" + header + "\n" + body;
}
