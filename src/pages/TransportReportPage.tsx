import { useNavigate } from 'react-router-dom';
import { Bus, TrendingUp, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import PageHeader from '@/components/ui/page-header';
import FloatingNavbar from '@/components/FloatingNavbar';
import busSptrans from '@/assets/bus-sptrans.png';
import { useAIConversations } from "@/hooks/useAIConversations";
import { useAIJourney } from "@/contexts/AIJourneyContext";
import { getJourneyById } from "@/config/aiJourneys";
import ConversationHub from "@/components/ai/ConversationHub";

export default function TransportReportPage() {
  const navigate = useNavigate();
  const { setJourney } = useAIJourney();
  const {
    conversations,
    isLoading,
    createConversation,
    resumeConversation,
    archiveConversation,
    deleteConversation,
  } = useAIConversations();

  const handleSelectConversation = async (id: string, journeyId: string) => {
    const conv = await resumeConversation(id);
    if (conv) {
      const journey = getJourneyById(journeyId);
      if (journey) {
        setJourney(journey, id);
        navigate("/ia");
      }
    }
  };

  const handleNewConversation = async (journeyId: string) => {
    const conversationId = await createConversation(journeyId);
    if (conversationId) {
      const journey = getJourneyById(journeyId);
      if (journey) {
        setJourney(journey, conversationId);
        navigate("/ia");
      }
    }
  };

  const options = [
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
      path: '/transporte/meus-relatos',
    },
  ];

  return (
    <>
      <PageHeader title="Diagnóstico de Transporte" backTo="/home" />
      <div className="min-h-screen bg-gray-50 pt-[60px] pb-24">
        <div className="relative h-48 bg-gradient-to-br from-green-500 to-emerald-600">
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
            <img src={busSptrans} alt="SP Trans" className="w-20 h-20 mb-2" />
            <h1 className="text-2xl font-bold">Diagnóstico de Transporte</h1>
            <p className="text-sm text-white/90">Colabore para melhorar o transporte público</p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-6 -mt-8">
          {/* AI Conversations Hub */}
          <div className="mb-6">
            <ConversationHub
              conversations={conversations}
              filterJourney="transport"
              showAllJourneys={false}
              onSelectConversation={handleSelectConversation}
              onNewConversation={handleNewConversation}
              onArchive={archiveConversation}
              onDelete={deleteConversation}
              isLoading={isLoading}
            />
          </div>

          {/* Other Options */}
          <div className="space-y-3 animate-fade-in">
            {options.map((option) => {
              const Icon = option.icon;
              return (
                <Card
                  key={option.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow border-border"
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
      <FloatingNavbar />
    </>
  );
}
