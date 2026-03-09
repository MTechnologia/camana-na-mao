# Relatório de Entregáveis – Fevereiro/2026

**Referência:** 4.2 Entregas Mensais Previstas – Fevereiro/2026 (100% do escopo)  
**Data do relatório:** Fevereiro/2026

---

## 1. Listagem de audiências públicas com dados do SP Legis

**Status:** ✅ Entregue

**Descrição:** Listagem de audiências públicas alimentada por dados originados do SP Legis, com filtros e busca.

**Implementação:**
- Página `/audiencias` (`src/pages/Audiencias.tsx`) exibe as audiências da tabela `audiencias`.
- Dados carregados via seed a partir de JSON do SP Legis (`scripts/seed-audiencias-from-json.mjs` + arquivo `audiencias_splegis.json`).
- Filtros por tema, período, ano e busca textual.
- Critérios de aceite documentados e aprovados em `docs/CRITERIOS_ACEITE/Integracoes.md` (Audiências Públicas – Busca de Audiências).

---

## 2. Tela de detalhes da audiência com pauta, data, local e documentação

**Status:** ✅ Entregue

**Descrição:** Tela de detalhes exibindo pauta (descrição), data, horário, local e informações para participação.

**Implementação:**
- Página `/audiencias/:id` (`src/pages/audiencias/AudienciaDetailPage.tsx`).
- Exibe: título, descrição (pauta), data, hora, local, tema, status, vagas, link de transmissão e ações de inscrição (videoconferência e manifestação escrita).

---

## 3. Sistema de inscrição em audiências com confirmação

**Status:** ✅ Entregue

**Descrição:** Inscrição em audiências com registro no sistema e, quando aplicável, confirmação oficial (e-mail da Câmara).

**Implementação:**
- Tabela `audiencia_participacoes` para videoconferência e manifestação escrita.
- Página de participação (`src/pages/audiencias/ParticipacaoPage.tsx`) com formulário e envio para o formulário Ninja Forms da CMSP quando a audiência possui `slug` e `ap_code` configurados (e-mail de confirmação da Câmara).
- Notificação in-app de confirmação ao inscrever (trigger `notify_audiencia_inscricao`).
- Documentação em `docs/AUDIENCIAS_INSCRICAO_CMSP.md` e script `scripts/sync-audiencias-cmsp-slugs.mjs` para sincronizar slugs/ap_code.

---

## 4. Notificações push personalizadas (24h e 1h antes do evento)

**Status:** ✅ Entregue

**Descrição:** Lembretes push (e, conforme preferências, e-mail e SMS) 24 horas e 1 hora antes do evento para usuários inscritos.

**Implementação:**
- **24h antes (D-1):** Edge Function `audiencia-reminder-d1`. Executada diariamente (ex.: 08:00 BRT); envia notificação “Lembrete: audiência amanhã” para inscritos em audiências do dia seguinte. Tipo: `audiencia_lembrete_d1`.
- **1h antes:** Edge Function `audiencia-reminder-1h`. Executada a cada 15 minutos; envia notificação “Lembrete: audiência em 1 hora” para inscritos cujo evento está na janela 45–75 min. Tipo: `audiencia_lembrete_1h`.
- Inserção em `notifications`; o webhook chama `send-web-push`, que envia push (navegador e app Expo), e-mail (Resend) e SMS (Twilio) conforme preferências do usuário.
- Tipos registrados em `src/constants/notificationTypes.ts` e em `docs/TIPOS_DE_NOTIFICACOES.md`.

---

## 5. Perfil completo do usuário com endereço e geolocalização

**Status:** ✅ Entregue

**Descrição:** Perfil do usuário com endereço e suporte a geolocalização (GPS e endereço cadastrado).

**Implementação:**
- Tabela `user_addresses` com endereço completo e coordenadas (latitude/longitude).
- Formulário de endereço (`src/components/profile/AddressForm.tsx`), página de endereço (`src/pages/profile/AddressPage.tsx`) e geocoding.
- Hook `useGeolocation` para uso de GPS; fluxos que usam localização permitem “endereço cadastrado” ou “usar minha localização (GPS)” (ex.: `InlineLocationMethodPicker`).

---

## 6. Gestão de interesses temáticos e preferências de comunicação

**Status:** ✅ Entregue

**Descrição:** Gestão de interesses temáticos do usuário e preferências de notificação (canais e categorias).

**Implementação:**
- Interesses: `src/pages/profile/InterestsPage.tsx`, `src/components/profile/InterestsForm.tsx` e passo de interesses no cadastro (`InterestsStep`).
- Preferências de comunicação: tabela `notification_settings` (push, e-mail, SMS, categorias, horário de silêncio) e `user_preferences` (privacidade). Formulário em `/perfil/preferencias` (`src/components/profile/PreferencesForm.tsx`).
- Documentação em `docs/STATUS_PREFERENCIAS_NOTIFICACOES_PRIVACIDADE.md`.

---

## 7. Testes de integração executados

**Status:** ✅ Entregue

**Descrição:** Testes de integração cobrindo fluxos principais do sistema.

**Implementação:**
- Testes E2E com Playwright em `tests/e2e/`:
  - `audiencias.spec.ts`: listagem, inscrição, filtro por tema, cancelamento de inscrição.
  - `auth.spec.ts`, `transport.spec.ts`, `urban.spec.ts`, `evaluation.spec.ts`, `ai-chat.spec.ts`.
- Configuração em `playwright.config.ts`.

---

## Produto final

Aplicativo funcional com:

- **Módulo de audiências públicas** integrado a dados do SP Legis: listagem, detalhes (pauta, data, local, documentação), inscrição com confirmação (in-app e, quando configurado, e-mail da CMSP).
- **Sistema de notificações personalizadas:** lembretes 24h e 1h antes do evento (push, e-mail e SMS conforme preferências), além de notificações de confirmação de inscrição.
- **Perfil completo do usuário** com endereço, geolocalização e gestão de interesses temáticos e preferências de comunicação.
- **Testes de integração** executados para os fluxos contemplados.

---

## Resumo de status

| # | Entregável | Status |
|---|------------|--------|
| 1 | Listagem de audiências públicas com dados do SP Legis | ✅ Entregue |
| 2 | Tela de detalhes da audiência (pauta, data, local, documentação) | ✅ Entregue |
| 3 | Sistema de inscrição em audiências com confirmação | ✅ Entregue |
| 4 | Notificações push personalizadas (24h e 1h antes) | ✅ Entregue |
| 5 | Perfil completo com endereço e geolocalização | ✅ Entregue |
| 6 | Gestão de interesses temáticos e preferências de comunicação | ✅ Entregue |
| 7 | Testes de integração executados | ✅ Entregue |

**Escopo Fevereiro/2026:** 100% dos itens previstos entregues.
