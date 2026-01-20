-- ============================================================================
-- CMSP CONNECT - DUMP COMPLETO PARA SUPABASE CLOUD
-- Gerado em: 2026-01-20
-- Projeto: Câmara na Mão / CMSP Connect
-- ============================================================================

-- ============================================================================
-- PARTE 1: EXTENSÕES
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;

-- ============================================================================
-- PARTE 2: TIPOS ENUM
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE public.service_type AS ENUM ('ubs', 'school', 'ceu', 'hospital', 'library', 'sports_center', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.visit_status AS ENUM ('pending', 'completed', 'expired', 'skipped');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.referral_status AS ENUM ('pending', 'sent', 'acknowledged', 'resolved');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'gestor', 'vereador', 'assessor', 'cidadao', 'cidadao_engajado');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- PARTE 3: TABELAS
-- ============================================================================

-- 3.1 Profiles (tabela principal de usuários)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  phone TEXT,
  onboarding_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.2 User Demographics
CREATE TABLE IF NOT EXISTS public.user_demographics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  birth_date DATE,
  gender TEXT,
  race TEXT,
  social_class TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.3 User Addresses
CREATE TABLE IF NOT EXISTS public.user_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  street TEXT NOT NULL,
  number TEXT NOT NULL,
  complement TEXT,
  neighborhood TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.4 User Interests
CREATE TABLE IF NOT EXISTS public.user_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  interest_category TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.5 User Preferences
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  push_notifications BOOLEAN NOT NULL DEFAULT true,
  email_notifications BOOLEAN NOT NULL DEFAULT true,
  sms_notifications BOOLEAN NOT NULL DEFAULT false,
  newsletter BOOLEAN NOT NULL DEFAULT false,
  profile_visibility TEXT NOT NULL DEFAULT 'private',
  show_email BOOLEAN NOT NULL DEFAULT false,
  show_phone BOOLEAN NOT NULL DEFAULT false,
  theme TEXT DEFAULT 'system',
  font_size TEXT DEFAULT 'medium',
  reading_mode BOOLEAN DEFAULT false,
  text_spacing BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.6 User Roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, role)
);

-- 3.7 Profile Completion Progress
CREATE TABLE IF NOT EXISTS public.profile_completion_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  step_completed TEXT NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.8 Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  priority TEXT NOT NULL DEFAULT 'normal',
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  action_url TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.9 Notification Settings
CREATE TABLE IF NOT EXISTS public.notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  push_enabled BOOLEAN DEFAULT true,
  email_enabled BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT false,
  newsletter_enabled BOOLEAN DEFAULT false,
  categories_enabled TEXT[],
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  max_daily_notifications INTEGER DEFAULT 50,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.10 Public Services
CREATE TABLE IF NOT EXISTS public.public_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  service_type public.service_type NOT NULL,
  address TEXT NOT NULL,
  district TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'São Paulo',
  state TEXT NOT NULL DEFAULT 'SP',
  zip_code TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  phone TEXT,
  opening_hours JSONB,
  average_rating NUMERIC(3,2) DEFAULT 0,
  total_ratings INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3.11 Service Visits
CREATE TABLE IF NOT EXISTS public.service_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.public_services(id) ON DELETE CASCADE,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  visited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  rating_requested_at TIMESTAMPTZ,
  status public.visit_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3.12 Service Ratings
CREATE TABLE IF NOT EXISTS public.service_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.public_services(id) ON DELETE CASCADE,
  visit_id UUID NOT NULL REFERENCES public.service_visits(id) ON DELETE CASCADE,
  rating_stars INTEGER NOT NULL CHECK (rating_stars >= 1 AND rating_stars <= 5),
  rating_text TEXT,
  sentiment TEXT,
  is_anonymous BOOLEAN DEFAULT false,
  anonymized_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3.13 Rating Referrals
CREATE TABLE IF NOT EXISTS public.rating_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rating_id UUID NOT NULL REFERENCES public.service_ratings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  council_member_name TEXT NOT NULL,
  council_member_party TEXT,
  status public.referral_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3.14 Service Subscriptions
CREATE TABLE IF NOT EXISTS public.service_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.public_services(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, service_id)
);

-- 3.15 Service Corrections
CREATE TABLE IF NOT EXISTS public.service_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES public.public_services(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  current_value TEXT,
  suggested_value TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3.16 Service Plans
CREATE TABLE IF NOT EXISTS public.service_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  planned_date DATE,
  planned_time TIME,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3.17 Service Plan Items
CREATE TABLE IF NOT EXISTS public.service_plan_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.service_plans(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.public_services(id) ON DELETE SET NULL,
  order_index INTEGER,
  estimated_duration INTEGER,
  notes TEXT
);

-- 3.18 Service Alerts
CREATE TABLE IF NOT EXISTS public.service_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.public_services(id) ON DELETE SET NULL,
  alert_type TEXT NOT NULL,
  message TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3.19 Transport Lines
CREATE TABLE IF NOT EXISTS public.transport_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line_code TEXT NOT NULL UNIQUE,
  line_name TEXT NOT NULL,
  line_type TEXT NOT NULL DEFAULT 'bus',
  regions TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3.20 Transport Reports
CREATE TABLE IF NOT EXISTS public.transport_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  line_id UUID REFERENCES public.transport_lines(id) ON DELETE SET NULL,
  line_code_custom TEXT,
  report_type TEXT NOT NULL,
  description TEXT,
  location TEXT,
  occurrence_date DATE NOT NULL,
  occurrence_time TIME,
  severity TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'pending',
  impact_description TEXT,
  protocol_code TEXT UNIQUE,
  ai_category TEXT,
  ai_sentiment TEXT,
  ai_pattern_detected BOOLEAN DEFAULT false,
  n8n_processed BOOLEAN DEFAULT false,
  n8n_processed_at TIMESTAMPTZ,
  n8n_workflow_id TEXT,
  n8n_priority TEXT,
  n8n_tags TEXT[],
  n8n_validated_category TEXT,
  n8n_enriched_data JSONB,
  responded_at TIMESTAMPTZ,
  first_response_time INTERVAL GENERATED ALWAYS AS (responded_at - created_at) STORED,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3.21 Transport Report Responses
CREATE TABLE IF NOT EXISTS public.transport_report_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.transport_reports(id) ON DELETE CASCADE,
  responder_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  response_text TEXT NOT NULL,
  response_type TEXT NOT NULL DEFAULT 'official',
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3.22 Transport Subscriptions
CREATE TABLE IF NOT EXISTS public.transport_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_type TEXT NOT NULL,
  line_id UUID REFERENCES public.transport_lines(id) ON DELETE SET NULL,
  pattern_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3.23 Report Patterns
CREATE TABLE IF NOT EXISTS public.report_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_type TEXT NOT NULL,
  description TEXT NOT NULL,
  line_id UUID REFERENCES public.transport_lines(id) ON DELETE SET NULL,
  occurrence_count INTEGER DEFAULT 1,
  average_severity TEXT,
  status TEXT DEFAULT 'active',
  suggested_action TEXT,
  first_detected_at TIMESTAMPTZ DEFAULT now(),
  last_occurrence_at TIMESTAMPTZ DEFAULT now()
);

-- Add FK for transport_subscriptions after report_patterns exists
ALTER TABLE public.transport_subscriptions 
  DROP CONSTRAINT IF EXISTS transport_subscriptions_pattern_id_fkey;
ALTER TABLE public.transport_subscriptions 
  ADD CONSTRAINT transport_subscriptions_pattern_id_fkey 
  FOREIGN KEY (pattern_id) REFERENCES public.report_patterns(id) ON DELETE SET NULL;

-- 3.24 Report Referrals
CREATE TABLE IF NOT EXISTS public.report_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.transport_reports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  council_member_name TEXT NOT NULL,
  council_member_party TEXT,
  reason TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3.25 Urban Reports
CREATE TABLE IF NOT EXISTS public.urban_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  subcategory TEXT,
  description TEXT,
  street TEXT,
  street_number TEXT,
  neighborhood TEXT,
  cep TEXT,
  reference_point TEXT,
  location_address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  photos TEXT[],
  severity TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'pending',
  protocol_code TEXT UNIQUE,
  risk_level TEXT,
  risk_types TEXT[],
  urgency_reason TEXT,
  affected_scope TEXT,
  affected_estimate INTEGER,
  active_consequences TEXT[],
  ai_classification JSONB,
  n8n_processed BOOLEAN DEFAULT false,
  n8n_processed_at TIMESTAMPTZ,
  n8n_workflow_id TEXT,
  n8n_priority TEXT,
  n8n_tags TEXT[],
  n8n_validated_category TEXT,
  n8n_enriched_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3.26 Urban Report Likes
CREATE TABLE IF NOT EXISTS public.urban_report_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.urban_reports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(report_id, user_id)
);

-- 3.27 Urban Report Comments
CREATE TABLE IF NOT EXISTS public.urban_report_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.urban_reports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.28 AI Conversations
CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  context TEXT,
  journey_id TEXT,
  status TEXT DEFAULT 'active',
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.29 Audiencias
CREATE TABLE IF NOT EXISTS public.audiencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  tema TEXT NOT NULL,
  descricao TEXT,
  data DATE NOT NULL,
  hora TIME NOT NULL,
  local TEXT NOT NULL,
  link_transmissao TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  inscricoes_abertas BOOLEAN DEFAULT true,
  vagas_disponiveis INTEGER,
  documentos JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.30 Audiencia Inscricoes
CREATE TABLE IF NOT EXISTS public.audiencia_inscricoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audiencia_id UUID NOT NULL REFERENCES public.audiencias(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'confirmed',
  notified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(audiencia_id, user_id)
);

-- 3.31 Noticias
CREATE TABLE IF NOT EXISTS public.noticias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  resumo TEXT,
  conteudo TEXT NOT NULL,
  imagem_url TEXT,
  categoria TEXT NOT NULL,
  tags TEXT[],
  autor TEXT,
  fonte TEXT,
  data_publicacao TIMESTAMPTZ NOT NULL DEFAULT now(),
  destaque BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.32 News Cache
CREATE TABLE IF NOT EXISTS public.news_cache (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  full_content TEXT,
  image_url TEXT,
  link TEXT,
  pub_date TIMESTAMPTZ,
  category TEXT,
  read_time TEXT,
  views INTEGER DEFAULT 0,
  cached_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3.33 Council Members Cache
CREATE TABLE IF NOT EXISTS public.council_members_cache (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  party TEXT NOT NULL,
  photo TEXT,
  email TEXT,
  phone TEXT,
  sala TEXT,
  andar TEXT,
  gv TEXT,
  initials TEXT,
  region TEXT,
  is_leader BOOLEAN DEFAULT false,
  is_government_leader BOOLEAN DEFAULT false,
  is_substitute BOOLEAN DEFAULT false,
  is_on_leave BOOLEAN DEFAULT false,
  cached_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3.34 Agenda Cache
CREATE TABLE IF NOT EXISTS public.agenda_cache (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE,
  event_time TIME,
  event_type TEXT,
  location TEXT,
  organizer TEXT,
  link TEXT,
  cached_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3.35 Council Member Referrals (unified)
CREATE TABLE IF NOT EXISTS public.council_member_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  council_member_id TEXT NOT NULL,
  council_member_name TEXT NOT NULL,
  council_member_party TEXT,
  transport_report_id UUID REFERENCES public.transport_reports(id) ON DELETE SET NULL,
  urban_report_id UUID REFERENCES public.urban_reports(id) ON DELETE SET NULL,
  service_rating_id UUID REFERENCES public.service_ratings(id) ON DELETE SET NULL,
  citizen_message TEXT,
  match_score NUMERIC(5,2),
  match_reasons TEXT[],
  status TEXT NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  response_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3.36 Dashboards
CREATE TABLE IF NOT EXISTS public.dashboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_public BOOLEAN DEFAULT false,
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3.37 Export Logs
CREATE TABLE IF NOT EXISTS public.export_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  export_type TEXT NOT NULL,
  format TEXT NOT NULL,
  filters JSONB,
  row_count INTEGER,
  status TEXT DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3.38 Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  action TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  metadata JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.39 Search History
CREATE TABLE IF NOT EXISTS public.search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  search_query TEXT NOT NULL,
  search_type TEXT NOT NULL DEFAULT 'general',
  result_count INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.40 Knowledge Base (RAG)
CREATE TABLE IF NOT EXISTS public.knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  content_type TEXT NOT NULL,
  title TEXT,
  source_table TEXT,
  source_id UUID,
  embedding vector(1536),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3.41 N8N Settings
CREATE TABLE IF NOT EXISTS public.n8n_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  webhook_url TEXT NOT NULL,
  secret_key TEXT,
  enabled_events JSONB,
  is_connected BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3.42 N8N Integration Logs
CREATE TABLE IF NOT EXISTS public.n8n_integration_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  payload JSONB,
  response JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3.43 System Settings
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3.44 Protocol Sequences
CREATE TABLE IF NOT EXISTS public.protocol_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_type TEXT NOT NULL UNIQUE,
  current_year INTEGER NOT NULL,
  current_sequence INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3.45 Citizen Learning Profile
CREATE TABLE IF NOT EXISTS public.citizen_learning_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  communication_style TEXT,
  prefers_short_responses BOOLEAN DEFAULT true,
  avg_message_length INTEGER,
  common_keywords TEXT[],
  common_categories TEXT[],
  frequent_transport_lines TEXT[],
  frequent_services TEXT[],
  preferred_neighborhood TEXT,
  preferred_region TEXT,
  last_known_address JSONB,
  total_reports INTEGER DEFAULT 0,
  total_conversations INTEGER DEFAULT 0,
  report_frequency TEXT,
  last_interaction_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3.46 Dynamic Categories
CREATE TABLE IF NOT EXISTS public.dynamic_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_key TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  parent_category TEXT NOT NULL DEFAULT 'outros',
  keywords TEXT[] NOT NULL DEFAULT '{}',
  description_patterns TEXT[],
  sample_descriptions TEXT[],
  usage_count INTEGER DEFAULT 0,
  ai_confidence NUMERIC(5,4),
  status TEXT DEFAULT 'pending',
  merged_into TEXT,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  first_detected_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3.47 Category Usage Log
CREATE TABLE IF NOT EXISTS public.category_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  description_hash TEXT NOT NULL,
  description_sample TEXT,
  keywords_detected TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- PARTE 4: ÍNDICES
-- ============================================================================

-- Profiles
CREATE INDEX IF NOT EXISTS idx_profiles_full_name ON public.profiles(full_name);

-- User Demographics
CREATE INDEX IF NOT EXISTS idx_user_demographics_user_id ON public.user_demographics(user_id);
CREATE INDEX IF NOT EXISTS idx_user_demographics_gender ON public.user_demographics(gender);
CREATE INDEX IF NOT EXISTS idx_user_demographics_birth_date ON public.user_demographics(birth_date);

-- User Addresses
CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id ON public.user_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_addresses_is_primary ON public.user_addresses(is_primary);
CREATE INDEX IF NOT EXISTS idx_user_addresses_location ON public.user_addresses(latitude, longitude);

-- User Interests
CREATE INDEX IF NOT EXISTS idx_user_interests_user_id ON public.user_interests(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interests_category ON public.user_interests(interest_category);

-- User Roles
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);

-- Public Services
CREATE INDEX IF NOT EXISTS idx_public_services_type ON public.public_services(service_type);
CREATE INDEX IF NOT EXISTS idx_public_services_district ON public.public_services(district);
CREATE INDEX IF NOT EXISTS idx_public_services_location ON public.public_services(latitude, longitude);

-- Service Visits
CREATE INDEX IF NOT EXISTS idx_service_visits_user_id ON public.service_visits(user_id);
CREATE INDEX IF NOT EXISTS idx_service_visits_service_id ON public.service_visits(service_id);
CREATE INDEX IF NOT EXISTS idx_service_visits_status ON public.service_visits(status);

-- Service Ratings
CREATE INDEX IF NOT EXISTS idx_service_ratings_user_id ON public.service_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_service_ratings_service_id ON public.service_ratings(service_id);
CREATE INDEX IF NOT EXISTS idx_service_ratings_created_at ON public.service_ratings(created_at DESC);

-- Transport Lines
CREATE INDEX IF NOT EXISTS idx_transport_lines_code ON public.transport_lines(line_code);
CREATE INDEX IF NOT EXISTS idx_transport_lines_type ON public.transport_lines(line_type);

-- Transport Reports
CREATE INDEX IF NOT EXISTS idx_transport_reports_user_id ON public.transport_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_transport_reports_line_id ON public.transport_reports(line_id);
CREATE INDEX IF NOT EXISTS idx_transport_reports_status ON public.transport_reports(status);
CREATE INDEX IF NOT EXISTS idx_transport_reports_created_at ON public.transport_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transport_reports_protocol ON public.transport_reports(protocol_code);

-- Urban Reports
CREATE INDEX IF NOT EXISTS idx_urban_reports_user_id ON public.urban_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_urban_reports_category ON public.urban_reports(category);
CREATE INDEX IF NOT EXISTS idx_urban_reports_status ON public.urban_reports(status);
CREATE INDEX IF NOT EXISTS idx_urban_reports_created_at ON public.urban_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_urban_reports_protocol ON public.urban_reports(protocol_code);
CREATE INDEX IF NOT EXISTS idx_urban_reports_location ON public.urban_reports(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_urban_reports_neighborhood ON public.urban_reports(neighborhood);

-- AI Conversations
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON public.ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_last_message ON public.ai_conversations(last_message_at DESC);

-- Audiencias
CREATE INDEX IF NOT EXISTS idx_audiencias_data ON public.audiencias(data);
CREATE INDEX IF NOT EXISTS idx_audiencias_status ON public.audiencias(status);
CREATE INDEX IF NOT EXISTS idx_audiencias_tema ON public.audiencias(tema);

-- Audiencia Inscricoes
CREATE INDEX IF NOT EXISTS idx_audiencia_inscricoes_user_id ON public.audiencia_inscricoes(user_id);
CREATE INDEX IF NOT EXISTS idx_audiencia_inscricoes_audiencia_id ON public.audiencia_inscricoes(audiencia_id);

-- Council Member Referrals
CREATE INDEX IF NOT EXISTS idx_council_referrals_user_id ON public.council_member_referrals(user_id);
CREATE INDEX IF NOT EXISTS idx_council_referrals_status ON public.council_member_referrals(status);
CREATE INDEX IF NOT EXISTS idx_council_referrals_created_at ON public.council_member_referrals(created_at DESC);

-- Audit Logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON public.audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- Knowledge Base
CREATE INDEX IF NOT EXISTS idx_knowledge_base_content_type ON public.knowledge_base(content_type);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_source ON public.knowledge_base(source_table, source_id);

-- HNSW index for vector similarity search
CREATE INDEX IF NOT EXISTS idx_knowledge_base_embedding ON public.knowledge_base 
  USING hnsw (embedding vector_cosine_ops);

-- Cache tables
CREATE INDEX IF NOT EXISTS idx_news_cache_pub_date ON public.news_cache(pub_date DESC);
CREATE INDEX IF NOT EXISTS idx_council_members_cache_party ON public.council_members_cache(party);
CREATE INDEX IF NOT EXISTS idx_agenda_cache_event_date ON public.agenda_cache(event_date);

-- ============================================================================
-- PARTE 5: FUNÇÕES
-- ============================================================================

-- 5.1 Handle Updated At
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5.2 Update Updated At Column (alias)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5.3 Handle New User (Auth Trigger)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  
  -- Assign default cidadao role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'cidadao')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5.4 Initialize User Preferences
CREATE OR REPLACE FUNCTION public.initialize_user_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5.5 Update Service Rating
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

-- 5.6 Has Role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- 5.7 Has Any Role
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID, _roles app_role[])
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = ANY(_roles)
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- 5.8 Get User Roles
CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id UUID)
RETURNS SETOF app_role AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- 5.9 Notify Admins
CREATE OR REPLACE FUNCTION public.notify_admins(
  p_title TEXT, 
  p_message TEXT, 
  p_type TEXT, 
  p_action_url TEXT DEFAULT NULL, 
  p_priority TEXT DEFAULT 'normal', 
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO notifications (user_id, title, message, type, action_url, priority, metadata)
  SELECT ur.user_id, p_title, p_message, p_type, p_action_url, p_priority, p_metadata
  FROM user_roles ur
  WHERE ur.role IN ('admin'::app_role, 'gestor'::app_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5.10 Generate Protocol Code
CREATE OR REPLACE FUNCTION public.generate_protocol_code(p_type TEXT)
RETURNS TEXT AS $$
DECLARE
  v_prefix TEXT;
  v_year INTEGER;
  v_sequence INTEGER;
  v_current_year INTEGER;
BEGIN
  v_current_year := EXTRACT(YEAR FROM NOW())::INTEGER;
  
  -- Define prefix based on type
  v_prefix := CASE p_type
    WHEN 'urban' THEN 'URB'
    WHEN 'transport' THEN 'TRP'
    ELSE 'GEN'
  END;
  
  -- Atomic lock and update
  UPDATE protocol_sequences
  SET 
    current_sequence = CASE 
      WHEN current_year < v_current_year THEN 1
      ELSE current_sequence + 1
    END,
    current_year = v_current_year,
    updated_at = NOW()
  WHERE sequence_type = p_type
  RETURNING current_year, current_sequence INTO v_year, v_sequence;
  
  -- Return formatted code
  RETURN v_prefix || '-' || v_year || '-' || LPAD(v_sequence::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5.11 Match Documents (RAG Semantic Search)
CREATE OR REPLACE FUNCTION public.match_documents(
  query_embedding vector(1536),
  match_threshold DOUBLE PRECISION DEFAULT 0.7,
  match_count INTEGER DEFAULT 5,
  filter_content_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  content_type TEXT,
  title TEXT,
  source_id UUID,
  source_table TEXT,
  metadata JSONB,
  similarity DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    kb.id,
    kb.content,
    kb.content_type,
    kb.title,
    kb.source_id,
    kb.source_table,
    kb.metadata,
    1 - (kb.embedding <=> query_embedding) AS similarity
  FROM public.knowledge_base kb
  WHERE 
    kb.embedding IS NOT NULL
    AND 1 - (kb.embedding <=> query_embedding) > match_threshold
    AND (filter_content_type IS NULL OR kb.content_type = filter_content_type)
  ORDER BY kb.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5.12 Get Reports With Demographics (Analytics)
CREATE OR REPLACE FUNCTION public.get_reports_with_demographics(
  p_gender TEXT DEFAULT NULL,
  p_race TEXT DEFAULT NULL,
  p_social_class TEXT DEFAULT NULL,
  p_age_group TEXT DEFAULT NULL,
  p_report_type TEXT DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  WITH filtered_urban AS (
    SELECT 
      ur.id,
      ur.severity,
      ur.status,
      ur.category,
      ur.neighborhood,
      ur.created_at,
      ur.user_id,
      'urban' as source
    FROM urban_reports ur
    LEFT JOIN user_demographics ud ON ur.user_id = ud.user_id
    WHERE (p_report_type IS NULL OR p_report_type = 'urban')
      AND (p_start_date IS NULL OR ur.created_at >= p_start_date)
      AND (p_end_date IS NULL OR ur.created_at <= p_end_date + INTERVAL '1 day')
      AND (p_gender IS NULL OR COALESCE(ud.gender, 'not_informed') = p_gender)
      AND (p_race IS NULL OR COALESCE(ud.race, 'not_informed') = p_race)
      AND (p_social_class IS NULL OR COALESCE(ud.social_class, 'not_informed') = p_social_class)
      AND (p_age_group IS NULL OR (
        CASE 
          WHEN ud.birth_date IS NULL THEN 'not_informed'
          WHEN EXTRACT(YEAR FROM age(ud.birth_date)) < 18 THEN 'under_18'
          WHEN EXTRACT(YEAR FROM age(ud.birth_date)) BETWEEN 18 AND 24 THEN '18_24'
          WHEN EXTRACT(YEAR FROM age(ud.birth_date)) BETWEEN 25 AND 34 THEN '25_34'
          WHEN EXTRACT(YEAR FROM age(ud.birth_date)) BETWEEN 35 AND 44 THEN '35_44'
          WHEN EXTRACT(YEAR FROM age(ud.birth_date)) BETWEEN 45 AND 54 THEN '45_54'
          WHEN EXTRACT(YEAR FROM age(ud.birth_date)) BETWEEN 55 AND 64 THEN '55_64'
          ELSE '65_plus'
        END = p_age_group
      ))
  ),
  filtered_transport AS (
    SELECT 
      tr.id,
      tr.severity,
      tr.status,
      tr.report_type as category,
      tr.location as neighborhood,
      tr.created_at,
      tr.user_id,
      'transport' as source
    FROM transport_reports tr
    LEFT JOIN user_demographics ud ON tr.user_id = ud.user_id
    WHERE (p_report_type IS NULL OR p_report_type = 'transport')
      AND (p_start_date IS NULL OR tr.created_at >= p_start_date)
      AND (p_end_date IS NULL OR tr.created_at <= p_end_date + INTERVAL '1 day')
      AND (p_gender IS NULL OR COALESCE(ud.gender, 'not_informed') = p_gender)
      AND (p_race IS NULL OR COALESCE(ud.race, 'not_informed') = p_race)
      AND (p_social_class IS NULL OR COALESCE(ud.social_class, 'not_informed') = p_social_class)
      AND (p_age_group IS NULL OR (
        CASE 
          WHEN ud.birth_date IS NULL THEN 'not_informed'
          WHEN EXTRACT(YEAR FROM age(ud.birth_date)) < 18 THEN 'under_18'
          WHEN EXTRACT(YEAR FROM age(ud.birth_date)) BETWEEN 18 AND 24 THEN '18_24'
          WHEN EXTRACT(YEAR FROM age(ud.birth_date)) BETWEEN 25 AND 34 THEN '25_34'
          WHEN EXTRACT(YEAR FROM age(ud.birth_date)) BETWEEN 35 AND 44 THEN '35_44'
          WHEN EXTRACT(YEAR FROM age(ud.birth_date)) BETWEEN 45 AND 54 THEN '45_54'
          WHEN EXTRACT(YEAR FROM age(ud.birth_date)) BETWEEN 55 AND 64 THEN '55_64'
          ELSE '65_plus'
        END = p_age_group
      ))
  ),
  filtered_evaluations AS (
    SELECT 
      sr.id,
      'medium'::text as severity,
      CASE 
        WHEN sr.rating_stars >= 4 THEN 'resolved'
        WHEN sr.rating_stars <= 2 THEN 'pending'
        ELSE 'in_progress'
      END as status,
      COALESCE(ps.service_type::text, 'ubs') as category,
      ps.district as neighborhood,
      sr.created_at,
      sr.user_id,
      'evaluation' as source
    FROM service_ratings sr
    LEFT JOIN public_services ps ON sr.service_id = ps.id
    LEFT JOIN user_demographics ud ON sr.user_id = ud.user_id
    WHERE (p_report_type IS NULL OR p_report_type = 'evaluation')
      AND (p_start_date IS NULL OR sr.created_at >= p_start_date)
      AND (p_end_date IS NULL OR sr.created_at <= p_end_date + INTERVAL '1 day')
      AND (p_gender IS NULL OR COALESCE(ud.gender, 'not_informed') = p_gender)
      AND (p_race IS NULL OR COALESCE(ud.race, 'not_informed') = p_race)
      AND (p_social_class IS NULL OR COALESCE(ud.social_class, 'not_informed') = p_social_class)
      AND (p_age_group IS NULL OR (
        CASE 
          WHEN ud.birth_date IS NULL THEN 'not_informed'
          WHEN EXTRACT(YEAR FROM age(ud.birth_date)) < 18 THEN 'under_18'
          WHEN EXTRACT(YEAR FROM age(ud.birth_date)) BETWEEN 18 AND 24 THEN '18_24'
          WHEN EXTRACT(YEAR FROM age(ud.birth_date)) BETWEEN 25 AND 34 THEN '25_34'
          WHEN EXTRACT(YEAR FROM age(ud.birth_date)) BETWEEN 35 AND 44 THEN '35_44'
          WHEN EXTRACT(YEAR FROM age(ud.birth_date)) BETWEEN 45 AND 54 THEN '45_54'
          WHEN EXTRACT(YEAR FROM age(ud.birth_date)) BETWEEN 55 AND 64 THEN '55_64'
          ELSE '65_plus'
        END = p_age_group
      ))
  ),
  all_reports AS (
    SELECT id, severity, status, category, neighborhood, created_at, user_id, source FROM filtered_urban
    UNION ALL
    SELECT id, severity, status, category, neighborhood, created_at, user_id, source FROM filtered_transport
    UNION ALL
    SELECT id, severity, status, category, neighborhood, created_at, user_id, source FROM filtered_evaluations
  ),
  stats AS (
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE source = 'urban') as urban,
      COUNT(*) FILTER (WHERE source = 'transport') as transport,
      COUNT(*) FILTER (WHERE source = 'evaluation') as evaluation,
      COUNT(*) FILTER (WHERE status = 'pending') as pending,
      COUNT(*) FILTER (WHERE status = 'resolved') as resolved,
      COUNT(*) FILTER (WHERE severity = 'critical') as critical
    FROM all_reports
  ),
  category_dist AS (
    SELECT category, COUNT(*) as count
    FROM all_reports
    WHERE category IS NOT NULL
    GROUP BY category
    ORDER BY count DESC
  ),
  neighborhood_dist AS (
    SELECT neighborhood, COUNT(*) as count
    FROM all_reports
    WHERE neighborhood IS NOT NULL
    GROUP BY neighborhood
    ORDER BY count DESC
    LIMIT 20
  ),
  status_dist AS (
    SELECT status, COUNT(*) as count
    FROM all_reports
    GROUP BY status
  ),
  demographics_agg AS (
    SELECT 
      ar.user_id,
      COALESCE(ud.gender, 'not_informed') as gender,
      COALESCE(ud.race, 'not_informed') as race,
      COALESCE(ud.social_class, 'not_informed') as social_class,
      CASE 
        WHEN ud.birth_date IS NULL THEN 'not_informed'
        WHEN EXTRACT(YEAR FROM age(ud.birth_date)) < 18 THEN 'under_18'
        WHEN EXTRACT(YEAR FROM age(ud.birth_date)) BETWEEN 18 AND 24 THEN '18_24'
        WHEN EXTRACT(YEAR FROM age(ud.birth_date)) BETWEEN 25 AND 34 THEN '25_34'
        WHEN EXTRACT(YEAR FROM age(ud.birth_date)) BETWEEN 35 AND 44 THEN '35_44'
        WHEN EXTRACT(YEAR FROM age(ud.birth_date)) BETWEEN 45 AND 54 THEN '45_54'
        WHEN EXTRACT(YEAR FROM age(ud.birth_date)) BETWEEN 55 AND 64 THEN '55_64'
        ELSE '65_plus'
      END as age_group
    FROM all_reports ar
    LEFT JOIN user_demographics ud ON ar.user_id = ud.user_id
  )
  SELECT json_build_object(
    'total', COALESCE(s.total, 0),
    'urban_count', COALESCE(s.urban, 0),
    'transport_count', COALESCE(s.transport, 0),
    'evaluation_count', COALESCE(s.evaluation, 0),
    'pending_count', COALESCE(s.pending, 0),
    'resolved_count', COALESCE(s.resolved, 0),
    'critical_count', COALESCE(s.critical, 0),
    'category_distribution', COALESCE((SELECT json_agg(json_build_object('category', category, 'count', count)) FROM category_dist), '[]'::json),
    'neighborhood_distribution', COALESCE((SELECT json_agg(json_build_object('neighborhood', neighborhood, 'count', count)) FROM neighborhood_dist), '[]'::json),
    'status_distribution', COALESCE((SELECT json_agg(json_build_object('status', status, 'count', count)) FROM status_dist), '[]'::json),
    'demographics', json_build_object(
      'gender', COALESCE((SELECT json_object_agg(gender, cnt) FROM (SELECT gender, COUNT(*) as cnt FROM demographics_agg GROUP BY gender) g), '{}'::json),
      'race', COALESCE((SELECT json_object_agg(race, cnt) FROM (SELECT race, COUNT(*) as cnt FROM demographics_agg GROUP BY race) r), '{}'::json),
      'social_class', COALESCE((SELECT json_object_agg(social_class, cnt) FROM (SELECT social_class, COUNT(*) as cnt FROM demographics_agg GROUP BY social_class) sc), '{}'::json),
      'age_group', COALESCE((SELECT json_object_agg(age_group, cnt) FROM (SELECT age_group, COUNT(*) as cnt FROM demographics_agg GROUP BY age_group) ag), '{}'::json)
    )
  ) INTO result
  FROM stats s;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5.13 Notification Triggers
CREATE OR REPLACE FUNCTION public.notify_citizen_on_referral()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id uuid;
  v_report_type text;
  v_report_title text;
BEGIN
  IF NEW.transport_report_id IS NOT NULL THEN
    SELECT tr.user_id, tr.report_type INTO v_user_id, v_report_title
    FROM transport_reports tr
    WHERE tr.id = NEW.transport_report_id;
    v_report_type := 'transporte';
  ELSIF NEW.urban_report_id IS NOT NULL THEN
    SELECT ur.user_id, COALESCE(ur.subcategory, ur.category) INTO v_user_id, v_report_title
    FROM urban_reports ur
    WHERE ur.id = NEW.urban_report_id;
    v_report_type := 'urbano';
  ELSIF NEW.service_rating_id IS NOT NULL THEN
    SELECT sr.user_id INTO v_user_id
    FROM service_ratings sr
    WHERE sr.id = NEW.service_rating_id;
    v_report_type := 'serviço';
    v_report_title := 'Avaliação de serviço';
  END IF;

  IF v_user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, title, message, type, priority, action_url, metadata)
    VALUES (
      v_user_id,
      'Seu relato foi encaminhado',
      'Seu relato de ' || v_report_type || ' foi encaminhado para o(a) vereador(a) ' || NEW.council_member_name || ' (' || COALESCE(NEW.council_member_party, 'sem partido') || ').',
      'referral',
      'high',
      CASE 
        WHEN NEW.transport_report_id IS NOT NULL THEN '/transporte/meus-relatos'
        WHEN NEW.urban_report_id IS NOT NULL THEN '/relato-urbano/historico'
        ELSE '/avaliar'
      END,
      jsonb_build_object(
        'referral_id', NEW.id,
        'council_member_name', NEW.council_member_name,
        'council_member_party', NEW.council_member_party,
        'report_type', v_report_type
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.notify_citizen_on_referral_update()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id uuid;
  v_report_type text;
  v_title text;
  v_message text;
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  IF NEW.transport_report_id IS NOT NULL THEN
    SELECT tr.user_id INTO v_user_id FROM transport_reports tr WHERE tr.id = NEW.transport_report_id;
    v_report_type := 'transporte';
  ELSIF NEW.urban_report_id IS NOT NULL THEN
    SELECT ur.user_id INTO v_user_id FROM urban_reports ur WHERE ur.id = NEW.urban_report_id;
    v_report_type := 'urbano';
  ELSIF NEW.service_rating_id IS NOT NULL THEN
    SELECT sr.user_id INTO v_user_id FROM service_ratings sr WHERE sr.id = NEW.service_rating_id;
    v_report_type := 'serviço';
  END IF;

  CASE NEW.status
    WHEN 'sent' THEN
      v_title := 'Encaminhamento enviado';
      v_message := 'O encaminhamento do seu relato de ' || v_report_type || ' foi enviado ao(à) vereador(a) ' || NEW.council_member_name || '.';
    WHEN 'acknowledged' THEN
      v_title := 'Vereador(a) recebeu seu relato';
      v_message := 'O(A) vereador(a) ' || NEW.council_member_name || ' confirmou o recebimento do seu relato de ' || v_report_type || '.';
    WHEN 'resolved' THEN
      v_title := 'Seu encaminhamento foi resolvido';
      v_message := 'O(A) vereador(a) ' || NEW.council_member_name || ' marcou seu encaminhamento de ' || v_report_type || ' como resolvido.';
    ELSE
      RETURN NEW;
  END CASE;

  IF v_user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, title, message, type, priority, action_url, metadata)
    VALUES (
      v_user_id,
      v_title,
      v_message,
      'referral_update',
      'normal',
      CASE 
        WHEN NEW.transport_report_id IS NOT NULL THEN '/transporte/meus-relatos'
        WHEN NEW.urban_report_id IS NOT NULL THEN '/relato-urbano/historico'
        ELSE '/avaliar'
      END,
      jsonb_build_object(
        'referral_id', NEW.id,
        'council_member_name', NEW.council_member_name,
        'new_status', NEW.status,
        'report_type', v_report_type
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.notify_urban_report_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO notifications (user_id, title, message, type, priority, action_url, metadata)
    VALUES (
      NEW.user_id,
      'Atualização no seu relato',
      'O status do seu relato de ' || COALESCE(NEW.subcategory, NEW.category) || ' foi atualizado para: ' || 
        CASE NEW.status 
          WHEN 'pending' THEN 'Pendente'
          WHEN 'in_progress' THEN 'Em andamento'
          WHEN 'resolved' THEN 'Resolvido'
          WHEN 'rejected' THEN 'Rejeitado'
          ELSE NEW.status 
        END,
      'urbano',
      CASE WHEN NEW.status = 'resolved' THEN 'normal' ELSE 'high' END,
      '/relato-urbano/historico',
      jsonb_build_object('report_id', NEW.id, 'old_status', OLD.status, 'new_status', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.notify_transport_report_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO notifications (user_id, title, message, type, priority, action_url, metadata)
    VALUES (
      NEW.user_id,
      'Atualização no seu relato de transporte',
      'O status do seu relato foi atualizado para: ' || 
        CASE NEW.status 
          WHEN 'pending' THEN 'Pendente'
          WHEN 'in_progress' THEN 'Em análise'
          WHEN 'resolved' THEN 'Resolvido'
          WHEN 'rejected' THEN 'Rejeitado'
          ELSE NEW.status 
        END,
      'transporte',
      CASE WHEN NEW.status = 'resolved' THEN 'normal' ELSE 'high' END,
      '/transporte/meus-relatos',
      jsonb_build_object('report_id', NEW.id, 'old_status', OLD.status, 'new_status', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.notify_transport_response()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id uuid;
  v_report_type text;
BEGIN
  SELECT user_id, report_type INTO v_user_id, v_report_type 
  FROM transport_reports 
  WHERE id = NEW.report_id;
  
  IF v_user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, title, message, type, priority, action_url, metadata)
    VALUES (
      v_user_id,
      'Nova resposta no seu relato',
      'Seu relato de ' || COALESCE(v_report_type, 'transporte') || ' recebeu uma resposta oficial.',
      'transporte',
      'high',
      '/transporte/meus-relatos',
      jsonb_build_object('report_id', NEW.report_id, 'response_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.notify_urban_report_comment()
RETURNS TRIGGER AS $$
DECLARE
  v_report_user_id uuid;
  v_report_category text;
BEGIN
  SELECT user_id, COALESCE(subcategory, category) INTO v_report_user_id, v_report_category 
  FROM urban_reports 
  WHERE id = NEW.report_id;
  
  IF v_report_user_id IS NOT NULL AND v_report_user_id != NEW.user_id THEN
    INSERT INTO notifications (user_id, title, message, type, priority, action_url, metadata)
    VALUES (
      v_report_user_id,
      'Novo comentário no seu relato',
      'Alguém comentou no seu relato de ' || COALESCE(v_report_category, 'problema urbano') || '.',
      'urbano',
      'normal',
      '/relato-urbano/historico',
      jsonb_build_object('report_id', NEW.report_id, 'comment_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5.14 On New User Profile (notify admins)
CREATE OR REPLACE FUNCTION public.on_new_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM notify_admins(
    'Novo Usuário Cadastrado',
    COALESCE(NEW.full_name, 'Usuário') || ' se cadastrou na plataforma.',
    'new_user',
    '/admin/users',
    'low',
    jsonb_build_object('user_id', NEW.id, 'name', NEW.full_name)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5.15 On Urban Report Created
CREATE OR REPLACE FUNCTION public.on_urban_report_created()
RETURNS TRIGGER AS $$
DECLARE
  v_priority TEXT := 'normal';
  v_type TEXT := 'new_urban_report';
BEGIN
  IF NEW.risk_level IS NOT NULL AND NEW.risk_level = 'critical' THEN
    v_priority := 'high';
    v_type := 'critical_report';
  END IF;

  PERFORM notify_admins(
    'Novo Relato Urbano',
    'Categoria: ' || COALESCE(NEW.category, 'Não informada') || ' - ' || COALESCE(NEW.subcategory, ''),
    v_type,
    '/admin/reports?type=urban&id=' || NEW.id,
    v_priority,
    jsonb_build_object(
      'report_id', NEW.id, 
      'category', NEW.category, 
      'subcategory', NEW.subcategory,
      'risk_level', NEW.risk_level
    )
  );

  IF NEW.user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, title, message, type, action_url, priority, metadata)
    VALUES (
      NEW.user_id,
      'Relato Recebido com Sucesso',
      'Seu relato sobre "' || COALESCE(NEW.subcategory, NEW.category, 'problema urbano') || '" foi registrado. Acompanhe o status na área de histórico.',
      'report_received',
      '/relato-urbano/historico',
      'normal',
      jsonb_build_object('report_id', NEW.id)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5.16 On Transport Report Created
CREATE OR REPLACE FUNCTION public.on_transport_report_created()
RETURNS TRIGGER AS $$
DECLARE
  line_display TEXT;
BEGIN
  SELECT COALESCE(tl.line_code || ' - ' || tl.line_name, NEW.line_code_custom, 'Não informada')
  INTO line_display
  FROM transport_lines tl
  WHERE tl.id = NEW.line_id;
  
  IF line_display IS NULL THEN
    line_display := COALESCE(NEW.line_code_custom, 'Não informada');
  END IF;

  PERFORM notify_admins(
    'Novo Relato de Transporte',
    'Linha: ' || line_display || ' - ' || COALESCE(NEW.report_type, 'Problema'),
    'new_transport_report',
    '/admin/reports?type=transport&id=' || NEW.id,
    'normal',
    jsonb_build_object('report_id', NEW.id, 'line', line_display, 'report_type', NEW.report_type)
  );

  IF NEW.user_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, title, message, type, action_url, priority, metadata)
    VALUES (
      NEW.user_id,
      'Relato de Transporte Recebido',
      'Seu relato sobre a linha "' || line_display || '" foi registrado com sucesso.',
      'report_received',
      '/transporte/meus-relatos',
      'normal',
      jsonb_build_object('report_id', NEW.id)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5.17 Update Citizen Learning Updated At
CREATE OR REPLACE FUNCTION public.update_citizen_learning_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 5.18 Handle Dashboard Updated At
CREATE OR REPLACE FUNCTION public.handle_dashboard_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5.19 Handle Urban Reports Updated At
CREATE OR REPLACE FUNCTION public.handle_urban_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PARTE 6: TRIGGERS
-- ============================================================================

-- Updated At Triggers
DROP TRIGGER IF EXISTS handle_profiles_updated_at ON public.profiles;
CREATE TRIGGER handle_profiles_updated_at 
  BEFORE UPDATE ON public.profiles 
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS handle_user_demographics_updated_at ON public.user_demographics;
CREATE TRIGGER handle_user_demographics_updated_at 
  BEFORE UPDATE ON public.user_demographics 
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS handle_user_addresses_updated_at ON public.user_addresses;
CREATE TRIGGER handle_user_addresses_updated_at 
  BEFORE UPDATE ON public.user_addresses 
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS handle_user_preferences_updated_at ON public.user_preferences;
CREATE TRIGGER handle_user_preferences_updated_at 
  BEFORE UPDATE ON public.user_preferences 
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS handle_notification_settings_updated_at ON public.notification_settings;
CREATE TRIGGER handle_notification_settings_updated_at 
  BEFORE UPDATE ON public.notification_settings 
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS handle_public_services_updated_at ON public.public_services;
CREATE TRIGGER handle_public_services_updated_at 
  BEFORE UPDATE ON public.public_services 
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS handle_service_visits_updated_at ON public.service_visits;
CREATE TRIGGER handle_service_visits_updated_at 
  BEFORE UPDATE ON public.service_visits 
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS handle_service_ratings_updated_at ON public.service_ratings;
CREATE TRIGGER handle_service_ratings_updated_at 
  BEFORE UPDATE ON public.service_ratings 
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS handle_rating_referrals_updated_at ON public.rating_referrals;
CREATE TRIGGER handle_rating_referrals_updated_at 
  BEFORE UPDATE ON public.rating_referrals 
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS handle_transport_reports_updated_at ON public.transport_reports;
CREATE TRIGGER handle_transport_reports_updated_at 
  BEFORE UPDATE ON public.transport_reports 
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS handle_transport_report_responses_updated_at ON public.transport_report_responses;
CREATE TRIGGER handle_transport_report_responses_updated_at 
  BEFORE UPDATE ON public.transport_report_responses 
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS handle_report_referrals_updated_at ON public.report_referrals;
CREATE TRIGGER handle_report_referrals_updated_at 
  BEFORE UPDATE ON public.report_referrals 
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS handle_urban_reports_updated_at ON public.urban_reports;
CREATE TRIGGER handle_urban_reports_updated_at 
  BEFORE UPDATE ON public.urban_reports 
  FOR EACH ROW EXECUTE FUNCTION handle_urban_reports_updated_at();

DROP TRIGGER IF EXISTS handle_urban_report_comments_updated_at ON public.urban_report_comments;
CREATE TRIGGER handle_urban_report_comments_updated_at 
  BEFORE UPDATE ON public.urban_report_comments 
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS handle_ai_conversations_updated_at ON public.ai_conversations;
CREATE TRIGGER handle_ai_conversations_updated_at 
  BEFORE UPDATE ON public.ai_conversations 
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS handle_audiencias_updated_at ON public.audiencias;
CREATE TRIGGER handle_audiencias_updated_at 
  BEFORE UPDATE ON public.audiencias 
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS handle_council_member_referrals_updated_at ON public.council_member_referrals;
CREATE TRIGGER handle_council_member_referrals_updated_at 
  BEFORE UPDATE ON public.council_member_referrals 
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS handle_dashboards_updated_at ON public.dashboards;
CREATE TRIGGER handle_dashboards_updated_at 
  BEFORE UPDATE ON public.dashboards 
  FOR EACH ROW EXECUTE FUNCTION handle_dashboard_updated_at();

DROP TRIGGER IF EXISTS handle_n8n_settings_updated_at ON public.n8n_settings;
CREATE TRIGGER handle_n8n_settings_updated_at 
  BEFORE UPDATE ON public.n8n_settings 
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS handle_system_settings_updated_at ON public.system_settings;
CREATE TRIGGER handle_system_settings_updated_at 
  BEFORE UPDATE ON public.system_settings 
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS handle_knowledge_base_updated_at ON public.knowledge_base;
CREATE TRIGGER handle_knowledge_base_updated_at 
  BEFORE UPDATE ON public.knowledge_base 
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

DROP TRIGGER IF EXISTS handle_citizen_learning_updated_at ON public.citizen_learning_profile;
CREATE TRIGGER handle_citizen_learning_updated_at 
  BEFORE UPDATE ON public.citizen_learning_profile 
  FOR EACH ROW EXECUTE FUNCTION update_citizen_learning_updated_at();

-- Service Rating Trigger
DROP TRIGGER IF EXISTS update_service_rating_trigger ON public.service_ratings;
CREATE TRIGGER update_service_rating_trigger 
  AFTER INSERT OR UPDATE ON public.service_ratings 
  FOR EACH ROW EXECUTE FUNCTION update_service_rating();

-- Initialize User Preferences Trigger
DROP TRIGGER IF EXISTS initialize_user_preferences_trigger ON public.profiles;
CREATE TRIGGER initialize_user_preferences_trigger 
  AFTER INSERT ON public.profiles 
  FOR EACH ROW EXECUTE FUNCTION initialize_user_preferences();

-- Notification Triggers
DROP TRIGGER IF EXISTS on_new_user_profile_trigger ON public.profiles;
CREATE TRIGGER on_new_user_profile_trigger 
  AFTER INSERT ON public.profiles 
  FOR EACH ROW EXECUTE FUNCTION on_new_user_profile();

DROP TRIGGER IF EXISTS on_urban_report_created_trigger ON public.urban_reports;
CREATE TRIGGER on_urban_report_created_trigger 
  AFTER INSERT ON public.urban_reports 
  FOR EACH ROW EXECUTE FUNCTION on_urban_report_created();

DROP TRIGGER IF EXISTS on_transport_report_created_trigger ON public.transport_reports;
CREATE TRIGGER on_transport_report_created_trigger 
  AFTER INSERT ON public.transport_reports 
  FOR EACH ROW EXECUTE FUNCTION on_transport_report_created();

DROP TRIGGER IF EXISTS notify_urban_report_status_change_trigger ON public.urban_reports;
CREATE TRIGGER notify_urban_report_status_change_trigger 
  AFTER UPDATE ON public.urban_reports 
  FOR EACH ROW EXECUTE FUNCTION notify_urban_report_status_change();

DROP TRIGGER IF EXISTS notify_transport_report_status_change_trigger ON public.transport_reports;
CREATE TRIGGER notify_transport_report_status_change_trigger 
  AFTER UPDATE ON public.transport_reports 
  FOR EACH ROW EXECUTE FUNCTION notify_transport_report_status_change();

DROP TRIGGER IF EXISTS notify_transport_response_trigger ON public.transport_report_responses;
CREATE TRIGGER notify_transport_response_trigger 
  AFTER INSERT ON public.transport_report_responses 
  FOR EACH ROW EXECUTE FUNCTION notify_transport_response();

DROP TRIGGER IF EXISTS notify_urban_report_comment_trigger ON public.urban_report_comments;
CREATE TRIGGER notify_urban_report_comment_trigger 
  AFTER INSERT ON public.urban_report_comments 
  FOR EACH ROW EXECUTE FUNCTION notify_urban_report_comment();

DROP TRIGGER IF EXISTS notify_citizen_on_referral_trigger ON public.council_member_referrals;
CREATE TRIGGER notify_citizen_on_referral_trigger 
  AFTER INSERT ON public.council_member_referrals 
  FOR EACH ROW EXECUTE FUNCTION notify_citizen_on_referral();

DROP TRIGGER IF EXISTS notify_citizen_on_referral_update_trigger ON public.council_member_referrals;
CREATE TRIGGER notify_citizen_on_referral_update_trigger 
  AFTER UPDATE ON public.council_member_referrals 
  FOR EACH ROW EXECUTE FUNCTION notify_citizen_on_referral_update();

-- ============================================================================
-- PARTE 7: ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_demographics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_completion_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rating_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_plan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_report_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.urban_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.urban_report_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.urban_report_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audiencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audiencia_inscricoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.noticias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.council_members_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.council_member_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.n8n_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.n8n_integration_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.protocol_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.citizen_learning_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dynamic_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_usage_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 7.1 PROFILES POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles 
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles 
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles 
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "admins_select_all_profiles" ON public.profiles;
CREATE POLICY "admins_select_all_profiles" ON public.profiles 
  FOR SELECT USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'gestor'::app_role]));

DROP POLICY IF EXISTS "admins_update_all_profiles" ON public.profiles;
CREATE POLICY "admins_update_all_profiles" ON public.profiles 
  FOR UPDATE USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'gestor'::app_role]));

-- ============================================================================
-- 7.2 USER DEMOGRAPHICS POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "user_demographics_select_own" ON public.user_demographics;
CREATE POLICY "user_demographics_select_own" ON public.user_demographics 
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_demographics_insert_own" ON public.user_demographics;
CREATE POLICY "user_demographics_insert_own" ON public.user_demographics 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_demographics_update_own" ON public.user_demographics;
CREATE POLICY "user_demographics_update_own" ON public.user_demographics 
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================================
-- 7.3 USER ADDRESSES POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "user_addresses_select_own" ON public.user_addresses;
CREATE POLICY "user_addresses_select_own" ON public.user_addresses 
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_addresses_insert_own" ON public.user_addresses;
CREATE POLICY "user_addresses_insert_own" ON public.user_addresses 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_addresses_update_own" ON public.user_addresses;
CREATE POLICY "user_addresses_update_own" ON public.user_addresses 
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_addresses_delete_own" ON public.user_addresses;
CREATE POLICY "user_addresses_delete_own" ON public.user_addresses 
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- 7.4 USER INTERESTS POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "user_interests_select_own" ON public.user_interests;
CREATE POLICY "user_interests_select_own" ON public.user_interests 
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_interests_insert_own" ON public.user_interests;
CREATE POLICY "user_interests_insert_own" ON public.user_interests 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_interests_delete_own" ON public.user_interests;
CREATE POLICY "user_interests_delete_own" ON public.user_interests 
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- 7.5 USER PREFERENCES POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "user_preferences_select_own" ON public.user_preferences;
CREATE POLICY "user_preferences_select_own" ON public.user_preferences 
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_preferences_insert_own" ON public.user_preferences;
CREATE POLICY "user_preferences_insert_own" ON public.user_preferences 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_preferences_update_own" ON public.user_preferences;
CREATE POLICY "user_preferences_update_own" ON public.user_preferences 
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================================
-- 7.6 USER ROLES POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "user_roles_select_own" ON public.user_roles;
CREATE POLICY "user_roles_select_own" ON public.user_roles 
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "admins_manage_roles" ON public.user_roles;
CREATE POLICY "admins_manage_roles" ON public.user_roles 
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================================
-- 7.7 PROFILE COMPLETION PROGRESS POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "profile_completion_select_own" ON public.profile_completion_progress;
CREATE POLICY "profile_completion_select_own" ON public.profile_completion_progress 
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "profile_completion_insert_own" ON public.profile_completion_progress;
CREATE POLICY "profile_completion_insert_own" ON public.profile_completion_progress 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 7.8 NOTIFICATIONS POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own" ON public.notifications 
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own" ON public.notifications 
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_delete_own" ON public.notifications;
CREATE POLICY "notifications_delete_own" ON public.notifications 
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- 7.9 NOTIFICATION SETTINGS POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "notification_settings_select_own" ON public.notification_settings;
CREATE POLICY "notification_settings_select_own" ON public.notification_settings 
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notification_settings_insert_own" ON public.notification_settings;
CREATE POLICY "notification_settings_insert_own" ON public.notification_settings 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notification_settings_update_own" ON public.notification_settings;
CREATE POLICY "notification_settings_update_own" ON public.notification_settings 
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================================
-- 7.10 PUBLIC SERVICES POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "public_services_select_all" ON public.public_services;
CREATE POLICY "public_services_select_all" ON public.public_services 
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "admins_manage_public_services" ON public.public_services;
CREATE POLICY "admins_manage_public_services" ON public.public_services 
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'gestor'::app_role]));

-- ============================================================================
-- 7.11 SERVICE VISITS POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "service_visits_select_own" ON public.service_visits;
CREATE POLICY "service_visits_select_own" ON public.service_visits 
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "service_visits_insert_own" ON public.service_visits;
CREATE POLICY "service_visits_insert_own" ON public.service_visits 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "service_visits_update_own" ON public.service_visits;
CREATE POLICY "service_visits_update_own" ON public.service_visits 
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================================
-- 7.12 SERVICE RATINGS POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "service_ratings_select_own" ON public.service_ratings;
CREATE POLICY "service_ratings_select_own" ON public.service_ratings 
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "service_ratings_insert_own" ON public.service_ratings;
CREATE POLICY "service_ratings_insert_own" ON public.service_ratings 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "service_ratings_update_own" ON public.service_ratings;
CREATE POLICY "service_ratings_update_own" ON public.service_ratings 
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "admins_select_all_ratings" ON public.service_ratings;
CREATE POLICY "admins_select_all_ratings" ON public.service_ratings 
  FOR SELECT USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'gestor'::app_role]));

-- ============================================================================
-- 7.13 RATING REFERRALS POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "rating_referrals_select_own" ON public.rating_referrals;
CREATE POLICY "rating_referrals_select_own" ON public.rating_referrals 
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "rating_referrals_insert_own" ON public.rating_referrals;
CREATE POLICY "rating_referrals_insert_own" ON public.rating_referrals 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "admins_manage_rating_referrals" ON public.rating_referrals;
CREATE POLICY "admins_manage_rating_referrals" ON public.rating_referrals 
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'gestor'::app_role, 'vereador'::app_role, 'assessor'::app_role]));

-- ============================================================================
-- 7.14 SERVICE SUBSCRIPTIONS POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "service_subscriptions_select_own" ON public.service_subscriptions;
CREATE POLICY "service_subscriptions_select_own" ON public.service_subscriptions 
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "service_subscriptions_insert_own" ON public.service_subscriptions;
CREATE POLICY "service_subscriptions_insert_own" ON public.service_subscriptions 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "service_subscriptions_delete_own" ON public.service_subscriptions;
CREATE POLICY "service_subscriptions_delete_own" ON public.service_subscriptions 
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- 7.15 SERVICE CORRECTIONS POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "service_corrections_select_own" ON public.service_corrections;
CREATE POLICY "service_corrections_select_own" ON public.service_corrections 
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "service_corrections_insert_own" ON public.service_corrections;
CREATE POLICY "service_corrections_insert_own" ON public.service_corrections 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "admins_manage_corrections" ON public.service_corrections;
CREATE POLICY "admins_manage_corrections" ON public.service_corrections 
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'gestor'::app_role]));

-- ============================================================================
-- 7.16 SERVICE PLANS POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "service_plans_select_own" ON public.service_plans;
CREATE POLICY "service_plans_select_own" ON public.service_plans 
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "service_plans_insert_own" ON public.service_plans;
CREATE POLICY "service_plans_insert_own" ON public.service_plans 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "service_plans_update_own" ON public.service_plans;
CREATE POLICY "service_plans_update_own" ON public.service_plans 
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "service_plans_delete_own" ON public.service_plans;
CREATE POLICY "service_plans_delete_own" ON public.service_plans 
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- 7.17 SERVICE PLAN ITEMS POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "service_plan_items_select_via_plan" ON public.service_plan_items;
CREATE POLICY "service_plan_items_select_via_plan" ON public.service_plan_items 
  FOR SELECT USING (EXISTS (SELECT 1 FROM service_plans WHERE id = plan_id AND user_id = auth.uid()));

DROP POLICY IF EXISTS "service_plan_items_insert_via_plan" ON public.service_plan_items;
CREATE POLICY "service_plan_items_insert_via_plan" ON public.service_plan_items 
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM service_plans WHERE id = plan_id AND user_id = auth.uid()));

DROP POLICY IF EXISTS "service_plan_items_update_via_plan" ON public.service_plan_items;
CREATE POLICY "service_plan_items_update_via_plan" ON public.service_plan_items 
  FOR UPDATE USING (EXISTS (SELECT 1 FROM service_plans WHERE id = plan_id AND user_id = auth.uid()));

DROP POLICY IF EXISTS "service_plan_items_delete_via_plan" ON public.service_plan_items;
CREATE POLICY "service_plan_items_delete_via_plan" ON public.service_plan_items 
  FOR DELETE USING (EXISTS (SELECT 1 FROM service_plans WHERE id = plan_id AND user_id = auth.uid()));

-- ============================================================================
-- 7.18 SERVICE ALERTS POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "service_alerts_select_own" ON public.service_alerts;
CREATE POLICY "service_alerts_select_own" ON public.service_alerts 
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "service_alerts_insert_own" ON public.service_alerts;
CREATE POLICY "service_alerts_insert_own" ON public.service_alerts 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "service_alerts_update_own" ON public.service_alerts;
CREATE POLICY "service_alerts_update_own" ON public.service_alerts 
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "service_alerts_delete_own" ON public.service_alerts;
CREATE POLICY "service_alerts_delete_own" ON public.service_alerts 
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- 7.19 TRANSPORT LINES POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "transport_lines_select_all" ON public.transport_lines;
CREATE POLICY "transport_lines_select_all" ON public.transport_lines 
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "admins_manage_transport_lines" ON public.transport_lines;
CREATE POLICY "admins_manage_transport_lines" ON public.transport_lines 
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'gestor'::app_role]));

-- ============================================================================
-- 7.20 TRANSPORT REPORTS POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "transport_reports_select_own" ON public.transport_reports;
CREATE POLICY "transport_reports_select_own" ON public.transport_reports 
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "transport_reports_insert_own" ON public.transport_reports;
CREATE POLICY "transport_reports_insert_own" ON public.transport_reports 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "transport_reports_update_own" ON public.transport_reports;
CREATE POLICY "transport_reports_update_own" ON public.transport_reports 
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "admins_manage_transport_reports" ON public.transport_reports;
CREATE POLICY "admins_manage_transport_reports" ON public.transport_reports 
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'gestor'::app_role]));

-- ============================================================================
-- 7.21 TRANSPORT REPORT RESPONSES POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "transport_responses_select_public" ON public.transport_report_responses;
CREATE POLICY "transport_responses_select_public" ON public.transport_report_responses 
  FOR SELECT USING (
    is_public = true 
    OR auth.uid() = responder_id 
    OR EXISTS (SELECT 1 FROM transport_reports WHERE id = report_id AND user_id = auth.uid())
  );

DROP POLICY IF EXISTS "admins_manage_transport_responses" ON public.transport_report_responses;
CREATE POLICY "admins_manage_transport_responses" ON public.transport_report_responses 
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'gestor'::app_role]));

-- ============================================================================
-- 7.22 TRANSPORT SUBSCRIPTIONS POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "transport_subscriptions_select_own" ON public.transport_subscriptions;
CREATE POLICY "transport_subscriptions_select_own" ON public.transport_subscriptions 
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "transport_subscriptions_insert_own" ON public.transport_subscriptions;
CREATE POLICY "transport_subscriptions_insert_own" ON public.transport_subscriptions 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "transport_subscriptions_delete_own" ON public.transport_subscriptions;
CREATE POLICY "transport_subscriptions_delete_own" ON public.transport_subscriptions 
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- 7.23 REPORT PATTERNS POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "report_patterns_select_all" ON public.report_patterns;
CREATE POLICY "report_patterns_select_all" ON public.report_patterns 
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "admins_manage_patterns" ON public.report_patterns;
CREATE POLICY "admins_manage_patterns" ON public.report_patterns 
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'gestor'::app_role]));

-- ============================================================================
-- 7.24 REPORT REFERRALS POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "report_referrals_select_own" ON public.report_referrals;
CREATE POLICY "report_referrals_select_own" ON public.report_referrals 
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "report_referrals_insert_own" ON public.report_referrals;
CREATE POLICY "report_referrals_insert_own" ON public.report_referrals 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "admins_manage_report_referrals" ON public.report_referrals;
CREATE POLICY "admins_manage_report_referrals" ON public.report_referrals 
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'gestor'::app_role, 'vereador'::app_role, 'assessor'::app_role]));

-- ============================================================================
-- 7.25 URBAN REPORTS POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "urban_reports_select_own" ON public.urban_reports;
CREATE POLICY "urban_reports_select_own" ON public.urban_reports 
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "urban_reports_select_public" ON public.urban_reports;
CREATE POLICY "urban_reports_select_public" ON public.urban_reports 
  FOR SELECT USING (status NOT IN ('rejected'));

DROP POLICY IF EXISTS "urban_reports_insert_own" ON public.urban_reports;
CREATE POLICY "urban_reports_insert_own" ON public.urban_reports 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "urban_reports_update_own" ON public.urban_reports;
CREATE POLICY "urban_reports_update_own" ON public.urban_reports 
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "admins_manage_urban_reports" ON public.urban_reports;
CREATE POLICY "admins_manage_urban_reports" ON public.urban_reports 
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'gestor'::app_role]));

-- ============================================================================
-- 7.26 URBAN REPORT LIKES POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "urban_report_likes_select_all" ON public.urban_report_likes;
CREATE POLICY "urban_report_likes_select_all" ON public.urban_report_likes 
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "urban_report_likes_insert_own" ON public.urban_report_likes;
CREATE POLICY "urban_report_likes_insert_own" ON public.urban_report_likes 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "urban_report_likes_delete_own" ON public.urban_report_likes;
CREATE POLICY "urban_report_likes_delete_own" ON public.urban_report_likes 
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- 7.27 URBAN REPORT COMMENTS POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "urban_report_comments_select_all" ON public.urban_report_comments;
CREATE POLICY "urban_report_comments_select_all" ON public.urban_report_comments 
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "urban_report_comments_insert_own" ON public.urban_report_comments;
CREATE POLICY "urban_report_comments_insert_own" ON public.urban_report_comments 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "urban_report_comments_update_own" ON public.urban_report_comments;
CREATE POLICY "urban_report_comments_update_own" ON public.urban_report_comments 
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "urban_report_comments_delete_own" ON public.urban_report_comments;
CREATE POLICY "urban_report_comments_delete_own" ON public.urban_report_comments 
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- 7.28 AI CONVERSATIONS POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "ai_conversations_select_own" ON public.ai_conversations;
CREATE POLICY "ai_conversations_select_own" ON public.ai_conversations 
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "ai_conversations_insert_own" ON public.ai_conversations;
CREATE POLICY "ai_conversations_insert_own" ON public.ai_conversations 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "ai_conversations_update_own" ON public.ai_conversations;
CREATE POLICY "ai_conversations_update_own" ON public.ai_conversations 
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "ai_conversations_delete_own" ON public.ai_conversations;
CREATE POLICY "ai_conversations_delete_own" ON public.ai_conversations 
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- 7.29 AUDIENCIAS POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "audiencias_select_all" ON public.audiencias;
CREATE POLICY "audiencias_select_all" ON public.audiencias 
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "admins_manage_audiencias" ON public.audiencias;
CREATE POLICY "admins_manage_audiencias" ON public.audiencias 
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'gestor'::app_role, 'vereador'::app_role, 'assessor'::app_role]));

-- ============================================================================
-- 7.30 AUDIENCIA INSCRICOES POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "audiencia_inscricoes_select_own" ON public.audiencia_inscricoes;
CREATE POLICY "audiencia_inscricoes_select_own" ON public.audiencia_inscricoes 
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "audiencia_inscricoes_insert_own" ON public.audiencia_inscricoes;
CREATE POLICY "audiencia_inscricoes_insert_own" ON public.audiencia_inscricoes 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "audiencia_inscricoes_delete_own" ON public.audiencia_inscricoes;
CREATE POLICY "audiencia_inscricoes_delete_own" ON public.audiencia_inscricoes 
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "admins_manage_inscricoes" ON public.audiencia_inscricoes;
CREATE POLICY "admins_manage_inscricoes" ON public.audiencia_inscricoes 
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'gestor'::app_role]));

-- ============================================================================
-- 7.31 NOTICIAS POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "noticias_select_all" ON public.noticias;
CREATE POLICY "noticias_select_all" ON public.noticias 
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "admins_manage_noticias" ON public.noticias;
CREATE POLICY "admins_manage_noticias" ON public.noticias 
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'gestor'::app_role]));

-- ============================================================================
-- 7.32 CACHE TABLES POLICIES (Public Read)
-- ============================================================================
DROP POLICY IF EXISTS "news_cache_select_all" ON public.news_cache;
CREATE POLICY "news_cache_select_all" ON public.news_cache 
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "council_members_cache_select_all" ON public.council_members_cache;
CREATE POLICY "council_members_cache_select_all" ON public.council_members_cache 
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "agenda_cache_select_all" ON public.agenda_cache;
CREATE POLICY "agenda_cache_select_all" ON public.agenda_cache 
  FOR SELECT USING (true);

-- ============================================================================
-- 7.33 COUNCIL MEMBER REFERRALS POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "council_member_referrals_select_own" ON public.council_member_referrals;
CREATE POLICY "council_member_referrals_select_own" ON public.council_member_referrals 
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "council_member_referrals_insert_own" ON public.council_member_referrals;
CREATE POLICY "council_member_referrals_insert_own" ON public.council_member_referrals 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "admins_manage_council_referrals" ON public.council_member_referrals;
CREATE POLICY "admins_manage_council_referrals" ON public.council_member_referrals 
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'gestor'::app_role, 'vereador'::app_role, 'assessor'::app_role]));

-- ============================================================================
-- 7.34 DASHBOARDS POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "dashboards_select_own_or_public" ON public.dashboards;
CREATE POLICY "dashboards_select_own_or_public" ON public.dashboards 
  FOR SELECT USING (auth.uid() = user_id OR (is_public = true AND is_approved = true));

DROP POLICY IF EXISTS "dashboards_insert_own" ON public.dashboards;
CREATE POLICY "dashboards_insert_own" ON public.dashboards 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "dashboards_update_own" ON public.dashboards;
CREATE POLICY "dashboards_update_own" ON public.dashboards 
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "dashboards_delete_own" ON public.dashboards;
CREATE POLICY "dashboards_delete_own" ON public.dashboards 
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "admins_manage_dashboards" ON public.dashboards;
CREATE POLICY "admins_manage_dashboards" ON public.dashboards 
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'gestor'::app_role]));

-- ============================================================================
-- 7.35 EXPORT LOGS POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "export_logs_select_own" ON public.export_logs;
CREATE POLICY "export_logs_select_own" ON public.export_logs 
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "export_logs_insert_own" ON public.export_logs;
CREATE POLICY "export_logs_insert_own" ON public.export_logs 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "admins_select_all_exports" ON public.export_logs;
CREATE POLICY "admins_select_all_exports" ON public.export_logs 
  FOR SELECT USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'gestor'::app_role]));

-- ============================================================================
-- 7.36 AUDIT LOGS POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "audit_logs_select_admins" ON public.audit_logs;
CREATE POLICY "audit_logs_select_admins" ON public.audit_logs 
  FOR SELECT USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'gestor'::app_role]));

-- ============================================================================
-- 7.37 SEARCH HISTORY POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "search_history_select_own" ON public.search_history;
CREATE POLICY "search_history_select_own" ON public.search_history 
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "search_history_insert_own" ON public.search_history;
CREATE POLICY "search_history_insert_own" ON public.search_history 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "search_history_delete_own" ON public.search_history;
CREATE POLICY "search_history_delete_own" ON public.search_history 
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- 7.38 KNOWLEDGE BASE POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "knowledge_base_select_all" ON public.knowledge_base;
CREATE POLICY "knowledge_base_select_all" ON public.knowledge_base 
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "admins_manage_knowledge_base" ON public.knowledge_base;
CREATE POLICY "admins_manage_knowledge_base" ON public.knowledge_base 
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'gestor'::app_role]));

-- ============================================================================
-- 7.39 N8N SETTINGS POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "n8n_settings_select_admins" ON public.n8n_settings;
CREATE POLICY "n8n_settings_select_admins" ON public.n8n_settings 
  FOR SELECT USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'gestor'::app_role]));

DROP POLICY IF EXISTS "n8n_settings_manage_admins" ON public.n8n_settings;
CREATE POLICY "n8n_settings_manage_admins" ON public.n8n_settings 
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================================
-- 7.40 N8N INTEGRATION LOGS POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "n8n_logs_select_admins" ON public.n8n_integration_logs;
CREATE POLICY "n8n_logs_select_admins" ON public.n8n_integration_logs 
  FOR SELECT USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'gestor'::app_role]));

-- ============================================================================
-- 7.41 SYSTEM SETTINGS POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "system_settings_select_admins" ON public.system_settings;
CREATE POLICY "system_settings_select_admins" ON public.system_settings 
  FOR SELECT USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'gestor'::app_role]));

DROP POLICY IF EXISTS "system_settings_manage_admins" ON public.system_settings;
CREATE POLICY "system_settings_manage_admins" ON public.system_settings 
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================================
-- 7.42 PROTOCOL SEQUENCES POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "protocol_sequences_select_all" ON public.protocol_sequences;
CREATE POLICY "protocol_sequences_select_all" ON public.protocol_sequences 
  FOR SELECT USING (true);

-- ============================================================================
-- 7.43 CITIZEN LEARNING PROFILE POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "citizen_learning_select_own" ON public.citizen_learning_profile;
CREATE POLICY "citizen_learning_select_own" ON public.citizen_learning_profile 
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "citizen_learning_insert_own" ON public.citizen_learning_profile;
CREATE POLICY "citizen_learning_insert_own" ON public.citizen_learning_profile 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "citizen_learning_update_own" ON public.citizen_learning_profile;
CREATE POLICY "citizen_learning_update_own" ON public.citizen_learning_profile 
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================================
-- 7.44 DYNAMIC CATEGORIES POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "dynamic_categories_select_all" ON public.dynamic_categories;
CREATE POLICY "dynamic_categories_select_all" ON public.dynamic_categories 
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "admins_manage_dynamic_categories" ON public.dynamic_categories;
CREATE POLICY "admins_manage_dynamic_categories" ON public.dynamic_categories 
  FOR ALL USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'gestor'::app_role]));

-- ============================================================================
-- 7.45 CATEGORY USAGE LOG POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "category_usage_log_insert_all" ON public.category_usage_log;
CREATE POLICY "category_usage_log_insert_all" ON public.category_usage_log 
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "category_usage_log_select_admins" ON public.category_usage_log;
CREATE POLICY "category_usage_log_select_admins" ON public.category_usage_log 
  FOR SELECT USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'gestor'::app_role]));

-- ============================================================================
-- PARTE 8: REALTIME
-- ============================================================================

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transport_report_responses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.knowledge_base;
ALTER PUBLICATION supabase_realtime ADD TABLE public.n8n_integration_logs;

-- ============================================================================
-- PARTE 9: DADOS INICIAIS
-- ============================================================================

-- 9.1 Protocol Sequences (required for generate_protocol_code)
INSERT INTO public.protocol_sequences (sequence_type, current_year, current_sequence) VALUES 
  ('urban', 2026, 0),
  ('transport', 2026, 0)
ON CONFLICT (sequence_type) DO NOTHING;

-- 9.2 Sample Transport Lines (Metro SP)
INSERT INTO public.transport_lines (line_code, line_name, line_type, regions) VALUES
  ('1-AZUL', 'Linha 1 - Azul', 'metro', ARRAY['Centro', 'Zona Norte']),
  ('2-VERDE', 'Linha 2 - Verde', 'metro', ARRAY['Centro', 'Zona Sul']),
  ('3-VERMELHA', 'Linha 3 - Vermelha', 'metro', ARRAY['Centro', 'Zona Leste']),
  ('4-AMARELA', 'Linha 4 - Amarela', 'metro', ARRAY['Centro', 'Zona Oeste']),
  ('5-LILAS', 'Linha 5 - Lilás', 'metro', ARRAY['Zona Sul']),
  ('15-PRATA', 'Linha 15 - Prata', 'metro', ARRAY['Zona Leste'])
ON CONFLICT (line_code) DO NOTHING;

-- 9.3 Sample Transport Lines (Bus SP - Example)
INSERT INTO public.transport_lines (line_code, line_name, line_type, regions) VALUES
  ('107A-10', 'Terminal Lapa - Av. Paulista', 'bus', ARRAY['Zona Oeste', 'Centro']),
  ('2019-10', 'Terminal Pinheiros - USP', 'bus', ARRAY['Zona Oeste', 'Zona Sul']),
  ('5175-10', 'Terminal Parque Dom Pedro II - Metrô Penha', 'bus', ARRAY['Centro', 'Zona Leste'])
ON CONFLICT (line_code) DO NOTHING;

-- ============================================================================
-- PARTE 10: STORAGE BUCKETS (Manual Setup Required)
-- ============================================================================
-- Execute these in Supabase Dashboard > Storage or via CLI:
--
-- CREATE BUCKET avatars (public)
-- CREATE BUCKET urban-reports (public)
--
-- Storage policies are managed in the Supabase Dashboard

-- ============================================================================
-- PARTE 11: AUTH TRIGGER (Manual Setup Required)
-- ============================================================================
-- This trigger must be created in the Supabase Dashboard > SQL Editor:
--
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
--
-- Note: This cannot be executed via standard SQL due to auth schema restrictions

-- ============================================================================
-- FIM DO DUMP
-- ============================================================================
