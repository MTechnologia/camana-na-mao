-- Remove índices duplicados detectados pelo advisor de performance (duplicate_index).
-- Em cada par idêntico mantém-se um índice; quando o gêmeo é respaldado por
-- constraint UNIQUE, mantém-se a constraint e remove-se apenas o índice manual.

-- pares sem constraint (mantém o de nome mais explícito *_id / *_idx)
DROP INDEX IF EXISTS public.idx_council_referrals_user;          -- mantém idx_council_referrals_user_id
DROP INDEX IF EXISTS public.knowledge_base_content_type_idx;      -- mantém idx_knowledge_base_content_type
DROP INDEX IF EXISTS public.idx_service_ratings_service;          -- mantém idx_service_ratings_service_id
DROP INDEX IF EXISTS public.idx_service_ratings_user;             -- mantém idx_service_ratings_user_id
DROP INDEX IF EXISTS public.idx_service_visits_service;           -- mantém idx_service_visits_service_id
DROP INDEX IF EXISTS public.idx_service_visits_user;              -- mantém idx_service_visits_user_id

-- pares onde o gêmeo é UNIQUE constraint (dropa só o índice manual redundante)
DROP INDEX IF EXISTS public.idx_notification_settings_user_id_unique;        -- mantém constraint notification_settings_user_id_key
DROP INDEX IF EXISTS public.idx_user_consents_user_id_consent_type_unique;   -- mantém constraint user_consents_user_id_consent_type_key
DROP INDEX IF EXISTS public.idx_user_preferences_user_id_unique;             -- mantém constraint user_preferences_user_id_key
