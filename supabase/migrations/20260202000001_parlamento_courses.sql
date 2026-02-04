-- Migration: Sistema de Cursos da Escola do Parlamento
-- Data: 2026-02-02
-- Descrição: Implementa sistema de cursos e inscrições da Escola do Parlamento

-- 1. Tabela de cursos da Escola do Parlamento
CREATE TABLE IF NOT EXISTS public.parlamento_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  duration TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('iniciante', 'intermediario', 'avancado')),
  participants_count INTEGER DEFAULT 0,
  available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Tabela de inscrições em cursos
CREATE TABLE IF NOT EXISTS public.parlamento_course_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.parlamento_courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'inscrito' CHECK (status IN ('inscrito', 'em_andamento', 'concluido', 'cancelado')),
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  UNIQUE(course_id, user_id)
);

-- 3. Índices para performance
CREATE INDEX IF NOT EXISTS idx_parlamento_courses_available ON public.parlamento_courses(available) WHERE available = true;
CREATE INDEX IF NOT EXISTS idx_parlamento_course_enrollments_user_id ON public.parlamento_course_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_parlamento_course_enrollments_course_id ON public.parlamento_course_enrollments(course_id);

-- 4. RLS para cursos (público pode ver)
ALTER TABLE public.parlamento_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view available courses"
  ON public.parlamento_courses FOR SELECT
  USING (true);

-- 5. RLS para inscrições
ALTER TABLE public.parlamento_course_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own enrollments"
  ON public.parlamento_course_enrollments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own enrollments"
  ON public.parlamento_course_enrollments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own enrollments"
  ON public.parlamento_course_enrollments FOR UPDATE
  USING (auth.uid() = user_id);

-- 6. Função para atualizar contador de participantes
CREATE OR REPLACE FUNCTION public.update_course_participants_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.parlamento_courses
    SET participants_count = participants_count + 1
    WHERE id = NEW.course_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.parlamento_courses
    SET participants_count = GREATEST(0, participants_count - 1)
    WHERE id = OLD.course_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 7. Trigger para atualizar contador automaticamente
DROP TRIGGER IF EXISTS trigger_update_course_participants ON public.parlamento_course_enrollments;
CREATE TRIGGER trigger_update_course_participants
  AFTER INSERT OR DELETE ON public.parlamento_course_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_course_participants_count();

-- 8. Inserir cursos iniciais (se não existirem)
-- Usando INSERT com ON CONFLICT para evitar duplicatas baseado no título
INSERT INTO public.parlamento_courses (title, description, duration, level, available)
SELECT * FROM (VALUES
  ('Introdução à Participação Cidadã', 'Aprenda como participar ativamente das decisões municipais e fazer sua voz ser ouvida.', '4 semanas', 'iniciante', true),
  ('Processo Legislativo Municipal', 'Entenda em detalhes como funciona o processo de criação e aprovação de leis na cidade.', '6 semanas', 'intermediario', true),
  ('Controle Social e Transparência', 'Descubra como fiscalizar o uso de recursos públicos e exigir transparência governamental.', '5 semanas', 'intermediario', true),
  ('Elaboração de Projetos de Lei Popular', 'Curso avançado sobre como elaborar e apresentar projetos de lei por iniciativa popular.', '8 semanas', 'avancado', false)
) AS v(title, description, duration, level, available)
WHERE NOT EXISTS (
  SELECT 1 FROM public.parlamento_courses WHERE parlamento_courses.title = v.title
);

-- 9. Comentários para documentação
COMMENT ON TABLE public.parlamento_courses IS 'Cursos oferecidos pela Escola do Parlamento';
COMMENT ON TABLE public.parlamento_course_enrollments IS 'Inscrições de usuários em cursos da Escola do Parlamento';
