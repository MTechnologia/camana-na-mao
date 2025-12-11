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

  return (
    <div className={`relative ${sizeClasses[size]} flex items-center justify-center`}>
      {/* Outer rotating ring */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: "conic-gradient(from 0deg, hsl(var(--primary)), hsl(var(--secondary)), hsl(var(--accent)), hsl(var(--primary)))",
          padding: "2px",
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
      >
        <div className="w-full h-full rounded-full bg-background" />
      </motion.div>

      {/* Pulsing glow */}
      <motion.div
        className="absolute inset-1 rounded-full bg-gradient-to-br from-primary/30 via-secondary/20 to-accent/30 blur-md"
        animate={{ 
          opacity: [0.4, 0.7, 0.4],
          scale: [0.95, 1.05, 0.95]
        }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Inner container */}
      <div className="absolute inset-1 rounded-full bg-gradient-to-br from-background via-background to-muted/50 flex items-center justify-center overflow-hidden border border-primary/20">
        {/* AI Brain/Circuit icon */}
        <svg 
          viewBox="0 0 24 24" 
          className="w-1/2 h-1/2 text-primary"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Central node */}
          <motion.circle 
            cx="12" 
            cy="12" 
            r="3"
            fill="currentColor"
            animate={{ 
              opacity: [0.8, 1, 0.8],
              scale: [0.9, 1.1, 0.9]
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
          
          {/* Orbiting dots */}
          <motion.circle 
            cx="12" 
            cy="5" 
            r="1.5"
            fill="currentColor"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
          />
          <motion.circle 
            cx="18" 
            cy="9" 
            r="1.5"
            fill="currentColor"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
          />
          <motion.circle 
            cx="18" 
            cy="15" 
            r="1.5"
            fill="currentColor"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.6 }}
          />
          <motion.circle 
            cx="12" 
            cy="19" 
            r="1.5"
            fill="currentColor"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.9 }}
          />
          <motion.circle 
            cx="6" 
            cy="15" 
            r="1.5"
            fill="currentColor"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 1.2 }}
          />
          <motion.circle 
            cx="6" 
            cy="9" 
            r="1.5"
            fill="currentColor"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 1.5 }}
          />
          
          {/* Connection lines */}
          <motion.line x1="12" y1="9" x2="12" y2="5" strokeOpacity="0.6" />
          <motion.line x1="14.5" y1="10.5" x2="18" y2="9" strokeOpacity="0.6" />
          <motion.line x1="14.5" y1="13.5" x2="18" y2="15" strokeOpacity="0.6" />
          <motion.line x1="12" y1="15" x2="12" y2="19" strokeOpacity="0.6" />
          <motion.line x1="9.5" y1="13.5" x2="6" y2="15" strokeOpacity="0.6" />
          <motion.line x1="9.5" y1="10.5" x2="6" y2="9" strokeOpacity="0.6" />
        </svg>
      </div>

      {/* Scanning line effect */}
      <motion.div
        className="absolute inset-1 rounded-full overflow-hidden pointer-events-none"
        style={{ opacity: 0.3 }}
      >
        <motion.div
          className="w-full h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent"
          animate={{ y: [0, 56, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>
    </div>
  );
};

export default AnimatedAIAvatar;
