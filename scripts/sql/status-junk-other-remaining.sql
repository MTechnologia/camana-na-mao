-- Linhas `other` restantes nas camadas tratadas pelo script run-delete-junk-other-batches.py
-- (deve tender a zero; poucas linhas = referenciadas em visitas/avaliacoes etc.)

SELECT source_layer, count(*)::bigint AS remaining
FROM public.public_services
WHERE service_type = 'other'::public.service_type
  AND source_layer IN (
    'quadra_viaria',
    'calcadas',
    'diagnostico_riscos',
    'cruzamentos_semaforizados',
    'diagnostico_potencialidades',
    'vaga_especial',
    'acidentes',
    'vaga_especial_estabelecimento',
    'zona_origem_destino',
    'ponto_entrega_voluntaria',
    'saude_abrangencia_ubs',
    'setor_educacional',
    'saude_cobertura_familia',
    'contagem_ciclistas',
    'hierarquia_pedestre',
    'limite_companhias_pm',
    'limite_delegacias_pc',
    'det',
    'vigilancia_saude',
    'get',
    'limite_batalhoes_pm',
    'saude_supervisao_tecnica',
    'junta_servico_militar',
    'diretoria_regional_educacao',
    'area_influencia_trem',
    'limite_comandos_pm',
    'limite_seccionais_pc',
    'saude_coordenadoria_regional',
    'area_influencia_metro',
    'restricao_mian',
    'restricao_zmrc',
    'restricao_zmrf'
  )
GROUP BY source_layer
ORDER BY remaining DESC, source_layer;
