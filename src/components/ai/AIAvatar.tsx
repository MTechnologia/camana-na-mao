import { motion } from "framer-motion";
import iaIcone from "@/assets/ia-icone.png";

const AIAvatar = () => {
  return (
    <motion.div
      className="relative w-24 h-24 mx-auto"
      animate={{
        scale: [1, 1.02, 1],
      }}
      transition={{
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      {/* Outer glow */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary via-secondary to-accent opacity-30 blur-xl" />
      
      {/* Main container */}
      <div className="relative w-full h-full rounded-full bg-gradient-to-br from-primary/20 via-secondary/20 to-accent/20 p-1 shadow-2xl">
        <div className="w-full h-full rounded-full bg-background flex items-center justify-center overflow-hidden">
          <img 
            src={iaIcone} 
            alt="Assistente IA" 
            className="w-20 h-20 object-contain"
          />
        </div>
      </div>
    </motion.div>
  );
};

export default AIAvatar;
