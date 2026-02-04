# Status: Preferências de Notificações e Privacidade

## 📋 Resumo Executivo

A página de preferências (`/perfil/preferencias`) está **funcionalmente implementada** para salvar as configurações do usuário, porém **as funcionalidades de envio de notificações e privacidade ainda não estão completamente implementadas**.

---

## ✅ O que está funcionando

### 1. **Interface de Preferências**
- ✅ Formulário completo com todos os campos
- ✅ Salvamento de preferências no banco de dados
- ✅ Carregamento de preferências salvas
- ✅ Validação e feedback visual

### 2. **Tabelas do Banco de Dados**
- ✅ `notification_settings` - Armazena preferências de notificações
- ✅ `user_preferences` - Armazena preferências de privacidade
- ✅ RLS (Row Level Security) configurado corretamente
- ✅ Triggers para atualização automática

### 3. **Campos Salvos**
- ✅ `push_enabled` - Notificações push no navegador
- ✅ `email_enabled` - Notificações por e-mail
- ✅ `sms_enabled` - Notificações por SMS
- ✅ `newsletter_enabled` - Newsletter semanal
- ✅ `categories_enabled` - Categorias de notificação
- ✅ `profile_visibility` - Visibilidade do perfil (público/privado/amigos)
- ✅ `show_email` - Mostrar e-mail no perfil público
- ✅ `show_phone` - Mostrar telefone no perfil público

---

## ❌ O que NÃO está funcionando

### 1. **Envio de Notificações por E-mail**
- ❌ Não há lógica para enviar e-mails baseado em `email_enabled`
- ❌ Não há integração com serviço de e-mail (SendGrid, Resend, etc.)
- ❌ A função `send-notification` não verifica `email_enabled`

**Status:** As preferências são salvas, mas e-mails não são enviados.

### 2. **Envio de Notificações Push**
- ⚠️ Parcialmente implementado
- ✅ A função `send-notification` verifica `push_enabled`
- ❌ Não há integração com Web Push API do navegador
- ❌ Não há registro de service workers para push notifications

**Status:** As preferências são respeitadas, mas push notifications não são enviadas ao navegador.

### 3. **Envio de Notificações por SMS**
- ❌ Não há lógica para enviar SMS baseado em `sms_enabled`
- ❌ Não há integração com serviço de SMS (Twilio, AWS SNS, etc.)
- ❌ A função `send-notification` não verifica `sms_enabled`

**Status:** As preferências são salvas, mas SMS não são enviados.

### 4. **Envio de Newsletter**
- ❌ Não há lógica para enviar newsletter baseado em `newsletter_enabled`
- ❌ Não há job/cron para newsletter semanal
- ❌ Não há template de newsletter

**Status:** As preferências são salvas, mas newsletter não é enviada.

### 5. **Privacidade do Perfil (Mostrar E-mail/Telefone)**
- ❌ Não há página de perfil público
- ❌ Não há verificação de `show_email` e `show_phone` ao exibir perfil
- ❌ Não há verificação de `profile_visibility` ao exibir perfil

**Status:** As preferências são salvas, mas não são aplicadas (não há perfil público implementado).

---

## 🔍 Análise Técnica

### Função `send-notification` (Edge Function)

**Localização:** `supabase/functions/send-notification/index.ts`

**O que faz atualmente:**
1. Verifica `push_enabled` (mas não envia push de fato)
2. Verifica `quiet_hours_start` e `quiet_hours_end`
3. Verifica `categories_enabled`
4. Cria registros na tabela `notifications` (notificações in-app)

**O que NÃO faz:**
- ❌ Não verifica `email_enabled` para enviar e-mail
- ❌ Não verifica `sms_enabled` para enviar SMS
- ❌ Não verifica `newsletter_enabled` para enviar newsletter
- ❌ Não envia push notifications reais ao navegador
- ❌ Não envia e-mails reais
- ❌ Não envia SMS reais

### Componente `PreferencesForm`

**Localização:** `src/components/profile/PreferencesForm.tsx`

**O que faz:**
- ✅ Salva preferências em `notification_settings`
- ✅ Salva preferências em `user_preferences`
- ✅ Carrega preferências salvas
- ✅ Interface completa e funcional

**O que NÃO faz:**
- ❌ Não há validação de integração com serviços externos
- ❌ Não há feedback sobre status de envio de notificações

---

## 📝 O que precisa ser implementado

### 1. **Sistema de Notificações por E-mail**

**Requisitos:**
- Integrar com serviço de e-mail (SendGrid, Resend, AWS SES, etc.)
- Verificar `email_enabled` antes de enviar
- Criar templates de e-mail para diferentes tipos de notificação
- Implementar fila de e-mails para envio assíncrono

**Arquivos a criar/modificar:**
- `supabase/functions/send-email-notification/index.ts` (nova Edge Function)
- Templates de e-mail (HTML)
- Configuração de variáveis de ambiente para API de e-mail

### 2. **Sistema de Notificações Push**

**Requisitos:**
- Implementar Web Push API no frontend
- Registrar service worker
- Solicitar permissão do usuário
- Verificar `push_enabled` antes de enviar
- Enviar push notifications reais ao navegador

**Arquivos a criar/modificar:**
- `public/sw.js` (service worker)
- `src/hooks/usePushNotifications.ts` (hook para gerenciar push)
- `supabase/functions/send-notification/index.ts` (modificar para enviar push real)

### 3. **Sistema de Notificações por SMS**

**Requisitos:**
- Integrar com serviço de SMS (Twilio, AWS SNS, etc.)
- Verificar `sms_enabled` antes de enviar
- Validar número de telefone do usuário
- Implementar fila de SMS para envio assíncrono

**Arquivos a criar/modificar:**
- `supabase/functions/send-sms-notification/index.ts` (nova Edge Function)
- Configuração de variáveis de ambiente para API de SMS

### 4. **Sistema de Newsletter**

**Requisitos:**
- Criar job/cron para newsletter semanal
- Verificar `newsletter_enabled` antes de enviar
- Criar template de newsletter
- Agregar conteúdo relevante da semana
- Integrar com serviço de e-mail

**Arquivos a criar/modificar:**
- `supabase/functions/send-weekly-newsletter/index.ts` (nova Edge Function)
- Template de newsletter (HTML)
- Configuração de cron job (Supabase Cron ou n8n)

### 5. **Sistema de Privacidade do Perfil**

**Requisitos:**
- Criar página de perfil público (`/perfil/:userId`)
- Verificar `profile_visibility` antes de exibir perfil
- Verificar `show_email` antes de exibir e-mail
- Verificar `show_phone` antes de exibir telefone
- Implementar lógica de "amigos" se necessário

**Arquivos a criar/modificar:**
- `src/pages/profile/PublicProfilePage.tsx` (nova página)
- `src/components/profile/PublicProfileView.tsx` (componente)
- Modificar queries para respeitar preferências de privacidade

---

## 🎯 Priorização Sugerida

### Alta Prioridade
1. **Sistema de Notificações por E-mail** - Essencial para comunicação com usuários
2. **Sistema de Privacidade do Perfil** - Importante para LGPD e segurança

### Média Prioridade
3. **Sistema de Notificações Push** - Melhora engajamento, mas não é crítico
4. **Sistema de Newsletter** - Útil para retenção, mas pode ser implementado depois

### Baixa Prioridade
5. **Sistema de Notificações por SMS** - Geralmente tem custo por mensagem, implementar apenas se necessário

---

## 📊 Status Atual por Funcionalidade

| Funcionalidade | Interface | Salvamento | Envio Real | Status Geral |
|---------------|-----------|------------|------------|--------------|
| E-mail | ✅ | ✅ | ❌ | ⚠️ Parcial |
| Push | ✅ | ✅ | ❌ | ⚠️ Parcial |
| SMS | ✅ | ✅ | ❌ | ⚠️ Parcial |
| Newsletter | ✅ | ✅ | ❌ | ⚠️ Parcial |
| Privacidade (E-mail) | ✅ | ✅ | ❌ | ⚠️ Parcial |
| Privacidade (Telefone) | ✅ | ✅ | ❌ | ⚠️ Parcial |
| Privacidade (Visibilidade) | ✅ | ✅ | ❌ | ⚠️ Parcial |

**Legenda:**
- ✅ = Implementado e funcionando
- ⚠️ = Parcialmente implementado
- ❌ = Não implementado

---

## 🔗 Arquivos Relacionados

### Frontend
- `src/components/profile/PreferencesForm.tsx` - Formulário de preferências
- `src/pages/profile/PreferencesPage.tsx` - Página de preferências

### Backend
- `supabase/functions/send-notification/index.ts` - Edge Function de notificações
- `supabase/migrations/20251126062315_*.sql` - Migration de `notification_settings`
- `supabase/migrations/20251126040829_*.sql` - Migration de `user_preferences`

### Banco de Dados
- Tabela `notification_settings` - Preferências de notificações
- Tabela `user_preferences` - Preferências de privacidade
- Tabela `notifications` - Notificações in-app

---

## 💡 Recomendações

1. **Começar com E-mail:** É a funcionalidade mais importante e relativamente simples de implementar
2. **Usar n8n para Newsletter:** Pode ser configurado como workflow no n8n existente
3. **Implementar Privacidade:** Importante para LGPD e segurança dos dados
4. **Push Notifications:** Pode ser implementado depois, pois requer configuração de service worker
5. **SMS:** Implementar apenas se houver necessidade específica (custo por mensagem)

---

## 📅 Próximos Passos

1. Decidir quais funcionalidades são prioritárias
2. Escolher provedores de serviços (e-mail, SMS, etc.)
3. Implementar funcionalidades uma por uma
4. Testar cada funcionalidade isoladamente
5. Documentar processo de configuração e uso
