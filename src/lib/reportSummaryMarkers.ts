/**
 * Detecta a mensagem de RESUMO/CONFIRMAÇÃO de um relato (urbano/transporte) ou de uma
 * avaliação de serviço — a mensagem grande que o usuário precisa LER para confirmar ou
 * corrigir antes de enviar.
 *
 * Usado pelo chat (AgentChatArea) para posicionar o scroll no INÍCIO dessa mensagem em vez
 * de jogar o usuário no fim (onde ele perde o contexto do resumo). Os marcadores espelham os
 * que o ChatMessageBubble usa para renderizar os cards de confirmação.
 */
export function isReportSummaryConfirmation(content: string): boolean {
  if (!content) return false;

  // Relato urbano: "**Resumo do relato**" + [QUICK_REPLY:confirmar,corrigir]
  if (
    /\*\*resumo do relato\*\*/i.test(content) &&
    /\[QUICK_REPLY:[^\]]*confirmar[^\]]*corrigir/i.test(content)
  ) {
    return true;
  }

  // Relato de transporte: "resumo do relato de transporte" + QUICK_REPLY (registrar/confirmar/corrigir)
  if (
    /resumo do relato de transporte/i.test(content) &&
    /\[QUICK_REPLY:[^\]]*(?:registrar|confirmar|corrigir)/i.test(content)
  ) {
    return true;
  }

  // Avaliação de serviço: [RATING_SUBMIT_PREVIEW] + [QUICK_REPLY:...publicar]
  if (
    /\[RATING_SUBMIT_PREVIEW\]/i.test(content) &&
    /\[QUICK_REPLY:[^\]]*publicar/i.test(content)
  ) {
    return true;
  }

  return false;
}
