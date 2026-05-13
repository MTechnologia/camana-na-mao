-- HU-7.4 + HU-7.5 — Infraestrutura de exports server-side: jobs assíncronos
-- (grande volumetria) e agendamentos periódicos com entrega por Supabase Storage.

-- ============================================================================
-- 1. STORAGE BUCKET — arquivos gerados pela edge function
-- ============================================================================
-- Bucket privado: só o dono do job lê via signed URL gerada na edge function.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'export-files',
  'export-files',
  false,
  -- 200MB de limite por arquivo (XLSX 1M linhas costuma dar ~60-80MB compactado).
  200 * 1024 * 1024,
  ARRAY[
    'text/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Policies do bucket: usuário só lê/baixa do próprio path.
-- Path convencional: `{user_id}/{job_id}.{ext}`.
DROP POLICY IF EXISTS "Usuário lê próprios export-files" ON storage.objects;
CREATE POLICY "Usuário lê próprios export-files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'export-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- INSERT/UPDATE/DELETE só por service_role (edge function). Sem policies aqui
-- = service_role bypass; usuário comum não escreve nada no bucket.

-- ============================================================================
-- 2. TABELA scheduled_exports — agendamentos periódicos (criada PRIMEIRO porque
--    export_jobs tem FK referenciando-a)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.scheduled_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(trim(name)) > 0 AND char_length(name) <= 80),
  -- Configuração do export (mesmo shape do job)
  dataset text NOT NULL,
  format text NOT NULL CHECK (format IN ('csv', 'xlsx')),
  fields jsonb NOT NULL,
  order_by jsonb NOT NULL,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  include_summary boolean NOT NULL DEFAULT false,
  -- Recorrência: 'daily' | 'weekly' | 'monthly'
  recurrence text NOT NULL CHECK (recurrence IN ('daily', 'weekly', 'monthly')),
  -- Hora local (24h) e dia da semana (1-7, segunda=1, opcional para weekly) /
  -- dia do mês (1-31, opcional para monthly).
  run_hour integer NOT NULL DEFAULT 7 CHECK (run_hour BETWEEN 0 AND 23),
  run_minute integer NOT NULL DEFAULT 0 CHECK (run_minute BETWEEN 0 AND 59),
  weekday integer CHECK (weekday BETWEEN 1 AND 7),
  monthday integer CHECK (monthday BETWEEN 1 AND 31),
  -- Controle
  enabled boolean NOT NULL DEFAULT true,
  last_run_at timestamptz,
  next_run_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT scheduled_exports_user_name_unique UNIQUE (user_id, name)
);

COMMENT ON TABLE public.scheduled_exports IS
  'HU-7.4 — Agendamentos periódicos de export. Cron job dispara process-export-job para cada linha onde enabled=true e next_run_at <= now().';

CREATE INDEX IF NOT EXISTS idx_scheduled_exports_user
  ON public.scheduled_exports(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_exports_due
  ON public.scheduled_exports(next_run_at)
  WHERE enabled = true;

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.touch_scheduled_exports_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_scheduled_exports_updated_at ON public.scheduled_exports;
CREATE TRIGGER trg_touch_scheduled_exports_updated_at
  BEFORE UPDATE ON public.scheduled_exports
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_scheduled_exports_updated_at();

-- ============================================================================
-- 3. TABELA export_jobs — uma linha por execução de export
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.export_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dataset text NOT NULL,
  format text NOT NULL CHECK (format IN ('csv', 'xlsx')),
  fields jsonb NOT NULL,            -- array de field_ids
  order_by jsonb NOT NULL,          -- { fieldId, direction }
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  include_summary boolean NOT NULL DEFAULT false,
  -- Origem: 'manual' (clique no dialog) ou 'scheduled' (cron).
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'scheduled')),
  scheduled_export_id uuid REFERENCES public.scheduled_exports(id) ON DELETE SET NULL,
  -- Tracking
  status text NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'running', 'completed', 'failed', 'cancelled')
  ),
  row_count integer,
  storage_path text,    -- ex: '{user_id}/{job_id}.csv'
  error text,
  -- Metadados
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz
);

COMMENT ON TABLE public.export_jobs IS
  'HU-7.4+7.5 — Execução assíncrona de export server-side. Para volumes >50k linhas ou execuções agendadas.';
COMMENT ON COLUMN public.export_jobs.storage_path IS
  'Caminho relativo no bucket export-files. Signed URL é gerada via supabase.storage.from().createSignedUrl().';

CREATE INDEX IF NOT EXISTS idx_export_jobs_user_status
  ON public.export_jobs(user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_export_jobs_pending
  ON public.export_jobs(status, created_at)
  WHERE status = 'pending';

-- ============================================================================
-- 4. RLS — usuário só vê os próprios; precisa ser admin/gestor
-- ============================================================================
ALTER TABLE public.export_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_exports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin lê próprios export_jobs" ON public.export_jobs;
CREATE POLICY "Admin lê próprios export_jobs"
  ON public.export_jobs FOR SELECT
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin'::app_role, 'gestor'::app_role)
    )
  );

DROP POLICY IF EXISTS "Admin cria próprios export_jobs" ON public.export_jobs;
CREATE POLICY "Admin cria próprios export_jobs"
  ON public.export_jobs FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin'::app_role, 'gestor'::app_role)
    )
  );

DROP POLICY IF EXISTS "Admin atualiza próprios export_jobs" ON public.export_jobs;
CREATE POLICY "Admin atualiza próprios export_jobs"
  ON public.export_jobs FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin remove próprios export_jobs" ON public.export_jobs;
CREATE POLICY "Admin remove próprios export_jobs"
  ON public.export_jobs FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin lê próprios scheduled_exports" ON public.scheduled_exports;
CREATE POLICY "Admin lê próprios scheduled_exports"
  ON public.scheduled_exports FOR SELECT
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin'::app_role, 'gestor'::app_role)
    )
  );

DROP POLICY IF EXISTS "Admin cria próprios scheduled_exports" ON public.scheduled_exports;
CREATE POLICY "Admin cria próprios scheduled_exports"
  ON public.scheduled_exports FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin'::app_role, 'gestor'::app_role)
    )
  );

DROP POLICY IF EXISTS "Admin atualiza próprios scheduled_exports" ON public.scheduled_exports;
CREATE POLICY "Admin atualiza próprios scheduled_exports"
  ON public.scheduled_exports FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin remove próprios scheduled_exports" ON public.scheduled_exports;
CREATE POLICY "Admin remove próprios scheduled_exports"
  ON public.scheduled_exports FOR DELETE
  USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.export_jobs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scheduled_exports TO authenticated;

-- ============================================================================
-- 5. FUNÇÃO: calcular next_run_at a partir da recurrência
-- ============================================================================
-- Recebe a config atual e o timestamp base (geralmente now() ou last_run_at)
-- e retorna o próximo disparo. Usada por trigger + edge function de cron.
CREATE OR REPLACE FUNCTION public.calc_next_export_run(
  p_recurrence text,
  p_run_hour integer,
  p_run_minute integer,
  p_weekday integer,
  p_monthday integer,
  p_base timestamptz DEFAULT now()
) RETURNS timestamptz
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  v_base_date date := (p_base AT TIME ZONE 'America/Sao_Paulo')::date;
  v_target timestamptz;
  v_today_at_time timestamptz;
BEGIN
  -- Sempre opera em horário São Paulo e converte de volta para timestamptz.
  v_today_at_time := (v_base_date::text || ' ' || lpad(p_run_hour::text, 2, '0') || ':' || lpad(p_run_minute::text, 2, '0') || ':00')::timestamp
    AT TIME ZONE 'America/Sao_Paulo';

  IF p_recurrence = 'daily' THEN
    IF v_today_at_time > p_base THEN
      v_target := v_today_at_time;
    ELSE
      v_target := v_today_at_time + INTERVAL '1 day';
    END IF;
  ELSIF p_recurrence = 'weekly' THEN
    -- Próxima ocorrência do weekday (1=seg .. 7=dom)
    DECLARE
      v_today_dow integer := extract(isodow from v_base_date)::integer;
      v_days_ahead integer;
    BEGIN
      v_days_ahead := p_weekday - v_today_dow;
      IF v_days_ahead < 0 OR (v_days_ahead = 0 AND v_today_at_time <= p_base) THEN
        v_days_ahead := v_days_ahead + 7;
      END IF;
      v_target := v_today_at_time + (v_days_ahead || ' days')::interval;
    END;
  ELSIF p_recurrence = 'monthly' THEN
    DECLARE
      v_target_date date;
    BEGIN
      v_target_date := date_trunc('month', v_base_date)::date + (p_monthday - 1) * INTERVAL '1 day';
      v_target := (v_target_date::text || ' ' || lpad(p_run_hour::text, 2, '0') || ':' || lpad(p_run_minute::text, 2, '0') || ':00')::timestamp
        AT TIME ZONE 'America/Sao_Paulo';
      IF v_target <= p_base THEN
        v_target_date := date_trunc('month', v_base_date + INTERVAL '1 month')::date + (p_monthday - 1) * INTERVAL '1 day';
        v_target := (v_target_date::text || ' ' || lpad(p_run_hour::text, 2, '0') || ':' || lpad(p_run_minute::text, 2, '0') || ':00')::timestamp
          AT TIME ZONE 'America/Sao_Paulo';
      END IF;
    END;
  ELSE
    v_target := p_base + INTERVAL '1 day'; -- fallback defensivo
  END IF;

  RETURN v_target;
END;
$$;

-- Trigger pra setar next_run_at automaticamente em insert/update.
CREATE OR REPLACE FUNCTION public.auto_set_scheduled_export_next_run()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Sempre recalcula em insert; em update apenas se config relevante mudou
  -- ou se ainda não tem next_run_at.
  IF (TG_OP = 'INSERT')
     OR NEW.next_run_at IS NULL
     OR OLD.recurrence IS DISTINCT FROM NEW.recurrence
     OR OLD.run_hour IS DISTINCT FROM NEW.run_hour
     OR OLD.run_minute IS DISTINCT FROM NEW.run_minute
     OR OLD.weekday IS DISTINCT FROM NEW.weekday
     OR OLD.monthday IS DISTINCT FROM NEW.monthday
  THEN
    NEW.next_run_at := public.calc_next_export_run(
      NEW.recurrence, NEW.run_hour, NEW.run_minute, NEW.weekday, NEW.monthday, now()
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_set_scheduled_export_next_run ON public.scheduled_exports;
CREATE TRIGGER trg_auto_set_scheduled_export_next_run
  BEFORE INSERT OR UPDATE ON public.scheduled_exports
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_set_scheduled_export_next_run();
