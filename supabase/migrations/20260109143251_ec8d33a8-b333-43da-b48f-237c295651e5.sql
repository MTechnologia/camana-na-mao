-- Remove the policy that allows admins to see ALL notifications
-- Each admin already receives their own copy via notify_admins() function
-- This policy was causing admins to see notifications from other users

DROP POLICY IF EXISTS "Admins can view all notifications" ON public.notifications;