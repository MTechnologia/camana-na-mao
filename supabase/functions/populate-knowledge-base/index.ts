import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Conteúdos do site da Câmara Municipal de São Paulo
const knowledgeContent = [
  // === INSTITUCIONAL ===
  {
    title: "Portal da Câmara Municipal de São Paulo",
    content: `A Câmara Municipal de São Paulo é a maior Câmara Municipal da América Latina. O Portal oferece acesso a informações sobre vereadores, atividade legislativa, transparência, participação cidadã e muito mais. A Câmara possui programas como Câmara Aberta (que abre as portas do Palácio Anchieta aos finais de semana), Câmara na Rua (que leva o Legislativo para os quatro cantos da cidade), e a Escola do Parlamento (cursos, debates e seminários voltados à educação para cidadania).`,
    content_type: "institucional",
    source_table: "cmsp_portal",
    source_id: "home",
    metadata: { url: "https://www.saopaulo.sp.leg.br/", category: "geral" }
  },
  {
    title: "Presidência da Câmara Municipal de São Paulo",
    content: `O presidente da Câmara Municipal de São Paulo é o representante do Legislativo. Entre suas funções está manter a ordem dos trabalhos e fazer cumprir o Regimento Interno. A presidência coordena as sessões plenárias e representa oficialmente o Poder Legislativo municipal.`,
    content_type: "institucional",
    source_table: "cmsp_portal",
    source_id: "presidencia",
    metadata: { url: "https://www.saopaulo.sp.leg.br/vereadores/presidencia-da-camara/", category: "vereadores" }
  },
  {
    title: "Vereadores da Câmara Municipal de São Paulo",
    content: `A Câmara Municipal de São Paulo possui 55 vereadores eleitos pela população paulistana. Cada vereador representa os interesses dos cidadãos e trabalha na elaboração de leis, fiscalização do Executivo e representação da população. O site permite acessar o perfil dos vereadores em exercício, informações sobre a presidência da Câmara, gabinetes (com ramais e e-mails de contato), comissões permanentes, grupos de trabalho, frentes parlamentares e lideranças partidárias.`,
    content_type: "institucional",
    source_table: "cmsp_portal",
    source_id: "vereadores",
    metadata: { url: "https://www.saopaulo.sp.leg.br/vereadores/", category: "vereadores" }
  },
  {
    title: "Transparência da Câmara Municipal de São Paulo",
    content: `O Portal da Transparência da Câmara Municipal de São Paulo oferece acesso a informações sobre gastos públicos, prestação de contas, contratos, licitações e outros dados de interesse público. A transparência é um princípio fundamental do Legislativo paulistano, permitindo que os cidadãos fiscalizem o uso dos recursos públicos e o trabalho dos vereadores.`,
    content_type: "institucional",
    source_table: "cmsp_portal",
    source_id: "transparencia",
    metadata: { url: "https://www.saopaulo.sp.leg.br/transparencia/", category: "transparencia" }
  },
  {
    title: "Biblioteca e Documentação",
    content: `A Biblioteca da Câmara Municipal de São Paulo disponibiliza todo o universo da informação legislativa do município. É possível localizar textos na íntegra da legislação da cidade de São Paulo, com documentos de 1892 até o momento atual. O acervo inclui leis ordinárias, decretos, decretos legislativos, emendas à Lei Orgânica, atos da CMSP e resoluções.`,
    content_type: "institucional",
    source_table: "cmsp_portal",
    source_id: "biblioteca",
    metadata: { url: "https://www.saopaulo.sp.leg.br/biblioteca/", category: "institucional" }
  },
  {
    title: "Procuradoria Especial da Mulher",
    content: `A Procuradoria Especial da Mulher é um órgão da Câmara Municipal de São Paulo dedicado ao atendimento a mulheres vítimas de violência e fiscalização de políticas públicas voltadas às mulheres. Oferece acolhimento, orientação e encaminhamento para serviços especializados.`,
    content_type: "institucional",
    source_table: "cmsp_portal",
    source_id: "procuradoria-mulher",
    metadata: { url: "https://www.saopaulo.sp.leg.br/procuradoriadamulher/", category: "institucional" }
  },
  {
    title: "Centro de Memória da Câmara",
    content: `O Centro de Memória da Câmara Municipal de São Paulo preserva e disponibiliza capítulos importantes da história da Câmara e da cidade de São Paulo. Inclui documentos históricos, fotografias e registros da evolução do Legislativo municipal desde sua fundação.`,
    content_type: "institucional",
    source_table: "cmsp_portal",
    source_id: "centro-memoria",
    metadata: { url: "https://www.saopaulo.sp.leg.br/memoria/", category: "institucional" }
  },
  {
    title: "LGPD na Câmara",
    content: `A Câmara Municipal de São Paulo segue a Lei Geral de Proteção de Dados (LGPD). O portal utiliza cookies para garantir a melhor experiência do usuário. Informações sobre a política de privacidade e uso de dados estão disponíveis na página de LGPD.`,
    content_type: "institucional",
    source_table: "cmsp_portal",
    source_id: "lgpd",
    metadata: { url: "https://www.saopaulo.sp.leg.br/lgpd", category: "institucional" }
  },
  {
    title: "Acessibilidade no Portal",
    content: `O Portal da Câmara Municipal de São Paulo oferece recursos de acessibilidade incluindo: alto contraste, ajuste de tamanho de fonte, compatibilidade com leitores de tela e plugin de acessibilidade da Hand Talk para tradução em Libras (Língua Brasileira de Sinais).`,
    content_type: "institucional",
    source_table: "cmsp_portal",
    source_id: "acessibilidade",
    metadata: { url: "https://www.saopaulo.sp.leg.br/acessibilidade-no-portal", category: "institucional" }
  },

  // === COMISSÕES PERMANENTES ===
  {
    title: "Comissão de Constituição, Justiça e Legislação Participativa (CCJ)",
    content: `A CCJ é responsável por analisar a constitucionalidade e legalidade dos projetos de lei. É uma das comissões mais importantes, por onde passam todos os projetos antes de irem ao plenário. Analisa aspectos jurídicos, formais e de técnica legislativa.`,
    content_type: "comissao",
    source_table: "cmsp_comissoes",
    source_id: "ccj",
    metadata: { category: "comissoes", tipo: "permanente" }
  },
  {
    title: "Comissão de Finanças e Orçamento (CFO)",
    content: `A Comissão de Finanças e Orçamento analisa projetos com impacto financeiro, a Lei Orçamentária Anual (LOA), Lei de Diretrizes Orçamentárias (LDO) e o Plano Plurianual (PPA). Fiscaliza a execução orçamentária do município e emite pareceres sobre viabilidade econômica.`,
    content_type: "comissao",
    source_table: "cmsp_comissoes",
    source_id: "cfo",
    metadata: { category: "comissoes", tipo: "permanente" }
  },
  {
    title: "Comissão de Política Urbana, Metropolitana e Meio Ambiente",
    content: `Analisa projetos relacionados a urbanismo, planejamento urbano, uso e ocupação do solo, meio ambiente, habitação, transporte urbano e infraestrutura. Importante para políticas de desenvolvimento sustentável da cidade.`,
    content_type: "comissao",
    source_table: "cmsp_comissoes",
    source_id: "cpumma",
    metadata: { category: "comissoes", tipo: "permanente" }
  },
  {
    title: "Comissão de Educação, Cultura e Esportes",
    content: `Responsável por analisar projetos de lei relacionados à educação municipal, cultura, esportes e lazer. Fiscaliza políticas públicas educacionais, rede municipal de ensino e equipamentos culturais e esportivos.`,
    content_type: "comissao",
    source_table: "cmsp_comissoes",
    source_id: "cece",
    metadata: { category: "comissoes", tipo: "permanente" }
  },
  {
    title: "Comissão de Saúde, Promoção Social, Trabalho e Mulher",
    content: `Analisa projetos relacionados à saúde pública, assistência social, políticas de emprego e renda, e direitos das mulheres. Fiscaliza o funcionamento de UBS, hospitais municipais e programas sociais.`,
    content_type: "comissao",
    source_table: "cmsp_comissoes",
    source_id: "cspstm",
    metadata: { category: "comissoes", tipo: "permanente" }
  },
  {
    title: "Comissão de Trânsito, Transporte, Atividade Econômica e Turismo",
    content: `Responsável por projetos sobre mobilidade urbana, transporte público, regulação de atividades econômicas, desenvolvimento econômico e turismo. Analisa questões de trânsito e infraestrutura viária.`,
    content_type: "comissao",
    source_table: "cmsp_comissoes",
    source_id: "cttaet",
    metadata: { category: "comissoes", tipo: "permanente" }
  },
  {
    title: "Comissão de Administração Pública",
    content: `Analisa projetos sobre estrutura administrativa da prefeitura, servidores públicos municipais, organização da máquina pública e modernização da gestão. Fiscaliza o funcionamento dos órgãos municipais.`,
    content_type: "comissao",
    source_table: "cmsp_comissoes",
    source_id: "cap",
    metadata: { category: "comissoes", tipo: "permanente" }
  },
  {
    title: "Comissão de Direitos Humanos, Cidadania e Relações Internacionais",
    content: `Trata de projetos sobre direitos humanos, combate à discriminação, igualdade racial, direitos LGBTQIA+, pessoas com deficiência, idosos, juventude e relações internacionais da cidade.`,
    content_type: "comissao",
    source_table: "cmsp_comissoes",
    source_id: "cdhcri",
    metadata: { category: "comissoes", tipo: "permanente" }
  },
  {
    title: "Comissão de Defesa do Consumidor",
    content: `Analisa projetos relacionados à proteção e defesa do consumidor paulistano. Fiscaliza práticas comerciais, qualidade de serviços e produtos, e atua na defesa dos direitos dos consumidores.`,
    content_type: "comissao",
    source_table: "cmsp_comissoes",
    source_id: "cdc",
    metadata: { category: "comissoes", tipo: "permanente" }
  },
  {
    title: "Comissão de Proteção dos Animais",
    content: `Responsável por analisar projetos de lei relacionados ao bem-estar animal, combate aos maus-tratos, políticas de adoção e castração, e proteção da fauna urbana.`,
    content_type: "comissao",
    source_table: "cmsp_comissoes",
    source_id: "cpa",
    metadata: { category: "comissoes", tipo: "permanente" }
  },

  // === EDUCATIVO ===
  {
    title: "Câmara Explica",
    content: `O programa Câmara Explica oferece explicações e informações sobre termos e funcionamento da maior Câmara Municipal da América Latina. Se você tem alguma dúvida sobre o funcionamento do Parlamento municipal, sintonize na Rede Câmara SP (canal 8.3 digital) e acompanhe o programa que explica, com detalhes, tudo o que acontece no Palácio Anchieta, sede da Câmara Municipal de São Paulo.`,
    content_type: "educativo",
    source_table: "cmsp_portal",
    source_id: "camara-explica",
    metadata: { url: "https://www.saopaulo.sp.leg.br/camara-explica/", category: "educacao" }
  },
  {
    title: "Escola do Parlamento",
    content: `A Escola do Parlamento da Câmara Municipal de São Paulo organiza cursos, debates e seminários voltados à educação para cidadania. Oferece cursos EAD que ensinam como funcionam as assembleias cidadãs. A escola também publica a Revista "Parlamento e Sociedade" com artigos acadêmicos sobre diferentes temas de interesse da cidade, tendo como eixo temático o campo de "Políticas Públicas e Poder Legislativo no âmbito do Município".`,
    content_type: "educativo",
    source_table: "cmsp_portal",
    source_id: "escola-parlamento",
    metadata: { url: "https://www.saopaulo.sp.leg.br/escoladoparlamento/", category: "educacao" }
  },
  {
    title: "Parlamento Jovem",
    content: `O Parlamento Jovem é um programa da Câmara Municipal de São Paulo que oferece a jovens estudantes a chance de aprender sobre cidadania e democracia, vivenciando a rotina de um vereador. Os participantes simulam sessões legislativas e aprendem sobre o processo democrático.`,
    content_type: "educativo",
    source_table: "cmsp_portal",
    source_id: "parlamento-jovem",
    metadata: { url: "https://www.saopaulo.sp.leg.br/memoria/especial/parlamento-jovem/", category: "educacao" }
  },
  {
    title: "Como funciona um Projeto de Lei",
    content: `Um Projeto de Lei (PL) na Câmara Municipal de São Paulo passa por várias etapas: apresentação pelo vereador ou cidadão (iniciativa popular), análise pelas comissões temáticas, discussão em plenário, votação, sanção ou veto do prefeito. Os cidadãos podem acompanhar a tramitação pelo sistema SP Legis.`,
    content_type: "educativo",
    source_table: "cmsp_portal",
    source_id: "como-funciona-pl",
    metadata: { category: "educacao" }
  },
  {
    title: "O que é uma Audiência Pública",
    content: `Uma audiência pública é uma reunião aberta à população onde são debatidos temas de interesse coletivo. Qualquer cidadão pode participar, se inscrever para falar e apresentar suas opiniões. As audiências são convocadas por comissões ou vereadores para discutir projetos de lei ou políticas públicas antes de serem votados.`,
    content_type: "educativo",
    source_table: "cmsp_portal",
    source_id: "o-que-e-audiencia",
    metadata: { category: "educacao" }
  },
  {
    title: "Como participar da Câmara",
    content: `Existem várias formas de participar da Câmara Municipal de São Paulo: assistir às sessões plenárias (presencialmente ou online), participar de audiências públicas, enviar sugestões de projetos de lei, acompanhar o trabalho dos vereadores, visitar o Palácio Anchieta pelo programa Câmara Aberta, e fazer denúncias ou sugestões pela Ouvidoria.`,
    content_type: "educativo",
    source_table: "cmsp_portal",
    source_id: "como-participar",
    metadata: { category: "educacao" }
  },

  // === LEGISLATIVO ===
  {
    title: "Atividade Legislativa",
    content: `A atividade legislativa da Câmara Municipal de São Paulo inclui a tramitação de projetos de lei, emendas à Lei Orgânica, decretos legislativos e resoluções. Os cidadãos podem acompanhar projetos em tramitação, votações, sessões plenárias e trabalhos das comissões. O sistema SP Legis permite consultar todos os projetos e normas municipais. Os tipos de projetos incluem: Projeto de Lei, Projeto de Emenda à Lei Orgânica, Projeto de Decreto Legislativo e Projeto de Resolução.`,
    content_type: "legislativo",
    source_table: "cmsp_portal",
    source_id: "atividade-legislativa",
    metadata: { url: "https://www.saopaulo.sp.leg.br/atividade-legislativa/", category: "legislativo" }
  },
  {
    title: "Portal da Legislação Paulistana",
    content: `O Portal da Legislação Paulistana permite pesquisar leis, decretos e outras normas municipais de São Paulo. Os tipos de normas incluem: Lei Ordinária, Decreto, Decreto Legislativo, Decreto-Lei, Emenda à Lei Orgânica, Ato da CMSP, Resolução da CMSP, entre outros. É possível buscar por número e ano de promulgação.`,
    content_type: "legislativo",
    source_table: "cmsp_portal",
    source_id: "legislacao-paulistana",
    metadata: { url: "https://plpconsulta.saopaulo.sp.leg.br/", category: "legislativo" }
  },

  // === LEGISLAÇÃO URBANA / ZONEAMENTO ===
  {
    title: "Zoneamento e LPUOS em São Paulo",
    content: `O zoneamento de São Paulo é regulado pela Lei de Parcelamento, Uso e Ocupação do Solo (LPUOS - Lei 16.402/2016, com revisões pelas Leis 18.081/2024 e 18.177/2024). A LPUOS define o que pode ser construído ou reformado em cada imóvel da cidade, incluindo coeficiente de aproveitamento (CA), taxa de ocupação (TO), recuos e usos permitidos por zona (ZEIS, ZC, ZEP, ZER, etc.). Para consultar o zoneamento de um endereço, o cidadão pode acessar o SISZON (https://consultasiszon.prefeitura.sp.gov.br) ou o GeoSampa (https://geosampa.prefeitura.sp.gov.br). A legenda do zoneamento e a documentação completa estão disponíveis na Secretaria Municipal de Urbanismo e Licenciamento (SMUL): https://www.prefeitura.sp.gov.br/web/licenciamento/w/legislacao/288079`,
    content_type: "legislativo",
    source_table: "cmsp_portal",
    source_id: "zoneamento-lpuos",
    metadata: { url: "https://www.prefeitura.sp.gov.br/web/licenciamento/w/legislacao/288079", category: "urbanismo" }
  },
  {
    title: "Orçamento Municipal 2026",
    content: `A Câmara Municipal de São Paulo analisa e aprova o orçamento municipal. O hotsite do Orçamento 2026 permite aos cidadãos conhecer a Lei Orçamentária Anual (LOA 2026) e o Plano Plurianual (PPA 2026-2029). Os cidadãos podem participar, opinar e transformar o orçamento da cidade.`,
    content_type: "legislativo",
    source_table: "cmsp_portal",
    source_id: "orcamento-2026",
    metadata: { url: "https://www.saopaulo.sp.leg.br/orcamento2026/", category: "legislativo" }
  },

  // === PARTICIPAÇÃO ===
  {
    title: "Audiências Públicas",
    content: `As audiências públicas são espaços de participação cidadã onde a população pode opinar sobre projetos de lei, políticas públicas e temas de interesse coletivo. A Câmara Municipal de São Paulo realiza audiências públicas regularmente, permitindo que os cidadãos se inscrevam e participem presencialmente ou online. A agenda de audiências públicas está disponível no portal da Câmara.`,
    content_type: "participacao",
    source_table: "cmsp_portal",
    source_id: "audiencias-publicas",
    metadata: { url: "https://www.saopaulo.sp.leg.br/audienciaspublicas/", category: "participacao" }
  },
  {
    title: "Câmara Aberta",
    content: `O projeto Câmara Aberta abre as portas do Palácio Anchieta, sede da Câmara Municipal de São Paulo, aos finais de semana para visitação pública. Os cidadãos podem conhecer a história e a arquitetura do prédio, além de aprender sobre o funcionamento do Legislativo municipal.`,
    content_type: "participacao",
    source_table: "cmsp_portal",
    source_id: "camara-aberta",
    metadata: { url: "https://www.saopaulo.sp.leg.br/camaraaberta/", category: "participacao" }
  },
  {
    title: "Fale com a Ouvidoria",
    content: `A Ouvidoria da Câmara Municipal de São Paulo é o canal para dúvidas, reclamações e manifestações que necessitem de respostas. Os cidadãos podem entrar em contato através do portal para reportar problemas ou dar sugestões sobre o funcionamento do Legislativo.`,
    content_type: "participacao",
    source_table: "cmsp_portal",
    source_id: "ouvidoria",
    metadata: { url: "https://www.saopaulo.sp.leg.br/fale-conosco/telefones/", category: "participacao" }
  },
  {
    title: "Iniciativa Popular de Lei",
    content: `A iniciativa popular permite que cidadãos apresentem projetos de lei diretamente à Câmara. Em São Paulo, é necessário coletar assinaturas de 5% do eleitorado municipal (aproximadamente 450 mil assinaturas). A Câmara também aceita sugestões legislativas através de canais digitais que podem ser adotadas por vereadores.`,
    content_type: "participacao",
    source_table: "cmsp_portal",
    source_id: "iniciativa-popular",
    metadata: { category: "participacao" }
  },

  // === COMUNICAÇÃO ===
  {
    title: "Rede Câmara SP",
    content: `A Rede Câmara SP é a comunicação oficial da Câmara Municipal de São Paulo, integrando Portal, Web Rádio e TV (canal 8.3 digital). Oferece transmissão ao vivo de sessões plenárias, audiências públicas e eventos. Também disponibiliza vídeos e áudios de atividades parlamentares.`,
    content_type: "comunicacao",
    source_table: "cmsp_portal",
    source_id: "rede-camara",
    metadata: { url: "https://www.saopaulo.sp.leg.br/redecamara/", category: "comunicacao" }
  },

  // === NOTÍCIAS RECENTES ===
  {
    title: "Câmara aprova Orçamento de São Paulo para 2025",
    content: `A Câmara Municipal de São Paulo aprovou em dezembro de 2024 o Orçamento do município para 2025, no valor de R$ 115 bilhões. O orçamento prevê investimentos em saúde, educação, transporte e habitação. As emendas parlamentares foram distribuídas entre os vereadores para aplicação em suas bases eleitorais.`,
    content_type: "noticia",
    source_table: "cmsp_noticias",
    source_id: "orcamento-2025",
    metadata: { data: "2024-12", category: "noticias" }
  },
  {
    title: "Nova legislatura 2025-2028",
    content: `Em 2025 iniciou-se a nova legislatura na Câmara Municipal de São Paulo (2025-2028). Foram eleitos 55 vereadores, incluindo novos parlamentares e reeleitos. A composição partidária sofreu alterações significativas, com mudanças nas lideranças e presidência das comissões.`,
    content_type: "noticia",
    source_table: "cmsp_noticias",
    source_id: "nova-legislatura-2025",
    metadata: { data: "2025-01", category: "noticias" }
  },
  {
    title: "Semana do Clima na Câmara",
    content: `A Câmara Municipal realizou a Semana do Clima com debates sobre sustentabilidade, mudanças climáticas e políticas ambientais para São Paulo. O evento contou com audiências públicas, palestras de especialistas e apresentação de projetos de lei sobre meio ambiente urbano.`,
    content_type: "noticia",
    source_table: "cmsp_noticias",
    source_id: "semana-clima",
    metadata: { data: "2024-11", category: "noticias" }
  },
  {
    title: "Debates sobre Plano Diretor",
    content: `A Câmara Municipal tem realizado debates e audiências públicas sobre a revisão do Plano Diretor de São Paulo. O documento define as diretrizes de desenvolvimento urbano da cidade e está em processo de atualização com participação popular. Temas como adensamento, mobilidade e áreas verdes estão em discussão.`,
    content_type: "noticia",
    source_table: "cmsp_noticias",
    source_id: "plano-diretor",
    metadata: { data: "2024-10", category: "noticias" }
  },
  {
    title: "Comissão Especial de Segurança Pública",
    content: `Foi instalada Comissão Especial para discutir segurança pública em São Paulo. A comissão ouve representantes da Guarda Civil Metropolitana, Polícia Militar, especialistas e sociedade civil para propor melhorias na segurança urbana através de projetos de lei municipais.`,
    content_type: "noticia",
    source_table: "cmsp_noticias",
    source_id: "comissao-seguranca",
    metadata: { data: "2024-09", category: "noticias" }
  },
  {
    title: "Mobilidade Urbana: novas ciclovias aprovadas",
    content: `A Câmara Municipal aprovou projetos para ampliação da malha cicloviária de São Paulo. Os projetos preveem integração com transporte público, estacionamentos para bicicletas e infraestrutura de segurança. A meta é dobrar a extensão de ciclovias nos próximos anos.`,
    content_type: "noticia",
    source_table: "cmsp_noticias",
    source_id: "ciclovias-2024",
    metadata: { data: "2024-08", category: "noticias" }
  },

  // === AGENDA E EVENTOS ===
  {
    title: "Sessões Ordinárias da Câmara",
    content: `As sessões ordinárias da Câmara Municipal de São Paulo acontecem às terças, quartas e quintas-feiras, a partir das 15h. Durante as sessões são votados projetos de lei, apresentadas moções e homenagens, e realizados debates. O público pode assistir presencialmente ou pela TV Câmara (canal 8.3).`,
    content_type: "agenda",
    source_table: "cmsp_agenda",
    source_id: "sessoes-ordinarias",
    metadata: { recorrente: true, category: "agenda" }
  },
  {
    title: "Reuniões de Comissões",
    content: `As comissões permanentes da Câmara se reúnem regularmente para analisar projetos de lei. As reuniões são públicas e os cidadãos podem acompanhar presencialmente ou online. A agenda das comissões é divulgada semanalmente no portal da Câmara.`,
    content_type: "agenda",
    source_table: "cmsp_agenda",
    source_id: "reunioes-comissoes",
    metadata: { recorrente: true, category: "agenda" }
  },
  {
    title: "Visitas Guiadas - Câmara Aberta",
    content: `O programa Câmara Aberta oferece visitas guiadas ao Palácio Anchieta aos sábados e domingos, das 9h às 17h. Os visitantes conhecem a história da Câmara, o plenário, galerias de arte e exposições temporárias. Entrada gratuita, sem necessidade de agendamento prévio.`,
    content_type: "agenda",
    source_table: "cmsp_agenda",
    source_id: "visitas-guiadas",
    metadata: { recorrente: true, category: "agenda" }
  },
  {
    title: "Cursos da Escola do Parlamento",
    content: `A Escola do Parlamento oferece cursos gratuitos ao longo do ano sobre cidadania, democracia, políticas públicas e funcionamento do Legislativo. As inscrições são abertas periodicamente e os cursos são oferecidos presencialmente e a distância (EAD).`,
    content_type: "agenda",
    source_table: "cmsp_agenda",
    source_id: "cursos-escola",
    metadata: { recorrente: true, category: "agenda" }
  },

  // === FAQ ===
  {
    title: "Como acompanhar um projeto de lei?",
    content: `Para acompanhar um projeto de lei na Câmara Municipal de São Paulo, acesse o sistema SP Legis (splegis.camara.sp.gov.br). Você pode pesquisar pelo número do projeto, nome do autor, assunto ou ano. O sistema mostra a tramitação completa, pareceres das comissões e resultado das votações.`,
    content_type: "faq",
    source_table: "cmsp_faq",
    source_id: "acompanhar-projeto",
    metadata: { category: "faq" }
  },
  {
    title: "Como entrar em contato com um vereador?",
    content: `Para entrar em contato com um vereador da Câmara Municipal de São Paulo, acesse a página de vereadores no portal (saopaulo.sp.leg.br/vereadores). Cada vereador possui página com telefone do gabinete, e-mail e formulário de contato. Você também pode visitar o gabinete pessoalmente no Palácio Anchieta.`,
    content_type: "faq",
    source_table: "cmsp_faq",
    source_id: "contato-vereador",
    metadata: { category: "faq" }
  },
  {
    title: "Como se inscrever em uma audiência pública?",
    content: `Para se inscrever em uma audiência pública, acesse a página de audiências no portal da Câmara e selecione o evento desejado. Preencha o formulário de inscrição informando se deseja usar a palavra. Audiências online possuem link de transmissão e chat para participação.`,
    content_type: "faq",
    source_table: "cmsp_faq",
    source_id: "inscricao-audiencia",
    metadata: { category: "faq" }
  },
  {
    title: "Como sugerir uma lei?",
    content: `Cidadãos podem sugerir ideias de projetos de lei através da Ouvidoria da Câmara ou entrando em contato direto com vereadores. As sugestões podem ser adotadas pelos parlamentares que as transformam em projetos formais. Para iniciativa popular direta, é necessário coletar assinaturas de 5% do eleitorado.`,
    content_type: "faq",
    source_table: "cmsp_faq",
    source_id: "sugerir-lei",
    metadata: { category: "faq" }
  },
  {
    title: "Como funciona a votação na Câmara?",
    content: `As votações na Câmara Municipal de São Paulo acontecem nas sessões plenárias. Os vereadores votam através do painel eletrônico. A maioria dos projetos requer maioria simples (metade dos presentes mais um). Emendas à Lei Orgânica exigem 2/3 dos vereadores (37 votos). O resultado é publicado imediatamente.`,
    content_type: "faq",
    source_table: "cmsp_faq",
    source_id: "como-funciona-votacao",
    metadata: { category: "faq" }
  },
  {
    title: "O que acontece depois que uma lei é aprovada?",
    content: `Após aprovação na Câmara, o projeto de lei é enviado ao Prefeito que tem 15 dias para sancionar ou vetar. Se sancionado, vira lei e é publicado no Diário Oficial. Se vetado, volta à Câmara que pode manter ou derrubar o veto por maioria absoluta (28 votos).`,
    content_type: "faq",
    source_table: "cmsp_faq",
    source_id: "depois-aprovacao",
    metadata: { category: "faq" }
  }
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables');
    }

    // Extract and validate JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing or invalid authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Alternativa: aceitar service_role para scripts (JWT com role "service_role" no payload)
    const isServiceRoleKey = supabaseServiceKey && (
      token === supabaseServiceKey.trim() ||
      (token.startsWith('eyJ') && (() => {
        try {
          const payload = JSON.parse(atob(token.split('.')[1] || '{}'));
          return payload.role === 'service_role';
        } catch { return false; }
      })())
    );
    if (isServiceRoleKey) {
      console.log('[populate-knowledge-base] Authorized via service_role key');
    } else {
      // Fluxo normal: JWT de usuário admin
      const supabaseAnon = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') || '');
      const { data: { user }, error: userError } = await supabaseAnon.auth.getUser(token);
      
      if (userError || !user) {
        console.error('User authentication failed:', userError);
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid or expired token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (rolesError) {
        console.error('Error fetching user roles:', rolesError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to verify user permissions' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const isAdmin = roles?.some(r => r.role === 'admin');
      if (!isAdmin) {
        console.log(`User ${user.id} attempted to access populate-knowledge-base without admin role`);
        return new Response(
          JSON.stringify({ success: false, error: 'Forbidden: Admin role required' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      console.log(`Admin user ${user.id} authorized to populate knowledge base`);
    }

    const results = {
      processed: 0,
      failed: 0,
      errors: [] as string[],
    };

    console.log(`Starting to populate knowledge base with ${knowledgeContent.length} items`);

    for (const item of knowledgeContent) {
      try {
        console.log(`Processing: ${item.title}`);

        // Check if already exists
        const { data: existing } = await supabase
          .from('knowledge_base')
          .select('id')
          .eq('source_id', item.source_id)
          .eq('source_table', item.source_table)
          .single();

        if (existing) {
          // Update existing
          const { error } = await supabase
            .from('knowledge_base')
            .update({
              content: item.content,
              title: item.title,
              content_type: item.content_type,
              metadata: item.metadata,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);

          if (error) throw error;
        } else {
          // Insert new
          const { error } = await supabase
            .from('knowledge_base')
            .insert({
              content: item.content,
              title: item.title,
              content_type: item.content_type,
              source_id: item.source_id,
              source_table: item.source_table,
              metadata: item.metadata,
            });

          if (error) throw error;
        }

        results.processed++;
        console.log(`Successfully processed: ${item.title}`);
      } catch (error: unknown) {
        results.failed++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(`Error processing ${item.title}: ${errorMessage}`);
        console.error(`Error processing ${item.title}:`, error);
      }
    }

    console.log(`Finished. Processed: ${results.processed}, Failed: ${results.failed}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Knowledge base populated successfully`,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in populate-knowledge-base:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});