import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

const IntentDetectionIndicator = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 w-fit"
    >
      <motion.div
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.7, 1, 0.7]
        }}
        transition={{ 
          duration: 1.5, 
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        <Sparkles className="w-3.5 h-3.5 text-primary" />
      </motion.div>
      <span className="text-xs text-primary font-medium">
        Analisando sua intenção...
      </span>
    </motion.div>
  );
};

export default IntentDetectionIndicator;
