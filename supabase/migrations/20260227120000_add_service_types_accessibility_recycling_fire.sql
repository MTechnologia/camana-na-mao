-- Novos service_types para camadas GeoSampa: Acessibilidade, Reciclagem/Limpeza, Bombeiros
-- Execute no SQL Editor do Supabase ou via supabase db push
-- Idempotente: ADD VALUE IF NOT EXISTS
ALTER TYPE public.service_type ADD VALUE IF NOT EXISTS 'accessibility';
ALTER TYPE public.service_type ADD VALUE IF NOT EXISTS 'recycling_point';
ALTER TYPE public.service_type ADD VALUE IF NOT EXISTS 'fire_station';
