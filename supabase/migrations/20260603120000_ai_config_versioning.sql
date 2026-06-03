-- IA — versionamento de prompts, templates e política de rollback por ambiente.
-- Substitui dados mockados da tela /admin/settings/ai.

-- ===========================================================================
-- 1) Templates (globais)
-- ===========================================================================

CREATE TABLE IF NOT EXISTS public.ai_prompt_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  body text NOT NULL,
  variables jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_prompt_templates_variables_array CHECK (jsonb_typeof(variables) = 'array')
);

COMMENT ON TABLE public.ai_prompt_templates IS
  'Templates de system prompt com variáveis {{chave}} validadas na publicação.';

CREATE OR REPLACE FUNCTION public.touch_ai_prompt_templates_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_ai_prompt_templates_updated_at ON public.ai_prompt_templates;
CREATE TRIGGER trg_touch_ai_prompt_templates_updated_at
  BEFORE UPDATE ON public.ai_prompt_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_ai_prompt_templates_updated_at();

-- ===========================================================================
-- 2) Versões por ambiente
-- ===========================================================================

CREATE TABLE IF NOT EXISTS public.ai_config_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  environment text NOT NULL,
  version_label text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  template_id uuid NOT NULL REFERENCES public.ai_prompt_templates(id) ON DELETE RESTRICT,
  model_id text NOT NULL DEFAULT 'gpt-4o-mini',
  body text NOT NULL,
  variable_keys text[] NOT NULL DEFAULT '{}',
  accuracy_pct numeric(5, 2),
  published_at timestamptz,
  published_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_config_versions_environment_chk
    CHECK (environment IN ('production', 'homologation')),
  CONSTRAINT ai_config_versions_status_chk
    CHECK (status IN ('draft', 'active', 'archived')),
  CONSTRAINT ai_config_versions_env_label_uniq UNIQUE (environment, version_label)
);

CREATE UNIQUE INDEX IF NOT EXISTS ai_config_versions_one_active_per_env
  ON public.ai_config_versions (environment)
  WHERE status = 'active';

COMMENT ON TABLE public.ai_config_versions IS
  'Versões publicáveis do prompt por ambiente (produção / homologação).';

CREATE OR REPLACE FUNCTION public.touch_ai_config_versions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_ai_config_versions_updated_at ON public.ai_config_versions;
CREATE TRIGGER trg_touch_ai_config_versions_updated_at
  BEFORE UPDATE ON public.ai_config_versions
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_ai_config_versions_updated_at();

-- ===========================================================================
-- 3) Política de rollback por ambiente
-- ===========================================================================

CREATE TABLE IF NOT EXISTS public.ai_rollback_policies (
  environment text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT true,
  max_accuracy_drop_pct smallint NOT NULL DEFAULT 3,
  observation_hours smallint NOT NULL DEFAULT 24,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT ai_rollback_policies_environment_chk
    CHECK (environment IN ('production', 'homologation')),
  CONSTRAINT ai_rollback_policies_drop_chk
    CHECK (max_accuracy_drop_pct BETWEEN 1 AND 20),
  CONSTRAINT ai_rollback_policies_hours_chk
    CHECK (observation_hours BETWEEN 1 AND 168)
);

COMMENT ON TABLE public.ai_rollback_policies IS
  'Rollback automático se acurácia cair após publicação (por ambiente).';

-- ===========================================================================
-- 4) RLS — somente admin
-- ===========================================================================

ALTER TABLE public.ai_prompt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_config_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_rollback_policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin gerencia ai_prompt_templates" ON public.ai_prompt_templates;
CREATE POLICY "Admin gerencia ai_prompt_templates"
  ON public.ai_prompt_templates
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admin gerencia ai_config_versions" ON public.ai_config_versions;
CREATE POLICY "Admin gerencia ai_config_versions"
  ON public.ai_config_versions
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admin gerencia ai_rollback_policies" ON public.ai_rollback_policies;
CREATE POLICY "Admin gerencia ai_rollback_policies"
  ON public.ai_rollback_policies
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_prompt_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_config_versions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_rollback_policies TO authenticated;

-- ===========================================================================
-- 5) Auditoria (HU-12)
-- ===========================================================================

DROP TRIGGER IF EXISTS trg_audit_ai_prompt_templates ON public.ai_prompt_templates;
CREATE TRIGGER trg_audit_ai_prompt_templates
  AFTER INSERT OR UPDATE OR DELETE ON public.ai_prompt_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_log_changes('ai_prompt_template_changed');

DROP TRIGGER IF EXISTS trg_audit_ai_config_versions ON public.ai_config_versions;
CREATE TRIGGER trg_audit_ai_config_versions
  AFTER INSERT OR UPDATE OR DELETE ON public.ai_config_versions
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_log_changes('ai_config_version_changed');

DROP TRIGGER IF EXISTS trg_audit_ai_rollback_policies ON public.ai_rollback_policies;
CREATE TRIGGER trg_audit_ai_rollback_policies
  AFTER INSERT OR UPDATE OR DELETE ON public.ai_rollback_policies
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_log_changes('ai_rollback_policy_changed');

-- ===========================================================================
-- 6) RPCs atômicas
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.publish_ai_config_version(_version_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_env text;
  v_status text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Apenas admin pode publicar versões de IA';
  END IF;

  SELECT environment, status
  INTO v_env, v_status
  FROM public.ai_config_versions
  WHERE id = _version_id;

  IF v_env IS NULL THEN
    RAISE EXCEPTION 'Versão não encontrada';
  END IF;

  IF v_status <> 'draft' THEN
    RAISE EXCEPTION 'Somente rascunhos podem ser publicados (status atual: %)', v_status;
  END IF;

  UPDATE public.ai_config_versions
  SET status = 'archived', updated_at = now()
  WHERE environment = v_env AND status = 'active';

  UPDATE public.ai_config_versions
  SET
    status = 'active',
    published_at = now(),
    published_by = auth.uid(),
    updated_at = now()
  WHERE id = _version_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reactivate_ai_config_version(_version_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_env text;
  v_status text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Apenas admin pode reativar versões de IA';
  END IF;

  SELECT environment, status
  INTO v_env, v_status
  FROM public.ai_config_versions
  WHERE id = _version_id;

  IF v_env IS NULL THEN
    RAISE EXCEPTION 'Versão não encontrada';
  END IF;

  IF v_status <> 'archived' THEN
    RAISE EXCEPTION 'Somente versões arquivadas podem ser reativadas (status atual: %)', v_status;
  END IF;

  UPDATE public.ai_config_versions
  SET status = 'archived', updated_at = now()
  WHERE environment = v_env AND status = 'active';

  UPDATE public.ai_config_versions
  SET
    status = 'active',
    published_at = now(),
    published_by = auth.uid(),
    updated_at = now()
  WHERE id = _version_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_ai_config_draft(
  p_environment text,
  p_template_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_template_id uuid;
  v_body text;
  v_keys text[];
  v_model text;
  v_label text;
  v_suffix int;
  v_new_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Apenas admin pode criar rascunhos de IA';
  END IF;

  IF p_environment NOT IN ('production', 'homologation') THEN
    RAISE EXCEPTION 'Ambiente inválido: %', p_environment;
  END IF;

  SELECT v.template_id, v.body, v.variable_keys, v.model_id
  INTO v_template_id, v_body, v_keys, v_model
  FROM public.ai_config_versions v
  WHERE v.environment = p_environment AND v.status = 'active'
  LIMIT 1;

  IF v_template_id IS NULL THEN
    SELECT t.id, t.body,
      ARRAY(SELECT jsonb_array_elements(t.variables)->>'key'),
      'gpt-4o-mini'
    INTO v_template_id, v_body, v_keys, v_model
    FROM public.ai_prompt_templates t
    ORDER BY t.created_at
    LIMIT 1;
  END IF;

  IF p_template_id IS NOT NULL THEN
    SELECT t.id, t.body,
      ARRAY(SELECT jsonb_array_elements(t.variables)->>'key'),
      COALESCE(v_model, 'gpt-4o-mini')
    INTO v_template_id, v_body, v_keys, v_model
    FROM public.ai_prompt_templates t
    WHERE t.id = p_template_id;
  END IF;

  IF v_template_id IS NULL THEN
    RAISE EXCEPTION 'Nenhum template disponível para criar rascunho';
  END IF;

  SELECT COALESCE(MAX(
    NULLIF(regexp_replace(version_label, '^[0-9]{4}\.[0-9]{2}\.([0-9]+).*', '\1'), version_label)::int
  ), 0) + 1
  INTO v_suffix
  FROM public.ai_config_versions
  WHERE environment = p_environment
    AND version_label ~ '^[0-9]{4}\.[0-9]{2}\.[0-9]+';

  v_label := to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'YYYY.MM.') || v_suffix::text || '-draft';

  INSERT INTO public.ai_config_versions (
    environment, version_label, status, template_id, model_id, body, variable_keys
  ) VALUES (
    p_environment, v_label, 'draft', v_template_id, v_model, v_body, v_keys
  )
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_ai_rollback_policy(
  p_environment text,
  p_enabled boolean,
  p_max_accuracy_drop_pct smallint,
  p_observation_hours smallint
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Apenas admin pode alterar política de rollback';
  END IF;

  IF p_environment NOT IN ('production', 'homologation') THEN
    RAISE EXCEPTION 'Ambiente inválido: %', p_environment;
  END IF;

  INSERT INTO public.ai_rollback_policies (
    environment, enabled, max_accuracy_drop_pct, observation_hours, updated_by, updated_at
  ) VALUES (
    p_environment, p_enabled, p_max_accuracy_drop_pct, p_observation_hours, auth.uid(), now()
  )
  ON CONFLICT (environment) DO UPDATE SET
    enabled = EXCLUDED.enabled,
    max_accuracy_drop_pct = EXCLUDED.max_accuracy_drop_pct,
    observation_hours = EXCLUDED.observation_hours,
    updated_by = auth.uid(),
    updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.publish_ai_config_version(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reactivate_ai_config_version(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_ai_config_draft(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_ai_rollback_policy(text, boolean, smallint, smallint) TO authenticated;

-- ===========================================================================
-- 7) Seed inicial (conteúdo alinhado ao defaultSystemConfig anterior)
-- ===========================================================================

INSERT INTO public.ai_prompt_templates (id, slug, name, description, body, variables)
VALUES
  (
    'f47ac10b-58cc-4372-a567-0e02b2c3d001'::uuid,
    'tpl-assistente-relatos',
    'Assistente — triagem de relatos',
    'Template padrão para classificação e encaminhamento inicial.',
    E'Você é o assistente institucional da Câmara na Mão.\nContexto: {{regiao}} | Categoria: {{categoria}}\nRegras: prazo máximo de resposta {{prazo_horas}}h; tom {{tom_institucional}}.\nPriorize RN-REL-001 (triagem antes de encaminhamento).',
    '[
      {"key": "regiao", "label": "Região", "example": "Zona Sul", "required": true},
      {"key": "categoria", "label": "Categoria", "example": "Saúde", "required": true},
      {"key": "prazo_horas", "label": "Prazo (horas)", "example": "48", "required": true},
      {"key": "tom_institucional", "label": "Tom", "example": "acolhedor", "required": false}
    ]'::jsonb
  ),
  (
    'f47ac10b-58cc-4372-a567-0e02b2c3d002'::uuid,
    'tpl-avaliacao-servico',
    'Assistente — avaliação de serviços',
    'Conversação guiada para avaliação de equipamentos públicos.',
    E'Conduza avaliação do serviço {{tipo_servico}} em {{bairro}}.\nLimite: {{limite_avaliacoes_dia}} avaliação(ões) por dia por cidadão.\nDimensões: espera, atendimento, infraestrutura, limpeza.',
    '[
      {"key": "tipo_servico", "label": "Tipo de serviço", "example": "UBS", "required": true},
      {"key": "bairro", "label": "Bairro", "example": "Sé", "required": true},
      {"key": "limite_avaliacoes_dia", "label": "Limite diário", "example": "1", "required": true}
    ]'::jsonb
  )
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.ai_rollback_policies (environment, enabled, max_accuracy_drop_pct, observation_hours)
VALUES
  ('production', true, 3, 24),
  ('homologation', true, 5, 24)
ON CONFLICT (environment) DO NOTHING;

-- Produção
INSERT INTO public.ai_config_versions (
  id, environment, version_label, status, template_id, model_id, body, variable_keys,
  accuracy_pct, published_at
)
VALUES
  (
    'a1000001-0000-4000-8000-000000000001'::uuid,
    'production', '2026.05.1', 'active',
    'f47ac10b-58cc-4372-a567-0e02b2c3d001'::uuid,
    'gemini-3.1-flash-lite-preview',
    (SELECT body FROM public.ai_prompt_templates WHERE slug = 'tpl-assistente-relatos'),
    ARRAY['regiao', 'categoria', 'prazo_horas', 'tom_institucional'],
    91.2, '2026-05-10T14:00:00Z'::timestamptz
  ),
  (
    'a1000001-0000-4000-8000-000000000002'::uuid,
    'production', '2026.05.2-draft', 'draft',
    'f47ac10b-58cc-4372-a567-0e02b2c3d001'::uuid,
    'gemini-3.1-flash-lite-preview',
    replace(
      (SELECT body FROM public.ai_prompt_templates WHERE slug = 'tpl-assistente-relatos'),
      'acolhedor', 'formal e objetivo'
    ),
    ARRAY['regiao', 'categoria', 'prazo_horas', 'tom_institucional'],
    NULL, NULL
  ),
  (
    'a1000001-0000-4000-8000-000000000003'::uuid,
    'production', '2026.04.3', 'archived',
    'f47ac10b-58cc-4372-a567-0e02b2c3d001'::uuid,
    'gemini-3.1-flash-lite-preview',
    (SELECT body FROM public.ai_prompt_templates WHERE slug = 'tpl-assistente-relatos'),
    ARRAY['regiao', 'categoria', 'prazo_horas'],
    89.8, '2026-04-28T09:00:00Z'::timestamptz
  )
ON CONFLICT (environment, version_label) DO NOTHING;

-- Homologação
INSERT INTO public.ai_config_versions (
  id, environment, version_label, status, template_id, model_id, body, variable_keys,
  accuracy_pct, published_at
)
VALUES
  (
    'a2000001-0000-4000-8000-000000000001'::uuid,
    'homologation', '2026.05.1-hml', 'active',
    'f47ac10b-58cc-4372-a567-0e02b2c3d001'::uuid,
    'gemini-3.1-flash-lite-preview',
    (SELECT body FROM public.ai_prompt_templates WHERE slug = 'tpl-assistente-relatos'),
    ARRAY['regiao', 'categoria', 'prazo_horas', 'tom_institucional'],
    88.5, '2026-05-10T14:00:00Z'::timestamptz
  ),
  (
    'a2000001-0000-4000-8000-000000000002'::uuid,
    'homologation', '2026.05.2-draft', 'draft',
    'f47ac10b-58cc-4372-a567-0e02b2c3d001'::uuid,
    'gemini-3.1-flash-lite-preview',
    replace(
      (SELECT body FROM public.ai_prompt_templates WHERE slug = 'tpl-assistente-relatos'),
      'acolhedor', 'formal e objetivo'
    ),
    ARRAY['regiao', 'categoria', 'prazo_horas', 'tom_institucional'],
    NULL, NULL
  ),
  (
    'a2000001-0000-4000-8000-000000000003'::uuid,
    'homologation', '2026.04.3', 'archived',
    'f47ac10b-58cc-4372-a567-0e02b2c3d001'::uuid,
    'gemini-3.1-flash-lite-preview',
    (SELECT body FROM public.ai_prompt_templates WHERE slug = 'tpl-assistente-relatos'),
    ARRAY['regiao', 'categoria', 'prazo_horas'],
    89.8, '2026-04-28T09:00:00Z'::timestamptz
  )
ON CONFLICT (environment, version_label) DO NOTHING;
