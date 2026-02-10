# Tipos de notificações do sistema

Documento de referência dos tipos de notificação definidos no CMSP Connect.  
Fonte: `src/constants/notificationTypes.ts`.

---

## 1. Categorias principais (cidadão)

Tipos com `audience: 'all'` — exibidos para todos os usuários nas preferências de categoria.

| Tipo | Label | Ícone | Uso |
|------|--------|-------|-----|
| `legislativa` | Legislativa | 📜 | Conteúdo legislativo |
| `servico` | Serviço | 🏥 | Serviços (ex.: saúde) |
| `transporte` | Transporte | 🚌 | Ônibus, mobilidade |
| `urbano` | Urbano | 🏙️ | Relatos urbanos |

---

## 2. Admin / gestores

Tipos com `audience: 'admin'` — notificações para a área administrativa.

| Tipo | Label | Ícone |
|------|--------|-------|
| `new_urban_report` | Novo Relato Urbano | 🏙️ |
| `new_transport_report` | Novo Relato Transporte | 🚌 |
| `new_user` | Novo Usuário | 👤 |
| `critical_report` | Relato Crítico | 🚨 |
| `status_change` | Mudança de Status | 🔄 |
| `system_alert` | Alerta de Sistema | ⚙️ |

---

## 3. Cidadão (relatos)

Tipos com `audience: 'citizen'` — acompanhamento de relatos do usuário.

| Tipo | Label | Ícone |
|------|--------|-------|
| `report_received` | Relato Recebido | ✅ |
| `report_in_analysis` | Em Análise | 🔍 |
| `report_resolved` | Relato Resolvido | 🎉 |
| `report_rejected` | Relato Rejeitado | ❌ |

---

## 4. Compartilhados

Tipos com `audience: 'all'` — encaminhamentos e audiências.

| Tipo | Label | Ícone |
|------|--------|-------|
| `referral` | Encaminhamento | 📨 |
| `referral_update` | Atualização de Encaminhamento | 🔄 |
| `audiencia` | Audiência Pública | 🎤 |
| `audiencia_inscricao` | Inscrição em Audiência | ✅ |
| `audiencia_lembrete_d1` | Lembrete Audiência (D-1) | 📅 |

---

## 5. Sistema / genéricos

Tipos de uso geral para mensagens do sistema.

| Tipo | Label | Ícone |
|------|--------|-------|
| `info` | Informação | ℹ️ |
| `success` | Sucesso | ✅ |
| `warning` | Aviso | ⚠️ |
| `error` | Erro | ❌ |
| `general` | Geral | 📢 |

---

## 6. Prioridades

| Valor | Label |
|-------|--------|
| `low` | Baixa |
| `normal` | Normal |
| `high` | Alta |

---

## 7. Categorias para preferências do cidadão

Usadas em filtros e preferências de notificação (ex.: “quais categorias deseja receber”):

- **Legislativa** (`legislativa`)
- **Serviços** (`servico`)
- **Transporte** (`transporte`)
- **Urbano** (`urbano`)

---

## 8. Resumo numérico

- **Total de tipos:** 24
- **Níveis de prioridade:** 3 (baixa, normal, alta)
- **Categorias de preferência:** 4 (legislativa, serviço, transporte, urbano)

---

*Última atualização com base no código em `src/constants/notificationTypes.ts`.*
