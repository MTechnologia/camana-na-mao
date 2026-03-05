-- Token Expo Push para notificações no app mobile (Expo)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS expo_push_token TEXT;

COMMENT ON COLUMN public.profiles.expo_push_token IS 'Token Expo Push (ExponentPushToken[...]) para envio de notificações no app mobile';
