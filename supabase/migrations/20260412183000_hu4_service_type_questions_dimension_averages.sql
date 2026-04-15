-- HU-4.5: dicas opcionais por tipo de serviço na pergunta de dimensões
CREATE TABLE IF NOT EXISTS public.service_type_rating_questions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_type text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  hint_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (service_type, sort_order)
);

COMMENT ON TABLE public.service_type_rating_questions IS
  'HU-4.5: textos curtos exibidos no fluxo de avaliação (dimensões) conforme o tipo de equipamento.';

ALTER TABLE public.service_type_rating_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_type_rating_questions_select_all"
  ON public.service_type_rating_questions
  FOR SELECT
  TO authenticated, anon
  USING (true);

GRANT SELECT ON TABLE public.service_type_rating_questions TO authenticated, anon;
GRANT SELECT ON TABLE public.service_type_rating_questions TO service_role;

INSERT INTO public.service_type_rating_questions (service_type, sort_order, hint_text)
VALUES
  ('ubs', 0, 'Considere fila de triagem, sala de espera e tempo até ser atendido, se fizer sentido para a sua visita.'),
  ('ceu', 0, 'Pense nas atividades (esporte, cultura, curso) que você utilizou e o tempo de espera para entrar.'),
  ('hospital', 0, 'Inclua espera na recepção e até o atendimento médico, quando aplicável.'),
  ('library', 0, 'Considere fila para empréstimo ou uso de computadores, se for o caso.')
ON CONFLICT (service_type, sort_order) DO NOTHING;

-- HU-4.6: médias por dimensão (JSON publicado) para gráficos e painéis
CREATE OR REPLACE FUNCTION public.get_service_rating_dimension_averages(p_service_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH src AS (
    SELECT
      COALESCE(
        NULLIF(sr.dimensions, '{}'::jsonb),
        sr.rating_dimensions,
        '{}'::jsonb
      ) AS d
    FROM public.service_ratings sr
    WHERE sr.service_id = p_service_id
      AND sr.publication_status = 'published'
      AND (
        (sr.rating_dimensions IS NOT NULL AND sr.rating_dimensions <> '{}'::jsonb)
        OR (sr.dimensions IS NOT NULL AND sr.dimensions <> '{}'::jsonb)
      )
  ),
  agg AS (
    SELECT
      COUNT(*)::int AS sample_count,
      ROUND(
        AVG((d->>'atendimento')::numeric) FILTER (WHERE (d->>'atendimento') ~ '^[0-9]+$'),
        2
      ) AS atendimento,
      ROUND(
        AVG((d->>'limpeza')::numeric) FILTER (WHERE (d->>'limpeza') ~ '^[0-9]+$'),
        2
      ) AS limpeza,
      ROUND(
        AVG((d->>'infraestrutura')::numeric) FILTER (WHERE (d->>'infraestrutura') ~ '^[0-9]+$'),
        2
      ) AS infraestrutura,
      ROUND(
        AVG((d->>'tempo_espera')::numeric) FILTER (WHERE (d->>'tempo_espera') ~ '^[0-9]+$'),
        2
      ) AS tempo_espera
    FROM src
  )
  SELECT jsonb_build_object(
    'atendimento', agg.atendimento,
    'limpeza', agg.limpeza,
    'infraestrutura', agg.infraestrutura,
    'tempo_espera', agg.tempo_espera,
    'sample_count', agg.sample_count
  )
  FROM agg;
$$;

COMMENT ON FUNCTION public.get_service_rating_dimension_averages(uuid) IS
  'HU-4.6: médias 1–5 por dimensão (atendimento, limpeza, infraestrutura, tempo_espera) e contagem de linhas com alguma dimensão numérica.';

REVOKE ALL ON FUNCTION public.get_service_rating_dimension_averages(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_service_rating_dimension_averages(uuid) TO authenticated, anon, service_role;
