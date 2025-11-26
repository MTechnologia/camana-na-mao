-- Create enum for service types
CREATE TYPE public.service_type AS ENUM ('ubs', 'school', 'ceu', 'hospital', 'library', 'sports_center', 'other');

-- Create enum for visit status
CREATE TYPE public.visit_status AS ENUM ('pending', 'completed', 'expired', 'skipped');

-- Create enum for referral status
CREATE TYPE public.referral_status AS ENUM ('pending', 'sent', 'acknowledged', 'resolved');

-- Table: public_services
CREATE TABLE public.public_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  service_type service_type NOT NULL,
  address TEXT NOT NULL,
  district TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'São Paulo',
  state TEXT NOT NULL DEFAULT 'SP',
  zip_code TEXT,
  latitude NUMERIC(10, 7) NOT NULL,
  longitude NUMERIC(10, 7) NOT NULL,
  phone TEXT,
  opening_hours JSONB,
  average_rating NUMERIC(2, 1) DEFAULT 0,
  total_ratings INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table: service_visits
CREATE TABLE public.service_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.public_services(id) ON DELETE CASCADE,
  visited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  rating_requested_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status visit_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table: service_ratings
CREATE TABLE public.service_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID NOT NULL REFERENCES public.service_visits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.public_services(id) ON DELETE CASCADE,
  rating_stars INTEGER NOT NULL CHECK (rating_stars >= 1 AND rating_stars <= 5),
  rating_text TEXT,
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  is_anonymous BOOLEAN DEFAULT false,
  anonymized_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table: rating_referrals
CREATE TABLE public.rating_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rating_id UUID NOT NULL REFERENCES public.service_ratings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  council_member_name TEXT NOT NULL,
  council_member_party TEXT,
  status referral_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table: service_subscriptions
CREATE TABLE public.service_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.public_services(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, service_id)
);

-- Enable RLS
ALTER TABLE public.public_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rating_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for public_services (public read)
CREATE POLICY "Anyone can view public services"
  ON public.public_services FOR SELECT
  USING (true);

-- RLS Policies for service_visits
CREATE POLICY "Users can view their own visits"
  ON public.service_visits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own visits"
  ON public.service_visits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own visits"
  ON public.service_visits FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for service_ratings
CREATE POLICY "Users can view their own ratings"
  ON public.service_ratings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view non-anonymous ratings"
  ON public.service_ratings FOR SELECT
  USING (is_anonymous = false);

CREATE POLICY "Users can insert their own ratings"
  ON public.service_ratings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ratings"
  ON public.service_ratings FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for rating_referrals
CREATE POLICY "Users can view their own referrals"
  ON public.rating_referrals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own referrals"
  ON public.rating_referrals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own referrals"
  ON public.rating_referrals FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for service_subscriptions
CREATE POLICY "Users can view their own subscriptions"
  ON public.service_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscriptions"
  ON public.service_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subscriptions"
  ON public.service_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_public_services_location ON public.public_services(latitude, longitude);
CREATE INDEX idx_public_services_type ON public.public_services(service_type);
CREATE INDEX idx_public_services_district ON public.public_services(district);
CREATE INDEX idx_service_visits_user ON public.service_visits(user_id);
CREATE INDEX idx_service_visits_service ON public.service_visits(service_id);
CREATE INDEX idx_service_visits_status ON public.service_visits(status);
CREATE INDEX idx_service_visits_expires ON public.service_visits(expires_at);
CREATE INDEX idx_service_ratings_service ON public.service_ratings(service_id);
CREATE INDEX idx_service_ratings_user ON public.service_ratings(user_id);

-- Triggers for updated_at
CREATE TRIGGER update_public_services_updated_at
  BEFORE UPDATE ON public.public_services
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_service_visits_updated_at
  BEFORE UPDATE ON public.service_visits
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_service_ratings_updated_at
  BEFORE UPDATE ON public.service_ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_rating_referrals_updated_at
  BEFORE UPDATE ON public.rating_referrals
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Function to update service average rating
CREATE OR REPLACE FUNCTION public.update_service_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.public_services
  SET 
    average_rating = (
      SELECT COALESCE(AVG(rating_stars), 0)
      FROM public.service_ratings
      WHERE service_id = NEW.service_id
    ),
    total_ratings = (
      SELECT COUNT(*)
      FROM public.service_ratings
      WHERE service_id = NEW.service_id
    )
  WHERE id = NEW.service_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to update service rating on new rating
CREATE TRIGGER update_service_rating_trigger
  AFTER INSERT OR UPDATE ON public.service_ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_service_rating();