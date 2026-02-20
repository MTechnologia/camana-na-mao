#!/usr/bin/env node
/**
 * Conta quantas URLs existem no sitemap (e no sitemap index, se for o caso).
 * Uso: node scripts/count-sitemap-urls.mjs [url]
 * Padrão: https://www.saopaulo.sp.leg.br/sitemap_index.xml
 */

const SITEMAP_INDEX = process.argv[2] || "https://www.saopaulo.sp.leg.br/sitemap_index.xml";

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "CâmaraNaMao-SitemapCount/1.0" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.text();
}

function parseSitemap(xml) {
  const urls = [];
  const sitemaps = [];
  const locRegex = /<loc>\s*([^<]+)\s*<\/loc>/gi;
  let m;
  while ((m = locRegex.exec(xml)) !== null) {
    const loc = m[1].trim();
    if (/\.xml(\?|$)/i.test(loc)) sitemaps.push(loc);
    else urls.push(loc);
  }
  return { urls, sitemaps };
}

async function countAll(startUrl) {
  let totalUrls = 0;
  const seen = new Set();
  let queue = [startUrl];

  while (queue.length > 0) {
    const url = queue.shift();
    if (seen.has(url)) continue;
    seen.add(url);

    try {
      const xml = await fetchText(url);
      const { urls, sitemaps } = parseSitemap(xml);
      totalUrls += urls.length;
      for (const s of sitemaps) if (!seen.has(s)) queue.push(s);
      if (sitemaps.length > 0) console.log(`  ${url} → ${sitemaps.length} sub-sitemaps, ${urls.length} URLs diretas`);
    } catch (e) {
      console.warn(`  Erro em ${url}:`, e.message);
    }
  }

  return totalUrls;
}

console.log(`Consultando: ${SITEMAP_INDEX}\n`);
countAll(SITEMAP_INDEX)
  .then((n) => console.log(`\nTotal de URLs no sitemap: ${n}`))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
