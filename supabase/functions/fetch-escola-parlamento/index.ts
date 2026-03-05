import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// WordPress API response interface
interface WPPage {
  id: number;
  date: string;
  date_gmt: string;
  modified: string;
  modified_gmt: string;
  slug: string;
  status: string;
  type: string;
  link: string;
  title: { rendered: string };
  content: { rendered: string };
  excerpt: { rendered: string };
  parent: number;
  menu_order: number;
  _embedded?: {
    'wp:featuredmedia'?: Array<{ source_url: string }>;
  };
}

// Internal course/page interface
interface EscolaParlamentoItem {
  id: string;
  wp_id: number;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  link: string;
  date: string;
  modified: string;
  parent: number | null;
  menu_order: number;
  imageUrl: string | null;
  category: string;
  status: string;
}

// In-memory cache
let memoryCache: EscolaParlamentoItem[] | null = null;
let memoryCacheTimestamp = 0;
const MEMORY_CACHE_TTL = 30 * 60 * 1000; // 30 minutes (longer cache for static content)

// WordPress API URL
const WP_API_BASE = 'https://www.saopaulo.sp.leg.br/escoladoparlamento/wp-json/wp/v2/pages';
const PER_PAGE = 100; // WordPress max per_page

// Helper: Strip HTML tags
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8211;/g, '-')
    .replace(/&#8212;/g, '—')
    .replace(/\s+/g, ' ')
    .trim();
}

// Helper: Extract first image URL from HTML content
function extractImageUrl(html: string): string | null {
  const imgMatch = html.match(/<img[^>]+src="([^"]+)"/);
  return imgMatch ? imgMatch[1] : null;
}

// Helper: Determine category based on slug/parent/content
function determineCategory(slug: string, parent: number, content: string): string {
  const lowerSlug = slug.toLowerCase();
  const lowerContent = content.toLowerCase();
  
  // Check slug patterns
  if (lowerSlug.includes('curso') || lowerSlug.includes('cursos')) {
    return 'curso';
  }
  if (lowerSlug.includes('evento') || lowerSlug.includes('eventos')) {
    return 'evento';
  }
  if (lowerSlug.includes('material') || lowerSlug.includes('recursos')) {
    return 'material';
  }
  if (lowerSlug.includes('inscricao') || lowerSlug.includes('inscrições')) {
    return 'inscricao';
  }
  
  // Check content patterns
  if (lowerContent.includes('curso') || lowerContent.includes('capacitação')) {
    return 'curso';
  }
  if (lowerContent.includes('evento') || lowerContent.includes('palestra')) {
    return 'evento';
  }
  
  return 'geral';
}

// Transform WordPress page to internal format
function transformPage(page: WPPage): EscolaParlamentoItem {
  const title = stripHtml(page.title.rendered);
  const excerpt = stripHtml(page.excerpt.rendered);
  const content = page.content.rendered;
  
  // Try to get featured image, fallback to first image in content
  let imageUrl = page._embedded?.['wp:featuredmedia']?.[0]?.source_url || null;
  if (!imageUrl) {
    imageUrl = extractImageUrl(content);
  }
  
  return {
    id: `ep-${page.id}`,
    wp_id: page.id,
    title,
    slug: page.slug,
    content,
    excerpt: excerpt.length > 300 ? excerpt.substring(0, 300) + '...' : excerpt,
    link: page.link,
    date: page.date,
    modified: page.modified,
    parent: page.parent || null,
    menu_order: page.menu_order,
    imageUrl,
    category: determineCategory(page.slug, page.parent, content),
    status: page.status,
  };
}

// Fetch all pages from WordPress API (handles pagination)
async function fetchAllPages(): Promise<EscolaParlamentoItem[]> {
  console.log('[fetch-escola-parlamento] Starting to fetch all pages...');
  
  const allPages: EscolaParlamentoItem[] = [];
  let page = 1;
  let hasMore = true;
  let totalPages = 1;
  
  while (hasMore) {
    try {
      const url = `${WP_API_BASE}?per_page=${PER_PAGE}&page=${page}&orderby=modified&order=desc&_embed`;
      console.log(`[fetch-escola-parlamento] Fetching page ${page} from: ${url}`);
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'CamaraNaMao/1.0',
        },
      });
      
      if (!response.ok) {
        throw new Error(`WordPress API error: ${response.status} ${response.statusText}`);
      }
      
      // Get total pages from headers
      const totalPagesHeader = response.headers.get('X-WP-TotalPages');
      if (totalPagesHeader) {
        totalPages = parseInt(totalPagesHeader, 10);
        console.log(`[fetch-escola-parlamento] Total pages: ${totalPages}`);
      }
      
      const pages: WPPage[] = await response.json();
      console.log(`[fetch-escola-parlamento] Received ${pages.length} pages from page ${page}`);
      
      if (pages.length === 0) {
        hasMore = false;
      } else {
        const transformed = pages.map(transformPage);
        allPages.push(...transformed);
        
        // Check if we've reached the last page
        if (page >= totalPages || pages.length < PER_PAGE) {
          hasMore = false;
        } else {
          page++;
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
    } catch (error) {
      console.error(`[fetch-escola-parlamento] Error fetching page ${page}:`, error);
      // If we have some data, return what we have
      if (allPages.length > 0) {
        console.log(`[fetch-escola-parlamento] Returning ${allPages.length} pages despite error`);
        return allPages;
      }
      throw error;
    }
  }
  
  console.log(`[fetch-escola-parlamento] Fetched total of ${allPages.length} pages`);
  return allPages;
}

// Update database cache
async function updateDatabaseCache(
  supabase: ReturnType<typeof createClient>,
  items: EscolaParlamentoItem[]
): Promise<void> {
  console.log(`[fetch-escola-parlamento] Updating database cache with ${items.length} items...`);
  
  try {
    // Delete old cache
    const { error: deleteError } = await supabase
      .from('escola_parlamento_cache')
      .delete()
      .neq('id', 'dummy'); // Delete all
    
    if (deleteError) {
      console.error('[fetch-escola-parlamento] Error deleting old cache:', deleteError);
    }
    
    // Insert new cache in batches (Supabase has a limit)
    const batchSize = 100;
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const records = batch.map(item => ({
        id: item.id,
        wp_id: item.wp_id,
        title: item.title,
        slug: item.slug,
        content: item.content,
        excerpt: item.excerpt,
        link: item.link,
        date: item.date,
        modified: item.modified,
        parent: item.parent,
        menu_order: item.menu_order,
        image_url: item.imageUrl,
        category: item.category,
        status: item.status,
        cached_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
      
      const { error } = await supabase
        .from('escola_parlamento_cache')
        .insert(records);
      
      if (error) {
        console.error(`[fetch-escola-parlamento] Error inserting batch ${i / batchSize + 1}:`, error);
      } else {
        console.log(`[fetch-escola-parlamento] Inserted batch ${i / batchSize + 1} (${batch.length} items)`);
      }
    }
    
    console.log('[fetch-escola-parlamento] Database cache updated successfully');
  } catch (err) {
    console.error('[fetch-escola-parlamento] Failed to update database cache:', err);
  }
}

// Fetch from database cache (fallback)
async function fetchFromDatabaseCache(supabase: ReturnType<typeof createClient>): Promise<EscolaParlamentoItem[]> {
  console.log('[fetch-escola-parlamento] Fetching from database cache...');
  
  const { data, error } = await supabase
    .from('escola_parlamento_cache')
    .select('*')
    .order('modified', { ascending: false });
  
  if (error) {
    console.error('[fetch-escola-parlamento] Database cache fetch error:', error);
    return [];
  }
  
  if (!data || data.length === 0) {
    console.log('[fetch-escola-parlamento] No data in database cache');
    return [];
  }
  
  console.log(`[fetch-escola-parlamento] Retrieved ${data.length} items from database cache`);
  
  return data.map((row: Record<string, unknown>) => ({
    id: row.id,
    wp_id: row.wp_id,
    title: row.title,
    slug: row.slug,
    content: row.content,
    excerpt: row.excerpt,
    link: row.link,
    date: row.date,
    modified: row.modified,
    parent: row.parent,
    menu_order: row.menu_order,
    imageUrl: row.image_url,
    category: row.category,
    status: row.status,
  }));
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const now = Date.now();
    
    // Check memory cache first
    if (memoryCache && (now - memoryCacheTimestamp) < MEMORY_CACHE_TTL) {
      console.log('[fetch-escola-parlamento] Serving from memory cache');
      return new Response(
        JSON.stringify({ 
          items: memoryCache, 
          total: memoryCache.length,
          source: 'memory_cache' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Try fetching from WordPress API
    try {
      const items = await fetchAllPages();
      
      // Update memory cache
      memoryCache = items;
      memoryCacheTimestamp = now;
      
      // Update database cache in background (don't await)
      updateDatabaseCache(supabase, items).catch(err => {
        console.error('[fetch-escola-parlamento] Background cache update failed:', err);
      });
      
      console.log('[fetch-escola-parlamento] Serving fresh data from API');
      return new Response(
        JSON.stringify({ 
          items, 
          total: items.length,
          source: 'api' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
      
    } catch (apiError) {
      console.error('[fetch-escola-parlamento] API fetch failed:', apiError);
      
      // If we have stale memory cache, use it
      if (memoryCache) {
        console.log('[fetch-escola-parlamento] Serving stale memory cache');
        return new Response(
          JSON.stringify({ 
            items: memoryCache, 
            total: memoryCache.length,
            source: 'stale_memory_cache' 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Fallback to database cache
      const cachedItems = await fetchFromDatabaseCache(supabase);
      
      if (cachedItems.length > 0) {
        // Populate memory cache with database data
        memoryCache = cachedItems;
        memoryCacheTimestamp = now;
        
        console.log('[fetch-escola-parlamento] Serving from database cache');
        return new Response(
          JSON.stringify({ 
            items: cachedItems, 
            total: cachedItems.length,
            source: 'database_cache' 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // No data available
      return new Response(
        JSON.stringify({ 
          error: 'Não foi possível carregar os dados da Escola do Parlamento. Tente novamente mais tarde.',
          items: [],
          total: 0
        }),
        { 
          status: 503, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
  } catch (error) {
    console.error('[fetch-escola-parlamento] Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor', 
        items: [],
        total: 0
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
