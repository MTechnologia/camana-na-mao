# geosampa-wfs-proxy

Proxy para GeoSampa WFS que contorna o bloqueio CORS em produção.

O GeoSampa não envia `Access-Control-Allow-Origin`, então o frontend não consegue buscar diretamente. Esta Edge Function recebe as requisições e encaminha ao GeoSampa.

**URL:** `GET /functions/v1/geosampa-wfs-proxy?service=WFS&typeName=...&maxFeatures=...`

O frontend usa automaticamente quando `VITE_SUPABASE_URL` está configurado em produção.
