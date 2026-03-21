/**
 * Remove da visualização a linha técnica "Localização GPS: lat,lon" (o texto completo
 * permanece em message.content para o orchestrator). Retorna coordenadas se a mensagem
 * só tinha essa linha (para fallback com reverse geocode assíncrono).
 */
/** Linha inteira = só o marcador técnico enviado ao backend. */
const GPS_LINE =
  /^Localiza[cç][aã]o\s*GPS\s*:\s*(-?\d+(?:\.\d+)?)\s*[,，]\s*(-?\d+(?:\.\d+)?)\s*$/i;

export type ParsedUserGpsDisplay = {
  /** Texto para mostrar na bolha (sem a linha GPS). */
  visibleText: string;
  /** Preenchido se havia linha GPS na mensagem. */
  hadGpsLine: boolean;
  /** Só lat/lon quando a mensagem era apenas GPS (histórico antigo). */
  coordsOnly: { lat: number; lon: number } | null;
};

export function formatUserMessageHidingGpsLine(raw: string): ParsedUserGpsDisplay {
  const lines = raw.split(/\r?\n/);
  const kept: string[] = [];
  let hadGpsLine = false;
  let coordsOnly: { lat: number; lon: number } | null = null;

  for (const line of lines) {
    const m = line.trim().match(GPS_LINE);
    if (m) {
      hadGpsLine = true;
      const lat = parseFloat(m[1]);
      const lon = parseFloat(m[2]);
      if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
        coordsOnly = { lat, lon };
      }
      continue;
    }
    kept.push(line);
  }

  const visibleText = kept.join("\n").trim();
  const onlyGps = hadGpsLine && !visibleText;
  return {
    visibleText,
    hadGpsLine,
    coordsOnly: onlyGps && coordsOnly ? coordsOnly : null,
  };
}
