-- Migration: Sistema de Privacidade de Perfil
-- Data: 2026-02-02
-- Descrição: Implementa sistema de privacidade para perfis públicos

-- 1. Remover política antiga e criar nova que permite leitura de perfis públicos
-- Primeiro, remover a política antiga se existir
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Criar nova política que permite ver próprio perfil E perfis públicos
CREATE POLICY "Users can view their own profile or public profiles"
  ON public.profiles FOR SELECT
  USING (
    -- Usuário pode ver seu próprio perfil
    auth.uid() = id
    OR
    -- Ou o perfil é público (verificar user_preferences ou usar padrão 'public')
    (
      EXISTS (
        SELECT 1 FROM public.user_preferences
        WHERE user_preferences.user_id = profiles.id
        AND user_preferences.profile_visibility = 'public'
      )
      OR
      -- Se não houver preferências, considerar público (padrão)
      NOT EXISTS (
        SELECT 1 FROM public.user_preferences
        WHERE user_preferences.user_id = profiles.id
      )
    )
  );

-- 2. Criar função RPC para buscar perfil público respeitando privacidade
CREATE OR REPLACE FUNCTION public.get_public_profile(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_data JSONB;
  privacy_settings RECORD;
  current_user_id UUID;
  is_own_profile BOOLEAN;
  can_view_profile BOOLEAN;
  can_view_email BOOLEAN;
  can_view_phone BOOLEAN;
  profile_vis TEXT;
  show_email_val BOOLEAN;
  show_phone_val BOOLEAN;
BEGIN
  -- Obter ID do usuário atual (pode ser NULL se não autenticado)
  current_user_id := auth.uid();
  is_own_profile := (current_user_id = target_user_id);

  -- Buscar preferências de privacidade
  SELECT 
    profile_visibility,
    show_email,
    show_phone
  INTO privacy_settings
  FROM public.user_preferences
  WHERE user_id = target_user_id;

  -- Se não houver preferências, usar padrão (público, não mostrar email/telefone)
  IF privacy_settings IS NULL THEN
    profile_vis := 'public';
    show_email_val := false;
    show_phone_val := false;
  ELSE
    profile_vis := privacy_settings.profile_visibility;
    show_email_val := privacy_settings.show_email;
    show_phone_val := privacy_settings.show_phone;
  END IF;

  -- Verificar se pode ver o perfil
  can_view_profile := is_own_profile 
    OR profile_vis = 'public'
    OR (profile_vis = 'friends' AND current_user_id IS NOT NULL); -- TODO: Implementar lógica de amigos

  -- Se não pode ver o perfil, retornar erro
  IF NOT can_view_profile THEN
    RETURN jsonb_build_object(
      'error', 'Perfil privado',
      'message', 'Este perfil não está disponível publicamente'
    );
  END IF;

  -- Verificar se pode ver email e telefone
  can_view_email := is_own_profile OR show_email_val;
  can_view_phone := is_own_profile OR show_phone_val;

  -- Buscar dados do perfil
  SELECT jsonb_build_object(
    'id', p.id,
    'full_name', p.full_name,
    'avatar_url', p.avatar_url,
    'email', CASE 
      WHEN can_view_email THEN 
        (SELECT email FROM auth.users WHERE id = p.id)
      ELSE NULL
    END,
    'phone', CASE 
      WHEN can_view_phone THEN p.phone
      ELSE NULL
    END,
    'created_at', p.created_at,
    'is_own_profile', is_own_profile,
    'profile_visibility', profile_vis
  )
  INTO profile_data
  FROM public.profiles p
  WHERE p.id = target_user_id;

  -- Se perfil não encontrado
  IF profile_data IS NULL THEN
    RETURN jsonb_build_object(
      'error', 'Perfil não encontrado',
      'message', 'O perfil solicitado não existe'
    );
  END IF;

  RETURN profile_data;
END;
$$;

-- 3. Comentários para documentação
COMMENT ON FUNCTION public.get_public_profile IS 
'Retorna dados do perfil público respeitando configurações de privacidade. 
Verifica profile_visibility, show_email e show_phone antes de retornar dados.';

-- 4. Grant execute permission para usuários autenticados e anônimos
GRANT EXECUTE ON FUNCTION public.get_public_profile(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_profile(UUID) TO anon;
