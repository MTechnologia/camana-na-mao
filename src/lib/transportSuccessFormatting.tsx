import type { ReactNode } from "react";

const FIELD_LABELS = [
  "Protocolo",
  "Tipo",
  "Linha",
  "Data",
  "Horário",
  "Sentido",
  "Frequência",
  "Impacto na rotina",
  "Parada / estação",
  "Ponto / referência",
  "Fotos anexadas",
  "Gravidade",
  "Descrição",
  "Local",
  "Acessibilidade",
] as const;

function splitFieldLine(line: string): { emoji: string; label: string; value: string } | null {
  for (const label of FIELD_LABELS) {
    const marker = `${label}:`;
    const idx = line.indexOf(marker);
    if (idx < 0) continue;
    return {
      emoji: line.slice(0, idx).trim(),
      label,
      value: line.slice(idx + marker.length).trim(),
    };
  }
  return null;
}

/** Renderiza uma linha do resumo pós-registro de transporte com rótulos em negrito. */
export function renderTransportSuccessLine(
  line: string,
  options?: { onMeusRelatos?: () => void },
): ReactNode {
  const cleaned = line
    .replace(/\]\([^)]*\)/g, "")
    .replace(/\(\/transporte\/meus-relatos\)/gi, "")
    .replace(/\[Meus relatos\]/gi, "Meus relatos")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (/^Relato de transporte registrado!/i.test(cleaned)) {
    return (
      <>
        ✅ <strong>Relato de transporte registrado!</strong>
      </>
    );
  }

  if (/^Resumo do seu relato:/i.test(cleaned)) {
    return <strong>Resumo do seu relato:</strong>;
  }

  if (/Próximos passos/i.test(cleaned)) {
    const rest = cleaned.replace(/^📚\s*Próximos passos:?\s*/iu, "").trim();
    return (
      <>
        📚 <strong>Próximos passos:</strong>
        {rest ? ` ${rest}` : null}
      </>
    );
  }

  if (/Meus relatos/i.test(cleaned) && !/Próximos passos/i.test(cleaned)) {
    return (
      <>
        🔗{" "}
        {options?.onMeusRelatos ? (
          <button
            type="button"
            onClick={options.onMeusRelatos}
            className="text-primary underline underline-offset-2 hover:text-primary/80 font-bold"
          >
            Meus relatos
          </button>
        ) : (
          <strong>Meus relatos</strong>
        )}
        {" "}
        para acompanhar.
      </>
    );
  }

  if (/^Quer que eu encaminhe/i.test(cleaned)) {
    return <strong>{cleaned}</strong>;
  }

  if (/Como foi seu atendimento/i.test(cleaned)) {
    const afterQuestion = cleaned.replace(
      /^Como foi seu atendimento aqui no Câmara na Mão\?\s*/i,
      "",
    );
    const oneToFive = afterQuestion.match(/^(.*?\b)de (1 a 5)(.*)$/i);
    if (oneToFive) {
      return (
        <>
          <strong>Como foi seu atendimento aqui no Câmara na Mão?</strong>{" "}
          {oneToFive[1]}
          de <strong>1 a 5</strong>
          {oneToFive[2]}
        </>
      );
    }
    return (
      <>
        <strong>Como foi seu atendimento aqui no Câmara na Mão?</strong>
        {afterQuestion ? ` ${afterQuestion}` : null}
      </>
    );
  }

  const field = splitFieldLine(cleaned);
  if (field) {
    return (
      <>
        {field.emoji ? `${field.emoji} ` : null}
        <strong>{field.label}:</strong>
        {field.value ? ` ${field.value}` : null}
      </>
    );
  }

  return cleaned;
}
