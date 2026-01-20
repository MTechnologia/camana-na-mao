-- ============================================================
-- CMSP CONNECT - DUMP COMPLETO DE DADOS (DATA-ONLY)
-- Schema: public
-- Gerado em: 2026-01-20
-- ============================================================
-- Este arquivo contém APENAS os dados (INSERT statements)
-- Execute APÓS o SUPABASE_CLOUD_DUMP.sql (schema)
-- ============================================================

-- Desabilitar verificação de FK temporariamente para inserção
SET session_replication_role = replica;

-- ============================================================
-- 1. PROTOCOL_SEQUENCES (referência base)
-- ============================================================
INSERT INTO public.protocol_sequences (id, sequence_type, current_year, current_sequence, updated_at) VALUES
  ('050f7066-4ba3-4931-b0c2-fdbda7329f1e', 'transport', 2026, 18, '2026-01-15 10:28:24.468095+00'),
  ('61ddd889-c01c-42a9-8966-95ca42ca9f5c', 'urban', 2026, 31, '2026-01-15 13:35:29.128886+00')
ON CONFLICT (id) DO UPDATE SET current_sequence = EXCLUDED.current_sequence, current_year = EXCLUDED.current_year;

-- ============================================================
-- 2. TRANSPORT_LINES (referência para relatórios)
-- ============================================================
INSERT INTO public.transport_lines (id, line_code, line_name, line_type, regions, created_at) VALUES
  ('26bef097-f2ed-4d60-9de0-01cae0199e14', '8500-10', 'Terminal Sapopemba - Metrô Carrão', 'bus', ARRAY['Zona Leste'], '2025-11-26 05:23:41.808226+00'),
  ('c8f5b04d-b19b-4000-92e1-aa207e8eb238', '8000-10', 'Terminal Capelinha - Metrô Jabaquara', 'bus', ARRAY['Zona Sul'], '2025-11-26 05:23:41.808226+00'),
  ('15b1643a-3a66-4fb9-80ad-b24e4d1c387a', '6100-10', 'Terminal Lapa - Metrô Barra Funda', 'bus', ARRAY['Zona Oeste'], '2025-11-26 05:23:41.808226+00'),
  ('2f3aa1ac-8dc1-4beb-9b76-a15e8ce5285f', '7000-10', 'Terminal Santana - Metrô Tucuruvi', 'bus', ARRAY['Zona Norte'], '2025-11-26 05:23:41.808226+00'),
  ('9190b17e-03a8-42ad-949c-cb62b3b6ae40', 'LINHA-1-AZUL', 'Linha 1 - Azul (Jabaquara - Tucuruvi)', 'metro', ARRAY['Zona Sul', 'Centro', 'Zona Norte'], '2025-11-26 05:23:41.808226+00'),
  ('2e8fb9ca-65df-433f-af70-1fb4fd37f0ac', 'LINHA-2-VERDE', 'Linha 2 - Verde (Vila Prudente - Vila Madalena)', 'metro', ARRAY['Zona Leste', 'Centro', 'Zona Oeste'], '2025-11-26 05:23:41.808226+00'),
  ('3e51d78a-cc71-4154-9b22-e2ca4d110f74', 'LINHA-3-VERMELHA', 'Linha 3 - Vermelha (Corinthians-Itaquera - Palmeiras-Barra Funda)', 'metro', ARRAY['Zona Leste', 'Centro', 'Zona Oeste'], '2025-11-26 05:23:41.808226+00'),
  ('da706436-b702-479b-8d40-538d01be6b55', '856P-10', 'Term. Lapa - Pinheiros', 'bus', ARRAY['Oeste', 'Centro'], '2025-11-26 16:28:17.627864+00'),
  ('225168ae-4211-454a-b21c-264f3815d38f', '177H-10', 'Term. Bandeira - Metrô Tucuruvi', 'bus', ARRAY['Centro', 'Norte'], '2025-11-26 16:28:17.627864+00'),
  ('c9756075-ea8f-4702-9be3-ae45327d25b1', '5174-10', 'Term. Capelinha - Metrô Saúde', 'bus', ARRAY['Sul', 'Leste'], '2025-11-26 16:28:17.627864+00'),
  ('34c1e30f-a937-41ac-a687-c8e06edfcdaa', 'L1-Azul', 'Linha 1 - Azul', 'metro', ARRAY['Norte', 'Sul', 'Centro'], '2025-11-26 16:28:17.627864+00'),
  ('e5b6b938-9823-4870-9237-f388bdd02c95', 'L3-Vermelha', 'Linha 3 - Vermelha', 'metro', ARRAY['Leste', 'Oeste', 'Centro'], '2025-11-26 16:28:17.627864+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 3. PUBLIC_SERVICES (serviços públicos)
-- ============================================================
INSERT INTO public.public_services (id, name, service_type, address, district, city, state, latitude, longitude, phone, average_rating, total_ratings, created_at, updated_at) VALUES
  ('4e88065f-f6a2-4506-a2c8-6d50002e95ab', 'UBS Butantã', 'ubs', 'Av. Eng. Heitor Antônio Eiras Garcia, 3403', 'Butantã', 'São Paulo', 'SP', -23.5776000, -46.7294000, '(11) 3768-8600', 0.0, 0, '2025-11-26 05:06:54.922509+00', '2025-11-26 05:06:54.922509+00'),
  ('c2470df3-8bfb-4327-9c34-1fb74da6527b', 'UBS Itaim Paulista', 'ubs', 'Rua Virgínia Ferni, 81', 'Itaim Paulista', 'São Paulo', 'SP', -23.5044000, -46.4030000, '(11) 2282-4455', 0.0, 0, '2025-11-26 05:06:54.922509+00', '2025-11-26 05:06:54.922509+00'),
  ('367ba5fd-af96-41ff-8791-c55043543700', 'UBS Sapopemba', 'ubs', 'Av. Sapopemba, 9064', 'Sapopemba', 'São Paulo', 'SP', -23.5967000, -46.5294000, '(11) 2918-5454', 0.0, 0, '2025-11-26 05:06:54.922509+00', '2025-11-26 05:06:54.922509+00'),
  ('d3472636-e064-4b7c-b41c-df181c9941a6', 'UBS Cidade Tiradentes', 'ubs', 'Rua Inácio Monteiro, 6846', 'Cidade Tiradentes', 'São Paulo', 'SP', -23.6017000, -46.4019000, '(11) 2285-9200', 0.0, 0, '2025-11-26 05:06:54.922509+00', '2025-11-26 05:06:54.922509+00'),
  ('f55474a5-83cb-4296-bc4a-37bbee577a20', 'UBS Parelheiros', 'ubs', 'Rua Padre José de Oliveira Fernandes, 70', 'Parelheiros', 'São Paulo', 'SP', -23.7779000, -46.7000000, '(11) 5920-5810', 0.0, 0, '2025-11-26 05:06:54.922509+00', '2025-11-26 05:06:54.922509+00'),
  ('2074cd60-1379-4b3b-ace3-d9d6b6f71139', 'UBS Santo Amaro', 'ubs', 'Rua Isabel Schmidt, 59', 'Santo Amaro', 'São Paulo', 'SP', -23.6521000, -46.7099000, '(11) 5686-0811', 0.0, 0, '2025-11-26 05:06:54.922509+00', '2025-11-26 05:06:54.922509+00'),
  ('b960cc9b-8c07-4245-9967-374fe6ba980c', 'UBS Pinheiros', 'ubs', 'Rua Medeiros de Albuquerque, 26', 'Pinheiros', 'São Paulo', 'SP', -23.5610000, -46.6889000, '(11) 3813-9966', 0.0, 0, '2025-11-26 05:06:54.922509+00', '2025-11-26 05:06:54.922509+00'),
  ('0a01e329-cf4a-42ad-8ce5-6d29c0d7387e', 'EMEF Presidente Kennedy', 'school', 'Rua Catarina Braida, 140', 'Jardim São Luís', 'São Paulo', 'SP', -23.6700000, -46.7300000, '(11) 5511-7622', 0.0, 0, '2025-11-26 05:06:54.922509+00', '2025-11-26 05:06:54.922509+00'),
  ('e4aced95-fd8c-48a0-9c24-cafcb08444d8', 'EMEF Desembargador Amorim Lima', 'school', 'Rua Pirajussara, 85', 'Butantã', 'São Paulo', 'SP', -23.5821000, -46.7201000, '(11) 3768-1136', 0.0, 0, '2025-11-26 05:06:54.922509+00', '2025-11-26 05:06:54.922509+00'),
  ('acfadfb4-4d3d-46b3-bd58-6f9644449597', 'EMEF João Carlos da Silva Borges', 'school', 'Rua Santa Elisa, 86', 'Vila Mariana', 'São Paulo', 'SP', -23.5900000, -46.6400000, '(11) 5087-0348', 0.0, 0, '2025-11-26 05:06:54.922509+00', '2025-11-26 05:06:54.922509+00'),
  ('66df0d2a-ca70-44cc-bb20-24aab30740b5', 'EMEF Campos Sales', 'school', 'Rua Padre Adelino, 758', 'Belenzinho', 'São Paulo', 'SP', -23.5411000, -46.6045000, '(11) 2605-9026', 0.0, 0, '2025-11-26 05:06:54.922509+00', '2025-11-26 05:06:54.922509+00'),
  ('0e0e5613-764b-4360-9975-355f4cfb4319', 'EMEF Infante Dom Henrique', 'school', 'Rua Azem Abdalla Azem, 564', 'Itaim Paulista', 'São Paulo', 'SP', -23.5100000, -46.4100000, '(11) 2282-8424', 0.0, 0, '2025-11-26 05:06:54.922509+00', '2025-11-26 05:06:54.922509+00'),
  ('fb591c6c-4ba7-47ab-9dd5-b735eddcbcd5', 'EMEF Jardim Sapopemba', 'school', 'Rua Luís Stamatis, 410', 'Sapopemba', 'São Paulo', 'SP', -23.6000000, -46.5350000, '(11) 2919-2341', 0.0, 0, '2025-11-26 05:06:54.922509+00', '2025-11-26 05:06:54.922509+00')
ON CONFLICT (id) DO NOTHING;

-- Adicionar serviços CEU
INSERT INTO public.public_services (id, name, service_type, address, district, city, state, latitude, longitude, phone, average_rating, total_ratings, created_at, updated_at) VALUES
  ('c8e5c4ca-00ad-45b3-b927-e813bb7c44c7', 'CEU Butantã', 'ceu', 'Av. Eng. Heitor Antônio Eiras Garcia, 1870', 'Butantã', 'São Paulo', 'SP', -23.5812000, -46.7234000, '(11) 3768-0800', 0.0, 0, '2025-11-26 05:06:54.922509+00', '2025-11-26 05:06:54.922509+00'),
  ('fd89c038-0c13-48a2-a826-df89f7411bee', 'CEU Vila Atlântica', 'ceu', 'Rua Coronel Melo Oliveira, 285', 'Vila Atlântica', 'São Paulo', 'SP', -23.4900000, -46.7500000, '(11) 3981-2900', 0.0, 0, '2025-11-26 05:06:54.922509+00', '2025-11-26 05:06:54.922509+00'),
  ('85e343ee-24e6-4006-b88d-a7f8546544a1', 'CEU Cidade Tiradentes', 'ceu', 'Rua Inácio Monteiro, 6900', 'Cidade Tiradentes', 'São Paulo', 'SP', -23.6050000, -46.4050000, '(11) 2285-1100', 0.0, 0, '2025-11-26 05:06:54.922509+00', '2025-11-26 05:06:54.922509+00'),
  ('a7b77576-edc6-4ce1-a7aa-1771ee5bdc2b', 'CEU Pinheiros', 'ceu', 'Rua Butantã, 100', 'Pinheiros', 'São Paulo', 'SP', -23.5650000, -46.6920000, '(11) 3816-5500', 0.0, 0, '2025-11-26 05:06:54.922509+00', '2025-11-26 05:06:54.922509+00'),
  ('9d825b6c-d212-427d-b713-479ce5b94bb9', 'CEU Sapopemba', 'ceu', 'Av. Sapopemba, 9200', 'Sapopemba', 'São Paulo', 'SP', -23.5980000, -46.5310000, '(11) 2918-6000', 0.0, 0, '2025-11-26 05:06:54.922509+00', '2025-11-26 05:06:54.922509+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 4. AUDIENCIAS (audiências públicas)
-- ============================================================
INSERT INTO public.audiencias (id, titulo, tema, descricao, data, hora, local, status, vagas_disponiveis, inscricoes_abertas, link_transmissao, documentos, created_at, updated_at) VALUES
  ('d3692eca-42ac-457f-8964-8bce5f4cea22', 'Audiência: Saúde Pública Municipal', 'Saúde', 'Debate sobre melhorias nas UBS e hospitais municipais.', '2025-02-20', '10:00:00', 'Auditório Prestes Maia - CMSP', 'agendada', 200, true, 'https://cmsp.sp.gov.br/live/saude', '[]', '2025-11-26 16:28:17.627864+00', '2025-11-26 16:28:17.627864+00'),
  ('5a80e114-c356-47b9-8207-5a4f3d017195', 'Audiência: Meio Ambiente e Sustentabilidade', 'Meio Ambiente', 'Políticas de preservação ambiental e áreas verdes.', '2025-02-28', '09:00:00', 'Plenário 1º de Maio - CMSP', 'agendada', 180, true, 'https://cmsp.sp.gov.br/live/ambiente', '[]', '2025-11-26 16:28:17.627864+00', '2025-11-26 16:28:17.627864+00'),
  ('d199880c-1f68-48b2-91d2-f7bd82a9194b', 'Audiência: Habitação Popular', 'Habitação', 'Programas habitacionais e regularização fundiária.', '2025-03-05', '14:00:00', 'Auditório Prestes Maia - CMSP', 'agendada', 120, true, 'https://cmsp.sp.gov.br/live/habitacao', '[]', '2025-11-26 16:28:17.627864+00', '2025-11-26 16:28:17.627864+00'),
  ('e8894266-3164-4979-b040-4d7a9177ccae', 'Audiência: Educação e Tecnologia', 'Educação', 'Implementação de tecnologia nas escolas municipais.', '2025-12-14', '15:00:00', 'Sala Paulo Kobayashi', 'realizada', 100, false, NULL, '[]', '2025-11-26 16:28:17.627864+00', '2025-12-12 20:31:12.306972+00'),
  ('ab190ebf-e46e-44d8-9a02-5dac78a4e33e', 'Audiência: Mobilidade Urbana 2025', 'Mobilidade', 'Discussão sobre o plano de expansão do metrô e ciclovias na cidade de São Paulo.', '2025-12-18', '14:00:00', 'Plenário 1º de Maio - CMSP', 'agendada', 150, true, 'https://cmsp.sp.gov.br/live/mobilidade', '[]', '2025-11-26 16:28:17.627864+00', '2025-12-12 20:31:12.306972+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 5. PROFILES (perfis de usuários)
-- ============================================================
INSERT INTO public.profiles (id, full_name, phone, avatar_url, onboarding_completed_at, created_at, updated_at) VALUES
  ('c8765255-0859-4ab3-8646-e03a48c40018', 'Rodrigo Rodrigues de Andrade Alcoforado', '11985615254', NULL, NULL, '2025-11-26 11:11:15.268531+00', '2025-11-26 11:11:15.268531+00'),
  ('1cdae608-0c0e-438b-8256-3eb02890cba3', 'Luiz Cerqueira', '(00) 0000-0000', NULL, NULL, '2025-12-11 20:58:24.359883+00', '2025-12-11 20:58:24.359883+00'),
  ('aa38685f-f91f-4a4d-ac5d-544ecce4e4ee', 'João das Couves', '11999998888', NULL, NULL, '2025-12-12 00:50:59.990409+00', '2025-12-12 00:50:59.990409+00'),
  ('28321207-ea01-4420-9834-24f52ffd3215', 'Pedro Souza', '11999998888', NULL, NULL, '2025-12-12 18:39:30.740334+00', '2025-12-12 18:39:30.740334+00'),
  ('8ffcc569-395d-4b62-a0d3-386638de4df1', 'Mario Silva', '11999998888', NULL, NULL, '2025-12-15 20:21:33.962531+00', '2025-12-15 20:21:33.962531+00'),
  ('2c3e44ab-97c6-4642-948a-87456b1d05f1', 'Juliana', '00 000000000', NULL, NULL, '2025-12-18 18:42:01.396472+00', '2025-12-18 18:42:01.396472+00'),
  ('b247a6ae-556b-40d6-a815-08e3bf7291e6', 'Rodrigo Alcoforado', '11985615254', 'https://vzkwkcypkfrpfhhsghwn.supabase.co/storage/v1/object/public/avatars/b247a6ae-556b-40d6-a815-08e3bf7291e6/avatar-1765494115977.jpg', '2025-12-23 10:49:17.22+00', '2025-11-26 22:24:51.821813+00', '2025-12-23 10:49:20.5494+00'),
  ('867c1758-bdb8-4d45-b967-77aeb2dd1f47', 'Rodrigo Anitelli', '11971364162', 'https://vzkwkcypkfrpfhhsghwn.supabase.co/storage/v1/object/public/avatars/867c1758-bdb8-4d45-b967-77aeb2dd1f47/avatar-1764167452676.jpg', '2025-12-23 18:23:19.092+00', '2025-11-26 03:48:55.618902+00', '2025-12-23 18:23:19.717705+00'),
  ('c98be4a6-56ac-4227-ab4c-11478b9af070', 'Giovanna Bueno', '(11) 00000-0000', NULL, '2025-12-29 20:44:33.344+00', '2025-12-29 20:42:03.73928+00', '2025-12-29 20:44:33.48789+00'),
  ('89d50589-c283-425f-9717-a08cdeac0956', 'Manus Analista', '(11) 99999-8888', NULL, '2025-12-31 23:09:36.81+00', '2025-12-19 20:05:35.043227+00', '2025-12-31 23:09:36.911777+00'),
  ('70e17ee7-d4ab-439c-84bc-f2def4cc5972', 'Marcos', '11999999999', NULL, '2026-01-06 21:36:40.625+00', '2026-01-06 21:36:04.534872+00', '2026-01-06 21:36:38.495454+00'),
  ('862673fa-623e-4d9a-bdc3-c69ca39696a8', 'Claudia Dedeski Kuplich Moraes', '1100000000', NULL, '2026-01-08 19:11:47.29+00', '2026-01-08 19:11:07.795241+00', '2026-01-08 19:11:49.026444+00'),
  ('ab5de633-df71-4ef7-9e91-70dbd7731666', 'Clayton Dias Santos', '11000000000', NULL, '2026-01-08 19:13:51.819+00', '2026-01-08 19:13:04.459413+00', '2026-01-08 19:13:53.386985+00'),
  ('0e5793cd-532b-491c-ab60-4d83a8d52682', 'Douglas Silva da Silva', '11000000000', NULL, '2026-01-08 19:16:01.924+00', '2026-01-08 19:15:34.990031+00', '2026-01-08 19:16:03.478355+00'),
  ('2ef2e337-9d3d-4730-8cfd-ef7d36bf3bbd', 'Fernando Luis Ferreira da Silva Junior', '11000000000', NULL, '2026-01-08 19:17:41.945+00', '2026-01-08 19:16:52.022037+00', '2026-01-08 19:17:43.541753+00'),
  ('a156103a-88ac-4cae-bf34-5303dc00334c', 'Luana da Conceicao Rodrigues', '110000000000', NULL, '2026-01-08 19:20:01.994+00', '2026-01-08 19:19:38.684727+00', '2026-01-08 19:20:03.590288+00'),
  ('75a7365d-50de-4c1a-932d-6825b8e895dc', 'Marcelo da Silva de Freitas Alves', '11000000000', NULL, '2026-01-08 19:21:22.779+00', '2026-01-08 19:20:55.773882+00', '2026-01-08 19:21:24.37511+00'),
  ('3946065a-ae8a-4721-bd84-4f20c11e0d20', 'Pedro Henrique Teixeira Campanella', '11000000000', NULL, '2026-01-08 19:22:21.415+00', '2026-01-08 19:21:59.531451+00', '2026-01-08 19:22:23.016814+00'),
  ('888dc8d2-68e5-44fa-8f71-3770150e8a42', 'Stoberton Murilo Francisco', '11000000000', NULL, '2026-01-08 19:23:26.276+00', '2026-01-08 19:23:03.646555+00', '2026-01-08 19:23:27.865838+00'),
  ('8cc14e8d-d332-4d8a-90c0-1c5718892dc3', 'Talles de Alcantara Lopes', '11000000000', NULL, '2026-01-08 19:24:29.04+00', '2026-01-08 19:24:02.201273+00', '2026-01-08 19:24:30.611556+00'),
  ('086d96b7-ec1b-4bdc-953e-7648b3afdccd', 'Leandra Candida Gomes', '11000000000', NULL, '2026-01-08 19:18:53.173+00', '2026-01-08 19:18:10.408721+00', '2026-01-08 19:18:54.684614+00'),
  ('3ff16834-fdbf-4c1c-a7a2-58dfba96ead7', 'Thiago Padovan', '11947232098', NULL, '2026-01-12 19:53:10.915+00', '2026-01-12 19:51:52.295965+00', '2026-01-12 19:53:12.43972+00'),
  ('57a96bf3-f0a2-454f-b6c6-99358b1ef8dc', 'Anderson Souza', '13996523232', NULL, '2026-01-13 20:57:13.523+00', '2026-01-13 20:55:20.048379+00', '2026-01-13 20:57:15.076952+00'),
  ('e5830233-30b6-4208-bed3-0d46f299dbfd', 'Maria dos Santos', '13996523232', NULL, '2026-01-14 19:41:03.283+00', '2026-01-14 19:39:44.694215+00', '2026-01-14 19:41:04.877869+00'),
  ('84e73587-0163-4140-acfd-0156e5fae899', 'Carla Teste', '13996523232', NULL, '2026-01-14 19:48:03.183+00', '2026-01-14 19:46:29.697227+00', '2026-01-14 19:48:04.768318+00'),
  ('ab1327da-8179-40a3-9d43-eebf6337b132', 'Luciana Teste', '13996523232', NULL, '2026-01-14 19:49:21.348+00', '2026-01-14 19:47:48.667168+00', '2026-01-14 19:49:22.87936+00'),
  ('1dfc1d22-5576-4ae3-8ef5-4567908ac8fb', 'Leandro teste', '11111111111', NULL, '2026-01-19 14:35:46.606+00', '2026-01-19 14:35:11.086422+00', '2026-01-19 14:35:46.76917+00')
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone, avatar_url = EXCLUDED.avatar_url, onboarding_completed_at = EXCLUDED.onboarding_completed_at;

-- ============================================================
-- 6. USER_ROLES (papéis dos usuários)
-- ============================================================
INSERT INTO public.user_roles (id, user_id, role, created_at) VALUES
  ('227c6600-1aab-4790-b460-d1275423982f', '867c1758-bdb8-4d45-b967-77aeb2dd1f47', 'admin', '2025-11-27 05:04:24.447628+00'),
  ('3fde2856-aefd-4dc2-a62e-a00995c29706', 'b247a6ae-556b-40d6-a815-08e3bf7291e6', 'admin', '2025-11-27 15:01:49.867463+00'),
  ('64c3f694-428e-4472-9214-0a42fbbdb2e7', 'c98be4a6-56ac-4227-ab4c-11478b9af070', 'admin', '2025-12-29 21:02:06.486687+00'),
  ('99fa15de-1246-4471-abc9-f405e79cb355', 'c8765255-0859-4ab3-8646-e03a48c40018', 'cidadao', '2026-01-14 18:51:31.881804+00'),
  ('af209c25-10ec-4c30-bdf2-1402fcbd2795', '1cdae608-0c0e-438b-8256-3eb02890cba3', 'cidadao', '2026-01-14 18:51:31.881804+00'),
  ('b2be5b63-d863-44b7-86b4-5665564e2f7b', 'aa38685f-f91f-4a4d-ac5d-544ecce4e4ee', 'cidadao', '2026-01-14 18:51:31.881804+00'),
  ('43901b2c-2908-442a-a6db-73689ddb79c3', '28321207-ea01-4420-9834-24f52ffd3215', 'cidadao', '2026-01-14 18:51:31.881804+00'),
  ('3c6d2162-58c0-4831-ab68-eb97f5b4c466', '8ffcc569-395d-4b62-a0d3-386638de4df1', 'cidadao', '2026-01-14 18:51:31.881804+00'),
  ('330af17a-a01d-4744-97c3-3f90b13ea374', '2c3e44ab-97c6-4642-948a-87456b1d05f1', 'cidadao', '2026-01-14 18:51:31.881804+00'),
  ('f1558ac6-4efc-4417-94a1-df218da9ea61', '89d50589-c283-425f-9717-a08cdeac0956', 'cidadao', '2026-01-14 18:51:31.881804+00'),
  ('7ae740eb-af31-48d4-810c-cafb7bf1e8bc', '70e17ee7-d4ab-439c-84bc-f2def4cc5972', 'cidadao', '2026-01-14 18:51:31.881804+00'),
  ('1ed9e400-4dc7-4874-af64-2fd16e9940b5', '862673fa-623e-4d9a-bdc3-c69ca39696a8', 'cidadao', '2026-01-14 18:51:31.881804+00'),
  ('03deaef5-bb90-40fc-ad9e-b4c932f20b81', 'ab5de633-df71-4ef7-9e91-70dbd7731666', 'cidadao', '2026-01-14 18:51:31.881804+00'),
  ('e90187b5-fab8-4416-bda0-7c22c358f54e', '0e5793cd-532b-491c-ab60-4d83a8d52682', 'cidadao', '2026-01-14 18:51:31.881804+00'),
  ('d1cf950e-5a43-4de9-ab36-9385725b7db4', '2ef2e337-9d3d-4730-8cfd-ef7d36bf3bbd', 'cidadao', '2026-01-14 18:51:31.881804+00'),
  ('ae61191f-b253-4c22-a423-816ebbb0cbaf', 'a156103a-88ac-4cae-bf34-5303dc00334c', 'cidadao', '2026-01-14 18:51:31.881804+00'),
  ('099b8430-e5fa-4150-b605-72f457d09dcc', '75a7365d-50de-4c1a-932d-6825b8e895dc', 'cidadao', '2026-01-14 18:51:31.881804+00'),
  ('2b607f9c-85a8-4572-aaab-af63daa0a2e3', '3946065a-ae8a-4721-bd84-4f20c11e0d20', 'cidadao', '2026-01-14 18:51:31.881804+00'),
  ('3cae51ee-7579-4310-8ca3-23a2102973e7', '888dc8d2-68e5-44fa-8f71-3770150e8a42', 'cidadao', '2026-01-14 18:51:31.881804+00'),
  ('c9748288-4347-4463-b4b5-e5bd4c093e05', '8cc14e8d-d332-4d8a-90c0-1c5718892dc3', 'cidadao', '2026-01-14 18:51:31.881804+00'),
  ('9485b219-ede1-4a5b-b231-2141c4ae55e9', '086d96b7-ec1b-4bdc-953e-7648b3afdccd', 'cidadao', '2026-01-14 18:51:31.881804+00'),
  ('dff9b4d8-c2c7-4a5c-b418-384bf6ed5447', '3ff16834-fdbf-4c1c-a7a2-58dfba96ead7', 'cidadao', '2026-01-14 18:51:31.881804+00'),
  ('9f8a07a9-967a-4cbc-b810-d72ed75ff4af', '57a96bf3-f0a2-454f-b6c6-99358b1ef8dc', 'admin', '2026-01-14 19:42:02.909729+00'),
  ('94c00c59-9d78-4025-8c75-fa0621f5a086', '84e73587-0163-4140-acfd-0156e5fae899', 'cidadao_engajado', '2026-01-14 20:15:42.851614+00'),
  ('babca50a-3126-4827-8a65-a850dff44d49', 'ab1327da-8179-40a3-9d43-eebf6337b132', 'gestor', '2026-01-14 20:16:36.498286+00'),
  ('a2687228-2841-4111-be41-173afec8d9c3', 'e5830233-30b6-4208-bed3-0d46f299dbfd', 'cidadao', '2026-01-15 14:29:48.587254+00'),
  ('4b1ab38e-cdc3-48bd-a63f-b413f58cb99f', 'e5830233-30b6-4208-bed3-0d46f299dbfd', 'assessor', '2026-01-15 14:29:48.587254+00'),
  ('3a0a5231-9fb2-4c15-8c57-85b3e7f04bd6', '1dfc1d22-5576-4ae3-8ef5-4567908ac8fb', 'cidadao', '2026-01-19 14:35:41.729831+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 7. USER_DEMOGRAPHICS (dados demográficos)
-- ============================================================
INSERT INTO public.user_demographics (id, user_id, gender, race, social_class, birth_date, created_at, updated_at) VALUES
  ('3520dac5-4adf-42bd-9513-5d2bc576df46', '867c1758-bdb8-4d45-b967-77aeb2dd1f47', 'masculino', 'branca', 'B', NULL, '2025-11-26 16:32:39.922223+00', '2025-11-26 16:32:39.922223+00'),
  ('38ee2653-21d1-46ed-bac8-a2fff78d19bb', 'aa38685f-f91f-4a4d-ac5d-544ecce4e4ee', 'masculino', 'branca', 'AB', '1987-01-01', '2025-12-12 00:53:20.531968+00', '2025-12-12 00:53:20.531968+00'),
  ('8a8bcde0-54ae-4065-9db4-f7208fcc4e04', '8ffcc569-395d-4b62-a0d3-386638de4df1', 'masculino', 'branca', 'C', '1987-01-01', '2025-12-15 20:23:08.448722+00', '2025-12-15 20:23:08.448722+00'),
  ('2095d52d-1ded-4eac-a8d0-d6ea29ae0801', '2c3e44ab-97c6-4642-948a-87456b1d05f1', 'feminino', 'branca', 'C', '2001-01-01', '2025-12-18 18:43:15.686945+00', '2025-12-18 18:43:15.686945+00'),
  ('b03258c5-12d8-4b0b-9c40-68bea4c6b49d', 'c98be4a6-56ac-4227-ab4c-11478b9af070', 'feminino', 'branca', 'E', '1997-09-11', '2025-12-29 20:44:02.185216+00', '2025-12-29 20:44:02.185216+00'),
  ('019dcf42-53bc-4771-8fe1-9221e9782d03', '862673fa-623e-4d9a-bdc3-c69ca39696a8', 'feminino', NULL, NULL, NULL, '2026-01-08 19:11:45.694917+00', '2026-01-08 19:11:45.694917+00'),
  ('d6a27aeb-e18b-4202-9054-004782b45be2', 'ab5de633-df71-4ef7-9e91-70dbd7731666', 'masculino', NULL, NULL, NULL, '2026-01-08 19:13:50.794572+00', '2026-01-08 19:13:50.794572+00'),
  ('df983b02-65b7-4189-8049-11629325b30f', '0e5793cd-532b-491c-ab60-4d83a8d52682', 'masculino', NULL, NULL, NULL, '2026-01-08 19:16:00.951406+00', '2026-01-08 19:16:00.951406+00'),
  ('492480b4-a906-4cdf-a826-1ad5f9d3d22d', '2ef2e337-9d3d-4730-8cfd-ef7d36bf3bbd', 'masculino', NULL, NULL, NULL, '2026-01-08 19:17:41.086779+00', '2026-01-08 19:17:41.086779+00'),
  ('87d0bdae-526a-4753-8db2-683343c479a8', '086d96b7-ec1b-4bdc-953e-7648b3afdccd', 'feminino', NULL, NULL, NULL, '2026-01-08 19:18:50.157414+00', '2026-01-08 19:18:50.157414+00'),
  ('25abcf4e-922b-4d50-ab1a-47af124ba55f', 'a156103a-88ac-4cae-bf34-5303dc00334c', 'masculino', NULL, NULL, NULL, '2026-01-08 19:20:01.219273+00', '2026-01-08 19:20:01.219273+00'),
  ('3b489d93-0726-4dd7-893c-8a0d13797bef', '75a7365d-50de-4c1a-932d-6825b8e895dc', 'masculino', NULL, NULL, NULL, '2026-01-08 19:21:20.752277+00', '2026-01-08 19:21:20.752277+00'),
  ('656f38e3-741d-4687-9b36-aa8bd601c4b1', '3946065a-ae8a-4721-bd84-4f20c11e0d20', 'masculino', NULL, NULL, NULL, '2026-01-08 19:22:18.596476+00', '2026-01-08 19:22:18.596476+00'),
  ('30152e55-52de-4955-a27c-c6f5709f9520', '888dc8d2-68e5-44fa-8f71-3770150e8a42', 'masculino', NULL, NULL, NULL, '2026-01-08 19:23:24.930735+00', '2026-01-08 19:23:24.930735+00'),
  ('98b42244-d067-4f9f-981c-1a9a70f3459a', '8cc14e8d-d332-4d8a-90c0-1c5718892dc3', 'masculino', NULL, NULL, NULL, '2026-01-08 19:24:26.643971+00', '2026-01-08 19:24:26.643971+00'),
  ('e0c66208-b15d-41c9-aaf2-e4489ee86b2f', '3ff16834-fdbf-4c1c-a7a2-58dfba96ead7', 'masculino', 'branca', 'AB', '1980-06-11', '2026-01-12 19:53:08.870459+00', '2026-01-12 19:53:08.870459+00'),
  ('e4ab445d-8196-47a5-85ac-a209a4fd0925', '57a96bf3-f0a2-454f-b6c6-99358b1ef8dc', 'masculino', 'branca', 'AB', '1990-07-29', '2026-01-13 20:57:12.257271+00', '2026-01-13 20:57:12.257271+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 8. USER_ADDRESSES (endereços)
-- ============================================================
INSERT INTO public.user_addresses (id, user_id, street, number, complement, neighborhood, city, state, zip_code, is_primary, latitude, longitude, created_at, updated_at) VALUES
  ('c20cb80b-5c46-4aef-b6be-f6a3f3485339', '867c1758-bdb8-4d45-b967-77aeb2dd1f47', 'Rua Brésser', '440', NULL, 'Parque Erasmo Assunção', 'Santo André', 'SP', '09271220', true, NULL, NULL, '2025-11-27 13:35:42.498996+00', '2025-11-27 13:35:42.498996+00'),
  ('d48e97df-32b9-46f8-95ae-a82ab26723cc', 'aa38685f-f91f-4a4d-ac5d-544ecce4e4ee', 'Rua José Ramon Urtiza', '', NULL, 'Vila Andrade', 'São Paulo', 'SP', '05717270', true, NULL, NULL, '2025-12-12 00:53:20.856233+00', '2025-12-12 00:53:20.856233+00'),
  ('77005472-f3b8-4762-a98a-1407cd19effc', '8ffcc569-395d-4b62-a0d3-386638de4df1', 'Rua José Ramon Urtiza', '', NULL, 'Vila Andrade', 'São Paulo', 'SP', '05717270', true, NULL, NULL, '2025-12-15 20:23:09.004978+00', '2025-12-15 20:23:09.004978+00'),
  ('914421a9-7731-49f3-98d1-f46d82484316', '2c3e44ab-97c6-4642-948a-87456b1d05f1', 'Rua Brésser', '', NULL, 'Parque Erasmo Assunção', 'Santo André', 'SP', '09271220', true, NULL, NULL, '2025-12-18 18:43:16.318792+00', '2025-12-18 18:43:16.318792+00'),
  ('affd833e-67cc-48a8-a9e2-d6d157612a7c', 'c98be4a6-56ac-4227-ab4c-11478b9af070', 'Rua Salvador D''Agostinho', '', NULL, 'Jardim Rosa de Franca', 'Guarulhos', 'SP', '07081310', true, NULL, NULL, '2025-12-29 20:44:02.520982+00', '2025-12-29 20:44:02.520982+00'),
  ('c2c47973-6d03-49ad-8ffe-0fed29434c10', '3ff16834-fdbf-4c1c-a7a2-58dfba96ead7', 'Rua Miníades', '', NULL, 'Jardim dos Álamos', 'São Paulo', 'SP', '04883060', true, NULL, NULL, '2026-01-12 19:53:10.133556+00', '2026-01-12 19:53:10.133556+00'),
  ('07ccb2a5-3b02-4d4a-a475-ab5c2f1557a1', '57a96bf3-f0a2-454f-b6c6-99358b1ef8dc', 'Rua Irmãos Demasi', '', NULL, 'Boqueirão', 'Praia Grande', 'SP', '11701270', true, NULL, NULL, '2026-01-13 20:57:12.738879+00', '2026-01-13 20:57:12.738879+00'),
  ('5630edbb-2be9-4bbe-8c61-2d17608e3eb7', 'e5830233-30b6-4208-bed3-0d46f299dbfd', 'Rua Irmãos Demasi', '', NULL, 'Boqueirão', 'Praia Grande', 'SP', '11701270', true, NULL, NULL, '2026-01-14 19:41:02.51385+00', '2026-01-14 19:41:02.51385+00'),
  ('5ba7a0fa-ca97-44cb-8426-3c9f60703237', '84e73587-0163-4140-acfd-0156e5fae899', 'Rua Irmãos Demasi', '', NULL, 'Boqueirão', 'Praia Grande', 'SP', '11701270', true, NULL, NULL, '2026-01-14 19:48:02.383321+00', '2026-01-14 19:48:02.383321+00'),
  ('6a8cc142-3642-4c19-83b4-73bcfb8f31ab', 'ab1327da-8179-40a3-9d43-eebf6337b132', 'Rua Irmãos Demasi', '', NULL, 'Boqueirão', 'Praia Grande', 'SP', '11701270', true, NULL, NULL, '2026-01-14 19:49:20.597561+00', '2026-01-14 19:49:20.597561+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 9. AUDIENCIA_INSCRICOES (inscrições em audiências)
-- ============================================================
INSERT INTO public.audiencia_inscricoes (id, audiencia_id, user_id, status, notified, created_at) VALUES
  ('2e1c59ea-7051-4785-b821-efb6b33194f0', 'ab190ebf-e46e-44d8-9a02-5dac78a4e33e', 'ab1327da-8179-40a3-9d43-eebf6337b132', 'confirmada', false, '2026-01-15 11:37:45.82443+00'),
  ('839d9734-4227-4a6a-8569-991c57a33e5e', '5a80e114-c356-47b9-8207-5a4f3d017195', '57a96bf3-f0a2-454f-b6c6-99358b1ef8dc', 'confirmada', false, '2026-01-15 14:01:26.887773+00'),
  ('50d36621-10a6-46c7-bb89-5ceebcb3902f', 'ab190ebf-e46e-44d8-9a02-5dac78a4e33e', '84e73587-0163-4140-acfd-0156e5fae899', 'confirmada', false, '2026-01-16 13:51:23.252237+00'),
  ('a13a5433-765e-4901-8f7b-ce2071ba0324', 'ab190ebf-e46e-44d8-9a02-5dac78a4e33e', '57a96bf3-f0a2-454f-b6c6-99358b1ef8dc', 'confirmada', false, '2026-01-16 17:47:26.669192+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 10. TRANSPORT_REPORTS (relatos de transporte)
-- ============================================================
INSERT INTO public.transport_reports (id, user_id, line_id, line_code_custom, report_type, description, location, occurrence_date, occurrence_time, severity, status, protocol_code, ai_category, ai_sentiment, ai_pattern_detected, n8n_processed, created_at, updated_at) VALUES
  ('a334682c-7b0a-4685-aefd-3628da0c1e00', 'c8765255-0859-4ab3-8646-e03a48c40018', NULL, '875A-10', 'superlotacao', 'Ônibus extremamente lotado no horário de pico', 'Terminal Pinheiros', '2025-01-21', '18:15:00', 'medium', 'pending', 'TRP-2025-000001', NULL, NULL, false, false, '2025-11-26 16:36:28.544526+00', '2025-12-30 16:53:22.109618+00'),
  ('47891476-49ab-409d-af0f-3440beacc0e7', 'c8765255-0859-4ab3-8646-e03a48c40018', '9190b17e-03a8-42ad-949c-cb62b3b6ae40', NULL, 'manutencao', 'Escadas rolantes fora de serviço na estação', 'Estação República', '2025-01-19', '12:00:00', 'low', 'pending', 'TRP-2025-000002', NULL, NULL, false, false, '2025-11-26 16:36:28.544526+00', '2025-12-30 16:53:22.109618+00'),
  ('977b50e0-5580-42da-b9c0-6eb49d7983ee', 'c8765255-0859-4ab3-8646-e03a48c40018', NULL, '5100-10', 'atraso', 'Ônibus não passou no horário programado', 'Av. Paulista, 1500', '2025-01-22', '07:45:00', 'high', 'pending', 'TRP-2025-000003', NULL, NULL, false, false, '2025-11-26 16:36:28.544526+00', '2025-12-30 16:53:22.109618+00'),
  ('b96c30ae-95b7-4305-bd3c-39ecea94dbfd', 'c8765255-0859-4ab3-8646-e03a48c40018', '9190b17e-03a8-42ad-949c-cb62b3b6ae40', NULL, 'limpeza', 'Vagão do metrô com lixo acumulado', 'Linha 1-Azul', '2025-01-23', '14:20:00', 'medium', 'pending', 'TRP-2025-000004', NULL, NULL, false, false, '2025-11-26 16:36:28.544526+00', '2025-12-30 16:53:22.109618+00'),
  ('b3b900f5-2614-4eab-8009-d2a2e7262609', 'c8765255-0859-4ab3-8646-e03a48c40018', '9190b17e-03a8-42ad-949c-cb62b3b6ae40', NULL, 'atraso', 'Atraso de 40 minutos no metrô devido a problemas técnicos', 'Estação Sé - Linha 1-Azul', '2025-01-20', '08:30:00', 'high', 'in_progress', 'TRP-2025-000005', NULL, NULL, false, false, '2025-11-26 16:36:28.544526+00', '2025-12-30 16:53:22.109618+00'),
  ('a0bb8dff-f552-4262-ba7f-d9992ddc6ada', 'c98be4a6-56ac-4227-ab4c-11478b9af070', NULL, 'I04', 'outro', 'Elogio ao motorista e à pontualidade da linha de ônibus I04 (SPTrans).', NULL, '2025-12-29', NULL, 'pending', 'pending', 'TRP-2025-000006', 'outro', 'neutral', false, false, '2025-12-29 20:57:06.699297+00', '2025-12-30 16:53:22.109618+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 11. URBAN_REPORTS (relatos urbanos)
-- ============================================================
INSERT INTO public.urban_reports (id, user_id, category, subcategory, description, location_address, neighborhood, street, street_number, cep, latitude, longitude, severity, status, protocol_code, risk_level, risk_types, active_consequences, ai_classification, n8n_processed, created_at, updated_at) VALUES
  ('f03945d7-27f8-48fc-b123-650bb3a2b77a', '1cdae608-0c0e-438b-8256-3eb02890cba3', 'iluminacao', 'Rua sem luz', 'Rua sem luz na Rua Paulista, número 1000.', 'Rua Paulista, 1000', NULL, NULL, NULL, NULL, NULL, NULL, 'media', 'pending', 'URB-2025-000007', NULL, '[]', '[]', '{"tool_call": true, "collected_via": "chat", "inferred_category": true, "original_data": {"category": "iluminacao", "description": "Rua sem luz na Rua Paulista, número 1000.", "location_address": "Rua Paulista, 1000", "subcategory": "Rua sem luz"}}', false, '2025-12-11 21:04:44.880367+00', '2025-12-30 16:53:22.109618+00'),
  ('f6b46dec-082e-4715-879f-1f2a59aac604', '2c3e44ab-97c6-4642-948a-87456b1d05f1', 'iluminacao', 'poste apagado', 'Falta de luz na Avenida Paulista, número 200.', 'Avenida Paulista, 200', NULL, NULL, NULL, NULL, NULL, NULL, 'media', 'pending', 'URB-2025-000009', NULL, '[]', '[]', '{"tool_call": true, "collected_via": "chat", "inferred_category": true, "original_data": {"category": "iluminacao", "description": "Falta de luz na Avenida Paulista, número 200.", "location_address": "Avenida Paulista, 200", "subcategory": "poste apagado"}}', false, '2025-12-18 18:51:22.37109+00', '2025-12-30 16:53:22.109618+00'),
  ('b42a95a6-0b88-4e74-9727-1738a3cb3a45', '89d50589-c283-425f-9717-a08cdeac0956', 'via_publica', 'buraco', 'Buraco grande e perigoso na Rua Augusta, altura do número 1500.', 'Rua Augusta, 1500', NULL, NULL, NULL, NULL, NULL, NULL, 'media', 'pending', 'URB-2025-000011', NULL, '[]', '[]', '{"tool_call": true, "collected_via": "chat", "inferred_category": true, "original_data": {"category": "via_publica", "description": "Buraco grande e perigoso na Rua Augusta, altura do número 1500.", "location_address": "Rua Augusta, 1500", "subcategory": "buraco"}}', false, '2025-12-19 20:09:34.569116+00', '2025-12-30 16:53:22.109618+00'),
  ('ee2fdbb5-bc73-460f-8786-451bc06a59d0', '867c1758-bdb8-4d45-b967-77aeb2dd1f47', 'via_publica', 'buraco', 'Buraco grande na Avenida Rebouças, número 1000, causando quebra de veículos.', 'Avenida Rebouças, 1000', NULL, NULL, NULL, NULL, NULL, NULL, 'media', 'pending', 'URB-2025-000013', NULL, '[]', '[]', '{"tool_call": true, "collected_via": "orchestrator"}', false, '2025-12-20 02:18:08.11984+00', '2025-12-30 16:53:22.109618+00'),
  ('43a412ac-b313-47fb-8c73-cea9668a3095', 'b247a6ae-556b-40d6-a815-08e3bf7291e6', 'outro', NULL, 'Fedor na rua.', 'Rua José Ramon Urtiza', NULL, NULL, NULL, NULL, NULL, NULL, 'media', 'pending', 'URB-2025-000015', NULL, '[]', '[]', '{"tool_call": true, "collected_via": "orchestrator"}', false, '2025-12-30 00:41:23.104275+00', '2025-12-30 16:53:22.109618+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 12. URBAN_REPORT_LIKES (curtidas em relatos)
-- ============================================================
INSERT INTO public.urban_report_likes (id, report_id, user_id, created_at) VALUES
  ('0bc12d1e-d90a-4485-9ad9-7b4704f5a6a8', '34193bce-a044-4843-9c9a-687505772a9b', '867c1758-bdb8-4d45-b967-77aeb2dd1f47', '2025-11-26 16:48:46.372395+00'),
  ('0794dbe6-62f5-4fdf-8aee-f279b8ed7a58', 'add6ab19-8b81-4c84-8fe5-a84c1b093cfd', 'b247a6ae-556b-40d6-a815-08e3bf7291e6', '2025-12-30 02:02:17.943976+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 13. URBAN_REPORT_COMMENTS (comentários em relatos)
-- ============================================================
INSERT INTO public.urban_report_comments (id, report_id, user_id, comment_text, created_at, updated_at) VALUES
  ('8b9bd4b2-c34f-40b3-bc99-fcc653936fce', '98919b11-114a-4e9a-98c1-dc5b3f2c3ecf', '57a96bf3-f0a2-454f-b6c6-99358b1ef8dc', 'Teste quanto a resposta as manifestações.', '2026-01-14 17:06:43.152746+00', '2026-01-14 17:06:43.152746+00'),
  ('5d6ddd06-a963-404f-9a15-367d0603fc5f', '1958114d-78ca-437d-a1ac-5f0bdb4c8f22', 'ab1327da-8179-40a3-9d43-eebf6337b132', 'Resposta em manifestação para evidência em documentação', '2026-01-15 12:22:15.250974+00', '2026-01-15 12:22:15.250974+00'),
  ('9c919eb0-3097-462f-9ce8-5b839c506491', 'a1c57358-3750-406e-b829-4597b72b9e7a', 'ab1327da-8179-40a3-9d43-eebf6337b132', 'Resposta em manifestação para evidência em documentação', '2026-01-15 12:24:07.797955+00', '2026-01-15 12:24:07.797955+00'),
  ('53216f78-73da-4f79-af19-0a99f30cdbdb', 'a88d2d9a-7113-4f75-8a91-ba0f8afa92b6', '57a96bf3-f0a2-454f-b6c6-99358b1ef8dc', 'Resposta em manifestação para evidência em documentação.', '2026-01-15 14:11:18.074493+00', '2026-01-15 14:11:18.074493+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 14. COUNCIL_MEMBER_REFERRALS (encaminhamentos para vereadores)
-- ============================================================
INSERT INTO public.council_member_referrals (id, user_id, council_member_id, council_member_name, council_member_party, urban_report_id, transport_report_id, service_rating_id, citizen_message, match_score, match_reasons, status, created_at, updated_at) VALUES
  ('34280490-6272-4ba4-aacc-2ce93950cab9', '57a96bf3-f0a2-454f-b6c6-99358b1ef8dc', 'ely-teruel', 'Ely Teruel', 'MDB', '98919b11-114a-4e9a-98c1-dc5b3f2c3ecf', NULL, NULL, 'Teste de envaminhamento para o vereador', 55, ARRAY['Partido atua em: saude, infraestrutura', 'Palavras-chave coincidem com atuação do partido', 'Especialista em questões urbanas'], 'pending', '2026-01-14 17:04:12.486074+00', '2026-01-14 17:04:12.486074+00'),
  ('4fc401eb-5a22-4eab-903f-569ec03b1991', '84e73587-0163-4140-acfd-0156e5fae899', 'ely-teruel', 'Ely Teruel', 'MDB', 'a1c57358-3750-406e-b829-4597b72b9e7a', NULL, NULL, 'Ecaminhamento teste para evidência em documentação', 55, ARRAY['Partido atua em: saude, infraestrutura', 'Palavras-chave coincidem com atuação do partido', 'Especialista em questões urbanas'], 'pending', '2026-01-15 11:29:15.099053+00', '2026-01-15 11:29:15.099053+00'),
  ('a26eafda-e119-4bd7-9877-32741aef4830', 'ab1327da-8179-40a3-9d43-eebf6337b132', 'adrilles-jorge', 'Adrilles Jorge', 'UNIAO', '1958114d-78ca-437d-a1ac-5f0bdb4c8f22', NULL, NULL, 'Encaminhamento teste para evidência em documentação', 15, ARRAY['Especialista em questões urbanas'], 'pending', '2026-01-15 12:09:09.027881+00', '2026-01-15 12:09:09.027881+00'),
  ('5ed6b08f-11f8-4c1f-9f52-5707dfc97334', '57a96bf3-f0a2-454f-b6c6-99358b1ef8dc', 'ana-carolina-oliveira', 'Ana Carolina Oliveira', 'PODE', 'a88d2d9a-7113-4f75-8a91-ba0f8afa92b6', NULL, NULL, 'Encaminhamento teste para evidência em documentação', 15, ARRAY['Especialista em questões urbanas'], 'pending', '2026-01-15 14:04:23.7792+00', '2026-01-15 14:04:23.7792+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 15. N8N_SETTINGS (configurações de integração n8n)
-- ============================================================
INSERT INTO public.n8n_settings (id, user_id, webhook_url, enabled_events, is_connected, secret_key, created_at, updated_at) VALUES
  ('373ae13a-b681-4c48-b6f4-02d222674849', '867c1758-bdb8-4d45-b967-77aeb2dd1f47', 'https://n8n.anitelli.site/webhook-test/manifestações', '[{"key": "urban_report_created", "label": "Novo relato urbano criado", "enabled": true}, {"key": "transport_report_created", "label": "Novo relato de transporte criado", "enabled": true}, {"key": "report_critical", "label": "Relato marcado como crítico", "enabled": true}, {"key": "report_resolved", "label": "Relato resolvido", "enabled": false}, {"key": "pattern_detected", "label": "Padrão detectado pela IA", "enabled": false}]', false, NULL, '2025-11-27 04:20:19.973974+00', '2025-11-27 04:24:50.132535+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 16. NOTIFICATION_SETTINGS (configurações de notificação)
-- ============================================================
INSERT INTO public.notification_settings (id, user_id, push_enabled, email_enabled, sms_enabled, newsletter_enabled, categories_enabled, max_daily_notifications, quiet_hours_start, quiet_hours_end, created_at, updated_at) VALUES
  ('c9652446-dd86-4714-a58b-5990651eb2ac', 'c8765255-0859-4ab3-8646-e03a48c40018', true, true, false, false, ARRAY['legislativa', 'servico', 'transporte', 'urbano'], 10, NULL, NULL, '2025-12-10 14:26:21.102046+00', '2025-12-10 14:26:21.102046+00'),
  ('c2566853-33c6-48f8-9573-6399aa2e3683', 'b247a6ae-556b-40d6-a815-08e3bf7291e6', true, true, false, false, ARRAY['legislativa', 'servico', 'transporte', 'urbano'], 10, NULL, NULL, '2025-12-10 14:26:21.102046+00', '2025-12-10 14:26:21.102046+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 17. EXPORT_LOGS (logs de exportação)
-- ============================================================
INSERT INTO public.export_logs (id, user_id, export_type, format, filters, row_count, status, created_at, completed_at) VALUES
  ('4ca9fdc5-3f3a-4ab8-ba69-f7fce119ff3b', 'ab1327da-8179-40a3-9d43-eebf6337b132', 'all_manifests', 'csv', '{"dateRange": null, "search": "", "severity": "all", "status": "all", "type": "all"}', 20, 'completed', '2026-01-15 13:05:11.258612+00', '2026-01-15 13:05:05.605+00'),
  ('d9ec9071-5c15-4609-a601-f1629579bdc5', 'ab1327da-8179-40a3-9d43-eebf6337b132', 'all_manifests', 'csv', '{"dateRange": null, "search": "", "severity": "all", "status": "all", "type": "all"}', 20, 'completed', '2026-01-15 13:05:43.321464+00', '2026-01-15 13:05:40.192+00'),
  ('aa8dc053-ff37-45d4-bd9d-e30241749cf0', 'ab1327da-8179-40a3-9d43-eebf6337b132', 'all', 'csv', NULL, 82, 'completed', '2026-01-15 13:10:11.273816+00', '2026-01-15 13:10:08.152+00'),
  ('504d4e8e-b2ee-4318-bc88-45542da8cbe6', 'ab1327da-8179-40a3-9d43-eebf6337b132', 'all', 'pdf', NULL, 94, 'completed', '2026-01-15 13:10:31.027138+00', '2026-01-15 13:10:27.706+00'),
  ('dc784ce9-b780-427c-86a7-25a529056e6d', '57a96bf3-f0a2-454f-b6c6-99358b1ef8dc', 'all_manifests', 'csv', '{"dateRange": null, "search": "", "severity": "all", "status": "all", "type": "all"}', 20, 'completed', '2026-01-15 14:20:10.556372+00', '2026-01-15 14:20:07.404+00'),
  ('88f772bd-d420-49f4-9994-291b28034eef', '57a96bf3-f0a2-454f-b6c6-99358b1ef8dc', 'all', 'csv', NULL, 83, 'completed', '2026-01-15 14:20:57.684247+00', '2026-01-15 14:20:54.531+00'),
  ('fd9d56ae-7fe7-49e4-92a2-0da49152f1f5', '57a96bf3-f0a2-454f-b6c6-99358b1ef8dc', 'all', 'pdf', NULL, 96, 'completed', '2026-01-15 14:21:04.073751+00', '2026-01-15 14:21:00.948+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 18. KNOWLEDGE_BASE (base de conhecimento para RAG)
-- ============================================================
INSERT INTO public.knowledge_base (id, content, content_type, title, source_id, source_table, metadata, created_at, updated_at) VALUES
  ('790be288-be2e-4ee6-8138-cc84297e8c1a', 'O presidente da Câmara Municipal de São Paulo é o representante do Legislativo. Entre suas funções está manter a ordem dos trabalhos e fazer cumprir o Regimento Interno. A presidência coordena as sessões plenárias e representa oficialmente o Poder Legislativo municipal.', 'institucional', 'Presidência da Câmara Municipal de São Paulo', 'presidencia', 'cmsp_portal', '{"category": "vereadores", "url": "https://www.saopaulo.sp.leg.br/vereadores/presidencia-da-camara/"}', '2025-12-02 15:12:56.707636+00', '2025-12-02 16:58:58.152885+00'),
  ('b049436b-a5f5-4e5b-8f8c-60dc9831e015', 'A Câmara Municipal de São Paulo possui 55 vereadores eleitos pela população paulistana. Cada vereador representa os interesses dos cidadãos e trabalha na elaboração de leis, fiscalização do Executivo e representação da população. O site permite acessar o perfil dos vereadores em exercício, informações sobre a presidência da Câmara, gabinetes (com ramais e e-mails de contato), comissões permanentes, grupos de trabalho, frentes parlamentares e lideranças partidárias.', 'institucional', 'Vereadores da Câmara Municipal de São Paulo', 'vereadores', 'cmsp_portal', '{"category": "vereadores", "url": "https://www.saopaulo.sp.leg.br/vereadores/"}', '2025-12-02 15:12:56.900806+00', '2025-12-02 16:58:58.273283+00'),
  ('32e79d5f-b632-4055-bf66-f64dd06c7e66', 'O Portal da Transparência da Câmara Municipal de São Paulo oferece acesso a informações sobre gastos públicos, prestação de contas, contratos, licitações e outros dados de interesse público. A transparência é um princípio fundamental do Legislativo paulistano, permitindo que os cidadãos fiscalizem o uso dos recursos públicos e o trabalho dos vereadores.', 'institucional', 'Transparência da Câmara Municipal de São Paulo', 'transparencia', 'cmsp_portal', '{"category": "transparencia", "url": "https://www.saopaulo.sp.leg.br/transparencia/"}', '2025-12-02 15:12:57.121554+00', '2025-12-02 16:58:58.378852+00'),
  ('f02e0d59-2037-4b93-8edc-ffae3b4c5674', 'A Biblioteca da Câmara Municipal de São Paulo disponibiliza todo o universo da informação legislativa do município. É possível localizar textos na íntegra da legislação da cidade de São Paulo, com documentos de 1892 até o momento atual. O acervo inclui leis ordinárias, decretos, decretos legislativos, emendas à Lei Orgânica, atos da CMSP e resoluções.', 'institucional', 'Biblioteca e Documentação', 'biblioteca', 'cmsp_portal', '{"category": "institucional", "url": "https://www.saopaulo.sp.leg.br/biblioteca/"}', '2025-12-02 15:12:57.417319+00', '2025-12-02 16:58:58.487927+00'),
  ('a115f185-865d-4417-9e5f-700490034dee', 'A Procuradoria Especial da Mulher é um órgão da Câmara Municipal de São Paulo dedicado ao atendimento a mulheres vítimas de violência e fiscalização de políticas públicas voltadas às mulheres. Oferece acolhimento, orientação e encaminhamento para serviços especializados.', 'institucional', 'Procuradoria Especial da Mulher', 'procuradoria-mulher', 'cmsp_portal', '{"category": "institucional", "url": "https://www.saopaulo.sp.leg.br/procuradoriadamulher/"}', '2025-12-02 15:12:57.627595+00', '2025-12-02 16:58:58.612475+00'),
  ('47a5d0a4-588d-4a92-bf1e-58fc0af0e6e6', 'O Centro de Memória da Câmara Municipal de São Paulo preserva e disponibiliza capítulos importantes da história da Câmara e da cidade de São Paulo. Inclui documentos históricos, fotografias e registros da evolução do Legislativo municipal desde sua fundação.', 'institucional', 'Centro de Memória da Câmara', 'centro-memoria', 'cmsp_portal', '{"category": "institucional", "url": "https://www.saopaulo.sp.leg.br/memoria/"}', '2025-12-02 15:12:57.730808+00', '2025-12-02 16:58:58.720816+00'),
  ('daeca4f8-228e-4d5d-bf44-8fc10880f411', 'O programa Câmara Explica oferece explicações e informações sobre termos e funcionamento da maior Câmara Municipal da América Latina. Se você tem alguma dúvida sobre o funcionamento do Parlamento municipal, sintonize na Rede Câmara SP (canal 8.3 digital) e acompanhe o programa que explica, com detalhes, tudo o que acontece no Palácio Anchieta, sede da Câmara Municipal de São Paulo.', 'educativo', 'Câmara Explica', 'camara-explica', 'cmsp_portal', '{"category": "educacao", "url": "https://www.saopaulo.sp.leg.br/camara-explica/"}', '2025-12-02 15:12:56.795649+00', '2025-12-02 16:59:00.375565+00'),
  ('ee8e4cf7-1254-4c71-862e-a8cf01e7ecf9', 'A Escola do Parlamento da Câmara Municipal de São Paulo é um centro de formação cidadã que oferece cursos, palestras e atividades educativas sobre democracia, cidadania e funcionamento do Poder Legislativo. Promove a educação política e a participação social dos cidadãos paulistanos.', 'educativo', 'Escola do Parlamento', 'escola-parlamento', 'cmsp_portal', '{"category": "educacao", "url": "https://www.saopaulo.sp.leg.br/escola-do-parlamento/"}', '2025-12-02 15:12:57.831792+00', '2025-12-02 16:59:00.480617+00')
ON CONFLICT (id) DO NOTHING;

-- Reabilitar verificação de FK
SET session_replication_role = DEFAULT;

-- ============================================================
-- FIM DO DUMP DE DADOS
-- ============================================================
