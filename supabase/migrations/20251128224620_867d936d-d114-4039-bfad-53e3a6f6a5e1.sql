-- Políticas de UPDATE para admins
CREATE POLICY "Admins can update any report" 
ON public.urban_reports
FOR UPDATE
TO public
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update any transport report" 
ON public.transport_reports
FOR UPDATE
TO public
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Política de SELECT para admins em transport_reports
CREATE POLICY "Admins can view all transport reports" 
ON public.transport_reports
FOR SELECT
TO public
USING (has_role(auth.uid(), 'admin'::app_role));

-- Políticas para gestores
CREATE POLICY "Gestors can update any report" 
ON public.urban_reports
FOR UPDATE
TO public
USING (has_role(auth.uid(), 'gestor'::app_role))
WITH CHECK (has_role(auth.uid(), 'gestor'::app_role));

CREATE POLICY "Gestors can update any transport report" 
ON public.transport_reports
FOR UPDATE
TO public
USING (has_role(auth.uid(), 'gestor'::app_role))
WITH CHECK (has_role(auth.uid(), 'gestor'::app_role));

CREATE POLICY "Gestors can view all transport reports" 
ON public.transport_reports
FOR SELECT
TO public
USING (has_role(auth.uid(), 'gestor'::app_role));