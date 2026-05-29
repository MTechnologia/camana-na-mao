# Manual de teste completo — Chatbot Câmara na Mão

Guia passo a passo para validar o assistente conversacional após os refinamentos do backlog CHB (exceto CHB-009). Use em **dev** ou **hml** com usuário de teste logado.

## Antes de começar

1. Confirme que a Edge Function `ai-orchestrator` está publicada no ambiente.
2. Variáveis úteis (opcionais):
   - `AI_DISABLE_JOURNEY_SNAPSHOT_METADATA` — só use `true` para desligar snapshot no backend.
   - `VITE_DISABLE_JOURNEY_SNAPSHOT` — só use `true` para desligar hidratação no frontend.
   - `AI_CORS_ALLOWED_ORIGINS` — em produção, liste origens separadas por vírgula.
   - `AI_DISABLE_VERTEX_RAG` — desliga RAG Vertex na jornada geral.
3. Rode a suíte automatizada (referência rápida):

```bash
npm run test:chatbot
npx vitest run src/lib/chatOrchestratorClient.test.ts src/lib/chatJourneyState.test.ts src/lib/evaluationVisit.test.ts
npm run test:chatbot:e2e
```

---

## 1. Chat geral e acessibilidade

| # | Passo | Resultado esperado |
|---|--------|-------------------|
| 1.1 | Abra `/` logado. Envie: «Olá, o que é a Câmara Municipal?» | Resposta informativa em até ~30s; indicador de digitação some. |
| 1.2 | Com leitor de tela (opcional), envie outra mensagem | Nova resposta do assistente é anunciada (região `aria-live` do chat). |
| 1.3 | Envie mensagem vazia ou só espaços | Botão enviar não dispara ou nada é enviado. |

---

## 2. Relato urbano (fluxo estruturado)

| # | Passo | Resultado esperado |
|---|--------|-------------------|
| 2.1 | Chip ou texto: «Quero reportar um problema na cidade» / relato urbano | Tracker «Passo X de Y» aparece; pergunta curta (não texto enorme). |
| 2.2 | Descreva o problema (ex.: buraco na rua) | Assistente pede tema/categoria ou endereço conforme etapa. |
| 2.3 | Quando perguntar **quem mais é afetado** | Três botões: Somente eu / Toda a rua / Bairro todo. |
| 2.4 | Avance até passo de fotos | Aparecem botões Câmera/Galeria; texto menciona anexar fotos. |
| 2.5 | Anexe 1 foto e clique **Registrar** (se aplicável) | Resumo/confirmação; relato criado ou preview com protocolo. |
| 2.6 | **Retomada:** F5 no meio da coleta | Tracker e campos preenchidos voltam coerentes (snapshot em metadata). |

---

## 3. Relato de transporte

| # | Passo | Resultado esperado |
|---|--------|-------------------|
| 3.1 | Inicie jornada Transporte | Perguntas sobre linha, horário, etc. |
| 3.2 | Em ponto/parada, responda «pular» ou «não sei» | Fluxo segue sem repetir parada indefinidamente. |
| 3.3 | Conclua ou registre | Mensagem de sucesso / preview transporte. |

---

## 4. Troca de jornada

| # | Passo | Resultado esperado |
|---|--------|-------------------|
| 4.1 | Durante relato urbano, peça algo de transporte ou aceite sugestão de troca | Aviso de que progresso pode ser perdido. |
| 4.2 | Confirme troca | Nova jornada inicia; tracker antigo não “volta” sozinho. |
| 4.3 | Recuse troca | Continua na jornada atual. |

---

## 5. Avaliação de serviço

| # | Passo | Resultado esperado |
|---|--------|-------------------|
| 5.1 | `/avaliar` — lista de visitas pendentes | Cards clicáveis ou modo livre visível. |
| 5.2 | Abra `/avaliar/{visitId}` válido | Chat de avaliação com serviço já contextualizado. |
| 5.3 | Abra link com visita expirada ou já avaliada | Toast claro; redireciona para `/avaliar` (não trava em branco). |
| 5.4 | Modo livre: informe tipo e nome do serviço | Dimensões/estrelas conforme tipo. |

---

## 6. Robustez e erros

| # | Passo | Resultado esperado |
|---|--------|-------------------|
| 6.1 | Simule rede lenta (DevTools → Slow 3G) e envie mensagem | Timeout amigável ou retry automático (marcador `[TIMEOUT]`). |
| 6.2 | Se possível, provoque 429 (muitas mensagens seguidas) | Uma retentativa automática; depois toast de limite. |
| 6.3 | Deslogue e tente enviar | Pedido de login; sem spinner infinito. |

---

## 7. Histórico de conversas

| # | Passo | Resultado esperado |
|---|--------|-------------------|
| 7.1 | Menu → Histórico | Lista de conversas. |
| 7.2 | Abra conversa antiga com relato em andamento | Mensagens e tracker coerentes. |
| 7.3 | Nova conversa | Hub inicial limpo. |
| 7.4 | Excluir conversa | Toast de sucesso; some da lista. |

---

## 8. Checklist de regressão rápida (smoke)

Marque após cada deploy:

- [ ] Urbano: descrição → categoria → endereço → escopo → fotos
- [ ] Transporte: descrição → linha → conclusão ou pular parada
- [ ] Avaliação: visita válida + modo livre
- [ ] Troca de jornada com aviso
- [ ] Retomada F5 com tracker
- [ ] `npm run test:chatbot` verde
- [ ] `npm run test:chatbot:e2e` verde (com `.env.e2e.local`)

---

## 9. Onde olhar se algo falhar

| Sintoma | Onde verificar |
|---------|----------------|
| Tracker zerado após F5 | `metadata.journey_snapshot` na conversa; flags de snapshot |
| Resposta genérica «reformule» | Log `[ai-orchestrator] Empty content`; fallback contextual |
| CORS no browser | `AI_CORS_ALLOWED_ORIGINS` vs origem do app |
| RAG não responde | `AI_DISABLE_VERTEX_RAG`, credenciais Vertex |
| Eventos de jornada (dev) | Console `[chat-analytics]` |

---

## Referências

- Testes automatizados: [GUIA_TESTES_CHATBOT.md](./GUIA_TESTES_CHATBOT.md)
- Relatório HTML: `npm run test:chatbot:report:html`
