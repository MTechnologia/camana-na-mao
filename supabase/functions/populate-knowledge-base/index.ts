import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Conteúdos do site da Câmara Municipal de São Paulo
const knowledgeContent = [
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
    title: "Câmara Explica",
    content: `O programa Câmara Explica oferece explicações e informações sobre termos e funcionamento da maior Câmara Municipal da América Latina. Se você tem alguma dúvida sobre o funcionamento do Parlamento municipal, sintonize na Rede Câmara SP (canal 8.3 digital) e acompanhe o programa que explica, com detalhes, tudo o que acontece no Palácio Anchieta, sede da Câmara Municipal de São Paulo.`,
    content_type: "educativo",
    source_table: "cmsp_portal",
    source_id: "camara-explica",
    metadata: { url: "https://www.saopaulo.sp.leg.br/camara-explica/", category: "educacao" }
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
    title: "Atividade Legislativa",
    content: `A atividade legislativa da Câmara Municipal de São Paulo inclui a tramitação de projetos de lei, emendas à Lei Orgânica, decretos legislativos e resoluções. Os cidadãos podem acompanhar projetos em tramitação, votações, sessões plenárias e trabalhos das comissões. O sistema SP Legis permite consultar todos os projetos e normas municipais. Os tipos de projetos incluem: Projeto de Lei, Projeto de Emenda à Lei Orgânica, Projeto de Decreto Legislativo e Projeto de Resolução.`,
    content_type: "legislativo",
    source_table: "cmsp_portal",
    source_id: "atividade-legislativa",
    metadata: { url: "https://www.saopaulo.sp.leg.br/atividade-legislativa/", category: "legislativo" }
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
    title: "Escola do Parlamento",
    content: `A Escola do Parlamento da Câmara Municipal de São Paulo organiza cursos, debates e seminários voltados à educação para cidadania. Oferece cursos EAD que ensinam como funcionam as assembleias cidadãs. A escola também publica a Revista "Parlamento e Sociedade" com artigos acadêmicos sobre diferentes temas de interesse da cidade, tendo como eixo temático o campo de "Políticas Públicas e Poder Legislativo no âmbito do Município".`,
    content_type: "educativo",
    source_table: "cmsp_portal",
    source_id: "escola-parlamento",
    metadata: { url: "https://www.saopaulo.sp.leg.br/escoladoparlamento/", category: "educacao" }
  },
  {
    title: "Audiências Públicas",
    content: `As audiências públicas são espaços de participação cidadã onde a população pode opinar sobre projetos de lei, políticas públicas e temas de interesse coletivo. A Câmara Municipal de São Paulo realiza audiências públicas regularmente, permitindo que os cidadãos se inscrevam e participem presencialmente ou online. A agenda de audiências públicas está disponível no portal da Câmara.`,
    content_type: "participacao",
    source_table: "cmsp_portal",
    source_id: "audiencias-publicas",
    metadata: { url: "https://www.saopaulo.sp.leg.br/audienciaspublicas/", category: "participacao" }
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
    title: "Câmara Aberta",
    content: `O projeto Câmara Aberta abre as portas do Palácio Anchieta, sede da Câmara Municipal de São Paulo, aos finais de semana para visitação pública. Os cidadãos podem conhecer a história e a arquitetura do prédio, além de aprender sobre o funcionamento do Legislativo municipal.`,
    content_type: "participacao",
    source_table: "cmsp_portal",
    source_id: "camara-aberta",
    metadata: { url: "https://www.saopaulo.sp.leg.br/camaraaberta/", category: "participacao" }
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
    title: "Portal da Legislação Paulistana",
    content: `O Portal da Legislação Paulistana permite pesquisar leis, decretos e outras normas municipais de São Paulo. Os tipos de normas incluem: Lei Ordinária, Decreto, Decreto Legislativo, Decreto-Lei, Emenda à Lei Orgânica, Ato da CMSP, Resolução da CMSP, entre outros. É possível buscar por número e ano de promulgação.`,
    content_type: "legislativo",
    source_table: "cmsp_portal",
    source_id: "legislacao-paulistana",
    metadata: { url: "https://plpconsulta.saopaulo.sp.leg.br/", category: "legislativo" }
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
    title: "LGPD na Câmara",
    content: `A Câmara Municipal de São Paulo segue a Lei Geral de Proteção de Dados (LGPD). O portal utiliza cookies para garantir a melhor experiência do usuário. Informações sobre a política de privacidade e uso de dados estão disponíveis na página de LGPD.`,
    content_type: "institucional",
    source_table: "cmsp_portal",
    source_id: "lgpd",
    metadata: { url: "https://www.saopaulo.sp.leg.br/lgpd", category: "institucional" }
  },
  {
    title: "Orçamento Municipal 2026",
    content: `A Câmara Municipal de São Paulo analisa e aprova o orçamento municipal. O hotsite do Orçamento 2026 permite aos cidadãos conhecer a Lei Orçamentária Anual (LOA 2026) e o Plano Plurianual (PPA 2026-2029). Os cidadãos podem participar, opinar e transformar o orçamento da cidade.`,
    content_type: "legislativo",
    source_table: "cmsp_portal",
    source_id: "orcamento-2026",
    metadata: { url: "https://www.saopaulo.sp.leg.br/orcamento2026/", category: "legislativo" }
  },
  {
    title: "Rede Câmara SP",
    content: `A Rede Câmara SP é a comunicação oficial da Câmara Municipal de São Paulo, integrando Portal, Web Rádio e TV (canal 8.3 digital). Oferece transmissão ao vivo de sessões plenárias, audiências públicas e eventos. Também disponibiliza vídeos e áudios de atividades parlamentares.`,
    content_type: "comunicacao",
    source_table: "cmsp_portal",
    source_id: "rede-camara",
    metadata: { url: "https://www.saopaulo.sp.leg.br/redecamara/", category: "comunicacao" }
  },
  {
    title: "Acessibilidade no Portal",
    content: `O Portal da Câmara Municipal de São Paulo oferece recursos de acessibilidade incluindo: alto contraste, ajuste de tamanho de fonte, compatibilidade com leitores de tela e plugin de acessibilidade da Hand Talk para tradução em Libras (Língua Brasileira de Sinais).`,
    content_type: "institucional",
    source_table: "cmsp_portal",
    source_id: "acessibilidade",
    metadata: { url: "https://www.saopaulo.sp.leg.br/acessibilidade-no-portal", category: "institucional" }
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
    title: "Fale com a Ouvidoria",
    content: `A Ouvidoria da Câmara Municipal de São Paulo é o canal para dúvidas, reclamações e manifestações que necessitem de respostas. Os cidadãos podem entrar em contato através do portal para reportar problemas ou dar sugestões sobre o funcionamento do Legislativo.`,
    content_type: "participacao",
    source_table: "cmsp_portal",
    source_id: "ouvidoria",
    metadata: { url: "https://www.saopaulo.sp.leg.br/fale-conosco/telefones/", category: "participacao" }
  }
];

async function generateEmbedding(content: string, apiKey: string): Promise<number[] | null> {
  try {
    const truncatedContent = content.substring(0, 32000);
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: truncatedContent,
      }),
    });

    if (!response.ok) {
      console.error('Embedding API error:', await response.text());
      return null;
    }

    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!lovableApiKey || !supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
          // Insert new (without embedding for now)
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
