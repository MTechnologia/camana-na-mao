-- Correção de falhas críticas em inscrições em audiências (FALHA 1–4, 11, 14)
-- 1) RLS: exigir autenticação para INSERT
-- 2) RPC: validar inscricoes_abertas, data, consent, email e evitar duplicatas
-- 3) UNIQUE parcial para evitar inscrições duplicadas (por usuário autenticado)
-- 4) Policy DELETE para o usuário cancelar própria inscrição (LGPD)

-- ---------- RLS: remover policy aberta e exigir usuário autenticado ----------
DROP POLICY IF EXISTS "Anyone can insert participacoes" ON public.audiencia_participacoes;

CREATE POLICY "Authenticated can insert own participacao"
  ON public.audiencia_participacoes FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (user_id IS NULL OR user_id = auth.uid())
  );

-- ---------- DELETE: usuário pode cancelar própria inscrição ----------
CREATE POLICY "Users can delete own participacoes"
  ON public.audiencia_participacoes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ---------- UNIQUE: uma inscrição por (audiencia, tipo, user) para autenticados ----------
CREATE UNIQUE INDEX IF NOT EXISTS idx_audiencia_participacoes_unique_authenticated
  ON public.audiencia_participacoes (audiencia_id, tipo, user_id)
  WHERE user_id IS NOT NULL;

-- ---------- Revogar RPC de anon; só authenticated ----------
REVOKE EXECUTE ON FUNCTION public.insert_audiencia_participacao FROM anon;

-- ---------- RPC: validações server-side (inscricoes_abertas, data, consent, email, duplicata) ----------
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
  -- Só aceitar chamada de usuário autenticado e apenas para o próprio user_id
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticação obrigatória para inscrição em audiência.';
  END IF;
  IF p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Só é permitido inscrever-se com o próprio usuário.';
  END IF;

  -- Consentimento LGPD obrigatório
  IF COALESCE(p_consent, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'É necessário aceitar o uso dos dados para inscrição (LGPD).';
  END IF;

  -- Validação mínima de e-mail (server-side)
  IF p_email IS NULL OR trim(p_email) = '' OR position('@' IN trim(p_email)) < 2 OR length(trim(p_email)) < 5 THEN
    RAISE EXCEPTION 'E-mail inválido.';
  END IF;

  -- Carregar audiência e validar se aceita inscrição
  SELECT a.id, a.inscricoes_abertas, a.data, a.vagas_disponiveis
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

  -- Tipo válido
  IF p_tipo IS NULL OR p_tipo NOT IN ('videoconferencia', 'escrito', 'presencial') THEN
    RAISE EXCEPTION 'Tipo de participação inválido.';
  END IF;

  -- Evitar duplicata (usuário já inscrito nesta audiência/tipo)
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

COMMENT ON FUNCTION public.insert_audiencia_participacao IS 'Inscrição em audiência com validações server-side: auth, consent LGPD, email, inscricoes_abertas, data, vagas e duplicata.';
