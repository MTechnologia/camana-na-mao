-- HU-10 — Triagem, Encaminhamento a Comissões e Acompanhamento ponta a ponta.
--
-- 3 entidades consolidadas:
--
-- 1. report_triage (1:1 com relato)
--    Armazena prioridade (P0-P3), responsável (user_id), status do funil
--    e timestamps de auditoria. Liga a `urban_reports` ou `transport_reports`
--    via (source_table, report_id).
--
-- 2. report_status_events (append-only)
--    Timeline do que aconteceu com cada relato: created, triaged, assigned,
--    prioritized, referred, status_changed, note_added, resolved.
--    Cada evento tem actor_id, occurred_at e jsonb com detalhes.
--
-- 3. report_commission_referrals
--    Encaminhamentos para comissões legislativas. Justificativa obrigatória
--    (mín. 20 chars). Status pending → accepted/rejected → processed.
--
-- Permissões: admin+gestor triam, assessor+admin+gestor encaminham,
-- todos os papéis administrativos visualizam.

-- ===========================================================================
-- 1) report_triage
-- ===========================================================================

CREATE TABLE IF NOT EXISTS public.report_triage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Referência polimórfica para o relato.
  source_table TEXT NOT NULL CHECK (source_table IN ('urban_reports', 'transport_reports')),
  report_id UUID NOT NULL,

  -- Prioridade gerencial (independente do severity informado pelo cidadão).
  priority TEXT CHECK (priority IN ('P0', 'P1', 'P2', 'P3')),

  -- Responsável: outro usuário com perfil staff (admin/gestor/assessor).
  assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Status do funil de triagem (separado de status do relato em si).
  triage_status TEXT NOT NULL DEFAULT 'untriaged'
    CHECK (triage_status IN ('untriaged', 'triaged', 'in_progress', 'resolved', 'closed')),

  -- Observação interna da triagem.
  notes TEXT,

  -- Auditoria.
  triaged_by UUID REFERENCES auth.users(id),
  triaged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.report_triage IS
  'HU-10.1: triagem gerencial dos relatos (prioridade, responsável, status).';

CREATE UNIQUE INDEX IF NOT EXISTS uq_report_triage_source_report
  ON public.report_triage(source_table, report_id);

CREATE INDEX IF NOT EXISTS idx_report_triage_status
  ON public.report_triage(triage_status);

CREATE INDEX IF NOT EXISTS idx_report_triage_assignee
  ON public.report_triage(assignee_id);

CREATE INDEX IF NOT EXISTS idx_report_triage_priority
  ON public.report_triage(priority);

CREATE OR REPLACE FUNCTION public.touch_report_triage_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  IF NEW.triage_status = 'resolved' AND (OLD IS NULL OR OLD.triage_status <> 'resolved') THEN
    NEW.resolved_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_report_triage_updated_at ON public.report_triage;
CREATE TRIGGER trg_report_triage_updated_at
  BEFORE INSERT OR UPDATE ON public.report_triage
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_report_triage_updated_at();

ALTER TABLE public.report_triage ENABLE ROW LEVEL SECURITY;

-- SELECT: admin + gestor + assessor (vereador) visualizam.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'report_triage'
      AND policyname = 'Staff can view triage'
  ) THEN
    CREATE POLICY "Staff can view triage"
      ON public.report_triage FOR SELECT
      USING (
        has_role(auth.uid(), 'admin'::app_role)
        OR has_role(auth.uid(), 'gestor'::app_role)
        OR has_role(auth.uid(), 'assessor'::app_role)
        OR has_role(auth.uid(), 'vereador'::app_role)
      );
  END IF;
END
$$;

-- INSERT/UPDATE: apenas admin + gestor (responsabilidade de triagem).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'report_triage'
      AND policyname = 'Admin and gestor can insert triage'
  ) THEN
    CREATE POLICY "Admin and gestor can insert triage"
      ON public.report_triage FOR INSERT
      WITH CHECK (
        has_role(auth.uid(), 'admin'::app_role)
        OR has_role(auth.uid(), 'gestor'::app_role)
      );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'report_triage'
      AND policyname = 'Admin and gestor can update triage'
  ) THEN
    CREATE POLICY "Admin and gestor can update triage"
      ON public.report_triage FOR UPDATE
      USING (
        has_role(auth.uid(), 'admin'::app_role)
        OR has_role(auth.uid(), 'gestor'::app_role)
      )
      WITH CHECK (
        has_role(auth.uid(), 'admin'::app_role)
        OR has_role(auth.uid(), 'gestor'::app_role)
      );
  END IF;
END
$$;

-- Realtime.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'report_triage'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.report_triage;
  END IF;
END
$$;

-- ===========================================================================
-- 2) report_status_events
-- ===========================================================================

CREATE TABLE IF NOT EXISTS public.report_status_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  source_table TEXT NOT NULL CHECK (source_table IN ('urban_reports', 'transport_reports')),
  report_id UUID NOT NULL,

  event_type TEXT NOT NULL CHECK (event_type IN (
    'created', 'triaged', 'assigned', 'prioritized', 'referred',
    'status_changed', 'note_added', 'resolved', 'reopened'
  )),
  event_data JSONB NOT NULL DEFAULT '{}'::jsonb,

  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.report_status_events IS
  'HU-10.3: timeline append-only de eventos do ciclo de vida de um relato.';

CREATE INDEX IF NOT EXISTS idx_report_status_events_source_report
  ON public.report_status_events(source_table, report_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_report_status_events_occurred_at
  ON public.report_status_events(occurred_at DESC);

ALTER TABLE public.report_status_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'report_status_events'
      AND policyname = 'Staff can view events'
  ) THEN
    CREATE POLICY "Staff can view events"
      ON public.report_status_events FOR SELECT
      USING (
        has_role(auth.uid(), 'admin'::app_role)
        OR has_role(auth.uid(), 'gestor'::app_role)
        OR has_role(auth.uid(), 'assessor'::app_role)
        OR has_role(auth.uid(), 'vereador'::app_role)
      );
  END IF;
END
$$;

-- INSERT: qualquer staff pode anotar eventos (registro de auditoria).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'report_status_events'
      AND policyname = 'Staff can insert events'
  ) THEN
    CREATE POLICY "Staff can insert events"
      ON public.report_status_events FOR INSERT
      WITH CHECK (
        has_role(auth.uid(), 'admin'::app_role)
        OR has_role(auth.uid(), 'gestor'::app_role)
        OR has_role(auth.uid(), 'assessor'::app_role)
        OR has_role(auth.uid(), 'vereador'::app_role)
      );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'report_status_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.report_status_events;
  END IF;
END
$$;

-- ===========================================================================
-- 3) report_commission_referrals
-- ===========================================================================

CREATE TABLE IF NOT EXISTS public.report_commission_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  source_table TEXT NOT NULL CHECK (source_table IN ('urban_reports', 'transport_reports')),
  report_id UUID NOT NULL,

  commission_id UUID NOT NULL REFERENCES public.legislative_commissions(id) ON DELETE RESTRICT,

  -- Justificativa obrigatória, mínimo 20 caracteres (validação no banco
  -- pra reforçar a regra mesmo se o cliente burlar).
  justification TEXT NOT NULL CHECK (char_length(trim(justification)) >= 20),

  -- Status do encaminhamento.
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'rejected', 'processed')),

  -- Notas da comissão (preenchidas após análise).
  commission_notes TEXT,

  referred_by UUID NOT NULL REFERENCES auth.users(id),
  referred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ,
  responded_by UUID REFERENCES auth.users(id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.report_commission_referrals IS
  'HU-10.2: encaminhamentos de relatos a comissões temáticas com justificativa obrigatória.';

CREATE INDEX IF NOT EXISTS idx_report_commission_referrals_source_report
  ON public.report_commission_referrals(source_table, report_id);

CREATE INDEX IF NOT EXISTS idx_report_commission_referrals_commission
  ON public.report_commission_referrals(commission_id);

CREATE INDEX IF NOT EXISTS idx_report_commission_referrals_status
  ON public.report_commission_referrals(status);

CREATE OR REPLACE FUNCTION public.touch_report_commission_referrals_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  IF NEW.status IN ('accepted', 'rejected', 'processed')
     AND (OLD IS NULL OR OLD.status <> NEW.status) THEN
    NEW.responded_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_report_commission_referrals_updated_at ON public.report_commission_referrals;
CREATE TRIGGER trg_report_commission_referrals_updated_at
  BEFORE INSERT OR UPDATE ON public.report_commission_referrals
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_report_commission_referrals_updated_at();

ALTER TABLE public.report_commission_referrals ENABLE ROW LEVEL SECURITY;

-- SELECT: staff geral.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'report_commission_referrals'
      AND policyname = 'Staff can view commission referrals'
  ) THEN
    CREATE POLICY "Staff can view commission referrals"
      ON public.report_commission_referrals FOR SELECT
      USING (
        has_role(auth.uid(), 'admin'::app_role)
        OR has_role(auth.uid(), 'gestor'::app_role)
        OR has_role(auth.uid(), 'assessor'::app_role)
        OR has_role(auth.uid(), 'vereador'::app_role)
      );
  END IF;
END
$$;

-- INSERT: assessor + admin + gestor podem encaminhar.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'report_commission_referrals'
      AND policyname = 'Staff can insert commission referrals'
  ) THEN
    CREATE POLICY "Staff can insert commission referrals"
      ON public.report_commission_referrals FOR INSERT
      WITH CHECK (
        (
          has_role(auth.uid(), 'admin'::app_role)
          OR has_role(auth.uid(), 'gestor'::app_role)
          OR has_role(auth.uid(), 'assessor'::app_role)
        )
        AND referred_by = auth.uid()
      );
  END IF;
END
$$;

-- UPDATE: apenas admin + gestor podem responder/marcar status.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'report_commission_referrals'
      AND policyname = 'Admin and gestor can update commission referrals'
  ) THEN
    CREATE POLICY "Admin and gestor can update commission referrals"
      ON public.report_commission_referrals FOR UPDATE
      USING (
        has_role(auth.uid(), 'admin'::app_role)
        OR has_role(auth.uid(), 'gestor'::app_role)
      )
      WITH CHECK (
        has_role(auth.uid(), 'admin'::app_role)
        OR has_role(auth.uid(), 'gestor'::app_role)
      );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'report_commission_referrals'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.report_commission_referrals;
  END IF;
END
$$;

-- ===========================================================================
-- 4) RPC helper: list_triable_users
--    Retorna lista de usuários que podem ser atribuídos como responsável
--    (admin, gestor, assessor). Útil pra popular o select do TriageEditor.
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.list_triage_assignees()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT,
  role TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'gestor'::app_role)
  ) THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  RETURN QUERY
  SELECT
    ur.user_id,
    au.email::TEXT,
    COALESCE(p.full_name, au.email)::TEXT AS full_name,
    ur.role::TEXT
  FROM public.user_roles ur
  JOIN auth.users au ON au.id = ur.user_id
  LEFT JOIN public.profiles p ON p.id = ur.user_id
  WHERE ur.role IN ('admin', 'gestor', 'assessor')
  ORDER BY ur.role, full_name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_triage_assignees() TO authenticated;
