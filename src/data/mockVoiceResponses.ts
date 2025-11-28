interface MockResponse {
  keywords: string[];
  response: string;
}

const mockResponses: MockResponse[] = [
  {
    keywords: ['audiência', 'audiencias', 'pública', 'publicas'],
    response: 'As audiências públicas são momentos importantes para a participação cidadã. Você pode acompanhar as próximas audiências pelo aplicativo e até se inscrever para participar. Quer que eu mostre as audiências da semana?'
  },
  {
    keywords: ['vereador', 'vereadores', 'parlamentar'],
    response: 'A Câmara Municipal de São Paulo conta com 55 vereadores eleitos. Cada um representa os interesses dos cidadãos paulistanos. Você pode acompanhar a atuação de cada vereador, seus projetos e votações pelo nosso aplicativo.'
  },
  {
    keywords: ['projeto', 'lei', 'legislação', 'votação'],
    response: 'Os projetos de lei passam por várias etapas na Câmara: são apresentados, analisados em comissões, e votados em plenário. Você pode acompanhar os projetos que mais te interessam e receber notificações sobre o andamento deles.'
  },
  {
    keywords: ['transporte', 'ônibus', 'metrô', 'trem', 'lotação'],
    response: 'Problemas no transporte público afetam milhões de paulistanos. Pelo aplicativo, você pode registrar relatos sobre atrasos, lotação ou outros problemas, e eles serão encaminhados para análise. Quer fazer um relato agora?'
  },
  {
    keywords: ['saúde', 'ubs', 'hospital', 'posto'],
    response: 'A rede de saúde municipal conta com diversas unidades de atendimento. Você pode avaliar os serviços de saúde que utilizou e ajudar a melhorar o atendimento para todos. Posso mostrar as unidades mais próximas de você.'
  },
  {
    keywords: ['educação', 'escola', 'creche', 'ceu'],
    response: 'A educação é prioridade para São Paulo. Pelo aplicativo, você pode avaliar escolas e creches municipais, além de acompanhar projetos de lei relacionados à educação. Como posso ajudar?'
  },
  {
    keywords: ['reclamação', 'denúncia', 'problema', 'buraco', 'iluminação'],
    response: 'Entendo sua preocupação. Pelo CMSP Connect, você pode registrar relatos urbanos sobre problemas na sua região. Os relatos são analisados e podem ser encaminhados aos vereadores responsáveis. Quer registrar um relato agora?'
  },
  {
    keywords: ['como', 'funciona', 'câmara', 'legislativo'],
    response: 'A Câmara Municipal é o poder legislativo da cidade. Os vereadores propõem e votam leis, fiscalizam o prefeito, e representam os cidadãos. Temos uma seção educativa no app chamada "Câmara Explica" que detalha todo o processo.'
  },
  {
    keywords: ['olá', 'oi', 'bom dia', 'boa tarde', 'boa noite'],
    response: 'Olá! Sou a assistente virtual do CMSP Connect. Posso te ajudar com informações sobre a Câmara Municipal, audiências públicas, projetos de lei, ou você pode fazer relatos sobre serviços públicos. Como posso ajudar?'
  },
  {
    keywords: ['obrigado', 'obrigada', 'valeu', 'agradeço'],
    response: 'Por nada! Fico feliz em ajudar. Se tiver mais alguma dúvida sobre a Câmara ou serviços públicos, é só perguntar.'
  }
];

const defaultResponses = [
  'Interessante! Posso te ajudar com informações sobre audiências públicas, projetos de lei, vereadores, ou você pode fazer relatos sobre serviços públicos. O que prefere?',
  'Entendi. Para te ajudar melhor, me conta: você quer saber sobre a Câmara Municipal, fazer um relato, ou avaliar algum serviço público?',
  'Certo! Estou aqui para ajudar com participação cidadã. Você pode me perguntar sobre audiências, vereadores, projetos de lei, ou registrar relatos urbanos.',
];

export const getMockResponse = (userMessage: string): string => {
  const lowerMessage = userMessage.toLowerCase();
  
  for (const mock of mockResponses) {
    if (mock.keywords.some(keyword => lowerMessage.includes(keyword))) {
      return mock.response;
    }
  }
  
  // Return random default response
  return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
};

export const getWelcomeMessage = (): string => {
  const hour = new Date().getHours();
  let greeting = 'Olá';
  
  if (hour < 12) greeting = 'Bom dia';
  else if (hour < 18) greeting = 'Boa tarde';
  else greeting = 'Boa noite';
  
  return `${greeting}! Sou a assistente virtual do CMSP Connect. Pode falar comigo sobre audiências públicas, vereadores, projetos de lei, ou fazer relatos sobre serviços da cidade. Como posso ajudar?`;
};
