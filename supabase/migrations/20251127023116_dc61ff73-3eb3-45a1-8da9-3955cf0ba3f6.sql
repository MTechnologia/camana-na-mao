-- Allow users to delete their own urban reports
CREATE POLICY "Users can delete their own reports"
ON public.urban_reports
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);