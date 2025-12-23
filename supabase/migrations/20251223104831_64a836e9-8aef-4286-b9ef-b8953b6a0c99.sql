-- Add onboarding completion timestamp to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.onboarding_completed_at IS 'Timestamp when user completed the onboarding tutorial. NULL means not completed.';