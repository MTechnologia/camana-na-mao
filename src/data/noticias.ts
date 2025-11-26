import { Vote, Bus, Palette, Heart, BookOpen, Leaf, LucideIcon } from "lucide-react";

export type NewsCategory = 'legislativo' | 'mobilidade' | 'cultura' | 'saude' | 'educacao' | 'ambiente';

export interface Noticia {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  fullContent: string;
  time: string;
  date: string;
  isNew: boolean;
  source: string;
  category: NewsCategory;
  readTime: string;
  views: number;
}

export const categoryConfig: Record<NewsCategory, { label: string; color: string }> = {
  legislativo: { label: "Legislativo", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  mobilidade: { label: "Mobilidade", color: "bg-green-500/10 text-green-600 border-green-500/20" },
  cultura: { label: "Cultura", color: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
  saude: { label: "Saúde", color: "bg-red-500/10 text-red-600 border-red-500/20" },
  educacao: { label: "Educação", color: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
  ambiente: { label: "Meio Ambiente", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
};

export const noticias: Noticia[] = [
  {
    id: "1",
    icon: Vote,
    title: "Votação Importante",
    description: "Projeto de mobilidade urbana aprovado",
    fullContent: `O projeto de lei que propõe melhorias significativas na mobilidade urbana da cidade de São Paulo foi aprovado em sessão plenária nesta terça-feira.

A proposta inclui a criação de novos corredores de ônibus, a expansão das ciclovias e investimentos em infraestrutura de transporte público. A votação teve ampla maioria favorável, com 45 votos a favor e 10 contra.

Os vereadores destacaram a importância da medida para reduzir o tempo de deslocamento dos cidadãos e melhorar a qualidade de vida na cidade. O projeto prevê investimentos de R$ 2,5 bilhões ao longo dos próximos 4 anos.

Entre as principais ações estão:
- Criação de 100 km de novos corredores exclusivos para ônibus
- Expansão de 200 km de ciclovias
- Modernização de 50 terminais de ônibus
- Integração entre diferentes modais de transporte

A implementação das medidas deve começar já no próximo semestre, com prioridade para as regiões mais carentes de infraestrutura de transporte.`,
    time: "Há 2 horas",
    date: "26 de novembro de 2025",
    isNew: true,
    source: "Portal da Câmara",
    category: "legislativo",
    readTime: "3 min",
    views: 1245,
  },
  {
    id: "2",
    icon: Bus,
    title: "Nova Linha de Ônibus",
    description: "Corredor expresso conecta zona sul ao centro",
    fullContent: `A SPTrans anuncia a inauguração de uma nova linha expressa que conectará a zona sul ao centro da cidade, reduzindo significativamente o tempo de viagem para milhares de passageiros.

A nova linha, denominada "Expresso Sul-Centro", operará em corredor exclusivo e promete reduzir em até 40% o tempo de deslocamento entre as regiões. O serviço começará a operar a partir da próxima segunda-feira.

Características do novo serviço:
- Frota moderna com ônibus equipados com ar-condicionado e Wi-Fi gratuito
- Paradas estratégicas em pontos de grande movimento
- Integração com as linhas do metrô
- Tarifa normal do sistema de transporte público
- Operação de segunda a sábado, das 5h às 23h

A expectativa é atender cerca de 15 mil passageiros por dia. O investimento total na nova linha foi de R$ 45 milhões, incluindo a infraestrutura das paradas e a aquisição dos veículos.

Moradores da zona sul já manifestaram apoio à iniciativa, destacando que a nova linha vai facilitar muito o acesso ao trabalho e aos serviços da região central.`,
    time: "Há 4 horas",
    date: "26 de novembro de 2025",
    isNew: true,
    source: "SPTrans",
    category: "mobilidade",
    readTime: "4 min",
    views: 892,
  },
  {
    id: "3",
    icon: Palette,
    title: "Lei de Incentivo à Cultura",
    description: "Sancionada nova lei de fomento às artes",
    fullContent: `O prefeito sancionou nesta manhã a nova Lei de Incentivo à Cultura, que prevê investimentos significativos no setor artístico e cultural da cidade de São Paulo.

A lei estabelece mecanismos de incentivo fiscal para empresas que apoiarem projetos culturais, além de criar fundos específicos para diferentes modalidades artísticas. O objetivo é democratizar o acesso à cultura e fortalecer a economia criativa.

Principais pontos da lei:
- Incentivos fiscais para empresas patrocinadoras
- Criação do Fundo Municipal de Cultura
- Apoio a artistas independentes e coletivos culturais
- Programas de formação em artes
- Valorização das culturas periféricas e tradicionais

O investimento previsto para o primeiro ano é de R$ 150 milhões, divididos entre diferentes áreas: música, teatro, dança, artes visuais, literatura e cinema.

A Secretaria Municipal de Cultura já está preparando o edital para a primeira chamada pública de projetos, que deve ser lançado em janeiro. Artistas e produtores culturais celebram a iniciativa como um marco para o setor.`,
    time: "Há 5 horas",
    date: "26 de novembro de 2025",
    isNew: true,
    source: "Secretaria de Cultura",
    category: "cultura",
    readTime: "4 min",
    views: 673,
  },
  {
    id: "4",
    icon: Heart,
    title: "Ampliação de UBS",
    description: "Novas unidades de saúde na zona leste",
    fullContent: `A Prefeitura de São Paulo anuncia a construção de 10 novas Unidades Básicas de Saúde (UBS) na zona leste, região que concentra grande demanda por serviços de saúde primária.

As novas unidades fazem parte de um plano de expansão da rede municipal de saúde e devem atender cerca de 100 mil pessoas. As obras começam em janeiro e a previsão é que as primeiras unidades sejam inauguradas em junho.

Estrutura das novas UBS:
- Consultas médicas em clínica geral, pediatria e ginecologia
- Atendimento odontológico
- Vacinação
- Farmácia
- Sala de curativos e procedimentos
- Coleta de exames

Cada unidade contará com equipes completas de saúde da família, incluindo médicos, enfermeiros, técnicos de enfermagem e agentes comunitários. O investimento total é de R$ 80 milhões.

A Secretaria Municipal de Saúde também anunciou a contratação de 500 novos profissionais para atuar nas novas unidades, com concurso público previsto para os próximos meses.

Os bairros contemplados foram escolhidos com base em estudos de densidade populacional e acesso a serviços de saúde.`,
    time: "Há 1 dia",
    date: "25 de novembro de 2025",
    isNew: false,
    source: "Secretaria de Saúde",
    category: "saude",
    readTime: "5 min",
    views: 2103,
  },
  {
    id: "5",
    icon: BookOpen,
    title: "Programa Escola Digital",
    description: "Tablets serão distribuídos para estudantes",
    fullContent: `A Secretaria Municipal de Educação lança o Programa Escola Digital, que prevê a distribuição de tablets para todos os estudantes da rede municipal de ensino.

A iniciativa faz parte de um projeto maior de modernização da educação e inclusão digital. Ao todo, serão distribuídos 500 mil tablets ao longo de 2026, beneficiando alunos do ensino fundamental e médio.

Detalhes do programa:
- Tablets com aplicativos educacionais pré-instalados
- Acesso gratuito à internet nas escolas
- Capacitação de professores para uso das tecnologias
- Plataforma digital de ensino
- Materiais didáticos digitais

Os dispositivos serão fornecidos em regime de comodato, ou seja, os alunos poderão usar os equipamentos durante todo o ano letivo, devendo devolvê-los ao final. O investimento total no programa é de R$ 300 milhões.

Além dos tablets, o programa inclui a instalação de redes Wi-Fi de alta velocidade em todas as escolas municipais e a criação de laboratórios de informática modernizados.

Pais e educadores receberam positivamente a notícia, destacando a importância da inclusão digital para o futuro dos estudantes.`,
    time: "Há 1 dia",
    date: "25 de novembro de 2025",
    isNew: false,
    source: "Secretaria de Educação",
    category: "educacao",
    readTime: "4 min",
    views: 1567,
  },
  {
    id: "6",
    icon: Leaf,
    title: "Parque Urbano Inaugurado",
    description: "Novo espaço verde aberto à comunidade",
    fullContent: `Foi inaugurado neste fim de semana o Parque Verde São Paulo, um novo espaço de lazer e convivência na zona norte da cidade. Com 50 mil metros quadrados de área verde, o parque é o maior investimento em áreas de lazer dos últimos anos.

O novo parque conta com infraestrutura completa para receber famílias e esportistas, oferecendo diversas opções de atividades ao ar livre.

Estrutura do parque:
- Pistas de caminhada e ciclismo
- Quadras esportivas polivalentes
- Playground infantil acessível
- Academia ao ar livre
- Área para piquenique
- Lago artificial com pedalinhos
- Jardim botânico
- Espaço para eventos culturais

O projeto incluiu o plantio de 5 mil árvores nativas da Mata Atlântica e a criação de um sistema de captação de água da chuva para irrigação. O investimento foi de R$ 25 milhões.

O parque funcionará todos os dias, das 6h às 22h, com entrada gratuita. A segurança será garantida por equipe da Guarda Civil Metropolitana.

Moradores da região participaram ativamente do projeto, através de consultas públicas que ajudaram a definir os equipamentos e serviços do parque.`,
    time: "Há 2 dias",
    date: "24 de novembro de 2025",
    isNew: false,
    source: "Secretaria do Verde",
    category: "ambiente",
    readTime: "5 min",
    views: 3421,
  },
];

export const getNoticiaById = (id: string): Noticia | undefined => {
  return noticias.find((n) => n.id === id);
};
