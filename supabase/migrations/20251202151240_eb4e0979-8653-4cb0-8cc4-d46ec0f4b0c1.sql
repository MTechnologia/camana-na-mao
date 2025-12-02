-- Alterar source_id de UUID para TEXT para permitir identificadores customizados
ALTER TABLE public.knowledge_base 
ALTER COLUMN source_id TYPE text;