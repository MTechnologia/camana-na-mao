import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface CacheEntry<T> {
  key: string;
  data: T;
  expiresAt: number;
  createdAt: number;
}

// Cache em memória para hot data
const memoryCache = new Map<string, CacheEntry<unknown>>();
const MAX_MEMORY_CACHE_SIZE = 1000;

export async function getCached<T>(
  key: string,
  ttlSeconds: number = 300
): Promise<T | null> {
  // Verificar cache em memória primeiro
  const memoryEntry = memoryCache.get(key);
  if (memoryEntry && memoryEntry.expiresAt > Date.now()) {
    return memoryEntry.data as T;
  }

  // Verificar cache no banco
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase
    .from('api_cache')
    .select('data, expires_at')
    .eq('cache_key', key)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (error || !data) {
    return null;
  }

  // Atualizar cache em memória
  const parsedData = typeof data.data === 'string' ? JSON.parse(data.data) : data.data;
  memoryCache.set(key, {
    key,
    data: parsedData,
    expiresAt: new Date(data.expires_at).getTime(),
    createdAt: Date.now(),
  });

  // Limpar cache antigo se necessário
  if (memoryCache.size > MAX_MEMORY_CACHE_SIZE) {
    const oldestKey = Array.from(memoryCache.entries())
      .sort((a, b) => a[1].createdAt - b[1].createdAt)[0][0];
    memoryCache.delete(oldestKey);
  }

  return parsedData as T;
}

export async function setCached<T>(
  key: string,
  data: T,
  ttlSeconds: number = 300
): Promise<void> {
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

  // Atualizar cache em memória
  memoryCache.set(key, {
    key,
    data,
    expiresAt: expiresAt.getTime(),
    createdAt: Date.now(),
  });

  // Salvar no banco (não bloqueante)
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  supabase
    .from('api_cache')
    .upsert({
      cache_key: key,
      data: typeof data === 'string' ? data : JSON.stringify(data),
      expires_at: expiresAt.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .catch(err => {
      console.error('[cache] Failed to persist cache:', err);
    });
}

export async function invalidateCache(pattern: string): Promise<void> {
  // Limpar cache em memória
  for (const key of memoryCache.keys()) {
    if (key.includes(pattern)) {
      memoryCache.delete(key);
    }
  }

  // Limpar cache no banco
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  await supabase
    .from('api_cache')
    .delete()
    .like('cache_key', `%${pattern}%`);
}
