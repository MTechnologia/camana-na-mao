-- Favoritos de equipamentos públicos (atalho rápido; distinto de service_subscriptions / notificações).

CREATE TABLE public.service_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.public_services(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, service_id)
);

CREATE INDEX idx_service_favorites_user_created ON public.service_favorites (user_id, created_at DESC);
CREATE INDEX idx_service_favorites_service ON public.service_favorites (service_id);

ALTER TABLE public.service_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own service favorites"
  ON public.service_favorites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own service favorites"
  ON public.service_favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own service favorites"
  ON public.service_favorites FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.service_favorites IS
  'Favoritos do munícipe em public_services; não dispara notificações (ver service_subscriptions).';
