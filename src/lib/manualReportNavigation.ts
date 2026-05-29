import type { CollectionType } from "@/components/ai/DataCollectionTracker";

/** Marcador enviado pelo chip «Formulário manual». */
export const OPEN_MANUAL_REPORT_MESSAGE = "[OPEN_MANUAL_REPORT]";

export function isOpenManualReportMessage(message: string): boolean {
  return message.trim() === OPEN_MANUAL_REPORT_MESSAGE;
}

export function resolveManualReportPath(collectionType: CollectionType): string {
  if (collectionType === "transport_report") return "/transporte/novo";
  return "/relato-urbano/manual";
}
