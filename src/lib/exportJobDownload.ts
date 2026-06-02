import { supabase } from "@/integrations/supabase/client";

const STORAGE_BUCKET = "export-files";
const SIGNED_URL_EXPIRES_SECONDS = 60 * 60 * 24 * 7;

export type ExportJobDownloadRow = {
  id: string;
  status: string;
  storage_path: string | null;
  format: string;
  dataset: string;
};

/** Busca job de exportação do usuário autenticado (RLS). */
export async function fetchExportJobForDownload(
  jobId: string,
): Promise<{ job: ExportJobDownloadRow | null; error?: string }> {
  const { data, error } = await supabase
    .from("export_jobs")
    .select("id, status, storage_path, format, dataset")
    .eq("id", jobId)
    .maybeSingle();

  if (error) {
    console.error("[exportJobDownload] fetch", error);
    return { job: null, error: "Não foi possível localizar a exportação." };
  }
  if (!data) {
    return { job: null, error: "Exportação não encontrada ou sem permissão." };
  }
  return { job: data as ExportJobDownloadRow };
}

/** Gera signed URL e dispara download no navegador. */
export async function downloadExportJobById(
  jobId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { job, error: fetchError } = await fetchExportJobForDownload(jobId);
  if (fetchError || !job) {
    return { ok: false, error: fetchError ?? "Exportação indisponível." };
  }
  if (job.status !== "completed" || !job.storage_path) {
    return { ok: false, error: "O arquivo ainda não está pronto para download." };
  }

  const { data, error: urlError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(job.storage_path, SIGNED_URL_EXPIRES_SECONDS);

  if (urlError || !data?.signedUrl) {
    console.error("[exportJobDownload] signed URL", urlError);
    return { ok: false, error: "Não foi possível gerar o link de download." };
  }

  window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  return { ok: true };
}

export function exportDownloadPath(jobId: string): string {
  return `/admin/exports?jobId=${encodeURIComponent(jobId)}`;
}
