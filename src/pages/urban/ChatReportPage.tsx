import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/ui/page-header";
import FloatingNavbar from "@/components/FloatingNavbar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Send, Loader2, MapPin, Camera, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  role: "assistant" | "user";
  content: string;
  options?: string[];
}

interface ReportData {
  category?: string;
  subcategory?: string;
  description?: string;
  severity?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
}

export default function ChatReportPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Olá! Vou te ajudar a relatar um problema urbano. Para começar, qual tipo de problema você gostaria de reportar?",
      options: [
        "Iluminação pública",
        "Calçada danificada",
        "Buraco na rua",
        "Lixo acumulado",
        "Poda de árvore",
        "Outro problema"
      ]
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<ReportData>({});
  const [isComplete, setIsComplete] = useState(false);
  const [reportId, setReportId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messageCount = useRef(0);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (text?: string) => {
    const messageText = text || input;
    if (!messageText.trim() || loading) return;

    const userMessage: Message = { role: "user", content: messageText };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    messageCount.current += 1;

    try {
      const { data, error } = await supabase.functions.invoke('urban-report-chat', {
        body: {
          messages: [...messages, userMessage],
          reportData
        }
      });

      if (error) {
        if (error.message?.includes('429')) {
          toast.error("Limite de requisições atingido. Aguarde um momento.");
          return;
        }
        if (error.message?.includes('402')) {
          toast.error("Créditos insuficientes. Entre em contato com o suporte.");
          return;
        }
        throw error;
      }

      const assistantMessage: Message = {
        role: "assistant",
        content: data.message,
        options: data.options
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Atualiza dados do relato
      if (data.reportData) {
        setReportData(prev => ({ ...prev, ...data.reportData }));
      }

      // Verifica se está completo
      if (data.complete && messageCount.current >= 4) {
        await submitReport({ ...reportData, ...data.reportData });
      }
    } catch (error) {
      console.error("Erro ao processar mensagem:", error);
      toast.error("Erro ao processar sua mensagem");
    } finally {
      setLoading(false);
    }
  };

  const submitReport = async (data: ReportData) => {
    if (!user) {
      toast.error("Você precisa estar autenticado");
      return;
    }

    try {
      const { data: insertData, error } = await supabase
        .from("urban_reports")
        .insert({
          user_id: user.id,
          category: data.category || "other",
          subcategory: data.subcategory,
          description: data.description,
          severity: data.severity || "medium",
          location_address: data.location,
          latitude: data.latitude,
          longitude: data.longitude,
          status: "pending"
        })
        .select()
        .single();

      if (error) throw error;

      setReportId(insertData.id);
      setIsComplete(true);
      toast.success("Relato enviado com sucesso!");
    } catch (error) {
      console.error("Erro ao enviar relato:", error);
      toast.error("Erro ao enviar relato");
    }
  };

  const requestLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocalização não suportada");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setReportData(prev => ({
          ...prev,
          latitude,
          longitude,
          location: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
        }));
        handleSend(`Minha localização atual: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        toast.success("Localização capturada!");
      },
      () => {
        toast.error("Não foi possível obter sua localização");
      }
    );
  };

  if (isComplete && reportId) {
    return (
      <div className="min-h-screen bg-background pb-24 pt-[60px]">
        <PageHeader title="Relato Enviado" />
        
        <div className="p-4 flex items-center justify-center min-h-[calc(100vh-200px)]">
          <Card className="p-6 max-w-md w-full text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", duration: 0.5 }}
            >
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            </motion.div>
            
            <h2 className="text-xl font-bold text-foreground mb-2">
              Relato Enviado!
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Seu relato foi registrado e será analisado pela equipe responsável.
            </p>
            
            <div className="space-y-2">
              <Button
                onClick={() => navigate("/relato-urbano/historico")}
                className="w-full"
              >
                Ver Meus Relatos
              </Button>
              <Button
                onClick={() => navigate("/relato-urbano")}
                variant="outline"
                className="w-full"
              >
                Fazer Outro Relato
              </Button>
            </div>
          </Card>
        </div>

        <FloatingNavbar />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 pt-[60px]">
      <PageHeader title="Relato com IA" />
      
      <div className="flex flex-col h-[calc(100vh-140px)]">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <AnimatePresence>
            {messages.map((msg, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl p-4 ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-card text-card-foreground border"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  
                  {msg.options && msg.options.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {msg.options.map((option, i) => (
                        <Button
                          key={i}
                          variant="outline"
                          size="sm"
                          className="w-full justify-start text-left"
                          onClick={() => handleSend(option)}
                          disabled={loading}
                        >
                          {option}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {loading && (
            <div className="flex justify-start">
              <div className="bg-card border rounded-2xl p-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
          
          <div ref={scrollRef} />
        </div>

        {/* Input Area */}
        <div className="border-t bg-background p-4">
          <div className="flex gap-2 mb-2">
            <Button
              size="sm"
              variant="outline"
              onClick={requestLocation}
              disabled={loading}
              className="flex-1"
            >
              <MapPin className="w-4 h-4 mr-2" />
              Localização
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled
              className="flex-1"
            >
              <Camera className="w-4 h-4 mr-2" />
              Foto
            </Button>
          </div>
          
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Digite sua mensagem..."
              className="resize-none"
              rows={2}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={loading}
            />
            <Button
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              size="icon"
              className="h-auto"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      <FloatingNavbar />
    </div>
  );
}
