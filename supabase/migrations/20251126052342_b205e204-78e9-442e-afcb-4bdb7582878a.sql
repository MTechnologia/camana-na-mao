-- Create transport_lines table
CREATE TABLE public.transport_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line_code TEXT NOT NULL UNIQUE,
  line_name TEXT NOT NULL,
  line_type TEXT NOT NULL DEFAULT 'bus',
  regions TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.transport_lines ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view transport lines
CREATE POLICY "Anyone can view transport lines"
  ON public.transport_lines
  FOR SELECT
  USING (true);

-- Create transport_reports table
CREATE TABLE public.transport_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  line_id UUID REFERENCES transport_lines(id),
  line_code_custom TEXT,
  report_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  description TEXT,
  occurrence_date DATE NOT NULL,
  occurrence_time TIME,
  location TEXT,
  impact_description TEXT,
  ai_sentiment TEXT,
  ai_category TEXT,
  ai_pattern_detected BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.transport_reports ENABLE ROW LEVEL SECURITY;

-- Policies for transport_reports
CREATE POLICY "Users can view their own reports"
  ON public.transport_reports
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reports"
  ON public.transport_reports
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reports"
  ON public.transport_reports
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create report_patterns table
CREATE TABLE public.report_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line_id UUID REFERENCES transport_lines(id),
  pattern_type TEXT NOT NULL,
  description TEXT NOT NULL,
  occurrence_count INTEGER DEFAULT 1,
  first_detected_at TIMESTAMPTZ DEFAULT now(),
  last_occurrence_at TIMESTAMPTZ DEFAULT now(),
  average_severity TEXT,
  suggested_action TEXT,
  status TEXT DEFAULT 'active'
);

-- Enable RLS
ALTER TABLE public.report_patterns ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view patterns
CREATE POLICY "Anyone can view patterns"
  ON public.report_patterns
  FOR SELECT
  USING (true);

-- Create report_referrals table
CREATE TABLE public.report_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES transport_reports(id) NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  council_member_name TEXT NOT NULL,
  council_member_party TEXT,
  reason TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.report_referrals ENABLE ROW LEVEL SECURITY;

-- Policies for report_referrals
CREATE POLICY "Users can view their own referrals"
  ON public.report_referrals
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own referrals"
  ON public.report_referrals
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own referrals"
  ON public.report_referrals
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create transport_subscriptions table
CREATE TABLE public.transport_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  line_id UUID REFERENCES transport_lines(id),
  pattern_id UUID REFERENCES report_patterns(id),
  subscription_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, line_id, subscription_type)
);

-- Enable RLS
ALTER TABLE public.transport_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies for transport_subscriptions
CREATE POLICY "Users can view their own subscriptions"
  ON public.transport_subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscriptions"
  ON public.transport_subscriptions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subscriptions"
  ON public.transport_subscriptions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for updated_at on transport_reports
CREATE TRIGGER update_transport_reports_updated_at
  BEFORE UPDATE ON public.transport_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create trigger for updated_at on report_referrals
CREATE TRIGGER update_report_referrals_updated_at
  BEFORE UPDATE ON public.report_referrals
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Insert some sample transport lines for São Paulo
INSERT INTO public.transport_lines (line_code, line_name, line_type, regions) VALUES
  ('8500-10', 'Terminal Sapopemba - Metrô Carrão', 'bus', ARRAY['Zona Leste']),
  ('8000-10', 'Terminal Capelinha - Metrô Jabaquara', 'bus', ARRAY['Zona Sul']),
  ('6100-10', 'Terminal Lapa - Metrô Barra Funda', 'bus', ARRAY['Zona Oeste']),
  ('7000-10', 'Terminal Santana - Metrô Tucuruvi', 'bus', ARRAY['Zona Norte']),
  ('LINHA-1-AZUL', 'Linha 1 - Azul (Jabaquara - Tucuruvi)', 'metro', ARRAY['Zona Sul', 'Centro', 'Zona Norte']),
  ('LINHA-2-VERDE', 'Linha 2 - Verde (Vila Prudente - Vila Madalena)', 'metro', ARRAY['Zona Leste', 'Centro', 'Zona Oeste']),
  ('LINHA-3-VERMELHA', 'Linha 3 - Vermelha (Corinthians-Itaquera - Palmeiras-Barra Funda)', 'metro', ARRAY['Zona Leste', 'Centro', 'Zona Oeste']);