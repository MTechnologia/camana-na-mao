/**
 * Diagnóstico: classificação por zona vs Supabase (últimos 30 dias).
 * Uso: node scripts/diagnose-zone-classification.mjs
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function loadEnv() {
  const raw = readFileSync(resolve(root, '.env'), 'utf8');
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i < 0) continue;
    const key = line.slice(0, i).trim();
    let val = line.slice(i + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

// Inline minimal copies of app logic (no TS import in .mjs)
const ZONA_KEYWORDS = [
  { zona: 'Centro', keywords: ['centro', 'sé', 'república', 'liberdade', 'bela vista'] },
  { zona: 'Zona Norte', keywords: ['zona norte', 'santana', 'tucuruvi', 'casa verde', 'limão'] },
  { zona: 'Zona Sul', keywords: ['zona sul', 'moema', 'vila mariana', 'santo amaro', 'campo belo'] },
  { zona: 'Zona Leste', keywords: ['zona leste', 'tatuapé', 'penha', 'itaquera', 'são mateus'] },
  { zona: 'Zona Oeste', keywords: ['zona oeste', 'lapa', 'pinheiros', 'butantã', 'vila madalena'] },
];

const SP_BOUNDING_BOXES = [
  { zona: 'Centro', boxes: [{ minLat: -23.56, maxLat: -23.53, minLng: -46.66, maxLng: -46.62 }] },
  { zona: 'Zona Norte', boxes: [{ minLat: -23.52, maxLat: -23.44, minLng: -46.74, maxLng: -46.58 }] },
  { zona: 'Zona Sul', boxes: [{ minLat: -23.7, maxLat: -23.58, minLng: -46.72, maxLng: -46.58 }] },
  { zona: 'Zona Leste', boxes: [{ minLat: -23.62, maxLat: -23.52, minLng: -46.52, maxLng: -46.38 }] },
  { zona: 'Zona Oeste', boxes: [{ minLat: -23.58, maxLat: -23.5, minLng: -46.78, maxLng: -46.66 }] },
];

function pointInBox(lat, lng, b) {
  return lat >= b.minLat && lat <= b.maxLat && lng >= b.minLng && lng <= b.maxLng;
}

function coordinatesToZone(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -24.0 || lat > -23.35 || lng < -46.85 || lng > -46.35) return null;
  for (const def of SP_BOUNDING_BOXES) {
    if (def.boxes.some((b) => pointInBox(lat, lng, b))) return def.zona;
  }
  return null;
}

function localParaZonaOuNull(text) {
  const t = (text || '').toLowerCase().trim();
  if (!t) return null;
  for (const { zona, keywords } of ZONA_KEYWORDS) {
    if (keywords.some((k) => t.includes(k))) return zona;
  }
  return null;
}

function normalizeCoords(lat, lng) {
  let la = Number(lat);
  let lo = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return { lat: null, lng: null };
  if (la > 0) la = -la;
  if (lo > 0 && Math.abs(la) < 10) {
    const tmp = la;
    la = lo > 0 ? -lo : lo;
    lo = tmp;
  }
  return { lat: la, lng: lo };
}

function bairroParaZona(texto, lat, lng) {
  const { lat: la, lng: lo } = normalizeCoords(lat, lng);
  if (la != null && lo != null) {
    const fromCoords = coordinatesToZone(la, lo);
    if (fromCoords) return fromCoords;
  }
  const fromText = localParaZonaOuNull(texto);
  if (fromText) return fromText;
  return 'Não informada';
}

const env = loadEnv();
const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY necessários no .env');
  process.exit(1);
}

const sb = createClient(url, key);
const now = new Date();
const start = new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10);
const end = now.toISOString().slice(0, 10);

const { data: rpc, error: rpcErr } = await sb.rpc('get_reports_with_demographics', {
  p_gender: null,
  p_race: null,
  p_social_class: null,
  p_age_group: null,
  p_report_type: null,
  p_start_date: new Date(start).toISOString(),
  p_end_date: new Date(`${end}T23:59:59`).toISOString(),
});
if (rpcErr) {
  console.error('RPC error', rpcErr);
  process.exit(1);
}

const { data: urban, error: urbanErr } = await sb
  .from('urban_reports')
  .select('id, neighborhood, latitude, longitude, location_address, category')
  .neq('category', 'feedback_camara')
  .gte('created_at', `${start}T00:00:00`)
  .lte('created_at', `${end}T23:59:59`);

if (urbanErr) {
  console.error('urban error', urbanErr);
  process.exit(1);
}

const { data: transport } = await sb
  .from('transport_reports')
  .select('location, stop_location')
  .gte('created_at', `${start}T00:00:00`)
  .lte('created_at', `${end}T23:59:59`);

const counts = {
  Centro: 0,
  'Zona Norte': 0,
  'Zona Sul': 0,
  'Zona Leste': 0,
  'Zona Oeste': 0,
  'Não informada': 0,
};
const reasons = { coords: 0, text: 0, none: 0, gap: 0 };

for (const r of urban ?? []) {
  const text = [r.neighborhood, r.location_address].filter(Boolean).join(' ');
  const { lat, lng } = normalizeCoords(r.latitude, r.longitude);
  let zone = 'Não informada';
  let reason = 'none';
  if (lat != null && lng != null) {
    const z = coordinatesToZone(lat, lng);
    if (z) {
      zone = z;
      reason = 'coords';
    }
  }
  if (zone === 'Não informada') {
    const zt = localParaZonaOuNull(text);
    if (zt) {
      zone = zt;
      reason = 'text';
    }
  }
  counts[zone] += 1;
  reasons[reason] += 1;
}

for (const t of transport ?? []) {
  const text = (t.location || t.stop_location || '').toString();
  const zone = bairroParaZona(text, null, null);
  counts[zone] += 1;
  if (zone === 'Não informada') reasons.none += 1;
  else reasons.text += 1;
}

const zoneSum = Object.values(counts).reduce((a, b) => a + b, 0);
const total = rpc.total ?? 0;
const gap = Math.max(0, total - zoneSum);

console.log('Período:', start, '→', end);
console.log('RPC total:', total, '| urban:', rpc.urban_count, '| transport:', rpc.transport_count);
console.log('Linhas urban+transport classificadas:', zoneSum);
console.log('Gap (total RPC − zoneSum):', gap, '→ iria para Não informada no app');
console.log('\nPor zona (sem gap RPC):');
for (const [z, c] of Object.entries(counts)) console.log(`  ${z}: ${c}`);
console.log('\nMotivo classificação (urban):');
console.log('  coords:', reasons.coords, '| texto:', reasons.text, '| sem match:', reasons.none);

const sampleUnknown = (urban ?? [])
  .filter((r) => {
    const text = [r.neighborhood, r.location_address].filter(Boolean).join(' ');
    return bairroParaZona(text, r.latitude, r.longitude) === 'Não informada';
  })
  .slice(0, 5);
console.log('\nAmostra Não informada (até 5):');
for (const r of sampleUnknown) {
  console.log(
    `  id=${r.id} nb=${JSON.stringify(r.neighborhood)} lat=${r.latitude} lng=${r.longitude} addr=${(r.location_address || '').slice(0, 60)}`,
  );
}
