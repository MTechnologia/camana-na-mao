-- Migration 1: Add cidadao_engajado role to app_role enum
-- This must be in a separate transaction before being used in policies

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'cidadao_engajado';