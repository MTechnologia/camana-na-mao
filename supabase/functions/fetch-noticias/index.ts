import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// WordPress API response interface
interface WPPost {
  id: number;
  title: { rendered: string };
  excerpt: { rendered: string };
  content: { rendered: string };
  link: string;
  date: string;
  categories: number[];
  _embedded?: {
    'wp:featuredmedia'?: Array<{ source_url: string }>;
  };
}

// Internal news interface
interface Noticia {
  id: string;
  title: string;
  description: string;
  fullContent: string;
  link: string;
  pubDate: string;
  category: string;
  imageUrl: string | null;
  readTime: string;
  source: string;
}

// In-memory cache
let memoryCache: Noticia[] | null = null;
let memoryCacheTimestamp = 0;
const MEMORY_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// WordPress API URL
const WP_API_URL = 'https://www.saopaulo.sp.leg.br/wp-json/wp/v2/posts';

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

// Helper: Calculate read time (~200 words per minute)
function calculateReadTime(text: string): string {
  const words = text.split(/\s+/).filter(w => w.length > 0).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes} min`;
}

// Helper: Map category based on content/link patterns
function mapCategory(link: string, content: string): string {
  const lowerLink = link.toLowerCase();
  const lowerContent = content.toLowerCase();
  
  if (lowerLink.includes('/saude/') || lowerContent.includes('saúde') || lowerContent.includes('ubs')) {
    return 'saude';
  }
  if (lowerLink.includes('/educacao/') || lowerContent.includes('educação') || lowerContent.includes('escola')) {
    return 'educacao';
  }
  if (lowerLink.includes('/mobilidade/') || lowerContent.includes('transporte') || lowerContent.includes('ônibus')) {
    return 'mobilidade';
  }
  if (lowerLink.includes('/cultura/') || lowerContent.includes('cultural') || lowerContent.includes('teatro')) {
    return 'cultura';
  }
  if (lowerLink.includes('/meio-ambiente/') || lowerContent.includes('meio ambiente') || lowerContent.includes('verde')) {
    return 'ambiente';
  }
  if (lowerContent.includes('audiência') || lowerContent.includes('sessão')) {
    return 'audiencia';
  }
  
  return 'legislativo';
}

// Transform WordPress post to internal format
function transformPost(post: WPPost): Noticia {
  const title = stripHtml(post.title.rendered);
  const description = stripHtml(post.excerpt.rendered);
  const fullContent = post.content.rendered;
  const plainContent = stripHtml(fullContent);
  
  // Try to get featured image, fallback to first image in content
  let imageUrl = post._embedded?.['wp:featuredmedia']?.[0]?.source_url || null;
  if (!imageUrl) {
    imageUrl = extractImageUrl(fullContent);
  }
  
  return {
    id: `wp-${post.id}`,
    title,
    description: description.length > 200 ? description.substring(0, 200) + '...' : description,
    fullContent,
    link: post.link,
    pubDate: post.date,
    category: mapCategory(post.link, plainContent),
    imageUrl,
    readTime: calculateReadTime(plainContent),
    source: 'Portal da Câmara Municipal de São Paulo',
  };
}

// Fetch from WordPress API
async function fetchFromAPI(): Promise<Noticia[]> {
  console.log('[fetch-noticias] Fetching from WordPress API...');
  
  const response = await fetch(`${WP_API_URL}?per_page=20&_embed`, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'CamaraNaMao/1.0',
    },
  });
  
  if (!response.ok) {
    throw new Error(`WordPress API error: ${response.status} ${response.statusText}`);
  }
  
  const posts: WPPost[] = await response.json();
  console.log(`[fetch-noticias] Received ${posts.length} posts from API`);
  
  return posts.map(transformPost);
}

// Update database cache
async function updateDatabaseCache(supabase: ReturnType<typeof createClient>, noticias: Noticia[]): Promise<void> {
  console.log(`[fetch-noticias] Updating database cache with ${noticias.length} news items...`);
  
  try {
    const records = noticias.map(n => ({
      id: n.id,
      title: n.title,
      description: n.description,
      full_content: n.fullContent,
      link: n.link,
      pub_date: n.pubDate,
      category: n.category,
      image_url: n.imageUrl,
      read_time: n.readTime,
      cached_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
    
    const { error } = await supabase
      .from('news_cache')
      .upsert(records, { onConflict: 'id' });
    
    if (error) {
      console.error('[fetch-noticias] Database cache update error:', error);
    } else {
      console.log('[fetch-noticias] Database cache updated successfully');
    }
  } catch (err) {
    console.error('[fetch-noticias] Failed to update database cache:', err);
  }
}

// Fetch from database cache (fallback)
async function fetchFromDatabaseCache(supabase: ReturnType<typeof createClient>): Promise<Noticia[]> {
  console.log('[fetch-noticias] Fetching from database cache...');
  
  const { data, error } = await supabase
    .from('news_cache')
    .select('*')
    .order('pub_date', { ascending: false })
    .limit(20);
  
  if (error) {
    console.error('[fetch-noticias] Database cache fetch error:', error);
    return [];
  }
  
  if (!data || data.length === 0) {
    console.log('[fetch-noticias] No data in database cache');
    return [];
  }
  
  console.log(`[fetch-noticias] Retrieved ${data.length} items from database cache`);
  
  return data.map((row: Record<string, unknown>) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    fullContent: row.full_content,
    link: row.link,
    pubDate: row.pub_date,
    category: row.category,
    imageUrl: row.image_url,
    readTime: row.read_time,
    source: 'Portal da Câmara Municipal de São Paulo',
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
      console.log('[fetch-noticias] Serving from memory cache');
      return new Response(
        JSON.stringify({ noticias: memoryCache, source: 'memory_cache' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Try fetching from WordPress API
    try {
      const noticias = await fetchFromAPI();
      
      // Update memory cache
      memoryCache = noticias;
      memoryCacheTimestamp = now;
      
      // Update database cache in background (don't await)
      updateDatabaseCache(supabase, noticias);
      
      console.log('[fetch-noticias] Serving fresh data from API');
      return new Response(
        JSON.stringify({ noticias, source: 'api' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
      
    } catch (apiError) {
      console.error('[fetch-noticias] API fetch failed:', apiError);
      
      // If we have stale memory cache, use it
      if (memoryCache) {
        console.log('[fetch-noticias] Serving stale memory cache');
        return new Response(
          JSON.stringify({ noticias: memoryCache, source: 'stale_memory_cache' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Fallback to database cache
      const cachedNoticias = await fetchFromDatabaseCache(supabase);
      
      if (cachedNoticias.length > 0) {
        // Populate memory cache with database data
        memoryCache = cachedNoticias;
        memoryCacheTimestamp = now;
        
        console.log('[fetch-noticias] Serving from database cache');
        return new Response(
          JSON.stringify({ noticias: cachedNoticias, source: 'database_cache' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // No data available
      return new Response(
        JSON.stringify({ 
          error: 'Não foi possível carregar as notícias. Tente novamente mais tarde.',
          noticias: [] 
        }),
        { 
          status: 503, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
  } catch (error) {
    console.error('[fetch-noticias] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor', noticias: [] }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
