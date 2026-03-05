-- Número de protocolo para inscrições (ex.: 223136), no estilo do e-mail da CMSP
CREATE SEQUENCE IF NOT EXISTS public.audiencia_participacoes_protocolo_seq
  START WITH 100000
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

ALTER TABLE public.audiencia_participacoes
  ADD COLUMN IF NOT EXISTS protocolo INTEGER UNIQUE;

-- Preencher protocolo para linhas existentes (por ordem de created_at)
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) + 99999 AS n
  FROM public.audiencia_participacoes
  WHERE protocolo IS NULL
)
UPDATE public.audiencia_participacoes ap
SET protocolo = numbered.n
FROM numbered
WHERE ap.id = numbered.id;

-- Default para novas inserções
ALTER TABLE public.audiencia_participacoes
  ALTER COLUMN protocolo SET DEFAULT nextval('public.audiencia_participacoes_protocolo_seq');

-- Ajustar sequence para não colidir com valores já usados
SELECT setval(
  'public.audiencia_participacoes_protocolo_seq',
  GREATEST(100000, COALESCE((SELECT MAX(protocolo) FROM public.audiencia_participacoes), 0) + 1)
);

COMMENT ON COLUMN public.audiencia_participacoes.protocolo IS 'Número de protocolo exibido ao cidadão (ex.: 223136), no estilo do e-mail da CMSP';

-- Função para inserir participação e retornar protocolo (permite anônimo ver o número sem policy SELECT)
CREATE OR REPLACE FUNCTION public.insert_audiencia_participacao(
  p_audiencia_id UUID,
  p_tipo TEXT,
  p_user_id UUID,
  p_nome TEXT,
  p_email TEXT,
  p_telefone TEXT,
  p_entidade TEXT DEFAULT NULL,
  p_funcao TEXT DEFAULT NULL,
  p_bairro TEXT DEFAULT NULL,
  p_sugestao TEXT DEFAULT NULL,
  p_consent BOOLEAN DEFAULT false
)
RETURNS TABLE(protocolo INTEGER, id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  INSERT INTO public.audiencia_participacoes (
    audiencia_id, tipo, user_id, nome, email, telefone,
    entidade, funcao, bairro, sugestao, consent
  )
  VALUES (
    p_audiencia_id, p_tipo, p_user_id, p_nome, p_email, p_telefone,
    NULLIF(trim(p_entidade), ''), NULLIF(trim(p_funcao), ''),
    NULLIF(trim(p_bairro), ''), NULLIF(trim(p_sugestao), ''), p_consent
  )
  RETURNING audiencia_participacoes.protocolo, audiencia_participacoes.id;
END;
$$;

-- Permite anon e authenticated chamarem a função
GRANT EXECUTE ON FUNCTION public.insert_audiencia_participacao TO anon;
GRANT EXECUTE ON FUNCTION public.insert_audiencia_participacao TO authenticated;
