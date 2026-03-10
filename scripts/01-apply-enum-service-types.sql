-- Execute ESTE script no SQL Editor do Supabase ANTES de rodar reclassify-other-services.sql
-- Adiciona os novos valores ao enum service_type (idempotente: pode rodar mais de uma vez)
ALTER TYPE public.service_type ADD VALUE IF NOT EXISTS 'street_market';
ALTER TYPE public.service_type ADD VALUE IF NOT EXISTS 'community_center';
ALTER TYPE public.service_type ADD VALUE IF NOT EXISTS 'daycare';
ALTER TYPE public.service_type ADD VALUE IF NOT EXISTS 'park';
ALTER TYPE public.service_type ADD VALUE IF NOT EXISTS 'social_assistance';
ALTER TYPE public.service_type ADD VALUE IF NOT EXISTS 'police_station';
ALTER TYPE public.service_type ADD VALUE IF NOT EXISTS 'transit_station';
ALTER TYPE public.service_type ADD VALUE IF NOT EXISTS 'market';
ALTER TYPE public.service_type ADD VALUE IF NOT EXISTS 'city_market';
ALTER TYPE public.service_type ADD VALUE IF NOT EXISTS 'theater';
ALTER TYPE public.service_type ADD VALUE IF NOT EXISTS 'museum';
ALTER TYPE public.service_type ADD VALUE IF NOT EXISTS 'cemetery';
ALTER TYPE public.service_type ADD VALUE IF NOT EXISTS 'accessibility';
ALTER TYPE public.service_type ADD VALUE IF NOT EXISTS 'recycling_point';
ALTER TYPE public.service_type ADD VALUE IF NOT EXISTS 'fire_station';
