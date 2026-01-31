-- Create enum for consent types
CREATE TYPE public.consent_type AS ENUM (
  'terms_of_use',
  'privacy_policy',
  'data_collection',
  'location_tracking',
  'demographic_data',
  'newsletter',
  'council_sharing'
);

-- Create user_consents table
CREATE TABLE public.user_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  consent_type consent_type NOT NULL,
  granted BOOLEAN NOT NULL DEFAULT true,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  revoked_at TIMESTAMP WITH TIME ZONE,
  ip_address INET,
  user_agent TEXT,
  version TEXT, -- Version of terms/privacy policy when consent was given
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, consent_type)
);

-- Create index for faster lookups
CREATE INDEX idx_user_consents_user_id ON public.user_consents(user_id);
CREATE INDEX idx_user_consents_type ON public.user_consents(consent_type);
CREATE INDEX idx_user_consents_granted ON public.user_consents(granted);

-- Enable RLS
ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own consents
CREATE POLICY "Users can view their own consents"
ON public.user_consents FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert their own consents
CREATE POLICY "Users can insert their own consents"
ON public.user_consents FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own consents
CREATE POLICY "Users can update their own consents"
ON public.user_consents FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Admins can view all consents
CREATE POLICY "Admins can view all consents"
ON public.user_consents FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Function to automatically update updated_at
CREATE OR REPLACE FUNCTION public.update_user_consents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at
CREATE TRIGGER update_user_consents_updated_at
  BEFORE UPDATE ON public.user_consents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_consents_updated_at();

-- Function to check if user has granted a specific consent
CREATE OR REPLACE FUNCTION public.has_consent(_user_id UUID, _consent_type consent_type)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_consents
    WHERE user_id = _user_id 
      AND consent_type = _consent_type 
      AND granted = true
      AND revoked_at IS NULL
  );
$$;

-- Function to grant consent
CREATE OR REPLACE FUNCTION public.grant_consent(
  _user_id UUID,
  _consent_type consent_type,
  _version TEXT DEFAULT NULL,
  _ip_address INET DEFAULT NULL,
  _user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _consent_id UUID;
BEGIN
  -- Insert or update consent
  INSERT INTO public.user_consents (
    user_id,
    consent_type,
    granted,
    granted_at,
    revoked_at,
    version,
    ip_address,
    user_agent
  )
  VALUES (
    _user_id,
    _consent_type,
    true,
    now(),
    NULL,
    _version,
    _ip_address,
    _user_agent
  )
  ON CONFLICT (user_id, consent_type)
  DO UPDATE SET
    granted = true,
    granted_at = now(),
    revoked_at = NULL,
    version = COALESCE(EXCLUDED.version, user_consents.version),
    ip_address = COALESCE(EXCLUDED.ip_address, user_consents.ip_address),
    user_agent = COALESCE(EXCLUDED.user_agent, user_consents.user_agent),
    updated_at = now()
  RETURNING id INTO _consent_id;
  
  RETURN _consent_id;
END;
$$;

-- Function to revoke consent
CREATE OR REPLACE FUNCTION public.revoke_consent(
  _user_id UUID,
  _consent_type consent_type
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.user_consents
  SET 
    granted = false,
    revoked_at = now(),
    updated_at = now()
  WHERE user_id = _user_id 
    AND consent_type = _consent_type
    AND granted = true;
  
  RETURN FOUND;
END;
$$;

-- Add comment to table
COMMENT ON TABLE public.user_consents IS 'Stores user consents for LGPD compliance';
COMMENT ON COLUMN public.user_consents.consent_type IS 'Type of consent (terms, privacy, data collection, etc.)';
COMMENT ON COLUMN public.user_consents.granted IS 'Whether consent was granted (true) or revoked (false)';
COMMENT ON COLUMN public.user_consents.version IS 'Version of terms/privacy policy when consent was given';
COMMENT ON COLUMN public.user_consents.revoked_at IS 'Timestamp when consent was revoked (NULL if still active)';
