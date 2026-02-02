# Critérios de Aceite - MVP

**Data:** 2026-01-31  
**Versão:** 1.0  
**Objetivo:** Critérios de aceite para funcionalidades do MVP

---

## 📋 Índice

1. [Autenticação e Cadastro](#1-autenticação-e-cadastro)
2. [Chat AI e Orquestrador](#2-chat-ai-e-orquestrador)
3. [Relatos Urbanos](#3-relatos-urbanos)
4. [Relatos de Transporte](#4-relatos-de-transporte)
5. [Avaliação de Serviços](#5-avaliação-de-serviços)
6. [Audiências Públicas](#6-audiências-públicas)
7. [Perfil do Usuário](#7-perfil-do-usuário)
8. [Serviços Próximos](#8-serviços-próximos)
9. [Encaminhamento para Vereadores](#9-encaminhamento-para-vereadores)
10. [Área Administrativa](#10-área-administrativa)

---

## 1. Autenticação e Cadastro

### 1.1 Login

**Descrição:** Sistema de login funcional com validação

**Critérios:**
- ✅ Usuário pode fazer login com email e senha
- ✅ Validação de email (formato correto)
- ✅ Validação de senha (mínimo 6 caracteres)
- ✅ Mensagens de erro claras para credenciais inválidas
- ✅ Redirecionamento após login bem-sucedido
- ✅ Sessão mantida após refresh da página
- ✅ Logout funciona corretamente

**Como Validar:**
1. Acessar `/login`
2. Tentar login com email inválido → deve mostrar erro
3. Tentar login com senha incorreta → deve mostrar erro
4. Fazer login com credenciais válidas → deve redirecionar para `/`
5. Fazer refresh → deve manter sessão
6. Clicar em logout → deve deslogar e redirecionar

**Evidências:**
- Screenshot da tela de login
- Logs de autenticação no Supabase
- Teste E2E: `tests/e2e/auth.spec.ts`

**Status:** ✅ Aprovado

---

### 1.2 Cadastro

**Descrição:** Sistema de cadastro com validação em múltiplas etapas

**Critérios:**
- ✅ Cadastro em 2 etapas (dados pessoais + senha)
- ✅ Validação de nome (mínimo 3 caracteres)
- ✅ Validação de email (formato correto, único)
- ✅ Validação de telefone (máscara brasileira, 10-11 dígitos)
- ✅ Validação de senha (mínimo 6 caracteres)
- ✅ Confirmação de senha (deve coincidir)
- ✅ Aceite obrigatório de Termos de Uso
- ✅ Aceite obrigatório de Política de Privacidade
- ✅ Links para documentos funcionam
- ✅ Registro de consentimentos no banco
- ✅ Email de confirmação enviado (se configurado)

**Como Validar:**
1. Acessar `/cadastro`
2. Preencher Step 1 com dados inválidos → deve mostrar erros
3. Preencher Step 1 corretamente → deve avançar
4. Tentar avançar sem aceitar termos → botão deve estar desabilitado
5. Aceitar termos e preencher senha → deve criar conta
6. Verificar `user_consents` no banco → deve ter registros

**Evidências:**
- Screenshot do fluxo de cadastro
- Registro na tabela `profiles`
- Registros na tabela `user_consents`
- Teste E2E: `tests/e2e/auth.spec.ts`

**Status:** ✅ Aprovado

---

## 2. Chat AI e Orquestrador

### 2.1 Conversação Geral

**Descrição:** Chat AI responde conversas gerais de forma empática

**Critérios:**
- ✅ Chat responde saudações de forma simpática
- ✅ Chat detecta intenção do usuário
- ✅ Respostas em português brasileiro
- ✅ Tom empático e acolhedor
- ✅ Tempo de resposta <3 segundos
- ✅ Mensagens aparecem em tempo real (streaming)
- ✅ Histórico de conversas é mantido
- ✅ Suporte a múltiplas conversas simultâneas

**Como Validar:**
1. Acessar `/` ou `/chat`
2. Enviar "Olá, boa tarde"
3. Verificar resposta empática em <3s
4. Enviar múltiplas mensagens
5. Verificar que histórico é mantido
6. Fazer refresh → histórico deve persistir

**Evidências:**
- Screenshot da conversa
- Logs do `ai-orchestrator` no Supabase
- Tempo de resposta nos logs
- Teste E2E: `tests/e2e/ai-chat.spec.ts`

**Status:** ✅ Aprovado

---

### 2.2 Detecção de Intenção

**Descrição:** Sistema detecta automaticamente a intenção do usuário

**Critérios:**
- ✅ Detecta intenção de relato urbano
- ✅ Detecta intenção de relato de transporte
- ✅ Detecta intenção de avaliar serviço
- ✅ Detecta intenção de buscar serviços
- ✅ Detecta intenção de audiências
- ✅ Detecta conversa geral
- ✅ Aciona ferramenta apropriada automaticamente

**Como Validar:**
1. Enviar "Tem um buraco na rua"
2. Verificar que inicia jornada `urban_report`
3. Enviar "Ônibus atrasou"
4. Verificar que inicia jornada `transport_report`
5. Enviar "Quero avaliar uma UBS"
6. Verificar que inicia jornada `evaluate`

**Evidências:**
- Logs do `ai-orchestrator` mostrando `intent_detected`
- Logs mostrando `journey_id` correto
- Teste E2E: `tests/e2e/ai-chat.spec.ts`

**Status:** ✅ Aprovado

---

### 2.3 Tool-Calling Emulado

**Descrição:** Sistema chama ferramentas automaticamente quando dados estão completos

**Critérios:**
- ✅ Detecta quando todos os campos obrigatórios foram coletados
- ✅ Chama `create_urban_report` automaticamente
- ✅ Chama `create_transport_report` automaticamente
- ✅ Chama `create_service_rating` automaticamente
- ✅ Salva dados no banco corretamente
- ✅ Informa usuário sobre sucesso
- ✅ Trata erros de forma clara

**Como Validar:**
1. Iniciar relato urbano
2. Preencher todos os campos via chat
3. Verificar que relato é salvo automaticamente
4. Verificar mensagem de sucesso
5. Verificar registro no banco `urban_reports`

**Evidências:**
- Logs mostrando `[create_urban_report]` ou similar
- Registro na tabela correspondente
- Mensagem de sucesso no chat
- Teste E2E: `tests/e2e/urban.spec.ts`

**Status:** ✅ Aprovado

---

## 3. Relatos Urbanos

### 3.1 Coleta de Dados

**Descrição:** Sistema coleta todos os dados necessários para relato urbano

**Critérios:**
- ✅ Coleta tipo de problema (obrigatório)
- ✅ Coleta descrição (obrigatório)
- ✅ Coleta localização (obrigatório)
- ✅ Coleta fotos (opcional)
- ✅ Valida dados antes de salvar
- ✅ Classifica automaticamente problemas graves
- ✅ Pergunta campos faltantes de forma clara

**Como Validar:**
1. Iniciar relato urbano via chat
2. Preencher dados gradualmente
3. Tentar avançar sem campos obrigatórios → deve pedir
4. Preencher todos os campos
5. Verificar classificação automática (se problema grave)

**Evidências:**
- Conversa no chat mostrando coleta
- Logs do `ai-orchestrator`
- Teste E2E: `tests/e2e/urban.spec.ts`

**Status:** ✅ Aprovado

---

### 3.2 Salvamento

**Descrição:** Relatos urbanos são salvos corretamente no banco

**Critérios:**
- ✅ Dados são salvos na tabela `urban_reports`
- ✅ `user_id` é preenchido corretamente
- ✅ `status` inicial é `pending`
- ✅ `created_at` é preenchido
- ✅ Localização é salva como JSONB
- ✅ Fotos são salvas no storage (se houver)
- ✅ Relato aparece no histórico do usuário

**Como Validar:**
1. Criar relato urbano completo
2. Verificar tabela `urban_reports` no banco
3. Verificar que todos os campos estão corretos
4. Acessar `/relato-urbano/historico`
5. Verificar que relato aparece na lista

**Evidências:**
- Query SQL mostrando registro
- Screenshot do histórico
- Teste E2E: `tests/e2e/urban.spec.ts`

**Status:** ✅ Aprovado

---

### 3.3 Histórico

**Descrição:** Usuário pode ver histórico de seus relatos urbanos

**Critérios:**
- ✅ Lista todos os relatos do usuário
- ✅ Mostra status de cada relato
- ✅ Mostra data de criação
- ✅ Permite visualizar detalhes
- ✅ Permite editar (se pendente)
- ✅ Permite excluir (se pendente)
- ✅ Filtros funcionam (status, data, tipo)

**Como Validar:**
1. Acessar `/relato-urbano/historico`
2. Verificar lista de relatos
3. Clicar em um relato → ver detalhes
4. Testar filtros
5. Testar edição/exclusão

**Evidências:**
- Screenshot da página de histórico
- Teste E2E: `tests/e2e/urban.spec.ts`

**Status:** ✅ Aprovado

---

## 4. Relatos de Transporte

### 4.1 Coleta de Dados

**Descrição:** Sistema coleta dados de relatos de transporte

**Critérios:**
- ✅ Coleta linha (obrigatório)
- ✅ Coleta direção (obrigatório)
- ✅ Coleta tipo de problema (obrigatório)
- ✅ Coleta descrição (obrigatório)
- ✅ Coleta localização (opcional)
- ✅ Valida dados antes de salvar

**Como Validar:**
1. Iniciar relato de transporte via chat
2. Preencher dados gradualmente
3. Verificar validações
4. Completar relato

**Evidências:**
- Conversa no chat
- Teste E2E: `tests/e2e/transport.spec.ts`

**Status:** ✅ Aprovado

---

### 4.2 Salvamento

**Descrição:** Relatos de transporte são salvos corretamente

**Critérios:**
- ✅ Dados salvos na tabela `transport_reports`
- ✅ Todos os campos preenchidos corretamente
- ✅ Relato aparece no histórico

**Como Validar:**
1. Criar relato de transporte
2. Verificar banco de dados
3. Verificar histórico

**Evidências:**
- Query SQL
- Screenshot do histórico
- Teste E2E: `tests/e2e/transport.spec.ts`

**Status:** ✅ Aprovado

---

## 5. Avaliação de Serviços

### 5.1 Sistema de Avaliação

**Descrição:** Usuário pode avaliar serviços públicos

**Critérios:**
- ✅ Lista serviços pendentes de avaliação
- ✅ Sistema de estrelas (1-5) funciona
- ✅ Campo de comentário (opcional)
- ✅ Análise de sentimento automática
- ✅ Avaliação é salva no banco
- ✅ Avaliação aparece no histórico

**Como Validar:**
1. Acessar `/avaliacoes/historico`
2. Ver serviços pendentes
3. Selecionar estrelas
4. Adicionar comentário
5. Enviar avaliação
6. Verificar que foi salva

**Evidências:**
- Screenshot da avaliação
- Registro na tabela `service_ratings`
- Teste E2E: `tests/e2e/evaluation.spec.ts`

**Status:** ✅ Aprovado

---

## 6. Audiências Públicas

### 6.1 Listagem

**Descrição:** Usuário pode ver lista de audiências

**Critérios:**
- ✅ Lista todas as audiências disponíveis
- ✅ Mostra data, horário, tema
- ✅ Filtros funcionam (tema, data)
- ✅ Busca funciona
- ✅ Paginação funciona (se houver)

**Como Validar:**
1. Acessar `/audiencias`
2. Verificar lista
3. Testar filtros
4. Testar busca

**Evidências:**
- Screenshot da lista
- Teste E2E: `tests/e2e/audiencias.spec.ts`

**Status:** ✅ Aprovado

---

### 6.2 Inscrição

**Descrição:** Usuário pode se inscrever em audiências

**Critérios:**
- ✅ Botão de inscrição funciona
- ✅ Inscrição é salva no banco
- ✅ Confirmação é exibida
- ✅ Usuário pode cancelar inscrição
- ✅ Status é atualizado corretamente

**Como Validar:**
1. Clicar em "Inscrever-se"
2. Verificar confirmação
3. Verificar registro no banco
4. Testar cancelamento

**Evidências:**
- Registro na tabela `audiencia_participations`
- Screenshot da confirmação
- Teste E2E: `tests/e2e/audiencias.spec.ts`

**Status:** ✅ Aprovado

---

## 7. Perfil do Usuário

### 7.1 Visualização

**Descrição:** Usuário pode ver e editar seu perfil

**Critérios:**
- ✅ Página de perfil carrega corretamente
- ✅ Mostra dados pessoais
- ✅ Mostra foto de perfil
- ✅ Permite editar dados
- ✅ Validações funcionam
- ✅ Alterações são salvas

**Como Validar:**
1. Acessar `/perfil`
2. Verificar dados exibidos
3. Editar dados
4. Salvar
5. Verificar que foram salvos

**Evidências:**
- Screenshot do perfil
- Registro atualizado no banco
- Teste E2E: `tests/e2e/auth.spec.ts`

**Status:** ✅ Aprovado

---

## 8. Serviços Próximos

### 8.1 Busca Geográfica

**Descrição:** Sistema encontra serviços próximos à localização do usuário

**Critérios:**
- ✅ Solicita permissão de localização
- ✅ Encontra serviços próximos
- ✅ Mostra no mapa
- ✅ Filtros por tipo funcionam
- ✅ Distância é calculada corretamente
- ✅ Detalhes do serviço são exibidos

**Como Validar:**
1. Acessar `/servicos-proximos`
2. Permitir localização
3. Verificar serviços no mapa
4. Testar filtros
5. Clicar em serviço → ver detalhes

**Evidências:**
- Screenshot do mapa
- Logs de geolocalização
- Teste E2E: `tests/e2e/evaluation.spec.ts`

**Status:** ✅ Aprovado

---

## 9. Encaminhamento para Vereadores

### 9.1 Sugestão de Vereadores

**Descrição:** Sistema sugere vereadores relevantes para o relato

**Critérios:**
- ✅ Analisa conteúdo do relato
- ✅ Sugere vereadores por região/tema
- ✅ Mostra informações do vereador
- ✅ Permite selecionar vereador
- ✅ Permite adicionar nota/motivo

**Como Validar:**
1. Criar relato urbano
2. Clicar em "Encaminhar para vereador"
3. Verificar sugestões
4. Selecionar vereador
5. Adicionar nota
6. Encaminhar

**Evidências:**
- Screenshot das sugestões
- Registro na tabela `council_member_referrals`
- Teste E2E: `tests/e2e/urban.spec.ts`

**Status:** ✅ Aprovado

---

## 10. Área Administrativa

### 10.1 Dashboard

**Descrição:** Administradores têm acesso a dashboard completo

**Critérios:**
- ✅ Acesso restrito a admins
- ✅ Estatísticas são exibidas
- ✅ Gráficos funcionam
- ✅ Filtros de data funcionam
- ✅ Exportação funciona (se houver)

**Como Validar:**
1. Fazer login como admin
2. Acessar `/admin`
3. Verificar dashboard
4. Testar filtros
5. Testar exportação

**Evidências:**
- Screenshot do dashboard
- Verificação de permissões

**Status:** ✅ Aprovado

---

## 📊 Resumo

| Funcionalidade | Critérios | Status |
|----------------|-----------|--------|
| Autenticação | 2 | ✅ |
| Chat AI | 3 | ✅ |
| Relatos Urbanos | 3 | ✅ |
| Relatos de Transporte | 2 | ✅ |
| Avaliação de Serviços | 1 | ✅ |
| Audiências | 2 | ✅ |
| Perfil | 1 | ✅ |
| Serviços Próximos | 1 | ✅ |
| Encaminhamento | 1 | ✅ |
| Admin | 1 | ✅ |
| **TOTAL** | **17** | **✅ 100%** |

---

**Última atualização:** 2026-01-31
