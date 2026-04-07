-- Armazena sugestões persistidas por usuário (ex.: histórico de busca "Perto de você" sincronizado na nuvem).
-- Substituição em lote via RPC executável apenas por service_role (chamada a partir da Edge Function).

CREATE TABLE IF NOT EXISTS public.user_app_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  context text NOT NULL DEFAULT 'nearby_search',
  stable_id text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('text', 'place', 'equipment')),
  label text NOT NULL CHECK (char_length(label) <= 500),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_touched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_app_suggestions_user_context_stable_unique UNIQUE (user_id, context, stable_id),
  CONSTRAINT user_app_suggestions_context_len CHECK (char_length(context) <= 64),
  CONSTRAINT user_app_suggestions_stable_id_len CHECK (char_length(stable_id) <= 220)
);

CREATE INDEX IF NOT EXISTS user_app_suggestions_user_context_touched_idx
  ON public.user_app_suggestions (user_id, context, last_touched_at DESC);

COMMENT ON TABLE public.user_app_suggestions IS
  'Sugestões/itens salvos por usuário e contexto (ex. nearby_search). Sincronização via Edge Function sync-app-suggestions.';

ALTER TABLE public.user_app_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_app_suggestions_select_own"
  ON public.user_app_suggestions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_app_suggestions_insert_own"
  ON public.user_app_suggestions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_app_suggestions_update_own"
  ON public.user_app_suggestions
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "user_app_suggestions_delete_own"
  ON public.user_app_suggestions
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.replace_user_app_suggestions_for_user(
  p_user_id uuid,
  p_context text,
  p_items jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_len int;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'invalid user';
  END IF;
  IF p_context IS NULL OR length(trim(p_context)) = 0 OR length(p_context) > 64 THEN
    RAISE EXCEPTION 'invalid context';
  END IF;

  v_len := coalesce(jsonb_array_length(p_items), 0);
  IF v_len > 30 THEN
    RAISE EXCEPTION 'too many items';
  END IF;

  DELETE FROM public.user_app_suggestions
  WHERE user_id = p_user_id AND context = p_context;

  INSERT INTO public.user_app_suggestions (
    user_id,
    context,
    stable_id,
    kind,
    label,
    payload,
    last_touched_at
  )
  SELECT
    p_user_id,
    p_context,
    left(trim(elem->>'stableId'), 220),
    trim(elem->>'kind'),
    left(trim(elem->>'label'), 500),
    CASE
      WHEN jsonb_typeof(elem->'payload') = 'object' THEN elem->'payload'
      ELSE '{}'::jsonb
    END,
    coalesce((elem->>'lastTouchedAt')::timestamptz, now())
  FROM jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) AS t(elem)
  WHERE length(trim(coalesce(elem->>'stableId', ''))) > 0
    AND trim(elem->>'kind') IN ('text', 'place', 'equipment')
    AND length(trim(coalesce(elem->>'label', ''))) > 0;
END;
$fn$;

REVOKE ALL ON FUNCTION public.replace_user_app_suggestions_for_user(uuid, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.replace_user_app_suggestions_for_user(uuid, text, jsonb) TO service_role;
