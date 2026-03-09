# Upload de foto: estado atual e escopo da task (ClickUp)

## Estado atual no código

### Formulário manual de relato urbano — **já tem upload de foto**

- **Arquivo:** `src/pages/urban/ManualReportPage.tsx`
- **O que existe:**
  - Campo **Foto** com dois botões: **Tirar Foto** (câmera) e **Galeria**
  - Input `type="file"` `accept="image/*"` com `capture="environment"` para câmera
  - Preview da foto antes de enviar
  - Upload para Supabase Storage e gravação no relato em `photos: [url]`
  - Limite 5MB, remoção da foto antes de enviar

Ou seja: no **formulário manual** a funcionalidade de upload de foto **existe e está implementada**. Se na prática não aparece ou não funciona, pode ser fluxo de navegação, feature flag ou bug de UI, não ausência de código.

### Chat (assistente) — **não tem upload de foto**

- **Componentes:** `ChatInput.tsx` envia apenas **texto** (`onSendMessage(message: string)`).
- **Backend:** `ai-orchestrator` não recebe nem processa imagens; só mensagens de texto.
- Não há botão de anexar foto, nem envio de arquivo, nem suporte a multimodal (texto + imagem) no chat.

---

## Sugestão de redação para a task no ClickUp

**Título:** Upload de foto no chatbot (hoje só no formulário manual)

**Descrição sugerida:**

- **Contexto:** No app, o **formulário manual** de relato urbano (`/relato-manual` ou fluxo ManualReportPage) já possui upload de foto (câmera e galeria). No **chat com o assistente**, não existe opção de enviar foto; apenas texto.
- **Objetivo:** Incluir no **chat** a possibilidade de o usuário anexar/enviar foto(s) no fluxo de relato (e, se aplicável, em outros fluxos guiados pelo assistente).
- **Escopo técnico (resumo):**
  1. **Frontend:** No `ChatInput` (ou área do chat), adicionar botão/opção de anexar imagem (câmera e/ou galeria), preview e envio junto com a mensagem (ou em mensagem dedicada).
  2. **Backend:** Adaptar o `ai-orchestrator` (e a API de chat) para aceitar imagem(ns): ex.: multipart ou URL de arquivo já enviado ao Storage; repassar imagem ao modelo se for multimodal (ex.: Gemini) ou salvar no relato como hoje no formulário manual.
  3. **Relato urbano via chat:** Quando o assistente criar relato (ex.: `create_urban_report`), incluir a(s) foto(s) enviada(s) no chat no campo `photos` do relato (mesmo formato do formulário manual).
- **Observação:** O formulário manual **já possui** upload de foto; a task foca em **replicar/estender essa capacidade para o chat**, não em implementar do zero no manual.

---

## Checklist rápido para dev

- [ ] Formulário manual: confirmar em qual tela/fluxo ele é acessado e se o campo Foto está visível e funcional.
- [ ] Chat: adicionar UI de anexar foto (ChatInput ou equivalente).
- [ ] Chat: definir formato de envio (ex.: upload para Storage → enviar URL na mensagem ou em payload separado).
- [ ] ai-orchestrator: aceitar imagem (URL ou base64) e repassar ao modelo e/ou à tool `create_urban_report`.
- [ ] Tool `create_urban_report`: aceitar e persistir `photos` quando a origem for o chat.
