import { useNavigate } from 'react-router-dom';
import { Bus, TrendingUp, FileText, MessageSquare, Radio } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import PageHeader from '@/components/ui/page-header';

export default function TransportReportPage() {
  const navigate = useNavigate();

  const options = [
    {
      id: 'ai-chat',
      title: 'Conversar com IA',
      description: 'Relate problemas de transporte com ajuda da IA',
      icon: MessageSquare,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50',
      path: '/?journey=transport',
    },
    {
      id: 'live-buses',
      title: 'Ônibus ao vivo',
      description: 'Mapa com posição dos veículos (Olho Vivo / SPTrans)',
      icon: Radio,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      path: '/transporte/ao-vivo',
    },
    {
      id: 'new-report',
      title: 'Relatar Problema',
      description: 'Registre um problema que você enfrentou',
      icon: Bus,
      color: 'text-red-500',
      bgColor: 'bg-red-50',
      path: '/transporte/novo',
    },
    {
      id: 'patterns',
      title: 'Ver Padrões',
      description: 'Problemas recorrentes detectados',
      icon: TrendingUp,
      color: 'text-amber-500',
      bgColor: 'bg-amber-50',
      path: '/transporte/padroes',
    },
    {
      id: 'my-reports',
      title: 'Meus Relatos',
      description: 'Acompanhe seus relatos enviados',
      icon: FileText,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
      path: '/transporte/historico',
    },
  ];

  return (
    <>
      <PageHeader title="Diagnóstico de Transporte" backTo="/" />
      <div className="min-h-screen bg-gray-50 pt-[60px] pb-6">
        <div className="relative h-52 lg:h-64 bg-gradient-to-br from-blue-600 via-purple-600 to-cyan-500 overflow-hidden">
          {/* Background decorations */}
          <div className="absolute top-4 right-4 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute bottom-4 left-4 w-24 h-24 bg-cyan-400/20 rounded-full blur-xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-purple-400/10 rounded-full blur-3xl" />
          
          {/* Content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white pb-8">
            {/* Icon with glassmorphism */}
            <div className="relative mb-4">
              <div className="absolute inset-0 bg-white/30 rounded-2xl blur-xl animate-pulse" />
              <div className="relative w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm 
                              border border-white/30 flex items-center justify-center
                              shadow-lg">
                <Bus className="w-10 h-10 text-white" />
              </div>
            </div>
            
            {/* Title */}
            <h1 className="text-2xl font-bold tracking-tight drop-shadow-lg">
              Diagnóstico de Transporte
            </h1>
            <p className="text-sm text-white/80 font-light mt-1">
              Colabore para melhorar o transporte público
            </p>
          </div>
        </div>

        <div className="max-w-3xl lg:max-w-4xl mx-auto px-6 pt-2 -mt-8 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {options.map((option, index) => {
              const Icon = option.icon;
              return (
                <Card
                  key={option.id}
                  className="cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-border animate-fade-in opacity-0"
                  style={{ 
                    animationDelay: `${index * 100}ms`,
                    animationFillMode: 'forwards'
                  }}
                  onClick={() => navigate(option.path)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-xl ${option.bgColor} flex items-center justify-center`}>
                        <Icon className={`w-7 h-7 ${option.color}`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{option.title}</h3>
                        <p className="text-sm text-muted-foreground">{option.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
