-- FAQs sobre estrutura e funcionamento da Câmara Municipal (busca lexical na knowledge_base + orchestrator)
-- Idempotente: não duplica pelo título

INSERT INTO public.knowledge_base (content, content_type, title, metadata)
SELECT $sql$
A Câmara Municipal de São Paulo é o Poder Legislativo do município. São 55 vereadores e vereadoras, eleitos para mandato de 4 anos. Entre as principais funções estão: elaborar e votar leis municipais; fiscalizar a Prefeitura e órgãos do Executivo; analisar e votar o orçamento; convocar e realizar audiências públicas; e representar a população nas discussões que afetam a cidade. O trabalho combina debate em comissões, votações em plenário e contato com a sociedade.
$sql$, 'faq', 'Como funciona a Câmara Municipal de São Paulo', '{"topic":"camara_funcionamento","slug":"faq-como-funciona-camara"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.knowledge_base kb WHERE kb.title = 'Como funciona a Câmara Municipal de São Paulo');

INSERT INTO public.knowledge_base (content, content_type, title, metadata)
SELECT $sql$
A Mesa Diretora é o órgão de direção da Câmara: conduz as sessões plenárias, organiza a pauta e zela pelo funcionamento da Casa. É eleita pelos próprios vereadores. A Secretaria da Mesa dá suporte administrativo e legislativo (atas, documentos, tramitação de processos no âmbito da Mesa). Em geral, a presidência representa a Câmara em cerimônias e na relação institucional com outros poderes, sempre conforme o Regimento Interno vigente.
$sql$, 'faq', 'Mesa Diretora e Secretaria da Mesa', '{"topic":"camara_funcionamento","slug":"faq-mesa-secretaria"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.knowledge_base kb WHERE kb.title = 'Mesa Diretora e Secretaria da Mesa');

INSERT INTO public.knowledge_base (content, content_type, title, metadata)
SELECT $sql$
O Plenário é onde os vereadores debatem e votam matérias em sessão pública. Há sessões ordinárias (ritmo regular da Casa) e extraordinárias (quando convocadas para temas urgentes ou pauta adicional). As votações podem ser abertas ou secretas, conforme a matéria e a lei. Muitas sessões são transmitidas ao vivo ou disponibilizadas em vídeo, para o cidadão acompanhar. A participação popular também ocorre em audiências públicas e nos canais previstos em lei e no Regimento Interno.
$sql$, 'faq', 'Plenário e sessões da Câmara', '{"topic":"camara_funcionamento","slug":"faq-plenario-sessoes"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.knowledge_base kb WHERE kb.title = 'Plenário e sessões da Câmara');

INSERT INTO public.knowledge_base (content, content_type, title, metadata)
SELECT $sql$
As comissões são grupos de vereadores que analisam projetos de lei, requerimentos e outros assuntos antes de irem ao plenário. Há comissões permanentes (ex.: Finanças, Saúde, Educação, entre outras, conforme composição da legislatura) e comissões temporárias para temas específicos. A comissão pode ouvir especialistas e a sociedade, produzir pareceres e sugerir alterações. Esse estágio ajuda a aprofundar o debate e melhorar o texto das propostas.
$sql$, 'faq', 'Comissões da Câmara e atribuições', '{"topic":"camara_funcionamento","slug":"faq-comissoes"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.knowledge_base kb WHERE kb.title = 'Comissões da Câmara e atribuições');

INSERT INTO public.knowledge_base (content, content_type, title, metadata)
SELECT $sql$
Um projeto de lei costuma tramitar assim: apresentação; despacho às comissões competentes; discussão e votação em comissão; discussão e votação em plenário em duas votações (geralmente em turnos distintos, conforme regras aplicáveis); e, se aprovado, envio ao Prefeito para sanção ou veto. O Regimento Interno da Câmara detalha prazos, requerimentos e ritos. A Procuradoria da Câmara presta consultoria jurídica à Mesa e aos órgãos da Casa sobre a legalidade dos atos legislativos.
$sql$, 'faq', 'Tramitação de projetos, Regimento e Procuradoria', '{"topic":"camara_funcionamento","slug":"faq-tramitacao-regimento"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.knowledge_base kb WHERE kb.title = 'Tramitação de projetos, Regimento e Procuradoria');
