-- Criar bucket para avatares (público para visualização)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Política: Usuários podem fazer upload de seu próprio avatar
CREATE POLICY "Users can upload their own avatar"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Política: Usuários podem atualizar seu próprio avatar
CREATE POLICY "Users can update their own avatar"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Política: Usuários podem deletar seu próprio avatar
CREATE POLICY "Users can delete their own avatar"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Política: Avatares são visíveis publicamente
CREATE POLICY "Avatars are publicly accessible"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'avatars');