-- ============================================================
-- CMSP Connect - Dump de DADOS das Tabelas
-- Gerado em: 2026-01-20
-- Complemento ao SUPABASE_CLOUD_DUMP.sql (estrutura)
-- ============================================================
-- IMPORTANTE: Execute este arquivo APÓS o SUPABASE_CLOUD_DUMP.sql
-- que contém a estrutura das tabelas, funções e policies.
-- ============================================================

-- ============================================================
-- 1. LINHAS DE TRANSPORTE (transport_lines)
-- ============================================================
INSERT INTO public.transport_lines (id, line_code, line_name, line_type, regions, created_at) VALUES
('9190b17e-03a8-42ad-949c-cb62b3b6ae40', 'LINHA-1-AZUL', 'Linha 1 - Azul (Jabaquara - Tucuruvi)', 'metro', ARRAY['Zona Sul', 'Centro', 'Zona Norte'], '2025-11-26 05:23:41.808226+00'),
('2e8fb9ca-65df-433f-af70-1fb4fd37f0ac', 'LINHA-2-VERDE', 'Linha 2 - Verde (Vila Prudente - Vila Madalena)', 'metro', ARRAY['Zona Leste', 'Centro', 'Zona Oeste'], '2025-11-26 05:23:41.808226+00'),
('3e51d78a-cc71-4154-9b22-e2ca4d110f74', 'LINHA-3-VERMELHA', 'Linha 3 - Vermelha (Corinthians-Itaquera - Palmeiras-Barra Funda)', 'metro', ARRAY['Zona Leste', 'Centro', 'Zona Oeste'], '2025-11-26 05:23:41.808226+00'),
('26bef097-f2ed-4d60-9de0-01cae0199e14', '8500-10', 'Terminal Sapopemba - Metrô Carrão', 'bus', ARRAY['Zona Leste'], '2025-11-26 05:23:41.808226+00'),
('c8f5b04d-b19b-4000-92e1-aa207e8eb238', '8000-10', 'Terminal Capelinha - Metrô Jabaquara', 'bus', ARRAY['Zona Sul'], '2025-11-26 05:23:41.808226+00'),
('15b1643a-3a66-4fb9-80ad-b24e4d1c387a', '6100-10', 'Terminal Lapa - Metrô Barra Funda', 'bus', ARRAY['Zona Oeste'], '2025-11-26 05:23:41.808226+00'),
('2f3aa1ac-8dc1-4beb-9b76-a15e8ce5285f', '7000-10', 'Terminal Santana - Metrô Tucuruvi', 'bus', ARRAY['Zona Norte'], '2025-11-26 05:23:41.808226+00'),
('da706436-b702-479b-8d40-538d01be6b55', '856P-10', 'Term. Lapa - Pinheiros', 'bus', ARRAY['Oeste', 'Centro'], '2025-11-26 16:28:17.627864+00'),
('225168ae-4211-454a-b21c-264f3815d38f', '177H-10', 'Term. Bandeira - Metrô Tucuruvi', 'bus', ARRAY['Centro', 'Norte'], '2025-11-26 16:28:17.627864+00'),
('c9756075-ea8f-4702-9be3-ae45327d25b1', '5174-10', 'Term. Capelinha - Metrô Saúde', 'bus', ARRAY['Sul', 'Leste'], '2025-11-26 16:28:17.627864+00'),
('34c1e30f-a937-41ac-a687-c8e06edfcdaa', 'L1-Azul', 'Linha 1 - Azul', 'metro', ARRAY['Norte', 'Sul', 'Centro'], '2025-11-26 16:28:17.627864+00'),
('e5b6b938-9823-4870-9237-f388bdd02c95', 'L3-Vermelha', 'Linha 3 - Vermelha', 'metro', ARRAY['Leste', 'Oeste', 'Centro'], '2025-11-26 16:28:17.627864+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. SERVIÇOS PÚBLICOS (public_services)
-- ============================================================
INSERT INTO public.public_services (id, name, service_type, address, district, city, state, phone, latitude, longitude, average_rating, total_ratings, created_at, updated_at) VALUES
('4e88065f-f6a2-4506-a2c8-6d50002e95ab', 'UBS Butantã', 'ubs', 'Av. Eng. Heitor Antônio Eiras Garcia, 3403', 'Butantã', 'São Paulo', 'SP', '(11) 3768-8600', -23.5776, -46.7294, 0.0, 0, '2025-11-26 05:06:54.922509+00', '2025-11-26 05:06:54.922509+00'),
('c2470df3-8bfb-4327-9c34-1fb74da6527b', 'UBS Itaim Paulista', 'ubs', 'Rua Virgínia Ferni, 81', 'Itaim Paulista', 'São Paulo', 'SP', '(11) 2282-4455', -23.5044, -46.4030, 0.0, 0, '2025-11-26 05:06:54.922509+00', '2025-11-26 05:06:54.922509+00'),
('367ba5fd-af96-41ff-8791-c55043543700', 'UBS Sapopemba', 'ubs', 'Av. Sapopemba, 9064', 'Sapopemba', 'São Paulo', 'SP', '(11) 2918-5454', -23.5967, -46.5294, 0.0, 0, '2025-11-26 05:06:54.922509+00', '2025-11-26 05:06:54.922509+00'),
('d3472636-e064-4b7c-b41c-df181c9941a6', 'UBS Cidade Tiradentes', 'ubs', 'Rua Inácio Monteiro, 6846', 'Cidade Tiradentes', 'São Paulo', 'SP', '(11) 2285-9200', -23.6017, -46.4019, 0.0, 0, '2025-11-26 05:06:54.922509+00', '2025-11-26 05:06:54.922509+00'),
('f55474a5-83cb-4296-bc4a-37bbee577a20', 'UBS Parelheiros', 'ubs', 'Rua Padre José de Oliveira Fernandes, 70', 'Parelheiros', 'São Paulo', 'SP', '(11) 5920-5810', -23.7779, -46.7000, 0.0, 0, '2025-11-26 05:06:54.922509+00', '2025-11-26 05:06:54.922509+00'),
('2074cd60-1379-4b3b-ace3-d9d6b6f71139', 'UBS Santo Amaro', 'ubs', 'Rua Isabel Schmidt, 59', 'Santo Amaro', 'São Paulo', 'SP', '(11) 5686-0811', -23.6521, -46.7099, 0.0, 0, '2025-11-26 05:06:54.922509+00', '2025-11-26 05:06:54.922509+00'),
('b960cc9b-8c07-4245-9967-374fe6ba980c', 'UBS Pinheiros', 'ubs', 'Rua Medeiros de Albuquerque, 26', 'Pinheiros', 'São Paulo', 'SP', '(11) 3813-9966', -23.5610, -46.6889, 0.0, 0, '2025-11-26 05:06:54.922509+00', '2025-11-26 05:06:54.922509+00'),
('0a01e329-cf4a-42ad-8ce5-6d29c0d7387e', 'EMEF Presidente Kennedy', 'school', 'Rua Catarina Braida, 140', 'Jardim São Luís', 'São Paulo', 'SP', '(11) 5511-7622', -23.6700, -46.7300, 0.0, 0, '2025-11-26 05:06:54.922509+00', '2025-11-26 05:06:54.922509+00'),
('e4aced95-fd8c-48a0-9c24-cafcb08444d8', 'EMEF Desembargador Amorim Lima', 'school', 'Rua Pirajussara, 85', 'Butantã', 'São Paulo', 'SP', '(11) 3768-1136', -23.5821, -46.7201, 0.0, 0, '2025-11-26 05:06:54.922509+00', '2025-11-26 05:06:54.922509+00'),
('acfadfb4-4d3d-46b3-bd58-6f9644449597', 'EMEF João Carlos da Silva Borges', 'school', 'Rua Santa Elisa, 86', 'Vila Mariana', 'São Paulo', 'SP', '(11) 5087-0348', -23.5900, -46.6400, 0.0, 0, '2025-11-26 05:06:54.922509+00', '2025-11-26 05:06:54.922509+00'),
('66df0d2a-ca70-44cc-bb20-24aab30740b5', 'EMEF Campos Sales', 'school', 'Rua Padre Adelino, 758', 'Belenzinho', 'São Paulo', 'SP', '(11) 2605-9026', -23.5411, -46.6045, 0.0, 0, '2025-11-26 05:06:54.922509+00', '2025-11-26 05:06:54.922509+00'),
('0e0e5613-764b-4360-9975-355f4cfb4319', 'EMEF Infante Dom Henrique', 'school', 'Rua Azem Abdalla Azem, 564', 'Itaim Paulista', 'São Paulo', 'SP', '(11) 2282-8424', -23.5100, -46.4100, 0.0, 0, '2025-11-26 05:06:54.922509+00', '2025-11-26 05:06:54.922509+00'),
('fb591c6c-4ba7-47ab-9dd5-b735eddcbcd5', 'EMEF Jardim Sapopemba', 'school', 'Rua Luís Stamatis, 410', 'Sapopemba', 'São Paulo', 'SP', NULL, -23.6000, -46.5350, 0.0, 0, '2025-11-26 05:06:54.922509+00', '2025-11-26 05:06:54.922509+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 3. AUDIÊNCIAS PÚBLICAS (audiencias)
-- ============================================================
INSERT INTO public.audiencias (id, titulo, tema, descricao, data, hora, local, status, link_transmissao, inscricoes_abertas, vagas_disponiveis, documentos, created_at, updated_at) VALUES
('d3692eca-42ac-457f-8964-8bce5f4cea22', 'Audiência: Saúde Pública Municipal', 'Saúde', 'Debate sobre melhorias nas UBS e hospitais municipais.', '2025-02-20', '10:00:00', 'Auditório Prestes Maia - CMSP', 'agendada', 'https://cmsp.sp.gov.br/live/saude', true, 200, '[]', '2025-11-26 16:28:17.627864+00', '2025-11-26 16:28:17.627864+00'),
('5a80e114-c356-47b9-8207-5a4f3d017195', 'Audiência: Meio Ambiente e Sustentabilidade', 'Meio Ambiente', 'Políticas de preservação ambiental e áreas verdes.', '2025-02-28', '09:00:00', 'Plenário 1º de Maio - CMSP', 'agendada', 'https://cmsp.sp.gov.br/live/ambiente', true, 180, '[]', '2025-11-26 16:28:17.627864+00', '2025-11-26 16:28:17.627864+00'),
('d199880c-1f68-48b2-91d2-f7bd82a9194b', 'Audiência: Habitação Popular', 'Habitação', 'Programas habitacionais e regularização fundiária.', '2025-03-05', '14:00:00', 'Auditório Prestes Maia - CMSP', 'agendada', 'https://cmsp.sp.gov.br/live/habitacao', true, 120, '[]', '2025-11-26 16:28:17.627864+00', '2025-11-26 16:28:17.627864+00'),
('e8894266-3164-4979-b040-4d7a9177ccae', 'Audiência: Educação e Tecnologia', 'Educação', 'Implementação de tecnologia nas escolas municipais.', '2025-12-14', '15:00:00', 'Sala Paulo Kobayashi', 'realizada', NULL, false, 100, '[]', '2025-11-26 16:28:17.627864+00', '2025-12-12 20:31:12.306972+00'),
('ab190ebf-e46e-44d8-9a02-5dac78a4e33e', 'Audiência: Mobilidade Urbana 2025', 'Mobilidade', 'Discussão sobre o plano de expansão do metrô e ciclovias na cidade de São Paulo.', '2025-12-18', '14:00:00', 'Plenário 1º de Maio - CMSP', 'agendada', 'https://cmsp.sp.gov.br/live/mobilidade', true, 150, '[]', '2025-11-26 16:28:17.627864+00', '2025-12-12 20:31:12.306972+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 4. SEQUÊNCIAS DE PROTOCOLO (protocol_sequences)
-- ============================================================
INSERT INTO public.protocol_sequences (id, sequence_type, current_year, current_sequence, updated_at) VALUES
('050f7066-4ba3-4931-b0c2-fdbda7329f1e', 'transport', 2026, 18, '2026-01-15 10:28:24.468095+00'),
('61ddd889-c01c-42a9-8966-95ca42ca9f5c', 'urban', 2026, 31, '2026-01-15 13:35:29.128886+00')
ON CONFLICT (id) DO UPDATE SET 
  current_sequence = EXCLUDED.current_sequence,
  updated_at = EXCLUDED.updated_at;

-- ============================================================
-- 5. CONFIGURAÇÕES N8N (n8n_settings)
-- ============================================================
INSERT INTO public.n8n_settings (id, webhook_url, is_connected, enabled_events, user_id, created_at, updated_at) VALUES
('373ae13a-b681-4c48-b6f4-02d222674849', 'https://n8n.anitelli.site/webhook-test/manifestações', false, 
 '[{"enabled":true,"key":"urban_report_created","label":"Novo relato urbano criado"},{"enabled":true,"key":"transport_report_created","label":"Novo relato de transporte criado"},{"enabled":true,"key":"report_critical","label":"Relato marcado como crítico"},{"enabled":false,"key":"report_resolved","label":"Relato resolvido"},{"enabled":false,"key":"pattern_detected","label":"Padrão detectado pela IA"}]'::jsonb,
 '867c1758-bdb8-4d45-b967-77aeb2dd1f47', '2025-11-27 04:20:19.973974+00', '2025-11-27 04:24:50.132535+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 6. BASE DE CONHECIMENTO (knowledge_base)
-- ============================================================
INSERT INTO public.knowledge_base (id, title, content, content_type, source_table, source_id, metadata, created_at, updated_at) VALUES
('790be288-be2e-4ee6-8138-cc84297e8c1a', 'Presidência da Câmara Municipal de São Paulo', 'O presidente da Câmara Municipal de São Paulo é o representante do Legislativo. Entre suas funções está manter a ordem dos trabalhos e fazer cumprir o Regimento Interno. A presidência coordena as sessões plenárias e representa oficialmente o Poder Legislativo municipal.', 'institucional', 'cmsp_portal', 'presidencia', '{"category": "vereadores", "url": "https://www.saopaulo.sp.leg.br/vereadores/presidencia-da-camara/"}', '2025-12-02 15:12:56.707636+00', '2025-12-02 16:58:58.152885+00'),
('b049436b-a5f5-4e5b-8f8c-60dc9831e015', 'Vereadores da Câmara Municipal de São Paulo', 'A Câmara Municipal de São Paulo possui 55 vereadores eleitos pela população paulistana. Cada vereador representa os interesses dos cidadãos e trabalha na elaboração de leis, fiscalização do Executivo e representação da população. O site permite acessar o perfil dos vereadores em exercício, informações sobre a presidência da Câmara, gabinetes (com ramais e e-mails de contato), comissões permanentes, grupos de trabalho, frentes parlamentares e lideranças partidárias.', 'institucional', 'cmsp_portal', 'vereadores', '{"category": "vereadores", "url": "https://www.saopaulo.sp.leg.br/vereadores/"}', '2025-12-02 15:12:56.900806+00', '2025-12-02 16:58:58.273283+00'),
('32e79d5f-b632-4055-bf66-f64dd06c7e66', 'Transparência da Câmara Municipal de São Paulo', 'O Portal da Transparência da Câmara Municipal de São Paulo oferece acesso a informações sobre gastos públicos, prestação de contas, contratos, licitações e outros dados de interesse público. A transparência é um princípio fundamental do Legislativo paulistano, permitindo que os cidadãos fiscalizem o uso dos recursos públicos e o trabalho dos vereadores.', 'institucional', 'cmsp_portal', 'transparencia', '{"category": "transparencia", "url": "https://www.saopaulo.sp.leg.br/transparencia/"}', '2025-12-02 15:12:57.121554+00', '2025-12-02 16:58:58.378852+00'),
('f02e0d59-2037-4b93-8edc-ffae3b4c5674', 'Biblioteca e Documentação', 'A Biblioteca da Câmara Municipal de São Paulo disponibiliza todo o universo da informação legislativa do município. É possível localizar textos na íntegra da legislação da cidade de São Paulo, com documentos de 1892 até o momento atual. O acervo inclui leis ordinárias, decretos, decretos legislativos, emendas à Lei Orgânica, atos da CMSP e resoluções.', 'institucional', 'cmsp_portal', 'biblioteca', '{"category": "institucional", "url": "https://www.saopaulo.sp.leg.br/biblioteca/"}', '2025-12-02 15:12:57.417319+00', '2025-12-02 16:58:58.487927+00'),
('a115f185-865d-4417-9e5f-700490034dee', 'Procuradoria Especial da Mulher', 'A Procuradoria Especial da Mulher é um órgão da Câmara Municipal de São Paulo dedicado ao atendimento a mulheres vítimas de violência e fiscalização de políticas públicas voltadas às mulheres. Oferece acolhimento, orientação e encaminhamento para serviços especializados.', 'institucional', 'cmsp_portal', 'procuradoria-mulher', '{"category": "institucional", "url": "https://www.saopaulo.sp.leg.br/procuradoriadamulher/"}', '2025-12-02 15:12:57.627595+00', '2025-12-02 16:58:58.612475+00'),
('47a5d0a4-588d-4a92-bf1e-58fc0af0e6e6', 'Centro de Memória da Câmara', 'O Centro de Memória da Câmara Municipal de São Paulo preserva e disponibiliza capítulos importantes da história da Câmara e da cidade de São Paulo. Inclui documentos históricos, fotografias e registros da evolução do Legislativo municipal desde sua fundação.', 'institucional', 'cmsp_portal', 'centro-memoria', '{"category": "institucional", "url": "https://www.saopaulo.sp.leg.br/memoria/"}', '2025-12-02 15:12:57.730808+00', '2025-12-02 16:58:58.720816+00'),
('daeca4f8-228e-4d5d-bf44-8fc10880f411', 'Câmara Explica', 'O programa Câmara Explica oferece explicações e informações sobre termos e funcionamento da maior Câmara Municipal da América Latina. Se você tem alguma dúvida sobre o funcionamento do Parlamento municipal, sintonize na Rede Câmara SP (canal 8.3 digital) e acompanhe o programa que explica, com detalhes, tudo o que acontece no Palácio Anchieta, sede da Câmara Municipal de São Paulo.', 'educativo', 'cmsp_portal', 'camara-explica', '{"category": "educacao", "url": "https://www.saopaulo.sp.leg.br/camara-explica/"}', '2025-12-02 15:12:56.795649+00', '2025-12-02 16:58:58.039694+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 7. INSCRIÇÕES EM AUDIÊNCIAS (audiencia_inscricoes)
-- ============================================================
INSERT INTO public.audiencia_inscricoes (id, audiencia_id, user_id, status, notified, created_at) VALUES
('2e1c59ea-7051-4785-b821-efb6b33194f0', 'ab190ebf-e46e-44d8-9a02-5dac78a4e33e', 'ab1327da-8179-40a3-9d43-eebf6337b132', 'confirmada', false, '2026-01-15 11:37:45.82443+00'),
('839d9734-4227-4a6a-8569-991c57a33e5e', '5a80e114-c356-47b9-8207-5a4f3d017195', '57a96bf3-f0a2-454f-b6c6-99358b1ef8dc', 'confirmada', false, '2026-01-15 14:01:26.887773+00'),
('50d36621-10a6-46c7-bb89-5ceebcb3902f', 'ab190ebf-e46e-44d8-9a02-5dac78a4e33e', '84e73587-0163-4140-acfd-0156e5fae899', 'confirmada', false, '2026-01-16 13:51:23.252237+00'),
('a13a5433-765e-4901-8f7b-ce2071ba0324', 'ab190ebf-e46e-44d8-9a02-5dac78a4e33e', '57a96bf3-f0a2-454f-b6c6-99358b1ef8dc', 'confirmada', false, '2026-01-16 17:47:26.669192+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 8. LIKES EM RELATOS URBANOS (urban_report_likes)
-- ============================================================
INSERT INTO public.urban_report_likes (id, report_id, user_id, created_at) VALUES
('0bc12d1e-d90a-4485-9ad9-7b4704f5a6a8', '34193bce-a044-4843-9c9a-687505772a9b', '867c1758-bdb8-4d45-b967-77aeb2dd1f47', '2025-11-26 16:48:46.372395+00'),
('0794dbe6-62f5-4fdf-8aee-f279b8ed7a58', 'add6ab19-8b81-4c84-8fe5-a84c1b093cfd', 'b247a6ae-556b-40d6-a815-08e3bf7291e6', '2025-12-30 02:02:17.943976+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 9. COMENTÁRIOS EM RELATOS URBANOS (urban_report_comments)
-- ============================================================
INSERT INTO public.urban_report_comments (id, report_id, user_id, comment_text, created_at, updated_at) VALUES
('8b9bd4b2-c34f-40b3-bc99-fcc653936fce', '98919b11-114a-4e9a-98c1-dc5b3f2c3ecf', '57a96bf3-f0a2-454f-b6c6-99358b1ef8dc', 'Teste quanto a resposta as manifestações.', '2026-01-14 17:06:43.152746+00', '2026-01-14 17:06:43.152746+00'),
('5d6ddd06-a963-404f-9a15-367d0603fc5f', '1958114d-78ca-437d-a1ac-5f0bdb4c8f22', 'ab1327da-8179-40a3-9d43-eebf6337b132', 'Resposta em manifestação para evidência em documentação', '2026-01-15 12:22:15.250974+00', '2026-01-15 12:22:15.250974+00'),
('9c919eb0-3097-462f-9ce8-5b839c506491', 'a1c57358-3750-406e-b829-4597b72b9e7a', 'ab1327da-8179-40a3-9d43-eebf6337b132', 'Resposta em manifestação para evidência em documentação', '2026-01-15 12:24:07.797955+00', '2026-01-15 12:24:07.797955+00'),
('53216f78-73da-4f79-af19-0a99f30cdbdb', 'a88d2d9a-7113-4f75-8a91-ba0f8afa92b6', '57a96bf3-f0a2-454f-b6c6-99358b1ef8dc', 'Resposta em manifestação para evidência em documentação.', '2026-01-15 14:11:18.074493+00', '2026-01-15 14:11:18.074493+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 10. ENCAMINHAMENTOS A VEREADORES (council_member_referrals)
-- ============================================================
INSERT INTO public.council_member_referrals (id, user_id, urban_report_id, council_member_id, council_member_name, council_member_party, match_score, match_reasons, citizen_message, status, created_at, updated_at) VALUES
('34280490-6272-4ba4-aacc-2ce93950cab9', '57a96bf3-f0a2-454f-b6c6-99358b1ef8dc', '98919b11-114a-4e9a-98c1-dc5b3f2c3ecf', 'ely-teruel', 'Ely Teruel', 'MDB', 55, ARRAY['Partido atua em: saude, infraestrutura', 'Palavras-chave coincidem com atuação do partido', 'Especialista em questões urbanas'], 'Teste de envaminhamento para o vereador', 'pending', '2026-01-14 17:04:12.486074+00', '2026-01-14 17:04:12.486074+00'),
('4fc401eb-5a22-4eab-903f-569ec03b1991', '84e73587-0163-4140-acfd-0156e5fae899', 'a1c57358-3750-406e-b829-4597b72b9e7a', 'ely-teruel', 'Ely Teruel', 'MDB', 55, ARRAY['Partido atua em: saude, infraestrutura', 'Palavras-chave coincidem com atuação do partido', 'Especialista em questões urbanas'], 'Ecaminhamento teste para evidência em documentação', 'pending', '2026-01-15 11:29:15.099053+00', '2026-01-15 11:29:15.099053+00'),
('a26eafda-e119-4bd7-9877-32741aef4830', 'ab1327da-8179-40a3-9d43-eebf6337b132', '1958114d-78ca-437d-a1ac-5f0bdb4c8f22', 'adrilles-jorge', 'Adrilles Jorge', 'UNIAO', 15, ARRAY['Especialista em questões urbanas'], 'Encaminhamento teste para evidência em documentação', 'pending', '2026-01-15 12:09:09.027881+00', '2026-01-15 12:09:09.027881+00'),
('5ed6b08f-11f8-4c1f-9f52-5707dfc97334', '57a96bf3-f0a2-454f-b6c6-99358b1ef8dc', 'a88d2d9a-7113-4f75-8a91-ba0f8afa92b6', 'ana-carolina-oliveira', 'Ana Carolina Oliveira', 'PODE', 15, ARRAY['Especialista em questões urbanas'], 'Encaminhamento teste para evidência em documentação', 'pending', '2026-01-15 14:04:23.7792+00', '2026-01-15 14:04:23.7792+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- OBSERVAÇÕES IMPORTANTES
-- ============================================================
-- 
-- 1. DADOS DE USUÁRIOS (profiles, user_*, etc.):
--    Não foram incluídos pois contêm dados pessoais sensíveis.
--    Os usuários devem ser criados via fluxo de autenticação.
--
-- 2. DADOS DE CACHE (council_members_cache, news_cache, agenda_cache):
--    Não foram incluídos pois são regenerados automaticamente
--    pelas edge functions ao acessar as páginas correspondentes.
--
-- 3. RELATOS (urban_reports, transport_reports):
--    Não foram incluídos pois dependem de user_ids específicos
--    que devem existir no ambiente de destino.
--
-- 4. NOTIFICAÇÕES E LOGS DE AUDITORIA:
--    Não foram incluídos pois são dados transacionais
--    que dependem de contexto específico.
--
-- 5. CONVERSAS COM IA (ai_conversations):
--    Não foram incluídas pois dependem de user_ids
--    e contêm dados de interação específicos.
--
-- ============================================================
-- Para importar dados de usuários de teste, você pode:
-- 1. Criar usuários via auth.users no Dashboard Supabase
-- 2. Os triggers criarão automaticamente profiles e preferences
-- 3. Depois, rode os inserts de dados específicos (relatos, etc.)
-- ============================================================
