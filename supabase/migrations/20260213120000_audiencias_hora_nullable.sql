-- Permite hora nula quando a API SPLEGIS não envia horário (evita default 09:00 para todas).
ALTER TABLE public.audiencias
  ALTER COLUMN hora DROP NOT NULL;

COMMENT ON COLUMN public.audiencias.hora IS 'Horário de início (HH:MM:SS). NULL quando a API não informa.';
