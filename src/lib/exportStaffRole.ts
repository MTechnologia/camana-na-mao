import type { ExportRole } from "@/lib/exportFields";

/** Cap de linhas e campos restritos: admin vs demais perfis staff (gestor/assessor/vereador). */
export function effectiveExportRole(flags: {
  isAdmin: boolean;
  isGestor: boolean;
  isAssessor: boolean;
  isVereador: boolean;
}): ExportRole | null {
  if (flags.isAdmin) return "admin";
  if (flags.isGestor || flags.isAssessor || flags.isVereador) return "gestor";
  return null;
}
