-- CHB-014: append atômico de mensagens em ai_conversations (evita perda em read-modify-write concorrente).

CREATE OR REPLACE FUNCTION public.append_ai_conversation_message(
  p_conversation_id uuid,
  p_message jsonb,
  p_title text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  UPDATE public.ai_conversations
  SET
    messages = CASE
      WHEN p_message ? 'id'
        AND EXISTS (
          SELECT 1
          FROM jsonb_array_elements(COALESCE(messages, '[]'::jsonb)) AS elem
          WHERE elem->>'id' = p_message->>'id'
        )
      THEN messages
      ELSE COALESCE(messages, '[]'::jsonb) || jsonb_build_array(p_message)
    END,
    last_message_at = now(),
    title = COALESCE(NULLIF(trim(p_title), ''), title),
    updated_at = now()
  WHERE id = p_conversation_id
    AND user_id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.append_ai_conversation_message(uuid, jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.append_ai_conversation_message(uuid, jsonb, text) TO authenticated;

COMMENT ON FUNCTION public.append_ai_conversation_message IS
  'Append de mensagem por id (idempotente). CHB-014 / CHB-018.';
