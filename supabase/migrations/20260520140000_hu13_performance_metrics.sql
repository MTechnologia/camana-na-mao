-- HU-13.2 — Coleta de métricas de performance para validar SLA de 3s.
--
-- Tabela append-only que recebe medições do client (via hook usePerformanceMark).
-- Cada linha = uma operação medida (carga de página, fetch de hook analítico,
-- render de componente pesado, etc).
--
-- Análise é feita pelo script `scripts/analyze-performance.mjs` que calcula
-- P50/P95/P99 e flag de SLA (P95 < 3000ms).

CREATE TABLE IF NOT EXISTS public.performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Rota onde a medição aconteceu (ex: /admin/analytics).
  route TEXT NOT NULL,

  -- Marcador semântico (ex: 'analytics_load', 'report_detail_open',
  -- 'multi_drill_query'). Permite agrupar várias medições da mesma operação.
  marker TEXT NOT NULL,

  -- Duração em milissegundos.
  duration_ms INTEGER NOT NULL CHECK (duration_ms >= 0),

  -- Quem fez a operação (opcional — pode ser null para anônimos).
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Dados extras: viewport size, role do usuário, filtros aplicados, etc.
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.performance_metrics IS
  'HU-13.2: medições client-side para validar SLA 3s nas operações analíticas.';

CREATE INDEX IF NOT EXISTS idx_performance_metrics_route_marker
  ON public.performance_metrics(route, marker, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_created_at
  ON public.performance_metrics(created_at DESC);

ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;

-- INSERT: qualquer authenticated (logging pra todos).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'performance_metrics'
      AND policyname = 'Authenticated can insert metrics'
  ) THEN
    CREATE POLICY "Authenticated can insert metrics"
      ON public.performance_metrics
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END
$$;

-- SELECT: apenas admin lê (análise/relatório).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'performance_metrics'
      AND policyname = 'Admin can read metrics'
  ) THEN
    CREATE POLICY "Admin can read metrics"
      ON public.performance_metrics
      FOR SELECT
      USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END
$$;

-- Retenção (mantém apenas 90 dias para evitar inflação).
CREATE OR REPLACE FUNCTION public.purge_old_performance_metrics(
  _retention_days INTEGER DEFAULT 90
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cutoff TIMESTAMPTZ;
  v_deleted INTEGER;
BEGIN
  v_cutoff := now() - make_interval(days => _retention_days);
  DELETE FROM public.performance_metrics WHERE created_at < v_cutoff;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN jsonb_build_object(
    'status', 'success',
    'cutoff', v_cutoff,
    'deleted_rows', v_deleted
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.purge_old_performance_metrics(INTEGER) TO authenticated;

COMMENT ON FUNCTION public.purge_old_performance_metrics IS
  'HU-13.2: limpa métricas com mais de N dias. Default 90.';
