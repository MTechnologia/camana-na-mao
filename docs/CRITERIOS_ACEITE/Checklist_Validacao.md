# Checklist de Validação - Câmara na Mão

**Data:** 2026-01-31  
**Versão:** 1.0  
**Objetivo:** Checklist geral para validação antes de deploy

---

## 📋 Como Usar

Este checklist deve ser executado antes de:
- ✅ Marcar uma feature como "pronta"
- ✅ Fazer merge para branch principal
- ✅ Fazer deploy para produção
- ✅ Aprovar uma entrega

**Instruções:**
1. Marque cada item como ✅ quando completo
2. Documente evidências quando solicitado
3. Não pule itens críticos (marcados com ⚠️)
4. Documente bloqueios ou pendências

---

## 🔴 CRÍTICO - Não pode ser ignorado

### Autenticação e Segurança

- [ ] ⚠️ Login funciona corretamente
- [ ] ⚠️ Senhas são hasheadas (nunca em texto plano)
- [ ] ⚠️ JWT tokens funcionam
- [ ] ⚠️ RLS está ativo em todas as tabelas
- [ ] ⚠️ HTTPS está configurado (produção)
- [ ] ⚠️ Dados pessoais não são expostos em logs
- [ ] ⚠️ Validação de entrada funciona
- [ ] ⚠️ XSS é prevenido
- [ ] ⚠️ SQL injection é prevenido

**Evidências:**
- [ ] Query SQL verificando hash de senhas
- [ ] Testes de RLS
- [ ] Testes de XSS
- [ ] Testes de SQL injection

---

### LGPD - Conformidade Obrigatória

- [ ] ⚠️ Política de privacidade está publicada e acessível
- [ ] ⚠️ Consentimentos são registrados no cadastro
- [ ] ⚠️ Usuário pode gerenciar consentimentos
- [ ] ⚠️ Usuário pode exportar seus dados
- [ ] ⚠️ Usuário pode excluir sua conta
- [ ] ⚠️ Exclusão remove todos os dados
- [ ] ⚠️ RLS protege dados pessoais

**Evidências:**
- [ ] Screenshot da política de privacidade
- [ ] Query SQL verificando consentimentos
- [ ] Teste de exportação de dados
- [ ] Teste de exclusão de conta

---

## 🟡 IMPORTANTE - Deve ser verificado

### Funcionalidades Core

- [ ] Chat AI responde em <3 segundos
- [ ] Detecção de intenção funciona
- [ ] Tool-calling emulado funciona
- [ ] Relatos urbanos são salvos
- [ ] Relatos de transporte são salvos
- [ ] Avaliações são salvas
- [ ] Histórico funciona
- [ ] Encaminhamento para vereadores funciona

**Evidências:**
- [ ] Logs do `ai-orchestrator`
- [ ] Registros no banco de dados
- [ ] Screenshots das funcionalidades

---

### Performance

- [ ] Páginas carregam em <2s (desktop)
- [ ] Páginas carregam em <3s (mobile)
- [ ] Chat AI responde em <3s
- [ ] Edge Functions respondem em <5s
- [ ] Consultas ao banco são otimizadas
- [ ] Cache funciona adequadamente

**Evidências:**
- [ ] Relatório Lighthouse
- [ ] Logs de performance
- [ ] Métricas de tempo de resposta

---

### Integrações

- [ ] Portal CMSP funciona (notícias, agenda)
- [ ] SP Legis funciona (vereadores)
- [ ] Google Maps funciona (serviços próximos)
- [ ] automacao funciona (notificações)
- [ ] Tratamento de erros funciona
- [ ] Timeouts são tratados

**Evidências:**
- [ ] Logs das integrações
- [ ] Testes de erro
- [ ] Screenshots das integrações

---

## 🟢 DESEJÁVEL - Pode ser feito depois

### Qualidade e UX

- [ ] Mensagens de erro são claras
- [ ] Loading states são exibidos
- [ ] Skeleton screens funcionam
- [ ] Acessibilidade básica funciona
- [ ] Responsividade funciona
- [ ] Testes E2E passam

**Evidências:**
- [ ] Screenshots de estados de loading
- [ ] Testes de acessibilidade
- [ ] Relatório de testes E2E

---

## 📝 Validação por Categoria

### MVP

- [ ] Todos os critérios em `MVP.md` foram verificados
- [ ] Funcionalidades principais funcionam
- [ ] Testes E2E passam

**Arquivo:** `docs/CRITERIOS_ACEITE/MVP.md`

---

### LGPD

- [ ] Todos os critérios em `LGPD.md` foram verificados
- [ ] Conformidade com artigos da LGPD
- [ ] Direitos do titular funcionam

**Arquivo:** `docs/CRITERIOS_ACEITE/LGPD.md`

---

### Integrações

- [ ] Todos os critérios em `Integracoes.md` foram verificados
- [ ] Integrações funcionam
- [ ] Tratamento de erros funciona

**Arquivo:** `docs/CRITERIOS_ACEITE/Integracoes.md`

---

### Performance

- [ ] Todos os critérios em `Performance.md` foram verificados
- [ ] Métricas estão dentro dos limites
- [ ] Otimizações foram aplicadas

**Arquivo:** `docs/CRITERIOS_ACEITE/Performance.md`

---

### Segurança

- [ ] Todos os critérios em `Seguranca.md` foram verificados
- [ ] Vulnerabilidades conhecidas foram corrigidas
- [ ] Testes de segurança passam

**Arquivo:** `docs/CRITERIOS_ACEITE/Seguranca.md`

---

## 🧪 Testes

### Testes Automatizados

- [ ] Testes E2E passam
- [ ] Testes unitários passam (se houver)
- [ ] Testes de integração passam (se houver)
- [ ] Cobertura de testes é adequada

**Evidências:**
- [ ] Relatório de testes
- [ ] Cobertura de código

---

### Testes Manuais

- [ ] Fluxo de cadastro testado
- [ ] Fluxo de login testado
- [ ] Chat AI testado
- [ ] Relatos testados
- [ ] Avaliações testadas
- [ ] Perfil testado
- [ ] LGPD testado

**Evidências:**
- [ ] Screenshots dos testes
- [ ] Notas de teste

---

## 📊 Métricas

### Performance

- [ ] FCP <2s (desktop) / <3s (mobile)
- [ ] TTI <3s (desktop) / <5s (mobile)
- [ ] Chat AI <3s
- [ ] Edge Functions <5s
- [ ] Queries DB <500ms

**Evidências:**
- [ ] Relatório Lighthouse
- [ ] Logs de performance

---

### Qualidade

- [ ] Sem erros no console
- [ ] Sem warnings críticos
- [ ] Acessibilidade básica funciona
- [ ] Responsividade funciona

**Evidências:**
- [ ] Console limpo
- [ ] Testes de acessibilidade

---

## 🚀 Deploy

### Pré-Deploy

- [ ] Código foi revisado
- [ ] Testes passam
- [ ] Checklist foi executado
- [ ] Documentação está atualizada
- [ ] Migrations foram testadas
- [ ] Edge Functions foram testadas

---

### Deploy

- [ ] Migrations foram aplicadas
- [ ] Edge Functions foram deployadas
- [ ] Variáveis de ambiente estão configuradas
- [ ] Secrets estão configurados
- [ ] SSL está configurado

---

### Pós-Deploy

- [ ] Aplicação está acessível
- [ ] Login funciona
- [ ] Funcionalidades principais funcionam
- [ ] Logs não mostram erros críticos
- [ ] Performance está adequada

---

## ✅ Aprovação

### Validador

**Nome:** _________________________  
**Data:** _________________________  
**Assinatura:** _________________________

---

### Observações

**Itens pendentes:**
- 

**Bloqueios:**
- 

**Próximos passos:**
- 

---

## 📋 Resumo

| Categoria | Itens | Completos | Pendentes | % |
|-----------|-------|-----------|-----------|---|
| Crítico | 17 | ___ | ___ | ___% |
| Importante | 14 | ___ | ___ | ___% |
| Desejável | 6 | ___ | ___ | ___% |
| **TOTAL** | **37** | ___ | ___ | **___%** |

---

**Última atualização:** 2026-01-31
