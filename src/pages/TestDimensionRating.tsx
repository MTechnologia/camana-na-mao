import { useState } from "react";
import { InlineRatingPicker } from "@/components/ai/InlineRatingPicker";

const LABELS = ["Péssimo", "Ruim", "Regular", "Bom", "Excelente"] as const;

export default function TestDimensionRating() {
  const [result, setResult] = useState<{ dimensionKey: string; stars: number } | null>(null);

  const handleSelect = (stars: number) => {
    setResult({ dimensionKey: "atendimento", stars });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold">🧪 Teste: Dimension Rating</h1>
          <p className="text-sm text-muted-foreground">
            Validação visual do componente — Task #3106160 (Qualidade do Atendimento)
          </p>
        </div>

        {/* Simulação da pergunta do assistente */}
        <div className="bg-muted rounded-lg p-4 space-y-2">
          <p className="text-sm">
            Como você avalia a <strong>qualidade do atendimento</strong>? De 1 a 5 estrelas.
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            ⭐ Selecione uma nota de 1 a 5:
          </p>

          {/* Componente com dimensionKey */}
          <InlineRatingPicker dimensionKey="atendimento" onSelect={handleSelect} />
        </div>

        {/* Resultado da seleção */}
        {result && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium text-green-700 dark:text-green-300">
              ✅ Seleção capturada:
            </p>
            <ul className="text-xs space-y-1 text-green-600 dark:text-green-400">
              <li>
                <strong>Dimensão:</strong> {result.dimensionKey}
              </li>
              <li>
                <strong>Estrelas:</strong> {result.stars}
              </li>
              <li>
                <strong>Label:</strong> {LABELS[result.stars - 1]}
              </li>
              <li>
                <strong>Mensagem formatada:</strong>{" "}
                <code className="bg-green-100 dark:bg-green-800 px-1 rounded">
                  Atendimento: {result.stars} estrelas [DIM_RATING:atendimento:{result.stars}]
                </code>
              </li>
            </ul>
          </div>
        )}

        {/* Tabela de labels */}
        <div className="border rounded-lg p-4 space-y-3">
          <h2 className="text-sm font-semibold uppercase text-muted-foreground">
            Labels por estrela
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-1">Estrela</th>
                <th className="text-left py-1">Label</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map((star) => (
                <tr key={star} className="border-b last:border-0">
                  <td className="py-1">⭐ {star}</td>
                  <td className="py-1 font-mono">{LABELS[star - 1]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Comparação: rating geral vs dimensão */}
        <div className="border rounded-lg p-4 space-y-3">
          <h2 className="text-sm font-semibold uppercase text-muted-foreground">
            Comparação: Geral vs Dimensão
          </h2>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Rating geral (sem dimensionKey):</p>
              <InlineRatingPicker onSelect={() => {}} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                Rating de dimensão (com dimensionKey="atendimento"):
              </p>
              <InlineRatingPicker dimensionKey="atendimento" onSelect={() => {}} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
