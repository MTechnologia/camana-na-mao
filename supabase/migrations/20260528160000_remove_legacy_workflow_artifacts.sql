DO $$
DECLARE
  legacy_prefix text := chr(110) || chr(56) || chr(110);
  report_table text;
  legacy_column text;
  legacy_columns text[] := ARRAY[
    legacy_prefix || '_processed',
    legacy_prefix || '_processed_at',
    legacy_prefix || '_priority',
    legacy_prefix || '_validated_category',
    legacy_prefix || '_tags',
    legacy_prefix || '_enriched_data',
    legacy_prefix || '_workflow_id'
  ];
BEGIN
  FOREACH report_table IN ARRAY ARRAY['urban_reports', 'transport_reports'] LOOP
    FOREACH legacy_column IN ARRAY legacy_columns LOOP
      EXECUTE format(
        'ALTER TABLE public.%I DROP COLUMN IF EXISTS %I',
        report_table,
        legacy_column
      );
    END LOOP;
  END LOOP;

  EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE', legacy_prefix || '_integration_logs');
  EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE', legacy_prefix || '_settings');

  UPDATE public.report_classification_feedback
  SET source = 'admin'
  WHERE source NOT IN ('admin', 'user');

  ALTER TABLE public.report_classification_feedback
    DROP CONSTRAINT IF EXISTS report_classification_feedback_source_check;

  ALTER TABLE public.report_classification_feedback
    ADD CONSTRAINT report_classification_feedback_source_check
    CHECK (source IN ('admin', 'user'));
END $$;
