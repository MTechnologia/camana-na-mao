import { motion } from "framer-motion";
import iaIcone from "@/assets/ia-icone.png";

interface AnimatedAIAvatarProps {
  size?: "sm" | "md" | "lg";
}

const AnimatedAIAvatar = ({ size = "md" }: AnimatedAIAvatarProps) => {
  const sizeClasses = {
    sm: "w-12 h-12",
    md: "w-16 h-16 sm:w-20 sm:h-20",
    lg: "w-24 h-24",
  };

  const iconSizes = {
    sm: "w-8 h-8",
    md: "w-12 h-12 sm:w-16 sm:h-16",
    lg: "w-20 h-20",
  };

  return (
    <div className={`relative ${sizeClasses[size]}`}>
      {/* Ondas sonoras animadas */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute inset-0 rounded-full border-2 border-primary/60"
          initial={{ scale: 1, opacity: 0.5 }}
          animate={{
            scale: [1, 1.6],
            opacity: [0.5, 0],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            delay: i * 0.8,
            ease: "easeOut",
          }}
        />
      ))}

      {/* Glow de fundo */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary via-secondary to-accent opacity-20 blur-xl" />
      
      {/* Container principal com ícone */}
      <motion.div
        className="relative w-full h-full rounded-full bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 p-1 shadow-lg"
        animate={{ scale: [1, 1.02, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="w-full h-full rounded-full bg-background flex items-center justify-center overflow-hidden">
          <img 
            src={iaIcone} 
            alt="Câmara SP" 
            className={`${iconSizes[size]} object-contain`} 
          />
        </div>
      </motion.div>
    </div>
  );
};

export default AnimatedAIAvatar;
