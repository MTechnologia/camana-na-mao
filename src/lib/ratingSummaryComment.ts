/**
 * Texto bruto das mensagens de sucesso da avaliação pode vir do tool (template fixo)
 * ou ser levemente parafraseado pelo modelo — cobrimos variações comuns.
 */

function normalizeUnicode(s: string): string {
  return s.normalize("NFC");
}

/** Linhas que são o rótulo do comentário na avaliação (não a nota de moderação em outra linha). */
function isRatingComentarioLabelLine(line: string): boolean {
  const t = line.trimStart();
  if (/⏳\s*\*\*Seu comentário passará/i.test(line)) return false;
  if (!/Comentário/i.test(line) || !/:/.test(line)) return false;
  return (
    /📝/.test(line) ||
    /\*\*Comentário\*\*/.test(line) ||
    /\*\*Comentário:\*\*/.test(line) ||
    /^Comentário\s*:/i.test(t)
  );
}

/**
 * Substitui o valor na linha do comentário (uma linha por vez).
 */
function replaceComentarioLineByLine(raw: string, newComment: string): string {
  const t = newComment.trim();
  const lines = raw.split(/\r?\n/);
  let changed = false;
  const out = lines.map((line) => {
    if (!isRatingComentarioLabelLine(line)) return line;
    const patterns: RegExp[] = [
      /^(\s*📝\s*\*\*Comentário\*\*:\s*)([^\r\n]*)$/u,
      /^(\s*📝\s*\*\*Comentário:\*\*\s*)([^\r\n]*)$/u,
      /^(\s*📝\s*Comentário:\s*)([^\r\n]*)$/iu,
      /^(\s*\*\*Comentário\*\*:\s*)([^\r\n]*)$/u,
      /^(\s*\*\*Comentário:\*\*\s*)([^\r\n]*)$/u,
      /^(\s*Comentário:\s*)([^\r\n]*)$/iu,
    ];
    for (const re of patterns) {
      if (re.test(line)) {
        changed = true;
        return line.replace(re, `$1${t}`);
      }
    }
    return line;
  });
  return changed ? out.join("\n") : raw;
}

/**
 * Substitui apenas o trecho do comentário na mensagem bruta (preserva o restante).
 */
export function replaceRatingSummaryComment(raw: string, newComment: string): string {
  const t = newComment.trim();
  const nfc = normalizeUnicode(raw);

  const fullTextPatterns: Array<[RegExp, string]> = [
    [/(📝\s*\*\*Comentário\*\*:\s*)([^\r\n]*)/gu, `$1${t}`],
    [/(📝\s*\*\*Comentário:\*\*\s*)([^\r\n]*)/gu, `$1${t}`],
    [/(📝\s*Comentário:\s*)([^\r\n]*)/giu, `$1${t}`],
    [/(\*\*Comentário\*\*:\s*)([^\r\n]*)/gu, `$1${t}`],
    [/(\*\*Comentário:\*\*\s*)([^\r\n]*)/gu, `$1${t}`],
  ];

  for (const [re, replacement] of fullTextPatterns) {
    const next = nfc.replace(re, replacement);
    if (next !== nfc) return next;
  }

  const byLine = replaceComentarioLineByLine(nfc, t);
  if (byLine !== nfc) return byLine;

  return raw;
}

/**
 * Extrai o texto exibido após o rótulo do comentário na mensagem de sucesso.
 */
export function parseRatingSummaryComment(raw: string): string | null {
  const nfc = normalizeUnicode(raw);
  const linePatterns = [
    /📝\s*\*\*Comentário\*\*:\s*([^\r\n]+)/u,
    /📝\s*\*\*Comentário:\*\*\s*([^\r\n]+)/u,
    /📝\s*Comentário:\s*([^\r\n]+)/iu,
    /\*\*Comentário\*\*:\s*([^\r\n]+)/u,
    /\*\*Comentário:\*\*\s*([^\r\n]+)/u,
  ];
  for (const re of linePatterns) {
    const m = nfc.match(re);
    if (m?.[1]) return m[1].trim();
  }
  const lines = nfc.split(/\r?\n/);
  for (const line of lines) {
    if (!isRatingComentarioLabelLine(line)) continue;
    const m = line.match(/:\s*([^\r\n]+)$/u);
    if (m?.[1] && !/^⏳/u.test(m[1].trim())) return m[1].trim();
  }
  return null;
}

/**
 * Garante substituição do texto do comentário no resumo da avaliação.
 * Usa `replaceRatingSummaryComment` e, se o texto não mudar, reescreve a linha
 * que contém "Comentário" (evita UI presa quando o modelo usa formato fora do padrão).
 */
export function forceReplaceRatingComment(raw: string, newComment: string): string {
  const t = newComment.trim();
  if (!t) return raw;

  const working = replaceRatingSummaryComment(raw, t);

  if (!/\[RATING_CREATED:/i.test(working)) return working;

  const lines = working.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/⏳\s*\*\*Seu comentário passará/i.test(line)) continue;
    if (!/Comentário/i.test(line) || !/:/.test(line)) continue;
    const trimmed = line.trimStart();
    if (
      /📝/.test(line) ||
      /\*\*Comentário\*\*/.test(line) ||
      /\*\*Comentário:\*\*/.test(line) ||
      /^Comentário\s*:/i.test(trimmed)
    ) {
      lines[i] = `📝 **Comentário:** ${t}`;
      return lines.join("\n");
    }
  }

  const loose = working.replace(/(Comentário\s*:\s*)([^\r\n]+)/iu, `$1${t}`);
  if (loose !== working) return loose;

  return working;
}
