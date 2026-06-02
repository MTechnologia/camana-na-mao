import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TestTask4 = () => {
  const navigate = useNavigate();
  const [inputValue, setInputValue] = useState('');
  const [result, setResult] = useState<{ status: string; finalValue: string; bypassed: boolean } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = inputValue.trim().toLowerCase();
    
    // Simulando a lógica de lib.ts do backend que captura o "pular"
    let status = '';
    let finalValue = null;
    let bypassed = false;

    if (val === 'pular' || val === 'não' || val === 'nao' || val === 'próximo') {
      status = 'Bypass detectado';
      finalValue = 'null';
      bypassed = true;
    } else if (val.length >= 5) {
      status = 'Texto Válido';
      finalValue = inputValue;
      bypassed = false;
    } else {
      status = 'Erro: Texto Curto demais (Solicitaria novamente no bot)';
      finalValue = inputValue;
      bypassed = false;
    }

    setResult({ status, finalValue, bypassed });
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
          <h1 className="text-3xl font-bold tracking-tight text-primary">Teste: Sugestão de Melhoria</h1>
          <p className="text-muted-foreground">
            Validação da lógica de texto livre e bypass (Task 4)
          </p>
        </div>

        <Card className="border-primary/20 shadow-lg overflow-hidden">
          <CardHeader className="bg-primary/5 border-b border-primary/10">
            <CardTitle className="text-lg">Exemplo de Lógica (Bot /lib.ts)</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="bg-muted p-4 rounded-lg relative">
              <p className="text-sm font-medium mb-4">
                Você tem alguma **sugestão de melhoria** ou quer deixar um comentário extra? (Digite abaixo ou diga "pular")
              </p>
              
              <form onSubmit={handleSubmit} className="flex gap-2">
                <Input 
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Digite sua sugestão ou 'pular'..."
                  className="bg-background"
                />
                <Button type="submit">Enviar</Button>
              </form>
              
              <div className="mt-4 pt-4 border-t border-muted-foreground/10 text-xs text-muted-foreground italic">
                Simula o prompt gerado em [index.ts] aguardando input do cidadão.
              </div>
            </div>

            {result && (
              <Card className={`border ${result.bypassed ? 'bg-orange-500/10 border-orange-500/20' : result.status.includes('Erro') ? 'bg-red-500/10 border-red-500/20' : 'bg-green-500/10 border-green-500/20'}`}>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-1">Resultado do Processamento (Backend):</h3>
                  <div className="space-y-1 text-sm">
                    <p><strong>Status de Validação:</strong> {result.status}</p>
                    <p><strong>Valor salvo no Banco:</strong> <code>{result.finalValue}</code></p>
                    {result.bypassed && (
                      <p className="mt-2 text-xs italic opacity-90 text-orange-700 dark:text-orange-300">
                        * O loop obrigatório foi encerrado antecipadamente.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-4 pt-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Critérios de Aceite (Task 4):</h3>
              <ul className="grid gap-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <div className="h-5 w-5 rounded-full bg-green-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                  </div>
                  <span>Exige no mínimo 5 caracteres se preenchido.</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-5 w-5 rounded-full bg-green-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                  </div>
                  <span>Pode pular etapa digitando "pular", "não" ou "próximo".</span>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TestTask4;
