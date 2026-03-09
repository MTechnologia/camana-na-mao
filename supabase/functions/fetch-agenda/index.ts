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

// WordPress API response structure - Updated to match actual ACF structure
interface WPAgendaPost {
  id: number;
  title: { rendered: string };
  content: { rendered: string };
  link: string;
  date: string;
  acf?: {
    data?: string; // Format: "20251220" (YYYYMMDD)
    'eventos-listagem'?: Array<{
      horario?: Array<{
        horario_inicio?: string;
        horario_fim?: string;
      }>;
      local_campos?: Array<{
        titulo?: string;
        local_txt?: string;
        descricao_completa?: string;
        imagem?: string;
      }>;
      solicitante_campos?: Array<{
        sol_vereador?: number[];
        sol_depto?: string;
        sol_txt?: string;
      }>;
    }>;
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
  imageUrl?: string;
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
 * Parse date from ACF format (YYYYMMDD) to ISO format (YYYY-MM-DD)
 */
function parseAcfDate(acfDate: string | undefined, fallbackDate: string): string {
  if (acfDate && acfDate.length === 8) {
    const year = acfDate.slice(0, 4);
    const month = acfDate.slice(4, 6);
    const day = acfDate.slice(6, 8);
    return `${year}-${month}-${day}`;
  }
  // Fallback to post date
  return fallbackDate.split('T')[0];
}

/**
 * Parse time string to standard format
 */
function parseTime(timeStr: string | undefined): string {
  if (!timeStr) return '';
  
  // Handle "14:30" format
  const colonMatch = timeStr.match(/^(\d{1,2}):(\d{2})/);
  if (colonMatch) {
    return `${colonMatch[1].padStart(2, '0')}:${colonMatch[2]}`;
  }
  
  // Handle "14h30" format
  const hMatch = timeStr.match(/^(\d{1,2})h(\d{2})?/i);
  if (hMatch) {
    const hours = hMatch[1].padStart(2, '0');
    const minutes = hMatch[2] || '00';
    return `${hours}:${minutes}`;
  }
  
  return timeStr;
}

/**
 * Extract title, location, description and image from local_campos
 * Format is usually: "Event Name\nLocal: Address" or just "Event Name"
 */
function parseLocalCampos(localCampos: { titulo?: string; local_txt?: string; descricao_completa?: string; imagem?: string } | undefined): { title: string; location: string; description: string; imageUrl: string } {
  if (!localCampos) {
    return { title: '', location: 'Câmara Municipal de São Paulo', description: '', imageUrl: '' };
  }

  const rawTitle = localCampos.titulo || '';
  const description = localCampos.descricao_completa || '';
  const imageUrl = localCampos.imagem || '';
  
  // Clean HTML and prefixes like [DIVULGAÇÃO]
  let cleanTitle = stripHtml(rawTitle);
  cleanTitle = cleanTitle.replace(/^\[[^\]]+\]\s*/, '').trim();
  
  // Try to separate title from location
  // Common patterns: "Event\nLocal: Address" or "Event - Local: Address"
  let title = cleanTitle;
  let location = localCampos.local_txt || '';
  
  // Check for "Local:" pattern
  const localMatch = cleanTitle.match(/^(.+?)(?:\n|\s*[-–]\s*)Local:\s*(.+)$/is);
  if (localMatch) {
    title = localMatch[1].trim();
    location = localMatch[2].trim() || location;
  }
  
  // If still no location, use default
  if (!location) {
    location = 'Câmara Municipal de São Paulo';
  }
  
  return { title, location, description: stripHtml(description), imageUrl };
}

/**
 * Map event type based on title and content keywords
 */
function mapEventType(title: string, description: string): string {
  const text = `${title} ${description}`.toLowerCase();
  
  if (text.includes('sessão solene') || text.includes('sessao solene')) {
    return 'cerimonia';
  }
  if (text.includes('sessão') || text.includes('sessao') || text.includes('plenária') || text.includes('plenario')) {
    return 'sessao';
  }
  if (text.includes('comissão') || text.includes('comissao')) {
    return 'comissao';
  }
  if (text.includes('audiência') || text.includes('audiencia')) {
    return 'audiencia';
  }
  if (text.includes('cerimônia') || text.includes('cerimonia') || text.includes('homenagem') || text.includes('outorga')) {
    return 'cerimonia';
  }
  if (text.includes('reunião') || text.includes('reuniao')) {
    return 'reuniao';
  }
  
  return 'geral';
}

/**
 * Transform WordPress post to internal AgendaItem array
 * Each post may contain multiple events in the eventos-listagem array
 */
function transformAgendaPost(post: WPAgendaPost): AgendaItem[] {
  const eventos: AgendaItem[] = [];
  
  try {
    if (!post || !post.id) {
      console.warn('[fetch-agenda] Skipping invalid post: missing id');
      return eventos;
    }

    // Parse the event date from ACF field
    const eventDate = parseAcfDate(post.acf?.data, post.date || new Date().toISOString());
    
    // Get the events array from ACF
    const eventosListagem = post.acf?.['eventos-listagem'] || [];
    
    // If no events in the array, skip this post
    if (eventosListagem.length === 0) {
      console.log(`[fetch-agenda] Post ${post.id} has no eventos-listagem, skipping`);
      return eventos;
    }

    // Process each event in the day container
    for (let i = 0; i < eventosListagem.length; i++) {
      const evento = eventosListagem[i];
      
      // Extract time
      const horarioInfo = evento.horario?.[0];
      const eventTime = parseTime(horarioInfo?.horario_inicio);
      const eventTimeEnd = parseTime(horarioInfo?.horario_fim);
      const timeDisplay = eventTimeEnd ? `${eventTime} - ${eventTimeEnd}` : eventTime;
      
      // Extract title, location, description and image from local_campos
      const localInfo = evento.local_campos?.[0];
      const { title, location, description, imageUrl } = parseLocalCampos(localInfo);
      
      // Skip events without a title
      if (!title) {
        console.log(`[fetch-agenda] Skipping event ${post.id}-${i}: no title`);
        continue;
      }
      
      // Extract organizer from solicitante_campos
      const solicitanteInfo = evento.solicitante_campos?.[0];
      const organizer = solicitanteInfo?.sol_txt || solicitanteInfo?.sol_depto || '';
      
      eventos.push({
        id: `wp-${post.id}-${i}`,
        title,
        description: description.substring(0, 500),
        link: post.link || '',
        eventDate,
        eventTime: timeDisplay,
        location,
        eventType: mapEventType(title, description),
        organizer,
        source: 'Portal da Câmara',
        imageUrl: imageUrl || undefined
      });
    }

    return eventos;
  } catch (err) {
    console.error(`[fetch-agenda] Error transforming post ${post?.id}:`, err);
    return eventos;
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
  console.log(`[fetch-agenda] Received ${posts.length} day containers from API`);

  // Each post can generate multiple events, use flatMap
  const allEvents = posts.flatMap(transformAgendaPost);
  
  // Sort by date and time
  allEvents.sort((a, b) => {
    const dateCompare = a.eventDate.localeCompare(b.eventDate);
    if (dateCompare !== 0) return dateCompare;
    return a.eventTime.localeCompare(b.eventTime);
  });

  console.log(`[fetch-agenda] Successfully extracted ${allEvents.length} individual events`);
  return allEvents;
}

/**
 * Update database cache with fresh data
 */
async function updateDatabaseCache(supabase: ReturnType<typeof createClient>, agenda: AgendaItem[]): Promise<void> {
  console.log(`[fetch-agenda] Updating database cache with ${agenda.length} items...`);
  
  // First, clean old cache entries with the old ID format (wp-XXXXX without event index)
  const { error: deleteError } = await supabase
    .from('agenda_cache')
    .delete()
    .not('id', 'like', 'wp-%-_%');
  
  if (deleteError) {
    console.warn('[fetch-agenda] Error cleaning old cache:', deleteError);
  }
  
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
async function fetchFromDatabaseCache(supabase: ReturnType<typeof createClient>): Promise<AgendaItem[]> {
  console.log('[fetch-agenda] Fetching from database cache...');
  
  const { data, error } = await supabase
    .from('agenda_cache')
    .select('*')
    .order('event_date', { ascending: false })
    .limit(100);

  if (error) {
    console.error('[fetch-agenda] Database cache fetch error:', error);
    throw error;
  }

  if (!data || data.length === 0) {
    console.log('[fetch-agenda] No data in database cache');
    return [];
  }

  console.log(`[fetch-agenda] Retrieved ${data.length} items from database cache`);

  return data.map((row: Record<string, unknown>) => ({
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
