# Critérios de Aceite - LGPD

**Data:** 2026-01-31  
**Versão:** 1.0  
**Objetivo:** Critérios de aceite para conformidade com a LGPD

---

## 📋 Índice

1. [Política de Privacidade](#1-política-de-privacidade)
2. [Consentimento de Dados](#2-consentimento-de-dados)
3. [Acesso aos Dados](#3-acesso-aos-dados)
4. [Correção de Dados](#4-correção-de-dados)
5. [Portabilidade de Dados](#5-portabilidade-de-dados)
6. [Exclusão de Dados](#6-exclusão-de-dados)
7. [Revogação de Consentimento](#7-revogação-de-consentimento)
8. [Segurança e Proteção](#8-segurança-e-proteção)

---

## 1. Política de Privacidade

### 1.1 Publicação e Acesso

**Descrição:** Política de privacidade deve estar publicada e acessível

**Critérios:**
- ✅ Página `/privacidade` existe e carrega
- ✅ Link no menu principal funciona
- ✅ Conteúdo completo e atualizado
- ✅ Data de última atualização visível
- ✅ Informações sobre coleta de dados
- ✅ Informações sobre uso de dados
- ✅ Informações sobre compartilhamento
- ✅ Informações sobre retenção
- ✅ Direitos do titular documentados
- ✅ Contato para dúvidas disponível

**Como Validar:**
1. Acessar `/privacidade`
2. Verificar que página carrega
3. Verificar conteúdo completo
4. Clicar em link do menu → deve redirecionar
5. Verificar data de atualização

**Evidências:**
- Screenshot da página
- Verificação de rota no `App.tsx`
- Arquivo: `src/pages/PrivacyPolicyPage.tsx`

**Status:** ✅ Aprovado

---

### 1.2 Conteúdo Mínimo

**Descrição:** Política deve conter todas as informações obrigatórias da LGPD

**Critérios:**
- ✅ Identificação do controlador
- ✅ Finalidade do tratamento
- ✅ Base legal para cada tipo de dado
- ✅ Prazo de retenção
- ✅ Direitos do titular
- ✅ Como exercer direitos
- ✅ Contato do DPO (se aplicável)
- ✅ Informações sobre cookies
- ✅ Política de segurança

**Como Validar:**
1. Ler política completa
2. Verificar cada seção obrigatória
3. Verificar que informações estão claras

**Evidências:**
- Revisão do conteúdo
- Comparação com requisitos LGPD

**Status:** ✅ Aprovado

---

## 2. Consentimento de Dados

### 2.1 Aceite no Registro

**Descrição:** Usuário deve aceitar termos e política no cadastro

**Critérios:**
- ✅ Checkbox para Termos de Uso (obrigatório)
- ✅ Checkbox para Política de Privacidade (obrigatório)
- ✅ Links para documentos funcionam
- ✅ Botão de cadastro desabilitado sem aceite
- ✅ Consentimentos são registrados no banco
- ✅ Timestamp de concessão é salvo
- ✅ Versão do documento é salva
- ✅ IP e User-Agent são registrados (se possível)

**Como Validar:**
1. Acessar `/cadastro`
2. Preencher dados
3. Tentar avançar sem aceitar → botão desabilitado
4. Aceitar termos
5. Completar cadastro
6. Verificar `user_consents` no banco

**Evidências:**
- Screenshot do cadastro
- Query SQL: `SELECT * FROM user_consents WHERE user_id = ...`
- Arquivo: `src/pages/Register.tsx`

**Status:** ✅ Aprovado

---

### 2.2 Gestão de Consentimentos

**Descrição:** Usuário pode gerenciar seus consentimentos

**Critérios:**
- ✅ Página `/perfil/consentimentos` existe
- ✅ Lista todos os tipos de consentimento
- ✅ Mostra status (concedido/revogado)
- ✅ Permite conceder consentimentos opcionais
- ✅ Permite revogar consentimentos opcionais
- ✅ Bloqueia revogação de obrigatórios
- ✅ Mostra data de concessão/revogação
- ✅ Mostra versão do documento
- ✅ Interface clara e intuitiva

**Como Validar:**
1. Acessar `/perfil/consentimentos`
2. Verificar lista de consentimentos
3. Tentar revogar obrigatório → deve bloquear
4. Revogar opcional → deve funcionar
5. Conceder opcional → deve funcionar
6. Verificar atualização no banco

**Evidências:**
- Screenshot da página
- Query SQL mostrando mudanças
- Arquivo: `src/pages/profile/ConsentsPage.tsx`

**Status:** ✅ Aprovado

---

### 2.3 Tipos de Consentimento

**Descrição:** Sistema suporta 7 tipos de consentimento

**Critérios:**
- ✅ `terms_of_use` (obrigatório)
- ✅ `privacy_policy` (obrigatório)
- ✅ `data_collection` (opcional)
- ✅ `location_tracking` (opcional)
- ✅ `demographic_data` (opcional)
- ✅ `newsletter` (opcional)
- ✅ `council_sharing` (opcional)
- ✅ Enum `consent_type` no banco
- ✅ RLS permite apenas leitura própria

**Como Validar:**
1. Verificar enum no banco
2. Verificar que todos os tipos aparecem na interface
3. Testar cada tipo individualmente

**Evidências:**
- Query SQL: `SELECT unnest(enum_range(NULL::consent_type))`
- Screenshot da interface
- Migration: `supabase/migrations/20260131000000_user_consents.sql`

**Status:** ✅ Aprovado

---

## 3. Acesso aos Dados

### 3.1 Visualização no Perfil

**Descrição:** Usuário pode ver seus dados pessoais

**Critérios:**
- ✅ Página de perfil mostra todos os dados
- ✅ Dados são exibidos corretamente
- ✅ Apenas o próprio usuário vê seus dados
- ✅ RLS protege acesso aos dados

**Como Validar:**
1. Fazer login
2. Acessar `/perfil`
3. Verificar que dados são exibidos
4. Tentar acessar dados de outro usuário → deve falhar

**Evidências:**
- Screenshot do perfil
- Teste de RLS no banco

**Status:** ✅ Aprovado

---

### 3.2 Direitos do Titular

**Descrição:** Página centralizada com todos os direitos LGPD

**Critérios:**
- ✅ Página `/perfil/direitos` existe
- ✅ Lista todos os direitos:
  - Acesso aos dados
  - Portabilidade
  - Correção
  - Gestão de consentimentos
  - Exclusão
- ✅ Links diretos para cada funcionalidade
- ✅ Informações claras sobre cada direito

**Como Validar:**
1. Acessar `/perfil/direitos`
2. Verificar lista de direitos
3. Clicar em cada link → deve funcionar

**Evidências:**
- Screenshot da página
- Arquivo: `src/pages/profile/UserRightsPage.tsx`

**Status:** ✅ Aprovado

---

## 4. Correção de Dados

### 4.1 Edição de Dados Pessoais

**Descrição:** Usuário pode corrigir seus dados pessoais

**Critérios:**
- ✅ Página `/perfil/dados-pessoais` permite edição
- ✅ Validações funcionam
- ✅ Alterações são salvas
- ✅ Confirmação é exibida
- ✅ Dados são atualizados no banco

**Como Validar:**
1. Acessar `/perfil/dados-pessoais`
2. Editar dados
3. Salvar
4. Verificar confirmação
5. Verificar banco de dados

**Evidências:**
- Screenshot da edição
- Query SQL mostrando atualização
- Arquivo: `src/pages/profile/PersonalInfoPage.tsx`

**Status:** ✅ Aprovado

---

## 5. Portabilidade de Dados

### 5.1 Exportação de Dados

**Descrição:** Usuário pode exportar todos os seus dados

**Critérios:**
- ✅ Página `/perfil/exportar-dados` existe
- ✅ Botão de exportação funciona
- ✅ Edge Function `export-user-data` funciona
- ✅ Exporta todos os dados pessoais:
  - Conta (email, telefone, datas)
  - Perfil (nome, foto, bio)
  - Demografia
  - Endereços
  - Relatos (urbanos e transporte)
  - Avaliações
  - Consentimentos
  - Preferências
  - Conversas
  - Participações
- ✅ Formato JSON estruturado
- ✅ Download automático funciona
- ✅ Arquivo é legível

**Como Validar:**
1. Acessar `/perfil/exportar-dados`
2. Clicar em "Exportar dados (JSON)"
3. Aguardar download
4. Abrir arquivo JSON
5. Verificar que todos os dados estão presentes
6. Verificar formato estruturado

**Evidências:**
- Screenshot da página
- Arquivo JSON exportado
- Logs da Edge Function
- Arquivo: `src/pages/profile/DataExportPage.tsx`
- Arquivo: `supabase/functions/export-user-data/index.ts`

**Status:** ✅ Aprovado

---

### 5.2 Formato de Exportação

**Descrição:** Dados exportados devem estar em formato legível e interoperável

**Critérios:**
- ✅ Formato JSON válido
- ✅ Estrutura hierárquica clara
- ✅ Metadados incluídos (data de exportação, versão)
- ✅ Dados completos (sem truncamento)
- ✅ Encoding correto (UTF-8)

**Como Validar:**
1. Exportar dados
2. Validar JSON (usar validador online)
3. Verificar estrutura
4. Verificar que todos os dados estão presentes

**Evidências:**
- Arquivo JSON validado
- Screenshot da estrutura

**Status:** ✅ Aprovado

---

## 6. Exclusão de Dados

### 6.1 Exclusão de Conta

**Descrição:** Usuário pode excluir sua conta permanentemente

**Critérios:**
- ✅ Página `/perfil/direitos` tem opção de exclusão
- ✅ Dialog de confirmação é exibido
- ✅ Requer digitação de "EXCLUIR" para confirmar
- ✅ Informa sobre o que será excluído
- ✅ Avisa sobre exclusão permanente
- ✅ Edge Function `delete-own-account` funciona
- ✅ Exclui usuário de `auth.users`
- ✅ Exclusão em cascata remove todos os dados:
  - Perfil
  - Demografia
  - Endereços
  - Relatos
  - Avaliações
  - Consentimentos
  - Preferências
  - Conversas
  - Participações
- ✅ Logout automático após exclusão
- ✅ Redirecionamento para página inicial

**Como Validar:**
1. Acessar `/perfil/direitos`
2. Clicar em "Excluir conta"
3. Verificar dialog
4. Tentar confirmar sem digitar "EXCLUIR" → deve bloquear
5. Digitar "EXCLUIR" e confirmar
6. Verificar que conta foi excluída
7. Verificar que todos os dados foram removidos
8. Verificar logout e redirecionamento

**Evidências:**
- Screenshot do dialog
- Logs da Edge Function
- Query SQL verificando exclusão
- Arquivo: `src/pages/profile/UserRightsPage.tsx`
- Arquivo: `supabase/functions/delete-own-account/index.ts`

**Status:** ✅ Aprovado

---

### 6.2 Exclusão em Cascata

**Descrição:** Exclusão de conta remove todos os dados relacionados

**Critérios:**
- ✅ Foreign keys com `ON DELETE CASCADE` configuradas
- ✅ Dados de todas as tabelas são removidos
- ✅ Nenhum dado órfão permanece
- ✅ Storage files são removidos (se aplicável)

**Como Validar:**
1. Criar conta de teste
2. Criar relatos, avaliações, etc.
3. Excluir conta
4. Verificar todas as tabelas → não deve haver registros

**Evidências:**
- Queries SQL verificando todas as tabelas
- Verificação de foreign keys

**Status:** ✅ Aprovado

---

## 7. Revogação de Consentimento

### 7.1 Revogação de Consentimentos Opcionais

**Descrição:** Usuário pode revogar consentimentos opcionais

**Critérios:**
- ✅ Interface permite revogar opcionais
- ✅ Revogação é registrada no banco
- ✅ `revoked_at` é preenchido
- ✅ `granted` é atualizado para `false`
- ✅ Confirmação é exibida
- ✅ Funcionalidades relacionadas são desabilitadas (se aplicável)

**Como Validar:**
1. Acessar `/perfil/consentimentos`
2. Revogar consentimento opcional
3. Verificar confirmação
4. Verificar banco de dados
5. Verificar que funcionalidade foi desabilitada (se aplicável)

**Evidências:**
- Screenshot da interface
- Query SQL mostrando revogação
- Arquivo: `src/pages/profile/ConsentsPage.tsx`

**Status:** ✅ Aprovado

---

### 7.2 Bloqueio de Revogação de Obrigatórios

**Descrição:** Consentimentos obrigatórios não podem ser revogados

**Critérios:**
- ✅ Switch desabilitado para obrigatórios
- ✅ Mensagem clara sobre obrigatoriedade
- ✅ Tentativa de revogação é bloqueada
- ✅ Apenas `terms_of_use` e `privacy_policy` são obrigatórios

**Como Validar:**
1. Acessar `/perfil/consentimentos`
2. Tentar revogar Termos de Uso → deve bloquear
3. Tentar revogar Política de Privacidade → deve bloquear
4. Verificar mensagem de erro

**Evidências:**
- Screenshot mostrando bloqueio
- Teste de tentativa de revogação

**Status:** ✅ Aprovado

---

## 8. Segurança e Proteção

### 8.1 Row Level Security (RLS)

**Descrição:** RLS protege acesso aos dados pessoais

**Critérios:**
- ✅ RLS ativo em todas as tabelas com dados pessoais
- ✅ Usuários veem apenas seus próprios dados
- ✅ Políticas de SELECT restritas
- ✅ Políticas de INSERT/UPDATE restritas
- ✅ Políticas de DELETE restritas
- ✅ Testes de RLS passam

**Como Validar:**
1. Fazer login como usuário A
2. Tentar acessar dados do usuário B → deve falhar
3. Verificar políticas RLS no banco
4. Executar testes de RLS

**Evidências:**
- Query SQL verificando políticas
- Testes de acesso negado
- Migration files com RLS

**Status:** ✅ Aprovado

---

### 8.2 Criptografia

**Descrição:** Dados sensíveis são criptografados

**Critérios:**
- ✅ Senhas são hasheadas (Supabase nativo)
- ✅ Dados em trânsito são criptografados (HTTPS)
- ✅ Dados em repouso são criptografados (Supabase nativo)
- ✅ Tokens JWT são seguros

**Como Validar:**
1. Verificar que senhas não são armazenadas em texto plano
2. Verificar HTTPS em produção
3. Verificar configurações do Supabase

**Evidências:**
- Verificação de hash de senhas
- Certificado SSL válido

**Status:** ✅ Aprovado

---

### 8.3 Logs de Auditoria

**Descrição:** Operações sensíveis são registradas

**Critérios:**
- ✅ Tabela `audit_logs` existe
- ✅ Operações de exclusão são registradas
- ✅ Operações de exportação são registradas
- ✅ Operações de revogação são registradas
- ✅ Logs incluem timestamp, usuário, ação

**Como Validar:**
1. Executar operações sensíveis
2. Verificar logs no banco
3. Verificar que informações estão completas

**Evidências:**
- Query SQL mostrando logs
- Verificação de campos

**Status:** ✅ Aprovado

---

## 📊 Resumo

| Funcionalidade LGPD | Critérios | Status |
|---------------------|-----------|--------|
| Política de Privacidade | 2 | ✅ |
| Consentimento de Dados | 3 | ✅ |
| Acesso aos Dados | 2 | ✅ |
| Correção de Dados | 1 | ✅ |
| Portabilidade | 2 | ✅ |
| Exclusão | 2 | ✅ |
| Revogação | 2 | ✅ |
| Segurança | 3 | ✅ |
| **TOTAL** | **17** | **✅ 100%** |

---

## ✅ Conformidade com Artigos da LGPD

| Artigo | Direito | Status | Implementação |
|--------|---------|--------|---------------|
| Art. 9º | Consentimento | ✅ | Sistema granular |
| Art. 18, I | Confirmação de existência | ✅ | Página de direitos |
| Art. 18, II | Acesso | ✅ | Visualização no perfil |
| Art. 18, III | Correção | ✅ | Edição de dados |
| Art. 18, IV | Anonimização/exclusão | ✅ | Exclusão de conta |
| Art. 18, V | Portabilidade | ✅ | Exportação JSON |
| Art. 18, VI | Eliminação | ✅ | Exclusão de conta |
| Art. 18, VII | Revogação | ✅ | Gestão de consentimentos |
| Art. 18, VIII | Informação sobre compartilhamento | ✅ | Política de privacidade |
| Art. 18, IX | Informação sobre não consentir | ✅ | Consentimentos opcionais |

**Conformidade:** ✅ **100%**

---

**Última atualização:** 2026-01-31
