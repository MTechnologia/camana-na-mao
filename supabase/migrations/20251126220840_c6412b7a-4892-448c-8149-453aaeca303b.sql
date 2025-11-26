-- Criar policy para permitir que usuários deletem suas próprias conversas
CREATE POLICY "Users can delete their own conversations" 
ON public.ai_conversations 
FOR DELETE 
TO public 
USING (auth.uid() = user_id);