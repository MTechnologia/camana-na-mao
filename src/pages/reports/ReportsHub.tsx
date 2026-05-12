import { useNavigate } from 'react-router-dom';
import { Bus, MapPin, FileText, Star, PlusCircle, CalendarCheck, TrendingUp } from 'lucide-react';
import PageHeader from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { useUserRole } from '@/hooks/useUserRole';

export default function ReportsHub() {
  const navigate = useNavigate();
  const { canReferToCouncilMember } = useUserRole();

  return (
    <>
      <PageHeader title="Relatos" backTo="/" />

      <div className="min-h-screen bg-background pt-[60px] pb-24">
        <div className="max-w-3xl mx-auto px-6 py-6 space-y-4 animate-fade-in">
          <Card className="p-5 bg-gradient-to-br from-blue-50 to-purple-50 border-blue-100">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/60 border border-white flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold">Acompanhe seus relatos</h2>
                <p className="text-sm text-muted-foreground">
                  Veja seus registros (transporte, urbano e avaliações){' '}
                  {canReferToCouncilMember ? 'e encaminhe para vereador quando necessário.' : '.'}
                </p>
              </div>
            </div>
          </Card>

          {/* Novo relato urbano: abre hub com opção IA, formulário manual (com foto) e histórico */}
          <Card
            className="cursor-pointer hover:shadow-md transition-all active:scale-[0.99] border-primary/20 bg-primary/5"
            onClick={() => navigate('/relato-urbano')}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                  <PlusCircle className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Novo relato urbano</h3>
                  <p className="text-sm text-muted-foreground">Conversar com a IA ou preencher formulário manual (com foto)</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Card
              className="cursor-pointer hover:shadow-md transition-all active:scale-[0.99]"
              onClick={() => navigate('/transporte/historico')}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center">
                    <Bus className="w-6 h-6 text-red-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">Transporte</h3>
                    <p className="text-sm text-muted-foreground">Minhas contribuições de transporte</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer hover:shadow-md transition-all active:scale-[0.99]"
              onClick={() => navigate('/transporte/padroes')}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-amber-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">Padrões de transporte</h3>
                    <p className="text-sm text-muted-foreground">Veja problemas recorrentes detectados</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer hover:shadow-md transition-all active:scale-[0.99]"
              onClick={() => navigate('/relato-urbano/historico')}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-purple-50 flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">Urbano</h3>
                    <p className="text-sm text-muted-foreground">Histórico de contribuições urbanas</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer hover:shadow-md transition-all active:scale-[0.99]"
              onClick={() => navigate('/avaliacoes/historico')}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center">
                    <Star className="w-6 h-6 text-amber-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">Avaliações</h3>
                    <p className="text-sm text-muted-foreground">Minhas avaliações de serviços</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer hover:shadow-md transition-all active:scale-[0.99]"
              onClick={() => navigate('/audiencias/minhas-inscricoes')}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center">
                    <CalendarCheck className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">Audiências</h3>
                    <p className="text-sm text-muted-foreground">Minhas inscrições em audiências públicas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}

