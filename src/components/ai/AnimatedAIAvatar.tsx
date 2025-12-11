import { motion } from "framer-motion";

interface AnimatedAIAvatarProps {
  size?: "sm" | "md" | "lg";
}

const AnimatedAIAvatar = ({ size = "md" }: AnimatedAIAvatarProps) => {
  const sizeClasses = {
    sm: "w-12 h-12",
    md: "w-14 h-14 sm:w-16 sm:h-16",
    lg: "w-20 h-20",
  };

  const iconSizes = {
    sm: "w-4 h-4",
    md: "w-5 h-5 sm:w-6 sm:h-6",
    lg: "w-7 h-7",
  };

  return (
    <div className={`relative ${sizeClasses[size]} flex items-center justify-center`}>
      {/* Outer rotating gradient ring */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: "conic-gradient(from 0deg, hsl(var(--primary)), hsl(var(--secondary)), hsl(var(--accent)), hsl(var(--primary)))",
          padding: "2px",
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
      >
        <div className="w-full h-full rounded-full bg-background" />
      </motion.div>

      {/* Pulsing glow */}
      <motion.div
        className="absolute inset-2 rounded-full bg-gradient-to-br from-primary/20 via-secondary/15 to-accent/20 blur-sm"
        animate={{ 
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Inner solid center */}
      <div className="absolute inset-1 rounded-full bg-background border border-border/30 flex items-center justify-center">
        {/* Sparkle icon */}
        <motion.svg
          viewBox="0 0 24 24"
          className={`${iconSizes[size]} text-primary`}
          fill="currentColor"
          animate={{ 
            scale: [0.95, 1.05, 0.95],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <path d="M12 2L13.09 8.26L19 7L14.74 12L19 17L13.09 15.74L12 22L10.91 15.74L5 17L9.26 12L5 7L10.91 8.26L12 2Z" />
        </motion.svg>
      </div>
    </div>
  );
};

export default AnimatedAIAvatar;
