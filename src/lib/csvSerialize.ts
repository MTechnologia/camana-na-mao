/**
 * HU-7.1 — Serialização CSV pura (sem libs externas).
 *
 * Segue o essencial do RFC 4180:
 *  - Separador de campo: vírgula
 *  - Separador de linha: \r\n
 *  - Campos com vírgula, aspas duplas ou quebra de linha → cercados por aspas duplas
 *  - Aspas duplas dentro do campo → escapadas duplicando ("")
 *  - Prefixa BOM UTF-8 (﻿) pra Excel detectar UTF-8 corretamente
 *  - null/undefined → string vazia
 *  - Objetos/arrays → JSON.stringify
 */

const FIELD_SEPARATOR = ",";
const LINE_SEPARATOR = "\r\n";
const UTF8_BOM = "﻿";

const NEEDS_QUOTING = /[",\r\n]/;

export interface CsvHeader {
  key: string;
  label: string;
}

export interface SerializeOptions {
  /** Inclui o BOM no início (default true; recomendado para Excel). */
  includeBom?: boolean;
}

/**
 * Escapa um único valor para CSV. Exposto para testes; uso interno principal.
 */
export function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  let s: string;
  if (typeof value === "string") {
    s = value;
  } else if (typeof value === "number" || typeof value === "boolean") {
    s = String(value);
  } else if (value instanceof Date) {
    s = value.toISOString();
  } else if (Array.isArray(value)) {
    // Arrays: serializa cada elemento como JSON, separados por "; ".
    s = value
      .map((v) => (typeof v === "string" ? v : JSON.stringify(v)))
      .join("; ");
  } else {
    // Objetos: JSON.stringify
    try {
      s = JSON.stringify(value);
    } catch {
      s = String(value);
    }
  }
  if (NEEDS_QUOTING.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Serializa headers + rows num CSV. Os rows usam os `headers[i].key` para
 * extrair valores. O CSV usa `headers[i].label` como cabeçalho.
 */
export function serializeCsv(
  headers: CsvHeader[],
  rows: Array<Record<string, unknown>>,
  options: SerializeOptions = {},
): string {
  const { includeBom = true } = options;
  const headerLine = headers.map((h) => csvEscape(h.label)).join(FIELD_SEPARATOR);
  const bodyLines = rows.map((row) =>
    headers.map((h) => csvEscape(row[h.key])).join(FIELD_SEPARATOR),
  );
  const csv = [headerLine, ...bodyLines].join(LINE_SEPARATOR);
  return includeBom ? UTF8_BOM + csv : csv;
}

/**
 * Helper para acionar o download de um CSV no navegador.
 *
 * Estratégia adaptativa:
 *   1. Dentro do APK Android (WebView): envia o CSV via postMessage para
 *      o nativo, que salva e abre o menu de Compartilhar (expo-sharing).
 *   2. Em PWA standalone (Android instalado / iOS Add to Home Screen):
 *      `<a download>` é bloqueado; abre em nova aba para o user salvar
 *      via menu do navegador.
 *   3. Em qualquer outro contexto (desktop, mobile browser comum):
 *      `<a download>` programático funciona normalmente.
 */
import { isInsideNativeApp, postFileToNative } from "./nativeBridge";

export function downloadCsv(csv: string, filename: string): void {
  if (typeof window === "undefined") return;

  // 1. Dentro do APK — envia pro nativo.
  if (isInsideNativeApp()) {
    const sent = postFileToNative(csv, filename, "text/csv");
    if (sent) return;
    // Fallback se a bridge falhar: tenta o caminho web normal.
  }

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  // 2. PWA standalone — abre em nova aba.
  const isStandalonePwa =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;

  if (isStandalonePwa) {
    window.open(url, "_blank", "noopener,noreferrer");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return;
  }

  // 3. Caminho padrão: download direto via <a download>.
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Constantes exportadas para testes / consumidores que precisem do separador. */
export const __csvInternals = { FIELD_SEPARATOR, LINE_SEPARATOR, UTF8_BOM };
