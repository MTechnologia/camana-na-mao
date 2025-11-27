-- Criar política RLS para admins poderem deletar qualquer relato
CREATE POLICY "Admins can delete any report"
ON public.urban_reports FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::app_role));