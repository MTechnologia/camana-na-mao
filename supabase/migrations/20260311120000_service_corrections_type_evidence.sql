-- Formulário munícipe: tipo de correção + foto opcional (evidência).
-- field_name passa a ser opcional (legado: subcampo detalhado).

ALTER TABLE public.service_corrections
  ADD COLUMN IF NOT EXISTS correction_type text,
  ADD COLUMN IF NOT EXISTS evidence_photo_url text;

COMMENT ON COLUMN public.service_corrections.correction_type IS
  'horario | servico | localizacao | outro — categoria da sugestão.';
COMMENT ON COLUMN public.service_corrections.evidence_photo_url IS
  'URL pública da evidência (bucket service-corrections), opcional.';

-- Inferir tipo a partir do legado field_name
UPDATE public.service_corrections
SET correction_type = CASE field_name
  WHEN 'opening_hours' THEN 'horario'
  WHEN 'services_offered' THEN 'servico'
  WHEN 'name' THEN 'servico'
  WHEN 'capacity_info' THEN 'servico'
  WHEN 'operational_status' THEN 'servico'
  WHEN 'address' THEN 'localizacao'
  WHEN 'district' THEN 'localizacao'
  WHEN 'zip_code' THEN 'localizacao'
  WHEN 'phone' THEN 'outro'
  ELSE 'outro'
END
WHERE correction_type IS NULL;

UPDATE public.service_corrections
SET correction_type = 'outro'
WHERE correction_type IS NULL OR trim(correction_type) = '';

ALTER TABLE public.service_corrections
  ALTER COLUMN correction_type SET NOT NULL,
  ALTER COLUMN correction_type SET DEFAULT 'outro';

ALTER TABLE public.service_corrections DROP CONSTRAINT IF EXISTS service_corrections_correction_type_check;
ALTER TABLE public.service_corrections
  ADD CONSTRAINT service_corrections_correction_type_check
  CHECK (correction_type IN ('horario', 'servico', 'localizacao', 'outro'));

ALTER TABLE public.service_corrections ALTER COLUMN field_name DROP NOT NULL;

-- Bucket para evidências (público leitura; upload só pasta do usuário)
INSERT INTO storage.buckets (id, name, public)
VALUES ('service-corrections', 'service-corrections', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users can upload service correction evidence" ON storage.objects;
CREATE POLICY "Users can upload service correction evidence"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'service-corrections'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Public can view service correction evidence" ON storage.objects;
CREATE POLICY "Public can view service correction evidence"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'service-corrections');

DROP POLICY IF EXISTS "Users can delete own service correction evidence" ON storage.objects;
CREATE POLICY "Users can delete own service correction evidence"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'service-corrections'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
