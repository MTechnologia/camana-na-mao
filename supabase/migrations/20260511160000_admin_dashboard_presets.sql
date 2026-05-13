-- HU-6.2 — Presets de dashboard salvos por gestor (admin)
-- Permite ao gestor manter várias configurações nomeadas (ex.: "Saúde Q2",
-- "Transporte mensal") e alternar entre elas. Schema é extensível via
-- `config jsonb` para no futuro armazenar filtros / abas / layout além do tema.

-- 1. Tabela
CREATE TABLE IF NOT EXISTS public.admin_dashboard_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(trim(name)) > 0 AND char_length(name) <= 80),
  theme text NOT NULL DEFAULT 'geral',
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- Cada nome é único por usuário (gestores podem ter "Geral" cada um o seu).
  CONSTRAINT admin_dashboard_presets_user_name_unique UNIQUE (user_id, name)
);

COMMENT ON TABLE public.admin_dashboard_presets IS
  'HU-6.2 — Configurações salvas (presets) do dashboard /admin/analytics por gestor.';
COMMENT ON COLUMN public.admin_dashboard_presets.theme IS
  'ID do tema de atuação (catálogo em src/lib/widgetThemes.ts).';
COMMENT ON COLUMN public.admin_dashboard_presets.config IS
  'Configurações adicionais extensíveis: filtros, abas, layout. Estrutura definida em código.';
COMMENT ON COLUMN public.admin_dashboard_presets.is_default IS
  'Quando true, este preset é aplicado automaticamente ao abrir /admin/analytics. Garantido apenas 1 default por usuário via trigger.';

-- Índices auxiliares
CREATE INDEX IF NOT EXISTS idx_admin_dashboard_presets_user_id
  ON public.admin_dashboard_presets(user_id);

-- Índice parcial pra acelerar busca do default do usuário.
CREATE INDEX IF NOT EXISTS idx_admin_dashboard_presets_user_default
  ON public.admin_dashboard_presets(user_id)
  WHERE is_default;

-- 2. Trigger pra updated_at
CREATE OR REPLACE FUNCTION public.touch_admin_dashboard_presets_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_admin_dashboard_presets_updated_at
  ON public.admin_dashboard_presets;
CREATE TRIGGER trg_touch_admin_dashboard_presets_updated_at
  BEFORE UPDATE ON public.admin_dashboard_presets
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_admin_dashboard_presets_updated_at();

-- 3. Trigger pra garantir no máximo 1 default por usuário.
--    Quando um preset é marcado como is_default=true, desmarca os outros
--    do mesmo usuário.
CREATE OR REPLACE FUNCTION public.enforce_single_default_admin_preset()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.is_default THEN
    UPDATE public.admin_dashboard_presets
      SET is_default = false
      WHERE user_id = NEW.user_id
        AND id <> NEW.id
        AND is_default;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_single_default_admin_preset
  ON public.admin_dashboard_presets;
CREATE TRIGGER trg_enforce_single_default_admin_preset
  AFTER INSERT OR UPDATE OF is_default ON public.admin_dashboard_presets
  FOR EACH ROW
  WHEN (NEW.is_default = true)
  EXECUTE FUNCTION public.enforce_single_default_admin_preset();

-- 4. RLS — cada usuário lê/escreve só seus próprios presets, e precisa ser
--    admin ou gestor.
ALTER TABLE public.admin_dashboard_presets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin lê próprios presets" ON public.admin_dashboard_presets;
CREATE POLICY "Admin lê próprios presets"
  ON public.admin_dashboard_presets
  FOR SELECT
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin'::app_role, 'gestor'::app_role)
    )
  );

DROP POLICY IF EXISTS "Admin cria próprios presets" ON public.admin_dashboard_presets;
CREATE POLICY "Admin cria próprios presets"
  ON public.admin_dashboard_presets
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin'::app_role, 'gestor'::app_role)
    )
  );

DROP POLICY IF EXISTS "Admin atualiza próprios presets" ON public.admin_dashboard_presets;
CREATE POLICY "Admin atualiza próprios presets"
  ON public.admin_dashboard_presets
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin'::app_role, 'gestor'::app_role)
    )
  );

DROP POLICY IF EXISTS "Admin remove próprios presets" ON public.admin_dashboard_presets;
CREATE POLICY "Admin remove próprios presets"
  ON public.admin_dashboard_presets
  FOR DELETE
  USING (auth.uid() = user_id);

-- 5. Grants explícitos (RLS é o gatekeeper; mantém padrão do projeto).
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_dashboard_presets TO authenticated;
