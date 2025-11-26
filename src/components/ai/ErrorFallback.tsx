import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface ErrorFallbackProps {
  error?: string;
}

const ErrorFallback = ({ error = "Algo deu errado" }: ErrorFallbackProps) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
        <AlertTriangle className="w-10 h-10 text-destructive" />
      </div>

      <h2 className="text-xl font-bold text-foreground mb-2 text-center">
        Ops! Encontramos um problema
      </h2>
      
      <p className="text-muted-foreground text-center mb-6 max-w-sm">
        {error}
      </p>

      <div className="flex gap-3">
        <Button
          onClick={() => window.location.reload()}
          variant="outline"
        >
          Recarregar
        </Button>
        <Button
          onClick={() => navigate("/home")}
          className="bg-primary hover:bg-primary/90"
        >
          Voltar ao início
        </Button>
      </div>

      <div className="mt-8 p-4 bg-muted rounded-xl max-w-md">
        <h3 className="font-semibold text-sm text-foreground mb-2">
          💡 Sugestão
        </h3>
        <p className="text-xs text-muted-foreground">
          Você pode acessar as funcionalidades principais através do menu tradicional enquanto resolvemos isso.
        </p>
      </div>
    </div>
  );
};

export default ErrorFallback;
