/**
 * Comissões permanentes e especiais da Câmara Municipal de São Paulo.
 * Fonte: base de conhecimento (populate-knowledge-base). Pode ser substituído
 * por dados da API ComissoesCMSPJSON no futuro.
 */
export interface Comissao {
  id: string;
  nome: string;
  sigla?: string;
  atribuicoes: string;
  tipo: "permanente" | "especial";
}

export const COMISSOES: Comissao[] = [
  {
    id: "ccj",
    nome: "Comissão de Constituição, Justiça e Legislação Participativa",
    sigla: "CCJ",
    atribuicoes:
      "A CCJ é responsável por analisar a constitucionalidade e legalidade dos projetos de lei. É uma das comissões mais importantes, por onde passam todos os projetos antes de irem ao plenário. Analisa aspectos jurídicos, formais e de técnica legislativa.",
    tipo: "permanente",
  },
  {
    id: "cfo",
    nome: "Comissão de Finanças e Orçamento",
    sigla: "CFO",
    atribuicoes:
      "A Comissão de Finanças e Orçamento analisa projetos com impacto financeiro, a Lei Orçamentária Anual (LOA), Lei de Diretrizes Orçamentárias (LDO) e o Plano Plurianual (PPA). Fiscaliza a execução orçamentária do município e emite pareceres sobre viabilidade econômica.",
    tipo: "permanente",
  },
  {
    id: "cpumma",
    nome: "Comissão de Política Urbana, Metropolitana e Meio Ambiente",
    atribuicoes:
      "Analisa projetos relacionados a urbanismo, planejamento urbano, uso e ocupação do solo, meio ambiente, habitação, transporte urbano e infraestrutura. Importante para políticas de desenvolvimento sustentável da cidade.",
    tipo: "permanente",
  },
  {
    id: "cece",
    nome: "Comissão de Educação, Cultura e Esportes",
    atribuicoes:
      "Responsável por analisar projetos de lei relacionados à educação municipal, cultura, esportes e lazer. Fiscaliza políticas públicas educacionais, rede municipal de ensino e equipamentos culturais e esportivos.",
    tipo: "permanente",
  },
  {
    id: "cspstm",
    nome: "Comissão de Saúde, Promoção Social, Trabalho e Mulher",
    atribuicoes:
      "Analisa projetos relacionados à saúde pública, assistência social, políticas de emprego e renda, e direitos das mulheres. Fiscaliza o funcionamento de UBS, hospitais municipais e programas sociais.",
    tipo: "permanente",
  },
  {
    id: "cttaet",
    nome: "Comissão de Trânsito, Transporte, Atividade Econômica e Turismo",
    atribuicoes:
      "Responsável por projetos sobre mobilidade urbana, transporte público, regulação de atividades econômicas, desenvolvimento econômico e turismo. Analisa questões de trânsito e infraestrutura viária.",
    tipo: "permanente",
  },
  {
    id: "cap",
    nome: "Comissão de Administração Pública",
    atribuicoes:
      "Analisa projetos sobre estrutura administrativa da prefeitura, servidores públicos municipais, organização da máquina pública e modernização da gestão. Fiscaliza o funcionamento dos órgãos municipais.",
    tipo: "permanente",
  },
  {
    id: "cdhcri",
    nome: "Comissão de Direitos Humanos, Cidadania e Relações Internacionais",
    atribuicoes:
      "Trata de projetos sobre direitos humanos, combate à discriminação, igualdade racial, direitos LGBTQIA+, pessoas com deficiência, idosos, juventude e relações internacionais da cidade.",
    tipo: "permanente",
  },
  {
    id: "cdc",
    nome: "Comissão de Defesa do Consumidor",
    atribuicoes:
      "Analisa projetos relacionados à proteção e defesa do consumidor paulistano. Fiscaliza práticas comerciais, qualidade de serviços e produtos, e atua na defesa dos direitos dos consumidores.",
    tipo: "permanente",
  },
  {
    id: "cpa",
    nome: "Comissão de Proteção dos Animais",
    atribuicoes:
      "Responsável por analisar projetos de lei relacionados ao bem-estar animal, combate aos maus-tratos, políticas de adoção e castração, e proteção da fauna urbana.",
    tipo: "permanente",
  },
  {
    id: "comissao-seguranca",
    nome: "Comissão Especial de Segurança Pública",
    atribuicoes:
      "Comissão Especial para discutir segurança pública em São Paulo. A comissão ouve representantes da Guarda Civil Metropolitana, Polícia Militar, especialistas e sociedade civil para propor melhorias na segurança urbana através de projetos de lei municipais.",
    tipo: "especial",
  },
];
