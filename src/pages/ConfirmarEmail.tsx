import { useNavigate, useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Mail, ArrowRight } from "lucide-react";

const ConfirmarEmail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const email = (location.state as { email?: string } | null)?.email;

  return (
    <div className="min-h-screen bg-muted flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <Mail className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Confirme seu e-mail
          </h1>
          <p className="text-muted-foreground">
            {email ? (
              <>
                Enviamos um link de confirmação para <strong className="text-foreground">{email}</strong>.
                Abra seu e-mail e clique no link para ativar sua conta.
              </>
            ) : (
              <>
                Enviamos um link de confirmação para o e-mail informado no cadastro.
                Abra sua caixa de entrada e clique no link para ativar sua conta.
              </>
            )}
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          Depois de confirmar, você poderá fazer login e acessar o app normalmente.
        </p>
        <div className="flex flex-col gap-3 pt-4">
          <Button
            onClick={() => navigate("/login")}
            className="w-full"
          >
            Ir para o login
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <Link
            to="/welcome"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ConfirmarEmail;
