import { useState, useEffect } from "react";
import { ArrowLeft, Mic, X, Volume2, Loader2, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useWebSpeechChat } from "@/hooks/useWebSpeechChat";
import { useAuth } from "@/contexts/AuthContext";
import { getWelcomeMessage } from "@/data/mockVoiceResponses";

const Voz = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentText, setCurrentText] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [hasStarted, setHasStarted] = useState(false);
  
  const { 
    isRecording, 
    isProcessing, 
    isPlaying,
    transcript,
    isSupported,
    startRecording, 
    stopRecording, 
    playAudio,
    getAIResponse,
  } = useWebSpeechChat();

  // Update current text with real-time transcript
  useEffect(() => {
    if (transcript) {
      setCurrentText(transcript);
    }
  }, [transcript]);

  // Play welcome message on first interaction
  useEffect(() => {
    if (hasStarted && !aiResponse && isSupported) {
      const welcome = getWelcomeMessage();
      setAiResponse(welcome);
      playAudio(welcome);
    }
  }, [hasStarted]);

  const handleMicClick = async () => {
    if (!hasStarted) {
      setHasStarted(true);
    }
    
    if (isRecording) {
      try {
        const transcribedText = await stopRecording();
        setCurrentText(transcribedText);
        
        if (transcribedText) {
          const response = await getAIResponse(transcribedText);
          setAiResponse(response);
          playAudio(response);
        }
      } catch (error) {
        console.error('Erro ao parar gravação:', error);
      }
    } else {
      setCurrentText("");
      setAiResponse("");
      startRecording();
    }
  };

  const getStatusText = () => {
    if (!isSupported) return "Navegador não suportado";
    if (isRecording) return "Estou te ouvindo...";
    if (isProcessing) return "Processando...";
    if (isPlaying) return "Respondendo...";
    if (!hasStarted) return "Toque no microfone para começar";
    return "No que posso te ajudar?";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-voice-start to-voice-end flex flex-col">
      {/* Header */}
      <header className="px-4 py-6 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="text-white">
          <ArrowLeft size={24} />
        </button>
        <button onClick={() => navigate(-1)} className="text-white">
          <X size={24} />
        </button>
      </header>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {/* Browser support warning */}
        {!isSupported && (
          <div className="mb-6 bg-destructive/20 backdrop-blur-sm rounded-lg p-4 flex items-center gap-3 max-w-md">
            <AlertCircle className="text-white" size={24} />
            <p className="text-white text-sm">
              Seu navegador não suporta reconhecimento de voz. Tente usar Chrome ou Edge.
            </p>
          </div>
        )}
        
        {/* Avatar with animation */}
        <div className="mb-8 relative">
          <div className="w-32 h-32 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-4 border-white/40">
            <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center">
              {isProcessing || isPlaying ? (
                <Loader2 size={48} className="text-accent animate-spin" />
              ) : (
                <Volume2 size={48} className="text-accent" />
              )}
            </div>
          </div>

          {/* Sound wave animation */}
          {isRecording && (
            <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-64 h-16 flex items-center justify-center gap-1">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-white/60 rounded-full animate-pulse"
                  style={{
                    height: `${Math.random() * 40 + 20}px`,
                    animationDelay: `${i * 0.1}s`,
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Text */}
        <div className="text-center mb-12 mt-12 max-w-md">
          <h1 className="text-white text-2xl font-bold mb-2">
            Olá, {user?.user_metadata?.full_name?.split(' ')[0] || 'Cidadão'}
          </h1>
          <p className="text-white/80 mb-4">
            {getStatusText()}
          </p>
          
          {currentText && (
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 mb-4">
              <p className="text-white text-sm">
                <strong>Você disse:</strong> {currentText}
              </p>
            </div>
          )}
          
          {aiResponse && !isPlaying && (
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <p className="text-white text-sm">
                <strong>Resposta:</strong> {aiResponse}
              </p>
            </div>
          )}
        </div>

        {/* Mic Button */}
        <button
          onClick={handleMicClick}
          disabled={isProcessing || isPlaying || !isSupported}
          className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
            isRecording
              ? "bg-red-500 scale-110 animate-pulse"
              : "bg-white/20 hover:bg-white/30"
          }`}
        >
          <Mic size={32} className="text-white" />
        </button>

        {/* Hint */}
        <p className="text-white/60 text-sm mt-8 text-center px-8">
          {isRecording 
            ? "Toque novamente para parar" 
            : isSupported 
              ? "Toque no microfone e comece a falar"
              : "Use Chrome ou Edge para habilitar voz"}
        </p>
        
        {/* Demo badge */}
        <div className="mt-6 px-3 py-1 bg-white/10 rounded-full">
          <span className="text-white/60 text-xs">Demo • Web Speech API</span>
        </div>
      </div>
    </div>
  );
};

export default Voz;
