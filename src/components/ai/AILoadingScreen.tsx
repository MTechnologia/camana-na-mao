import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import AIAvatar from "./AIAvatar";

const tips = [
  "Você sabia que a Câmara votou 127 projetos este mês?",
  "A transparência é um dos pilares da nossa democracia!",
  "Você pode acompanhar sessões ao vivo pela plataforma.",
  "Mais de 50 mil documentos estão disponíveis para consulta.",
  "Sua participação fortalece nossa cidade!",
];

const AILoadingScreen = () => {
  const [currentTip, setCurrentTip] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % tips.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/10 flex flex-col items-center justify-center p-6">
      <AIAvatar />
      
      <motion.div
        className="mt-8 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-xl font-bold text-foreground mb-4">
          Carregando sua experiência...
        </h2>
        
        <motion.p
          key={currentTip}
          className="text-sm text-muted-foreground max-w-md"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
        >
          💡 {tips[currentTip]}
        </motion.p>
      </motion.div>

      <div className="mt-8 w-64 h-1 bg-secondary/20 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-primary"
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 2, ease: "easeInOut" }}
        />
      </div>
    </div>
  );
};

export default AILoadingScreen;
