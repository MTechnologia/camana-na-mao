import { ArrowLeft, HelpCircle, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAccessibility } from "@/hooks/useAccessibility";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useOnboarding } from "@/contexts/OnboardingContext";

const AccessibilityPage = () => {
  const navigate = useNavigate();
  const { triggerTutorial } = useOnboarding();
  const {
    fontSize,
    readingMode,
    textSpacing,
    setFontSize,
    toggleReadingMode,
    toggleTextSpacing,
  } = useAccessibility();

  const handleTutorial = () => {
    triggerTutorial();
    navigate("/ia");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 hover:bg-accent rounded-full transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft size={24} className="text-foreground" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">Acessibilidade</h1>
        </div>
      </header>

      {/* Content */}
      <div className="p-4 space-y-4 pb-8">
        {/* Tamanho da Fonte */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="text-xl">Aa</span>
              Tamanho da Fonte
            </CardTitle>
            <CardDescription>
              Ajuste o tamanho do texto para melhor leitura
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <button
                onClick={() => setFontSize("small")}
                className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all ${
                  fontSize === "small"
                    ? "border-primary bg-primary/10 text-primary font-semibold"
                    : "border-border text-foreground hover:border-primary/50"
                }`}
              >
                <span className="text-sm">A</span>
                <p className="text-[10px] text-muted-foreground mt-1">Pequeno</p>
              </button>
              <button
                onClick={() => setFontSize("medium")}
                className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all ${
                  fontSize === "medium"
                    ? "border-primary bg-primary/10 text-primary font-semibold"
                    : "border-border text-foreground hover:border-primary/50"
                }`}
              >
                <span className="text-base">A</span>
                <p className="text-[10px] text-muted-foreground mt-1">Médio</p>
              </button>
              <button
                onClick={() => setFontSize("large")}
                className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all ${
                  fontSize === "large"
                    ? "border-primary bg-primary/10 text-primary font-semibold"
                    : "border-border text-foreground hover:border-primary/50"
                }`}
              >
                <span className="text-lg">A</span>
                <p className="text-[10px] text-muted-foreground mt-1">Grande</p>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Modo de Leitura */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📖</span>
                <div>
                  <p className="font-medium text-foreground">Modo de Leitura</p>
                  <p className="text-xs text-muted-foreground">Alto contraste para melhor visibilidade</p>
                </div>
              </div>
              <Switch checked={readingMode} onCheckedChange={toggleReadingMode} />
            </div>
          </CardContent>
        </Card>

        {/* Espaçamento de Texto */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">↔️</span>
                <div>
                  <p className="font-medium text-foreground">Espaçamento de Texto</p>
                  <p className="text-xs text-muted-foreground">Mais espaço entre linhas e letras</p>
                </div>
              </div>
              <Switch checked={textSpacing} onCheckedChange={toggleTextSpacing} />
            </div>
          </CardContent>
        </Card>

        {/* Divider */}
        <div className="py-2" />

        {/* Tutorial */}
        <Card className="border-dashed">
          <CardContent className="py-4">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-auto py-3"
              onClick={handleTutorial}
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <HelpCircle className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-medium text-foreground">Rever Tutorial</p>
                <p className="text-xs text-muted-foreground">Veja novamente o guia de primeiros passos</p>
              </div>
            </Button>
          </CardContent>
        </Card>

        {/* Preferências */}
        <Card className="border-dashed">
          <CardContent className="py-4">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-auto py-3"
              onClick={() => navigate('/profile/preferences')}
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Settings className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-medium text-foreground">Todas as Preferências</p>
                <p className="text-xs text-muted-foreground">Notificações, privacidade e mais</p>
              </div>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AccessibilityPage;
