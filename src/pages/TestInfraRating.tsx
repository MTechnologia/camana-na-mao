import React, { useState } from 'react';
import InlineRatingPicker from '@/components/ai/InlineRatingPicker';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TestInfraRating = () => {
  const navigate = useNavigate();
  const [result, setResult] = useState<{ displayLabel: string; score: number } | null>(null);

  const FIVE_LEVEL_LABELS = [
    "Péssimo",
    "Ruim",
    "Regular",
    "Bom",
    "Excelente",
  ];

  const handleRating = (score: number) => {
    const displayLabel = FIVE_LEVEL_LABELS[score - 1];
    setResult({ displayLabel, score });
    console.log('[TestInfraRating] Selected:', { displayLabel, score });
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <Button 
        variant="ghost" 
        onClick={() => navigate('/')}
        className="mb-6"
      >
        <ChevronLeft className="mr-2 h-4 w-4" />
        Voltar para a Home
      </Button>

      <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-primary">Teste: Pergunta de Infraestrutura</h1>
          <p className="text-muted-foreground">
            Validação do marcador [DIMENSION_RATING_PICKER:infraestrutura]
          </p>
        </div>

        <Card className="border-primary/20 shadow-lg overflow-hidden">
          <CardHeader className="bg-primary/5 border-b border-primary/10">
            <CardTitle className="text-lg">Exemplo de Bolha do Chat</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="bg-muted p-4 rounded-lg relative">
              <p className="text-sm font-medium mb-4">
                Como você avalia a **infraestrutura** (instalações, limpeza e conservação)? De 1 a 5 estrelas.
              </p>
              
              <InlineRatingPicker 
                dimensionKey="infraestrutura"
                onSelect={handleRating}
              />
              
              <div className="mt-4 pt-4 border-t border-muted-foreground/10 text-xs text-muted-foreground italic">
                Marcador detectado: [DIMENSION_RATING_PICKER:infraestrutura]
              </div>
            </div>

            {result && (
              <Card className="bg-green-500/10 border-green-500/20">
                <CardContent className="p-4">
                  <h3 className="font-semibold text-green-700 dark:text-green-400 mb-1">Resultado da Seleção:</h3>
                  <div className="space-y-1 text-sm text-green-600 dark:text-green-300">
                    <p><strong>Label:</strong> {result.displayLabel}</p>
                    <p><strong>Score:</strong> {result.score}</p>
                    <p><strong>Marcador Gerado:</strong> <code className="bg-green-500/20 px-1 rounded">[DIM_RATING:infraestrutura:{result.score}]</code></p>
                    <p className="mt-2 text-xs opacity-80 italic italic">
                      * Nota também será replicada para "limpeza_score" no backend.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-4 pt-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Critérios de Aceite (Task 3):</h3>
              <ul className="grid gap-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <div className="h-5 w-5 rounded-full bg-green-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                  </div>
                  <span>Exibe picker de estrelas (1 a 5) com labels padrão.</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-5 w-5 rounded-full bg-green-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                  </div>
                  <span>Mapeia seleção para marcador [DIM_RATING:infraestrutura:N].</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-5 w-5 rounded-full bg-green-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                  </div>
                  <span>Valor será replicado para "limpeza" no JSONB via backend.</span>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TestInfraRating;
