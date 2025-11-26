import { useState } from "react";
import { ArrowLeft, Mic, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Voz = () => {
  const navigate = useNavigate();
  const [isRecording, setIsRecording] = useState(false);

  const toggleRecording = () => {
    setIsRecording(!isRecording);
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
        {/* Avatar with animation */}
        <div className="mb-8 relative">
          <div className="w-32 h-32 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-4 border-white/40">
            <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center">
              <svg className="w-12 h-12 text-accent" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
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
        <div className="text-center mb-12 mt-12">
          <h1 className="text-white text-2xl font-bold mb-2">Olá, Luana</h1>
          <p className="text-white/80">
            {isRecording ? "Estou te ouvindo..." : "No que posso te ajudar?"}
          </p>
        </div>

        {/* Mic Button */}
        <button
          onClick={toggleRecording}
          className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${
            isRecording
              ? "bg-white/30 scale-110"
              : "bg-white/20 hover:bg-white/30"
          }`}
        >
          <Mic size={32} className="text-white" />
        </button>

        {/* Hint */}
        <p className="text-white/60 text-sm mt-8 text-center px-8">
          Toque no microfone e comece a falar
        </p>
      </div>
    </div>
  );
};

export default Voz;
