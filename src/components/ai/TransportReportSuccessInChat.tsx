import { useNavigate } from "react-router-dom";
import type { ParsedTransportReportSuccess } from "@/lib/parseTransportReportSuccess";
import { renderTransportSuccessLine } from "@/lib/transportSuccessFormatting";

type Props = {
  success: ParsedTransportReportSuccess;
};

/**
 * Resumo pós-registro de transporte — uma linha por campo, rótulos em negrito.
 */
export function TransportReportSuccessInChat({ success }: Props) {
  const navigate = useNavigate();
  const goMeusRelatos = () => navigate("/transporte/meus-relatos");

  return (
    <div className="space-y-1 text-sm leading-relaxed">
      {success.lines.map((line, index) => (
        <p key={index} className="mb-1 last:mb-0">
          {renderTransportSuccessLine(line, { onMeusRelatos: goMeusRelatos })}
        </p>
      ))}
    </div>
  );
}
