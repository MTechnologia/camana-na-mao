-- Create search history table
CREATE TABLE IF NOT EXISTS public.search_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  search_query TEXT NOT NULL,
  search_type TEXT NOT NULL DEFAULT 'general', -- general, vereador, audiencia, servico, etc
  result_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own search history"
ON public.search_history
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own search history"
ON public.search_history
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own search history"
ON public.search_history
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_search_history_user_created ON public.search_history(user_id, created_at DESC);