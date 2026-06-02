import { useState } from "react";
import { WaitTimePicker } from "@/components/ai/WaitTimePicker";

/**
 * Página temporária para validação visual do WaitTimePicker.
 * Acesse: /test-wait-time
 *
 * REMOVER APÓS VALIDAÇÃO.
 */
const TestWaitTimePicker = () => {
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [selectedScore, setSelectedScore] = useState<number | null | undefined>(undefined);

  const handleSelect = (displayLabel: string, score: number | null) => {
    setSelectedLabel(displayLabel);
    setSelectedScore(score);
    console.log("[TEST] WaitTimePicker selecionado:", { displayLabel, score });
    console.log(
      "[TEST] Mensagem que seria enviada:",
      `Tempo de espera: ${displayLabel} ${score === null ? "[WAIT_TIME:null]" : `[WAIT_TIME:${score}]`}`,
    );
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-xl font-bold">🧪 Teste: WaitTimePicker</h1>
          <p className="text-sm text-muted-foreground">Validação visual do componente OS-06</p>
        </div>

        {/* Simula a bolha do assistente */}
        <div className="bg-muted/50 rounded-2xl p-4 space-y-3">
          <p className="text-sm font-medium">
            <strong>Quanto tempo você esperou</strong> para ser atendido? Escolha uma opção abaixo.
          </p>

          <WaitTimePicker onSelect={handleSelect} />
        </div>

        {/* Resultado da seleção */}
        {selectedScore !== undefined && (
          <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl p-4 space-y-2">
            <p className="text-sm font-semibold text-green-700 dark:text-green-400">
              ✅ Seleção capturada:
            </p>
            <div className="text-sm space-y-1">
              <p>
                <strong>Label:</strong> {selectedLabel}
              </p>
              <p>
                <strong>Score:</strong>{" "}
                {selectedScore === null ? "null (Não se aplica)" : selectedScore}
              </p>
              <p className="font-mono text-xs bg-background/80 p-2 rounded mt-2">
                Tempo de espera: {selectedLabel}{" "}
                {selectedScore === null ? "[WAIT_TIME:null]" : `[WAIT_TIME:${selectedScore}]`}
              </p>
            </div>
          </div>
        )}

        {/* Tabela de mapeamento */}
        <div className="border rounded-xl p-4 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase">
            Mapeamento RN-EVAL-001
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="pb-1">Faixa</th>
                <th className="pb-1">Nota</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              <tr>
                <td>{"< 15 min"}</td>
                <td className="font-mono">5</td>
              </tr>
              <tr>
                <td>15–30 min</td>
                <td className="font-mono">4</td>
              </tr>
              <tr>
                <td>30–60 min</td>
                <td className="font-mono">3</td>
              </tr>
              <tr>
                <td>{"> 1 hora"}</td>
                <td className="font-mono">2</td>
              </tr>
              <tr>
                <td>Não se aplica</td>
                <td className="font-mono">null</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TestWaitTimePicker;
