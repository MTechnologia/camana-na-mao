import { MessageCircle, Mic } from "lucide-react";
import { useNavigate } from "react-router-dom";
import FloatingNavbar from "@/components/FloatingNavbar";

const IA = () => {
  const navigate = useNavigate();

  const suggestions = [
    "Como protocolar um documento?",
    "Consultar andamento de processo",
    "Agenda de sessões",
    "Projetos em votação",
  ];

  const recentChats = [
    { id: 1, title: "Protocolo de documento", time: "Há 2 horas" },
    { id: 2, title: "Consulta de processo", time: "Ontem" },
    { id: 3, title: "Agendamento de atendimento", time: "2 dias atrás" },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header with gradient avatar */}
      <div className="relative h-64 bg-gradient-to-br from-ai-start to-ai-end flex items-center justify-center">
        <div className="w-32 h-32 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-4 border-white/40">
          <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center">
            <svg className="w-12 h-12 text-primary" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 -mt-8 relative z-10">
        {/* Intro Card */}
        <div className="bg-card rounded-2xl p-6 mb-6 shadow-lg border border-border">
          <h2 className="text-xl font-bold text-foreground mb-2">
            Todo um um lugar especial no mundo
          </h2>
          <p className="text-muted-foreground text-sm">
            Estou aqui para ajudar você com informações sobre a Câmara Municipal de São Paulo
          </p>
        </div>

        {/* Suggestions */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-foreground mb-3">Sugestões</h3>
          <div className="grid grid-cols-2 gap-3">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => navigate("/conversa")}
                className="bg-secondary rounded-xl p-4 text-left text-sm text-foreground hover:bg-secondary/80 transition-colors border border-border"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        {/* Recent Chats */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-foreground mb-3">Conversas recentes</h3>
          <div className="space-y-2">
            {recentChats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => navigate("/conversa")}
                className="w-full bg-card rounded-xl p-4 text-left hover:bg-secondary transition-colors border border-border"
              >
                <p className="text-foreground font-medium mb-1">{chat.title}</p>
                <p className="text-xs text-muted-foreground">{chat.time}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Input Area */}
        <div className="fixed bottom-24 left-0 right-0 px-6">
          <div className="bg-card rounded-full border border-border shadow-lg p-2 flex items-center gap-2 max-w-md mx-auto">
            <input
              type="text"
              placeholder="O que você quer perguntar?"
              className="flex-1 bg-transparent border-none outline-none px-4 text-foreground placeholder:text-muted-foreground"
              onFocus={() => navigate("/conversa")}
            />
            <button 
              onClick={() => navigate("/voz")}
              className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-colors"
            >
              <Mic size={20} />
            </button>
            <button 
              onClick={() => navigate("/conversa")}
              className="w-10 h-10 rounded-full bg-foreground text-background flex items-center justify-center hover:bg-foreground/90 transition-colors"
            >
              <MessageCircle size={20} />
            </button>
          </div>
        </div>
      </div>

      <FloatingNavbar />
    </div>
  );
};

export default IA;
