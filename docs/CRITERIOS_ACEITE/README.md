# Critérios de Aceite - Câmara na Mão

**Data:** 2026-01-31  
**Versão:** 1.0  
**Objetivo:** Documentar critérios formais de aceite para validação e QA

---

## 📋 Índice

Este diretório contém os critérios de aceite organizados por categoria:

1. **[MVP.md](./MVP.md)** - Critérios de aceite para funcionalidades do MVP
2. **[LGPD.md](./LGPD.md)** - Critérios de conformidade com a LGPD
3. **[Integracoes.md](./Integracoes.md)** - Critérios para integrações externas
4. **[Performance.md](./Performance.md)** - Critérios de performance e qualidade
5. **[Seguranca.md](./Seguranca.md)** - Critérios de segurança e proteção de dados
6. **[Checklist_Validacao.md](./Checklist_Validacao.md)** - Checklist geral de validação

---

## 🎯 Como Usar

### Para Desenvolvedores

1. **Antes de marcar uma feature como "pronta":**
   - Verifique os critérios de aceite em `MVP.md`
   - Execute o checklist em `Checklist_Validacao.md`
   - Garanta que todos os critérios relevantes foram atendidos

2. **Para funcionalidades LGPD:**
   - Consulte `LGPD.md` para critérios específicos
   - Verifique conformidade com todos os artigos da LGPD

3. **Para integrações:**
   - Consulte `Integracoes.md` para critérios de integração
   - Verifique conectividade e tratamento de erros

### Para QA/Testadores

1. **Use os critérios como base para testes:**
   - Cada critério deve ter um teste correspondente
   - Marque como ✅ quando o critério é atendido
   - Documente falhas e bloqueios

2. **Use o checklist antes de aprovar:**
   - Execute `Checklist_Validacao.md` completo
   - Todos os itens devem estar ✅ antes de aprovar

### Para Product Owners

1. **Use os critérios para validar entregas:**
   - Verifique se a feature atende todos os critérios
   - Solicite evidências quando necessário
   - Aprove apenas quando 100% dos critérios críticos estiverem atendidos

---

## 📊 Estrutura de um Critério de Aceite

Cada critério segue o formato:

```markdown
### [ID] Nome do Critério

**Descrição:** Breve descrição do que deve ser validado

**Critérios:**
- ✅ Critério 1: Descrição específica
- ✅ Critério 2: Descrição específica
- ✅ Critério 3: Descrição específica

**Como Validar:**
1. Passo 1 de validação
2. Passo 2 de validação
3. Passo 3 de validação

**Evidências:**
- Screenshot, log, ou código que comprova o critério

**Status:** ✅ Aprovado | ❌ Pendente | 🟡 Parcial
```

---

## ✅ Status Geral

| Categoria | Total de Critérios | Aprovados | Pendentes | % Completo |
|-----------|-------------------|-----------|-----------|------------|
| MVP | - | - | - | - |
| LGPD | - | - | - | - |
| Integrações | - | - | - | - |
| Performance | - | - | - | - |
| Segurança | - | - | - | - |
| **TOTAL** | - | - | - | - |

---

## 🔄 Atualizações

- **2026-01-31:** Criação inicial da estrutura de critérios de aceite

---

## 📝 Notas

- Critérios marcados como **críticos** são obrigatórios para deploy
- Critérios marcados como **desejáveis** podem ser implementados posteriormente
- Todos os critérios devem ser validados antes de marcar como "pronto para produção"

---

**Última atualização:** 2026-01-31
