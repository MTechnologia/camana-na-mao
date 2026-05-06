/**
 * Mapeamento de região para o módulo de Analytics de Relatos (HU-1.1).
 *
 * O banco de dados não armazena a "zona" da cidade explicitamente em nenhuma
 * tabela de relatos. As fontes de localização disponíveis são:
 *   - urban_reports.neighborhood
 *   - transport_reports.location / stop_location / stop_name
 *   - public_services.district (via service_ratings.service_id)
 *
 * Este módulo deriva a zona (Norte/Sul/Leste/Oeste/Centro) a partir desses
 * textos livres. A lista de keywords é compartilhada com src/lib/audienciaZonas.ts
 * para manter consistência entre as features de Audiências e Analytics.
 */

import { ZONAS_SAO_PAULO, type ZonaSP, localParaZona } from "@/lib/audienciaZonas";

export const ZONAS_VOLUME = ZONAS_SAO_PAULO;
export type ZonaVolume = ZonaSP;

/**
 * Sentinel value used when nenhum texto de localização foi informado em um
 * relato. Mantemos um bucket próprio para não mascarar a cobertura real dos
 * dados — caso esse bucket fique grande, há sinal de qualidade de dados.
 */
export const ZONA_DESCONHECIDA = "Não informada" as const;

export type ZonaVolumeOuDesconhecida = ZonaVolume | typeof ZONA_DESCONHECIDA;

/**
 * Resolve a zona de SP para um texto livre de bairro/local.
 * Retorna `ZONA_DESCONHECIDA` quando o texto está vazio, em vez do default
 * "Centro" usado em audienciaZonas.ts (que faz sentido para audiências, mas
 * não para analytics — preferimos sinalizar a ausência de dado).
 */
export function bairroParaZona(
  texto: string | null | undefined,
): ZonaVolumeOuDesconhecida {
  const limpo = (texto || "").trim();
  if (!limpo) return ZONA_DESCONHECIDA;
  return localParaZona(limpo);
}

/**
 * Lista canônica de zonas a serem exibidas em filtros, na ordem desejada.
 */
export const ZONAS_FILTRO: readonly ZonaVolumeOuDesconhecida[] = [
  ...ZONAS_SAO_PAULO,
  ZONA_DESCONHECIDA,
] as const;
