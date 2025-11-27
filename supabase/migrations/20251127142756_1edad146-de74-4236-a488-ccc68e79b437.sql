-- Create unified council member referrals table
CREATE TABLE public.council_member_referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  
  -- Polymorphic references (only one should be set)
  transport_report_id UUID REFERENCES public.transport_reports(id) ON DELETE CASCADE,
  urban_report_id UUID REFERENCES public.urban_reports(id) ON DELETE CASCADE,
  service_rating_id UUID REFERENCES public.service_ratings(id) ON DELETE CASCADE,
  
  -- Council member info
  council_member_id TEXT NOT NULL,
  council_member_name TEXT NOT NULL,
  council_member_party TEXT,
  
  -- Referral details
  match_score INTEGER DEFAULT 0,
  match_reasons TEXT[],
  citizen_message TEXT,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMP WITH TIME ZONE,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  response_text TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Ensure only one reference type is set
  CONSTRAINT one_reference_type CHECK (
    (transport_report_id IS NOT NULL)::int +
    (urban_report_id IS NOT NULL)::int +
    (service_rating_id IS NOT NULL)::int = 1
  )
);

-- Enable RLS
ALTER TABLE public.council_member_referrals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own referrals"
ON public.council_member_referrals FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own referrals"
ON public.council_member_referrals FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own referrals"
ON public.council_member_referrals FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all referrals"
ON public.council_member_referrals FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all referrals"
ON public.council_member_referrals FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Indexes for performance
CREATE INDEX idx_council_referrals_user ON public.council_member_referrals(user_id);
CREATE INDEX idx_council_referrals_transport ON public.council_member_referrals(transport_report_id) WHERE transport_report_id IS NOT NULL;
CREATE INDEX idx_council_referrals_urban ON public.council_member_referrals(urban_report_id) WHERE urban_report_id IS NOT NULL;
CREATE INDEX idx_council_referrals_status ON public.council_member_referrals(status);

-- Trigger for updated_at
CREATE TRIGGER update_council_member_referrals_updated_at
BEFORE UPDATE ON public.council_member_referrals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();