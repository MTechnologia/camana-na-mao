-- HU-6.1 — Preferências de widgets/temas do gestor para /admin/analytics
-- Cada usuário admin pode escolher um "tema de atuação" (saúde, transporte,
-- segurança, etc.) que filtra e prioriza as tabs/widgets de analytics.
-- A escolha persiste entre sessões e dispositivos.

-- 1. Tabela: 1 linha por usuário admin.
CREATE TABLE IF NOT EXISTS public.admin_widget_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  theme text NOT NULL DEFAULT 'geral',
  widget_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Comentários para documentação
COMMENT ON TABLE public.admin_widget_preferences IS
  'HU-6.1 — Preferências de personalização do dashboard /admin/analytics por usuário gestor/admin.';
COMMENT ON COLUMN public.admin_widget_preferences.theme IS
  'ID do tema de atuação selecionado (geral, saude, educacao, seguranca, transporte, infraestrutura, limpeza_ambiente, cultura_lazer, assistencia_social). Catálogo canônico em src/lib/widgetThemes.ts.';
COMMENT ON COLUMN public.admin_widget_preferences.widget_config IS
  'Configurações extras: { hiddenTabs?: string[], tabOrder?: string[], version: number }. Versionado para evoluir sem breaking.';

-- 2. Trigger pra manter updated_at.
CREATE OR REPLACE FUNCTION public.touch_admin_widget_preferences_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_admin_widget_preferences_updated_at ON public.admin_widget_preferences;
CREATE TRIGGER trg_touch_admin_widget_preferences_updated_at
  BEFORE UPDATE ON public.admin_widget_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_admin_widget_preferences_updated_at();

-- 3. RLS — cada usuário só lê/escreve a sua própria linha.
--    Restrito a admin/gestor: usar role check em policy.
ALTER TABLE public.admin_widget_preferences ENABLE ROW LEVEL SECURITY;

-- SELECT: usuário lê só a própria linha, e precisa ser admin ou gestor.
DROP POLICY IF EXISTS "Admin pode ler própria preferência de widget" ON public.admin_widget_preferences;
CREATE POLICY "Admin pode ler própria preferência de widget"
  ON public.admin_widget_preferences
  FOR SELECT
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin'::app_role, 'gestor'::app_role)
    )
  );

-- INSERT: usuário cria só a própria linha (upsert via cliente).
DROP POLICY IF EXISTS "Admin pode criar própria preferência de widget" ON public.admin_widget_preferences;
CREATE POLICY "Admin pode criar própria preferência de widget"
  ON public.admin_widget_preferences
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin'::app_role, 'gestor'::app_role)
    )
  );

-- UPDATE: idem.
DROP POLICY IF EXISTS "Admin pode atualizar própria preferência de widget" ON public.admin_widget_preferences;
CREATE POLICY "Admin pode atualizar própria preferência de widget"
  ON public.admin_widget_preferences
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

-- DELETE: idem (caso o usuário queira "resetar" a preferência).
DROP POLICY IF EXISTS "Admin pode remover própria preferência de widget" ON public.admin_widget_preferences;
CREATE POLICY "Admin pode remover própria preferência de widget"
  ON public.admin_widget_preferences
  FOR DELETE
  USING (auth.uid() = user_id);

-- 4. Grants explícitos (RLS já é o gatekeeper, mas seguimos o padrão do projeto).
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_widget_preferences TO authenticated;
