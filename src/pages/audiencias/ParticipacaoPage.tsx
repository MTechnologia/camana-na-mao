import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Mail, Heart, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import PageHeader from "@/components/ui/page-header";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

const mockAudiencias = [
  { id: "1", title: "Mobilidade Urbana na Zona Leste", theme: "Mobilidade" },
  { id: "2", title: "Educação Integral nas Escolas Municipais", theme: "Educação" },
  { id: "3", title: "Investimentos em UBS e Hospitais", theme: "Saúde" },
  { id: "4", title: "Preservação de Parques Urbanos", theme: "Meio Ambiente" },
];

const temas = [
  { id: "mobilidade", label: "Mobilidade Urbana", icon: "🚌" },
  { id: "educacao", label: "Educação", icon: "📚" },
  { id: "saude", label: "Saúde", icon: "🏥" },
  { id: "meio-ambiente", label: "Meio Ambiente", icon: "🌳" },
  { id: "cultura", label: "Cultura", icon: "🎭" },
  { id: "seguranca", label: "Segurança", icon: "🚔" },
];

const ParticipacaoPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState("");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const audiencia = mockAudiencias.find(a => a.id === id);

  if (!audiencia) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Audiência não encontrada" backTo="/audiencias" />
        <div className="pt-[60px] p-6 text-center">
          <p className="text-muted-foreground mb-4">A audiência solicitada não foi encontrada.</p>
          <Button onClick={() => navigate("/audiencias")}>Voltar para audiências</Button>
        </div>
      </div>
    );
  }

  const handleEmailSubmit = () => {
    if (!email || !email.includes("@")) {
      toast.error("Por favor, insira um e-mail válido");
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setStep(2);
      toast.success("E-mail registrado com sucesso!");
    }, 1000);
  };

  const handleFinish = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setStep(3);
    }, 1000);
  };

  const handleSkipInterests = () => {
    setStep(3);
  };

  const toggleInterest = (interestId: string) => {
    setSelectedInterests(prev =>
      prev.includes(interestId)
        ? prev.filter(id => id !== interestId)
        : [...prev, interestId]
    );
  };

  const progressValue = step === 1 ? 33 : step === 2 ? 66 : 100;

  if (step === 3) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="flex justify-center">
            <div className="p-4 bg-green-500/10 rounded-full">
              <CheckCircle2 className="h-16 w-16 text-green-600" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">Inscrição realizada!</h2>
            <p className="text-muted-foreground">
              Você receberá um e-mail com todas as informações para participar da audiência.
            </p>
          </div>
          <Button onClick={() => navigate("/audiencias")} className="w-full">
            Ver outras audiências
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <PageHeader title="Quero participar" />
      
      <div className="pt-[60px] p-6 space-y-6">
        {/* Título da audiência */}
        <div>
          <p className="text-sm text-muted-foreground mb-1">Para:</p>
          <h2 className="text-lg font-semibold text-foreground">{audiencia.title}</h2>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <Progress value={progressValue} className="h-2" />
          <p className="text-xs text-muted-foreground text-center">
            Etapa {step} de 2
          </p>
        </div>

        {/* Step 1: Email */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-primary">
                <Mail className="h-5 w-5" />
                <h3 className="font-semibold text-foreground">E-mail para receber convite</h3>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Seu e-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full"
                />
              </div>

              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <p className="text-sm font-medium text-foreground">✅ O que você vai receber:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Link de acesso à audiência</li>
                  <li>• Instruções de participação</li>
                  <li>• Materiais de apoio</li>
                  <li>• Lembrete 1 dia antes</li>
                </ul>
              </div>

              <div className="text-xs text-muted-foreground space-y-1">
                <p>📧 Envio: entre 8h e 20h</p>
                <p>🔒 Dados protegidos conforme LGPD</p>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => navigate(`/audiencias/${id}`)} className="flex-1">
                Voltar
              </Button>
              <Button onClick={handleEmailSubmit} disabled={isLoading} className="flex-1">
                {isLoading ? "Registrando..." : "Continuar"}
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Interests */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-primary">
                <Heart className="h-5 w-5" />
                <h3 className="font-semibold text-foreground">Seus temas de interesse</h3>
              </div>
              
              <p className="text-sm text-muted-foreground">
                Receba notificações sobre novas audiências dos temas:
              </p>

              <div className="space-y-2">
                {temas.map((tema) => (
                  <div
                    key={tema.id}
                    className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => toggleInterest(tema.id)}
                  >
                    <Checkbox
                      id={tema.id}
                      checked={selectedInterests.includes(tema.id)}
                      onCheckedChange={() => toggleInterest(tema.id)}
                    />
                    <label
                      htmlFor={tema.id}
                      className="flex-1 text-sm font-medium leading-none cursor-pointer"
                    >
                      {tema.icon} {tema.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={handleSkipInterests} className="flex-1">
                Pular
              </Button>
              <Button 
                onClick={handleFinish} 
                disabled={isLoading || selectedInterests.length === 0} 
                className="flex-1"
              >
                {isLoading ? "Finalizando..." : `Finalizar (${selectedInterests.length})`}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ParticipacaoPage;
