-- Fix notify_admins function to use valid app_role enum values
CREATE OR REPLACE FUNCTION public.notify_admins(
  p_title TEXT,
  p_message TEXT,
  p_type TEXT,
  p_action_url TEXT DEFAULT NULL,
  p_priority TEXT DEFAULT 'normal',
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO notifications (user_id, title, message, type, action_url, priority, metadata)
  SELECT ur.user_id, p_title, p_message, p_type, p_action_url, p_priority, p_metadata
  FROM user_roles ur
  WHERE ur.role IN ('admin'::app_role, 'gestor'::app_role);
END;
$$;