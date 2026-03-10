#!/usr/bin/env node
/**
 * Lista camadas WFS disponíveis no GeoSampa (GetCapabilities).
 * Use para descobrir os typeNames corretos ao adicionar novas camadas.
 *
 * Uso: node scripts/list-geosampa-wfs-layers.mjs
 * Opcional: node scripts/list-geosampa-wfs-layers.mjs "acessibilidade"  (filtrar por termo)
 */

const FILTER = process.argv[2]?.toLowerCase() ?? "";

const CAPABILITIES_URL = "https://wfs.geosampa.prefeitura.sp.gov.br/geoserver/geoportal/wfs?service=WFS&version=1.0.0&request=GetCapabilities";

async function main() {
  console.log("Buscando GetCapabilities do GeoSampa...");
  const res = await fetch(CAPABILITIES_URL);
  if (!res.ok) {
    console.error("Erro HTTP", res.status, res.statusText);
    process.exit(1);
  }
  const xml = await res.text();
  const names = [...xml.matchAll(/<Name>([^<]+)<\/Name>/g)].map((m) => m[1]);
  const unique = [...new Set(names)].sort();

  const filtered = FILTER
    ? unique.filter((n) => n.toLowerCase().includes(FILTER))
    : unique;

  if (FILTER) {
    console.log(`\nCamadas contendo "${FILTER}" (${filtered.length}):`);
  } else {
    console.log(`\nTotal de camadas: ${filtered.length}\n`);
  }

  for (const name of filtered) {
    const short = name.replace(/^geoportal:/, "");
    console.log("  ", short);
  }

  if (filtered.length === 0 && FILTER) {
    console.log("  (nenhuma camada encontrada)");
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
