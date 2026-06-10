import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  ChevronLeft,
  X,
  MessageSquare,
  Bus,
  Megaphone,
  Navigation,
  Bot,
  Star,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import iaIcone from "@/assets/ia-icone.png";

interface AppOnboardingTutorialProps {
  onComplete: () => void;
  onSkip: () => void;
}

const steps = [
  {
    icon: Sparkles,
    title: "Bem-vindo ao Câmara na Mão!",
    description:
      "Seu portal de participação cidadã com a Câmara Municipal de São Paulo. Vamos conhecer as principais funcionalidades?",
    color: "from-primary to-primary/70",
    useImage: true,
  },
  {
    icon: MessageSquare,
    title: "Relatos Urbanos",
    description:
      "Reporte problemas na cidade como buracos, iluminação defeituosa, sinalização e muito mais. Sua voz importa!",
    color: "from-cyan-500 to-blue-500",
    useImage: false,
  },
  {
    icon: Bus,
    title: "Transporte Público",
    description:
      "Avalie e relate problemas nas linhas de ônibus. Ajude a melhorar o transporte na cidade.",
    color: "from-green-500 to-emerald-500",
    useImage: false,
  },
  {
    icon: Megaphone,
    title: "Audiências Públicas",
    description:
      "Participe de debates e acompanhe temas importantes para a cidade. Sua participação fortalece a democracia!",
    color: "from-pink-500 to-rose-500",
    useImage: false,
  },
  {
    icon: Navigation,
    title: "Serviços Próximos",
    description:
      "Encontre UBSs, escolas, hospitais e outros serviços públicos perto de você com facilidade.",
    color: "from-blue-500 to-cyan-500",
    useImage: false,
  },
  {
    icon: Bot,
    title: "Assistente IA",
    description:
      "Tire dúvidas sobre legislação, projetos de lei, vereadores e muito mais com nossa IA inteligente.",
    color: "from-purple-500 to-violet-500",
    useImage: false,
  },
  {
    icon: Star,
    title: "Você está pronto!",
    description:
      "Explore o app e participe ativamente da construção de uma cidade melhor. Sua voz faz a diferença!",
    color: "from-amber-500 to-orange-500",
    useImage: false,
  },
];

const AppOnboardingTutorial = ({ onComplete, onSkip }: AppOnboardingTutorialProps) => {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const currentStepData = steps[currentStep];
  const IconComponent = currentStepData.icon;

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
      <motion.div
        className="w-full max-w-md bg-card rounded-3xl shadow-2xl overflow-hidden border border-border"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Skip Button */}
        <div className="flex justify-end p-4 pb-0">
          <button
            onClick={onSkip}
            className="text-muted-foreground hover:text-foreground transition-colors p-2 rounded-full hover:bg-accent"
            aria-label="Pular tutorial"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            className="px-8 pb-8"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
          >
            {/* Icon/Image */}
            <div className="flex justify-center mb-6">
              {currentStepData.useImage ? (
                <motion.div
                  className="w-28 h-28 rounded-full bg-gradient-to-br from-primary/20 via-secondary/20 to-accent/20 p-1 shadow-xl"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <div className="w-full h-full rounded-full bg-background flex items-center justify-center overflow-hidden">
                    <img src={iaIcone} alt="Câmara na Mão" className="w-24 h-24 object-contain" />
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  className={`w-24 h-24 rounded-full bg-gradient-to-br ${currentStepData.color} flex items-center justify-center shadow-xl`}
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <IconComponent className="w-12 h-12 text-white" />
                </motion.div>
              )}
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold text-foreground text-center mb-4">
              {currentStepData.title}
            </h2>

            {/* Description */}
            <p className="text-muted-foreground text-center mb-8 leading-relaxed">
              {currentStepData.description}
            </p>

            {/* Progress Indicators */}
            <div className="flex gap-2 justify-center mb-6">
              {steps.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentStep(index)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    index === currentStep
                      ? "w-8 bg-primary"
                      : index < currentStep
                        ? "w-2 bg-primary/50"
                        : "w-2 bg-border"
                  }`}
                  aria-label={`Ir para passo ${index + 1}`}
                />
              ))}
            </div>

            {/* Step Counter */}
            <p className="text-xs text-muted-foreground text-center mb-4">
              {currentStep + 1} de {steps.length}
            </p>

            {/* Buttons */}
            <div className="flex gap-3">
              {currentStep > 0 && (
                <Button onClick={handlePrevious} variant="outline" className="flex-1">
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Voltar
                </Button>
              )}
              <Button
                onClick={handleNext}
                className={`flex-1 ${currentStep === 0 ? "w-full" : ""}`}
              >
                {currentStep === steps.length - 1 ? "Começar!" : "Próximo"}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default AppOnboardingTutorial;
