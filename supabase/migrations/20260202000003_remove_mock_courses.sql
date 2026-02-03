-- Migration: Remover cursos mockados da tabela parlamento_courses
-- Data: 2026-02-02
-- Descrição: Remove os 4 cursos iniciais mockados, pois agora usamos dados reais da API WordPress

-- Deletar os cursos mockados pelos títulos
DELETE FROM public.parlamento_courses
WHERE title IN (
  'Introdução à Participação Cidadã',
  'Processo Legislativo Municipal',
  'Controle Social e Transparência',
  'Elaboração de Projetos de Lei Popular'
);

-- Comentário
COMMENT ON TABLE public.parlamento_courses IS 'Cursos oferecidos pela Escola do Parlamento (agora sincronizados com API WordPress)';
