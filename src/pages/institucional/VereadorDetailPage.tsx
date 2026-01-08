import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Phone, Mail, Share2, Building2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { vereadores } from "@/data/vereadores";
import { toast } from "sonner";

const VereadorDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const vereador = vereadores.find((v) => v.id === id);

  if (!vereador) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
        <p className="text-muted-foreground mb-4">Vereador não encontrado</p>
        <Button onClick={() => navigate("/institucional/vereadores")}>
          Ver todos os vereadores
        </Button>
      </div>
    );
  }

  const handleShare = async () => {
    const shareData = {
      title: vereador.name,
      text: `Conheça o vereador ${vereador.name} (${vereador.party})`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // User cancelled or error
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copiado!");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center justify-between px-4 h-14">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-medium text-sm truncate max-w-[200px]">
            {vereador.name}
          </h1>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={handleShare}>
              <Share2 className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="p-4 pb-24 max-w-2xl mx-auto">
        {/* Profile Card */}
        <Card className="p-6 mb-6">
          <div className="flex flex-col items-center text-center">
            <Avatar className="h-24 w-24 mb-4">
              <AvatarImage src={vereador.photo} alt={vereador.name} />
              <AvatarFallback className="bg-primary/10 text-primary text-2xl font-semibold">
                {vereador.initials}
              </AvatarFallback>
            </Avatar>

            <h2 className="text-xl font-bold text-foreground mb-2">
              {vereador.name}
            </h2>

            <Badge variant="outline" className="mb-4">
              {vereador.party}
            </Badge>

            {vereador.region && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{vereador.region}</span>
              </div>
            )}
          </div>
        </Card>

        {/* Contact Information */}
        <Card className="p-6 mb-6">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Contato
          </h3>

          <div className="space-y-4">
            <a
              href={`tel:${vereador.phone}`}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Phone className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Telefone</p>
                <p className="font-medium">{vereador.phone}</p>
              </div>
            </a>

            <Separator />

            <a
              href={`mailto:${vereador.email}`}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">E-mail</p>
                <p className="font-medium truncate">{vereador.email}</p>
              </div>
            </a>
          </div>
        </Card>

        {/* Mandate Info */}
        <Card className="p-6">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Mandato
          </h3>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Legislatura</span>
              <span className="font-medium">18ª (2025-2028)</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cargo</span>
              <span className="font-medium">Vereador(a)</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Partido</span>
              <span className="font-medium">{vereador.party}</span>
            </div>
          </div>
        </Card>

        {/* Footer Info */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
          <p><strong>Fonte:</strong> Portal da Câmara Municipal de São Paulo</p>
          <p><strong>Atualização:</strong> Dados atualizados semanalmente</p>
        </div>

        {/* Back Button */}
        <div className="mt-6 text-center">
          <Button
            variant="outline"
            onClick={() => navigate("/institucional/vereadores")}
          >
            Ver todos os vereadores
          </Button>
        </div>
      </main>
    </div>
  );
};

export default VereadorDetailPage;
