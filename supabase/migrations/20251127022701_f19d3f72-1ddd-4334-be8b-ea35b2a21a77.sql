-- Create storage bucket for urban report photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('urban-reports', 'urban-reports', true);

-- RLS policy: authenticated users can upload photos
CREATE POLICY "Users can upload report photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'urban-reports' AND auth.uid()::text = (storage.foldername(name))[1]);

-- RLS policy: public can view photos
CREATE POLICY "Public can view report photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'urban-reports');

-- RLS policy: users can delete their own photos
CREATE POLICY "Users can delete own photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'urban-reports' AND auth.uid()::text = (storage.foldername(name))[1]);