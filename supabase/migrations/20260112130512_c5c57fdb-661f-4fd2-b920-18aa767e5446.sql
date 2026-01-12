-- Corrigir avisos de segurança

-- 1. Remover trigger e função para recriar com search_path
DROP TRIGGER IF EXISTS trigger_citizen_learning_updated_at ON public.citizen_learning_profile;
DROP FUNCTION IF EXISTS update_citizen_learning_updated_at();

-- 2. Recriar função com search_path correto
CREATE OR REPLACE FUNCTION public.update_citizen_learning_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 3. Recriar trigger
CREATE TRIGGER trigger_citizen_learning_updated_at
  BEFORE UPDATE ON public.citizen_learning_profile
  FOR EACH ROW
  EXECUTE FUNCTION public.update_citizen_learning_updated_at();

-- 4. Remover políticas permissivas demais
DROP POLICY IF EXISTS "System can insert categories" ON public.dynamic_categories;
DROP POLICY IF EXISTS "System can insert usage logs" ON public.category_usage_log;

-- 5. Criar políticas mais restritivas para inserts
CREATE POLICY "Authenticated can insert categories" 
  ON public.dynamic_categories FOR INSERT 
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can insert usage logs" 
  ON public.category_usage_log FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);