# CMSP Connect - Documento de Escopo e Especificação

## 1. Visão Geral do Projeto

### 1.1 Definição

O CMSP Connect é um aplicativo mobile-first de participação cidadã que conecta os munícipes de São Paulo à Câmara Municipal através de uma interface conversacional baseada em inteligência artificial.

### 1.2 Missão

Democratizar o acesso à informação legislativa, facilitar a manifestação cidadã e melhorar a qualidade dos serviços públicos através de feedback estruturado, promovendo transparência, participação e eficiência.

### 1.3 Princípios Norteadores

- Atender demandas imediatas do cidadão (não ser ferramenta de pesquisa aprofundada)
- Resolver via interface conversacional sempre que possível
- Toda conversa deve resultar em entendimento da experiência do munícipe
- Integrar com fontes oficiais (Portal CMSP, SP Legis) ao invés de replicar conteúdo
- Coletar localização estruturada (location_point) em todos os relatos para análises georreferenciadas

---

## 2. Objetivos Estratégicos

1. Aumentar a transparência legislativa através de acesso simplificado a informações
2. Facilitar o registro e acompanhamento de manifestações cidadãs
3. Conectar cidadãos a vereadores relevantes para suas demandas
4. Coletar dados estruturados para subsidiar políticas públicas
5. Promover a participação popular em audiências públicas
6. Mapear a qualidade dos serviços públicos municipais através de avaliações geolocalizadas

---

## 3. Arquitetura de Produto

### 3.1 Assistente Único Orquestrador

O CMSP Connect é estruturado em torno de um **Assistente Único** que atua como orquestrador central de todas as interações. Este assistente:

- Recebe todas as mensagens do usuário em linguagem natural
- Interpreta a intenção e contexto da solicitação
- Aciona ferramentas (tools) específicas quando necessário
- Mantém o contexto da conversa entre interações
- Oferece uma experiência unificada independente da funcionalidade acessada

### 3.2 Ferramentas Disponíveis (Tools)

O assistente possui acesso às seguintes ferramentas para executar ações concretas:

| Ferramenta | Função |
|------------|--------|
| `create_urban_report` | Registra problemas urbanos (buracos, iluminação, lixo, calçadas) |
| `create_transport_report` | Registra problemas de transporte público |
| `create_service_rating` | Salva avaliações de serviços públicos visitados |
| `search_knowledge_base` | Busca informações institucionais sobre a Câmara |
| `find_nearby_services` | Localiza UBS, escolas, hospitais e outros serviços próximos |
| `search_audiencias` | Consulta audiências públicas agendadas por tema ou data |
| `suggest_council_member` | Recomenda vereadores com base no tema da demanda |
| `get_citizen_history` | Consulta histórico de participação do cidadão no app |

### 3.3 Geolocalização Estruturada

Todos os relatos e avaliações coletam obrigatoriamente um `location_point` contendo:
- Coordenadas geográficas (latitude/longitude)
- Endereço textual (quando disponível)
- Bairro/distrito

Esta padronização permite análises georreferenciadas, mapas de calor e identificação de padrões por região.

---

## 4. Personas Principais

| Persona | Descrição | Necessidades |
|---------|-----------|--------------|
| Cidadão Comum | Morador de SP que utiliza serviços públicos e quer reportar problemas ou obter informações | Facilidade de uso, resposta rápida, acompanhamento de solicitações |
| Cidadão Engajado | Pessoa interessada em política local e participação em audiências | Informações sobre vereadores, agenda legislativa, inscrição em eventos |
| Gestor Público | Funcionário da Câmara que precisa analisar dados e gerenciar demandas | Dashboards analíticos, gestão de relatos, exportação de dados |
| Administrador | Responsável pelo sistema, gerencia usuários e configurações | Auditoria, controle de acessos, monitoramento |

---

## 5. Casos de Uso

### CSU001 - Acolhimento Digital Personalizado

**Proposta de Valor:** Transformar o primeiro contato do cidadão com o aplicativo em uma experiência acolhedora e orientadora, garantindo que cada usuário compreenda rapidamente como o aplicativo pode ajudá-lo e se sinta motivado a participar ativamente da vida política de sua cidade.

**História de Usuário:** Ao acessar o aplicativo pela primeira vez, o cidadão é recebido por um assistente virtual que se apresenta, explica as funcionalidades disponíveis e oferece orientação personalizada. O sistema pode utilizar o contexto do usuário (localização, interesses declarados) para oferecer informações relevantes, como audiências públicas próximas, serviços públicos na região e temas legislativos de interesse.

**Funcionalidades:**
- Apresentação inicial do aplicativo e suas capacidades
- Coleta opcional de preferências e interesses do usuário
- Sugestões personalizadas de conteúdo e funcionalidades baseadas no contexto
- Resumo das atividades legislativas recentes relevantes para o perfil
- Orientação sobre como utilizar cada recurso do aplicativo
- Ações rápidas (quick actions) para funcionalidades mais comuns

---

### CSU002 - Engajamento em Audiências Públicas

**Proposta de Valor:** Ampliar significativamente a participação popular nas audiências públicas da Câmara, removendo barreiras de informação e facilitando o engajamento de cidadãos que desejam contribuir com os debates legislativos.

**História de Usuário:** O sistema apresenta as audiências públicas agendadas de forma clara e acessível, permitindo que o cidadão visualize temas, datas, locais e formas de participação. O usuário pode se inscrever para participar, receber lembretes e acessar materiais de apoio. O assistente virtual auxilia na compreensão dos temas em discussão, utilizando linguagem simples.

**Funcionalidades:**
- Listagem de audiências públicas com filtros por tema, data e status
- Detalhamento de cada audiência (pauta, participantes, documentos, vagas)
- Inscrição para participação presencial ou remota
- Notificações e lembretes automáticos configuráveis
- Explicação simplificada dos temas em discussão pelo assistente virtual
- Acesso a documentos e materiais de referência
- Histórico de audiências em que o cidadão participou

**Ferramenta do Assistente:** `search_audiencias`

---

### CSU003 - Acesso ao Conteúdo Institucional

**Proposta de Valor:** Aproximar o cidadão do Poder Legislativo municipal, oferecendo acesso fácil e compreensível às informações institucionais da Câmara, desmistificando o funcionamento do parlamento e promovendo a educação cívica.

**História de Usuário:** O aplicativo oferece uma seção dedicada ao conteúdo institucional, com informações sobre a Câmara Municipal, seus vereadores, comissões, agenda de atividades e notícias. O assistente virtual está disponível para esclarecer dúvidas sobre o funcionamento do Legislativo, utilizando a base de conhecimento integrada. Todos os conteúdos institucionais são obtidos por integração com o Portal CMSP e SP Legis.

**Funcionalidades:**
- Apresentação da estrutura e funcionamento da Câmara Municipal
- Perfil dos vereadores com áreas de atuação, comissões e contato
- Informações sobre as Comissões Permanentes e suas atribuições
- Agenda de atividades legislativas (sessões, reuniões, eventos)
- Notícias e comunicados oficiais
- Esclarecimento de dúvidas pelo assistente virtual
- Conteúdo educativo sobre o processo legislativo (Câmara Explica)
- Escola do Parlamento

**Ferramenta do Assistente:** `search_knowledge_base`

---

### CSU004 - Avaliação de Serviços Públicos

**Proposta de Valor:** Empoderar o cidadão como agente ativo na melhoria dos serviços públicos, criando um canal estruturado para que suas experiências sejam registradas, analisadas e direcionadas às instâncias competentes para subsidiar a fiscalização legislativa.

**História de Usuário:** O sistema permite que o cidadão avalie serviços públicos que utilizou (UBS, escolas, hospitais, CEUs, bibliotecas). Ao abrir o aplicativo, o assistente pode, mediante autorização, consultar a localização do usuário para identificar serviços próximos e sugerir avaliações. A avaliação também pode ser iniciada ativamente pelo usuário através de conversa com o assistente virtual ou navegando pelo mapa de serviços.

**Funcionalidades:**
- Detecção de visita a serviço público por proximidade (mediante autorização)
- Sugestão proativa de avaliação após visita detectada
- Avaliação por estrelas (1-5) e comentário textual estruturado
- Coleta de avaliação via conversa natural com assistente virtual
- Análise de sentimento automática do comentário
- Histórico de avaliações realizadas pelo cidadão
- Possibilidade de encaminhamento a vereador da comissão pertinente
- Acompanhamento de encaminhamentos gerados

**Ferramenta do Assistente:** `create_service_rating`

---

### CSU005 - Diagnóstico de Transporte Público

**Proposta de Valor:** Criar um canal efetivo para que os usuários do transporte público municipal possam reportar problemas de forma estruturada, permitindo a identificação de padrões recorrentes e subsidiando ações de fiscalização e melhoria do serviço.

**História de Usuário:** O cidadão pode reportar problemas no transporte público através de conversa com o assistente virtual. O sistema coleta informações estruturadas sobre o tipo de problema (atraso, lotação, segurança, acessibilidade, limpeza), linha afetada, horário, local e severidade. Relatos similares são agrupados para identificação de padrões, e o sistema pode sugerir encaminhamento a vereadores da Comissão de Trânsito, Transporte e Atividade Econômica.

**Funcionalidades:**
- Registro de problemas via conversa natural com o assistente
- Categorização estruturada: atraso, lotação, segurança, acessibilidade, limpeza, outros
- Coleta de dados: linha, horário, local de ocorrência (location_point), severidade
- Níveis de severidade: baixo, médio, alto, crítico
- Detecção automática de padrões recorrentes por linha/região/horário
- Sugestão de vereadores para encaminhamento
- Histórico de relatos do cidadão com status de acompanhamento
- Alertas de padrões identificados para linhas de interesse

**Ferramenta do Assistente:** `create_transport_report`

---

### CSU006 - Painel de Análise de Demandas

**Proposta de Valor:** Transformar os dados coletados das manifestações cidadãs em informações acionáveis para gestores públicos e cidadãos, permitindo visualização de tendências, identificação de áreas prioritárias e acompanhamento da evolução das demandas.

**História de Usuário:** O sistema oferece dashboards analíticos que consolidam os dados de relatos urbanos, avaliações de serviços e diagnósticos de transporte. Gestores podem visualizar métricas agregadas, filtrar por região/período/categoria, identificar padrões e exportar relatórios. Cidadãos têm acesso a uma versão simplificada com dados públicos agregados.

**Funcionalidades:**
- Dashboard com KPIs principais: total de relatos, avaliação média, questões críticas
- Gráficos temporais de evolução das demandas
- Mapas de calor por categoria e região (baseados em location_point)
- Filtros por período, categoria, status, severidade e região
- Drill-down para análise detalhada por dimensão
- Análise de sentimento agregada das avaliações
- Identificação e alertas de padrões emergentes
- Criação de painéis customizados (gestores)
- Exportação de dados em formatos padrão (gestores)
- Galeria de dashboards públicos

---

### CSU007 - Mapa de Serviços Públicos

**Proposta de Valor:** Facilitar o acesso do cidadão aos serviços públicos disponíveis em sua região, oferecendo informações atualizadas sobre localização, funcionamento e qualidade baseada em avaliações de outros usuários.

**História de Usuário:** O cidadão pode consultar um mapa interativo com os serviços públicos disponíveis (UBS, escolas, hospitais, CEUs, bibliotecas, centros esportivos). O mapa utiliza a localização do usuário para mostrar serviços próximos, exibe avaliações agregadas de outros cidadãos e permite traçar rotas. O assistente virtual pode recomendar serviços baseados no contexto da conversa.

**Funcionalidades:**
- Mapa interativo com geolocalização do usuário
- Filtros por tipo de serviço e raio de distância
- Exibição de avaliação média e total de avaliações por serviço
- Detalhes do serviço: endereço, horário de funcionamento, telefone
- Traçado de rotas até o serviço selecionado
- Sugestão de serviços pelo assistente baseada no contexto
- Lista de avaliações recentes do serviço
- Opção de iniciar avaliação a partir do detalhe do serviço

**Ferramenta do Assistente:** `find_nearby_services`

---

### CSU008 - Relatos Urbanos Estruturados

**Proposta de Valor:** Oferecer ao cidadão um canal simples e efetivo para reportar problemas de infraestrutura urbana, garantindo que os relatos sejam estruturados de forma a permitir análise, priorização e encaminhamento adequado às instâncias responsáveis.

**História de Usuário:** O cidadão pode reportar problemas urbanos (buracos, iluminação, lixo, calçadas, áreas verdes) através de conversa com o assistente virtual ou formulário manual. O sistema coleta informações estruturadas incluindo categoria, descrição, localização geográfica (location_point), severidade e fotos opcionais. Relatos podem ser encaminhados a vereadores e o cidadão pode acompanhar o status.

**Funcionalidades:**
- Registro via conversa natural com assistente ou formulário manual
- Categorias: iluminação pública, calçadas, vias públicas, lixo/entulho, áreas verdes, outros
- Coleta obrigatória de localização (location_point) via GPS ou endereço
- Upload opcional de fotos do problema
- Níveis de severidade: baixo, médio, alto, crítico
- Classificação automática por IA quando via chat
- Histórico de relatos com status de acompanhamento
- Interações sociais: outros cidadãos podem apoiar relatos existentes
- Sugestão de vereador para encaminhamento
- Notificações de atualização de status

**Ferramenta do Assistente:** `create_urban_report`

---

## 6. Mapa do Site (Sitemap)

### Onboarding e Autenticação
- Splash Screen
- Boas-vindas
- Login / Cadastro
- Recuperação de Senha
- Seleção de Interesses (onboarding)

### Assistente IA (Hub Central)
- Chat Conversacional
- Ações Rápidas (Quick Actions)
- Histórico de Conversas
- Modo Voz

### Manifestações Cidadãs
- Relatos Urbanos
  - Via Chat IA
  - Formulário Manual
  - Meus Relatos
- Diagnóstico de Transporte
  - Via Chat IA
  - Novo Relato
  - Relatos Urgentes
  - Padrões Detectados
  - Meus Relatos

### Avaliação de Serviços
- Serviços Próximos (Mapa)
- Detalhe do Serviço
- Avaliar Serviço

### Audiências Públicas
- Lista de Audiências
- Detalhe da Audiência
- Inscrição / Participação

### Navegação Institucional
- Agenda da CMSP
- Vereadores
  - Detalhe do Vereador
- Conheça a Câmara
- Câmara Explica
- Escola do Parlamento
- Notícias
  - Detalhe da Notícia

### Analytics (Cidadão)
- Dashboard Geral
- Análises Avançadas
- Criar Painel
- Galeria de Painéis Públicos

### Área do Usuário
- Meu Perfil
  - Informações Pessoais
  - Interesses
  - Dados Demográficos
  - Endereço
- Conversas Salvas
- Favoritos
- Notificações
- Configurações de Acessibilidade

### Área Administrativa
- Dashboard Admin
- Gestão de Usuários
- Gestão de Manifestações (Kanban)
- Encaminhamentos a Vereadores
- Analytics Avançado
- Análise de Sentimento
- Logs de Auditoria
- Configurações
  - Integrações (Webhooks)
  - Acessibilidade do Sistema

---

## 7. Descrição dos Módulos

### 7.1 Assistente IA (Hub Central)

Interface conversacional inteligente que atua como ponto de entrada único para todas as funcionalidades:
- Interpreta intenções do cidadão em linguagem natural
- Aciona ferramentas (tools) para executar ações concretas
- Mantém contexto entre mensagens da mesma conversa
- Registra relatos e avaliações de forma conversacional
- Busca informações na base de conhecimento institucional
- Localiza serviços públicos por proximidade
- Sugere vereadores para encaminhamento de demandas
- Consulta audiências públicas por tema
- Apresenta histórico de participação do cidadão

### 7.2 Relatos Urbanos

Módulo para registro de problemas de infraestrutura:
- Categorias padronizadas: iluminação, calçada, via pública, lixo, área verde
- Coleta estruturada: descrição, localização (location_point), severidade, fotos
- Acompanhamento de status do relato
- Interações sociais (apoios de outros cidadãos)
- Encaminhamento a vereadores

### 7.3 Diagnóstico de Transporte

Registro de problemas no transporte público municipal:
- Tipos: atraso, lotação, segurança, acessibilidade, limpeza
- Dados estruturados: linha, horário, local de ocorrência (location_point), severidade
- Níveis de severidade: baixo, médio, alto, crítico
- Detecção automática de padrões recorrentes
- Encaminhamento a vereadores da comissão pertinente

### 7.4 Avaliação de Serviços Públicos

Avaliação geolocalizada de equipamentos públicos:
- Tipos de serviços: UBS, escolas, CEUs, hospitais, bibliotecas, centros esportivos
- Sistema de estrelas (1-5) com comentário textual
- Análise de sentimento automática
- Detecção de visita por proximidade (opcional)
- Histórico de avaliações do cidadão

### 7.5 Mapa de Serviços

Navegação georreferenciada de serviços públicos:
- Mapa interativo com localização do usuário
- Filtros por tipo de serviço e raio de distância
- Exibição de avaliações agregadas
- Detalhes de funcionamento e contato
- Traçado de rotas

### 7.6 Audiências Públicas

Participação em consultas públicas:
- Listagem com filtros por tema, data e status
- Detalhes: pauta, participantes, documentos, vagas
- Inscrição para participação presencial ou remota
- Notificações e lembretes
- Histórico de participações

### 7.7 Navegação Institucional

Acesso a informações da Câmara Municipal:
- Agenda de eventos e sessões plenárias
- Perfis de vereadores com áreas de atuação
- Estrutura das Comissões Permanentes
- Conteúdo educativo (Câmara Explica)
- Escola do Parlamento
- Feed de notícias oficiais

### 7.8 Analytics e Dashboards

Visualização de dados agregados:
- KPIs principais: relatos, avaliações, satisfação, criticidade
- Gráficos temporais e por categoria
- Mapas de calor por região (baseados em location_point)
- Análise de sentimento agregada
- Criação de painéis customizados (gestores)
- Galeria de dashboards públicos
- Exportação de dados (gestores)

### 7.9 Área Administrativa

Gestão do sistema para operadores:
- Dashboard com métricas consolidadas
- Gestão de usuários com papéis (cidadão, gestor, admin)
- Gestão unificada de manifestações (interface Kanban)
- Gerenciamento de encaminhamentos a vereadores
- Análise de sentimento detalhada
- Logs de auditoria completos
- Configuração de integrações externas (webhooks)

---

## 8. Principais Jornadas do Usuário

### Jornada 1: Primeiro Acesso e Onboarding
1. Cidadão baixa o aplicativo e visualiza splash screen
2. Tela de boas-vindas apresenta o propósito do app
3. Cidadão realiza cadastro (email, senha, nome, telefone)
4. Sistema solicita seleção de áreas de interesse (mínimo 3)
5. Cidadão é direcionado ao assistente IA com saudação personalizada
6. Assistente apresenta ações rápidas baseadas nos interesses

### Jornada 2: Relato de Problema Urbano via IA
1. Cidadão acessa o chat do assistente
2. Escreve em linguagem natural: "Tem um buraco enorme na minha rua"
3. Assistente solicita detalhes: localização, há quanto tempo, severidade
4. Cidadão pode enviar foto do problema
5. Assistente confirma dados e aciona `create_urban_report`
6. Cidadão recebe confirmação com protocolo
7. Pode acompanhar status em "Meus Relatos"

### Jornada 3: Avaliação de Serviço Público
1. Cidadão visita uma UBS
2. Ao abrir o app posteriormente, assistente detecta proximidade recente
3. Sugere: "Vi que você esteve perto da UBS Vila Mariana. Gostaria de avaliar?"
4. Cidadão informa nota (estrelas) e comentário
5. Assistente analisa sentimento e salva via `create_service_rating`
6. Cidadão pode optar por encaminhar a vereador se avaliação negativa

### Jornada 4: Participação em Audiência Pública
1. Cidadão pergunta ao assistente sobre audiências de educação
2. Assistente consulta `search_audiencias` e lista opções
3. Cidadão seleciona uma audiência para ver detalhes
4. Realiza inscrição para participação
5. Recebe confirmação e pode adicionar lembrete
6. No dia, recebe notificação de lembrete

### Jornada 5: Encaminhamento de Demanda a Vereador
1. Cidadão registra problema recorrente de transporte
2. Sistema detecta padrão: mesma linha, mesmos horários, múltiplos relatos
3. Assistente sugere: "Identifiquei um padrão. Deseja encaminhar ao vereador X da Comissão de Transportes?"
4. Cidadão autoriza encaminhamento e adiciona mensagem
5. Sistema registra referral com `suggest_council_member`
6. Cidadão pode acompanhar status do encaminhamento

### Jornada 6: Consulta ao Histórico de Participação
1. Cidadão pergunta: "O que eu já fiz no app?"
2. Assistente aciona `get_citizen_history`
3. Apresenta resumo: X relatos urbanos, Y avaliações, Z audiências
4. Cidadão pode solicitar detalhes de cada categoria
5. Visualiza status atual de cada item

---

## 9. Recursos de Acessibilidade

O aplicativo é projetado seguindo diretrizes WCAG 2.1 nível AA:

- Ajuste de tamanho de fonte (pequeno, médio, grande, extra grande)
- Modo de alto contraste
- Navegação simplificada com menos elementos visuais
- Suporte completo a leitores de tela
- Entrada por voz para todas as funcionalidades principais
- Linguagem simples e empática em todas as interações
- Navegação por teclado em versão web
- Descrições alternativas em imagens

---

## 10. Perfis e Permissões

| Perfil | Descrição | Acesso |
|--------|-----------|--------|
| Cidadão | Usuário padrão do aplicativo | Chat IA, relatos, avaliações, audiências, mapa de serviços, perfil, analytics público |
| Gestor | Funcionário da Câmara com acesso a gestão | Tudo do cidadão + área administrativa parcial (sem gestão de usuários) |
| Administrador | Responsável técnico pelo sistema | Acesso completo incluindo gestão de usuários, logs de auditoria e configurações |

---

## 11. Métricas de Sucesso (KPIs)

| Métrica | Descrição |
|---------|-----------|
| Taxa de conclusão de relatos via IA | Percentual de relatos iniciados no chat que são salvos com sucesso |
| NPS do aplicativo | Net Promoter Score coletado periodicamente |
| Tempo médio de resolução | Tempo entre criação e resolução de manifestações |
| Participações em audiências | Número de inscrições realizadas via app |
| Avaliações coletadas | Volume de avaliações de serviços públicos por período |
| Taxa de encaminhamentos | Percentual de manifestações encaminhadas a vereadores |
| Engajamento recorrente | Percentual de usuários que retornam ao app em 30 dias |

---

## 12. Integrações Previstas

| Integração | Finalidade |
|------------|------------|
| Sistema de Geolocalização (GPS) | Coleta de location_point em relatos e detecção de proximidade |
| Mapas Interativos | Visualização de serviços, rotas e mapas de calor |
| Portal CMSP e SP Legis | Fonte de dados institucionais (vereadores, agenda, notícias) |
| Webhooks (n8n) | Integração com sistemas externos e automações |
| Análise de Sentimento | Processamento de comentários para classificação automática |
| Embeddings Vetoriais | Busca semântica na base de conhecimento institucional |

---

## 13. Glossário

| Termo | Definição |
|-------|-----------|
| Assistente IA | Interface conversacional que orquestra todas as funcionalidades do app |
| Tool | Ferramenta que o assistente pode acionar para executar ações específicas |
| location_point | Estrutura padronizada de localização contendo coordenadas e endereço |
| Relato | Manifestação do cidadão sobre problema urbano ou de transporte |
| Avaliação | Feedback estruturado sobre experiência em serviço público |
| Encaminhamento | Direcionamento formal de demanda a vereador responsável |
| Padrão | Ocorrência recorrente identificada automaticamente pelo sistema |
| Quick Actions | Ações rápidas disponíveis na tela inicial do assistente |

---

*Documento de Escopo e Especificação - CMSP Connect*
*Versão 1.0*
