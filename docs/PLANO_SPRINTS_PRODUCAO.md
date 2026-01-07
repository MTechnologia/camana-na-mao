# Plano de Sprints - Câmara na Mão

**Versão:** 1.0  
**Data de Criação:** Janeiro 2025  
**Última Atualização:** 07/01/2025  
**Status:** Em Aprovação

---

## Sumário

1. [Visão Geral do Projeto](#1-visão-geral-do-projeto)
2. [Épicos Mapeados](#2-épicos-mapeados)
3. [Sprint 0 - Fundação](#sprint-0---fundação)
4. [Sprint 1 - Autenticação e Onboarding](#sprint-1---autenticação-e-onboarding)
5. [Sprint 2 - Home e Assistente de IA Base](#sprint-2---home-e-assistente-de-ia-base)
6. [Sprint 3 - Relato Urbano Estruturado](#sprint-3---relato-urbano-estruturado)
7. [Sprint 4 - Diagnóstico de Transporte](#sprint-4---diagnóstico-de-transporte)
8. [Sprint 5 - Mapa de Serviços Públicos](#sprint-5---mapa-de-serviços-públicos)
9. [Sprint 6 - Avaliação de Serviços](#sprint-6---avaliação-de-serviços)
10. [Sprint 7 - Audiências Públicas](#sprint-7---audiências-públicas)
11. [Sprint 8 - Navegação Institucional](#sprint-8---navegação-institucional)
12. [Sprint 9 - Área Administrativa](#sprint-9---área-administrativa)
13. [Sprint 10 - Analytics e Dashboards](#sprint-10---analytics-e-dashboards)
14. [Sprint 11 - Integrações Externas](#sprint-11---integrações-externas)
15. [Sprint 12 - Polimento e Lançamento](#sprint-12---polimento-e-lançamento)
16. [Resumo de Pontos por Sprint](#resumo-de-pontos-por-sprint)
17. [Dependências Críticas](#dependências-críticas)
18. [Próximos Passos](#próximos-passos)

---

## 1. Visão Geral do Projeto

### Informações Gerais

| Atributo | Valor |
|----------|-------|
| **Duração Total Estimada** | 12 sprints (6 meses de desenvolvimento) |
| **Formato** | Sprints de 2 semanas |
| **Total de Pontos** | 382 pontos |
| **Velocidade Média Esperada** | ~32 pontos/sprint |

### Stack de Produção

| Camada | Tecnologia |
|--------|------------|
| **Mobile** | React Native com Expo |
| **Backend** | NestJS com TypeORM |
| **Banco de Dados** | PostgreSQL com PostGIS e pgvector |
| **Infraestrutura** | Kubernetes |
| **CI/CD** | GitHub Actions |
| **Autenticação** | OAuth2/OIDC (Keycloak/Cognito) |
| **Observabilidade** | Grafana + Sentry |
| **Automação** | N8N |

---

## 2. Épicos Mapeados

| Épico | Caso de Uso | Descrição | Sprint Principal |
|-------|-------------|-----------|------------------|
| E01 | CSU001 | Acolhimento Digital com IA | Sprint 2 |
| E02 | CSU002 | Audiências Públicas e Gestão de Interesse | Sprint 7 |
| E03 | CSU003 | Navegação Institucional | Sprint 8 |
| E04 | CSU004 | Avaliação Geolocalizada de Serviços | Sprint 6 |
| E05 | CSU005 | Diagnóstico de Transporte Público | Sprint 4 |
| E06 | CSU006 | Dashboard de Análise de Demandas | Sprint 10 |
| E07 | CSU007 | Mapa de Serviços Públicos | Sprint 5 |
| E08 | CSU008 | Relato Urbano Estruturado | Sprint 3 |
| E09 | - | Autenticação e Gestão de Usuários | Sprint 1 |
| E10 | - | Área Administrativa | Sprint 9 |
| E11 | - | Integrações Externas (N8N, APIs) | Sprint 11 |
| E12 | - | Infraestrutura e DevOps | Sprint 0, 12 |

---

## Sprint 0 - Fundação

**Duração:** Semanas 1-2  
**Objetivo:** Estabelecer a infraestrutura base e setup de projeto.  
**Épico Principal:** E12 (Infraestrutura e DevOps)

### Histórias de Usuário

| ID | História | Pontos | Critérios de Aceite |
|----|----------|:------:|---------------------|
| S0-01 | Como desenvolvedor, quero ter o projeto React Native inicializado com Expo para começar o desenvolvimento mobile | 8 | ✓ Projeto criado com TypeScript<br>✓ Estrutura de pastas definida<br>✓ Navegação base configurada (React Navigation)<br>✓ Lint e Prettier configurados |
| S0-02 | Como desenvolvedor, quero ter o backend NestJS configurado com TypeORM para implementar as APIs | 8 | ✓ Projeto criado com TypeScript<br>✓ Conexão com PostgreSQL funcional<br>✓ Estrutura modular definida<br>✓ Swagger configurado |
| S0-03 | Como DevOps, quero ter o ambiente de CI/CD configurado para automatizar deploys | 5 | ✓ GitHub Actions configurado<br>✓ Ambientes dev/staging/prod definidos<br>✓ Build automatizado funcionando |
| S0-04 | Como DevOps, quero ter o PostgreSQL configurado com extensões PostGIS e pgvector | 5 | ✓ Banco criado com extensões<br>✓ Migrations iniciais rodando<br>✓ Backup automatizado configurado |
| S0-05 | Como desenvolvedor, quero ter o design system base implementado seguindo o protótipo | 5 | ✓ Componentes UI base: Button, Input, Card, Typography<br>✓ Tokens de cores e tipografia<br>✓ Tema claro/escuro |

**Total Sprint 0:** 31 pontos

### Entregáveis
- [ ] Repositório monorepo configurado
- [ ] Projeto React Native funcional
- [ ] API NestJS com health check
- [ ] Pipeline CI/CD operacional
- [ ] Banco de dados provisionado
- [ ] Design system inicial documentado

---

## Sprint 1 - Autenticação e Onboarding

**Duração:** Semanas 3-4  
**Objetivo:** Implementar fluxo completo de autenticação e primeiro acesso.  
**Épicos:** E09 (Autenticação), E01 (Acolhimento)

### Histórias de Usuário

| ID | História | Pontos | Critérios de Aceite |
|----|----------|:------:|---------------------|
| S1-01 | Como cidadão, quero visualizar a tela de boas-vindas para entender os benefícios do app | 3 | ✓ Carrossel funcional com 3+ slides<br>✓ Navegação para login/registro<br>✓ Animações suaves |
| S1-02 | Como cidadão, quero me cadastrar com email e senha para criar minha conta | 5 | ✓ Validação de campos (email, senha forte)<br>✓ Confirmação de email enviada<br>✓ Feedback de sucesso/erro<br>✓ Loading states |
| S1-03 | Como cidadão, quero fazer login com minhas credenciais para acessar o app | 3 | ✓ Autenticação JWT funcional<br>✓ Persistência de sessão<br>✓ Logout funcional<br>✓ Tratamento de erros |
| S1-04 | Como cidadão, quero recuperar minha senha por email para voltar a acessar minha conta | 3 | ✓ Email de recuperação enviado<br>✓ Link de reset funcional (expira em 1h)<br>✓ Nova senha salva com sucesso |
| S1-05 | Como cidadão, quero completar o onboarding em 3 etapas para personalizar minha experiência | 5 | ✓ Etapa 1: Dados pessoais (nome, telefone opcional)<br>✓ Etapa 2: Interesses (seleção múltipla)<br>✓ Etapa 3: Localização (endereço ou GPS)<br>✓ Progresso visual |
| S1-06 | Como sistema, quero armazenar o perfil do usuário com dados demográficos opcionais | 3 | ✓ Tabela profiles criada<br>✓ Campos opcionais funcionando<br>✓ LGPD: consentimento registrado |
| S1-07 | Como cidadão, quero que o app lembre minha sessão para não precisar logar toda vez | 2 | ✓ Token refresh implementado<br>✓ Sessão persistente por 30 dias<br>✓ Secure storage para tokens |

**Total Sprint 1:** 24 pontos

### Entregáveis
- [ ] Fluxo de registro completo
- [ ] Fluxo de login completo
- [ ] Recuperação de senha funcional
- [ ] Onboarding em 3 etapas
- [ ] Persistência de sessão
- [ ] Tabelas de perfil no banco

---

## Sprint 2 - Home e Assistente de IA Base

**Duração:** Semanas 5-6  
**Objetivo:** Implementar a interface de chat e o orquestrador de IA básico.  
**Épico Principal:** E01 (Acolhimento Digital com IA)

### Histórias de Usuário

| ID | História | Pontos | Critérios de Aceite |
|----|----------|:------:|---------------------|
| S2-01 | Como cidadão, quero ver uma saudação personalizada ao abrir o app para me sentir acolhido | 3 | ✓ Saudação por horário (Bom dia/tarde/noite)<br>✓ Nome do usuário exibido<br>✓ Informações contextuais (pendências, próximas audiências) |
| S2-02 | Como cidadão, quero ter uma interface de chat para conversar com o assistente | 5 | ✓ Input de texto funcional<br>✓ Histórico de mensagens visível<br>✓ Scroll automático para última mensagem<br>✓ Suporte a mensagens longas |
| S2-03 | Como cidadão, quero ver chips de ação rápida para iniciar jornadas comuns | 3 | ✓ Chips clicáveis: "Relatar problema", "Buscar serviço", "Ver audiências"<br>✓ Chips contextuais baseados no histórico<br>✓ Animação de feedback |
| S2-04 | Como sistema, quero um orquestrador de IA que detecte a intenção do usuário | 8 | ✓ Classificação de 7 intenções principais<br>✓ Confiança >80% para ação automática<br>✓ Fallback para clarificação<br>✓ Logs de intenções detectadas |
| S2-05 | Como sistema, quero gerenciar o contexto da conversa para manter fluidez | 5 | ✓ Histórico de 10 mensagens mantido<br>✓ Contexto da jornada ativa preservado<br>✓ Reset de contexto ao mudar de jornada |
| S2-06 | Como cidadão, quero ver um indicador quando o assistente está "pensando" | 2 | ✓ Typing indicator animado<br>✓ Timeout de 30s com mensagem de erro<br>✓ Cancelamento possível |
| S2-07 | Como cidadão, quero poder acessar minhas conversas anteriores | 3 | ✓ Lista de conversas com título/data<br>✓ Retomada de contexto ao abrir<br>✓ Exclusão de conversas |

**Total Sprint 2:** 29 pontos

### Intenções do Orquestrador (S2-04)

| Intenção | Descrição | Ferramenta Acionada |
|----------|-----------|---------------------|
| `criar_relato_urbano` | Usuário quer reportar problema na cidade | Jornada de relato urbano |
| `relatar_transporte` | Problema com transporte público | Jornada de transporte |
| `buscar_servicos` | Procura por serviços próximos | Mapa de serviços |
| `avaliar_servico` | Quer avaliar um serviço visitado | Fluxo de avaliação |
| `buscar_audiencias` | Interesse em audiências públicas | Lista de audiências |
| `informacao_institucional` | Dúvidas sobre a Câmara/legislativo | RAG institucional |
| `conversa_geral` | Saudações, agradecimentos, outros | Resposta conversacional |

### Entregáveis
- [ ] Interface de chat funcional
- [ ] Orquestrador de IA com 7 intenções
- [ ] Sistema de contexto de conversa
- [ ] Chips de ação rápida
- [ ] Histórico de conversas
- [ ] Saudação contextual

---

## Sprint 3 - Relato Urbano Estruturado

**Duração:** Semanas 7-8  
**Objetivo:** Implementar a jornada completa de relato urbano via chat.  
**Épico Principal:** E08 (Relato Urbano Estruturado)

### Histórias de Usuário

| ID | História | Pontos | Critérios de Aceite |
|----|----------|:------:|---------------------|
| S3-01 | Como cidadão, quero relatar um problema urbano descrevendo em linguagem natural | 5 | ✓ Detecção de categoria com >80% confiança<br>✓ Subcategoria identificada<br>✓ Confirmação com usuário se confiança <80% |
| S3-02 | Como sistema, quero coletar o endereço de forma estruturada via perguntas atômicas | 5 | ✓ Logradouro coletado<br>✓ Número ou ponto de referência<br>✓ Bairro identificado<br>✓ CEP validado (formato) |
| S3-03 | Como sistema, quero geocodificar o endereço informado para obter coordenadas | 3 | ✓ Integração Google Places funcional<br>✓ Validação de endereço em São Paulo<br>✓ Fallback para endereço manual |
| S3-04 | Como cidadão, quero ver o progresso da coleta de dados em um tracker visual | 3 | ✓ DataCollectionTracker exibido<br>✓ Campos preenchidos vs pendentes<br>✓ Progresso em porcentagem |
| S3-05 | Como sistema, quero coletar dados de impacto para categorias de risco | 5 | ✓ Nível de risco (baixo/médio/alto/crítico)<br>✓ Tipos de risco selecionáveis<br>✓ Escopo afetado (residência/rua/bairro)<br>✓ Motivo da urgência |
| S3-06 | Como cidadão, quero receber um protocolo único ao finalizar meu relato | 3 | ✓ Protocolo URB-YYYY-NNNNNN gerado<br>✓ Geração atômica (sem duplicatas)<br>✓ Exibido claramente na confirmação |
| S3-07 | Como cidadão, quero ver um resumo do meu relato antes da confirmação final | 2 | ✓ Card de resumo com todos os dados<br>✓ Opção de editar antes de enviar<br>✓ Botão de confirmar destacado |
| S3-08 | Como sistema, quero validar a descrição com mínimo de 30 caracteres | 2 | ✓ Mensagem de erro clara se abaixo do mínimo<br>✓ Contador de caracteres visível<br>✓ Sugestão de detalhamento |

**Total Sprint 3:** 28 pontos

### Categorias de Relato Urbano

| Categoria | Subcategorias Exemplo |
|-----------|----------------------|
| Iluminação | Lâmpada queimada, poste danificado, falta de luz |
| Pavimentação | Buraco, calçada quebrada, asfalto danificado |
| Limpeza | Entulho, lixo acumulado, bueiro entupido |
| Árvores | Poda necessária, árvore caída, risco de queda |
| Sinalização | Placa danificada, semáforo com defeito |
| Acessibilidade | Rampa bloqueada, faixa apagada |
| Outros | Categorização manual |

### Entregáveis
- [ ] Jornada de relato urbano completa
- [ ] Coleta estruturada de endereço
- [ ] Geocodificação funcional
- [ ] Tracker de coleta de dados
- [ ] Geração de protocolo atômica
- [ ] Classificação por IA

---

## Sprint 4 - Diagnóstico de Transporte

**Duração:** Semanas 9-10  
**Objetivo:** Implementar a jornada de relatos de transporte público.  
**Épico Principal:** E05 (Diagnóstico de Transporte Público)

### Histórias de Usuário

| ID | História | Pontos | Critérios de Aceite |
|----|----------|:------:|---------------------|
| S4-01 | Como cidadão, quero relatar problemas no transporte público via chat | 5 | ✓ Detecção de tipo de problema<br>✓ Categorias: atraso, lotação, segurança, limpeza, acessibilidade<br>✓ Descrição livre aceita |
| S4-02 | Como cidadão, quero informar a linha ou estação afetada | 5 | ✓ Busca autocomplete de linhas cadastradas<br>✓ Input manual se não encontrada<br>✓ Validação de formato de linha |
| S4-03 | Como sistema, quero coletar data e hora da ocorrência | 3 | ✓ Aceita "hoje", "ontem", data específica<br>✓ Inferência de hora a partir do contexto<br>✓ Validação de data não futura |
| S4-04 | Como cidadão, quero classificar a severidade do problema | 2 | ✓ Opções: Leve, Moderado, Grave<br>✓ Descrição de cada nível<br>✓ Seleção única obrigatória |
| S4-05 | Como sistema, quero gerar protocolo TRP-YYYY-NNNNNN para transporte | 2 | ✓ Sequência atômica separada de urbano<br>✓ Formato consistente<br>✓ Exibido na confirmação |
| S4-06 | Como sistema, quero detectar padrões de relatos similares | 5 | ✓ Alerta se 3+ relatos similares em 7 dias<br>✓ Mesma linha + mesmo tipo de problema<br>✓ Registro de padrão detectado |
| S4-07 | Como cidadão, quero ver padrões detectados pela IA | 3 | ✓ Tela de padrões acessível<br>✓ Cards de alertas por linha<br>✓ Quantidade de relatos e período |

**Total Sprint 4:** 25 pontos

### Tipos de Problema de Transporte

| Tipo | Descrição |
|------|-----------|
| Atraso | Veículo atrasado, não passou no horário |
| Lotação | Veículo superlotado |
| Segurança | Assalto, assédio, briga |
| Limpeza | Veículo sujo, mau cheiro |
| Acessibilidade | Elevador quebrado, rampa bloqueada |
| Manutenção | Ar condicionado, portas, bancos |
| Conduta | Motorista imprudente, falta de educação |
| Outro | Outros problemas |

### Entregáveis
- [ ] Jornada de relato de transporte
- [ ] Busca de linhas com autocomplete
- [ ] Coleta de data/hora
- [ ] Classificação de severidade
- [ ] Geração de protocolo TRP
- [ ] Detecção de padrões

---

## Sprint 5 - Mapa de Serviços Públicos

**Duração:** Semanas 11-12  
**Objetivo:** Implementar busca e visualização de serviços públicos.  
**Épico Principal:** E07 (Mapa de Serviços Públicos)

### Histórias de Usuário

| ID | História | Pontos | Critérios de Aceite |
|----|----------|:------:|---------------------|
| S5-01 | Como cidadão, quero ver um mapa com serviços públicos próximos | 5 | ✓ Mapa Mapbox funcional<br>✓ Marcadores diferenciados por tipo<br>✓ Centralizado na localização do usuário<br>✓ Zoom e pan funcionais |
| S5-02 | Como cidadão, quero filtrar serviços por tipo | 3 | ✓ Filtros: UBS, Escola, Hospital, CEU, Biblioteca<br>✓ Múltipla seleção permitida<br>✓ Atualização em tempo real do mapa |
| S5-03 | Como cidadão, quero ajustar o raio de busca | 3 | ✓ Slider de 1km a 10km<br>✓ Padrão 2km<br>✓ Círculo visual no mapa |
| S5-04 | Como cidadão, quero ver detalhes de um serviço ao clicar no marcador | 3 | ✓ Drawer com informações completas<br>✓ Nome, endereço, telefone, horários<br>✓ Botões de ação (ligar, rota, avaliar) |
| S5-05 | Como cidadão, quero ver a avaliação média e comentários | 3 | ✓ Estrelas + total de avaliações<br>✓ Lista de comentários recentes<br>✓ Ordenação por data |
| S5-06 | Como cidadão, quero traçar rota até um serviço | 5 | ✓ Integração Mapbox Directions<br>✓ Tempo estimado exibido<br>✓ Opções: carro, a pé, transporte público |
| S5-07 | Como cidadão, quero favoritar serviços | 2 | ✓ Ícone de favorito funcional<br>✓ Lista de favoritos acessível<br>✓ Persistência no perfil |
| S5-08 | Como cidadão, quero buscar serviços via chat | 5 | ✓ Ferramenta `buscar_servicos_proximos` integrada<br>✓ Resposta com lista e link para mapa<br>✓ Sugestão de mais próximo |

**Total Sprint 5:** 29 pontos

### Tipos de Serviço

| Tipo | Ícone | Cor |
|------|-------|-----|
| UBS | 🏥 | Verde |
| Hospital | 🏨 | Vermelho |
| Escola | 🏫 | Azul |
| CEU | 🎭 | Roxo |
| Biblioteca | 📚 | Laranja |
| Centro Esportivo | ⚽ | Verde escuro |
| Outro | 📍 | Cinza |

### Entregáveis
- [ ] Mapa Mapbox integrado
- [ ] Filtros por tipo de serviço
- [ ] Ajuste de raio de busca
- [ ] Detalhes de serviço em drawer
- [ ] Rotas com Directions API
- [ ] Sistema de favoritos
- [ ] Integração com chat

---

## Sprint 6 - Avaliação de Serviços

**Duração:** Semanas 13-14  
**Objetivo:** Implementar sistema de avaliação geolocalizada.  
**Épico Principal:** E04 (Avaliação Geolocalizada de Serviços)

### Histórias de Usuário

| ID | História | Pontos | Critérios de Aceite |
|----|----------|:------:|---------------------|
| S6-01 | Como sistema, quero detectar quando o usuário visita um serviço | 8 | ✓ Geofencing configurado (raio 50m)<br>✓ Permanência mínima de 10 min<br>✓ Background location ativo<br>✓ Otimizado para bateria |
| S6-02 | Como cidadão, quero receber notificação para avaliar após sair | 3 | ✓ Push notification 30 min após saída<br>✓ Deep link para avaliação<br>✓ Respeita horário quieto (22h-8h) |
| S6-03 | Como cidadão, quero confirmar que visitei o serviço | 2 | ✓ Botões "Sim, visitei" / "Não visitei"<br>✓ Descarte se "Não"<br>✓ Registro de falso positivo |
| S6-04 | Como cidadão, quero dar nota de 1 a 5 estrelas | 3 | ✓ Interface de estrelas interativa<br>✓ Feedback visual ao selecionar<br>✓ Nota obrigatória para enviar |
| S6-05 | Como cidadão, quero deixar um comentário opcional | 2 | ✓ Campo de texto livre<br>✓ Mínimo não obrigatório<br>✓ Máximo 500 caracteres |
| S6-06 | Como sistema, quero calcular e atualizar a média de avaliações | 3 | ✓ Cálculo automático ao receber avaliação<br>✓ Atualização do campo `average_rating`<br>✓ Exibição atualizada no mapa |
| S6-07 | Como cidadão, quero ver minhas avaliações pendentes na home | 3 | ✓ Badge na saudação contextual<br>✓ Lista de pendências acessível<br>✓ Prazo de 7 dias para avaliar |
| S6-08 | Como cidadão, quero avaliar anonimamente | 2 | ✓ Toggle de anonimato funcional<br>✓ Nome não exibido se anônimo<br>✓ Padrão: identificado |

**Total Sprint 6:** 26 pontos

### Fluxo de Avaliação

```
Usuário entra em geofence (50m) de serviço
    ↓
Permanece 10+ minutos
    ↓
Sai do geofence
    ↓
30 min depois: Push notification
    ↓
Usuário confirma visita → Tela de avaliação
    ↓
Estrelas (obrigatório) + Comentário (opcional)
    ↓
Envio → Atualização da média
```

### Entregáveis
- [ ] Geofencing funcional
- [ ] Detecção de visitas
- [ ] Push notifications
- [ ] Interface de avaliação
- [ ] Cálculo de médias
- [ ] Avaliações anônimas
- [ ] Pendências na home

---

## Sprint 7 - Audiências Públicas

**Duração:** Semanas 15-16  
**Objetivo:** Implementar módulo de audiências públicas.  
**Épico Principal:** E02 (Audiências Públicas e Gestão de Interesse)

### Histórias de Usuário

| ID | História | Pontos | Critérios de Aceite |
|----|----------|:------:|---------------------|
| S7-01 | Como cidadão, quero listar audiências públicas com filtros | 5 | ✓ Filtros: tema, status, data<br>✓ Status: Agendada, Ao Vivo, Encerrada<br>✓ Ordenação por data<br>✓ Paginação |
| S7-02 | Como cidadão, quero ver detalhes completos de uma audiência | 3 | ✓ Título, descrição, tema<br>✓ Data, hora, local<br>✓ Link de transmissão (se houver)<br>✓ Documentos anexos |
| S7-03 | Como cidadão, quero me inscrever em uma audiência | 3 | ✓ Validação de vagas disponíveis<br>✓ Inscrição registrada com sucesso<br>✓ Email de confirmação<br>✓ Opção de cancelar |
| S7-04 | Como cidadão, quero receber notificações sobre audiências inscritas | 3 | ✓ 24h antes: lembrete<br>✓ 1h antes: lembrete final<br>✓ No início: link de transmissão |
| S7-05 | Como cidadão, quero adicionar audiência ao calendário | 2 | ✓ Deep link para Google Calendar<br>✓ Deep link para Apple Calendar<br>✓ Dados preenchidos automaticamente |
| S7-06 | Como cidadão, quero favoritar audiências | 2 | ✓ Ícone de favorito funcional<br>✓ Notificações de atualizações<br>✓ Lista de favoritos |
| S7-07 | Como cidadão, quero buscar audiências via chat | 5 | ✓ Ferramenta `buscar_audiencias` integrada<br>✓ Filtro por tema/data via linguagem natural<br>✓ Link para detalhes |
| S7-08 | Como cidadão, quero ser notificado sobre audiências de meus interesses | 3 | ✓ Match com interesses do perfil<br>✓ Notificação de nova audiência<br>✓ Configurável nas preferências |

**Total Sprint 7:** 26 pontos

### Status de Audiência

| Status | Descrição | Cor |
|--------|-----------|-----|
| Agendada | Audiência futura | Azul |
| Ao Vivo | Acontecendo agora | Verde |
| Encerrada | Já realizada | Cinza |
| Cancelada | Foi cancelada | Vermelho |

### Entregáveis
- [ ] Lista de audiências com filtros
- [ ] Detalhes de audiência
- [ ] Sistema de inscrição
- [ ] Notificações programadas
- [ ] Integração com calendário
- [ ] Busca via chat
- [ ] Recomendações por interesse

---

## Sprint 8 - Navegação Institucional

**Duração:** Semanas 17-18  
**Objetivo:** Implementar área institucional da Câmara.  
**Épico Principal:** E03 (Navegação Institucional)

### Histórias de Usuário

| ID | História | Pontos | Critérios de Aceite |
|----|----------|:------:|---------------------|
| S8-01 | Como cidadão, quero ver a lista de vereadores | 3 | ✓ Grid de cards com foto e partido<br>✓ Busca por nome funcional<br>✓ Filtro por partido |
| S8-02 | Como cidadão, quero ver o perfil completo de um vereador | 3 | ✓ Foto, biografia, áreas de atuação<br>✓ Contato (email, telefone, redes)<br>✓ Comissões que participa |
| S8-03 | Como cidadão, quero ver notícias legislativas | 3 | ✓ Feed de notícias<br>✓ Paginação infinita<br>✓ Filtro por categoria |
| S8-04 | Como cidadão, quero ler uma notícia completa | 2 | ✓ Página de detalhe<br>✓ Imagens carregadas<br>✓ Botão de compartilhar |
| S8-05 | Como cidadão, quero ver a agenda da Câmara | 3 | ✓ Calendário com eventos<br>✓ Sessões plenárias destacadas<br>✓ Audiências integradas |
| S8-06 | Como cidadão, quero acessar conteúdo educacional | 3 | ✓ Seção "Conheça a Câmara"<br>✓ Seção "Câmara Explica"<br>✓ Seção "Escola do Parlamento" |
| S8-07 | Como cidadão, quero tirar dúvidas sobre a Câmara via chat | 5 | ✓ RAG com base de conhecimento institucional<br>✓ Fontes citadas nas respostas<br>✓ Fallback para atendimento humano |

**Total Sprint 8:** 22 pontos

### Seções Institucionais

| Seção | Conteúdo |
|-------|----------|
| Conheça a Câmara | História, estrutura, funcionamento |
| Câmara Explica | Explicações sobre projetos de lei, votações |
| Escola do Parlamento | Cursos, materiais educativos |
| Vereadores | Lista e perfis individuais |
| Notícias | Feed de notícias legislativas |
| Agenda | Calendário de eventos e sessões |

### Entregáveis
- [ ] Lista de vereadores
- [ ] Perfis individuais
- [ ] Feed de notícias
- [ ] Agenda da Câmara
- [ ] Conteúdo educacional
- [ ] RAG institucional no chat

---

## Sprint 9 - Área Administrativa

**Duração:** Semanas 19-20  
**Objetivo:** Implementar painel de gestão para administradores.  
**Épico Principal:** E10 (Área Administrativa)

### Histórias de Usuário

| ID | História | Pontos | Critérios de Aceite |
|----|----------|:------:|---------------------|
| S9-01 | Como gestor, quero ver um dashboard com KPIs de manifestações | 5 | ✓ Total de manifestações<br>✓ Pendentes vs resolvidas<br>✓ Tempo médio de resposta<br>✓ Gráfico de tendência |
| S9-02 | Como gestor, quero ver manifestações em formato de tabela | 3 | ✓ Colunas configuráveis<br>✓ Ordenação por qualquer coluna<br>✓ Paginação funcional<br>✓ Filtros combinados |
| S9-03 | Como gestor, quero ver manifestações em formato Kanban | 5 | ✓ Colunas por status<br>✓ Drag-and-drop funcional<br>✓ Contadores por coluna<br>✓ Atualização em tempo real |
| S9-04 | Como gestor, quero ver detalhes completos de uma manifestação | 3 | ✓ Drawer lateral com todas as informações<br>✓ Histórico de alterações<br>✓ Anexos visualizáveis |
| S9-05 | Como gestor, quero alterar o status de uma manifestação | 2 | ✓ Transições válidas respeitadas<br>✓ Registro em audit log<br>✓ Notificação ao cidadão |
| S9-06 | Como gestor, quero responder uma manifestação | 3 | ✓ Campo de texto para resposta<br>✓ Opção público/interno<br>✓ Resposta visível para cidadão (se pública) |
| S9-07 | Como gestor, quero encaminhar manifestação para vereador | 5 | ✓ Sugestão por relevância (match por área)<br>✓ Motivo do match exibido<br>✓ Confirmação antes de enviar<br>✓ Registro do encaminhamento |
| S9-08 | Como admin, quero gerenciar usuários e roles | 5 | ✓ Lista de usuários com busca<br>✓ Atribuição de roles (admin, gestor, cidadão)<br>✓ Desativação de usuários |
| S9-09 | Como admin, quero ver logs de auditoria | 3 | ✓ Todas as ações registradas<br>✓ Filtros por período, ação, usuário<br>✓ Exportação em CSV |

**Total Sprint 9:** 34 pontos

### Roles e Permissões

| Role | Permissões |
|------|------------|
| Cidadão | Criar manifestações, avaliar serviços, ver próprio histórico |
| Gestor | Visualizar todas as manifestações, responder, encaminhar |
| Vereador | Receber encaminhamentos, responder manifestações próprias |
| Assessor | Apoiar vereador, visualizar encaminhamentos do gabinete |
| Admin | Acesso total, gerenciar usuários, configurações do sistema |

### Entregáveis
- [ ] Dashboard com KPIs
- [ ] Visualização em tabela
- [ ] Visualização em Kanban
- [ ] Detalhes de manifestação
- [ ] Gestão de status
- [ ] Sistema de respostas
- [ ] Encaminhamento para vereadores
- [ ] Gestão de usuários
- [ ] Logs de auditoria

---

## Sprint 10 - Analytics e Dashboards

**Duração:** Semanas 21-22  
**Objetivo:** Implementar visualizações analíticas avançadas.  
**Épico Principal:** E06 (Dashboard de Análise de Demandas)

### Histórias de Usuário

| ID | História | Pontos | Critérios de Aceite |
|----|----------|:------:|---------------------|
| S10-01 | Como gestor, quero ver gráficos de distribuição por categoria | 3 | ✓ Gráfico de barras horizontais<br>✓ Drill-down por subcategoria<br>✓ Período configurável |
| S10-02 | Como gestor, quero ver tendências temporais | 5 | ✓ Gráfico de linha<br>✓ Períodos: 7d, 30d, 90d, 1a<br>✓ Comparativo com período anterior |
| S10-03 | Como gestor, quero ver análise de sentimento | 5 | ✓ Gauge de sentimento geral<br>✓ Drivers de sentimento (palavras-chave)<br>✓ Tendência do sentimento |
| S10-04 | Como gestor, quero ver distribuição demográfica | 3 | ✓ Pirâmide etária<br>✓ Gráficos de pizza (gênero, região)<br>✓ Filtros aplicáveis |
| S10-05 | Como gestor, quero exportar dados | 3 | ✓ Exportação em CSV<br>✓ Exportação em Excel<br>✓ Filtros aplicados na exportação<br>✓ Log de export |
| S10-06 | Como gestor, quero ver mapa de calor geográfico | 5 | ✓ Heatmap de concentração de manifestações<br>✓ Filtro por categoria<br>✓ Zoom e pan funcionais |
| S10-07 | Como gestor, quero drill-down em métricas | 5 | ✓ Clique em gráfico abre detalhes<br>✓ Navegação em profundidade<br>✓ Breadcrumbs de contexto |
| S10-08 | Como cidadão engajado, quero ver dashboards públicos | 3 | ✓ Versão simplificada<br>✓ Sem dados sensíveis<br>✓ Estatísticas agregadas |

**Total Sprint 10:** 32 pontos

### Tipos de Visualização

| Visualização | Uso |
|--------------|-----|
| Gráfico de Barras | Distribuição por categoria |
| Gráfico de Linha | Tendências temporais |
| Gauge | Sentimento, criticidade |
| Mapa de Calor | Concentração geográfica |
| Pirâmide | Distribuição etária |
| Donut | Proporções (status, tipo) |
| Wordcloud | Palavras-chave frequentes |

### Entregáveis
- [ ] Gráficos de distribuição
- [ ] Análise temporal
- [ ] Análise de sentimento
- [ ] Dados demográficos
- [ ] Exportação de dados
- [ ] Mapa de calor
- [ ] Drill-down funcional
- [ ] Dashboard público

---

## Sprint 11 - Integrações Externas

**Duração:** Semanas 23-24  
**Objetivo:** Conectar com sistemas externos e automações.  
**Épico Principal:** E11 (Integrações Externas)

### Histórias de Usuário

| ID | História | Pontos | Critérios de Aceite |
|----|----------|:------:|---------------------|
| S11-01 | Como sistema, quero integrar com N8N para automação | 8 | ✓ Webhooks configuráveis<br>✓ Eventos: novo relato, mudança de status<br>✓ Retry em caso de falha<br>✓ Logs de envio |
| S11-02 | Como admin, quero configurar a integração N8N | 3 | ✓ Interface de configuração<br>✓ URL do webhook<br>✓ Secret key para validação<br>✓ Seleção de eventos |
| S11-03 | Como admin, quero monitorar execuções de workflows | 3 | ✓ Lista de execuções<br>✓ Status de cada envio<br>✓ Detalhes de erro se falha |
| S11-04 | Como sistema, quero sincronizar vereadores da API SP Legis | 5 | ✓ Cron diário às 3h<br>✓ Atualização incremental<br>✓ Log de sincronização<br>✓ Alerta se falha |
| S11-05 | Como sistema, quero sincronizar notícias do Portal CMSP | 5 | ✓ Polling a cada 15 min<br>✓ Deduplicação por ID externo<br>✓ Categorização automática |
| S11-06 | Como sistema, quero sincronizar audiências públicas | 5 | ✓ API externa consultada a cada 1h<br>✓ Atualização de status<br>✓ Notificação de novas audiências |
| S11-07 | Como sistema, quero enviar push notifications via FCM | 5 | ✓ Firebase FCM integrado<br>✓ Topics por interesse<br>✓ Notificações agendadas |
| S11-08 | Como sistema, quero indexar documentos para RAG | 8 | ✓ Parser de PDF/DOC<br>✓ Chunking de textos longos<br>✓ Geração de embeddings<br>✓ Armazenamento em pgvector |

**Total Sprint 11:** 42 pontos

### Fluxo de Integração N8N

```
Evento no sistema (novo relato, mudança de status)
    ↓
Edge Function notify-n8n
    ↓
POST para webhook configurado
    ↓
N8N processa e executa workflow
    ↓
Callback para n8n-callback (se necessário)
    ↓
Log de execução registrado
```

### Entregáveis
- [ ] Integração N8N completa
- [ ] Painel de configuração
- [ ] Monitoramento de workflows
- [ ] Sincronização de vereadores
- [ ] Sincronização de notícias
- [ ] Sincronização de audiências
- [ ] Push notifications
- [ ] Pipeline de RAG

---

## Sprint 12 - Polimento e Lançamento

**Duração:** Semanas 25-26  
**Objetivo:** Finalizar, testar e preparar para produção.  
**Épicos:** E12 (Infraestrutura), todos

### Histórias de Usuário

| ID | História | Pontos | Critérios de Aceite |
|----|----------|:------:|---------------------|
| S12-01 | Como usuário, quero que o app funcione offline | 5 | ✓ Cache de dados essenciais<br>✓ Aviso de modo offline<br>✓ Sincronização ao reconectar<br>✓ Fila de ações pendentes |
| S12-02 | Como usuário, quero ajustar configurações de acessibilidade | 3 | ✓ Tamanho de fonte ajustável<br>✓ Alto contraste<br>✓ Espaçamento de texto<br>✓ Tema claro/escuro |
| S12-03 | Como desenvolvedor, quero cobertura de testes de 80%+ | 8 | ✓ Testes unitários (80%+ cobertura)<br>✓ Testes de integração para APIs<br>✓ Testes E2E para fluxos críticos<br>✓ CI rodando testes |
| S12-04 | Como DevOps, quero monitoramento completo | 5 | ✓ Grafana com dashboards<br>✓ Sentry para erros<br>✓ Alertas configurados<br>✓ Métricas de performance |
| S12-05 | Como DevOps, quero deploy automatizado em Kubernetes | 5 | ✓ ArgoCD configurado<br>✓ Rollback automático se falha<br>✓ Blue-green deployment<br>✓ Secrets em Vault |
| S12-06 | Como produto, quero métricas de analytics | 3 | ✓ Eventos de uso trackeados<br>✓ Funis de conversão<br>✓ Retention metrics<br>✓ Dashboard de analytics |
| S12-07 | Como usuário, quero tutorial de primeiro uso | 2 | ✓ Onboarding interativo<br>✓ Dicas contextuais<br>✓ Skip disponível<br>✓ Reacessível nas configurações |
| S12-08 | Como produto, quero landing page de download | 3 | ✓ Links para App Store<br>✓ Links para Play Store<br>✓ Informações do app<br>✓ Screenshots e vídeo |

**Total Sprint 12:** 34 pontos

### Checklist de Lançamento

- [ ] Todos os testes passando
- [ ] Performance validada (Lighthouse 90+)
- [ ] Acessibilidade validada (WCAG 2.1 AA)
- [ ] Segurança auditada (OWASP Top 10)
- [ ] LGPD compliance verificado
- [ ] Documentação atualizada
- [ ] Suporte configurado
- [ ] Métricas de baseline definidas
- [ ] Comunicação de lançamento pronta
- [ ] App submetido para review (App Store / Play Store)

### Entregáveis
- [ ] Modo offline funcional
- [ ] Acessibilidade completa
- [ ] Cobertura de testes 80%+
- [ ] Observabilidade operacional
- [ ] Deploy automatizado
- [ ] Analytics configurado
- [ ] Tutorial de primeiro uso
- [ ] Landing page publicada

---

## Resumo de Pontos por Sprint

| Sprint | Épico Principal | Pontos | Foco |
|:------:|-----------------|:------:|------|
| 0 | E12 | 31 | Setup e infraestrutura |
| 1 | E09, E01 | 24 | Autenticação e Onboarding |
| 2 | E01 | 29 | Home e IA Base |
| 3 | E08 | 28 | Relato Urbano |
| 4 | E05 | 25 | Transporte |
| 5 | E07 | 29 | Mapa de Serviços |
| 6 | E04 | 26 | Avaliação de Serviços |
| 7 | E02 | 26 | Audiências |
| 8 | E03 | 22 | Institucional |
| 9 | E10 | 34 | Admin |
| 10 | E06 | 32 | Analytics |
| 11 | E11 | 42 | Integrações |
| 12 | E12 | 34 | Polimento |
| **Total** | | **382** | **6 meses** |

### Distribuição Visual

```
Sprint 0  [████████████████████████████████] 31
Sprint 1  [███████████████████████████     ] 24
Sprint 2  [█████████████████████████████   ] 29
Sprint 3  [████████████████████████████    ] 28
Sprint 4  [█████████████████████████       ] 25
Sprint 5  [█████████████████████████████   ] 29
Sprint 6  [██████████████████████████      ] 26
Sprint 7  [██████████████████████████      ] 26
Sprint 8  [██████████████████████          ] 22
Sprint 9  [██████████████████████████████████] 34
Sprint 10 [████████████████████████████████] 32
Sprint 11 [██████████████████████████████████████████] 42
Sprint 12 [██████████████████████████████████] 34
```

---

## Dependências Críticas

### Diagrama de Dependências

```
┌─────────────┐
│  Sprint 0   │ ← Infraestrutura base
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Sprint 1   │ ← Autenticação (pré-requisito para todas as features)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Sprint 2   │ ← IA Base (pré-requisito para jornadas conversacionais)
└──────┬──────┘
       │
       ├────────────┬────────────┬────────────┬────────────┐
       ▼            ▼            ▼            ▼            ▼
┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐
│ Sprint 3  │ │ Sprint 4  │ │ Sprint 5  │ │ Sprint 6  │ │ Sprint 7  │
│ (Urbano)  │ │(Transp.)  │ │  (Mapa)   │ │ (Aval.)   │ │ (Aud.)    │
└─────┬─────┘ └─────┬─────┘ └───────────┘ └───────────┘ └───────────┘
      │             │
      └──────┬──────┘
             ▼
      ┌─────────────┐
      │  Sprint 8   │ ← Institucional (pode ser paralelo)
      └──────┬──────┘
             │
             ▼
      ┌─────────────┐
      │  Sprint 9   │ ← Admin (precisa de manifestações para gerenciar)
      └──────┬──────┘
             │
             ▼
      ┌─────────────┐
      │  Sprint 10  │ ← Analytics (precisa de dados para visualizar)
      └──────┬──────┘
             │
             ▼
      ┌─────────────┐
      │  Sprint 11  │ ← Integrações (precisa de admin configurado)
      └──────┬──────┘
             │
             ▼
      ┌─────────────┐
      │  Sprint 12  │ ← Polimento (todas as features prontas)
      └─────────────┘
```

### Dependências Detalhadas

| Sprint | Depende de | Motivo |
|--------|------------|--------|
| Sprint 1 | Sprint 0 | Infraestrutura base necessária |
| Sprint 2 | Sprint 1 | Autenticação antes do chat |
| Sprints 3-8 | Sprint 2 | IA base para jornadas conversacionais |
| Sprint 9 | Sprints 3, 4 | Manifestações existentes para gerenciar |
| Sprint 10 | Sprints 3-6 | Dados para gerar analytics |
| Sprint 11 | Sprint 9 | Admin configurado para integrações |
| Sprint 12 | Sprints 1-11 | Todas as features para polir |

### Sprints Paralelizáveis

Com equipe maior, as seguintes sprints podem ser executadas em paralelo:

- **Sprints 3, 4, 5, 6, 7** (após Sprint 2)
- **Sprint 8** (pode ser paralela a 3-7)

---

## Próximos Passos

### Fase 1: Validação (Semana 0)

- [ ] Apresentar plano para stakeholders
- [ ] Coletar feedback e ajustar escopo se necessário
- [ ] Confirmar disponibilidade da equipe
- [ ] Definir Definition of Ready (DoR) e Definition of Done (DoD)

### Fase 2: Preparação (Semana 0)

- [ ] Criar board no Jira/Linear/Azure DevOps
- [ ] Importar histórias de usuário
- [ ] Configurar sprints e milestones
- [ ] Definir cerimônias (planning, daily, review, retro)

### Fase 3: Refinamento (Semana 0)

- [ ] Refinar histórias do Sprint 0 e Sprint 1 com detalhes técnicos
- [ ] Quebrar histórias grandes (>8 pontos) em menores
- [ ] Identificar riscos técnicos e mitigações
- [ ] Preparar ambiente de desenvolvimento

### Fase 4: Execução (Semanas 1-26)

- [ ] Iniciar Sprint 0
- [ ] Manter cadência de sprints de 2 semanas
- [ ] Ajustar velocidade conforme dados reais
- [ ] Revisar e adaptar plano a cada 4 sprints

---

## Apêndice A: Glossário

| Termo | Definição |
|-------|-----------|
| **Épico** | Conjunto de histórias relacionadas a um objetivo maior |
| **História** | Funcionalidade descrita do ponto de vista do usuário |
| **Ponto** | Unidade de esforço relativo (não é tempo) |
| **Sprint** | Período fixo de desenvolvimento (2 semanas) |
| **DoR** | Definition of Ready - critérios para história estar pronta para sprint |
| **DoD** | Definition of Done - critérios para história estar concluída |
| **CSU** | Caso de Uso |
| **RAG** | Retrieval-Augmented Generation |
| **Geofencing** | Detecção de entrada/saída de área geográfica |

---

## Apêndice B: Referências

- [ESCOPO_E_ARQUITETURA_CAMARA_NA_MAO.md](./ESCOPO_E_ARQUITETURA_CAMARA_NA_MAO.md)
- [ENTREGA_PROTOTIPO_CAMARA_NA_MAO.md](./ENTREGA_PROTOTIPO_CAMARA_NA_MAO.md)
- [N8N_INTEGRATION_GUIDE.md](./N8N_INTEGRATION_GUIDE.md)

---

**Documento gerado em:** Janeiro 2025  
**Próxima revisão:** Após Sprint 4 (ajuste de velocidade)
