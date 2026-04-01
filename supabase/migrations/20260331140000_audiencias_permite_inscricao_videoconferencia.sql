-- Audiências somente presenciais (ou sem inscrição por videoconferência): o app não deve oferecer esse fluxo.
ALTER TABLE public.audiencias
  ADD COLUMN IF NOT EXISTS permite_inscricao_videoconferencia boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.audiencias.permite_inscricao_videoconferencia IS
  'Se false, não exibir / aceitar inscrição para manifestação por videoconferência (ex.: audiência somente presencial no site CMSP). Manifestação por escrito pode continuar disponível.';

-- RPC: bloquear videoconferência quando a audiência não permite
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
DECLARE
  v_audiencia RECORD;
  v_ja_inscrito BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticação obrigatória para inscrição em audiência.';
  END IF;
  IF p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Só é permitido inscrever-se com o próprio usuário.';
  END IF;

  IF COALESCE(p_consent, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'É necessário aceitar o uso dos dados para inscrição (LGPD).';
  END IF;

  IF p_email IS NULL OR trim(p_email) = '' OR position('@' IN trim(p_email)) < 2 OR length(trim(p_email)) < 5 THEN
    RAISE EXCEPTION 'E-mail inválido.';
  END IF;

  SELECT
    a.id,
    a.inscricoes_abertas,
    a.data,
    a.vagas_disponiveis,
    COALESCE(a.permite_inscricao_videoconferencia, true) AS permite_vc
  INTO v_audiencia
  FROM public.audiencias a
  WHERE a.id = p_audiencia_id;

  IF v_audiencia.id IS NULL THEN
    RAISE EXCEPTION 'Audiência não encontrada.';
  END IF;
  IF COALESCE(v_audiencia.inscricoes_abertas, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'Inscrições não estão abertas para esta audiência.';
  END IF;
  IF v_audiencia.data < CURRENT_DATE THEN
    RAISE EXCEPTION 'Não é possível inscrever-se em audiência já realizada.';
  END IF;
  IF v_audiencia.vagas_disponiveis IS NOT NULL AND v_audiencia.vagas_disponiveis <= 0 THEN
    RAISE EXCEPTION 'Não há vagas disponíveis para esta audiência.';
  END IF;

  IF p_tipo IS NULL OR p_tipo NOT IN ('videoconferencia', 'escrito', 'presencial') THEN
    RAISE EXCEPTION 'Tipo de participação inválido.';
  END IF;

  IF p_tipo = 'videoconferencia' AND COALESCE(v_audiencia.permite_vc, true) IS NOT TRUE THEN
    RAISE EXCEPTION 'Esta audiência não aceita inscrição para videoconferência (participação presencial no local ou apenas manifestação por escrito, conforme o site da Câmara).';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.audiencia_participacoes
     WHERE audiencia_id = p_audiencia_id
       AND tipo = p_tipo
       AND user_id = p_user_id
  ) INTO v_ja_inscrito;
  IF v_ja_inscrito THEN
    RAISE EXCEPTION 'Você já está inscrito nesta audiência para este tipo de participação.';
  END IF;

  RETURN QUERY
  INSERT INTO public.audiencia_participacoes (
    audiencia_id, tipo, user_id, nome, email, telefone,
    entidade, funcao, bairro, sugestao, consent
  )
  VALUES (
    p_audiencia_id, p_tipo, p_user_id, trim(p_nome), trim(p_email), trim(p_telefone),
    NULLIF(trim(p_entidade), ''), NULLIF(trim(p_funcao), ''),
    NULLIF(trim(p_bairro), ''), NULLIF(trim(p_sugestao), ''), true
  )
  RETURNING audiencia_participacoes.protocolo, audiencia_participacoes.id;
END;
$$;

COMMENT ON FUNCTION public.insert_audiencia_participacao IS 'Inscrição em audiência: valida auth, LGPD, inscricoes_abertas, permite_inscricao_videoconferencia (videoconf), data, vagas e duplicata.';
