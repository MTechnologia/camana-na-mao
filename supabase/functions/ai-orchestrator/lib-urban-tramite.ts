/**
 * Texto educativo sobre o trâmite administrativo de relatos (requisito PO).
 * Fonte única para: mensagem pós-registro + instruções no system prompt (evita contradições).
 */

/** Bloco exibido após create_urban_report (Markdown). */
export const URBAN_REPORT_TRAMITE_AFTER_REGISTRATION = `
📚 **Como funciona depois do registro**

- **Onde fica:** seu relato fica registrado na plataforma **Câmara na Mão**, com protocolo.
- **Quem analisa primeiro:** passa por **triagem** — equipe da Câmara e processos internos (incluindo fluxos automatizados) conferem tipo, local e prioridade.
- **Para onde pode ir:** conforme o tema, pode ser encaminhado a **comissões temáticas** da Câmara e/ou a **órgãos do Executivo municipal** (Prefeitura e secretarias), que costumam ser os responsáveis pela execução na rua (iluminação, limpeza, vias, esgoto etc.).
- **Prazos:** **não há um prazo único** para todas as demandas — dependem da complexidade, da área competente e da prioridade. Acompanhe o **status** em **Meus relatos** no app.

_Em caso de **risco imediato** na rua, use também os canais de emergência (190/192/193)._
`.trim();

/** Resumo após create_transport_report (Markdown). */
export const TRANSPORT_REPORT_TRAMITE_AFTER_REGISTRATION = `
📚 **Próximos passos**

O relato segue **triagem** na Câmara (tipo, linha, data, gravidade) e pode ser encaminhado às áreas competentes (ex.: mobilidade e órgãos parceiros). **Prazos variam** conforme o caso — acompanhe em **Meus relatos**.
`.trim();

/** Trecho injetado no system prompt quando o cidadão pergunta sobre trâmite (sem duplicar o pós-registro inteiro). */
export const URBAN_REPORT_TRAMITE_FOR_SYSTEM_PROMPT = `
Quando o cidadão perguntar como funciona o **trâmite**, **para onde vai** o relato, **quem analisa**, **prazos** ou **o que acontece depois** de registrar um problema na cidade:
- Explique em linguagem simples: registro na plataforma → triagem (Câmara / processos internos) → possível encaminhamento a comissões da Câmara e/ou Prefeitura (execução na rua).
- Deixe claro que **não existe um prazo fixo único** para todas as demandas; o acompanhamento é pelo status em **Meus relatos**.
- Em **risco imediato**, mencione os canais de emergência (190/192/193).
- Não invente prazos legais garantidos (ex. "em 5 dias") nem compromissos que não estejam acima.
`.trim();
