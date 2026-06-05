/**
 * Converte quebras simples "\n" em quebras DURAS de Markdown ("dois espaços + \n"),
 * para que cada linha renderize separada no chat (CommonMark trata "\n" simples como
 * espaço). Usado nos resumos pós-registro (ex.: "Avaliação registrada!"), onde o
 * marcador [..._CREATED] já foi removido do texto exibido. Puro/testável.
 */
export function toMarkdownHardBreaks(text: string): string {
  if (!text) return text;
  return text.replace(/\n/g, "  \n");
}
