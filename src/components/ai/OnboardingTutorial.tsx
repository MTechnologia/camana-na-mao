import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, X, MessageCircle, Mic, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OnboardingTutorialProps {
  onComplete: () => void;
  onSkip: () => void;
}

const OnboardingTutorial = ({ onComplete, onSkip }: OnboardingTutorialProps) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      icon: MessageCircle,
      title: "Bem-vindo ao CMSP Connect!",
      description: "Seu assistente inteligente para acessar informações sobre a Câmara Municipal de São Paulo.",
      color: "from-blue-500 to-cyan-500",
    },
    {
      icon: Mic,
      title: "Converse por voz ou texto",
      description: "Escolha como prefere interagir: digitando ou falando. Estamos aqui para ajudar!",
      color: "from-purple-500 to-pink-500",
    },
    {
      icon: FileText,
      title: "Informações atualizadas",
      description: "Acesse projetos de lei, agendas, documentos e muito mais, tudo em tempo real.",
      color: "from-green-500 to-emerald-500",
    },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const currentStepData = steps[currentStep];
  const IconComponent = currentStepData.icon;

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-primary/20 to-secondary/20 backdrop-blur-sm flex items-center justify-center p-6">
      <motion.div
        className="w-full max-w-md bg-card rounded-2xl shadow-2xl overflow-hidden"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        {/* Skip Button */}
        <div className="flex justify-end p-4">
          <button
            onClick={onSkip}
            className="text-muted-foreground hover:text-foreground transition-colors"
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
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <div className={`w-24 h-24 rounded-full bg-gradient-to-br ${currentStepData.color} flex items-center justify-center mx-auto mb-6`}>
              <IconComponent className="w-12 h-12 text-white" />
            </div>

            <h2 className="text-2xl font-bold text-foreground text-center mb-4">
              {currentStepData.title}
            </h2>

            <p className="text-muted-foreground text-center mb-8">
              {currentStepData.description}
            </p>

            {/* Progress Indicators */}
            <div className="flex gap-2 justify-center mb-6">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 rounded-full transition-all ${
                    index === currentStep
                      ? "w-8 bg-primary"
                      : index < currentStep
                      ? "w-2 bg-primary/50"
                      : "w-2 bg-border"
                  }`}
                />
              ))}
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              {currentStep > 0 && (
                <Button
                  onClick={() => setCurrentStep(currentStep - 1)}
                  variant="outline"
                  className="flex-1"
                >
                  Voltar
                </Button>
              )}
              <Button
                onClick={handleNext}
                className="flex-1 bg-primary hover:bg-primary/90"
              >
                {currentStep === steps.length - 1 ? "Começar" : "Próximo"}
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default OnboardingTutorial;
