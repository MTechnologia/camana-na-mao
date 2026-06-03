import { Accessibility, HelpCircle, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useOnboarding } from "@/contexts/OnboardingContext";
import PageHeader from "@/components/ui/page-header";
import ProfilePageHeader from "@/components/profile/ProfilePageHeader";

/**
 * NREF016 — Acessibilidade em estudo. Controles antigos (fonte/contraste) foram retirados do menu
 * do perfil até concluir revisão geral do app (WCAG, leitores de tela, teclado, contraste em todas as telas).
 */
const AccessibilityPage = () => {
  const navigate = useNavigate();
  const { triggerTutorial } = useOnboarding();

  const handleTutorial = () => {
    triggerTutorial();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background pt-[60px]">
      <PageHeader title="Acessibilidade" backTo="/perfil" />

      <div className="px-4 pt-2 pb-1">
        <ProfilePageHeader subtitle="Revisão em andamento" />
      </div>

      <div className="p-6 space-y-4 pb-8">
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Info className="h-4 w-4 text-primary shrink-0" aria-hidden />
              Estudo de acessibilidade em andamento
            </CardTitle>
            <CardDescription>
              Estamos revisando a acessibilidade do Câmara na Mão de forma integrada em todo o
              aplicativo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>
              As opções que apareciam aqui (tamanho de fonte, alto contraste e espaçamento) não
              cobriam todas as telas e fluxos. Por isso, o menu de acessibilidade foi
              temporariamente retirado do perfil enquanto conduzimos um{" "}
              <strong className="font-medium text-foreground">estudo geral</strong> com critérios de
              inclusão digital e boas práticas (por exemplo, navegação por teclado, leitores de tela
              e contraste consistente).
            </p>
            <p>
              Se você já havia ajustado preferências antes desta atualização, elas podem continuar
              ativas neste dispositivo até você limpar os dados do navegador ou reinstalar o app.
            </p>
            <p>
              Para notificações e demais preferências da conta, use{" "}
              <button
                type="button"
                className="text-primary font-medium underline underline-offset-2"
                onClick={() => navigate("/perfil/preferencias")}
              >
                Preferências
              </button>
              .
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Accessibility className="h-4 w-4 text-primary shrink-0" aria-hidden />O que vem na
              próxima etapa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
              <li>Auditoria das telas principais (cadastro, relatos, mapa, audiências e perfil)</li>
              <li>Controles de acessibilidade unificados e testados em web e app</li>
              <li>Compatibilidade com recursos do sistema operacional e do navegador</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border-dashed">
          <CardContent className="py-4">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-auto py-3"
              onClick={handleTutorial}
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <HelpCircle className="h-5 w-5 text-primary" aria-hidden />
              </div>
              <div className="text-left">
                <p className="font-medium text-foreground">Rever tutorial do app</p>
                <p className="text-xs text-muted-foreground">
                  Guia de primeiros passos no Câmara na Mão
                </p>
              </div>
            </Button>
          </CardContent>
        </Card>

        <Button variant="outline" className="w-full" onClick={() => navigate("/perfil")}>
          Voltar ao meu perfil
        </Button>
      </div>
    </div>
  );
};

export default AccessibilityPage;
