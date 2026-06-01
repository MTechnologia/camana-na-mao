import DOMPurify from "dompurify";

/**
 * Sanitiza HTML rico para render seguro com dangerouslySetInnerHTML.
 * Remove scripts, handlers de evento e demais vetores de XSS.
 */
export function sanitizeRichHtml(html: string | null | undefined): string {
  return DOMPurify.sanitize(html ?? "");
}

/**
 * Sanitiza HTML permitindo apenas formatação básica (strong, p, br).
 * Usado em conteúdos curtos como `services_offered` dos equipamentos.
 */
export function sanitizeRestrictedHtml(html: string | null | undefined): string {
  return DOMPurify.sanitize(html ?? "", {
    ALLOWED_TAGS: ["strong", "p", "br"],
    ALLOWED_ATTR: [],
  });
}
