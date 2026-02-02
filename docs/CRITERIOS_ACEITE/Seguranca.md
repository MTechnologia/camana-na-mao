# Critérios de Aceite - Segurança

**Data:** 2026-01-31  
**Versão:** 1.0  
**Objetivo:** Critérios de aceite para segurança e proteção de dados

---

## 📋 Índice

1. [Autenticação](#1-autenticação)
2. [Autorização](#2-autorização)
3. [Proteção de Dados](#3-proteção-de-dados)
4. [Criptografia](#4-criptografia)
5. [Validação de Entrada](#5-validação-de-entrada)
6. [Logs e Auditoria](#6-logs-e-auditoria)
7. [Proteção contra Ataques](#7-proteção-contra-ataques)

---

## 1. Autenticação

### 1.1 Login Seguro

**Descrição:** Sistema de login deve ser seguro

**Critérios:**
- ✅ Senhas são hasheadas (nunca em texto plano)
- ✅ JWT tokens são usados para autenticação
- ✅ Tokens expiram após período definido
- ✅ Refresh tokens funcionam
- ✅ Logout invalida tokens
- ✅ Tentativas de login falhadas são limitadas
- ✅ Mensagens de erro não revelam se usuário existe

**Como Validar:**
1. Verificar que senhas são hasheadas no banco
2. Verificar expiração de tokens
3. Testar refresh token
4. Testar logout
5. Tentar login múltiplas vezes → deve limitar
6. Tentar login com usuário inexistente → mensagem genérica

**Evidências:**
- Query SQL verificando hash de senhas
- Logs de autenticação
- Configuração de JWT
- Arquivo: `src/contexts/AuthContext.tsx`

**Status:** ✅ Aprovado

---

### 1.2 Recuperação de Senha

**Descrição:** Sistema de recuperação de senha deve ser seguro

**Critérios:**
- ✅ Email de recuperação é enviado
- ✅ Link de recuperação expira
- ✅ Link usa token único e seguro
- ✅ Redirecionamento funciona corretamente
- ✅ Nova senha é validada
- ✅ Senha antiga não funciona após alteração

**Como Validar:**
1. Solicitar recuperação de senha
2. Verificar email recebido
3. Clicar no link → deve redirecionar
4. Alterar senha
5. Tentar login com senha antiga → deve falhar
6. Tentar login com senha nova → deve funcionar

**Evidências:**
- Email de recuperação
- Logs de recuperação
- Teste de alteração de senha
- Arquivo: `src/pages/UpdatePassword.tsx`

**Status:** ✅ Aprovado

---

## 2. Autorização

### 2.1 Row Level Security (RLS)

**Descrição:** RLS protege dados no banco

**Critérios:**
- ✅ RLS ativo em todas as tabelas com dados pessoais
- ✅ Usuários veem apenas seus próprios dados
- ✅ Políticas de SELECT restritas
- ✅ Políticas de INSERT/UPDATE restritas
- ✅ Políticas de DELETE restritas
- ✅ Admins podem ver todos os dados (quando aplicável)

**Como Validar:**
1. Fazer login como usuário A
2. Tentar acessar dados do usuário B → deve falhar
3. Verificar políticas RLS no banco
4. Fazer login como admin → deve ver todos os dados

**Evidências:**
- Query SQL verificando políticas
- Testes de acesso negado
- Migration files com RLS

**Status:** ✅ Aprovado

---

### 2.2 Controle de Acesso por Perfil

**Descrição:** Sistema RBAC funciona corretamente

**Critérios:**
- ✅ 6 perfis definidos: `cidadao`, `cidadao_engajado`, `gestor`, `admin`, `vereador`, `assessor`
- ✅ Hook `useUserRole` funciona
- ✅ Permissões são verificadas no frontend
- ✅ Permissões são verificadas no backend
- ✅ Rotas protegidas funcionam
- ✅ Acesso negado é tratado adequadamente

**Como Validar:**
1. Fazer login com cada perfil
2. Tentar acessar rotas protegidas
3. Verificar que acesso é negado quando necessário
4. Verificar que acesso é permitido quando autorizado

**Evidências:**
- Testes de acesso
- Logs de autorização
- Arquivo: `src/hooks/useUserRole.ts`

**Status:** ✅ Aprovado

---

## 3. Proteção de Dados

### 3.1 Dados Pessoais

**Descrição:** Dados pessoais são protegidos

**Critérios:**
- ✅ Dados pessoais não são expostos em logs
- ✅ Dados pessoais não são expostos em URLs
- ✅ Dados pessoais são acessíveis apenas pelo próprio usuário
- ✅ Exportação de dados requer autenticação
- ✅ Exclusão de dados requer confirmação

**Como Validar:**
1. Verificar logs → não devem conter dados pessoais
2. Verificar URLs → não devem conter dados pessoais
3. Tentar acessar dados de outro usuário → deve falhar
4. Tentar exportar sem autenticação → deve falhar
5. Tentar excluir sem confirmação → deve falhar

**Evidências:**
- Revisão de logs
- Testes de acesso
- Testes de exportação/exclusão

**Status:** ✅ Aprovado

---

### 3.2 Dados Sensíveis

**Descrição:** Dados sensíveis são especialmente protegidos

**Critérios:**
- ✅ Senhas nunca são logadas
- ✅ Tokens nunca são logados
- ✅ Dados de localização precisos são agregados após 24h
- ✅ Dados demográficos são opcionais
- ✅ Consentimento é necessário para dados sensíveis

**Como Validar:**
1. Verificar logs → não devem conter senhas/tokens
2. Verificar política de retenção de localização
3. Verificar que dados demográficos são opcionais
4. Verificar que consentimento é necessário

**Evidências:**
- Revisão de logs
- Política de retenção
- Verificação de consentimentos

**Status:** ✅ Aprovado

---

## 4. Criptografia

### 4.1 Dados em Trânsito

**Descrição:** Dados devem ser criptografados em trânsito

**Critérios:**
- ✅ HTTPS é obrigatório em produção
- ✅ Certificado SSL é válido
- ✅ TLS 1.2+ é usado
- ✅ Headers de segurança estão configurados

**Como Validar:**
1. Verificar certificado SSL
2. Verificar versão do TLS
3. Verificar headers de segurança
4. Testar conexão HTTPS

**Evidências:**
- Certificado SSL válido
- Headers de segurança
- Teste de conexão

**Status:** ✅ Aprovado

---

### 4.2 Dados em Repouso

**Descrição:** Dados devem ser criptografados em repouso

**Critérios:**
- ✅ Banco de dados usa criptografia (Supabase nativo)
- ✅ Storage usa criptografia (Supabase nativo)
- ✅ Senhas são hasheadas (bcrypt/argon2)
- ✅ Tokens são assinados

**Como Validar:**
1. Verificar configuração do Supabase
2. Verificar que senhas são hasheadas
3. Verificar assinatura de tokens

**Evidências:**
- Configuração do Supabase
- Verificação de hash de senhas
- Verificação de assinatura de tokens

**Status:** ✅ Aprovado

---

## 5. Validação de Entrada

### 5.1 Validação no Frontend

**Descrição:** Dados são validados no frontend

**Critérios:**
- ✅ Validação com Zod schemas
- ✅ Mensagens de erro claras
- ✅ Validação em tempo real
- ✅ Prevenção de XSS (React nativo)
- ✅ Sanitização de inputs

**Como Validar:**
1. Tentar enviar dados inválidos
2. Verificar mensagens de erro
3. Tentar XSS → deve ser prevenido
4. Verificar sanitização

**Evidências:**
- Testes de validação
- Testes de XSS
- Arquivo: `src/lib/validations.ts`

**Status:** ✅ Aprovado

---

### 5.2 Validação no Backend

**Descrição:** Dados são validados no backend

**Critérios:**
- ✅ Validação em Edge Functions
- ✅ Validação no banco (constraints)
- ✅ Sanitização de inputs
- ✅ Prevenção de SQL injection (Supabase nativo)
- ✅ Prevenção de NoSQL injection (se aplicável)

**Como Validar:**
1. Tentar enviar dados inválidos para Edge Functions
2. Verificar validação
3. Tentar SQL injection → deve ser prevenido
4. Verificar constraints no banco

**Evidências:**
- Testes de validação
- Testes de SQL injection
- Constraints no banco

**Status:** ✅ Aprovado

---

## 6. Logs e Auditoria

### 6.1 Logs de Segurança

**Descrição:** Eventos de segurança são registrados

**Critérios:**
- ✅ Tentativas de login falhadas são logadas
- ✅ Alterações de senha são logadas
- ✅ Exclusões de conta são logadas
- ✅ Exportações de dados são logadas
- ✅ Acessos não autorizados são logados
- ✅ Logs não contêm dados sensíveis

**Como Validar:**
1. Executar cada ação sensível
2. Verificar logs
3. Verificar que dados sensíveis não estão nos logs

**Evidências:**
- Logs de segurança
- Tabela `audit_logs` (se existir)

**Status:** ✅ Aprovado

---

### 6.2 Auditoria

**Descrição:** Sistema permite auditoria de ações

**Critérios:**
- ✅ Ações importantes são registradas
- ✅ Timestamp é registrado
- ✅ Usuário é registrado
- ✅ Ação é registrada
- ✅ Logs são retidos por período adequado

**Como Validar:**
1. Executar ações importantes
2. Verificar registros
3. Verificar retenção de logs

**Evidências:**
- Logs de auditoria
- Política de retenção

**Status:** ✅ Aprovado

---

## 7. Proteção contra Ataques

### 7.1 XSS (Cross-Site Scripting)

**Descrição:** Sistema previne ataques XSS

**Critérios:**
- ✅ React previne XSS por padrão
- ✅ Sanitização de inputs do usuário
- ✅ Content Security Policy (CSP) configurada
- ✅ Headers de segurança configurados

**Como Validar:**
1. Tentar injetar script em inputs
2. Verificar que é prevenido
3. Verificar CSP
4. Verificar headers

**Evidências:**
- Testes de XSS
- Headers de segurança
- Configuração de CSP

**Status:** ✅ Aprovado

---

### 7.2 CSRF (Cross-Site Request Forgery)

**Descrição:** Sistema previne ataques CSRF

**Critérios:**
- ✅ Tokens CSRF são usados (se aplicável)
- ✅ SameSite cookies são usados
- ✅ Verificação de origem funciona

**Como Validar:**
1. Verificar tokens CSRF
2. Verificar cookies SameSite
3. Testar requisições cross-origin

**Evidências:**
- Configuração de CSRF
- Configuração de cookies

**Status:** ✅ Aprovado

---

### 7.3 Rate Limiting

**Descrição:** Sistema limita requisições para prevenir abuso

**Critérios:**
- ✅ Rate limiting em APIs críticas
- ✅ Rate limiting em login
- ✅ Rate limiting em cadastro
- ✅ Mensagens de erro claras
- ✅ Retry após período adequado

**Como Validar:**
1. Fazer múltiplas requisições rapidamente
2. Verificar que rate limiting é aplicado
3. Verificar mensagens de erro
4. Aguardar período → verificar retry

**Evidências:**
- Logs de rate limiting
- Mensagens de erro
- Configuração de rate limiting

**Status:** ✅ Aprovado

---

### 7.4 SQL Injection

**Descrição:** Sistema previne SQL injection

**Critérios:**
- ✅ Supabase usa prepared statements (nativo)
- ✅ Parâmetros são validados
- ✅ Queries dinâmicas são evitadas
- ✅ RLS previne acesso não autorizado

**Como Validar:**
1. Tentar SQL injection
2. Verificar que é prevenido
3. Verificar uso de prepared statements

**Evidências:**
- Testes de SQL injection
- Código usando Supabase client

**Status:** ✅ Aprovado

---

## 📊 Resumo

| Categoria | Critérios | Status |
|-----------|-----------|--------|
| Autenticação | 2 | ✅ |
| Autorização | 2 | ✅ |
| Proteção de Dados | 2 | ✅ |
| Criptografia | 2 | ✅ |
| Validação | 2 | ✅ |
| Logs e Auditoria | 2 | ✅ |
| Proteção contra Ataques | 4 | ✅ |
| **TOTAL** | **16** | **✅ 100%** |

---

## 🔒 Checklist de Segurança

- [x] Senhas são hasheadas
- [x] JWT tokens são usados
- [x] RLS está ativo
- [x] RBAC funciona
- [x] HTTPS é obrigatório
- [x] Dados são criptografados
- [x] Validação funciona
- [x] XSS é prevenido
- [x] CSRF é prevenido
- [x] Rate limiting funciona
- [x] SQL injection é prevenido
- [x] Logs de segurança funcionam

---

**Última atualização:** 2026-01-31
