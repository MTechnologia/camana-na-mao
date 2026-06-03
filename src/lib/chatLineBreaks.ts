/**
 * Quebras de linha para a diagramação das respostas do chat (NREF006).
 *
 * O ReactMarkdown colapsa quebras de linha simples (`\n`), então respostas longas
 * com listas/tópicos (paradas de ônibus, audiências, serviços, resumos…) viram um
 * bloco corrido difícil de ler — especialmente no mobile. Aqui convertemos o `\n`
 * dessas linhas em quebra "hard" do Markdown (dois espaços + `\n`), renderizando
 * **um item por linha**, no mesmo estilo do resumo de relato de transporte.
 */

/** Início de linha de item de lista: bullet (•/·/▪/◦/‣) ou emoji. */
const LIST_ITEM_START = /^[ \t]*(?:[•·▪◦‣]|\p{Extended_Pictographic})/u;

/**
 * Quando o texto tem 2+ linhas começando com bullet ou emoji, força a quebra
 * visual antes de cada uma dessas linhas. Prosa comum (sem esses marcadores) e
 * textos com 0–1 item ficam inalterados.
 */
export function withStructuredListLineBreaks(text: string): string {
  if (!text || !text.includes("\n")) return text;
  const listLineCount = text.split("\n").filter((line) => LIST_ITEM_START.test(line)).length;
  if (listLineCount < 2) return text;
  return text.replace(/\n(?=[ \t]*(?:[•·▪◦‣]|\p{Extended_Pictographic}))/gu, "  \n");
}
