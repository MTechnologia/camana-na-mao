-- Esvazia a tabela de audiências para nova sincronização do zero.
-- audiencia_inscricoes e audiencia_participacoes têm ON DELETE CASCADE,
-- então as linhas relacionadas são removidas ao truncar audiencias.
TRUNCATE TABLE public.audiencias CASCADE;
