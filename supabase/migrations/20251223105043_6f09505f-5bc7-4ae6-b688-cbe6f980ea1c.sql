-- Add accessibility settings columns to user_preferences table
ALTER TABLE public.user_preferences 
ADD COLUMN IF NOT EXISTS font_size TEXT DEFAULT 'medium' CHECK (font_size IN ('small', 'medium', 'large')),
ADD COLUMN IF NOT EXISTS reading_mode BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS text_spacing BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system'));

-- Add comments for documentation
COMMENT ON COLUMN public.user_preferences.font_size IS 'User preferred font size: small, medium, or large';
COMMENT ON COLUMN public.user_preferences.reading_mode IS 'High contrast mode for better readability';
COMMENT ON COLUMN public.user_preferences.text_spacing IS 'Increased spacing between lines and letters';
COMMENT ON COLUMN public.user_preferences.theme IS 'User preferred theme: light, dark, or system';