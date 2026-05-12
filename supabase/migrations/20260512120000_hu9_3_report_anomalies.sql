-- HU-9.3 — Detecção de anomalias de volume de relatos.
--
-- Tabela `report_anomalies` armazena pontos em que o volume diário de
-- relatos (urban + transport) desviou significativamente do esperado pelo
-- modelo de previsão (HU-9.2). A detecção é feita 1x/dia pela edge function
-- `detect-anomalies` (cron). Admin/gestor pode acknowledgar/dispensar/anotar.
--
-- Severity é derivada do módulo do z-score:
--   |z| ∈ [2.5, 3) → low
--   |z| ∈ [3, 4)   → medium
--   |z| ∈ [4, 5)   → high
--   |z| ≥ 5        → critical
--
-- Direction = 'spike' (acima do esperado) ou 'drop' (abaixo). Útil para o
-- gestor entender se é pico de demanda ou queda de engajamento.

CREATE TABLE IF NOT EXISTS public.report_anomalies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identificação do sinal monitorado. Hoje apenas 'volume_daily', mas
  -- deixamos espaço para futuras dimensões (volume_per_category, etc.).
  signal_type TEXT NOT NULL DEFAULT 'volume_daily',
  signal_date DATE NOT NULL,

  -- Valores observado vs. esperado.
  observed_value NUMERIC NOT NULL,
  expected_value NUMERIC NOT NULL,
  expected_lower NUMERIC NOT NULL,
  expected_upper NUMERIC NOT NULL,

  -- Magnitude e classificação.
  z_score NUMERIC NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  direction TEXT NOT NULL CHECK (direction IN ('spike', 'drop')),

  -- Workflow.
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'acknowledged', 'dismissed')),
  notes TEXT,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES auth.users(id),

  -- Auditoria.
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.report_anomalies IS
  'HU-9.3: anomalias de volume detectadas pela edge function detect-anomalies.';
COMMENT ON COLUMN public.report_anomalies.signal_type IS
  'Tipo de sinal monitorado. Hoje apenas volume_daily.';
COMMENT ON COLUMN public.report_anomalies.z_score IS
  '(observed - expected) / std_residuals. Positivo = spike, negativo = drop.';

-- Dedup por (signal_type + signal_date). Reexecução do detector apenas
-- atualiza os valores; o histórico é mantido.
CREATE UNIQUE INDEX IF NOT EXISTS uq_report_anomalies_signal_date
  ON public.report_anomalies(signal_type, signal_date);

CREATE INDEX IF NOT EXISTS idx_report_anomalies_status
  ON public.report_anomalies(status);

CREATE INDEX IF NOT EXISTS idx_report_anomalies_severity
  ON public.report_anomalies(severity);

CREATE INDEX IF NOT EXISTS idx_report_anomalies_detected_at
  ON public.report_anomalies(detected_at DESC);

-- Trigger para updated_at.
CREATE OR REPLACE FUNCTION public.touch_report_anomalies_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_report_anomalies_updated_at ON public.report_anomalies;
CREATE TRIGGER trg_report_anomalies_updated_at
  BEFORE UPDATE ON public.report_anomalies
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_report_anomalies_updated_at();

-- ===========================================================================
-- RLS
-- ===========================================================================

ALTER TABLE public.report_anomalies ENABLE ROW LEVEL SECURITY;

-- Leitura: admin + gestor.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'report_anomalies'
      AND policyname = 'Admin and gestor can view anomalies'
  ) THEN
    CREATE POLICY "Admin and gestor can view anomalies"
      ON public.report_anomalies
      FOR SELECT
      USING (
        has_role(auth.uid(), 'admin'::app_role)
        OR has_role(auth.uid(), 'gestor'::app_role)
      );
  END IF;
END
$$;

-- Update (acknowledge/dismiss/notes): admin + gestor.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'report_anomalies'
      AND policyname = 'Admin and gestor can update anomalies'
  ) THEN
    CREATE POLICY "Admin and gestor can update anomalies"
      ON public.report_anomalies
      FOR UPDATE
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

-- Insert via service_role (edge function) — não exige policy para usuários
-- autenticados; o service_role bypassa RLS por padrão.
-- Para permitir RPC manual de re-run, permitimos insert quando feito por
-- admin (fluxo "Detectar agora" na UI).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'report_anomalies'
      AND policyname = 'Admin can insert anomalies'
  ) THEN
    CREATE POLICY "Admin can insert anomalies"
      ON public.report_anomalies
      FOR INSERT
      WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END
$$;

-- Habilita realtime para a tabela (já que outras tabelas analytics o fazem).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'report_anomalies'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.report_anomalies;
  END IF;
END
$$;
