-- Create agenda_cache table for WordPress API data
CREATE TABLE public.agenda_cache (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  link TEXT,
  event_date DATE,
  event_time TEXT,
  location TEXT,
  event_type TEXT DEFAULT 'geral',
  organizer TEXT,
  cached_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for efficient date-based queries
CREATE INDEX idx_agenda_cache_event_date ON public.agenda_cache(event_date DESC);

-- Enable RLS
ALTER TABLE public.agenda_cache ENABLE ROW LEVEL SECURITY;

-- Public read access for agenda items
CREATE POLICY "Public read access for agenda cache" 
  ON public.agenda_cache 
  FOR SELECT 
  USING (true);

-- Comment for documentation
COMMENT ON TABLE public.agenda_cache IS 'Cache for agenda items fetched from WordPress API (agenda_cerimonial)';