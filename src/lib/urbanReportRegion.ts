import { regionLabel } from "@/lib/analyticsLabels";
import { bairroParaZona, ZONA_DESCONHECIDA } from "@/lib/regionMapping";

export type UrbanReportLocationFields = {
  locationAddress?: string | null;
  neighborhood?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

/** Zona canônica (ex.: "Zona Oeste") a partir de bairro/coords. */
export function resolveUrbanReportZone(fields: UrbanReportLocationFields): string {
  const text = [fields.neighborhood, fields.locationAddress].filter(Boolean).join(" ");
  const zone = bairroParaZona(text, fields.latitude, fields.longitude);
  return zone === ZONA_DESCONHECIDA ? "" : zone;
}

/**
 * Rótulo territorial para tabelas: endereço — bairro — zona.
 * Ex.: "Avenida … 1477 - Jardim Everest - Zona Oeste"
 */
export function formatUrbanReportRegionLabel(fields: UrbanReportLocationFields): string {
  const parts: string[] = [];
  const address = fields.locationAddress?.trim();
  const neighborhood = fields.neighborhood?.trim();
  const zone = resolveUrbanReportZone(fields);

  if (address) parts.push(address);
  if (neighborhood && neighborhood !== address) parts.push(neighborhood);
  if (zone) parts.push(zone);

  return parts.length > 0 ? parts.join(" - ") : "—";
}

/** Recorte global de região (`central`, `west`, …) vs dados do relato. */
export function urbanReportMatchesGlobalRegion(
  fields: UrbanReportLocationFields,
  regionKey: string,
): boolean {
  if (!regionKey || regionKey === "all") return true;
  const zoneLabel = regionLabel(regionKey);
  const text = [fields.neighborhood, fields.locationAddress].filter(Boolean).join(" ");
  return bairroParaZona(text, fields.latitude, fields.longitude) === zoneLabel;
}
