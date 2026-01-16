import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// In-memory cache with 10-minute TTL
let memoryCache: AgendaItem[] | null = null;
let memoryCacheTimestamp = 0;
const MEMORY_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// WordPress API response structure
interface WPAgendaPost {
  id: number;
  title: { rendered: string };
  content: { rendered: string };
  link: string;
  date: string;
  acf?: {
    data_evento?: string;
    hora_evento?: string;
    local_evento?: string;
    organizador?: string;
  };
}

// Internal agenda item structure
interface AgendaItem {
  id: string;
  title: string;
  description: string;
  link: string;
  eventDate: string;
  eventTime: string;
  location: string;
  eventType: string;
  organizer: string;
  source: string;
}

/**
 * Remove HTML tags and decode entities
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—')
    .replace(/&#8216;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract event date from content or title
 * Common formats: "DD/MM/YYYY", "DD de MMMM"
 */
function extractEventDate(content: string, postDate: string): string {
  // Try to find date pattern DD/MM/YYYY
  const dateMatch = content.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dateMatch) {
    const [, day, month, year] = dateMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // Try to find pattern "DD de MMMM"
  const months: Record<string, string> = {
    'janeiro': '01', 'fevereiro': '02', 'março': '03', 'abril': '04',
    'maio': '05', 'junho': '06', 'julho': '07', 'agosto': '08',
    'setembro': '09', 'outubro': '10', 'novembro': '11', 'dezembro': '12'
  };
  
  const monthMatch = content.toLowerCase().match(/(\d{1,2})\s+de\s+(janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)/);
  if (monthMatch) {
    const day = monthMatch[1].padStart(2, '0');
    const month = months[monthMatch[2]];

    // Infer year based on post publication date to avoid wrong-year filtering (e.g. "01 de dezembro")
    const postDateOnly = (postDate || '').split('T')[0]; // YYYY-MM-DD
    const postYear = Number(postDateOnly.split('-')[0]) || new Date().getFullYear();
    const postMonth = Number(postDateOnly.split('-')[1]) || (new Date().getMonth() + 1);
    const extractedMonth = Number(month);

    // Handle year boundary heuristics:
    // - If post is early-year (Jan) and extracted month is late-year (Dec), assume previous year
    // - If post is late-year (Dec) and extracted month is early-year (Jan), assume next year
    let year = postYear;
    const monthDiff = extractedMonth - postMonth;
    if (monthDiff >= 6) year = postYear - 1;
    if (monthDiff <= -6) year = postYear + 1;

    return `${year}-${month}-${day}`;
  }

  // Fallback to post publication date
  return postDate.split('T')[0];
}

/**
 * Extract event time from content
 * Common formats: "14h", "14h30", "14:30"
 */
function extractEventTime(content: string): string {
  // Try "14h30" or "14h" format
  const timeMatch = content.match(/(\d{1,2})h(\d{2})?/i);
  if (timeMatch) {
    const hours = timeMatch[1].padStart(2, '0');
    const minutes = timeMatch[2] || '00';
    return `${hours}:${minutes}`;
  }

  // Try "14:30" format
  const colonMatch = content.match(/(\d{1,2}):(\d{2})/);
  if (colonMatch) {
    return `${colonMatch[1].padStart(2, '0')}:${colonMatch[2]}`;
  }

  return '';
}

/**
 * Extract location from content
 */
function extractLocation(content: string): string {
  const locationPatterns = [
    /local:\s*([^<\n]+)/i,
    /onde:\s*([^<\n]+)/i,
    /endereço:\s*([^<\n]+)/i,
    /(plenário[^<\n,]*)/i,
    /(auditório[^<\n,]*)/i,
    /(sala[^<\n,]*\d+[^<\n,]*)/i,
  ];

  for (const pattern of locationPatterns) {
    const match = content.match(pattern);
    if (match) {
      return stripHtml(match[1]).substring(0, 200);
    }
  }

  return 'Câmara Municipal de São Paulo';
}

/**
 * Map event type based on title and content keywords
 */
function mapEventType(title: string, content: string): string {
  const text = `${title} ${content}`.toLowerCase();
  
  if (text.includes('sessão') || text.includes('plenária') || text.includes('plenario')) {
    return 'sessao';
  }
  if (text.includes('comissão') || text.includes('comissao')) {
    return 'comissao';
  }
  if (text.includes('audiência') || text.includes('audiencia') || text.includes('audiência pública')) {
    return 'audiencia';
  }
  if (text.includes('cerimônia') || text.includes('cerimonia') || text.includes('homenagem')) {
    return 'cerimonia';
  }
  if (text.includes('reunião') || text.includes('reuniao')) {
    return 'reuniao';
  }
  
  return 'geral';
}

/**
 * Extract organizer from content
 */
function extractOrganizer(content: string): string {
  const organizerPatterns = [
    /organiza[çc][ãa]o:\s*([^<\n]+)/i,
    /promovido por:\s*([^<\n]+)/i,
    /realiza[çc][ãa]o:\s*([^<\n]+)/i,
  ];

  for (const pattern of organizerPatterns) {
    const match = content.match(pattern);
    if (match) {
      return stripHtml(match[1]).substring(0, 200);
    }
  }

  return 'Câmara Municipal de São Paulo';
}

/**
 * Transform WordPress post to internal AgendaItem
 */
function transformAgendaPost(post: WPAgendaPost): AgendaItem | null {
  try {
    // Validate required fields
    if (!post || !post.id) {
      console.warn('[fetch-agenda] Skipping invalid post: missing id');
      return null;
    }

    const title = post.title?.rendered ? stripHtml(post.title.rendered) : '';
    const content = post.content?.rendered || '';
    const cleanContent = stripHtml(content);

    // Skip posts without title
    if (!title) {
      console.warn(`[fetch-agenda] Skipping post ${post.id}: no title`);
      return null;
    }

    // Try to get data from ACF fields first, fallback to extraction
    const eventDate = post.acf?.data_evento || extractEventDate(cleanContent, post.date || new Date().toISOString());
    const eventTime = post.acf?.hora_evento || extractEventTime(cleanContent);
    const location = post.acf?.local_evento || extractLocation(cleanContent);
    const organizer = post.acf?.organizador || extractOrganizer(cleanContent);

    return {
      id: `wp-${post.id}`,
      title,
      description: cleanContent.substring(0, 500),
      link: post.link || '',
      eventDate,
      eventTime,
      location,
      eventType: mapEventType(title, cleanContent),
      organizer,
      source: 'Portal da Câmara'
    };
  } catch (err) {
    console.error(`[fetch-agenda] Error transforming post ${post?.id}:`, err);
    return null;
  }
}

/**
 * Fetch agenda from WordPress API
 */
async function fetchFromAPI(): Promise<AgendaItem[]> {
  console.log('[fetch-agenda] Fetching from WordPress API...');
  
  const response = await fetch(
    'https://www.saopaulo.sp.leg.br/wp-json/wp/v2/agenda_cerimonial?per_page=100&orderby=date&order=desc',
    {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'CamaraNaMao/1.0'
      }
    }
  );

  if (!response.ok) {
    throw new Error(`WordPress API error: ${response.status}`);
  }

  const posts: WPAgendaPost[] = await response.json();
  console.log(`[fetch-agenda] Received ${posts.length} agenda items from API`);

  // Filter out null results from failed transformations
  const validItems = posts
    .map(transformAgendaPost)
    .filter((item): item is AgendaItem => item !== null);

  console.log(`[fetch-agenda] Successfully transformed ${validItems.length} items`);
  return validItems;
}

/**
 * Update database cache with fresh data
 */
async function updateDatabaseCache(supabase: any, agenda: AgendaItem[]): Promise<void> {
  console.log(`[fetch-agenda] Updating database cache with ${agenda.length} items...`);
  
  const records = agenda.map(item => ({
    id: item.id,
    title: item.title,
    description: item.description,
    link: item.link,
    event_date: item.eventDate,
    event_time: item.eventTime,
    location: item.location,
    event_type: item.eventType,
    organizer: item.organizer,
    cached_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));

  const { error } = await supabase
    .from('agenda_cache')
    .upsert(records, { onConflict: 'id' });

  if (error) {
    console.error('[fetch-agenda] Database cache update error:', error);
  } else {
    console.log('[fetch-agenda] Database cache updated successfully');
  }
}

/**
 * Fetch agenda from database cache (fallback)
 */
async function fetchFromDatabaseCache(supabase: any): Promise<AgendaItem[]> {
  console.log('[fetch-agenda] Fetching from database cache...');
  
  const { data, error } = await supabase
    .from('agenda_cache')
    .select('*')
    .order('event_date', { ascending: false })
    .limit(50);

  if (error) {
    console.error('[fetch-agenda] Database cache fetch error:', error);
    throw error;
  }

  if (!data || data.length === 0) {
    console.log('[fetch-agenda] No data in database cache');
    return [];
  }

  console.log(`[fetch-agenda] Retrieved ${data.length} items from database cache`);

  return data.map((row: any) => ({
    id: row.id,
    title: row.title,
    description: row.description || '',
    link: row.link || '',
    eventDate: row.event_date,
    eventTime: row.event_time || '',
    location: row.location || '',
    eventType: row.event_type || 'geral',
    organizer: row.organizer || '',
    source: 'Cache'
  }));
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check memory cache first
    const now = Date.now();
    if (memoryCache && (now - memoryCacheTimestamp) < MEMORY_CACHE_TTL) {
      console.log('[fetch-agenda] Serving from memory cache');
      return new Response(
        JSON.stringify({ 
          agenda: memoryCache, 
          source: 'memory-cache',
          count: memoryCache.length 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let agenda: AgendaItem[];
    let source = 'api';

    try {
      // Try to fetch from WordPress API
      agenda = await fetchFromAPI();
      
      // Update memory cache
      memoryCache = agenda;
      memoryCacheTimestamp = now;

      // Update database cache in background
      updateDatabaseCache(supabase, agenda).catch(err => 
        console.error('[fetch-agenda] Background cache update failed:', err)
      );
    } catch (apiError) {
      console.error('[fetch-agenda] API fetch failed, falling back to database:', apiError);
      
      // Fallback to database cache
      agenda = await fetchFromDatabaseCache(supabase);
      source = 'database-cache';

      if (agenda.length > 0) {
        // Update memory cache with database data
        memoryCache = agenda;
        memoryCacheTimestamp = now;
      }
    }

    console.log(`[fetch-agenda] Returning ${agenda.length} items from ${source}`);

    return new Response(
      JSON.stringify({ 
        agenda, 
        source,
        count: agenda.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[fetch-agenda] Fatal error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch agenda',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
